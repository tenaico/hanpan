// The language the bare address of the Hanpan site shows for a visitor's country.
// site/vercel.json rewrites "/" by the x-vercel-ip-country header Vercel's edge sets:
// Korea -> /ko/, Vietnam -> /vi/, anything else -> /en/. The bare address has no file
// of its own (a file would win over every rewrite), so these rules alone decide it.
// Run: node --test tools/site-routing.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const site = new URL('../site/', import.meta.url)
const config = JSON.parse(readFileSync(new URL('vercel.json', site), 'utf8'))

/** Vercel's order: the first rewrite whose source and `has` conditions match wins. */
function destinationFor(path, country) {
  for (const rule of config.rewrites ?? []) {
    if (rule.source !== path) continue
    const ok = (rule.has ?? []).every(
      (h) => h.type === 'header' && h.key === 'x-vercel-ip-country' && h.value === country,
    )
    if (ok) return rule.destination
  }
  return null
}

test('Korea gets Korean, Vietnam Vietnamese, every other country English', () => {
  assert.equal(destinationFor('/', 'KR'), '/ko/')
  assert.equal(destinationFor('/', 'VN'), '/vi/')
  for (const c of ['US', 'JP', 'DE', 'TH', undefined]) assert.equal(destinationFor('/', c), '/en/')
})

test('the bare address has no file of its own, and each language page exists', () => {
  assert.equal(existsSync(new URL('index.html', site)), false)
  for (const lang of ['ko', 'en', 'vi']) {
    const page = readFileSync(new URL(`${lang}/index.html`, site), 'utf8')
    assert.match(page, new RegExp(`<html lang="${lang}">`))
  }
})

test('the language pages are reached by rewrite, never by redirect, and nothing is stored', () => {
  assert.equal((config.redirects ?? []).length, 0)
  const headers = JSON.stringify(config.headers ?? [])
  assert.doesNotMatch(headers, /set-cookie/i)
})
