/**
 * When the editor writes a crash-recovery copy: only while the drawing has
 * unsaved changes and only when it changed since the last copy; a big drawing
 * only after the user paused; after a failure a few ticks later again; never a
 * copy a save overtook.
 */
import { describe, expect, it, vi } from 'vitest'
import { addShape, createDocument, openCadFile } from '@genoffice/cad-engine'
import {
  RECOVERY_COPY_TIMING,
  RecoveryCopier,
  type RecoveryCopierHost,
} from '../src/renderer/document/recovery-copies'
import { CadSession } from '../src/renderer/document/session'
import type { RecoveryCopyResult } from '../src/shared/ipc'

interface Rig {
  copier: RecoveryCopier
  session: CadSession
  writes: Uint8Array[]
  result: RecoveryCopyResult
  saving: boolean
  triangles: number
  failNext: boolean
  clock: { now: number }
  /** runs while the copy is being handed over */
  duringCopy: (() => void) | null
  edit(): void
}

function rig(timing: Partial<typeof RECOVERY_COPY_TIMING> = {}): Rig {
  const session = new CadSession(createDocument(), { title: 'Untitled Drawing' })
  const state: Rig = {
    copier: null as unknown as RecoveryCopier,
    session,
    writes: [],
    result: 'written',
    saving: false,
    triangles: 0,
    failNext: false,
    clock: { now: 1_000_000 },
    duringCopy: null,
    edit: () => session.history.edit('add', (doc) => addShape(doc, 'box').doc),
  }
  // the real session, with the triangle count a test wants
  vi.spyOn(session, 'triangles').mockImplementation(() => state.triangles)
  const host: RecoveryCopierHost = {
    session: () => session,
    saving: () => state.saving,
    write: async (bytes) => {
      state.duringCopy?.()
      if (state.failNext) {
        state.failNext = false
        throw new Error('disk full')
      }
      state.writes.push(bytes)
      return state.result
    },
  }
  state.copier = new RecoveryCopier(
    host,
    { ...RECOVERY_COPY_TIMING, ...timing },
    () => state.clock.now,
  )
  return state
}

async function until(done: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!done()) {
    if (Date.now() > deadline) throw new Error(`still waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('recovery copies', () => {
  it('count a drawing of more than 200,000 triangles as big', () => {
    expect(RECOVERY_COPY_TIMING.bigTriangles).toBe(200_000)
    expect(RECOVERY_COPY_TIMING.intervalMs).toBe(30_000)
    expect(RECOVERY_COPY_TIMING.idleMs).toBe(2_000)
  })

  it('are written while the drawing has unsaved changes, once per change', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    expect(await r.copier.tick()).toBe('written')
    expect(r.writes).toHaveLength(1)
    // the copy is the bytes a save would write
    expect(openCadFile(r.writes[0]!).status).toBe('ok')
    // nothing changed since: no second copy
    expect(await r.copier.tick()).toBe('unchanged')
    r.edit()
    r.copier.noteChange()
    expect(await r.copier.tick()).toBe('written')
    expect(r.writes).toHaveLength(2)
  })

  it('are not written for a clean drawing', async () => {
    const r = rig()
    r.copier.noteChange()
    expect(await r.copier.tick()).toBe('clean')
    expect(r.writes).toHaveLength(0)
  })

  it('never change the unsaved mark', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    await r.copier.tick()
    expect(r.session.dirty()).toBe(true)
  })

  it('wait for a 2-second pause before copying a big drawing', async () => {
    const r = rig({ idleMs: 40 })
    r.triangles = 200_001
    r.edit()
    r.copier.noteChange()
    r.copier.noteInput()
    expect(await r.copier.tick()).toBe('waiting')
    expect(r.writes).toHaveLength(0)
    // the user stopped: the copy follows by itself once the pause is long enough
    r.clock.now += 50
    await until(() => r.writes.length === 1, 'the copy after the pause')
  })

  it('copy a drawing of exactly 200,000 triangles right away', async () => {
    const r = rig()
    r.triangles = 200_000
    r.edit()
    r.copier.noteChange()
    r.copier.noteInput()
    expect(await r.copier.tick()).toBe('written')
  })

  it('back off after a failure and try again later, never giving up', async () => {
    const r = rig({ backoffTicks: 2 })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    r.edit()
    r.copier.noteChange()
    r.failNext = true
    expect(await r.copier.tick()).toBe('failed')
    expect(await r.copier.tick()).toBe('backoff')
    expect(await r.copier.tick()).toBe('backoff')
    expect(await r.copier.tick()).toBe('written')
    warn.mockRestore()
  })

  it('drop a copy a save overtook', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    r.duringCopy = () => r.copier.noteSave()
    expect(await r.copier.tick()).toBe('dropped')
    r.duringCopy = null
    // the copy did not land: the next tick tries again
    expect(await r.copier.tick()).toBe('written')
  })

  it('do not run during a save', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    r.saving = true
    expect(await r.copier.tick()).toBe('busy')
    expect(r.writes).toHaveLength(0)
  })

  it('count a copy the main process did not keep as not written', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    r.result = 'skipped'
    expect(await r.copier.tick()).toBe('dropped')
    r.result = 'written'
    expect(await r.copier.tick()).toBe('written')
  })

  it('after a reset copy the drawing again though nothing changed', async () => {
    const r = rig()
    r.edit()
    r.copier.noteChange()
    expect(await r.copier.tick()).toBe('written')
    expect(await r.copier.tick()).toBe('unchanged')
    r.copier.reset()
    expect(await r.copier.tick()).toBe('written')
    expect(r.writes).toHaveLength(2)
  })

  it('asked for at once (the OS ends the session) do not wait for a pause', async () => {
    const r = rig()
    r.triangles = 300_000
    r.edit()
    r.copier.noteChange()
    r.copier.noteInput()
    expect(await r.copier.writeNow()).toBe('written')
  })
})
