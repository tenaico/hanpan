/**
 * Hanpan's main-process parts in one place: the map → document sender, the
 * link store, and the rhwp engine the sender writes HWPX with. `index.ts` calls
 * `setupHanpan` once and forwards the editors' "file saved" hooks to it.
 */
import {
  DOC_TEMPLATES,
  DOC_THEMES,
  OFFICIAL_FORMS,
  PICTURE_TEMPLATES,
  TEMPLATE_PICTURES,
  officialFormSource,
  pictureCredit,
  templateMapOutline,
  changeHwpTone,
  checkHwpGongmun,
  markHwpReview,
  tidyGongmun,
  blocksToDocx,
  blocksToHwp,
  documentFileName,
  markdownToBlocks,
  styledDeckOps,
  type HwpEngine,
  type MarkdownPicture,
  type SlidePlan,
  type SlideStyleId,
  type StyledDeckOptions,
} from '@genoffice/hanpan-core'
import type { Op } from '@genoffice/pptx-ops'
import { createXmindDocumentFromOutline } from '@genoffice/xmind-engine'
import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { atomicWriteFile } from '../atomic-write'
import { buildTargetDocument } from '../send-to-app/from-markdown'

/** a briefing is a page or two; anything far longer is not one */
const BRIEFING_MAX_CHARS = 100_000
import { buildDeck } from '../generate/convert'
import { outlineToOps } from '../mcp/pptx-outline'
import { readStoredAiSettings, writeStoredAiSettings } from '../../../../docs/src/main/docs-main'
import { createLinkStore, type LinkStore, type TabContents } from './link-store'
import { defaultAiDeps, settleDefaultAi } from './local-ai-first'
import { createMapSender, type SendMapDeps } from './send-map'
import { createSyncService, type SyncTab } from './sync-service'
import { hwpReadBytes, hwpReplaceDocument } from '../../../../hwp/src/main/hwp-main'
import { copyFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { BrowserWindow, webContents as allWebContents } from 'electron'
import { docxToOdt } from '@genoffice/odt-engine'
import { dirname } from 'node:path'
import { checkConvertRequest, convertMarkdown, type ConvertResult } from './markdown-convert'
import type { MyForm } from './my-forms'
import chuseongJpg from './pictures/chuseong.jpg?asset'
import geumgangJpg from './pictures/geumgang.jpg?asset'
import inwangJpg from './pictures/inwang.jpg?asset'
import seodangJpg from './pictures/seodang.jpg?asset'
import ssireumJpg from './pictures/ssireum.jpg?asset'
import adminAppealHwp from './forms/admin-appeal.hwp?asset'
import infoDisclosureHwp from './forms/info-disclosure.hwp?asset'
import powerOfAttorneyHwp from './forms/power-of-attorney.hwp?asset'
import refusalObjectionHwp from './forms/refusal-objection.hwp?asset'

/** The 글집 templates, then Hanpan's own with pictures. */
const ALL_TEMPLATES = [...DOC_TEMPLATES, ...PICTURE_TEMPLATES]

/** Where each template picture's bytes are; what each one is lives in hanpan-core (`TEMPLATE_PICTURES`). */
const PICTURE_FILES: Record<string, string> = {
  chuseong: chuseongJpg,
  geumgang: geumgangJpg,
  inwang: inwangJpg,
  seodang: seodangJpg,
  ssireum: ssireumJpg,
}

/** Where each official form's HWP file is; what each one is lives in hanpan-core (`OFFICIAL_FORMS`). */
const FORM_FILES: Record<string, string> = {
  'form-admin-appeal': adminAppealHwp,
  'form-info-disclosure': infoDisclosureHwp,
  'form-power-of-attorney': powerOfAttorneyHwp,
  'form-refusal-objection': refusalObjectionHwp,
}

/** A template picture with its credit, or undefined (the line stays its caption) when it cannot be read. */
function templatePicture(id: string): MarkdownPicture | undefined {
  const known = TEMPLATE_PICTURES.find((p) => p.id === id)
  const file = PICTURE_FILES[id]
  if (!known || !file) return undefined
  try {
    const bytes = new Uint8Array(readFileSync(file))
    return {
      image: { bytes, mime: 'image/jpeg', width: known.width, height: known.height },
      credit: pictureCredit(known),
    }
  } catch (error) {
    console.warn('[hanpan] template picture missing', id, error)
    return undefined
  }
}

/** Where the rhwp engine's wasm is: the same search as packages/file-parse (dev node_modules, then Resources/wasm). */
function rhwpWasmPath(): string {
  const fromEnv = process.env.GENOFFICE_RHWP_WASM
  if (fromEnv) return fromEnv
  try {
    return createRequire(import.meta.url).resolve('@rhwp/core/rhwp_bg.wasm')
  } catch {
    /* fall through */
  }
  const resources = (process as { resourcesPath?: string }).resourcesPath
  if (resources) return join(resources, 'wasm', 'rhwp_bg.wasm')
  throw new Error('rhwp_bg.wasm not found')
}

let engine: Promise<HwpEngine> | null = null

/** A page of HTML printed to A4 PDF pages in a hidden window: no script, no preload, nothing fetched. */
export async function printHtmlToPdf(html: string): Promise<Uint8Array> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      javascript: false,
    },
  })
  try {
    await win.loadURL(
      `data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf8').toString('base64')}`,
    )
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    })
    return new Uint8Array(pdf)
  } finally {
    win.destroy()
  }
}

export function loadHwpEngine(): Promise<HwpEngine> {
  if (!engine) {
    const loading = (async () => {
      const mod = await import('@rhwp/core')
      await mod.default({ module_or_path: readFileSync(rhwpWasmPath()) })
      return mod as unknown as HwpEngine
    })()
    engine = loading
    loading.catch(() => {
      if (engine === loading) engine = null
    })
  }
  return engine
}

/**
 * Slides → deck. With a style, the style draws every slide (slide-styles.ts);
 * without one, the shell's own outline-to-ops builder makes the plain deck.
 */
export async function buildHanpanDeck(
  slides: SlidePlan[],
  style?: SlideStyleId,
  options?: StyledDeckOptions,
): Promise<Uint8Array> {
  if (style) return buildDeck(styledDeckOps(slides, style, options) as Op[])
  const ops: Op[] = outlineToOps(
    slides.map((s) => ({
      title: s.title,
      paragraphs: s.paragraphs.map((p) => ({
        text: p.text,
        ...(p.bullet ? { bullet: p.bullet } : {}),
        ...(p.level !== undefined ? { level: p.level } : {}),
        ...(p.bold ? { bold: true } : {}),
      })),
    })),
  )
  slides.forEach((s, index) => {
    if (s.notes) ops.push({ op: 'setNotes', target: { slide: index }, text: s.notes } as Op)
  })
  return buildDeck(ops)
}

export interface HanpanSetup {
  links: LinkStore
  sendMap: ReturnType<typeof createMapSender>
  /** a document tab (HWP, Word, slides) saved to `path` */
  documentSaved(wc: TabContents, path: string): void
  /** a mind map tab saved to `path` */
  mapSaved(wc: TabContents, path: string): void
  /** once the app is ready: make a local AI server on this PC the default AI (once) */
  adoptLocalAi(): void
  /** one of 글집's document tools on the HWP document open in tab `wc` */
  hwpTool(wc: Electron.WebContents, request: unknown): Promise<unknown>
  /** the 글집 templates, then the official forms (`form`: the statute it comes from), for the Home picker */
  templates(): {
    id: string
    title: string
    category: string
    description: string
    icon: string
    form?: string
  }[]
  /** a template as a new untitled HWP or Word document in a tab */
  /** `xmind` opens the template's headings and lists as a mind map; an official form opens only as HWP */
  openTemplate(id: unknown, target: unknown): Promise<{ ok: true } | { ok: false; error: string }>
  /** a new untitled mind map in a tab with `topic` as its central topic (Home's start box) */
  newMap(topic: unknown): Promise<{ ok: true } | { ok: false; error: string }>
  /** 내 양식: 보관한 파일의 사본을 제목 없는 새 워드·한글 문서로 연다(보관한 파일은 건드리지 않는다) */
  openMyForm(form: MyForm, bytes: Uint8Array): Promise<boolean>
  /**
   * 트렌드 카드의 AI 브리핑(0.19.1): Home이 쓴 Markdown을 제목 없는 새 워드 문서로 연다.
   * 사본은 임시 폴더에만 있고, 첫 저장 때 어디에 둘지 묻는다
   */
  openBriefing(request: unknown): Promise<{ ok: true } | { ok: false; error: string }>
  sync: ReturnType<typeof createSyncService>
  /** the Markdown converter on Home: one text into every ticked format, in `folder` */
  convertMarkdown(request: unknown, folder: string): Promise<ConvertResult>
}

export interface HanpanShellDeps {
  openCopy: SendMapDeps['openCopy']
  /** the open tab's web contents id and title for a file, if a tab has it open */
  tabForFile(path: string): { contentsId: number; title: string } | null
  /** the title of the tab whose web contents has this id */
  tabTitleOf(contentsId: number): string | null
}

export function setupHanpan(deps: HanpanShellDeps): HanpanSetup {
  const links = createLinkStore({
    path: () => join(app.getPath('userData'), 'hanpan-links.json'),
    write: (path, text) => atomicWriteFile(path, Buffer.from(text, 'utf8')),
  })
  const sendMap = createMapSender({
    loadHwpEngine,
    buildDeck: buildHanpanDeck,
    makeCopyDir: async () => {
      const dir = join(app.getPath('temp'), 'hanpan-sent', randomUUID())
      mkdirSync(dir, { recursive: true })
      return dir
    },
    writeFile: (path, bytes) => atomicWriteFile(path, Buffer.from(bytes)),
    removeDir: async (dir) => rmSync(dir, { recursive: true, force: true }),
    openCopy: deps.openCopy,
    recordLink: (link, documentTab, mapTab) => links.add(link, documentTab, mapTab),
    newId: () => randomUUID(),
    now: () => Date.now(),
  })
  const liveContents = (id: number) => {
    const wc = allWebContents.fromId(id)
    return wc && !wc.isDestroyed() ? wc : null
  }
  const sync = createSyncService({
    links,
    loadHwpEngine,
    documentTab: (link): SyncTab | null => {
      const holder = links.holderOf(link.id)
      if (holder !== null && liveContents(holder))
        return { id: holder, title: deps.tabTitleOf(holder) ?? '' }
      if (!link.docPath) return null
      const open = deps.tabForFile(link.docPath)
      return open && liveContents(open.contentsId)
        ? { id: open.contentsId, title: open.title }
        : null
    },
    readTab: (tab) => {
      const wc = liveContents(tab.id)
      return wc ? hwpReadBytes(wc) : Promise.reject(new Error('the document tab was closed'))
    },
    replaceInTab: (tab, bytes) => {
      const wc = liveContents(tab.id)
      if (wc) hwpReplaceDocument(wc, bytes)
    },
    readFile: async (path) => new Uint8Array(await readFile(path)),
    writeFileWithBackup: async (path, bytes) => {
      if (existsSync(path)) copyFileSync(path, `${path}.bak`)
      await atomicWriteFile(path, Buffer.from(bytes))
    },
    now: () => Date.now(),
  })
  const makeCopyDir = async () => {
    const dir = join(app.getPath('temp'), 'hanpan-sent', randomUUID())
    mkdirSync(dir, { recursive: true })
    return dir
  }
  /** a copy of a file's bytes as a new untitled document in its own temp folder */
  const openBytesCopy = async (
    editor: 'hwp' | 'docs',
    bytes: Uint8Array,
    fileName: string,
    title: string,
  ): Promise<boolean> => {
    const dir = await makeCopyDir()
    const path = join(dir, fileName)
    await atomicWriteFile(path, Buffer.from(bytes))
    const opened = await deps.openCopy({ editor, path, dir, bytes, fileName, title })
    if (!opened) {
      rmSync(dir, { recursive: true, force: true })
      return false
    }
    opened.contents.once('destroyed', () => rmSync(dir, { recursive: true, force: true }))
    return true
  }
  /** an official form: a copy of the HWP file as published, unchanged, in a new HWP tab */
  const openForm = async (
    id: string,
    title: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const file = FORM_FILES[id]
    if (!file) return { ok: false, error: 'no such form' }
    const bytes = new Uint8Array(await readFile(file))
    return (await openBytesCopy('hwp', bytes, documentFileName(title, 'hwp'), title))
      ? { ok: true }
      : { ok: false, error: 'the new tab did not open' }
  }
  /** A new untitled mind map from outline text, opened in its own tab. */
  const openMap = async (
    outline: string,
    title: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const map = await createXmindDocumentFromOutline(outline, { untitled: title })
    const bytes = await map.save()
    const fileName = documentFileName(title, 'xmind')
    const dir = await makeCopyDir()
    const path = join(dir, fileName)
    await atomicWriteFile(path, Buffer.from(bytes))
    const opened = await deps.openCopy({ editor: 'mindmap', path, dir, bytes, fileName, title })
    if (!opened) {
      rmSync(dir, { recursive: true, force: true })
      return { ok: false, error: 'the new tab did not open' }
    }
    opened.contents.once('destroyed', () => rmSync(dir, { recursive: true, force: true }))
    return { ok: true }
  }
  return {
    hwpTool: async (wc, raw) => {
      const request = (raw ?? {}) as { tool?: unknown; target?: unknown }
      const bytes = await hwpReadBytes(wc)
      const engine = await loadHwpEngine()
      const doc = new engine.HwpDocument(bytes)
      try {
        let changed = 0
        let counts: Record<'red' | 'blue' | 'yellow', number> | undefined
        switch (request.tool) {
          case 'check':
            return { ok: true, findings: checkHwpGongmun(doc) }
          case 'tidy':
            changed = tidyGongmun(doc)
            break
          case 'tone':
            if (request.target !== '60대' && request.target !== '40대' && request.target !== 'MZ')
              return { ok: false, error: 'bad tone' }
            changed = changeHwpTone(doc, request.target)
            break
          case 'review':
            counts = markHwpReview(doc)
            changed = counts.red + counts.blue + counts.yellow
            break
          default:
            return { ok: false, error: 'unknown tool' }
        }
        if (changed > 0) {
          // the document comes back in its own format: a HWPX is a zip (PK), a HWP an OLE file
          const isHwpx = bytes[0] === 0x50 && bytes[1] === 0x4b
          hwpReplaceDocument(wc, isHwpx ? doc.exportHwpx() : doc.exportHwp())
        }
        return counts ? { ok: true, counts } : { ok: true, changed }
      } finally {
        doc.free()
      }
    },
    templates: () => [
      ...ALL_TEMPLATES.map(({ id, title, category, description, icon }) => ({
        id,
        title,
        category,
        description,
        icon,
      })),
      ...OFFICIAL_FORMS.map((f) => ({
        id: f.id,
        title: f.title,
        category: '서식',
        description: f.description,
        icon: f.icon,
        form: officialFormSource(f),
      })),
    ],
    openTemplate: async (id, target) => {
      const form = OFFICIAL_FORMS.find((f) => f.id === id)
      if (form)
        return target === 'hwp'
          ? openForm(form.id, form.title)
          : { ok: false, error: 'an official form opens only as HWP' }
      const template = ALL_TEMPLATES.find((t) => t.id === id)
      if (!template || (target !== 'hwp' && target !== 'docx' && target !== 'xmind'))
        return { ok: false, error: 'no such template' }
      if (target === 'xmind') return openMap(templateMapOutline(template.markdown), template.title)
      const blocks = markdownToBlocks(template.markdown, { picture: templatePicture })
      const theme =
        template.category === '공문'
          ? DOC_THEMES.gongmun!
          : template.category === '보고서'
            ? DOC_THEMES.report!
            : DOC_THEMES.plain!
      const bytes =
        target === 'hwp'
          ? blocksToHwp(await loadHwpEngine(), blocks, theme, 'hwpx').bytes
          : await blocksToDocx(blocks, theme)
      const fileName = documentFileName(template.title, target === 'hwp' ? 'hwpx' : 'docx')
      const dir = await makeCopyDir()
      const path = join(dir, fileName)
      await atomicWriteFile(path, Buffer.from(bytes))
      const opened = await deps.openCopy({
        editor: target === 'hwp' ? 'hwp' : 'docs',
        path,
        dir,
        bytes,
        fileName,
        title: template.title,
      })
      if (!opened) {
        rmSync(dir, { recursive: true, force: true })
        return { ok: false, error: 'the new tab did not open' }
      }
      opened.contents.once('destroyed', () => rmSync(dir, { recursive: true, force: true }))
      return { ok: true }
    },
    newMap: async (raw) => {
      // one line of plain text: list and heading marks at its start would read as structure
      const topic =
        typeof raw === 'string'
          ? raw
              .replace(/\s+/g, ' ')
              .replace(/^[#>*+\-\s]+/, '')
              .trim()
              .slice(0, 120)
          : ''
      if (!topic) return { ok: false, error: 'no topic' }
      return openMap(`- ${topic}\n`, topic)
    },
    openBriefing: async (raw) => {
      const request = raw as { markdown?: unknown; title?: unknown } | null
      const markdown = typeof request?.markdown === 'string' ? request.markdown : ''
      const title =
        typeof request?.title === 'string'
          ? request.title.replace(/\s+/g, ' ').trim().slice(0, 80)
          : ''
      if (!markdown.trim() || !title) return { ok: false, error: 'no briefing' }
      if (markdown.length > BRIEFING_MAX_CHARS)
        return { ok: false, error: 'the briefing is too long' }
      const built = await buildTargetDocument(markdown, 'docs', {
        title,
        untitled: title,
        korean: true,
        loadHwpEngine,
      })
      return (await openBytesCopy('docs', built.bytes, built.fileName, built.title))
        ? { ok: true }
        : { ok: false, error: 'the new tab did not open' }
    },
    openMyForm: (form, bytes) =>
      openBytesCopy(
        form.type === 'docx' ? 'docs' : 'hwp',
        bytes,
        documentFileName(form.name, form.type),
        form.name,
      ),
    convertMarkdown: (raw, folder) =>
      convertMarkdown(checkConvertRequest(raw), folder, {
        loadHwpEngine,
        docxToOdt: async (docx) => (await docxToOdt(docx)).odtBytes,
        htmlToPdf: printHtmlToPdf,
        writeFile: async (path, bytes) => {
          mkdirSync(dirname(path), { recursive: true })
          await atomicWriteFile(path, Buffer.from(bytes))
        },
        exists: existsSync,
      }),
    links,
    sendMap,
    sync,
    documentSaved: (wc, path) => links.documentSaved(wc.id, path, Date.now()),
    mapSaved: (wc, path) => links.mapSaved(wc.id, path, Date.now()),
    adoptLocalAi: () => {
      // the default AI, the same for every editor: a signed-in account, else the PC model
      void settleDefaultAi(
        defaultAiDeps({
          markPath: join(app.getPath('userData'), 'hanpan-local-ai.json'),
          readSettings: readStoredAiSettings,
          writeSettings: writeStoredAiSettings,
        }),
      ).catch((error: unknown) => console.warn('[hanpan] default AI failed', error))
    },
  }
}
