import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { graphicsNoticeFiles, graphicsNoticeSection } from '../../../tools/graphics-notices.mjs'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'graphics-notices-'))
  dirs.push(root)
  for (const [rel, text] of Object.entries(files)) {
    const path = join(root, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
  return root
}

const pin = (repo: string, tag: string) => ({
  repo,
  tag,
  asset: 'web.zip',
  size: 1,
  sha256: 'a'.repeat(64),
})

const read = (path: string) => readFileSync(path, 'utf8')

describe('graphics notices', () => {
  it('lists notices and licences in a stable order', () => {
    const dir = tree({
      'index.html': '<html></html>',
      NOTICE: 'notice',
      'LICENSE-MIT': 'mit',
      'LICENSE-APACHE': 'apache',
      'ATTRIBUTION.md': 'attribution',
      'OFL-Inter.txt': 'ofl',
      'HANPAN-CHANGES.md': 'changes',
      'ASSETS.md': 'assets',
      'licenses/zlib/LICENSE': 'zlib',
      'licenses/a.txt': 'a',
      'assets/app.js': 'code',
    })
    expect(graphicsNoticeFiles(dir)).toEqual([
      'ASSETS.md',
      'ATTRIBUTION.md',
      'HANPAN-CHANGES.md',
      'LICENSE-APACHE',
      'LICENSE-MIT',
      'NOTICE',
      'OFL-Inter.txt',
      'licenses/a.txt',
      'licenses/zlib/LICENSE',
    ])
  })

  it('also carries licence and font texts deeper in the site (h2 layout)', () => {
    const dir = tree({
      'index.html': 'x',
      'LICENSE-MIT': 'mit',
      'licenses/zlib.txt': 'zlib',
      'assets/icons/LICENSE-lucide.txt': 'lucide',
      'assets/fonts/OFL-Inter.txt': 'inter',
      'fonts/abc123/OFL.txt': 'font',
      'docs/brand/LICENSE-brand.txt': 'brand',
      'crates/tiny-skia/LICENSE-BSD': 'bsd',
      'assets/app.js': 'code',
      'docs/guide.md': 'not a licence',
    })
    expect(graphicsNoticeFiles(dir)).toEqual([
      'LICENSE-MIT',
      'licenses/zlib.txt',
      'assets/fonts/OFL-Inter.txt',
      'assets/icons/LICENSE-lucide.txt',
      'crates/tiny-skia/LICENSE-BSD',
      'docs/brand/LICENSE-brand.txt',
      'fonts/abc123/OFL.txt',
    ])
  })

  it('gaps an app whose web build is missing', () => {
    const webRoot = tree({ 'illust/index.html': 'x', 'illust/LICENSE-MIT': 'mit' })
    const gap = vi.fn()
    const text = graphicsNoticeSection({
      webRoot,
      pins: { photo: pin('o/photocraft', 'v1.0.0'), illust: pin('o/vectorcraft', 'v0.21.0') },
      read,
      gap,
    })
    expect(text).toContain('8. AI Photo and AI Illustration web apps (PhotoCraft and VectorCraft)')
    expect(text).toContain('illust v0.21.0 (https://github.com/o/vectorcraft)')
    expect(text).not.toContain('photo v1.0.0')
    expect(gap).toHaveBeenCalledTimes(1)
    expect(gap.mock.calls[0]![0]).toMatch(/photo/)
  })

  it('gaps an app without a pin even when its folder is there', () => {
    const webRoot = tree({ 'photo/index.html': 'x', 'photo/LICENSE-MIT': 'mit' })
    const gap = vi.fn()
    graphicsNoticeSection({ webRoot, pins: {}, read, gap })
    expect(gap).toHaveBeenCalledTimes(2)
  })

  it('writes identical texts once', () => {
    const webRoot = tree({
      'photo/index.html': 'x',
      'photo/LICENSE-MIT': 'the same MIT text',
      'photo/NOTICE': 'photo notice',
      'illust/index.html': 'x',
      'illust/LICENSE-MIT': 'the same MIT text',
      'illust/NOTICE': 'illust notice',
    })
    const text = graphicsNoticeSection({
      webRoot,
      pins: { photo: pin('o/photocraft', 'v1.0.0'), illust: pin('o/vectorcraft', 'v0.21.0') },
      read,
      gap: vi.fn(),
    })
    expect(text.split('the same MIT text')).toHaveLength(2)
    expect(text).toContain('--- photo/LICENSE-MIT ---')
    expect(text).toContain('[illust/LICENSE-MIT: same text as photo/LICENSE-MIT]')
    expect(text).toContain('photo notice')
    expect(text).toContain('illust notice')
  })
})
