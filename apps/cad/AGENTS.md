# apps/cad (`@genoffice/cad`)

AI 도면 편집기다. 간단한 3D 모형과 DXF 도면을 `.ttukcad` 파일로 열고 고치고 저장한다. 화면에 보이는 이름은 "AI 도면"(영어 "AI Drawing")이다. 모형 계산·파일 읽고 쓰기·치수 도면은 `packages/cad-engine`이 하고, 이 모듈은 화면·메인 프로세스·AI 창을 맡는다. 설계는 `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md`, 결정은 0101이다.

## 맡은 범위

- 렌더러(`src/renderer/`)
  - `document/`: 열려 있는 문서 하나(`session.ts`: `CadHistory`, 저장할 바이트, 바뀜 표시), 열기 결과를 문서로 바꾸기(`open.ts`), 복구 사본(`recovery-copies.ts`), 자동 저장(`autosave.ts`).
  - `import/three-mesh.ts`: 3MF·GLB·PLY를 three의 읽기 코드로 읽어 엔진 그물 하나로 바꾼다(색·재질 버림, GLB는 m→mm·+Y 위→+Z 위).
  - `export/`: STL·OBJ·PNG 내보내기 바이트(`export.ts`)와 메뉴 요청을 받는 훅(`use-export.ts`).
  - `components/GuideScreen.tsx`: DWG·STEP·IGES·BREP을 열면 보이는 "이 파일을 여는 방법" 안내.
  - `scene/`: three.js 3D 화면(`viewport.ts`), 테마별 3D 색 표(`canvas-colors.ts`), 3D를 못 쓰는 PC의 안내 화면(`NoWebGl.tsx`).
  - `i18n/`: 21개 언어 문구(`app/<언어>.ts`, AI 창 문구는 `ai/<언어>.ts`).
- 메인 프로세스(`src/main/cad-main.ts`): 뷰 만들기, 뷰마다 허용된 경로, 열기·저장, 닫기 전 저장 확인, 이름 바뀜 따라가기, 단독 실행. 복구 사본 저장소는 `recovery-main.ts`, 메인 문구는 `i18n-main.ts`, 앱 안 MCP 서버의 질문은 `mcp-queries.ts`.
- IPC 계약 `src/shared/ipc.ts`(`CAD_CHANNELS`). 이 편집기의 창구 이름과 주고받는 자료의 모양이 전부 여기 있다.

## 맡지 않는 것 (경계)

- 모형 자료, 되돌리기 기록, 입체 계산, 파일 형식은 `packages/cad-engine`의 범위다. 엔진의 문제를 여기서 돌려 막지 않는다.
- 탭, 창, 메뉴, 홈 화면, 열기 대화 상자의 확장자 목록은 `apps/shell`의 범위다. 이 모듈은 셸이 부르는 함수(`createCadView`, `requestCadSave`, `requestCadClose`, `sendCadMenuCommand` 등)를 내보낼 뿐이다.
- 공용 `ai:*` 창구는 `apps/docs/src/main/docs-main.ts`가 등록한다. 이 모듈은 부르기만 한다.
- 화면 틀의 색(토큰)은 `packages/ui`의 범위다.

## 항상 지켜야 하는 것

- **모형을 고치는 길은 `CadHistory.edit` 하나다.** 리본, 단축키, 속성 창, 손잡이, AI가 모두 같은 길로 고친다. AI 요청 하나는 `openGroup`·`closeGroup` 사이에 넣어 되돌리기 한 번으로 돌아가게 한다.
- **`ok`로 열리지 않은 파일에는 쓰지 않는다.** 경로가 저장 대상이 되는 것은 메인 프로세스가 그 `.ttukcad`를 엔진으로 직접 열어 `ok`를 본 뒤다.
- **`.ttukcad`가 아닌 파일(DXF·STL·OBJ·3MF·GLB·PLY)에는 절대 쓰지 않는다.** 그 내용으로 제목 없는 문서를 열고, 저장은 항상 새 `.ttukcad`를 묻는다. DWG·STEP·IGES·BREP은 읽지도 않고 안내만 보인다.
- **내보내기(`cad:export-file`)는 이 뷰가 연 파일이나 저장한 파일 경로에 쓰지 않는다.** 고른 이름에 형식의 확장자를 붙이고, 경로를 허락하거나 저장 대상으로 바꾸지 않는다.
- **저장 바이트는 메인이 다시 열어 본다.** `openCadFile`이 `ok`가 아니면 쓰지 않고 거절한다.
- **복구 사본은 저장과 같은 바이트이고, 쓰는 일이 문서 상태를 바꾸지 않는다(결정 0061).**
- **창구 이름은 `cad:`로 시작한다.** `src/shared/ipc.ts`에 이미 있는 이름을 쓴다.
- **운영체제 파일 연결을 하지 않는다.** `.ttukcad`·`.dxf`·`.stl`을 더블클릭해 한판이 열리게 등록하지 않는다(결정 0093과 같은 이유).
- **화면 틀의 색은 토큰만 쓴다.** 3D 화면의 바닥·격자·선택 색은 `scene/canvas-colors.ts` 표에서 테마별로 읽는다. 도형 색은 문서 내용이라 두 테마에서 같다. 내보낸 그림과 치수 도면은 항상 밝은 바탕이다.
- **3D를 못 쓰는 PC에서 빈 화면이나 멈춤으로 보이지 않는다.** WebGL을 만들지 못하면 이유와 할 수 있는 일을 적은 화면을 보여 준다.
- 다른 프로그램의 이름·아이콘·견본 파일을 저장소에 넣지 않는다. 시험용 파일은 시험 코드가 엔진으로 만든다.
- 메인 코드는 셸 번들에 들어간다. `src/main`을 고친 뒤에는 셸을 다시 빌드한다.

## 용어집

번역은 이 표를 따른다(6단계에서 21개 언어 열을 채운다).

| 한국어      | 영어            | 뜻                                   |
| ----------- | --------------- | ------------------------------------ |
| AI 도면     | AI Drawing      | 이 편집기의 이름                     |
| 도형        | shape           | 상자·원기둥 같은 기본 입체           |
| 구멍        | hole            | 다른 도형에서 빼는 도형              |
| 묶기 / 풀기 | group / ungroup | 여러 도형을 하나로 다루기            |
| 줄 맞추기   | align           | 도형을 한 축의 기준에 맞추기         |
| 작업판      | workplane       | 도형을 놓는 바닥 판                  |
| 치수 도면   | dimension sheet | 세 방향 그림과 치수를 넣은 A4 도면   |
| 표제란      | title block     | 도면 오른쪽 아래의 제목·날짜·축척 칸 |
| 축척        | scale           | 도면 길이와 실제 길이의 비           |
