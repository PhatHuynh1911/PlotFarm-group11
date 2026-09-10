const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Không thể kết nối đến máy chủ')
  return result
}

export const normalizePlot = (plot) => ({
  id: plot.ma_o_dat,
  code: plot.so_hieu_o,
  name: plot.ten_o_dat,
  area: Number(plot.dien_tich_m2),
  soil: plot.loai_dat || 'Đất thịt hữu cơ',
  location: plot.ten_nong_trai || 'Vườn PlotFarm',
  price: Number(plot.gia_thue_thang),
  status: plot.trang_thai,
  description: plot.mo_ta_chi_tiet || '',
  image: plot.hinh_anh_o_dat,
})

export async function getPlots() {
  const result = await apiRequest('/plots')
  return result.data.map(normalizePlot)
}

export async function getDashboardStats() {
  const result = await apiRequest('/admin/dashboard')
  return result.data
}