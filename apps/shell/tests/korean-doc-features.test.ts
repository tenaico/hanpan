import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { KOREAN_DOC_FEATURES_KEY, readKoreanDocFeatures } from '../src/main/korean-doc-features'

let dir = ''

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})

/** an app-settings.json holding `content`, or none at all for null */
function settingsWith(content: string | null): string {
  dir = mkdtempSync(join(tmpdir(), 'korean-docs-'))
  const path = join(dir, 'app-settings.json')
  if (content !== null) writeFileSync(path, content)
  return path
}

describe('readKoreanDocFeatures', () => {
  it('reads null when the file or the key is missing', () => {
    expect(readKoreanDocFeatures(settingsWith(null))).toBeNull()
    expect(readKoreanDocFeatures(settingsWith('{}'))).toBeNull()
  })

  it('a stored value wins over the language', () => {
    const on = JSON.stringify({ [KOREAN_DOC_FEATURES_KEY]: true })
    expect(readKoreanDocFeatures(settingsWith(on))).toBe(true)
    expect(readKoreanDocFeatures(settingsWith('{"koreanDocFeatures":false}'))).toBe(false)
  })

  it('ignores a value that is not a boolean', () => {
    expect(readKoreanDocFeatures(settingsWith('{"koreanDocFeatures":"yes"}'))).toBeNull()
  })
})
