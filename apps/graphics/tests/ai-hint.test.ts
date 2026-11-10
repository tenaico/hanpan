import { beforeEach, describe, expect, it } from 'vitest'
import { AI_HINT_KEY, takeAiHint } from '../src/renderer/doc/ai-hint'

beforeEach(() => localStorage.clear())

describe('the one-time .ai note', () => {
  it('is for the first .vectorcraft save of a new illustration only', () => {
    expect(takeAiHint('illust', { hadFile: false, format: 'vectorcraft' })).toBe(true)
    expect(localStorage.getItem(AI_HINT_KEY)).toBe('1')
    expect(takeAiHint('illust', { hadFile: false, format: 'vectorcraft' })).toBe(false)
  })

  it('is not for the photo tab, an existing file, or another format', () => {
    expect(takeAiHint('photo', { hadFile: false, format: 'vectorcraft' })).toBe(false)
    expect(takeAiHint('illust', { hadFile: true, format: 'vectorcraft' })).toBe(false)
    expect(takeAiHint('illust', { hadFile: false, format: 'ai' })).toBe(false)
    expect(takeAiHint('illust', { hadFile: false, format: 'svg' })).toBe(false)
    expect(localStorage.getItem(AI_HINT_KEY)).toBeNull()
  })

  it('stays quiet when storage cannot remember it (it would repeat every save)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(takeAiHint('illust', { hadFile: false, format: 'vectorcraft' }, broken)).toBe(false)
  })
})
