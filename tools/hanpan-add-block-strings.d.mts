// Types for tools/hanpan-add-block-strings.mjs, consumed by tests via a relative import.
import type { HanpanEntries } from './hanpan-add-strings.mjs'

export declare function upsertBlockStrings(
  source: string,
  afterKey: string,
  entries: HanpanEntries,
): { text: string; added: number; replaced: number }
