// Types for tools/hanpan-add-strings.mjs, consumed by tests via a relative import.
/** key → language → text */
export type HanpanEntries = Record<string, Record<string, string>>

export declare function upsertFileStrings(
  source: string,
  lang: string,
  entries: HanpanEntries,
): { text: string; added: number; replaced: number }
