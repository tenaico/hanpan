/**
 * The pointer to the AI helper (Hanpan 0.19.5): the first few times an app
 * opens, its AI helper button (`[data-ai-helper]`) gets one light sweep and a
 * small bubble with an arrow beside it for five seconds. Pressing the button
 * ends it for good in that app. Nothing shows under automation, so tests and
 * screenshots see the app as it is.
 */

/** how many app openings show the pointer before it stops by itself */
export const AI_HINT_MAX_SHOWS = 3
const SHOW_MS = 5000
/** how long to wait for the button to appear (a document may still be loading) */
const WAIT_MS = 20000
const GAP = 10

const WORDS: Record<string, string> = {
  ko: '여기서 AI에게 부탁하세요',
  en: 'Ask the AI here',
  zh: '在这里请 AI 帮忙',
  'zh-TW': '在這裡請 AI 幫忙',
  ja: 'ここで AI に頼めます',
  vi: 'Nhờ AI ở đây',
  th: 'ขอให้ AI ช่วยได้ที่นี่',
  fr: 'Demandez à l’IA ici',
  de: 'Hier die KI fragen',
  es: 'Pide ayuda a la IA aquí',
  it: 'Chiedi all’IA qui',
  pt: 'Peça à IA aqui',
  nl: 'Vraag het hier aan de AI',
  pl: 'Poproś AI tutaj',
  cs: 'Zeptejte se AI zde',
  ru: 'Попросите ИИ здесь',
  ar: 'اطلب من الذكاء الاصطناعي هنا',
  he: 'בקשו מה-AI כאן',
  hi: 'यहाँ AI से कहें',
  id: 'Minta AI di sini',
  ms: 'Minta AI di sini',
}

/** the bubble's words in a UI language (`ko`, `zh-TW`, `pt-BR` → `pt`), English otherwise */
export function aiHintWords(lang: string | undefined): string {
  const code = (lang ?? '').trim()
  return WORDS[code] ?? WORDS[code.split('-')[0]!.toLowerCase()] ?? WORDS.en!
}

export interface AiHintState {
  shows: number
  done: boolean
}

export function readAiHintState(raw: string | null): AiHintState {
  try {
    const v = JSON.parse(raw ?? '') as Partial<AiHintState>
    const shows = Number.isInteger(v.shows) && (v.shows as number) > 0 ? (v.shows as number) : 0
    return { shows, done: v.done === true }
  } catch {
    return { shows: 0, done: false }
  }
}

export function wantsAiHint(state: AiHintState): boolean {
  return !state.done && state.shows < AI_HINT_MAX_SHOWS
}

export interface HintBox {
  left: number
  top: number
  /** where the bubble sits next to the button; its arrow points the other way */
  side: 'right' | 'left' | 'below' | 'above'
}

/**
 * Where the bubble goes: to the right of the button when it fits, else to the
 * left, below or above; always inside the window.
 */
export function placeAiHint(
  button: { left: number; top: number; right: number; bottom: number },
  bubble: { width: number; height: number },
  view: { width: number; height: number },
): HintBox {
  const midY = (button.top + button.bottom) / 2 - bubble.height / 2
  const midX = (button.left + button.right) / 2 - bubble.width / 2
  const clampX = (x: number) => Math.min(Math.max(4, x), Math.max(4, view.width - bubble.width - 4))
  const clampY = (y: number) =>
    Math.min(Math.max(4, y), Math.max(4, view.height - bubble.height - 4))
  if (button.right + GAP + bubble.width <= view.width - 4)
    return { left: button.right + GAP, top: clampY(midY), side: 'right' }
  if (button.left - GAP - bubble.width >= 4)
    return { left: button.left - GAP - bubble.width, top: clampY(midY), side: 'left' }
  if (button.bottom + GAP + bubble.height <= view.height - 4)
    return { left: clampX(midX), top: button.bottom + GAP, side: 'below' }
  return { left: clampX(midX), top: clampY(button.top - GAP - bubble.height), side: 'above' }
}

const STYLE_ID = 'go-ai-hint-style'
const STYLE = `
.go-ai-hint{position:fixed;z-index:2147483000;pointer-events:none;max-width:260px;padding:6px 10px;
border-radius:8px;background:#1d1d1b;color:#fff;font:500 12px/1.4 system-ui,"Malgun Gothic",sans-serif;
box-shadow:0 4px 14px rgb(0 0 0 / 18%);opacity:0;transition:opacity .35s ease,translate .35s ease}
.go-ai-hint.on{opacity:.94}
.go-ai-hint::before{content:"";position:absolute;border:6px solid transparent}
.go-ai-hint[data-side=right]{translate:6px 0}.go-ai-hint[data-side=left]{translate:-6px 0}
.go-ai-hint[data-side=below]{translate:0 6px}.go-ai-hint[data-side=above]{translate:0 -6px}
.go-ai-hint.on[data-side]{translate:0 0}
.go-ai-hint[data-side=right]::before{left:-12px;top:50%;margin-top:-6px;border-right-color:#1d1d1b}
.go-ai-hint[data-side=left]::before{right:-12px;top:50%;margin-top:-6px;border-left-color:#1d1d1b}
.go-ai-hint[data-side=below]::before{top:-12px;left:50%;margin-left:-6px;border-bottom-color:#1d1d1b}
.go-ai-hint[data-side=above]::before{bottom:-12px;left:50%;margin-left:-6px;border-top-color:#1d1d1b}
.go-ai-sweep{position:fixed;z-index:2147482999;pointer-events:none;overflow:hidden;border-radius:8px}
.go-ai-sweep::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:45%;
background:linear-gradient(100deg,transparent,rgb(255 255 255 / 55%),transparent);animation:go-ai-sweep 1.1s ease-out .2s 1 both}
@keyframes go-ai-sweep{to{left:120%}}
@media (prefers-reduced-motion:reduce){.go-ai-hint{transition:none}.go-ai-sweep{display:none}}
`

function visibleButton(doc: Document): HTMLElement | null {
  for (const el of doc.querySelectorAll<HTMLElement>('[data-ai-helper]')) {
    const box = el.getBoundingClientRect()
    if (box.width > 0 && box.height > 0) return el
  }
  return null
}

/** the helper is already open beside the document: nothing to point at */
function alreadyOpen(button: HTMLElement): boolean {
  return button.classList.contains('active') || button.getAttribute('aria-pressed') === 'true'
}

/**
 * Show the pointer for `app` once its AI helper button is on screen, if this
 * app has not shown it enough times yet. Returns a function that stops it.
 */
export function installAiHelperHint(app: string, doc: Document = document): () => void {
  const win = doc.defaultView
  if (!win || win.navigator.webdriver) return () => {}
  const key = `go.aiHelperHint.${app}`
  const read = (): AiHintState => {
    try {
      return readAiHintState(win.localStorage.getItem(key))
    } catch {
      return { shows: 0, done: false }
    }
  }
  const write = (state: AiHintState) => {
    try {
      win.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // no storage: the pointer simply shows again next time
    }
  }
  if (!wantsAiHint(read())) return () => {}

  let stopped = false
  const cleanups: Array<() => void> = []
  const stop = () => {
    if (stopped) return
    stopped = true
    for (const c of cleanups.splice(0)) c()
  }

  const show = (button: HTMLElement) => {
    const state = read()
    if (!wantsAiHint(state) || alreadyOpen(button)) return stop()
    write({ ...state, shows: state.shows + 1 })
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement('style')
      style.id = STYLE_ID
      style.textContent = STYLE
      doc.head.appendChild(style)
    }
    const box = button.getBoundingClientRect()
    const sweep = doc.createElement('div')
    sweep.className = 'go-ai-sweep'
    Object.assign(sweep.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    })
    const bubble = doc.createElement('div')
    bubble.className = 'go-ai-hint'
    bubble.setAttribute('role', 'status')
    bubble.textContent = aiHintWords(doc.documentElement.lang || win.navigator.language)
    doc.body.append(sweep, bubble)
    const place = placeAiHint(
      button.getBoundingClientRect(),
      { width: bubble.offsetWidth, height: bubble.offsetHeight },
      { width: win.innerWidth, height: win.innerHeight },
    )
    bubble.dataset.side = place.side
    bubble.style.left = `${place.left}px`
    bubble.style.top = `${place.top}px`
    win.requestAnimationFrame(() => bubble.classList.add('on'))
    const pressed = () => {
      write({ ...read(), done: true })
      stop()
    }
    button.addEventListener('click', pressed, { once: true })
    win.addEventListener('resize', stop, { once: true })
    const timer = win.setTimeout(stop, SHOW_MS)
    cleanups.push(() => {
      win.clearTimeout(timer)
      button.removeEventListener('click', pressed)
      win.removeEventListener('resize', stop)
      sweep.remove()
      bubble.remove()
    })
  }

  // the button may come later (a document loading, a panel collapsing)
  const now = visibleButton(doc)
  if (now) {
    show(now)
  } else {
    const observer = new win.MutationObserver(() => {
      const found = visibleButton(doc)
      if (!found) return
      observer.disconnect()
      win.clearTimeout(giveUp)
      show(found)
    })
    observer.observe(doc.body, { childList: true, subtree: true })
    const giveUp = win.setTimeout(stop, WAIT_MS)
    cleanups.push(() => {
      observer.disconnect()
      win.clearTimeout(giveUp)
    })
  }
  return stop
}
