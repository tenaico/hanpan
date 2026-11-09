# 트렌드레이더 기상도 API 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 트렌드레이더에 `GET /api/forecast`를 더한다. 한판 홈의 트렌드 카드는 이 주소에서 사이트 홈과 같은 '오늘의 기상도'를 받아 그린다.

**Architecture:**
- 지금 사이트 홈 화면(`src/app/page.tsx`, 브라우저)에서 하는 기상도 계산을 `src/lib`의 순수 함수로 옮긴다.
- 사이트 홈과 새 서버 주소가 그 함수를 같이 쓴다. 그래서 둘의 날씨는 늘 같다.
- 서버 주소는 원본 API의 lib 함수로 입력을 모아 계산하고, 응답 머리(`Cache-Control`)로 Vercel CDN에 결과를 저장시킨다.

**Tech Stack:** Next.js 15.5.28 (App Router), React 19.1, TypeScript. 시험은 Vitest(이번에 새로 들인다).

**Spec:** `C:\Users\ten\Desktop\hanpan\.claude\worktrees\home-board\docs\superpowers\specs\2026-11-09-hanpan-home-board-design.md`의 7.11 '트렌드레이더 쪽'과 '형식', 8절 '트렌드레이더 확인'. 승인 2026-11-09.

## Global Constraints

**저장소와 가지**
- 저장소: `C:\Users\ten\Desktop\tenai-trend` (`tenaico/tenai-trend`).
- 가지: master 752e1a4에서 딴 `feat/forecast-api`.

**지켜야 할 값**
- 사이트 화면은 바뀌지 않는다. 홈의 10줄 날씨 말, 아이콘, 한 줄 요약(`head`), 순서가 지금과 같아야 한다.
- 응답 형식은 `schema` 1이다. 키는 `schema`, `asOf`, `date`, `fields`, `line`이다. `fields`의 항목 키는 `key`, `title`, `scale`, `s`, `label`, `head`, `path`다.
- 분야 `key`와 순서: `ai`, `opensource`, `local-ai`, `ai-safety`, `stocks`, `economy`, `semiconductor`, `realestate`, `fx`, `crypto`.
- `s`는 −2부터 2까지의 정수 또는 `null`이다. `null`일 때 `label`은 `"정보 없음"`이다.
- 다 받은 응답의 머리: `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`.
- '오늘의 한 줄'은 규칙으로 만든다. AI를 부르지 않는다.

**작업 규칙**
- 새 의존성은 `vitest`(devDependencies) 하나뿐이다.
- 커밋은 영어 메시지로, `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`으로 한다. 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.
- 시험 명령은 `npm test`(= `vitest run`), `npm run lint`, `npm run build`다.

## Review Focus

1. **원본 하나가 느리거나 실패할 때**(ECOS sample 키, CoinGecko 횟수 제한 등): 나머지 분야를 채워 20초 안에 답해야 한다. 실패한 분야만 `s: null`이다. → Task 4 `loadForecastInputs` 시험.
2. **원본이 대부분 실패할 때**: CDN이 빈 기상도를 30분 동안 저장해 두면 안 된다. 알려진 분야가 5개 미만이면 503에 `no-store`로 답한다. 그러면 한판은 이전 저장본을 쓴다. → Task 4 `forecastCacheControl` 시험.
3. **한국 자정 경계**: UTC 15:00 이후의 `date`는 한국 날짜로 다음 날이다. → Task 4 `toForecastPayload` 시험.
4. **옮긴 뒤 사이트 모습**: 같은 시각에 master와 이 가지의 홈을 나란히 열어 10줄이 같은지 본다. → Task 3 확인 단계.
5. **같은 시각의 API와 사이트**: 배포한 뒤 사이트 홈의 10개 날씨와 `/api/forecast`의 `s`가 같아야 한다. → Task 5 확인 단계.

---

### Task 1: Vitest와 서버에서도 쓰는 신호 모듈

**Files:**
- Create: `src/lib/signal.ts`, `src/lib/signal.test.ts`, `vitest.config.ts`
- Modify: `package.json` (`"test": "vitest run"`, devDependency `vitest`), `src/components/briefing.tsx:9-42`, `src/components/market.tsx:32-41`

**Interfaces:**
- Produces (`src/lib/signal.ts`, `"use client"` 없음, JSX 없음):
  - `type Signal = -2 | -1 | 0 | 1 | 2`
  - `type Scale = "weather" | "market"`
  - `toSignal(score: number): Signal`. 지금 `briefing.tsx`와 같은 경계값이다: ≥1.5 → 2, ≥0.5 → 1, >−0.5 → 0, >−1.5 → −1, 그 밖 → −2.
  - `WEATHER_LABEL: Record<Signal, string>` = 맑음, 구름 조금, 흐림, 비, 폭풍우 (2 → −2)
  - `MARKET_LABEL: Record<Signal, string>` = 과열, 상승, 보합, 하락, 침체 (2 → −2)
  - `signalLabel(s: Signal, scale: Scale = "weather"): string`
  - `type TrendInput = { price: number; changePct: number; ma20: number | null; ma60: number | null; ret1m: number | null }`
  - `trendScore(q: TrendInput, invert = false): number`. 지금 `market.tsx`와 같은 식이다.
- `briefing.tsx`는 `toSignal`, `Signal`, `Scale`을 `@/lib/signal`에서 다시 내보낸다(`export { toSignal } from "@/lib/signal"`, `export type { Signal, Scale } from "@/lib/signal"`). `WEATHER`와 `MARKET` 표의 `label`은 `WEATHER_LABEL`과 `MARKET_LABEL`에서 가져온다. 아이콘과 색은 그대로 둔다.
- `market.tsx`는 `trendScore`를 `@/lib/signal`에서 다시 내보낸다. 그래서 다른 화면(`ai`, `crypto`, `fx` 등)의 import는 바꾸지 않는다.

- [ ] **Step 1: Vitest를 들인다.**
  - `npm i -D vitest`를 실행한다.
  - `vitest.config.ts`를 만든다. `test.environment`는 `"node"`다. `resolve.alias`에 `@` → `src`, `@data` → `data`를 `path.resolve(__dirname, ...)`로 넣는다.
  - `package.json` scripts에 `"test": "vitest run"`을 더한다.

- [ ] **Step 2: 실패하는 시험을 쓴다.** `src/lib/signal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { signalLabel, toSignal, trendScore } from "./signal";

describe("toSignal", () => {
  it.each([[1.5, 2], [1.49, 1], [0.5, 1], [0.49, 0], [-0.49, 0], [-0.5, -1], [-1.49, -1], [-1.5, -2]])("%f → %i", (score, s) => {
    expect(toSignal(score)).toBe(s);
  });
});

describe("signalLabel", () => {
  it("weather and market words", () => {
    expect(signalLabel(1)).toBe("구름 조금");
    expect(signalLabel(-2)).toBe("폭풍우");
    expect(signalLabel(-2, "market")).toBe("침체");
    expect(signalLabel(0, "market")).toBe("보합");
  });
});

describe("trendScore", () => {
  it("adds direction, 20-day line, alignment and 1-month momentum", () => {
    expect(trendScore({ price: 110, changePct: 1, ma20: 100, ma60: 90, ret1m: 5 })).toBeCloseTo(2.1);
    expect(trendScore({ price: 110, changePct: 1, ma20: 100, ma60: 90, ret1m: 5 }, true)).toBeCloseTo(-2.1);
    expect(trendScore({ price: 90, changePct: -1, ma20: null, ma60: null, ret1m: null })).toBeCloseTo(-0.4);
  });
});
```

- [ ] **Step 3: 실패를 확인한다.**
  - Run: `npm test`
  - Expected: FAIL. `./signal`을 찾지 못한다.

- [ ] **Step 4: `src/lib/signal.ts`를 만들고, `briefing.tsx`와 `market.tsx`가 그것을 쓰게 바꾼다.**

- [ ] **Step 5: 통과를 확인한다.**
  - Run: `npm test && npm run lint && npm run build`
  - Expected: 시험 3묶음이 PASS다. lint 오류가 없다. build가 성공한다. build 성공은 다른 화면의 import가 그대로 풀린다는 뜻이다.

- [ ] **Step 6: 커밋한다.** 메시지: `refactor: move the forecast signal math to a server-safe module`

### Task 2: 기상도 계산 함수와 '오늘의 한 줄'

**Files:**
- Create: `src/lib/forecast.ts`, `src/lib/forecast.test.ts`

**Interfaces:**
- Consumes: Task 1의 `Signal`, `Scale`, `toSignal`, `trendScore`, `signalLabel`. 그리고 `src/lib/localai-insight.ts`의 `analyzeLocal`, `PC_GB`, `type Local`, `src/lib/format.ts`의 `fmt`, `fmtSigned`, `won`, `src/lib/yahoo.ts`의 `type Quote`(타입만).
- Produces (`src/lib/forecast.ts`, `"use client"` 없음, JSX 없음, 서버 전용 모듈을 런타임으로 import하지 않음):
  - `type FieldKey = "ai" | "opensource" | "local-ai" | "ai-safety" | "stocks" | "economy" | "semiconductor" | "realestate" | "fx" | "crypto"`
  - `FORECAST_FIELDS: readonly { key: FieldKey; title: string; path: string; scale: Scale }[]`. 지금 `page.tsx`의 `rows`와 같은 순서, 제목, `href`이고 부동산만 `scale: "market"`이다.
  - `type ForecastInputs`:
    - `quotes: { korea, global, macro, semi, ai, crypto }`. 값은 각각 `Quote[] | null`이다.
    - `hf: { models: { id: string; country: string; createdAt: string; task: string }[] } | null`
    - `local: Local | null`
    - `ecos: Partial<Record<string, { points: { t: string; v: number }[] }>> | null`. `getEcosMany().series`와 같은 모양이다.
    - `fng: { v: number }[] | null`. 오래된 것에서 최신 순이다.
  - `type ForecastData = { ai: typeof aiJson; safety: typeof safetyJson; macro: typeof macroJson; semi: typeof semiJson }`. 각 JSON은 `import type`으로 가져온다.
  - `type ForecastRow = { key: FieldKey; title: string; path: string; scale: Scale; s: Signal; known: boolean; head: string }`
  - `computeForecast(inp: ForecastInputs, data: ForecastData): ForecastRow[]`
  - `withTopic(name: string): string`. 이름 뒤에 '은'이나 '는'을 붙인다.
  - `forecastLine(rows: ForecastRow[]): string`

**`computeForecast`는 지금 `page.tsx` 37~95줄(신호 계산)과 96~215줄(`head`)을 그대로 옮긴 것이다.**
- 시간에 따라 달라지는 값(허깅페이스 7일 신규, `analyzeLocal`의 7일 기준)은 지금처럼 `Date.now()`를 쓴다.
- `s`는 지금 사이트가 보여 주는 값 그대로다(원본이 없으면 아래 표의 기본값). `known`은 그 분야의 원본이 실제로 있었는지를 뜻한다.
- **Ruling:** 스펙 7.11은 "함수는 원본이 없으면 `null`을 돌려주고, 사이트는 `null`을 0으로 보여 준다"고 적었다. 그러나 AI 분야는 원본이 없을 때 사이트가 0이 아니라 1(구름 조금)을 보여 준다. 그래서 `null`을 0으로 바꾸면 사이트 모습이 달라진다. 이를 피하려고 `s`(사이트 값)와 `known`을 따로 두고, API만 `known`이 거짓일 때 `null`을 보낸다. 잘못 판단한 경우의 비용은 없다. 바깥으로 나가는 형식은 스펙과 같다.

| key | `known`이 참인 조건 | 원본이 없을 때의 `s` (사이트와 같음) |
|---|---|---|
| ai | `quotes.ai`가 1개 이상 | `toSignal(0.5)` = 1 |
| opensource | `hf.models`가 1개 이상 | 0 |
| local-ai | `local`이 있음 | 0 |
| ai-safety | 늘 참(리서치 파일) | — |
| stocks | `quotes.korea`에 `^KS11`이 있음 | 0 |
| economy | `ecos`가 있음 | 0 |
| semiconductor | 늘 참(수출 리서치 파일; 반도체 주가는 있으면 더함) | — |
| realestate | `ecos.kbSaleSeoulApt` 점이 1개 이상 | 0 |
| fx | `quotes.macro`에 `KRW=X`가 있음 | 0 |
| crypto | `quotes.crypto`에 `BTC-USD`가 있음 | 0 |

**`forecastLine` 규칙 (Claude 판단, 스펙 7.11이 만드는 사람에게 맡긴 부분):**
- `scale`이 `"weather"`이고 `known`이 참인 분야만 본다.
- 좋은 쪽은 `s ≥ 1`인 분야를 `s` 큰 순, 같으면 필드 순서로 골라 최대 2개다. 궂은 쪽은 `s ≤ −1`인 분야를 `s` 작은 순, 같으면 필드 순서로 골라 최대 2개다.
- 문장 틀(이름은 `·`로 잇고, 마지막 이름에 `withTopic`):
  - 둘 다 있을 때: `{좋은 쪽}{은/는} 맑은 편이고, {궂은 쪽}{은/는} 궂은 편입니다.`
  - 좋은 쪽만: `{좋은 쪽}{은/는} 맑은 편입니다.`
  - 궂은 쪽만: `{궂은 쪽}{은/는} 궂은 편입니다.`
  - 둘 다 없을 때: `뚜렷하게 맑거나 궂은 분야가 없습니다.`

**`withTopic` 규칙.** 마지막 글자로 정한다.
- 한글이면 받침이 있을 때 '은', 없을 때 '는'이다. 받침이 있으면 `(code − 0xAC00) % 28 ≠ 0`이다.
- 숫자면 0, 1, 3, 6, 7, 8은 '은', 2, 4, 5, 9는 '는'이다.
- 영문자면 l, m, n, r(대소문자 무관)은 '은', 나머지는 '는'이다.
- 그 밖의 글자는 '는'이다.

- [ ] **Step 1: 실패하는 시험을 쓴다.** `src/lib/forecast.test.ts`

준비물:
- 실제 리서치 파일 넷(`@data/ai-big5.json` 등)을 `ForecastData`로 쓴다.
- `beforeEach`에서 `vi.useFakeTimers()`, `vi.setSystemTime(new Date("2026-11-09T00:00:00Z"))`를 부른다.
- `quote(symbol, over)` 도우미는 `price 100, changePct 0, ma20 100, ma60 100, ret1m 0, change 0, retYtd 0, spark []`에 `over`를 덮은 `Quote`를 만든다. `lib/yahoo.ts`의 `Quote`에 필요한 나머지 필드는 숫자 0, `null`, 빈 배열로 채운다.
- `allNull`은 모든 원본이 `null`인 입력이다.

시험:
- `"keeps the home page field order"`
  - `computeForecast(allNull, data).map(r => r.key)`가 Global Constraints의 10개 순서와 같다.
- `"stocks: bullish KOSPI and S&P give clear weather"`
  - 입력: `^KS11`(price 2612, changePct 1, ma20 2500, ma60 2400, ret1m 5), `^GSPC` 같은 모양.
  - 기대: `s` 2, `known` true, `head`가 `"코스피 2,612 (+1.00%), 1개월 +5.0%"`.
- `"stocks: no quotes means unknown and the site's fallback"`
  - 입력: `allNull`.
  - 기대: `s` 0, `known` false, `head` `"시세를 불러오는 중"`.
- `"fx: a rising won-dollar rate is bad weather (inverted)"`
  - 입력: `KRW=X`(price 1400, changePct 1, ma20 1380, ma60 1350, ret1m 4).
  - 기대: `s` ≤ −1, `known` true.
- `"realestate uses the market scale"`
  - 입력: `kbSaleSeoulApt` 점 `[100, 100.3]`, `kbSaleApt` 점 `[100, 100.2]`.
  - 기대: `scale` `"market"`, `s` 1. 계산은 (0.3×0.6 + 0.2×0.4)/0.4 = 0.65다.
- `"ai with no quotes shows the site's default but is unknown"`
  - 기대: `s` 1, `known` false, `head` = `data.ai.overview.headline`.
- `"ai-safety comes from research data and is always known"`
  - 기대: `known` true, `s` = `toSignal(gauges.s의 평균)`, `head` = `data.safety.overview.headline`.
- `forecastLine`
  - semiconductor 2, stocks 1, ai-safety −1, 나머지 0 → `"반도체·주식은 맑은 편이고, AI 보안·윤리는 궂은 편입니다."`
  - ai 2만 → `"AI 트렌드 Big 5는 맑은 편입니다."`
  - crypto −2, fx −1 → `"블록체인·환율은 궂은 편입니다."`
  - 모두 0 → `"뚜렷하게 맑거나 궂은 분야가 없습니다."`
  - realestate 2(market)만 → 모두 0일 때와 같다.
  - stocks 2이지만 `known` false → 모두 0일 때와 같다.
  - ai 2, opensource 2, stocks 1 → `"AI 트렌드 Big 5·오픈소스 AI는 맑은 편입니다."` (좋은 쪽은 둘까지만 쓴다)
- `withTopic`
  - `"주식"` → `"주식은"`
  - `"경제"` → `"경제는"`
  - `"AI 트렌드 Big 5"` → `"AI 트렌드 Big 5는"`
  - `"내 PC AI"` → `"내 PC AI는"`
  - `"환율"` → `"환율은"`

시험용 `ForecastRow`는 `computeForecast(allNull, data)`의 결과에서 `s`와 `known`만 덮어 만든다. 시험에서 따로 적지 않은 분야는 `s` 0, `known` true다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `npm test -- src/lib/forecast.test.ts`
  - Expected: FAIL. `./forecast`를 찾지 못한다.

- [ ] **Step 3: `src/lib/forecast.ts`를 쓴다.** 위 Interfaces대로 쓴다. 계산식과 `head` 문장은 `page.tsx`에서 옮기고 고치지 않는다.

- [ ] **Step 4: 통과를 확인한다.**
  - Run: `npm test && npm run lint`
  - Expected: 모두 PASS다.

- [ ] **Step 5: 커밋한다.** 메시지: `feat: compute the trend forecast in a shared library`

### Task 3: 사이트 홈이 공용 함수를 쓰게 하기 (사이트 모습은 그대로)

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Task 2의 `computeForecast`, `FORECAST_FIELDS`, `ForecastRow`. 그리고 Task 1의 `signalLook`(briefing, 아이콘용).

- [ ] **Step 1: `page.tsx`를 바꾼다.**
  - 37~95줄의 신호 계산을 지우고, `useApi` 결과로 `ForecastInputs`를 만들어 `computeForecast(inputs, { ai, safety, macro, semi })`를 부른다. `inputs`는 `quotes: { korea: q.data?.korea ?? null, … }`, `hf: hf.data ?? null`, `local: la.data ?? null`, `ecos: ec.data?.series ?? null`, `fng: cr.data?.fng ?? null`이다.
  - `rows`의 `s`, `head`, `title`, `href`(= `path`), `scale`은 그 결과에서 가져온다.
  - `facts`와 `spark`(화면 전용)는 지금처럼 `page.tsx`에서 만든다. 그래서 `facts`에 쓰이는 값(`sp`, `sox`, `jpy`, `dxy`, `fng`, `kimp`, `btcDom`, `gdp`, `cpi`, `rate`, `ca`, `landLast` 등)을 고르는 코드는 남긴다.

- [ ] **Step 2: 시험, lint, build를 돌린다.**
  - Run: `npm test && npm run lint && npm run build`
  - Expected: 모두 통과한다.

- [ ] **Step 3: 옮기기 전과 후의 홈을 나란히 비교한다.**
  - master를 다른 작업 폴더(`git worktree add ../tenai-trend-master master`)에서 `npm run dev -- -p 3001`로 띄운다. 이 가지는 `npm run dev`(3000)로 띄운다.
  - 두 홈을 거의 같은 시각에 열어 10줄의 '날씨 말 + 제목 + 한 줄 요약' 글을 비교한다.
  - Expected: 10줄이 모두 같다. 시세가 그 사이 바뀌어 한 줄이 다르면 두 쪽을 같이 다시 열어 한 번 더 비교한다.
  - 비교가 끝나면 두 서버를 끄고 master 작업 폴더를 지운다.

- [ ] **Step 4: 커밋한다.** 메시지: `refactor: render the home forecast from the shared library`

### Task 4: `/api/forecast` 주소

**Files:**
- Create: `src/lib/forecast-load.ts`, `src/lib/forecast-load.test.ts`, `src/app/api/forecast/route.ts`
- Modify: `src/lib/forecast.ts` (응답 함수 추가), `src/lib/forecast.test.ts`, `README.md` (한판 연동 절)

**Interfaces:**
- Consumes: Task 2의 `computeForecast`, `forecastLine`, `ForecastRow`, `ForecastInputs`, `FieldKey`. 그리고 Task 1의 `signalLabel`.
- Produces (`src/lib/forecast.ts`에 추가):
  - `type ForecastPayload = { schema: 1; asOf: string; date: string; fields: { key: FieldKey; title: string; scale: Scale; s: Signal | null; label: string; head: string; path: string }[]; line: string }`
  - `toForecastPayload(rows: ForecastRow[], now: Date): ForecastPayload`
    - `asOf` = `now.toISOString()`
    - `date` = 한국 날짜 `YYYY-MM-DD`. 계산은 `new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)`이다.
    - `s` = `known ? s : null`
    - `label` = `known ? signalLabel(s, scale) : "정보 없음"`
    - `line` = `forecastLine(rows)`
  - `forecastCacheControl(rows: ForecastRow[]): { status: 200 | 503; cacheControl: string }` (Claude 판단)
    - 10개 모두 알려짐 → `{ 200, "public, s-maxage=1800, stale-while-revalidate=86400" }`
    - 5~9개 → `{ 200, "public, s-maxage=60" }`. 일부만 받은 결과는 1분만 저장해서 빨리 회복하게 한다.
    - 4개 이하 → `{ 503, "no-store" }`
- Produces (`src/lib/forecast-load.ts`, 서버 전용):
  - `type ForecastSources = { quotes(group: "korea" | "global" | "macro" | "semi" | "ai" | "crypto"): Promise<Quote[]>; hf(): Promise<NonNullable<ForecastInputs["hf"]>>; local(): Promise<Local>; ecos(): Promise<NonNullable<ForecastInputs["ecos"]>>; fng(): Promise<{ v: number }[]> }`
  - `defaultSources: ForecastSources`. 지금 API들과 같은 함수를 쓴다.
    - `quotes`: korea → `getQuotes(MARKET_GROUPS.korea.items)`, global → `MARKET_GROUPS.global.items`, macro → `MARKET_GROUPS.macro.items`, semi → `getQuotes(SEMI_WATCHLIST)`, ai → `getQuotes(Object.values(AI_PROXIES))`, crypto → `getQuotes(CRYPTO_CHART)`
    - `hf` → `getHfTrending()`
    - `local` → `getLocalAi()`
    - `ecos` → `getEcosMany(["gdpYoy","cpi","baseRate","currentAccount","kbSaleSeoulApt","kbSaleApt","kbSaleVilla","landNation"]).then(r => r.series)`
    - `fng` → `getFearGreed()`
  - `loadForecastInputs(sources: ForecastSources = defaultSources, timeoutMs = 20_000): Promise<ForecastInputs>`. 원본마다 따로 부르고, 실패하거나 `timeoutMs`가 지나면 그 원본만 `null`로 둔다.
- `route.ts`
  - 머리말: `export const dynamic = "force-dynamic"`, `export const maxDuration = 60`
  - `GET()`: `loadForecastInputs()` → `computeForecast(inputs, DATA)` → `toForecastPayload(rows, new Date())` → `forecastCacheControl(rows)`를 거친다. 그다음 `NextResponse.json(payload, { status, headers: { "Cache-Control": cacheControl } })`로 답한다.
  - `DATA`는 리서치 JSON 넷을 import해서 만든다.
  - `refresh` 같은 쿼리는 받지 않는다. `?client=`과 `?v=`는 무시한다.
  - `ok()` 도우미는 `no-store`를 붙이므로 쓰지 않는다.

- [ ] **Step 1: 실패하는 시험을 쓴다.**

`forecast.test.ts`에 더한다:
- `"payload uses the Korean date"`
  - 입력: `toForecastPayload(rows, new Date("2026-11-08T15:30:00Z"))`
  - 기대: `date`는 `"2026-11-09"`, `asOf`는 `"2026-11-08T15:30:00.000Z"`, `schema`는 1이다.
- `"unknown fields become null with 정보 없음"`
  - 기대: `known` false인 분야는 `s` null, `label` `"정보 없음"`이다. 알려진 `s` 2(weather) 분야의 `label`은 `"맑음"`이다.
- `"payload keeps exactly the schema keys"`
  - 기대: `Object.keys(payload)`는 `["schema","asOf","date","fields","line"]`다. 각 field의 키는 `["key","title","scale","s","label","head","path"]`다.
- `forecastCacheControl`
  - 10개가 알려짐 → 200과 긴 저장
  - 7개 → 200과 `"public, s-maxage=60"`
  - 3개 → 503과 `"no-store"`

`forecast-load.test.ts`:
- `"a hanging source becomes null after the timeout, others still load"`
  - 준비: `vi.useFakeTimers()`. `hf`는 끝나지 않는 Promise, 나머지는 바로 값을 준다. `loadForecastInputs(fake, 20_000)`를 부른 뒤 `vi.advanceTimersByTimeAsync(20_000)`.
  - 기대: `hf`는 null이고 나머지는 값이다.
- `"a failing source becomes null"`
  - 준비: `fng`가 reject한다.
  - 기대: `fng`는 null이다.

- [ ] **Step 2: 실패를 확인한다.**
  - Run: `npm test`
  - Expected: 새 시험이 FAIL이다. 함수가 아직 없다.

- [ ] **Step 3: 함수 셋과 `route.ts`를 쓴다.**
  - README에 '한판 연동' 절을 짧게 더한다: 주소, 형식(`schema` 1), 저장 시간, '오늘의 한 줄' 규칙.
  - 저장소 맨 위에 `vercel.json`을 `{ "regions": ["icn1"] }`로 만든다. 팀 Vercel 프로젝트의 기본 함수 지역은 `iad1`(미국)이다. 그래서 git으로 배포될 때도 서울에서 돌게 하려면 이 파일이 있어야 한다. 11/9 첫 배포는 CLI의 `--regions icn1`로 서울에 올렸다.

- [ ] **Step 4: 통과를 확인한다.**
  - Run: `npm test && npm run lint && npm run build`
  - Expected: 모두 통과한다.

- [ ] **Step 5: 실제 서버로 확인한다.**
  - Run: `npm start`(build 결과로 운영 모드). 그다음 `curl -s -D - http://localhost:3000/api/forecast -o forecast.json`
  - Expected:
    - 상태 200이다.
    - `cache-control: public, s-maxage=1800, stale-while-revalidate=86400`이다. 일부 원본이 실패했으면 `s-maxage=60`이다.
    - `forecast.json`에 `schema` 1, `fields` 10개, `line`이 있다.
    - 응답 시간은 20초 이내다.
  - `forecast.json`은 커밋하지 않는다.

- [ ] **Step 6: 커밋한다.** 메시지: `feat: add /api/forecast for Hanpan's home trend card`

### Task 5: PR, 배포, 같은 시각 비교

**Files:** 없음 (저장소 밖 작업)

**Interfaces:**
- Consumes: Task 4의 `/api/forecast`. 그리고 배포 자리(스펙 7.11 '배포 자리'). 팀 Vercel 프로젝트와 `trend.tenai.kr`은 혁준이 연결한다.

- [ ] **Step 1: 가지를 올리고 PR을 연다.**
  - `git push -u origin feat/forecast-api`를 실행한다.
  - `gh pr create -R tenaico/tenai-trend --base master`로 PR을 연다. 제목: `기상도 API(/api/forecast) 추가: 한판 홈 트렌드 카드용`.
  - 본문에는 무엇이 바뀌는지(사이트 모습은 그대로), 형식, 저장 규칙, 시험 결과를 쓰고, 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`를 붙인다.
  - Expected: PR 주소가 나온다. 합치기는 혁준이 한다.

- [ ] **Step 2: 합쳐진 뒤 배포를 확인한다.**
  - Run: `curl -s -D - https://trend.tenai.kr/api/forecast -o /dev/null`을 두 번 실행한다.
  - Expected: 둘 다 200과 `cache-control`이 맞고, 두 번째에는 `x-vercel-cache: HIT`가 보인다.
  - `trend.tenai.kr` 연결 전이면 팀 프로젝트의 `*.vercel.app` 주소로 같은 확인을 한다.

- [ ] **Step 3: 같은 시각에 사이트와 API를 비교한다.**
  - 내장 브라우저로 `https://trend.tenai.kr/`을 열어 10줄의 날씨 말을 읽는다. 곧바로 `https://trend.tenai.kr/api/forecast?check=<지금 시각>`을 받는다. 쿼리를 붙이는 것은 CDN 저장을 비켜 가기 위해서다.
  - Expected: 10개의 `label`이 사이트와 같다. 시세 분야 하나가 다르면 1분 뒤 한 번 더 비교한다.
  - 결과 표를 PR에 댓글로 남긴다.
