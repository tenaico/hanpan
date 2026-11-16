/**
 * What the screen makes of each way a path can open: a drawing with its path,
 * an untitled drawing built from an imported file, or an empty untitled
 * drawing with the reason the file did not open.
 */
import { describe, expect, it } from 'vitest'
import { addShape, createDocument, makeMesh, saveCadFile, writeStl } from '@genoffice/cad-engine'
import { openResultToSession } from '../src/renderer/document/open'
import type { OpenFileResult } from '../src/shared/ipc'

const UNTITLED = 'Untitled Drawing'
const enc = (text: string): Uint8Array => new TextEncoder().encode(text)

/** A closed tetrahedron. */
const tetra = makeMesh(
  [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10],
  [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3],
)

const OBJ = [
  'v 0 0 0',
  'v 10 0 0',
  'v 0 10 0',
  'v 0 0 10',
  'f 1 3 2',
  'f 1 2 4',
  'f 1 4 3',
  'f 2 3 4',
].join('\n')

/** One LINE from (0, 0) to (40, 25), written as DXF group codes. */
const DXF = [
  '0',
  'SECTION',
  '2',
  'ENTITIES',
  '0',
  'LINE',
  '8',
  '0',
  '10',
  '0',
  '20',
  '0',
  '30',
  '0',
  '11',
  '40',
  '21',
  '25',
  '31',
  '0',
  '0',
  'ENDSEC',
  '0',
  'EOF',
  '',
].join('\n')

describe('openResultToSession', () => {
  it('ttukcad ok opens with its path', () => {
    const doc = addShape(createDocument(), 'box', { name: 'Base' }).doc
    const opened = openResultToSession(
      { status: 'ok', bytes: saveCadFile(doc) },
      UNTITLED,
      'C:/models/bracket.ttukcad',
    )
    expect(opened.notice).toBeNull()
    expect(opened.session.path()).toBe('C:/models/bracket.ttukcad')
    expect(opened.session.title()).toBe('bracket')
    expect(opened.session.dirty()).toBe(false)
    expect(opened.session.history.current().parts.map((p) => p.name)).toEqual(['Base'])
  })

  it('a restored copy opens with unsaved changes; an untitled one without its path', () => {
    const bytes = saveCadFile(createDocument())
    const file = openResultToSession(
      { status: 'ok', bytes, restored: 'file' },
      UNTITLED,
      'C:/models/a.ttukcad',
    )
    expect(file.session.dirty()).toBe(true)
    expect(file.session.path()).toBe('C:/models/a.ttukcad')
    const untitled = openResultToSession(
      { status: 'ok', bytes, restored: 'untitled' },
      UNTITLED,
      'Gear housing.ttukcad',
    )
    expect(untitled.session.dirty()).toBe(true)
    expect(untitled.session.path()).toBeUndefined()
    // the pending name of an untitled copy is its title, not a path
    expect(untitled.session.title()).toBe('Gear housing')
  })

  it('ttukcad not ok opens empty with notice not-ok and no path', () => {
    for (const status of ['broken', 'empty', 'unsupported'] as const) {
      const opened = openResultToSession({ status }, UNTITLED, 'C:/models/bad.ttukcad')
      expect(opened.notice, status).toBe('not-ok')
      expect(opened.session.path(), status).toBeUndefined()
      expect(opened.session.title(), status).toBe(UNTITLED)
      expect(opened.session.history.current().parts, status).toEqual([])
    }
    // bytes the engine itself does not open count the same
    const garbled = openResultToSession(
      { status: 'ok', bytes: enc('{ not json') },
      UNTITLED,
      'C:/models/bad.ttukcad',
    )
    expect(garbled.notice).toBe('not-ok')
    expect(garbled.session.path()).toBeUndefined()
  })

  it('stl import makes one mesh part titled by the file name', () => {
    const opened = openResultToSession(
      { status: 'import', bytes: writeStl(tetra), name: 'gear', ext: 'stl' },
      UNTITLED,
      'C:/models/gear.stl',
    )
    expect(opened.notice).toBeNull()
    expect(opened.session.title()).toBe('gear')
    expect(opened.session.path()).toBeUndefined()
    expect(opened.session.dirty()).toBe(false)
    const parts = opened.session.history.current().parts
    expect(parts).toHaveLength(1)
    expect(parts[0]!.type).toBe('mesh')
    expect(parts[0]!.name).toBe('gear')
    if (parts[0]!.type === 'mesh') expect(parts[0]!.closed).toBe(true)
  })

  it('obj import makes one mesh part', () => {
    const opened = openResultToSession(
      { status: 'import', bytes: enc(OBJ), name: 'tetra', ext: 'obj' },
      UNTITLED,
      'C:/models/tetra.obj',
    )
    expect(opened.notice).toBeNull()
    expect(opened.session.history.current().parts.map((p) => p.type)).toEqual(['mesh'])
  })

  it('dxf import makes one drawing part', () => {
    const opened = openResultToSession(
      { status: 'import', bytes: enc(DXF), name: 'plan', ext: 'dxf' },
      UNTITLED,
      'C:/models/plan.dxf',
    )
    expect(opened.notice).toBeNull()
    expect(opened.session.title()).toBe('plan')
    const parts = opened.session.history.current().parts
    expect(parts).toHaveLength(1)
    expect(parts[0]!.type).toBe('drawing')
    if (parts[0]!.type === 'drawing') expect(parts[0]!.entities).toHaveLength(1)
  })

  it('an import that does not read opens empty with import-failed', () => {
    const opened = openResultToSession(
      { status: 'import', bytes: enc('solid nothing here'), name: 'junk', ext: 'stl' },
      UNTITLED,
      'C:/models/junk.stl',
    )
    expect(opened.notice).toBe('import-failed')
    expect(opened.session.history.current().parts).toEqual([])
    expect(opened.session.path()).toBeUndefined()
  })

  it('error result opens empty with its notice', () => {
    const cases: [OpenFileResult, string][] = [
      [{ status: 'too-large' }, 'too-large'],
      [{ status: 'unreadable' }, 'unreadable'],
      [{ status: 'not-found' }, 'unreadable'],
      [{ status: 'unknown-type' }, 'unsupported'],
    ]
    for (const [result, notice] of cases) {
      const opened = openResultToSession(result, UNTITLED, 'C:/models/x.bin')
      expect(opened.notice, result.status).toBe(notice)
      expect(opened.session.path(), result.status).toBeUndefined()
      expect(opened.session.title(), result.status).toBe(UNTITLED)
      expect(opened.session.dirty(), result.status).toBe(false)
    }
  })
})
