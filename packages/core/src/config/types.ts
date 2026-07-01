export type CinnamonEnvironment = "development" | "test" | "production";

export interface CinnamonConfig {
  env: CinnamonEnvironment;
  dataDir: string;
  memoryPath: string;
  logDir: string;
  dbPath: string;
  slack: {
    botToken?: string;
    signingSecret?: string;
    appToken?: string;
    workspaceAllowlist: string[];
    channelAllowlist: string[];
    userAllowlist: string[];
  };
  github: {
    botUsername?: string;
    token?: string;
    webhookSecret?: string;
    repoAllowlist: string[];
  };
  auth: {
    bootstrapCodeHash?: string;
    adminUserIds: string[];
    adminUserGroupIds: string[];
    writeUserIds: string[];
    writeUserGroupIds: string[];
  };
}

export interface ConfigIssue {
  key: string;
  message: string;
}
