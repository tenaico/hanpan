/**
 * Review → Compare reads the other document on the side. It is not "opened":
 * no recovery prompt (comparing against the open file itself used to ask
 * whether to restore that file's unsaved copy, and "Discard" would drop the
 * live tab's copy), no recent-files entry, no write grant, and the tab keeps
 * its own document identity.
 */
import { basename } from 'node:path'

export type CompareTarget =
  | { kind: 'bytes'; name: string; bytes: Buffer }
  | { kind: 'needsPassword'; name: string }
  | { kind: 'tooLarge'; name: string }

export interface CompareTargetDeps {
  readFile: (path: string) => Promise<Buffer>
  isEncrypted: (bytes: Buffer) => boolean
  maxBytes: number
}

export async function readCompareTarget(
  filePath: string,
  deps: CompareTargetDeps,
): Promise<CompareTarget | null> {
  if (typeof filePath !== 'string' || !/\.docx$/i.test(filePath)) return null
  const name = basename(filePath)
  const bytes = await deps.readFile(filePath)
  if (bytes.length > deps.maxBytes) return { kind: 'tooLarge', name }
  if (deps.isEncrypted(bytes)) return { kind: 'needsPassword', name }
  return { kind: 'bytes', name, bytes }
}
