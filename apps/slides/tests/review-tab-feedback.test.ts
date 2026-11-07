// 검토 → 맞춤법 검사는 누르면 무슨 일이 일어나는지 알려 주고, AI가 결과를 "틀린 곳 없음/N곳 고침"으로
// 시작하게 한다(#15). 전환 문구는 한판 쇼에서도 재생된다는 것과 어긋나지 않게(#28). AI 확인 문구는
// 쉬운 말로(0.17 점검 v2 slides-mindmap).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ribbonStrings } from '../src/renderer/i18n/strings-ribbon'
import { appStrings } from '../src/renderer/i18n/strings-app'

const here = dirname(fileURLToPath(import.meta.url))
const ribbonSrc = readFileSync(join(here, '..', 'src/renderer/components/Ribbon.tsx'), 'utf8')
const R = ribbonStrings as unknown as Record<string, Record<string, string>>
const A = appStrings as unknown as Record<string, Record<string, string>>

describe('spell check feedback (#15)', () => {
  it('shows a notice right after starting the check', () => {
    const click = ribbonSrc.slice(
      ribbonSrc.indexOf("onAiPreset(t('ribbonSpellCheckPrompt'))") - 200,
    )
    expect(click.slice(0, 400)).toMatch(/showToast\(t\('ribbonSpellCheckStarted'\)\)/)
    expect(R.ko!.ribbonSpellCheckStarted).toMatch(/AI 창/)
  })
  it('asks the AI to open its report with the count', () => {
    for (const lang of ['ko', 'en', 'vi']) {
      expect(R[lang]!.ribbonSpellCheckPrompt, lang).toMatch(
        lang === 'ko'
          ? /틀린 곳 없음.*곳 고침/s
          : lang === 'en'
            ? /No errors found.*fixed/s
            : /Không có lỗi/,
      )
    }
  })
})

describe('transition wording (#28)', () => {
  it('no longer suggests it only plays in PowerPoint', () => {
    for (const lang of ['ko', 'en', 'vi']) {
      expect(A[lang]!.appStatusTransitionSet, lang).not.toMatch(/PowerPoint/)
      // the tip may name PowerPoint, but only next to the app's own show
      expect(R[lang]!.ribbonTransApplyTip, lang).not.toMatch(
        /적용됨|takes effect in PowerPoint|có hiệu lực/,
      )
      expect(R[lang]!.ribbonTransApplyTip, lang).toMatch(
        /슬라이드 쇼와|slide show and|trình chiếu và/,
      )
    }
  })
})

describe('AI confirmation wording', () => {
  it('is plain Korean without "호출합니다"', () => {
    expect(R.ko!.ribbonAiRewriteConfirm).not.toMatch(/호출/)
    expect(R.ko!.ribbonAiRewriteConfirm).toMatch(/계속할까요\?/)
  })
})
