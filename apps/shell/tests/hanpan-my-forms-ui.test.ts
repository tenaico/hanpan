/**
 * @vitest-environment jsdom
 */
// 한판 양식 창의 "내 양식" 칸: 목록, 새 문서로 열기, 지우기 확인, 파일 추가, 열린 문서를 양식으로 저장.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplatePicker, type HanpanApi } from '../src/renderer/src/hanpan/TemplatePicker'
import { LocaleProvider } from '../src/renderer/src/locale'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let onClose: ReturnType<typeof vi.fn>

const BUILT_IN = [
  { id: 'gongmun-1', title: '기본 공문', category: '공문', description: 'd', icon: '📄' },
]
let mine = [{ id: '주간 보고.docx', name: '주간 보고', type: 'docx', added: 1 }]

function installApi(over: Partial<HanpanApi> = {}): HanpanApi {
  const api: HanpanApi = {
    templates: vi.fn(async () => BUILT_IN),
    openTemplate: vi.fn(async () => ({ ok: true as const })),
    myForms: vi.fn(async () => mine),
    openMyForm: vi.fn(async () => ({ ok: true as const })),
    deleteMyForm: vi.fn(async (id: string) => {
      mine = mine.filter((f) => f.id !== id)
      return true
    }),
    importMyForm: vi.fn(async () => ({ ok: false as const, error: 'canceled' })),
    myFormSources: vi.fn(async () => [{ tabId: 't1', title: '출장 보고.hwpx', type: 'hwpx' }]),
    saveMyForm: vi.fn(async () => ({ ok: false as const, error: 'unsaved-changes' })),
    ...over,
  } as HanpanApi
  window.hanpanApi = api
  return api
}

async function render(saveTabId?: string): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'ko' },
        createElement(TemplatePicker, { onClose, saveTabId }),
      ),
    )
  })
  await act(async () => {})
}

const mySection = () => host.querySelector<HTMLElement>('[data-section="my-forms"]')!
const button = (scope: ParentNode, text: string) =>
  Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === text,
  )
const click = async (el: HTMLElement | undefined) => {
  expect(el).toBeTruthy()
  await act(async () => el!.click())
  await act(async () => {})
}
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  mine = [{ id: '주간 보고.docx', name: '주간 보고', type: 'docx', added: 1 }]
  onClose = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete window.hanpanApi
})

describe('내 양식 in the forms dialog', () => {
  it('lists the user forms next to the built-in ones; only user forms can be deleted', async () => {
    installApi()
    await render()
    expect(mySection().querySelector('h3')?.textContent).toBe('내 양식')
    const card = mySection().querySelector('[data-my-form="주간 보고.docx"]')!
    expect(card.textContent).toContain('주간 보고')
    expect(button(card, '삭제')).toBeTruthy()
    const builtIn = host.querySelector('[data-template="gongmun-1"]')!
    expect(button(builtIn, '삭제')).toBeUndefined()
  })

  it('opens a user form as a new document and closes the dialog', async () => {
    const api = installApi()
    await render()
    await click(button(mySection().querySelector('[data-my-form]')!, '새 문서로 열기'))
    expect(api.openMyForm).toHaveBeenCalledWith('주간 보고.docx')
    expect(onClose).toHaveBeenCalled()
  })

  it('deletes only after the confirmation', async () => {
    const api = installApi()
    await render()
    const card = () => mySection().querySelector('[data-my-form="주간 보고.docx"]')
    await click(button(card()!, '삭제'))
    expect(api.deleteMyForm).not.toHaveBeenCalled()
    expect(card()!.textContent).toContain("'주간 보고' 양식을 지울까요?")
    await click(button(card()!, '취소'))
    expect(api.deleteMyForm).not.toHaveBeenCalled()
    await click(button(card()!, '삭제'))
    await click(button(card()!, '지우기'))
    expect(api.deleteMyForm).toHaveBeenCalledWith('주간 보고.docx')
    expect(card()).toBeNull()
  })

  it('imports a file and says why an unsupported one was refused', async () => {
    const api = installApi({
      importMyForm: vi.fn(async () => ({ ok: false as const, error: 'unsupported-type' })),
    })
    await render()
    await click(button(mySection(), '내 양식 추가'))
    expect(api.importMyForm).toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      '지원하지 않는 형식입니다. 워드(.docx)와 한글(.hwp, .hwpx) 파일만 양식으로 쓸 수 있습니다.',
    )
  })

  it('shows nothing for a canceled import and lists a new form after a successful one', async () => {
    const api = installApi({
      importMyForm: vi.fn(async () => {
        mine = [...mine, { id: '신청서.hwp', name: '신청서', type: 'hwp', added: 2 }]
        return { ok: true as const, form: mine[1]! }
      }),
    })
    await render()
    await click(button(mySection(), '내 양식 추가'))
    expect(api.myForms).toHaveBeenCalledTimes(2)
    expect(mySection().querySelector('[data-my-form="신청서.hwp"]')).toBeTruthy()
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('saves an open document as a form under the typed name', async () => {
    const api = installApi({
      saveMyForm: vi.fn(async (_tab: string, name: string) => {
        mine = [...mine, { id: `${name}.hwpx`, name, type: 'hwpx', added: 3 }]
        return { ok: true as const, form: mine[1]! }
      }),
    })
    await render()
    const save = mySection().querySelector<HTMLElement>('[data-my-form-save]')!
    const select = save.querySelector('select')!
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['출장 보고.hwpx'])
    const input = save.querySelector<HTMLInputElement>('input')!
    expect(input.value).toBe('출장 보고')
    await typeInto(input, '출장 보고 양식')
    await click(button(save, '내 양식으로 저장'))
    expect(api.saveMyForm).toHaveBeenCalledWith('t1', '출장 보고 양식')
    expect(mySection().querySelector('[data-my-form="출장 보고 양식.hwpx"]')).toBeTruthy()
    expect(mySection().textContent).toContain("'출장 보고 양식' 양식을 저장했습니다.")
  })

  it('asks to save the document first when it has unsaved changes', async () => {
    installApi()
    await render()
    await click(button(mySection().querySelector('[data-my-form-save]')!, '내 양식으로 저장'))
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      '문서를 먼저 저장한 뒤 다시 시도하세요.',
    )
  })

  it('says when no open document can be saved as a form', async () => {
    installApi({ myFormSources: vi.fn(async () => []) })
    await render()
    expect(mySection().textContent).toContain(
      '양식으로 저장할 수 있는 열린 문서(워드·한글)가 없습니다.',
    )
    expect(mySection().querySelector('[data-my-form-save] button')).toBeNull()
  })

  it('opens ready to save the tab chosen from the tab menu (내 양식으로 저장…)', async () => {
    installApi({
      myFormSources: vi.fn(async () => [
        { tabId: 't1', title: '출장 보고.hwpx', type: 'hwpx' },
        { tabId: 't2', title: '회의록.docx', type: 'docx' },
      ]),
    })
    await render('t2')
    const save = mySection().querySelector<HTMLElement>('[data-my-form-save]')!
    expect(save.querySelector('select')!.value).toBe('t2')
    const input = save.querySelector<HTMLInputElement>('input')!
    expect(input.value).toBe('회의록')
    expect(document.activeElement).toBe(input)
  })

  it('falls back to the first document when the chosen tab is not one of them', async () => {
    installApi()
    await render('gone')
    const save = mySection().querySelector<HTMLElement>('[data-my-form-save]')!
    expect(save.querySelector('select')!.value).toBe('t1')
    expect(save.querySelector<HTMLInputElement>('input')!.value).toBe('출장 보고')
  })
})
