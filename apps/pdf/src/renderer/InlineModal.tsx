import type { ReactElement, ReactNode } from 'react'
import { useModalDialog } from './modal-dialog'

/**
 * App.tsx 안에 바로 그리는 작은 .pdf-modal 대화상자의 공통 틀. 따로 만든 대화상자
 * (StampDialog 등)와 같게 Esc·바깥 클릭으로 닫히고, 열 때 첫 칸에 초점을 두며
 * 닫으면 연 단추로 초점을 돌려준다.
 */
export function InlineModal({
  label,
  onCancel,
  className,
  children,
}: {
  label: string
  onCancel: () => void
  className?: string
  children: ReactNode
}): ReactElement {
  const dialogRef = useModalDialog(onCancel)
  return (
    <div className="pdf-modal-mask" onClick={onCancel}>
      <div
        ref={dialogRef}
        className={className ? `pdf-modal ${className}` : 'pdf-modal'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
