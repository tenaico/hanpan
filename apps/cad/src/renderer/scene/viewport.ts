/**
 * The 3D view: the workplane with its grid, the model, the selection and the
 * handles, under a perspective camera that the mouse turns, pans and zooms
 * (three's OrbitControls). +Z is up, units are millimetres, the workplane is
 * centred on the origin.
 *
 * What to draw comes in as plain `SceneItem`s (scene-model.ts). Unchanged
 * meshes keep their GPU buffers between documents, so moving one part does
 * not upload a large imported mesh again.
 *
 * Handles are three's TransformControls on a pivot that carries the selected
 * parts while the pointer is down: the document is not touched until the
 * release, which hands exactly one change to `onEdit` (handles.ts). Esc, a
 * cancelled pointer or a window switch put everything back without a change.
 *
 * While an outline is sketched (`setSketch`), the handles are hidden and a
 * click on the plate hands its point to `onWorkplanePoint` instead of picking.
 * `snapshot` draws one frame on the light colours without the selection and
 * the handles and reads it as PNG (scene/snapshot.ts).
 *
 * While measuring (`setMeasure`), the handles are hidden too; the point under
 * the pointer (on a part's surface or drawing lines, else on the plate) goes
 * to `onMeasureHover` as the pointer moves and to `onMeasureClick` on a click,
 * with how far a snap may reach at that depth. The view draws what it is told:
 * the snap marker, the measured line and its label.
 *
 * The view draws on demand (after a camera move, a resize or a change), not in
 * a loop. A PC that cannot make a WebGL context gets `null`, and the screen
 * explains what to do instead of staying blank. When the context is lost while
 * the view is open (a driver reset), the renderer is made again and the
 * document stays.
 */
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Euler,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type { Box3, CadDocument, EvalIssue, Mesh as CadMesh, Vec3 } from '@genoffice/cad-engine'
import { fitTo, orbitDirection, viewDirection, type ViewName } from './camera'
import { CANVAS_COLORS, type CanvasColors, type CanvasTheme } from './canvas-colors'
import { lineColor } from './drawing-lines'
import { HandleSession, type DocChange, type HandleMode } from './handles'
import { pickPart, pickPoint, rayToWorkplane, type Ray } from './picking'
import { sceneBounds, type SceneItem } from './scene-model'
import { snapshotPng } from './snapshot'

export type ViewCommand = Exclude<ViewName, 'iso'> | 'fit'

export interface Viewport {
  setTheme(theme: CanvasTheme): void
  /** The document and what to draw for it; `items` left out draws only the workplane. */
  showDocument(doc: CadDocument, items?: readonly SceneItem[]): void
  /** Top-level part ids to outline and carry with the handles. */
  setSelection(ids: readonly string[]): void
  setHandleMode(mode: HandleMode): void
  /** The view buttons: look from the top, front or side, or frame the whole model. */
  view(command: ViewCommand): void
  /**
   * The outline being sketched, drawn on the workplane; an empty list starts
   * sketching (clicks go to `onWorkplanePoint`), null ends it.
   */
  setSketch(points: readonly (readonly [number, number])[] | null): void
  /** What the measuring tool shows; null ends measuring (clicks pick parts again). */
  setMeasure(view: MeasureView | null): void
  /**
   * The "Edit lines" tool: the picked drawing entities as polylines (x, y, z
   * in mm) drawn over everything in the selection colour; an empty list
   * starts the tool (clicks go to `onEntityClick`), null ends it.
   */
  setEntityEdit(lines: readonly (readonly number[])[] | null): void
  /** One frame on the light colours, without selection and handles, as PNG bytes. */
  snapshot(): Promise<Uint8Array>
  dispose(): void
}

/** The measuring tool's marks, in millimetres. */
export interface MeasureView {
  /** the point a click would stick to now */
  snap: Vec3 | null
  /** the first point, or the start of the measured line */
  a: Vec3 | null
  /** the end of the measured line, once there is a reading */
  b: Vec3 | null
  /** the reading, shown at the middle of the line */
  label: string | null
}

export interface ViewportOptions {
  /** the context was lost and a new one could not be made */
  onUnavailable?: () => void
  /** a click: the top-level part under the pointer (null for empty space); `add` with Shift or Ctrl */
  onPick?: (id: string | null, add: boolean) => void
  /** a handle was released: the one change to record */
  onEdit?: (label: HandleMode, change: DocChange) => void
  /** a handle was refused (a locked part, the size handle on a mesh) */
  onRefused?: (error: unknown) => void
  /** the one-line reason shown beside a part that could not be computed */
  issueText?: (issue: Exclude<EvalIssue, 'empty' | null>) => string
  /** a click on the workplane while sketching, in millimetres (instead of `onPick`) */
  onWorkplanePoint?: (point: [number, number]) => void
  /** while measuring: the point under the pointer and how far (mm) a snap may be from it */
  onMeasureHover?: (point: Vec3, reach: number) => void
  /** while measuring: a click, instead of `onPick` */
  onMeasureClick?: (point: Vec3, reach: number) => void
  /** while editing lines: a click, instead of `onPick`; `add` with Shift or Ctrl */
  onEntityClick?: (point: Vec3, reach: number, add: boolean) => void
}

export type ViewportFactory = (
  host: HTMLElement,
  theme: CanvasTheme,
  options?: ViewportOptions,
) => Viewport | null

/** How long to wait for the browser to give a lost context back before making a new renderer. */
const CONTEXT_RESTORE_WAIT_MS = 1_000
/** Every this many grid lines one is drawn stronger. */
const MAJOR_EVERY = 10
/** More grid lines than this along one side are thinned out (a 1 mm grid on a large plate). */
const MAX_LINES_PER_SIDE = 1_000
/** A press that moves less than this many pixels is a click, not a turn of the camera. */
const CLICK_SLOP_PX = 4
/** Drawing lines are picked within this many pixels. */
const LINE_PICK_PX = 5
/** Drawing lines float this far above the plate so the plate does not hide them. */
const LINE_LIFT_MM = 0.05
/** The sketch floats this far above the plate, over the drawing lines. */
const SKETCH_LIFT_MM = 0.1
/** The size of a sketched point, in pixels. */
const SKETCH_POINT_PX = 6
/** A measuring click sticks to a corner this many pixels away. */
const MEASURE_SNAP_PX = 12
/** How strongly the outline of a part that could not be computed shows. */
const ISSUE_OPACITY = 0.7
const FOV_DEG = 45
const DEG = Math.PI / 180

/** Read by the handles only before the first document arrives. */
const EMPTY_DOC: CadDocument = {
  workplane: { width: 200, depth: 200, grid: 10 },
  parts: [],
  title: { name: '', date: '', scale: '' },
  extra: {},
}

/** A WebGL renderer, or null when this PC cannot make the context. */
function makeRenderer(): WebGLRenderer | null {
  try {
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    return renderer
  } catch {
    return null
  }
}

/** Grid line pairs across a width × depth plate centred on the origin, split into minor and major. */
function gridLines(
  width: number,
  depth: number,
  grid: number,
): { minor: number[]; major: number[] } {
  const minor: number[] = []
  const major: number[] = []
  const lines = Math.max(width, depth) / grid
  const step = lines > MAX_LINES_PER_SIDE ? grid * Math.ceil(lines / MAX_LINES_PER_SIDE) : grid
  const hw = width / 2
  const hd = depth / 2
  // lines run from the centre outwards so the centre lines are always major
  const along = (half: number, emit: (at: number, isMajor: boolean) => void): void => {
    for (let i = 0; i * step <= half + 1e-9; i++) {
      const isMajor = i % MAJOR_EVERY === 0
      emit(i * step, isMajor)
      if (i > 0) emit(-i * step, isMajor)
    }
  }
  const z = 0.01
  along(hw, (x, isMajor) => (isMajor ? major : minor).push(x, -hd, z, x, hd, z))
  along(hd, (y, isMajor) => (isMajor ? major : minor).push(-hw, y, z, hw, y, z))
  return { minor, major }
}

/** The 12 edges of a box as line segment pairs. */
function boxEdges(box: Box3): number[] {
  const [x0, y0, z0] = box.min
  const [x1, y1, z1] = box.max
  const c = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  const pairs = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
  return pairs.flatMap((i) => c[i]!)
}

function lineObject(positions: number[], material: LineBasicMaterial): LineSegments {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return new LineSegments(geometry, material)
}

/** Polylines as segment pairs with one colour per vertex. */
function drawingObject(item: SceneItem, colors: CanvasColors): LineSegments | null {
  const positions: number[] = []
  const vertexColors: number[] = []
  const tint = new Color()
  for (const line of item.lines ?? []) {
    tint.set(lineColor(line.color, colors))
    const p = line.points
    for (let i = 0; i + 5 < p.length; i += 3) {
      positions.push(p[i]!, p[i + 1]!, p[i + 2]!, p[i + 3]!, p[i + 4]!, p[i + 5]!)
      vertexColors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b)
    }
  }
  if (positions.length === 0) return null
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(vertexColors, 3))
  const object = new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true }))
  object.position.z = LINE_LIFT_MM
  return object
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

export const createViewport: ViewportFactory = (host, theme, options = {}) => {
  let renderer = makeRenderer()
  if (!renderer) return null

  let colors = CANVAS_COLORS[theme]
  const scene = new Scene()
  scene.background = new Color(colors.background)

  const camera = new PerspectiveCamera(FOV_DEG, 1, 1, 100_000)
  camera.up.set(0, 0, 1)
  scene.add(camera)
  // light intensities, not theme colours: part colours are document content
  scene.add(new AmbientLight(0xffffff, 1.6))
  const sun = new DirectionalLight(0xffffff, 1.6)
  // the light comes from over the viewer's shoulder, so every face the camera sees is lit
  sun.position.set(0.4, 0.6, 1)
  camera.add(sun)

  const planeMaterial = new MeshBasicMaterial({
    color: colors.plane,
    // parts standing on the plate are drawn in front of it, not flickering with it
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const plane = new Mesh(new PlaneGeometry(1, 1), planeMaterial)
  scene.add(plane)
  const minorMaterial = new LineBasicMaterial({ color: colors.grid })
  const majorMaterial = new LineBasicMaterial({ color: colors.gridMajor })
  const minorLines = new LineSegments(new BufferGeometry(), minorMaterial)
  const majorLines = new LineSegments(new BufferGeometry(), majorMaterial)
  scene.add(minorLines, majorLines)

  // ---- the model ----
  const model = new Group()
  scene.add(model)
  const selectionMaterial = new LineBasicMaterial({ color: colors.selection, depthTest: false })
  const issueMaterial = new LineBasicMaterial({
    color: colors.issue,
    transparent: true,
    opacity: ISSUE_OPACITY,
  })
  // the outline being sketched: its lines and its points, in the selection colour
  const sketchLineMaterial = new LineBasicMaterial({ color: colors.selection, depthTest: false })
  const sketchPointMaterial = new PointsMaterial({
    color: colors.selection,
    size: SKETCH_POINT_PX,
    sizeAttenuation: false,
    depthTest: false,
  })
  const sketchLine = new Line(new BufferGeometry(), sketchLineMaterial)
  const sketchPoints = new Points(new BufferGeometry(), sketchPointMaterial)
  sketchLine.renderOrder = 3
  sketchPoints.renderOrder = 3
  sketchLine.visible = false
  sketchPoints.visible = false
  scene.add(sketchLine, sketchPoints)
  let sketching = false
  // the measured line, over everything, in the selection colour; its marks are page elements
  const measureMaterial = new LineBasicMaterial({ color: colors.selection, depthTest: false })
  const measureLine = new Line(new BufferGeometry(), measureMaterial)
  measureLine.renderOrder = 3
  measureLine.visible = false
  scene.add(measureLine)
  let measure: MeasureView | null = null
  // the "Edit lines" tool: the picked entities, over everything in the selection colour
  const entityMaterial = new LineBasicMaterial({ color: colors.selection, depthTest: false })
  const entityLines = new LineSegments(new BufferGeometry(), entityMaterial)
  entityLines.renderOrder = 3
  entityLines.visible = false
  scene.add(entityLines)
  let entityEdit = false
  const measureLayer = document.createElement('div')
  measureLayer.className = 'cad-measure-layer'
  const snapMark = document.createElement('div')
  snapMark.className = 'cad-measure-snap'
  snapMark.setAttribute('data-cad-measure-snap', '')
  const firstMark = document.createElement('div')
  firstMark.className = 'cad-measure-snap cad-measure-first'
  const measureLabel = document.createElement('div')
  measureLabel.className = 'cad-measure-label'
  measureLabel.setAttribute('data-cad-measure-label', '')
  measureLayer.append(snapMark, firstMark, measureLabel)
  measureLayer.hidden = true
  host.append(measureLayer)
  /** a hover waiting for the next frame (one ray per frame, however fast the pointer moves) */
  let hoverAt: { x: number; y: number } | null = null
  let hoverFrame = 0
  /** GPU buffers by engine mesh: an unchanged part keeps its buffers */
  let geometries = new Map<CadMesh, BufferGeometry>()
  /** what is drawn per item id: its mesh, lines and outlines (carried by the handles) */
  let objects = new Map<string, Object3D[]>()
  const labels = document.createElement('div')
  labels.className = 'cad-issue-labels'
  host.append(labels)
  let labelFor: { box: Box3; el: HTMLElement }[] = []

  let doc: CadDocument | null = null
  let items: readonly SceneItem[] = []
  let selected: string[] = []
  let mode: HandleMode = 'move'

  // ---- handles ----
  const pivot = new Object3D()
  scene.add(pivot)
  const session = new HandleSession(() => doc ?? EMPTY_DOC)
  const start = {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: new Vector3(1, 1, 1),
  }
  /** objects riding on the pivot during a drag, with where they were */
  let carried: { object: Object3D; position: Vector3 }[] = []
  let snap = true
  /** the press going on started a handle drag (it is not a click) */
  let handleGesture = false

  let controls: OrbitControls
  let handles: TransformControls
  let workplane: CadDocument['workplane'] | null = null
  let frame = 0
  let restoreTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let press: { x: number; y: number } | null = null

  /** Puts a page element over a model point; hides it when the point is behind or off screen. */
  const placeAt = (el: HTMLElement, point: Vec3 | null): void => {
    if (!point) {
      el.style.display = 'none'
      return
    }
    const at = new Vector3(...point).project(camera)
    const visible = at.z < 1 && Math.abs(at.x) <= 1 && Math.abs(at.y) <= 1
    el.style.display = visible ? '' : 'none'
    el.style.left = `${((at.x + 1) / 2) * host.clientWidth}px`
    el.style.top = `${((1 - at.y) / 2) * host.clientHeight}px`
  }

  const placeMeasure = (): void => {
    measureLayer.hidden = measure === null
    if (!measure) return
    placeAt(snapMark, measure.snap)
    placeAt(firstMark, measure.b ? null : measure.a)
    const middle: Vec3 | null =
      measure.a && measure.b && measure.label
        ? [
            (measure.a[0] + measure.b[0]) / 2,
            (measure.a[1] + measure.b[1]) / 2,
            (measure.a[2] + measure.b[2]) / 2,
          ]
        : null
    measureLabel.textContent = middle ? measure.label : ''
    placeAt(measureLabel, middle)
  }

  const placeLabels = (): void => {
    placeMeasure()
    if (labelFor.length === 0) return
    const width = host.clientWidth
    const height = host.clientHeight
    const at = new Vector3()
    for (const { box, el } of labelFor) {
      at.set((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, box.max[2])
      at.project(camera)
      const visible = at.z < 1 && Math.abs(at.x) <= 1 && Math.abs(at.y) <= 1
      el.style.display = visible ? '' : 'none'
      el.style.left = `${((at.x + 1) / 2) * width}px`
      el.style.top = `${((1 - at.y) / 2) * height}px`
    }
  }

  const render = (): void => {
    if (frame || disposed) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (disposed || !renderer) return
      renderer.render(scene, camera)
      placeLabels()
    })
  }

  const resize = (): void => {
    if (!renderer) return
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    render()
  }

  // ---- drawing the items ----

  const geometryOf = (mesh: CadMesh, next: Map<CadMesh, BufferGeometry>): BufferGeometry => {
    let geometry = geometries.get(mesh) ?? next.get(mesh)
    if (!geometry) {
      // the engine's arrays are used as they are, without a copy
      geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3))
      geometry.setIndex(new BufferAttribute(mesh.indices, 1))
      geometry.computeBoundingSphere()
    }
    next.set(mesh, geometry)
    return geometry
  }

  const clearObjects = (): void => {
    for (const list of objects.values()) {
      for (const object of list) {
        object.removeFromParent()
        if (object instanceof Mesh) (object.material as MeshLambertMaterial).dispose()
        if (object instanceof LineSegments) {
          object.geometry.dispose()
          const material = object.material as LineBasicMaterial
          if (material !== selectionMaterial && material !== issueMaterial) material.dispose()
        }
      }
    }
    objects = new Map()
    labels.replaceChildren()
    labelFor = []
  }

  const drawItems = (): void => {
    clearObjects()
    const next = new Map<CadMesh, BufferGeometry>()
    const chosen = new Set(selected)
    for (const item of items) {
      const list: Object3D[] = []
      if (item.mesh) {
        const see = item.opacity < 1
        const mesh = new Mesh(
          geometryOf(item.mesh, next),
          new MeshLambertMaterial({
            color: item.color,
            flatShading: true,
            transparent: see,
            opacity: item.opacity,
            depthWrite: !see,
          }),
        )
        // see-through parts are drawn after the solid ones
        if (see) mesh.renderOrder = 1
        list.push(mesh)
      }
      const lines = item.lines ? drawingObject(item, colors) : null
      if (lines) list.push(lines)
      if (item.issue) {
        list.push(lineObject(boxEdges(item.box), issueMaterial))
        const el = document.createElement('div')
        el.className = 'cad-issue-label'
        el.setAttribute('role', 'note')
        el.textContent = options.issueText?.(item.issue) ?? item.issue
        labels.append(el)
        labelFor.push({ box: item.box, el })
      }
      if (chosen.has(item.id)) {
        const outline = lineObject(boxEdges(item.box), selectionMaterial)
        outline.renderOrder = 2
        list.push(outline)
      }
      for (const object of list) model.add(object)
      objects.set(item.id, list)
    }
    // buffers of meshes that are gone
    for (const [mesh, geometry] of geometries) if (!next.has(mesh)) geometry.dispose()
    geometries = next
    placeHandles()
    render()
  }

  // ---- the handles ----

  /** Puts the pivot where the selection is and shows the handles on it, or hides them. */
  function placeHandles(): void {
    if (!handles) return
    if (sketching || measure || entityEdit) {
      handles.detach()
      return
    }
    const part = selected.length === 1 ? doc?.parts.find((p) => p.id === selected[0]) : undefined
    const shown = items.filter((i) => selected.includes(i.id))
    // the size handle works on one part at a time
    if (shown.length === 0 || (mode === 'scale' && !part)) {
      handles.detach()
      return
    }
    pivot.position.set(0, 0, 0)
    pivot.quaternion.identity()
    pivot.scale.set(1, 1, 1)
    if (part) {
      pivot.position.set(...part.position)
      if (mode === 'scale') {
        // sizes follow the part's own axes
        const [rx, ry, rz] = part.rotation
        pivot.quaternion.setFromEuler(new Euler(rx * DEG, ry * DEG, rz * DEG, 'ZYX'))
      }
    } else {
      const box = sceneBounds(shown)
      if (box) {
        pivot.position.set(
          (box.min[0] + box.max[0]) / 2,
          (box.min[1] + box.max[1]) / 2,
          (box.min[2] + box.max[2]) / 2,
        )
      }
    }
    pivot.updateMatrixWorld()
    handles.setSpace(mode === 'scale' ? 'local' : 'world')
    handles.setMode(mode === 'move' ? 'translate' : mode === 'rotate' ? 'rotate' : 'scale')
    handles.attach(pivot)
  }

  /** The carried objects go back from the pivot to the model, as they were. */
  const putBack = (): void => {
    for (const { object, position } of carried) {
      model.add(object)
      object.position.copy(position)
      object.quaternion.identity()
      object.scale.set(1, 1, 1)
    }
    carried = []
    pivot.position.copy(start.position)
    pivot.quaternion.copy(start.quaternion)
    pivot.scale.copy(start.scale)
    pivot.updateMatrixWorld()
  }

  const onHandleDown = (): void => {
    handleGesture = true
    start.position.copy(pivot.position)
    start.quaternion.copy(pivot.quaternion)
    start.scale.copy(pivot.scale)
    try {
      session.begin(selected, mode, [pivot.position.x, pivot.position.y, pivot.position.z])
    } catch (err) {
      // the drag does not start: the handles let go at once
      handles.dragging = false
      options.onRefused?.(err)
      return
    }
    carried = selected.flatMap((id) =>
      (objects.get(id) ?? []).map((object) => ({ object, position: object.position.clone() })),
    )
    for (const { object } of carried) pivot.attach(object)
  }

  const onHandleChange = (): void => {
    if (!session.active) return
    if (mode === 'move') {
      const raw = new Vector3().subVectors(pivot.position, start.position)
      const shown = session.preview({ move: [raw.x, raw.y, raw.z] }, { snap }).move!
      pivot.position.copy(start.position).add(new Vector3(...shown))
    } else if (mode === 'rotate') {
      const turn = pivot.quaternion.clone().multiply(start.quaternion.clone().invert())
      const e = new Euler().setFromQuaternion(turn, 'ZYX')
      const shown = session.preview({ rotate: [e.x / DEG, e.y / DEG, e.z / DEG] }, { snap }).rotate!
      pivot.quaternion
        .setFromEuler(new Euler(shown[0] * DEG, shown[1] * DEG, shown[2] * DEG, 'ZYX'))
        .multiply(start.quaternion)
    } else {
      const f = pivot.scale
      const shown = session.preview(
        { scale: [f.x / start.scale.x, f.y / start.scale.y, f.z / start.scale.z] },
        { snap },
      ).scale!
      pivot.scale.set(shown[0], shown[1], shown[2]).multiply(start.scale)
    }
    pivot.updateMatrixWorld()
    render()
  }

  const onHandleUp = (): void => {
    if (!session.active) return
    const change = session.commit()
    putBack()
    render()
    if (change) options.onEdit?.(mode, change)
  }

  /** Esc, a cancelled pointer or a window switch: back to where the drag began, nothing recorded. */
  const cancelDrag = (): void => {
    if (!session.active) return
    session.cancel()
    handles.dragging = false
    putBack()
    render()
  }

  const onDraggingChanged = (event: { value: unknown }): void => {
    controls.enabled = !event.value
  }

  // ---- clicking ----

  const onPointerDown = (event: PointerEvent): void => {
    snap = !event.altKey
    if (event.button !== 0) return
    press = { x: event.clientX, y: event.clientY }
    handleGesture = false
  }

  /** The ray from the camera through a page point, or null when the canvas has no size. */
  const rayAt = (clientX: number, clientY: number): Ray | null => {
    if (!renderer) return null
    const rect = renderer.domElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    const caster = new Raycaster()
    caster.setFromCamera(ndc, camera)
    const { origin, direction } = caster.ray
    return {
      origin: [origin.x, origin.y, origin.z],
      direction: [direction.x, direction.y, direction.z],
    }
  }

  /** How many millimetres one pixel covers at `distance` from the camera. */
  const mmPerPixel = (distance: number): number => {
    const height = renderer?.domElement.getBoundingClientRect().height || 1
    return (2 * distance * Math.tan((FOV_DEG * DEG) / 2)) / height
  }

  /** The measuring point under a page point, and how far a snap may reach there. */
  const measureAt = (clientX: number, clientY: number): { point: Vec3; reach: number } | null => {
    const ray = rayAt(clientX, clientY)
    if (!ray) return null
    const orbit = camera.position.distanceTo(controls.target)
    const point = pickPoint(items, ray, { lineTolerance: mmPerPixel(orbit) * LINE_PICK_PX })
    if (!point) return null
    const depth = camera.position.distanceTo(new Vector3(...point))
    return { point, reach: mmPerPixel(depth) * MEASURE_SNAP_PX }
  }

  const onPointerMove = (event: PointerEvent): void => {
    snap = !event.altKey
    if (!measure || press) return
    hoverAt = { x: event.clientX, y: event.clientY }
    if (hoverFrame) return
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0
      const at = hoverAt
      hoverAt = null
      if (!at || !measure || disposed) return
      const found = measureAt(at.x, at.y)
      if (found) options.onMeasureHover?.(found.point, found.reach)
    })
  }

  const onPointerUp = (event: PointerEvent): void => {
    const was = press
    press = null
    if (!was || event.button !== 0 || handleGesture || !renderer) return
    if (Math.hypot(event.clientX - was.x, event.clientY - was.y) > CLICK_SLOP_PX) return
    const rect = renderer.domElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const ndc = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const caster = new Raycaster()
    caster.setFromCamera(ndc, camera)
    const { origin, direction } = caster.ray
    if (measure) {
      const found = measureAt(event.clientX, event.clientY)
      if (found) options.onMeasureClick?.(found.point, found.reach)
      return
    }
    if (entityEdit) {
      const found = measureAt(event.clientX, event.clientY)
      if (found) {
        options.onEntityClick?.(found.point, found.reach, event.shiftKey || event.ctrlKey)
      }
      return
    }
    if (sketching) {
      const ray: Ray = {
        origin: [origin.x, origin.y, origin.z],
        direction: [direction.x, direction.y, direction.z],
      }
      const point = rayToWorkplane(ray)
      if (point) options.onWorkplanePoint?.(point)
      return
    }
    // how many millimetres one pixel covers at the orbit target
    const reach = camera.position.distanceTo(controls.target)
    const perPixel = (2 * reach * Math.tan((FOV_DEG * DEG) / 2)) / rect.height
    const id = pickPart(
      items,
      {
        origin: [origin.x, origin.y, origin.z],
        direction: [direction.x, direction.y, direction.z],
      },
      { lineTolerance: perPixel * LINE_PICK_PX },
    )
    options.onPick?.(id, event.shiftKey || event.ctrlKey || event.metaKey)
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && session.active) {
      event.preventDefault()
      cancelDrag()
    }
    if (event.key === 'Alt') snap = false
  }

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Alt') snap = true
  }

  // ---- the renderer, made again after a lost context ----

  const attach = (next: WebGLRenderer): void => {
    renderer = next
    host.append(next.domElement)
    controls = new OrbitControls(camera, next.domElement)
    controls.addEventListener('change', render)
    handles = new TransformControls(camera, next.domElement)
    handles.addEventListener('change', render)
    handles.addEventListener('mouseDown', onHandleDown)
    handles.addEventListener('objectChange', onHandleChange)
    handles.addEventListener('mouseUp', onHandleUp)
    handles.addEventListener('dragging-changed', onDraggingChanged)
    scene.add(handles.getHelper())
    next.domElement.addEventListener('pointerdown', onPointerDown)
    next.domElement.addEventListener('pointermove', onPointerMove)
    next.domElement.addEventListener('pointerup', onPointerUp)
    next.domElement.addEventListener('pointercancel', cancelDrag)
    next.domElement.addEventListener('webglcontextlost', onContextLost)
    next.domElement.addEventListener('webglcontextrestored', onContextRestored)
    placeHandles()
    resize()
  }

  const detach = (): void => {
    if (!renderer) return
    cancelDrag()
    const dom = renderer.domElement
    dom.removeEventListener('pointerdown', onPointerDown)
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('pointercancel', cancelDrag)
    dom.removeEventListener('webglcontextlost', onContextLost)
    dom.removeEventListener('webglcontextrestored', onContextRestored)
    controls.removeEventListener('change', render)
    controls.dispose()
    handles.detach()
    handles.getHelper().removeFromParent()
    handles.removeEventListener('change', render)
    handles.removeEventListener('mouseDown', onHandleDown)
    handles.removeEventListener('objectChange', onHandleChange)
    handles.removeEventListener('mouseUp', onHandleUp)
    handles.removeEventListener('dragging-changed', onDraggingChanged)
    handles.dispose()
    renderer.dispose()
    dom.remove()
    renderer = null
  }

  /** a new renderer for the same scene; the document and the camera stay */
  function rebuild(): void {
    restoreTimer = null
    if (disposed) return
    detach()
    const next = makeRenderer()
    if (!next) {
      options.onUnavailable?.()
      return
    }
    attach(next)
  }

  function onContextLost(): void {
    // three keeps the context restorable; when it does not come back, a new renderer is made
    if (restoreTimer === null) restoreTimer = setTimeout(rebuild, CONTEXT_RESTORE_WAIT_MS)
  }

  function onContextRestored(): void {
    if (restoreTimer !== null) clearTimeout(restoreTimer)
    restoreTimer = null
    render()
  }

  // ---- the camera ----

  const lookFrom = (direction: Vec3, box: Box3): void => {
    const pose = fitTo(box, {
      direction: orbitDirection(direction),
      aspect: camera.aspect,
      fovDeg: FOV_DEG,
    })
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
    controls.update()
    render()
  }

  /** The model's box, or the workplane when there is no model. */
  const frameBox = (): Box3 => {
    const box = sceneBounds(items)
    if (box) return box
    const w = (workplane?.width ?? 200) / 2
    const d = (workplane?.depth ?? 200) / 2
    return { min: [-w, -d, 0], max: [w, d, 0] }
  }

  const applyWorkplane = (next: CadDocument['workplane']): void => {
    const first = workplane === null
    if (
      workplane &&
      workplane.width === next.width &&
      workplane.depth === next.depth &&
      workplane.grid === next.grid
    ) {
      return
    }
    workplane = { ...next }
    plane.geometry.dispose()
    plane.geometry = new PlaneGeometry(next.width, next.depth)
    const { minor, major } = gridLines(next.width, next.depth, next.grid)
    minorLines.geometry.dispose()
    minorLines.geometry = new BufferGeometry()
    minorLines.geometry.setAttribute('position', new Float32BufferAttribute(minor, 3))
    majorLines.geometry.dispose()
    majorLines.geometry = new BufferGeometry()
    majorLines.geometry.setAttribute('position', new Float32BufferAttribute(major, 3))
    if (first) {
      // look at the plate from the front, a little from the right and above
      const reach = Math.max(next.width, next.depth)
      camera.position.set(reach * 0.6, -reach * 1.1, reach * 0.8)
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null
  observer?.observe(host)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', cancelDrag)
  attach(renderer)

  /** Paints the plate, the grid, the outlines and the drawing lines with `next`. */
  const paint = (next: CanvasColors): void => {
    colors = next
    scene.background = new Color(colors.background)
    planeMaterial.color.set(colors.plane)
    minorMaterial.color.set(colors.grid)
    majorMaterial.color.set(colors.gridMajor)
    selectionMaterial.color.set(colors.selection)
    issueMaterial.color.set(colors.issue)
    sketchLineMaterial.color.set(colors.selection)
    measureMaterial.color.set(colors.selection)
    entityMaterial.color.set(colors.selection)
    sketchPointMaterial.color.set(colors.selection)
    // drawing lines take the new ink
    if (!session.active) drawItems()
  }

  return {
    setTheme(next) {
      paint(CANVAS_COLORS[next])
      render()
    },
    showDocument(nextDoc, nextItems = []) {
      // the document changed under a drag (an AI edit, an undo): the drag is dropped
      cancelDrag()
      doc = nextDoc
      items = nextItems
      applyWorkplane(nextDoc.workplane)
      drawItems()
    },
    setSelection(ids) {
      if (ids.length === selected.length && ids.every((id, i) => id === selected[i])) return
      cancelDrag()
      selected = [...ids]
      drawItems()
    },
    setHandleMode(next) {
      if (next === mode) return
      cancelDrag()
      mode = next
      placeHandles()
      render()
    },
    view(command) {
      if (command === 'fit') {
        const toward = sub(
          [camera.position.x, camera.position.y, camera.position.z],
          [controls.target.x, controls.target.y, controls.target.z],
        )
        lookFrom(toward, frameBox())
      } else {
        lookFrom(viewDirection(command).direction, frameBox())
      }
    },
    setSketch(points) {
      sketching = points !== null
      // the handles stay out of the way while an outline is drawn
      if (sketching) cancelDrag()
      placeHandles()
      const flat = (points ?? []).flatMap(([x, y]) => [x, y, SKETCH_LIFT_MM])
      for (const object of [sketchLine, sketchPoints]) {
        object.geometry.dispose()
        object.geometry = new BufferGeometry()
        object.geometry.setAttribute('position', new Float32BufferAttribute(flat, 3))
        object.visible = flat.length > 0
      }
      render()
    },
    setMeasure(next) {
      const was = measure
      measure = next
      // starting or ending the tool: a drag in progress is dropped, the handles hide or come back
      if (!was !== !next) {
        if (next) cancelDrag()
        placeHandles()
      }
      const line = next?.a && next.b ? [...next.a, ...next.b] : []
      measureLine.geometry.dispose()
      measureLine.geometry = new BufferGeometry()
      measureLine.geometry.setAttribute('position', new Float32BufferAttribute(line, 3))
      measureLine.visible = line.length > 0
      placeMeasure()
      render()
    },
    setEntityEdit(lines) {
      const was = entityEdit
      entityEdit = lines !== null
      if (was !== entityEdit) {
        if (entityEdit) cancelDrag()
        placeHandles()
      }
      // each polyline becomes segments: p0-p1, p1-p2, ...
      const flat: number[] = []
      for (const line of lines ?? []) {
        for (let i = 3; i + 2 < line.length; i += 3) {
          flat.push(line[i - 3]!, line[i - 2]!, line[i - 1]!, line[i]!, line[i + 1]!, line[i + 2]!)
        }
      }
      entityLines.geometry.dispose()
      entityLines.geometry = new BufferGeometry()
      entityLines.geometry.setAttribute('position', new Float32BufferAttribute(flat, 3))
      entityLines.visible = flat.length > 0
      render()
    },
    snapshot() {
      if (!renderer) return Promise.reject(new Error('the 3D view has no renderer'))
      const current = renderer
      const helper = handles.getHelper()
      return snapshotPng({
        canvas: current.domElement,
        colors: () => colors,
        paint,
        draw: () => {
          current.render(scene, camera)
        },
        overlays: (visible) => {
          selectionMaterial.visible = visible
          measureMaterial.visible = visible
          entityMaterial.visible = visible
          helper.visible = visible
        },
      })
    },
    dispose() {
      if (disposed) return
      cancelDrag()
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      if (hoverFrame) cancelAnimationFrame(hoverFrame)
      if (restoreTimer !== null) clearTimeout(restoreTimer)
      observer?.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', cancelDrag)
      detach()
      clearObjects()
      for (const geometry of geometries.values()) geometry.dispose()
      geometries.clear()
      labels.remove()
      measureLayer.remove()
      measureLine.geometry.dispose()
      measureMaterial.dispose()
      entityLines.geometry.dispose()
      entityMaterial.dispose()
      plane.geometry.dispose()
      minorLines.geometry.dispose()
      majorLines.geometry.dispose()
      planeMaterial.dispose()
      minorMaterial.dispose()
      majorMaterial.dispose()
      selectionMaterial.dispose()
      issueMaterial.dispose()
      sketchLine.geometry.dispose()
      sketchPoints.geometry.dispose()
      sketchLineMaterial.dispose()
      sketchPointMaterial.dispose()
    },
  }
}
