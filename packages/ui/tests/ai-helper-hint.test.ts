import { describe, expect, it } from 'vitest'
import {
  AI_HINT_MAX_SHOWS,
  aiHintWords,
  placeAiHint,
  readAiHintState,
  wantsAiHint,
} from '../src/ai-helper-hint'

describe('the AI helper pointer', () => {
  it('shows a few times, and never again once the button was pressed', () => {
    expect(wantsAiHint(readAiHintState(null))).toBe(true)
    expect(wantsAiHint(readAiHintState('not json'))).toBe(true)
    expect(wantsAiHint({ shows: AI_HINT_MAX_SHOWS - 1, done: false })).toBe(true)
    expect(wantsAiHint({ shows: AI_HINT_MAX_SHOWS, done: false })).toBe(false)
    expect(wantsAiHint(readAiHintState('{"shows":0,"done":true}'))).toBe(false)
    expect(readAiHintState('{"shows":-2,"done":"yes"}')).toEqual({ shows: 0, done: false })
  })

  it('speaks the UI language, English otherwise', () => {
    expect(aiHintWords('ko')).toBe('여기서 AI에게 부탁하세요')
    expect(aiHintWords('zh-TW')).toBe('在這裡請 AI 幫忙')
    expect(aiHintWords('pt-BR')).toBe('Peça à IA aqui')
    expect(aiHintWords('sw')).toBe('Ask the AI here')
    expect(aiHintWords(undefined)).toBe('Ask the AI here')
  })

  const bubble = { width: 160, height: 28 }
  const view = { width: 1200, height: 800 }

  it('sits to the right of a ribbon button, its arrow pointing at it', () => {
    const at = placeAiHint({ left: 10, top: 60, right: 70, bottom: 120 }, bubble, view)
    expect(at).toEqual({ left: 80, top: 76, side: 'right' })
  })

  it('sits to the left of a rail button on the right edge', () => {
    const at = placeAiHint({ left: 1160, top: 300, right: 1196, bottom: 336 }, bubble, view)
    expect(at.side).toBe('left')
    expect(at.left + bubble.width).toBe(1150)
  })

  it('stays inside a narrow window', () => {
    const at = placeAiHint({ left: 10, top: 0, right: 190, bottom: 20 }, bubble, {
      width: 200,
      height: 800,
    })
    expect(at.side).toBe('below')
    expect(at.left).toBeGreaterThanOrEqual(4)
    expect(at.left + bubble.width).toBeLessThanOrEqual(196)
  })
})
