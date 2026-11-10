// node --test tools/ci-changes.test.mjs
// What a change asks CI to run: nothing for docs, the touched workspaces and the ones that use
// them for code, and everything for anything shared.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classify, affected } from './ci-changes.mjs'

const WORKSPACES = [
  { name: '@genoffice/i18n', dir: 'packages/i18n' },
  { name: '@genoffice/ai-provider', dir: 'packages/ai-provider' },
  { name: '@genoffice/docs', dir: 'apps/docs' },
  { name: '@genoffice/sheets', dir: 'apps/sheets' },
  { name: '@genoffice/cli', dir: 'apps/cli' },
  { name: '@genoffice/shell', dir: 'apps/shell' },
]

test('docs, the site and root notes run no code checks', () => {
  const result = classify(
    ['docs/contracts.md', 'site/index.html', 'README.md', '.claude/launch.json'],
    WORKSPACES,
  )
  assert.deepEqual(result, { code: false, full: false, touched: [], testsOnly: [] })
})

test('a help topic inside an app is code: it ships in the app', () => {
  const result = classify(
    ['apps/shell/src/renderer/src/i18n/help/topics/home-screen.ko.md'],
    WORKSPACES,
  )
  assert.deepEqual(result, {
    code: true,
    full: false,
    touched: ['@genoffice/shell'],
    testsOnly: [],
  })
})

test('e2e specs run the code checks and the e2e, but no unit suite', () => {
  assert.deepEqual(classify(['e2e/home-board.spec.ts'], WORKSPACES), {
    code: true,
    full: false,
    touched: [],
    testsOnly: [],
  })
})

test('anything shared runs everything', () => {
  for (const file of [
    'package-lock.json',
    'package.json',
    'tools/format-changed.mjs',
    '.github/workflows/ci.yml',
    'fixtures/generated/a.docx',
    'tsconfig.base.json',
    'apps/stray-file.ts',
  ]) {
    assert.equal(classify([file], WORKSPACES).full, true, file)
  }
})

test('a workspace change also runs every workspace that uses it, directly or not', () => {
  const uses = new Map([
    ['@genoffice/ai-provider', ['@genoffice/i18n']],
    ['@genoffice/docs', ['@genoffice/ai-provider']],
    ['@genoffice/shell', ['@genoffice/docs']],
    ['@genoffice/sheets', []],
    ['@genoffice/cli', []],
    ['@genoffice/i18n', []],
  ])
  assert.deepEqual(
    affected(['@genoffice/ai-provider'], uses).sort(),
    ['@genoffice/ai-provider', '@genoffice/docs', '@genoffice/shell'].sort(),
  )
  assert.deepEqual(affected(['@genoffice/shell'], uses), ['@genoffice/shell'])
})

test('the cli runs with sheets: its tests execute the sidecar the sheets suite builds', () => {
  const uses = new Map([
    ['@genoffice/cli', []],
    ['@genoffice/sheets', []],
  ])
  assert.deepEqual(affected(['@genoffice/cli'], uses).sort(), [
    '@genoffice/cli',
    '@genoffice/sheets',
  ])
})

test('a suite that only reads another workspace in its tests reruns, but its users do not', () => {
  // ui's tests read the shell's builtin-skills manifest; docs uses ui's code
  const code = new Map([
    ['@genoffice/ui', []],
    ['@genoffice/docs', ['@genoffice/ui']],
    ['@genoffice/shell', ['@genoffice/docs']],
  ])
  const testsOnly = new Map([['@genoffice/ui', ['@genoffice/shell']]])
  assert.deepEqual(affected(['@genoffice/shell'], code, testsOnly).sort(), [
    '@genoffice/shell',
    '@genoffice/ui',
  ])
  // a change to ui's code still reaches every user of it
  assert.deepEqual(affected(['@genoffice/ui'], code, testsOnly).sort(), [
    '@genoffice/docs',
    '@genoffice/shell',
    '@genoffice/ui',
  ])
})

test('a changed test file reruns only its own suite', () => {
  assert.deepEqual(
    classify(['apps/docs/tests/x.test.ts', 'apps/shell/vitest.config.ts'], WORKSPACES),
    {
      code: true,
      full: false,
      touched: [],
      testsOnly: ['@genoffice/docs', '@genoffice/shell'],
    },
  )
})
