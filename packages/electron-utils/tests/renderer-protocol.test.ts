import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

let handler: ((request: Request) => Promise<Response> | Response) | null = null

vi.mock('electron', () => ({
  protocol: {
    handle: (_scheme: string, fn: (request: Request) => Promise<Response> | Response) => {
      handler = fn
    },
    registerSchemesAsPrivileged: vi.fn(),
  },
  net: {
    fetch: async () =>
      new Response('<p>page</p>', { status: 200, headers: { 'content-type': 'text/html' } }),
  },
}))

import { installRendererProtocol } from '../src/renderer-protocol'

let dir = ''
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
  handler = null
})

function rendererRoot(): string {
  dir = mkdtempSync(join(tmpdir(), 'renderer-protocol-'))
  mkdirSync(join(dir, 'web'))
  writeFileSync(join(dir, 'web', 'index.html'), '<p>page</p>')
  return dir
}

describe('installRendererProtocol', () => {
  it('adds the headers the option returns, keeping the body and type', async () => {
    const root = rendererRoot()
    const headers = vi.fn((host: string) =>
      host === 'illust' ? { 'content-security-policy': "frame-ancestors 'self'" } : undefined,
    )
    installRendererProtocol({ illust: root }, { headers })
    const response = await handler!(new Request('genoffice-app://illust/web/index.html'))
    expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'self'")
    expect(response.headers.get('content-type')).toBe('text/html')
    expect(await response.text()).toBe('<p>page</p>')
    expect(headers).toHaveBeenCalledWith('illust', join(root, 'web', 'index.html'))
  })

  it('serves as before without the option', async () => {
    const root = rendererRoot()
    installRendererProtocol({ illust: root })
    const response = await handler!(new Request('genoffice-app://illust/web/index.html'))
    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(response.status).toBe(200)
  })

  it('answers 404 for a file the allow option refuses, without reading it', async () => {
    const root = rendererRoot()
    const allow = vi.fn((host: string) => host !== 'illust')
    installRendererProtocol({ illust: root, 'illust-app': root }, { allow })
    const refused = await handler!(new Request('genoffice-app://illust/web/index.html'))
    expect(refused.status).toBe(404)
    const served = await handler!(new Request('genoffice-app://illust-app/web/index.html'))
    expect(served.status).toBe(200)
    expect(allow).toHaveBeenCalledWith('illust', join(root, 'web', 'index.html'))
  })
})
