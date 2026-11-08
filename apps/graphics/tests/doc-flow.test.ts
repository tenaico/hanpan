import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAdapter } from '../src/renderer/adapters'
import { watchDoc } from '../src/renderer/doc/doc-watch'
import { createDirtyState } from '../src/renderer/doc/dirty-state'
import { runSave } from '../src/renderer/doc/save-flow'
import type { SaveDeps } from '../src/renderer/doc/save-flow'
import { watchCaptures } from '../src/renderer/doc/capture-watch'
import { openPending } from '../src/renderer/doc/open-flow'
import { FakePage } from './helpers/fake-page'
import { HOST_EXPORT_PREFIX } from '../src/renderer/adapters'

afterEach(() => vi.useRealTimers())

function savingPage(): FakePage {
  const page = new FakePage().withDocument('Untitled-1', true)
  page.handlers['file.save'] = (params, p) => {
    const path = String(params.path)
    p.captured.set(path, new Uint8Array([7, 7]))
    p.documents[0] = { title: path, dirty: false }
    return { path, bytes: 2 }
  }
  return page
}

function saveDeps(page: FakePage, overrides: Partial<SaveDeps> = {}) {
  const setDirty = vi.fn()
  const deps: SaveDeps = {
    adapter: createAdapter('illust', page),
    api: {
      beginSave: vi.fn(async () => ({
        ok: true as const,
        path: 'C:\\art\\logo.svg',
        format: 'svg',
      })),
      commitSave: vi.fn(async (req) => ({ ok: true as const, path: req.path })),
      abortSave: vi.fn(),
    },
    dirty: createDirtyState(setDirty),
    notify: vi.fn(),
    hostOp: { begin: vi.fn(), end: vi.fn() },
    ...overrides,
  }
  return { deps, setDirty }
}

describe('watchDoc', () => {
  it('reports only changes and never runs two inspects at once', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('a.svg', false)
    let release: (() => void) | null = null
    const inspect = page.inspect.bind(page)
    let slow = true
    page.inspect = async () => {
      if (slow) await new Promise<void>((r) => (release = r))
      return inspect()
    }
    const seen: unknown[] = []
    const { stop } = watchDoc(createAdapter('illust', page), (info) => seen.push(info), 100)
    await vi.advanceTimersByTimeAsync(500)
    expect(page.inspects).toBe(0) // the first inspect is still waiting
    slow = false
    release!()
    await vi.advanceTimersByTimeAsync(300)
    page.documents[0]!.dirty = true
    await vi.advanceTimersByTimeAsync(300)
    stop()
    expect(seen).toEqual([
      { hasDocument: true, dirty: false, title: 'a.svg' },
      { hasDocument: true, dirty: true, title: 'a.svg' },
    ])
  })

  it('resync reports the state again even when it did not change (a save cleared the tab in between)', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('a.svg', true)
    const seen: boolean[] = []
    const watch = watchDoc(createAdapter('illust', page), (info) => seen.push(info.dirty), 100)
    await vi.advanceTimersByTimeAsync(150)
    watch.resync()
    await vi.advanceTimersByTimeAsync(150)
    watch.stop()
    expect(seen).toEqual([true, true])
  })
})

describe('runSave', () => {
  it('writes in place when main says so', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    expect(await runSave('save', deps)).toBe(true)
    expect(deps.api.commitSave).toHaveBeenCalledWith({
      bytes: new Uint8Array([7, 7]),
      path: 'C:\\art\\logo.svg',
      format: 'svg',
    })
    expect(page.executed[0]).toEqual(['file.save', { path: 'logo.svg', svg: {} }])
  })

  it('tells the capture watch the name it saved under', async () => {
    const page = savingPage()
    const savedAs = vi.fn()
    const { deps } = saveDeps(page, { savedAs })
    await runSave('save', deps)
    expect(savedAs).toHaveBeenCalledWith('logo.svg')
  })

  it('save as asks main first, then serializes in the chosen format', async () => {
    const page = savingPage()
    const order: string[] = []
    const { deps } = saveDeps(page, {
      api: {
        beginSave: vi.fn(async () => {
          order.push('begin')
          return { ok: true as const, path: '/x/a.ai', format: 'ai' }
        }),
        commitSave: vi.fn(async (req) => {
          order.push('commit')
          return { ok: true as const, path: req.path }
        }),
        abortSave: vi.fn(),
      },
    })
    page.handlers['file.save'] = (params, p) => {
      order.push(`app ${String(params.path)}`)
      p.captured.set(String(params.path), new Uint8Array([1]))
      return { path: params.path, bytes: 1 }
    }
    await runSave('saveAs', deps)
    expect(order).toEqual(['begin', 'app a.ai', 'commit'])
    expect(deps.api.beginSave).toHaveBeenCalledWith({ mode: 'saveAs', layered: false })
  })

  it('an edit made while the save was being written keeps the tab marked changed', async () => {
    const page = savingPage()
    const { deps, setDirty } = saveDeps(page)
    deps.dirty.fromApp(true)
    // the person draws again after the app wrote its bytes, before main finished the write
    deps.api.commitSave = vi.fn(async (req) => {
      page.documents[0] = { title: 'logo.svg', dirty: true }
      return { ok: true as const, path: req.path }
    })
    expect(await runSave('save', deps)).toBe(true)
    expect(deps.dirty.current()).toBe(true)
    // never reported clean in between: a close at that moment must still ask
    expect(setDirty.mock.calls.map(([d]) => d)).not.toContain(false)
  })

  it('a failed write keeps the tab dirty', async () => {
    const page = savingPage()
    const { deps, setDirty } = saveDeps(page)
    deps.dirty.fromApp(true)
    deps.api.commitSave = vi.fn(async () => ({ ok: false as const, error: 'EACCES' }))
    expect(await runSave('save', deps)).toBe(false)
    // the app now says clean (file.save ran), the tab must still say changed
    deps.dirty.fromApp(false)
    expect(deps.dirty.current()).toBe(true)
    expect(setDirty).toHaveBeenLastCalledWith(true)
    expect(deps.notify).toHaveBeenCalledWith('saveFailed')
  })

  it('a canceled dialog leaves the document untouched', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    deps.api.beginSave = vi.fn(async () => ({ ok: true as const, canceled: true as const }))
    expect(await runSave('saveAs', deps)).toBe(false)
    expect(page.executed).toEqual([])
    expect(deps.api.commitSave).not.toHaveBeenCalled()
  })

  it('tells the user when a photo is kept as PSD for its layers', async () => {
    const page = savingPage()
    const { deps } = saveDeps(page)
    deps.api.beginSave = vi.fn(async () => ({
      ok: true as const,
      path: '/p/a.psd',
      format: 'psd',
      reason: 'layered' as const,
    }))
    await runSave('save', deps)
    expect(deps.notify).toHaveBeenCalledWith('layeredSaveNotice')
  })

  it('aborts the save in main when the app fails', async () => {
    const page = savingPage()
    page.handlers['file.save'] = () => {
      throw new Error('boom')
    }
    const { deps } = saveDeps(page)
    expect(await runSave('save', deps)).toBe(false)
    expect(deps.api.abortSave).toHaveBeenCalled()
    expect(deps.hostOp.end).toHaveBeenCalled()
  })
})

describe('saving one at a time', () => {
  it('a second save while one runs waits for it instead of starting another', async () => {
    const { singleFlight } = await import('../src/renderer/doc/single-flight')
    let release!: (v: boolean) => void
    const run = vi.fn(() => new Promise<boolean>((r) => (release = r)))
    const save = singleFlight(run)
    const a = save('save')
    const b = save('saveAs')
    release(true)
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
    // once it settled, the next save runs anew
    const c = save('save')
    expect(run).toHaveBeenCalledTimes(2)
    release(false)
    expect(await c).toBe(false)
  })
})

describe('app calls that never answer', () => {
  it('a save whose app call hangs fails after its time limit and ends the host op', async () => {
    vi.useFakeTimers()
    const page = savingPage()
    page.handlers['file.save'] = () => new Promise(() => {})
    const { deps } = saveDeps(page)
    const result = runSave('save', { ...deps, timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(1500)
    expect(await result).toBe(false)
    expect(deps.hostOp.end).toHaveBeenCalled()
    expect(deps.dirty.current()).toBe(true)
  })

  it('a document watch whose inspect hangs asks again after its time limit', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('a.svg', false)
    const inspect = page.inspect.bind(page)
    let hang = true
    page.inspect = () => (hang ? new Promise(() => {}) : inspect())
    const seen: boolean[] = []
    const watch = watchDoc(createAdapter('illust', page), (i) => seen.push(i.dirty), 100, 500)
    await vi.advanceTimersByTimeAsync(700)
    hang = false
    // the call that started at 600 ms hangs until its limit (1100 ms); the next one answers
    await vi.advanceTimersByTimeAsync(600)
    watch.stop()
    expect(seen).toEqual([false])
  })
})

describe('watchCaptures', () => {
  function setup(busy = false) {
    const page = new FakePage().withDocument('logo.svg', true)
    const onAppSave = vi.fn()
    const onAppExport = vi.fn()
    let isBusy = busy
    const watcher = watchCaptures({
      adapter: createAdapter('illust', page),
      intervalMs: 100,
      busy: () => isBusy,
      hostSaving: () => isBusy,
      onAppSave,
      onAppExport,
      onUnexpectedClean: vi.fn(),
    })
    return { page, watcher, onAppSave, onAppExport, setBusy: (b: boolean) => (isBusy = b) }
  }

  it('an app save (its document file written, then clean) runs the Hanpan save once', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page } = setup()
    await vi.advanceTimersByTimeAsync(150)
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    page.captured.set('logo.svg', new Uint8Array([5, 5]))
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(250)
    expect(onAppSave).toHaveBeenCalledTimes(1)
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('undoing back to the saved state (clean, but no file written) is not a save', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave } = setup()
    await vi.advanceTimersByTimeAsync(150)
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(250)
    expect(onAppSave).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('the app saving a flat picture (its file written, the mark stays on) runs the Hanpan save', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'photo.png' })
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('photo.png', new Uint8Array([1, 2, 3]))
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppSave).toHaveBeenCalledTimes(1)
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('ignores captures while a host save is in flight', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page, setBusy } = setup()
    await vi.advanceTimersByTimeAsync(150)
    setBusy(true)
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    page.captured.set('logo.svg', new Uint8Array([1]))
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(300)
    setBusy(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(onAppSave).not.toHaveBeenCalled()
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('ignores everything while the AI is busy', async () => {
    vi.useFakeTimers()
    const { watcher, onAppSave, onAppExport, page } = setup(true)
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('secret.png', new Uint8Array([1, 2]))
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(500)
    expect(onAppSave).not.toHaveBeenCalled()
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('routes a new export file to the export dialog', async () => {
    vi.useFakeTimers()
    const { watcher, onAppExport, page } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('logo-web.png', new Uint8Array([1, 2, 3]))
    page.captured.set('logo.svg', new Uint8Array([4])) // the document's own save
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppExport).toHaveBeenCalledTimes(1)
    expect(onAppExport).toHaveBeenCalledWith('logo-web.png')
    watcher.stop()
  })

  it('an export again under the same name and size still reaches the export dialog', async () => {
    vi.useFakeTimers()
    const { watcher, onAppExport, page } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set('logo-web.png', new Uint8Array([1, 2, 3, 4]))
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppExport).toHaveBeenCalledTimes(1)
    // the person changes the art and exports once more: same name, same length
    page.captured.set('logo-web.png', new Uint8Array([9, 8, 7, 6]))
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppExport).toHaveBeenCalledTimes(2)
    // nothing new: no third dialog
    await vi.advanceTimersByTimeAsync(300)
    expect(onAppExport).toHaveBeenCalledTimes(2)
    watcher.stop()
  })

  it('files written during a run that ends between two looks are taken in quietly at its end', async () => {
    vi.useFakeTimers()
    const { watcher, onAppExport, page, setBusy } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(150)
    setBusy(true)
    page.captured.set('layer-export.png', new Uint8Array([1, 2, 3]))
    // the run ends before the next look: the host takes in what it wrote, then lets go
    await watcher.absorb()
    setBusy(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('a copy the host had the app write for itself is never read as an export', async () => {
    vi.useFakeTimers()
    const { watcher, onAppExport, page } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    await vi.advanceTimersByTimeAsync(150)
    page.captured.set(`${HOST_EXPORT_PREFIX}1-1.png`, new Uint8Array([1, 2, 3]))
    await vi.advanceTimersByTimeAsync(150)
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('a host save whose file appears while a scan is in flight is not read as an export', async () => {
    vi.useFakeTimers()
    const page = new FakePage().withDocument('Untitled-1', true)
    const onAppExport = vi.fn()
    const files = page.files.bind(page)
    let hold: (() => void) | null = null
    page.files = async () => {
      const list = await files()
      if (hold === null && page.captured.size === 0) await new Promise<void>((r) => (hold = r))
      return page.captured.size ? files() : list
    }
    const watcher = watchCaptures({
      adapter: createAdapter('illust', page),
      intervalMs: 100,
      busy: () => false,
      hostSaving: () => false,
      onAppSave: vi.fn(),
      onAppExport,
      onUnexpectedClean: vi.fn(),
    })
    await vi.advanceTimersByTimeAsync(150) // a scan is waiting on files()
    page.captured.set('new.svg', new Uint8Array([1, 2]))
    const noted = watcher.noteHostSave('new.svg')
    hold?.()
    await noted
    await vi.advanceTimersByTimeAsync(300)
    expect(onAppExport).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('the document turning clean during an AI run keeps the tab marked changed', () => {
    const page = new FakePage().withDocument('a.svg', true)
    const onUnexpectedClean = vi.fn()
    const onAppSave = vi.fn()
    const watcher = watchCaptures({
      adapter: createAdapter('illust', page),
      busy: () => true,
      hostSaving: () => false,
      onAppSave,
      onAppExport: vi.fn(),
      onUnexpectedClean,
    })
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'a.svg' })
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'a.svg' })
    expect(onUnexpectedClean).toHaveBeenCalledTimes(1)
    expect(onAppSave).not.toHaveBeenCalled()
    watcher.stop()
  })

  it('a host save does not read as an app save afterwards', async () => {
    const { watcher, onAppSave } = setup()
    watcher.noteDoc({ hasDocument: true, dirty: true, title: 'logo.svg' })
    await watcher.noteHostSave('logo.svg')
    watcher.noteDoc({ hasDocument: true, dirty: false, title: 'logo.svg' })
    expect(onAppSave).not.toHaveBeenCalled()
    watcher.stop()
  })
})

describe('openPending', () => {
  it('a file main could not read (deleted, locked) is an open failure, not a broken tab', async () => {
    const page = new FakePage()
    const confirm = vi.fn()
    const result = await openPending(
      createAdapter('illust', page),
      async () => {
        throw new Error('EBUSY: resource busy or locked')
      },
      confirm,
    )
    expect(result).toBe('failed')
    expect(page.opened).toEqual([])
    expect(confirm).not.toHaveBeenCalled()
  })

  it('does not confirm a file the app could not open', async () => {
    const page = new FakePage()
    page.openFile = () => Promise.resolve(false)
    const confirm = vi.fn()
    const result = await openPending(
      createAdapter('illust', page),
      async () => ({ name: 'bad.ai', path: '/x/bad.ai', bytes: new Uint8Array([1]) }),
      confirm,
      300,
    )
    expect(result).toBe('failed')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('offers the file again while the app is still starting (PhotoCraft refuses an open before its first frame)', async () => {
    const page = new FakePage()
    const realOpen = page.openFile.bind(page)
    let refusals = 3
    page.openFile = (name, bytes) =>
      refusals-- > 0 ? Promise.resolve(false) : realOpen(name, bytes)
    const confirm = vi.fn()
    const result = await openPending(
      createAdapter('illust', page),
      async () => ({ name: 'cat.png', path: '/x/cat.png', bytes: new Uint8Array([1]) }),
      confirm,
      5_000,
    )
    expect(result).toBe('opened')
    expect(page.opened).toHaveLength(1)
    expect(confirm).toHaveBeenCalledWith('/x/cat.png')
  })

  it('hands the file to the app and waits for the document', async () => {
    const page = new FakePage()
    const bytes = new Uint8Array([1, 2])
    const confirm = vi.fn()
    const result = await openPending(
      createAdapter('illust', page),
      async () => ({ name: 'logo.svg', path: '/x/logo.svg', bytes }),
      confirm,
    )
    expect(result).toBe('opened')
    expect(confirm).toHaveBeenCalledWith('/x/logo.svg')
    expect(page.opened[0]![0]).toBe('logo.svg')
    expect(page.opened[0]![1]).not.toBe(bytes)
  })

  it('does nothing for a new document', async () => {
    const page = new FakePage()
    expect(await openPending(createAdapter('illust', page), async () => null, vi.fn())).toBe('none')
    expect(page.opened).toEqual([])
  })
})
