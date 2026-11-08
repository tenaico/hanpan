/**
 * 디자인 보드의 화면 속 "파일" 메뉴(0.17 리뷰 #8): 다른 편집기의 파일 메뉴처럼
 * 새로 만들기·열기·저장·다른 이름으로 저장·내보내기·인쇄를 한곳에 모은다.
 * 글자는 보드의 다른 글자와 같이 words/ 표(fileMenu)에서 읽는다(점검 v2 hwp-design #18).
 */
import { useEffect, useRef, useState } from 'react'
import { wordsFor } from './words'

export interface DesignFileActions {
  newDesign(): void
  open(): void
  save(): void
  saveAs(): void
  exportPng(): void
  exportJpg(): void
  exportPdf(): void
  print(): void
}

type Item = keyof DesignFileActions | 'sep'
const KEYS: Partial<Record<keyof DesignFileActions, string>> = {
  save: 'Ctrl+S',
  saveAs: 'Ctrl+Shift+S',
  print: 'Ctrl+P',
}

export function DesignFileMenu(p: { lang: string; actions: DesignFileActions; canPrint: boolean }) {
  const w = wordsFor(p.lang).fileMenu
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const items: Item[] = [
    'newDesign',
    'open',
    'sep',
    'save',
    'saveAs',
    'sep',
    'exportPng',
    'exportJpg',
    'exportPdf',
    ...(p.canPrint ? (['sep', 'print'] as Item[]) : []),
  ]

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const away = (event: MouseEvent) => {
      const t = event.target as Node
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const list = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
    ]
    const at = list.indexOf(document.activeElement as HTMLButtonElement)
    const next = (at + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
    list[next]?.focus()
  }

  return (
    <div className="dz-file">
      <button
        ref={buttonRef}
        type="button"
        className="dz-file-button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-action="design-file"
        onClick={() => setOpen((o) => !o)}
      >
        {w.file}
      </button>
      {open && (
        <div className="dz-file-menu" role="menu" ref={menuRef} onKeyDown={onKeyDown}>
          {items.map((id, i) =>
            id === 'sep' ? (
              <hr key={`sep${i}`} />
            ) : (
              <button
                key={id}
                type="button"
                role="menuitem"
                data-file-item={id}
                onClick={() => {
                  setOpen(false)
                  p.actions[id]()
                }}
              >
                <span>{w[id]}</span>
                {KEYS[id] && <kbd>{KEYS[id]}</kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
