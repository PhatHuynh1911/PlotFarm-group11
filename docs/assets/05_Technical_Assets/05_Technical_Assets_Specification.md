# HỒ SƠ THIẾT KẾ KỸ THUẬT & ĐẶC TẢ HỆ THỐNG (TECHNICAL ASSETS SPECIFICATION)
## HỆ THỐNG QUẢN LÝ NÔNG NGHIỆP TRỰC TUYẾN PLOTFARM (GROUP 11 - OJT FPT)
* **Phiên bản:** v2.0 Enterprise Release
* **Đơn vị phụ trách:** Backend Engineering Team (Đào Đại Sơn - Phan Nguyễn Ngọc Quý)
* **Cơ sở hạ tầng:** Node.js (Express), Microsoft SQL Server 2022, Open-Meteo Satellite API, VietQR NAPAS 24/7, HLS IoT Streaming
* **Mục đích:** Tài liệu kỹ thuật chi tiết phục vụ lưu trữ Google Drive (`05_Technical_Assets`), thẩm định kiến trúc hệ thống và hướng dẫn tích hợp giữa Frontend - Backend.

---

# MỤC LỤC TÀI LIỆU
1. [Kiến Trúc Cơ Sở Dữ Liệu & Sơ Đồ ERD Hoàn Chỉnh](#1-kien-truc-co-so-du-lieu--so-do-erd-hoan-chinh)
2. [Từ Điển Dữ Liệu Chi Tiết (Data Dictionary) & DDL Script](#2-tu-dien-du-lieu-chi-tiet-data-dictionary--ddl-script)
3. [Đặc Tả Chi Tiết Hệ Thống RESTful API (API Specification)](#3-dac-ta-chi-tiet-he-thong-restful-api-api-specification)
4. [Đặc Tả Tích Hợp Cổng Thanh Toán Chuyển Khoản VietQR](#4-dac-ta-tich-hop-cong-thanh-toan-chuyen-khoan-vietqr)
5. [Đặc Tả Kiến Trúc Camera Giám Sát Ô Đất Trực Tuyến 24/7](#5-dac-ta-kien-truc-camera-giam-sat-o-dat-truc-tuyen-247)
6. [Đặc Tả Tích Hợp API Khí Tượng Vệ Tinh & Engine Tư Vấn Nông Nghiệp](#6-dac-ta-tich-hop-api-khi-tuong-ve-tinh--engine-tu-van-nong-nghiep)

---

# 1. KIẾN TRÚC CƠ SỞ DỮ LIỆU & SƠ ĐỒ ERD HOÀN CHỈNH

Hệ thống được thiết kế theo mô hình quan hệ chuẩn hóa cao trên **Microsoft SQL Server (Transact-SQL)**, tối ưu hóa cho các thao tác giao dịch (OLTP), đảm bảo tính toàn vẹn ACID khi người dùng đồng thời đặt thuê cùng một ô đất.

### 1.1. Sơ đồ Thực thể Quan hệ Toàn diện (Mermaid ERD)

```mermaid
erDiagram
    NguoiDung ||--o{ HopDongThue : "ky_hop_dong"
    NguoiDung ||--o{ PhanCongNongDan : "nhan_nhiem_vu"
    NguoiDung ||--o{ KhieuNai : "gui_khieu_nai"
    NguoiDung ||--o{ ThongBao : "nhan_thong_bao"
    NguoiDung ||--o{ NhatKyCanhTac : "viet_nhat_ky"

    NongTrai ||--|{ ODat : "chia_lo_canh_tac"
    ODat ||--o| CameraODat : "gan_thiet_bi_camera"
    ODat ||--o{ HopDongThue : "duoc_thue"

    DanhMucCayTrong ||--|{ CayTrong : "chua_giong"
    CayTrong ||--o{ HopDongThue : "gieo_trong_tren"

    HopDongThue ||--o{ PhanCongNongDan : "phan_cong_cham_soc"
    HopDongThue ||--o{ NhatKyCanhTac : "luu_tien_trinh"
    HopDongThue ||--o{ YeuCauDichVu : "yeu_cau_phu_tro"
    HopDongThue ||--o{ ThuHoach : "cho_san_luong"
    HopDongThue ||--o{ ThanhToanGiaHan : "phat_sinh_gia_han"

    LoaiDichVu ||--o{ YeuCauDichVu : "dinh_nghia_dich_vu"
    ThuHoach ||--o| GiaoHang : "dong_goi_van_chuyen"

    NguoiDung {
        int ma_nguoi_dung PK "Tự tăng, Khóa chính"
        nvarchar ho_ten "Họ và tên người dùng"
        varchar email UK "Email đăng nhập duy nhất"
        varchar so_dien_thoai "Số điện thoại liên hệ"
        varchar mat_khau_hash "Mật khẩu mã hóa BCrypt"
        varchar vai_tro "admin, nong_dan, khach_hang"
        varchar trang_thai "hoat_dong, khoa"
        datetime ngay_tao "Thời điểm tạo tài khoản"
    }

    NongTrai {
        int ma_nong_trai PK "Khóa chính nông trại"
        nvarchar ten_nong_trai "Tên nông trại (Vườn Phúc Lộc)"
        nvarchar dia_chi "Địa chỉ thực tế"
        nvarchar tinh_thanh "Đà Nẵng"
        nvarchar quan_huyen "Hòa Vang"
        float vi_do "Vĩ độ GPS: 15.9628"
        float kinh_do "Kinh độ GPS: 108.1824"
        nvarchar anh_dai_dien "Đường dẫn ảnh bìa nông trại"
    }

    ODat {
        int ma_o_dat PK "Khóa chính ô đất"
        int ma_nong_trai FK "Tham chiếu NongTrai"
        varchar so_hieu_o UK "A-01, B-01, C-02..."
        nvarchar ten_o_dat "Tên hiển thị thương mại"
        float dien_tich_m2 "Diện tích (m2)"
        nvarchar loai_dat "Phù sa, Vi sinh, Bazan..."
        decimal gia_thue_thang "Đơn giá thuê 1 tháng (VND)"
        varchar trang_thai "trong, dang_thue, tam_khoa, bao_tri"
        nvarchar anh_o_dat "URL hình ảnh đại diện ô đất"
    }

    CameraODat {
        int ma_camera PK "Khóa chính camera"
        int ma_o_dat FK "Gắn tại ô đất nào"
        nvarchar ten_camera "Tên camera giám sát"
        varchar luong_truc_tuyen_url "Đường link phát trực tiếp HLS"
        varchar trang_thai "hoat_dong, bao_tri, offline"
    }

    HopDongThue {
        int ma_hop_dong PK "Khóa chính hợp đồng"
        varchar so_hop_dong UK "Mã HĐ hiển thị (HD-...)"
        int ma_nguoi_dung FK "Khách hàng thuê"
        int ma_o_dat FK "Ô đất được thuê"
        int ma_cay_trong FK "Giống cây trồng đã chọn"
        date ngay_bat_dau "Ngày bắt đầu chu kỳ thuê"
        date ngay_ket_thuc "Ngày kết thúc hợp đồng"
        int thoi_han_thang "Số tháng thuê (1, 3, 6, 12)"
        decimal don_gia_thang "Đơn giá tháng tại thời điểm ký"
        decimal tong_tien "Tổng giá trị hợp đồng (VND)"
        varchar trang_thai_hop_dong "cho_thanh_toan, hieu_luc, het_han, da_huy"
        varchar trang_thai_thanh_toan "cho_thanh_toan, da_thanh_toan, da_huy"
        varchar trang_thai_canh_tac "cho_gieo_trong, dang_canh_tac, cho_thu_hoach, da_thu_hoach"
    }

    NhatKyCanhTac {
        int ma_nhat_ky PK "Khóa chính bài nhật ký"
        int ma_hop_dong FK "Thuộc hợp đồng nào"
        int ma_nong_dan FK "Nông dân thực hiện"
        varchar loai_hoat_dong "gieo_hat, tuoi_nuoc, bon_phan, bat_sau, thu_hoach"
        nvarchar tieu_de "Tiêu đề nhật ký"
        nvarchar noi_dung "Chi tiết công việc chăm sóc"
        nvarchar anh_dinh_kem "Ảnh chụp thực tế tại vườn"
        datetime ngay_ghi "Thời điểm thực hiện"
    }

    ThuHoach {
        int ma_thu_hoach PK "Khóa chính đợt thu hoạch"
        int ma_hop_dong FK "Thu hoạch từ hợp đồng"
        date ngay_thu_hoach "Ngày hái nông sản"
        float san_luong_kg "Khối lượng thu được thực tế"
        varchar chat_luong "loai_1, loai_2, tieu_chuan"
        varchar trang_thai "cho_giao, dang_giao, da_giao"
    }

    GiaoHang {
        int ma_giao_hang PK "Khóa chính đơn giao"
        int ma_thu_hoach FK "Giao đợt thu hoạch nào"
        varchar ma_van_don "Mã vận đơn bưu cục"
        nvarchar dia_chi_giao "Địa chỉ nhà khách hàng"
        varchar sdt_nguoi_nhan "SĐT liên hệ nhận rau"
        varchar trang_thai_giao "chuan_bi, dang_giao, thanh_cong"
    }
```

---

# 2. TỪ ĐIỂN DỮ LIỆU CHI TIẾT & DDL SCRIPT (DATA DICTIONARY)

### 2.1. Bảng `NguoiDung` (User Accounts)
| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Ý nghĩa & Ràng buộc |
| :--- | :--- | :--- | :--- | :--- |
| `ma_nguoi_dung` | `INT IDENTITY(1,1)` | No | Auto | Khóa chính duy nhất của người dùng. |
| `ho_ten` | `NVARCHAR(100)` | No | | Họ tên đầy đủ khách hàng / nông dân. |
| `email` | `VARCHAR(100)` | No | | Email đăng nhập, Unique Index chống trùng lặp. |
| `so_dien_thoai` | `VARCHAR(20)` | Yes | | Số điện thoại nhận OTP / giao hàng. |
| `mat_khau_hash` | `VARCHAR(255)` | No | | Mật khẩu băm an toàn chuẩn BCrypt (Salt = 10). |
| `vai_tro` | `VARCHAR(20)` | No | 'khach_hang' | CHECK: `admin`, `nong_dan`, `khach_hang`. |
| `trang_thai` | `VARCHAR(20)` | No | 'hoat_dong' | CHECK: `hoat_dong`, `khoa`. |
| `ngay_tao` | `DATETIME` | No | `GETDATE()` | Thời điểm tạo tài khoản. |

### 2.2. Bảng `ODat` (Farming Plots)
| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Ý nghĩa & Ràng buộc |
| :--- | :--- | :--- | :--- | :--- |
| `ma_o_dat` | `INT IDENTITY(1,1)` | No | Auto | Khóa chính ô đất. |
| `ma_nong_trai` | `INT` | No | | Khóa ngoại FK -> `NongTrai(ma_nong_trai)`. |
| `so_hieu_o` | `VARCHAR(20)` | No | | Ký hiệu mã ô (A-01, B-02...), Unique. |
| `ten_o_dat` | `NVARCHAR(150)` | No | | Tên thương mại ("Ô đất Phù Sa A-01"). |
| `dien_tich_m2` | `FLOAT` | No | | Diện tích canh tác thực tế (m²). |
| `loai_dat` | `NVARCHAR(100)` | No | | Đặc tính đất (Phù sa, Bazan, Trùn quế). |
| `gia_thue_thang`| `DECIMAL(18,2)`| No | | Đơn giá thuê 1 tháng (VNĐ). |
| `trang_thai` | `VARCHAR(20)` | No | 'trong' | CHECK: `trong`, `dang_thue`, `tam_khoa`, `bao_tri`. |
| `anh_o_dat` | `NVARCHAR(500)` | Yes | | URL ảnh đại diện ô đất. |

### 2.3. Bảng `HopDongThue` (Rental Contracts)
| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Ý nghĩa & Ràng buộc |
| :--- | :--- | :--- | :--- | :--- |
| `ma_hop_dong` | `INT IDENTITY(1,1)` | No | Auto | Khóa chính hợp đồng. |
| `so_hop_dong` | `VARCHAR(50)` | No | | Mã số hợp đồng ký hiệu `HD-YYYYMMDD-XXXX`. |
| `ma_nguoi_dung` | `INT` | No | | FK -> `NguoiDung`. |
| `ma_o_dat` | `INT` | No | | FK -> `ODat`. |
| `ma_cay_trong` | `INT` | No | | FK -> `CayTrong`. |
| `ngay_bat_dau` | `DATE` | No | | Ngày bắt đầu tính hạn hợp đồng. |
| `ngay_ket_thuc`| `DATE` | No | | Ngày hết hạn hợp đồng thuê. |
| `tong_tien` | `DECIMAL(18,2)`| No | | Tổng số tiền thanh toán (VNĐ). |
| `trang_thai_hop_dong` | `VARCHAR(30)` | No | 'cho_thanh_toan'| CHECK: `cho_thanh_toan`, `hieu_luc`, `het_han`, `da_huy`. |
| `trang_thai_thanh_toan`| `VARCHAR(30)`| No | 'cho_thanh_toan'| CHECK: `cho_thanh_toan`, `da_thanh_toan`, `da_huy`. |
| `trang_thai_canh_tac` | `VARCHAR(30)` | No | 'cho_gieo_trong' | CHECK: `cho_gieo_trong`, `dang_canh_tac`, `cho_thu_hoach`, `da_thu_hoach`. |

---

# 3. ĐẶC TẢ CHI TIẾT HỆ THỐNG RESTFUL API (API SPECIFICATION)

### 3.1. Quy chuẩn Kiến trúc API
* **Base URL:** `http://localhost:5000/api` (Development) / `https://api.plotfarm.vn/api` (Production).
* **Mã hóa:** `Content-Type: application/json; charset=utf-8`.
* **Cơ chế xác thực:** JWT Bearer Token trong Header:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

---

### 3.2. Đặc Tả Chi Tiết Từng Endpoint Trọng Tâm

#### 3.2.1. Endpoint Tạo Đơn Thuê Ô Đất Mới (Create Rental Contract)
* **Method & Path:** `POST /api/rentals`
* **Xác thực:** Bắt buộc (Role: `khach_hang`).
* **Request Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`.
* **Request Body Payload:**
```json
{
  "ma_o_dat": 1,
  "ma_cay_trong": 3,
  "thoi_han_thang": 3,
  "yeu_cau_dac_biet": "Ưu tiên tưới tiêu vào lúc 17h00 chiều mát hàng ngày"
}
```
* **Response Thành công (201 Created):**
```json
{
  "success": true,
  "message": "Tạo hợp đồng thuê ô đất thành công. Vui lòng thanh toán để kích hoạt.",
  "data": {
    "ma_hop_dong": 42,
    "so_hop_dong": "HD-20261015-8832",
    "tong_tien": 1500000,
    "ngay_bat_dau": "2026-10-15",
    "ngay_ket_thuc": "2027-01-15",
    "payment_info": {
      "bank_id": "Vietcombank",
      "account_no": "9988776655",
      "account_name": "CONG TY CONG NGHE NONG NGHIEP PLOTFARM",
      "amount": 1500000,
      "transfer_content": "PFHD202610158832",
      "qr_code_url": "https://api.vietqr.io/image/970436-9988776655-compact.png?amount=1500000&addInfo=PFHD202610158832&accountName=CONG%20TY%20PLOTFARM"
    }
  }
}
```

---

#### 3.2.2. Endpoint Xem Luồng Camera Giám Sát Ô Đất (Get Plot Camera Stream)
* **Method & Path:** `GET /api/camera/stream/:plotId`
* **Xác thực:** Public hoặc Bearer Token.
* **Params:** `plotId` (Mã số ô đất `1` hoặc số hiệu ô `A-01`).
* **Response Thành công (200 OK):**
```json
{
  "success": true,
  "message": "Lấy luồng camera giám sát thời gian thực thành công",
  "data": {
    "ma_camera": 101,
    "ten_camera": "Camera Góc Rộng Ô Đất A-01",
    "so_hieu_o": "A-01",
    "luong_truc_tuyen_url": "https://camera.plotfarm.vn/live/a01/index.m3u8",
    "do_phan_giai": "1920x1080@30fps",
    "trang_thai": "hoat_dong",
    "is_simulated": false
  }
}
```

---

#### 3.2.3. Endpoint Dữ Liệu Thời Tiết Vệ Tinh Realtime (Get Live Satellite Weather)
* **Method & Path:** `GET /api/weather/current`
* **Xác thực:** Public.
* **Response Thành công (200 OK):**
```json
{
  "success": true,
  "data": {
    "farm_name": "Vườn Phúc Lộc",
    "location": "Hòa Vang, Đà Nẵng",
    "coordinates": {
      "latitude": 15.9628,
      "longitude": 108.1824
    },
    "source": "Trạm khí tượng Open-Meteo Satellite Realtime (Live Data)",
    "temperature": 27,
    "humidity": 82,
    "condition": "Nắng xen mây, mát mẻ",
    "condition_code": "cloudy",
    "uv_index": 4,
    "wind_speed_kmh": 8,
    "smart_advice": "Độ ẩm không khí cao hoặc trời có mưa. Cần chú ý độ ẩm gốc rễ và đề phòng nấm bệnh.",
    "care_action": "Tạm dừng hệ thống tưới tự động, khơi thông rãnh thoát nước và tỉa các tán lá úa sát gốc.",
    "forecast": [
      { "day": "Hôm nay", "temp": "24°C - 30°C", "condition": "Có mưa rào", "icon": "🌧️" },
      { "day": "Ngày mai", "temp": "23°C - 30°C", "condition": "Có mưa rào", "icon": "🌧️" },
      { "day": "Ngày kia", "temp": "22°C - 32°C", "condition": "Nắng xen mây", "icon": "⛅" }
    ],
    "updated_at": "12:30"
  }
}
```

---

# 4. ĐẶC TẢ TÍCH HỢP CỔNG THANH TOÁN CHUYỂN KHOẢN VIETQR

Nhằm đảm bảo trải nghiệm không cần thủ công nhập số tài khoản, PlotFarm tích hợp chuẩn **VietQR (theo tiêu chuẩn EMVCo Quốc Tế do NAPAS ban hành)**:

### 4.1. Quy chuẩn Dữ liệu Thanh toán
1. **Thông tin Người Thụ Hưởng:**
   * Ngân hàng: Ngân hàng TMCP Ngoại Thương Việt Nam (`Vietcombank` - Mã BIN: `970436`)
   * Số tài khoản tiếp nhận: `9988776655`
   * Tên chủ tài khoản: `CONG TY CONG NGHE NONG NGHIEP PLOTFARM`
2. **Cú pháp Chuyển Khoản Định Danh:**
   * Cấu trúc: `PF[SoHopDong]`
   * Ví dụ: Hợp đồng `HD-20261015-8832` -> Nội dung chuyển khoản: `PFHD202610158832`.
   * Hệ thống tự động lọc bỏ các ký tự đặc biệt như dấu gạch ngang `-` để tránh lỗi font trên các ứng dụng ngân hàng cũ.

### 4.2. Luồng Xử Lý & Xác Nhận Giao Dịch Tự Động (Transaction Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách Hàng
    participant FE as Frontend (React/Vite)
    participant BE as Backend (Express API)
    participant DB as SQL Server DB
    participant Bank as Cổng VietQR / Ngân Hàng

    User->>FE: Bấm "Thuê Ô Đất" & Chọn Giống Cây
    FE->>BE: POST /api/rentals
    BE->>DB: INSERT HopDongThue (trang_thai: 'cho_thanh_toan')
    BE->>DB: UPDATE ODat SET trang_thai = 'dang_thue' (Giữ chỗ)
    BE->>Bank: Tạo thông tin VietQR (Cú pháp PFHD...)
    BE-->>FE: Trả về qr_code_url, transfer_content, tong_tien
    FE-->>User: Hiển thị màn hình quét mã QR thanh toán

    User->>Bank: Dùng Mobile Banking quét mã VietQR và xác nhận
    User->>FE: Bấm "Tôi đã hoàn tất chuyển khoản"
    FE->>BE: POST /api/rentals/:id/confirm-payment
    BE->>DB: UPDATE HopDongThue SET trang_thai_hop_dong = 'hieu_luc', trang_thai_thanh_toan = 'da_thanh_toan'
    BE->>DB: INSERT PhanCongNongDan (Giao việc cho Nông dân phụ trách khu)
    BE->>DB: INSERT ThongBao ("Chúc mừng bạn đã kích hoạt ô đất thành công!")
    BE-->>FE: HTTP 200 OK: Kích hoạt hợp đồng thành công
    FE-->>User: Chuyển hướng sang màn hình Dashboard Farm & Live Camera
```

---

# 5. ĐẶC TẢ KIẾN TRÚC CAMERA GIÁM SÁT Ô ĐẤT TRỰC TUYẾN 24/7

### 5.1. Kiến Trúc Luồng Phát Trực Tuyến (Video Pipeline Architecture)
Hệ thống sử dụng giải pháp chuyển đổi đa tầng từ camera phần cứng tại vườn đến trình duyệt của khách hàng:

```text
[Camera IP H.265 tại Ô Đất A-01]
               │
               │ (Giao thức RTSP qua mạng 4G/Wifi nông trại)
               ▼
[Media Streaming Gateway (Nginx-RTMP / go2rtc / MediaServer)]
               │
               │ (Transcoding sang chuẩn HLS - HTTP Live Streaming)
               ▼
[Phân đoạn Video (.m3u8 Playlist + các file .ts 2 giây)]
               │
               │ (Phát qua HTTPS CDN)
               ▼
[Trình duyệt Web Khách Hàng (Hls.js / Video.js / Safari HTML5 Video)]
```

### 5.2. Cơ Chế Dự Phòng Thông Minh (Smart Failover Simulation)
* **Vấn đề thực địa:** Tại các khu vực nông thôn hẻo lánh, đường truyền mạng ngoài đồng ruộng có thể bị chập chờn khi có giông lốc hoặc mất điện cục bộ.
* **Giải pháp xử lý của Backend PlotFarm:**
  * Endpoint `GET /api/camera/stream/:plotId` kiểm tra tình trạng kết nối thiết bị.
  * Nếu camera thực địa mất tín hiệu, server tự động gán cờ `is_simulated: true` và phát luồng video mẫu Full HD mô phỏng hoạt động tưới tiêu tại ô đất đó, kèm dòng trạng thái thông báo *"Đang kết nối luồng vệ tinh dự phòng"*, đảm bảo website không bao giờ bị màn hình đen hoặc báo lỗi đứt kết nối.

---

# 6. ĐẶC TẢ TÍCH HỢP API KHÍ TƯỢNG VỆ TINH & ENGINE TƯ VẤN NÔNG NGHIỆP

### 6.1. Kiến Trúc Tích Hợp API Vệ Tinh Open-Meteo
* **Cơ chế:** Động 100% dựa theo tọa độ của nông trại trong Database (Zero Hardcode).
* **Endpoint đối tác:** `https://api.open-meteo.com/v1/forecast`
* **Tham số truy vấn:**
  * `latitude`: Lấy từ cột `vi_do` bảng `NongTrai` (`15.9628`)
  * `longitude`: Lấy từ cột `kinh_do` bảng `NongTrai` (`108.1824`)
  * `current`: `temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index`
  * `daily`: `temperature_2m_max,temperature_2m_min,weather_code`
  * `timezone`: `Asia/Bangkok` (GMT+7)

### 6.2. Thuật Toán Engine Tư Vấn Nông Nghiệp Thông Minh (Agro-Advisory Logic Matrix)

Backend tự động kích hoạt ma trận logic sau mỗi chu kỳ cập nhật thời tiết để sinh ra lời khuyên chăm sóc cho nông dân và chủ đất:

| Điều kiện Khí tượng Thời gian thực | Trạng thái Môi trường | Lời khuyên Nông học Tự động (`smart_advice`) | Hành động Canh tác Đề xuất (`care_action`) |
| :--- | :--- | :--- | :--- |
| `temperature >= 32°C` | Nắng gắt, bức xạ nhiệt cao, bốc hơi nước nhanh | "Nhiệt độ ngoài trời tại nông trại đang khá cao. Đất trồng dễ bốc hơi nước nhanh." | "Khuyến nghị tưới bổ sung vào chiều mát (sau 16h30) và bật phun sương tản nhiệt cho các ô đất." |
| `humidity > 80%` HOẶC `conditionCode in ['rainy', 'thunderstorm']` | Mưa nhiều, độ ẩm bão hòa, nguy cơ ngập úng & nấm bệnh | "Độ ẩm không khí cao hoặc trời có mưa. Cần chú ý độ ẩm gốc rễ và đề phòng nấm bệnh." | "Tạm dừng hệ thống tưới tự động, khơi thông rãnh thoát nước và tỉa các tán lá úa sát gốc." |
| `temperature < 20°C` | Tiết trời lạnh giá, chậm phát triển đọt non | "Thời tiết chuyển lạnh, cây hấp thụ dinh dưỡng chậm hơn bình thường." | "Ủ gốc bằng rơm rạ hoặc màng phủ sinh học để giữ ấm bộ rễ, tưới ấm vào đầu giờ chiều." |
| Các điều kiện ôn hòa khác (20°C - 30°C, ẩm 60-75%) | Điều kiện canh tác lý tưởng | "Thời tiết rất thuận lợi cho cây quang hợp và hấp thụ dinh dưỡng hữu cơ." | "Thích hợp bón phân vi sinh định kỳ, làm sạch cỏ dại và kiểm tra độ ẩm đất trước khi tưới." |
