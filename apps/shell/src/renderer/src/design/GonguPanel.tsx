/**
 * Hanpan design board: finding Gongu pictures (docs/plans/gongu-images.md
 * 4.5). The search runs in main with the key from Settings → Integrations;
 * this panel sends only the words, shows the thumbnails main fetched, and
 * hands the picked work to the board, which inserts it with its credit line.
 */
import { useState } from 'react'
import { gonguUiText, type GonguStringKey } from '../i18n/strings-gongu'
import type { GonguApi, GonguFailure, GonguHit, GonguPictureAnswer } from './credits'

const FAILURE_KEYS: Record<GonguFailure | 'picture', GonguStringKey> = {
  'no-key': 'gpNoKey',
  'bad-key': 'gonguErrBadKey',
  'expired-key': 'gonguErrExpired',
  quota: 'gonguErrQuota',
  rate: 'gonguErrRate',
  blocked: 'gonguErrBlocked',
  network: 'gonguErrNetwork',
  service: 'gonguErrService',
  picture: 'gpPictureFailed',
}

type Picked = Extract<GonguPictureAnswer, { ok: true }>

export function GonguPanel(p: {
  lang: string
  api: GonguApi
  /** the board places the picture; false when it was not inserted (the person said no) */
  insert(picked: Picked): boolean
  /** opens Settings → Integrations, where the key goes; shown when there is no usable key */
  openSettings?: () => void
  openSettingsLabel?: string
}) {
  const t = (key: GonguStringKey, params?: Record<string, string | number>) =>
    gonguUiText(p.lang as never, key, params)
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const [works, setWorks] = useState<GonguHit[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [lastEmpty, setLastEmpty] = useState(false)
  const [busy, setBusy] = useState<'search' | 'insert' | null>(null)
  const [error, setError] = useState<GonguStringKey | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)

  const search = async (words: string, nextPage: number) => {
    if (!words.trim() || busy) return
    setBusy('search')
    setError(null)
    const answer = await p.api.gonguSearch(words, nextPage).catch(() => null)
    setBusy(null)
    if (!answer) return setError('gonguErrService')
    if (!answer.ok) return setError(FAILURE_KEYS[answer.error])
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
    setBusy(null)
    if (!answer) return setError('gpPictureFailed')
    if (!answer.ok) return setError(FAILURE_KEYS[answer.error])
    p.insert(answer)
  }

  const pick = works.find((w) => w.workId === chosen) ?? null
  const more = works.length > 0 && !lastEmpty && (total === null || works.length < total)
  return (
    <div className="dz-gongu" data-hanpan="gongu-panel">
      <form
        className="dz-gongu-form"
        onSubmit={(e) => {
          e.preventDefault()
          void search(query, 1)
        }}
      >
        <input
          type="search"
          value={query}
          placeholder={t('gpPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
          data-hanpan="gongu-query"
        />
        <button type="submit" disabled={!query.trim() || !!busy} data-action="gongu-search">
          {busy === 'search' ? t('gpSearching') : t('gpSearch')}
        </button>
      </form>
      {error && (
        <p className="dz-muted dz-gongu-error" role="status">
          {t(error)}
          {/* the board is a window of its own: the way to Settings is a button (점검 v2 #16) */}
          {(error === 'gpNoKey' || error === 'gonguErrBadKey' || error === 'gonguErrExpired') &&
            p.openSettings && (
              <button
                type="button"
                className="dz-gongu-settings"
                onClick={p.openSettings}
                data-action="gongu-open-settings"
              >
                {p.openSettingsLabel}
              </button>
            )}
        </p>
      )}
      {!error && asked && !busy && works.length === 0 && (
        <p className="dz-muted">{t('gpNoResults')}</p>
      )}
      {works.length > 0 && total !== null && (
        <p className="dz-muted">{t('gpTotal', { count: total })}</p>
      )}
      {works.length > 0 && (
        <div className="dz-gongu-grid">
          {works.map((w) => (
            <button
              key={w.workId}
              type="button"
              className={chosen === w.workId ? 'on' : ''}
              title={w.author ? `${w.title} — ${w.author}` : w.title}
              onClick={() => setChosen(w.workId)}
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
          className="dz-wide"
          disabled={!!busy}
          onClick={() => void search(asked, page + 1)}
          data-action="gongu-more"
        >
          {t('gpMore')}
        </button>
      )}
      {pick && (
        <div className="dz-gongu-pick" data-hanpan="gongu-pick">
          <strong>{pick.title}</strong>
          {pick.author && <span>{pick.author}</span>}
          {pick.year && (
            <span className="dz-muted">
              {t('gpYear')}: {pick.year}
            </span>
          )}
          <button
            type="button"
            className="primary"
            disabled={!!busy}
            onClick={() => void insert(pick.workId)}
            data-action="gongu-insert"
          >
            {busy === 'insert' ? t('gpInserting') : t('gpInsert')}
          </button>
        </div>
      )}
      <p className="dz-muted">{t('gpFooter')}</p>
    </div>
  )
}
