import type {
  SecureKeyLockReason,
  SecureKeyUiState,
  SecureKeyWindowApi,
} from '../../shared/securekey-api'

/**
 * The first-run window (spec 2026-11-12 5-3, 5-4): the terms, then making the
 * key on a stick or this PC, or waiting for the key's stick with a way to make
 * a new key. The same page is the lock cover over the other windows.
 */

// exposed by src/preload/securekey.ts
const api = (window as unknown as { hanpanSecureKey: SecureKeyWindowApi }).hanpanSecureKey

const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T
const title = el('title')
const message = el('message')
const termsStep = el('terms-step')
const termsList = el('terms-list')
const termsFull = el<HTMLButtonElement>('terms-full')
const termsAgree = el<HTMLInputElement>('terms-agree')
const termsAgreeText = el('terms-agree-text')
const chooseStep = el('choose-step')
const chooseUsb = el('choose-usb')
const choosePc = el('choose-pc')
const usbStep = el('usb-step')
const usbList = el('usb-list')
const noUsb = el('no-usb')
const spareHint = el('spare-hint')
const pcStep = el('pc-step')
const warning = el('warning')
const pcAgree = el<HTMLInputElement>('pc-agree')
const pcAgreeText = el('pc-agree-text')
const lockStep = el('lock-step')
const reason = el('reason')
const lost = el('lost')
const lostText = el('lost-text')
const lostLink = el<HTMLButtonElement>('lost-link')
const resetStep = el('reset-step')
const resetList = el('reset-list')
const resetAgree = el<HTMLInputElement>('reset-agree')
const resetAgreeText = el('reset-agree-text')
const error = el('error')
const quit = el<HTMLButtonElement>('quit')
const back = el<HTMLButtonElement>('back')
const retry = el<HTMLButtonElement>('retry')
const submit = el<HTMLButtonElement>('submit')

const REASON_TEXT: Record<SecureKeyLockReason, string | null> = {
  'usb-missing': null,
  'unregistered-usb': 'skUnregisteredUsb',
  replaced: 'skReplaced',
  damaged: 'skDamaged',
}

let state: SecureKeyUiState | null = null
/** the step inside create mode, and inside lock mode */
let createStep: 'choose' | 'usb' | 'pc' = 'choose'
let lockConfirm = false
let place: 'usb' | 'pc' = 'usb'
let letter: string | null = null

const show = (node: HTMLElement, visible: boolean) => node.classList.toggle('hidden', !visible)
const s = (key: string) => state?.strings[key] ?? ''

function fillList(list: HTMLElement, keys: string[]): void {
  list.replaceChildren(
    ...keys.map((key) => {
      const li = document.createElement('li')
      li.textContent = s(key)
      return li
    }),
  )
}

function usbOption(value: string): HTMLLabelElement {
  const label = document.createElement('label')
  label.className = 'place'
  const input = document.createElement('input')
  input.type = 'radio'
  input.name = 'usb'
  input.value = value
  input.checked = letter === value
  input.disabled = state?.busy ?? false
  input.addEventListener('change', () => {
    letter = value
    render()
  })
  const span = document.createElement('span')
  span.textContent = s('skUsbDrive').replace('{letter}', value)
  label.append(input, span)
  return label
}

function setChoice(next: 'usb' | 'pc'): void {
  place = next
  render()
}

function render(): void {
  if (!state) return
  document.documentElement.lang = state.lang
  document.body.classList.toggle('cover', state.cover === true)
  const busy = state.busy
  for (const node of [termsStep, chooseStep, usbStep, pcStep, lockStep, resetStep, back, retry]) {
    show(node, false)
  }
  show(submit, false)
  show(quit, state.cover !== true)
  quit.textContent = s('skQuit')
  quit.disabled = busy
  error.textContent = state.error ?? ''

  if (state.cover) {
    title.textContent = s('skCoverTitle')
    message.textContent = ''
    return
  }

  if (state.mode === 'terms') {
    title.textContent = s('skTermsTitle')
    message.textContent = s('skTermsLead')
    show(termsStep, true)
    fillList(termsList, ['skTerms1', 'skTerms2', 'skTerms3', 'skTerms4'])
    termsFull.textContent = s('skTermsFull')
    termsAgreeText.textContent = s('skTermsAgree')
    termsAgree.disabled = busy
    show(submit, true)
    submit.textContent = s('skTermsContinue')
    submit.disabled = busy || !termsAgree.checked
    return
  }

  if (state.mode === 'create') {
    if (createStep === 'choose') {
      title.textContent = s('skCreateTitle')
      message.textContent = s('skCreateLead')
      show(chooseStep, true)
      el('usb-name').textContent = s('skCreateUsb')
      el('usb-badge').textContent = s('skRecommended')
      el('usb-sub').textContent = s('skCreateUsbSub')
      el('pc-name').textContent = s('skCreatePc')
      el('pc-sub').textContent = s('skCreatePcSub')
      chooseUsb.setAttribute('aria-checked', String(place === 'usb'))
      choosePc.setAttribute('aria-checked', String(place === 'pc'))
      el('note-sub').textContent = `※ ${s('skNoteSubscription')}`
      el('note-lock').textContent = `※ ${s('skNoteWindowsLock')}`
      show(submit, true)
      submit.textContent = s('skNext')
      submit.disabled = busy
      return
    }
    show(back, true)
    back.disabled = busy
    if (createStep === 'usb') {
      title.textContent = s('skUsbPickTitle')
      message.textContent = s('skUsbPickLead')
      show(usbStep, true)
      if (letter && !state.usbLetters.includes(letter)) letter = null
      if (!letter && state.usbLetters.length > 0) letter = state.usbLetters[0]!
      usbList.replaceChildren(...state.usbLetters.map(usbOption))
      show(noUsb, state.usbLetters.length === 0)
      noUsb.textContent = s('skNoUsb')
      spareHint.textContent = s('skUsbSpareHint')
      back.textContent = s('skBack')
      // a stick plugged in next to the listed ones shows after a look again
      show(retry, true)
      retry.textContent = busy ? s('skChecking') : s('skRetry')
      retry.disabled = busy
      show(submit, true)
      submit.textContent = busy ? s('skCreating') : s('skCreateKey')
      submit.disabled = busy || letter === null
      return
    }
    title.textContent = s('skPcTitle')
    message.textContent = ''
    show(pcStep, true)
    warning.textContent = s('skPcWarn')
    pcAgreeText.textContent = s('skPcAgree')
    pcAgree.disabled = busy
    back.textContent = s('skUseUsb')
    show(submit, true)
    submit.textContent = busy ? s('skCreating') : s('skPcCreate')
    submit.disabled = busy || !pcAgree.checked
    return
  }

  // lock: wait for the key's stick, or confirm a new key
  if (lockConfirm && state.canRegister !== false) {
    title.textContent = s('skResetTitle')
    message.textContent = ''
    show(resetStep, true)
    fillList(resetList, ['skReset1', 'skReset2', 'skReset3', 'skReset4'])
    resetAgreeText.textContent = s('skResetAgree')
    resetAgree.disabled = busy
    show(back, true)
    back.textContent = s('skCancel')
    back.disabled = busy
    show(submit, true)
    submit.textContent = s('skResetGo')
    submit.disabled = busy || !resetAgree.checked
    return
  }
  title.textContent = s('skWaitTitle')
  message.textContent = s('skWaitLead')
  show(lockStep, true)
  const why = state.reason ? REASON_TEXT[state.reason] : null
  reason.textContent = why ? s(why) : ''
  // the covers cannot make a key: they say where to do it instead
  show(lost, true)
  const canRegister = state.canRegister !== false
  lostText.textContent = canRegister ? s('skLostLink') : s('skCoverNewKeyHint')
  show(lostLink, canRegister)
  lostLink.textContent = s('skNewKey')
  lostLink.disabled = busy
  show(retry, true)
  retry.textContent = busy ? s('skChecking') : s('skRetry')
  retry.disabled = busy
}

for (const box of [termsAgree, pcAgree, resetAgree]) box.addEventListener('change', render)
chooseUsb.addEventListener('click', () => setChoice('usb'))
choosePc.addEventListener('click', () => setChoice('pc'))
for (const [node, value] of [
  [chooseUsb, 'usb'],
  [choosePc, 'pc'],
] as const) {
  node.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') setChoice(value)
  })
}
termsFull.addEventListener('click', () => api.openLicense())
lostLink.addEventListener('click', () => {
  lockConfirm = true
  resetAgree.checked = false
  render()
})
quit.addEventListener('click', () => api.quit())
retry.addEventListener('click', () => api.retry())
back.addEventListener('click', () => {
  if (state?.mode === 'lock') lockConfirm = false
  else createStep = 'choose'
  render()
})
submit.addEventListener('click', () => {
  if (!state || state.busy) return
  if (state.mode === 'terms') {
    if (termsAgree.checked) api.acceptTerms()
    return
  }
  if (state.mode === 'lock') {
    if (lockConfirm && resetAgree.checked) {
      lockConfirm = false
      createStep = 'choose'
      api.reset()
    }
    return
  }
  if (createStep === 'choose') {
    createStep = place
    pcAgree.checked = false
    render()
    return
  }
  if (createStep === 'usb' && letter) api.create({ where: 'usb', letter })
  if (createStep === 'pc' && pcAgree.checked) api.create({ where: 'pc', consent: true })
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
