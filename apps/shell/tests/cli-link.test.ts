import { readFileSync, statSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: false, getVersion: () => '0.0.0' } }))

import {
  cliLinkSkipReason,
  isEphemeralInstall,
  launcherFilePath,
  writeLauncherFile,
} from '../src/main/cli-link'

describe('genoffice launcher file', () => {
  it('lives in the genoffice auth directory, overridable like auth.json', () => {
    expect(launcherFilePath({})).toBe(join(process.env.HOME ?? '', '.ieumoffice', 'launcher'))
    // the upstream app keeps its own record in ~/.genoffice: never ours to write
    expect(launcherFilePath({})).not.toContain('.genoffice')
    expect(launcherFilePath({ GENOFFICE_AUTH_DIR: '/tmp/x' })).toBe(join('/tmp/x', 'launcher'))
  })

  it('writes one line, creates the directory, and only rewrites on change', () => {
    const dir = mkdtempSync(join(tmpdir(), 'genoffice-launcher-'))
    const file = join(dir, 'nested', 'launcher')
    expect(writeLauncherFile(file, '/Applications/GenOffice.app/Contents/Resources/cli')).toBe(true)
    expect(readFileSync(file, 'utf-8')).toBe('/Applications/GenOffice.app/Contents/Resources/cli\n')
    const before = statSync(file).mtimeMs
    expect(writeLauncherFile(file, '/Applications/GenOffice.app/Contents/Resources/cli')).toBe(
      false,
    )
    expect(statSync(file).mtimeMs).toBe(before)
    expect(writeLauncherFile(file, 'C:\\Programs\\IeumOffice\\resources\\cli')).toBe(true)
    expect(readFileSync(file, 'utf-8')).toBe('C:\\Programs\\IeumOffice\\resources\\cli\n')
  })

  it('treats dmg and AppImage mounts as temporary', () => {
    expect(isEphemeralInstall('/Volumes/GenOffice/GenOffice.app/Contents/Resources', {})).toBe(true)
    expect(isEphemeralInstall('/tmp/.mount_GenOfxyz/resources', {})).toBe(true)
    expect(isEphemeralInstall('/opt/GenOffice/resources', { APPIMAGE: '/home/u/G.AppImage' })).toBe(
      true,
    )
    expect(isEphemeralInstall('/Applications/GenOffice.app/Contents/Resources', {})).toBe(false)
  })
})

describe('which build may claim the launcher file and PATH', () => {
  const installedExe = 'C:\\Users\\u\\AppData\\Local\\Programs\\Hanpan\\Hanpan.exe'
  const installed = {
    platform: 'win32' as NodeJS.Platform,
    isPackaged: true,
    execPath: installedExe,
    resourcesPath: 'C:\\Users\\u\\AppData\\Local\\Programs\\Hanpan\\resources',
    argv: [installedExe],
    env: {},
    exists: (p: string) =>
      p === 'C:\\Users\\u\\AppData\\Local\\Programs\\Hanpan\\Uninstall Hanpan.exe',
  }

  it('lets the NSIS-installed copy claim it', () => {
    expect(cliLinkSkipReason(installed)).toBeUndefined()
  })

  it('skips an unpackaged (dev) run', () => {
    expect(cliLinkSkipReason({ ...installed, isPackaged: false })).toMatch(/not packaged/)
  })

  it('skips a win-unpacked build even if an uninstaller happens to sit next to it', () => {
    const exe =
      'C:\\src\\hanpan\\.claude\\worktrees\\rel\\apps\\shell\\release\\win-unpacked\\Hanpan.exe'
    expect(
      cliLinkSkipReason({
        ...installed,
        execPath: exe,
        resourcesPath:
          'C:\\src\\hanpan\\.claude\\worktrees\\rel\\apps\\shell\\release\\win-unpacked\\resources',
        argv: [exe],
        exists: () => true,
      }),
    ).toMatch(/unpacked/)
  })

  it("skips a Windows copy without the installer's uninstaller next to the exe", () => {
    expect(cliLinkSkipReason({ ...installed, exists: () => false })).toMatch(/not installed/)
  })

  it('skips runs on a custom profile (--user-data-dir or GENOFFICE_USER_DATA)', () => {
    expect(
      cliLinkSkipReason({ ...installed, argv: [installedExe, '--user-data-dir=C:\\tmp\\p'] }),
    ).toMatch(/custom profile/)
    expect(
      cliLinkSkipReason({ ...installed, argv: [installedExe, '--user-data-dir', 'C:\\tmp\\p'] }),
    ).toMatch(/custom profile/)
    expect(cliLinkSkipReason({ ...installed, env: { GENOFFICE_USER_DATA: 'C:\\tmp\\p' } })).toMatch(
      /custom profile/,
    )
  })

  it('keeps the mac/linux temporary-mount rule and needs no uninstaller there', () => {
    const mac = {
      ...installed,
      platform: 'darwin' as NodeJS.Platform,
      execPath: '/Applications/Hanpan.app/Contents/MacOS/Hanpan',
      resourcesPath: '/Applications/Hanpan.app/Contents/Resources',
      argv: ['/Applications/Hanpan.app/Contents/MacOS/Hanpan'],
      exists: () => false,
    }
    expect(cliLinkSkipReason(mac)).toBeUndefined()
    expect(
      cliLinkSkipReason({ ...mac, resourcesPath: '/Volumes/Hanpan/Hanpan.app/Contents/Resources' }),
    ).toMatch(/temporary mount/)
    expect(
      cliLinkSkipReason({
        ...mac,
        platform: 'linux',
        resourcesPath: '/opt/Hanpan/resources',
        env: { APPIMAGE: '/home/u/H.AppImage' },
      }),
    ).toMatch(/temporary mount/)
    expect(
      cliLinkSkipReason({
        ...mac,
        platform: 'linux',
        resourcesPath: '/home/u/hanpan/release/linux-unpacked/resources',
      }),
    ).toMatch(/unpacked/)
  })
})
