/**
 * Text the studio's dialogs write straight into their markup instead of asking its catalogs
 * (비교·이력·수식·차트 데이터 …), under keys of the app's own: [Korean, English, Vietnamese].
 * Korean is the studio's own text, unchanged. The build patches the dialogs to ask for these
 * keys (scripts/studio-dialog-text.mjs); studio-locales.mjs registers them with every studio
 * language through APP_STRINGS.
 *
 * `{name}` is a placeholder the studio fills in; `$1`, `$2` are a regular expression's groups.
 */
import { SOURCE_STRINGS } from './source-strings.mjs'

export const DIALOG_STRINGS = {
  // 책갈피
  'hanpan.bookmark.defaultName': ['책갈피{count}', 'Bookmark{count}', 'DấuTrang{count}'],
  'hanpan.bookmark.renamePrompt': ['새 책갈피 이름:', 'New bookmark name:', 'Tên dấu trang mới:'],

  // 셀 테두리/배경: 대각선
  'hanpan.cellBorder.backSlashCenter': [
    '단순 역대각선',
    'Simple back diagonal',
    'Đường chéo ngược đơn',
  ],
  'hanpan.cellBorder.backSlashCenterBelow': [
    '아래쪽 분기 역대각선',
    'Back diagonal, branching below',
    'Đường chéo ngược, rẽ nhánh phía dưới',
  ],
  'hanpan.cellBorder.backSlashAll': [
    '전체 분기 역대각선',
    'Back diagonal, branching fully',
    'Đường chéo ngược, rẽ nhánh toàn bộ',
  ],
  'hanpan.cellBorder.slashCenter': ['단순 대각선', 'Simple diagonal', 'Đường chéo đơn'],
  'hanpan.cellBorder.slashCenterBelow': [
    '아래쪽 분기 대각선',
    'Diagonal, branching below',
    'Đường chéo, rẽ nhánh phía dưới',
  ],
  'hanpan.cellBorder.slashAll': [
    '전체 분기 대각선',
    'Diagonal, branching fully',
    'Đường chéo, rẽ nhánh toàn bộ',
  ],
  'hanpan.cellBorder.clearSlash': ['대각선 해제', 'Remove diagonal', 'Bỏ đường chéo'],
  'hanpan.cellBorder.clearBackSlash': [
    '역대각선 해제',
    'Remove back diagonal',
    'Bỏ đường chéo ngược',
  ],

  // 글꼴 목록
  'hanpan.font.webGroup': ['웹 글꼴', 'Web fonts', 'Phông web'],
  'hanpan.font.localGroup': ['로컬 글꼴', 'Local fonts', 'Phông trên máy'],
  'hanpan.font.fontSetGroup': ['대표 글꼴', 'Font sets', 'Bộ phông chữ'],

  // 선 종류 (글자 외곽선, 쪽 테두리)
  'hanpan.line.none': ['없음', 'None', 'Không'],
  'hanpan.line.solid': ['실선', 'Solid', 'Liền'],
  'hanpan.line.dotted': ['점선', 'Dotted', 'Chấm'],
  'hanpan.line.thick': ['굵은 선', 'Thick', 'Nét đậm'],
  'hanpan.line.dashed': ['파선', 'Dashed', 'Gạch ngang'],
  'hanpan.line.dashDot': ['일점쇄선', 'Dash-dot', 'Gạch chấm'],
  'hanpan.line.dashDotDot': ['이점쇄선', 'Dash-dot-dot', 'Gạch chấm chấm'],
  'hanpan.line.dashDotSpaced': ['일점 쇄선', 'Dash-dot', 'Gạch chấm'],
  'hanpan.line.dashDotDotSpaced': ['이점 쇄선', 'Dash-dot-dot', 'Gạch chấm chấm'],
  'hanpan.line.longDash': ['긴 파선', 'Long dash', 'Gạch dài'],
  'hanpan.line.double': ['이중선', 'Double', 'Đường đôi'],
  'hanpan.line.wavy': ['물결선', 'Wavy', 'Lượn sóng'],

  // 차트 데이터
  'hanpan.chartData.emptyCell': [
    '원본이 빈 값(결측)이라 이 자리는 고칠 수 없습니다 — 행을 새로 넣으면 값을 쓸 수 있습니다.',
    'The source has no value here (missing), so it cannot be edited. Insert a new row to enter values.',
    'Nguồn không có giá trị ở đây (bị thiếu) nên không sửa được. Hãy chèn hàng mới để nhập giá trị.',
  ],
  'hanpan.chartData.absentCell': [
    '원본에 이 계열의 값이 없던 자리입니다.',
    'The source had no value for this series here.',
    'Nguồn không có giá trị của chuỗi này ở vị trí này.',
  ],
  'hanpan.chartData.noName': [
    '이 계열은 이름 칸(c:tx)이 없어 이름을 넣을 자리가 없습니다.',
    'This series has no name cell (c:tx), so it cannot take a name.',
    'Chuỗi này không có ô tên (c:tx) nên không đặt tên được.',
  ],
  'hanpan.chartData.gridNote': [
    '셀을 우클릭하면 행·계열을 넣거나 지울 수 있습니다.',
    'Right-click a cell to insert or delete rows and series.',
    'Nhấp chuột phải vào ô để chèn hoặc xóa hàng và chuỗi.',
  ],
  'hanpan.chartData.pieExtraSeries': [
    '원형 차트는 첫 계열만 그리므로, 추가한 계열은 화면에 나타나지 않습니다.',
    'A pie chart draws only the first series, so added series do not appear.',
    'Biểu đồ tròn chỉ vẽ chuỗi đầu tiên nên chuỗi thêm vào sẽ không hiển thị.',
  ],
  'hanpan.chartData.candle': [
    '주식형 캔들은 첫·끝 계열을 몸통으로 삼습니다 — 양끝을 바꾸면 그림이 깨집니다.',
    'Stock candles use the first and last series as the body; changing either end breaks the chart.',
    'Nến chứng khoán lấy chuỗi đầu và cuối làm thân nến; đổi hai đầu sẽ làm hỏng biểu đồ.',
  ],
  'hanpan.chartData.multiLevelRows': [
    '다층 카테고리 차트는 행 구조를 바꿀 수 없습니다.',
    'The rows of a multi-level category chart cannot be changed.',
    'Không thể thay đổi cấu trúc hàng của biểu đồ danh mục nhiều cấp.',
  ],
  'hanpan.chartData.labelsDifferRows': [
    '계열마다 라벨이 달라 행 구조를 바꿀 수 없습니다.',
    'The rows cannot be changed because the series have different labels.',
    'Không thể thay đổi cấu trúc hàng vì mỗi chuỗi có nhãn khác nhau.',
  ],
  'hanpan.chartData.lastRow': [
    '마지막 행은 지울 수 없습니다.',
    'The last row cannot be deleted.',
    'Không thể xóa hàng cuối cùng.',
  ],
  'hanpan.chartData.lastSeries': [
    '마지막 계열은 지울 수 없습니다.',
    'The last series cannot be deleted.',
    'Không thể xóa chuỗi cuối cùng.',
  ],

  // 문서 비교·이력
  'hanpan.compare.title': ['문서 비교', 'Compare Documents', 'So sánh tài liệu'],
  'hanpan.compare.rightLoadFailed': [
    '오른쪽 문서 로드 실패',
    'Could not load the right-hand document',
    'Không tải được tài liệu bên phải',
  ],
  'hanpan.compare.rightLoadTimeout': [
    '오른쪽 문서 로드 타임아웃',
    'Loading the right-hand document timed out',
    'Hết thời gian tải tài liệu bên phải',
  ],
  'hanpan.history.title': ['문서 이력 관리', 'Document History', 'Quản lý lịch sử tài liệu'],
  'hanpan.diff.none': ['(없음)', '(none)', '(không có)'],
  'hanpan.diff.empty': ['(빈값)', '(empty)', '(trống)'],
  'hanpan.diff.textChanged': ['텍스트 변경', 'Text changed', 'Văn bản đã thay đổi'],
  'hanpan.diff.before': ['기존', 'Old', 'Cũ'],
  'hanpan.diff.after': ['변경', 'New', 'Mới'],
  'hanpan.diff.changes': ['변경값:', 'Changes:', 'Thay đổi:'],
  'hanpan.diff.changedCells': [
    '변경 셀 {count}개 (셀 미리보기 범위를 벗어나거나 텍스트가 길어 일부 생략됨)',
    '{count} changed cells (some left out: outside the cell preview or text too long)',
    '{count} ô đã thay đổi (lược bớt một phần: nằm ngoài vùng xem trước hoặc văn bản quá dài)',
  ],
  'hanpan.diff.propsHashChange': [
    '속성 해시: {before} → {after}',
    'Property hash: {before} → {after}',
    'Mã băm thuộc tính: {before} → {after}',
  ],
  'hanpan.diff.propsChanged': [
    '속성 값 변경',
    'Property values changed',
    'Giá trị thuộc tính đã thay đổi',
  ],
  'hanpan.diff.field.row': ['행', 'Rows', 'Hàng'],
  'hanpan.diff.field.col': ['열', 'Columns', 'Cột'],
  'hanpan.diff.field.text': ['텍스트', 'Text', 'Văn bản'],
  'hanpan.diff.field.cellText': ['셀 텍스트', 'Cell text', 'Văn bản ô'],
  'hanpan.diff.field.textHash': ['텍스트 해시', 'Text hash', 'Mã băm văn bản'],
  'hanpan.diff.field.propsHash': ['속성 해시', 'Property hash', 'Mã băm thuộc tính'],
  'hanpan.diff.field.size': ['크기', 'Size', 'Kích thước'],
  'hanpan.diff.field.signature': ['시그니처', 'Signature', 'Chữ ký'],
  'hanpan.diff.field.crop': ['자르기', 'Crop', 'Cắt'],
  'hanpan.diff.field.effect': ['효과', 'Effect', 'Hiệu ứng'],
  'hanpan.diff.field.brightnessContrast': [
    '밝기/대비',
    'Brightness/contrast',
    'Độ sáng/tương phản',
  ],
  'hanpan.diff.field.rotation': ['회전', 'Rotation', 'Xoay'],
  'hanpan.diff.field.flip': ['대칭', 'Flip', 'Lật'],
  'hanpan.diff.field.wrap': ['본문배치', 'Text wrapping', 'Bố trí với văn bản'],
  'hanpan.diff.field.layout': ['배치', 'Layout', 'Bố trí'],
  'hanpan.diff.field.relTo': ['기준', 'Relative to', 'Tương đối với'],
  'hanpan.diff.field.visual': ['시각 내용', 'Visual content', 'Nội dung hình ảnh'],
  'hanpan.diff.cropValue': [
    '좌{left}, 상{top}, 우{right}, 하{bottom}',
    'left {left}, top {top}, right {right}, bottom {bottom}',
    'trái {left}, trên {top}, phải {right}, dưới {bottom}',
  ],
  'hanpan.diff.degrees': ['{value}도', '{value}°', '{value}°'],
  'hanpan.diff.brightnessContrast': [
    '밝기 {brightness}, 대비 {contrast}',
    'brightness {brightness}, contrast {contrast}',
    'độ sáng {brightness}, tương phản {contrast}',
  ],
  'hanpan.diff.flipHorizontal': ['가로', 'Horizontal', 'Ngang'],
  'hanpan.diff.flipVertical': ['세로', 'Vertical', 'Dọc'],
  'hanpan.diff.flipBoth': ['가로+세로', 'Horizontal + vertical', 'Ngang + dọc'],
  'hanpan.diff.flipNone': ['없음', 'None', 'Không'],
  'hanpan.diff.kind.table': ['표', 'Table', 'Bảng'],
  'hanpan.diff.kind.shape': ['도형', 'Shape', 'Hình vẽ'],
  'hanpan.diff.kind.image': ['이미지', 'Image', 'Hình ảnh'],
  'hanpan.diff.kind.chart': ['그래프', 'Chart', 'Biểu đồ'],
  'hanpan.diff.kind.text': ['텍스트', 'Text', 'Văn bản'],
  'hanpan.diff.kind.meta': ['메타', 'Metadata', 'Siêu dữ liệu'],
  'hanpan.diff.cellsUnchanged': [
    '(셀 텍스트 동일)',
    '(cell text unchanged)',
    '(văn bản ô không đổi)',
  ],
  'hanpan.diff.cellAddress': ['$1행$2열', 'row $1, col $2', 'hàng $1, cột $2'],
  'hanpan.diff.moreCells': [
    '... 외 {count}개 셀',
    '... and {count} more cells',
    '... và {count} ô khác',
  ],

  // 수식 속성
  'hanpan.equationProps.treatAsChar': ['글자처럼 취급', 'Treat as character', 'Xem như ký tự'],
  'hanpan.caption.none': ['없음', 'None', 'Không'],
  'hanpan.caption.top': ['위', 'Above', 'Bên trên'],
  'hanpan.caption.bottom': ['아래', 'Below', 'Bên dưới'],
  'hanpan.caption.left': ['왼쪽', 'Left', 'Trái'],
  'hanpan.caption.right': ['오른쪽', 'Right', 'Phải'],

  // 누름틀
  'hanpan.field.defaultGuide': ['입력하세요', 'Type here', 'Nhập tại đây'],

  // 계산식 함수
  'hanpan.formula.sum': ['합계', 'Sum', 'Tổng'],
  'hanpan.formula.average': ['평균', 'Average', 'Trung bình'],
  'hanpan.formula.product': ['곱', 'Product', 'Tích'],
  'hanpan.formula.min': ['최소값', 'Minimum', 'Giá trị nhỏ nhất'],
  'hanpan.formula.max': ['최대값', 'Maximum', 'Giá trị lớn nhất'],
  'hanpan.formula.count': ['개수', 'Count', 'Số lượng'],
  'hanpan.formula.abs': ['절대값', 'Absolute value', 'Giá trị tuyệt đối'],
  'hanpan.formula.sqrt': ['제곱근', 'Square root', 'Căn bậc hai'],
  'hanpan.formula.round': ['반올림', 'Round', 'Làm tròn'],
  'hanpan.formula.ceiling': ['올림', 'Round up', 'Làm tròn lên'],
  'hanpan.formula.floor': ['내림', 'Round down', 'Làm tròn xuống'],
  'hanpan.formula.trunc': ['절삭', 'Truncate', 'Bỏ phần lẻ'],
  'hanpan.formula.mod': ['나머지', 'Remainder', 'Số dư'],
  'hanpan.formula.if': ['조건', 'Condition', 'Điều kiện'],
  'hanpan.formula.int': ['정수', 'Integer', 'Số nguyên'],
  'hanpan.formula.sign': ['부호', 'Sign', 'Dấu'],
  'hanpan.formula.exp': ['e 거듭제곱', 'Power of e', 'Lũy thừa của e'],
  'hanpan.formula.log': ['자연로그', 'Natural logarithm', 'Logarit tự nhiên'],
  'hanpan.formula.log10': ['상용로그', 'Common logarithm', 'Logarit thập phân'],
  'hanpan.formula.sin': ['사인', 'Sine', 'Sin'],
  'hanpan.formula.cos': ['코사인', 'Cosine', 'Cos'],
  'hanpan.formula.tan': ['탄젠트', 'Tangent', 'Tan'],

  // HML 열기·저장 안내
  'hanpan.hml.openedSavable': [
    'HML{version} 문서를 열었습니다. HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.',
    'Opened an HML{version} document. It can be saved as HML with its meaning kept, but not byte for byte as the original.',
    'Đã mở tài liệu HML{version}. Có thể lưu dạng HML giữ nguyên nội dung, nhưng không giống từng byte với bản gốc.',
  ],
  'hanpan.hml.openedNotSavable': [
    'HML{version} 문서를 열었습니다. 보존할 수 없는 요소가 있어 HML로는 저장할 수 없습니다. HWP 또는 HWPX로 저장하세요.',
    'Opened an HML{version} document. Some of it cannot be kept, so it cannot be saved as HML. Save it as HWP or HWPX.',
    'Đã mở tài liệu HML{version}. Có thành phần không giữ được nên không thể lưu dạng HML. Hãy lưu dạng HWP hoặc HWPX.',
  ],
  'hanpan.hml.unsupported': [
    '지원하지 않거나 변환된 요소 {count}건이 있습니다.',
    '{count} parts are unsupported or were converted.',
    'Có {count} thành phần không được hỗ trợ hoặc đã được chuyển đổi.',
  ],
  'hanpan.hml.more': ['그 외 {count}건', '{count} more', 'Và {count} mục khác'],
  'hanpan.hml.saveKeepsMeaning': [
    'HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.\n저장할 형식을 선택하세요.',
    'It can be saved as HML with its meaning kept, but not byte for byte as the original.\nChoose a format to save in.',
    'Có thể lưu dạng HML giữ nguyên nội dung, nhưng không giống từng byte với bản gốc.\nHãy chọn định dạng để lưu.',
  ],
  'hanpan.hml.saveUnavailable': [
    'HML 저장을 사용할 수 없습니다.',
    'Saving as HML is not available.',
    'Không thể lưu dạng HML.',
  ],
  'hanpan.hml.canSaveHwp': [
    'HWP 또는 HWPX로 저장할 수 있습니다.',
    'It can be saved as HWP or HWPX.',
    'Có thể lưu dạng HWP hoặc HWPX.',
  ],

  // 하이퍼링크
  'hanpan.hyperlink.needWebAddress': [
    'http:// 또는 https://로 시작하는 웹 주소를 입력해 주세요.',
    'Enter a web address that starts with http:// or https://.',
    'Hãy nhập địa chỉ web bắt đầu bằng http:// hoặc https://.',
  ],
  'hanpan.hyperlink.popupBlocked': [
    '팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.',
    'The pop-up was blocked. Allow pop-ups for this site.',
    'Cửa sổ bật lên đã bị chặn. Hãy cho phép cửa sổ bật lên cho trang này.',
  ],
  'hanpan.hyperlink.editLabel': ['하이퍼링크 고치기', 'Edit Hyperlink', 'Sửa siêu liên kết'],
  'hanpan.hyperlink.label': ['하이퍼링크', 'Hyperlink', 'Siêu liên kết'],

  // 환경 설정: 로컬 글꼴
  'hanpan.options.storageFailed': [
    '저장소 접근 실패: {error}',
    'Could not access storage: {error}',
    'Không truy cập được bộ nhớ: {error}',
  ],
  'hanpan.options.probeStored': [
    '문서별 확인 결과 저장됨: 사용 가능 {count}개 / 확인한 글꼴 {checked}개{date}',
    'Per-document check saved: {count} available / {checked} fonts checked{date}',
    'Đã lưu kết quả kiểm tra theo tài liệu: {count} khả dụng / đã kiểm tra {checked} phông{date}',
  ],
  'hanpan.options.localStored': [
    '로컬 글꼴 결과 저장됨: 사용 가능 {count}개 / 문서 후보 {checked}개 / 열거 누락 확인 {probed}개{date}',
    'Local font results saved: {count} available / {checked} document candidates / {probed} checked beyond the font list{date}',
    'Đã lưu kết quả phông trên máy: {count} khả dụng / {checked} ứng viên từ tài liệu / {probed} phông ngoài danh sách đã kiểm tra{date}',
  ],
  'hanpan.options.listStored': [
    '로컬 글꼴 열거 결과 저장됨: {count}개 · 문서별 누락 후보는 문서를 열 때 추가 확인{date}',
    'Local font list saved: {count} fonts · fonts a document needs beyond the list are checked when it opens{date}',
    'Đã lưu danh sách phông trên máy: {count} phông · phông tài liệu cần mà không có trong danh sách sẽ được kiểm tra khi mở tài liệu{date}',
  ],
  'hanpan.options.permissionDenied': [
    '로컬 글꼴 접근 권한이 허용되지 않았습니다. 브라우저 권한 설정에서 허용한 뒤 다시 시도해 주세요.',
    'Access to local fonts was not allowed. Allow it in the permission settings and try again.',
    'Chưa được cấp quyền truy cập phông trên máy. Hãy cho phép trong cài đặt quyền rồi thử lại.',
  ],
  'hanpan.options.detectFailed': [
    '글꼴 감지에 실패했습니다. 웹 대체 글꼴로 계속 사용할 수 있습니다.',
    'Font detection failed. You can keep working with the web substitute fonts.',
    'Không phát hiện được phông. Bạn vẫn có thể tiếp tục với phông web thay thế.',
  ],

  // 쪽 테두리/배경
  'hanpan.pageBorder.sideTop': ['위쪽', 'Top', 'Trên'],
  'hanpan.pageBorder.sideLeft': ['왼쪽', 'Left', 'Trái'],
  'hanpan.pageBorder.sideRight': ['오른쪽', 'Right', 'Phải'],
  'hanpan.pageBorder.sideBottom': ['아래쪽', 'Bottom', 'Dưới'],
  'hanpan.pageBorder.sideAll': ['모두', 'All', 'Tất cả'],
  'hanpan.pageBorder.patternNone': ['무늬 없음', 'No pattern', 'Không có mẫu'],
  'hanpan.pageBorder.patternHorizontal': ['가로선', 'Horizontal lines', 'Đường ngang'],
  'hanpan.pageBorder.patternVertical': ['세로선', 'Vertical lines', 'Đường dọc'],
  'hanpan.pageBorder.patternDiagonal': ['대각선', 'Diagonal lines', 'Đường chéo'],
  'hanpan.pageBorder.patternGrid': ['격자', 'Grid', 'Lưới'],

  // 스타일
  'hanpan.style.leftMargin': [
    '왼쪽 여백: {margin} pt&nbsp;&nbsp;&nbsp;첫 줄: {firstLine}',
    'Left margin: {margin} pt&nbsp;&nbsp;&nbsp;First line: {firstLine}',
    'Lề trái: {margin} pt&nbsp;&nbsp;&nbsp;Dòng đầu: {firstLine}',
  ],
  'hanpan.style.rightMargin': [
    '오른쪽 여백: {margin} pt&nbsp;&nbsp;&nbsp;정렬 방식: {align}',
    'Right margin: {margin} pt&nbsp;&nbsp;&nbsp;Alignment: {align}',
    'Lề phải: {margin} pt&nbsp;&nbsp;&nbsp;Căn lề: {align}',
  ],
  'hanpan.style.lineSpacing': ['줄 간격: {value}', 'Line spacing: {value}', 'Giãn dòng: {value}'],
  'hanpan.style.nextStyle': ['다음 스타일: {name}', 'Next style: {name}', 'Kiểu tiếp theo: {name}'],
  'hanpan.style.font': ['글꼴: {font}', 'Font: {font}', 'Phông: {font}'],
  'hanpan.style.size': ['크기: {size} pt', 'Size: {size} pt', 'Cỡ: {size} pt'],
  'hanpan.style.widthSpacing': [
    '장평: {ratio}%&nbsp;&nbsp;자간: {spacing}%',
    'Width: {ratio}%&nbsp;&nbsp;Spacing: {spacing}%',
    'Độ rộng: {ratio}%&nbsp;&nbsp;Giãn chữ: {spacing}%',
  ],
  'hanpan.style.newName': ['새 스타일', 'New Style', 'Kiểu mới'],

  // 표/셀 속성
  'hanpan.cell.vAlignTop': ['위쪽', 'Top', 'Trên'],
  'hanpan.cell.vAlignCenter': ['가운데', 'Center', 'Giữa'],
  'hanpan.cell.vAlignBottom': ['아래쪽', 'Bottom', 'Dưới'],
  'hanpan.cell.textHorizontal': ['가로쓰기', 'Horizontal', 'Ngang'],
  'hanpan.cell.textVertical': ['세로쓰기', 'Vertical', 'Dọc'],
  'hanpan.cell.gradientLinear': ['선형', 'Linear', 'Tuyến tính'],
  'hanpan.cell.gradientRadial': ['방사형', 'Radial', 'Tỏa tròn'],
  'hanpan.cell.gradientConical': ['원뿔형', 'Conical', 'Hình nón'],
  'hanpan.cell.gradientSquare': ['사각형', 'Rectangular', 'Hình chữ nhật'],

  // 줄/칸 추가·지우기
  'hanpan.tableRowColumn.rowAbove': [
    '위쪽에 줄 추가하기',
    'Insert row above',
    'Chèn hàng phía trên',
  ],
  'hanpan.tableRowColumn.rowBelow': [
    '아래쪽에 줄 추가하기',
    'Insert row below',
    'Chèn hàng phía dưới',
  ],
  'hanpan.tableRowColumn.colLeft': [
    '왼쪽에 칸 추가하기',
    'Insert column left',
    'Chèn cột bên trái',
  ],
  'hanpan.tableRowColumn.colRight': [
    '오른쪽에 칸 추가하기',
    'Insert column right',
    'Chèn cột bên phải',
  ],
  'hanpan.tableRowColumn.rows': ['줄', 'Rows', 'Hàng'],
  'hanpan.tableRowColumn.cols': ['칸', 'Columns', 'Cột'],
}

/** The table above and the studio's other text (source-strings.mjs) by language, as APP_STRINGS holds its words. */
export function dialogStrings(index) {
  return Object.fromEntries(
    Object.entries({ ...DIALOG_STRINGS, ...SOURCE_STRINGS }).map(([key, words]) => [
      key,
      words[index],
    ]),
  )
}
