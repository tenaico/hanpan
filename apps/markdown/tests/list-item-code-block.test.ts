/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { normalizeListItemContent } from '../src/renderer/editor/listItemContent'
import { useRoundTripEditor } from './helpers/roundtrip-editor'

/**
 * A fenced code block inside a list item is valid CommonMark and common in
 * READMEs and specs. The editor must open it with a valid document and save
 * the file back byte for byte.
 */
const open = useRoundTripEditor()

const cases: Array<[string, string]> = [
  [
    'a fence right under the item text',
    '- `registered.json`: the record.\n  ```json\n  { "v": 2 }\n  ```\n- next item\n',
  ],
  [
    'a fence after a blank line',
    '- the record:\n\n  ```json\n  { "v": 2 }\n  ```\n\n- next item\n',
  ],
  [
    'text after the fence in the same item',
    '- the record.\n  ```json\n  { "v": 2 }\n  ```\n  more about it.\n- next item\n',
  ],
  ['a numbered item with a fence', '1. run this:\n   ```bash\n   npm test\n   ```\n2. done\n'],
  ['a fence as the only content of an item', '- ```\n  code\n  ```\n'],
]

describe('a code block inside a list item', () => {
  it.each(cases)('opens and keeps every byte: %s', (_name, source) => {
    const { editor, save, body } = open(source)
    expect(() => editor.state.doc.check()).not.toThrow()
    expect(save()).toBe(source)
    expect(body).not.toHaveBeenCalled()
  })
})

describe('normalizeListItemContent', () => {
  const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  const code = { type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }

  it('wraps bare text after a block in a paragraph', () => {
    expect(
      normalizeListItemContent([p('a'), code, { type: 'text', text: 'b' }, { type: 'hardBreak' }]),
    ).toEqual([
      p('a'),
      code,
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }, { type: 'hardBreak' }] },
    ])
  })

  it('gives an item that starts with a block an empty first paragraph', () => {
    expect(normalizeListItemContent([code])).toEqual([{ type: 'paragraph', content: [] }, code])
  })

  it('leaves valid content as it is', () => {
    expect(normalizeListItemContent([p('a'), code, p('b')])).toEqual([p('a'), code, p('b')])
  })
})
