/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import type { HomeApi } from '../src/shared/home-api'
import { HOME_CHANNELS } from '../src/shared/home-api'
import {
  LogoRow,
  MADE_BY_TEXT,
  MadeByLine,
  partnerFor,
  productLogoFor,
} from '../src/renderer/src/home/CoBrand'

/**
 * The logo row: "한판" in Korean, "Hanpan" in every other language, and on
 * the Vietnamese screen DON CHICKEN's logo beside it (used with DON CHICKEN
 * Vietnam's permission, 2026-11-19). The foot of the sidebar says "Made by
 * TenAI" in every language, with the beta mark in front, and opens tenai.kr.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let openMakerSite: ReturnType<typeof vi.fn<() => Promise<void>>>

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  openMakerSite = vi.fn(async () => undefined)
  window.aiOffice = { openMakerSite } as unknown as HomeApi
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(element: ReturnType<typeof createElement>): void {
  act(() => root.render(element))
}

describe('the logo row', () => {
  it('shows the Korean lockup in Korean and the Latin one everywhere else', () => {
    expect(productLogoFor('ko')).not.toBe(productLogoFor('en'))
    for (const lang of LANGS.filter((l) => l !== 'ko')) {
      expect(productLogoFor(lang)).toBe(productLogoFor('en'))
    }
    render(createElement(LogoRow, { lang: 'en' }))
    expect(host.querySelector<HTMLImageElement>('img.logo-lockup')!.alt).toBe('Hanpan')
    render(createElement(LogoRow, { lang: 'ko' }))
    expect(host.querySelector<HTMLImageElement>('img.logo-lockup')!.alt).toBe('한판')
  })

  it('has a partner on the Vietnamese screen only', () => {
    expect(partnerFor('vi')?.name).toBe('DON CHICKEN')
    for (const lang of LANGS.filter((l) => l !== 'vi')) expect(partnerFor(lang)).toBeNull()
  })

  it('puts the DON CHICKEN logo after a divider on the Vietnamese screen', () => {
    render(createElement(LogoRow, { lang: 'vi' }))
    const row = host.querySelector('.sidebar-logo.with-partner')!
    expect(row).not.toBeNull()
    expect(row.querySelector('.cobrand-bar')).not.toBeNull()
    expect(row.querySelector<HTMLImageElement>('img.cobrand-logo')!.alt).toBe('DON CHICKEN')
  })

  it('shows no partner logo in any other language', () => {
    render(createElement(LogoRow, { lang: 'ko' }))
    expect(host.querySelector('.cobrand-logo')).toBeNull()
    expect(host.querySelector('.with-partner')).toBeNull()
  })
})

describe('the made-by line', () => {
  it('says "Made by TenAI" and opens tenai.kr through its own channel', () => {
    expect(MADE_BY_TEXT).toBe('Made by TenAI')
    expect(HOME_CHANNELS.openMakerSite).toBe('home:open-maker-site')
    render(createElement(MadeByLine, {}))
    const link = host.querySelector<HTMLButtonElement>('.made-by .made-by-link')!
    expect(link.textContent).toBe('Made by TenAI')
    act(() => link.click())
    expect(openMakerSite).toHaveBeenCalledTimes(1)
  })

  it('puts the beta mark in front while the release is a beta', () => {
    render(createElement(MadeByLine, { beta: { label: 'Beta', title: 'Beta release' } }))
    const parts = Array.from(host.querySelector('.made-by')!.children)
    expect(parts.map((el) => el.className)).toEqual(['beta-badge', 'made-by-link'])
    render(createElement(MadeByLine, { beta: null }))
    expect(host.querySelector('.beta-badge')).toBeNull()
  })
})
