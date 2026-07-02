import type { ConnectorAdapter, ConnectorTextMessage, NormalizedConnectorCommand } from "@cinnamon/connectors";

export interface DiscordCommandLike {
  commandName: string;
  text?: string;
  args?: string[];
  userId: string;
  userName?: string;
  guildId?: string;
  channelId: string;
  raw?: unknown;
}

export interface DiscordTextResponse {
  content: string;
  ephemeral: boolean;
}

export class DiscordConnectorAdapter implements ConnectorAdapter<DiscordCommandLike, DiscordTextResponse> {
  readonly kind = "discord" as const;

  normalizeCommand(command: DiscordCommandLike): NormalizedConnectorCommand {
    const text = command.text ?? command.args?.join(" ") ?? "";
    const rawArgs = command.args ?? text.split(/\s+/).filter(Boolean);
    const commandName = command.commandName.toLowerCase();
    const [normalizedCommand = "help", ...normalizedArgs] =
      commandName === "cinnamon" ? rawArgs : [commandName, ...rawArgs];

    return {
      connector: this.kind,
      command: normalizedCommand.toLowerCase(),
      text,
      args: normalizedArgs,
      user: {
        id: command.userId,
        displayName: command.userName
      },
      location: {
        workspaceId: command.guildId,
        channelId: command.channelId
      },
      raw: command.raw ?? command
    };
  }

  renderTextMessage(message: ConnectorTextMessage): DiscordTextResponse {
    return {
      content: message.text,
      ephemeral: message.visibility !== "channel"
    };
  }
}
