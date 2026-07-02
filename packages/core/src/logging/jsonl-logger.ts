import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface JsonLogEntry {
  traceId: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  event: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface JsonlLogger {
  log(entry: Omit<JsonLogEntry, "timestamp" | "traceId"> & { traceId?: string }): Promise<JsonLogEntry>;
}

export function createJsonlLogger(logDir: string, filename = "cinnamon.jsonl"): JsonlLogger {
  const path = join(logDir, filename);

  return {
    async log(entry) {
      const fullEntry: JsonLogEntry = {
        traceId: entry.traceId ?? randomUUID(),
        timestamp: new Date().toISOString(),
        level: entry.level,
        component: entry.component,
        event: entry.event,
        message: entry.message,
        data: entry.data
      };

      await appendJsonLog(path, fullEntry);
      return fullEntry;
    }
  };
}

export async function appendJsonLog(path: string, entry: JsonLogEntry): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
