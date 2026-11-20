// The language the bare address of the Hanpan site shows for a visitor's country
// (site/middleware.js). Run: node --test tools/site-middleware.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// site/ has no package.json, so the module is loaded from an .mjs copy
const dir = mkdtempSync(join(tmpdir(), 'hanpan-site-mw-'))
const copy = join(dir, 'middleware.mjs')
writeFileSync(copy, readFileSync(new URL('../site/middleware.js', import.meta.url)))
const { default: middleware, langForCountry, config } = await import(pathToFileURL(copy).href)

const visit = (country, path = '/') =>
  middleware(
    new Request(`https://hanpan.tenai.kr${path}`, {
      headers: country ? { 'x-vercel-ip-country': country } : {},
    }),
  )

test('Vietnam gets Vietnamese, Korea Korean, every other country English', () => {
  assert.equal(langForCountry('VN'), 'vi')
  assert.equal(langForCountry('vn'), 'vi')
  assert.equal(langForCountry('KR'), 'ko')
  for (const c of ['US', 'JP', 'DE', 'TH', '', undefined, null]) assert.equal(langForCountry(c), 'en')
})

test('the bare address is rewritten in place, never redirected', () => {
  assert.equal(visit('VN').headers.get('x-middleware-rewrite'), 'https://hanpan.tenai.kr/vi/')
  assert.equal(visit('US').headers.get('x-middleware-rewrite'), 'https://hanpan.tenai.kr/en/')
  assert.equal(visit(null).headers.get('x-middleware-rewrite'), 'https://hanpan.tenai.kr/en/')
  const korea = visit('KR')
  assert.equal(korea.headers.get('x-middleware-next'), '1')
  assert.equal(korea.headers.get('x-middleware-rewrite'), null)
  for (const c of ['VN', 'US', 'KR']) {
    assert.equal(visit(c).status, 200)
    assert.equal(visit(c).headers.get('location'), null)
  }
})

test('it runs on the bare address only: /ko/, /en/ and /vi/ keep their language', () => {
  assert.deepEqual(config.matcher, ['/', '/index.html'])
})

test('it stores nothing about the visitor', () => {
  for (const c of ['VN', 'US', 'KR']) assert.equal(visit(c).headers.get('set-cookie'), null)
})
