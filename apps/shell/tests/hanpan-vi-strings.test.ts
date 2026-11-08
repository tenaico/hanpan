// Hanpan's own strings (the JSON dictionaries applied by tools/hanpan-add-block-strings.mjs)
// carry real Vietnamese, and strings.ts holds exactly that text in its vi block.
import { describe, expect, it } from 'vitest'
import { strings } from '../src/renderer/src/strings'
import convert from '../src/renderer/src/hanpan/convert-strings.json'
import home from '../src/renderer/src/hanpan/home-strings.json'
import hanpan from '../src/renderer/src/hanpan/strings.json'

/** short labels that may stay as they are in English (names, file kinds) */
const SAME_OK = /^[A-Za-z0-9 .()+:·-]{1,12}$/
const vi = strings.vi as Record<string, string>

describe('Hanpan strings in Vietnamese', () => {
  for (const [name, dict] of Object.entries({ home, hanpan, convert })) {
    it(`${name}: every key has its own Vietnamese`, () => {
      for (const [key, text] of Object.entries(dict as Record<string, Record<string, string>>)) {
        expect(text.vi, key).toBeTruthy()
        if (!SAME_OK.test(text.en)) expect(text.vi, key).not.toBe(text.en)
        expect(vi[key], key).toBe(text.vi)
      }
    })
  }
})
