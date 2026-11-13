import assert from 'node:assert/strict'
import { test, before, after, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' })
for (const name of ['window', 'document', 'HTMLElement', 'sessionStorage', 'CustomEvent', 'FormData']) globalThis[name] = name === 'window' ? dom.window : dom.window[name]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
let server, App, SafeImage, ErrorBoundary, api, ToastProvider, notify, root, RequestImages, RequestImagePicker
const originalFetch = globalThis.fetch
const unavailable = async () => ({ ok: false, json: async () => ({ success: false, message: 'API unavailable QA' }) })
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' })
  App = (await server.ssrLoadModule('/src/App.jsx')).default
  SafeImage = (await server.ssrLoadModule('/src/components/SafeImage.jsx')).default
  ErrorBoundary = (await server.ssrLoadModule('/src/components/ErrorBoundary.jsx')).default
  api = await server.ssrLoadModule('/src/api.js')
  ;({ ToastProvider, notify } = await server.ssrLoadModule('/src/components/ToastProvider.jsx'))
  ;({ RequestImages, RequestImagePicker } = await server.ssrLoadModule('/src/components/RequestImages.jsx'))
})
afterEach(async () => {
  if (root) await act(() => root.unmount())
  root = null
  sessionStorage.clear()
  globalThis.fetch = originalFetch
})
after(async () => { await server?.close(); dom.window.close() })
function auth(role) {
  const user = { id: 123, name: 'QA Test', email: 'qa@example.invalid', role }
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
  sessionStorage.setItem('plotfarm_auth', JSON.stringify({ user, token: `qa.${payload}.test` }))
}
async function render(element) {
  root = createRoot(document.getElementById('root'))
  await act(async () => {
    root.render(element)
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}
async function route(path, role) {
  if (role) auth(role)
  globalThis.fetch = unavailable
  await render(h(MemoryRouter, { initialEntries: [path] }, h(App)))
}
const paths = { khach_hang: '/dashboard', nong_dan: '/farmer', quan_tri: '/admin' }
for (const role of Object.keys(paths)) {
  for (const target of Object.keys(paths)) {
    test(`route guard: ${role} -> ${paths[target]}`, async () => {
      await route(paths[target] + '?tab=profile', role)
      if (role === target) assert.match(document.body.textContent, /Thông tin của bạn/)
      else assert.match(document.body.textContent, /Bạn không có quyền truy cập trang này/)
      assert.doesNotMatch(document.body.textContent, /Không thể hiển thị nội dung/)
    })
  }
  test(`${role}: API failure keeps navigation and an error visible`, async () => {
    const originalError = console.error
    console.error = () => {} // Weather logs its expected API failure.
    try { await route(paths[role], role) } finally { console.error = originalError }
    assert.ok(document.querySelector('.workspace-nav'))
    assert.match(document.body.textContent, /API unavailable QA/)
    assert.doesNotMatch(document.body.textContent, /Không thể hiển thị nội dung/)
  })
}
test('signed-out protected route goes to home', async () => {
  await route('/admin')
  assert.ok(document.querySelector('#plots'))
  assert.equal(document.querySelector('.admin-workspace'), null)
})
test('malformed session cannot crash the app', async () => {
  sessionStorage.setItem('plotfarm_auth', '{broken')
  await route('/farmer')
  assert.ok(document.querySelector('#plots'))
})
test('expired session cannot enter a dashboard', async () => {
  auth('quan_tri')
  const stored = JSON.parse(sessionStorage.getItem('plotfarm_auth'))
  stored.token = 'qa.' + Buffer.from(JSON.stringify({ sub: 123, role: 'quan_tri', exp: 1 })).toString('base64url') + '.test'
  sessionStorage.setItem('plotfarm_auth', JSON.stringify(stored))
  await route('/admin')
  assert.ok(document.querySelector('#plots'))
})
test('home API failure shows an error without a blank screen', async () => {
  await route('/')
  assert.ok(document.querySelector('#plots'))
  assert.match(document.body.textContent, /API unavailable QA/)
})
test('broken photo uses the local placeholder and recovers when src changes', async () => {
  await render(h(SafeImage, { src: '/missing.jpg', alt: 'QA photo' }))
  await act(() => document.querySelector('img').dispatchEvent(new window.Event('error')))
  assert.ok(document.querySelector('img').src.startsWith('data:image/svg+xml,'))
  await act(() => root.render(h(SafeImage, { src: '/fixed.jpg', alt: 'QA photo' })))
  assert.ok(document.querySelector('img').src.endsWith('/fixed.jpg'))
})
test('failed QR shows an explicit error instead of a replacement QR', async () => {
  await render(h(SafeImage, { src: '/missing-qr.png', alt: 'QR', fallbackText: 'Không tải được mã QR' }))
  await act(() => document.querySelector('img').dispatchEvent(new window.Event('error')))
  assert.equal(document.querySelector('img'), null)
  assert.match(document.querySelector('[role="status"]').textContent, /Không tải được mã QR/)
})
test('render failure shows recovery actions and recovers on navigation', async () => {
  function Broken() { throw new Error('QA render failure') }
  const originalError = console.error
  console.error = () => {}
  try { await render(h(ErrorBoundary, { resetKey: 'broken' }, h(Broken))) } finally { console.error = originalError }
  assert.match(document.body.textContent, /Tải lại trang/)
  assert.equal(document.querySelector('a').getAttribute('href'), '/')
  await act(() => root.render(h(ErrorBoundary, { resetKey: 'healthy' }, h('p', null, 'Recovered QA'))))
  assert.match(document.body.textContent, /Recovered QA/)
})
test('network failure has a readable Vietnamese message', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.apiRequest('/plots'), /Không thể kết nối đến máy chủ/)
})

test('healthy navigation preserves component state inside the error boundary', async () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return h('button', { onClick: () => setCount(count + 1) }, `Count ${count}`)
  }
  await render(h(ErrorBoundary, { resetKey: 'first' }, h(Counter)))
  await act(() => document.querySelector('button').click())
  await act(() => root.render(h(ErrorBoundary, { resetKey: 'second' }, h(Counter))))
  assert.equal(document.querySelector('button').textContent, 'Count 1')
})
test('invalid JSON response is handled as an API error', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new Error('invalid JSON') } })
  await assert.rejects(api.apiRequest('/plots'), /dữ liệu hợp lệ/)
})
test('toast displays success and failure text', async () => {
  await render(h(ToastProvider, null, h('p', null, 'QA')))
  await act(() => { notify('Đã cập nhật QA'); notify('Không thể cập nhật QA', 'error') })
  assert.match(document.querySelector('.toast-success').textContent, /Đã cập nhật QA/)
  assert.match(document.querySelector('.toast-error').textContent, /Không thể cập nhật QA/)
})

test('support success does not become an error after the async form submission', async () => {
  auth('khach_hang')
  let posts = 0, postedImages
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname.replace('/api', '')
    let data = []
    if (path === '/rentals/user/123') data = [{ ma_hop_dong: 42, so_hieu_o: 'QA-42', ten_o_dat: 'QA', trang_thai_hop_dong: 'hieu_luc', trang_thai_canh_tac: 'dang_canh_tac', trang_thai_phan_cong: 'da_chap_nhan' }]
    if (path === '/services/types') data = [{ ma_loai_dich_vu: 1, ten_dich_vu: 'Tưới nước' }]
    if (path === '/upload/support') return { ok: true, json: async () => ({ success: true, data: { url: '/uploads/qa-image.png' } }) }
    if (path === '/services' && options.method === 'POST') { posts++; postedImages = JSON.parse(options.body).hinh_anh_dinh_kem }
    return { ok: true, json: async () => ({ success: true, data }) }
  }
  await render(h(MemoryRouter, { initialEntries: ['/dashboard?tab=support'] }, h(App)))
  const form = document.querySelector('.care-form')
  assert.ok(form)
  form.elements.serviceType.value = '1'
  form.elements.schedule.value = '2027-01-01'
  form.elements.note.value = 'QA support'
  const input = form.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: [new window.File(['png'], 'qa.png', { type: 'image/png' })], configurable: true })
  await act(async () => input.dispatchEvent(new window.Event('change', { bubbles: true })))
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(posts, 1)
  assert.deepEqual(postedImages, ['/uploads/qa-image.png'])
  assert.match(document.body.textContent, /Yêu cầu đã được gửi thành công/)
  assert.equal(document.querySelector('.dashboard-error'), null)
  assert.equal(document.querySelectorAll('.toast-success').length, 1)
})

function PickerHarness() {
  const [value, onChange] = useState([])
  const [busy, onBusyChange] = useState(false)
  return h('form', null, h(RequestImagePicker, { value, onChange, onBusyChange, token: 'qa-token' }), h('button', { type: 'submit', disabled: busy }, 'Submit QA'))
}
async function selectFiles(files) {
  const input = document.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  await act(async () => input.dispatchEvent(new window.Event('change', { bubbles: true })))
}
test('image picker rejects invalid type, size and count before uploading', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected upload') }
  await render(h(PickerHarness))
  await selectFiles([new window.File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' })])
  assert.match(document.querySelector('[role="alert"]').textContent, /Chỉ chấp nhận ảnh/)
  await selectFiles([new window.File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })])
  assert.match(document.querySelector('[role="alert"]').textContent, /5 MB/)
  await selectFiles(Array.from({ length: 4 }, () => new window.File(['png'], 'qa.png', { type: 'image/png' })))
  assert.match(document.querySelector('[role="alert"]').textContent, /tối đa 3 ảnh/)
  assert.equal(calls, 0)
})
test('upload failure is visible and re-enables the submit button', async () => {
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ message: 'QA upload rejected' }) })
  await render(h(PickerHarness))
  await selectFiles([new window.File(['png'], 'qa.png', { type: 'image/png' })])
  assert.match(document.querySelector('[role="alert"]').textContent, /QA upload rejected/)
  assert.equal(document.querySelector('button[type="submit"]').disabled, false)
  assert.equal(document.querySelector('.request-image-button'), null)
})
test('upload pending blocks submission; a successful photo can be previewed and removed', async () => {
  let finish
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve })
  await render(h(PickerHarness))
  const input = document.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: [new window.File(['png'], 'qa.png', { type: 'image/png' })], configurable: true })
  await act(() => input.dispatchEvent(new window.Event('change', { bubbles: true })))
  assert.equal(document.querySelector('button[type="submit"]').disabled, true)
  await act(async () => finish({ ok: true, json: async () => ({ data: { url: '/uploads/qa.png' } }) }))
  assert.equal(document.querySelector('button[type="submit"]').disabled, false)
  await act(() => document.querySelector('.request-image-button').click())
  assert.ok(document.querySelector('.image-lightbox'))
  await act(() => document.querySelector('.image-lightbox-close').click())
  await act(() => document.querySelector('.request-image-picker .text-button').click())
  assert.equal(document.querySelector('.request-image-button'), null)
})
test('attachment gallery tolerates legacy requests without valid attachment JSON', async () => {
  await render(h(RequestImages, { images: '{invalid' }))
  assert.equal(document.querySelector('.request-images'), null)
})

test('leaving the picker during upload clears the parent busy state', async () => {
  let finish
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve })
  function Workspace() {
    const [show, setShow] = useState(true)
    const [busy, setBusy] = useState(false)
    const [value, setValue] = useState([])
    return h('div', null,
      h('button', { id: 'leave-picker', onClick: () => setShow(false) }, 'Leave'),
      show && h(RequestImagePicker, { value, onChange: setValue, onBusyChange: setBusy, token: 'qa' }),
      h('button', { id: 'parent-submit', disabled: busy }, 'Submit'))
  }
  await render(h(Workspace))
  const input = document.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: [new window.File(['png'], 'qa.png', { type: 'image/png' })], configurable: true })
  await act(() => input.dispatchEvent(new window.Event('change', { bubbles: true })))
  assert.equal(document.querySelector('#parent-submit').disabled, true)
  await act(() => document.querySelector('#leave-picker').click())
  assert.equal(document.querySelector('#parent-submit').disabled, false)
  await act(async () => finish({ ok: true, json: async () => ({ data: { url: '/uploads/qa.png' } }) }))
  assert.equal(document.querySelector('.request-image-button'), null)
})

test('plot search matches displayed plot codes and trims surrounding spaces', async () => {
  auth('khach_hang')
  globalThis.fetch = async (url) => ({ ok: true, json: async () => ({ success: true,
    data: new URL(url).pathname.endsWith('/plots/available-plots')
      ? [{ ma_o_dat: 42, so_hieu_o: 'B-05', ten_o_dat: 'QA plot', gia_thue_thang: 100000, trang_thai: 'trong' }] : [],
  }) })
  await render(h(MemoryRouter, { initialEntries: ['/dashboard?tab=find'] }, h(App)))
  const input = document.querySelector('input[placeholder="Tìm theo mã, vị trí..."]')
  assert.ok(input)
  await act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '  b-05  ')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(document.querySelectorAll('.user-plot-card').length, 1)
  assert.match(document.querySelector('.user-plot-card').textContent, /B-05/)
})

test('accepting a farmer assignment refreshes the assigned plots without reloading the page', async () => {
  auth('nong_dan')
  let accepted = false
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname.replace('/api', '')
    if (path === '/rentals/assignments/7/respond' && options.method === 'PATCH') accepted = true
    let data = []
    if (path === '/rentals/assignments/mine') data = [{ ma_phan_cong: 7, ma_hop_dong: 42, so_hieu_o: 'QA-NEW', ten_khach_hang: 'QA', trang_thai: accepted ? 'da_chap_nhan' : 'cho_tiep_nhan' }]
    if (path === '/rentals/active' && accepted) data = [{ ma_hop_dong: 42, so_hieu_o: 'QA-NEW', ten_khach_hang: 'QA', dien_tich_m2: 24, trang_thai_canh_tac: 'cho_gieo_trong', trang_thai_giao_nhan: 'da_ban_giao_van_chuyen' }]
    if (path === '/weather/current') data = null
    return { ok: true, json: async () => ({ success: true, data }) }
  }
  await render(h(MemoryRouter, { initialEntries: ['/farmer'] }, h(App)))
  assert.equal(document.querySelectorAll('.farmer-plot-card').length, 0)
  const accept = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Chấp nhận phân công')
  assert.ok(accept)
  await act(async () => { accept.click(); await new Promise((resolve) => setTimeout(resolve, 20)) })
  assert.ok(accepted)
  assert.equal(document.querySelectorAll('.farmer-plot-card').length, 1)
  assert.match(document.querySelector('.farmer-plot-card').textContent, /QA-NEW/)
})
