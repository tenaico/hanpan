import { describe, expect, it, vi } from 'vitest'
import { createUndoTracker, undoRun } from '../src/renderer/ai/undo-tracker'
import { lockFrameInput } from '../src/renderer/ai/input-lock'
import { installFrameAgent, type AgentLink } from '../src/renderer/frame/frame-agent'
import type { HostLink } from '../src/renderer/frame/page-api'

function historyAdapter(start: number) {
  let length = start
  return {
    grow: (n: number) => (length += n),
    adapter: {
      historyLength: vi.fn(async () => length),
      // in these cases the revision moves exactly with the history
      revision: vi.fn(async () => length),
      undo: vi.fn(async (steps: number) => {
        const done = Math.min(steps, length)
        length -= done
        return done
      }),
    },
  }
}

describe('the undo tracker', () => {
  it('reports the history growth as steps', async () => {
    const h = historyAdapter(4)
    const tracker = createUndoTracker(h.adapter)
    await tracker.beforeMutation()
    h.grow(3)
    tracker.noteMutation()
    expect(await tracker.finish()).toEqual({ steps: 3, markerAfter: 7, overflow: false })
  })

  it('returns null when nothing was changed', async () => {
    const tracker = createUndoTracker(historyAdapter(4).adapter)
    expect(await tracker.finish()).toBeNull()
  })

  it('flags overflow when changes ran but the history did not grow (the app keeps a limited history)', async () => {
    const h = historyAdapter(100)
    const tracker = createUndoTracker(h.adapter)
    await tracker.beforeMutation()
    tracker.noteMutation()
    expect(await tracker.finish()).toEqual({ steps: 0, markerAfter: 100, overflow: true })
  })

  it('starts fresh for the next run', async () => {
    const h = historyAdapter(1)
    const tracker = createUndoTracker(h.adapter)
    await tracker.beforeMutation()
    h.grow(1)
    tracker.noteMutation()
    await tracker.finish()
    await tracker.beforeMutation()
    h.grow(2)
    tracker.noteMutation()
    expect(await tracker.finish()).toEqual({ steps: 2, markerAfter: 4, overflow: false })
  })
})

describe('undoRun', () => {
  it('undoes every step of the run', async () => {
    const h = historyAdapter(5)
    expect(await undoRun(h.adapter, { steps: 3, markerAfter: 5, overflow: false })).toBe('undone')
    expect(h.adapter.undo).toHaveBeenCalledWith(3)
  })

  it('refuses when the history changed since the run', async () => {
    const h = historyAdapter(6)
    expect(await undoRun(h.adapter, { steps: 3, markerAfter: 5, overflow: false })).toBe(
      'changed-since',
    )
    expect(h.adapter.undo).not.toHaveBeenCalled()
  })

  it('reports failed when the app refuses part way', async () => {
    const h = historyAdapter(5)
    h.adapter.undo.mockResolvedValueOnce(1)
    expect(await undoRun(h.adapter, { steps: 3, markerAfter: 5, overflow: false })).toBe('failed')
  })
})

describe('lockFrameInput', () => {
  /** the frame's agent behind a direct link (jsdom's postMessage carries no source) */
  function frameWithAgent() {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    const toAgent: ((d: unknown) => void)[] = []
    const host: HostLink = { listen: () => {}, post: (m) => toAgent.forEach((h) => h(m)) }
    const agent: AgentLink = { listen: (h) => void toAgent.push(h), post: () => {} }
    installFrameAgent(frame.contentWindow!, 'vectorcraft', '*', agent)
    return { frame, overlay, host }
  }

  it('blocks keys and pointer events inside the frame until unlocked', () => {
    const { frame, overlay, host } = frameWithAgent()
    const appSaw = vi.fn()
    const doc = frame.contentDocument!
    doc.body.addEventListener('keydown', appSaw)
    doc.body.addEventListener('pointerdown', appSaw)
    const unlock = lockFrameInput(frame, overlay, host)
    expect(overlay.dataset.locked).toBe('true')
    const key = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
    doc.body.dispatchEvent(key)
    doc.body.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
    expect(appSaw).not.toHaveBeenCalled()
    expect(key.defaultPrevented).toBe(true)
    unlock()
    unlock()
    doc.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(appSaw).toHaveBeenCalledTimes(1)
    expect(overlay.dataset.locked).toBeUndefined()
  })
})
