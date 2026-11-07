/**
 * The Style tab of the ribbon: the own style of the selected topics. Shape,
 * fill and outline; the font, its size, weight, slant, lines and colour; the
 * colour and width of the lines to the branches; the format painter and
 * "clear format". Each pick is one edit through the controller, for every
 * selected topic; a value is offered only in the form the file takes
 * (`map/style-edit.ts`).
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useDismissablePopover } from '@genoffice/ui'
import type { ViewTopicStyle } from '@genoffice/xmind-engine'
import { useI18n } from '../i18n/locale'
import {
  BASIC_COLORS,
  FONT_FAMILIES,
  fontFamilyName,
  LINE_WIDTH_STEPS,
  type StylePatch,
} from '../map/style-edit'
import { safeDecoration, SHAPE_CLASS, type TopicShape } from '../map/style-values'
import {
  IconBold,
  IconClearStyle,
  IconFill,
  IconFontGrow,
  IconFontShrink,
  IconItalic,
  IconLineColor,
  IconOutline,
  IconPainter,
  IconShape,
  IconStrike,
  IconTextColor,
  IconUnderline,
} from './icons'

export type StyleToggle = 'bold' | 'italic' | 'underline' | 'line-through'

export interface StyleTabProps {
  /** no topic is selected, or the map is busy */
  disabled: boolean
  /** the own style of the topic selected last */
  style: ViewTopicStyle
  /** the sheet's theme colours, offered first in every colour menu */
  themeColors: readonly string[]
  painting: boolean
  onStyle(patch: StylePatch): void
  onToggle(which: StyleToggle): void
  onFontStep(up: boolean): void
  /** `sticky`: the painter stays on for every topic clicked, until it is stopped */
  onPainter(sticky: boolean): void
  onClear(): void
}

const SHAPES: readonly {
  shape: TopicShape
  label: 'shapeRounded' | 'shapePill' | 'shapeUnderline'
}[] = [
  { shape: 'rounded', label: 'shapeRounded' },
  { shape: 'pill', label: 'shapePill' },
  { shape: 'underline', label: 'shapeUnderline' },
]

const HEX = /^#?([0-9a-f]{6})$/i

export function StyleTab(p: StyleTabProps) {
  const { lang, t } = useI18n()
  const decoration = safeDecoration(p.style.textDecoration)
  const bold = p.style.fontWeight === 'bold' || Number(p.style.fontWeight) >= 600
  const colors = [...new Set([...p.themeColors.map((c) => c.toLowerCase()), ...BASIC_COLORS])]
  return (
    <>
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <Popover
            action="style-shape"
            label={t('tbShape')}
            icon={<IconShape />}
            disabled={p.disabled}
          >
            {(close) => (
              <>
                <MenuItem
                  id="shape-theme"
                  checked={p.style.shape === undefined}
                  onPick={() => {
                    close()
                    p.onStyle({ shape: null })
                  }}
                >
                  {t('styleAsTheme')}
                </MenuItem>
                {SHAPES.map(({ shape, label }) => (
                  <MenuItem
                    key={shape}
                    id={`shape-${shape}`}
                    checked={p.style.shape === SHAPE_CLASS[shape]}
                    onPick={() => {
                      close()
                      p.onStyle({ shape: SHAPE_CLASS[shape] })
                    }}
                  >
                    <span className="mm-shape-sample" data-shape={shape} aria-hidden="true" />
                    {t(label)}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>
          <ColorPopover
            action="style-fill"
            label={t('tbFill')}
            icon={<IconFill />}
            disabled={p.disabled}
            value={p.style.fill}
            colors={colors}
            withNone
            onPick={(fill) => p.onStyle({ fill })}
          />
          <ColorPopover
            action="style-outline"
            label={t('tbOutline')}
            icon={<IconOutline />}
            disabled={p.disabled}
            value={p.style.borderColor}
            colors={colors}
            width={p.style.borderWidth}
            onPick={(borderColor) => p.onStyle({ borderColor })}
            onWidth={(borderWidth) => p.onStyle({ borderWidth })}
          />
        </div>
      </div>
      <span className="rb-sep" />
      <div className="ribbon-group mm-style-text">
        <div className="ribbon-group-items">
          <select
            className="mm-font-pick"
            aria-label={t('tbFont')}
            data-tip={t('tbFont')}
            disabled={p.disabled}
            value={p.style.fontFamily ?? ''}
            onChange={(e) =>
              p.onStyle({ fontFamily: e.target.value === '' ? null : e.target.value })
            }
          >
            <option value="">{t('styleAsTheme')}</option>
            {/* a font the file names that is not in the list is still shown as picked */}
            {p.style.fontFamily &&
              !(FONT_FAMILIES as readonly string[]).includes(p.style.fontFamily) && (
                <option value={p.style.fontFamily}>{p.style.fontFamily}</option>
              )}
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {fontFamilyName(family, lang)}
              </option>
            ))}
          </select>
          <Small
            action="font-grow"
            label={t('tbFontGrow')}
            disabled={p.disabled}
            onClick={() => p.onFontStep(true)}
          >
            <IconFontGrow />
          </Small>
          <Small
            action="font-shrink"
            label={t('tbFontShrink')}
            disabled={p.disabled}
            onClick={() => p.onFontStep(false)}
          >
            <IconFontShrink />
          </Small>
        </div>
        <div className="ribbon-group-items">
          <Small
            action="bold"
            label={t('tbBold')}
            kbd="Ctrl+B"
            active={bold}
            disabled={p.disabled}
            onClick={() => p.onToggle('bold')}
          >
            <IconBold />
          </Small>
          <Small
            action="italic"
            label={t('tbItalic')}
            kbd="Ctrl+I"
            active={p.style.fontStyle === 'italic'}
            disabled={p.disabled}
            onClick={() => p.onToggle('italic')}
          >
            <IconItalic />
          </Small>
          <Small
            action="underline"
            label={t('tbUnderline')}
            kbd="Ctrl+U"
            active={decoration?.underline ?? false}
            disabled={p.disabled}
            onClick={() => p.onToggle('underline')}
          >
            <IconUnderline />
          </Small>
          <Small
            action="strike"
            label={t('tbStrike')}
            active={decoration?.lineThrough ?? false}
            disabled={p.disabled}
            onClick={() => p.onToggle('line-through')}
          >
            <IconStrike />
          </Small>
          <ColorPopover
            small
            action="style-text-color"
            label={t('tbTextColor')}
            icon={<IconTextColor />}
            disabled={p.disabled}
            value={p.style.color}
            colors={colors}
            onPick={(color) => p.onStyle({ color })}
          />
        </div>
      </div>
      <span className="rb-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <ColorPopover
            action="style-line"
            label={t('tbLineColor')}
            icon={<IconLineColor />}
            disabled={p.disabled}
            value={p.style.lineColor}
            colors={colors}
            width={p.style.lineWidth}
            onPick={(lineColor) => p.onStyle({ lineColor })}
            onWidth={(lineWidth) => p.onStyle({ lineWidth })}
          />
        </div>
      </div>
      <span className="rb-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            type="button"
            className={`rb-big mm-big${p.painting ? ' active' : ''}`}
            data-action="painter"
            data-tip={t('tbPainterTip')}
            aria-label={t('tbPainter')}
            aria-pressed={p.painting}
            disabled={p.disabled && !p.painting}
            onMouseDown={(e) => e.preventDefault()}
            // a second click right after the first keeps the painter on
            onClick={(e) => p.onPainter(e.detail >= 2)}
          >
            <span className="rb-big-icon">
              <IconPainter />
            </span>
            <span>{t('tbPainter')}</span>
          </button>
          <button
            type="button"
            className="rb-big mm-big"
            data-action="clear-style"
            data-tip={t('tbClearStyle')}
            aria-label={t('tbClearStyle')}
            disabled={p.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={p.onClear}
          >
            <span className="rb-big-icon">
              <IconClearStyle />
            </span>
            <span>{t('tbClearStyle')}</span>
          </button>
        </div>
      </div>
      <span className="rb-sep" />
    </>
  )
}

/** A small ribbon button: the picture alone, its name in the tip. */
function Small(p: {
  action: string
  label: string
  kbd?: string
  active?: boolean
  disabled: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rb-btn mm-tool${p.active ? ' active' : ''}`}
      data-action={p.action}
      data-tip={p.label}
      data-tip-kbd={p.kbd}
      aria-label={p.label}
      aria-pressed={p.active ?? false}
      disabled={p.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
    >
      {p.children}
    </button>
  )
}

/** A ribbon button that opens a popover (the app's shared `gs-dd-pop`), closed by Esc or a click outside. */
function Popover(p: {
  action: string
  label: string
  icon: ReactNode
  disabled: boolean
  small?: boolean
  children(close: () => void): ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrap.current] })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])
  return (
    <span ref={wrap} className="gs-dd mm-ribbon-menu">
      <button
        type="button"
        className={
          p.small
            ? `rb-btn mm-tool mm-tool-menu${open ? ' active' : ''}`
            : `rb-big mm-big${open ? ' active' : ''}`
        }
        data-action={p.action}
        data-tip={p.small ? p.label : undefined}
        aria-label={p.label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={p.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      >
        {p.small ? (
          p.icon
        ) : (
          <>
            <span className="rb-big-icon">{p.icon}</span>
            <span>{p.label} ▾</span>
          </>
        )}
      </button>
      {open && (
        <div className="gs-dd-pop mm-style-pop" role="menu" aria-label={p.label}>
          {p.children(() => setOpen(false))}
        </div>
      )}
    </span>
  )
}

function MenuItem(p: { id: string; checked: boolean; onPick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={p.checked}
      className="gs-dd-item mm-menu-item"
      data-menu-item={p.id}
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onPick}
    >
      <span className="mm-menu-check" aria-hidden="true">
        {p.checked ? '✓' : ''}
      </span>
      {p.children}
    </button>
  )
}

/**
 * A colour menu: "as the theme", "none" where a fill may be none, the
 * colours as swatches, a colour code typed in, and the widths where the
 * colour is a line's.
 */
function ColorPopover(p: {
  action: string
  label: string
  icon: ReactNode
  disabled: boolean
  small?: boolean
  value: string | undefined
  colors: readonly string[]
  withNone?: boolean
  width?: string | undefined
  onPick(value: string | null): void
  onWidth?(value: string | null): void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const typed = HEX.exec(code.trim())
  const current = p.value?.toLowerCase()
  return (
    <Popover action={p.action} label={p.label} icon={p.icon} disabled={p.disabled} small={p.small}>
      {(close) => {
        const pick = (value: string | null): void => {
          close()
          p.onPick(value)
        }
        return (
          <>
            <MenuItem id="color-theme" checked={p.value === undefined} onPick={() => pick(null)}>
              {t('styleAsTheme')}
            </MenuItem>
            {p.withNone && (
              <MenuItem id="color-none" checked={p.value === 'none'} onPick={() => pick('none')}>
                {t('fillNone')}
              </MenuItem>
            )}
            <div className="mm-swatches" role="group" aria-label={p.label}>
              {p.colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="mm-swatch"
                  data-color-pick={color}
                  aria-label={color}
                  aria-pressed={current === color}
                  // a swatch shows the document colour it puts on the topic
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(color)}
                />
              ))}
            </div>
            <form
              className="mm-color-code"
              onSubmit={(e) => {
                e.preventDefault()
                if (typed) pick(`#${typed[1]!.toLowerCase()}`)
              }}
            >
              <input
                type="text"
                aria-label={t('colorHex')}
                placeholder="#000000"
                maxLength={7}
                spellCheck={false}
                aria-invalid={code !== '' && !typed}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" className="gs-dd-item" disabled={!typed}>
                {t('colorApply')}
              </button>
            </form>
            {p.onWidth && (
              <div className="mm-widths" role="group" aria-label={t('styleWidth')}>
                <span className="mm-widths-label">{t('styleWidth')}</span>
                {LINE_WIDTH_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className="mm-width"
                    data-width-pick={step}
                    aria-pressed={p.width === `${step}pt`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      close()
                      p.onWidth!(`${step}pt`)
                    }}
                  >
                    <span style={{ height: `${Math.max(1, step * 0.75)}px` }} aria-hidden="true" />
                    {step} pt
                  </button>
                ))}
                <button
                  type="button"
                  className="mm-width"
                  data-width-pick="theme"
                  aria-pressed={p.width === undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    close()
                    p.onWidth!(null)
                  }}
                >
                  {t('styleAsTheme')}
                </button>
              </div>
            )}
          </>
        )
      }}
    </Popover>
  )
}
