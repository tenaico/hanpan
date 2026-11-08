/**
 * The AI's tools for a graphics tab (design 6-4): find and read the app's
 * commands, run them (one or a batch), read the document, export a copy through
 * the person's save dialog, and load guides. Nothing here writes a file.
 */
import type { AgentToolCall, AgentToolDef, ToolExecution } from '@genoffice/agent-core'
import type { GraphicsAdapter } from '../adapters'
import type { AppCommand } from '../frame/page-api'
import { EXPORT_FORMATS } from '../../shared/kinds'
import type { GraphicsKind } from '../../shared/kinds'
import type { ExportRequest, ExportResult } from '../../shared/ipc'
import { isBlockedCommand, isReadOnlyCommand } from './blocked-commands'
import { guideCatalogSummary, loadGuides } from './guides'
import type { UndoTracker } from './undo-tracker'

const RESULT_MAX = 4000
const INSPECT_MAX = 12_000
const MAX_STEPS = 30

export interface GraphicsToolDeps {
  kind: GraphicsKind
  adapter: GraphicsAdapter
  tracker: UndoTracker
  exportFile(request: ExportRequest): Promise<ExportResult>
  /** the run's Stop: a batch runs no further step once it is set */
  signal?: AbortSignal
}

export function graphicsTools(kind: GraphicsKind): AgentToolDef[] {
  const formats = EXPORT_FORMATS[kind]
  return [
    {
      name: 'find_commands',
      description:
        'Search the app\'s commands by words in their id, label or menu. Answers one line per command: "id — label", with "[disabled: reason]" when the app has it turned off now.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'words to look for, e.g. "align center" or "rectangle"',
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
        required: ['query'],
      },
    },
    {
      name: 'describe_command',
      description:
        "A command's parameters (its own documentation), menu and whether it can run now.",
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'run_command',
      description:
        "Run one command on the open document with its parameters. Answers the command's result as JSON, or the app's error.",
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          params: {
            type: 'object',
            description: "the command's parameters, as describe_command lists them",
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'run_commands',
      description: `Run up to ${MAX_STEPS} commands in order. Stops at the first failure and lists the steps that did not run.`,
      inputSchema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_STEPS,
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, params: { type: 'object' } },
              required: ['id'],
            },
          },
        },
        required: ['steps'],
      },
    },
    {
      name: 'inspect_document',
      description:
        "The document's layer tree with ids, kinds, names and bounds, the artboards and the selection.",
      inputSchema: {
        type: 'object',
        properties: {
          depth: { type: 'integer', minimum: 1, maximum: 6, default: 2 },
          childLimit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
        },
      },
    },
    {
      name: 'export_file',
      description: `Give the person a copy of the artwork as ${formats.join(' or ').toUpperCase()}. Their save dialog asks where; the answer says what they chose. The document is not saved by this.`,
      inputSchema: {
        type: 'object',
        properties: { format: { type: 'string', enum: [...formats] } },
        required: ['format'],
      },
    },
    {
      name: 'load_guide',
      description: `Load worked parameters for common jobs before doing them. Guides: ${guideCatalogSummary(kind) || 'none yet'}.`,
      inputSchema: {
        type: 'object',
        properties: { guides: { type: 'array', items: { type: 'string' }, minItems: 1 } },
        required: ['guides'],
      },
    },
    {
      name: 'pc_fonts',
      description:
        'The fonts installed on this PC. Without a family it lists their family names; with a family it loads that font into the app so text commands can use it by that family name.',
      inputSchema: {
        type: 'object',
        properties: {
          family: { type: 'string', description: 'a family name from the list, to load' },
        },
      },
    },
  ]
}

function cut(text: string, max: number): string {
  return text.length <= max
    ? text
    : `${text.slice(0, max)}\n… (cut: ${text.length - max} more characters)`
}

function json(value: unknown): string {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return String(value)
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function reasonOf(command: AppCommand): string {
  return command.disabled_reason ?? command.disabledReason ?? 'not available now'
}

async function visibleCommands(deps: GraphicsToolDeps): Promise<AppCommand[]> {
  return (await deps.adapter.api.commands()).filter((c) => !isBlockedCommand(c.id))
}

/** Runs one command, starting the run's undo tracking before the first change. */
async function runOne(deps: GraphicsToolDeps, id: string, params: unknown): Promise<unknown> {
  const p = params && typeof params === 'object' && !Array.isArray(params) ? params : {}
  const changes = !isReadOnlyCommand(id)
  if (changes) await deps.tracker.beforeMutation()
  try {
    return await deps.adapter.api.execute(id, p)
  } finally {
    // a failed command may still have changed something; the history decides
    if (changes) deps.tracker.noteMutation()
  }
}

function blocked(id: string): ToolExecution {
  return {
    output: `The command ${id} is not available to the assistant (saving, files, preferences, undo and the app's windows are the person's).`,
    isError: true,
    summary: id,
  }
}

export async function executeGraphicsTool(
  call: AgentToolCall,
  deps: GraphicsToolDeps,
): Promise<ToolExecution> {
  const input = call.input
  switch (call.name) {
    case 'find_commands': {
      const words = String(input.query ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
      const limit = typeof input.limit === 'number' ? input.limit : 20
      const hits = (await visibleCommands(deps))
        .filter((c) => {
          const hay = `${c.id} ${c.label} ${(c.menu ?? []).join(' ')}`.toLowerCase()
          return words.every((w) => hay.includes(w))
        })
        .slice(0, limit)
      const lines = hits.map(
        (c) => `${c.id} — ${c.label}${c.enabled ? '' : ` [disabled: ${reasonOf(c)}]`}`,
      )
      return {
        output: lines.length ? lines.join('\n') : `No command matches "${words.join(' ')}".`,
        summary: words.join(' '),
      }
    }
    case 'describe_command': {
      const id = String(input.id ?? '')
      if (isBlockedCommand(id)) return blocked(id)
      const command = (await visibleCommands(deps)).find((c) => c.id === id)
      if (!command) return { output: `No command ${id}.`, isError: true, summary: id }
      const lines = [
        `${command.id} — ${command.label}`,
        `menu: ${(command.menu ?? []).join(' › ') || '(none)'}`,
        `can run now: ${command.enabled ? 'yes' : `no (${reasonOf(command)})`}`,
        `params: ${command.params ?? '{}'}`,
      ]
      return { output: lines.join('\n'), summary: id }
    }
    case 'run_command': {
      const id = String(input.id ?? '')
      if (isBlockedCommand(id)) return blocked(id)
      try {
        const result = await runOne(deps, id, input.params)
        return {
          output: cut(`OK ${json(result)}`, RESULT_MAX),
          mutated: !isReadOnlyCommand(id),
          summary: id,
        }
      } catch (error) {
        return {
          output: errorText(error),
          isError: true,
          mutated: !isReadOnlyCommand(id),
          summary: id,
        }
      }
    }
    case 'run_commands': {
      const steps = Array.isArray(input.steps)
        ? (input.steps as { id?: unknown; params?: unknown }[])
        : []
      const ids = steps.map((s) => String(s?.id ?? ''))
      const refused = ids.find((id) => isBlockedCommand(id))
      if (refused) return blocked(refused)
      const lines: string[] = []
      let failed = false
      let ran = false
      for (const [i, step] of steps.entries()) {
        const id = ids[i]!
        if (failed || deps.signal?.aborted) {
          lines.push(`${i + 1}. ${id} — not run${failed ? '' : ' (stopped)'}`)
          continue
        }
        try {
          ran = true
          const result = await runOne(deps, id, step.params)
          lines.push(`${i + 1}. ${id} — OK ${cut(json(result), 400)}`)
        } catch (error) {
          failed = true
          lines.push(`${i + 1}. ${id} — ERROR ${errorText(error)} (stopped)`)
        }
      }
      return {
        output: cut(lines.join('\n'), RESULT_MAX),
        isError: failed,
        mutated: ran && ids.some((id) => !isReadOnlyCommand(id)),
        summary: `${steps.length} commands`,
      }
    }
    case 'inspect_document': {
      const depth = typeof input.depth === 'number' ? input.depth : 2
      const childLimit = typeof input.childLimit === 'number' ? input.childLimit : 30
      try {
        return {
          output: cut(json(await deps.adapter.inspectDocument(depth, childLimit)), INSPECT_MAX),
          summary: 'document',
        }
      } catch (error) {
        return { output: errorText(error), isError: true, summary: 'document' }
      }
    }
    case 'export_file': {
      const format = String(input.format ?? '')
      const allowed = EXPORT_FORMATS[deps.kind] as readonly string[]
      if (!allowed.includes(format)) {
        return {
          output: `Export formats here: ${allowed.join(', ')}.`,
          isError: true,
          summary: format,
        }
      }
      try {
        const fmt = format as 'png' | 'jpg' | 'svg'
        const bytes = await deps.adapter.exportBytes(fmt)
        const title = (await deps.adapter.docInfo()).title ?? 'export'
        const defaultName = `${title.replace(/\.[^.]+$/, '')}.${fmt}`
        const result = await deps.exportFile({ bytes, defaultName, format: fmt })
        if (!result.ok)
          return { output: `The export failed: ${result.error}`, isError: true, summary: fmt }
        if ('canceled' in result)
          return {
            output: 'The person canceled the save dialog; nothing was written.',
            summary: fmt,
          }
        const name = result.path.split(/[\\/]/).pop() ?? result.path
        return {
          output: `The person saved the ${fmt.toUpperCase()} copy as ${name}.`,
          summary: fmt,
        }
      } catch (error) {
        return { output: errorText(error), isError: true, summary: format }
      }
    }
    case 'load_guide': {
      const names = Array.isArray(input.guides) ? input.guides.map(String) : []
      const loaded = loadGuides(deps.kind, names)
      return loaded.ok
        ? { output: loaded.content, summary: names.join(', ') }
        : { output: loaded.error, isError: true, summary: names.join(', ') }
    }
    case 'pc_fonts': {
      // the web build's page API: request('fonts.local', {family?})
      const family = typeof input.family === 'string' ? input.family.trim() : ''
      try {
        const answer = await deps.adapter.api.request('fonts.local', family ? { family } : {})
        return { output: cut(json(answer), RESULT_MAX), summary: family || 'list' }
      } catch (error) {
        return { output: errorText(error), isError: true, summary: family || 'list' }
      }
    }
    default:
      return { output: `Unknown tool: ${call.name}`, isError: true, summary: call.name }
  }
}
