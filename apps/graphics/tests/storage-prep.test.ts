import { beforeEach, describe, expect, it } from 'vitest'
import { clearIllustRecovery, seedPhotoPreferences } from '../src/renderer/frame/storage-prep'

beforeEach(() => localStorage.clear())

describe('seedPhotoPreferences', () => {
  it('sets the interface language and keeps the other preferences', () => {
    localStorage.setItem(
      'photocraft.preferences',
      JSON.stringify({ interface: { language: 'auto', theme: 'dark' }, general: { x: 1 } }),
    )
    seedPhotoPreferences(localStorage, 'ko')
    expect(JSON.parse(localStorage.getItem('photocraft.preferences')!)).toEqual({
      interface: { language: 'ko', theme: 'dark' },
      general: { x: 1 },
    })
  })

  it('replaces unreadable JSON', () => {
    localStorage.setItem('photocraft.preferences', '{nope')
    seedPhotoPreferences(localStorage, 'vi')
    expect(JSON.parse(localStorage.getItem('photocraft.preferences')!)).toEqual({
      interface: { language: 'vi' },
    })
  })
})

describe('clearIllustRecovery', () => {
  it('removes only the recovery keys', () => {
    localStorage.setItem('vectorcraft-recovery/1/a.vectorcraft', 'x')
    localStorage.setItem('vectorcraft-recovery/1/heartbeat', '1')
    localStorage.setItem('vectorcraft.prefs', 'keep')
    expect(clearIllustRecovery(localStorage)).toBe(2)
    expect(Object.keys(localStorage)).toEqual(['vectorcraft.prefs'])
  })
})
