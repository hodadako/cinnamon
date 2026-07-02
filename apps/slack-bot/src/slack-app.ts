import { App } from "@slack/bolt";
import { handleCinnamonCommand } from "@cinnamon/bot-runtime";
import type { BetterSqliteDatabase, CinnamonConfig, JsonlLogger } from "@cinnamon/core";
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
  command: ReturnType<SlackConnectorAdapter["normalizeCommand"]>;
}

async function handleCommand(input: HandleCommandInput): Promise<string> {
  const response = await handleCinnamonCommand({
    config: input.config,
    database: input.database,
    command: input.command
  });

  if (response.startsWith("Subscribed ")) {
    return response.replace(input.command.location.channelId, `<#${input.command.location.channelId}>`);
  }

  return response.replace(/`([^`]+)`/g, "`/cinnamon $1`");
}
