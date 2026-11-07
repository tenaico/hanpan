// 슬라이드 마스터 보기: 마스터가 창에 맞춰지고, 레이아웃 이름은 화면 언어로 나온다(0.17 UX v2 #20)
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { masterFitScale } from '../src/renderer/master-fit'
import { layoutLabel } from '../src/renderer/layout-names'
import { setModuleLang, t } from '../src/renderer/i18n/locale'

describe('master view fit', () => {
  it('shrinks a 1280-wide master into the free stage, never enlarges', () => {
    expect(masterFitScale(1100, 640, 1280, 720)).toBeCloseTo(Math.min(1044 / 1280, 584 / 720))
    expect(masterFitScale(3000, 2000, 1280, 720)).toBe(1)
  })
  it('MasterView labels layouts through layoutLabel and scales its stage', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'src/renderer/MasterView.tsx'),
      'utf8',
    )
    expect(src).toContain('layoutLabel(it.name, t)')
    expect(src).toContain('masterFitScale(')
  })
  it('translates the common PowerPoint layout names', () => {
    setModuleLang('ko')
    expect(layoutLabel('Comparison', t)).toBe('비교')
    setModuleLang('zh')
  })
})
