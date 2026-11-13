/**
 * A write of ai-settings.json must not replace keys it could not read. A
 * `sealed:v2:` value opens only while Hanpan's security key vault is there
 * (spec 7-5); without it the value reads as empty, and the next save would
 * write that empty value over the key for good. Callers pass the file as it is
 * stored, before any write.
 */
import { AiLockedError } from './ai-lock'
import { SEALED_PREFIX_V2, mapAiSecrets, openSecretValue } from './settings-secrets'

export function assertAiSecretsWritable(stored: unknown): void {
  let lost = false
  mapAiSecrets(stored, (v) => {
    if (!lost && v.startsWith(SEALED_PREFIX_V2) && openSecretValue(v) === '') lost = true
    return v
  })
  if (lost) throw new AiLockedError()
}
