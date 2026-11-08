// 1366 폭(AI 창 열림)이나 긴 베트남어에서 삽입 탭 단추가 화면 밖으로 나가지 않도록, 폭이 모자라면
// 오른쪽 그룹부터 "그룹 이름 ▾" 단추 하나로 접는다(오피스식 축소, 0.17 점검 v2 slides-mindmap #6).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

const FOLDABLE = ['media', 'text', 'illustrations', 'images', 'links']

describe('insert tab responsive folding', () => {
  it('the insert tab has a fold order, rightmost groups first', () => {
    const src = read('src/renderer/components/Ribbon.tsx')
    const order = /insert: \[([^\]]*)\]/.exec(src.slice(src.indexOf('const COLLAPSE_ORDER')))
    expect(order).not.toBeNull()
    expect(order![1]!.match(/'(\w+)'/g)!.map((s) => s.slice(1, -1))).toEqual(FOLDABLE)
  })

  it('every foldable insert group carries its id and the collapse props', () => {
    const src = read('src/renderer/components/RibbonInsertTab.tsx')
    for (const id of FOLDABLE) {
      expect(src, id).toMatch(new RegExp(`groupId="${id}"\\s+collapse=\\{fold\\('${id}'`))
    }
  })
})
