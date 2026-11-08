/**
 * 디자인 보드 인쇄(0.17): PNG·PDF 내보내기와 같은 그림(`pagePng`, 150 dpi, 마지막 쪽의
 * 출처 목록 포함)을 미리보기로 보이고, [인쇄]에서 그 PNG와 용지를 뒷단에 넘긴다.
 * 용지는 페이지가 용지 크기면(A4 포스터) 그 용지에 제 크기, 화면용 형식이면 A4에 맞춤.
 */
import { useEffect, useMemo, useState } from 'react'
import { ImagePrintDialog, paperSheetFor, type PrintSheet } from '@genoffice/ui'
import type { DesignPage } from './model'
import { pagePng } from './draw'
import type { Words } from './words'

/** PNG·PDF 내보내기의 해상도(design-window.ts의 PDF가 150 dpi로 놓는다) */
export const DESIGN_EXPORT_DPI = 150

export type PrintRange = 'current' | 'all'

export interface DesignPrintResult {
  ok: boolean
  canceled?: true
  error?: string
}

function dataUrl(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(text)}`
}

export function DesignPrintDialog({
  width,
  height,
  pages,
  words: w,
  print,
  onClose,
}: {
  width: number
  height: number
  /** 범위마다 내보내기와 같은 모습의 페이지(출처 목록을 붙인 것) */
  pages: (range: PrintRange) => DesignPage[]
  words: Words
  print: (pages: Uint8Array[], sheet: PrintSheet) => Promise<DesignPrintResult>
  onClose: (failed?: boolean) => void
}) {
  const [range, setRange] = useState<PrintRange>('all')
  const [drawn, setDrawn] = useState<{ range: PrintRange; pngs: Uint8Array[] } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const sheet = useMemo(() => paperSheetFor(width, height, DESIGN_EXPORT_DPI), [width, height])
  const many = pages('all').length > 1

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const pngs: Uint8Array[] = []
        for (const page of pages(range)) pngs.push(await pagePng(page, width, height))
        if (live) setDrawn({ range, pngs })
      } catch {
        if (live) onClose(true)
      }
    })()
    return () => {
      live = false
    }
    // the pages are taken once per range; the board is behind the dialog meanwhile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const ready = drawn?.range === range ? drawn : null
  const pictures = useMemo(
    () => ready?.pngs.map((png) => ({ src: dataUrl(png), width, height })) ?? null,
    [ready, width, height],
  )

  const go = async () => {
    if (!ready) return
    setMessage(null)
    const result = await print(ready.pngs, sheet)
    if (!result.ok) setMessage(w.printFailed)
    // a closed system dialog keeps the preview for another try
    else if (!result.canceled) onClose()
  }

  const paper = `${Math.round(sheet.widthMm)}×${Math.round(sheet.heightMm)}mm`
  return (
    <ImagePrintDialog
      pictures={pictures}
      sheet={sheet}
      message={message}
      labels={{
        title: w.print,
        print: w.print,
        cancel: w.printCancel,
        preparing: w.printPreparing,
        pages: w.printPages,
      }}
      onPrint={go}
      onClose={() => onClose()}
    >
      <span data-hanpan="design-print-paper">
        {w.printPaper(paper)}
        {sheet.marginMm > 0 ? ` · ${w.printFit}` : ''}
      </span>
      {many && (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          <legend style={{ marginBottom: 6 }}>{w.printRange}</legend>
          {(['current', 'all'] as const).map((value) => (
            <label key={value} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="radio"
                name="dz-print-range"
                checked={range === value}
                onChange={() => setRange(value)}
                data-print-range={value}
              />
              {value === 'current' ? w.printCurrent : w.printAll}
            </label>
          ))}
        </fieldset>
      )}
    </ImagePrintDialog>
  )
}
