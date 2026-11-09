# 한판 홈 보드 구현 계획 (계획 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (실행 방식은 직접 실행으로 정해졌다). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한판 0.19.0의 홈을 카드 보드로 바꾸고, 트렌드레이더의 '오늘의 기상도'를 메인 프로세스가 받아 트렌드 카드로 보여 준다. 0.18 사용자의 위젯, 메모 글, 앱 순서, 숨긴 앱은 그대로 옮긴다.

**Architecture:**
- 저장은 `app-settings.json`의 새 열쇠 `homeBoard` 하나다. 메인 프로세스가 읽을 때 정리하고, 없으면 0.18 `homeLayout`에서 옮겨 와 바로 저장한다. 화면은 같은 순수 함수(`apps/shell/src/shared/home-board.ts`)로 고친 뒤 바뀔 때마다 저장한다. `homeLayout`에는 아무것도 쓰지 않는다.
- 보드는 순서 목록과 정해진 크기, CSS grid(`grid-auto-flow: row dense`)로 깐다. 화면 부품(격자, 새로 만들기, 모든 앱, 이어서 하기, 트렌드)은 `apps/shell/src/renderer/src/home-board/`에 새로 두고, 0.17 위젯 몸통과 함께 `Home.tsx`가 잇는다.
- 기상도는 메인 프로세스가 `net.fetch`로 받는다. 일정, 검사, 저장은 Electron 없이 도는 `trend-service.ts`가 맡는다. 화면은 IPC(`trend:get`, `trend:changed`)로 저장본만 받는다. 화면 CSP는 바꾸지 않는다.

**Tech Stack:** Electron 43, React 19, TypeScript 5.9, electron-vite 5, Vitest 4(기본 node, 화면 시험은 파일마다 `@vitest-environment jsdom`), Playwright 1.61(Electron e2e).

**Spec:** `docs/superpowers/specs/2026-11-09-hanpan-home-board-design.md`(같은 가지, 2026-11-09 승인). 이 계획은 스펙 중 한판 저장소 쪽만 다룬다: 7.0~7.10, 7.11의 '한판 쪽', 7.12, 8절의 한판 단위 시험과 e2e. 7.11의 '트렌드레이더 쪽'은 계획 1(`docs/superpowers/plans/2026-11-09-trend-forecast-api.md`)이 한다. 광고, 트렌드레이더 MCP, 보안키(0.20.0)는 다루지 않는다.

## Global Constraints

### 작업 자리와 규칙

- 저장소 `C:\Users\ten\Desktop\hanpan`에서 `git worktree add .claude/worktrees/home-board-impl -b feat/home-board docs/home-board-spec`로 작업 폴더를 만들고 `npm ci`를 한다. 본 checkout(다른 가지)은 건드리지 않는다.
- 커밋은 영어 Conventional Commits(`feat(shell): …`)이고 `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`으로 한다. 메시지 끝 줄은 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`이다. push와 PR은 사용자가 허락한 뒤에만 한다.
- 판 번호는 이 계획에서 올리지 않는다. 0.19.0으로 올리고 내는 일은 `docs/releasing.ko.md` 3번 이후의 절차다. 실제 기상도 주소(`https://trend.tenai.kr/api/forecast`)가 열리기 전에는 내지 않는다(스펙 6절). 구현은 주소가 열리기 전에도 고정 파일과 환경 변수 `HANPAN_TREND_URL`로 진행한다.
- 코드, 주석, 커밋은 영어다. 사람이 읽는 문서는 한국어다(`docs/standards.md`). `.md` 문서에는 한자를 쓰지 않는다(`npm run check:english-comments`가 막는다).
- 새 의존성은 없다. 화면 CSS의 색은 토큰만 쓴다(`npm run check:theme-colors`). 움직임은 200ms 이하이고 `prefers-reduced-motion`이면 끈다.
- 화면 문구를 두는 곳:
  - 카드 몸통의 글(모든 앱, 트렌드 카드 글, 앱 한 줄 설명, 예시 칩, '전체 N개'): `apps/shell/src/renderer/src/hanpan/home-strings.json`(11개 언어: ko, en, zh, zh-TW, ja, th, ru, ar, he, hi, vi). `node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts hpManualTip apps/shell/src/renderer/src/hanpan/home-strings.json`로 `strings.ts`에 넣는다. JSON에 없는 10개 언어에는 영어가 들어간다(지금 방식).
  - 카드 이름, 홈 꾸미기, 왼쪽 메뉴: `apps/shell/src/renderer/src/i18n/strings-home-custom.ts`(21개 언어).
  - **Task 1이 아래 문구 표의 모든 키를 ko, en, vi로 미리 등록한다(Ruling R22).** home-custom의 나머지 18개 언어 칸에는 잠시 영어를 둔다. 값을 바꾸는 키도 같다: ko, en, vi는 새 값으로, 나머지 18개 언어는 새 영어로 바꿔 둔다(옛 뜻의 번역이 남으면 Task 10의 시험이 잡지 못한다). Task 2~9는 문구 파일(`home-strings.json`, `strings.ts`, `strings-home-custom.ts`)을 건드리지 않는다. Task 10이 나머지 언어를 채운다. home-strings의 새 키는 `tests/hanpan-vi-strings.test.ts` 때문에 처음부터 vi가 있어야 한다.
  - 이미 있는 키의 값을 바꾸면 위 도구가 `strings.ts`에 반영하지 않는다(영어 자리표시만 바꾼다. `tools/hanpan-strings-core.mjs`의 `replacePlaceholders`). 그래서 예시 칩은 새 키 `hbExample1~3`으로 만든다. 쓰지 않게 된 키는 지우지 않는다: home-strings의 `hpExample1~3`, `hpFlow*`, `hpMoreTools`와 home-custom의 `mainCards`, `appCards`.
- **Ruling R22 (문구 선등록):** 문구를 쓰는 작업(Task 2~8)이 저마다 같은 세 파일에 키를 더하면 병렬로 둘 수 없다(JSON과 21개 언어 블록에서 같은 자리에 줄이 끼어 합치기 충돌이 난다). 문구는 이미 이 표로 정해져 있으므로 Task 1이 한 번에 등록하고, 나머지 작업은 키 이름만 쓴다. 대가는 Task 1이 조금 커지는 것뿐이다.

### 명령

- 단위 시험 한 파일: `cd apps/shell && npx vitest run tests/<이름>.test.ts`
- 껍데기 앱 전체: `npm run test -w @genoffice/shell`. Windows에서 원래 실패하는 것은 `tests/headless-export.test.ts` 16건과 `tests/default-app.test.ts`의 Linux 사례 1건이다. `update-resume`, `third-party-notices`는 부하로 가끔 실패하니 단독으로 다시 돌린다.
- 검사: `npm run typecheck -w @genoffice/shell`, `npm run lint`, `npm run format` 뒤 `npm run format:check`, `npm run check:theme-colors`, `npm run check:english-comments`, `npm run check:help-langs`.
- `npm run format`은 바뀐 `.md` 파일도 고친다. 이 가지의 스펙과 계획 1·2는 아직 prettier 모양이 아니므로 PR 전에 한 번 돌려 함께 고친다.
- e2e: `npm run build:all`(`cargo`가 PATH에 있어야 한다) 뒤 `E2E_NO_VIDEO=1 npm run test:e2e -- e2e/<이름>.spec.ts`. PowerShell에서는 `$env:E2E_NO_VIDEO='1'; npm run test:e2e -- e2e/<이름>.spec.ts`. Windows의 e2e는 원래 전부 초록이 아니다. 판정은 "손대지 않은 사본에서도 실패하는가"로 한다(`docs/engineering-notes.md` '테스트').

### 스펙이 정한 값

**저장.** 열쇠 `homeBoard`(`app-settings.json`). 0.18 `homeLayout`은 읽기만 한다. 형식은 스펙 7.10의 `HomeBoard`, `BoardCard` 그대로다.

**격자.** 넓은 화면은 12칸, 세로 한 줄 96px, 칸 사이 14px. 홈 안쪽 넓이가 960px 이상이면 12칸, 700px 이상 960px 미만이면 6칸, 700px 미만이면 1칸이다. 6칸일 때 가로 5칸 이상인 카드는 6칸, 그 밖은 3칸이고 세로 줄 수는 그대로다. 저장된 크기는 폭 때문에 바뀌지 않는다.

**카드.** 모두 합쳐 24장까지(`HOME_WIDGET_MAX`). 메모 글 2,000자(`HOME_MEMO_MAX`), 제목 60자(`HOME_TITLE_MAX`).

| `type` | 허용 크기 | 기본 크기 | 뺄 수 있나 | 몇 장 |
|---|---|---|---|---|
| `start` | 7×2, 12×2 | 7×2 | 아니요 | 1 |
| `trend` | 5×2, 5×3, 12×2 | 5×2 | 예 | 1 |
| `apps` | 5×2, 5×3, 7×2, 7×3 | 5×3 | 아니요 | 1 |
| `recent` | 7×2, 7×3, 12×3 | 7×3 | 예 | 1 |
| `memo` | 3×2, 6×2 | 6×2 | 예 | 여러 장 |
| `favorites` | 3×2, 6×2, 6×3 | 6×2 | 예 | 1 |
| `folder` | 3×2, 6×2, 6×3 | 3×2 (판단: 0.17 small) | 예 | 여러 장 |
| `clock` | 3×2 | 3×2 | 예 | 여러 장 |
| `shortcut` | 3×2, 6×2 | 3×2 (판단: 0.17 small) | 예 | 여러 장 |

- 기본 크기는 허용되지 않은 저장 크기를 고칠 때, '카드 추가'로 넣을 때, '기본 배치로'에 쓴다.
- 기본 배치(7.1): 시작 7×2, 트렌드 5×2(화면 언어가 한국어이고 기상도 주소가 있을 때만), 새로 만들기 5×3, 이어서 하기 7×3, 빠른 메모 6×2, 즐겨찾기 6×2. 기본 카드의 id는 `start`, `trend`, `apps`, `recent`, `memo`, `favorites`다.

**앱.** 앱 열쇠는 `data-new` 열쇠 그대로다.

| 묶음 id | '모든 앱' 묶음 이름 | 앱 열쇠 (이 순서) |
|---|---|---|
| `docs` | 문서 만들기 | `xmind`, `hwp`, `pptx`, `docx`, `xlsx`, `md`, `html`, `templates` |
| `pdf` | PDF · 변환 | `pdf`, `pdf-tools`, `md-convert` |
| `graphics` | 그림 | `photo`, `illust`, `design` |
| `file` | 파일 | `open` |

- 기본 핀(한국 문서 기능 켬): `xmind`, `hwp`, `pptx`, `docx`, `xlsx`, `pdf`, `templates`, `photo`, `illust`, `design`, `html`.
- 기본 핀(끔): `xmind`, `pptx`, `docx`, `xlsx`, `pdf`, `photo`, `illust`, `html`, `md`, `pdf-tools`, `md-convert`.
- 칸 수는 카드 크기로 정한다: 앱 칸은 가로 `w − 1`, 세로 `h`. 5×2는 8칸, 5×3은 12칸, 7×2는 12칸, 7×3은 18칸이다.
- 버튼 간격 8px, 버튼 넓이 최대 160px. 넘치면 칸 묶음 전체를 가운데에 둔다.
- 마지막 핀 바로 다음 칸이 '모든 앱'이다. 핀이 칸보다 많으면 마지막 칸이 '모든 앱'이 되고 "+N"이 붙는다. 남는 칸은 평소에 비우고 꾸미기 상태에서만 점선 '앱 추가'를 보인다. 핀을 꽂지 않은 앱으로 빈 칸을 채우지 않는다. 새 앱을 핀에 자동으로 넣지 않는다.
- `recentApps`는 최신 순 8개까지다. '모든 앱' 맨 위에는 그중 3개를 보인다.
- 이어서 하기 카드는 7×3일 때 6줄을 보인다.

**트렌드.**
- 받기: 앱이 뜨고 3초 뒤에 한 번, 켜져 있는 동안 6시간마다. 5초가 넘으면 그만둔다.
- 보내는 것: `?client=hanpan&v=<앱 버전>`과 `User-Agent: Hanpan/<버전>`. `credentials: 'omit'`. 사용자 id, 기기 id, 파일 정보는 보내지 않는다.
- 저장 `userData/trend-forecast.json`. 화면에는 IPC `trend:get`(저장본), `trend:changed`(새 결과)로 넘긴다. 링크는 `trend:open`.
- 검사: `schema`가 1이 아니면 응답 전체를 버린다. `fields`는 12개까지만 읽는다. `key`는 `ai`, `opensource`, `local-ai`, `ai-safety`, `stocks`, `economy`, `semiconductor`, `realestate`, `fx`, `crypto`만 받는다. `s`가 −2~2 정수가 아니면 '정보 없음'(`null`)이다. 글자 수는 `title` 20, `label` 10, `head` 80, `line` 80자이고 넘으면 잘라 낸다. `path`는 `/`로 시작하는 단순한 경로만 받고 `//`, `:`, `\`가 들어 있으면 버린다.
- 링크: 앱에 박아 둔 `https://trend.tenai.kr` + `path` + `?utm_source=hanpan&utm_medium=home&utm_campaign=forecast`. 열기 직전에 주소가 `https://trend.tenai.kr/`로 시작하는지 다시 확인한다.
- 화면 CSP(`apps/shell/src/renderer/index.html`)의 `connect-src 'self' ws://localhost:*`는 그대로다.
- **분야별 병합(Ruling R24).** 기상도 주소는 이미 열려 있다(2026-11-09 확인: `schema` 1, 분야 10개, `X-Vercel-Cache: HIT`). 서버는 원본을 다 받은 답은 CDN에 30분, 일부만 받은 답(값이 있는 분야 5~9개, 나머지는 `s: null`)은 1분만 저장하고, 4개 이하면 503 `no-store`를 준다. 한판은 6시간에 한 번 받으므로 일부만 받은 답을 그대로 저장하면 그 분야가 6시간 동안 '정보 없음'으로 남는다. 그래서 새 답에서 `s`가 `null`인 분야는 이전 저장본의 같은 `key`에 값이 있고 그 값이 48시간 안의 것이면 그 값(`s`, `label`, `head`)으로 채우고, 그 분야에 `asOf`(값을 계산한 시각)를 함께 저장한다. 새 답에 없는 분야는 더하지 않는다(분야 목록은 새 답이 정한다). 화면 규칙은 Task 8(R25).
- **잘라 내기(Ruling R26).** 글자 수를 넘는 글은 `max − 1`자 뒤에 `…`를 붙여 `max`자로 만든다. 실제 응답의 `head`는 60~120자라 80자에서 그냥 자르면 문장 중간에서 끊긴 것처럼 보인다. 길이 제한은 스펙 그대로다.

**문구.** 아래 표의 한국어와 영어를 쓴다. '스펙'은 스펙이 정한 글이고, '확정'은 스펙이 만드는 사람에게 맡긴 글을 이 계획이 정한 것이다(Ruling R27). Task 1이 이 표 전부를 ko·en·vi로 등록한다(R22). vi는 Task 1이 초벌을 쓰고 Task 10이 다듬는다.

| 파일 | 키 | 한국어 | 영어 | |
|---|---|---|---|---|
| home-strings | `hbExample1`, `hbExample2`, `hbExample3` | 시설 점검 결과 보고 / 입주사 안내문 / 주간 업무 보고 | Facility inspection report / Notice to tenants / Weekly work report | 확정(스펙 예시에서 '11월'을 뺐다, R27) |
| home-strings | `hbAllApps` | 모든 앱 | All apps | 스펙 |
| home-strings | `hbAllAppsSearch` | 앱 이름이나 하는 일로 찾기 | Search by app name or what it does | 확정 |
| home-strings | `hbRecentApps` | 최근에 쓴 앱 | Recently used apps | 스펙 |
| home-strings | `hbGroupDocs`, `hbGroupPdf`, `hbGroupGraphics`, `hbGroupFile` | 문서 만들기 / PDF · 변환 / 그림 / 파일 | Create documents / PDF · Convert / Graphics / Files | 스펙 |
| home-strings | `hbNewApp` | 새 앱 | New | 스펙 |
| home-strings | `hbSearchNoApps` | 맞는 앱이 없습니다 | No matching apps | 확정 |
| home-strings | `hbAppDocxSub`, `hbAppXlsxSub`, `hbAppMdSub`, `hbAppHtmlSub`, `hbAppPdfSub`, `hbAppOpenSub` | 보고서·기안문 같은 워드 문서 / 표와 계산이 들어가는 엑셀 문서 / 마크다운으로 가볍게 쓰는 글 / 안내 페이지 같은 웹 문서 / PDF에 메모하고 가리고 글 넣기 / 이 컴퓨터에 있는 파일 열기 | Word documents such as reports and memos / Excel sheets with tables and formulas / Light writing in Markdown / Web pages such as notices / Annotate, redact and add text to a PDF / Open a file on this computer | 확정 |
| home-strings | `hbRecentAll` | 전체 {n}개 | All {n} | 스펙 |
| home-strings | `hbTrendTitle` | 트렌드 레이더 · 오늘의 기상도 | Trend Radar · Today's forecast | 스펙 |
| home-strings | `hbTrendLine`, `hbTrendMore` | 오늘의 한 줄 / 자세히 | Today's line / Details | 스펙 |
| home-strings | `hbTrendAsOf` | {when} 기준 | as of {when} | 스펙("11월 8일 기준") |
| home-strings | `hbTrendOffline` | 인터넷에 연결되면 오늘의 트렌드가 나옵니다 | Today's trends appear once you are online | 스펙 |
| home-strings | `hbTrendNoData` | 정보 없음 | No data | 스펙 |
| home-custom | `navHome` | 홈 | Home | 스펙 |
| home-custom | `cardStart`, `cardApps` | 시작 / 새로 만들기 | Start / New | 스펙 |
| home-custom | `cardTrend`, `descTrend` | 트렌드 레이더 / 트렌드 레이더의 오늘의 기상도를 보여 줍니다. | Trend Radar / Shows today's forecast from Trend Radar. | 확정(제목과 같게 '트렌드 레이더'로 띄어 쓴다) |
| home-custom | `widgetRecent` (값을 바꾼다) | 이어서 하기 | Continue | 스펙 |
| home-custom | `descFavorites`, `favoritesEmpty` (값을 바꾼다) | 별표한 파일. / 파일에 별표를 하면 여기에 모입니다. | Starred files. / Star a file to see it here. | 7.7: "앱을 고정하면"을 뺀다 |
| home-custom | `pin`, `unpin` (값을 바꾼다) | 홈에 고정 / 홈에서 빼기 | Pin to Home / Remove from Home | 확정 |
| home-custom | `sizeOption` | 가로 {w}칸 × 세로 {h}줄 | {w} columns × {h} rows | 확정 |
| home-custom | `customizeHint` | 카드를 끌어서 옮기고, 오른쪽 아래 모서리를 끌어 크기를 바꿉니다. | Drag a card to move it; drag its bottom-right corner to resize it. | 스펙 |
| home-custom | `addCard`, `resetBoard`, `listView` | 카드 추가 / 기본 배치로 / 목록으로 정리 | Add card / Default layout / Arrange as a list | 스펙 ('완료'는 있는 `done`) |
| home-custom | `resetBoardAsk` | 기본 카드의 순서와 크기, 홈에 보이는 앱을 처음 상태로 되돌릴까요? 직접 더한 카드는 그대로 남습니다. | Put the default cards' order and size, and the apps shown on Home, back to how they started? Cards you added stay. | 확정 |
| home-custom | `cardMenu`, `removeCard`, `unpinApp`, `dragHandle`, `resizeCorner` | {name} 메뉴 / {name} 빼기 / {name} 홈에서 빼기 / {name} 옮기기 / {name} 크기 바꾸기 | {name} menu / Remove {name} / Remove {name} from Home / Move {name} / Resize {name} | 확정 |
| home-custom | `addAppSlot` | 앱 추가 | Add app | 스펙 |
| home-custom | `boardCards`, `boardApps`, `boardFull` | 카드 / 홈에 보이는 앱 / 카드는 24장까지 둘 수 있습니다. | Cards / Apps shown on Home / Home holds up to 24 cards. | 확정 |

- **Ruling R27 (한국어 원문 확정):** 스펙 11절은 한국어 원문을 사용자에게 보여 확정하라고 했지만, 사용자가 "문제 있으면 알아서 판단해서 진행"하라고 정했다(2026-11-09). 그래서 위 '확정' 글을 이 계획이 정하고, 구현을 마친 최종 보고에 '정한 문구' 목록으로 남긴다. 바꾼 것 둘: `hbExample1`에서 '11월'을 뺐다(달이 지나면 낡는 글이고, 스펙은 "사무실에서 실제로 쓰는 문서 이름"만 요구한다). `descTrend`의 '트렌드레이더'를 제목(`hbTrendTitle`)과 같이 '트렌드 레이더'로 띄어 썼다(한 화면에 두 표기가 같이 보이지 않게). 되돌릴 수 있는 결정이다: 보고 뒤 사용자가 바꾸면 ko부터 고치고 Task 10의 번역을 다시 한다.

### 선택자 약속

e2e와 단위 시험이 기대는 이름이다. 작업마다 이 이름을 그대로 쓴다.

- 보드: `[data-home-board]`(`data-cols`), 카드 `[data-card="<id>"][data-card-type="<type>"][data-size="<w>x<h>"]`, 머리 줄 `[data-board-head]`. 새로 만들기·이어서 하기·트렌드 카드의 제목은 `h2.hb-card-title`.
- 머리 줄 검색은 지금 선택자 그대로: `.file-search input`, `.file-search-group .file-search-settings`, `[data-search-settings]`, 결과 `.search-results`, `.search-row`, `.recents-heading .file-count`, `.filter-pill`.
- 홈 꾸미기: 단추 `[data-home-custom="open"]`, 안내 줄 `[data-customize-bar]`, 그 단추 `[data-customize="add|reset|list|done"]`, 확인 창 `[data-reset-confirm]`의 `[data-reset="yes|no"]`, 카드 도구 `[data-card-handle]`, `[data-card-menu]`, `[data-card-size="<w>x<h>"]`, `[data-card-remove]`, `[data-card-resize]`, 목록 창 `[data-home-custom="panel"]`의 카드 줄 `[data-custom-board="<id>"]`과 앱 줄 `[data-custom-card="<열쇠>"]`, `[data-move="up|down"]`, 닫기 `[data-home-custom="close"]`, 카드 고르기 `[data-widget-gallery] [data-add-type="<type>"]`.
- 새로 만들기: 타일 `button.quick-card.hb-app[data-new="<열쇠>"]`(Ruling R5), templates·design·md-convert는 `data-hanpan`도 붙인다. '모든 앱' 타일 `[data-all-apps-open]`, "+N" `[data-all-apps-more]`, 새 앱 `[data-all-apps-new]`, 칸 `[data-app-slot="<번호>"]`, 꾸미기의 × `[data-app-unpin="<열쇠>"]`, 빈 칸 `[data-app-slot-add]`.
- 모든 앱: `[data-all-apps]`, 검색 `[data-all-apps-search]`, 최근 줄 `[data-all-apps-recent] [data-recent-app="<열쇠>"]`, 묶음 `[data-app-group="<id>"]`, 항목 `[data-all-apps] [data-new="<열쇠>"]`, 핀 `[data-app-pin="<열쇠>"][aria-pressed]`, 새 앱 `[data-app-new]`.
- 시작 카드는 지금 그대로: `[data-hanpan="start-board"|"start-topic"|"start-go"|"start-guide"|"start-note"]`.
- 이어서 하기: 줄 `[data-recent-file="<경로>"]`, '전체 N개' `[data-recent-all]`.
- 트렌드: 분야 `[data-trend-field="<key>"]`, '정보 없음' `[data-trend-nodata]`, 기준 시각 `[data-trend-asof]`, 한 줄 `[data-trend-line]`, 자세히 `[data-trend-more]`, 오프라인 `[data-trend-offline]`, 이전 저장본에서 채운 분야 `[data-trend-carried="<YYYY-MM-DD>"]`(R25).
- 위젯 카드 안쪽은 0.17 그대로: `[data-widget-settings]`, `[data-widget-form]`, `[data-widget-done]`, `input[name="title"]`, `select[name="kind"]`, `select[name="size"]`, `[data-shortcut-open]`, `[data-clock-time]`, `[data-widget-setup]`, `[data-pick]`.
- 왼쪽 메뉴 '홈': `button.nav-item[data-nav="home"]`.

## 실행 순서와 병렬

작업마다 따로 작업 폴더(`git worktree add .claude/worktrees/home-board-t<번호> -b feat/home-board-t<번호> feat/home-board`)에서 구현하고, 한 묶음이 끝나면 `feat/home-board`에 차례로 합친(`git merge --no-ff`) 뒤 다음 묶음을 시작한다. 같은 묶음 안의 작업은 서로 다른 파일만 고치고 Task 1의 형과 이름만 공유한다. 한 묶음을 합친 뒤에는 `npm run typecheck -w @genoffice/shell`과 그 묶음의 단위 시험을 한 번 더 돌린다.

| 차례 | 동시에 하는 작업 | 각 작업이 만들거나 고치는 파일 | 기다리는 것 |
|---|---|---|---|
| 0 | **Task 1** (혼자) | `shared/home-apps.ts`, `shared/home-board.ts`, `shared/trend-forecast.ts`(상수), `main/home-board.ts`, `main/trend/trend-config.ts`, `renderer/src/home-board/useHomeBoard.ts`, `renderer/src/home-board/TrendCard.tsx`(빈 카드), `shared/home-api.ts`, `preload/index.ts`, `main/index.ts`, `HomeWidgets.tsx`(`HomeAppCard.sub` 한 줄), 문구 파일 셋(R22) | 없음 |
| A | **Task 2** ‖ **Task 3** ‖ **Task 7** | 2: `renderer/src/home-board/{home-apps.tsx, AppsCard.tsx, AllApps.tsx, apps-card.css}`, `shared/home-apps.ts`, `tests/{home-apps.test.ts, home-apps-ui.test.ts, home-dialog-keys.test.ts}` · 3: `renderer/src/home-board/{RecentCard.tsx, board-geometry.ts}`, `shared/home-board-edit.ts`, `hanpan/StartBoard.tsx`, `hanpan/hanpan.css`(341-400), `Home.tsx`(3568-3572 다섯 줄), `HomeWidgets.tsx`, `tests/{hanpan-start-board, home-cards-ui, board-geometry, home-board-edit, home-widgets}.test.ts` · 7: `shared/trend-api.ts`, `shared/trend-forecast.ts`, `main/trend/{trend-service.ts, trend-ipc.ts, trend-config.ts}`, `preload/index.ts`(끝에 더함), `main/index.ts`(10162·10672 근처), `shared/home-layout.ts`(1-8), `docs/security.md`, `PRIVACY.md`, `tests/{trend-forecast, trend-service, preload-trend, renderer-csp}.test.ts` | Task 1 |
| B | **Task 4** ‖ **Task 8** ‖ **Task 11**(파일 고치기만) | 4: `Home.tsx`, `HomeWidgets.tsx`, `home-board/{BoardGrid.tsx, board-geometry.ts, home-board.css}`, `hanpan/hanpan.css`(405-524), `main/index.ts`(6729-6733), `preload/index.ts`(440-445), `shared/home-api.ts`, `main/home-layout.ts` 삭제, `tests/{home-widgets, home-korean-cards, home-navigation, home-subscription-entry, home-layout, board-geometry}.test.ts` · 8: `home-board/{TrendCard.tsx, trend-card.css}`, `shared/trend-forecast.ts`, `tests/{trend-forecast, home-trend-card}.test.ts` · 11: `e2e/**`만 | 묶음 A |
| C | **Task 5 → Task 6 → Task 9**(한 폴더에서 차례로) ‖ **Task 10** | 5·6·9: `shared/home-board-edit.ts`, `shared/home-layout.ts`(187-292), `home-board/{BoardGrid.tsx, AppsCard.tsx, board-geometry.ts, home-board.css}`, `HomeWidgets.tsx`, `Home.tsx`, `hanpan/hanpan.css`(259-336), `tests/{home-board-edit, home-customize, home-dialog-keys, home-layout, board-geometry, home-board-columns}.test.ts` · 10: 문구 파일 셋(나머지 언어), `i18n/help/topics/{hanpan, home-screen}.*.md`, `docs/manual/한판-사용설명서.md`, `tests/home-board-strings.test.ts` | 묶음 B |
| D | **Task 12** (혼자) | `e2e/home-board.spec.ts`, 결정 기록, `AGENTS.md`, 설명서 그림. 빌드와 e2e 실행 | 묶음 C |

- Task 5, 6, 9는 모두 `BoardGrid.tsx`와 `home-board.css`를 고치므로 동시에 두지 않는다. Task 10은 문구 파일과 문서만 고치므로 그 옆에서 돈다.
- Task 11은 `e2e/` 파일만 고치므로 묶음 B에서 쓰기를 마쳐 두고, 실행은 Task 12가 한다(그 전에는 빌드가 보드를 담지 않는다).
- Task 2와 Task 3이 같은 파일을 건드리지 않도록 Task 1에서 미리 빼 둔 것(R21): `HomeAppCard.sub`, 문구 등록, `TrendCard.tsx` 빈 카드, `main/index.ts`의 `onHomeBoardChanged` 훅(R23).
- **Ruling R21 (병렬을 위한 파일 나누기):** 보드를 고치는 순수 함수는 두 파일로 나눈다. `shared/home-board.ts`는 형, 상수, 정리(`normalize*`, `migrate*`, `resolve*`, `default*`)만 두고(Task 1만 고친다), 편집 함수(`updateCard`, `moveCard`, Task 5의 `addCard`·`removeCard`·`resizeCard`… )는 `shared/home-board-edit.ts`에 둔다(Task 3이 만들고 Task 5가 더한다). 핀·최근 앱·본 앱을 고치는 세 함수(`setPinned`, `recordAppLaunch`, `markAppsSeen`)는 `shared/home-apps.ts`에 둔다(`HomeBoard`는 `import type`으로만 쓰므로 순환 참조가 생기지 않는다). 단위 시험도 `home-board.test.ts`(Task 1), `home-apps.test.ts`(Task 2), `home-board-edit.test.ts`(Task 3·5)로 나눈다. 스펙 8절은 `home-board.test.ts` 한 파일을 적었지만 사례는 모두 그대로이고 파일만 나뉜다. CSS도 `apps-card.css`(Task 2), `home-board.css`(Task 4), `trend-card.css`(Task 8)로 나누고 각 부품 파일이 자기 CSS를 `import`한다(`Home.tsx`가 `./hanpan/hanpan.css`를 들여오는 방식). 이유: Task 2·3, Task 4·8을 서로 다른 작업 폴더에서 동시에 할 수 있다. 대가는 import 줄이 몇 개 는다.

## Review Focus

1. **`homeBoard`가 깨졌는데 0.18 `homeLayout`이 남아 있을 때.** 기본 배치로 덮으면 0.18 위젯과 메모 글이 사라진다. 깨진 `homeBoard`는 없는 것으로 보고 `homeLayout`에서 다시 옮겨 와야 한다. → Task 1 `resolveHomeBoard` 시험.
2. **기상도 주소가 HTML 오류 페이지를 주거나 5초 넘게 답하지 않을 때.** 홈은 바로 뜨고, 트렌드 카드는 이전 저장본(없으면 오프라인 안내)을 그대로 보여 준다. 저장본을 지우거나 빈 기상도로 덮지 않는다. → Task 7 `createTrendService` 시험.
3. **한국 문서 기능이나 화면 언어를 바꿀 때.** 감춰진 앱(hwp, templates, design)의 핀은 지우지 않고, 다시 켜면 제자리에 나온다. 한국어로 바꾸면 트렌드 카드가 기본 자리에 한 번 들어오고, 사용자가 뺀 뒤에는 다시 들어오지 않는다. → Task 1 `normalizeHomeBoard`, Task 2 `appSlots` 시험.
4. **메모를 쓰는 중에 다른 저장(앱 실행 기록, 핀)이 겹칠 때.** 두 변경이 모두 남는다. 나중 저장이 앞 변경을 덮지 않는다. → Task 1 `useHomeBoard` 시험.
5. **한국 자정 직후.** 어제 날짜의 기상도에 오늘 시각을 붙이지 않는다. 기상도의 한국 날짜가 오늘(한국 시각)일 때만 'HH:MM 기준'이고, 아니면 'M월 D일 기준'이다. → Task 8 `trendAsOfText` 시험.
6. **일부만 받은 답.** 서버가 분야 일부만 계산한 답(`s: null` 섞임, CDN 1분)을 6시간에 한 번 받으면, 이전 저장본에 있던 그 분야 값이 '정보 없음'으로 덮이면 안 된다. 분야별로 병합하고(48시간 안의 값만), 채운 분야는 그 값의 시각을 함께 저장해 다른 날 값이면 화면에 날짜를 붙인다. → Task 7 `mergeTrendForecast`·`createTrendService` 시험, Task 8 `[data-trend-carried]` 시험.

---

**작업 순서와 스펙 9절.** (1) 저장 → Task 1. (3) 모든 앱의 부품 → Task 2(보드의 새로 만들기 카드가 바로 쓰므로 부품만 앞당기고, 잇기는 Task 4). (2) 보드와 기본 카드 → Task 3(카드 몸통), Task 4(보드). (5) 머리 줄 검색과 '홈'·'최근 사용' → Task 4에 합친다(보드가 홈의 표를 대신하는 순간 검색과 표로 가는 길이 함께 있어야 한다). (4) 홈 꾸미기 → Task 5(키보드), Task 6(끌기). (6) 기상도 → Task 7(받기), Task 8(카드). (7) 좁은 화면 → Task 9. (8) 번역과 설명서 → Task 10. (9) e2e → Task 11(기존), Task 12(새 것과 실행).

### Task 1: 보드 저장 형식과 0.18 옮겨 오기

**Files:**
- Create: `apps/shell/src/shared/home-apps.ts`, `apps/shell/src/shared/home-board.ts`, `apps/shell/src/shared/trend-forecast.ts`(이 작업에서는 주소 상수만), `apps/shell/src/main/home-board.ts`, `apps/shell/src/main/trend/trend-config.ts`, `apps/shell/src/renderer/src/home-board/useHomeBoard.ts`, `apps/shell/src/renderer/src/home-board/TrendCard.tsx`(빈 카드. 제목 `hbTrendTitle`과 `[data-trend-offline]` `hbTrendOffline`만. Task 8이 채운다, R21)
- Modify: `apps/shell/src/shared/home-api.ts:368-371, 628-629`(메서드와 채널을 더한다), `apps/shell/src/preload/index.ts:440-445`(더한다), `apps/shell/src/main/index.ts:6729-6733`(처리기를 더한다. 옛 `getHomeLayout`·`setHomeLayout`은 Task 4에서 지운다), `apps/shell/src/renderer/src/HomeWidgets.tsx:40-45`(`HomeAppCard`에 `sub?: string` 한 줄. Task 2가 쓴다), 문구 파일 셋 `apps/shell/src/renderer/src/hanpan/home-strings.json`, `apps/shell/src/renderer/src/strings.ts`(도구로), `apps/shell/src/renderer/src/i18n/strings-home-custom.ts`(Global Constraints 문구 표 전부, R22)
- Test: `apps/shell/tests/home-board.test.ts`, `apps/shell/tests/home-board-storage.test.ts`, `apps/shell/tests/trend-config.test.ts`, `apps/shell/tests/use-home-board.test.ts`, `apps/shell/tests/preload-home-board.test.ts`

**Interfaces:**
- Consumes: `apps/shell/src/shared/home-layout.ts`의 `HomeLayout`, `normalizeHomeLayout`, `normalizeShortcutTarget`, `isAbsolutePath`, `arrangeKeys`, `HOME_LAYOUT_SETTING_KEY`, `HOME_MEMO_MAX`, `HOME_TITLE_MAX`, `HOME_WIDGET_MAX`, `ShortcutTarget`. `apps/shell/src/main/app-settings.ts`의 `readAppSettings`, `writeAppSetting`. `@genoffice/i18n`의 `koreanDocFeaturesOn`, `Lang`.
- Produces:

```ts
// shared/home-apps.ts
export const APP_GROUPS = [
  { id: 'docs', keys: ['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'md', 'html', 'templates'] },
  { id: 'pdf', keys: ['pdf', 'pdf-tools', 'md-convert'] },
  { id: 'graphics', keys: ['photo', 'illust', 'design'] },
  { id: 'file', keys: ['open'] },
] as const
export type AppGroupId = (typeof APP_GROUPS)[number]['id']
export type AppKey = (typeof APP_GROUPS)[number]['keys'][number]
export const APP_KEYS: readonly AppKey[]            // 위 순서로 15개
export function isAppKey(value: unknown): value is AppKey
export const DEFAULT_PINS_KOREAN: readonly AppKey[] // Global Constraints의 11개
export const DEFAULT_PINS_OTHER: readonly AppKey[]  // Global Constraints의 11개
export function defaultPins(koreanDocs: boolean): AppKey[]

// shared/home-board.ts
export const HOME_BOARD_SETTING_KEY = 'homeBoard'
export const BOARD_CARD_TYPES = ['start', 'trend', 'apps', 'recent', 'memo', 'favorites', 'folder', 'clock', 'shortcut'] as const
export type BoardCardType = (typeof BOARD_CARD_TYPES)[number]
export interface CardSize { w: number; h: number }
export const CARD_SIZES: Record<BoardCardType, readonly CardSize[]>  // Global Constraints 표
export const DEFAULT_SIZE: Record<BoardCardType, CardSize>           // 같은 표
export const SINGLE_CARD_TYPES: readonly BoardCardType[]   // start, trend, apps, recent, favorites
export const REQUIRED_CARD_TYPES: readonly BoardCardType[] // start, apps
export const DEFAULT_CARD_ORDER: readonly BoardCardType[]  // start, trend, apps, recent, memo, favorites
export type BoardCard = { id: string; w: number; h: number; title: string } & (
  | { type: 'start' | 'trend' | 'apps' | 'recent' | 'favorites' | 'clock' }
  | { type: 'memo'; text: string }
  | { type: 'shortcut'; target: ShortcutTarget | null }
  | { type: 'folder'; path: string }
)
export interface HomeBoard { v: 1; cards: BoardCard[]; pinned: string[]; seenApps: string[]; recentApps: string[]; introduced: string[] }
export interface BoardContext { korean: boolean; koreanDocs: boolean; trend: boolean }
export interface HomeBoardSource { board: unknown; trendAvailable: boolean }
export function sizeKey(size: CardSize): string              // '7x2'
export function parseSizeKey(value: string): CardSize | null
export function defaultCardTypes(ctx: BoardContext): BoardCardType[]
export function defaultHomeBoard(ctx: BoardContext): HomeBoard
export function isBoardValue(raw: unknown): boolean          // 배열 아닌 객체이고 v === 1
export function normalizeHomeBoard(raw: unknown, ctx: BoardContext): HomeBoard
export function migrateHomeLayout(layout: HomeLayout, ctx: BoardContext): HomeBoard
export function resolveHomeBoard(stored: unknown, legacy: unknown, ctx: BoardContext): HomeBoard
export function boardHasTrend(raw: unknown): boolean         // 저장된 값의 cards에 type 'trend'가 있는가

// main/home-board.ts
export function boardContextFrom(lang: Lang, storedKoreanDocs: boolean | null, trendUrl: string | null): BoardContext
export function readHomeBoard(path: string, ctx: BoardContext): HomeBoard
export function writeHomeBoard(path: string, raw: unknown, ctx: BoardContext): HomeBoard | null

// shared/trend-forecast.ts (이 작업에서는 둘만)
export const TREND_SITE = 'https://trend.tenai.kr'
export const TREND_FORECAST_URL = 'https://trend.tenai.kr/api/forecast'

// main/trend/trend-config.ts
export function trendForecastUrl(env: Record<string, string | undefined>): string | null

// shared/home-api.ts
getHomeBoard?(): Promise<HomeBoardSource>
setHomeBoard?(board: HomeBoard): Promise<unknown>
HOME_CHANNELS.getHomeBoard = 'home:get-home-board'
HOME_CHANNELS.setHomeBoard = 'home:set-home-board'

// renderer/src/home-board/useHomeBoard.ts
export function useHomeBoard(input: { korean: boolean; koreanDocs: boolean }): {
  board: HomeBoard | null           // 저장본이 오기 전에는 null
  context: BoardContext | null
  update: (change: (prev: HomeBoard) => HomeBoard) => void
}
```

**정하는 규칙:**
- **Ruling R1:** 스펙은 `normalizeHomeBoard(raw)`라고 적었지만, 기본 배치·기본 핀·나중에 더한 기본 카드가 화면 언어, 한국 문서 기능, 기상도 주소에 따라 달라진다(7.1, 7.4, 7.10). 그래서 둘째 인자 `ctx: BoardContext`를 받는다.
- `defaultCardTypes(ctx)` = `['start', ...(ctx.korean && ctx.trend ? ['trend'] : []), 'apps', 'recent', 'memo', 'favorites']`.
- `defaultHomeBoard(ctx)`: 그 종류를 `DEFAULT_SIZE`로 깔고, `pinned` = `defaultPins(ctx.koreanDocs)`, `seenApps` = `APP_KEYS` 전부, `recentApps` = `[]`, `introduced` = `defaultCardTypes(ctx)`.
- `normalizeHomeBoard(raw, ctx)`:
  - `isBoardValue(raw)`가 거짓이면 `defaultHomeBoard(ctx)`.
  - 칸마다 따로 고친다. `cards`가 배열이 아니면 기본 카드, `pinned`가 배열이 아니면 `defaultPins(ctx.koreanDocs)`(빈 배열은 그대로 둔다), `seenApps`가 아니면 `APP_KEYS`, `recentApps`가 아니면 `[]`, `introduced`가 아니면 `defaultCardTypes(ctx)`. 앱 열쇠 목록은 `isAppKey`만 남기고 겹친 것을 빼며, `recentApps`는 8개까지. `introduced`는 `BOARD_CARD_TYPES`만 남긴다.
  - 카드 하나: `type`이 목록에 있고 `id`가 `/^[a-z0-9][a-z0-9-]{0,39}$/`이며 앞 카드와 겹치지 않을 때만 남긴다. 크기가 `CARD_SIZES[type]`에 정확히 있으면 그대로, 아니면 `DEFAULT_SIZE[type]`. `title`은 60자, memo `text`는 2,000자에서 자른다. shortcut `target`은 `normalizeShortcutTarget`, folder `path`는 절대 경로가 아니면 ''. 한 장만 두는 종류는 처음 것만 남긴다.
  - 시작과 새로 만들기가 없으면 기본 id·기본 크기로 '기본 자리'에 넣는다. 기본 자리는 `DEFAULT_CARD_ORDER`에서 그 종류보다 앞선 종류 가운데 가장 가까운 것이 보드에 있으면 그 카드 바로 뒤, 없으면 맨 앞이다.
  - 24장이 넘으면 start, apps가 아닌 카드를 뒤에서부터 버린다.
  - 나중 판의 기본 카드(7.10): `defaultCardTypes(ctx)` 중 `introduced`에 없는 종류마다, 그 종류의 카드가 없고 24장 미만이면 기본 자리에 넣는다. 넣었든 아니든 `introduced`에 더한다.
  - 기본 id가 이미 쓰였으면 `<type>-<시각36진수><임의 4글자>`.
- `migrateHomeLayout(layout, ctx)`:
  - 카드: 시작 7×2, (ctx.korean && ctx.trend이면) 트렌드 5×2, 새로 만들기 5×3, 그다음 `layout.widgets`를 그 순서대로. `recent`는 7×3, 나머지는 `small`이면 3×2, `wide`이면 6×2. id, 제목, 메모 글, 폴더 경로, 바로가기 대상은 그대로 옮긴다. 시계의 6×2처럼 허용되지 않는 크기는 정리 단계에서 기본 크기가 된다.
  - 핀: 아래 R2. `seenApps` = `APP_KEYS`, `recentApps` = `[]`, `introduced` = `defaultCardTypes(ctx)`. 마지막에 `normalizeHomeBoard(…, ctx)`를 거친다.
- **Ruling R2 (0.18 `cardOrder` 읽기):** 핀 = `layout.cardOrder`가 비었으면 `defaultPins(ctx.koreanDocs)`, 아니면 `arrangeKeys(defaultPins(ctx.koreanDocs), legacyOrder)`. 여기서 `legacyOrder` = `[...arrangeKeys(['xmind', 'hwp', 'pptx', 'templates'], cardOrder), ...arrangeKeys(['docx', 'xlsx', 'design', 'md', 'html', 'pdf', 'photo', 'illust', 'open'], cardOrder)]`(0.18 홈에 보이던 순서)다. 그다음 `hiddenCards`의 열쇠를 빼고, `pinnedApps` 중 앱 열쇠이면서 아직 핀에 없는 것을 뒤에 붙인다. 이유: 0.18의 `moveKey`는 옮긴 묶음 전체를 앞에, 다른 묶음 열쇠를 뒤에 저장했다. 그래서 목록을 그대로 읽으면 '그 밖의 문서' 카드 하나만 옮긴 사람의 마인드맵이 8번째로 밀린다. 또 `cardOrder`에는 그 묶음의 모든 열쇠가 들어 있어서 그 자체로는 "홈에 두고 싶다"는 뜻이 아니다. 7.10도 `md`, `open`, `pdf-tools`, `md-convert`는 '모든 앱'에서 연다고 적었다. 그래서 `cardOrder`는 기본 핀의 순서만 바꾸고 핀을 늘리지 않는다.
- `resolveHomeBoard(stored, legacy, ctx)`: `isBoardValue(stored)`이면 `normalizeHomeBoard(stored, ctx)`. 아니고 `legacy`가 배열 아닌 객체이면 `migrateHomeLayout(normalizeHomeLayout(legacy), ctx)`. 둘 다 아니면 `defaultHomeBoard(ctx)`.
- **Ruling R3:** `homeBoard`가 있어도 판 1 보드가 아니면(깨진 값) 없는 것으로 보고 `homeLayout`에서 다시 옮겨 온다. 이유: 스펙의 실패 조건 "0.18에서 쓰던 위젯이나 메모 글이 사라지는 것". 대가는 없다.
- `readHomeBoard(path, ctx)`: `resolveHomeBoard(settings.homeBoard, settings.homeLayout, ctx)`. 결과의 JSON이 저장된 `homeBoard`와 다르면 `writeAppSetting(path, 'homeBoard', board)`. `homeLayout`은 쓰지 않는다.
- `writeHomeBoard(path, raw, ctx)`: `isBoardValue(raw)`가 아니면 쓰지 않고 `null`. 맞으면 `normalizeHomeBoard(raw, ctx)`를 저장하고 돌려준다. 화면의 잘못으로 보드가 기본 배치로 덮이지 않게 하기 위해서다.
- `boardContextFrom(lang, stored, url)` = `{ korean: lang === 'ko', koreanDocs: koreanDocFeaturesOn(stored, lang), trend: url !== null }`.
- `trendForecastUrl(env)`: `HANPAN_TREND_URL`이 없으면(`undefined`) `TREND_FORECAST_URL`. 빈 값이면 `null`. `http:`, `https:`, `file:` 주소면 `new URL(값).href`. 그 밖은 `null`.
- **Ruling R10:** `HANPAN_TREND_URL`은 시험과 개발용이다. 빈 값은 "기상도 주소가 비어 있는 빌드"(7.10)이고, `file:` 주소는 고정 파일을 읽는다(Task 7). 개발 빌드와 정식 빌드의 기본 주소는 같다.
- `index.ts` `registerHomeIpc`: 모듈에서 `const TREND_URL = trendForecastUrl(process.env)`를 한 번 구한다. `boardContext()` = `boardContextFrom(currentLang(), readKoreanDocFeatures(APP_SETTINGS_PATH()), TREND_URL)`. `getHomeBoard` → `{ board: readHomeBoard(APP_SETTINGS_PATH(), boardContext()), trendAvailable: TREND_URL !== null }`. `setHomeBoard(raw)` → `writeHomeBoard(APP_SETTINGS_PATH(), raw, boardContext())`. 두 처리기는 끝에서 `onHomeBoardChanged()`를 부른다. 모듈 변수 `let onHomeBoardChanged: () => void = () => {}`를 `driveService` 선언(831줄) 옆에 둔다.
- **Ruling R23 (`onHomeBoardChanged` 훅):** Task 7의 트렌드 서비스는 보드가 바뀔 때 `boardChanged()`를 알아야 한다. Task 7이 보드 처리기 안을 고치면 Task 4(바로 위 6729-6733줄의 옛 처리기를 지운다)와 같은 자리를 건드려 합치기 충돌이 난다. 그래서 Task 1이 빈 훅을 두고, Task 7은 `registerTrendIpc`를 부른 자리(10162줄 근처)에서 `onHomeBoardChanged = () => trendService?.boardChanged()`로 바꿔 끼운다.
- 문구 등록(R22): Global Constraints 문구 표의 home-strings 키를 `home-strings.json`에 ko·en·vi로 쓰고 `node tools/hanpan-add-block-strings.mjs apps/shell/src/renderer/src/strings.ts hpManualTip apps/shell/src/renderer/src/hanpan/home-strings.json`를 돌린다. home-custom 키는 `strings-home-custom.ts`의 21개 언어 블록 모두에 넣되(`zh`가 키 집합을 정하므로 `zh`에도 넣는다), ko·en·vi는 표의 값, 나머지 18개 언어는 영어 값이다. 값을 바꾸는 다섯 키(`widgetRecent`, `descFavorites`, `favoritesEmpty`, `pin`, `unpin`)도 같은 규칙이다. `tests/hanpan-vi-strings.test.ts`, `tests/i18n-key-parity.test.ts`, `tests/strings.test.ts`가 통과해야 한다.
- `TrendCard.tsx` 빈 카드: `export function TrendCard(_props: { now?: () => Date } = {}): ReactElement`. `section` 안에 `h2.hb-card-title`(`t('hbTrendTitle')`)과 `<p data-trend-offline>{t('hbTrendOffline')}</p>`만 둔다. 인자 형은 Task 8과 같게 두어 Task 4가 호출을 고치지 않게 한다.
- preload: `getHomeBoard()`는 `{ board: r?.board ?? null, trendAvailable: r?.trendAvailable === true }`를 돌려준다. `setHomeBoard(board)`는 그대로 보낸다.
- `useHomeBoard`:
  - 처음에 `window.aiOffice.getHomeBoard?.()`를 한 번 부른다. 답이 객체가 아니면(옛 preload, 시험의 가짜) `{ board: null, trendAvailable: false }`로 본다.
  - `context` = `{ korean, koreanDocs, trend: trendAvailable }`. `board` = `normalizeHomeBoard(source.board, context)`. 받은 값과 JSON이 다르면 `setHomeBoard`.
  - `korean`이나 `koreanDocs`가 바뀌면 지금 보드를 다시 정리하고, 달라졌으면 저장한다.
  - `update(change)`는 ref에 든 최신 보드에 `change`를 적용해 정리한 뒤 ref와 상태를 바꾸고 `setHomeBoard`를 부른다(실패는 삼킨다). 저장본이 오기 전의 `update`는 무시한다.
- **Ruling R4:** 0.18의 `useHomeLayout`은 기본값을 먼저 그리고 "저장본보다 먼저 한 변경이 이긴다"였다. 보드에서 그렇게 하면 앱이 뜨자마자 한 변경이 0.18에서 옮겨 온 보드를 기본 배치로 덮는다. 그래서 정리는 메인이 읽을 때 하고, 화면은 저장본이 온 뒤에 보드를 그린다. 로컬 IPC라 네트워크 기다림은 없다. 첫 실행의 `seenApps`와 `introduced`도 이때 저장되어 다음 판의 '새 앱'과 새 기본 카드 판단이 맞는다.

- [ ] **Step 1: 실패하는 시험을 쓴다.** `apps/shell/tests/home-board.test.ts`

```ts
const KO: BoardContext = { korean: true, koreanDocs: true, trend: true }
const EN: BoardContext = { korean: false, koreanDocs: false, trend: true }
const KO_NO_URL: BoardContext = { korean: true, koreanDocs: true, trend: false }
const types = (b: HomeBoard) => b.cards.map((c) => c.type)
const sizes = (b: HomeBoard) => b.cards.map((c) => `${c.w}x${c.h}`)

it('lays out six cards on a Korean screen (7.1)', () => {
  const b = defaultHomeBoard(KO)
  expect(types(b)).toEqual(['start', 'trend', 'apps', 'recent', 'memo', 'favorites'])
  expect(sizes(b)).toEqual(['7x2', '5x2', '5x3', '7x3', '6x2', '6x2'])
  expect(b.pinned).toEqual(['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'pdf', 'templates', 'photo', 'illust', 'design', 'html'])
  expect(b.seenApps).toEqual([...APP_KEYS])
  expect(b.introduced).toEqual(types(b))
})
```

그 밖의 시험(이름과 기대값):
- `'has no trend card off a Korean screen or without a forecast address'`: `EN`이면 trend가 없고 핀은 `['xmind', 'pptx', 'docx', 'xlsx', 'pdf', 'photo', 'illust', 'html', 'md', 'pdf-tools', 'md-convert']`. `KO_NO_URL`이면 trend가 없고 `introduced`에도 없다.
- `normalizeHomeBoard`:
  - `it.each([undefined, null, 'x', 3, [], {}, { v: 2, cards: [] }])` → `defaultHomeBoard(KO)`와 같다.
  - 허용되지 않은 크기: memo `{w:5,h:2}` → `6x2`, clock `{w:6,h:2}` → `3x2`, trend `{w:7,h:2}` → `5x2`.
  - trend 둘, favorites 둘 → 각각 처음 것 하나.
  - `{ v: 1, cards: [memo 'm1'], introduced: defaultCardTypes(KO) }` → `types` = `['start', 'apps', 'memo']`.
  - `pinned: ['xmind', 'calc', 'docx', 'xmind']` → `['xmind', 'docx']`. `seenApps`, `recentApps`도 같은 방식이고 `recentApps`는 8개까지.
  - 메모 글 2,001자 → 2,000자, 제목 61자 → 60자. 카드 25장 → 24장.
- 나중에 더한 기본 카드:
  - `KO`에서 `introduced`에 `trend`가 없고 trend 카드도 없는 보드 → trend가 start 바로 뒤에 들어가고 `introduced`에 `trend`가 생긴다.
  - `introduced`에 `trend`가 있고 trend 카드가 없는 보드 → 그대로(사용자가 뺀 카드).
  - `EN`과 `KO_NO_URL`에서는 넣지 않는다.
  - 한국어 화면에서 핀에 hwp가 있는 보드를 `koreanDocs: false`로 정리해도 핀에 hwp가 남는다(Review Focus 3).
- `migrateHomeLayout` (`homeLayout` 예시 셋):
  - `migrateHomeLayout(normalizeHomeLayout(undefined), KO)` → `types` = `['start', 'trend', 'apps', 'recent', 'favorites', 'memo']`, `sizes` = `['7x2', '5x2', '5x3', '7x3', '3x2', '3x2']`.
  - `cardOrder: ['pptx', 'xmind', 'hwp', 'templates']`, `hiddenCards: ['photo']` → `pinned` = `['pptx', 'xmind', 'hwp', 'templates', 'docx', 'xlsx', 'design', 'html', 'pdf', 'illust']`.
  - `cardOrder: ['docx', 'xlsx', 'design', 'md', 'pdf', 'html', 'photo', 'illust', 'open', 'xmind', 'hwp', 'pptx', 'templates']`(0.18에서 AI PDF를 한 칸 올린 모양) → `pinned`가 `'xmind'`로 시작하고 `'pdf'`가 `'html'`보다 앞이다.
  - `wide` 메모(글 `'분기 보고 마감 11/14'`, 제목 `'마감'`) → `6x2`, 글과 제목이 그대로다. 폴더 경로와 바로가기 대상도 그대로다.
  - `pinnedApps: ['md', 'xmind']` → `pinned`의 끝이 `'md'`이고 `'xmind'`는 한 번만 있다.
  - `seenApps` = `APP_KEYS`, `introduced` = `defaultCardTypes(ctx)`. `EN`이면 trend가 없고 핀은 기본 핀(끔)에서 시작한다.
- `resolveHomeBoard`:
  - 판 1 보드가 있으면 `homeLayout`을 보지 않는다.
  - 보드가 없고 `homeLayout`이 있으면 옮겨 온다.
  - `stored`가 `'x'`나 `{ v: 2 }`이고 `homeLayout`이 있으면 옮겨 온다(Review Focus 1).
  - 둘 다 없거나 `homeLayout`이 글자이면 기본 배치다.

`apps/shell/tests/home-board-storage.test.ts`(임시 폴더의 `app-settings.json`):
- `homeLayout`만 있는 파일을 `readHomeBoard(path, KO)`로 읽으면 옮긴 보드를 돌려주고, 파일에 `homeBoard`가 생기며, `homeLayout`은 처음 값과 `toEqual`로 같다.
- 두 번째 읽기는 같은 보드를 돌려준다.
- `writeHomeBoard(path, board, KO)`는 정리한 보드를 저장하고 다른 열쇠(`theme`)를 남긴다.
- `writeHomeBoard(path, 'garbage', KO)`는 `null`이고 파일이 그대로다.
- `boardContextFrom('ko', null, TREND_FORECAST_URL)` → `{ korean: true, koreanDocs: true, trend: true }`. `boardContextFrom('en', true, null)` → `{ korean: false, koreanDocs: true, trend: false }`.

`apps/shell/tests/trend-config.test.ts`: `trendForecastUrl({})` → `'https://trend.tenai.kr/api/forecast'`, `{ HANPAN_TREND_URL: '' }` → `null`, `'http://127.0.0.1:5123/api/forecast'` → 그대로, `'file:///C:/fixtures/forecast.json'` → 그대로, `'ftp://x/y'`와 `'not a url'` → `null`.

`apps/shell/tests/use-home-board.test.ts`(jsdom, 훅을 쓰는 작은 부품을 그린다):
- `getHomeBoard`가 답하기 전에는 `board`가 `null`이고, 답하면 저장된 카드가 나온다.
- 저장된 보드에 trend가 없고 `introduced`에도 없을 때, 한국어 화면과 `trendAvailable: true`이면 trend가 들어가고 `setHomeBoard`가 한 번 불린다.
- `update`를 두 번 잇달아 부른다(메모 글 바꾸기, 그다음 `pinned`에 `md` 더하기). 마지막 `setHomeBoard` 인자에 둘 다 들어 있다(Review Focus 4).
- `getHomeBoard`가 `null`로 답하면 기본 배치를 그린다.

`apps/shell/tests/preload-home-board.test.ts`(`tests/preload-recovery-list.test.ts`처럼 `electron`을 가짜로): `getHomeBoard()`는 `home:get-home-board`를 부르고, `trendAvailable`이 불리언이 아니면 `false`다. `setHomeBoard(board)`는 `home:set-home-board`에 보드를 싣는다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-board.test.ts tests/home-board-storage.test.ts tests/trend-config.test.ts tests/use-home-board.test.ts tests/preload-home-board.test.ts`
  - Expected: FAIL. 모듈을 찾지 못한다.

- [ ] **Step 3: 위 Interfaces와 규칙대로 구현한다.** `index.ts`는 처리기 둘과 `onHomeBoardChanged` 훅만 더하고, 옛 처리기는 Task 4까지 둔다. 문구 등록(R22), `HomeAppCard.sub`, `TrendCard.tsx` 빈 카드도 이 단계에서 한다. 문구를 넣은 뒤 `npm run format`을 돌린다.

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `cd apps/shell && npx vitest run tests/hanpan-vi-strings.test.ts tests/i18n-key-parity.test.ts tests/strings.test.ts`, 그다음 `npm run typecheck -w @genoffice/shell`
  - Expected: 모두 PASS. 형 오류가 없다.

- [ ] **Step 5: 커밋한다.** 두 번 나눠 커밋한다. 첫째 `feat(shell): store the home board and migrate the 0.18 layout`(저장·IPC·훅·빈 카드), 둘째 `feat(shell): register the home board strings in ko, en and vi`(문구 파일 셋과 `HomeAppCard.sub`).

### Task 2: 새로 만들기 카드와 '모든 앱'

**Files:**
- Create: `apps/shell/src/renderer/src/home-board/home-apps.tsx`, `apps/shell/src/renderer/src/home-board/AppsCard.tsx`, `apps/shell/src/renderer/src/home-board/AllApps.tsx`, `apps/shell/src/renderer/src/home-board/apps-card.css`(타일과 '모든 앱' 대화상자. `AppsCard.tsx`와 `AllApps.tsx`가 `import './apps-card.css'`로 들여온다, R21)
- Modify: `apps/shell/src/shared/home-apps.ts`만. (`HomeAppCard.sub`와 문구는 Task 1이 끝냈다. `shared/home-board.ts`, `HomeWidgets.tsx`, 문구 파일은 건드리지 않는다. Task 3과 동시에 돌기 위해서다.)
- Test: `apps/shell/tests/home-apps.test.ts`(새 파일, 순수 함수), `apps/shell/tests/home-apps-ui.test.ts`, `apps/shell/tests/home-dialog-keys.test.ts:63-92`(AllApps 사례를 더함)

**Interfaces:**
- Consumes: Task 1의 `AppKey`, `APP_GROUPS`, `APP_KEYS`, `HomeBoard`, `CardSize`. `apps/shell/src/renderer/src/dialog-keys.ts`의 `useDialogKeys`. `locale.tsx`의 `useI18n`, `StringKey`.
- Produces:

```ts
// shared/home-apps.ts
export function slotGrid(size: CardSize): { cols: number; rows: number }   // cols = w - 1, rows = h
export interface AppSlots { apps: AppKey[]; more: number; empty: number }
export function appSlots(pinned: readonly string[], available: ReadonlySet<string>, size: CardSize): AppSlots
export const RECENT_APPS_MAX = 8
export function withRecentApp(recent: readonly string[], key: AppKey): AppKey[]
export function unseenApps(seen: readonly string[], available: ReadonlySet<string>): AppKey[] // APP_KEYS 순서
// 같은 파일. HomeBoard는 `import type { HomeBoard } from './home-board'`로만 쓴다(R21)
export function recordAppLaunch(board: HomeBoard, key: AppKey): HomeBoard
export function markAppsSeen(board: HomeBoard, available: ReadonlySet<string>): HomeBoard
export function setPinned(board: HomeBoard, key: AppKey, on: boolean): HomeBoard // 켜면 끝에, 끄면 뺀다

// home-board/home-apps.tsx
export interface HomeAppsDeps {
  t: (key: StringKey) => string
  koreanDocs: boolean
  offers: { templates: boolean; design: boolean; converter: boolean } // 이 빌드에 있는 한판 기능
  iconFor: (key: AppKey) => ReactElement
  actions: Record<AppKey, () => unknown>
  onLaunch: (key: AppKey) => void
}
export function buildHomeApps(deps: HomeAppsDeps): HomeAppCard[] // APP_KEYS 순서, 쓸 수 있는 앱만

// home-board/AppsCard.tsx
export function AppsCard(props: {
  apps: readonly HomeAppCard[]; pinned: readonly string[]; size: CardSize; unseen: number
  customizing: boolean; onOpenAll: () => void
  onUnpin?: (key: AppKey) => void; onMove?: (key: AppKey, toIndex: number) => void // Task 5·6
}): ReactElement

// home-board/AllApps.tsx
export function AllApps(props: {
  apps: readonly HomeAppCard[]; pinned: readonly string[]; recent: readonly string[]
  newKeys: ReadonlySet<string>; onLaunch: (key: AppKey) => void
  onTogglePin: (key: AppKey) => void; onClose: () => void
}): ReactElement
```

**정하는 규칙:**
- `appSlots`: `shown` = 쓸 수 있는 핀만, 핀 순서. `total` = (w−1)×h. `shown.length < total`이면 `apps` = shown, `more` = 0, `empty` = total − shown.length − 1. 아니면 `apps` = 앞의 total − 1개, `more` = shown.length − (total − 1), `empty` = 0.
- `withRecentApp`: 그 열쇠를 맨 앞으로 옮기고 8개까지 남긴다.
- `markAppsSeen`: 쓸 수 있는 앱 열쇠를 `seenApps`에 더한다. `unseenApps`는 쓸 수 있는 앱 중 `seen`에 없는 것이다.
- `buildHomeApps`의 가용성: `hwp`는 koreanDocs, `templates`는 koreanDocs && offers.templates, `design`은 koreanDocs && offers.design, `md-convert`는 offers.converter, 나머지는 늘. 각 앱의 `action`은 `onLaunch(key)`를 먼저 부르고 원래 action을 부른다.
- 이름 키와 한 줄 설명 키:

| 열쇠 | 이름 | 한 줄 설명 | 열쇠 | 이름 | 한 줄 설명 |
|---|---|---|---|---|---|
| `xmind` | `newMindmap` | `hpCardMapSub` | `templates` | `hpTemplatesCard` | `hpTemplatesCardSub` |
| `hwp` | `newHwp` | `hpCardHwpSub` | `pdf` | `newPdf` | `hbAppPdfSub` |
| `pptx` | `newSlide` | `hpCardPptSub` | `pdf-tools` | `pdfToolsCard` | `pdfToolsCardSub` |
| `docx` | `newDoc` | `hbAppDocxSub` | `md-convert` | `hpConvCard` | `hpConvCardSub` |
| `xlsx` | `newSheet` | `hbAppXlsxSub` | `photo` | `newPhoto` | `hpPhotoTip` |
| `md` | `newMarkdown` | `hbAppMdSub` | `illust` | `newIllust` | `hpIllustTip` |
| `html` | `newHtml` | `hbAppHtmlSub` | `design` | `hpDesignCard` | `hpDesignCardSub` |
| `open` | `openLocal` | `hbAppOpenSub` | | | |

- AppsCard는 `section`이고 제목은 `h2.hb-card-title`에 `homeCustomText(lang, 'cardApps')`다.
  - 격자 요소는 `div.hb-apps`이고 `--cols: w−1`, `grid-template-columns: repeat(var(--cols), minmax(0, 160px)); justify-content: center; gap: 8px`.
  - 타일은 `<button class="quick-card hb-app" data-new={key} data-tip={sub}>`이고, templates·design·md-convert에는 `data-hanpan`(값은 열쇠)을 더 붙인다. 안에는 아이콘과 이름만 둔다. 'AI' 표시는 없다. xmind에는 `<span class="hp-start-badge">{t('hpStartBadge')}</span>`을 둔다. 그림(`img`)에는 `draggable={false}`.
  - 마지막 앱 다음 칸에 `<button class="hb-all-apps" data-all-apps-open>`(이름 `hbAllApps`)을 둔다. `more` > 0이면 `<span data-all-apps-more>+{more}</span>`, `unseen` > 0이면 `<span data-all-apps-new>{t('hbNewApp')}</span>`.
  - 칸마다 `data-app-slot="<번호>"` 감싸개를 둔다(Task 6이 쓴다). 빈 칸은 평소에 비운다.
- **Ruling R5:** 타일에 `quick-card` 클래스와 templates·design·md-convert의 `data-hanpan`을 그대로 붙인다. 이유: e2e 50개 파일이 `.quick-card[data-new=…]`나 글자로 `.quick-card`를 집고, 12개 파일이 `[data-hanpan="design"]`이나 `[data-hanpan="templates"]`를 누른다. 스펙 8절은 `[data-new="docx"]`, `[data-new="xlsx"]` 시험이 그대로 통과해야 한다고 적었다. 옛 `.quick-card` 모양은 `apps-card.css`가 `.hb-apps .quick-card.hb-app`으로 덮는다(`home.css`는 손대지 않는다).
- AllApps는 `useDialogKeys`를 쓰는 `div[role="dialog"][data-all-apps]`다. 위에서부터:
  1. 검색 칸 `input[data-all-apps-search]`(안내 `hbAllAppsSearch`). 이름과 한 줄 설명을 대소문자 없이 거른다.
  2. 검색어가 없을 때만 '최근에 쓴 앱' 줄 `[data-all-apps-recent]`. 쓸 수 있는 것 중 최신 3개를 `button[data-recent-app=<열쇠>]`로 둔다.
  3. 묶음 `section[data-app-group=<id>]`(제목 `hbGroupDocs` 등). 항목은 `button[data-new=<열쇠>]`(`quick-card` 클래스 없음; 아이콘, 이름, 한 줄 설명, `newKeys`에 있으면 `[data-app-new]` '새 앱')과 핀 단추 `button[data-app-pin=<열쇠>][aria-pressed]`(이름 `pin`/`unpin`)다.
  - 맞는 앱이 없으면 `hbSearchNoApps`. 항목이나 최근 줄을 누르면 `onLaunch(key)` 뒤 `onClose()`.
- **Ruling R6:** '모든 앱' 안에서 `data-new`는 묶음 항목에만 붙이고, 최근 줄은 `data-recent-app`을 쓴다. 이유: 같은 열쇠가 두 번 나오면 Playwright의 엄격한 선택자(`[data-all-apps] [data-new="md"]`)가 둘을 잡아 실패한다.
- 문구: 쓰는 키는 home-strings의 `hbAllApps`, `hbAllAppsSearch`, `hbRecentApps`, `hbGroupDocs`, `hbGroupPdf`, `hbGroupGraphics`, `hbGroupFile`, `hbNewApp`, `hbSearchNoApps`, `hbAppDocxSub`, `hbAppXlsxSub`, `hbAppMdSub`, `hbAppHtmlSub`, `hbAppPdfSub`, `hbAppOpenSub`와 home-custom의 `cardApps`. 모두 Task 1이 등록했다(R22). 이 작업은 문구 파일을 고치지 않는다.

- [ ] **Step 1: 실패하는 시험을 쓴다.**

`tests/home-apps.test.ts`(새 파일):

```ts
const ALL = new Set(APP_KEYS)
it.each([[{ w: 5, h: 2 }, 8], [{ w: 5, h: 3 }, 12], [{ w: 7, h: 2 }, 12], [{ w: 7, h: 3 }, 18]])(
  'a %j card has %i app slots', (size, n) => {
    const s = slotGrid(size)
    expect(s.cols * s.rows).toBe(n)
  })
it('puts All apps right after the last pin', () => {
  expect(appSlots(['xmind', 'docx', 'pdf'], ALL, { w: 5, h: 3 })).toEqual({ apps: ['xmind', 'docx', 'pdf'], more: 0, empty: 8 })
})
it('makes the last slot All apps with +N when pins overflow', () => {
  const pins = APP_KEYS.slice(0, 14)
  expect(appSlots(pins, ALL, { w: 5, h: 3 })).toEqual({ apps: pins.slice(0, 11), more: 3, empty: 0 })
})
```

그 밖:
- `appSlots`는 쓸 수 없는 핀을 건너뛰고 다음 핀을 당긴다. 그래도 `pinned` 자체는 바꾸지 않는다(Review Focus 3).
- `withRecentApp`: `R = ['docx', 'xlsx', 'pdf', 'md', 'html', 'xmind', 'pptx', 'photo']`일 때 `withRecentApp(R, 'pdf')` → `['pdf', 'docx', 'xlsx', 'md', 'html', 'xmind', 'pptx', 'photo']`, `withRecentApp(R, 'open')` → `['open', 'docx', 'xlsx', 'pdf', 'md', 'html', 'xmind', 'pptx']`.
- `unseenApps(['xmind'], new Set(['xmind', 'design']))` → `['design']`. `markAppsSeen` 뒤에는 `[]`.
- `setPinned(board, 'md', true)`는 끝에 붙인다(두 번 해도 하나). `false`는 뺀다.

`tests/home-apps-ui.test.ts`(jsdom, `LocaleProvider` 'ko'):
- `buildHomeApps`: koreanDocs가 켜지고 offers가 모두 참이면 15개가 `APP_KEYS` 순서로 나온다. koreanDocs가 꺼지면 hwp, templates, design이 없다(12개). converter가 거짓이면 md-convert가 없다. `apps[0].action()`은 `onLaunch('xmind')`를 부른 뒤 원래 action을 부른다.
- AppsCard(기본 핀(켬), 5×3, 15개 모두 쓸 수 있음):
  - `.quick-card`의 `data-new`가 핀 11개 순서와 같다. 12번째 칸이 `[data-all-apps-open]`이다.
  - xmind 타일에 `.hp-start-badge`가 있다. templates 타일의 `data-hanpan`이 `'templates'`, design은 `'design'`이다. 카드 안에 `.ai-chip`이 없다. 타일의 `data-tip`이 그 앱의 한 줄 설명이다.
- 5×2에 핀 11개: 타일 7개와 `[data-all-apps-more]`의 글자 `'+4'`.
- `unseen` 2이면 `[data-all-apps-new]`가 보인다. 0이면 없다.
- AllApps:
  - 검색 칸이 처음 초점을 받는다. 검색어를 넣으면 최근 줄이 사라지고 맞는 항목만 남는다. 없으면 '맞는 앱이 없습니다'.
  - 최근 줄은 `recent`의 쓸 수 있는 것 중 앞 3개를 그 순서로 보이고, 그 단추에는 `data-new`가 없다.
  - 묶음 항목에는 `data-new`가 있고 `quick-card` 클래스는 없다.
  - 항목을 누르면 `onLaunch`와 `onClose`가 순서대로 불린다.
  - 핀 단추의 `aria-pressed`가 `pinned`를 따르고, 누르면 `onTogglePin(열쇠)`.
  - `newKeys`에 든 항목에만 `[data-app-new]`. Esc는 `onClose`.

`tests/home-dialog-keys.test.ts`의 `cases`에 `['all apps', (onClose) => createElement(AllApps, {…, onClose})]`를 더한다(열리면 초점, 본문에 초점이 빠져도 Esc로 닫힘).

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-apps.test.ts tests/home-apps-ui.test.ts tests/home-dialog-keys.test.ts`
  - Expected: FAIL. 새 함수와 부품이 없다.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run typecheck -w @genoffice/shell`, `npm run check:theme-colors`
  - Expected: 모두 PASS.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): add the New card and the All apps list`

### Task 3: 시작 카드, 이어서 하기 카드, 위젯 카드 몸통

**Files:**
- Create: `apps/shell/src/renderer/src/home-board/RecentCard.tsx`, `apps/shell/src/renderer/src/home-board/board-geometry.ts`, `apps/shell/src/shared/home-board-edit.ts`(보드 편집 함수. Task 5가 더한다, R21)
- Modify: `apps/shell/src/renderer/src/hanpan/StartBoard.tsx:10-45, 77-88, 130-149`, `apps/shell/src/renderer/src/hanpan/hanpan.css:341-400`(흐름 그림 규칙을 지운다), `apps/shell/src/renderer/src/Home.tsx:3568-3572`(`korean` 인자를 뺀다. 이 다섯 줄만), `apps/shell/src/renderer/src/HomeWidgets.tsx:148-159, 214-247, 457-665, 698-728`. 문구 파일과 `shared/home-board.ts`는 건드리지 않는다(Task 1이 끝냈다).
- Test: `apps/shell/tests/hanpan-start-board.test.ts`(다시 쓴다), `apps/shell/tests/home-cards-ui.test.ts`, `apps/shell/tests/board-geometry.test.ts`, `apps/shell/tests/home-board-edit.test.ts`(새 파일), `apps/shell/tests/home-widgets.test.ts:221-229`

**Interfaces:**
- Consumes: Task 1의 `HomeBoard`, `BoardCard`, `CARD_SIZES`, `sizeKey`, `parseSizeKey`. Task 2의 `HomeAppCard`(sub 포함).
- Produces:

```ts
// hanpan/StartBoard.tsx
export function StartBoard(props: { greeting: string; t: (key: string) => string }): ReactElement   // korean 인자와 flowGeometry를 없앤다

// shared/home-board-edit.ts (R21; home-board.ts의 정리 함수를 가져다 쓴다)
export function updateCard(board: HomeBoard, id: string, patch: Record<string, unknown>): HomeBoard   // id·type 유지, 카드 정리 규칙 그대로
export function moveCard(board: HomeBoard, id: string, delta: -1 | 1): HomeBoard

// home-board/board-geometry.ts
export function recentRows(h: number): number   // h >= 3이면 6, 아니면 3

// home-board/RecentCard.tsx
export function RecentCard(props: {
  title: string; rows: number; total: number; reloadKey: unknown; onShowAll: () => void
  describe: (entry: RecentEntry) => { location: string; modified: string }
  iconFor: (ext: string) => ReactElement
}): ReactElement

// HomeWidgets.tsx
type WidgetLike = HomeWidget | BoardCard
export function widgetTitle(widget: WidgetLike, text: Text, cards: readonly HomeAppCard[]): string
function WidgetForm(props: {
  widget: WidgetLike; cards: readonly HomeAppCard[]; text: Text
  sizeOptions: { value: string; label: string }[]; sizeValue: string
  onPatch: (values: Record<string, unknown>) => void; onSize: (value: string) => void
  onMove: (delta: -1 | 1) => void; onDone: () => void
}): ReactElement
export function WidgetBody(props: {
  card: BoardCard; update: (change: (prev: HomeBoard) => HomeBoard) => void
  apps: readonly HomeAppCard[]; lang: Lang; dateLocale: string; reloadKey: unknown
  editing: boolean; onEdit: (id: string | null) => void
}): ReactElement   // memo, favorites, folder, clock, shortcut
```

**정하는 규칙:**
- StartBoard:
  - 오른쪽 그림(`figure.hp-flow`)과 `flowGeometry`, `FLOW_STEP`, `korean` 인자를 지운다.
  - 사용 설명서 단추(`data-hanpan="start-guide"`, `data-tip`, `openHelp('hanpan')`)는 그대로 두고, 단추 안 끝에 `<kbd class="hp-guide-key">F1</kbd>`를 붙인다.
  - 예시 칩은 `t('hbExample1')`, `t('hbExample2')`, `t('hbExample3')`.
- RecentCard:
  - 처음 그릴 때와 `reloadKey`가 바뀔 때 `window.aiOffice.recents({ limit: rows })`를 부른다.
  - 머리에 제목과 `button[data-recent-all]`(`t('hbRecentAll', { n: total })`, 누르면 `onShowAll`)을 둔다.
  - 줄은 `button[data-recent-file=<경로>]`이고 안에 `iconFor(ext)`, `.hb-recent-name`(파일 이름, `title`에 전체 이름, 말줄임), 위치, 고친 때가 있다. 누르면 `window.aiOffice.openPath(경로)`. `missing`이면 `disabled`.
  - 비었으면 `homeCustomText(lang, 'recentEmpty')`(ko '최근 문서가 없습니다.'). 이 키는 `strings.ts`가 아니라 `strings-home-custom.ts`에 있으므로 `useI18n()`의 `lang`을 쓴다. `t('hbRecentAll', { n })`은 `strings.ts`(`useI18n().t`)다.
  - `describe`는 Home.tsx의 `locationLabel(path, roots)`(311줄)과 `formatModified(mtimeMs, i18n)`(252줄)로 만든다. 둘 다 모듈 함수라 Task 4가 그대로 넘긴다.
- HomeWidgets:
  - `WidgetForm`은 0.17 화면을 그대로 두고, 바꾸는 일만 콜백으로 받는다. 옛 위젯 줄(Task 4까지 남는다)은 small·wide 두 개를 넘기고, `WidgetBody`는 `CARD_SIZES[type]`을 `{ value: sizeKey(s), label: homeCustomText(lang, 'sizeOption', s) }`로 넘긴다.
  - `WidgetBody`는 머리 `header.hw-head`에 `h2.hw-title`과 `button[data-widget-settings]`(이름 `` `${title} ${text('settings')}` ``, `aria-pressed={editing}`)을 두고, 편집 중이면 `WidgetForm`, 아니면 0.17 몸통을 그린다. 바꾸기는 `update((b) => updateCard(b, id, values))`, 크기는 `updateCard(b, id, parseSizeKey(value))`, 옮기기는 `moveCard`.
  - `FavoritesBody`는 별표한 파일만 보인다. `pinned` 인자와 `[data-fav-app]` 단추를 지운다(7.7). 옛 `HomeWidgets` 줄의 호출도 맞춘다.
- 문구: 쓰는 키는 home-strings의 `hbExample1~3`, `hbRecentAll`과 home-custom의 `sizeOption`, `widgetRecent`, `descFavorites`, `favoritesEmpty`, `recentEmpty`. 모두 Task 1이 등록하거나 바꿨다(R22).

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/hanpan-start-board.test.ts`(다시 쓴다):
    - `'has no flow figure'`: `.hp-flow`가 없다.
    - `'shows F1 on the guide button and opens Hanpan\'s guide'`: `[data-hanpan="start-guide"] kbd`의 글자가 `'F1'`이고 `data-tip`이 `'hpManualTip'`이다. 누르면 `window.aiOffice.openHelp`가 `'hanpan'`으로 불린다.
    - `'offers office examples that start a map'`: 칩 글자가 `['hbExample1', 'hbExample2', 'hbExample3']`이고, 첫 칩을 누르면 `window.hanpanApi.newMap('hbExample1')`.
  - `tests/board-geometry.test.ts`: `recentRows(3)` = 6, `recentRows(2)` = 3.
  - `tests/home-board-edit.test.ts`(새 파일): `updateCard`는 제목 61자를 60자로 자르고 id·type은 바꾸지 않는다. 허용되지 않은 크기 `{w:5,h:2}`를 준 memo는 6×2가 된다. `moveCard`는 한 칸 옮기고 양 끝에서는 그대로다.
  - `tests/home-cards-ui.test.ts`(jsdom, `LocaleProvider` 'ko'):
    - RecentCard(`rows` 6, `total` 12): `recents`가 `{ limit: 6 }`으로 불린다. 줄마다 이름·위치·고친 때가 보인다. 줄을 누르면 `openPath(경로)`. `[data-recent-all]`의 글자가 `'전체 12개'`이고 누르면 `onShowAll`. 목록이 비면 '최근 문서가 없습니다.'.
    - WidgetBody 메모: 글을 바꾸고 focusout하면 `update`가 불리고, 그 결과 보드의 메모 글이 바뀐다.
    - 메모의 설정 단추 이름에 '빠른 메모'와 '설정'이 들어 있다. 크기 칸의 값이 `['3x2', '6x2']`이고 `'6x2'`를 고르면 카드가 6×2가 된다.
    - 즐겨찾기: 별표 파일이 보이고 `[data-fav-app]`가 없다. 비었을 때 글에 '앱을 고정'이 없다.
  - `tests/home-widgets.test.ts:221-229`: 이름을 `'lists starred files in the favorites widget'`로 바꾸고 `[data-fav-app]`를 기대하지 않는다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/hanpan-start-board.test.ts tests/board-geometry.test.ts tests/home-board-edit.test.ts tests/home-cards-ui.test.ts tests/home-widgets.test.ts`
  - Expected: 새 시험이 FAIL이다.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run typecheck -w @genoffice/shell`
  - Expected: 모두 PASS.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): card bodies for the start, recent and widget cards`

### Task 4: 보드 화면, 왼쪽 메뉴의 '홈', 머리 줄 검색

**Files:**
- Create: `apps/shell/src/renderer/src/home-board/BoardGrid.tsx`, `apps/shell/src/renderer/src/home-board/home-board.css`(격자·카드 틀·머리 줄. `BoardGrid.tsx`가 `import './home-board.css'`, R21). `TrendCard.tsx` 빈 카드는 Task 1이 만들었으므로 들여오기만 한다.
- Modify:
  - `apps/shell/src/renderer/src/Home.tsx`: 1161(`view`), 1338-1392(`reload`), 1655-1663(`changeView`), 2041-2403(옛 카드와 위젯 묶음을 바꾼다), 3422-3433(폴더 보기의 빠른 시작), 3551-3738(`renderGlobalContent`를 나눈다), 3788-3821(왼쪽 메뉴), 3913-3932(본문 고르기), 대화상자는 루트로
  - `apps/shell/src/renderer/src/HomeWidgets.tsx`: 66-124(`useHomeLayout`, `addWidgetTo`, `arrangeCards`를 지운다. `configuresOnAdd`는 Task 5가 쓰므로 남긴다), 667-829(`HomeWidgets` 줄을 지운다), `boardCardName`을 더한다
  - `apps/shell/src/renderer/src/home-board/board-geometry.ts`, `apps/shell/src/renderer/src/hanpan/hanpan.css:405-524`(옛 카드 규칙을 지운다. 441-452의 `.hp-start-badge`는 남긴다)
  - `apps/shell/src/main/index.ts:6729-6733`, `apps/shell/src/preload/index.ts:440-445`, `apps/shell/src/shared/home-api.ts:368-371, 628-629`(옛 `getHomeLayout`·`setHomeLayout`을 지운다. Task 1이 더한 `getHomeBoard`·`setHomeBoard`와 `onHomeBoardChanged` 훅은 그대로 둔다)
  - 문구 파일은 건드리지 않는다(`hbTrendTitle`, `hbTrendOffline`, `navHome`, `cardStart`, `cardTrend`는 Task 1이 등록했다, R22)
- Delete: `apps/shell/src/main/home-layout.ts`
- Test: `apps/shell/tests/home-widgets.test.ts`, `apps/shell/tests/home-korean-cards.test.ts`, `apps/shell/tests/home-navigation.test.ts`, `apps/shell/tests/home-subscription-entry.test.ts:196`, `apps/shell/tests/home-layout.test.ts:219-246`(저장 시험을 지운다), `apps/shell/tests/board-geometry.test.ts`

**Interfaces:**
- Consumes: Task 1의 `useHomeBoard`, `HomeBoard`, `BoardCard`, `sizeKey`. Task 2의 `buildHomeApps`, `AppsCard`, `AllApps`, `appSlots`, `unseenApps`, `markAppsSeen`, `recordAppLaunch`, `setPinned`. Task 3의 `StartBoard`, `RecentCard`, `WidgetBody`, `recentRows`.
- Produces:

```ts
// home-board/board-geometry.ts
export const BOARD_ROW_PX = 96
export const BOARD_GAP_PX = 14
export type BoardColumns = 12 | 6 | 1
export function cardSpan(w: number, cols: BoardColumns): number   // 12 → w, 6 → (w >= 5 ? 6 : 3), 1 → 1

// home-board/BoardGrid.tsx
export function BoardGrid(props: {
  board: HomeBoard
  cardName: (card: BoardCard) => string
  renderCard: (card: BoardCard) => ReactElement
}): ReactElement

// home-board/TrendCard.tsx: Task 1의 빈 카드를 그대로 쓴다. `<TrendCard />`로 부른다(Task 8이 안을 채운다)

// HomeWidgets.tsx
export function boardCardName(card: BoardCard, lang: Lang, apps: readonly HomeAppCard[]): string
// start → cardStart, trend → cardTrend, apps → cardApps, recent → 제목 또는 widgetRecent, 나머지 → widgetTitle
```

- `Home.tsx`의 `view`는 `'home' | 'recent' | 'starred'`이고 기본은 `'home'`이다. 보드는 `const { board, context, update: updateBoard } = useHomeBoard({ korean: lang === 'ko', koreanDocs })`로 얻는다.

**정하는 규칙:**
- BoardGrid는 `<section class="hb-board" data-home-board data-cols="12" style="--cols: 12">` 안에 카드마다 `<section class="hb-card" data-card={id} data-card-type={type} data-size={sizeKey} aria-label={cardName} style="--span: {cardSpan(w, 12)}; --rows: {h}">`와 `div.hb-card-body`를 둔다. 열 수는 이 작업에서 12로 고정한다(Task 9가 잰다).
- CSS: 보드는 `display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-auto-rows: 96px; gap: 14px; grid-auto-flow: row dense`. 카드는 `grid-column: span var(--span); grid-row: span var(--rows); min-width: 0`.
- 본문 고르기: 폴더 보기 → `renderFolderContent()`, 드라이브 → `DrivePanel`, 묻기 → `KbAskPanel`, `view === 'home'` → `renderBoardContent()`, 그 밖 → `renderListContent()`(지금 `renderGlobalContent`의 `section.recents`만).
- `renderBoardContent()`: `main.content.hb-content` 안에 머리 줄 `div.hb-head[data-board-head]`(왼쪽에 `.file-search-group` = `renderSearchBox()` + `renderSearchSettingsButton()`)을 두고, 그 아래에 검색 중이면 `renderBoardSearch()`, 아니면 보드가 왔을 때 `<BoardGrid>`를 둔다. '홈 꾸미기' 단추는 Task 5가 더한다.
- `renderBoardSearch()`는 `section.recents.hb-search` 안에 거르기 단추(`FILTERS`)와 `renderSearchHeading()`, 그 아래 `renderSearchResults()`를 둔다.
- **Ruling R8:** 스펙 7.0은 머리 줄에 검색 칸과 설정 단추만 적었다. 하지만 검색은 `ext` 거르기를 함께 쓰고, `e2e/home-search.spec.ts`가 결과 위의 `.filter-pill`과 `.recents-heading .file-count`를 쓴다. 그래서 검색 결과가 보드 자리에 나올 때 거르기 단추와 결과 수를 결과 위에 둔다. 스펙의 "같은 검색"과 "e2e를 최소한만 고친다"에 맞는다.
- 카드 몸통(`cardBody(card)`):
  - start → `window.hanpanApi?.newMap ? <StartBoard greeting t /> : 지금의 .home-hero`
  - trend → `<TrendCard />`
  - apps → `<AppsCard apps pinned={board.pinned} size={card} unseen={unseenApps(board.seenApps, available).length} customizing={false} onOpenAll={openAllApps} />`
  - recent → `<RecentCard title={boardCardName(…)} rows={recentRows(card.h)} total={recentAll} reloadKey={widgetTick} onShowAll={() => changeView('recent')} describe={…} iconFor={(ext) => <FileBadge ext={ext} size={24} />} />`(`describe`는 `locationLabel`과 `formatModified`로 만든다)
  - 그 밖 → `<WidgetBody …/>`
- **Ruling R7:** 스펙은 폴더 보기를 말하지 않는다. 0.18에서는 폴더 보기 위의 카드로 만든 새 파일이 그 폴더에 저장된다(`newFileOpts`, `e2e/home-folders.spec.ts`). 이 기능을 잃지 않으려고 폴더 보기의 `section.quick-start`에 `<AppsCard size={{ w: 7, h: 2 }} customizing={false} …/>`를 둔다(12칸, 꾸미기 없음).
- 앱 목록은 그릴 때마다 `buildHomeApps({ t, koreanDocs, offers: { templates: !!window.hanpanApi, design: !!window.hanpanApi?.openDesign, converter: converterApi !== null }, iconFor, actions, onLaunch: (key) => updateBoard((b) => recordAppLaunch(b, key)) })`로 만든다. `actions`는 지금 `quickCardDefs`(2085-2225줄)의 action을 열쇠별로 옮긴 것이다(`pdf-tools` = `window.aiOfficePdfToolsHome.open()`, `md-convert` = `setConverterOpen(true)`, `templates` = `setTemplatesOpen(true)`, `design` = `window.hanpanApi?.openDesign?.()`, `open` = `window.aiOffice.browse()`, 새 문서는 `made(ext).action`, 곧 `newFileOpts`). `recordAppLaunch`, `setPinned`, `markAppsSeen`은 `shared/home-apps`에서 들여온다(R21).
- **Ruling R18:** '최근에 쓴 앱'은 홈을 거친 실행만 센다(보드 타일, 모든 앱, 폴더 보기 카드, 앱 바로가기 위젯). 탭 줄의 "+" 메뉴와 파일 메뉴의 새로 만들기는 메인 프로세스에서 바로 열려 보드를 지나지 않는다. 스펙의 "앱을 실행할 때마다"를 홈의 실행으로 읽는다.
- 대화상자는 본문 밖(루트)에 둔다: `TemplatePicker`, `MarkdownConverter`, `AllApps`. `AllApps`를 열 때 `newKeys = new Set(unseenApps(board.seenApps, available))`를 잡아 두고 `updateBoard((b) => markAppsSeen(b, available))`를 부른다. 핀 단추는 `setPinned`.
- `reload`: `view === 'home'`이면 두 목록을 `limit: 0`으로 물어 왼쪽 메뉴의 수와 `recentAll`만 채운다.
- 왼쪽 메뉴 맨 위에 `button.nav-item[data-nav="home"]`(집 그림, 이름 `homeCustomText(lang, 'navHome')`, 수 없음)을 둔다. `activeNav`가 `'home'`이면 선택된다.
- 지운다: `quickCardDefs`, `homeAppCards`, `renderQuickCards`, `renderCustomizePanel`, `renderWidgets`, `useHomeLayout` 사용, `.hp-cards` 표시, HomeWidgets의 `HomeWidgets`·`useHomeLayout`·`addWidgetTo`·`arrangeCards`, 메인·preload·`HomeApi`의 `getHomeLayout`·`setHomeLayout`, `main/home-layout.ts`. `HomeCustomizePanel`과 `WidgetGallery`는 Task 5가 보드용으로 바꿀 때까지 둔다.
- 문구: 쓰는 키는 home-strings의 `hbTrendTitle`, `hbTrendOffline`과 home-custom의 `navHome`, `cardStart`, `cardTrend`. Task 1이 등록했다(R22).
- **Ruling R19:** 스펙 7.12는 '새로 만들기', '이어서 하기'를 홈 카드 제목(11개 언어)으로 묶었다. 같은 이름이 홈 꾸미기(카드 고르기, 목록 창)에도 나오고, 스펙은 그것을 21개 언어로 번역한다. 그래서 카드 종류 이름(`cardStart`, `cardApps`, `cardTrend`, `widgetRecent`)은 `strings-home-custom.ts` 한 곳(21개 언어)에 둔다. 번역 범위가 줄지 않고, 같은 낱말을 두 번 번역하지 않는다.

- [ ] **Step 1: 시험을 먼저 고친다.**
  - `tests/board-geometry.test.ts`: `cardSpan(7, 12)` = 7, `cardSpan(5, 12)` = 5.
  - `tests/home-widgets.test.ts`:
    - `installHome`의 `getHomeLayout`·`setHomeLayout`을 `getHomeBoard: async () => ({ board: stored ?? null, trendAvailable: false })`와 `setHomeBoard`(받은 값을 `stored`에 둔다)로 바꾼다.
    - 도우미 `cards()` = `[data-card]`, `cardTypes()`.
    - 기본 시험: 한국어 화면, 주소 없음 → `cardTypes()` = `['start', 'apps', 'recent', 'memo', 'favorites']`. 이어서 하기 카드에 `'report.hwp'`가 있다.
    - 깨진 보드(`{ v: 1, cards: 12 }`)는 기본 카드가 되고 `.quick-card[data-new="pdf"]`가 있다.
    - 메모 저장, 링크·파일·앱 바로가기, 폴더 보기, 시계 시험은 그 카드를 넣은 `stored` 보드로 시작한다(카드 고르기는 Task 5). 설정 폼에는 `[data-widget-settings]`로 들어간다.
    - 크기 시험은 memo의 `select[name="size"]`를 `'6x2'`로 바꾸고 `data-size`가 `'6x2'`인지 본다.
    - 표를 쓰는 시험(열린 탭의 파일 지우기, 빈 거르기, '목록에서 뺐습니다' 알림)은 먼저 `.nav-item`의 'Recent'(한국어 '최근 사용')를 누른다.
    - 0.17 꾸미기 창 시험 묶음(394-472줄)은 Task 5에서 다시 쓴다. 이 작업에서는 지운다.
  - `tests/home-korean-cards.test.ts`:
    - `card(key)`의 선택자를 `` `[data-home-board] .quick-card[data-new="${key}"]` ``로 바꾼다.
    - '두 칸 카드' 시험 둘은 이렇게 바꾼다: `[data-all-apps-open]`을 눌러 `[data-all-apps] [data-new="pdf-tools"]`와 `[data-new="md-convert"]`가 각자 항목인지 보고, 누르면 `openTools`가 불리고 `[data-hanpan="md-converter"]`가 열린다.
    - '파일 탭 여섯' 시험은 먼저 'Recent'로 간다.
  - `tests/home-navigation.test.ts`:
    - `'starts on Home'`을 더한다: `selected()` = `['Home']`이고 `[data-home-board]`가 있다.
    - 'keeps the file-type filter…' 시험은 먼저 `nav('Recent')`를 누른다.
  - `tests/home-subscription-entry.test.ts:196`: `.sidebar-nav .nav-item`이 4개다.
  - `tests/home-layout.test.ts`: 219-246줄(`readHomeLayout`·`writeHomeLayout`)을 지운다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-widgets.test.ts tests/home-korean-cards.test.ts tests/home-navigation.test.ts tests/home-subscription-entry.test.ts tests/board-geometry.test.ts`
  - Expected: FAIL(보드가 아직 없다).

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: `npm run test -w @genoffice/shell`, `npm run typecheck -w @genoffice/shell`, `npm run lint`, `npm run check:theme-colors`
  - Expected: Windows에서 원래 실패하는 것 말고는 PASS다. 형·lint·색 검사 오류가 없다.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): show the home board and the Home entry in the sidebar`

### Task 5: 홈 꾸미기 (키보드로 다 되는 부분)

**Files:**
- Modify: `apps/shell/src/shared/home-board-edit.ts`(R21), `apps/shell/src/renderer/src/home-board/BoardGrid.tsx`, `apps/shell/src/renderer/src/home-board/AppsCard.tsx`, `apps/shell/src/renderer/src/HomeWidgets.tsx:831-1107`(카드 고르기와 목록 창을 보드용으로), `apps/shell/src/renderer/src/Home.tsx`(꾸미기 상태, 머리 줄 단추, 안내 줄, 대화상자, Esc), `apps/shell/src/renderer/src/home-board/home-board.css`, `apps/shell/src/shared/home-layout.ts:187-292`(쓰지 않게 된 편집 함수를 지운다). 문구 파일은 건드리지 않는다(R22).
- Test: `apps/shell/tests/home-board-edit.test.ts`(편집 동작), `apps/shell/tests/home-customize.test.ts`, `apps/shell/tests/home-dialog-keys.test.ts:70-92`, `apps/shell/tests/home-layout.test.ts:146-217`(지운 함수의 시험을 지운다)

**Interfaces:**
- Consumes: Task 1~4의 것. `@genoffice/ui`의 `useDismissablePopover`.
- Produces:

```ts
// shared/home-board-edit.ts (R21)
export function isRemovable(type: BoardCardType): boolean            // start, apps만 거짓
export function canAddCard(board: HomeBoard, type: BoardCardType): boolean
export function addCard(board: HomeBoard, type: BoardCardType): { board: HomeBoard; id: string | null } // 끝에 DEFAULT_SIZE로
export function removeCard(board: HomeBoard, id: string): HomeBoard  // start·apps면 그대로
export function moveCardTo(board: HomeBoard, id: string, targetId: string): HomeBoard // 끈 카드가 놓은 카드의 자리를 갖는다
export function nearestSize(type: BoardCardType, size: CardSize): CardSize // |Δw|+|Δh| 최소, 같으면 CARD_SIZES 앞쪽
export function resizeCard(board: HomeBoard, id: string, size: CardSize): HomeBoard
export function moveApp(board: HomeBoard, key: AppKey, toIndex: number): HomeBoard   // pinned 안에서
export function resetHomeBoard(board: HomeBoard, ctx: BoardContext): HomeBoard

// BoardGrid props에 더한다
customizing: boolean
update: (change: (prev: HomeBoard) => HomeBoard) => void
lang: Lang
onEdit: (id: string | null) => void

// HomeWidgets.tsx
export function WidgetGallery(props: { board: HomeBoard; trendAvailable: boolean; lang: Lang; onPick: (type: BoardCardType) => void; onClose: () => void }): ReactElement
export function HomeCustomizePanel(props: {
  board: HomeBoard; update: (change: (prev: HomeBoard) => HomeBoard) => void
  apps: readonly HomeAppCard[]; lang: Lang; cardName: (card: BoardCard) => string
  themeLabels: { title: string } & Record<UiTheme, string>
  onOpenGallery: () => void; onClose: () => void
}): ReactElement
```

**정하는 규칙:**
- 꾸미기 상태(`customizing`)는 `Home.tsx`가 갖는다.
  - 머리 줄 오른쪽에 `button.home-custom-open[data-home-custom="open"][aria-pressed]`('홈 꾸미기', 있는 `customize`)을 둔다. 누르면 켜고 끈다.
  - 켜지면 머리 줄 바로 아래에 `div[role="toolbar"][data-customize-bar]`가 생긴다. 글은 `customizeHint`, 단추는 `[data-customize="add"]`(`addCard`), `[data-customize="reset"]`(`resetBoard`), `[data-customize="list"]`(`listView`), `[data-customize="done"]`(`done`)이다.
  - 대화상자나 카드 메뉴가 열려 있지 않을 때 Esc를 누르면 꺼진다. 대화상자는 `useDialogKeys`가 Esc를 먼저 받는다.
  - 꾸미기 상태에서는 보드에 `data-customizing="true"`를 붙이고, 카드마다 점선 테두리를 그린다(7.8).
- 꾸미기 상태의 카드 도구(`.hb-card-tools`, 카드 오른쪽 위):
  - `button[data-card-menu]`(이름 `cardMenu`)는 `div[role="menu"]`를 연다. 안에는 허용 크기마다 `button[role="menuitemradio"][data-card-size="<w>x<h>"][aria-checked]`(이름 `sizeOption`)가 있고, 위젯 카드에는 `button[role="menuitem"][data-card-menu-settings]`('설정', `onEdit(id)`)도 있다. Esc와 바깥 누르기로 닫는다(`useDismissablePopover`).
  - 뺄 수 있는 카드에는 `button[data-card-remove]`(이름 `removeCard`)를 둔다.
  - 카드 몸통에는 `inert`를 붙인다. 새로 만들기 카드만 빼고.
- **Ruling R16:** 꾸미기 상태에서는 새로 만들기 카드를 뺀 카드 몸통이 반응하지 않는다(`inert`). 새로 만들기 카드의 타일도 앱을 열지 않고, ×와 끌기(Task 6)만 받는다. 이유: 실패 조건 "앱을 누르려다 끌려서 배치가 바뀌는 것"의 반대쪽, 곧 배치를 고치다 앱이 열리는 일을 막는다. 평소 상태에는 영향이 없다.
- AppsCard 꾸미기: 타일마다 `button[data-app-unpin=<열쇠>]`(이름 `unpinApp`, 누르면 `onUnpin`)를 둔다. 빈 칸마다 점선 `button[data-app-slot-add]`('앱 추가')를 두고 누르면 `onOpenAll`이다.
- 카드 고르기(`WidgetGallery`, '카드 추가'): 순서는 `shortcut`, `memo`, `folder`, `clock`, `recent`, `favorites`, `trend`. 이름은 0.17 이름과 `widgetRecent`, `cardTrend`, 설명은 0.17 설명과 `descTrend`. `canAddCard`가 거짓이면 `disabled`이고 설명 자리에 `already`를 둔다. 24장이면 목록 위에 `boardFull`. 고르면 `addCard`를 하고, `memo`·`shortcut`·`folder`는 바로 설정 폼을 연다(`configuresOnAdd`). `trendAvailable`(= `context.trend`)이 거짓이면 `trend` 항목을 아예 두지 않는다.
- **Ruling R29 (주소 없는 빌드의 트렌드 카드 추가):** 스펙 7.6은 다른 언어 화면에서 '카드 추가'로 트렌드 카드를 넣을 수 있다고 했다. 그러나 기상도 주소가 비어 있는 빌드(`HANPAN_TREND_URL=''`, e2e 기본)에서는 넣어 봐야 늘 오프라인 안내만 보인다. 그래서 주소가 있을 때만 고르기에 보인다. 정식 빌드는 주소가 있으므로(6절) 스펙의 동작은 그대로다.
- '기본 배치로'는 `useDialogKeys`를 쓰는 `div[role="dialog"][data-reset-confirm]`(글 `resetBoardAsk`, `button[data-reset="yes"]` = `resetYes`, `button[data-reset="no"]` = `cancel`)을 띄운다. '예'를 누르면 `resetHomeBoard(board, context)`.
- **Ruling R17:** `resetHomeBoard`는 카드를 지우지 않는다. 기본 카드(`defaultCardTypes(ctx)`)를 기본 순서·기본 크기로 앞에 두고(없으면 다시 넣고, 있으면 제목과 기본 메모 `memo`의 글을 남긴다), 나머지 카드는 지금 순서대로 뒤에 둔다. `pinned`는 `defaultPins(ctx.koreanDocs)`, `introduced`에는 기본 종류를 더하고, `seenApps`와 `recentApps`는 그대로다. 테마는 건드리지 않는다. 이유: 스펙 7.8은 "기본 카드 6장의 순서와 크기, 기본 핀만 되돌린다"고 적었다. 0.17의 되돌리기처럼 테마를 바꾸거나 카드를 지우면 그 말을 어긴다. 목록 창에는 되돌리기 단추를 두지 않는다(안내 줄 한 곳).
- 목록 창(`HomeCustomizePanel`, `data-home-custom="panel"`):
  - '카드'(`boardCards`) 묶음: 카드마다 `li[data-custom-board=<id>]`에 이름, `MoveButtons`(`[data-move="up"|"down"]`, 첫 줄 위·마지막 줄 아래는 `disabled`), `select[name="size"]`(허용 크기), 뺄 수 있으면 × `[data-card-remove]`. 아래에 `+ 카드 추가`(`[data-home-widgets="add"]` → `onOpenGallery`).
  - '홈에 보이는 앱'(`boardApps`) 묶음: 쓸 수 있는 앱마다 `li[data-custom-card=<열쇠>]`에 체크 칸(켜짐 = 핀)과 핀일 때만 `MoveButtons`(`moveApp`). 핀은 핀 순서로 먼저, 나머지는 `APP_KEYS` 순서로 뒤에 둔다.
  - 테마 고르기는 그대로. 닫기 `[data-home-custom="close"]`.
- `home-layout.ts`에서 지운다: `canAddWidget`, `addWidget`, `removeWidget`, `updateWidget`, `moveWidget`, `moveWidgetTo`, `moveKey`, `toggleKey`, `resetHomeLayout`과 그 안에서만 쓰던 `newWidgetId`. `arrangeKeys`(Task 1이 쓴다), `normalizeHomeLayout`, 형, 상수는 남긴다.
- 문구: 쓰는 키는 home-custom의 `customizeHint`, `addCard`, `resetBoard`, `listView`, `resetBoardAsk`, `cardMenu`, `removeCard`, `addAppSlot`, `unpinApp`, `boardCards`, `boardApps`, `boardFull`, `descTrend`, `pin`, `unpin`(값이 바뀐 것). Task 1이 등록했다(R22).

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/home-board-edit.test.ts`(스펙 8절 '편집 동작'):
    - `removeCard(board, 'start')`, `removeCard(board, 'apps')`는 같은 보드를 돌려준다. memo는 빠진다.
    - `addCard`로 trend를 두 번 넣어도 하나다(두 번째 `id`는 `null`). memo를 두 번 넣으면 id가 다른 둘이 된다. 24장이면 `id`가 `null`이다.
    - `resizeCard`: memo `{w:5,h:2}` → 6×2, trend `{w:9,h:2}` → 12×2, trend `{w:8,h:3}` → 5×3, clock `{w:6,h:2}` → 3×2.
    - `moveApp(board, 'photo', 0)` → `pinned[0]`이 `'photo'`이고 나머지 순서는 그대로다.
    - `resetHomeBoard`: 기본 카드가 앞에 기본 크기로 오고, 사용자 메모 `memo-x`(글 `'견적서'`)는 뒤에 남으며, 기본 메모 `memo`의 글도 남는다. `pinned`는 기본 핀이고 `seenApps`, `recentApps`는 그대로다.
    - `moveCardTo(board, 'favorites', 'apps')` → favorites가 apps의 자리에 오고 apps는 한 칸 뒤로 간다.
  - `tests/home-customize.test.ts`(jsdom, `home-widgets.test.ts`의 `installHome` 방식):
    - '홈 꾸미기'를 누르면 안내 줄 글이 `customizeHint`이고 단추 넷이 있다. 다시 누르거나 Esc를 누르면 사라진다.
    - × 단추는 start, apps에 없고 memo에 있다. 누르면 카드가 빠지고 `setHomeBoard`의 마지막 값에도 없다.
    - memo의 카드 메뉴에는 `3x2`, `6x2`가 있고 지금 크기에 `aria-checked="true"`. `3x2`를 고르면 `data-size`가 `3x2`.
    - 새로 만들기 카드의 photo ×를 누르면 `.quick-card[data-new="photo"]`가 사라진다. 빈 칸 `[data-app-slot-add]`는 꾸미기 상태에만 있고 누르면 `[data-all-apps]`가 열린다. 꾸미기 중에 타일을 눌러도 앱 action이 불리지 않는다.
    - '카드 추가'의 trend는 이미 있으면 `disabled`. memo를 고르면 끝에 memo가 생기고 설정 폼이 열린다. `getHomeBoard`가 `trendAvailable: false`를 주면 고르기에 `[data-add-type="trend"]`가 없다(R29).
    - '기본 배치로'는 먼저 묻는다. '아니요'면 그대로, '예'면 기본 카드가 앞에 오고 `setTheme`은 불리지 않는다.
    - 목록 창: 첫 카드 줄의 위 단추는 `disabled`. 둘째 줄의 위 단추를 누르면 보드의 첫 두 카드가 바뀐다. html 체크를 끄면 `.quick-card[data-new="html"]`가 사라진다. 테마 'dark'를 고르면 `setTheme('dark')`.
  - `tests/home-dialog-keys.test.ts`: 카드 고르기와 목록 창 사례에 `board: defaultHomeBoard(KO)`(고르기에는 `trendAvailable: true`도)를 넘기는 모양으로 바꾼다.
  - `tests/home-layout.test.ts`: 146-217줄의 'widget helpers', 'ordering helpers'(`arrangeKeys` 시험은 남긴다), 되돌리기 시험을 지운다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-board-edit.test.ts tests/home-customize.test.ts tests/home-dialog-keys.test.ts tests/home-layout.test.ts`
  - Expected: 새 시험이 FAIL이다.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: `npm run test -w @genoffice/shell`, `npm run typecheck -w @genoffice/shell`, `npm run lint`
  - Expected: 원래 실패 말고는 PASS다.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): customize the home board from the keyboard`

### Task 6: 홈 꾸미기 (끌기와 크기 모서리)

**Files:**
- Modify: `apps/shell/src/renderer/src/home-board/board-geometry.ts`, `apps/shell/src/renderer/src/home-board/BoardGrid.tsx`, `apps/shell/src/renderer/src/home-board/AppsCard.tsx`, `apps/shell/src/renderer/src/home-board/home-board.css`. 문구 `dragHandle`, `resizeCorner`는 Task 1이 등록했다(R22).
- Test: `apps/shell/tests/board-geometry.test.ts`, `apps/shell/tests/home-customize.test.ts`(끌기 묶음)

**Interfaces:**
- Consumes: Task 5의 `moveCardTo`, `resizeCard`, `nearestSize`, `moveApp`. Task 4의 `BOARD_ROW_PX`, `BOARD_GAP_PX`.
- Produces:

```ts
// home-board/board-geometry.ts
export function sizeFromDrag(start: CardSize, dx: number, dy: number, colPx: number): CardSize
// w = round((start.w * colPx + (start.w - 1) * 14 + dx + 14) / (colPx + 14)), 1~12로 자른다
// h = round((start.h * 96 + (start.h - 1) * 14 + dy + 14) / (96 + 14)), 1~4로 자른다
```

**정하는 규칙:**
- 카드 끌기는 평소와 꾸미기 상태 모두에서 손잡이로만 한다(스펙 7.8 '평소').
  - 손잡이 `button[data-card-handle][draggable]`(이름 `dragHandle`, ⋮⋮)는 평소에는 카드에 마우스를 올리거나 초점이 있을 때 보이고, 꾸미기 상태에서는 늘 보인다.
  - HTML5 끌기: `dragstart`에서 끄는 카드 id를 ref에 두고 `dataTransfer?.setData('application/x-hanpan-card', id)`, `setDragImage(카드 요소)`.
  - 다른 카드 위 `dragover`는 끄는 카드가 있을 때만 받고(`preventDefault`), 그 카드에 `data-drop-target`(점선)을 붙인다. `drop`은 `moveCardTo`.
  - Esc나 바깥에 놓기는 `drop` 없이 끝나므로 바뀌지 않는다. 카드 몸통에서 시작한 끌기(메모 글 등)는 카드를 옮기지 않는다.
- 크기 모서리 `div[data-card-resize]`(이름 `resizeCorner`)는 꾸미기 상태이고 12칸일 때만 있다.
  - `pointerdown`에서 시작하고 `setPointerCapture`는 있을 때만 부른다(jsdom). 열 너비 `colPx` = (보드 너비 − 11 × 14) / 12.
  - 움직이는 동안 `nearestSize(type, sizeFromDrag(…))`를 카드의 `data-resize-preview="<w>x<h>"`로 보인다(점선 틀). `pointerup`에서 `resizeCard`, Esc면 취소.
- **Ruling R15:** 크기 모서리는 12칸일 때만 둔다. 크기는 12칸 단위이고 6칸·1칸에서는 저장된 크기와 보이는 폭이 다르다(7.9). 그때도 카드 메뉴의 '크기'는 쓸 수 있다.
- 앱 끌기는 꾸미기 상태의 새로 만들기 카드 안에서만 한다.
  - 타일 `pointerdown` 뒤 4px 넘게 움직이면 끌기가 된다. 놓을 칸은 `document.elementFromPoint(x, y)?.closest('[data-app-slot]')`의 번호이고 앱 칸만 받는다('모든 앱' 칸 제외).
  - 그 칸에 `data-drop-slot`(점선)을 붙인다. `pointerup`이면 `onMove(key, 번호)`, Esc면 취소.
  - 평소에는 타일에 끌기 처리기가 없다. 누르면 앱이 열린다.

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/board-geometry.test.ts`: `sizeFromDrag({ w: 5, h: 2 }, 179, 0, 75.5)` → `{ w: 7, h: 2 }`. `sizeFromDrag({ w: 7, h: 2 }, 0, 110, 75.5)` → `{ w: 7, h: 3 }`. `sizeFromDrag({ w: 3, h: 2 }, -1000, -1000, 75.5)` → `{ w: 1, h: 1 }`.
  - `tests/home-customize.test.ts`:
    - 평소 상태에서 favorites의 손잡이에 `dragstart`, apps 카드에 `dragover`·`drop` → 카드 순서에서 favorites가 apps의 자리에 온다.
    - memo의 글 칸에서 `dragstart` → apps에 `drop`해도 순서가 그대로다.
    - `dragstart` 뒤 `dragend`만 오면 그대로다.
    - 꾸미기 상태, 보드 너비를 1060px로 가짜로 둔다(`getBoundingClientRect`, 열 너비 75.5px). 3×2로 둔 memo의 모서리에서 `pointerdown` → `pointermove`(clientX +179) → `data-resize-preview`가 `6x2` → `pointerup` → `data-size`가 `6x2`.
    - 모서리를 끄는 중에 Esc → 크기가 그대로다.
    - 꾸미기 상태에서 photo 타일을 0번 칸으로 끈다(`document.elementFromPoint`를 가짜로) → `.quick-card` 첫 열쇠가 `'photo'`.
    - 평소 상태에서 같은 포인터 동작을 해도 순서가 그대로이고, 누르기는 그 앱 action을 한 번 부른다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/board-geometry.test.ts tests/home-customize.test.ts`
  - Expected: 새 시험이 FAIL이다.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run typecheck -w @genoffice/shell`, `npm run lint`
  - Expected: 모두 PASS.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): drag cards and apps, and resize cards by the corner`

### Task 7: 기상도 받기와 문서

**Files:**
- Create: `apps/shell/src/shared/trend-api.ts`, `apps/shell/src/main/trend/trend-service.ts`, `apps/shell/src/main/trend/trend-ipc.ts`
- Modify:
  - `apps/shell/src/shared/trend-forecast.ts`(검사와 링크), `apps/shell/src/main/trend/trend-config.ts`(`forecastRequestUrl`)
  - `apps/shell/src/preload/index.ts`(873-905의 `hanpanApi` 다음에 `aiOfficeTrend`)
  - `apps/shell/src/main/index.ts`(10162의 `registerDriveIpc` 다음에 등록하고 Task 1의 `onHomeBoardChanged` 훅을 바꿔 끼운다(R23), 10672의 `will-quit`에 `stop()`. 보드 처리기 안은 고치지 않는다)
  - `apps/shell/src/shared/home-layout.ts:1-8`(머리말), `docs/security.md`(새 절), `PRIVACY.md`(표 한 줄과 첫 단락)
- Test: `apps/shell/tests/trend-forecast.test.ts`, `apps/shell/tests/trend-service.test.ts`, `apps/shell/tests/preload-trend.test.ts`, `apps/shell/tests/renderer-csp.test.ts`

**Interfaces:**
- Consumes: Task 1의 `TREND_SITE`, `TREND_FORECAST_URL`, `trendForecastUrl`, `boardHasTrend`, `HOME_BOARD_SETTING_KEY`. `packages/electron-utils`의 `safeExternalUrl`. `main/app-settings.ts`의 `readAppSettings`.
- Produces:

```ts
// shared/trend-forecast.ts
export const TREND_UTM = 'utm_source=hanpan&utm_medium=home&utm_campaign=forecast'
export const TREND_FIELD_KEYS = ['ai', 'opensource', 'local-ai', 'ai-safety', 'stocks', 'economy', 'semiconductor', 'realestate', 'fx', 'crypto'] as const
export type TrendFieldKey = (typeof TREND_FIELD_KEYS)[number]
export type TrendSignal = -2 | -1 | 0 | 1 | 2
export type TrendScale = 'weather' | 'market'
export interface TrendField { key: TrendFieldKey; title: string; scale: TrendScale; s: TrendSignal | null; label: string; head: string; path: string; asOf?: string }
// asOf: 저장본에만 있다. 이 분야 값을 계산한 시각(ISO). 없으면 TrendForecast.asOf와 같다(R24)
export interface TrendForecast { schema: 1; asOf: string; date: string; fields: TrendField[]; line: string }
export const TREND_TEXT_MAX = { title: 20, label: 10, head: 80, line: 80 } as const
export const TREND_FIELDS_MAX = 12
export const TREND_CARRY_MAX_MS = 48 * 60 * 60 * 1000   // R24
export function cutText(text: string, max: number): string   // R26: max 안이면 그대로, 넘으면 (max − 1)자 + '…'
export function mergeTrendForecast(fresh: TrendForecast, stored: TrendForecast | null): TrendForecast   // R24
export function trendPath(raw: unknown): string | null
export function parseTrendForecast(raw: unknown): TrendForecast | null
export function trendLinkUrl(path: string | null): string | null   // null이면 첫 화면

// shared/trend-api.ts
export const TREND_CHANNELS = { get: 'trend:get', changed: 'trend:changed', open: 'trend:open' } as const
export interface TrendSnapshot { available: boolean; forecast: TrendForecast | null }
export interface TrendApi { get(): Promise<TrendSnapshot>; onChanged(handler: (s: TrendSnapshot) => void): () => void; open(path: string | null): Promise<void> }
export function parseTrendSnapshot(raw: unknown): TrendSnapshot

// main/trend/trend-config.ts
export function forecastRequestUrl(base: string, version: string): string

// main/trend/trend-service.ts (Electron 없음)
export const TREND_FIRST_DELAY_MS = 3_000
export const TREND_INTERVAL_MS = 6 * 60 * 60 * 1000
export const TREND_TIMEOUT_MS = 5_000
export interface TrendServiceDeps {
  url: string | null
  version: string
  load(url: string, signal: AbortSignal): Promise<unknown>
  readStored(): unknown
  writeStored(forecast: TrendForecast): void
  wanted(): boolean
  broadcast(snapshot: TrendSnapshot): void
}
export interface TrendService { start(): void; boardChanged(): void; snapshot(): TrendSnapshot; stop(): void }
export function createTrendService(deps: TrendServiceDeps): TrendService

// main/trend/trend-ipc.ts
export function registerTrendIpc(deps: {
  userData: () => string; settingsPath: () => string; url: string | null; version: string
  window: () => BrowserWindow | null
}): TrendService
```

- preload는 `window.aiOfficeTrend: TrendApi`를 내놓는다.

**정하는 규칙:**
- `trendPath(raw)`: 글자이고 `/^\/(?:[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*)?$/`에 맞을 때만 그 글자, 아니면 `null`. 이 꼴이면 `//`, `:`, `\`, `?`, `#`, `%`, `.`이 들어갈 수 없다.
- `parseTrendForecast(raw)`:
  - 객체가 아니거나 `schema !== 1`이면 `null`.
  - `asOf`가 `Date.parse`로 읽히지 않거나 `date`가 `YYYY-MM-DD` 꼴이 아니면 `null`.
  - `fields`는 배열의 앞 12개만 읽는다. 항목마다: `key`가 목록에 없거나 이미 나온 key면 버린다. `title`은 글자를 `cutText`로 20자에서 자르고, 비면 버린다. `path`는 `trendPath`가 `null`이면 버린다. `scale`은 `'market'`이 아니면 `'weather'`. `s`는 `Number.isInteger`이고 −2~2일 때만, 아니면 `null`. `label` 10자, `head` 80자에서 `cutText`로 자르고, 글자가 아니면 ''. `asOf`는 글자이고 `Date.parse`로 읽히면 그대로, 아니면 뺀다(저장본을 다시 읽을 때 쓴다. 서버는 보내지 않는다).
  - 남은 분야가 0개면 `null`. `line`은 `cutText`로 80자에서 자른다. 모든 자르기는 R26대로 끝에 `…`를 붙여 정확히 `max`자로 만든다.
- **Ruling R11:** 스펙이 정하지 않은 검사를 이렇게 정한다. 경로가 틀린 분야는 분야째 버린다(스펙의 "검사를 통과하지 못한 분야는 버리고"). 겹친 key는 처음 것만 둔다. `asOf`·`date`가 깨졌거나 남은 분야가 없으면 "응답 전체가 깨졌다"로 보고 이전 저장본을 쓴다.
- `mergeTrendForecast(fresh, stored)` (R24):
  - `stored`가 `null`이면 `fresh` 그대로(분야 `asOf` 없음).
  - `fresh.fields`를 순서대로 돈다. 분야 `f`의 `s`가 `null`이 아니면 `f`에서 `asOf`를 뺀 것. `null`이면 `stored.fields`에서 같은 `key`인 `p`를 찾아, `p.s !== null`이고 `Date.parse(fresh.asOf) − Date.parse(p.asOf ?? stored.asOf)`가 0 이상 `TREND_CARRY_MAX_MS` 이하이면 `{ ...f, s: p.s, label: p.label, head: p.head, asOf: p.asOf ?? stored.asOf }`, 아니면 `f` 그대로(`asOf` 없음).
  - `fresh`에 없는 분야는 더하지 않는다. `asOf`, `date`, `line`, `schema`는 `fresh` 것이다.
- **Ruling R24 (분야별 병합):** 트렌드레이더 API는 원본 일부를 못 받으면 그 분야를 `s: null`로 주고 그 답을 1분만 CDN에 둔다. 한판은 6시간마다 받으므로 그 1분에 걸리면 저장본의 멀쩡한 값이 '정보 없음'으로 덮여 6시간 남는다. 분야별로 병합하면 사이트가 1분 뒤 다시 계산한 값과 어긋날 수 있지만, 어긋남은 '정보 없음' 대신 '몇 시간 전 값'이고 그 시각을 저장해 화면이 날짜를 붙인다(R25). 48시간을 넘은 값은 하루 단위 기상도로서 낡았으므로 채우지 않는다. 스펙의 "검사를 통과하지 못한 분야는 버리고, 응답 전체가 깨졌으면 이전 저장본을 쓴다"의 분야 단위 판이다.
- `trendLinkUrl(path)`: `path`가 `null`이면 `` `${TREND_SITE}/?${TREND_UTM}` ``. `trendPath(path)`가 맞으면 `` `${TREND_SITE}${path}?${TREND_UTM}` ``, 아니면 `null`.
- `forecastRequestUrl(base, version)`: `http:`, `https:`면 `URL`의 `searchParams`에 `client=hanpan`, `v=<version>`을 넣은 주소. `file:`이면 `base` 그대로.
- `createTrendService`:
  - `start()`는 3초 뒤 첫 차례를 돌리고, 그 뒤 6시간마다 돌린다.
  - 한 차례: `url`이 없거나 `wanted()`가 거짓이면 아무것도 하지 않는다. 받는 중이면 겹치지 않는다. 받기 직전에 마지막 시도 시각을 적는다. `AbortController`로 5초 뒤에 끊는다.
  - `load(forecastRequestUrl(url, version), signal)`가 성공하고 `parseTrendForecast`가 통과하면 `merged = mergeTrendForecast(parsed, 메모리의 지금 값)`(R24)을 `writeStored`, 메모리의 지금 값 교체, `broadcast(snapshot())`. 실패, 시간 초과, 검사 탈락이면 아무것도 바꾸지 않는다.
  - `boardChanged()`: 첫 차례 시각이 지났고, 이번 실행에서 한 번도 받으려 한 적이 없고, `wanted()`가 참이면 지금 한 번 받는다. 첫 실행에서 보드 저장이 3초보다 늦었을 때와 트렌드 카드를 나중에 넣었을 때를 위해서다.
  - `snapshot()` = `{ available: url !== null, forecast }`. `forecast`는 처음에 `parseTrendForecast(readStored())`로 읽는다.
  - `stop()`은 타이머를 지우고 받는 중이면 끊는다.
- **Ruling R9:** 저장된 보드에 트렌드 카드가 있을 때만 받는다(`wanted()` = `boardHasTrend(readAppSettings(settingsPath())[HOME_BOARD_SETTING_KEY])`). 홈 꾸미기에서 트렌드 카드를 빼면 받지 않는다. 이것을 `docs/security.md`의 '끄는 법'으로 적는다. 3초·6시간 일정은 그대로다. 이유: 스펙 4절은 받는 곳, 보내는 것, 끄는 법을 적으라 했고, 설정 스위치는 열린 문제 3(대표님, 11/17)이다. 스위치가 정해지면 `wanted()`에 조건 하나를 더하면 된다. 한국어가 아닌 화면처럼 트렌드 카드가 없는 사용자는 요청이 하나도 나가지 않는다.
- `registerTrendIpc`:
  - `load`: `file:` 주소는 `readFile(fileURLToPath(url), 'utf8')`를 JSON으로 읽는다. 그 밖은 ``net.fetch(url, { credentials: 'omit', cache: 'no-store', headers: { 'User-Agent': `Hanpan/${version}` }, signal })``이고, `res.ok`가 아니면 던지고 맞으면 `res.json()`.
  - 저장 파일은 `join(userData(), 'trend-forecast.json')`. 읽기 실패는 `null`, 쓰기는 JSON 한 번에.
  - `broadcast`는 `window()?.webContents.send(TREND_CHANNELS.changed, snapshot)`.
  - `ipcMain.handle(get)` → `snapshot()`. `ipcMain.handle(open, (_e, path))`: `path`가 `null`도 글자도 아니면 무시한다. `trendLinkUrl(path)`가 `null`이 아니고 `https://trend.tenai.kr/`로 시작하고 `safeExternalUrl`을 통과하면 `shell.openExternal(url).catch(() => {})`. `shell`은 객체로 불러 부른다. e2e가 `shell.openExternal`을 바꿔 끼운다.
  - `index.ts`: `trendService = registerTrendIpc({ userData: () => app.getPath('userData'), settingsPath: APP_SETTINGS_PATH, url: TREND_URL, version: app.getVersion(), window: () => shellWindow })` 다음에 `onHomeBoardChanged = () => trendService?.boardChanged()`(Task 1의 훅, R23)와 `trendService.start()`. `will-quit`에 `trendService?.stop()`. `let trendService: TrendService | null = null`은 `driveService` 옆에 둔다.
- preload `aiOfficeTrend`: `get()`은 `parseTrendSnapshot(await invoke(get))`. `onChanged`는 받은 값을 `parseTrendSnapshot`으로 걸러 넘긴다. `open(path)`는 `path === null || typeof path === 'string'`일 때만 보낸다.
- 문서:
  - `home-layout.ts` 1-8줄 머리말의 "No widget fetches anything from the network."를 영어로 고친다: `Only the trend card shows data from the network: the forecast the main process fetched (src/main/trend, docs/security.md).`
  - **Ruling R13:** 스펙은 머리말 뜻을 한국어로 적었지만 `docs/standards.md`가 주석을 영어로 정한다. 뜻은 같다.
  - `docs/security.md`: `## Google 드라이브 …` 절과 `## 실행해 둔 프로그램은 앱보다 오래 살지 않는다` 사이에 `## 트렌드 소식 (홈의 트렌드 카드, 결정 0097)`을 둔다. 받는 곳(메인 프로세스의 `net.fetch`, 화면 CSP는 그대로), 언제(3초 뒤, 6시간마다, 보드에 트렌드 카드가 있을 때만), 보내는 것(`client`, `v`, `User-Agent`, 서버가 보는 IP, 네트워크 계층이 붙이는 일반 머리. 쿠키·저장소 없음), 검사(위 규칙), 저장(`trend-forecast.json`, 검사를 통과한 것만), 링크(박아 둔 주소 + 경로 + UTM, 열기 직전 확인), 끄는 법(트렌드 카드 빼기, 스위치는 열린 문제 3), 시험용 `HANPAN_TREND_URL`을 적는다.
  - `PRIVACY.md`(영어, 다음 글 그대로. R28):
    - 'What leaves your PC' 표의 마지막 줄 다음에 한 줄. When: `When the Home screen shows the Trend Radar card (on by default on a Korean UI; remove the card in Customize Home to stop it)`. What is sent: `A request for today's forecast about 3 seconds after launch and every 6 hours: the app version (client=hanpan&v=<version>) and a Hanpan/<version> user agent. No account, device or file information, no cookies. The answer is kept in trend-forecast.json on your PC.` Where it goes: `trend.tenai.kr (TenAI's Trend Radar)`.
    - 첫 단락의 "and the app has no usage analytics or telemetry." 뒤에 문장 하나: `The one exception is Hanpan's Trend Radar card on the Home screen, which fetches a public forecast from trend.tenai.kr (see the table); removing the card stops those requests.`
    - 'Last updated'를 커밋하는 날로 바꾼다.
  - **Ruling R14:** 스펙 7.11은 `docs/security.md`만 적었지만, 저장소 안내는 `PRIVACY.md`를 "무엇이 어디로 전송되는지 전체 목록"으로 둔다. 그래서 거기에도 더한다.
  - **Ruling R28 (PRIVACY.md 확정):** 이 파일은 바깥에 내놓는 약속이라 원래 커밋 전에 사용자 확인을 받으려 했다. 사용자가 "알아서 판단해서 진행"하라고 정했으므로(2026-11-09) 위 글로 정해 커밋하고, 최종 보고에 바뀐 글을 그대로 실어 사후 확인을 받는다. 되돌릴 수 있다(push 전이고, 글만 고치면 된다). 사이트의 개인정보처리방침(열린 문제 4)은 이 파일과 별개로 배포 전에 사용자가 게시한다.

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/trend-forecast.test.ts`(스펙 8절):
    - `schema` 2인 응답은 `null`이다.
    - 모르는 key(`'weather'`) 분야가 빠진다.
    - `s` 3인 분야의 `s`는 `null`이다.
    - `path`가 `'//evil.example'`, `'/a:b'`, `'/a\\b'`인 분야는 빠진다.
    - `title` 25자 → 20자, `label` 15자 → 10자, `head` 100자 → 80자, `line` 100자 → 80자.
    - `trendLinkUrl('/stocks')` → `'https://trend.tenai.kr/stocks?utm_source=hanpan&utm_medium=home&utm_campaign=forecast'`. `trendLinkUrl(null)` → `'https://trend.tenai.kr/?utm_source=hanpan&utm_medium=home&utm_campaign=forecast'`. `'//evil.example'`이나 `'https://evil.example/x'`는 `null`.
    - 더하는 것: 분야 13개 → 앞 12개만 읽는다. 겹친 key는 처음 것. `asOf` `'yesterday'`는 `null`. 분야가 모두 탈락하면 `null`. `s` `1.5`와 `'1'`은 `null`.
    - `cutText('a'.repeat(25), 20)`는 길이 20이고 끝이 `'…'`다. 20자는 그대로다(R26).
    - `mergeTrendForecast`(R24). `FULL` = 분야 10개가 모두 값이 있는 기상도(`asOf` `'2026-11-09T00:30:00Z'`), `PARTIAL` = 같은 분야에서 `local-ai`와 `fx`만 `s: null`(`asOf` `'2026-11-09T06:30:00Z'`):
      - `mergeTrendForecast(PARTIAL, FULL)`: `local-ai`와 `fx`의 `s`·`label`·`head`가 FULL 값이고 `asOf`가 `'2026-11-09T00:30:00Z'`. 나머지 8개는 PARTIAL 값이고 `asOf`가 없다. 결과의 `asOf`·`date`·`line`은 PARTIAL 것이다.
      - FULL의 `asOf`가 PARTIAL보다 49시간 앞이면 `local-ai`는 `null` 그대로다.
      - FULL에서도 `local-ai`가 `null`이면 `null`이다. `stored`가 `null`이면 PARTIAL과 `toEqual`이다.
      - PARTIAL에 `crypto`가 없고 FULL에 있으면 결과에도 없다.
      - 저장본 되읽기: `parseTrendForecast(JSON.parse(JSON.stringify(merged)))`가 `merged`와 `toEqual`이다(분야 `asOf`가 남는다). 분야 `asOf`가 `'x'`이면 그 분야의 `asOf`만 빠진다.
  - `tests/trend-service.test.ts`(`vi.useFakeTimers()`):
    - `forecastRequestUrl('https://trend.tenai.kr/api/forecast', '0.19.0')` → `'https://trend.tenai.kr/api/forecast?client=hanpan&v=0.19.0'`. `file:` 주소는 그대로.
    - `'fetches 3 s after start and every 6 hours'`: 2,999ms에 0번, 3,000ms에 1번(인자는 위 주소), 3,000ms + 6시간에 2번.
    - `'stores a valid answer and tells the window'`: `writeStored`가 검사한 값으로, `broadcast`가 `{ available: true, forecast }`로 불린다.
    - `'keeps the stored forecast when the answer is broken'`: `load`가 `'<html>오류</html>'` 글자나 `{ schema: 2 }`를 주면 `writeStored`, `broadcast`가 불리지 않고 `snapshot().forecast`는 처음 저장본이다(Review Focus 2).
    - `'gives up after 5 seconds'`: `load`가 `signal`이 끊길 때만 거절하는 Promise면, 5초 뒤 `signal.aborted`가 참이고 저장본은 그대로다. 다음 차례(6시간 뒤)에 다시 부른다.
    - `'does not fetch while the board has no trend card'`: `wanted` 거짓이면 3초에 부르지 않는다. 그 뒤 `wanted`를 참으로 바꾸고 `boardChanged()`를 부르면 한 번 부른다. 다시 `boardChanged()`를 불러도 더 부르지 않는다.
    - `'boardChanged before the first turn waits for it'`: 1초에 `boardChanged()`를 불러도 부르지 않고, 3초에 한 번 부른다.
    - `'no address: nothing is fetched'`: `url` `null`이면 `snapshot().available`이 거짓이고 `load`를 부르지 않는다.
    - `'fills a null field from the stored forecast'`(R24, Review Focus 6): `readStored`가 FULL을, `load`가 PARTIAL을 주면 `writeStored` 인자와 `broadcast` 인자의 `local-ai`가 FULL 값에 `asOf` `'2026-11-09T00:30:00Z'`이고, `snapshot().forecast.asOf`는 PARTIAL 것이다.
  - `tests/preload-trend.test.ts`(`tests/preload-recovery-list.test.ts`처럼): `aiOfficeTrend`가 있다. `get()`은 `trend:get`을 부르고, `forecast`가 깨졌으면 `{ available: true, forecast: null }`. `open('/fx')`는 `trend:open`에 `'/fx'`를 싣는다. `open(3 as never)`는 보내지 않는다.
  - `tests/renderer-csp.test.ts`: `apps/shell/src/renderer/index.html`의 CSP에서 `connect-src`가 정확히 `'self' ws://localhost:*`다. 화면이 바깥 주소에서 받지 않는다는 약속을 고정한다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/trend-forecast.test.ts tests/trend-service.test.ts tests/preload-trend.test.ts tests/renderer-csp.test.ts`
  - Expected: CSP 시험만 PASS, 나머지는 FAIL(함수가 없다).

- [ ] **Step 3: 구현하고 문서를 쓴다.** `PRIVACY.md`는 R28의 글 그대로 쓰고, 바뀐 부분을 최종 보고에 옮길 수 있게 커밋 메시지 본문에도 적어 둔다.

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run test -w @genoffice/shell`, `npm run typecheck -w @genoffice/shell`, `npm run lint`, `npm run check:english-comments`
  - Expected: 원래 실패 말고는 PASS다.

- [ ] **Step 5: 고정 파일로 직접 확인한다.**
  - `HANPAN_TREND_URL=file:///<저장소>/e2e/assets/trend-forecast.json`(파일은 Task 11이 만든다. 먼저 하려면 같은 모양의 임시 파일을 쓴다), `GENOFFICE_LANG=ko`, `GENOFFICE_USER_DATA=<빈 임시 폴더>`로 `npm run dev`를 띄운다.
  - Expected: 3초쯤 뒤 그 임시 폴더에 `trend-forecast.json`이 생기고 검사를 통과한 내용이 들어 있다.

- [ ] **Step 6: 커밋한다.** 메시지: `feat(shell): fetch the Trend Radar forecast in the main process`

### Task 8: 트렌드 카드

**Files:**
- Create: `apps/shell/src/renderer/src/home-board/trend-card.css`(`TrendCard.tsx`가 `import`한다, R21)
- Modify: `apps/shell/src/renderer/src/home-board/TrendCard.tsx`(Task 1의 빈 카드를 채운다), `apps/shell/src/shared/trend-forecast.ts`. 문구 `hbTrendLine`, `hbTrendMore`, `hbTrendAsOf`, `hbTrendNoData`는 Task 1이 등록했다(R22). `home-board.css`는 건드리지 않는다(Task 4가 같은 때에 만든다).
- Test: `apps/shell/tests/trend-forecast.test.ts`(더함), `apps/shell/tests/home-trend-card.test.ts`

**Interfaces:**
- Consumes: Task 7의 `TrendForecast`, `TrendField`, `TrendSnapshot`, `TrendApi`(`window.aiOfficeTrend`).
- Produces:

```ts
// shared/trend-forecast.ts
export function kstDate(now: Date): string   // new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
export function trendAsOfText(forecast: TrendForecast, now: Date, locale: string): string   // hbTrendAsOf의 {when}
export type TrendGlyph = 'sun' | 'sun-cloud' | 'cloud' | 'rain' | 'storm' | 'fire' | 'up' | 'flat' | 'down' | 'snow'
export function trendGlyph(scale: TrendScale, s: TrendSignal): TrendGlyph

// home-board/TrendCard.tsx
export function TrendCard(props: { now?: () => Date }): ReactElement   // window.aiOfficeTrend를 스스로 읽는다
```

**정하는 규칙:**
- `trendAsOfText`: `forecast.date === kstDate(now)`이면 `asOf`를 `Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' })`로 쓴다. 아니면 `` new Date(`${forecast.date}T00:00:00Z`) ``를 `Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' })`로 쓴다.
- **Ruling R12:** 날짜를 붙일지는 마지막 받기가 실패했는지가 아니라 기상도의 날짜로 정한다. 같은 날 받은 결과는 오늘의 날씨이기 때문이다. 저장본이 아예 없으면 처음 그릴 때부터 오프라인 안내를 보인다. 도는 그림이나 빈칸은 두지 않는다(실패 조건 "빈칸이 남는 것").
- `trendGlyph`(7.6): weather는 2 → sun, 1 → sun-cloud, 0 → cloud, −1 → rain, −2 → storm. market은 2 → fire, 1 → up, 0 → flat, −1 → down, −2 → snow.
- TrendCard:
  - 처음에 `window.aiOfficeTrend?.get()`을 읽고 `onChanged`로 바꾼다. API가 없으면 오프라인 안내다.
  - 머리: 제목 `hbTrendTitle`, 오른쪽에 `[data-trend-asof]`(`t('hbTrendAsOf', { when })`)와 `button[data-trend-more]`(`hbTrendMore`, 누르면 `open(null)`).
  - 분야마다 `button[data-trend-field=<key>]`. 아이콘 자리에는 `s`가 `null`이면 `<span data-trend-nodata>{t('hbTrendNoData')}</span>`, 아니면 선으로 그린 SVG `WeatherIcon`(`data-glyph`, 해는 `stroke: var(--hp-chalk)`). 그다음 이름(`.hb-trend-name`, 말줄임)과 `s`가 있을 때 받은 `label`.
  - 분야 단추의 `data-tip`은 `head`가 있으면 `` `${title}: ${head}` ``, 없으면 `title`. 이름은 `` `${title} ${label 또는 정보 없음}` ``. 누르면 `open(path)`.
  - 이전 저장본에서 채운 분야(R25): 분야에 `asOf`가 있고 `kstDate(new Date(asOf)) !== forecast.date`이면 단추에 `data-trend-carried="<kstDate(asOf)>"`를 붙이고, `data-tip` 끝에 `` ` · ${t('hbTrendAsOf', { when })}` ``를 더한다. `when`은 그 날짜를 `Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })`로 쓴 것(ko '11월 8일'). 아이콘과 날씨 말은 채운 값으로 평소처럼 그린다. 같은 한국 날짜의 값이면 아무 표시도 없다.
- **Ruling R25 (채운 분야의 표시):** 머리 줄의 기준 시각은 새 답의 `asOf`(R12)를 그대로 두고, 날짜가 다른 분야만 그 분야에 날짜를 붙인다. 같은 날 몇 시간 전 값은 하루 단위 기상도에서 '오늘 값'이므로 표시하지 않는다. 카드에 글을 더 두지 않아 좁은 화면 규칙(7.9)을 건드리지 않는다.
  - 아래에 `[data-trend-line]`: `hbTrendLine` + `line`.
  - 분야 묶음은 `container-type: inline-size`이고 `@container (min-width: 360px)`에서 두 칸, 그보다 좁으면 한 칸이다(7.9).
  - 저장본이 없으면 분야와 한 줄 대신 `[data-trend-offline]` `hbTrendOffline`.

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/trend-forecast.test.ts`:
    - `kstDate(new Date('2026-11-08T15:30:00Z'))` → `'2026-11-09'`.
    - `trendAsOfText({ …, asOf: '2026-11-09T00:30:00Z', date: '2026-11-09' }, new Date('2026-11-09T03:00:00Z'), 'ko-KR')` → `'09:30'`.
    - 같은 기상도, `now` `2026-11-10T03:00:00Z` → `'11월 9일'`.
    - `date` `'2026-11-09'`, `now` `2026-11-09T15:30:00Z`(한국 11/10 00:30) → `'11월 9일'`(Review Focus 5).
    - `trendGlyph`의 열 가지가 위 표와 같다.
  - `tests/home-trend-card.test.ts`(jsdom, `window.aiOfficeTrend` 가짜, `LocaleProvider` 'ko'):
    - 저장본 없음 → `[data-trend-offline]`의 글자가 '인터넷에 연결되면 오늘의 트렌드가 나옵니다'이고 `[data-trend-field]`가 없다.
    - 분야 10개짜리 기상도 → `[data-trend-field]` 10개, 순서가 기상도 순서. `s` `null`인 분야에 `[data-trend-nodata]` '정보 없음'. realestate(market, s 1)의 `data-glyph`는 `'up'`. 받은 `label`이 글자로 보인다.
    - stocks를 누르면 `open('/stocks')`, 자세히를 누르면 `open(null)`.
    - `local-ai`가 `{ s: 0, label: '흐림', asOf: '2026-11-08T00:30:00Z' }`이고 기상도 `date`가 `'2026-11-09'`이면 `[data-trend-field="local-ai"]`에 `data-trend-carried="2026-11-08"`, `data-glyph` `'cloud'`, `data-tip`에 `'11월 8일 기준'`이 들어 있다. `asOf`가 `'2026-11-09T00:30:00Z'`이면 `data-trend-carried`가 없다(R25).
    - `onChanged`로 새 기상도가 오면 다시 그린다.
    - `now`를 같은 한국 날짜로 주면 기준 시각이 `'09:30 기준'`, 다른 날이면 `'11월 9일 기준'`.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/trend-forecast.test.ts tests/home-trend-card.test.ts`
  - Expected: 새 시험이 FAIL이다.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run typecheck -w @genoffice/shell`, `npm run check:theme-colors`
  - Expected: 모두 PASS.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): draw today's forecast on the trend card`

### Task 9: 좁은 화면

**Files:**
- Modify: `apps/shell/src/renderer/src/home-board/board-geometry.ts`(`boardColumns`), `apps/shell/src/renderer/src/home-board/BoardGrid.tsx`(넓이를 잰다), `apps/shell/src/renderer/src/home-board/home-board.css`, `apps/shell/src/renderer/src/hanpan/hanpan.css:259-336`(시작 입력 줄)
- Test: `apps/shell/tests/board-geometry.test.ts`, `apps/shell/tests/home-board-columns.test.ts`

**Interfaces:**
- Consumes: Task 4의 `cardSpan`, `BoardColumns`. Task 6의 모서리 조건(12칸일 때만).
- Produces: `export function boardColumns(width: number): BoardColumns` — 960 이상이면 12, 700 이상이면 6, 그 밖은 1.

**정하는 규칙:**
- BoardGrid가 보드 요소의 `ResizeObserver`(`contentRect.width`)로 `boardColumns`를 구해 `data-cols`, `--cols`, 카드마다 `--span: cardSpan(w, cols)`를 바꾼다. `ResizeObserver`가 없으면(jsdom) 12다. 열 수가 바뀌어도 저장하지 않는다.
- 1366 화면은 12칸 그대로다(7.9).
- 글:
  - 제목은 두 줄까지 줄을 바꾼다(`-webkit-line-clamp: 2`). 넘친 글은 `title`로 전체를 보인다.
  - 한 줄로 두는 곳(기상도 분야 이름, 파일 이름)은 말줄임에 `title`이다(Task 3·8에서 붙였는지 확인).
  - 시작 카드의 입력 줄(`.hp-start`)은 `flex-wrap: wrap`. 입력창은 `flex: 1 1 16rem; min-width: 0`, 단추는 `flex: 0 0 auto`. 한 줄에 안 들어가면 단추가 아래로 내려간다.
- 가로 스크롤 막기: 보드와 카드에 `min-width: 0`, 긴 낱말에 `overflow-wrap: anywhere`. 창 넓이 900px 이상에서 가로 스크롤이 없어야 한다. e2e(Task 12)가 1366×728과 900에서 확인한다.

- [ ] **Step 1: 실패하는 시험을 쓴다.**
  - `tests/board-geometry.test.ts`: `boardColumns(1060)` = 12, `boardColumns(960)` = 12, `boardColumns(959)` = 6, `boardColumns(700)` = 6, `boardColumns(699)` = 1. `cardSpan(5, 6)` = 6, `cardSpan(3, 6)` = 3, `cardSpan(12, 6)` = 6, `cardSpan(7, 1)` = 1.
  - `tests/home-board-columns.test.ts`(jsdom): `globalThis.ResizeObserver`를 콜백을 잡는 가짜 클래스로 바꾼다. 넓이 800을 알리면 `[data-home-board]`의 `data-cols`가 `'6'`이고 trend 카드(5×2)의 `--span`이 `6`이다. 650이면 `'1'`. 1060이면 `'12'`. 저장(`update`)은 불리지 않는다. 꾸미기 상태에서 6칸이면 `[data-card-resize]`가 없다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/board-geometry.test.ts tests/home-board-columns.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: 구현한다.**

- [ ] **Step 4: 통과를 확인한다.**
  - Run: Step 2의 명령, `npm run typecheck -w @genoffice/shell`, `npm run check:theme-colors`
  - Expected: 모두 PASS.

- [ ] **Step 5: 커밋한다.** 메시지: `feat(shell): lay the home board out on narrow windows`

### Task 10: 문구 확정, 번역, 도움말, 설명서

**Files:**
- Modify: `apps/shell/src/renderer/src/hanpan/home-strings.json`, `apps/shell/src/renderer/src/strings.ts`(도구로), `apps/shell/src/renderer/src/i18n/strings-home-custom.ts`, `apps/shell/src/renderer/src/i18n/help/topics/hanpan.<21개 언어>.md`, `apps/shell/src/renderer/src/i18n/help/topics/home-screen.<21개 언어>.md`, `docs/manual/한판-사용설명서.md`(1장, 5장, 6장)
- Test: `apps/shell/tests/home-board-strings.test.ts`

**Interfaces:**
- Consumes: Task 2~8이 더하거나 바꾼 키(Global Constraints의 문구 표 전부).

**정하는 규칙:**
- 한국어 원문은 Global Constraints 문구 표로 확정됐다(R27). 사용자에게 다시 묻지 않는다. 표와 코드의 ko 값이 다르면 표에 맞춘다.
- home-strings의 `hb*` 키는 11개 언어를 모두 채운다. 도구는 영어 자리표시를 그 언어 글로 바꾼다. home-custom의 새 키와 값을 바꾼 키(`widgetRecent`, `descFavorites`, `favoritesEmpty`, `pin`, `unpin`)는 21개 언어를 모두 채운다. 영어를 그대로 복사하지 않는다. 자리표시(`{n}`, `{when}`, `{w}`, `{h}`, `{name}`)는 모든 언어에 그대로 둔다.
- **Ruling R20:** 스펙 7.12는 `docs/manual`만 적었다. 그러나 `apps/shell/AGENTS.md`는 한국어 도움말이 소개 사이트 질문 도우미의 지식이라 "기능을 바꾸면 도움말도 같이 고친다"고 정한다. 그래서 앱 안 도움말 `hanpan`과 `home-screen` 주제도 고친다. 21개 언어 모두 같은 구조를 유지한다(`npm run check:help-langs`).
  - `home-screen`: 첫 단락을 보드로 고친다. '사이드바 탐색' 목록 맨 위에 '홈' 항목을 하나 더한다. '빠른 시작 카드' 절의 제목을 '새로 만들기와 모든 앱'으로 바꾸고, 첫 단락에 핀·모든 앱·최근에 쓴 앱을 적는다. 앱별 목록은 그대로 둔다. '검색' 절에 "보드 맨 위 줄"을 적는다. 새 절 '## 홈 꾸미기'(끌기, 크기, 카드 추가, 기본 배치로, 목록으로 정리)를 '검색' 다음에 더한다.
  - `hanpan`: "홈 화면의 … 카드"라고 적힌 세 곳(한판 양식, 마크다운 변환기, 디자인)을 "홈의 **새로 만들기**"(양식, 디자인)와 "**모든 앱**"(마크다운 변환기)으로 고친다.
- 설명서 `docs/manual/한판-사용설명서.md`:
  - 1장 '홈 화면'을 보드로 다시 쓴다. 시작 카드(마인드맵 만들기, 예시, 사용 설명서와 F1), 트렌드 카드(오늘의 기상도, 누르면 트렌드레이더, 인터넷이 없을 때), 새로 만들기(핀, 모든 앱, 최근에 쓴 앱, 새 앱), 이어서 하기(전체 N개 → 최근 사용), 빠른 메모·즐겨찾기, 홈 꾸미기, 머리 줄 검색, 왼쪽 메뉴의 '홈'과 '최근 사용'을 적는다. 앱 표는 '모든 앱' 묶음으로 고친다.
  - 5장 "홈 화면의 **한판 양식** 카드" → "홈의 **새로 만들기**에서 **한판 양식**". "홈 화면의 **마크다운 변환기** 카드" → "홈의 **모든 앱**에서 **마크다운 변환기**". 6장 "홈 화면의 **디자인** 카드" → "홈의 **새로 만들기**에서 **디자인**".
  - 그림 `images/01-home.png`는 Task 12에서 다시 찍는다.

- [ ] **Step 1: 한국어 원문을 표와 맞춘다.** `home-strings.json`과 `strings-home-custom.ts`의 ko 값이 Global Constraints 문구 표와 글자까지 같은지 본다(R27). 다르면 표에 맞춘다. 표 전체는 Task 12의 최종 보고에 '정한 문구'로 싣는다.

- [ ] **Step 2: 실패하는 시험을 쓴다.** `apps/shell/tests/home-board-strings.test.ts`:
  - `'every hb key in home-strings is written in all 11 languages and shown as written'`: `home-strings.json`에서 `hb`로 시작하는 키마다 11개 언어가 있고, en이 아닌 값은 en과 다르다(`SAME_OK` = `/^[A-Za-z0-9 .()+:·{}-]{1,12}$/`는 예외). `strings.ts`의 그 11개 언어 값이 JSON과 같다.
  - `'the board names and customize words are written in every language'`: Global Constraints 표의 home-custom 키마다 21개 언어(`LANGS`)의 `homeCustomText(lang, key)`가 en과 다르다(en 자신과 `SAME_OK`는 예외).

- [ ] **Step 3: 실패를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-board-strings.test.ts`
  - Expected: FAIL. 아직 영어가 남은 언어를 이름으로 보고한다.

- [ ] **Step 4: 번역을 채우고 도구를 돌린 뒤, 도움말과 설명서를 고친다.**

- [ ] **Step 5: 통과를 확인한다.**
  - Run: `cd apps/shell && npx vitest run tests/home-board-strings.test.ts tests/hanpan-vi-strings.test.ts tests/i18n-key-parity.test.ts tests/strings.test.ts`, `npm run check:help-langs`, `npm run check:english-comments`, `npm run format` 뒤 `npm run format:check`
  - Expected: 모두 PASS. 도움말 구조가 영어판과 같다. 문서에 한자가 없다.

- [ ] **Step 6: 커밋한다.** 메시지: `docs(shell): translate the home board and update the guide`

### Task 11: e2e 도우미와 기존 e2e 고치기

**Files:**
- Create: `e2e/assets/trend-forecast.json`
- Modify: `e2e/helpers.ts`, `e2e/home.spec.ts`, `e2e/hanpan-home.spec.ts`, `e2e/home-widgets.spec.ts`, `e2e/home-search.spec.ts`, `e2e/mindmap-tab.spec.ts`, `e2e/markdown-tab.spec.ts`, `e2e/crash-recovery.spec.ts`, `e2e/hanpan-md-convert.spec.ts`, `e2e/rtl-document-direction.spec.ts`, `e2e/pdf-tools-window.spec.ts`, `e2e/hanpan-manual-tour.spec.ts`

**Interfaces:**
- Consumes: Global Constraints의 선택자 약속.
- Produces (`e2e/helpers.ts`):

```ts
export async function openFromAllApps(page: Page, key: string): Promise<void>
// page.locator('[data-all-apps-open]').first().click() 뒤 page.locator(`[data-all-apps] [data-new="${key}"]`).click()
export interface TrendServer { url: string; requests: Array<{ url: string; headers: IncomingHttpHeaders }>; close(): Promise<void> }
export async function startTrendServer(body: string): Promise<TrendServer>
// node:http, 127.0.0.1의 빈 포트, 모든 요청을 기록하고 200 application/json으로 body를 준다. url = `http://127.0.0.1:<포트>/api/forecast`
```

- `launchShell`의 `env`는 `HANPAN_TREND_URL: ''`를 `...(options.env ?? {})` 앞에 둔다.

**정하는 규칙:**
- **Ruling R10(e2e):** e2e는 기본으로 기상도 주소가 없다(`HANPAN_TREND_URL=''`). 시험이 바깥 주소에 요청하지 않게 하기 위해서다. 트렌드를 보는 시험만 `startTrendServer`나 없는 주소를 넘긴다.
- `e2e/assets/trend-forecast.json`: 판 1 형식. `asOf` `'2026-11-09T00:30:00Z'`, `date` `'2026-11-09'`, 분야 10개(계획 1의 `FORECAST_FIELDS` 순서와 제목·경로: `/ai` … `/crypto`). `local-ai`는 `s: null`, `label: '정보 없음'`. `realestate`는 `scale: 'market'`. 나머지는 −2~2를 섞는다. `line`은 80자 이하의 한 문장.
- 조사 결과: 스펙 4절은 57개 파일이라 적었다. 지금 코드에서는 홈 선택자를 쓰는 e2e가 68개, `data-new`나 `.quick-card`를 쓰는 것이 50개다. R5(타일의 `quick-card`와 `data-hanpan`)와 기본 핀 때문에 고칠 것은 아래 11개 시험 파일과 `helpers.ts`뿐이다.

| 파일 | 고칠 것 |
|---|---|
| `e2e/home.spec.ts` | 첫 시험: `.quick-card` 순서 기대값을 `['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'pdf', 'templates', 'photo', 'illust', 'design', 'html']`로. 메뉴 이름 `['Home', 'Recent', 'Starred', 'Ask AI', 'AI folder work']`. 에이전트 항목 `nth(3)` → `nth(4)`(두 곳). 둘째 시험: 58줄의 첫 메뉴 기대를 `.first()`에서 `.nth(1)`로(기대 글자는 그대로). |
| `e2e/hanpan-home.spec.ts` | 16줄 `nth(3)`의 기대 `'templates'` → `'docx'`. |
| `e2e/home-widgets.spec.ts` | 보드 흐름으로 다시 쓴다(아래). |
| `e2e/home-search.spec.ts` | 106-108줄: `.recents-heading .section-label` 기대를 `[data-home-board]` 보임으로 바꾼다. 초점을 빼려고 누르는 곳은 `[data-card-type="apps"] .hb-card-title`. |
| `e2e/mindmap-tab.spec.ts` | 290줄 앞에 `.nav-item` 'Recent' 누르기. 374-381줄: 홈에서 먼저 `.quick-card[data-new="xmind"] img`의 주소를 읽고, 'Recent'로 가서 줄을 찾아 비교한다. 거르기 단추(385-388)는 그 화면에 있다. 514줄 → `openFromAllApps(page, 'open')`(폴더 보기의 새로 만들기 카드에서). |
| `e2e/markdown-tab.spec.ts` | 51-53줄: `openFromAllApps(page, 'md')`로 연다. 시험 이름의 'quick card'를 'from All apps'로. |
| `e2e/crash-recovery.spec.ts` | 373줄, 728줄 → `openFromAllApps(shell, 'md')`. |
| `e2e/hanpan-md-convert.spec.ts` | 42줄 → `openFromAllApps(page, 'md-convert')`. |
| `e2e/rtl-document-direction.spec.ts` | 51줄: 모든 형식을 `openFromAllApps(launched.page, format)`로 연다(15줄의 "홈 배치와 언어에 기대지 않는다"에 맞다). |
| `e2e/pdf-tools-window.spec.ts` | `openToolsWindow`(105-110줄)의 `home.getByRole('button', { name: card })`를 `openFromAllApps(home, 'pdf-tools')`로. `card` 인자를 지우고 부르는 곳 9곳(138, 245, 327, 371, 429, 478, 607, 672, 755줄)을 고친다. 24줄 주석을 'All apps'로. |
| `e2e/hanpan-manual-tour.spec.ts` | `startTrendServer(고정 기상도)`를 띄우고 `env: { HANPAN_TREND_URL: server.url }`로 연다. 01-home을 찍기 전에 `[data-trend-field]` 10개를 기다린다. 끝에 서버를 닫는다. |

- 그대로 통과해야 하는 것(고치지 않는다): `.quick-card[data-new="docx"|"xlsx"]`와 글자로 집는 'AI Docs'·'AI Sheets'·'AI Slides'·'AI HTML'·'AI PDF'·'Mind Map', photo·illust·hwp·xmind 타일, `[data-hanpan="design"|"templates"]`(디자인 시험 10개, `hanpan-templates`, `hanpan-official-forms`), 폴더 보기의 `home-folders`·`text-source`(R7), 즐겨찾기 보기의 `generate-window`, 메뉴를 글자로 집는 `kb-ask-group`, 시작판을 보는 `onboarding`, 어긋남을 넘기는 `menu-user-guide`.
- `e2e/home-widgets.spec.ts` 새 흐름(`lang: 'ko'`, 주소 없음):
  1. 카드 종류가 `['start', 'apps', 'recent', 'memo', 'favorites']`. 메모에 '오후 3시 결재 올리기'를 쓰고 초점을 뺀다.
  2. '홈 꾸미기' → '카드 추가' → memo. 설정 폼에서 제목 '이번 주 할 일', 완료, 글 '견적서 보내기'.
  3. '카드 추가' → shortcut. 종류 link, 제목 '사내 포털', 주소 `https://intra.example.com`, 크기 `6x2`, 완료. `data-size`가 `6x2`이고 `[data-shortcut-open]`에 '사내 포털'.
  4. '카드 추가' → clock. `[data-clock-time]`이 `/\d{1,2}:\d{2}/`.
  5. recent의 `[data-card-remove]`로 뺀다.
  6. '목록으로 정리'에서 `[data-custom-card="html"] input[type="checkbox"]`를 끈다. 닫기, 완료. 그림을 찍는다.
  7. 다시 켠다(같은 `userDataDir`). memo 2장(첫 글 그대로), recent 0장, shortcut `6x2`, clock 있음, `.quick-card[data-new="html"]` 0개.
  8. '모든 앱'의 `[data-app-pin="html"]`를 누르고 Esc. `.quick-card[data-new="html"]`가 1개이고 마지막 타일이다(0.18의 `data-pin`·`data-fav-app` 시험을 대신한다).
  9. '기본 배치로' → `[data-reset-confirm]`이 보이는 동안 카드 수는 그대로 → '예' → 카드 종류가 `['start', 'apps', 'recent', 'memo', 'favorites', 'memo', 'shortcut', 'clock']`이고 첫 메모의 글이 그대로다.

- [ ] **Step 1: 도우미와 고정 파일을 만들고 위 표대로 고친다.**

- [ ] **Step 2: lint를 돌린다.**
  - Run: `npm run lint`
  - Expected: 오류 없음. Playwright는 형을 검사하지 않고 옮기기만 하므로, 형 확인은 Task 12의 실제 실행이 겸한다.

- [ ] **Step 3: 커밋한다.** 메시지: `test(e2e): follow the home board in the existing specs`

### Task 12: 새 e2e, 실제 실행 비교, 설명서 그림, 결정 기록

**Files:**
- Create: `e2e/home-board.spec.ts`, `docs/tracking/decisions/0097-hanpan-home-board.md`
- Modify: `docs/tracking/decisions/index.md`, `apps/shell/AGENTS.md`, `docs/manual/images/01-home.png`(투어로 다시 찍는다)

**Interfaces:**
- Consumes: Task 11의 `openFromAllApps`, `startTrendServer`, `e2e/assets/trend-forecast.json`.

**정하는 규칙 (`e2e/home-board.spec.ts`, 스펙 8절의 새 e2e 9개):**
- `'first run shows six cards in order and an offline trend card'`(1·2): `lang: 'ko'`, `env: { HANPAN_TREND_URL: 'http://127.0.0.1:9/api/forecast' }`.
  - `[data-card]`의 `data-card-type`이 `['start', 'trend', 'apps', 'recent', 'memo', 'favorites']`.
  - `[data-trend-offline]`이 '인터넷에 연결되면 오늘의 트렌드가 나옵니다'.
  - 9초를 기다린 뒤에도 같고 `[data-home-board]`가 보인다.
- `'a fixed forecast shows ten fields and opens Trend Radar with UTM'`(3): `startTrendServer`.
  - 메인에서 `shell.openExternal`을 기록하는 함수로 바꿔 끼운다(`app.evaluate`).
  - `[data-trend-field]` 10개, `[data-trend-nodata]` 1개. stocks를 누르면 기록된 주소가 `'https://trend.tenai.kr/stocks?utm_source=hanpan&utm_medium=home&utm_campaign=forecast'`.
  - 서버가 받은 첫 요청의 경로가 `` `/api/forecast?client=hanpan&v=${version}` ``(`version` = `app.getVersion()`), `user-agent`가 `` `Hanpan/${version}` ``이고 `cookie`, `authorization` 머리가 없다. 받은 머리 이름 목록을 출력해 `docs/security.md`의 '보내는 것'과 맞는지 본다.
- `'unpinning AI Photo and pinning it back keeps the order after a restart'`(4): '홈 꾸미기' → `[data-app-unpin="photo"]` → `.quick-card[data-new="photo"]` 0개 → 완료 → '모든 앱'의 `[data-app-pin="photo"]` → Esc → photo가 마지막 타일. `.quick-card` 순서를 적어 두고 다시 켠 뒤 같다.
- `'the list view moves a card with the keyboard'`(5): '홈 꾸미기' → '목록으로 정리' → `[data-custom-board="start"] [data-move="down"]`에 `focus()` → Enter → 첫 `[data-card]`가 start가 아니다. Tab을 여러 번 눌러도 초점이 `[data-home-custom="panel"]` 안이다. Esc로 닫는다. `app-settings.json`의 `homeBoard.cards` 순서에도 반영돼 있다.
- `'a 0.18 homeLayout comes over with its widgets and memo'`(6): `settings: { homeLayout: LEGACY }`.
  - `LEGACY` = `{ widgets: [{ id: 'memo', type: 'memo', size: 'wide', title: '', text: '분기 보고 마감 11/14' }, { id: 'recent', type: 'recent', size: 'small', title: '' }, { id: 'clock-a1', type: 'clock', size: 'small', title: '' }, { id: 'favorites', type: 'favorites', size: 'small', title: '' }], cardOrder: ['pptx', 'xmind', 'hwp', 'templates'], hiddenCards: ['html'], pinnedApps: ['md'] }`.
  - 카드 종류 `['start', 'apps', 'memo', 'recent', 'clock', 'favorites']`. memo는 `6x2`이고 글이 그대로다.
  - `.quick-card` 순서 `['pptx', 'xmind', 'hwp', 'templates', 'docx', 'xlsx', 'design', 'pdf', 'photo', 'illust', 'md']`.
  - 끝낸 뒤 `app-settings.json`의 `homeLayout`이 `LEGACY`와 `toEqual`이고 `homeBoard`가 있다.
- `'fits a 1366×728 window without horizontal scrolling'`(7): `lang: 'ko'`, `startTrendServer`.
  - 마크다운 파일 하나를 `openPath`로 열고 홈으로 돌아와 `focus` 이벤트를 보낸다(최근 문서 한 줄을 만든다).
  - `BrowserWindow.getAllWindows()[0].setSize(1366, 728)` 뒤:
    - `data-cols="12"`.
    - start와 trend 카드의 `boundingBox().y`가 1px 안으로 같다.
    - 첫 `[data-recent-file]`의 아래 끝이 `window.innerHeight` 안이다.
    - `.content`의 `scrollWidth <= clientWidth`.
    - 모든 `.quick-card`의 넓이가 160px 이하.
  - `setSize(900, 700)` 뒤에도 가로 스크롤이 없다.
  - `lang: 'vi'`로 다시 켜서 1366×728이면 `[data-hanpan="start-topic"]`과 `[data-hanpan="start-go"]`의 `y`가 같다.
- `'the guide button and F1 open the manual'`(8): `[data-hanpan="start-guide"] kbd`가 'F1'. 누르면 `aiOfficeTabs.list()`에 kind `'help'` 탭이 생긴다. 그 탭을 닫는다. `Menu.getApplicationMenu()`에서 `accelerator === 'F1'`인 항목을 `click()`하면(`hanpan-manual-tour.spec.ts`와 같은 방법; CDP로 누른 키는 메뉴 단축키에 닿지 않는다) 다시 help 탭이 생긴다.
- `'the head search replaces the board and Esc brings it back'`(9): `settings: { defaultSaveDir: <임시 폴더> }`에 `meeting-notes.md`. `.file-search input`에 'meeting' → `.search-row` 1개(시간 30초), `[data-home-board]` 0개 → Esc → `[data-home-board]`가 보이고 `.search-results`가 0개.
- 결정 기록 `0097-hanpan-home-board.md`(맥락, 결정, 택하지 않은 것, 결과; 한국어): 맥락은 스펙 1절. 결정은 위젯 보드형, 순서·크기·grid, `homeBoard`와 옮겨 오기(R2·R3·R4), 기상도 API를 받아 메인이 받기(R9·R11), 카드 이름과 번역 범위(R19). 택하지 않은 것은 스펙 5절의 다른 방식. 결과는 e2e 변화, `PRIVACY.md`, 남은 열린 문제. `index.md`에 줄 하나를 더한다(날짜는 커밋하는 날).
- `apps/shell/AGENTS.md`:
  - '맡은 범위'의 '홈 화면과 설정' 항목 뒤에 홈 보드(`src/renderer/src/home-board/`, 저장 `shared/home-board.ts`·`main/home-board.ts`, 앱 목록 `shared/home-apps.ts`, 결정 0097)와 트렌드 소식(`src/main/trend/`, `shared/trend-forecast.ts`·`trend-api.ts`, preload `window.aiOfficeTrend`)을 적는다.
  - '항상 지켜야 하는 것'에 한 줄을 더한다: "네트워크에서 온 것을 보여 주는 홈 카드는 트렌드 카드뿐이다. 메인 프로세스가 받고, 화면 CSP(`connect-src`)는 넓히지 않으며, 링크는 `https://trend.tenai.kr/`로만 연다(`tests/renderer-csp.test.ts`, `tests/trend-forecast.test.ts`)."
  - '테스트'에 새 시험 파일들을 적는다.

- [ ] **Step 1: `e2e/home-board.spec.ts`를 쓴다.**

- [ ] **Step 2: 빌드하고 새 e2e와 고친 e2e를 돌린다.**
  - Run: `npm run build:all`. 그다음 `E2E_NO_VIDEO=1 npm run test:e2e -- e2e/home-board.spec.ts e2e/home.spec.ts e2e/hanpan-home.spec.ts e2e/home-widgets.spec.ts e2e/home-search.spec.ts e2e/home-folders.spec.ts e2e/mindmap-tab.spec.ts e2e/markdown-tab.spec.ts e2e/crash-recovery.spec.ts e2e/hanpan-md-convert.spec.ts e2e/rtl-document-direction.spec.ts e2e/pdf-tools-window.spec.ts e2e/generate-window.spec.ts e2e/new-file-tab.spec.ts e2e/onboarding.spec.ts e2e/hanpan-templates.spec.ts e2e/text-source.spec.ts`
  - Expected: `home-board.spec.ts`는 모두 PASS. 나머지의 실패 목록을 적어 둔다.

- [ ] **Step 3: 손대지 않은 사본과 견준다.**
  - `git worktree add ../hanpan-e2e-base a09a70b5`에서 `npm ci`, `npm run build:all` 뒤 Step 2의 목록(새 파일 제외)을 같은 명령으로 돌린다.
  - Expected: 이 가지의 실패가 기준 사본 실패의 부분집합이다. 아니면 고친 뒤 Step 2부터 다시 한다. 끝나면 `git worktree remove ../hanpan-e2e-base`.

- [ ] **Step 4: 설명서 그림을 다시 찍는다.**
  - Run: `E2E_NO_VIDEO=1 npm run test:e2e -- e2e/hanpan-manual-tour.spec.ts`
  - Expected: `docs/manual/images/01-home.png`가 새 보드(트렌드 날씨 포함)로 바뀐다. 그림을 직접 열어 본다. 디자인 단계가 리눅스 CI에서처럼 실패해도(11/8 CI에서 이미 실패하던 10건 중 하나) 01-home은 그 전에 찍힌다.

- [ ] **Step 5: 결정 기록과 AGENTS.md를 쓰고, 합치기 전 검사를 돈다.**
  - Run: `npm run typecheck -w @genoffice/shell`, `npm run lint`, `npm run format:check`, `npm run test -w @genoffice/shell`, `npm run check:theme-colors`, `npm run check:english-comments`, `npm run check:help-langs`, `npm run check:no-genspark`
  - Expected: 원래 실패 말고는 모두 통과한다.

- [ ] **Step 6: 실제 기상도 주소가 열렸으면 사이트와 견준다(완료 기준 3).** `npm run shell`을 한국어 화면으로 띄우고, 트렌드 카드의 10개 날씨 말과 `https://trend.tenai.kr/`의 홈 화면 10줄을 같은 때에 비교한다. 아직 안 열렸으면 0.19.0을 막는 일로 보고에 남긴다.

- [ ] **Step 7: 커밋하고 최종 보고를 쓴다.** 메시지: `test(e2e): cover the home board, and record decision 0097`. 보고에는 ① 완료 기준 1~5 대비 상태, ② 사용자 확인 없이 정한 것 — R27의 문구 표(한국어 전체)와 R28의 `PRIVACY.md` 바뀐 글, 그리고 R24·R29처럼 스펙에 없던 동작, ③ 남은 일(push·CI·배포는 사용자 허락 뒤)과 그 뒤 가능해지는 것을 적는다.

- [ ] **Step 8: 사용자가 push를 허락하면 CI의 전체 e2e로 확인한다.** `git push -u origin feat/home-board` 뒤 `gh workflow run ci.yml --ref feat/home-board`. CI e2e의 실패가 11/8 CI의 10건(그림·디자인 보드·설명서 둘러보기)과 같거나 그 일부여야 한다(완료 기준 5). 늘어난 실패가 있으면 고친다.

## 스펙 대조

| 스펙 | 작업 |
|---|---|
| 7.0 보드 머리 줄 | Task 4(검색), Task 5('홈 꾸미기' 단추와 안내 줄) |
| 7.1 기본 배치 | Task 1, Task 12의 e2e 1 |
| 7.2 카드 종류 | Task 1(크기·개수·정리), Task 5(빼기·추가) |
| 7.3 시작 카드 | Task 3, Task 10(예시 칩 번역), Task 12의 e2e 8 |
| 7.4 새로 만들기, 모든 앱, 새 앱, 한 줄 설명 | Task 2, Task 4(연결), Task 5·6(꾸미기) |
| 7.5 이어서 하기, 왼쪽 메뉴 | Task 3, Task 4 |
| 7.6 트렌드 카드 | Task 8, Task 12의 e2e 2·3 |
| 7.7 위젯 카드, 즐겨찾기 앱 고정 없앰 | Task 3, Task 1(`pinnedApps` 옮기기) |
| 7.8 홈 꾸미기 | Task 5, Task 6, Task 12의 e2e 4·5 |
| 7.9 좁은 화면 | Task 9, Task 12의 e2e 7 |
| 7.10 저장과 옮겨 오기 | Task 1, Task 12의 e2e 6 |
| 7.11 한판 쪽(받기, 검사, 저장, 화면, 링크, 문서) | Task 7, Task 8 |
| 보강: 일부만 받은 답의 분야별 병합과 표시(스펙에는 없음) | Task 7(R24), Task 8(R25), Review Focus 6 |
| 7.12 문구, 번역, 설명서 | Task 1(ko·en·vi 등록, R22), Task 10, Task 12(그림) |
| 8절 단위 시험 | `home-board.test.ts`(Task 1), `home-apps.test.ts`(Task 2), `home-board-edit.test.ts`(Task 3·5) — 셋으로 나눈 이유는 R21, `trend-forecast.test.ts`(Task 7·8) |
| 8절 새 e2e 1~9 | Task 12 |
| 8절 고칠 기존 e2e | Task 11 |
| 2절 완료 기준 5(e2e) | Task 12 Step 2·3·8 |

## 이 계획 밖에서 막는 것

| 일 | 누가 | 언제까지 | 막는 것 |
|---|---|---|---|
| 기상도 API를 팀 Vercel에 배포하고 `trend.tenai.kr` 연결(계획 1, 스펙 9절 2·4) | 혁준(PR 확인·합치기·DNS) | 11/13 | 0.19.0 배포, Task 12 Step 6 |
| 열린 문제 3: '홈에서 트렌드 소식 받기' 설정을 둘지 | 대표님 | 11/17 | 둔다면 `wanted()`에 조건 하나와 설정 줄을 더하는 후속 작업. 그때까지는 R9(카드를 빼면 받지 않음)가 끄는 법이다 |
| 열린 문제 4: 사이트 개인정보처리방침의 '트렌드 소식 받기' 문구 | 혁준(Claude 초안) | 0.19.0 배포 전 | 0.19.0 배포 |
| 최종 보고의 '정한 문구'(R27)와 `PRIVACY.md` 바뀐 글(R28) 사후 확인 | 혁준 | PR 전 | 바꾸면 ko를 고치고 Task 10 번역을 다시 한다 |
| 열린 문제 5: 한국어가 아닌 화면에서 트렌드 카드를 기본에서 뺄지(이 계획은 스펙대로 뺀다) | 혁준 | 11/17 | 넣기로 하면 `defaultCardTypes`의 조건 하나를 바꾼다 |
