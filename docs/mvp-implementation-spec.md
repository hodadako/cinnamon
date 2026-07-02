# Cinnamon MVP Implementation Spec

## 1. 목적

Cinnamon MVP는 개인용/내부용 Slack 봇으로 시작한다. 첫 성공 기준은 Slack에서 GitHub repo를 구독하고, GitHub Slack App과 유사한 PR/리뷰/워크플로 알림을 받고, 사용자가 Slack에서 자연어로 PR 요약/리뷰를 요청할 수 있는 end-to-end 흐름을 완성하는 것이다.

이 문서는 PRD의 방향을 실제 구현 가능한 범위로 좁힌다.

## 2. MVP 원칙

1. Slack-first로 구현한다.
2. GitHub는 bot 계정과 `gh` CLI를 우선 사용한다.
3. GitHub 알림은 Slack GitHub App과 유사한 repo + feature 구독 모델을 따른다.
4. 모든 write 작업은 Slack에서 사용자 `yes` 승인을 받은 뒤 실행한다.
5. 최초 admin은 setup CLI가 만든 1회성 bootstrap code로 Slack에서 등록한다.
6. 설정은 setup CLI가 생성한 로컬 env와 Slack 자연어 설정을 우선한다.
7. 팀 메모리는 repo 루트의 `memory.md`를 기본값으로 한다.
8. 모든 요청, 설정 변경, 승인, 실행, 실패는 JSONL 로그로 남긴다.
9. 구현 언어는 TypeScript로 유지한다.
10. 상태 저장은 SQLite를 기본 DB로 사용한다.

## 3. MVP 포함 범위

### 3.1 Slack

1. Slack App 구동
2. slash command 또는 mention 기반 명령 처리
3. thread 기반 진행 상황 업데이트
4. `yes` 승인 처리
5. 최초 admin bootstrap code 등록
6. admin/write 권한 관리

### 3.2 GitHub

1. bot GitHub 계정 인증
2. `gh` CLI 실행 가능 여부 확인
3. GitHub webhook 수신
4. repo 구독 저장
5. feature 단위 알림 설정
6. PR parent card 및 thread 업데이트
7. PR 요약
8. PR 리뷰 초안 생성

### 3.3 설정

1. setup CLI
2. 로컬 env 생성
3. production 로컬 env 허용
4. env 스키마는 개발 중 확장
5. Slack 자연어 설정

### 3.4 메모리와 로그

1. `memory.md` 읽기
2. `memory.md` 수정 요청 및 diff 로그
3. JSONL 내부 로그
4. Slack에서 내부 로그 조회

## 4. MVP 제외 범위

1. Discord connector
2. 웹 운영 콘솔
3. 외부 고객용 멀티테넌트 SaaS
4. 완전한 MCP/Skill 설치 마켓플레이스
5. Terraform/AWS write 자동화의 전체 구현
6. production 인프라 자동 apply
7. 복잡한 큐/분산 작업 시스템

Terraform/AWS, MCP/Skill은 인터페이스와 승인/로그 정책은 남겨두되, MVP 첫 milestone에서는 stub 또는 skeleton까지만 둔다.

## 5. 권장 레포 구조

현재 repo는 `apps/discord-bot`만 있으나 MVP는 Slack-first다. 다음 구조로 확장한다.

```text
apps/
  slack-bot/
    src/
      index.ts
      slack-app.ts
      routes.ts
      commands/
      handlers/
    package.json
packages/
  core/
    src/
      config/
      auth/
      approvals/
      subscriptions/
      logging/
      memory/
      jobs/
  github/
    src/
      gh-cli.ts
      webhook.ts
      subscriptions.ts
      notifications.ts
      pr-summary.ts
  agents/
    src/
      ai-agent-adapter.ts
      codex-adapter.ts
      claude-adapter.ts
  cli/
    src/
      setup.ts
      bootstrap-code.ts
memory.example.md
memory.md
docs/
```

초기 구현에서는 패키지를 과하게 쪼개지 않아도 된다. 다만 경계는 위 구조를 기준으로 둔다.

## 6. Technology Decisions

### 6.1 Language

Use TypeScript for the MVP.

Reasons:

1. The repository already uses a pnpm/TypeScript workspace.
2. Slack and GitHub SDK support is strong in Node.js/TypeScript.
3. Type definitions help keep Slack payloads, GitHub webhook events, subscriptions, approvals, and agent runtime contracts explicit.
4. The setup CLI, Slack bot, webhook server, and local tooling can share one runtime and package ecosystem.
5. Later connectors can reuse the same typed connector and event model.

### 6.2 Slack SDK

Use Slack Bolt with Socket Mode for the MVP.

Reasons:

1. Bolt covers slash commands, events, actions/buttons, middleware, and Socket Mode.
2. It keeps Slack-specific plumbing smaller than using the lower-level Slack SDK directly.
3. It works well with TypeScript and the MVP's command-heavy Slack workflow.
4. It leaves room to use lower-level Slack Web API calls where message rendering needs more control.
5. Socket Mode lets the internal/local server receive Slack events without exposing a public Slack events endpoint.

### 6.3 Database

Use SQLite with `better-sqlite3` as the MVP state database.

Why a DB is needed:

1. Repo subscriptions must survive process restarts.
2. GitHub webhook events need idempotency keys to avoid duplicate Slack notifications.
3. Slack thread mappings must be looked up quickly so later PR events reply in the right thread.
4. Approval requests need status, expiry, requester, approver, and audit metadata.
5. Admin/write permissions need durable storage after Slack bootstrap and admin changes.
6. Config changes from Slack need before/after state and auditability.
7. JSON files become fragile once concurrent webhooks, Slack commands, and approval callbacks can update state at the same time.

SQLite is enough because this is a personal/internal bot, runs as a single service initially, needs local persistence, and does not need an external DB server. JSONL remains the append-only audit/log format; SQLite stores queryable product state.

Supabase/Postgres is a later migration candidate, not the MVP default. Move to Supabase/Postgres when Cinnamon needs multi-server workers, multi-tenant external customers, a web operations console, remote DB backup/administration, row-level permissions, or higher webhook/event volume than a single local SQLite database should handle.

The storage layer should avoid unnecessary SQLite-specific assumptions. Keep table names, column names, timestamps, statuses, and indexes easy to migrate to Postgres/Supabase later. Avoid hiding important query fields inside JSON blobs when they are likely to be filtered or indexed.

Use a simple SQL migration runner for MVP. Migrations should run during setup CLI and app startup. Keep migrations in the repo as ordered SQL files.

### 6.4 Storage Split

1. SQLite: subscriptions, thread mappings, approvals, admin/write grants, idempotency keys, durable settings.
2. JSONL: append-only operational/audit logs.
3. `memory.md`: human-readable team memory.
4. local env: bootstrap config, secrets, allowlists, paths.

### 6.5 Deployment Connectivity

Use Cloudflare Tunnel for local development and internal production deployment when the server does not have a public HTTPS URL.

1. Slack events and commands use Slack Bolt Socket Mode.
2. GitHub webhooks use a normal HTTP endpoint.
3. Local development exposes the GitHub webhook endpoint through a temporary Cloudflare Tunnel URL.
4. Internal production can use a named persistent Cloudflare Tunnel URL.
5. Cloudflare Tunnel is a deployment option, not an application dependency. The app still exposes a normal `POST /webhooks/github` endpoint.

### 6.6 Commands

Use a single Slack slash command:

```text
/cinnamon
```

Subcommands are parsed by Cinnamon, for example `/cinnamon subscribe owner/repo pulls`.

### 6.7 Job Execution

Use an in-process job runner for MVP, but hide it behind a queue interface so it can be replaced later.

1. MVP implementation: in-process runner.
2. Persistence: SQLite job table when durable retry/state is needed.
3. Future replacement candidates: BullMQ/Redis, hosted queue, or workflow engine.
4. Job interface should cover enqueue, start, complete, fail, retry, and lookup by id.

### 6.8 AI Agent Runtime

Use an AI agent adapter interface for all headless agent runtimes.

MVP scope:

1. Implement the AI agent adapter interface.
2. Implement Codex as the first working adapter.
3. Add a Claude adapter skeleton so the interface is validated against a second runtime shape.
4. Route PR summary/review through the adapter boundary, even if early implementation uses a mock before Codex is wired.

The adapter should expose a stable contract for task input, allowed tools, memory snapshot, approval policy, progress events, and final result.

## 7. Setup CLI

### 7.1 명령

```bash
pnpm cinnamon setup
```

### 7.2 역할

1. 로컬 env 파일 생성
2. 필요한 최소 설정만 질문
3. 최초 admin bootstrap code 생성
4. secret 값 마스킹
5. Slack/GitHub 연결 테스트
6. `memory.md` 없으면 생성
7. 내부 로그 디렉터리 생성
8. SQLite DB 파일 생성 및 schema migration 실행

### 7.3 초기 질문 후보

1. Slack bot token
2. Slack signing secret
3. Slack app token
4. 허용 Slack workspace id
5. 기본 Slack channel id
6. GitHub bot username
7. GitHub token 또는 `gh auth status` 사용 여부
8. GitHub webhook secret
9. 기본 허용 repo 목록
10. `memory.md` 경로. MVP 기본값은 repo root의 `memory.md`
11. 내부 로그 디렉터리
12. SQLite DB 경로

### 7.4 생성 env 예시

env 키는 고정 스키마가 아니며 개발하면서 추가한다.

```bash
CINNAMON_ENV=development
CINNAMON_DATA_DIR=.cinnamon
CINNAMON_MEMORY_PATH=memory.md
CINNAMON_LOG_DIR=.cinnamon/logs
CINNAMON_DB_PATH=.cinnamon/cinnamon.db

SLACK_BOT_TOKEN=...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=...
SLACK_ALLOWED_WORKSPACE_IDS=T0123456789
SLACK_DEFAULT_CHANNEL_ID=C0123456789
SLACK_BOOTSTRAP_CODE_HASH=...
SLACK_BOOTSTRAP_CODE_EXPIRES_AT=2026-07-02T12:00:00.000Z
SLACK_ADMIN_USER_IDS=
SLACK_ADMIN_USER_GROUP_IDS=
SLACK_WRITE_USER_IDS=
SLACK_WRITE_USER_GROUP_IDS=

GITHUB_MODE=bot
GITHUB_BOT_USERNAME=cinnamon-bot
GITHUB_TOKEN=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_ALLOWED_REPOS=owner/repo
```

### 7.5 Bootstrap code

1. CLI는 랜덤 코드를 한 번만 출력한다.
2. env에는 원문 코드가 아니라 hash를 저장한다.
3. Slack에서 `/cinnamon bootstrap <code>`를 입력한 사용자를 최초 admin으로 등록한다.
4. 성공하면 bootstrap code hash를 폐기하거나 consumed 상태로 바꾼다.
5. bootstrap 전에는 `/cinnamon bootstrap` 외의 관리 명령을 막는다.

## 8. Slack 명령

### 8.1 Admin

```text
/cinnamon bootstrap <code>
/cinnamon admin add-user <slack-user-id>
/cinnamon admin remove-user <slack-user-id>
/cinnamon admin add-group <slack-user-group-id>
/cinnamon admin remove-group <slack-user-group-id>
/cinnamon write add-user <slack-user-id>
/cinnamon write add-group <slack-user-group-id>
```

### 8.2 Repo subscription

```text
/cinnamon subscribe owner/repo
/cinnamon subscribe owner/repo pulls reviews comments
/cinnamon subscribe owner/repo workflows
/cinnamon unsubscribe owner/repo reviews comments
/cinnamon subscribe list
/cinnamon subscribe owner/repo +label:"priority:HIGH"
/cinnamon subscribe owner/repo commits:main
/cinnamon subscribe owner/repo comments:"channel"
/cinnamon subscribe owner/repo reviews:"channel"
```

### 8.3 PR actions

```text
/cinnamon pr summary <url>
/cinnamon pr review <url>
/cinnamon pr checks <url>
```

### 8.4 Memory and logs

```text
/cinnamon memory show
/cinnamon memory remember <text>
/cinnamon logs recent
/cinnamon logs trace <trace-id>
```

## 9. GitHub Subscription Model

### 9.1 Default features

When a repo is subscribed without feature arguments, enable:

1. `issues`
2. `pulls`
3. `commits`
4. `releases`
5. `deployments`

### 9.2 Opt-in features

1. `workflows`
2. `reviews`
3. `comments`
4. `branches`
5. `commits:*`
6. `discussions`

### 9.3 PR-related features

1. `pulls`
   - opened
   - reopened
   - closed
   - merged
   - ready for review
2. `reviews`
   - review requested
   - review submitted
   - changes requested
   - approved
3. `comments`
   - PR comments
   - issue comments
4. `workflows`
   - workflow run triggered
   - workflow run completed
   - workflow run failed
   - pull_request workflow events

### 9.4 Filters

1. label filter applies to PR, issue, comment, review.
2. branch filter applies to commits and workflows.
3. comments/reviews default to thread-only.
4. `comments:"channel"` and `reviews:"channel"` broadcast to channel.

### 9.5 Threading

1. First PR event posts a parent card to the channel.
2. Subsequent PR events are replies in the same Slack thread.
3. Parent card stores latest PR state.
4. Parent card includes title, author, labels, reviewers, assignees, checks, changed files count when available.

## 10. GitHub Webhook Handling

### 10.1 Endpoint

```text
POST /webhooks/github
```

For local development, expose this HTTP endpoint through Cloudflare Tunnel. Production/internal deployment should use a named persistent Cloudflare Tunnel when the server does not have a public HTTPS URL.

Local development example:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set the GitHub webhook URL to:

```text
https://<generated-tunnel-host>/webhooks/github
```

### 10.2 Required behavior

1. Verify webhook signature.
2. Parse event name and action.
3. Store `X-GitHub-Delivery` as the idempotency key.
4. Stop processing if the delivery id was already completed.
5. Resolve repo subscription.
6. Resolve enabled features and filters.
7. Create normalized notification event.
8. Find or create Slack thread mapping.
9. Post or update Slack message.
10. Append JSONL log.

### 10.3 Event mapping

```text
pull_request -> pulls
pull_request_review -> reviews
pull_request_review_comment -> comments
issue_comment -> comments
workflow_run -> workflows
check_suite/check_run -> workflows or pulls status
push -> commits or commits:*
release -> releases
deployment_status -> deployments
create/delete branch -> branches
```

## 11. Data Model

Use SQLite for queryable MVP state. Keep JSONL for append-only logs.

### 11.1 Subscription

```ts
type Subscription = {
  id: string;
  workspaceId: string;
  channelId: string;
  repo: string;
  features: string[];
  labelFilter?: string;
  branchFilters?: Record<string, string[]>;
  broadcast: {
    comments: "thread" | "channel";
    reviews: "thread" | "channel";
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

### 11.2 Thread mapping

```ts
type ThreadMapping = {
  id: string;
  workspaceId: string;
  channelId: string;
  repo: string;
  githubType: "pull_request" | "issue" | "workflow" | "deployment";
  githubNumber?: number;
  githubId?: string;
  slackThreadTs: string;
  parentMessageTs: string;
  latestState: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
```

### 11.3 Approval

```ts
type ApprovalRequest = {
  id: string;
  workspaceId: string;
  channelId: string;
  requesterUserId: string;
  approverUserId?: string;
  actionType: "github_write" | "terraform_apply" | "config_change" | "memory_change";
  summary: string;
  diff?: string;
  status: "pending" | "approved" | "rejected" | "expired";
  requiredKeyword: "yes";
  createdAt: string;
  expiresAt: string;
};
```

### 11.4 Admin/write grant

```ts
type AccessGrant = {
  id: string;
  workspaceId: string;
  subjectType: "slack_user" | "slack_user_group";
  subjectId: string;
  role: "admin" | "write";
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
};
```

### 11.5 Idempotency key

```ts
type IdempotencyKey = {
  key: string;
  source: "github_webhook" | "slack_command" | "approval";
  externalId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "processing" | "completed" | "failed";
};
```

For GitHub webhooks, use the `X-GitHub-Delivery` header as `key` and `externalId`.

### 11.6 Audit log event

```ts
type AuditLogEvent = {
  ts: string;
  traceId: string;
  level: "debug" | "info" | "warn" | "error";
  event: string;
  workspaceId?: string;
  channelId?: string;
  userId?: string;
  repo?: string;
  action?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};
```

## 12. Internal Logs

### 12.1 Format

Use JSONL.

```json
{"ts":"2026-07-02T01:00:00.000Z","traceId":"tr_123","level":"info","event":"github.webhook.received","repo":"owner/repo","metadata":{"githubEvent":"pull_request","action":"opened"}}
```

### 12.2 Required logs

1. Slack command received
2. Slack admin bootstrap attempted/succeeded/failed
3. subscription created/updated/deleted
4. GitHub webhook received
5. webhook signature verification failed
6. GitHub webhook duplicate delivery skipped
7. notification sent/failed
8. approval requested/approved/rejected/expired
9. GitHub write command planned/executed/failed
10. memory read/write
11. setup CLI generated env
12. SQLite migration started/succeeded/failed
13. job queued/started/completed/failed

## 13. Memory

### 13.1 Default file

```text
memory.md
```

`memory.md` lives at the repository root for MVP.
The real `memory.md` is gitignored. Track `memory.example.md` as the template/default content for new setups.

### 13.2 Initial content

```markdown
# Cinnamon Team Memory

## Preferences

- Respond in Korean unless the user asks otherwise.

## Code Review

- Prioritize bugs, security, regressions, and missing tests.

## Repositories

## Incident Response

## Terraform / AWS
```

### 13.3 Rules

1. Never store tokens, passwords, or personal secrets.
2. Show diff before memory writes.
3. Log every memory write.
4. Allow Slack read via `/cinnamon memory show`.

## 14. PR Summary And Review

### 14.1 PR summary

Input:

1. PR URL
2. repo
3. PR metadata
4. diff
5. checks summary
6. `memory.md`

Output:

1. concise summary
2. risk areas
3. files changed
4. test/check status
5. suggested next actions

### 14.2 PR review draft

Input:

1. PR URL
2. diff
3. relevant files when available
4. test output/checks
5. `memory.md`

Output:

1. findings ordered by severity
2. file/line references when possible
3. questions
4. no-issue statement if no concrete issue is found

Posting review comments to GitHub requires Slack `yes` approval.

When Cinnamon posts a PR review/comment to GitHub, append this disclosure:

```text
Posted by Cinnamon bot after Slack approval from <@SLACK_USER_ID>.
```

## 15. Approval Flow

1. User requests a write action.
2. Bot prepares action summary and diff/plan.
3. Bot posts approval request in Slack.
4. User replies `yes`.
5. Bot verifies requester has write permission or admin approval is present.
6. Bot executes action.
7. Bot reports result.
8. Bot appends audit log.

All GitHub write, Terraform/AWS write, config change, and memory change actions use this flow.

## 16. First End-to-End Milestone

### Goal

In Slack, an admin can bootstrap Cinnamon, subscribe a repo, receive PR notifications, ask for a PR summary, and see logs.

### Steps

1. Run setup CLI.
2. CLI creates local env, bootstrap code, `.cinnamon/logs`, SQLite DB, and `memory.md`.
3. Start Slack bot.
4. In Slack, run `/cinnamon bootstrap <code>`.
5. Run `/cinnamon subscribe owner/repo pulls`.
6. Receive a GitHub pull request webhook.
7. Bot posts parent PR card to Slack.
8. Bot logs the webhook and notification.
9. Run `/cinnamon pr summary <url>`.
10. Bot returns summary using GitHub PR data and `memory.md`.

### Acceptance criteria

1. Bootstrap code can only be used once.
2. Non-admin cannot subscribe repos.
3. Subscription is persisted.
4. Webhook signature is verified.
5. `X-GitHub-Delivery` is stored as idempotency state.
6. `pull_request.opened` creates a Slack parent card.
7. A later PR event replies in the same thread.
8. `/cinnamon pr summary` returns a useful summary.
9. JSONL logs include trace ids for every step.
10. Duplicate GitHub webhook delivery does not create duplicate Slack messages.

## 17. Suggested Implementation Order

1. Create `apps/slack-bot`.
2. Add config loader for local env.
3. Add setup CLI skeleton.
4. Add SQLite connection, `better-sqlite3`, and simple SQL migration runner.
5. Add JSONL logger.
6. Add Slack Bolt app with Socket Mode and `/cinnamon` command handling.
7. Add bootstrap code flow.
8. Add subscription storage.
9. Add GitHub webhook endpoint, signature verification, `X-GitHub-Delivery` idempotency, and Cloudflare Tunnel dev docs.
10. Add Slack notification rendering and thread mapping.
11. Add `gh` wrapper.
12. Add AI agent adapter interface, Codex adapter, and Claude adapter skeleton.
13. Add PR summary command.
14. Add in-process queue interface and runner.
15. Add approval flow skeleton.

## 18. Open Technical Decisions

No blocking MVP technical decisions remain. Implementation may still discover local tradeoffs, but the current MVP direction is decided enough to start coding.
