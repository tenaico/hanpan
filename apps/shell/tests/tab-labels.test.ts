import { describe, expect, it } from 'vitest'
import { tabLabels } from '../src/renderer/src/tab-labels'
import type { TabSummary } from '../src/shared/tabs-api'

// 0.17 리뷰 #15: 제목 없는 탭 11개가 모두 "제목…"으로 보여 구별되지 않았고, 확장자 표기가
// 들쭉날쭉했다. 같은 이름은 번호로 나누고, 번호(와 그 뒤 확장자)는 말줄임에 잘리지 않는 꼬리로 둔다.
// 저장된 파일은 파일 이름 그대로(확장자 포함) 보인다.
const tab = (id: string, title: string, extra: Partial<TabSummary> = {}): TabSummary => ({
  id,
  kind: 'docs',
  title,
  closable: true,
  active: false,
  ...extra,
})

const text = (l: { base: string; tail: string; ext: string }) => l.base + l.tail + l.ext

describe('tab labels', () => {
  it('numbers tabs that would read the same, keeping the number out of the ellipsis', () => {
    const labels = tabLabels([
      tab('a', '제목 없는 문서'),
      tab('b', '제목 없는 문서'),
      tab('c', '제목 없는 문서'),
      tab('d', '제목 없는 프레젠테이션', { kind: 'slides' }),
    ])
    expect(labels.get('a')).toEqual({ base: '제목 없는 문서', tail: '', ext: '' })
    expect(labels.get('b')).toEqual({ base: '제목 없는 문서', tail: ' 2', ext: '' })
    expect(labels.get('c')).toEqual({ base: '제목 없는 문서', tail: ' 3', ext: '' })
    expect(labels.get('d')).toEqual({ base: '제목 없는 프레젠테이션', tail: '', ext: '' })
  })

  it('keeps a number the name already has in the tail; its extension gives way first when narrow', () => {
    const labels = tabLabels([
      tab('s', '제목 없는 스프레드시트 2.xlsx', {
        kind: 'sheets',
        filePath: 'C:\\Docs\\제목 없는 스프레드시트 2.xlsx',
      }),
      tab('p', 'PDF-3.pdf', { kind: 'pdf', filePath: 'C:\\Docs\\PDF-3.pdf' }),
    ])
    expect(labels.get('s')).toEqual({ base: '제목 없는 스프레드시트', tail: ' 2', ext: '.xlsx' })
    expect(labels.get('p')).toEqual({ base: 'PDF', tail: '-3', ext: '.pdf' })
  })

  it('shows a saved file by its file name, extension included, like every other saved tab', () => {
    const labels = tabLabels([
      tab('w', 'TEST-WORD', { filePath: 'C:\\Docs\\TEST-WORD.docx' }),
      tab('x', 'budget.xlsx', { kind: 'sheets', filePath: '/home/me/budget.xlsx' }),
      // a title the app chose that is not the file's name stays as it is
      tab('m', '회의 정리', { kind: 'mindmap', filePath: 'C:\\Docs\\map.xmind' }),
    ])
    expect(text(labels.get('w')!)).toBe('TEST-WORD.docx')
    expect(text(labels.get('x')!)).toBe('budget.xlsx')
    expect(text(labels.get('m')!)).toBe('회의 정리')
  })

  it('leaves Home and a lone name alone', () => {
    const labels = tabLabels([tab('home', '한판', { kind: 'home' }), tab('a', '보고서')])
    expect(labels.get('home')).toEqual({ base: '한판', tail: '', ext: '' })
    expect(labels.get('a')).toEqual({ base: '보고서', tail: '', ext: '' })
  })
})
