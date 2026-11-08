import { describe, expect, it } from 'vitest'
import { graphicsRequestAllowed, graphicsResponseHeaders } from '../src/main/graphics-headers'

describe('graphicsResponseHeaders', () => {
  it('lets only its own host page frame a web app (the app runs on its own origin)', () => {
    expect(
      graphicsResponseHeaders('photo-app', 'C:\\out\\renderer\\web\\photo\\index.html'),
    ).toEqual({ 'content-security-policy': 'frame-ancestors genoffice-app://photo' })
    expect(graphicsResponseHeaders('illust-app', '/out/renderer/web/illust/index.html')).toEqual({
      'content-security-policy': 'frame-ancestors genoffice-app://illust',
    })
  })

  it('leaves the host page, the app files and other hosts alone', () => {
    expect(graphicsResponseHeaders('illust', '/out/renderer/index.html')).toBeUndefined()
    expect(
      graphicsResponseHeaders('illust-app', '/out/renderer/web/illust/app_bg.wasm'),
    ).toBeUndefined()
    expect(graphicsResponseHeaders('docs', '/out/renderer/web/x/index.html')).toBeUndefined()
  })
})

describe('graphicsRequestAllowed', () => {
  it('the host origin serves the host page but never the web app', () => {
    expect(graphicsRequestAllowed('photo', '/out/renderer/index.html')).toBe(true)
    expect(graphicsRequestAllowed('photo', '/out/renderer/assets/index-1.js')).toBe(true)
    expect(graphicsRequestAllowed('photo', '/out/renderer/web/photo/index.html')).toBe(false)
    expect(graphicsRequestAllowed('illust', 'C:\\out\\renderer\\web\\illust\\x.wasm')).toBe(false)
  })

  it('the app origin serves its own web build only', () => {
    expect(graphicsRequestAllowed('photo-app', '/out/renderer/web/photo/index.html')).toBe(true)
    expect(graphicsRequestAllowed('photo-app', '/out/renderer/web/photo/fonts/a.ttf')).toBe(true)
    expect(graphicsRequestAllowed('photo-app', '/out/renderer/web/illust/index.html')).toBe(false)
    expect(graphicsRequestAllowed('photo-app', '/out/renderer/index.html')).toBe(false)
    expect(graphicsRequestAllowed('illust-app', '/out/renderer/assets/index-1.js')).toBe(false)
  })

  it('other hosts are not its business', () => {
    expect(graphicsRequestAllowed('docs', '/out/renderer/web/photo/index.html')).toBe(true)
  })
})
