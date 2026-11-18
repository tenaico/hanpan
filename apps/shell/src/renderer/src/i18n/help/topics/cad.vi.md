# Bản vẽ AI

Bản vẽ AI là thẻ dành cho các mô hình 3D và bản vẽ đơn giản. Bạn có thể mở bản vẽ người khác gửi để xem kích thước, tự tay dựng một mô hình nhỏ hoặc nhờ AI làm, rồi đưa bản vẽ kích thước vào tài liệu Hangul hay Word. Bản vẽ được lưu thành tệp .ttukcad, và mọi độ dài đều tính bằng milimét.

## Mở bản vẽ

- Để tạo bản vẽ mới, ở trang chủ hãy mở **Tất cả ứng dụng** rồi nhấn **Bản vẽ AI**. Thẻ mới có tên **Bản vẽ chưa có tiêu đề**.
- Để mở tệp, dùng **Tệp › Mở…** (Ctrl+O) hoặc kéo tệp vào cửa sổ. Bản vẽ AI mở được tệp .ttukcad, DXF, STL, OBJ, 3MF, GLB và PLY.
- Tệp không phải .ttukcad sẽ mở thành một bản vẽ mới chưa có tên, mang tên của tệp đó. Tệp gốc không bao giờ bị thay đổi: khi lưu, ứng dụng luôn hỏi tên cho một tệp .ttukcad mới.
- Tệp DWG, STEP, IGES và BREP do các phần mềm CAD chuyên nghiệp tạo ra và không đọc được. Thay vào đó, bạn sẽ thấy **Cách mở tệp này**: hãy nhờ người gửi gửi lại bằng DXF (cho bản vẽ 2D) hoặc STL (cho mô hình 3D).
- Tệp lớn hơn 100 MB, hoặc mô hình có hơn 2 triệu tam giác, sẽ không mở được.

## Đặt hình

- **Trang chủ › Đặt hình** chứa 4 hình hay dùng nhất; **Thêm** mở bộ sưu tập đủ 15 hình: hộp, hình trụ, hình cầu, hình nón, hình chóp, hình nêm, bán cầu, ống, hình xuyến, lăng trụ tam giác, lăng trụ lục giác, hộp bo góc, lăng trụ ngôi sao, mái nhà và chữ.
- Hình mới xuất hiện ở giữa mặt làm việc, tức tấm nền mà mô hình đứng lên trên. Bấm vào một hình để chọn nó; giữ Shift hoặc Ctrl khi bấm để chọn thêm hình khác.
- **Xem › Tay nắm** quyết định tay nắm trên hình đang chọn dùng để làm gì: **Di chuyển**, **Xoay** hay **Kích thước**. Khi kéo, hình bám theo từng 1 mm và 15°; giữ Alt trong lúc kéo để tắt chế độ bám.
- Bảng **Thuộc tính** bên phải cho biết hình đang chọn: tên, loại (đặc hay lỗ), kích thước, vị trí (mm), góc xoay (°) và màu. Gõ số để đổi giá trị. **Ẩn** và **Khóa** giúp gạt một hình sang bên cho khỏi vướng.
- **Xem › Hướng nhìn** xoay camera về **Trên**, **Trước** hoặc **Bên**, còn **Hiện tất cả** đưa toàn bộ mô hình vừa khung hình. Kéo trong khung nhìn để xoay, dùng con lăn chuột để phóng to thu nhỏ.
- Dòng trạng thái ở dưới cùng cho biết kích thước mặt làm việc, bước bám và ô lưới, cùng chiều rộng × chiều sâu × chiều cao của hình đang chọn.

## Lỗ, nhóm và căn chỉnh

- Lỗ là một hình dùng để khoét. Chọn một hình rồi nhấn **Lỗ** (hoặc H) để biến nó thành lỗ; nhấn lần nữa để nó trở lại thành hình đặc.
- Lỗ chỉ khoét được bên trong một nhóm. Chọn lỗ cùng các hình đặc cần khoét, rồi nhấn **Nhóm** (Ctrl+G): nhóm sẽ là các hình đặc trừ đi các lỗ. **Bỏ nhóm** (Ctrl+Shift+G) tách nhóm ra.
- **Căn chỉnh** xếp các hình đang chọn thẳng hàng với hình bạn chọn đầu tiên: trái, giữa hoặc phải; trước, giữa hoặc sau; đáy, giữa hoặc đỉnh.
- Ví dụ: một hình trụ đường kính 80 mm và một hình trụ lỗ đường kính 68 mm được nâng lên 5 mm, chọn cả hai rồi nhóm lại, sẽ thành một chiếc cốc có đáy dày 5 mm.

## Tự vẽ và chữ

- **Tự vẽ** dùng để vẽ đường viền theo ý bạn. Bấm lên mặt làm việc để đặt ít nhất 3 điểm; **Hoàn tác điểm** bỏ điểm vừa đặt.
- Nhập **Chiều cao (mm)** rồi nhấn **Đóng hình**: đường viền dựng đứng lên thành một khối đặc. **Hủy** thoát ra mà không tạo gì cả.
- Các đường cắt nhau sẽ không được chấp nhận. Hãy hoàn tác điểm cho đến khi chúng không còn cắt nhau.
- **Chữ** hỏi bạn nội dung cần đặt và biến nó thành chữ khối, dùng phông chữ đi kèm GenOffice.

## Đo và bản vẽ kích thước

- **Đo** cho biết khoảng cách giữa hai điểm bạn bấm, độ dài một đoạn thẳng hoặc đường kính một hình tròn. Điểm tự bám vào góc, đầu đoạn thẳng và tâm hình tròn. Nhấn Esc để xóa kết quả đo.
- **Bản vẽ kích thước** vẽ mô hình nhìn từ phía trước, từ trên xuống và từ bên cạnh trên một tờ A4, kèm chiều rộng, chiều sâu và chiều cao tổng thể, một tỷ lệ vừa trang (1:1, 1:2, 1:5, 1:10 …) và khung tên ghi tên, ngày và tỷ lệ. Bản vẽ lấy từ tệp DXF chỉ có hình nhìn từ trên xuống.
- Trong bản vẽ kích thước, **Sao chép hình** đưa nó vào bộ nhớ tạm. Sau đó dán vào thẻ Hangul, Word hoặc PowerPoint.
- **Gửi sang Hangul** mở một tài liệu Hangul mới có bản vẽ và một bảng liệt kê các hình cùng kích thước của chúng. Khi **Tính năng tài liệu Hàn Quốc** đang tắt trong Cài đặt, nút này hiện là **Gửi sang Word** và tạo tài liệu Word thay thế.

## Trợ lý AI

- Bảng AI bên cạnh bản vẽ có thể đặt hình, đổi kích thước và vị trí, tạo lỗ, nhóm, căn chỉnh, đặt kích thước mặt làm việc và tóm tắt mô hình. Một vài yêu cầu bạn có thể thử:
  - "Làm một ống cắm bút rộng 80 mm, cao 100 mm, khoét rỗng bên trong với đường kính 68 mm"
  - "Biến mặt làm việc thành một căn phòng 5 × 4 m và đặt bốn chiếc bàn làm việc"
  - "Căn các hình đang chọn sang trái"
- Mọi thay đổi của một yêu cầu đều được trả lại chỉ bằng một lần **Hoàn tác** (Ctrl+Z), dù yêu cầu đó đụng đến bao nhiêu hình.
- AI nhận yêu cầu của bạn và bản tóm tắt mô hình (tên, loại, kích thước và vị trí của từng hình). AI không thể lưu, mở, xuất hay gửi tệp; những việc đó vẫn do bạn làm.
- Để đưa cho AI bảng thông số hoặc bản phác, hãy đính kèm bằng nút kẹp giấy dưới ô nhập, kéo vào bảng hoặc dán hình (Ctrl+V). AI đọc và dựng theo đó; tệp không bao giờ đi vào bản vẽ, và yêu cầu đó vẫn hoàn tác trong một bước.

## Lưu và khôi phục

- **Lưu** (Ctrl+S) ghi ra tệp .ttukcad. Bản vẽ AI chỉ lưu ở định dạng này; **Lưu thành…** (Ctrl+Shift+S) để chọn tên hoặc nơi lưu mới.
- **Tự động lưu** ở phía trên sẽ lưu mỗi 30 giây và mỗi khi bạn chuyển sang cửa sổ khác, sau khi bản vẽ đã có tệp riêng.
- Nếu GenOffice bị đóng bất ngờ, lần mở tiếp theo bản vẽ sẽ nằm trong danh sách **Tài liệu còn nội dung chưa lưu**. Nhấn **Khôi phục** để lấy lại.

## Xuất tệp

- **Tệp › Xuất STL** và **Xuất OBJ** ghi mô hình ra tệp cho máy in 3D hoặc phần mềm khác. **Xuất hình ảnh (PNG)** lưu những gì khung nhìn đang hiển thị, trên nền sáng.
- Việc xuất không bao giờ ghi đè lên tệp gốc của bản vẽ.

## Phím tắt

| Phím                     | Tác dụng                       |
| ------------------------ | ------------------------------ |
| Ctrl+Z                   | Hoàn tác                       |
| Ctrl+Y hoặc Ctrl+Shift+Z | Làm lại                        |
| Ctrl+S                   | Lưu                            |
| Ctrl+A                   | Chọn tất cả                    |
| Delete                   | Xóa                            |
| Ctrl+D                   | Nhân bản                       |
| Ctrl+G                   | Nhóm                           |
| Ctrl+Shift+G             | Bỏ nhóm                        |
| H                        | Lỗ ↔ đặc                       |
| Phím mũi tên             | Dời 1 mm (giữ Shift dời 10 mm) |
| Giữ Alt khi kéo          | Tắt chế độ bám                 |

**Trợ giúp › Phím tắt** hiện cùng danh sách này ngay trong thẻ.

## Những việc chưa làm được

- Mở trực tiếp tệp DWG, STEP, IGES hoặc BREP. Hãy xin tệp DXF hoặc STL thay thế.
- Ràng buộc, lịch sử thiết kế hay lắp ráp như trong phần mềm CAD chuyên nghiệp. Mỗi hình được xác định bằng các con số của riêng nó.
- In. Hãy gửi bản vẽ kích thước sang tài liệu Hangul hoặc Word rồi in từ đó.
