// The tenai.kr Supabase project, reached from the server only with its secret key
// (SUPABASE_URL, SUPABASE_SECRET_KEY in the Vercel project). The tables and the two
// functions it calls are in site/supabase/hanpan-site-stats.sql.

function settings() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('no Supabase project is configured for this site')
  return { url: url.replace(/\/$/, ''), key }
}

// calls a database function through the REST interface and returns its JSON answer
async function rpc(name, args) {
  const { url, key } = settings()
  const headers = { apikey: key, 'Content-Type': 'application/json' }
  // a legacy service_role key is a JWT and also goes in Authorization; new sb_secret_ keys do not
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`Supabase answered ${res.status}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// the day in Korea, as 2026-11-03
function seoulDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
}

module.exports = { rpc, seoulDate }
