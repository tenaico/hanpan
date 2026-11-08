# 0095 공유하기는 운영체제 공유 창을 열고, Windows에서는 작은 C# 도우미가 띄운다

## 맥락

0.17에서 "공유하기"를 넣는다. 사용자가 원하는 것은 카카오톡·메일·근거리 공유 같은 앱을 고르는 운영체제의 공유 창이다. macOS는 Electron이 `ShareMenu`를 준다. Windows는 Electron에 공유 API가 없다. 데스크톱 앱이 Windows 공유 창을 열려면 `IDataTransferManagerInterop`(`GetForWindow`, `ShowShareUIForWindow`)로 `DataTransferManager`를 얻고, `DataRequested`에서 파일(`StorageFile`)을 넣어야 한다.

## 결정

- **Windows는 C# 도우미 `win-share.exe`가 공유 창을 연다.** 소스는 `apps/shell/src/main/share/win-share.cs`, 빌드는 `build-win.mjs`다. Windows에 기본으로 있는 .NET Framework 컴파일러(csc.exe)와 Windows SDK의 `Windows.winmd`로 만든다. 이미 쓰는 `win-ocr.exe`(PDF OCR)·`win-quicklook.exe`와 같은 방식이다. 설치판의 `resources/share/win-share.exe`로 들어간다(asar 밖이라 따로 풀 필요가 없다).
- **도우미는 자기 창에 공유 창을 붙인다.** `GetForWindow`는 다른 프로세스의 창 핸들을 받지 않는다(Windows 11 26100에서 Electron 창 대신 다른 프로세스 창을 넘기면 `E_ACCESSDENIED`). 그래서 도우미가 보이지 않고 클릭이 통과하는 창을 한판 창 위에, 한판 창을 주인으로 띄우고 거기에 공유 창을 붙인다. 공유 창은 한판 창 가운데에 뜬다.
- **도우미는 공유 창이 떠 있는 동안 살아 있다.** 받는 앱이 파일을 읽을 수 있어야 하기 때문이다. 공유 창이 닫히면(숨김·클로킹) 2초 뒤, 앱을 고르면 15초 뒤, 길어도 30분 뒤 끝난다. 다시 공유하면 앞의 도우미를 끝내고, 한판이 꺼지면 표준 입력이 닫혀 바로 끝난다.
- **공유하는 것은 디스크의 파일이다.** 저장하지 않은 변경이 있거나 아직 파일이 없는 문서는 "저장하고 공유"를 물은 뒤 그 탭의 저장(제목 없는 문서는 다른 이름으로 저장)을 돌리고, 탭이 저장됐다고 알릴 때 공유 창을 연다. 저장 창을 취소하면 2분 안에 조용히 그만둔다.
- **입구는 탭 줄의 ☰ 메뉴(앞에 있는 탭)와 탭 오른쪽 클릭 메뉴다.** 홈과 도움말 탭, 공유 창이 없는 Linux에서는 꺼진다.
- **macOS는 `ShareMenu({ filePaths })`를 한판 창에 띄운다.**

## 택하지 않은 것

- **네이티브 애드온(node-addon-api + C++/WinRT).** 같은 프로세스라 Electron 창 핸들을 바로 쓸 수 있지만, 빌드에 MSVC·node-gyp가 필요하고 CI에 새 단계가 생기며 `.node`를 asar 밖으로 풀어야 한다. 애드온이 죽으면 한판 메인 프로세스도 함께 죽는다. 도우미는 저장소가 이미 쓰는 빌드 방식 그대로이고, 죽어도 공유만 실패한다.
- **npm 패키지.** 유지되는 MIT/Apache 패키지 중 Electron 데스크톱 창에서 Windows 공유 창을 여는 것을 찾지 못했다. NodeRT(`@nodert-win10-*`)는 오래 손대지 않았고 Electron마다 다시 빌드해야 하며, 필요한 interop(`GetForWindow`)을 부르지 못한다.
- **임시 사본을 내보내 공유하기.** 편집기마다 "지금 화면을 파일로" 내보내는 길이 다르고(12종), 받는 사람이 받은 파일과 내 디스크의 파일이 달라진다. 저장하고 공유하는 편이 단순하고 예측 가능하다.

## 결과

- 설치판에 12KB 남짓한 `win-share.exe`가 더해진다. 코드 서명이 없는 다른 도우미와 같은 처지다. CI(`windows-build.yml`)가 설치판 안에 있는지 확인한다.
- 각 앱 화면의 "파일" 메뉴에는 넣지 않았다. 앱마다 셸로 명령을 보내는 길을 새로 내야 해서 0.17에서는 ☰·탭 메뉴만 둔다.
- 시험: `apps/shell/tests/system-share.test.ts`(도우미 실행·응답 해석, 저장 후 공유 흐름), `tests/tab-menu.test.ts`(메뉴 항목). 도우미 자체는 손으로 확인한다: `node apps/shell/src/main/share/build-win.mjs`로 빌드한 뒤 `win-share.exe <창 핸들> <파일>`을 실행하면 표준 출력에 `{"type":"shown"}`이 나오고 공유 창이 뜬다.
