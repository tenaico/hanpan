# 한판 AI 도면 2단계(탭 뼈대) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 "AI 도면" 카드로 `cad` 탭이 열리고, `.ttukcad` 열기·저장·다른 이름으로 저장·닫기 확인·복구 사본·새 창이 마인드맵 탭과 같이 동작하며, 가운데에 빈 3D 작업판이 보인다.

**Architecture:** `apps/cad`는 `apps/mindmap`과 같은 모양의 편집기 모듈이다. 메인 코드(`src/main`)는 셸 번들에 상대 경로로 들어가고, 화면은 `genoffice-app://cad/`에서 열린다. 문서는 화면이 쥐고(`@genoffice/cad-engine`의 `CadHistory`), 저장할 바이트를 화면이 만들어 메인에 넘기면 메인이 `openCadFile`로 다시 열어 본 뒤 `atomicWriteFile`로 쓴다.

**Tech Stack:** Electron 43, electron-vite 5, React 19, TypeScript 5.9, vitest 4(jsdom), Playwright e2e, three.js(MIT, 새 의존성), `@genoffice/cad-engine`.

**Spec:** `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md` (4장, 6장의 3D 화면·3D를 못 쓰는 PC, 7-1, 7-2, 9장, 10장 2단계 관문).

**기준 구현:** `apps/mindmap`. 이 계획이 따로 정하지 않은 동작은 마인드맵의 같은 자리를 그대로 따른다(이름의 `mindmap`→`cad`, `Mindmap`→`Cad`, `MINDMAP`→`CAD`). 마인드맵에만 있는 기능(내보내기 PDF·인쇄·만들기 창·handoff·seed·sync·send-to-design·make-from-document·링크 열기·그림 고르기)은 옮기지 않는다.

## Global Constraints

- 창구 이름은 모두 `cad:`로 시작한다. 공용 `ai:*`·`app:*`는 등록하지 않고 부르기만 한다.
- 운영체제 파일 연결을 넣지 않는다: `electron-builder.cjs`의 `fileAssociations`·`WIN_OPEN_WITH_ONLY_EXTS`, `installer.nsh`, flatpak·nix MIME, `build/cad.ico`는 건드리지 않는다.
- 만들기 창, 스킬 양식 복사, 다른 앱으로 보내기(0096), 빠른 보기, 드라이브 AI, generate/convert 목록에는 `cad`를 넣지 않는다.
- `.ttukcad`가 아닌 파일(`.dxf`, `.stl`, `.obj`)을 열면 그 내용으로 "제목 없는" 문서가 열리고 제목은 파일 이름(확장자 뺌)이다. 원본 파일에는 쓰지 않는다. 경로를 저장 대상으로 허락하지 않는다.
- `ok`로 열리지 않은 경로에는 쓰지 않는다. 저장 바이트는 메인이 `openCadFile`로 다시 열어 `ok`일 때만 쓴다.
- 파일 크기 한도는 엔진의 `MAX_FILE_BYTES`(100MB)다. 메인이 읽기 전에 `stat`으로 거른다.
- 화면 틀의 색은 `@genoffice/ui/tokens.css` 토큰만 쓴다. 3D 화면의 바닥·격자 색은 `apps/cad/src/renderer/scene/canvas-colors.ts` 표에서 테마별로 읽는다(`check:theme-colors` 통과).
- 앱 악센트·아이콘 색은 `#1F7A8C`.
- 새 의존성은 `three`(MIT)와 `@types/three`(MIT)뿐이다. `npm run licenses` 통과.
- 코드 주석은 영어(`check:english-comments`). `apps/cad/AGENTS.md`는 한국어.
- 화면 문구는 21개 언어를 모두 실제 번역으로 채운다(이 단계에서 생긴 열쇠만). `zh`가 열쇠를 정한다.
- 화면에 보이는 이름: 한국어 "AI 도면", 영어 "AI Drawing". 제목 없는 문서: "제목 없는 도면" / "Untitled Drawing".
- 홈 카드 열쇠(AppKey)는 `ttukcad`. 기본 고정 목록(`DEFAULT_PINS_*`)에는 넣지 않는다(홈 카드 순서 시험을 깨지 않는다). 모든 앱 목록의 그래픽 묶음에 넣는다.
- 개발 서버 포트: `CAD_DEV_PORT || 5183`, 환경 변수 `CAD_RENDERER_URL`.
- 커밋: `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`, 영어 Conventional Commits, 끝 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. push·PR은 6단계 뒤.
- 앱·e2e 실행은 임시 프로필만. 실제 AI 요청 없음. 내가 띄운 PID만 끈다.

## Review Focus

1. 같은 `.ttukcad`를 두 탭에서 열 때: 이미 열린 탭으로 간다(`findCadTabByPath`). 시험은 Task 4.
2. 저장 도중 탭을 닫거나 이름이 바뀔 때: 마인드맵과 같은 순서 보장. 시험은 Task 2(`fileRenamed` 뒤 저장이 새 경로로 간다).
3. 고장 난 `.ttukcad`(JSON 아님, 판 번호 2, 100MB 초과): 탭은 열리되 저장 대상이 없고, 화면에 이유가 보인다. 시험은 Task 2·3.
4. WebGL을 만들 수 없는 PC: 빈 화면 대신 안내 화면. 시험은 Task 3(`getContext`가 null).
5. 저장 안 한 제목 없는 문서가 있는 채로 창을 닫을 때: 창 닫기 확인에 들어간다. 시험은 Task 4(`window-close-guard`).

---

### Task 1: `apps/cad` 뼈대와 계약

**Files:**
- Create: `apps/cad/package.json`, `tsconfig.json`, `electron.vite.config.ts`, `vite.renderer.config.ts`, `vitest.config.ts`, `AGENTS.md`, `tests/setup.ts`
- Create: `apps/cad/src/shared/ipc.ts`, `apps/cad/src/main/index.ts`(단독 실행 진입점), `apps/cad/src/main/atomic-write.ts`
- Create: `apps/cad/src/main/cad-main.ts`(이 작업에서는 내보내는 함수의 몸통을 `throw new Error('not implemented')`로 둔 틀)
- Modify: 루트 `package.json`(`test`·`typecheck`·`dev`·`build:all`), `tools/build-stale-preloads.mjs`, `tools/gen-third-party-notices.mjs`, `apps/shell/package.json`(`@genoffice/cad-engine` 의존성)
- Test: `apps/cad/tests/ipc.test.ts`

**Interfaces (Produces):**
- `CAD_CHANNELS` (`apps/cad/src/shared/ipc.ts`): `consumePending 'cad:consume-pending'`, `openFile 'cad:open-file'`, `save 'cad:save'`, `saveRequest 'cad:save-request'`, `saveRequestAck 'cad:save-request-ack'`, `dirtyChanged 'cad:dirty-changed'`, `closeSaveRequest 'cad:close-save-request'`, `closeSaveResult 'cad:close-save-result'`, `fileRenamed 'cad:file-renamed'`, `menuCommand 'cad:menu-command'`, `recoveryCopy 'cad:recovery-copy'`, `recoveryCopyNow 'cad:recovery-copy-now'`, `recoveryCopyNowDone 'cad:recovery-copy-now-done'`, `recoveryReset 'cad:recovery-reset'`, `exportFile 'cad:export-file'`(3단계), `copyImage 'cad:copy-image'`(4단계), `sendToDocument 'cad:send-to-document'`(4단계), `summaryRequest 'cad:summary-request'`, `summaryResult 'cad:summary-result'`, `bytesRequest 'cad:bytes-request'`, `bytesResult 'cad:bytes-result'`.
- `APP_CHANNELS`, `AI_CHANNELS`: 마인드맵 `shared/ipc.ts`의 같은 표를 그대로 옮긴다(값이 같아야 한다).
- 자료 꼴:
  - `OpenFileResult = { kind: 'cad'; bytes: Uint8Array; path: string } | { kind: 'import'; bytes: Uint8Array; name: string; ext: 'dxf' | 'stl' | 'obj' } | { kind: 'error'; reason: 'not-found' | 'too-large' | 'unreadable' | 'unsupported'; name: string }`
  - `SaveMode = 'save' | 'saveAs'`
  - `SaveCadRequest = { bytes: Uint8Array; mode: SaveMode; suggestedName: string }`
  - `SaveCadResult = { status: 'saved'; path: string } | { status: 'canceled' } | { status: 'refused'; reason: 'not-reopenable' | 'write-failed' }`
  - `CadMenuCommand = 'undo' | 'redo' | 'selectAll' | 'delete' | 'viewTop' | 'viewFront' | 'viewSide' | 'viewFit'`
  - `RecoveryCopyResult`: 마인드맵과 같은 꼴.
  - `CadApi`: `window.cadApi`의 형(아래 Task 2·3이 채운다): `getLanguage`, `onLanguageChanged`, `getTheme`, `onThemeChanged`, `getKoreanDocFeatures`, `onKoreanDocFeaturesChanged`, `consumePending`, `openFile`, `save`, `onSaveRequest`, `saveRequestAck`, `setDirty`, `onCloseSaveRequest`, `closeSaveResult`, `onFileRenamed`, `onMenuCommand`, `recoveryCopy`, `onRecoveryCopyNow`, `recoveryCopyNowDone`, `onRecoveryReset`, `onSummaryRequest`, `summaryResult`, `onBytesRequest`, `bytesResult`.
- `cad-main.ts`가 내보내는 이름(스펙 7-1. 몸통은 Task 2): `configureCadRuntime(paths: { preloadPath: string; rendererUrl?: string; rendererFile?: string }): void`, `createCadView(openPath?: string | null): WebContentsView`, `cadIsDirty(id: number): boolean`, `cadFilePath(id: number): string | undefined`, `requestCadSave(wc, mode: SaveMode): Promise<boolean>`, `requestCadClose(wc, parent?: BrowserWindow | null): Promise<boolean>`, `cadSaveToPath(wc, filePath: string): Promise<void>`, `cadFileRenamed(wc, oldPath, newPath): void`, `cadRecoveryIdentity(id): RecoveryIdentity | null`, `discardCadRecovery(wc): void`, `writeCadCopiesNow(timeoutMs?: number): Promise<void>`, `openCadFileWithDecision(wc, req: RecoveryOpenFileRequest): void`, `openCadUntitledCopy(wc, req: RecoveryOpenUntitledRequest): void`, `sendCadMenuCommand(wc, cmd: CadMenuCommand): void`, `setCadFileSavedHook(hook: (wc, path: string) => void): void`, `setCadRecoveryTitleHook(hook: ((wc) => string | null | undefined) | null): void`, `cadReadSummary(wc): Promise<string>`, `cadReadBytes(wc): Promise<Uint8Array>`, `CAD_DONT_SAVE_HOLD_MS`. (`setCadSendToDocumentHook`은 4단계에서 더한다.)

- [ ] **Step 1: 실패하는 시험** `tests/ipc.test.ts`: `Object.values(CAD_CHANNELS)`가 모두 `/^cad:[a-z-]+$/`이고 중복이 없다. `AI_CHANNELS`가 `apps/mindmap/src/shared/ipc.ts`의 `AI_CHANNELS`와 같다(`toEqual`). `APP_CHANNELS`도 같다.
- [ ] **Step 2:** `npx vitest run tests/ipc.test.ts` (in `apps/cad`). Expected: FAIL(모듈 없음).
- [ ] **Step 3:** 파일을 만든다. `package.json`은 마인드맵을 따르되 `mind-elixir`·`xmind-engine` 대신 `@genoffice/cad-engine: "*"`, `three`, `@types/three`. 설정 파일은 마인드맵의 것을 옮기고 포트만 5183. `tests/setup.ts`는 마인드맵 setup의 Uint8Array·matchMedia 부분만. `AGENTS.md`(한국어): 맡은 범위, 맡지 않는 것, 항상 지켜야 하는 것(위 Global Constraints의 파일·창구 규칙), 용어집 자리(6단계에서 채움).
- [ ] **Step 4:** `npm install three @types/three --workspace=apps/cad` 뒤 `npx vitest run tests/ipc.test.ts` Expected: PASS. `npm run licenses` Expected: PASS.
- [ ] **Step 5:** 루트 `package.json`의 `test`·`typecheck`에 `npm run test|typecheck -w @genoffice/cad` 추가(마인드맵 바로 뒤), `dev`에 `cad` 이름과 `CAD_RENDERER_URL=http://localhost:5183`, `build:all`에 `npm run build -w @genoffice/cad`. `build-stale-preloads.mjs`의 `APPS`, `gen-third-party-notices.mjs`의 원천 목록에 `apps/cad/src`.
- [ ] **Step 6:** `npm run typecheck -w @genoffice/cad` Expected: PASS. 커밋 `feat(cad): scaffold the AI Drawing editor module and its IPC contract`.

### Task 2: 메인 프로세스(열기·저장·닫기 확인·복구)

**Files:**
- Modify: `apps/cad/src/main/cad-main.ts`
- Create: `apps/cad/src/main/recovery-main.ts`, `apps/cad/src/main/i18n-main.ts`, `apps/cad/src/main/mcp-queries.ts`, `apps/cad/src/preload/index.ts`
- Test: `apps/cad/tests/main.test.ts`, `recovery-main.test.ts`, `main-i18n.test.ts`

**Interfaces:** Consumes Task 1의 계약. Produces 위 `cad-main.ts` 이름 전부의 실제 동작, `window.cadApi`.

동작(마인드맵 `mindmap-main.ts`·`recovery-main.ts`를 따르고, 다른 점만 적는다):
- `openFile(path)`: 허용된 경로만. `stat` 크기가 `MAX_FILE_BYTES` 초과면 `{kind:'error', reason:'too-large'}`. 확장자 `.ttukcad`는 바이트를 읽어 `openCadFile`이 `ok`면 그 뷰의 저장 대상으로 허락하고 `{kind:'cad'}`, 아니면 저장 대상 없이 `{kind:'cad'}`를 돌려주되 허락하지 않는다(화면이 엔진으로 다시 열어 이유를 보인다). `.dxf`·`.stl`·`.obj`는 `{kind:'import', name: 확장자 뺀 파일 이름}`. 그 밖은 `unsupported`.
- `save(req)`: `openCadFile(req.bytes).status !== 'ok'`면 `{status:'refused', reason:'not-reopenable'}`. `saveAs`이거나 저장 대상이 없으면 저장 대화 상자(필터 `tm('filterCad')` `['ttukcad']`, 기본 이름 `suggestedName + '.ttukcad'`, 기본 폴더는 마인드맵과 같은 규칙). 확장자가 없으면 `.ttukcad`를 붙인다. `atomicWriteFile`.
- 복구: `registerRecoveryEditor({ kind: 'cad', ... })`, 저장소 폴더 `<userData>/cad-autosave`, 기본 확장자 `.ttukcad`.
- `cadReadSummary`: 화면에 `summaryRequest`를 보내고 `summaryResult`(문자열)를 기다린다(5초). `cadReadBytes`도 같다.
- `i18n-main.ts`: `dlgSaveTitle`, `filterCad`, `untitledFile`, `closeUnsavedTitle`, `closeUnsavedMessage`, `closeUnsavedDetail`, `btnSave`, `btnDontSave`, `btnCancel`, `saveRefused` 21개 언어.

- [ ] **Step 1: 실패하는 시험** `main.test.ts`(마인드맵 `tests/main.test.ts`의 electron 가짜를 따른다):
  - `open .ttukcad that opens ok grants the path; a later save writes there`
  - `open .ttukcad that does not open ok grants nothing; save asks for a new path`
  - `open .stl returns import with the file name and grants nothing`
  - `a file over MAX_FILE_BYTES is refused before it is read` (`readFile`이 불리지 않음)
  - `save refuses bytes that do not reopen` (`atomicWriteFile`이 불리지 않음)
  - `save as adds .ttukcad when the picked name has none`
  - `after fileRenamed a save goes to the new path`
  - `close with unsaved changes asks; Don't Save closes; Cancel keeps`
  `recovery-main.test.ts`: 복구 저장소 폴더 이름 `cad-autosave`, 기본 확장자 `.ttukcad`, 마인드맵 `recovery-main.test.ts`의 식별자 시험을 옮긴 것. `main-i18n.test.ts`: 21개 언어 모두 같은 열쇠, 빈 값 없음.
- [ ] **Step 2:** `npx vitest run tests/main.test.ts tests/recovery-main.test.ts tests/main-i18n.test.ts` Expected: FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 Expected: PASS. `npm run typecheck -w @genoffice/cad` PASS.
- [ ] **Step 5:** 커밋 `feat(cad): open, save, close prompt and recovery copies in the main process`.

### Task 3: 화면(문서 세션, 복구 사본, 빈 3D 작업판)

**Files:**
- Create: `apps/cad/src/renderer/index.html`, `main.tsx`, `App.tsx`, `styles.css`, `env.d.ts`
- Create: `apps/cad/src/renderer/document/session.ts`, `open.ts`, `recovery-copies.ts`, `autosave.ts`
- Create: `apps/cad/src/renderer/scene/viewport.ts`, `canvas-colors.ts`, `NoWebGl.tsx`
- Create: `apps/cad/src/renderer/i18n/app/<21>.ts`, `strings-app.ts`, `strings.ts`, `locale.tsx`
- Test: `apps/cad/tests/session.test.ts`, `open.test.ts`, `recovery-copies.test.ts`, `viewport.test.ts`, `app.test.ts`, `i18n.test.ts`

**Interfaces:**
- Consumes: `window.cadApi`(Task 1 형), 엔진의 `CadHistory`, `createDocument`, `openCadFile`, `saveCadFile`, `readStl`, `readObj`, `readDxf`, `drawingPartFromDxf`, `addPart`.
- Produces:
  - `class CadSession { constructor(doc: CadDocument, opts: { path?: string; title: string }); history: CadHistory; dirty(): boolean; markSaved(): void; saveBytes(): Uint8Array; title(): string; path(): string | undefined; setPath(p: string): void; summary(): string }`. `dirty()`는 `history.revision()`이 마지막 저장 때의 값과 다르면 참(되돌려서 같은 값이 되어도 참으로 둔다. 마인드맵과 같은 보수적 규칙).
  - `openResultToSession(r: OpenFileResult, untitledTitle: string): { session: CadSession; notice: null | 'not-ok' | 'too-large' | 'unreadable' | 'unsupported' | 'import-failed' }`. `.ttukcad`가 `ok`가 아니면 빈 문서 + `notice:'not-ok'`(저장 대상 없음). import는 STL·OBJ를 `addPart`(mesh)로, DXF는 `drawingPartFromDxf`로 한 부품을 넣은 새 문서, 제목은 `r.name`, 경로 없음.
  - `summary()`: 영어 한 덩어리 글. 첫 줄 `AI Drawing "<title>": N parts`, 부품마다 `- <name> (<kind>) w×d×h mm at (x, y, z)`. 50개 넘으면 `… and K more`.
  - `RecoveryCopier`: 마인드맵 `recovery-copies.ts`와 같은 규칙. 큰 문서 기준은 삼각형 20만 개(스펙 7-2)이고, 입력 표시는 `history.revision()` 변화로 센다.
  - 자동 저장: 경로가 있는 문서만, 30초마다와 창이 뒤로 갈 때(`visibilitychange`), 바뀐 것이 있을 때만.
  - `createViewport(host: HTMLElement, theme: 'light' | 'dark'): Viewport | null`: three.js `WebGLRenderer`를 만들 수 없으면 null. `Viewport = { setTheme(t): void; showDocument(doc: CadDocument): void; dispose(): void }`. 작업판(`doc.workplane.width × depth`) 크기의 바닥과 격자(`grid`mm 간격), 원근 카메라, 마우스 돌리기·밀기·확대(three의 `OrbitControls`). `webglcontextlost`면 다시 만들고 문서는 그대로. 이 단계는 메시를 그리지 않는다(`showDocument`는 작업판 크기만 반영).
  - `canvas-colors.ts`: `CANVAS_COLORS: Record<'light' | 'dark', { background: string; plane: string; grid: string; gridMajor: string }>`.
  - App: 위쪽에 제목과 저장 상태 한 줄(리본은 3단계), 가운데 3D, WebGL이 없으면 `NoWebGl`(이유 + "그래픽 드라이버를 갱신한다", "하드웨어 가속을 켠다"), 열기 알림(`notice`)은 위쪽 띠 한 줄.
  - 화면 문구 열쇠(21개 언어): `untitled`, `saved`, `unsaved`, `noWebGlTitle`, `noWebGlBody`, `noWebGlDriver`, `noWebGlAccel`, `noticeNotOk`, `noticeTooLarge`, `noticeUnreadable`, `noticeUnsupported`, `noticeImportFailed`, `saveRefused`.

- [ ] **Step 1: 실패하는 시험**
  - `session.test.ts`: `new session is clean; an edit makes it dirty; markSaved cleans it`, `saveBytes reopens ok`, `summary lists parts with sizes and caps at 50`.
  - `open.test.ts`: `ttukcad ok opens with its path`, `ttukcad not ok opens empty with notice not-ok and no path`, `stl import makes one mesh part titled by the file name`, `dxf import makes one drawing part`, `error result opens empty with its notice`.
  - `recovery-copies.test.ts`: 마인드맵 `recovery-copies.test.ts`의 경우를 이 세션 꼴로(clean이면 쓰지 않음, 바뀐 뒤 30초에 씀, 실패 뒤 backoff, 저장 중 사본은 버림, 큰 문서는 2초 쉬었을 때).
  - `viewport.test.ts`: `returns null when WebGL cannot be created` (`HTMLCanvasElement.prototype.getContext`가 null), `canvas colours have both themes and only #rrggbb values`.
  - `app.test.ts`: 가짜 `window.cadApi`로 `opens the pending path and shows its title`, `shows the no-WebGL screen with both remedies`, `menu Save calls cadApi.save with bytes that reopen`, `a refused save shows the refusal and stays dirty`, `close-save request answers closeSaveResult(true) after a save`.
  - `i18n.test.ts`: 21개 언어가 `zh`와 같은 열쇠, 빈 값 없음, `ko.untitled === '제목 없는 도면'`, `en.untitled === 'Untitled Drawing'`.
- [ ] **Step 2:** `npx vitest run` (in `apps/cad`) Expected: 새 시험 FAIL.
- [ ] **Step 3:** 구현. CSP는 마인드맵 `index.html`과 같고 `script-src 'self' 'wasm-unsafe-eval'`(3단계에서 manifold wasm을 쓴다).
- [ ] **Step 4:** `npx vitest run` Expected: PASS. `npm run typecheck -w @genoffice/cad` PASS.
- [ ] **Step 5:** 커밋 `feat(cad): document session, recovery copies and an empty 3D workplane`.

### Task 4: 셸 연결

**Files:** 부록 A의 목록 전부. Test: 부록 A의 셸 시험에 `cad` 행 추가.

**Interfaces:** Consumes Task 1의 `cad-main.ts` 이름. Produces `TabManager.openCadTab(openPath?: string): TabSummary`, `findCadTabByPath(p): Tab | undefined`, `activeCadTab()`, `dirtyCadTabs()`, `HOME_CHANNELS.newCad = 'home:new-cad'`, `window.aiOffice.newCad(opts?)`, `CAD_RE = /\.ttukcad$/i`, `CAD_IMPORT_RE = /\.(dxf|stl|obj)$/i`.

- 길 찾기: `.ttukcad`는 항상 `cad` 탭. `.dxf`·`.stl`·`.obj`는 다른 편집기가 맡지 않을 때만 `cad` 탭(먼저 기존 표에 이 확장자가 있는지 보고, 있으면 그 편집기를 그대로 둔다).
- 열기 대화 상자 필터: `{ name: tm('filterCad'), extensions: ['ttukcad', 'dxf', 'stl', 'obj'] }`.
- 탭 메뉴 `buildCadMenu()`: 파일(새로 만들기, 열기, 홈으로, 저장, 다른 이름으로 저장, 닫기), 편집(되돌리기, 다시 하기, 모두 고르기, 지우기: `sendCadMenuCommand`, `registerAccelerator:false`), 보기(위·앞·옆, 화면에 맞추기). 인쇄 없음(`NO_PRINT`).
- 셸 문구(21개 언어): `tMain`에 `untitledCad`, `menuNewCad`, `filterCad`, 보기 메뉴 `menuViewTop`·`menuViewFront`·`menuViewSide`·`menuViewFit`(이미 있는 열쇠가 있으면 그것을 쓴다). 렌더러 `strings.ts`에 `newCad`("AI 도면"), `hpCardCadSub`, `filterCad`.
- 아이콘: `tools/gen-file-association-icons.mjs`의 `FORMATS`에 `cad: #1F7A8C`(그림 `cube`, 없으면 그 도구의 그리는 함수에 정육면체 하나를 더한다)와 `MENU_TYPES`에 `cad`. 만든 `menu-cad.png`·`menu-cad@2x.png`, `file-cad.svg`를 커밋한다. `build/*.ico`는 만들지 않는다.
- MCP: `EditorFamily`에 `'cad'`, 형식 등록 `{ family:'cad', label:'AI drawing', ... }`(열기·저장만, 내보내기 없음), `FAMILY_BY_KIND.cad = 'cad'`, `READABLE_KINDS`에 `cad`, 다리의 `cad: { read: cadReadSummary, save: cadSaveToPath }`.

- [ ] **Step 1: 실패하는 시험**: 부록 A의 셸 시험마다 `cad` 경우를 하나씩(예: `app-routing.test.ts`에 `appForPath('a.ttukcad') === 'cad'`, `tab-manager.test.ts`에 `openCadTab` 제목 `Untitled Drawing`, `window-close-guard.test.ts`에 더러운 cad 탭이 확인 목록에 든다, `main-locale-tables.test.ts`에 cad 열쇠 세 개, `launch-paths`·`folder-tree`에 `ttukcad`, `recovery-shell`에 cad 식별자, `mcp`에 cad 읽기).
- [ ] **Step 2:** `npm run test -w @genoffice/shell` Expected: 새 경우 FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** `npm run test -w @genoffice/shell`, `npm run test -w @genoffice/electron-utils`, `npm run typecheck` Expected: PASS.
- [ ] **Step 5:** 커밋 `feat(shell): wire the cad tab kind into routing, tabs, menus, Home, recovery and MCP`.

### Task 5: e2e와 2단계 관문

**Files:** Create `e2e/cad-tab.spec.ts`. Modify `e2e/crash-recovery.spec.ts`(종류 정규식에 `cad`), 설계 문서 10장(2단계 실적과 기간 다시 추정).

- [ ] **Step 1:** `e2e/cad-tab.spec.ts`(마인드맵 `mindmap-tab.spec.ts`를 따른다):
  - `opens from All apps and titles the tab Untitled Drawing` (`openFromAllApps(page, 'ttukcad')`, `waitForPageWithUrl(app, '://cad/')`)
  - `save as writes a .ttukcad that reopens in a new cad tab` (대화 상자를 `app.evaluate`로 가짜, 파일을 엔진 `openCadFile`로 열어 `ok`)
  - `closing with unsaved changes asks` (`dialog.showMessageBox` 가짜, Cancel이면 탭이 남고 Don't Save면 닫힌다)
  - `a crashed cad tab offers its recovery copy` (crash-recovery spec의 방식)
  - `opening an .stl makes an untitled tab named after the file and never writes the .stl`
- [ ] **Step 2:** `npm run build:all` 뒤 `npx playwright test e2e/cad-tab.spec.ts` Expected: PASS(새 시험이라 처음에는 Task 4 결함이 있으면 FAIL, 고친 뒤 PASS).
- [ ] **Step 3:** 전체 검사: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run licenses`, `npm run check:english-comments`, `npm run check:theme-colors`. Expected: 모두 PASS.
- [ ] **Step 4:** 설계 문서 10장에 2단계 실적을 적는다. 커밋 `test(e2e): cad tab opens, saves, asks before closing and recovers`.

---

## 부록 A. 셸에서 고칠 곳 (2026-11-16 조사)

[TS]는 형 검사가 잡아 주는 자리, 나머지는 손으로 넣는다.

- 종류: `apps/shell/src/shared/tabs-api.ts` `TabKind`; `apps/shell/src/shared/recovery-list-api.ts` `RECOVERY_LIST_EDITOR_KINDS` → `RecoveryList.tsx` `KIND_ICONS`·`KIND_LABELS`[TS]; `packages/electron-utils/src/recovery-store.ts` `RECOVERY_EDITOR_KINDS` → `KIND_DEFAULT_EXT`[TS] `cad: '.ttukcad'`; `packages/electron-utils/src/renderer-scheme.ts` `RendererHost`; `apps/shell/src/main/session-record.ts` `DOCUMENT_KINDS`.
- 길 찾기: `apps/shell/src/main/app-routing.ts`; `index.ts`의 `*_RE` 가져오기, `routeDocumentPath`, `OPEN_DIALOG_EXTENSIONS`, 열기 필터; `launch-paths.ts` `LAUNCHABLE_EXTS`; `folder-tree.ts`; `packages/electron-utils/src/drop-open.ts`; `index.ts`의 `CAD_OUT`(배포 `resources/modules/cad`, 개발 `apps/cad/out`), `configureCadRuntime`, `installRendererProtocol({ cad: join(CAD_OUT,'renderer') })`.
- 탭: `tab-manager.ts`(가져오기, `tabShowsDirty`, `tabIsDirty`, `openCadTab`, `openDuplicatePaneTab`, `dirtyCadTabs`, `closeTab` 닫기 확인, `findCadTabByPath`, `activeCadTab`, `createPlainEditorView`[TS]); `detached-windows.ts`(가져오기, `DEFAULT_SIZE` `{1200,850}`, `detachedIsDirty`, `confirmDetachedClose`); `window-close-guard.ts`; `tab-document-actions.ts`(`saveCad` 의존성, `NO_PRINT`에 `cad`); `index.ts`의 `saveCad: requestCadSave`, 점 표시 창구 목록 `'cad:dirty-changed'`, `untitledTabTitle`(`untitledCad`), 이름 바뀜 `cadFileRenamed`, `applyMenuFor` → `buildCadMenu`, `setCadFileSavedHook`(탭 파일, 최근 목록, 대기 폴더), `newCadTab()`, `HOME_CHANNELS.newCad` 처리, `activeCadTarget()`.
- 복구: `recovery-shell.ts`(가져오기, `editorRecoveryIdentity`, `discardEditorRecovery`, `installRecoveryTitleSources`).
- 메뉴·홈: `index.ts` 메뉴 아이콘(`menu-cad{,@2x}.png`), `MenuIconSet`, `TAB_MENU_ICON`[TS], "+" 메뉴, 홈 메뉴 파일 › 새로 만들기, `buildCadMenu()`; `shared/home-api.ts` `newCad`·`HOME_CHANNELS.newCad`; `preload/index.ts` `newCad`[TS]; `shared/home-apps.ts` `APP_GROUPS` 그래픽 묶음 → `home-apps.tsx` `APP_TEXT`[TS]·`isOffered`; `shared/home-filter-groups.ts`; `Home.tsx`(`file-cad.svg`, `FILE_ICONS`, `OPEN_LOCAL_EXTENSIONS`, `NEW_ITEMS`, `homeApps()` 동작[TS]); `TabBar.tsx` `KIND_ICON`[TS]; `DriveBrowser.tsx`는 건드리지 않는다.
- 빌드: `apps/shell/electron-builder.cjs`의 빌드 전 확인 목록(`'../cad/out'`)과 `extraResources {from:'../cad/out', to:'modules/cad'}`. `fileAssociations`·`WIN_OPEN_WITH_ONLY_EXTS`·Windows 아이콘·`installer.nsh`는 건드리지 않는다.
- MCP: `mcp/open-documents-bridge.ts`(의존성, 저장·읽기 분기); `mcp/tools/open-documents-tools.ts` `FAMILY_BY_KIND`[TS]·`READABLE_KINDS`·설명 글; `mcp/tools/formats.ts` `EditorFamily`·형식 등록; `index.ts` MCP 저장 표와 `openDocumentsControl`.
- 문구: `index.ts` `tMain`(21개 블록); `renderer/src/strings.ts`(21개 블록).
- 일관성 시험: `packages/ui/tests/editors-consistency.test.ts`, `editors-skill-tools.test.ts`, `editors-doc-mention.test.ts`, `ai-context-wiring.test.ts`가 편집기 목록을 하드코딩한다. AI 창은 5단계라서 이 단계에서는 목록에 넣지 않고, 실패하면 이유를 적고 5단계로 미룬다.
- 셸 시험: tab-manager, tab-manager-unloaded, detached-windows, window-close-guard, main-locale-tables, app-routing, file-associations(`modules/cad`는 있되 연결은 없음), launch-paths, folder-tree, recovery-shell-*, tab-document-actions, mcp/*, home-apps*. `packages/electron-utils/tests`: recovery-store, renderer-scheme, drop-open.
