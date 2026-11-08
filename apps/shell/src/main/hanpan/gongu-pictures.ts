/**
 * Hanpan: finding Gongu pictures for a person, not the AI (docs/plans/gongu-images.md
 * 4.5) — the design board's panel and the Insert ▸ Gongu pictures dialog of the
 * Word and PowerPoint editors. Main searches with the key from Settings →
 * Integrations (the page never sees it); the page sends only a search word, a
 * page number or a work number; addresses come from the service's own answer,
 * and every picture, the thumbnails too, is fetched here and handed over as a
 * data URL (editor pages load no remote picture).
 */
import { ipcMain, nativeImage } from 'electron'
import {
  gonguImageDetail,
  gonguImageSearch,
  type GonguErrorKind,
  type GonguWork,
} from '@genoffice/ai-search'
import { fetchImageBytes } from '@genoffice/electron-utils/fetch-image-bytes'

/** The editors' channels (the design window keeps its own, answering only itself). */
export const GONGU_PICTURE_CHANNELS = {
  search: 'hanpan:gongu-pictures-search',
  picture: 'hanpan:gongu-pictures-picture',
} as const

/** A search hit for a page: the work and its thumbnail as a data URL. */
export interface GonguHit extends GonguWork {
  thumb: string | null
}

export type GonguSearchAnswer =
  { ok: true; works: GonguHit[]; total: number | null } | { ok: false; error: GonguErrorKind }

export type GonguPictureAnswer =
  | { ok: true; dataUrl: string; width: number; height: number; work: GonguWork }
  | { ok: false; error: GonguErrorKind | 'picture' }

const GONGU_PER_PAGE = 20

/** A picture the service pointed at, as a data URL with its size; null when it is not a picture. */
async function pictureOf(
  url: string | undefined,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null
  const fetched = await fetchImageBytes(url)
  if (!fetched) return null
  const image = nativeImage.createFromBuffer(Buffer.from(fetched.base64, 'base64'))
  if (image.isEmpty()) return null
  const { width, height } = image.getSize()
  // the file as it came (a JPEG stays a JPEG); nativeImage only proved it is a picture
  return { dataUrl: `data:${fetched.mime};base64,${fetched.base64}`, width, height }
}

/** Runs `work` over `items` with at most `limit` at once, keeping their order. */
async function mapLimited<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length)
  let next = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await work(items[i]!)
    }
  })
  await Promise.all(lanes)
  return out
}

/** One page of hits for `query` (as the page sent it), thumbnails fetched; null for a bad request. */
export async function searchGonguPictures(
  query: unknown,
  page: unknown,
  key: string,
): Promise<GonguSearchAnswer | null> {
  if (typeof query !== 'string') return null
  // decided before anything else: the picker sends an empty probe when it opens, to
  // show the "key needed" guidance before the person searches
  if (!key.trim()) return { ok: false, error: 'no-key' }
  const result = await gonguImageSearch(query.slice(0, 100), key, {
    page: Math.min(1000, Math.max(1, Math.floor(Number(page) || 1))),
    perPage: GONGU_PER_PAGE,
  })
  if (!result.ok) return { ok: false, error: result.error }
  const works = await mapLimited(result.value.works, 4, async (work) => ({
    ...work,
    thumb: (await pictureOf(work.thumbUrl))?.dataUrl ?? null,
  }))
  return { ok: true, works, total: result.value.total ?? null }
}

/** The large picture of one work with its record; null for a bad request. */
export async function fetchGonguPicture(
  workId: unknown,
  key: string,
): Promise<GonguPictureAnswer | null> {
  if (typeof workId !== 'string') return null
  const detail = await gonguImageDetail(workId, key)
  if (!detail.ok) return { ok: false, error: detail.error }
  const picture = await pictureOf(detail.value.imageUrl ?? detail.value.thumbUrl)
  if (!picture) return { ok: false, error: 'picture' }
  return { ok: true, ...picture, work: detail.value }
}

/**
 * The editors' channels. Any editor page may ask, as with the AI's
 * `hanpan:gongu-image-search`: the answer is the service's public records,
 * and the key stays here. The key is read at each call.
 */
export function registerGonguPictureIpc(deps: { gonguKey(): string }): void {
  ipcMain.handle(GONGU_PICTURE_CHANNELS.search, (_event, query: unknown, page: unknown) =>
    searchGonguPictures(query, page, deps.gonguKey()),
  )
  ipcMain.handle(GONGU_PICTURE_CHANNELS.picture, (_event, workId: unknown) =>
    fetchGonguPicture(workId, deps.gonguKey()),
  )
}
