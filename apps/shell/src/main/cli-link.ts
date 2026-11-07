import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, win32 } from 'node:path'
import { app } from 'electron'
import { HOME_DIR_NAME, installCliLink, launcherFileName } from '@genoffice/cli/install'
import { readAppSettings, writeAppSetting } from './app-settings'

const SETTING_KEY = 'cliLink'

interface CliLinkRecord {
  version: string
  status: string
  location?: string
}

/**
 * Every launch: record where the ieumoffice launcher lives so agents can find it
 * without a PATH (the `ieumoffice` skill reads `~/.ieumoffice/launcher`), then
 * try to expose it on the PATH. The dmg has no installer step to do that, so
 * macOS retries on each start until a writable directory turns up; Windows
 * gets its PATH entry from the installer and only re-checks once per version
 * (the check spawns PowerShell). Silent and best effort.
 */
export function installCliLinkBestEffort(settingsPath: string): void {
  if (!app.isPackaged) return
  try {
    const skip = cliLinkSkipReason({
      platform: process.platform,
      isPackaged: app.isPackaged,
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      argv: process.argv,
      env: process.env,
      exists: existsSync,
    })
    if (skip) {
      console.log(`[genoffice] cli link skipped: ${skip}`)
      return
    }
    const dir = join(process.resourcesPath, 'cli')
    writeLauncherFile(launcherFilePath(process.env), dir)
    const version = app.getVersion()
    const previous = readAppSettings(settingsPath)[SETTING_KEY] as CliLinkRecord | undefined
    if (process.platform === 'win32' && previous?.version === version) return
    const launcher = join(dir, launcherFileName(process.platform))
    const outcome = installCliLink({ launcher })
    console.log(
      `[genoffice] cli link: ${outcome.status}${outcome.location ? ` (${outcome.location})` : ''}` +
        (outcome.pathHint ? `; not on PATH, add it with: ${outcome.pathHint}` : ''),
    )
    const record: CliLinkRecord = { version, status: outcome.status }
    if (outcome.location) record.location = outcome.location
    writeAppSetting(settingsPath, SETTING_KEY, record)
  } catch (err) {
    console.warn('[genoffice] cli link failed:', err instanceof Error ? err.message : err)
  }
}

export interface CliLinkContext {
  platform: NodeJS.Platform
  isPackaged: boolean
  execPath: string
  resourcesPath: string
  argv: readonly string[]
  env: NodeJS.ProcessEnv
  exists: (path: string) => boolean
}

/**
 * Only the installed app may claim `~/.ieumoffice/launcher` and the PATH entry.
 * A build run straight from a build output folder (`release/win-unpacked`, a
 * git worktree, an acceptance check on a scratch profile) would otherwise point
 * the user's CLI and agent skills at a folder that is deleted or rebuilt later.
 * Returns why this run must leave them alone, or undefined when it may claim.
 */
export function cliLinkSkipReason(ctx: CliLinkContext): string | undefined {
  if (!ctx.isPackaged) return 'not packaged'
  if (ctx.env.GENOFFICE_USER_DATA || hasUserDataDirSwitch(ctx.argv)) {
    return 'custom profile (--user-data-dir or GENOFFICE_USER_DATA)'
  }
  // a DMG under /Volumes or an AppImage FUSE mount vanishes on exit; linking
  // to it would leave a dead command, so wait for a real install
  if (isEphemeralInstall(ctx.resourcesPath, ctx.env)) return 'app runs from a temporary mount'
  // electron-builder's unpacked output: win-unpacked, win-arm64-unpacked, linux-unpacked
  if (/(^|[\\/])[^\\/]*-unpacked([\\/]|$)/i.test(ctx.resourcesPath)) {
    return 'app runs from an unpacked build folder'
  }
  if (ctx.platform === 'win32') {
    // the NSIS installer leaves "Uninstall <productName>.exe" next to the exe;
    // a copied or extracted build has none
    const dir = win32.dirname(ctx.execPath)
    const name = win32.basename(ctx.execPath).replace(/\.exe$/i, '')
    if (!ctx.exists(win32.join(dir, `Uninstall ${name}.exe`))) {
      return 'not installed (no uninstaller next to the exe)'
    }
  }
  return undefined
}

function hasUserDataDirSwitch(argv: readonly string[]): boolean {
  return argv.some((a) => a === '--user-data-dir' || a.startsWith('--user-data-dir='))
}

export function isEphemeralInstall(resourcesPath: string, env: NodeJS.ProcessEnv): boolean {
  if (env.APPIMAGE) return true
  return /^\/Volumes\//.test(resourcesPath) || /\/\.mount_[^/]+\//.test(resourcesPath)
}

/** Same directory the ieumoffice CLI uses for its audit log; never the upstream app's `~/.genoffice`. */
export function launcherFilePath(env: NodeJS.ProcessEnv): string {
  return join(env.GENOFFICE_AUTH_DIR || join(homedir(), HOME_DIR_NAME), 'launcher')
}

/** One line, the directory holding ieumoffice / ieumoffice.cmd; rewritten only when it changed. */
export function writeLauncherFile(file: string, launcherDir: string): boolean {
  const content = `${launcherDir}\n`
  try {
    if (readFileSync(file, 'utf-8') === content) return false
  } catch {}
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content, 'utf-8')
  return true
}
