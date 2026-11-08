/**
 * Excel-style status bar statistics preferences: which of the six aggregates
 * the footer shows. Univer's IStatusBarService has no visibility filter, so
 * the installed hook wraps its setState and drops unticked functions before
 * the React footer sees them (an item missing from the values list renders
 * as disabled, i.e. hidden). Click-to-copy and the streamed-file recompute
 * are untouched: both go through the same wrapped setState.
 */
import { IStatusBarService } from '@univerjs/sheets-ui'

import type { UniverRuntime } from './univer-state'

export const STATUS_BAR_FUNCS = ['AVERAGE', 'COUNTA', 'COUNT', 'MIN', 'MAX', 'SUM'] as const
export type StatusBarFunc = (typeof STATUS_BAR_FUNCS)[number]

/** Excel's out-of-the-box ticks: Average, Count, Sum. */
export const DEFAULT_STATUS_BAR_FUNCS: readonly StatusBarFunc[] = ['AVERAGE', 'COUNTA', 'SUM']

export const STATUS_BAR_STATS_STORAGE_KEY = 'sheets.statusBarStats'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readStatusBarFuncs(storage: StorageLike | null | undefined): StatusBarFunc[] {
  try {
    const raw = storage?.getItem(STATUS_BAR_STATS_STORAGE_KEY)
    if (raw === null || raw === undefined) return [...DEFAULT_STATUS_BAR_FUNCS]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_STATUS_BAR_FUNCS]
    return STATUS_BAR_FUNCS.filter((func) => parsed.includes(func))
  } catch {
    return [...DEFAULT_STATUS_BAR_FUNCS]
  }
}

export function writeStatusBarFuncs(
  storage: StorageLike | null | undefined,
  funcs: readonly StatusBarFunc[],
): void {
  try {
    storage?.setItem(STATUS_BAR_STATS_STORAGE_KEY, JSON.stringify(funcs))
  } catch {
    // Storage may be full or disabled; the in-memory choice still applies.
  }
}

export function toggleStatusBarFunc(
  funcs: readonly StatusBarFunc[],
  func: StatusBarFunc,
): StatusBarFunc[] {
  const next = funcs.includes(func) ? funcs.filter((item) => item !== func) : [...funcs, func]
  return STATUS_BAR_FUNCS.filter((item) => next.includes(item))
}

interface StatusBarValue {
  func: string
  value: number
}

interface StatusBarState {
  values: StatusBarValue[]
  pattern: string | null
}

export function filterStatusBarState(
  state: StatusBarState | null,
  enabled: readonly StatusBarFunc[],
): StatusBarState | null {
  if (!state) return null
  return {
    // COUNTA·COUNT는 체크와 상관없이 남긴다: Univer 통계 서비스는 같은 상태에
    // COUNTA > 1, COUNT > 0이 없으면 합계·평균·최소·최대를 버린다(X2: 기본 체크
    // 평균·개수·합계에서 COUNT가 빠져 "개수"만 남았다). 화면에서 숨기는 것은
    // statusBarDisplayItems가 한다.
    values: state.values.filter(
      (item) =>
        item.func === 'COUNTA' ||
        item.func === 'COUNT' ||
        (enabled as readonly string[]).includes(item.func),
    ),
    pattern: state.pattern,
  }
}

export interface StatusBarStatsFilter {
  /** Re-applies the last upstream state after the preference changes. */
  refresh(): void
  dispose(): void
}

export function installStatusBarStatsFilter(
  runtime: UniverRuntime,
  getEnabled: () => readonly StatusBarFunc[],
): StatusBarStatsFilter {
  const service = runtime.univer.__getInjector().get(IStatusBarService) as {
    setState(state: StatusBarState | null): void
  }
  const upstreamSetState = service.setState.bind(service)
  let lastState: StatusBarState | null = null
  service.setState = (state) => {
    lastState = state
    upstreamSetState(filterStatusBarState(state, getEnabled()))
  }
  return {
    refresh() {
      upstreamSetState(filterStatusBarState(lastState, getEnabled()))
    },
    dispose() {
      service.setState = upstreamSetState
    },
  }
}

export interface StatusBarDisplayItem {
  func: StatusBarFunc
  text: string
}

/**
 * 상태 표시줄에 그릴 집계(X2). Univer의 통계 막대는 창 폭이 800px보다 좁다고
 * 판단하면 첫 항목(개수) 하나만 보이고, 이름표도 ko 팩에서 영어("Count")다.
 * 체크된 항목을 Excel 순서(평균·개수·숫자 셀 수·최소·최대·합계)로 모두
 * 앱 언어로 보인다. 값이 없는 항목(빈 선택, 숫자 없는 범위의 평균)은 뺀다.
 */
export function statusBarDisplayItems(
  state: StatusBarState | null,
  enabled: readonly StatusBarFunc[],
  label: (func: StatusBarFunc) => string,
  lang: string,
): StatusBarDisplayItem[] {
  if (!state || state.values.length === 0) return []
  const items: StatusBarDisplayItem[] = []
  for (const func of STATUS_BAR_FUNCS) {
    if (!enabled.includes(func)) continue
    const hit = state.values.find((value) => value.func === func)
    if (!hit || typeof hit.value !== 'number' || !Number.isFinite(hit.value)) continue
    items.push({ func, text: `${label(func)}: ${formatStatusNumber(hit.value, lang)}` })
  }
  return items
}

function formatStatusNumber(value: number, lang: string): string {
  if (Math.abs(value) >= 1e15) return value.toExponential(2)
  try {
    return value.toLocaleString(lang, { maximumFractionDigits: 3 })
  } catch {
    return value.toLocaleString('en', { maximumFractionDigits: 3 })
  }
}

/** 필터를 거친 Univer 통계 상태를 구독한다(상태 표시줄 React 쪽). */
export function subscribeStatusBarState(
  runtime: UniverRuntime,
  listener: (state: StatusBarState | null) => void,
): { dispose(): void } {
  const service = runtime.univer.__getInjector().get(IStatusBarService) as unknown as {
    state$: { subscribe(next: (state: StatusBarState | null) => void): { unsubscribe(): void } }
  }
  const subscription = service.state$.subscribe(listener)
  return { dispose: () => subscription.unsubscribe() }
}

export type { StatusBarState }
