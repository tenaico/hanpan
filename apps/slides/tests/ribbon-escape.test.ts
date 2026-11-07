// Esc가 리본의 모든 드롭다운, 배경 서식 창, 슬라이드 마스터 보기를 닫는다(0.17 점검 v2 slides-mindmap #8).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bgPaneClosesOnEscape, masterEscapeAction } from '../src/renderer/escape-targets'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

describe('리본 드롭다운 Esc', () => {
  it('every open ribbon popup (chart, SmartArt, zoom, translate …) closes on Esc', () => {
    const src = read('src/renderer/components/Ribbon.tsx')
    // one handler for the whole popup set, so a new dropdown cannot miss it
    expect(src).toMatch(
      /useEscOverlay\(anyPanelOpen \|\| penFlyout != null, \(\) => closePanels\(\)\)/,
    )
    // the insert galleries (chart/SmartArt/zoom) and translate are part of that set
    const any = src.slice(
      src.indexOf('const anyPanelOpen ='),
      src.indexOf('useDismissablePopover('),
    )
    expect(any).toContain('insertDrop != null')
    expect(any).toContain('translateOpen')
    expect(any).toContain('chartDrop != null')
  })
})

describe('슬라이드 마스터 보기 Esc', () => {
  const base = { editing: false, drawing: false, shapesOpen: false, menuOpen: false, selected: 0 }
  it('closes the view when nothing else is in progress', () => {
    expect(masterEscapeAction(base)).toBe('close')
  })
  it('first closes the shapes dropdown, then clears the selection', () => {
    expect(masterEscapeAction({ ...base, shapesOpen: true, selected: 2 })).toBe('closeShapes')
    expect(masterEscapeAction({ ...base, selected: 2 })).toBe('deselect')
  })
  it('leaves Esc to text editing, draw mode and the context menu', () => {
    expect(masterEscapeAction({ ...base, editing: true })).toBe('none')
    expect(masterEscapeAction({ ...base, drawing: true })).toBe('none')
    expect(masterEscapeAction({ ...base, menuOpen: true })).toBe('none')
  })
  it('MasterView wires it to onClose', () => {
    const src = read('src/renderer/MasterView.tsx')
    expect(src).toMatch(/masterEscapeAction\(/)
    expect(src).toMatch(/case 'close':\s*onClose\(\)/)
  })
})

describe('배경 서식 창 Esc', () => {
  const base = { inPane: false, editing: false, selected: 0, defaultPrevented: false }
  it('closes when focus is inside the pane', () => {
    expect(bgPaneClosesOnEscape({ ...base, inPane: true, selected: 3 })).toBe(true)
  })
  it('closes from the canvas only when Esc has nothing else to undo', () => {
    expect(bgPaneClosesOnEscape(base)).toBe(true)
    expect(bgPaneClosesOnEscape({ ...base, selected: 1 })).toBe(false)
    expect(bgPaneClosesOnEscape({ ...base, editing: true })).toBe(false)
    expect(bgPaneClosesOnEscape({ ...base, defaultPrevented: true })).toBe(false)
  })
  it('App wires it to the pane', () => {
    expect(read('src/renderer/App.tsx')).toMatch(/bgPaneClosesOnEscape\(/)
  })
})
