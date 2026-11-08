// The old product name stays off every screen, out of HWP memos and out of the CLI
// installer's output (docs/standards.md: the product name comes from product.ts).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PRODUCT_NAME } from '@genoffice/i18n'
import { strings } from '../src/renderer/src/strings'

const OLD = /IeumOffice|이음오피스/
/** a file relative to apps/shell */
const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

describe('no old product name', () => {
  it('no screen string carries the old product name', () => {
    for (const [lang, table] of Object.entries(strings)) {
      for (const [key, value] of Object.entries(table as Record<string, string>)) {
        expect(`${lang}.${key}: ${value}`).not.toMatch(OLD)
      }
    }
  })

  it('the update window has no old name', () =>
    expect(read('src/renderer/update.html')).not.toMatch(OLD))

  it('the HWP memo author fallback is the product name', () =>
    expect(read('../hwp/studio-plugin/agent-plugin.mjs')).toContain(
      `return clean || '${PRODUCT_NAME}'`,
    ))

  it('the CLI installer prints the product name', () =>
    expect(read('../../packaging/cli/install.sh')).not.toMatch(OLD))
})
