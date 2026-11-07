/**
 * 한판 "내 양식" 창구. 홈 화면(껍데기 창)의 요청만 받는다. 화면이 넘기는 것은
 * 탭 id, 양식 id(목록에 있는 파일 이름), 사람이 적은 이름뿐이고, 경로는
 * 메인 프로세스가 정한다: 가져올 파일은 메인의 열기 창이, 저장할 문서는 탭이 정한다.
 * Electron을 불러오지 않는다(시험: tests/hanpan-my-forms-ipc.test.ts).
 */
import type { MyForm, MyFormError, MyFormResult, MyFormType, MyFormsStore } from './my-forms'

export const MY_FORMS_CHANNELS = {
  list: 'hanpan:my-forms',
  sources: 'hanpan:my-forms-sources',
  save: 'hanpan:my-forms-save',
  import: 'hanpan:my-forms-import',
  open: 'hanpan:my-forms-open',
  remove: 'hanpan:my-forms-delete',
  /** main → Home: a tab menu asked to save that tab as a form (payload: tab id) */
  saveRequest: 'hanpan:my-forms-save-request',
} as const

/** 양식으로 저장할 수 있는 열린 문서 탭 */
export interface MyFormSource {
  tabId: string
  title: string
  type: MyFormType
}

export type TabBytes =
  { ok: true; bytes: Uint8Array; type: MyFormType } | { ok: false; error: MyFormError }

export interface MyFormsIpcDeps {
  handle(channel: string, fn: (event: { sender: unknown }, ...args: unknown[]) => unknown): void
  store: MyFormsStore
  /** 요청이 홈 화면에서 왔는지 */
  isHome(sender: unknown): boolean
  /** 메인 프로세스의 열기 창; 취소하면 null */
  pickFile(): Promise<string | null>
  sources(): MyFormSource[]
  /** 탭 문서의 바이트(저장 안 한 변경이 있으면 거절) */
  readTab(tabId: string): Promise<TabBytes>
  /** 양식의 사본을 제목 없는 새 문서로 연다 */
  openCopy(form: MyForm, bytes: Uint8Array): Promise<boolean>
}

const notFound = { ok: false as const, error: 'not-found' as const }

export function registerMyFormsIpc(deps: MyFormsIpcDeps): void {
  const gated = <T>(channel: string, refused: T, fn: (...args: unknown[]) => T | Promise<T>) =>
    deps.handle(channel, async (event, ...args) =>
      deps.isHome(event.sender) ? fn(...args) : refused,
    )

  gated(MY_FORMS_CHANNELS.list, [] as MyForm[], () => deps.store.list())
  gated(MY_FORMS_CHANNELS.sources, [] as MyFormSource[], () => deps.sources())
  gated(MY_FORMS_CHANNELS.save, notFound as MyFormResult, async (tabId, name) => {
    if (typeof tabId !== 'string' || !deps.sources().some((s) => s.tabId === tabId)) return notFound
    const read = await deps.readTab(tabId)
    if (!read.ok) return read
    return deps.store.add(name, read.bytes, read.type)
  })
  gated(
    MY_FORMS_CHANNELS.import,
    notFound as MyFormResult | { ok: false; error: 'canceled' },
    async () => {
      const path = await deps.pickFile()
      if (!path) return { ok: false as const, error: 'canceled' as const }
      return deps.store.addFile(path)
    },
  )
  gated(
    MY_FORMS_CHANNELS.open,
    notFound as { ok: true } | { ok: false; error: string },
    async (id) => {
      const found = deps.store.read(id)
      if (!found) return notFound
      return (await deps.openCopy(found.form, found.bytes))
        ? { ok: true as const }
        : { ok: false as const, error: 'the new tab did not open' }
    },
  )
  gated(MY_FORMS_CHANNELS.remove, false, (id) => deps.store.remove(id))
}
