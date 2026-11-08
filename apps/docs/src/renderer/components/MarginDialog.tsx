import { useEffect, useRef, useState } from 'react'
import { useI18n, type StringKey } from '../i18n/locale'
import { odtOffNotice } from '../odt-gate'
import { useModalKeys } from './modal-keys'
import { LengthInput } from './LengthInput'
import { useMeasurement } from '../use-measurement'
import { paperSizeCaption, paperSizeKeyOf, paperSizesFor, PAPER_SIZES } from './ribbon-layout-tab'

export interface PageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

/** Word rejects margins that leave less than about one inch of body */
const MIN_BODY_TWIPS = 1440

export const marginsFitPage = (
  margins: PageMargins,
  pageWidth: number,
  pageHeight: number,
): boolean =>
  margins.left + margins.right <= pageWidth - MIN_BODY_TWIPS &&
  margins.top + margins.bottom <= pageHeight - MIN_BODY_TWIPS

/** the page the dialog applies: size in twips as laid out (landscape = wider than tall) */
export interface PageSetup {
  pageWidth: number
  pageHeight: number
  orientation: 'portrait' | 'landscape'
}

type Side = 'top' | 'bottom' | 'left' | 'right'

const SIDES: Array<[Side, StringKey]> = [
  ['top', 'ribbonMarginTop'],
  ['bottom', 'ribbonMarginBottom'],
  ['left', 'ribbonMarginLeft'],
  ['right', 'ribbonMarginRight'],
]

/**
 * Word's Page Setup: margins, paper size and orientation in one dialog
 * (Layout → Margins → Custom Margins), applied together on OK.
 */
export function MarginDialog({
  margins,
  mirror: initialMirror,
  pageWidth: initialWidth,
  pageHeight: initialHeight,
  orientation: initialOrientation,
  mirrorOff = false,
  onApply,
  onClose,
}: {
  margins: PageMargins
  /** w:mirrorMargins: left/right are inside/outside (Word's Multiple pages: Mirror margins) */
  mirror: boolean
  pageWidth: number
  pageHeight: number
  /** the section's orientation flag; omitted: read from the page's shape */
  orientation?: PageSetup['orientation']
  /** an ODT document: mirror margins are switched off */
  mirrorOff?: boolean
  onApply: (next: PageMargins, mirror: boolean, page: PageSetup) => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const { format } = useMeasurement()
  const [next, setNext] = useState<PageMargins>(margins)
  const [mirror, setMirror] = useState(initialMirror)
  const [page, setPage] = useState<PageSetup>(() => ({
    pageWidth: initialWidth,
    pageHeight: initialHeight,
    orientation: initialOrientation ?? (initialWidth > initialHeight ? 'landscape' : 'portrait'),
  }))
  const { pageWidth, pageHeight } = page
  // Enter inside a field commits its value first; submit runs on the flushed state
  const [submitTick, setSubmitTick] = useState(0)
  const modalKeys = useModalKeys(onClose)
  const tooLarge = !marginsFitPage(next, pageWidth, pageHeight)
  const paperKey = paperSizeKeyOf(pageWidth, pageHeight) ?? 'custom'
  /** the page's own size when it is not in the list, so OK keeps it */
  const customSize = useState(() =>
    paperSizeKeyOf(initialWidth, initialHeight)
      ? null
      : { w: Math.min(initialWidth, initialHeight), h: Math.max(initialWidth, initialHeight) },
  )[0]

  const setPaper = (key: string) => {
    const size = key === 'custom' ? customSize : PAPER_SIZES.find((p) => p.key === key)
    if (!size) return
    const landscape = page.orientation === 'landscape'
    setPage({
      ...page,
      pageWidth: landscape ? size.h : size.w,
      pageHeight: landscape ? size.w : size.h,
    })
  }
  const setOrientation = (orientation: PageSetup['orientation']) => {
    if (orientation === page.orientation) return
    setPage({ orientation, pageWidth: page.pageHeight, pageHeight: page.pageWidth })
  }

  const submit = () => {
    if (tooLarge) return
    onApply(next, mirror, page)
    onClose()
  }
  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    if (submitTick) submitRef.current()
  }, [submitTick])

  const sideLabel = (side: Side, labelKey: StringKey): string => {
    if (!mirror) return t(labelKey)
    return t(
      side === 'left' ? 'ribbonMarginInside' : side === 'right' ? 'ribbonMarginOutside' : labelKey,
    )
  }
  const field = ([side, labelKey]: [Side, StringKey]) => (
    <label key={side}>
      {sideLabel(side, labelKey)}
      <LengthInput
        value={next[side]}
        min={0}
        max={side === 'left' || side === 'right' ? pageWidth : pageHeight}
        ariaLabel={sideLabel(side, labelKey)}
        live
        onCommit={(twips) => setNext((m) => ({ ...m, [side]: twips ?? 0 }))}
        onEnter={() => setSubmitTick((n) => n + 1)}
      />
    </label>
  )

  return (
    <div
      className="modal-backdrop"
      ref={modalKeys.ref}
      onKeyDown={modalKeys.onKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <h2>{t('ribbonMarginDialogTitle')}</h2>
        <div className="modal-row margin-row">
          <label>
            {t('ribbonPaperSizeDialogTitle')}
            <select data-field="paper" value={paperKey} onChange={(e) => setPaper(e.target.value)}>
              {paperSizesFor(lang).map((p) => (
                <option key={p.key} value={p.key}>
                  {`${p.name} (${paperSizeCaption(p.w, p.h, format)})`}
                </option>
              ))}
              {customSize && (
                <option value="custom">
                  {paperSizeCaption(customSize.w, customSize.h, format)}
                </option>
              )}
            </select>
          </label>
          <label>
            {t('ribbonOrientation')}
            <select
              data-field="orientation"
              value={page.orientation}
              onChange={(e) => setOrientation(e.target.value as PageSetup['orientation'])}
            >
              <option value="portrait">{t('ribbonPortrait')}</option>
              <option value="landscape">{t('ribbonLandscape')}</option>
            </select>
          </label>
        </div>
        <div className="modal-row margin-row">{SIDES.slice(0, 2).map(field)}</div>
        <div className="modal-row margin-row">{SIDES.slice(2).map(field)}</div>
        <div className="modal-row margin-row">
          <label>
            {t('ribbonMarginPages')}
            <select
              value={mirror ? 'mirror' : 'normal'}
              onChange={(e) => setMirror(e.target.value === 'mirror')}
            >
              <option value="normal">{t('ribbonMarginPagesNormal')}</option>
              <option value="mirror" disabled={mirrorOff && !mirror}>
                {t('ribbonMarginPagesMirror')}
              </option>
            </select>
          </label>
        </div>
        {mirrorOff && <p className="fld-hint">{odtOffNotice()}</p>}
        {tooLarge && <div className="modal-error">{t('ribbonMarginTooLarge')}</div>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t('appCancel')}
          </button>
          <button className="btn-primary" disabled={tooLarge} onClick={submit}>
            {t('appOk')}
          </button>
        </div>
      </div>
    </div>
  )
}
