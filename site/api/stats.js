// The counts for the stats page, for the owner only: the request must carry the password
// set as STATS_PASSWORD in the Vercel project.
const crypto = require('node:crypto')
const { rpc, seoulDate } = require('./_store.js')

const DAY = 24 * 60 * 60 * 1000

function allowed(req) {
  const expected = process.env.STATS_PASSWORD || ''
  const given = String(req.headers.authorization || '').replace(/^Bearer /, '')
  if (!expected || given.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (!allowed(req)) {
    res.status(401).json({ error: 'wrong password' })
    return
  }
  const span = Math.min(Math.max(Number(req.query.days) || 30, 1), 365)
  const days = []
  for (let i = span - 1; i >= 0; i--) days.push(seoulDate(new Date(Date.now() - i * DAY)))

  let rows
  try {
    rows = (await rpc('hanpan_site_stats', { p_from: days[0], p_to: days[days.length - 1] })) || []
  } catch (err) {
    res.status(503).json({ error: err.message })
    return
  }

  // per day: the 'd' fields (view, visitors, dl:<platform>); over the span: the rest
  const perDay = new Map(days.map((day) => [day, {}]))
  const totals = { geo: {}, ref: {}, dlgeo: {}, dlplace: {} }
  for (const { day, kind, field, n } of rows) {
    const count = Number(n) || 0
    if (kind === 'd') {
      const d = perDay.get(day)
      if (d) d[field] = (d[field] || 0) + count
    } else if (totals[kind]) {
      totals[kind][field] = (totals[kind][field] || 0) + count
    }
  }
  const daily = days.map((day) => {
    const d = perDay.get(day)
    return {
      day,
      views: d.view || 0,
      visitors: d.visitors || 0,
      windows: d['dl:windows'] || 0,
      macArm64: d['dl:mac-arm64'] || 0,
      macX64: d['dl:mac-x64'] || 0,
    }
  })

  res.status(200).json({ days: span, daily, ...totals })
}
