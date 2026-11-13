# 한판 로컬 보안키와 사용 동의 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한판 0.20.0에서 서버 없이 동작하는 USB(권장)·PC 보안키와, 설치·첫 실행의 사용 동의를 넣는다.

**Architecture:** 가지 `feat/security-key`(0094, 서버 보안키 앱 쪽)를 main에 합친 뒤, 서버에 묶인 세 부분(서명 형식, 서버 등록, 상태 확인·유예)을 PC의 등록 기록 대조로 바꾼다. USB 감시, 잠금 덮개, vault 암호화(`sealed:v2:`), AI 잠금, 21개 언어 문구 틀은 그대로 쓴다. 이용 조건 동의는 모든 운영체제에서 첫 창보다 먼저 받는다.

**Tech Stack:** Electron, TypeScript, React(셸 렌더러), vitest, Playwright e2e, electron-builder(NSIS, dmg).

**Spec:** `docs/superpowers/specs/2026-11-12-hanpan-local-security-key-design.md` (승인 2026-11-12)

## Global Constraints

- 작업 가지: `feat/local-securekey`, `origin/main`(0.19.5, 3b770ccd 이후)에서 시작. 설계 문서 커밋 03367f0b도 이 가지에 가져온다.
- 커밋: `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`, 영어 메시지, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 코드 주석은 영어(`npm run check:english-comments`).
- 보안키는 Windows에서만(`process.platform === 'win32'`이고 빌드 값 `__HANPAN_REQUIRE_KEY__`가 켜졌을 때). 이용 조건 동의는 모든 운영체제.
- 파일 이름: USB `<드라이브>:\Hanpan\hanpan.key`, `<드라이브>:\Hanpan\vault.key`. PC `userData/securekey/registered.json`, `userData/securekey/vault.key`(DPAPI 봉인, PC 보관일 때만). 동의 `userData/consent.json`.
- `hanpan.key`: `{ "v": 2, "keyId": <무작위 16바이트 hex 32자>, "createdAt": <ISO> }`. 서명 없음.
- `registered.json`: `{ "v": 2, keyId, where: "usb"|"pc", devices: [{ deviceId, addedAt }], createdAt, pcConsentAt: string|null, previous: [{ keyId, replacedAt }] }`. `deviceId`는 기존 `deviceIdHash(usbDeviceId(volume))`(SHA-256 hex).
- `consent.json`: `{ "v": 1, "termsVersion": "2026-11-20", "acceptedAt": <ISO> }`. 빌드 상수 `TERMS_VERSION = '2026-11-20'`.
- 한판은 보안키, 기기 번호, 동의 기록, 문서, AI 대화를 어디로도 보내지 않는다. 이 작업에서 네트워크 요청을 새로 만들지 않는다.
- 문구(한국어)는 스펙 5-3~5-6과 시안(https://claude.ai/artifact/V2RkvHm8Mm7yhSyX6EXik6, 2026-11-12 판) 그대로다. 면책은 "다만 TEN AI의 고의로 생긴 손해는 그러하지 않습니다"(중대한 과실 없음). 다른 20개 언어는 영어판을 기준으로 번역한다.
- e2e·개발 빌드는 `__HANPAN_REQUIRE_KEY__`가 꺼져 보안키를 건너뛴다. 동의는 e2e 도우미가 임시 프로필에 `consent.json`을 미리 써서 건너뛴다. 제품 코드에 동의 건너뛰기 스위치를 두지 않는다.
- 안전: AI 실제 요청 금지, 임시 프로필만, 직접 띄운 PID만 종료, `docs/manual/images` 커밋 금지.

## Review Focus

1. 꽂힌 USB의 `Hanpan\hanpan.key`가 깨졌거나 다른 형식(예전 v1 서명 파일)일 때 → 앱이 죽지 않고 그 USB를 "맞지 않는 USB"로 건너뛴다. (Task 2 `ignores a damaged or v1 key file on a stick`)
2. 지금 보안키 USB와 예전(교체된) USB가 함께 꽂혀 있을 때 → 지금 USB로 연다. 알림은 띄우지 않는다. (Task 3 `opens with the current stick when an old one is also in`)
3. `registered.json`이 깨졌을 때 → "보안키 만들기" 단계로 간다. 예전 USB 알림 기록은 잃지만 앱은 열 수 있어야 한다. (Task 2 `reads a damaged registration as none`)
4. USB에 만드는 도중 USB가 빠지거나 쓰기가 실패할 때 → `registered.json`을 쓰지 않고 오류 문구를 보인다. 다시 시도할 수 있다. (Task 5 `leaves no registration when writing the stick fails`)
5. 0.19.x 사용자가 업데이트해서 `sealed:v1:` API 키가 있을 때 → 보안키를 만든 직후 `sealed:v2:`로 바뀌어 계속 쓸 수 있다. 새로 만들기를 하면 지워진다. (Task 6 `reseals v1 secrets after the first key and clears them on reset`)

---

### Task 1: 가지 만들기와 0094 코드 합치기

**Files:**

- 가지 `feat/local-securekey` (origin/main에서), merge `feat/security-key`, cherry-pick 03367f0b
- 충돌 예상: `apps/shell/src/main/index.ts`, `apps/shell/src/renderer/src/Home.tsx`, `apps/shell/src/main/ai-secrets.ts`, `apps/shell/src/renderer/src/home.css`, `docs/contracts.md`, `docs/tracking/decisions/index.md`(0094와 main의 0094~0098 번호 겹침)

**Interfaces:**

- Produces: main 위에서 0094 코드가 그대로 동작하는 기준선. 이후 작업은 이 위에서 바꾼다.

- [ ] **Step 1:** `git switch -c feat/local-securekey origin/main` 후 `git merge --no-ff feat/security-key`. 충돌은 양쪽을 모두 살린다(main의 0.19.x 기능 + 보안키 연결). 결정 번호가 겹치면 0094 보안키 결정 파일을 `0099-hanpan-security-key.md`로 옮겨 둔다(Task 8에서 내용을 바꾼다).
- [ ] **Step 2:** `git cherry-pick 03367f0b`(설계 문서).
- [ ] **Step 3:** `npm ci` 후 `npm run typecheck`. Expected: 오류 0.
- [ ] **Step 4:** `cd apps/shell && npx vitest run tests/securekey tests/ai-secrets.test.ts` 와 `cd packages/ai-provider && npx vitest run tests/ai-lock.test.ts tests/settings-secrets.test.ts`. Expected: 모두 통과(0094 기준선).
- [ ] **Step 5:** 커밋 `merge: bring the security key app side onto 0.19.5`.

### Task 2: 로컬 키 파일과 등록 기록

**Files:**

- Modify: `apps/shell/src/main/securekey/format.ts` (서명·공개키·`StatusPayload` 삭제, 새 형식)
- Modify: `apps/shell/src/main/securekey/store.ts`
- Test: `apps/shell/tests/securekey/format.test.ts`, `apps/shell/tests/securekey/store.test.ts` (서버 서명 시험은 지우고 아래로 바꾼다), `tests/securekey/test-signer.ts` 삭제

**Interfaces:**

- Produces (format.ts):
  - `interface LocalKeyFile { v: 2; keyId: string; createdAt: string }`
  - `interface RegisteredDevice { deviceId: string; addedAt: string }`
  - `interface Registered { v: 2; keyId: string; where: 'usb' | 'pc'; devices: RegisteredDevice[]; createdAt: string; pcConsentAt: string | null; previous: { keyId: string; replacedAt: string }[] }`
  - `parseLocalKeyFile(text: string): LocalKeyFile | null`, `parseRegistered(text: string): Registered | null` (형식이 하나라도 틀리면 null, `keyId`는 `/^[0-9a-f]{32}$/`)
  - `newKeyId(): string` (crypto.randomBytes(16) hex)
- Produces (store.ts):
  - `KEY_FILES = { key: 'hanpan.key', vault: 'vault.key', registered: 'registered.json' }`, `USB_KEY_DIR = 'Hanpan'`, `pcKeyDir(userData)`, `usbKeyDir(letter)` (그대로)
  - `readRegistered(userData: string): Registered | null`, `writeRegistered(userData: string, r: Registered): Promise<void>` (임시 파일에 쓰고 이름 바꾸기)
  - `interface Registration { where: 'usb' | 'pc'; keyId: string; vault: Buffer; letter?: string; volumeSerial?: string }`
  - `type FindResult = { kind: 'none' } | { kind: 'found'; registration: Registration } | { kind: 'replaced'; replacedAt: string } | { kind: 'unregistered-usb' } | { kind: 'usb-missing' } | { kind: 'damaged' }`
  - `findRegistration(opts: { userData: string; volumes: UsbVolume[]; usbDir?: (letter: string) => string; openPcVault(sealed: Buffer): Buffer | null }): Promise<FindResult>`

- [ ] **Step 1: 시험 쓰기** (`store.test.ts`, 가짜 USB 폴더는 임시 폴더, `volumes`는 `{ letter, diskSerial, volumeSerial }`):
  - `reads a damaged registration as none`: `registered.json`이 `{` → `{ kind: 'none' }`
  - `finds the stick whose key and device match`: 등록 USB → `kind: 'found'`, `registration.where === 'usb'`, `vault`가 USB의 `vault.key`와 같음
  - `tells a copied folder from the registered stick`: 같은 `keyId` 파일이 다른 `diskSerial`의 USB에 있음 → `{ kind: 'unregistered-usb' }`
  - `reports a replaced stick with its date`: USB의 `keyId`가 `previous`에 있음 → `{ kind: 'replaced', replacedAt }`
  - `ignores a damaged or v1 key file on a stick`: USB의 `hanpan.key`가 깨졌거나 `{ payload, sig }`(v1) → 그 USB만 건너뛰고, 다른 맞는 USB가 없으면 `usb-missing`
  - `opens the PC vault for a PC registration`: `where: 'pc'` → `openPcVault`가 준 값으로 `found`, `openPcVault`가 null → `damaged`
  - format: `parseLocalKeyFile`/`parseRegistered`가 맞는 값은 그대로, `keyId` 31자·대문자·빠진 필드는 null
- [ ] **Step 2:** `npx vitest run tests/securekey/store.test.ts tests/securekey/format.test.ts` → 새 시험 실패 확인.
- [ ] **Step 3:** 구현. USB마다 `hanpan.key`를 읽어 `keyId`로 판단하고, `found`가 하나라도 있으면 그것이 우선이다. 그다음은 `unregistered-usb`, `replaced`, `usb-missing` 순서다.
- [ ] **Step 4:** 시험 통과 확인.
- [ ] **Step 5:** 커밋 `feat(securekey): local key file and registration record, no signatures`.

### Task 3: 켤 때의 판단과 런타임 (서버·유예 제거)

**Files:**

- Modify: `apps/shell/src/main/securekey/gate.ts`, `runtime.ts`
- Delete: `apps/shell/src/main/securekey/status.ts`, `register.ts`(서버 활성화), `tests/securekey/status.test.ts`, `tests/securekey/register.test.ts`
- Modify: `apps/shell/electron.vite.config.ts` (`__HANPAN_KEY_SERVER__`, `__HANPAN_KEY_PUBKEYS__`, `__HANPAN_KEY_REQUIRED_FROM__` 삭제, `__HANPAN_REQUIRE_KEY__`만 둔다)
- Test: `apps/shell/tests/securekey/gate.test.ts`, `runtime.test.ts`, `gate-wiring.test.ts`

**Interfaces:**

- Consumes: Task 2 `findRegistration`, `FindResult`, `Registration`
- Produces:
  - `interface GateConfig { platform: NodeJS.Platform; requireKey: boolean }`, `readGateConfig(): GateConfig`
  - `type LockReason = 'usb-missing' | 'unregistered-usb' | 'replaced' | 'damaged'`
  - `type GateDecision = { kind: 'skip' } | { kind: 'open'; registration: Registration } | { kind: 'create' } | { kind: 'locked'; reason: LockReason; replacedAt?: string }`
  - `decideGate(input: { config: GateConfig; found: FindResult }): GateDecision`
  - `SecureKeyRuntimeDeps`에서 `fetch` 삭제. `SecureKeyRuntime`에서 `graceUntil()`·`pending()` 삭제. `secureKeyGraceLine`과 홈의 유예 배너 삭제.

- [ ] **Step 1: 시험 쓰기** (`gate.test.ts`):
  - `skips outside Windows or without the build switch`
  - `asks to create a key when nothing is registered` (`none` → `create`)
  - `opens a found key` / `locks with the reason` (`usb-missing`, `unregistered-usb`, `damaged` 각각) / `carries the replaced date` (`replaced` → `locked`, `reason: 'replaced'`, `replacedAt`)
  - `runtime.test.ts`: `opens with the current stick when an old one is also in` (Review Focus 2), 기존 "빼면 잠김" 시험은 그대로 통과
- [ ] **Step 2:** 실패 확인.
- [ ] **Step 3:** 구현. 런타임은 `decideGate`가 `create`면 첫 실행 창(Task 5)을 보안키 단계로 띄우고, `locked`면 잠금 창·덮개를 띄운다. 하루 한 번 상태 확인 타이머와 관련 코드는 지운다.
- [ ] **Step 4:** `npx vitest run tests/securekey` 통과, `npm run typecheck -w @genoffice/shell` 오류 0.
- [ ] **Step 5:** 커밋 `feat(securekey): decide at start from the PC record; no server, no grace`.

### Task 4: 이용 조건 동의 기록

**Files:**

- Create: `apps/shell/src/main/consent.ts`
- Test: `apps/shell/tests/consent.test.ts`
- Modify: `e2e/helpers.ts` (`launchShell`이 임시 프로필에 `consent.json`을 쓴다)

**Interfaces:**

- Produces:
  - `const TERMS_VERSION = '2026-11-20'`
  - `interface Consent { v: 1; termsVersion: string; acceptedAt: string }`
  - `readConsent(userData: string): Consent | null`, `needsConsent(userData: string, version = TERMS_VERSION): boolean`, `writeConsent(userData: string, now: Date, version = TERMS_VERSION): Promise<void>`

- [ ] **Step 1: 시험 쓰기**: `needs consent with no file`, `needs consent again when the terms version changes` (`2026-11-20` 기록 + `2026-12-01` → true), `keeps a matching consent` (false), `reads a damaged file as none`.
- [ ] **Step 2:** 실패 확인. **Step 3:** 구현. **Step 4:** 통과 확인.
- [ ] **Step 5:** `e2e/helpers.ts`의 `launchShell`이 프로필을 만들 때 `consent.json`(`TERMS_VERSION`과 같은 값, 상수는 `apps/shell/src/main/consent.ts`에서 가져오지 말고 같은 문자열을 `e2e/helpers.ts`에 둔다)을 쓴다. 옵션 `consent: false`면 쓰지 않는다.
- [ ] **Step 6:** 커밋 `feat(shell): terms consent record, read before the first window`.

### Task 5: 첫 실행 창 (이용 조건 → 보안키 만들기)과 USB 기다리기 화면

**Files:**

- Modify: `apps/shell/src/renderer/securekey.html`, `apps/shell/src/renderer/src/securekey.ts`, `apps/shell/src/preload/securekey.ts`, `apps/shell/src/shared/securekey-api.ts`, `apps/shell/src/main/securekey/window.ts`, `apps/shell/src/main/securekey/lock-overlay.ts`
- Create: `apps/shell/src/main/securekey/create.ts`
- Modify: `apps/shell/src/main/securekey/strings.json`, `strings.ts`
- Modify: `apps/shell/src/main/index.ts` (시작 순서: 동의 → 보안키 → 홈)
- Test: `apps/shell/tests/securekey/create.test.ts`, `window.test.ts`, `lock-overlay.test.ts`, `strings.test.ts`

**Interfaces:**

- Consumes: Task 2 store, Task 3 `decideGate`, Task 4 consent
- Produces:
  - `SECUREKEY_CHANNELS`: `pickKeyFile`·`later`·`openKeyPage` 삭제, `acceptTerms: 'securekey:accept-terms'`, `createKey: 'securekey:create-key'`, `resetKey: 'securekey:reset-key'` 추가
  - `SecureKeyUiState.mode: 'terms' | 'create' | 'lock'`, `reason: SecureKeyLockReason | null`, `replacedAt: string | null`, `usbLetters: string[]`. `optional`, `until`, `keyFileName` 삭제.
  - `type CreateTarget = { where: 'usb'; letter: string } | { where: 'pc'; consentAt: string }`
  - `createKey(opts: { userData: string; target: CreateTarget; volumes: UsbVolume[]; now: Date; usbDir?: (l: string) => string; sealPcVault(v: Buffer): Buffer }): Promise<{ ok: true; registration: Registration } | { ok: false; error: 'no-usb' | 'write-failed' }>`. 순서는 USB(또는 PC) 파일을 먼저 쓰고 성공해야 `registered.json`을 쓴다. 이미 `registered.json`이 있으면 `previous`를 이어받는다.
  - 문구 키(한국어 값은 스펙·시안 그대로): `skTermsTitle`, `skTermsLead`, `skTerms1`~~`skTerms4`, `skTermsAgree`, `skTermsFull`, `skTermsContinue`, `skCreateTitle`, `skCreateLead`, `skCreateUsb`, `skCreateUsbSub`, `skRecommended`, `skCreatePc`, `skCreatePcSub`, `skNoteSubscription`, `skNoteWindowsLock`, `skUsbPickLead`, `skUsbSpareHint`, `skUsbDone`, `skPcWarn`, `skPcAgree`, `skWaitTitle`, `skWaitLead`, `skLostLink`, `skReplaced`(`{when}` 자리), `skUnregisteredUsb`, `skResetTitle`, `skReset1`~~`skReset4`, `skResetAgree`, `skResetGo`, `skErrNoUsb`, `skErrWriteFailed`. 서버·유예 문구 키는 지운다.

- [ ] **Step 1: 시험 쓰기**:
  - `create.test.ts`: `writes the stick files before the record` (USB 폴더에 `hanpan.key` v2와 32바이트 `vault.key`, 기록의 `devices[0].deviceId`가 그 USB의 해시), `leaves no registration when writing the stick fails` (Review Focus 4: `usbDir`를 쓸 수 없는 경로로 → `write-failed`, `registered.json` 없음), `keeps the previous keys when creating again`, `records the PC consent time for a PC key`
  - `strings.test.ts`: 새 키가 21개 언어 모두에 있고 비어 있지 않음, `skReplaced`에 `{when}`이 모든 언어에 있음, 한국어 `skTerms2`에 "고의"가 있고 "중대한 과실"이 없음
  - `window.test.ts`: 상태가 `terms` → [동의하고 계속]은 체크 전 비활성, `acceptTerms` 뒤 `create` 단계로, PC 선택은 동의 체크 전 비활성
- [ ] **Step 2:** 실패 확인.
- [ ] **Step 3:** 구현. 화면 구성과 생김새는 시안 ②③④⑤를 따른다. 기존 `securekey.html`의 구조와 셸 토큰 색을 쓴다. 시작 순서: `needsConsent` → `terms` 단계, Windows이고 `decideGate`가 `create` → 같은 창의 `create` 단계, `locked` → `lock`(기다리기 화면, `replaced`면 `skReplaced` 줄, `unregistered-usb`면 `skUnregisteredUsb` 줄), 그다음 홈. Mac·Linux는 `terms`만.
- [ ] **Step 4:** `npx vitest run tests/securekey tests/consent.test.ts` 통과, typecheck 0.
- [ ] **Step 5:** 커밋 `feat(securekey): first-run terms and key creation window, wait and replaced notices`.

### Task 6: 새로 만들기, 예비 USB, 옮기기, 설정 칸

**Files:**

- Create: `apps/shell/src/main/securekey/manage.ts`
- Modify: `apps/shell/src/main/securekey/runtime.ts`, `apps/shell/src/main/ai-secrets.ts`, `apps/shell/src/renderer/src/Home.tsx`(0094의 설정 보안키 칸), `apps/shell/src/shared/home-api.ts`, `apps/shell/src/preload/index.ts`
- Test: `apps/shell/tests/securekey/manage.test.ts`, `apps/shell/tests/ai-secrets.test.ts`

**Interfaces:**

- Consumes: Task 2·5
- Produces:
  - `resetKey(opts: { userData: string; now: Date }): Promise<void>`: 지금 `keyId`를 `previous`에 넣고 `registered.json`과 PC `vault.key`를 지운다. USB 파일은 건드리지 않는다.
  - `clearSealedV2Secrets(settingsPath: string): Promise<number>` (`ai-secrets.ts`): `sealed:v2:` 값을 모두 지우고 지운 개수를 돌려준다.
  - `addSpareUsb(opts: { userData: string; current: Registration; volume: UsbVolume; usbDir?: (l: string) => string; now: Date }): Promise<'ok' | 'same-usb' | 'write-failed'>`
  - `moveToUsb(...)`, `moveToPc(...)`: 같은 모양. `moveToPc`는 `pcConsentAt`을 받는다.
  - 홈 IPC: `window.aiOffice.secureKeyInfo(): Promise<{ where: 'usb' | 'pc'; createdAt: string; spareCount: number } | null>`와 위 동작 4개.

- [ ] **Step 1: 시험 쓰기**:
  - `reseals v1 secrets after the first key and clears them on reset` (Review Focus 5): `sealed:v1:` 값 → 만든 뒤 `sealed:v2:` → `resetKey`+`clearSealedV2Secrets` 뒤 키가 없음, 다른 설정 값은 그대로
  - `moves the current key to previous on reset`, `adds a spare stick's device to the record` (`devices.length === 2`, 두 USB 모두 `found`), `refuses the same stick as a spare` (`same-usb`), `moves a PC key to a stick and drops the PC vault`
- [ ] **Step 2:** 실패 확인. **Step 3:** 구현. 설정 칸은 지금 보안키(USB·PC, 만든 날)와 단추 4개([예비 USB 만들기], [USB로 옮기기] 또는 [이 PC로 옮기기], [새 보안키 만들기])다. 확인 화면은 Task 5의 `skReset*` 문구를 쓴다. **Step 4:** 통과 확인.
- [ ] **Step 5:** 커밋 `feat(securekey): new key, spare stick, move between stick and PC`.

### Task 7: 설치 프로그램 사용권

**Files:**

- Create: `apps/shell/build/license_ko.txt`, `apps/shell/build/license_en.txt`
- Modify: `apps/shell/electron-builder.cjs` (`nsis.license`, dmg 사용권), 앱 [정보] 창에서 같은 본문을 보이는 곳(셸의 About 대화상자)
- Test: `apps/shell/tests/installer-license.test.ts`

**Interfaces:**

- Produces: 사용권 파일 2개(UTF-8 BOM 포함, NSIS가 한글을 읽도록). 본문은 스펙 5-6과 시안 ①의 여섯 항목이다(한국어 그대로, 영어는 번역).

- [ ] **Step 1: 시험 쓰기**: `the installer shows the license in Korean and English` (설정에 두 파일이 연결됨), `the license keeps the six items` (각 파일에 1~6 제목, 한국어 3항에 "TEN AI의 고의로 생긴 손해는 그러하지 않습니다", "중대한 과실" 없음, 6항에 "trend.tenai.kr"과 "GitHub"), `the About window shows the same text`.
- [ ] **Step 2:** 실패 확인. **Step 3:** 구현. electron-builder의 언어별 사용권 규칙(`license_<lang>.txt`)을 따른다. **Step 4:** 통과 확인.
- [ ] **Step 5:** 커밋 `feat(installer): license and disclaimer page in Korean and English`.

### Task 8: 정리, 결정 기록, e2e 하나

**Files:**

- Delete: `tools/securekey-dev-server.mjs`, `packages/cli/tests/securekey-dev-server.test.ts`, 서버·유예 관련 문구와 상수
- Modify: `docs/tracking/decisions/0099-hanpan-security-key.md`(내용을 이 설계로 다시 씀, 0094를 대신한다고 적음), `docs/tracking/decisions/index.md`, `docs/security.md`, `docs/contracts.md`(서버 계약 삭제, 로컬 파일 형식 추가)
- Create: `e2e/securekey-local.spec.ts`

- [ ] **Step 1: e2e 쓰기** `first run asks for consent, then the home opens` (`launchShell({ consent: false })`, 임시 프로필): 동의 체크 → 홈이 열림 → `consent.json`이 생김. 보안키 단계는 e2e 빌드에서 꺼져 있으므로 여기서 다루지 않는다(단위 시험과 사람 시험이 맡는다).
- [ ] **Step 2:** 실패 확인 → 구현 확인 → 통과.
- [ ] **Step 3:** 전체 확인: `npm run typecheck`, `npm run lint`, `npm run check:english-comments`, `npm run check:theme-colors`, `npx prettier --check <바뀐 파일>`, `cd apps/shell && npx vitest run`(Windows 기존 실패는 main과 이름으로 비교), `cd packages/ai-provider && npx vitest run`.
- [ ] **Step 4:** 커밋 `chore(securekey): drop the server parts; decision 0099; first-run e2e`.

### Task 9: 사람 시험 준비 (11/18, 혁준 + Claude)

**Files:** 없음(설치 파일만)

- [ ] **Step 1:** `__HANPAN_REQUIRE_KEY__`를 켠 Windows 설치 파일을 CI로 만든다(`windows-build.yml`, 릴리스 태그 없이 아티팩트만).
- [ ] **Step 2:** 혁준 PC에서 확인 목록: 설치 사용권 → 첫 실행 동의 → USB에 만들기 → 빼면 잠김 → 다시 꽂기 → 예비 USB → 설정에서 새로 만들기 → 예전 USB를 꽂으면 날짜 알림 → PC로 옮기기 → 0.19.5에서 업데이트한 프로필의 API 키가 그대로 쓰이는지.
- [ ] **Step 3:** 나온 문제는 고치고 Task 8 Step 3을 다시 돈다.
