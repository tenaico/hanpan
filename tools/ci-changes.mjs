/**
 * What a change asks CI to run (ci.yml's `changes` job).
 *
 * - Only docs, the site or root notes: no code checks (a light docs job runs
 *   instead). Help topics inside an app are code: they ship in the app.
 * - Workspace files: the unit suites of those workspaces and of every
 *   workspace that uses them, directly or not. "Uses" is a package.json
 *   dependency or a relative import that reaches into the other workspace
 *   (the shell imports apps/docs/src/main/docs-main.ts, for one).
 * - Anything shared (the lockfile, tools, workflows, fixtures, tsconfig, a
 *   file outside every workspace): everything, as before.
 * - A push to main and a run started by hand: everything, always.
 *
 * Run as a script it prints GitHub step outputs:
 *   node tools/ci-changes.mjs --event pull_request --base <sha> [--head <ref>]
 * code=true|false, full=true|false, workspaces=<comma list in the root test
 * script's order>, sheets=true|false.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Files that never reach the app or its tests */
const DOCS_ONLY = [/^docs\//, /^site\//, /^\.claude\//, /^[^/]+\.md$/]
/** Files that need the code checks and the e2e, but no unit suite */
const E2E_ONLY = [/^e2e\//]

/** The cli tests execute the xlsx sidecar the sheets test script builds */
const RUNS_WITH = { '@genoffice/cli': ['@genoffice/sheets'] }

/** @param {string[]} files @param {{name: string, dir: string}[]} workspaces */
export function classify(files, workspaces) {
  const touched = new Set()
  const tests = new Set()
  let code = false
  let full = false
  for (const raw of files) {
    const file = raw.replaceAll('\\', '/')
    if (DOCS_ONLY.some((re) => re.test(file))) continue
    code = true
    if (E2E_ONLY.some((re) => re.test(file))) continue
    const owner = workspaces.find((w) => file.startsWith(`${w.dir}/`))
    if (!owner) full = true
    // a test file changes that suite only: no other workspace runs it
    else if (TEST_FILE.test(file.slice(owner.dir.length + 1))) tests.add(owner.name)
    else touched.add(owner.name)
  }
  return {
    code,
    full,
    touched: [...touched],
    testsOnly: [...tests].filter((name) => !touched.has(name)),
  }
}

/**
 * The touched workspaces, every workspace whose code uses one of them (directly or not), and
 * every suite that reads one of those in its tests only. A test-only reader is not followed
 * further: its own code did not change, so nothing that uses it changed either.
 * @param {string[]} touched
 * @param {Map<string, string[]>} uses workspace → the workspaces its code uses
 * @param {Map<string, string[]>} [testUses] workspace → the workspaces only its tests read
 */
export function affected(touched, uses, testUses = new Map()) {
  const reverse = (map) => {
    const by = new Map()
    for (const [name, deps] of map) {
      for (const dep of deps) {
        if (!by.has(dep)) by.set(dep, new Set())
        by.get(dep).add(name)
      }
    }
    return by
  }
  const usedBy = reverse(uses)
  const readBy = reverse(testUses)
  const result = new Set()
  const queue = [...touched]
  while (queue.length > 0) {
    const name = queue.shift()
    if (result.has(name)) continue
    result.add(name)
    for (const user of usedBy.get(name) ?? []) queue.push(user)
    for (const partner of RUNS_WITH[name] ?? []) queue.push(partner)
  }
  for (const name of [...result]) {
    for (const reader of readBy.get(name) ?? []) {
      result.add(reader)
      for (const partner of RUNS_WITH[reader] ?? []) result.add(partner)
    }
  }
  return [...result]
}

/** Every workspace of the root package.json (apps/*, packages/*) */
function readWorkspaces() {
  const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const found = []
  for (const pattern of root.workspaces ?? []) {
    const base = pattern.replace(/\/\*$/, '')
    for (const entry of readdirSync(join(ROOT, base))) {
      const pkgPath = join(ROOT, base, entry, 'package.json')
      if (!existsSync(pkgPath)) continue
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      found.push({ name: pkg.name, dir: `${base}/${entry}`, pkg })
    }
  }
  return found
}

const SKIP_DIRS = new Set([
  'node_modules',
  'out',
  'dist',
  'release',
  '.cache',
  'coverage',
  'target',
])
const SOURCE = /\.(?:[cm]?[jt]sx?)$/

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) yield* sourceFiles(path)
    else if (SOURCE.test(entry) && stat.size < 2_000_000) yield path
  }
}

/** A test, a test helper or the test runner's config: what it reads reaches no other workspace */
const TEST_FILE =
  /(?:^|[\\/])(?:tests?|__tests__|e2e)[\\/]|\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|[\\/])vitest\.[^\\/]*config\.[cm]?[jt]s$|(?:^|[\\/])playwright\.config\.[cm]?[jt]s$/

/**
 * workspace → the workspaces its code uses (package.json dependencies and relative imports from
 * its sources), and → the workspaces only its tests read
 */
function readUses(workspaces) {
  const names = new Set(workspaces.map((w) => w.name))
  const dirs = workspaces.map((w) => ({ name: w.name, abs: join(ROOT, w.dir) + sep }))
  const uses = new Map()
  const testUses = new Map()
  for (const w of workspaces) {
    const code = new Set()
    const tests = new Set()
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const dep of Object.keys(w.pkg[field] ?? {})) if (names.has(dep)) code.add(dep)
    }
    const own = join(ROOT, w.dir) + sep
    for (const file of sourceFiles(join(ROOT, w.dir))) {
      const into = TEST_FILE.test(file.slice(own.length)) ? tests : code
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/['"`](\.\.?\/[^'"`\n]+)['"`]/g)) {
        const target = resolve(dirname(file), match[1])
        if ((target + sep).startsWith(own)) continue
        const other = dirs.find((d) => (target + sep).startsWith(d.abs))
        if (other && other.name !== w.name) into.add(other.name)
      }
    }
    uses.set(w.name, [...code])
    testUses.set(
      w.name,
      [...tests].filter((name) => !code.has(name)),
    )
  }
  return { uses, testUses }
}

/** The workspaces the root `test` script runs, in its order */
function testOrder() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  return [...String(pkg.scripts?.test ?? '').matchAll(/npm run test -w (\S+)/g)].map((m) => m[1])
}

function changedFiles(base, head = 'HEAD') {
  const result = spawnSync('git', ['diff', '--name-only', `${base}`, head], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(`git diff failed: ${result.stderr}`)
  return result.stdout.split('\n').filter(Boolean)
}

function main() {
  const args = process.argv.slice(2)
  const value = (flag) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }
  const event = value('--event') ?? ''
  const base = value('--base')
  const order = testOrder()
  const out = (code, full, list) => {
    const sheets = full || list.includes('@genoffice/sheets')
    process.stdout.write(
      `code=${code}\nfull=${full}\nworkspaces=${list.join(',')}\nsheets=${sheets}\n`,
    )
    process.stderr.write(
      `ci-changes: code=${code} full=${full} unit=${full ? 'all' : list.join(', ') || 'none'}\n`,
    )
  }
  if (event !== 'pull_request' || !base) {
    out(true, true, order)
    return
  }
  // --files a,b: a given list instead of git (to try the rules by hand)
  const files = value('--files')?.split(',') ?? changedFiles(base, value('--head'))
  const workspaces = readWorkspaces()
  const { code, full, touched, testsOnly } = classify(files, workspaces)
  if (full) {
    out(true, true, order)
    return
  }
  const { uses, testUses } = readUses(workspaces)
  const wanted = new Set([...affected(touched, uses, testUses), ...testsOnly])
  for (const name of testsOnly) for (const partner of RUNS_WITH[name] ?? []) wanted.add(partner)
  out(
    code,
    false,
    order.filter((name) => wanted.has(name)),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
