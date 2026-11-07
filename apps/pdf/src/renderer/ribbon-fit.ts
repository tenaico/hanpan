/// Fits the ribbon band to its window, with the same steps as apps/sheets (ribbon-fit.ts there).
/// The band has two denser layouts in styles.css (`.ribbon-body[data-fit]` and
/// `.ribbon-body[data-fit='2']`); it takes the first at which it no longer overflows, so the
/// step follows what the labels need in the UI language rather than a fixed window width.
/// Past the densest layout it scrolls, as before.
import { useLayoutEffect, type DependencyList } from 'react'

export const RIBBON_FIT_LEVELS = 2

/** Sets `data-fit` on the band to the first level whose content fits; returns that level. */
export function fitRibbonBand(band: HTMLElement): number {
  for (let level = 0; level <= RIBBON_FIT_LEVELS; level++) {
    if (level === 0) band.removeAttribute('data-fit')
    else band.setAttribute('data-fit', String(level))
    // reading scrollWidth lays the band out again with the level just set
    if (band.scrollWidth <= band.clientWidth) return level
  }
  return RIBBON_FIT_LEVELS
}

/**
 * Fits the band now and again whenever the band or one of its groups changes size: the
 * band is laid out before the document has loaded, and the zoom box and page count that
 * come in later widen a group, not the band. A level only moves the groups' padding, so
 * the refit that follows it lands on the same level and the observer settles.
 */
export function watchRibbonBand(band: HTMLElement): () => void {
  fitRibbonBand(band)
  if (typeof ResizeObserver === 'undefined') return () => {}
  const observer = new ResizeObserver(() => fitRibbonBand(band))
  observer.observe(band)
  for (const group of Array.from(band.children)) observer.observe(group)
  // web fonts can widen the labels after the first fit
  void document.fonts?.ready.then(() => fitRibbonBand(band))
  return () => observer.disconnect()
}

/**
 * Refits the band through watchRibbonBand from the moment it mounts (a callback ref's
 * element, so a band that appears after the first render is fitted too), and again when
 * `deps` change (the UI language, the tab shown).
 */
export function useRibbonFit(band: HTMLElement | null, deps: DependencyList): void {
  useLayoutEffect(() => {
    if (!band) return
    return watchRibbonBand(band)
  }, [band, ...deps])
}
