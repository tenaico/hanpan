# 한판 보안키 (C) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **11/6 개정:** PR #2 끝(`9d776ab7`, AI 포토·AI 일러스트 탭과 완전 격리)을 기준으로 고쳤다. 바뀐 것: 가지, 결정 번호(0094), 줄 번호, 저장 함수의 비동기, 잠금 오류의 모양, AI 포토·AI 일러스트 도우미, 일정, 코드 서명 보류.

**Goal:** 11/20 Windows 정식판은 tenai.kr에서 받은 보안키가 있어야 켜진다. 14일 유예 뒤부터다. USB를 뽑으면 잠기고, AI 키는 두 겹으로 잠긴다. Mac과 Linux의 동작은 그대로다.

**Architecture:**

- **모듈 위치:** `apps/shell/src/main/securekey/`. Electron에 묶이지 않는 순수 로직(형식·서명·기기·판정)과 Electron 연결(창·시작·감시)을 다른 파일로 나눈다.
- **시작은 두 단계다.**
  - 창 없는 "키 열기": `setAiSecretCodec` 바로 다음에 둔다. 등록 정보를 찾아 서명과 기기를 확인하고, 통과하면 vault 키를 v2 코덱에 넣는다. `--reveal-ai-secrets` 실행도 이 단계만 거친다.
  - 화면 단계: 단일 실행 잠금 다음, 첫 창을 띄우기 전에 둔다. 판정에 따라 등록 창이나 잠금 창을 띄우거나 그냥 통과한다.
- **실행 중:** 2초마다 등록된 `activation.json`을 `statSync`해 볼륨 번호(`dev`)를 비교한다. 빠지면 AI를 잠그고, 보이는 창마다 잠금 덮개 창을 띄운다. 탭이 셸 페이지 위에 그려지므로 셸 페이지 안의 덮개로는 가릴 수 없다.
- **AI 차단:** 한곳에 모이는 길이 없다. 그래서 `@genoffice/ai-provider`에 프로세스 전체 잠금(`setAiLocked`)을 두고, 네 지점(`streamForProvider`, `chatForProvider`, `aiFetch`, `spawnSubscriptionProgram`)과 MCP·제어 채널에서 거절한다. 잠글 때 진행 중인 요청은 끊는다.
  - AI 포토·AI 일러스트 탭의 AI 도우미도 문서 편집기와 같은 `ai:stream`과 구독 창구를 쓴다. 둘 다 docs-main이 앱 전체에 하나만 등록한다. 그래서 같은 지점에서 막힌다.
  - 웹판 틀에는 다리가 없어서(완전 격리) 따로 막을 곳이 없다.
- **서버(D):** 가짜 서버로 대신한다. 실제 주소와 공개키는 D가 준비되면 빌드 값으로 넣는다.

**Tech Stack:** Node `crypto`(Ed25519 확인, AES-256-GCM), Electron `safeStorage`·`net.fetch`·`dialog`, PowerShell(CIM)과 `reg.exe`(전체 경로 실행), vitest

**Spec:** `docs/superpowers/specs/2026-11-04-hanpan-vn-securitykey-design.md` (7장 C 전부, 2장 비목표·반목표, 8장, 9장). 앞선 계획: `docs/superpowers/plans/2026-11-05-hanpan-vi-demo.md`. AI 포토·AI 일러스트와 겹치는 곳: `docs/tracking/decisions/0093-hanpan-graphics-web-tabs.md`

## Global Constraints

- 시연판 계획의 Global Constraints를 따른다(커밋 글과 작성자 주소, 영어 코드·주석, 테스트 위치, 합치기 전 검사 10개, 의존성 금지, 내려받기 확인). **가지만 다르다.**
  - 가지 `feat/security-key`에서 일한다. PR #2 끝(`9d776ab7`)에서 시작했고, 작업 폴더는 `C:\Users\ten\Desktop\hanpan\.claude\worktrees\security-key`다.
  - PR #2가 `main`에 합쳐지면 `git rebase --onto origin/main 9d776ab7 feat/security-key`로 `main` 위로 옮긴다. 병합 방식(merge·squash)과 관계없이 이 명령이 맞다.
  - push와 `main` 병합은 사용자가 정한다.
- **Windows 전용:** `process.platform !== 'win32'`이면 보안키 코드 전체를 건너뛴다. Mac·Linux는 지금 동작 그대로다(스펙 2장, 사용자 결정).
- **빌드 값:** `electron.vite.config.ts`의 `main.define`으로 넣는다. 읽을 때는 `declare const`와 `typeof` 확인을 쓴다(`apps/shell/src/main/drive/drive-ipc.ts:38-46` 모양, define은 `electron.vite.config.ts` 24행). 개발 모드는 환경변수로, GitHub 빌드는 저장소 변수(Task 13)로 값을 준다. 이 계획에는 Rust가 필요 없다. 설치판은 시연판처럼 GitHub Actions에서 굽는다. Rust는 11/5에 hanpan-graphics 빌드용으로 이 PC에 설치됐지만, 한판 설치판을 이 PC에서 굽지는 않는다.

  | 환경변수                   | define                         | 뜻                                                  |
  | -------------------------- | ------------------------------ | --------------------------------------------------- |
  | `HANPAN_REQUIRE_KEY`       | `__HANPAN_REQUIRE_KEY__`       | `'1'`이면 보안키 확인을 켬                          |
  | `HANPAN_KEY_REQUIRED_FROM` | `__HANPAN_KEY_REQUIRED_FROM__` | `YYYY-MM-DD`. 이 날부터 보안키 필요(유예 마감)      |
  | `HANPAN_KEY_SERVER`        | `__HANPAN_KEY_SERVER__`        | 서버 주소. 끝에 `/` 없음                            |
  | `HANPAN_KEY_PUBKEYS`       | `__HANPAN_KEY_PUBKEYS__`       | `{"<kid>":"<base64 32바이트 Ed25519 공개키>"}` JSON |

- **비밀키:** 서명용 비밀키는 저장소에 넣지 않는다.
  - 테스트는 키 쌍을 메모리에서 만든다.
  - 가짜 서버는 저장소 밖(`%TEMP%`)에 둔다.
- **시스템 프로그램:** PowerShell과 `reg.exe`는 `windowsSystemTool(env, …)`(`@genoffice/ai-provider/subscription`)로 찾은 전체 경로로 실행한다.
  - 작업 폴더는 시스템 폴더다. 스크립트 글은 상수이고 사용자 입력을 넣지 않는다. 15초 제한, 출력 1MB 제한.
  - 모양은 `packages/ai-provider/src/subscription/leftovers.ts:276-304`를 따른다(`docs/security.md` "프로그램 실행").
- **개인정보(스펙 7-8):** 기기 번호는 SHA-256 해시로만 내보낸다. 등록 창에는 안내 한 줄을 둔다. PRIVACY.md·README·소개 페이지 문구는 대표님이 승인한 글이 있을 때만 바꾼다(Task 13).
- **반목표:**
  - 잠금 때문에 창이나 문서가 닫히지 않는다.
  - AI가 잠긴 동안에는 `ai-settings.json`에 쓰지 않는다. 키가 빈 값으로 덮이거나 평문으로 남지 않게 하기 위해서다.
  - 화면 문구에 "복제 불가"·"해킹 불가" 같은 과장을 쓰지 않는다.
- **구독 연동 규칙:** `docs/standards.md` "구독 연동에서 어기면 안 되는 것"을 그대로 지킨다.
- **결정 기록:** 0094부터 쓴다. 0093은 AI 포토·AI 일러스트 탭이 썼다.
- **줄 번호:** 이 계획의 줄 번호는 `9d776ab7` 기준이다. 어긋나면 함께 적은 함수 이름이나 문자열로 찾는다.
- **코드 서명:** 보류됐다(11/6 사용자). 이 계획의 어떤 단계도 서명에 기대지 않는다. 11/20판은 서명 없이 나간다.

## Review Focus

1. **AI 답이 문서로 흘러드는 중에 USB를 뽑음:** 흐름이 멈추고, 이미 쓴 내용은 남고, 앱이 죽지 않는다. 다시 꽂으면 AI를 다시 쓸 수 있다. → Task 10 `locking aborts running calls and unlocking lets new ones start`
2. **AI 포토·AI 일러스트에서 AI 도우미가 명령을 실행하는 중에 USB를 뽑음:** 도우미가 멈추고, 앱 틀의 입력 잠금이 풀린다. 이미 바뀐 것은 [되돌리기] 한 번으로 돌릴 수 있고, 탭과 문서는 그대로다. → Task 10 `a run ended by the security key lock unlocks the app frame and offers its undo`
3. **AI 설정 화면에서 저장하는 순간 USB가 빠지거나, USB 없이 v2 키가 든 채로 켬:** 키가 빈 값이나 평문으로 덮이지 않는다. 시작할 때 도는 내 PC AI 찾기(`adoptLocalAi`)도 마찬가지다. → Task 11 `refuses to write ai-settings.json while locked`, Task 8 `adoptLocalAi runs after the gate`
4. **등록·잠금 창이 떠 있는 동안 .hwp를 더블클릭:** 두 번째 확인 창이 뜨지 않는다. 확인을 통과한 뒤 그 파일이 열린다. → Task 8 `a second launch during the gate queues its files`
5. **고유번호 없는 저가 USB와 다른 USB를 함께 꽂음:** 등록한 USB를 볼륨 번호로 찾고, 다른 USB는 판정에 영향을 주지 않는다. → Task 3 `picks the registered stick among two`

## 이번 계획에서 하지 않는 것 (스펙 2장 비목표)

- tenai.kr 서버, 회원 페이지, 소개 페이지 이전과 문구(D, 소개 페이지 수정 작업)
- 코드 서명(11/6 보류)
- 터미널 명령 `ieumoffice`와 `--headless-export`의 보안키 확인. 다만 v2 키는 vault 없이는 풀리지 않으므로, `--reveal-ai-secrets`는 보안키가 열려 있을 때만 값을 돌려준다.
- 회사 AI 제공, Mac·Linux 보안키, FIDO2

---

### Task 1: 키 형식과 서명 확인 (11/9)

**Files:**

- Create: `apps/shell/src/main/securekey/format.ts`
- Create(테스트 도우미): `apps/shell/tests/securekey/test-signer.ts`
- Test: `apps/shell/tests/securekey/format.test.ts`

**Interfaces:**

- Produces(`format.ts`)
  - 형식

    ```ts
    interface KeyPayload {
      v: 1
      kid: string
      memberId: string
      keyId: string
      issuedAt: string
    }
    interface ActivationPayload {
      v: 1
      keyId: string
      memberId: string
      deviceType: 'usb' | 'pc'
      deviceId: string
      activatedAt: string
      pcConsentAt?: string
    }
    interface StatusPayload {
      v: 1
      keyId: string
      status: 'active' | 'revoked'
      serverTime: string
    }
    interface Signed<T> {
      payload: T
      kid: string
      sig: string
    }
    type PublicKeys = Readonly<Record<string, string>>
    ```

    - `deviceId`는 원래 번호의 SHA-256 hex다.
    - `sig`는 `canonicalJson(payload)`의 UTF-8 바이트에 대한 Ed25519 서명을 base64로 쓴 것이다.
    - `PublicKeys`는 kid → base64 32바이트 공개키다.

  - 함수
    - `canonicalJson(value: unknown): string`: 모든 깊이에서 키를 정렬하고 공백 없이 쓴다.
    - `verifySigned<T>(doc: unknown, keys: PublicKeys, isPayload: (p: unknown) => p is T): T | null`
    - `parsePublicKeys(raw: string): PublicKeys`: 잘못된 값이면 `{}`
    - `isKeyPayload`, `isActivationPayload`, `isStatusPayload`(형 검사)
  - 디스크와 서버 응답의 모양: `hanpan.key`는 `Signed<KeyPayload>`, `activation.json`은 `Signed<ActivationPayload>`, 상태 응답은 `Signed<StatusPayload>`다. 이것이 D와의 약속이다(Task 12에서 `docs/contracts.md`에 적는다).
- Produces(`test-signer.ts`): `makeTestSigner(kid = 'test1'): { keys: PublicKeys; sign<T>(payload: T): Signed<T> }`. `generateKeyPairSync('ed25519')`를 쓰고, 공개키는 spki DER의 마지막 32바이트다.

- [ ] **Step 0: 작업 폴더 준비** (처음 한 번)
  - 작업 폴더에서 `npm ci --prefer-offline`을 돌린다. 패키지를 받는 일이므로 돌리기 전에 사용자에게 알린다(시연판 계획 "내려받기").
  - 기준선: 작업 공간마다 `npm test -w <이름>`을 한 번 돌리고, 실패한 테스트 이름을 `.superpowers/sdd/2026-11-05-hanpan-securitykey/baseline.md`에 적는다.
  - 이 계획에서 "기준선 밖의 실패 없음"은 이 목록과 비교한 결과다.

- [ ] **Step 1: 실패하는 테스트**

```ts
const s = makeTestSigner()
const key: KeyPayload = {
  v: 1,
  kid: 'test1',
  memberId: 'm1',
  keyId: 'k1',
  issuedAt: '2026-11-20T00:00:00Z',
}
it('verifies a payload signed with a known kid', () =>
  expect(verifySigned(s.sign(key), s.keys, isKeyPayload)).toEqual(key))
it('rejects one changed character', () => {
  const doc = s.sign(key)
  expect(
    verifySigned({ ...doc, payload: { ...doc.payload, memberId: 'm2' } }, s.keys, isKeyPayload),
  ).toBeNull()
})
it('rejects an unknown kid', () =>
  expect(verifySigned(s.sign(key), makeTestSigner('other').keys, isKeyPayload)).toBeNull())
it('rejects a payload of the wrong shape', () =>
  expect(verifySigned(s.sign({ v: 1, kid: 'test1' }), s.keys, isKeyPayload)).toBeNull())
it('sorts keys at every depth', () =>
  expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}'))
it('reads the build value of public keys', () => {
  expect(parsePublicKeys('{"k1":"QUJD"}')).toEqual({ k1: 'QUJD' })
  expect(parsePublicKeys('not json')).toEqual({})
})
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/format.test.ts` → FAIL
- [ ] **Step 3:** `format.ts`를 만든다. 공개키는 `createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' })`로 만들고, `verify(null, bytes, publicKey, signature)`로 확인한다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): security key file format and Ed25519 check`

### Task 2: 기기 식별 (11/9)

**Files:**

- Create: `apps/shell/src/main/securekey/devices.ts`
- Test: `apps/shell/tests/securekey/devices.test.ts`

**Interfaces:**

- Produces
  - `interface UsbVolume { letter: string; diskSerial: string; volumeSerial: string }`
    - `letter`는 `'E'` 같은 드라이브 문자다.
    - `diskSerial`은 앞뒤 공백을 지운 값이고, 없으면 `''`이다.
    - `volumeSerial`은 8자리 hex다.
  - `USB_VOLUMES_SCRIPT: string`: 상수 PowerShell 글이다. 버스가 USB인 디스크(`Get-Disk | Where-Object BusType -eq 'USB'`)의 문자 있는 파티션마다 `{ letter, diskSerial }`을 `ConvertTo-Json -Compress`로 낸다. 드라이브 종류가 아니라 연결 방식으로 고르므로 외장 SSD도 USB로 잡힌다(스펙 7-3).
  - `parseUsbVolumes(json: string, volumeSerialOf: (root: string) => string | null): UsbVolume[]`
    - 객체 하나는 배열 하나로 다룬다.
    - 빈 글이나 잘못된 JSON은 `[]`이다.
    - 볼륨 번호를 읽지 못한 항목은 뺀다.
  - `volumeSerialOf(root: string): string | null`: `statSync(root).dev`를 8자리 hex로 바꾼다. Windows에서 `dev`는 볼륨 일련번호다.
  - `usbDeviceId(v: UsbVolume): string`: `v.diskSerial || \`vol:${v.volumeSerial}\`` (스펙 7-2: 고유번호가 없으면 볼륨 번호)
  - `deviceIdHash(rawId: string): string`: `sha256('hanpan-device:' + rawId)`의 hex
  - `parseMachineGuid(regOutput: string): string | null`
  - `interface DeviceProbe { listUsbVolumes(): Promise<UsbVolume[]>; machineGuid(): Promise<string | null> }`
  - `windowsDeviceProbe(env: NodeJS.ProcessEnv, run?: (file: string, args: string[], opts: { cwd: string; timeout: number; maxBuffer: number }) => Promise<string>): DeviceProbe`
    - PowerShell 인자: `['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', USB_VOLUMES_SCRIPT]`
    - `reg.exe` 인자: `['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']`

- [ ] **Step 1: 실패하는 테스트**

```ts
it('reads one USB volume from a single JSON object', () =>
  expect(parseUsbVolumes('{"letter":"E","diskSerial":" AA11 "}', () => '1a2b3c4d')).toEqual([
    { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' },
  ]))
it('reads several volumes and drops unreadable ones', () => {}) // array of 2, volumeSerialOf null for one → 1
it('reads nothing from empty or broken output', () => {}) // '' and '{' → []
it('falls back to the volume number when the stick has no serial', () =>
  expect(usbDeviceId({ letter: 'E', diskSerial: '', volumeSerial: '1a2b3c4d' })).toBe(
    'vol:1a2b3c4d',
  ))
it('hashes device numbers', () => {
  expect(deviceIdHash('AA11')).toMatch(/^[0-9a-f]{64}$/)
  expect(deviceIdHash('AA11')).not.toBe(deviceIdHash('AA12'))
})
it('reads MachineGuid from reg output', () =>
  expect(
    parseMachineGuid(
      '\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    3f1c2a9e-0000-4000-8000-1234567890ab\r\n',
    ),
  ).toBe('3f1c2a9e-0000-4000-8000-1234567890ab'))
it('runs PowerShell by full path from the system folder with the constant script', async () => {
  // fake run records calls: file ends with \System32\WindowsPowerShell\v1.0\powershell.exe,
  // cwd is the system folder, args end with USB_VOLUMES_SCRIPT, timeout 15000
})
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/devices.test.ts` → FAIL
- [ ] **Step 3:** 만든다. 실행은 `execFile`을 쓰고, 경로·폴더·제한은 Global Constraints대로 한다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 손 확인** (USB 2개)
  - `node -e "console.log(require('fs').statSync('E:\\\\').dev.toString(16))"`의 결과가 `cmd /c vol E:`의 일련번호(하이픈 빼고)와 같은지 본다.
  - 다르면 멈추고 사용자에게 알린다. 그때는 볼륨 번호를 PowerShell `Get-Volume`의 `UniqueId`로 바꾼다.
- [ ] **Step 6: 커밋** `feat(hanpan): identify USB sticks and the PC for the security key`

### Task 3: 등록 정보 보관과 찾기 (11/9)

**Files:**

- Create: `apps/shell/src/main/securekey/store.ts`
- Test: `apps/shell/tests/securekey/store.test.ts`

**Interfaces:**

- Consumes: Task 1의 형식과 `verifySigned`. Task 2의 `DeviceProbe`, `UsbVolume`, `usbDeviceId`, `deviceIdHash`.
- Produces
  - 상수: `KEY_FILES = { key: 'hanpan.key', activation: 'activation.json', vault: 'vault.key' } as const`, `USB_KEY_DIR = 'Hanpan'`
  - `pcKeyDir(userData: string): string`: `join(userData, 'securekey')`
  - `usbKeyDir(letter: string): string`: `` `${letter}:\\Hanpan` ``
  - `interface Registration { where: 'usb' | 'pc'; dir: string; key: KeyPayload; activation: ActivationPayload; vault: Buffer; volumeSerial?: string }`
  - `type FindResult = { kind: 'none' } | { kind: 'found'; registration: Registration } | { kind: 'other-device'; where: 'usb' | 'pc' } | { kind: 'damaged' }`
  - `findRegistration(opts: { userData: string; probe: DeviceProbe; keys: PublicKeys }): Promise<FindResult>`
    - 먼저 USB 볼륨을 모두 보고, 그다음 PC 폴더를 본다.
    - 세 파일이 모두 있고, 두 서명이 맞고, `keyId`와 `memberId`가 같고, 기기 해시가 맞으면 `found`다.
    - 기기만 다르면 `other-device`다.
    - 파일이 깨졌거나 서명이 틀렸거나 `vault.key`가 32바이트가 아니면 `damaged`다.
    - 결과가 섞이면 `found`를 먼저 고르고, 다음은 `damaged`, 그다음은 `other-device`다.
  - `writeRegistration(dir: string, files: { key: Signed<KeyPayload>; activation: Signed<ActivationPayload>; vault: Buffer }): Promise<void>`: 폴더를 만들고 파일마다 `atomicWriteFile`(`apps/shell/src/main/atomic-write.ts:16`)로 쓴다. 이 도우미가 비동기라 `writeRegistration`도 비동기다.
  - `newVaultKey(): Buffer`: `randomBytes(32)`

- [ ] **Step 1: 실패하는 테스트** (임시 폴더, 가짜 probe, Task 1의 `makeTestSigner`)

```ts
it('finds a USB registration whose device matches', async () => {}) // kind 'found', where 'usb'
it('picks the registered stick among two', async () => {}) // E: has no Hanpan folder, F: has it → found on F
it('reports other-device for files copied to another stick', async () => {}) // deviceId of E: ≠ activation → other-device
it('falls back to the PC folder', async () => {}) // no USB, PC folder matches MachineGuid → where 'pc'
it('reports damaged files', async () => {}) // activation.json not JSON / wrong signature / 31-byte vault → damaged
it('finds nothing anywhere', async () => expect((await find()).kind).toBe('none'))
it('round-trips what it writes', async () => {}) // await writeRegistration, then findRegistration → same payloads and vault
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/store.test.ts` → FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): store and find the security key registration`

### Task 4: 폐기 확인과 30일 규칙 (11/10)

**Files:**

- Create: `apps/shell/src/main/securekey/status.ts`
- Test: `apps/shell/tests/securekey/status.test.ts`

**Interfaces:**

- Consumes: Task 1의 `StatusPayload`, `Signed`, `verifySigned`, `isStatusPayload`
- Produces
  - 상수: `STATUS_MAX_AGE_MS = 30 * 24 * 3600_000`, `STATUS_EVERY_MS = 24 * 3600_000`, `CLOCK_SKEW_MS = 5 * 60_000`
  - `interface SecureKeyState { keyId: string; where: 'usb' | 'pc'; status?: Signed<StatusPayload>; checkedAt?: string }`: PC 쪽 기록이다. 등록한 곳과 마지막 서명 응답을 담는다.
  - `statePath(userData: string): string`: `join(userData, 'securekey-state.json')`
  - `readState(path: string): SecureKeyState | null`, `writeState(path: string, state: SecureKeyState): Promise<void>`(`atomicWriteFile`)
  - `type StatusVerdict = { ok: true } | { ok: false; reason: 'revoked' | 'stale' | 'clock' }`
  - `judgeStatus(input: { now: Date; activatedAt: string; last: StatusPayload | null }): StatusVerdict`
    - 믿는 시각은 `max(activatedAt, last?.serverTime)`이다.
    - `last.status === 'revoked'`이면 `revoked`
    - `now`가 믿는 시각보다 `CLOCK_SKEW_MS` 넘게 이르면 `clock`
    - 믿는 시각에서 `STATUS_MAX_AGE_MS` 넘게 지났으면 `stale`
  - `fetchStatus(opts: { server: string; keyId: string; keys: PublicKeys; fetch: typeof fetch; timeoutMs?: number }): Promise<Signed<StatusPayload> | null>`
    - `GET ${server}/keys/status?keyId=<encodeURIComponent>`, 기본 제한 10초(`AbortSignal.timeout`)
    - 서명이 맞고 `keyId`가 같을 때만 돌려준다. 실패는 모두 `null`이다.
  - `statusDue(state: SecureKeyState | null, now: Date): boolean`: 기록이 없거나 `STATUS_EVERY_MS`가 지났으면 참

- [ ] **Step 1: 실패하는 테스트**

```ts
const at = (iso: string) => new Date(iso)
const last = (serverTime: string, status: 'active' | 'revoked' = 'active'): StatusPayload => ({
  v: 1,
  keyId: 'k1',
  status,
  serverTime,
})
it('is fine 29 days after the last server time', () =>
  expect(
    judgeStatus({
      now: at('2026-12-30T00:00:00Z'),
      activatedAt: '2026-11-20T00:00:00Z',
      last: last('2026-12-01T00:00:00Z'),
    }),
  ).toEqual({ ok: true }))
it('is stale after 31 days', () =>
  expect(
    judgeStatus({
      now: at('2027-01-01T00:00:00Z'),
      activatedAt: '2026-11-20T00:00:00Z',
      last: last('2026-12-01T00:00:00Z'),
    }),
  ).toEqual({ ok: false, reason: 'stale' }))
it('counts from activation when no status was seen yet', () => {}) // activatedAt + 31 days → stale
it('a revoked key is locked', () => {}) // last status 'revoked' → reason 'revoked'
it('a clock set back before the last server time fails', () =>
  expect(
    judgeStatus({
      now: at('2026-11-30T23:00:00Z'),
      activatedAt: '2026-11-20T00:00:00Z',
      last: last('2026-12-01T00:00:00Z'),
    }),
  ).toEqual({ ok: false, reason: 'clock' }))
it('allows a few minutes of clock skew', () => {}) // now = serverTime − 2 min → ok
it('accepts only a signed answer for the same key', async () => {}) // tampered → null, other keyId → null, network error → null
it('asks once a day', () => {}) // checkedAt 23 h ago → false, 25 h ago → true, no state → true
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/status.test.ts` → FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): revocation check with signed server time and a 30-day limit`

### Task 5: 시작 판정 (11/10)

**Files:**

- Create: `apps/shell/src/main/securekey/gate.ts`
- Test: `apps/shell/tests/securekey/gate.test.ts`

**Interfaces:**

- Consumes: Task 3의 `FindResult`, `Registration`. Task 4의 `SecureKeyState`, `StatusVerdict`.
- Produces
  - `interface GateConfig { platform: NodeJS.Platform; requireKey: boolean; requiredFrom: string | null; server: string; keys: PublicKeys }`
  - `readGateConfig(): GateConfig`: define 네 개를 읽는다.
  - `KEY_PAGE_URL = 'https://tenai.kr'`: 보안키를 받는 곳이다. 경로는 D가 정하면 바꾼다.
  - `inGrace(requiredFrom: string | null, now: Date): boolean`: `requiredFrom`이 있고 현지 날짜가 그보다 앞이면 참
  - `type LockReason = 'usb-missing' | 'other-device' | 'revoked' | 'stale' | 'clock' | 'damaged'`
  - `type GateDecision = { kind: 'skip' } | { kind: 'open'; registration: Registration } | { kind: 'register'; optional: boolean; until: string | null } | { kind: 'locked'; reason: LockReason }`
  - `decideGate(input: { config: GateConfig; now: Date; found: FindResult; state: SecureKeyState | null; status: StatusVerdict | null }): GateDecision`. 규칙은 위에서부터 차례로 본다.
    1. Windows가 아니거나 `requireKey`가 거짓이면 `skip`
    2. `found.kind === 'found'`일 때
       - `status`가 실패면 `locked`(그 이유)
       - 아니면 `open`
    3. `other-device`면 `locked 'other-device'`, `damaged`면 `locked 'damaged'`
    4. `none`이면서 `state?.where === 'usb'`면 `locked 'usb-missing'`. 등록했던 USB가 빠진 경우다.
    5. 그 밖의 `none`이면 `register`. `optional`은 `inGrace(...)`이고, `until`은 `requiredFrom`이다.
    - 유예는 등록 정보가 전혀 없을 때만 적용한다(스펙 7-9). 등록한 사람의 USB가 빠지면 유예와 관계없이 잠근다.

- [ ] **Step 1: 실패하는 테스트**: 위 규칙을 표 하나로 시험한다(`it.each`). 경계값도 넣는다.

```ts
it('is in grace the day before the date and not on it', () => {
  expect(inGrace('2026-12-04', new Date(2026, 11, 3, 23, 59))).toBe(true)
  expect(inGrace('2026-12-04', new Date(2026, 11, 4, 0, 0))).toBe(false)
  expect(inGrace(null, new Date())).toBe(false)
})
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/gate.test.ts` → FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): decide the security key gate at startup`

### Task 6: 등록 흐름 (11/10)

**Files:**

- Create: `apps/shell/src/main/securekey/register.ts`
- Test: `apps/shell/tests/securekey/register.test.ts`

**Interfaces:**

- Consumes: Task 1~4
- Produces
  - `activateKey(opts: { server: string; fetch: typeof fetch; key: Signed<KeyPayload>; deviceType: 'usb' | 'pc'; deviceIdHash: string; pcConsentAt?: string; keys: PublicKeys }): Promise<{ ok: true; activation: Signed<ActivationPayload> } | { ok: false; error: 'limit' | 'used' | 'refused' | 'network' | 'bad-answer' }>`
    - `POST ${server}/keys/activate`, 본문 `{ key, deviceType, deviceId: deviceIdHash, pcConsentAt? }`, 제한 15초
    - 상태 코드 409는 `used`(이미 다른 기기에 등록됨), 429는 `limit`(3개 초과), 그 밖의 4xx·5xx는 `refused`
    - 받은 활성화 정보는 서명과 함께 `keyId`·`memberId`·`deviceId`가 보낸 값과 같은지 확인한다. 다르면 `bad-answer`다.
  - `registerKey(opts: { userData: string; keyFile: string; target: { where: 'usb'; letter: string } | { where: 'pc'; consentAt: string }; probe: DeviceProbe; config: GateConfig; fetch: typeof fetch }): Promise<{ ok: true; registration: Registration } | { ok: false; error: 'bad-key' | 'no-usb' | 'limit' | 'used' | 'refused' | 'network' | 'bad-answer' }>`. 순서는 이렇다.
    1. 키 파일의 서명을 확인한다.
    2. 대상 기기의 번호를 해시한다.
    3. `activateKey`를 부른다.
    4. `newVaultKey`로 vault 키를 만든다.
    5. `await writeRegistration(...)`으로 대상 위치에 쓴다.
    6. `await writeState(...)`로 `{ keyId, where }`를 남긴다.
  - PC를 고를 때는 `consentAt`이 있어야 한다. 화면이 "이해했습니다"를 받은 시각이다.

- [ ] **Step 1: 실패하는 테스트** (가짜 fetch는 Task 1 서명기로 응답한다. 임시 폴더, 가짜 probe를 쓴다)

```ts
it('registers on a USB stick and writes the three files there', async () => {}) // E:\Hanpan\{hanpan.key,activation.json,vault.key}, state { keyId, where: 'usb' }
it('registers on the PC with the consent time', async () => {}) // pcConsentAt sent and stored
it('sends only the hashed device number', async () => {}) // request body deviceId === deviceIdHash(raw), raw never in body
it('reports the 3-key limit', async () => {}) // 429 → { ok: false, error: 'limit' }, no files written
it('refuses an answer for another device', async () => {}) // activation.deviceId differs → bad-answer
it('rejects a key file that is not signed by a known kid', async () => {}) // bad-key, no request sent
it('needs the internet', async () => {}) // fetch throws → network
```

- [ ] **Step 2:** Run `npm test -w @genoffice/shell -- tests/securekey/register.test.ts` → FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** 같은 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): register a security key on a USB stick or the PC`

### Task 7: 보안키 창 (등록·잠금 화면) (11/11)

**Files:**

- Create
  - `apps/shell/src/shared/securekey-api.ts`
  - `apps/shell/src/preload/securekey.ts`(`electron`과 `../shared/securekey-api`만 가져온다)
  - `apps/shell/src/renderer/securekey.html`(CSP 메타 포함, `pdf-password.html` 모양)
  - `apps/shell/src/renderer/src/securekey.ts`(React 없는 TS, `pdf-password.ts` 모양)
  - `apps/shell/src/main/securekey/window.ts`
  - `apps/shell/src/main/securekey/strings.ts`, `apps/shell/src/main/securekey/strings.json`
- Modify: `apps/shell/electron.vite.config.ts`(preload `securekey`, renderer `securekey` 입력)
- Test: `apps/shell/tests/securekey/window.test.ts`, `apps/shell/tests/securekey/strings.test.ts`

**Interfaces:**

- Consumes: Task 5의 `GateDecision`, `LockReason`, `KEY_PAGE_URL`. Task 6의 `registerKey`.
- Produces
  - `SECUREKEY_CHANNELS = { getState: 'securekey:get-state', pickKeyFile: 'securekey:pick-key-file', register: 'securekey:register', later: 'securekey:later', retry: 'securekey:retry', quit: 'securekey:quit', openKeyPage: 'securekey:open-key-page', changed: 'securekey:changed' } as const`
  - `interface SecureKeyUiState { mode: 'register' | 'lock'; optional: boolean; until: string | null; reason: LockReason | null; usbLetters: string[]; keyFileName: string | null; busy: boolean; error: string | null; lang: string; strings: Record<string, string> }`. 문구는 메인이 화면 언어로 만들어 넣는다.
  - `showSecureKeyWindow(initial: SecureKeyUiState, handlers: { register(target): Promise<string | null>; retry(): Promise<SecureKeyUiState | 'passed'> }): Promise<'registered' | 'later' | 'passed' | 'quit'>`. `register`는 오류 문구를 돌려주고, 성공이면 `null`이다.
    - 창 속성: 테두리 없음, 가운데, `show: false` 다음 `ready-to-show`, `sandbox: true`. 셸 창이 아직 없으므로 부모를 두지 않는다.
    - 창을 다른 방법으로 닫으면 `quit`이다(`pdf-password-dialog.ts:94-97` 모양).
  - 문구 키(`strings.json`). JSON에는 시연판 규칙대로 11개 언어(ko·en·zh·zh-TW·ja·th·ru·ar·he·hi·vi)를 쓰고, 나머지 10개 언어 블록은 아래 도구가 영어로 채운다. 스펙이 정한 글은 그대로 쓴다.
    - `skPcWarning`: "이 PC가 해킹되면 AI 키가 함께 유출될 수 있습니다. USB 보관을 권장합니다."
    - `skPrivacy`: "등록하면 보안키 번호와 마지막 사용일이 tenai.kr에 기록됩니다"
    - `skLockStale`: "인터넷에 연결해 보안키를 확인해 주세요"
    - `skLater`: "나중에 하기 ({date}까지)"
    - `skGraceBanner`: "{date}부터 보안키가 있어야 한판이 켜집니다. tenai.kr에서 가입하고 보안키를 등록하세요."
    - 나머지 화면 글은 상태마다 하나씩 구현자가 쓴다: 제목, 키 고르기, USB·PC 선택, 동의, 등록, 다시 확인, 끝내기, 잠금 이유 여섯 가지, 등록 오류 일곱 가지.
  - `strings.ts`: 21개 언어 블록을 `  ko: {` 꼴로 두고, `createI18n`으로 감싼다(`index.ts:1011`의 `tMain` 모양). JSON 값은 `tools/hanpan-add-block-strings.mjs <strings.ts> skTitle <strings.json>`로 넣는다.

화면 흐름(스펙 7-1):

- 등록 모드는 세 단계다.
  1. [보안키 파일 고르기](메인의 `dialog.showOpenDialog`, 필터 `.key`)
  2. 보관 위치: USB 목록 또는 "이 PC". 이 PC를 고르면 경고와 [이해했습니다] 체크가 있어야 [등록]이 켜진다.
  3. [등록]
- 등록 모드에서 늘 보이는 것: [tenai.kr에서 보안키 받기], 안내 한 줄 `skPrivacy`. 유예 중이면 [나중에 하기]도 보인다.
- 잠금 모드: 이유 글과 [다시 확인]을 보인다. 이유가 `revoked`·`damaged`·`other-device`이면 [보안키 등록]으로 등록 모드로 넘어간다.
- 끝내기: [끝내기]

- [ ] **Step 1: 실패하는 테스트**

```ts
// window.test.ts — FakeBrowserWindow as in tests/update-window.test.ts
it('loads securekey.html with its own preload', () => {}) // preload ends with preload/securekey.js, sandbox true
it('closing the window counts as quit', async () => {})
it('later is offered only while optional', async () => {}) // later channel ignored when optional false
it('shows the register error and stays open', async () => {}) // register handler returns 'limit' text → state.error, window open
```

```ts
// strings.test.ts
it('every security key string exists in all 21 languages', () => {})
it('the warning and privacy lines are the spec text in Korean', () => {}) // skPcWarning, skPrivacy, skLockStale exact
```

- [ ] **Step 2:** Run 두 테스트 → FAIL
- [ ] **Step 3:** 만든다. 화면 색은 토큰만 쓴다.
- [ ] **Step 4:** 두 테스트, `tests/quick-look-wiring.test.ts`(preload 가져오기 규칙), `npm run typecheck` → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): security key register and lock window`

### Task 8: 시작 연결 (11/11)

**Files:**

- Create: `apps/shell/src/main/securekey/runtime.ts`
- Modify
  - `apps/shell/electron.vite.config.ts`: `main.define`에 네 값
  - `apps/shell/src/main/index.ts`: 9111-9118(코덱과 reveal), 9123(`adoptLocalAi`), 8800(`second-instance`), 9180-9183(`if (!hasLock)`) 다음, 9564(`createShellWindow()`) 앞
  - `apps/shell/tests/ai-secrets.test.ts:146-156`, `apps/shell/tests/subscription-lifetime.test.ts`: 시작 순서를 글로 확인하는 테스트를 새 순서에 맞춘다
  - 홈 안내 띠: `apps/shell/src/renderer/src/Home.tsx`, `apps/shell/src/preload/index.ts`(`aiOffice.secureKeyGrace`), `apps/shell/src/shared/home-api.ts`
- Test: `apps/shell/tests/securekey/runtime.test.ts`, `apps/shell/tests/securekey/gate-wiring.test.ts`

**Interfaces:**

- Consumes: Task 2~7
- Produces
  - `createSecureKeyRuntime(deps: { config: GateConfig; userData: string; probe: DeviceProbe; fetch: typeof fetch; now(): Date; lang(): string; showWindow: typeof showSecureKeyWindow; lockAi(): void; unlockAi(): void }): SecureKeyRuntime`
  - `interface SecureKeyRuntime`
    - `openQuietly(): Promise<void>`: 창 없이 등록 정보를 찾는다.
      - `found`면 vault를 쥐고 `unlockAi`를 부른다.
      - 등록 기록(`state`)이 있는데 열지 못하면 `lockAi`를 부른다.
      - 등록 기록이 없으면 아무것도 하지 않는다. v1 키는 그대로 쓴다.
    - `runGate(): Promise<'continue' | 'quit'>`: `decideGate`에 따라 처리한다.
      - `skip`, `open`이면 그냥 진행한다.
      - `register`, `locked`이면 `showWindow`를 띄운다.
      - 상태 확인은 `statusDue`일 때 백그라운드로 한다. 응답이 `revoked`면 바로 잠근다.
    - `vault(): Buffer | null`
    - `graceUntil(): string | null`: 등록하지 않고 유예 중일 때 마감일
    - `pending(): boolean`: 확인 창이 떠 있는 동안 참
- `index.ts` 순서(탐색 결과 반영)
  1. `setAiSecretCodec(...)` 바로 뒤에 `await secureKey.openQuietly()`를 둔다. `runRevealEntry`보다 앞이다. 그래서 reveal은 USB가 있을 때만 v2를 연다.
  2. `hanpan.adoptLocalAi()`(9123)는 확인 뒤로 옮긴다. 설정을 쓰는 일이라 vault 없이 돌면 키를 빈 값으로 덮을 수 있기 때문이다.
  3. 단일 실행 잠금(9156-9183) 다음, 언어·테마(9218-9223) 다음에 `if ((await secureKey.runGate()) === 'quit') { app.quit(); return }`를 둔다. 이 자리는 `configureQuickLookWindow`(9356), `startMcpFromSettings`(9558), `createShellWindow()`(9564)보다 앞이다.
  4. `second-instance` 처리기(8800): `secureKey.pending()`이면 받은 경로를 `pendingLaunchPaths`에 더하고 확인 창에 초점만 준다.
  5. 확인 단계를 `try/catch`로 감싼다. 실패하면 `dialog.showErrorBox` 후 `app.quit()`이다. `whenReady`에는 `.catch`가 없어서, 감싸지 않으면 창 없는 프로세스가 남는다.
  6. 확인 창을 닫는 순간 `window-all-closed`가 앱을 끝내지 않도록, 셸 창을 먼저 만든 뒤 확인 창을 닫는다.
- 홈 안내 띠: `aiOffice.secureKeyGrace(): Promise<string | null>`가 마감일을 주면 홈 위에 `skGraceBanner`를 보인다(스펙 7-9).

- [ ] **Step 1: 실패하는 테스트**

```ts
// runtime.test.ts — fake probe, signer, temp userData, fake window
it('opens quietly and unlocks AI when the registered stick is there', async () => {})
it('locks AI at startup when a registration is known but the stick is missing', async () => {})
it('leaves an unregistered PC alone', async () => {}) // lockAi/unlockAi not called
it('shows the register window with later during the grace', async () => {}) // optional true, until '2026-12-04'
it('quits when the register window is closed after the grace', async () => {})
it('locks right away when the background check says revoked', async () => {})
```

```ts
// gate-wiring.test.ts — reads src/main/index.ts as text
it('opens the key quietly right after the codec and before the reveal run', () => {})
it('adoptLocalAi runs after the gate', () => {})
it('runs the gate after the single-instance lock and before any window', () => {}) // before configureQuickLookWindow, startMcpFromSettings, createShellWindow
it('a second launch during the gate queues its files', () => {}) // second-instance handler checks secureKey.pending()
```

- [ ] **Step 2:** Run 두 테스트 → FAIL
- [ ] **Step 3:** 만들고 연결한다. 고친 시작 순서에 맞춰 `ai-secrets.test.ts`와 `subscription-lifetime.test.ts`의 글 확인도 고친다.
- [ ] **Step 4:** Run 두 테스트, `npm test -w @genoffice/shell`(기준선과 비교), `npm run typecheck` → 기준선 밖의 실패 없음
- [ ] **Step 5:** 손 확인(등록 창, 유예의 [나중에 하기], 등록 성공 뒤 홈)은 가짜 서버가 생기는 Task 12 Step 5에서 함께 한다.
- [ ] **Step 6: 커밋** `feat(hanpan): run the security key gate before the first window`

### Task 9: 실행 중 감시와 잠금 덮개 (11/11)

**Files:**

- Create: `apps/shell/src/main/securekey/watch.ts`, `apps/shell/src/main/securekey/lock-overlay.ts`
- Modify: `apps/shell/src/main/securekey/runtime.ts`(감시 시작, 잠금·풀림)
- Test: `apps/shell/tests/securekey/watch.test.ts`, `apps/shell/tests/securekey/lock-overlay.test.ts`

**Interfaces:**

- Consumes: Task 2의 `volumeSerialOf`, Task 3의 `Registration`, Task 7의 창 문구와 `securekey.html`
- Produces
  - `startPresenceWatch(opts: { activationPath: string; volumeSerial: string | null; everyMs?: number; serialOf?: (root: string) => string | null; exists?: (p: string) => boolean; onChange(present: boolean): void }): () => void`
    - 기본 간격은 2000ms이고, 타이머는 `unref`한다.
    - 바뀔 때만 알린다. `crash-watch.ts:127-146`의 `startLowMemoryWatch` 모양을 따른다.
    - PC 보관(`volumeSerial === null`)은 파일이 있는지만 본다.
  - `showLockOverlays(state: SecureKeyUiState): void`, `hideLockOverlays(): void`
    - 대상: `BrowserWindow.getAllWindows()` 중 보이고 부모가 없는 창마다 덮개 하나다(셸 창, 떼어 낸 편집기 창, 디자인·에이전트 같은 도구 창).
    - 숨은 인쇄·내보내기 창과 덮개 자신은 빼고, 이미 덮개가 있는 창도 뺀다.
    - 덮개 창: `{ parent: win, modal: true, frame: false, skipTaskbar: true, resizable: false, movable: false }`, 크기는 `win.getContentBounds()`다. 부모의 `move`·`resize`를 따라간다.
    - 셸 창의 덮개만 잠금 모드 화면(이유, [다시 확인], [끝내기])을 보인다. 다른 덮개는 제목 한 줄만 보인다.
  - `runtime.ts`
    - 빠지면 `lockAi()`와 `showLockOverlays`를 부른다.
    - 돌아오면 `findRegistration`으로 다시 확인한다. 통과하면 `unlockAi()`와 `hideLockOverlays()`를 부른다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// watch.test.ts — fake timers and fake stat
it('reports a removed stick once and its return once', () => {}) // present → missing → missing → present: onChange(false), onChange(true)
it('treats another stick on the same letter as missing', () => {}) // serial changes → onChange(false)
it('watches only the file for a PC registration', () => {})
```

```ts
// lock-overlay.test.ts — FakeBrowserWindow
it('puts one overlay on every visible top-level window', () => {}) // shell + detached → 2 overlays, modal to each
it('skips hidden print windows', () => {})
it('closes every overlay on unlock and keeps the windows open', () => {}) // parents never closed
it('follows the parent when it moves', () => {})
```

- [ ] **Step 2:** Run 두 테스트 → FAIL
- [ ] **Step 3:** 만든다.
- [ ] **Step 4:** 두 테스트 → PASS
- [ ] **Step 5: 커밋** `feat(hanpan): lock every window when the security key stick is removed`

### Task 10: 잠긴 동안 AI·MCP·제어 채널 막기 (11/12)

**Files:**

- Create: `packages/ai-provider/src/ai-lock.ts`. Modify: `packages/ai-provider/src/index.ts`(export)
- Modify(지점마다 막기)
  - `packages/ai-provider/src/stream.ts:32`(`streamForProvider`), `packages/ai-provider/src/chat.ts:13`(`chatForProvider`)
  - `packages/ai-provider/src/fetch.ts:114`(`aiFetch`)
  - `packages/ai-provider/src/custom-models.ts:64`, `packages/ai-provider/src/local-models.ts:175`: 전역 `fetch`를 쓰는 곳
  - `packages/ai-provider/src/subscription/process.ts:312`(`spawnSubscriptionProgram`)
  - `apps/shell/src/main/file-index/rerank.ts:103`(`SearchReranker.rerank`)
- Modify: `apps/docs/src/main/docs-main.ts`(`abortAllAiStreams()` export, `activeAiStreams` 3935행)
- Modify: `apps/shell/src/main/mcp/mcp-server.ts`(`McpServerOptions` 31-54행, `route()` 150행, 도구 감싸기 `registerTool` 114행), `apps/shell/src/main/control-server.ts`(`serve()` 107행, 토큰 확인 113행 다음)
- Modify(아래 그래픽 테스트가 실패할 때만): `apps/graphics/src/renderer/ai/AiPanel.tsx`
- Modify: `apps/shell/src/main/index.ts`
  - `startMcpFromSettings`, `startAgentMcpServer`, `startControlServer`에 `isLocked: isAiLocked`를 넘긴다.
  - `runtime`의 `lockAi`·`unlockAi`를 만든다.
- Test: `packages/ai-provider/tests/ai-lock.test.ts`, `apps/docs/tests/abort-all-ai-streams.test.ts`, `apps/shell/tests/mcp/mcp-server.test.ts`(사례 추가), `apps/shell/tests/control-server.test.ts`(사례 추가), `apps/graphics/tests/ai-panel.test.tsx`(사례 추가)

**Interfaces:**

- Produces
  - `@genoffice/ai-provider`
    - `setAiLocked(locked: boolean): void`, `isAiLocked(): boolean`
    - `aiLockSignal(): AbortSignal`: 잠그면 끊긴다. 풀면 새 신호다.
    - `class AiLockedError extends AiRunError`(`packages/ai-provider/src/run-error.ts:14`)
      - `kind`는 기존 종류 `'not-connected'`다. `code = 'ai-locked'`, 글은 `'AI is locked until the security key is back'`이다.
      - 새 오류 종류는 만들지 않는다. 덮개가 모든 창을 가려 사람이 이 오류를 볼 일이 거의 없고, 보이더라도 21개 언어로 된 기존 "연결 안 됨" 문구가 나온다.
    - `assertAiUnlocked(): void`: 잠겨 있으면 `AiLockedError`를 던진다.
  - 각 지점이 하는 일
    - `aiFetch`: 먼저 `assertAiUnlocked()`를 부르고, 신호는 `AbortSignal.any([init.signal, aiLockSignal()])`로 묶는다.
    - `streamForProvider`: 맨 앞에서 `assertAiUnlocked()`를 부른다. 콜백에 오류 길이 없어서 던진다. docs-main은 이것을 `errorCode: 'not-connected'`인 오류 조각 하나로 렌더러에 보낸다(`aiStreamErrorChunk`).
    - `chatForProvider`: `AiLockedError`로 실패한다.
    - `spawnSubscriptionProgram`: 프로그램을 띄우지 않고 실패한다.
  - `abortAllAiStreams(): void`(docs-main)
  - `lockAi()`의 순서
    1. `setAiLocked(true)`
    2. `abortAllAiStreams()`
    3. `stopAgentSessions()`
    4. `shutdownSubscriptionChildren()`
    5. `shutdownCodexAppServers()`
    - 1·2단계는 `await` 없이 한 흐름에서 차례로 부른다.
      - 그래야 끊긴 요청의 catch가 돌 때 docs-main의 컨트롤러가 이미 끊겨 있다(`docs-main.ts` 4190-4195행).
      - 그러면 그 실행은 오류가 아니라 [중지]를 누른 것과 같은 `done`으로 끝난다.
  - `unlockAi()`는 `setAiLocked(false)`다.
  - MCP는 잠긴 동안 HTTP 423과 `{ "error": "locked" }`로 답한다. 이미 열린 세션의 도구 호출은 오류 결과를 받는다. `/health`는 그대로 답한다.
  - 제어 채널은 `{ ok: false, reason: 'app_unavailable', message: 'locked' }`로 답한다. 이유 목록은 늘리지 않는다.
  - AI 포토·AI 일러스트 도우미는 위 길로 이미 막힌다.
    - 끊긴 실행은 [중지]와 같게 끝나야 한다. 앱 틀의 입력 잠금을 풀고, 바뀐 것이 있으면 [되돌리기]를 남긴다.
    - MCP의 `open_documents`(그래픽 탭 목록)도 MCP 서버 전체 거절에 들어간다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// packages/ai-provider/tests/ai-lock.test.ts
afterEach(() => setAiLocked(false))
it('aiFetch refuses while locked', async () => {}) // rejects AiLockedError, fetch stub not called
it('locking aborts running calls and unlocking lets new ones start', async () => {
  // fetch stub waits on its signal; setAiLocked(true) → the pending aiFetch rejects (aborted)
  // setAiLocked(false) → a new aiFetch reaches the stub
})
it('does not start subscription programs while locked', async () => {}) // spawn stand-in not called
it('streamForProvider refuses while locked with the not-connected kind', async () => {}) // rejects AiLockedError, kind 'not-connected', fetch stub not called
```

```ts
// apps/docs/tests/abort-all-ai-streams.test.ts — handlers as in tests/ai-media-cancel.test.ts
it('aborts every running stream', () => {})
it('a run cut by the lock ends with done like Stop, not an error chunk', async () => {}) // stream stub waits on its signal; setAiLocked(true) then abortAllAiStreams() in one turn → { type: 'done' }, no 'error' chunk
```

```ts
// mcp-server.test.ts / control-server.test.ts
it('refuses tool calls while locked', async () => {}) // SDK client gets an error; /health still 200
it('answers app_unavailable while locked', async () => {})
```

```ts
// apps/graphics/tests/ai-panel.test.tsx — add the turn kind { cut: true }: the main ends the stream with a bare done, as abortAllAiStreams does
it('a run ended by the security key lock unlocks the app frame and offers its undo', async () => {
  // turns: [{ tools: [{ name: 'run_command', input: { id: 'shape.rect' } }] }, { cut: true }]
  // → unlock called once, onBusyChange ends with false, the undo button undoes 1 step
})
```

- [ ] **Step 2:** Run 다섯 테스트 파일 → FAIL
  - 그래픽 사례는 지금 코드로 이미 통과할 수 있다. 통과하면 이미 맞는 동작을 고정하는 테스트로 두고 ledger에 적는다. 실패하면 `AiPanel.tsx`를 고친다.
- [ ] **Step 3:** 만든다. `docs/standards.md`의 구독 규칙(가짜 연결부, 실제 `claude`·`codex`에 닿지 않기)을 지킨다.
- [ ] **Step 4:** Run `npm test -w @genoffice/ai-provider`, `npm test -w @genoffice/docs`, `npm test -w @genoffice/graphics`, 셸 테스트 두 파일 → 기준선 밖의 실패 없음
- [ ] **Step 5: 커밋** `feat(hanpan): refuse AI, MCP and control requests while the security key is locked`

### Task 11: AI 키 이중 잠금 (sealed:v2) (11/12)

**Files:**

- Modify: `packages/ai-provider/src/settings-secrets.ts`(17-34행). `isSealedSecret`이 v1과 v2를 모두 알아보게 한다.
- Create: `apps/shell/src/main/securekey/vault-codec.ts`
- Modify: `apps/shell/src/main/ai-secrets.ts`(`holdsPlainSecrets` 96행, `sealStoredAiSettings` 110행, `fileSearchHoldsPlainKeys` 160행). vault가 있으면 v1을 v2로 다시 잠근다.
- Modify: `packages/cli/src/secrets.ts`(`revealedSecretsOf`), `packages/ai-provider/src/settings-secrets.ts`(`sealedAiSecretsIn`). v2 값을 버리지 않게 한다.
- Modify(잠긴 동안 쓰기 거절)
  - `apps/docs/src/main/docs-main.ts`: `writeStoredAiSettings` 3969행, `setMeteredAccepted` 4015-4020행(봉인도 하게 고친다), `ai:set-settings` 4050행
  - `apps/docs/src/main/free-ai-ipc.ts`: 76행, 129행
  - `apps/shell/src/main/index.ts`: `HOME_CHANNELS.setFileSearchSettings` 처리기 5923-5935행, 시작 때 다시 봉인 9190-9203행. 시작 때 봉인은 이미 `try/catch` 안이라, 잠겨 있어 거절되면 조용히 건너뛴다.
- Modify: `apps/shell/src/main/index.ts`. 9111-9114의 코덱을 `vaultCodec(safeStorageCodec(...), () => secureKey.vault())`로 바꾼다.
- Test: `apps/shell/tests/securekey/vault-codec.test.ts`, `packages/ai-provider/tests/settings-secrets.test.ts`(사례 추가), `apps/shell/tests/ai-secrets.test.ts`(사례 추가), `apps/docs/tests/ai-settings-write-lock.test.ts`, `packages/cli/tests/secrets.test.ts`(사례 추가)

**Interfaces:**

- Consumes: Task 8의 `secureKey.vault()`, Task 10의 `assertAiUnlocked`
- Produces
  - `SEALED_PREFIX_V2 = 'sealed:v2:'`(settings-secrets.ts)
  - `vaultCodec(base: AiSecretCodec, vault: () => Buffer | null): AiSecretCodec`
    - `seal`
      - vault가 있으면 순서대로 처리한다.
        1. `inner = iv(12) ‖ tag(16) ‖ AES-256-GCM(vault, plain)`
        2. `base.seal(inner.toString('base64'))`의 앞머리 `sealed:v1:`을 `sealed:v2:`로 바꾼다.
      - vault가 없으면 `base.seal(plain)`이다. 등록하지 않은 PC는 지금처럼 v1로 둔다.
    - `open`
      - v1은 `base.open`으로 연다.
      - v2는 vault가 있을 때만 연다. 앞머리를 v1로 되돌려 `base.open`하고, 결과를 GCM으로 푼다.
      - 그 밖이나 실패는 `null`이다.
  - 쓰기 거절: 위 쓰기 경로마다 맨 앞에서 `assertAiUnlocked()`를 부른다.
  - reveal은 같은 코덱을 쓴다. USB가 없으면 v2 값을 열지 못하므로 돌려주지 않는다(스펙 7-5).

- [ ] **Step 1: 실패하는 테스트**

```ts
// vault-codec.test.ts — base codec = fakeStorage codec from tests/ai-secrets.test.ts
it('round-trips through v2 with the vault', () => {}) // seal → startsWith 'sealed:v2:', open → plain
it('cannot open v2 without the vault', () => {}) // vault() null → open null
it('cannot open v2 with another vault', () => {}) // GCM auth fails → null
it('still opens v1 values', () => {})
it('seals v1 when there is no vault', () => {}) // unregistered PC keeps today's format
```

```ts
// settings-secrets.test.ts
it('knows both sealed formats', () => {
  expect(isSealedSecret('sealed:v2:x')).toBe(true)
  expect(isSealedSecret('sealed:v1:x')).toBe(true)
})
```

```ts
// ai-secrets.test.ts
it('upgrades v1 values to v2 once the vault is there', () => {})
it('leaves v2 values alone', () => {})
```

```ts
// apps/docs/tests/ai-settings-write-lock.test.ts
it('refuses to write ai-settings.json while locked', () => {}) // setAiLocked(true) → throws, file bytes unchanged
it('setMeteredAccepted writes sealed values', () => {}) // no plain key on disk
```

```ts
// packages/cli/tests/secrets.test.ts
it('keeps v2 values for the reveal request', () => {})
```

- [ ] **Step 2:** Run 다섯 테스트 파일 → FAIL
- [ ] **Step 3:** 만든다. 등록 직후(Task 6 성공 뒤)에는 `sealStoredAiSettings`와 파일 검색 키 봉인을 다시 불러 v1을 v2로 바꾼다(스펙 7-5).
- [ ] **Step 4:** Run `npm test -w @genoffice/ai-provider`, `npm test -w @genoffice/docs`, `npm test -w @genoffice/cli`, `npm test -w @genoffice/shell` → 기준선 밖의 실패 없음
- [ ] **Step 5: 커밋** `feat(hanpan): seal AI keys twice with the security key's vault`

### Task 12: 가짜 서버, 문서, 손 시험 (코드 11/12, 손 시험 11/16)

**Files:**

- Create: `tools/securekey-dev-server.mjs`
- Modify
  - `docs/contracts.md`: 새 절 "보안키 파일과 서버 응답". Task 1의 형식, `canonicalJson`과 서명 규칙, 스펙 7-6의 요청 4개, 상태 코드 409·429를 적는다.
  - `docs/security.md`: "키와 기록의 보관"에 `sealed:v2`와 vault 위치를 적는다. 새 절 "보안키"를 만든다(잠금 때 막는 것, 막지 못하는 것: 스펙 7-10). 막는 것에 AI 포토·AI 일러스트 도우미를 넣는다.
- Create: `docs/tracking/decisions/0094-hanpan-security-key.md`(오프라인 서명 확인, 온라인 폐기 확인, 30일, 이중 잠금, 잠금 때 AI·MCP 차단). Modify: `index.md`
- Test: `packages/cli/tests/securekey-dev-server.test.ts`

**Interfaces:**

- Produces: `node tools/securekey-dev-server.mjs [--port 3870]`
  - 키 쌍은 `%TEMP%\hanpan-securekey-dev\`에 처음 한 번 만들어 둔다.
  - 시작하면 빌드 값 두 줄을 출력한다: `HANPAN_KEY_SERVER=http://127.0.0.1:3870`, `HANPAN_KEY_PUBKEYS={"dev1":"…"}`
  - 요청 4개(스펙 7-6)를 메모리 상태로 흉내 낸다: `POST /keys`는 회원 `dev` 키 발급, 활성 3개 초과면 429. `POST /keys/activate`는 이미 활성이면 409.
  - 손 시험용 옵션: `--revoke <keyId>`, `--server-time <ISO>`(서버 시각 고정)

- [ ] **Step 1: 실패하는 테스트**: 실제로 띄우고 Task 1~6의 함수로 부른다.

```ts
it('issues, activates and reports a key that the app accepts', async () => {}) // registerKey ok, fetchStatus active
it('refuses the fourth active key', async () => {}) // 429 → limit
it('reports a revoked key', async () => {})
```

- [ ] **Step 2~4:** FAIL → 만든다 → PASS
- [ ] **Step 5: 손 시험** (스펙 8장, 개발 모드, 시연(11/13) 뒤 사용자의 USB로 함께)
  - 가짜 서버를 띄우고, 출력된 값을 환경변수로 주어 개발 모드로 켠다: `HANPAN_REQUIRE_KEY=1 HANPAN_KEY_REQUIRED_FROM=<날짜> HANPAN_KEY_SERVER=http://127.0.0.1:3870 HANPAN_KEY_PUBKEYS='<출력된 값>' npm run dev`
  - Task 8의 손 확인(등록 창, 유예의 [나중에 하기], 등록 성공 뒤 홈)을 먼저 한다.
  - USB 2~3종에 등록한다. 고유번호 없는 저가 USB도 포함한다. 여러 개를 함께 꽂아도 되는지 본다.
  - PC 보관을 고르면 경고가 뜨고 동의가 있어야 하는지 본다.
  - 쓰는 중에 USB를 뽑는다. 저장하지 않은 문서가 그대로 있고, AI 답이 멈추고, MCP 요청이 423을 받는지 본다. 다시 꽂으면 풀리는지 본다.
  - AI 포토 탭에서 도우미가 명령을 실행하는 중에 USB를 뽑는다. 도우미가 멈추는지, 다시 꽂은 뒤 앱을 바로 만질 수 있는지, [되돌리기]가 남는지 본다.
  - `--server-time`으로 31일 뒤를 흉내 내 `stale`이 나오는지, PC 시계를 과거로 돌려 `clock`이 나오는지, `--revoke`로 다음 확인 때 바로 잠기는지 본다.
  - `HANPAN_KEY_REQUIRED_FROM`을 내일로 두면 [나중에 하기]와 홈 안내 띠가 나오는지, 오늘로 두면 등록하지 않고는 켜지지 않는지 본다.
  - USB를 뺀 채 `--reveal-ai-secrets`를 실행하면 v2 키가 나오지 않는지 본다.
  - Mac·Linux 빌드에서 보안키 코드가 돌지 않는지 본다. Windows가 아닌 플랫폼 분기는 테스트로, 실제 빌드는 CI로 확인한다.
- [ ] **Step 6: 커밋** `feat(hanpan): local security key server for development, contracts and decision`

### Task 13: 정식판 연결 (11/16~11/20, D가 준비된 뒤)

**Files:**

- Modify: `apps/shell/electron-builder.cjs`(`beforePack`)
- Modify: `.github/workflows/windows-build.yml`("Package" 단계의 `env`)
- Modify(대표님 승인 글이 있을 때만): `PRIVACY.md`, `README.md`, `README.en.md`
- Test: `apps/shell/tests/securekey-build-values.test.ts`

**Interfaces:**

- Produces: `beforePack`은 `HANPAN_REQUIRE_KEY=1`일 때 다음을 확인하고, 하나라도 어긋나면 throw한다.
  - `HANPAN_KEY_SERVER`가 `https://`로 시작한다.
  - `HANPAN_KEY_PUBKEYS`가 키 하나 이상으로 읽힌다(`parsePublicKeys`).
  - `HANPAN_KEY_REQUIRED_FROM`이 날짜다.
  - 공개키가 비면 모든 사람이 잠기기 때문이다.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('refuses a keyed build without a server, public keys or a date', () => {}) // each missing → throws
it('lets an unkeyed build through without them', () => {})
```

- [ ] **Step 2~4:** FAIL → `beforePack`에 넣는다 → PASS
- [ ] **Step 5: 문구** (스펙 7-8)
  - 대표님이 승인한 PRIVACY·README 글을 넣는다(혁준이 11/18까지 승인받음).
  - 소개 페이지(`site/index.html`)는 이 계획 밖의 "소개 페이지 수정" 작업에서 바꾼다.
  - 승인된 글이 없으면 보안키를 켠 정식판을 내지 않는다. 멈추고 사용자에게 알린다.
- [ ] **Step 6: 실제 서버로 시험**
  - D의 서버에서 회원 키를 받아 등록한다.
  - 상태 확인과 폐기를 Task 12 Step 5의 항목대로 다시 본다.
- [ ] **Step 7: 정식판** (GitHub에서, 원래 방식)
  - 빌드 값 네 개를 GitHub 저장소 변수(Settings → Secrets and variables → Actions → Variables)로 둔다: `HANPAN_REQUIRE_KEY=1`, `HANPAN_KEY_REQUIRED_FROM=<배포일+14일>`, `HANPAN_KEY_SERVER`, `HANPAN_KEY_PUBKEYS`.
    - 공개키와 주소는 비밀이 아니므로 secret이 아니라 variable이다.
    - 저장소 설정을 바꾸는 일이라 사용자가 하거나, 사용자 확인 뒤 `gh variable set`으로 한다.
  - `windows-build.yml`의 "Package" 단계 `env`에서 네 값을 `${{ vars.… }}`로 넘긴다. 값이 없으면 보안키 없는 판이 나온다. Mac·Linux 빌드에는 넘기지 않는다.
  - 가지를 `main`에 합치는 일, 버전, 릴리스는 `docs/releasing.ko.md`를 따른다. 합치기와 릴리스 공개는 사용자가 확인한 뒤에 한다.
  - 릴리스를 공개하면 기존 설치본에 업데이트 알림이 뜬다. 0.14.0에서 0.15.0으로 갈 때 사용자가 직접 확인한 그 알림이다. 7-9의 14일 유예는 이 업데이트를 받은 날부터가 아니라 빌드 값의 날짜를 기준으로 센다.
- [ ] **Step 8: D가 11/16까지 준비되지 않으면** (스펙 9장)
  - 11/20에는 `HANPAN_REQUIRE_KEY` 없이 정식판을 낸다. 시연판 계획의 기능만 들어간다.
  - D가 준비되면 이 Task를 다시 한다. 유예 마감일은 그 배포일부터 센다.
