// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decideSaveTarget } from '../src/shared/save-target'

describe('decideSaveTarget', () => {
  it('writes in place when the format can hold the document', () => {
    expect(
      decideSaveTarget({
        kind: 'photo',
        mode: 'save',
        filePath: '/p/a.png',
        docTitle: 'a.png',
        layered: false,
      }),
    ).toEqual({ action: 'write', path: '/p/a.png', format: 'png' })
  })

  it('asks before saving a layered photo opened from a png, and offers psd', () => {
    expect(
      decideSaveTarget({
        kind: 'photo',
        mode: 'save',
        filePath: '/p/a.png',
        docTitle: 'a.png',
        layered: true,
      }),
    ).toEqual({
      action: 'ask',
      defaultName: 'a.psd',
      defaultFormat: 'psd',
      formats: ['psd', 'png', 'jpg', 'webp', 'tif'],
      reason: 'layered',
    })
  })

  it('a layered psd still saves in place', () => {
    const d = decideSaveTarget({
      kind: 'photo',
      mode: 'save',
      filePath: '/p/a.psd',
      docTitle: 'a.psd',
      layered: true,
    })
    expect(d).toEqual({ action: 'write', path: '/p/a.psd', format: 'psd' })
  })

  it('an untitled illustration asks with .vectorcraft first', () => {
    const d = decideSaveTarget({
      kind: 'illust',
      mode: 'save',
      filePath: null,
      docTitle: 'Untitled-1',
      layered: false,
    })
    expect(d).toEqual({
      action: 'ask',
      defaultName: 'Untitled-1.vectorcraft',
      defaultFormat: 'vectorcraft',
      formats: ['vectorcraft', 'svg', 'ai'],
    })
  })

  it('save as always asks and keeps the current format first', () => {
    const d = decideSaveTarget({
      kind: 'illust',
      mode: 'saveAs',
      filePath: '/p/logo.svg',
      docTitle: 'logo.svg',
      layered: false,
    })
    expect(d).toEqual({
      action: 'ask',
      defaultName: 'logo.svg',
      defaultFormat: 'svg',
      formats: ['svg', 'vectorcraft', 'ai'],
    })
  })

  it('a file the app cannot write is saved as the new-document format', () => {
    const d = decideSaveTarget({
      kind: 'photo',
      mode: 'save',
      filePath: '/p/a.heic',
      docTitle: 'a.heic',
      layered: false,
    })
    expect(d).toMatchObject({ action: 'ask', defaultName: 'a.psd', defaultFormat: 'psd' })
    expect(d).not.toHaveProperty('reason')
  })

  it('keeps an alias extension such as .jpeg for an in-place save', () => {
    expect(
      decideSaveTarget({
        kind: 'photo',
        mode: 'save',
        filePath: '/p/b.JPEG',
        docTitle: 'b.JPEG',
        layered: false,
      }),
    ).toEqual({ action: 'write', path: '/p/b.JPEG', format: 'jpeg' })
  })
})
