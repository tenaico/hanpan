import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startPresenceWatch } from '../../src/main/securekey/watch'

let present: boolean
let serial: string | null
let stop: () => void = () => {}

beforeEach(() => {
  vi.useFakeTimers()
  present = true
  serial = '1a2b3c4d'
})
afterEach(() => {
  stop()
  vi.useRealTimers()
})

const watch = (volumeSerial: string | null, onChange: (p: boolean) => void) => {
  const seenRoots: string[] = []
  stop = startPresenceWatch({
    activationPath: 'E:\\Hanpan\\activation.json',
    volumeSerial,
    serialOf: (root) => {
      seenRoots.push(root)
      return serial
    },
    exists: () => present,
    onChange,
  })
  return seenRoots
}

describe('startPresenceWatch', () => {
  it('reports a removed stick once and its return once', () => {
    const onChange = vi.fn()
    const roots = watch('1a2b3c4d', onChange)
    vi.advanceTimersByTime(2000)
    expect(onChange).not.toHaveBeenCalled()
    present = false
    serial = null
    vi.advanceTimersByTime(2000)
    vi.advanceTimersByTime(2000)
    expect(onChange.mock.calls).toEqual([[false]])
    present = true
    serial = '1a2b3c4d'
    vi.advanceTimersByTime(2000)
    expect(onChange.mock.calls).toEqual([[false], [true]])
    expect(roots[0]).toBe('E:\\')
  })

  it('treats another stick on the same letter as missing', () => {
    const onChange = vi.fn()
    watch('1a2b3c4d', onChange)
    serial = '99999999'
    vi.advanceTimersByTime(2000)
    expect(onChange.mock.calls).toEqual([[false]])
  })

  it('watches only the file for a PC registration', () => {
    const onChange = vi.fn()
    const roots = watch(null, onChange)
    serial = 'anything'
    vi.advanceTimersByTime(2000)
    expect(onChange).not.toHaveBeenCalled()
    present = false
    vi.advanceTimersByTime(2000)
    expect(onChange.mock.calls).toEqual([[false]])
    expect(roots).toEqual([])
  })

  it('stops looking once stopped', () => {
    const onChange = vi.fn()
    watch('1a2b3c4d', onChange)
    stop()
    present = false
    vi.advanceTimersByTime(10_000)
    expect(onChange).not.toHaveBeenCalled()
  })
})
