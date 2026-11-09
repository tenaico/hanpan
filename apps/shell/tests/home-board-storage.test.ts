import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { boardContextFrom, readHomeBoard, writeHomeBoard } from '../src/main/home-board'
import { defaultHomeBoard, type BoardContext } from '../src/shared/home-board'
import { TREND_FORECAST_URL } from '../src/shared/trend-forecast'

/**
 * The home board in userData/app-settings.json (spec 7.10): read once with the
 * 0.18 layout moved over and stored at once, written only when the renderer
 * sent a board, and never touching `homeLayout`.
 */

const KO: BoardContext = { korean: true, koreanDocs: true, trend: true }

let dir: string
let path: string
const settings = () => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'home-board-'))
  path = join(dir, 'app-settings.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('readHomeBoard', () => {
  const homeLayout = {
    widgets: [{ id: 'memo-1', type: 'memo', size: 'wide', title: '마감', text: '분기 보고' }],
    cardOrder: ['pptx'],
    hiddenCards: [],
    pinnedApps: ['md'],
  }

  it('moves a 0.18 layout over, stores the board and leaves homeLayout alone', () => {
    writeFileSync(path, JSON.stringify({ homeLayout, theme: 'dark' }))
    const board = readHomeBoard(path, KO)
    expect(board.cards.find((c) => c.id === 'memo-1')).toMatchObject({ text: '분기 보고' })
    expect(board.pinned[0]).toBe('pptx')
    const stored = settings()
    expect(stored.homeBoard).toEqual(board)
    expect(stored.homeLayout).toEqual(homeLayout)
    expect(stored.theme).toBe('dark')
  })

  it('gives the same board on the second read', () => {
    writeFileSync(path, JSON.stringify({ homeLayout }))
    const first = readHomeBoard(path, KO)
    expect(readHomeBoard(path, KO)).toEqual(first)
  })

  it('stores the default board when the file is missing', () => {
    expect(readHomeBoard(path, KO)).toEqual(defaultHomeBoard(KO))
    expect(settings().homeBoard).toEqual(defaultHomeBoard(KO))
  })
})

describe('writeHomeBoard', () => {
  it('stores the cleaned-up board and keeps other keys', () => {
    writeFileSync(path, JSON.stringify({ theme: 'dark' }))
    const board = defaultHomeBoard(KO)
    const raw = { ...board, pinned: ['xmind', 'calc'] }
    const stored = writeHomeBoard(path, raw, KO)
    expect(stored?.pinned).toEqual(['xmind'])
    expect(settings()).toEqual({ theme: 'dark', homeBoard: stored })
  })

  it('writes nothing for a value that is not a board', () => {
    const before = JSON.stringify({ theme: 'dark' })
    writeFileSync(path, before)
    expect(writeHomeBoard(path, 'garbage', KO)).toBeNull()
    expect(writeHomeBoard(path, { v: 2, cards: [] }, KO)).toBeNull()
    expect(readFileSync(path, 'utf8')).toBe(before)
  })
})

describe('boardContextFrom', () => {
  it('reads the screen language, the Korean document switch and the forecast address', () => {
    expect(boardContextFrom('ko', null, TREND_FORECAST_URL)).toEqual({
      korean: true,
      koreanDocs: true,
      trend: true,
    })
    expect(boardContextFrom('en', true, null)).toEqual({
      korean: false,
      koreanDocs: true,
      trend: false,
    })
    expect(boardContextFrom('en', null, TREND_FORECAST_URL).koreanDocs).toBe(false)
  })
})
