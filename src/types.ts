export interface Issue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
  };
}

export interface TriageResult {
  issueNumber: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  type: "bug" | "feature" | "question" | "docs" | "chore";
  actionable: boolean;
  actionReason: string;
  likelyAction: string;
  summary: string;
  duplicates?: {
    issueNumber: number;
    reason: string;
  }[];
  daysStale?: number;
  messageTs?: string;
}

export interface StateFile {
  lastCheckedAt: string;
  lastMessageTs?: string;
  issues: Record<number, { updated_at: string; messageTs?: string }>;
}

export interface NotificationStats {
  totalReviewed: number;
  surfaced: number;
  filtered: number;
}
