/**
 * 0.17 UI/UX review v2, hwp-design #3: with only a caret (no block), Format > Character Shape,
 * the toolbar's 글자 모양 and Format > Bullet Shape did nothing. Hangul opens them: the
 * character shape works on the word the caret is in (or, between words, on what is typed next),
 * the bullet shape on the caret's paragraph.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HANCOM_KEYS_MODULE, applyPatch, STUDIO_PATCHES } from '../scripts/rhwp-patches.mjs'
import { caretWordRange, charShapeTarget } from '../studio-plugin/hancom-keys.mjs'

interface Pos {
  sectionIndex: number
  paragraphIndex: number
  charOffset: number
  parentParaIndex?: number
  controlIndex?: number
  cellIndex?: number
  cellParaIndex?: number
  cellPath?: { controlIndex: number; cellIndex: number; cellParaIndex: number }[]
  isTextBox?: boolean
}

/** A caret over one paragraph of text, in the body or a cell. */
function fakeInput(
  text: string,
  pos: Pos,
  modes: Record<string, boolean> = {},
  selection?: unknown,
) {
  const calls: string[] = []
  const wasm = {
    getParagraphLength: () => text.length,
    getTextRange: (_s: number, _p: number, from: number, count: number) => {
      calls.push('body')
      return text.slice(from, from + count)
    },
    getCellParagraphLength: () => text.length,
    getTextInCell: (...args: number[]) => {
      calls.push('cell')
      const [, , , , , from, count] = args
      return text.slice(from, from + count)
    },
    getCellParagraphLengthByPath: () => text.length,
    getTextInCellByPath: (_s: number, _p: number, _path: string, from: number, count: number) => {
      calls.push('path')
      return text.slice(from, from + count)
    },
  }
  const mode = (name: string) => () => modes[name] === true
  const cursor = {
    getPosition: () => pos,
    isInHeaderFooter: mode('header'),
    isInFootnote: mode('note'),
    isInPictureObjectSelection: mode('picture'),
    isInTableObjectSelection: mode('tableObject'),
    isInCellSelectionMode: mode('cellBlock'),
  }
  return { ih: { cursor, wasm, getSelection: () => selection ?? null }, calls }
}

const body = (charOffset: number): Pos => ({ sectionIndex: 0, paragraphIndex: 2, charOffset })

describe('the word at the caret (Hangul 글자 모양 with no block)', () => {
  it('is the run of letters around the caret', () => {
    const { ih } = fakeInput('hello world test', body(8))
    const range = caretWordRange(ih)
    expect(range?.start).toEqual(body(6))
    expect(range?.end).toEqual(body(11))
  })

  it('takes the word the caret stands right behind', () => {
    const { ih } = fakeInput('한글 문서', body(2))
    expect(caretWordRange(ih)).toEqual({ start: body(0), end: body(2) })
  })

  it('is nothing between words or in an empty paragraph', () => {
    expect(caretWordRange(fakeInput('a  b', body(2)).ih)).toBeNull()
    expect(caretWordRange(fakeInput('', body(0)).ih)).toBeNull()
  })

  it('reads a cell paragraph, by path for a table in a table', () => {
    const cell: Pos = {
      ...body(1),
      parentParaIndex: 0,
      controlIndex: 0,
      cellIndex: 3,
      cellParaIndex: 0,
    }
    const flat = fakeInput('칸 글자', cell)
    expect(caretWordRange(flat.ih)?.end.charOffset).toBe(1)
    expect(flat.calls).toContain('cell')
    const nested: Pos = {
      ...cell,
      cellPath: [
        { controlIndex: 0, cellIndex: 3, cellParaIndex: 0 },
        { controlIndex: 1, cellIndex: 0, cellParaIndex: 0 },
      ],
    }
    const deep = fakeInput('칸 글자', nested)
    expect(caretWordRange(deep.ih)?.end).toEqual({ ...nested, charOffset: 1 })
    expect(deep.calls).toContain('path')
  })

  it('leaves headers, notes, text boxes, objects and cell blocks alone', () => {
    for (const mode of ['header', 'note', 'picture', 'tableObject', 'cellBlock']) {
      expect(caretWordRange(fakeInput('word', body(1), { [mode]: true }).ih), mode).toBeNull()
    }
    expect(caretWordRange(fakeInput('word', { ...body(1), isTextBox: true }).ih)).toBeNull()
  })
})

describe('what the character shape dialog changes', () => {
  it('is the block when there is one', () => {
    const block = { start: body(0), end: body(4) }
    expect(charShapeTarget(fakeInput('word word', body(6), {}, block).ih)).toBe(block)
  })

  it('is the word at the caret when the block is empty or missing', () => {
    const empty = { start: body(6), end: body(6) }
    expect(charShapeTarget(fakeInput('word word', body(6), {}, empty).ih)).toEqual({
      start: body(5),
      end: body(9),
    })
    expect(charShapeTarget(fakeInput('word word', body(1)).ih)).toEqual({
      start: body(0),
      end: body(4),
    })
  })

  it('is left to the editor (typing next, a cell block) when there is no word', () => {
    expect(charShapeTarget(fakeInput('a  b', body(2)).ih)).toBeNull()
    expect(charShapeTarget(fakeInput('word', body(1), { cellBlock: true }).ih)).toBeNull()
  })
})

const core = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'vendor', 'rhwp-core', 'package.json'), 'utf8'),
)
const studio = join(
  __dirname,
  '..',
  'node_modules',
  '.cache',
  'rhwp-studio',
  core.rhwp.tag,
  'rhwp-studio',
)
const formatTs = join(studio, 'src', 'command', 'commands', 'format.ts')

describe('the format command patch', () => {
  it('is in the studio build', () => {
    expect(STUDIO_PATCHES).toContain('studio-format-caret')
  })

  it.skipIf(!existsSync(formatTs))(
    'opens the character shape dialog without a block, and the bullet tab of the numbering dialog',
    () => {
      const code = applyPatch('studio-format-caret', readFileSync(formatTs, 'utf8'))
      expect(code).toContain(`import { charShapeTarget } from '${HANCOM_KEYS_MODULE}';`)
      expect(code).toContain('const savedSel = charShapeTarget(ih);')
      expect(code).not.toContain('if (!savedSel) return;')
      // between words the dialog's choice waits for the next typing, as the toolbar's font box does
      expect(code).toContain("else services.eventBus.emit('format-char', mods);")
      // Bullet Shape opens Hangul's 문단 번호/글머리표 dialog on its bullet tab, for the caret's paragraph
      const bullet = code.slice(code.indexOf("id: 'format:bullet-shape'"))
      expect(bullet.slice(0, 600)).toContain("execute(services, { tab: 'bullet' })")
      expect(bullet.slice(0, 600)).not.toContain("getElementById('tb-bullet')")
      expect(code).toContain("params?.tab === 'bullet' ? 'Bullet' : (props.headType ?? 'None')")
    },
  )
})
