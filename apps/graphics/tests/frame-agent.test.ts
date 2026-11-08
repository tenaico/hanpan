/**
 * The web app runs on its own origin (decision 0093, option B): the host page
 * cannot reach `window.vectorcraft` in the frame, and the app cannot reach the
 * host. They talk by postMessage only: an agent in the frame answers calls
 * from its parent, and the host's client turns them back into the page API.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFrameAgent, type AgentLink } from '../src/renderer/frame/frame-agent'
import { connectPageApi, postFrameLock, type HostLink } from '../src/renderer/frame/page-api'
import { FakePage } from './helpers/fake-page'

const frames: HTMLIFrameElement[] = []
afterEach(() => {
  for (const f of frames.splice(0)) f.remove()
})

/**
 * jsdom's postMessage carries no source or origin, so the window links (which
 * check both) are proven in the e2e run; here a pair of links stands in, each
 * message structured-cloned and delivered later, as a browser does.
 */
function linkPair(): { host: HostLink; agent: AgentLink } {
  const toAgent: ((d: unknown) => void)[] = []
  const toHost: ((d: unknown) => void)[] = []
  const deliver = (to: ((d: unknown) => void)[], data: unknown) =>
    setTimeout(() => {
      for (const h of to) h(structuredClone(data))
    }, 0)
  return {
    host: { listen: (h) => void toHost.push(h), post: (m) => deliver(toAgent, m) },
    agent: { listen: (h) => void toAgent.push(h), post: (m) => deliver(toHost, m) },
  }
}

const links = new WeakMap<HTMLIFrameElement, HostLink>()

function frameWithApp(global: 'vectorcraft' | 'photocraft', page: unknown | null) {
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  frames.push(frame)
  const win = frame.contentWindow as unknown as Record<string, unknown>
  if (page) win[global] = page
  const pair = linkPair()
  installFrameAgent(frame.contentWindow!, global, '*', pair.agent)
  links.set(frame, pair.host)
  return frame
}

const connect = (frame: HTMLIFrameElement, ms: number) =>
  connectPageApi(frame, ms, links.get(frame))

describe('the frame agent and the host client', () => {
  it('carries every page API call and its answer across the frame boundary', async () => {
    const page = new FakePage().withDocument('logo.svg', true)
    page.handlers['shape.rectangle'] = () => ({ id: 7 })
    page.captured.set('a.png', new Uint8Array([1, 2, 3]))
    const frame = frameWithApp('vectorcraft', page)
    const api = await connect(frame, 2000)
    expect(await api.execute('shape.rectangle', { x: 1 })).toEqual({ id: 7 })
    expect(page.executed.at(-1)).toEqual(['shape.rectangle', { x: 1 }])
    expect(await api.files()).toEqual([{ path: 'a.png', size: 3 }])
    const bytes = await api.readFile('a.png')
    expect(Array.from(bytes)).toEqual([1, 2, 3])
    expect(await api.inspect()).toMatchObject({ activeDocument: 0 })
    api.captureDownloads(true)
    await vi.waitFor(() => expect(page.capturing).toBe(true))
  })

  it('an app error comes back as a rejected call with its message', async () => {
    const page = new FakePage()
    const frame = frameWithApp('vectorcraft', page)
    const api = await connect(frame, 2000)
    await expect(api.execute('nope.command', {})).rejects.toThrow(/unknown command/)
  })

  it('waits for an app that installs its API after the frame loaded', async () => {
    const frame = frameWithApp('photocraft', null)
    const connecting = connect(frame, 3000)
    setTimeout(() => {
      ;(frame.contentWindow as unknown as Record<string, unknown>).photocraft = new FakePage()
    }, 300)
    const api = await connecting
    expect(await api.commands()).toEqual([])
  })

  it('gives up when the app never answers', async () => {
    const frame = frameWithApp('photocraft', null)
    await expect(connect(frame, 400)).rejects.toThrow(/did not answer/)
  })

  it('only the page API methods cross: nothing else of the frame is reachable', async () => {
    const page = new FakePage()
    const frame = frameWithApp('vectorcraft', page)
    const api = (await connect(frame, 2000)) as unknown as Record<string, unknown>
    expect(Object.keys(api).sort()).toEqual(
      [
        'captureDownloads',
        'commands',
        'execute',
        'files',
        'inspect',
        'onHostRequest',
        'openFile',
        'readFile',
        'request',
        'screenshot',
      ].sort(),
    )
  })

  it('the lock blocks keys and pointer events inside the frame until released', async () => {
    const page = new FakePage()
    const frame = frameWithApp('vectorcraft', page)
    await connect(frame, 2000)
    const doc = frame.contentDocument!
    const appSaw = vi.fn()
    doc.body.addEventListener('keydown', appSaw)
    postFrameLock(frame, true, links.get(frame))
    await vi.waitFor(() =>
      expect(frame.contentWindow!.document.body.dataset.hanpanLocked).toBe('true'),
    )
    doc.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(appSaw).not.toHaveBeenCalled()
    postFrameLock(frame, false, links.get(frame))
    await vi.waitFor(() =>
      expect(frame.contentWindow!.document.body.dataset.hanpanLocked).toBeUndefined(),
    )
    doc.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(appSaw).toHaveBeenCalledTimes(1)
  })

  it('stands alone as source text (the preload runs that text in the frame)', async () => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    frames.push(frame)
    ;(frame.contentWindow as unknown as Record<string, unknown>).vectorcraft = new FakePage()
    const pair = linkPair()
    const fromText = new Function(
      'return (' + installFrameAgent.toString() + ')',
    )() as typeof installFrameAgent
    fromText(frame.contentWindow!, 'vectorcraft', '*', pair.agent)
    const api = await connectPageApi(frame, 2000, pair.host)
    expect(await api.commands()).toEqual([])
  })
})

describe('save, save as and print from inside the frame go to the host (G1, G2, G3)', () => {
  it('the web build asking the host (window event) reaches the host as a request', async () => {
    const frame = frameWithApp('photocraft', new FakePage())
    const api = await connect(frame, 2000)
    const asked: string[] = []
    api.onHostRequest?.((request) => asked.push(request))
    frame.contentWindow!.dispatchEvent(new Event('hanpan-host-save'))
    frame.contentWindow!.dispatchEvent(new Event('hanpan-host-saveAs'))
    frame.contentWindow!.dispatchEvent(new Event('hanpan-host-print'))
    await vi.waitFor(() => expect(asked).toEqual(['save', 'saveAs', 'print']))
  })

  it('Ctrl+S, Ctrl+Shift+S and Ctrl+P never reach the app: the host saves or prints', async () => {
    const frame = frameWithApp('vectorcraft', new FakePage())
    const api = await connect(frame, 2000)
    const asked: string[] = []
    api.onHostRequest?.((request) => asked.push(request))
    const doc = frame.contentDocument!
    const appSaw = vi.fn()
    doc.body.addEventListener('keydown', appSaw)
    const key = (init: KeyboardEventInit) =>
      doc.body.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      )
    key({ key: 's', code: 'KeyS', ctrlKey: true })
    key({ key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true })
    key({ key: 'p', code: 'KeyP', ctrlKey: true })
    key({ key: 'a', code: 'KeyA', ctrlKey: true })
    await vi.waitFor(() => expect(asked).toEqual(['save', 'saveAs', 'print']))
    expect(appSaw).toHaveBeenCalledTimes(1)
  })
})
