import { Octokit } from "@octokit/rest";
import { Issue } from "./types";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function fetchIssuesSince(
  owner: string,
  repo: string,
  since: string
): Promise<Issue[]> {
  const issues: Issue[] = [];
  let page = 1;
  let hasMore = true;

  // GitHub API doesn't work well with very old dates, so only use since if it's recent
  const sinceDate = new Date(since).getTime();
  const year2000 = new Date("2000-01-01").getTime();
  const useSince = sinceDate > year2000 ? since : undefined;

  console.log(`[GitHub API] Fetching issues since: ${useSince || "beginning of time"}`);

  while (hasMore) {
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      ...(useSince && { since: useSince }),
      sort: "updated",
      direction: "desc",
      per_page: 30,
      page,
    });

    console.log(`[GitHub API] Page ${page}: Got ${response.data.length} issues`);

    issues.push(
      ...response.data.map((item: any) => ({
        number: item.number,
        title: item.title,
        body: item.body || "",
        state: item.state,
        labels: item.labels.map((l: any) => l.name),
        created_at: item.created_at,
        updated_at: item.updated_at,
        html_url: item.html_url,
        user: {
          login: item.user.login,
        },
      }))
    );

    hasMore = response.data.length === 30;
    page++;
  }

  console.log(`[GitHub API] Total issues fetched: ${issues.length}`);

  return issues;
}

export async function fetchRecentOpenIssues(
  owner: string,
  repo: string,
  limit: number = 30
): Promise<
  Array<{ number: number; title: string; summary: string; updated_at: string }>
> {
  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "open",
    sort: "updated",
    direction: "desc",
    per_page: limit,
  });

  return response.data.map((item: any) => ({
    number: item.number,
    title: item.title,
    summary: (item.body || "").substring(0, 200),
    updated_at: item.updated_at,
  }));
}
