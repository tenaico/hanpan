// Vietnamese Word ribbon at 1366 px (Hanpan 0.17.1 docs #34): the Insert,
// Review, View and Table Layout tabs ran 17-146 px past the window because of
// long labels, and the table tools were still in English. Measured in the
// built app (scratch script, 1350 px ribbon): with these labels all four fit.
// jsdom cannot lay the ribbon out, so this pins the labels that made the room.
import { afterEach, describe, expect, it } from 'vitest'
import { setModuleLang, t, type StringKey } from '../src/renderer/i18n/locale'

afterEach(() => setModuleLang('zh'))

const SHORTENED: Array<[StringKey, string]> = [
  ['ribbonPicture', 'Ảnh'],
  ['ribbonShapes', 'Hình'],
  ['ribbonTextBox', 'Hộp chữ'],
  ['ribbonEquation', 'Công thức'],
  ['ribbonCrossRef', 'Tham chiếu'],
  ['ribbonProtectDoc', 'Bảo vệ'],
  ['ribbonDarkMode', 'Nền tối'],
  ['ribbonGridlines', 'Lưới'],
  ['ribbonInsertAbove', 'Chèn trên'],
  ['ribbonInsertBelow', 'Chèn dưới'],
  ['ribbonInsertLeft', 'Chèn trái'],
  ['ribbonInsertRight', 'Chèn phải'],
  ['ribbonMergeCells', 'Hợp nhất ô'],
  ['ribbonRowHeight', 'Cao hàng'],
  ['ribbonColumnWidth', 'Rộng cột'],
  ['ribbonDistributeRows', 'Giãn đều hàng'],
  ['ribbonDistributeColumns', 'Giãn đều cột'],
  ['ribbonViewGridlines', 'Hiện lưới'],
]

describe('Vietnamese ribbon labels', () => {
  it('uses the short labels that let the 1366 px ribbon fit', () => {
    setModuleLang('vi')
    for (const [key, label] of SHORTENED) expect(t(key), key).toBe(label)
  })

  it('names the table tools in Vietnamese', () => {
    setModuleLang('vi')
    const en = (key: StringKey) => {
      setModuleLang('en')
      const text = t(key)
      setModuleLang('vi')
      return text
    }
    for (const key of [
      'ribbonTableProperties',
      'ribbonAutoFit',
      'ribbonRepeatHeaderRows',
      'ribbonTableStyleOptions',
      'ribbonTableFirstRow',
    ] as StringKey[]) {
      expect(t(key), key).not.toBe(en(key))
    }
    expect(t('ribbonTableProperties')).toBe('Thuộc tính bảng')
  })
})
