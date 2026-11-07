/**
 * 다른 앱으로 보내기(앱 간 연동, 0.17): 지금 탭의 내용을 Markdown으로 읽어, 다른 편집기의
 * 새 제목 없는 문서로 연다. 원본 탭은 읽기만 한다.
 *
 * 원본을 읽는 길
 * - 편집 중인 글을 바로 줄 수 있는 편집기(AI 마크다운·AI 웹 문서·마인드맵·AI 한글)는 화면의
 *   내용을 읽는다. 저장하지 않은 편집도 들어간다. 파워포인트는 열린 덱 모델을 읽는다.
 * - 그 밖(워드·엑셀·PDF·전자책)은 저장된 파일을 `parseFileToText`로 읽는다. 저장하지 않은
 *   변경이 있거나 파일이 아직 없으면 공유하기(결정 0095)처럼 "저장하고 보내기"를 묻는다.
 * - 다른 파일로 읽힐 때의 가리기(file-parse의 규칙)를 따른다: 가린 자리는 `{{이름}}`으로 간다.
 *
 * Electron이 없다. 셸(index.ts)이 의존성을 주고, 시험은 가짜를 준다.
 */
import type { HwpEngine } from '@genoffice/hanpan-core'
import { redactHtmlSource, redactMarkdownSource, type ParsedFile } from '@genoffice/file-parse'
import type { SlideDeck } from '@genoffice/pptx-engine'
import type { TabKind } from '../../shared/tabs-api'
import { buildTargetDocument, TooManySlidesError, type BuiltDocument } from './from-markdown'
import { sendTargetsFor, type SendTarget } from './targets'
import {
  deckToMarkdown,
  docxTextToMarkdown,
  htmlToMarkdown,
  mapOutlineToMarkdown,
  plainTextToMarkdown,
  sheetTextToMarkdown,
} from './to-markdown'

export interface SendSource {
  id: string
  kind: TabKind
  title: string
  filePath?: string | undefined
  dirty: boolean
}

export interface SendDeps {
  /** 탭의 지금 상태. 닫혔으면 undefined */
  document(tabId: string): Promise<SendSource | undefined>
  /** 화면의 글: 마크다운 원문, HTML 원문, 지도의 개요 글, 한글 문서의 글 */
  readLive(source: SendSource): Promise<string>
  /** 열린 파워포인트 탭의 덱 모델 */
  liveDeck(source: SendSource): Promise<SlideDeck | null>
  /** 엑셀 탭에서 지금 보고 있는 시트 이름 */
  activeSheet(source: SendSource): Promise<string | null>
  /** 다른 파일로 읽기(가리기 적용). 앱에서는 언제나 `parseFileToText` */
  parse(path: string): Promise<ParsedFile>
  /** 저장을 먼저 할지 묻는다. `untitled`이면 저장할 곳도 묻게 된다 */
  confirmSave(untitled: boolean): Promise<boolean>
  /** 탭의 저장(제목 없는 문서는 다른 이름으로 저장)을 돌린다 */
  save(tabId: string): void
  loadHwpEngine(): Promise<HwpEngine>
  /** 새 제목 없는 탭으로 연다. 새 탭 id, 못 열면 null */
  openDocument(doc: BuiltDocument): Promise<string | null>
  /** 한국 문서 기능(결정 0091)이 켜졌는가 */
  korean(): boolean
  /** 사용자 언어의 "제목 없음" */
  untitled: string
  /** 저장이 끝났는지 보는 간격과 기다리는 시간 */
  waitMs?: number
  timeoutMs?: number
}

export type SendProblem =
  'unsupported' | 'canceled' | 'empty' | 'unreadable' | 'redaction' | 'too-many-slides' | 'failed'

export type SourceRead =
  { ok: true; title: string; markdown: string } | { ok: false; problem: SendProblem }

export type SendResult =
  { ok: true; tabId: string; target: SendTarget } | { ok: false; problem: SendProblem }

/** 화면에서 바로 읽는 편집기 */
const LIVE_KINDS: ReadonlySet<TabKind> = new Set<TabKind>(['markdown', 'html', 'mindmap', 'hwp'])

/** `parseFileToText`가 가린 표시를 처리하지 못했을 때의 글(RedactionMarkError) */
const REDACTION_FAILURE = /^Redaction marks in this file could not be processed/

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

/** 탭 제목에서 확장자를 뗀 것: 새 문서의 이름 */
export function titleStem(title: string): string {
  const stem = title.replace(
    /\.(docx?|xlsx|xlsm|xls|csv|pptx?|pdf|md|markdown|txt|html?|xmind|hwpx?|epub|odt)$/i,
    '',
  )
  return stem.trim() || title.trim()
}

/** 저장하지 않은 변경이 있거나 파일이 없으면 저장을 묻고, 저장이 끝날 때까지 기다린다 */
async function savedSource(deps: SendDeps, source: SendSource): Promise<SendSource | null> {
  if (source.filePath && !source.dirty) return source
  if (!(await deps.confirmSave(!source.filePath))) return null
  deps.save(source.id)
  const waitMs = deps.waitMs ?? 300
  const deadline = Date.now() + (deps.timeoutMs ?? 2 * 60_000)
  for (;;) {
    await sleep(waitMs)
    const now = await deps.document(source.id)
    if (!now) return null
    if (now.filePath && !now.dirty) return now
    if (Date.now() > deadline) return null
  }
}

async function readFileText(
  deps: SendDeps,
  path: string,
): Promise<{ ok: true; text: string } | { ok: false; problem: SendProblem }> {
  let parsed: ParsedFile
  try {
    parsed = await deps.parse(path)
  } catch {
    return { ok: false, problem: 'unreadable' }
  }
  if (!parsed.ok || parsed.kind !== 'text' || typeof parsed.text !== 'string') {
    return {
      ok: false,
      problem: REDACTION_FAILURE.test(parsed.error ?? '') ? 'redaction' : 'unreadable',
    }
  }
  return { ok: true, text: parsed.text }
}

/** 탭의 내용을 Markdown으로 읽는다. 원본은 바꾸지 않는다(저장하지 않은 문서는 묻고 저장한다) */
export async function sourceMarkdown(deps: SendDeps, tabId: string): Promise<SourceRead> {
  const source = await deps.document(tabId)
  if (!source || sendTargetsFor(source.kind, true).length === 0) {
    return { ok: false, problem: 'unsupported' }
  }
  let title = titleStem(source.title)
  let markdown: string
  try {
    if (LIVE_KINDS.has(source.kind)) {
      const live = await deps.readLive(source)
      if (source.kind === 'markdown') markdown = redactMarkdownSource(live)
      else if (source.kind === 'html') markdown = htmlToMarkdown(redactHtmlSource(live))
      else if (source.kind === 'mindmap') markdown = mapOutlineToMarkdown(live, deps.untitled)
      else markdown = plainTextToMarkdown(live, { firstLineTitle: true })
    } else if (source.kind === 'slides') {
      const deck = await deps.liveDeck(source)
      if (!deck) return { ok: false, problem: 'unreadable' }
      markdown = deckToMarkdown(deck, { withhold: true })
    } else {
      const saved = await savedSource(deps, source)
      if (!saved?.filePath) return { ok: false, problem: 'canceled' }
      // an untitled document saved just now: its tab may not show the new name yet
      title = titleStem(saved.filePath.split(/[\\/]/).pop() ?? '') || title
      const read = await readFileText(deps, saved.filePath)
      if (!read.ok) return read
      if (source.kind === 'docs') markdown = docxTextToMarkdown(read.text)
      else if (source.kind === 'sheets')
        markdown = sheetTextToMarkdown(read.text, await deps.activeSheet(saved).catch(() => null))
      else markdown = plainTextToMarkdown(read.text)
    }
  } catch (error) {
    return {
      ok: false,
      problem:
        error instanceof Error && error.name === 'RedactionMarkError' ? 'redaction' : 'unreadable',
    }
  }
  if (!markdown.trim()) return { ok: false, problem: 'empty' }
  return { ok: true, title, markdown }
}

/**
 * 탭 하나를 다른 편집기로 보낸다: Markdown으로 읽고, 대상의 새 문서를 만들어 새 탭으로 연다.
 * `markdown`을 고르면 중간 Markdown을 AI 마크다운에서 먼저 보고 고칠 수 있다(거기서 다시 보낸다).
 */
export async function sendToApp(
  deps: SendDeps,
  tabId: string,
  target: SendTarget,
): Promise<SendResult> {
  const source = await deps.document(tabId)
  if (!source || !sendTargetsFor(source.kind, deps.korean()).includes(target)) {
    return { ok: false, problem: 'unsupported' }
  }
  const read = await sourceMarkdown(deps, tabId)
  if (!read.ok) return read
  let built: BuiltDocument
  try {
    built = await buildTargetDocument(read.markdown, target, {
      title: read.title,
      untitled: deps.untitled,
      korean: deps.korean(),
      loadHwpEngine: () => deps.loadHwpEngine(),
    })
  } catch (error) {
    return {
      ok: false,
      problem: error instanceof TooManySlidesError ? 'too-many-slides' : 'failed',
    }
  }
  let opened: string | null
  try {
    opened = await deps.openDocument(built)
  } catch {
    opened = null
  }
  return opened ? { ok: true, tabId: opened, target } : { ok: false, problem: 'failed' }
}
