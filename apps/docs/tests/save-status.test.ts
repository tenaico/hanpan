// 저장 후 다시 고치면 상태줄에서 "저장됨"이 사라지고 "저장 안 됨"이 보여야 한다(0.17 리뷰 #1)
import { describe, expect, it } from 'vitest'
import { saveStatusView } from '../src/renderer/save-status'

const saved = '저장됨'
const autoSavedTemplate = '자동 저장됨 ({time})'

describe('saveStatusView', () => {
  it('keeps the save message while the document is clean', () => {
    expect(saveStatusView(saved, false, saved, autoSavedTemplate)).toEqual({
      message: saved,
      unsaved: false,
    })
  })

  it('drops a stale save message once the document is dirty again', () => {
    expect(saveStatusView(saved, true, saved, autoSavedTemplate)).toEqual({
      message: '',
      unsaved: true,
    })
    expect(
      saveStatusView('자동 저장됨 (오후 3:04:05)', true, saved, autoSavedTemplate).message,
    ).toBe('')
  })

  it('keeps unrelated status messages while dirty', () => {
    expect(saveStatusView('구역 나누기를 삽입했습니다', true, saved, autoSavedTemplate)).toEqual({
      message: '구역 나누기를 삽입했습니다',
      unsaved: true,
    })
  })
})

describe('saveStatusView first-use hints', () => {
  const hint = '빈 문서를 만들었습니다. 오른쪽 AI 패널에 만들 내용을 적어 보세요'
  it('drops the new-document hint once the user starts typing', () => {
    expect(saveStatusView(hint, false, saved, autoSavedTemplate, [hint]).message).toBe(hint)
    expect(saveStatusView(hint, true, saved, autoSavedTemplate, [hint]).message).toBe('')
  })
})
