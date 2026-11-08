/**
 * One sheet on screen: one instance of the drawing library, and the link
 * between it and the sheet's source tree.
 *
 * The rule: the source tree is the authority. After everything the user does
 * the controller takes the state the screen now shows and hands it to
 * reconciling (`#sync`). When reconciling refuses the state, or the tree then
 * shows something else than the screen, the screen is drawn again from the
 * tree. Undo and redo move the library's history and put the matching copy of
 * the source tree back (`DocumentSession`), then check the two against each
 * other the same way.
 *
 * The public methods are the edit functions of the editor: the toolbar, the
 * shortcuts, the menu and the AI all change the map through them (or through
 * the library's own editing, which ends in the same `#sync`). Nothing writes
 * to the source tree past this class except the sheet tabs.
 *
 * What the library must never be given is described in `text-guard.ts` and
 * `convert.ts`. What the editor draws on the library's topics itself (the
 * branch colours, markers, pictures and a topic's own style) is in
 * `decorate.ts`, and runs every time the library is about to draw the lines.
 */
import MindElixir, {
  type MindElixirInstance,
  type NodeObj,
  type Operation,
  type Options,
  type Topic,
} from 'mind-elixir'
import {
  isShownLink,
  newXmindId,
  type ThemeId,
  themeLook,
  type ThemeLook,
  type ViewLayout,
  type ViewSheet,
  type ViewBoundary,
  type ViewTopic,
  type ViewTopicStyle,
  type XmindTopic,
} from '@genoffice/xmind-engine'
import {
  type Arrow,
  cleanPastedNode,
  directionOfLayout,
  emptyMeta,
  layoutOfDirection,
  type MapNode,
  type MapStructure,
  type MapNodeMeta,
  mindToState,
  nodePatch,
  normaliseTree,
  structureOfLayout,
  type Summary,
  topicIdsOf,
  viewToMind,
  XMIND_ID,
} from '../document/convert'
import type { DocumentSession } from '../document/session'
import { type DecorationStrings, TopicDecorator } from './decorate'
import {
  clearPatch,
  isWritablePatch,
  paintPatch,
  sameStyle,
  type StylePatch,
  steppedFontSize,
  toggledDecoration,
  withStylePatch,
} from './style-edit'
import { PictureStore } from './images'
import { libraryTheme, lookOfSheet } from './look'
import { escapeMapText } from './text-guard'
import { replaceText } from './find'
import { HIDDEN_PARTS, type HiddenPart } from './hidden-parts'
import { type MarkerFamily, withMarker, withoutFamily, withoutMarker } from './marker-families'
import { followRange, rangeNarrows, sortedOrder } from './sort'
import { isArrowKey, timelineArrowTarget } from './timeline-keys'

type MenuOption = Exclude<NonNullable<Options['contextMenu']>, boolean>
/** The library's context menu texts. All twelve are passed in the user's language. */
export type MenuTexts = NonNullable<MenuOption['locale']>

/** Texts the map itself shows. They come from the app's dictionaries, already translated. */
export interface MapStrings {
  /** the title a new topic starts with */
  newTopic: string
  /** the title a new summary starts with */
  summary: string
  menu: MenuTexts
  /** the editor's own entries at the end of the context menu */
  menuRelationship: string
  menuLabel: string
  menuNote: string
  menuLink: string
  /** names of the markers and of a picture that is not shown, for assistive technology */
  decoration: DecorationStrings
}

export type TopicRequest = 'label' | 'note' | 'link'

/** What the controller needs from the screen around it. */
export interface MapHost {
  /** "N elements you cannot see will be deleted too": true to go on */
  confirmDelete(count: number): Promise<boolean>
  /** open a topic's web link; the main process checks the address and opens it */
  openLink(url: string): void
  /** the user asked to edit the labels, the note or the link of a topic */
  onRequest(kind: TopicRequest, topicId: string): void
  /** the user asked to name a boundary (a double click on it) */
  onBoundaryRequest(ownerId: string, boundaryId: string): void
  /** the selection, the history, the zoom or the layout changed */
  onStateChange(): void
}

export interface MapControllerOptions {
  el: HTMLDivElement
  session: DocumentSession
  sheetKey: string
  strings: MapStrings
  host: MapHost
}

/** `ask`: the user is asked before hidden elements go. `refuse`: the deletion is turned down instead (callers that cannot ask). */
export type DeleteMode = 'ask' | 'refuse'

export type RemoveOutcome =
  | { ok: true }
  | { ok: false; reason: 'preserved' | 'cancelled'; preserved: number }
  | { ok: false; reason: 'nothing' }

export interface TopicInfo {
  id: string
  title: string
  labels: string[]
  note: string | null
  link: string | null
  isRoot: boolean
}

const ZOOM_MIN = 0.2
const ZOOM_MAX = 3
const ZOOM_STEP = 0.1
/** How much of the screen a presented map or branch may take. */
const PRESENT_FILL = 0.9
/** How long the map is left alone before a change nobody reported is looked for. */
const QUIET_SYNC_DELAY_MS = 300
/** Room kept between a topic brought into view and the edge of the map, in screen pixels. */
const VIEW_MARGIN = 24
/** The library's steps after which the topic they made or named is brought into view. */
const REVEALED_OPERATIONS: ReadonlySet<string> = new Set([
  'addChild',
  'insertSibling',
  'insertParent',
  'finishEdit',
])

export class MapController {
  readonly mind: MindElixirInstance
  readonly #session: DocumentSession
  readonly #key: string
  readonly #host: MapHost
  #strings: MapStrings
  /** the view the screen was last brought in line with */
  #lastView: ViewSheet
  /** the library's data as it was then, to tell at a glance whether anything moved */
  #syncedData = ''
  #layoutPicked = false
  /** how the library's direction is drawn: as it is, as a tree or as a timeline */
  #structure: MapStructure = 'map'
  readonly #removedSummaries = new Set<string>()
  readonly #removedRelationships = new Set<string>()
  readonly #libraryUndo: () => void
  readonly #libraryRedo: () => void
  readonly #libraryRemoveSummary: (id: string) => void
  #quietTimer: ReturnType<typeof setTimeout> | null = null
  /** the topic a relationship is being drawn from, while the user picks its other end */
  #pickingFrom: string | null = null
  /** the boundary picked on the map: Delete removes it, a double click names it */
  #boundary: { owner: string; id: string } | null = null
  /** the style the format painter puts on the next topic clicked; `sticky` keeps it on for more */
  #painting: { style: StylePatch; sticky: boolean } | null = null
  /** topics a cut is about to take out, kept until the library reports that it removed them */
  #cutPending: CutStash | null = null
  /** topics a cut took out of this sheet: pasted back here, they return as they were */
  #cutStash: CutStash | null = null
  /** set while a step the session already recorded is announced to the library's history */
  #recordedBySession = false
  /** an input method is composing in the edit box */
  #composing = false
  /** the look the sheet is drawn with */
  #look: ThemeLook
  readonly #pictures: PictureStore
  readonly #decorator: TopicDecorator
  #relinkTimer: ReturnType<typeof setTimeout> | null = null
  /** the lines have to be drawn again, but the sheet was not on screen to be measured */
  #relinkWhenShown = false
  #destroyed = false
  readonly #dispose: Array<() => void> = []

  constructor(options: MapControllerOptions) {
    this.#session = options.session
    this.#key = options.sheetKey
    this.#host = options.host
    this.#strings = options.strings
    this.#lastView = this.#session.view(this.#key)
    this.#look = lookOfSheet(this.#session.sheet(this.#key))
    // Pictures come out of the archive through the engine, and from nowhere else.
    this.#pictures = new PictureStore((name) => this.#session.document.readEntry(name))

    const mind = new MindElixir({
      el: options.el,
      direction: directionOfLayout(this.#lastView.layout),
      editable: true,
      toolBar: false,
      allowUndo: true,
      newTopicName: this.#strings.newTopic,
      theme: libraryTheme(this.#look),
      scaleMin: ZOOM_MIN,
      scaleMax: ZOOM_MAX,
      // The one switch on the paths that put text into markup: see text-guard.ts.
      markdown: (text) => escapeMapText(text),
      contextMenu: {
        focus: false,
        // the library's own link entries make lines in two directions and with an English title
        link: false,
        locale: this.#strings.menu,
        extend: this.#menuEntries(),
      },
      before: {
        removeNodes: (topics) => this.#beforeRemove(topics),
        // Pasted nodes come from the clipboard: cleaned before the library draws them.
        // Unless they are the topics just cut from this sheet: those come back whole.
        copyNodes: (topics, to) => {
          if (this.#moveBack(topics, to)) return false
          topics.forEach((topic) => this.#cleanIfPasted(topic))
          return true
        },
        copyNode: (topic) => {
          this.#cleanIfPasted(topic)
          return true
        },
      },
      // Text from the clipboard that is not a copied topic is not pasted into the map.
      pasteHandler: () => {},
    })
    this.mind = mind
    this.#decorator = new TopicDecorator({
      mind,
      pictures: this.#pictures,
      look: this.#look,
      strings: this.#strings.decoration,
      onResize: this.#relink,
    })
    // The library draws the lines from what it measures. The editor's own
    // drawing goes in right before that, so it is measured too; the branch
    // colours of the lines follow right after.
    const libraryLinkDiv = mind.linkDiv.bind(mind)
    mind.linkDiv = (mainNode) => {
      this.#decorator.before()
      libraryLinkDiv(mainNode)
      this.#decorator.after(mainNode)
    }
    mind.keypress = {
      // Space edits, like F2: a summary or a relationship when one is selected, else the topic
      ' ': () => {
        if (mind.currentSummary) mind.editSummary(mind.currentSummary)
        else if (mind.currentArrow) mind.editArrowLabel(mind.currentArrow)
        else void mind.beginEdit()
      },
    }
    // New topics get an id the file keeps, so reconciling has nothing to rename.
    mind.generateNewObj = () => ({
      id: newXmindId(),
      topic: mind.newTopicName,
      metadata: emptyMeta(),
    })

    const started = performance.now()
    this.#setStructure(structureOfLayout(this.#lastView.layout))
    const problem = mind.init(viewToMind(this.#lastView))
    if (problem) throw problem
    this.#syncedData = mind.getDataString()
    measure(DRAW_MEASURE, started)

    // The library's history listens since init(). `#prepare` goes in front of it, so
    // the history records the ids the file will hold; `#onOperation` comes after.
    mind.bus.handlers.operation ??= []
    mind.bus.handlers.operation.unshift(this.#prepare)
    mind.bus.addListener('operation', this.#onOperation)
    mind.bus.addListener('expandNode', this.#onQuietChange)
    mind.bus.addListener('changeDirection', this.#onLayoutPicked)
    mind.bus.addListener('linkDiv', this.#scheduleQuietSync)
    for (const event of [
      'selectNodes',
      'unselectNodes',
      'selectNewNode',
      'selectArrow',
      'unselectArrow',
      'selectSummary',
      'unselectSummary',
      'scale',
    ] as const) {
      mind.bus.addListener(event, this.#onState)
    }

    this.#libraryUndo = mind.undo.bind(mind)
    this.#libraryRedo = mind.redo.bind(mind)
    this.#libraryRemoveSummary = mind.removeSummary.bind(mind)
    // The library calls these by name (Ctrl+Z, Delete, its menu): they now go through the controller.
    mind.undo = () => void this.undo()
    mind.redo = () => void this.redo()
    mind.removeSummary = (id) => void this.removeSummary(id)
    mind.createSummary = () => void this.addSummary()

    const container = mind.container
    const onKeyDownFirst = (event: KeyboardEvent): void => this.#guardKeys(event)
    const onClick = (event: MouseEvent): void => this.#onClick(event)
    const onDoubleClick = (event: MouseEvent): void => {
      const boundary = event.target instanceof Element ? this.#boundaryAt(event.target) : null
      if (!boundary) return
      event.stopPropagation()
      this.#host.onBoundaryRequest(boundary.owner, boundary.id)
    }
    const onCut = (event: Event): void => this.#onCut(event)
    const onCopy = (): void => this.#forgetCut()
    const onComposition = (event: Event): void => {
      this.#composing = event.type === 'compositionstart'
    }
    container.addEventListener('keydown', onKeyDownFirst, true)
    container.addEventListener('click', onClick, true)
    container.addEventListener('dblclick', onDoubleClick, true)
    container.addEventListener('cut', onCut, true)
    container.addEventListener('copy', onCopy, true)
    container.addEventListener('compositionstart', onComposition)
    container.addEventListener('compositionend', onComposition)
    this.#dispose.push(() => {
      container.removeEventListener('keydown', onKeyDownFirst, true)
      container.removeEventListener('click', onClick, true)
      container.removeEventListener('dblclick', onDoubleClick, true)
      container.removeEventListener('cut', onCut, true)
      container.removeEventListener('copy', onCopy, true)
      container.removeEventListener('compositionstart', onComposition)
      container.removeEventListener('compositionend', onComposition)
    })
  }

  // ---- reading ----

  get layout(): ViewLayout {
    return layoutOfDirection(this.mind.direction, this.#structure)
  }

  /** false while the layout shown only stands in for one the editor cannot draw */
  get layoutExact(): boolean {
    return this.#lastView.layoutExact
  }

  get zoom(): number {
    return this.mind.scaleVal
  }

  get canUndo(): boolean {
    return this.#session.canUndo(this.#key)
  }

  get canRedo(): boolean {
    return this.#session.canRedo(this.#key)
  }

  /** true while the user is picking the other end of a new relationship */
  get pickingRelationship(): boolean {
    return this.#pickingFrom !== null
  }

  /** The theme the sheet is drawn with: its own when this app wrote it, the default one otherwise. */
  get themeId(): ThemeId {
    return this.#look.id
  }

  /** The colours of the sheet's theme: the light end, the four accents and the dark end. */
  get themeColors(): readonly string[] {
    return this.#look.bandColors
  }

  /** false while the sheet is drawn with the default look because its theme is not one of this app's */
  get themeWritten(): boolean {
    return this.#session.themeOf(this.#key) !== null
  }

  selectedTopicIds(): string[] {
    return (this.mind.currentNodes ?? []).map((topic) => topic.nodeObj.id)
  }

  /** true while a topic, summary or relationship title is being typed */
  get editingText(): boolean {
    return this.mind.nodes.querySelector('#input-box') !== null
  }

  topic(id: string): TopicInfo | null {
    const node = this.#node(id)
    if (!node) return null
    const meta = this.#meta(node)
    return {
      id: node.id,
      title: node.topic,
      labels: [...meta.labels],
      note: meta.note,
      link: meta.link,
      isRoot: !node.parent,
    }
  }

  // ---- editing: the same functions for the toolbar, the shortcuts, the menu and the AI ----

  /** A new topic under the given one (the selected one when left out). Starts editing its title. */
  addChild(parentId?: string): void {
    const parent = parentId ? this.#element(parentId) : this.mind.currentNode
    if (parent) void this.mind.addChild(parent)
  }

  /** A new topic after the given one (the selected one when left out). */
  addSibling(topicId?: string): void {
    const topic = topicId ? this.#element(topicId) : this.mind.currentNode
    if (topic) void this.mind.insertSibling('after', topic)
  }

  /** Starts typing in the selected topic. */
  beginEdit(): void {
    if (this.mind.currentNode) void this.mind.beginEdit(this.mind.currentNode)
  }

  setTitle(topicId: string, title: string): boolean {
    return this.#patch(topicId, { topic: title })
  }

  setLabels(topicId: string, labels: readonly string[]): boolean {
    const clean = labels.map((label) => label.trim()).filter((label) => label !== '')
    return this.#patchMeta(topicId, { labels: clean })
  }

  setNote(topicId: string, note: string | null): boolean {
    return this.#patchMeta(topicId, { note: note && note.trim() !== '' ? note : null })
  }

  /**
   * Sets or removes a topic's link. Any address is taken and shown as text,
   * also one nothing will ever open: taking it is not opening it. False only
   * for an address in the form of a reference into the file (a link to
   * another topic or to an attachment), which would become a link the editor
   * no longer shows.
   */
  setLink(topicId: string, link: string | null): boolean {
    const address = link?.trim() ?? ''
    if (address === '') return this.#patchMeta(topicId, { link: null })
    if (!isShownLink(address)) return false
    return this.#patchMeta(topicId, { link: address })
  }

  /** Whether the topic shows a picture (from the file or put on it here). */
  /** The marker ids of a topic, in order; none for a topic that is not on the sheet. */
  markersOf(topicId: string): string[] {
    const node = this.#node(topicId)
    return node ? [...this.#meta(node).markers] : []
  }

  /** Sets the markers of a topic as one step. */
  setMarkers(topicId: string, markers: readonly string[]): boolean {
    if (!this.#node(topicId)) return false
    this.commitEdit()
    this.#editMeta(topicId, { markers: [...markers] })
    return true
  }

  /**
   * Puts a marker on every topic in `topicIds`, in the place of one of the same
   * family, or takes it off them all when they all carry it already. One step.
   */
  toggleMarker(topicIds: readonly string[], id: string): boolean {
    const ids = topicIds.filter((each) => this.#node(each))
    if (ids.length === 0) return false
    this.commitEdit()
    const off = ids.every((each) => this.markersOf(each).includes(id))
    this.edit((root) => {
      for (const each of ids) {
        const target = this.mind.getObjById(each, root as NodeObj)
        if (!target) continue
        const meta = this.#meta(target)
        const markers = off ? withoutMarker(meta.markers, id) : withMarker(meta.markers, id)
        Object.assign(target, nodePatch({ ...meta, markers }))
      }
    })
    return true
  }

  /**
   * Takes the markers of `family` off every topic in `topicIds`, or all their
   * markers when `family` is null. One step; false when none had any.
   */
  takeOffMarkers(topicIds: readonly string[], family: MarkerFamily | null): boolean {
    const strip = (markers: readonly string[]): string[] =>
      family === null ? [] : withoutFamily(markers, family)
    const ids = topicIds.filter((each) => {
      const markers = this.markersOf(each)
      return strip(markers).length !== markers.length
    })
    if (ids.length === 0) return false
    this.commitEdit()
    this.edit((root) => {
      for (const each of ids) {
        const target = this.mind.getObjById(each, root as NodeObj)
        if (!target) continue
        const meta = this.#meta(target)
        Object.assign(target, nodePatch({ ...meta, markers: strip(meta.markers) }))
      }
    })
    return true
  }

  // ---- boundaries ----

  /** The boundaries over a topic's branches; none for a topic that is not on the sheet. */
  boundariesOf(topicId: string): ViewBoundary[] {
    const node = this.#node(topicId)
    return node ? this.#meta(node).boundaries.map((boundary) => ({ ...boundary })) : []
  }

  /** The boundary picked on the map, with the topic that carries it. */
  get selectedBoundary(): { owner: string; id: string } | null {
    return this.#boundary
  }

  /**
   * A boundary round the selected topics, or round the run of branches from
   * the first to the last of them when they are branches of one topic. One
   * step. False when nothing is selected or only the central topic is.
   */
  addBoundary(): boolean {
    const range = this.#summaryRange()
    const node = range ? this.#node(range.parent) : null
    if (!range || !node) return false
    this.commitEdit()
    const boundary: ViewBoundary = {
      id: newXmindId(),
      title: '',
      start: range.start,
      end: range.end,
    }
    this.#editMeta(range.parent, { boundaries: [...this.#meta(node).boundaries, boundary] })
    this.#pickBoundary({ owner: range.parent, id: boundary.id })
    return true
  }

  /** Names a boundary; an empty name takes the name off. One step. */
  setBoundaryTitle(ownerId: string, boundaryId: string, title: string): boolean {
    const node = this.#node(ownerId)
    const boundaries = node ? this.#meta(node).boundaries : []
    const at = boundaries.findIndex((boundary) => boundary.id === boundaryId)
    if (at < 0) return false
    const name = title.trim()
    if (boundaries[at]!.title === name) return true
    this.commitEdit()
    this.#editMeta(ownerId, {
      boundaries: boundaries.map((boundary, index) =>
        index === at ? { ...boundary, title: name } : boundary,
      ),
    })
    return true
  }

  /** Takes a boundary off. One step. */
  removeBoundary(ownerId: string, boundaryId: string): boolean {
    const node = this.#node(ownerId)
    const boundaries = node ? this.#meta(node).boundaries : []
    if (!boundaries.some((boundary) => boundary.id === boundaryId)) return false
    this.commitEdit()
    this.#editMeta(ownerId, {
      boundaries: boundaries.filter((boundary) => boundary.id !== boundaryId),
    })
    if (this.#boundary?.id === boundaryId) this.#pickBoundary(null)
    return true
  }

  #pickBoundary(picked: { owner: string; id: string } | null): void {
    if (picked) this.mind.clearSelection()
    this.#boundary = picked
    this.#decorator.markBoundary(picked?.id ?? null)
    this.#host.onStateChange()
  }

  /** The boundary drawn under a click, with the topic that carries it. */
  #boundaryAt(target: Element): { owner: string; id: string } | null {
    const id = target.closest<SVGGElement>('g.mm-boundary')?.dataset.boundaryId
    if (!id) return null
    for (const topic of this.mind.map.querySelectorAll<Topic>('me-tpc')) {
      const node = topic.nodeObj
      if (node && this.#meta(node).boundaries.some((boundary) => boundary.id === id)) {
        return { owner: node.id, id }
      }
    }
    return null
  }

  // ---- a topic's own style ----

  /** The style values a topic sets for itself; none for a topic that is not on the sheet. */
  styleOf(topicId: string): ViewTopicStyle {
    const node = this.#node(topicId)
    return node ? { ...this.#meta(node).style } : {}
  }

  /**
   * Puts `patch` on the own style of every topic in `topicIds`, as one step.
   * False, with nothing changed, when a value is not in a form the file takes
   * or no topic would change.
   */
  setStyle(topicIds: readonly string[], patch: StylePatch): boolean {
    if (!isWritablePatch(patch)) return false
    return this.#restyle(topicIds, (style) => withStylePatch(style, patch))
  }

  /** Takes every value of their own style off the topics in `topicIds`. One step. */
  clearStyle(topicIds: readonly string[]): boolean {
    return this.setStyle(topicIds, clearPatch())
  }

  /** Bold on, or off when every one of the topics is drawn bold already. One step. */
  toggleBold(topicIds: readonly string[]): boolean {
    const on = !topicIds.every((id) => Number(this.#drawn(id)?.fontWeight ?? 400) >= 600)
    return this.setStyle(topicIds, { fontWeight: on ? 'bold' : 'normal' })
  }

  /** Italic on, or off when every one of the topics is drawn in italic already. One step. */
  toggleItalic(topicIds: readonly string[]): boolean {
    const on = !topicIds.every((id) => this.#drawn(id)?.fontStyle === 'italic')
    return this.setStyle(topicIds, { fontStyle: on ? 'italic' : 'normal' })
  }

  /** Underline or strike-through on, or off when every one of the topics has it already. One step. */
  toggleDecoration(topicIds: readonly string[], which: 'underline' | 'line-through'): boolean {
    const has = (id: string): boolean =>
      (this.styleOf(id).textDecoration ?? '').split(/\s+/).includes(which)
    const on = !topicIds.every(has)
    return this.#restyle(topicIds, (style) =>
      withStylePatch(style, { textDecoration: toggledDecoration(style.textDecoration, which, on) }),
    )
  }

  /** Each topic's text one size larger or smaller than it is drawn now. One step. */
  stepFontSize(topicIds: readonly string[], up: boolean): boolean {
    const sizes = new Map<string, string>()
    for (const id of topicIds) {
      const size = steppedFontSize(Number.parseFloat(this.#drawn(id)?.fontSize ?? '') || 16, up)
      if (size) sizes.set(id, size)
    }
    return this.#restyle([...sizes.keys()], (style, id) =>
      withStylePatch(style, { fontSize: sizes.get(id) ?? null }),
    )
  }

  /** The format painter is on: the next topic clicked takes the style it copied. */
  get painting(): boolean {
    return this.#painting !== null
  }

  /**
   * Copies the own style of the topic selected last, to put on the next topic
   * clicked; `sticky` keeps it on for every topic clicked until it is stopped
   * (Esc, or the button again). False when no topic is selected.
   */
  startPainting(sticky: boolean): boolean {
    const from = this.selectedTopicIds().at(-1)
    if (!from) return false
    this.#painting = { style: paintPatch(this.styleOf(from)), sticky }
    this.mind.container.dataset.mmPainting = 'true'
    this.#host.onStateChange()
    return true
  }

  stopPainting(): void {
    if (this.#painting === null) return
    this.#painting = null
    delete this.mind.container.dataset.mmPainting
    this.#host.onStateChange()
  }

  /** The style of every topic in `topicIds` remade by `change`; one step for the ones that differ. */
  #restyle(
    topicIds: readonly string[],
    change: (style: ViewTopicStyle, id: string) => ViewTopicStyle,
  ): boolean {
    const ids = [...new Set(topicIds)].filter((id) => {
      const node = this.#node(id)
      if (!node) return false
      const style = this.#meta(node).style
      return !sameStyle(change(style, id), style)
    })
    if (ids.length === 0) return false
    this.commitEdit()
    this.edit((root) => {
      for (const id of ids) {
        const target = this.mind.getObjById(id, root as NodeObj)
        if (!target) continue
        const meta = this.#meta(target)
        Object.assign(target, nodePatch({ ...meta, style: change(meta.style, id) }))
      }
    })
    return true
  }

  /** How a topic is drawn now (its weight, slant and size), theme and own style together. */
  #drawn(topicId: string): CSSStyleDeclaration | null {
    const element = this.#element(topicId)
    return element ? getComputedStyle(element) : null
  }

  hasPicture(topicId: string): boolean {
    const node = this.#node(topicId)
    return node ? this.#meta(node).image !== null : false
  }

  /**
   * Puts a picture on a topic, in the place of the one it had, or takes it off
   * (`null`), as one step. The bytes become a new entry of the map file first,
   * so reconciling can check the reference; when the picture does not land
   * the entry is taken out again and the answer is false. Taking a picture off
   * leaves its entry in the file: undo puts the same reference back.
   */
  setPicture(
    topicId: string,
    picture: { bytes: Uint8Array; ext: 'png' | 'jpg' | 'gif' } | null,
  ): boolean {
    if (!this.#node(topicId)) return false
    this.commitEdit()
    if (picture === null) {
      if (!this.hasPicture(topicId)) return false
      this.#editMeta(topicId, { image: null })
      return true
    }
    const entryName = this.#session.addPicture(picture.bytes, picture.ext)
    this.#editMeta(topicId, {
      image: { src: `xap:${entryName}`, entryName, width: null, height: null },
    })
    if (this.#shownEntry(topicId) === entryName) return true
    this.#session.removePicture(entryName)
    return false
  }

  /**
   * Shows the map down to `level` (the central topic is 0, its branches 1):
   * topics at that depth with branches below are folded, the ones above
   * unfolded. Deeper topics keep their own folding. Not a step of the history,
   * like folding one branch.
   */
  foldToLevel(level: number): void {
    const visit = (node: NodeObj, depth: number): void => {
      if (depth > level) return
      if (depth > 0) {
        if (depth === level && node.children?.length) node.expanded = false
        else delete node.expanded
      }
      node.children?.forEach((child) => visit(child, depth + 1))
    }
    visit(this.mind.nodeData, 0)
    this.mind.refresh()
    this.#sync({ step: false })
  }

  /**
   * Brings a topic into sight: the branches folded above it are unfolded (as
   * the fold handle would, written without a history step), the topic is
   * selected and scrolled to the middle. False when the sheet has no such topic.
   */
  revealTopic(topicId: string): boolean {
    const node = this.#node(topicId)
    if (!node) return false
    this.commitEdit()
    let unfolded = false
    for (let above = node.parent; above; above = above.parent) {
      if (above.expanded === false) {
        delete above.expanded
        unfolded = true
      }
    }
    if (unfolded) {
      this.mind.refresh()
      this.#sync({ step: false })
    }
    const element = this.#element(topicId)
    if (!element) return false
    this.mind.selectNode(element)
    this.mind.scrollIntoView(element, true)
    return true
  }

  /**
   * Replaces text in every title of the sheet (or only in `onlyId`'s), as one
   * step. Returns how many titles changed; nothing is recorded when none did.
   */
  replaceInTitles(query: string, replacement: string, matchCase: boolean, onlyId?: string): number {
    if (query === '') return 0
    this.commitEdit()
    const changed: { id: string; title: string }[] = []
    const visit = (node: NodeObj): void => {
      const title = replaceText(node.topic, query, replacement, matchCase)
      if (title !== node.topic && (onlyId === undefined || node.id === onlyId)) {
        changed.push({ id: node.id, title })
      }
      node.children?.forEach(visit)
    }
    visit(this.mind.nodeData)
    if (changed.length === 0) return 0
    this.edit((root) => {
      for (const { id, title } of changed) {
        const target = this.mind.getObjById(id, root as NodeObj)
        if (target) target.topic = title
      }
    })
    return changed.length
  }

  /**
   * Hides parts of every topic from view (`map.css` follows the mark on the
   * map's container, and an export copies it). Nothing changes in the map.
   */
  setHiddenParts(parts: readonly HiddenPart[]): void {
    const value = HIDDEN_PARTS.filter((part) => parts.includes(part)).join(' ')
    const { dataset } = this.mind.container
    if ((dataset.mmHide ?? '') === value) return
    if (value) dataset.mmHide = value
    else delete dataset.mmHide
    // the topics changed size: the lines are drawn again around them
    this.mind.linkDiv()
  }

  /** Whether sorting the topic's branches now would be in descending order (it was ascending already). */
  sortDirection(topicId: string, lang: string): boolean {
    const titles = (this.#node(topicId)?.children ?? []).map((child) => child.topic)
    return sortedOrder(titles, lang, false).every((at, position) => at === position)
  }

  /**
   * Whether sorting would leave a summary or a boundary over the topic's
   * branches with fewer branches than it covers now: the user is asked first.
   */
  sortNarrowsRanges(topicId: string, descending: boolean, lang: string): boolean {
    const children = this.#node(topicId)?.children ?? []
    const before = children.map((child) => child.id)
    const order = sortedOrder(
      children.map((child) => child.topic),
      lang,
      descending,
    )
    const after = order.map((at) => before[at]!)
    const ranges = [
      ...this.mind.summaries.filter((summary) => summary.parent === topicId),
      ...this.#session.boundariesUnder(this.#key, topicId),
    ]
    return ranges.some((range) => range.end < before.length && rangeNarrows(before, after, range))
  }

  /**
   * Orders a topic's branches by title, as one step. A summary over them
   * follows its branches the way the engine moves every range (see `sort.ts`).
   */
  sortChildren(
    topicId: string,
    descending: boolean,
    lang: string,
  ): 'sorted' | 'unchanged' | 'no-children' {
    const node = this.#node(topicId)
    const children = node?.children ?? []
    if (children.length < 2) return 'no-children'
    const order = sortedOrder(
      children.map((child) => child.topic),
      lang,
      descending,
    )
    if (order.every((at, position) => at === position)) return 'unchanged'
    this.commitEdit()
    const before = children.map((child) => child.id)
    const after = order.map((at) => before[at]!)
    this.edit((root) => {
      const target = this.mind.getObjById(topicId, root as NodeObj)
      if (!target?.children) return
      const byId = new Map(target.children.map((child) => [child.id, child]))
      target.children = after.map((id) => byId.get(id)!)
      for (const summary of this.mind.summaries) {
        if (summary.parent !== topicId || summary.end >= before.length) continue
        Object.assign(summary, followRange(before, after, summary))
      }
    })
    return 'sorted'
  }

  /**
   * Deletes topics with everything below them. When that would take elements
   * the editor does not show, the user is asked first (`ask`) or the deletion
   * is turned down with their number (`refuse`).
   */
  async removeTopics(ids: readonly string[], mode: DeleteMode = 'ask'): Promise<RemoveOutcome> {
    const wanted = new Set(ids)
    wanted.delete(this.mind.nodeData.id)
    const found = [...wanted].filter((id) => this.#node(id))
    if (found.length === 0) return { ok: false, reason: 'nothing' }
    const preserved = this.#session.preservedWith(this.#key, found)
    if (preserved > 0) {
      if (mode === 'refuse') return { ok: false, reason: 'preserved', preserved }
      if (!(await this.#host.confirmDelete(preserved))) {
        return { ok: false, reason: 'cancelled', preserved }
      }
    }
    this.edit((root) => {
      const strip = (node: NodeObj): void => {
        if (!node.children) return
        node.children = node.children.filter((child) => !wanted.has(child.id))
        node.children.forEach(strip)
      }
      strip(root)
    })
    return { ok: true }
  }

  /** Removes a summary (by the id of its summary topic), asking first when branches hang under it. */
  async removeSummary(id: string, mode: DeleteMode = 'ask'): Promise<RemoveOutcome> {
    if (!this.mind.summaries.some((summary) => summary.id === id)) {
      return { ok: false, reason: 'nothing' }
    }
    const preserved = this.#session.preservedWith(this.#key, [id])
    if (preserved > 0) {
      if (mode === 'refuse') return { ok: false, reason: 'preserved', preserved }
      if (!(await this.#host.confirmDelete(preserved))) {
        return { ok: false, reason: 'cancelled', preserved }
      }
    }
    this.#libraryRemoveSummary(id)
    return { ok: true }
  }

  /**
   * A summary over the selected topics: the branches of their common parent
   * from the first to the last selected. False when the selection has none
   * (nothing selected, or only the central topic).
   */
  addSummary(): boolean {
    const range = this.#summaryRange()
    if (!range) return false
    const before = new Set(this.mind.summaries.map((summary) => summary.id))
    this.mind.createSummaryFrom({ ...range, label: this.#strings.summary })
    const added = this.mind.summaries.find((summary) => !before.has(summary.id))
    const group = added ? this.mind.container.querySelector(`#s-${added.id}`) : null
    // straight into typing its title, as with a new topic
    if (group) this.mind.editSummary(group as Parameters<MindElixirInstance['editSummary']>[0])
    return true
  }

  /** A relationship between two topics. False when one of them is not drawn (folded away). */
  addRelationship(fromId: string, toId: string, title = ''): boolean {
    const from = this.#element(fromId)
    const to = this.#element(toId)
    if (!from || !to || from === to) return false
    // The library's own default title is English text; a new line starts without one.
    this.mind.createArrow(from, to, { label: title } as Parameters<
      MindElixirInstance['createArrow']
    >[2])
    return true
  }

  /** Starts a relationship from the selected topic; the next topic the user clicks is its other end. */
  pickRelationshipTarget(): boolean {
    const from = this.mind.currentNode
    if (!from) return false
    this.#pickingFrom = from.nodeObj.id
    this.#host.onStateChange()
    return true
  }

  cancelRelationshipPick(): void {
    if (this.#pickingFrom === null) return
    this.#pickingFrom = null
    this.#host.onStateChange()
  }

  /** The user picks a layout. This is what writes a layout to the file. */
  setLayout(layout: ViewLayout): void {
    const mind = this.mind
    // the rules for a tree or a timeline are in place before the library lays the map out again
    this.#setStructure(structureOfLayout(layout))
    if (layout === 'left') mind.initLeft()
    else if (layout === 'right' || layout === 'tree') mind.initRight()
    else if (layout === 'down' || layout === 'timeline') mind.initDown()
    else mind.initSide()
  }

  /** The rules of `map.css` and the branch lines follow this mark on the map's container. */
  #setStructure(structure: MapStructure): void {
    this.#structure = structure
    const { dataset } = this.mind.container
    if (structure === 'map') delete dataset.mmStructure
    else dataset.mmStructure = structure
    // a tree grows from its top left: centring the central topic would leave half the screen empty
    this.mind.alignment = structure === 'tree' ? 'nodes' : 'root'
  }

  /**
   * The user picks a theme for this sheet. This is what writes a theme to the
   * file, and the only thing that does; it is not a step of the history.
   * False, with nothing written, when the sheet already carries that theme.
   */
  setTheme(id: ThemeId): boolean {
    if (this.#session.themeOf(this.#key) === id) return false
    this.commitEdit()
    this.#session.applyTheme(this.#key, id)
    this.#showLook(themeLook(id))
    this.#host.onStateChange()
    return true
  }

  /** Folds or unfolds every branch. Not a step of the history, like folding one branch. */
  setAllFolded(folded: boolean): void {
    const visit = (node: NodeObj, isRoot: boolean): void => {
      if (!isRoot) {
        if (folded && node.children?.length) node.expanded = false
        else delete node.expanded
      }
      node.children?.forEach((child) => visit(child, false))
    }
    visit(this.mind.nodeData, true)
    this.mind.refresh()
    this.#sync({ step: false })
  }

  /**
   * Edits the map as data, as one step: `change` gets the library's live node
   * tree and may add, remove, move and edit nodes (titles, and the labels,
   * note and link in `metadata`). The result is drawn, recorded as a single
   * step of the history and reconciled, exactly like something the user did.
   * This is the way in for edits that are not one library call: several at
   * once, or topics that are folded away and have no element.
   */
  edit(change: (root: MapNode) => void): void {
    const mind = this.mind
    const selected = this.selectedTopicIds()
    change(mind.nodeData as MapNode)
    normaliseTree(mind.nodeData, topicIdsOf(this.#lastView))
    mind.refresh()
    // drawing again drops the selection; the topics still on the map keep it
    const again = selected.map((id) => this.#element(id)).filter((topic) => topic !== null)
    if (again.length > 0) mind.selectNodes(again)
    mind.bus.fire('operation', {
      name: 'reshapeNode',
      obj: mind.nodeData,
      origin: mind.nodeData,
    })
  }

  // ---- history ----

  /** One step back. False when there is none. */
  undo(): boolean {
    if (!this.canUndo) return false
    this.#libraryUndo()
    const view = this.#session.undo(this.#key)
    if (view) this.#afterHistoryMove(view)
    return true
  }

  /** One step forward again. False when there is none. */
  redo(): boolean {
    if (!this.canRedo) return false
    this.#libraryRedo()
    const view = this.#session.redo(this.#key)
    if (view) this.#afterHistoryMove(view)
    return true
  }

  // ---- view ----

  zoomIn(): void {
    this.mind.scale(Math.min(ZOOM_MAX, round(this.mind.scaleVal + ZOOM_STEP)))
  }

  zoomOut(): void {
    this.mind.scale(Math.max(ZOOM_MIN, round(this.mind.scaleVal - ZOOM_STEP)))
  }

  zoomReset(): void {
    this.mind.scale(1)
    this.mind.toCenter()
  }

  zoomFit(): void {
    this.mind.scaleFit()
  }

  /** Back to the zoom the map had before a presentation, with the map in the middle. */
  restoreView(scale: number): void {
    this.mind.scale(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale)))
    this.mind.toCenter()
  }

  /** How many steps a presentation of this sheet has after the whole map: one per main topic. */
  get presentSteps(): number {
    return this.mind.nodeData.children?.length ?? 0
  }

  /**
   * One step of a presentation. Step 0 is the whole map, made as large as the
   * screen allows (the library's fit only ever makes a map smaller, so on a
   * large screen the map stood small in the middle). Step n is the n-th main
   * topic with everything under it, made as large as the screen allows and
   * brought to the middle.
   */
  presentStep(step: number): void {
    const mind = this.mind
    mind.scaleFit()
    const view = mind.container
    const fill = (width: number, height: number): number =>
      Math.min(
        ZOOM_MAX,
        PRESENT_FILL * Math.min(view.clientWidth / width, view.clientHeight / height),
      )
    if (step <= 0 || view.clientWidth === 0) {
      const whole = mind.nodes
      if (whole.offsetWidth === 0 || whole.offsetHeight === 0) return
      const scale = fill(whole.offsetWidth, whole.offsetHeight)
      if (scale > mind.scaleVal) mind.scale(scale)
      return
    }
    const main = mind.nodeData.children?.[step - 1]
    const branch = main ? this.#element(main.id)?.closest('me-wrapper') : null
    if (!branch) return
    const before = branch.getBoundingClientRect()
    if (before.width === 0 || before.height === 0) return
    // the rectangle is on screen, at the scale the map has now
    mind.scale(
      Math.max(ZOOM_MIN, fill(before.width / mind.scaleVal, before.height / mind.scaleVal)),
    )
    const at = branch.getBoundingClientRect()
    const box = view.getBoundingClientRect()
    mind.move(
      box.left + box.width / 2 - (at.left + at.width / 2),
      box.top + box.height / 2 - (at.top + at.height / 2),
    )
  }

  /** The texts changed (another language): new topics, new summaries and the context menu follow. */
  setStrings(strings: MapStrings): void {
    this.#strings = strings
    this.mind.newTopicName = strings.newTopic
    const items = this.mind.container.querySelectorAll<HTMLElement>('.context-menu .menu-list > li')
    const own = this.#menuEntries().map((entry) => entry.name)
    const builtIn: Readonly<Record<string, string>> = {
      'cm-add_child': strings.menu.addChild,
      'cm-add_parent': strings.menu.addParent,
      'cm-add_sibling': strings.menu.addSibling,
      'cm-remove_child': strings.menu.removeNode,
      'cm-up': strings.menu.moveUp,
      'cm-down': strings.menu.moveDown,
      'cm-summary': strings.menu.summary,
    }
    items.forEach((item, at) => {
      const text = builtIn[item.id] ?? own[at - (items.length - own.length)]
      if (text !== undefined && item.firstElementChild) item.firstElementChild.textContent = text
    })
    this.#decorator.setStrings(strings.decoration)
    this.#decorator.before()
  }

  // ---- keeping the tree and the screen in line ----

  /**
   * Brings the source tree in line with whatever the screen shows right now.
   * Called before the map is saved or read, so a change nobody reported is
   * not lost.
   */
  flush(): void {
    this.#sync({ step: false })
  }

  /** true while an input method is composing in the edit box */
  get composing(): boolean {
    return this.#composing && this.editingText
  }

  /**
   * Takes a title that is still being typed (of a topic, a summary or a
   * relationship) into the map, as leaving the edit box would. Called before
   * the map is saved or read, so the text in the box is not left out. A
   * composition that is open ends with the box losing the focus; the browser
   * keeps its text. False when nothing was being typed.
   */
  commitEdit(): boolean {
    const box = this.mind.nodes.querySelector<HTMLElement>('#input-box')
    if (!box) return false
    // The library takes the text when the box loses the focus, and only then.
    if (document.activeElement === box) box.blur()
    // not focused (or no real focus to lose): tell the library the same way
    if (box.isConnected) box.dispatchEvent(new FocusEvent('blur'))
    this.#composing = false
    return true
  }

  /** Draws the sheet again from the source tree. */
  redraw(): void {
    this.#draw(this.#session.view(this.#key))
  }

  /**
   * The sheet came on screen. Lines can only be drawn around topics that can
   * be measured, so what was put off while the sheet was hidden is done now.
   */
  onShown(): void {
    if (!this.#relinkWhenShown || this.#destroyed) return
    this.#relinkWhenShown = false
    this.mind.linkDiv()
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    if (this.#quietTimer) clearTimeout(this.#quietTimer)
    if (this.#relinkTimer) clearTimeout(this.#relinkTimer)
    this.#dispose.forEach((dispose) => dispose())
    this.mind.destroy()
    this.#pictures.destroy()
  }

  // ---- internals ----

  /** Draws the sheet with another look. The map itself is the same; only how it is drawn changes. */
  #showLook(look: ThemeLook): void {
    this.#look = look
    this.#decorator.setLook(look)
    const selected = this.selectedTopicIds()
    // the library draws every topic again with the new theme
    this.mind.changeTheme(libraryTheme(look))
    const again = selected.map((id) => this.#element(id)).filter((topic) => topic !== null)
    if (again.length > 0) this.mind.selectNodes(again)
  }

  /** A picture arrived or took its size: the lines are drawn again around it, once per turn. */
  #relink = (): void => {
    if (this.#destroyed || this.#relinkTimer) return
    this.#relinkTimer = setTimeout(() => {
      this.#relinkTimer = null
      if (this.#destroyed) return
      // A hidden sheet measures as nothing, and lines drawn from that would all
      // collapse into one point: wait until it is shown.
      if (this.mind.nodes.offsetWidth === 0) this.#relinkWhenShown = true
      else this.mind.linkDiv()
    }, 0)
  }

  /**
   * The library's edit box takes the size, colour, padding and box of the
   * topic it stands in for, but not how heavy and how tall its text is. With
   * those too, a title does not change its look while it is typed.
   */
  #dressEditBox(topicId: string): void {
    const topic = this.#element(topicId)
    const box = this.mind.nodes.querySelector<HTMLElement>('#input-box')
    if (!topic || !box) return
    const drawn = getComputedStyle(topic)
    box.style.fontWeight = drawn.fontWeight
    box.style.lineHeight = drawn.lineHeight
    box.style.letterSpacing = drawn.letterSpacing
  }

  #menuEntries(): NonNullable<MenuOption['extend']> {
    const ask = (kind: TopicRequest) => () => {
      this.#hideMenu()
      const id = this.mind.currentNode?.nodeObj.id
      if (id) this.#host.onRequest(kind, id)
    }
    return [
      {
        name: this.#strings.menuRelationship,
        onclick: () => {
          this.#hideMenu()
          this.pickRelationshipTarget()
        },
      },
      { name: this.#strings.menuLabel, onclick: ask('label') },
      { name: this.#strings.menuNote, onclick: ask('note') },
      { name: this.#strings.menuLink, onclick: ask('link') },
    ]
  }

  #hideMenu(): void {
    const menu = this.mind.container.querySelector<HTMLElement>('.context-menu')
    if (menu) menu.hidden = true
  }

  #node(id: string): NodeObj | null {
    return this.mind.getObjById(id, this.mind.nodeData)
  }

  /**
   * A node of this map's live tree, by identity. Anything else came out of the
   * clipboard as text any program can write, whatever its fields claim.
   */
  #isLive(node: NodeObj): boolean {
    return typeof node.id === 'string' && this.#node(node.id) === node
  }

  #cleanIfPasted(topic: Topic): void {
    const node = topic.nodeObj as NodeObj | undefined
    if (node && !this.#isLive(node)) cleanPastedNode(node)
  }

  #meta(node: NodeObj): MapNodeMeta {
    return { ...emptyMeta(), ...((node.metadata as Partial<MapNodeMeta> | undefined) ?? {}) }
  }

  /** The element of a topic, or null when it is folded away. */
  #element(id: string): Topic | null {
    try {
      return this.mind.findEle(id)
    } catch {
      return null
    }
  }

  #patchMeta(topicId: string, change: Partial<MapNodeMeta>): boolean {
    const node = this.#node(topicId)
    if (!node) return false
    return this.#patch(topicId, nodePatch({ ...this.#meta(node), ...change }))
  }

  /** Changes the metadata of one topic as one step, as data (a picture is not a field the library edits). */
  #editMeta(topicId: string, change: Partial<MapNodeMeta>): void {
    this.edit((root) => {
      const target = this.mind.getObjById(topicId, root as NodeObj)
      if (target) Object.assign(target, nodePatch({ ...this.#meta(target), ...change }))
    })
  }

  /** The archive entry of the picture the source tree now holds for a topic, or null. */
  #shownEntry(topicId: string): string | null {
    const find = (topic: ViewTopic): ViewTopic | null => {
      if (topic.id === topicId) return topic
      for (const child of topic.children) {
        const found = find(child)
        if (found) return found
      }
      return null
    }
    return find(this.#session.view(this.#key).root)?.image?.entryName ?? null
  }

  /** Changes fields of one topic as one step: through the library when the topic is drawn, as data when it is folded away. */
  #patch(topicId: string, patch: Partial<MapNode>): boolean {
    const node = this.#node(topicId)
    if (!node) return false
    const element = this.#element(topicId)
    if (element) {
      void this.mind.reshapeNode(element, patch as Partial<NodeObj>)
    } else {
      this.edit((root) => {
        const target = this.mind.getObjById(topicId, root)
        if (target) Object.assign(target, patch)
      })
    }
    return true
  }

  /** The library asks before it removes topics (Delete, cut, its menu). */
  async #beforeRemove(topics: Topic[]): Promise<boolean> {
    const removable = topics.filter((topic) => topic.nodeObj.parent)
    if (removable.length === 0) return false
    if (removable.length !== topics.length) {
      // The central topic stays; the rest of the selection is deleted on its own.
      void this.mind.removeNodes(removable)
      return false
    }
    const preserved = this.#session.preservedWith(
      this.#key,
      removable.map((topic) => topic.nodeObj.id),
    )
    if (preserved === 0) return true
    return this.#host.confirmDelete(preserved)
  }

  /** Runs in front of the library's history: what an operation just made gets ids the file can keep. */
  #prepare = (operation: Operation): void => {
    switch (operation.name) {
      case 'addChild':
      case 'insertSibling':
      case 'insertParent':
      case 'copyNode':
        this.#keepableIds(operation.obj)
        break
      case 'copyNodes':
        operation.objs.forEach((node) => this.#keepableIds(node))
        break
      case 'createSummary':
        this.#renameSummary(operation.obj)
        break
      case 'createArrow':
        this.#renameArrow(operation.obj)
        break
    }
  }

  #keepableIds(node: NodeObj): void {
    if (!XMIND_ID.test(node.id)) {
      const element = this.#element(node.id)
      node.id = newXmindId()
      if (element) element.dataset.nodeid = `me${node.id}`
    }
    node.children?.forEach((child) => this.#keepableIds(child))
  }

  #renameSummary(summary: Summary): void {
    if (XMIND_ID.test(summary.id)) return
    const container = this.mind.container
    const group = container.querySelector(`#s-${summary.id}`)
    const label = container.querySelector<HTMLElement>(`#label-s-${summary.id}`)
    summary.id = newXmindId()
    if (group) group.id = `s-${summary.id}`
    if (label) {
      label.id = `label-s-${summary.id}`
      label.dataset.svgId = `s-${summary.id}`
    }
  }

  #renameArrow(arrow: Arrow): void {
    // a line in two directions is not something the file's relationships say
    delete arrow.bidirectional
    if (XMIND_ID.test(arrow.id)) return
    const container = this.mind.container
    const group = container.querySelector<SVGGElement>(`g[data-linkid="${arrow.id}"]`)
    const label = container.querySelector<HTMLElement>(`#label-a-${arrow.id}`)
    arrow.id = newXmindId()
    if (group) {
      group.id = `a-${arrow.id}`
      group.dataset.linkid = arrow.id
    }
    if (label) {
      label.id = `label-a-${arrow.id}`
      label.dataset.svgId = `a-${arrow.id}`
    }
  }

  /**
   * Both sides: the main topics stand as reopening the file draws them
   * (`viewToMind`: the first half to the right, the rest to the left, in file
   * order). The library puts a new main topic on whichever side has fewer and
   * a sibling on its neighbour's side, so without this a map came back from
   * its file with branches on the other side. The topics are moved, not drawn
   * again, so a topic being named keeps its edit box.
   */
  /**
   * A topic just added or being named stands wholly inside the map: the map is
   * moved just enough, with a margin. The library only moves when a topic is
   * almost all outside, so a new topic half under the AI panel stayed there.
   */
  #keepInView(topicId: string): void {
    const topic = this.#element(topicId)
    if (!topic) return
    const box = this.mind.container.getBoundingClientRect()
    const at = topic.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    const shift = (start: number, end: number, from: number, to: number): number => {
      if (end - start > to - from - 2 * VIEW_MARGIN) return 0
      if (end > to - VIEW_MARGIN) return to - VIEW_MARGIN - end
      if (start < from + VIEW_MARGIN) return from + VIEW_MARGIN - start
      return 0
    }
    const dx = shift(at.left, at.right, box.left, box.right)
    const dy = shift(at.top, at.bottom, box.top, box.bottom)
    if (dx !== 0 || dy !== 0) this.mind.move(dx, dy)
  }

  #balanceSides(): void {
    const mind = this.mind
    if (mind.direction !== 2 || this.#structure !== 'map') return
    const lhs = mind.map.querySelector('.lhs')
    const rhs = mind.map.querySelector('.rhs')
    if (!lhs || !rhs) return
    const mains = mind.nodeData.children ?? []
    const right = Math.ceil(mains.length / 2)
    const wrappers = mains.map((main) => this.#element(main.id)?.closest('me-wrapper') ?? null)
    if (wrappers.some((wrapper) => wrapper === null)) return
    const want = (side: number) => wrappers.filter((_w, at) => (at < right ? 1 : 0) === side)
    const same = (box: Element, list: (Element | null)[]) =>
      box.children.length === list.length && list.every((w, at) => box.children[at] === w)
    mains.forEach((main, at) => {
      main.direction = at < right ? 1 : 0
    })
    if (same(rhs, want(1)) && same(lhs, want(0))) return
    for (const wrapper of want(1)) rhs.appendChild(wrapper!)
    for (const wrapper of want(0)) lhs.appendChild(wrapper!)
    mind.linkDiv()
  }

  #onOperation = (operation: Operation): void => {
    // Opening the edit box changes nothing yet, and the library records no step for it.
    if (operation.name === 'beginEdit') {
      this.#dressEditBox(operation.obj.id)
      this.#keepInView(operation.obj.id)
      return
    }
    // The session recorded this step and the screen was drawn from it: nothing to reconcile.
    if (this.#recordedBySession) return
    this.#balanceSides()
    if (REVEALED_OPERATIONS.has(operation.name) && 'obj' in operation && operation.obj) {
      this.#keepInView((operation.obj as { id: string }).id)
    }
    const cut = this.#cutPending
    this.#cutPending = null
    if (operation.name === 'removeSummary') this.#removedSummaries.add(operation.obj.id)
    if (operation.name === 'removeArrow') this.#removedRelationships.add(operation.obj.id)
    this.#sync({
      step: true,
      reshaped: operation.name === 'reshapeArrow' ? [operation.obj.id] : [],
    })
    if (cut && operation.name === 'removeNodes') {
      const removed = operation.objs.map((node) => node.id)
      if (sameIds(removed, cut.ids)) {
        // the lines that went with the topics are the ones the sheet no longer has
        const left = new Set(this.#session.relationshipRecords(this.#key).map((line) => line.id))
        this.#cutStash = {
          ...cut,
          relationships: cut.relationships.filter((line) => !left.has(line.id)),
        }
      }
    }
  }

  /**
   * A cut is starting (the library copies the selection to the clipboard and
   * then removes it). The source of the selected topics is copied now, while
   * it is still there: reconciling the removal deletes it with everything the
   * editor never showed.
   */
  #onCut(event: Event): void {
    this.#forgetCut()
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('#input-box')) return
    const selected = (this.mind.currentNodes ?? []).map((topic) => topic.nodeObj)
    const chosen = new Set(selected)
    const ids: string[] = []
    const topics: XmindTopic[] = []
    for (const node of selected) {
      if (!node.parent) return
      let inside = false
      for (let up: NodeObj | undefined = node.parent; up; up = up.parent) inside ||= chosen.has(up)
      if (inside) continue
      const source = this.#session.copyOfTopic(this.#key, node.id)
      if (!source) return
      ids.push(node.id)
      topics.push(source)
    }
    if (ids.length === 0) return
    this.#cutPending = {
      ids,
      topics,
      relationships: this.#session.relationshipRecords(this.#key),
    }
  }

  /** Something else was copied or cut: what an earlier cut took out can no longer be pasted back as itself. */
  #forgetCut(): void {
    this.#cutPending = null
    this.#cutStash = null
  }

  /**
   * The library is about to paste. When the clipboard holds exactly the topics
   * last cut from this sheet, they are put back as the source topics they
   * were (ids, every key, hidden parts), under the target: a move, as the user
   * meant it. True when that was done and the library has nothing left to do.
   * Any other paste, and a second paste of the same clipboard, makes new
   * topics from what the clipboard shows.
   */
  #moveBack(topics: Topic[], to: Topic): boolean {
    const stash = this.#cutStash
    if (!stash || !to?.nodeObj) return false
    const pasted = topics.map((topic) => topic.nodeObj as NodeObj | undefined)
    if (pasted.some((node) => !node || this.#isLive(node))) return false
    if (
      !sameIds(
        pasted.map((node) => String(node!.id)),
        stash.ids,
      )
    ) {
      return false
    }
    this.#cutStash = null
    this.#sync({ step: false })
    const view = this.#session.reinsertTopics(
      this.#key,
      to.nodeObj.id,
      stash.topics,
      stash.relationships,
    )
    if (!view) return false
    this.#draw(view)
    // The session has its step; the library records one for the same change.
    this.#recordedBySession = true
    try {
      this.mind.bus.fire('operation', {
        name: 'reshapeNode',
        obj: this.mind.nodeData,
        origin: this.mind.nodeData,
      })
    } finally {
      this.#recordedBySession = false
    }
    const moved = stash.ids.map((id) => this.#element(id)).filter((topic) => topic !== null)
    this.mind.clearSelection()
    if (moved.length > 0) this.mind.selectNodes(moved)
    this.#host.onStateChange()
    return true
  }

  #onQuietChange = (): void => {
    this.#sync({ step: false })
  }

  #onLayoutPicked = (): void => {
    this.#layoutPicked = true
    this.#sync({ step: false })
  }

  #onState = (): void => {
    this.#host.onStateChange()
  }

  /** The library drew something. Most of the time that was reported; when it was not (fold levels), this finds it. */
  #scheduleQuietSync = (): void => {
    if (this.#destroyed) return
    if (this.#quietTimer) clearTimeout(this.#quietTimer)
    this.#quietTimer = setTimeout(() => {
      this.#quietTimer = null
      if (!this.#destroyed && !this.editingText) this.#sync({ step: false })
    }, QUIET_SYNC_DELAY_MS)
  }

  #sync(options: { step: boolean; reshaped?: string[] }): void {
    if (this.#destroyed) return
    if (this.#quietTimer) {
      clearTimeout(this.#quietTimer)
      this.#quietTimer = null
    }
    const data = this.mind.getDataString()
    if (!options.step && !this.#layoutPicked && data === this.#syncedData) return
    const started = performance.now()
    const state = mindToState(JSON.parse(data), {
      view: this.#lastView,
      layoutPicked: this.#layoutPicked,
      removedSummaries: this.#removedSummaries,
      removedRelationships: this.#removedRelationships,
      structure: this.#structure,
    })
    const result = this.#session.apply(this.#key, state, {
      step: options.step,
      reshapedRelationships: options.reshaped,
    })
    this.#layoutPicked = false
    this.#removedSummaries.clear()
    this.#removedRelationships.clear()
    this.#lastView = result.view
    if (!result.ok) {
      console.warn('[mindmap] the screen could not be applied to the map:', result.problem)
      this.#draw(result.view)
    } else if (!result.inSync || result.ids.topics.size > 0 || result.ids.relationships.size > 0) {
      this.#draw(result.view)
    } else {
      this.#syncedData = data
    }
    measure(RECONCILE_MEASURE, started)
    this.#host.onStateChange()
  }

  /** After an undo or redo: the source tree is back; the screen must show exactly it. */
  #afterHistoryMove(view: ViewSheet): void {
    this.#layoutPicked = false
    this.#removedSummaries.clear()
    this.#removedRelationships.clear()
    this.#lastView = view
    const data = this.mind.getDataString()
    const state = mindToState(JSON.parse(data), {
      view,
      layoutPicked: false,
      removedSummaries: this.#removedSummaries,
      removedRelationships: this.#removedRelationships,
      structure: this.#structure,
    })
    const check = this.#session.apply(this.#key, state, { step: false })
    if (!check.ok || check.changed || !check.inSync) {
      // The library went back to something else than the tree holds: the copy wins.
      this.#draw(this.#session.restoreStep(this.#key))
    } else {
      this.#syncedData = data
    }
    this.#host.onStateChange()
  }

  #draw(view: ViewSheet): void {
    const mind = this.mind
    const selected = this.selectedTopicIds()
    this.#setStructure(structureOfLayout(view.layout))
    mind.direction = directionOfLayout(view.layout)
    mind.refresh(viewToMind(view))
    this.#lastView = view
    this.#syncedData = mind.getDataString()
    const again = selected.map((id) => this.#element(id)).filter((topic) => topic !== null)
    if (again.length > 0) mind.selectNodes(again)
  }

  /** Runs before the library's own key handling. */
  #guardKeys(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.#pickingFrom !== null) {
      this.cancelRelationshipPick()
      return
    }
    if (event.key === 'Escape' && this.#painting !== null) {
      this.stopPainting()
      return
    }
    if (
      this.#boundary &&
      !(event.target instanceof Element && event.target.closest('#input-box'))
    ) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.stopImmediatePropagation()
        event.preventDefault()
        this.removeBoundary(this.#boundary.owner, this.#boundary.id)
        return
      }
      if (event.key === 'Escape') {
        this.#pickBoundary(null)
        return
      }
    }
    // While a title is typed, every key belongs to the text (Ctrl+arrow moves by words).
    if (event.target instanceof Element && event.target.closest('#input-box')) return
    if (this.#styleKey(event)) {
      event.stopImmediatePropagation()
      event.preventDefault()
      return
    }
    if (this.#timelineArrow(event)) {
      event.stopImmediatePropagation()
      event.preventDefault()
      return
    }
    // The library switches the layout on Ctrl+arrow. A layout is written to the
    // file when it is picked, so it is picked on purpose (the toolbar), not by a key.
    const layoutKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(event.key)
    if (layoutKey && (event.ctrlKey || event.metaKey)) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  }

  /** Ctrl+B, Ctrl+I and Ctrl+U on the selected topics. True when the key was taken. */
  #styleKey(event: KeyboardEvent): boolean {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false
    const key = event.key.toLowerCase()
    if (key !== 'b' && key !== 'i' && key !== 'u') return false
    const ids = this.selectedTopicIds()
    if (ids.length === 0) return false
    if (key === 'b') this.toggleBold(ids)
    else if (key === 'i') this.toggleItalic(ids)
    else this.toggleDecoration(ids, 'underline')
    return true
  }

  /** In a timeline the plain arrow keys move the way the map looks (`timeline-keys.ts`). True when the key was taken. */
  #timelineArrow(event: KeyboardEvent): boolean {
    if (this.#structure !== 'timeline' || !isArrowKey(event.key)) return false
    // Alt+arrow reorders and Ctrl+arrow is the library's layout switch: those are not moves
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
    const mind = this.mind
    const current = mind.currentNode ?? mind.currentNodes?.[0]
    if (!current?.nodeObj) return false
    const target = timelineArrowTarget(current.nodeObj, event.key)
    const element = target ? this.#element(target.id) : null
    if (element) mind.selectNode(element)
    return true
  }

  #onClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    const topic = target.closest('me-tpc') as Topic | null
    const boundary = topic ? null : this.#boundaryAt(target)
    if (boundary && this.#pickingFrom === null && this.#painting === null) {
      this.#pickBoundary(boundary)
      return
    }
    if (this.#boundary && topic) this.#pickBoundary(null)
    if (this.#pickingFrom !== null) {
      const from = this.#pickingFrom
      this.#pickingFrom = null
      if (topic) {
        event.stopPropagation()
        this.addRelationship(from, topic.nodeObj.id)
      }
      this.#host.onStateChange()
      return
    }
    if (!topic) return
    if (this.#painting !== null) {
      const { style, sticky } = this.#painting
      this.setStyle([topic.nodeObj.id], style)
      if (!sticky) this.stopPainting()
      return
    }
    if (target.closest('.mm-chip-link')) {
      // The map never opens anything itself. Whatever the address is, it goes to
      // the main process, which opens it only when it is a web or mail address.
      event.preventDefault()
      event.stopPropagation()
      const link = this.#meta(topic.nodeObj).link
      if (link) this.#host.openLink(link)
    } else if (target.closest('.mm-chip-note')) {
      event.stopPropagation()
      this.mind.selectNode(topic)
      this.#host.onRequest('note', topic.nodeObj.id)
    }
  }

  /** The range a summary over the selection covers: positions among the branches of the selection's common parent. */
  #summaryRange(): { parent: string; start: number; end: number } | null {
    const paths = (this.mind.currentNodes ?? []).map((topic) => {
      const path: NodeObj[] = []
      for (let node: NodeObj | undefined = topic.nodeObj; node; node = node.parent) {
        path.unshift(node)
      }
      return path
    })
    if (paths.length === 0) return null
    let shared = Math.min(...paths.map((path) => path.length))
    for (let depth = 0; depth < shared; depth++) {
      if (paths.some((path) => path[depth] !== paths[0]![depth])) {
        shared = depth
        break
      }
    }
    // a selected topic that is an ancestor of the rest (or the only one) is covered itself
    if (paths.some((path) => path.length === shared)) shared--
    const parent = paths[0]![shared - 1]
    if (!parent?.children) return null
    const positions = paths.map((path) => parent.children!.indexOf(path[shared]!))
    if (positions.some((position) => position < 0)) return null
    return { parent: parent.id, start: Math.min(...positions), end: Math.max(...positions) }
  }
}

/** What a cut took out of the sheet: the source topics, and the relationship records that went with them. */
interface CutStash {
  /** ids of the topics that were cut (not of the topics below them) */
  ids: string[]
  topics: XmindTopic[]
  relationships: Record<string, unknown>[]
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const wanted = new Set(b)
  return new Set(a).size === a.length && a.every((id) => wanted.has(id))
}

/**
 * Names of the timings left in the page's performance timeline: drawing a
 * sheet for the first time, and bringing the source tree in line after a
 * change. They are how the speed of large maps is measured.
 */
export const DRAW_MEASURE = 'mindmap:draw'
export const RECONCILE_MEASURE = 'mindmap:reconcile'

function measure(name: string, started: number): void {
  try {
    performance.measure(name, { start: started, end: performance.now() })
  } catch {
    // a timeline that cannot take the entry is no reason to fail an edit
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
