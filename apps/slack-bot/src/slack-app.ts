import { App } from "@slack/bolt";
import type { CinnamonConfig, JsonlLogger } from "@cinnamon/core";
import { parseCinnamonCommand, renderCommandResponse } from "./commands";

export interface CinnamonSlackApp {
  app: App;
  start(port?: number): Promise<void>;
}

export function createCinnamonSlackApp(config: CinnamonConfig, logger?: JsonlLogger): CinnamonSlackApp {
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
    const response = renderCommandResponse(parsedCommand);

    await logger?.log({
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
