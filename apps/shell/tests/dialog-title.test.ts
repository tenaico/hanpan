import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { installDefaultDialogTitle } from '../src/main/dialog-title'

// 0.17 리뷰 #20: 저장 확인 창 같은 메시지 상자에 제목을 주지 않으면 Windows가 앱 이름
// "Hanpan"(영문)을 쓴다. 제목이 없는 상자는 화면 언어의 제품 이름("한판")을 받는다.
function fakeDialog() {
  return {
    showMessageBox: vi.fn(async (..._args: unknown[]) => ({ response: 0, checkboxChecked: false })),
    showMessageBoxSync: vi.fn((..._args: unknown[]) => 0),
  }
}

describe('message box titles', () => {
  it('fills in the product name when a box has no title, with or without a window', async () => {
    const d = fakeDialog()
    const original = { ...d }
    installDefaultDialogTitle(d, () => '한판')
    const win = { id: 1 }
    await d.showMessageBox(win, { message: '저장할까요?' })
    d.showMessageBoxSync({ message: 'x' })
    expect(original.showMessageBox).toHaveBeenCalledWith(win, {
      message: '저장할까요?',
      title: '한판',
    })
    expect(original.showMessageBoxSync).toHaveBeenCalledWith({ message: 'x', title: '한판' })
  })

  it('keeps a title the caller chose, and asks the name each time (the language can change)', async () => {
    const d = fakeDialog()
    const original = { ...d }
    let name = '한판'
    installDefaultDialogTitle(d, () => name)
    await d.showMessageBox({ message: 'a', title: '업데이트' })
    expect(original.showMessageBox).toHaveBeenLastCalledWith({ message: 'a', title: '업데이트' })
    name = 'Hanpan'
    await d.showMessageBox({ message: 'b' })
    expect(original.showMessageBox).toHaveBeenLastCalledWith({ message: 'b', title: 'Hanpan' })
  })

  it('is installed once, early in the shell main process', () => {
    const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    expect(source).toContain('installDefaultDialogTitle(dialog, () => productName(currentLang()))')
  })
})
