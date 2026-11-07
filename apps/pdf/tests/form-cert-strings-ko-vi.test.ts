// 양식 채우기·양식 디자인·인증서 서명·서명 확인 문구는 영어 기본값을 펼쳐 쓰는 구조라
// 한국어·베트남어 화면에서 영어가 섞여 나왔다. 두 언어는 모든 키를 자기 말로 가진다.
import { describe, expect, it } from 'vitest'
import { strings } from '../src/renderer/i18n/strings'
import { certSignStringsFor } from '../src/renderer/i18n/cert-sign-strings'

const en = strings.en as Record<string, string>
/** 그대로 둬도 되는 짧은 표기(자리 표시만 있는 진행 표시 등) */
const SAME_OK = /^[A-Za-z0-9 ./+:·-]{0,12}$/
const formKeys = Object.keys(en).filter((k) =>
  /^(form|insert|editInserted|deleteInserted|insertedText|textInsert|ribbonTabF)/.test(k),
)
const certKeys = Object.keys(certSignStringsFor('en'))

describe('form and certificate strings in Korean and Vietnamese', () => {
  for (const lang of ['ko', 'vi'] as const) {
    it(`${lang}: no form or signature string falls back to English`, () => {
      const dict = strings[lang] as Record<string, string>
      const english = [...formKeys, ...certKeys].filter(
        (k) => dict[k] === en[k] && !SAME_OK.test(en[k]!.replace(/\{\w+\}/g, '')),
      )
      expect(english).toEqual([])
    })
  }
})
