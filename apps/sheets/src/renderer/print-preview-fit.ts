/// Print preview sizing and the "does it fit the page" checks behind the
/// Print dialog's warnings (X14).

export type PreviewZoomMode = 'width' | 'page' | 'actual'

/// Room kept for the pane's vertical scroll bar when fitting the width.
const SCROLLBAR_ALLOWANCE_PX = 16
const MIN_ZOOM = 0.05
const MAX_ZOOM = 2

/// Preview scale of a page in a pane. Fitting the width reads at near print
/// size and scrolls down the page; fitting the page shows it whole.
export function previewZoom(
  mode: PreviewZoomMode,
  pane: { readonly width: number; readonly height: number },
  page: { readonly width: number; readonly height: number },
  paddingPx: number,
): number {
  if (mode === 'actual') return 1
  const byWidth = (pane.width - paddingPx - SCROLLBAR_ALLOWANCE_PX) / page.width
  const byHeight = (pane.height - paddingPx) / page.height
  const zoom = mode === 'width' ? byWidth : Math.min(byWidth, byHeight)
  if (!Number.isFinite(zoom)) return MIN_ZOOM
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

interface PagedDocument {
  readonly sheetName: string
  readonly pages: readonly { readonly page: { readonly area: number; readonly colStart: number } }[]
}

/// Sheets whose columns do not fit across one page, so the columns on the
/// right print on further pages.
export function sheetsSplitByColumns(documents: readonly PagedDocument[]): string[] {
  const names: string[] = []
  for (const document of documents) {
    const starts = new Map<number, Set<number>>()
    for (const { page } of document.pages) {
      const set = starts.get(page.area) ?? new Set<number>()
      set.add(page.colStart)
      starts.set(page.area, set)
    }
    if ([...starts.values()].some((set) => set.size > 1)) names.push(document.sheetName)
  }
  return names
}

export interface EdgeOverflow {
  /// Pages whose cells run past the right edge of the printable area.
  readonly pagesPastEdge: number
  /// Cells in the last printed column whose text the cell cuts off (print
  /// cells clip their text; in the middle of a sheet that is the sheet's own
  /// look, in the last column the rest of the text is simply lost).
  readonly clippedCells: number
}

/// Measures the laid-out print document (every page displayed).
export function edgeOverflow(doc: Document): EdgeOverflow {
  let pagesPastEdge = 0
  for (const content of doc.querySelectorAll<HTMLElement>('.page .content')) {
    if (content.scrollWidth > content.clientWidth + 1) pagesPastEdge += 1
  }
  let clippedCells = 0
  for (const row of doc.querySelectorAll('.page tbody tr')) {
    const last = row.lastElementChild as HTMLElement | null
    const box = last?.querySelector<HTMLElement>('.c')
    if (!last || !box) continue
    // Text longer than the cell either runs past it on one line or wraps to
    // a line the row's height hides; the fixed-layout cell clips both.
    const text = box.firstElementChild as HTMLElement | null
    const textWidth = Math.max(box.scrollWidth, text?.scrollWidth ?? 0)
    const textHeight = Math.max(box.scrollHeight, text?.scrollHeight ?? 0)
    if (textWidth > last.clientWidth + 1 || textHeight > box.clientHeight + 1) clippedCells += 1
  }
  return { pagesPastEdge, clippedCells }
}
