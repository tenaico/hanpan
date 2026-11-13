import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { statSync } from 'node:fs'
import { windowsSystemDir, windowsSystemTool } from '@genoffice/ai-provider/subscription'

/**
 * Which USB sticks are plugged in and which PC this is, for the security key
 * (spec 7-2, 7-3). Only hashes of these numbers ever leave the PC.
 */

export interface UsbVolume {
  /** drive letter, like 'E' */
  letter: string
  /** the disk's serial number, trimmed; '' when the stick reports none */
  diskSerial: string
  /** the volume serial number, 8 hex digits */
  volumeSerial: string
}

/**
 * Every lettered partition of a disk on the USB bus, as `{ letter, diskSerial }`
 * JSON. Disks are picked by how they are attached, not by drive type, so an
 * external SSD counts as a USB stick too (spec 7-3). The script is constant:
 * nothing from the user goes into it.
 */
export const USB_VOLUMES_SCRIPT = [
  "$ErrorActionPreference='SilentlyContinue'",
  '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8',
  "@(Get-Disk | Where-Object BusType -eq 'USB' | ForEach-Object { $d=$_; Get-Partition -DiskNumber $d.Number | Where-Object { $_.DriveLetter } | ForEach-Object { [pscustomobject]@{ letter=[string]$_.DriveLetter; diskSerial=[string]$d.SerialNumber } } }) | ConvertTo-Json -Compress",
].join('; ')

const TOOL_TIMEOUT_MS = 15_000
const TOOL_MAX_BUFFER = 1024 * 1024

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The volumes in the script's output; a volume whose serial cannot be read is left out */
export function parseUsbVolumes(
  json: string,
  volumeSerialOf: (root: string) => string | null,
): UsbVolume[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }
  // ConvertTo-Json writes a lone object for a single item
  const items = Array.isArray(parsed) ? parsed : [parsed]
  const out: UsbVolume[] = []
  for (const item of items) {
    if (!isRecord(item)) continue
    const letter = item.letter
    if (typeof letter !== 'string' || !/^[A-Za-z]$/.test(letter)) continue
    const upper = letter.toUpperCase()
    const volumeSerial = volumeSerialOf(`${upper}:\\`)
    if (volumeSerial === null) continue
    const diskSerial = typeof item.diskSerial === 'string' ? item.diskSerial.trim() : ''
    out.push({ letter: upper, diskSerial, volumeSerial })
  }
  return out
}

/** The volume serial of a drive root: on Windows `dev` of a stat is that number */
export function volumeSerialOf(root: string): string | null {
  try {
    const dev = statSync(root).dev
    if (!Number.isSafeInteger(dev) || dev < 0) return null
    return dev.toString(16).padStart(8, '0')
  } catch {
    return null
  }
}

/** The stick's number: its disk serial, or the volume serial when it has none (spec 7-2) */
export function usbDeviceId(v: UsbVolume): string {
  return v.diskSerial || `vol:${v.volumeSerial}`
}

/** The only form a device number is sent or stored in */
export function deviceIdHash(rawId: string): string {
  return createHash('sha256').update(`hanpan-device:${rawId}`, 'utf8').digest('hex')
}

/** MachineGuid from `reg query` output */
export function parseMachineGuid(regOutput: string): string | null {
  const match = /^\s*MachineGuid\s+REG_SZ\s+([0-9A-Fa-f-]{36})\s*$/m.exec(regOutput)
  return match ? match[1]!.toLowerCase() : null
}

export interface DeviceProbe {
  listUsbVolumes(): Promise<UsbVolume[]>
  machineGuid(): Promise<string | null>
}

type RunTool = (
  file: string,
  args: string[],
  opts: { cwd: string; timeout: number; maxBuffer: number },
) => Promise<string>

const runWithExecFile: RunTool = (file, args, opts) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { ...opts, windowsHide: true, encoding: 'utf8' }, (error, stdout) =>
      error ? reject(error) : resolve(stdout),
    )
  })

/**
 * The probe on Windows: PowerShell and reg.exe, each started by full path from
 * the system folder with a fixed argument list (docs/security.md "Running
 * programs"). A tool that fails reports nothing found.
 */
export function windowsDeviceProbe(
  env: NodeJS.ProcessEnv,
  run: RunTool = runWithExecFile,
): DeviceProbe {
  const opts = () => ({
    cwd: windowsSystemDir(env),
    timeout: TOOL_TIMEOUT_MS,
    maxBuffer: TOOL_MAX_BUFFER,
  })
  return {
    async listUsbVolumes() {
      try {
        const stdout = await run(
          windowsSystemTool(env, 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', USB_VOLUMES_SCRIPT],
          opts(),
        )
        return parseUsbVolumes(stdout.trim(), volumeSerialOf)
      } catch {
        return []
      }
    },
    async machineGuid() {
      try {
        const stdout = await run(
          windowsSystemTool(env, 'reg.exe'),
          ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
          opts(),
        )
        return parseMachineGuid(stdout)
      } catch {
        return null
      }
    },
  }
}
