/**
 * Hanyang (HY) faces installed by Korean Office/HWP: Chromium on Windows cannot
 * resolve them by the Korean family documents declare (DirectWrite regroups
 * "HYHeadLine-Medium" as family "HYHeadLine" weight Medium), so the chain must
 * carry the names that resolve, and availability must see the installed face
 * (probe 2026-11-11: an installed HY헤드라인M title fell to GenOffice Serif KR).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cssFontFamily, isFontAvailable, localFamilyAliases } from '../src/renderer/line-metrics'

/** canvas whose measureText widens for the listed (double-quoted) families only */
function stubCanvas(availableFamilies: string[]) {
  const known = new Set(availableFamilies)
  let width = 50
  const fake = {
    set font(spec: string) {
      const family = /"([^"]+)"/.exec(spec)?.[1]
      width = family !== undefined && known.has(family) ? 100 : 50
    },
    measureText: () => ({ width }),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fake as unknown as CanvasRenderingContext2D,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('HY family aliases', () => {
  it('maps the Korean names to the names DirectWrite exposes', () => {
    expect(localFamilyAliases('HY헤드라인M')).toEqual(['HYHeadLine-Medium', 'HYHeadLine Medium'])
    expect(localFamilyAliases("'HY중고딕'")).toEqual(['HYGothic-Medium', 'HYGothic Medium'])
    expect(localFamilyAliases('HY궁서B')).toEqual(['HYGungSo-Bold', 'HYGungSo'])
    // the "-Extra" faces keep their Korean names, unrelated faces have no alias
    expect(localFamilyAliases('HY견고딕')).toEqual([])
    expect(localFamilyAliases('휴먼명조')).toEqual([])
    expect(localFamilyAliases('맑은 고딕')).toEqual([])
  })

  it('an installed HY face reached only through its alias counts as available', () => {
    stubCanvas(['HYHeadLine Medium'])
    expect(isFontAvailable('HY헤드라인M')).toBe(true)
    // the alias leads right behind the declared name; an available face keeps the sans class
    expect(cssFontFamily('HY헤드라인M')).toBe(
      "'HY헤드라인M','HYHeadLine-Medium','HYHeadLine Medium','Malgun Gothic','GenOffice Sans KR','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    )
  })

  it('a missing HY face keeps its aliases ahead of the Batang-ward substitution', () => {
    stubCanvas([])
    expect(isFontAvailable('HY엽서M')).toBe(false)
    expect(cssFontFamily('HY엽서M')).toBe(
      "'HY엽서M','HYPost-Medium','HYPost Medium','GenOffice Batang','GenOffice Serif KR','GenOffice Myungjo','Noto Serif KR',serif",
    )
  })

  it('aliases ride the special-cased branches too (Gungsuh-named HY궁서B)', () => {
    stubCanvas(['HYGungSo'])
    expect(
      cssFontFamily('HY궁서B').startsWith("'HY궁서B','HYGungSo-Bold','HYGungSo','Courier New'"),
    ).toBe(true)
  })

  it('names without aliases render the chain unchanged', () => {
    stubCanvas([])
    expect(cssFontFamily('휴먼명조')).toBe(
      "'휴먼명조','GenOffice Batang','GenOffice Serif KR','GenOffice Myungjo','Noto Serif KR',serif",
    )
  })
})
