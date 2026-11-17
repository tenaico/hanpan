/**
 * The status line under the 3D view. On the right, what the drawing is like:
 * the size of the one selected part (width × depth × height in millimetres),
 * or how many parts are selected, or the workplane, the snap and the grid
 * ("작업판 200 × 200 mm · 달라붙기 1mm · 격자 10mm", the approved mock-up). On
 * the left, one line about what just happened: an edit the engine refused, a
 * failed export, a 3D kernel that did not start.
 */
import { formatMm, type CadDocument } from '@genoffice/cad-engine'
import { useI18n, type StringKey } from '../i18n/locale'

export interface StatusMessage {
  key: StringKey
  /** shown in the error colour */
  error: boolean
}

export interface PartSize {
  name: string
  width: number
  depth: number
  height: number
}

export interface StatusBarProps {
  workplane: CadDocument['workplane']
  /** the position snap in millimetres */
  snapMm: number
  selectedCount: number
  /** the one selected part's size; null when not exactly one part is selected */
  size: PartSize | null
  message: StatusMessage | null
}

export function StatusBar(p: StatusBarProps) {
  const { t } = useI18n()
  const plate = t('statusWorkplane', {
    width: formatMm(p.workplane.width),
    depth: formatMm(p.workplane.depth),
    snap: formatMm(p.snapMm),
    grid: formatMm(p.workplane.grid),
  })
  let info = plate
  if (p.size) {
    info = t('statusPartSize', {
      name: p.size.name,
      width: formatMm(p.size.width),
      depth: formatMm(p.size.depth),
      height: formatMm(p.size.height),
    })
  } else if (p.selectedCount > 1) {
    info = `${t('statusSelected', { n: p.selectedCount })} · ${plate}`
  }
  return (
    <footer
      className="cad-status"
      role="status"
      data-cad-status=""
      data-error={p.message?.error ? '' : undefined}
    >
      <span className="cad-status-message" data-cad-message="">
        {p.message ? t(p.message.key) : ''}
      </span>
      <span className="cad-status-info" data-cad-status-info="">
        {info}
      </span>
    </footer>
  )
}
