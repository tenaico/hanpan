/**
 * AI 포토·AI 일러스트 탭의 복구 사본(main 쪽). 다른 편집기와 같은 공용 복구 저장소로
 * `<userData>/photo-autosave`·`<userData>/illust-autosave`에만 쓴다. 사용자의 파일과
 * 폴더에는 쓰지 않는다.
 *
 * 화면은 문서를 바꾸지 않고 얻은 바이트(포토는 PSD, PSD를 못 주는 웹판이면 합친 PNG,
 * 일러스트는 .vectorcraft)와 형식을 넘긴다. 사본의 자리는 이렇게 정한다.
 * - 저장된 파일이 있고 형식이 같으면 그 파일의 사본(파일 경로의 해시).
 * - 제목 없는 문서, 또는 파일과 형식이 다른 사본(PNG 파일의 PSD 사본 등)은 보기마다
 *   하나인 제목 없는 사본. 파일과 형식이 다르면 그 파일을 `originalPath`로 적어, 되살릴 때
 *   제목 없는 문서로 열고 첫 다른 이름으로 저장이 그 자리를 권한다. 다른 형식의 바이트로
 *   원래 파일을 덮어쓰지 않기 위해서다.
 *
 * 보기는 자기가 쓴 사본과 되살린 사본만 지운다. 저장('saved'), "저장 안 함"('dontSave'),
 * 바뀐 것 없이 닫기('closedClean')에서 지우고, 렌더러가 죽었거나 앱이 끝나는 중이면
 * 남긴다(저장소가 거절한다). "저장 안 함" 뒤에는 탭이 닫히는 동안 사본을 받지 않고,
 * 잠시 뒤에도 탭이 남아 있으면 화면에 처음부터 다시 쓰라고 알린다.
 */
import { readFileSync } from 'node:fs'
import { app, dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  createRecoveryStore,
  isUntitledIdentity,
  newUntitledRecoveryId,
  resolveRecoveryOnOpen,
} from '@genoffice/electron-utils'
import type {
  RecoveryDeleteReason,
  RecoveryIdentity,
  RecoveryOpenUntitledRequest,
  RecoveryStore,
  RecoveryUntitledIdentity,
  RecoveryWriteResult,
} from '@genoffice/electron-utils'
import { getUiLang } from '@genoffice/i18n'
import { extOf } from '../shared/kinds'
import type { GraphicsKind } from '../shared/kinds'

/** "저장 안 함" 뒤 사본을 받지 않는 시간. 그 뒤에도 탭이 있으면 다시 쓰게 한다. */
export const DONT_SAVE_HOLD_MS = 5_000

/** 사본으로 받는 형식: 그 탭이 다시 열 수 있는 것만 */
export const RECOVERY_EXTS: Record<GraphicsKind, readonly string[]> = {
  photo: ['psd', 'png'],
  illust: ['vectorcraft'],
}

let store: RecoveryStore | null = null

export function graphicsRecoveryStore(): RecoveryStore {
  store ??= createRecoveryStore({ userDataDir: () => app.getPath('userData') })
  return store
}

interface ViewRecovery {
  kind: GraphicsKind
  /** 이 보기의 제목 없는 사본(처음 쓸 때 만들거나 되살린 사본을 이어 씀) */
  untitledCopy?: RecoveryUntitledIdentity
  /** 이 보기의 사본들, 사본 경로별 */
  owned: Map<string, RecoveryIdentity>
  /** 되살린 제목 없는 사본의 탭 제목 */
  title?: string
  /** 첫 다른 이름으로 저장이 권할 자리(되살린 사본이 가리키던 파일) */
  saveAsDefault?: string
  /** 셸이 이미 정한, 다음에 열 파일의 복구 답 */
  decision?: 'restore' | 'original'
  /** 사본에서 열었다: 화면이 문서를 "바뀜"으로 표시해야 한다 */
  restored?: boolean
  crashed?: boolean
  /** "저장 안 함" 뒤 기다리는 중 */
  dropped?: ReturnType<typeof setTimeout>
  /** 파일에 남은 사본을 정리하지 못했다: 그 위에 새 사본을 쓰지 않는다 */
  blocked?: boolean
}

const views = new Map<number, ViewRecovery>()

function stateOf(wcId: number, kind: GraphicsKind): ViewRecovery {
  let state = views.get(wcId)
  if (!state) {
    state = { kind, owned: new Map() }
    views.set(wcId, state)
  }
  return state
}

function own(state: ViewRecovery, identity: RecoveryIdentity): void {
  state.owned.set(graphicsRecoveryStore().copyPath(identity), identity)
}

const sameFormat = (a: string, b: string): boolean =>
  a === b || (['jpg', 'jpeg'].includes(a) && ['jpg', 'jpeg'].includes(b))

/** 지금 이 형식의 사본을 둘 자리 */
function copyIdentity(
  state: ViewRecovery,
  savePath: string | undefined,
  ext: string,
): RecoveryIdentity {
  if (savePath && sameFormat(extOf(savePath), ext)) return { kind: state.kind, filePath: savePath }
  const dotted = `.${ext}`
  const current = state.untitledCopy
  if (current?.ext === dotted) return current
  const next: RecoveryUntitledIdentity = {
    kind: state.kind,
    untitledId: current?.untitledId ?? newUntitledRecoveryId(),
    ext: dotted,
  }
  // 형식이 바뀌었다(웹판이 PSD를 주기 시작함): 예전 형식의 사본은 남길 까닭이 없다
  if (current) deleteOne(state, current, 'discarded')
  state.untitledCopy = next
  return next
}

function deleteOne(state: ViewRecovery, identity: RecoveryIdentity, reason: RecoveryDeleteReason) {
  const recovery = graphicsRecoveryStore()
  if (recovery.deleteCopy(identity, reason) === 'deleted') {
    state.owned.delete(recovery.copyPath(identity))
  }
}

/** `forget` false: 지운 사본도 이 보기의 것으로 남겨, 나중에 그 자리에 생긴 사본도 함께 지운다 */
function deleteOwned(wcId: number, reason: RecoveryDeleteReason, forget = true): void {
  const state = views.get(wcId)
  if (!state) return
  const recovery = graphicsRecoveryStore()
  for (const [key, identity] of state.owned) {
    if (recovery.deleteCopy(identity, reason) === 'deleted' && forget) state.owned.delete(key)
  }
}

export type ViewCopyResult = RecoveryWriteResult | 'refused'

/**
 * 화면이 넘긴 바이트를 이 보기의 사본으로 둔다. 받지 않는 형식은 'refused',
 * "저장 안 함" 뒤나 정리하지 못한 사본 위에는 'superseded'. 디스크 오류는 거부(reject)한다.
 */
export function writeViewCopy(
  wcId: number,
  kind: GraphicsKind,
  savePath: string | undefined,
  bytes: Uint8Array,
  ext: string,
  tabTitle: () => string,
): Promise<ViewCopyResult> {
  if (!RECOVERY_EXTS[kind].includes(ext)) return Promise.resolve('refused')
  const state = stateOf(wcId, kind)
  if (state.dropped !== undefined || state.blocked) return Promise.resolve('superseded')
  const identity = copyIdentity(state, savePath, ext)
  own(state, identity)
  const untitled = isUntitledIdentity(identity)
  const options: { title?: string; originalPath?: string } = {}
  if (untitled) {
    options.title = state.title ?? tabTitle()
    const original = savePath ?? state.saveAsDefault
    if (original) options.originalPath = original
  }
  return graphicsRecoveryStore().writeCopy(
    identity,
    Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    options,
  )
}

/** 문서가 디스크에 저장됐다: 사본은 할 일을 다 했고, 더는 제목 없는 문서가 아니다 */
export function viewSaved(wcId: number): void {
  deleteOwned(wcId, 'saved')
  const state = views.get(wcId)
  if (!state) return
  state.untitledCopy = undefined
  state.saveAsDefault = undefined
  state.title = undefined
}

/**
 * "저장 안 함"(닫기 질문, 또는 도구가 저장하지 않고 닫음): 사본을 지우고 탭이 닫히는
 * 동안 받지 않는다. 잠시 뒤에도 탭이 남아 있으면 `resume`으로 화면에 다시 쓰게 한다.
 */
export function viewDropped(wcId: number, kind: GraphicsKind, resume: () => void): void {
  deleteOwned(wcId, 'dontSave', false)
  const state = stateOf(wcId, kind)
  clearTimeout(state.dropped)
  state.dropped = setTimeout(() => {
    state.dropped = undefined
    if (views.get(wcId) === state) resume()
  }, DONT_SAVE_HOLD_MS)
}

export function viewCrashed(wcId: number): void {
  const state = views.get(wcId)
  if (state) state.crashed = true
}

/**
 * 보기가 사라졌다. "저장 안 함" 뒤라면 그사이 생긴 사본까지 지우고, 바뀐 것 없이 닫혔으면
 * 사본을 지운다. 바뀐 채로, 렌더러가 죽어서, 앱이 끝나는 중이라면 남긴다.
 */
export function viewGone(wcId: number, dirty: boolean): void {
  const state = views.get(wcId)
  if (state?.dropped !== undefined) {
    clearTimeout(state.dropped)
    deleteOwned(wcId, 'dontSave')
  } else if (state && !state.crashed && !dirty) {
    deleteOwned(wcId, 'closedClean')
  }
  views.delete(wcId)
}

/**
 * 셸의 세션 기록과 렌더러가 죽은 탭 다시 열기에 쓰는, 이 보기가 쓰는 사본.
 * 파일이 있으면 그 파일의 것, 제목 없는 문서는 사본을 쓴 뒤에만 답한다.
 */
export function viewRecoveryIdentity(
  wcId: number,
  kind: GraphicsKind,
  savePath: string | undefined,
): RecoveryIdentity | null {
  if (savePath) return { kind, filePath: savePath }
  return views.get(wcId)?.untitledCopy ?? null
}

/** 사본에서 열린 문서인지(한 번만 참) */
export function takeRestored(wcId: number): boolean {
  const state = views.get(wcId)
  if (!state?.restored) return false
  state.restored = false
  return true
}

export function viewSaveAsDefault(wcId: number): string | undefined {
  return views.get(wcId)?.saveAsDefault
}

export function setViewOpenDecision(
  wcId: number,
  kind: GraphicsKind,
  decision: 'restore' | 'original',
): void {
  stateOf(wcId, kind).decision = decision
}

/**
 * 파일을 열기 전: 되살릴 사본의 바이트, 또는 파일 그대로 열면 null. 셸이 정한 답을 먼저
 * 따르고, 실행 목록에서 "복구"를 고른 사본은 묻지 않고, 정하지 않은 사본은 파일 이름으로
 * 묻는다. 정리하지 못하면 파일을 그대로 열고 그 위에 사본을 쓰지 않는다.
 */
export async function resolveViewOpen(
  wcId: number,
  kind: GraphicsKind,
  filePath: string,
  parent: BrowserWindow | null,
): Promise<Uint8Array | null> {
  const state = stateOf(wcId, kind)
  const decision = state.decision
  state.decision = undefined
  state.blocked = false
  if (decision === 'original') return null
  const identity: RecoveryIdentity = { kind, filePath }
  try {
    const recovery = graphicsRecoveryStore()
    if (decision === 'restore' && recovery.copyInfo(identity)) {
      recovery.setCopyState(identity, 'restoreChosen')
    }
    const result = await resolveRecoveryOnOpen({
      store: recovery,
      identity,
      dialog,
      parent,
      lang: getUiLang(),
    })
    if (result.action !== 'restore') return null
    own(state, identity)
    state.restored = true
    return new Uint8Array(result.bytes)
  } catch (err) {
    state.blocked = true
    console.warn('[graphics] could not settle the recovery copy; the file opens as saved:', err)
    return null
  }
}

/** 새 (제목 없는) 보기에 열 사본: 바이트와 확장자. 이 보기의 다음 사본은 이 사본을 바꿔 쓴다. */
export function takeUntitledCopy(
  wcId: number,
  kind: GraphicsKind,
  request: RecoveryOpenUntitledRequest,
): { bytes: Uint8Array; ext: string } | null {
  const recovery = graphicsRecoveryStore()
  let bytes: Buffer
  try {
    bytes = readFileSync(recovery.copyPath(request.copy))
  } catch {
    return null
  }
  recovery.markCopyLoaded(request.copy)
  const state = stateOf(wcId, kind)
  own(state, request.copy)
  // 파일이 사라진 파일 사본도 제목 없는 사본처럼 이어 쓴다(새 사본은 제목 없는 자리에)
  if (isUntitledIdentity(request.copy)) state.untitledCopy = request.copy
  state.title = request.title
  state.restored = true
  const fromFile = isUntitledIdentity(request.copy) ? undefined : request.copy.filePath
  const saveAsDefault = request.saveAsDefaultPath ?? fromFile
  if (saveAsDefault) state.saveAsDefault = saveAsDefault
  const ext = isUntitledIdentity(request.copy)
    ? request.copy.ext.slice(1)
    : extOf(request.copy.filePath)
  return { bytes: new Uint8Array(bytes), ext }
}

/** 제목 없는 문서의 파일 이름 바탕: 쓸 수 없는 글자를 바꾼다 */
export function fileNameBase(name: string | undefined): string {
  return (name ?? '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}
