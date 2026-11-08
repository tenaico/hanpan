/**
 * X21: 데이터 유효성·조건부 서식 작업창과 AI 창이 함께 열려 1366에서 시트가
 * 절반으로 줄었다. 좁은 창에서 작업창이 열리면 AI 창을 접고, 작업창이 닫히면
 * 스스로 접었던 경우에만 다시 연다.
 */
import { describe, expect, it } from 'vitest'
import { taskPaneDockStep } from '../src/renderer/task-pane-ai-dock'

describe('taskPaneDockStep', () => {
  it('collapses the AI panel when a task pane opens in a narrow window, and restores it', () => {
    const opened = taskPaneDockStep({
      paneOpen: true,
      aiOpen: true,
      autoCollapsed: false,
      width: 1366,
    })
    expect(opened).toEqual({ setAiOpen: false, autoCollapsed: true })
    const closed = taskPaneDockStep({
      paneOpen: false,
      aiOpen: false,
      autoCollapsed: true,
      width: 1366,
    })
    expect(closed).toEqual({ setAiOpen: true, autoCollapsed: false })
  })

  it('leaves a wide window and a user-closed AI panel alone', () => {
    expect(
      taskPaneDockStep({ paneOpen: true, aiOpen: true, autoCollapsed: false, width: 1920 }),
    ).toEqual({
      autoCollapsed: false,
    })
    expect(
      taskPaneDockStep({ paneOpen: false, aiOpen: false, autoCollapsed: false, width: 1366 }),
    ).toEqual({
      autoCollapsed: false,
    })
  })
})
