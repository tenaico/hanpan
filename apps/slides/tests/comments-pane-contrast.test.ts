// 메모 창의 안내 글("아래에 입력하세요…")과 입력칸 예시 글이 읽힐 만큼 진하다(0.17 점검 v2 slides-mindmap #38).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src/renderer/styles.css'),
  'utf8',
)

describe('comments pane hint contrast', () => {
  it('the empty-state hint uses a text colour, not a border colour', () => {
    const rule = /\.comments-empty-sub \{([^}]*)\}/.exec(css)![1]!
    expect(rule).toMatch(/color: var\(--text-secondary\);/)
    expect(rule).not.toMatch(/--border/)
  })
  it('the new-comment placeholder is a readable secondary text colour', () => {
    expect(css).toMatch(
      /\.comment-new textarea::placeholder \{[^}]*color: var\(--text-secondary\);/s,
    )
  })
})
