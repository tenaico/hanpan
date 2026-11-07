import { loadDocxZip } from './zip-load'
import { parseStyles } from './parse-styles'
import {
  mergeDefaultFontsXml,
  upsertStyleXml,
  type DefaultFonts,
  type StyleUpsert,
} from './style-upsert'
import type { ParsedDoc, ThemeColors, ThemeFonts } from './types'

/** Resolve live style inheritance without reparsing the document body or its media. */
export async function previewFontSettings(
  parsed: ParsedDoc,
  upserts: StyleUpsert[],
  defaults?: DefaultFonts,
  /** a theme picked in this session (Design > Themes / Fonts / Colors): styles that
   *  reference theme slots resolve against it instead of the file's own theme */
  theme?: { fonts?: ThemeFonts | null; colors?: ThemeColors | null },
) {
  const zip = await loadDocxZip(parsed.internal.originalBytes)
  let xml =
    (await zip.file('word/styles.xml')?.async('string')) ??
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:styles>'
  for (const up of upserts) xml = upsertStyleXml(xml, up)
  if (defaults) xml = mergeDefaultFontsXml(xml, defaults)
  zip.file('word/styles.xml', xml)
  return parseStyles(zip, theme?.colors ?? parsed.themeColors, theme?.fonts ?? parsed.themeFonts)
}
