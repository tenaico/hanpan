// Counts one page visit or one download click. Keeps only daily totals in the tenai.kr
// Supabase project: no IP address, no cookie, nothing per person.
const crypto = require('node:crypto')
const { rpc, seoulDate } = require('./_store.js')

const PLATFORMS = new Set(['windows', 'mac-arm64', 'mac-x64'])
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i

function readBody(req) {
  const body = req.body
  if (body && typeof body === 'object') return body
  try {
    return JSON.parse(typeof body === 'string' ? body : '')
  } catch {
    return {}
  }
}

// only the host of the page the visitor came from, never the full address
function referrerHost(value) {
  try {
    const host = new URL(String(value)).hostname.replace(/^www\./, '')
    return host.slice(0, 80)
  } catch {
    return ''
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const ua = String(req.headers['user-agent'] || '')
  const body = readBody(req)
  if (BOTS.test(ua) || (body.e !== 'view' && body.e !== 'download')) {
    res.status(204).end()
    return
  }

  const day = seoulDate(new Date())
  const country = String(req.headers['x-vercel-ip-country'] || '??').slice(0, 2)
  let city = ''
  try {
    city = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')).slice(0, 60)
  } catch {}
  const place = city ? `${country}|${city}` : country
  const counts = []
  let visitor = null

  if (body.e === 'view') {
    // a daily, one-way fingerprint only counts unique visitors; the secret salt keeps it
    // from being matched to an IP, and the database deletes it after a day
    const ip = String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
    const salt = process.env.STATS_SALT || ''
    visitor = crypto
      .createHash('sha256')
      .update(`${salt}|${day}|${ip}|${ua}`)
      .digest('hex')
      .slice(0, 32)
    counts.push({ kind: 'd', field: 'view' })
    counts.push({ kind: 'geo', field: place })
    const ref = referrerHost(body.r)
    if (ref && ref !== String(req.headers.host || '')) counts.push({ kind: 'ref', field: ref })
  } else {
    const platform = PLATFORMS.has(body.p) ? body.p : 'windows'
    counts.push({ kind: 'd', field: `dl:${platform}` })
    counts.push({ kind: 'dlgeo', field: place })
    const spot = String(body.place || 'other')
      .replace(/[^a-z-]/g, '')
      .slice(0, 20)
    counts.push({ kind: 'dlplace', field: spot || 'other' })
  }

  try {
    await rpc('hanpan_site_track', { p_day: day, p_counts: counts, p_visitor: visitor })
  } catch (err) {
    console.error('track failed:', err.message)
  }
  res.status(204).end()
}
