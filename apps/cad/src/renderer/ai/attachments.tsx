/**
 * The AI panel's attachments, renderer side: the same behaviour as the other
 * editors' panels (apps/epub, apps/mindmap). Files are picked, read and
 * checked by main (`src/main/ai-attachments.ts`); this module keeps the
 * composer's list, its previews, the files taken by earlier sends (the files
 * skill keeps reading them), and turns picture attachments into the pictures
 * that go with a request.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { AgentImage } from '@genoffice/agent-core'
import { ATTACHMENT_IMAGE_EXTS } from '../../shared/ipc'
import type { AttachmentAddResult, AttachmentImageResult, AttachmentMeta } from '../../shared/ipc'
import fileWordIcon from './assets/file-word.png'
import fileExcelIcon from './assets/file-excel.png'
import filePptIcon from './assets/file-ppt.png'
import filePdfIcon from './assets/file-pdf.png'
import fileImageIcon from './assets/file-image.png'
import fileDocumentIcon from './assets/file-document.png'

/** The part of the preload bridge the attachments use. An older preload may lack any of it. */
export interface AttachmentBridge {
  pickAttachments?: () => Promise<AttachmentAddResult | null>
  addAttachmentPaths?: (paths: string[]) => Promise<AttachmentAddResult>
  addPastedImage?: (data: ArrayBuffer, ext: string) => Promise<AttachmentAddResult>
  readAttachmentImage?: (path: string) => Promise<AttachmentImageResult>
  getPathForFile?: (file: File) => string
}

/** The most pictures one message carries, as in the other editors. */
export const MAX_IMAGES_PER_MESSAGE = 20

/** clipboard bitmap MIME → attachment extension (matches ATTACHMENT_IMAGE_EXTS) */
const PASTE_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const CARD_ICONS: Record<string, string> = Object.fromEntries(
  (
    [
      [fileWordIcon, ['doc', 'docx', 'odt']],
      [fileExcelIcon, ['xls', 'xlsx', 'xlsm', 'csv', 'tsv']],
      [filePptIcon, ['ppt', 'pptx']],
      [filePdfIcon, ['pdf']],
      [fileImageIcon, ['png', 'jpg', 'jpeg', 'gif', 'webp']],
    ] as [string, string[]][]
  ).flatMap(([icon, exts]) => exts.map((ext) => [ext, icon])),
)

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(2)} KB`
}

export const isImageAttachment = (a: AttachmentMeta): boolean => ATTACHMENT_IMAGE_EXTS.has(a.ext)

/** Composer chips (removable) and the read-only echo on a sent message share one renderer. */
export function AttachmentList({
  atts,
  previews,
  onRemove,
  removeLabel,
}: {
  atts: readonly AttachmentMeta[]
  previews: Record<string, string>
  onRemove?: (path: string) => void
  removeLabel?: string
}): ReactElement {
  const remove = (path: string) =>
    onRemove && (
      <button
        type="button"
        className="ai-attachment-thumb-remove"
        onClick={() => onRemove(path)}
        data-tip={removeLabel}
        aria-label={removeLabel}
      >
        <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
          <path
            d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z"
            fill="currentColor"
          />
        </svg>
      </button>
    )
  return (
    <>
      {atts.map((a) =>
        isImageAttachment(a) ? (
          <span key={a.path} className="ai-attachment-thumb" title={a.name}>
            {previews[a.path] ? (
              <img src={previews[a.path]} alt={a.name} />
            ) : (
              <span className="ai-attachment-thumb-pending" aria-hidden>
                <img src={fileImageIcon} alt="" />
              </span>
            )}
            {remove(a.path)}
          </span>
        ) : (
          <span key={a.path} className="ai-attachment-card" title={a.path}>
            <span className="ai-attachment-card-icon">
              <img src={CARD_ICONS[a.ext] ?? fileDocumentIcon} alt="" aria-hidden />
            </span>
            <span className="ai-attachment-card-meta">
              <span className="ai-attachment-card-name">{a.name}</span>
              <span className="ai-attachment-card-size">{formatSize(a.sizeBytes)}</span>
            </span>
            {remove(a.path)}
          </span>
        ),
      )}
    </>
  )
}

export interface AttachmentTexts {
  imageReadFail: (name: string) => string
  tooManyImages: (max: number) => string
}

export interface Attachments {
  /** the composer's attachments, not yet sent */
  readonly list: AttachmentMeta[]
  /** data-URL previews of picture attachments, by path */
  readonly previews: Record<string, string>
  /** the last refusal or read failure, shown under the composer for a few seconds */
  readonly notice: string | null
  readonly dragOver: boolean
  setDragOver(over: boolean): void
  showNotice(lines: string[]): void
  /** what the files skill may read: earlier sends' files, then the composer's */
  available(): AttachmentMeta[]
  merge(result: AttachmentAddResult | null): void
  pick(): Promise<void>
  addPaths(paths: string[]): Promise<void>
  drop(files: readonly File[]): Promise<void>
  paste(files: readonly File[]): Promise<void>
  remove(path: string): void
  /** a send takes the composer's attachments: they join the sent list and leave the composer */
  take(): AttachmentMeta[]
  /** a queued message takes the composer's attachments; they become readable when it runs */
  detach(): AttachmentMeta[]
  /** an attachment list given back to a send (a retry, a queued message): kept readable */
  keep(atts: readonly AttachmentMeta[]): void
  /** "New chat": nothing stays */
  clear(): void
  /** the pictures among `atts`, read as pictures (5 MB each, at most `max`, 20 by default) */
  images(atts: readonly AttachmentMeta[], max?: number): Promise<AgentImage[]>
}

/**
 * The attachment state of one AI panel. `echoed` are the attachments shown on
 * sent messages: their previews are kept while they are on screen.
 */
export function useAttachments(
  bridge: () => AttachmentBridge,
  texts: AttachmentTexts,
  echoed: readonly AttachmentMeta[],
): Attachments {
  const [list, setList] = useState<AttachmentMeta[]>([])
  const listRef = useRef(list)
  listRef.current = list
  const sentRef = useRef<AttachmentMeta[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const requestedRef = useRef(new Set<string>())
  const noticeTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), [])
  const echoedRef = useRef(echoed)
  echoedRef.current = echoed

  const echoKey = echoed.map((a) => a.path).join('\n')
  useEffect(() => {
    const wanted = [...list, ...echoedRef.current]
    const alive = new Set(wanted.map((a) => a.path))
    setPreviews((prev) => {
      const stale = Object.keys(prev).filter((path) => !alive.has(path))
      if (stale.length === 0) return prev
      const next = { ...prev }
      for (const path of stale) delete next[path]
      return next
    })
    for (const path of requestedRef.current) {
      if (!alive.has(path)) requestedRef.current.delete(path)
    }
    for (const a of wanted) {
      if (!isImageAttachment(a) || requestedRef.current.has(a.path)) continue
      const read = bridge().readAttachmentImage?.(a.path)
      if (!read) continue
      requestedRef.current.add(a.path)
      void read
        .then((r) => {
          if (!requestedRef.current.has(a.path)) return
          if (r.ok && r.base64 && r.mime) {
            setPreviews((prev) => ({ ...prev, [a.path]: `data:${r.mime};base64,${r.base64}` }))
          }
        })
        .catch(() => requestedRef.current.delete(a.path))
    }
  }, [list, echoKey, bridge])

  const setBoth = (next: AttachmentMeta[]) => {
    listRef.current = next
    setList(next)
  }
  const showNotice = (lines: string[]) => {
    if (lines.length === 0) return
    setNotice(lines.join('; '))
    // a newer notice keeps its own five seconds
    window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 5000)
  }
  const merge = (result: AttachmentAddResult | null) => {
    if (!result) return
    if (result.accepted.length > 0) {
      const seen = new Set(listRef.current.map((a) => a.path))
      setBoth([...listRef.current, ...result.accepted.filter((a) => !seen.has(a.path))])
    }
    showNotice(result.rejected)
  }
  const addPaths = async (paths: string[]) => {
    const add = bridge().addAttachmentPaths
    if (add && paths.length > 0) merge(await add(paths))
  }
  const keep = (atts: readonly AttachmentMeta[]) => {
    const seen = new Set(sentRef.current.map((a) => a.path))
    sentRef.current = [...sentRef.current, ...atts.filter((a) => !seen.has(a.path))]
  }

  return {
    list,
    previews,
    notice,
    dragOver,
    setDragOver,
    showNotice,
    available: () => {
      const seen = new Set<string>()
      return [...sentRef.current, ...listRef.current].filter((a) => {
        if (seen.has(a.path)) return false
        seen.add(a.path)
        return true
      })
    },
    merge,
    pick: async () => {
      const pick = bridge().pickAttachments
      if (pick) merge(await pick())
    },
    addPaths,
    drop: async (files) => {
      const pathOf = bridge().getPathForFile
      if (!pathOf) return
      await addPaths(files.map((f) => pathOf(f)).filter(Boolean))
    },
    paste: async (files) => {
      const api = bridge()
      const paths: string[] = []
      for (const f of files) {
        const path = api.getPathForFile?.(f) ?? ''
        if (path) {
          paths.push(path)
          continue
        }
        // a picture with no file of its own (a screenshot) goes to a temporary file first
        const ext = PASTE_MIME_EXT[f.type] ?? f.name.split('.').pop()?.toLowerCase() ?? 'bin'
        if (api.addPastedImage) merge(await api.addPastedImage(await f.arrayBuffer(), ext))
      }
      await addPaths(paths)
    },
    remove: (path) => setBoth(listRef.current.filter((a) => a.path !== path)),
    take: () => {
      const taken = listRef.current
      if (taken.length === 0) return []
      keep(taken)
      setBoth([])
      return taken
    },
    detach: () => {
      const taken = listRef.current
      if (taken.length > 0) setBoth([])
      return taken
    },
    keep,
    clear: () => {
      setBoth([])
      sentRef.current = []
      setNotice(null)
    },
    images: async (atts, max = MAX_IMAGES_PER_MESSAGE) => {
      const pictures = atts.filter(isImageAttachment)
      const images: AgentImage[] = []
      const failures: string[] = []
      const read = bridge().readAttachmentImage
      for (const att of pictures.slice(0, max)) {
        const result: AttachmentImageResult = read ? await read(att.path) : { ok: false }
        if (result.ok && result.base64 && result.mime) {
          images.push({ base64: result.base64, mime: result.mime })
        } else {
          failures.push(result.error ?? texts.imageReadFail(att.name))
        }
      }
      if (pictures.length > max) failures.push(texts.tooManyImages(max))
      showNotice(failures)
      return images
    },
  }
}
