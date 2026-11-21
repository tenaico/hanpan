# apps/cad (`@genoffice/cad`)

AI 도면 편집기다. 간단한 3D 모형과 DXF·DWG 도면을 `.ttukcad` 파일로 열고 고치고 저장한다. 화면에 보이는 이름은 "AI 도면"(영어 "AI Drawing")이다. 모형 계산·파일 읽고 쓰기·치수 도면은 `packages/cad-engine`이 하고, 이 모듈은 화면·메인 프로세스·AI 창을 맡는다. 설계는 `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md`, 결정은 0101과 0102(DWG 열기, 선·글자 고치기)다.

## 맡은 범위

- 렌더러(`src/renderer/`)
  - `App.tsx`: 편집기 화면 한 장(위 리본, 알림 줄, 가운데 3D 화면 또는 안내 화면, 오른쪽 속성 창과 AI 도우미 자리, 아래 상태 줄). `main.tsx`는 시작점이다.
  - `document/`: 열려 있는 문서 하나(`session.ts`: `CadHistory`, 저장할 바이트, 바뀜 표시), 열기 결과를 문서로 바꾸기(`open.ts`), 복구 사본(`recovery-copies.ts`), 자동 저장(`autosave.ts`).
  - `components/`: 리본(`Ribbon.tsx`, 탭 파일·홈·보기·치수·도면·도움말), 리본 단추가 여는 작은 창(`RibbonMenu.tsx`), 도형 15종 고르기(`ShapeGallery.tsx`), 줄 맞추기 9가지(`AlignMenu.tsx`), 직접 그리기 막대(`SketchBar.tsx`), 속성 창(`PropertyPanel.tsx`), 상태 줄(`StatusBar.tsx`), 이 앱이 직접 그린 아이콘(`icons.tsx`), STEP·IGES·BREP을 열면 보이는 "이 파일을 여는 방법" 안내(`GuideScreen.tsx`).
  - `editing/`: 리본·단축키·메뉴·속성 창이 하는 편집(`commands.ts`, 명령 하나는 `edit` 한 번), 선택(`selection.ts`), 단축키(`shortcuts.ts`), 직접 그리기의 점 모으기와 검사(`sketch.ts`), 글자 도형의 윤곽(`text-outlines.ts`, 한판에 든 OFL 글꼴), 받은 도면의 선·글자를 고르고 지우기·옮기기·글자 바꾸기(`entity-edit.ts`, 아래 막대 `EntityEditBar.tsx`, 리본 **선 고치기**).
  - `scene/`: three.js 3D 화면(`viewport.ts`), 보기 단추와 전체 보기(`camera.ts`), 손잡이 끌기(`handles.ts`), 누른 도형 찾기(`picking.ts`), 그릴 것 정리(`scene-model.ts`), 입체 계산기와 결과 기억(`evaluator.ts`), DXF 선 그리기(`drawing-lines.ts`), PNG 그림(`snapshot.ts`), 테마별 3D 색 표(`canvas-colors.ts`), 3D를 못 쓰는 PC의 안내 화면(`NoWebGl.tsx`).
  - `measure/`: 치수 재기 도구(`measure-tool.ts`: 두 점 거리, DXF 선 길이, 원·호 지름. 계산은 엔진)와 화면 위 막대(`MeasureOverlay.tsx`).
  - `sheet/`: 치수 도면 대화 상자(`SheetDialog.tsx`), 도면 PNG(`sheet-png.ts`), 그림 복사와 한글·워드로 보내기(`send.ts`), 보낼 곳 고르기(`use-send-target.ts`, 결정 0091의 한국 문서 기능 스위치를 따른다).
  - `import/three-mesh.ts`: 3MF·GLB·PLY를 three의 읽기 코드로 읽어 엔진 그물 하나로 바꾼다(색·재질 버림, GLB는 m→mm·+Y 위→+Z 위).
  - `export/`: STL·OBJ·PNG 내보내기 바이트(`export.ts`)와 메뉴 요청을 받는 훅(`use-export.ts`).
  - `ai/`: AI 도우미. 창(`AiPanel.tsx`: 대화, 입력 칸, 답의 단계 표시, 요청 하나를 `openGroup`·`closeGroup`으로 묶기), 속성 창 아래 자리와 접힌 막대·열림 기억(`AiDock.tsx`, 리본의 **AI 도우미** 단추와 같이 연다), 입력 칸 위 빠른 실행 셋(`QuickActions.tsx`: 치수 도면 만들기, 방 배치 시작, 한글·워드로 보내기), 공용 `ai:*` 창구로 보내고 받기(`transport.ts`), 실패한 실행의 연결 상태와 사용량 보고(`connection.ts`), 구독 연결 상태와 연결 카드(`subscription-client.ts`), 답할 언어 지시(`lang-directive.ts`), skill(`cad-skill.ts`: 영어 지시문, 도구 10개의 설명), 도구가 문서를 고치는 일(`cad-tools.ts`, 고치는 도구 호출 하나는 `edit` 한 번. 도면 요소는 `read_drawing`·`edit_drawing`이 번호로 다루고, 읽은 뒤 도면이 바뀌었으면 `rev`가 달라 고치기를 거절한다). 화면 모양은 `ai-panel.css`.
  - `i18n/`: 21개 언어 문구(`app/<언어>.ts`를 `strings-app.ts`가, `ai/<언어>.ts`를 `strings-ai.ts`가 모으고 `strings.ts`가 합친다), 현재 언어(`locale.tsx`). 낱말은 아래 용어집을 따른다.
- 메인 프로세스(`src/main/`): `cad-main.ts`(뷰 만들기, 뷰마다 허용된 경로, 열기·저장, 닫기 전 저장 확인, 이름 바뀜 따라가기, 단독 실행), `recovery-main.ts`(복구 사본 저장소), `i18n-main.ts`(메인 문구), `mcp-queries.ts`(앱 안 MCP 서버의 질문: 모형 요약, 저장할 바이트), `atomic-write.ts`(파일을 끊김 없이 쓰기), `index.ts`(셸에 내보내는 함수 목록).
- preload `src/preload/index.ts`: 화면에 `window.cadApi`를 건넨다.
- IPC 계약 `src/shared/ipc.ts`(`CAD_CHANNELS`). 이 편집기의 창구 이름과 주고받는 자료의 모양이 전부 여기 있다. AI 구독 연결(Claude·Codex)의 요청과 답의 모양은 `src/shared/subscription-api.ts`에 있다. 처리기는 docs 메인이 앱 전체에 한 번 등록하고, 이 편집기는 부르기만 한다.
- 시험 `tests/`(jsdom). three의 그리기 부분은 가짜로 바꾸고 문서·저장·복구·편집·AI 도구를 본다. e2e는 루트 `e2e/cad-tab.spec.ts`.

## 맡지 않는 것 (경계)

- 모형 자료, 되돌리기 기록, 입체 계산, 파일 형식은 `packages/cad-engine`의 범위다. 엔진의 문제를 여기서 돌려 막지 않는다.
- 탭, 창, 메뉴, 홈 화면, 열기 대화 상자의 확장자 목록은 `apps/shell`의 범위다. 이 모듈은 셸이 부르는 함수(`createCadView`, `requestCadSave`, `requestCadClose`, `sendCadMenuCommand` 등)를 내보낼 뿐이다.
- 공용 `ai:*` 창구는 `apps/docs/src/main/docs-main.ts`가 등록한다. 이 모듈은 부르기만 한다.
- 화면 틀의 색(토큰)은 `packages/ui`의 범위다.

## 항상 지켜야 하는 것

- **모형을 고치는 길은 `CadHistory.edit` 하나다.** 리본, 단축키, 속성 창, 손잡이, AI가 모두 같은 길로 고친다. AI 요청 하나는 `openGroup`·`closeGroup` 사이에 넣어 되돌리기 한 번으로 돌아가게 한다.
- **`ok`로 열리지 않은 파일에는 쓰지 않는다.** 경로가 저장 대상이 되는 것은 메인 프로세스가 그 `.ttukcad`를 엔진으로 직접 열어 `ok`를 본 뒤다.
- **`.ttukcad`가 아닌 파일(DXF·DWG·STL·OBJ·3MF·GLB·PLY)에는 절대 쓰지 않는다.** 그 내용으로 제목 없는 문서를 열고, 저장은 항상 새 `.ttukcad`를 묻는다. STEP·IGES·BREP은 읽지도 않고 안내만 보인다.
- **도면 요소는 번호로 가리키므로, 번호를 쥔 쪽은 도면이 바뀌면 그 번호를 버린다.** 선 고치기는 자기가 하지 않은 변경이 오면 고른 것을 버리고, AI는 `rev`가 맞을 때만 고친다.
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

번역은 이 표를 따른다. 리본·속성 창·상태 줄·AI 창·메인 프로세스 대화 상자·셸(홈 카드, 메뉴, 파일 형식 이름)·도움말 주제 `cad`가 모두 같은 낱말을 쓴다. `tests/glossary.test.ts`가 언어별 용어 표를 읽어 문구와 맞는지 본다.

| 한국어        | 영어               | 뜻                                       |
| ------------- | ------------------ | ---------------------------------------- |
| AI 도면       | AI Drawing         | 이 편집기의 이름                         |
| 도형          | shape              | 상자·원기둥 같은 기본 입체, 놓인 것 하나 |
| 구멍          | hole               | 다른 도형에서 빼는 도형                  |
| 묶기          | group              | 여러 도형을 하나로 다루기                |
| 풀기          | ungroup            | 묶음을 다시 도형 여럿으로 나누기         |
| 줄 맞추기     | align              | 도형을 한 축의 기준에 맞추기             |
| 작업판        | workplane          | 도형을 놓는 바닥 판                      |
| 치수 도면     | dimension sheet    | 세 방향 그림과 치수를 넣은 A4 도면       |
| 표제란        | title block        | 도면 오른쪽 아래의 제목·날짜·축척 칸     |
| 축척          | scale              | 도면 길이와 실제 길이의 비               |
| 치수 재기     | measure            | 두 점 거리, 선 길이, 원 지름을 재는 도구 |
| 직접 그리기   | sketch             | 점을 찍어 윤곽을 그리고 세우는 도구      |
| 문서로 보내기 | send to a document | 치수 도면을 한글·워드 문서로 보내기      |

### 언어별 용어

21개 언어 열은 `src/renderer/i18n/glossary.md`에 있다(한자가 들어 있어 영어 전용 검사가 보지 않는 `i18n/` 아래에 둔다). 새 문구를 넣거나 고칠 때 그 표의 낱말을 쓰고, 표를 바꾸면 `tests/glossary.test.ts`를 돌린다.
