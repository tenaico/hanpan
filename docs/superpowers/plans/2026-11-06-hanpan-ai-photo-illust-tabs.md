# 계획 B: 한판 AI 포토·AI 일러스트 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**완료 기준:** 11/13 시연 노트북에 GitHub에서 빌드한 설치파일을 깔고, AI 포토·AI 일러스트 탭에서 새로 만들기 → 열기 → 큰 모델 AI 요청 → 한 번에 되돌리기 → 빠른 작업 → 저장 → 닫기 확인이 리허설 순서대로 된다.

**Goal:** 한판에 탭 종류 `photo`(AI 포토, PhotoCraft 웹판)와 `illust`(AI 일러스트, VectorCraft 웹판)를 더하고, 탭 안의 AI 도우미와 빠른 작업 단추가 웹판의 페이지 API로 문서를 직접 고치게 한다. 설치형 PhotoCraft·VectorCraft는 뺀다.

**Architecture:** 새 편집기 패키지 `apps/graphics` 하나가 두 탭 종류를 맡는다.

- 호스트 페이지(React)가 같은 출처 iframe으로 웹판(`./web/<kind>/index.html?embedded=hanpan&lang=…`)을 띄우고 `iframe.contentWindow.photocraft|vectorcraft`를 부른다(HWP 탭의 rhwp-studio와 같은 방식).
- 앱마다 다른 호스트(`genoffice-app://photo/`, `genoffice-app://illust/`)라서 저장 공간이 섞이지 않는다.
- 디스크에 쓰는 것은 main의 저장 흐름(대화상자 → `atomicWriteFile`)뿐이다. 웹판이 내보낸 파일은 `captureDownloads`로 가로채 main에 넘긴다.
- 앱별 차이는 어댑터(`GraphicsAdapter`) 하나에 모은다. 일러스트 어댑터는 이 PC에서 확인한 공식 VectorCraft 0.21.0 동작으로 지금 만들고, 포토 어댑터는 계획 A 릴리스가 나온 뒤(Task 10) 실제 웹판으로 만든다.

**Tech Stack:** Electron 43 (`WebContentsView`, `protocol.handle`), React 19, TypeScript, electron-vite 5, vitest 4(jsdom), Playwright e2e, `@genoffice/agent-core`(`AgentLoop`, `composeWithDrive`), JSZip(웹판 zip 풀기).

**Spec:** `docs/superpowers/specs/2026-11-05-hanpan-ai-photo-illust-design.md`(6-3~6-9, 7장). 계획 A: `docs/superpowers/plans/2026-11-05-hanpan-graphics-web-builds.md`(Task 3·6·7의 Interfaces). 실행자는 이 계획과 두 문서를 같이 읽는다.

## Global Constraints

- **저장소 규칙:** `docs/standards.md`, `apps/shell/AGENTS.md`(EPUB 탭 점검 목록), `docs/engineering-notes.md`.
  - 코드·주석·커밋은 영어다. 화면 문구는 21개 언어를 모두 채우고, 영어를 복사해 채우지 않는다. 한국어·영어는 직접 쓴다.
  - 제품 이름은 문구에서 `GenOffice` 토큰으로 쓴다. 화면 색은 테마 토큰만 쓴다.
  - 편집기 IPC 채널은 `graphics:` 접두어다. `ai:*`를 다시 등록하지 않는다.
- **커밋:** `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`, 영어 Conventional Commits, 끝 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `format:check`가 걸리는 기존 파일은 기능 커밋 뒤 별도 `style:` 커밋으로 맞춘다.
- **이름:** 화면 이름은 "AI 포토"(en "AI Photo"), "AI 일러스트"(en "AI Illustration"). 웹판 안의 PhotoCraft·VectorCraft 이름은 그대로 둔다. ArtCraft 이름·로고는 한판 화면·마케팅에 쓰지 않는다(고지의 출처 문장만 허용).
- **패키지:** `apps/graphics` = `@genoffice/graphics`, dev 렌더러 포트 5182, 환경변수 `GRAPHICS_RENDERER_URL`.
- **탭 종류:** `TabKind`에 `'photo' | 'illust'`. 탭 하나에 문서 하나.
- **계획 A가 주는 것(바꾸지 않음):**
  - 페이지 API `window.photocraft` / `window.vectorcraft`: `request, execute, commands, inspect, screenshot, openFile, captureDownloads, files, readFile`
  - `?embedded=hanpan`: 열기·최근 파일·닫기·모두 닫기가 꺼지고, 새로 만들기는 문서가 없을 때만 켜진다. 저장·내보내기 메뉴는 남는다. 가로챈 저장 뒤 변경 표시가 꺼진다.
  - 릴리스 태그 `photo-v0.20.2-h1`, `illust-v0.21.0-h1`, 자산 `hanpan-photo-web-0.20.2-h1.zip`, `hanpan-illust-web-0.21.0-h1.zip`(+ `.sha256`), 주소 `https://github.com/tenaico/hanpan-graphics/releases/download/<tag>/<zip>`. 목표 11/6.
  - 그 전에는 공식 VectorCraft 웹판 `%TEMP%\artcraft-web-spike\vectorcraft-web\vectorcraft-web-0.21.0`(API 있음, 한글 글꼴·embedded 없음)을 `GRAPHICS_WEB_ILLUST_DIR`로 쓴다.
  - API나 동작을 바꿔야 하면 계획 A 저장소를 건드리지 않고, 이 세션을 시작한 세션(`local_9447c92e-d77c-46f9-946e-1af2e35cb2b6`)에 알린다.
- **형식(`apps/graphics/src/shared/kinds.ts`가 한 곳에서 정한다):**

  |                             | photo                                                                 | illust                     |
  | --------------------------- | --------------------------------------------------------------------- | -------------------------- |
  | 여는 확장자 `OPEN_EXTS`     | psd, psb, png, jpg, jpeg, webp, gif, bmp, tif, tiff, heic, heif, avif | svg, svgz, ai, vectorcraft |
  | 쓰는 확장자 `WRITABLE_EXTS` | psd, png, jpg, jpeg, webp, tif, tiff                                  | vectorcraft, svg, svgz, ai |
  | 새 문서 `NEW_DOC_EXT`       | psd                                                                   | vectorcraft                |
  | 레이어 없는 형식            | png, jpg, jpeg, webp, gif, bmp, tif, tiff, heic, heif, avif           | (없음)                     |
  | 내보내기 `EXPORT_FORMATS`   | png, jpg                                                              | png, svg                   |

  pdf는 지금처럼 PDF 편집기가 연다. 여는 목록은 Task 10에서 실제 웹판으로 하나씩 열어 보고 실패하는 것을 뺀다.

- **운영체제 파일 연결은 하지 않는다.** 그래픽 확장자는 `LAUNCHABLE_EXTS`·`fileAssociations`·`installer.nsh`에 넣지 않는다. 열기 대화상자, 끌어다 놓기, 폴더 목록, 최근 문서에서만 연다.
- **앱 화면 언어 `appLanguage(kind, lang)`:** ko→ko, en→en, ja→ja, fr/de/es/id/ru/it/pl/cs/nl/vi→같은 코드, pt→pt-br, ar→photo `ar`·illust `en`, zh·zh-TW·he·hi·th·ms→en(중국어·히브리어·데바나가리 글꼴을 넣지 않으므로, 설계 6-2). illust는 주소 `?lang=`, photo는 iframe을 띄우기 전에 localStorage `photocraft.preferences`의 `interface.language`에 넣는다.
- **AI가 부르지 못하는 명령(`BLOCKED_PREFIXES`, 접두어 일치):** `file.`, `app.`, `help.`, `prefs.`, `edit.preferences`, `edit.undo`, `edit.redo`, `edit.clearHistory`, `history.newDocument`, `image.duplicate`, `document.open`, `document.close`, `document.activate`, `document.save`, `document.export`, `document.serialize`, `docInfo.save`, `plugin.`, `plugins.`, `addon.`, `script.`, `scripts.`, `action.`, `actions.`, `automate.`, `presets.`, `imageTrace.presets.save`, `imageTrace.presets.delete`, `links.`, `library.`, `print.`, `webExport.`, `shortcuts.`, `shortcutSet.`, `window.`, `ui.`. 저장·내보내기는 `export_file` 도구와 한판 저장으로만 한다.
- **기준선:** 테스트 실패는 `%TEMP%\hanpan-baseline\baseline-fails.txt`(Windows 66건)와 sheets `promote-file-atomically` 2건과 비교한다. 그 밖의 실패가 없어야 통과다.
- **사용자 확인 뒤에만:** push, GitHub 설치파일 빌드, 설치, 실제 구독으로 AI 확인(한도를 쓴다).
- **건드리지 않는 곳:** `C:\Users\ten\Desktop\hanpan-graphics`(계획 A 세션), 문서 엔진 패키지.

## 이 PC에서 확인한 웹판 동작 (2026-11-05)

공식 VectorCraft 웹판 0.21.0을 Electron에서 `net.fetch(file://)`로 띄워 확인했다(시험 스크립트 `scratchpad/vc-probe/*.js`). PhotoCraft는 v0.20.2 원본 소스와 PR #9345로 확인했다.

| 무엇                                                      | 결과                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inspect()`(= `request('ui.inspect')`, 약 3.8KB)          | `activeDocument`(번호 또는 null), `documents: [{dirty, title}]`                                                                                                                                                                                                                            |
| `execute('file.save', {path})` + `captureDownloads(true)` | 대화상자 없이 끝난다. `files()`에 바로 `{path, size}`가 생기고, 문서는 `dirty:false`, 제목은 그 이름이 된다. svg는 `{svg:{}}`, ai는 `{options:{}}`를 함께 준다                                                                                                                             |
| `execute('file.save', {})`(경로 없음)                     | 앱의 저장 옵션 대화상자가 뜬다(`{pending:'saveOptions'}`)                                                                                                                                                                                                                                  |
| `execute('document.save', {path})`                        | 실패: "no file system here"                                                                                                                                                                                                                                                                |
| `execute('document.export', {format})`                    | `{bytes, dataBase64, format}`. 가로채기·변경 표시와 무관                                                                                                                                                                                                                                   |
| `execute('document.inspect', {ids: []})`(약 0.6KB)        | `history: [이름…]`, `dirty`, `revision`, `selection`, `title`, `tool`, `units`, `artboards`                                                                                                                                                                                                |
| `edit.undo`(되돌릴 것 없음)                               | 오류 "not available right now: nothing to undo"                                                                                                                                                                                                                                            |
| `files()`                                                 | 가로챈 파일을 모두 남긴다. 같은 이름은 덮어쓴다. `readFile`은 지우지 않는다                                                                                                                                                                                                                |
| `readFile`                                                | `Uint8Array`. 11/5 시험에서 바로 복사하지 않고 쓰다가 "memory access out of bounds"가 한 번 났다 → 받자마자 복사한다                                                                                                                                                                       |
| `screenshot()`                                            | VectorCraft는 `{width, height}`만 준다(그림 없음). PhotoCraft는 `{base64}`(창 전체)                                                                                                                                                                                                        |
| `openFile(name, bytes)`                                   | 새 문서로 연다(`true`). PhotoCraft는 Promise가 아니라 boolean을 바로 돌려준다                                                                                                                                                                                                              |
| 복구 데이터                                               | VectorCraft는 2분마다 localStorage `vectorcraft-recovery/…`에 쓰고, 다음 시작 때 "recovery" 대화상자를 띄운다(같은 출처의 다른 탭에서도). `prefs.set {key:'autosaveRecovery', value:false}`로 끈다. PhotoCraft 웹판은 복구 저장이 없다                                                     |
| 파일 형식                                                 | `net.fetch`가 `.wasm`을 `application/wasm`, `.js`를 `text/javascript`로 준다. `.ttf`는 `application/octet-stream`이지만 글꼴이 정상으로 실린다(앱이 SHA-256으로 확인). MIME 수정은 필요 없다                                                                                               |
| 숨긴 탭                                                   | `setVisible(false)`인 `WebContentsView`: `backgroundThrottling:false`면 0.6초, 기본값이면 5초 뒤에 답했다. 한판의 닫기 확인은 그 탭을 먼저 앞으로 꺼낸다(`activateTab`)                                                                                                                    |
| 그림 넣기·따라 그리기                                     | `file.place {name, dataBase64, link:false}` → 넣은 그림이 선택된다 → `imageTrace.makeAndExpand {}` → `{id, paths, anchors, colors}`                                                                                                                                                        |
| `app.language`                                            | `{lang}`. `interfaceLanguage` 환경설정으로 남는다                                                                                                                                                                                                                                          |
| PhotoCraft(소스)                                          | 환경설정 localStorage `photocraft.preferences`(JSON, `interface.language`). `beforeunload`로 닫기를 막는다. 다운로드 저장은 변경 표시를 끄지 않는다(계획 A 패치 4가 고침). 명령 `layer.removeBackground {layer?, sampleAllLayers?, refine?}`, `image.autoTone {}`. `undoGroup` 명령은 없다 |

## Review Focus

1. **쓰기에 실패했는데 앱은 저장됐다고 표시하는 경우**(읽기 전용 폴더, 디스크 가득): `file.save`가 앱의 변경 표시를 끈 뒤 main의 쓰기가 실패하면, 탭은 계속 "저장 안 됨"이어야 하고 닫을 때 다시 묻는다. → Task 4 `a failed write keeps the tab dirty`
2. **AI 실행이 중간에 끊긴 경우**(중지 단추, 연결 오류, 묶음의 세 번째 명령 실패): 그때까지의 변경만 [되돌리기] 한 번으로 정확히 되돌아가고, 입력 막기가 풀린다. → Task 7 `a stopped run still offers to undo the partial changes`
3. **AI가 끝난 뒤 사용자가 더 고친 다음 [되돌리기]를 누른 경우:** 사용자 자신의 편집을 되돌리지 않고, 앱의 되돌리기를 쓰라고 알린다. → Task 6 `undoRun refuses when history changed since the run`
4. **AI가 도는 동안 앱이 파일을 내보내는 경우**(허용된 명령이 뜻밖에 다운로드를 만들 때): 가로챈 파일을 디스크에 쓰지 않는다. 디스크에는 사용자가 고른 저장만 간다(설계 2장 "실패로 볼 것"). → Task 4 `ignores everything while the AI is busy`
5. **AI가 도는 동안 사용자가 다른 탭으로 간 경우:** 숨긴 탭에서도 페이지 API가 답해 실행이 멈추지 않는다. → Task 5 e2e `a hidden graphics tab still answers the page API`

---

### Task 0: 작업 사본 준비 (커밋 없음)

이 작업 사본(`.claude/worktrees/ai-photo-illust-tabs-7ce0ae`)에는 `node_modules`와 빌드 결과가 없다. 본 검사본(`C:\Users\ten\Desktop\hanpan`, 가지 `feat/vn-artcraft-securitykey`)은 건드리지 않는다.

- [ ] **Step 1:** `npm ci`를 백그라운드로 돌린다. Expected: 종료 코드 0, `node_modules/.bin/electron-vite`가 있다. 본 검사본의 `node_modules`를 연결하지 않는다(작업 공간 링크가 본 검사본의 패키지를 가리키게 된다).
- [ ] **Step 2:** 지어 둔 한글 편집기 스튜디오를 복사한다(`engineering-notes.md` "작업 사본을 여럿 둘 때"). `cp -r /c/Users/ten/Desktop/hanpan/apps/hwp/public/studio apps/hwp/public/`
- [ ] **Step 3:** `export PATH="$HOME/.cargo/bin:$PATH"` 뒤 `npm run build:all`(백그라운드). Expected: 성공.
- [ ] **Step 4:** `npm run typecheck`, `npm run lint` → Expected: PASS. 실패하면 기준선 문제로 기록하고 사람에게 알린다.

### Task 1: 설치형 PhotoCraft·VectorCraft 빼기 (설계 6-5)

**Files:** 줄 번호는 6a03d6d3 기준이다. 옮겨졌으면 내용으로 찾는다.

- Delete: `tools/fetch-artcraft.mjs`, `tools/fetch-artcraft.d.mts`, `tools/artcraft-pins.json`, `apps/shell/src/main/hanpan/artcraft.ts`, `apps/shell/src/shared/artcraft-api.ts`, `apps/shell/tests/artcraft-resources.test.ts`, `apps/shell/tests/hanpan-artcraft-ipc.test.ts`, `apps/shell/tests/home-artcraft-cards.test.ts`, `packages/cli/tests/fetch-artcraft.test.ts`
- Modify:
  - `apps/shell/electron-builder.cjs`: 62-77(`ARTCRAFT_APPS`, `assertArtcraftApps`), 748-751(win `extraResources`), 891(beforePack의 `assertArtcraftApps`)
  - `apps/shell/src/main/updater.ts`: `initAutoUpdater`의 `installBlockers` 매개변수(887-891), `onInstall`의 검사(1087-1097), `tUpd`의 `updCloseApps` 21개 언어
  - `apps/shell/src/main/index.ts`: 34(import), 878-887(`artcraftHost`), 8979-8980(`registerArtcraftIpc`), 9222-9226(`initAutoUpdater`의 넷째 인자)
  - `apps/shell/src/preload/index.ts`: 64, 860-861
  - `apps/shell/src/renderer/src/Home.tsx`: 12-13, 1922-1941, 2060-2073, 2140-2144. 2128-2135의 `sub` 줄 분기는 남긴다(Task 5의 카드가 쓴다)
  - `apps/shell/src/renderer/src/hanpan/TemplatePicker.tsx`: 11, 32-34
  - `apps/shell/src/renderer/src/hanpan/home-strings.json`: `hpPhotoCraft`, `hpVectorCraft`, `hpArtcraftTip`, `hpArtcraftFailed`(295-386)
  - `apps/shell/src/renderer/src/strings.ts`: 같은 네 키, 21개 언어
  - `apps/shell/src/renderer/src/hanpan/hanpan.css`: `.hp-artcraft-failed`(853-858)만. `.hp-compact-text`·`.hp-compact-sub`는 남긴다
  - `.github/workflows/windows-build.yml`: 99-102("Fetch ArtCraft apps"), 117-118(실행 파일 확인 두 줄)
  - `tools/gen-third-party-notices.mjs`: 780-828(8절 전체). `gap()`은 남긴다
  - `eslint.config.mjs` 23-24, `.gitignore` 35-37, `.prettierignore` 20, `docs/security.md` 144
  - Tests: `apps/shell/tests/updater.test.ts` 523-548, `apps/shell/tests/hanpan-strings-every-lang.test.ts`(7, 13-16, 1-3 주석은 "decision 0091"만), `e2e/home.spec.ts`(14-16, 17, 32-33)
- Create: `docs/tracking/decisions/0093-hanpan-graphics-web-tabs.md`
- Modify: `docs/tracking/decisions/0090-hanpan-bundles-artcraft-apps.md`(제목 아래 `> **대체됨 → [0093](0093-hanpan-graphics-web-tabs.md)** (2026-11-06). …`), `docs/tracking/decisions/index.md`(0090 줄에 `(대체됨 → 0093)`, 0093 줄 `(0090을 대체)`)
- `apps/shell/src/renderer/src/hanpan/ArtcraftIcon.tsx`는 남긴다(Task 5에서 `GraphicsIcon`으로 이름을 바꾼다).

**Interfaces:**

- Produces: `initAutoUpdater(getWindow, initialChannel = 'stable', autoCheckEnabled = () => true)`(매개변수 셋, 원래 꼴). `hanpanApi`에 `artcraftAvailable`·`openArtcraft`가 없다.

- [ ] **Step 1:** 결정 0093을 쓴다. 맥락(11/5 사용자 결정), 결정(웹판을 탭으로, `tenaico/hanpan-graphics`의 고정 버전, AI 도우미와 빠른 작업 단추, 모든 운영체제, 운영체제 파일 연결 없음), 버린 대안(설치형 + MCP bridge, 탭 + 파일 주고받기: 설계 4장), 결과(Windows 설치판 약 275MB 감소, 모든 운영체제 판에 웹판 두 개가 더해짐, 상표 규칙).
- [ ] **Step 2:** 위 목록대로 지우고 고친다.
- [ ] **Step 3:** Run `rg -i "artcraft|installBlockers|updCloseApps" --glob '!docs/superpowers/**'` → Expected: 결정 0090·0093·index와 `ArtcraftIcon.tsx`만 나온다.
- [ ] **Step 4:** Run `npm run test -w @genoffice/shell`, `npm run test -w @genoffice/cli`, `npm run typecheck -w @genoffice/shell`, `npx eslint apps/shell tools`, `npm run format:check` → Expected: 기준선 밖 실패 없음.
- [ ] **Step 5: 커밋** `refactor(hanpan): drop the bundled desktop PhotoCraft and VectorCraft (decision 0093)`

### Task 2: 웹판 내려받기 도구

**Files:**

- Create: `tools/fetch-graphics-web.mjs`, `tools/fetch-graphics-web.d.mts`, `tools/graphics-web-pins.json`(내용 `{}`. Task 10에서 채운다)
- Modify: `.gitignore`(`/apps/graphics/public/web/`, `/vendor/graphics-web/`), `.prettierignore`(`apps/graphics/public/web/`), `eslint.config.mjs` ignores(`apps/graphics/public/web/**`)
- Test: `packages/cli/tests/fetch-graphics-web.test.ts`

**Interfaces:**

- Produces(`fetch-graphics-web.mjs`, 형은 `.d.mts`):
  - `GRAPHICS_KINDS = ['photo', 'illust']`
  - `type GraphicsWebPin = { repo: string; tag: string; asset: string; size: number; sha256: string }`
  - `readGraphicsPins(path?: string): Partial<Record<'photo' | 'illust', GraphicsWebPin>>`: 기본 경로 `tools/graphics-web-pins.json`. 틀린 값이면 그 칸 이름을 담아 던진다(`owner/name`이 아닌 repo, 빈 tag, `.zip`으로 끝나지 않는 asset, 양의 정수가 아닌 size, 64자리 hex가 아닌 sha256, 모르는 앱 키).
  - `assetUrl(pin): string` = `https://github.com/${repo}/releases/download/${tag}/${asset}`
  - `verifyDownload(path, pin): void`: 지운 `fetch-artcraft.mjs`와 같다(크기 먼저, 다음 SHA-256, 1MiB 단위).
  - `pinStamp(pin)` = `${tag} ${sha256}`, `localStamp(dir)` = `local ${resolve(dir)}`
  - `localDirFor(kind, env): string | null`: `GRAPHICS_WEB_PHOTO_DIR` / `GRAPHICS_WEB_ILLUST_DIR`
  - `isStrict(env): boolean`: `CI` 또는 `IEUM_RELEASE`가 켜져 있으면 참(`gen-third-party-notices.mjs`의 `envFlag`와 같은 판정)
  - `extractZip(zipPath, destDir): Promise<void>`: JSZip. 절대 경로나 `..`로 밖에 나가는 항목이 있으면 아무것도 쓰지 않고 던진다.
  - `flattenSingleRoot(dir): void`: 지운 도구에서 옮긴다.
  - `fetchGraphicsWeb({ root, env, pins, download? }): Promise<Record<'photo' | 'illust', 'cached' | 'fetched' | 'local' | 'missing'>>`
    - 받는 곳 `<root>/apps/graphics/public/web/<kind>/`, 내려받은 zip은 `<root>/vendor/graphics-web/_downloads/<asset>`. `download(url, dest)`는 시험이 바꿔 끼운다(기본: `fetch` + `.part` 뒤 이름 바꾸기).
    - 로컬 폴더가 지정됐으면: strict면 `graphics web <kind>: a local build is not allowed in a release build`로 던진다. 아니면 폴더째 복사하고 `.pin`에 `localStamp`를 쓴다.
    - 핀이 있으면: `.pin`이 `pinStamp`와 같으면 `cached`. 아니면 받아 둔 zip이 맞으면 다시 쓰고, 아니면 내려받는다 → `verifyDownload` → 지우고 풀기 → `flattenSingleRoot` → `.pin`.
    - 둘 다 없으면: strict면 `graphics web <kind>: no pin in tools/graphics-web-pins.json`으로 던진다. 아니면 경고하고 `missing`.
    - 복사·풀기 뒤 `index.html`이 없으면 던진다.
  - CLI(`node tools/fetch-graphics-web.mjs`): 두 앱을 받는다. 실패하면 메시지를 찍고 `process.exitCode = 1`(Windows에서 `process.exit()`를 부르지 않는다, engineering-notes).

- [ ] **Step 1: 실패하는 테스트**

```ts
// packages/cli/tests/fetch-graphics-web.test.ts
test('readGraphicsPins rejects a short sha256') // throws /sha256/
test('readGraphicsPins accepts an empty file') // → {}
test('assetUrl builds the release download address')
// → 'https://github.com/tenaico/hanpan-graphics/releases/download/illust-v0.21.0-h1/hanpan-illust-web-0.21.0-h1.zip'
test('verifyDownload checks the size before the hash') // /size/, then /sha256/i; 'abc' passes with its known sha256
test('extractZip refuses an entry that climbs out of the folder') // '../evil.txt' → throws /outside/, dest stays empty
test('extractZip writes nested files') // round trip of a JSZip-made archive
test('fetchGraphicsWeb copies a local build and stamps it') // → 'local', .pin starts with 'local '
test('fetchGraphicsWeb refuses a local build in strict mode') // env { CI: '1', GRAPHICS_WEB_ILLUST_DIR } → throws
test('fetchGraphicsWeb reports a missing pin outside strict mode and throws in it')
test('fetchGraphicsWeb does not download when the stamp matches') // download stub not called → 'cached'
test('fetchGraphicsWeb downloads, verifies and extracts') // stub writes a zip; pin with its size/sha → 'fetched', index.html exists
```

- [ ] **Step 2:** Run `npx vitest run tests/fetch-graphics-web.test.ts`(packages/cli 안) → Expected: FAIL(모듈 없음)
- [ ] **Step 3:** 도구와 `.d.mts`, 빈 핀 파일, 무시 목록을 Interfaces대로 만든다.
- [ ] **Step 4:** Run 같은 테스트 → Expected: PASS. `npx eslint tools` → PASS
- [ ] **Step 5: 커밋** `build(hanpan): fetch the AI Photo and AI Illustration web builds by pinned checksum`

### Task 3: `apps/graphics` 뒷단, preload, 공용 정의

mindmap 편집기의 등록 방식(`apps/mindmap/src/main/mindmap-main.ts`)을 본뜬다. 저장은 HWP처럼 두 단계(`begin-save` → 앱이 바이트를 만듦 → `commit-save`)다.

**Files:**

- Create:
  - `apps/graphics/package.json`(name `@genoffice/graphics`, productName `GenOffice Graphics`, scripts: `web` = `node ../../tools/fetch-graphics-web.mjs`, `build` = `npm run web && electron-vite build`, `dev:renderer` = `npm run web && vite --config vite.renderer.config.ts`, `test`, `typecheck`; devDependencies는 mindmap과 같은 판 + `jszip`은 `xmind-engine`과 같은 판)
  - `apps/graphics/{electron.vite.config.ts, vite.renderer.config.ts, vitest.config.ts, tsconfig.json}`: mindmap 것을 본뜬다. renderer `publicDir: resolve(__dirname, 'public')`, 포트 `GRAPHICS_DEV_PORT` 또는 5182, vitest 환경 jsdom.
  - `apps/graphics/src/shared/kinds.ts`, `src/shared/save-target.ts`, `src/shared/ipc.ts`
  - `apps/graphics/src/main/index.ts`(`startGraphicsStandalone()`만 부름), `src/main/graphics-main.ts`, `src/main/i18n-main.ts`
  - `apps/graphics/src/preload/index.ts`
  - `apps/graphics/src/renderer/{index.html, env.d.ts, main.tsx}`: `main.tsx`는 Task 4 전까지 빈 화면을 그린다. `index.html` CSP는 mindmap 것에 `frame-src 'self'`를 더한다.
- Modify: 루트 `package.json`(`test`, `typecheck`에 `-w @genoffice/graphics`; `build:all`에서 epub 다음, cli 앞; `dev`에 이름 `graphics`, `npm run dev:renderer -w @genoffice/graphics`, `GRAPHICS_RENDERER_URL=http://localhost:5182`), `package-lock.json`(`npm install`로 새 작업 공간만. 바뀐 줄을 보고 그 밖의 변경은 되돌린다), `tools/build-stale-preloads.mjs` `APPS`
- Test: `apps/graphics/tests/{kinds.test.ts, save-target.test.ts, graphics-main.test.ts, setup.ts}`

**Interfaces:**

- Produces `src/shared/kinds.ts`:
  - `GRAPHICS_KINDS = ['photo', 'illust'] as const`, `type GraphicsKind`
  - `APP_GLOBAL: Record<GraphicsKind, 'photocraft' | 'vectorcraft'>`
  - `OPEN_EXTS`, `WRITABLE_EXTS`, `NEW_DOC_EXT`, `LAYERLESS_EXTS`, `EXPORT_FORMATS`: Global Constraints의 표 그대로
  - `graphicsKindForPath(path: string): GraphicsKind | undefined`(대소문자 무시)
  - `appLanguage(kind: GraphicsKind, lang: Lang): string`: Global Constraints의 표
- Produces `src/shared/save-target.ts`:
  - `decideSaveTarget(input: { kind; mode: 'save' | 'saveAs'; filePath: string | null; docTitle: string; layered: boolean }): SaveTargetDecision`
  - `SaveTargetDecision = { action: 'write'; path: string; format: string } | { action: 'ask'; defaultName: string; defaultFormat: string; formats: string[]; reason?: 'layered' }`
  - 규칙: `save`이고 경로가 있고 확장자가 쓸 수 있고, (photo이고 레이어 없는 형식이고 `layered`)가 아니면 `write`. 나머지는 `ask`. 그때 `defaultFormat`은 같은 조건이 맞으면 원래 확장자, 아니면 `NEW_DOC_EXT[kind]`. `defaultName`은 파일 이름(없으면 `docTitle`)의 확장자를 `defaultFormat`으로 바꾼 것. 레이어 때문에 묻게 되면 `reason: 'layered'`. `formats`는 `defaultFormat`이 맨 앞인 `WRITABLE_EXTS`(jpeg·tiff·svgz 같은 별칭은 빼고 jpg·tif·svg로).
- Produces `src/shared/ipc.ts`:
  - `GRAPHICS_CHANNELS = { consumeOpen: 'graphics:consume-open', dirtyChanged: 'graphics:dirty-changed', saveRequest: 'graphics:save-request', saveRequestAck: 'graphics:save-request-ack', beginSave: 'graphics:begin-save', commitSave: 'graphics:commit-save', abortSave: 'graphics:abort-save', closeSaveRequest: 'graphics:close-save-request', closeSaveResult: 'graphics:close-save-result', exportFile: 'graphics:export-file', pickImage: 'graphics:pick-image', menuCommand: 'graphics:menu-command' }`
  - `BeginSaveRequest { mode; layered: boolean }` → `BeginSaveResult = { ok: true; path: string; format: string; reason?: 'layered' } | { ok: true; canceled: true } | { ok: false; error: string }`
  - `CommitSaveRequest { bytes: Uint8Array; path: string; format: string }` → `CommitSaveResult = { ok: true; path: string } | { ok: false; error: string }`
  - `ExportRequest { bytes: Uint8Array; defaultName: string; format: 'png' | 'jpg' | 'svg' }` → `ExportResult = { ok: true; path: string } | { ok: true; canceled: true } | { ok: false; error: string }`
  - `PendingOpen { name: string; path: string; bytes: Uint8Array }`, `PickedImage { name: string; bytes: Uint8Array }`, `GraphicsMenuCommand = 'export' | 'undo' | 'redo'`
  - `GraphicsApi`(preload가 `window.graphicsApi`로 내보내는 모양): `getLanguage(), getTheme(), onLanguageChanged(cb), onThemeChanged(cb), consumeOpen(), setDirty(dirty), onSaveRequest(cb), sendSaveRequestAck(ok), beginSave(req), commitSave(req), abortSave(), onCloseSaveRequest(cb), sendCloseSaveResult(ok), exportFile(req), pickImage(), onMenuCommand(cb)`. 구독용 `on…`은 해지 함수를 돌려준다.
- Produces `src/main/graphics-main.ts`:
  - `configureGraphicsRuntime(runtime: { preloadPath: string; rendererUrl?: string; rendererFile?: string; openFileDialog?: () => void; goHome?: () => void; newDocument?: (kind: GraphicsKind) => void }): void`
  - `createGraphicsView(kind: GraphicsKind, openPath?: string | null): WebContentsView`: webPreferences `{ preload, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }`, 주소 `rendererUrl(runtime.rendererUrl, kind, { kind })`. `will-prevent-unload`는 `event.preventDefault()`(PhotoCraft의 `beforeunload`. 닫기는 `requestGraphicsClose`가 이미 물었다). `setWindowOpenHandler`·`will-navigate`·`render-process-gone`·`destroyed`는 mindmap의 `grantAndTrack`과 같다.
  - `graphicsKindOf(wcId): GraphicsKind | undefined`, `graphicsIsDirty(wcId): boolean`, `graphicsFilePath(wcId): string | undefined`
  - `graphicsFileRenamed(contents, oldPath, newPath): void`, `setGraphicsFileSavedHook(hook: (wc: WebContents, path: string) => void): void`
  - `requestGraphicsSave(contents, mode): Promise<boolean>`: 보기마다 한 번에 하나, 120초 제한(mindmap `requestMindmapSave`와 같음)
  - `requestGraphicsClose(contents, parent?): Promise<boolean>`: 깨끗하면 `true`. 아니면 저장 / 저장 안 함 / 취소 상자. 저장은 `closeSaveRequest`를 보내고 결과를 기다린다(120초 넘으면 `false`).
  - `sendGraphicsMenuCommand(contents, cmd: GraphicsMenuCommand): void`, `startGraphicsStandalone(): void`
  - IPC는 처음 쓸 때 한 번만 등록한다(`registerGraphicsIpc`, mindmap과 같음). `app:get-language`는 mindmap처럼 지우고 다시 등록한다.
  - `consume-open`: 경로를 받은 보기에 `{name, path, bytes}`를 한 번 주고, 다음부터 `null`.
  - `begin-save`: `decideSaveTarget`. `ask`면 `showSaveDialogWithMemory(dialog, win, { title: tm('dlgSaveTitle'), defaultPath: join(dir, defaultName), filters })`. dir은 파일이 있던 폴더, 없으면 `configuredDefaultSaveDir(app)`. 확장자 없이 이름을 적으면 `defaultFormat`을 붙이고, 쓸 수 없는 확장자면 그것도 붙인다.
  - `commit-save`: 같은 파일이 다른 탭에서 열려 있거나 디스크에서 바뀌었으면 mindmap의 `conflictStopsSave`와 같이 묻는다. 그다음 `atomicWriteFile`(`@genoffice/electron-utils/atomic-write`) → 경로 기록 → 변경 표시 지움 → 경로가 새로우면 저장 훅.
  - `export-file`: 그 형식 필터 하나로 저장 대화상자 → `atomicWriteFile`. 원래 문서의 경로·변경 표시는 그대로.
  - `pick-image`: 열기 대화상자(png, jpg, jpeg, webp, gif, bmp) → `{name, bytes}` 또는 `null`
  - `before-input-event`: Ctrl/Cmd+S → `requestGraphicsSave(…, 'save')`, Ctrl/Cmd+Shift+S → `'saveAs'`, Ctrl/Cmd+O → `runtime.openFileDialog`, Ctrl/Cmd+N → `runtime.newDocument(kind)`, Ctrl/Cmd+P → 삼킴. 모두 `preventDefault`. 그 밖의 키는 그대로 둔다(HWP `installFileShortcuts`와 같은 이유: iframe이 이 키를 삼킨다).
- Produces `src/main/i18n-main.ts`: `tm(key)`. 키 `dlgSaveTitle`, `dlgExportTitle`, `dlgPickImageTitle`, `closeUnsavedMsg`, `closeUnsavedDetail`, `btnSave`, `btnDontSave`, `btnCancel`은 mindmap `i18n-main.ts`의 21개 언어 값을 옮긴다. 새로 쓰는 키는 `filterPsd`('PSD 문서'), `filterPng`, `filterJpeg`, `filterWebp`, `filterTiff`, `filterVectorcraft`('VectorCraft 문서'), `filterSvg`, `filterAi`('.ai 문서'), `filterImages`, `untitledPhoto`, `untitledIllust`다. 다른 회사 제품 이름은 쓰지 않고 형식 이름으로 쓴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/graphics/tests/kinds.test.ts
test('graphicsKindForPath routes by extension, ignoring case') // a.PSD→photo, b.svg→illust, c.pdf→undefined
test('appLanguage follows the table') // ko→ko both; pt→pt-br; ar→photo 'ar', illust 'en'; zh, zh-TW, he, hi, th, ms→'en'
// apps/graphics/tests/save-target.test.ts
test('save writes in place when the format can hold the document') // photo /p/a.png, layered false → write png
test('a layered photo opened from a png is saved as psd after asking') // → ask, defaultName 'a.psd', reason 'layered'
test('an untitled illustration asks with .vectorcraft first') // formats[0] === 'vectorcraft'
test('saveAs always asks and keeps the current format first') // illust /p/logo.svg → ask, defaultFormat 'svg'
test('a file the app cannot write is saved as the new-document format') // photo /p/a.heic → ask, 'a.psd'
// apps/graphics/tests/graphics-main.test.ts (electron mocked as in apps/mindmap/tests/main.test.ts)
test('creates a sandboxed view that keeps running in the background') // webPreferences incl. backgroundThrottling:false; URL genoffice-app://illust/index.html?kind=illust
test('ignores the page veto on unload')
test('hands the opened file to the page once')
test('begin-save writes in place without a dialog when it can')
test('begin-save adds the default extension to a typed name')
test('commit-save writes atomically, records the path and calls the saved hook once')
test('commit-save that fails leaves the tab dirty') // atomicWriteFile rejects → {ok:false}, graphicsIsDirty stays true
test('close: clean closes, Cancel keeps, Do not Save closes, Save waits for the page')
test('Ctrl+S, Ctrl+Shift+S, Ctrl+O and Ctrl+N are taken before the page sees them')
test('export writes the chosen file and leaves the document path alone')
```

- [ ] **Step 2:** Run `npx vitest run`(apps/graphics 안) → Expected: FAIL
- [ ] **Step 3:** Files·Interfaces대로 만든다. `npm install`로 작업 공간을 잠금 파일에 올리고 `git diff package-lock.json`이 새 작업 공간 줄뿐인지 본다.
- [ ] **Step 4:** Run `npx vitest run`, `npm run typecheck -w @genoffice/graphics`, `npm run build -w @genoffice/graphics` → Expected: PASS. 핀이 없으므로 `web` 단계는 두 앱 모두 `missing` 경고만 낸다.
- [ ] **Step 5: 커밋** `feat(graphics): the AI Photo and AI Illustration editor module (main, preload, formats)`

### Task 4: 호스트 페이지, 일러스트 어댑터, 열기·저장·변경 표시

**Files:**

- Create:
  - `apps/graphics/src/renderer/App.tsx`, `styles.css`
  - `src/renderer/frame/page-api.ts`, `frame/storage-prep.ts`, `frame/bytes.ts`
  - `src/renderer/adapters/types.ts`, `adapters/illust.ts`, `adapters/index.ts`
  - `src/renderer/doc/doc-watch.ts`, `doc/dirty-state.ts`, `doc/save-flow.ts`, `doc/capture-watch.ts`, `doc/open-flow.ts`
  - `src/renderer/i18n/{locale.tsx, strings.ts, strings-app.ts, app/<21개 언어>.ts}`(mindmap의 구조와 같음, `zh`가 키를 정한다)
- Test: `apps/graphics/tests/{page-api.test.ts, storage-prep.test.ts, illust-adapter.test.ts, doc-watch.test.ts, save-flow.test.ts, capture-watch.test.ts, app.test.tsx}`, `tests/helpers/fake-page.ts`

**Interfaces:**

- Consumes: Task 3의 `GraphicsApi`, `kinds.ts`.
- Produces `frame/page-api.ts`:
  - `interface GraphicsPageApi { request(method: string, params?: object): Promise<unknown>; execute(id: string, params?: object): Promise<unknown>; commands(): Promise<AppCommand[]>; inspect(): Promise<unknown>; screenshot(params?: object): Promise<unknown>; openFile(name: string, bytes: Uint8Array): Promise<boolean> | boolean; captureDownloads(on: boolean): void; files(): Promise<{ path: string; size: number }[]>; readFile(path: string): Promise<Uint8Array> }`
  - `interface AppCommand { id: string; label: string; menu?: string[]; params?: string; enabled: boolean; disabled_reason?: string; disabledReason?: string; shortcut?: string | null; ui?: boolean }`
  - `waitForPageApi(frame: HTMLIFrameElement, global: 'photocraft' | 'vectorcraft', timeoutMs = 60_000): Promise<GraphicsPageApi>`: 200ms마다 본다.
  - `withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T>`: 넘으면 `${what} timed out`로 거절
  - `appFrameUrl(kind, lang): string` = `./web/${kind}/index.html?embedded=hanpan&lang=${appLanguage(kind, lang)}`
- Produces `frame/bytes.ts`: `copyBytes(b: Uint8Array | ArrayBuffer): Uint8Array`(항상 새 버퍼), `base64ToBytes(s)`, `bytesToBase64(b)`, `downscalePng(bytes, maxSide): Promise<Uint8Array>`(`createImageBitmap` + `OffscreenCanvas`, 이미 작으면 그대로)
- Produces `frame/storage-prep.ts`:
  - `seedPhotoPreferences(storage: Storage, appLang: string): void`: `photocraft.preferences`의 다른 값은 지키고 `interface.language`만 바꾼다. 읽을 수 없는 JSON이면 `{ interface: { language } }`로 바꾼다.
  - `clearIllustRecovery(storage: Storage): number`: `vectorcraft-recovery/`로 시작하는 키만 지우고 지운 수를 돌려준다.
- Produces `adapters/types.ts`:

```ts
export interface DocInfo {
  hasDocument: boolean
  dirty: boolean
  title: string | null
}
export interface GraphicsAdapter {
  readonly kind: GraphicsKind
  readonly api: GraphicsPageApi
  afterReady(): Promise<void> // capture on (+ illust: app recovery off)
  docInfo(): Promise<DocInfo>
  saveBytes(fileName: string, format: string): Promise<Uint8Array> // through the app: the document turns clean and takes the name
  exportBytes(format: 'png' | 'jpg' | 'svg'): Promise<Uint8Array> // leaves the document as it is
  isLayered(): Promise<boolean>
  historyLength(): Promise<number>
  undo(steps: number): Promise<number> // steps actually undone
  snapshotPng(maxSide: number): Promise<Uint8Array | null>
  contextSummary(): Promise<string> // at most 2,000 characters
  inspectDocument(depth: number, childLimit: number): Promise<unknown>
  placeImage(name: string, bytes: Uint8Array): Promise<void>
}
```

- `createAdapter(kind, api): GraphicsAdapter`(`adapters/index.ts`): illust는 일러스트 어댑터. photo는 Task 10 전까지 `photo adapter not connected yet`을 던지고, 호스트는 "웹판이 없다" 상태를 보인다.
- 일러스트 어댑터(확인한 동작 표 그대로):
  - `afterReady`: `captureDownloads(true)`, `execute('prefs.set', { key: 'autosaveRecovery', value: false })`
  - `docInfo`: `inspect()`의 `documents[activeDocument]`
  - `saveBytes(name, format)`: `execute('file.save', { path: name, …(svg·svgz면 { svg: {} }, ai면 { options: {} }) })` → 결과의 `path`를 `readFile` → `copyBytes`. 결과의 `bytes`와 길이가 다르면 `capture size mismatch`로 던진다.
  - `exportBytes(format)`: `execute('document.export', { format })`의 `dataBase64`를 푼다(`text`가 오면 UTF-8로).
  - `isLayered`: `false`
  - `historyLength`: `execute('document.inspect', { ids: [] })`의 `history.length`
  - `undo(n)`: `execute('edit.undo', {})`를 n번. 거절되면 거기서 멈추고 실행한 수를 돌려준다.
  - `snapshotPng(maxSide)`: `exportBytes('png')` → `downscalePng`
  - `contextSummary`: `document.inspect { depth: 2, childLimit: 15 }`로 제목·저장 상태·단위·대지 크기·선택한 객체 id·위 레이어 이름과 객체 몇 개·현재 도구를 짧은 글로 만든다.
  - `inspectDocument(depth, childLimit)`: `document.inspect`
  - `placeImage(name, bytes)`: `execute('file.place', { name, dataBase64, link: false })`
- Produces `doc/*`:
  - `watchDoc(adapter, onChange: (info: DocInfo) => void, intervalMs = 1000): () => void`: 한 번에 하나만 묻고, 바뀌었을 때만 알린다. 오류는 무시하고 마지막 값을 둔다.
  - `createDirtyState(setDirty: (d: boolean) => void)`: `{ fromApp(dirty: boolean): void; saveFailed(): void; saved(): void; current(): boolean }`. 실제 표시 = 앱의 변경 표시 OR 저장 실패 표시.
  - `runSave(mode, deps: { adapter; api: Pick<GraphicsApi, 'beginSave' | 'commitSave' | 'abortSave'>; dirty: DirtyState; notify(key: AppStringKey): void; hostOp: { begin(): void; end(): void } }): Promise<boolean>`: 문서가 없으면 `false`. `isLayered` → `beginSave` → 취소면 `false` → `saveBytes(basename(path), format)` → `commitSave` → 성공이면 `dirty.saved()`, 실패면 `dirty.saveFailed()` + `notify('saveFailed')`. `reason: 'layered'`면 `notify('layeredSaveNotice')`. 예외가 나면 `abortSave` + 알림.
  - `watchCaptures(deps: { adapter; intervalMs?: number; busy(): boolean /* host op or AI run */; onAppSave(): void; onAppExport(path: string): void }): () => void`
    - 시작할 때 `files()`를 본 것으로 둔다.
    - 앱의 변경 표시가 켜짐 → 꺼짐인데 `busy()`가 아니면 `onAppSave()`. 호스트는 `runSave('save')`로 한판 저장을 한다(앱 메뉴의 저장도 한판 저장과 같게).
    - `files()`에 새 경로가 생기거나 크기가 바뀌었고, 그 경로가 지금 문서 제목이 아니고, `busy()`가 아니면 `onAppExport(path)`. 호스트는 그 파일을 읽어 `exportFile`로 넘긴다.
    - `busy()`인 동안 생긴 것은 본 것으로만 기록하고 아무것도 하지 않는다.
  - `openPending(adapter, consume: () => Promise<PendingOpen | null>): Promise<'opened' | 'none' | 'failed'>`: `openFile(name, copyBytes(bytes))` 뒤 30초 안에 `docInfo().hasDocument`가 참이 되기를 기다린다.
- `App.tsx`:
  - `?kind=`와 언어를 읽는다. iframe을 그리기 전에 photo는 `seedPhotoPreferences`, illust는 `clearIllustRecovery`를 한다.
  - iframe은 `src=appFrameUrl(kind, lang)`, `allow="clipboard-read; clipboard-write"`, sandbox 속성 없음(HWP와 같음).
  - `waitForPageApi` → `createAdapter` → `afterReady` → `openPending` → `watchDoc`(→ `dirty.fromApp`)과 `watchCaptures`를 시작한다.
  - 경로 없이 연 탭(새로 만들기)은 파일을 넘기지 않는다. 앱이 자기 시작 화면(크기 프리셋)을 보이고, 사용자가 고르면 문서가 생긴다(embedded 모드는 문서가 없을 때만 새로 만들기를 허락한다).
  - `onSaveRequest(mode)` → `runSave` → `sendSaveRequestAck`. `onCloseSaveRequest` → `sendCloseSaveResult(dirty.current() ? await runSave('save') : true)`.
  - 메뉴 명령: `undo`·`redo`는 `execute('edit.undo' | 'edit.redo')`. `export`는 `EXPORT_FORMATS[kind][0]`(png)로 `exportBytes` → `exportFile`(Task 8이 고르는 창으로 바꾼다).
  - 상태: `loading`, `ready`, `failed`(다시 시도 단추), `notInstalled`(`./web/<kind>/index.html`이 404). 문구 키 `loading`, `failed`, `retry`, `notInstalled`, `saveFailed`, `layeredSaveNotice`(21개 언어).

- [ ] **Step 1: 실패하는 테스트**(`tests/helpers/fake-page.ts`: 문서 상태(`documents`, `history`, `files`)를 가진 가짜 `GraphicsPageApi`. `execute` 처리기를 시험마다 바꿔 끼운다)

```ts
test('waitForPageApi resolves once the global appears / rejects after the timeout')
test('seedPhotoPreferences keeps the other preferences / replaces unreadable JSON')
test('clearIllustRecovery removes only the recovery keys')
test('saveBytes saves through file.save and returns a copy of the captured bytes')
// fake readFile returns a view and overwrites it after returning → returned bytes unchanged
test('saveBytes passes svg options for .svg and options for .ai')
test('saveBytes fails when the captured size differs from what the app reported')
test('afterReady turns capture on and the app recovery off')
test('historyLength reads document.inspect history; undo stops at the first refusal')
test('exportBytes decodes dataBase64 and never calls file.save')
test('watchDoc reports only changes and never runs two inspects at once')
test('runSave writes in place when the tab has a path')
test('runSave as asks main first, then serializes in the chosen format')
test('a failed write keeps the tab dirty') // Review Focus 1
test('a canceled dialog leaves the document untouched')
test('an app save (dirty to clean) runs the Hanpan save')
test('ignores captures while a host save is in flight')
test('ignores everything while the AI is busy') // Review Focus 4
test('routes a new export file to the export dialog')
test('shows loading, then the frame with embedded=hanpan and the app language')
test('seeds the PhotoCraft language before the frame exists') // photo: storage written before the iframe element
test('answers a close-save request with the save result')
```

- [ ] **Step 2:** Run `npx vitest run`(apps/graphics 안) → Expected: 새 테스트 FAIL
- [ ] **Step 3:** Files·Interfaces대로 만든다. 문구는 한국어·영어를 쓰고 나머지 19개는 번역한다.
- [ ] **Step 4:** Run `npx vitest run`, `npm run typecheck -w @genoffice/graphics`, `npm run check:theme-colors`, `npm run check:english-comments` → Expected: PASS
- [ ] **Step 5: 커밋** `feat(graphics): host page for the web apps with open, save and unsaved-change tracking`

### Task 5: 셸 배선 (탭 종류, 열기, 홈 카드, 메뉴, 포장)

EPUB 점검 목록(`apps/shell/AGENTS.md` 26줄)과 mindmap의 새로 만들기 흐름을 따른다. 컴파일러가 잡지 못하는 곳(아래 "조용히 빠지는 곳")을 빠뜨리지 않는다.

**Files:**

- `packages/electron-utils`:
  - `src/renderer-scheme.ts`: `RendererHost`에 `'photo' | 'illust'`
  - `src/renderer-protocol.ts`: `installRendererProtocol(roots, options?: { headers?: (host: string, file: string) => Record<string, string> | undefined })`. 머리글이 있으면 `net.fetch` 결과의 본문과 상태로 새 `Response`를 만들고 머리글을 합친다.
  - `src/drop-open.ts`: `OPENABLE_DOC_RE`에 두 앱의 `OPEN_EXTS`
- `apps/shell/src/shared/tabs-api.ts`: `TabKind`에 `'photo' | 'illust'`
- `apps/shell/src/shared/home-api.ts`: `HomeApi.newPhoto(opts?)`·`newIllust(opts?)`, `HOME_CHANNELS.newPhoto: 'home:new-photo'`, `newIllust: 'home:new-illust'`
- `apps/shell/src/main/`:
  - `app-routing.ts`: `PHOTO_RE`·`ILLUST_RE`를 `../../../graphics/src/shared/kinds`의 `OPEN_EXTS`로 만든다. `appForPath`에서 `'photo'`·`'illust'`. `renameStaysInApp`: 두 종류는 확장자가 바뀌는 이름 바꾸기를 막는다(바이트는 그대로이므로, docx↔odt와 같은 이유).
  - `launch-paths.ts`: 바꾸지 않는다(운영체제 파일 연결 없음).
  - `folder-tree.ts`: `TREE_FILE_EXTENSIONS`에 두 앱의 `OPEN_EXTS`
  - `file-index/extract.ts`: 그래픽 확장자는 파싱 전에 `{ kind: 'name-only' }`(지금은 png·jpg가 색인 오류로 남는다). 본문에 들어가는 것은 바뀌지 않으므로 `EXTRACT_VERSION`은 올리지 않는다.
  - `recent-files.ts`: `EXT_FAMILY`에 `photo`, `illust`
  - `graphics-headers.ts`(새 파일): `graphicsResponseHeaders(host, file)` → 호스트가 `photo`·`illust`이고 파일이 `/web/` 아래의 `.html`이면 `{ 'content-security-policy': "frame-ancestors 'self'" }`, 아니면 `undefined`
  - `tab-manager.ts`:
    - `openPhotoTab(openPath?: string): string`, `openIllustTab(openPath?: string): string`(공통 `openGraphicsTab(kind, openPath?)`)
    - 제목은 `this.untitled('photo' | 'illust', …)`
    - `findPhotoTabByPath`, `findIllustTabByPath`, `activeGraphicsTab()`, `dirtyGraphicsTabs()`
    - `tabIsDirty`, `closeTab` 확인(`graphicsIsDirty` → `requestGraphicsClose`), `createPlainEditorView`(경로가 없으면 새 문서)
    - `openDuplicatePaneTab`은 `null`(같은 문서를 두 앱 인스턴스가 나눠 가질 수 없다)
  - `window-close-guard.ts`: 저장 안 된 그래픽 탭마다 `activateTab` 뒤 `requestGraphicsClose`. "지킬 것 없음" 판정에도 넣는다.
  - `detached-windows.ts`: `DEFAULT_SIZE`(1400×900), `detachedIsDirty`, `confirmDetachedClose`
  - `session-record.ts`: `DOCUMENT_KINDS`에 두 종류. 경로 있는 탭만 되살아난다(복구 사본 없음).
  - `index.ts`:
    - `GRAPHICS_OUT`(설치본 `resources/modules/graphics`, 개발은 `apps/graphics/out`)
    - `configureGraphicsRuntime({ preloadPath, rendererUrl: process.env.GRAPHICS_RENDERER_URL, rendererFile, openFileDialog, goHome, newDocument: (kind) => kind === 'photo' ? newPhotoTab() : newIllustTab() })`
    - 프로토콜 뿌리 `photo: join(GRAPHICS_OUT, 'renderer')`, `illust: join(GRAPHICS_OUT, 'renderer')`, `{ headers: graphicsResponseHeaders }`
    - `routeDocumentPath`: `PHOTO_RE`·`ILLUST_RE` 분기(`recordRecentFile`, 열린 탭이면 앞으로, 아니면 새 탭)
    - `OPEN_DIALOG_EXTENSIONS`와 홈 browse 필터(`filterPhoto`, `filterIllust`), `SEARCH_EXT_FAMILY`
    - `newPhotoTab()`·`newIllustTab()`, `HOME_CHANNELS.newPhoto`·`newIllust` 처리기
    - 제목 없는 이름 연결, `afterFileMoved` → `graphicsFileRenamed`, `setGraphicsFileSavedHook` → `setTabFileFor`·`detachedSetFileFor`·`recordRecentFile`·`noteDocumentSaved`
    - `applyMenuFor`의 `case 'photo': case 'illust': buildGraphicsMenu(kind)`
    - `buildGraphicsMenu(kind)`: 파일(새로 만들기 CmdOrCtrl+N은 같은 종류, 열기, 홈, 저장·다른 이름으로 저장 → `requestGraphicsSave`, `menuExportImage` → `sendGraphicsMenuCommand('export')`, 닫기), 편집(되돌리기·다시 하기 → `sendGraphicsMenuCommand`, `registerAccelerator: false`), 도움말(`withHelpItems`)
    - `MenuIconSet`·`menuIcons()`·`TAB_MENU_ICON`, "+" 메뉴와 홈 메뉴 파일 › 새로 만들기 항목. 한국 문서 기능 스위치와 무관하게 늘 보인다.
    - `tMain` 21개 언어: `menuNewPhoto`(ko 'AI 포토', en 'AI Photo'), `menuNewIllust`('AI 일러스트', 'AI Illustration'), `untitledPhoto`('제목 없는 사진', 'Untitled Photo'), `untitledIllust`('제목 없는 일러스트', 'Untitled Illustration'), `filterPhoto`('사진·이미지 (PSD, PNG, JPG…)', 'Photos and images (PSD, PNG, JPG…)'), `filterIllust`('일러스트 (SVG, .ai, VectorCraft)', 'Illustrations (SVG, .ai, VectorCraft)'), `menuExportImage`('그림으로 내보내기…', 'Export as Image…')
  - `mcp/tools/formats.ts`: `EditorFamily`와 `FORMAT_FAMILIES`에 `photo`·`illust`(label, editorOpen만, `mcp` 칸 없음). `mcp/tools/open-documents-tools.ts`: `FAMILY_BY_KIND`에 두 종류. 읽기·저장은 넣지 않는다.
  - `assets/menu-photo.png`(+`@2x`), `assets/menu-illust.png`(+`@2x`)
- `apps/shell/src/renderer/src/`:
  - `hanpan/ArtcraftIcon.tsx` → `git mv`로 `hanpan/GraphicsIcon.tsx`. `GraphicsIcon({ kind }: { kind: 'photo' | 'illust' })`
  - `Home.tsx`:
    - `FILE_ICONS`에 두 앱 확장자
    - `OPEN_LOCAL_EXTENSIONS` 끝에 ` / .psd / .png / .jpg / .svg / .ai`
    - `FILTERS`에 `photo`·`illust`, `FILTER_FAMILY`, `NEW_ITEMS`(sub `.psd`, `.vectorcraft`)
    - 보조 줄의 `pdf-tools` 다음에 `{ key: 'photo', ai: true, sub: 'PhotoCraft', tip: t('hpPhotoTip'), title: t('newPhoto') }`, `{ key: 'illust', ai: true, sub: 'VectorCraft', tip: t('hpIllustTip'), title: t('newIllust') }`
  - `TabBar.tsx`: `KIND_ICON`에 `<GraphicsIcon kind=… />`
  - `strings.ts` 21개 언어: `newPhoto`('AI 포토' / 'AI Photo'), `newIllust`('AI 일러스트' / 'AI Illustration'), `hpPhotoTip`('사진을 고치고, 배경 지우기 같은 일을 AI에게 맡깁니다' / 'Edit photos and ask the AI to remove a background or retouch them'), `hpIllustTip`('로고와 그림을 벡터로 그리고, 도형·글자 작업을 AI에게 맡깁니다' / 'Draw logos and pictures as vectors and ask the AI to add shapes and text'), `filterPhoto`('사진' / 'Photos'), `filterIllust`('일러스트' / 'Illustrations')
  - `assets/file-photo.svg`, `assets/file-illust.svg`
- `apps/shell/src/preload/index.ts`: `newPhoto`, `newIllust`
- `tools/gen-file-association-icons.mjs`: `FORMATS`에 `photo: { picto: 'picture' }`, `illust: { picto: 'pen' }`(새 그림 `pen`: 펜촉 하나. 다른 회사 마크를 닮지 않게). 색은 기존 팔레트와 같은 밝기·채도에서 다른 형식과 색상이 겹치지 않는 값 하나씩을 고르고, 그 줄 주석에 색 이름을 적는다(파일 머리 주석의 규칙). `MENU_TYPES`에 둘. 새 집합 `TAB_ONLY = new Set(['photo', 'illust'])`는 `.ico`·`.icns`를 만들지 않는다.
- `apps/shell/electron-builder.cjs`:
  - `extraResources` `{ from: '../graphics/out', to: 'modules/graphics' }`
  - `assertModuleTreesPresent`에 `'../graphics/out'`
  - beforePack에서 `assertGraphicsWebBuilt()`: 두 앱 모두 `../graphics/out/renderer/web/<kind>/index.html`이 있어야 한다. strict(`CI`/`IEUM_RELEASE`)면 `../graphics/public/web/<kind>/.pin`이 `local `로 시작하면 안 된다. 모듈 최상위에서는 `process.*`만 쓴다(시험이 vm에서 읽음).
- e2e: `e2e/home.spec.ts`(순서 `… 'pdf', 'pdf-tools', 'photo', 'illust', 'open'`), `e2e/graphics.spec.ts`(새 파일)
- Test(shell, `apps/shell/tests/`):
  - `graphics-shell-wiring.test.ts`(새 파일. `epub-shell-wiring.test.ts`처럼 소스 글자를 읽는다)
  - `tab-manager.test.ts`(graphics-main mock, `RENAMABLE`에 `photo` `/tmp/one.psd`·`illust` `/tmp/one.svg`)
  - `app-routing.test.ts`, `launch-paths.test.ts`, `folder-tree.test.ts`, `recent-files.test.ts`, `session-record.test.ts`, `window-close-guard.test.ts`, `detached-windows.test.ts`, `template-copy-tabs.test.ts`(mock만), `main-locale-tables.test.ts`, `mcp/formats.test.ts`, `mcp/open-documents-tools.test.ts`, `packaged-cli-version.test.ts`(beforePack 가짜 목록에 웹판 파일), `graphics-headers.test.ts`(새 파일)
- Test(packages): `packages/electron-utils/tests/{drop-open.test.ts, renderer-scheme.test.ts, renderer-protocol.test.ts}`

**Interfaces:**

- Consumes: Task 3의 main 내보내기 전부. Task 4의 호스트 페이지.
- Produces: `TabManager.openPhotoTab(openPath?)`, `openIllustTab(openPath?)`, `findPhotoTabByPath(path)`, `findIllustTabByPath(path)`, `activeGraphicsTab()`, `dirtyGraphicsTabs()`. `graphicsResponseHeaders(host, file)`.
- 조용히 빠지는 곳(컴파일러가 잡지 않음): `DOCUMENT_KINDS`, `tabIsDirty`, `detachedIsDirty`, `confirmDetachedClose`, `closeTab` 확인, `window-close-guard`, `applyMenuFor`, 제목 없는 이름, `afterFileMoved`, `DEFAULT_SIZE`, `RendererHost`, `TREE_FILE_EXTENSIONS`, `OPENABLE_DOC_RE`, `OPEN_DIALOG_EXTENSIONS`, `OPEN_LOCAL_EXTENSIONS`, `FILE_ICONS`, `FILTERS`. 배선 테스트가 이것들을 하나씩 확인한다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/shell/tests/graphics-shell-wiring.test.ts
test('routeDocumentPath sends photo and illustration files to their tabs')
test('the open dialog and the Home browse filter list every OPEN_EXTS entry')
test('renames, saves and runtime are wired') // afterFileMoved, saved hook (setTabFileFor, detachedSetFileFor, recordRecentFile), configureGraphicsRuntime args
test('both hosts are served from the graphics renderer with the frame header')
test('the menu saves through requestGraphicsSave and New opens the same kind')
test('new menu strings exist in all 21 main-process languages and are translated')
test('Home shows the two AI cards right after the PDF tools with the AI chip') // keys photo, illust; ai: true
test('graphics extensions are not launchable from the OS') // none of OPEN_EXTS in LAUNCHABLE_EXTS
// apps/shell/tests/app-routing.test.ts
test('a .png renamed to .psd is refused; a .PNG case change is allowed')
// apps/shell/tests/graphics-headers.test.ts
test('only web app pages of the photo and illust hosts get frame-ancestors')
// apps/shell/src/main/file-index (existing extract test file)
test('a photo file is indexed by name only, not as an error')
// packages/electron-utils/tests/renderer-protocol.test.ts
test('installRendererProtocol adds the headers the option returns')
// e2e/graphics.spec.ts (skip with a message when apps/graphics/out/renderer/web/illust/index.html is missing)
test('the AI Illustration card opens a tab whose app answers') // commands().length > 1000
test('save round trip writes the file the dialog chose') // stub dialog.showSaveDialog as e2e/hanpan-design-gongu-fonts.spec.ts does
test('closing a changed tab asks first') // hwp-close-unsaved.spec.ts pattern
test('a hidden graphics tab still answers the page API') // Review Focus 5: activate Home, a call from the graphics view answers within 3 s
```

- [ ] **Step 2:** Run `npx vitest run`(apps/shell, packages/electron-utils) → Expected: 새 테스트 FAIL
- [ ] **Step 3:** 아이콘을 만든다: `node tools/gen-file-association-icons.mjs` → `menu-photo.png` 등과 두 SVG가 생기고 `apps/shell/build`에 새 `.ico`가 없다. 눈으로 열어 본다(standards "상표와 아이콘").
- [ ] **Step 4:** Files대로 배선한다.
- [ ] **Step 5:** Run shell·electron-utils·graphics 테스트, `npm run typecheck` → Expected: 기준선 밖 실패 없음.
- [ ] **Step 6:** 일러스트 웹판을 넣고 빌드해 e2e를 돌린다.
  - `GRAPHICS_WEB_ILLUST_DIR="$TEMP/artcraft-web-spike/vectorcraft-web/vectorcraft-web-0.21.0" npm run build -w @genoffice/graphics`
  - `npm run build -w @genoffice/shell`
  - `E2E_NO_VIDEO=1 npx playwright test --config e2e/playwright.config.ts e2e/graphics.spec.ts e2e/home.spec.ts` → Expected: PASS(포토 카드는 "웹판이 없다" 상태로 열린다)
- [ ] **Step 7: 커밋** `feat(hanpan): AI Photo and AI Illustration tabs in the shell`. 그 뒤 `npm run format:check`가 기존 파일을 잡으면 `style: format the files the graphics tabs touched`.

### Task 6: AI 도구, 스킬, 한 번에 되돌리기

**Files:**

- Create: `apps/graphics/src/renderer/ai/{graphics-skill.ts, tools.ts, blocked-commands.ts, command-index.ts, undo-tracker.ts, input-lock.ts, guides.ts}`, `ai/prompts/base-photo.md`, `ai/prompts/base-illust.md`, `ai/prompts/guides/illust-{shapes,text,arrange,color,trace,export}.md`
- Create fixture: `apps/graphics/tests/fixtures/vectorcraft-0.21.0-commands.json`: 공식 웹판의 `commands()`에서 `{id, label, menu}`만(1,315개)
- Test: `apps/graphics/tests/{ai-tools.test.ts, blocked-commands.test.ts, undo-tracker.test.ts, input-lock.test.ts}`

**Interfaces:**

- Consumes: Task 4의 `GraphicsAdapter`, `GraphicsApi.exportFile`. agent-core의 `AgentSkill`, `ToolExecution`, `AgentToolDef`.
- Produces:
  - `isBlockedCommand(id: string): boolean`: Global Constraints의 `BLOCKED_PREFIXES` 접두어 일치
  - `isReadOnlyCommand(id: string): boolean`: 끝이 `.info`, `.list`, `.inspect`, `.find`, `.node`, `.fontList`, `.formats`, `.json`
  - `createCommandIndex(commands: AppCommand[]): { search(query: string, limit: number): AppCommand[]; get(id: string): AppCommand | undefined }`: 막힌 명령은 넣지 않는다. 검색어의 낱말이 id·label·menu 어딘가에 모두 있어야 맞는다(대소문자 무시).
  - `UndoTracker`:

```ts
export interface RunUndo {
  steps: number
  markerAfter: number
  overflow: boolean
}
export interface UndoTracker {
  beforeMutation(): Promise<void> // records history length once per run
  noteMutation(): void
  finish(): Promise<RunUndo | null> // null when nothing was mutated
}
export function createUndoTracker(adapter: Pick<GraphicsAdapter, 'historyLength'>): UndoTracker
export function undoRun(
  adapter: Pick<GraphicsAdapter, 'historyLength' | 'undo'>,
  run: RunUndo,
): Promise<'undone' | 'changed-since' | 'failed'>
```

    - `finish`: `steps = 끝 길이 − 처음 길이`. 바꾼 명령이 있었는데 `steps <= 0`이면 `overflow: true`(앱의 기록 상한).
    - `undoRun`: 지금 길이가 `markerAfter`와 다르면 `changed-since`. 아니면 `undo(steps)`, 모두 되면 `undone`, 아니면 `failed`.
    - 되돌리기는 명령 수가 아니라 앱 기록의 길이 차이로 센다. PhotoCraft 문서가 "명령마다 기록이 하나씩 생기지는 않는다"고 하기 때문이다. 두 앱 모두 같은 방식이다(VectorCraft의 `edit.undoGroup`은 쓰지 않는다).

- `lockFrameInput(frame: HTMLIFrameElement, overlay: HTMLElement): () => void`: overlay를 보이고(`data-locked`), iframe 창에 capture 단계로 `keydown, keyup, keypress, beforeinput, paste, drop, dragover, pointerdown, mousedown, wheel, contextmenu, touchstart`를 막는다(`preventDefault` + `stopImmediatePropagation`). iframe 안의 초점을 뺀다. 푸는 함수는 여러 번 불러도 된다.
- `createGraphicsSkill(deps: { kind; adapter; tracker: UndoTracker; context(): string; exportFile(req: ExportRequest): Promise<ExportResult> }): AgentSkill`
  - `id: 'graphics'`, `systemPrompt`: `base-<kind>.md`, `buildContext: deps.context`
  - 도구 7개(이름·입력 고정):

    | 도구               | 입력                                                           | 하는 일                                                                                                                                                               |
    | ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `find_commands`    | `{ query: string, limit?: integer 1–50 = 20 }`                 | `commands()`를 새로 읽어 찾는다. 줄마다 `id — label`, 꺼진 명령은 `[disabled: 이유]`                                                                                  |
    | `describe_command` | `{ id: string }`                                               | label, menu, enabled, 이유, params 문서 전체. 막힌 id는 오류                                                                                                          |
    | `run_command`      | `{ id: string, params?: object }`                              | 막힌 id는 실행하지 않고 오류. 읽기 전용이 아니면 `tracker.beforeMutation()` 뒤 실행하고 `noteMutation()`. 결과 JSON은 4,000자로 자른다                                |
    | `run_commands`     | `{ steps: [{ id, params? }] (1–30개) }`                        | 막힌 명령이 하나라도 있으면 아무것도 실행하지 않는다. 차례로 실행하다 첫 실패에서 멈추고, 실행하지 않은 단계를 적는다. 실패가 있으면 `isError`                        |
    | `inspect_document` | `{ depth?: integer 1–6 = 2, childLimit?: integer 1–100 = 30 }` | `adapter.inspectDocument`, 12,000자를 넘으면 자르고 그 사실을 적는다                                                                                                  |
    | `export_file`      | `{ format: 'png' \| 'jpg' \| 'svg' }`                          | 그 종류의 `EXPORT_FORMATS`가 아니면 오류. `adapter.exportBytes` → `deps.exportFile`(사용자가 저장 위치를 고른다). 결과는 파일 이름만 알리고, 취소하면 취소라고 알린다 |
    | `load_guide`       | `{ guides: string[] }`                                         | 안내 묶음을 돌려준다. 모르는 이름이면 있는 이름을 알려 준다(sheets `guides.ts`와 같음)                                                                                |

  - 기본 안내문(영어, 각 40줄 안쪽): 한판의 AI 포토/AI 일러스트 탭에서 PhotoCraft/VectorCraft를 명령으로 다룬다. 맥락의 문서 요약을 먼저 본다. `find_commands` → `describe_command` → `run_commands` 순서로 하고, 한 묶음으로 실행하는 것을 먼저 고른다. 저장했다고 말하지 않는다(저장은 사용자의 일이고, `export_file`은 사용자가 고른다). 단위는 일러스트는 pt, 포토는 px다. 끝나면 무엇을 바꿨는지 짧게 말한다.
  - 일러스트 안내 묶음 6개는 공식 웹판의 `describe_command` 결과(시험 스크립트로 뽑음)로 쓴다. 다룰 명령: `shape.*`, `text.create`·`text.setStyle`, `select.*`·`object.align`·`object.move`·`object.rotate`, `paint.setFill`·`paint.setStroke`·`stroke.*`, `imageTrace.make`·`makeAndExpand`, 내보내기(`export_file`).

- [ ] **Step 1: 실패하는 테스트**(가짜 페이지와 fixture)

```ts
test('find_commands hides blocked commands') // 'save' → no file.*, document.save
test('find_commands matches words across id, label and menu') // 'align center' → object.align, align.horizontalCenter
test('describe_command refuses a blocked id')
test.each([
  'file.save',
  'edit.undo',
  'app.quit',
  'prefs.set',
  'plugin.install',
  'window.newWindow',
])('run_command refuses %s without calling the app')
test('run_command runs with {} when params are missing and reports the result')
test('run_command records the history length once, before the first change')
test('run_command does not start tracking for read-only commands') // document.inspect
test('run_command cuts its output to 4,000 characters')
test('run_commands stops at the first failure and lists the steps that did not run')
test('run_commands refuses a batch that contains a blocked command before running any step')
test('inspect_document cuts large trees with a note')
test('export_file asks the user through exportFile and never writes by itself')
test('export_file refuses a format the kind cannot export') // photo + svg
test('load_guide returns the guides and names them on a typo')
test('every fixture command under file., app., help., prefs., plugin., window. and ui. is blocked')
test('shape., object., text., path., select. and paint. commands stay available')
test(
  'finish reports the history growth as steps / null without changes / overflow when history did not grow',
)
test('undoRun refuses when history changed since the run') // Review Focus 3
test('undoRun reports failed when the app refuses part way')
test(
  'the lock blocks keys and pointer events inside the frame until unlocked; unlock twice is safe',
)
```

- [ ] **Step 2:** Run `npx vitest run`(apps/graphics) → Expected: 새 테스트 FAIL
- [ ] **Step 3:** 공식 웹판에서 fixture와 안내 묶음 원문을 뽑는다(시험 스크립트, `scratchpad/vc-probe` 방식). 그다음 Interfaces대로 만든다.
- [ ] **Step 4:** Run `npx vitest run`, `npm run typecheck -w @genoffice/graphics` → Expected: PASS
- [ ] **Step 5: 커밋** `feat(graphics): AI tools that drive the web apps' command API, with one-step undo`

### Task 7: AI 패널

epub의 AI 패널(`apps/epub/src/renderer/ai/`)이 가장 가벼운 본보기다. 복사한 뒤 책 전용 부분을 걷어 낸다.

**Files:**

- Create(epub에서 복사해 고침): `apps/graphics/src/renderer/ai/{AiDock.tsx, AiPanel.tsx, ai-panel.css, assets/*, transport.ts, connection.ts, subscription-client.ts, lang-directive.ts}`, `i18n/ai/<21개 언어>.ts`, `i18n/strings-ai.ts`
  - 걷어 낼 것: 첨부(첨부 단추, `files-skill`, `@` 문서 언급, 드라이브 첨부), `search-skill`, 책 도구(`book-tools`, `engine`), 책 전용 문구 키(21개 언어 모두에서)
  - 남길 것: 입력란, 모델 고르기, 줄 서기, 연결 안내(`AiConnectPrompt`, `AiBlockedNotice`, `AiFirstConnectionNotice`), `AiToolsUnsupportedNotice`, `AiInputTruncatedNotice`, 사용량 줄, Markdown, 중지
- Create: `apps/graphics/src/renderer/ai/snapshot.ts`
- Create: `packages/ai-provider/src/vision-support.ts`(`settingsSupportVision`을 `apps/slides/src/renderer/ai/slide-qc.ts`에서 그대로 옮김). `src/browser.ts`에서 내보낸다.
- Modify: `apps/slides/src/renderer/ai/slide-qc.ts`(정의 대신 `export { settingsSupportVision } from '@genoffice/ai-provider/browser'`), `apps/graphics/src/preload/index.ts`(AI·구독·나가는 도구 확인 다리: epub preload와 같은 멤버), `apps/graphics/src/renderer/App.tsx`(도크를 붙임), `packages/ui/tests/ai-context-wiring.test.ts`(`TRANSPORTS`, `LOOPS`, `NOTICE_PANELS`에 graphics 파일)
- Test: `apps/graphics/tests/ai-panel.test.tsx`

**Interfaces:**

- Consumes: Task 6 전부, `useAiSendGate`, `aiRunErrorText`, `localModelCapabilities`, `composeWithDrive`.
- Produces:
  - `settingsSupportVision(settings, statuses?)`: `@genoffice/ai-provider/browser`에서
  - `canvasShot(adapter, vision: boolean): Promise<{ images?: AgentImage[]; note: string }>`
    - vision이면 `adapter.snapshotPng(1024)` → `{ images: [{ base64, mime: 'image/png' }], note: '(Attached image: the current canvas of this document, scaled down.)' }`
    - 아니면 `{ note: '(No canvas picture: the current model cannot see images.)' }`
  - `<GraphicsAiDock kind adapter frameLock onBusyChange />`
    - `AgentLoop({ transport, skill: composeWithDrive('graphics', '', () => loop.messages, [createGraphicsSkill(…)]), toolsAllowed: () => localModelCapabilities(settings).tools !== false, systemSuffix: () => aiLangDirective(lang), events })`
  - 보내기 순서: 문지기 통과 → `contextSummary()`를 받아 맥락 ref에 둔다 → `canvasShot(adapter, settingsSupportVision(settings, statuses))` → `frameLock()`과 `onBusyChange(true)` → `loop.run(instruction + '\n\n' + note, images)`
  - 끝(`onDone`, `onError`, 중지): `tracker.finish()` → 결과를 마지막 답 말풍선의 `undo`에 둔다 → 잠금을 풀고 `onBusyChange(false)`
  - 말풍선: `steps > 0`이면 [되돌리기](`aiUndoAll`). 누르면 `undoRun`. `undone`이면 단추를 지우고 `aiUndone`, `changed-since`면 `aiUndoChangedSince`, `failed`면 `aiUndoFailed`. `overflow`면 단추 대신 `aiUndoOverflow`.
  - 새 AI 문구 키(21개 언어): `aiUndoAll`('되돌리기' / 'Undo'), `aiUndoTitle`('이 요청이 바꾼 것을 모두 되돌립니다' / 'Undo everything this request changed'), `aiUndone`, `aiUndoChangedSince`('그 뒤로 문서가 바뀌어 한 번에 되돌릴 수 없습니다. 앱의 되돌리기(Ctrl+Z)를 쓰세요'), `aiUndoOverflow`, `aiUndoFailed`, `aiBusyNotice`('AI가 일하는 동안에는 문서를 고칠 수 없습니다'), `aiEmptyPhoto`('예: "배경 지워 줘", "밝기를 조금 올려 줘"'), `aiEmptyIllust`('예: "가운데에 둥근 사각형을 그려 줘", "로고를 PNG로 내보내 줘"'), 도구 요약 `aiToolFind`, `aiToolDescribe`, `aiToolRun`, `aiToolRunMany`, `aiToolInspect`, `aiToolExport`, `aiToolGuide`

- [ ] **Step 1: 실패하는 테스트**(가짜 transport가 `run_command` 호출과 마지막 글을 낸다. 구독 연결부는 가짜다. 실제 `claude`·`codex`에 닿지 않는다)

```ts
test('a run locks the app frame and unlocks when it ends')
test('a run that changed the document shows one undo button that undoes every step') // history +3 → edit.undo ×3
test('a stopped run still offers to undo the partial changes') // Review Focus 2
test('the undo button refuses after the user edited the document')
test('sends the canvas picture only to a model that can see images')
test('shows the tools-unsupported notice for a local model without tools')
test('the context carries the document summary taken before the run')
```

- [ ] **Step 2:** Run `npx vitest run`(apps/graphics), `npx vitest run tests/ai-context-wiring.test.ts`(packages/ui) → Expected: FAIL
- [ ] **Step 3:** Files·Interfaces대로 만든다.
- [ ] **Step 4:** Run graphics·ui·slides·ai-provider 테스트, `npm run typecheck` → Expected: 기준선 밖 실패 없음.
- [ ] **Step 5: 커밋** `feat(graphics): AI assistant panel for AI Photo and AI Illustration`

### Task 8: 빠른 작업 단추

**Files:**

- Create: `apps/graphics/src/renderer/quick/{quick-actions.ts, QuickBar.tsx, ExportDialog.tsx, resize.ts}`
- Modify: `App.tsx`(위쪽 막대에 단추, 메뉴의 `export`는 `ExportDialog`를 연다), 앱 문구 21개 언어
- Test: `apps/graphics/tests/{quick-actions.test.ts, export-dialog.test.tsx}`

**Interfaces:**

- Consumes: `GraphicsAdapter`, `GraphicsApi.pickImage`·`exportFile`, Task 6의 `lockFrameInput`
- Produces:
  - `QUICK_ACTIONS = { photo: ['removeBackground', 'autoTone', 'exportAtSize'], illust: ['traceImage', 'centerOnArtboard', 'exportPngSvg'] } as const`
  - `runQuickAction(id: QuickActionId, deps: { adapter; pickImage(): Promise<PickedImage | null>; exportFile(req): Promise<ExportResult>; askExport(kind): Promise<{ format: 'png' | 'jpg' | 'svg'; width?: number; height?: number } | null>; lock(): () => void }): Promise<{ ok: boolean; messageKey: AppStringKey; detail?: string }>`
    - `removeBackground`: `execute('layer.removeBackground', {})`. 거절되면 명령의 `disabled_reason`(또는 오류)을 `detail`로
    - `autoTone`: `execute('image.autoTone', {})`
    - `exportAtSize`: `askExport('photo')` → `exportBytes('png')` → `resizeImage` → `exportFile`
    - `traceImage`: 선택한 것이 그림이면(`document.inspect {ids: []}`의 `selection` → `document.node {id}`의 `kind`가 `Image`) 바로 `imageTrace.makeAndExpand {}`. 아니면 `pickImage` → `placeImage` → `imageTrace.makeAndExpand {}`. 고르기를 취소하면 아무것도 하지 않는다.
    - `centerOnArtboard`: 선택이 비었으면 `select.all {}` 먼저, 그다음 `object.align { horizontal: 'center', vertical: 'center', to: 'artboard' }`
    - `exportPngSvg`: `askExport('illust')`(PNG / SVG) → `exportBytes` → `exportFile`
    - 모두 `lock()` 안에서 돌고, AI가 도는 동안에는 단추가 꺼진다.
  - `resizeImage(bytes, width, height, format: 'png' | 'jpg', quality = 0.9): Promise<Uint8Array>`(`createImageBitmap` + `OffscreenCanvas.convertToBlob`)
  - `ExportDialog`: 형식 고르기, 너비·높이(비율 고정, 원래 크기를 미리 채움). 문구 키 `quickRemoveBackground`('배경 지우기' / 'Remove background'), `quickAutoTone`('자동 보정' / 'Auto tone'), `quickExportAtSize`('크기 맞춰 내보내기' / 'Export at size'), `quickTraceImage`('그림 따라 그리기' / 'Trace image'), `quickCenter`('가운데 정렬' / 'Center on artboard'), `quickExportPngSvg`('PNG·SVG 내보내기' / 'Export PNG or SVG'), 결과 문구, 대화상자 문구(21개 언어)

- [ ] **Step 1: 실패하는 테스트**

```ts
test('removeBackground runs layer.removeBackground and reports the app refusal reason')
test('traceImage traces a selected image without asking for a file')
test('traceImage asks for a picture, places it and traces it')
test('traceImage does nothing when the picture dialog is canceled')
test('centerOnArtboard selects everything first when nothing is selected')
test('exportAtSize keeps the ratio') // 1000×500, width 500 → height 250
test('quick actions are disabled while the AI runs')
```

- [ ] **Step 2:** Run → Expected: FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** Run graphics 테스트, `npm run check:theme-colors` → Expected: PASS
- [ ] **Step 5: 커밋** `feat(graphics): three quick actions per app that run without AI`

### Task 9: 고지, 문서, 포장 확인

**Files:**

- Create: `tools/graphics-notices.mjs`(+ `.d.mts`), `packages/cli/tests/graphics-notices.test.ts`
- Modify: `tools/gen-third-party-notices.mjs`(Task 1에서 비운 자리에 8절, 모든 운영체제)
- Modify 문서:
  - `PRIVACY.md`: AI 도우미에 무엇이 가는지(요청 글, 문서 요약: 레이어 이름·크기·선택, 그림을 보는 모델이면 캔버스 그림). 웹판 자체는 아무것도 보내지 않는다.
  - `docs/security.md`: 새 절 "AI 포토·AI 일러스트". 같은 출처 페이지 API의 범위, 디스크에 쓰는 길은 main 저장뿐, AI가 막히는 명령, `frame-ancestors`, 앱 복구 저장 끔, 운영체제 파일 연결 없음, AI 실행 중 가로챈 파일은 쓰지 않음.
  - `docs/contracts.md`: 앱 안 MCP `open_documents`의 새 family `photo`·`illust`(읽기·저장 없음)
  - `apps/graphics/AGENTS.md`(맡은 범위, 경계, 항상 지킬 것, 방식, 테스트), `apps/shell/AGENTS.md`(그래픽 탭 배선 한 항목과 "바꾸면 반드시 테스트하는 것"), `AGENTS.md`·`CLAUDE.md`(구조에 `apps/graphics/AGENTS.md` 한 줄. 두 파일은 내용이 같다)
  - `docs/tracking/status.md`, `docs/tracking/findings.md`(아래 "남은 일"의 코드 쪽 항목)
  - `README.md`, `README.en.md`: 기능 목록에 한 줄. 출처는 "PhotoCraft·VectorCraft 웹판(MIT OR Apache-2.0)을 고쳐 씀"이라는 평문만 쓴다.
  - `.github/workflows/windows-build.yml`: 설치본 확인 목록에 `resources/modules/graphics/renderer/web/photo/index.html`과 `illust`

**Interfaces:**

- Produces:
  - `graphicsNoticeFiles(dir: string): string[]`: 맨 위의 `LICENSE-*`, `NOTICE*`, `ATTRIBUTION.md`, `ASSETS.md`, `OFL-*.txt`, `HANPAN-CHANGES.md`, 그다음 `licenses/` 아래 모든 파일. 각각 이름순.
  - `graphicsNoticeSection({ webRoot, pins, read, gap }): string`: 제목 `8. AI Photo and AI Illustration web apps (PhotoCraft and VectorCraft)`. 앱마다 `sub('<kind> <tag> (https://github.com/<repo>)')`, 파일마다 `--- <kind>/<file> ---`. 같은 글은 한 번만. 웹판 폴더나 핀이 없으면 `gap()`을 부르고 그 앱을 건너뛴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
test('lists notices and licences in a stable order')
test('gaps an app whose web build is missing')
test('writes identical texts once')
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** 만든다. **Step 4:** Run cli 테스트, `npm run notices`(CI 아님: 경고만), `npm run check:help-langs`, `npm run check:no-genspark` → Expected: PASS
- [ ] **Step 5: 커밋** `docs(hanpan): notices, privacy and security notes for AI Photo and AI Illustration`

### Task 10: 실제 웹판 연결 (계획 A 릴리스 뒤, 11/6~)

**Files:**

- Modify: `tools/graphics-web-pins.json`(두 앱)
- Create: `apps/graphics/src/renderer/adapters/photo.ts`, `ai/prompts/guides/photo-{background,adjust,text,crop-resize,export}.md`, `tests/fixtures/photocraft-0.20.2-h1-commands.json`, `tests/photo-adapter.test.ts`
- Modify: `adapters/index.ts`(photo 연결), `kinds.ts`(실제로 열리지 않는 확장자를 뺌), e2e `graphics.spec.ts`(포토 경우)

**Interfaces:**

- Consumes: 계획 A Task 3·6·7. 포토의 저장·내보내기 명령 id와 매개변수는 계획 A `scripts/smoke.mjs`의 `capture`·`save-clean` 검사에 고정된 것을 쓴다(`tenaico/hanpan-graphics` 태그 `photo-v0.20.2-h1`).
- Produces: 일러스트와 같은 `GraphicsAdapter` 모양의 포토 어댑터. `isLayered`는 레이어가 둘 이상이거나, 글자 레이어·마스크(`hasMask`, `hasVectorMask`)·조정 레이어가 있으면 참.

- [ ] **Step 1:** 릴리스를 확인한다. `gh release view photo-v0.20.2-h1 --repo tenaico/hanpan-graphics`, `illust-v0.21.0-h1`도. `.sha256` 내용과 자산 크기로 핀을 채운다. 릴리스가 없으면 시작한 세션에 묻고 기다린다.
- [ ] **Step 2:** Run `node tools/fetch-graphics-web.mjs` → Expected: 두 앱 `fetched`. 다시 돌리면 `cached`.
- [ ] **Step 3:** 포토 웹판을 시험 스크립트로 띄워 `commands()`(fixture), `inspect()`·문서 inspect의 모양, `edit.undo`, 저장·PNG 내보내기, `layer.removeBackground`·`image.autoTone`의 결과를 적는다. 막는 명령 테스트를 포토 fixture로도 돌린다.
- [ ] **Step 4:** 포토 어댑터 테스트를 쓰고(일러스트 어댑터 테스트와 같은 항목, 실제 모양의 가짜) → FAIL → 만든다 → PASS.
- [ ] **Step 5:** `OPEN_EXTS`의 확장자마다 작은 시험 파일을 실제 웹판으로 열어 본다. 열리지 않는 것은 목록과 테스트에서 뺀다.
- [ ] **Step 6:** 한글을 확인한다. 두 앱에서 `안녕하세요 한판`을 쓰고 PNG로 내보내 눈으로 본다(□가 없어야 한다). 일러스트는 `text.missingFonts`가 비어 있어야 한다.
- [ ] **Step 7:** 다시 빌드한 뒤 e2e `graphics.spec.ts`를 두 앱 모두 돌린다(embedded 모드: 열기·닫기 명령이 꺼졌는지 포함) → Expected: PASS
- [ ] **Step 8: 커밋** `feat(graphics): connect the pinned PhotoCraft and VectorCraft web builds`

### Task 11: 전체 검사, e2e, 마무리

- [ ] **Step 1:** 합치기 전 검사 10개(`docs/standards.md`): `typecheck`, `lint`, `format:check`, `test`(작업 공간별로 돌려 기준선과 비교), `licenses`, `check:theme-colors`, `check:english-comments`, `check:help-langs`, `check:skill-version`, `check:no-genspark` → Expected: 기준선 밖 실패 없음.
- [ ] **Step 2:** e2e: `graphics.spec.ts`, `home.spec.ts`, `hwp-close-unsaved.spec.ts`(닫기 흐름 회귀), `crash-recovery.spec.ts`(세션 종류 회귀). `E2E_NO_VIDEO=1`. 기준선(`e2e-baseline.log`)과 비교한다.
- [ ] **Step 3:** 실제 구독 확인(사용자 확인 뒤, 앱마다 요청 두 번): AI 포토 "배경 지워 줘", AI 일러스트 "가운데에 파란 둥근 사각형과 '한판' 글자를 넣어 줘". 결과, [되돌리기] 한 번으로 원래대로 돌아오는지, 걸린 시간을 적는다.
- [ ] **Step 4:** 가지 전체를 새 검토자 한 명이 본다(superpowers:requesting-code-review). 고칠 것은 고치고 다시 Step 1.
- [ ] **Step 5:** `docs/tracking/status.md`에 결과를 적고, 3줄 보고를 쓴다.

## 일정 (설계 7장에 맞춤)

| 날짜        | 작업                                                                   |
| ----------- | ---------------------------------------------------------------------- |
| 11/5~11/6   | Task 0, 1, 2(계획 A 결과물 없이 하는 일)                               |
| 11/7~11/9   | Task 3, 4, 5, 9(탭, 저장, 셸 배선, 고지). 릴리스가 나오면 Task 10 시작 |
| 11/10~11/11 | Task 6, 7, 8, 10(AI 도우미, 빠른 작업, 실제 웹판)                      |
| 11/12       | Task 11, 사용자 확인 뒤 GitHub 설치파일 빌드와 이 PC 설치 시험         |
| 11/13       | 시연 노트북 설치와 리허설(사용자와 함께)                               |

## 남은 일과 담당

| 일                                                                              | 담당                     | 기한        |
| ------------------------------------------------------------------------------- | ------------------------ | ----------- |
| 계획 A 릴리스(`photo-v0.20.2-h1`, `illust-v0.21.0-h1`)                          | 계획 A 세션              | 11/6        |
| push, GitHub 설치파일 빌드(Windows), 이 PC 설치 시험                            | 사용자 확인 뒤 이 세션   | 11/12       |
| 실제 구독으로 AI 확인(Task 11 Step 3)                                           | 사용자 확인 뒤 이 세션   | 11/11~11/12 |
| 시연 노트북 설치와 리허설                                                       | 사용자(혁준)와 함께      | 11/13       |
| 도움말 주제 "AI 포토·AI 일러스트" 21개 언어(소개 사이트 질문 도우미가 읽음)     | 이 작업의 후속           | 11/20 전    |
| 자동 저장과 갑자기 꺼졌을 때의 복구 사본(설계 6-3 "자동 저장", 결정 0061)       | 시연 뒤                  | 11/20 이후  |
| 앱 화면의 "내보내기"로 같은 이름·같은 크기 파일을 다시 내보내면 저장 창이 안 뜸 | findings에 기록, 시연 뒤 | 11/20 이후  |
| 원본(ArtCraft) 저장소에 제안 게시                                               | 사용자 확인 뒤           | 시연 뒤     |
| 소개 사이트 업데이트 소식                                                       | 저장소 주인              | 11/20 배포  |
