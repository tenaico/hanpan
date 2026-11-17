/**
 * The AI Drawing editor's own icons, drawn for this app (none is taken from
 * another product). They follow the mind map editor's set: a 20-unit grid
 * shown at 20 pixels, line drawings with a 1.5 stroke, round ends and
 * corners, in the current text colour, inside the middle 16 units.
 *
 * Solids are drawn in a simple oblique view: the front face square-on, the
 * depth going up and to the right, so the 15 shapes read as one family.
 */
import type { ReactNode } from 'react'
import type { ShapeKind } from '@genoffice/cad-engine'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const SHAPES: Record<ShapeKind, ReactNode> = {
  box: <path d="M3 7h10v10H3zM3 7l4-4h10l-4 4M13 17l4-4V3" />,
  cylinder: (
    <>
      <ellipse cx="10" cy="5" rx="6" ry="2.5" />
      <path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" />
    </>
  ),
  sphere: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  cone: (
    <>
      <path d="M10 2.5 4 15M10 2.5 16 15" />
      <ellipse cx="10" cy="15" rx="6" ry="2.5" />
    </>
  ),
  pyramid: <path d="M10 2.5 3 15l6 2.5 8-4zM10 2.5l-1 15" />,
  wedge: <path d="M3 17h10V7zM13 7l4-4v10l-4 4M3 17l14-14" />,
  hemisphere: (
    <>
      <path d="M3 13a7 7 0 0 1 14 0" />
      <ellipse cx="10" cy="13" rx="7" ry="2.5" />
    </>
  ),
  tube: (
    <>
      <ellipse cx="10" cy="5" rx="6" ry="2.5" />
      <ellipse cx="10" cy="5" rx="3" ry="1.25" />
      <path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" />
    </>
  ),
  torus: (
    <>
      <ellipse cx="10" cy="10" rx="7.5" ry="5" />
      <path d="M6.5 9.5c1.8 1.6 5.2 1.6 7 0M7.5 10.6c1.4-1 3.6-1 5 0" />
    </>
  ),
  triPrism: <path d="M3 17h8L7 9zM7 9l4-4 5 8-5 4" />,
  hexPrism: (
    <>
      <path d="M5 6.5 7.5 4h5L15 6.5 12.5 9h-5z" />
      <path d="M5 6.5v8L7.5 17h5l2.5-2.5v-8M7.5 9v8M12.5 9v8" />
    </>
  ),
  roundedBox: <rect x="3" y="5" width="14" height="12" rx="3.5" />,
  starPrism: (
    <path d="m10 2.5 2 4.3 4.5.5-3.4 3 1 4.5L10 12.5l-4.1 2.3 1-4.5-3.4-3 4.5-.5zM5.9 14.8v2.7M14.1 14.8v2.7" />
  ),
  roof: <path d="M3 17V10l4-6.5h7L17 10v7zM3 10h14M7 3.5 10 10" />,
  text: <path d="M4 4.5h12M10 4.5V17M7.5 17h5" />,
}

export function ShapeIcon({ kind }: { kind: ShapeKind }) {
  return <Icon>{SHAPES[kind]}</Icon>
}

export const IconMore = () => (
  <Icon>
    <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
    <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
    <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
    <path d="M14.25 11.5v5.5M11.5 14.25H17" />
  </Icon>
)

export const IconHole = () => (
  <Icon>
    <circle cx="10" cy="10" r="7" strokeDasharray="2.5 2.5" />
    <circle cx="10" cy="10" r="2.5" />
  </Icon>
)

export const IconSketch = () => (
  <Icon>
    <path d="M3 17 4 13 13.5 3.5l3 3L7 16zM11.5 5.5l3 3" />
  </Icon>
)

export const IconGroup = () => (
  <Icon>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="9" y="9" width="8" height="8" rx="1" />
  </Icon>
)

export const IconUngroup = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="10" y="10" width="7" height="7" rx="1" strokeDasharray="2 2" />
  </Icon>
)

export const IconAlign = () => (
  <Icon>
    <path d="M3 2.5v15M3 6h9M3 13h13" />
  </Icon>
)

export const IconSave = () => (
  <Icon>
    <path d="M4 3h9.5L16.5 6v11H4zM7 3v4.5h6V3M7 17v-5h7v5" />
  </Icon>
)

export const IconUndo = () => (
  <Icon>
    <path d="M7 4 3.5 7.5 7 11M3.5 7.5H12a4.5 4.5 0 0 1 0 9H8" />
  </Icon>
)

export const IconRedo = () => (
  <Icon>
    <path d="m13 4 3.5 3.5L13 11M16.5 7.5H8a4.5 4.5 0 0 0 0 9h4" />
  </Icon>
)

export const IconExport = () => (
  <Icon>
    <path d="M10 12V3M6.5 6.5 10 3l3.5 3.5M4 11v6h12v-6" />
  </Icon>
)

export const IconPicture = () => (
  <Icon>
    <rect x="3" y="4" width="14" height="12" rx="1.5" />
    <path d="m3 14 4-4 3 3 2.5-2.5L17 15" />
  </Icon>
)

export const IconViewTop = () => (
  <Icon>
    <path d="M3 7h10v10H3zM3 7l4-4h10l-4 4M13 17l4-4V3" />
    <path d="M3 7l4-4h10l-4 4z" fill="currentColor" fillOpacity="0.35" />
  </Icon>
)

export const IconViewFront = () => (
  <Icon>
    <path d="M3 7l4-4h10l-4 4M13 17l4-4V3" />
    <path d="M3 7h10v10H3z" fill="currentColor" fillOpacity="0.35" />
  </Icon>
)

export const IconViewSide = () => (
  <Icon>
    <path d="M3 7h10v10H3zM3 7l4-4h10l-4 4" />
    <path d="M13 7l4-4v10l-4 4z" fill="currentColor" fillOpacity="0.35" />
  </Icon>
)

export const IconFit = () => (
  <Icon>
    <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
    <rect x="7" y="7" width="6" height="6" rx="1" />
  </Icon>
)

export const IconMove = () => (
  <Icon>
    <path d="M10 2.5v15M2.5 10h15M8 4.5l2-2 2 2M8 15.5l2 2 2-2M4.5 8l-2 2 2 2M15.5 8l2 2-2 2" />
  </Icon>
)

export const IconRotate = () => (
  <Icon>
    <path d="M16 10a6 6 0 1 1-2-4.5M16 3v4h-4" />
  </Icon>
)

export const IconScale = () => (
  <Icon>
    <rect x="3" y="9" width="8" height="8" rx="1" />
    <path d="M10 3h7v7M17 3l-6 6" />
  </Icon>
)

export const IconKeyboard = () => (
  <Icon>
    <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
    <path d="M5.5 8h1M9.5 8h1M13.5 8h1M6.5 12h7" />
  </Icon>
)

/** A ruler laid on a slant, with its marks. */
export const IconMeasure = () => (
  <Icon>
    <path d="m3 13.5 10.5-10.5 3.5 3.5L6.5 17z" />
    <path d="m6 10.5 1.5 1.5M8.5 8l2 2M11 5.5l1.5 1.5" />
  </Icon>
)

/** A landscape sheet with a part and one dimension line over it. */
export const IconSheet = () => (
  <Icon>
    <rect x="2.5" y="4" width="15" height="12" rx="1" />
    <path d="M5.5 13h5v-4h-5zM5.5 7h5M5.5 6v2M10.5 6v2M12.5 13h3v-2h-3" />
  </Icon>
)

/** Two sheets, one over the other. */
export const IconCopy = () => (
  <Icon>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
  </Icon>
)

/** A page with an arrow going into it. */
export const IconSend = () => (
  <Icon>
    <path d="M9 3H5.5A1.5 1.5 0 0 0 4 4.5v11A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V10" />
    <path d="M11 3h6v6M17 3l-7 7" />
  </Icon>
)
