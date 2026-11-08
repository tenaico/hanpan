import { describe, expect, it } from 'vitest'

import {
  DEFAULT_STATUS_BAR_FUNCS,
  filterStatusBarState,
  readStatusBarFuncs,
  statusBarDisplayItems,
  STATUS_BAR_STATS_STORAGE_KEY,
  toggleStatusBarFunc,
  writeStatusBarFuncs,
} from '../src/renderer/status-bar-stats'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

describe('status bar statistics preference', () => {
  it('defaults to Excel ticks (Average, Count, Sum) without a stored value', () => {
    expect(readStatusBarFuncs(memoryStorage())).toEqual(['AVERAGE', 'COUNTA', 'SUM'])
    expect(readStatusBarFuncs(null)).toEqual([...DEFAULT_STATUS_BAR_FUNCS])
  })

  it('ignores corrupt or unknown stored entries', () => {
    expect(readStatusBarFuncs(memoryStorage({ [STATUS_BAR_STATS_STORAGE_KEY]: '{' }))).toEqual([
      ...DEFAULT_STATUS_BAR_FUNCS,
    ])
    expect(
      readStatusBarFuncs(
        memoryStorage({ [STATUS_BAR_STATS_STORAGE_KEY]: '["SUM","MEDIAN","MIN"]' }),
      ),
    ).toEqual(['MIN', 'SUM'])
    expect(readStatusBarFuncs(memoryStorage({ [STATUS_BAR_STATS_STORAGE_KEY]: '[]' }))).toEqual([])
  })

  it('toggles a function on and off, keeping canonical order', () => {
    const on = toggleStatusBarFunc(['AVERAGE', 'SUM'], 'MIN')
    expect(on).toEqual(['AVERAGE', 'MIN', 'SUM'])
    expect(toggleStatusBarFunc(on, 'AVERAGE')).toEqual(['MIN', 'SUM'])
    expect(toggleStatusBarFunc(['SUM'], 'SUM')).toEqual([])
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    writeStatusBarFuncs(storage, ['COUNT', 'MAX'])
    expect(readStatusBarFuncs(storage)).toEqual(['COUNT', 'MAX'])
  })

  it('filters upstream values to the ticked functions and keeps the pattern', () => {
    const state = {
      values: [
        { func: 'COUNTA', value: 3 },
        { func: 'SUM', value: 6 },
        { func: 'MIN', value: 1 },
      ],
      pattern: '0.00',
    }
    // COUNTA/COUNT stay: Univer's status bar service drops SUM/AVERAGE/MIN/MAX
    // unless COUNTA > 1 and COUNT > 0 ride in the same state (the footer hides
    // unticked items itself, statusBarDisplayItems)
    expect(filterStatusBarState(state, ['SUM'])).toEqual({
      values: [
        { func: 'COUNTA', value: 3 },
        { func: 'SUM', value: 6 },
      ],
      pattern: '0.00',
    })
    expect(filterStatusBarState(null, ['SUM'])).toBeNull()
  })

  it('X2: keeps the numeric count the service needs to let Sum and Average through', () => {
    const upstream = {
      values: [
        { func: 'MAX', value: 1800 },
        { func: 'MIN', value: 500 },
        { func: 'SUM', value: 12345 },
        { func: 'COUNTA', value: 12 },
        { func: 'COUNT', value: 12 },
        { func: 'AVERAGE', value: 1028.75 },
      ],
      pattern: null,
    }
    const filtered = filterStatusBarState(upstream, DEFAULT_STATUS_BAR_FUNCS)!
    // Univer's IStatusBarService.setState gate for SUM/AVERAGE/MIN/MAX
    const count = (func: string) => filtered.values.find((v) => v.func === func)?.value ?? 0
    const gated = filtered.values.filter(
      (v) => v.func === 'COUNTA' || (count('COUNTA') > 1 && count('COUNT') > 0),
    )
    expect(gated.map((v) => v.func)).toEqual(['SUM', 'COUNTA', 'COUNT', 'AVERAGE'])
  })
})

describe('statusBarDisplayItems (X2: every ticked aggregate, in the UI language)', () => {
  const labels: Record<string, string> = {
    AVERAGE: '평균',
    COUNTA: '개수',
    COUNT: '숫자 셀 수',
    MIN: '최소값',
    MAX: '최대값',
    SUM: '합계',
  }
  const state = {
    values: [
      { func: 'COUNTA', value: 12 },
      { func: 'SUM', value: 12345.5 },
      { func: 'AVERAGE', value: 1028.7916666666667 },
      { func: 'MAX', value: 3000 },
    ],
    pattern: null,
  }

  it('shows average, count and sum together, Excel order, localized labels', () => {
    const items = statusBarDisplayItems(
      state,
      ['AVERAGE', 'COUNTA', 'SUM'],
      (f) => labels[f]!,
      'ko',
    )
    expect(items.map((item) => item.text)).toEqual([
      '평균: 1,028.792',
      '개수: 12',
      '합계: 12,345.5',
    ])
  })

  it('hides aggregates the selection has no value for and empty selections', () => {
    expect(
      statusBarDisplayItems(state, ['MIN', 'MAX'], (f) => labels[f]!, 'ko').map((i) => i.func),
    ).toEqual(['MAX'])
    expect(statusBarDisplayItems(null, ['SUM'], (f) => labels[f]!, 'ko')).toEqual([])
    expect(
      statusBarDisplayItems({ values: [], pattern: null }, ['SUM'], (f) => labels[f]!, 'ko'),
    ).toEqual([])
  })
})
