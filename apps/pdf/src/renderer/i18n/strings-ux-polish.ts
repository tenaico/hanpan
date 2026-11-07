/**
 * 0.17 화면 다듬기(UI/UX 점검 v2)에서 더한 문구. 영어가 기본이고 ko·vi만 따로 둔다.
 * 나머지 언어는 영어를 그대로 쓴다(cert-sign-strings.ts와 같은 방식).
 */
const uxPolishStrings = {
  // 파일 나누기 창: 숫자 칸이 무엇인지와 결과 파일 수
  splitDlgPrompt: 'Start a new file every how many pages?',
  splitDlgUnit: 'pages per file',
  splitDlgPreview: '{total} pages → {files} files',
  splitPdfTip: 'Split this PDF into several files',
  splitPagesTip: 'Cut each page into smaller pages (for example, 2-up scans)',
  // 형광펜·밑줄·취소선을 글자 선택 없이 눌렀을 때 켜지는 도구
  markupToolOn: 'Drag over text to apply it right away. Press Esc to stop.',
  // 양식이 있는 PDF를 열었을 때의 알림 줄
  formBannerText: 'This PDF has fields you can fill in.',
  formBannerOpen: 'Fill form',
  formBannerClose: 'Close',
  // 인쇄 창
  printPreview: 'Preview',
  fileMenuExportImages: 'Export as images (PNG)…',
  printSummary: '{pages} pages to print',
  printNextStepHint:
    'Choose the printer and the number of copies in the print window that opens next.',
} as const

const localizedUxPolishStrings = {
  ko: {
    splitDlgPrompt: '몇 쪽마다 새 파일로 나눌까요?',
    splitDlgUnit: '쪽마다 한 파일',
    splitDlgPreview: '총 {total}쪽 → 파일 {files}개',
    splitPdfTip: '이 PDF를 여러 파일로 나눕니다',
    splitPagesTip: '한 쪽을 작은 여러 쪽으로 자릅니다(예: 두 쪽을 한 장에 스캔한 문서)',
    markupToolOn: '글자를 끌면 바로 적용됩니다. Esc를 누르면 끕니다.',
    formBannerText: '이 PDF에는 채울 수 있는 칸이 있습니다.',
    formBannerOpen: '양식 채우기',
    formBannerClose: '닫기',
    printPreview: '미리 보기',
    fileMenuExportImages: '이미지(PNG)로 내보내기…',
    printSummary: '{pages}쪽을 인쇄합니다',
    printNextStepHint: '프린터와 매수는 다음에 열리는 인쇄 창에서 고릅니다.',
  },
  vi: {
    splitDlgPrompt: 'Cứ bao nhiêu trang thì tách sang tệp mới?',
    splitDlgUnit: 'trang mỗi tệp',
    splitDlgPreview: '{total} trang → {files} tệp',
    splitPdfTip: 'Tách PDF này thành nhiều tệp',
    splitPagesTip: 'Cắt mỗi trang thành nhiều trang nhỏ (ví dụ bản quét hai trang một tờ)',
    markupToolOn: 'Kéo qua chữ để áp dụng ngay. Nhấn Esc để tắt.',
    formBannerText: 'PDF này có các ô có thể điền.',
    formBannerOpen: 'Điền biểu mẫu',
    formBannerClose: 'Đóng',
    printPreview: 'Xem trước',
    fileMenuExportImages: 'Xuất thành hình ảnh (PNG)…',
    printSummary: 'Sẽ in {pages} trang',
    printNextStepHint: 'Chọn máy in và số bản trong cửa sổ in mở ra tiếp theo.',
  },
} satisfies Record<string, Record<keyof typeof uxPolishStrings, string>>

export const uxPolishStringsFor = (lang: string) => ({
  ...uxPolishStrings,
  ...(localizedUxPolishStrings[lang as keyof typeof localizedUxPolishStrings] ?? {}),
})
