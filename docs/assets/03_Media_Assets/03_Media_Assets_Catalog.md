# DANH MỤC ASSET TRUYỀN THÔNG & HÌNH ẢNH THỰC TẾ (MEDIA ASSETS)
## DỰ ÁN: PLOTFARM - NỀN TẢNG CHO THUÊ Ô ĐẤT & CANH TÁC NÔNG TRẠI THÔNG MINH ONLINE
**Phụ trách:** Backend Team (Đào Đại Sơn - Phan Nguyễn Ngọc Quý)  
**Nhóm:** Group 11 (OJT FPT)  
**Mục tiêu:** Tổng hợp toàn bộ tư liệu ảnh chất lượng cao, video thực tế, thiết bị hạ tầng và nội dung phục vụ lưu trữ Google Drive (`03_Media_Assets`) để trình mentor và bàn giao dự án.

---

## 1. HÌNH ẢNH CÁC Ô ĐẤT & NÔNG TRẠI (PLOT & FARM IMAGERY)

Tất cả các hình ảnh được chuẩn hóa theo tỷ lệ khung hình 16:9 và 4:3, độ phân giải cao (Full HD 1920x1080 / 2K), thể hiện rõ nét độ phì nhiêu của đất, quy hoạch phân lô và cảnh quan môi trường.

### 1.1. Toàn cảnh Nông trại (Farm Overview)
* **Tên nông trại chuẩn trong DB:** Vườn Phúc Lộc (Mã NT: 1)
* **Vị trí địa lý:** Huyện Hòa Vang, Thành phố Đà Nẵng (Tọa độ GPS: `15.9628, 108.1824`)
* **Đặc điểm:** Không gian mở ven sông, đón ánh sáng tự nhiên đầy đủ, có hàng rào cây xanh sinh thái bao bọc, nguồn nước tưới ngầm tự nhiên không nhiễm phèn chua.
* **Danh mục ảnh cần up Drive:**
  1. `farm_panoramic_aerial.jpg`: Ảnh chụp Flycam góc rộng toàn cảnh 5 hecta vườn rau phân lô bàn cờ.
  2. `farm_entrance_gate.jpg`: Cổng chính nông trại Vườn Phúc Lộc với biển chào gỗ mộc mạc và lối đi xe cơ giới.
  3. `farm_greenhouse_cluster.jpg`: Dãy nhà màng công nghệ cao chống côn trùng và mưa xối rễ.
  4. `farm_irrigation_canal.jpg`: Hệ thống kênh mương dẫn nước điều hòa sinh thái quanh nông trại.
* **Nguồn ảnh minh họa chuẩn:**
  * Toàn cảnh cánh đồng sinh thái: `https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1920&q=85`

---

### 1.2. Hình ảnh chi tiết từng loại đất theo phân lô (Plot Soils)
Dữ liệu tương ứng với bảng `ODat` trong Database:

| Mã số hiệu | Tên ô đất | Loại đất | Diện tích | Đặc tính sinh học | Ảnh mẫu chất lượng cao |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A-01 -> A-10** | Ô đất Xanh Phú Quý | Đất phù sa ven sông | 20 m² - 30 m² | Giàu phù sa màu mỡ, tơi xốp, giữ ẩm tốt, tối ưu rau ăn lá ngắn ngày (xà lách, cải thìa). | `https://images.unsplash.com/photo-1592417817098-8f3d6ef23a24?auto=format&fit=crop&w=1200&q=85` |
| **B-01 -> B-08** | Ô đất Hữu Cơ Bổ Dưỡng | Đất vi sinh trùn quế | 35 m² - 50 m² | Đã được ủ phân trùn quế hữu cơ, mật độ vi sinh cao, thích hợp trồng củ quả sạch (cà rốt baby, dưa leo). | `https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=85` |
| **C-01 -> C-06** | Ô đất Bazan Đồi Cao | Đất đỏ Bazan | 50 m² - 80 m² | Tầng đất mặt dày, giàu khoáng chất sắt/nhôm, thoát nước cực nhanh, chuyên canh cây gia vị và ớt chuông. | `https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=85` |
| **D-01 -> D-04** | Ô đất Nhà Màng VIP | Đất giá thể xơ dừa cao cấp | 40 m² | Canh tác trong nhà màng kín, kiểm soát dinh dưỡng nhỏ giọt tự động, tối ưu dâu tây và dưa lưới. | `https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1200&q=85` |

---

## 2. HÌNH ẢNH CÂY TRỒNG & VẬT LIỆU GIỐNG (CROPS & VEGETABLES IMAGERY)

Hình ảnh cây trồng được chụp ở các góc độ: hạt giống/cây giống con, cây đang lớn trên giàn/luống, và giai đoạn thu hoạch đóng gói.

### 2.1. Rau ăn lá sạch (Leafy Greens)
1. **Rau xà lách Romaine hữu cơ:**
   * *Đặc tính:* Giòn ngọt, thời gian lớn: 35-40 ngày.
   * *Ảnh:* `https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=85`
2. **Cải thìa / Cải thìa trắng:**
   * *Đặc tính:* Dễ trồng, chịu nhiệt tốt, thời gian lớn: 30 ngày.
   * *Ảnh:* `https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=85`
3. **Bắp cải thảo ngọt:**
   * *Đặc tính:* Cuộn lá chặt, mọng nước, năng suất 3.5 kg/m².
   * *Ảnh:* `https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=800&q=85`

### 2.2. Rau củ & Quả bổ dưỡng (Vegetables & Fruits)
1. **Cà chua bi Cherry đỏ mọng:**
   * *Đặc tính:* Chùm quả sum suê, hàm lượng vitamin C và lycopene cao.
   * *Ảnh:* `https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=85`
2. **Cà rốt hữu cơ Baby:**
   * *Đặc tính:* Củ cam giòn ngọt tự nhiên, không tồn dư hóa chất.
   * *Ảnh:* `https://images.unsplash.com/photo-1598170845058-32b9d6a5c71d?auto=format&fit=crop&w=800&q=85`
3. **Dưa leo sạch (Dưa leo Nhật/Baby):**
   * *Đặc tính:* Trái đều, vỏ xanh đậm, giòn ngọt ăn sống hoặc làm salad.
   * *Ảnh:* `https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=85`
4. **Ớt chuông Đà Lạt 3 màu:**
   * *Đặc tính:* Vị giòn, không cay, giàu vitamin A.
   * *Ảnh:* `https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=85`

---

## 3. HÌNH ẢNH CÔNG CỤ, VẬT TƯ & THIẾT BỊ NÔNG NGHIỆP THÔNG MINH IOT (FARM EQUIPMENT & SMART IOT)

Minh chứng hạ tầng hiện đại và cam kết chăm sóc bài bản của PlotFarm:

### 3.1. Dụng cụ làm vườn & Vật tư sinh học
* **Bộ dụng cụ chăm sóc:** Cuốc tay inox, xẻng làm vườn cán gỗ sồi, kéo tỉa lá đọt chuyên dụng, bình phun sinh học áp suất cao.
* **Vật tư dinh dưỡng:** Phân bò ủ hoai vi sinh trichoderma, trùn quế ép viên tan chậm, chế phẩm xua đuổi côn trùng chiết xuất từ tỏi ớt gừng sinh học.
* **Hệ thống tưới:** Dây dẫn tưới nhỏ giọt công nghệ Israel cắm sát gốc từng hàng cây, béc phun sương chống sốc nhiệt lúc giữa trưa.

### 3.2. Thiết bị phần cứng IoT & Giám sát thực địa
1. **Trạm cảm biến quan trắc môi trường ngoài trời (IoT Weather Station):**
   * Cảm biến đo nhiệt độ không khí, độ ẩm môi trường, cảm biến mưa điện dung và đo chỉ số tia UV ngoài trời.
   * Kết nối vi điều khiển truyền dữ liệu thời gian thực về máy chủ PlotFarm.
2. **Cảm biến độ ẩm & EC đất (Soil Moisture & EC Sensor):**
   * Đầu dò thép không gỉ cắm sâu 15cm dưới lòng đất của từng ô đất A-01, B-01... để kiểm soát độ ẩm rễ cây.
3. **Camera an ninh giám sát ô đất (Plot Security Camera):**
   * Camera thân trụ ngoài trời chuẩn chống nước IP67, hỗ trợ nhìn đêm hồng ngoại (Night Vision) và cảm biến chuyển động.
   * Phát luồng video trực tuyến 24/7 để người dùng mở ứng dụng là thấy cây của mình lớn lên mỗi ngày.

---

## 4. DANH MỤC VIDEO THỰC TẾ & QUẢNG BÁ (PROMOTIONAL & OPERATIONAL VIDEOS)

Tập hợp video ngắn (MP4 HD/4K) phục vụ minh họa giao diện, làm banner video nền cho website và tạo sự tin tưởng cho khách hàng:

| Tên Video File | Mô tả nội dung video | Thời lượng | Định dạng | Đường link trực tiếp / Mẫu |
| :--- | :--- | :--- | :--- | :--- |
| `video_farm_tour.mp4` | Video toàn cảnh nông trại nhà màng, các luống rau xanh mướt và hệ thống phun sương tự động. | 35s | MP4 Full HD (H.264) | `https://assets.mixkit.co/videos/preview/mixkit-vegetables-in-a-greenhouse-41584-large.mp4` |
| `video_harvesting.mp4` | Đôi bàn tay nông dân địa phương thu hoạch từng luống rau cải và cà chua tươi ngon vào rổ tre. | 28s | MP4 Full HD (H.264) | `https://assets.mixkit.co/videos/preview/mixkit-farmer-hands-harvesting-vegetables-41586-large.mp4` |
| `video_plot_livestream.mp4` | Mẫu luồng camera góc nhìn từ cột camera ô đất A-01 quan sát luống dưa leo và xà lách. | 45s (Loop) | MP4 / HLS Stream | `https://assets.mixkit.co/videos/preview/mixkit-watering-plants-with-a-hose-in-a-greenhouse-41587-large.mp4` |
| `video_customer_unboxing.mp4` | Thùng nông sản PlotFarm giao đến tận cửa nhà khách hàng, rau củ đóng hộp giấy Kraft kèm tem mã QR truy xuất nguồn gốc ô đất. | 20s | MP4 (1080x1920) | Mẫu video Reels/Tiktok |

---

## 5. HƯỚNG DẪN TỔ CHỨC CẤU TRÚC THƯ MỤC GOOGLE DRIVE (`03_Media_Assets`)

Khi tải các file này lên Google Drive, nhóm Backend khuyến nghị cấu trúc thư mục sau:

```text
📁 03_Media_Assets/
├── 📁 01_Plots_And_Farm/
│   ├── farm_overview_aerial_01.jpg
│   ├── plot_type_phusa_A01.jpg
│   ├── plot_type_trunque_B01.jpg
│   ├── plot_type_bazan_C01.jpg
│   └── plot_type_greenhouse_D01.jpg
├── 📁 02_Crops_And_Vegetables/
│   ├── crop_xalach_romaine.jpg
│   ├── crop_caithia.jpg
│   ├── crop_cachua_cherry.jpg
│   ├── crop_carot_baby.jpg
│   └── crop_dualeo.jpg
├── 📁 03_Equipment_And_IoT/
│   ├── iot_weather_sensor_station.jpg
│   ├── iot_soil_moisture_probe.jpg
│   ├── camera_stream_hardware_ip67.jpg
│   └── smart_irrigation_solenoid_valve.jpg
└── 📁 04_Videos/
    ├── video_farm_tour_greenhouse.mp4
    ├── video_harvesting_fresh_veggies.mp4
    └── video_camera_livestream_simulation.mp4
```
