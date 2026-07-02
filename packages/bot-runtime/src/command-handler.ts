import type { NormalizedConnectorCommand } from "@cinnamon/connectors";
import {
  countRoleGrants,
  grantRole,
  hasRole,
  isBootstrapConsumed,
  markBootstrapConsumed,
  upsertRepoSubscription,
  verifyBootstrapCode
} from "@cinnamon/core";
import type { BetterSqliteDatabase, CinnamonConfig } from "@cinnamon/core";
import { summarizePullRequest } from "./pr-summary";

export interface CinnamonCommandHandlerInput {
  config: CinnamonConfig;
  database: BetterSqliteDatabase;
  command: NormalizedConnectorCommand;
}

export async function handleCinnamonCommand(input: CinnamonCommandHandlerInput): Promise<string> {
  if (input.command.command === "bootstrap") {
    return handleBootstrapCommand(input);
  }

  if (input.command.command === "subscribe") {
    return handleSubscribeCommand(input);
  }

  if (input.command.command === "pr" && input.command.args[0] === "summary") {
    try {
      return await summarizePullRequest(input.command.args[1] ?? "");
    } catch (error) {
      return `Could not summarize PR: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  }

  return renderCommandResponse(input.command.command, input.command.args);
}

export function renderCommandResponse(name: string, args: string[]): string {
  switch (name) {
    case "help":
      return [
        "Cinnamon commands:",
        "`bootstrap <code>`",
        "`subscribe owner/repo pulls`",
        "`pr summary <url>`",
        "`logs recent`"
      ].join("\n");

    case "logs":
      return "Log lookup flow is wired after JSONL query commands. This command is recognized.";

    default:
      return `Unknown Cinnamon command: \`${name}\`. Try \`help\`.`;
  }
}

function handleBootstrapCommand(input: CinnamonCommandHandlerInput): string {
  const code = input.command.args[0];

  if (!code) {
    return "Usage: `bootstrap <code>`";
  }

  if (isBootstrapConsumed(input.database)) {
    return "Bootstrap code has already been consumed.";
  }

  if (!verifyBootstrapCode(code, input.config.auth.bootstrapCodeHash)) {
    return "Bootstrap code is invalid.";
  }

  grantRole(input.database, "user", input.command.user.id, "admin");
  grantRole(input.database, "user", input.command.user.id, "write");
  markBootstrapConsumed(input.database, input.command.user.id);

  return "Bootstrap complete. You are now the first Cinnamon admin.";
}

function handleSubscribeCommand(input: CinnamonCommandHandlerInput): string {
  if (countRoleGrants(input.database, "admin") === 0) {
    return "Run `bootstrap <code>` before subscribing repositories.";
  }

  if (!hasRole(input.database, "user", input.command.user.id, "admin")) {
    return "Only Cinnamon admins can subscribe repositories.";
  }

  const repo = parseRepoName(input.command.args[0]);

  if (!repo) {
    return "Usage: `subscribe owner/repo [feature...]`";
  }

  const features = input.command.args.slice(1);
  const normalizedFeatures = features.length > 0 ? features : ["pulls"];

  upsertRepoSubscription(input.database, {
    channelId: input.command.location.channelId,
    repoOwner: repo.owner,
    repoName: repo.name,
    features: normalizedFeatures,
    createdBySlackUserId: input.command.user.id
  });

  return `Subscribed ${input.command.location.channelId} to ${repo.owner}/${repo.name}: ${normalizedFeatures.join(", ")}`;
}

function parseRepoName(value: string | undefined): { owner: string; name: string } | undefined {
  if (!value) {
    return undefined;
  }

  const [owner, name] = value.split("/");

  if (!owner || !name) {
    return undefined;
  }

  return { owner, name };
}
