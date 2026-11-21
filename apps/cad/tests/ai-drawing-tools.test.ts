// @vitest-environment node
/**
 * The AI's two drawing tools: read_drawing lists the entities of an opened
 * DXF or DWG (filtered and paged), edit_drawing changes them in one undo step,
 * and an edit made from an outdated reading is refused.
 */
import { describe, expect, it } from 'vitest'
import { addPart, createDocument, type DrawingPart } from '@genoffice/cad-engine'
import { CadSession } from '../src/renderer/document/session'
import { CAD_TOOL_NAMES, runCadTool, type CadToolResult } from '../src/renderer/ai/cad-tools'
import { createCadSkill } from '../src/renderer/ai/cad-skill'

function drawingSession(): CadSession {
  const part: DrawingPart = {
    id: 'plan',
    type: 'drawing',
    name: '회의실',
    role: 'solid',
    color: '#888888',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hidden: false,
    locked: false,
    entities: [
      { kind: 'line', a: [0, 0], b: [5000, 0], layer: 'WALL' },
      { kind: 'line', a: [5000, 0], b: [5000, 4000], layer: 'WALL' },
      { kind: 'circle', center: [1000, 500], radius: 450, layer: 'DOOR' },
      { kind: 'text', at: [200, 200], height: 250, rotationDeg: 0, value: '회의실', layer: 'TEXT' },
    ],
  }
  return new CadSession(addPart(createDocument(), part), { title: 'Test' })
}

function okData<T = Record<string, unknown>>(result: CadToolResult): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.data as T
}

interface Reading {
  rev: number
  total: number
  matched: number
  layers: { layer: string; count: number }[]
  entities: { i: number; kind: string; layer: string; text?: string }[]
}

const entities = (s: CadSession) => (s.history.current().parts[0] as DrawingPart).entities

describe('read_drawing', () => {
  it('lists every entity with its index, the layers and a revision', () => {
    const session = drawingSession()
    const r = okData<Reading>(runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan' }))
    expect(r.total).toBe(4)
    expect(r.layers).toEqual([
      { layer: 'WALL', count: 2 },
      { layer: 'DOOR', count: 1 },
      { layer: 'TEXT', count: 1 },
    ])
    expect(r.entities.map((e) => e.i)).toEqual([0, 1, 2, 3])
    expect(r.entities[3]).toMatchObject({ kind: 'text', text: '회의실' })
    expect(typeof r.rev).toBe('number')
  })

  it('filters by layer, kind and text, and pages', () => {
    const session = drawingSession()
    const wall = okData<Reading>(
      runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan', layer: 'WALL', limit: 1 }),
    )
    expect(wall.matched).toBe(2)
    expect(wall.entities.map((e) => e.i)).toEqual([0])
    const text = okData<Reading>(
      runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan', contains: '회의' }),
    )
    expect(text.entities.map((e) => e.i)).toEqual([3])
  })

  it('refuses a part that is not a drawing', () => {
    const session = drawingSession()
    const result = runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'nope' })
    expect(result.ok).toBe(false)
  })
})

describe('edit_drawing', () => {
  it('changes text, moves, deletes and adds in one undo step', () => {
    const session = drawingSession()
    const { rev } = okData<Reading>(runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan' }))
    const result = runCadTool(session, CAD_TOOL_NAMES.editDrawing, {
      id: 'plan',
      rev,
      set: [{ index: 3, text: '대회의실' }],
      move: { indices: [2], dx: 100, dy: 0 },
      delete: [1],
      add: [{ kind: 'line', a: [0, 0], b: [0, 4000], layer: 'WALL' }],
    })
    okData(result)
    const now = entities(session)
    expect(now.map((e) => e.kind)).toEqual(['line', 'circle', 'text', 'line'])
    expect(now[1]).toMatchObject({ center: [1100, 500] })
    expect(now[2]).toMatchObject({ value: '대회의실' })
    expect(now[3]).toMatchObject({ a: [0, 0], b: [0, 4000] })
    session.history.undo()
    expect(entities(session)).toHaveLength(4)
    expect(entities(session)[3]).toMatchObject({ value: '회의실' })
  })

  it('refuses an edit made from an outdated reading, and changes nothing', () => {
    const session = drawingSession()
    const { rev } = okData<Reading>(runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan' }))
    okData(runCadTool(session, CAD_TOOL_NAMES.editDrawing, { id: 'plan', rev, delete: [0] }))
    const stale = runCadTool(session, CAD_TOOL_NAMES.editDrawing, {
      id: 'plan',
      rev,
      delete: [0],
    })
    expect(stale.ok).toBe(false)
    expect(entities(session)).toHaveLength(3)
  })

  it('refuses a bad index without changing anything', () => {
    const session = drawingSession()
    const { rev } = okData<Reading>(runCadTool(session, CAD_TOOL_NAMES.readDrawing, { id: 'plan' }))
    const result = runCadTool(session, CAD_TOOL_NAMES.editDrawing, {
      id: 'plan',
      rev,
      delete: [0, 99],
    })
    expect(result.ok).toBe(false)
    expect(entities(session)).toHaveLength(4)
  })

  it('the skill offers both tools and wraps the entity list as data', () => {
    const session = drawingSession()
    const skill = createCadSkill({ session: () => session })
    const names = skill.tools.map((t) => t.name)
    expect(names).toContain(CAD_TOOL_NAMES.readDrawing)
    expect(names).toContain(CAD_TOOL_NAMES.editDrawing)
    const out = skill.executeTool({
      id: 'c1',
      name: CAD_TOOL_NAMES.readDrawing,
      input: { id: 'plan' },
    } as never)
    expect((out as { output: string }).output).toContain('<drawing_entities>')
  })
})
