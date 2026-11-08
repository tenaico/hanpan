// The Word report for a UI without the Korean document features (decision 0091):
// chapters numbered 1. 2., items under them with bullets, in fonts every PC has
// for every language; no Korean report symbols or Korean font names.
import { describe, expect, it } from 'vitest'
import { markerFor, stripMarker } from '../src/numbering'
import { themeFor } from '../src/doc-theme'
import { outlineToBlocks } from '../src/blocks'

describe('the outline style', () => {
  it('numbers chapters and bullets the items under them', () => {
    expect(markerFor('outline', 0, 2, 3)).toBe('2.')
    expect(markerFor('outline', 1, 1, 1)).toBe('•')
    expect(markerFor('outline', 2, 1, 1)).toBe('–')
    expect(markerFor('outline', 5, 1, 1)).toBe('–')
  })

  it('makes chapters of the first level, as a chapter report does', () => {
    const blocks = outlineToBlocks(
      {
        title: 'Plan',
        rootKey: 'r',
        nodes: [{ key: 'a', title: 'Goal', children: [{ key: 'b', title: 'Step', children: [] }] }],
      },
      { style: 'outline' },
    )
    expect(blocks.filter((b) => b.kind === 'chapter')).toEqual([
      { kind: 'chapter', label: '1.', text: 'Goal', key: 'a' },
    ])
    expect(blocks.find((b) => b.kind === 'item')).toMatchObject({
      depth: 0,
      marker: '•',
      text: 'Step',
    })
  })

  it('reads its markers back off the text', () => {
    expect(stripMarker('• Step')).toBe('Step')
    expect(stripMarker('– Detail')).toBe('Detail')
    expect(stripMarker('1. Goal')).toBe('Goal')
  })
})

describe('the basic theme', () => {
  it('uses one font that covers every language, with no Korean font name', () => {
    const theme = themeFor('outline', 'basic')
    expect(theme.id).toBe('basic')
    const fonts = new Set(
      [theme.title, theme.meta, theme.chapter, ...theme.items, theme.body, theme.reference].map(
        (l) => l.font,
      ),
    )
    expect([...fonts]).toEqual(['Arial'])
  })
})
