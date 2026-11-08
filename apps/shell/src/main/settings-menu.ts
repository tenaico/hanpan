/**
 * ☰ 메뉴의 "설정…" 항목(0.17 리뷰 #5). 설정으로 가는 길이 홈 왼쪽 아래 계정 칩뿐이라
 * 어느 탭에서든 ☰ 메뉴로 열 수 있게 한다. Ctrl+, 키는 tab-shortcuts가 받으므로
 * 여기서는 단축키를 표시만 한다(워드 문서 안의 Ctrl+,는 아래 첨자로 남는다).
 * 글자는 메인 문자열 표와 따로 두어 다른 작업과 겹치지 않게 했다.
 */
import type { MenuItemConstructorOptions } from 'electron'

const LABELS: Readonly<Record<string, string>> = {
  ko: '설정…',
  en: 'Settings…',
  zh: '设置…',
  'zh-tw': '設定…',
  ja: '設定…',
  fr: 'Paramètres…',
  de: 'Einstellungen…',
  es: 'Configuración…',
  th: 'การตั้งค่า…',
  id: 'Pengaturan…',
  ru: 'Настройки…',
  ar: 'الإعدادات…',
  pt: 'Configurações…',
  it: 'Impostazioni…',
  pl: 'Ustawienia…',
  cs: 'Nastavení…',
  nl: 'Instellingen…',
  ms: 'Tetapan…',
  he: 'הגדרות…',
  hi: 'सेटिंग्स…',
  vi: 'Cài đặt…',
}

export function settingsMenuLabel(lang: string): string {
  const tag = lang.trim().toLowerCase().replace('_', '-')
  return LABELS[tag] ?? LABELS[tag.split('-')[0]!] ?? LABELS.en!
}

/**
 * `onHome`: the Ctrl+, hint shows only where the key opens Settings (Home and
 * the strip); in an editor Word keeps Ctrl+, for subscript (0.17 리뷰 v2 shell #21).
 */
export function settingsMenuItem(
  lang: string,
  open: () => void,
  onHome = true,
): MenuItemConstructorOptions {
  return {
    label: settingsMenuLabel(lang),
    ...(onHome ? { accelerator: 'CmdOrCtrl+,', registerAccelerator: false } : {}),
    click: () => open(),
  }
}
