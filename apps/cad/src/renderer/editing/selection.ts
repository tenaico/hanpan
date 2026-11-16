/**
 * Which top-level parts are selected in this tab. The 3D view sets it on a
 * click; the ribbon, the property panel and the shortcuts read it.
 *
 * Every drawing tab is its own renderer process, so one store per module is
 * one store per tab. The selection is screen state, not document content: it
 * is not in the undo history and is not saved.
 */
import { useSyncExternalStore } from 'react'
import type { CadDocument } from '@genoffice/cad-engine'

export interface Selection {
  /** top-level part ids, in the order they were picked */
  ids: string[]
  set(ids: readonly string[]): void
  clear(): void
}

type Listener = () => void

let current: string[] = []
const listeners = new Set<Listener>()

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

function setSelection(ids: readonly string[]): void {
  const next = [...new Set(ids)]
  if (same(next, current)) return
  current = next
  for (const listener of [...listeners]) listener()
}

function clearSelection(): void {
  setSelection([])
}

/** The store for code outside React (the 3D view, the menu commands). */
export const selection = {
  ids: (): string[] => current,
  set: setSelection,
  clear: clearSelection,
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Drops ids whose part is gone or hidden (after an undo, a delete, hiding). */
  prune(doc: CadDocument): void {
    const visible = new Set(doc.parts.filter((p) => !p.hidden).map((p) => p.id))
    if (current.some((id) => !visible.has(id)))
      setSelection(current.filter((id) => visible.has(id)))
  },
}

export function useSelection(): Selection {
  const ids = useSyncExternalStore(selection.subscribe, selection.ids, selection.ids)
  return { ids, set: setSelection, clear: clearSelection }
}
