/**
 * Outline → slides: the central topic is the cover, every main branch one slide
 * (its title), the topics under it the slide's bullets (indented by depth), and
 * the notes the speaker notes. The shape matches the shell's slide outline
 * (`apps/shell/src/main/mcp/pptx-outline.ts`) so the same deck builder runs it.
 */
import { splitTrailingUrl } from './blocks'
import type { PanNode, PanOutline } from './outline'

export interface SlidePlanParagraph {
  text: string
  bullet?: 'char' | undefined
  level?: number | undefined
  bold?: boolean | undefined
  /** the topic the paragraph came from */
  key?: string | undefined
}

export interface SlidePlan {
  title: string
  /** the topic the slide came from (the central topic for the cover) */
  key: string
  paragraphs: SlidePlanParagraph[]
  notes: string
  /**
   * The branch's own words, when the title is not them (the AI wrote the title):
   * what the contents slide lists and what the slide's section is found by
   */
  section?: string | undefined
  /**
   * The AI's takeaway for the slide, which some styles set in a box. '' when the
   * AI wrote the slide without one; absent when it did not write the slide (the
   * styles then take the first line of the notes).
   */
  takeaway?: string | undefined
}

/** A slide holds this many bullet lines before the rest go to a continuation slide. */
export const MAX_BULLETS_PER_SLIDE = 9

function notesOf(node: { note?: string | undefined; body?: string | undefined }): string {
  return [node.body, node.note].filter((s): s is string => !!s && s.trim() !== '').join('\n\n')
}

/** A topic's words on a slide: a web address written at the end (a source line) is left off. */
function slideText(title: string): string {
  return splitTrailingUrl(title)?.head ?? title
}

export function outlineToSlides(
  outline: PanOutline,
  options: { includeNotes?: boolean } = {},
): SlidePlan[] {
  const includeNotes = options.includeNotes ?? true
  const cover: SlidePlan = {
    title: outline.title,
    key: outline.rootKey,
    paragraphs: outline.nodes.map((n) => ({ text: n.title, bullet: 'char', level: 0, key: n.key })),
    notes: includeNotes ? (outline.note ?? '') : '',
  }
  const slides: SlidePlan[] = [cover]
  for (const branch of outline.nodes) {
    const lines: SlidePlanParagraph[] = []
    const visit = (nodes: readonly PanNode[], level: number) => {
      for (const node of nodes) {
        lines.push({ text: slideText(node.title), bullet: 'char', level, key: node.key })
        visit(node.children, level + 1)
      }
    }
    visit(branch.children, 0)
    const notes = includeNotes
      ? [
          notesOf(branch),
          ...branch.children.map((c) => (notesOf(c) ? `${c.title}: ${notesOf(c)}` : '')),
        ]
          .filter(Boolean)
          .join('\n')
      : ''
    // when the AI wrote a body for a branch with no sub-topics, it becomes the slide's text
    if (!lines.length && branch.body) lines.push({ text: branch.body, key: branch.key })
    for (
      let start = 0, part = 0;
      start < Math.max(lines.length, 1);
      start += MAX_BULLETS_PER_SLIDE, part++
    ) {
      slides.push({
        title: part === 0 ? branch.title : `${branch.title} (계속)`,
        key: branch.key,
        paragraphs: lines.slice(start, start + MAX_BULLETS_PER_SLIDE),
        notes: part === 0 ? notes : '',
      })
    }
  }
  return slides
}
