/**
 * Text the studio writes in Korean outside its dialogs — context menus, the status bar while a
 * file loads, messages, file pickers, print and recovery, compare locations — under keys of
 * the app's own: [Korean, English, Vietnamese]. Korean is the studio's own text, unchanged.
 * The build patches the studio to ask for these keys (scripts/studio-dialog-text.mjs).
 *
 * `{name}` is a placeholder the studio fills in.
 */
export const SOURCE_STRINGS = {
  // the language tag dates are written in
  'hanpan.localeTag': ['ko-KR', 'en-US', 'vi-VN'],

  // context menus
  'hanpan.ctx.captionInsert': ['캡션 넣기(A)', 'Insert Caption(A)', 'Chèn chú thích(A)'],
  'hanpan.ctx.tableProps': ['표 속성...', 'Table Properties...', 'Thuộc tính bảng...'],
  'hanpan.ctx.tableAttach': ['표 붙이기', 'Join Tables', 'Nối bảng'],
  'hanpan.ctx.tableSplit': ['표 나누기', 'Split Table', 'Tách bảng'],
  'hanpan.ctx.group': ['개체 묶기(G)', 'Group(G)', 'Nhóm đối tượng(G)'],
  'hanpan.ctx.ungroup': ['개체 풀기(U)', 'Ungroup(U)', 'Bỏ nhóm(U)'],
  'hanpan.ctx.delete': ['지우기(D)', 'Delete(D)', 'Xóa(D)'],
  'hanpan.ctx.convertEquation': [
    '수식으로 변환하여 편집...',
    'Convert to Equation and Edit...',
    'Chuyển thành công thức rồi sửa...',
  ],
  'hanpan.ctx.editEquation': ['수식 편집...', 'Edit Equation...', 'Sửa công thức...'],
  'hanpan.ctx.editChartData': [
    '차트 데이터 편집...',
    'Edit Chart Data...',
    'Sửa dữ liệu biểu đồ...',
  ],
  'hanpan.ctx.bringToFront': ['맨 앞으로', 'Bring to Front', 'Đưa lên trên cùng'],
  'hanpan.ctx.bringForward': ['앞으로', 'Bring Forward', 'Đưa lên trên'],
  'hanpan.ctx.sendBackward': ['뒤로', 'Send Backward', 'Đưa xuống dưới'],
  'hanpan.ctx.sendToBack': ['맨 뒤로', 'Send to Back', 'Đưa xuống dưới cùng'],
  'hanpan.ctx.objectProps': [
    '개체 속성(P)...',
    'Object Properties(P)...',
    'Thuộc tính đối tượng(P)...',
  ],
  // named as the Table menu names it (0.17 UI/UX review v2, hwp-design #24)
  'hanpan.ctx.cellProps': ['표/셀 속성...', 'Table/Cell Properties...', 'Thuộc tính bảng/ô...'],
  'hanpan.ctx.borderEach': [
    '셀 테두리/배경 - 각 셀마다 적용(E)...',
    'Cell Borders/Shading - Each Cell(E)...',
    'Viền/Tô nền ô - Từng ô(E)...',
  ],
  'hanpan.ctx.borderOne': [
    '셀 테두리/배경 - 하나의 셀처럼 적용(Z)...',
    'Cell Borders/Shading - As One Cell(Z)...',
    'Viền/Tô nền ô - Như một ô(Z)...',
  ],
  'hanpan.ctx.formula': ['계산식(F)...', 'Formula(F)...', 'Công thức(F)...'],
  'hanpan.ctx.charShape': ['글자 모양', 'Character Formatting', 'Định dạng ký tự'],
  'hanpan.ctx.paraShape': ['문단 모양', 'Paragraph Formatting', 'Định dạng đoạn văn'],
  'hanpan.ctx.paraNumShape': [
    '문단 번호 모양(N)...',
    'Paragraph Numbering(N)...',
    'Kiểu đánh số đoạn(N)...',
  ],
  'hanpan.ctx.hyperlinkEdit': ['하이퍼링크 고치기...', 'Edit Hyperlink...', 'Sửa siêu liên kết...'],
  'hanpan.ctx.hyperlinkRemove': ['하이퍼링크 지우기', 'Remove Hyperlink', 'Xóa siêu liên kết'],
  'hanpan.ctx.fieldEdit': ['누름틀 고치기(E)...', 'Edit Field(E)...', 'Sửa trường(E)...'],
  'hanpan.ctx.fieldRemove': ['누름틀 지우기(J)', 'Remove Field(J)', 'Xóa trường(J)'],

  // confirmations
  'hanpan.field.deleteTitle': ['지우기', 'Delete', 'Xóa'],
  'hanpan.field.deleteConfirm': [
    '[누름틀]을 지울까요?',
    'Delete the [field]?',
    'Xóa [trường] này?',
  ],
  'hanpan.footnote.deleteTitle': ['각주 삭제', 'Delete Footnote', 'Xóa chú thích cuối trang'],
  'hanpan.footnote.deleteConfirm': [
    '각주를 삭제하시겠습니까?',
    'Delete this footnote?',
    'Xóa chú thích cuối trang này?',
  ],

  // pictures
  'hanpan.picture.noParagraph': [
    '그림을 넣을 문단을 찾지 못했습니다.',
    'Could not find a paragraph to put the picture in.',
    'Không tìm thấy đoạn văn để chèn hình.',
  ],
  'hanpan.picture.noParagraphHint': [
    '그림을 넣을 문단을 찾지 못했습니다.\n문서 본문이나 표 셀 안쪽을 다시 클릭하세요.',
    'Could not find a paragraph to put the picture in.\nClick inside the document body or a table cell again.',
    'Không tìm thấy đoạn văn để chèn hình.\nHãy bấm lại vào thân tài liệu hoặc bên trong ô bảng.',
  ],
  'hanpan.picture.noSize': [
    '이미지 크기를 확인할 수 없습니다.',
    'Could not read the image size.',
    'Không xác định được kích thước hình.',
  ],
  'hanpan.picture.noInsertInfo': [
    '삽입 위치 또는 이미지 정보를 확인할 수 없습니다.',
    'Could not determine where to insert the image or read it.',
    'Không xác định được vị trí chèn hoặc thông tin hình.',
  ],
  'hanpan.picture.insertFailed': [
    '그림 삽입에 실패했습니다.\n{reason}',
    'Could not insert the picture.\n{reason}',
    'Không chèn được hình.\n{reason}',
  ],
  'hanpan.picture.cannotInsert': [
    '그림을 삽입할 수 없습니다.\n브라우저가 이 이미지 파일을 읽지 못했습니다.',
    'The picture cannot be inserted.\nThe image file could not be read.',
    'Không thể chèn hình.\nKhông đọc được tệp hình này.',
  ],
  'hanpan.picture.unreadable': [
    '브라우저가 이 이미지 파일을 읽지 못했습니다.',
    'The image file could not be read.',
    'Không đọc được tệp hình này.',
  ],
  'hanpan.picture.cannotSet': [
    '그림을 지정할 수 없습니다.\n{reason}',
    'The picture cannot be set.\n{reason}',
    'Không thể đặt hình.\n{reason}',
  ],

  // table cell selection, in the status bar
  'hanpan.cellSel.cell': [
    '셀 선택 · 방향키로 이동',
    'Cell selection · arrow keys move',
    'Chọn ô · phím mũi tên để di chuyển',
  ],
  'hanpan.cellSel.range': [
    '셀 범위 선택 · 방향키로 확장',
    'Cell range selection · arrow keys extend',
    'Chọn vùng ô · phím mũi tên để mở rộng',
  ],
  'hanpan.cellSel.table': ['표 전체 선택', 'Whole table selected', 'Đã chọn toàn bộ bảng'],

  // hyperlinks
  'hanpan.hyperlink.reselect': [
    '편집 상태가 바뀌었습니다. 하이퍼링크를 다시 선택해 주세요.',
    'The editing state changed. Select the hyperlink again.',
    'Trạng thái chỉnh sửa đã thay đổi. Hãy chọn lại siêu liên kết.',
  ],
  'hanpan.hyperlink.whereEditable': [
    '본문·표 셀·글상자의 글자에서 하이퍼링크를 편집해 주세요.',
    'Edit hyperlinks on text in the body, a table cell or a text box.',
    'Hãy sửa siêu liên kết trên chữ trong thân văn bản, ô bảng hoặc hộp văn bản.',
  ],
  'hanpan.hyperlink.stateChanged': [
    '편집 상태가 바뀌었습니다. 대화상자를 닫고 다시 열어 주세요.',
    'The editing state changed. Close the dialog and open it again.',
    'Trạng thái chỉnh sửa đã thay đổi. Hãy đóng hộp thoại rồi mở lại.',
  ],
  'hanpan.hyperlink.documentChanged': [
    '문서 내용이 바뀌었습니다. 대화상자를 닫고 다시 열어 주세요.',
    'The document changed. Close the dialog and open it again.',
    'Nội dung tài liệu đã thay đổi. Hãy đóng hộp thoại rồi mở lại.',
  ],
  'hanpan.hyperlink.oneLine': [
    '표시할 글자를 한 줄로 입력해 주세요.',
    'Enter the text to display on one line.',
    'Hãy nhập chữ hiển thị trên một dòng.',
  ],
  'hanpan.hyperlink.cannotApply': [
    '하이퍼링크를 적용할 수 없습니다. 편집 모드를 확인해 주세요.',
    'The hyperlink cannot be applied. Check the editing mode.',
    'Không áp dụng được siêu liên kết. Hãy kiểm tra chế độ chỉnh sửa.',
  ],
  'hanpan.hyperlink.noCell': [
    '셀 위치를 확인할 수 없습니다.',
    'Could not determine the cell position.',
    'Không xác định được vị trí ô.',
  ],
  'hanpan.hyperlink.badNestedCell': [
    '중첩 셀 위치가 올바르지 않습니다.',
    'The nested cell position is not valid.',
    'Vị trí ô lồng nhau không hợp lệ.',
  ],
  'hanpan.hyperlink.noCaption': [
    '캡션의 하이퍼링크 편집은 아직 지원하지 않습니다.',
    'Editing hyperlinks in captions is not supported yet.',
    'Chưa hỗ trợ sửa siêu liên kết trong chú thích.',
  ],
  'hanpan.hyperlink.badPosition': [
    '하이퍼링크 위치가 올바르지 않습니다.',
    'The hyperlink position is not valid.',
    'Vị trí siêu liên kết không hợp lệ.',
  ],
  'hanpan.hyperlink.oneParagraph': [
    '한 문단 안의 글자를 선택해 주세요.',
    'Select text within one paragraph.',
    'Hãy chọn chữ trong một đoạn văn.',
  ],
  'hanpan.hyperlink.oneLink': [
    '하나의 하이퍼링크 안에서 편집해 주세요.',
    'Edit within a single hyperlink.',
    'Hãy sửa trong một siêu liên kết.',
  ],

  // files: save, print, export, pickers
  'hanpan.file.pagination': [
    '출력 전 페이지네이션을 완료하지 못했습니다 ({reason})',
    'Could not finish laying out the pages before printing ({reason})',
    'Không hoàn tất phân trang trước khi in ({reason})',
  ],
  'hanpan.file.passwordFormat': [
    '암호 설정 저장은 HWP 또는 HWPX 형식에서만 지원합니다.',
    'Saving with a password is supported only as HWP or HWPX.',
    'Chỉ hỗ trợ lưu có mật khẩu ở định dạng HWP hoặc HWPX.',
  ],
  'hanpan.file.unprotectTitle': ['보호 해제', 'Remove Protection', 'Bỏ bảo vệ'],
  'hanpan.file.unprotectHml': [
    'HML 형식은 문서 암호를 지원하지 않습니다. 암호 없이 저장하면 보호가 해제됩니다. 계속할까요?',
    'The HML format does not support document passwords. Saving without a password removes the protection. Continue?',
    'Định dạng HML không hỗ trợ mật khẩu tài liệu. Lưu không có mật khẩu sẽ bỏ bảo vệ. Tiếp tục?',
  ],
  'hanpan.file.hostSaves': [
    '저장은 호스트 애플리케이션이 담당합니다.',
    'Saving is done by the host application.',
    'Việc lưu do ứng dụng chủ thực hiện.',
  ],
  'hanpan.file.defaultName': ['문서', 'Document', 'Tài liệu'],
  'hanpan.file.openFailed': [
    '파일 열기에 실패했습니다:\n{message}',
    'Could not open the file:\n{message}',
    'Không mở được tệp:\n{message}',
  ],
  'hanpan.file.pickerHwp': ['HWP/HWPX/HML 문서', 'HWP/HWPX/HML documents', 'Tài liệu HWP/HWPX/HML'],
  'hanpan.file.hmlNotTarget': [
    'HML 원본 파일은 저장 대상으로 선택할 수 없습니다.',
    'An original HML file cannot be chosen to save into.',
    'Không thể chọn tệp HML gốc làm nơi lưu.',
  ],
  'hanpan.file.needExtension': [
    '{ext} 확장자를 가진 파일을 선택해야 합니다.',
    'Choose a file with the {ext} extension.',
    'Hãy chọn tệp có phần mở rộng {ext}.',
  ],
  'hanpan.file.saveHml': ['HML 문서', 'HML document', 'Tài liệu HML'],
  'hanpan.file.saveHwp': ['HWP 문서', 'HWP document', 'Tài liệu HWP'],
  'hanpan.file.saveHwpx': ['HWPX 문서', 'HWPX document', 'Tài liệu HWPX'],
  'hanpan.export.wordDoc': ['Word 문서(.doc)', 'Word document (.doc)', 'Tài liệu Word (.doc)'],
  'hanpan.export.sectionFailed': [
    '구역 {section} HTML 변환 실패: {message}',
    'Section {section}: HTML conversion failed: {message}',
    'Phần {section}: chuyển sang HTML thất bại: {message}',
  ],
  'hanpan.print.pdfGuidance': [
    '브라우저 인쇄 창에서 ‘대상 → PDF로 저장’을 선택합니다.',
    'In the print window, choose “Destination → Save as PDF”.',
    'Trong cửa sổ in, chọn “Đích → Lưu dưới dạng PDF”.',
  ],
  'hanpan.print.preparingPdf': ['PDF 준비 중…', 'Preparing PDF…', 'Đang chuẩn bị PDF…'],
  'hanpan.print.preparing': ['인쇄 준비 중…', 'Preparing to print…', 'Đang chuẩn bị in…'],
  'hanpan.print.pdfReady': [
    'PDF 준비 완료 — {guidance}',
    'PDF ready — {guidance}',
    'PDF đã sẵn sàng — {guidance}',
  ],
  'hanpan.print.ready': [
    '인쇄 미리보기 준비 완료',
    'Print preview ready',
    'Bản xem trước khi in đã sẵn sàng',
  ],
  'hanpan.print.popupBlocked': [
    '인쇄 미리보기 팝업이 차단되었습니다.',
    'The print preview pop-up was blocked.',
    'Cửa sổ xem trước khi in đã bị chặn.',
  ],
  'hanpan.print.frameTitle': ['인쇄 문서', 'Document to print', 'Tài liệu để in'],

  // the character diff a history item shows
  'hanpan.charDiff.tooLong': [
    '문자 diff 요약 생략(길이: {left}+{right})',
    'Character changes left out (length: {left}+{right})',
    'Bỏ qua tóm tắt thay đổi ký tự (độ dài: {left}+{right})',
  ],
  'hanpan.charDiff.tooLarge': [
    '문자 diff 요약 생략(과대: {n}×{m})',
    'Character changes left out (too large: {n}×{m})',
    'Bỏ qua tóm tắt thay đổi ký tự (quá lớn: {n}×{m})',
  ],
  'hanpan.charDiff.distance': [
    '편집거리 {distance} · {pattern}',
    'Edit distance {distance} · {pattern}',
    'Khoảng cách chỉnh sửa {distance} · {pattern}',
  ],

  // compare locations
  'hanpan.diffLoc.sectionPage': [
    '제 {section}구역, {page}쪽',
    'section {section}, page {page}',
    'phần {section}, trang {page}',
  ],
  'hanpan.diffLoc.section': ['제 {section}구역', 'section {section}', 'phần {section}'],
  'hanpan.diffLoc.leftRight': [
    '좌 {left}, 우 {right}',
    'left: {left}; right: {right}',
    'trái: {left}; phải: {right}',
  ],

  // character formatting
  'hanpan.charFormat.restorePartial': [
    '글자 서식 복원이 일부 완료되지 않았습니다. 실행 취소(Undo)로 복원을 다시 시도해 주세요.',
    'Some character formatting was not restored. Use Undo to try again.',
    'Một phần định dạng ký tự chưa được khôi phục. Hãy dùng Hoàn tác để thử lại.',
  ],
  'hanpan.charFormat.noDocument': [
    '문서가 로드되지 않았습니다. 문서를 먼저 열어 주세요.',
    'No document is loaded. Open a document first.',
    'Chưa tải tài liệu. Hãy mở tài liệu trước.',
  ],
  'hanpan.charFormat.needNewerEngine': [
    '구간별 글자 서식 복원을 지원하는 최신 WASM이 필요합니다. 문서를 저장한 뒤 앱을 새로고침해 주세요.',
    'Restoring character formatting by range needs a newer engine. Save the document and reload the app.',
    'Cần engine mới hơn để khôi phục định dạng ký tự theo vùng. Hãy lưu tài liệu rồi tải lại ứng dụng.',
  ],
  'hanpan.charFormat.applyFailed': [
    '글자 서식을 적용하지 못했습니다.',
    'Could not apply the character formatting.',
    'Không áp dụng được định dạng ký tự.',
  ],

  // charts
  'hanpan.chart.seriesName': ['계열 {n}', 'Series {n}', 'Chuỗi {n}'],

  // opening a file that is not a document
  'hanpan.signature.preview': [
    '실제 HWP/HWPX/HML 파일이 아닙니다. 파일 미리보기/오류 페이지가 반환되었습니다.',
    'This is not a real HWP/HWPX/HML file: a file preview or error page came back instead.',
    'Đây không phải tệp HWP/HWPX/HML thật: nhận được trang xem trước hoặc trang lỗi.',
  ],
  'hanpan.signature.plainXml': [
    'HML 문서가 아닌 일반 XML 파일입니다.',
    'This is a plain XML file, not an HML document.',
    'Đây là tệp XML thông thường, không phải tài liệu HML.',
  ],
  'hanpan.signature.unknown': [
    '실제 HWP/HWPX/HML 파일이 아닙니다. 파일 시그니처를 확인할 수 없습니다.',
    'This is not a real HWP/HWPX/HML file: its signature cannot be recognized.',
    'Đây không phải tệp HWP/HWPX/HML thật: không nhận ra chữ ký tệp.',
  ],

  // content a save could not keep
  'hanpan.loss.binaryData': [
    '그림·첨부 데이터',
    'Picture or attachment data',
    'Dữ liệu hình hoặc tệp đính kèm',
  ],
  'hanpan.loss.control': ['문서 개체', 'Document object', 'Đối tượng tài liệu'],
  'hanpan.loss.fieldParameters': ['필드 속성', 'Field properties', 'Thuộc tính trường'],
  'hanpan.loss.content': ['문서 내용', 'Document content', 'Nội dung tài liệu'],
  'hanpan.loss.more': [
    '• 그 밖의 손실 {count}건',
    '• {count} more losses',
    '• {count} mất mát khác',
  ],
  'hanpan.loss.notice': [
    '{format} 파일은 저장되었지만 일부 내용을 보존하지 못했습니다.',
    'The {format} file was saved, but some content could not be kept.',
    'Đã lưu tệp {format}, nhưng không giữ được một phần nội dung.',
  ],

  // HML saving
  'hanpan.hml.noSaveInfo': [
    'HML 저장 정보를 확인할 수 없습니다.',
    'The HML save information cannot be read.',
    'Không đọc được thông tin lưu HML.',
  ],
  'hanpan.hml.blocked': [
    '보존할 수 없는 요소가 있어 HML 저장이 차단되었습니다.',
    'Saving as HML is blocked because some parts cannot be kept.',
    'Không thể lưu dạng HML vì có thành phần không giữ được.',
  ],
  'hanpan.hml.notInEngine': [
    '현재 WASM 빌드는 HML 저장을 지원하지 않습니다.',
    'This engine build cannot save as HML.',
    'Bản engine này không lưu được dạng HML.',
  ],

  // page margins
  'hanpan.page.widthTooSmall': [
    '좌우 여백이 너무 커서 본문이 남지 않습니다 (본문 너비 {width}mm, 최소 {min}mm). 왼쪽·오른쪽·제본 여백을 줄여주세요.',
    'The left and right margins leave no room for the text (text width {width} mm, at least {min} mm). Make the left, right or gutter margin smaller.',
    'Lề trái và phải quá lớn nên không còn chỗ cho văn bản (chiều rộng {width} mm, tối thiểu {min} mm). Hãy giảm lề trái, phải hoặc gáy sách.',
  ],
  'hanpan.page.heightTooSmall': [
    '위아래 여백이 너무 커서 본문이 남지 않습니다 (본문 높이 {height}mm, 최소 {min}mm). 위쪽·아래쪽·머리말·꼬리말 여백을 줄여주세요.',
    'The top and bottom margins leave no room for the text (text height {height} mm, at least {min} mm). Make the top, bottom, header or footer margin smaller.',
    'Lề trên và dưới quá lớn nên không còn chỗ cho văn bản (chiều cao {height} mm, tối thiểu {min} mm). Hãy giảm lề trên, dưới, đầu trang hoặc chân trang.',
  ],

  // font set languages
  'hanpan.fontLang.korean': ['한글', 'Korean', 'Tiếng Hàn'],
  'hanpan.fontLang.english': ['영문', 'English', 'Tiếng Anh'],
  'hanpan.fontLang.hanja': ['한자', 'Hanja', 'Chữ Hán'],
  'hanpan.fontLang.japanese': ['일어', 'Japanese', 'Tiếng Nhật'],
  'hanpan.fontLang.other': ['외국어', 'Other', 'Ngoại ngữ khác'],
  'hanpan.fontLang.symbol': ['기호', 'Symbols', 'Ký hiệu'],
  'hanpan.fontLang.user': ['사용자', 'User', 'Người dùng'],

  // recent files
  'hanpan.recent.noHandle': [
    '"{name}"은(는) 핸들 없이 열려 자동 재열기가 불가합니다. 파일을 다시 선택하세요.',
    '"{name}" was opened without a file handle and cannot be reopened automatically. Choose the file again.',
    '"{name}" được mở không có quyền truy cập tệp nên không tự mở lại được. Hãy chọn lại tệp.',
  ],
  'hanpan.recent.denied': [
    '"{name}" 접근 권한이 거부되어 열 수 없습니다.',
    '"{name}" cannot be opened: access was denied.',
    'Không mở được "{name}": quyền truy cập bị từ chối.',
  ],
  'hanpan.recent.missing': [
    '"{name}" 파일을 찾을 수 없어 목록에서 제거했습니다.',
    '"{name}" was not found and was removed from the list.',
    'Không tìm thấy "{name}" nên đã xóa khỏi danh sách.',
  ],

  // recovery
  'hanpan.recovery.defaultName': ['문서.hwp', 'Document.hwp', 'Tài liệu.hwp'],
  'hanpan.recovery.defaultNameHml': ['문서.hml', 'Document.hml', 'Tài liệu.hml'],
  'hanpan.recovery.defaultNameHwpx': ['문서.hwpx', 'Document.hwpx', 'Tài liệu.hwpx'],
  'hanpan.recovery.fileName': [
    '{base} 복구본.hwp',
    '{base} (recovered).hwp',
    '{base} (khôi phục).hwp',
  ],
  'hanpan.recovery.savedAtUnknown': [
    '저장 시각 알 수 없음',
    'Save time unknown',
    'Không rõ thời gian lưu',
  ],
  'hanpan.recovery.sizeUnknown': ['크기 알 수 없음', 'Size unknown', 'Không rõ kích thước'],
  'hanpan.recovery.asHwp': [' → HWP 복구본', ' → recovered as HWP', ' → khôi phục dạng HWP'],
  'hanpan.recovery.title': ['문서 복구', 'Recover Documents', 'Khôi phục tài liệu'],
  'hanpan.recovery.lead': [
    '저장되지 않은 문서 복구본이 있습니다. 복구할 문서를 선택하세요.',
    'There are recovery copies of unsaved documents. Choose the one to recover.',
    'Có bản khôi phục của tài liệu chưa lưu. Hãy chọn tài liệu cần khôi phục.',
  ],
  'hanpan.recovery.note': [
    '복구해도 원본 파일을 자동으로 덮어쓰지 않습니다. 저장하려면 복구 후 직접 저장하세요.',
    'Recovering does not overwrite the original file. To keep it, save it yourself after recovering.',
    'Khôi phục không ghi đè tệp gốc. Để giữ lại, hãy tự lưu sau khi khôi phục.',
  ],
  'hanpan.recovery.restore': ['복구', 'Recover', 'Khôi phục'],
  'hanpan.recovery.later': ['나중에', 'Later', 'Để sau'],
  'hanpan.recovery.delete': ['삭제', 'Delete', 'Xóa'],
  'hanpan.recovery.deleteTip': [
    '복구 후보를 모두 삭제합니다.',
    'Deletes all recovery copies.',
    'Xóa tất cả bản khôi phục.',
  ],

  // history snapshots
  'hanpan.history.snapshotLabel': ['{date} 저장', 'Saved {date}', 'Lưu {date}'],

  // zoom
  'hanpan.zoom.enterCustom': [
    '사용자 정의 배율을 입력하세요.',
    'Enter a custom zoom.',
    'Hãy nhập tỷ lệ thu phóng tùy chỉnh.',
  ],
  'hanpan.zoom.number': [
    '사용자 정의 배율은 숫자로 입력하세요.',
    'Enter the custom zoom as a number.',
    'Hãy nhập tỷ lệ thu phóng tùy chỉnh bằng số.',
  ],
  'hanpan.zoom.integer': [
    '사용자 정의 배율은 정수로 입력하세요.',
    'Enter the custom zoom as a whole number.',
    'Hãy nhập tỷ lệ thu phóng tùy chỉnh bằng số nguyên.',
  ],
  'hanpan.zoom.range': [
    '{min}~{max}% 사이의 배율을 입력하세요.',
    'Enter a zoom between {min}% and {max}%.',
    'Hãy nhập tỷ lệ từ {min}% đến {max}%.',
  ],

  // loading, status bar, messages (main)
  'hanpan.main.autosaving': [
    '복구용 자동 저장 중...',
    'Saving a recovery copy...',
    'Đang tự lưu bản khôi phục...',
  ],
  'hanpan.main.autosaved': [
    '복구용 자동 저장 완료 ({size})',
    'Recovery copy saved ({size})',
    'Đã tự lưu bản khôi phục ({size})',
  ],
  'hanpan.main.autosaveProtected': [
    '보호 문서는 복구용 자동 저장을 하지 않습니다',
    'No recovery copy is kept for a protected document',
    'Không tự lưu bản khôi phục cho tài liệu được bảo vệ',
  ],
  'hanpan.main.autosaveFailed': [
    '복구용 자동 저장 실패',
    'Saving the recovery copy failed',
    'Tự lưu bản khôi phục thất bại',
  ],
  'hanpan.main.loadingPercent': [
    '파일 로딩 {percent}% - {label}',
    'Loading file {percent}% - {label}',
    'Đang tải tệp {percent}% - {label}',
  ],
  'hanpan.main.localFonts': [
    '로컬 폰트 준비 중...',
    'Preparing local fonts...',
    'Đang chuẩn bị phông trên máy...',
  ],
  'hanpan.main.webFonts': ['웹폰트 로딩 중...', 'Loading web fonts...', 'Đang tải phông web...'],
  'hanpan.main.engineLoading': ['WASM 로딩 중...', 'Loading the engine...', 'Đang tải engine...'],
  'hanpan.main.canvasKitLoading': [
    'CanvasKit 로딩 중...',
    'Loading the renderer...',
    'Đang tải bộ hiển thị...',
  ],
  'hanpan.main.chooseFile': [
    'HWP 파일을 선택해주세요.',
    'Choose an HWP file.',
    'Hãy chọn tệp HWP.',
  ],
  'hanpan.main.unsupportedFile': [
    '지원하지 않는 파일 형식입니다: {name}. HWP/HWPX/HML 파일만 지원합니다.',
    'Unsupported file type: {name}. Only HWP/HWPX/HML files are supported.',
    'Định dạng tệp không được hỗ trợ: {name}. Chỉ hỗ trợ tệp HWP/HWPX/HML.',
  ],
  'hanpan.main.engineFailed': [
    'WASM 초기화 실패: {error}',
    'The engine could not start: {error}',
    'Không khởi động được engine: {error}',
  ],
  'hanpan.main.onlyHwp': [
    'HWP/HWPX/HML 파일만 지원합니다.',
    'Only HWP/HWPX/HML files are supported.',
    'Chỉ hỗ trợ tệp HWP/HWPX/HML.',
  ],
  'hanpan.main.onlyHwpOrImage': [
    'HWP/HWPX/HML 파일 또는 이미지 파일만 지원합니다.',
    'Only HWP/HWPX/HML files or image files are supported.',
    'Chỉ hỗ trợ tệp HWP/HWPX/HML hoặc tệp hình ảnh.',
  ],
  'hanpan.main.fieldStatus': ['[누름틀] {label}', '[Field] {label}', '[Trường] {label}'],
  'hanpan.main.fontsPreparing': ['폰트 준비 중...', 'Preparing fonts...', 'Đang chuẩn bị phông...'],
  'hanpan.main.fontsLoading': [
    '파일 로딩 {percent}% - 폰트 로딩 중... ({loaded}/{total})',
    'Loading file {percent}% - loading fonts... ({loaded}/{total})',
    'Đang tải tệp {percent}% - đang tải phông... ({loaded}/{total})',
  ],
  'hanpan.main.applyingState': [
    '문서 상태 적용 중...',
    'Applying the document state...',
    'Đang áp dụng trạng thái tài liệu...',
  ],
  'hanpan.main.preparingRender': [
    '페이지 렌더 준비 중...',
    'Preparing to draw the pages...',
    'Đang chuẩn bị hiển thị trang...',
  ],
  'hanpan.main.preparingToolbar': [
    '도구 모음 준비 중...',
    'Preparing the toolbar...',
    'Đang chuẩn bị thanh công cụ...',
  ],
  'hanpan.main.checking': [
    '문서 검증 및 글꼴 확인 중...',
    'Checking the document and fonts...',
    'Đang kiểm tra tài liệu và phông...',
  ],
  'hanpan.main.initEditing': [
    '편집 상태 초기화 중...',
    'Setting up editing...',
    'Đang khởi tạo chế độ chỉnh sửa...',
  ],
  'hanpan.main.initError': [
    '초기화 오류: {error}',
    'Start-up error: {error}',
    'Lỗi khởi tạo: {error}',
  ],
  'hanpan.main.openCancelled': [
    '문서 열기가 취소되었습니다.',
    'Opening the document was cancelled.',
    'Đã hủy mở tài liệu.',
  ],
  'hanpan.main.unsupportedEncryption': [
    '지원하지 않는 암호화 방식의 문서입니다. 지원되는 HWP3/HWP5 암호 문서만 열 수 있습니다.',
    'This document uses an unsupported encryption. Only HWP3/HWP5 password documents can be opened.',
    'Tài liệu dùng kiểu mã hóa không được hỗ trợ. Chỉ mở được tài liệu có mật khẩu HWP3/HWP5.',
  ],
  'hanpan.main.drm': [
    'DRM으로 보호된 문서는 지원하지 않습니다.',
    'Documents protected by DRM are not supported.',
    'Không hỗ trợ tài liệu được bảo vệ bằng DRM.',
  ],
  'hanpan.main.encryptedFailed': [
    '암호화된 문서를 열 수 없습니다. 문서가 손상되었는지 확인하세요.',
    'The encrypted document cannot be opened. Check whether it is damaged.',
    'Không mở được tài liệu đã mã hóa. Hãy kiểm tra tài liệu có bị hỏng không.',
  ],
  'hanpan.main.passwordRetry': [
    '암호가 일치하지 않거나 문서가 손상되었습니다. 다시 입력하세요.',
    'The password does not match or the document is damaged. Enter it again.',
    'Mật khẩu không khớp hoặc tài liệu bị hỏng. Hãy nhập lại.',
  ],
  'hanpan.main.openCancelledStatus': [
    '문서 열기를 취소했습니다.',
    'Opening the document was cancelled.',
    'Đã hủy mở tài liệu.',
  ],
  'hanpan.main.reading': ['파일 읽는 중...', 'Reading the file...', 'Đang đọc tệp...'],
  'hanpan.main.readDone': ['파일 읽기 완료', 'File read', 'Đã đọc tệp'],
  'hanpan.main.preparingData': [
    '문서 데이터 준비 중...',
    'Preparing the document data...',
    'Đang chuẩn bị dữ liệu tài liệu...',
  ],
  'hanpan.main.parsing': [
    '문서 파싱 및 쪽 계산 중...',
    'Reading the document and laying out pages...',
    'Đang đọc tài liệu và tính trang...',
  ],
  'hanpan.main.autosavePrep': [
    '자동 저장 준비 중...',
    'Preparing autosave...',
    'Đang chuẩn bị tự lưu...',
  ],
  'hanpan.main.initDocument': [
    '문서 초기화 중...',
    'Setting up the document...',
    'Đang khởi tạo tài liệu...',
  ],
  'hanpan.main.moreRecent': [
    '최근 문서 더보기 ({count}개)',
    'More recent documents ({count})',
    'Thêm tài liệu gần đây ({count})',
  ],
  'hanpan.main.clearRecent': [
    '최근 문서 목록 지우기',
    'Clear Recent Documents',
    'Xóa danh sách tài liệu gần đây',
  ],
  'hanpan.main.recoveryDeleted': [
    '복구 후보를 삭제했습니다.',
    'The recovery copies were deleted.',
    'Đã xóa các bản khôi phục.',
  ],
  'hanpan.main.recoveryOpened': [
    '"{name}" 복구본을 열었습니다.\n원본 파일은 자동으로 덮어쓰지 않습니다.',
    'Opened the recovery copy of "{name}".\nThe original file is not overwritten automatically.',
    'Đã mở bản khôi phục của "{name}".\nTệp gốc không bị ghi đè tự động.',
  ],
  'hanpan.main.creatingNew': [
    '새 문서 생성 중...',
    'Creating a new document...',
    'Đang tạo tài liệu mới...',
  ],
  'hanpan.main.createFailed': [
    '새 문서 생성 실패: {error}',
    'Could not create a new document: {error}',
    'Không tạo được tài liệu mới: {error}',
  ],
  'hanpan.main.loadingFile': ['파일 로딩 중...', 'Loading the file...', 'Đang tải tệp...'],
  'hanpan.main.fileUrlAccess': [
    '로컬 파일을 열려면 확장 프로그램의 "파일 URL에 대한 액세스 허용"을 켜야 합니다.\n설정에서 권한을 허용한 뒤 파일을 다시 열어 주세요.',
    'To open local files, turn on "Allow access to file URLs" for the extension.\nAllow it in the settings, then open the file again.',
    'Để mở tệp trên máy, hãy bật "Cho phép truy cập URL tệp" cho tiện ích.\nCho phép trong cài đặt rồi mở lại tệp.',
  ],
  'hanpan.main.fileUrlStatus': [
    '파일 로드 실패: 파일 URL 액세스 권한이 필요합니다.',
    'Could not load the file: access to file URLs is needed.',
    'Không tải được tệp: cần quyền truy cập URL tệp.',
  ],
  'hanpan.main.ok': ['확인', 'OK', 'OK'],
  'hanpan.main.openSettings': ['설정 열기', 'Open Settings', 'Mở cài đặt'],
  'hanpan.main.loadFailed': [
    '파일 로드 실패: {error}',
    'Could not load the file: {error}',
    'Không tải được tệp: {error}',
  ],
}
