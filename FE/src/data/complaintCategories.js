// Danh mục khiếu nại chuẩn hoá dùng chung cho form gửi khiếu nại (UserPage) và gắn nhãn tự động (AdminPage).
export const COMPLAINT_CATEGORIES = [
  {
    groupLabel: "Vấn đề về Cây trồng & Canh tác",
    tag: { text: "Kỹ thuật canh tác", color: "#b54b35", background: "#fff0eb" },
    options: [
      { value: "cay_phat_trien_cham", label: "Cây trồng phát triển chậm / Có dấu hiệu héo úa" },
      { value: "sau_benh", label: "Cây bị sâu bệnh tấn công / Lá bị vàng, rụng bất thường" },
      { value: "cham_nhat_ky", label: "Nông dân chậm trễ trong việc cập nhật Nhật ký canh tác" },
      { value: "doi_giong_cay", label: "Yêu cầu thay đổi loại giống cây trồng / phương án chăm sóc" },
    ],
  },
  {
    groupLabel: "Vấn đề về Kỹ thuật & Hạ tầng",
    tag: { text: "Kỹ thuật hạ tầng", color: "#2f5fa8", background: "#eaf1fb" },
    options: [
      { value: "camera_loi", label: "Camera giám sát ô đất bị lỗi / Không xem được trực tiếp" },
      { value: "sai_thong_tin_o_dat", label: "Lỗi hiển thị thông tin ô đất trên ứng dụng (Sai diện tích, sai vị trí)" },
      { value: "su_co_tuoi_tieu", label: "Sự cố về hệ thống tưới tiêu tự động tại khu vực ô đất" },
    ],
  },
  {
    groupLabel: "Vấn đề về Hợp đồng, Thanh toán & Dịch vụ",
    tag: { text: "Tài chính", color: "#a96c29", background: "#fff7e9" },
    options: [
      { value: "khieu_nai_thanh_toan", label: "Khiếu nại về giao dịch thanh toán (Trừ tiền nhưng chưa xác nhận đơn)" },
      { value: "gia_han_thanh_ly", label: "Yêu cầu gia hạn hoặc thanh lý hợp đồng thuê ô đất trước thời hạn" },
      { value: "thai_do_phuc_vu", label: "Phản ánh về thái độ phục vụ của Nông dân / Nhân viên hỗ trợ" },
      { value: "tranh_chap_khac", label: "Các vấn đề tranh chấp khác về quyền lợi thuê đất" },
    ],
  },
];

export const OTHER_COMPLAINT_OPTION = {
  value: "khac",
  label: 'Khác (Vui lòng ghi rõ ở mô tả)',
  tag: { text: "Khác", color: "#526658", background: "#edf1eb" },
};

const DEFAULT_TAG = OTHER_COMPLAINT_OPTION.tag;

// tieu_de không có cột phân loại riêng trong DB, nên nhãn của Admin được suy ra bằng cách khớp đúng
// văn bản tiêu đề đã chọn với danh mục tương ứng (mục "Khác" nhập tự do sẽ luôn nhận nhãn mặc định).
const LABEL_TO_TAG = COMPLAINT_CATEGORIES.reduce((map, group) => {
  group.options.forEach((option) => {
    map[option.label] = group.tag;
  });
  return map;
}, {});

export function getComplaintTagByTitle(title) {
  return LABEL_TO_TAG[title] || DEFAULT_TAG;
}
