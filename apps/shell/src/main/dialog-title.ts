/**
 * 제목 없는 메시지 상자에 화면 언어의 제품 이름을 넣는다(0.17 리뷰 #20).
 * 제목을 비우면 Windows가 앱 이름 "Hanpan"(영문)을 쓰기 때문에, 한국어 화면에서
 * 저장 확인 창 제목이 영어로 보였다. 각 편집기의 상자도 같은 dialog를 쓰므로
 * 셸에서 한 번 감싸면 모두 고쳐진다. 호출한 쪽이 준 제목은 그대로 둔다.
 */
interface MessageBoxDialog {
  showMessageBox: (...args: never[]) => unknown
  showMessageBoxSync: (...args: never[]) => unknown
}

function withTitle(args: unknown[], title: string): unknown[] {
  // (options) 또는 (window, options): 옵션은 message가 있는 쪽이다
  return args.map((arg) =>
    arg && typeof arg === 'object' && 'message' in arg && !(arg as { title?: unknown }).title
      ? { ...(arg as object), title }
      : arg,
  )
}

export function installDefaultDialogTitle(dialog: MessageBoxDialog, title: () => string): void {
  const box = dialog.showMessageBox.bind(dialog) as (...args: unknown[]) => unknown
  const sync = dialog.showMessageBoxSync.bind(dialog) as (...args: unknown[]) => unknown
  ;(dialog as { showMessageBox: unknown }).showMessageBox = (...args: unknown[]) =>
    box(...withTitle(args, title()))
  ;(dialog as { showMessageBoxSync: unknown }).showMessageBoxSync = (...args: unknown[]) =>
    sync(...withTitle(args, title()))
}
