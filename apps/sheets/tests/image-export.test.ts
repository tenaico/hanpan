/** @vitest-environment jsdom */
/**
 * 시트 그림: 픽셀 배율(보통 2배, 큰 시트는 줄이고 너무 크면 PDF를 권한다)과, 인쇄용 HTML을
 * 그림으로 읽을 수 있는 SVG로 감싸는 일. 캔버스에 그리는 부분은 앱에서 확인한다.
 */
import { describe, expect, it } from 'vitest'

import { MAX_IMAGE_SIDE_PX, imageScaleFor, svgOfHtml } from '../src/renderer/sheet-image'
import { workbookExportImageRequestSchema } from '../src/shared/desktop-api'

describe('imageScaleFor', () => {
  it('draws at twice the size when the picture fits', () => {
    expect(imageScaleFor(800, 600)).toBe(2)
  })

  it('shrinks a large sheet to the largest side a canvas draws', () => {
    expect(imageScaleFor(1000, MAX_IMAGE_SIDE_PX)).toBe(1)
    expect(imageScaleFor(1000, MAX_IMAGE_SIDE_PX * 1.5)).toBeCloseTo(2 / 3, 5)
  })

  it('refuses a sheet that would come out unreadably small', () => {
    expect(imageScaleFor(100, MAX_IMAGE_SIDE_PX * 4)).toBeNull()
  })
})

describe('svgOfHtml', () => {
  it('wraps the page as well-formed XHTML at its size', () => {
    const svg = svgOfHtml(
      '<!doctype html><html><head><style>td{color:red}</style></head><body><table><tr><td>가<br>&amp;</td></tr></table></body></html>',
      300,
      200,
    )
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="300" height="200">/)
    expect(svg).toContain('<foreignObject x="0" y="0" width="300" height="200">')
    expect(svg).toContain('xmlns="http://www.w3.org/1999/xhtml"')
    expect(svg).toContain('<br />')
    expect(svg).toContain('가')
    expect(
      new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror'),
    ).toBeNull()
  })
})

describe('the image request', () => {
  it('carries the PNG bytes and the offered name', () => {
    expect(
      workbookExportImageRequestSchema.safeParse({
        fileName: 'Book-시트1.png',
        png: new Uint8Array([0x89, 0x50]),
      }).success,
    ).toBe(true)
    expect(
      workbookExportImageRequestSchema.safeParse({ fileName: 'a.png', png: 'x' }).success,
    ).toBe(false)
  })
})
