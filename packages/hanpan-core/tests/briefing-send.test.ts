import { describe, expect, it } from 'vitest'
import { outlineToBlocks } from '../src/blocks'
import { checkSendRequest } from '../src/send'
import { fleshOutJobs } from '../src/flesh-out'
import type { PanOutline } from '../src/outline'

/** The shape of a trend briefing map sent to a document (11/11 review). */
const BRIEFING: PanOutline = {
  title: '트렌드 브리핑 2026-11-11',
  rootKey: 'root',
  note: "**반도체는 '맑음'을 이어 갔지만, 코스피(1개월 -11.3%)는 폭풍우입니다.**",
  nodes: [
    {
      key: 'today',
      title: '오늘의 기상도',
      note: '| 분야 | 날씨 | 한 줄 |\n| --- | --- | --- |\n| 반도체 | 맑음 | 사상 최대 실적 |\n| 주식 | 폭풍우 | 코스피 5,352 |',
      children: [],
    },
    {
      key: 'now',
      title: '현황',
      children: [
        {
          key: 'chip',
          title: '반도체는 맑음',
          note: '반도체는 맑음입니다. 3분기 영업이익은 삼성전자 107.4조 원으로 사상 최대였습니다 [19].',
          children: [],
        },
        {
          key: 'long',
          title:
            '주식은 폭풍우입니다. 코스피는 5,352(+2.15%)로 4거래일 만에 오르며 마감했고, 외국인이 순매수로 돌아섰습니다 [13][14].',
          children: [],
        },
      ],
    },
    {
      key: 'refs',
      title: '참고 자료',
      children: [
        {
          key: 'r10',
          title: '[10] 롯데이노베이트, 탈레스와 AI 보안관제 사업 확대 — 매일일보',
          href: 'https://news.example.com/a/10',
          children: [],
        },
        {
          key: 'r11',
          title: '[11] 코스피 상승 마감 — 동아일보, 2026-11-11 https://news.example.com/a/11',
          children: [],
        },
      ],
    },
  ],
}

describe('a briefing map sent to a document', () => {
  it('does not ask the AI to rewrite references or items that are already sentences', () => {
    const users = fleshOutJobs(BRIEFING)
      .map((j) => j.user)
      .join('\n')
    expect(users).toContain('반도체는 맑음')
    expect(users).not.toContain('주식은 폭풍우입니다')
    expect(users).not.toContain('롯데이노베이트')
    expect(users).not.toContain('코스피 상승 마감')
  })

  it('puts the written sentence in place of the note, not next to it', () => {
    const filled: PanOutline = {
      ...BRIEFING,
      nodes: BRIEFING.nodes.map((n) =>
        n.key !== 'now'
          ? n
          : {
              ...n,
              children: n.children.map((c) =>
                c.key === 'chip'
                  ? { ...c, body: '반도체는 3분기 사상 최대 실적을 기록함 [19].' }
                  : c,
              ),
            },
      ),
    }
    const blocks = outlineToBlocks(filled, { style: 'chapter-report' })
    const chip = blocks.filter((b) => 'key' in b && b.key === 'chip')
    expect(chip.map((b) => b.kind)).toEqual(['item', 'para'])
    expect(chip[1]).toMatchObject({
      role: 'body',
      text: '반도체는 3분기 사상 최대 실적을 기록함 [19].',
    })
  })

  it('reads a Markdown table in a note as a table and drops the bold marks', () => {
    const blocks = outlineToBlocks(BRIEFING, { style: 'chapter-report' })
    const text = JSON.stringify(blocks)
    expect(text).not.toContain('**')
    expect(text).not.toContain('| ---')
    expect(blocks.find((b) => b.kind === 'table')).toMatchObject({
      header: true,
      rows: [
        ['분야', '날씨', '한 줄'],
        ['반도체', '맑음', '사상 최대 실적'],
        ['주식', '폭풍우', '코스피 5,352'],
      ],
    })
    expect(blocks.find((b) => b.kind === 'para' && b.role === 'lead')).toMatchObject({
      bold: true,
      text: "반도체는 '맑음'을 이어 갔지만, 코스피(1개월 -11.3%)는 폭풍우입니다.",
    })
  })

  it('links a topic that carries a web address', () => {
    const blocks = outlineToBlocks(BRIEFING, { style: 'chapter-report' })
    expect(blocks.find((b) => b.kind === 'item' && b.key === 'r10')).toMatchObject({
      href: 'https://news.example.com/a/10',
    })
  })
})

describe('a topic link in a send request', () => {
  const request = (href: unknown) =>
    checkSendRequest({
      target: 'docx',
      style: 'chapter-report',
      sheetId: 's',
      outline: {
        title: 't',
        rootKey: 'r',
        nodes: [{ key: 'a', title: '기사', href, children: [] }],
      },
    }).outline.nodes[0]!.href

  it('keeps an https address and drops anything else', () => {
    expect(request('https://news.example.com/a')).toBe('https://news.example.com/a')
    expect(request('javascript:alert(1)')).toBeUndefined()
    expect(request('file:///C:/x')).toBeUndefined()
    expect(request('https://x.example/' + 'a'.repeat(5000))).toBeUndefined()
    expect(request(7)).toBeUndefined()
  })
})

describe('what the AI is asked to write', () => {
  const topic = (key: string, title: string, children: PanOutline['nodes'] = []) => ({
    key,
    title,
    children,
  })

  it('leaves short finished sentences, cited lines and a references branch alone', () => {
    const outline: PanOutline = {
      title: '브리핑',
      rootKey: 'r',
      nodes: [
        topic('check', '체크포인트', [
          topic('a', '스테이블코인 공급 추이: 비트코인 변수 [28]'),
          topic('b', '강남·강북 간 가격 차별화.'),
          topic('c', '외국인 순매수'),
        ]),
        topic('refs', '참고 자료', [
          topic('r1', '[1] 기사 — 매체'),
          topic('r2', '[2] 기사 — 매체'),
        ]),
      ],
    }
    const jobs = fleshOutJobs(outline)
    const asked = jobs.flatMap((j) => [...j.keys.values()])
    expect(asked).toEqual(['check', 'c'])
  })

  it('moves a web address at the end of a title onto the item link', () => {
    const blocks = outlineToBlocks(
      {
        title: 't',
        rootKey: 'r',
        nodes: [
          topic('refs', '참고 자료', [
            topic(
              'x',
              '[11] 코스피 상승 마감 — 동아일보, 2026-11-11 https://news.example.com/a/11',
            ),
          ]),
        ],
      },
      { style: 'chapter-report' },
    )
    expect(blocks.find((b) => b.kind === 'item')).toMatchObject({
      text: '[11] 코스피 상승 마감 — 동아일보, 2026-11-11',
      href: 'https://news.example.com/a/11',
    })
  })
})
