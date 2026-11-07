import { describe, expect, it, vi } from 'vitest'
import { readCompareTarget } from '../src/main/compare-target'

describe('readCompareTarget', () => {
  it('reads the picked file without opening it as a document', async () => {
    const readFile = vi.fn(async () => Buffer.from('PK plain'))
    const result = await readCompareTarget('/docs/plan.docx', {
      readFile,
      isEncrypted: () => false,
      maxBytes: 100,
    })
    expect(result).toEqual({ kind: 'bytes', name: 'plan.docx', bytes: Buffer.from('PK plain') })
    expect(readFile).toHaveBeenCalledWith('/docs/plan.docx')
  })

  it('reports a password-protected file instead of prompting', async () => {
    const result = await readCompareTarget('/docs/secret.docx', {
      readFile: async () => Buffer.from('cfb'),
      isEncrypted: () => true,
      maxBytes: 100,
    })
    expect(result).toEqual({ kind: 'needsPassword', name: 'secret.docx' })
  })

  it('refuses an oversized file and a non-docx path', async () => {
    const deps = {
      readFile: async () => Buffer.alloc(200),
      isEncrypted: () => false,
      maxBytes: 100,
    }
    expect(await readCompareTarget('/docs/big.docx', deps)).toEqual({
      kind: 'tooLarge',
      name: 'big.docx',
    })
    expect(await readCompareTarget('/docs/a.odt', deps)).toBeNull()
  })
})
