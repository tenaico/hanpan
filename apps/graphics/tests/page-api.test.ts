import { afterEach, describe, expect, it, vi } from 'vitest'
import { appFrameUrl, withTimeout } from '../src/renderer/frame/page-api'
import { copyBytes, base64ToBytes, bytesToBase64 } from '../src/renderer/frame/bytes'

afterEach(() => vi.useRealTimers())

describe('withTimeout', () => {
  it('rejects with the label when the call takes too long', async () => {
    vi.useFakeTimers()
    const slow = withTimeout(new Promise(() => {}), 100, 'inspect')
    const check = expect(slow).rejects.toThrow('inspect timed out')
    await vi.advanceTimersByTimeAsync(150)
    await check
  })
})

describe('the frame address', () => {
  it('opens the app in embedded mode with its language', () => {
    expect(appFrameUrl('illust', 'ko')).toBe('./web/illust/index.html?embedded=hanpan&lang=ko')
    expect(appFrameUrl('photo', 'zh')).toBe('./web/photo/index.html?embedded=hanpan&lang=en')
  })

  it('in the installed app the web build runs on its own origin, apart from the host page', () => {
    const packaged = { protocol: 'genoffice-app:' }
    expect(appFrameUrl('photo', 'ko', packaged)).toBe(
      'genoffice-app://photo-app/web/photo/index.html?embedded=hanpan&lang=ko',
    )
    expect(appFrameUrl('illust', 'ko', packaged)).toBe(
      'genoffice-app://illust-app/web/illust/index.html?embedded=hanpan&lang=ko',
    )
  })
})

describe('bytes', () => {
  it('copyBytes never shares memory with its input', () => {
    const source = new Uint8Array([1, 2, 3])
    const copy = copyBytes(source)
    source[0] = 9
    expect([...copy]).toEqual([1, 2, 3])
  })

  it('base64 round trips', () => {
    const bytes = new Uint8Array([0, 255, 10, 128])
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([0, 255, 10, 128])
  })
})
