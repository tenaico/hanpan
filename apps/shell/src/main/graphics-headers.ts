/**
 * The AI Photo and AI Illustration web apps install a page API that controls
 * the whole app (decision 0093). The app runs on its own origin
 * (`genoffice-app://photo-app/`, `illust-app/`), apart from Hanpan's host page
 * (`genoffice-app://photo/`, `illust/`): the app cannot reach the host's
 * bridges, and the host reaches the app by messages only (option B).
 */

const HOSTS: Record<string, string> = { photo: 'photo', illust: 'illust' }
const APP_HOSTS: Record<string, string> = { 'photo-app': 'photo', 'illust-app': 'illust' }

function slashed(file: string): string {
  return file.replace(/\\/g, '/')
}

/** Only the app's own host page may put an app page in a frame. */
export function graphicsResponseHeaders(
  host: string,
  file: string,
): Record<string, string> | undefined {
  const kind = APP_HOSTS[host]
  if (!kind) return undefined
  if (!new RegExp(`/web/${kind}/[^/]+\\.html$`, 'i').test(slashed(file))) return undefined
  return { 'content-security-policy': `frame-ancestors genoffice-app://${kind}` }
}

/**
 * Which origin serves which files: the host origin never the web app (it would
 * be the host's own origin again), the app origin its own web build only.
 */
export function graphicsRequestAllowed(host: string, file: string): boolean {
  const path = slashed(file)
  if (HOSTS[host]) return !/\/web\//i.test(path)
  const kind = APP_HOSTS[host]
  if (kind) return new RegExp(`/web/${kind}/`, 'i').test(path)
  return true
}
