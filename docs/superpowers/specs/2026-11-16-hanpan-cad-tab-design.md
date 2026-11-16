# 한판 "AI 도면" 탭 (설계)

작성 2026-11-16. 대상: 새 모듈 `apps/cad`, `packages/cad-engine`, 그리고 `apps/shell`의 탭 연결.
바탕 문서: "뚝딱CAD 한판오피스 탑재 기획서"(2026-11-15, Samuel). 이 설계는 그 기획서를 따르되, 뚝딱CAD v1 코드를 옮기지 않고 **한판 저장소에서 새로 만든다**(저장소 주인 결정, 2026-11-16).
새 결정 번호: 0101.
가지: `feat/cad-tab` (main 5a272f6a에서 갈라짐).

## 1. 왜 하는가

한판 사용자는 공문·보고서를 쓰다가 도면이나 간단한 모형이 필요해진다. 지금은 받은 도면(DXF)을 열어 볼 방법이 없고, 그림을 문서에 넣으려면 다른 프로그램이 필요하다. "AI 도면" 탭은 세 가지를 한판 안에서 끝내게 한다.

1. 받은 DXF 도면을 열어 치수를 확인한다.
2. 간단한 3D 모형을 말로(AI) 또는 손으로 만든다.
3. 치수 도면과 모형 사진을 한글·워드·PPT 문서에 바로 넣는다.

기획서가 짚은 대로 네 쓰임 장면의 끝은 모두 다른 한판 문서다. 그래서 중심 기능은 모델링이 아니라 **문서로 보내기**다.

**완료 기준:** 설치본에서 홈의 "AI 도면" 카드로 탭을 열고, AI에게 말로 모형을 고치게 하고, 치수 도면을 한글 문서에 붙여 넣는다.

## 2. 목표, 하지 않을 것, 실패로 볼 것

**목표** (한 판에 모두 넣는다. 저장소 주인 결정, 2026-11-16)

1. 탭 종류 `cad`가 생기고, 저장·닫기 확인·복구 사본·새 창으로 열기가 다른 탭과 같이 동작한다.
2. 도형 15종 놓기, 크기·위치·회전 바꾸기, 구멍 뚫기, 직접 그리기(밑그림을 세워 입체로), 묶기·풀기, 줄 맞추기, 되돌리기·다시 하기.
3. 탭의 AI 도우미가 도형 놓기, 크기·위치 바꾸기, 구멍, 묶기, 줄 맞추기, 모형 요약을 한다. 요청 하나가 바꾼 것은 되돌리기 한 번으로 돌아간다.
4. 치수 재기(두 점 거리, 선 길이, 원 지름)와 치수 도면(세 방향 그림, 축척, 표제란, A4 맞춤).
5. 문서로 보내기: 그림으로 복사, "한글로 보내기"(한국어 문서 기능이 꺼져 있으면 "워드로 보내기").
6. DXF·STL·OBJ·3MF·GLB·PLY를 열고, STL·OBJ·PNG로 내보낸다. DXF는 글자와 치수선도 보여 준다.
7. 화면 문구와 도움말을 21개 언어로 채운다. 밝은·어두운·시스템 테마를 따른다.

**하지 않을 것**

- DWG·STEP·IGES·BREP 읽기. 열려고 하면 "이 파일을 여는 방법" 안내만 보여 준다(기획서 방안 A).
- 운영체제 파일 연결(.dxf·.stl 더블클릭). 결정 0093과 같은 이유.
- 설계 이력, 조립·구속 조건, 건축 도면 작성 같은 전문 CAD 기능.
- 뚝딱CAD 단독판(v1) 파일과의 호환. 견본 파일을 받으면 "가져오기"로 따로 더한다(10장).
- 다른 탭에서 "AI 도면으로 보내기", 만들기 창(generate)의 대상, 스킬 양식 복사, 빠른 보기 전용 화면.
- 인쇄. 치수 도면은 문서로 보내서 인쇄한다.

**실패로 볼 것**

- 연 파일(DXF·STL 등)을 한판이 덮어쓴다.
- AI 요청 하나를 되돌리는 데 되돌리기를 여러 번 눌러야 한다.
- `npm run licenses`가 실패하는 의존성이 들어간다.
- 3D를 못 그리는 PC에서 빈 화면이나 멈춤으로 보인다.
- 다른 프로그램의 이름·아이콘·견본 파일이 저장소에 들어간다.

## 3. 접근 방법

| 안 | 내용 | 얻는 것 | 잃는 것 |
| --- | --- | --- | --- |
| **가. 마인드맵과 같은 편집기 모듈 (선택)** | `apps/cad` + `packages/cad-engine`. 메인 프로세스 코드는 셸에 묶이고, 화면은 `genoffice-app://cad/`에서 열린다 | 저장·복구·닫기 확인·AI 창을 기존 규칙 그대로 쓴다. 기획서 구조와 같다 | 셸에 고칠 곳이 많다(9장 목록) |
| 나. 그래픽 탭처럼 완전 격리 웹앱 | 별도 출처에서 돌고 창구(메시지)로만 통신(결정 0093) | 셸과 분리 | 바깥 코드를 들일 때 쓰는 방식이다. 우리 코드에는 창구만 늘어난다 |
| 다. 디자인 보드처럼 별도 창 | 탭이 아닌 창 | 셸 수정이 적다 | 탭·복구·세션 기록을 못 쓴다. 완료 기준(탭)과 어긋난다 |

가를 고른다. 저장소 주인이 기획서 구조를 따르기로 했고, 탭 규칙을 그대로 받는 길이 이것뿐이다.

**v1을 옮기지 않아서 기획서와 달라지는 것** (대표님 공유 필요, 10장)

| 기획서 | 이 설계 |
| --- | --- |
| `.ttukcad`가 단독판과 서로 열린다 | 한판용 새 형식. 확장자는 `.ttukcad`를 쓰되 안에 형식 이름과 판 번호를 둔다 |
| 3D 화면·손잡이는 v1 코드 | three.js(MIT)로 새로 쓴다 |
| v1 시험 121개를 옮긴다 | 시험을 먼저 쓰고 구현한다 |
| 한판 코드가 단독판의 원본 | 이번에는 정하지 않는다 |

## 4. 구조

```
packages/cad-engine   화면 없는 TypeScript. Node·DOM을 쓰지 않는다(시험으로 막는다)
  model/     문서, 도형, 묶음, 되돌리기
  shapes/    도형 15종을 삼각형 그물로
  solid/     입체 계산(더하기·빼기). manifold-3d를 감싼다
  dxf/       DXF 읽기
  mesh-io/   STL·OBJ 읽기와 쓰기
  drawing/   치수 도면(SVG 글)
  measure/   치수 재기 계산
  file/      .ttukcad 읽기와 쓰기

apps/cad
  src/shared/ipc.ts        CAD_CHANNELS (모두 `cad:` 접두어)
  src/main/cad-main.ts     뷰 만들기, 열기·저장, 허용 경로, 닫기 확인
  src/main/recovery-main.ts, seed-main.ts, i18n-main.ts, send-main.ts
  src/preload/index.ts     window.cadApi
  src/renderer/
    document/   세션, 저장, 복구 사본
    scene/      three.js 화면, 손잡이, 선택, 치수 표시, 재기 도구
    import/     3MF·GLB·PLY 읽기(three의 읽기 코드)
    components/ 리본, 속성 창, 대화 상자 (React + packages/ui)
    send/       그림 복사, 한글로 보내기
    ai/         AI 창, 도구, CAD skill
    i18n/       app/<언어>.ts, ai/<언어>.ts (21개)
```

새 의존성: `three`(MIT), `manifold-3d`(Apache-2.0, wasm 약 0.5MB), `fflate`(MIT, 3MF 압축 풀기). `opentype.js`(MIT)는 이미 저장소에 있다. 모두 허용 목록 안이다. 한판에 더해지는 크기는 첫 빌드에서 재서 이 문서에 적는다.

## 5. 엔진

### 5-1. 문서 모형

단위는 mm, 위쪽이 Z다. 문서는 바뀌지 않는 값(immutable)이고, 고칠 때마다 새 문서를 만든다.

```ts
interface CadDocument {
  workplane: { width: number; depth: number; grid: number } // mm
  parts: Part[]
  title: { name: string; date: string; scale: string } // 표제란
  extra: Record<string, unknown> // 모르는 필드는 버리지 않고 그대로 다시 쓴다
}
type Part = ShapePart | ExtrudePart | MeshPart | DrawingPart | GroupPart
interface PartBase {
  id: string
  name: string
  role: 'solid' | 'hole' // 구멍은 묶을 때 빼는 쪽이 된다
  color: string // 문서 내용의 색. 테마와 무관
  position: [number, number, number]
  rotation: [number, number, number] // 도(°)
  hidden: boolean
  locked: boolean
}
```

- `ShapePart`: `shape`(15종 중 하나)와 그 도형의 치수.
- `ExtrudePart`: 닫힌 밑그림(점 목록)과 높이. "직접 그리기"와 DXF의 닫힌 선을 세울 때 쓴다.
- `MeshPart`: 불러온 삼각형 그물. 닫힌 그물인지(`closed`)를 기록한다.
- `DrawingPart`: DXF에서 온 2D 밑그림(선·호·원·글자·치수선). 작업판 위에 놓인다.
- `GroupPart`: 자식 도형들. 결과 입체는 `solid`들을 더한 뒤 `hole`들을 뺀 것이다.

**구멍 뚫기**는 따로 있는 명령이 아니다. 도형의 `role`을 `hole`로 바꾸고 다른 도형과 묶으면 뚫린다. 닫히지 않은 그물이 들어간 묶음은 계산하지 않고 이유를 알려 준다.

### 5-2. 도형 15종 (제안. 단독판 목록을 받으면 맞춘다)

상자, 원기둥, 공, 원뿔, 사각뿔, 쐐기, 반구, 관, 도넛, 삼각 기둥, 육각 기둥, 둥근 상자, 별 기둥, 지붕, 글자.

"글자"는 한판에 든 글꼴(OFL)을 `opentype.js`로 읽어 윤곽을 세운다. 엔진은 윤곽 점만 받고, 글꼴 파일 읽기는 화면 쪽이 한다.

### 5-3. 고치는 길은 하나

```ts
class CadHistory {
  current(): CadDocument
  edit(label: string, change: (doc: CadDocument) => CadDocument): void
  openGroup(label: string): void // AI 요청 하나의 시작
  closeGroup(): void // 그 사이의 edit는 되돌리기 한 번
  undo(): boolean
  redo(): boolean
}
```

리본·단축키·속성 창·손잡이·AI가 모두 `edit`만 부른다. 손잡이를 끄는 동안의 중간 값은 기록하지 않고, 놓을 때 한 번 기록한다. 기록은 100단계까지 둔다. 문서가 바뀌지 않는 값이라 큰 그물은 단계 사이에 같은 메모리를 가리킨다.

### 5-4. 입체 계산

`manifold-3d`를 `solid/kernel.ts` 한 곳에서만 부른다. wasm 준비는 비동기이므로 엔진은 `createKernel(wasmBytes)`로 받은 계산기를 인자로 받는다. 화면에 그릴 그물은 `evaluate(doc, kernel)`이 만든다. 같은 도형은 다시 계산하지 않도록 도형 값을 열쇠로 결과를 기억한다.

### 5-5. 파일

- **`.ttukcad`**: UTF-8 JSON. `{ "format": "hanpan-cad", "version": 1, "document": {...} }`. 불러온 그물은 base64로 넣는다. 모르는 필드는 `extra`에 두고 다시 쓴다. `version`이 더 높으면 열지 않고 "더 새 판에서 만든 파일"이라고 알린다. 형식 이름이 없는 `.ttukcad`(단독판 파일로 보이는 것)는 "뚝딱CAD 단독판 파일은 아직 열 수 없습니다"라고 알린다.
- **열기 결과**는 다섯 가지다: `ok`, `empty`, `too-large`, `unsupported`, `broken`. `ok`가 아니면 화면은 그 파일에 쓰지 않는다.
- **한도**: 파일 100MB, 삼각형 200만 개. 넘으면 열지 않고 이유를 보여 준다.
- **DXF 읽기**(직접 쓴다): LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE(선분으로 근사), TEXT, MTEXT, DIMENSION, INSERT(블록), 레이어 색, `$INSUNITS`(단위). 읽지 못한 종류는 종류별 개수를 돌려준다. 결과는 `DrawingPart` 하나다.
- **STL·OBJ**: 엔진이 읽고 쓴다(STL은 글·바이너리 둘 다).
- **3MF·GLB·PLY**: 화면 쪽이 three의 읽기 코드로 읽어 `MeshPart`로 바꾼다. DOM이 필요해서 엔진 밖에 둔다. 색과 재질은 한 가지 색으로 줄인다.
- **DWG·STEP·IGES·BREP**: 확장자만 알아보고 안내 화면을 띄운다("DXF나 STL로 받아 달라고 하세요").

### 5-6. 치수 재기와 치수 도면

- `measure/`: 두 점 거리, 선 길이, 원·호의 지름. 화면은 꼭짓점·선 끝·원 중심에 달라붙는 점을 엔진에서 받는다.
- `drawing/`: 문서에서 앞·위·옆 세 방향의 외곽선을 만들고, 전체 가로·세로·높이 치수와 표제란(제목·날짜·축척)을 넣은 SVG 글을 돌려준다. 축척은 A4에 맞는 값을 1:1, 1:2, 1:5, 1:10 … 중에서 고른다. `DrawingPart`만 있는 문서는 위에서 본 한 방향만 그린다.

## 6. 화면

시안은 2026-11-16 대화에 보인 것이다(리본 묶음 다섯 개, 가운데 3D 화면, 오른쪽에 속성 창과 AI 도우미).

- **리본 탭**: 파일, 홈, 보기, 치수·도면, 도움말.
- **홈 탭 묶음**: 도형 놓기(자주 쓰는 4종 + 더 보기), 만들기(구멍, 직접 그리기), 정리(묶기, 풀기, 줄 맞추기), 치수(치수 재기, 치수 도면), 문서로 보내기(그림 복사, 한글로 보내기).
- **3D 화면**: three.js. 돌리기·밀기·확대, 위·앞·옆 보기 단추, 작업판 격자, 선택 표시, 선택한 도형의 가로·세로·높이 표시. 옮기기·돌리기·크기 손잡이. 격자에 달라붙기(기본 1mm, Alt로 끔).
- **속성 창**: 선택한 도형의 치수·위치·회전·색·종류(채움/구멍)를 숫자로 고친다.
- **3D를 못 쓰는 PC**: WebGL을 만들지 못하면 이유와 할 수 있는 일(그래픽 드라이버 갱신, 하드웨어 가속 켜기)을 적은 화면을 보여 준다. 도중에 그리기 문맥을 잃으면 다시 만들고 문서는 그대로 둔다.
- **색**: 화면 틀은 `tokens.css` 토큰만 쓴다. 3D 화면의 바닥·격자·선택 색은 `canvas-colors.ts` 표에서 테마별로 읽는다. 도형 색은 문서 내용이라 두 테마에서 같다. 내보낸 PNG와 치수 도면은 항상 밝은 바탕이다.
- **악센트 색**: 앱별 `--accent`는 파일 아이콘 색과 같은 청록(`#1F7A8C`)으로 둔다. 파일 아이콘은 `tools/gen-file-association-icons.mjs`에 `cad`(탭 전용)를 더해 만든다.

## 7. 메인 프로세스와 문서로 보내기

### 7-1. 열기·저장 (`cad-main.ts`, 마인드맵과 같은 계약)

- 셸이 부르는 함수: `configureCadRuntime`, `createCadView`, `cadIsDirty`, `cadFilePath`, `requestCadSave`, `requestCadClose`, `cadSaveToPath`, `cadFileRenamed`, `cadRecoveryIdentity`, `discardCadRecovery`, `writeCadCopiesNow`, `openCadFileWithDecision`, `openCadUntitledCopy`, `sendCadMenuCommand`, `setCadFileSavedHook`, `setCadSendToDocumentHook`, `setCadRecoveryTitleHook`.
- 뷰마다 허용된 경로만 읽고 쓴다. `ok`로 열리지 않은 뷰는 쓰지 못한다.
- **`.ttukcad`가 아닌 파일을 열면** 그 내용으로 "제목 없는" 문서가 열리고 제목은 파일 이름을 딴다. 저장은 항상 다른 이름으로 저장(`.ttukcad`)이다. 원본 파일에는 쓰지 않는다.
- 저장은 화면이 만든 바이트를 메인이 다시 열어 보고(`ok`일 때만) `atomicWriteFile`로 쓴다.
- 내보내기(STL·OBJ·PNG)도 화면이 바이트를 만들고 메인이 저장 대화 상자에서 고른 경로에 쓴다.
- 자동 저장은 경로가 있는 문서만, 30초마다와 창이 뒤로 갈 때 한다.

### 7-2. 복구 사본 (결정 0061)

`registerRecoveryEditor({ kind: 'cad', ... })`. 사본은 지금 저장하면 쓰일 바이트 그대로다. 바뀐 것이 있을 때만 30초마다 넘기고, 삼각형이 20만 개를 넘는 문서는 입력이 2초 쉬었을 때 넘긴다. 복구 사본의 기본 확장자는 `.ttukcad`다.

### 7-3. 문서로 보내기

- **그림 복사**: 화면이 PNG 바이트(지금 보이는 3D 화면 또는 치수 도면)를 만들고, `cad:copy-image`로 메인이 운영체제 클립보드에 넣는다(디자인 보드와 같은 길). 한글·워드·PPT 탭에서 붙여 넣는다.
- **한글로 보내기**: 화면이 `{ title, drawingPng, rows }`를 보내면(`cad:send-to-document`) 셸이 `packages/hanpan-core`의 블록(`title`, `image`, `table`)으로 문서를 만들어 새 탭으로 연다. 표는 도형 이름과 가로·세로·높이다. 한국어 문서 기능이 켜져 있으면 한글(hwpx), 꺼져 있으면 워드(docx)이고 단추 이름도 그에 맞춘다. 그림은 10MB를 넘지 않게 줄인다.

## 8. AI 도우미

마인드맵과 같은 구성이다. `ai:stream`은 문서 편집기 메인이 등록한 것을 부르기만 하고, CAD 전용 채널에는 `cad:`를 붙인다. 공급자는 `selectAiProvider`만 고른다.

| 도구 | 하는 일 |
| --- | --- |
| `read_model` | 도형 목록(이름·종류·치수·위치)과 전체 크기 요약 |
| `add_shapes` | 도형을 놓는다(한 번에 50개까지) |
| `update_shapes` | 치수·위치·회전·색·이름·종류(채움/구멍)를 바꾼다 |
| `delete_shapes` | 지운다 |
| `group_shapes` / `ungroup_shapes` | 묶기·풀기 |
| `align_shapes` | 줄 맞추기(축, 기준) |
| `set_workplane` | 작업판 크기("방 5×4m") |

- 저장·열기·내보내기·보내기 도구는 두지 않는다.
- 요청 하나를 시작할 때 `openGroup`, 끝나거나 멈출 때 `closeGroup`을 부른다. 그래서 되돌리기 한 번으로 돌아간다.
- 도구의 입력은 엔진이 다시 검사한다(없는 id, 0 이하 치수, 한도 초과는 오류로 돌려준다).
- 지시문과 도구 설명은 영어다. 모형 요약은 자료로만 다룬다.
- 빠른 실행 단추 3개: "치수 도면 만들기", "방 배치 시작", "한글로 보내기"(기획서 제안. 대표님 확인 전까지 이 값).
- 시험에서는 실제 AI를 부르지 않는다(`aiStream` 가짜).

## 9. 셸 연결과 언어

**고칠 곳**은 2026-11-16 조사 목록을 따른다. 형 검사가 빠진 곳을 잡아 주는 자리(`Record<TabKind, …>` 등)와 손으로 넣어야 하는 자리가 있다.

- 종류 목록: `TabKind`, `RendererHost`, `RECOVERY_EDITOR_KINDS`와 기본 확장자, `RECOVERY_LIST_EDITOR_KINDS`, `DOCUMENT_KINDS`.
- 길 찾기: `app-routing.ts`(`.ttukcad`와 열 수 있는 확장자), `installRendererProtocol`, `openDocumentPath`, 열기 대화 상자 필터, `LAUNCHABLE_EXTS`, `TREE_FILE_EXTENSIONS`, 홈의 파일 아이콘·형식 묶음.
- 탭: `tab-manager.ts`의 `openCadTab`, 점 표시, 닫기 확인, `createPlainEditorView`, 새 창(`detached-windows.ts`), `window-close-guard.ts`, `recovery-shell.ts`.
- 메뉴와 홈: 탭 메뉴(`buildCadMenu`), "+" 새로 만들기, 홈 카드(`NEW_ITEMS`, `APP_GROUPS`의 그래픽 묶음, `APP_TEXT`), `TabBar` 아이콘, 복구 목록 아이콘·이름.
- 빌드: 루트 `package.json`의 `test`·`typecheck`·`dev`·`build:all`, `tools/build-stale-preloads.mjs`, `electron-builder.cjs`의 `extraResources`와 모듈 확인 목록, `tools/gen-third-party-notices.mjs`.
- MCP: `FAMILY_BY_KIND`는 형 검사 때문에 넣어야 한다. `cad`는 읽기(모형 요약 글)와 저장만 잇는다.
- 넣지 않는 곳: 운영체제 파일 연결(`fileAssociations`, `installer.nsh`), 만들기 창, 스킬 양식 복사, 다른 앱으로 보내기(0096)의 출발·도착, 빠른 보기, 드라이브 AI.

**언어**

- 번역 전에 용어집을 먼저 정한다(도형, 구멍, 묶기, 줄 맞추기, 작업판, 치수 도면, 표제란, 축척). 용어집은 `apps/cad/AGENTS.md`에 둔다.
- 화면 문구는 `apps/cad/src/renderer/i18n/app|ai/<언어>.ts`에 21개 언어. `zh.ts`가 열쇠를 정한다. 한국어와 영어는 손으로 쓰고 나머지 19개는 실제 번역이다.
- 셸 문구(탭 이름, 홈 카드, 메뉴, 필터)는 셸의 문자열 표와 `tMain`에 21개 언어.
- 도움말: 새 주제 `cad`를 21개 언어로, 영어와 같은 구조로 쓴다(`check:help-langs`).

## 10. 순서, 시험, 남는 일

**순서** (관문을 통과해야 다음으로 간다. 배포는 마지막에 한 번)

| 단계 | 내용 | 관문 |
| --- | --- | --- |
| 1 | 엔진: 문서·되돌리기·도형·입체 계산·파일·DXF·STL/OBJ·재기·치수 도면 | 엔진 시험 통과, `licenses` 통과, Node·DOM 금지 시험 통과 |
| 2 | 탭 뼈대: 셸 연결, 열기·저장·닫기 확인·복구 사본, 빈 3D 화면 | e2e: 홈 카드로 열기, 저장, 다시 열기, 저장 안 한 채 닫기 확인, 복구 |
| 3 | 편집 화면: 리본, 손잡이, 속성 창, 묶기·구멍·줄 맞추기, 직접 그리기, 파일 열기 6종 | 도형 15종을 놓고 구멍을 뚫어 STL로 내보낸 파일이 다시 열린다 |
| 4 | 치수 재기, 치수 도면, 그림 복사, 한글로 보내기 | e2e: 치수 도면이 든 새 한글 탭이 열린다 |
| 5 | AI 도우미 | 가짜 AI로 요청 하나가 되돌리기 한 번으로 돌아간다 |
| 6 | 21개 언어, 도움말, 어두운 테마, 크기 재기, 사용설명서 | 모든 검사 통과, 설치본에서 완료 기준 확인 |

기간은 추정 4~6주다. 1단계를 마친 뒤 실제 작업량으로 다시 적는다.

**1단계 실적(2026-11-16):** 엔진은 계획 작성부터 검토 수정까지 같은 날 약 2시간에 끝났다(작업 4개를 동시에 진행, 시험 300개 남짓). 엔진은 화면이 없어 빠르게 끝났고, 남은 단계는 셸 연결(60곳 넘음)·화면·21개 언어 번역이 대부분이라 2단계를 마친 뒤 기간을 다시 적는다.

**2단계 실적(2026-11-16):** 탭 뼈대(셸 연결 약 70곳, 메인 프로세스, 화면 뼈대, e2e 2개)를 같은 날 약 3시간에 마쳤다(작업 3개를 동시에 진행). 3D 작업판이 실제 GPU로 그려지는 것을 e2e 화면으로 확인했다. 남은 3~6단계도 같은 방식이면 며칠 단위로 줄어들 것으로 보지만, 화면 조작(손잡이·직접 그리기)과 21개 언어 번역 검수는 사람 확인이 필요해 기간은 3단계를 마친 뒤 다시 적는다.

**시험**

- 엔진: `packages/cad-engine/tests`(Node 환경). 시험 파일은 시험이 직접 만든다. 다른 프로그램의 견본 파일을 넣지 않는다.
- 앱: `apps/cad/tests`(jsdom). three의 그리기 부분은 가짜로 바꾸고, 문서·저장·복구·AI 도구를 본다.
- e2e: `e2e/cad-tab.spec.ts`. AI를 보내는 시험은 `stubAiReady`를 쓴다.

**문서**: 결정 기록 0101, `apps/cad/AGENTS.md`, `packages/cad-engine/AGENTS.md`, 루트 `AGENTS.md`의 구조 목록, `docs/프로젝트이해.md`, `docs/매뉴얼.md`.

**만드는 사람에게 맡기는 것**: 리본 아이콘 그림, 손잡이의 세부 모양, 도형별 기본 치수, 내부 파일 나눔.

**남는 일**

| 일 | 담당 | 기한 |
| --- | --- | --- |
| v1을 옮기지 않고 새로 만든다는 점과 3장의 달라진 네 가지를 대표님께 공유 | 혁준 | 2단계 시작 전 |
| 단독판 HTML과 `.ttukcad` 견본 받기(도형 15종 목록·동작 대조, 가져오기 판단) | 혁준 → 대표님 | 3단계 시작 전 |
| 실제 업무 DXF 파일 3개 이상 모으기(저장소에는 넣지 않는다) | 혁준 | 3단계 관문 전 |
| 오래된 PC에서 3D 화면 확인 | 혁준 | 6단계 |
| AI 빠른 실행 단추 3개, 쓰임 장면 네 가지 확인 | 대표님 | 5단계 전 |
| DWG(방안 B)·STEP(방안 C) 검토를 시작할지 | 대표님 | 배포 뒤 |
| DXF 레이어 색 읽기(1단계에서 미룸: 도면 요소에 색 칸이 없어 한 가지 색으로 보인다) | Claude | 3단계 |
| 묶음 안에서 숨긴 도형을 결과에 넣을지 정하기(지금은 넣는다) | 혁준 | 3단계 전 |
| "한판은 CAD까지 붙이고 동결"(11/13 이사님)에 비춘 일정 확인 | 혁준 → 이사님 | 2단계 시작 전 |
