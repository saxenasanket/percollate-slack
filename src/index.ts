import "dotenv/config";
import { fetchIssuesSince, fetchRecentOpenIssues } from "./github";
import { triageIssues } from "./triage";
import { loadState, saveState, getNewAndUpdatedIssues, updateIssueTimestamp } from "./state";
import { buildNotificationBlocks, sendNotification } from "./slack";
import { TriageResult, NotificationStats } from "./types";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_SECONDS || "300") * 1000;

if (!GITHUB_OWNER || !GITHUB_REPO) {
  console.error("Error: GITHUB_OWNER and GITHUB_REPO must be set");
  process.exit(1);
}

// Main polling function - runs every 5 seconds (or configured interval)
// Orchestrates the entire flow: fetch → triage → filter → slack → save
async function poll(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Starting poll...`);

  try {
    // STEP 1: Load the persisted state from disk
    // State contains: lastCheckedAt (to fetch only new issues), lastMessageTs (for Slack updates),
    // lastSurfacedIssues (to detect issue set changes), and per-issue update timestamps
    let state = loadState();
    console.log(`Last checked at: ${state.lastCheckedAt}`);

    // STEP 2: Fetch all issues updated since last poll
    // Uses GitHub API query: state=open, sort=updated, since=lastCheckedAt
    // This ensures we only process new/modified issues (not stale ones)
    console.log(`GitHub API query: since=${state.lastCheckedAt}`);
    const allIssues = await fetchIssuesSince(GITHUB_OWNER, GITHUB_REPO, state.lastCheckedAt);
    console.log(`Fetched ${allIssues.length} updated/new issues`);
    if (allIssues.length > 0) {
      console.log(`  Issues: ${allIssues.map((i) => `#${i.number} (${i.updated_at})`).join(", ")}`);
    }

    // If no changes, just update timestamp and exit early
    if (allIssues.length === 0) {
      console.log("No new or updated issues.");
      state.lastCheckedAt = new Date().toISOString();
      saveState(state);
      return;
    }

    // STEP 3: Classify fetched issues as NEW or UPDATED
    // NEW: Issue number not in state (first time seeing it)
    // UPDATED: Issue exists in state but updated_at timestamp changed
    // This avoids re-triaging issues we've already seen
    const { new: newIssueNumbers, updated: updatedIssueNumbers } = getNewAndUpdatedIssues(
      state,
      allIssues.map((i) => ({ number: i.number, updated_at: i.updated_at }))
    );

    // Only triage issues that are new or meaningfully changed
    // Skip issues that haven't changed since last poll
    const issuesToTriage = allIssues.filter(
      (i) => newIssueNumbers.includes(i.number) || updatedIssueNumbers.includes(i.number)
    );

    console.log(`Issues to triage: ${newIssueNumbers.length} new, ${updatedIssueNumbers.length} updated`);
    if (newIssueNumbers.length > 0) console.log(`  New: #${newIssueNumbers.join(", #")}`);
    if (updatedIssueNumbers.length > 0) console.log(`  Updated: #${updatedIssueNumbers.join(", #")}`);

    // Exit early if nothing to triage
    if (issuesToTriage.length === 0) {
      console.log("No new or meaningfully updated issues.");
      return;
    }

    // STEP 4: Fetch recent issues for duplicate detection
    // Gets last 30 open issues (by update time) with title + summary
    // Claude uses these to detect if new issue is a duplicate of a recent one
    const recentIssues = await fetchRecentOpenIssues(GITHUB_OWNER, GITHUB_REPO, 30);
    console.log(`Fetched ${recentIssues.length} recent issues for duplicate detection`);

    // STEP 5: Send each issue to Claude for analysis
    // Claude returns: priority, type, actionable, likelyAction, summary, duplicates detected
    // Also calculates daysStale (how old the issue is)
    const triageResults = await triageIssues(issuesToTriage, recentIssues);
    console.log(`Triaged ${triageResults.length} issues`);

    // STEP 6: Clean duplicate flags for UPDATED issues
    // Policy: Only surface duplicate alerts for NEW issues
    // Reason: If #1 is already in Slack and we update it, we don't want to show "possible duplicate" again
    // For updated issues, clear the duplicates field so they don't trigger duplicate alerts
    const cleanedResults = triageResults.map((result) => {
      if (updatedIssueNumbers.includes(result.issueNumber)) {
        return { ...result, duplicates: [] };  // Clear duplicates for updated issues
      }
      return result;
    });

    // STEP 7: Filter issues for surfacing (noise reduction)
    // Keep only actionable/important issues; filter out noise
    // Strategy: Surface by priority + actionability + duplicates + staleness
    let surfacedIssues = cleanedResults.filter((t) => {
      // Stale reminder: Re-surface Critical/High issues if they haven't been updated in 3+ days
      // Prevents important work from being forgotten
      const isStaleHighPriority = (t.daysStale ?? 0) >= 3 && (t.priority === "Critical" || t.priority === "High");

      // Decision: Should this issue be in Slack?
      const matches =
        t.priority === "Critical" ||  // Always surface Critical (even vague ones, severity overrides detail)
        t.priority === "High" ||      // Always surface High
        t.priority === "Medium" ||    // Always surface Medium
        (t.duplicates && t.duplicates.length > 0) ||  // Surface if duplicate detected (awareness)
        isStaleHighPriority;          // Stale reminder for forgotten high-priority work

      // Debug logging
      if (!matches) {
        console.log(
          `  ❌ Issue #${t.issueNumber} filtered: priority=${t.priority}, actionable=${t.actionable}, duplicates=${t.duplicates?.length || 0}, stale=${t.daysStale || 0}d`
        );
      } else {
        const reason = isStaleHighPriority ? " (stale reminder)" : "";
        console.log(
          `  ✅ Issue #${t.issueNumber} surfaced: priority=${t.priority}, actionable=${t.actionable}, duplicates=${t.duplicates?.length || 0}, stale=${t.daysStale || 0}d${reason}`
        );
      }

      return matches;
    });

    // STEP 8: Merge duplicate issues (noise reduction)
    // Example: If #2 and #3 are duplicates of #1:
    //   - Only surface #1 with mergedFrom=[2,3]
    //   - Remove #2, #3 from surfaced list
    //   - Slack shows: "#1: ... 📋 Also reported as: #2, #3"
    //   - 🔁 section still shows full relationship for context
    // This keeps Slack focused on unique incidents while maintaining visibility

    // Build map: duplicate_issue_number → primary_issue_number
    const duplicateToParent = new Map<number, number>();
    for (const issue of surfacedIssues) {
      if (issue.duplicates && issue.duplicates.length > 0) {
        for (const dup of issue.duplicates) {
          duplicateToParent.set(dup.issueNumber, issue.issueNumber);
        }
      }
    }

    // Mark merged issues and remove duplicates from surfaced list
    // Keep primary issues, mark them with mergedFrom field, remove duplicates
    surfacedIssues = surfacedIssues.map((issue) => {
      // Find all issues that are duplicates of this one
      const mergedIssues = surfacedIssues
        .filter((t) => duplicateToParent.get(t.issueNumber) === issue.issueNumber)
        .map((t) => t.issueNumber);
      return mergedIssues.length > 0 ? { ...issue, mergedFrom: mergedIssues } : issue;
    }).filter((issue) => !duplicateToParent.has(issue.issueNumber));  // Remove non-primary issues

    console.log(`After merging duplicates: ${surfacedIssues.length} issues`);
    for (const issue of surfacedIssues) {
      if (issue.mergedFrom && issue.mergedFrom.length > 0) {
        console.log(`  #${issue.issueNumber} merged with: #${issue.mergedFrom.join(", #")}`);
      }
    }

    console.log(`Surfacing ${surfacedIssues.length} of ${cleanedResults.length} issues`);

    // STEP 9: Build transparency stats for Slack footer
    // Shows what was reviewed vs surfaced vs filtered (helps team understand signal-to-noise)
    const stats: NotificationStats = {
      totalReviewed: cleanedResults.length,
      surfaced: surfacedIssues.length,
      filtered: cleanedResults.length - surfacedIssues.length,
    };

    // STEP 10: Send Slack notification if there are issues to surface
    if (surfacedIssues.length > 0) {
      // Build Block Kit message with all issues grouped by priority
      const payload = buildNotificationBlocks(surfacedIssues, stats);

      // STEP 11: Decide whether to UPDATE existing message or POST new message
      // UPDATE (same issues): Same set of issues as last poll, just with updated analysis
      //   Example: #96 database issue updated from "offline" → "60% recovered"
      //   → Replace the message with new triage analysis
      // POST NEW (different issues): New issue added to the set
      //   Example: #95 S3 issue added alongside #96 database issue
      //   → Send new message so both incidents are visible in Slack thread
      const currentIssueNumbers = surfacedIssues.map((t) => t.issueNumber).sort((a, b) => a - b);
      const lastIssueNumbers = (state.lastSurfacedIssues || []).sort((a, b) => a - b);
      const isSameIssueSet = JSON.stringify(currentIssueNumbers) === JSON.stringify(lastIssueNumbers);

      if (isSameIssueSet && state.lastMessageTs) {
        // Same issues: Update the existing message (replace with new analysis)
        payload.ts = state.lastMessageTs;
      }
      // else: Different issues, post new message (keep both incidents visible)

      const messageTs = await sendNotification(payload);
      state.lastMessageTs = messageTs;  // Remember message TS for future updates
      state.lastSurfacedIssues = currentIssueNumbers;  // Remember which issues we surfaced
    } else {
      console.log("No issues to surface after filtering.");
    }

    // STEP 12: Persist state to disk for next poll
    // Update lastCheckedAt so next poll only fetches issues modified after this time
    state.lastCheckedAt = new Date().toISOString();

    // Mark all fetched issues as seen (save their updated_at timestamp)
    // This allows us to detect "NEW" vs "UPDATED" next poll
    for (const issue of allIssues) {
      state = updateIssueTimestamp(state, issue.number, issue.updated_at);
    }

    // Write updated state to .triage-state.json
    saveState(state);
    console.log("State updated and saved.");
  } catch (error) {
    console.error("Poll error:", error);
  }
}

async function main(): Promise<void> {
  console.log("🚀 GitHub Issue Triage Agent Starting");
  console.log(`Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`);
  console.log(`Poll interval: ${POLL_INTERVAL / 1000}s`);

  // Reset state if RESET_STATE env var is set (only once, at startup)
  if (process.env.RESET_STATE === "true") {
    const emptyState = {
      lastCheckedAt: new Date().toISOString(),
      issues: {},
    };
    saveState(emptyState);
    console.log("⚠️  State reset on startup (RESET_STATE=true)");
    console.log("");
  }

  // Run immediately
  await poll();

  // Then run on interval
  setInterval(poll, POLL_INTERVAL);
}

main().catch(console.error);
