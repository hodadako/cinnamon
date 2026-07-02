import type { SlackCommandMiddlewareArgs } from "@slack/bolt";
import type { ConnectorAdapter, ConnectorTextMessage, NormalizedConnectorCommand } from "@cinnamon/connectors";
import { parseCinnamonCommand } from "./commands";

type SlackSlashCommand = SlackCommandMiddlewareArgs["command"];

export class SlackConnectorAdapter implements ConnectorAdapter<SlackSlashCommand, { response_type: "ephemeral" | "in_channel"; text: string; thread_ts?: string }> {
  readonly kind = "slack" as const;

  normalizeCommand(command: SlackSlashCommand): NormalizedConnectorCommand {
    const parsed = parseCinnamonCommand(command.text);

    return {
      connector: this.kind,
      command: parsed.name,
      text: parsed.rawText,
      args: parsed.args,
      user: {
        id: command.user_id,
        displayName: command.user_name
      },
      location: {
        workspaceId: command.team_id,
        channelId: command.channel_id
      },
      raw: command
    };
  }

  renderTextMessage(message: ConnectorTextMessage): { response_type: "ephemeral" | "in_channel"; text: string; thread_ts?: string } {
    return {
      response_type: message.visibility === "channel" ? "in_channel" : "ephemeral",
      text: message.text,
      thread_ts: message.threadId
    };
  }
}
