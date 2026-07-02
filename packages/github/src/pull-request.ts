export interface GitHubPullRequestRef {
  owner: string;
  repo: string;
  number: number;
}

export interface GitHubPullRequestDetails extends GitHubPullRequestRef {
  title: string;
  body: string;
  author: string;
  url: string;
  state: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export function parseGitHubPullRequestUrl(url: string): GitHubPullRequestRef | undefined {
  const parsed = new URL(url);

  if (parsed.hostname !== "github.com") {
    return undefined;
  }

  const [owner, repo, pull, number] = parsed.pathname.split("/").filter(Boolean);

  if (!owner || !repo || pull !== "pull" || !number) {
    return undefined;
  }

  const parsedNumber = Number(number);

  if (!Number.isInteger(parsedNumber)) {
    return undefined;
  }

  return { owner, repo, number: parsedNumber };
}
