import { describe, expect, it } from 'vitest'
import { dialogTitle } from '../src/renderer/components/dialog-title'

describe('dialogTitle', () => {
  it('drops the menu ellipsis from a dialog title', () => {
    expect(dialogTitle('셀 삽입…')).toBe('셀 삽입')
    expect(dialogTitle('Split Cells...')).toBe('Split Cells')
  })
  it('keeps a title without one', () => {
    expect(dialogTitle('셀 삭제')).toBe('셀 삭제')
  })
})
