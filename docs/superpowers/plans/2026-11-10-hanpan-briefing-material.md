# AI 브리핑 근거(재료) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 트렌드 레이더 기상도의 분야마다 핵심 수치·요약·기사(링크)를 싣고, 한판 0.19.3의 AI 브리핑이 그 재료를 근거로 쓰며, 재료에 없는 숫자를 걸러 내고, 문서 끝에 참고 자료를 붙인다.

**Architecture:** 두 저장소에 나눠 만든다.

- **Part A (tenai-trend):** `/api/forecast`의 분야에 선택 칸 `facts`·`points`·`news`·`materialAsOf`를 더한다. schema는 1 그대로다.
- **Part B (한판):** 받은 칸을 검사해 저장한다. 브리핑 질문은 AI 문맥 창 예산 안에서 단계별로 쌓는다. 답에 질문에 없던 숫자가 있으면 한 번 다시 묻고, 그래도 남으면 그 문장을 뺀다. 문서 끝에 참고 자료 장을 단다. 링크는 Word·PDF에서 누를 수 있게 하고, 한글·PPT·마인드맵에는 주소를 글자로 적는다.

**Tech Stack:** Next.js 15 + vitest 3 (tenai-trend). Electron + React + vitest + Playwright (한판). Word는 `docx` 라이브러리, PDF는 Chromium `printToPDF`.

**Spec:** `docs/superpowers/specs/2026-11-10-hanpan-briefing-material-design.md` (2026-11-10 승인)

## 작업 위치와 순서

- **Part A:** `C:\Users\ten\Desktop\tenai-trend`, 가지 `feat/forecast-material`(master 54da2ee에서 만든다). PR을 혁준이 합치면 trend.tenai.kr에 자동 배포된다.
- **Part B:** `C:\Users\ten\Desktop\hanpan\.claude\worktrees\briefing-material`, 가지 `feat/briefing-material`(`docs/briefing-material-spec`에서 만든다).
  - `...\worktrees\home-board-impl`은 다른 세션이 쓴다. 열지도 고치지도 않는다.
  - Part A 배포를 기다리지 않고 견본(fixture)으로 만든다.
  - 실제 응답 확인은 Task 10에서 한다.

## Global Constraints

- schema는 1 그대로다. 새 칸은 모두 선택이고, 없으면 지금과 똑같이 동작한다.
- 칸별 상한:
  - `facts`: 4개 이하. `label` 20자, `value` 40자 이하.
  - `points`: 3개 이하. 항목 하나 300자 이하. 넘는 항목은 자르지 않고 건너뛴다.
  - `news`: 3개 이하. `title` 120자, `source` 30자 이하. `date`는 YYYY-MM-DD. `url`은 `https:`만, 1,000자 이하. 조건에 맞지 않는 기사는 버린다.
  - `materialAsOf`: YYYY-MM-DD.
- 응답이 65,536바이트를 넘으면 서버가 모든 분야의 기사를 뺀다. 그래도 넘으면 요약도 모두 뺀다.
- 뉴스는 분야마다 따로 3초까지 기다린다(한판 0.19.2가 5초에 받기를 끊으므로 그보다 짧게 둔다). 실패나 시간 초과는 그 분야의 `news`만 비운다. `known`, 503, 캐시 규칙에는 영향이 없다.
- AI에게 검색을 시키지 않는다. 기사 본문은 싣지 않는다(제목·언론사·날짜·링크만).
- 다음은 바꾸지 않는다: 한판이 보내는 요청(`GET /api/forecast?client=hanpan&v=…`)과 머리글, 개인정보처리방침의 트렌드 항목, 트렌드 카드 모양.
- 질문 예산: min(창 − 1,024, ⌈창 × 0.8⌉ − 1). 문맥 창 정보가 없는 AI(구독 AI)는 예산 없이 재료를 다 넣는다.
- 질문을 쌓는 순서: ① 날씨·한 줄·오늘의 한 줄 → ② 수치 → ③ 기사 → ④ 요약. 한 단계 안에서는 분야마다 하나씩 돌아가며 넣는다.
- 숫자 검사, 다시 묻기, 문장 빼기는 한판에서만 한다(`apps/shell/src/shared`의 순수 함수). 다시 묻기는 한 번만 한다.
- 안내 문구는 정확히 이대로 쓴다: `재료로 확인되지 않은 숫자가 있던 문장 n개를 뺐습니다.`
- 한판 코드 주석은 영어로 쓴다(`npm run check:english-comments`). tenai-trend는 지금처럼 한국어 주석이다.
- 커밋 규칙:
  - 메시지는 영어로 쓴다.
  - `git -c user.email=37573099+grapevine26@users.noreply.github.com -c user.name=grapevine26 commit`으로 커밋한다.
  - 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
  - PR 본문 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`를 붙인다.

## Review Focus

1. 재료 없는 기상도(옛 서버 응답, 0.19.2가 저장한 사본): 질문의 user 글이 0.19.2와 같다. → Task 5 테스트.
2. 문맥 창 정보가 없는 AI(Claude·Codex 구독): 예산 없이 재료를 다 넣는다. → Task 9 테스트.
3. 날씨가 '자료 없음'인 분야: 그 분야의 기사와 요약은 그대로 질문에 들어간다. → Task 5 테스트.
4. 기사 주소에 `&`가 든 경우: Word 링크와 PDF용 HTML의 `href`가 깨지지 않는다. → Task 7 테스트.
5. 현황 항목이 모두 빠진 브리핑: 오늘의 한 줄로 현황을 채워서 main의 `checkBriefing`이 받고 문서가 열린다. → Task 6 테스트.

---

## Part A — 트렌드 레이더 (tenai-trend)

명령은 저장소 뿌리에서 실행한다.

- 파일 하나: `npx vitest run <파일>`
- 전체 테스트: `npm test`
- 타입 검사: `npm run build`
- 린트: `npm run lint`

### Task 1: 분야별 핵심 수치(facts)

**Files:**

- Modify: `src/lib/forecast.ts` (`Calc`, `ForecastRow`, `computeForecast`, `ForecastPayload`, `toForecastPayload`)
- Create: `src/lib/test-quotes.ts` (`forecast.test.ts`의 `quote()` 도우미를 옮긴다. Task 3에서도 쓴다.)
- Test: `src/lib/forecast.test.ts`

**Interfaces:**

- Produces:
  - `export type Fact = { label: string; value: string }`
  - `ForecastRow.facts: Fact[]`
  - 응답 분야의 `facts?: Fact[]`. 빈 배열이면 칸을 두지 않는다.
  - `export function quote(symbol: string, over?: Partial<Quote>): Quote`

facts는 지금 `head`를 만드는 입력과 같은 값에서 뽑는다. 숫자가 null이면 그 fact는 넣지 않는다.

| 분야          | label → value                                                                                                                                                                                 | 넣는 조건                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ai            | `AI 관련주 1개월 평균` → ret1m 평균 `${fmtSigned(v, 1)}%`                                                                                                                                     | `q.ai`에 ret1m이 있는 종목이 있을 때            |
| opensource    | `허깅페이스 트렌딩 1위` → 모델 이름(id의 `/` 뒤)<br>`최근 7일 신규(상위 60개 중)` → `${fresh}개`                                                                                              | 모델이 1개 이상일 때                            |
| local-ai      | `GGUF 트렌딩` → `${n}개`<br>`${PC_GB}GB 안에서 실행` → `${pc.length}개`<br>`PC급 1위` → 모델 이름                                                                                             | `loc`이 있을 때(PC급 1위는 `locBest`가 있을 때) |
| ai-safety     | 게이지 4개 각각: `g.label` → `signalLabel(g.s, "weather")`                                                                                                                                    | 항상                                            |
| stocks        | `코스피` → `${fmt(price,0)} (${fmtSigned(changePct)}%)`<br>`코스피 1개월` → `${fmtSigned(ret1m,1)}%`<br>`S&P 500` → 코스피와 같은 꼴                                                          | `ks`가 있을 때(S&P 500은 `sp`가 있을 때)        |
| economy       | `실질 GDP 성장률` → `${fmt(v,1)}% (${t})`<br>`소비자물가 상승률` → 같은 꼴<br>`경상수지` → `${fmt(v,1)}억달러 (${t})`                                                                         | 시리즈마다 값이 있을 때                         |
| semiconductor | `한국 반도체 수출` → `${fmt(value,0)}${unit} (${month}, 전년 대비 ${fmtSigned(yoyPct,1)}%)`                                                                                                   | 항상                                            |
| realestate    | `서울 아파트 매매 전월 대비` → `${fmtSigned(mom,2)}% (${t}, KB)`<br>`서울 아파트 매매 1년` → `${fmtSigned(yoy,1)}%`<br>`전국 아파트 매매 전월 대비` → `${fmtSigned(mom,2)}%`                  | `seoulApt`가 있을 때                            |
| fx            | `원/달러` → `${fmt(price,1)}원 (${fmtSigned(change,1)}원)`<br>`원/달러 1개월` → `${fmtSigned(ret1m,1)}%`<br>`원/달러 연초 대비` → `${fmtSigned(retYtd,1)}%`<br>`달러 인덱스` → `fmt(price,1)` | `fx`가 있을 때(달러 인덱스는 `dxy`가 있을 때)   |
| crypto        | `비트코인` → `$${fmt(price,0)} (${fmtSigned(changePct)}%)`<br>`비트코인 1개월` → `${fmtSigned(ret1m,1)}%`<br>`공포·탐욕 지수` → `${v}`                                                        | `btc`가 있을 때(지수는 `fng`가 있을 때)         |

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
it('splits the stocks head into facts', () => {
  const rows = computeForecast(
    {
      ...allNull,
      quotes: {
        ...allNull.quotes,
        korea: [quote('^KS11', { price: 5019, changePct: -6.78, ret1m: -26.2 })],
        global: [quote('^GSPC', { price: 6000, changePct: 0.5 })],
      },
    },
    data,
  )
  expect(rows.find((r) => r.key === 'stocks')!.facts).toEqual([
    { label: '코스피', value: '5,019 (-6.78%)' },
    { label: '코스피 1개월', value: '-26.2%' },
    { label: 'S&P 500', value: '6,000 (+0.50%)' },
  ])
})
it('gives no facts to a field whose inputs are missing', () => {
  const rows = computeForecast(allNull, data)
  for (const key of [
    'ai',
    'opensource',
    'local-ai',
    'stocks',
    'economy',
    'realestate',
    'fx',
    'crypto',
  ])
    expect(rows.find((r) => r.key === key)!.facts).toEqual([])
  expect(rows.find((r) => r.key === 'ai-safety')!.facts).toHaveLength(4)
})
it('keeps at most 4 facts per field, labels within 20 and values within 40 characters', () => {
  // FULL: quote로 korea·global·macro(KRW=X, DX-Y.NYB)·crypto(BTC-USD)·ai를 채우고, hf 모델 1개, fng, ecos 5개 시리즈를 넣은 입력
  for (const r of computeForecast(FULL, data)) {
    expect(r.facts.length).toBeLessThanOrEqual(4)
    for (const f of r.facts)
      expect([[...f.label].length <= 20, [...f.value].length <= 40]).toEqual([true, true])
  }
})
it('adds facts to the payload only where a field has some', () => {
  const p = toForecastPayload(computeForecast(allNull, data), new Date())
  expect(p.fields.find((f) => f.key === 'stocks')).not.toHaveProperty('facts')
  expect(p.fields.find((f) => f.key === 'ai-safety')!.facts).toHaveLength(4)
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

`npx vitest run src/lib/forecast.test.ts` → 기대: 새 테스트 4개가 실패하고(facts가 없음), 기존 테스트는 통과한다.

- [ ] **Step 3: 구현한다**

`Calc`에 `facts: Fact[]`를 더하고, 분야마다 `head`를 만드는 같은 값으로 채운다. `toForecastPayload`는 facts가 있을 때만 칸을 둔다. `quote()`를 `src/lib/test-quotes.ts`로 옮기고 `forecast.test.ts`가 거기서 가져다 쓰게 한다.

- [ ] **Step 4: 통과를 확인한다**

`npx vitest run src/lib/forecast.test.ts` → 기대: 모두 통과.

- [ ] **Step 5: 커밋한다** — `feat(forecast): split each field's figures into facts`

### Task 2: 요약(points)과 기사(news) 재료

**Files:**

- Create: `src/lib/news-queries.ts`, `src/lib/forecast-material.ts`
- Modify: `src/lib/forecast.ts` (`ForecastPayload` 분야에 `points?: string[]`, `news?: NewsRef[]`, `materialAsOf?: string`을 더한다)
- Test: `src/lib/forecast-material.test.ts`

**Interfaces:**

- Consumes: `FieldKey`, `ForecastData`, `ForecastPayload`(forecast.ts), `NewsItem`(news.ts)
- Produces:
  - `export const FIELD_NEWS_QUERY: Record<FieldKey, string>`
    - 값은 스펙 5.2 표 그대로다.
    - `local-ai`는 `'"온디바이스 AI" OR "로컬 LLM"'`이다(11/10에 기사 3건 나오는 것 확인).
    - `ai-safety`는 `'"AI 보안" OR "AI 윤리" OR "AI 기본법"'`이다.
  - `export const MATERIAL_MAX = { points: 3, pointChars: 300, news: 3, titleChars: 120, sourceChars: 30, urlChars: 1000 } as const`
  - `export const NEWS_TIMEOUT_MS = 5_000`
  - `export const PAYLOAD_MAX_BYTES = 65_536`
  - `export type NewsRef = { title: string; source: string; date: string; url: string }`. `Fact`와 같이 `forecast.ts`에 두고, `forecast-material.ts`는 가져다 쓴다(서로 가져오는 일이 없게).
  - `export type MaterialData = ForecastData & { fx: typeof fxJson; realestate: typeof realestateJson; crypto: typeof cryptoJson }`
  - `export function fieldPoints(data: MaterialData): Partial<Record<FieldKey, { points: string[]; asOf: string }>>`
  - `export async function fieldNews(get: (q: string, limit: number) => Promise<NewsItem[]>, timeoutMs?: number): Promise<Partial<Record<FieldKey, NewsRef[]>>>`
  - `export function withMaterial(payload: ForecastPayload, points: ReturnType<typeof fieldPoints>, news: Partial<Record<FieldKey, NewsRef[]>>): ForecastPayload`

규칙:

`fieldPoints`

- 분야별 출처:

| 분야          | 요약을 읽는 곳                |
| ------------- | ----------------------------- |
| ai            | `ai.overview.summary`         |
| ai-safety     | `safety.overview.summary`     |
| economy       | `macro.economy.summary`       |
| stocks        | `macro.market.summary`        |
| semiconductor | `semi.overview.summary`       |
| fx            | `fx.overview.summary`         |
| realestate    | `realestate.overview.summary` |
| crypto        | `crypto.overview.summary`     |

- `Array.from` 길이로 300자를 넘는 항목은 건너뛰고, 앞에서 3개를 담는다.
- `asOf`는 파일 맨 위의 `asOf`다.

`fieldNews`

- 분야마다 `get(FIELD_NEWS_QUERY[key], 3)`을 동시에 부르고, 각 요청을 `timeoutMs`와 경주시킨다. 실패하거나 시간이 넘은 분야는 빼고 끝낸다. 오류를 밖으로 던지지 않는다.
- `title`·`source`가 상한을 넘으면 앞 (max−1)자에 `…`를 붙인다.
- `date`는 `pubDate`(ISO)를 한국 날짜로 바꾼다. 날짜가 읽히지 않으면 그 기사를 버린다.
- `url`은 `link`가 `https://`로 시작하고 1,000자 이하일 때만 쓴다. 아니면 그 기사를 버린다.

`withMaterial`

- 분야에 요약이 있으면 `points`와 `materialAsOf`를, 기사가 있으면 `news`를 더한다. 빈 것은 칸을 두지 않는다.
- `Buffer.byteLength(JSON.stringify(p))`가 `PAYLOAD_MAX_BYTES`를 넘으면 모든 분야에서 `news`를 뺀다. 그래도 넘으면 `points`와 `materialAsOf`도 뺀다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

견본(Task 3도 쓴다):

- `mdata`: 자료 JSON 7개 `{ ai, safety, macro, semi, fx, realestate, crypto }`
- `ARTICLE`: https 링크가 있는 `NewsItem` 하나

```ts
it("takes the first three summary items of each field's research file", () => {
  const p = fieldPoints(mdata)
  expect(p.fx).toEqual({ points: fx.overview.summary.slice(0, 3), asOf: fx.asOf })
  expect(p.stocks!.points[0]).toBe(macro.market.summary[0])
  expect(p.economy!.points[0]).toBe(macro.economy.summary[0])
  expect([p.opensource, p['local-ai']]).toEqual([undefined, undefined])
})
it('skips a summary item over 300 characters instead of cutting it', () => {
  const long = { ...fx, overview: { ...fx.overview, summary: ['가'.repeat(301), 'a', 'b', 'c'] } }
  expect(fieldPoints({ ...mdata, fx: long }).fx!.points).toEqual(['a', 'b', 'c'])
})
it('asks the shared query for three articles per field and keeps short https links only', async () => {
  const get = vi.fn(async () => [
    {
      title: '코스피 5000선 위태',
      link: 'https://news.google.com/rss/articles/a',
      source: '연합뉴스',
      date: '2026-11-09T16:30:00.000Z',
    },
    { title: 'http', link: 'http://example.com/b', source: 'x', date: '2026-11-09T00:00:00.000Z' },
    {
      title: '긴 주소',
      link: 'https://e.com/' + 'a'.repeat(1000),
      source: 'x',
      date: '2026-11-09T00:00:00.000Z',
    },
  ])
  const news = await fieldNews(get)
  expect(get).toHaveBeenCalledTimes(10)
  expect(get).toHaveBeenCalledWith('코스피 증시 마감', 3)
  expect(news.stocks).toEqual([
    {
      title: '코스피 5000선 위태',
      source: '연합뉴스',
      date: '2026-11-10',
      url: 'https://news.google.com/rss/articles/a',
    },
  ])
})
it('leaves only a failing or slow field without news', async () => {
  const get = (q: string) =>
    q === FIELD_NEWS_QUERY.stocks
      ? Promise.reject(new Error('rss'))
      : q === FIELD_NEWS_QUERY.crypto
        ? new Promise<never>(() => {})
        : Promise.resolve([ARTICLE])
  const news = await fieldNews(get, 20)
  expect([news.stocks, news.crypto, news.fx?.length]).toEqual([undefined, undefined, 1])
})
it('adds material only where a field has some, keeping schema 1 and every old key', () => {
  /* toForecastPayload 결과와 비교: 옛 칸 값이 같고, points 없는 opensource에는 points·materialAsOf가 없다 */
})
it("drops every field's news, then the points, when the answer passes 64KB", () => {
  // 기사 주소 900자 × 3 × 10분야로 64KB를 넘긴다 → news 없음, points 있음
  // 거기에 요약 300자 × 3 × 10분야 × 10배 크기를 더한다 → points·materialAsOf도 없음
})
```

- [ ] **Step 2:** `npx vitest run src/lib/forecast-material.test.ts` → 기대: 실패(모듈이 없음).
- [ ] **Step 3:** 위 규칙대로 두 모듈을 구현한다.
- [ ] **Step 4:** 같은 명령 → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(forecast): add summary points and news articles as material`

### Task 3: 응답에 재료를 싣고, 검색어를 한곳에서 쓰고, PR을 연다

**Files:**

- Create: `src/lib/forecast-response.ts`, `src/lib/forecast-response.test.ts`
- Modify:
  - `src/app/api/forecast/route.ts`
  - `src/app/{ai,ai-safety,crypto,economy,fx,opensource,realestate,semiconductor,stocks}/view.tsx`
  - `README.md`('한판 연동' 절)

**Interfaces:**

- Consumes: Task 1·2의 모든 것, `loadForecastInputs`, `getNews`
- Produces: `export async function forecastResponse(deps: { load: () => Promise<ForecastInputs>; news: (q: string, limit: number) => Promise<NewsItem[]>; data: MaterialData; now: Date }): Promise<{ body: ForecastPayload; status: 200 | 503; cacheControl: string }>`
  - `load()`와 `fieldNews(news)`를 동시에 기다린다.
  - 상태와 캐시는 `forecastCacheControl(rows)`를 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`SEVEN_KNOWN`은 `quote`로 korea `^KS11`, macro `KRW=X`, crypto `BTC-USD`, ai `MSFT`를 채우고 hf 모델 1개를 넣은 입력이다. 알려진 분야가 7개이므로 200이고 `s-maxage=60`이다.

```ts
it('answers with the material when news works', async () => {
  const r = await forecastResponse({
    load: async () => SEVEN_KNOWN,
    news: async () => [ARTICLE],
    data: mdata,
    now: NOW,
  })
  expect(r.status).toBe(200)
  expect(r.body.fields.find((f) => f.key === 'stocks')!.news).toHaveLength(1)
})
it('keeps the status and cache when every news request fails', async () => {
  const ok = await forecastResponse({
    load: async () => SEVEN_KNOWN,
    news: async () => [ARTICLE],
    data: mdata,
    now: NOW,
  })
  const down = await forecastResponse({
    load: async () => SEVEN_KNOWN,
    news: async () => {
      throw new Error('rss down')
    },
    data: mdata,
    now: NOW,
  })
  expect([down.status, down.cacheControl]).toEqual([ok.status, ok.cacheControl])
  expect(down.body.fields.some((f) => 'news' in f)).toBe(false)
  expect(down.body.fields.find((f) => f.key === 'fx')!.points).toHaveLength(3)
})
```

- [ ] **Step 2:** `npx vitest run src/lib/forecast-response.test.ts` → 기대: 실패.
- [ ] **Step 3: 구현한다**
  - route의 `GET`을 `forecastResponse({ load: loadForecastInputs, news: getNews, data: { ai, safety, macro, semi, fx, realestate, crypto }, now: new Date() })`로 바꾸고, 결과를 `NextResponse.json(body, { status, headers: { "Cache-Control": cacheControl } })`로 보낸다.
  - 화면들의 기본 검색어를 `FIELD_NEWS_QUERY`에서 가져온다. 다음 검색어는 그대로 둔다: ai의 회사별 `company.newsQuery`, 부동산의 빌라·토지 탭, AI 보안·윤리의 security·ethics 탭.
  - README '한판 연동'에 새 칸, 상한, 64KB 규칙을 적는다.
- [ ] **Step 4: 전체를 확인한다**
  - `npm test` → 기대: 모두 통과.
  - `npm run build` → 기대: 성공.
  - `npm run lint` → 기대: 오류 0.
- [ ] **Step 5: 로컬 서버로 확인한다**
  - 빌드 뒤 `npm start`를 하네스의 서버 도구로 띄운다.
  - `/api/forecast` 응답을 받아 분야마다 facts·points·news 개수와 전체 바이트를 출력한다.
  - 기대: points는 8개 분야에 3개씩, news는 대부분 분야에 1~3개, 전체 30KB 이하.
  - 확인 뒤 서버를 끈다.
- [ ] **Step 6: 커밋하고 PR을 연다**
  - 커밋: `feat(forecast): ship facts, points and news in /api/forecast`
  - push 뒤 `gh pr create --repo tenaico/tenai-trend`. 본문에 실측 크기를 적는다.
  - 합치는 것은 혁준이다. 합치면 바로 운영에 배포된다.
- [ ] **Step 7: 합친 뒤 확인한다**
  - `https://trend.tenai.kr/api/forecast`에서 Step 5와 같은 개수가 나오는지 본다.
  - 한판 main의 `parseTrendForecast`로 같은 응답을 읽으면 분야 10개가 나오는지 본다. 옛 한판이 새 칸을 버리고 카드를 그대로 그리는지 확인하는 것이다.

---

## Part B — 한판

명령:

- 테스트: `npm test -w apps/shell -- <파일 이름 일부>`, `npm test -w @genoffice/hanpan-core -- <파일 이름 일부>`
- 검사: `npm run typecheck -w apps/shell`, `npm run lint`, `npm run check:english-comments`, `npm run format:check`

### Task 4: 기상도 재료를 받아 검사하고 잇는다

**Files:**

- Modify: `apps/shell/src/shared/trend-forecast.ts`
- Test: `apps/shell/tests/trend-forecast.test.ts`

**Interfaces:**

- Produces:
  - `export interface TrendFact { label: string; value: string }`
  - `export interface TrendNews { title: string; source: string; date: string; url: string }`
  - `TrendField`에 `facts?: TrendFact[]; points?: string[]; news?: TrendNews[]; materialAsOf?: string`를 더한다.
  - `export const TREND_MATERIAL_MAX = { facts: 4, factLabel: 20, factValue: 40, points: 3, pointChars: 300, news: 3, newsTitle: 120, newsSource: 30, urlChars: 1000 } as const`

규칙:

- 배열은 먼저 `slice(0, 상한)`으로 자르고, 그다음 틀린 것을 버린다.
- 글자는 `cutText`로 자른다. 다만 points는 자르지 않는다. 300자를 넘는 항목은 버린다.
- 다음 중 하나라도 해당하는 기사는 버린다: `title`이 비었다, `date`가 YYYY-MM-DD가 아니다, `url`이 1,000자를 넘는다, `new URL(url).protocol !== 'https:'`이다(`new URL`이 던져도 버린다).
- 남은 것이 없으면 칸을 두지 않는다.
- 칸의 모양이 틀리면(배열이 아니거나 하면) 그 칸만 버리고 분야는 살린다.
- `mergeTrendForecast`가 이전 값을 이어 쓸 때는 재료 네 칸도 이전 분야의 것으로 바꾼다. 새 응답의 재료는 버린다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`withField(over)`는 주식 분야 하나에 `over`를 더한 응답이다.

```ts
it('reads facts, points, news and materialAsOf within their limits', () => {
  const f = parseTrendForecast(
    withField({
      facts: [F, F, F, F, F],
      points: ['가'.repeat(301), 'p'],
      news: [
        N,
        { ...N, url: 'http://x.kr/a' },
        { ...N, url: 'https://x.kr/' + 'a'.repeat(1000) },
        N,
      ],
      materialAsOf: '2026-10-30',
    }),
  )!.fields[0]!
  expect([f.facts?.length, f.points, f.news, f.materialAsOf]).toEqual([4, ['p'], [N], '2026-10-30'])
})
it('cuts a long fact label and article title with an ellipsis', () => {
  /* label 25자 → 20자이고 '…'로 끝남, title 130자 → 120자 */
})
it('reads a field without material exactly as before', () => {
  expect(parseTrendForecast(withField({}))!.fields[0]).toEqual(PARSED_STOCKS) // 재료 칸이 하나도 없다
})
it('drops a material value of the wrong shape and keeps the field', () => {
  const f = parseTrendForecast(
    withField({ facts: 'x', news: [{ title: 1 }], materialAsOf: '10/30' }),
  )!.fields[0]!
  expect(Object.keys(f)).toEqual(Object.keys(PARSED_STOCKS))
})
it('carries the earlier material with a carried field (R24)', () => {
  const merged = mergeTrendForecast(
    freshUnknown({ news: [N2] }),
    storedKnown({ facts: [F], news: [N] }),
  )
  expect(merged.fields[0]).toMatchObject({ facts: [F], news: [N] })
  expect(merged.fields[0]!.news).not.toContainEqual(N2)
})
it('keeps the new material on a field the new answer knows', () => {
  /* 새 응답이 아는 분야는 새 재료 */
})
```

- [ ] **Step 2:** `npm test -w apps/shell -- trend-forecast` → 기대: 새 테스트가 실패한다.
- [ ] **Step 3:** 위 규칙대로 `readField`와 `mergeTrendForecast`에 재료를 더한다.
- [ ] **Step 4:** 같은 명령 → 기대: 통과. 그리고 `npm test -w apps/shell -- trend-service` → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(trend): read the forecast's facts, points and news`

### Task 5: 브리핑 질문 — 재료, 기사 번호, 예산

**Files:**

- Modify: `apps/shell/src/shared/trend-briefing.ts`
- Test: `apps/shell/tests/trend-briefing.test.ts`

**Interfaces:**

- Consumes: Task 4의 형식
- Produces:
  - `export interface BriefingArticle { n: number; title: string; source: string; date: string; url: string }`
  - `export function briefingArticles(forecast: TrendForecast): BriefingArticle[]`
    - 번호는 1부터, 기상도의 분야 순서 → 분야 안 기사 순서로 매긴다.
    - 예산과 상관없이 늘 같은 번호다. main이 같은 번호를 다시 계산하기 때문이다.
  - `export interface BriefingBudget { tokens: number; estimate(system: string, user: string): number }`
  - `export interface BriefingPrompt { system: string; user: string; articles: number[] }`. `articles`는 질문에 실제로 넣은 기사 번호다.
  - `briefingPrompt(forecast: TrendForecast, budget?: BriefingBudget): BriefingPrompt`. 이름은 그대로 두고, 돌려주는 값에 `articles`를 더한다.
  - `export const BRIEFING_ANSWER_TOKENS = 1024`
  - `export const BRIEFING_WARNING_RATIO = 0.8`
  - `export function briefingBudget(contextTokens: number): number`
    - `Math.min(contextTokens - BRIEFING_ANSWER_TOKENS, Math.ceil(contextTokens * BRIEFING_WARNING_RATIO) - 1)`

질문 모양(분야 줄은 지금과 같고, 넣은 재료만 그 아래에 붙인다):

```
- 주식: 폭풍우 — 코스피 5,019 (-6.78%), 1개월 -26.2%
  수치: 코스피 5,019 (-6.78%); 코스피 1개월 -26.2%
  [1] 2026-11-09 코스피 5000선 위태…외국인 매도 지속 — 연합뉴스
  요약(2026-10-30 기준): 외국인 순매도가 9거래일째 이어졌다.
```

- 날씨가 '자료 없음'인 분야에도 재료를 붙인다.
- 쌓는 방법:
  1. 후보 순서는 ② 수치 → ③ 기사 → ④ 요약이다.
  2. 한 단계 안에서는 "모든 분야의 첫째 항목(분야 순서) → 둘째 항목 → …" 순서로 하나씩 더한다.
  3. 하나 더할 때마다 전체 질문을 다시 만들고, `budget.estimate(system, user)`가 `budget.tokens`를 넘으면 그 후보를 빼고 멈춘다.
  4. 예산이 없으면 모두 넣는다.
  5. ①만으로 예산을 넘어도 ①은 보낸다.
- `BRIEFING_SYSTEM`의 첫 줄 둘째 문장과 규칙 줄을 이 글로 바꾼다:
  - `사용자가 보낸 오늘의 트렌드 기상도와 그 아래 재료(수치, 기사 제목, 요약)만 근거로 삼아 브리핑을 작성합니다.`
  - `규칙: 숫자는 기상도와 재료에 있는 값만 그대로 인용하고, 없는 사실은 만들지 않습니다. 기사를 근거로 쓴 문장 끝에는 그 기사 번호를 [1]처럼 붙이고, 기사 제목에 없는 내용은 지어내지 않습니다. 투자 권유 표현은 쓰지 않습니다.`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

견본(Task 6·7·9도 쓴다):

- `withMaterial`: 기존 견본 `forecast`의 주식과 환율에 재료를 붙인 것.
  - 주식: 수치 `코스피 5,019 (-6.78%)`, `코스피 1개월 -26.2%`. 기사 S1(연합뉴스, 2026-11-09), S2. 요약 `외국인 순매도가 9거래일째 이어졌다.`
  - 환율: 기사 F1(한국경제, 2026-11-08).
  - 두 분야 모두 `materialAsOf`는 2026-10-30이다.
- `withoutMaterial(f)`: 같은 기상도에서 재료 칸을 모두 뺀 것.
- `bigMaterial`: 분야 10개 모두에 수치 4개, 기사 3개(제목 40자), 요약 3개(200자)를 붙인 견본.
- `estimate`: `(s, u) => estimatePromptTokens(s, [{ role: 'user', text: u }], [])` (`@genoffice/agent-core`).

```ts
it('numbers the articles across fields in forecast order', () => {
  expect(briefingArticles(withMaterial).map((a) => [a.n, a.title])).toEqual([
    [1, 'S1'],
    [2, 'S2'],
    [3, 'F1'],
  ])
})
it('puts every fact, article and point under its field without a budget', () => {
  const p = briefingPrompt(withMaterial)
  expect(p.user).toContain('\n  수치: 코스피 5,019 (-6.78%); 코스피 1개월 -26.2%\n')
  expect(p.user).toContain('\n  [1] 2026-11-09 S1 — 연합뉴스\n')
  expect(p.user).toContain('\n  요약(2026-10-30 기준): 외국인 순매도가 9거래일째 이어졌다.')
  expect(p.articles).toEqual([1, 2, 3])
})
it('asks the 0.19.2 user text for a forecast without material', () => {
  expect(briefingPrompt(forecast).user).toBe(USER_0192) // 기존 견본에 0.19.2 코드가 만든 글을 그대로 적어 둔다
})
it('adds material to a field whose weather is unknown', () => {
  /* s: null인 분야의 기사 줄이 user에 있다 */
})
it('stays under the confirm line of a 4,096-token local model, with articles before points', () => {
  const p = briefingPrompt(bigMaterial, { tokens: briefingBudget(4096), estimate })
  expect(estimate(p.system, p.user)).toBeLessThanOrEqual(3072)
  expect(p.articles).toHaveLength(30)
  expect(p.user.match(/요약\(/g)?.length ?? 0).toBeLessThan(30)
})
it('sends the bare forecast when even that passes the budget', () => {
  const p = briefingPrompt(withMaterial, { tokens: 10, estimate })
  expect([p.user, p.articles]).toEqual([briefingPrompt(withoutMaterial(withMaterial)).user, []])
})
it("sizes the budget from the context window with agent-core's warning line", () => {
  expect([4096, 8192, 32768].map(briefingBudget)).toEqual([3072, 6553, 26214])
  expect(BRIEFING_WARNING_RATIO).toBe(CONTEXT_WARNING_RATIO)
})
```

- [ ] **Step 2:** `npm test -w apps/shell -- trend-briefing` → 기대: 새 테스트가 실패한다.
- [ ] **Step 3:** 위 규칙대로 구현한다.
- [ ] **Step 4:** 같은 명령 → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(briefing): ground the question in the forecast material within the AI's window`

### Task 6: 숫자 검사와 한 번 다시 묻기

**Files:**

- Create: `apps/shell/src/shared/briefing-numbers.ts`, `apps/shell/src/shared/briefing-run.ts`
- Test: `apps/shell/tests/briefing-numbers.test.ts`, `apps/shell/tests/briefing-run.test.ts`

**Interfaces:**

- Consumes: `briefingPrompt`, `BriefingPrompt`, `BriefingBudget`, `parseBriefing`, `checkBriefing`, `TrendBriefing` (Task 5)
- Produces:
  - `export function allowedNumbers(user: string, date: string): Set<string>`
  - `export function unknownNumbers(brief: TrendBriefing, allowed: Set<string>, date: string): string[]`
    - 처음 나온 순서로, 브리핑에 쓰인 모양 그대로, 중복 없이 돌려준다.
  - `export function dropUnknownNumbers(brief: TrendBriefing, allowed: Set<string>, date: string, line: string): { brief: TrendBriefing; dropped: number }`
  - `export function keepCitations(brief: TrendBriefing, articles: readonly number[]): TrendBriefing`
    - 목록에 없는 번호의 `[n]`을 그 앞 공백 하나와 함께 지운다.
  - `export function briefingFixPrompt(prompt: BriefingPrompt, answer: string, unknown: readonly string[]): { system: string; user: string }`
  - `export type BriefingTurn = { ok: true; text: string } | { ok: false; error: string }`
  - `export type GroundedBriefing = { ok: true; brief: TrendBriefing; dropped: number } | { ok: false; error: string }`
  - `export async function groundedBriefing(forecast: TrendForecast, ask: (prompt: { system: string; user: string }) => Promise<BriefingTurn>, budget?: BriefingBudget): Promise<GroundedBriefing>`

숫자 규칙(스펙 5.5의 세부를 이렇게 정한다):

1. `[n]`(`/\[\d{1,3}\]/g`)을 지운다.
2. 면제 구간을 지운다: `/(?<!\d)(?:1[0-2]|[1-9])(?:\s*[~∼\-–]\s*(?:1[0-2]|[1-9]))?\s*(?:개월|분기|가지|월|주|일|개|위)/g`.
3. 숫자 덩어리를 찾는다: `/[+\-−]?\d[\d,]*(?:\.\d+)?%?/g`. 덩어리 바로 앞이나 뒤가 영문자면 숫자로 보지 않는다(HBM3E, H100, GPT-5).
4. 비교할 모양으로 바꾼다: 부호(+, -, −), 쉼표, 끝의 %를 떼고, 정수부 앞의 0을 뗀다(`05` → `5`).
   - 스펙은 `+`만 떼라고 했지만, 여기서는 부호를 모두 뗀다. "6.78% 하락"처럼 맞는 문장을 지우지 않으려는 것이다. 대신 부호가 틀린 숫자는 잡지 못한다.
5. 기상도 날짜의 연·월·일(같은 모양으로 바꾼 값)은 늘 허용한다.

빼기:

- 모르는 숫자가 든 현황·전망·체크포인트 항목을 뺀다.
- 헤드라인에 모르는 숫자가 있으면 헤드라인을 `line`으로 바꾼다.
- `dropped` = 뺀 항목 수 + (헤드라인을 바꿨으면 1).
- 현황이 비면 `[line]`으로 채운다. main의 `checkBriefing`은 현황 없는 브리핑을 받지 않기 때문이다.

다시 묻는 질문(system은 `prompt.system` 그대로, user는 정확히 이 글):

```
{prompt.user}

앞선 답:
{answer}

앞선 답에 재료에 없는 숫자가 있습니다: {unknown.join(', ')}
재료에 있는 값으로 고치거나 그 문장을 빼고, 같은 JSON 형식으로 다시 쓰세요.
```

`groundedBriefing`의 흐름:

1. `briefingPrompt`로 질문을 만들어 묻는다.
2. 첫 답이 실패하면 `{ ok: false, error }`, 해석되지 않으면 `{ ok: false, error: '' }`를 돌려준다.
3. 첫 답에 `keepCitations`를 적용한다.
4. 모르는 숫자가 없으면 그대로 끝낸다(`dropped` 0).
5. 예산이 있고 다시 묻는 질문이 예산을 넘으면, 다시 묻지 않고 7로 간다.
6. 다시 묻는다. 둘째 답이 실패하거나 해석되지 않으면 첫 답을 쓴다.
7. 쓰는 답에 `keepCitations`를 적용하고, `dropUnknownNumbers`를 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// briefing-numbers.test.ts — LINE은 숫자가 없는 오늘의 한 줄
const D = '2026-11-10'
const allowed = allowedNumbers('- 주식: 폭풍우 — 코스피 5,019 (-6.78%), 1개월 -26.2%\n  수치: 원/달러 1,334.3원 (+2.1원)', D)
const brief = (over: Partial<TrendBriefing>) => ({ headline: '맑음', summary: ['맑음'], outlook: [], watch: [], ...over })
it('reads 5019, 6.78% falling, 26.2% and 1,334.3원 as values in the question', () => {
  expect(unknownNumbers(brief({ headline: '코스피 5019, 6.78% 하락, 1개월 26.2%↓, 환율 1,334.3원' }), allowed, D)).toEqual([])
})
it('does not check the date, 3개월, 1~3개월, 2분기 or [2]', () => {
  expect(unknownNumbers(brief({ headline: '2026년 11월 10일 기준 1~3개월, 3개월, 2분기 전망 [2]' }), allowed, D)).toEqual([])
})
it('does not read digits inside Latin words', () => {
  expect(unknownNumbers(brief({ headline: 'HBM3E와 H100, GPT-5 수요' }), allowed, D)).toEqual([])
})
it('finds a number the question did not carry, as the briefing wrote it', () => {
  expect(unknownNumbers(brief({ headline: '코스피 5,100선', summary: ['환율 1,400원', '코스피 5,100선'] }), allowed, D)).toEqual(['5,100', '1,400'])
})
it('drops the items with an unknown number and replaces the headline, counting both', () => {
  const r = dropUnknownNumbers(brief({ headline: '코스피 5,100선', summary: ['코스피 5,019', '환율 1,400원'], outlook: ['전망 7%'] }), allowed, D, LINE)
  expect(r).toEqual({ brief: { headline: LINE, summary: ['코스피 5,019'], outlook: [], watch: [] }, dropped: 3 })
})
it('fills an emptied summary with the line so the briefing still opens', () => {
  const r = dropUnknownNumbers(brief({ summary: ['환율 1,400원'] }), allowed, D, LINE)
  expect(r.brief.summary).toEqual([LINE])
  expect(checkBriefing(r.brief)).not.toBeNull()
})

// briefing-run.test.ts — withMaterial(Task 5 견본)의 기사 번호는 [1, 2, 3]
const RIGHT = JSON.stringify({ headline: '코스피가 폭풍우입니다', summary: ['코스피 5,019 [1]'], outlook: [], watch: [] })
const WRONG = JSON.stringify({ headline: '코스피가 폭풍우입니다', summary: ['코스피 5,019 [1]', '코스피 5,100선 [9]'], outlook: [], watch: [] })
it('asks once when every number is in the question', ...)  // 질문 1번, dropped 0
it('asks again with the numbers to fix and takes the corrected answer', async () => {
  const ask = vi.fn().mockResolvedValueOnce({ ok: true, text: WRONG }).mockResolvedValueOnce({ ok: true, text: RIGHT })
  const r = await groundedBriefing(withMaterial, ask)
  expect(ask).toHaveBeenCalledTimes(2)
  expect(ask.mock.calls[1]![0].user).toContain('앞선 답에 재료에 없는 숫자가 있습니다: 5,100')
  expect(r).toEqual({ ok: true, brief: JSON.parse(RIGHT), dropped: 0 })
})
it('drops what is still wrong after the second answer and counts it', ...)  // WRONG 두 번 → summary ['코스피 5,019 [1]'], dropped 1
it('does not ask again when the second question would pass the budget', ...)  // estimate: u에 '앞선 답'이 있으면 Infinity → 질문 1번, dropped 1
it('uses the first answer when the second question fails', ...)  // 둘째 { ok: false, error: 'x' } → dropped 1
it('removes a citation to an article the question did not carry', ...)  // 결과 글에 '[9]'가 없다
it('passes the AI error through when the first answer fails', ...)  // { ok: false, error: '연결 끊김' } 그대로
```

- [ ] **Step 2:** `npm test -w apps/shell -- briefing-` → 기대: 실패(모듈이 없음).
- [ ] **Step 3:** 위 규칙과 흐름대로 구현한다.
- [ ] **Step 4:** 같은 명령 → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(briefing): check the briefing's numbers against the question and ask once more`

### Task 7: 참고 자료 장, 링크, 안내 문구

**Files:**

- Modify (hanpan-core): `packages/hanpan-core/src/blocks.ts`(`item`에 `href?: string | undefined`를 더한다), `docx-writer.ts`, `html-writer.ts`, `hwp-writer.ts`
- Modify (shell):
  - `apps/shell/src/shared/trend-briefing.ts`: `BriefingBlock`의 item에 `href?: string`을 더하고, `citedArticles`, `briefingDropped`를 만들고, `briefingBlocks`·`briefingMarkdown`이 `dropped`를 받게 한다.
  - `apps/shell/src/main/hanpan/setup.ts`: `openBriefing`
  - `apps/shell/src/preload/index.ts`: 요청 형식에 `dropped?: number`를 더한다.
- Test: `packages/hanpan-core/tests/docx-writer-layout.test.ts`, `html-writer.test.ts`, `hwp-writer.test.ts`, `apps/shell/tests/trend-briefing.test.ts`

**Interfaces:**

- Consumes: `briefingArticles`, `BriefingArticle` (Task 5)
- Produces:
  - `export function citedArticles(brief: TrendBriefing, forecast: TrendForecast): BriefingArticle[]`. 글에 있는 `[n]` 가운데 실제로 있는 번호만, 오름차순, 중복 없이 돌려준다.
  - `export function briefingDropped(raw: unknown): number`. 0~20의 정수가 아니면 0이다.
  - `briefingBlocks(brief, forecast, dropped = 0)`, `briefingMarkdown(brief, forecast, dropped = 0)`

작성기 규칙:

- `href`는 `https://`로 시작할 때만 쓴다.
- Word: 항목 글을 `ExternalHyperlink`로 감싼다(글자 모양 'Hyperlink'). 표지 `[n]`은 링크 밖에 둔다.
- HTML: 항목 글을 `<a href="…">`로 감싼다. 주소와 글은 `escapeHtml`로 처리한다.
- 한글: 글 뒤에 ` ` + 주소를 그대로 붙인다.

문서 규칙:

- **참고 자료 장:** 인용된 기사가 있을 때만 둔다. 위치는 체크포인트 뒤, 자료 줄 앞이다.
  - 기사마다 항목 하나: `{ kind: 'item', depth: 0, marker: '[n]', text: '{제목} — {언론사}, {날짜}', href: url }`
  - 그 뒤에, `materialAsOf`가 있는 분야가 있으면 기준일 줄을 붙인다: `{ kind: 'reference', depth: 0, text: '정리 자료 기준일: 주식·환율 2026-10-30, AI 보안·윤리 2026-11-06' }`. 같은 날짜의 분야 이름은 `·`로 잇고, 처음 나온 순서를 따른다.
- **마크다운(PPT·마인드맵):** `## 참고 자료` 아래에 `- [n] {제목} — {언론사}, {날짜} {url}`을 쓰고, 그다음 `정리 자료 기준일: …` 한 줄을 쓴다.
- **자료 줄(정확히):** `자료: TEN AI 트렌드 레이더(trend.tenai.kr) {date} 기상도. AI가 기상도와 재료만 보고 쓴 글이며 투자 권유가 아닙니다.`
  - `dropped`가 1 이상이면 끝에 ` 재료로 확인되지 않은 숫자가 있던 문장 {dropped}개를 뺐습니다.`를 붙인다.
  - 기존 테스트의 자료 줄 기대값도 새 문구로 고친다.
- `openBriefing`은 `briefingDropped(request.dropped)`를 블록과 마크다운에 넘긴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// hanpan-core
const LINKED: DocBlock = { kind: 'item', depth: 0, marker: '[1]', text: '제목 — 연합뉴스, 2026-11-09', href: 'https://news.google.com/rss/articles/x?a=1&b=2' }
it('makes an item with an https link a Word hyperlink', async () => {
  const zip = await JSZip.loadAsync(await blocksToDocx([LINKED], GONGMUN_THEME))
  expect(await zip.file('word/document.xml')!.async('string')).toContain('<w:hyperlink')
  expect(await zip.file('word/_rels/document.xml.rels')!.async('string'))
    .toContain('Target="https://news.google.com/rss/articles/x?a=1&amp;b=2" TargetMode="External"')
})
it('links an item in the page the PDF prints', () => {
  expect(blocksToHtml([LINKED], GONGMUN_THEME)).toContain('<a href="https://news.google.com/rss/articles/x?a=1&amp;b=2">제목 — 연합뉴스, 2026-11-09</a>')
})
it('prints an item link after its text in HWP', async () => {
  // 기존 'writes a report the engine reads back' 테스트처럼 엔진으로 다시 읽은 글에
  // '[1] 제목 — 연합뉴스, 2026-11-09 https://news.google.com/rss/articles/x?a=1&b=2'가 있다
})
it('ignores a link that is not https', () => { /* href 'javascript:alert(1)' → <a 없음, w:hyperlink 없음 */ })

// shell — withMaterial(Task 5), BRIEF는 기존 견본
it('lists the cited articles with links in a 참고 자료 chapter, then the research dates', () => {
  const blocks = briefingBlocks({ ...BRIEF, summary: ['코스피 5,019 [3]', '반도체 [1][3]'] }, withMaterial)
  const i = blocks.findIndex((b) => b.kind === 'chapter' && b.text === '참고 자료')
  expect(blocks.slice(i + 1, i + 4)).toEqual([
    { kind: 'item', depth: 0, marker: '[1]', text: 'S1 — 연합뉴스, 2026-11-09', href: S1_URL },
    { kind: 'item', depth: 0, marker: '[3]', text: 'F1 — 한국경제, 2026-11-08', href: F1_URL },
    { kind: 'reference', depth: 0, text: '정리 자료 기준일: 주식·환율 2026-10-30' },
  ])
})
it('has no 참고 자료 chapter when nothing is cited', ...)
it('adds the note about dropped sentences to the source line', ...)  // dropped 2 → '…문장 2개를 뺐습니다.'로 끝남
it('prints the article links in the Markdown for PPT and the mind map', ...)  // '- [1] S1 — 연합뉴스, 2026-11-09 ' + S1_URL 줄이 있다
it('reads the dropped count from the page as a small whole number', () => {
  expect([2, -1, 1.5, 99, '3', undefined].map(briefingDropped)).toEqual([2, 0, 0, 0, 0, 0])
})
```

- [ ] **Step 2:** `npm test -w @genoffice/hanpan-core -- writer`와 `npm test -w apps/shell -- trend-briefing` → 기대: 새 테스트가 실패한다.
- [ ] **Step 3:** 위 규칙대로 작성기 세 개와 블록·마크다운·`openBriefing`·preload 형식을 고친다.
- [ ] **Step 4:** 같은 명령 둘과 `npm run typecheck -w apps/shell` → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(briefing): list cited articles with links and note dropped sentences`

### Task 8: MCP `read_trend_forecast`도 재료를 돌려준다

**Files:**

- Modify: `apps/shell/src/main/mcp/tools/trend-tools.ts`
- Test: `apps/shell/tests/mcp/trend-tools.test.ts`

**Interfaces:**

- Consumes: Task 4의 형식
- Produces: 분야 항목에 `facts`, `points`, `news`(`{ title, source, date, link }`), `materialAsOf`를 더한다. 저장본 분야에 그 칸이 있을 때만 둔다.

설명문 끝에 이 문장을 정확히 붙인다:
`' Each field may also carry key figures (facts), research summary points with their as-of date (materialAsOf) and up to three recent news headlines with links: ground any claim in these and quote numbers only from this forecast.'`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
it("returns a field's facts, points, news and their date", () => {
  expect(fieldOf(handlerWith(STORED_WITH_MATERIAL))).toMatchObject({
    facts: [F],
    points: ['p'],
    news: [{ title: N.title, source: N.source, date: N.date, link: N.url }],
    materialAsOf: '2026-10-30',
  })
})
it('leaves the material keys out of a field without material', () => {
  expect(Object.keys(fieldOf(handlerWith(STORED)))).toEqual([
    'field',
    'signal',
    'weather',
    'headline',
    'link',
  ])
})
it('tells the AI to ground claims in the material', () => {
  expect(tool.description).toContain('quote numbers only from this forecast')
})
```

- [ ] **Step 2:** `npm test -w apps/shell -- trend-tools` → 기대: 실패.
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** 같은 명령 → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(mcp): return the forecast material from read_trend_forecast`

### Task 9: 트렌드 카드가 예산과 숫자 검사를 쓴다

**Files:**

- Modify: `apps/shell/src/renderer/src/home-board/TrendCard.tsx`
- Test: `apps/shell/tests/home-trend-card.test.ts`

**Interfaces:**

- Consumes: `groundedBriefing`(Task 6), `briefingBudget`, `BriefingBudget`(Task 5), `estimatePromptTokens`(`@genoffice/agent-core`), `localContextLimit`(`@genoffice/ai-provider/browser`)
- Produces:
  - `TrendCard`의 prop `briefContext?: () => Promise<{ limit: number; known: boolean } | undefined>`
    - 기본값은 `window.aiOffice.aiGetSettings()`로 받은 설정을 `localContextLimit`로 읽는다.
    - 설정이 없거나 읽기에 실패하면 undefined다.
  - `openBriefing` 요청에 `dropped`를 넣는다.

흐름:

1. `ctx = await briefContext()`
2. `budget = ctx ? { tokens: briefingBudget(ctx.limit), estimate: (s, u) => estimatePromptTokens(s, [{ role: 'user', text: u }], []) } : undefined`
3. `groundedBriefing(forecast, (p) => runner(p, stop.signal), budget)`
4. 실패하면 지금처럼 `result.error || t('hbTrendBriefFailed')`를 보여 준다.
5. 성공하면 `openBriefing({ format, brief, forecast, dropped })`
6. 중지(`stop.signal.aborted`) 처리는 지금과 같다.

estimate 함수는 AI 호출 경로(`streamText` → 확인 창 검사)가 쓰는 것과 같다. 그래서 예산 안의 질문에는 확인 창이 뜨지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

기존 `render` 도우미가 기상도와 `briefContext`를 받도록 넓힌다. 기존 테스트 'asks the AI once …'는 답에 숫자가 없으므로 그대로 둔다.

```ts
it('asks the AI a second time when the answer has a number the forecast does not carry', async () => {
  const brief = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, text: WITH_5100 })
    .mockResolvedValueOnce({ ok: true, text: ANSWER })
  // 렌더 → 브리핑 단추를 누른다
  expect(brief).toHaveBeenCalledTimes(2)
  expect(openBriefing.mock.calls[0]![0]).toMatchObject({ dropped: 0 })
})
it('fits the question to a small local AI', async () => {
  // briefContext → { limit: 4096, known: false }, 기상도는 bigMaterial
  expect(estimate(prompt.system, prompt.user)).toBeLessThanOrEqual(3072)
})
it('sends all the material to an AI without a context limit', async () => {
  // briefContext → undefined → 질문에 기사 30줄이 모두 있다
})
```

- [ ] **Step 2:** `npm test -w apps/shell -- home-trend-card` → 기대: 새 테스트가 실패한다.
- [ ] **Step 3:** 위 흐름대로 구현한다.
- [ ] **Step 4:** 같은 명령과 `npm run typecheck -w apps/shell` → 기대: 통과.
- [ ] **Step 5: 커밋한다** — `feat(trend): run the grounded briefing from the trend card`

### Task 10: e2e, 실제 응답 확인, PR

**Files:**

- Create: `e2e/assets/trend-forecast-material.json`
  - `trend-forecast.json`에 주식·반도체·환율 세 분야의 재료를 더한 것이다: 수치 2~3개, 기사 2개(https 링크, 제목에 숫자 없음), 요약 2개, `materialAsOf`.
  - 재료 어디에도 `5,100`이 없어야 한다.
- Modify: `e2e/home-board.spec.ts`

- [ ] **Step 1: e2e를 쓴다** — 'the AI briefing checks its numbers and lists the cited articles (0.19.3)'
  - 가짜 AI(`ai:stream` 처리기)는 불릴 때마다 답 목록에서 다음 답을 보낸다. 두 번 다 같은 답이다: 헤드라인에는 숫자가 없고, summary는 `['코스피가 폭풍우입니다 [1]', '코스피 5,100선이 무너졌습니다']`다.
  - 기대:
    - 질문이 2번 간다.
    - 둘째 질문의 user에 `앞선 답에 재료에 없는 숫자가 있습니다: 5,100`이 있다.
    - Word 탭 본문에 `참고 자료`, 주식 첫 기사 제목, `재료로 확인되지 않은 숫자가 있던 문장 1개를 뺐습니다.`가 있다.
    - Word 탭 본문에 `5,100`이 없다.
  - PDF에서 링크가 살아남는지도 본다. 한판의 PDF 브리핑이 같은 `printToPDF`를 쓰기 때문이다.
    - `app.evaluate`로 숨은 `BrowserWindow`를 만들고 `data:text/html,<a href="https://example.com/x">x</a>`를 띄운다.
    - `webContents.printToPDF({})`로 만든 바이트를 latin1로 읽으면 `/URI`가 있어야 한다.
  - 기존 0.19.1 브리핑 테스트(재료 없는 견본)는 고치지 않고 그대로 통과해야 한다.
- [ ] **Step 2: e2e를 돌린다**
  - `npm run build:all` 뒤 `npm run test:e2e -- e2e/home-board.spec.ts`
  - 기대: 모두 통과. 새 테스트, 0.19.1 브리핑 테스트, 그리고 요청 주소·머리글이 그대로인지 보는 'a fixed forecast shows ten fields …' 테스트가 모두 들어 있다.
- [ ] **Step 3: 전체를 확인한다**
  - `npm test -w apps/shell`, `npm test -w @genoffice/hanpan-core`, `npm run typecheck -w apps/shell`, `npm run lint`, `npm run check:english-comments`, `npm run format:check`
  - 기대: 모두 통과.
- [ ] **Step 4: 실제 응답으로 확인한다** (Part A 배포 뒤)
  - 임시 테스트 `apps/shell/tests/trend-live.tmp.test.ts`를 만든다. 커밋하지 않고, 돌린 뒤 지운다.
  - 이 테스트는 `https://trend.tenai.kr/api/forecast`를 받아 `parseTrendForecast`로 읽고, `briefingPrompt(f, { tokens: briefingBudget(4096), estimate })`의 토큰 수와 들어간 기사 수를 출력한다.
  - 기대: 분야 10개, 재료가 있는 분야 8개 이상, 질문 3,072토큰 이하, 들어간 기사 10개 이상.
- [ ] **Step 5: 커밋하고 PR을 연다**
  - 커밋: `test(e2e): check the grounded briefing end to end`
  - `feat/briefing-material`을 push하고 `gh pr create --repo tenaico/hanpan --base main`. 본문에 바뀐 것, 실측 값, "0.19.3에 AI 포토·일러스트 생김새와 함께 실린다"를 적는다.
  - CI가 녹색인지 확인한다.
  - 판 번호 올리기, 병합, 릴리스는 0.19.3 릴리스 작업에서 혁준이 확인한 뒤 한다.
