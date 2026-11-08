# 한판 베트남어 시연판 (A·B) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 11/13까지 시연용 Windows 설치판을 만든다. 베트남어 화면에서 한판이 더한 문구가 베트남어로 나오고, 한국 문서 기능은 숨겨지고, 화면에 옛 제품 이름이 없고, 홈에서 PhotoCraft·VectorCraft를 실행할 수 있어야 한다.

**Architecture:**

- 한판 문구는 JSON 사전이 원본이다. 고친 두 도구가 언어 파일에 넣는다.
- 한국 문서 기능은 `app-settings.json`의 `koreanDocFeatures` 값 하나로 정한다. 값이 없으면 화면 언어가 `ko`일 때만 켜진다.
  - 셸 메인 프로세스가 값을 읽고 쓰고, 바뀌면 모든 화면에 알린다.
  - 화면은 `@genoffice/ui`의 `useKoreanDocFeatures(lang)`로 읽는다.
- ArtCraft는 고정한 공식 zip을 빌드 전에 `vendor/artcraft`로 받아 설치판의 `resources/artcraft`에 싣는다. 홈 버튼을 누르면 메인 프로세스가 따로 실행한다.

**Tech Stack:** Electron 43, TypeScript 5.9, React, vitest 4, electron-vite 5, electron-builder(NSIS), Node 도구 스크립트(.mjs)

**Spec:** `docs/superpowers/specs/2026-11-04-hanpan-vn-securitykey-design.md` (5장 A, 6장 B, 8장 시험, 9장 일정). 보안키(C)는 `docs/superpowers/plans/2026-11-05-hanpan-securitykey.md`가 맡는다.

## Global Constraints

- **저장소 규칙:** `docs/standards.md`를 따른다. 이 계획과 부딪히면 규칙이 우선이다. 그때는 멈추고 사람에게 묻는다.
- **가지와 커밋**
  - 가지 `feat/vn-artcraft-securitykey`에서 일한다. push와 `main` 병합은 사람이 정한다.
  - 커밋 글은 영어 Conventional Commits로 쓰고, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.
  - 작성자 주소는 GitHub 비공개 주소다: `git -c user.email=37573099+grapevine26@users.noreply.github.com commit …`. 이 저장소 git 설정의 주소는 개인 메일이므로 그대로 쓰지 않는다.
- **글과 이름**
  - 코드와 주석은 영어로 쓴다. 한국어는 문구 자원과 사람이 읽는 문서에만 둔다(`npm run check:english-comments`).
  - 제품 이름은 문구에 `GenOffice`로 적는다. "IeumOffice"나 "이음오피스"를 새로 적지 않는다.
  - 내부 식별자는 바꾸지 않는다: `ieumoffice`(명령어·MCP·폴더 이름), `@genoffice/*`, `GENOFFICE_*`.
- **새 한판 문구**
  - JSON에 `ko`·`en`은 직접 쓰고, `zh`·`zh-TW`·`ja`·`th`·`ru`·`ar`·`he`·`hi`·`vi`는 번역으로 채운다. 영어를 복사해 채우지 않는다.
  - JSON에 없는 나머지 10개 언어가 영어로 들어가는 지금 방식은 이번에 바꾸지 않는다.
  - 베트남어 용어는 이미 있는 베트남어 사전을 따른다: `apps/shell/src/renderer/src/strings.ts`의 `vi` 블록, `apps/mindmap/src/renderer/i18n/app/vi.ts`.
- **원본과의 차이:** 손대지 않는 줄은 그대로 둔다.
- **화면 색:** 토큰만 쓴다(`npm run check:theme-colors`).
- **의존성:** 새 npm 의존성을 넣지 않는다. zip은 `C:\Windows\System32\tar.exe`를 전체 경로로 불러 푼다.
- **상표:** 화면에 다른 회사 제품과 같거나 낫다는 표현("포토샵 대체")을 쓰지 않는다. ArtCraft 앱은 자기 이름과 일반 그림으로 보인다.
- **테스트:** 각 작업 공간의 `tests/`에 둔다. 실패인지는 Task 1의 기준선과 비교해 판단한다.
- **합치기 전 검사 10개:** `typecheck`, `lint`, `format:check`, `test`, `licenses`, `check:theme-colors`, `check:english-comments`, `check:help-langs`, `check:skill-version`, `check:no-genspark`.
- **내려받기:** npm 패키지와 ArtCraft zip을 처음 받기 전에 사용자에게 파일 이름·출처·크기를 말하고 확인받는다.
- **설치판 굽기 (11/5 사용자 결정):** Rust를 설치하지 않는다.
  - 평소 확인은 이 PC의 개발 모드(`npm run dev`)로 한다. 엑셀 처리 프로그램은 설치된 한판의 것을 빌려 쓴다(Task 1).
  - 설치판은 원래 방식대로 GitHub Actions `Windows build`에서 굽는다(`docs/releasing.ko.md` 4번). 시연판은 작업 가지에서 `release_tag` 없이 돌려 결과물만 받고, 릴리스에 올리지 않는다(스펙 7-7).
  - 가지를 GitHub에 올리는 일(push)은 사용자 확인 뒤에만 한다. 올린 코드는 공개 저장소에 보이지만 사용자 업데이트로 가지 않는다.
- **결정 기록:** `docs/tracking/decisions/`에 0090부터 쓰고, `index.md`에 한 줄을 더한다. 보안키 계획은 0093부터 쓴다.

## Review Focus

1. **앱을 켠 채 언어를 바꿈:** 설정에서 ko를 vi로 바꾸고 스위치는 만진 적이 없을 때, 홈의 한국 카드와 편집기의 한판 도구가 다시 시작하지 않아도 사라진다. → Task 7 `hides the Korean cards after the language changes`
2. **직접 켠 스위치 유지:** 영어 화면에서 스위치를 직접 켠 사용자가 앱을 다시 켜도 켜진 채로 남는다. → Task 6 `a stored value wins over the language`
3. **베트남어 화면에서 .hwp 더블클릭:** 한글 편집기는 열리고, 한판 도구 단추만 없다. → Task 8 `renders nothing when Korean features are off`
4. **ArtCraft 프로그램이 없는 실행:** 개발 실행, Mac·Linux, 백신 격리 같은 경우다. 버튼이 보이지 않고, 눌러도 앱이 멈추지 않고 안내가 뜬다. → Task 10 `missing program → { ok: false, error: "missing" }`
5. **비한국 모드에서 마인드맵을 Word로 보냄:** 개조식·공문 선택 없이 장·절 번호와 기본 모양으로 보내고, 날짜·부서는 넣지 않는다. → Task 8 `sends a plain chapter report to Word when Korean features are off`

## 이번 계획에서 하지 않는 것

- JSON에 없는 10개 언어의 한판 문구 번역
- 숨겨지는 기능의 베트남어 번역(스펙 5-1): 한글 편집기 한판 도구, 한판 양식, 디자인 보드, 한글로 맞추기
- 지금 한국어·영어만 있는 것
  - 슬라이드 스타일 이름(`packages/hanpan-core/src/slide-styles.ts`)
  - 마크다운 변환의 기본 폴더 "한판 변환"과 기본 파일 이름
  - 내 PC AI 이름의 "(내 PC)"
- 문서에 저장되는 값: `docx-writer.ts`의 `creator: '한판'`, ODT `<meta:generator>`
- 보안키(C). 별도 계획이 맡는다.

---

### Task 1: 개발 환경과 기준선 (11/5)

시작 전 상태를 기록하고, Rust 없이 이 PC에서 개발 모드와 시험용 빌드가 되는지 확인한다. 바뀌는 파일은 없다.

**Interfaces:**

- Produces:
  - 기준선 실패 목록 `%TEMP%\hanpan-baseline\test-baseline.txt`. 이후 모든 작업이 "원본에서도 실패하는가"를 이 목록으로 판단한다.
  - 동작하는 개발 모드(`npm run dev`)
  - Rust 없는 전체 빌드 명령(Step 6). Task 11의 e2e가 쓴다.

- [ ] **Step 1: 내려받기 확인**
  - 사용자에게 `npm ci`를 확인받는다. npm 레지스트리에서 의존성 전체를 받고, Electron을 포함해 수백 MB다.
- [ ] **Step 2: 의존성 설치**
  - Run: `npm ci` (저장소 루트)
  - Expected: 종료 코드 0. Node 24에서 실패하면 멈추고 사용자에게 Node 22 설치를 묻는다.
- [ ] **Step 3: 기준선 기록**
  - Run: `npm run typecheck` → Expected: 오류 0
  - Run: `mkdir -p "$TEMP/hanpan-baseline" && npm test > "$TEMP/hanpan-baseline/test-baseline.txt" 2>&1`
  - Expected: 실패한 테스트 파일 목록을 파일 끝에서 확인해 둔다. 이 목록 밖의 실패는 이후 작업이 만든 실패다.
- [ ] **Step 4: 엑셀 처리 프로그램을 빌려 둔다** (Rust 없이)
  - 설치된 한판 0.15.0의 것을 개발 모드가 찾는 자리에 복사한다. 이 프로그램의 소스는 0.15.0 이후 바뀌지 않았다.
  - Run: `mkdir -p apps/sheets/native/xlsx-engine/target/release && cp "/c/Users/ten/AppData/Local/Programs/Hanpan/resources/native/xlsx-sidecar.exe" apps/sheets/native/xlsx-engine/target/release/`
  - 이 폴더는 `apps/sheets/.gitignore`에 들어 있어 커밋되지 않는다.
- [ ] **Step 5: 개발 모드 확인**
  - Run: `npm run dev` → 한판 창이 뜬다.
  - 엑셀 문서를 하나 새로 만들어 셀에 값을 넣고, 저장했다가 다시 연다. 정상이면 끈다.
  - 개발 모드가 어딘가에서 cargo를 찾으며 실패하면 멈추고 사용자에게 알린다. 그때는 Rust 설치를 다시 묻는다.
- [ ] **Step 6: Rust 없는 전체 빌드와 e2e 기준선**
  - `build:all`은 엑셀 처리 프로그램을 cargo로 빌드하므로 쓰지 않는다. 그 단계만 뺀 같은 순서로 빌드한다.

```bash
npm run build -w @genoffice/docs && (cd apps/sheets && npx electron-vite build) && npm run build -w @genoffice/slides && npm run build -w @genoffice/pdf && npm run build -w @genoffice/markdown && npm run build -w @genoffice/html && npm run build -w @genoffice/mindmap && npm run build -w @genoffice/hwp && npm run build -w @genoffice/epub && npm run build -w @genoffice/cli && npm run build -w @genoffice/shell
```

- Expected: 종료 코드 0. 한글 편집기 빌드는 git과 인터넷이 필요하다.
- Run: `npm run test:e2e -- e2e/home.spec.ts e2e/hanpan-home.spec.ts` → 결과를 기준선 파일에 덧붙인다.
- [ ] **Step 7: main의 CI 실패 원인 기록**
  - 저장소의 CI는 11/1부터 main에서 계속 실패한다.
  - Run: `gh run list --repo tenaico/hanpan --workflow ci.yml --branch main --limit 1`, 이어서 `gh run view <id> --repo tenaico/hanpan --log-failed`
  - 실패한 작업과 테스트 이름을 기준선 파일에 적는다. 이 목록의 실패는 이후 작업이 만든 실패로 치지 않는다.

### Task 2: ArtCraft 받기·확인·설치판에 싣기 (11/5 확인, 11/9 반영)

스펙 6장. 11/5 확인을 통과한 앱만 싣는다.

**Files:**

- Create: `tools/artcraft-pins.json`, `tools/fetch-artcraft.mjs`, `tools/fetch-artcraft.d.mts`
- Modify
  - `.gitignore`, `.prettierignore`, `eslint.config.mjs`(ignores)
  - `tools/gen-third-party-notices.mjs`: PDFium 확인 앞, 약 780행
  - `apps/shell/electron-builder.cjs`: `win.extraResources` 695-732행, `beforePack` 854-870행
  - `.github/workflows/windows-build.yml`: "Package" 단계 앞, 설치판 확인 목록
- Create: `docs/tracking/decisions/0090-hanpan-bundles-artcraft-apps.md`
- Modify: `docs/tracking/decisions/index.md`, `docs/security.md`("실행해 둔 프로그램은 앱보다 오래 살지 않는다" 절)
- Test: `packages/cli/tests/fetch-artcraft.test.ts`, `apps/shell/tests/artcraft-resources.test.ts`

**Interfaces:**

- Produces
  - `tools/artcraft-pins.json`: `{ "<app>": { repo, tag, asset, size, sha256, exe, licenseDir } }`. 앱은 `photocraft`, `vectorcraft`.
  - `tools/fetch-artcraft.mjs`의 export
    - `verifyDownload(path: string, pin: { size: number; sha256: string }): void`: 크기나 해시가 다르면 throw
    - `pinStamp(pin: { tag: string; sha256: string }): string`: `` `${tag} ${sha256}` ``
    - `flattenSingleRoot(dir: string): void`: 풀린 내용이 폴더 하나뿐이면 그 안의 것을 한 단계 올린다
  - 명령 `node tools/fetch-artcraft.mjs`
    - Windows가 아니면 `skipped (Windows only)`를 출력하고 0으로 끝낸다.
    - 앱마다 `vendor/artcraft/<app>/.pin`이 `pinStamp`와 같으면 건너뛴다.
    - 아니면 다음 순서로 처리한다.
      1. `https://github.com/<repo>/releases/download/<tag>/<asset>`을 `vendor/artcraft/_downloads/`로 받는다.
      2. `verifyDownload`로 확인한다.
      3. `vendor/artcraft/<app>/`를 비우고 `tar.exe -xf`로 푼다.
      4. `flattenSingleRoot`를 부르고 `.pin`을 쓴다.
  - 설치판 안의 위치: `resources/artcraft/<app>/<exe>`

pins 값(11/4 GitHub 릴리스에서 확인한 SHA256):

| app         | repo                  | tag     | asset                                       | size      | sha256                                                           |
| ----------- | --------------------- | ------- | ------------------------------------------- | --------- | ---------------------------------------------------------------- |
| photocraft  | storytold/photocraft  | v0.20.1 | photocraft-0.20.1-windows-x64-portable.zip  | 129241796 | e21ac903cf0477b05d8d1b6071f1f579b80f8ee9c8737a0b47b53948a17c5c73 |
| vectorcraft | storytold/vectorcraft | v0.21.0 | vectorcraft-0.21.0-windows-x64-portable.zip | 145817499 | 611227768f067e31788156aa3fd76220febe6fcf66be349f27a399c88de200d8 |

`exe`와 `licenseDir`는 Step 4에서 받은 내용을 보고 채운다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// packages/cli/tests/fetch-artcraft.test.ts (temp folders as in tests/growth-log.test.ts)
import { flattenSingleRoot, pinStamp, verifyDownload } from '../../../tools/fetch-artcraft.mjs'
it('rejects a download of the wrong size', () => {
  // file 'abc' (3 bytes), pin.size 4 → throws /size/
})
it('rejects a download with the wrong SHA-256', () => {
  // file 'abc', size 3, sha256 '00…' → throws /sha256/
})
it('accepts the pinned bytes', () => {
  // file 'abc', size 3, sha256 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' → no throw
})
it('stamps the tag and hash', () => expect(pinStamp({ tag: 'v1', sha256: 'aa' })).toBe('v1 aa'))
it('lifts a lone top folder', () => {
  // dir/app-0.1/x.exe → dir/x.exe, dir/app-0.1 gone
})
it('leaves a flat folder alone', () => {
  // dir/x.exe + dir/LICENSE → unchanged
})
```

```ts
// apps/shell/tests/artcraft-resources.test.ts — evaluate electron-builder.cjs as tests/template-fonts-resource.test.ts does
it('ships both ArtCraft folders in the Windows build', () => {
  expect(config.win.extraResources).toEqual(
    expect.arrayContaining([
      { from: '../../vendor/artcraft/photocraft', to: 'artcraft/photocraft' },
      { from: '../../vendor/artcraft/vectorcraft', to: 'artcraft/vectorcraft' },
    ]),
  )
})
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -w @genoffice/cli -- tests/fetch-artcraft.test.ts` → FAIL (모듈 없음)
  - Run: `npm test -w @genoffice/shell -- tests/artcraft-resources.test.ts` → FAIL
- [ ] **Step 3: 도구 작성**
  - 대상: `tools/fetch-artcraft.mjs`, `tools/fetch-artcraft.d.mts`, `tools/artcraft-pins.json`(`exe`와 `licenseDir`는 빈 문자열)
  - 다운로드는 Node `fetch`로 받아 파일에 스트림으로 쓴다. 해시는 `createHash('sha256')`로 계산한다.
  - 명령 부분은 `import.meta.url === pathToFileURL(process.argv[1]).href`일 때만 돈다.
  - 형식은 `tools/build-rhwp-core.mjs`를 따른다(머리 주석, `ROOT`, 실패하면 throw).
- [ ] **Step 4: 받아서 들여다보기** (사용자에게 두 zip을 확인받은 뒤: github.com/storytold 공식 릴리스, 129MB와 146MB)
  - Run: `node tools/fetch-artcraft.mjs`
  - Expected: 두 앱이 `vendor/artcraft/<app>/`에 풀린다.
  - 각 폴더에서 실행 파일 이름과 LICENSE·NOTICE·ATTRIBUTION의 위치를 확인한다. pins의 `exe`와 `licenseDir`(최상위면 `"."`)를 채운다.
  - 다시 실행하면 두 앱 모두 건너뛴다.
- [ ] **Step 5: 포함 조건 확인** (스펙 6장, 사용자와 함께)
  - `vendor/artcraft/<app>/<exe>`를 직접 실행해 세 가지를 확인한다.
    - Windows에서 켜지는가
    - 한글 파일 이름과 한글 글꼴이 제대로 나오는가
    - VectorCraft에서 PDF 호환 .ai가 열리는가
  - 결과를 사용자에게 알린다. 통과하지 못한 앱은 pins에서 빼고, 이후 단계에서도 뺀다.
- [ ] **Step 6: 무시 목록, 고지, 빌드 설정**
  - **무시 목록:**
    - `.gitignore`에 `/vendor/artcraft/`
    - `.prettierignore`에 `vendor/artcraft`
    - `eslint.config.mjs`의 ignores에 `vendor/artcraft/**`
  - **고지:** `gen-third-party-notices.mjs`에 `hr('8. Bundled desktop apps (ArtCraft)')` 절을 PDFium 확인 앞에 둔다.
    - `process.platform === 'win32'`일 때만 돈다. Mac·Linux 빌드의 엄격 모드에서 실패하지 않게 하기 위해서다.
    - pins의 앱마다 `sub(app)`, `licenseText(app, join(dir, licenseDir))`, `noticeText(...)`, 최상위 `ATTRIBUTION*` 파일 내용을 붙인다.
    - 폴더나 라이선스 파일이 없으면 `gap('vendor/artcraft/<app>: run node tools/fetch-artcraft.mjs')`를 부른다.
  - **빌드 설정** (`electron-builder.cjs`)
    - 위쪽에 `const ARTCRAFT_APPS = ['photocraft', 'vectorcraft']`를 둔다. 모듈 수준 코드는 `process.*`만 써야 해서 여기서는 pins를 읽지 않는다.
    - `win.extraResources`에 앱마다 `{ from: '../../vendor/artcraft/<app>', to: 'artcraft/<app>' }`를 넣는다.
    - `beforePack`의 win32 분기에서 pins를 읽는다. `vendor/artcraft/<app>/<exe>`가 없으면 `run node tools/fetch-artcraft.mjs first`로 throw한다.
  - **CI** (`windows-build.yml`)
    - "Package" 앞에 `- name: Fetch ArtCraft apps` / `run: node tools/fetch-artcraft.mjs`를 넣는다.
    - 설치판 확인 목록에 두 실행 파일을 더한다.
- [ ] **Step 7: 테스트 통과**
  - Run: 두 테스트 파일과 `npm test -w @genoffice/shell -- tests/third-party-notices.test.ts tests/template-fonts-resource.test.ts` → 기준선 밖의 실패 없음
  - Run: `npm run notices` → 생성된 파일에 `8. Bundled desktop apps (ArtCraft)`와 두 앱의 라이선스 글이 있다. 이 PC에는 cargo가 없으므로 Rust 부품 두 절은 경고와 함께 비어 있다. 설치판에서는 GitHub 빌드가 채운다.
- [ ] **Step 8: 결정 기록과 보안 문서**
  - `0090-hanpan-bundles-artcraft-apps.md`(맥락·결정·버린 대안·결과)에 쓸 내용:
    - 공식 릴리스의 Windows x64 portable zip을 버전과 SHA256으로 고정해, 고치지 않고 싣는다.
    - 사용자가 직접 연 앱이므로 한판과 따로 실행되고, 한판이 끝내지 않는다.
    - 버린 대안: MSI 함께 설치, 웹판 탭(나중에), 링크만 두기.
  - `docs/security.md`의 "실행해 둔 프로그램은 앱보다 오래 살지 않는다" 절 끝에 같은 예외를 한 줄 더한다.
- [ ] **Step 9: 커밋** (`vendor/`는 무시 목록에 있다)

```bash
git add tools/artcraft-pins.json tools/fetch-artcraft.mjs tools/fetch-artcraft.d.mts tools/gen-third-party-notices.mjs .gitignore .prettierignore eslint.config.mjs apps/shell/electron-builder.cjs .github/workflows/windows-build.yml packages/cli/tests/fetch-artcraft.test.ts apps/shell/tests/artcraft-resources.test.ts docs/tracking/decisions docs/security.md
git commit -m "feat(hanpan): bundle pinned PhotoCraft and VectorCraft builds in the Windows installer"
```

- [ ] **Step 10: GitHub에서 처음 굽기** (11/9 이전, 사용자 확인 뒤)
  - 설치판 경로를 일찍 확인하려고, 이 시점에 처음으로 가지를 올리고 GitHub에서 굽는다.
  - Run: `git push -u origin feat/vn-artcraft-securitykey`
  - Run: `gh workflow run windows-build.yml --repo tenaico/hanpan --ref feat/vn-artcraft-securitykey` (`release_tag`는 비운다)
  - Run: `gh run watch --repo tenaico/hanpan <run-id>` → 성공. 약 12분이 걸린다.
  - Expected: "Check the installer" 단계가 두 ArtCraft 실행 파일까지 확인하고 통과한다. 실패하면 `gh run view <run-id> --repo tenaico/hanpan --log-failed`로 원인을 보고 Step 6의 CI 설정을 고친다.

### Task 3: 한판 문구 도구 고치기 (11/6)

두 도구에는 고칠 점이 셋 있다.

- prettier가 두 줄로 나눈 값을 찾지 못한다.
- 큰따옴표로 바뀐 값을 찾지 못한다.
- 블록 도구는 이미 있는 값을 바꾸지 않는다.

그래서 지금 다시 돌리면 중복 키가 생기거나(형 검사 실패) 영어가 그대로 남는다. 베트남어를 넣기 전에 고친다.

**Files:**

- Modify: `tools/hanpan-add-strings.mjs`, `tools/hanpan-add-block-strings.mjs`
- Create: `tools/hanpan-add-strings.d.mts`, `tools/hanpan-add-block-strings.d.mts`
- Test: `packages/cli/tests/hanpan-string-tools.test.ts`

**Interfaces:**

- Produces
  - `type HanpanEntries = Record<string, Record<string, string>>` (키 → 언어 → 글)
  - `upsertFileStrings(source: string, lang: string, entries: HanpanEntries): { text: string; added: number; replaced: number }`: 언어 파일 하나(`export const vi = { … }`)를 처리한다.
  - `upsertBlockStrings(source: string, afterKey: string, entries: HanpanEntries): { text: string; added: number; replaced: number }`: `  vi: {` 같은 언어 블록이 모인 파일 하나를 처리한다.
  - 명령줄 사용법은 지금과 같다.

두 함수의 공통 규칙:

- 언어의 값은 `entries[key][lang] ?? entries[key].en`이다.
- 이미 있는 키는 세 모양을 모두 찾는다: `KEY: '…',`, `KEY: "…",`, `KEY:` 다음 줄에 `'…',`가 오는 두 줄 모양.
- 있는 값이 그 키의 `en`이나 `zh` 값과 같을 때만 새 값으로 바꾼다. 이미 번역된 값은 그대로 둔다.
- 블록 도구는 키를 그 언어 블록 안에서만 찾는다. 지금은 파일 전체에서 찾기 때문에 모든 블록을 건너뛴다.
- 없는 키는 지금처럼 넣는다. 바꾼 값은 홑따옴표 한 줄로 쓰고, 마지막에 prettier로 정리한다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { upsertFileStrings } from '../../../tools/hanpan-add-strings.mjs'
import { upsertBlockStrings } from '../../../tools/hanpan-add-block-strings.mjs'

const entries = { hpX: { ko: '가', en: 'Hello there', vi: 'Xin chào' } }

it('replaces an English placeholder that prettier wrapped', () => {
  const r = upsertFileStrings("export const vi = {\n  hpX:\n    'Hello there',\n}\n", 'vi', entries)
  expect(r).toMatchObject({ added: 0, replaced: 1 })
  expect(r.text).toContain("hpX: 'Xin chào',")
  expect(r.text.match(/hpX:/g)).toHaveLength(1)
})
it('replaces a double-quoted placeholder', () => {
  // '  hpX: "Hello there",' → replaced 1
})
it('keeps a translated value', () => {
  // "  hpX: 'Chào'," → replaced 0, text unchanged
})
it('adds a missing key once', () => {
  // second run on the first result → added 0, replaced 0
})
it('replaces a placeholder only inside its own language block', () => {
  const src =
    "export const strings = {\n  en: {\n    a: 'A',\n    hpX: 'Hello there',\n  },\n  vi: {\n    a: 'A',\n    hpX: 'Hello there',\n  },\n}\n"
  const r = upsertBlockStrings(src, 'a', entries)
  expect(r.replaced).toBe(1)
  expect(r.text).toContain("  en: {\n    a: 'A',\n    hpX: 'Hello there',")
  expect(r.text).toContain("hpX: 'Xin chào',")
})
it('inserts a missing key after afterKey in every block', () => {
  // no hpX anywhere → added 2
})
```

- [ ] **Step 2:** Run `npm test -w @genoffice/cli -- tests/hanpan-string-tools.test.ts` → FAIL
- [ ] **Step 3:** 두 도구에 함수를 만들어 export하고, 명령줄 부분은 그 함수를 부르게 바꾼다(`import.meta.url` 확인). `.d.mts`는 `tools/growth-log.d.mts`처럼 쓴다.
- [ ] **Step 4:** Run 같은 테스트 → PASS. `npx prettier --check tools/hanpan-add-strings.mjs tools/hanpan-add-block-strings.mjs` → 통과
- [ ] **Step 5: 커밋** `fix(tools): Hanpan string tools replace wrapped and double-quoted placeholders`

### Task 4: 베트남어 문구 넣기 (11/6)

**Files:**

- Modify(`vi` 추가)
  - `apps/shell/src/renderer/src/hanpan/home-strings.json`, `strings.json`, `convert-strings.json`
  - `apps/mindmap/src/renderer/i18n/hanpan-strings.json`, `hanpan-style-strings.json`
- 숨겨지는 기능이라 그대로 두는 것
  - `apps/hwp/src/renderer/i18n/hanpan-strings.json`
  - `apps/mindmap/src/renderer/i18n/hanpan-sync-strings.json`, `hanpan-design-strings.json`
- 도구가 고치는 것: `apps/shell/src/renderer/src/strings.ts`(vi 블록), `apps/mindmap/src/renderer/i18n/app/vi.ts`
- Test: `apps/shell/tests/hanpan-vi-strings.test.ts`, `apps/mindmap/tests/hanpan-vi-strings.test.ts`

**Interfaces:**

- Consumes: Task 3의 두 도구

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/shell/tests/hanpan-vi-strings.test.ts
import { strings } from '../src/renderer/src/strings'
import home from '../src/renderer/src/hanpan/home-strings.json'
import hanpan from '../src/renderer/src/hanpan/strings.json'
import convert from '../src/renderer/src/hanpan/convert-strings.json'

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/

for (const [name, dict] of Object.entries({ home, hanpan, convert })) {
  it(`${name}: every key has its own Vietnamese`, () => {
    for (const [key, text] of Object.entries(dict as Record<string, Record<string, string>>)) {
      expect(text.vi, key).toBeTruthy()
      if (!SAME_OK.test(text.en)) expect(text.vi, key).not.toBe(text.en)
      expect((strings.vi as Record<string, string>)[key], key).toBe(text.vi)
    }
  })
}
```

마인드맵 테스트도 같은 모양이다: `import { vi } from '../src/renderer/i18n/app/vi'`, 대상은 `hanpan-strings.json`과 `hanpan-style-strings.json`.

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/hanpan-vi-strings.test.ts`, `npm test -w @genoffice/mindmap -- tests/hanpan-vi-strings.test.ts` → FAIL (vi 없음)
- [ ] **Step 3:** JSON 다섯 개에 `vi`를 쓴다. 기존 베트남어 사전의 용어를 따르고, `GenOffice`와 `{n}` 같은 자리값은 그대로 둔다.
- [ ] **Step 4: 도구로 넣기**

```bash
node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts pdfToolsCardSub apps/shell/src/renderer/src/hanpan/strings.json
node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts hpDesignCardSub apps/shell/src/renderer/src/hanpan/home-strings.json
node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts hpStartFailed apps/shell/src/renderer/src/hanpan/convert-strings.json
node tools/hanpan-add-strings.mjs apps/mindmap/src/renderer/i18n/app apps/mindmap/src/renderer/i18n/hanpan-strings.json
node tools/hanpan-add-strings.mjs apps/mindmap/src/renderer/i18n/app apps/mindmap/src/renderer/i18n/hanpan-style-strings.json
npx prettier --write apps/shell/src/renderer/src/strings.ts apps/mindmap/src/renderer/i18n/app
```

Expected: `git diff --stat`에는 JSON 다섯 개, `strings.ts`, `app/vi.ts`만 나온다. 다른 언어 파일은 바뀌지 않는다.

- [ ] **Step 5:** Run 두 테스트, `npm test -w @genoffice/shell -- tests/strings.test.ts tests/i18n-key-parity.test.ts`, `npm test -w @genoffice/mindmap -- tests/i18n.test.ts`, `npm run typecheck` → PASS
- [ ] **Step 6: 커밋** `feat(hanpan): Vietnamese for the Hanpan strings`

### Task 5: 화면에 남은 옛 제품 이름 정리 (11/6)

탐색해 보니, 화면 문구에 남은 "이음오피스"는 1곳이다. 사용자에게 닿는 "IeumOffice"는 3곳이다.

스펙 5-3은 `check-no-genspark.mjs` 같은 별도 검사 스크립트를 말한다. 이 계획은 대신 `npm test`에 들어가는 테스트로 막는다. 화면 문구가 모두 사전에 모여 있어 테스트 하나로 다 볼 수 있고, CI 설정을 새로 바꾸지 않아도 되기 때문이다.

**Files:**

- Modify
  - `apps/shell/src/renderer/src/strings.ts:2848`: ko `setAiPanelStartDesc`의 `이음오피스를`을 `GenOffice를`로 바꾼다. 화면에는 "한판을"로 나간다.
  - `apps/shell/src/renderer/update.html:260`: `alt="IeumOffice"`를 `alt=""`로 바꾼다. 옆 제목에 제품 이름이 있어 꾸밈 그림이다.
  - `apps/hwp/studio-plugin/agent-plugin.mjs:445`: 메모 작성자 기본값 `'IeumOffice'`를 `'Hanpan'`으로 바꾼다. 주석이 말하는 PRODUCT_NAME과 같다.
  - `packaging/cli/install.sh:41,154`: `IeumOffice`를 `Hanpan`으로 바꾼다.
- Test: `apps/shell/tests/no-old-product-name.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { readFileSync } from 'node:fs'
import { PRODUCT_NAME } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'

const OLD = /IeumOffice|이음오피스/
/** a file relative to apps/shell */
const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

it('no screen string carries the old product name', () => {
  for (const [lang, table] of Object.entries(strings))
    for (const [key, value] of Object.entries(table))
      expect(`${lang}.${key}: ${value}`).not.toMatch(OLD)
})
it('the update window has no old name', () =>
  expect(read('src/renderer/update.html')).not.toMatch(OLD))
it('the HWP memo author fallback is the product name', () =>
  expect(read('../hwp/studio-plugin/agent-plugin.mjs')).toContain(
    `return clean || '${PRODUCT_NAME}'`,
  ))
it('the CLI installer prints the product name', () =>
  expect(read('../../packaging/cli/install.sh')).not.toMatch(OLD))
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/no-old-product-name.test.ts` → FAIL 4개
- [ ] **Step 3:** 위 네 곳을 고친다.
- [ ] **Step 4:** Run 같은 테스트와 `tests/product-identity.test.ts` → PASS
- [ ] **Step 5: 커밋** `fix(hanpan): drop the old product name from screens, HWP memos and the CLI installer`

### Task 6: 한국 문서 기능 스위치 — 값과 전달 (11/9)

**Files:**

- Create: `packages/i18n/src/korean-doc-features.ts`. Modify: `packages/i18n/src/index.ts`(`export * from './korean-doc-features'`)
- Create: `packages/ui/src/korean-doc-features-store.ts`. Modify: `packages/ui/src/index.ts`
- Create: `apps/shell/src/main/korean-doc-features.ts`
- Modify
  - `apps/shell/src/shared/home-api.ts`: `HOME_CHANNELS`, 홈 API 형(353행 부근)
  - `apps/shell/src/preload/index.ts`: `window.aiOffice`
  - `apps/shell/src/main/index.ts`: 자동 저장 기본값 처리기 옆, 5993행 부근
  - `apps/shell/src/renderer/src/main.tsx`
  - `apps/shell/src/renderer/src/SettingsModal.tsx`: 일반 창의 언어 줄 다음에 둔다. 모양은 자동 저장 줄(2022-2040행)을 따른다.
  - `apps/shell/src/renderer/src/hanpan/strings.json`, 이후 도구 실행
  - `docs/contracts.md`: 앱 설정 표, 282-290행
- Create: `docs/tracking/decisions/0091-hanpan-korean-doc-features.md`. Modify: `index.md`
- Test: `packages/i18n/tests/korean-doc-features.test.ts`, `apps/shell/tests/korean-doc-features.test.ts`, `apps/shell/tests/settings-korean-docs.test.ts`

**Interfaces:**

- Produces
  - `@genoffice/i18n`: `koreanDocFeaturesOn(stored: boolean | null, lang: Lang): boolean`. 값은 `stored ?? lang === 'ko'`이다.
  - `@genoffice/ui`
    - `applyKoreanDocFeatures(stored: unknown): void`: 참·거짓이 아닌 값은 `null`로 둔다.
    - `useKoreanDocFeatures(lang: Lang): boolean`: `useSyncExternalStore`를 쓰고, `ai-panel-prefs-store.ts`와 같은 모양으로 만든다.
  - 셸 메인: `KOREAN_DOC_FEATURES_KEY = 'koreanDocFeatures'`, `readKoreanDocFeatures(settingsPath: string): boolean | null`
  - 채널
    - `HOME_CHANNELS.getKoreanDocFeatures = 'home:get-korean-doc-features'`
    - `HOME_CHANNELS.setKoreanDocFeatures = 'home:set-korean-doc-features'`
    - 편집기용 읽기 `'app:get-korean-doc-features'`
    - 바뀜 알림 `'app:korean-doc-features-changed'`(값: `boolean | null`)
  - `window.aiOffice`
    - `getKoreanDocFeatures(): Promise<boolean | null>`
    - `setKoreanDocFeatures(on: boolean): Promise<void>`
    - `onKoreanDocFeaturesChanged(handler: (stored: boolean | null) => void): () => void`
  - 문구 키
    - `setKoreanDocs`: "한국 문서 기능"
    - `setKoreanDocsDesc`: "한글 문서, 공문 도구, 한판 양식, 디자인 보드, 공유마당. 끄면 홈과 편집기에서 숨깁니다."
  - 메인의 저장 처리기는 참·거짓만 받는다. 순서는 이렇다.
    1. `writeAppSetting(APP_SETTINGS_PATH(), KOREAN_DOC_FEATURES_KEY, on)`
    2. 모든 `webContents`에 `'app:korean-doc-features-changed'`를 보낸다.
    3. `buildHomeMenu(); installDockMenu(); installBackToHomeItems()`. Task 7의 메뉴가 이 값을 따른다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// packages/i18n/tests/korean-doc-features.test.ts
it.each([
  [null, 'ko', true],
  [null, 'vi', false],
  [null, 'en', false],
  [true, 'en', true],
  [false, 'ko', false],
] as const)('stored %s on %s → %s', (stored, lang, on) =>
  expect(koreanDocFeaturesOn(stored, lang)).toBe(on),
)
```

```ts
// apps/shell/tests/korean-doc-features.test.ts (temp folder as in tests/app-settings.test.ts)
it('reads null when the file or the key is missing', () => {}) // no file → null; {} → null
it('a stored value wins over the language', () => {}) // { koreanDocFeatures: true } → true
it('ignores a value that is not a boolean', () => {}) // { koreanDocFeatures: 'yes' } → null
```

```ts
// apps/shell/tests/settings-korean-docs.test.ts
// @vitest-environment jsdom; setup copied from tests/settings-autosave-default.test.ts
it('shows the switch off on an English UI with nothing stored', () => {}) // aria-checked="false"
it('shows the switch on on a Korean UI with nothing stored', () => {}) // aria-checked="true"
it('saves the new value when clicked', () => {}) // setKoreanDocFeatures called with true
```

- [ ] **Step 2:** Run 세 테스트 → FAIL
- [ ] **Step 3:** Interfaces대로 만든다.
  - preload는 다른 preload 진입점과 런타임 코드를 나누지 않는다. 값 검사는 그 자리에서 한다.
  - 홈 `main.tsx`는 첫 그리기 전에 `getKoreanDocFeatures()` → `applyKoreanDocFeatures`를 하고, `onKoreanDocFeaturesChanged(applyKoreanDocFeatures)`를 건다.
  - 설정 스위치는 `koreanDocFeaturesOn(stored, lang)`을 보여 준다. 누르면 `setKoreanDocFeatures(next)`와 `applyKoreanDocFeatures(next)`를 부른다.
- [ ] **Step 4:** 문구: `strings.json`에 두 키를 11개 언어로 쓴다. `node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts pdfToolsCardSub apps/shell/src/renderer/src/hanpan/strings.json`을 실행하고 `npx prettier --write apps/shell/src/renderer/src/strings.ts`로 정리한다.
- [ ] **Step 5: 문서**
  - `docs/contracts.md` 표에 한 줄: `| koreanDocFeatures | 참/거짓. 한국 문서 기능을 보일지 | 없음(화면 언어가 ko일 때만 켜짐) |`
  - 결정 0091
    - 맥락: 베트남 배포
    - 결정: 언어 기본값과 스위치를 함께 둔다
    - 버린 대안: 언어로만 정하기, 스위치만 두기, 번역해서 보여 주기
- [ ] **Step 6:** Run 세 테스트, `npm test -w @genoffice/shell -- tests/strings.test.ts`, `npm run typecheck` → PASS
- [ ] **Step 7: 커밋** `feat(hanpan): Korean document features switch with a language default`

### Task 7: 홈·시작 보드·메뉴·설정에서 숨기기 (11/9)

**Files:**

- Modify
  - `apps/shell/src/renderer/src/Home.tsx`: `renderQuickCards`, 1922-1992행
  - `apps/shell/src/renderer/src/hanpan/StartBoard.tsx`
  - `apps/shell/src/renderer/src/hanpan/hanpan.css`: `.hp-flow-lines`의 고정 `height: 166px`을 지운다
  - `apps/shell/src/renderer/src/IntegrationsPane.tsx:203`
  - `apps/shell/src/main/index.ts`: `menuNewHwp` 두 곳, 7162행·7216행 부근
- Modify(e2e): 영어로 켜고 한국 카드를 찾는 시험들이다. `launchShell({ …, settings: { koreanDocFeatures: true } })`로 바꾼다.
  - `e2e/home.spec.ts:12`, `e2e/hwp-table.spec.ts:57`, `e2e/hanpan-templates.spec.ts`, `e2e/hanpan-send.spec.ts`, `e2e/hanpan-design.spec.ts`
- Test: `apps/shell/tests/home-korean-cards.test.ts`, `apps/shell/tests/hanpan-start-board.test.ts`, `apps/shell/tests/korean-doc-menu-wiring.test.ts`

**Interfaces:**

- Consumes: Task 6의 `useKoreanDocFeatures`, `koreanDocFeaturesOn`, `readKoreanDocFeatures`
- Produces
  - `StartBoard`의 props: `{ greeting, t, korean: boolean }`
  - `flowGeometry(count: number): { height: number; rootY: number; ends: number[] }`(StartBoard.tsx에서 export)
  - index.ts의 `const koreanDocsOn = (): boolean => koreanDocFeaturesOn(readKoreanDocFeatures(APP_SETTINGS_PATH()), currentLang())`

꺼졌을 때 숨기는 것:

- 홈: `primary`의 `hwp`(AI 한글)와 `templates`, `secondary`의 `design`
- 시작 보드: `hpFlowHwp`, `hpFlowCard`. 카드뉴스는 디자인 보드로 가기 때문이다.
- 설정 > 통합: `GonguSettingsCard`
- 앱 메뉴: `menuNewHwp` 두 곳
- 홈의 `hwp` 거르기 단추(최근 파일 목록)는 그대로 둔다.
- 스펙 5-2의 "공유마당 그림 검색(슬라이드 리본)"은 실제로 없다(결정 0089는 워드·슬라이드를 뺐다). 공유마당 그림 검색은 디자인 보드에만 있고, 디자인 보드는 통째로 숨긴다. 슬라이드의 국악 효과음은 문서 기능이 아니라서 그대로 둔다.

`flowGeometry`의 계산:

- 칩 32px에 간격 11px을 더한 43px이 한 칸이다.
- `height = 43 * count - 6`이다. 4개일 때 지금 값 166이 된다.
- `rootY = height / 2`, `ends[k] = 19 + 43 * k`
- SVG는 ``viewBox={`0 0 64 ${height}`}``와 `style={{ height }}`로 그린다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/shell/tests/hanpan-start-board.test.ts
it('matches the current drawing for four branches', () =>
  expect(flowGeometry(4)).toEqual({ height: 166, rootY: 83, ends: [19, 62, 105, 148] }))
it('fits two branches', () =>
  expect(flowGeometry(2)).toEqual({ height: 80, rootY: 40, ends: [19, 62] }))
it('shows only the Word and slides branches when Korean features are off', () => {}) // jsdom: 2 <li>, 2 <path>
```

```ts
// apps/shell/tests/home-korean-cards.test.ts
// @vitest-environment jsdom; setup copied from tests/home-subscription-entry.test.ts,
// plus window.hanpanApi = { templates, openDesign }
it('hides the Korean cards on a Vietnamese UI', () => {}) // no [data-new="hwp"|"templates"|"design"]
it('shows them on a Korean UI', () => {})
it('shows them when the switch is on in English', () => {})
it('hides the Korean cards after the language changes', () => {}) // render ko → switch to vi → gone
```

```ts
// apps/shell/tests/korean-doc-menu-wiring.test.ts — reads src/main/index.ts as text, as tests/doc-picker-wiring.test.ts does
it('every New HWP menu item sits behind the Korean switch', () => {
  const src = readIndex()
  expect(src.match(/tm\('menuNewHwp'\)/g)).toHaveLength(2)
  expect(src.match(/koreanDocsOn\(\)\s*\?\s*\[\s*\{\s*label: tm\('menuNewHwp'\)/g)).toHaveLength(2)
})
```

- [ ] **Step 2:** Run 세 테스트 → FAIL
- [ ] **Step 3:** 위 규칙대로 고친다. 홈은 `const korean = useKoreanDocFeatures(lang)`로 거르고, `StartBoard`에 `korean`을 넘긴다.
- [ ] **Step 4:** Run 세 테스트와 `npm run typecheck` → PASS. e2e는 Task 11에서 돌린다.
- [ ] **Step 5: 커밋** `feat(hanpan): hide Korean document cards and menu items when the switch is off`

### Task 8: 마인드맵·한글 편집기에서 숨기기 (11/9)

**Files:**

- Modify(마인드맵)
  - `apps/mindmap/src/shared/ipc.ts`: `APP_CHANNELS`(134-146행)에 `getKoreanDocFeatures: 'app:get-korean-doc-features'`, `koreanDocFeaturesChanged: 'app:korean-doc-features-changed'`를 더하고, API 형(417행 부근)도 고친다.
  - `apps/mindmap/src/preload/index.ts`, `apps/mindmap/src/renderer/main.tsx`
  - `apps/mindmap/src/renderer/hanpan/SendMenu.tsx`, `apps/mindmap/src/renderer/hanpan/SendDialog.tsx`
- Modify(한글 편집기)
  - `apps/hwp/src/shared/ipc.ts`: `HWP_CHANNELS`(61-67행 부근)와 API 형(388행 부근)
  - `apps/hwp/src/preload/index.ts`, `apps/hwp/src/renderer/main.tsx`, `apps/hwp/src/renderer/hanpan/HanpanTools.tsx`
- Test: `apps/mindmap/tests/hanpan-send-menu.test.ts`, `apps/mindmap/tests/hanpan-send-dialog.test.ts`, `apps/hwp/tests/hanpan-tools-visibility.test.ts`

**Interfaces:**

- Consumes: Task 6의 `useKoreanDocFeatures(lang)`, `applyKoreanDocFeatures`, `'app:get-korean-doc-features'` 처리기
- Produces: `window.mindmapApi`와 `window.hwpApi`의 `getKoreanDocFeatures(): Promise<boolean | null>`, `onKoreanDocFeaturesChanged(handler: (stored: boolean | null) => void): () => void`

꺼졌을 때:

- **SendMenu:** `hwp` 항목과 `design`·`sync`·`credits` 항목을 그리지 않는다. `slides`와 `docx`는 남는다.
- **SendDialog(Word):** 문서 형식·모양·날짜·부서 줄을 숨긴다. `style: 'chapter-report'`, `theme: 'plain'`으로 보내고, `date`와 `department`는 보내지 않는다.
- **HanpanTools:** 아무것도 그리지 않는다(`return null`). 한글 편집기 자체는 그대로 열린다.
- **각 `main.tsx`:** 첫 그리기 전에 값을 받아 `applyKoreanDocFeatures`를 하고, 바뀌면 다시 적용한다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/mindmap/tests/hanpan-send-menu.test.ts (@vitest-environment jsdom; render as tests/toolbar-make-from.test.ts does)
it('offers only slides and Word when Korean features are off', () => {}) // [data-send] = ['slides', 'docx']
it('offers HWP, design, sync and credits when on', () => {})
```

```ts
// apps/mindmap/tests/hanpan-send-dialog.test.ts
it('sends a plain chapter report to Word when Korean features are off', () => {
  // no style <select>; sendToDocument called with expect.objectContaining({
  //   target: 'docx', style: 'chapter-report', theme: 'plain', date: undefined, department: undefined })
})
```

```ts
// apps/hwp/tests/hanpan-tools-visibility.test.ts
it('renders nothing when Korean features are off', () => {}) // no [data-action="hanpan-tools"]
it('renders the tools button when on', () => {})
```

- [ ] **Step 2:** Run 세 테스트 → FAIL
- [ ] **Step 3:** 위 규칙대로 고친다.
- [ ] **Step 4:** Run 세 테스트, `npm test -w @genoffice/mindmap`, `npm test -w @genoffice/hwp`, `npm run typecheck` → 기준선 밖의 실패 없음
- [ ] **Step 5: 커밋** `feat(hanpan): hide Korean export targets and HWP tools when the switch is off`

### Task 9: 첫 화면 언어를 Windows 언어로 (사용자 승인 시에만)

지금은 언어를 고른 적이 없으면 항상 한국어로 켜진다(`index.ts:877-878`, "Hanpan is Korean-first"). 그래서 베트남어 Windows에서도 한국어 화면이 뜬다. 스펙에 없는 결정이므로 사용자가 승인한 경우에만 한다.

**Files:**

- Create: `apps/shell/src/main/ui-lang-fallback.ts`
- Modify: `apps/shell/src/main/index.ts:877-878`
- Create: `docs/tracking/decisions/0092-hanpan-first-language-follows-windows.md`. Modify: `index.md`
- Test: `apps/shell/tests/ui-lang-fallback.test.ts`

**Interfaces:**

- Produces: `fallbackUiLang(osLocales: readonly string[]): Lang`
  - 앞에서부터 locale마다 `normalizeLang(locale)`을 본다.
  - 결과가 `'en'`이 아니거나 locale이 정말 영어(`/^en(\b|[-_])/i`)이면 그 언어를 쓴다.
  - 하나도 없으면 `'ko'`다.
- index.ts: `uiLang ??= fallbackUiLang(app.getPreferredSystemLanguages())`

- [ ] **Step 1: 실패하는 테스트**

```ts
it.each([
  [['vi-VN'], 'vi'],
  [['ko-KR'], 'ko'],
  [['en-US'], 'en'],
  [['zh-Hant-TW'], 'zh-TW'],
  [['sw-KE'], 'ko'],
  [['sw-KE', 'en-GB'], 'en'],
  [[], 'ko'],
] as const)('%j → %s', (locales, lang) => expect(fallbackUiLang(locales)).toBe(lang))
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/ui-lang-fallback.test.ts` → FAIL
- [ ] **Step 3:** 만들고 `index.ts`의 두 줄을 바꾼다. 주석은 새 동작을 설명하게 고친다.
- [ ] **Step 4:** 같은 테스트 → PASS. 결정 0092에는 언어를 고른 적 없는 기존 사용자 중 Windows가 영어인 사람은 영어로 바뀐다는 결과를 적는다.
- [ ] **Step 5: 커밋** `feat(hanpan): first-run language follows Windows when it is supported`

### Task 10: 홈에서 PhotoCraft·VectorCraft 열기 (11/9)

**Files:**

- Create: `apps/shell/src/main/hanpan/artcraft.ts`
- Modify
  - `apps/shell/src/main/index.ts`: `configureDesignWindow` 옆(8927행 부근)에서 `registerArtcraftIpc`를 부른다.
  - `apps/shell/src/preload/index.ts`: `hanpanApi`, 834-845행
  - `apps/shell/src/renderer/src/hanpan/TemplatePicker.tsx`: `HanpanApi`, 22-31행
  - `apps/shell/src/renderer/src/Home.tsx`: `secondary`의 `pdf-tools` 다음
  - `apps/shell/src/renderer/src/hanpan/hanpan.css`
  - `apps/shell/src/renderer/src/hanpan/home-strings.json`, 이후 도구 실행
- Test: `apps/shell/tests/hanpan-artcraft-ipc.test.ts`, `apps/shell/tests/home-artcraft-cards.test.ts`

**Interfaces:**

- Consumes: Task 2의 `tools/artcraft-pins.json`(`exe`)
- Produces
  - `ARTCRAFT_APPS = ['photocraft', 'vectorcraft'] as const`, `type ArtcraftApp`
  - `ARTCRAFT_EXE: Record<ArtcraftApp, string>`: pins의 `exe`와 같아야 하고, 테스트가 이를 지킨다.
  - `ARTCRAFT_CHANNELS = { available: 'hanpan:artcraft-available', open: 'hanpan:open-artcraft' }`
  - `type ArtcraftHost = { platform: NodeJS.Platform; isPackaged: boolean; resourcesPath: string; appPath: string }`
  - `artcraftExePath(app: ArtcraftApp, host: ArtcraftHost): string | null`
    - Windows가 아니면 `null`이다.
    - 설치본: `join(resourcesPath, 'artcraft', app, ARTCRAFT_EXE[app])`
    - 개발 실행: `join(appPath, '..', '..', 'vendor', 'artcraft', app, ARTCRAFT_EXE[app])`
  - `registerArtcraftIpc(deps: { parentWindow(): BrowserWindow | null; host: ArtcraftHost; exists?: (path: string) => boolean; spawn?: typeof import('node:child_process').spawn }): void`
    - `available`: 프로그램이 있는 앱의 목록(`ArtcraftApp[]`)을 돌려준다.
    - `open(app)`: 결과는 다섯 가지다.
      - 보낸 쪽이 셸 창이 아니면 무시한다(`design-window.ts:239-243` 모양).
      - 모르는 앱이면 `{ ok: false, error: 'unknown' }`
      - 파일이 없으면 `{ ok: false, error: 'missing' }`
      - 그 밖에는 `spawn(exe, [], { cwd: dirname(exe), detached: true, stdio: 'ignore' })`를 부르고 `unref()`한 뒤 `{ ok: true }`
      - spawn이 던지면 `{ ok: false, error: 'failed' }`
  - `window.hanpanApi.artcraftAvailable?(): Promise<ArtcraftApp[]>`, `openArtcraft?(app: ArtcraftApp): Promise<{ ok: true } | { ok: false; error: string }>`
  - 문구 키
    - `hpPhotoCraft`: "사진 편집 (PhotoCraft)"
    - `hpVectorCraft`: "일러스트 (VectorCraft)"
    - `hpArtcraftTip`: "ArtCraft의 무료 오픈소스 앱입니다. 별도 창으로 열립니다."
    - `hpArtcraftFailed`: "앱을 열지 못했습니다. 설치 폴더의 artcraft 폴더를 확인하세요."

홈 화면 동작:

- 처음 그릴 때 `artcraftAvailable()`를 한 번 묻는다. 있는 앱만 `secondary`의 `pdf-tools` 다음에 넣는다. 언어와 관계없이 보인다.
- 그림은 일반 그림(붓·펜 모양 SVG, 색은 토큰)을 쓴다.
- 열기에 실패하면 카드 아래 `<p className="hp-start-note hp-start-failed" role="alert">`에 `hpArtcraftFailed`를 보여 준다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/shell/tests/hanpan-artcraft-ipc.test.ts — electron mocked as in tests/hanpan-design-gongu-ipc.test.ts; spawn injected
it('opens the bundled program as its own process', () => {}) // spawn(exe, [], { cwd, detached: true, stdio: 'ignore' }), unref, { ok: true }
it('missing program → { ok: false, error: "missing" }', () => {})
it('unknown app → { ok: false, error: "unknown" } and no spawn', () => {})
it('ignores a request from another window', () => {}) // undefined, no spawn
it('a spawn that throws → { ok: false, error: "failed" }', () => {})
it('lists only the apps whose program exists', () => {})
it('has no path off Windows', () => {}) // artcraftExePath('photocraft', { platform: 'darwin', … }) === null
it('keeps the program names in step with the pins', () => {}) // ARTCRAFT_EXE equals each pin's exe
```

```ts
// apps/shell/tests/home-artcraft-cards.test.ts (jsdom, Home setup as in Task 7)
it('shows a card per available app on any language', () => {}) // lang 'vi', available ['photocraft'] → only [data-new="photocraft"]
it('shows a notice when an app does not open', () => {}) // openArtcraft → { ok: false } → role=alert with hpArtcraftFailed
```

- [ ] **Step 2:** Run 두 테스트 → FAIL
- [ ] **Step 3:** Interfaces대로 만든다. 문구는 `home-strings.json`에 11개 언어로 쓰고 `node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts hpDesignCardSub apps/shell/src/renderer/src/hanpan/home-strings.json`을 실행한 뒤 prettier로 정리한다.
- [ ] **Step 4:** Run 두 테스트, `tests/hanpan-vi-strings.test.ts`, `npm run typecheck` → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): open PhotoCraft and VectorCraft from Home`

### Task 11: 시연판 빌드와 손 시험 (11/10 리뷰, 11/13 설치)

바뀌는 파일은 없다.

- [ ] **Step 1:** 검사 10개를 돌린다. 테스트 실패는 Task 1 기준선과 비교한다.
- [ ] **Step 2: e2e**
  - Task 1 Step 6의 Rust 없는 전체 빌드를 다시 돌린다.
  - `npm run test:e2e -- e2e/home.spec.ts e2e/hwp-table.spec.ts e2e/hanpan-templates.spec.ts e2e/hanpan-send.spec.ts e2e/hanpan-design.spec.ts e2e/hanpan-home.spec.ts`
  - Expected: 기준선 밖의 실패 없음
- [ ] **Step 3: 설치판** (GitHub에서, 사용자 확인 뒤)
  - Run: `git push` (Task 2 Step 10에서 올린 가지에 덧붙인다)
  - Run: `gh workflow run windows-build.yml --repo tenaico/hanpan --ref feat/vn-artcraft-securitykey` (`release_tag`는 비운다)
  - Run: `gh run watch --repo tenaico/hanpan <run-id>` → 성공
  - Run: `gh run download <run-id> --repo tenaico/hanpan --dir "$TEMP/hanpan-demo-build"` → `Hanpan-Setup-0.15.0.exe`
- [ ] **Step 4: 손 시험** (스펙 8장과 Review Focus)
  - 먼저 개발 모드로 아래 항목을 모두 본다.
  - 그다음 사용자 확인을 받고, 받은 시연판을 이 PC의 한판 위에 설치한다.
    - 설정과 문서 목록을 건드리지 않도록, 켤 때 `GENOFFICE_USER_DATA`를 임시 폴더로 둔다.
    - 설치판에서만 볼 수 있는 것(ArtCraft 실행, 설치 경고)을 다시 본다.
    - 시험이 끝나면 공식 0.15.0을 다시 설치할 수 있다.
  - **언어 vi:** 홈 카드 3개 없음, 시작 보드 2갈래, 설정 스위치 꺼짐, 통합에 공유마당 없음, 메뉴에 새 한글 없음
  - **마인드맵 → 보내기:** 슬라이드와 Word만 있다. Word 대화 상자에 형식과 날짜가 없다.
  - **.hwp 열기:** 편집기가 열리고 한판 도구 단추가 없다.
  - **PhotoCraft·VectorCraft 카드:** 각각 따로 켜지고, 한판을 닫아도 남는다.
  - **글:** 화면 어디에도 "이음오피스"·"IeumOffice"가 없다. 긴 베트남어 문구가 카드에서 깨지지 않는다.
  - **언어 ko로 되돌림:** 숨긴 것이 모두 다시 보인다.
- [ ] **Step 5:** 결과를 사용자에게 알린다. 11/13 이사님 노트북 설치와 시연 준비(스펙 9장 11/13 행)는 사용자와 함께 한다. Task 9를 하지 않았다면 설치 뒤 설정에서 언어를 베트남어로 고른다.
