// 접힌 그룹("애니메이션 ▾")의 펼침 창은 여러 줄로 감싸 창 밖으로 나가지 않고,
// 개체를 고르지 않았으면 "먼저 개체를 선택하세요"를 보여 준다(0.17 점검 v2 slides-mindmap #7).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Group } from '../src/renderer/components/ribbon-shared'
import { ribbonStrings } from '../src/renderer/i18n/strings-ribbon'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

describe('folded group flyout', () => {
  it('wraps into rows that stay inside the window', () => {
    const css = read('src/renderer/styles.css')
    const rule = /\.rb-collapse-panel \{([^}]*)\}/.exec(css)![1]!
    expect(rule).toMatch(/flex-wrap: wrap;/)
    expect(rule).toMatch(/max-width: min\(/)
  })

  it('shows the hint above the effects when one is given', () => {
    const html = renderToStaticMarkup(
      createElement(Group, {
        label: '애니메이션',
        collapse: {
          collapsed: true,
          open: true,
          onToggle: () => {},
          icon: null,
          hint: '먼저 개체를 선택하세요',
        },
        children: createElement('button', null, 'x'),
      }),
    )
    expect(html).toMatch(/class="rb-collapse-hint"[^>]*>먼저 개체를 선택하세요</)
  })

  it('the animation and motion-path groups pass the hint while nothing is selected', () => {
    const src = read('src/renderer/components/Ribbon.tsx')
    expect(
      src.match(/hint: hasSelection \? undefined : t\('ribbonAnimSelectFirst'\)/g)?.length,
    ).toBe(2)
    const ko = (ribbonStrings as unknown as Record<string, Record<string, string>>).ko!
    expect(ko.ribbonAnimSelectFirst).toBe('먼저 애니메이션을 넣을 개체를 선택하세요')
  })
})
