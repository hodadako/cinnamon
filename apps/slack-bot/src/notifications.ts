export interface PullRequestNotification {
  repo: string;
  number: number;
  title: string;
  author: string;
  action: string;
  url: string;
  draft?: boolean;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export function renderPullRequestParentMessage(notification: PullRequestNotification): string {
  const status = notification.draft ? "draft" : "ready";
  const changed = renderChangedFiles(notification);

  return [
    `*${notification.repo}#${notification.number}* ${notification.action}`,
    `<${notification.url}|${notification.title}>`,
    `Author: ${notification.author}`,
    `Status: ${status}`,
    changed,
    "Actions: `/cinnamon pr summary <url>`"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderChangedFiles(notification: PullRequestNotification): string | undefined {
  if (
    notification.additions === undefined &&
    notification.deletions === undefined &&
    notification.changedFiles === undefined
  ) {
    return undefined;
  }

  const additions = notification.additions ?? 0;
  const deletions = notification.deletions ?? 0;
  const files = notification.changedFiles ?? 0;

  return `Changed: +${additions} -${deletions}, ${files} files`;
}
