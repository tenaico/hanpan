/**
 * Guides the model loads on demand (`load_guide`), so the base prompt stays
 * small (design 6-4, as the sheets editor does). The illustration guides were
 * written from VectorCraft 0.21.0's own parameter docs, the photo guides from
 * PhotoCraft 0.20.2-h1's (tests/fixtures).
 */
import type { GraphicsKind } from '../../shared/kinds'
import illustShapes from './prompts/guides/illust-shapes.md?raw'
import illustText from './prompts/guides/illust-text.md?raw'
import illustArrange from './prompts/guides/illust-arrange.md?raw'
import illustColor from './prompts/guides/illust-color.md?raw'
import illustTrace from './prompts/guides/illust-trace.md?raw'
import illustExport from './prompts/guides/illust-export.md?raw'
import photoBackground from './prompts/guides/photo-background.md?raw'
import photoAdjust from './prompts/guides/photo-adjust.md?raw'
import photoText from './prompts/guides/photo-text.md?raw'
import photoCropResize from './prompts/guides/photo-crop-resize.md?raw'
import photoExport from './prompts/guides/photo-export.md?raw'

interface GuideEntry {
  description: string
  content: string
}

const CATALOG: Record<GraphicsKind, Record<string, GuideEntry>> = {
  illust: {
    shapes: {
      description: 'rectangles, ellipses, polygons, stars, lines, grids',
      content: illustShapes,
    },
    text: { description: 'creating and styling text, outlines', content: illustText },
    arrange: {
      description: 'selecting, aligning, moving, rotating, grouping, layers',
      content: illustArrange,
    },
    color: { description: 'fill and stroke colors and gradients', content: illustColor },
    trace: { description: 'turning a placed picture into vector paths', content: illustTrace },
    export: { description: 'giving the person a PNG or SVG copy', content: illustExport },
  },
  photo: {
    background: {
      description: 'removing a background, selecting the subject, masks',
      content: photoBackground,
    },
    adjust: { description: 'tone, colour, sharpening and noise', content: photoAdjust },
    text: { description: 'type layers (Korean fonts) and arranging layers', content: photoText },
    'crop-resize': {
      description: 'cropping, trimming, image and canvas size',
      content: photoCropResize,
    },
    export: { description: 'giving the person a PNG or JPEG copy', content: photoExport },
  },
}

export function guideNames(kind: GraphicsKind): string[] {
  return Object.keys(CATALOG[kind])
}

export function guideCatalogSummary(kind: GraphicsKind): string {
  return Object.entries(CATALOG[kind])
    .map(([name, entry]) => `${name} — ${entry.description}`)
    .join('; ')
}

export function loadGuides(
  kind: GraphicsKind,
  names: readonly string[],
): { ok: true; content: string } | { ok: false; error: string } {
  const catalog = CATALOG[kind]
  const unknown = names.filter((name) => !catalog[name])
  if (unknown.length > 0 || names.length === 0) {
    return {
      ok: false,
      error: `Unknown guide ${unknown.join(', ') || '(none given)'}; available: ${guideNames(kind).join(', ') || 'none yet'}`,
    }
  }
  return { ok: true, content: names.map((name) => catalog[name]!.content).join('\n\n---\n\n') }
}
