/**
 * "모든 앱" (spec 7.4): every app this build offers, searchable by name and
 * description, the three apps used last, the apps by group and a pin switch
 * per app. Inside it `data-new` marks only the group items; the recent row
 * uses `data-recent-app` so one key never matches twice (plan R6).
 */
import { useState, type ReactElement } from 'react'
import { APP_GROUPS, type AppGroupId, type AppKey } from '../../../shared/home-apps'
import { useDialogKeys } from '../dialog-keys'
import type { HomeAppCard } from '../HomeWidgets'
import { homeCustomText } from '../i18n/strings-home-custom'
import { useI18n, type StringKey } from '../locale'
import { undraggable } from './AppsCard'
import './apps-card.css'

const GROUP_TITLE: Record<AppGroupId, StringKey> = {
  docs: 'hbGroupDocs',
  pdf: 'hbGroupPdf',
  graphics: 'hbGroupGraphics',
  file: 'hbGroupFile',
}

/** how many recent apps the top row shows */
const RECENT_SHOWN = 3

export function AllApps(props: {
  apps: readonly HomeAppCard[]
  pinned: readonly string[]
  recent: readonly string[]
  newKeys: ReadonlySet<string>
  onLaunch: (key: AppKey) => void
  onTogglePin: (key: AppKey) => void
  onClose: () => void
}): ReactElement {
  const { t, lang } = useI18n()
  const ref = useDialogKeys(props.onClose)
  const [query, setQuery] = useState('')
  const byKey = new Map(props.apps.map((app) => [app.key, app]))
  const needle = query.trim().toLowerCase()
  const matches = (app: HomeAppCard): boolean =>
    !needle ||
    app.title.toLowerCase().includes(needle) ||
    (app.sub ?? '').toLowerCase().includes(needle)

  const launch = (key: AppKey): void => {
    props.onLaunch(key)
    props.onClose()
  }

  const recent = props.recent.flatMap((key) => byKey.get(key) ?? []).slice(0, RECENT_SHOWN)
  const groups = APP_GROUPS.map((group) => ({
    id: group.id,
    apps: group.keys.flatMap((key) => {
      const app = byKey.get(key)
      return app && matches(app) ? [app] : []
    }),
  })).filter((group) => group.apps.length > 0)

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div
        ref={ref}
        className="modal home-custom hb-all-apps-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('hbAllApps')}
        data-all-apps
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="hb-all-apps-title">{t('hbAllApps')}</h2>
        <input
          type="search"
          className="hb-all-apps-search"
          data-all-apps-search
          placeholder={t('hbAllAppsSearch')}
          aria-label={t('hbAllAppsSearch')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!needle && recent.length > 0 && (
          <section className="hb-all-apps-section" data-all-apps-recent>
            <h3 className="hb-all-apps-group-title">{t('hbRecentApps')}</h3>
            <div className="hb-all-apps-recent-row">
              {recent.map((app) => (
                <button
                  key={app.key}
                  type="button"
                  className="hb-recent-app"
                  data-recent-app={app.key}
                  onClick={() => launch(app.key as AppKey)}
                >
                  {undraggable(app.icon)}
                  <span className="hb-app-name">{app.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {groups.length === 0 ? (
          <p className="hb-all-apps-none">{t('hbSearchNoApps')}</p>
        ) : (
          groups.map((group) => (
            <section key={group.id} className="hb-all-apps-section" data-app-group={group.id}>
              <h3 className="hb-all-apps-group-title">{t(GROUP_TITLE[group.id])}</h3>
              <ul className="hb-all-apps-list">
                {group.apps.map((app) => {
                  const key = app.key as AppKey
                  const pinned = props.pinned.includes(key)
                  return (
                    <li key={key} className="hb-all-apps-row">
                      <button
                        type="button"
                        className="hb-all-apps-item"
                        data-new={key}
                        onClick={() => launch(key)}
                      >
                        {undraggable(app.icon)}
                        <span className="hb-all-apps-text">
                          <span className="hb-app-name">
                            {app.title}
                            {props.newKeys.has(key) && (
                              <span className="hb-new-mark" data-app-new>
                                {t('hbNewApp')}
                              </span>
                            )}
                          </span>
                          {app.sub && <span className="hb-all-apps-sub">{app.sub}</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="hb-pin"
                        data-app-pin={key}
                        aria-pressed={pinned}
                        onClick={() => props.onTogglePin(key)}
                      >
                        {homeCustomText(lang, pinned ? 'unpin' : 'pin')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
