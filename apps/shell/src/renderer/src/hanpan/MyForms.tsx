/**
 * 한판 양식 창의 "내 양식" 칸: 사용자가 저장하거나 가져온 양식. 열면 사본이
 * 제목 없는 새 문서로 열리고(보관한 양식은 그대로), 지우기는 한 번 더 묻는다.
 * 열린 워드·한글 문서를 이름을 붙여 양식으로 저장하는 줄도 여기 있다.
 * 화면은 탭 id·양식 id·이름만 넘긴다(경로는 메인 프로세스가 정한다).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n, type StringKey } from '../locale'

export interface MyFormSummary {
  id: string
  name: string
  type: string
  added: number
}

export interface MyFormSourceSummary {
  tabId: string
  title: string
  type: string
}

export type MyFormAnswer = { ok: true; form: MyFormSummary } | { ok: false; error: string }

export interface MyFormsApi {
  myForms(): Promise<MyFormSummary[]>
  myFormSources(): Promise<MyFormSourceSummary[]>
  saveMyForm(tabId: string, name: string): Promise<MyFormAnswer>
  importMyForm(): Promise<MyFormAnswer>
  openMyForm(id: string): Promise<{ ok: true } | { ok: false; error: string }>
  deleteMyForm(id: string): Promise<boolean>
}

const ERROR_KEYS: Record<string, StringKey> = {
  'unsupported-type': 'hpMyFormsUnsupported',
  'empty-name': 'hpMyFormsEmptyName',
  'not-saved': 'hpMyFormsSaveFirst',
  'unsaved-changes': 'hpMyFormsSaveFirst',
  'too-large': 'hpMyFormsTooLarge',
}

/** 탭 제목에서 확장자를 뺀 것: 양식 이름의 처음 값 */
const stem = (title: string) => title.replace(/\.(docx|hwpx?)$/i, '')

export function MyFormsSection(p: {
  api: MyFormsApi
  onOpened(): void
  /** the tab to save (from the tab menu): picked in the list, the name field focused */
  saveTabId?: string
}) {
  const { t } = useI18n()
  const { api } = p
  const [forms, setForms] = useState<MyFormSummary[]>([])
  const [sources, setSources] = useState<MyFormSourceSummary[]>([])
  const [source, setSource] = useState('')
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const { saveTabId } = p
  const [focusName, setFocusName] = useState(false)
  // the name field exists once the list of documents is in
  useEffect(() => {
    if (!focusName || !nameInput.current) return
    nameInput.current.focus()
    nameInput.current.select()
    setFocusName(false)
  }, [focusName, sources])

  const refresh = useCallback(
    () =>
      api
        .myForms()
        .then(setForms)
        .catch((e: unknown) => setError(String(e))),
    [api],
  )

  useEffect(() => {
    void refresh()
    void api
      .myFormSources()
      .then((list) => {
        setSources(list)
        const wanted = list.find((s) => s.tabId === saveTabId)
        const first = wanted ?? list[0]
        if (first) {
          setSource(first.tabId)
          setName(stem(first.title))
        }
        if (wanted) setFocusName(true)
      })
      .catch(() => setSources([]))
  }, [api, refresh, saveTabId])

  const explain = (code: string) => {
    if (code === 'canceled') return
    const key = ERROR_KEYS[code]
    setError(key ? t(key) : t('hpTemplatesFailed', { error: code }))
  }

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await work()
    } catch (e) {
      setError(t('hpTemplatesFailed', { error: String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const answer = await api.saveMyForm(source, name)
      if (!answer.ok) return explain(answer.error)
      setNotice(t('hpMyFormsSaved', { name: answer.form.name }))
      await refresh()
    })

  const add = () =>
    run(async () => {
      const answer = await api.importMyForm()
      if (!answer.ok) return explain(answer.error)
      await refresh()
    })

  const open = (id: string) =>
    run(async () => {
      const answer = await api.openMyForm(id)
      if (answer.ok) p.onOpened()
      else explain(answer.error)
    })

  const remove = (id: string) =>
    run(async () => {
      setConfirming(null)
      await api.deleteMyForm(id)
      await refresh()
    })

  return (
    <section data-section="my-forms" className="hp-my-forms">
      <div className="hp-my-forms-head">
        <h3>{t('hpMyForms')}</h3>
        <button type="button" disabled={busy} onClick={() => void add()}>
          {t('hpMyFormsAdd')}
        </button>
      </div>
      {error && (
        <p className="hp-tpl-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="hp-tpl-note" role="status">
          {notice}
        </p>
      )}
      <div className="hp-my-forms-save" data-my-form-save="">
        {sources.length === 0 ? (
          <p className="hp-tpl-note">{t('hpMyFormsNoSource')}</p>
        ) : (
          <>
            <label>
              {t('hpMyFormsSource')}
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value)
                  const picked = sources.find((s) => s.tabId === e.target.value)
                  if (picked) setName(stem(picked.title))
                }}
              >
                {sources.map((s) => (
                  <option key={s.tabId} value={s.tabId}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('hpMyFormsName')}
              <input
                ref={nameInput}
                type="text"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && void save()}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => void save()}>
              {t('hpMyFormsSave')}
            </button>
          </>
        )}
      </div>
      {forms.length === 0 ? (
        <p className="hp-tpl-note">{t('hpMyFormsEmpty')}</p>
      ) : (
        <div className="hp-tpl-grid">
          {forms.map((form) => (
            <div key={form.id} className="hp-tpl-card" data-my-form={form.id}>
              <div className="hp-tpl-title">
                {form.name}{' '}
                <span className="hp-my-form-type">
                  {t(form.type === 'docx' ? 'hpMyFormsTypeDocx' : 'hpMyFormsTypeHwp')}
                </span>
              </div>
              {confirming === form.id ? (
                <>
                  <div className="hp-tpl-desc">
                    {t('hpMyFormsDeleteConfirm', { name: form.name })}
                  </div>
                  <div className="hp-tpl-actions">
                    <button type="button" disabled={busy} onClick={() => void remove(form.id)}>
                      {t('hpMyFormsDeleteYes')}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)}>
                      {t('hpMyFormsCancel')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="hp-tpl-actions">
                  <button type="button" disabled={busy} onClick={() => void open(form.id)}>
                    {t('hpMyFormsOpen')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError(null)
                      setConfirming(form.id)
                    }}
                  >
                    {t('hpMyFormsDelete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
