import {
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import { handleCinnamonCommand } from "@cinnamon/bot-runtime";
import { DiscordConnectorAdapter } from "@cinnamon/discord-connector";
import { createJsonlLogger, loadCinnamonConfig, openCinnamonDatabase, summarizeConfig } from "@cinnamon/core";

async function main(): Promise<void> {
  const config = loadCinnamonConfig(process.env);

  console.log("Cinnamon Discord bot starting with config:");
  console.log(JSON.stringify(summarizeConfig(config), null, 2));

  if (!config.discord.botToken || !config.discord.clientId) {
    console.log("Discord bot did not start because DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is missing.");
    return;
  }

  const logger = createJsonlLogger(config.logDir);
  const openedDatabase = openCinnamonDatabase(config.dbPath);
  const connector = new DiscordConnectorAdapter();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    console.log(`Discord bot logged in as ${client.user?.tag ?? "unknown"}.`);
    await logger.log({
      level: "info",
      component: "discord-bot",
      event: "bot.ready",
      data: { user: client.user?.tag }
    });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "cinnamon") {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const normalizedCommand = connector.normalizeCommand(toDiscordCommandLike(interaction));
    const response = await handleCinnamonCommand({
      config,
      database: openedDatabase.database,
      command: normalizedCommand
    });

    await logger.log({
      level: "info",
      component: "discord-bot",
      event: "command.received",
      data: {
        connector: normalizedCommand.connector,
        command: normalizedCommand.command,
        args: normalizedCommand.args,
        channelId: normalizedCommand.location.channelId,
        userId: normalizedCommand.user.id
      }
    });

    await interaction.editReply(connector.renderTextMessage({
      visibility: "ephemeral",
      text: response
    }).content);
  });

  await registerDiscordCommands(config.discord.botToken, config.discord.clientId);
  await client.login(config.discord.botToken);
}

function toDiscordCommandLike(interaction: ChatInputCommandInteraction) {
  return {
    commandName: interaction.commandName,
    text: interaction.options.getString("text") ?? "",
    userId: interaction.user.id,
    userName: interaction.user.username,
    guildId: interaction.guildId ?? undefined,
    channelId: interaction.channelId,
    raw: interaction
  };
}

async function registerDiscordCommands(token: string, clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  const command = new SlashCommandBuilder()
    .setName("cinnamon")
    .setDescription("Run a Cinnamon command")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Command text, for example: pr summary <url>")
        .setRequired(false)
    );

  await rest.put(Routes.applicationCommands(clientId), {
    body: [command.toJSON()]
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
