import { test, expect } from '@playwright/test'
import {
  closeAndSaveVideo,
  launchShell,
  screenshotPath,
  stubAiReady,
  waitForPageWithUrl,
} from './helpers'

/**
 * Hanpan design board with AI: the helper on the right makes an editable
 * poster from a request, fills a template's own text boxes, and a picked text
 * box is rewritten from the quick bar under it. The statuses say Claude is
 * ready and `ai:stream` is a scripted stub: no real program runs and no
 * subscription limit is spent (docs/standards.md).
 */

const POSTER = [
  'KICKER: ○○초등학교',
  'TITLE: 2026 학부모 설명회',
  'SUBTITLE: 새 교육과정을 함께 나눕니다',
  'BODY: 학부모님을 초대합니다. 아이들의 한 해를 함께 그려 봐요.',
  'ITEM: 일시 | 2026. 11. 20.(목) 19:00',
  'ITEM: 장소 | 본관 3층 강당',
  'FOOTER: ○○초등학교장',
  'MOOD: calm',
].join('\n')

const FILL = 'T1: 시청 나눔 모임\nT2: 겨울 나눔 바자회\n12월 5일 오후 2시'

test('the design board makes, fills and rewrites with the AI helper', async () => {
  test.setTimeout(180_000)
  const launched = await launchShell({
    onboardingSeen: true,
    videoDir: 'hanpan-design-ai',
    lang: 'ko',
  })
  const { app, page } = launched
  try {
    await stubAiReady(app)
    await app.evaluate(
      ({ ipcMain }, replies) => {
        const asked: string[] = []
        ;(globalThis as { designAiAsked?: string[] }).designAiAsked = asked
        ipcMain.removeHandler('ai:stream')
        ipcMain.handle(
          'ai:stream',
          (event, request: { requestId: string; system: string; tools?: unknown[] }) => {
            asked.push(request.system)
            const send = (chunk: Record<string, unknown>) =>
              event.sender.send('ai:stream-chunk', { requestId: request.requestId, ...chunk })
            // the answer arrives in pieces, as a real stream would
            const reply = request.system.includes('T번호')
              ? replies.fill
              : request.system.includes('TITLE:')
                ? replies.poster
                : '"함께 그리는 우리 아이의 한 해"'
            for (const part of reply.match(/[\s\S]{1,40}/g) ?? [])
              send({ type: 'delta', text: part })
            send({ type: 'done' })
          },
        )
      },
      { poster: POSTER, fill: FILL },
    )

    await page.locator('[data-hanpan="design"]').click()
    const board = await waitForPageWithUrl(app, 'design.html')
    // the helper is open on the right when the board opens, one click away from the top bar after
    const ai = board.locator('[data-hanpan="design-ai"]')
    await expect(ai).toBeVisible({ timeout: 30_000 })
    await expect(board.locator('[data-action="design-ai-open"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const input = ai.locator('.ai-input-box textarea')
    const send = ai.locator('.ai-send-btn')

    // nothing written: nothing to send; an example fills the composer
    await expect(send).toBeDisabled()
    await ai.locator('.dz-ai-chip').first().click()
    await expect(input).toHaveValue(/학부모 설명회/)

    await input.fill('11월 20일 저녁 7시 본관 강당 학부모 설명회 안내문')
    await ai.locator('[data-hanpan="design-ai-format"]').selectOption('a4')
    await send.click()
    const pageEl = board.locator('.dz-stage .dz-page')
    await expect(pageEl.locator('.dz-text', { hasText: '2026 학부모 설명회' })).toBeVisible()
    await expect(
      pageEl.locator('.dz-text', { hasText: '□ 일시: 2026. 11. 20.(목) 19:00' }),
    ).toBeVisible()
    await expect(pageEl.locator('.dz-text', { hasText: '○○초등학교장' })).toBeVisible()
    await expect(ai.locator('[data-ai-turn="make"] .dz-ai-note')).toContainText('새로 만들었습니다')
    await expect(input).toHaveValue('')
    // the calm mood's page colour and the board's name follow the brief
    await expect(pageEl).toHaveCSS('background-color', 'rgb(255, 253, 247)')
    await expect(board.locator('.dz-name input')).toHaveValue('2026 학부모 설명회')
    await board.screenshot({ path: screenshotPath('hanpan-design-ai') })

    // the subtitle picked: its properties come forward, and the quick bar rewrites it in place
    await pageEl.locator('.dz-text', { hasText: '새 교육과정을 함께 나눕니다' }).click()
    await expect(board.locator('[data-props="text"]')).toBeVisible()
    const quick = board.locator('[data-hanpan="design-ai-quick"]')
    await expect(quick).toBeVisible()
    await quick.locator('[data-ai-quick="catchy"]').click()
    await expect(
      pageEl.locator('.dz-text', { hasText: '함께 그리는 우리 아이의 한 해' }),
    ).toBeVisible()
    await expect(board.locator('[data-props="text"] textarea')).toHaveValue(
      '함께 그리는 우리 아이의 한 해',
    )
    await board.screenshot({ path: screenshotPath('hanpan-design-ai-rewrite') })
    // nothing picked: the helper comes back; Ctrl+Z brings the old line back
    await board.keyboard.press('Escape')
    await board.locator('.dz-stage-wrap').click({ position: { x: 5, y: 5 } })
    await expect(ai).toBeVisible()
    await board.keyboard.press('Control+z')
    await expect(
      pageEl.locator('.dz-text', { hasText: '새 교육과정을 함께 나눕니다' }),
    ).toBeVisible()

    // every turn went out with no tools, and the rewrite asked for a catchier line
    const asked = await app.evaluate(
      () => (globalThis as { designAiAsked?: string[] }).designAiAsked ?? [],
    )
    expect(asked).toHaveLength(2)
    expect(asked[1]).toContain('눈길')

    // a template, filled with the person's own words: the layout stays, the words change.
    // The AI-made poster is unsaved, so the template asks 저장 / 저장 안 함 / 취소 first (be79a2e4)
    await app.evaluate(({ dialog }) => {
      const state = globalThis as { designUnsavedAsked?: string[] }
      state.designUnsavedAsked = []
      dialog.showMessageBox = (async (...args: unknown[]) => {
        const options = args[args.length - 1] as { message?: string }
        state.designUnsavedAsked!.push(options.message ?? '')
        return { response: 1, checkboxChecked: false }
      }) as typeof dialog.showMessageBox
    })
    await board.locator('[data-tab="templates"]').click()
    await board.locator('[data-template="event-poster"]').click()
    await expect
      .poll(() =>
        app.evaluate(
          () => (globalThis as { designUnsavedAsked?: string[] }).designUnsavedAsked ?? [],
        ),
      )
      .toEqual(['디자인을 저장할까요?'])
    // "저장 안 함": the template replaces the page and offers to fill it
    await expect(board.locator('[data-action="design-ai-fill-template"]')).toBeVisible()
    const shapesBefore = await pageEl.locator('.dz-el:not(.dz-text)').count()
    await board.locator('[data-action="design-ai-fill-template"]').click()
    await expect(ai.locator('[data-ai-mode="fill"]')).toHaveAttribute('aria-selected', 'true')
    await expect(ai.locator('[data-hanpan="design-ai-fill-intro"]')).toContainText('글 상자')
    await expect(input).toBeFocused()
    await input.fill('12월 5일 오후 2시 시청 대강당 겨울 나눔 바자회')
    await send.click()
    await expect(pageEl.locator('.dz-text', { hasText: '시청 나눔 모임' })).toBeVisible()
    await expect(pageEl.locator('.dz-text', { hasText: '12월 5일 오후 2시' })).toBeVisible()
    await expect(ai.locator('[data-ai-turn="fill"] .dz-ai-note')).toContainText('글 상자 2개')
    expect(await pageEl.locator('.dz-el:not(.dz-text)').count()).toBe(shapesBefore)
    await board.screenshot({ path: screenshotPath('hanpan-design-ai-fill') })
    // the turn's Undo puts the template's words back
    await ai.locator('[data-action="design-ai-undo"]').click()
    await expect(pageEl.locator('.dz-text', { hasText: '시청 나눔 모임' })).toHaveCount(0)
    await expect(ai.locator('[data-ai-turn="fill"] .dz-ai-note')).toContainText('되돌렸습니다')

    // card news: a request on the card format is a cover plus cards
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('ai:stream')
      ipcMain.handle('ai:stream', (event, request: { requestId: string }) => {
        const text =
          'TITLE: 공문서 작성 규칙\nCARD: 날짜 표기\n- 2026. 10. 30. 처럼 씁니다\nCARD: 항목 번호\n- 1. 가. 1) 가) 순서\nMOOD: vivid'
        event.sender.send('ai:stream-chunk', { requestId: request.requestId, type: 'delta', text })
        event.sender.send('ai:stream-chunk', { requestId: request.requestId, type: 'done' })
      })
    })
    await ai.locator('[data-ai-mode="make"]').click()
    await input.fill('공문서 작성 규칙 카드뉴스')
    await ai.locator('[data-hanpan="design-ai-format"]').selectOption('card')
    await send.click()
    await expect(board.locator('.dz-pages button', { hasText: /^3$/ })).toBeVisible()
    await board.locator('.dz-pages button', { hasText: /^2$/ }).click()
    await expect(pageEl.locator('.dz-text', { hasText: '날짜 표기' })).toBeVisible()
    await board.screenshot({ path: screenshotPath('hanpan-design-ai-cards') })
  } finally {
    await closeAndSaveVideo(launched)
  }
})
