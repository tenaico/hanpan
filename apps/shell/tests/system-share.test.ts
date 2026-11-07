// 공유하기: 운영체제 공유 창. Windows는 도우미(win-share.exe)를 띄우고, 저장 안 한 문서는 먼저 저장한다.
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import {
  canShareTab,
  createWindowsShare,
  shareTab,
  windowHandleArg,
  type ShareTabDeps,
  type ShareHelperProcess,
} from '../src/main/share/system-share'

describe('which tabs can be shared', () => {
  it('shares document tabs on Windows and macOS only', () => {
    for (const platform of ['win32', 'darwin'] as const) {
      for (const kind of ['docs', 'sheets', 'slides', 'pdf', 'hwp', 'mindmap', 'photo'] as const)
        expect(canShareTab(platform, kind), `${platform} ${kind}`).toBe(true)
      expect(canShareTab(platform, 'home')).toBe(false)
      expect(canShareTab(platform, 'help')).toBe(false)
    }
    expect(canShareTab('linux', 'docs')).toBe(false)
  })
})

describe('the window handle handed to the helper', () => {
  it('reads a 64-bit HWND as a decimal number', () => {
    const buf = Buffer.alloc(8)
    buf.writeBigUInt64LE(0x1a2b3cn)
    expect(windowHandleArg(buf)).toBe(String(0x1a2b3c))
  })

  it('reads a 32-bit HWND', () => {
    const buf = Buffer.alloc(4)
    buf.writeUInt32LE(4919576)
    expect(windowHandleArg(buf)).toBe('4919576')
  })
})

class FakeHelper extends EventEmitter implements ShareHelperProcess {
  stdout = new PassThrough()
  stdin = new PassThrough()
  killed = false
  kill(): boolean {
    this.killed = true
    return true
  }
  line(json: object): void {
    this.stdout.write(`${JSON.stringify(json)}\n`)
  }
}

describe('the Windows share helper', () => {
  function setup(helperPath: string | null = 'C:\\app\\resources\\share\\win-share.exe') {
    const helpers: FakeHelper[] = []
    const spawn = vi.fn((_cmd: string, _args: string[]) => {
      const helper = new FakeHelper()
      helpers.push(helper)
      return helper
    })
    const share = createWindowsShare({ helperPath: () => helperPath, spawn })
    return { share, spawn, helpers }
  }

  it('starts the helper with the window handle and the files, and answers once the sheet is up', async () => {
    const { share, spawn, helpers } = setup()
    const answer = share('4919576', ['D:\\문서\\보고서.hwpx'])
    expect(spawn).toHaveBeenCalledWith('C:\\app\\resources\\share\\win-share.exe', [
      '4919576',
      'D:\\문서\\보고서.hwpx',
    ])
    helpers[0]!.line({ type: 'shown' })
    await expect(answer).resolves.toEqual({ ok: true })
  })

  it('reports the helper error line', async () => {
    const { share, helpers } = setup()
    const answer = share('1', ['D:\\a.docx'])
    helpers[0]!.line({ type: 'error', code: 'file', message: 'D:\\a.docx: not found' })
    await expect(answer).resolves.toEqual({ ok: false, message: 'D:\\a.docx: not found' })
  })

  it('reports a helper that quits before the sheet is up', async () => {
    const { share, helpers } = setup()
    const answer = share('1', ['D:\\a.docx'])
    helpers[0]!.emit('exit', 4, null)
    await expect(answer).resolves.toMatchObject({ ok: false })
  })

  it('reports a helper that cannot start', async () => {
    const { share, helpers } = setup()
    const answer = share('1', ['D:\\a.docx'])
    helpers[0]!.emit('error', new Error('spawn ENOENT'))
    await expect(answer).resolves.toEqual({ ok: false, message: 'spawn ENOENT' })
  })

  it('reports a build without the helper', async () => {
    const { share, spawn } = setup(null)
    await expect(share('1', ['D:\\a.docx'])).resolves.toMatchObject({ ok: false })
    expect(spawn).not.toHaveBeenCalled()
  })

  it('ends the previous helper when sharing again', async () => {
    const { share, helpers } = setup()
    const first = share('1', ['D:\\a.docx'])
    helpers[0]!.line({ type: 'shown' })
    await first
    void share('1', ['D:\\b.docx'])
    expect(helpers[0]!.killed).toBe(true)
    expect(helpers[1]!.killed).toBe(false)
  })
})

describe('sharing a tab', () => {
  type Doc = { kind: 'docs' | 'home' | 'help'; filePath?: string; dirty: boolean }

  function deps(doc: Doc | undefined, over: Partial<ShareTabDeps> = {}) {
    const state = { doc }
    const d: ShareTabDeps = {
      platform: 'win32',
      document: vi.fn(async () => state.doc),
      fileExists: vi.fn(() => true),
      confirmSave: vi.fn(async () => true),
      save: vi.fn(),
      share: vi.fn(async () => ({ ok: true as const })),
      reportFailure: vi.fn(),
      waitMs: 10,
      timeoutMs: 200,
      ...over,
    }
    return { d, state }
  }

  it('shares the saved file of a clean tab without asking', async () => {
    const { d } = deps({ kind: 'docs', filePath: 'D:\\a.docx', dirty: false })
    await expect(shareTab(d, 't1')).resolves.toBe('shared')
    expect(d.confirmSave).not.toHaveBeenCalled()
    expect(d.share).toHaveBeenCalledWith(['D:\\a.docx'])
  })

  it('saves a tab with unsaved changes first, then shares what was saved', async () => {
    const { d, state } = deps({ kind: 'docs', filePath: 'D:\\a.docx', dirty: true })
    d.save = vi.fn(() => {
      setTimeout(() => (state.doc = { kind: 'docs', filePath: 'D:\\a.docx', dirty: false }), 30)
    })
    await expect(shareTab(d, 't1')).resolves.toBe('shared')
    expect(d.confirmSave).toHaveBeenCalledWith(false)
    expect(d.save).toHaveBeenCalledWith('t1')
    expect(d.share).toHaveBeenCalledWith(['D:\\a.docx'])
  })

  it('asks an untitled tab where to save, and shares the new file', async () => {
    const { d, state } = deps({ kind: 'docs', dirty: true })
    d.save = vi.fn(() => {
      setTimeout(
        () => (state.doc = { kind: 'docs', filePath: 'D:\\새 문서.docx', dirty: false }),
        30,
      )
    })
    await expect(shareTab(d, 't1')).resolves.toBe('shared')
    expect(d.confirmSave).toHaveBeenCalledWith(true)
    expect(d.share).toHaveBeenCalledWith(['D:\\새 문서.docx'])
  })

  it('does nothing when the person declines to save', async () => {
    const { d } = deps(
      { kind: 'docs', filePath: 'D:\\a.docx', dirty: true },
      {
        confirmSave: vi.fn(async () => false),
      },
    )
    await expect(shareTab(d, 't1')).resolves.toBe('canceled')
    expect(d.save).not.toHaveBeenCalled()
    expect(d.share).not.toHaveBeenCalled()
  })

  it('gives up quietly when the save never finishes (the save dialog was cancelled)', async () => {
    const { d } = deps({ kind: 'docs', dirty: true })
    await expect(shareTab(d, 't1')).resolves.toBe('canceled')
    expect(d.share).not.toHaveBeenCalled()
    expect(d.reportFailure).not.toHaveBeenCalled()
  })

  it('stops when the tab is closed while saving', async () => {
    const { d, state } = deps({ kind: 'docs', filePath: 'D:\\a.docx', dirty: true })
    d.save = vi.fn(() => setTimeout(() => (state.doc = undefined), 20))
    await expect(shareTab(d, 't1')).resolves.toBe('canceled')
    expect(d.share).not.toHaveBeenCalled()
  })

  it('tells the person when the file is gone from the disk', async () => {
    const { d } = deps(
      { kind: 'docs', filePath: 'D:\\a.docx', dirty: false },
      {
        fileExists: vi.fn(() => false),
      },
    )
    await expect(shareTab(d, 't1')).resolves.toBe('failed')
    expect(d.reportFailure).toHaveBeenCalledWith('missing', 'D:\\a.docx')
    expect(d.share).not.toHaveBeenCalled()
  })

  it('tells the person when the share sheet does not open', async () => {
    const { d } = deps(
      { kind: 'docs', filePath: 'D:\\a.docx', dirty: false },
      {
        share: vi.fn(async () => ({ ok: false as const, message: 'E_FAIL' })),
      },
    )
    await expect(shareTab(d, 't1')).resolves.toBe('failed')
    expect(d.reportFailure).toHaveBeenCalledWith('failed', 'E_FAIL')
  })

  it('does not share Home, the manual, or anything on a system without a share sheet', async () => {
    await expect(shareTab(deps({ kind: 'home', dirty: false }).d, 'home')).resolves.toBe(
      'unsupported',
    )
    await expect(shareTab(deps({ kind: 'help', dirty: false }).d, 'h')).resolves.toBe('unsupported')
    const linux = deps(
      { kind: 'docs', filePath: 'D:\\a.docx', dirty: false },
      { platform: 'linux' },
    )
    await expect(shareTab(linux.d, 't1')).resolves.toBe('unsupported')
    expect(linux.d.share).not.toHaveBeenCalled()
    await expect(shareTab(deps(undefined).d, 'gone')).resolves.toBe('unsupported')
  })
})
