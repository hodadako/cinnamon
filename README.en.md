# Cinnamon

Cinnamon is a personal/internal Slack-first AI agent bot.

The goal is to let a team handle GitHub PR notifications, PR summaries and reviews, development tasks, and incident response from Slack. Any write action must be explicitly approved from Slack with `yes` before it runs.

## Current MVP

The first milestone is an end-to-end Slack + GitHub PR workflow.

1. A setup CLI prepares local env, a bootstrap code, `.cinnamon/logs`, a SQLite DB, and `memory.md`.
2. The first admin registers from Slack with `/cinnamon bootstrap <code>`.
3. A repo is subscribed with `/cinnamon subscribe owner/repo pulls`.
4. GitHub PR webhook events create Slack parent cards and thread updates.
5. `/cinnamon pr summary <url>` summarizes a PR using GitHub data and `memory.md`.
6. Every step is written to JSONL logs with trace IDs.

## Product Decisions

- Slack is the first connector. Discord and other connectors come later.
- GitHub starts with a bot account and the `gh` CLI.
- PR notifications follow a repo + feature subscription model similar to the GitHub Slack App.
- Queryable state uses SQLite and `better-sqlite3`.
- Audit and operational logs are stored as server-side JSONL.
- Slack uses Bolt and Socket Mode.
- GitHub webhooks are received through a normal HTTP endpoint and can be exposed through Cloudflare Tunnel when needed.
- AI runtimes sit behind an adapter interface. Codex is the first implementation.
- Team memory lives in the repo-root `memory.md`. The real file is ignored by git; `memory.example.md` is tracked as the template.

## Docs

- [PRD](docs/prd-ai-agent-connector-bot.md)
- [MVP Implementation Spec](docs/mvp-implementation-spec.md)
- [Semantic Commit Message Guide](docs/semantic-commit-message.md)
- [Agent Instructions](AGENTS.md)

## Development

This repo uses a pnpm workspace. Implementation should follow the MVP ticket order and land in small commits.

```bash
pnpm install
pnpm build
```

## License

MIT. See [LICENSE](LICENSE).
