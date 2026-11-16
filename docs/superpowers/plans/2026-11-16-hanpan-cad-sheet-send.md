# 한판 AI 도면 4단계(치수 재기·치수 도면·문서로 보내기) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사람이 두 점을 눌러 길이를 재고, 치수 도면을 미리 보고, 그림으로 복사하거나 "한글로 보내기"(한국어 문서 기능이 꺼져 있으면 "워드로 보내기")로 치수 도면과 치수 표가 든 새 문서 탭을 연다.

**Architecture:** 재기와 도면은 엔진(`measure.ts`, `sheet.ts`)이 계산하고 화면은 보여 주기만 한다. 치수 도면 SVG를 화면이 PNG로 굽고, 그림 복사는 `cad:copy-image`로 메인이 운영체제 클립보드에 넣는다. 한글로 보내기는 `cad:send-to-document`로 셸에 넘기고, 셸의 `send-drawing.ts`가 `hanpan-core`의 블록(`title`, `meta`, `image`, `table`)을 `blocksToHwp`/`blocksToDocx`로 써서 마인드맵 보내기와 같은 `openCopy`로 새 탭을 연다.

**Tech Stack:** `@genoffice/cad-engine`(`makeSheet`, `nearestSnap`, `snapPointsOfMesh`, `snapPointsOfDrawing`, `entityMeasure`, `partSize`, `formatMm`), `@genoffice/hanpan-core`(`DocBlock`, `blocksToHwp`, `blocksToDocx`, `themeFor`, `documentFileName`), Electron `clipboard`, `nativeImage`.

**Spec:** 설계 문서 2장 목표 4·5, 5-6, 7-3, 10장 4단계 관문("치수 도면이 든 새 한글 탭이 열린다").

## Global Constraints

- 2단계·3단계 계획의 Global Constraints가 그대로 적용된다.
- 치수 도면과 내보낸 그림은 항상 밝은 바탕이다(앱 테마와 무관).
- 치수 도면의 축척 목록·A4 가로·세 방향 배치는 엔진의 것을 그대로 쓴다. 화면은 표제란 칸(제목·날짜·축척)만 고칠 수 있고 그 값은 `doc.title`에 `edit` 한 번으로 들어간다.
- 보내는 그림은 10MB 이하. 넘으면 해상도를 반씩 줄여 다시 굽는다(최소 1024px 너비, 그래도 넘으면 거절과 이유).
- 단추 이름: 한국어 문서 기능이 켜져 있으면 "한글로 보내기"(hwpx), 꺼져 있으면 "워드로 보내기"(docx). 판정은 마인드맵과 같은 `applyKoreanDocFeatures`의 값.
- 보낸 문서 구성: 제목(`title` 블록: 도면 제목, 없으면 탭 제목), 날짜 줄(`meta`), 치수 도면 그림(`image`), 치수 표(`table`, 머리 줄 "이름 | 가로(mm) | 세로(mm) | 높이(mm)", 머리 줄 문구는 21개 언어).
- 마인드맵 보내기와 달리 연결 기록(`recordLink`)과 동기화는 하지 않는다. 새 탭은 제목 없는 사본이고 임시 폴더는 탭이 닫히면 지운다(마인드맵과 같은 `openCopy`·`removeDir` 규칙).

## Review Focus

1. 모형이 비었을 때 치수 도면·보내기: 단추를 끄고 이유("놓인 도형이 없습니다")를 보인다. 시험은 Task 2.
2. 재기 도중 도형을 지우거나 되돌리기: 재기 표시가 사라진 점을 가리키지 않는다(문서가 바뀌면 재기 지움). 시험은 Task 1.
3. 아주 큰 모형(1km 방)과 아주 작은 모형(1mm 핀): 축척이 목록 안에서 골라지고 도면이 A4를 넘지 않는다. 시험은 Task 2.
4. 보내기 도중 새 탭이 열리지 않음(한글 엔진 실패): 임시 폴더를 지우고 오류를 보인다. 시험은 Task 3.
5. 한국어 문서 기능 스위치를 도중에 바꿀 때: 단추 이름과 대상이 바로 따라간다. 시험은 Task 2.

---

### Task 1: 치수 재기 도구

**Files:** Create `apps/cad/src/renderer/measure/{measure-tool.ts,MeasureOverlay.tsx}`; Modify `scene/viewport.ts`(재기 표시 선·글자 층), `components/Ribbon.tsx`(치수 재기 단추 보이기), i18n. Test: `apps/cad/tests/measure-tool.test.ts`.

**Interfaces:** `class MeasureTool { constructor(snaps: () => SnapPoint[]); hover(p: Vec3): SnapPoint | null; click(p: Vec3): MeasureReading | null; clear(): void }`, `MeasureReading = { a: Vec3; b: Vec3; length: number; label: string }`(`formatMm` + " mm"). 그물의 달라붙는 점은 `snapPointsOfMesh`(5000개 한도), 도면은 `snapPointsOfDrawing`. 원·호를 누르면 `entityMeasure`의 지름을 "⌀"과 함께 보인다. Esc나 문서 변화(`history.revision()`)에 지운다.

- [ ] Step 1 시험: `two clicks on box corners read the edge length`, `clicking a DXF circle reads its diameter with ⌀`, `a change to the document clears the reading`, `Esc clears the reading`.
- [ ] Step 2: FAIL → 구현 → PASS. 커밋 `feat(cad): measure distances, lengths and diameters`.

### Task 2: 치수 도면 미리보기와 그림 복사

**Files:** Create `apps/cad/src/renderer/sheet/{SheetDialog.tsx,sheet-png.ts}`; Modify `apps/cad/src/main/cad-main.ts`(`cad:copy-image`: `clipboard.writeImage(nativeImage.createFromBuffer(png))`, PNG 머리 바이트를 확인하고 10MB 넘으면 거절), preload, `components/Ribbon.tsx`(치수 도면·그림 복사·보내기 단추), i18n. Test: `apps/cad/tests/{sheet-dialog,sheet-png,main-copy-image}.test.ts`.

**Interfaces:** `sheetFor(doc, evaluated, labels): SheetResult`(엔진 `makeSheet` 감싸기, 표제란 빈칸은 탭 제목·오늘 날짜로 채움), `svgToPng(svg: string, widthPx: number): Promise<Uint8Array>`(오프스크린 `<img>` + 캔버스, 흰 바탕), `fitUnder(bytesLimit, render: (w) => Promise<Uint8Array>): Promise<Uint8Array | null>`. 대화 상자: 도면 미리보기(SVG를 `<img src="data:image/svg+xml">`로), 표제란 세 칸, 단추 "그림 복사", "한글로 보내기"/"워드로 보내기", "닫기". 리본의 그림 복사는 지금 3D 화면 PNG(3단계 `exportPng`)를 복사한다.

- [ ] Step 1 시험: `empty model disables the sheet with a reason`, `title block edits are one undo step`, `a 1 km room and a 1 mm pin both pick a scale from the list`, `fitUnder halves the width until under the limit and gives up below 1024`, `copy-image refuses bytes that are not PNG`, `the send button follows the Korean document switch`.
- [ ] Step 2: FAIL → 구현 → PASS. 커밋 `feat(cad): dimension sheet preview and copy as picture`.

### Task 3: 한글로 보내기

**Files:** Create `apps/shell/src/main/hanpan/send-drawing.ts`; Modify `apps/shell/src/main/hanpan/setup.ts`(마인드맵 `createMapSender`와 같은 의존성으로 `createDrawingSender`), `apps/shell/src/main/index.ts`(`setCadSendToDocumentHook((wc, req) => hanpan.sendDrawing(req, wc))`), `apps/cad/src/main/cad-main.ts`(`setCadSendToDocumentHook`, `cad:send-to-document` 처리), preload. Test: `apps/shell/tests/send-drawing.test.ts`, `apps/cad/tests/main-send.test.ts`.

**Interfaces:** `SendToDocumentRequest`(ipc.ts)에 `target: 'hwp' | 'docx'`를 더한다. `checkDrawingRequest(raw: unknown): SendToDocumentRequest`(제목 200자, 표 500줄·4칸, PNG 머리 바이트, 10MB 한도), `drawingBlocks(req, date: string): DocBlock[]`, `createDrawingSender(deps: Omit<SendMapDeps, 'buildDeck' | 'recordLink'>)` → `(raw, contents) => Promise<SendToDocumentResult>`.

- [ ] Step 1 시험: `blocks are title, date, image, table in that order`, `a request with a non-PNG picture is refused`, `docx target writes a docx that the docx engine reads back with one image and one table`, `hwp target writes hwpx bytes (engine faked) and opens an hwp copy`, `when the tab does not open the temp folder is removed`.
- [ ] Step 2: FAIL → 구현 → PASS(`npm run test -w @genoffice/shell`, `-w @genoffice/cad`). 커밋 `feat(cad): send the dimension sheet to a new Hangul or Word document`.

### Task 4: 4단계 관문 e2e

- [ ] `e2e/cad-tab.spec.ts`에 더한다: `measure reads 80 mm on an 80 mm box`, `send to Hangul opens a new hwp tab` (한국어 문서 기능 켬, 새 탭 종류가 `hwp`이고 제목이 도면 제목), `send to Word when Korean document features are off opens a docs tab`.
- [ ] `npm run build:all` 뒤 `npx playwright test e2e/cad-tab.spec.ts` PASS. 보낸 한글 탭을 찍어 그림과 표가 보이는지 눈으로 확인한다. 전체 검사 PASS. 커밋 `test(e2e): cad sheet and send gate`.
