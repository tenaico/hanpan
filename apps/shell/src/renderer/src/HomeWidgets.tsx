import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { Lang } from '@genoffice/i18n'
import type { FileEntry, FolderRoot, RecentEntry, UiTheme } from '../../shared/home-api'
import {
  HOME_MEMO_MAX,
  HOME_TITLE_MAX,
  arrangeKeys,
  canAddWidget,
  moveKey,
  moveWidget,
  removeWidget,
  resetHomeLayout,
  toggleKey,
  validLinkUrl,
  type HomeLayout,
  type HomeWidget,
  type HomeWidgetType,
  type ShortcutKind,
  type ShortcutTarget,
} from '../../shared/home-layout'
import {
  CARD_SIZES,
  parseSizeKey,
  sizeKey,
  type BoardCard,
  type BoardCardType,
  type HomeBoard,
} from '../../shared/home-board'
import { moveCard, updateCard } from '../../shared/home-board-edit'
import { useDialogKeys } from './dialog-keys'
import { homeCustomText, type HomeCustomStringKey } from './i18n/strings-home-custom'
import './home-widgets.css'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home's widgets (recent documents,
 * favorites, notes, shortcuts, folder views, a clock), the gallery that adds
 * them and the "홈 꾸미기" panel. Everything stays on this computer: the layout
 * goes to userData/app-settings.json, the file lists come from the lists and
 * folders Home already reads. Nothing is fetched from the network.
 */

/** one app card as the panel, the favorites widget and app shortcuts see it */
export interface HomeAppCard {
  key: string
  title: string
  /** one line on what the app does, shown in "모든 앱" */
  sub?: string
  icon: ReactElement
  action: () => unknown
}

type Update = (change: (prev: HomeLayout) => HomeLayout) => void
type Text = (key: HomeCustomStringKey) => string
/** a 0.18 widget in the widget row, or a card on the 0.19 board */
type WidgetLike = HomeWidget | BoardCard

/** how many files the list widgets show */
const WIDGET_FILES = 5
/** a note is written out this long after the last keystroke (and on leaving the box) */
const MEMO_SAVE_DELAY_MS = 800
/** the widgets that open their settings right after being added */
const CONFIGURE_ON_ADD: readonly HomeWidgetType[] = ['memo', 'shortcut', 'folder']
/** the gallery's order: what people add most first */
const GALLERY_ORDER: readonly HomeWidgetType[] = [
  'shortcut',
  'memo',
  'folder',
  'clock',
  'recent',
  'favorites',
]

export function configuresOnAdd(type: HomeWidgetType): boolean {
  return CONFIGURE_ON_ADD.includes(type)
}

/** `cards` as the person arranged them, hidden ones dropped unless `withHidden` (0.18 panel) */
function arrangeCards<T extends { key: string }>(
  cards: readonly T[],
  layout: HomeLayout,
  withHidden = false,
): T[] {
  const byKey = new Map(cards.map((card) => [card.key, card]))
  return arrangeKeys(
    cards.map((card) => card.key),
    layout.cardOrder,
  )
    .filter((key) => withHidden || !layout.hiddenCards.includes(key))
    .map((key) => byKey.get(key)!)
}

const TYPE_NAME: Record<BoardCardType, HomeCustomStringKey> = {
  start: 'cardStart',
  trend: 'cardTrend',
  apps: 'cardApps',
  recent: 'widgetRecent',
  favorites: 'widgetFavorites',
  memo: 'widgetNote',
  shortcut: 'widgetShortcut',
  folder: 'widgetFolder',
  clock: 'widgetClock',
}
const TYPE_DESC: Record<HomeWidgetType, HomeCustomStringKey> = {
  recent: 'descRecent',
  favorites: 'descFavorites',
  memo: 'descNote',
  shortcut: 'descShortcut',
  folder: 'descFolder',
  clock: 'descClock',
}

function lastSegment(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/** the name a card goes by on the board (its frame's label): fixed for the built-in cards */
export function boardCardName(card: BoardCard, lang: Lang, apps: readonly HomeAppCard[]): string {
  const text: Text = (key) => homeCustomText(lang, key)
  switch (card.type) {
    case 'start':
    case 'trend':
    case 'apps':
      return text(TYPE_NAME[card.type])
    case 'recent':
      return card.title || text('widgetRecent')
    default:
      return widgetTitle(card, text, apps)
  }
}

/** the name a widget shows: the person's title, else something that says what it holds */
export function widgetTitle(widget: WidgetLike, text: Text, cards: readonly HomeAppCard[]): string {
  if (widget.title) return widget.title
  if (widget.type === 'memo' && widget.id === 'memo') return text('widgetMemo')
  if (widget.type === 'folder' && widget.path) return lastSegment(widget.path)
  if (widget.type === 'shortcut' && widget.target) {
    const { kind, value } = widget.target
    if (kind === 'app') return cards.find((card) => card.key === value)?.title ?? value
    if (kind === 'link') return new URL(value).host
    return lastSegment(value)
  }
  return text(TYPE_NAME[widget.type])
}

function useFileList(kind: 'recents' | 'starred', reloadKey: unknown): RecentEntry[] {
  const [entries, setEntries] = useState<RecentEntry[]>([])
  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice[kind]?.({ limit: WIDGET_FILES }))
      .then((page) => {
        if (alive)
          setEntries(Array.isArray(page?.entries) ? page.entries.slice(0, WIDGET_FILES) : [])
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [kind, reloadKey])
  return entries
}

function FileList({
  entries,
  empty,
  attr,
}: {
  entries: ReadonlyArray<RecentEntry | FileEntry>
  empty: string
  attr: 'data-fav-file' | 'data-recent-file' | 'data-folder-file'
}) {
  if (entries.length === 0) return <p className="hw-empty">{empty}</p>
  return (
    <ul className="hw-files">
      {entries.map((entry) => (
        <li key={entry.path}>
          <button
            type="button"
            className="hw-file"
            {...{ [attr]: entry.path }}
            title={entry.path}
            disabled={'missing' in entry && entry.missing === true}
            onClick={() => void window.aiOffice.openPath(entry.path)}
          >
            <span className="hw-ext">{entry.ext.toUpperCase()}</span>
            <span className="hw-name">{entry.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** the starred files; apps are pinned to the new card now, not here (spec 7.7) */
function FavoritesBody({ text, reloadKey }: { text: Text; reloadKey: unknown }) {
  const starred = useFileList('starred', reloadKey)
  return <FileList entries={starred} empty={text('favoritesEmpty')} attr="data-fav-file" />
}

function MemoBody({
  memo,
  placeholder,
  onSave,
}: {
  memo: string
  placeholder: string
  onSave: (text: string) => void
}) {
  const [value, setValue] = useState(memo)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // the stored text arrives after the first paint; take it unless the person is typing
  useEffect(() => {
    if (!dirty.current) setValue(memo)
  }, [memo])
  const flush = (text: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirty.current) return
    dirty.current = false
    onSave(text)
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  const valueRef = useRef(value)
  valueRef.current = value
  useEffect(() => () => flushRef.current(valueRef.current), [])
  return (
    <textarea
      className="hw-memo"
      value={value}
      maxLength={HOME_MEMO_MAX}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => {
        const text = event.target.value
        setValue(text)
        dirty.current = true
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => flushRef.current(text), MEMO_SAVE_DELAY_MS)
      }}
      onBlur={(event) => flush(event.target.value)}
    />
  )
}

const KIND_GLYPH: Record<ShortcutKind, string> = { file: '📄', folder: '📁', link: '🔗', app: '▦' }

/** a widget with nothing chosen yet: the empty state itself opens its settings */
function UnsetBody({ text, onSetUp }: { text: Text; onSetUp: () => void }) {
  return (
    <div className="hw-unset">
      <p className="hw-empty">{text('notSet')}</p>
      <button type="button" className="hw-small-btn hw-done" data-widget-setup="" onClick={onSetUp}>
        {text('setUp')}
      </button>
    </div>
  )
}

/** a shortcut with no target, or a folder view with no folder */
export function widgetUnset(widget: HomeWidget): boolean {
  return (
    (widget.type === 'shortcut' && !widget.target) || (widget.type === 'folder' && !widget.path)
  )
}

function ShortcutBody({
  target,
  title,
  cards,
  text,
  onSetUp,
}: {
  target: ShortcutTarget | null
  title: string
  cards: readonly HomeAppCard[]
  text: Text
  onSetUp: () => void
}) {
  const [failed, setFailed] = useState(false)
  if (!target) return <UnsetBody text={text} onSetUp={onSetUp} />
  const card = target.kind === 'app' ? cards.find((c) => c.key === target.value) : undefined
  const open = async () => {
    setFailed(false)
    if (target.kind === 'app') {
      if (card) void card.action()
      else setFailed(true)
      return
    }
    const ok = await Promise.resolve(window.aiOffice.openWidgetTarget?.(target)).catch(() => false)
    if (!ok) setFailed(true)
  }
  return (
    <>
      <button
        type="button"
        className="hw-shortcut"
        data-shortcut-open={target.kind}
        title={target.kind === 'app' ? title : target.value}
        onClick={() => void open()}
      >
        {card ? (
          card.icon
        ) : (
          <span className="hw-glyph" aria-hidden="true">
            {KIND_GLYPH[target.kind]}
          </span>
        )}
        <span className="hw-name">{title}</span>
      </button>
      {failed && (
        <p className="hw-error" role="alert">
          {text('openFailed')}
        </p>
      )}
    </>
  )
}

function FolderBody({ path, text, reloadKey }: { path: string; text: Text; reloadKey: unknown }) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!path) return
    let alive = true
    Promise.resolve(window.aiOffice.listFolder?.(path))
      .then((listing) => {
        if (!alive) return
        setMissing(!listing || listing.missing === true)
        setFiles(Array.isArray(listing?.files) ? listing.files.slice(0, WIDGET_FILES) : [])
      })
      .catch(() => {
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
    }
  }, [path, reloadKey])
  if (!path) return <p className="hw-empty">{text('notSet')}</p>
  if (missing) return <p className="hw-empty">{text('openFailed')}</p>
  return <FileList entries={files} empty={text('folderEmpty')} attr="data-folder-file" />
}

function ClockBody({ dateLocale }: { dateLocale: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(timer)
  }, [])
  const locale = dateLocale || undefined
  return (
    <div className="hw-clock">
      <span className="hw-clock-time" data-clock-time="">
        {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="hw-clock-date">
        {now.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </span>
    </div>
  )
}

function MoveButtons({
  text,
  onMove,
  first = false,
  last = false,
}: {
  text: Text
  onMove: (delta: -1 | 1) => void
  /** the item is already first / last: that direction has nowhere to go */
  first?: boolean
  last?: boolean
}) {
  return (
    <span className="hc-move">
      <button
        type="button"
        data-move="up"
        aria-label={text('moveUp')}
        title={text('moveUp')}
        disabled={first}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        data-move="down"
        aria-label={text('moveDown')}
        title={text('moveDown')}
        disabled={last}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </span>
  )
}

/**
 * A widget's settings, shown in place of its body; changes are stored as they
 * are made. What a change does is the caller's: the 0.18 widget row and the
 * board store them differently.
 */
function WidgetForm({
  widget,
  cards,
  text,
  sizeOptions,
  sizeValue,
  onPatch: patch,
  onSize,
  onMove,
  onDone,
}: {
  widget: WidgetLike
  cards: readonly HomeAppCard[]
  text: Text
  sizeOptions: { value: string; label: string }[]
  sizeValue: string
  onPatch: (values: Record<string, unknown>) => void
  onSize: (value: string) => void
  onMove: (delta: -1 | 1) => void
  onDone: () => void
}) {
  /** the name the card shows while the title is empty, offered as the field's hint */
  const shownName = widgetTitle({ ...widget, title: '' }, text, cards)
  const target = widget.type === 'shortcut' ? widget.target : null
  const [kind, setKind] = useState<ShortcutKind>(target?.kind ?? 'file')
  const [link, setLink] = useState(target?.kind === 'link' ? target.value : '')
  const [linkError, setLinkError] = useState(false)
  const [roots, setRoots] = useState<FolderRoot[]>([])
  const loadRoots = useCallback(() => {
    Promise.resolve(window.aiOffice.folderRoots?.())
      .then((list) => setRoots(Array.isArray(list) ? list.filter((root) => root.readable) : []))
      .catch(() => undefined)
  }, [])
  useEffect(() => {
    if (widget.type === 'folder') loadRoots()
  }, [widget.type, loadRoots])

  const setTarget = (next: ShortcutTarget | null) => patch({ target: next })
  /** a typed link is stored only once it is a full http(s) address */
  const commitLink = (): boolean => {
    if (widget.type !== 'shortcut' || kind !== 'link') return true
    const href = validLinkUrl(link)
    setLinkError(!href)
    if (href) setTarget({ kind: 'link', value: href })
    return !!href
  }
  const pick = async (pickKind: 'file' | 'folder') => {
    const path = await Promise.resolve(window.aiOffice.pickWidgetTarget?.(pickKind)).catch(
      () => null,
    )
    if (path) setTarget({ kind: pickKind, value: path })
  }
  const addFolder = () =>
    void Promise.resolve(window.aiOffice.addFolderRoot?.())
      .then((added) => {
        loadRoots()
        if (added?.path) patch({ path: added.path })
      })
      .catch(() => undefined)

  return (
    <div className="hw-form" data-widget-form="">
      <label className="hw-field">
        <span>{text('title')}</span>
        <input
          name="title"
          value={widget.title}
          placeholder={shownName}
          maxLength={HOME_TITLE_MAX}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>
      {widget.type === 'shortcut' && (
        <>
          <label className="hw-field">
            <span>{text('kind')}</span>
            <select
              name="kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as ShortcutKind)
                setLinkError(false)
              }}
            >
              <option value="file">{text('kindFile')}</option>
              <option value="folder">{text('kindFolder')}</option>
              <option value="app">{text('kindApp')}</option>
              <option value="link">{text('kindLink')}</option>
            </select>
          </label>
          {(kind === 'file' || kind === 'folder') && (
            <div className="hw-pick" data-pick-row="">
              {/* what is chosen, else what to do next: it wraps inside the card */}
              {target?.kind === kind ? (
                <span className="hw-path" title={target.value}>
                  {target.value}
                </span>
              ) : (
                <span className="hw-hint" data-pick-hint="">
                  {text(kind === 'file' ? 'pickFileHint' : 'pickFolderHint')}
                </span>
              )}
              <button
                type="button"
                className="hw-small-btn"
                data-pick={kind}
                onClick={() => void pick(kind)}
              >
                {text('pick')}
              </button>
            </div>
          )}
          {kind === 'app' && (
            <label className="hw-field">
              <span>{text('kindApp')}</span>
              <select
                name="app"
                value={target?.kind === 'app' ? target.value : ''}
                onChange={(event) =>
                  setTarget(event.target.value ? { kind: 'app', value: event.target.value } : null)
                }
              >
                <option value="">—</option>
                {cards.map((card) => (
                  <option key={card.key} value={card.key}>
                    {card.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === 'link' && (
            <label className="hw-field">
              <span>{text('kindLink')}</span>
              <input
                name="link"
                type="url"
                value={link}
                placeholder="https://"
                onChange={(event) => {
                  setLink(event.target.value)
                  setLinkError(false)
                }}
                onBlur={() => {
                  if (link) commitLink()
                }}
              />
            </label>
          )}
          {linkError && (
            <p className="hw-error" role="alert">
              {text('linkInvalid')}
            </p>
          )}
        </>
      )}
      {widget.type === 'folder' && (
        <>
          <div className="hw-field">
            <span>{text('kindFolder')}</span>
            <select
              name="folder"
              value={widget.path}
              aria-label={text('kindFolder')}
              onChange={(event) => patch({ path: event.target.value })}
            >
              <option value="">—</option>
              {/* a folder chosen earlier stays selectable even if it left the sidebar */}
              {widget.path && !roots.some((root) => root.path === widget.path) && (
                <option value={widget.path}>{widget.path}</option>
              )}
              {roots.map((root) => (
                <option key={root.path} value={root.path}>
                  {root.name}
                </option>
              ))}
            </select>
            <button type="button" className="hw-small-btn" onClick={addFolder}>
              {text('addFolder')}
            </button>
          </div>
          <p className="hw-hint">{text('folderHint')}</p>
        </>
      )}
      <div className="hw-form-row">
        <label className="hw-field">
          <span>{text('size')}</span>
          <select name="size" value={sizeValue} onChange={(event) => onSize(event.target.value)}>
            {sizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <MoveButtons text={text} onMove={onMove} />
        <button
          type="button"
          className="hw-small-btn hw-done"
          data-widget-done=""
          onClick={() => {
            if (commitLink()) onDone()
          }}
        >
          {text('done')}
        </button>
      </div>
    </div>
  )
}

/**
 * A widget card's head and body on the board (spec 7.7): its name, its
 * settings button and either its settings or what it shows. The board draws
 * the card around it; start, trend, apps and recent have bodies of their own.
 */
export function WidgetBody({
  card,
  update,
  apps,
  lang,
  dateLocale,
  reloadKey,
  editing,
  onEdit,
}: {
  card: BoardCard
  update: (change: (prev: HomeBoard) => HomeBoard) => void
  /** every app Home offers (app shortcuts open them) */
  apps: readonly HomeAppCard[]
  lang: Lang
  dateLocale: string
  /** changes when the recents or starred lists change */
  reloadKey: unknown
  editing: boolean
  onEdit: (id: string | null) => void
}): ReactElement {
  const text: Text = (key) => homeCustomText(lang, key)
  const title = widgetTitle(card, text, apps)
  const patch = (values: Record<string, unknown>) =>
    update((prev) => updateCard(prev, card.id, values))

  const body = (): ReactElement | null => {
    switch (card.type) {
      case 'favorites':
        return <FavoritesBody text={text} reloadKey={reloadKey} />
      case 'memo':
        return (
          <MemoBody
            memo={card.text}
            placeholder={text('memoPlaceholder')}
            onSave={(memo) => patch({ text: memo })}
          />
        )
      case 'shortcut':
        return (
          <ShortcutBody
            target={card.target}
            title={title}
            cards={apps}
            text={text}
            onSetUp={() => onEdit(card.id)}
          />
        )
      case 'folder':
        if (!card.path) return <UnsetBody text={text} onSetUp={() => onEdit(card.id)} />
        return <FolderBody path={card.path} text={text} reloadKey={reloadKey} />
      case 'clock':
        return <ClockBody dateLocale={dateLocale} />
      default:
        return null
    }
  }

  return (
    <>
      <header className="hw-head">
        <h2 className="hw-title">{title}</h2>
        <button
          type="button"
          className="hw-icon-btn"
          data-widget-settings=""
          // a card name keeps the many "settings" buttons on Home apart
          aria-label={`${title} ${text('settings')}`}
          title={text('settings')}
          aria-pressed={editing}
          onClick={() => onEdit(editing ? null : card.id)}
        >
          ⚙
        </button>
      </header>
      {editing ? (
        <WidgetForm
          widget={card}
          cards={apps}
          text={text}
          sizeOptions={CARD_SIZES[card.type].map((s) => ({
            value: sizeKey(s),
            label: homeCustomText(lang, 'sizeOption', { w: s.w, h: s.h }),
          }))}
          sizeValue={sizeKey(card)}
          onPatch={patch}
          onSize={(value) => {
            const next = parseSizeKey(value)
            if (next) patch({ ...next })
          }}
          onMove={(delta) => update((prev) => moveCard(prev, card.id, delta))}
          onDone={() => onEdit(null)}
        />
      ) : (
        body()
      )}
    </>
  )
}

/** "위젯 추가": every widget type, with what it does */
export function WidgetGallery({
  layout,
  lang,
  onPick,
  onClose,
}: {
  layout: HomeLayout
  lang: Lang
  onPick: (type: HomeWidgetType) => void
  onClose: () => void
}) {
  const text: Text = (key) => homeCustomText(lang, key)
  const dialogRef = useDialogKeys(onClose)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal home-custom hw-gallery"
        role="dialog"
        aria-modal="true"
        aria-label={text('addWidget')}
        data-widget-gallery=""
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{text('addWidget')}</h3>
        <ul className="hw-gallery-list">
          {GALLERY_ORDER.map((type) => {
            const allowed = canAddWidget(layout, type)
            return (
              <li key={type}>
                <button
                  type="button"
                  className="hw-gallery-item"
                  data-add-type={type}
                  disabled={!allowed}
                  onClick={() => onPick(type)}
                >
                  <span className="hw-gallery-name">{text(TYPE_NAME[type])}</span>
                  <span className="hw-gallery-desc">
                    {allowed ? text(TYPE_DESC[type]) : text('already')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="hc-actions">
          <span />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {text('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function HomeCustomizePanel({
  layout,
  update,
  groups,
  cards,
  lang,
  themeLabels,
  onOpenGallery,
  onClose,
}: {
  layout: HomeLayout
  update: Update
  /** the app card groups as Home shows them (each reorders within itself) */
  groups: ReadonlyArray<{ label: string; cards: readonly HomeAppCard[] }>
  cards: readonly HomeAppCard[]
  lang: Lang
  /** the theme labels Settings uses, so both places say the same */
  themeLabels: { title: string } & Record<UiTheme, string>
  onOpenGallery: () => void
  onClose: () => void
}) {
  const text: Text = (key) => homeCustomText(lang, key)
  const [theme, setThemeState] = useState<UiTheme>('system')
  /** "기본값으로 되돌리기" wipes the arrangement: it asks once first */
  const [askReset, setAskReset] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice.getTheme?.())
      .then((saved) => {
        if (alive && (saved === 'light' || saved === 'dark' || saved === 'system'))
          setThemeState(saved)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  const chooseTheme = (next: UiTheme) => {
    setThemeState(next)
    void Promise.resolve(window.aiOffice.setTheme?.(next)).catch(() => undefined)
  }
  const dialogRef = useDialogKeys(onClose)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal home-custom"
        role="dialog"
        aria-modal="true"
        aria-label={text('customize')}
        data-home-custom="panel"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{text('customize')}</h3>
        <div className="hc-body">
          <fieldset className="hc-group">
            <legend>{text('widgets')}</legend>
            <ul className="hc-list">
              {layout.widgets.map((widget, index) => (
                <li key={widget.id} data-custom-widget={widget.id}>
                  <span className="hc-check">
                    <span className="hc-type">{text(TYPE_NAME[widget.type])}</span>
                    {widgetTitle(widget, text, cards)}
                  </span>
                  <MoveButtons
                    text={text}
                    first={index === 0}
                    last={index === layout.widgets.length - 1}
                    onMove={(delta) => update((prev) => moveWidget(prev, widget.id, delta))}
                  />
                  <button
                    type="button"
                    className="hc-pin"
                    data-widget-remove=""
                    aria-label={text('remove')}
                    title={text('remove')}
                    onClick={() => update((prev) => removeWidget(prev, widget.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="home-custom-open hc-add"
              data-home-widgets="add"
              onClick={onOpenGallery}
            >
              + {text('addWidget')}
            </button>
          </fieldset>
          <fieldset className="hc-group">
            <legend>{text('appCards')}</legend>
            {groups.map((group) => {
              const keys = group.cards.map((card) => card.key)
              return (
                <div key={group.label} className="hc-subgroup">
                  <p className="hc-sublabel">{group.label}</p>
                  <ul className="hc-list">
                    {arrangeCards(group.cards, layout, true).map((card, index, arranged) => {
                      const pinnedApp = layout.pinnedApps.includes(card.key)
                      return (
                        <li key={card.key} data-custom-card={card.key}>
                          <label className="hc-check">
                            <input
                              type="checkbox"
                              checked={!layout.hiddenCards.includes(card.key)}
                              onChange={() =>
                                update((prev) => ({
                                  ...prev,
                                  hiddenCards: toggleKey(prev.hiddenCards, card.key),
                                }))
                              }
                            />
                            {card.title}
                          </label>
                          <button
                            type="button"
                            className={pinnedApp ? 'hc-pin is-pinned' : 'hc-pin'}
                            data-pin={pinnedApp ? 'on' : 'off'}
                            aria-pressed={pinnedApp}
                            aria-label={text(pinnedApp ? 'unpin' : 'pin')}
                            title={text(pinnedApp ? 'unpin' : 'pin')}
                            onClick={() =>
                              update((prev) => ({
                                ...prev,
                                pinnedApps: toggleKey(prev.pinnedApps, card.key),
                              }))
                            }
                          >
                            {pinnedApp ? '★' : '☆'}
                          </button>
                          <MoveButtons
                            text={text}
                            first={index === 0}
                            last={index === arranged.length - 1}
                            onMove={(delta) =>
                              update((prev) => ({
                                ...prev,
                                cardOrder: moveKey(keys, prev.cardOrder, card.key, delta),
                              }))
                            }
                          />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </fieldset>
          <fieldset className="hc-group">
            <legend>{themeLabels.title}</legend>
            <div className="hc-radios">
              {(['light', 'dark', 'system'] as const).map((value) => (
                <label key={value} className="hc-check">
                  <input
                    type="radio"
                    name="home-theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => chooseTheme(value)}
                  />
                  {themeLabels[value]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="hc-actions">
          {askReset ? (
            <span className="hc-reset-ask" role="alert">
              {text('resetAsk')}
              <button
                type="button"
                className="btn btn-secondary"
                data-home-custom="reset-confirm"
                onClick={() => {
                  setAskReset(false)
                  update(() => resetHomeLayout())
                  chooseTheme('system')
                }}
              >
                {text('resetYes')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                data-home-custom="reset-cancel"
                onClick={() => setAskReset(false)}
              >
                {text('cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              data-home-custom="reset"
              onClick={() => setAskReset(true)}
            >
              {text('reset')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            data-home-custom="close"
            onClick={onClose}
          >
            {text('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
