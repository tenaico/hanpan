/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import type { Lang } from '@genoffice/i18n'
import { MadeByLine, PartnerLogo, partnerFor } from '../src/renderer/src/home/CoBrand'
import { strings } from '../src/renderer/src/strings'

/**
 * The Vietnamese screen shows DON CHICKEN's logo beside Hanpan's (used with
 * DON CHICKEN Vietnam's permission, 2026-11-19), and every language shows that
 * TenAI made the app.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(element: ReturnType<typeof createElement>): void {
  act(() => root.render(element))
}

describe('the partner logo', () => {
  it('belongs to the Vietnamese screen only', () => {
    expect(partnerFor('vi')?.name).toBe('DON CHICKEN')
    for (const lang of LANGS.filter((l) => l !== 'vi')) expect(partnerFor(lang)).toBeNull()
  })

  it('shows the DON CHICKEN logo, named, on the Vietnamese screen', () => {
    render(createElement(PartnerLogo, { lang: 'vi' }))
    const img = host.querySelector<HTMLImageElement>('img.cobrand-logo')
    expect(img).not.toBeNull()
    expect(img!.alt).toBe('DON CHICKEN')
    expect(host.querySelector('.cobrand')?.textContent).toContain('×')
  })

  it('shows nothing in any other language', () => {
    render(createElement(PartnerLogo, { lang: 'ko' }))
    expect(host.innerHTML).toBe('')
  })
})

describe('the made-by line', () => {
  it('names TenAI in every language', () => {
    for (const lang of LANGS as readonly Lang[]) {
      render(createElement(MadeByLine, { lang }))
      expect(host.querySelector('.made-by')?.textContent).toContain('TenAI')
    }
  })

  it('reads naturally in Korean and Vietnamese', () => {
    render(createElement(MadeByLine, { lang: 'ko' }))
    expect(host.textContent).toBe(strings.ko.homeMadeBy.replace('{name}', 'TenAI'))
    render(createElement(MadeByLine, { lang: 'vi' }))
    expect(host.textContent).toBe('Sản phẩm của TenAI')
  })
})
