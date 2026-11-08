import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import {
  DOCX_MEDIA_SCHEME_PRIVILEGE,
  RENDERER_SCHEME,
  RENDERER_SCHEME_PRIVILEGE,
  resolveRendererFile,
} from './renderer-scheme'

/** Before app ready; a process may call registerSchemesAsPrivileged only once,
 * so hosts that register other schemes spread RENDERER_SCHEME_PRIVILEGE into
 * their own list instead. */
export function registerRendererScheme(): void {
  protocol.registerSchemesAsPrivileged([RENDERER_SCHEME_PRIVILEGE, DOCX_MEDIA_SCHEME_PRIVILEGE])
}

export interface RendererProtocolOptions {
  /** Extra response headers for a file of a host, e.g. a frame-ancestors policy; none when undefined. */
  headers?: (host: string, file: string) => Record<string, string> | undefined
  /** Whether a host may serve a file; a refused one is a 404 (e.g. an app kept to its own origin). */
  allow?: (host: string, file: string) => boolean
}

/** After app ready: serve each module's built renderer directory. */
export function installRendererProtocol(
  roots: Record<string, string>,
  options: RendererProtocolOptions = {},
): void {
  const table = new Map(Object.entries(roots))
  protocol.handle(RENDERER_SCHEME, async (request) => {
    const file = resolveRendererFile(table, request.url)
    if (!file) return new Response(null, { status: 404 })
    if (options.allow && !options.allow(new URL(request.url).hostname, file)) {
      return new Response(null, { status: 404 })
    }
    const response = await net
      .fetch(pathToFileURL(file).toString())
      .catch(() => new Response(null, { status: 404 }))
    const extra = options.headers?.(new URL(request.url).hostname, file)
    if (!extra) return response
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(extra)) headers.set(name, value)
    return new Response(response.body, { status: response.status, headers })
  })
}
