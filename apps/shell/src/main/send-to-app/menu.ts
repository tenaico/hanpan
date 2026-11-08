/**
 * "다른 앱으로 보내기" 하위 메뉴. ☰ 메뉴(앞에 있는 탭)와 탭 오른쪽 클릭 메뉴에서
 * "공유하기…" 바로 아래에 놓인다. 대상은 편집기 이름이고, 끝의 "마크다운으로 먼저 보고
 * 고치기"는 중간 Markdown을 AI 마크다운의 새 문서로 연다(거기서 고친 뒤 다시 보낸다).
 */
import type { MenuItemConstructorOptions } from 'electron'
import type { TabKind } from '../../shared/tabs-api'
import { sendLabel } from './labels'
import { sendTargetsFor, type SendTarget } from './targets'

export interface SendMenuInput {
  kind: TabKind
  /** 한국 문서 기능(결정 0091): 꺼지면 AI 한글이 빠진다 */
  korean: boolean
  lang: string
  /** 편집기 이름(메인 문자열 표의 menuNewDoc 등) */
  targetName(target: SendTarget): string
  send(target: SendTarget): void
  /** 탭이 문서로 쓰일 수 없을 때(떼어 낼 수 없는 탭 등) 꺼 둔다 */
  enabled?: boolean
}

/** 보낼 수 없는 탭(홈·도움말·그림 탭)에서는 null: 항목을 두지 않는다 */
export function sendToAppMenuItem(input: SendMenuInput): MenuItemConstructorOptions | null {
  const targets = sendTargetsFor(input.kind, input.korean)
  if (targets.length === 0) return null
  const editors = targets.filter((t) => t !== 'markdown')
  const submenu: MenuItemConstructorOptions[] = editors.map((target) => ({
    id: `sendToApp:${target}`,
    label: input.targetName(target),
    click: () => input.send(target),
  }))
  if (targets.includes('markdown')) {
    submenu.push(
      { type: 'separator' },
      {
        id: 'sendToApp:markdown',
        label: sendLabel(input.lang, 'menuSendViaMarkdown'),
        click: () => input.send('markdown'),
      },
    )
  }
  return {
    id: 'sendToApp',
    label: sendLabel(input.lang, 'menuSendToApp'),
    enabled: input.enabled !== false,
    submenu,
  }
}
