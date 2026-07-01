#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseEnvFile, serializeEnvFile } from "@cinnamon/core";

export interface SetupOptions {
  envPath: string;
  dataDir: string;
  memoryPath: string;
  force: boolean;
}

export interface SetupResult {
  envPath: string;
  bootstrapCode: string;
  memoryPath: string;
  logDir: string;
  dbPath: string;
}

const defaultOptions: SetupOptions = {
  envPath: ".env",
  dataDir: ".cinnamon",
  memoryPath: "memory.md",
  force: false
};

export async function runSetup(options: Partial<SetupOptions> = {}): Promise<SetupResult> {
  const resolved = { ...defaultOptions, ...options };
  const bootstrapCode = generateBootstrapCode();
  const existingEnv = await readExistingEnv(resolved.envPath);
  const values = {
    ...existingEnv,
    ...buildDefaultEnv(resolved, bootstrapCode)
  };

  await mkdir(dirname(resolved.envPath), { recursive: true });
  await mkdir(values.CINNAMON_LOG_DIR, { recursive: true });
  await mkdir(dirname(values.CINNAMON_DB_PATH), { recursive: true });
  await ensureMemoryFile(resolved.memoryPath);
  await writeFile(resolved.envPath, serializeEnvFile(values), { encoding: "utf8", flag: resolved.force ? "w" : "wx" });

  return {
    envPath: resolved.envPath,
    bootstrapCode,
    memoryPath: resolved.memoryPath,
    logDir: values.CINNAMON_LOG_DIR,
    dbPath: values.CINNAMON_DB_PATH
  };
}

export function buildDefaultEnv(options: SetupOptions, bootstrapCode: string): Record<string, string> {
  const bootstrapCodeHash = createHash("sha256").update(bootstrapCode).digest("hex");

  return {
    CINNAMON_ENV: "development",
    CINNAMON_DATA_DIR: options.dataDir,
    CINNAMON_MEMORY_PATH: options.memoryPath,
    CINNAMON_LOG_DIR: `${options.dataDir}/logs`,
    CINNAMON_DB_PATH: `${options.dataDir}/cinnamon.db`,
    CINNAMON_BOOTSTRAP_CODE_HASH: bootstrapCodeHash,
    SLACK_BOT_TOKEN: "",
    SLACK_SIGNING_SECRET: "",
    SLACK_APP_TOKEN: "",
    SLACK_WORKSPACE_ALLOWLIST: "",
    SLACK_CHANNEL_ALLOWLIST: "",
    SLACK_USER_ALLOWLIST: "",
    GITHUB_BOT_USERNAME: "",
    GITHUB_TOKEN: "",
    GITHUB_WEBHOOK_SECRET: "",
    GITHUB_REPO_ALLOWLIST: ""
  };
}

export function generateBootstrapCode(): string {
  return randomBytes(9).toString("base64url");
}

async function readExistingEnv(path: string): Promise<Record<string, string>> {
  try {
    return parseEnvFile(await readFile(path, "utf8"));
  } catch (error) {
    if (isNotFoundError(error)) {
      return {};
    }

    throw error;
  }
}

async function ensureMemoryFile(path: string): Promise<void> {
  try {
    await writeFile(path, defaultMemoryContent(), { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
}

function defaultMemoryContent(): string {
  return `# Cinnamon Team Memory

## Preferences

## Code Review

## Repositories

## Incident Response

## Terraform / AWS
`;
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const force = args.has("--force");

  if (args.has("--help")) {
    output.write("Usage: cinnamon-setup [--force]\n");
    return;
  }

  if (input.isTTY) {
    const rl = createInterface({ input, output });
    const answer = await rl.question("Create Cinnamon local env at .env? [Y/n] ");
    rl.close();

    if (answer.trim().toLowerCase() === "n") {
      output.write("Setup cancelled.\n");
      return;
    }
  }

  const result = await runSetup({ force });

  output.write(`Created ${result.envPath}\n`);
  output.write(`Bootstrap code: ${result.bootstrapCode}\n`);
  output.write("Enter this once in Slack with /cinnamon bootstrap <code>.\n");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
