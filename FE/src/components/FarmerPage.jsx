import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./FarmerPage.css";
import ProfilePanel from "./ProfilePanel.jsx";
import AccountMenu from "./AccountMenu.jsx";
import { notify } from "./ToastProvider.jsx";
import {
  getActiveRentals,
  getAssignments,
  getServiceRequests,
  respondToAssignment,
  updateServiceRequest,
  createJournal,
  getJournalsByRental,
  updateJournal,
  deleteJournal,
  updateCultivationStatus,
  readyToHarvest,
  markHarvestReady,
  getFarmerHarvestDeliveries,
  handoverHarvestDelivery,
  uploadJournalMedia,
  resolveImageUrl,
  updateCurrentUser,
} from "../api.js";

const requestLabels = {
  cho_tiep_nhan: "Chờ tiếp nhận",
  da_tiep_nhan: "Đã tiếp nhận",
  dang_thuc_hien: "Đang thực hiện",
  hoan_thanh: "Hoàn thành",
  tu_choi: "Từ chối",
};
const cultivationLabels = {
  cho_gieo_trong: "Đã thanh toán · Chờ gieo trồng",
  dang_canh_tac: "Đang canh tác",
  san_sang_thu_hoach: "Sẵn sàng thu hoạch",
};
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";

function FarmerPage({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = JSON.parse(
    sessionStorage.getItem("plotfarm_auth") || "{}",
  ).token;
  const activeTab = searchParams.get("tab") || "plots";
  const [plots, setPlots] = useState([]);
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState([]);
  const [journalPlotFilter, setJournalPlotFilter] = useState("all");
  const [journalForm, setJournalForm] = useState({
    plot: "A-03",
    task: "Tưới nước",
    note: "",
    water: "10 lít",
    fertilizer: "Chưa bón",
    photo: "",
    video: "",
  });
  const [editingJournal, setEditingJournal] = useState(null);
  const [journalMessage, setJournalMessage] = useState("");
  const [cameraUrls, setCameraUrls] = useState({
    "A-03": "https://camera.plotfarm.vn/a03",
    "C-09": "",
  });
  const [cameraMessage, setCameraMessage] = useState("");
  const [harvestDeliveries, setHarvestDeliveries] = useState([]);
  const [rejectingAssignment, setRejectingAssignment] = useState(null);
  const [rejectionReasonType, setRejectionReasonType] = useState("busy");
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const selectTab = (tab) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === "plots") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  useEffect(() => {
    Promise.all([
      getActiveRentals(token),
      getServiceRequests(token),
      getAssignments(token),
      getFarmerHarvestDeliveries(token),
    ])
      .then(async ([rentals, serviceRequests, nextAssignments, deliveries]) => {
        setAssignments(nextAssignments);
        setHarvestDeliveries(deliveries);
        const mappedPlots = rentals
          .filter(
            (rental) => rental.trang_thai_giao_nhan !== "da_ban_giao_van_chuyen",
          )
          .map((rental) => ({
            id: rental.so_hieu_o,
            crop: rental.ten_cay_trong || "Chưa chọn cây trồng",
            customer: rental.ten_khach_hang,
            area: `${rental.dien_tich_m2} m²`,
            stage: rental.trang_thai_canh_tac || "cho_gieo_trong",
            stageLabel:
              cultivationLabels[rental.trang_thai_canh_tac] ||
              cultivationLabels.cho_gieo_trong,
            progress:
              rental.trang_thai_canh_tac === "san_sang_thu_hoach"
                ? 100
                : Math.min(
                    Math.max(
                      Math.round(
                        ((rental.so_ngay_da_trong || 0) /
                          (rental.thoi_gian_sinh_truong_ngay || 90)) *
                          100,
                      ),
                      0,
                    ),
                    100,
                  ),
            next:
              rental.trang_thai_canh_tac === "cho_gieo_trong"
                ? "Xác nhận đã nhận giống để bắt đầu"
                : "Theo dõi và chăm sóc theo lịch",
            specialRequest: rental.yeu_cau_dac_biet,
            startDate: rental.ngay_bat_dau,
            payment: rental.trang_thai_thanh_toan,
            camera: false,
            rentalId: rental.ma_hop_dong,
          }));
        setPlots(mappedPlots);
        if (mappedPlots[0]?.id) {
          setJournalForm((prev) => ({ ...prev, plot: mappedPlots[0].id }));
        }
        setRequests(
          serviceRequests.map((request) => ({
            id: request.ma_yeu_cau,
            plot: request.so_hieu_o,
            customer: request.ten_khach_hang,
            text: request.ghi_chu_cua_khach || "Không có ghi chú",
            status: request.trang_thai_xu_ly,
            time: request.ngay_gui_yeu_cau,
            reply: request.phan_hoi_cua_nha_vuon || "",
            photo: request.hinh_anh_nghiem_thu || "",
          })),
        );

        // Lấy lịch sử nhật ký từ DB
        const journalGroups = await Promise.all(
          rentals.map(async (rental) => {
            try {
              const dbJournals = await getJournalsByRental(
                rental.ma_hop_dong,
                token,
              );
              return dbJournals.map((j) => ({
                id: j.ma_nhat_ky,
                plot: rental.so_hieu_o,
                date: formatDate(j.ngay_ghi_nhat_ky),
                task: j.tieu_de || j.cong_viec_da_lam,
                water: "",
                fertilizer: j.loai_phan_bon_da_dung || "Chưa bón",
                note: j.noi_dung || j.ghi_chu_chi_tiet,
                photo: j.hinh_anh,
                video: j.video_ghi_hinh,
              }));
            } catch {
              return [];
            }
          }),
        );
        setJournal(journalGroups.flat());
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [token]);

  const respondAssignment = async (assignment, status, reason = "") => {
    try {
      await respondToAssignment(assignment.ma_phan_cong, status, reason, token);
      setAssignments((items) => status === "tu_choi"
        ? items.filter((item) => item.ma_phan_cong !== assignment.ma_phan_cong)
        : items.map((item) => item.ma_phan_cong === assignment.ma_phan_cong ? { ...item, trang_thai: status } : item),
      );
      if (status === "da_chap_nhan") {
        notify("Đã tiếp nhận phân công chăm sóc ô đất thành công!");
      } else {
        notify("Đã từ chối phân công và gửi lý do cho Quản trị viên.");
      }
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    }
  };

  const confirmRejectAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!rejectingAssignment) return;
    const presets = {
      busy: "Đã quá tải số lượng ô đất phụ trách (Không đủ nhân lực chăm sóc thêm).",
      distance: "Ô đất được phân công nằm ở khu vực/khu vườn quá xa khu vực trực chốt hiện tại.",
      skill: "Chưa có kinh nghiệm chăm sóc loại cây trồng/giống cây đang được yêu cầu trên ô đất này.",
      other: rejectionReasonText.trim() || "Lý do khác",
    };
    let reason = presets[rejectionReasonType] || "Nông dân bận lịch, từ chối nhận phân công";
    if (rejectionReasonType !== "other" && rejectionReasonText.trim()) {
      reason += ` - Chi tiết: ${rejectionReasonText.trim()}`;
    }
    await respondAssignment(rejectingAssignment, "tu_choi", reason);
    setRejectingAssignment(null);
    setRejectionReasonText("");
    setRejectionReasonType("busy");
  };

  const updateRequest = async (id, status, reply = "", photo = "") => {
    try {
      await updateServiceRequest(
        id,
        {
          status,
          ma_nong_dan_xu_ly: user.id,
          phan_hoi_cua_nha_vuon: reply,
          hinh_anh_nghiem_thu: photo,
        },
        token,
      );
      setRequests((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status, reply, photo } : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeJournal = async (entry) => {
    if (!window.confirm(`Xóa nhật ký của ô ${entry.plot}?`)) return;
    try {
      await deleteJournal(entry.id, token);
      setJournal((items) => items.filter((item) => item.id !== entry.id));
      notify("Đã xóa nhật ký.");
    } catch (journalErr) {
      setError(journalErr.message);
      notify(journalErr.message, "error");
    }
  };

  const submitJournal = async (event) => {
    event.preventDefault();
    if (!journalForm.note.trim()) return;
    if (!plots.length) {
      const message = "Bạn chưa được phân công chăm sóc ô đất nào.";
      setError(message);
      notify(message, "error");
      return;
    }

    try {
      const targetPlot =
        plots.find((p) => p.id === journalForm.plot) || plots[0];
      const rentalId = Number(targetPlot?.rentalId);
      if (!rentalId) {
        const message = "Không xác định được hợp đồng canh tác cho ô đất này.";
        setError(message);
        notify(message, "error");
        return;
      }

      const journalPayload = {
        ma_hop_dong: rentalId,
        ma_nong_dan: user.id,
        giai_doan_sinh_truong: "Sinh trưởng",
        cong_viec_da_lam: `${journalForm.task} · Tưới: ${journalForm.water || "10 lít"}`,
        ghi_chu_chi_tiet: journalForm.note,
        loai_phan_bon_da_dung: journalForm.fertilizer,
        danh_sach_hinh_anh: journalForm.photo || null,
        video_ghi_hinh: journalForm.video || null,
      };
      if (editingJournal)
        await updateJournal(editingJournal.id, journalPayload, token);
      else await createJournal(journalPayload, token);
      setJournal((items) =>
        editingJournal
          ? items.map((item) =>
              item.id === editingJournal.id
                ? { ...item, ...journalForm, date: "Vừa cập nhật" }
                : item,
            )
          : [
              {
                ...journalForm,
                id: Date.now(),
                plot: targetPlot.id,
                date: "Vừa cập nhật",
              },
              ...items,
            ],
      );
      setEditingJournal(null);
      setJournalForm({ ...journalForm, note: "", photo: "", video: "" });
      const message = editingJournal
        ? "Đã cập nhật nhật ký."
        : "Đã gửi và lưu nhật ký thành công vào cơ sở dữ liệu!";
      setJournalMessage(message);
      notify(message);
      setTimeout(() => setJournalMessage(""), 3000);
    } catch (journalErr) {
      setError(journalErr.message);
      notify(journalErr.message, "error");
    }
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadJournalMedia(file, token);
      setJournalForm((prev) => ({ ...prev, photo: uploadedUrl }));
      notify("Ảnh đã tải lên và sẵn sàng gửi.");
    } catch (uploadError) {
      setError(uploadError.message);
      notify(uploadError.message, "error");
    }
  };

  const handleVideo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadJournalMedia(file, token);
      setJournalForm((prev) => ({ ...prev, video: uploadedUrl }));
      notify("Video đã tải lên và sẵn sàng gửi.");
    } catch (uploadError) {
      setError(uploadError.message);
      notify(uploadError.message, "error");
    }
  };

  const confirmPlanting = async (plot) => {
    try {
      await updateCultivationStatus(plot.rentalId, "dang_canh_tac", token);
      setPlots((items) =>
        items.map((item) =>
          item.rentalId === plot.rentalId
            ? {
                ...item,
                stage: "dang_canh_tac",
                stageLabel: cultivationLabels.dang_canh_tac,
                next: "Theo dõi và chăm sóc theo lịch",
              }
            : item,
        ),
      );
    } catch (plantingError) {
      setError(plantingError.message);
    }
  };

  const saveCamera = (plotId) => {
    setCameraMessage(`Đã lưu liên kết camera cho ô ${plotId}.`);
    setTimeout(() => setCameraMessage(""), 2500);
  };

  const handleReadyToHarvest = async (plot) => {
    try {
      const rentalId = plot.rentalId;
      if (!rentalId) {
        notify("Không tìm thấy mã hợp đồng tương ứng", "error");
        return;
      }
      await readyToHarvest(rentalId, { plotId: plot.id }, token);
      setPlots((items) =>
        items.map((item) =>
          item.rentalId === rentalId
            ? {
                ...item,
                stage: "san_sang_thu_hoach",
                stageLabel: cultivationLabels.san_sang_thu_hoach,
                next: "Chờ khách hàng chọn hình thức nhận nông sản",
                progress: 100,
              }
            : item,
        ),
      );
      setHarvestDeliveries((items) => [
        ...items.filter((item) => item.ma_hop_dong !== rentalId),
        {
          ma_hop_dong: rentalId,
          so_hieu_o: plot.id,
          ten_cay_trong: plot.crop,
          ten_khach_hang: plot.customer,
          trang_thai: "cho_khach_chon",
        },
      ]);
      getFarmerHarvestDeliveries(token).then((data) => {
        if (data && data.length) setHarvestDeliveries(data);
      }).catch(() => {});
      notify(`Ô đất ${plot.id} đã chuyển sang trạng thái sẵn sàng thu hoạch! Hệ thống đã gửi thông báo đến khách hàng.`);
    } catch (err) {
      notify(err.message || "Không thể kích hoạt sẵn sàng thu hoạch", "error");
    }
  };

  const markReadyForHarvest = handleReadyToHarvest;

  const handoverHarvest = async (delivery) => {
    try {
      await handoverHarvestDelivery(delivery.ma_giao_nhan, token);
      setHarvestDeliveries((items) =>
        items.map((item) =>
          item.ma_giao_nhan === delivery.ma_giao_nhan
            ? { ...item, trang_thai: "da_ban_giao_van_chuyen" }
            : item,
        ),
      );
      setPlots((items) =>
        items.filter((item) => item.rentalId !== delivery.ma_hop_dong),
      );
      notify("Đã bàn giao nông sản cho đơn vị vận chuyển.");
    } catch (handoverError) {
      setError(handoverError.message);
      notify(handoverError.message, "error");
    }
  };
  const activeRequests = requests.filter(
    (request) => request.status !== "hoan_thanh",
  ).length;
  const saveProfile = async (nextUser) => {
    try {
      const currentAuth = JSON.parse(sessionStorage.getItem("plotfarm_auth") || "{}");
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
      sessionStorage.setItem("plotfarm_user", JSON.stringify(mergedUser));
      window.location.reload();
    } catch (saveError) {
      notify(saveError.message, "error");
    }
  };

  return (
    <main className="dashboard-page farmer-dashboard">
      <header className="dashboard-header">
        <a className="brand" href="/">
          <span className="brand-mark">PF</span>
          <span>
            plot<span>farm</span>
          </span>
        </a>
        <nav className="workspace-nav" aria-label="Điều hướng khu vực nông dân">
          {[
            ["plots", "Ô đất"],
            ["journal", "Nhật ký"],
            ["requests", "Yêu cầu"],
            ["cameras", "Camera"],
            ["harvest", "Thu hoạch"],
          ].map(([id, label]) => (
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
          roleLabel="Nông dân PlotFarm"
          onProfile={() => selectTab("profile")}
          onLogout={onLogout}
        />
      </header>
      <section className="dashboard-shell">
        <div className="workspace-kicker">
          <p className="eyebrow">KHU VỰC NÔNG DÂN</p>
          <span className="workspace-date">Mùa vụ 2026 · Đang hoạt động</span>
        </div>
        {loading && (
          <p className="loading-state" role="status">
            Đang tải dữ liệu mùa vụ...
          </p>
        )}
        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}
        <h1>
          Xin chào, <em>{user.name.split(" ").pop()}.</em>
        </h1>
        <p className="dashboard-lead">
          Theo dõi mùa vụ, chăm sóc những ô đất và cập nhật tiến độ canh tác của
          bạn.
        </p>
        <div className="dashboard-stat-grid">
          <div className="dashboard-stat">
            <span>Ô đất được phân công</span>
            <strong>{plots.length}</strong>
            <small>Đang canh tác</small>
          </div>
          <div className="dashboard-stat">
            <span>Nhật ký canh tác</span>
            <strong>{journal.length}</strong>
            <small>Đã gửi trong phiên này</small>
          </div>
          <div className="dashboard-stat">
            <span>Yêu cầu cần xử lý</span>
            <strong>{activeRequests}</strong>
            <small>Phản hồi khách hàng</small>
          </div>
          <div className="dashboard-stat">
            <span>Chờ thu hoạch</span>
            <strong>
              {
                plots.filter(
                  (plot) =>
                    plot.stage === "san_sang_thu_hoach",
                ).length
              }
            </strong>
            <small>Chuyển sang đóng gói</small>
          </div>
        </div>
        {assignments.some(
          (assignment) => assignment.trang_thai === "cho_tiep_nhan",
        ) && (
          <section className="farmer-content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">LỜI MỜI PHÂN CÔNG</p>
                <h2>Admin muốn giao ô đất cho bạn</h2>
              </div>
            </div>
            {assignments
              .filter((assignment) => assignment.trang_thai === "cho_tiep_nhan")
              .map((assignment) => (
                <article className="care-request" key={assignment.ma_phan_cong}>
                  <div>
                    <strong>
                      {assignment.so_hieu_o} · {assignment.ten_khach_hang}
                    </strong>
                    <p>
                      {assignment.ghi_chu ||
                        "Hãy xác nhận để bắt đầu nhận yêu cầu chăm sóc từ khách hàng."}
                    </p>
                  </div>
                  <div className="request-actions">
                    <button
                      className="outline-button"
                      onClick={() => setRejectingAssignment(assignment)}
                    >
                      Từ chối
                    </button>
                    <button
                      className="primary-button"
                      onClick={() =>
                        respondAssignment(assignment, "da_chap_nhan")
                      }
                    >
                      Chấp nhận phân công
                    </button>
                  </div>
                </article>
              ))}
          </section>
        )}
        <nav
          className="farmer-tabs legacy-tabs"
          aria-label="Chức năng nông dân"
        >
          {[
            [
              "assignments",
              `Hộp thư phân công${assignments.filter((item) => item.trang_thai === "cho_tiep_nhan").length ? ` (${assignments.filter((item) => item.trang_thai === "cho_tiep_nhan").length})` : ""}`,
            ],
            ["plots", "Ô đất được phân công"],
            ["journal", "Nhật ký canh tác"],
            [
              "requests",
              `Yêu cầu chăm sóc${activeRequests ? ` (${activeRequests})` : ""}`,
            ],
            ["cameras", "Camera / thiết bị"],
            ["harvest", "Xác nhận thu hoạch"],
            ["profile", "Hồ sơ cá nhân"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "assignments" && (
          <section className="farmer-content-panel assignment-inbox">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ASSIGNMENT INBOX</p>
                <h2>Tiếp nhận phân công</h2>
              </div>
              <span className="result-count">
                {assignments.length} phân công
              </span>
            </div>
            <div className="assignment-list">
              {assignments.length === 0 ? (
                <p className="empty-state">Chưa có phân công mới.</p>
              ) : (
                assignments.map((assignment) => (
                  <article
                    className={`assignment-card ${assignment.trang_thai}`}
                    key={assignment.ma_phan_cong}
                  >
                    <div>
                      <span className="plot-id">{assignment.so_hieu_o}</span>
                      <h3>
                        {assignment.ten_khach_hang || "Khu vực được giao"}
                      </h3>
                      <p>
                        {assignment.ghi_chu ||
                          "Phân công chăm sóc mùa vụ từ Admin."}
                      </p>
                    </div>
                    <div className="request-actions">
                      {assignment.trang_thai === "cho_tiep_nhan" ? (
                        <>
                          <button
                            className="outline-button"
                            onClick={() => setRejectingAssignment(assignment)}
                          >
                            Từ chối
                          </button>
                          <button
                            className="primary-button"
                            onClick={() =>
                              respondAssignment(assignment, "da_chap_nhan")
                            }
                          >
                            Chấp nhận
                          </button>
                        </>
                      ) : (
                        <span className="assignment-status">
                          {assignment.trang_thai === "da_chap_nhan"
                            ? "Đã chấp nhận"
                            : `Đã từ chối${assignment.ly_do_tu_choi ? ` (${assignment.ly_do_tu_choi})` : ""}`}
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "plots" && (
          <section className="farmer-content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">MÙA VỤ CỦA BẠN</p>
                <h2>Các ô đất đang chăm sóc</h2>
              </div>
              <span className="result-count">
                {plots.length} ô đất · cập nhật hôm nay
              </span>
            </div>
            <div className="farmer-plot-list">
              {plots.map((plot) => (
                <article className="farmer-plot-card" key={plot.id}>
                  <div className="farmer-plot-top">
                    <span className="plot-id">{plot.id}</span>
                    <span className="plot-stage">{plot.stageLabel}</span>
                  </div>
                  <h3>{plot.crop}</h3>
                  <p className="farmer-customer">
                    Khách hàng: <strong>{plot.customer}</strong>
                  </p>
                  <div className="plot-meta">
                    <span>{plot.area}</span>
                    <span>Ngày thuê: {formatDate(plot.startDate)}</span>
                  </div>
                  <div className="farmer-progress">
                    <span style={{ width: `${plot.progress}%` }} />
                  </div>
                  <small>
                    Thanh toán:{" "}
                    {plot.payment === "da_thanh_toan"
                      ? "Đã thanh toán"
                      : plot.payment || "Đang kiểm tra"}
                  </small>
                  {plot.specialRequest && (
                    <p className="plot-special-request">
                      <strong>Yêu cầu đặc biệt:</strong> {plot.specialRequest}
                    </p>
                  )}
                  {plot.stage === "cho_gieo_trong" && (
                    <button
                      className="primary-button"
                      onClick={() => confirmPlanting(plot)}
                    >
                      Đã nhận giống và tiến hành gieo trồng
                    </button>
                  )}
                  {plot.stage === "dang_canh_tac" && plot.progress >= 100 && (
                    <button
                      className="primary-button"
                      style={{ background: "#2d6a4f", marginTop: "8px" }}
                      onClick={() => handleReadyToHarvest(plot)}
                    >
                      🌾 Báo sẵn sàng thu hoạch
                    </button>
                  )}
                  {plot.stage === "san_sang_thu_hoach" && (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#e8f5e9",
                        color: "#2e7d32",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        fontSize: "12px",
                        marginTop: "8px",
                      }}
                    >
                      ✅ Đã sẵn sàng thu hoạch (Chờ khách chọn nhận hàng)
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "journal" && (
          <section className="farmer-content-panel journal-workspace">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CẬP NHẬT CHO KHÁCH HÀNG</p>
                <h2>
                  {editingJournal
                    ? "Chỉnh sửa nhật ký"
                    : "Thêm nhật ký canh tác"}
                </h2>
              </div>
              <span className="result-count">Hàng ngày / hàng tuần</span>
            </div>
            <form className="farmer-form" onSubmit={submitJournal}>
              <label>
                Ô đất
                <select
                  value={journalForm.plot}
                  onChange={(event) =>
                    setJournalForm({ ...journalForm, plot: event.target.value })
                  }
                >
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.id} · {plot.crop}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Loại công việc
                <select
                  value={journalForm.task}
                  onChange={(event) =>
                    setJournalForm({ ...journalForm, task: event.target.value })
                  }
                >
                  {[
                    "Tưới nước",
                    "Bón phân",
                    "Làm cỏ",
                    "Phun thuốc hữu cơ",
                    "Tỉa cành",
                    "Khác",
                  ].map((task) => (
                    <option key={task}>{task}</option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú tình trạng cây
                <textarea
                  value={journalForm.note}
                  onChange={(event) =>
                    setJournalForm({ ...journalForm, note: event.target.value })
                  }
                  placeholder="Ví dụ: cây đang phát triển tốt, xuất hiện vài lá vàng..."
                  required
                />
              </label>
              <div className="farmer-form-row">
                <label>
                  Lượng nước
                  <input
                    value={journalForm.water}
                    onChange={(event) =>
                      setJournalForm({
                        ...journalForm,
                        water: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Phân bón
                  <input
                    value={journalForm.fertilizer}
                    onChange={(event) =>
                      setJournalForm({
                        ...journalForm,
                        fertilizer: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className="photo-upload">
                Ảnh thực tế
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                />
                {journalForm.photo && (
                  <img
                    src={resolveImageUrl(journalForm.photo)}
                    alt="Ảnh xem trước nhật ký"
                  />
                )}
              </label>
              <label>
                Video thực tế
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleVideo}
                />
              </label>
              <button className="primary-button" type="submit">
                {editingJournal ? "Lưu chỉnh sửa" : "Gửi nhật ký"}{" "}
                <span>→</span>
              </button>
              {journalMessage && (
                <p className="form-success">{journalMessage}</p>
              )}
            </form>
            <div className="journal-history">
              <div className="journal-history-heading">
                <h3>Lịch sử nhật ký</h3>
                <select value={journalPlotFilter} onChange={(event) => setJournalPlotFilter(event.target.value)} aria-label="Lọc nhật ký theo ô đất">
                  <option value="all">Tất cả ô đất</option>
                  {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.id}</option>)}
                </select>
              </div>
              {journal.filter((entry) => journalPlotFilter === "all" || entry.plot === journalPlotFilter).length === 0 ? (
                <p className="empty-state">Chưa có cập nhật mới.</p>
              ) : (
                journal.filter((entry) => journalPlotFilter === "all" || entry.plot === journalPlotFilter).map((entry) => (
                  <article key={entry.id}>
                    <div>
                      <strong>{entry.plot}</strong>
                      <small>
                        {entry.date} · {entry.task} · {entry.fertilizer}
                      </small>
                      <p>{entry.note}</p>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => {
                          setEditingJournal(entry);
                          setJournalForm({ ...journalForm, ...entry });
                        }}
                      >
                        Chỉnh sửa
                      </button>
                      <button className="table-action danger-action" type="button" onClick={() => removeJournal(entry)}>
                        Xóa
                      </button>
                    </div>
                    {entry.photo && (
                      <img
                        src={resolveImageUrl(entry.photo)}
                        alt="Ảnh cây trồng trong nhật ký"
                      />
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "requests" && (
          <section className="farmer-content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">HỘP THƯ CHĂM SÓC</p>
                <h2>Yêu cầu từ khách hàng</h2>
              </div>
              <span className="result-count">
                Tiếp nhận · thực hiện · hoàn thành
              </span>
            </div>
            <div className="request-list">
              {requests.map((request) => (
                <article
                  className={`care-request request-${request.status} ${request.status === "hoan_thanh" ? "resolved" : ""}`}
                  key={request.id}
                >
                  <div>
                    <div className="request-heading">
                      <strong>
                        {request.plot} · {request.customer}
                      </strong>
                      <span>
                        {requestLabels[request.status] || request.status}
                      </span>
                    </div>
                    <p>{request.text}</p>
                    <small>{formatDate(request.time)}</small>
                    {request.reply && (
                      <p className="request-reply">
                        <strong>Phản hồi:</strong> {request.reply}
                      </p>
                    )}
                    {request.photo && (
                      <img
                        className="request-proof"
                        src={resolveImageUrl(request.photo)}
                        alt="Ảnh phản hồi yêu cầu"
                      />
                    )}
                  </div>
                  <div className="request-actions">
                    {request.status === "cho_tiep_nhan" && (
                      <button
                        className="outline-button"
                        onClick={() =>
                          updateRequest(request.id, "da_tiep_nhan")
                        }
                      >
                        Tiếp nhận
                      </button>
                    )}
                    {request.status === "da_tiep_nhan" && (
                      <button
                        className="outline-button"
                        onClick={() =>
                          updateRequest(request.id, "dang_thuc_hien")
                        }
                      >
                        Bắt đầu thực hiện
                      </button>
                    )}
                    {request.status === "dang_thuc_hien" && (
                      <>
                        <input
                          placeholder="Phản hồi cho khách hàng"
                          onChange={(event) =>
                            setRequests((items) =>
                              items.map((item) =>
                                item.id === request.id
                                  ? { ...item, reply: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            try {
                              const uploadedUrl = await uploadJournalMedia(
                                file,
                                token,
                              );
                              setRequests((items) =>
                                items.map((item) =>
                                  item.id === request.id
                                    ? { ...item, photo: uploadedUrl }
                                    : item,
                                ),
                              );
                              notify("Ảnh đã tải lên và sẵn sàng gửi.");
                            } catch (uploadError) {
                              notify(uploadError.message, "error");
                            }
                          }}
                        />
                        <button
                          className="primary-button"
                          onClick={() =>
                            updateRequest(
                              request.id,
                              "hoan_thanh",
                              request.reply,
                              request.photo,
                            )
                          }
                        >
                          Hoàn thành
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "cameras" && (
          <section className="farmer-content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">THIẾT BỊ ĐƯỢC PHÂN QUYỀN</p>
                <h2>Liên kết camera ô đất</h2>
              </div>
              <span className="result-count">
                Chỉ dùng link stream được cấp quyền
              </span>
            </div>
            <div className="camera-settings">
              {plots.map((plot) => (
                <div className="camera-setting" key={plot.id}>
                  <div>
                    <strong>
                      {plot.id} · {plot.crop}
                    </strong>
                    <small>
                      {plot.camera ? "Thiết bị đã đăng ký" : "Chưa có camera"}
                    </small>
                  </div>
                  <input
                    aria-label={`Liên kết camera ô ${plot.id}`}
                    value={cameraUrls[plot.id] || ""}
                    placeholder="https://camera..."
                    onChange={(event) =>
                      setCameraUrls({
                        ...cameraUrls,
                        [plot.id]: event.target.value,
                      })
                    }
                  />
                  <button
                    className="outline-button"
                    onClick={() => saveCamera(plot.id)}
                  >
                    Lưu liên kết
                  </button>
                </div>
              ))}
            </div>
            {cameraMessage && <p className="form-success">{cameraMessage}</p>}
          </section>
        )}

        {activeTab === "harvest" && (
          <section className="farmer-content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">BÀN GIAO MÙA VỤ</p>
                <h2>Xác nhận thu hoạch</h2>
              </div>
              <span className="result-count">
                Thông báo cho đóng gói và vận chuyển
              </span>
            </div>
            <div className="harvest-list">
              {harvestDeliveries.length === 0 && <p className="empty-state">Chưa có mùa vụ nào cần thu hoạch hoặc bàn giao.</p>}
              {harvestDeliveries.map((delivery) => {
                const waitingCustomer = delivery.trang_thai === "cho_khach_chon";
                const isDone = delivery.trang_thai === "da_ban_giao_van_chuyen";
                return (
                  <article
                    className={`harvest-item ${isDone ? "harvest-done" : ""}`}
                    key={delivery.ma_giao_nhan || delivery.ma_hop_dong}
                  >
                    <div>
                      <strong>
                        {delivery.so_hieu_o} · {delivery.ten_cay_trong || "Nông sản theo mùa vụ"}
                      </strong>
                      <p>Khách hàng: {delivery.ten_khach_hang}</p>
                      <p>Nông sản cần thu hoạch: {delivery.ten_cay_trong || "Nông sản của ô đất"}{delivery.dien_tich_m2 ? ` · ${delivery.dien_tich_m2} m²` : ""}</p>
                      <small>
                        {isDone
                          ? "Đã bàn giao cho vận chuyển."
                          : waitingCustomer ? "Đang chờ khách hàng chọn hình thức nhận nông sản."
                            : `${delivery.hinh_thuc_nhan === "giao_tan_noi" ? `Giao đến: ${delivery.dia_chi_nhan}` : "Khách nhận tại nông trại"}${delivery.ghi_chu_khach ? ` · Ghi chú: ${delivery.ghi_chu_khach}` : ""}`}
                      </small>
                    </div>
                    <button
                      className={isDone ? "harvest-confirmed" : "primary-button"}
                      disabled={isDone || waitingCustomer}
                      onClick={() => handoverHarvest(delivery)}
                    >
                      {isDone ? "Đã bàn giao" : waitingCustomer ? "Chờ khách phản hồi" : "Đã bàn giao cho vận chuyển"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {activeTab === "profile" && (
          <ProfilePanel user={user} onSave={saveProfile} />
        )}
      </section>

      {rejectingAssignment && (
        <div className="booking-backdrop">
          <form className="booking-modal" onSubmit={confirmRejectAssignment}>
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setRejectingAssignment(null);
                setRejectionReasonText("");
              }}
            >
              ×
            </button>
            <p className="eyebrow" style={{ color: "#c94a4a" }}>
              XÁC NHẬN TỪ CHỐI PHÂN CÔNG
            </p>
            <h2>Từ chối nhận ô {rejectingAssignment.so_hieu_o}</h2>
            <p>
              Vui lòng chọn hoặc nhập lý do bạn không thể nhận phân công chăm sóc ô đất này để Quản trị viên kịp thời điều phối nông dân khác.
            </p>

            <label>
              Lý do từ chối chính
              <select
                value={rejectionReasonType}
                onChange={(e) => setRejectionReasonType(e.target.value)}
              >
                <option value="busy">Đã quá tải số lượng ô đất phụ trách</option>
                <option value="distance">Ô đất ở khu vực/khu vườn quá xa</option>
                <option value="skill">Chưa có kinh nghiệm chăm sóc loại cây/giống cây</option>
                <option value="other">Khác (Vui lòng nhập chi tiết)</option>
              </select>
            </label>

            <label>
              Ghi chú thêm chi tiết (nếu có)
              <textarea
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #dfe1da",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
                placeholder={rejectionReasonType === "other" ? "Vui lòng nhập lý do cụ thể..." : "Nhập thêm chi tiết nếu cần thiết..."}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                required={rejectionReasonType === "other"}
              />
            </label>

            <div className="booking-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setRejectingAssignment(null);
                  setRejectionReasonText("");
                }}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ backgroundColor: "#c94a4a", borderColor: "#c94a4a" }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default FarmerPage;
