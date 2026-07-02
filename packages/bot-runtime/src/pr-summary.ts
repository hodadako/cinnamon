import { CodexAdapter } from "@cinnamon/agents";
import { getPullRequestDetails, parseGitHubPullRequestUrl } from "@cinnamon/github";

export async function summarizePullRequest(url: string): Promise<string> {
  const ref = parseGitHubPullRequestUrl(url);

  if (!ref) {
    return "Usage: `pr summary <github-pr-url>`";
  }

  const pullRequest = await getPullRequestDetails(ref);
  const adapter = new CodexAdapter();
  const result = await adapter.runTask({
    taskType: "github.pr.summary",
    approvalPolicy: "read-only",
    allowedTools: ["gh"],
    prompt: [
      `Summarize ${pullRequest.owner}/${pullRequest.repo}#${pullRequest.number}.`,
      `Title: ${pullRequest.title}`,
      `Author: ${pullRequest.author}`,
      `State: ${pullRequest.state}`,
      `Changed: +${pullRequest.additions} -${pullRequest.deletions}, ${pullRequest.changedFiles} files`,
      pullRequest.body
    ].join("\n"),
    metadata: {
      url: pullRequest.url,
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      number: pullRequest.number
    }
  });

  return [
    `*${pullRequest.owner}/${pullRequest.repo}#${pullRequest.number}*`,
    `<${pullRequest.url}|${pullRequest.title}>`,
    `Author: ${pullRequest.author}`,
    `Changed: +${pullRequest.additions} -${pullRequest.deletions}, ${pullRequest.changedFiles} files`,
    result.summary
  ].join("\n");
}
