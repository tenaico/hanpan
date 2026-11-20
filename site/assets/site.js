/* global document, location */
// Shared by the Korean (/ko/), English (/en/) and Vietnamese (/vi/) pages; the bare address
// shows one of them by the visitor's country (site/vercel.json).

// the language the visitor picked last time, kept in this browser only (never sent):
// the bare address follows it; /ko/, /en/ and /vi/ always show their own language
const LANGS = ['ko', 'en', 'vi']
const pageLang = document.documentElement.lang
try {
  const picked = localStorage.getItem('hanpan-lang')
  if (location.pathname === '/' && LANGS.includes(picked) && picked !== pageLang) {
    location.replace('/' + picked + '/' + location.hash)
  }
} catch {
  // storage refused: the page stays as the server chose it
}
document.querySelectorAll('.lang-switch a[hreflang]').forEach((a) =>
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('hanpan-lang', a.hreflang)
    } catch {
      // nothing to remember then
    }
  }),
)

// the five newest updates; the rest open with one button (all show without script)
document.querySelectorAll('ol.news').forEach((list) => {
  const items = Array.from(list.children)
  if (items.length <= 5) return
  items.slice(5).forEach((li) => (li.hidden = true))
  const more = document.createElement('button')
  more.type = 'button'
  more.className = 'news-more'
  more.textContent = list.dataset.moreLabel || 'More'
  more.addEventListener('click', () => {
    items.forEach((li) => (li.hidden = false))
    more.remove()
  })
  list.after(more)
})

// the installer of the newest release, asked from GitHub; the release page stays the link if that fails
fetch('https://api.github.com/repos/tenaico/hanpan/releases/latest')
  .then((r) => (r.ok ? r.json() : null))
  .then((release) => {
    const asset =
      release &&
      release.assets &&
      release.assets.find((a) => /Setup-.*\.exe$/.test(a.name) && !/arm64/.test(a.name))
    if (!asset) return
    document
      .querySelectorAll('.download-link')
      .forEach((a) => (a.href = asset.browser_download_url))
    document.querySelectorAll('.file-name').forEach((s) => (s.textContent = asset.name))
    document.querySelectorAll('.version').forEach((s) => (s.textContent = release.tag_name))
    document.querySelectorAll('.mac-link').forEach((a) => {
      const dmg = release.assets.find((d) => d.name.endsWith('-' + a.dataset.arch + '.dmg'))
      if (dmg) a.href = dmg.browser_download_url
    })
  })
  .catch(() => {})

// daily counts of visits and download clicks (site/api/track.js); only on the real
// site, and not when the browser asks not to be tracked
const counting =
  ['hanpan.tenai.kr', 'hanpan-blond.vercel.app'].includes(location.hostname) &&
  navigator.doNotTrack !== '1'
const count = (data) => {
  if (counting) navigator.sendBeacon('/api/track', JSON.stringify(data))
}
count({ e: 'view', r: document.referrer })
document.addEventListener('click', (e) => {
  const a = e.target.closest('.download-link, .mac-link')
  if (!a) return
  const section = a.closest('section')
  count({
    e: 'download',
    p: a.classList.contains('mac-link') ? 'mac-' + a.dataset.arch : 'windows',
    place: section ? section.id || section.classList[0] : 'other',
  })
})
