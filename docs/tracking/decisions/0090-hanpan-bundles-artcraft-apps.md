# 0090 한판은 PhotoCraft·VectorCraft를 공식 portable zip 그대로 Windows 설치판에 담고, 따로 실행한다

> **대체됨 → [0093](0093-hanpan-graphics-web-tabs.md)** (2026-11-06). 설치형 앱은 설치판에서 빠졌고, 웹판을 한판 탭으로 연다. 아래는 그때의 기록이다.

## 맥락

회사는 사진·일러스트를 편집하는 앱을 따로 사지 않고 한판과 함께 쓰게 하려 한다. ArtCraft 팀(github.com/storytold)이 Rust로 만든 PhotoCraft와 VectorCraft는 MIT OR Apache-2.0이고, 릴리스마다 Windows용 portable zip을 낸다. 두 앱은 거의 매일 새 버전이 나온다. 설계는 `docs/superpowers/specs/2026-11-04-hanpan-vn-securitykey-design.md` 6장에 있다.

## 결정

- **공식 릴리스의 Windows x64 portable zip을 버전과 SHA-256으로 고정해 빌드 전에 받는다.** 고정 값은 `tools/artcraft-pins.json`, 받는 도구는 `tools/fetch-artcraft.mjs`다. 받은 것은 `vendor/artcraft/<앱>/`(git에 넣지 않음)에 풀고, Windows 설치판에 `resources/artcraft/<앱>`으로 싣는다. 크기나 해시가 다르면 받기가 멈추고, 받지 않은 채 묶으면 빌드가 멈춘다.
- **프로그램은 고치지 않는다.** 다만 zip의 `portable.txt`는 지운다. 이 파일이 있으면 앱이 설정과 충돌 복구 저장을 실행 파일 옆에 쓰는데, 그 자리가 한판 설치 폴더 안이라 한판을 업데이트할 때마다 지워진다. 파일이 없으면 앱은 자기 설치판처럼 `%APPDATA%`에 쓴다.
- **홈의 버튼으로 연다.** 버튼은 프로그램이 들어 있을 때만, 화면 언어와 관계없이 보인다. 한판과 따로 실행되는 프로그램이고, 사용자가 직접 연 앱이므로 한판이 끝날 때 끝내지 않는다(`docs/security.md`의 예외).
- **업데이트는 두 앱이 닫혀 있을 때 설치한다.** 실행 중인 프로그램 파일은 Windows가 잠가서 설치 프로그램이 바꾸지 못한다. 그래서 "다시 시작하고 설치"를 누를 때 프로그램 파일이 잠겨 있으면(`EBUSY`) 다시 시작하지 않고, 닫은 뒤 다시 누르라고 알린다. 사용자의 작업을 잃을 수 있으므로 한판이 두 앱을 강제로 닫지는 않는다.
- **화면에는 각 앱의 이름을 그대로 쓰고 일반 그림을 붙인다.** ArtCraft 로고를 한판 것처럼 쓰지 않고, 다른 회사 제품을 대신한다고 말하지 않는다.
- **고지를 함께 싣는다.** 각 앱의 LICENSE-MIT·LICENSE-APACHE·NOTICE, 자료 목록(ATTRIBUTION.md·ASSETS.md), 함께 담긴 글꼴의 OFL, `licenses/` 폴더의 글을 THIRD-PARTY-NOTICES.txt 8절에 싣는다. 두 앱에 같은 글은 한 번만 적는다. 폴더째 싣기 때문에 원본 파일도 설치 폴더에 남는다.
- **Windows 설치판에만 싣는다.** Mac·Linux 빌드에는 넣지 않는다.

## 택하지 않은 것

- **각 앱의 MSI를 함께 설치하기.** 설치 단계가 늘고, 제거와 업데이트가 한판과 따로 논다.
- **웹판(WASM)을 한판 창의 탭으로 넣기.** 데스크톱판보다 느리고 파일 접근이 좁으며 일이 더 크다. 나중 단계로 둔다.
- **링크만 두기.** 사용자가 따로 찾아 설치해야 하고, 비슷한 이름의 비공식 배포처가 있다.

## 결과

- Windows 설치판이 압축 기준 약 275MB 커진다. 풀린 크기는 약 550MB다.
- 앱 버전을 올릴 때는 pins의 tag·asset·size·sha256을 함께 바꾸고, 받은 내용을 보고 exe와 licenseDir를 확인한다.
- 받은 앱이 Windows에서 켜지는지, 한글 파일 이름과 글꼴이 제대로 나오는지, VectorCraft가 PDF 호환 .ai를 여는지 사람이 확인한다. 통과하지 못한 앱은 pins와 빌드에서 뺀다.
