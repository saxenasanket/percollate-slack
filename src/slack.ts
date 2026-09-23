import { WebClient } from "@slack/web-api";
import { TriageResult, NotificationStats } from "./types";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";

const getGitHubIssueUrl = (issueNumber: number): string => {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`;
};

export interface SlackBlocksPayload {
  channel: string;
  blocks: any[];
  text: string;
  ts?: string;
}

export function buildNotificationBlocks(
  triageResults: TriageResult[],
  stats: NotificationStats
): SlackBlocksPayload {
  const channelId = process.env.SLACK_CHANNEL_ID || "C1234567890";

  const critical = triageResults
    .filter((t) => t.priority === "Critical")
    .sort((a, b) => a.issueNumber - b.issueNumber);
  const high = triageResults
    .filter((t) => t.priority === "High")
    .sort((a, b) => a.issueNumber - b.issueNumber);
  const medium = triageResults
    .filter((t) => t.priority === "Medium")
    .sort((a, b) => a.issueNumber - b.issueNumber);
  const low = triageResults
    .filter((t) => t.priority === "Low")
    .sort((a, b) => a.issueNumber - b.issueNumber);

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🤖 GitHub Issue Triage Report",
      },
    },
    {
      type: "divider",
    },
  ];

  // Critical issues section
  if (critical.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔴 Needs Attention Now* (${critical.length})`,
      },
    });

    for (const issue of critical) {
      const staleIndicator = issue.daysStale ? `\n⏰ Last updated ${issue.daysStale} days ago` : "";
      const isDuplicate = issue.duplicates && issue.duplicates.length > 0;
      const actionText = isDuplicate ? "⚠️ Possible duplicate" : `_${issue.likelyAction}_`;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${getGitHubIssueUrl(issue.issueNumber)}|#${issue.issueNumber}: ${issue.summary}>*\n${actionText}\n🏷️ ${issue.type}${staleIndicator}`,
        },
      });
    }

    blocks.push({ type: "divider" });
  }

  // High priority issues section
  if (high.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🟠 High Priority* (${high.length})`,
      },
    });

    for (const issue of high) {
      const staleIndicator = issue.daysStale ? `\n⏰ Last updated ${issue.daysStale} days ago` : "";
      const isDuplicate = issue.duplicates && issue.duplicates.length > 0;
      const actionText = isDuplicate ? "⚠️ Possible duplicate" : `_${issue.likelyAction}_`;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${getGitHubIssueUrl(issue.issueNumber)}|#${issue.issueNumber}: ${issue.summary}>*\n${actionText}\n🏷️ ${issue.type}${staleIndicator}`,
        },
      });
    }

    blocks.push({ type: "divider" });
  }

  // Medium priority section
  if (medium.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🟡 Worth a Look* (${medium.length})`,
      },
    });

    const mediumText = medium
      .map(
        (issue) =>
          `• <${getGitHubIssueUrl(issue.issueNumber)}|#${issue.issueNumber}>: ${issue.summary}`
      )
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: mediumText,
      },
    });

    blocks.push({ type: "divider" });
  }

  // Low priority (collapsed)
  if (low.length > 0) {
    const lowText = low
      .map(
        (issue) =>
          `• <${getGitHubIssueUrl(issue.issueNumber)}|#${issue.issueNumber}>: ${issue.summary}`
      )
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚪ Low Priority* (${low.length})\n${lowText.substring(0, 500)}${lowText.length > 500 ? "..." : ""}`,
      },
    });

    blocks.push({ type: "divider" });
  }

  // Duplicates (if any)
  const duplicateIssues = triageResults
    .filter((t) => t.duplicates && t.duplicates.length > 0)
    .sort((a, b) => a.issueNumber - b.issueNumber);
  if (duplicateIssues.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*🔁 Possible Duplicates*",
      },
    });

    for (const issue of duplicateIssues) {
      const dupText = (issue.duplicates || [])
        .map((d) => `<${getGitHubIssueUrl(d.issueNumber)}|#${d.issueNumber}>`)
        .join(", ");
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${getGitHubIssueUrl(issue.issueNumber)}|#${issue.issueNumber}> → likely duplicate of ${dupText}`,
        },
      });
    }

    blocks.push({ type: "divider" });
  }

  // Footer with transparency stats
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `📊 _Reviewed: ${stats.totalReviewed} | Surfaced: ${stats.surfaced} | Filtered: ${stats.filtered}_`,
      },
    ],
  });

  return {
    channel: channelId,
    blocks,
    text: "GitHub Issue Triage Report",
  };
}

export async function sendNotification(payload: SlackBlocksPayload): Promise<string> {
  try {
    if (payload.ts) {
      // Update existing message
      await slack.chat.update({
        channel: payload.channel,
        ts: payload.ts,
        blocks: payload.blocks,
        text: payload.text,
      } as any);
      console.log(`✅ Notification updated in #${payload.channel}`);
      return payload.ts;
    } else {
      // Post new message
      const result = await slack.chat.postMessage({
        ...payload,
        unfurl_links: false,  // Disable link previews
        unfurl_media: false,
      } as any);
      console.log(`✅ Notification sent to #${payload.channel}`);
      return result.ts || "";
    }
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    throw error;
  }
}
