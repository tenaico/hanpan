// 이미 선택된 탭을 한 번 더 눌러도 리본이 접히지 않는다. 접기는 두 번 클릭·˄ 단추·Ctrl+F1로만,
// 접힌 동안은 탭 줄에 ˅ 펼치기 단추가 보인다(0.17 점검 v2 slides-mindmap #9).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ribbonStrings } from '../src/renderer/i18n/strings-ribbon'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'src/renderer/components/Ribbon.tsx'), 'utf8')

describe('slides ribbon tab press', () => {
  it('a single press on the selected tab never collapses (only expands a collapsed band)', () => {
    expect(src).not.toMatch(/collapse\.onTabPress\(tab === /)
    expect(src.match(/collapse\.onTabPress\(false\)/g)?.length).toBe(2)
  })
  it('double-click on the tab row still toggles', () => {
    expect(src).toMatch(/onDoubleClick=\{collapse\.onTabsDoubleClick\}/)
  })
  it('a ˄ button collapses and a ˅ button shows the collapsed state', () => {
    expect(src).toMatch(
      /<RibbonCollapseButton state=\{collapse\} label=\{t\('ribbonCollapse'\)\} \/>/,
    )
    expect(src).toMatch(/<RibbonExpandButton state=\{collapse\} label=\{t\('ribbonExpand'\)\} \/>/)
  })
  it('the selected tab tip tells how to collapse', () => {
    expect(src).toMatch(/t\('ribbonTabCollapseTip'/)
    const ko = (ribbonStrings as unknown as Record<string, Record<string, string>>).ko!
    expect(ko.ribbonTabCollapseTip).toContain('두 번')
  })
})
