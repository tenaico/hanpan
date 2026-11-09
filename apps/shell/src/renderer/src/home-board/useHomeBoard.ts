import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isBoardValue,
  normalizeHomeBoard,
  type BoardContext,
  type HomeBoard,
  type HomeBoardSource,
} from '../../../shared/home-board'

/**
 * Home's board: read once from main, cleaned up for this screen, changed
 * through `update` and stored after every change. Nothing is drawn before the
 * stored board arrives (plan R4): drawing the default board first would let a
 * change made at launch store it over the board moved from 0.18. When main
 * gives no board (or the read fails) the default board is drawn but not stored
 * until the person changes something, so a passing failure never stores the
 * default board over theirs.
 */
export function useHomeBoard(input: { korean: boolean; koreanDocs: boolean }): {
  board: HomeBoard | null
  context: BoardContext | null
  update: (change: (prev: HomeBoard) => HomeBoard) => void
} {
  const { korean, koreanDocs } = input
  const [source, setSource] = useState<HomeBoardSource | null>(null)
  const [board, setBoard] = useState<HomeBoard | null>(null)
  const current = useRef<HomeBoard | null>(null)
  // whether the board on screen came from main or a change the person made
  const owned = useRef(false)
  const contextRef = useRef<BoardContext | null>(null)

  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice.getHomeBoard?.())
      .then((answer: unknown) => {
        if (!alive) return
        // an older preload or a test double without the method: no stored board
        const value =
          answer && typeof answer === 'object'
            ? (answer as Partial<HomeBoardSource>)
            : { board: null, trendAvailable: false }
        setSource({ board: value.board ?? null, trendAvailable: value.trendAvailable === true })
      })
      .catch(() => {
        if (alive) setSource({ board: null, trendAvailable: false })
      })
    return () => {
      alive = false
    }
  }, [])

  const context = useMemo<BoardContext | null>(
    () => (source ? { korean, koreanDocs, trend: source.trendAvailable } : null),
    [source, korean, koreanDocs],
  )

  const store = useCallback((next: HomeBoard) => {
    // a failed write keeps the change for this session; the next launch shows the stored one
    void Promise.resolve(window.aiOffice.setHomeBoard?.(next)).catch(() => undefined)
  }, [])

  // the stored board on arrival, and the current one again when the screen language or the
  // Korean document features change; stored only when the cleanup changed it
  useEffect(() => {
    if (!source || !context) return
    contextRef.current = context
    const base: unknown = current.current ?? source.board
    const next = normalizeHomeBoard(base, context)
    if (!current.current) owned.current = isBoardValue(source.board)
    current.current = next
    setBoard(next)
    if (owned.current && JSON.stringify(next) !== JSON.stringify(base)) store(next)
  }, [source, context, store])

  const update = useCallback(
    (change: (prev: HomeBoard) => HomeBoard) => {
      const prev = current.current
      const ctx = contextRef.current
      if (!prev || !ctx) return
      const next = normalizeHomeBoard(change(prev), ctx)
      current.current = next
      owned.current = true
      setBoard(next)
      store(next)
    },
    [store],
  )

  return { board, context, update }
}
