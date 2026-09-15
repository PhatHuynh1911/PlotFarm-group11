const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
const getStoredToken = () => {
  try { return JSON.parse(sessionStorage.getItem('plotfarm_auth') || 'null')?.token } catch { return null }
}

export const resolveImageUrl = (image) => {
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  return `${API_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`
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

export const normalizePlot = (plot) => {
  const rawImage = plot.hinh_anh_o_dat || plot.image_url || plot.image || ''
  const posX = plot.position_x != null ? Number(plot.position_x) : (plot.coord_x != null ? Number(plot.coord_x) : 50.0)
  const posY = plot.position_y != null ? Number(plot.position_y) : (plot.coord_y != null ? Number(plot.coord_y) : 50.0)
  const resolved = resolveImageUrl(rawImage)

  return {
    id: plot.ma_o_dat ?? plot.id,
    farmId: plot.ma_nong_trai ?? plot.farmId ?? 1,
    code: plot.so_hieu_o ?? plot.code,
    name: plot.ten_o_dat ?? plot.name,
    area: Number(plot.dien_tich_m2 ?? plot.area ?? 0),
    soil: plot.loai_dat || plot.soil || 'Đất thịt hữu cơ',
    location: plot.ten_nong_trai || plot.location || 'Vườn PlotFarm',
    price: Number(plot.gia_thue_thang ?? plot.price ?? 0),
    status: plot.trang_thai ?? plot.status,
    description: plot.mo_ta_chi_tiet || plot.description || '',
    position_x: posX,
    position_y: posY,
    coord_x: posX,
    coord_y: posY,
    image: resolved,
    image_url: resolved,
    hinh_anh_o_dat: resolved,
  }
}

export async function getFarmPlots(farmId = 1) {
  const result = await apiRequest(`/farms/${farmId}/plots`)
  return {
    farm: result.farm,
    plots: (result.data || []).map(normalizePlot),
  }
}

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

export async function updateCultivationStatus(id, status, token) {
  return apiRequest(`/rentals/${id}/cultivation-status`, { method: 'PATCH', body: JSON.stringify({ status }), token })
}

export async function updateJournal(id, payload, token) {
  return apiRequest(`/journals/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token })
}

export async function deleteJournal(id, token) {
  return apiRequest(`/journals/${id}`, { method: 'DELETE', token })
}

export async function getAssignments(token) {
  const result = await apiRequest('/rentals/assignments/mine', { token })
  return result.data
}

export async function respondToAssignment(id, status, token) {
  return apiRequest(`/rentals/assignments/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }), token })
}

export async function getUserServiceRequests(userId, token) {
  const result = await apiRequest(`/services/user/${userId}`, { token })
  return result.data
}