import type { PDFDocumentProxy } from 'pdfjs-dist'

/** 이만큼보다 쪽이 많으면 빈 문서인지 따지지 않는다(새로 만든 빈 PDF는 한두 쪽이다) */
const BLANK_CHECK_MAX_PAGES = 3

/** 쪽에 무언가를 그리는 pdf.js 연산 이름. 이 중 하나라도 있으면 빈 쪽이 아니다 */
const DRAWING_OPS = [
  'paintImageXObject',
  'paintInlineImageXObject',
  'paintImageMaskXObject',
  'paintInlineImageXObjectGroup',
  'paintImageXObjectRepeat',
  'paintImageMaskXObjectGroup',
  'paintSolidColorImageMask',
  'paintFormXObjectBegin',
  'fill',
  'eoFill',
  'stroke',
  'fillStroke',
  'eoFillStroke',
  'closeStroke',
  'closeFillStroke',
  'closeEOFillStroke',
  'shadingFill',
  'showText',
  'showSpacedText',
  'nextLineShowText',
  'nextLineSetSpacingShowText',
  'constructPath',
] as const

/** 글자도 그림도 선·면도 없는 쪽인지 */
export function pageLooksBlank({
  textChars,
  fnArray,
  ops,
}: {
  textChars: number
  fnArray: readonly number[]
  ops: Readonly<Record<string, number>>
}): boolean {
  if (textChars > 0) return false
  const drawing = new Set(
    DRAWING_OPS.map((name) => ops[name]).filter((v): v is number => v !== undefined),
  )
  return !fnArray.some((fn) => drawing.has(fn))
}

/**
 * 짧은 문서의 모든 쪽이 비었는지(새로 만든 빈 PDF). 읽다 실패하면 비지 않은 것으로 본다:
 * 이 값은 AI 창의 제안 단추를 숨기는 데만 쓰므로 틀려도 보여 주는 쪽이 안전하다.
 */
export async function documentLooksBlank(
  doc: PDFDocumentProxy,
  ops: Readonly<Record<string, number>>,
): Promise<boolean> {
  if (doc.numPages < 1 || doc.numPages > BLANK_CHECK_MAX_PAGES) return false
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const text = await page.getTextContent()
      const textChars = text.items.reduce(
        (sum, item) => sum + ('str' in item ? item.str.trim().length : 0),
        0,
      )
      if (textChars > 0) return false
      const list = await page.getOperatorList()
      if (!pageLooksBlank({ textChars, fnArray: list.fnArray, ops })) return false
    }
    return true
  } catch {
    return false
  }
}
