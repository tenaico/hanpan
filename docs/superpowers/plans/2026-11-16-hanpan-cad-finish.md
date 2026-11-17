# 한판 AI 도면 6단계(언어·도움말·문서·마무리) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 도면 탭을 배포할 수 있는 상태로 만든다: 21개 언어 문구를 용어집에 맞춰 다듬고, 도움말 주제 `cad`를 21개 언어로 쓰고, 어두운 테마와 크기를 확인하고, 사용자 문서를 고치고, 가지 전체를 새 검토자에게 맡긴 뒤 PR을 연다.

**Spec:** 설계 문서 2장 목표 7, 9장 언어, 10장 6단계 관문("모든 검사 통과, 설치본에서 완료 기준 확인").

## Global Constraints

- 앞 단계 계획의 Global Constraints가 그대로 적용된다.
- 용어집(`apps/cad/AGENTS.md`)의 21개 언어 열을 먼저 채우고, 모든 문구가 그 용어를 쓴다.
- 도움말은 다른 주제와 같은 구조(영어판과 같은 제목 수·순서, `npm run check:help-langs` 통과).
- 사용자 문서는 사용자 전역 규칙(쉽지만 자세히, 업무 지식 먼저)을 따른다. `docs/manual/images`는 커밋하지 않는다.
- push와 PR은 이 단계 끝에서 한 번. 릴리스 게시는 하지 않는다(따로 확인).

---

### Task 1: 용어집과 21개 언어 다듬기

- [ ] `apps/cad/AGENTS.md` 용어집에 21개 언어 열을 채운다.
- [ ] `apps/cad/src/renderer/i18n/{app,ai}/*.ts`, `apps/cad/src/main/i18n-main.ts`, 셸 `tMain`·`strings.ts`의 cad 열쇠를 용어집과 맞춘다. 시험 `apps/cad/tests/glossary.test.ts`: 언어마다 용어집의 "도형", "구멍", "작업판", "치수 도면" 번역이 해당 문구들에 그대로 쓰인다(예: `ko.shapeBox` 같은 열쇠가 아니라 `holeButton` 같은 문구 안에 그 언어의 "구멍" 낱말).
- [ ] 커밋 `i18n(cad): glossary and consistent terms in 21 languages`.

### Task 2: 도움말 주제 `cad`

- [ ] `apps/shell/src/renderer/src/i18n/help/topics/cad.<언어>.md` 21개(영어 원본 → 나머지). 내용: 무엇을 하는 탭인가, 여는 길(홈 카드, 파일 열기 6종, DWG·STEP 안내), 도형 놓기·손잡이·속성 창, 구멍과 묶기, 직접 그리기, 치수 재기, 치수 도면, 한글로 보내기, AI 도우미(예시 요청 3개), 저장과 복구, 할 수 없는 것.
- [ ] `help-registry.ts`·`help-titles.ts`에 등록. `npm run check:help-langs` PASS. 셸 시험 PASS.
- [ ] 커밋 `docs(help): AI Drawing help topic in 21 languages`.

### Task 3: 어두운 테마, 크기, 빈 화면 점검

- [ ] e2e로 밝게·어둡게 두 테마에서 탭을 찍어(`screenshotPath`) 눈으로 확인한다. 화면 틀이 토큰만 쓰는지 `npm run check:theme-colors`.
- [ ] `npm run build:all` 뒤 `apps/cad/out` 크기와 wasm 크기를 재서 설계 문서 4장에 적는다("한판에 더해지는 크기").
- [ ] WebGL 없는 실행(`--disable-gpu --disable-software-rasterizer`로 e2e 한 번)에서 안내 화면이 보이는지 확인한다.
- [ ] 커밋 `test(e2e): cad themes and no-WebGL screen`, `docs: record the AI Drawing size`.

### Task 4: 사용자 문서

- [ ] `docs/프로젝트이해.md`와 `docs/매뉴얼.md`의 해당 장에 "AI 도면"을 더한다(기능 목록, 하루 따라가기 예시에 연필꽂이·회의실 배치, 매뉴얼은 번호 단계로). 루트 `AGENTS.md`·`CLAUDE.md` 구조 목록에 `apps/cad`.
- [ ] 설계 문서 10장에 단계별 실적과 남은 일(담당·기한)을 갱신한다.
- [ ] 커밋 `docs: AI Drawing in the project guide and the manual`.

### Task 5: 가지 전체 검토와 PR

- [ ] 전체 검사: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run licenses`, `npm run check:english-comments`, `npm run check:theme-colors`, `npm run check:help-langs`, `npx playwright test e2e/cad-tab.spec.ts e2e/crash-recovery.spec.ts e2e/home.spec.ts e2e/home-board.spec.ts e2e/mindmap-tab.spec.ts`.
- [ ] 새 검토자(가장 좋은 모델)에게 `main..feat/cad-tab` 전체를 맡긴다. Critical·Important는 한 번에 고치고(시험 RED→GREEN), Minor는 기록.
- [ ] push, PR(본문 한국어 요약 + 영어, 끝 줄 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`), CI 확인. CI가 초록이면 사용자 메모리 규칙(한판은 CI 초록이면 직접 합치기)대로 합친다. 릴리스 게시는 따로 확인.
