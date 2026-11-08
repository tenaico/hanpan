import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { createBlankPptx, openPptx, savePptx } from '@genoffice/pptx-engine'
import { runTxn, type Op } from '@genoffice/pptx-ops'
import {
  applySlideWriting,
  emptySlideWriting,
  outlineFromIndentedText,
  outlineToSlides,
  SLIDE_GUIDES,
  parseSlideWriting,
  slideWriterJobs,
  SLIDE_STYLES,
  styledDeckOps,
  topicTitles,
} from '@genoffice/hanpan-core'

const MAP = `2026년 AI 연수 계획
  추진 배경
    교원 AI 활용 수요 증가
    업무 경감 필요 30%
    > 2025년 교원 설문 결과
  추진 내용
    기초 연수
      3월, 전 교원
    심화 연수
      5월, 희망자
    현장 적용
      수업 사례 20건
    성과 공유
      12월 발표회
  기대 효과
    수업 준비 시간 40% 단축
    교원 만족도 4.5점
    학생 맞춤 피드백 확대
`

/** Set to a folder to keep each deck as `<style>.pptx` for looking at the designs. */
const PREVIEW_DIR = process.env.HANPAN_STYLE_PREVIEW_DIR

/** Every op applied one at a time, as the shell's deck builder does; a refused op fails the test. */
async function build(ops: Op[]): Promise<Uint8Array> {
  const opened = await openPptx(await createBlankPptx())
  for (const op of ops) {
    const result = runTxn(opened, { ops: [op], isolation: 'atomic' })
    if (!result.applied)
      throw new Error(`${op.op}: ${result.failures?.[0]?.error ?? 'not applied'}`)
  }
  return savePptx(opened)
}

describe('Hanpan slide styles', () => {
  const slides = outlineToSlides(outlineFromIndentedText(MAP))

  for (const style of SLIDE_STYLES) {
    it(`builds a deck in the ${style.name.en} style`, async () => {
      const bytes = await build(styledDeckOps(slides, style.id) as Op[])
      if (PREVIEW_DIR) {
        mkdirSync(PREVIEW_DIR, { recursive: true })
        writeFileSync(join(PREVIEW_DIR, `${style.id}.pptx`), bytes)
      }
      const zip = await JSZip.loadAsync(bytes)
      const slideFiles = Object.keys(zip.files).filter((f) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(f),
      )
      // cover, contents (where the style has one), one slide per branch, closing
      expect(slideFiles.length).toBeGreaterThanOrEqual(slides.length + 1)
      expect(slideFiles.length).toBeLessThanOrEqual(slides.length + 2)
      const all = (await Promise.all(slideFiles.map((f) => zip.file(f)!.async('string')))).join('')
      expect(all).toContain('2026년 AI 연수 계획')
      expect(all).toContain('추진 내용')
      expect(all).toContain('감사합니다')
    })
  }

  // a harder map: six branches, one empty, one with a single long line, one spilling onto a continuation slide
  const PITCH_MAP = `동네 반찬 구독 서비스 투자 제안
  문제
    맞벌이 가구는 저녁 준비 시간이 부족하고 동네 반찬 가게는 남은 반찬을 버린다
    반찬 가게 폐기율 25%
  해결
    동네 반찬 가게와 구독 고객을 잇는다
  시장
  성과
    월 구독자 1,200명
    재구독률 78%
    가게 매출 2배
  팀
    대표: 외식업 10년
      프랜차이즈 운영
    개발: 커머스 플랫폼 경험
    운영: 지역 상권 네트워크
    디자인
    마케팅
  다음 단계
    시리즈 A 5억 원 투자 유치
    서울 3개 구로 확장
    가게 50곳 제휴
    앱 리뉴얼
    물류 파트너십
    구독 플랜 다양화
    기업 고객 확보
    지역 축제 협업
    리뷰 시스템 개편
    포인트 제도 도입
`
  const hard = outlineToSlides(outlineFromIndentedText(PITCH_MAP))

  for (const style of SLIDE_STYLES) {
    it(`lays out a harder map in the ${style.name.en} style`, async () => {
      const bytes = await build(styledDeckOps(hard, style.id) as Op[])
      if (PREVIEW_DIR) writeFileSync(join(PREVIEW_DIR, `${style.id}-2.pptx`), bytes)
      const zip = await JSZip.loadAsync(bytes)
      const all = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      expect(all.length).toBeGreaterThanOrEqual(hard.length + 1)
    })
  }

  // what an AI answer looks like: action titles, rewritten lines, supporting lines, takeaways, a closing
  const mapOutline = outlineFromIndentedText(MAP)
  const ANSWERS = [
    [
      '{제목} 교원의 AI 활용 수요가 커져 연수와 업무 경감이 함께 필요함',
      '{#1} 수업에 AI를 쓰려는 교원이 빠르게 늘고 있음',
      '{#1+} 수업 설계와 피드백에서 활용 요구가 큼',
      '{#1+} 확인할 근거는 노트에 정리함',
      '{#2} 업무 경감 요구 30%가 연수 참여의 전제임',
      '{핵심} 연수는 업무 경감과 함께 설계해야 참여가 늘어남',
      '{노트} 설문 결과로 시작합니다. 확인할 자료: 2025년 교원 설문 원자료',
    ],
    [
      '{제목} 기초에서 공유까지 네 단계로 한 해 동안 운영함',
      '{#1} 기초 연수로 모든 교원이 출발선을 맞춤',
      '{#2} 3월, 전 교원 대상',
      '{#3} 심화 연수는 희망자가 깊이 배움',
      '{#4} 5월, 희망자 대상',
      '{핵심} 단계마다 다음 단계의 참여자를 길러 냄',
    ],
    [
      '{제목} 수업 준비 시간을 40% 줄이고 만족도 4.5점을 목표로 함',
      '{#1} 수업 준비 시간 40% 단축',
      '{#1+} 반복 업무를 AI가 맡아 준비 시간이 줄어듦',
      '{#2} 교원 만족도 4.5점',
      '{#3} 학생마다 맞춤 피드백을 더 자주 받음',
      '{#3+} 피드백 주기가 짧아짐',
      '{핵심} 시간이 줄어든 만큼 학생에게 돌아감',
      '{마무리} 줄어든 준비 시간 40%를 학생에게 돌려줌',
    ],
  ]

  for (const style of SLIDE_STYLES) {
    it(`lays out AI-written slides in the ${style.name.en} style`, async () => {
      const jobs = slideWriterJobs(mapOutline, style.id)
      const writing = emptySlideWriting()
      jobs.forEach((job, k) =>
        parseSlideWriting(ANSWERS[k]!.join('\n'), job, topicTitles(mapOutline), writing),
      )
      const written = applySlideWriting(outlineToSlides(mapOutline), writing)
      const bytes = await build(
        styledDeckOps(written, style.id, { closing: writing.closing }) as Op[],
      )
      if (PREVIEW_DIR) writeFileSync(join(PREVIEW_DIR, `${style.id}-ai.pptx`), bytes)
      const zip = await JSZip.loadAsync(bytes)
      const files = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      const all = (await Promise.all(files.map((f) => zip.file(f)!.async('string')))).join('')
      const title = '수업 준비 시간을 40% 줄이고 만족도 4.5점을 목표로 함'
      // a title past the style's cap is not taken, and the branch keeps its own words
      if (title.length <= Math.ceil(SLIDE_GUIDES[style.id].titleMax * 1.3))
        expect(all).toContain(title)
      else expect(all).toContain('기대 효과')
      expect(all).toContain('학생마다 맞춤 피드백을 더 자주 받음')
      expect(all).toContain('줄어든 준비 시간 40%를 학생에게 돌려줌')
    })
  }
})
