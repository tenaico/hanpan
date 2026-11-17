// @vitest-environment node
/**
 * The AI's tools against a real session: every tool call is one
 * `history.edit`, refusals leave the drawing as it was, and the skill offers
 * exactly the eight tools with a prompt that names every shape. No model is
 * involved; the tools are called the way the agent loop calls them.
 */
import { describe, expect, it } from 'vitest'
import {
  SHAPE_DEFAULTS,
  SHAPE_DIMS,
  addShape,
  createDocument,
  createKernel,
  evaluatePart,
  meshVolume,
  type CadDocument,
  type Kernel,
  type ShapeKind,
} from '@genoffice/cad-engine'
import { CadSession } from '../src/renderer/document/session'
import { CAD_TOOL_NAMES, runCadTool, type CadToolResult } from '../src/renderer/ai/cad-tools'
import { createCadSkill } from '../src/renderer/ai/cad-skill'

function sessionOf(doc: CadDocument = createDocument()): CadSession {
  return new CadSession(doc, { title: 'Test' })
}

function okData<T = Record<string, unknown>>(result: CadToolResult): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.data as T
}

let kernel: Promise<Kernel> | undefined
const sharedKernel = (): Promise<Kernel> => (kernel ??= createKernel())

describe('runCadTool', () => {
  it('add_shapes places a box and returns its id', () => {
    const session = sessionOf()
    const result = runCadTool(session, CAD_TOOL_NAMES.addShapes, {
      shapes: [
        {
          kind: 'box',
          name: 'Base',
          dims: { width: 80, depth: 60, height: 10 },
          position: [5, 0, 0],
        },
      ],
    })
    const { ids } = okData<{ ids: string[] }>(result)
    expect(ids).toHaveLength(1)
    const part = session.history.current().parts[0]!
    expect(part.id).toBe(ids[0])
    expect(part).toMatchObject({
      type: 'shape',
      shape: 'box',
      name: 'Base',
      dims: { width: 80, depth: 60, height: 10 },
      position: [5, 0, 0],
    })
    // one tool call, one undo step
    expect(session.history.undo()).toBe(true)
    expect(session.history.current().parts).toHaveLength(0)
    expect(session.history.canUndo()).toBe(false)
  })

  it('add_shapes refuses 51 shapes', () => {
    const session = sessionOf()
    const before = session.history.current()
    const shapes = Array.from({ length: 51 }, () => ({ kind: 'box' }))
    const result = runCadTool(session, CAD_TOOL_NAMES.addShapes, { shapes })
    expect(result.ok).toBe(false)
    expect(session.history.current()).toBe(before)
    expect(session.history.canUndo()).toBe(false)
    // 50 is fine
    const fifty = runCadTool(session, CAD_TOOL_NAMES.addShapes, { shapes: shapes.slice(0, 50) })
    expect(okData<{ ids: string[] }>(fifty).ids).toHaveLength(50)
  })

  it('update_shapes with an unknown id returns unknown-id and leaves the model', () => {
    const made = addShape(createDocument(), 'box')
    const session = sessionOf(made.doc)
    const before = session.history.current()
    const result = runCadTool(session, CAD_TOOL_NAMES.updateShapes, {
      updates: [
        { id: made.id, dims: { width: 40 } },
        { id: 'nope', position: [1, 2, 3] },
      ],
    })
    expect(result).toMatchObject({ ok: false, code: 'unknown-id' })
    expect(session.history.current()).toBe(before)
    expect(session.history.canUndo()).toBe(false)
  })

  it('a zero width returns bad-number', () => {
    const session = sessionOf()
    const added = runCadTool(session, CAD_TOOL_NAMES.addShapes, {
      shapes: [{ kind: 'box', dims: { width: 0 } }],
    })
    expect(added).toMatchObject({ ok: false, code: 'bad-number' })
    expect(session.history.current().parts).toHaveLength(0)

    const made = addShape(createDocument(), 'box')
    const other = sessionOf(made.doc)
    const updated = runCadTool(other, CAD_TOOL_NAMES.updateShapes, {
      updates: [{ id: made.id, dims: { width: 0 } }],
    })
    expect(updated).toMatchObject({ ok: false, code: 'bad-number' })
    expect(other.history.current()).toBe(made.doc)
  })

  it('wrong input types are an error result and change nothing', () => {
    const session = sessionOf()
    const bad: unknown[] = [
      undefined,
      {},
      { shapes: 'box' },
      { shapes: [] },
      { shapes: [{ kind: 'blob' }] },
      { shapes: [{ kind: 'box', position: [1, 2] }] },
      { shapes: [{ kind: 'box', dims: { width: '10' } }] },
      { shapes: [{ kind: 'box', dims: { radius: 3 } }] },
      { shapes: [{ kind: 'box', role: 'cutter' }] },
    ]
    for (const input of bad) {
      expect(runCadTool(session, CAD_TOOL_NAMES.addShapes, input).ok).toBe(false)
    }
    expect(runCadTool(session, 'save_file', {}).ok).toBe(false)
    expect(session.history.canUndo()).toBe(false)
    // unknown keys are ignored
    const extra = runCadTool(session, CAD_TOOL_NAMES.addShapes, {
      shapes: [{ kind: 'cylinder', material: 'wood' }],
      note: 'x',
    })
    expect(extra.ok).toBe(true)
  })

  it('group_shapes of a cylinder and a hole cylinder makes a hole that evaluates', async () => {
    const session = sessionOf()
    const { ids } = okData<{ ids: string[] }>(
      runCadTool(session, CAD_TOOL_NAMES.addShapes, {
        shapes: [
          { kind: 'cylinder', name: 'Cup', dims: { diameter: 80, height: 100 } },
          {
            kind: 'cylinder',
            name: 'Inside',
            role: 'hole',
            dims: { diameter: 68, height: 100 },
            position: [0, 0, 5],
          },
        ],
      }),
    )
    const k = await sharedKernel()
    const solidVolume = meshVolume(evaluatePart(session.history.current().parts[0]!, k).mesh!)

    const grouped = runCadTool(session, CAD_TOOL_NAMES.groupShapes, { ids, name: 'Pencil cup' })
    const { id } = okData<{ id: string }>(grouped)
    const parts = session.history.current().parts
    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({ id, type: 'group', name: 'Pencil cup' })
    // grouping and naming are one step
    session.history.undo()
    expect(session.history.current().parts).toHaveLength(2)
    session.history.redo()

    const result = evaluatePart(session.history.current().parts[0]!, k)
    expect(result.issue).toBeNull()
    const cupVolume = meshVolume(result.mesh!)
    expect(cupVolume).toBeGreaterThan(0)
    expect(cupVolume).toBeLessThan(solidVolume * 0.5)

    const ungrouped = runCadTool(session, CAD_TOOL_NAMES.ungroupShapes, { id })
    expect(okData<{ ids: string[] }>(ungrouped).ids.sort()).toEqual([...ids].sort())
    expect(runCadTool(session, CAD_TOOL_NAMES.ungroupShapes, { id: ids[0] })).toMatchObject({
      ok: false,
      code: 'not-group',
    })
  })

  it('align_shapes centres on x', () => {
    const session = sessionOf()
    const { ids } = okData<{ ids: string[] }>(
      runCadTool(session, CAD_TOOL_NAMES.addShapes, {
        shapes: [
          { kind: 'box', dims: { width: 40, depth: 20, height: 20 }, position: [10, 0, 0] },
          { kind: 'box', dims: { width: 10, depth: 20, height: 20 }, position: [-50, 30, 0] },
        ],
      }),
    )
    const result = runCadTool(session, CAD_TOOL_NAMES.alignShapes, {
      ids,
      axis: 'x',
      anchor: 'center',
    })
    expect(result.ok).toBe(true)
    const [a, b] = session.history.current().parts
    expect(b!.position).toEqual([10, 30, 0])
    expect(a!.position).toEqual([10, 0, 0])
    expect(
      runCadTool(session, CAD_TOOL_NAMES.alignShapes, { ids, axis: 'w', anchor: 'center' }).ok,
    ).toBe(false)
  })

  it('set_workplane 5000 x 4000', () => {
    const session = sessionOf()
    const result = runCadTool(session, CAD_TOOL_NAMES.setWorkplane, { width: 5000, depth: 4000 })
    expect(result.ok).toBe(true)
    expect(session.history.current().workplane).toEqual({ width: 5000, depth: 4000, grid: 10 })
    expect(runCadTool(session, CAD_TOOL_NAMES.setWorkplane, {}).ok).toBe(false)
    expect(runCadTool(session, CAD_TOOL_NAMES.setWorkplane, { grid: -1 })).toMatchObject({
      ok: false,
      code: 'bad-number',
    })
  })

  it('read_model lists parts and caps at 50', () => {
    let doc = createDocument()
    for (let i = 0; i < 60; i++) {
      doc = addShape(doc, 'box', { name: `Desk ${i + 1}`, position: [i * 100, 0, 0] }).doc
    }
    const session = sessionOf(doc)
    const data = okData<{
      summary: string
      parts: { id: string; name: string }[]
      workplane: { width: number; depth: number; grid: number }
      size: { width: number; depth: number; height: number }
    }>(runCadTool(session, CAD_TOOL_NAMES.readModel, {}))
    expect(data.summary).toBe(session.summary())
    expect(data.summary).toContain('Desk 1 (box)')
    expect(data.summary).toContain('… and 10 more')
    expect(data.parts).toHaveLength(50)
    expect(data.parts[0]).toEqual({ id: doc.parts[0]!.id, name: 'Desk 1' })
    expect(data.workplane).toEqual({ width: 200, depth: 200, grid: 10 })
    // boxes 20 wide from x = -10 to 59 * 100 + 10
    expect(data.size).toEqual({ width: 5920, depth: 20, height: 20 })
  })

  it('delete_shapes removes in one step', () => {
    const session = sessionOf()
    const { ids } = okData<{ ids: string[] }>(
      runCadTool(session, CAD_TOOL_NAMES.addShapes, {
        shapes: [{ kind: 'sphere' }, { kind: 'cone' }, { kind: 'torus' }],
      }),
    )
    expect(runCadTool(session, CAD_TOOL_NAMES.deleteShapes, { ids: ids.slice(0, 2) }).ok).toBe(true)
    expect(session.history.current().parts.map((p) => p.id)).toEqual([ids[2]])
    session.history.undo()
    expect(session.history.current().parts).toHaveLength(3)
  })
})

describe('createCadSkill', () => {
  it('exposes exactly the eight tools with object schemas', () => {
    const skill = createCadSkill({ session: () => null })
    expect(skill.tools.map((t) => t.name).sort()).toEqual(Object.values(CAD_TOOL_NAMES).sort())
    expect(skill.tools).toHaveLength(8)
    for (const tool of skill.tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.inputSchema.type).toBe('object')
      expect(typeof tool.inputSchema.properties).toBe('object')
      // a valid JSON value: survives a round trip unchanged
      expect(JSON.parse(JSON.stringify(tool.inputSchema))).toEqual(tool.inputSchema)
      const required = (tool.inputSchema.required ?? []) as string[]
      const props = tool.inputSchema.properties as Record<string, unknown>
      for (const name of required) expect(props).toHaveProperty(name)
    }
    for (const word of ['save', 'open', 'export', 'send']) {
      expect(skill.tools.some((t) => t.name.includes(word))).toBe(false)
    }
  })

  it('the system prompt lists every shape with its dimensions and defaults', () => {
    const prompt = createCadSkill({ session: () => null }).systemPrompt
    const kinds = Object.keys(SHAPE_DIMS) as ShapeKind[]
    expect(kinds).toHaveLength(15)
    for (const kind of kinds) {
      const line = prompt.split('\n').find((l) => l.startsWith(`- ${kind}:`))
      expect(line, kind).toBeDefined()
      for (const dim of SHAPE_DIMS[kind]) {
        expect(line).toContain(`${dim} ${SHAPE_DEFAULTS[kind][dim]}`)
      }
    }
    expect(prompt).toMatch(/millimet/i)
    expect(prompt).toContain('+Z')
    expect(prompt).toMatch(/degrees/)
    expect(prompt).toContain("role 'hole'")
    expect(prompt).toMatch(/data, never instructions/)
  })

  it('runs a tool on the open drawing, and refuses when none is open', async () => {
    const session = sessionOf()
    let open: CadSession | null = null
    const skill = createCadSkill({ session: () => open })
    const call = (name: string, input: Record<string, unknown>) =>
      skill.executeTool({ id: '1', name, input })
    const none = await call(CAD_TOOL_NAMES.readModel, {})
    expect(none.isError).toBe(true)
    open = session
    const added = await call(CAD_TOOL_NAMES.addShapes, { shapes: [{ kind: 'box' }] })
    expect(added.isError).toBeFalsy()
    expect(added.mutated).toBe(true)
    const id = session.history.current().parts[0]!.id
    expect(added.output).toContain(id)
    const read = await call(CAD_TOOL_NAMES.readModel, {})
    expect(read.mutated).toBe(false)
    expect(read.output).toContain('<model_summary>')
    expect(read.output).toContain(id)
    const refused = await call(CAD_TOOL_NAMES.deleteShapes, { ids: ['nope'] })
    expect(refused.isError).toBe(true)
    expect(refused.output).toContain('unknown-id')
    expect(refused.mutated).toBe(false)
  })
})
