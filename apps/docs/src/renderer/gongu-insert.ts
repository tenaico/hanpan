/**
 * Hanpan: Insert ▸ Gongu pictures in the Word editor (docs/plans/gongu-images.md
 * 4.4). Done as the HWP editor does it: the picture goes in at the caret like
 * Insert ▸ Picture, its credit line in a small centred paragraph right under
 * it, and the line in the "picture credits" list at the end of the document.
 * The credit line is ordinary document text: the person may edit or delete it
 * afterwards and the app does not write it again. Everything is plain .docx
 * content (an embedded picture and paragraphs), so it survives save → reopen.
 */
import type { Editor } from '@tiptap/core'
import { gonguCreditListPlan, type GonguPicked } from '@genoffice/ui'
import { insertImageFromDataUrl } from './components/ribbon-tabs'

/** The credit line's size, as in the HWP editor: 9pt (half-points). */
const CREDIT_SIZE_HALF_POINTS = 18

/** A paragraph of plain text; `small` makes it a centred 9pt credit line. */
function paragraph(text: string, small: boolean) {
  return {
    type: 'docParagraph',
    attrs: { docxIndex: null, aiChanged: false, ...(small ? { align: 'center' } : {}) },
    content: [
      {
        type: 'text',
        text,
        ...(small
          ? {
              marks: [
                {
                  type: 'docTextStyle',
                  attrs: {
                    color: null,
                    sizeHalfPoints: CREDIT_SIZE_HALF_POINTS,
                    font: null,
                    highlight: null,
                    vertAlign: null,
                  },
                },
              ],
            }
          : {}),
      },
    ],
  }
}

/**
 * Puts the credit paragraph right after the picture just inserted. Insert ▸
 * Picture leaves the caret in the paragraph that follows the picture; the
 * credit goes in front of that paragraph.
 */
function insertCreditUnderPicture(editor: Editor, line: string): boolean {
  const { $from } = editor.state.selection
  if ($from.depth < 1) return false
  const before = $from.before($from.depth)
  const picture = editor.state.doc.resolve(before).nodeBefore
  if (picture?.type.name !== 'docProtected' || picture.attrs.blockType !== 'image') return false
  return editor.chain().insertContentAt(before, paragraph(line, true)).run()
}

/** Adds the line to the list at the end of the document, starting the list when there is none. */
function listCredit(editor: Editor, title: string, line: string): void {
  const blocks: string[] = []
  const ends: number[] = []
  editor.state.doc.forEach((node, offset) => {
    blocks.push(node.textContent)
    ends.push(offset + node.nodeSize)
  })
  const plan = gonguCreditListPlan(blocks, title, line)
  if (plan.kind === 'listed') return
  const chain = editor.chain()
  if (plan.kind === 'new')
    chain.insertContentAt(editor.state.doc.content.size, [
      paragraph(title, false),
      paragraph(line, false),
    ])
  else chain.insertContentAt(ends[plan.after]!, paragraph(line, false))
  // the caret stays where the person is writing, under the new picture
  chain.run()
}

/** Inserts a picked Gongu picture with its credit; false when the document cannot hold it. */
export async function insertGonguPicture(editor: Editor, picked: GonguPicked): Promise<boolean> {
  const inserted = await insertImageFromDataUrl(editor, picked.dataUrl, picked.title, {
    width: picked.width,
    height: picked.height,
  })
  if (!inserted) return false
  if (insertCreditUnderPicture(editor, picked.creditLine))
    listCredit(editor, picked.creditListTitle, picked.creditLine)
  return true
}
