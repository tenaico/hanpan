/**
 * Hanpan: the template picker on the Home screen. The 글집 templates (official
 * letters, reports, proposals, minutes, plans) grouped by kind; each opens as a
 * new untitled HWP or Word document laid out like a Hanpan report, or as a
 * mind map of its headings and lists. The official forms (서식) open as a copy of
 * the HWP file the law publishes, so they offer HWP only.
 */
import { useEffect, useMemo, useState } from 'react'
import { useDialogKeys } from '../dialog-keys'
import { useI18n } from '../locale'
import type { MarkdownConverterApi } from './MarkdownConverter'
import { MyFormsSection, type MyFormsApi } from './MyForms'

export interface TemplateSummary {
  id: string
  title: string
  category: string
  description: string
  icon: string
  /** an official form: the statute it is attached to, e.g. 「…시행규칙」 별지 제3호서식 (…개정) */
  form?: string
}

export interface HanpanApi extends Partial<MarkdownConverterApi>, Partial<MyFormsApi> {
  templates(): Promise<TemplateSummary[]>
  openTemplate(
    id: string,
    target: 'hwp' | 'docx' | 'xmind',
  ): Promise<{ ok: true } | { ok: false; error: string }>
  openDesign?(): Promise<void>
  /** a new mind map with `topic` as its central topic */
  newMap?(topic: string): Promise<{ ok: true } | { ok: false; error: string }>
  /** a tab's "내 양식으로 저장…": open this dialog ready to save that tab; returns unsubscribe */
  onSaveMyFormRequest?(listener: (tabId: string) => void): () => void
  onOpenTemplatesRequest?(listener: () => void): () => void
}

declare global {
  interface Window {
    hanpanApi?: HanpanApi
  }
}

/** The order the kinds are shown in: public-sector letters first. */
const CATEGORY_ORDER = [
  '공문',
  '서식',
  '보고서',
  '제안서',
  '회의록',
  '메모',
  '사업기획',
  '교육',
  '콘텐츠',
  '기타',
]

/** the 내 양식 calls, only when every one of them is there */
function myFormsApiOf(api: HanpanApi | undefined): MyFormsApi | null {
  if (
    !api?.myForms ||
    !api.myFormSources ||
    !api.saveMyForm ||
    !api.importMyForm ||
    !api.openMyForm ||
    !api.deleteMyForm
  )
    return null
  return api as MyFormsApi
}

export function TemplatePicker(p: {
  onClose(): void
  /** opened from a tab's "내 양식으로 저장…": that document is the one to save */
  saveTabId?: string
}) {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const dialogRef = useDialogKeys(p.onClose)
  // the user's own forms, when this build's preload offers them
  const [myFormsApi] = useState(() => myFormsApiOf(window.hanpanApi))

  useEffect(() => {
    void window.hanpanApi
      ?.templates()
      .then(setTemplates)
      .catch((e: unknown) => setError(String(e)))
  }, [])

  const groups = useMemo(() => {
    const by = new Map<string, TemplateSummary[]>()
    for (const tpl of templates) by.set(tpl.category, [...(by.get(tpl.category) ?? []), tpl])
    return [...by].sort(
      ([a], [b]) =>
        ((CATEGORY_ORDER.indexOf(a) + 99) % 99) - ((CATEGORY_ORDER.indexOf(b) + 99) % 99),
    )
  }, [templates])

  const open = async (id: string, target: 'hwp' | 'docx' | 'xmind') => {
    setBusy(`${id}:${target}`)
    setError(null)
    const result = await window.hanpanApi
      ?.openTemplate(id, target)
      .catch((e: unknown) => ({ ok: false as const, error: String(e) }))
    setBusy(null)
    if (result?.ok) p.onClose()
    else setError(t('hpTemplatesFailed', { error: result && !result.ok ? result.error : '?' }))
  }

  return (
    <div
      className="hp-tpl-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}
    >
      <div
        className="hp-tpl"
        role="dialog"
        aria-modal="true"
        aria-label={t('hpTemplatesTitle')}
        ref={dialogRef}
      >
        <div className="hp-tpl-head">
          <h2>{t('hpTemplatesTitle')}</h2>
          <button
            type="button"
            className="hp-tpl-close"
            onClick={p.onClose}
            aria-label={t('hpTemplatesClose')}
          >
            ×
          </button>
        </div>
        {error && (
          <p className="hp-tpl-error" role="alert">
            {error}
          </p>
        )}
        <div className="hp-tpl-body">
          {myFormsApi && (
            <MyFormsSection api={myFormsApi} onOpened={p.onClose} saveTabId={p.saveTabId} />
          )}
          {groups.map(([category, list]) => (
            <section key={category}>
              <h3>{category}</h3>
              {list.some((tpl) => tpl.form) && (
                <p className="hp-tpl-note">{t('hpTemplatesFormsNote')}</p>
              )}
              <div className="hp-tpl-grid">
                {list.map((tpl) => (
                  <div key={tpl.id} className="hp-tpl-card" data-template={tpl.id}>
                    <div className="hp-tpl-title">
                      <span aria-hidden="true">{tpl.icon}</span> {tpl.title}
                    </div>
                    <div className="hp-tpl-desc">{tpl.description}</div>
                    {tpl.form && <div className="hp-tpl-source">{tpl.form}</div>}
                    <div className="hp-tpl-actions">
                      <button
                        type="button"
                        disabled={busy !== null}
                        data-open="hwp"
                        onClick={() => void open(tpl.id, 'hwp')}
                      >
                        {t('hpTemplatesHwp')}
                      </button>
                      {!tpl.form && (
                        <>
                          <button
                            type="button"
                            disabled={busy !== null}
                            data-open="docx"
                            onClick={() => void open(tpl.id, 'docx')}
                          >
                            {t('hpTemplatesDocx')}
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            data-open="xmind"
                            onClick={() => void open(tpl.id, 'xmind')}
                          >
                            {t('hpTemplatesMap')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
