/**
 * The top of the editor: a ribbon. The upper row holds the quick-access
 * buttons (save, undo, redo, auto save), the tabs and the save status; the
 * band below shows the tab that is picked, with big buttons (a picture over
 * its name), like the other editors' ribbons.
 *
 * Tabs, left to right: Home (topics, relationship, summary and boundary,
 * find, delete), Insert (picture, icons, link, note, label), Format (layout,
 * sort, theme), Style (the selected topics' own style: `StyleTab.tsx`) and
 * View (present, folding, what the map shows, zoom). Export, "make
 * another document from this one", sending and the AI stay at the end of the
 * band whatever tab is picked.
 *
 * Every tab is drawn and the ones not picked are hidden, so a button is
 * always in the document; the tab picked last is remembered.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { SendTarget } from '@genoffice/hanpan-core/renderer'
import { SendMenu } from '../hanpan/SendMenu'
import { AiMark, aiSubscriptionText, Dropdown, type DropdownOption } from '@genoffice/ui'
import type { ViewLayout } from '@genoffice/xmind-engine'
import { useI18n } from '../i18n/locale'
import type { ExportFormat } from '../../shared/ipc'
import type { HiddenPart } from '../map/hidden-parts'
import { ExportMenu } from './ExportMenu'
import { FileMenu } from './FileMenu'
import { RibbonMenu } from './RibbonMenu'
import { StyleTab, type StyleTabProps } from './StyleTab'
import {
  IconBoundary,
  IconChild,
  IconDelete,
  IconFind,
  IconFit,
  IconFoldAll,
  IconFoldLevel,
  IconLabel,
  IconLayout,
  IconLink,
  IconMakeFrom,
  IconNote,
  IconMarkers,
  IconPicture,
  IconPictureRemove,
  IconPresent,
  IconRedo,
  IconRelationship,
  IconSave,
  IconShow,
  IconSibling,
  IconSort,
  IconSummary,
  IconTheme,
  IconUndo,
  IconUnfoldAll,
  IconZoom100,
  IconZoomIn,
  IconZoomOut,
} from './icons'

export const RIBBON_TABS = ['home', 'insert', 'format', 'style', 'view'] as const
export type RibbonTab = (typeof RIBBON_TABS)[number]

const TAB_LABEL = {
  home: 'tabHome',
  insert: 'tabInsert',
  format: 'tabFormat',
  style: 'tabStyle',
  view: 'tabView',
} as const

const TAB_KEY = 'mindmapapp.ribbonTab'

const PARTS: readonly {
  part: HiddenPart
  label: 'partNotes' | 'partLabels' | 'partLinks' | 'partMarkers' | 'partPictures'
}[] = [
  { part: 'notes', label: 'partNotes' },
  { part: 'labels', label: 'partLabels' },
  { part: 'links', label: 'partLinks' },
  { part: 'markers', label: 'partMarkers' },
  { part: 'pictures', label: 'partPictures' },
]

export interface ToolbarProps {
  disabled: boolean
  dirty: boolean
  /** what the status line says about saving */
  statusText: string
  canUndo: boolean
  canRedo: boolean
  autoSave: boolean
  /** a topic is selected: the topic tools apply */
  hasTopic: boolean
  /** the selected topic shows a picture: the picture button takes it off */
  hasPicture: boolean
  layout: ViewLayout
  /** false while the layout shown stands in for one the editor cannot draw */
  layoutExact: boolean
  pickingRelationship: boolean
  /** the theme panel is open */
  themeOpen: boolean
  /** the note panel is open */
  noteOpen: boolean
  /** the icon panel is open */
  iconsOpen: boolean
  /** the AI panel is open */
  aiOpen: boolean
  /** the find bar is open */
  findOpen: boolean
  /** what the map does not show right now */
  hiddenParts: readonly HiddenPart[]
  onSave(): void
  onSaveAs(): void
  /** the File menu's Open: the shell's open dialog */
  onOpen(): void
  /** the File menu's Print */
  onPrint(): void
  onUndo(): void
  onRedo(): void
  onToggleAutoSave(on: boolean): void
  onAddChild(): void
  onAddSibling(): void
  onRelationship(): void
  onSummary(): void
  onBoundary(): void
  /** the Style tab: what it shows and what its buttons do (it is off while no topic is selected) */
  style: Omit<StyleTabProps, 'disabled'>
  onFind(): void
  onDelete(): void
  onPicture(): void
  onIcons(): void
  onNote(): void
  onLabel(): void
  onLink(): void
  onLayout(layout: ViewLayout): void
  onSort(): void
  onToggleTheme(): void
  onPresent(): void
  onFoldLevel(level: number): void
  onFoldAll(): void
  onUnfoldAll(): void
  onToggleHiddenPart(part: HiddenPart): void
  onZoomIn(): void
  onZoomOut(): void
  onZoomReset(): void
  onZoomFit(): void
  onToggleAi(): void
  onExport(format: ExportFormat): void
  /** "make another document from this one": the shell's make window with this map */
  onMakeFromDocument(): void
  /** the map is in a file: only then can another document be made from it */
  mapSaved: boolean
  /** Hanpan: send the map to a HWP / PPT / Word document */
  onSendTo?(target: SendTarget): void
  /** Hanpan: sync with the documents made from this map */
  onSync?(): void
  /** Hanpan: the picture-credit check */
  onCredits?(): void
  /** Hanpan: card news on the design board */
  onDesign?(): void
}

function rememberedTab(): RibbonTab {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    return (RIBBON_TABS as readonly string[]).includes(saved ?? '') ? (saved as RibbonTab) : 'home'
  } catch {
    return 'home'
  }
}

export function Toolbar(p: ToolbarProps) {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<RibbonTab>(rememberedTab)
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      // the tab is a convenience; without storage it starts on Home next time
    }
  }, [tab])
  const layouts: DropdownOption<ViewLayout>[] = [
    { value: 'right', label: t('layoutRight') },
    { value: 'left', label: t('layoutLeft') },
    { value: 'both', label: t('layoutBoth') },
    { value: 'down', label: t('layoutDown') },
    { value: 'tree', label: t('layoutTree') },
    { value: 'timeline', label: t('layoutTimeline') },
  ]
  const topicOff = p.disabled || !p.hasTopic
  const pane = (name: RibbonTab, children: ReactNode) => (
    <div className="mm-pane" data-ribbon-pane={name} hidden={tab !== name}>
      {children}
    </div>
  )
  return (
    <header className="ribbon mm-ribbon">
      <div className="ribbon-tabs">
        <FileMenu
          disabled={p.disabled}
          onOpen={p.onOpen}
          onSave={p.onSave}
          onSaveAs={p.onSaveAs}
          onExport={p.onExport}
          onPrint={p.onPrint}
        />
        <button
          type="button"
          className="qa-btn"
          data-action="save"
          data-tip={t('save')}
          aria-label={t('save')}
          disabled={p.disabled}
          onClick={p.onSave}
        >
          <IconSave />
        </button>
        <button
          type="button"
          className="qa-btn qa-save-as"
          data-action="save-as"
          disabled={p.disabled}
          onClick={p.onSaveAs}
        >
          {t('saveAs')}
        </button>
        <button
          type="button"
          className="qa-btn"
          data-action="undo"
          data-tip={t('undo')}
          aria-label={t('undo')}
          disabled={p.disabled || !p.canUndo}
          onClick={p.onUndo}
        >
          <IconUndo />
        </button>
        <button
          type="button"
          className="qa-btn"
          data-action="redo"
          data-tip={t('redo')}
          aria-label={t('redo')}
          disabled={p.disabled || !p.canRedo}
          onClick={p.onRedo}
        >
          <IconRedo />
        </button>
        <label className={`autosave-toggle${p.autoSave ? ' on' : ''}`} data-tip={t('autoSaveTip')}>
          <span className="autosave-knob" />
          <span className="autosave-text">{t('autoSave')}</span>
          <input
            type="checkbox"
            checked={p.autoSave}
            onChange={(e) => p.onToggleAutoSave(e.target.checked)}
          />
        </label>
        <span className="qa-sep" />
        <div className="mm-tab-row" role="tablist" aria-label={t('appName')}>
          {RIBBON_TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={`ribbon-tab${tab === name ? ' active' : ''}`}
              data-ribbon-tab={name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTab(name)}
            >
              {t(TAB_LABEL[name])}
            </button>
          ))}
        </div>
        <span className="mm-save-status" data-dirty={p.dirty ? 'true' : 'false'} aria-live="polite">
          {p.statusText}
        </span>
      </div>

      <div className="ribbon-body mm-tools" role="toolbar" aria-label={t('appName')}>
        {pane(
          'home',
          <>
            <Group>
              <Big
                action="add-child"
                label={t('tbAddChild')}
                kbd="Tab"
                disabled={topicOff}
                onClick={p.onAddChild}
              >
                <IconChild />
              </Big>
              <Big
                action="add-sibling"
                label={t('tbAddSibling')}
                kbd="Enter"
                disabled={topicOff}
                onClick={p.onAddSibling}
              >
                <IconSibling />
              </Big>
            </Group>
            <Group>
              <Big
                action="relationship"
                label={t('tbRelationship')}
                active={p.pickingRelationship}
                disabled={topicOff}
                onClick={p.onRelationship}
              >
                <IconRelationship />
              </Big>
              <Big
                action="summary"
                label={t('tbSummary')}
                disabled={topicOff}
                onClick={p.onSummary}
              >
                <IconSummary />
              </Big>
              <Big
                action="boundary"
                label={t('tbBoundary')}
                disabled={topicOff}
                onClick={p.onBoundary}
              >
                <IconBoundary />
              </Big>
            </Group>
            <Group>
              <Big
                action="find"
                label={t('tbFind')}
                kbd="Ctrl+F"
                active={p.findOpen}
                disabled={p.disabled}
                onClick={p.onFind}
              >
                <IconFind />
              </Big>
              <Big
                action="delete-topic"
                label={t('tbDelete')}
                kbd="Delete"
                disabled={topicOff}
                onClick={p.onDelete}
              >
                <IconDelete />
              </Big>
            </Group>
          </>,
        )}
        {pane(
          'insert',
          <Group>
            <Big
              action={p.hasPicture ? 'picture-remove' : 'picture'}
              label={p.hasPicture ? t('tbPictureRemove') : t('tbPicture')}
              disabled={topicOff}
              onClick={p.onPicture}
            >
              {p.hasPicture ? <IconPictureRemove /> : <IconPicture />}
            </Big>
            <Big
              action="icons"
              label={t('tbIcons')}
              active={p.iconsOpen}
              disabled={p.disabled}
              onClick={p.onIcons}
            >
              <IconMarkers />
            </Big>
            <Big action="link" label={t('tbLink')} disabled={topicOff} onClick={p.onLink}>
              <IconLink />
            </Big>
            <Big
              action="note"
              label={t('tbNote')}
              active={p.noteOpen}
              disabled={topicOff}
              onClick={p.onNote}
            >
              <IconNote />
            </Big>
            <Big action="label" label={t('tbLabel')} disabled={topicOff} onClick={p.onLabel}>
              <IconLabel />
            </Big>
          </Group>,
        )}
        {pane(
          'format',
          <>
            <Group>
              <span
                className="mm-layout"
                data-exact={p.layoutExact ? 'true' : 'false'}
                data-tip={p.layoutExact ? t('tbLayout') : t('layoutStandIn')}
              >
                <IconLayout />
                <span className="mm-layout-label">{t('tbLayout')}</span>
                <Dropdown
                  className="mm-layout-pick"
                  value={p.layout}
                  options={layouts}
                  onPick={p.onLayout}
                  ariaLabel={t('tbLayout')}
                  disabled={p.disabled}
                />
              </span>
              <Big
                action="sort"
                label={t('tbSort')}
                tip={t('tbSortTip')}
                disabled={topicOff}
                onClick={p.onSort}
              >
                <IconSort />
              </Big>
            </Group>
            <Group>
              <Big
                action="theme"
                label={t('tbTheme')}
                active={p.themeOpen}
                disabled={p.disabled}
                onClick={p.onToggleTheme}
              >
                <IconTheme />
              </Big>
            </Group>
          </>,
        )}
        {pane('style', <StyleTab disabled={topicOff} {...p.style} />)}
        {pane(
          'view',
          <>
            <Group>
              <Big
                action="present"
                label={t('tbPresent')}
                kbd="F5"
                disabled={p.disabled}
                onClick={p.onPresent}
              >
                <IconPresent />
              </Big>
            </Group>
            <Group>
              <RibbonMenu
                action="fold-level"
                label={t('tbFoldLevels')}
                icon={<IconFoldLevel />}
                disabled={p.disabled}
                items={[1, 2, 3].map((n) => ({
                  key: `fold-level-${n}`,
                  label: t('tbFoldLevel', { n }),
                  onPick: () => p.onFoldLevel(n),
                }))}
              />
              <Big
                action="fold-all"
                label={t('tbFoldAll')}
                disabled={p.disabled}
                onClick={p.onFoldAll}
              >
                <IconFoldAll />
              </Big>
              <Big
                action="unfold-all"
                label={t('tbUnfoldAll')}
                disabled={p.disabled}
                onClick={p.onUnfoldAll}
              >
                <IconUnfoldAll />
              </Big>
            </Group>
            <Group>
              <RibbonMenu
                action="show-parts"
                label={t('tbShowParts')}
                icon={<IconShow />}
                disabled={p.disabled}
                items={PARTS.map(({ part, label }) => ({
                  key: `show-${part}`,
                  label: t(label),
                  checked: !p.hiddenParts.includes(part),
                  onPick: () => p.onToggleHiddenPart(part),
                }))}
              />
            </Group>
            <Group>
              <Big
                action="zoom-out"
                label={t('zoomOut')}
                disabled={p.disabled}
                onClick={p.onZoomOut}
              >
                <IconZoomOut />
              </Big>
              <Big action="zoom-in" label={t('zoomIn')} disabled={p.disabled} onClick={p.onZoomIn}>
                <IconZoomIn />
              </Big>
              <Big
                action="zoom-100"
                label="100%"
                tip={t('zoomReset')}
                disabled={p.disabled}
                onClick={p.onZoomReset}
              >
                <IconZoom100 />
              </Big>
              <Big
                action="zoom-fit"
                label={t('zoomFit')}
                disabled={p.disabled}
                onClick={p.onZoomFit}
              >
                <IconFit />
              </Big>
            </Group>
          </>,
        )}
        <span className="mm-tools-end">
          <ExportMenu disabled={p.disabled} onExport={p.onExport} />
          {/* "make another document from this one", after its own separator */}
          <span className="rb-sep" />
          <div className="ribbon-group">
            <div className="ribbon-group-items">
              <button
                type="button"
                className="rb-btn mm-tool mm-make-from"
                data-action="make-from-document"
                data-tip={p.mapSaved ? t('tbMakeFromDocument') : t('makeFromNeedsSave')}
                aria-label={t('tbMakeFromDocument')}
                aria-disabled={p.mapSaved ? undefined : true}
                disabled={p.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={p.onMakeFromDocument}
              >
                <IconMakeFrom />
                <span className="mm-make-from-label">{t('makeFromShort')}</span>
              </button>
              {p.onSendTo && (
                <SendMenu
                  disabled={p.disabled}
                  onPick={p.onSendTo}
                  onSync={p.onSync}
                  onCredits={p.onCredits}
                  onDesign={p.onDesign}
                />
              )}
            </div>
          </div>
          <button
            type="button"
            className={`mm-ai-entry ai-entry${p.aiOpen ? ' active' : ''}`}
            data-tip={t('aiOpenAssistant')}
            data-ai-helper=""
            data-action="ai"
            aria-pressed={p.aiOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={p.onToggleAi}
          >
            <AiMark size={18} />
            <span>{aiSubscriptionText(lang, 'aiAssistant')}</span>
          </button>
        </span>
      </div>
    </header>
  )
}

function Group({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="ribbon-group">
        <div className="ribbon-group-items">{children}</div>
      </div>
      <span className="rb-sep" />
    </>
  )
}

/** A big ribbon button: the picture over its name. */
function Big(p: {
  action: string
  label: string
  tip?: string
  kbd?: string
  active?: boolean
  disabled: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rb-big mm-big${p.active ? ' active' : ''}`}
      data-action={p.action}
      data-tip={p.tip ?? p.label}
      data-tip-kbd={p.kbd}
      aria-label={p.label}
      aria-pressed={p.active ? true : undefined}
      disabled={p.disabled}
      // the map keeps the keyboard: a button must not take the focus away from it
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
    >
      <span className="rb-big-icon">{p.children}</span>
      <span>{p.label}</span>
    </button>
  )
}
