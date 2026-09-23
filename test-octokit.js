const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

(async () => {
  const since = "2026-09-23T05:12:12.587Z";
  console.log(`Testing Octokit since: ${since}`);
  
  const response = await octokit.issues.listForRepo({
    owner: "saxenasanket",
    repo: "percollate-slack",
    state: "open",
    since: since,
    sort: "updated",
    direction: "desc",
    per_page: 30,
  });
  
  console.log(`Returned ${response.data.length} issues:`);
  response.data.forEach(issue => {
    console.log(`  #${issue.number}: ${issue.title} (updated: ${issue.updated_at})`);
  });
})();
