// "새 슬라이드"는 자리 표시자가 있는 슬라이드를 넣는다: 제목 슬라이드 다음은 "제목 및 내용",
// 그 밖에는 지금 슬라이드와 같은 레이아웃(PowerPoint와 같게). 레이아웃 메뉴가 열려 있는 동안
// 단추 툴팁이 메뉴 머리를 가리지 않는다(0.17 점검 v2 slides-mindmap #10).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { newSlideLayoutPath } from '../src/shared/new-slide-layout'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

const ph = [{}]
const layouts = [
  { path: 'ppt/slideLayouts/slideLayout1.xml', layoutType: 'title', placeholders: ph },
  { path: 'ppt/slideLayouts/slideLayout2.xml', layoutType: 'blank', placeholders: [] },
  { path: 'ppt/slideLayouts/slideLayout3.xml', layoutType: 'secHead', placeholders: ph },
  { path: 'builtin:titleContent', layoutType: 'obj', placeholders: ph },
]

describe('newSlideLayoutPath', () => {
  it('after a title slide: Title and Content', () => {
    expect(newSlideLayoutPath(layouts, 'ppt/slideLayouts/slideLayout1.xml')).toBe(
      'builtin:titleContent',
    )
  })
  it('the deck’s own Title and Content wins over the built-in one', () => {
    const own = { path: 'ppt/slideLayouts/slideLayout9.xml', layoutType: 'obj', placeholders: ph }
    expect(newSlideLayoutPath([...layouts.slice(0, 3), own, layouts[3]!], layouts[0]!.path)).toBe(
      own.path,
    )
  })
  it('after any other slide with placeholders: the same layout', () => {
    expect(newSlideLayoutPath(layouts, 'ppt/slideLayouts/slideLayout3.xml')).toBe(
      'ppt/slideLayouts/slideLayout3.xml',
    )
  })
  it('after a blank slide: a blank slide (null keeps the old insert)', () => {
    expect(newSlideLayoutPath(layouts, 'ppt/slideLayouts/slideLayout2.xml')).toBeNull()
  })
  it('a title slide in a deck without any content layout: null', () => {
    expect(newSlideLayoutPath(layouts.slice(0, 3), layouts[0]!.path)).toBeNull()
  })
})

describe('wiring', () => {
  it('the New Slide button asks main for a slide with placeholders', () => {
    const src = read('src/renderer/slide-actions.ts')
    const fn = src.slice(
      src.indexOf('export async function addSlide('),
      src.indexOf('export async function addSlideAt('),
    )
    expect(fn).toMatch(/withPlaceholders: true/)
  })
  it('main picks the layout with newSlideLayoutPath', () => {
    const src = read('src/main/slides-main.ts')
    const handler = src.slice(
      src.indexOf("'slides:add-blank-slide'"),
      src.indexOf("'slides:add-slide-with-layout'"),
    )
    expect(handler).toMatch(/newSlideLayoutPath\(/)
  })
  it('the layout menu hides the split button tips while open', () => {
    for (const f of ['RibbonHomeTab.tsx', 'RibbonInsertTab.tsx']) {
      const src = read(`src/renderer/components/${f}`)
      expect(src, f).toMatch(
        /data-tip=\{layoutOpen \? undefined : platformShortcuts\(t\('ribbonNewSlideTip'\)\)\}/,
      )
      expect(src, f).toMatch(/data-tip=\{layoutOpen \? undefined : t\('ribbonChooseLayoutNew'\)\}/)
    }
  })
})
