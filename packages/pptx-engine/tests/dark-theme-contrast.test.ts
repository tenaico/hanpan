import { describe, it, expect } from 'vitest'
import { parseSlide } from '../src/parse'
import { parseChartXml } from '../src/chart'
import type { Theme } from '../src/theme'

// The Design tab's dark presets (Midnight, Graphite) put the light text colour in dk1 and
// the dark page colour in lt1. Table styles read dk1/lt1 directly, so a Medium Style 2 body
// ends up as light text on a light accent tint, and charts without a text colour drew black
// labels on the dark page.
const midnight = {
  colors: {
    dk1: '#EAF2FF',
    lt1: '#0F1C2E',
    dk2: '#BCD0EC',
    lt2: '#1E3350',
    accent1: '#4A9EDE',
    accent2: '#63C7B2',
  },
} as unknown as Theme

const office = {
  colors: { dk1: '#000000', lt1: '#FFFFFF', accent1: '#4472C4', accent2: '#ED7D31' },
} as unknown as Theme

const lum = (hex: string) => {
  const h = hex.replace('#', '')
  const ch = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4)
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

function tableSlideXml(styleId: string): string {
  const tc = (t: string) =>
    `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>${t}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`
  return (
    '<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>' +
    '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="9" name="T"/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="0" y="0"/><a:ext cx="3657600" cy="2743200"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl>' +
    `<a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>${styleId}</a:tableStyleId></a:tblPr>` +
    '<a:tblGrid><a:gridCol w="1828800"/><a:gridCol w="1828800"/></a:tblGrid>' +
    `<a:tr h="914400">${tc('H1')}${tc('H2')}</a:tr>` +
    `<a:tr h="914400">${tc('A1')}${tc('A2')}</a:tr>` +
    `<a:tr h="914400">${tc('B1')}${tc('B2')}</a:tr>` +
    '</a:tbl></a:graphicData></a:graphic></p:graphicFrame>' +
    '</p:spTree></p:cSld></p:sld>'
  )
}

const tableOf = (theme: Theme, styleId: string) =>
  parseSlide({ path: 'ppt/slides/slide1.xml', slideXml: tableSlideXml(styleId), ctx: { theme } })
    .elements[0] as any

describe('table text stays readable under a dark preset theme', () => {
  const MEDIUM2_A1 = '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}'
  const MEDIUM2_A2 = '{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}'

  it('every cell of Medium Style 2 has at least 4.5:1 text contrast', () => {
    const tbl = tableOf(midnight, MEDIUM2_A1)
    for (const row of tbl.rows) {
      for (const cell of row) {
        const run = cell.text.paragraphs[0].runs[0]
        expect(contrast(run.color, cell.fill.color)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('light themes keep the style colours as PowerPoint draws them', () => {
    // White on orange is weak, but it is what PowerPoint shows for Accent 2
    const tbl = tableOf(office, MEDIUM2_A2)
    expect(tbl.rows[0][0].text.paragraphs[0].runs[0].color).toBe('#FFFFFF')
    expect(tbl.rows[1][0].text.paragraphs[0].runs[0].color).toBe('#000000')
  })
})

const PLAIN_BAR = `<?xml version="1.0"?><c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:plotArea><c:layout/>
<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>
<c:ser><c:idx val="0"/>
  <c:cat><c:strRef><c:f>x</c:f><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>A</c:v></c:pt><c:pt idx="1"><c:v>B</c:v></c:pt></c:strCache></c:strRef></c:cat>
  <c:val><c:numRef><c:f>y</c:f><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>1</c:v></c:pt><c:pt idx="1"><c:v>2</c:v></c:pt></c:numCache></c:numRef></c:val>
</c:ser></c:barChart><c:catAx><c:axId val="1"/></c:catAx><c:valAx><c:axId val="2"/></c:valAx>
</c:plotArea></c:chart></c:chartSpace>`

describe('chart text follows the theme text colour on a dark page', () => {
  it('a chart with no text colour uses the light text colour under a dark preset', () => {
    const model = parseChartXml(PLAIN_BAR, midnight)!
    expect(model.defaultTextColor).toBe('#EAF2FF')
  })

  it('a dark master colour map (tx1 → lt1) also gives light chart text', () => {
    const darkMap = {
      colors: { dk1: '#000000', lt1: '#FFFFFF', accent1: '#4472C4' },
      clrMap: { bg1: 'dk1', tx1: 'lt1', bg2: 'dk2', tx2: 'lt2' },
    } as unknown as Theme
    expect(parseChartXml(PLAIN_BAR, darkMap)!.defaultTextColor).toBe('#FFFFFF')
  })

  it('light themes keep the renderer default', () => {
    expect(parseChartXml(PLAIN_BAR, office)!.defaultTextColor).toBeUndefined()
  })
})
