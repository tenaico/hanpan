import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CAD_ENGINE_VERSION, CAD_FILE_FORMAT, CAD_FILE_VERSION } from '../src/version'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string
}

describe('version', () => {
  it('ties the exported version to package.json', () => {
    expect(CAD_ENGINE_VERSION).toBe(pkg.version)
    expect(CAD_FILE_FORMAT).toBe('hanpan-cad')
    expect(CAD_FILE_VERSION).toBe(1)
  })
})
