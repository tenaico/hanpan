import { describe, expect, it } from 'vitest'
import { buildParseMap } from '../src/renderer/document/parse-map'
import { hasDocumentScripts, instrumentForPreview } from '../src/renderer/preview/instrument'

const DOC =
  '<!doctype html><html><head><title>t</title><script>document.title = "ran"</script></head>' +
  '<body><button onclick="alert(1)">x</button></body></html>'

describe('scripts of an opened HTML file stay off in the preview until allowed', () => {
  it('blocks the document scripts with a CSP that only lets the inspector run', () => {
    const out = instrumentForPreview(DOC, buildParseMap(DOC, 1), 'INSPECTOR', {
      blockScripts: true,
    })
    const meta =
      /<meta http-equiv="Content-Security-Policy" content="script-src 'nonce-([\w-]+)'">/.exec(out)
    expect(meta).not.toBeNull()
    // before the author's own <script> in <head>
    expect(out.indexOf(meta![0])).toBeLessThan(out.indexOf('document.title'))
    expect(out).toContain(`<script data-gx-inspector nonce="${meta![1]}">INSPECTOR</script>`)
  })

  it('leaves the document untouched when scripts are allowed', () => {
    const out = instrumentForPreview(DOC, buildParseMap(DOC, 1), 'INSPECTOR')
    expect(out).not.toContain('Content-Security-Policy')
  })

  it('a fragment without <head> still gets the policy first', () => {
    const doc = '<p>hi</p><script>x()</script>'
    const out = instrumentForPreview(doc, buildParseMap(doc, 1), 'I', { blockScripts: true })
    expect(out.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true)
  })

  it('knows when a document has scripts worth asking about', () => {
    expect(hasDocumentScripts(DOC)).toBe(true)
    expect(hasDocumentScripts('<p onclick="x()">a</p>')).toBe(true)
    expect(hasDocumentScripts('<a href="javascript:void 0">a</a>')).toBe(true)
    expect(hasDocumentScripts('<p>no script here, onclick is just a word</p>')).toBe(false)
  })
})
