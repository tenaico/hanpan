import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import {
  HELP_TOPICS,
  helpHasBody,
  initialHelpTopic,
} from '../src/renderer/src/i18n/help/help-registry'
import { HELP_TITLE_LANGS, topicTitle } from '../src/renderer/src/i18n/help/help-titles'

/**
 * A help link next to a setting (Settings → Skills) opens the manual at its
 * topic: the main process puts the id in the manual's URL and the screen
 * starts there. A missing or unknown id opens the manual as F1 does.
 */
describe('the topic the manual opens at', () => {
  it('starts at the topic the URL names', () => {
    expect(initialHelpTopic('?mode=help&topic=skills')).toBe('skills')
    expect(initialHelpTopic('?mode=help&topic=agent-mode')).toBe('agent-mode')
    expect(initialHelpTopic('?mode=help&topic=cad')).toBe('cad')
  })

  it('falls back to the first topic without a known one', () => {
    expect(initialHelpTopic('?mode=help')).toBe(HELP_TOPICS[0]!.id)
    expect(initialHelpTopic('?mode=help&topic=nope')).toBe(HELP_TOPICS[0]!.id)
  })
})

/**
 * The AI Drawing tab's article sits with the other apps and has its own body
 * and title in every language the manual ships, so no reader falls back to
 * the English page or sees the bare id in the sidebar.
 */
describe('the AI Drawing topic', () => {
  it('is listed with the apps', () => {
    expect(HELP_TOPICS.find((t) => t.id === 'cad')?.group).toBe('apps')
  })

  it('has a body and a title in every language', () => {
    for (const lang of LANGS) {
      expect(helpHasBody('cad', lang), `cad.${lang}.md`).toBe(true)
    }
    for (const lang of HELP_TITLE_LANGS) {
      expect(topicTitle('cad', lang), lang).not.toBe('cad')
    }
  })
})
