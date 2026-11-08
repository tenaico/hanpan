/**
 * Compile the Windows share sheet helper (win-share.cs -> win-share.exe) with the
 * in-box .NET Framework compiler and the Windows SDK's union metadata, the same
 * recipe as packages/pdf2docx/ocr-helper/build-win.mjs (see the notes there on
 * picking the winmd and the System.Runtime facades).
 *
 * Run by apps/shell/electron-builder.cjs before packaging. Idempotent: exits 0
 * at once when the exe is newer than the source.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, 'win-share.cs')
const out = join(here, 'win-share.exe')

if (process.platform !== 'win32') {
  console.error('build-win.mjs only runs on Windows')
  process.exit(1)
}

if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) {
  console.log('win-share.exe is up to date')
  process.exit(0)
}

/** newest version-named subdirectory of `dir` that holds `file` */
function newestWith(dir, file, dirPattern) {
  if (!existsSync(dir)) return null
  const hits = readdirSync(dir)
    .filter((name) => dirPattern.test(name))
    .filter((name) => existsSync(join(dir, name, file)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return hits.length > 0 ? join(dir, hits[hits.length - 1], file) : null
}

const windir = process.env.WINDIR ?? 'C:\\Windows'
const csc = join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
if (!existsSync(csc)) {
  console.error(`csc.exe not found at ${csc} (.NET Framework 4.x missing?)`)
  process.exit(1)
}

const kits = 'C:\\Program Files (x86)\\Windows Kits\\10\\UnionMetadata'
const winmd = newestWith(kits, 'Windows.winmd', /^\d/) ?? join(kits, 'Windows.winmd')
if (!existsSync(winmd)) {
  console.error(`Windows.winmd not found under ${kits} (install the Windows 10/11 SDK)`)
  process.exit(1)
}

const gacMsil = join(windir, 'Microsoft.NET', 'assembly', 'GAC_MSIL')
const netfx = 'C:\\Program Files (x86)\\Reference Assemblies\\Microsoft\\Framework\\.NETFramework'
const assembly = (name) =>
  newestWith(netfx, `Facades\\${name}.dll`, /^v4/) ??
  newestWith(join(gacMsil, name), `${name}.dll`, /^v\d/)
const refs = [
  winmd,
  newestWith(
    join(gacMsil, 'System.Runtime.WindowsRuntime'),
    'System.Runtime.WindowsRuntime.dll',
    /^v\d/,
  ),
  assembly('System.Runtime'),
  assembly('System.Runtime.InteropServices.WindowsRuntime'),
  'System.dll',
  'System.Drawing.dll',
  'System.Windows.Forms.dll',
]
if (refs.some((ref) => !ref)) {
  console.error('System.Runtime.WindowsRuntime or the System.Runtime facades were not found')
  process.exit(1)
}
console.log(
  `compiling win-share.exe\n  csc: ${csc}\n  refs:\n${refs.map((r) => `    ${r}`).join('\n')}`,
)
execFileSync(
  csc,
  ['/nologo', '/optimize+', '/target:winexe', ...refs.map((r) => `/r:${r}`), `/out:${out}`, src],
  { stdio: 'inherit' },
)
console.log('built', out)
