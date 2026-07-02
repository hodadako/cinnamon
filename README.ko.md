# Cinnamon

Cinnamon은 개인용/내부용 Slack-first AI agent bot입니다.

Slack에서 GitHub PR 알림을 받고, PR 요약과 리뷰를 요청하고, 개발 작업이나 장애 대응을 자연어로 맡기는 흐름을 목표로 합니다. 실제 write 작업은 Slack에서 사용자가 명시적으로 `yes` 승인한 뒤에만 실행합니다.

## 지금 만드는 것

첫 번째 목표는 Slack 안에서 GitHub PR 흐름을 끝까지 처리하는 MVP입니다.

1. setup CLI가 local env, bootstrap code, `.cinnamon/logs`, SQLite DB, `memory.md`를 준비합니다.
2. Slack에서 `/cinnamon bootstrap <code>`로 최초 admin을 등록합니다.
3. `/cinnamon subscribe owner/repo pulls`로 repo PR 알림을 구독합니다.
4. GitHub PR webhook 이벤트가 Slack parent card와 thread update를 만듭니다.
5. `/cinnamon pr summary <url>`이 GitHub PR 데이터와 `memory.md`를 사용해 요약을 반환합니다.
6. 모든 단계는 trace id와 함께 JSONL 로그로 남습니다.

## 주요 결정

- Slack이 첫 성공 경로입니다. Discord는 같은 connector interface 위의 추가 런타임으로 붙입니다.
- GitHub는 bot 계정과 `gh` CLI로 시작합니다.
- PR 알림은 Slack GitHub App처럼 repo + feature 구독 모델을 따릅니다.
- 상태 저장은 SQLite와 `better-sqlite3`를 기본으로 합니다.
- 감사/운영 로그는 서버 내부 JSONL 파일로 남깁니다.
- Slack은 Bolt와 Socket Mode로 구현합니다.
- GitHub webhook은 일반 HTTP endpoint로 받고, 필요하면 Cloudflare Tunnel로 노출합니다.
- AI runtime은 adapter interface 뒤에 두고, Codex를 첫 구현으로 둡니다.
- 팀 메모리는 repo 루트의 `memory.md`에 저장합니다. 실제 파일은 gitignore되고, `memory.example.md`만 예시로 추적합니다.

## 문서

- [PRD](docs/prd-ai-agent-connector-bot.md)
- [MVP 구현 스펙](docs/mvp-implementation-spec.md)
- [커밋 메시지 규칙](docs/semantic-commit-message.md)
- [에이전트 작업 지침](AGENTS.md)

## 개발 메모

이 repo는 pnpm workspace를 사용합니다. 구현은 MVP 티켓 순서에 맞춰 작은 단위로 진행합니다.

```bash
pnpm install
pnpm build
```

## 라이선스

MIT. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
