/**
 * Revision (w:ins / w:del) dates are stored as ISO strings, usually in UTC.
 * Tooltips show the reader's own calendar day: slicing the UTC string would
 * show the previous day for edits made before 09:00 in Korea.
 */
export function revisionDateLabel(date: unknown): string {
  if (typeof date !== 'string' || !date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}
