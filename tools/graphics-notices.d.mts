import type { GraphicsKind, GraphicsWebPin } from './fetch-graphics-web.mjs'

export declare function graphicsNoticeFiles(dir: string): string[]
export declare function graphicsNoticeSection(options: {
  webRoot: string
  pins: Partial<Record<GraphicsKind, GraphicsWebPin>>
  read: (path: string) => string
  gap: (message: string) => void
}): string
