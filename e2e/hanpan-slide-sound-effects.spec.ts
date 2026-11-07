import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { test, expect } from '@playwright/test'
import { closeAndSaveVideo, launchShell, screenshotPath, waitForPageWithUrl } from './helpers'

/**
 * Hanpan: Insert › Sound effects puts a bundled CC BY sound on the slide, and
 * the saved pptx carries the sound with its credit as the audio's name.
 */
test('a bundled sound effect lands in the pptx with its credit', async () => {
  test.setTimeout(180_000)
  const dir = await mkdtemp(join(tmpdir(), 'hanpan-e2e-'))
  const deckPath = join(dir, '발표.pptx')
  await writeFile(deckPath, '')
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-slide-sounds',
    openFile: deckPath,
  })
  const { app } = launched
  try {
    const slides = await waitForPageWithUrl(app, '://slides/')
    await slides.locator('.ribbon-tab', { hasText: /^(Insert|삽입)$/ }).click()
    // a window too narrow for the whole Insert tab folds the Media group first into one
    // "Media ▾" button (4e92491f); Sound Effects is inside it then
    const mediaFold = slides.locator('[data-rbgroup="media"] .rb-big', {
      hasText: /^(Media|미디어)$/,
    })
    if (await mediaFold.isVisible()) await mediaFold.click()
    await slides.locator('.rb-big', { hasText: /^(Sound Effects|효과음)$/ }).click()
    await expect(slides.locator('.rb-sound-item')).toHaveCount(6)
    await expect(slides.locator('.rb-sound-credit')).toContainText('CC BY')
    await slides.screenshot({ path: screenshotPath('hanpan-slide-sound-effects') })
    await slides.locator('[data-sound="celebrate"]').click()
    await expect(slides.locator('.rb-sound-list')).toBeHidden()

    const before = (await stat(deckPath)).size
    await app.evaluate(({ webContents }) => {
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().includes('://slides/'))
        ?.send('slides:menu', 'save')
    })
    await expect
      .poll(async () => (await stat(deckPath)).size, { timeout: 15_000 })
      .toBeGreaterThan(before)
    const zip = await JSZip.loadAsync(await readFile(deckPath))
    const media = Object.keys(zip.files).filter((name) => /^ppt\/media\/.*\.mp3$/.test(name))
    expect(media).toHaveLength(1)
    const slideXml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    expect(slideXml).toContain('국악 효과음 #209 — 주식회사 아이티앤, 공유마당, CC BY')
  } finally {
    await closeAndSaveVideo(launched)
  }
})
