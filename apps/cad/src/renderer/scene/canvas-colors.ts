/**
 * Colours of the 3D view per app theme: the space around the workplane, the
 * workplane and its grid. The view is drawn by WebGL, which cannot read CSS
 * tokens, so its colours live in this table (apps/cad/AGENTS.md). Part colours
 * are document content and are the same in both themes; they are not here.
 */
export type CanvasTheme = 'light' | 'dark'

export interface CanvasColors {
  /** around the workplane */
  background: string
  /** the workplane */
  plane: string
  /** a grid line */
  grid: string
  /** every tenth grid line */
  gridMajor: string
}

export const CANVAS_COLORS: Record<CanvasTheme, CanvasColors> = {
  light: {
    background: '#eef0f3',
    plane: '#ffffff',
    grid: '#dde1e6',
    gridMajor: '#b9bfc7',
  },
  dark: {
    background: '#1b1d20',
    plane: '#26292d',
    grid: '#363a40',
    gridMajor: '#50555c',
  },
}
