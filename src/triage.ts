import Anthropic from "@anthropic-ai/sdk";
import { Issue, TriageResult } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-5";

export async function triageIssue(
  issue: Issue,
  recentIssues: Array<{ number: number; title: string; summary: string }>
): Promise<TriageResult> {
  // Calculate how many days since last update (for stale detection)
  const updatedAtTime = new Date(issue.updated_at).getTime();
  const nowTime = new Date().getTime();
  const daysStale = Math.floor((nowTime - updatedAtTime) / (1000 * 60 * 60 * 24));

  const recentIssuesList = recentIssues
    .map(
      (i) =>
        `#${i.number}: ${i.title}\n${i.summary.substring(0, 150)}`
    )
    .join("\n\n");

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

  const content = response.content[0];
  if (!content || content.type !== "text") {
    throw new Error(`Unexpected response type: ${content?.type || "undefined"}, content: ${JSON.stringify(content)}`);
  }

  if (!content.text) {
    throw new Error("No text in Claude response");
  }

  let triage: any;
  try {
    let jsonText = content.text.trim();
    // Remove markdown code blocks if present
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

  return {
    issueNumber: issue.number,
    priority: triage.priority,
    type: triage.type,
    actionable: triage.actionable,
    actionReason: triage.actionReason,
    likelyAction: triage.likelyAction,
    summary: triage.summary,
    duplicates: triage.duplicates || [],
    daysStale: daysStale > 0 ? daysStale : undefined,
  };
}

export async function triageIssues(
  issues: Issue[],
  recentIssues: Array<{ number: number; title: string; summary: string }>
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];

  for (const issue of issues) {
    let result;
    let attempts = 0;
    const maxAttempts = 5;

    while (!result && attempts < maxAttempts) {
      try {
        result = await triageIssue(issue, recentIssues);
        results.push(result);
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`Failed to triage issue #${issue.number} after ${maxAttempts} attempts:`, error);
        } else {
          // Exponential backoff: 1s, 2s, 4s, 8s
          const backoffMs = Math.pow(2, attempts - 1) * 1000;
          console.log(`⚠️  Triage attempt ${attempts} failed for #${issue.number}, retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  return results;
}
