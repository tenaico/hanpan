/**
 * Blank presentation template — starting point for the start screen's
 * "AI generate / New blank" actions. A hand-written minimal set of valid OOXML
 * parts (16:9, single blank slide); once parsed by openPptx it goes through
 * exactly the same edit/save pipeline as opening a real file.
 */
import JSZip from 'jszip'

const XMLDECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'

const CONTENT_TYPES =
  XMLDECL +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
  '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
  '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
  '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
  '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
  '</Types>'

const ROOT_RELS =
  XMLDECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
  '</Relationships>'

const PRESENTATION =
  XMLDECL +
  `<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">` +
  '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
  '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>' +
  '<p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>' +
  '</p:presentation>'

const PRESENTATION_RELS =
  XMLDECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
  '</Relationships>'

const EMPTY_SPTREE =
  '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
  '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>'

/** Minimal blank slide XML (empty spTree); insertBlankSlide also uses it as new slide content. */
export const BLANK_SLIDE_XML =
  XMLDECL +
  `<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">` +
  `<p:cSld>${EMPTY_SPTREE}</p:cSld>` +
  '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'

const SLIDE1_RELS =
  XMLDECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
  '</Relationships>'

const LAYOUT1 =
  XMLDECL +
  `<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank">` +
  `<p:cSld name="Blank">${EMPTY_SPTREE}</p:cSld>` +
  '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'

const LAYOUT1_RELS =
  XMLDECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
  '</Relationships>'

const MASTER1 =
  XMLDECL +
  `<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">` +
  `<p:cSld>${EMPTY_SPTREE}</p:cSld>` +
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
  '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
  '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>' +
  '</p:sldMaster>'

// Title-slide decks get PowerPoint's master text styles (title 44pt in the major
// theme font, body 24pt in the minor one), so typed titles look like titles
const TITLE_TX_STYLES =
  '<p:txStyles>' +
  '<p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill>' +
  '<a:latin typeface="+mj-lt"/><a:ea typeface="+mj-ea"/><a:cs typeface="+mj-cs"/></a:defRPr></a:lvl1pPr></p:titleStyle>' +
  '<p:bodyStyle><a:lvl1pPr marL="0" indent="0"><a:buNone/><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill>' +
  '<a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:bodyStyle>' +
  '<p:otherStyle/></p:txStyles>'

const MASTER1_TITLE = MASTER1.replace(
  '</p:sldLayoutIdLst>',
  '<p:sldLayoutId id="2147483650" r:id="rId3"/></p:sldLayoutIdLst>',
).replace('<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>', TITLE_TX_STYLES)

const MASTER1_RELS =
  XMLDECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
  '</Relationships>'

const MASTER1_RELS_TITLE = MASTER1_RELS.replace(
  '</Relationships>',
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/></Relationships>',
)

const fillStyles =
  '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>'
const lnStyles =
  '<a:lnStyleLst>' +
  ['6350', '12700', '19050']
    .map((w) => `<a:ln w="${w}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>`)
    .join('') +
  '</a:lnStyleLst>'
const effectStyles =
  '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>' +
  '<a:effectStyle><a:effectLst/></a:effectStyle>' +
  '<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
const bgFillStyles =
  '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>'

const themeXml = (majorLatin: string, minorLatin: string): string =>
  XMLDECL +
  `<a:theme xmlns:a="${NS_A}" name="Office">` +
  '<a:themeElements>' +
  '<a:clrScheme name="Office">' +
  '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
  '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
  '<a:dk2><a:srgbClr val="44546A"/></a:dk2>' +
  '<a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
  '<a:accent1><a:srgbClr val="C43E1C"/></a:accent1>' +
  '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
  '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>' +
  '<a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
  '<a:accent5><a:srgbClr val="4472C4"/></a:accent5>' +
  '<a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
  '<a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
  '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>' +
  '</a:clrScheme>' +
  '<a:fontScheme name="Office">' +
  // Empty <a:ea/> + per-script entries — the convention the theme reader itself documents
  // (theme.ts resolveFontRef): a pinned family is unresolvable off Windows and unreachable
  // for the life of the file, while these are the per-script faces PowerPoint's own blank
  // Office theme ships, with renderer display stacks and metrics aliases for each.
  `<a:majorFont><a:latin typeface="${majorLatin}"/>` +
  '<a:ea typeface=""/><a:cs typeface=""/>' +
  '<a:font script="Jpan" typeface="ＭＳ ゴシック"/><a:font script="Hang" typeface="맑은 고딕"/><a:font script="Hans" typeface="等线"/><a:font script="Hant" typeface="新細明體"/>' +
  '</a:majorFont>' +
  `<a:minorFont><a:latin typeface="${minorLatin}"/>` +
  '<a:ea typeface=""/><a:cs typeface=""/>' +
  '<a:font script="Jpan" typeface="ＭＳ Ｐゴシック"/><a:font script="Hang" typeface="맑은 고딕"/><a:font script="Hans" typeface="等线"/><a:font script="Hant" typeface="新細明體"/>' +
  '</a:minorFont>' +
  '</a:fontScheme>' +
  `<a:fmtScheme name="Office">${fillStyles}${lnStyles}${effectStyles}${bgFillStyles}</a:fmtScheme>` +
  '</a:themeElements></a:theme>'

/**
 * Theme Latin faces of a new deck per UI language (Hanpan 0.17), in step with new
 * workbooks (xlsx-gateway new-workbook-lang) and new documents (docx blank latinFont):
 * Korean gets 맑은 고딕, Vietnamese Arial (Malgun Gothic lacks most Vietnamese
 * letters), every other language PowerPoint's Office theme (Calibri Light / Calibri).
 */
export function blankPptxThemeFontsFor(lang?: string): { major: string; minor: string } {
  if (lang === 'ko') return { major: '맑은 고딕', minor: '맑은 고딕' }
  if (lang === 'vi') return { major: 'Arial', minor: 'Arial' }
  return { major: 'Calibri Light', minor: 'Calibri' }
}

// "Title Slide" layout: centered title + subtitle placeholders (PowerPoint's 16:9 geometry)
const TITLE_XFRM =
  '<a:xfrm><a:off x="1524000" y="1122363"/><a:ext cx="9144000" cy="2387600"/></a:xfrm>'
const SUBTITLE_XFRM =
  '<a:xfrm><a:off x="1524000" y="3602038"/><a:ext cx="9144000" cy="1655762"/></a:xfrm>'
const TITLE_LST =
  '<a:lstStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="6000"><a:latin typeface="+mj-lt"/><a:ea typeface="+mj-ea"/></a:defRPr></a:lvl1pPr></a:lstStyle>'
const SUBTITLE_LST =
  '<a:lstStyle><a:lvl1pPr marL="0" indent="0" algn="ctr"><a:buNone/><a:defRPr sz="2400"/></a:lvl1pPr></a:lstStyle>'
// The paragraph mark carries lang like PowerPoint's own (an attribute-less
// <a:endParaRPr/> is dropped by the parser, and typing into the empty title
// would then start from the editor's fallback face instead of the title style)
const titleSp = (
  id: number,
  ph: 'ctrTitle' | 'subTitle',
  withGeometry: boolean,
  endLang = 'en-US',
): string => {
  const isTitle = ph === 'ctrTitle'
  const name = isTitle ? 'Title 1' : 'Subtitle 2'
  const xfrm = withGeometry ? (isTitle ? TITLE_XFRM : SUBTITLE_XFRM) : ''
  const idx = isTitle ? '' : ' idx="1"'
  const anchor = isTitle ? ' anchor="b"' : ''
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="${ph}"${idx}/></p:nvPr></p:nvSpPr>` +
    `<p:spPr>${xfrm}</p:spPr>` +
    `<p:txBody><a:bodyPr${withGeometry ? anchor : ''}/>${withGeometry ? (isTitle ? TITLE_LST : SUBTITLE_LST) : '<a:lstStyle/>'}<a:p><a:endParaRPr lang="${endLang}"/></a:p></p:txBody></p:sp>`
  )
}
const spTreeWith = (shapes: string): string =>
  EMPTY_SPTREE.replace('</p:spTree>', `${shapes}</p:spTree>`)

const LAYOUT_TITLE =
  XMLDECL +
  `<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="title" preserve="1">` +
  `<p:cSld name="Title Slide">${spTreeWith(titleSp(2, 'ctrTitle', true) + titleSp(3, 'subTitle', true))}</p:cSld>` +
  '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'

const titleSlideXml = (endLang: string): string =>
  XMLDECL +
  `<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">` +
  `<p:cSld>${spTreeWith(titleSp(2, 'ctrTitle', false, endLang) + titleSp(3, 'subTitle', false, endLang))}</p:cSld>` +
  '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'

const LANG_TAG: Readonly<Record<string, string>> = {
  ko: 'ko-KR',
  vi: 'vi-VN',
  ja: 'ja-JP',
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
}

export interface BlankPptxOptions {
  /** UI language: picks the theme's Latin faces (blankPptxThemeFontsFor) */
  lang?: string
  /**
   * First slide is a "Title Slide" with empty title/subtitle placeholders, so a new
   * deck opens with "click to add title" instead of a white page. Off by default:
   * pipelines and converters build on the empty first slide.
   */
  titleSlide?: boolean
}

/** Generate blank presentation bytes (16:9, one blank slide). */
export async function createBlankPptx(options?: BlankPptxOptions): Promise<Uint8Array> {
  const fonts = blankPptxThemeFontsFor(options?.lang)
  const titleSlide = options?.titleSlide === true
  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES)
  zip.file('_rels/.rels', ROOT_RELS)
  zip.file('ppt/presentation.xml', PRESENTATION)
  zip.file('ppt/_rels/presentation.xml.rels', PRESENTATION_RELS)
  zip.file(
    'ppt/slides/slide1.xml',
    titleSlide ? titleSlideXml(LANG_TAG[options?.lang ?? ''] ?? 'en-US') : BLANK_SLIDE_XML,
  )
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    titleSlide ? SLIDE1_RELS.replace('slideLayout1.xml', 'slideLayout2.xml') : SLIDE1_RELS,
  )
  zip.file('ppt/slideLayouts/slideLayout1.xml', LAYOUT1)
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', LAYOUT1_RELS)
  if (titleSlide) {
    zip.file('ppt/slideLayouts/slideLayout2.xml', LAYOUT_TITLE)
    zip.file('ppt/slideLayouts/_rels/slideLayout2.xml.rels', LAYOUT1_RELS)
    zip.file(
      '[Content_Types].xml',
      CONTENT_TYPES.replace(
        '<Override PartName="/ppt/slides/slide1.xml"',
        '<Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
          '<Override PartName="/ppt/slides/slide1.xml"',
      ),
    )
  }
  zip.file('ppt/slideMasters/slideMaster1.xml', titleSlide ? MASTER1_TITLE : MASTER1)
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    titleSlide ? MASTER1_RELS_TITLE : MASTER1_RELS,
  )
  zip.file('ppt/theme/theme1.xml', themeXml(fonts.major, fonts.minor))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
