# 0093 AI 포토·AI 일러스트는 PhotoCraft·VectorCraft 웹판을 한판 탭에 넣고, 탭 안의 AI가 페이지 API로 고친다

0090을 대체한다.

> **일부 대체됨 → [0098](0098-hanpan-graphics-look.md)** (2026-11-11). "앱 안의 PhotoCraft·VectorCraft 이름은 그대로 둔다"만 바뀌었다: 한판 안에서는 화면 틀에 원본 이름·로고를 보이지 않는다(정보 창과 고지는 남김). 나머지는 이 기록 그대로다.

## 맥락

0090은 PhotoCraft·VectorCraft의 Windows 설치형 앱을 한판 설치판에 담고 홈에서 별도 창으로 띄웠다. 한판의 AI는 그 앱을 다룰 수 없었고, 탭도 아니었다. 사용자(저장소 주인)는 2026-11-05에 AI 워드·AI 엑셀처럼 홈에서 탭으로 열고 탭의 AI 도우미에게 일을 시키기를 원했다. 두 앱은 웹판(WebAssembly)도 낸다. VectorCraft 웹판에는 페이지 제어 API(`window.vectorcraft`)가 있고, PhotoCraft는 같은 API를 이식하는 작은 수정이 필요하다. 설계는 `docs/superpowers/specs/2026-11-05-hanpan-ai-photo-illust-design.md`에 있다.

## 결정

- **웹판을 탭으로 연다.** 탭 종류 `photo`(AI 포토)와 `illust`(AI 일러스트)를 편집기 패키지 `apps/graphics` 하나가 맡는다. 웹판은 같은 출처의 iframe으로 띄우고, 앱마다 다른 호스트(`genoffice-app://photo/`, `genoffice-app://illust/`)를 써서 저장 공간이 섞이지 않게 한다. 탭 하나에 문서 하나다.
- **웹판은 `tenaico/hanpan-graphics`의 고정 버전을 받는다.** 그 저장소가 원본을 고정 커밋으로 받아 패치(PhotoCraft 페이지 API, 한글 글꼴, ArtCraft 상표 정리, 한판 안의 embedded 모드)를 입혀 빌드한다. 한판은 릴리스 자산을 버전·크기·SHA-256으로 고정해 빌드 전에 받는다(`tools/fetch-graphics-web.mjs`, `tools/graphics-web-pins.json`).
- **디스크에 쓰는 것은 한판 main의 저장 흐름뿐이다.** 웹판에는 파일 시스템이 없다. 웹판이 내보낸 파일은 가로채서 main의 저장 대화상자와 `atomicWriteFile`로 쓴다.
- **탭 안의 AI 도우미가 페이지 API로 문서를 직접 고친다.** 저장·외부 링크·환경설정·플러그인 같은 명령은 AI에게 막는다. 요청 하나가 바꾼 것은 한 번에 되돌린다. AI 없이 바로 실행하는 빠른 작업 단추를 앱마다 셋 둔다.
- **모든 운영체제에 싣는다.** 웹판은 운영체제를 가리지 않는다.
- **운영체제 파일 연결은 하지 않는다.** `.psd`·`.svg` 등을 더블클릭해 한판으로 여는 등록을 하지 않는다. 다른 그래픽 프로그램 사용자의 설정을 빼앗지 않는다. 한판 안의 열기, 끌어다 놓기, 폴더 목록에서만 연다.
- **이름은 "AI 포토", "AI 일러스트"다.** 앱 안의 PhotoCraft·VectorCraft 이름은 그대로 둔다. ArtCraft 이름·로고는 한판 이름·화면·마케팅에 쓰지 않는다(고지의 출처 문장만).

## 택하지 않은 것

- **설치형 앱을 지금처럼 띄우고 공식 MCP bridge로 AI가 조종하기.** 수정은 필요 없지만 탭이 아니다.
- **탭에는 웹판, AI는 뒤에서 headless로 파일을 고치고 탭이 다시 읽기.** 실시간이 아니고, 선택 영역과 되돌리기가 이어지지 않는다.

## 결과

- Windows 설치판이 약 275MB 줄고, 모든 운영체제 판에 웹판 두 개가 더해진다.
- 설치형 앱 때문에 있던 것들이 빠진다: 업데이트 때 열린 앱을 확인하는 EBUSY 검사, 홈의 별도 창 카드, `hanpan:artcraft-*` 창구, 제3자 고지 8절(웹판 고지로 바뀜).
- 원본을 따라갈 때는 `tenaico/hanpan-graphics`에서 패치를 다시 입혀 새 판(`-h<n>`)을 내고, 한판은 핀을 바꾼다.
- 웹판은 PC에 설치된 글꼴을 쓰지 못하고, wasm32 메모리 한도(4GB) 때문에 아주 큰 PSD는 설치형보다 먼저 막힐 수 있다.
