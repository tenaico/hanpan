/**
 * html2docx options for the editor's Word (and ODT) export. A web page has no
 * print margins of its own, so the page gets Word's default 2.54 cm (96 CSS
 * px) unless the page set wider ones; a fixed-layout page keeps its geometry.
 */
export const HTML_WORD_EXPORT_OPTIONS = { minPageMarginPx: 96 } as const
