// 디자인 탭 테마 갤러리: 적용한 테마에 선택 테두리, 넓은 창에서는 모두 펼치기, 어두운 앱에서도
// 카드 테두리가 보이게(0.17 점검 v2 slides-mindmap #35).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')
const css = read('src/renderer/styles.css')
const ribbon = read('src/renderer/components/Ribbon.tsx')

describe('theme gallery', () => {
  it('marks the theme applied in this session', () => {
    expect(ribbon).toMatch(
      /className=\{`theme-card\$\{appliedThemeId === tp\.id \? ' active' : ''\}`\}/,
    )
    expect(ribbon).toMatch(/aria-pressed=\{appliedThemeId === tp\.id\}/)
    expect(css).toMatch(/\.theme-card\.active \{[^}]*border-color: var\(--accent\);/s)
  })
  it('grows with the window instead of a fixed 560px strip', () => {
    const rule = /\.theme-gallery \{([^}]*)\}/.exec(css)![1]!
    expect(rule).toMatch(/max-width: min\(660px, 45vw\);/)
  })
  it('card edges use the strong border token (visible on the dark ribbon)', () => {
    const rule = /\n\.theme-card \{([^}]*)\}/.exec(css)![1]!
    expect(rule).toMatch(/border: 1px solid var\(--border-strong\);/)
  })
})
