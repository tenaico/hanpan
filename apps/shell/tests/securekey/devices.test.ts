import { describe, expect, it } from 'vitest'
import {
  deviceIdHash,
  parseMachineGuid,
  parseUsbVolumes,
  usbDeviceId,
  USB_VOLUMES_SCRIPT,
  windowsDeviceProbe,
} from '../../src/main/securekey/devices'

describe('security key devices', () => {
  it('reads one USB volume from a single JSON object', () =>
    expect(parseUsbVolumes('{"letter":"E","diskSerial":" AA11 "}', () => '1a2b3c4d')).toEqual([
      { letter: 'E', diskSerial: 'AA11', volumeSerial: '1a2b3c4d' },
    ]))

  it('reads several volumes and drops unreadable ones', () => {
    const json = '[{"letter":"E","diskSerial":"AA11"},{"letter":"F","diskSerial":null}]'
    expect(parseUsbVolumes(json, (root) => (root === 'E:\\' ? null : '0000beef'))).toEqual([
      { letter: 'F', diskSerial: '', volumeSerial: '0000beef' },
    ])
  })

  it('reads nothing from empty or broken output', () => {
    expect(parseUsbVolumes('', () => '1a2b3c4d')).toEqual([])
    expect(parseUsbVolumes('{', () => '1a2b3c4d')).toEqual([])
    expect(parseUsbVolumes('[{"letter":"EE"},{"letter":3}]', () => '1a2b3c4d')).toEqual([])
  })

  it('falls back to the volume number when the stick has no serial', () =>
    expect(usbDeviceId({ letter: 'E', diskSerial: '', volumeSerial: '1a2b3c4d' })).toBe(
      'vol:1a2b3c4d',
    ))

  it('hashes device numbers', () => {
    expect(deviceIdHash('AA11')).toMatch(/^[0-9a-f]{64}$/)
    expect(deviceIdHash('AA11')).not.toBe(deviceIdHash('AA12'))
  })

  it('reads MachineGuid from reg output', () => {
    expect(
      parseMachineGuid(
        '\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    3f1c2a9e-0000-4000-8000-1234567890ab\r\n',
      ),
    ).toBe('3f1c2a9e-0000-4000-8000-1234567890ab')
    expect(parseMachineGuid('ERROR: not found')).toBeNull()
  })

  it('runs PowerShell by full path from the system folder with the constant script', async () => {
    const calls: {
      file: string
      args: string[]
      opts: { cwd: string; timeout: number; maxBuffer: number }
    }[] = []
    const probe = windowsDeviceProbe({ SystemRoot: 'C:\\Windows' }, async (file, args, opts) => {
      calls.push({ file, args, opts })
      return file.endsWith('powershell.exe')
        ? '[]'
        : '    MachineGuid    REG_SZ    3f1c2a9e-0000-4000-8000-1234567890ab\r\n'
    })
    expect(await probe.listUsbVolumes()).toEqual([])
    expect(await probe.machineGuid()).toBe('3f1c2a9e-0000-4000-8000-1234567890ab')
    const [ps, reg] = calls
    expect(ps.file).toBe('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')
    expect(ps.args).toEqual([
      '-NoProfile',
      '-NonInteractive',
      '-NoLogo',
      '-Command',
      USB_VOLUMES_SCRIPT,
    ])
    expect(ps.opts).toEqual({
      cwd: 'C:\\Windows\\System32',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    })
    expect(reg.file).toBe('C:\\Windows\\System32\\reg.exe')
    expect(reg.args).toEqual([
      'query',
      'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
      '/v',
      'MachineGuid',
    ])
    expect(reg.opts.cwd).toBe('C:\\Windows\\System32')
  })

  it('reads nothing when a tool fails', async () => {
    const probe = windowsDeviceProbe({ SystemRoot: 'C:\\Windows' }, async () => {
      throw new Error('timed out')
    })
    expect(await probe.listUsbVolumes()).toEqual([])
    expect(await probe.machineGuid()).toBeNull()
  })

  it('picks USB disks by bus type in its script', () =>
    expect(USB_VOLUMES_SCRIPT).toContain("BusType -eq 'USB'"))
})
