/**
 * "Let the AI write the sentences": each topic of a branch gets one or two
 * report sentences in 개조식 (ending in ~함, ~임, ~할 계획임), written by the
 * person's AI (a local model first). The answer format is one line per topic,
 * `{#n} sentence`, which small local models follow far more reliably than JSON;
 * `n` is a short number the prompt assigns, mapped back to the topic key.
 * Under any UI language but Korean the prompt is in English and asks for that
 * language's plain report style instead.
 */
import { aiLanguageName } from './ai-language'
import type { PanNode, PanOutline } from './outline'

export interface FleshOutJob {
  /** the main branch the job covers */
  branchKey: string
  system: string
  user: string
  /** prompt number → topic key */
  keys: Map<string, string>
}

export const FLESH_OUT_SYSTEM = [
  '너는 한국 공공기관·기업의 보고서를 쓰는 작성자다.',
  '주어진 개요의 각 항목을 보고서 본문 문장으로 늘려 쓴다.',
  '규칙:',
  '- 항목마다 1~2문장, 개조식 종결(~함, ~임, ~할 계획임, ~필요함)로 쓴다.',
  '- 개요에 없는 수치·기관명·날짜를 지어내지 않는다. 모르는 것은 일반적으로 쓴다.',
  '- 출력은 항목마다 한 줄: `{#번호} 문장`. 다른 말, 제목, 목록 기호, 마크다운을 쓰지 않는다.',
  '- 번호는 개요에 붙은 번호를 그대로 쓰고, 모든 번호에 답한다.',
].join('\n')

/** The system prompt for a UI language: Korean's own, or the same rules in English. */
export function fleshOutSystem(lang: string): string {
  if (lang === 'ko') return FLESH_OUT_SYSTEM
  const language = aiLanguageName(lang)
  return [
    'You write the body of a report for a public office or a company.',
    'Expand each item of the given outline into report sentences.',
    'Rules:',
    `- Write in ${language}, whatever language the outline is in: 1 or 2 short, plain report sentences per item.`,
    '- Do not invent figures, organisation names or dates that the outline does not give; write in general terms instead.',
    '- Output one line per item: `{#number} sentence`. No other words, headings, list marks or Markdown.',
    '- Use the number given in the outline as it is, and answer every number.',
  ].join('\n')
}

/** A title this long is already a sentence: writing it again only repeats it. */
const SENTENCE_TITLE = 60

/** A source line: a linked topic, a `[n]` entry, a title holding a web address. */
function isReference(node: PanNode): boolean {
  const title = node.title.trim()
  return !!node.href || /^\[\d+\]/.test(title) || /https?:\/\//i.test(title)
}

/**
 * Whether the AI should write sentences for a topic. References, a title that
 * is already a sentence (long, ending like one, or citing a source) and a
 * branch holding nothing but references stay as they are.
 */
export function wantsSentence(node: PanNode): boolean {
  const title = node.title.trim()
  if (!title || isReference(node)) return false
  if (
    title.length >= SENTENCE_TITLE ||
    /[.!?。]$/.test(title) ||
    /\[\d+(?:\s*,\s*\d+)*\]/.test(title)
  )
    return false
  return node.children.length === 0 || !node.children.every(isReference)
}

/**
 * One job per main branch: a whole map in one request is too long for a small model.
 * `lang` is the UI language the sentences are written in (Korean when omitted).
 */
export function fleshOutJobs(outline: PanOutline, lang = 'ko'): FleshOutJob[] {
  const ko = lang === 'ko'
  const system = fleshOutSystem(lang)
  const jobs = outline.nodes.map((branch) => {
    const keys = new Map<string, string>()
    const lines: string[] = []
    let n = 0
    const visit = (node: PanNode, depth: number) => {
      if (!wantsSentence(node)) {
        node.children.forEach((c) => visit(c, depth + 1))
        return
      }
      const id = String(++n)
      keys.set(id, node.key)
      const memo = node.note?.replace(/\s+/g, ' ').slice(0, 300)
      const note = memo ? (ko ? ` (메모: ${memo})` : ` (note: ${memo})`) : ''
      lines.push(`${'  '.repeat(depth)}{#${id}} ${node.title}${note}`)
      node.children.forEach((c) => visit(c, depth + 1))
    }
    visit(branch, 0)
    const user = [
      ko ? `보고서 제목: ${outline.title}` : `Report title: ${outline.title}`,
      outline.note ? (ko ? `보고서 취지: ${outline.note}` : `Purpose: ${outline.note}`) : '',
      '',
      ko ? '개요:' : 'Outline:',
      ...lines,
    ]
      .filter((l, i) => l !== '' || i === 2)
      .join('\n')
    return { branchKey: branch.key, system, user, keys }
  })
  // a branch with nothing to write (only references, say) needs no request
  return jobs.filter((job) => job.keys.size > 0)
}

const ANSWER_LINE = /^\s*(?:[-*•]\s*)?\{#(\d{1,4})\}\s*(.+?)\s*$/

/** Topic key → sentence, from the model's answer; lines it cannot read are skipped. */
export function parseFleshOut(
  answer: string,
  keys: ReadonlyMap<string, string>,
): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of answer.split(/\r?\n/)) {
    const m = ANSWER_LINE.exec(line)
    if (!m) continue
    const key = keys.get(m[1]!)
    const sentence = m[2]!.replace(/^[:：-]\s*/, '').trim()
    if (key && sentence && !out.has(key)) out.set(key, sentence)
  }
  return out
}

/** The outline with the sentences put in as bodies (topics without one keep theirs). */
export function applyBodies(outline: PanOutline, bodies: ReadonlyMap<string, string>): PanOutline {
  const fill = (node: PanNode): PanNode => ({
    ...node,
    body: bodies.get(node.key) ?? node.body,
    children: node.children.map(fill),
  })
  return { ...outline, nodes: outline.nodes.map(fill) }
}
