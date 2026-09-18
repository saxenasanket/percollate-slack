import fs from "fs";
import path from "path";
import { StateFile } from "./types";

const STATE_FILE = path.join(process.cwd(), ".triage-state.json");

export function loadState(): StateFile {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      lastCheckedAt: new Date(0).toISOString(),
      issues: {},
    };
  }
  const content = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(content);
}

export function saveState(state: StateFile): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateIssueTimestamp(
  state: StateFile,
  issueNumber: number,
  updatedAt: string
): StateFile {
  return {
    ...state,
    issues: {
      ...state.issues,
      [issueNumber]: updatedAt,
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
    if (!state.issues[issue.number]) {
      new_issues.push(issue.number);
    } else if (state.issues[issue.number] !== issue.updated_at) {
      updated_issues.push(issue.number);
    }
  }

  return { new: new_issues, updated: updated_issues };
}
