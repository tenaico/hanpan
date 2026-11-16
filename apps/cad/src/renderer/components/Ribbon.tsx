/**
 * The top of the AI Drawing editor: a ribbon like the other editors'
 * (apps/mindmap Toolbar.tsx). The upper row holds the quick-access buttons
 * (save, undo, redo, auto save), the tabs, the drawing's title and its saved
 * state; the band below shows the tab that is picked, with big buttons.
 *
 * Tabs (apps/cad plan, Global Constraints): File (save, export), Home (place
 * shapes; make: hole, sketch, text; arrange: group, ungroup, align;
 * dimensions: measure, dimension sheet; send to a document: copy picture,
 * send to Hangul / Word), View (look from the top, front or side, show all;
 * the handle: move, rotate, size), Dimensions (the same dimension and send
 * buttons as Home) and Help (the shortcuts).
 *
 * The send button says where it sends: "Send to Hangul" while the Korean
 * document features are on, "Send to Word" when off (decision 0091). With no
 * part placed, the sheet and the send are off and their tip says why.
 *
 * Every pane is drawn and the ones not picked are hidden; the tab picked last
 * is remembered in `cadapp.ribbonTab`.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { ShapeKind } from '@genoffice/cad-engine'
import type { ExportFormat } from '../../shared/ipc'
import { SHAPE_LABEL } from '../editing/commands'
import { useI18n, type StringKey } from '../i18n/locale'
import type { HandleMode } from '../scene/handles'
import type { ViewCommand } from '../scene/viewport'
import { AlignMenu, type AlignAnchor, type AlignAxis } from './AlignMenu'
import {
  IconCopy,
  IconExport,
  IconFit,
  IconGroup,
  IconHole,
  IconKeyboard,
  IconMeasure,
  IconMove,
  IconPicture,
  IconRedo,
  IconRotate,
  IconSave,
  IconScale,
  IconSend,
  IconSheet,
  IconSketch,
  IconUndo,
  IconUngroup,
  IconViewFront,
  IconViewSide,
  IconViewTop,
  ShapeIcon,
} from './icons'
import { RibbonMenu } from './RibbonMenu'
import { ShapeGallery } from './ShapeGallery'
import { useSendTarget } from '../sheet/use-send-target'

export const RIBBON_TABS = ['file', 'home', 'view', 'dims', 'help'] as const
export type RibbonTab = (typeof RIBBON_TABS)[number]

const TAB_LABEL: Record<RibbonTab, StringKey> = {
  file: 'tabFile',
  home: 'tabHome',
  view: 'tabView',
  dims: 'tabDims',
  help: 'tabHelp',
}

export const RIBBON_TAB_KEY = 'cadapp.ribbonTab'

/** The four shapes on the ribbon itself; the gallery holds all fifteen. */
const COMMON_SHAPES: readonly ShapeKind[] = ['box', 'cylinder', 'sphere', 'cone']

const SHORTCUTS: readonly { keys: string; label: StringKey }[] = [
  { keys: 'Ctrl+Z', label: 'undo' },
  { keys: 'Ctrl+Y', label: 'redo' },
  { keys: 'Delete', label: 'shortcutDelete' },
  { keys: 'Ctrl+A', label: 'shortcutSelectAll' },
  { keys: 'Ctrl+D', label: 'shortcutDuplicate' },
  { keys: 'Ctrl+G', label: 'group' },
  { keys: 'Ctrl+Shift+G', label: 'ungroup' },
  { keys: 'H', label: 'shortcutHole' },
  { keys: '← → ↑ ↓', label: 'shortcutNudge' },
]

export function rememberedTab(): RibbonTab {
  try {
    const saved = localStorage.getItem(RIBBON_TAB_KEY)
    return (RIBBON_TABS as readonly string[]).includes(saved ?? '') ? (saved as RibbonTab) : 'home'
  } catch {
    return 'home'
  }
}

export interface RibbonProps {
  title: string
  /** "Saved" / "Unsaved", or nothing while the drawing loads */
  stateText: string
  dirty: boolean
  /** nothing can be edited (loading, or the guide for a file that did not open) */
  disabled: boolean
  canUndo: boolean
  canRedo: boolean
  autoSave: boolean
  /** how many top-level parts are selected */
  selected: number
  /** a selected part is a group */
  canUngroup: boolean
  handleMode: HandleMode
  /** an outline is being sketched */
  sketching: boolean
  /** the measuring tool is on */
  measuring: boolean
  /** why there is no dimension sheet to show or send (nothing placed); null when there is */
  sheetBlocked: StringKey | null
  onToggleAutoSave(on: boolean): void
  onSave(): void
  onSaveAs(): void
  onUndo(): void
  onRedo(): void
  onExport(format: ExportFormat): void
  onPlaceShape(kind: ShapeKind): void
  onToggleHole(): void
  onSketch(): void
  /** the words of a new text shape */
  onText(value: string): void
  onGroup(): void
  onUngroup(): void
  onAlign(axis: AlignAxis, anchor: AlignAnchor): void
  onView(command: ViewCommand): void
  onHandleMode(mode: HandleMode): void
  onMeasure(): void
  onSheet(): void
  /** the 3D view as a picture on the clipboard */
  onCopyPicture(): void
  onSend(): void
}

export function Ribbon(p: RibbonProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<RibbonTab>(rememberedTab)
  const [textOpen, setTextOpen] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(RIBBON_TAB_KEY, tab)
    } catch {
      // the tab is a convenience; without storage the next tab starts on Home
    }
  }, [tab])
  const off = p.disabled || p.sketching
  const send = useSendTarget()
  const blockedTip = p.sheetBlocked ? t(p.sheetBlocked) : undefined
  // the same two groups on Home and on the Dimensions tab
  const dimensionGroups = (
    <>
      <Group label={t('groupDims')}>
        <Big
          action="measure"
          label={t('measure')}
          active={p.measuring}
          disabled={p.disabled}
          onClick={p.onMeasure}
        >
          <IconMeasure />
        </Big>
        <Big
          action="sheet"
          label={t('sheet')}
          tip={blockedTip}
          disabled={off || !!p.sheetBlocked}
          onClick={p.onSheet}
        >
          <IconSheet />
        </Big>
      </Group>
      <Group label={t('groupSend')} last>
        <Big
          action="copy-picture"
          label={t('copyPicture')}
          disabled={off}
          onClick={p.onCopyPicture}
        >
          <IconCopy />
        </Big>
        <Big
          action="send"
          label={t(send.label)}
          tip={blockedTip}
          disabled={off || !!p.sheetBlocked}
          onClick={p.onSend}
        >
          <IconSend />
        </Big>
      </Group>
    </>
  )
  const pane = (name: RibbonTab, children: ReactNode) => (
    <div className="cad-pane" data-ribbon-pane={name} hidden={tab !== name}>
      {children}
    </div>
  )
  return (
    <header className="ribbon cad-ribbon">
      <div className="ribbon-tabs">
        <QuickButton
          action="save"
          label={t('save')}
          kbd="Ctrl+S"
          disabled={p.disabled}
          onClick={p.onSave}
        >
          <IconSave />
        </QuickButton>
        <QuickButton
          action="undo"
          label={t('undo')}
          kbd="Ctrl+Z"
          disabled={off || !p.canUndo}
          onClick={p.onUndo}
        >
          <IconUndo />
        </QuickButton>
        <QuickButton
          action="redo"
          label={t('redo')}
          kbd="Ctrl+Y"
          disabled={off || !p.canRedo}
          onClick={p.onRedo}
        >
          <IconRedo />
        </QuickButton>
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
        <div className="cad-tab-row" role="tablist">
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
        <span className="cad-title">{p.title}</span>
        <span className="cad-state" data-dirty={p.dirty ? '' : undefined} aria-live="polite">
          {p.stateText}
        </span>
      </div>

      <div className="ribbon-body" role="toolbar">
        {pane(
          'file',
          <>
            <Group label={t('groupSave')}>
              <Big
                action="file-save"
                label={t('save')}
                kbd="Ctrl+S"
                disabled={p.disabled}
                onClick={p.onSave}
              >
                <IconSave />
              </Big>
              <Big
                action="save-as"
                label={t('saveAs')}
                kbd="Ctrl+Shift+S"
                disabled={p.disabled}
                onClick={p.onSaveAs}
              >
                <IconSave />
              </Big>
            </Group>
            <Group label={t('groupExport')} last>
              <Big
                action="export-stl"
                label={t('exportStl')}
                disabled={off}
                onClick={() => p.onExport('stl')}
              >
                <IconExport />
              </Big>
              <Big
                action="export-obj"
                label={t('exportObj')}
                disabled={off}
                onClick={() => p.onExport('obj')}
              >
                <IconExport />
              </Big>
              <Big
                action="export-png"
                label={t('exportPng')}
                disabled={off}
                onClick={() => p.onExport('png')}
              >
                <IconPicture />
              </Big>
            </Group>
          </>,
        )}
        {pane(
          'home',
          <>
            <Group label={t('groupPlace')}>
              {COMMON_SHAPES.map((kind) => (
                <Big
                  key={kind}
                  action={`shape-${kind}`}
                  label={t(SHAPE_LABEL[kind])}
                  disabled={off}
                  onClick={() => p.onPlaceShape(kind)}
                >
                  <ShapeIcon kind={kind} />
                </Big>
              ))}
              <ShapeGallery
                disabled={off}
                onPlace={p.onPlaceShape}
                onText={() => setTextOpen(true)}
              />
            </Group>
            <Group label={t('groupMake')}>
              <Big
                action="hole"
                label={t('hole')}
                kbd="H"
                disabled={off || p.selected === 0}
                onClick={p.onToggleHole}
              >
                <IconHole />
              </Big>
              <Big
                action="sketch"
                label={t('sketch')}
                active={p.sketching}
                disabled={p.disabled}
                onClick={p.onSketch}
              >
                <IconSketch />
              </Big>
              <RibbonMenu
                action="text"
                label={t('shapeText')}
                icon={<ShapeIcon kind="text" />}
                disabled={off}
                open={textOpen}
                onOpenChange={setTextOpen}
                popClass="cad-text-pop"
              >
                {(close) => (
                  <TextPrompt
                    onPlace={(value) => {
                      close()
                      p.onText(value)
                    }}
                  />
                )}
              </RibbonMenu>
            </Group>
            <Group label={t('groupArrange')}>
              <Big
                action="group"
                label={t('group')}
                kbd="Ctrl+G"
                disabled={off || p.selected < 2}
                onClick={p.onGroup}
              >
                <IconGroup />
              </Big>
              <Big
                action="ungroup"
                label={t('ungroup')}
                kbd="Ctrl+Shift+G"
                disabled={off || !p.canUngroup}
                onClick={p.onUngroup}
              >
                <IconUngroup />
              </Big>
              <AlignMenu disabled={off || p.selected < 2} onAlign={p.onAlign} />
            </Group>
            {dimensionGroups}
          </>,
        )}
        {pane(
          'view',
          <>
            <Group label={t('groupViews')}>
              <Big
                action="view-top"
                label={t('viewTop')}
                disabled={p.disabled}
                onClick={() => p.onView('top')}
              >
                <IconViewTop />
              </Big>
              <Big
                action="view-front"
                label={t('viewFront')}
                disabled={p.disabled}
                onClick={() => p.onView('front')}
              >
                <IconViewFront />
              </Big>
              <Big
                action="view-side"
                label={t('viewSide')}
                disabled={p.disabled}
                onClick={() => p.onView('side')}
              >
                <IconViewSide />
              </Big>
              <Big
                action="view-fit"
                label={t('viewFit')}
                disabled={p.disabled}
                onClick={() => p.onView('fit')}
              >
                <IconFit />
              </Big>
            </Group>
            <Group label={t('groupHandles')} last>
              <Big
                action="handle-move"
                label={t('handleMove')}
                active={p.handleMode === 'move'}
                disabled={off}
                onClick={() => p.onHandleMode('move')}
              >
                <IconMove />
              </Big>
              <Big
                action="handle-rotate"
                label={t('handleRotate')}
                active={p.handleMode === 'rotate'}
                disabled={off}
                onClick={() => p.onHandleMode('rotate')}
              >
                <IconRotate />
              </Big>
              <Big
                action="handle-scale"
                label={t('handleScale')}
                active={p.handleMode === 'scale'}
                disabled={off}
                onClick={() => p.onHandleMode('scale')}
              >
                <IconScale />
              </Big>
            </Group>
          </>,
        )}
        {pane('dims', dimensionGroups)}
        {pane(
          'help',
          <Group label={t('tabHelp')} last>
            <RibbonMenu
              action="shortcuts"
              label={t('shortcuts')}
              icon={<IconKeyboard />}
              disabled={false}
              popClass="cad-shortcuts"
            >
              {() => (
                <dl className="cad-shortcut-list">
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys} className="cad-shortcut">
                      <dt>
                        <kbd>{s.keys}</kbd>
                      </dt>
                      <dd>{t(s.label)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </RibbonMenu>
          </Group>,
        )}
      </div>
    </header>
  )
}

/** The text prompt: the words of a new text shape. */
function TextPrompt({ onPlace }: { onPlace(value: string): void }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const words = value.trim()
  return (
    <form
      className="cad-text-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (words) onPlace(words)
      }}
    >
      <label className="cad-text-label">
        <span>{t('textPrompt')}</span>
        <input
          className="cad-input"
          data-text-input=""
          autoFocus
          value={value}
          maxLength={200}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button type="submit" className="cad-button" data-text-place="" disabled={!words}>
        {t('textPlace')}
      </button>
    </form>
  )
}

function Group({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <>
      <div className="ribbon-group" role="group" aria-label={label}>
        <div className="ribbon-group-items">{children}</div>
        <div className="ribbon-group-label">{label}</div>
      </div>
      {!last && <span className="rb-sep" />}
    </>
  )
}

/** A big ribbon button: the picture over its name. */
function Big(p: {
  action: string
  label: string
  /** the tip, when it is not the label (why the button is off) */
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
      className={`rb-big${p.active ? ' active' : ''}`}
      data-action={p.action}
      data-tip={p.tip ?? p.label}
      data-tip-kbd={p.kbd}
      aria-label={p.label}
      aria-pressed={p.active === undefined ? undefined : p.active}
      disabled={p.disabled}
      // the 3D view keeps the keyboard: a button does not take the focus away from it
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
    >
      <span className="rb-big-icon">{p.children}</span>
      <span>{p.label}</span>
    </button>
  )
}

function QuickButton(p: {
  action: string
  label: string
  kbd: string
  disabled: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="qa-btn"
      data-action={p.action}
      data-tip={p.label}
      data-tip-kbd={p.kbd}
      aria-label={p.label}
      disabled={p.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
    >
      {p.children}
    </button>
  )
}
