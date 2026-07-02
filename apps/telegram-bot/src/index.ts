import { handleCinnamonCommand } from "@cinnamon/bot-runtime";
import { createJsonlLogger, loadCinnamonConfig, openCinnamonDatabase, summarizeConfig } from "@cinnamon/core";
import { TelegramConnectorAdapter } from "@cinnamon/telegram-connector";

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  from?: TelegramUser;
  chat: TelegramChat;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

async function main(): Promise<void> {
  const config = loadCinnamonConfig(process.env);

  console.log("Cinnamon Telegram bot starting with config:");
  console.log(JSON.stringify(summarizeConfig(config), null, 2));

  if (!config.telegram.botToken) {
    console.log("Telegram bot did not start because TELEGRAM_BOT_TOKEN is missing.");
    return;
  }

  const logger = createJsonlLogger(config.logDir);
  const openedDatabase = openCinnamonDatabase(config.dbPath);
  const connector = new TelegramConnectorAdapter();
  const client = new TelegramBotApiClient(config.telegram.botToken);

  let offset = 0;
  console.log("Telegram bot polling started.");

  while (true) {
    const updates = await client.getUpdates(offset);

    for (const update of updates) {
      offset = update.update_id + 1;

      const message = update.message;
      if (!message?.text || !message.text.startsWith("/cinnamon")) {
        continue;
      }

      const normalizedCommand = connector.normalizeCommand({
        text: message.text,
        userId: String(message.from?.id ?? "unknown"),
        userName: message.from?.username ?? message.from?.first_name,
        chatId: String(message.chat.id),
        messageId: message.message_id,
        raw: update
      });

      const response = await handleCinnamonCommand({
        config,
        database: openedDatabase.database,
        command: normalizedCommand
      });

      await logger.log({
        level: "info",
        component: "telegram-bot",
        event: "command.received",
        data: {
          connector: normalizedCommand.connector,
          command: normalizedCommand.command,
          args: normalizedCommand.args,
          chatId: normalizedCommand.location.channelId,
          userId: normalizedCommand.user.id
        }
      });

      await client.sendMessage(String(message.chat.id), response, message.message_id);
    }
  }
}

class TelegramBotApiClient {
  constructor(private readonly token: string) {}

  async getUpdates(offset: number): Promise<TelegramUpdate[]> {
    const url = new URL(this.apiUrl("getUpdates"));
    url.searchParams.set("timeout", "30");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("allowed_updates", JSON.stringify(["message"]));

    const response = await fetch(url);
    const payload = await parseTelegramResponse<TelegramUpdate[]>(response);
    return payload.result;
  }

  async sendMessage(chatId: string, text: string, replyToMessageId?: number): Promise<void> {
    const response = await fetch(this.apiUrl("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_to_message_id: replyToMessageId
      })
    });

    await parseTelegramResponse<unknown>(response);
  }

  private apiUrl(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }
}

async function parseTelegramResponse<T>(response: Response): Promise<TelegramApiResponse<T>> {
  const payload = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram API request failed with ${response.status}`);
  }

  return payload;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
