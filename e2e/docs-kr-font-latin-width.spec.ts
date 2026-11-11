/**
 * Latin text in Korean report fonts keeps proportional widths (Hanpan 0.19.3,
 * Windows 11): a gongmun-theme .docx (HY헤드라인M titles, 휴먼명조 body)
 * opened in AI Docs showed "C h a t G P T" and "2 0 2 6 -1 1" spread out.
 * The missing 휴먼명조 drew Latin from the bundled GenOffice Serif KR, whose
 * CFF charstring widths (what Chromium on Windows lays out with) were hmtx +
 * nominalWidthX: "C" 1.34em instead of 0.708em. The fixture has one
 * paragraph per font (HY헤드라인M, 휴먼명조, 맑은 고딕), left/centered/
 * justified, each "2026-11-11 ChatGPT 11.3% 한글".
 */
import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { launchShell, closeAndSaveVideo, waitForPageWithUrl } from './helpers'

const FIXTURE = join(__dirname, 'assets/kr-font-latin-width.docx')

test('Latin advances in Korean report fonts stay proportional', async () => {
  test.setTimeout(120_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'docs-kr-font-latin-width',
    openFile: FIXTURE,
  })
  const { app } = launched
  try {
    const editor = await waitForPageWithUrl(app, '://docs/')
    await editor.locator('.doc-page p').nth(5).waitFor({ timeout: 30_000 })
    await editor.evaluate(() => document.fonts.ready)
    // per paragraph: the widest Latin/digit/punctuation advance in em
    const report = await editor.evaluate(() =>
      Array.from(document.querySelectorAll('.doc-page p'))
        .slice(0, 6)
        .map((p) => {
          const span = p.querySelector('span')!
          const em = parseFloat(getComputedStyle(span).fontSize)
          const tn = span.firstChild as Text
          const text = tn.data
          let widest = { ch: '', em: 0 }
          for (let i = 0; i < text.length; i++) {
            if (!/[!-~]/.test(text[i])) continue
            const r = document.createRange()
            r.setStart(tn, i)
            r.setEnd(tn, i + 1)
            const w = r.getBoundingClientRect().width / em
            if (w > widest.em) widest = { ch: text[i], em: w }
          }
          return { family: getComputedStyle(span).fontFamily.split(',')[0], ...widest }
        }),
    )
    expect(report).toHaveLength(6)
    for (const r of report) {
      // widest glyph here is "%" (Batang 0.86em, Malgun 0.84em, HY헤드라인M 0.79em);
      // the broken subset drew it at 1.49em
      expect(r.em, `${r.family} "${r.ch}"`).toBeLessThan(0.95)
    }
  } finally {
    await closeAndSaveVideo(launched, 'docs-kr-font-latin-width')
  }
})
