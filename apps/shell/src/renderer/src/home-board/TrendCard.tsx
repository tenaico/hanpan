import type { ReactElement } from 'react'
import { useI18n } from '../locale'

/**
 * The trend card (spec 7.5): Trend Radar's forecast for today. For now only
 * the title and the offline line; the forecast itself comes with the trend
 * service. The props are the final ones so Home's call stays as it is.
 */
export function TrendCard(_props: { now?: () => Date } = {}): ReactElement {
  const { t } = useI18n()
  return (
    <section className="hb-trend">
      <h2 className="hb-card-title">{t('hbTrendTitle')}</h2>
      <p data-trend-offline>{t('hbTrendOffline')}</p>
    </section>
  )
}
