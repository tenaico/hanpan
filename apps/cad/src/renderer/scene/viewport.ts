/**
 * The 3D view: a workplane with its grid under a perspective camera that the
 * mouse turns, pans and zooms (three's OrbitControls). +Z is up, units are
 * millimetres, the workplane is centred on the origin.
 *
 * Stage 2 draws no parts: `showDocument` only applies the workplane size and
 * grid. The view draws on demand (after a camera move, a resize or a change),
 * not in a loop.
 *
 * A PC that cannot make a WebGL context gets `null`, and the screen explains
 * what to do instead of staying blank. When the context is lost while the view
 * is open (a driver reset), the renderer is made again and the document stays.
 */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CadDocument } from '@genoffice/cad-engine'
import { CANVAS_COLORS, type CanvasTheme } from './canvas-colors'

export interface Viewport {
  setTheme(theme: CanvasTheme): void
  showDocument(doc: CadDocument): void
  dispose(): void
}

export interface ViewportOptions {
  /** the context was lost and a new one could not be made */
  onUnavailable?: () => void
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

export const createViewport: ViewportFactory = (host, theme, options = {}) => {
  let renderer = makeRenderer()
  if (!renderer) return null

  let colors = CANVAS_COLORS[theme]
  const scene = new Scene()
  scene.background = new Color(colors.background)

  const camera = new PerspectiveCamera(45, 1, 1, 100_000)
  camera.up.set(0, 0, 1)

  const planeMaterial = new MeshBasicMaterial({ color: colors.plane })
  const plane = new Mesh(new PlaneGeometry(1, 1), planeMaterial)
  scene.add(plane)
  const minorMaterial = new LineBasicMaterial({ color: colors.grid })
  const majorMaterial = new LineBasicMaterial({ color: colors.gridMajor })
  const minorLines = new LineSegments(new BufferGeometry(), minorMaterial)
  const majorLines = new LineSegments(new BufferGeometry(), majorMaterial)
  scene.add(minorLines, majorLines)

  let controls: OrbitControls
  let workplane: CadDocument['workplane'] | null = null
  let frame = 0
  let restoreTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const render = (): void => {
    if (frame || disposed) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!disposed && renderer) renderer.render(scene, camera)
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

  const attach = (next: WebGLRenderer): void => {
    renderer = next
    host.append(next.domElement)
    controls = new OrbitControls(camera, next.domElement)
    controls.addEventListener('change', render)
    next.domElement.addEventListener('webglcontextlost', onContextLost)
    next.domElement.addEventListener('webglcontextrestored', onContextRestored)
    resize()
  }

  const detach = (): void => {
    if (!renderer) return
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
    controls.removeEventListener('change', render)
    controls.dispose()
    renderer.dispose()
    renderer.domElement.remove()
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
  attach(renderer)

  return {
    setTheme(next) {
      colors = CANVAS_COLORS[next]
      scene.background = new Color(colors.background)
      planeMaterial.color.set(colors.plane)
      minorMaterial.color.set(colors.grid)
      majorMaterial.color.set(colors.gridMajor)
      render()
    },
    showDocument(doc) {
      applyWorkplane(doc.workplane)
      render()
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      if (restoreTimer !== null) clearTimeout(restoreTimer)
      observer?.disconnect()
      detach()
      plane.geometry.dispose()
      minorLines.geometry.dispose()
      majorLines.geometry.dispose()
      planeMaterial.dispose()
      minorMaterial.dispose()
      majorMaterial.dispose()
    },
  }
}
