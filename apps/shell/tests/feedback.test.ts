import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import {
  FEEDBACK_STRINGS,
  feedbackMailUrl,
  feedbackDetails,
  feedbackText,
  platformLabel,
} from '../src/main/feedback'

/**
 * Fixed by reading the source (index.ts needs a running Electron): the
 * feedback entry is in whatever Help menu is installed, the survey is the only
 * thing the app opens, and the diagnostics carry version, OS and language and
 * nothing about the user's documents.
 */

describe('feedback strings', () => {
  const keys = Object.keys(FEEDBACK_STRINGS.zh).sort()

  it('fills every key in all 21 languages', () => {
    expect(LANGS).toHaveLength(21)
    for (const lang of LANGS) {
      const dict = FEEDBACK_STRINGS[lang] as Record<string, string>
      expect(Object.keys(dict).sort(), lang).toEqual(keys)
      for (const key of keys) expect(dict[key].trim(), `${lang}.${key}`).not.toBe('')
    }
  })

  it('keeps the details placeholders in every language', () => {
    for (const lang of LANGS) {
      const dict = FEEDBACK_STRINGS[lang] as Record<string, string>
      for (const token of ['{version}', '{os}', '{language}'])
        expect(dict.details, `${lang}.details`).toContain(token)
    }
  })

  it('never types the product name', () => {
    expect(JSON.stringify(FEEDBACK_STRINGS)).not.toMatch(
      /Hanpan|한판|IeumOffice|이음오피스|GenOffice/,
    )
  })
})

describe('the diagnostics block', () => {
  it('carries version, OS and language, and substitutes every placeholder', () => {
    const text = feedbackDetails('en', {
      version: '0.12.1',
      os: 'Windows 10.0.22631',
      language: 'en',
    })
    expect(text).toContain('0.12.1')
    expect(text).toContain('Windows 10.0.22631')
    expect(text).toContain('en')
    expect(text).not.toMatch(/\{[a-z]+\}/)
  })

  it('names the three platforms the desktop app runs on', () => {
    expect(platformLabel('win32')).toBe('Windows')
    expect(platformLabel('darwin')).toBe('macOS')
    expect(platformLabel('linux')).toBe('Linux')
    expect(platformLabel('freebsd')).toBe('freebsd')
  })

  it('uses the same text as the strings the dialog renders', () => {
    expect(feedbackText('ko', 'btnCancel')).toBe(FEEDBACK_STRINGS.ko.btnCancel)
  })
})

describe('the feedback mail', () => {
  it('goes to the contact address with the details in the body', () => {
    const url = feedbackMailUrl('version 1.2.3')
    expect(url).toMatch(/^mailto:ten@tenai\.kr\?subject=/)
    expect(decodeURIComponent(url.split('body=')[1]!)).toContain('version 1.2.3')
  })
})

describe('the OS line of a feedback mail (0.17 review v2 shell #20)', () => {
  it('names Windows 11 by its build, not the kernel version 10.0', async () => {
    const { osLabel } = await import('../src/main/feedback')
    expect(osLabel('win32', '10.0.26300')).toBe('Windows 11 (10.0.26300)')
    expect(osLabel('win32', '10.0.19045')).toBe('Windows 10 (10.0.19045)')
    expect(osLabel('darwin', '24.1.0')).toBe('macOS 24.1.0')
  })
})
