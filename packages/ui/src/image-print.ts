/**
 * 그림 인쇄: 디자인 보드의 페이지와 AI 포토·AI 일러스트의 그림을 용지에 놓는다.
 *
 * 인쇄하는 그림은 내보내기가 만드는 그림 그대로다(디자인 보드는 PNG·PDF 내보내기와
 * 같은 150 dpi PNG, 그래픽 탭은 앱의 합성 그림). 미리보기(화면)와 인쇄(뒷단의 숨은
 * 창)가 같은 HTML을 쓰므로 미리보기에서 본 대로 인쇄된다. 순수 모듈이라 화면과
 * 뒷단이 함께 가져다 쓴다.
 */

/** 용지 한 장: 크기(mm)와 그림 둘레의 여백(mm). */
export interface PrintSheet {
  widthMm: number
  heightMm: number
  marginMm: number
}

export type PrintOrientation = 'portrait' | 'landscape'

/** 인쇄할 그림 하나: 주소(data: 또는 blob:)와 픽셀 크기. */
export interface PrintPicture {
  src: string
  width: number
  height: number
}

/** 앱에 달라고 하는 그림의 긴 변: A4 긴 변(297mm)을 300 dpi로 찍는 크기. */
export const PRINT_MAX_SIDE = 3508

/** 용지에 맞출 때 둘레 여백: 대부분의 프린터가 찍지 못하는 가장자리보다 넓게. */
export const FIT_MARGIN_MM = 10

/** 이름 있는 용지(세로 기준 mm). 시스템 인쇄 대화상자에 이 이름으로 알린다. */
export type PaperName = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'

const PAPERS: ReadonlyArray<{ name: PaperName; width: number; height: number }> = [
  { name: 'A3', width: 297, height: 420 },
  { name: 'A4', width: 210, height: 297 },
  { name: 'A5', width: 148, height: 210 },
  { name: 'Letter', width: 215.9, height: 279.4 },
  { name: 'Legal', width: 215.9, height: 355.6 },
  { name: 'Tabloid', width: 279.4, height: 431.8 },
]

/** 픽셀을 mm로 옮긴 값이 용지 변과 이만큼 안이면 그 용지다(1240px@150dpi = 209.97mm). */
const PAPER_SNAP_MM = 0.5

function paperOf(widthMm: number, heightMm: number): { width: number; height: number } | null {
  for (const paper of PAPERS) {
    const near = (a: number, b: number) => Math.abs(a - b) <= PAPER_SNAP_MM
    if (near(widthMm, paper.width) && near(heightMm, paper.height))
      return { width: paper.width, height: paper.height }
    if (near(widthMm, paper.height) && near(heightMm, paper.width))
      return { width: paper.height, height: paper.width }
  }
  return null
}

export function autoOrientation(width: number, height: number): PrintOrientation {
  return width > height ? 'landscape' : 'portrait'
}

/** A4에 맞춰 놓는 용지: 방향은 묻지 않으면 그림이 놓인 방향. */
export function fitSheet(
  width: number,
  height: number,
  orientation: PrintOrientation = autoOrientation(width, height),
): PrintSheet {
  return orientation === 'landscape'
    ? { widthMm: 297, heightMm: 210, marginMm: FIT_MARGIN_MM }
    : { widthMm: 210, heightMm: 297, marginMm: FIT_MARGIN_MM }
}

/**
 * 디자인 페이지의 용지: 내보내기 해상도(`dpi`)에서 페이지가 용지 크기면(A4 포스터)
 * 그 용지에 제 크기로, 여백 없이(PDF 내보내기의 페이지와 같다). 화면용 형식(카드뉴스,
 * 썸네일)은 A4에 맞춘다.
 */
export function paperSheetFor(width: number, height: number, dpi: number): PrintSheet {
  const paper = paperOf((width * 25.4) / dpi, (height * 25.4) / dpi)
  if (paper) return { widthMm: paper.width, heightMm: paper.height, marginMm: 0 }
  return fitSheet(width, height)
}

/** 그림이 용지 안에서 차지하는 자리(mm): 여백 안에 비율을 지켜 가득, 가운데. */
export function picturePlacement(
  width: number,
  height: number,
  sheet: PrintSheet,
): { leftMm: number; topMm: number; widthMm: number; heightMm: number } {
  const boxW = sheet.widthMm - 2 * sheet.marginMm
  const boxH = sheet.heightMm - 2 * sheet.marginMm
  const scale = Math.min(boxW / width, boxH / height)
  const w = width * scale
  const h = height * scale
  return {
    leftMm: (sheet.widthMm - w) / 2,
    topMm: (sheet.heightMm - h) / 2,
    widthMm: w,
    heightMm: h,
  }
}

/** 페이지에 넣어도 되는 그림 주소: 그림 data URL이나 이 화면의 blob URL뿐이다. */
const SAFE_SRC = /^(data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+|blob:[A-Za-z0-9:/._%-]+)$/

const PRINT_CSP =
  "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"

const mm = (value: number) => `${Math.round(value * 1000) / 1000}mm`

export interface ImagePrintHtmlOptions {
  /** 미리보기에서만: 화면에 줄여 보이는 배율과 종이 모양 */
  previewZoom?: number
}

/** 그림마다 한 장씩, 용지 크기를 페이지에 적은 HTML. 스크립트도 바깥 주소도 없다. */
export function buildImagePrintHtml(
  pictures: PrintPicture[],
  sheet: PrintSheet,
  options: ImagePrintHtmlOptions = {},
): string {
  const body = pictures.map((picture) => {
    if (!SAFE_SRC.test(picture.src)) throw new Error('image print: not a picture address')
    const place = picturePlacement(picture.width, picture.height, sheet)
    const style = `left:${mm(place.leftMm)};top:${mm(place.topMm)};width:${mm(place.widthMm)};height:${mm(place.heightMm)}`
    return `<div class="page"><img src="${picture.src}" style="${style}" alt=""></div>`
  })
  const zoom = options.previewZoom
  const screen =
    zoom && zoom > 0
      ? [
          '@media screen {',
          `  html { zoom: ${zoom}; }`,
          '  body { background: #8a8f98; padding: 6mm 0; }',
          '  .page { margin: 0 auto 6mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.35); }',
          '}',
        ]
      : []
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}">`,
    '<style>',
    `@page { size: ${mm(sheet.widthMm)} ${mm(sheet.heightMm)}; margin: 0; }`,
    '* { margin: 0; padding: 0; }',
    'body { background: #fff; }',
    `.page { position: relative; overflow: hidden; background: #fff; width: ${mm(sheet.widthMm)}; height: ${mm(sheet.heightMm)}; break-after: page; }`,
    '.page:last-child { break-after: auto; }',
    '.page img { position: absolute; display: block; }',
    ...screen,
    '</style>',
    '</head>',
    `<body>${body.join('')}</body>`,
    '</html>',
  ].join('\n')
}

/** 시스템 인쇄 대화상자에 알릴 용지: 이름 있는 용지는 이름과 방향, 아니면 마이크론. */
export function printPageOptions(sheet: PrintSheet): {
  pageSize: PaperName | { width: number; height: number }
  landscape: boolean
} {
  const landscape = sheet.widthMm > sheet.heightMm
  const short = Math.min(sheet.widthMm, sheet.heightMm)
  const long = Math.max(sheet.widthMm, sheet.heightMm)
  const paper = PAPERS.find(
    (p) => Math.abs(p.width - short) <= PAPER_SNAP_MM && Math.abs(p.height - long) <= PAPER_SNAP_MM,
  )
  if (paper) return { pageSize: paper.name, landscape }
  return {
    pageSize: { width: Math.round(short * 1000), height: Math.round(long * 1000) },
    landscape,
  }
}

const isLength = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max

/** 화면이 보낸 용지가 쓸 만한지(뒷단의 확인). */
export function isPrintSheet(value: unknown): value is PrintSheet {
  if (!value || typeof value !== 'object') return false
  const { widthMm, heightMm, marginMm } = value as Partial<PrintSheet>
  if (!isLength(widthMm, 2000) || !isLength(heightMm, 2000) || !isLength(marginMm, 100))
    return false
  return widthMm >= 20 && heightMm >= 20 && 2 * marginMm < Math.min(widthMm, heightMm)
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** PNG 머리(IHDR)에 적힌 크기. PNG가 아니거나 크기가 없으면 null. 그림을 풀지 않는다. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.byteLength < 24 || !PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null
  if (String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!) !== 'IHDR') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (!width || !height || width > 100_000 || height > 100_000) return null
  return { width, height }
}
