import Anthropic from "@anthropic-ai/sdk";
import { Issue, TriageResult } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-5";

// Analyze a single GitHub issue using Claude API
// Returns: priority, type, actionability, recommended action, summary, and any detected duplicates
// This is the core triage decision-making function
export async function triageIssue(
  issue: Issue,
  recentIssues: Array<{ number: number; title: string; summary: string }>
): Promise<TriageResult> {
  // Calculate staleness: how many days since last update
  // Used later to detect forgotten old issues that should be re-surfaced
  const updatedAtTime = new Date(issue.updated_at).getTime();
  const nowTime = new Date().getTime();
  const daysStale = Math.floor((nowTime - updatedAtTime) / (1000 * 60 * 60 * 24));

  // Format recent issues for Claude (context for duplicate detection)
  // Each issue: number, title, and first 150 chars of summary
  const recentIssuesList = recentIssues
    .map(
      (i) =>
        `#${i.number}: ${i.title}\n${i.summary.substring(0, 150)}`
    )
    .join("\n\n");

  // Claude prompt: Tell Claude exactly what to analyze and what output format to return
  // This is the instruction that drives the entire triage logic
  const prompt = `You are a GitHub issue triage system. Analyze this issue and provide structured triage data.

## New Issue to Triage
**#${issue.number}: ${issue.title}**
**Author:** ${issue.user.login}
**Labels:** ${issue.labels.length > 0 ? issue.labels.join(", ") : "none"}
**Body:**
${issue.body}

## Recent Open Issues (for duplicate detection)
${recentIssuesList}

Analyze this issue and respond with a JSON object containing:
1. priority: "Critical" (blocks production/core feature), "High" (significant impact or bug), "Medium" (normal priority), or "Low" (minor/nice-to-have)
   - IMPORTANT: If the issue has labels like "critical", "p0", "production", or "blocking", priority MUST be at least "High" (override content analysis if needed)
2. type: "bug" (defect), "feature" (new capability), "question" (needs clarification), "docs" (documentation), or "chore" (maintenance)
3. actionable: true if the issue has enough information to act on it
4. actionReason: brief explanation for actionable decision
5. likelyAction: what the team should do next (e.g., "needs repro steps", "ready to assign", "needs label clarification")
6. summary: one-sentence summary of the issue
7. duplicates: array of {issueNumber, reason} for any likely duplicates/related issues from the recent list above (empty if none)

Respond ONLY with valid JSON, no other text.`;

  // Call Claude API with the issue analysis prompt
  // Returns JSON with priority, type, actionable decision, and duplicates detected
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (!response.content || response.content.length === 0) {
    throw new Error("Empty response from Claude - no content");
  }

  // Extract text block from response
  // Note: Claude may include thinking blocks before the text response
  // We need to skip those and find the actual text block
  const textBlock = response.content.find((block: any) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text block in Claude response. Got: ${response.content.map((c: any) => c.type).join(", ")}`);
  }

  if (!textBlock.text) {
    throw new Error("No text in Claude response");
  }

  const content = textBlock;

  // Parse Claude's JSON response
  let triage: any;
  try {
    let jsonText = content.text.trim();
    // Claude sometimes wraps JSON in markdown code blocks, so remove those
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }
    triage = JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse Claude response:", content.text);
    throw e;
  }

  // Return structured triage result
  // This gets used by index.ts to filter, merge, and display the issue
  return {
    issueNumber: issue.number,
    priority: triage.priority,           // Critical/High/Medium/Low (determines Slack section)
    type: triage.type,                   // bug/feature/question/docs/chore (shows in Slack)
    actionable: triage.actionable,       // Can someone act on this? (influences filtering)
    actionReason: triage.actionReason,   // Why is it actionable or not?
    likelyAction: triage.likelyAction,   // What should the team do next? (shows in Slack)
    summary: triage.summary,             // One-line summary (shows in Slack)
    duplicates: triage.duplicates || [], // Other issues this might be duplicate of
    daysStale: daysStale > 0 ? daysStale : undefined,  // How old is this issue?
  };
}

// Triage multiple issues
// Loops through each issue, calls Claude for each, with retry logic for API failures
// Returns array of TriageResults or empty if all fail
export async function triageIssues(
  issues: Issue[],
  recentIssues: Array<{ number: number; title: string; summary: string }>
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];

  for (const issue of issues) {
    let result;
    let attempts = 0;
    const maxAttempts = 5;

    // Retry logic: If Claude API call fails, retry with exponential backoff
    // Failures can be rate limits, network issues, malformed responses, etc.
    while (!result && attempts < maxAttempts) {
      try {
        result = await triageIssue(issue, recentIssues);
        results.push(result);

        // Rate limiting: Add small delay between API calls to avoid hitting Claude rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // Give up after 5 attempts, log error and skip this issue
          console.error(`Failed to triage issue #${issue.number} after ${maxAttempts} attempts:`, error);
        } else {
          // Exponential backoff: wait 1s, 2s, 4s, 8s before retrying
          // This gives the Claude API time to recover if it's overloaded
          const backoffMs = Math.pow(2, attempts - 1) * 1000;
          console.log(`⚠️  Triage attempt ${attempts} failed for #${issue.number}, retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  return results;
}
