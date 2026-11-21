import { useI18n } from '../i18n/locale'

export interface GuideScreenProps {
  /** the file name without its extension */
  name: string
  /** the lower-case extension, without the dot */
  ext: string
}

/**
 * Shown for a file of a CAD program this editor cannot read (STEP,
 * IGES, BREP): which file it is, why it does not open, and what to ask the
 * sender for instead. The file was not read; an empty drawing stays open.
 */
export function GuideScreen({ name, ext }: GuideScreenProps) {
  const { t } = useI18n()
  return (
    <div className="cad-guide" role="note">
      <h2 className="cad-guide-title">{t('guideTitle')}</h2>
      <p className="cad-guide-file">{`${name}.${ext}`}</p>
      <p className="cad-guide-body">{t('guideBody', { ext: ext.toUpperCase() })}</p>
      <p className="cad-guide-ask">{t('guideAsk')}</p>
    </div>
  )
}
