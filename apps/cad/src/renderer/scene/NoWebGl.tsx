import { useI18n } from '../i18n/locale'

/**
 * Shown instead of the 3D view on a PC that cannot make a WebGL context: why,
 * and the two things the user can do about it. The drawing stays open and can
 * still be saved.
 */
export function NoWebGl() {
  const { t } = useI18n()
  return (
    <div className="cad-nowebgl" role="alert">
      <h2 className="cad-nowebgl-title">{t('noWebGlTitle')}</h2>
      <p className="cad-nowebgl-body">{t('noWebGlBody')}</p>
      <ul className="cad-nowebgl-remedies">
        <li>{t('noWebGlDriver')}</li>
        <li>{t('noWebGlAccel')}</li>
      </ul>
    </div>
  )
}
