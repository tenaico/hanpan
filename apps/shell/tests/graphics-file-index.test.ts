import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { extractText } from '../src/main/file-index/extract'

let dir = ''
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})

describe('the file index and graphics files', () => {
  it('a photo file is indexed by name only, not as an error', async () => {
    dir = mkdtempSync(join(tmpdir(), 'graphics-index-'))
    const png = join(dir, 'cat.png')
    writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    expect(await extractText(png)).toEqual({ kind: 'name-only' })
  })

  it('an illustration is indexed by name only', async () => {
    dir = mkdtempSync(join(tmpdir(), 'graphics-index-'))
    const svg = join(dir, 'logo.svg')
    writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg"><text>secret</text></svg>')
    expect(await extractText(svg)).toEqual({ kind: 'name-only' })
  })
})
