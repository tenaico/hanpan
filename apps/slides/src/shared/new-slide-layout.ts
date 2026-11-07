/**
 * Which layout the ribbon's "New Slide" uses (PowerPoint's rule, 0.17 점검 v2
 * slides-mindmap #10): after a title slide the deck's "Title and Content", after
 * any other slide with placeholders that slide's own layout. Null keeps the old
 * insert (an empty slide on the source slide's layout) — a blank source, or a
 * deck without any content layout.
 */
export interface NewSlideLayoutCandidate {
  path: string
  layoutType: string
  placeholders: readonly unknown[]
}

export function newSlideLayoutPath(
  layouts: readonly NewSlideLayoutCandidate[],
  sourceLayoutPath: string | undefined,
): string | null {
  const source = layouts.find((l) => l.path === sourceLayoutPath)
  if (!source || source.layoutType === 'title') {
    // the list puts the deck's own layouts before the built-in set
    return layouts.find((l) => l.layoutType === 'obj' && l.placeholders.length > 0)?.path ?? null
  }
  return source.placeholders.length > 0 ? source.path : null
}
