# apps/graphics (`@genoffice/graphics`)

AI 포토(탭 종류 `photo`, PhotoCraft 웹판)와 AI 일러스트(탭 종류 `illust`, VectorCraft 웹판)를 맡는 편집기다(결정 0093). 껍데기 앱의 탭(`WebContentsView`) 안에서 호스트 페이지가 웹판을 같은 출처 iframe으로 띄우고, 웹판의 페이지 API(`window.photocraft` / `window.vectorcraft`)로 문서를 다룬다. 탭 하나에 문서 하나다. 화면 이름은 "AI 포토"·"AI 일러스트"이고, 앱 이름 PhotoCraft·VectorCraft는 앱 안에만 보인다.

## 맡은 범위

- 뒷단(`src/main/graphics-main.ts`): 보기 만들기, 연 파일 넘기기, 저장 두 단계(`begin-save`가 대상을 정하고 `commit-save`가 그 대상에만 쓴다), 내보내기·그림 고르기 대화상자, 닫기 확인, 인쇄(`graphics:print`: 화면이 보낸 PNG와 용지로 뒷단이 페이지를 다시 만들어 시스템 인쇄 대화상자로), Ctrl+S·Ctrl+Shift+S·Ctrl+O·Ctrl+N·Ctrl+P 가로채기. 넘긴 파일은 화면이 "앱이 열었다"고 확인해야(`graphics:open-confirmed`) 그 탭의 저장 대상이 된다.
- 형식 표(`src/shared/kinds.ts`): 여는 확장자, 쓰는 확장자, 새 문서 형식, 레이어 없는 형식, 내보내기 형식, 앱 화면 언어. 껍데기 앱의 열기 경로도 이 표를 읽는다.
- 저장 대상 판단(`src/shared/save-target.ts`).
- 호스트 페이지(`src/renderer/`)
  - `frame/`: 페이지 API 기다리기와 시간 제한(`page-api.ts`), 바이트 도우미(`bytes.ts`), 앱이 뜨기 전 브라우저 저장소 준비(`storage-prep.ts`: PhotoCraft 화면 언어, VectorCraft 복구 사본 지우기).
  - `adapters/`: 앱마다 하나(`GraphicsAdapter`). 문서 상태, 저장 바이트, 내보내기, 레이어 여부, 기록 길이와 되돌리기, 캔버스 그림, 문서 요약, 그림 넣기를 앱의 명령으로 바꾼다.
  - `doc/`: 문서 상태 따라가기(`doc-watch.ts`), 바뀜 표시(`dirty-state.ts`), 저장 흐름(`save-flow.ts`, 한 번에 하나는 `single-flight.ts`), 앱이 스스로 저장·내보내기로 만든 파일 가로채기(`capture-watch.ts`), 넘겨받은 파일 열기(`open-flow.ts`).
  - `ai/`: AI 창(`AiPanel.tsx`, `AiDock.tsx`), 도구 7개(`tools.ts`), skill과 앱별 지시문(`graphics-skill.ts`, `prompts/`), 필요할 때 읽는 안내서(`guides.ts`), AI가 못 쓰는 명령(`blocked-commands.ts`), 요청 하나의 되돌리기(`undo-tracker.ts`), 입력 잠금(`input-lock.ts`), 캔버스 그림(`snapshot.ts`), 전송과 구독 연결(`transport.ts`, `connection.ts`, `subscription-client.ts`).
  - `quick/`: 앱마다 빠른 작업 단추 셋(`quick-actions.ts`, `QuickBar.tsx`), 내보내기 대화상자(`ExportDialog.tsx`), 크기 바꾸기(`resize.ts`), 인쇄 미리보기(`PrintDialog.tsx`: 어댑터의 `snapshotPng`로 그림을 받아 `@genoffice/ui`의 `ImagePrintDialog`로 A4에 맞춰 보인다).
  - `i18n/`: 21개 언어. 호스트 문구는 `app/`, AI 창 문구는 `ai/`.
- 웹판 파일은 `tools/fetch-graphics-web.mjs`가 `public/web/<앱>/`에 받고(git 무시), 빌드가 렌더러 출력에 복사한다. 고지 8절은 `tools/graphics-notices.mjs`가 그 폴더에서 만든다.

## 맡지 않는 것 (경계)

- 웹판 자체의 수정은 `tenaico/hanpan-graphics`(계획 A)의 범위다. 이 저장소는 고정된 릴리스를 받을 뿐이다. 앱의 명령이나 동작이 바뀌어야 하면 그쪽에 요청한다.
- 탭, 메뉴, 홈 카드, 열기 경로, 앱 안 MCP의 목록은 `apps/shell`이 한다.
- `ai:*` 채널과 구독 채널은 워드 편집기의 뒷단이 등록한다. 여기서 다시 등록하지 않는다. preload는 부르기만 한다.

## 항상 지켜야 하는 것

- 디스크에 쓰는 길은 `commit-save`와 `export-file`뿐이고, 둘 다 이 뒷단이 고른 경로에만 쓴다. 예외는 복구 사본(`recovery-write`, `src/main/recovery-main.ts`)으로, 프로필의 복구 폴더에만 공용 복구 저장소로 쓴다. 화면 쪽 주기는 `src/renderer/doc/recovery-loop.ts`(바뀐 문서만, 저장·AI 실행 중이 아닐 때, 45초마다, 문서를 바꾸지 않는 `adapter.recoveryBytes()`로). 화면이 보낸 경로를 믿지 않는다. 웹판은 다른 출처(`<앱>-app`)에서 돌아 호스트에 닿지 못하지만, 경로는 언제나 main이 정한다(`docs/security.md`의 "AI 포토·AI 일러스트").
- 웹판은 `genoffice-app://<앱>-app/`의 틀에서 돈다. 호스트는 `connectPageApi`로 메시지만 주고받고, 틀 안의 중계(`frame/frame-agent.ts`)가 페이지 API와 입력 잠금을 맡는다. preload는 웹판 틀에서는 저장소 준비와 중계 심기만 한다. 웹판 틀에 다리를 내놓지 않는다.
- 다리는 창에 두지 않는다. preload는 `graphicsBridge.take()`로 한 번만 넘기고, 호스트는 `main.tsx`에서 틀을 만들기 전에 받아 `src/renderer/bridge.ts`의 모듈 안에만 둔다. 화면 코드는 `graphicsApi()`·`graphicsApiOrNull()`로 쓰고, `window`에 다리를 다시 올리지 않는다. 시험은 `installGraphicsApi(가짜)`를 쓴다.
- 보기는 `backgroundThrottling: false`다. 웹판은 애니메이션 프레임에서 페이지 API에 답하므로, 숨긴 탭에서 AI 실행이나 닫을 때의 저장이 멈추지 않게 한다.
- 운영체제 파일 연결을 하지 않는다. 그래픽 확장자를 `LAUNCHABLE_EXTS`·`fileAssociations`에 넣지 않는다.
- AI 실행과 빠른 작업은 입력 잠금(`lockApp`) 안에서 돈다. 그동안 가로챈 파일은 저장으로도 내보내기로도 쓰지 않는다.
- AI가 부를 수 없는 명령 목록(`blocked-commands.ts`)을 줄이지 않는다. 저장·열기·내보내기, 앱 설정, 되돌리기는 사람 몫이다.
- 앱 문구와 AI 문구는 21개 언어를 모두 채운다.

## 이 모듈의 방식

- 앱 상태는 1초마다 묻는다(`watchDoc`). 한 번에 하나만 묻고, 바뀐 것만 알린다. 앱 호출에는 시간 제한이 있다.
- 되돌리기는 명령 수가 아니라 앱 기록 길이로 잰다. 앱은 명령마다 기록을 하나씩 더하지 않는다. 실행이 끝난 뒤의 표시는 문서의 `revision`이다. 사람이 앱에서 되돌리거나 새로 고치면 바뀌어, [되돌리기]가 사람의 작업을 건드리지 않는다.
- Stop은 실행을 바로 끝내지만, 앱에 이미 보낸 명령은 끝까지 돈다. 패널은 그 명령이 끝난 뒤에(`GraphicsSkill.settled()`) 단계를 세고 잠금을 푼다. 묶음은 Stop 뒤의 단계를 돌리지 않는다.
- PhotoCraft에서 탭의 문서는 첫 문서다. 스마트 개체 내용·복제가 연 다른 문서가 앞에 있으면 저장을 거절하고, 그 문서의 바뀜도 탭의 바뀜으로 친다.
- 웹판은 계획 A 릴리스 `photo-v0.20.2-h2`·`illust-v0.21.0-h2`로 고정한다. PhotoCraft의 저장은 `request('app.save', {path})`다. PSD는 진짜 저장이고, PNG·JPEG 같은 평평한 형식은 사본이라 앱의 수정 표시가 남는다. 어댑터는 그 저장 뒤 앱의 `revision`이 바뀌기 전까지 탭을 깨끗하게 본다.
- PhotoCraft는 첫 화면이 뜨기 전 `openFile`에 `false`로 답한다. 넘겨받은 파일은 시간 제한 안에서 다시 건넨다(`open-flow.ts`). AVIF는 열리지 않아 열기 목록에서 뺐다(2026-11-05 확인).
- PhotoCraft의 사본 내보내기와 AI의 캔버스 그림은 `request('app.exportImage', …)`(h2)로 받는다. 파일을 쓰지 않고 문서도 상태 줄도 건드리지 않는다. 한판이 앱에 파일로 쓰게 하는 사본은 이름이 `.hanpan-export-`로 시작하고, 가로채기 감시는 이것을 앱의 내보내기로 읽지 않는다.

## 테스트

- `npx vitest run`(이 폴더). 뒷단은 Electron을 가짜로 바꿔 시험한다(`tests/graphics-main.test.ts`). AI 창은 가짜 전송과 가짜 앱으로 시험한다(`tests/ai-panel.test.tsx`). 실제 `claude`·`codex`에는 닿지 않는다.
- e2e: `e2e/graphics.spec.ts`. 웹판이 `out/renderer/web`에 있어야 돈다.
- 바꾸면 반드시: 저장 흐름이나 가로채기를 고치면 `tests/doc-flow.test.ts`와 e2e, AI 도구를 고치면 `tests/ai-tools.test.ts`(명령 목록 고정본 `tests/fixtures/vectorcraft-0.21.0-commands.json`).
