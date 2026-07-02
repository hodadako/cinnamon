# AI Agent Connector Bot PRD

## 1. 배경

개인용/내부용 Slack 봇을 시작점으로, Slack 안에서 자연어로 AI에게 개발 및 장애 대응 작업을 요청하고 AI가 실제 도구를 사용해 처리하는 봇이 필요하다. 단순 질의응답 봇이 아니라 headless Claude, Codex 같은 에이전트 런타임을 호출하고, bot GitHub 계정 및 `gh` CLI 권한을 통해 PR 리뷰, PR 알림, 요구사항 구현, Terraform/AWS 기반 인프라 변경, MCP 및 Skill 기반 도구 사용까지 수행하는 작업 실행형 봇을 목표로 한다. Discord 및 기타 커넥터는 같은 코어 엔진을 재사용하는 후속 확장 대상으로 둔다.

## 2. 목표

1. Slack App을 첫 채널로 제공하고, Discord Bot 및 기타 커넥터는 후속 확장 가능한 구조로 둔다.
2. 사용자가 자연어로 질문하거나 작업을 요청하면, 적절한 에이전트 런타임과 도구를 선택해 처리한다.
3. GitHub 계정을 부여받은 에이전트가 `gh` CLI 또는 GitHub API를 통해 repo 구독 기반 PR 알림, 코드 리뷰, 이슈/PR 요약, 요구사항 구현을 수행한다.
4. Terraform 및 AWS 권한을 부여받은 에이전트가 사용자 승인 후 인프라 코드 수정, `terraform plan`, `terraform apply`, AWS 리소스 조회/수정을 수행한다.
5. 사용자가 자연어로 새로운 Skill 또는 MCP 서버를 추가, 테스트, 활성화할 수 있게 한다.
6. MCP 서버와 Skill을 연결해 외부 시스템 및 전문 워크플로를 확장 가능하게 만든다.
7. 사용자가 대부분의 작업과 설정을 서버에 직접 접속하지 않고 Slack 안에서 완료할 수 있게 한다.
8. 팀 메모리를 별도 Markdown 파일로 관리해 반복되는 선호도, 작업 방식, 리뷰 기준, 알림 설정을 학습하고 재사용한다.
9. 모든 작업 실행, 설정 변경, 승인, 실패를 항상 로그로 남긴다.
10. Slack에서 개발 및 장애 대응을 end-to-end로 자동화하는 것을 좁은 성공 기준으로 삼는다.

## 3. 비목표

1. Discord 및 기타 커넥터는 첫 버전에서 필수 지원하지 않는다.
2. AI가 승인 없이 프로덕션 배포, 인프라 변경, 결제, 계정 삭제 등 고위험 작업을 수행하지 않는다.
3. 자체 LLM 모델을 학습하거나 호스팅하는 것은 초기 범위에 포함하지 않는다.
4. 범용 RPA처럼 임의의 GUI 앱을 조작하는 기능은 초기 범위가 아니다.

## 4. 대상 사용자

1. 개발자: PR 리뷰, 코드 변경, 이슈 처리, CI 실패 분석을 요청한다.
2. 테크 리드/리뷰어: 구독한 repo의 PR 알림, 리뷰 우선순위, 변경 요약, 리뷰 정책 적용을 원한다.
3. 인프라 엔지니어/SRE: Terraform 코드 변경, AWS 리소스 조회, 인프라 변경 계획 검토, 승인 후 적용을 요청한다.
4. 운영자/관리자: 커넥터 권한, GitHub 계정, AWS 계정/역할, MCP 서버, Skill, 감사 로그를 관리한다.
5. 팀 구성원: Slack에서 자연어로 업무 관련 질문을 하고 도구 실행 결과를 받는다.

## 5. 핵심 사용자 시나리오

### 5.1 PR 리뷰 요청

사용자가 Slack에서 `@bot 이 PR 리뷰해줘`라고 요청한다. 봇은 PR 링크를 인식하고 GitHub 권한을 확인한 뒤, headless Codex 또는 Claude 런타임에 리뷰 작업을 위임한다. 에이전트는 diff, 관련 파일, 테스트 결과를 확인하고 리뷰 코멘트 초안을 작성한다. GitHub write 작업은 사용자에게 `yes` 승인을 받은 뒤 bot 계정으로 게시한다.

### 5.2 Repo 구독 기반 PR 알림 및 요약

사용자 또는 관리자가 Slack GitHub App처럼 특정 GitHub repo를 Slack 채널에 구독시킨다. 봇은 `/cinnamon subscribe owner/repo [feature]` 형태의 자연어/명령을 지원하고, 구독 feature에 따라 PR, review, comment, workflow, commit, release, deployment 이벤트를 자동으로 수신해 채널에 알림을 보낸다. PR 알림에는 PR 제목, 작성자, 변경 규모, CI/check 상태, 리뷰 요청자, 주요 라벨, 후속 액션(요약/리뷰/체크 확인)을 포함한다. 같은 PR의 후속 이벤트는 기본적으로 Slack thread에 묶고, 사용자가 `내가 봐야 할 PR 알려줘`라고 직접 물으면 구독 상태와 사용자 매핑을 기준으로 관련 PR을 요약해 반환한다.

### 5.3 요구사항 구현

사용자가 `이 이슈 구현해줘` 또는 `이 PR 피드백 반영해줘`라고 요청한다. 봇은 대상 repo, 브랜치, 이슈/PR 컨텍스트를 확인하고 에이전트 작업 세션을 생성한다. 에이전트는 코드를 수정하고 테스트를 실행한 뒤 변경 요약, 테스트 결과, PR 생성 또는 기존 PR 업데이트 제안을 반환한다.

### 5.4 MCP 및 Skill 사용

사용자가 `Notion 스펙 보고 구현 계획 만들어줘`라고 요청하면 봇은 연결된 MCP 서버와 Skill 목록을 확인한다. 적절한 Skill을 로드하고 Notion, GitHub, 로컬 repo 등 필요한 도구를 조합해 작업한다. 사용자는 메신저 안에서 진행 상황과 결과를 받는다.

### 5.5 자연어 기반 Skill/MCP 추가

사용자가 `우리 Linear MCP 추가해줘` 또는 `이 repo의 .codex/skills/deploy-review를 팀 Skill로 등록해줘`라고 요청한다. 봇은 필요한 설정값, credential, 권한 범위, 적용 대상 workspace/channel/repo를 대화로 수집한다. MCP 서버는 연결 테스트를 실행하고, Skill은 manifest와 실행 조건을 검증한다. 위험 권한이나 credential 저장이 필요한 경우 승인 요청을 생성한다. 등록이 완료되면 사용자는 서버에 접속하지 않고도 메신저에서 Skill/MCP 목록 조회, 활성화/비활성화, 삭제, 권한 변경을 수행할 수 있다.

### 5.6 인프라 코드 및 AWS 변경

사용자가 `staging RDS 인스턴스 타입 올려줘` 또는 `장애 원인 보고 필요한 인프라 조치까지 해줘`라고 요청한다. 봇은 대상 repo, Terraform workspace, AWS 계정/역할, 환경(staging/production)을 확인한다. 에이전트는 Terraform 코드를 수정하거나 현재 AWS 상태를 조회하고, `terraform fmt`, `terraform validate`, `terraform plan`을 실행해 변경 계획을 요약한다. 실제 `terraform apply` 또는 AWS write 작업은 `terraform apply -input=false`처럼 자동 진행 가능한 명령이라도 Slack에서 사용자에게 `yes` 승인을 받은 뒤에만 실행하며, 실행 결과와 변경된 리소스를 감사 로그에 남긴다.

### 5.7 사용자 선호도 기억

사용자가 반복적으로 `리뷰는 버그/보안 위주로 먼저 봐줘`, `한국어로 요약해줘`, `PR 코멘트는 짧게 써줘` 같은 선호를 표현하면 봇은 Hermes 에이전트의 메모리처럼 `memory.md`에 팀 메모리로 저장한다. 이후 팀 범위 작업에서 해당 선호를 자동 적용하고, 충돌하거나 민감한 선호는 확인을 요청한다.

## 6. 기능 요구사항

### 6.1 커넥터 계층

1. Slack App을 첫 커넥터로 지원한다.
   - 멘션, DM, 스레드 응답, 버튼/모달 기반 승인 흐름을 지원한다.
   - workspace, channel, user 단위 권한을 식별한다.
2. Discord Bot은 후속 커넥터로 지원한다.
   - 멘션, DM, 서버/채널 컨텍스트, slash command를 지원한다.
   - guild, channel, user 단위 권한을 식별한다.
3. 커넥터 추가를 위한 공통 인터페이스를 제공한다.
   - inbound event normalization
   - outbound message rendering
   - interactive action handling
   - identity mapping
4. 커넥터별 메시지 포맷 차이를 숨기고, 코어 작업 엔진은 동일한 요청 모델을 사용한다.
5. MVP 구현은 Slack connector를 첫 성공 경로로 제공하고, Discord와 Telegram은 같은 인터페이스를 따르는 기본 command runtime으로 확장한다.

### 6.2 자연어 작업 라우팅

1. 사용자의 메시지를 작업 유형으로 분류한다.
   - 일반 질문
   - GitHub 조회/요약
   - PR 리뷰
   - 코드 구현
   - Terraform/AWS 인프라 조회 및 변경
   - Skill/MCP 추가 및 설정 변경
   - MCP/Skill 기반 외부 작업
   - 메모리 저장/수정/삭제
2. 작업에 필요한 컨텍스트가 부족하면 추가 질문을 한다.
3. 위험도가 높은 작업은 실행 전 승인 요청을 생성한다.
4. 장기 실행 작업은 진행 상태를 커넥터 메시지로 업데이트한다.

### 6.3 에이전트 런타임

1. headless Claude, Codex 등 복수 런타임을 추상화한다.
2. 작업 유형, repo, 비용, 속도, 도구 지원 여부에 따라 런타임을 선택할 수 있다.
3. 각 작업 세션은 다음 정보를 가진다.
   - requester identity
   - connector source
   - workspace/team
   - target repo/project
   - target cloud account/environment
   - selected runtime
   - granted tools
   - memory snapshot
   - approval policy
   - execution logs
4. 런타임별 실행 결과를 공통 결과 모델로 변환한다.
5. 실패 시 재시도, 사용자에게 필요한 추가 입력 요청, 또는 안전한 중단 상태를 제공한다.

### 6.4 GitHub 통합

1. MVP는 bot GitHub 계정을 연결하고, 후속 단계에서 GitHub App 설치 모델로 확장할 수 있다.
2. `gh` CLI 사용이 필요한 런타임에는 인증된 환경을 제공한다.
3. 다음 작업을 지원한다.
   - repo별 알림 구독 및 채널 매핑
   - GitHub webhook 기반 PR 이벤트 수신
   - Slack GitHub App과 유사한 feature 단위 subscribe/unsubscribe
   - 기본 feature: `issues`, `pulls`, `commits`, `releases`, `deployments`
   - opt-in feature: `workflows`, `reviews`, `comments`, `branches`, `commits:*`, `discussions`
   - PR feature인 `pulls`: new/open, merged/closed, draft에서 ready for review 전환 알림
   - PR review feature인 `reviews`: pull request review submitted/requested 관련 알림
   - PR/issue comment feature인 `comments`: PR 및 issue의 새 comment 알림
   - workflow feature인 `workflows`: GitHub Actions workflow run 시작/완료/실패 및 pull_request 기반 workflow 알림
   - deployment feature인 `deployments`: deployment status update 알림
   - label filter: PR/issue/comment/review 알림에 required label 필터 적용
   - branch filter: commit 및 workflow 알림에 branch 또는 branch pattern 필터 적용
   - channel broadcast 옵션: comments/reviews를 thread에만 쓸지 channel에도 broadcast할지 설정
   - PR 목록 조회
   - 리뷰 요청/멘션/CI 실패 알림 조회
   - PR diff 및 관련 파일 분석
   - 코드 리뷰 코멘트 작성
   - 이슈/PR 요구사항 구현
   - 브랜치 생성
   - 커밋 및 push
   - PR 생성 또는 기존 PR 업데이트
   - GitHub Actions 실패 로그 확인
4. GitHub write 작업은 항상 Slack에서 사용자 `yes` 승인을 받은 뒤 실행한다.
5. 모든 GitHub write 작업은 누가 요청했고 어떤 에이전트가 어떤 명령을 실행했는지 감사 가능해야 한다.
6. PR 알림은 기본적으로 사용자의 자연어 조회가 아니라 repo 구독에 따른 자동 이벤트 알림으로 동작한다.
7. 자동 알림은 중복 이벤트를 억제하고, 같은 PR의 연속 이벤트는 Slack thread로 묶는다.
8. parent card는 PR 최신 상태, 제목, 설명, assignee, reviewer, label, check 상태를 보여준다.
9. mentions는 Slack user와 GitHub user 매핑이 있는 경우 reviewer, assignee, PR/issue/comment mention 대상자에게 적용한다.
10. repo 구독 추가/수정/삭제는 Slack 자연어 명령으로 수행할 수 있어야 한다.

### 6.5 Terraform/AWS 인프라 통합

1. Terraform CLI와 AWS CLI를 사용하는 인증된 실행 환경을 제공한다.
2. AWS 계정, IAM role, region, environment를 작업 세션에 명시한다.
3. 다음 작업을 지원한다.
   - Terraform 코드 조회 및 수정
   - `terraform fmt`
   - `terraform validate`
   - `terraform plan`
   - 사용자 승인 후 `terraform apply`
   - Terraform state 조회
   - AWS 리소스 조회
   - 사용자 승인 후 제한된 AWS write 작업
4. 인프라 변경은 plan 결과 요약, 예상 리소스 생성/수정/삭제, 비용/가용성 영향, rollback 고려사항을 포함해 사용자에게 제시한다.
5. 모든 Terraform/AWS write 작업은 환경과 위험도에 관계없이 Slack에서 명시적인 `yes` 승인을 요구한다.
6. production 환경의 `terraform apply`, 리소스 삭제, IAM 권한 변경, 네트워크 경계 변경은 admin 승인을 추가로 요구할 수 있다.
7. AWS credential은 장기 access key보다 short-lived role assumption을 우선한다.
8. 모든 인프라 write 작업은 요청자, 승인자, 대상 계정/region, 실행 명령, plan/apply 결과, 변경 리소스를 감사 로그에 남긴다.

### 6.6 MCP 및 Skill 확장

1. MCP 서버를 자연어로 등록, 테스트, 활성화/비활성화할 수 있다.
2. Skill을 자연어로 등록하고 작업 유형 또는 명시적 호출에 따라 로드할 수 있다.
3. MCP 추가 요청은 다음 정보를 대화형으로 수집한다.
   - MCP 이름
   - transport/command/url
   - 필요한 credential
   - 허용 workspace/channel/repo
   - read/write 권한 범위
   - 기본 활성화 여부
4. Skill 추가 요청은 다음 정보를 대화형으로 수집하거나 repo manifest에서 읽는다.
   - Skill 이름
   - 설명
   - trigger 조건
   - 필요한 도구 권한
   - 적용 범위
   - owner
5. 등록 전 검증을 수행한다.
   - MCP 연결 테스트
   - Skill manifest/schema 검증
   - 권한 정책 위반 여부 확인
   - credential 저장 가능 여부 확인
6. Slack, MCP, Skill은 env 기반 allowlist 안에서만 활성화할 수 있다.
7. 위험 권한, write 권한, credential 저장, 조직 전체 활성화는 명시 승인을 요구한다.
8. 사용자는 메신저에서 MCP/Skill 목록 조회, 상세 보기, 테스트, 활성화/비활성화, 삭제, 권한 변경을 수행할 수 있다.
9. Skill 실행 시 필요한 권한과 외부 커넥터 접근 범위를 명시한다.
10. MCP/Skill 사용 결과는 작업 로그에 포함한다.
11. 실패한 MCP/Skill 호출은 사용자에게 이해 가능한 오류로 요약한다.

### 6.7 팀 메모리

1. 메모리는 팀 범위 Markdown 파일로 관리한다.
2. 기본 파일명은 Hermes 에이전트 스타일의 `memory.md`로 둔다.
3. MVP에서 `memory.md`는 repo 루트에 저장한다.
4. 저장 대상 예시는 다음과 같다.
   - 언어 선호
   - 코드 리뷰 스타일
   - 선호 테스트 명령
   - repo별 작업 규칙
   - 장애 대응 runbook 링크
   - 환경별 Terraform workspace 및 AWS region 선호
   - 알림 빈도
   - 승인 정책 선호
5. 메모리는 명시 저장과 암시 추천 저장을 모두 지원한다.
6. 암시적으로 저장하려는 내용은 사용자에게 확인을 요청한다.
7. 사용자는 Slack에서 팀 메모리를 조회, 수정, 삭제할 수 있다.
8. 민감 정보, 토큰, 비밀번호, 개인식별정보는 메모리에 저장하지 않는다.
9. 메모리 파일 변경은 diff, 요청자, 승인자, 변경 이유를 로그로 남긴다.

### 6.8 권한 및 승인

1. 커넥터 사용자와 GitHub/AWS/MCP 계정을 매핑한다.
2. 작업을 위험도별로 분류한다.
   - 읽기 전용: 승인 없이 실행 가능
   - 낮은 위험 write: 설정에 따라 자동 실행 가능
   - 높은 위험 write: 명시 승인 필요
   - 금지 작업: 실행 불가
3. 승인 요청에는 실행할 작업, 대상 리소스, 예상 변경, plan/diff 요약, 에이전트 이름을 포함한다.
4. 모든 write 변경은 Slack에서 `yes` 승인을 받아야 한다.
5. write 변경 권한과 admin 권한은 Slack user id 및 Slack user group 기준으로 관리한다.
6. 최초 admin 등록은 setup CLI가 생성한 1회성 랜덤 코드를 Slack에서 입력하는 방식으로 처리한다.
7. 1회성 코드를 입력한 Slack 사용자의 user id를 최초 admin으로 저장한다.
8. 최초 admin 등록 코드는 1회 사용 후 폐기하고, 만료 시간을 둔다.
9. 이후 admin은 Slack 자연어 명령으로 admin/write 권한을 가진 user id 또는 user group을 추가/삭제할 수 있다.
10. 권한 변경은 적용 전 변경 요약을 보여주고 admin `yes` 승인을 받은 뒤 적용한다.
11. env는 최초 admin bootstrap seed, emergency admin/write override, allowlist, secret/path 설정의 저장소로 사용한다.
12. SQLite는 Slack bootstrap 이후 추가/삭제되는 admin/write user id 및 user group grant의 durable 저장소로 사용한다.
13. env emergency admin 목록, DB admin grant, 또는 admin user group에 포함된 사용자만 권한 정책, allowlist, production write, 조직 전체 MCP/Skill 활성화를 승인할 수 있다.
14. 관리자 정책이 사용자 선호보다 우선한다.
15. 모든 요청, 승인, 거절, 실행 명령, 결과, 실패 사유는 항상 감사 로그에 저장한다.
16. 인프라 write 작업은 GitHub write 작업보다 높은 기본 위험도로 분류한다.

### 6.9 자연어 기반 설정 관리

1. 사용자는 서버에 직접 접속하지 않고 Slack에서 대부분의 설정을 변경할 수 있다.
2. 자연어 설정 명령은 구조화된 변경 계획으로 변환되고, 변경 전 사용자에게 요약된다.
3. 다음 설정을 자연어로 처리할 수 있다.
   - repo 알림 구독 추가/수정/삭제
   - GitHub repo 연결
   - AWS account/role/region 등록
   - Terraform workspace/backend 등록
   - MCP 서버 등록/테스트/활성화/비활성화
   - Skill 등록/활성화/비활성화
   - 팀 메모리 Markdown 파일 조회/수정/삭제
   - 알림 필터 및 digest 설정
   - 기본 런타임 및 승인 정책 변경 요청
4. 권한이 부족한 사용자의 설정 변경 요청은 관리자 승인 플로우로 전환한다.
5. 설정 변경은 변경 전/후 값, 요청자, 승인자, 적용 범위를 감사 로그에 남긴다.
6. 서버 직접 접속은 장애 대응, credential 복구, 데이터 마이그레이션 같은 break-glass 운영에 한정한다.

### 6.10 초기 서버 설정 CLI

1. 서버 최초 설정은 수동 env 파일 편집보다 대화형 setup CLI를 우선 제공한다.
2. setup CLI는 필요한 값을 질문으로 받고 로컬 env 파일을 생성한다.
3. production에서도 서버 내부 로컬 env 파일 사용을 허용한다.
4. env 스키마는 초기부터 완전히 고정하지 않고, 개발하면서 필요한 키를 추가한다.
5. setup CLI는 현재 구현에 필요한 최소 값부터 받고, 기능이 추가될 때 질문과 env 키를 확장한다.
6. setup CLI가 초기에 수집할 수 있는 값은 다음 후보를 포함한다.
   - Slack bot token/signing secret/app token
   - 허용 Slack workspace/channel/user allowlist
   - 최초 admin 등록용 1회성 랜덤 코드 생성
   - admin/write 권한 user id 목록
   - admin/write 권한 user group 목록
   - bot GitHub 계정 인증 정보 또는 `gh` auth 상태
   - GitHub repo allowlist 및 기본 구독 채널
   - AWS role/region/profile
   - Terraform workspace/backend 기본값
   - MCP/Skill allowlist
   - `memory.md` 경로. MVP 기본값은 repo 루트 `memory.md`
   - 내부 로그 저장 경로
   - SQLite DB 경로
7. setup CLI는 입력값 검증, 필수 값 누락 검사, secret 마스킹, 연결 테스트를 수행한다.
8. 생성된 env 값은 bootstrap 설정, secret/path, allowlist, emergency override의 단일 진실 공급원으로 사용하고, Slack에서 변경되는 durable 권한 grant는 SQLite에 저장한다.
9. Slack 자연어 설정은 운영 중 변경 경로이고, setup CLI는 서버 부트스트랩과 break-glass 재설정 경로로 사용한다.
10. 최초 admin 등록 전에는 setup CLI가 출력한 bootstrap code를 Slack에서 입력하는 명령만 허용한다.

### 6.11 운영 콘솔

1. 관리자는 다음 항목을 설정할 수 있다.
   - Slack workspace
   - GitHub org/repo
   - repo notification subscription
   - AWS account/role/region
   - Terraform workspace/backend
   - MCP 서버
   - Skill
   - 에이전트 런타임
   - 권한 정책
   - 메모리 정책
2. 운영 콘솔은 자연어 설정 관리의 보조 수단이며, MVP의 필수 사용자 경로가 아니다.
3. 작업 히스토리와 실패 작업을 조회할 수 있다.
4. 비용, 토큰, 실행 시간, 성공률을 볼 수 있다.

### 6.12 내부 로그 저장 및 모니터링

1. MVP의 첫 로그 소스는 서버 내부에 저장되는 애플리케이션/작업 로그로 둔다.
2. 봇은 장애 대응 시 외부 모니터링 서비스보다 내부 저장 로그를 먼저 조회한다.
3. 모니터링 기능은 별도 외부 observability SaaS 연동이 아니라, 내부 저장 로그를 불러와 검색/요약/상관분석하는 방식으로 시작한다.
4. 내부 로그는 작업 trace id, timestamp, severity, component, request id, user/channel, command, error, stack/context를 포함한다.
5. Slack에서 `최근 에러 보여줘`, `이 배포 이후 장애 로그 분석해줘`, `이 trace id 원인 찾아줘` 같은 자연어 조회를 지원한다.
6. 장애 대응 에이전트는 내부 로그, GitHub 상태, GitHub Actions 로그, Terraform/AWS 조회 결과를 함께 사용해 원인과 대응안을 만든다.

## 7. 비기능 요구사항

1. 보안
   - OAuth token, GitHub token, AWS credentials, MCP credentials는 암호화 저장한다.
   - AWS 권한은 최소 권한 IAM policy와 short-lived session을 우선 사용한다.
   - 에이전트 실행 환경은 작업별로 격리한다.
   - repo checkout, command execution, secret access 범위를 제한한다.
   - production 인프라 변경은 별도 정책과 추가 승인을 적용할 수 있어야 한다.
   - Slack workspace, 채널, 사용자, MCP, Skill allowlist는 env로 관리한다.
   - write/admin emergency override는 env로 관리하고, Slack에서 변경되는 durable grant는 SQLite에 저장하며, 런타임에서 항상 검사한다.
   - local/prod 모두 서버 내부 로컬 env 파일을 사용할 수 있다.
   - env 파일은 setup CLI로 생성할 수 있고, secret 값은 로그에 노출하지 않는다.
2. 신뢰성
   - 장기 실행 작업은 큐 기반으로 처리한다.
   - 커넥터 이벤트 중복 수신에 대비해 idempotency key를 사용한다.
   - 실패 작업은 재시도 정책과 수동 재개 경로를 가진다.
3. 관측성
   - 작업 단위 trace id를 발급한다.
   - 커넥터 이벤트, 라우팅 결정, 런타임 호출, 도구 실행, 승인 상태를 항상 로그로 남긴다.
   - GitHub webhook 수신, 구독 매칭, 알림 발송 성공/실패를 로그로 남긴다.
   - 자연어 설정 변경의 파싱 결과, 승인 상태, 적용 결과를 로그로 남긴다.
   - MVP 모니터링은 서버 내부 저장 로그를 조회, 검색, 요약하는 방식으로 제공한다.
4. 확장성
   - 커넥터, 런타임, 도구, 메모리 백엔드를 교체 가능한 인터페이스로 설계한다.
5. 개인정보
   - 메모리 저장 전 사용자에게 명확한 제어권을 제공한다.
   - 조직 정책에 따라 메모리 비활성화가 가능해야 한다.

## 8. MVP 범위

### 포함

1. Slack App 기본 커넥터
2. 개인용/내부용 Slack workspace 운영
3. GitHub PR 조회, PR 요약, PR 리뷰 초안 작성
4. repo 구독 기반 PR 자동 알림
5. headless Codex 런타임 1종 우선 연동
6. `gh` CLI 기반 GitHub read/write 작업 실행
7. 사용자 승인 후 GitHub 코멘트 게시
8. Terraform 코드 수정, validate, plan 실행
9. 사용자 `yes` 승인 후 제한된 Terraform/AWS write 작업
10. repo 루트 `memory.md` 기반 팀 메모리
11. SQLite 기반 queryable state와 JSONL 기반 audit/operation log
12. 서버 내부 저장 로그 조회 및 장애 분석
13. 초기 서버 설정 CLI 및 로컬 env 생성
14. MCP 서버 1개와 Skill 로딩의 최소 경로
15. 자연어 기반 repo 구독, MCP, Skill 설정 변경

### 제외

1. 완전한 웹 운영 콘솔
2. 복잡한 비용 최적화 라우팅
3. 모든 커넥터의 rich interactive UI
4. 고급 조직 정책 엔진
5. 다중 에이전트 협업 워크플로
6. production 인프라 자동 apply
7. 광범위한 AWS 관리자 권한 자동 위임
8. 서버 접속을 전제로 한 수동 설정 운영
9. 외부 고객용 멀티테넌트 SaaS 운영
10. Discord 첫 버전 필수 지원
11. 운영자가 모든 env 키를 사전에 확정해야만 하는 설치 방식

## 9. 출시 단계

### Phase 1: Slack + GitHub PR Assistant

1. 초기 서버 설정 CLI로 로컬 env 생성
2. Slack mention/slash command 처리
3. GitHub 인증 및 repo 구독 설정
4. GitHub webhook 기반 PR 자동 알림
5. PR 조회, 요약 및 리뷰 초안
6. 승인 후 GitHub 리뷰 코멘트 게시
7. 자연어 기반 repo 구독 추가/수정/삭제
8. 기본 작업 로그

### Phase 2: Terraform/AWS 작업 실행

1. Terraform repo checkout 및 workspace 식별
2. Terraform 코드 수정, fmt, validate, plan
3. AWS read-only 리소스 조회
4. Slack `yes` 승인 후 Terraform/AWS write 실행
5. 인프라 변경 감사 로그

### Phase 3: Slack 개발/장애 대응 자동화

1. Slack thread 기반 진행 상태 업데이트
2. 요구사항 구현 작업 세션
3. branch/commit/push/PR 생성
4. GitHub Actions 실패 로그 분석
5. 서버 내부 저장 로그 조회 및 원인 조사
6. 장애 알림 또는 사용자 신고를 기반으로 원인 조사
7. 내부 로그/인프라/GitHub 상태를 종합한 대응안 생성
8. Slack `yes` 승인 후 코드 또는 인프라 변경 실행

### Phase 4: MCP/Skill + Memory

1. 자연어 기반 MCP 서버 등록/테스트/활성화
2. 자연어 기반 Skill discovery/등록 및 실행 정책
3. `memory.md` 기반 팀 메모리
4. 메모리 조회/수정/삭제 명령
5. 런타임 선택 정책
6. 자연어 설정 변경 승인 플로우

### Phase 5: 운영화

1. 웹 운영 콘솔
2. 상세 감사 로그
3. 비용/성능 대시보드
4. 조직별 권한 정책
5. 커넥터 SDK 공개

## 10. 성공 지표

1. PR 요약 요청의 90% 이상이 60초 안에 첫 응답을 반환한다.
2. 구독된 repo의 PR 이벤트 95% 이상이 10초 안에 대상 채널에 알림으로 전달된다.
3. PR 리뷰 초안 사용자의 50% 이상이 결과를 수정 없이 또는 일부 수정만으로 사용한다.
4. GitHub write 작업의 100%가 감사 로그와 승인 기록을 남긴다.
5. 인프라 write 작업의 100%가 plan 요약, 승인 기록, 실행 결과를 남긴다.
6. 사용자가 반복 설정해야 하는 선호도 입력이 30% 이상 감소한다.
7. MVP 설정 변경의 80% 이상이 서버 접속 없이 Slack에서 완료된다.
8. MCP/Skill 추가 요청의 90% 이상이 자연어 대화만으로 등록 성공 또는 명확한 실패 사유를 반환한다.
9. Slack에서 개발 및 장애 대응 요청 1건을 조사, 변경안 생성, 승인, 실행, 결과 보고까지 end-to-end로 완료한다.

## 11. 주요 리스크

1. 에이전트가 과도한 권한을 갖고 잘못된 write 작업을 수행할 수 있다.
   - 대응: 위험도 분류, 승인 흐름, sandbox, 감사 로그를 필수화한다.
2. Slack/GitHub identity mapping이 복잡할 수 있다.
   - 대응: 초기에는 명시적 계정 연결과 env 기반 관리자 매핑으로 제한한다.
3. repo 구독 기반 알림이 과도하게 많아 채널 노이즈를 만들 수 있다.
   - 대응: 이벤트 필터, 라벨/브랜치 필터, 스레드 묶기, 알림 rate limit, digest 옵션을 제공한다.
4. 장기 실행 작업의 상태 관리가 어려울 수 있다.
   - 대응: 큐, 작업 상태 머신, trace id를 초기부터 설계한다.
5. 팀 메모리 Markdown 파일이 부정확하거나 민감 정보를 저장할 수 있다.
   - 대응: 확인 기반 저장, 금지 패턴, diff 검토, 변경 로그를 제공한다.
6. headless 런타임별 도구 지원과 출력 형식이 다를 수 있다.
   - 대응: 런타임 어댑터와 공통 작업 결과 모델을 둔다.
7. Terraform/AWS 권한이 과도하면 실제 인프라 장애나 보안 사고로 이어질 수 있다.
   - 대응: 최소 권한 role, plan-first workflow, production 추가 승인, 금지 작업 목록, 감사 로그를 필수화한다.
8. 자연어 설정 변경이 사용자의 의도와 다르게 해석될 수 있다.
   - 대응: 변경 전 구조화된 요약, diff, 적용 범위, 승인 버튼을 제공한다.
9. MCP/Skill을 쉽게 추가할 수 있으면 위험한 외부 도구가 연결될 수 있다.
   - 대응: env 기반 allowlist, 권한 등급, credential 검증, 관리자 승인, 테스트 실행 격리를 적용한다.

## 12. 오픈 질문

MVP 구현을 막는 오픈 질문은 없다. 세부 구현 중 발견되는 tradeoff는 구현 스펙 또는 후속 ADR로 기록한다.

## 13. MVP 구현 결정

아래 결정은 `docs/mvp-implementation-spec.md`의 구현 step과 동기화된 MVP 기준이다.

1. 구현 언어는 TypeScript로 유지한다.
2. Slack은 Bolt와 Socket Mode로 구현한다.
3. Slack 명령은 단일 `/cinnamon` slash command와 subcommand 모델로 시작한다.
4. GitHub webhook은 일반 HTTP endpoint인 `POST /webhooks/github`로 받고, 로컬/내부 배포에서 공개 HTTPS URL이 없으면 Cloudflare Tunnel을 사용한다.
5. GitHub webhook idempotency key는 `X-GitHub-Delivery` 값을 저장한다.
6. queryable product state는 SQLite와 `better-sqlite3`를 사용한다.
7. append-only audit/operation log는 서버 내부 JSONL로 저장한다.
8. migration은 repo 안의 ordered SQL file을 실행하는 단순 SQL migration runner로 시작한다.
9. Supabase/Postgres는 다중 서버, 외부 고객용 multi-tenant, 운영 콘솔, 높은 이벤트 처리량이 필요해질 때의 후속 migration target이다.
10. job 실행은 queue interface 뒤에 숨기고, MVP 구현은 in-process runner로 시작한다.
11. AI runtime은 AI agent adapter interface 뒤에 둔다. Codex가 첫 working adapter이고 Claude는 skeleton adapter로 둔다.
12. 팀 메모리는 repo 루트 `memory.md`에 저장하고, 실제 `memory.md`는 gitignore하며 `memory.example.md`만 예시로 추적한다.
13. GitHub PR review/comment에는 `Posted by Cinnamon bot after Slack approval from <@SLACK_USER_ID>.` disclosure를 붙인다.

## 14. 결정 기록

아래 항목은 현재 MVP 범위와 구현 순서에 반영된 결정 기록이다.

1. 첫 커넥터
   - 결정: Slack 먼저 출시, Discord는 후속 확장
   - 이유: 개인용/내부 봇의 첫 사용 채널이 Slack이다.
2. GitHub 권한 모델
   - 결정: MVP는 bot GitHub 계정 + `gh` CLI로 시작하고, 조직 배포 단계에서 GitHub App으로 확장
   - 이유: 에이전트가 실제 CLI 기반 작업을 수행하는 흐름을 빠르게 검증할 수 있다.
   - 선택지: bot 계정 먼저 / GitHub App 먼저 / 둘 다 필요
3. PR 알림 방식
   - 결정: Slack GitHub App처럼 repo를 채널에 구독시키고 feature 단위로 알림을 켜고 끈다.
   - 범위: 기본 `issues`, `pulls`, `commits`, `releases`, `deployments`; opt-in `workflows`, `reviews`, `comments`, `branches`, `commits:*`, `discussions`.
   - PR 세부 범위: `pulls`, `reviews`, `comments`, `workflows`, label filter, threading, mentions, channel broadcast 옵션을 지원한다.
4. GitHub write 승인 정책
   - 결정: PR 코멘트, commit, push, PR 생성은 모두 Slack에서 사용자 `yes` 승인 후 실행
   - 이유: `-i`처럼 매 write마다 명시 확인을 받는 모델이 기본이다.
5. 첫 에이전트 런타임
   - 결정: AI agent adapter interface를 만들고 Codex를 첫 구현으로 둔다. Claude adapter는 skeleton으로 추가한다.
   - 이유: 코드 구현, 테스트 실행, GitHub 작업의 핵심 경로를 먼저 검증할 수 있다.
6. 메모리 범위
   - 결정: 팀 메모리를 Hermes 에이전트처럼 `memory.md` 파일로 관리
   - 위치: repo 루트
   - 이유: 개인용/내부 봇에서는 파일 기반 팀 메모리가 단순하고 검토 가능하다.
7. 운영 콘솔
   - 결정: MVP는 setup CLI로 env를 생성하고, 운영 중 설정은 Slack 자연어 설정으로 처리하며, 웹 콘솔은 Phase 5에서 추가
   - 이유: 초기 제품 검증에는 커넥터, GitHub 작업, 에이전트 실행 경로가 더 중요하다.
   - 선택지: MVP 제외 / 최소 웹 콘솔 포함 / 운영 콘솔 우선
8. Terraform/AWS 변경 범위
   - 결정: Terraform/AWS write는 항상 Slack에서 `yes` 승인을 받은 뒤 실행
   - 이유: 인프라 변경은 자동화하되 실제 write 전 사용자 허락을 필수로 둔다.
9. AWS 권한 모델
   - 결정: bot 전용 IAM role을 short-lived session으로 assume하고, 환경별 최소 권한 policy를 적용한다.
   - 이유: 초기 구현과 감사가 단순하며 장기 credential 노출 위험을 줄일 수 있다.
10. 자연어 설정 관리
   - 결정: repo 구독, MCP/Skill 등록, 메모리, 알림 필터는 Slack 자연어 명령으로 처리하고 서버 접속은 예외로 둔다.
   - 이유: 사용자가 대부분의 작업과 설정을 메신저 안에서 끝낼 수 있어야 봇 제품의 가치가 명확하다.
   - 선택지: 자연어 설정 우선 / 운영 콘솔 우선 / 설정 파일 우선
11. MCP/Skill 추가 정책
   - 결정: Slack/MCP/Skill은 env 기반 allowlist 안에서만 허용하고, write 변경 권한은 env admin이 승인한다.
   - 이유: 내부 봇이어도 외부 도구 연결과 write 권한은 명시적으로 제한해야 한다.
12. 로그 정책
   - 결정: 모든 요청, 설정 변경, 승인, 실행, 실패를 항상 로그로 남긴다.
13. 좁은 성공 기준
   - 결정: Slack에서 개발 및 장애 대응을 조사, 계획, 승인, 실행, 결과 보고까지 완전 자동화한다.
14. 첫 로그/모니터링 소스
   - 결정: 서버 내부 저장 로그를 먼저 붙이고, 모니터링은 이 로그를 불러와 검색/요약/분석하는 방식으로 시작한다.
15. 초기 env 설정
   - 결정: 서버 최초 설정 시 setup CLI가 대화형으로 값을 받고 로컬 env 파일을 생성한다. env 키는 개발하면서 필요한 만큼 추가한다.
16. production env 정책
   - 결정: production에서도 서버 내부 로컬 env 파일 사용을 허용한다.
17. Slack admin/write 권한 모델
   - 결정: 최초 admin은 setup CLI가 생성한 1회성 랜덤 코드를 Slack에서 입력해 등록한다. 이후 admin이 Slack user id 또는 user group 기준으로 admin/write 권한을 추가/삭제한다.
18. GitHub bot disclosure
   - 결정: GitHub PR review/comment에는 `Posted by Cinnamon bot after Slack approval from <@SLACK_USER_ID>.` 문구를 붙인다.

## 15. MVP 기본 결정안

현재 MVP 기본 결정안은 다음과 같다. 사용자가 반대하거나 우선순위를 바꾸면 PRD와 구현 스펙을 함께 조정한다.

1. Phase 1은 Slack + GitHub PR Assistant로 시작한다.
2. GitHub 인증은 bot 계정과 `gh` CLI를 우선 사용한다.
3. PR 알림은 Slack GitHub App과 유사한 repo 구독 및 feature 구독 기반 자동 알림으로 구현한다.
4. 모든 GitHub write 작업은 사용자 승인 후 실행한다.
5. 첫 런타임은 AI agent adapter interface 위에 Codex 구현을 두고, Claude adapter skeleton을 추가한다.
6. 메모리는 Hermes 에이전트처럼 repo 루트의 `memory.md` 파일로 관리한다.
7. 운영 콘솔은 MVP에서 제외하고 setup CLI로 생성한 로컬 env, Slack 자연어 설정, 작업 로그로 대체한다.
8. Terraform/AWS는 plan-first workflow로 제공하고, 모든 write는 Slack `yes` 승인 후 허용한다.
9. AWS 권한은 bot 전용 IAM role과 short-lived session을 우선 사용한다.
10. Slack/MCP/Skill allowlist와 emergency admin/write override는 setup CLI가 생성한 로컬 env로 관리하고, 운영 중 admin/write grant는 SQLite에 저장한다.
11. repo 구독, MCP/Skill 등록, 메모리, 알림 필터는 Slack 자연어 설정 명령을 기본 경로로 제공한다.
12. 모든 로그는 항상 남긴다.
13. 첫 로그/모니터링 소스는 서버 내부 저장 로그이며, Slack 자연어로 조회/분석한다.
14. 서버 최초 설정은 setup CLI가 대화형으로 로컬 env를 생성하는 방식으로 제공한다.
15. env 스키마는 개발하면서 채우고 확장한다.
16. production도 서버 내부 로컬 env 사용을 허용한다.
17. 최초 admin은 setup CLI가 생성한 1회성 Slack bootstrap code로 등록하고, 이후 admin/write 권한은 Slack user id와 user group 기준으로 관리한다.
18. GitHub PR review/comment에는 `Posted by Cinnamon bot after Slack approval from <@SLACK_USER_ID>.` disclosure를 붙인다.
19. 서버 직접 접속이 필요한 설정은 break-glass 운영으로 취급하고 일반 사용자 경로에서 제외한다.
