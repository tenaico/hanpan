import { describe, expect, it } from 'vitest'
import { settingsSupportVision } from '../src/browser'
import { defaultAiSettings } from '../src/providers'

describe('settingsSupportVision (shared by slides and the graphics tabs)', () => {
  it('a key provider whose adapter sees images can take a picture', () => {
    const settings = { ...defaultAiSettings(), provider: 'gemini' as const }
    expect(settingsSupportVision(settings)).toBe(true)
  })

  it('auto with nothing connected has no provider to send a picture to', () => {
    const settings = { ...defaultAiSettings(), provider: 'auto' as const }
    expect(settingsSupportVision(settings)).toBe(false)
  })
})
