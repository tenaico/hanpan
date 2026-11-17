# 한판 AI 도면 3단계(편집 화면) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사람이 AI 도면 탭에서 도형 15종을 놓고, 손잡이·속성 창으로 크기·위치·회전을 바꾸고, 구멍·묶기·줄 맞추기·직접 그리기를 하고, 6종 파일을 열고, STL·OBJ·PNG로 내보낸다.

**Architecture:** 화면은 `CadSession.history`(엔진 `CadHistory`)만 고친다. 그리기는 `evaluateDocument`(manifold wasm 계산기 하나를 탭이 쥔다)의 결과 그물을 three.js 장면에 올린다. 손잡이는 three의 `TransformControls`이고, 끄는 동안은 화면만 움직이고 놓을 때 `edit` 한 번을 부른다. 리본·속성 창은 React와 `packages/ui`.

**Tech Stack:** React 19, three.js 0.187(`TransformControls`, `OrbitControls`, `3MFLoader`, `GLTFLoader`, `PLYLoader`), `fflate`(three의 3MF 읽기가 쓴다, MIT), `opentype.js`(이미 저장소에 있음), `@genoffice/cad-engine`.

**Spec:** `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md` 2장 목표 2·6, 5장, 6장. 화면은 2026-11-16 승인 시안(`hanpan_ai_drawing_tab_mockup`: 위 리본, 가운데 3D, 오른쪽 속성 창과 AI 도우미 자리, 아래 상태 줄 "작업판 200 × 200 mm · 달라붙기 1mm · 격자 10mm")을 따른다.

## Global Constraints

- 2단계 계획의 Global Constraints가 모두 그대로 적용된다(`docs/superpowers/plans/2026-11-16-hanpan-cad-tab-shell.md`).
- 모형을 고치는 길은 `session.history.edit(label, change)` 하나다. 손잡이를 끄는 동안의 중간 값은 기록하지 않는다.
- 엔진 함수가 던지는 `CadEditError`는 화면에서 잡아 상태 줄에 한 줄로 보이고, 문서는 그대로 둔다.
- 달라붙기: 위치는 1mm 격자(Alt를 누르는 동안 끔), 회전은 15°, 크기는 1mm.
- 리본 탭: 파일, 홈, 보기, 치수·도면, 도움말. 홈 탭 묶음: 도형 놓기(상자·원기둥·공·원뿔 + "더 보기"로 15종 모두), 만들기(구멍, 직접 그리기), 정리(묶기, 풀기, 줄 맞추기), 치수(치수 재기, 치수 도면: 4단계에서 연결, 이 단계는 단추를 숨긴다), 문서로 보내기(4단계, 숨김). 고른 리본 탭은 `cadapp.ribbonTab`에 기억한다.
- 속성 창: 이름, 종류(채움/구멍), 도형 치수(엔진 `SHAPE_DIMS` 순서), 위치 x·y·z, 회전 x·y·z, 색, 숨기기, 잠그기. 여러 개를 고르면 공통 값만, 다른 값은 빈칸.
- 숨기기·잠그기는 맨 위 도형에만 보인다. 묶음 안 도형은 풀어서 고친다(엔진 판정 "묶음 안 숨긴 도형도 결과에 든다"와 충돌하지 않게 하는 화면 규칙).
- 단축키: Ctrl+Z/Ctrl+Y(되돌리기·다시 하기), Delete, Ctrl+A, Ctrl+D(복제), Ctrl+G/Ctrl+Shift+G(묶기·풀기), H(구멍↔채움 바꾸기), 방향키(격자 한 칸 옮기기, Shift는 10칸). 입력 칸에 포커스가 있으면 단축키를 받지 않는다.
- 파일 열기 6종: `.ttukcad`·`.dxf`·`.stl`·`.obj`는 2단계 길, `.3mf`·`.glb`·`.ply`는 메인이 `import`로 넘기고 화면이 three 읽기 코드로 `MeshPart` 하나로 바꾼다(색·재질 버림). `.dwg`·`.step`·`.stp`·`.iges`·`.igs`·`.brep`는 메인이 `unknown-type` 대신 `guide`를 돌려주고 화면이 "이 파일을 여는 방법" 안내를 보인다(DXF나 STL로 받아 달라고 하라).
- 내보내기: 파일 › 내보내기 › STL·OBJ(보이는 맨 위 도형의 결과 그물을 하나로 합침)·PNG(지금 3D 화면, 밝은 바탕). 메인 `cad:export-file`이 저장 대화 상자에서 고른 경로에 `atomicWriteFile`로 쓴다. 열려 있는 원본 파일 경로로는 쓰지 않는다.
- 글자 도형: 화면이 한판에 든 OFL 글꼴 `packages/ui/template-fonts/BlackHanSans-Regular.ttf`(한글 포함, 배포본 `resources/template-fonts`)를 `@genoffice/ui/template-fonts`의 `templateFontUrl`로 받아 `opentype.js`로 읽고, 윤곽 점(`TextShape.outlines`)을 만들어 엔진 `addShape('text', { text })`에 넘긴다. 새 글꼴 파일을 넣지 않는다.
- DXF 레이어 색: 엔진 `DrawingEntity`에 `color?: string`(#rrggbb)을 더하고 `readDxf`가 엔티티 색 → 레이어 색 순으로 ACI 색표를 `#rrggbb`로 바꿔 넣는다. 흰색(ACI 7)은 그대로 두고 화면이 테마에 맞는 글자색으로 그린다.
- 새 의존성 `fflate`(MIT)만. `npm run licenses` 통과.

## Review Focus

1. 손잡이를 끄는 도중 Esc나 창 전환: 원래 자리로 돌아가고 기록이 남지 않는다. 시험은 Task 2.
2. 잠근 도형을 손잡이·방향키·속성 창으로 고치려 할 때: 엔진 `locked` 오류를 상태 줄에 보이고 문서는 그대로. 시험은 Task 3.
3. 입체 계산이 실패하는 묶음(열린 그물, 너무 큼): 그 묶음은 반투명 붉은 테두리와 이유 한 줄. 다른 도형은 그대로 그린다. 시험은 Task 2.
4. 200만 삼각형에 가까운 STL을 열었을 때: 탭이 멈추지 않는다(계산은 문서가 바뀐 도형만, 캐시). 시험은 Task 2(캐시 재사용 확인).
5. 직접 그리기에서 선이 겹치는 모양(8자)이나 점 두 개만 찍고 끝내기: 만들지 않고 이유를 보인다. 시험은 Task 4.

---

### Task 1: 엔진 보강(DXF 색, 복제, 여러 도형 옮기기)

**Files:** Modify `packages/cad-engine/src/model.ts`, `dxf.ts`, `drawing-entities.ts`, `ops.ts`, `file.ts`(색 칸 저장·열기), `sheet.ts`(도면 요소 색은 치수 도면에서 검정으로). Test: `packages/cad-engine/tests/dxf-color.test.ts`, `ops-more.test.ts`.

**Produces:** `DrawingEntity`의 모든 변형에 `color?: string`. `aciToHex(index: number): string | null`(`dxf.ts`). `duplicateParts(doc, ids: readonly string[], offset: Vec3): { doc: CadDocument; ids: string[] }`(새 id, 이름 뒤에 " 2"처럼 번호), `moveParts(doc, ids, delta: Vec3): CadDocument`(잠긴 도형이 있으면 `locked`).

- [ ] Step 1 시험: `reads entity colour 1 as #ff0000`, `falls back to the layer colour`, `BYLAYER 256 uses the layer colour`, `colour 7 stays #ffffff`, `a drawing with colours saves and reopens with them`, `duplicate gives new ids and offsets the copy`, `moveParts refuses a locked part`.
- [ ] Step 2: `npm run test -w @genoffice/cad-engine` FAIL → 구현 → PASS. 커밋 `feat(cad-engine): DXF colours, duplicate and move parts`.

### Task 2: 3D 장면(그리기, 고르기, 손잡이, 보기)

**Files:** Create `apps/cad/src/renderer/scene/{evaluator.ts,scene-model.ts,picking.ts,handles.ts,camera.ts,drawing-lines.ts}`; Modify `scene/viewport.ts`, `canvas-colors.ts`. Test: `apps/cad/tests/{evaluator,scene-model,picking,handles,camera}.test.ts`.

**Interfaces:**

- `class DocEvaluator { constructor(kernel: Kernel); update(doc: CadDocument): EvaluatedPart[] }`: `EvalCache`를 쥐고, 같은 도형 값은 다시 계산하지 않는다. 계산기는 `createKernel()`(wasm은 Vite가 `manifold-3d`의 `.wasm`을 자원으로 싣는다. `?url`로 받아 `fetch`).
- `sceneModel(doc, evaluated): SceneItem[]`(순수 함수, three 없음): `{ id, mesh | null, lines: number[][] | null, color, opacity, issue, selectable }`. 구멍은 반투명 회색(0.35), 숨긴 도형은 빠짐, issue가 있는 묶음은 붉은 테두리 표시.
- `pickPart(items, ray): string | null`(맨 위 도형 id. 묶음 안을 누르면 묶음).
- `HandleSession`: `begin(ids, mode: 'move' | 'rotate' | 'scale')`, `preview(delta)`(화면만), `commit(): ((doc) => CadDocument) | null`, `cancel()`. 크기 손잡이는 `ShapePart`의 치수를, 그 밖의 종류는 막는다(그물·도면·묶음은 옮기기·돌리기만).
- `viewDirection('top' | 'front' | 'side' | 'iso')`, `fitTo(box: Box3)`.
- 메뉴 명령 `view-top|front|side|fit`을 여기에 잇는다.

- [ ] Step 1 시험: `unchanged parts are not evaluated twice`, `holes are translucent and hidden parts are absent`, `a group with an open mesh shows its issue and the rest still draws`, `picking a child selects its top-level group`, `a drag that is cancelled leaves no undo step`, `a drag that ends makes exactly one undo step`, `scale handle is refused for a mesh part`, `fit frames the whole model`.
- [ ] Step 2: FAIL → 구현 → PASS(`npx vitest run` in apps/cad). 커밋 `feat(cad): draw the model, pick parts and move them with handles`.

### Task 3: 리본, 속성 창, 상태 줄, 단축키

**Files:** Create `apps/cad/src/renderer/components/{Ribbon.tsx,ShapeGallery.tsx,PropertyPanel.tsx,StatusBar.tsx,AlignMenu.tsx,icons.tsx}`, `apps/cad/src/renderer/editing/{commands.ts,shortcuts.ts}`; Modify `App.tsx`, i18n `app/<21>.ts`. Test: `apps/cad/tests/{commands,shortcuts,property-panel,ribbon}.test.ts`.

**Interfaces:**

- `commands.ts`: `placeShape(session, kind: ShapeKind)`(작업판 가운데, 바닥에 붙여), `deleteSelected`, `duplicateSelected`, `groupSelected`, `ungroupSelected`, `toggleHole`, `alignSelected(axis: 'x'|'y'|'z', anchor: 'min'|'center'|'max')`, `nudge(dx, dy)`, `setProperty(ids, patch: PartPatch)`. 모두 `session.history.edit` 한 번이고, 오류는 `CommandResult = { ok: true } | { ok: false; message: StringKey }`로 돌려준다.
- 리본·속성 창의 문구 열쇠를 i18n에 더한다(21개 언어 실제 번역). 도형 15종 이름 열쇠 `shapeBox` … `shapeText`.

- [ ] Step 1 시험: `placing each of the 15 shapes adds one part and one undo step`, `group then toggle hole then evaluate cuts the hole`, `align centres two parts on x`, `nudge moves by the grid; shift moves ten`, `editing a locked part shows the locked message and changes nothing`, `shortcuts are ignored while an input has focus`, `property panel shows blanks for differing values`, `ribbon remembers the chosen tab`.
- [ ] Step 2: FAIL → 구현 → PASS. 커밋 `feat(cad): ribbon, property panel, status bar and shortcuts`.

### Task 4: 직접 그리기와 글자

**Files:** Create `apps/cad/src/renderer/editing/{sketch.ts,text-outlines.ts}`, `components/SketchBar.tsx`. Test: `apps/cad/tests/{sketch,text-outlines}.test.ts`.

**Interfaces:** `class SketchTool { addPoint(p: [number, number]): void; close(): { ok: true; ring: number[] } | { ok: false; reason: 'too-few' | 'self-crossing' }; undoPoint(); cancel() }`. 닫으면 높이(기본 10mm)를 받아 `ExtrudePart`를 `addPart`. 점은 격자에 달라붙는다. `textOutlines(font: opentype.Font, value: string, sizeMm: number): number[][]`(엔진 `TextShape.outlines` 꼴).

- [ ] Step 1 시험: `a square sketch makes one extrude part 10 mm high`, `two points refuse with too-few`, `a figure eight refuses with self-crossing`, `points snap to the grid`, `text outlines for "A" are closed rings with finite numbers`.
- [ ] Step 2: FAIL → 구현 → PASS. 커밋 `feat(cad): sketch an outline into a solid and place text`.

### Task 5: 파일 6종 열기, 안내 화면, 내보내기

**Files:** Modify `apps/cad/src/shared/ipc.ts`(`OpenFileResult`에 `{ status: 'guide'; ext: string; name: string }`, `ImportExt`에 `3mf | glb | ply`), `apps/cad/src/main/cad-main.ts`(열기 분기, `cad:export-file` 처리), `apps/cad/src/renderer/document/open.ts`, Create `apps/cad/src/renderer/import/three-mesh.ts`, `components/GuideScreen.tsx`, `export/export.ts`; Modify 셸 `app-routing`·열기 필터·`LAUNCHABLE_EXTS`·`folder-tree`(`3mf glb ply` 추가, `dwg step stp iges igs brep`은 cad 탭으로 와서 안내), 셸 `buildCadMenu` 파일 › 내보내기(STL, OBJ, PNG). Test: `apps/cad/tests/{three-import,export,main-export}.test.ts`, 셸 `app-routing.test.ts`.

**Interfaces:** `meshFromThree(object: THREE.Object3D): Mesh`(세계 좌표로 굳힌 삼각형을 하나로), `exportStl(doc, evaluated): Uint8Array`, `exportObj(...)`, `exportPng(viewport): Promise<Uint8Array>`(밝은 테마로 한 장 그린다).

- [ ] Step 1 시험: `a 3MF made in the test opens as one mesh part`, `a GLB with two meshes becomes one mesh`, `a PLY opens`, `.dwg shows the guide and grants nothing`, `export STL of a box with a hole reopens with readStl and has the hole volume`, `export never writes to the opened source path`, `routing sends .3mf to a cad tab`.
- [ ] Step 2: FAIL → 구현 → PASS. `npm run licenses` PASS. 커밋 `feat(cad): open 3MF, GLB and PLY, guide for CAD formats, export STL OBJ PNG`.

### Task 6: 3단계 관문 e2e

- [ ] `e2e/cad-tab.spec.ts`에 더한다: `places all 15 shapes from the gallery`, `a box with a cylinder hole exports an STL that reopens in a new cad tab with a smaller volume`, `handles move a part and one undo puts it back`.
- [ ] `npm run build:all` 뒤 `npx playwright test e2e/cad-tab.spec.ts` PASS. 전체 검사 PASS. 3D 화면을 찍어(`screenshotPath`) 눈으로 확인한다. 커밋 `test(e2e): cad editing gate`.
