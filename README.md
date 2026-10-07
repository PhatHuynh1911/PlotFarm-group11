#  Eleven PlotFarm 

Nền tảng cho thuê ô đất canh tác trực tuyến, giúp kết nối người dùng có nhu cầu trồng trọt với không gian nông nghiệp số hóa.

## Giới thiệu dự án

PlotFarm là giải pháp công nghệ mang lại trải nghiệm làm nông nghiệp từ xa thông qua các tính năng cốt lõi:

-Cho thuê ô đất canh tác trực tuyến: Khách hàng có thể lựa chọn và thuê ô đất online để trồng cây theo nhu cầu.

-Quản lý và chăm sóc: Theo dõi quá trình gieo trồng, nhật ký canh tác, tiến độ chăm sóc theo từng giai đoạn và gửi yêu cầu chăm sóc ngay trên hệ thống.

-Giám sát trực tiếp: Xem trực tiếp ô đất thông qua hệ thống camera được lắp đặt tại khu vực canh tác.

-Thu hoạch sản phẩm: Nhận thành phẩm trực tiếp sau khi cây trồng đến kỳ thu hoạch.

## Tính năng chính

-Thuê đất trực tuyến: Xem danh sách, diện tích, vị trí và tiến hành thuê ô đất mong muốn.

-Nhật ký canh tác: Cập nhật thông tin chi tiết về tình trạng cây trồng và các giai đoạn phát triển.

-Camera trực tuyến (Live Stream): Theo dõi hình ảnh thực tế của ô đất 24/7.

-Yêu cầu dịch vụ: Gửi yêu cầu hỗ trợ tưới nước, bón phân, phòng trừ sâu bệnh hoặc chăm sóc định kỳ cho nhà vườn.

## Công nghệ

- Frontend: React + Vite
- Backend: Node.js + SQL Sever

## Chạy dự án

### Yêu cầu

- Node.js 18 trở lên
- SQL Server và database `PlotFarmDB`

### Backend

```bash
cd BE
copy .env.example .env
npm install
npm run dev
```

Backend chạy tại `http://localhost:5000` và Swagger UI tại `http://localhost:5000/api-docs`.

Điền thông tin SQL Server của máy vào `BE/.env`. Không commit file `.env` vì đây là cấu hình riêng của từng máy.

### Frontend

```bash
cd FE
npm install
npm run dev
```

Mở `http://localhost:5173`. Nếu Backend không chạy cùng máy, tạo `FE/.env` với biến `VITE_API_URL`, ví dụ:

```env
VITE_API_URL=http://localhost:5000/api
```

## Tài khoản và luồng demo

- Admin: `admin.test@plotfarm.vn` / `Admin123!`
- User/Farmer: dùng các tài khoản test đã seed trong database hoặc đăng ký mới từ màn hình đăng nhập.

Luồng nên demo: User thuê ô đất → quét VietQR → xác nhận thanh toán → Farmer nhận phân công/cập nhật nhật ký → User gửi yêu cầu chăm sóc → Farmer xử lý → Admin theo dõi hợp đồng, thanh toán và yêu cầu.

> Lưu ý: QR VietQR và nút “Tôi đã chuyển khoản thành công” hiện là luồng **mô phỏng**. Hệ thống ghi nhận thanh toán sau khi người dùng xác nhận; chưa tích hợp callback tự động từ cổng thanh toán/ngân hàng.

## Kiểm thử nhanh

- Đơn chưa thanh toán có thể hủy; ô đất phải quay về trạng thái `trống`.
- Gia hạn chỉ cập nhật ngày kết thúc sau khi xác nhận thanh toán phiếu gia hạn.
- User không vào được `/admin` hoặc `/farmer`; Farmer không vào được `/admin`; hệ thống hiển thị trang 403.
- Giao diện User, Farmer và Admin hỗ trợ màn hình điện thoại; bảng Admin có thể vuốt ngang khi cần.

## Team thực hiện

 Eleven PlotFarm 
