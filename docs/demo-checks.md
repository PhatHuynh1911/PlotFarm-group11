# Kiểm tra trước demo PlotFarm

## Kết quả ngày 09/11/2026

- 91 kiểm tra HTTP API với SQL Server thật đã pass. Script tạo tài khoản và ô đất QA riêng, rồi xóa đúng dữ liệu của lần chạy trong `finally`.
- Đã kiểm tra quyền ba vai trò; thuê đất, thông tin VietQR, thanh toán mô phỏng, phân công, nhật ký, thu hoạch và giao nhận qua hai vụ liên tiếp.
- Đã kiểm tra đơn hủy không thể được kích hoạt lại, kể cả khi ô đất đã được người khác thuê; hợp đồng kết thúc không được thanh toán/gia hạn/chọn vụ mới.
- Thanh toán lặp/đồng thời không cộng phí gia hạn hai lần. Gia hạn tháng/ngày chỉ đổi thời hạn sau thanh toán; Admin duyệt gia hạn hoạt động.
- Khởi tạo database của BE không làm mất phân công hoặc đổi trạng thái vụ mới.
- Test React bao gồm đổi mật khẩu, ma trận Route Guard, phiên hết hạn/hỏng, API lỗi, ảnh hỏng, QR lỗi, toast, lỗi render và gửi yêu cầu chăm sóc bất đồng bộ.
- Build FE thành công. Lint còn 14 cảnh báo có sẵn; không có lỗi lint.

## Chạy lại

Khởi động BE với cấu hình SQL Server local trong `BE/.env`:

```powershell
cd BE
npm start
```

Trong terminal khác, chạy kiểm thử tích hợp (chỉ dùng database phát triển):

```powershell
cd BE
node scripts/demo-smoke.cjs --with-db
```

Script này cũng chạy lại hàm khởi tạo database như khi BE restart. Không chạy trên database production. Chỉ kiểm tra dữ liệu VietQR và thanh toán demo; không chuyển tiền qua ngân hàng.

Kiểm tra frontend:

```powershell
cd FE
npm test
npm run build
npm run lint
```

## Kiểm tra trực quan còn cần xác nhận

Đã rà soát CSS và sửa header cho ba vai trò, thanh điều hướng cuộn ngang, modal cuộn theo chiều cao màn hình, form hồ sơ và cỡ chữ input điện thoại. Test React chạy trong jsdom nên không xác nhận được bố cục, font và kích thước hiển thị thực tế.

Cần mở Chrome ở kích thước 360, 390, 768 và 1440px để xác nhận:

- Admin/User/Farmer: trang không bị cuộn ngang; mọi tab và menu tài khoản đều truy cập được. Bảng Admin được phép cuộn trong khung bảng.
- Modal thanh toán/gia hạn và form hồ sơ: xem được toàn bộ nội dung và nút thao tác.
- Ảnh lỗi có ảnh dự phòng; QR lỗi hiện thông báo. Toast không che nút đóng modal và văn bản tiếng Việt rõ ràng.
- Tắt BE rồi tải trang: thông báo lỗi và điều hướng vẫn hiển thị.

Tại thời điểm chạy test, browser connector báo `The browser access host is unavailable`; chưa xác nhận trực quan checklist này.
