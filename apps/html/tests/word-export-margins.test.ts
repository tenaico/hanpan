import { describe, expect, it } from 'vitest'
import { parseDocx, readSectionSettings } from '@genoffice/docx-engine'
import { generateDocx } from '../../../packages/html2docx/src/generate'
import { HTML_WORD_EXPORT_OPTIONS } from '../src/main/word-export-options'

/**
 * A web page has no print margins of its own: html2docx measured the body's
 * 24px floor and the Word export came out with 0.6cm margins. The editor's
 * export asks for Word's default 2.54cm instead.
 */
describe('HTML → Word export page margins', () => {
  it('gives a flowed page Word’s 2.54 cm margins', async () => {
    const ir = [
      {
        type: 'docsettings',
        viewportWidthPx: 794,
        pageSizePx: { width: 794, height: 1123 },
        marginsPx: { top: 24, bottom: 24, left: 24, right: 24 },
      },
      { type: 'para', runs: [{ text: 'Notice' }] },
    ]
    const docx = new Uint8Array(await generateDocx(ir, {}, HTML_WORD_EXPORT_OPTIONS))
    const parsed = await parseDocx(docx)
    const section = readSectionSettings(parsed)
    for (const twips of [
      section.marginTop,
      section.marginBottom,
      section.marginLeft,
      section.marginRight,
    ]) {
      expect(twips).toBe(1440)
    }
  })
})
