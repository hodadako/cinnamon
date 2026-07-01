# Repository Instructions

## Project Direction

Cinnamon is a personal/internal Slack-first AI agent bot. The product direction is documented in:

- `docs/prd-ai-agent-connector-bot.md`
- `docs/mvp-implementation-spec.md`

Use those documents as the source of truth for product scope and implementation order.

Before making changes, always inspect the relevant files under `docs/`. Treat `docs/` as required project context, not optional background reading.

At minimum, check:

- `docs/prd-ai-agent-connector-bot.md` for product requirements
- `docs/mvp-implementation-spec.md` for MVP implementation scope
- `docs/semantic-commit-message.md` before writing commit messages

## Current MVP

Focus on the first end-to-end Slack + GitHub milestone:

1. setup CLI creates local env, bootstrap code, `.cinnamon/logs`, SQLite DB, and `memory.md`
2. Slack bootstrap registers the first admin
3. Slack repo subscription uses a GitHub-Slack-App-like feature model
4. GitHub webhook events create Slack parent cards and thread updates
5. `/cinnamon pr summary <url>` summarizes a PR using GitHub data and `memory.md`
6. JSONL logs include trace ids for each step

## Product Decisions

- Slack is the first connector. Discord is a later connector.
- GitHub starts with a bot account and `gh` CLI.
- PR notifications follow repo + feature subscriptions similar to the GitHub Slack App.
- All write actions require Slack `yes` approval before execution.
- First admin registration uses a one-time setup CLI bootstrap code entered in Slack.
- Admin/write permissions support Slack user ids and user groups.
- Local env files are allowed for both local and production servers.
- Env keys are allowed to evolve during development.
- Team memory is stored at repo root `memory.md`, Hermes-style.
- MVP implementation language is TypeScript.
- Slack implementation uses Slack Bolt for the MVP.
- MVP queryable state uses SQLite; JSONL is for append-only logs.
- SQLite access uses `better-sqlite3` with a simple SQL migration runner.
- Slack uses Socket Mode for MVP event/command handling.
- GitHub webhooks use a normal HTTP endpoint exposed through Cloudflare Tunnel when needed.
- Supabase/Postgres is a later migration target, not the MVP default.
- Internal logs are JSONL and stored server-side first.
- AI runtimes use an AI agent adapter interface; Codex is the first implementation and Claude starts as a skeleton.
- GitHub PR review/comment posts include `Posted by Cinnamon bot after Slack approval from <@SLACK_USER_ID>.`

## Engineering Guidelines

- Prefer TypeScript and existing pnpm workspace patterns.
- Use Slack Bolt for Slack commands, events, actions, and Socket Mode where appropriate.
- Use SQLite for subscriptions, thread mappings, approvals, idempotency, and durable settings.
- Store GitHub `X-GitHub-Delivery` values as idempotency keys.
- Use a single `/cinnamon` slash command with subcommands.
- Keep job execution behind a queue interface; MVP implementation can be in-process.
- Keep storage code reasonably portable to Postgres/Supabase; avoid unnecessary SQLite-specific assumptions.
- Keep AI runtime calls behind the AI agent adapter interface.
- Keep implementation scoped to the MVP milestone before broadening architecture.
- Keep user-facing Slack commands predictable and close to the implementation spec.
- Log every request, setting change, approval, execution, and failure.
- Do not store secrets in `memory.md` or logs.
- Keep destructive or write actions behind the approval flow.

## Useful Commands

Use existing package scripts when available. If scripts are missing, add narrow scripts with the relevant implementation work.

Prefer:

- `pnpm install`
- `pnpm --filter <package> <script>`
- `pnpm test`
- `pnpm lint`
