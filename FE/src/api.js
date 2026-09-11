const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getStoredToken = () => {
  try { return JSON.parse(sessionStorage.getItem('plotfarm_auth') || 'null')?.token } catch { return null }
}

export async function apiRequest(path, options = {}) {
  const { token: providedToken, ...requestOptions } = options
  const token = providedToken || getStoredToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(requestOptions.headers || {}) },
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
  const result = await apiRequest('/auth/admin-dashboard')
  return result.data
}

export async function getUserRentals(userId, token) {
  const result = await apiRequest(`/rentals/user/${userId}`, { token })
  return result.data
}

export async function createRental(payload, token) {
  return apiRequest('/rentals', { method: 'POST', body: JSON.stringify(payload), token })
}

export async function getServiceTypes() {
  const result = await apiRequest('/services/types')
  return result.data
}

export async function createServiceRequest(payload, token) {
  return apiRequest('/services', { method: 'POST', body: JSON.stringify(payload), token })
}

export async function getActiveRentals(token) {
  const result = await apiRequest('/rentals/active', { token })
  return result.data
}

export async function getServiceRequests(token) {
  const result = await apiRequest('/services/all', { token })
  return result.data
}

export async function updateServiceRequest(id, payload, token) {
  return apiRequest(`/services/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload), token })
}

export async function submitContact(payload) {
  return apiRequest('/contact', { method: 'POST', body: JSON.stringify(payload) })
}

export async function createJournal(payload, token) {
  return apiRequest('/journals', { method: 'POST', body: JSON.stringify(payload), token })
}

export async function getJournalsByRental(rentalId, token) {
  const result = await apiRequest(`/journals/rental/${rentalId}`, { token })
  return result.data
}