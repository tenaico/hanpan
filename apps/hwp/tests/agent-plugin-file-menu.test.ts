/**
 * The File menu items the plugin puts into the embedded editor, which leaves out its own Save
 * and Print: what is registered, in which order the items stand, and what clicking one fires.
 */
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import {
  FILE_COMMAND_EVENT,
  agentPlugin,
  type AgentPluginHost,
} from '../studio-plugin/agent-plugin.mjs'
import { APP_FILE_COMMANDS } from '../studio-plugin/hancom-keys.mjs'

const LABELS = {
  open: '열기…',
  save: '저장',
  saveAs: '다른 이름으로 저장…',
  pdf: 'PDF로 내보내기…',
  docx: 'Word 문서로 내보내기…',
  png: '이미지로 내보내기(모든 쪽)…',
  pngPage: '이미지로 내보내기(지금 쪽)…',
  print: '인쇄…',
}

interface Registered {
  id: string
  label: string
  shortcutLabel?: string
  execute(services: never, params?: never): void
}

function editor(withMenu = true) {
  const commands = new Map<string, Registered>()
  // the File menu as the editor keeps it: commandIds from top to bottom
  const menu = ['file:page-setup', 'file:about']
  const host = {
    read: () => undefined,
    transaction: () => undefined,
    events: { on: () => 0 },
    automation: {
      execute: () => ({ ok: false }),
      registerCommand: (command: Registered) => {
        if (commands.has(command.id)) throw new Error(`already registered: ${command.id}`)
        commands.set(command.id, command)
      },
      addMenuItem: (spec: { menuId: string; commandId: string; position?: 'top' | 'bottom' }) => {
        if (!withMenu || spec.menuId !== 'file') throw new Error(`no menu ${spec.menuId}`)
        const at = menu.indexOf(spec.commandId)
        if (at >= 0) menu.splice(at, 1)
        if (spec.position === 'top') menu.unshift(spec.commandId)
        else menu.push(spec.commandId)
      },
    },
  } as unknown as AgentPluginHost
  return { plugin: agentPlugin.activate(host), commands, menu }
}

const fired: unknown[] = []
const scope = globalThis as { dispatchEvent?: (event: Event) => boolean }
const original = scope.dispatchEvent
scope.dispatchEvent = (event: Event) => {
  if (event.type === FILE_COMMAND_EVENT) fired.push((event as CustomEvent).detail)
  return true
}

afterEach(() => {
  fired.length = 0
})

describe('the File menu of the embedded editor', () => {
  it('gets Open, Save, Save As, the exports (PDF, Word, images) and Print on top, in that order', () => {
    const { plugin, commands, menu } = editor()
    expect(plugin.installFileMenu(LABELS)).toEqual({ ok: true })
    expect(menu).toEqual([
      'ext:ieum-open',
      'ext:ieum-save',
      'ext:ieum-save-as',
      'ext:ieum-export-pdf',
      'ext:ieum-export-docx',
      'ext:ieum-export-png',
      'ext:ieum-export-png-page',
      'ext:ieum-print',
      'file:page-setup',
      'file:about',
    ])
    expect(commands.get('ext:ieum-save')).toMatchObject({ label: '저장', shortcutLabel: 'Ctrl+S' })
    expect(commands.get('ext:ieum-save-as')).toMatchObject({ shortcutLabel: 'Ctrl+Shift+S' })
    expect(commands.get('ext:ieum-open')).toMatchObject({ label: '열기…', shortcutLabel: 'Ctrl+O' })
    expect(commands.get('ext:ieum-export-pdf')?.shortcutLabel).toBeUndefined()
  })

  it('hands each command to the app as an event on the editor window', () => {
    const { plugin, commands } = editor()
    plugin.installFileMenu(LABELS)
    for (const id of [
      'ext:ieum-open',
      'ext:ieum-save',
      'ext:ieum-save-as',
      'ext:ieum-export-pdf',
      'ext:ieum-export-docx',
      'ext:ieum-export-png',
      'ext:ieum-export-png-page',
      'ext:ieum-print',
    ]) {
      commands.get(id)?.execute(undefined as never)
    }
    expect(fired).toEqual(['open', 'save', 'saveAs', 'pdf', 'docx', 'png', 'pngPage', 'print'])
  })

  it("registers every command the editor's file keys are sent to", () => {
    const { plugin, commands } = editor()
    plugin.installFileMenu(LABELS)
    for (const id of Object.values(APP_FILE_COMMANDS)) expect(commands.has(id), id).toBe(true)
  })

  it('puts the items back once when asked again, without registering twice', () => {
    const { plugin, menu } = editor()
    plugin.installFileMenu(LABELS)
    expect(plugin.installFileMenu(LABELS)).toEqual({ ok: true })
    expect(menu.filter((id) => id.startsWith('ext:'))).toHaveLength(8)
  })

  it('says so when the editor has no File menu, and refuses missing labels', () => {
    expect(editor(false).plugin.installFileMenu(LABELS)).toEqual({ ok: false })
    expect(() => editor().plugin.installFileMenu({ ...LABELS, print: '' })).toThrow(/print/)
  })
})

afterAll(() => {
  if (original === undefined) delete scope.dispatchEvent
  else scope.dispatchEvent = original
})
