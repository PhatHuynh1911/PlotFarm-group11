# BỘ HỒ SƠ TÀI NGUYÊN TRUYỀN THÔNG & HÌNH ẢNH THỰC TẾ (MEDIA ASSETS MASTER CATALOG)
## HỆ THỐNG NÔNG NGHIỆP TRỰC TUYẾN PLOTFARM (GROUP 11 - OJT FPT)
* **Phiên bản:** v2.0 Enterprise Release
* **Đơn vị phụ trách:** Backend Engineering & Systems Team (Đào Đại Sơn - Phan Nguyễn Ngọc Quý)
* **Mục đích:** Cung cấp danh mục tài nguyên hình ảnh, video thực địa, bảng thông số kỹ thuật đất đai, vật tư nông nghiệp và kịch bản video để lưu trữ trên Google Drive (`03_Media_Assets`), phục vụ báo cáo tiến độ Mentor và nghiệm thu dự án.

---

# MỤC LỤC CHI TIẾT
1. [Tiêu chuẩn Kỹ thuật & Quy ước Đặt tên File](#1-tieu-chuan-ky-thuat--quy-uoc-dat-ten-file)
2. [Hồ sơ Chi tiết Các Ô Đất & Thổ Nhưỡng (Plot Imagery & Soil Analysis)](#2-ho-so-chi-tiet-cac-o-dat--tho-nhuong)
3. [Danh mục Ảnh Cây Trồng & Chu Kỳ Sinh Trưởng (Crops Lifecycle)](#3-danh-muc-anh-cay-trong--chu-ky-sinh-truong)
4. [Tư liệu Công Cụ, Vật Tư Nông Nghiệp & Phần Cứng IoT](#4-tu-lieu-cong-cu-vat-tu-nong-nghiep--phan-cung-iot)
5. [Hệ Thống Video Thực Tế & Kịch Bản Quảng Bá (Video Assets & Storyboards)](#5-he-thong-video-thuc-te--kich-ban-quang-ba)
6. [Cấu Trúc Cây Thư Mục Lưu Trữ Chuẩn Trên Google Drive](#6-cau-truc-cay-thu-muc-luu-tru-chuan-tren-google-drive)

---

# 1. TIÊU CHUẨN KỸ THUẬT & QUY ƯỚC ĐẶT TÊN FILE

Để đảm bảo tính đồng bộ trên toàn bộ nền tảng Web, Mobile và Google Drive, toàn bộ tài nguyên số phải tuân thủ nghiêm ngặt các tiêu chuẩn sau:

### 1.1. Tiêu chuẩn Kỹ thuật
* **Độ phân giải ảnh (Image Resolution):**
  * *Ảnh Banner / Hero:* 1920 x 1080 px (16:9) hoặc 2560 x 1440 px (2K QHD), DPI 72-150.
  * *Ảnh Thẻ Ô Đất / Cây Trồng:* 1200 x 800 px (3:2) hoặc 800 x 800 px (1:1).
  * *Ảnh Thumbnail / Icon:* 400 x 400 px (1:1).
* **Định dạng file:**
  * Web & Lưu trữ: `.jpg` (nén chất lượng 85-90%), `.png` (nền trong suốt đối với vật phẩm/icon), `.webp` (tối ưu tải trang).
  * Video: `.mp4` chuẩn nén Video H.264 / AVC, Audio AAC 128 kbps, tốc độ khung hình 30fps hoặc 60fps.
* **Không gian màu (Color Space):** sRGB tiêu chuẩn hiển thị màn hình số.

### 1.2. Quy ước Đặt tên File (Naming Convention)
* Cấu trúc chuẩn: `[Tiền_tố]_[Nhóm]_[Đối_tượng]_[Chi_tiết]_[Kích_thước].[ext]`
* Ví dụ:
  * `PF_PLOT_A01_PhuSa_Soil_1200x800.jpg`
  * `PF_CROP_XaLachRomaine_Harvest_800x800.jpg`
  * `PF_IOT_MoistureSensor_Probe_1200x800.jpg`
  * `PF_VIDEO_FarmTour_Greenhouse_1080p.mp4`

---

# 2. HỒ SƠ CHI TIẾT CÁC Ô ĐẤT & THỔ NHƯỠNG (PLOT IMAGERY & SOIL ANALYSIS)

Dữ liệu hình ảnh được liên kết trực tiếp với bảng `dbo.NongTrai` và `dbo.ODat` trong hệ thống cơ sở dữ liệu PlotFarm.

### 2.1. Hồ sơ Nông Trại Tổng Thể
* **Tên cơ sở:** Nông trại Sinh thái Vườn Phúc Lộc (PlotFarm Farm #1)
* **Vị trí hành chính:** Xã Hòa Nhơn, Huyện Hòa Vang, Thành phố Đà Nẵng
* **Tọa độ địa lý GPS:** Vĩ độ `15.9628° N`, Kinh độ `108.1824° E`
* **Quy mô:** 50,000 m² (5 Hecta), chia thành 4 phân khu chuyên canh (Khu A, Khu B, Khu C, Khu D).
* **Danh mục hình ảnh toàn cảnh:**
  1. `PF_FARM_Aerial_Overview_Panorama_1920x1080.jpg`: Ảnh flycam chụp góc 45 độ từ độ cao 120m bao quát toàn bộ 4 phân khu.
  2. `PF_FARM_Entrance_Security_1920x1080.jpg`: Khu vực cổng vào, văn phòng điều hành và trạm kiểm định chất lượng nước.
  3. `PF_FARM_Water_Canal_System_1920x1080.jpg`: Hệ thống mương dẫn nước tự nhiên từ hồ điều hòa Hòa Vang.
  4. `PF_FARM_Solar_Power_Cluster_1920x1080.jpg`: Cụm pin năng lượng mặt trời cấp nguồn cho hệ thống IoT và trạm bơm.
* **Link trực tiếp tài nguyên chất lượng cao:**  
  `https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1920&q=85`

---

### 2.2. Hồ sơ Chi tiết Từng Phân Khu Ô Đất (Plot Master Profiles)

#### Phân Khu A: Đất Phù Sa Ven Sông (Mã ô: A-01 đến A-10)
* **Mô tả thổ nhưỡng:** Đất phù sa màu mỡ bồi đắp hàng năm, giàu hạt sét mịn và mùn hữu cơ tự nhiên, độ tơi xốp đạt 65%, khả năng giữ nước và dinh dưỡng vượt trội.
* **Chỉ số sinh hóa:** Độ pH = 6.2 - 6.8; Độ dẫn điện EC = 1.1 mS/cm; Hàm lượng hữu cơ OM > 4.5%.
* **Định hướng canh tác:** Chuyên canh các loại rau ăn lá ngắn ngày (Xà lách, cải thìa, cải ngọt, rau muống hữu cơ).
* **Thông số kỹ thuật ô đất:** Diện tích tiêu chuẩn 25 m² (5m x 5m); Đơn giá thuê: 500,000 VNĐ / tháng.
* **Danh mục hình ảnh chi tiết:**
  * `PF_PLOT_A01_Soil_Macro_1200x800.jpg`: Chụp cận cảnh cấu trúc hạt đất phù sa ẩm mịn và giàu mùn.
  * `PF_PLOT_A01_Field_Perspective_1200x800.jpg`: Góc nhìn từ đầu luống ô đất, có biển cắm số hiệu gỗ "A-01".
  * *Link ảnh mẫu:* `https://images.unsplash.com/photo-1592417817098-8f3d6ef23a24?auto=format&fit=crop&w=1200&q=85`

#### Phân Khu B: Đất Vi Sinh Trùn Quế Hữu Cơ (Mã ô: B-01 đến B-08)
* **Mô tả thổ nhưỡng:** Đất thịt nhẹ được cải tạo và phối trộn với 35% phân trùn quế nguyên chất, bổ sung nấm đối kháng Trichoderma. Thoát nước tốt, không bị bí rễ khi mưa lớn.
* **Chỉ số sinh hóa:** Độ pH = 6.5 - 7.0; Độ dẫn điện EC = 1.5 mS/cm; Đầy đủ vi lượng khoáng chất Canxi, Magie.
* **Định hướng canh tác:** Củ quả sạch (Cà chua bi Cherry, dưa leo Nhật, cà rốt baby, củ cải đường).
* **Thông số kỹ thuật ô đất:** Diện tích tiêu chuẩn 35 m²; Đơn giá thuê: 700,000 VNĐ / tháng.
* **Danh mục hình ảnh chi tiết:**
  * `PF_PLOT_B01_WormCastings_Soil_1200x800.jpg`: Cận cảnh lớp đất giàu hạt phân trùn quế xốp mịn.
  * `PF_PLOT_B01_Trellis_Infrastructure_1200x800.jpg`: Giàn khung sắt chữ A đã dựng sẵn cho các loại cây thân leo.
  * *Link ảnh mẫu:* `https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=85`

#### Phân Khu C: Đất Đỏ Bazan Thoát Nước Nhanh (Mã ô: C-01 đến C-06)
* **Mô tả thổ nhưỡng:** Tầng đất đỏ bazan đồi gò dày trên 1 mét, cơ cấu hạt đất bền vững, giàu oxit sắt và nhôm, độ thông thoáng khí tuyệt hảo.
* **Chỉ số sinh hóa:** Độ pH = 5.8 - 6.2; Thích hợp cây ưa đất hơi chua nhẹ và bộ rễ cần thở nhiều.
* **Định hướng canh tác:** Cây gia vị cao cấp (Hương thảo, bạc hà, húng tây) và ớt chuông Đà Lạt 3 màu.
* **Thông số kỹ thuật ô đất:** Diện tích tiêu chuẩn 50 m²; Đơn giá thuê: 950,000 VNĐ / tháng.
* **Danh mục hình ảnh chi tiết:**
  * `PF_PLOT_C01_Bazan_RedSoil_1200x800.jpg`: Màu đất đỏ đặc trưng vùng gò đồi, luống cao 25cm chống ngập úng.
  * *Link ảnh mẫu:* `https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=85`

#### Phân Khu D: Nhà Màng Nông Nghiệp Công Nghệ Cao VIP (Mã ô: D-01 đến D-04)
* **Mô tả thổ nhưỡng:** Trồng trên giá thể xơ dừa cao cấp đã xử lý tanin và mùn than bùn hữu cơ nhập khẩu, đặt trong nhà màng màng PE Israel chắn tia UV và côn trùng gây hại 100%.
* **Hạ tầng tự động:** Tích hợp đường ống tưới nhỏ giọt hồi lưu, quạt thông gió tản nhiệt đối lưu.
* **Định hướng canh tác:** Dâu tây New Zealand, Dưa lưới Nhật Bản ruột cam.
* **Thông số kỹ thuật ô đất:** Diện tích tiêu chuẩn 40 m²; Đơn giá thuê: 1,300,000 VNĐ / tháng.
* **Danh mục hình ảnh chi tiết:**
  * `PF_PLOT_D01_Greenhouse_Interior_1200x800.jpg`: Bên trong nhà màng công nghệ cao sạch sẽ, luống dưa lưới treo dây thẳng tắp.
  * *Link ảnh mẫu:* `https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1200&q=85`

---

# 3. DANH MỤC ẢNH CÂY TRỒNG & CHU KỲ SINH TRƯỞNG (CROPS LIFECYCLE)

Mỗi giống cây trồng trong cơ sở dữ liệu (`dbo.CayTrong`) được trang bị bộ ảnh gồm 4 giai đoạn sinh trưởng để phục vụ tính năng cập nhật **Nhật Ký Canh Tác** tự động cho người dùng.

### 3.1. Bảng Thông số & Hình ảnh Theo Mùa Vụ

| Mã giống | Tên Cây Trồng | Mùa vụ | Thời gian trưởng thành | Năng suất trung bình | Giai đoạn chụp hình ảnh cần thu thập | Link ảnh minh họa độ nét cao |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CROP-01** | **Xà lách Romaine** | Quanh năm | 35 - 40 ngày | 3.2 kg / m² | 1. Ươm mầm (Ngày 5)<br>2. Cây con 4 lá (Ngày 15)<br>3. Cuộn lá (Ngày 28)<br>4. Thu hoạch (Ngày 38) | `https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80` |
| **CROP-02** | **Cải thìa Thượng Hải** | Thu - Đông | 30 - 32 ngày | 3.8 kg / m² | 1. Gieo hạt nảy mầm<br>2. Ra luống con<br>3. Bẹ lá dày xanh bóng<br>4. Thu hoạch đóng giỏ | `https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80` |
| **CROP-03** | **Cà chua bi Cherry** | Đông - Xuân | 65 - 75 ngày | 5.5 kg / m² | 1. Cây giống vườn ươm<br>2. Leo giàn & ra hoa vàng<br>3. Đậu chùm trái xanh<br>4. Chín đỏ rực rỡ | `https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80` |
| **CROP-04** | **Cà rốt Baby Organic** | Mát mẻ | 55 - 60 ngày | 4.0 kg / m² | 1. Tỉa thưa lá kim<br>2. Rễ phình củ nhỏ<br>3. Củ nhô khỏi mặt luống<br>4. Nhổ củ rửa sạch | `https://images.unsplash.com/photo-1598170845058-32b9d6a5c71d?auto=format&fit=crop&w=800&q=80` |
| **CROP-05** | **Dưa leo Baby giòn** | Xuân - Hè | 40 - 45 ngày | 6.0 kg / m² | 1. Đâm tua cuốn giàn<br>2. Hoa cái thụ phấn<br>3. Trái non dài 10cm<br>4. Hái trái sáng sớm | `https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80` |
| **CROP-06** | **Bắp cải thảo ngọt** | Mùa lạnh | 50 - 55 ngày | 4.5 kg / m² | 1. Xòe tán lá gốc<br>2. Lõi bắt đầu cuộn chặt<br>3. Bắp hình trụ chắc nịch<br>4. Cắt gốc bắp cải | `https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=800&q=80` |

---

# 4. TƯ LIỆU CÔNG CỤ, VẬT TƯ NÔNG NGHIỆP & PHẦN CỨNG IOT

Chứng minh hệ sinh thái nông nghiệp bài bản, chuyên nghiệp giữa sức người và công nghệ cao:

### 4.1. Công Cụ & Dinh Dưỡng Hữu Cơ Canh Tác
* **Ảnh bộ nông cụ thủ công:**
  * `PF_TOOL_Hand_Trowel_800x800.png`: Xẻng con làm cỏ cán gỗ tần bì.
  * `PF_TOOL_Pruning_Shears_800x800.png`: Kéo cắt tỉa cành bấm đọt thép SK5 Nhật Bản.
  * `PF_TOOL_Harvesting_Basket_800x800.png`: Giỏ mây tre đan đựng rau củ thu hoạch truyền thống.
* **Ảnh phân bón & Chế phẩm sinh học:**
  * `PF_MATERIAL_Worm_Compost_1200x800.jpg`: Bao phân trùn quế nguyên chất hữu cơ 100% đạt chuẩn VietGAP.
  * `PF_MATERIAL_Neem_Oil_Spray_1200x800.jpg`: Tinh dầu Neem tự nhiên xua đuổi sâu bệnh an toàn sinh học.
  * `PF_MATERIAL_Organic_Bio_Fertilizer_1200x800.jpg`: Dung dịch đạm cá thủy phân và phân vi sinh ủ men tự nhiên.

### 4.2. Thiết Bị Phần Cứng Công Nghệ Cao (Smart Hardware Assets)
1. **Trạm Khí Tượng Vệ Tinh & Môi Trường Tại Vườn (Outdoor Weather Station Hub):**
   * *Model giả định:* PlotFarm WeatherGuard Pro v3.
   * *Nhiệm vụ:* Cảm biến nhiệt độ, độ ẩm không khí, áp suất khí quyển, cảm biến mưa điện dung và bức xạ UV.
   * *Ảnh cần up:* `PF_HARDWARE_Weather_Station_Mast_1200x800.jpg`.
2. **Cảm Biến Độ Ẩm & Độ Mặn EC Cắm Đất (Soil Moisture & EC Sensor Probe):**
   * *Model giả định:* RS485 Industrial Soil Probe (chống ăn mòn, ngập nước IP68).
   * *Nhiệm vụ:* Cắm tại độ sâu 10cm - 20cm tại các ô A-01, B-01... đo chính xác độ ẩm để tự động kích hoạt tưới.
   * *Ảnh cần up:* `PF_HARDWARE_Soil_Probe_InGround_1200x800.jpg`.
3. **Van Từ Điện Tử Tưới Tự Động (Smart Irrigation Solenoid Valve):**
   * *Nhiệm vụ:* Mở nguồn nước tưới nhỏ giọt khi nhận lệnh từ ứng dụng web hoặc tự động kích hoạt khi đất thiếu ẩm.
   * *Ảnh cần up:* `PF_HARDWARE_Smart_Solenoid_Valve_1200x800.jpg`.
4. **Camera Giám Sát Ô Đất Chống Nước (Plot Surveillance PTZ Camera):**
   * *Đặc tính:* Chuẩn bảo vệ ngoài trời IP67, độ phân giải 4MP Ultra HD, có đèn hồng ngoại ban đêm và ống kính góc rộng 110°.
   * *Ảnh cần up:* `PF_HARDWARE_PTZ_Camera_Pole_1200x800.jpg`.

---

# 5. HỆ THỐNG VIDEO THỰC TẾ & KỊCH BẢN QUẢNG BÁ (VIDEO ASSETS & STORYBOARDS)

Tập trung 4 video trọng tâm giải quyết bài toán trải nghiệm của khách hàng thuê đất từ xa:

### 5.1. Bảng Thông Tin Các File Video Thực Tế

| Tên File Video | Mô Tả Trọng Tâm | Thời Lượng | Kích Thước / Chuẩn | Link Mẫu Tải Xuống / Demo |
| :--- | :--- | :--- | :--- | :--- |
| `PF_VIDEO_01_Farm_Tour_Greenhouse.mp4` | Toàn cảnh nhà màng công nghệ cao, các luống rau xanh mướt và hệ thống béc tưới phun sương tự động lúc sáng sớm. | 35 giây | 1920x1080 (Full HD, 60fps) | `https://assets.mixkit.co/videos/preview/mixkit-vegetables-in-a-greenhouse-41584-large.mp4` |
| `PF_VIDEO_02_Farmer_Harvesting.mp4` | Nông dân địa phương nâng niu thu hoạch từng quả cà chua bi và từng bó xà lách tươi rói cho khách hàng. | 28 giây | 1920x1080 (Full HD, 30fps) | `https://assets.mixkit.co/videos/preview/mixkit-farmer-hands-harvesting-vegetables-41586-large.mp4` |
| `PF_VIDEO_03_Smart_Watering_IoT.mp4` | Quy trình hệ thống tưới nhỏ giọt tự động khởi động tưới đều cho luống rau khi có lệnh điều khiển từ xa. | 42 giây | 1920x1080 (Full HD, 30fps) | `https://assets.mixkit.co/videos/preview/mixkit-watering-plants-with-a-hose-in-a-greenhouse-41587-large.mp4` |
| `PF_VIDEO_04_Farm_To_Table_Delivery.mp4` | Quy trình sơ chế, đóng thùng giấy Kraft bảo vệ môi trường, dán tem QR Code truy xuất ô đất và trao tận tay khách hàng. | 25 giây | 1080x1920 (Vertical 9:16 Shorts/Reels) | Video mẫu tư liệu giao nhận nông sản PlotFarm |

---

### 5.2. Kịch Bản Video Giới Thiệu Mô Hình (Promo Storyboard - 60s)
* **Tiêu đề video:** *"PlotFarm - Nông Trại Của Bạn Ngay Trong Tầm Tay"*
* **Thời lượng:** 60 giây
* **Âm thanh nền:** Nhạc acoustic trong trẻo, tiếng chim hót và âm thanh nước tưới tự nhiên.

| Phân Cảnh (Scene) | Thời Lượng | Hình Ảnh / Khung Hình | Âm Thanh / Lời Bình (Voiceover) |
| :--- | :--- | :--- | :--- |
| **Cảnh 1: Vấn đề (Hook)** | 0s - 10s | Cảnh người thành phố bận rộn trong siêu thị, lo lắng khi chọn rau không rõ nguồn gốc, nhìn nhãn mác hóa chất. | *"Bạn muốn gia đình có rau sạch thật sự, nhưng ở phố thì không có đất trồng rau?"* |
| **Cảnh 2: Giải pháp PlotFarm** | 10s - 25s | Chuyển cảnh sang màn hình laptop/điện thoại: Người dùng lướt bản đồ nông trại PlotFarm, bấm chọn ô đất A-01 và chọn trồng Cà chua bi Cherry. | *"Với PlotFarm, bạn sở hữu riêng một ô đất canh tác thực tế tại nông trại Vườn Phúc Lộc chỉ bằng vài cú click chuột."* |
| **Cảnh 3: Chăm sóc & Giám sát** | 25s - 45s | Khung hình chia đôi (Split screen): Bên trái là màn hình điện thoại xem camera trực tiếp 24/7; bên phải là nông dân tận tâm tưới nước và bắt sâu sinh học tại luống đất đó. | *"Đội ngũ nông dân giàu kinh nghiệm chăm sóc từng ngày, hệ thống IoT tự động tưới tiêu và camera 24/7 giúp bạn ngắm nhìn khu vườn lớn lên mỗi ngày."* |
| **Cảnh 4: Trái ngọt về nhà** | 45s - 60s | Hộp rau quả tươi mọng vừa hái sáng sớm được shipper giao đến căn bếp ấm cúng, cả gia đình vui vẻ thưởng thức món salad sạch 100%. | *"Đến ngày thu hoạch, nông sản tươi ngon sẽ được đóng gói giao ngay đến tận bàn ăn nhà bạn. PlotFarm - Tự tay chọn đất, ăn sạch an tâm!"* |

---

# 6. CẤU TRÚC CÂY THƯ MỤC LƯU TRỮ CHUẨN TRÊN GOOGLE DRIVE

Khi upload lên Google Drive của nhóm tại thư mục `03_Media_Assets`, hãy tổ chức theo đúng cây thư mục sau:

```text
📁 03_Media_Assets/
│
├── 📁 01_Plots_And_Farm/
│   ├── PF_FARM_Aerial_Overview_Panorama_1920x1080.jpg
│   ├── PF_FARM_Entrance_Security_1920x1080.jpg
│   ├── PF_FARM_Water_Canal_System_1920x1080.jpg
│   ├── PF_PLOT_A01_PhuSa_Soil_1200x800.jpg
│   ├── PF_PLOT_B01_WormCastings_Soil_1200x800.jpg
│   ├── PF_PLOT_C01_Bazan_RedSoil_1200x800.jpg
│   └── PF_PLOT_D01_Greenhouse_Interior_1200x800.jpg
│
├── 📁 02_Crops_And_Vegetables/
│   ├── 📁 CROP_01_XaLach_Romaine/
│   │   ├── Stage1_Germination.jpg
│   │   ├── Stage2_Vegetative.jpg
│   │   └── Stage4_HarvestReady.jpg
│   ├── 📁 CROP_03_CaChua_Cherry/
│   │   ├── Stage1_Flowering.jpg
│   │   └── Stage4_RipeHarvest.jpg
│   ├── 📁 CROP_04_CaRot_Baby/
│   └── 📁 CROP_06_BapCai_Thao/
│
├── 📁 03_Equipment_And_IoT/
│   ├── PF_HARDWARE_Weather_Station_Mast_1200x800.jpg
│   ├── PF_HARDWARE_Soil_Probe_InGround_1200x800.jpg
│   ├── PF_HARDWARE_Smart_Solenoid_Valve_1200x800.jpg
│   ├── PF_HARDWARE_PTZ_Camera_Pole_1200x800.jpg
│   └── PF_MATERIAL_Worm_Compost_1200x800.jpg
│
└── 📁 04_Videos_Promotional/
    ├── PF_VIDEO_01_Farm_Tour_Greenhouse.mp4
    ├── PF_VIDEO_02_Farmer_Harvesting.mp4
    ├── PF_VIDEO_03_Smart_Watering_IoT.mp4
    ├── PF_VIDEO_04_Farm_To_Table_Delivery.mp4
    └── PF_STORYBOARD_Promo_Script_60s.pdf
```
