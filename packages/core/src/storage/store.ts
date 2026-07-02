import type { BetterSqliteDatabase } from "./database";

export type GrantRole = "admin" | "write";
export type GrantSubjectType = "user" | "user_group";

export interface RepoSubscriptionInput {
  channelId: string;
  repoOwner: string;
  repoName: string;
  features: string[];
  createdBySlackUserId: string;
}

export interface IdempotencyInput {
  key: string;
  source: string;
  externalId?: string;
  status: string;
}

export function getSetting(database: BetterSqliteDatabase, key: string): string | undefined {
  const row = database.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;

  return row?.value;
}

export function setSetting(database: BetterSqliteDatabase, key: string, value: string): void {
  database
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value, new Date().toISOString());
}

export function grantRole(
  database: BetterSqliteDatabase,
  subjectType: GrantSubjectType,
  subjectId: string,
  role: GrantRole
): void {
  database
    .prepare(
      `INSERT OR IGNORE INTO admin_grants (subject_type, subject_id, role, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(subjectType, subjectId, role, new Date().toISOString());
}

export function hasRole(database: BetterSqliteDatabase, subjectType: GrantSubjectType, subjectId: string, role: GrantRole): boolean {
  const row = database
    .prepare(
      `SELECT 1 AS found
       FROM admin_grants
       WHERE subject_type = ? AND subject_id = ? AND role = ?
       LIMIT 1`
    )
    .get(subjectType, subjectId, role) as { found: number } | undefined;

  return row !== undefined;
}

export function countRoleGrants(database: BetterSqliteDatabase, role: GrantRole): number {
  const row = database.prepare("SELECT COUNT(*) AS count FROM admin_grants WHERE role = ?").get(role) as { count: number };
  return row.count;
}

export function markBootstrapConsumed(database: BetterSqliteDatabase, slackUserId: string): void {
  setSetting(
    database,
    "bootstrap.consumed",
    JSON.stringify({
      slackUserId,
      consumedAt: new Date().toISOString()
    })
  );
}

export function isBootstrapConsumed(database: BetterSqliteDatabase): boolean {
  return getSetting(database, "bootstrap.consumed") !== undefined;
}

export function upsertRepoSubscription(database: BetterSqliteDatabase, input: RepoSubscriptionInput): void {
  const now = new Date().toISOString();
  const features = JSON.stringify(input.features);

  database
    .prepare(
      `INSERT INTO repo_subscriptions (
        channel_id,
        repo_owner,
        repo_name,
        features,
        created_by_slack_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id, repo_owner, repo_name) DO UPDATE SET
        features = excluded.features,
        updated_at = excluded.updated_at`
    )
    .run(input.channelId, input.repoOwner, input.repoName, features, input.createdBySlackUserId, now, now);
}

export function recordIdempotencyKey(database: BetterSqliteDatabase, input: IdempotencyInput): boolean {
  const now = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT OR IGNORE INTO idempotency_keys (key, source, external_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.key, input.source, input.externalId, input.status, now, now) as { changes?: number };

  return result.changes === 1;
}
