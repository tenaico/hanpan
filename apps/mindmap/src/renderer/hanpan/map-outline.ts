/**
 * Hanpan: a sheet of the open map as the editor-neutral outline the documents
 * are made from. Topic ids are the link keys. Pictures inside the file come
 * along as bytes; pictures the file only points at (web addresses) do not.
 */
import type { PanImage, PanNode, PanOutline } from '@genoffice/hanpan-core/renderer'
import type { ViewTopic } from '@genoffice/xmind-engine'
import type { DocumentSession } from '../document/session'

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

async function imageOf(session: DocumentSession, topic: ViewTopic): Promise<PanImage | undefined> {
  const entry = topic.image?.entryName
  if (!entry) return undefined
  const mime = MIME_BY_EXTENSION[entry.split('.').pop()?.toLowerCase() ?? '']
  if (!mime) return undefined
  const bytes = await session.document.readEntry(entry).catch(() => null)
  if (!bytes) return undefined
  return {
    bytes,
    mime,
    width: topic.image?.width ?? undefined,
    height: topic.image?.height ?? undefined,
  }
}

async function nodeOf(session: DocumentSession, topic: ViewTopic): Promise<PanNode> {
  return {
    key: topic.id,
    title: topic.title.trim(),
    note: topic.note?.trim() || undefined,
    // only a web link goes into a document
    href: topic.link?.startsWith('https://') ? topic.link : undefined,
    image: await imageOf(session, topic),
    children: await Promise.all(topic.children.map((c) => nodeOf(session, c))),
  }
}

export async function sheetOutline(
  session: DocumentSession,
  sheetKey: string,
): Promise<{ outline: PanOutline; sheetId: string }> {
  const view = session.view(sheetKey)
  const root = view.root
  return {
    sheetId: view.id ?? String(view.index),
    outline: {
      title: root.title.trim(),
      rootKey: root.id,
      note: root.note?.trim() || undefined,
      nodes: await Promise.all(root.children.map((c) => nodeOf(session, c))),
    },
  }
}

/** The outline as indented text (title first, then `- ` items, two spaces per level): what the design board reads. */
export function outlineAsIndentedText(outline: PanOutline): string {
  const lines = [outline.title]
  const walk = (nodes: PanNode[], depth: number) => {
    for (const n of nodes) {
      lines.push(`${'  '.repeat(depth)}- ${n.title.replace(/\s*\n\s*/g, ' ')}`)
      walk(n.children, depth + 1)
    }
  }
  walk(outline.nodes, 1)
  return lines.join('\n')
}
