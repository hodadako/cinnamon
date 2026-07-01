# Cinnamon

Cinnamon은 개인용/내부용 Slack-first AI agent bot입니다. Slack 안에서 GitHub PR 알림, PR 요약/리뷰, 개발 작업, 장애 대응, Terraform/AWS 작업 계획을 자연어로 요청하고, 필요한 write 작업은 Slack에서 명시적으로 승인한 뒤 실행하는 것을 목표로 합니다.

현재 제품 방향과 MVP 구현 범위는 다음 문서를 기준으로 합니다.

- [PRD](docs/prd-ai-agent-connector-bot.md)
- [MVP Implementation Spec](docs/mvp-implementation-spec.md)
- [Semantic Commit Message Guide](docs/semantic-commit-message.md)

## 핵심 방향

- 첫 채널은 Slack입니다. Discord 및 기타 커넥터는 후속 확장 대상입니다.
- GitHub는 bot 계정과 `gh` CLI로 시작합니다.
- PR 알림은 Slack GitHub App처럼 repo + feature 구독 모델을 따릅니다.
- 모든 write 작업은 Slack에서 사용자 `yes` 승인을 받은 뒤 실행합니다.
- 최초 admin은 setup CLI가 생성한 1회성 bootstrap code를 Slack에서 입력해 등록합니다.
- 설정은 setup CLI가 생성한 local env와 Slack 자연어 설정을 우선합니다.
- 팀 메모리는 repo 루트의 `memory.md`에 저장하고, 실제 파일은 gitignore합니다.
- 상태 저장은 SQLite와 `better-sqlite3`를 사용하고, audit/operation log는 JSONL로 남깁니다.
- Slack은 Bolt와 Socket Mode로 구현합니다.
- GitHub webhook은 일반 HTTP endpoint로 받고, 필요하면 Cloudflare Tunnel로 노출합니다.
- AI runtime은 adapter interface 뒤에 두며 Codex를 첫 구현으로 둡니다.

## MVP 성공 기준

첫 end-to-end 목표는 Slack에서 다음 흐름이 동작하는 것입니다.

1. setup CLI가 local env, bootstrap code, `.cinnamon/logs`, SQLite DB, `memory.md`를 생성합니다.
2. Slack에서 `/cinnamon bootstrap <code>`로 최초 admin을 등록합니다.
3. `/cinnamon subscribe owner/repo pulls`로 repo PR 알림을 구독합니다.
4. GitHub PR webhook 이벤트가 Slack parent card와 thread update를 생성합니다.
5. `/cinnamon pr summary <url>`이 GitHub PR 데이터와 `memory.md`를 사용해 요약을 반환합니다.
6. 모든 단계가 trace id와 함께 JSONL 로그로 남습니다.

## Repository Notes

- `AGENTS.md`는 이 repo에서 작업할 때 따라야 할 에이전트 지침입니다.
- `memory.example.md`는 팀 메모리 템플릿입니다.
- `memory.md`는 실제 팀 메모리 파일이며 gitignore됩니다.
- `.serena/`는 로컬 도구 상태로 취급하며 gitignore됩니다.

## English

Cinnamon is a personal/internal Slack-first AI agent bot. It is designed to let a team ask for GitHub PR notifications, PR summaries/reviews, development work, incident response, and Terraform/AWS planning directly from Slack.

The MVP starts with Slack, a GitHub bot account, `gh` CLI integration, repo + feature subscriptions, SQLite state, JSONL logs, and explicit Slack `yes` approval before any write action. Codex is the first AI runtime behind an adapter interface, with room for other runtimes later.

See the PRD and MVP implementation spec under `docs/` for the current source of truth.

## License

MIT. See [LICENSE](LICENSE).
