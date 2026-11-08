/**
 * "Let the AI write the slides": each main branch's slide gets its text written
 * in the chosen slide style — a title in the style's voice (an action title for
 * McKinsey, a plain question for Toss), the topics as slide lines, supporting
 * lines under the topics that have none where the style takes them, a takeaway
 * and speaker notes; the last job also writes the closing message.
 *
 * The style rules are this app's own wording of each style's habits, after the
 * 슬라이드 스타일 10선 of the 코칭창업론 handbook: rules per style, then one fixed
 * output shape per slide.
 *
 * Nothing new is made up. The prompt forbids figures, names and quotes the map
 * does not hold, and the answer is checked as well: a piece that brings in a
 * figure the branch does not hold is not taken, a slide line that drops one of
 * its topic's figures is not taken, and a piece far longer than the style's
 * boxes is not taken. What is not taken keeps the map's own words.
 *
 * As with `flesh-out.ts`, the answer is one line per item, `{#n} text`, which
 * small local models follow far more reliably than JSON. This file builds the
 * prompts and reads the answers; the call goes through the person's AI.
 */
import type { PanNode, PanOutline } from './outline'
import type { SlideStyleId } from './slide-styles'
import type { SlidePlan, SlidePlanParagraph } from './slides'

export type SlideWritingStyle = SlideStyleId | 'plain'

interface SlideGuide {
  /** the style's voice, one line */
  voice: string
  /** what its titles, lines and story look like */
  rules: readonly string[]
  /** longest slide title asked for, in characters */
  titleMax: number
  /** longest slide line asked for, in characters */
  maxLine: number
  /** supporting lines a topic without sub-topics may get (0: the style keeps slides bare) */
  details: 0 | 1 | 2
  /** what the closing message is; absent where the deck has no closing slide */
  closing?: string
}

export const SLIDE_GUIDES: Readonly<Record<SlideWritingStyle, SlideGuide>> = {
  jobs: {
    voice: '짧고 단호한 선언형. 꾸밈말을 덜어내고 동사로 말한다.',
    rules: [
      '제목은 슬라이드의 생각 하나를 담은 짧은 한 문장이다.',
      '화면 문장은 한 줄로 끝낸다. 조사와 수식어를 걷어 내고, 숫자가 있으면 숫자를 주인공으로 둔다.',
      '덱 전체가 문제 → 전환("그런데") → 해법 → 한 줄 메시지로 흐르게 쓴다.',
    ],
    titleMax: 20,
    maxLine: 22,
    details: 0,
    closing: '청중이 집에 가져갈 한 문장',
  },
  mckinsey: {
    voice: '객관적이고 정량적인 보고 문체. 형용사 대신 사실과 숫자로 말한다.',
    rules: [
      '제목은 이 슬라이드의 결론을 담은 완결 문장(액션 타이틀)이다. 주제어만 쓰지 않는다.',
      '화면 문장은 제목을 받치는 근거다. 서로 겹치지 않고 빠지는 것이 없게(MECE) 다듬는다.',
      '근거 줄은 그 항목이 왜 맞는지를 보여 주는 사실·비교·기준을 개요 안에서 찾아 짧게 쓴다.',
      '실행 계획이면 과제·담당·기한을 개요에 있는 만큼만 드러낸다.',
    ],
    titleMax: 40,
    maxLine: 40,
    details: 2,
    closing: '다음 단계(Next steps)를 한 문장으로',
  },
  toss: {
    voice: '친근한 해요체. 초등학생도 알아듣는 쉬운 말로, 듣는 사람 입장에서 말한다.',
    rules: [
      '제목은 듣는 사람에게 말을 거는 한 문장(질문이나 "~할 수 있어요")이다.',
      '전문용어는 쉬운 말로 풀어 쓴다. 한 슬라이드에는 메시지 하나만 둔다.',
      '화면 문장은 짧은 카드 한 장에 들어갈 길이로 쓴다.',
    ],
    titleMax: 30,
    maxLine: 26,
    details: 1,
    closing: '듣는 사람이 바로 해 볼 수 있는 한 가지를 해요체 한 문장으로',
  },
  bcg: {
    voice: '전략 컨설팅 문체. 구조와 기준을 먼저 세우고 시사점으로 맺는다.',
    rules: [
      '제목은 이 구조가 말해 주는 시사점을 담은 문장이다.',
      '화면 문장은 각 항목에 이름을 붙이듯 짧게 쓴다(이름: 한 줄 정의).',
      '근거 줄은 그 항목을 가르는 기준이나 축을 쓴다.',
      '핵심 줄은 "그래서 무엇을 해야 하는가(So what)"에 답한다.',
    ],
    titleMax: 38,
    maxLine: 32,
    details: 1,
    closing: '권고안을 한 문장으로',
  },
  ted: {
    voice: '이야기하듯 말하는 발표체. 구체적인 장면과 감정으로 끌고 간다.',
    rules: [
      '제목은 마음을 건드리는 짧은 말이다.',
      '화면에는 단어 몇 개만 남긴다. 설명은 노트로 보낸다.',
      '덱 전체가 평범한 일상 → 전환점 → 깨달음의 3막으로 흐르게 쓴다. 노트에 청중에게 던지는 질문을 넣어도 좋다.',
    ],
    titleMax: 20,
    maxLine: 20,
    details: 0,
    closing: '청중의 행동을 부르는 한 문장',
  },
  material: {
    voice: '학습 자료처럼 명확한 안내체. 정보의 위계가 한눈에 보이게 쓴다.',
    rules: [
      '제목은 이 슬라이드에서 무엇을 알게 되는지 분명히 말한다.',
      '단계나 할 일은 동사로 시작하는 짧은 지시로 쓴다.',
      '근거 줄은 그 항목을 어떻게 하는지, 또는 어떻게 확인하는지 한 줄로 설명한다.',
    ],
    titleMax: 30,
    maxLine: 28,
    details: 1,
    closing: '오늘 배운 것을 정리하는 한 문장',
  },
  notion: {
    voice: '잘 정리한 노트의 간결한 명사형 문체. 꾸밈 없이 정돈되게 쓴다.',
    rules: [
      '제목은 핵심 키워드가 앞에 오는 짧은 머리말이다.',
      '화면 문장은 체크리스트나 속성처럼 짧게 쓴다.',
      '근거 줄은 그 항목의 상태나 다음 할 일을 개요에 있는 만큼만 쓴다.',
    ],
    titleMax: 26,
    maxLine: 30,
    details: 1,
    closing: '정리한 내용을 한 줄로 요약',
  },
  airbnb: {
    voice: '따뜻한 2인칭 공감체. 숫자보다 경험과 사람의 목소리로 말한다.',
    rules: [
      '제목은 장면이 그려지는 따뜻한 문장이다.',
      '덱 전체가 발견 → 경험 → 변화의 여정으로 흐르게 쓴다.',
      '근거 줄은 그 경험을 겪는 사람의 입장에서 쓴다. 지어낸 인용은 쓰지 않는다.',
    ],
    titleMax: 30,
    maxLine: 28,
    details: 1,
    closing: '듣는 사람이 공감할 한 문장',
  },
  canva: {
    voice: '밝고 쉬운 홍보 문체. 헤드라인 한 줄과 짧은 설명으로 말한다.',
    rules: [
      '제목은 눈에 띄는 헤드라인이다.',
      '화면 문장은 아이콘 옆에 들어갈 만큼 짧게 쓴다.',
      '행사 안내라면 일시·장소·대상·신청 방법을 개요에 있는 만큼만 드러낸다.',
    ],
    titleMax: 26,
    maxLine: 24,
    details: 1,
    closing: '참여나 연락을 권하는 한 문장',
  },
  pitch: {
    voice: '투자자 앞의 자신 있는 주장체. 왜 지금, 왜 우리, 어떻게 버는지로 말한다.',
    rules: [
      '제목은 이 슬라이드의 주장을 담은 한 줄 헤드라인이다.',
      '개요에 있는 숫자는 문장 맨 앞으로 끌어낸다.',
      '근거 줄은 그 주장을 증명하는 지표나 사실을 개요에서 찾아 쓴다. 없으면 근거 줄을 쓰지 말고 노트에 무엇으로 증명할지 남긴다.',
      '덱은 문제 → 해결 → 시장 → 제품 → 사업모델 → 경쟁 → 성과 → 팀 → 재무 → 요청의 흐름을 염두에 둔다.',
    ],
    titleMax: 34,
    maxLine: 32,
    details: 2,
    closing: '요청 사항을 개요에 있는 만큼 한 문장으로',
  },
  plain: {
    voice: '명확한 발표 문체.',
    rules: ['제목은 이 슬라이드의 핵심 메시지를 담은 문장이다.', '화면 문장은 짧고 분명하게 다듬는다.'],
    titleMax: 36,
    maxLine: 32,
    details: 1,
  },
}

const COMMON_RULES = [
  '개요와 같은 언어로 쓴다.',
  '개요에 없는 숫자·고유명사·날짜·인용·사례를 지어내지 않는다. 개요에 있는 숫자는 빠뜨리지 않고 그대로 쓴다.',
  '각 항목의 뜻을 바꾸지 않고, 표현만 스타일에 맞게 다듬는다.',
  '확인이 필요한 근거나 자료는 화면에 쓰지 말고 {노트}에 "확인할 자료: …"로 남긴다.',
  '마크다운, 목록 기호, 따옴표 장식, 설명하는 말을 쓰지 않는다.',
]

/** The takeaway and the closing are set in boxes: past these they are left out. */
const TAKEAWAY_MAX = 70
const CLOSING_MAX = 60
/** Longest piece taken from an answer, whatever the style: past this the model is not writing a slide line. */
export const SLIDE_LINE_MAX = 160
const NOTE_MAX = 1200

export interface SlideWriterJob {
  /** the main branch the job covers */
  branchKey: string
  system: string
  user: string
  /** prompt number → topic key */
  keys: Map<string, string>
  /** prompt numbers that may get supporting lines */
  detailable: Set<string>
  /** the most supporting lines one topic takes */
  maxDetails: number
  /** this job also asks for the closing message */
  closing: boolean
  /** the numbers the branch holds (its words, its memos, the deck title): the only ones the answer may use */
  figures: Set<string>
  /** caps the answer is held to, in characters */
  limits: { title: number; line: number }
}

export interface SlideWriterOptions {
  /** who the talk is for, as the person typed it */
  audience?: string | undefined
  /** whether the topics' memos go to the AI ("메모도 넣기"); on when absent */
  includeNotes?: boolean | undefined
}

const STYLE_NAMES: Record<SlideStyleId, string> = {
  jobs: '스티브 잡스',
  mckinsey: '맥킨지',
  toss: '토스',
  bcg: 'BCG',
  ted: 'TED',
  material: '구글 머티리얼',
  notion: '노션',
  airbnb: '에어비앤비',
  canva: '캔바 모던',
  pitch: '스타트업 피치덱',
}

function systemPrompt(style: SlideWritingStyle, closing: boolean, details: boolean): string {
  const g = SLIDE_GUIDES[style]
  const name = style === 'plain' ? '발표 자료' : `「${STYLE_NAMES[style]} 스타일」 발표 자료`
  return [
    `너는 ${name}의 내용을 쓰는 프레젠테이션 기획자다.`,
    '마인드맵 개요의 한 가지를 슬라이드 한 장의 글로 쓴다.',
    '',
    `문체: ${g.voice}`,
    '스타일 규칙:',
    ...g.rules.map((r) => `- ${r}`),
    `- 제목은 ${g.titleMax}자 이내, 화면 문장은 ${g.maxLine}자 이내로 쓴다.`,
    '공통 규칙:',
    ...COMMON_RULES.map((r) => `- ${r}`),
    '',
    '출력 형식(한 줄에 하나, 다른 말 없이):',
    '{제목} 슬라이드 제목',
    '{#번호} 그 항목의 화면 문장 (개요의 모든 번호에 하나씩)',
    ...(details
      ? [`{#번호+} 근거나 설명 한 줄 (근거 줄을 붙일 수 있다고 적힌 번호에만, 번호마다 ${g.details}줄까지, 쓸 것이 없으면 생략)`]
      : []),
    `{핵심} 이 슬라이드에서 청중이 가져갈 시사점 한 문장 (${TAKEAWAY_MAX - 20}자 이내)`,
    '{노트} 발표자가 말할 2~3문장',
    ...(closing && g.closing ? [`{마무리} 덱의 마지막 장에 놓을 ${g.closing} (40자 이내)`] : []),
  ].join('\n')
}

const oneLine = (s: string, max: number): string => s.replace(/\s+/g, ' ').trim().slice(0, max)

// ---- numbers ----

/** A number as written, commas dropped: 1,200 → 1200, 4.5 → 4.5. */
const NUMBER = /(?<![\d.,])\d[\d,]*(?:\.\d+)?/g
/** Units a figure carries; a number with none of these (an ordinal, "1단계") is not a figure. */
const UNIT = /^\s?(%|배|억|만|천|명|건|개|원|점|회|곳|시간|주|년|월|일|분|초|x|X|달러|위)/

interface NumberAt {
  value: string
  unit: string
}

function numbersIn(text: string): NumberAt[] {
  const out: NumberAt[] = []
  for (const m of text.matchAll(NUMBER)) {
    const value = m[0].replace(/,/g, '').replace(/\.$/, '')
    const unit = UNIT.exec(text.slice(m.index + m[0].length))?.[1] ?? ''
    out.push({ value, unit })
  }
  return out
}

/**
 * A number the answer brought in: one the branch does not hold. Small counts
 * with no unit ("3가지 이유", "1단계") are let through; a figure with a unit, a
 * number of two digits or more, or a decimal is not.
 */
function bringsNewFigure(text: string, figures: ReadonlySet<string>): boolean {
  return numbersIn(text).some(
    (n) => !figures.has(n.value) && (n.unit !== '' || n.value.replace('.', '').length > 1),
  )
}

/** Every figure with a unit in `source` is still in `line`, with the same unit. */
function keepsFigures(source: string, line: string): boolean {
  const kept = new Set(numbersIn(line).map((n) => `${n.value}|${n.unit}`))
  return numbersIn(source)
    .filter((n) => n.unit !== '')
    .every((n) => kept.has(`${n.value}|${n.unit}`))
}

// ---- the jobs ----

/**
 * One job per main branch, as `fleshOutJobs` does: a whole map in one request
 * is too long for a small model. Each prompt still shows the deck's storyline,
 * so a slide knows where it stands. A branch with nothing under it and no memo
 * is a section heading: it is left as it is and gets no job.
 */
export function slideWriterJobs(
  outline: PanOutline,
  style: SlideWritingStyle,
  options: SlideWriterOptions = {},
): SlideWriterJob[] {
  const includeNotes = options.includeNotes ?? true
  const audience = oneLine(options.audience ?? '', 200)
  const guide = SLIDE_GUIDES[style]
  const storyline = outline.nodes.map((b, k) => `${k + 1}. ${oneLine(b.title, 120)}`)
  const memo = (node: PanNode): string =>
    includeNotes && node.note?.trim() ? ` (메모: ${oneLine(node.note, 300)})` : ''
  const deckWords = [outline.title, includeNotes ? (outline.note ?? '') : ''].join(' ')

  const jobs: SlideWriterJob[] = []
  outline.nodes.forEach((branch, index) => {
    if (!branch.children.length && !(includeNotes && branch.note?.trim())) return
    const keys = new Map<string, string>()
    const detailable = new Set<string>()
    const lines: string[] = []
    const words: string[] = [deckWords, branch.title, includeNotes ? (branch.note ?? '') : '']
    let n = 0
    const item = (node: PanNode, depth: number, canDetail: boolean) => {
      const id = String(++n)
      keys.set(id, node.key)
      if (canDetail && guide.details) detailable.add(id)
      words.push(node.title, includeNotes ? (node.note ?? '') : '')
      lines.push(`${'  '.repeat(depth)}{#${id}} ${oneLine(node.title, 300)}${memo(node)}`)
    }
    const visit = (nodes: readonly PanNode[], depth: number) => {
      for (const node of nodes) {
        // only a topic right under the branch shows its lines in the styles' cards
        item(node, depth, depth === 0 && !node.children.length)
        visit(node.children, depth + 1)
      }
    }
    // a branch with only a memo under it is written as one statement: the branch itself is #1
    if (!branch.children.length) item(branch, 0, false)
    else visit(branch.children, 0)
    const user = [
      `발표 제목: ${oneLine(outline.title, 200)}`,
      includeNotes && outline.note ? `발표 취지: ${oneLine(outline.note, 400)}` : '',
      audience ? `청중: ${audience}` : '',
      '',
      '덱의 흐름:',
      ...storyline.map((l, k) => (k === index ? `${l}  ← 이번 슬라이드` : l)),
      '',
      `이번 슬라이드의 가지: ${oneLine(branch.title, 200)}${memo(branch)}`,
      '개요:',
      ...lines,
      ...(detailable.size ? ['', `근거 줄을 붙일 수 있는 번호: ${[...detailable].join(', ')}`] : []),
    ]
      .filter((l, i, all) => l !== '' || (i > 0 && all[i - 1] !== ''))
      .join('\n')
    jobs.push({
      branchKey: branch.key,
      system: '',
      user,
      keys,
      detailable,
      maxDetails: guide.details,
      closing: false,
      figures: new Set(numbersIn(words.join(' ')).map((x) => x.value)),
      limits: { title: Math.ceil(guide.titleMax * 1.3), line: guide.maxLine * 2 },
    })
  })
  // the last slide written also brings the closing message, where the deck has a closing slide
  const last = jobs.at(-1)
  if (last && guide.closing) last.closing = true
  for (const job of jobs) job.system = systemPrompt(style, job.closing, job.detailable.size > 0)
  return jobs
}

// ---- reading the answer ----

/** What the AI wrote for a deck, keyed by map topic. */
export interface SlideWriting {
  /** branch key → the slide's title */
  titles: Record<string, string>
  /** topic key → its slide line; a branch with only a memo: its slide's one statement */
  lines: Record<string, string>
  /** topic key → supporting lines set under it */
  details: Record<string, string[]>
  /** branch key → the slide's takeaway */
  takeaways: Record<string, string>
  /** branch key → speaker notes */
  notes: Record<string, string>
  /** the closing slide's message */
  closing?: string | undefined
}

export const emptySlideWriting = (): SlideWriting => ({
  titles: {},
  lines: {},
  details: {},
  takeaways: {},
  notes: {},
})

/** A tagged line, as small models write it: a list number, a dash or bold marks may wrap the tag. */
const TAGGED =
  /^\s*(?:\d{1,3}[.)]\s*)?(?:[-*•]\s*)?(?:\*\*)?\{(제목|핵심|노트|마무리|#(\d{1,4})(\+?))\}(?:\*\*)?\s*(.*?)\s*$/

/** The answer's text for an item, without what small models echo from the prompt. */
function cleaned(text: string): string {
  let t = text
    .replace(/^[:：\-–—―]\s*/, '')
    .replace(/^\(\+\)\s*/, '')
    .replace(/\s*\(메모:[^)]*\)\s*$/, '')
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .trim()
  // wrapping quotes, only when the text holds no other quote of its own
  const q = /^["“'‘](.*)["”'’]$/.exec(t)
  if (q && !/["“”'‘’]/.test(q[1]!)) t = q[1]!
  return t.trim()
}

/** One job's answer into `into`; lines it cannot read, and pieces that fail the checks, are left out. */
export function parseSlideWriting(
  answer: string,
  job: Pick<
    SlideWriterJob,
    'branchKey' | 'keys' | 'detailable' | 'maxDetails' | 'closing' | 'figures' | 'limits'
  >,
  source: ReadonlyMap<string, string>,
  into: SlideWriting = emptySlideWriting(),
): SlideWriting {
  const fresh = (text: string): boolean => !bringsNewFigure(text, job.figures)
  let takeaway = ''
  const talk: string[] = []
  let last = ''
  for (const raw of answer.split(/\r?\n/)) {
    const m = TAGGED.exec(raw)
    if (!m) {
      // a note that runs over several lines
      const more = cleaned(raw)
      if (last === '노트' && more && fresh(more)) talk.push(more)
      continue
    }
    const [, tag, id, plus] = m
    last = tag!
    const text = cleaned(m[4] ?? '')
    if (!text || !fresh(text)) continue
    if (tag === '제목') {
      if (!Object.hasOwn(into.titles, job.branchKey) && text.length <= job.limits.title) {
        into.titles[job.branchKey] = text
      }
    } else if (tag === '핵심') {
      if (!takeaway && text.length <= TAKEAWAY_MAX) takeaway = text
    } else if (tag === '노트') {
      talk.push(text)
    } else if (tag === '마무리') {
      if (job.closing && !into.closing && text.length <= CLOSING_MAX) into.closing = text
    } else if (id) {
      const key = job.keys.get(id)
      if (!key || text.length > job.limits.line) continue
      if (plus) {
        if (!job.detailable.has(id)) continue
        const list = (into.details[key] ??= [])
        if (list.length < job.maxDetails) list.push(text)
      } else if (!Object.hasOwn(into.lines, key) && keepsFigures(source.get(key) ?? '', text)) {
        into.lines[key] = text
      }
    }
  }
  if (takeaway) into.takeaways[job.branchKey] = takeaway
  const notes = talk.join(' ').slice(0, NOTE_MAX)
  if (notes) into.notes[job.branchKey] = notes
  return into
}

/** Topic key → title, for `parseSlideWriting`'s figure check. */
export function topicTitles(outline: PanOutline): Map<string, string> {
  const out = new Map<string, string>()
  const visit = (node: PanNode) => {
    out.set(node.key, node.title)
    node.children.forEach(visit)
  }
  outline.nodes.forEach(visit)
  return out
}

/** How much of a job the AI wrote: what the dialog reports after a partial run. */
export function wroteSlide(writing: SlideWriting, branchKey: string): boolean {
  return [writing.titles, writing.takeaways, writing.notes].some((o) => Object.hasOwn(o, branchKey))
}

const CONTINUED = ' (계속)'

/**
 * The slides with the writing put in. A title keeps its branch's place in the
 * contents slide (`section`), lines replace their topics' words, supporting
 * lines go right under their topic, the takeaway goes to the slide (and every
 * continuation of it) and first in the notes, before the person's own notes.
 * Slides and topics the AI did not write keep what they had.
 */
export function applySlideWriting(slides: readonly SlidePlan[], writing: SlideWriting): SlidePlan[] {
  const has = (o: Record<string, unknown>, key: string | undefined): key is string =>
    key !== undefined && Object.hasOwn(o, key)
  return slides.map((slide, index) => {
    if (index === 0) return slide
    const continued = slide.title.endsWith(CONTINUED)
    const branchTitle = continued ? slide.title.slice(0, -CONTINUED.length) : slide.title
    const title = has(writing.titles, slide.key) ? writing.titles[slide.key]! : undefined
    const paragraphs: SlidePlanParagraph[] = []
    for (const p of slide.paragraphs) {
      paragraphs.push(has(writing.lines, p.key) ? { ...p, text: writing.lines[p.key]! } : p)
      if (has(writing.details, p.key)) {
        for (const text of writing.details[p.key]!) {
          paragraphs.push({ text, bullet: 'char', level: (p.level ?? 0) + 1 })
        }
      }
    }
    // a branch with only a memo: its statement is the slide's one line
    if (!continued && !paragraphs.length && has(writing.lines, slide.key)) {
      paragraphs.push({ text: writing.lines[slide.key]!, key: slide.key })
    }
    const written = wroteSlide(writing, slide.key) || title !== undefined
    const takeaway = has(writing.takeaways, slide.key) ? writing.takeaways[slide.key]! : ''
    const talk = !continued && has(writing.notes, slide.key) ? writing.notes[slide.key]! : ''
    return {
      ...slide,
      title: title ? (continued ? `${title}${CONTINUED}` : title) : slide.title,
      ...(title ? { section: branchTitle } : {}),
      ...(written ? { takeaway } : {}),
      paragraphs,
      notes: [continued ? '' : takeaway, talk, slide.notes].filter(Boolean).join('\n\n'),
    }
  })
}
