import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createRental,
  confirmRentalPayment,
  getRentalPaymentInfo,
  createServiceRequest,
  getCrops,
  getJournalsByRental,
  getPlots,
  getServiceTypes,
  getUserRentals,
  getUserServiceRequests,
  getUserComplaints,
  submitComplaint,
  registerHarvestDelivery,
  PLOT_PLACEHOLDER_IMAGE,
  resolveImageUrl,
  updateCurrentUser,
  getUserHarvestDeliveries,
  chooseHarvestDelivery,
  extendRental,
  chooseNewCrop,
} from "../api.js";
import AccountMenu from "./AccountMenu.jsx";
import ProfilePanel from "./ProfilePanel.jsx";
import { notify } from "./ToastProvider.jsx";
import { COMPLAINT_CATEGORIES, OTHER_COMPLAINT_OPTION } from "../data/complaintCategories.js";
import { vietnamProvinces } from "../data/vietnamAddress.js";

const formatMoney = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";
const daysRemaining = (value) =>
  Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
const requestStatus = {
  cho_tiep_nhan: "Chờ tiếp nhận",
  da_tiep_nhan: "Đã tiếp nhận",
  dang_thuc_hien: "Đang xử lý",
  hoan_thanh: "Đã hoàn thành",
  tu_choi: "Từ chối",
};
const contractStatusLabels = {
  hieu_luc: "Đang thuê",
  da_ket_thuc: "Đã kết thúc",
  da_huy: "Đã hủy",
};
// Nguồn sự thật cho trạng thái sau thu hoạch là trang_thai_canh_tac === "da_thu_hoach" hoặc trang_thai_hop_dong === "da_ket_thuc" (do BE trả về sau khi bàn giao)
function rentalStatusLabel(rental) {
  if (
    rental.trang_thai_canh_tac === "da_thu_hoach" ||
    rental.trang_thai_hop_dong === "da_ket_thuc"
  ) {
    return "Đã hoàn tất thu hoạch";
  }
  return contractStatusLabels[rental.trang_thai_hop_dong] || rental.trang_thai_hop_dong;
}

function journalImages(item) {
  const raw = item?.danh_sach_hinh_anh ?? item?.hinh_anh ?? "[]";

  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === "string" && parsed.trim()) return [parsed];
    } catch {
      // raw may be a single URL or comma-separated list
      if (trimmed.startsWith("http") || trimmed.startsWith("/") || trimmed.startsWith("data:")) {
        return [trimmed];
      }
      return trimmed
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }

  if (typeof raw === "object" && raw !== null) {
    return Object.values(raw).filter(Boolean);
  }

  return [];
}

function UserPage({ user, token, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rentals, setRentals] = useState([]);
  const [availablePlots, setAvailablePlots] = useState([]);
  const [crops, setCrops] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedJournalRental, setSelectedJournalRental] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeTab = searchParams.get("tab") || "gardens";
  const [filters, setFilters] = useState({
    search: "",
    soil: "Tất cả loại đất",
    maxPrice: "Tất cả mức giá",
  });
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [booking, setBooking] = useState({
    duration: "3",
    crop: "",
    payment: "Chuyển khoản",
  });
  const [bookingStep, setBookingStep] = useState("details");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [rentalDetail, setRentalDetail] = useState(null);
  const [notice, setNotice] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [harvestDeliveries, setHarvestDeliveries] = useState([]);
  const [selectedCareRental, setSelectedCareRental] = useState("");
  const [selectedHarvestRental, setSelectedHarvestRental] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [harvestProvince, setHarvestProvince] = useState("");
  const [harvestDistrict, setHarvestDistrict] = useState("");
  const [harvestForm, setHarvestForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    note: "",
  });
  const [harvestSubmitting, setHarvestSubmitting] = useState(false);
  const harvestDistricts = useMemo(
    () =>
      vietnamProvinces.find((province) => province.name === harvestProvince)
        ?.districts || [],
    [harvestProvince],
  );
  const [complaintForm, setComplaintForm] = useState({
    ma_hop_dong: "",
    ma_o_dat: "",
    category: "",
    tieu_de: "",
    mo_ta_chi_tiet: "",
  });
  const [activeExtendModal, setActiveExtendModal] = useState(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [activeNewCropModal, setActiveNewCropModal] = useState(null);
  const [newCropSelectedId, setNewCropSelectedId] = useState("");
  const [newCropNote, setNewCropNote] = useState("");
  const [newCropSubmitting, setNewCropSubmitting] = useState(false);

  const selectTab = (tab) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === "gardens") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  const setActiveTab = selectTab;

  useEffect(() => {
    Promise.all([
      getUserRentals(user.id, token),
      getPlots(),
      getCrops(),
      getServiceTypes(),
      getUserServiceRequests(user.id, token),
      getUserComplaints(user.id, token),
      getUserHarvestDeliveries(token),
    ])
      .then(
        async ([
          nextRentals,
          nextPlots,
          nextCrops,
          nextServiceTypes,
          nextServiceRequests,
          nextComplaints,
          nextHarvestDeliveries,
        ]) => {
          setRentals(nextRentals);
          const assignedRentals = nextRentals.filter(
            (rental) => rental.trang_thai_phan_cong === "da_chap_nhan",
          );
          setSelectedCareRental(
            String(assignedRentals[0]?.ma_hop_dong || ""),
          );
          setSelectedJournalRental(
            String(assignedRentals[0]?.ma_hop_dong || ""),
          );
          const readyRental = nextRentals.find(
            (rental) => rental.trang_thai_canh_tac === "san_sang_thu_hoach",
          );
          setSelectedHarvestRental(
            String(readyRental?.ma_hop_dong || nextRentals[0]?.ma_hop_dong || ""),
          );
          setAvailablePlots(
            nextPlots.filter((plot) => plot.status === "trong"),
          );
          setCrops(nextCrops);
          setServiceTypes(nextServiceTypes);
          setServiceRequests(nextServiceRequests);
          setComplaints(nextComplaints);
          setHarvestDeliveries(nextHarvestDeliveries);
          const readyDelivery = nextHarvestDeliveries.find((item) => item.trang_thai === "cho_khach_chon");
          if (readyDelivery) {
            setSelectedHarvestRental(String(readyDelivery.ma_hop_dong));
            setHarvestForm((current) => ({
              ...current,
              name: current.name || user.name || "",
              phone: current.phone || user.phone || "",
            }));
            if (!searchParams.get("tab")) setSearchParams(new URLSearchParams("tab=harvest"));
          }
          const grouped = await Promise.all(
            nextRentals.map((rental) =>
              getJournalsByRental(rental.ma_hop_dong, token).catch(() => []),
            ),
          );
          setJournals(
            grouped
              .flat()
              .sort(
                (a, b) =>
                  new Date(b.ngay_ghi_nhat_ky || b.ngay_tao) -
                  new Date(a.ngay_ghi_nhat_ky || a.ngay_tao),
              ),
          );
        },
      )
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [user.id, token]);

  const filteredPlots = useMemo(
    () =>
      availablePlots.filter((plot) => {
        const search = filters.search.toLowerCase();
        return (
          (!search ||
            `${plot.id} ${plot.location} ${plot.soil}`
              .toLowerCase()
              .includes(search)) &&
          (filters.soil === "Tất cả loại đất" || plot.soil === filters.soil) &&
          (filters.maxPrice === "Tất cả mức giá" ||
            plot.price <= Number(filters.maxPrice))
        );
      }),
    [availablePlots, filters],
  );
  const tabs = [
    ["gardens", "Khu vườn của tôi"],
    ["find", "Tìm & lọc ô đất"],
    ["journal", "Nhật ký canh tác"],
    ["live", "Camera trực tiếp"],
    ["support", "Yêu cầu chăm sóc"],
    ["harvest", "Quản lý thu hoạch"],
  ];
  const showNotice = (message) => {
    setNotice(message);
    notify(message);
    window.setTimeout(() => setNotice(""), 3500);
  };
  const openBooking = (plot) => {
    setSelectedPlot(plot);
    setBookingStep("details");
    setBooking({
      duration: "3",
      crop: crops[0] ? String(crops[0].ma_cay_trong) : "",
      payment: "Chuyển khoản",
    });
  };
  const closeBooking = () => {
    setSelectedPlot(null);
    setBookingStep("details");
  };
  const continueToPayment = (event) => {
    event.preventDefault();
    const selectedCropObj = crops.find(
      (crop) => String(crop.ma_cay_trong) === String(booking.crop),
    );
    const rentalDays = Number(booking.duration) * 30;
    if (selectedCropObj && selectedCropObj.thoi_gian_sinh_truong_ngay > rentalDays) {
      const minMonths = Math.ceil(selectedCropObj.thoi_gian_sinh_truong_ngay / 30);
      notify(
        `Cây "${selectedCropObj.ten_cay_trong}" cần ${selectedCropObj.thoi_gian_sinh_truong_ngay} ngày để phát triển. Bạn cần thuê tối thiểu ${minMonths} tháng!`,
        "error"
      );
      return;
    }
    setBookingStep("payment");
  };

  const handleExtendSubmit = async (event) => {
    event.preventDefault();
    if (!activeExtendModal) return;
    setExtendSubmitting(true);
    try {
      const response = await extendRental(
        activeExtendModal.ma_hop_dong,
        { so_thang_gia_han: extendMonths },
        token
      );
      if (response.success) {
        notify(response.message || "Gia hạn hợp đồng thành công!");
        showNotice(
          `Đã gia hạn hợp đồng ${activeExtendModal.so_hop_dong} thêm ${extendMonths} tháng. Vui lòng thanh toán qua VietQR.`
        );
        const contractInfo = activeExtendModal;
        setActiveExtendModal(null);
        setRentals(await getUserRentals(user.id, token));
        if (response.data?.payment_info) {
          setActivePaymentModal({
            ma_hop_dong: contractInfo.ma_hop_dong,
            so_hop_dong: `${contractInfo.so_hop_dong} (Gia hạn)`,
            tong_tien: response.data.chi_phi_gia_han,
            payment_info: response.data.payment_info,
            qr_code_url: response.data.qr_code_url,
          });
        }
      } else {
        notify(response.message || "Không thể gia hạn hợp đồng", "error");
      }
    } catch (err) {
      notify(err.message || "Lỗi khi gia hạn hợp đồng", "error");
    } finally {
      setExtendSubmitting(false);
    }
  };

  const handleChooseNewCropSubmit = async (event) => {
    event.preventDefault();
    if (!activeNewCropModal || !newCropSelectedId) {
      notify("Vui lòng chọn loại giống cây trồng", "error");
      return;
    }
    setNewCropSubmitting(true);
    try {
      const response = await chooseNewCrop(
        activeNewCropModal.ma_hop_dong,
        {
          ma_cay_trong: Number(newCropSelectedId),
          yeu_cau_dac_biet: newCropNote,
        },
        token
      );
      if (response.success) {
        notify(response.message || "Khởi tạo vụ mùa mới thành công!");
        showNotice(
          `Đã khởi tạo vụ mùa mới trên ô đất ${activeNewCropModal.so_hieu_o} với giống cây ${response.data?.ten_cay_trong}. Nông dân sẽ sớm bắt đầu gieo trồng!`
        );
        setActiveNewCropModal(null);
        setRentals(await getUserRentals(user.id, token));
      } else {
        notify(response.message || "Không thể khởi tạo vụ mùa mới", "error");
      }
    } catch (err) {
      notify(err.message || "Lỗi khi khởi tạo vụ mùa mới", "error");
    } finally {
      setNewCropSubmitting(false);
    }
  };
  const submitBooking = async (event) => {
    event.preventDefault();
    setError("");
    setBookingSubmitting(true);
    try {
      const response = await createRental(
        {
          ma_nguoi_dung: user.id,
          ma_o_dat: selectedPlot.id,
          ma_cay_trong: booking.crop || null,
          thoi_han_thang: Number(booking.duration),
        },
        token,
      );
      const createdData = response?.data || response;
      setRentals(await getUserRentals(user.id, token));
      setAvailablePlots((plots) =>
        plots.filter((plot) => plot.id !== selectedPlot.id),
      );
      closeBooking();
      setActivePaymentModal(createdData);
      showNotice(
        `Đã tạo hợp đồng thuê ô ${selectedPlot.code}! Vui lòng quét mã VietQR để hoàn tất thanh toán.`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const openRentalPayment = async (rental) => {
    try {
      const paymentData = await getRentalPaymentInfo(rental.ma_hop_dong, token);
      setActivePaymentModal(paymentData);
    } catch (err) {
      setError(err.message || "Không thể tải thông tin thanh toán");
      notify(err.message || "Không thể tải thông tin thanh toán", "error");
    }
  };

  const handleConfirmPayment = async (rentalId) => {
    setPaymentSubmitting(true);
    try {
      await confirmRentalPayment(rentalId, token);
      setRentals(await getUserRentals(user.id, token));
      setActivePaymentModal(null);
      showNotice("Thanh toán thành công! Hợp đồng thuê đất đã được kích hoạt hiệu lực.");
      notify("Thanh toán thành công! Hợp đồng đã có hiệu lực.");
      selectTab("gardens");
    } catch (err) {
      setError(err.message || "Lỗi khi xác nhận thanh toán");
      notify(err.message || "Lỗi khi xác nhận thanh toán", "error");
    } finally {
      setPaymentSubmitting(false);
    }
  };
  const submitSupport = async (event) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const rental = rentals.find(
      (item) => String(item.ma_hop_dong) === String(selectedCareRental),
    );
    try {
      if (!rental)
        throw new Error("Bạn cần có hợp đồng trước khi gửi yêu cầu chăm sóc");
      await createServiceRequest(
        {
          ma_hop_dong: rental.ma_hop_dong,
          ma_khach_hang: user.id,
          ma_loai_dich_vu: Number(form.get("serviceType")),
          ngay_yeu_cau_thuc_hien: form.get("schedule"),
          ghi_chu_cua_khach: form.get("note"),
        },
        token,
      );
      setServiceRequests(await getUserServiceRequests(user.id, token));
      setSupportSent(true);
      showNotice("Đã gửi yêu cầu chăm sóc tới đội ngũ PlotFarm.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleComplaintSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (!complaintForm.ma_hop_dong || !complaintForm.tieu_de || !complaintForm.mo_ta_chi_tiet) {
        throw new Error("Vui lòng điền đầy đủ thông tin khiếu nại");
      }

      await submitComplaint({
        ma_hop_dong: Number(complaintForm.ma_hop_dong),
        ma_o_dat: complaintForm.ma_o_dat ? Number(complaintForm.ma_o_dat) : null,
        tieu_de: complaintForm.tieu_de,
        mo_ta_chi_tiet: complaintForm.mo_ta_chi_tiet,
      }, token);

      setComplaints(await getUserComplaints(user.id, token));
      setComplaintForm({
        ma_hop_dong: "",
        ma_o_dat: "",
        category: "",
        tieu_de: "",
        mo_ta_chi_tiet: "",
      });
      showNotice("Đã gửi khiếu nại tới Admin. Chúng tôi sẽ xử lý sớm.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitHarvestDelivery = async (event) => {
    event.preventDefault();
    if (!selectedHarvestRental) {
      notify("Vui lòng chọn ô đất cần đăng ký nhận nông sản", "error");
      return;
    }
    setHarvestSubmitting(true);
    try {
      await registerHarvestDelivery(
        {
          rentalId: selectedHarvestRental,
          hinh_thuc_nhan_hang: shippingMethod,
          ten_nguoi_nhan: harvestRecipientName || user.name,
          so_dien_thoai_nguoi_nhan: harvestRecipientPhone || user.phone || "",
          dia_chi_giao_hang: harvestAddress,
          tinh_thanh: harvestProvince,
          quan_huyen: harvestDistrict,
        },
        token,
      );
      setHarvestSent(true);
      showNotice("Đăng ký hình thức nhận nông sản thành công!");
      notify(
        "Đăng ký nhận nông sản thành công! Nông trại sẽ chuẩn bị bàn giao theo yêu cầu của bạn.",
      );
    } catch (err) {
      setError(err.message || "Không thể đăng ký nhận nông sản");
      notify(err.message || "Không thể đăng ký nhận nông sản", "error");
    } finally {
      setHarvestSubmitting(false);
    }
  };

  const paymentModal = activePaymentModal && (
    <div className="booking-backdrop">
      <div
        className="booking-modal"
        style={{
          width: "min(100%, 500px)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "30px 25px",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setActivePaymentModal(null)}
        >
          ×
        </button>
        <p className="eyebrow" style={{ color: "#2b8a3e", marginBottom: "4px" }}>
          THANH TOÁN VIETQR NAPAS 24/7
        </p>
        <h2 style={{ fontSize: "24px", marginBottom: "6px" }}>Mã QR Thanh Toán Đơn Thuê</h2>
        <p style={{ margin: "0 0 14px", color: "#526658", fontSize: "13px" }}>
          Hợp đồng: <strong>{activePaymentModal.so_hop_dong}</strong>
          {activePaymentModal.so_hieu_o ? ` · Ô đất: ${activePaymentModal.so_hieu_o}` : ""}
        </p>

        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 16px" }}>
          <img
            src={activePaymentModal.qr_code_url || activePaymentModal.payment_info?.qr_code_url}
            alt="VietQR Code"
            style={{
              maxWidth: "280px",
              width: "100%",
              height: "auto",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              border: "1px solid #dfe1da",
              background: "#fff",
            }}
          />
        </div>

        <div className="booking-summary" style={{ textAlign: "left", marginBottom: "14px" }}>
          <div>
            <span>Ngân hàng</span>
            <strong>{activePaymentModal.bank_info?.bank_name || activePaymentModal.payment_info?.bank_name || "MBBank (Quân Đội)"}</strong>
          </div>
          <div>
            <span>Số tài khoản</span>
            <strong style={{ color: "#173525", fontSize: "14px", letterSpacing: "1px" }}>
              {activePaymentModal.bank_info?.account_no || activePaymentModal.payment_info?.account_no || "0905123456"}
            </strong>
          </div>
          <div>
            <span>Tên tài khoản</span>
            <strong>{activePaymentModal.bank_info?.account_name || activePaymentModal.payment_info?.account_name || "PLOTFARM VIETNAM"}</strong>
          </div>
          <div>
            <span>Số tiền thanh toán</span>
            <strong style={{ color: "#c98b3c", fontSize: "16px" }}>
              {formatMoney(activePaymentModal.tong_tien || activePaymentModal.payment_info?.amount || activePaymentModal.tongTien || 0)}
            </strong>
          </div>
          <div>
            <span>Nội dung chuyển khoản</span>
            <strong style={{ color: "#173525", background: "#e2e9df", padding: "3px 8px", borderRadius: "4px" }}>
              {activePaymentModal.transfer_content || activePaymentModal.payment_info?.transfer_content || `PFTHUE ${activePaymentModal.so_hop_dong}`}
            </strong>
          </div>
        </div>

        <p className="payment-note" style={{ textAlign: "left", marginBottom: "14px" }}>
          Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ, chọn <strong>Quét mã QR</strong> để chuyển tiền. Sau khi thanh toán, bấm xác nhận bên dưới để hệ thống kích hoạt hợp đồng ngay lập tức.
        </p>

        <div className="booking-actions" style={{ marginTop: "10px" }}>
          <button
            type="button"
            className="outline-button"
            onClick={() => setActivePaymentModal(null)}
          >
            Đóng / Để sau
          </button>
          <button
            type="button"
            className="primary-button booking-submit"
            disabled={paymentSubmitting}
            onClick={() => handleConfirmPayment(activePaymentModal.ma_hop_dong || activePaymentModal.id)}
          >
            {paymentSubmitting ? "Đang xử lý..." : "Tôi đã chuyển khoản thành công ✓"}
          </button>
        </div>
      </div>
    </div>
  );

  const rentalDetailModal = rentalDetail && (
    <div className="booking-backdrop" onClick={() => setRentalDetail(null)}>
      <div
        className="booking-modal"
        style={{ width: "min(100%, 640px)", maxHeight: "90vh", overflowY: "auto", padding: "0" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setRentalDetail(null)}
        >
          ×
        </button>
        <div
          style={{
            height: "220px",
            backgroundImage: `linear-gradient(rgba(23,53,37,.15), rgba(23,53,37,.35)), url("${resolveImageUrl(rentalDetail.hinh_anh_o_dat || PLOT_PLACEHOLDER_IMAGE)}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div style={{ padding: "26px 30px 30px" }}>
          <p className="eyebrow" style={{ color: "#2b8a3e", marginBottom: "4px" }}>
            {rentalDetail.so_hieu_o}
            {rentalDetail.trang_thai_hop_dong === "hieu_luc" ? " · ĐANG THUÊ" : ` · ${rentalDetail.trang_thai_hop_dong}`}
          </p>
          <h2 style={{ fontSize: "26px", margin: "0 0 6px" }}>{rentalDetail.ten_o_dat}</h2>
          <p style={{ margin: "0 0 16px", color: "#526658", fontSize: "13px" }}>
            {rentalDetail.ten_nong_trai}
            {rentalDetail.quan_huyen ? ` · ${rentalDetail.quan_huyen}, ${rentalDetail.tinh_thanh}` : ""}
          </p>

          <div className="detail-facts" style={{ margin: "0 0 22px" }}>
            <div>
              <small>Diện tích</small>
              <strong>{rentalDetail.dien_tich_m2}m²</strong>
            </div>
            <div>
              <small>Loại đất</small>
              <strong>{rentalDetail.loai_dat}</strong>
            </div>
            <div>
              <small>Hệ thống tưới</small>
              <strong>{rentalDetail.he_thong_tuoi}</strong>
            </div>
            <div>
              <small>Ánh sáng</small>
              <strong>{rentalDetail.huong_anh_sang}</strong>
            </div>
            <div>
              <small>Giá thuê/tháng</small>
              <strong>{formatMoney(rentalDetail.gia_thue_thang)}</strong>
            </div>
          </div>

          <div className="booking-summary" style={{ marginBottom: "16px" }}>
            <div>
              <span>Hợp đồng</span>
              <strong>{rentalDetail.so_hop_dong}</strong>
            </div>
            <div>
              <span>Cây trồng</span>
              <strong>{rentalDetail.ten_cay_trong || "Chưa chọn cây trồng"}</strong>
            </div>
            <div>
              <span>Farmer phụ trách</span>
              <strong>
                {rentalDetail.ten_nong_dan || "Đang chờ phân công"}
                {rentalDetail.sdt_nong_dan ? ` · ${rentalDetail.sdt_nong_dan}` : ""}
              </strong>
            </div>
            <div>
              <span>Bắt đầu thuê</span>
              <strong>{formatDate(rentalDetail.ngay_bat_dau)}</strong>
            </div>
            <div>
              <span>Kết thúc thuê</span>
              <strong>{formatDate(rentalDetail.ngay_ket_thuc)}</strong>
            </div>
            <div>
              <span>Tổng tiền</span>
              <strong>{formatMoney(rentalDetail.tong_tien)}</strong>
            </div>
          </div>

          {rentalDetail.mo_ta_chi_tiet && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "13px", color: "#173525" }}>
                Mô tả ô đất
              </p>
              <p style={{ margin: 0, color: "#526658", fontSize: "13px", lineHeight: 1.6 }}>
                {rentalDetail.mo_ta_chi_tiet}
              </p>
            </div>
          )}

          {rentalDetail.yeu_cau_dac_biet && (
            <div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "13px", color: "#173525" }}>
                Yêu cầu đặc biệt
              </p>
              <p style={{ margin: 0, color: "#526658", fontSize: "13px", lineHeight: 1.6 }}>
                {rentalDetail.yeu_cau_dac_biet}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const extendModal = activeExtendModal && (
    <div className="booking-backdrop" onClick={() => setActiveExtendModal(null)}>
      <div
        className="booking-modal"
        style={{ width: "min(100%, 540px)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setActiveExtendModal(null)}
        >
          ×
        </button>
        <p className="eyebrow" style={{ color: "#2b8a3e", marginBottom: "4px" }}>
          GIA HẠN THUÊ Ô {activeExtendModal.so_hieu_o}
        </p>
        <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Gia hạn mùa vụ canh tác</h2>
        <p style={{ color: "#526658", fontSize: "14px", margin: "0 0 16px" }}>
          Ô đất: <b>{activeExtendModal.ten_o_dat}</b> · Hợp đồng: <b>{activeExtendModal.so_hop_dong}</b>
        </p>

        <div className="booking-summary" style={{ marginBottom: "16px" }}>
          <div>
            <span>Hạn kết thúc hiện tại</span>
            <strong>{formatDate(activeExtendModal.ngay_ket_thuc)}</strong>
          </div>
          <div>
            <span>Đơn giá thuê</span>
            <strong>{formatMoney(activeExtendModal.gia_thue_thang || 0)}/tháng</strong>
          </div>
        </div>

        <form onSubmit={handleExtendSubmit}>
          <label style={{ display: "block", marginBottom: "14px", fontWeight: "600", fontSize: "14px" }}>
            Chọn số tháng muốn gia hạn thêm:
            <select
              value={extendMonths}
              onChange={(e) => setExtendMonths(Number(e.target.value))}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #c3d4c9",
                fontSize: "14px",
              }}
            >
              {[1, 2, 3, 6, 9, 12].map((m) => {
                const addedCost = (Number(activeExtendModal.gia_thue_thang) || 0) * m;
                return (
                  <option key={m} value={m}>
                    + {m} tháng · Chi phí: {formatMoney(addedCost)}
                  </option>
                );
              })}
            </select>
          </label>

          <div
            style={{
              backgroundColor: "#f0f7f3",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #d2e7db",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#526658", fontSize: "14px" }}>Chi phí gia hạn (+{extendMonths} tháng):</span>
              <strong style={{ color: "#2b8a3e", fontSize: "16px" }}>
                {formatMoney((Number(activeExtendModal.gia_thue_thang) || 0) * extendMonths)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#526658" }}>Hạn kết thúc mới dự kiến:</span>
              <strong>
                {(() => {
                  const d = new Date(activeExtendModal.ngay_ket_thuc);
                  d.setMonth(d.getMonth() + extendMonths);
                  return formatDate(d);
                })()}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="outline-button"
              style={{ flex: 1 }}
              onClick={() => setActiveExtendModal(null)}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="primary-button"
              style={{ flex: 2 }}
              disabled={extendSubmitting}
            >
              {extendSubmitting ? "Đang xử lý..." : "Xác nhận gia hạn & Thanh toán VietQR →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const newCropModal = activeNewCropModal && (
    <div className="booking-backdrop" onClick={() => setActiveNewCropModal(null)}>
      <div
        className="booking-modal"
        style={{ width: "min(100%, 540px)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setActiveNewCropModal(null)}
        >
          ×
        </button>
        <p className="eyebrow" style={{ color: "#198754", marginBottom: "4px" }}>
          KHỞI TẠO VỤ MÙA MỚI · Ô {activeNewCropModal.so_hieu_o}
        </p>
        <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Chọn cây trồng chu kỳ tiếp theo</h2>
        <p style={{ color: "#526658", fontSize: "14px", margin: "0 0 16px" }}>
          Ô đất: <b>{activeNewCropModal.ten_o_dat}</b> · Hạn thuê còn: <b>{daysRemaining(activeNewCropModal.ngay_ket_thuc)} ngày</b> (đến {formatDate(activeNewCropModal.ngay_ket_thuc)})
        </p>

        <form onSubmit={handleChooseNewCropSubmit}>
          <label style={{ display: "block", marginBottom: "14px", fontWeight: "600", fontSize: "14px" }}>
            Chọn giống cây trồng vụ này:
            <select
              value={newCropSelectedId}
              onChange={(e) => setNewCropSelectedId(e.target.value)}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #c3d4c9",
                fontSize: "14px",
              }}
            >
              {crops.map((c) => (
                <option key={c.ma_cay_trong} value={c.ma_cay_trong}>
                  {c.ten_cay_trong} (Sinh trưởng: {c.thoi_gian_sinh_truong_ngay || 30} ngày · Giá giống: {formatMoney(c.gia_cay || 0)})
                </option>
              ))}
            </select>
          </label>

          {(() => {
            const selectedCropObj = crops.find((c) => String(c.ma_cay_trong) === String(newCropSelectedId)) || crops[0];
            const growthDays = selectedCropObj?.thoi_gian_sinh_truong_ngay || 30;
            const remainingDays = daysRemaining(activeNewCropModal.ngay_ket_thuc);
            const isExceeded = growthDays > remainingDays;

            return (
              <>
                {selectedCropObj && (
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      backgroundColor: "#f7faf8",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "14px",
                      border: "1px solid #e1ebe4",
                    }}
                  >
                    {selectedCropObj.hinh_anh_cay && (
                      <img
                        src={resolveImageUrl(selectedCropObj.hinh_anh_cay)}
                        alt={selectedCropObj.ten_cay_trong}
                        style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px" }}
                      />
                    )}
                    <div style={{ flex: 1, fontSize: "13px" }}>
                      <b>{selectedCropObj.ten_cay_trong}</b>
                      <div style={{ color: "#526658" }}>
                        Thời gian sinh trưởng: <b>{growthDays} ngày</b> · Độ khó: {selectedCropObj.do_kho || "Dễ"}
                      </div>
                    </div>
                  </div>
                )}

                {isExceeded && (
                  <div
                    style={{
                      backgroundColor: "#fff3cd",
                      border: "1px solid #ffe69c",
                      color: "#664d03",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    ⚠️ <b>Thời gian sinh trưởng vượt quá hạn thuê còn lại:</b> Cây "{selectedCropObj?.ten_cay_trong}" cần {growthDays} ngày nhưng ô đất chỉ còn {remainingDays} ngày thuê. Bạn cần gia hạn thêm hợp đồng hoặc chọn cây ngắn ngày hơn!
                    <button
                      type="button"
                      style={{
                        display: "block",
                        marginTop: "8px",
                        background: "#856404",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}
                      onClick={() => {
                        const targetRental = activeNewCropModal;
                        setActiveNewCropModal(null);
                        setActiveExtendModal(targetRental);
                        setExtendMonths(Math.ceil((growthDays - remainingDays) / 30));
                      }}
                    >
                      Gia hạn thêm hợp đồng ngay →
                    </button>
                  </div>
                )}

                <label style={{ display: "block", marginBottom: "16px", fontWeight: "600", fontSize: "14px" }}>
                  Ghi chú / Yêu cầu chăm sóc đặc biệt (tùy chọn):
                  <textarea
                    value={newCropNote}
                    onChange={(e) => setNewCropNote(e.target.value)}
                    placeholder="VD: Vụ này gieo hạt mật độ thưa, bón phân hữu cơ sinh học..."
                    rows={3}
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #c3d4c9",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="outline-button"
                    style={{ flex: 1 }}
                    onClick={() => setActiveNewCropModal(null)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ flex: 2, backgroundColor: "#198754", borderColor: "#198754" }}
                    disabled={newCropSubmitting || isExceeded}
                  >
                    {newCropSubmitting ? "Đang xử lý..." : "🌱 Xác nhận trồng vụ này"}
                  </button>
                </div>
              </>
            );
          })()}
        </form>
      </div>
    </div>
  );

  const workspace = (content) => (
    <main className="dashboard-page user-dashboard">
      <header className="dashboard-header">
        <a className="brand" href="/">
          <span className="brand-mark">PF</span>
          <span>
            plot<span>farm</span>
          </span>
        </a>
        <nav className="workspace-nav" aria-label="Điều hướng khách hàng">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <AccountMenu
          user={user}
          roleLabel="Khách hàng PlotFarm"
          onProfile={() => selectTab("profile")}
          onLogout={onLogout}
        />
      </header>
      <section className="dashboard-shell">
        <p className="eyebrow">KHU VƯỜN CỦA BẠN</p>
        <h1>
          Chào mừng, <em>{user.name.split(" ").pop()}.</em>
        </h1>
        <p className="dashboard-lead">
          Theo dõi khu vườn và mọi cập nhật từ nông dân trong một nơi.
        </p>
        <nav className="user-tabs" aria-label="Điều hướng tài khoản">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {notice && (
          <p className="dashboard-notice" role="status">
            {notice}
          </p>
        )}
        {content}
      </section>
      {paymentModal}
      {rentalDetailModal}
      {extendModal}
      {newCropModal}
    </main>
  );

  if (activeTab === "gardens")
    return workspace(
      <>
        <div className="user-summary">
          <div>
            <span>Hợp đồng của tôi</span>
            <strong>{rentals.length}</strong>
          </div>
          <div>
            <span>Đang canh tác</span>
            <strong>
              {
                rentals.filter(
                  (item) => item.trang_thai_hop_dong === "hieu_luc",
                ).length
              }
            </strong>
          </div>
          <div>
            <span>Email tài khoản</span>
            <strong className="user-email">{user.email}</strong>
          </div>
        </div>
        <section className="dashboard-panel rental-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MY PLOTS</p>
              <h2>Những ô đất đang thuê</h2>
            </div>
            <button
              className="dashboard-link-button"
              onClick={() => setActiveTab("find")}
            >
              Khám phá ô đất <span>→</span>
            </button>
          </div>
          {loading && <p className="loading-state">Đang tải khu vườn...</p>}
          {!loading && rentals.length === 0 && (
            <p className="empty-state">
              Bạn chưa có hợp đồng nào. Hãy chọn một ô đất cho mùa vụ đầu tiên.
            </p>
          )}
          <div className="my-plot-grid">
            {rentals.map((rental) => (
              <article className="my-plot-card" key={rental.ma_hop_dong}>
                <div
                  className="my-plot-image"
                  style={
                    {
                      backgroundImage: `url("${resolveImageUrl(rental.hinh_anh_o_dat || PLOT_PLACEHOLDER_IMAGE)}")`,
                    }
                  }
                >
                  <span>{rental.so_hieu_o}</span>
                </div>
                <div className="my-plot-body">
                  <p className="plot-status">
                    {rental.trang_thai_thanh_toan === "cho_thanh_toan" ? (
                      <span style={{ color: "#c98b3c", fontWeight: "700" }}>Chờ thanh toán</span>
                    ) : rental.trang_thai_hop_dong === "da_ket_thuc" ? (
                      <span style={{ color: "#6c757d", fontWeight: "700" }}>Hợp đồng đã kết thúc</span>
                    ) : rental.trang_thai_canh_tac === "cho_chon_cay_moi" || (rental.trang_thai_canh_tac === "da_thu_hoach" && daysRemaining(rental.ngay_ket_thuc) > 0) ? (
                      <span style={{ color: "#0d6efd", fontWeight: "700" }}>🌾 Đã thu hoạch · Chờ vụ mới</span>
                    ) : rental.trang_thai_canh_tac === "da_thu_hoach" ? (
                      <span style={{ color: "#198754", fontWeight: "700" }}>Đã hoàn tất thu hoạch</span>
                    ) : (
                      rentalStatusLabel(rental)
                    )}
                  </p>
                  <h3>{rental.ten_o_dat}</h3>
                  <p>
                    {rental.ten_cay_trong || "Chưa chọn cây trồng"} · Farmer:{" "}
                    {rental.ten_nong_dan || "Đang chờ phân công"}
                  </p>
                  <div className="plot-date-row">
                    <span>Kết thúc thuê</span>
                    <strong>{formatDate(rental.ngay_ket_thuc)}</strong>
                  </div>
                  <div className="remaining-days">
                    <b>{daysRemaining(rental.ngay_ket_thuc)}</b>
                    <span>ngày còn lại</span>
                  </div>
                  <button
                    className="outline-button"
                    style={{ marginTop: "10px" }}
                    onClick={() => setRentalDetail(rental)}
                  >
                    Xem chi tiết ô đất →
                  </button>
                  {rental.trang_thai_thanh_toan === "cho_thanh_toan" ? (
                    <button
                      className="primary-button"
                      style={{ marginTop: "10px", width: "100%", backgroundColor: "#c98b3c", borderColor: "#c98b3c" }}
                      onClick={() => openRentalPayment(rental)}
                    >
                      Thanh toán VietQR →
                    </button>
                  ) : (
                    <>
                      {(rental.trang_thai_canh_tac === "cho_chon_cay_moi" || (rental.trang_thai_canh_tac === "da_thu_hoach" && daysRemaining(rental.ngay_ket_thuc) > 0)) && (
                        <button
                          className="primary-button"
                          style={{
                            marginTop: "8px",
                            width: "100%",
                            backgroundColor: "#198754",
                            borderColor: "#198754",
                            fontWeight: "700",
                          }}
                          onClick={() => {
                            setActiveNewCropModal(rental);
                            setNewCropSelectedId(crops[0]?.ma_cay_trong || "");
                            setNewCropNote("");
                          }}
                        >
                          🌱 Chọn cây trồng vụ mới →
                        </button>
                      )}
                      <button
                        className="outline-button"
                        style={{ marginTop: "8px" }}
                        onClick={() => {
                          setSelectedJournalRental(String(rental.ma_hop_dong));
                          setActiveTab("journal");
                        }}
                      >
                        Xem nhật ký canh tác →
                      </button>
                      {rental.trang_thai_hop_dong === "hieu_luc" && (
                        <button
                          className="outline-button"
                          style={{
                            marginTop: "8px",
                            width: "100%",
                            borderColor: "#2b8a3e",
                            color: "#2b8a3e",
                            fontWeight: "600",
                          }}
                          onClick={() => {
                            setActiveExtendModal(rental);
                            setExtendMonths(1);
                          }}
                        >
                          Gia hạn thuê đất →
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </>,
    );

  if (activeTab === "journal") {
    const selectedJournals = journals.filter(
      (item) => String(item.ma_hop_dong) === String(selectedJournalRental),
    );
    const selectedRental = rentals.find(
      (rental) => String(rental.ma_hop_dong) === String(selectedJournalRental),
    );
    return workspace(
      <section className="dashboard-panel timeline-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">DIARY TIMELINE</p>
            <h2>Nhật ký canh tác</h2>
          </div>
          <div className="panel-heading-actions">
            <select
              value={selectedJournalRental}
              onChange={(event) => setSelectedJournalRental(event.target.value)}
              aria-label="Chọn ô đất xem nhật ký"
            >
              {rentals
                .filter(
                  (rental) =>
                    rental.trang_thai_phan_cong === "da_chap_nhan",
                )
                .map((rental) => (
                <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>
                  {rental.so_hieu_o} · {rental.ten_o_dat}
                </option>
                ))}
            </select>
            <span className="result-count">
              {selectedJournals.length} cập nhật
            </span>
          </div>
        </div>
        {selectedJournals.length === 0 ? (
          <p className="empty-state">
            Chưa có nhật ký từ nông dân cho ô{" "}
            {selectedRental?.so_hieu_o || "đất này"}.
          </p>
        ) : (
          <div className="diary-timeline">
            {selectedJournals.map((item) => {
              const images = journalImages(item);
              return (
                <article className="diary-card" key={item.ma_nhat_ky}>
                  <div className="timeline-dot" />
                  <div className="diary-date">
                    {formatDate(item.ngay_ghi_nhat_ky || item.ngay_tao)}
                  </div>
                  <div className="diary-content">
                    <div>
                      <p className="plot-status">
                        {item.so_hieu_o ||
                          selectedRental?.so_hieu_o ||
                          "Khu vườn của bạn"}{" "}
                        · {item.giai_doan_sinh_truong || "Canh tác"}
                      </p>
                      <h3>{item.tieu_de || item.cong_viec_da_lam}</h3>
                      <p className="diary-meta">
                        {item.ten_nong_dan || "Nông dân phụ trách"} ·{" "}
                        {item.thoi_tiet || "Đang cập nhật thời tiết"}
                      </p>
                      <p>
                        {item.noi_dung ||
                          item.ghi_chu_chi_tiet ||
                          "Chưa có ghi chú chi tiết."}
                      </p>
                      {item.loai_phan_bon_da_dung && (
                        <small>Phân bón: {item.loai_phan_bon_da_dung}</small>
                      )}
                    </div>
                    {images[0] && (
                      <img
                        src={resolveImageUrl(images[0])}
                        alt={`Nhật ký ${item.tieu_de || ""}`}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>,
    );
  }

  if (activeTab === "support")
    return workspace(
      <div className="support-two-column">
        <section className="dashboard-panel support-history-panel">
          <div className="support-intro">
            <p className="eyebrow">YÊU CẦU CHĂM SÓC</p>
            <h2>Gửi yêu cầu và theo dõi xử lý</h2>
            <p>
              Yêu cầu được chuyển trực tiếp đến nông dân phụ trách ô đất của bạn.
            </p>
          </div>
          {!supportSent && (
            <form className="care-form" onSubmit={submitSupport}>
              <select
                name="rentalId"
                value={selectedCareRental}
                onChange={(event) => setSelectedCareRental(event.target.value)}
                required
              >
                <option value="">Chọn ô đất</option>
                {rentals
                  .filter((rental) => rental.trang_thai_hop_dong === "hieu_luc" && rental.trang_thai_canh_tac !== "da_thu_hoach")
                  .map((rental) => (
                  <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>
                    {rental.so_hieu_o} · {rental.ten_o_dat}
                  </option>
                ))}
              </select>
              <select name="serviceType" required>
                <option value="">Chọn loại hỗ trợ</option>
                {serviceTypes.map((service) => (
                  <option
                    key={service.ma_loai_dich_vu}
                    value={service.ma_loai_dich_vu}
                  >
                    {service.ten_dich_vu}
                  </option>
                ))}
              </select>
              <input
                name="schedule"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                aria-label="Ngày mong muốn thực hiện"
              />
              <textarea
                name="note"
                required
                placeholder="Mô tả tình trạng hoặc ghi chú cho nông dân"
              />
              <button className="primary-button" type="submit">
                Gửi yêu cầu <span>→</span>
              </button>
            </form>
          )}
          <div className="service-history">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SERVICE REQUEST HISTORY</p>
                <h2>Lịch sử yêu cầu dịch vụ</h2>
              </div>
            </div>
            {serviceRequests.length === 0 ? (
              <p className="empty-state">Bạn chưa gửi yêu cầu chăm sóc nào.</p>
            ) : (
              serviceRequests.map((request) => (
                <article
                  className={`service-history-card status-${request.trang_thai_xu_ly}`}
                  key={request.ma_yeu_cau}
                >
                  <div className="request-heading">
                    <div>
                      <strong>
                        {request.so_hieu_o} · {request.ten_dich_vu}
                      </strong>
                      <p>
                        {formatDate(request.ngay_gui_yeu_cau)} · Nông dân:{" "}
                        {request.ten_nong_dan_xu_ly || "Chưa có"}
                      </p>
                    </div>
                    <span>
                      {requestStatus[request.trang_thai_xu_ly] || request.trang_thai_xu_ly}
                    </span>
                  </div>
                  {request.ghi_chu_cua_khach && <p>{request.ghi_chu_cua_khach}</p>}
                  {request.phan_hoi_cua_nha_vuon && (
                    <div className="farmer-reply">
                      <b>Phản hồi từ nông dân</b>
                      <p>{request.phan_hoi_cua_nha_vuon}</p>
                    </div>
                  )}
                  {request.hinh_anh_nghiem_thu && (
                    <img
                      className="service-reply-image"
                      src={resolveImageUrl(request.hinh_anh_nghiem_thu)}
                      alt="Ảnh phản hồi yêu cầu"
                    />
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-panel complaint-panel">
          <div className="support-intro">
            <p className="eyebrow">KHIẾU NẠI / TRÁNH CHẤP</p>
            <h2>Gửi vấn đề cần Admin can thiệp</h2>
            <p>
              Dùng khi có sự cố nghiêm trọng như camera mất kết nối, cây chết, hoặc tranh chấp hợp đồng.
            </p>
          </div>
          <form className="care-form" onSubmit={handleComplaintSubmit}>
            <select
              value={complaintForm.ma_hop_dong}
              onChange={(event) => {
                const selected = event.target.value;
                const rental = rentals.find((item) => String(item.ma_hop_dong) === String(selected));
                setComplaintForm((current) => ({
                  ...current,
                  ma_hop_dong: selected,
                  ma_o_dat: rental ? String(rental.ma_o_dat ?? '') : '',
                }));
              }}
              required
            >
              <option value="">Chọn hợp đồng liên quan</option>
              {rentals.map((rental) => (
                <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>
                  {rental.so_hieu_o} · {rental.ten_o_dat}
                </option>
              ))}
            </select>
            <select
              value={complaintForm.category}
              onChange={(event) => {
                const selected = event.target.value;
                const matched = COMPLAINT_CATEGORIES
                  .flatMap((group) => group.options)
                  .find((option) => option.value === selected);
                setComplaintForm((current) => ({
                  ...current,
                  category: selected,
                  tieu_de: matched ? matched.label : "",
                }));
              }}
              required
            >
              <option value="">Chọn loại vấn đề cần khiếu nại</option>
              {COMPLAINT_CATEGORIES.map((group) => (
                <optgroup key={group.groupLabel} label={group.groupLabel}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER_COMPLAINT_OPTION.value}>{OTHER_COMPLAINT_OPTION.label}</option>
            </select>
            {complaintForm.category === OTHER_COMPLAINT_OPTION.value && (
              <input
                type="text"
                value={complaintForm.tieu_de}
                onChange={(event) => setComplaintForm((current) => ({ ...current, tieu_de: event.target.value }))}
                placeholder="Nhập tiêu đề khiếu nại của bạn"
                required
              />
            )}
            <textarea
              value={complaintForm.mo_ta_chi_tiet}
              onChange={(event) => setComplaintForm((current) => ({ ...current, mo_ta_chi_tiet: event.target.value }))}
              placeholder="Mô tả chi tiết vấn đề cần Admin xử lý"
              rows="5"
              required
            />
            <button className="primary-button" type="submit">
              Gửi khiếu nại <span>→</span>
            </button>
          </form>

          <div className="service-history">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">COMPLAINT HISTORY</p>
                <h2>Lịch sử khiếu nại</h2>
              </div>
            </div>
            {complaints.length === 0 ? (
              <p className="empty-state">Bạn chưa gửi khiếu nại nào.</p>
            ) : (
              complaints.map((item) => (
                <article key={item.ma_khieu_nai} className="service-history-card status-pending">
                  <div className="request-heading">
                    <div>
                      <strong>{item.tieu_de}</strong>
                      <p>{formatDate(item.ngay_gui)} · {item.so_hieu_o || 'Ô đất liên quan'}</p>
                    </div>
                    <span>
                      {item.trang_thai_khieu_nai === 'dang_tiep_nhan'
                        ? 'Đang tiếp nhận'
                        : item.trang_thai_khieu_nai === 'da_giai_quyet'
                          ? 'Đã giải quyết'
                          : 'Từ chối'}
                    </span>
                  </div>
                  <p>{item.mo_ta_chi_tiet}</p>
                  {item.phan_hoi_admin && (
                    <div className="farmer-reply">
                      <b>Phản hồi Admin</b>
                      <p>{item.phan_hoi_admin}</p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>,
    );

  return (
    <main className="dashboard-page user-dashboard">
      <header className="dashboard-header">
        <a className="brand" href="/">
          <span className="brand-mark">PF</span>
          <span>
            plot<span>farm</span>
          </span>
        </a>
        <nav className="workspace-nav" aria-label="Điều hướng khách hàng">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <AccountMenu
          user={user}
          roleLabel="Khách hàng PlotFarm"
          onProfile={() => setActiveTab("profile")}
          onLogout={onLogout}
        />
      </header>
      <section className="dashboard-shell">
        <p className="eyebrow">KHU VƯỜN CỦA BẠN</p>
        <h1>
          Chào mừng, <em>{user.name.split(" ").pop()}.</em>
        </h1>
        <p className="dashboard-lead">
          Quản lý mùa vụ, chăm sóc và nông sản của bạn trong một nơi.
        </p>
        <nav className="user-tabs" aria-label="Điều hướng tài khoản">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {notice && (
          <p className="dashboard-notice" role="status">
            {notice}
          </p>
        )}
        {activeTab === "gardens" && (
          <>
            <div className="user-summary">
              <div>
                <span>Hợp đồng của tôi</span>
                <strong>{rentals.length}</strong>
              </div>
              <div>
                <span>Đang canh tác</span>
                <strong>{rentals.length ? "01" : "00"}</strong>
              </div>
              <div>
                <span>Email tài khoản</span>
                <strong className="user-email">{user.email}</strong>
              </div>
            </div>
            <section className="dashboard-panel rental-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MY GARDENS</p>
                  <h2>Những ô đất đang thuê</h2>
                </div>
                <button
                  className="dashboard-link-button"
                  onClick={() => setActiveTab("find")}
                >
                  Khám phá ô đất <span>→</span>
                </button>
              </div>
              {loading && (
                <p className="loading-state" role="status">
                  Đang tải khu vườn...
                </p>
              )}
              {error && (
                <p className="dashboard-error" role="alert">
                  {error}
                </p>
              )}
              {!loading && !error && rentals.length === 0 && (
                <p className="empty-state">
                  Bạn chưa có hợp đồng nào. Hãy chọn một ô đất cho mùa vụ đầu
                  tiên.
                </p>
              )}
              {rentals.length > 0 && (
                <>
                  {rentals.some(
                    (rental) =>
                      rental.trang_thai_canh_tac === "san_sang_thu_hoach",
                  ) && (
                    <div
                      style={{
                        background: "#e8f5e9",
                        border: "1px solid #c8e6c9",
                        borderRadius: "8px",
                        padding: "14px 18px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#1b5e20", fontSize: "14px" }}>
                          🌾 Nông sản đã sẵn sàng thu hoạch!
                        </strong>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#2e7d32",
                            fontSize: "12px",
                          }}
                        >
                          Nông dân đã hoàn tất vụ mùa. Hãy đăng ký hình thức nhận tại nông trại hoặc giao tận nơi ngay hôm nay.
                        </p>
                      </div>
                      <button
                        className="primary-button"
                        style={{
                          padding: "8px 14px",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => setActiveTab("harvest")}
                      >
                        Đăng ký nhận nông sản →
                      </button>
                    </div>
                  )}
                  <div className="rental-list">
                    {rentals.map((rental) => (
                      <article className="rental-item" key={rental.ma_hop_dong}>
                        <div>
                          <strong>{rental.so_hieu_o}</strong>
                          <span>{rental.ten_o_dat}</span>
                        </div>
                        <div>
                          <small>Thời hạn</small>
                          <span>
                            {formatDate(rental.ngay_bat_dau)} -{" "}
                            {formatDate(rental.ngay_ket_thuc)}
                          </span>
                        </div>
                        <div>
                          <small>Trạng thái</small>
                          <b>
                            {rental.trang_thai_canh_tac === "san_sang_thu_hoach" ? (
                              <span style={{ color: "#2e7d32" }}>
                                🌾 Sẵn sàng thu hoạch
                              </span>
                            ) : rental.trang_thai_canh_tac === "da_thu_hoach" || rental.trang_thai_hop_dong === "da_ket_thuc" ? (
                              <span style={{ color: "#198754" }}>Đã hoàn tất thu hoạch</span>
                            ) : (
                              rentalStatusLabel(rental)
                            )}
                          </b>
                        </div>
                        <div>
                          <small>Thao tác</small>
                          {rental.trang_thai_canh_tac === "san_sang_thu_hoach" ? (
                            <button
                              style={{
                                background: "#2d6a4f",
                                color: "#fff",
                                fontWeight: "bold",
                              }}
                              onClick={() => {
                                setSelectedHarvestRental(
                                  String(rental.ma_hop_dong),
                                );
                                setActiveTab("harvest");
                              }}
                            >
                              Nhận nông sản →
                            </button>
                          ) : rental.trang_thai_canh_tac === "da_thu_hoach" || rental.trang_thai_hop_dong === "da_ket_thuc" ? (
                            <button onClick={() => setRentalDetail(rental)}>
                              Xem chi tiết →
                            </button>
                          ) : (
                            <button onClick={() => setActiveTab("live")}>
                              Xem vườn →
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
        {activeTab === "find" && (
          <section className="dashboard-panel marketplace-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">TÌM KIẾM & LỌC</p>
                <h2>Chọn ô đất cho mùa vụ mới</h2>
              </div>
              <span className="result-count">
                {filteredPlots.length} ô còn trống
              </span>
            </div>
            {loading && (
              <p className="loading-state" role="status">
                Đang tải danh sách ô đất...
              </p>
            )}
            <div className="plot-filters">
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters({ ...filters, search: event.target.value })
                }
                placeholder="Tìm theo mã, vị trí..."
              />
              <select
                value={filters.soil}
                onChange={(event) =>
                  setFilters({ ...filters, soil: event.target.value })
                }
              >
                <option>Tất cả loại đất</option>
                <option>Đất thịt hữu cơ</option>
                <option>Đất phù sa</option>
              </select>
              <select
                value={filters.maxPrice}
                onChange={(event) =>
                  setFilters({ ...filters, maxPrice: event.target.value })
                }
              >
                <option>Tất cả mức giá</option>
                <option value="450000">Dưới 450.000đ/tháng</option>
                <option value="600000">Dưới 600.000đ/tháng</option>
              </select>
            </div>
            <div className="user-plot-grid">
              {filteredPlots.map((plot) => (
                <article className="user-plot-card" key={plot.id}>
                  <div
                    className="plot-card-art"
                    style={{
                      backgroundImage: `url("${resolveImageUrl(
                        plot.image || plot.image_url || plot.hinh_anh_o_dat || PLOT_PLACEHOLDER_IMAGE,
                      )}")`,
                    }}
                  >
                    <span>TRỐNG</span>
                    <strong>{plot.code}</strong>
                  </div>
                  <div className="plot-card-content">
                    <h3>{plot.location}</h3>
                    <p>
                      {plot.soil} · {plot.area}m²
                    </p>
                    <small>
                      {plot.description ||
                        "Ô đất đã được chuẩn bị sẵn cho mùa vụ mới."}
                    </small>
                    <div>
                      <b>{formatMoney(plot.price)}</b>
                      <span>/ tháng</span>
                      <button onClick={() => openBooking(plot)}>
                        Thuê ô này →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!loading && filteredPlots.length === 0 && (
              <p className="empty-state">
                Không có ô đất phù hợp. Hãy thử nới rộng bộ lọc.
              </p>
            )}
          </section>
        )}
        {activeTab === "journal" && (
          <section className="dashboard-panel content-panel">
            <p className="eyebrow">NHẬT KÝ CANH TÁC</p>
            <h2>Tiến độ mùa vụ của bạn</h2>
            <div className="growth-progress">
              <span style={{ width: "64%" }} />
            </div>
            <div className="growth-stages">
              <div className="done">
                <b>01</b>
                <span>
                  Gieo hạt<small>12/08/2026</small>
                </span>
              </div>
              <div className="done">
                <b>02</b>
                <span>
                  Cây con<small>20/08/2026</small>
                </span>
              </div>
              <div className="current">
                <b>03</b>
                <span>
                  Sinh trưởng<small>Đang cập nhật</small>
                </span>
              </div>
              <div>
                <b>04</b>
                <span>
                  Thu hoạch<small>Dự kiến 25/09</small>
                </span>
              </div>
            </div>
            <article className="journal-entry">
              <div className="journal-entry-image" />
              <div>
                <small>Hôm qua · Minh Phúc, nông dân phụ trách</small>
                <h3>Cây phát triển khỏe, lá xanh đều</h3>
                <p>
                  Đã tưới nước buổi sáng và bổ sung phân hữu cơ vi sinh. Độ ẩm
                  đất hiện tại 68%.
                </p>
                <button
                  onClick={() => showNotice("Đã mở toàn bộ nhật ký mùa vụ.")}
                >
                  Xem chi tiết nhật ký →
                </button>
              </div>
            </article>
          </section>
        )}
        {activeTab === "live" && (
          <section className="dashboard-panel content-panel live-panel">
            <div>
              <p className="eyebrow">LIVE STREAM · A-01</p>
              <h2>Quan sát khu vườn theo thời gian thực</h2>
              <p>Camera đang hoạt động, cập nhật hình ảnh mỗi 30 giây.</p>
              <button
                className="primary-button"
                onClick={() =>
                  showNotice(
                    "Camera đã sẵn sàng. Chức năng toàn màn hình đang được mở.",
                  )
                }
              >
                Mở toàn màn hình <span>↗</span>
              </button>
            </div>
            <div className="camera-frame">
              <span className="camera-live">
                <i /> LIVE
              </span>
              <span>CAM-A01 · 10:42:18</span>
            </div>
          </section>
        )}
        {activeTab === "support" && (
          <section className="dashboard-panel form-panel">
            <div>
              <p className="eyebrow">YÊU CẦU CHĂM SÓC</p>
              <h2>Để nông dân chăm vườn cùng bạn</h2>
              <p>
                Gửi yêu cầu bón phân, tỉa cành, tưới nước hoặc xử lý sâu bệnh.
              </p>
            </div>
            {supportSent ? (
              <p className="form-success">
                Yêu cầu đã được gửi tới nông dân phụ trách.
              </p>
            ) : (
              <form onSubmit={submitSupport}>
                <select
                  name="rentalId"
                  value={selectedCareRental}
                  onChange={(event) =>
                    setSelectedCareRental(event.target.value)
                  }
                  required
                >
                  <option value="">Chọn ô đất</option>
                  {rentals.map((rental) => (
                    <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>
                      {rental.so_hieu_o} ·{" "}
                      {rental.ten_nong_dan
                        ? `Farmer: ${rental.ten_nong_dan}`
                        : "Chưa có farmer"}
                    </option>
                  ))}
                </select>
                <p className="assigned-farmer">
                  Farmer phụ trách:{" "}
                  <strong>
                    {rentals.find(
                      (rental) =>
                        String(rental.ma_hop_dong) ===
                        String(selectedCareRental),
                    )?.ten_nong_dan || "Sẽ hiển thị sau khi admin phân công"}
                  </strong>
                </p>
                <select name="serviceType" required>
                  <option value="">Chọn loại hỗ trợ</option>
                  {serviceTypes.map((service) => (
                    <option
                      key={service.ma_loai_dich_vu}
                      value={service.ma_loai_dich_vu}
                    >
                      {service.ten_dich_vu}
                    </option>
                  ))}
                </select>
                <input
                  name="schedule"
                  required
                  placeholder="Thời gian mong muốn"
                />
                <textarea
                  name="note"
                  required
                  placeholder="Mô tả tình trạng hoặc ghi chú cho nông dân"
                />
                <button className="primary-button">
                  Gửi yêu cầu <span>→</span>
                </button>
              </form>
            )}
            <div className="request-list">
              {serviceRequests.map((request) => (
                <article className="care-request" key={request.ma_yeu_cau}>
                  <div>
                    <strong>
                      {request.so_hieu_o} · {request.ten_dich_vu}
                    </strong>
                    <p>
                      Farmer: {request.ten_nong_dan_xu_ly || "Chưa có"} ·{" "}
                      {request.trang_thai_xu_ly}
                    </p>
                    {request.phan_hoi_cua_nha_vuon && (
                      <small>Phản hồi: {request.phan_hoi_cua_nha_vuon}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {activeTab === "harvest" && (
          <section className="dashboard-panel form-panel">
            <div>
              <p className="eyebrow">QUẢN LÝ THU HOẠCH</p>
              <h2>Nhận thành quả từ khu vườn</h2>
              <p>Đăng ký địa chỉ và cách vận chuyển trước ngày thu hoạch.</p>
            </div>
            {selectedHarvestRental &&
              rentals.find(
                (r) => String(r.ma_hop_dong) === String(selectedHarvestRental),
              )?.trang_thai_canh_tac === "san_sang_thu_hoach" && (
                <div
                  style={{
                    background: "#e8f5e9",
                    border: "1px solid #a5d6a7",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    color: "#1b5e20",
                    fontSize: "13px",
                  }}
                >
                  🌾 Ô đất này đã được nông dân xác nhận sẵn sàng thu hoạch! Vui lòng chọn hình thức nhận nông sản bên dưới để nông trại tiến hành chuẩn bị.
                </div>
              )}
            {harvestDeliveries.filter((item) => item.trang_thai === "cho_khach_chon").length === 0 ? (
              <p className="empty-state">Chưa có ô đất nào sẵn sàng thu hoạch. Khi Farmer cập nhật, form chọn hình thức nhận hàng sẽ tự mở khóa tại đây.</p>
            ) : (
              <form onSubmit={async (event) => {
                event.preventDefault();
                const selected = harvestDeliveries.find((item) => String(item.ma_hop_dong) === selectedHarvestRental);
                if (!selected) return notify("Vui lòng chọn mùa vụ đang chờ nhận hàng.", "error");
                setHarvestSubmitting(true);
                try {
                  const fullAddress = shippingMethod === "Giao tận nơi"
                    ? `${harvestForm.address ? harvestForm.address + ", " : ""}${harvestDistrict ? harvestDistrict + ", " : ""}${harvestProvince}`
                    : "Nhận tại nông trại PlotFarm";
                  await chooseHarvestDelivery(selected.ma_hop_dong, {
                    hinh_thuc_nhan: shippingMethod === "Giao tận nơi" ? "giao_tan_noi" : "nhan_tai_nong_trai",
                    ten_nguoi_nhan: harvestForm.name,
                    so_dien_thoai_nhan: harvestForm.phone,
                    dia_chi_nhan: fullAddress,
                    ghi_chu_khach: harvestForm.note,
                  }, token);
                  registerHarvestDelivery({
                    rentalId: selected.ma_hop_dong,
                    hinh_thuc_nhan_hang: shippingMethod,
                    ten_nguoi_nhan: harvestForm.name,
                    so_dien_thoai_nguoi_nhan: harvestForm.phone,
                    dia_chi_giao_hang: harvestForm.address,
                    tinh_thanh: harvestProvince,
                    quan_huyen: harvestDistrict,
                    ghi_chu: harvestForm.note,
                  }, token).catch(() => {});
                  setHarvestDeliveries((items) => items.map((item) => item.ma_hop_dong === selected.ma_hop_dong ? { ...item, trang_thai: "cho_thu_hoach_dong_goi" } : item));
                  notify("Đã gửi yêu cầu đóng gói và giao hàng tới Farmer.");
                } catch (harvestError) {
                  notify(harvestError.message, "error");
                } finally {
                  setHarvestSubmitting(false);
                }
              }}>
                <select
                  value={selectedHarvestRental}
                  onChange={(event) =>
                    setSelectedHarvestRental(event.target.value)
                  }
                  required
                >
                  <option value="">Chọn ô đất</option>
                  {harvestDeliveries.filter((item) => item.trang_thai === "cho_khach_chon").map((delivery) => (
                    <option key={delivery.ma_hop_dong} value={delivery.ma_hop_dong}>
                      {delivery.so_hieu_o} · {delivery.ten_o_dat} · {delivery.ten_cay_trong || "Nông sản theo mùa vụ"}
                    </option>
                  ))}
                </select>
                <input required placeholder="Tên người nhận" value={harvestForm.name} onChange={(event) => setHarvestForm({ ...harvestForm, name: event.target.value })} />
                <input required placeholder="Số điện thoại" value={harvestForm.phone} onChange={(event) => setHarvestForm({ ...harvestForm, phone: event.target.value })} />
                <select
                  value={shippingMethod}
                  onChange={(event) => {
                    setShippingMethod(event.target.value);
                    if (event.target.value !== "Giao tận nơi") {
                      setHarvestProvince("");
                      setHarvestDistrict("");
                    }
                  }}
                  required
                >
                  <option value="">Chọn hình thức vận chuyển</option>
                  <option value="Giao tận nơi">Giao tận nơi</option>
                  <option value="Nhận tại nông trại">Nhận tại nông trại</option>
                </select>
                {shippingMethod === "Giao tận nơi" && (
                  <>
                    <select
                      value={harvestProvince}
                      onChange={(event) => {
                        setHarvestProvince(event.target.value);
                        setHarvestDistrict("");
                      }}
                      required
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      {vietnamProvinces.map((province) => (
                        <option key={province.name} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={harvestDistrict}
                      onChange={(event) =>
                        setHarvestDistrict(event.target.value)
                      }
                      required
                      disabled={!harvestProvince}
                    >
                      <option value="">Chọn quận/huyện</option>
                      {harvestDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                    <input required placeholder="Địa chỉ nhận hàng (Số nhà, tên đường...)" value={harvestForm.address} onChange={(event) => setHarvestForm({ ...harvestForm, address: event.target.value })} />
                  </>
                )}
                <textarea placeholder="Ghi chú cho Farmer (không bắt buộc)" value={harvestForm.note} onChange={(event) => setHarvestForm({ ...harvestForm, note: event.target.value })} />
                <button className="primary-button" disabled={harvestSubmitting}>
                  {harvestSubmitting ? "Đang xử lý..." : "Đăng ký nhận hàng"} <span>→</span>
                </button>
              </form>
            )}
          </section>
        )}
        {activeTab === "profile" && (
          <ProfilePanel
            user={user}
            onSave={async (nextUser) => {
              try {
                const currentAuth = JSON.parse(
                  sessionStorage.getItem("plotfarm_auth") || "{}",
                );
                const updated = await updateCurrentUser(
                  {
                    name: nextUser.name,
                    email: nextUser.email,
                    phone: nextUser.phone,
                  },
                  token,
                );
                const mergedUser = { ...currentAuth.user, ...updated.data, ...nextUser };
                sessionStorage.setItem(
                  "plotfarm_auth",
                  JSON.stringify({ ...currentAuth, user: mergedUser }),
                );
                window.location.reload();
              } catch (saveError) {
                notify(saveError.message, "error");
              }
            }}
          />
        )}
      </section>
      {error && activeTab !== "gardens" && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}
      {selectedPlot && (
        <div className="booking-backdrop">
          <form
            className="booking-modal"
            onSubmit={
              bookingStep === "details" ? continueToPayment : submitBooking
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeBooking}
            >
              ×
            </button>
            {bookingStep === "details" ? (
              <>
                <p className="eyebrow">
                  BƯỚC 1 / 2 · THUÊ Ô {selectedPlot.code}
                </p>
                <h2>Đặt mùa vụ của bạn</h2>
                <p>
                  {selectedPlot.area}m² · {selectedPlot.soil} ·{" "}
                  {formatMoney(selectedPlot.price)}/tháng
                </p>
                <label>
                  Thời hạn thuê
                  <select
                    value={booking.duration}
                    onChange={(event) =>
                      setBooking({ ...booking, duration: event.target.value })
                    }
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (duration) => (
                        <option key={duration} value={duration}>
                          {duration} tháng · {formatMoney(selectedPlot.price * duration)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Hạt giống / loại cây
                  <select
                    value={booking.crop}
                    onChange={(event) =>
                      setBooking({ ...booking, crop: event.target.value })
                    }
                  >
                    {crops.map((crop) => (
                      <option key={crop.ma_cay_trong} value={crop.ma_cay_trong}>
                        {crop.ten_cay_trong} ({crop.thoi_gian_sinh_truong_ngay} ngày)
                      </option>
                    ))}
                  </select>
                </label>
                {(() => {
                  const selCrop = crops.find(
                    (c) => String(c.ma_cay_trong) === String(booking.crop),
                  );
                  const rentalDays = Number(booking.duration) * 30;
                  if (selCrop && selCrop.thoi_gian_sinh_truong_ngay > rentalDays) {
                    const minMonths = Math.ceil(selCrop.thoi_gian_sinh_truong_ngay / 30);
                    return (
                      <div
                        style={{
                          padding: "12px 14px",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffeeba",
                          borderRadius: "8px",
                          margin: "10px 0 16px",
                          color: "#856404",
                          fontSize: "13px",
                          lineHeight: "1.5",
                        }}
                      >
                        <strong>⚠️ Thời gian sinh trưởng vượt quá thời hạn thuê:</strong>
                        <p style={{ margin: "4px 0 8px" }}>
                          Cây <b>{selCrop.ten_cay_trong}</b> cần <b>{selCrop.thoi_gian_sinh_truong_ngay} ngày</b> để lớn, nhưng bạn chỉ chọn thuê <b>{rentalDays} ngày ({booking.duration} tháng)</b>.
                        </p>
                        <button
                          type="button"
                          className="outline-button"
                          style={{
                            fontSize: "12px",
                            padding: "6px 12px",
                            borderColor: "#856404",
                            color: "#856404",
                            fontWeight: "600",
                          }}
                          onClick={() => setBooking({ ...booking, duration: String(minMonths) })}
                        >
                          Tăng thời hạn thuê lên {minMonths} tháng →
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
                <button className="primary-button booking-submit">
                  Xem lại & thanh toán <span>→</span>
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">BƯỚC 2 / 2 · XÁC NHẬN & THANH TOÁN</p>
                <h2>Xác nhận thông tin thuê</h2>
                <div className="booking-summary">
                  <div>
                    <span>Ô đất</span>
                    <strong>
                      {selectedPlot.code} · {selectedPlot.location}
                    </strong>
                  </div>
                  <div>
                    <span>Mùa vụ</span>
                    <strong>
                      {crops.find(
                        (crop) => String(crop.ma_cay_trong) === String(booking.crop),
                      )?.ten_cay_trong || "Chưa chọn"}{" "}
                      · {booking.duration} tháng
                    </strong>
                  </div>
                  <div>
                    <span>Tạm tính</span>
                    <strong>
                      {formatMoney(
                        selectedPlot.price * Number(booking.duration),
                      )}
                    </strong>
                  </div>
                </div>
                <label>
                  Phương thức thanh toán
                  <select
                    value={booking.payment}
                    onChange={(event) =>
                      setBooking({ ...booking, payment: event.target.value })
                    }
                  >
                    <option>Chuyển khoản</option>
                    <option>Ví điện tử</option>
                    <option>Thẻ quốc tế</option>
                  </select>
                </label>
                <p className="payment-note">
                  Thanh toán được xác nhận an toàn. Sau khi gửi, hệ thống sẽ tạo
                  hợp đồng và giữ ô đất cho bạn.
                </p>
                <div className="booking-actions">
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setBookingStep("details")}
                  >
                    Quay lại
                  </button>
                  <button
                    className="primary-button booking-submit"
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? "Đang gửi..." : "Xác nhận thuê ô"}{" "}
                    <span>→</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {paymentModal}
      {rentalDetailModal}
    </main>
  );
}

export default UserPage;
