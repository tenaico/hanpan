// @vitest-environment node
/**
 * The page's Content Security Policy must let the boolean kernel start.
 * manifold-3d's Emscripten bindings (embind) build their call wrappers with
 * `new Function`, which a policy without 'unsafe-eval' refuses ("Evaluating a
 * string as JavaScript violates the following Content Security Policy
 * directive"), so in the app no part was ever computed.
 *
 * Node's --disallow-code-generation-from-strings refuses `eval` and
 * `new Function` the same way such a policy does (WebAssembly still
 * compiles), so the kernel is started in a child Node process with that flag
 * whenever the page's script-src does not allow 'unsafe-eval'.
 */
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const require = createRequire(import.meta.url)

/** The script-src sources of the page's policy. */
function scriptSources(): string[] {
  const html = readFileSync(join(__dirname, '../src/renderer/index.html'), 'utf8')
  const policy = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1]
  if (!policy) throw new Error('index.html has no Content-Security-Policy')
  const directive = policy
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([name]) => name === 'script-src')
  return directive?.slice(1) ?? []
}

describe('the page policy and the boolean kernel', () => {
  it('lets the manifold kernel start (its bindings need eval)', async () => {
    const sources = scriptSources()
    expect(sources).toContain("'wasm-unsafe-eval'")
    const flags = sources.includes("'unsafe-eval'")
      ? []
      : ['--disallow-code-generation-from-strings']
    const manifold = pathToFileURL(require.resolve('manifold-3d')).href
    const script = [
      `const { default: Module } = await import(${JSON.stringify(manifold)})`,
      'const mod = await Module()',
      'mod.setup()',
      'const cube = mod.Manifold.cube([10, 10, 10])',
      'process.stdout.write(String(cube.volume()))',
    ].join('\n')
    const { stdout } = await run(process.execPath, [...flags, '--input-type=module', '-e', script])
    expect(Number(stdout)).toBeCloseTo(1000, 6)
  })
})
