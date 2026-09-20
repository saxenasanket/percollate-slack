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
}

export interface StateFile {
  lastCheckedAt: string;
  issues: Record<number, string>;
}

export interface NotificationStats {
  totalReviewed: number;
  surfaced: number;
  filtered: number;
}
