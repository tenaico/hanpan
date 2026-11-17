/**
 * Colours of the 3D view per app theme: the space around the workplane, the
 * workplane and its grid, the ink of drawing lines that have no colour of their
 * own (or are white), the selection outline and the outline of a group that
 * could not be computed. The view is drawn by WebGL, which cannot read CSS
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
  /** drawing lines without a colour, and white ones (the theme's text colour) */
  ink: string
  /** the outline around selected parts */
  selection: string
  /** the outline and label of a part that could not be computed */
  issue: string
}

export const CANVAS_COLORS: Record<CanvasTheme, CanvasColors> = {
  light: {
    background: '#eef0f3',
    plane: '#ffffff',
    grid: '#dde1e6',
    gridMajor: '#b9bfc7',
    ink: '#242424',
    selection: '#1f7a8c',
    issue: '#d13438',
  },
  dark: {
    background: '#1b1d20',
    plane: '#26292d',
    grid: '#363a40',
    gridMajor: '#50555c',
    ink: '#e4e4e4',
    selection: '#5fb3c4',
    issue: '#e5484d',
  },
}
