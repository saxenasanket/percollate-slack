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

async function poll(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Starting poll...`);

  try {
    // Load current state
    let state = loadState();
    console.log(`Last checked at: ${state.lastCheckedAt}`);

    // Fetch issues updated since last check
    const allIssues = await fetchIssuesSince(GITHUB_OWNER, GITHUB_REPO, state.lastCheckedAt);
    console.log(`Fetched ${allIssues.length} updated/new issues`);

    if (allIssues.length === 0) {
      console.log("No new or updated issues.");
      // Still update lastCheckedAt even if no issues
      state.lastCheckedAt = new Date().toISOString();
      saveState(state);
      return;
    }

    // Determine which are new or meaningfully updated
    const { new: newIssueNumbers, updated: updatedIssueNumbers } = getNewAndUpdatedIssues(
      state,
      allIssues.map((i) => ({ number: i.number, updated_at: i.updated_at }))
    );

    const issuesToTriage = allIssues.filter(
      (i) => newIssueNumbers.includes(i.number) || updatedIssueNumbers.includes(i.number)
    );

    console.log(`Issues to triage: ${issuesToTriage.length} new, ${updatedIssueNumbers.length} updated`);

    if (issuesToTriage.length === 0) {
      console.log("No new or meaningfully updated issues.");
      return;
    }

    // Fetch recent issues for duplicate detection
    const recentIssues = await fetchRecentOpenIssues(GITHUB_OWNER, GITHUB_REPO, 30);
    console.log(`Fetched ${recentIssues.length} recent issues for duplicate detection`);

    // Triage each issue
    const triageResults = await triageIssues(issuesToTriage, recentIssues);
    console.log(`Triaged ${triageResults.length} issues`);

    // Filter for notifications (exclude non-actionable low priority)
    const surfacedIssues = triageResults.filter((t) => {
      const matches =
        (t.actionable && (t.priority === "Critical" || t.priority === "High")) ||
        t.priority === "Medium" ||
        (t.duplicates && t.duplicates.length > 0);

      // Debug logging
      if (!matches) {
        console.log(
          `  ❌ Issue #${t.issueNumber} filtered: priority=${t.priority}, actionable=${t.actionable}, duplicates=${t.duplicates?.length || 0}`
        );
      } else {
        console.log(
          `  ✅ Issue #${t.issueNumber} surfaced: priority=${t.priority}, actionable=${t.actionable}, duplicates=${t.duplicates?.length || 0}`
        );
      }

      return matches;
    });

    console.log(`Surfacing ${surfacedIssues.length} of ${triageResults.length} issues`);

    // Build notification stats
    const stats: NotificationStats = {
      totalReviewed: triageResults.length,
      surfaced: surfacedIssues.length,
      filtered: triageResults.length - surfacedIssues.length,
    };

    // Send Slack notification if there are issues to surface
    if (surfacedIssues.length > 0) {
      const payload = buildNotificationBlocks(surfacedIssues, stats);
      await sendNotification(payload);
    } else {
      console.log("No issues to surface after filtering.");
    }

    // Update state with all fetched issues (mark as seen) and current timestamp
    state.lastCheckedAt = new Date().toISOString();
    for (const issue of allIssues) {
      state = updateIssueTimestamp(state, issue.number, issue.updated_at);
    }

    // Save updated state
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

  // Run immediately
  await poll();

  // Then run on interval
  setInterval(poll, POLL_INTERVAL);
}

main().catch(console.error);
