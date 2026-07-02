export interface SqlMigration {
  id: string;
  sql: string;
}

export const coreMigrations: SqlMigration[] = [
  {
    id: "0001_initial_state",
    sql: `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_grants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'user_group')),
        subject_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'write')),
        created_at TEXT NOT NULL,
        UNIQUE(subject_type, subject_id, role)
      );
    `
  },
  {
    id: "0002_webhook_idempotency",
    sql: `
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        external_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    id: "0003_repo_subscriptions",
    sql: `
      CREATE TABLE IF NOT EXISTS repo_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        repo_owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        features TEXT NOT NULL,
        created_by_slack_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(channel_id, repo_owner, repo_name)
      );
    `
  },
  {
    id: "0004_thread_mappings",
    sql: `
      CREATE TABLE IF NOT EXISTS thread_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        repo_owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        github_type TEXT NOT NULL,
        github_number INTEGER NOT NULL,
        thread_ts TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(channel_id, repo_owner, repo_name, github_type, github_number)
      );
    `
  }
];
