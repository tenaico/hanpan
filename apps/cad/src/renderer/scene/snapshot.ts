/**
 * The 3D view as a PNG picture (File › Export › PNG, and later "copy picture").
 *
 * Exported pictures are always on a light background whatever the app theme
 * (apps/cad/AGENTS.md), and they show the model, not the editing aids: the
 * selection outline and the handles are hidden for the one frame. The frame
 * is drawn and read in the same task, so the canvas needs no
 * `preserveDrawingBuffer` (the browser copies the picture when `toBlob` is
 * called); then the screen's own colours and aids come back.
 */
import { CANVAS_COLORS, type CanvasColors } from './canvas-colors'

/** What the snapshot needs of the view. */
export interface SnapshotTarget {
  canvas: HTMLCanvasElement
  /** the colours the view paints with now */
  colors(): CanvasColors
  /** paint with these colours from the next frame on */
  paint(colors: CanvasColors): void
  /** draw one frame now (not on the next animation frame) */
  draw(): void
  /** show or hide the selection outline and the handles */
  overlays(visible: boolean): void
}

export async function snapshotPng(target: SnapshotTarget): Promise<Uint8Array> {
  const was = target.colors()
  let picture: Promise<Blob | null>
  target.overlays(false)
  try {
    target.paint(CANVAS_COLORS.light)
    target.draw()
    picture = new Promise((resolve) => target.canvas.toBlob(resolve, 'image/png'))
  } finally {
    target.paint(was)
    target.overlays(true)
    target.draw()
  }
  const blob = await picture
  if (!blob) throw new Error('the 3D view gave no PNG picture')
  return new Uint8Array(await blob.arrayBuffer())
}
