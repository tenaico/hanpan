/// 시트를 그림(PNG)으로(0.17): 인쇄용으로 놓은 한 장짜리 HTML을 이 창(렌더러) 안에서 그린다.
/// HTML을 SVG의 foreignObject로 감싸 그림으로 읽고 캔버스에 2배로 그려 PNG로 만든다.
/// 숨은 창은 화면보다 큰 면을 그리지 못해(큰 시트가 타일처럼 반복된다) 이 길을 쓴다.
/// 그림 안에서는 PC에 설치된 글꼴만 쓰인다.

/** The longest side a canvas draws reliably, in device pixels. */
export const MAX_IMAGE_SIDE_PX = 16_000
/** Twice the CSS size: sharp when the picture is zoomed or printed. */
const PREFERRED_SCALE = 2
/** Below this the text of a cell is no longer readable; the PDF is the way then. */
const MIN_SCALE = 0.5

/** Device pixels per CSS pixel for a picture of this size, or null when it is too large. */
export function imageScaleFor(widthPx: number, heightPx: number): number | null {
  const side = Math.max(widthPx, heightPx, 1)
  const scale = Math.min(PREFERRED_SCALE, MAX_IMAGE_SIDE_PX / side)
  return scale >= MIN_SCALE ? scale : null
}

/** The HTML page as an SVG document that shows it at `width` × `height` CSS pixels. */
export function svgOfHtml(html: string, width: number, height: number): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const xhtml = new XMLSerializer().serializeToString(parsed.documentElement)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`
  )
}

/** The page drawn as PNG bytes at `scale`. */
export async function rasterizeHtml(
  html: string,
  width: number,
  height: number,
  scale: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOfHtml(html, width, height))}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no canvas')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('the picture could not be written')
  return new Uint8Array(await blob.arrayBuffer())
}
