import { describe, expect, it } from 'vitest'
import { outlineFromIndentedText } from '../src/outline'
import { checkSendRequest } from '../src/send'
import { styledDeckOps } from '../src/slide-styles'
import {
  SLIDE_GUIDES,
  applySlideWriting,
  emptySlideWriting,
  parseSlideWriting,
  slideWriterJobs,
  topicTitles,
  wroteSlide,
} from '../src/slide-writer'
import { outlineToSlides } from '../src/slides'

const MAP = `코칭 서비스 사업계획
  시장 문제
    상담 대기 3주
    비용 부담
  해결 방법
    AI 사전 코칭
      24시간 응답
  성과 목표
    > 첫 해 고객 500명
  부록
`

const outline = outlineFromIndentedText(MAP)
const titles = topicTitles(outline)
const [market, solution, goals, appendix] = outline.nodes as [
  (typeof outline.nodes)[number],
  (typeof outline.nodes)[number],
  (typeof outline.nodes)[number],
  (typeof outline.nodes)[number],
]
const [waitKey, costKey] = [market.children[0]!.key, market.children[1]!.key]

describe('slide writer prompts', () => {
  it('one job per branch that has something to write, with the style rules, the storyline and its own topics', () => {
    const jobs = slideWriterJobs(outline, 'mckinsey', { audience: '투자 심사위원' })
    // the empty branch is a section heading: it gets no job
    expect(jobs.map((j) => j.branchKey)).toEqual([market.key, solution.key, goals.key])
    expect(jobs.map((j) => j.branchKey)).not.toContain(appendix.key)
    const [first] = jobs
    expect(first!.system).toContain('「결론 먼저 보고서」 스타일')
    expect(first!.system).toContain('액션 타이틀')
    expect(first!.system).toContain('지어내지 않는다')
    expect(first!.user).toContain('청중: 투자 심사위원')
    expect(first!.user).toContain('1. 시장 문제  ← 이번 슬라이드')
    expect(first!.user).toContain('4. 부록')
    expect(first!.user).toContain('{#1} 상담 대기 3주')
    expect(first!.user).not.toContain('(+)')
    expect(first!.user).toContain('근거 줄을 붙일 수 있는 번호: 1, 2')
    // only the last job asks for the closing message
    expect(jobs.map((j) => j.closing)).toEqual([false, false, true])
    expect(jobs[2]!.system).toContain('{마무리}')
    expect(first!.system).not.toContain('{마무리}')
  })

  it('a topic with sub-topics, or one deeper down, takes no supporting lines', () => {
    const job = slideWriterJobs(outline, 'mckinsey')[1]!
    expect(job.user).toContain('{#1} AI 사전 코칭')
    expect(job.user).toContain('  {#2} 24시간 응답')
    expect([...job.detailable]).toEqual([])
    expect(job.system).not.toContain('{#번호+}')
    expect(job.user).not.toContain('근거 줄을 붙일')
  })

  it('a branch with only a memo is asked for as one statement, and its memo figures count', () => {
    const job = slideWriterJobs(outline, 'toss')[2]!
    expect(job.user).toContain('{#1} 성과 목표 (메모: 첫 해 고객 500명)')
    expect(job.keys.get('1')).toBe(goals.key)
    expect(job.figures.has('500')).toBe(true)
  })

  it('without memos, the memos stay out of the prompt and a memo-only branch gets no job', () => {
    const jobs = slideWriterJobs(outline, 'mckinsey', { includeNotes: false })
    expect(jobs.map((j) => j.branchKey)).toEqual([market.key, solution.key])
    expect(jobs.map((j) => j.closing)).toEqual([false, true])
    for (const job of jobs) expect(job.user).not.toContain('메모')
    expect(jobs.some((j) => j.figures.has('500'))).toBe(false)
  })

  it('the plain deck has no closing slide, so it is not asked for', () => {
    const jobs = slideWriterJobs(outline, 'plain')
    expect(jobs.some((j) => j.closing)).toBe(false)
    for (const job of jobs) expect(job.system).not.toContain('{마무리}')
  })

  it('a bare style asks for no supporting lines at all', () => {
    expect(SLIDE_GUIDES.jobs.details).toBe(0)
    const job = slideWriterJobs(outline, 'jobs')[0]!
    expect(job.system).not.toContain('{#번호+}')
    expect(job.user).not.toContain('근거 줄을 붙일')
    expect(job.detailable.size).toBe(0)
  })

  it('every style and the plain deck have a guide', () => {
    for (const style of [
      'jobs',
      'mckinsey',
      'toss',
      'bcg',
      'ted',
      'material',
      'notion',
      'airbnb',
      'canva',
      'pitch',
      'plain',
    ] as const) {
      expect(SLIDE_GUIDES[style].rules.length, style).toBeGreaterThan(0)
      expect(slideWriterJobs(outline, style)[0]!.system, style).toContain('{제목}')
    }
  })

  it('a map with nothing to write gets no jobs', () => {
    expect(slideWriterJobs(outlineFromIndentedText('덱\n  하나\n  둘\n'), 'toss')).toEqual([])
  })
})

describe('reading the answer', () => {
  const jobs = slideWriterJobs(outline, 'mckinsey')
  const job = jobs[0]!

  it('takes the title, lines, supporting lines, takeaway and notes, and skips what it cannot read', () => {
    const answer = [
      '네, 작성했습니다.',
      '{제목} 상담 대기와 비용이 코칭 접근을 막고 있음',
      '- {#1}: 상담까지 평균 3주를 기다림',
      '{#1+} 근거: 센터 예약 현황',
      '{#1+} 대기 중 이탈이 생김',
      '{#1+} 세 번째 줄은 넘침',
      '{#2} **회당 비용이 부담스러움**',
      '{#9} 없는 번호',
      '{핵심} 접근성이 시장의 첫 번째 문제임',
      '{노트} 먼저 대기 문제를 말합니다. 확인할 자료: 지역 센터 대기 통계',
      '{마무리} 이 job은 마무리를 묻지 않음',
    ].join('\n')
    const w = parseSlideWriting(answer, job, titles)
    expect(w.titles[market.key]).toBe('상담 대기와 비용이 코칭 접근을 막고 있음')
    expect(w.lines[waitKey]).toBe('상담까지 평균 3주를 기다림')
    expect(w.lines[costKey]).toBe('회당 비용이 부담스러움')
    expect(w.details[waitKey]).toEqual(['근거: 센터 예약 현황', '대기 중 이탈이 생김'])
    expect(w.takeaways[market.key]).toBe('접근성이 시장의 첫 번째 문제임')
    expect(w.notes[market.key]).toBe('먼저 대기 문제를 말합니다. 확인할 자료: 지역 센터 대기 통계')
    expect(w.closing).toBeUndefined()
    expect(wroteSlide(w, market.key)).toBe(true)
    expect(wroteSlide(w, solution.key)).toBe(false)
  })

  it('cleans what small models echo from the prompt', () => {
    const w = parseSlideWriting(
      [
        '1. {#1} — (+) 상담까지 3주 대기 (메모: 무엇)',
        '**{#2}** "회당 비용이 부담스러움"',
        '{제목} "고객이 말한 \'너무 비싸다\'"',
      ].join('\n'),
      job,
      titles,
    )
    expect(w.lines[waitKey]).toBe('상담까지 3주 대기')
    expect(w.lines[costKey]).toBe('회당 비용이 부담스러움')
    // a quote inside the text keeps its wrapping quotes
    expect(w.titles[market.key]).toBe('"고객이 말한 \'너무 비싸다\'"')
  })

  it('a note that runs over several lines is read whole', () => {
    const w = parseSlideWriting(
      '{노트} 첫 문장입니다.\n이어지는 문장입니다.\n{핵심} 요점',
      job,
      titles,
    )
    expect(w.notes[market.key]).toBe('첫 문장입니다. 이어지는 문장입니다.')
  })

  it('does not take a line that drops one of the map figures', () => {
    const w = parseSlideWriting('{#1} 상담까지 오래 기다림', job, titles)
    expect(w.lines[waitKey]).toBeUndefined()
  })

  it('does not take any piece that brings in a figure the branch does not hold', () => {
    const w = parseSlideWriting(
      [
        '{제목} 대기 시간 40% 증가',
        '{#2} 회당 비용 30만 원',
        '{#1+} 이탈률 25%',
        '{핵심} 고객 12명 가운데 한 명이 떠남',
        '{노트} 매출이 2배 늘었습니다.',
        '{노트} 이유는 두 가지이고, 3주 대기가 첫째입니다.',
      ].join('\n'),
      job,
      titles,
    )
    expect(w.titles[market.key]).toBeUndefined()
    expect(w.lines[costKey]).toBeUndefined()
    expect(w.details[waitKey]).toBeUndefined()
    expect(w.takeaways[market.key]).toBeUndefined()
    // the map's own figure, and small counts with no unit, are fine
    expect(w.notes[market.key]).toBe('이유는 두 가지이고, 3주 대기가 첫째입니다.')
    expect(parseSlideWriting('{핵심} 2단계로 나눠 봄', job, titles).takeaways[market.key]).toBe(
      '2단계로 나눠 봄',
    )
  })

  it('a figure followed by a particle still counts as that figure', () => {
    const w = parseSlideWriting('{#1} 3주가 넘는 대기', job, titles)
    expect(w.lines[waitKey]).toBe('3주가 넘는 대기')
  })

  it('does not take pieces far longer than the style boxes', () => {
    const limit = Math.ceil(SLIDE_GUIDES.mckinsey.titleMax * 1.3)
    const w = parseSlideWriting(
      [
        `{제목} ${'가'.repeat(limit + 1)}`,
        `{#2} ${'나'.repeat(SLIDE_GUIDES.mckinsey.maxLine * 2 + 1)}`,
        `{핵심} ${'다'.repeat(71)}`,
      ].join('\n'),
      job,
      titles,
    )
    expect(w.titles[market.key]).toBeUndefined()
    expect(w.lines[costKey]).toBeUndefined()
    expect(w.takeaways[market.key]).toBeUndefined()
    expect(
      parseSlideWriting(`{제목} ${'가'.repeat(limit)}`, job, titles).titles[market.key],
    ).toHaveLength(limit)
  })

  it('adds each branch to the same writing, and the last job brings the closing', () => {
    const w = emptySlideWriting()
    parseSlideWriting('{제목} 첫 장', jobs[0]!, titles, w)
    parseSlideWriting(
      `{#1} 첫 해 고객 500명을 목표로 함\n{마무리} ${'라'.repeat(61)}`,
      jobs[2]!,
      titles,
      w,
    )
    expect(w.closing).toBeUndefined()
    parseSlideWriting('{마무리} 다음 단계는 시범 운영임', jobs[2]!, titles, w)
    expect(Object.keys(w.titles)).toEqual([market.key])
    expect(w.lines[goals.key]).toBe('첫 해 고객 500명을 목표로 함')
    expect(w.closing).toBe('다음 단계는 시범 운영임')
  })
})

describe('putting it on the slides', () => {
  const writing = (() => {
    const jobs = slideWriterJobs(outline, 'mckinsey')
    const w = emptySlideWriting()
    parseSlideWriting(
      '{제목} 대기와 비용이 접근을 막음\n{#1} 상담까지 3주 대기\n{#1+} 대기 중 이탈\n{핵심} 접근성이 문제임\n{노트} 대기부터 말합니다.',
      jobs[0]!,
      titles,
      w,
    )
    parseSlideWriting(
      '{#1} 첫 해 고객 500명을 목표로 함\n{마무리} 시범 운영을 시작함',
      jobs[2]!,
      titles,
      w,
    )
    return w
  })()

  it('replaces the words, puts supporting lines under their topic and sets the takeaway', () => {
    const slides = applySlideWriting(outlineToSlides(outline), writing)
    const slide = slides[1]!
    expect(slide.title).toBe('대기와 비용이 접근을 막음')
    expect(slide.section).toBe('시장 문제')
    expect(slide.takeaway).toBe('접근성이 문제임')
    expect(slide.paragraphs.map((p) => [p.text, p.level])).toEqual([
      ['상담까지 3주 대기', 0],
      ['대기 중 이탈', 1],
      ['비용 부담', 0],
    ])
    expect(slide.notes).toBe('접근성이 문제임\n\n대기부터 말합니다.')
    // the slide the AI did not write keeps its words
    expect(slides[2]!.title).toBe('해결 방법')
    expect(slides[2]!.section).toBeUndefined()
    expect(slides[2]!.takeaway).toBeUndefined()
    // the memo-only branch becomes one statement, its memo still in the notes
    expect(slides[3]!.paragraphs.map((p) => p.text)).toEqual(['첫 해 고객 500명을 목표로 함'])
    expect(slides[3]!.notes).toBe('첫 해 고객 500명')
    // the empty branch and the cover are untouched
    expect(slides[4]).toEqual(outlineToSlides(outline)[4])
    expect(slides[0]).toEqual(outlineToSlides(outline)[0])
  })

  it('a slide continued over several pages keeps its title and takeaway on each', () => {
    const many = outlineFromIndentedText(
      `덱\n  긴 가지\n${Array.from({ length: 11 }, (_, i) => `    항목 ${i + 1}`).join('\n')}\n`,
    )
    const [job] = slideWriterJobs(many, 'mckinsey')
    const w = parseSlideWriting(
      '{제목} 항목이 많은 가지\n{핵심} 요점\n{노트} 설명',
      job!,
      topicTitles(many),
    )
    const [, first, second] = applySlideWriting(outlineToSlides(many), w)
    expect(first!.title).toBe('항목이 많은 가지')
    expect(second!.title).toBe('항목이 많은 가지 (계속)')
    expect(second!.section).toBe('긴 가지')
    expect([first!.takeaway, second!.takeaway]).toEqual(['요점', '요점'])
    expect(first!.notes).toBe('요점\n\n설명')
    expect(second!.notes).toBe('')
  })

  it('keeps the person own notes after the AI notes', () => {
    const withMemo = outlineFromIndentedText('덱\n  가지\n    항목\n    > 내 메모\n')
    const jobs = slideWriterJobs(withMemo, 'toss')
    const w = parseSlideWriting('{핵심} 요점\n{노트} AI가 쓴 노트', jobs[0]!, topicTitles(withMemo))
    const [, slide] = applySlideWriting(outlineToSlides(withMemo), w)
    expect(slide!.notes).toBe('요점\n\nAI가 쓴 노트\n\n항목: 내 메모')
  })

  it('the contents slide lists the branch names, the takeaway box and the closing slide carry the writing', () => {
    const slides = applySlideWriting(outlineToSlides(outline), writing)
    const texts = (ops: ReturnType<typeof styledDeckOps>, slide: number): string[] =>
      ops
        .filter(
          (o) =>
            (o.target as { slide?: number } | undefined)?.slide === slide &&
            Array.isArray(o.paragraphs),
        )
        .flatMap((o) =>
          (o.paragraphs as { runs: { text: string }[] }[]).flatMap((p) =>
            p.runs.map((r) => r.text),
          ),
        )
    const ops = styledDeckOps(slides, 'mckinsey', { closing: writing.closing })
    const all = (n: number) => texts(ops, n).join(' ')
    // cover, contents, four slides, closing
    expect(all(1)).toContain('시장 문제')
    expect(all(1)).not.toContain('대기와 비용이 접근을 막음')
    expect(all(2)).toContain('대기와 비용이 접근을 막음')
    expect(all(2)).toContain('접근성이 문제임')
    expect(all(6)).toContain('시범 운영을 시작함')
    // without a message the closing slide names the deck
    expect(texts(styledDeckOps(slides, 'mckinsey'), 6).join(' ')).toContain('코칭 서비스 사업계획')
  })
})

describe('the send request', () => {
  const base = {
    target: 'slides',
    style: 'report',
    includeNotes: true,
    mapPath: null,
    sheetId: 's',
    outline,
  }

  it('keeps well-formed writing and drops what is not text', () => {
    const request = checkSendRequest({
      ...base,
      slideWriting: {
        titles: { a: '제목', b: 3, h: '두\n줄' },
        lines: { c: '줄', d: 'x'.repeat(500), i: '  ' },
        details: { e: ['근거', 7, '', '여러\n줄'], f: 'not a list' },
        takeaways: { j: '요점', k: '요\n점' },
        notes: { g: '노트\n둘째 줄', l: 'x'.repeat(2001) },
        closing: '마무리',
        extra: 'dropped',
      },
    })
    expect(request.slideWriting).toEqual({
      titles: { a: '제목' },
      lines: { c: '줄' },
      details: { e: ['근거'] },
      takeaways: { j: '요점' },
      notes: { g: '노트\n둘째 줄' },
      closing: '마무리',
    })
  })

  it('a closing on several lines is left out', () => {
    expect(
      checkSendRequest({ ...base, slideWriting: { closing: '하나\n둘' } }).slideWriting?.closing,
    ).toBeUndefined()
  })

  it('takes no slide writing for a document, and refuses a malformed one', () => {
    expect(
      checkSendRequest({ ...base, target: 'hwp', slideWriting: { titles: { a: 'x' } } })
        .slideWriting,
    ).toBeUndefined()
    expect(checkSendRequest(base).slideWriting).toBeUndefined()
    expect(() => checkSendRequest({ ...base, slideWriting: 'text' })).toThrow()
    expect(() => checkSendRequest({ ...base, slideWriting: { lines: ['x'] } })).toThrow()
    expect(() => checkSendRequest({ ...base, slideWriting: { takeaways: ['x'] } })).toThrow()
  })
})
