// Adds Hanpan string keys to an editor's 21 language files (src/renderer/i18n/<dir>/*.ts).
// Korean and English are written by hand; a language without a translation gets the English
// text, and that placeholder is replaced once the JSON carries the language. Translated
// values are left alone, so the script can run again after adding keys or languages.
//
// usage: node tools/hanpan-add-strings.mjs <dir with ko.ts, en.ts, zh.ts...> <strings.json>
// strings.json: { "key": { "ko": "...", "en": "...", "zh"?: "...", "vi"?: "..." }, ... }
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { quote, replacePlaceholders, valueFor } from './hanpan-strings-core.mjs'

/** One language file (`export const vi = { … }`): placeholders replaced, missing keys appended. */
export function upsertFileStrings(source, lang, entries) {
  const { text, replaced, missing } = replacePlaceholders(source, lang, entries, '[ \\t]+')
  if (missing.length === 0) return { text, added: 0, replaced }
  // the object literal ends at the last line that starts with `}`
  const end = text.lastIndexOf('\n}')
  if (end < 0) throw new Error('no closing brace')
  const lines = missing.map((key) => `  ${key}: ${quote(valueFor(entries[key], lang))},`)
  return {
    text: `${text.slice(0, end)}\n${lines.join('\n')}${text.slice(end)}`,
    added: missing.length,
    replaced,
  }
}

function main() {
  const [dir, stringsPath] = process.argv.slice(2)
  if (!dir || !stringsPath) {
    console.error('usage: node tools/hanpan-add-strings.mjs <i18n dir> <strings.json>')
    process.exit(2)
  }
  const strings = JSON.parse(readFileSync(stringsPath, 'utf8'))
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const path = join(dir, file)
    const result = upsertFileStrings(readFileSync(path, 'utf8'), file.replace(/\.ts$/, ''), strings)
    if (!result.added && !result.replaced) continue
    writeFileSync(path, result.text)
    console.log(`${file}: +${result.added} ~${result.replaced}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
