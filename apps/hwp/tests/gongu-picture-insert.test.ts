/**
 * 0.17.1 #15: a Gongu picture picked from the HWP editor's Picture choice goes in at the caret
 * with its credit line under it, and the line goes into the picture credits list at the end of
 * the document: as the AI's Gongu pictures do in this editor and as the Word editor's picker
 * does (apps/docs/src/renderer/gongu-insert.ts).
 */
import { describe, expect, it, vi } from 'vitest'
import { creditListTitle } from '@genoffice/hanpan-core/renderer'
import type { GonguPicked } from '@genoffice/ui'
import { insertGonguPicture } from '../src/renderer/hanpan/gongu-picture'

// a 1×1 PNG and a 1×1 WebP
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const WEBP = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
const LINE = '「호작도」, 저작자 미상 / 출처: 공유마당(한국저작권위원회), 만료저작물'
const PLACE = { sec: 0, para: 2, offset: 0, length: 0 }

function picked(dataUrl: string, width = 1200, height = 800): GonguPicked {
  return {
    dataUrl,
    width,
    height,
    title: '호작도',
    credit: {} as GonguPicked['credit'],
    creditLine: LINE,
    creditListTitle: creditListTitle('ko'),
  }
}

function bridge(text = '본문') {
  return {
    insertPictureAtCaret: vi.fn(async () => ({ ok: true as const, inTable: false, place: PLACE })),
    readText: vi.fn(async () => text),
    insertParagraphs: vi.fn(async () => ({ ok: true as const, place: PLACE })),
  }
}

describe('a Gongu picture from the Picture choice', () => {
  it('goes in at the caret with its credit line, and the line into the list at the end', async () => {
    const b = bridge()
    expect(await insertGonguPicture(b as never, picked(`data:image/png;base64,${PNG}`), 'ko')).toBe(
      true,
    )
    expect(b.insertPictureAtCaret).toHaveBeenCalledWith(PNG, 300, 1200, 800, 'png', LINE)
    // no list yet: one is started at the end, its title then the line
    expect(b.insertParagraphs).toHaveBeenCalledWith('', null, 'end', [creditListTitle('ko'), LINE])
  })

  it('keeps a tall picture within 300 pt high', async () => {
    const b = bridge()
    await insertGonguPicture(b as never, picked(`data:image/png;base64,${PNG}`, 800, 1600), 'ko')
    expect(b.insertPictureAtCaret).toHaveBeenCalledWith(PNG, 150, 800, 1600, 'png', LINE)
  })

  it('keeps a small picture its own size on the page (96 px to the inch)', async () => {
    const b = bridge()
    await insertGonguPicture(b as never, picked(`data:image/jpeg;base64,${PNG}`, 200, 100), 'ko')
    expect(b.insertPictureAtCaret).toHaveBeenCalledWith(PNG, 150, 200, 100, 'png', LINE)
  })

  it('turns a picture the document cannot hold (WebP) into PNG first', async () => {
    const b = bridge()
    const toPng = vi.fn(async () => PNG)
    await insertGonguPicture(b as never, picked(`data:image/webp;base64,${WEBP}`), 'ko', toPng)
    expect(toPng).toHaveBeenCalledWith(`data:image/webp;base64,${WEBP}`)
    expect(b.insertPictureAtCaret).toHaveBeenCalledWith(PNG, 300, 1200, 800, 'png', LINE)
  })

  it('answers false and lists nothing when the picture did not go in', async () => {
    const b = bridge()
    b.insertPictureAtCaret.mockResolvedValueOnce({ ok: false, reason: 'has_objects' } as never)
    expect(await insertGonguPicture(b as never, picked(`data:image/png;base64,${PNG}`), 'ko')).toBe(
      false,
    )
    expect(b.insertParagraphs).not.toHaveBeenCalled()
  })
})
