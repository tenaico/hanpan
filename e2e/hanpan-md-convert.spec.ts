import { test, expect } from '@playwright/test'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeAndSaveVideo, launchShell, screenshotPath } from './helpers'

/** Hanpan's Markdown converter: one press turns the text into HWP, Word and PDF side by side. */

const MARKDOWN = `# ACP215 홍보영상 3편 — v2 수정 내역

기준본: v1 · 규격: 1920×1080, 편당 45초, 자막 + 배경음악

## 1편 — ACP215 장비 소개

| 요청 | 반영 |
|---|---|
| 장비를 밝고 선명하게, 디스플레이는 확대해 밝게 | 장비 실사 장면 전체의 밝기·대비를 높였습니다. 디스플레이는 화면을 꽉 채우도록 확대했습니다. |
| 중국어 화면 제거 | 중국어 라벨·스티커가 보이는 장면을 빼거나 잘라냈습니다. |

## 2편 — 검사 흐름

- 시료 접수부터 결과 출력까지 한 화면 흐름으로 정리
  - 결과 화면은 3초 더 길게
- 마지막 장면에 로고와 문의처

> ※ 음악은 v1과 동일
`

test('the Markdown converter writes HWP, Word and PDF in one press', async () => {
  test.setTimeout(180_000)
  const out = mkdtempSync(join(tmpdir(), 'hp-md-convert-'))
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-md-convert',
    lang: 'ko',
  })
  const { app, page } = launched
  try {
    // the converter writes to the app's save folder (Documents\Hanpan) by default, not a
    // separate Documents\한판 변환 (5b6aaab4): point Documents at a temp folder
    await app.evaluate(({ app: electronApp }, dir) => electronApp.setPath('documents', dir), out)
    await page.locator('[data-new="md-convert"]').click()
    const dialog = page.locator('[data-hanpan="md-converter"]')
    await expect(dialog).toBeVisible()
    const folder = join(out, 'Hanpan')
    await expect(dialog).toContainText(folder)

    await dialog.locator('[data-hanpan="md-source"]').fill(MARKDOWN)
    const preview = dialog.locator('[data-hanpan="md-preview"]')
    await expect(preview.locator('h1')).toHaveText('ACP215 홍보영상 3편 — v2 수정 내역')
    await expect(preview.locator('table td').first()).toContainText('장비를 밝고 선명하게')
    await expect(dialog.locator('[data-hanpan="md-name"]')).toHaveAttribute(
      'placeholder',
      'ACP215 홍보영상 3편 — v2 수정 내역',
    )
    await page.screenshot({ path: screenshotPath('hanpan-md-convert') })

    for (const format of ['hwp', 'docx', 'pdf'])
      await expect(dialog.locator(`input[data-format="${format}"]`)).toBeChecked()
    await dialog.locator('[data-hanpan="md-convert"]').click()
    const result = dialog.locator('[data-hanpan="md-result"]')
    await expect(result).toContainText('파일 3개를 만들었습니다', { timeout: 120_000 })
    await page.screenshot({ path: screenshotPath('hanpan-md-convert-done') })

    const files = readdirSync(folder).sort()
    expect(files).toEqual([
      'ACP215 홍보영상 3편 — v2 수정 내역.docx',
      'ACP215 홍보영상 3편 — v2 수정 내역.hwp',
      'ACP215 홍보영상 3편 — v2 수정 내역.pdf',
    ])
    expect(readFileSync(join(folder, files[2]!)).subarray(0, 5).toString()).toBe('%PDF-')
    copyFileSync(
      join(folder, files[2]!),
      screenshotPath('hanpan-md-convert').replace(/\.png$/, '.pdf'),
    )

    // a second press never overwrites
    await dialog.locator('[data-hanpan="md-convert"]').click()
    await expect(result.locator('.hp-conv-file').first()).toContainText('(2)', { timeout: 120_000 })
  } finally {
    await closeAndSaveVideo(launched)
    rmSync(out, { recursive: true, force: true })
  }
})
