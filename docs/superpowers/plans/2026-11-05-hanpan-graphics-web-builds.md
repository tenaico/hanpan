# 계획 A: hanpan-graphics 웹판 수정판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tenaico/hanpan-graphics`에서 PhotoCraft·VectorCraft 웹판을 고정 버전으로 받아 패치 1~4를 입혀 빌드한다. 결과는 한판이 받아 쓸 zip과 SHA-256이며, GitHub 릴리스로 올린다.

**Architecture:** 원본 코드는 저장소에 넣지 않는다. 빌드 때마다 `pins.json`의 커밋으로 원본을 받고, `patches/<app>/NNNN-*.patch`를 순서대로 입히고, `trunk build --release`로 빌드한다. 그다음 글꼴·라이선스·바뀐 내용 문서를 더해 zip으로 묶는다. 결과는 두 가지로 검증한다.

- 정적 검사(`verify`): 브랜드 문자열과 파일 구성
- Electron 시험(`smoke`): 실제로 띄워 API·글꼴·embedded 모드 확인

**Tech Stack:** Node 22+ (ESM, `node --test`), Rust stable 1.95+ (이 PC 1.99.1) + wasm32-unknown-unknown, Trunk 0.21.14, Electron 43.7.6(시험용 devDependency), yazl(zip), GitHub Actions(ubuntu-latest).

**Spec:** `C:\Users\ten\Desktop\hanpan\docs\superpowers\specs\2026-11-05-hanpan-ai-photo-illust-design.md`(6-1, 6-2, 6-8, 6-9). 실행자는 이 계획과 설계를 같이 읽는다.

## Global Constraints

- 저장소: `https://github.com/tenaico/hanpan-graphics`(공개). 로컬: `C:\Users\ten\Desktop\hanpan-graphics`.
- 고정 버전(`pins.json`):
  - photo = `storytold/photocraft` 태그 `v0.20.2`, 커밋 `7c12f647150f8e7b2e07718f7993b1fcaa57fefe`, 웹 앱 폴더 `apps/photocraft-web`, 한판 판 번호 1
  - illust = `storytold/vectorcraft` 태그 `v0.21.0`, 커밋 `11862f61198c8f62c0b22b6c9a331cc5950ac98d`, 웹 앱 폴더 `apps/vectorcraft-web`, 한판 판 번호 1
  - craftFonts = `storytold/craft-fonts` 커밋 `b076417b5880bd4154bd22f00695b1d28c6bea83`
- 결과 파일 이름과 릴리스 태그:
  - `hanpan-photo-web-0.20.2-h1.zip`, `hanpan-illust-web-0.21.0-h1.zip`, 각각 `<zip>.sha256`(내용: `<64자리 hex>  <zip 이름>\n`)
  - 릴리스 태그: `photo-v0.20.2-h1`, `illust-v0.21.0-h1`
- 한글 글꼴: craft-fonts의 다음 줄을 그대로 쓴다.
  `NanumGothic | Regular | fonts/nanum-gothic/NanumGothic-Regular.ttf | Hang,Kore | OFL-1.1 | fonts/nanum-gothic/OFL.txt | 76f45ef4a6bcff344c837c95a7dcc26e017e38b5846d5ae0cdcb5b86be2e2d31 | https://github.com/google/fonts/tree/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/nanumgothic`
- 브랜드(설계 3-1):
  - 결과물에 `getartcraft`, `discord.gg`, `discord.com/invite`가 없어야 한다(대소문자 무시).
  - "ArtCraft"는 출처 문장 안에서만 나올 수 있다. 출처 문장: `Based on PhotoCraft by the ArtCraft team (MIT or Apache-2.0), modified for Hanpan.`(VectorCraft는 앱 이름만 바꿈)
  - 앱 이름 PhotoCraft·VectorCraft와 앱 아이콘은 그대로 둔다.
- 패치 원칙(설계 6-2):
  - 앱마다 목적별 패치 파일 하나씩, 대략 100줄 안쪽.
  - engine·raster·vector 같은 핵심 crate는 고치지 않는다. 패치 1은 원본 PR #9345(+224/−2)를 바탕으로 한다.
- 라이선스: 우리 패치와 스크립트는 MIT OR Apache-2.0. zip에는 원본 `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, `ATTRIBUTION.md`, 들어간 글꼴의 OFL 글, `HANPAN-CHANGES.md`를 넣는다.
- 커밋: 영어 메시지, 작성자 `grapevine26 <37573099+grapevine26@users.noreply.github.com>`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 원본 저장소에 이슈·PR·댓글을 올리지 않는다(사용자 확인 뒤 별도로 한다).
- 긴 빌드(약 17분)는 백그라운드로 돌린다.

## Review Focus

1. **원본 버전을 올렸는데 패치가 안 맞는 경우:** 컴파일 전에 그 패치 이름을 대며 멈춘다. 반쯤 패치된 채로 빌드되면 안 된다. → Task 1 `applyPatches leaves the tree untouched when one patch does not apply`
2. **API가 생기자마자 부르는 경우**(한판은 `window.photocraft`가 보이자마자 부른다): 앱이 다 뜬 뒤 응답하고, 던지거나 멈추지 않는다. → Task 3 smoke 검사 `api-immediate`
3. **글꼴이 도착하기 전에 한글 글자를 만드는 경우:** 글꼴이 오면 그 글꼴로 다시 그려지고, 대체 글꼴 경고가 남지 않는다. → Task 4 smoke 검사 `fonts-early-text`
4. **브랜드 문자열의 변형**(대소문자, 번역 파일 안의 링크, 짧은 디스코드 초대 주소): 정적 검사가 잡는다. → Task 2 `scanBrand finds variants`
5. **`embedded`가 다른 매개변수와 함께 오는 경우**(`?lang=ko&embedded=hanpan`): embedded 모드가 그대로 켜진다. → Task 6 smoke 검사 `embedded-with-lang`

---

### Task 1: 저장소 뼈대, 고정 버전, 원본 받기·패치 입히기

**Files:**

- Create: `package.json`, `.gitignore`(`work/`, `out/`, `node_modules/`), `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE.md`, `README.md`, `pins.json`
- Create: `scripts/lib/pins.mjs`, `scripts/lib/upstream.mjs`, `scripts/lib/patches.mjs`, `scripts/lib/hash.mjs`
- Test: `test/pins.test.mjs`, `test/patches.test.mjs`, `test/hash.test.mjs`

**Interfaces:**

- Produces:
  - `readPins(path = 'pins.json'): Pins`
    - `Pins = { photo: AppPin, illust: AppPin, craftFonts: { repo: string, commit: string } }`
    - `AppPin = { repo, tag, commit, webApp, global: 'photocraft'|'vectorcraft', hanpanRev: number }`
    - 잘못된 값이면 무엇이 틀렸는지 담아 `Error`를 던진다: 40자리 hex가 아닌 커밋, `v` 없는 태그, 1 미만의 판 번호, 빠진 키.
  - `artifactName(app: 'photo'|'illust', pins): string`, 예: `hanpan-photo-web-0.20.2-h1.zip`
  - `releaseTag(app, pins): string`, 예: `photo-v0.20.2-h1`
  - `checkoutPinned({ repo, tag, commit }, dir): void`: `git clone --depth 1 --branch <tag>`. `HEAD`가 커밋과 다르면 던진다. 이미 있는 `dir`은 지우고 새로 받는다.
  - `patchList(app): string[]`: `patches/<app>/`의 `^\d{4}-[a-z0-9-]+\.patch$` 파일을 번호 순으로 돌려준다. 이름 규칙에 안 맞는 파일이 있으면 던진다.
  - `applyPatches(dir, patches): void`: 모든 패치에 `git apply --check`를 먼저 하고, 하나라도 실패하면 아무것도 입히지 않고 그 패치 이름으로 던진다. 다 통과하면 순서대로 `git apply`.
  - `sha256File(path): string`, `sha256Line(hex, name): string`

- [ ] **Step 1:** 빈 저장소를 클론한다.
  - Run: `git clone https://github.com/tenaico/hanpan-graphics.git /c/Users/ten/Desktop/hanpan-graphics`
  - `package.json`: `"type": "module"`, `"engines": { "node": ">=22" }`, `"scripts": { "test": "node --test test/" }`
- [ ] **Step 2: 실패하는 테스트**

```js
// test/pins.test.mjs
test('reads the pinned versions', () => {
  const p = readPins('pins.json')
  assert.equal(p.photo.commit, '7c12f647150f8e7b2e07718f7993b1fcaa57fefe')
  assert.equal(p.illust.commit, '11862f61198c8f62c0b22b6c9a331cc5950ac98d')
  assert.equal(p.craftFonts.commit, 'b076417b5880bd4154bd22f00695b1d28c6bea83')
})
test('names the outputs', () => {
  const p = readPins('pins.json')
  assert.equal(artifactName('photo', p), 'hanpan-photo-web-0.20.2-h1.zip')
  assert.equal(releaseTag('illust', p), 'illust-v0.21.0-h1')
})
test('rejects a short commit', () => {
  /* temp pins with commit 'abc' → throws /commit/ */
})

// test/patches.test.mjs (a temp git repo with one file, two patches)
test('applies patches in number order', () => {})
test('applyPatches leaves the tree untouched when one patch does not apply', () => {
  // 0001 applies, 0002 conflicts → throws /0002-/; `git status --porcelain` is empty
})
test('refuses a file that does not follow the naming rule', () => {})

// test/hash.test.mjs
test('formats a sha256 line as "<hex>  <name>\\n"', () => {})
```

- [ ] **Step 3:** Run `npm test` → Expected: FAIL(모듈 없음)
- [ ] **Step 4:** 네 모듈과 `pins.json`을 Interfaces대로 만든다.
  - `README.md`(영어+한국어 짧게): 무엇인지, 빌드 방법, 한판이 쓰는 방식.
  - `NOTICE.md`: 출처 문장, "Not affiliated with or endorsed by ArtCraft", 원본 라이선스 안내.
- [ ] **Step 5:** Run `npm test` → Expected: PASS
- [ ] **Step 6: 커밋** `chore: scaffold, pinned upstream versions and the patch applier`

### Task 2: 빌드·묶기 파이프라인, 정적 검사, Electron 시험 틀

**Files:**

- Create: `scripts/lib/brand.mjs`, `scripts/lib/stage.mjs`, `scripts/lib/zip.mjs`, `scripts/build.mjs`, `scripts/verify.mjs`, `scripts/smoke.mjs`, `scripts/smoke-main.cjs`, `CHANGES-photo.md`, `CHANGES-illust.md`
- Modify: `package.json`(devDependencies `electron@43.7.6`, `yazl`, scripts `build`, `verify`, `smoke`)
- Test: `test/brand.test.mjs`, `test/zip.test.mjs`

**Interfaces:**

- Consumes: Task 1 전부.
- Produces:
  - `scanBrand(name: string, bytes: Buffer, allowed: string[]): { file, match, offset }[]`
    - 대소문자를 무시하고 `getartcraft`, `discord.gg`, `discord.com/invite`를 찾는다.
    - `ArtCraft`는 `allowed` 문장 안에 있지 않은 것만 찾는다.
  - `stageSite(app, workDir, outDir): string`(사이트 폴더 경로)
    - `work/<app>/dist/web` 전체를 복사한다.
    - 원본 루트의 `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, `ATTRIBUTION.md`를 복사한다.
    - `CHANGES-<app>.md`를 `HANPAN-CHANGES.md`로 복사한다.
  - `zipDir(dir, zipPath): void`: 파일 이름 순서, 수정 시각 1980-01-01로 고정한다. 같은 입력이면 같은 바이트가 나온다.
  - CLI
    - `node scripts/build.mjs <photo|illust>`
      1. 원본(`work/<app>`)과 craft-fonts(`work/craft-fonts`)를 고정 커밋으로 받는다.
      2. 패치를 입힌다.
      3. `trunk build --release`로 빌드한다. illust는 `CRAFT_FONTS_DIR=work/craft-fonts`, `CRAFT_FONTS_REQUIRED=1`.
      4. `stageSite`, `zipDir`, `.sha256`을 만든다.
    - `node scripts/verify.mjs <app>`: `out/<app>/site`의 모든 파일에 `scanBrand`를 돌린다. 찾은 게 있으면 목록을 찍고 종료 코드 1.
    - `node scripts/smoke.mjs --app <app> --site <dir> --checks a,b,... [--query "<url query>"] [--renderer auto|webgl|cpu]`
      - Electron으로 사이트를 사용자 지정 프로토콜 `hgsmoke://app/index.html`로 띄운다. `.wasm`은 `application/wasm`으로 내보낸다.
      - 각 검사를 돌려 `{check, ok, detail}`을 JSON 줄로 찍는다. 하나라도 실패하면 종료 코드 1.
      - 창 화면을 `out/<app>/smoke-<check>.png`로 저장한다.
  - smoke 검사 이름(이 Task에서 `boot`, `api`를 만들고, 뒤 Task가 더한다)
    - `boot`: 60초 안에 콘솔에 `panicked` 없이 첫 화면이 그려진다(캔버스가 생김).
    - `api`: 60초 안에 `window[global]`이 생기고, `request, execute, commands, inspect, screenshot, openFile, captureDownloads, files, readFile`이 모두 함수다. `commands().length`는 photo ≥ 400, illust ≥ 1000이다.

- [ ] **Step 1: 실패하는 테스트**

```js
// test/brand.test.mjs
const OK = 'Based on PhotoCraft by the ArtCraft team (MIT or Apache-2.0), modified for Hanpan.'
test('scanBrand finds variants', () => {
  const hits = scanBrand(
    'x',
    Buffer.from('Join https://DISCORD.gg/abc or getArtCraft.com — ARTCRAFT'),
    [OK],
  )
  assert.deepEqual(
    hits.map((h) => h.match.toLowerCase()),
    ['discord.gg', 'getartcraft', 'artcraft'],
  )
})
test('allows ArtCraft inside the credit sentence only', () => {
  assert.deepEqual(scanBrand('x', Buffer.from(`About: ${OK}`), [OK]), [])
})
// test/zip.test.mjs
test('zipDir is byte-for-byte reproducible', () => {
  /* zip the same temp dir twice → equal sha256 */
})
```

- [ ] **Step 2:** Run `npm test` → Expected: 새 테스트 FAIL
- [ ] **Step 3:** 모듈과 CLI를 Interfaces대로 만든다. `smoke-main.cjs`는 11/5 시험(`scratchpad/vc-spike/main.cjs`)의 방식을 따른다.
  - 숨긴 창, `backgroundThrottling: false`, `paintWhenInitiallyHidden: true`
  - 사용자 데이터 폴더는 임시 폴더
- [ ] **Step 4:** Run `npm test` → Expected: PASS
- [ ] **Step 5: 패치 없는 빌드**(백그라운드, 앱마다 약 17분). `node scripts/build.mjs illust`, `node scripts/build.mjs photo`
  - Expected: 둘 다 `out/hanpan-*-web-*.zip`과 `.sha256`이 생긴다.
- [ ] **Step 6: 기준 확인**(RED 기록)
  - `node scripts/smoke.mjs --app illust --site out/illust/site --checks boot,api` → Expected: PASS(원본에 API가 있음)
  - `node scripts/smoke.mjs --app photo --site out/photo/site --checks boot,api` → Expected: `boot` PASS, `api` FAIL(Task 3의 RED)
  - `node scripts/verify.mjs photo`, `node scripts/verify.mjs illust` → Expected: FAIL. 찾은 목록에 Discord·getartcraft가 있다(Task 5의 RED). 목록을 Task 5에서 쓰도록 `out/<app>/brand-baseline.txt`에 저장한다.
- [ ] **Step 7: 커밋** `feat: build, stage, zip and verify pipeline with an Electron smoke harness`

### Task 3: 패치 1, PhotoCraft 페이지 제어 API

**Files:**

- Create: `patches/photo/0001-web-control-api.patch`
- Modify: `scripts/smoke.mjs`(검사 `api-immediate`, `capture`), `CHANGES-photo.md`

**Interfaces:**

- Consumes: Task 2의 smoke CLI.
- Produces: 웹 페이지의 `window.photocraft`. VectorCraft의 `window.vectorcraft`와 메서드 이름·동작이 같다. 한판(계획 B)이 이것만 믿고 쓴다.
  - `request(method: string, params?: object): Promise<any>`
  - `execute(id: string, params?: object): Promise<any>`
  - `commands(): Promise<{id, label, params, enabled}[]>`
  - `inspect(): Promise<object>`
  - `screenshot(): Promise<object>`
  - `openFile(name: string, bytes: Uint8Array): Promise<boolean>`
  - `captureDownloads(on: boolean): void`
  - `files(): Promise<{path: string, size: number}[]>`
  - `readFile(path: string): Promise<Uint8Array>`
- 새 smoke 검사
  - `api-immediate`: `window.photocraft`가 생긴 바로 그 틱에 `commands()`를 불러도 배열로 끝난다(던지지 않음).
  - `capture`:
    1. `captureDownloads(true)`
    2. 새 문서를 연다. 대화상자 없이 만드는 명령 id를 `commands()`에서 찾아 검사 코드에 고정한다.
    3. PNG로 내보낸다. 내보내기 명령 id도 같은 방법으로 고정한다.
    4. `files()`에 나온 경로를 `readFile`로 읽은 바이트가 PNG 서명(`89 50 4E 47`)으로 시작한다.

- [ ] **Step 1:** `scripts/smoke.mjs`에 `api-immediate`, `capture`를 더한다.
- [ ] **Step 2:** Run `node scripts/smoke.mjs --app photo --site out/photo/site --checks api,api-immediate,capture` → Expected: FAIL(API 없음)
- [ ] **Step 3: 패치를 만든다.**
  1. `gh pr diff 9345 --repo storytold/photocraft`를 받는다.
  2. `work/photo`(v0.20.2)에 맞게 고친다.
     - `app.logic` 호출은 `logic_frame`으로 바꾼다.
     - `ControlRequest`의 `deadline`은 `None`이다(웹에서 `std::time::Instant`는 멈춤).
     - `captureDownloads`는 `web.rs`의 `download()` 첫 줄에서 가로챈다.
  3. 원본 PR의 `contributors/people.toml`, `docs/*` 변경은 빼고 코드만 남긴다.
  4. 확인: `cargo check --target wasm32-unknown-unknown -p photocraft-web`(work/photo 안) → Expected: 성공
  5. `git -C work/photo diff > patches/photo/0001-web-control-api.patch`
- [ ] **Step 4:** Run `node scripts/build.mjs photo`(백그라운드), 이어서 Step 2의 smoke → Expected: PASS(세 검사)
- [ ] **Step 5:** `CHANGES-photo.md`에 "window.photocraft control API (based on upstream PR #9345)" 한 줄을 적는다.
- [ ] **Step 6: 커밋** `feat(photo): window.photocraft page control API`

### Task 4: 패치 2, 한글 글꼴(두 앱)

**Files:**

- Create: `patches/illust/0001-web-korean-font.patch`, `scripts/lib/fonts.mjs`
- Modify: `scripts/build.mjs`(photo에 글꼴 넣기), `scripts/smoke.mjs`(검사 `fonts`, `fonts-early-text`), `CHANGES-*.md`
- Test: `test/fonts.test.mjs`

**Interfaces:**

- Consumes: Task 3의 API(photo), 원본 API(illust).
- Produces: `photoFontManifest(craftFontsDir): { manifest: string, files: { from, to }[] }`
  - craft-fonts의 `fonts/manifest.txt`에서 `NanumGothic | Regular` 줄을 찾는다.
  - 사이트 폴더 기준 `fonts/manifest.txt` 내용을 만들고, 글꼴·OFL 두 파일의 복사 목록을 돌려준다.
  - 파일의 SHA-256이 manifest 값과 다르면 던진다.
- 새 smoke 검사
  - `fonts`: 30초 안에 그 앱의 글꼴 목록에 `NanumGothic`이 나온다.
    - illust: `execute('text.fontList', {}).families`
    - photo: 글꼴 목록을 돌려주는 명령을 `commands()`에서 찾아 검사 코드에 고정한다.
  - `fonts-early-text`: API가 생긴 즉시 새 문서에 `안녕하세요 한판`을 쓴다(illust `text.create`, photo는 글자 레이어 명령). 10초 안에 그 글자에 대체 글꼴 경고가 없다.
    - illust: `text.create` 결과에 `warning`이 없거나, 이후 `text.missingFonts`가 비어 있다.

- [ ] **Step 1: 실패하는 테스트**

```js
// test/fonts.test.mjs (a temp craft-fonts layout with the real manifest line and a fake ttf)
test('builds the PhotoCraft site manifest for NanumGothic', () => {
  // manifest line keeps family/style/scripts/licence/sha/source; file paths stay fonts/nanum-gothic/...
})
test('throws when the font bytes do not match the manifest sha256', () => {})
```

- [ ] **Step 2:** smoke에 `fonts`, `fonts-early-text`를 더한다. Run 두 앱 smoke `--checks fonts,fonts-early-text` → Expected: FAIL. `npm test` → Expected: FAIL
- [ ] **Step 3:** 고친다.
  - illust 패치: `crates/text/web-fonts.txt`에 `startup | NanumGothic | Regular` 한 줄을 넣는다. 이 목록을 고정 검사하는 `crates/text/src/craft_fonts.rs`의 `web_fonts_follow_the_list`도 함께 고친다.
  - photo: `build.mjs`의 사이트 단계에서 `photoFontManifest`로 `fonts/manifest.txt`와 두 파일을 넣는다. 코드 패치는 없다.
  - 두 앱 모두 사이트 루트에 `OFL-nanum-gothic.txt`를 둔다.
- [ ] **Step 4:** Run `cargo test -p vectorcraft-text web_fonts_follow_the_list`(work/illust 안, crate 이름은 Cargo.toml에서 확인) → Expected: PASS
- [ ] **Step 5:** 두 앱을 다시 빌드한다(백그라운드). 두 앱 smoke `--checks fonts,fonts-early-text` → Expected: PASS. `npm test` → Expected: PASS
- [ ] **Step 6: 커밋** `feat: Korean text in both web builds (NanumGothic from craft-fonts)`

### Task 5: 패치 3, 브랜드 정리(두 앱)

**Files:**

- Create: `patches/photo/0002-brand-cleanup.patch`, `patches/illust/0002-brand-cleanup.patch`
- Modify: `CHANGES-*.md`

**Interfaces:**

- Consumes: Task 2의 `verify`와 `out/<app>/brand-baseline.txt`(지울 대상 목록).
- 고칠 위치(조사 기준, 실제 위치는 baseline 목록과 `rg -n "ArtCraft|getartcraft|discord" work/<app>`로 확인):
  - photo: `links.rs`, `dialogs.rs`(About), `crates/engine/src/shell_commands.rs`(Help 메뉴), `canvas/start_screen.rs`(Discord 단추, 링크 줄), `updates_cmds.rs`(업데이트 확인), `apps/photocraft-web/index.html`, `apps/photocraft-web-boot/*`, `crates/ui-egui/src/i18n/*.tsv`의 ArtCraft 줄
  - illust: `chrome.rs`(Discord 단추), `community.rs`, `canvas/home.rs`, `dialogs/about.rs`("Part of ArtCraft…"), `menus/tree.rs`, `crates/engine/src/cmd/help.rs`, `apps/vectorcraft-web/index.html`, `i18n/*.tsv`의 ArtCraft 줄
- 규칙:
  - 링크·단추·메뉴 항목은 지운다. 업데이트 확인은 끈다(한판이 버전을 정한다).
  - About에는 Global Constraints의 출처 문장 하나를 번역하지 않는 글자로 둔다.
  - 쓰이지 않게 된 번역 줄은 모든 언어 tsv에서 지운다.

- [ ] **Step 1:** Run `node scripts/verify.mjs photo && node scripts/verify.mjs illust` → Expected: FAIL(Task 2의 RED 그대로)
- [ ] **Step 2:** `work/<app>`에서 고치고 `git diff`로 패치를 만든다. 패치 1·2 다음 번호다.
- [ ] **Step 3:** 원본의 i18n·UI 테스트 중 바뀐 crate의 테스트를 돌린다.
  - `cargo test -p <ui-egui crate>`
  - `cargo test -p <engine crate> shell_commands`(photo) / `help`(illust)
  - Expected: PASS. 쓰이지 않는 번역 키를 잡는 테스트가 있으면 그 줄을 지워 통과시킨다.
- [ ] **Step 4:** 두 앱을 다시 빌드한다(백그라운드).
  - `verify` → Expected: PASS(찾은 것 0)
  - smoke `--checks boot,api` → Expected: PASS
- [ ] **Step 5: 눈으로 확인:** smoke 스크린숏 `smoke-boot.png`의 시작 화면에 Discord 단추와 ArtCraft 링크가 없다.
- [ ] **Step 6: 커밋** `feat: remove ArtCraft branding and community links from both web builds`

### Task 6: 패치 4, 한판 안의 embedded 모드(두 앱)

**Files:**

- Create: `patches/photo/0003-embedded-mode.patch`, `patches/illust/0003-embedded-mode.patch`
- Modify: `scripts/smoke.mjs`(검사 `embedded`, `embedded-with-lang`, `save-clean`), `CHANGES-*.md`

**Interfaces:**

- Produces(계획 B가 기댐):
  - 주소에 `embedded=hanpan`이 있으면(다른 매개변수와 순서에 상관없이) 다음과 같이 동작한다.
    - 열기·최근 파일 열기·닫기·모두 닫기 명령이 `enabled:false`이고, 메뉴와 단축키에서 빠진다.
    - 새로 만들기 명령은 열린 문서가 없을 때만 `enabled:true`다(시작 화면에서 첫 문서를 만들 수 있음).
    - 문서가 열려 있으면 파일을 끌어다 놓아도 새 문서로 열지 않는다.
    - 저장·다른 이름으로 저장·내보내기는 그대로 둔다.
  - `embedded`가 없으면 원본과 똑같이 동작한다.
- 새 smoke 검사(`--query "embedded=hanpan"`)
  - `embedded`: 시작 상태에서 새로 만들기는 enabled, 열기·닫기는 disabled. 새 문서를 연 뒤에는 새로 만들기도 disabled다.
  - `embedded-with-lang`: `--query "lang=ko&embedded=hanpan"`으로 `embedded` 검사와 같은 결과다.
  - `save-clean`: `captureDownloads(true)` → 새 문서 → 도형이나 칠하기로 바꾼다(변경 표시가 켜짐) → 저장 명령(대화상자 없이, 이름 지정) → `files()`에 파일이 생기고, `inspect()`의 문서 변경 표시가 꺼진다.

- [ ] **Step 1:** smoke에 세 검사를 더한다. Run 두 앱 `--checks embedded,embedded-with-lang,save-clean --query "embedded=hanpan"` → Expected: `embedded` 계열 FAIL. `save-clean`은 결과를 기록한다(PASS면 그 부분은 패치하지 않음).
- [ ] **Step 2:** 패치를 만든다.
  - 웹 앱의 `web.rs`가 주소를 읽는 곳(photo는 `location().search()`를 이미 읽음)에서 `embedded=hanpan`을 판정한다.
  - 판정 결과는 앱의 명령 사용 가능 판단과 메뉴 만들기에 넘긴다. 핵심 crate는 건드리지 않고 `ui-egui`·웹 앱 범위에서 고친다.
  - `save-clean`이 FAIL이었다면 저장 쓰기 성공 뒤 변경 표시를 끄는 부분을 이 패치에 넣는다.
- [ ] **Step 3:** 두 앱을 다시 빌드한다(백그라운드).
  - smoke `--checks boot,api,embedded,embedded-with-lang,save-clean --query "embedded=hanpan"` → Expected: PASS
  - `--query ""`로 `--checks boot,api` → Expected: PASS(embedded가 없으면 원본 동작)
- [ ] **Step 4: 커밋** `feat: embedded=hanpan mode, one document per Hanpan tab`

### Task 7: GitHub Actions 빌드와 첫 릴리스

**Files:**

- Create: `.github/workflows/build.yml`
- Modify: `README.md`(릴리스 방법)

**Interfaces:**

- Produces(계획 B의 내려받기 도구가 기댐):
  - 릴리스 `photo-v0.20.2-h1`, `illust-v0.21.0-h1`
  - 각 릴리스의 자산 `<zip>`, `<zip>.sha256`
  - 자산 주소 `https://github.com/tenaico/hanpan-graphics/releases/download/<tag>/<zip>`
- 워크플로:
  - `workflow_dispatch`, 입력 `app`(photo, illust, both), `release`(boolean, 기본 false)
  - ubuntu-latest, `dtolnay/rust-toolchain@stable`(targets wasm32-unknown-unknown), `Swatinem/rust-cache`(workspaces `work/<app>`), `cargo install trunk --version 0.21.14 --locked`(캐시), Node 22
  - 실행: `npm ci`, `npm test`, `node scripts/build.mjs <app>`, `node scripts/verify.mjs <app>`
  - `xvfb-run node scripts/smoke.mjs ... --renderer cpu --checks boot,api,embedded`. 리눅스 CI에서 렌더러가 안 뜨면 이 줄만 `continue-on-error: true`로 두고, 이 PC의 smoke 통과를 릴리스 조건으로 README에 적는다.
  - 결과 zip·sha256을 artifact로 올린다.
  - `release=true`면 `gh release create <tag> <zip> <zip>.sha256 --notes-file CHANGES-<app>.md`(권한 `contents: write`)

- [ ] **Step 1:** 워크플로를 만들고 push한 뒤 `release=false`로 `both`를 돌린다.
  - Run: `gh workflow run build.yml --repo tenaico/hanpan-graphics -f app=both -f release=false`
  - `gh run watch` → Expected: 성공(smoke 줄은 위 규칙대로)
- [ ] **Step 2:** CI artifact의 zip을 이 PC 결과와 비교한다.
  - 두 앱 모두 `verify` PASS
  - 이 PC smoke 전체(`boot,api,api-immediate,capture,fonts,fonts-early-text,embedded,embedded-with-lang,save-clean`) PASS
- [ ] **Step 3:** `release=true`로 돌린다. 릴리스 두 개와 자산 네 개가 생겼는지 확인한다.
  - `gh release download <tag> --repo tenaico/hanpan-graphics`로 받은 zip의 SHA-256이 `.sha256` 내용과 같은지 확인한다.
- [ ] **Step 4: 커밋** `ci: build, verify and release the Hanpan web builds`

## 다음 계획

계획 B(한판 쪽: 탭 두 종류, AI 도우미, 빠른 작업 단추, 설치형 빼기, 고지)는 Task 7의 릴리스 주소와 Task 3·6의 API·embedded 동작을 입력으로 쓴다.
