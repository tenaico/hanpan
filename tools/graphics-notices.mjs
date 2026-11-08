// Notice section 8: the PhotoCraft and VectorCraft web builds that open in the
// AI Photo and AI Illustration tabs (decision 0093). Each build ships its
// licences, NOTICE, asset list, the OFL texts of its fonts and a note of what
// was changed for Hanpan; all of them are carried, and a text both builds ship
// is written once. Used by tools/gen-third-party-notices.mjs.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const TOP_NOTICE_FILE =
  /^(LICENSE(-[\w.-]+)?(\.\w+)?|NOTICE(\.\w+)?|ATTRIBUTION\.md|ASSETS\.md|OFL-.+\.txt|HANPAN-CHANGES\.md)$/i

const KINDS = ['photo', 'illust']

const sub = (title) => `\n${'-'.repeat(72)}\n${title}\n${'-'.repeat(72)}\n`
const hr = (title) => `\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}\n`

/** licence and font texts anywhere below the top: LICENSE*, OFL*, NOTICE*, COPYING* */
const DEEP_NOTICE_FILE = /^(LICENSE|OFL|NOTICE|COPYING)([-._][\w.-]*)?$/i

/**
 * The notice files of one web build: the top-level ones by name, then everything
 * under licenses/, then licence and font texts deeper in the site (assets/,
 * fonts/, docs/brand/, crates/), each group by path.
 */
export function graphicsNoticeFiles(dir) {
  const top = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && TOP_NOTICE_FILE.test(e.name))
    .map((e) => e.name)
    .sort()
  const nested = []
  const deep = []
  const walk = (rel, into, pick) => {
    for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (!rel && e.name === 'licenses' && into === deep) continue
        walk(child, into, pick)
      } else if (e.isFile() && rel && pick(e.name)) into.push(child)
    }
  }
  if (existsSync(join(dir, 'licenses'))) walk('licenses', nested, () => true)
  walk('', deep, (name) => DEEP_NOTICE_FILE.test(name))
  return [...top, ...nested.sort(), ...deep.sort()]
}

/**
 * Section 8 of the third-party notice. An app whose web build or pin is missing
 * is reported through `gap` and left out.
 */
export function graphicsNoticeSection({ webRoot, pins, read, gap }) {
  let out = hr('8. AI Photo and AI Illustration web apps (PhotoCraft and VectorCraft)')
  const seen = new Map()
  for (const kind of KINDS) {
    const pin = pins[kind]
    const dir = join(webRoot, kind)
    if (!pin || !existsSync(join(dir, 'index.html'))) {
      gap(
        pin
          ? `${kind}: no web build in ${dir} (run npm run web -w @genoffice/graphics)`
          : `${kind}: no pin in tools/graphics-web-pins.json`,
      )
      continue
    }
    out += sub(`${kind} ${pin.tag} (https://github.com/${pin.repo})`)
    for (const file of graphicsNoticeFiles(dir)) {
      const text = read(join(dir, file)).trim()
      const label = `${kind}/${file}`
      if (seen.has(text)) {
        out += `\n[${label}: same text as ${seen.get(text)}]\n`
        continue
      }
      seen.set(text, label)
      out += `\n--- ${label} ---\n${text}\n`
    }
  }
  return out
}
