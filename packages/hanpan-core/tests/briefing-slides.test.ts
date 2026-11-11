import { describe, expect, it } from 'vitest'
import { figureIn } from '../src/slide-styles'
import { outlineToSlides } from '../src/slides'

describe('the key figure of a slide', () => {
  it('keeps a counter after a large unit with the number', () => {
    expect(figureIn('AI Big 5 흐림: ChatGPT 주간 12억 명, 1강 2중 2약')).toEqual({
      value: '12억 명',
      label: 'AI Big 5 흐림: ChatGPT 주간, 1강 2중 2약',
    })
  })

  it('labels a long paragraph with the sentence that holds the figure', () => {
    const f = figureIn(
      '반도체는 맑음입니다. 9월 반도체 수출은 603억달러로 전년보다 262.8% 늘었습니다. 엔비디아 악재 속에서도 HBM이 메모리 호황을 떠받친다는 분석이 나왔습니다.',
    )
    expect(f?.value).toBe('603억달러')
    expect(f?.label).toBe('9월 반도체 수출은 전년보다 262.8% 늘었습니다.')
  })

  it('still reads a short line as before', () => {
    expect(figureIn('매출 30% 증가')).toEqual({ value: '30%', label: '매출 증가' })
  })
})

describe('a source line on a slide', () => {
  it('drops a web address written at the end of a title', () => {
    const slides = outlineToSlides({
      title: 't',
      rootKey: 'r',
      nodes: [
        {
          key: 'refs',
          title: '참고 자료',
          children: [
            {
              key: 'x',
              title:
                '[14] 코스피 상승 마감 — 동아일보, 2026-11-11 https://news.example.com/rss/a/CBMi',
              children: [],
            },
          ],
        },
      ],
    })
    expect(slides[1]!.paragraphs[0]!.text).toBe('[14] 코스피 상승 마감 — 동아일보, 2026-11-11')
  })
})

describe('long hostile text', () => {
  const quick = (run: () => unknown) => {
    const start = performance.now()
    run()
    return performance.now() - start
  }
  const tabs = 'a' + '\t'.repeat(40_000) + 'b'

  it('reads a figure, a slide line and a source line in linear time', async () => {
    const { outlineToBlocks } = await import('../src/blocks')
    const { plainInline } = await import('../src/markdown-blocks')
    expect(quick(() => figureIn(`매출 30% ${tabs}`))).toBeLessThan(200)
    const outline = {
      title: 't',
      rootKey: 'r',
      nodes: [{ key: 'a', title: tabs, children: [{ key: 'b', title: tabs, children: [] }] }],
    }
    expect(quick(() => outlineToSlides(outline))).toBeLessThan(200)
    expect(quick(() => outlineToBlocks(outline, { style: 'chapter-report' }))).toBeLessThan(200)
    expect(quick(() => plainInline('!['.repeat(20_000)))).toBeLessThan(200)
    expect(quick(() => plainInline('![]('.repeat(20_000)))).toBeLessThan(200)
    expect(quick(() => plainInline('['.repeat(20_000) + ']('))).toBeLessThan(200)
  })
})
