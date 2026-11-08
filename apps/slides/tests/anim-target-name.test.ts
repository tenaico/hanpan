// 애니메이션 창 항목 이름: 내부 이름 "Title 1" 대신 번역한 종류 이름과 글 첫머리(0.17 UX v2 #27)
import { describe, expect, it } from 'vitest'
import { animTargetName } from '../src/main/anim-target-name'

const labels = {
  title: '제목',
  subtitle: '부제목',
  text: '텍스트 상자',
  shape: '도형',
  picture: '그림',
  table: '표',
  chart: '차트',
  group: '그룹',
  object: '개체',
}
const para = (text: string) => ({ runs: [{ text }] })

describe('animTargetName', () => {
  it('a title placeholder with text reads 제목 1: <text>', () => {
    const el = {
      type: 'text',
      name: 'Title 1',
      placeholder: 'title',
      text: { paragraphs: [para('2026년 4분기 영업 보고')] },
    }
    expect(animTargetName(el, labels)).toBe('제목 1: 2026년 4분기 영업 보고')
  })
  it('long text is cut with an ellipsis', () => {
    const el = { type: 'shape', name: 'Rectangle 3', text: { paragraphs: [para('가'.repeat(40))] } }
    expect(animTargetName(el, labels)).toBe(`도형 3: ${'가'.repeat(20)}…`)
  })
  it('a picture without text keeps a translated default name', () => {
    expect(animTargetName({ type: 'picture', name: 'Picture 4' }, labels)).toBe('그림 4')
  })
  it('a name the user gave stays as written', () => {
    expect(animTargetName({ type: 'picture', name: '회사 로고' }, labels)).toBe('회사 로고')
  })
  it('no name: type label', () => {
    expect(animTargetName({ type: 'chart' }, labels)).toBe('차트')
  })
})
