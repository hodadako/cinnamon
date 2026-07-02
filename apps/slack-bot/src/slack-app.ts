import { App } from "@slack/bolt";
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
import type { BetterSqliteDatabase, CinnamonConfig, JsonlLogger } from "@cinnamon/core";
import { parseRepoName, renderCommandResponse } from "./commands";
import { summarizePullRequest } from "./pr-summary";
import { SlackConnectorAdapter } from "./slack-connector";

export interface CinnamonSlackApp {
  app: App;
  start(port?: number): Promise<void>;
}

export interface CinnamonSlackAppServices {
  database: BetterSqliteDatabase;
  logger?: JsonlLogger;
}

export function createCinnamonSlackApp(config: CinnamonConfig, services: CinnamonSlackAppServices): CinnamonSlackApp {
  if (!config.slack.botToken || !config.slack.appToken) {
    throw new Error("SLACK_BOT_TOKEN and SLACK_APP_TOKEN are required to start Slack Socket Mode.");
  }

  const app = new App({
    token: config.slack.botToken,
    appToken: config.slack.appToken,
    signingSecret: config.slack.signingSecret,
    socketMode: true
  });
  const connector = new SlackConnectorAdapter();

  app.command("/cinnamon", async ({ ack, command, respond }) => {
    await ack();

    const normalizedCommand = connector.normalizeCommand(command);
    const response = await handleCommand({
      config,
      database: services.database,
      command: normalizedCommand
    });

    await services.logger?.log({
      level: "info",
      component: "slack-bot",
      event: "command.received",
      data: {
        connector: normalizedCommand.connector,
        command: normalizedCommand.command,
        args: normalizedCommand.args,
        channelId: normalizedCommand.location.channelId,
        userId: normalizedCommand.user.id
      }
    });

    await respond(connector.renderTextMessage({
      visibility: "ephemeral",
      text: response
    }));
  });

  return {
    app,
    start: async (port?: number) => {
      if (port === undefined) {
        await app.start();
        return;
      }

      await app.start(port);
    }
  };
}

interface HandleCommandInput {
  config: CinnamonConfig;
  database: BetterSqliteDatabase;
  command: NormalizedConnectorCommand;
}

async function handleCommand(input: HandleCommandInput): Promise<string> {
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

  return renderCommandResponse({
    rawText: input.command.text,
    name: input.command.command,
    args: input.command.args
  });
}

function handleBootstrapCommand(input: HandleCommandInput): string {
  const code = input.command.args[0];

  if (!code) {
    return "Usage: `/cinnamon bootstrap <code>`";
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

function handleSubscribeCommand(input: HandleCommandInput): string {
  if (countRoleGrants(input.database, "admin") === 0) {
    return "Run `/cinnamon bootstrap <code>` before subscribing repositories.";
  }

  if (!hasRole(input.database, "user", input.command.user.id, "admin")) {
    return "Only Cinnamon admins can subscribe repositories.";
  }

  const repo = parseRepoName(input.command.args[0]);

  if (!repo) {
    return "Usage: `/cinnamon subscribe owner/repo [feature...]`";
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

  return `Subscribed <#${input.command.location.channelId}> to ${repo.owner}/${repo.name}: ${normalizedFeatures.join(", ")}`;
}
