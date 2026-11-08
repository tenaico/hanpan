/**
 * The design board's starting templates. Each is built on a few rules so they
 * read as designed rather than filled in: a margin of about 8% of the width, one
 * strong type contrast (a display face or heavy title over a quiet body), one
 * main colour and one accent with neutrals, and icons (icons.ts) in place of
 * bullet marks. Fonts are the ones Hanpan ships (fonts.ts), so a template looks
 * the same on every PC. Full-page frames and backdrops are locked so a click on
 * the page still reaches what sits on it.
 */
import { applyFill, estimateLines, type FillSlot } from './ai'
import { TEMPLATE_WORDS } from './template-words'
import {
  FORMATS,
  iconElement,
  newId,
  qrElement,
  shapeElement,
  textElement,
  type DesignDoc,
  type DesignElement,
} from './model'

export interface DesignTemplate {
  id: string
  name: string
  format: string
  make(): DesignDoc
}

type El = DesignElement
type Opts = Partial<El>

const F = {
  sans: 'Pretendard',
  serif: 'Noto Serif KR',
  batang: 'Gowun Batang',
  dodum: 'Gowun Dodum',
  black: 'Black Han Sans',
  dohyeon: 'Do Hyeon',
  bebas: 'Bebas Neue',
  archivo: 'Archivo Black',
  grotesk: 'Space Grotesk',
  playfair: 'Playfair Display',
} as const

function docOf(
  formatId: string,
  name: string,
  background: string | [string, string, number],
  elements: El[],
): DesignDoc {
  const f = FORMATS.find((x) => x.id === formatId)!
  const [bg, bg2, angle] = typeof background === 'string' ? [background] : background
  return {
    version: 1,
    name,
    width: f.width,
    height: f.height,
    pages: [
      {
        id: newId('p'),
        background: bg,
        ...(bg2 ? { background2: bg2, gradientAngle: angle } : {}),
        elements,
      },
    ],
  }
}

/** A text box as tall as its lines. */
function txt(text: string, x: number, y: number, w: number, size: number, o: Opts = {}): El {
  const lineHeight = o.lineHeight ?? 1.4
  const lines = estimateLines(text, size, w, o.fontWeight ?? 400)
  return textElement({
    x,
    y,
    w,
    h: Math.ceil(lines * size * lineHeight),
    text,
    fontSize: size,
    lineHeight,
    fontFamily: F.sans,
    ...o,
  })
}

/** Text centred across [x, x + w). */
const mid = (text: string, x: number, y: number, w: number, size: number, o: Opts = {}): El =>
  txt(text, x, y, w, size, { align: 'center', ...o })

/** Rough width of a line in ems (Hangul square, Latin narrower). */
function em(text: string): number {
  let n = 0
  for (const ch of text) {
    if (/[가-힣]/.test(ch)) n += 1
    else if (ch === ' ') n += 0.3
    else if (/[0-9]/.test(ch)) n += 0.6
    else if (/[A-Z]/.test(ch)) n += 0.7
    else if (/[a-z]/.test(ch)) n += 0.56
    else if (/[.,:·]/.test(ch)) n += 0.34
    else n += 0.62
  }
  return n
}

/** A short label on a rounded colour box sized to it. */
function pill(
  text: string,
  x: number,
  y: number,
  size: number,
  bg: string,
  color: string,
  o: Opts = {},
): El {
  const spacing = o.letterSpacing ?? 0
  const w = Math.ceil(em(text) * size * 1.05 + spacing * [...text].length + size * 1.3)
  const h = Math.ceil(size * 1.3 + size * 0.5)
  return textElement({
    x,
    y,
    w,
    h,
    text,
    fontSize: size,
    lineHeight: 1.3,
    fontWeight: 700,
    fontFamily: F.sans,
    color,
    align: 'center',
    highlight: bg,
    radius: Math.round(h / 2),
    ...o,
  })
}

const rect = (x: number, y: number, w: number, h: number, fill: string, o: Opts = {}): El =>
  shapeElement('rect', { x, y, w, h, fill, radius: 0, ...o })
const disc = (x: number, y: number, d: number, fill: string, o: Opts = {}): El =>
  shapeElement('ellipse', { x, y, w: d, h: d, fill, ...o })
const rule = (x: number, y: number, w: number, stroke: string, width = 2, o: Opts = {}): El =>
  shapeElement('line', { x, y, w, h: 0, stroke, strokeWidth: width, ...o })
const icon = (name: string, x: number, y: number, s: number, stroke: string, o: Opts = {}): El =>
  iconElement(name, { x, y, w: s, h: s, stroke, ...o })
/** A frame line around a box, nothing inside. */
const frame = (
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  width: number,
  o: Opts = {},
): El =>
  shapeElement('rect', {
    x,
    y,
    w,
    h,
    fill: 'transparent',
    stroke,
    strokeWidth: width,
    radius: 0,
    locked: true,
    ...o,
  })

/** The elements share a group: a click picks them all and a drag moves them together. */
function grouped(...els: El[]): El[] {
  const group = newId('g')
  return els.map((e) => ({ ...e, group }))
}

/** An icon and one line of text after it. */
function iconLine(
  name: string,
  text: string,
  x: number,
  y: number,
  w: number,
  size: number,
  iconColor: string,
  o: Opts = {},
): El[] {
  const s = Math.round(size * 1.2)
  return grouped(
    icon(name, x, y + Math.round((size * 1.4 - s) / 2), s, iconColor),
    txt(text, x + s + Math.round(size * 0.5), y, w - s - Math.round(size * 0.5), size, o),
  )
}

export const DESIGN_TEMPLATES: readonly DesignTemplate[] = [
  {
    id: 'public-notice',
    name: '공공기관 안내문',
    format: 'a4',
    make: () => {
      const ink = '#14213D'
      const blue = '#2350C8'
      const grey = '#5B6577'
      const row = (i: number, label: string, value: string): El[] => {
        const y = 1112 + i * 96
        return grouped(
          rule(96, y, 1048, '#CDD2DA', 2),
          txt(label, 96, y + 30, 200, 28, { color: blue, fontWeight: 700 }),
          txt(value, 300, y + 26, 844, 34, { color: ink }),
        )
      }
      return docOf('a4', '공공기관 안내문', '#F5F6F3', [
        rect(0, 0, 1240, 16, blue, { locked: true }),
        txt('○○구청 알림', 96, 84, 600, 28, { color: blue, fontWeight: 700 }),
        txt('제2026-047호', 644, 84, 500, 28, { color: grey, align: 'right' }),
        rule(96, 142, 1048, ink, 3),
        txt('주민 설명회\n안내', 96, 196, 1048, 132, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.1,
          letterSpacing: -4,
        }),
        txt('2026 하반기 ○○동 생활권 계획을 주민 여러분과 함께 정합니다.', 96, 516, 1048, 36, {
          color: '#3A4558',
        }),
        txt('11.20', 80, 590, 860, 470, {
          fontFamily: F.bebas,
          color: blue,
          lineHeight: 0.95,
          letterSpacing: -6,
        }),
        ...grouped(
          txt('금요일', 940, 700, 204, 52, { fontWeight: 900, color: ink }),
          txt('오후 2시부터\n4시까지', 940, 784, 204, 34, {
            color: ink,
            fontWeight: 700,
            lineHeight: 1.45,
          }),
        ),
        ...row(0, '장소', '○○구청 3층 대회의실'),
        ...row(1, '대상', '○○동 주민 누구나, 신청 없이 오시면 됩니다'),
        ...row(2, '내용', '생활권 계획안 설명과 질의응답'),
        ...row(3, '문의', '기획예산과 02-000-0000'),
        rule(96, 1496, 1048, '#CDD2DA', 2),
        ...iconLine(
          'bus',
          '주차 공간이 부족하니 대중교통을 이용해 주세요.',
          96,
          1530,
          1048,
          28,
          grey,
          {
            color: grey,
          },
        ),
        rect(0, 1626, 1240, 128, ink, { locked: true }),
        txt('○○구청장', 96, 1664, 600, 48, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: 6,
        }),
        txt('www.○○gu.go.kr', 644, 1678, 500, 28, { color: '#AFC0E6', align: 'right' }),
      ])
    },
  },
  {
    id: 'school-letter',
    name: '가정통신문',
    format: 'a4',
    make: () => {
      const forest = '#22594A'
      const ink = '#1C2A25'
      const line = '#D5DED9'
      const row = (i: number, name: string, label: string, value: string): El[] => {
        const y = 866 + i * 92
        return grouped(
          rule(96, y, 1048, line, 2),
          icon(name, 96, y + 26, 40, forest, { strokeWidth: 1.75 }),
          txt(label, 160, y + 30, 190, 30, { color: ink, fontWeight: 700 }),
          txt(value, 360, y + 28, 784, 32, { color: ink }),
        )
      }
      return docOf('a4', '가정통신문', '#FFFFFF', [
        rect(0, 0, 1240, 20, forest, { locked: true }),
        ...grouped(
          icon('school', 96, 76, 44, forest, { strokeWidth: 1.75 }),
          txt('○○초등학교 가정통신문', 158, 80, 640, 30, { color: forest, fontWeight: 700 }),
        ),
        txt('제2026-000호', 644, 84, 500, 26, { color: '#5F6B66', align: 'right' }),
        rule(96, 150, 1048, line, 2),
        txt('현장체험학습\n안내', 96, 214, 720, 116, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.12,
          letterSpacing: -3,
        }),
        // the day as a tear-off calendar sheet
        ...grouped(
          rect(864, 200, 280, 300, '#FFFFFF', { radius: 20, stroke: forest, strokeWidth: 3 }),
          rect(864, 200, 280, 80, forest, { radius: 20 }),
          rect(864, 244, 280, 36, forest),
          disc(916, 184, 26, ink),
          disc(1066, 184, 26, ink),
          mid('11월', 864, 220, 280, 34, { color: '#FFFFFF', fontWeight: 700 }),
          mid('13', 864, 290, 280, 150, { fontFamily: F.bebas, color: forest, lineHeight: 1 }),
          mid('금요일', 864, 444, 280, 28, { color: '#5F6B66', fontWeight: 700 }),
        ),
        txt(
          '학부모님, 안녕하십니까?\n가을이 깊어 가는 때, 가정에 건강과 행복이 가득하시기를 바랍니다.\n우리 학교는 아래와 같이 현장체험학습을 실시하오니 준비물을 살펴봐 주십시오.',
          96,
          556,
          1048,
          31,
          { color: '#33403B', lineHeight: 1.8 },
        ),
        txt('알려 드립니다', 96, 790, 600, 32, { color: forest, fontWeight: 700 }),
        ...row(0, 'clock', '일시', '11. 13.(금) 09:00 – 15:00'),
        ...row(1, 'map-pin', '장소', '○○과학관 (학교 버스로 이동)'),
        ...row(2, 'list-checks', '준비물', '도시락, 물, 필기도구'),
        ...row(3, 'footprints', '복장', '활동하기 편한 옷과 운동화'),
        rule(96, 1234, 1048, line, 2),
        ...grouped(
          rect(96, 1270, 10, 70, '#F2C230'),
          txt('참가 동의서는 11. 6.(금)까지 담임 선생님께 보내 주세요.', 134, 1284, 1010, 30, {
            color: ink,
            fontWeight: 700,
          }),
        ),
        txt('2026. 10. 30.', 644, 1376, 500, 28, { color: '#5F6B66', align: 'right' }),
        txt('○○초등학교장', 644, 1416, 500, 48, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: ink,
          align: 'right',
          letterSpacing: 4,
        }),
        mid(
          '- - - - - - - - - - - - - - - - - - - -   자르는 곳   - - - - - - - - - - - - - - - - - - - -',
          60,
          1512,
          1120,
          20,
          { color: '#A3ADA8' },
        ),
        txt('참가 동의서', 96, 1560, 400, 32, { color: forest, fontWeight: 700 }),
        txt(
          '        학년        반   이름                     \n위 학생의 현장체험학습 참가에 동의합니다.     보호자                    (인)',
          96,
          1612,
          1048,
          28,
          { color: ink, lineHeight: 1.9 },
        ),
      ])
    },
  },
  {
    id: 'event-poster',
    name: '행사 포스터',
    format: 'a4',
    make: () => {
      const yellow = '#FFD84D'
      const soft = '#C3C7FF'
      const session = (i: number, time: string, what: string): El[] => {
        const y = 1296 + i * 62
        return grouped(
          rule(96, y, 1048, '#FFFFFF', 2, { opacity: 0.35 }),
          txt(time, 96, y + 14, 140, 30, {
            fontFamily: F.grotesk,
            fontWeight: 700,
            color: yellow,
          }),
          txt(what, 260, y + 14, 884, 30, { color: '#FFFFFF' }),
        )
      }
      return docOf('a4', '행사 포스터', '#2B35E8', [
        txt('AI FORUM 2026', 96, 80, 600, 28, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: 3,
        }),
        txt('주최 ○○기관', 644, 80, 500, 28, { color: '#FFFFFF', align: 'right' }),
        rule(96, 134, 1048, '#FFFFFF', 2, { opacity: 0.4 }),
        txt('AI', 64, 150, 1100, 860, {
          fontFamily: F.archivo,
          color: yellow,
          lineHeight: 0.9,
          letterSpacing: -20,
        }),
        txt('와 함께하는\n문서 혁신 포럼', 96, 920, 1048, 112, {
          fontFamily: F.black,
          color: '#FFFFFF',
          lineHeight: 1.12,
        }),
        txt('일하는 방식을 바꾸는 오후, 세 번의 발표와 한 번의 토론', 96, 1196, 1048, 32, {
          color: soft,
        }),
        ...session(0, '14:00', '기조 발표   김○○ 교수'),
        ...session(1, '14:40', '현장 사례   이○○ 대표'),
        ...session(2, '15:30', '도구 시연   박○○ 연구원'),
        ...session(3, '16:20', '함께 토론'),
        rule(96, 1544, 1048, '#FFFFFF', 2, { opacity: 0.35 }),
        ...iconLine('calendar-days', '12. 3.(목) 14:00 – 17:00', 96, 1590, 860, 32, yellow, {
          color: '#FFFFFF',
          fontWeight: 700,
        }),
        ...iconLine('map-pin', '○○컨벤션센터 3층 그랜드홀', 96, 1644, 860, 32, yellow, {
          color: '#FFFFFF',
          fontWeight: 700,
        }),
        qrElement({
          x: 1032,
          y: 1580,
          w: 112,
          h: 112,
          qrText: 'https://example.com',
          color: '#1B1F9E',
          fill: '#FFFFFF',
          radius: 10,
        }),
      ])
    },
  },
  {
    id: 'card-cover',
    name: '카드뉴스 표지',
    format: 'card',
    make: () => {
      const ink = '#16181D'
      const red = '#E8381F'
      return docOf('card', '카드뉴스', '#FFFFFF', [
        txt('업무 글쓰기', 72, 72, 600, 28, { color: red, fontWeight: 700 }),
        txt('1 / 6', 708, 72, 300, 28, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: '#8A8F98',
          align: 'right',
        }),
        txt('5', 480, 110, 560, 900, {
          fontFamily: F.bebas,
          color: red,
          align: 'right',
          lineHeight: 0.92,
        }),
        txt('공문서\n작성 규칙', 72, 300, 560, 112, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.12,
          letterSpacing: -3,
        }),
        txt('헷갈리기 쉬운\n다섯 가지만 골랐습니다', 72, 590, 520, 34, {
          color: '#4B5160',
          lineHeight: 1.5,
        }),
        rule(72, 960, 936, ink, 2),
        txt('한판 디자인', 72, 988, 400, 26, { color: '#4B5160' }),
        ...grouped(
          txt('넘겨 보기', 640, 988, 314, 26, { color: ink, fontWeight: 700, align: 'right' }),
          icon('arrow-right', 970, 986, 38, ink),
        ),
      ])
    },
  },
  {
    id: 'thumbnail',
    name: '유튜브 썸네일',
    format: 'thumb',
    make: () => {
      const black = '#0D0D0D'
      const yellow = '#FFD400'
      // a mind map drawn in a few strokes: the subject at the centre, branches around it
      const cx = 1030
      const cy = 360
      const nodes: [number, number, number][] = [
        [1190, 150, 46],
        [1206, 540, 58],
        [850, 600, 40],
        [856, 146, 34],
      ]
      return docOf('thumb', '썸네일', yellow, [
        ...grouped(
          ...nodes.map(([x, y]) =>
            shapeElement('line', {
              x: cx,
              y: cy,
              w: x - cx,
              h: y - cy,
              stroke: black,
              strokeWidth: 8,
            }),
          ),
          ...nodes.map(([x, y, r]) =>
            disc(x - r, y - r, r * 2, '#FFFFFF', { stroke: black, strokeWidth: 6 }),
          ),
          disc(cx - 104, cy - 104, 208, black),
          icon('file-text', cx - 48, cy - 48, 96, yellow, { strokeWidth: 1.75 }),
        ),
        pill('3분 정리', 64, 58, 32, black, yellow),
        txt('마인드맵으로', 64, 136, 760, 110, {
          fontFamily: F.black,
          color: black,
          lineHeight: 1.1,
        }),
        pill('보고서 끝!', 52, 268, 110, black, yellow, {
          fontFamily: F.black,
          fontWeight: 400,
          radius: 14,
        }),
        txt('회의 메모가 보고서가 되기까지', 64, 520, 720, 38, { color: black, fontWeight: 700 }),
        txt('한판 사용법', 64, 586, 720, 30, { color: black }),
      ])
    },
  },
  {
    id: 'sale-banner',
    name: '할인 배너',
    format: 'thumb',
    make: () => {
      const ice = '#9FD8FF'
      return docOf('thumb', '할인 배너', '#0B1E3F', [
        icon('snowflake', 940, 150, 300, '#16305A', { strokeWidth: 1, locked: true }),
        txt('WINTER SALE 2026', 890, 340, 640, 30, {
          fontFamily: F.archivo,
          color: ice,
          letterSpacing: 8,
          align: 'center',
          lineHeight: 1.3,
          rotation: 90,
        }),
        txt('최대', 72, 64, 300, 56, { fontFamily: F.black, color: ice }),
        txt('50', 56, 120, 620, 420, { fontFamily: F.archivo, color: '#FFFFFF', lineHeight: 0.95 }),
        txt('%', 660, 150, 260, 220, { fontFamily: F.archivo, color: ice, lineHeight: 1 }),
        txt('OFF', 664, 386, 300, 110, { fontFamily: F.archivo, color: '#FFFFFF', lineHeight: 1 }),
        rule(72, 560, 760, '#FFFFFF', 2, { opacity: 0.3 }),
        txt('12. 1.(월) – 12. 7.(일)', 72, 588, 520, 36, { color: '#FFFFFF', fontWeight: 700 }),
        txt('전 품목, 3만 원 이상 무료 배송', 72, 642, 600, 28, { color: ice }),
        txt('○○스토어', 560, 592, 272, 32, { color: '#FFFFFF', fontWeight: 900, align: 'right' }),
      ])
    },
  },
  {
    id: 'seminar-invite',
    name: '세미나 초대장',
    format: 'a4',
    make: () => {
      const brass = '#C9A96E'
      const ivory = '#F3EBDD'
      const column = (x: number, label: string, value: string): El[] =>
        grouped(
          mid(label, x, 1044, 306, 24, { color: brass, fontWeight: 700, letterSpacing: 6 }),
          mid(value, x, 1094, 306, 32, {
            fontFamily: F.serif,
            fontWeight: 700,
            color: ivory,
            lineHeight: 1.45,
          }),
        )
      const divider = (x: number): El =>
        shapeElement('line', {
          x,
          y: 1040,
          w: 0,
          h: 170,
          stroke: brass,
          strokeWidth: 1,
          opacity: 0.5,
        })
      return docOf('a4', '세미나 초대장', '#11302A', [
        frame(60, 60, 1120, 1634, brass, 2),
        frame(78, 78, 1084, 1598, brass, 1, { opacity: 0.45 }),
        rect(608, 140, 24, 24, brass, { rotation: 45 }),
        mid('INVITATION', 0, 206, 1240, 30, {
          fontFamily: F.playfair,
          letterSpacing: 14,
          color: brass,
        }),
        mid('디지털 전환\n정책 세미나', 100, 300, 1040, 108, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: ivory,
          lineHeight: 1.25,
        }),
        rule(560, 614, 120, brass, 2),
        mid('공공 서비스의 내일을 함께 그립니다', 100, 656, 1040, 38, {
          fontFamily: F.serif,
          color: '#D9CFBD',
        }),
        mid(
          '귀하를 아래 세미나에 정중히 초대합니다.\n바쁘시더라도 참석하시어 자리를 빛내 주시기 바랍니다.',
          100,
          790,
          1040,
          30,
          { fontFamily: F.batang, color: '#CFC6B4', lineHeight: 1.9 },
        ),
        rule(160, 1000, 920, brass, 1, { opacity: 0.6 }),
        ...column(160, '일시', '2026. 11. 27.(목)\n오후 2시'),
        divider(467),
        ...column(467, '장소', '○○호텔\n그랜드볼룸'),
        divider(773),
        ...column(773, '회신', '11. 20.(목)까지'),
        rule(160, 1250, 920, brass, 1, { opacity: 0.6 }),
        mid('한국○○연구원장', 100, 1400, 1040, 46, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: ivory,
          letterSpacing: 6,
        }),
        mid('문의 02-000-0000   seminar@example.kr', 100, 1494, 1040, 24, { color: brass }),
      ])
    },
  },
  {
    id: 'quote-card',
    name: '인용 카드',
    format: 'card',
    make: () => {
      const ink = '#1A1A1A'
      return docOf('card', '인용 카드', '#F0C93A', [
        txt('“', 56, -20, 500, 520, { fontFamily: F.playfair, color: ink, lineHeight: 1 }),
        txt('작은 기록이 모여\n큰 변화를\n만듭니다.', 96, 400, 888, 92, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: ink,
          lineHeight: 1.35,
        }),
        rule(96, 840, 120, ink, 4),
        txt('오늘의 문장', 96, 880, 500, 32, { fontFamily: F.batang, fontWeight: 700, color: ink }),
        txt('@hanpan.design', 584, 960, 400, 26, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: ink,
          align: 'right',
        }),
      ])
    },
  },
  {
    id: 'recruit',
    name: '모집 공고',
    format: 'a4',
    make: () => {
      const coral = '#FF5A4E'
      const plum = '#2A1536'
      const row = (i: number, label: string, value: string): El[] => {
        const y = 948 + i * 100
        return grouped(
          rule(96, y, 1048, '#EADFE3', 2),
          txt(label, 96, y + 32, 220, 30, { color: coral, fontWeight: 700 }),
          txt(value, 320, y + 30, 824, 34, { color: plum }),
        )
      }
      return docOf('a4', '모집 공고', '#FFFFFF', [
        rect(0, 0, 1240, 880, coral, { locked: true }),
        txt('○○시 청년센터', 96, 84, 600, 28, { color: plum, fontWeight: 700 }),
        pill('D-14', 1026, 72, 30, plum, '#FFFFFF', { fontFamily: F.grotesk }),
        txt('청년 서포터즈\n모집합니다', 96, 176, 1048, 92, {
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.18,
          letterSpacing: -2,
        }),
        txt('지역의 이야기를 함께 기록할\n스무 명의 청년을 찾습니다', 96, 420, 560, 34, {
          color: '#FFFFFF',
          lineHeight: 1.5,
        }),
        txt('3기', 500, 440, 700, 430, { fontFamily: F.black, color: plum, lineHeight: 1 }),
        ...row(0, '모집 기간', '2026. 11. 1. – 11. 30.'),
        ...row(1, '모집 인원', '20명 내외'),
        ...row(2, '활동 내용', '지역 소식 취재, 카드뉴스 제작'),
        ...row(3, '혜택', '활동비 지원, 수료증 발급'),
        rule(96, 1348, 1048, '#EADFE3', 2),
        ...grouped(
          rect(96, 1410, 1048, 130, plum, { radius: 16 }),
          txt('지원하기', 144, 1450, 400, 40, { color: '#FFFFFF', fontWeight: 900 }),
          txt('apply.example.kr', 560, 1454, 470, 34, {
            fontFamily: F.grotesk,
            fontWeight: 700,
            color: '#FFFFFF',
            align: 'right',
          }),
          icon('arrow-right', 1050, 1453, 44, coral),
        ),
        mid('주관 ○○시 청년센터   문의 02-000-0000', 96, 1630, 1048, 26, { color: '#6E6474' }),
      ])
    },
  },
  {
    id: 'story-event',
    name: '이벤트 스토리',
    format: 'story',
    make: () => {
      const cream = '#FFF1DC'
      const brown = '#3A1A0B'
      const persimmon = '#E8551E'
      const step = (i: number, text: string): El[] => {
        const y = 1010 + i * 200
        return grouped(
          ...(i > 0 ? [rule(120, y - 24, 840, '#F2C9A8', 2)] : []),
          txt(String(i + 1), 120, y, 120, 96, {
            fontFamily: F.archivo,
            color: persimmon,
            lineHeight: 1.1,
          }),
          txt(text, 260, y + 26, 700, 44, { color: brown, fontWeight: 700 }),
        )
      }
      return docOf('story', '이벤트 스토리', persimmon, [
        txt('FOLLOW EVENT', 90, 120, 900, 34, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: cream,
          letterSpacing: 6,
        }),
        txt('가을맞이\n팔로우\n이벤트', 90, 200, 900, 190, {
          fontFamily: F.black,
          color: cream,
          lineHeight: 1.02,
        }),
        icon('leaf', 680, 560, 320, brown, { strokeWidth: 1.25 }),
        txt('참여만 해도 추첨으로 서른 분께 선물을 드려요', 90, 850, 900, 40, {
          color: cream,
          fontWeight: 700,
        }),
        rect(60, 960, 960, 620, cream, { radius: 40 }),
        ...step(0, '계정 팔로우하기'),
        ...step(1, '게시물에 친구 태그하기'),
        ...step(2, '이 이야기 공유하기'),
        txt('11. 30.(일)까지   당첨 발표 12. 3.', 90, 1680, 900, 38, {
          color: cream,
          fontWeight: 700,
        }),
        txt('@hanpan.event', 90, 1748, 900, 30, { fontFamily: F.grotesk, color: cream }),
      ])
    },
  },
  {
    id: 'slide-cover',
    name: '발표 표지',
    format: 'slide',
    make: () => {
      const ink = '#0E3B43'
      const teal = '#1F8A8A'
      const amber = '#F5A524'
      // a year as twelve monthly bars, the last one picked out
      const heights = [210, 260, 240, 300, 330, 310, 380, 420, 400, 470, 520, 600]
      const bars = heights.flatMap((h, i) => {
        const x = 1060 + i * 64
        return [
          rect(x, 860 - h, 44, h, i === 11 ? amber : teal, {
            opacity: i === 11 ? 1 : 0.35 + i * 0.05,
          }),
          mid(String(i + 1), x - 10, 884, 64, 22, { fontFamily: F.grotesk, color: '#7A8E92' }),
        ]
      })
      return docOf('slide', '발표 표지', '#FFFFFF', [
        ...grouped(...bars, rule(1040, 860, 790, ink, 3)),
        txt('2026 하반기 업무 보고', 140, 250, 820, 34, { color: teal, fontWeight: 700 }),
        txt('데이터로 보는\n우리 기관의 1년', 140, 316, 860, 112, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.12,
          letterSpacing: -3,
        }),
        rule(140, 620, 120, amber, 8),
        txt('기획예산팀 김○○', 140, 676, 820, 36, { color: ink, fontWeight: 700 }),
        txt('2026. 12. 15.', 140, 732, 820, 30, { fontFamily: F.grotesk, color: '#7A8E92' }),
      ])
    },
  },
  {
    id: 'certificate',
    name: '상장',
    format: 'a4',
    make: () => {
      const navy = '#1F2A44'
      const gold = '#B8963E'
      const red = '#C0392B'
      const corner = (x: number, y: number): El => rect(x, y, 28, 28, gold, { rotation: 45 })
      return docOf('a4', '상장', '#FCFAF4', [
        frame(48, 48, 1144, 1658, navy, 10),
        frame(84, 84, 1072, 1586, gold, 2),
        ...grouped(corner(70, 70), corner(1142, 70), corner(70, 1656), corner(1142, 1656)),
        txt('제 2026-001 호', 140, 140, 500, 26, { color: '#6B6250' }),
        mid('상    장', 0, 250, 1240, 150, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: navy,
          lineHeight: 1.2,
        }),
        mid('독서 우수상', 0, 460, 1240, 44, { fontFamily: F.serif, fontWeight: 700, color: gold }),
        rule(520, 560, 200, gold, 2),
        txt('○○초등학교 6학년 2반', 200, 640, 840, 34, { fontFamily: F.batang, color: navy }),
        txt('홍 길 동', 200, 700, 840, 64, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: navy,
          letterSpacing: 6,
        }),
        mid(
          '위 학생은 평소 성실한 태도로 학교생활에 임하며\n바른 독서 습관을 길러 다른 학생의 모범이 되었기에\n이 상장을 주어 칭찬합니다.',
          150,
          890,
          940,
          40,
          { fontFamily: F.batang, color: navy, lineHeight: 1.95 },
        ),
        mid('2026년 12월 20일', 100, 1270, 1040, 38, { fontFamily: F.batang, color: navy }),
        mid('○○초등학교장', 100, 1400, 1040, 60, {
          fontFamily: F.serif,
          fontWeight: 700,
          color: navy,
          letterSpacing: 10,
        }),
        // the school seal: a red square stamp over the end of the name
        ...grouped(
          rect(862, 1370, 128, 128, 'transparent', {
            stroke: red,
            strokeWidth: 6,
            radius: 6,
            opacity: 0.85,
          }),
          mid('○○초등\n학교장인', 862, 1392, 128, 28, {
            fontFamily: F.serif,
            fontWeight: 700,
            color: red,
            lineHeight: 1.25,
            opacity: 0.85,
          }),
        ),
      ])
    },
  },
  {
    id: 'card-list',
    name: '카드뉴스 본문',
    format: 'card',
    make: () => {
      const ink = '#16181D'
      const red = '#E8381F'
      const point = (i: number, lead: string, text: string): El[] => {
        const y = 560 + i * 120
        return grouped(
          rule(72, y, 936, '#D9DBE0', 2),
          txt(lead, 72, y + 34, 220, 32, { color: red, fontWeight: 700 }),
          txt(text, 300, y + 32, 708, 34, { color: ink }),
        )
      }
      return docOf('card', '카드뉴스 본문', '#FFFFFF', [
        txt('업무 글쓰기', 72, 72, 600, 28, { color: red, fontWeight: 700 }),
        txt('2 / 6', 708, 72, 300, 28, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: '#8A8F98',
          align: 'right',
        }),
        txt('01', 64, 130, 400, 220, { fontFamily: F.bebas, color: red, lineHeight: 0.95 }),
        txt('보고서는\n결론부터 씁니다', 72, 350, 936, 76, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.18,
          letterSpacing: -2,
        }),
        ...point(0, '첫 문단', '결론과 요청을 먼저 씁니다'),
        ...point(1, '근거', '숫자로, 세 가지만 듭니다'),
        ...point(2, '끝 문단', '다음에 할 일과 기한을 적습니다'),
        rule(72, 960, 936, ink, 2),
        txt('한판 디자인', 72, 988, 400, 26, { color: '#4B5160' }),
        ...grouped(
          txt('넘겨 보기', 640, 988, 314, 26, { color: ink, fontWeight: 700, align: 'right' }),
          icon('arrow-right', 970, 986, 38, ink),
        ),
      ])
    },
  },
  {
    id: 'grand-open',
    name: '개업 안내',
    format: 'a4',
    make: () => {
      const teal = '#0F4C5C'
      const peach = '#FFE8D6'
      const orange = '#F28C38'
      const perk = (x: number, name: string, text: string): El[] =>
        grouped(
          icon(name, x + 132, 1236, 64, orange, { strokeWidth: 1.75 }),
          mid(text, x, 1326, 328, 32, { fontWeight: 700, color: teal, lineHeight: 1.4 }),
        )
      const divider = (x: number): El =>
        shapeElement('line', {
          x,
          y: 1236,
          w: 0,
          h: 180,
          stroke: teal,
          strokeWidth: 2,
          opacity: 0.25,
        })
      return docOf('a4', '개업 안내', peach, [
        // a shop door: a tall arch
        ...grouped(rect(270, 110, 700, 900, teal, { radius: 350 }), rect(270, 460, 700, 550, teal)),
        icon('coffee', 560, 220, 120, peach, { strokeWidth: 1.5 }),
        mid('GRAND\nOPEN', 270, 380, 700, 230, {
          fontFamily: F.bebas,
          color: peach,
          lineHeight: 0.92,
          letterSpacing: 4,
        }),
        rule(520, 844, 200, orange, 4),
        mid('12. 5.(금) 오전 10시', 270, 880, 700, 40, { color: '#FFFFFF', fontWeight: 700 }),
        mid('카페 ○○이 문을 엽니다', 96, 1072, 1048, 64, {
          fontWeight: 900,
          color: teal,
          letterSpacing: -2,
        }),
        ...perk(96, 'coffee', '첫 주 음료\n1+1'),
        divider(456),
        ...perk(456, 'ticket', '스탬프\n2배 적립'),
        divider(784),
        ...perk(816, 'gift', '선착순 100명\n머그컵 증정'),
        rule(96, 1500, 1048, teal, 2, { opacity: 0.25 }),
        ...iconLine('map-pin', '○○시 ○○로 123, ○○역 2번 출구에서 3분', 96, 1548, 1048, 30, orange, {
          color: teal,
          fontWeight: 700,
        }),
        ...iconLine('clock', '매일 09:00 – 22:00', 96, 1606, 1048, 30, orange, { color: teal }),
      ])
    },
  },
  {
    id: 'menu-board',
    name: '메뉴판',
    format: 'a4',
    make: () => {
      const cream = '#F2E3C6'
      const gold = '#B9975B'
      const item = (y: number, name: string, desc: string, price: string): El[] =>
        grouped(
          txt(name, 140, y, 700, 38, { fontWeight: 700, color: '#F7F3EE' }),
          txt(desc, 140, y + 54, 700, 24, { color: '#A8A29E' }),
          txt(price, 880, y - 4, 220, 44, {
            fontFamily: F.playfair,
            fontWeight: 700,
            color: cream,
            align: 'right',
          }),
        )
      const section = (y: number, title: string): El[] =>
        grouped(
          txt(title, 140, y, 400, 30, {
            fontFamily: F.grotesk,
            fontWeight: 700,
            letterSpacing: 6,
            color: gold,
          }),
          rule(400, y + 20, 700, gold, 1, { opacity: 0.6 }),
        )
      return docOf('a4', '메뉴판', '#1E1A17', [
        mid('카페 ○○', 0, 120, 1240, 32, {
          fontFamily: F.batang,
          color: '#D6C4A8',
          letterSpacing: 4,
        }),
        mid('Menu', 0, 170, 1240, 200, {
          fontFamily: F.playfair,
          fontWeight: 700,
          italic: true,
          color: cream,
          lineHeight: 1.1,
        }),
        ...section(480, 'COFFEE'),
        ...item(560, '아메리카노', '산미가 적은 블렌드, 따뜻하게 또는 차갑게', '4.0'),
        ...item(680, '카페 라테', '우유를 곱게 데워 부드럽게', '4.5'),
        ...item(800, '바닐라 라테', '직접 끓인 바닐라 시럽', '5.0'),
        ...grouped(
          ...item(920, '콜드브루', '열두 시간 내린 이 집의 대표 메뉴', '5.0'),
          pill('대표', 352, 918, 22, gold, '#1E1A17'),
        ),
        ...section(1080, 'DESSERT'),
        ...item(1160, '치즈케이크', '매일 아침 굽는 바스크 치즈케이크', '6.0'),
        ...item(1280, '크로플', '버터 크루아상 반죽을 와플 틀에', '5.5'),
        ...item(1400, '마들렌', '레몬 마들렌, 두 개', '3.0'),
        rule(140, 1560, 960, '#3F3A36', 2),
        ...iconLine('clock', '매일 09:00 – 21:00', 140, 1604, 520, 30, gold, { color: '#D6C4A8' }),
        ...iconLine('phone', '02-000-0000', 760, 1604, 340, 30, gold, { color: '#D6C4A8' }),
      ])
    },
  },
  {
    id: 'volunteer',
    name: '봉사자 모집',
    format: 'card',
    make: () => {
      const sky = '#CFE8FF'
      const ink = '#0B3B5C'
      const orange = '#FF8A3D'
      const row = (i: number, name: string, text: string): El[] =>
        iconLine(name, text, 72, 600 + i * 76, 760, 34, ink, { color: ink })
      return docOf('card', '봉사자 모집', sky, [
        ...grouped(
          icon('trees', 700, 560, 340, '#9CC9EE', { strokeWidth: 1.25 }),
          icon('sprout', 880, 830, 140, '#9CC9EE', { strokeWidth: 1.5 }),
        ),
        txt('함께해요', 72, 72, 400, 30, { color: ink, fontWeight: 700 }),
        txt('이웃과 함께하는 걷기 정화', 520, 72, 488, 26, { color: ink, align: 'right' }),
        rule(72, 128, 936, ink, 3),
        txt('주말 환경 정화\n봉사자를\n찾습니다', 72, 180, 936, 104, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.12,
          letterSpacing: -3,
        }),
        ...row(0, 'calendar-days', '매월 둘째 토요일 오전 10시'),
        ...row(1, 'map-pin', '○○천 산책로 입구'),
        ...row(2, 'users', '누구나, 장갑과 집게를 드립니다'),
        ...grouped(
          rect(72, 880, 640, 120, orange, { radius: 60 }),
          txt('신청하기', 124, 918, 200, 38, { color: '#FFFFFF', fontWeight: 900 }),
          txt('volunteer.example.kr', 330, 924, 340, 28, {
            fontFamily: F.grotesk,
            fontWeight: 700,
            color: '#FFFFFF',
          }),
        ),
      ])
    },
  },
  {
    id: 'class-thumb',
    name: '강의 썸네일',
    format: 'thumb',
    make: () => {
      const ink = '#111827'
      const green = '#1D7A46'
      const grid = '#DDE3EA'
      // a sheet's grid on the right, one cell picked
      const cells: El[] = []
      for (let i = 0; i <= 6; i++)
        cells.push(
          shapeElement('line', {
            x: 712 + i * 96,
            y: 0,
            w: 0,
            h: 720,
            stroke: grid,
            strokeWidth: 2,
          }),
        )
      for (let j = 0; j <= 12; j++) cells.push(rule(712, j * 60, 568, grid, 2))
      const heads = ['A', 'B', 'C', 'D', 'E', 'F'].map((c, i) =>
        mid(c, 712 + i * 96, 14, 96, 26, {
          fontFamily: F.grotesk,
          fontWeight: 700,
          color: '#8A94A6',
        }),
      )
      return docOf('thumb', '강의 썸네일', '#FFFFFF', [
        ...grouped(rect(712, 0, 568, 60, '#F1F4F8'), ...cells, ...heads),
        ...grouped(
          rect(808, 240, 384, 240, '#E8F5EE', { stroke: green, strokeWidth: 6 }),
          rect(1180, 468, 24, 24, green),
          mid('30:00', 808, 278, 384, 150, { fontFamily: F.bebas, color: green, lineHeight: 1.1 }),
        ),
        pill('LIVE', 64, 64, 28, '#E5322D', '#FFFFFF', { fontFamily: F.grotesk, letterSpacing: 3 }),
        txt('무료 온라인 강의', 226, 72, 440, 28, { color: ink, fontWeight: 700 }),
        txt('엑셀 자동화\n30분 만에\n끝내기', 64, 150, 620, 92, {
          fontWeight: 900,
          color: ink,
          lineHeight: 1.12,
          letterSpacing: -3,
        }),
        ...iconLine('calendar-days', '11. 21.(금) 저녁 8시', 64, 520, 600, 32, green, {
          color: ink,
          fontWeight: 700,
        }),
        ...iconLine('mic', '강사 김○○', 64, 580, 600, 32, green, { color: ink }),
      ])
    },
  },
  {
    id: 'data-slide',
    name: '숫자 강조 발표',
    format: 'slide',
    make: () => {
      const ink = '#15171C'
      const green = '#0A8F5A'
      const grey = '#5D6470'
      const side = (y: number, value: string, label: string): El[] =>
        grouped(
          txt(value, 1260, y, 520, 140, { fontFamily: F.archivo, color: ink, lineHeight: 1 }),
          txt(label, 1260, y + 160, 520, 32, { color: grey }),
        )
      return docOf('slide', '숫자 강조 발표', '#FFFFFF', [
        txt('핵심 성과', 140, 120, 600, 32, { color: green, fontWeight: 700 }),
        txt('민원 처리 기간이 절반으로 줄었습니다', 140, 176, 1640, 72, {
          fontWeight: 900,
          color: ink,
          letterSpacing: -2,
        }),
        rule(140, 300, 1640, ink, 3),
        txt('-52%', 120, 380, 1040, 330, {
          fontFamily: F.archivo,
          color: green,
          lineHeight: 1,
          letterSpacing: -10,
        }),
        txt('평균 민원 처리 기간, 2025년과 견주어', 140, 740, 960, 36, {
          color: ink,
          fontWeight: 700,
        }),
        shapeElement('line', { x: 1180, y: 380, w: 0, h: 520, stroke: '#D9DCE1', strokeWidth: 2 }),
        ...side(390, '4.8', '만족도 (5점 만점)'),
        rule(1260, 640, 520, '#D9DCE1', 2),
        ...side(690, '+38%', '온라인 신청 증가'),
        txt('자료: 2026 ○○기관 업무 통계', 140, 980, 900, 24, { color: grey }),
      ])
    },
  },
  {
    id: 'thanks-card',
    name: '감사 카드',
    format: 'card',
    make: () => {
      const red = '#C8323A'
      const ink = '#2A1F1F'
      return docOf('card', '감사 카드', red, [
        rect(80, 80, 920, 920, '#FFFBF5', { locked: true }),
        icon('heart', 504, 170, 72, red, { strokeWidth: 2 }),
        mid('Thank you', 80, 300, 920, 140, {
          fontFamily: F.playfair,
          fontWeight: 700,
          italic: true,
          color: red,
          lineHeight: 1.15,
        }),
        rule(500, 520, 80, red, 3),
        mid('늘 곁에서 힘이 되어 주셔서\n고맙습니다', 80, 580, 920, 48, {
          fontFamily: F.batang,
          fontWeight: 700,
          color: ink,
          lineHeight: 1.6,
        }),
        mid('○○ 드림', 80, 820, 920, 32, { fontFamily: F.batang, color: '#7A5A5A' }),
      ])
    },
  },
  {
    id: 'safety-notice',
    name: '안전 수칙',
    format: 'a4',
    make: () => {
      const ink = '#111111'
      const yellow = '#FFCC00'
      const item = (i: number, name: string, title: string, desc: string): El[] => {
        const y = 640 + i * 200
        return grouped(
          rule(96, y, 1048, '#DADADA', 2),
          rect(96, y + 40, 104, 104, yellow),
          icon(name, 122, y + 66, 52, ink),
          txt(title, 240, y + 40, 904, 42, { fontWeight: 900, color: ink }),
          txt(desc, 240, y + 104, 904, 30, { color: '#4A4A4A' }),
        )
      }
      // a hazard band: black stripes leaning across the yellow
      const stripes = Array.from({ length: 16 }, (_, i) =>
        rect(-120 + i * 100, -40, 44, 120, ink, { rotation: 35 }),
      )
      return docOf('a4', '안전 수칙', '#FFFFFF', [
        rect(0, 0, 1240, 470, yellow, { locked: true }),
        ...grouped(...stripes.map((e) => ({ ...e, locked: true }))),
        icon('triangle-alert', 96, 150, 96, ink, { strokeWidth: 2.25 }),
        txt('겨울철\n안전 수칙', 220, 140, 924, 112, {
          fontFamily: F.black,
          color: ink,
          lineHeight: 1.08,
        }),
        txt('눈과 빙판길, 화재에 미리 대비해 주세요.', 96, 534, 1048, 36, {
          color: ink,
          fontWeight: 700,
        }),
        ...item(0, 'snowflake', '빙판길은 천천히', '주머니에서 손을 빼고 보폭을 줄여 걷습니다.'),
        ...item(
          1,
          'flame',
          '난방기 곁을 비우지 않기',
          '외출할 때는 전원을 끄고 플러그를 뽑습니다.',
        ),
        ...item(2, 'car', '차량 월동 준비', '타이어와 배터리, 부동액을 미리 점검합니다.'),
        rule(96, 1240, 1048, '#DADADA', 2),
        ...grouped(
          rect(96, 1300, 1048, 220, ink),
          txt('119', 144, 1324, 400, 180, { fontFamily: F.bebas, color: yellow, lineHeight: 1 }),
          txt('위급할 때는', 470, 1356, 640, 34, { color: '#FFFFFF' }),
          txt('다친 사람이 있으면 먼저 119에 알립니다', 470, 1408, 640, 34, {
            color: '#FFFFFF',
            fontWeight: 700,
          }),
        ),
        mid('○○시청 안전총괄과', 96, 1620, 1048, 34, { fontWeight: 700, color: ink }),
      ])
    },
  },
]

/** Faces that lack letters only Vietnamese uses, and the shipped face that stands in for each */
const VIETNAMESE_STAND_IN: Readonly<Record<string, string>> = {
  [F.bebas]: F.grotesk,
  [F.archivo]: F.sans,
  [F.black]: F.sans,
  [F.dohyeon]: F.dodum,
}
const VIETNAMESE_LETTERS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i

/**
 * A template's design with its words in the UI language: Korean as written, Vietnamese
 * or English (for every other language) from TEMPLATE_WORDS. Each box keeps its place and
 * width and shrinks its type the way an AI fill does when the new words run longer; a box
 * whose Vietnamese its face cannot draw takes a shipped face that can.
 */
function localizeDoc(doc: DesignDoc, lang: string): DesignDoc {
  const pick = (text: string): string | undefined => {
    const words = TEMPLATE_WORDS[text]
    return words && (lang === 'vi' ? words.vi : words.en)
  }
  const slots: FillSlot[] = []
  const words = new Map<number, string>()
  doc.pages.forEach((pg, page) =>
    pg.elements.forEach((e) => {
      const text = e.kind === 'text' && e.text ? pick(e.text) : undefined
      if (text === undefined) return
      words.set(slots.length, text)
      slots.push({ id: e.id, page, text: e.text! })
    }),
  )
  const filled = applyFill(doc, slots, words).doc
  const pages = filled.pages.map((pg) => ({
    ...pg,
    elements: pg.elements.map((e) => {
      const standIn = e.fontFamily && VIETNAMESE_STAND_IN[e.fontFamily]
      return standIn && e.text && VIETNAMESE_LETTERS.test(e.text)
        ? { ...e, fontFamily: standIn }
        : e
    }),
  }))
  return { ...filled, name: pick(doc.name) ?? doc.name, pages }
}

/** The templates as the UI language shows them. */
export function templatesFor(lang: string): readonly DesignTemplate[] {
  if (lang === 'ko') return DESIGN_TEMPLATES
  return DESIGN_TEMPLATES.map((t) => ({
    ...t,
    name: TEMPLATE_WORDS[t.name]?.[lang === 'vi' ? 'vi' : 'en'] ?? t.name,
    make: () => localizeDoc(t.make(), lang),
  }))
}
