# AI 포토·AI 일러스트를 한판의 생김새로 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 포토·AI 일러스트 탭이 AI 워드와 나란히 놓였을 때 같은 바탕·글자색·한글 글꼴을 쓰고, 한판 테마를 따르고, 앱 이름·로고가 화면 틀에 없고, 일러스트레이터 사용자를 위한 `.ai` 길이 분명한 상태로 0.19.3에 싣는다.

**Architecture:** 두 웹판(egui)에 `tenaico/hanpan-graphics` 패치로 "한판 밝게·어둡게" 테마, `hanpan.theme`/`hanpan.status` 제어 명령, PC 맑은 고딕 UI 글꼴, 화면 틀 이름 정리를 넣어 `-h7`로 낸다. 한판 쪽(`apps/graphics`)은 어둡게 고정을 없애고 한판 테마를 앱에 넘기며, 저장 창 이름·`.ai` 보내기·첫 저장 안내·AI 지시문을 바꾸고 핀을 `-h7`로 올린다.

**Tech Stack:** Rust + egui 0.37 (wasm32, trunk), Node `node:test` (hanpan-graphics 도구), TypeScript/React + Vitest + Playwright (한판).

**Spec:** `docs/superpowers/specs/2026-11-10-hanpan-graphics-look-design.md` (승인 2026-11-10)

## Global Constraints

- 색 기준은 AI 워드가 실제로 그리는 값(스펙 5.1 표). 강조색: 포토 `#A3449E`, 일러스트 `#3E9150`.
- 한판 안(`?embedded=hanpan`)에서만 바뀐다. 독립 실행(embedded 아님)의 동작·테마·이름은 그대로.
- 한글(한중일) UI 글꼴만 PC 글꼴로: Windows `Malgun Gothic`, Mac `Apple SD Gothic Neo`. 라틴 글자는 Inter 그대로. 못 불러오면 NanumGothic.
- 문서 내용(캔버스 속 그림, 레이어, 문서 글꼴 대체)은 바꾸지 않는다.
- 도움말 › 정보(About), `NOTICE.md`, 한판 제3자 고지의 원본 이름·라이선스는 남긴다.
- 파일 확장자 `.vectorcraft`는 바꾸지 않는다. 새 그림 기본 저장도 `.vectorcraft`.
- 웹판 패치: `patches/<app>/NNNN-hanpan-<slug>.patch`, 앞 패치를 입힌 트리에 대해 `git diff --full-index`로 자른 LF 텍스트. 포토 다음 번호 `0010`, 일러스트 `0008`.
- 한판 커밋: 영어 메시지, `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 사용자에게 보이는 문구는 21개 언어(한판 앱 문구) 또는 앱이 지원하는 언어(웹판 tsv: 최소 ko·vi·en).
- 작업 폴더: 한판은 `C:\Users\ten\Desktop\hanpan\.claude\worktrees\graphics-look`(가지 `docs/graphics-look-spec`에서 시작). `worktrees\home-board-impl`은 다른 세션이 쓰므로 건드리지 않는다. 웹판은 `C:\Users\ten\Desktop\graphics-src\{hanpan-graphics,photocraft,vectorcraft}`(원본은 고정 커밋에 기존 패치를 입힌 상태).

## Review Focus

1. 한판 테마를 바꿨을 때 문서가 열린 탭의 iframe이 다시 로드되어 문서를 잃는 것 — 테마는 iframe 주소에 시작 값으로만 들어가고, 바뀔 때는 `hanpan.theme` 명령으로만 간다(Task 9 테스트).
2. 사용자가 앱 메뉴(창 › 테마, 밝기 조절, 환경설정)로 테마를 바꿔 한판 테마가 풀리는 것 — embedded에서는 감추거나 무시(Task 1·2 테스트).
3. PC 글꼴 권한이 없거나 맑은 고딕이 없는 PC에서 한글이 비는 것 — NanumGothic으로 그린다(Task 3·4 테스트).
4. 첫 화면이 원래(어두운) 색으로 깜빡이는 것 — 주소의 `theme` 값으로 첫 프레임부터 맞춘다(Task 1·2·5·6).
5. 독립 실행 웹판(embedded 아님)이 바뀌는 것 — 한판 테마·명령·이름 정리는 embedded에서만(각 Rust 태스크의 "not embedded" 테스트).

---

## File Structure

웹판(패치로 들어가는 원본 파일)
- 포토 `crates/ui-egui/src/theme.rs`(종류 2개 추가), 새 `crates/ui-egui/src/theme/hanpan.rs`(토큰 2벌), `crates/ui-egui/src/embedded.rs`(한판 모드 상태·명령·상태 보고), `crates/ui-egui/src/prefs/prefs_ui/appearance.rs`(embedded면 한판 종류 강제), `crates/ui-egui/src/control.rs`·`control/dispatch.rs`(명령 등록), `crates/ui-egui/src/menus/invoke.rs`·`panels/title_bar.rs`(테마 메뉴·로고·제목), `crates/ui-egui/src/canvas/start_screen.rs`, `crates/ui-egui/src/theme.rs` `install_fonts_with`, `apps/photocraft-web/src/web.rs`·`local_fonts.rs`·`index.html`, `crates/ui-egui/src/i18n/{ko,vi}.tsv`.
- 일러스트 `crates/ui-egui/src/theme.rs`(`Scheme::Hanpan`, `Tokens::hanpan`), `crates/ui-egui/src/prefs_dialog.rs`(`apply_runtime` 강제), `crates/ui-egui/src/embedded.rs`, `crates/ui-egui/src/control.rs`, `crates/ui-egui/src/chrome.rs`(로고), `crates/ui-egui/src/menus/tree.rs`(도움말), `crates/ui-egui/src/canvas/home.rs`, `crates/ui-egui/src/ui_fonts.rs`·`theme.rs interface_fonts()`, `apps/vectorcraft-web/src/web.rs`·`index.html`, `crates/ui-egui/src/i18n/{ko,vi}.tsv`.
- `hanpan-graphics`: `patches/photo/0010-hanpan-theme.patch`, `0011-hanpan-ui-font.patch`, `0012-hanpan-brand-chrome.patch`; `patches/illust/0008-hanpan-theme.patch`, `0009-hanpan-ui-font.patch`, `0010-hanpan-brand-chrome.patch`; `scripts/lib/brand.mjs`, `scripts/verify.mjs`, `scripts/smoke-page.js`, `test/brand.test.mjs`, `test/pins.test.mjs`, `pins.json`, `README.md`, `CHANGES-photo.md`, `CHANGES-illust.md`.

한판
- `apps/graphics/src/renderer/main.tsx`(어둡게 고정 제거, 테마 따름), `src/renderer/theme.ts`(새: 한판 테마 → light/dark), `src/renderer/frame/page-api.ts`(`appFrameUrl`에 `theme`), `src/renderer/App.tsx`(시작 테마 고정, 바뀌면 `hanpan.theme`, 첫 저장 안내), `src/renderer/styles.css`(앱별 `--accent`), `src/renderer/ai/blocked-commands.ts`, `src/renderer/ai/prompts/base-{photo,illust}.md`, `src/renderer/quick/{quick-actions.ts,QuickBar.tsx}`, `src/renderer/i18n/app/*.ts`(21개), `src/main/graphics-main.ts`·`src/main/i18n-main.ts`(형식 이름, `.ai` 내보내기), `src/shared/ipc.ts`(`ExportFormat`에 `ai`), `apps/shell/src/main/index.ts`(`filterIllust` 21개), `tools/graphics-web-pins.json`, `docs/tracking/decisions/<다음 번호>-hanpan-graphics-look.md`·`index.md`, `e2e/graphics.spec.ts`.

---

## Part A — 웹판 (`tenaico/hanpan-graphics`)

패치를 자르는 방법(모든 Rust 태스크 공통): 작업 전에 원본 트리에서 `git add -A`로 기준을 잡고, 고친 뒤 새 파일은 `git add -N`, `git diff --full-index > ..\hanpan-graphics\patches\<app>\NNNN-hanpan-<slug>.patch`. 다음 태스크 전에 다시 `git add -A`. 단위 테스트는 원본 폴더에서 `cargo test -p photocraft-ui-egui <filter>` / `cargo test -p vectorcraft-ui-egui <filter>`(네이티브).

### Task 1: 포토 — 한판 테마와 `hanpan.theme`·`hanpan.status`

**Files:** 포토 `theme.rs`, 새 `theme/hanpan.rs`, `embedded.rs`, `prefs/prefs_ui/appearance.rs`, `control.rs`, `control/dispatch.rs`, `menus/invoke.rs`, `panels/title_bar.rs`, `apps/photocraft-web/src/web.rs`; 테스트는 각 모듈의 `tests`. 결과: `patches/photo/0010-hanpan-theme.patch`.

**Interfaces:**
- Produces: `ThemeKind::HanpanLight`, `ThemeKind::HanpanDark`(`ALL`·`from_name`·엔진 테마 목록에는 넣지 않음, `is_pro()`·`is_dark()`는 각각 true·HanpanDark만 true). `embedded::HanpanMode { Light, Dark }`, `embedded::hanpan_kind(&app) -> ThemeKind`, `embedded::set_theme(app, ctx, params: &Value) -> Result<Value, String>`(reply `{ "mode": "light"|"dark" }`), `embedded::status(&app) -> Value`(`{ "mode", "uiFont" }`, `uiFont`는 Task 3 전까지 `"NanumGothic"`). 제어 메서드 `hanpan.theme { mode }`, `hanpan.status {}`. 주소 `theme=light|dark`(없으면 light).

- [ ] **Step 1: 실패하는 테스트**

```rust
#[test] fn hanpan_light_tokens_match_word() {
    let t = Tokens::for_kind(ThemeKind::HanpanLight);
    assert_eq!(t.chrome, hex(0xffffff)); assert_eq!(t.canvas, hex(0xe6e6e6));
    assert_eq!(t.card, hex(0xffffff)); assert_eq!(t.card_border, hex(0xe3e6ea));
    assert_eq!(t.text, hex(0x242424)); assert_eq!(t.text_dim, hex(0x606366));
    assert_eq!(t.accent, hex(0xa3449e)); assert_eq!(t.separator, hex(0xefefef));
}
#[test] fn hanpan_dark_tokens_match_word() {
    let t = Tokens::for_kind(ThemeKind::HanpanDark);
    assert_eq!(t.chrome, hex(0x252525)); assert_eq!(t.canvas, hex(0x2b2b2b));
    assert_eq!(t.card, hex(0x1e1e1e)); assert_eq!(t.text, hex(0xe4e4e4));
    assert!(ThemeKind::HanpanDark.is_dark() && !ThemeKind::HanpanLight.is_dark());
}
#[test] fn embedded_keeps_the_hanpan_theme_whatever_the_prefs() { /* embedded app, prefs ask Pro dark → after sync_appearance the theme is HanpanLight */ }
#[test] fn not_embedded_follows_the_prefs_as_before() { /* not embedded → selected_theme result, never a Hanpan kind */ }
#[test] fn hanpan_theme_switches_in_the_same_frame() { /* request {mode:"dark"} → reply {mode:"dark"}, app.ui.theme == HanpanDark */ }
#[test] fn hanpan_theme_is_refused_when_not_embedded() { /* reply is an error */ }
#[test] fn hanpan_theme_rejects_an_unknown_mode() { /* {mode:"blue"} → error, theme unchanged */ }
```

나머지 토큰 값(스펙 5.1 표에 없는 것): `dock` `#f6f7f9`/`#252525`, `field` `#f6f7f9`/`#2a2a2a`, `field_border` `#d9d9d9`/`#555555`, `hover` `#f5f5f5`/`#333333`, `pressed` `#e8eaee`/`#444444`, `text_faint` `#909499`/`#a0a0a0`, `icon` = `text_dim`, `accent_soft`·`row_selected` = 강조색 알파 0x26, `accent_border`·`accent_text`·`primary_bg` = 강조색, `primary_text` `#ffffff`, `tab_strip` = `dock`, `canvas_dot` = `canvas`. 나머지는 `..Tokens::for_kind(ThemeKind::Pro)`.

- [ ] **Step 2:** `cargo test -p photocraft-ui-egui hanpan` → 컴파일 실패(없는 종류). 
- [ ] **Step 3:** 구현. `sync_appearance`·`cycle_appearance`는 `app.services.embedded`면 `embedded::hanpan_kind(app)`. `web.rs`는 embedded면 주소 `theme`로 `HanpanMode`를 정하고 시작 테마를 그 종류로(:116 대신). embedded에서 `window.theme.*`·Darken/Lighten Interface는 `embedded::blocks`에, 제목줄 모양 버튼·환경설정 › 모양의 테마 줄은 감춤, `ui.set {theme}`는 오류.
- [ ] **Step 4:** `cargo test -p photocraft-ui-egui` 전체 통과(`control/tests.rs`의 "모든 메서드 처리" 포함).
- [ ] **Step 5:** 패치 자르기 → `patches/photo/0010-hanpan-theme.patch`. hanpan-graphics에서 `npm test`(패치 순서·이름) 통과 후 커밋 `feat(photo): Hanpan light and dark themes when embedded, hanpan.theme and hanpan.status`.

### Task 2: 일러스트 — 한판 테마와 `hanpan.theme`·`hanpan.status`

**Files:** 일러스트 `theme.rs`, `prefs_dialog.rs`, `embedded.rs`, `control.rs`, `apps/vectorcraft-web/src/web.rs`. 결과: `patches/illust/0008-hanpan-theme.patch`.

**Interfaces:**
- Produces: `Scheme::Hanpan`(`Scheme::ALL`에 넣지 않음), `Tokens::hanpan(dark: bool) -> Tokens`, `embedded::HanpanMode`, `embedded::set_theme(app, ctx, params) -> Result<Value, String>`, `embedded::status(&app) -> Value` — Task 1과 같은 이름·응답 모양.

- [ ] **Step 1: 실패하는 테스트** — `hanpan_tokens_match_word`(light: `app_bar #ffffff`, `panel #ffffff`, `panel_darker #f6f7f9`, `pasteboard #e6e6e6`, `border #e3e6ea`, `divider #efefef`, `text #242424`, `text_dim #606366`, `accent`·`accent_strong #3e9150`; dark: `app_bar #252525`, `panel #1e1e1e`, `pasteboard #2b2b2b`, `text #e4e4e4`), `embedded_forces_the_hanpan_scheme`(prefs가 Classic·Light여도 `apply_runtime` 뒤 토큰이 한판 값), `not_embedded_keeps_the_prefs_scheme`, `hanpan_theme_switches_at_once`, `hanpan_theme_refused_when_not_embedded`, `hanpan_theme_rejects_unknown_mode`.
  나머지 값: `input` `#f6f7f9`/`#2a2a2a`, `input_border` `#d9d9d9`/`#555555`, `button` `#ffffff`/`#2a2a2a`, `button_border` `#e3e6ea`/`#3a3a3a`, `hover` `#f5f5f5`/`#333333`, `tool_active` `#e8eaee`/`#444444`, `text_disabled` `#909499`/`#6b6b6b`, `text_strong` `#232425`/`#e4e4e4`, `icon` = `text_dim`, `tab_strip` `#f6f7f9`/`#252525`, `row_selected`·`flyout_active` = 강조색 알파 0x26. 캔버스 전용 토큰은 `..Tokens::for_brightness(Light|Dark)`.
- [ ] **Step 2:** `cargo test -p vectorcraft-ui-egui hanpan` → 실패.
- [ ] **Step 3:** 구현. `apply_runtime`(:121)에서 embedded면 `Scheme::Hanpan`, 밝기는 `HanpanMode`. `hanpan.theme`는 `control::handle`의 `"fonts.local"` 옆 arm에서 `embedded::set_theme` 후 `prefs_dialog::reapply`·`request_repaint`. `web.rs`는 주소 `theme`로 시작 모드. embedded에서 환경설정의 밝기·강조색·색 구성 줄은 감추고, `window.brightness`·`ui.set {brightness}`는 무시.
- [ ] **Step 4:** `cargo test -p vectorcraft-ui-egui` 전체 통과.
- [ ] **Step 5:** 패치 → `patches/illust/0008-hanpan-theme.patch`, `npm test`, 커밋 `feat(illust): Hanpan light and dark scheme when embedded, hanpan.theme and hanpan.status`.

### Task 3: 포토 — 한글 UI 글꼴을 PC 맑은 고딕으로

**Files:** 포토 `apps/photocraft-web/src/web.rs`·`local_fonts.rs`, `crates/ui-egui/src/local_fonts.rs`, `theme.rs install_fonts_with`, `embedded.rs status`. 결과: `patches/photo/0011-hanpan-ui-font.patch`.

**Interfaces:**
- Consumes: Task 1 `embedded::status`.
- Produces: `status().uiFont` = 실제로 한글을 그리는 UI 글꼴 이름(`"Malgun Gothic"` | `"Apple SD Gothic Neo"` | `"NanumGothic"`).

- [ ] **Step 1: 실패하는 테스트** — `ui_stack_puts_the_pc_hangul_face_before_nanum`(PC 얼굴이 있으면 Proportional 스택에서 Inter 다음, `served-NanumGothic` 앞), `ui_stack_without_the_pc_face_is_unchanged`, `status_reports_the_face_that_draws_hangul`.
- [ ] **Step 2:** 실패 확인.
- [ ] **Step 3:** 구현. embedded면 `enable()` 직후 `local_fonts::want(<OS별 이름>)`(Windows `Malgun Gothic`, Mac `Apple SD Gothic Neo`, 그 밖은 요청하지 않음). 불러오면 Regular·Bold 바이트를 보관하고 `install_fonts`로 스택을 다시 짓는다(`add_font`의 Highest/Lowest만으로는 자리를 못 맞춤). 첫 프레임 전에 기다리지 않는다: 첫 프레임은 NanumGothic, 도착하면 다시 그림(검사에서 깜빡임 허용 여부는 Task 7 smoke로 판단). 문서 글꼴 대체는 건드리지 않는다.
- [ ] **Step 4:** `cargo test -p photocraft-ui-egui` 통과.
- [ ] **Step 5:** 패치 `0011-hanpan-ui-font.patch`, `npm test`, 커밋 `feat(photo): Hangul UI text in the PC's own face when embedded`.

### Task 4: 일러스트 — 한글 UI 글꼴을 PC 맑은 고딕으로

**Files:** 일러스트 `ui_fonts.rs`, `theme.rs interface_fonts()`, `local_fonts.rs`, `apps/vectorcraft-web/src/web.rs`·`local_fonts.rs`, `embedded.rs status`. 결과: `patches/illust/0009-hanpan-ui-font.patch`. 테스트와 단계는 Task 3과 같다. 자리: `interface_fonts()`가 만든 Proportional·`ui`·`ui-semibold`의 기본 스택 뒤, NanumGothic 앞. 바꾼 뒤 `set_fonts`와 `ui_fonts` 초기화(graphics.rs:120-124 방식). 커밋 `feat(illust): Hangul UI text in the PC's own face when embedded`.

### Task 5: 포토 — 화면 틀의 이름·로고 빼기, 시작 화면 문구

**Files:** 포토 `panels/title_bar.rs`, `panels/brand.rs` 호출부, `canvas/start_screen.rs`, `dialogs/new_doc_ui.rs`, `embedded.rs shown_status`(상태줄 문구), `apps/photocraft-web/index.html`, `web.rs`(시작 실패 문구), `i18n/{ko,vi}.tsv`. 결과: `patches/photo/0012-hanpan-brand-chrome.patch`.

- [ ] **Step 1: 실패하는 테스트** — embedded일 때: 제목줄이 로고를 그리지 않고 문서 이름만(없으면 빈칸), 시작 화면에 "PhotoCraft" 제목 없음, 새 문서 카드 "Default PhotoCraft Size" → "기본 크기"(영어 키 `Default Size`), 상태줄 문구의 PhotoCraft는 "AI 포토"로. 독립 실행은 그대로(`not_embedded_keeps_the_brand`).
- [ ] **Step 2–4:** 실패 확인 → 구현 → `cargo test -p photocraft-ui-egui` 통과. 시작 실패 문구는 "failed to start" 단어를 남긴다(smoke `api-no-start`가 찾음). `index.html`은 `<title>`·로딩 문구에서 이름을 빼고, 주소 `theme`로 페이지 바탕을 `#e6e6e6`/`#2b2b2b`로(인라인 스크립트, 첫 그리기 전 깜빡임 방지).
- [ ] **Step 5:** 패치 `0012-hanpan-brand-chrome.patch`, 커밋 `feat(photo): no product name or mark in the chrome when embedded`.

### Task 6: 일러스트 — 화면 틀의 이름·로고 빼기, 홈 화면 문구

**Files:** 일러스트 `chrome.rs`(앱 막대 표시), `menus/tree.rs`("VectorCraft Help…" 감춤), `canvas/home.rs`(환영 문구·소개줄), `dialogs/about.rs`(GitHub 링크는 embedded에서 막음), `embedded.rs shown_status`, `apps/vectorcraft-web/index.html`, `web.rs`(로딩 문구), `i18n/{ko,vi}.tsv`. 결과: `patches/illust/0010-hanpan-brand-chrome.patch`.

- [ ] **Step 1: 실패하는 테스트** — embedded일 때: 앱 막대 표시 없음, 도움말 메뉴에 "VectorCraft Help…" 없음, 홈 제목이 "새 그림을 만들거나 파일을 여세요."(영어 키 `Create a new drawing or open a file.`)이고 소개줄 없음, 정보 창의 GitHub 링크가 열리지 않음, 상태줄의 VectorCraft는 "AI 일러스트"로. 독립 실행은 그대로.
- [ ] **Step 2–4:** 실패 → 구현 → `cargo test -p vectorcraft-ui-egui` 통과. `index.html`은 Task 5와 같은 방식.
- [ ] **Step 5:** 패치 `0010-hanpan-brand-chrome.patch`, 커밋 `feat(illust): no product name or mark in the chrome when embedded`.

### Task 7: 상표 검사·smoke 검사·판 올리기 (hanpan-graphics 도구)

**Files:** `scripts/lib/brand.mjs`, `scripts/verify.mjs`, `test/brand.test.mjs`, `scripts/smoke-page.js`, `pins.json`, `test/pins.test.mjs`, `README.md`, `CHANGES-photo.md`, `CHANGES-illust.md`.

**Interfaces:**
- Consumes: 제어 메서드 `hanpan.theme {mode}`, `hanpan.status {}`(Task 1·2), `status.uiFont`(Task 3·4).
- Produces: `scanAppName(app, file, text, allowed) -> Finding[]`; smoke 검사 `theme`, `font`.

- [ ] **Step 1: 실패하는 테스트** (`test/brand.test.mjs`)

```js
test('the chrome names neither app', () => {
  assert.equal(scanAppName('photo', 'crates/ui-egui/src/i18n/ko.tsv', 'ui\tPhotoCraft\t포토크래프트', ALLOWED.photo).length, 1)
  assert.equal(scanAppName('illust', 'crates/ui-egui/src/canvas/home.rs', 'tl!("Welcome to VectorCraft")', ALLOWED.illust).length, 1)
})
test('About and notices may name the app', () => {
  assert.equal(scanAppName('photo', 'crates/engine/src/shell_commands.rs', '"About PhotoCraft"', ALLOWED.photo).length, 0)
  assert.equal(scanAppName('illust', 'crates/ui-egui/src/dialogs/about.rs', 'Icons: Lucide (ISC) + VectorCraft.', ALLOWED.illust).length, 0)
})
test('code identifiers are not names', () => {
  assert.equal(scanAppName('photo', 'x.rs', 'let a = photocraft_ui_egui::PhotocraftApp::new();', ALLOWED.photo).length, 0)
})
```

- [ ] **Step 2:** `npm test` → 실패.
- [ ] **Step 3:** 구현. 대소문자 구분(`/PhotoCraft/g`, `/VectorCraft/g`, `포토크래프트`, `벡터크래프트`), tsv는 영어 열로 허용 판단, 허용: CREDIT, "About PhotoCraft/VectorCraft", 정보 창 본문 파일(포토 `dialogs.rs`의 `about_tab_body`, 일러스트 `dialogs/about.rs`), 고지 파일. `verify.mjs` :54 뒤에 네 번째 보고로 넣는다. smoke: `theme` = `request('hanpan.theme',{mode:'dark'})` → `request('hanpan.status')`가 `mode:'dark'` → light로 되돌리고 확인(서로 다른 결과를 내야 통과), `font` = Windows에서 `status.uiFont === 'Malgun Gothic'`(최대 10초 기다림), 그 밖의 OS는 `NanumGothic` 허용. `pins.json` 두 앱 `hanpanRev` 7, `test/pins.test.mjs`의 h6 이름 → h7. README 릴리스 확인 명령에 `theme,font`(`--query "embedded=hanpan"`) 추가. CHANGES 두 파일에 테마·명령·글꼴·이름 정리 항목 추가, "Brand:" 항목 고침.
- [ ] **Step 4:** `npm test` 통과, 로컬 빌드 `node scripts/build.mjs photo` / `illust`가 패치 적용·빌드·`verify.mjs`까지 통과.
- [ ] **Step 5:** 커밋 `feat: brand scan for the app names, theme and font smoke checks, revision h7`, PR → 합침.

### Task 8: `-h7` 릴리스 (손으로 하는 단계)

- [ ] **Step 1:** Actions **Build web builds**를 `release` 체크로 실행 → 초안 `photo-v0.20.2-h7`, `illust-v0.21.0-h7`.
- [ ] **Step 2:** 각 zip을 받아 `.sha256` 확인, 압축 풀고 README의 Windows GPU smoke 전 항목 + `--query "embedded=hanpan" --checks theme,font` 실행. 모두 `ok`.
- [ ] **Step 3:** 화면 확인: `--query "embedded=hanpan&theme=light"`·`theme=dark` 캡처(`out/<app>/smoke-*.png`)에서 로고·이름이 없고 색이 한판 값인지 본다.
- [ ] **Step 4:** 초안 게시(`gh release edit <tag> --draft=false`). 실패하면 초안 삭제 → 고치고 `hanpanRev` 8.

## Part B — 한판 (`tenaico/hanpan`)

### Task 9: 탭이 한판 테마를 따른다

**Files:** `apps/graphics/src/renderer/theme.ts`(새), `main.tsx`, `frame/page-api.ts`, `App.tsx`, `styles.css`, `ai/blocked-commands.ts`; 테스트 `apps/graphics/tests/theme.test.ts`(새), `tests/app.test.tsx`, `tests/page-api.test.ts`, `tests/ai-tools.test.ts`.

**Interfaces:**
- Produces: `resolveTheme(setting: UiTheme, prefersDark: boolean): 'light' | 'dark'`; `appFrameUrl(kind: GraphicsKind, lang: Lang, theme: 'light' | 'dark'): string`(…`&theme=<t>`); `App` prop `theme: 'light' | 'dark'`; `--accent` 포토 `#A3449E`, 일러스트 `#3E9150`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('resolves the system setting by the OS', () => {
  expect(resolveTheme('system', true)).toBe('dark'); expect(resolveTheme('light', true)).toBe('light')
})
it('starts the frame in the theme of the moment', () => {
  expect(appFrameUrl('illust', 'ko', 'dark')).toBe('./web/illust/index.html?embedded=hanpan&lang=ko&theme=dark')
})
it('sends a theme change to the app without reloading the frame', async () => {
  // mount light, page ready, document open; rerender with theme 'dark'
  expect(page.requested).toContainEqual(['hanpan.theme', { mode: 'dark' }])
  expect(frame()!.getAttribute('src')).toContain('theme=light') // src unchanged: no reload
})
it('the AI may not change the theme', () => {
  expect(isBlocked('hanpan.theme')).toBe(true)
})
```

- [ ] **Step 2:** `npx vitest run tests/theme.test.ts tests/app.test.tsx tests/page-api.test.ts tests/ai-tools.test.ts`(`apps/graphics`) → 실패.
- [ ] **Step 3:** 구현. `main.tsx`의 `data-theme='dark'` 고정을 없애고 `getTheme()`·`onThemeChanged`·`matchMedia('(prefers-color-scheme: dark)')`로 `data-theme`를 맞춘다. `App`은 처음 받은 테마를 `frameTheme`로 고정해 주소에 넣고(언어의 `frameLang`과 같은 방식), 이후 변화는 `connect`된 api의 `request('hanpan.theme', {mode})`로 보낸다. 앱이 아직 준비 전이면 준비 직후 한 번 보낸다. `'hanpan.'`을 `BLOCKED_PREFIXES`에, AI가 `request`로 부르는 길에도 같은 검사.
- [ ] **Step 4:** 위 테스트와 `apps/graphics` 전체 단위 테스트 통과.
- [ ] **Step 5:** 커밋 `feat(graphics): the AI Photo and AI Illustration tabs follow Hanpan's theme`.

### Task 10: 저장·열기 창의 형식 이름

**Files:** `apps/graphics/src/main/i18n-main.ts`(21개 언어 `fmtVectorcraft`, `fmtAi`), `src/main/graphics-main.ts`(`FORMAT_LABEL` → `formatLabel(format)`), `apps/shell/src/main/index.ts`(`filterIllust` 21개); 테스트 `apps/graphics/tests/graphics-main.test.ts`, 셸 문구 테스트.

- [ ] **Step 1: 실패하는 테스트** — ko에서 `filterFor('vectorcraft').name === 'AI 일러스트 문서 — 한판에서 계속 고칠 때'`, `filterFor('ai').name === '일러스트레이터 파일 — 일러스트레이터와 주고받을 때, 일부 효과는 그림으로 굳음'`, `filterFor('svg').name === 'SVG'`; 셸 ko `filterIllust === '일러스트 (SVG, .ai, AI 일러스트 문서)'`; 21개 언어 모두 영어 복사가 아님.
- [ ] **Step 2–4:** 실패 → 구현 → 통과.
- [ ] **Step 5:** 커밋 `feat(graphics): save dialogs name the formats by what they are for`.

### Task 11: "일러스트레이터용 .ai로 보내기"와 첫 저장 안내

**Files:** `src/shared/ipc.ts`(`ExportFormat = 'png' | 'jpg' | 'svg' | 'ai'`), `src/main/graphics-main.ts`(내보내기에 `ai`), `src/renderer/quick/quick-actions.ts`(`QUICK_ACTIONS.illust`에 `'exportAi'`), `QuickBar.tsx`, `App.tsx`(첫 저장 안내), `i18n/app/*.ts`(21개: `quickExportAi`, `illustAiHint`); 테스트 `tests/quick-actions.test.ts`, `tests/app.test.tsx`, `tests/graphics-main.test.ts`.

**Interfaces:**
- Consumes: 어댑터 `saveBytes(fileName: string, format: 'ai')`(이미 있음), `exportFile({ bytes, defaultName, format: 'ai' })`.
- Produces: 빠른 작업 `exportAi`; localStorage 열쇠 `hanpan.illust.aiHintSeen`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('exportAi saves an .ai copy through the export dialog', async () => {
  const r = await runQuickAction('exportAi', deps)
  expect(adapter.saveBytes).toHaveBeenCalledWith('포스터.ai', 'ai')
  expect(deps.exportFile).toHaveBeenCalledWith(expect.objectContaining({ defaultName: '포스터.ai', format: 'ai' }))
  expect(r).toEqual({ ok: true, messageKey: 'quickExported' })
})
it('says once where the .ai is after the first save of a new drawing', async () => {
  // illust, new document, save → notice text contains '.ai로 보내기'; second save → no notice; key set
})
it('does not say it for a file opened as .ai or .svg', async () => { /* opened file → no notice */ })
```

- [ ] **Step 2–4:** 실패 → 구현 → 통과. 버튼 문구 ko `일러스트레이터용 .ai로 보내기`, 안내 ko `AI 일러스트 문서로 저장했습니다. 일러스트레이터에서 열려면 '일러스트레이터용 .ai로 보내기'를 쓰세요.`
- [ ] **Step 5:** 커밋 `feat(graphics): an .ai copy for Illustrator users, and a one-time note after the first save`.

### Task 12: AI 도우미가 앱을 한판 이름으로 부른다

**Files:** `src/renderer/ai/prompts/base-photo.md`, `base-illust.md`; 테스트 `tests/ai-panel.test.tsx` 또는 지시문 테스트.

- [ ] **Step 1:** 실패하는 테스트 — 두 지시문에 `PhotoCraft`·`VectorCraft`가 없고 `AI 포토`/`AI 일러스트`가 있다.
- [ ] **Step 2–4:** 실패 → 지시문 고침 → 통과.
- [ ] **Step 5:** 커밋 `feat(graphics): the AI helper calls the apps AI 포토 and AI 일러스트`.

### Task 13: 핀 올리기, 결정 기록, e2e, PR

**Files:** `tools/graphics-web-pins.json`(`photo-v0.20.2-h7`, `illust-v0.21.0-h7`의 asset·size·sha256), `docs/tracking/decisions/<다음 번호>-hanpan-graphics-look.md`, `docs/tracking/decisions/index.md`, `e2e/graphics.spec.ts`.

- [ ] **Step 1: e2e 추가** — `test('the graphics tabs follow Hanpan's theme', …)`: GPU가 없으면 건너뜀(`graphicsGpuMissing`), 밝은 테마로 AI 일러스트 탭을 열고 탭 `data-theme`가 `light`, 앱 frame에서 `window.vectorcraft.request('hanpan.status')`의 `mode`가 `light`; `window.aiOffice.setTheme('dark')` 뒤 둘 다 `dark`, 문서를 연 상태에서도 frame이 다시 로드되지 않음(문서 수 유지).
- [ ] **Step 2:** `node tools/fetch-graphics-web.mjs`로 새 핀의 웹판을 받아 `npm run build -w @genoffice/graphics`, e2e `graphics*.spec.ts`를 GPU 있는 PC에서 실행 → 통과.
- [ ] **Step 3:** 결정 기록: 0093의 "앱 안의 이름은 그대로 둔다"를 바꾸는 이유(스펙 1·5.4), `.ai` 결정(5.4.1), 택하지 않은 것(기존 테마 고르기, 도구 아이콘 다시 그리기).
- [ ] **Step 4:** 포맷·린트·타입 검사·`apps/graphics` 단위 테스트·셸 문구 테스트 통과.
- [ ] **Step 5:** 커밋 `chore(graphics): web builds h7, decision on the Hanpan look`, PR(0.19.3에 싣는다고 적음) → CI 초록 → 합침.

## 끝났다고 볼 때 (스펙 6절)

- AI 워드와 두 그래픽 탭의 밝게·어둡게 캡처를 나란히 놓았을 때 바탕·글자색·한글 글꼴이 같고 강조색만 다르다.
- 화면 틀에 PhotoCraft·VectorCraft 이름·로고가 없다(정보 창 제외).
- 한판 테마 변경이 문서가 열린 탭까지 1초 안에 반영되고 문서를 잃지 않는다.
- hanpan-graphics 단위 테스트·smoke(새 `theme`·`font` 포함), 한판 graphics 단위 테스트·e2e가 통과한다.
