import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Where src/main/index.ts runs the security key (plan Task 8): the vault is
 * open before anything reads AI keys, and the gate runs after the
 * single-instance lock and before any window, MCP server or AI settings write.
 */
const source = readFileSync(join(__dirname, '../../src/main/index.ts'), 'utf8')
const at = (needle: string, from = 0) => {
  const i = source.indexOf(needle, from)
  expect(i, needle).toBeGreaterThan(-1)
  return i
}
const ready = at('app.whenReady().then(async () => {')
const lock = at('if (!hasLock) {', ready)
const gate = at('await secureKey.runGate()', ready)

describe('security key wiring', () => {
  it('opens the key quietly right after the codec and before the reveal run', () => {
    const codec = at('setAiSecretCodec(', ready)
    const reveal = at('app.exit(await runRevealEntry(', ready)
    const quiet = at('await secureKey.openQuietly()', ready)
    expect(codec).toBeLessThan(quiet)
    expect(quiet).toBeLessThan(reveal)
    // a normal run opens it right after the lock, before the keys are sealed again
    const afterLock = at('await secureKey.openQuietly()', lock)
    expect(afterLock).toBeLessThan(at('sealStoredAiSettings(', lock))
    expect(afterLock).toBeLessThan(gate)
  })

  it('adoptLocalAi runs after the gate', () => {
    expect(at('hanpan.adoptLocalAi()', ready)).toBeGreaterThan(gate)
  })

  it('runs the gate after the single-instance lock and before any window', () => {
    expect(gate).toBeGreaterThan(lock)
    expect(gate).toBeGreaterThan(at('nativeTheme.themeSource = currentTheme()', ready))
    expect(gate).toBeLessThan(at('configureQuickLookWindow(', ready))
    expect(gate).toBeLessThan(at('startMcpFromSettings(currentMcpSettings())', ready))
    expect(gate).toBeLessThan(at('  createShellWindow()\n', ready))
    // a failed gate shows an error and ends the app instead of leaving a process with no window
    const block = source.slice(gate - 400, gate + 600)
    expect(block).toMatch(/try \{/)
    expect(block).toContain('dialog.showErrorBox(')
    expect(block).toContain('app.quit()')
  })

  it('closes the gate window only once the shell window exists', () => {
    const shell = at('  createShellWindow()\n', gate)
    expect(at('secureKey.closeWindow()', gate)).toBeGreaterThan(shell)
  })

  it('a second launch during the gate queues its files', () => {
    const handler = at("app.on('second-instance'")
    const body = source.slice(handler, source.indexOf('\n})', handler))
    expect(body).toContain('secureKey?.pending()')
    expect(body).toContain('pendingLaunchPaths')
    expect(body).toContain('focusSecureKeyWindow()')
    expect(body.indexOf('secureKey?.pending()')).toBeLessThan(body.indexOf('revealShellWindow()'))
  })

  it('reads the four build values from the environment', () => {
    const config = readFileSync(join(__dirname, '../../electron.vite.config.ts'), 'utf8')
    for (const name of [
      'HANPAN_REQUIRE_KEY',
      'HANPAN_KEY_REQUIRED_FROM',
      'HANPAN_KEY_SERVER',
      'HANPAN_KEY_PUBKEYS',
    ]) {
      expect(config).toContain(`__${name}__: JSON.stringify(process.env.${name} ?? '')`)
    }
  })
})
