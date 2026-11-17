# AI 도면 1단계: cad-engine 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면 없이 도는 `packages/cad-engine`을 만든다. 문서 모형, 되돌리기, 도형 15종, 입체 계산, `.ttukcad`·STL·OBJ·DXF 파일, 치수 재기, 치수 도면이 들어간다.

**Architecture:** 문서는 바뀌지 않는 값이고 모든 고침은 `CadHistory.edit` 하나를 지난다. 입체 계산은 `manifold-3d`를 감싼 `Kernel` 한 곳에서만 하고, 나머지는 순수 TypeScript다. 엔진은 바이트와 글만 만들고 디스크에는 쓰지 않는다.

**Tech Stack:** TypeScript 5.9, vitest 4(Node 환경), `manifold-3d`(Apache-2.0), `earcut`(ISC).

**Spec:** `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md` (4장, 5장, 10장의 1단계)

이 계획은 여섯 단계 중 첫 단계다. 2~6단계(탭 뼈대, 편집 화면, 치수·문서로 보내기, AI, 언어·도움말)는 앞 단계의 관문을 지난 뒤 따로 계획을 쓴다.

## Global Constraints

- 작업 위치: `C:\Users\ten\Desktop\hanpan\.claude\worktrees\cad-tab`, 가지 `feat/cad-tab`. 시작 전에 `npm ci`를 한 번 한다.
- `packages/cad-engine/src/`에는 Node 내장 모듈, `Buffer`, `require`, `process.`, DOM을 쓰지 않는다. `src/index.ts`는 `export … from './<파일>'` 줄만 둔다. 그래서 `src/` 아래에 하위 폴더를 두지 않는다(설계 4장의 폴더 그림 대신 파일 이름으로 나눈다).
- 코드·주석·커밋 메시지는 영어. 커밋은 Conventional Commits, `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`, 끝줄 `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- 새 의존성은 `manifold-3d`와 `earcut`뿐이다. `npm run licenses`가 통과해야 한다. `three`는 이 단계에 넣지 않는다.
- 단위는 mm, 위쪽은 +Z, 각도는 도(°). 삼각형은 바깥에서 볼 때 반시계 방향.
- 시험 파일은 시험이 직접 만든다. 다른 프로그램의 견본 파일을 저장소에 넣지 않는다.
- 한도: 파일 100MB(`MAX_FILE_BYTES = 100 * 1024 * 1024`), 삼각형 200만 개(`MAX_TRIANGLES = 2_000_000`), 되돌리기 100단계(`HISTORY_LIMIT = 100`), 한 번에 넣는 도형 50개는 2단계 이후(AI) 몫이다.
- 푸시와 PR은 여섯 단계가 모두 끝난 뒤에 한다. 이 단계에서는 커밋만 한다.

## Review Focus

1. 크기가 0이거나 음수, NaN인 치수로 도형을 만들 때: 오류를 던지고 문서는 바뀌지 않아야 한다. (Task 2)
2. 묶음 안에 `solid`가 하나도 없고 `hole`만 있을 때: 빈 그물을 돌려주고 멈추지 않아야 한다. (Task 5)
3. 닫히지 않은 그물이 묶음에 들어갈 때: 계산하지 않고 `open-mesh` 이유를 돌려줘야 한다. (Task 5)
4. 글 STL처럼 `solid`로 시작하지만 실제로는 바이너리인 STL: 바이너리로 읽어야 한다. (Task 7)
5. 줄 끝이 CRLF이고 코드 앞에 공백이 있는 DXF, 단위가 인치(`$INSUNITS` 1)인 DXF: mm로 바꿔 읽어야 한다. (Task 8)

---

### Task 1: 패키지 틀

**Files:**

- Create: `packages/cad-engine/package.json`, `tsconfig.json`, `vitest.config.ts`, `AGENTS.md`, `src/index.ts`, `src/version.ts`
- Create: `packages/cad-engine/tests/browser-safety.test.ts`, `tests/version.test.ts`
- Modify: 루트 `package.json`의 `test`·`typecheck` 줄(`-w @genoffice/xmind-engine` 바로 뒤에 `-w @genoffice/cad-engine`), 루트 `AGENTS.md`·`CLAUDE.md`의 구조 목록

**Interfaces:**

- Produces: `CAD_ENGINE_VERSION: string`(package.json의 version과 같다), `CAD_FILE_FORMAT = 'hanpan-cad'`, `CAD_FILE_VERSION = 1`

- [ ] **Step 1:** `packages/xmind-engine`의 `package.json`·`tsconfig.json`·`vitest.config.ts`를 본떠 만든다. 이름 `@genoffice/cad-engine`, version `0.1.0`, dependencies는 비워 둔다. `tests/browser-safety.test.ts`는 xmind-engine 것을 그대로 옮긴다.
- [ ] **Step 2:** `tests/version.test.ts`를 쓴다.

```ts
it('ties the exported version to package.json', () => {
  expect(CAD_ENGINE_VERSION).toBe(pkg.version)
  expect(CAD_FILE_FORMAT).toBe('hanpan-cad')
  expect(CAD_FILE_VERSION).toBe(1)
})
```

- [ ] **Step 3:** Run: `npm run test -w @genoffice/cad-engine` — Expected: FAIL (`version` 모듈 없음)
- [ ] **Step 4:** `src/version.ts`, `src/index.ts`를 쓴다.
- [ ] **Step 5:** Run: `npm run test -w @genoffice/cad-engine && npm run typecheck -w @genoffice/cad-engine` — Expected: PASS
- [ ] **Step 6:** `AGENTS.md`를 쓴다(한국어, xmind-engine의 것과 같은 짜임: 무엇을 하는 패키지인지, 금지 사항, 시험 명령). 루트 구조 목록에 한 줄 더한다. 루트 `package.json` 두 줄을 고친다.
- [ ] **Step 7:** Commit `feat(cad-engine): scaffold the package`

### Task 2: 문서 모형과 고치는 함수

**Files:**

- Create: `src/model.ts`, `src/ids.ts`, `src/ops.ts`, `tests/model.test.ts`, `tests/ops.test.ts`

**Interfaces:**

- Produces:

```ts
type Vec3 = [number, number, number]
type ShapeKind =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'cone'
  | 'pyramid'
  | 'wedge'
  | 'hemisphere'
  | 'tube'
  | 'torus'
  | 'triPrism'
  | 'hexPrism'
  | 'roundedBox'
  | 'starPrism'
  | 'roof'
  | 'text'
interface PartBase {
  id: string
  name: string
  role: 'solid' | 'hole'
  color: string
  position: Vec3
  rotation: Vec3
  hidden: boolean
  locked: boolean
}
interface ShapePart extends PartBase {
  type: 'shape'
  shape: ShapeKind
  dims: Record<string, number>
  text?: { value: string; outlines: number[][][] }
} // 'text' only; outlines in mm, closed rings
interface ExtrudePart extends PartBase {
  type: 'extrude'
  rings: number[][]
  height: number
} // ring = [x0,y0,x1,y1,…], first ring outer
interface Mesh {
  positions: Float32Array
  indices: Uint32Array
}
interface MeshPart extends PartBase {
  type: 'mesh'
  mesh: Mesh
  closed: boolean
}
interface DrawingPart extends PartBase {
  type: 'drawing'
  entities: DrawingEntity[]
} // DrawingEntity is defined in Task 8
interface GroupPart extends PartBase {
  type: 'group'
  children: Part[]
}
type Part = ShapePart | ExtrudePart | MeshPart | DrawingPart | GroupPart
interface CadDocument {
  workplane: { width: number; depth: number; grid: number }
  parts: Part[]
  title: { name: string; date: string; scale: string }
  extra: Record<string, unknown>
}

function newId(): string // 12 hex chars from getRandomValues
function createDocument(): CadDocument // workplane 200×200, grid 10, no parts
const SHAPE_DIMS: Record<ShapeKind, readonly string[]> // dim names per shape
const SHAPE_DEFAULTS: Record<ShapeKind, Record<string, number>>
function addShape(
  doc,
  shape: ShapeKind,
  init?: Partial<
    Pick<ShapePart, 'name' | 'role' | 'color' | 'position' | 'rotation' | 'dims' | 'text'>
  >,
): { doc: CadDocument; id: string }
function addPart(doc, part: Part): CadDocument
function updatePart(doc, id: string, patch: PartPatch): CadDocument // PartPatch: name, role, color, position, rotation, hidden, locked, dims, height
function removeParts(doc, ids: string[]): CadDocument
function groupParts(doc, ids: string[]): { doc: CadDocument; id: string } // needs ≥2 top-level ids
function ungroupPart(doc, id: string): CadDocument // children keep their world position
function alignParts(
  doc,
  ids: string[],
  axis: 'x' | 'y' | 'z',
  anchor: 'min' | 'center' | 'max',
): CadDocument // aligns bounding boxes to the first id's box
function setWorkplane(doc, wp: Partial<CadDocument['workplane']>): CadDocument
function findPart(doc, id: string): Part | undefined // searches groups too
class CadEditError extends Error {
  code: 'unknown-id' | 'bad-number' | 'locked' | 'too-few' | 'not-group'
}
```

`SHAPE_DIMS`: box `width,depth,height` · cylinder `diameter,height` · sphere `diameter` · cone `diameter,height` · pyramid `width,depth,height` · wedge `width,depth,height` · hemisphere `diameter` · tube `outerDiameter,innerDiameter,height` · torus `diameter,tubeDiameter` · triPrism `width,depth,height` · hexPrism `diameter,height` · roundedBox `width,depth,height,radius` · starPrism `outerDiameter,innerDiameter,points,height` · roof `width,depth,height` · text `size,height`. 기본 치수는 가장 긴 변이 20mm가 되게 한다(`points` 5, `radius` 2).

- [ ] **Step 1:** 시험을 쓴다. 주요 단언:

```ts
// model
expect(createDocument().workplane).toEqual({ width: 200, depth: 200, grid: 10 })
expect(newId()).toMatch(/^[0-9a-f]{12}$/)
// ops
const a = addShape(createDocument(), 'box', { dims: { width: 30 } })
expect(findPart(a.doc, a.id)).toMatchObject({
  type: 'shape',
  shape: 'box',
  role: 'solid',
  dims: { width: 30, depth: 20, height: 20 },
})
expect(() => addShape(doc, 'box', { dims: { width: 0 } })).toThrow(CadEditError) // bad-number
expect(() => addShape(doc, 'box', { dims: { width: NaN } })).toThrow(CadEditError)
expect(() => updatePart(doc, 'nope', { name: 'x' })).toThrow(/unknown-id/)
expect(updatePart(d, id, { role: 'hole' })).not.toBe(d) // new document
expect(d.parts).toBe(before) // the old one is untouched
expect(() => groupParts(d, [id])).toThrow(/too-few/)
// group then ungroup keeps each child's world position and rotation
// alignParts(d, [a, b], 'x', 'min') moves b so that its box min x equals a's; a does not move
// a locked part rejects updatePart of position/rotation/dims with 'locked', and still accepts { locked: false }
// tube with innerDiameter >= outerDiameter throws bad-number
```

- [ ] **Step 2:** Run: `npm run test -w @genoffice/cad-engine` — Expected: FAIL (모듈 없음)
- [ ] **Step 3:** 구현한다. 모든 함수는 입력 문서를 바꾸지 않는다. `alignParts`의 상자는 회전을 반영한 축 정렬 상자이고, 도형 상자는 `SHAPE_DIMS`에서 바로 계산한다(그물을 만들지 않는다. `MeshPart`는 `positions`에서, 묶음은 자식 상자의 합).
- [ ] **Step 4:** Run: 같은 명령 — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): document model and edit operations`

### Task 3: 되돌리기

**Files:**

- Create: `src/history.ts`, `tests/history.test.ts`

**Interfaces:**

- Consumes: `CadDocument`
- Produces:

```ts
class CadHistory {
  constructor(initial: CadDocument)
  current(): CadDocument
  revision(): number // +1 on every change that lands, including undo/redo
  edit(label: string, change: (doc: CadDocument) => CadDocument): void
  openGroup(label: string): void
  closeGroup(): void
  canUndo(): boolean
  canRedo(): boolean
  undo(): boolean
  redo(): boolean
  undoLabel(): string | null
  subscribe(listener: () => void): () => void
}
```

- [ ] **Step 1:** 시험을 쓴다.

```ts
// edit that returns the same document object records nothing
// edit that throws leaves current() and the stack unchanged
// three edits inside openGroup/closeGroup undo with ONE undo() and redo with ONE redo()
// nested openGroup counts depth; only the outermost closeGroup closes
// closeGroup with no edits inside records nothing
// an edit after undo clears redo
// the 101st step drops the oldest: 100 undos succeed, the 101st returns false
// closeGroup without openGroup is a no-op
// undo() while a group is open closes it first, then undoes the whole group
```

- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다(문서 참조를 쌓는 두 스택).
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): history with grouped undo`

### Task 4: 도형을 그물로

**Files:**

- Create: `src/mesh.ts`, `src/shapes.ts`, `src/extrude.ts`, `tests/shapes.test.ts`, `tests/extrude.test.ts`
- Modify: `packages/cad-engine/package.json` (dependencies에 `earcut`, devDependencies에 `@types/earcut`)

**Interfaces:**

- Consumes: `ShapePart`, `ExtrudePart`, `Mesh`, `SHAPE_DIMS`
- Produces:

```ts
function shapeMesh(part: ShapePart, segments?: number): Mesh // local space, base centred on the origin, sitting on z = 0; segments default 48
function extrudeMesh(rings: number[][], height: number): Mesh // z from 0 to height
function meshVolume(mesh: Mesh): number // signed volume, mm³
function meshBounds(mesh: Mesh): { min: Vec3; max: Vec3 }
function isClosedMesh(mesh: Mesh): boolean // every edge shared by exactly two triangles, opposite directions
function transformMesh(mesh: Mesh, position: Vec3, rotationDeg: Vec3): Mesh // rotation order Z·Y·X
function triangleCount(mesh: Mesh): number
```

- [ ] **Step 1:** `npm install earcut@^3 -w @genoffice/cad-engine && npm install -D @types/earcut -w @genoffice/cad-engine`, 그다음 `npm run licenses` — Expected: `All production npm dependency licenses are within the allowlist.`
- [ ] **Step 2:** 시험을 쓴다. 15종 모두에 대해 `it.each`로:

```ts
const mesh = shapeMesh(partOf(kind))
expect(isClosedMesh(mesh)).toBe(true)
expect(meshVolume(mesh)).toBeGreaterThan(0)
expect(meshBounds(mesh).min[2]).toBeCloseTo(0, 5)
```

정확한 값:

```ts
expect(meshVolume(shapeMesh(box(10, 20, 30)))).toBeCloseTo(6000, 3)
expect(meshVolume(shapeMesh(cylinder(20, 10), 256))).toBeCloseTo(Math.PI * 100 * 10, 0)
expect(meshVolume(shapeMesh(pyramid(30, 30, 10)))).toBeCloseTo(3000, 3)
expect(meshVolume(shapeMesh(wedge(10, 10, 10)))).toBeCloseTo(500, 3)
expect(meshVolume(shapeMesh(tube(20, 10, 10), 256))).toBeCloseTo(Math.PI * (100 - 25) * 10, 0)
expect(meshBounds(shapeMesh(box(10, 20, 30)))).toEqual({ min: [-5, -10, 0], max: [5, 10, 30] })
// extrude: a 10×10 square with a 4×4 square hole, height 5 → volume 420, closed
// extrude: a clockwise outer ring gives the same positive volume as a counter-clockwise one
// extrude: fewer than 3 points, or height <= 0, throws CadEditError 'bad-number'
// text: outlines of one 10×10 square, height 3 → volume 300
// transformMesh(box, [5,0,0], [0,0,90]) → bounds min/max swap x and y extents, shifted by 5 in x
```

- [ ] **Step 3:** Run — Expected: FAIL
- [ ] **Step 4:** 구현한다. 둥근 도형은 `segments`로 나눈다. `text`는 `outlines`를 고리마다 방향으로 바깥·구멍을 가려 `extrudeMesh`에 넘긴다(반시계가 바깥). `roundedBox`는 둥근 모서리의 사각 밑그림을 세운다(세로 모서리만 둥글다).
- [ ] **Step 5:** Run — Expected: PASS
- [ ] **Step 6:** Commit `feat(cad-engine): primitive and extruded meshes`

### Task 5: 입체 계산

**Files:**

- Create: `src/kernel.ts`, `src/evaluate.ts`, `tests/kernel.test.ts`, `tests/evaluate.test.ts`, `tests/helpers.ts`
- Modify: `packages/cad-engine/package.json` (dependencies에 `manifold-3d`)

**Interfaces:**

- Consumes: Task 2의 형, Task 4의 그물 함수
- Produces:

```ts
interface Kernel {
  union(meshes: Mesh[]): Mesh
  subtract(base: Mesh, cutters: Mesh[]): Mesh
  dispose(): void
}
function createKernel(wasm?: {
  locateFile?: (name: string) => string
  wasmBinary?: Uint8Array
}): Promise<Kernel>
interface EvaluatedPart {
  id: string
  mesh: Mesh | null
  issue: null | 'open-mesh' | 'empty' | 'too-large'
}
function evaluatePart(part: Part, kernel: Kernel, cache?: EvalCache): EvaluatedPart // world-space mesh; drawings give mesh null, issue null
function evaluateDocument(doc: CadDocument, kernel: Kernel, cache?: EvalCache): EvaluatedPart[] // top-level parts, hidden ones skipped
function createEvalCache(): EvalCache // keyed by part object identity (WeakMap)
```

`tests/helpers.ts`는 Node에서 `createKernel()`을 한 번 만들어 나눠 쓰는 `sharedKernel()`을 둔다.

- [ ] **Step 1:** `npm install manifold-3d -w @genoffice/cad-engine`, `npm run licenses` — Expected: 통과. 통과하지 못하면 멈추고 보고한다.
- [ ] **Step 2:** 시험을 쓴다.

```ts
// kernel: union of two 10mm boxes overlapping by half → volume 1500
// kernel: box 10³ minus a through-cylinder d=4 → volume 1000 - π·4·10 (±1), result is closed
// evaluate: group [box solid, cylinder hole] → same volume as above, issue null
// evaluate: group with only holes → mesh with 0 triangles, issue 'empty'
// evaluate: group containing a MeshPart with closed:false → mesh null, issue 'open-mesh'
// evaluate: a lone part with role 'hole' renders as its own mesh (it only cuts inside a group)
// evaluate: nested group — inner group result is used as a solid (or a hole, by its role) of the outer
// evaluate: a result above MAX_TRIANGLES → mesh null, issue 'too-large' (test with a lowered limit argument)
// cache: evaluating the same document twice calls kernel.subtract once (spy)
// cache: after updatePart on one top-level part, only that part is recomputed
```

- [ ] **Step 3:** Run — Expected: FAIL
- [ ] **Step 4:** 구현한다. `manifold-3d`는 `kernel.ts`에서만 import한다. Manifold 객체는 쓴 뒤 `delete()`로 지운다.
- [ ] **Step 5:** Run — Expected: PASS. `browser-safety` 시험도 통과해야 한다.
- [ ] **Step 6:** Commit `feat(cad-engine): boolean kernel and document evaluation`

### Task 6: .ttukcad 파일

**Files:**

- Create: `src/file.ts`, `src/base64.ts`, `tests/file.test.ts`

**Interfaces:**

- Produces:

```ts
type OpenStatus = 'ok' | 'empty' | 'too-large' | 'unsupported' | 'broken'
type OpenResult =
  | { status: 'ok'; document: CadDocument }
  | {
      status: Exclude<OpenStatus, 'ok'>
      reason:
        | 'newer-version'
        | 'standalone-file'
        | 'not-json'
        | 'bad-shape'
        | 'size'
        | 'triangles'
        | 'empty'
    }
function openCadFile(bytes: Uint8Array): OpenResult
function saveCadFile(doc: CadDocument): Uint8Array // UTF-8 JSON, 2-space indent, keys in a fixed order
```

파일 모양: `{ "format": "hanpan-cad", "version": 1, "document": { workplane, title, parts, …extra } }`. `MeshPart.mesh`는 `{ "positions": "<base64 of little-endian Float32>", "indices": "<base64 of little-endian Uint32>" }`.

- [ ] **Step 1:** 시험을 쓴다.

```ts
// round trip: a document with every part type (shape, extrude, mesh, drawing, nested group) → deep-equal after open(save(doc))
// save(open(save(doc))) is byte-identical to save(doc)
// unknown top-level document field and unknown part field survive a round trip
// 0 bytes → { status: 'empty', reason: 'empty' }
// '{"parts":[]}' (no format) → { status: 'unsupported', reason: 'standalone-file' }
// version 2 → { status: 'unsupported', reason: 'newer-version' }
// 'not json' → { status: 'broken', reason: 'not-json' }
// a part with dims.width = "x", a part with an unknown type, a duplicate id, indices pointing past positions → { status: 'broken', reason: 'bad-shape' }
// bytes.length > MAX_FILE_BYTES → 'too-large'/'size' without parsing (pass a small limit argument in the test)
// a UTF-8 BOM is accepted
```

- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다. base64는 직접 쓴다(`atob`/`Buffer` 없이). 열 때 모든 수가 유한한지, id가 겹치지 않는지 검사한다.
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): .ttukcad open and save`

### Task 7: STL과 OBJ

**Files:**

- Create: `src/stl.ts`, `src/obj.ts`, `src/weld.ts`, `tests/stl.test.ts`, `tests/obj.test.ts`

**Interfaces:**

- Produces:

```ts
type MeshReadResult =
  { status: 'ok'; mesh: Mesh; closed: boolean } | { status: 'empty' | 'too-large' | 'broken' }
function readStl(bytes: Uint8Array): MeshReadResult
function writeStl(mesh: Mesh): Uint8Array // binary, 80-byte header "Hanpan"
function readObj(bytes: Uint8Array): MeshReadResult // v and f only; polygons fan-triangulated; negative indices supported
function writeObj(mesh: Mesh): Uint8Array
function weldMesh(mesh: Mesh, tolerance?: number): Mesh // merges vertices closer than 1e-5 mm
```

- [ ] **Step 1:** 시험을 쓴다.

```ts
// readStl(writeStl(boxMesh)) → ok, closed true, volume equal within 1e-3
// an ASCII STL of one tetrahedron (built in the test) → ok, 4 triangles
// a binary STL whose header starts with "solid" → read as binary (triangle count × 50 + 84 === length)
// a binary STL whose count field says more triangles than the bytes hold → 'broken'
// 0 bytes → 'empty'
// OBJ with quads and "f 1/1/1 2/2/2 3/3/3 4/4/4" → 2 triangles; "f -1 -2 -3" resolves
// OBJ with an index out of range → 'broken'
// readObj(writeObj(boxMesh)) → closed true, same volume
// a single open triangle → ok, closed false
```

- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다. 읽은 그물은 `weldMesh`를 거친 뒤 `isClosedMesh`로 `closed`를 정한다.
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): STL and OBJ readers and writers`

### Task 8: DXF 읽기

**Files:**

- Create: `src/dxf-tokens.ts`, `src/dxf.ts`, `src/drawing-entities.ts`, `tests/dxf.test.ts`, `tests/dxf-helpers.ts`

**Interfaces:**

- Produces:

```ts
type DrawingEntity =
  | { kind: 'line'; a: [number, number]; b: [number, number]; layer: string }
  | { kind: 'polyline'; points: number[]; closed: boolean; layer: string } // arcs (bulge) are flattened; [x0,y0,…]
  | { kind: 'circle'; center: [number, number]; radius: number; layer: string }
  | {
      kind: 'arc'
      center: [number, number]
      radius: number
      startDeg: number
      endDeg: number
      layer: string
    }
  | {
      kind: 'text'
      at: [number, number]
      height: number
      rotationDeg: number
      value: string
      layer: string
    }
type DxfReadResult =
  | {
      status: 'ok'
      entities: DrawingEntity[]
      skipped: Record<string, number>
      unit: 'mm'
      sourceUnit: string
      bounds: { min: [number, number]; max: [number, number] } | null
    }
  | { status: 'empty' | 'too-large' | 'broken' }
function readDxf(bytes: Uint8Array): DxfReadResult
function drawingPartFromDxf(
  result: Extract<DxfReadResult, { status: 'ok' }>,
  name: string,
): DrawingPart
function closedOutlines(part: DrawingPart): number[][] // closed polylines and circles as rings, for extruding
```

읽는 종류: LINE, LWPOLYLINE, POLYLINE(+VERTEX), CIRCLE, ARC, ELLIPSE(64 선분), SPLINE(조절점을 잇는 선분), TEXT, MTEXT(서식 코드 `\P`, `\f…;`, `{}` 제거), DIMENSION(가리키는 `*D` 블록의 내용을 펼침), INSERT(블록을 위치·배율·회전으로 펼침, 깊이 8까지). 그 밖은 `skipped`에 종류별 개수. `$INSUNITS` 1=인치(×25.4), 2=피트(×304.8), 4=mm, 5=cm(×10), 6=m(×1000), 없거나 0이면 mm로 본다. 엔티티는 20만 개까지 읽고 넘으면 `too-large`.

`tests/dxf-helpers.ts`는 `dxf(sections)`로 시험용 DXF 글을 만든다.

- [ ] **Step 1:** 시험을 쓴다.

```ts
// one LINE (0,0)→(10,5) → one 'line' entity, bounds min [0,0] max [10,5]
// CRLF line ends and leading spaces before group codes parse the same
// $INSUNITS 1 with a LINE of length 1 → length 25.4
// LWPOLYLINE with flag 1 → closed true; a bulge of 1 between two points → a half circle flattened into ≥ 8 segments
// CIRCLE, ARC angles kept in degrees
// MTEXT "{\\fArial;Hello}\\PWorld" → value "Hello\nWorld"
// INSERT of a block holding one LINE, scale 2, rotation 90, at (10,0) → the line lands rotated and scaled
// DIMENSION pointing at block *D1 holding a LINE and a TEXT "25" → both appear
// 3DFACE and HATCH → skipped { '3DFACE': 1, HATCH: 1 }
// a file with no ENTITIES section → status 'ok', entities [], bounds null
// text that is not group-code pairs → 'broken'; 0 bytes → 'empty'
// closedOutlines: a closed polyline and a circle give two rings; an open polyline gives none
// a block that inserts itself stops at depth 8 and does not hang
```

- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다. 글은 UTF-8로 읽고, 실패하면 Latin-1로 읽는다(`TextDecoder`는 Node·브라우저 공통).
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): DXF reader with text and dimensions`

### Task 9: 치수 재기

**Files:**

- Create: `src/measure.ts`, `tests/measure.test.ts`

**Interfaces:**

- Consumes: `EvaluatedPart`, `DrawingPart`, `Mesh`
- Produces:

```ts
function distance(a: Vec3, b: Vec3): number
type SnapPoint = { at: Vec3; kind: 'vertex' | 'end' | 'center' | 'mid' }
function snapPointsOfDrawing(part: DrawingPart): SnapPoint[] // line ends and mids, circle/arc centres, polyline vertices; world space
function snapPointsOfMesh(mesh: Mesh, limit?: number): SnapPoint[] // unique vertices, at most `limit` (default 5000, evenly thinned)
function nearestSnap(points: SnapPoint[], to: Vec3, within: number): SnapPoint | null
function entityMeasure(entity: DrawingEntity): { kind: 'length' | 'diameter'; value: number } | null
// line → length; polyline → total length; circle → diameter; arc → diameter; text → null
function partSize(evaluated: EvaluatedPart): { width: number; depth: number; height: number } | null
function formatMm(value: number): string // "12", "12.5", "12.35": at most 2 decimals, no trailing zeros
```

- [ ] **Step 1:** 시험을 쓴다(값 예: `distance([0,0,0],[3,4,12])` → 13, 원 반지름 5 → `{kind:'diameter', value:10}`, `formatMm(12.345)` → `'12.35'`, `formatMm(12)` → `'12'`, `nearestSnap`은 범위 밖이면 null, 그림의 위치·회전이 달라붙는 점에 반영된다).
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): measuring helpers`

### Task 10: 치수 도면

**Files:**

- Create: `src/sheet.ts`, `src/silhouette.ts`, `tests/sheet.test.ts`

**Interfaces:**

- Consumes: `evaluateDocument`, `Kernel`, `formatMm`
- Produces:

```ts
interface SheetLabels {
  front: string
  top: string
  side: string
  title: string
  date: string
  scale: string
}
interface SheetResult {
  svg: string
  scale: string
  widthMm: 297
  heightMm: 210
  rows: { name: string; width: string; depth: string; height: string }[]
} // one row per visible top-level solid part
function chooseScale(sizeMm: number, roomMm: number): { label: string; factor: number }
// from 1:1, 1:2, 1:5, 1:10, 1:20, 1:50, 1:100, 1:200, 1:500, 1:1000 and 2:1, 5:1, 10:1 — the largest that fits
function makeSheet(doc: CadDocument, evaluated: EvaluatedPart[], labels: SheetLabels): SheetResult
function viewOutline(mesh: Mesh, view: 'front' | 'top' | 'side'): number[][] // sharp and silhouette edges as 2D segments [x0,y0,x1,y1]
```

A4 가로(297×210mm), 여백 10mm, 오른쪽 아래에 표제란(제목·날짜·축척). 입체가 있으면 앞·위·옆 세 그림과 전체 가로·세로·높이 치수선, 그림(`DrawingPart`)만 있으면 위에서 본 한 그림과 전체 가로·세로 치수선. SVG는 검은 선·흰 바탕이고 외부 글꼴을 가리키지 않는다(`font-family="sans-serif"`). 글은 XML로 이스케이프한다.

- [ ] **Step 1:** 시험을 쓴다.

```ts
expect(chooseScale(100, 120).label).toBe('1:1')
expect(chooseScale(5000, 120).label).toBe('1:50')
expect(chooseScale(10, 120).label).toBe('10:1')
// a 40×20×10 box → svg contains the three view labels, and dimension texts "40", "20", "10"
// rows → [{ name, width: '40', depth: '20', height: '10' }]
// svg starts with '<svg' and has viewBox="0 0 297 210"; parses as XML (no unescaped & or <) when the title is 'A & <B>'
// a document with only a DrawingPart (line 0,0→100,50) → one view, texts "100" and "50", no side label
// an empty document → an svg with only the title block, rows []
// hidden parts are neither drawn nor listed
// viewOutline(box, 'top') → 4 segments
```

- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** 구현한다. `viewOutline`은 이웃한 두 면의 각이 30°보다 큰 모서리와, 보는 방향에 대해 앞·뒤 면이 만나는 모서리를 낸다. 가려진 선은 지우지 않는다(만드는 사람의 판단으로 점선 처리는 하지 않는다).
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(cad-engine): dimension sheet as SVG`

### Task 11: 마무리와 결정 기록

**Files:**

- Create: `docs/tracking/decisions/0101-hanpan-cad-tab.md`
- Modify: `docs/tracking/decisions/index.md`, `packages/cad-engine/AGENTS.md`, `tools/gen-third-party-notices.mjs`가 만드는 `THIRD-PARTY-NOTICES.txt`(다시 생성)

- [ ] **Step 1:** 결정 기록을 쓴다(한국어, `## 맥락` / `## 결정` / `## 택하지 않은 것` / `## 결과`). 내용: AI 도면 탭을 `apps/cad` + `packages/cad-engine`으로 한판 저장소에서 새로 만든다, DWG·STEP 없이 낸다, `.ttukcad`는 한판용 새 형식이다, 운영체제 파일 연결을 하지 않는다. index에 한 줄 더한다.
- [ ] **Step 2:** 고지문을 다시 만든다(루트 `package.json`에서 그 스크립트 이름을 찾아 실행). `manifold-3d`와 `earcut`이 들어갔는지 확인한다.
- [ ] **Step 3:** Run: `npm run test -w @genoffice/cad-engine && npm run typecheck -w @genoffice/cad-engine && npm run licenses && npm run check:english-comments && npm run lint && npm run format:check` — Expected: 모두 통과. `format:check`가 새 파일에서 실패하면 그 파일만 `npx prettier --write`로 고친다.
- [ ] **Step 4:** Run: `npm run test:parallel` — Expected: 통과. 이 가지가 건드리지 않은 곳의 실패는 이름을 적어 보고한다.
- [ ] **Step 5:** Commit `docs: record the CAD tab decision (0101)`

**1단계 관문:** 엔진 시험 통과, `licenses` 통과, `browser-safety` 통과. 지난 뒤 실제 걸린 시간을 설계 문서 10장에 적고 2단계 계획을 쓴다.
