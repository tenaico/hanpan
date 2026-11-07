/**
 * Hanpan: Insert ▸ Gongu pictures in the Word editor (docs/plans/gongu-images.md
 * 4.4, as the HWP editor does it): the picture goes in at the caret, its credit
 * line in a small centred paragraph right under it, and the line in the
 * "picture credits" list at the end of the document (newest under the heading,
 * each line once). All of it must survive save → reopen as plain .docx content.
 */
import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import JSZip from 'jszip'
import { buildBlankDocx, parseDocx, saveDocx } from '@genoffice/docx-engine'
import type { GonguPicked } from '@genoffice/ui'
import { blocksToPmDoc, pmDocToSavePlan, type PmNode } from '../src/renderer/editor/convert'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { insertGonguPicture } from '../src/renderer/gongu-insert'

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const LINE_A = '「호작도」, 김홍도 / 출처: 공유마당(한국저작권위원회), 만료저작물'
const LINE_B = '「씨름」, 김홍도 / 출처: 공유마당(한국저작권위원회), 만료저작물'

function picked(title: string, creditLine: string): GonguPicked {
  return {
    dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
    width: 1240,
    height: 620,
    title,
    credit: { collection: 'gongu', workId: title, title, license: { kind: 'expired' } },
    creditLine,
    creditListTitle: '그림 출처',
  }
}

async function open(paragraphs: string[]) {
  const parsed = await parseDocx(await buildBlankDocx())
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: editorExtensions,
    content: blocksToPmDoc(parsed.blocks) as never,
  })
  editor.commands.setContent({
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'docParagraph',
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    })),
  })
  return { editor, parsed }
}

/** top-level blocks as the reader sees them: '[picture]' or the paragraph's text */
function outline(editor: Editor): string[] {
  const out: string[] = []
  editor.state.doc.forEach((node) => {
    out.push(
      node.type.name === 'docProtected' && node.attrs.blockType === 'image'
        ? '[picture]'
        : node.textContent,
    )
  })
  return out
}

/** caret at the end of the top-level paragraph whose text is `text` */
function caretAfter(editor: Editor, text: string) {
  let at = -1
  editor.state.doc.forEach((node, offset) => {
    if (at < 0 && node.textContent === text) at = offset + node.nodeSize - 1
  })
  editor.commands.setTextSelection(at)
}

describe('insertGonguPicture (Word editor)', () => {
  it('puts the picture at the caret, the credit line under it and in the list at the end', async () => {
    const { editor } = await open(['첫 문단', '둘째 문단'])
    caretAfter(editor, '첫 문단')
    expect(await insertGonguPicture(editor, picked('호작도', LINE_A))).toBe(true)
    expect(outline(editor)).toEqual([
      '첫 문단',
      '[picture]',
      LINE_A,
      '둘째 문단',
      '그림 출처',
      LINE_A,
    ])
    // the credit paragraph is small and centred, as in the HWP editor (9pt)
    let credit: { align: unknown; size: unknown } | null = null
    editor.state.doc.forEach((node) => {
      if (credit || node.textContent !== LINE_A) return
      const style = node.firstChild?.marks.find((m) => m.type.name === 'docTextStyle')
      credit = { align: node.attrs.align, size: style?.attrs.sizeHalfPoints }
    })
    expect(credit).toEqual({ align: 'center', size: 18 })
    // the picture fits the page width and keeps its proportions
    let image: { w: unknown; h: unknown; label: unknown } | null = null
    editor.state.doc.forEach((node) => {
      if (node.attrs.blockType === 'image')
        image = { w: node.attrs.imageWidthPx, h: node.attrs.imageHeightPx, label: node.attrs.label }
    })
    expect(image).toEqual({ w: 620, h: 310, label: '호작도' })
    editor.destroy()
  })

  it('adds a second work at the top of the list and the same work only once', async () => {
    const { editor } = await open(['본문'])
    caretAfter(editor, '본문')
    await insertGonguPicture(editor, picked('호작도', LINE_A))
    caretAfter(editor, '본문')
    await insertGonguPicture(editor, picked('씨름', LINE_B))
    caretAfter(editor, '본문')
    await insertGonguPicture(editor, picked('호작도', LINE_A))
    const list = outline(editor)
    expect(list.slice(list.lastIndexOf('그림 출처'))).toEqual(['그림 출처', LINE_B, LINE_A])
    expect(list.filter((b) => b === '[picture]')).toHaveLength(3)
    editor.destroy()
  })

  it('refuses a picture the document cannot hold, inserting nothing', async () => {
    const { editor } = await open(['본문'])
    caretAfter(editor, '본문')
    const webp = { ...picked('x', LINE_A), dataUrl: 'data:image/webp;base64,AAAA' }
    expect(await insertGonguPicture(editor, webp)).toBe(false)
    expect(outline(editor)).toEqual(['본문'])
    editor.destroy()
  })

  it('survives save → reopen as an embedded picture and plain paragraphs', async () => {
    const { editor, parsed } = await open(['본문'])
    caretAfter(editor, '본문')
    await insertGonguPicture(editor, picked('호작도', LINE_A))
    const plan = pmDocToSavePlan(editor.getJSON() as PmNode, parsed.blocks)
    const bytes = await saveDocx(parsed, plan.saveBlocks)
    const zip = await JSZip.loadAsync(bytes)
    expect(Object.keys(zip.files).some((name) => name.startsWith('word/media/'))).toBe(true)

    const reparsed = await parseDocx(bytes)
    const reopened = new Editor({
      element: document.createElement('div'),
      extensions: editorExtensions,
      content: blocksToPmDoc(reparsed.blocks) as never,
    })
    expect(outline(reopened).filter((b) => b.trim())).toEqual([
      '본문',
      '[picture]',
      LINE_A,
      '그림 출처',
      LINE_A,
    ])
    const image = reparsed.blocks.find((b) => b.type === 'image')
    expect(image).toBeTruthy()
    reopened.destroy()
    editor.destroy()
  })
})
