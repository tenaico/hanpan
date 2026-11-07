import { describe, expect, it } from 'vitest'
import {
  PRINT_MAX_SIDE,
  buildImagePrintHtml,
  fitSheet,
  isPrintSheet,
  paperSheetFor,
  picturePlacement,
  pngSize,
  printPageOptions,
} from '../src/image-print'

/**
 * 그림 인쇄(디자인 보드, AI 포토, AI 일러스트): 내보내기와 같은 그림을 용지에
 * 놓는 규칙과, 미리보기와 인쇄가 함께 쓰는 HTML.
 */

describe('paperSheetFor: a design page at the export resolution', () => {
  it('prints an A4 poster (1240×1754 at 150 dpi) on A4 at its own size, no margin', () => {
    expect(paperSheetFor(1240, 1754, 150)).toEqual({ widthMm: 210, heightMm: 297, marginMm: 0 })
  })

  it('knows a landscape paper too', () => {
    expect(paperSheetFor(1754, 1240, 150)).toEqual({ widthMm: 297, heightMm: 210, marginMm: 0 })
  })

  it('fits a screen format (card news, thumbnail) onto A4 in its own orientation', () => {
    expect(paperSheetFor(1080, 1080, 150)).toEqual(fitSheet(1080, 1080))
    expect(paperSheetFor(1280, 720, 150)).toEqual({ widthMm: 297, heightMm: 210, marginMm: 10 })
    expect(paperSheetFor(1080, 1920, 150)).toEqual({ widthMm: 210, heightMm: 297, marginMm: 10 })
  })
})

describe('fitSheet', () => {
  it('turns A4 the way the picture is, or the way asked', () => {
    expect(fitSheet(3000, 2000)).toEqual({ widthMm: 297, heightMm: 210, marginMm: 10 })
    expect(fitSheet(2000, 3000)).toEqual({ widthMm: 210, heightMm: 297, marginMm: 10 })
    expect(fitSheet(3000, 2000, 'portrait')).toEqual({ widthMm: 210, heightMm: 297, marginMm: 10 })
  })
})

describe('picturePlacement', () => {
  it('fills the sheet exactly when the picture is the paper', () => {
    const place = picturePlacement(1240, 1754, { widthMm: 210, heightMm: 297, marginMm: 0 })
    expect(place.widthMm).toBeCloseTo(210, 0)
    expect(place.heightMm).toBeCloseTo(297, 0)
  })

  it('keeps the aspect inside the margins, centred', () => {
    const place = picturePlacement(2000, 1000, { widthMm: 210, heightMm: 297, marginMm: 10 })
    expect(place.widthMm).toBeCloseTo(190, 5)
    expect(place.heightMm).toBeCloseTo(95, 5)
    expect(place.leftMm).toBeCloseTo(10, 5)
    expect(place.topMm).toBeCloseTo((297 - 95) / 2, 5)
  })
})

describe('buildImagePrintHtml', () => {
  const sheet = { widthMm: 210, heightMm: 297, marginMm: 10 }
  const html = buildImagePrintHtml(
    [
      { src: 'data:image/png;base64,AAAA', width: 1000, height: 2000 },
      { src: 'data:image/png;base64,BBBB', width: 2000, height: 1000 },
    ],
    sheet,
  )

  it('sets the paper and one page per picture', () => {
    expect(html).toContain('@page { size: 210mm 297mm; margin: 0; }')
    expect(html.match(/class="page"/g)).toHaveLength(2)
    expect(html).toContain('src="data:image/png;base64,AAAA"')
    expect(html).toContain('src="data:image/png;base64,BBBB"')
  })

  it('runs nothing and fetches nothing but its own pictures', () => {
    expect(html).toContain("default-src 'none'")
    expect(html).not.toMatch(/<script/i)
  })

  it('never puts a picture address that is not a picture into the page', () => {
    expect(() =>
      buildImagePrintHtml([{ src: 'https://x/y.png', width: 1, height: 1 }], sheet),
    ).toThrow()
    expect(() =>
      buildImagePrintHtml(
        [{ src: 'data:image/png;base64,A"><script>', width: 1, height: 1 }],
        sheet,
      ),
    ).toThrow()
  })

  it('adds a screen look only for the preview', () => {
    expect(html).not.toContain('zoom')
    const preview = buildImagePrintHtml(
      [{ src: 'blob:file:///1234', width: 1, height: 1 }],
      sheet,
      { previewZoom: 0.5 },
    )
    expect(preview).toContain('zoom: 0.5')
  })
})

describe('printPageOptions: what the system print dialog is told', () => {
  it('names A4 and its turn', () => {
    expect(printPageOptions({ widthMm: 210, heightMm: 297, marginMm: 0 })).toEqual({
      pageSize: 'A4',
      landscape: false,
    })
    expect(printPageOptions({ widthMm: 297, heightMm: 210, marginMm: 10 })).toEqual({
      pageSize: 'A4',
      landscape: true,
    })
  })

  it('gives any other size in microns', () => {
    expect(printPageOptions({ widthMm: 100, heightMm: 150, marginMm: 0 })).toEqual({
      pageSize: { width: 100_000, height: 150_000 },
      landscape: false,
    })
  })
})

describe('isPrintSheet', () => {
  it('takes only a sane paper', () => {
    expect(isPrintSheet({ widthMm: 210, heightMm: 297, marginMm: 10 })).toBe(true)
    expect(isPrintSheet({ widthMm: 0, heightMm: 297, marginMm: 10 })).toBe(false)
    expect(isPrintSheet({ widthMm: 210, heightMm: 297, marginMm: 200 })).toBe(false)
    expect(isPrintSheet(null)).toBe(false)
  })
})

it('asks for a picture big enough for A4 at 300 dpi', () => {
  expect(PRINT_MAX_SIDE).toBeGreaterThanOrEqual(3508)
})

describe('pngSize', () => {
  const png = (w: number, h: number) => {
    const bytes = new Uint8Array(33)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
    new DataView(bytes.buffer).setUint32(16, w)
    new DataView(bytes.buffer).setUint32(20, h)
    return bytes
  }

  it('reads the size from the PNG header', () => {
    expect(pngSize(png(3000, 2000))).toEqual({ width: 3000, height: 2000 })
  })

  it('answers null for anything else', () => {
    expect(pngSize(new Uint8Array([1, 2, 3]))).toBeNull()
    expect(pngSize(png(0, 10))).toBeNull()
    const jpeg = png(10, 10)
    jpeg[0] = 0xff
    expect(pngSize(jpeg)).toBeNull()
  })
})
