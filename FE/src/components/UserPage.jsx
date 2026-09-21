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
  PLOT_PLACEHOLDER_IMAGE,
  resolveImageUrl,
  updateCurrentUser,
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
  const [notice, setNotice] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [harvestSent, setHarvestSent] = useState(false);
  const [selectedCareRental, setSelectedCareRental] = useState("");
  const [selectedHarvestRental, setSelectedHarvestRental] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [harvestProvince, setHarvestProvince] = useState("");
  const [harvestDistrict, setHarvestDistrict] = useState("");
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
    ])
      .then(
        async ([
          nextRentals,
          nextPlots,
          nextCrops,
          nextServiceTypes,
          nextServiceRequests,
          nextComplaints,
        ]) => {
          setRentals(nextRentals);
          const assignedRentals = nextRentals.filter(
            (rental) => rental.trang_thai_phan_cong === "da_chap_nhan",
          );
          setSelectedCareRental(
            String(assignedRentals[0]?.ma_hop_dong || ""),
          );
          setSelectedJournalRental(String(nextRentals[0]?.ma_hop_dong || ""));
          setAvailablePlots(
            nextPlots.filter((plot) => plot.status === "trong"),
          );
          setCrops(nextCrops);
          setServiceTypes(nextServiceTypes);
          setServiceRequests(nextServiceRequests);
          setComplaints(nextComplaints);
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
    setBookingStep("payment");
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
                    ) : rental.trang_thai_hop_dong === "hieu_luc" ? (
                      "Đang thuê"
                    ) : (
                      rental.trang_thai_hop_dong
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
                  {rental.trang_thai_thanh_toan === "cho_thanh_toan" ? (
                    <button
                      className="primary-button"
                      style={{ marginTop: "10px", width: "100%", backgroundColor: "#c98b3c", borderColor: "#c98b3c" }}
                      onClick={() => openRentalPayment(rental)}
                    >
                      Thanh toán VietQR →
                    </button>
                  ) : (
                    <button
                      className="outline-button"
                      onClick={() => {
                        setSelectedJournalRental(String(rental.ma_hop_dong));
                        setActiveTab("journal");
                      }}
                    >
                      Xem nhật ký canh tác →
                    </button>
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
                {rentals.map((rental) => (
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
                        <b>{rental.trang_thai_hop_dong}</b>
                      </div>
                      <div>
                        <small>Thao tác</small>
                        <button onClick={() => setActiveTab("live")}>
                          Xem vườn →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
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
            {harvestSent ? (
              <p className="form-success">
                Thông tin nhận hàng đã được lưu cho mùa vụ này.
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setHarvestSent(true);
                }}
              >
                <select
                  value={selectedHarvestRental}
                  onChange={(event) =>
                    setSelectedHarvestRental(event.target.value)
                  }
                  required
                >
                  <option value="">Chọn ô đất</option>
                  {rentals.map((rental) => (
                    <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>
                      {rental.so_hieu_o} · {rental.ten_o_dat}
                    </option>
                  ))}
                </select>
                <input required placeholder="Tên người nhận" />
                <input required placeholder="Số điện thoại" />
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
                  <option>Giao tận nơi</option>
                  <option>Nhận tại nông trại</option>
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
                    <input required placeholder="Địa chỉ nhận hàng" />
                  </>
                )}
                <button className="primary-button">
                  Đăng ký nhận hàng <span>→</span>
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
                    <option value="3">
                      3 tháng · {formatMoney(selectedPlot.price * 3)}
                    </option>
                    <option value="6">
                      6 tháng · {formatMoney(selectedPlot.price * 6)}
                    </option>
                    <option value="12">
                      12 tháng · {formatMoney(selectedPlot.price * 12)}
                    </option>
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
                        {crop.ten_cay_trong}
                      </option>
                    ))}
                  </select>
                </label>
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

      {activePaymentModal && (
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
      )}
    </main>
  );
}

export default UserPage;
