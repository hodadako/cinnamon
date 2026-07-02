import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SqlMigration } from "./migrations";
import { coreMigrations } from "./migrations";

interface BetterSqliteStatement {
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface BetterSqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): BetterSqliteStatement;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
  close(): void;
}

type BetterSqliteFactory = new (path: string) => BetterSqliteDatabase;

export interface OpenDatabaseOptions {
  migrations?: SqlMigration[];
}

export interface OpenedCinnamonDatabase {
  path: string;
  database: BetterSqliteDatabase;
  appliedMigrations: string[];
  close(): void;
}

export function openCinnamonDatabase(path: string, options: OpenDatabaseOptions = {}): OpenedCinnamonDatabase {
  mkdirSync(dirname(path), { recursive: true });

  const Database = loadBetterSqlite3();
  const database = new Database(path);
  const migrations = options.migrations ?? coreMigrations;
  const appliedMigrations = runMigrations(database, migrations);

  return {
    path,
    database,
    appliedMigrations,
    close: () => database.close()
  };
}

export function runMigrations(database: BetterSqliteDatabase, migrations: SqlMigration[]): string[] {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database.prepare("SELECT id FROM schema_migrations").all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((row) => row.id));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    const apply = database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration.id, new Date().toISOString());
    });

    apply();
    newlyApplied.push(migration.id);
  }

  return newlyApplied;
}

function loadBetterSqlite3(): BetterSqliteFactory {
  return require("better-sqlite3") as BetterSqliteFactory;
}
