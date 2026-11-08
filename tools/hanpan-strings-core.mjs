// Shared by tools/hanpan-add-strings.mjs and tools/hanpan-add-block-strings.mjs:
// finding a string property in a language table the way prettier leaves it, and
// replacing a placeholder (the English or Chinese text) with the language's own.

/** a single-quoted literal with the escapes the tables use */
export const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const LITERAL = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"`
export const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const unquote = (literal) => literal.slice(1, -1).replace(/\\(.)/g, '$1')

/**
 * `KEY: '…',` or `KEY: "…",` on one line, or `KEY:` with the literal on the next
 * line (prettier wraps long values that way). `indent` is a regex source.
 */
export function propertyPattern(key, indent) {
  return new RegExp(
    `^(${indent}${escapeRegExp(key)}:)[ \\t]*(?:\\n[ \\t]*)?(${LITERAL}),[ \\t]*$`,
    'm',
  )
}

/** the text a language gets: its own, or the English one until it is translated */
export const valueFor = (text, lang) => text[lang] ?? text.en

/**
 * Replaces each key's placeholder in `body` with the language's text, leaving
 * translated values alone, and reports the keys `body` does not have.
 */
export function replacePlaceholders(body, lang, entries, indent) {
  let text = body
  let replaced = 0
  const missing = []
  for (const [key, entry] of Object.entries(entries)) {
    const found = propertyPattern(key, indent).exec(text)
    if (!found) {
      missing.push(key)
      continue
    }
    const value = valueFor(entry, lang)
    const current = unquote(found[2])
    const placeholder = current === entry.en || (entry.zh !== undefined && current === entry.zh)
    if (current === value || !placeholder) continue
    const line = `${found[1]} ${quote(value)},`
    text = text.slice(0, found.index) + line + text.slice(found.index + found[0].length)
    replaced++
  }
  return { text, replaced, missing }
}
