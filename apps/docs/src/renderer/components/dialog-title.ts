/** A dialog's title is its menu label without the "opens a dialog" ellipsis */
export function dialogTitle(label: string): string {
  return label.replace(/\s*(…|\.\.\.)$/, '')
}
