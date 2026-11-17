/**
 * The Edit menu of AI Drawing tabs. Undo and redo go to the drawing like the
 * mind map's; cut, copy and paste are the roles, so text fields (the property
 * panel, the AI box) keep them. macOS fires a menu accelerator even when it is
 * not registered, so there Select All and Delete carry no accelerator: the
 * page's own shortcuts take those keys and leave text fields alone.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import type { AppMenuLabels } from '@genoffice/electron-utils'
import { cadEditMenu } from '../src/main/cad-menu'

const labels = new Proxy({}, { get: (_t, key) => String(key) }) as AppMenuLabels

function items(platform: NodeJS.Platform) {
  const sent: string[] = []
  const command = vi.fn((cmd: string) => () => void sent.push(cmd))
  const menu = cadEditMenu(platform, labels, command)
  const list = menu.submenu as MenuItemConstructorOptions[]
  const byLabel = (label: string) => list.find((i) => i.label === label)
  return { menu, list, byLabel, sent }
}

describe('the AI Drawing Edit menu', () => {
  it.each(['darwin', 'win32'] as const)('%s: undo and redo go to the drawing', (platform) => {
    const { byLabel, sent } = items(platform)
    const undo = byLabel('undo')!
    const redo = byLabel('redo')!
    expect(undo.role).toBeUndefined()
    expect(undo.accelerator).toBe('CmdOrCtrl+Z')
    expect(undo.registerAccelerator).toBe(false)
    expect(redo.accelerator).toBe(platform === 'darwin' ? 'Shift+Cmd+Z' : 'Ctrl+Y')
    expect(redo.registerAccelerator).toBe(false)
    ;(undo.click as () => void)()
    ;(redo.click as () => void)()
    expect(sent).toEqual(['undo', 'redo'])
  })

  it.each(['darwin', 'win32'] as const)('%s: cut, copy and paste are the roles', (platform) => {
    const { list } = items(platform)
    const roles = list.map((i) => i.role).filter(Boolean)
    expect(roles).toEqual(expect.arrayContaining(['cut', 'copy', 'paste']))
    for (const role of ['cut', 'copy', 'paste']) {
      expect(list.find((i) => i.role === role)!.label).toBe(role)
    }
  })

  it('darwin: Select All and Delete carry no accelerator, so typing keeps Cmd+A and Delete', () => {
    const { byLabel, sent } = items('darwin')
    const all = byLabel('selectAll')!
    const del = byLabel('delete')!
    expect(all.accelerator).toBeUndefined()
    expect(del.accelerator).toBeUndefined()
    ;(all.click as () => void)()
    ;(del.click as () => void)()
    expect(sent).toEqual(['select-all', 'delete'])
  })

  it('win32: Select All and Delete show the keys but leave them to the page', () => {
    const { byLabel, sent } = items('win32')
    const all = byLabel('selectAll')!
    const del = byLabel('delete')!
    expect(all.accelerator).toBe('CmdOrCtrl+A')
    expect(all.registerAccelerator).toBe(false)
    expect(del.accelerator).toBe('Delete')
    expect(del.registerAccelerator).toBe(false)
    ;(all.click as () => void)()
    ;(del.click as () => void)()
    expect(sent).toEqual(['select-all', 'delete'])
  })

  it('is the Edit menu buildCadMenu uses', () => {
    const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const build = source.slice(source.indexOf('function buildCadMenu(): void {'))
    expect(build.slice(0, build.indexOf('\n}\n'))).toContain(
      'cadEditMenu(process.platform, labels, command),',
    )
  })
})
