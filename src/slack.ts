import { WebClient } from "@slack/web-api";
import { TriageResult, NotificationStats } from "./types";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackBlocksPayload {
  channel: string;
  blocks: any[];
  text: string;
}

export function buildNotificationBlocks(
  triageResults: TriageResult[],
  stats: NotificationStats
): SlackBlocksPayload {
  const channelId = process.env.SLACK_CHANNEL_ID || "C1234567890";

  const critical = triageResults.filter(
    (t) => t.priority === "Critical" && t.actionable
  );
  const high = triageResults.filter(
    (t) => t.priority === "High" && t.actionable
  );
  const medium = triageResults.filter((t) => t.priority === "Medium");
  const low = triageResults.filter((t) => t.priority === "Low");

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
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<https://github.com/issue/${issue.issueNumber}|#${issue.issueNumber}: ${issue.summary}>*\n_${issue.likelyAction}_\n🏷️ ${issue.type}`,
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
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<https://github.com/issue/${issue.issueNumber}|#${issue.issueNumber}: ${issue.summary}>*\n_${issue.likelyAction}_\n🏷️ ${issue.type}`,
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
          `• <https://github.com/issue/${issue.issueNumber}|#${issue.issueNumber}>: ${issue.summary}`
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
          `• <https://github.com/issue/${issue.issueNumber}|#${issue.issueNumber}>: ${issue.summary}`
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
  const duplicateIssues = triageResults.filter((t) => t.duplicates && t.duplicates.length > 0);
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
        .map((d) => `#${d.issueNumber}: ${d.reason}`)
        .join(", ");
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<https://github.com/issue/${issue.issueNumber}|#${issue.issueNumber}> may duplicate: ${dupText}`,
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

export async function sendNotification(payload: SlackBlocksPayload): Promise<void> {
  try {
    await slack.chat.postMessage(payload);
    console.log(`✅ Notification sent to #${payload.channel}`);
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    throw error;
  }
}
