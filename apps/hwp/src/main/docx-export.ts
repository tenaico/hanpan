import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { convertHtmlToDocx } from '../../../../packages/html2docx/src'
import { ElectronBrowserDriver } from '../../../../packages/html2docx/src/drivers/electron'

/**
 * 한글 문서를 Word로(0.17): 플러그인이 엔진에서 받은 문서 HTML(문단·표·그림)을 HTML 앱의
 * Word 내보내기와 같은 html2docx 사슬로 바꾼다. 숨은 창에 HTML을 띄워 계산된 모양을 읽고
 * 편집할 수 있는 Word 구조(문단, 표, 그림)로 쓴다.
 *
 * 잃는 것: 머리말·꼬리말, 각주·미주, 쪽 번호, 메모, 글상자·도형, 누름틀의 동작, 다단과 쪽
 * 나눔 위치, 문단 번호의 자동 매김(번호 글자는 남는다). 글꼴은 이름으로 넘어가고 Word가 그
 * 글꼴을 가진 PC에서 같은 모양이 된다.
 */

/** Largest document HTML the channel takes; pictures are data URLs inside it. */
export const MAX_DOCX_HTML_CHARS = 200_000_000

/** A4 at 96dpi, as the HTML app's Word export. */
const VIEWPORT = { width: 794, height: 1123, deviceScaleFactor: 2 }
/** A page that never settles must not hold the export forever. */
const TIMEOUT_MS = 180_000

/** Why the HTML from the renderer is not converted, or null when it may be. */
export function badDocxHtml(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trimStart().startsWith('<!DOCTYPE html>')) {
    return 'not a document'
  }
  if (html.length > MAX_DOCX_HTML_CHARS) return 'too large'
  return null
}

/** The document HTML as .docx bytes. */
export async function htmlToDocx(html: string): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), 'ieum-hwp-docx-'))
  let driver: ElectronBrowserDriver | null = null
  let watchdog: ReturnType<typeof setTimeout> | undefined
  try {
    const htmlPath = join(dir, 'document.html')
    await writeFile(htmlPath, html, 'utf8')
    driver = await ElectronBrowserDriver.create(VIEWPORT)
    const conversion = convertHtmlToDocx({ url: pathToFileURL(htmlPath).href }, driver).then(
      ({ docx }) => docx,
    )
    return await Promise.race([
      conversion,
      new Promise<Uint8Array>((_, reject) => {
        watchdog = setTimeout(() => {
          if (driver && !driver.isWindowDestroyed()) driver.destroyNow()
          driver = null
          reject(new Error('the Word export timed out'))
        }, TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(watchdog)
    await driver?.close()
    await rm(dir, { recursive: true, force: true })
  }
}
