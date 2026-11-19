/**
 * The product logo, who made the app, and the partner shown beside the logo.
 *
 * Korean shows the "한판" lockup; every other language shows the Latin
 * "Hanpan" lockup, matching productName(). The Vietnamese screen puts DON
 * CHICKEN's logo on the same row: DON CHICKEN Vietnam allowed it on
 * 2026-11-19 for Hanpan's launch in Vietnam. That logo is their trademark,
 * not part of the Apache-2.0 code (assets/partners/NOTICE.md). Every
 * language shows "Made by TenAI" in English (a name line, like a signature),
 * with the beta mark beside it; it opens tenai.kr.
 */
import type { ReactElement } from 'react'
import { productName } from '@genoffice/i18n'
import type { Lang } from '@genoffice/i18n'
import logoKorean from '../assets/genoffice-logo.svg'
import logoLatin from '../assets/hanpan-logo-latin.svg'
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

/** The product logo of a screen language: "한판" in Korean, "Hanpan" elsewhere. */
export function productLogoFor(lang: Lang): string {
  return lang === 'ko' ? logoKorean : logoLatin
}

/** The sidebar's logo row: the product logo, and the partner's beside it after a divider. */
export function LogoRow({ lang }: { lang: Lang }): ReactElement {
  const partner = partnerFor(lang)
  return (
    <div className={`sidebar-logo${partner ? ' with-partner' : ''}`}>
      <img className="logo-lockup" src={productLogoFor(lang)} alt={productName(lang)} />
      {partner && (
        <>
          <span className="cobrand-bar" aria-hidden="true" />
          <img className="cobrand-logo" src={partner.logo} alt={partner.name} />
        </>
      )}
    </div>
  )
}

/** The line at the foot of the sidebar, the same in every language. */
export const MADE_BY_TEXT = `Made by ${MAKER_NAME}`

/** "Made by TenAI", with the beta mark in front of it; pressing it opens tenai.kr. */
export function MadeByLine({
  beta,
}: {
  /** the beta mark's label and tooltip, while the release is a beta */
  beta?: { label: string; title: string } | null
}): ReactElement {
  return (
    <div className="made-by">
      {beta && (
        <span className="beta-badge" title={beta.title}>
          {beta.label}
        </span>
      )}
      <button
        type="button"
        className="made-by-link"
        title={MAKER_SITE}
        onClick={() => void window.aiOffice.openMakerSite?.()}
      >
        {MADE_BY_TEXT}
      </button>
    </div>
  )
}
