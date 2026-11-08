/**
 * Words from the 0.17 UI/UX review v2 (hwp-design), [Korean, English, Vietnamese]:
 *
 * - UX_CORRECTIONS: rhwp catalog entries the app words differently. The studio was written for a
 *   web page, so some of its text speaks of browsers (Chrome/Edge/Firefox, "this browser's local
 *   storage") or of its own internals ("stable_id", "IR 스냅샷(JSON)", "identity(Map)",
 *   "폴백"); in a desktop app those read as developer notes. They win over rhwp's catalogs in
 *   every studio language, as studio-locales.mjs's CATALOG_CORRECTIONS do.
 * - UX_STRINGS: new text under the app's own keys (`hanpan.*`) for what the review added.
 *
 * Every entry keeps the placeholders of its Korean text (`{p1}`).
 */

export const UX_CORRECTIONS = {
  // 수식 (#28): the box above is the preview, the input is below it
  'dialog.equationEditor.showPreviewMessage.label': [
    '미리 보기 — 아래 칸에 입력한 수식이 여기에 보입니다',
    'Preview — the equation you type below shows here',
    'Xem trước — công thức bạn nhập bên dưới hiện ở đây',
  ],
  // 글자 모양·문단 모양 (#27): 확인 as in every other dialog
  'dialog.charShape.okBtn.text': ['확인', 'OK', 'OK'],
  'dialog.paraShape.okBtn.text': ['확인', 'OK', 'OK'],
  // 입력 > 필드 입력 (#21): it puts a 누름틀, the word the AI panel and Hangul users know
  'command.insert.field.label': ['누름틀 넣기', 'Insert Click-Here Field', 'Chèn trường nhập'],
  'dialog.fieldInsert.title': ['누름틀 넣기', 'Insert Click-Here Field', 'Chèn trường nhập'],
  'dialog.fieldEdit.title': ['누름틀 고치기', 'Edit Click-Here Field', 'Sửa trường nhập'],

  // 편집 (#23): a key letter on four items only, and 모양 "붙여넣기" beside 붙이기
  'command.edit.find.label': ['찾기', 'Find', 'Tìm'],
  'command.edit.find.splitLabel': ['찾기 ', 'Find ', 'Tìm '],
  'command.edit.findAgain.label': ['다시 찾기', 'Find Again', 'Tìm tiếp'],
  'command.edit.findAgain.splitLabel': ['다시 찾기 ', 'Find Again ', 'Tìm tiếp '],
  'command.edit.findReplace.label': ['찾아 바꾸기', 'Replace', 'Thay thế'],
  'command.edit.findReplace.splitLabel': ['찾아 바꾸기 ', 'Replace ', 'Thay thế '],
  'command.edit.goto.label': ['찾아가기', 'Go To', 'Đi đến'],
  'command.edit.goto.splitLabel': ['찾아가기 ', 'Go To ', 'Đi đến '],
  'command.edit.formatPaste.label': ['모양 붙이기', 'Paste Format', 'Dán định dạng'],

  // 편집 > 문서 이력 관리 (#4): what it is for, in the user's words
  'dialog.history.hint.text': [
    '지금 문서를 이 PC에 저장해 두었다가, 나중에 지금 문서와 비교해 바뀐 곳을 볼 수 있습니다.',
    'Keep the document as it is now on this PC, and later compare it with the current document to see what changed.',
    'Lưu tài liệu như hiện tại trên máy này, sau đó so sánh với tài liệu hiện tại để xem chỗ nào đã thay đổi.',
  ],
  'dialog.history.lab.text': ['이름', 'Name', 'Tên'],
  'dialog.history.labelInput.placeholder': [
    '비워 두면 저장한 시각',
    'Empty: the time it is saved',
    'Để trống: thời điểm lưu',
  ],
  'dialog.history.saveBtn.text': ['이력에 저장', 'Save to history', 'Lưu vào lịch sử'],
  'dialog.history.listTitle.text': [
    '저장한 이력 (눌러서 고르기)',
    'Saved history (click to choose)',
    'Lịch sử đã lưu (bấm để chọn)',
  ],
  'dialog.history.delBtn.text': ['고른 이력 지우기', 'Delete chosen', 'Xóa mục đã chọn'],
  'dialog.history.clrBtn.text': ['모두 지우기', 'Delete all', 'Xóa tất cả'],
  'dialog.history.cmpBtn.text': [
    '고른 이력과 지금 문서 비교',
    'Compare chosen with the current document',
    'So sánh mục đã chọn với tài liệu hiện tại',
  ],
  'dialog.history.onCompareWithCurrent.text': ['저장한 이력', 'Saved history', 'Lịch sử đã lưu'],
  'dialog.history.onCompareWithCurrent.text.x09d3e7': [
    '문단 위치로 맞춰 비교',
    'matched by position',
    'so theo vị trí',
  ],
  'dialog.history.onCompareWithCurrent.text.x9cae02': [
    '문단마다 맞춰 비교',
    'matched paragraph by paragraph',
    'so từng đoạn văn',
  ],
  'dialog.history.refreshList.text': [' · 예전 형식', ' · older format', ' · định dạng cũ'],
  'dialog.history.resultMetaEl.text': [
    '아직 비교하지 않았습니다.',
    'Not compared yet.',
    'Chưa so sánh.',
  ],
  'dialog.history.resultMetaEl.text.x63539d': [
    '비교할 이력을 목록에서 고르세요.',
    'Choose a saved entry to compare.',
    'Hãy chọn một mục đã lưu để so sánh.',
  ],
  'dialog.history.resultMetaEl.text.x907c5c': [
    '지울 이력을 목록에서 먼저 고르세요.',
    'Choose the entry to delete first.',
    'Hãy chọn mục cần xóa trước.',
  ],
  'dialog.history.resultMetaEl.text.xe65823': [
    '저장한 이력을 읽을 수 없습니다.',
    'The saved entry cannot be read.',
    'Không đọc được mục đã lưu.',
  ],
  'dialog.history.resultMetaEl.text.xf2c8ca': [
    '이력에 저장했습니다.',
    'Saved to history.',
    'Đã lưu vào lịch sử.',
  ],

  // 도구 > 환경 설정 (#5): no browser names, and the font sections said plainly
  'dialog.options.fontSetTitle.text': [
    '대표 글꼴 (언어별 글꼴 묶음)',
    'Font sets (a font for each language)',
    'Bộ phông (mỗi ngôn ngữ một phông)',
  ],
  'dialog.options.fontSetDesc.text': [
    '한글·영문·한자처럼 언어마다 쓸 글꼴을 하나로 묶어 두면, 글꼴 목록에서 한 번에 고를 수 있습니다.',
    'Pair a font for each script (Korean, Latin, Hanja …) and pick them together from the font list.',
    'Ghép một phông cho mỗi hệ chữ (Hàn, Latinh, Hán …) để chọn cùng lúc trong danh sách phông.',
  ],
  'dialog.options.fontSetBtn.text': ['글꼴 묶음 만들기', 'Create a font set', 'Tạo bộ phông'],
  'dialog.fontSet.title': ['대표 글꼴 (글꼴 묶음)', 'Font sets', 'Bộ phông'],
  'dialog.options.localTitle.text': ['이 PC 글꼴', 'Fonts on this PC', 'Phông trên máy này'],
  'dialog.options.localDesc.text': [
    '이 PC에 설치된 글꼴을 찾아 글꼴 목록에 넣습니다.',
    'Finds the fonts installed on this PC and adds them to the font list.',
    'Tìm các phông đã cài trên máy này và thêm vào danh sách phông.',
  ],
  'dialog.options.localBtn.text': [
    '이 PC 글꼴 찾기',
    'Find fonts on this PC',
    'Tìm phông trên máy',
  ],
  'dialog.options.localBtn.text.x827ff8': [
    '이 PC 글꼴 다시 찾기',
    'Find fonts on this PC again',
    'Tìm lại phông trên máy',
  ],
  'dialog.options.resetBtn.text': [
    '찾은 목록 지우기',
    'Clear the found list',
    'Xóa danh sách đã tìm',
  ],
  'dialog.options.localStatus.text.x4e6625': [
    '찾은 목록을 지우는 중...',
    'Clearing the found list...',
    'Đang xóa danh sách đã tìm...',
  ],
  'dialog.options.localStatus.text.xfd877c': ['찾는 중...', 'Searching...', 'Đang tìm...'],
  'dialog.options.localStatus.noStored': [
    '아직 찾지 않았습니다.',
    'Not searched yet.',
    'Chưa tìm.',
  ],
  'dialog.options.localStatus.noStoredFirefox': [
    '아직 찾지 않았습니다. 문서를 열 때 그 문서에 필요한 글꼴만 확인합니다.',
    'Not searched yet. When a document opens, only the fonts it needs are checked.',
    'Chưa tìm. Khi mở tài liệu, chỉ các phông tài liệu cần mới được kiểm tra.',
  ],
  'dialog.options.localStatus.text': [
    '이 PC의 글꼴 목록 전체를 읽을 수 없어, 문서를 열 때 그 문서에 필요한 글꼴만 확인합니다.',
    'The full list of fonts on this PC cannot be read; when a document opens, only the fonts it needs are checked.',
    'Không đọc được toàn bộ danh sách phông trên máy; khi mở tài liệu, chỉ các phông tài liệu cần mới được kiểm tra.',
  ],
  'dialog.options.localStatus.text.xc0a701': [
    '이 PC에서는 글꼴을 찾을 수 없습니다.',
    'The fonts on this PC cannot be searched.',
    'Không tìm được phông trên máy này.',
  ],
  'dialog.options.localStatus.unsupported': [
    '이 PC에서는 글꼴을 찾을 수 없습니다.',
    'The fonts on this PC cannot be searched.',
    'Không tìm được phông trên máy này.',
  ],
  'dialog.options.updateLocalStatus.label': [
    '찾은 목록을 확인하는 중...',
    'Checking the found list...',
    'Đang kiểm tra danh sách đã tìm...',
  ],
  'dialog.options.updateLocalStatus.label.x1ca5cc': [
    '찾은 목록을 지우지 못했습니다.',
    'Could not clear the found list.',
    'Không xóa được danh sách đã tìm.',
  ],
  'dialog.options.updateLocalStatus.label.x562451': [
    '찾은 목록을 읽지 못했습니다.',
    'Could not read the found list.',
    'Không đọc được danh sách đã tìm.',
  ],
  'dialog.options.updateLocalStatus.label.x97c46b': [
    '이 PC 글꼴 {p1}개를 찾았습니다.',
    'Found {p1} fonts on this PC.',
    'Đã tìm thấy {p1} phông trên máy.',
  ],
  'dialog.options.updateLocalStatus.label.xcbeff3': [
    '찾은 목록을 지웠습니다.',
    'Cleared the found list.',
    'Đã xóa danh sách đã tìm.',
  ],
  // the font check a document with unknown fonts may ask for: no browser, no extension storage
  'dialog.localFontsModal.privacy.text': [
    '이 문서에 필요한 글꼴만 이 PC에서 확인합니다. 결과는 이 PC에만 보관되고 밖으로 보내지 않습니다. 건너뛰면 비슷한 글꼴로 보여 줍니다.',
    'Only the fonts this document needs are checked on this PC. The result stays on this PC and is never sent anywhere. If you skip, similar fonts are shown.',
    'Chỉ các phông tài liệu này cần mới được kiểm tra trên máy. Kết quả chỉ lưu trên máy này và không gửi đi đâu. Nếu bỏ qua, phông tương tự sẽ được dùng.',
  ],
  'dialog.localFontsModal.privacy.text.x1d928d': [
    '이 PC의 글꼴 목록을 읽고, 목록에 없는 이 문서의 글꼴만 한 번 더 확인합니다. 결과는 이 PC에만 보관되고 밖으로 보내지 않습니다. 건너뛰면 비슷한 글꼴로 보여 줍니다.',
    "Reads this PC's font list and checks again only this document's fonts that are not on it. The result stays on this PC and is never sent anywhere. If you skip, similar fonts are shown.",
    'Đọc danh sách phông của máy và chỉ kiểm tra lại các phông của tài liệu không có trong danh sách. Kết quả chỉ lưu trên máy này và không gửi đi đâu. Nếu bỏ qua, phông tương tự sẽ được dùng.',
  ],
}

export const UX_STRINGS = {
  // 입력 > 수식 (#28)
  'hanpan.equation.cases': ['경우 나누기', 'Cases', 'Phân trường hợp'],
  'hanpan.equation.lim': ['극한', 'Limit', 'Giới hạn'],
  'hanpan.equation.modeTip': [
    '수식을 쓰는 문법입니다. 누르면 HWP와 LaTeX 사이에서 바뀝니다.',
    'The syntax the equation is written in. Click to switch between HWP and LaTeX.',
    'Cú pháp viết công thức. Bấm để chuyển giữa HWP và LaTeX.',
  ],
  'hanpan.equation.inputHint': [
    '여기에 수식을 입력하세요 (예: 1 over 2)',
    'Type the equation here (for example: 1 over 2)',
    'Nhập công thức ở đây (ví dụ: 1 over 2)',
  ],
  // 파일 > 제품 정보 (#6): the licences are in the app's own list, not a crate table
  'hanpan.about.licenses': [
    'rhwp가 쓰는 프로그램을 포함한 모든 라이선스와 저작권 고지는 한판의 오픈소스 라이선스 목록에 있습니다.',
    "Every licence and copyright notice, rhwp's components included, is in Hanpan's open-source licence list.",
    'Mọi giấy phép và thông báo bản quyền, kể cả các thành phần của rhwp, có trong danh sách giấy phép mã nguồn mở của Hanpan.',
  ],
  'hanpan.about.licensesButton': [
    '오픈소스 라이선스 보기',
    'View open-source licences',
    'Xem giấy phép mã nguồn mở',
  ],
  // 문서 이력 관리: nothing saved yet (#4)
  'hanpan.history.empty': [
    '저장한 이력이 없습니다. [이력에 저장]을 누르면 지금 문서가 여기에 남습니다.',
    'Nothing saved yet. Press "Save to history" to keep the document as it is now.',
    'Chưa có mục nào. Bấm "Lưu vào lịch sử" để giữ tài liệu như hiện tại.',
  ],
}

/** The words above in one language (0 Korean, 1 English, 2 Vietnamese), as APP_STRINGS holds them. */
export function uxStrings(index) {
  return Object.fromEntries(
    Object.entries({ ...UX_STRINGS, ...UX_CORRECTIONS }).map(([key, words]) => [key, words[index]]),
  )
}
