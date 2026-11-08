// 한판 "내 양식" 창구(apps/shell/src/main/hanpan/my-forms-ipc.ts): 홈 화면의 요청만 받고,
// 화면은 탭 id·양식 id·이름만 넘기며 경로는 메인 프로세스가 정한다.
import { describe, expect, it, vi } from 'vitest'
import {
  MY_FORMS_CHANNELS,
  registerMyFormsIpc,
  type MyFormsIpcDeps,
} from '../src/main/hanpan/my-forms-ipc'
import type { MyForm, MyFormsStore } from '../src/main/hanpan/my-forms'

const ZIP = new Uint8Array([0x50, 0x4b, 3, 4])
const HOME = { id: 1 }
const OTHER = { id: 2 }
const FORM: MyForm = { id: '보고.docx', name: '보고', type: 'docx', added: 1 }

function setup(over: Partial<MyFormsIpcDeps> = {}) {
  const handlers = new Map<string, (event: { sender: unknown }, ...args: unknown[]) => unknown>()
  const store: MyFormsStore = {
    list: vi.fn(() => [FORM]),
    add: vi.fn(async () => ({ ok: true as const, form: FORM })),
    addFile: vi.fn(async () => ({ ok: true as const, form: FORM })),
    read: vi.fn((id: unknown) => (id === FORM.id ? { form: FORM, bytes: ZIP } : null)),
    remove: vi.fn(async (id: unknown) => id === FORM.id),
  }
  const deps: MyFormsIpcDeps = {
    handle: (channel, fn) => handlers.set(channel, fn as never),
    store,
    isHome: (sender) => sender === HOME,
    pickFile: vi.fn(async () => 'C:\\x\\a.docx'),
    sources: vi.fn(() => [{ tabId: 't1', title: '출장.hwpx', type: 'hwpx' as const }]),
    readTab: vi.fn(async (tabId: string) =>
      tabId === 't1'
        ? { ok: true as const, bytes: ZIP, type: 'hwpx' as const }
        : { ok: false as const, error: 'not-found' as const },
    ),
    openCopy: vi.fn(async () => true),
    ...over,
  }
  registerMyFormsIpc(deps)
  const call = (channel: string, sender: unknown, ...args: unknown[]) =>
    handlers.get(channel)!({ sender }, ...args)
  return { deps, store, call }
}

describe('registerMyFormsIpc', () => {
  it('answers only the Home screen', async () => {
    const { call, store } = setup()
    expect(await call(MY_FORMS_CHANNELS.list, OTHER)).toEqual([])
    expect(await call(MY_FORMS_CHANNELS.remove, OTHER, FORM.id)).toBe(false)
    expect(await call(MY_FORMS_CHANNELS.save, OTHER, 't1', '이름')).toEqual({
      ok: false,
      error: 'not-found',
    })
    expect(store.remove).not.toHaveBeenCalled()
    expect(store.add).not.toHaveBeenCalled()
  })

  it('lists the forms and the open documents that can become one', async () => {
    const { call } = setup()
    expect(await call(MY_FORMS_CHANNELS.list, HOME)).toEqual([FORM])
    expect(await call(MY_FORMS_CHANNELS.sources, HOME)).toEqual([
      { tabId: 't1', title: '출장.hwpx', type: 'hwpx' },
    ])
  })

  it('saves an open tab under the typed name, by tab id only', async () => {
    const { call, store, deps } = setup()
    expect(await call(MY_FORMS_CHANNELS.save, HOME, 't1', '출장 양식')).toEqual({
      ok: true,
      form: FORM,
    })
    expect(deps.readTab).toHaveBeenCalledWith('t1')
    expect(store.add).toHaveBeenCalledWith('출장 양식', ZIP, 'hwpx')
    expect(await call(MY_FORMS_CHANNELS.save, HOME, { path: 'C:\\' }, 'x')).toEqual({
      ok: false,
      error: 'not-found',
    })
  })

  it('passes on why a tab could not be read', async () => {
    const { call, store } = setup({
      readTab: vi.fn(async () => ({ ok: false as const, error: 'unsaved-changes' as const })),
    })
    expect(await call(MY_FORMS_CHANNELS.save, HOME, 't1', 'x')).toEqual({
      ok: false,
      error: 'unsaved-changes',
    })
    expect(store.add).not.toHaveBeenCalled()
  })

  it('imports the file the main-process dialog picked; a cancel adds nothing', async () => {
    const { call, store } = setup()
    expect(await call(MY_FORMS_CHANNELS.import, HOME, 'D:\\evil.docx')).toEqual({
      ok: true,
      form: FORM,
    })
    expect(store.addFile).toHaveBeenCalledWith('C:\\x\\a.docx')
    const canceled = setup({ pickFile: vi.fn(async () => null) })
    expect(await canceled.call(MY_FORMS_CHANNELS.import, HOME)).toEqual({
      ok: false,
      error: 'canceled',
    })
    expect(canceled.store.addFile).not.toHaveBeenCalled()
  })

  it('opens a copy of a listed form as a new document, never the stored file', async () => {
    const { call, deps } = setup()
    expect(await call(MY_FORMS_CHANNELS.open, HOME, FORM.id)).toEqual({ ok: true })
    expect(deps.openCopy).toHaveBeenCalledWith(FORM, ZIP)
    expect(await call(MY_FORMS_CHANNELS.open, HOME, '../index.json')).toEqual({
      ok: false,
      error: 'not-found',
    })
  })

  it('deletes a listed form', async () => {
    const { call, store } = setup()
    expect(await call(MY_FORMS_CHANNELS.remove, HOME, FORM.id)).toBe(true)
    expect(store.remove).toHaveBeenCalledWith(FORM.id)
  })
})
