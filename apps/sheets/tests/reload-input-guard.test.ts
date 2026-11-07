/**
 * 저장하면 통합 문서를 새 세션으로 다시 연다. 그 사이에 격자에 글자를 치면
 * Univer가 사라진 선택을 읽다가 `Cannot read properties of null (reading 'row')`
 * 를 던지고, 이어서 닫힌 세션 id로 가는 요청이 `Unknown workbook session`으로
 * 줄줄이 실패했다. 다시 여는 동안에는 격자 입력을 막고, 다 열리면 푼다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReloadInputGuard } from '../src/renderer/reload-input-guard'
import { handleSave, type SaveContext } from '../src/renderer/save-actions'
import { createEditJournal, recordSetRangeValues } from '../src/renderer/edit-journal'

function fire(target: EventTarget, type: string): Event {
  const event = new Event(type, { cancelable: true, bubbles: true })
  target.dispatchEvent(event)
  return event
}

describe('reload input guard', () => {
  it('blocks grid input only while a reload holds it', () => {
    const target = new EventTarget()
    // 실제로는 window의 캡처 단계에 걸리므로 격자 리스너보다 먼저 돈다
    const guard = createReloadInputGuard(target, { isGridTarget: () => true })
    const seen = vi.fn()
    target.addEventListener('keydown', seen)

    expect(fire(target, 'keydown').defaultPrevented).toBe(false)
    expect(seen).toHaveBeenCalledTimes(1)

    const release = guard.hold()
    expect(guard.active).toBe(true)
    for (const type of ['keydown', 'beforeinput', 'paste', 'compositionstart', 'pointerdown']) {
      expect(fire(target, type).defaultPrevented).toBe(true)
    }
    // the grid's own listeners never saw the blocked key
    expect(seen).toHaveBeenCalledTimes(1)

    release()
    expect(guard.active).toBe(false)
    expect(fire(target, 'keydown').defaultPrevented).toBe(false)
    expect(seen).toHaveBeenCalledTimes(2)
    guard.dispose()
  })

  it('leaves chrome (AI composer, dialogs) usable during the reload', () => {
    const target = new EventTarget()
    const guard = createReloadInputGuard(target, { isGridTarget: () => false })
    guard.hold()
    expect(fire(target, 'keydown').defaultPrevented).toBe(false)
    guard.dispose()
  })

  it('nests holds, ignores a double release and tells once per hold that input paused', () => {
    const target = new EventTarget()
    const onBlocked = vi.fn()
    const guard = createReloadInputGuard(target, { isGridTarget: () => true, onBlocked })
    const a = guard.hold()
    const b = guard.hold()
    a()
    a()
    expect(guard.active).toBe(true)
    fire(target, 'keydown')
    fire(target, 'keydown')
    expect(onBlocked).toHaveBeenCalledTimes(1)
    b()
    expect(guard.active).toBe(false)
    guard.dispose()
  })

  it('releases by itself when a reload never reports back', () => {
    vi.useFakeTimers()
    try {
      const target = new EventTarget()
      const guard = createReloadInputGuard(target, { isGridTarget: () => true, maxHoldMs: 1000 })
      guard.hold()
      vi.advanceTimersByTime(999)
      expect(guard.active).toBe(true)
      vi.advanceTimersByTime(1)
      expect(guard.active).toBe(false)
      guard.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('save reopen holds input until the reloaded workbook is ready', () => {
  const saveWorkbookEdits = vi.fn()
  beforeEach(() => {
    saveWorkbookEdits.mockReset()
    ;(globalThis as unknown as { window: unknown }).window = {
      desktopApi: { saveWorkbookEdits, writeWorkbookRecovery: vi.fn() },
    }
  })

  function ctxWith(
    openLazyWorkbook: SaveContext['openLazyWorkbook'],
    holdInput: () => () => void,
  ): SaveContext {
    const journal = createEditJournal()
    recordSetRangeValues(journal, 'sheet-1', { 0: { 0: { v: 'edited' } } })
    return {
      univerRef: { current: null },
      stashViewRestore: () => {},
      lazyWorkbookRef: {
        current: {
          editJournal: journal,
          recalc: { timer: null, generation: 0, formulaCells: new Map(), overlay: new Map() },
          flags: { preloadComplete: true },
          file: {
            sessionId: '11111111-1111-4111-8111-111111111111',
            needsSaveAs: false,
            restoredFromRecovery: false,
          },
        },
      } as never,
      setMessage: () => {},
      openLazyWorkbook,
      holdInput,
    }
  }

  it('releases only when the first range of the new session is installed', async () => {
    saveWorkbookEdits.mockResolvedValue({
      canceled: false,
      file: { sessionId: '22222222-2222-4222-8222-222222222222', path: '/tmp/a.xlsx' },
    })
    const release = vi.fn()
    let ready: (() => void) | undefined
    const ctx = ctxWith(
      async (_file, opts) => {
        ready = opts?.onInitialRangeLoaded
        return true
      },
      () => release,
    )

    await handleSave(ctx, 'save')
    expect(release).not.toHaveBeenCalled()
    ready?.()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('releases when the reopen is refused', async () => {
    saveWorkbookEdits.mockResolvedValue({
      canceled: false,
      file: { sessionId: '33333333-3333-4333-8333-333333333333', path: '/tmp/a.xlsx' },
    })
    const release = vi.fn()
    const ctx = ctxWith(
      async () => false,
      () => release,
    )
    await handleSave(ctx, 'save')
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('releases when the reopen throws', async () => {
    saveWorkbookEdits.mockResolvedValue({
      canceled: false,
      file: { sessionId: '44444444-4444-4444-8444-444444444444', path: '/tmp/a.xlsx' },
    })
    const release = vi.fn()
    const ctx = ctxWith(
      async () => {
        throw new Error('boom')
      },
      () => release,
    )
    await handleSave(ctx, 'save')
    expect(release).toHaveBeenCalledTimes(1)
  })
})
