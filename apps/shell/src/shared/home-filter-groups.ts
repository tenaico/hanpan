import { OPEN_EXTS } from '../../../graphics/src/shared/kinds'

/**
 * Hanpan's file tabs on Home (0.17 #12, a draft for the 11/10 review): six
 * tabs instead of one per format. Two of them stand for groups of formats; the
 * main side (recents, starred, file search) and Home's folder view share these
 * lists so a tab means the same files everywhere.
 */
export const HOME_FILTER_GROUPS: Record<'documents' | 'others', readonly string[]> = {
  // Word, HWP, Markdown/text, web documents and books
  documents: [
    'docx',
    'doc',
    'odt',
    'hwp',
    'hwpx',
    'md',
    'markdown',
    'txt',
    'json',
    'html',
    'htm',
    'epub',
  ],
  // mind maps and pictures (AI 포토, AI 일러스트)
  others: ['xmind', ...OPEN_EXTS.photo, ...OPEN_EXTS.illust],
}
