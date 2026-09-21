import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getComplaintTagByTitle } from "../data/complaintCategories.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const tabs = [
  ["overview", "Tổng quan"],
  ["users", "Người dùng"],
  ["plots", "Ô đất"],
  ["assignments", "Phân công nhân sự"],
  ["rentals", "Đơn thuê & giao dịch"],
  ["requests", "Yêu cầu & khiếu nại"],
];
const labels = {
  role: { khach_hang: "Khách hàng", nong_dan: "Nông dân", quan_tri: "Admin" },
  userStatus: { hoat_dong: "Hoạt động", bi_khoa: "Bị khóa" },
  plotStatus: {
    trong: "Trống",
    dang_chon: "Đang chọn",
    da_thue: "Đã thuê",
    bao_tri: "Bảo trì",
  },
  requestStatus: {
    cho_tiep_nhan: "Chờ tiếp nhận",
    da_tiep_nhan: "Đã tiếp nhận",
    dang_thuc_hien: "Đang thực hiện",
    hoan_thanh: "Hoàn thành",
    tu_choi: "Từ chối",
  },
  contactStatus: {
    moi: "Mới",
    da_lien_he: "Đã liên hệ",
    thanh_cong: "Thành công",
    that_bai: "Không liên hệ được",
  },
  complaintStatus: {
    dang_tiep_nhan: "Đang tiếp nhận",
    da_giai_quyet: "Đã giải quyết",
    tu_choi: "Từ chối",
  },
  assignmentStatus: {
    cho_tiep_nhan: "Chờ tiếp nhận",
    da_chap_nhan: "Đã chấp nhận",
    tu_choi: "Đã từ chối",
    da_huy: "Đã hủy",
  },
  paymentStatus: {
    cho_thanh_toan: "Chờ thanh toán",
    da_thanh_toan: "Đã thanh toán",
    hoan_tien: "Hoàn tiền",
  },
};
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const date = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

function AdminPage({ user, token, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [data, setData] = useState({
    stats: null,
    users: [],
    plots: [],
    rentals: [],
    serviceRequests: [],
    complaintRequests: [],
    consultationRequests: [],
    farmers: [],
    assignments: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editingPlot, setEditingPlot] = useState(null);

  const selectTab = (tab) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  const load = useCallback(async () => {
    try {
      const endpoints = [
        "dashboard",
        "users",
        "plots",
        "rentals",
        "requests/services",
        "requests/complaints",
        "requests/consultations",
        "farmers",
        "assignments",
      ];
      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API_URL}/admin/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      const results = await Promise.all(
        responses.map(async (response) => {
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || "Không thể tải dữ liệu quản trị");
          return result.data;
        }),
      );
      setData({
        stats: results[0],
        users: results[1],
        plots: results[2],
        rentals: results[3],
        serviceRequests: results[4],
        complaintRequests: results[5],
        consultationRequests: results[6],
        farmers: results[7],
        assignments: results[8],
      });
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (path, method, body) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_URL}/admin/${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
      },
      body: isFormData ? body : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Thao tác thất bại");
    setNotice(result.message);
    await load();
  };
  const updateUser = (item) =>
    update(`users/${item.id}`, "PATCH", {
      status: item.status === "hoat_dong" ? "bi_khoa" : "hoat_dong",
    }).catch((e) => setError(e.message));
  const updateRequest = (item, value) =>
    update(`requests/${item.id}`, "PATCH", { status: value, source: item.source }).catch((e) =>
      setError(e.message),
    );
  const deletePlot = (item) => {
    if (!window.confirm(`Xóa ô đất "${item.code}"? Hành động này không thể hoàn tác.`)) return;
    setError("");
    update(`plots/${item.id}`, "DELETE").catch((e) => setError(e.message));
  };
  const savePlot = async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      form.set("farmId", Number(form.get("farmId")));
      form.set("area", Number(form.get("area")));
      form.set("price", Number(form.get("price")));
      if (form.get("position_x")) form.set("position_x", Number(form.get("position_x")));
      if (form.get("position_y")) form.set("position_y", Number(form.get("position_y")));
      await update(
        editingPlot ? `plots/${editingPlot.id}` : "plots",
        editingPlot ? "PATCH" : "POST",
        form,
      );
      setEditingPlot(null);
      formEl.reset();
    } catch (e) {
      setError(e.message);
    }
  };

  const stats = data.stats || {};
  return (
    <main className="dashboard-page admin-workspace">
      <header className="dashboard-header">
        <a className="brand" href="/">
          <span className="brand-mark">PF</span>
          <span>
            plot<span>farm</span>
          </span>
        </a>
        <nav className="workspace-nav" aria-label="Điều hướng quản trị">
          {tabs.map(([id, label]) => (
            <button
              className={activeTab === id ? "active" : ""}
              key={id}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="dashboard-account">
          <span>
            {user.name}
            <small>Quản trị viên</small>
          </span>
          <button className="dashboard-logout" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <section className="dashboard-shell">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">TRUNG TÂM VẬN HÀNH</p>
            <h1>
              Quản trị <em>PlotFarm.</em>
            </h1>
            <p className="dashboard-lead">
              Theo dõi tài khoản, mùa vụ và chất lượng phục vụ từ một nơi.
            </p>
          </div>
          <span className="system-status admin-system">
            <i /> Hệ thống đang hoạt động
          </span>
        </div>
        <nav className="admin-tabs" aria-label="Các chức năng quản trị">
          {tabs.map(([id, label]) => (
            <button
              className={activeTab === id ? "active" : ""}
              key={id}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {loading && (
          <p className="loading-state" role="status">
            Đang tải dữ liệu quản trị...
          </p>
        )}
        {error && (
          <p className="dashboard-error admin-message" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="admin-success">{notice}</p>}
        {activeTab === "overview" && <Overview stats={stats} />}
        {activeTab === "users" && (
          <UserList
            items={data.users.filter((item) => item.role !== "quan_tri")}
            onToggleStatus={updateUser}
          />
        )}
        {activeTab === "plots" && (
          <Plots
            items={data.plots}
            editingPlot={editingPlot}
            setEditingPlot={setEditingPlot}
            onSubmit={savePlot}
            onCancel={() => setEditingPlot(null)}
            onDelete={deletePlot}
          />
        )}
        {activeTab === "assignments" && (
          <AssignmentPanel
            items={data.rentals}
            farmers={data.farmers}
            assignments={data.assignments}
            onAssign={(payload) => update("assignments", "POST", payload)}
          />
        )}
        {activeTab === "rentals" && (
          <Rentals items={data.rentals} assignments={data.assignments} />
        )}
        {activeTab === "requests" && (
          <Requests groups={{ service: data.serviceRequests, complaint: data.complaintRequests, contact: data.consultationRequests }} onUpdate={updateRequest} />
        )}
      </section>
    </main>
  );
}

function Overview({ stats }) {
  const cards = [
    ["availablePlots", "Ô đất đang trống", "Sẵn sàng cho thuê"],
    ["rentedPlots", "Ô đất đã thuê", "Đang có hợp đồng hiệu lực"],
    ["totalFarmers", "Tổng số nông dân", "Nông dân đang hoạt động"],
    ["newOrders", "Đơn hàng mới", "Phát sinh trong 7 ngày qua"],
  ];
  const max = Math.max(
    ...(stats.monthly || []).map((item) => Number(item.revenue)),
    1,
  );
  return (
    <>
      <div className="dashboard-stat-grid">
        {cards.map(([key, label, note]) => (
          <article className="dashboard-stat" key={key}>
            <span>{label}</span>
            <strong>{stats[key] ?? "—"}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BÁO CÁO TÀI CHÍNH</p>
              <h2>Doanh thu theo tháng</h2>
            </div>
            <span className="result-count">6 kỳ gần nhất</span>
          </div>
          <div className="revenue-chart">
            {(stats.monthly || []).map((item) => (
              <div className="revenue-column" key={item.month}>
                <span>{money(item.revenue)}</span>
                <i
                  style={{
                    height: `${Math.max((Number(item.revenue) / max) * 150, 8)}px`,
                  }}
                />
                <small>{item.month}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-card admin-health">
          <p className="eyebrow">CẦN XỬ LÝ</p>
          <h2>Nhịp vận hành hôm nay</h2>
          <div>
            <b>{stats.pendingRequests || 0}</b>
            <span>yêu cầu chăm sóc đang chờ</span>
          </div>
          <div>
            <b>{stats.activeContracts || 0}</b>
            <span>hợp đồng đang hiệu lực</span>
          </div>
        </section>
      </div>
    </>
  );
}

function UserList({ items, onToggleStatus }) {
  return (
    <section className="admin-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN NGƯỜI DÙNG</p>
          <h2>Quản lý trạng thái truy cập</h2>
        </div>
        <span className="result-count">{items.length} tài khoản</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Ngày tham gia</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <small>{item.email}</small>
                </td>
                <td>
                  <span className="status-pill">{labels.role[item.role]}</span>
                </td>
                <td>{date(item.createdAt)}</td>
                <td>
                  <span
                    className={`status-pill ${item.status === "hoat_dong" ? "is-good" : "is-blocked"}`}
                  >
                    {labels.userStatus[item.status]}
                  </span>
                </td>
                <td>
                  <button
                    className="table-action"
                    onClick={() => onToggleStatus(item)}
                  >
                    {item.status === "hoat_dong" ? "Khóa tài khoản" : "Mở khóa"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserManagement({ items, onUpdate, onCreate }) {
  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow">THÊM TÀI KHOẢN</p>
        <h2>Tạo người dùng mới</h2>
        <form className="admin-form" onSubmit={onCreate}>
          <label>
            Họ và tên
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Mật khẩu tạm
            <input name="password" type="password" minLength="6" required />
          </label>
          <label>
            Vai trò
            <select name="role" defaultValue="khach_hang">
              {Object.entries(labels.role).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button">
            Tạo tài khoản <span>→</span>
          </button>
        </form>
      </section>
      <Users items={items} onUpdate={onUpdate} />
    </div>
  );
}

function Users({ items, onUpdate }) {
  return (
    <section className="admin-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN & PHÂN QUYỀN</p>
          <h2>Quản lý người dùng</h2>
        </div>
        <span className="result-count">{items.length} tài khoản</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Ngày tham gia</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <small>{item.email}</small>
                </td>
                <td>
                  <select
                    value={item.role}
                    onChange={(e) => onUpdate(item, "role", e.target.value)}
                  >
                    {Object.entries(labels.role).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{date(item.createdAt)}</td>
                <td>
                  <span
                    className={`status-pill ${item.status === "hoat_dong" ? "is-good" : "is-blocked"}`}
                  >
                    {labels.userStatus[item.status]}
                  </span>
                </td>
                <td>
                  <button
                    className="table-action"
                    onClick={() =>
                      onUpdate(
                        item,
                        "status",
                        item.status === "hoat_dong" ? "bi_khoa" : "hoat_dong",
                      )
                    }
                  >
                    {item.status === "hoat_dong" ? "Khóa" : "Mở khóa"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Plots({ items, editingPlot, setEditingPlot, onSubmit, onCancel, onDelete }) {
  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TÀI SẢN & VỊ TRÍ</p>
            <h2>Danh sách ô đất</h2>
          </div>
          <span className="result-count">{items.length} ô đất</span>
        </div>
        <div className="admin-plot-list">
          {items.map((item) => (
            <article className="admin-plot-row" key={item.id}>
              <div>
                <strong>{item.code}</strong>
                <span>{item.name}</span>
                <small>
                  {item.area} m² · {money(item.price)}/tháng
                </small>
              </div>
              <span className="status-pill">
                {labels.plotStatus[item.status] || item.status}
              </span>
              <div className="admin-plot-actions">
                <button
                  className="table-action"
                  onClick={() => setEditingPlot(item)}
                >
                  Sửa
                </button>
                <button
                  className="table-action is-danger"
                  onClick={() => onDelete(item)}
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-card">
        <p className="eyebrow">{editingPlot ? "CHỈNH SỬA" : "TẠO MỚI"}</p>
        <h2>{editingPlot ? "Cập nhật ô đất" : "Thêm ô đất"}</h2>
        <form
          className="admin-form"
          onSubmit={onSubmit}
          key={editingPlot?.id || "new"}
        >
          <label>
            Mã ô đất
            <input
              name="code"
              defaultValue={editingPlot?.code || ""}
              required
            />
          </label>
          <label>
            Tên ô đất
            <input
              name="name"
              defaultValue={editingPlot?.name || ""}
              required
            />
          </label>
          <label>
            Mã nông trại
            <input
              name="farmId"
              type="number"
              defaultValue={editingPlot?.farmId || 1}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Diện tích (m²)
              <input
                name="area"
                type="number"
                step=".01"
                defaultValue={editingPlot?.area || ""}
                required
              />
            </label>
            <label>
              Giá thuê/tháng
              <input
                name="price"
                type="number"
                defaultValue={editingPlot?.price || ""}
                required
              />
            </label>
          </div>
          <label>
            Trạng thái
            <select name="status" defaultValue={editingPlot?.status || "trong"}>
              {Object.entries(labels.plotStatus).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ảnh ô đất
            <input name="image" type="file" accept="image/*" />
          </label>
          <label>
            Mô tả
            <textarea
              name="description"
              defaultValue={editingPlot?.description || ""}
            />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingPlot ? "Lưu thay đổi" : "Thêm ô đất"}
            </button>
            {editingPlot && (
              <button className="text-button" type="button" onClick={onCancel}>
                Hủy
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function AssignmentPanel({ items, farmers, assignments, onAssign }) {
  const activeItems = items.filter((item) => item.status === "hieu_luc");
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const currentAssignment = assignments.find(
    (item) => item.ma_hop_dong === Number(selectedContract),
  );

  const submit = (event) => {
    event.preventDefault();
    if (!selectedContract || !selectedFarmer) return;
    onAssign({
      ma_hop_dong: Number(selectedContract),
      ma_nong_dan: Number(selectedFarmer),
    });
    setSelectedContract("");
    setSelectedFarmer("");
  };

  return (
    <div className="admin-two-column">
      <section className="admin-card assignment-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ĐIỀU PHỐI NHÂN SỰ</p>
            <h2>Giao nông dân phụ trách</h2>
          </div>
          <span className="result-count">{activeItems.length} ô đang thuê</span>
        </div>
        <p className="assignment-intro">
          Chọn ô đất đang có hợp đồng hiệu lực, sau đó gán một nông dân đang
          hoạt động.
        </p>
        <form className="admin-form" onSubmit={submit}>
          <label>
            {" "}
            Khu vực / ô đất
            <select
              value={selectedContract}
              onChange={(event) => setSelectedContract(event.target.value)}
              required
            >
              <option value="">Chọn ô đất cần phụ trách</option>
              {activeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.plot} · {item.code} · {item.customer}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nông dân phụ trách
            <select
              value={selectedFarmer}
              onChange={(event) => setSelectedFarmer(event.target.value)}
              required
            >
              <option value="">Chọn nông dân</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name} · {farmer.email}
                </option>
              ))}
            </select>
          </label>
          {currentAssignment && (
            <p className="assignment-current">
              Hiện tại: <strong>{currentAssignment.ten_nong_dan}</strong> ·{" "}
              {labels.assignmentStatus[currentAssignment.trang_thai] || currentAssignment.trang_thai}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={!selectedContract || !selectedFarmer}
          >
            Xác nhận phân công <span>→</span>
          </button>
        </form>
      </section>
      <section className="admin-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">THEO DÕI PHÂN CÔNG</p>
            <h2>Danh sách đã giao</h2>
          </div>
          <span className="result-count">{assignments.length} phân công</span>
        </div>
        {assignments.length ? (
          <div className="admin-assignment-list">
            {assignments.map((item) => (
              <article
                key={item.ma_phan_cong}
                style={
                  item.trang_thai === "tu_choi"
                    ? { alignItems: "flex-start", borderColor: "#f5c6c6", borderLeft: "4px solid #c94a4a", background: "#fff5f5" }
                    : { alignItems: "flex-start" }
                }
              >
                <div>
                  <strong>
                    {item.so_hieu_o} · {item.ten_nong_dan}
                  </strong>
                  <span>{item.ten_khach_hang}</span>
                  {item.trang_thai === "tu_choi" && (
                    <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: "#fde8e8", fontSize: "12px", color: "#a83b3b", lineHeight: 1.5 }}>
                      ⚠️ <strong>Lý do từ chối:</strong> {item.ly_do_tu_choi || "Không nêu lý do"}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                  <span
                    className="status-pill"
                    style={
                      item.trang_thai === "tu_choi"
                        ? { background: "#fde8e8", color: "#c94a4a", borderColor: "#f8b4b4" }
                        : {}
                    }
                  >
                    {labels.assignmentStatus[item.trang_thai] || item.trang_thai}
                  </span>
                  {item.trang_thai === "tu_choi" && (
                    <button
                      type="button"
                      className="outline-button"
                      style={{ padding: "6px 10px", fontSize: "11px", borderColor: "#c94a4a", color: "#c94a4a", whiteSpace: "nowrap" }}
                      onClick={() => setSelectedContract(String(item.ma_hop_dong))}
                      title="Chọn lại hợp đồng này để gán cho nông dân khác"
                    >
                      Gán lại nông dân
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Chưa có phân công nào.</p>
        )}
      </section>
    </div>
  );
}

function Rentals({ items, assignments }) {
  return (
    <section className="admin-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">HỢP ĐỒNG & GIAO DỊCH</p>
          <h2>Đơn thuê đất & giao dịch</h2>
        </div>
        <span className="result-count">{items.length} hợp đồng</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Hợp đồng</th>
              <th>Khách hàng</th>
              <th>Ô đất</th>
              <th>Giá trị</th>
              <th>Phân công</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const assignment = assignments.find(
                (entry) => entry.ma_hop_dong === item.id,
              );
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.code}</strong>
                    <small>
                      {item.paymentStatus === "cho_thanh_toan" ? (
                        <span style={{ color: "#c98b3c", fontWeight: "600" }}>Chờ thanh toán</span>
                      ) : (
                        <span style={{ color: "#2b8a3e" }}>Đã thanh toán</span>
                      )}
                    </small>
                  </td>
                  <td>{item.customer}</td>
                  <td>{item.plot}</td>
                  <td>
                    <strong>{money(item.total)}</strong>
                  </td>
                  <td>{assignment?.ten_nong_dan || "Chưa phân công"}</td>
                  <td>
                    <span
                      className="status-pill"
                      style={
                        assignment?.trang_thai === "tu_choi"
                          ? { background: "#fde8e8", color: "#c94a4a", borderColor: "#f8b4b4" }
                          : {}
                      }
                    >
                      {assignment ? (labels.assignmentStatus[assignment.trang_thai] || assignment.trang_thai) : "Chưa phân công"}
                    </span>
                    {assignment?.trang_thai === "tu_choi" && assignment.ly_do_tu_choi && (
                      <div style={{ fontSize: "11px", color: "#c94a4a", marginTop: "3px" }}>
                        {assignment.ly_do_tu_choi}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Requests({ groups, onUpdate }) {
  const [activeRequestTab, setActiveRequestTab] = useState("service");
  const requestTabs = [
    ["service", "Yêu cầu chăm sóc"],
    ["complaint", "Khiếu nại & tranh chấp"],
    ["contact", "Yêu cầu tư vấn"],
  ];
  const items = groups[activeRequestTab] || [];
  const currentLabel = requestTabs.find(([id]) => id === activeRequestTab)?.[1] || "Yêu cầu";
  return (
    <section className="admin-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CHẤT LƯỢNG DỊCH VỤ</p>
          <h2>{currentLabel}</h2>
        </div>
        <span className="result-count">{items.length} yêu cầu</span>
      </div>
      <nav className="request-tabs" aria-label="Phân loại yêu cầu">
        {requestTabs.map(([id, label]) => <button key={id} type="button" className={activeRequestTab === id ? "active" : ""} onClick={() => setActiveRequestTab(id)}>{label}<span>{(groups[id] || []).length}</span></button>)}
      </nav>
      <div className="admin-request-list">
        {items.length === 0 && <p className="empty-state">Chưa có {currentLabel.toLowerCase()}.</p>}
        {items.map((item) => (
          <article key={`${item.source}-${item.id}`}>
            <div>
              <strong>
                {item.service || "Yêu cầu chăm sóc"} · {item.plot}
              </strong>
              {activeRequestTab === "complaint" && (() => {
                const tag = getComplaintTagByTitle(item.service);
                return (
                  <span
                    className="status-pill"
                    style={{ background: tag.background, color: tag.color, marginLeft: 8 }}
                  >
                    {tag.text}
                  </span>
                );
              })()}
              <span>
                {item.customer}{item.phone ? ` · ${item.phone}` : ""} · {activeRequestTab === "contact" ? "đăng ký" : "lịch"} {date(item.scheduledAt)}
              </span>
              {item.email && <span>{item.email}</span>}
              <p>{item.note || "Không có ghi chú"}</p>
            </div>
            <select
              value={item.status}
              onChange={(e) => onUpdate(item, e.target.value)}
            >
              {Object.entries(
                item.source === "contact"
                  ? labels.contactStatus
                  : item.source === "complaint"
                    ? labels.complaintStatus
                    : labels.requestStatus,
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminPage;
