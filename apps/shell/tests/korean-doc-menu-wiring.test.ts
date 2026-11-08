// The app menus offer a new HWP document only while Hanpan's Korean document
// features are on (decision 0091); read from src/main/index.ts as text.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readIndex = () => readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')

describe('New HWP menu items and the Korean document features switch', () => {
  it('every New HWP menu item sits behind the Korean switch', () => {
    const src = readIndex()
    expect(src.match(/tm\('menuNewHwp'\)/g)).toHaveLength(2)
    expect(src.match(/koreanDocsOn\(\)\s*\?\s*\[\s*\{\s*label: tm\('menuNewHwp'\)/g)).toHaveLength(
      2,
    )
  })
})
