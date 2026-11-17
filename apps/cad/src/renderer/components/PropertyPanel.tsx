/**
 * The property panel at the right of the 3D view: the selected parts' name,
 * kind (solid / hole), dimensions (in the engine's `SHAPE_DIMS` order),
 * position, rotation, colour, hidden and locked, as numbers and switches.
 *
 * Several selected parts show what they share; a value that differs is a
 * blank box, and typing into it sets that one value on all of them (an edited
 * position axis keeps each part's other axes). Dimensions show only when all
 * selected parts are the same kind of shape. Every change is handed back as
 * one patch for `setProperty`, which is one undo step; a value the engine
 * refuses (a locked part, a size out of range) is reported by the caller and
 * the box shows the drawing's value again.
 *
 * Only top-level parts are ever selected, so hide and lock always apply to a
 * top-level part (the plan's rule: parts inside a group are edited after
 * ungrouping).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  SHAPE_DIMS,
  formatMm,
  type CadDocument,
  type Part,
  type PartPatch,
  type PartRole,
  type ShapeKind,
  type Vec3,
} from '@genoffice/cad-engine'
import { SHAPE_LABEL } from '../editing/commands'
import { useI18n, type StringKey } from '../i18n/locale'

export type PanelPatch = PartPatch | ((part: Part) => PartPatch)

/** A value shared by every selected part, or null where they differ. */
type Shared<T> = T | null

export interface PanelValues {
  name: Shared<string>
  role: Shared<PartRole>
  color: Shared<string>
  position: [Shared<number>, Shared<number>, Shared<number>]
  rotation: [Shared<number>, Shared<number>, Shared<number>]
  hidden: Shared<boolean>
  locked: Shared<boolean>
  /** what the dimension boxes belong to: one shape kind, sketched solids, or none */
  dimsOf: ShapeKind | 'extrude' | null
  /** the dimensions in the engine's order; null when the parts differ in kind */
  dims: Record<string, Shared<number>> | null
}

const DIM_LABEL: Record<string, StringKey> = {
  width: 'dimWidth',
  depth: 'dimDepth',
  height: 'dimHeight',
  diameter: 'dimDiameter',
  outerDiameter: 'dimOuterDiameter',
  innerDiameter: 'dimInnerDiameter',
  tubeDiameter: 'dimTubeDiameter',
  radius: 'dimRadius',
  points: 'dimPoints',
  size: 'dimSize',
}

const TYPE_LABEL: Record<Exclude<Part['type'], 'shape'>, StringKey> = {
  extrude: 'partExtrude',
  mesh: 'partMesh',
  drawing: 'partDrawing',
  group: 'partGroup',
}

const AXES = ['x', 'y', 'z'] as const

function shared<T>(values: readonly T[]): Shared<T> {
  const [first, ...rest] = values
  if (first === undefined) return null
  return rest.every((v) => v === first) ? first : null
}

/** What the boxes show for these parts: shared values, null where they differ. */
export function panelValues(parts: readonly Part[]): PanelValues {
  const kinds = new Set(parts.map((p) => (p.type === 'shape' ? p.shape : p.type)))
  const kind = kinds.size === 1 ? [...kinds][0]! : null
  let dimsOf: PanelValues['dimsOf'] = null
  let dims: PanelValues['dims'] = null
  if (kind && kind in SHAPE_DIMS) {
    dimsOf = kind as ShapeKind
    dims = {}
    for (const name of SHAPE_DIMS[dimsOf]) {
      dims[name] = shared(parts.map((p) => (p.type === 'shape' ? p.dims[name]! : NaN)))
    }
  } else if (kind === 'extrude') {
    dimsOf = 'extrude'
    dims = { height: shared(parts.map((p) => (p.type === 'extrude' ? p.height : NaN))) }
  }
  const axis = (pick: (p: Part) => Vec3, k: number) => shared(parts.map((p) => pick(p)[k]!))
  return {
    name: shared(parts.map((p) => p.name)),
    role: shared(parts.map((p) => p.role)),
    color: shared(parts.map((p) => p.color.toLowerCase())),
    position: [0, 1, 2].map((k) => axis((p) => p.position, k)) as PanelValues['position'],
    rotation: [0, 1, 2].map((k) => axis((p) => p.rotation, k)) as PanelValues['rotation'],
    hidden: shared(parts.map((p) => p.hidden)),
    locked: shared(parts.map((p) => p.locked)),
    dimsOf,
    dims,
  }
}

/** A text shape's outlines grown or shrunk about its origin. */
function scaleOutlines(outlines: readonly number[][], factor: number): number[][] {
  return outlines.map((ring) => ring.map((v) => v * factor))
}

/** The patch for one dimension box. */
function dimPatch(dimsOf: ShapeKind | 'extrude', name: string, value: number): PanelPatch {
  if (dimsOf === 'extrude') return { height: value }
  if (dimsOf === 'text' && name === 'size') {
    // the letters are outlines made at the old size: they grow with the size
    return (part) => {
      if (part.type !== 'shape' || !part.text) return { dims: { size: value } }
      const factor = value / (part.dims.size || value)
      return {
        dims: { size: value },
        text: { value: part.text.value, outlines: scaleOutlines(part.text.outlines, factor) },
      }
    }
  }
  return { dims: { [name]: value } }
}

/** One axis of a position or rotation; each part keeps its other two axes. */
function axisPatch(field: 'position' | 'rotation', k: number, value: number): PanelPatch {
  return (part) => {
    const next: Vec3 = [...part[field]]
    next[k] = value
    return { [field]: next }
  }
}

export interface PropertyPanelProps {
  doc: CadDocument
  /** the selected top-level part ids */
  ids: readonly string[]
  disabled?: boolean
  onPatch(patch: PanelPatch): void
}

export function PropertyPanel({ doc, ids, disabled = false, onPatch }: PropertyPanelProps) {
  const { t } = useI18n()
  const parts = ids.map((id) => doc.parts.find((p) => p.id === id)).filter((p): p is Part => !!p)
  const heading = (() => {
    if (parts.length === 0) return t('propTitle')
    if (parts.length > 1) return `${t('propTitle')} · ${t('propCount', { n: parts.length })}`
    const part = parts[0]!
    const kind = part.type === 'shape' ? t(SHAPE_LABEL[part.shape]) : t(TYPE_LABEL[part.type])
    return `${t('propTitle')} · ${kind}`
  })()
  if (parts.length === 0) {
    return (
      <section className="cad-props" data-cad-properties="">
        <h2 className="cad-props-title">{heading}</h2>
        <p className="cad-props-empty">{t('propEmpty')}</p>
      </section>
    )
  }
  const v = panelValues(parts)
  return (
    <section className="cad-props" data-cad-properties="">
      <h2 className="cad-props-title">{heading}</h2>
      <fieldset className="cad-props-body" disabled={disabled}>
        <Row label={t('propName')}>
          <TextBox prop="name" value={v.name} onCommit={(name) => onPatch({ name })} />
        </Row>
        <Row label={t('propKind')}>
          <div className="cad-segmented" role="group" aria-label={t('propKind')}>
            {(['solid', 'hole'] as const).map((role) => (
              <button
                key={role}
                type="button"
                className={`cad-segment${v.role === role ? ' active' : ''}`}
                data-prop={`role.${role}`}
                aria-pressed={v.role === role}
                onClick={() => {
                  if (v.role !== role) onPatch({ role })
                }}
              >
                {t(role === 'solid' ? 'kindSolid' : 'hole')}
              </button>
            ))}
          </div>
        </Row>
        {v.dims && v.dimsOf && (
          <div className="cad-props-group">
            <h3 className="cad-props-sub">{t('propSize')}</h3>
            {Object.entries(v.dims).map(([name, value]) => (
              <Row key={name} label={t(DIM_LABEL[name] ?? 'propSize')}>
                <NumberBox
                  prop={`dims.${name}`}
                  value={value}
                  unit={name === 'points' ? '' : 'mm'}
                  onCommit={(next) => onPatch(dimPatch(v.dimsOf!, name, next))}
                />
              </Row>
            ))}
          </div>
        )}
        {(['position', 'rotation'] as const).map((field) => (
          <div key={field} className="cad-props-group">
            <h3 className="cad-props-sub">
              {t(field === 'position' ? 'propPosition' : 'propRotation')}
            </h3>
            <div className="cad-props-axes">
              {AXES.map((axis, k) => (
                <label key={axis} className="cad-axis">
                  <span className="cad-axis-name">{axis.toUpperCase()}</span>
                  <NumberBox
                    prop={`${field}.${axis}`}
                    value={v[field][k]!}
                    onCommit={(next) => onPatch(axisPatch(field, k, next))}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <Row label={t('propColor')}>
          <ColorBox
            value={v.color}
            fallback={parts[0]!.color}
            label={t('propColor')}
            onCommit={(color) => onPatch({ color })}
          />
        </Row>
        <div className="cad-props-flags">
          <Flag
            prop="hidden"
            label={t('propHidden')}
            value={v.hidden}
            onChange={(hidden) => onPatch({ hidden })}
          />
          <Flag
            prop="locked"
            label={t('propLocked')}
            value={v.locked}
            onChange={(locked) => onPatch({ locked })}
          />
        </div>
      </fieldset>
    </section>
  )
}

/**
 * The colour swatch. The native picker fires `input` for every step of a
 * drag; those only move the swatch. The picker's `change` (it closed or the
 * choice was made) or leaving the box hands back one patch, so a drag is one
 * undo step. React's `onChange` on a colour input follows `input`, so the
 * native `change` is listened to directly.
 */
function ColorBox({
  value,
  fallback,
  label,
  onCommit,
}: {
  value: Shared<string>
  fallback: string
  label: string
  onCommit: (color: string) => void
}) {
  const shown = value ?? fallback
  const [draft, setDraft] = useState(shown)
  const ref = useRef<HTMLInputElement>(null)
  // the latest props, read by the native listener without re-binding it
  const latest = useRef({ value, onCommit })
  latest.current = { value, onCommit }
  // the colour last handed back, so `change` then blur is still one patch
  const committed = useRef<string | null>(null)
  useEffect(() => {
    setDraft(shown)
    committed.current = null
  }, [shown])
  const commit = (): void => {
    const next = ref.current?.value
    if (!next || next === latest.current.value || next === committed.current) return
    committed.current = next
    latest.current.onCommit(next)
  }
  useEffect(() => {
    const input = ref.current
    if (!input) return
    const onChange = (): void => commit()
    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [])
  return (
    <input
      ref={ref}
      type="color"
      className="cad-color"
      data-prop="color"
      data-mixed={value === null ? '' : undefined}
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
    />
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cad-prop-row">
      <span className="cad-prop-label">{label}</span>
      <span className="cad-prop-value">{children}</span>
    </div>
  )
}

/**
 * A box that edits on Enter or when it loses the focus; Esc puts the
 * drawing's value back. While the user types, the drawing's value does not
 * overwrite the draft.
 */
function useDraft(shown: string): {
  text: string
  editing: boolean
  set(next: string): void
  stop(): void
} {
  const [draft, setDraft] = useState<string | null>(null)
  // a new value from the drawing (an undo, another part) ends the draft
  useEffect(() => setDraft(null), [shown])
  return {
    text: draft ?? shown,
    editing: draft !== null,
    set: setDraft,
    stop: () => setDraft(null),
  }
}

function NumberBox(p: {
  prop: string
  value: Shared<number>
  unit?: string
  onCommit(value: number): void
}) {
  const shown = p.value === null ? '' : formatMm(p.value)
  const draft = useDraft(shown)
  const commit = (): void => {
    if (!draft.editing) return
    const text = draft.text.trim().replace(',', '.')
    draft.stop()
    if (text === '' || text === shown) return
    const value = Number(text)
    if (!Number.isFinite(value)) return
    if (p.value !== null && value === p.value) return
    p.onCommit(value)
  }
  return (
    <input
      className="cad-input cad-number"
      inputMode="decimal"
      data-prop={p.prop}
      value={draft.text}
      onChange={(e) => draft.set(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          draft.stop()
        }
      }}
    />
  )
}

function TextBox(p: { prop: string; value: Shared<string>; onCommit(value: string): void }) {
  const shown = p.value ?? ''
  const draft = useDraft(shown)
  const commit = (): void => {
    if (!draft.editing) return
    const text = draft.text.trim()
    draft.stop()
    if (text === '' || text === shown) return
    p.onCommit(text)
  }
  return (
    <input
      className="cad-input"
      data-prop={p.prop}
      value={draft.text}
      maxLength={200}
      onChange={(e) => draft.set(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          draft.stop()
        }
      }}
    />
  )
}

function Flag(p: {
  prop: string
  label: string
  value: Shared<boolean>
  onChange(value: boolean): void
}) {
  return (
    <label className="cad-flag">
      <input
        type="checkbox"
        data-prop={p.prop}
        checked={p.value === true}
        ref={(el) => {
          // several parts that differ: neither on nor off
          if (el) el.indeterminate = p.value === null
        }}
        onChange={() => p.onChange(p.value !== true)}
      />
      <span>{p.label}</span>
    </label>
  )
}
