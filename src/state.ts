import fs from "fs";
import path from "path";
import { StateFile } from "./types";

const STATE_FILE = path.join(process.cwd(), ".triage-state.json");

export function loadState(): StateFile {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      lastCheckedAt: new Date().toISOString(),
      issues: {},
    };
  }
  const content = fs.readFileSync(STATE_FILE, "utf-8");
  const state = JSON.parse(content);

  // Migrate old format (string values) to new format (object values)
  const migratedIssues: Record<number, { updated_at: string; messageTs?: string }> = {};
  for (const [issueNum, value] of Object.entries(state.issues)) {
    if (typeof value === 'string') {
      migratedIssues[parseInt(issueNum)] = { updated_at: value };
    } else {
      migratedIssues[parseInt(issueNum)] = value as any;
    }
  }

  return {
    ...state,
    issues: migratedIssues,
  };
}

export function saveState(state: StateFile): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateIssueTimestamp(
  state: StateFile,
  issueNumber: number,
  updatedAt: string,
  messageTs?: string
): StateFile {
  const existingIssue = state.issues[issueNumber];
  return {
    ...state,
    issues: {
      ...state.issues,
      [issueNumber]: {
        updated_at: updatedAt,
        messageTs: messageTs || (typeof existingIssue === 'object' ? existingIssue.messageTs : undefined),
      },
    },
  };
}

export function getNewAndUpdatedIssues(
  state: StateFile,
  fetchedIssues: Array<{ number: number; updated_at: string }>
): {
  new: number[];
  updated: number[];
} {
  const new_issues: number[] = [];
  const updated_issues: number[] = [];

  for (const issue of fetchedIssues) {
    const existingIssue = state.issues[issue.number];
    if (!existingIssue) {
      new_issues.push(issue.number);
    } else {
      const existingUpdatedAt = typeof existingIssue === 'object' ? existingIssue.updated_at : existingIssue;
      if (existingUpdatedAt !== issue.updated_at) {
        updated_issues.push(issue.number);
      }
    }
  }

  return { new: new_issues, updated: updated_issues };
}
