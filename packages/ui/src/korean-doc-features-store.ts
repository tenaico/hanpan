import { useSyncExternalStore } from 'react'
import { koreanDocFeaturesOn, type Lang } from '@genoffice/i18n'

/**
 * Renderer-side copy of the shell's Korean document features switch (decision
 * 0091): true or false once the user set it, null before. Each window applies
 * the shell's value before its first render and again when it changes.
 */
let stored: boolean | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = (): boolean | null => stored

export function applyKoreanDocFeatures(raw: unknown): void {
  const next = typeof raw === 'boolean' ? raw : null
  if (next === stored) return
  stored = next
  for (const listener of listeners) listener()
}

/** whether this window shows the Korean document features: the switch, else a Korean UI */
export function useKoreanDocFeatures(lang: Lang): boolean {
  return koreanDocFeaturesOn(useSyncExternalStore(subscribe, snapshot, snapshot), lang)
}
