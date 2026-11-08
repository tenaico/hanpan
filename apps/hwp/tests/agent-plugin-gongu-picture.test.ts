/** @vitest-environment jsdom */
/**
 * 0.17.1 #15: the HWP editor's Picture button and Insert menu offer Gongu pictures, as the
 * Word and PowerPoint editors do. The plugin puts the choice into the embedded editor: the
 * toolbar's Picture button asks "this PC / Gongu", the Insert menu gets a Gongu item right
 * under Picture, and picking Gongu fires GONGU_PICTURE_EVENT for the app, which opens the
 * shared Gongu picker and inserts the picture at the caret with its credit line.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GONGU_PICTURE_EVENT,
  agentPlugin,
  type AgentPluginHost,
} from '../studio-plugin/agent-plugin.mjs'

const LABELS = { fromPc: '이 PC에서 고르기…', gongu: '공유마당에서 찾기…' }

function editor() {
  document.body.innerHTML = `
    <div id="menu-bar">
      <div class="md-dropdown" data-menu="insert">
        <div class="md-item" data-cmd="insert:shape">도형</div>
        <div class="md-item" data-cmd="insert:image">그림</div>
        <div class="md-item" data-cmd="insert:textbox">글상자</div>
      </div>
    </div>
    <div class="toolbar"><button class="tb-btn" data-cmd="insert:image">그림</button></div>`
  const studioClick = vi.fn()
  // the editor runs a toolbar button's command from a listener of its own
  document.querySelector('.toolbar')!.addEventListener('click', studioClick)
  const commands = new Map<string, { label: string; execute(): void }>()
  const executed: string[] = []
  const host = {
    read: () => undefined,
    transaction: () => undefined,
    events: { on: () => 0 },
    automation: {
      execute: (id: string) => {
        executed.push(id)
        commands.get(id)?.execute()
        return null
      },
      registerCommand: (command: { id: string; label: string; execute(): void }) => {
        if (commands.has(command.id)) throw new Error(`already registered: ${command.id}`)
        commands.set(command.id, command)
      },
      // as the editor does it: the item goes at the bottom of the named menu
      addMenuItem: (spec: { menuId: string; commandId: string }) => {
        const menu = document.querySelector(`[data-menu="${spec.menuId}"]`)
        if (!menu) throw new Error(`no menu ${spec.menuId}`)
        const item = document.createElement('div')
        item.className = 'md-item'
        item.dataset.cmd = spec.commandId
        item.textContent = commands.get(spec.commandId)?.label ?? ''
        menu.appendChild(item)
      },
    },
  } as unknown as AgentPluginHost
  return { plugin: agentPlugin.activate(host), commands, executed, studioClick }
}

const fired = vi.fn()
beforeEach(() => window.addEventListener(GONGU_PICTURE_EVENT, fired))
afterEach(() => {
  window.removeEventListener(GONGU_PICTURE_EVENT, fired)
  fired.mockReset()
  document.body.innerHTML = ''
})

const menuItems = () =>
  [...document.querySelectorAll('[data-menu="insert"] .md-item')].map(
    (item) => (item as HTMLElement).dataset.cmd,
  )
const popup = () => document.querySelector<HTMLElement>('.context-menu.ieum-picture-choice')

describe('the Gongu choice of the Picture command', () => {
  it('puts a Gongu item right under Picture in the Insert menu', () => {
    const { plugin, commands } = editor()
    expect(plugin.installPictureChoice(LABELS)).toEqual({ ok: true })
    expect(menuItems()).toEqual([
      'insert:shape',
      'insert:image',
      'ext:ieum-gongu-picture',
      'insert:textbox',
    ])
    commands.get('ext:ieum-gongu-picture')!.execute()
    expect(fired).toHaveBeenCalledTimes(1)
  })

  it('asks "this PC or Gongu" on the toolbar button instead of opening the file window', () => {
    const { plugin, executed, studioClick } = editor()
    plugin.installPictureChoice(LABELS)
    document.querySelector<HTMLButtonElement>('.toolbar [data-cmd="insert:image"]')!.click()
    expect(studioClick).not.toHaveBeenCalled()
    expect(executed).toEqual([])
    const items = [...popup()!.querySelectorAll<HTMLElement>('.md-item')]
    expect(items.map((item) => item.textContent)).toEqual([LABELS.fromPc, LABELS.gongu])

    items[0]!.click()
    expect(executed).toEqual(['insert:image'])
    expect(popup()).toBeNull()

    document.querySelector<HTMLButtonElement>('.toolbar [data-cmd="insert:image"]')!.click()
    popup()!.querySelectorAll<HTMLElement>('.md-item')[1]!.click()
    expect(fired).toHaveBeenCalledTimes(1)
    expect(popup()).toBeNull()
  })

  it('closes the choice on Escape and on a press elsewhere', () => {
    const { plugin } = editor()
    plugin.installPictureChoice(LABELS)
    const button = document.querySelector<HTMLButtonElement>('.toolbar [data-cmd="insert:image"]')!
    button.click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(popup()).toBeNull()
    button.click()
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(popup()).toBeNull()
    // a second press on the button closes it as well
    button.click()
    button.click()
    expect(popup()).toBeNull()
  })

  it('installs once: a second call leaves one menu item and one listener', () => {
    const { plugin } = editor()
    plugin.installPictureChoice(LABELS)
    plugin.installPictureChoice(LABELS)
    expect(menuItems().filter((id) => id === 'ext:ieum-gongu-picture')).toHaveLength(1)
    document.querySelector<HTMLButtonElement>('.toolbar [data-cmd="insert:image"]')!.click()
    expect(document.querySelectorAll('.ieum-picture-choice')).toHaveLength(1)
  })

  it('refuses labels it cannot show', () => {
    const { plugin } = editor()
    expect(() => plugin.installPictureChoice({ fromPc: '', gongu: 'x' })).toThrow(/fromPc/)
  })
})
