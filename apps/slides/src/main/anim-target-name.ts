/**
 * 애니메이션 창에 보이는 대상 이름. PowerPoint가 붙인 기본 이름("Title 1", "Rectangle 3")은
 * 화면 언어의 종류 이름으로 바꾸고, 글이 있으면 첫머리를 붙인다("제목 1: 2026년 …").
 * 사용자가 직접 붙인 이름은 그대로 둔다.
 */
export interface AnimTargetLabels {
  title: string
  subtitle: string
  text: string
  shape: string
  picture: string
  table: string
  chart: string
  group: string
  object: string
}

interface ElLike {
  type: string
  name?: string
  placeholder?: string
  text?: { paragraphs: Array<{ runs: Array<{ text: string }> }> }
}

const MAX_TEXT = 20

// PowerPoint(영문)가 자동으로 붙이는 이름 앞부분 → 종류
const DEFAULT_NAME =
  /^(Title|Subtitle|Text Placeholder|Content Placeholder|Text ?Box|Rectangle|Rounded Rectangle|Oval|Shape|Freeform|Picture|Content|Table|Chart|Group|Graphic|Diagram|Straight Connector|Straight Arrow Connector|Connector|Line)\s+(\d+)$/i

function kindLabel(el: ElLike, word: string, l: AnimTargetLabels): string {
  const w = word.toLowerCase()
  if (w === 'title' || el.placeholder === 'title' || el.placeholder === 'ctrTitle') return l.title
  if (w === 'subtitle' || el.placeholder === 'subTitle') return l.subtitle
  if (w === 'picture') return l.picture
  if (w === 'table') return l.table
  if (w === 'chart') return l.chart
  if (w === 'group') return l.group
  return typeLabel(el, l)
}

function typeLabel(el: ElLike, l: AnimTargetLabels): string {
  switch (el.type) {
    case 'text':
      return l.text
    case 'shape':
      return l.shape
    case 'picture':
      return l.picture
    case 'table':
      return l.table
    case 'chart':
      return l.chart
    case 'group':
      return l.group
    default:
      return l.object
  }
}

function firstText(el: ElLike): string {
  for (const p of el.text?.paragraphs ?? []) {
    const line = p.runs
      .map((r) => r.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (line) return line.length > MAX_TEXT ? `${line.slice(0, MAX_TEXT)}…` : line
  }
  return ''
}

export function animTargetName(el: ElLike, labels: AnimTargetLabels): string {
  const name = el.name?.trim() ?? ''
  const m = DEFAULT_NAME.exec(name)
  const base = m ? `${kindLabel(el, m[1]!, labels)} ${m[2]}` : name || typeLabel(el, labels)
  const text = firstText(el)
  return text ? `${base}: ${text}` : base
}
