/// Fits a ribbon band to its window (Hanpan 0.17 #9). The band has two denser layouts in
/// styles.css (`.ribbon[data-fit]` and `.ribbon[data-fit='2']`); it takes the first at
/// which it no longer overflows, so the step follows what the labels need in the UI
/// language rather than a fixed window width. Past the densest layout it scrolls, as before.
import { useLayoutEffect, type DependencyList, type RefObject } from 'react'

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
 * Refits the band when its width changes and when `deps` change (the UI language, the
 * tab shown). A level changes the band's content, never its own box, so the observer
 * does not feed itself.
 */
export function useRibbonFit(ref: RefObject<HTMLElement | null>, deps: DependencyList): void {
  useLayoutEffect(() => {
    const band = ref.current
    if (!band) return
    fitRibbonBand(band)
    if (typeof ResizeObserver === 'undefined') return
    let width = band.clientWidth
    const observer = new ResizeObserver(() => {
      if (band.clientWidth === width) return
      width = band.clientWidth
      fitRibbonBand(band)
    })
    observer.observe(band)
    // web fonts can widen the labels after the first fit
    void document.fonts?.ready.then(() => fitRibbonBand(band))
    return () => observer.disconnect()
  }, deps)
}
