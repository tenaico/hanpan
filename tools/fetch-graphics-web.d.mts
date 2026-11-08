export type GraphicsKind = 'photo' | 'illust'
export interface GraphicsWebPin {
  repo: string
  tag: string
  asset: string
  size: number
  sha256: string
}
export type FetchOutcome = 'cached' | 'fetched' | 'local' | 'missing'

export declare const GRAPHICS_KINDS: readonly GraphicsKind[]
export declare function readGraphicsPins(
  path?: string,
): Partial<Record<GraphicsKind, GraphicsWebPin>>
export declare function assetUrl(pin: GraphicsWebPin): string
export declare function verifyDownload(path: string, pin: { size: number; sha256: string }): void
export declare function pinStamp(pin: { tag: string; sha256: string }): string
export declare function localStamp(dir: string): string
export declare function localDirFor(
  kind: GraphicsKind,
  env: Record<string, string | undefined>,
): string | null
export declare function isStrict(env: Record<string, string | undefined>): boolean
export declare function flattenSingleRoot(dir: string): void
export declare function extractZip(zipPath: string, destDir: string): Promise<void>
export declare function fetchGraphicsWeb(options: {
  root?: string
  env?: Record<string, string | undefined>
  pins: Partial<Record<GraphicsKind, GraphicsWebPin>>
  download?: (url: string, dest: string) => Promise<void>
}): Promise<Record<GraphicsKind, FetchOutcome>>
