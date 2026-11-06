import type {
  SecureKeyLockReason,
  SecureKeyUiState,
  SecureKeyWindowApi,
} from '../../shared/securekey-api'

// exposed by src/preload/securekey.ts
const api = (window as unknown as { hanpanSecureKey: SecureKeyWindowApi }).hanpanSecureKey

const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T
const title = el('title')
const message = el('message')
const registerBox = el('register')
const pick = el<HTMLButtonElement>('pick')
const keyName = el('key-name')
const whereLabel = el('where-label')
const places = el('places')
const noUsb = el('no-usb')
const pcBox = el('pc-box')
const warning = el('warning')
const consent = el<HTMLInputElement>('consent')
const consentText = el('consent-text')
const getKey = el<HTMLButtonElement>('get-key')
const privacy = el('privacy')
const error = el('error')
const quit = el<HTMLButtonElement>('quit')
const later = el<HTMLButtonElement>('later')
const toRegister = el<HTMLButtonElement>('to-register')
const retry = el<HTMLButtonElement>('retry')
const submit = el<HTMLButtonElement>('submit')

const LOCK_TEXT: Record<SecureKeyLockReason, string> = {
  'usb-missing': 'skLockUsbMissing',
  'other-device': 'skLockOtherDevice',
  revoked: 'skLockRevoked',
  stale: 'skLockStale',
  clock: 'skLockClock',
  damaged: 'skLockDamaged',
}
/** reasons a new registration can fix */
const REREGISTER: ReadonlySet<SecureKeyLockReason> = new Set(['revoked', 'damaged', 'other-device'])

let state: SecureKeyUiState | null = null
/** the lock screen was switched to the register screen by [Register a key] */
let wantsRegister = false
/** 'pc' or a drive letter */
let chosen: string | null = null

const show = (node: HTMLElement, visible: boolean) => node.classList.toggle('hidden', !visible)

function placeOption(value: string, text: string): HTMLLabelElement {
  const label = document.createElement('label')
  label.className = 'place'
  const input = document.createElement('input')
  input.type = 'radio'
  input.name = 'place'
  input.value = value
  input.checked = chosen === value
  input.disabled = state?.busy ?? false
  input.addEventListener('change', () => {
    chosen = value
    render()
  })
  const span = document.createElement('span')
  span.textContent = text
  label.append(input, span)
  return label
}

function render(): void {
  if (!state) return
  const s = state.strings
  document.documentElement.lang = state.lang
  document.documentElement.dir = ['ar', 'he'].includes(state.lang) ? 'rtl' : 'ltr'
  document.body.classList.toggle('cover', state.cover === true)

  if (state.cover) {
    title.textContent = s.skCoverTitle ?? ''
    document.title = title.textContent
    for (const node of [message, registerBox, error, quit, later, toRegister, retry, submit]) {
      show(node, false)
    }
    return
  }

  const registering = state.mode === 'register' || wantsRegister
  document.title = s.skTitle ?? ''
  title.textContent = registering ? (s.skTitle ?? '') : (s.skLockTitle ?? '')
  message.textContent = registering
    ? (s.skRegisterIntro ?? '')
    : state.reason
      ? (s[LOCK_TEXT[state.reason]] ?? '')
      : ''
  show(message, true)
  show(registerBox, registering)

  if (chosen !== null && chosen !== 'pc' && !state.usbLetters.includes(chosen)) chosen = null
  if (chosen === null && state.usbLetters.length > 0) chosen = state.usbLetters[0]!

  pick.textContent = s.skPickKey ?? ''
  pick.disabled = state.busy
  keyName.textContent = state.keyFileName ?? ''
  whereLabel.textContent = s.skWhere ?? ''
  places.replaceChildren(
    ...state.usbLetters.map((letter) =>
      placeOption(
        letter,
        `${(s.skUsbDrive ?? '').replace('{letter}', letter)} · ${s.skUsbRecommended ?? ''}`,
      ),
    ),
    placeOption('pc', s.skPc ?? ''),
  )
  noUsb.textContent = s.skNoUsb ?? ''
  show(noUsb, state.usbLetters.length === 0)
  show(pcBox, chosen === 'pc')
  warning.textContent = s.skPcWarning ?? ''
  consentText.textContent = s.skPcConsent ?? ''
  consent.disabled = state.busy
  getKey.textContent = s.skGetKey ?? ''
  privacy.textContent = s.skPrivacy ?? ''

  error.textContent = state.error ?? ''
  show(error, Boolean(state.error))

  quit.textContent = s.skQuit ?? ''
  quit.disabled = state.busy
  later.textContent = s.skLater ?? ''
  show(later, registering && state.optional)
  later.disabled = state.busy
  toRegister.textContent = s.skToRegister ?? ''
  show(toRegister, !registering && state.reason !== null && REREGISTER.has(state.reason))
  toRegister.disabled = state.busy
  retry.textContent = state.busy && !registering ? (s.skChecking ?? '') : (s.skRetry ?? '')
  show(retry, true)
  retry.disabled = state.busy
  submit.textContent = state.busy && registering ? (s.skRegistering ?? '') : (s.skRegister ?? '')
  show(submit, registering)
  submit.disabled =
    state.busy || !state.keyFileName || chosen === null || (chosen === 'pc' && !consent.checked)
}

pick.addEventListener('click', () => api.pickKeyFile())
consent.addEventListener('change', () => render())
getKey.addEventListener('click', () => api.openKeyPage())
quit.addEventListener('click', () => api.quit())
later.addEventListener('click', () => api.later())
retry.addEventListener('click', () => api.retry())
toRegister.addEventListener('click', () => {
  wantsRegister = true
  render()
})
submit.addEventListener('click', () => {
  if (!state || state.busy || chosen === null) return
  if (chosen === 'pc') api.register({ where: 'pc', consent: consent.checked })
  else api.register({ where: 'usb', letter: chosen })
})

api.onState((next) => {
  state = next
  render()
})
void api.getState().then((initial) => {
  if (!initial) return
  state = initial
  render()
})
