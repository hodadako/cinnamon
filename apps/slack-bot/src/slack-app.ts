import { App } from "@slack/bolt";
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
import { parseCinnamonCommand, parseRepoName, renderCommandResponse } from "./commands";

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

  app.command("/cinnamon", async ({ ack, command, respond }) => {
    await ack();

    const parsedCommand = parseCinnamonCommand(command.text);
    const response = handleCommand({
      config,
      database: services.database,
      commandName: parsedCommand.name,
      args: parsedCommand.args,
      slackUserId: command.user_id,
      channelId: command.channel_id
    });

    await services.logger?.log({
      level: "info",
      component: "slack-bot",
      event: "command.received",
      data: {
        command: parsedCommand.name,
        args: parsedCommand.args,
        channelId: command.channel_id,
        userId: command.user_id
      }
    });

    await respond({
      response_type: "ephemeral",
      text: response
    });
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
  commandName: string;
  args: string[];
  slackUserId: string;
  channelId: string;
}

function handleCommand(input: HandleCommandInput): string {
  if (input.commandName === "bootstrap") {
    return handleBootstrapCommand(input);
  }

  if (input.commandName === "subscribe") {
    return handleSubscribeCommand(input);
  }

  return renderCommandResponse({
    rawText: [input.commandName, ...input.args].join(" "),
    name: input.commandName,
    args: input.args
  });
}

function handleBootstrapCommand(input: HandleCommandInput): string {
  const code = input.args[0];

  if (!code) {
    return "Usage: `/cinnamon bootstrap <code>`";
  }

  if (isBootstrapConsumed(input.database)) {
    return "Bootstrap code has already been consumed.";
  }

  if (!verifyBootstrapCode(code, input.config.auth.bootstrapCodeHash)) {
    return "Bootstrap code is invalid.";
  }

  grantRole(input.database, "user", input.slackUserId, "admin");
  grantRole(input.database, "user", input.slackUserId, "write");
  markBootstrapConsumed(input.database, input.slackUserId);

  return "Bootstrap complete. You are now the first Cinnamon admin.";
}

function handleSubscribeCommand(input: HandleCommandInput): string {
  if (countRoleGrants(input.database, "admin") === 0) {
    return "Run `/cinnamon bootstrap <code>` before subscribing repositories.";
  }

  if (!hasRole(input.database, "user", input.slackUserId, "admin")) {
    return "Only Cinnamon admins can subscribe repositories.";
  }

  const repo = parseRepoName(input.args[0]);

  if (!repo) {
    return "Usage: `/cinnamon subscribe owner/repo [feature...]`";
  }

  const features = input.args.slice(1);
  const normalizedFeatures = features.length > 0 ? features : ["pulls"];

  upsertRepoSubscription(input.database, {
    channelId: input.channelId,
    repoOwner: repo.owner,
    repoName: repo.name,
    features: normalizedFeatures,
    createdBySlackUserId: input.slackUserId
  });

  return `Subscribed <#${input.channelId}> to ${repo.owner}/${repo.name}: ${normalizedFeatures.join(", ")}`;
}
