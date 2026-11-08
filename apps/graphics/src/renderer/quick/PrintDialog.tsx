/**
 * 인쇄(0.17): 앱에게 합성 그림을 받아(AI 포토는 `app.exportImage`, AI 일러스트는
 * `document.export`, 파일도 문서도 건드리지 않는다) A4에 맞춘 미리보기를 보이고,
 * [인쇄]에서 같은 그림과 같은 용지를 뒷단에 넘긴다. 뒷단이 같은 규칙으로 페이지를
 * 다시 만들어 시스템 인쇄 대화상자로 보낸다. 웹판에는 새 권한이 없다.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ImagePrintDialog,
  PRINT_MAX_SIDE,
  autoOrientation,
  fitSheet,
  pngSize,
  type PrintOrientation,
} from '@genoffice/ui'
import type { GraphicsAdapter } from '../adapters'
import { bytesToBase64 } from '../frame/bytes'
import { useI18n } from '../i18n/locale'
import { graphicsApi } from '../bridge'

interface Picture {
  bytes: Uint8Array
  src: string
  width: number
  height: number
}

export function PrintDialog({
  adapter,
  onClose,
}: {
  adapter: GraphicsAdapter
  onClose: (message?: 'printNothing' | 'printFailed') => void
}) {
  const { t } = useI18n()
  const [picture, setPicture] = useState<Picture | null>(null)
  const [orientation, setOrientation] = useState<PrintOrientation | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const bytes = await adapter.snapshotPng(PRINT_MAX_SIDE)
        const size = bytes ? pngSize(bytes) : null
        if (!live) return
        if (!bytes || !size) return onClose('printNothing')
        setPicture({ bytes, src: `data:image/png;base64,${bytesToBase64(bytes)}`, ...size })
      } catch {
        if (live) onClose('printFailed')
      }
    })()
    return () => {
      live = false
    }
    // one picture per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const turn =
    orientation ?? (picture ? autoOrientation(picture.width, picture.height) : 'portrait')
  const sheet = useMemo(
    () => (picture ? fitSheet(picture.width, picture.height, turn) : fitSheet(1, 1.4142, turn)),
    [picture, turn],
  )
  const pictures = useMemo(
    () => (picture ? [{ src: picture.src, width: picture.width, height: picture.height }] : null),
    [picture],
  )

  const print = async () => {
    if (!picture) return
    setMessage(null)
    const result = await graphicsApi().print({ bytes: picture.bytes, sheet })
    if (!result.ok) setMessage(t('printFailed'))
    // the system dialog closed without printing: the preview stays for another try
    else if (!('canceled' in result)) onClose()
  }

  return (
    <ImagePrintDialog
      pictures={pictures}
      sheet={sheet}
      message={message}
      labels={{
        title: t('printTitle'),
        print: t('printGo'),
        cancel: t('printCancel'),
        preparing: t('printPreparing'),
        pages: (count) => t('printPages', { count }),
      }}
      onPrint={print}
      onClose={() => onClose()}
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        <legend style={{ marginBottom: 6 }}>{t('printOrientation')}</legend>
        {(['portrait', 'landscape'] as const).map((value) => (
          <label key={value} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="radio"
              name="gx-print-orientation"
              checked={turn === value}
              onChange={() => setOrientation(value)}
              data-print-orientation={value}
            />
            {t(value === 'portrait' ? 'printPortrait' : 'printLandscape')}
          </label>
        ))}
      </fieldset>
    </ImagePrintDialog>
  )
}
