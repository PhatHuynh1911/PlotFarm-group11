const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
export const PLOT_PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#dfead9"/><path fill="#b7d2ae" d="M0 330 170 210l105 75 146-155 147 126 105-71 127 110v205H0z"/><path fill="#6c9b62" d="M0 390 190 265l150 99 139-125 143 93 178-69v237H0z"/><circle cx="674" cy="110" r="44" fill="#f5cf75"/><text x="400" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#31543b">PLOTFARM · Ô ĐẤT CANH TÁC</text></svg>` )}`
const getStoredToken = () => {
  try { return JSON.parse(sessionStorage.getItem('plotfarm_auth') || 'null')?.token } catch { return null }
}

export const resolveImageUrl = (image) => {
  if (!image) return ''
  if (/^(https?:\/\/|data:image\/)/i.test(image)) return image
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
  const rawImage = plot.hinh_anh_o_dat || plot.image_url || plot.image || PLOT_PLACEHOLDER_IMAGE
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

export async function getCrops() {
  const result = await apiRequest('/crops')
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

export async function submitComplaint(payload, token) {
  return apiRequest('/complaints', { method: 'POST', body: JSON.stringify(payload), token })
}

export async function getUserComplaints(userId, token) {
  const result = await apiRequest(`/complaints/user/${userId}`, { token })
  return result.data
}

export async function updateComplaintStatus(id, payload, token) {
  return apiRequest(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload), token })
}

export async function getAdminServiceRequests(token) {
  const result = await apiRequest('/admin/requests/services', { token })
  return result.data
}

export async function getAdminComplaintRequests(token) {
  const result = await apiRequest('/admin/requests/complaints', { token })
  return result.data
}

export async function getAdminConsultationRequests(token) {
  const result = await apiRequest('/admin/requests/consultations', { token })
  return result.data
}

export async function uploadJournalMedia(file, token) {
  if (!file) throw new Error('Vui lòng chọn tệp để tải lên')

  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Không thể tải lên tệp')
  return result.data.url
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

export async function markHarvestReady(rentalId, token) {
  return apiRequest(`/rentals/${rentalId}/harvest-ready`, { method: 'PATCH', token })
}

export async function getFarmerHarvestDeliveries(token) {
  const result = await apiRequest('/rentals/harvest-deliveries/mine', { token })
  return result.data
}

export async function getUserHarvestDeliveries(token) {
  const result = await apiRequest('/rentals/harvest-deliveries/user', { token })
  return result.data
}

export async function chooseHarvestDelivery(rentalId, payload, token) {
  return apiRequest(`/rentals/${rentalId}/harvest-delivery`, { method: 'POST', body: JSON.stringify(payload), token })
}

export async function handoverHarvestDelivery(deliveryId, token) {
  return apiRequest(`/rentals/harvest-deliveries/${deliveryId}/handover`, { method: 'PATCH', token })
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

export async function respondToAssignment(id, status, reason = '', token) {
  return apiRequest(`/rentals/assignments/${id}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, ly_do_tu_choi: reason }),
    token
  })
}

export async function getRentalPaymentInfo(rentalId, token) {
  const result = await apiRequest(`/rentals/${rentalId}/payment-info`, { token })
  return result.data
}

export async function confirmRentalPayment(rentalId, token) {
  return apiRequest(`/rentals/${rentalId}/confirm-payment`, { method: 'POST', token })
}

export async function getUserServiceRequests(userId, token) {
  const result = await apiRequest(`/services/user/${userId}`, { token })
  return result.data
}

export async function updateCurrentUser(payload, token) {
  const result = await apiRequest('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  })
  return result
}

export async function readyToHarvest(rentalOrPlotId, payload = {}, token) {
  return apiRequest(`/rentals/${rentalOrPlotId}/ready-to-harvest`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })
}

export async function registerHarvestDelivery(payload, token) {
  return apiRequest('/harvest/delivery', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })
}

export async function getHarvestByRental(rentalId, token) {
  const result = await apiRequest(`/harvest/rental/${rentalId}`, { token })
  return result.data
}

export async function getAllHarvests(token) {
  const result = await apiRequest('/harvest', { token })
  return result.data
}

export async function extendRental(rentalId, payload, token) {
  return apiRequest(`/rentals/${rentalId}/gia-han`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })
}

export async function getAvailablePlots(token) {
  const result = await apiRequest('/plots/available-plots', { token })
  return (result.data || []).map(normalizePlot)
}

export async function chooseNewCrop(rentalId, payload, token) {
  return apiRequest(`/rentals/${rentalId}/chon-cay-moi`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })
}

