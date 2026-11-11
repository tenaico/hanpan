import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ExportDialog } from '../src/renderer/quick/ExportDialog'
import { QuickBar } from '../src/renderer/quick/QuickBar'
import { LocaleProvider } from '../src/renderer/i18n/locale'
import { installGraphicsApi } from '../src/renderer/bridge'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  host?.remove()
  host = null
  installGraphicsApi(null)
})

async function render(node: React.ReactNode): Promise<HTMLElement> {
  installGraphicsApi({ onLanguageChanged: () => () => {} } as never)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root!.render(<LocaleProvider initial="en">{node}</LocaleProvider>))
  return host
}

function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ExportDialog', () => {
  it('fills the picture size and keeps the ratio when the width changes', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 1000, height: 500 }} onDone={onDone} />,
    )
    const width = el.querySelector('input[name="width"]') as HTMLInputElement
    const height = el.querySelector('input[name="height"]') as HTMLInputElement
    expect(width.value).toBe('1000')
    expect(height.value).toBe('500')
    await act(async () => type(width, '500'))
    expect(height.value).toBe('250')
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'png', width: 500, height: 250 })
  })

  it('offers PNG and SVG for an illustration, and no size for SVG', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="illust" size={{ width: 800, height: 600 }} onDone={onDone} />,
    )
    const formats = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-format]'))
    expect(formats.map((b) => b.dataset.format)).toEqual(['png', 'svg'])
    expect(formats[0]!.getAttribute('aria-checked')).toBe('true')
    await act(async () => formats[1]!.click())
    expect(formats[1]!.getAttribute('aria-checked')).toBe('true')
    expect(el.querySelector('input[name="width"]')).toBeNull()
    expect(el.querySelector('[data-scale]')).toBeNull()
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'svg' })
  })

  // 0.17 UX v2 G5: 비율 잠금, JPG 품질, 배율 프리셋
  it('the ratio lock can be let go: then width and height change apart', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 1000, height: 500 }} onDone={onDone} />,
    )
    const lock = el.querySelector('[data-action="export-ratio"]') as HTMLButtonElement
    expect(lock.getAttribute('aria-pressed')).toBe('true')
    await act(async () => lock.click())
    expect(lock.getAttribute('aria-pressed')).toBe('false')
    const width = el.querySelector('input[name="width"]') as HTMLInputElement
    const height = el.querySelector('input[name="height"]') as HTMLInputElement
    await act(async () => type(width, '300'))
    expect(height.value).toBe('500')
    await act(async () => type(height, '120'))
    expect(width.value).toBe('300')
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'png', width: 300, height: 120 })
  })

  it('JPG asks for a quality and answers it from 0 to 1', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 100, height: 100 }} onDone={onDone} />,
    )
    expect(el.querySelector('input[name="quality"]')).toBeNull()
    await act(async () => (el.querySelector('[data-format="jpg"]') as HTMLElement).click())
    const quality = el.querySelector('input[name="quality"]') as HTMLInputElement
    expect(quality.value).toBe('90')
    await act(async () => type(quality, '70'))
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'jpg', width: 100, height: 100, quality: 0.7 })
  })

  it('an illustration offers 1x, 2x and print size (300 dpi from the 72 dpi page)', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="illust" size={{ width: 595, height: 842 }} onDone={onDone} />,
    )
    const scales = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-scale]'))
    expect(scales.map((b) => b.dataset.scale)).toEqual(['1', '2', 'print'])
    expect(scales[0]!.getAttribute('aria-pressed')).toBe('true')
    await act(async () => scales[2]!.click())
    expect((el.querySelector('input[name="width"]') as HTMLInputElement).value).toBe('2479')
    expect((el.querySelector('input[name="height"]') as HTMLInputElement).value).toBe('3508')
    expect(scales[2]!.getAttribute('aria-pressed')).toBe('true')
    await act(async () => scales[1]!.click())
    await act(async () => (el.querySelector('[data-action="export-ok"]') as HTMLElement).click())
    expect(onDone).toHaveBeenCalledWith({ format: 'png', width: 1190, height: 1684 })
  })

  it('a photo offers half, the own size and double', async () => {
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 1200, height: 800 }} onDone={() => {}} />,
    )
    const scales = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-scale]'))
    expect(scales.map((b) => b.dataset.scale)).toEqual(['0.5', '1', '2'])
    await act(async () => scales[0]!.click())
    expect((el.querySelector('input[name="width"]') as HTMLInputElement).value).toBe('600')
    expect((el.querySelector('input[name="height"]') as HTMLInputElement).value).toBe('400')
  })

  it('shows no English or key text in Korean', async () => {
    installGraphicsApi({ onLanguageChanged: () => () => {} } as never)
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () =>
      root!.render(
        <LocaleProvider initial="ko">
          <ExportDialog kind="photo" size={{ width: 10, height: 10 }} onDone={() => {}} />
        </LocaleProvider>,
      ),
    )
    const text = host.textContent ?? ''
    expect(text).toContain('비율 유지')
    expect(text.replace(/PNG|JPG|px|dpi/g, '')).not.toMatch(/[A-Za-z]{3,}/)
  })

  it('cancel answers null', async () => {
    const onDone = vi.fn()
    const el = await render(
      <ExportDialog kind="photo" size={{ width: 10, height: 10 }} onDone={onDone} />,
    )
    await act(async () =>
      (el.querySelector('[data-action="export-cancel"]') as HTMLElement).click(),
    )
    expect(onDone).toHaveBeenCalledWith(null)
  })
})

describe('QuickBar', () => {
  it('shows the buttons of the app, with the .ai copy for Illustrator last', async () => {
    const el = await render(<QuickBar kind="illust" disabled={false} onRun={() => {}} />)
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'Trace image',
      'Center on artboard',
      'Export PNG or SVG',
      'Send .ai to Illustrator',
    ])
  })

  it('quick actions are disabled while the AI runs', async () => {
    const onRun = vi.fn()
    const el = await render(<QuickBar kind="photo" disabled onRun={onRun} />)
    const buttons = Array.from(el.querySelectorAll('button'))
    expect(buttons).toHaveLength(3)
    expect(buttons.every((b) => b.disabled)).toBe(true)
    await act(async () => buttons[0]!.click())
    expect(onRun).not.toHaveBeenCalled()
  })

  // 0.17 UX v2 G11: 마우스로 누른 단추에 포커스가 남아 눌린 것처럼 보이지 않게 한다
  it('a mouse click leaves no focus on the button; a key press keeps it', async () => {
    const onRun = vi.fn()
    const el = await render(<QuickBar kind="photo" disabled={false} hasDocument onRun={onRun} />)
    const button = el.querySelector('button') as HTMLButtonElement
    button.focus()
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(onRun).toHaveBeenCalledWith('removeBackground')
    expect(document.activeElement).not.toBe(button)

    button.focus()
    await act(async () => {
      // Enter or Space on a focused button: a click with detail 0
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    })
    expect(document.activeElement).toBe(button)
  })
})
