/**
 * The apps Home can start (spec 7.4): their groups in "모든 앱", their keys
 * (the `data-new` keys of Home's tiles) and the apps pinned to the new card on
 * a fresh board.
 */

export const APP_GROUPS = [
  { id: 'docs', keys: ['xmind', 'hwp', 'pptx', 'docx', 'xlsx', 'md', 'html', 'templates'] },
  { id: 'pdf', keys: ['pdf', 'pdf-tools', 'md-convert'] },
  { id: 'graphics', keys: ['photo', 'illust', 'design'] },
  { id: 'file', keys: ['open'] },
] as const

export type AppGroupId = (typeof APP_GROUPS)[number]['id']
export type AppKey = (typeof APP_GROUPS)[number]['keys'][number]

/** every app key, in the order of the groups */
export const APP_KEYS: readonly AppKey[] = APP_GROUPS.flatMap((group) => group.keys)

export function isAppKey(value: unknown): value is AppKey {
  return typeof value === 'string' && (APP_KEYS as readonly string[]).includes(value)
}

/** the pins with the Korean document features on */
export const DEFAULT_PINS_KOREAN: readonly AppKey[] = [
  'xmind',
  'hwp',
  'pptx',
  'docx',
  'xlsx',
  'pdf',
  'templates',
  'photo',
  'illust',
  'design',
  'html',
]

/** the pins with the Korean document features off */
export const DEFAULT_PINS_OTHER: readonly AppKey[] = [
  'xmind',
  'pptx',
  'docx',
  'xlsx',
  'pdf',
  'photo',
  'illust',
  'html',
  'md',
  'pdf-tools',
  'md-convert',
]

export function defaultPins(koreanDocs: boolean): AppKey[] {
  return [...(koreanDocs ? DEFAULT_PINS_KOREAN : DEFAULT_PINS_OTHER)]
}
