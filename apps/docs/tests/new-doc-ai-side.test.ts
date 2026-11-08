// 새 문서 안내는 AI 패널 위치를 맞게 말해야 한다: 패널은 오른쪽에 있다(0.17 리뷰 #10)
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/renderer/i18n/app')
const LEFT =
  /왼쪽|on the left|links|left|gauche|izquierda|esquerda|sinistra|vlevo|po lewej|слева|左側|左侧|左側|बाईं|kiri|ซ้าย|bên trái|يسار|משמאל/i

function entry(file: string): string {
  const src = readFileSync(join(dir, file), 'utf8')
  const m = /appNewDocCreated:\s*\n?\s*(['"])(.*?)\1/s.exec(src)
  if (!m) throw new Error(`appNewDocCreated missing in ${file}`)
  return m[2]!
}

describe('appNewDocCreated', () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    it(`${file} does not place the AI panel on the left`, () => {
      expect(entry(file)).not.toMatch(LEFT)
    })
  }
  it('ko names the right side and stays short enough for the status bar', () => {
    const ko = entry('ko.ts')
    expect(ko).toContain('오른쪽')
    expect(ko.length).toBeLessThanOrEqual(40)
  })
})
