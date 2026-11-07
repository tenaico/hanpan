/**
 * 다른 앱으로 보내기: 어떤 탭에서 어떤 편집기로 보낼 수 있는가.
 *
 * Markdown이 공통 형식이다. 원본은 Markdown으로 읽고(`to-markdown.ts`), 그 글로 대상 편집기의
 * 새 제목 없는 문서를 만든다(`from-markdown.ts`). 원본 탭은 고치지 않는다.
 */
import type { TabKind } from '../../shared/tabs-api'

/** 보낼 수 있는 편집기, 메뉴에 놓이는 순서. 마지막 `markdown`은 "마크다운으로 먼저 고치기"로도 쓰인다 */
export const SEND_TARGETS = ['docs', 'slides', 'hwp', 'markdown', 'mindmap', 'html'] as const
export type SendTarget = (typeof SEND_TARGETS)[number]

/** 읽어서 보낼 수 있는 탭. 그림 탭(AI 포토·AI 일러스트)과 홈·도움말은 아니다 */
const SOURCE_KINDS: ReadonlySet<TabKind> = new Set<TabKind>([
  'docs',
  'sheets',
  'slides',
  'pdf',
  'markdown',
  'html',
  'mindmap',
  'hwp',
  'epub',
])

export function canSendFrom(kind: TabKind): boolean {
  return SOURCE_KINDS.has(kind)
}

/**
 * 이 탭에서 보낼 수 있는 대상. 자기 편집기는 빼고, AI 한글은 한국 문서 기능이 켜졌을 때만
 * 둔다(결정 0091: 꺼지면 한글 카드와 메뉴를 숨긴다).
 */
export function sendTargetsFor(kind: TabKind, koreanDocFeatures: boolean): SendTarget[] {
  if (!canSendFrom(kind)) return []
  return SEND_TARGETS.filter((target) => target !== kind && (koreanDocFeatures || target !== 'hwp'))
}

/** 새 문서의 확장자 */
export const TARGET_EXTENSION: Record<SendTarget, string> = {
  docs: 'docx',
  slides: 'pptx',
  hwp: 'hwpx',
  markdown: 'md',
  mindmap: 'xmind',
  html: 'html',
}

const ALIASES: Record<string, SendTarget> = {
  docs: 'docs',
  doc: 'docs',
  docx: 'docs',
  word: 'docs',
  slides: 'slides',
  slide: 'slides',
  pptx: 'slides',
  ppt: 'slides',
  powerpoint: 'slides',
  presentation: 'slides',
  hwp: 'hwp',
  hwpx: 'hwp',
  hangul: 'hwp',
  한글: 'hwp',
  markdown: 'markdown',
  md: 'markdown',
  mindmap: 'mindmap',
  'mind map': 'mindmap',
  'mind-map': 'mindmap',
  xmind: 'mindmap',
  map: 'mindmap',
  html: 'html',
  web: 'html',
  'web page': 'html',
}

/** 에이전트가 쓸 법한 이름(`word`, `pptx`, `hwpx`, `md`, `mind map`, `web`)을 대상으로 읽는다 */
export function parseSendTarget(raw: unknown): SendTarget | null {
  if (typeof raw !== 'string') return null
  return ALIASES[raw.trim().toLowerCase()] ?? null
}
