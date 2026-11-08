/**
 * Hanpan: the Markdown converter on the Home screen. Markdown goes in on the
 * left (typed, pasted, opened or dropped), the document it makes shows on the
 * right, and one press writes every ticked format (HWP, HWPX, Word, ODT, PDF,
 * HTML) into one folder. The folder is the main process's choice: the opened file's
 * folder, or the one picked with "change".
 */
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react'
import {
  DOC_THEMES,
  markdownToBlocks,
  type DocBlock,
  type DocTheme,
  type TextLook,
  type ParaLook,
} from '@genoffice/hanpan-core/renderer'
import { useDialogKeys } from '../dialog-keys'
import { useI18n } from '../locale'

export type ConvertFormat = 'hwp' | 'hwpx' | 'docx' | 'odt' | 'pdf' | 'html'
export type ConvertTheme = 'report' | 'plain' | 'gongmun'
type ConvertOutcome =
  | {
      ok: true
      written: { format: ConvertFormat; path: string }[]
      failed: { format: ConvertFormat; error: string }[]
    }
  | { ok: false; error: string }

export interface MarkdownConverterApi {
  mdFolder(): Promise<string>
  mdPickFile(): Promise<{ name: string; text: string; folder: string } | null>
  mdPickFolder(): Promise<string | null>
  mdConvert(request: {
    markdown: string
    name: string
    formats: ConvertFormat[]
    theme: ConvertTheme
  }): Promise<ConvertOutcome>
  mdShowFolder(): Promise<string>
}

const FORMATS: { id: ConvertFormat; label: string }[] = [
  { id: 'hwp', label: 'HWP' },
  { id: 'hwpx', label: 'HWPX' },
  { id: 'docx', label: 'Word' },
  { id: 'odt', label: 'ODT' },
  { id: 'pdf', label: 'PDF' },
  { id: 'html', label: 'HTML' },
]
const FORMATS_KEY = 'hanpan.convert.formats'
const DEFAULT_FORMATS: ConvertFormat[] = ['hwp', 'docx', 'pdf']

function storedFormats(): ConvertFormat[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FORMATS_KEY) ?? 'null') as unknown
    const list = Array.isArray(raw) ? FORMATS.map((f) => f.id).filter((id) => raw.includes(id)) : []
    return list.length > 0 ? list : DEFAULT_FORMATS
  } catch {
    return DEFAULT_FORMATS
  }
}

/** The document's own title, the first `# ` heading, as the default file name. */
export function headingName(markdown: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown)
  return m
    ? m[1]!
        .replace(/[*_`]/g, '')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .trim()
        .slice(0, 100)
    : ''
}

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path

/**
 * What was typed stays for the rest of the run (0.17 리뷰 v2 shell #4): closing
 * the converter with Esc or × used to throw the Markdown away without a word.
 */
let draft = { markdown: '', name: '' }

/** tests start from an empty converter */
export function resetConverterDraft(): void {
  draft = { markdown: '', name: '' }
}

/** points on the page → pixels in the preview (report body 15pt ≈ 13.5px) */
const PREVIEW_PX_PER_PT = 0.9

/** the look a block gets in the written file, drawn in the preview */
function lookStyle(look: TextLook & ParaLook): CSSProperties {
  return {
    fontFamily: `'${look.font}', 'Malgun Gothic', serif`,
    fontSize: `${(look.size * PREVIEW_PX_PER_PT).toFixed(1)}px`,
    fontWeight: look.bold ? 700 : undefined,
    color: look.color,
    textAlign: look.align,
    lineHeight: look.lineSpacing ? look.lineSpacing / 100 : undefined,
  }
}

function Preview(p: { blocks: DocBlock[]; theme: DocTheme }) {
  const itemLook = (depth: number) =>
    p.theme.items[Math.min(depth, p.theme.items.length - 1)] ?? p.theme.body
  return (
    <div className="hp-conv-page" data-theme={p.theme.id} style={lookStyle(p.theme.body)}>
      {p.blocks.map((b, i) => {
        const indent = {
          paddingInlineStart: `${'depth' in b ? b.depth * p.theme.indentStep * PREVIEW_PX_PER_PT : 0}px`,
        }
        switch (b.kind) {
          case 'title':
            return b.text ? (
              <h1 key={i} style={lookStyle(p.theme.title)}>
                {b.text}
              </h1>
            ) : null
          case 'meta':
            return (
              <p key={i} className="hp-conv-meta" style={lookStyle(p.theme.meta)}>
                {b.text}
              </p>
            )
          case 'chapter':
            return (
              <h2 key={i} style={lookStyle(p.theme.chapter)}>
                {[b.label, b.text].filter(Boolean).join(' ')}
              </h2>
            )
          case 'item':
            return (
              <p
                key={i}
                className={b.marker ? 'hp-conv-item' : 'hp-conv-item is-head'}
                style={{ ...lookStyle(itemLook(b.depth)), ...indent }}
              >
                {b.marker && <span className="hp-conv-marker">{b.marker}</span>}
                {b.text}
              </p>
            )
          case 'para':
            return (
              <p key={i} className="hp-conv-para" style={{ ...lookStyle(p.theme.body), ...indent }}>
                {b.text}
              </p>
            )
          case 'reference':
            return (
              <p
                key={i}
                className="hp-conv-ref"
                style={{ ...lookStyle(p.theme.reference), ...indent }}
              >
                ※ {b.text}
              </p>
            )
          case 'table':
            return (
              <table key={i}>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) =>
                        b.header && r === 0 ? <th key={c}>{cell}</th> : <td key={c}>{cell}</td>,
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          case 'pageBreak':
            return <hr key={i} />
          case 'closing':
            return (
              <p key={i} className="hp-conv-para">
                {b.text}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

export function MarkdownConverter(p: { api: MarkdownConverterApi; onClose(): void }) {
  const { t } = useI18n()
  const [markdown, setMarkdownState] = useState(draft.markdown)
  const [name, setNameState] = useState(draft.name)
  const setMarkdown = (next: string) => {
    draft = { ...draft, markdown: next }
    setMarkdownState(next)
  }
  const setName = (next: string) => {
    draft = { ...draft, name: next }
    setNameState(next)
  }
  const [formats, setFormats] = useState<ConvertFormat[]>(storedFormats)
  const [theme, setTheme] = useState<ConvertTheme>('report')
  const [folder, setFolder] = useState('')
  const [busy, setBusy] = useState(false)
  const dialogRef = useDialogKeys(p.onClose, { canClose: !busy })
  const [outcome, setOutcome] = useState<ConvertOutcome | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const deferred = useDeferredValue(markdown)
  const blocks = useMemo(() => (deferred.trim() ? markdownToBlocks(deferred) : []), [deferred])
  const effectiveName = name.trim() || headingName(markdown) || t('hpConvDefaultName')

  useEffect(() => {
    void p.api.mdFolder().then(setFolder)
  }, [p.api])

  const toggle = (id: ConvertFormat) => {
    const next = formats.includes(id)
      ? formats.filter((f) => f !== id)
      : FORMATS.map((f) => f.id).filter((f) => f === id || formats.includes(f))
    setFormats(next)
    try {
      localStorage.setItem(FORMATS_KEY, JSON.stringify(next))
    } catch {
      /* the choice just isn't remembered */
    }
  }

  const load = (text: string, fromName: string) => {
    setMarkdown(text)
    setName(fromName)
    setOutcome(null)
    setNotice(null)
  }

  const openFile = async () => {
    const picked = await p.api.mdPickFile()
    if (!picked) return
    load(picked.text, picked.name)
    setFolder(picked.folder)
  }

  const changeFolder = async () => {
    const picked = await p.api.mdPickFolder()
    if (picked) setFolder(picked)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDropping(false)
    const file = event.dataTransfer.files[0]
    if (!file || !/\.(md|markdown|txt)$/i.test(file.name)) return
    void file
      .text()
      .then((text) => load(text.replace(/^\uFEFF/, ''), file.name.replace(/\.[^.]+$/, '')))
  }

  const convert = async () => {
    if (!markdown.trim()) return setNotice(t('hpConvNeedText'))
    if (formats.length === 0) return setNotice(t('hpConvNeedFormat'))
    setNotice(null)
    setOutcome(null)
    setBusy(true)
    const result = await p.api
      .mdConvert({ markdown, name: effectiveName, formats, theme })
      .catch((e: unknown) => ({ ok: false as const, error: String(e) }))
    setBusy(false)
    setOutcome(result)
  }

  const label = (id: ConvertFormat) => FORMATS.find((f) => f.id === id)?.label ?? id

  return (
    <div
      className="hp-tpl-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && p.onClose()}
    >
      <div
        className="hp-conv"
        role="dialog"
        aria-modal="true"
        aria-label={t('hpConvTitle')}
        data-hanpan="md-converter"
        ref={dialogRef}
      >
        <div className="hp-tpl-head">
          <h2>{t('hpConvTitle')}</h2>
          <button
            type="button"
            className="hp-tpl-close"
            onClick={p.onClose}
            disabled={busy}
            aria-label={t('hpTemplatesClose')}
          >
            ×
          </button>
        </div>
        <div className="hp-conv-body">
          <section className="hp-conv-pane">
            <div className="hp-conv-bar">
              <span className="hp-conv-label">{t('hpConvSource')}</span>
              <button
                type="button"
                className="hp-conv-ghost"
                onClick={() => void openFile()}
                data-hanpan="md-open"
              >
                {t('hpConvOpenFile')}
              </button>
              <span className="hp-conv-count">
                {t('hpConvChars', { n: markdown.length.toLocaleString() })}
              </span>
            </div>
            <textarea
              className={dropping ? 'hp-conv-source is-dropping' : 'hp-conv-source'}
              value={markdown}
              spellCheck={false}
              placeholder={t('hpConvPlaceholder')}
              aria-label={t('hpConvSource')}
              data-hanpan="md-source"
              onChange={(e) => {
                setMarkdown(e.target.value)
                setOutcome(null)
                // "put Markdown in first" no longer holds once there is text
                if (e.target.value.trim() && notice === t('hpConvNeedText')) setNotice(null)
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files')) return
                e.preventDefault()
                setDropping(true)
              }}
              onDragLeave={() => setDropping(false)}
              onDrop={onDrop}
            />
          </section>
          <section className="hp-conv-pane">
            <div className="hp-conv-bar">
              <span className="hp-conv-label">{t('hpConvPreview')}</span>
            </div>
            <div className="hp-conv-preview" data-hanpan="md-preview">
              {blocks.length > 0 ? (
                <Preview blocks={blocks} theme={DOC_THEMES[theme] ?? DOC_THEMES.report!} />
              ) : (
                <p className="hp-conv-empty">{t('hpConvPreviewEmpty')}</p>
              )}
            </div>
          </section>
        </div>
        <div className="hp-conv-foot">
          <div className="hp-conv-options">
            <label className="hp-conv-field">
              <span>{t('hpConvName')}</span>
              <input
                value={name}
                placeholder={effectiveName}
                onChange={(e) => setName(e.target.value)}
                data-hanpan="md-name"
              />
            </label>
            <fieldset className="hp-conv-formats">
              <legend>{t('hpConvFormats')}</legend>
              {FORMATS.map((f) => (
                <label
                  key={f.id}
                  className={formats.includes(f.id) ? 'hp-conv-chip is-on' : 'hp-conv-chip'}
                >
                  <input
                    type="checkbox"
                    checked={formats.includes(f.id)}
                    onChange={() => toggle(f.id)}
                    data-format={f.id}
                  />
                  {f.label}
                </label>
              ))}
            </fieldset>
            <label className="hp-conv-field">
              <span>{t('hpConvStyle')}</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ConvertTheme)}
                data-hanpan="md-theme"
              >
                <option value="report">{t('hpConvStyleReport')}</option>
                <option value="plain">{t('hpConvStylePlain')}</option>
                <option value="gongmun">{t('hpConvStyleGongmun')}</option>
              </select>
            </label>
            <div className="hp-conv-field hp-conv-folder">
              <span>{t('hpConvFolder')}</span>
              <span className="hp-conv-path" title={folder}>
                {folder}
              </span>
              <button
                type="button"
                className="hp-conv-ghost"
                onClick={() => void changeFolder()}
                disabled={busy}
              >
                {t('hpConvChangeFolder')}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="hp-conv-go"
            onClick={() => void convert()}
            disabled={busy}
            data-hanpan="md-convert"
          >
            {busy ? t('hpConvBusy') : t('hpConvGo')}
          </button>
        </div>
        {(notice || outcome) && (
          <div className="hp-conv-result" role="status" data-hanpan="md-result">
            {notice && <p className="hp-tpl-error">{notice}</p>}
            {outcome && !outcome.ok && (
              <p className="hp-tpl-error">{t('hpConvError', { error: outcome.error })}</p>
            )}
            {outcome?.ok && (
              <>
                {outcome.written.length > 0 && (
                  <p className="hp-conv-done">
                    {t('hpConvDone', { n: outcome.written.length })}{' '}
                    <span>{t('hpConvOpenHint')}</span>
                  </p>
                )}
                <div className="hp-conv-files">
                  {outcome.written.map((w) => (
                    <button
                      key={w.path}
                      type="button"
                      className="hp-conv-file"
                      title={w.path}
                      onClick={() => void window.aiOffice.openPath(w.path)}
                    >
                      <b>{label(w.format)}</b> {fileName(w.path)}
                    </button>
                  ))}
                  {outcome.written.length > 0 && (
                    <button
                      type="button"
                      className="hp-conv-ghost"
                      onClick={() => void p.api.mdShowFolder()}
                    >
                      {t('hpConvShowFolder')}
                    </button>
                  )}
                </div>
                {outcome.failed.map((f) => (
                  <p key={f.format} className="hp-tpl-error">
                    {t('hpConvFailed', { format: label(f.format), error: f.error })}
                  </p>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
