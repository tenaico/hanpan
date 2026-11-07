/**
 * 슬라이드 마스터 보기에서 PowerPoint가 마스터·레이아웃에 넣어 두는 영문 안내 글
 * ("Click to edit Master title style", "Second level" …)을 화면 언어로 바꿔 보여 준다.
 * 그리기용 사본만 바꾸고 문서 모델은 건드리지 않는다(파일에는 원래 글이 남는다).
 * 문단 전체가 안내 글과 같을 때만 바꾸며, 여러 run으로 나뉜 경우 첫 run에 모은다.
 */
import type { Slide } from '@genoffice/pptx-engine'

export const MASTER_PROMPTS = [
  'Click to edit Master title style',
  'Click to edit Master subtitle style',
  'Click to edit Master text styles',
  'Second level',
  'Third level',
  'Fourth level',
  'Fifth level',
] as const

export type MasterPrompt = (typeof MASTER_PROMPTS)[number]

interface RunLike {
  text: string
}
interface ParaLike {
  runs: RunLike[]
}
interface ElLike {
  text?: { paragraphs: ParaLike[] }
  children?: ElLike[]
}

function localizeEl<T extends ElLike>(el: T, dict: Partial<Record<string, string>>): T {
  let changed = false
  let text = el.text
  if (text) {
    const paragraphs = text.paragraphs.map((p) => {
      const joined = p.runs.map((r) => r.text).join('')
      const to = p.runs.length ? dict[joined.trim()] : undefined
      if (!to) return p
      changed = true
      return { ...p, runs: p.runs.map((r, i) => ({ ...r, text: i === 0 ? to : '' })) }
    })
    if (changed) text = { ...text, paragraphs }
  }
  let children = el.children
  if (children) {
    const next = children.map((c) => localizeEl(c, dict))
    if (next.some((c, i) => c !== children![i])) {
      children = next
      changed = true
    }
  }
  return changed ? { ...el, ...(text ? { text } : {}), ...(children ? { children } : {}) } : el
}

export function localizeMasterPrompts(slide: Slide, dict: Partial<Record<string, string>>): Slide {
  const elements = (slide.elements as unknown as ElLike[]).map((e) => localizeEl(e, dict))
  if (elements.every((e, i) => e === (slide.elements as unknown as ElLike[])[i])) return slide
  return { ...slide, elements: elements as unknown as Slide['elements'] }
}
