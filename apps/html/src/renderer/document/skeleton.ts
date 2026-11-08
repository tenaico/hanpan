import { htmlLang, type Lang } from '@genoffice/i18n'

/**
 * A minimal, standards-mode document, for a blank one to start from.
 *
 * Each part earns its place: without the doctype the preview runs in quirks
 * mode, where box sizing and table layout follow different rules than the
 * author expects; without `lang` a screen reader has no language to read the
 * page in and the browser picks a font fallback and spell-checker for the wrong
 * one; without the charset a page of non-Latin text can decode as mojibake.
 *
 * A viewport meta is deliberately absent: this renders in a desktop pane with
 * no mobile viewport for it to affect.
 *
 * The document language follows the UI, so the skeleton a user inserts is the
 * one their tooling is already set up for.
 */
export function documentSkeleton(lang: Lang): string {
  return `<!DOCTYPE html>
<html lang="${htmlLang(lang)}">
  <head>
    <meta charset="UTF-8">
    <title></title>
  </head>
  <body></body>
</html>
`
}

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The skeleton with a heading and a paragraph in it: the empty-page hint's
 * "start with a heading and a paragraph". Unlike the bare skeleton it shows
 * something to click and edit, so the page is no longer blank.
 */
export function starterDocument(lang: Lang, heading: string, paragraph: string): string {
  return documentSkeleton(lang).replace(
    '<body></body>',
    `<body>\n    <h1>${escapeText(heading)}</h1>\n    <p>${escapeText(paragraph)}</p>\n  </body>`,
  )
}
