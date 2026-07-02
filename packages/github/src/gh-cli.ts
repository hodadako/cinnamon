import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitHubPullRequestDetails, GitHubPullRequestRef } from "./pull-request";

const execFileAsync = promisify(execFile);

export interface GhCliOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export async function assertGhAvailable(options: GhCliOptions = {}): Promise<void> {
  await execFileAsync("gh", ["--version"], {
    cwd: options.cwd,
    env: options.env
  });
}

export async function getPullRequestDetails(
  ref: GitHubPullRequestRef,
  options: GhCliOptions = {}
): Promise<GitHubPullRequestDetails> {
  const { stdout } = await execFileAsync(
    "gh",
    [
      "pr",
      "view",
      String(ref.number),
      "--repo",
      `${ref.owner}/${ref.repo}`,
      "--json",
      "title,body,author,url,state,additions,deletions,changedFiles"
    ],
    {
      cwd: options.cwd,
      env: options.env
    }
  );

  const parsed = JSON.parse(stdout) as {
    title: string;
    body?: string;
    author?: { login?: string };
    url: string;
    state: string;
    additions: number;
    deletions: number;
    changedFiles: number;
  };

  return {
    ...ref,
    title: parsed.title,
    body: parsed.body ?? "",
    author: parsed.author?.login ?? "unknown",
    url: parsed.url,
    state: parsed.state,
    additions: parsed.additions,
    deletions: parsed.deletions,
    changedFiles: parsed.changedFiles
  };
}
