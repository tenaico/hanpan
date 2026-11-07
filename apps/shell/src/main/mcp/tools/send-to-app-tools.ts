import { PRODUCT_NAME } from '@genoffice/i18n'
import { z } from 'zod'
import type { OpenDocumentTab } from '../../../shared/tabs-api'
import type { SendResult } from '../../send-to-app/send-to-app'
import { parseSendTarget, type SendTarget } from '../../send-to-app/targets'
import type { McpToolDefinition } from '../mcp-server'
import { resolveOpenDocument } from './open-documents-tools'

/**
 * 다른 앱으로 보내기의 AI 도우미 입구(`send_to_app`). 사람이 탭 메뉴에서 고르는 것과 같은
 * 흐름(`send-to-app/send-to-app.ts`)을 부른다: 열린 문서를 Markdown으로 읽어 다른 편집기의
 * 새 제목 없는 문서로 연다. 원본은 고치지 않고, 새 문서도 저장하지 않는다(저장은 사람이 한다).
 * 저장하지 않은 워드·엑셀 문서는 앱이 사람에게 저장을 묻는다.
 */
export interface SendToAppControl {
  list: () => Promise<OpenDocumentTab[]>
  send: (tabId: string, target: SendTarget) => Promise<SendResult>
}

const PROBLEM_TEXT: Record<Exclude<SendResult, { ok: true }>['problem'], string> = {
  unsupported:
    'this document cannot go to that app (it is the same kind, a picture tab, or the target is not available here)',
  canceled:
    'the person did not save the document, so nothing was sent; a Word, Excel, PDF or book tab is sent from its saved file',
  empty: 'the document has no content to send',
  unreadable: 'the document could not be read',
  redaction: 'the parts of the document hidden from AI could not be processed, so nothing was sent',
  'too-many-slides': 'the text makes more than 100 slides; send a shorter part instead',
  failed: 'the new document could not be made or its tab did not open',
}

export function createSendToAppTools(control: SendToAppControl | undefined): McpToolDefinition[] {
  return [
    {
      name: 'send_to_app',
      description:
        `Send an open document to another ${PRODUCT_NAME} app as a NEW, unsaved document, with ` +
        'Markdown as the common format in between: e.g. a Word report into a PowerPoint deck ' +
        '(one slide per # / ## heading, list items as bullets), a mind map into a Word or HWP ' +
        'report, an Excel sheet into a Word table, anything into a Markdown document. The ' +
        'original is never changed and the new document is not saved; the person reviews and ' +
        'saves it. Targets: "docs" (Word), "slides" (PowerPoint), "hwp" (Hangul, only where the ' +
        'Korean document features are on), "markdown", "mindmap", "html" (web page). Sending to ' +
        '"markdown" first lets the person review and fix the intermediate text, then send it on ' +
        'from there. A Word, Excel, PDF or book tab is read from its saved file: when it has ' +
        'unsaved changes the app asks the person to save it first. Formatting beyond headings, ' +
        'lists and tables (fonts, colours, pictures, layout) does not carry over.',
      inputSchema: {
        document: z
          .string()
          .optional()
          .describe('path or tab id (from open_documents "list"); default: the document in front'),
        target: z
          .string()
          .describe(
            '"docs" | "slides" | "hwp" | "markdown" | "mindmap" | "html" (also word, pptx, md, web)',
          ),
      },
      handler: async (args) => {
        if (!control) {
          throw new Error(`${PRODUCT_NAME} is not running, so its open documents are unreachable`)
        }
        const target = parseSendTarget(args.target)
        if (!target) {
          throw new Error(
            `unknown target ${JSON.stringify(args.target)}: use docs, slides, hwp, markdown, mindmap or html`,
          )
        }
        const documents = await control.list()
        const wanted = typeof args.document === 'string' ? args.document.trim() : ''
        const doc = wanted
          ? resolveOpenDocument(documents, wanted)
          : documents.find((d) => d.active)
        if (!doc) {
          const listing = documents.map((d) => `  ${d.id}  ${d.filePath ?? d.title}`).join('\n')
          throw new Error(
            wanted
              ? `no open document matches "${wanted}". Currently open:\n${listing}`
              : 'no document is in front; pass `document` (a path or an id from open_documents "list")',
          )
        }
        const result = await control.send(doc.id, target)
        if (!result.ok)
          throw new Error(`"${doc.title}" was not sent: ${PROBLEM_TEXT[result.problem]}`)
        return {
          sent: true,
          from: doc.id,
          target: result.target,
          newTabId: result.tabId,
          note: 'The new document is open in its own tab and not saved yet.',
        }
      },
    },
  ]
}
