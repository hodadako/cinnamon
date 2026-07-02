import type { ConnectorAdapter, ConnectorTextMessage, NormalizedConnectorCommand } from "@cinnamon/connectors";

export interface TelegramCommandLike {
  text: string;
  userId: string;
  userName?: string;
  chatId: string;
  messageId?: number;
  raw?: unknown;
}

export interface TelegramSendMessagePayload {
  chat_id: string;
  text: string;
  reply_to_message_id?: number;
  disable_notification?: boolean;
}

export class TelegramConnectorAdapter implements ConnectorAdapter<TelegramCommandLike, TelegramSendMessagePayload> {
  readonly kind = "telegram" as const;

  normalizeCommand(command: TelegramCommandLike): NormalizedConnectorCommand {
    const cleanedText = stripCommandPrefix(command.text.trim());
    const [normalizedCommand = "help", ...args] = cleanedText.split(/\s+/).filter(Boolean);

    return {
      connector: this.kind,
      command: normalizedCommand.toLowerCase(),
      text: cleanedText,
      args,
      user: {
        id: command.userId,
        displayName: command.userName
      },
      location: {
        channelId: command.chatId,
        threadId: command.messageId === undefined ? undefined : String(command.messageId)
      },
      raw: command.raw ?? command
    };
  }

  renderTextMessage(message: ConnectorTextMessage): TelegramSendMessagePayload {
    return {
      chat_id: "",
      text: message.text,
      reply_to_message_id: message.threadId ? Number(message.threadId) : undefined,
      disable_notification: message.visibility === "ephemeral"
    };
  }
}

function stripCommandPrefix(text: string): string {
  if (text.startsWith("/cinnamon")) {
    return text.replace(/^\/cinnamon(?:@\w+)?\s*/u, "");
  }

  return text;
}
