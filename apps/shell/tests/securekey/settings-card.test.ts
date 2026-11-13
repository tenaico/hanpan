/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeApi, SecureKeyAction, SecureKeySettings } from '../../src/shared/home-api'
import { SecureKeySettingsCard } from '../../src/renderer/src/SecureKeySettingsCard'

/** Settings › General › Security key (spec 2026-11-12 5-5) */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const strings: Record<string, string> = {
  skSettingsTitle: 'Security key',
  skSettingsOnUsb: 'On a USB stick',
  skSettingsOnPc: 'On this PC',
  skSettingsMade: 'Made on 2026. 11. 20.',
  skSettingsSticks: '1 registered stick(s)',
  skUsbDrive: 'USB stick ({letter}:)',
  skNoUsb: 'No USB stick is plugged in.',
  skPickUsbFor: 'Stick to use',
  skSpare: 'Make a spare stick',
  skMoveToUsb: 'Move to a USB stick',
  skMoveToPc: 'Move to this PC',
  skNewKey: 'Make a new key',
  skPcWarn: 'Kept on this PC…',
  skPcAgree: 'I understand…',
  skReset1: 'Docs stay.',
  skReset2: 'API keys are deleted.',
  skReset3: 'Sign-ins stay.',
  skReset4: 'Old stick stops working.',
  skResetRestart: 'Hanpan restarts.',
  skResetAgree: 'I understand my API keys will be deleted.',
  skResetGo: 'Make a new key',
  skCancel: 'Cancel',
  skDone: 'Done.',
}

let host: HTMLDivElement
let root: Root
let info: SecureKeySettings | null
let secureKeyAct: ReturnType<
  typeof vi.fn<
    (action: SecureKeyAction, letter?: string, agreed?: boolean) => Promise<string | null>
  >
>

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  info = {
    where: 'usb',
    createdAt: '2026-11-20T00:00:00.000Z',
    sticks: 1,
    usbLetters: ['E', 'F'],
    strings,
  }
  secureKeyAct = vi.fn(async () => null)
  window.aiOffice = {
    secureKeyInfo: async () => info,
    secureKeyAct,
  } as unknown as HomeApi
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function render(): Promise<void> {
  await act(async () => {
    root.render(createElement(SecureKeySettingsCard, { lang: 'en' }))
  })
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const button = (text: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === text) as
    HTMLButtonElement | undefined

async function click(el: Element | undefined): Promise<void> {
  expect(el).toBeTruthy()
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

describe('SecureKeySettingsCard', () => {
  it('renders nothing without a key in use', async () => {
    info = null
    await render()
    expect(host.querySelector('[data-securekey-settings]')).toBeNull()
  })

  it('shows a stick key with its date and count, and makes a spare on the first stick', async () => {
    await render()
    expect(host.textContent).toContain('On a USB stick')
    expect(host.textContent).toContain('Made on 2026. 11. 20.')
    expect(host.textContent).toContain('1 registered stick(s)')
    await click(button('Make a spare stick'))
    expect(secureKeyAct).toHaveBeenCalledWith('spare', 'E', false)
    expect(host.textContent).toContain('Done.')
  })

  it('a PC key offers "move to a stick" and no "move to this PC"', async () => {
    info = { ...info!, where: 'pc', sticks: 0 }
    await render()
    expect(host.textContent).toContain('On this PC')
    expect(button('Move to this PC')).toBeUndefined()
    await click(button('Move to a USB stick'))
    expect(secureKeyAct).toHaveBeenCalledWith('to-usb', 'E', false)
  })

  it('without a stick plugged in, the stick action is off', async () => {
    info = { ...info!, usbLetters: [] }
    await render()
    expect(host.textContent).toContain('No USB stick is plugged in.')
    expect(button('Make a spare stick')?.disabled).toBe(true)
  })

  it('moving to this PC needs the risk box ticked', async () => {
    await render()
    await click(button('Move to this PC'))
    expect(host.textContent).toContain('Kept on this PC…')
    const go = () =>
      host.querySelector('[data-securekey-confirm] .set-btn.primary') as HTMLButtonElement
    expect(go().disabled).toBe(true)
    await click(host.querySelector('[data-securekey-confirm] input[type=checkbox]')!)
    expect(go().disabled).toBe(false)
    await click(go())
    expect(secureKeyAct).toHaveBeenCalledWith('to-pc', 'E', true)
  })

  it('a new key lists what happens and needs the box ticked', async () => {
    await render()
    await click(button('Make a new key'))
    for (const line of [
      'Docs stay.',
      'API keys are deleted.',
      'Old stick stops working.',
      'Hanpan restarts.',
    ]) {
      expect(host.textContent).toContain(line)
    }
    const go = () =>
      host.querySelector('[data-securekey-confirm] .set-btn.primary') as HTMLButtonElement
    expect(go().disabled).toBe(true)
    await click(host.querySelector('[data-securekey-confirm] input[type=checkbox]')!)
    await click(go())
    expect(secureKeyAct).toHaveBeenCalledWith('reset', 'E', true)
  })

  it('cancel goes back without acting', async () => {
    await render()
    await click(button('Make a new key'))
    await click(button('Cancel'))
    expect(secureKeyAct).not.toHaveBeenCalled()
    expect(button('Make a spare stick')).toBeTruthy()
  })

  it('shows the error line the main process returns', async () => {
    secureKeyAct.mockResolvedValueOnce('This stick is already registered.')
    await render()
    await click(button('Make a spare stick'))
    expect(host.querySelector('.set-securekey-error')?.textContent).toBe(
      'This stick is already registered.',
    )
  })
})
