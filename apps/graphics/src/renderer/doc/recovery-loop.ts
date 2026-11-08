/**
 * 복구 사본 주기(화면 쪽). 문서에 저장하지 않은 변경이 있는 동안 일정한 간격으로 앱에서
 * 문서를 바꾸지 않고 바이트를 받아(`adapter.recoveryBytes`) main에 넘긴다. main이 프로필의
 * 복구 폴더에 쓰고, 저장이나 "저장 안 함"이 그 사본을 지운다.
 *
 * - 저장이나 AI 실행·빠른 작업이 문서를 쥐고 있는 동안(`busy`)은 그 차례를 건너뛴다.
 *   바이트를 받는 사이에 그런 일이 시작됐으면 받은 바이트도 버린다.
 * - 같은 revision은 두 번 쓰지 않는다. main이 사본을 지웠다고 알리면(`onRecoveryReset`:
 *   저장, "저장 안 함" 뒤 탭이 남음) 다음 차례에 다시 쓴다.
 * - 운영체제가 끝날 때(`onRecoveryCopyNow`)는 기다리지 않고 바로 쓰고 끝났다고 답한다.
 * - 사본에서 연 문서는 저장할 때까지 "바뀜"으로 둔다(`dirty.saveFailed`: 저장만 지우는 표시).
 */
import type { GraphicsAdapter } from '../adapters'
import type { GraphicsApi } from '../../shared/ipc'
import type { DirtyState } from './dirty-state'

/** 사본 간격: 30~60초 사이 */
export const RECOVERY_INTERVAL_MS = 45_000

export interface RecoveryLoopOptions {
  adapter: Pick<GraphicsAdapter, 'recoveryBytes' | 'revision'>
  /** 탭의 바뀜 표시. 사본에서 연 문서는 `saveFailed`로 저장 전까지 바뀜으로 둔다. */
  dirty: Pick<DirtyState, 'current' | 'saveFailed'>
  /** 저장이나 AI 실행이 문서를 쥐고 있다 */
  busy: () => boolean
  api: Pick<
    GraphicsApi,
    | 'writeRecoveryCopy'
    | 'recoveryRestored'
    | 'onRecoveryCopyNow'
    | 'recoveryCopyNowDone'
    | 'onRecoveryReset'
  >
  intervalMs?: number
}

/** 주기를 시작한다. 돌려준 함수로 멈춘다. */
export function startRecoveryLoop(options: RecoveryLoopOptions): () => void {
  const { adapter, dirty, busy, api } = options
  let stopped = false
  let running: Promise<void> | null = null
  /** 마지막으로 쓴 사본의 revision; 모르면 null */
  let written: number | null = null

  const revisionNow = async (): Promise<number | null> => {
    try {
      const revision = await adapter.revision()
      return revision >= 0 ? revision : null
    } catch {
      return null
    }
  }

  const copyOnce = async (urgent: boolean): Promise<void> => {
    if (stopped || !dirty.current()) return
    if (!urgent && busy()) return
    const revision = await revisionNow()
    if (!urgent && revision !== null && revision === written) return
    const copy = await adapter.recoveryBytes()
    // a save or an AI run that started meanwhile may have changed what these bytes are
    if (!copy || stopped || !dirty.current() || (!urgent && busy())) return
    const answer = await api.writeRecoveryCopy({ bytes: copy.bytes, ext: copy.ext })
    if (answer === 'written') written = revision
  }

  const round = (urgent: boolean): Promise<void> => {
    // one round at a time; an urgent request waits for the running one, then copies
    const previous = running ?? Promise.resolve()
    const next = previous
      .then(() => copyOnce(urgent))
      .catch(() => {
        // a failed copy (disk, app) is tried again next round
      })
      .finally(() => {
        if (running === next) running = null
      })
    running = next
    return next
  }

  const timer = setInterval(() => {
    if (!running) void round(false)
  }, options.intervalMs ?? RECOVERY_INTERVAL_MS)

  const offNow = api.onRecoveryCopyNow(() => {
    void round(true).finally(() => api.recoveryCopyNowDone())
  })
  const offReset = api.onRecoveryReset(() => {
    written = null
  })

  void api
    .recoveryRestored()
    .then((restored) => {
      if (restored && !stopped) dirty.saveFailed()
    })
    .catch(() => {})

  return () => {
    stopped = true
    clearInterval(timer)
    offNow()
    offReset()
  }
}
