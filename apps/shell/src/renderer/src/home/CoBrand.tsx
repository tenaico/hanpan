/**
 * Who made the app, and the partner shown beside its name.
 *
 * The Vietnamese screen shows DON CHICKEN's logo next to Hanpan's: DON CHICKEN
 * Vietnam allowed it on 2026-11-19 for Hanpan's launch in Vietnam. The logo is
 * their trademark, not part of the Apache-2.0 code (assets/partners/NOTICE.md).
 * Every language shows that TenAI made the app.
 */
import type { ReactElement } from 'react'
import { createI18n } from '@genoffice/i18n'
import type { Lang } from '@genoffice/i18n'
import { strings } from '../strings'
import donChickenLogo from '../assets/partners/don-chicken.png'

/** The company that makes the app, as it is named on screen. */
export const MAKER_NAME = 'TenAI'
export const MAKER_SITE = 'tenai.kr'

export interface Partner {
  /** the name as the logo writes it, and the logo's alt text */
  name: string
  /** the name in Settings › About */
  fullName: string
  logo: string
}

const DON_CHICKEN: Partner = {
  name: 'DON CHICKEN',
  fullName: 'DON CHICKEN Vietnam',
  logo: donChickenLogo,
}

/** The partner of a screen language, if it has one. */
export function partnerFor(lang: Lang): Partner | null {
  return lang === 'vi' ? DON_CHICKEN : null
}

const translate = createI18n(strings)

/** "× DON CHICKEN" under the product logo; nothing in a language without a partner. */
export function PartnerLogo({ lang }: { lang: Lang }): ReactElement | null {
  const partner = partnerFor(lang)
  if (!partner) return null
  return (
    <div className="cobrand">
      <span className="cobrand-x" aria-hidden="true">
        ×
      </span>
      <img className="cobrand-logo" src={partner.logo} alt={partner.name} />
    </div>
  )
}

/** "Made by TenAI", in the screen language. */
export function MadeByLine({ lang }: { lang: Lang }): ReactElement {
  return <div className="made-by">{translate(lang, 'homeMadeBy', { name: MAKER_NAME })}</div>
}
