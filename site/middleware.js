// Picks the language of the bare address (https://hanpan.tenai.kr/) from the visitor's
// country, before the page is served: Vietnam gets the Vietnamese page, Korea the Korean
// page, everyone else the English page. /ko/, /en/ and /vi/ are never touched (the
// language switch links there), and nothing is stored: no cookie, nothing per person.
// The country is the one Vercel's edge sets on the request (x-vercel-ip-country).

export const config = { matcher: ['/', '/index.html'] }

/** The page language for a two-letter country code (any case); unknown means English. */
export function langForCountry(country) {
  const code = String(country || '').toUpperCase()
  if (code === 'KR') return 'ko'
  if (code === 'VN') return 'vi'
  return 'en'
}

export default function middleware(request) {
  const lang = langForCountry(request.headers.get('x-vercel-ip-country'))
  if (lang === 'ko') return new Response(null, { headers: { 'x-middleware-next': '1' } })
  const target = new URL(`/${lang}/`, request.url)
  return new Response(null, { headers: { 'x-middleware-rewrite': target.toString() } })
}
