import { useI18n } from '../i18n/locale'

/**
 * 새(빈) 웹 문서의 첫 화면. 하얀 미리보기만 보이면 무엇을 해야 할지 알 수 없으므로
 * AI 도우미에 설명하기, 제목과 문단으로 시작, HTML 소스 보기 세 갈래를 보여 준다.
 */
export function EmptyPageHint(props: {
  onAskAi: () => void
  onStarter: () => void
  onSource: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="empty-page-hint" role="note">
      <div className="empty-page-hint-card">
        <h2>{t('emptyPageTitle')}</h2>
        <p>{t('emptyPageBody')}</p>
        <div className="empty-page-hint-actions">
          <button type="button" className="primary" onClick={props.onAskAi}>
            {t('emptyPageAskAi')}
          </button>
          <button type="button" onClick={props.onStarter}>
            {t('emptyPageStarter')}
          </button>
          <button type="button" onClick={props.onSource}>
            {t('emptyPageSource')}
          </button>
        </div>
      </div>
    </div>
  )
}
