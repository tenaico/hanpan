import { koreanDocFeaturesOn, type Lang } from '@genoffice/i18n'
import { readAppSettings, writeAppSetting } from './app-settings'
import {
  HOME_BOARD_SETTING_KEY,
  isBoardValue,
  normalizeHomeBoard,
  resolveHomeBoard,
  type BoardContext,
  type HomeBoard,
} from '../shared/home-board'
import { HOME_LAYOUT_SETTING_KEY } from '../shared/home-layout'

/** what the board's defaults depend on in this run */
export function boardContextFrom(
  lang: Lang,
  storedKoreanDocs: boolean | null,
  trendUrl: string | null,
): BoardContext {
  return {
    korean: lang === 'ko',
    koreanDocs: koreanDocFeaturesOn(storedKoreanDocs, lang),
    trend: trendUrl !== null,
  }
}

/**
 * Home's board as stored, cleaned up; the first read moves 0.18's
 * `homeLayout` over. Whatever the cleanup changed is stored at once, so the
 * next read (and the next version) sees the same board. `homeLayout` is never
 * written.
 */
export function readHomeBoard(path: string, ctx: BoardContext): HomeBoard {
  const settings = readAppSettings(path)
  const stored = settings[HOME_BOARD_SETTING_KEY]
  const board = resolveHomeBoard(stored, settings[HOME_LAYOUT_SETTING_KEY], ctx)
  if (JSON.stringify(board) !== JSON.stringify(stored)) {
    writeAppSetting(path, HOME_BOARD_SETTING_KEY, board)
  }
  return board
}

/**
 * Store a board the renderer sent, cleaned up first; returns what was stored.
 * Anything that is not a board is refused (null) rather than stored as the
 * default board, so a renderer mistake never wipes the person's Home.
 */
export function writeHomeBoard(path: string, raw: unknown, ctx: BoardContext): HomeBoard | null {
  if (!isBoardValue(raw)) return null
  const board = normalizeHomeBoard(raw, ctx)
  writeAppSetting(path, HOME_BOARD_SETTING_KEY, board)
  return board
}
