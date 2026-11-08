// The parts a renderer (an editor tab) uses: no document writers, so the docx
// library and the engine types stay out of renderer bundles.
export * from './outline'
export * from './numbering'
export * from './send'
export * from './flesh-out'
export * from './slide-writer'
export { koreanDate, type DocBlock } from './blocks'
export { markdownToBlocks } from './markdown-blocks'
export * from './sync'
export * from './sync-protocol'
export * from './gongmun'
export type { DocTemplate } from './templates-data'
export {
  SLIDE_STYLES,
  isSlideStyleId,
  type SlideStyleId,
  type SlideStyleInfo,
} from './slide-styles'
export * from './gongu-credit'
export * from './gongu-ai'
