/**
 * The Markdown outline as a file to read: the engine's outline of every sheet
 * (`sheetsToOutline`), except that a map of one sheet reads as a document. Its
 * central topic becomes the title and its topics the list, one level up, so
 * the file does not start with "# Sheet 1" and a list of one item.
 *
 * The AI and the other callers keep the engine's outline as it is.
 */
export function documentOutline(outline: string, sheetCount: number): string {
  if (sheetCount !== 1) return outline
  const lines = outline.split('\n')
  // "# <sheet>", "", "- <central topic>", then everything under it, two spaces in
  if (!lines[0]?.startsWith('#') || lines[1] !== '' || !lines[2]?.startsWith('-')) return outline
  const title = lines[2].slice(1).trim()
  const rest = lines.slice(3).map((line) => (line.startsWith('  ') ? line.slice(2) : line))
  return [title === '' ? '#' : `# ${title}`, '', ...rest].join('\n')
}
