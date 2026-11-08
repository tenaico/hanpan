/** Insert tab of the slides ribbon. Extracted from Ribbon.tsx. */
import type { InsertKind } from '../../shared/ipc'
import { platformShortcuts } from '@genoffice/i18n'
import { useState, type ReactNode } from 'react'
import { GonguPicker, WORDART_PRESETS, gonguPickerText, wordArtStrokePx } from '@genoffice/ui'
import { useI18n } from '../i18n/locale'
import {
  CHART_GALLERY,
  ICON_COLORS,
  ICON_GALLERY,
  SHAPE_GALLERY,
  SMARTART_GALLERY,
} from '../insert-presets'
import type { StringKey } from '../i18n/locale'
import { SOUND_EFFECTS, type SoundEffectId } from '../../shared/sound-effects'
import { ChartKindThumb } from './ChartTypeDialog'
import { TableInsertDialog } from './InsertDialogs'
import { ShapePreview, SmartArtPreview } from './gallery-previews'
import {
  Icon3d,
  IconAudio,
  IconChart,
  IconComment,
  IconDateTime,
  IconEquation,
  IconFooter,
  IconIconLib,
  IconLink,
  IconNewSlide,
  IconPageNumber,
  IconPicture,
  IconScreenRec,
  IconShapes,
  IconSmartArt,
  IconTable,
  IconTextBox,
  IconVideo,
  IconWordArt,
  IconZoomJump,
} from './icons'
import { saveEditSelection } from '../TextEditOverlay'
import {
  BIG,
  Group,
  LayoutList,
  RbCaret,
  closeSiblingPanels,
  type RibbonTabCtx,
} from './ribbon-shared'

/** The New Slide screentip shows the platform's real chord: ⇧⌘N on mac, Ctrl+M elsewhere. */
const IS_MAC = navigator.platform.toLowerCase().includes('mac')

const ZOOM_LABEL = {
  summary: 'ribbonZoomSummary',
  section: 'ribbonZoomSection',
  slide: 'ribbonZoomSlide',
} as const

/** Hanpan: the menu label of each bundled sound effect, by what it sounds like */
const SOUND_EFFECT_LABEL: Record<SoundEffectId, StringKey> = {
  celebrate: 'ribbonSoundCelebrate',
  fresh: 'ribbonSoundFresh',
  curious: 'ribbonSoundCurious',
  rising: 'ribbonSoundRising',
  refreshed: 'ribbonSoundRefreshed',
  finish: 'ribbonSoundFinish',
}

export function RibbonInsertTab({ rb }: { rb: RibbonTabCtx }) {
  const {
    closePanels,
    collapsedGroups,
    collapseOpen,
    setCollapseOpen,
    editing,
    hasDoc,
    hasSelection,
    layouts,
    layoutSize,
    onAddSlide,
    onAddSlideWithLayout,
    onPickShape,
    onInsertChart,
    onInsertField,
    onInsertIcon,
    onInsertImage,
    onInsertMedia,
    onInsertSoundEffect,
    onInsertGonguPicture,
    onInsertModel3d,
    onInsertSmartArt,
    onInsertTable,
    onInsertWordArt,
    onOpenZoom,
    hasSections,
    onNewComment,
    onOpenEquation,
    onOpenHeaderFooter,
    onOpenLink,
    onToggleScreenRecord,
    recording,
    dropBig,
    iconColor,
    layoutOpen,
    setIconColor,
    setInsertDrop,
    setLayoutOpen,
    setTableDialogOpen,
    setTableHover,
    setTableOpen,
    t,
    tableDialogOpen,
    tableHover,
    tableOpen,
  } = rb
  /** Hanpan: the Gongu picture picker */
  const [gonguOpen, setGonguOpen] = useState(false)
  const { lang } = useI18n()
  /** Office-style shrink: when the band is too narrow the Ribbon folds these groups
   *  (COLLAPSE_ORDER.insert) into one "group ▾" button each, so no button sits off-screen */
  const fold = (id: string, icon: ReactNode) => ({
    collapsed: collapsedGroups.includes(id),
    open: collapseOpen === id,
    onToggle: () => {
      closePanels(['collapse'])
      setCollapseOpen((v) => (v === id ? null : id))
    },
    icon,
  })
  return (
    <>
      <Group label={t('ribbonGroupSlides')}>
        <div className="rb-drop-wrap">
          <button
            className="rb-big rb-split"
            disabled={!hasDoc}
            onClick={onAddSlide}
            data-tip={layoutOpen ? undefined : platformShortcuts(t('ribbonNewSlideTip'))}
            data-tip-kbd={IS_MAC ? '⇧⌘N' : 'Ctrl+M'}
          >
            <span className="rb-big-icon">
              <span className="rb-split-main">
                <IconNewSlide size={BIG} />
              </span>
              <span
                className={`rb-caret-hit${layoutOpen ? ' active' : ''}`}
                data-tip={layoutOpen ? undefined : t('ribbonChooseLayoutNew')}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  closeSiblingPanels(e, closePanels, 'layout')
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasDoc) setLayoutOpen((v) => !v)
                }}
              >
                <RbCaret />
              </span>
            </span>
            <span>{t('ribbonNewSlide')}</span>
          </button>
          {layoutOpen && (
            <div className="rb-drop rb-layout-panel" onMouseDown={(e) => e.stopPropagation()}>
              <div className="rb-drop-title">{t('ribbonChooseLayoutNew')}</div>
              <LayoutList
                layouts={layouts}
                size={layoutSize}
                onPick={(path) => {
                  setLayoutOpen(false)
                  onAddSlideWithLayout(path)
                }}
              />
            </div>
          )}
        </div>
      </Group>
      <div className="ribbon-sep" />
      <Group label={t('ribbonGroupTable')}>
        <div className="rb-drop-wrap">
          <button
            className={`rb-big ${tableOpen ? 'active' : ''}`}
            disabled={!hasDoc}
            data-tip={t('ribbonInsertTableTip')}
            onMouseDown={(e) => {
              e.stopPropagation()
              closeSiblingPanels(e, closePanels, 'table')
            }}
            onClick={() => setTableOpen((v) => !v)}
          >
            <span className="rb-big-icon">
              <IconTable size={BIG} />
              <RbCaret />
            </span>
            <span>{t('ribbonGroupTable')}</span>
          </button>
          {tableOpen && (
            <div className="rb-drop rb-table-picker" onMouseDown={(e) => e.stopPropagation()}>
              <div className="rb-table-picker-label">
                {tableHover.r > 0
                  ? t('ribbonTableSize', { r: tableHover.r, c: tableHover.c })
                  : t('ribbonTablePickerHint')}
              </div>
              <div className="rb-table-grid" onMouseLeave={() => setTableHover({ r: 0, c: 0 })}>
                {Array.from({ length: 8 }, (_, r) =>
                  Array.from({ length: 10 }, (_, c) => (
                    <button
                      key={`${r}-${c}`}
                      className={`rb-table-cell ${r < tableHover.r && c < tableHover.c ? 'on' : ''}`}
                      onMouseEnter={() => setTableHover({ r: r + 1, c: c + 1 })}
                      onClick={() => {
                        setTableOpen(false)
                        onInsertTable(r + 1, c + 1)
                      }}
                    />
                  )),
                )}
              </div>
              <button
                className="rb-table-custom"
                onClick={() => {
                  setTableOpen(false)
                  setTableDialogOpen(true)
                }}
              >
                {t('ribbonTableInsertDialog')}
              </button>
            </div>
          )}
          {tableDialogOpen && (
            <TableInsertDialog
              onInsert={(rows, cols) => {
                setTableDialogOpen(false)
                onInsertTable(rows, cols)
              }}
              onClose={() => setTableDialogOpen(false)}
            />
          )}
        </div>
      </Group>
      <div className="ribbon-sep" />
      <Group
        label={t('ribbonGroupImages')}
        groupId="images"
        collapse={fold('images', <IconPicture size={BIG} />)}
      >
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={onInsertImage}
          data-tip={t('ribbonPictureTip')}
        >
          <span className="rb-big-icon">
            <IconPicture size={BIG} />
          </span>
          <span>{t('ribbonPicture')}</span>
        </button>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => setGonguOpen(true)}
          data-tip={gonguPickerText(lang, 'find')}
          data-action="insert-gongu"
        >
          <span className="rb-big-icon">
            <IconPicture size={BIG} />
          </span>
          <span>{gonguPickerText(lang, 'title')}</span>
        </button>
        {gonguOpen && (
          <GonguPicker
            lang={lang}
            api={window.slidesApi}
            onInsert={onInsertGonguPicture}
            onClose={() => setGonguOpen(false)}
            onOpenSettings={() => void window.slidesApi.openIntegrationSettings().catch(() => {})}
          />
        )}
        {dropBig(
          'icons',
          <IconIconLib size={BIG} />,
          t('ribbonIcons'),
          t('ribbonIconsTip'),
          <div className="rb-icon-gallery">
            <div className="rb-icon-colors">
              {ICON_COLORS.map((c) => (
                <button
                  key={c}
                  className={`rb-swatch ${iconColor === c ? 'on' : ''}`}
                  style={{ background: c }}
                  data-tip={c}
                  aria-label={c}
                  onClick={() => setIconColor(c)}
                />
              ))}
            </div>
            <div className="rb-icon-grid">
              {ICON_GALLERY.map((def) => (
                <button
                  key={def.name}
                  className="rb-icon-cell"
                  data-tip={def.name}
                  aria-label={def.name}
                  onClick={() => {
                    setInsertDrop(null)
                    onInsertIcon(def, iconColor)
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={22}
                    height={22}
                    fill="none"
                    stroke={iconColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: def.body }}
                  />
                </button>
              ))}
            </div>
          </div>,
        )}
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={onInsertModel3d}
          data-tip={t('ribbon3dModelTip')}
        >
          <span className="rb-big-icon">
            <Icon3d size={BIG} />
          </span>
          <span>{t('ribbon3dModel')}</span>
        </button>
      </Group>
      <div className="ribbon-sep" />
      <Group
        label={t('ribbonGroupIllustrations')}
        groupId="illustrations"
        collapse={fold('illustrations', <IconShapes size={BIG} />)}
      >
        {dropBig(
          'shapes',
          <IconShapes size={BIG} />,
          t('ribbonShapes'),
          t('ribbonShapesTip'),
          <div className="rb-shape-gallery">
            {SHAPE_GALLERY.map((group) => (
              <div key={group.group}>
                <div className="rb-drop-title">{group.group}</div>
                <div className="rb-shape-grid">
                  {group.shapes.map((s) => (
                    <button
                      key={s.prst}
                      className="rb-shape-cell"
                      data-tip={s.label}
                      aria-label={s.label}
                      onClick={() => {
                        setInsertDrop(null)
                        onPickShape(s.prst as InsertKind)
                      }}
                    >
                      <ShapePreview prst={s.prst} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>,
        )}
        {dropBig(
          'smartart',
          <IconSmartArt size={BIG} />,
          'SmartArt',
          t('ribbonSmartArtTip'),
          <div className="rb-menu rb-menu-wide">
            {SMARTART_GALLERY.map((def) => (
              <button
                key={def.layout}
                onClick={() => {
                  setInsertDrop(null)
                  onInsertSmartArt(def)
                }}
              >
                <span className="rb-menu-glyph rb-menu-thumb">
                  <SmartArtPreview layout={def.layout} width={40} />
                </span>
                {def.label}
              </button>
            ))}
          </div>,
        )}
        {dropBig(
          'chart',
          <IconChart size={BIG} />,
          t('ribbonChart'),
          t('ribbonChartTip'),
          <div className="rb-menu rb-menu-wide">
            {CHART_GALLERY.map((def) => (
              <button
                key={def.kind}
                onClick={() => {
                  setInsertDrop(null)
                  onInsertChart(def.kind)
                }}
              >
                <span className="rb-menu-glyph rb-menu-thumb">
                  <ChartKindThumb kind={def.kind} width={40} />
                </span>
                {def.label}
              </button>
            ))}
          </div>,
        )}
      </Group>
      <div className="ribbon-sep" />
      <Group
        label={t('ribbonGroupLinks')}
        groupId="links"
        collapse={fold('links', <IconLink size={BIG} />)}
      >
        <button
          className="rb-big"
          data-keep-edit=""
          disabled={!hasDoc || (!hasSelection && !editing)}
          onMouseDown={(e) => {
            // While editing, keep the editor selection alive so the link applies to it (run-level)
            if (editing) {
              e.preventDefault()
              saveEditSelection()
            }
          }}
          onClick={onOpenLink}
          title={hasSelection || editing ? t('ribbonLinkTip') : t('ribbonLinkTipDisabled')}
        >
          <span className="rb-big-icon">
            <IconLink size={BIG} />
          </span>
          <span>{t('ribbonLink')}</span>
        </button>
        {dropBig(
          'zoom',
          <IconZoomJump size={BIG} />,
          t('ribbonZoomJump'),
          t('ribbonZoomJumpTip'),
          <div className="rb-menu">
            {(['summary', 'section', 'slide'] as const).map((mode) => (
              <button
                key={mode}
                disabled={mode === 'section' && !hasSections}
                onClick={() => {
                  setInsertDrop(null)
                  onOpenZoom(mode)
                }}
              >
                {t(ZOOM_LABEL[mode])}
              </button>
            ))}
          </div>,
        )}
      </Group>
      <div className="ribbon-sep" />
      <Group label={t('ribbonGroupComments')}>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={onNewComment}
          data-tip={t('ribbonNewCommentTip')}
        >
          <span className="rb-big-icon">
            <IconComment size={BIG} />
          </span>
          <span>{t('ribbonComment')}</span>
        </button>
      </Group>
      <div className="ribbon-sep" />
      <Group
        label={t('ribbonShapeGroupText')}
        groupId="text"
        collapse={fold('text', <IconTextBox size={BIG} />)}
      >
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => onPickShape('textbox')}
          data-tip={t('ribbonInsertTextBoxTip')}
        >
          <span className="rb-big-icon">
            <IconTextBox size={BIG} />
          </span>
          <span>{t('ribbonTextBox')}</span>
        </button>
        {dropBig(
          'wordart',
          <IconWordArt size={BIG} />,
          t('ribbonWordArt'),
          t('ribbonWordArtTip'),
          <div className="rb-wordart-grid">
            {WORDART_PRESETS.map((p) => (
              <button
                key={p.id}
                className="rb-wordart-cell"
                data-tip={t(p.nameKey as StringKey)}
                style={{
                  color: p.fill,
                  WebkitTextStroke: p.outline
                    ? `${wordArtStrokePx(p.outline.widthEmu)}px ${p.outline.color}`
                    : undefined,
                  fontWeight: p.bold ? 800 : 400,
                  fontStyle: p.italic ? 'italic' : undefined,
                }}
                onClick={() => {
                  setInsertDrop(null)
                  onInsertWordArt(p)
                }}
              >
                {t('ribbonWordArtPreviewChar')}
              </button>
            ))}
          </div>,
        )}
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={onOpenHeaderFooter}
          data-tip={t('ribbonHeaderFooterTip')}
        >
          <span className="rb-big-icon">
            <IconFooter size={BIG} />
          </span>
          <span>{t('ribbonHeaderFooter')}</span>
        </button>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => onInsertField('datetime')}
          data-tip={t('ribbonDateTimeTip')}
        >
          <span className="rb-big-icon">
            <IconDateTime size={BIG} />
          </span>
          <span>{t('ribbonDateTime')}</span>
        </button>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => onInsertField('slidenum')}
          data-tip={t('ribbonSlideNumberTip')}
        >
          <span className="rb-big-icon">
            <IconPageNumber size={BIG} />
          </span>
          <span>{t('ribbonSlideNumber')}</span>
        </button>
      </Group>
      <div className="ribbon-sep" />
      <Group label={t('ribbonGroupSymbols')}>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={onOpenEquation}
          data-tip={t('ribbonEquationTip')}
        >
          <span className="rb-big-icon">
            <IconEquation size={BIG} />
          </span>
          <span>{t('ribbonEquation')}</span>
        </button>
      </Group>
      <div className="ribbon-sep" />
      <Group
        label={t('ribbonGroupMedia')}
        groupId="media"
        collapse={fold('media', <IconVideo size={BIG} />)}
      >
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => onInsertMedia('video')}
          data-tip={t('ribbonVideoTip')}
        >
          <span className="rb-big-icon">
            <IconVideo size={BIG} />
          </span>
          <span>{t('ribbonVideo')}</span>
        </button>
        <button
          className="rb-big"
          disabled={!hasDoc}
          onClick={() => onInsertMedia('audio')}
          data-tip={t('ribbonAudioTip')}
        >
          <span className="rb-big-icon">
            <IconAudio size={BIG} />
          </span>
          <span>{t('ribbonAudio')}</span>
        </button>
        {dropBig(
          'sounds',
          <IconAudio size={BIG} />,
          t('ribbonSoundEffects'),
          t('ribbonSoundEffectsTip'),
          <div className="rb-sound-list">
            {SOUND_EFFECTS.map((s) => (
              <button
                key={s.id}
                className="rb-sound-item"
                data-sound={s.id}
                onClick={() => {
                  setInsertDrop(null)
                  onInsertSoundEffect(s.id)
                }}
              >
                {t(SOUND_EFFECT_LABEL[s.id])}
              </button>
            ))}
            <div className="rb-sound-credit">{t('ribbonSoundEffectsCredit')}</div>
          </div>,
        )}
        <button
          className={`rb-big ${recording ? 'active rb-recording' : ''}`}
          disabled={!hasDoc}
          onClick={onToggleScreenRecord}
          data-tip={recording ? t('ribbonStopRecTip') : t('ribbonScreenRecTip')}
        >
          <span className="rb-big-icon">
            <IconScreenRec size={BIG} />
          </span>
          <span>{recording ? t('ribbonStopRec') : t('ribbonScreenRec')}</span>
        </button>
      </Group>
    </>
  )
}
