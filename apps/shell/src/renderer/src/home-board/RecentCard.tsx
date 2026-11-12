import { useEffect, useState, type ReactElement } from 'react'
import type { RecentEntry } from '../../../shared/home-api'
import { homeCustomText } from '../i18n/strings-home-custom'
import { useI18n } from '../locale'

/**
 * The recent card (spec 7.6, "이어서 하기"): the files opened last, newest
 * first, as many as the card has rows, and a way to the whole list. A row
 * opens its file; a file that is gone stays listed but cannot be opened.
 */
export function RecentCard({
  title,
  rows,
  total,
  reloadKey,
  onShowAll,
  describe,
  iconFor,
}: {
  title: string
  /** how many files the card lists */
  rows: number
  /** how many recent files there are in all */
  total: number
  /** changes when the recents list changes */
  reloadKey: unknown
  onShowAll: () => void
  /** where a file is and when it was changed, as Home's list says it */
  describe: (entry: RecentEntry) => { location: string; modified: string }
  iconFor: (ext: string) => ReactElement
}): ReactElement {
  const { t, lang } = useI18n()
  const [entries, setEntries] = useState<RecentEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice.recents?.({ limit: rows }))
      .then((page) => {
        if (alive) setEntries(Array.isArray(page?.entries) ? page.entries.slice(0, rows) : [])
      })
      .catch(() => {
        if (alive) setEntries([])
      })
    return () => {
      alive = false
    }
  }, [rows, reloadKey])

  return (
    <section className="hb-recent">
      <header className="hb-recent-head">
        <h2 className="hb-card-title">{title}</h2>
        {/* nothing to show when there is no document yet */}
        {total > 0 && (
          <button type="button" className="hb-head-btn" data-recent-all="" onClick={onShowAll}>
            {t('hbRecentAll', { n: total })}
          </button>
        )}
      </header>
      {entries && entries.length === 0 ? (
        <p className="hw-empty">{homeCustomText(lang, 'recentEmpty')}</p>
      ) : (
        <ul className="hb-recent-list">
          {(entries ?? []).map((entry) => {
            const { location, modified } = describe(entry)
            return (
              <li key={entry.path}>
                <button
                  type="button"
                  className="hb-recent-row"
                  data-recent-file={entry.path}
                  disabled={entry.missing === true}
                  onClick={() => void window.aiOffice.openPath(entry.path)}
                >
                  {iconFor(entry.ext)}
                  <span className="hb-recent-name" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="hb-recent-where">{location}</span>
                  <span className="hb-recent-when">{modified}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
