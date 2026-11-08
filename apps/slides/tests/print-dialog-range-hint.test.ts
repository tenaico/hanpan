// 인쇄 대화상자: 없는 장을 넣으면 문서의 장 범위를 알려 주고, 미리보기 쪽 번호는 읽을 만한 크기다(0.17 UX v2 #29)
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildPrintDocumentHtml } from '../src/shared/print-html'
import { setModuleLang, t } from '../src/renderer/i18n/locale'

const here = dirname(fileURLToPath(import.meta.url))
const dialog = readFileSync(join(here, '..', 'src/renderer/components/PrintDialog.tsx'), 'utf8')

describe('print range hint', () => {
  it('ko text names the slide span', () => {
    setModuleLang('ko')
    expect(t('appPrintRangeOutOfDeck', { n: 5 })).toBe(
      '이 문서는 1~5장입니다. 장 번호를 다시 넣으세요.',
    )
    setModuleLang('zh')
  })
  it('the dialog shows it for a custom range that selects nothing', () => {
    expect(dialog).toContain("t('appPrintRangeOutOfDeck', { n: slides.length })")
  })
  it('preview page badge is at least 14px', () => {
    const html = buildPrintDocumentHtml({
      srcs: ['a', 'b'],
      layout: 'full',
      ratio: 16 / 9,
      preview: true,
    } as never)
    const size = Number(/\.page::after \{[^}]*font-size: (\d+)px/.exec(html)?.[1])
    expect(size).toBeGreaterThanOrEqual(14)
  })
})
