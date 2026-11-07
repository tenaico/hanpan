/**
 * Hanpan: finding a Gongu picture (the Korea Copyright Commission's free works)
 * from an editor's Insert tab — the Word and PowerPoint editors
 * (docs/plans/gongu-images.md 4.5). The same search as the design board's
 * panel: main searches with the key from Settings → Integrations and hands
 * back thumbnails as data URLs; this dialog sends only the words, a page
 * number or a work number. The picked picture goes to the editor together
 * with the credit line the app writes (`formatCreditLine`), never the model
 * or the person, so it reads exactly as in the design board and the HWP editor.
 * Apps import `@genoffice/ui/gongu-picker.css` for the chrome.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, type Lang, type Params } from '@genoffice/i18n'
import {
  creditListLines,
  creditListTitle,
  formatCreditLine,
  gonguCreditOf,
  licenseTerms,
  type GonguLicense,
  type ImageCredit,
} from '@genoffice/hanpan-core/renderer'
import { useModalKeys } from './modal-keys'
import { GONGU_PICKER_STRINGS, type GonguPickerStrings } from './strings-gongu-picker'

/** A search hit as main hands it over: the thumbnail is already a data URL. */
export interface GonguPickerHit {
  workId: string
  title: string
  author?: string
  year?: string
  provider?: string
  thumb: string | null
}

export type GonguPickerFailure =
  'no-key' | 'bad-key' | 'expired-key' | 'quota' | 'rate' | 'blocked' | 'network' | 'service'

export type GonguPickerSearchAnswer =
  | { ok: true; works: GonguPickerHit[]; total: number | null }
  | { ok: false; error: GonguPickerFailure }

export type GonguPickerPictureAnswer =
  | {
      ok: true
      dataUrl: string
      width: number
      height: number
      work: { workId: string; title: string; author?: string; year?: string; provider?: string }
      /** absent for the expired-works service, whose every work is out of copyright */
      license?: GonguLicense
    }
  | { ok: false; error: GonguPickerFailure | 'picture' }

/** The two calls into main (`hanpan:gongu-pictures-*`), as the editor's preload exposes them. */
export interface GonguPickerApi {
  gonguSearch(query: string, page: number): Promise<GonguPickerSearchAnswer | null>
  gonguPicture(workId: string): Promise<GonguPickerPictureAnswer | null>
}

/** What the editor inserts: the picture, its credit, and the words to write under it. */
export interface GonguPicked {
  dataUrl: string
  width: number
  height: number
  title: string
  credit: ImageCredit
  /** the line under the picture, in the UI language at the time of insertion */
  creditLine: string
  /** the heading of the credit list at the end of a document, in the same language */
  creditListTitle: string
}

const wordsOf = (lang: string): GonguPickerStrings =>
  GONGU_PICKER_STRINGS[lang as Lang] ?? GONGU_PICKER_STRINGS.en

export function gonguPickerText(
  lang: string,
  key: keyof GonguPickerStrings,
  params?: Params,
): string {
  return format(wordsOf(lang)[key], params)
}

/** The conditions to confirm before a work goes in; none for a free work. */
export function gonguInsertWarnings(license: GonguLicense, lang: string): string[] {
  const terms = licenseTerms(license)
  const w = wordsOf(lang)
  return [
    ...(terms.nonCommercial ? [w.warnNc] : []),
    ...(!terms.mayModify ? [w.warnNd] : []),
    ...(terms.shareAlike ? [w.warnSa] : []),
  ]
}

/**
 * Where a credit line goes in the "picture credits" list at the end of a document
 * whose top-level blocks read as `blocks` (one text per block), as the HWP editor
 * decides it: the list is the last block that is exactly `title` and the credit
 * lines right after it; a new line goes right under the heading (newest first),
 * a line already listed is left alone, and no list yet starts one at the end.
 */
export function gonguCreditListPlan(
  blocks: readonly string[],
  title: string,
  line: string,
): { kind: 'new' } | { kind: 'listed' } | { kind: 'add'; after: number } {
  const lines = blocks.map((block) => block.trim())
  const at = lines.lastIndexOf(title)
  if (at < 0) return { kind: 'new' }
  if (creditListLines(lines.join('\n'), title).includes(line.trim())) return { kind: 'listed' }
  return { kind: 'add', after: at }
}

const FAILURE_KEYS: Record<GonguPickerFailure | 'picture', keyof GonguPickerStrings> = {
  'no-key': 'noKey',
  'bad-key': 'errBadKey',
  'expired-key': 'errExpired',
  quota: 'errQuota',
  rate: 'errRate',
  blocked: 'errBlocked',
  network: 'errNetwork',
  service: 'errService',
  picture: 'pictureFailed',
}

export function GonguPicker(p: {
  lang: string
  api: GonguPickerApi
  /** the editor places the picture with its credit; false when nothing went in */
  onInsert(picked: GonguPicked): Promise<boolean> | boolean
  onClose(): void
  /** asks about a work with conditions; window.confirm by default */
  confirm?: (message: string) => boolean
  /** opens Settings → Integrations; with it the "key needed" note carries a button there */
  onOpenSettings?: () => void
}) {
  const t = (key: keyof GonguPickerStrings, params?: Params) => gonguPickerText(p.lang, key, params)
  const modalKeys = useModalKeys(p.onClose, { restoreFocus: true })
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const [works, setWorks] = useState<GonguPickerHit[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [lastEmpty, setLastEmpty] = useState(false)
  const [busy, setBusy] = useState<'search' | 'insert' | null>(null)
  const [error, setError] = useState<keyof GonguPickerStrings | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  // the key is checked when the dialog opens (an empty search: no words leave the PC and
  // main answers without a request), so the guidance shows before the first search
  const [noKey, setNoKey] = useState(false)
  const { api } = p
  useEffect(() => {
    let live = true
    void api
      .gonguSearch('', 1)
      .then((answer) => {
        if (live && answer && !answer.ok && answer.error === 'no-key') setNoKey(true)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [api])

  const search = async (words: string, nextPage: number) => {
    if (!words.trim() || busy) return
    setBusy('search')
    setError(null)
    const answer = await p.api.gonguSearch(words, nextPage).catch(() => null)
    setBusy(null)
    if (!answer) return setError('errService')
    if (!answer.ok && answer.error === 'no-key') {
      setNoKey(true)
      return setError(null)
    }
    if (!answer.ok) return setError(FAILURE_KEYS[answer.error])
    setNoKey(false)
    setAsked(words)
    setPage(nextPage)
    setTotal(answer.total)
    setLastEmpty(answer.works.length === 0)
    setWorks((list) => {
      if (nextPage === 1) return answer.works
      const seen = new Set(list.map((w) => w.workId))
      return [...list, ...answer.works.filter((w) => !seen.has(w.workId))]
    })
    if (nextPage === 1) setChosen(null)
  }

  const insert = async (workId: string) => {
    if (busy) return
    setBusy('insert')
    setError(null)
    const answer = await p.api.gonguPicture(workId).catch(() => null)
    if (!answer || !answer.ok) {
      setBusy(null)
      return setError(answer ? FAILURE_KEYS[answer.error] : 'pictureFailed')
    }
    const credit = gonguCreditOf(answer.work, answer.license)
    const warnings = gonguInsertWarnings(credit.license, p.lang)
    const ask = p.confirm ?? ((message: string) => window.confirm(message))
    if (warnings.length && !ask(t('confirm', { conditions: warnings.join('\n') }))) {
      setBusy(null)
      return
    }
    const done = await Promise.resolve(
      p.onInsert({
        dataUrl: answer.dataUrl,
        width: answer.width,
        height: answer.height,
        title: answer.work.title,
        credit,
        creditLine: formatCreditLine(credit, p.lang),
        creditListTitle: creditListTitle(p.lang),
      }),
    ).catch(() => false)
    setBusy(null)
    if (done) p.onClose()
    else setError('pictureFailed')
  }

  const pick = works.find((w) => w.workId === chosen) ?? null
  const more = works.length > 0 && !lastEmpty && (total === null || works.length < total)
  // on the body: a ribbon or toolbar that opens it may clip or transform its own box
  return createPortal(
    <div
      className="gs-gongu-mask"
      ref={modalKeys.ref}
      onKeyDown={modalKeys.onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) p.onClose()
      }}
    >
      <div
        className="gs-gongu"
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        data-hanpan="gongu-picker"
      >
        <div className="gs-gongu-head">
          <span className="gs-gongu-title">{t('title')}</span>
          <button
            type="button"
            className="gs-gongu-close"
            aria-label={t('close')}
            title={t('close')}
            onClick={p.onClose}
            data-action="gongu-close"
          >
            ×
          </button>
        </div>
        <form
          className="gs-gongu-form"
          onSubmit={(e) => {
            e.preventDefault()
            void search(query, 1)
          }}
        >
          <input
            type="search"
            value={query}
            placeholder={t('placeholder')}
            onChange={(e) => setQuery(e.target.value)}
            data-hanpan="gongu-query"
          />
          <button type="submit" disabled={!query.trim() || !!busy} data-action="gongu-search">
            {busy === 'search' ? t('searching') : t('search')}
          </button>
        </form>
        {noKey && (
          <div className="gs-gongu-nokey" role="status" data-hanpan="gongu-no-key">
            <p>
              <strong>{t('noKey')}</strong> {t('noKeyHint')}
            </p>
            {p.onOpenSettings && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  p.onOpenSettings?.()
                  p.onClose()
                }}
                data-action="gongu-open-settings"
              >
                {t('openSettings')}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="gs-gongu-error" role="status">
            {t(error)}
          </p>
        )}
        {!error && asked && !busy && works.length === 0 && (
          <p className="gs-gongu-dim">{t('noResults')}</p>
        )}
        {works.length > 0 && total !== null && (
          <p className="gs-gongu-dim">{t('total', { count: total })}</p>
        )}
        {works.length > 0 && (
          <div className="gs-gongu-grid">
            {works.map((w) => (
              <button
                key={w.workId}
                type="button"
                className={chosen === w.workId ? 'on' : ''}
                title={w.author ? `${w.title} — ${w.author}` : w.title}
                onClick={() => setChosen(w.workId)}
                onDoubleClick={() => void insert(w.workId)}
                data-gongu-work={w.workId}
              >
                {w.thumb ? <img src={w.thumb} alt={w.title} /> : <span>{w.title}</span>}
              </button>
            ))}
          </div>
        )}
        {more && (
          <button
            type="button"
            className="gs-gongu-more"
            disabled={!!busy}
            onClick={() => void search(asked, page + 1)}
            data-action="gongu-more"
          >
            {t('more')}
          </button>
        )}
        {pick && (
          <div className="gs-gongu-pick" data-hanpan="gongu-pick">
            <div className="gs-gongu-pick-text">
              <strong>{pick.title}</strong>
              {pick.author && <span>{pick.author}</span>}
              {pick.year && (
                <span className="gs-gongu-dim">
                  {t('year')}: {pick.year}
                </span>
              )}
            </div>
            <button
              type="button"
              className="primary"
              disabled={!!busy}
              onClick={() => void insert(pick.workId)}
              data-action="gongu-insert"
            >
              {busy === 'insert' ? t('inserting') : t('insert')}
            </button>
          </div>
        )}
        <p className="gs-gongu-dim gs-gongu-foot">{t('footer')}</p>
      </div>
    </div>,
    document.body,
  )
}
