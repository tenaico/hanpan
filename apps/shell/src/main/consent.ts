import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from './atomic-write'

/**
 * The person's consent to Hanpan's terms (spec 2026-11-12 5-1, 5-3): asked on
 * every operating system before the first window, and again when the terms
 * change. The record stays on this PC; nothing is sent anywhere.
 */

/** The terms this build asks for; a change asks everyone again */
export const TERMS_VERSION = '2026-11-20'

export interface Consent {
  v: 1
  termsVersion: string
  acceptedAt: string
}

const FILE = 'consent.json'

export function readConsent(userData: string): Consent | null {
  try {
    const v = JSON.parse(readFileSync(join(userData, FILE), 'utf8')) as Partial<Consent>
    if (v.v !== 1 || typeof v.termsVersion !== 'string' || typeof v.acceptedAt !== 'string') {
      return null
    }
    return { v: 1, termsVersion: v.termsVersion, acceptedAt: v.acceptedAt }
  } catch {
    return null
  }
}

export function needsConsent(userData: string, version = TERMS_VERSION): boolean {
  return readConsent(userData)?.termsVersion !== version
}

export async function writeConsent(
  userData: string,
  now: Date,
  version = TERMS_VERSION,
): Promise<void> {
  await mkdir(userData, { recursive: true })
  const record: Consent = { v: 1, termsVersion: version, acceptedAt: now.toISOString() }
  await atomicWriteFile(join(userData, FILE), Buffer.from(`${JSON.stringify(record)}\n`, 'utf8'))
}
