import { describe, expect, it } from 'vitest'
import { closePromptDocName } from '../src/main/close-prompt-name'

describe('closePromptDocName', () => {
  it('names a saved document by its file name', () => {
    expect(closePromptDocName('C:\\Users\\me\\사업계획서.docx', '무시')).toBe('사업계획서.docx')
    expect(closePromptDocName('/home/me/plan.docx', '')).toBe('plan.docx')
  })

  it('names an untitled document by its tab title', () => {
    expect(closePromptDocName(null, '새 문서 1')).toBe('새 문서 1')
  })

  it('returns null when nothing names the document', () => {
    expect(closePromptDocName(null, '   ')).toBeNull()
    expect(closePromptDocName(undefined, undefined)).toBeNull()
  })
})
