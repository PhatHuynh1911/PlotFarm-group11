# Bàn giao demo PlotFarm — 13/11/2026

## Khởi động

1. Cài Node.js 20.19+ hoặc 22.12+, SQL Server và database `PlotFarmDB`.
2. Trong `BE`, sao chép `.env.example` thành `.env`, điền kết nối SQL Server, chạy `npm install` và `npm start`.
3. Trong `FE`, chạy `npm install` và `npm run dev`. Mở `http://localhost:5173`; API mặc định ở cổng 5000.
4. Chỉ với database mới: chạy `schema.sql`, sau đó `seed.sql` bằng UTF-8. Không chạy lại các script khởi tạo trên dữ liệu đang sử dụng.
5. Database cũ: xem `migrations/20261023_feature_compat.sql`, `20261110_support_images.sql`. BE cũng bổ sung các cột tương thích khi khởi động. Migration `20261112_repair_service_demo_unicode.sql` chỉ sửa nội dung demo lỗi khi khớp điều kiện bảo vệ.

Không đưa `.env`, token hoặc dữ liệu upload riêng vào Git. QR/thanh toán hiện mô phỏng xác nhận, không có callback ngân hàng; không chuyển tiền thật trong demo.

## Kịch bản

Tài khoản seed đã đăng nhập kiểm tra thành công trên database local: Admin `admin.test@plotfarm.vn` / `Admin123!`; Farmer `farmer@plotfarm.vn` / `12345`; User `customer@plotfarm.vn` / `12345`. Đây là tài khoản demo, không dùng cho triển khai thật.

User thuê đất → xem QR/xác nhận thanh toán demo → Admin phân công → Farmer tiếp nhận, xác nhận gieo trồng, ghi nhật ký → Farmer báo sẵn sàng thu hoạch → User chọn cách nhận → Farmer bàn giao. Sau đó kiểm tra gia hạn/thanh toán, chọn vụ mới và đơn chưa thanh toán có thể hủy.

Để có dữ liệu độc lập, chạy trong `BE`:

```powershell
node scripts/demo-smoke.cjs --with-db --ui
```

Terminal in ba tài khoản QA và mật khẩu ngẫu nhiên cho lần chạy. Giữ terminal mở, nhập `done` khi kết thúc để dọn tài khoản, hợp đồng, ô đất và ảnh QA. Không đổi ngày canh tác của hợp đồng thật để thử thu hoạch.

## Kết quả đã xác nhận

- Backend đã restart với code mới; 123 kiểm tra API cùng SQL Server thật đạt, gồm đổi mật khẩu ba role, quyền truy cập, Unicode, ảnh hỗ trợ, hai vụ liên tiếp, gia hạn và hủy đơn.
- 41 test React đạt; build production thành công; lint không có lỗi, còn 14 cảnh báo có sẵn.
- Chrome thực tế: User thuê đất, QR/thanh toán, Admin phân công, Farmer tiếp nhận/ghi nhật ký/báo thu hoạch, User chọn nhận tại nông trại đều thành công.
- Đã xem form/menu điện thoại 360/390px và bảng/form tablet 768px. Bảng Admin cuộn trong khung. Chưa xác nhận đầy đủ mọi trang ở 1440px.
- Upload được kiểm tra qua API và React. Chưa hoàn tất thao tác chọn tệp bằng Windows do công cụ không điều khiển được hộp chọn ảnh; người dùng đã đóng hộp thoại để tiếp tục.
- Bước bàn giao cuối, hủy, gia hạn và vụ mới đã đạt qua API; chưa kiểm tra lại tất cả các bước này bằng thao tác UI trong phiên này.

## Các sửa lỗi trong đợt này

- Tìm ô đất theo mã/tên hiển thị, bỏ khoảng trắng đầu/cuối từ khóa.
- Farmer nhận phân công xong tự tải lại ô đất, không cần refresh trình duyệt.
- Vụ mới vẫn hiện cho Farmer khi hợp đồng còn bản ghi bàn giao của vụ trước.
- Tải dữ liệu/gieo trồng thành công không giữ thông báo lỗi cũ.

Lỗi dấu tiếng Việt trước đây nằm trong dữ liệu yêu cầu chăm sóc số 2, không phải font CSS. Kiểm thử gửi/lưu/đọc Unicode hiện đạt. Nếu database ở máy khác còn dữ liệu cũ, dùng migration sửa có điều kiện nêu trên.

## Chạy lại kiểm tra

```powershell
cd BE
node scripts/demo-smoke.cjs --with-db
```

Trong terminal khác:

```powershell
cd FE
npm test
npm run build
npm run lint
```

Chỉ chạy smoke test trên database phát triển. Script tạo dữ liệu QA riêng và dọn trong `finally`.
