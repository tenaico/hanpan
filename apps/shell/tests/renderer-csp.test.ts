import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Home never reaches the network itself (spec 7.11): the trend forecast comes
 * from the main process over IPC, so the window's CSP keeps connect-src local.
 */

describe('shell window CSP', () => {
  it("keeps connect-src at 'self' and the dev server socket", () => {
    const html = readFileSync(join(__dirname, '../src/renderer/index.html'), 'utf8')
    const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1]
    expect(csp).toBeTruthy()
    const connect = csp!
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('connect-src'))
    expect(connect).toBe("connect-src 'self' ws://localhost:*")
  })
})
