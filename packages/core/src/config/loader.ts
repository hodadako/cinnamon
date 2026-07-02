import type { CinnamonConfig, CinnamonEnvironment, ConfigIssue } from "./types";

export function loadCinnamonConfig(source: Record<string, string | undefined>): CinnamonConfig {
  const env = readEnvironment(source.CINNAMON_ENV);
  const dataDir = source.CINNAMON_DATA_DIR ?? ".cinnamon";
  const memoryPath = source.CINNAMON_MEMORY_PATH ?? "memory.md";
  const logDir = source.CINNAMON_LOG_DIR ?? `${dataDir}/logs`;
  const dbPath = source.CINNAMON_DB_PATH ?? `${dataDir}/cinnamon.db`;
  const httpPort = readNumber(source.CINNAMON_HTTP_PORT, 3000);

  return {
    env,
    dataDir,
    memoryPath,
    logDir,
    dbPath,
    httpPort,
    slack: {
      botToken: emptyToUndefined(source.SLACK_BOT_TOKEN),
      signingSecret: emptyToUndefined(source.SLACK_SIGNING_SECRET),
      appToken: emptyToUndefined(source.SLACK_APP_TOKEN),
      workspaceAllowlist: readList(source.SLACK_WORKSPACE_ALLOWLIST),
      channelAllowlist: readList(source.SLACK_CHANNEL_ALLOWLIST),
      userAllowlist: readList(source.SLACK_USER_ALLOWLIST)
    },
    discord: {
      botToken: emptyToUndefined(source.DISCORD_BOT_TOKEN),
      clientId: emptyToUndefined(source.DISCORD_CLIENT_ID),
      guildAllowlist: readList(source.DISCORD_GUILD_ALLOWLIST),
      channelAllowlist: readList(source.DISCORD_CHANNEL_ALLOWLIST),
      userAllowlist: readList(source.DISCORD_USER_ALLOWLIST)
    },
    github: {
      botUsername: emptyToUndefined(source.GITHUB_BOT_USERNAME),
      token: emptyToUndefined(source.GITHUB_TOKEN),
      webhookSecret: emptyToUndefined(source.GITHUB_WEBHOOK_SECRET),
      repoAllowlist: readList(source.GITHUB_REPO_ALLOWLIST)
    },
    auth: {
      bootstrapCodeHash: emptyToUndefined(source.CINNAMON_BOOTSTRAP_CODE_HASH),
      adminUserIds: readList(source.CINNAMON_ADMIN_USER_IDS),
      adminUserGroupIds: readList(source.CINNAMON_ADMIN_USER_GROUP_IDS),
      writeUserIds: readList(source.CINNAMON_WRITE_USER_IDS),
      writeUserGroupIds: readList(source.CINNAMON_WRITE_USER_GROUP_IDS)
    }
  };
}

export function getConfigIssues(config: CinnamonConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (!config.slack.botToken) {
    issues.push({ key: "SLACK_BOT_TOKEN", message: "Slack bot token is required before starting the bot." });
  }

  if (!config.slack.appToken) {
    issues.push({ key: "SLACK_APP_TOKEN", message: "Slack app token is required for Socket Mode." });
  }

  if (!config.github.webhookSecret) {
    issues.push({ key: "GITHUB_WEBHOOK_SECRET", message: "GitHub webhook secret is required before enabling webhooks." });
  }

  return issues;
}

export function summarizeConfig(config: CinnamonConfig): Record<string, string> {
  return {
    env: config.env,
    dataDir: config.dataDir,
    memoryPath: config.memoryPath,
    logDir: config.logDir,
    dbPath: config.dbPath,
    httpPort: String(config.httpPort),
    slackWorkspaceAllowlist: String(config.slack.workspaceAllowlist.length),
    discordGuildAllowlist: String(config.discord.guildAllowlist.length),
    githubRepoAllowlist: String(config.github.repoAllowlist.length)
  };
}

function readEnvironment(value: string | undefined): CinnamonEnvironment {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function readList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
