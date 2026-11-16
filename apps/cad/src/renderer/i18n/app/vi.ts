import type { zh } from './zh'

export const vi = {
  untitled: 'Bản vẽ không tên',
  saved: 'Đã lưu',
  unsaved: 'Chưa lưu',
  noWebGlTitle: 'Không thể hiển thị chế độ xem 3D',
  noWebGlBody:
    'Máy tính này không khởi động được WebGL mà chế độ xem 3D cần. Bản vẽ vẫn mở và lưu được nhưng không hiển thị được. Hãy thử một trong các cách sau rồi mở lại thẻ:',
  noWebGlDriver: 'Cập nhật trình điều khiển card đồ họa.',
  noWebGlAccel: 'Bật tăng tốc phần cứng trong cài đặt đồ họa.',
  noticeNotOk:
    'Không thể mở tệp này dưới dạng bản vẽ. Tệp có thể bị hỏng hoặc được tạo bằng phiên bản mới hơn. Đã mở một bản vẽ trống; khi lưu sẽ hỏi tệp mới.',
  noticeTooLarge: 'Tệp quá lớn để mở (giới hạn 100 MB). Đã mở một bản vẽ trống.',
  noticeUnreadable: 'Không đọc được tệp này. Đã mở một bản vẽ trống.',
  noticeUnsupported: 'Không thể mở loại tệp này ở đây. Có thể mở tệp .ttukcad, .dxf, .stl và .obj.',
  noticeImportFailed: 'Không đọc được các hình trong tệp này. Đã mở một bản vẽ trống.',
  saveRefused:
    'Không thể lưu bản vẽ. Các thay đổi của bạn vẫn còn; hãy thử lại hoặc dùng Lưu thành.',
  saveFailed:
    'Đã xảy ra lỗi khi lưu bản vẽ. Các thay đổi của bạn vẫn còn; hãy thử lại hoặc dùng Lưu thành.',
} satisfies Record<keyof typeof zh, string>
