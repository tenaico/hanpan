// 화면 안 파일 메뉴는 Esc로 닫혀야 한다(엑셀·한글과 같게, 0.17 리뷰 #7).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useEscapeToClose } from '../src/renderer/components/use-escape-close'

const here = dirname(fileURLToPath(import.meta.url))

function Harness() {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLButtonElement>(null)
  useEscapeToClose(open, () => setOpen(false), ref)
  return createElement(
    'div',
    null,
    createElement('button', { ref, id: 'trigger' }, '파일'),
    open ? createElement('div', { className: 'file-menu' }) : null,
  )
}

describe('파일 메뉴 Esc', () => {
  let root: Root
  let container: HTMLElement
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('Esc closes the menu and focuses the trigger', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(createElement(Harness)))
    expect(container.querySelector('.file-menu')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('.file-menu')).toBeNull()
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('the ribbon wires the file menu to it', () => {
    const src = readFileSync(join(here, '..', 'src/renderer/components/Ribbon.tsx'), 'utf8')
    expect(src).toMatch(/useEscapeToClose\(fileOpen,/)
  })
})

describe('파일 메뉴 모양 (0.17 리뷰 #16)', () => {
  const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')
  it('lists exports before 인쇄, like the Word file menu', () => {
    const src = read('src/renderer/components/Ribbon.tsx')
    const menu = src.slice(src.indexOf('<div className="file-menu">'))
    expect(menu.indexOf("t('ribbonFileExportImages')")).toBeGreaterThan(0)
    expect(menu.indexOf("t('ribbonFileExportImages')")).toBeLessThan(
      menu.indexOf("t('ribbonFilePrint')"),
    )
  })
  it('never wraps a label onto two lines', () => {
    expect(read('src/renderer/styles.css')).toMatch(
      /\.file-menu button \{[^}]*white-space: nowrap;/s,
    )
  })
})
