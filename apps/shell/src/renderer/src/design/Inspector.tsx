/**
 * Hanpan design board: the side panel that styles what is selected. One
 * element: its own settings (text, fill, picture, QR) and the common ones
 * (position, rotation, order, opacity, shadow, lock). Several: aligning,
 * spreading and grouping. Nothing: the page background. Every change goes through the
 * board, so it can be undone.
 */
import type { ReactNode } from 'react'
import {
  IMAGE_FILTERS,
  PALETTE,
  SHAPES,
  type DesignElement,
  type DesignPage,
  type ShadowKind,
} from './model'
import { REWRITE_MODES, translateTarget, type RewriteMode } from './ai'
import { BUNDLED_FONTS, GONGU_FONTS, SYSTEM_FONTS, type FontChoice } from './fonts'
import type { AlignMode } from './geometry'
import { LANG_NATIVE_NAMES, fontLabel, type Words } from './words'

export type Arrange = 'toFront' | 'front' | 'back' | 'toBack'

/** the font list's last choice: opens a font file */
const ADD_FONT = '\u0000add-font'

export interface InspectorProps {
  w: Words
  /** the UI language: font names and the default translation target follow it */
  lang: string
  page: DesignPage
  selection: DesignElement[]
  docColors: string[]
  /** `merge` joins quick repeats (a slider being dragged) into one undo step */
  change(id: string, patch: Partial<DesignElement>, merge?: string): void
  changePage(change: (pg: DesignPage) => void, merge?: string): void
  align(mode: AlignMode): void
  spread(axis: 'x' | 'y'): void
  arrange(where: Arrange): void
  duplicate(): void
  remove(): void
  toggleLock(): void
  fillPage(id: string): void
  replaceImage(id: string): void
  /** fonts the person added to this design (font files kept in it) */
  fonts: string[]
  addFont(): void
  /** the fonts installed on this PC, empty until read (then the fixed list shows) */
  pcFonts: readonly FontChoice[]
  /** reads them; called from the font list's click, which the reading needs */
  loadPcFonts(): void
  group(): void
  ungroup(): void
  /** a picture in crop mode: dragging it picks what shows */
  startCrop(id: string): void
  /** why the picked picture keeps its look (a no-derivatives licence); null otherwise */
  lockNote: string | null
  ai: null | {
    busy: boolean
    error: string | null
    rewrite(id: string, mode: RewriteMode): void
    stop(): void
    /** the language a translation goes to; null for the default */
    translateTo: string | null
    setTranslateTo(lang: string | null): void
  }
}

const ALIGNS: { mode: AlignMode; icon: string }[] = [
  { mode: 'left', icon: '⇤' },
  { mode: 'center', icon: '↔' },
  { mode: 'right', icon: '⇥' },
  { mode: 'top', icon: '⤒' },
  { mode: 'middle', icon: '↕' },
  { mode: 'bottom', icon: '⤓' },
]

/** Colour choice: this design's colours, the default palette, any colour. */
export function ColorRow(p: {
  w: Words
  value: string | undefined
  docColors: string[]
  onPick(c: string | undefined): void
  allowNone?: boolean
  testId?: string
}) {
  const swatch = (c: string) => (
    <button
      key={c}
      type="button"
      className={`dz-swatch${p.value?.toUpperCase() === c.toUpperCase() ? ' on' : ''}`}
      style={{ background: c }}
      title={p.w.colorNames[c.toUpperCase()] ?? c}
      aria-label={p.w.colorNames[c.toUpperCase()] ?? c}
      onClick={() => p.onPick(c)}
    />
  )
  const extra = p.docColors.filter((c) => !PALETTE.some((x) => x.toUpperCase() === c.toUpperCase()))
  return (
    <div className="dz-colors" data-colors={p.testId}>
      {extra.length > 0 && (
        <div className="dz-swatches" title={p.w.docColors}>
          {extra.map(swatch)}
        </div>
      )}
      <div className="dz-swatches">
        {p.allowNone && (
          <button
            type="button"
            className={`dz-swatch dz-swatch-none${!p.value ? ' on' : ''}`}
            title={p.w.none}
            aria-label={p.w.none}
            onClick={() => p.onPick(undefined)}
          />
        )}
        {PALETTE.map(swatch)}
        <input
          type="color"
          value={p.value && /^#[0-9a-f]{6}$/i.test(p.value) ? p.value : '#000000'}
          onChange={(e) => p.onPick(e.target.value.toUpperCase())}
          aria-label={p.w.color}
        />
      </div>
    </div>
  )
}

function Section(p: { title: string; children: ReactNode }) {
  return (
    <section className="dz-section">
      <h3>{p.title}</h3>
      {p.children}
    </section>
  )
}

function Slider(p: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange(v: number): void
  suffix?: string
}) {
  return (
    <label className="dz-row dz-slider">
      <span>{p.label}</span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.step ?? 1}
        value={p.value}
        onChange={(e) => p.onChange(Number(e.target.value))}
      />
      <output>
        {Math.round(p.value * 100) / 100}
        {p.suffix ?? ''}
      </output>
    </label>
  )
}

function Choice<T extends string>(p: {
  value: T | undefined
  options: { id: T | undefined; label: string }[]
  onPick(v: T | undefined): void
  name: string
}) {
  return (
    <div className="dz-choice" role="group" data-choice={p.name}>
      {p.options.map((o) => (
        <button
          key={o.id ?? 'none'}
          type="button"
          className={p.value === o.id ? 'on' : ''}
          onClick={() => p.onPick(o.id)}
          data-value={o.id ?? 'none'}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Fill with an optional second colour and direction. */
function FillRow(p: {
  w: Words
  fill: string | undefined
  fill2: string | undefined
  angle: number | undefined
  docColors: string[]
  allowNone?: boolean
  set(
    patch: { fill?: string | undefined; fill2?: string | undefined; gradientAngle?: number },
    merge?: string,
  ): void
}) {
  return (
    <>
      <ColorRow
        w={p.w}
        value={p.fill}
        docColors={p.docColors}
        allowNone={p.allowNone}
        onPick={(c) => p.set({ fill: c })}
        testId="fill"
      />
      <label className="dz-row">
        <input
          type="checkbox"
          checked={Boolean(p.fill2)}
          onChange={(e) => p.set({ fill2: e.target.checked ? '#FFFFFF' : undefined })}
          data-toggle="gradient"
        />
        <span>{p.w.gradient}</span>
      </label>
      {p.fill2 && (
        <>
          <ColorRow
            w={p.w}
            value={p.fill2}
            docColors={p.docColors}
            onPick={(c) => p.set({ fill2: c ?? '#FFFFFF' })}
            testId="fill2"
          />
          <Slider
            label={p.w.angle}
            min={0}
            max={360}
            step={15}
            value={p.angle ?? 180}
            onChange={(v) => p.set({ gradientAngle: v }, 'angle')}
            suffix="°"
          />
        </>
      )}
    </>
  )
}

export function Inspector(p: InspectorProps) {
  const { w } = p
  if (p.selection.length === 0) {
    return (
      <div className="dz-props" data-props="page">
        <p className="dz-muted">{w.nothing}</p>
        <Section title={w.background}>
          <FillRow
            w={w}
            fill={p.page.background}
            fill2={p.page.background2}
            angle={p.page.gradientAngle}
            docColors={p.docColors}
            set={(patch, merge) =>
              p.changePage(
                (pg) => {
                  if ('fill' in patch && patch.fill) pg.background = patch.fill
                  if ('fill2' in patch) pg.background2 = patch.fill2
                  if (patch.gradientAngle !== undefined) pg.gradientAngle = patch.gradientAngle
                },
                merge && `page:${merge}`,
              )
            }
          />
        </Section>
      </div>
    )
  }

  if (p.selection.length > 1) {
    const first = p.selection[0]!.group
    const oneGroup = Boolean(first) && p.selection.every((e) => e.group === first)
    return (
      <div className="dz-props" data-props="many">
        <p className="dz-muted">
          {oneGroup ? `${w.grouped} · ` : ''}
          {w.selectedMany(p.selection.length)}
        </p>
        <Section title={w.alignSelection}>
          <div className="dz-grid3">
            {ALIGNS.map((a) => (
              <button
                key={a.mode}
                type="button"
                onClick={() => p.align(a.mode)}
                data-align={a.mode}
                title={w.aligns[a.mode]}
              >
                {a.icon} {w.aligns[a.mode]}
              </button>
            ))}
          </div>
          <div className="dz-row">
            <button
              type="button"
              disabled={p.selection.length < 3}
              onClick={() => p.spread('x')}
              data-spread="x"
            >
              {w.spreadX}
            </button>
            <button
              type="button"
              disabled={p.selection.length < 3}
              onClick={() => p.spread('y')}
              data-spread="y"
            >
              {w.spreadY}
            </button>
          </div>
        </Section>
        <div className="dz-row dz-actions">
          {oneGroup ? (
            <button type="button" onClick={p.ungroup} data-action="ungroup" title="Ctrl+Shift+G">
              {w.ungroup}
            </button>
          ) : (
            <button type="button" onClick={p.group} data-action="group" title="Ctrl+G">
              {w.group}
            </button>
          )}
        </div>
        <div className="dz-row dz-actions">
          <button type="button" onClick={p.toggleLock}>
            {p.selection.every((e) => e.locked) ? w.unlock : w.lock}
          </button>
          <button type="button" onClick={p.duplicate}>
            {w.duplicate}
          </button>
          <button type="button" className="danger" onClick={p.remove}>
            {w.remove}
          </button>
        </div>
      </div>
    )
  }

  const e = p.selection[0]!
  const pcList = p.pcFonts.length ? p.pcFonts : SYSTEM_FONTS
  const listed = new Set([...BUNDLED_FONTS, ...GONGU_FONTS, ...pcList].map((f) => f.family))
  const set = (patch: Partial<DesignElement>, merge?: string) =>
    p.change(e.id, patch, merge && `${e.id}:${merge}`)
  const shadowOptions: { id: ShadowKind | undefined; label: string }[] = [
    { id: undefined, label: w.none },
    { id: 'soft', label: w.shadows.soft },
    { id: 'hard', label: w.shadows.hard },
    { id: 'glow', label: w.shadows.glow },
  ]
  const num = (label: string, key: 'x' | 'y' | 'w' | 'h' | 'rotation', min?: number) => (
    <label className="dz-num">
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(e[key] ?? 0)}
        min={min}
        onChange={(ev) => set({ [key]: Number(ev.target.value) || 0 }, key)}
        data-num={key}
      />
    </label>
  )

  return (
    <div className="dz-props" data-props={e.kind}>
      {e.locked && <p className="dz-locked">🔒 {w.locked}</p>}
      {e.group && (
        <div className="dz-row dz-group-note">
          <span className="dz-muted">{w.grouped}</span>
          <button type="button" onClick={p.ungroup} data-action="ungroup">
            {w.ungroup}
          </button>
        </div>
      )}
      {e.kind === 'text' && (
        <>
          <label className="dz-col">
            <span>{w.text}</span>
            <textarea
              rows={4}
              value={e.text ?? ''}
              onChange={(ev) => set({ text: ev.target.value }, 'text')}
            />
          </label>
          {p.ai && (
            <div className="dz-col" data-hanpan="design-ai-rewrite">
              <span className="dz-muted">✦ {w.aiRewrite}</span>
              <div className="dz-row">
                {REWRITE_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={p.ai!.busy}
                    onClick={() => p.ai!.rewrite(e.id, m)}
                    data-ai-rewrite={m}
                  >
                    {w.rewrites[m]}
                  </button>
                ))}
              </div>
              <label className="dz-row">
                <span>{w.translateTo}</span>
                <select
                  value={p.ai.translateTo ?? ''}
                  onChange={(ev) => p.ai!.setTranslateTo(ev.target.value || null)}
                  data-hanpan="design-translate-to"
                >
                  <option value="">
                    {/* the language it really goes to: English for a Korean text (점검 v2 #32) */}
                    {w.translateAuto(
                      ((target) => LANG_NATIVE_NAMES[target] ?? target)(
                        translateTarget(p.lang, e.text ?? ''),
                      ),
                    )}
                  </option>
                  {Object.entries(LANG_NATIVE_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {p.ai.busy && (
                <div className="dz-row" role="status">
                  <span className="dz-muted">{w.aiRewriting}</span>
                  <button type="button" onClick={p.ai.stop}>
                    {w.aiStop}
                  </button>
                </div>
              )}
              {p.ai.error && !p.ai.busy && <p className="dz-ai-error">{p.ai.error}</p>}
            </div>
          )}
          <label className="dz-row">
            <span>{w.font}</span>
            <select
              value={e.fontFamily}
              onChange={(ev) =>
                ev.target.value === ADD_FONT ? p.addFont() : set({ fontFamily: ev.target.value })
              }
              onMouseDown={p.loadPcFonts}
              onKeyDown={p.loadPcFonts}
              data-hanpan="font-select"
            >
              <optgroup label={w.bundledFonts}>
                {BUNDLED_FONTS.map((f) => (
                  <option key={f.family} value={f.family}>
                    {fontLabel(f, p.lang)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={w.gonguFonts}>
                {GONGU_FONTS.map((f) => (
                  <option key={f.family} value={f.family}>
                    {fontLabel(f, p.lang)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={w.systemFonts}>
                {pcList.map((f) => (
                  <option key={f.family} value={f.family}>
                    {fontLabel(f, p.lang)}
                  </option>
                ))}
              </optgroup>
              {p.fonts.length > 0 && (
                <optgroup label={w.myFonts}>
                  {p.fonts.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </optgroup>
              )}
              {e.fontFamily && !listed.has(e.fontFamily) && !p.fonts.includes(e.fontFamily) && (
                <option>{e.fontFamily}</option>
              )}
              <option value={ADD_FONT}>{w.addFont}</option>
            </select>
          </label>
          <label className="dz-row">
            <span>{w.size}</span>
            <input
              type="number"
              min={8}
              max={600}
              value={e.fontSize}
              onChange={(ev) => set({ fontSize: Number(ev.target.value) || 12 }, 'size')}
            />
          </label>
          <div className="dz-row dz-toggles">
            <button
              type="button"
              className={(e.fontWeight ?? 400) >= 700 ? 'on' : ''}
              onClick={() => set({ fontWeight: (e.fontWeight ?? 400) >= 700 ? 400 : 900 })}
              title={w.bold}
            >
              <b>B</b>
            </button>
            <button
              type="button"
              className={e.italic ? 'on' : ''}
              onClick={() => set({ italic: !e.italic })}
              title={w.italic}
              data-toggle="italic"
            >
              <i>I</i>
            </button>
            <button
              type="button"
              className={e.underline ? 'on' : ''}
              onClick={() => set({ underline: !e.underline })}
              title={w.underline}
              data-toggle="underline"
            >
              <u>U</u>
            </button>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={e.align === a ? 'on' : ''}
                onClick={() => set({ align: a })}
                title={w.textAligns[a]}
                aria-label={w.textAligns[a]}
              >
                {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
              </button>
            ))}
          </div>
          <Slider
            label={w.spacing}
            min={-10}
            max={60}
            value={e.letterSpacing ?? 0}
            onChange={(v) => set({ letterSpacing: v }, 'spacing')}
          />
          <Slider
            label={w.lineHeight}
            min={0.8}
            max={2.5}
            step={0.05}
            value={e.lineHeight ?? 1.35}
            onChange={(v) => set({ lineHeight: v }, 'lh')}
          />
          <Section title={w.color}>
            <ColorRow
              w={w}
              value={e.color}
              docColors={p.docColors}
              onPick={(c) => set({ color: c ?? '#000000' })}
              testId="text"
            />
          </Section>
          <Section title={w.effects}>
            <span className="dz-muted">{w.shadow}</span>
            <Choice
              name="shadow"
              value={e.shadow}
              options={shadowOptions}
              onPick={(v) => set({ shadow: v })}
            />
            <Slider
              label={w.outlineText}
              min={0}
              max={30}
              value={e.outline ?? 0}
              onChange={(v) =>
                set(
                  { outline: v || undefined, outlineColor: e.outlineColor ?? '#FFFFFF' },
                  'outline',
                )
              }
            />
            {(e.outline ?? 0) > 0 && (
              <ColorRow
                w={w}
                value={e.outlineColor}
                docColors={p.docColors}
                onPick={(c) => set({ outlineColor: c ?? '#FFFFFF' })}
                testId="outline"
              />
            )}
            <span className="dz-muted">{w.highlight}</span>
            <ColorRow
              w={w}
              value={e.highlight}
              docColors={p.docColors}
              allowNone
              onPick={(c) =>
                set({
                  highlight: c,
                  radius: c ? (e.radius ?? Math.round((e.fontSize ?? 48) * 0.4)) : e.radius,
                })
              }
              testId="highlight"
            />
            {e.highlight && (
              <Slider
                label={w.radius}
                min={0}
                max={200}
                value={e.radius ?? 0}
                onChange={(v) => set({ radius: v }, 'radius')}
              />
            )}
          </Section>
        </>
      )}

      {(e.kind === 'rect' || e.kind === 'ellipse' || e.kind === 'shape') && (
        <>
          {e.kind === 'shape' && (
            <Section title={w.shape}>
              <div className="dz-grid4">
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={e.shape === s ? 'on' : ''}
                    onClick={() => set({ shape: s })}
                    title={w.shapes[s]}
                  >
                    {w.shapes[s]}
                  </button>
                ))}
              </div>
            </Section>
          )}
          <Section title={w.fill}>
            <FillRow
              w={w}
              fill={e.fill}
              fill2={e.fill2}
              angle={e.gradientAngle}
              docColors={p.docColors}
              allowNone
              set={(patch, merge) => set(patch, merge)}
            />
          </Section>
          {e.kind === 'rect' && (
            <Slider
              label={w.radius}
              min={0}
              max={Math.round(Math.min(e.w, e.h) / 2)}
              value={Math.min(e.radius ?? 0, Math.round(Math.min(e.w, e.h) / 2))}
              onChange={(v) => set({ radius: v }, 'radius')}
            />
          )}
        </>
      )}

      {e.kind === 'image' && p.lockNote && (
        <p className="dz-muted" data-hanpan="image-lock">
          {p.lockNote}
        </p>
      )}

      {e.kind === 'image' && !p.lockNote && (
        <>
          <Section title={w.crop}>
            <Slider
              label={w.cropZoom}
              min={100}
              max={400}
              step={5}
              value={Math.round((e.cropZoom ?? 1) * 100)}
              onChange={(v) => set({ cropZoom: v / 100 }, 'crop-zoom')}
              suffix="%"
            />
            <Slider
              label={w.cropX}
              min={0}
              max={100}
              value={Math.round((e.cropX ?? 0.5) * 100)}
              onChange={(v) => set({ cropX: v / 100 }, 'crop-x')}
            />
            <Slider
              label={w.cropY}
              min={0}
              max={100}
              value={Math.round((e.cropY ?? 0.5) * 100)}
              onChange={(v) => set({ cropY: v / 100 }, 'crop-y')}
            />
            <div className="dz-row">
              <button type="button" onClick={() => p.startCrop(e.id)} data-action="crop">
                {w.crop}
              </button>
              <button
                type="button"
                onClick={() => set({ cropZoom: undefined, cropX: undefined, cropY: undefined })}
                data-action="crop-reset"
              >
                {w.cropReset}
              </button>
            </div>
            <span className="dz-muted">{w.cropHint}</span>
          </Section>
          <Section title={w.filter}>
            <Choice
              name="filter"
              value={e.filter}
              options={[
                { id: undefined, label: w.none },
                ...IMAGE_FILTERS.map((f) => ({ id: f, label: w.filters[f] })),
              ]}
              onPick={(v) => set({ filter: v })}
            />
          </Section>
          <Slider
            label={w.radius}
            min={0}
            max={Math.round(Math.min(e.w, e.h) / 2)}
            value={Math.min(e.radius ?? 0, Math.round(Math.min(e.w, e.h) / 2))}
            onChange={(v) => set({ radius: v }, 'radius')}
          />
          <div className="dz-row">
            <button
              type="button"
              className={e.flipX ? 'on' : ''}
              onClick={() => set({ flipX: !e.flipX })}
            >
              {w.flip}
            </button>
            <button type="button" onClick={() => p.fillPage(e.id)} data-action="fill-page">
              {w.fillPage}
            </button>
            <button type="button" onClick={() => p.replaceImage(e.id)}>
              {w.replaceImage}
            </button>
          </div>
        </>
      )}

      {e.kind === 'qr' && (
        <>
          <label className="dz-col">
            <span>{w.qrText}</span>
            <input
              value={e.qrText ?? ''}
              onChange={(ev) => set({ qrText: ev.target.value }, 'qr')}
              data-hanpan="qr-text"
            />
          </label>
          <Section title={w.qrColor}>
            <ColorRow
              w={w}
              value={e.color}
              docColors={p.docColors}
              onPick={(c) => set({ color: c ?? '#000000' })}
              testId="qr"
            />
          </Section>
          <Section title={w.qrBack}>
            <ColorRow
              w={w}
              value={e.fill}
              docColors={p.docColors}
              onPick={(c) => set({ fill: c ?? '#FFFFFF' })}
              testId="qrback"
            />
          </Section>
          <Slider
            label={w.radius}
            min={0}
            max={Math.round(Math.min(e.w, e.h) / 4)}
            value={e.radius ?? 0}
            onChange={(v) => set({ radius: v }, 'radius')}
          />
        </>
      )}

      {(e.kind === 'line' ||
        e.kind === 'rect' ||
        e.kind === 'ellipse' ||
        e.kind === 'shape' ||
        (e.kind === 'image' && !p.lockNote) ||
        e.kind === 'draw' ||
        e.kind === 'icon') && (
        <Section title={e.kind === 'icon' ? w.iconLook : w.stroke}>
          <ColorRow
            w={w}
            value={e.stroke}
            docColors={p.docColors}
            onPick={(c) => set({ stroke: c ?? '#000000', strokeWidth: e.strokeWidth || 4 })}
            testId="stroke"
          />
          <Slider
            label={w.strokeWidth}
            min={e.kind === 'icon' ? 0.5 : e.kind === 'draw' ? 1 : 0}
            max={e.kind === 'icon' ? 4 : e.kind === 'draw' ? 80 : 40}
            step={e.kind === 'icon' ? 0.25 : 1}
            value={e.strokeWidth ?? 0}
            onChange={(v) => set({ strokeWidth: v }, 'sw')}
          />
        </Section>
      )}

      {e.kind !== 'text' && !p.lockNote && (
        <Section title={w.shadow}>
          <Choice
            name="shadow"
            value={e.shadow}
            options={shadowOptions}
            onPick={(v) => set({ shadow: v })}
          />
        </Section>
      )}

      {!p.lockNote && (
        <Slider
          label={w.opacity}
          min={10}
          max={100}
          value={Math.round((e.opacity ?? 1) * 100)}
          onChange={(v) => set({ opacity: v / 100 }, 'opacity')}
          suffix="%"
        />
      )}

      <Section title={w.position}>
        <div className="dz-grid-num">
          {num('X', 'x')}
          {num('Y', 'y')}
          {num(e.kind === 'line' ? 'ΔX' : 'W', 'w', e.kind === 'line' ? undefined : 10)}
          {num(e.kind === 'line' ? 'ΔY' : 'H', 'h', e.kind === 'line' ? undefined : 10)}
          {e.kind !== 'line' && !p.lockNote && num(`${w.rotation}°`, 'rotation')}
        </div>
        <span className="dz-muted">{w.alignPage}</span>
        <div className="dz-grid3">
          {ALIGNS.map((a) => (
            <button
              key={a.mode}
              type="button"
              onClick={() => p.align(a.mode)}
              data-align={a.mode}
              title={w.aligns[a.mode]}
            >
              {a.icon} {w.aligns[a.mode]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={w.arrange}>
        <div className="dz-grid2">
          <button type="button" onClick={() => p.arrange('toFront')}>
            {w.toFront}
          </button>
          <button type="button" onClick={() => p.arrange('front')}>
            {w.front}
          </button>
          <button type="button" onClick={() => p.arrange('back')}>
            {w.back}
          </button>
          <button type="button" onClick={() => p.arrange('toBack')}>
            {w.toBack}
          </button>
        </div>
      </Section>
      <div className="dz-row dz-actions">
        <button type="button" onClick={p.toggleLock} data-action="lock">
          {e.locked ? w.unlock : w.lock}
        </button>
        <button type="button" onClick={p.duplicate}>
          {w.duplicate}
        </button>
        <button type="button" className="danger" onClick={p.remove}>
          {w.remove}
        </button>
      </div>
    </div>
  )
}
