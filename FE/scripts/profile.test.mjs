import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement, act } = await import('react')
const { createRoot } = await import('react-dom/client')
let server, ProfilePanel, root
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' })
  ProfilePanel = (await server.ssrLoadModule('/src/components/ProfilePanel.jsx')).default
})
after(async () => { await server?.close(); dom.window.close() })

async function mount(role, callbacks = {}) {
  if (root) await act(() => root.unmount())
  root = createRoot(document.getElementById('root'))
  await act(() => root.render(createElement(ProfilePanel, {
    user: { id: 123, name: 'QA User', email: 'qa@example.invalid', role },
    onSave: async () => {}, onChangePassword: async () => {}, ...callbacks,
  })))
}
async function input(element, value) {
  assert.ok(element)
  await act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value)
    element.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}
async function submit(selector) {
  await act(async () => document.querySelector(selector).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
}
for (const role of ['khach_hang', 'nong_dan', 'quan_tri']) {
  test(`${role}: mismatched confirmation never calls API`, async () => {
    let calls = 0
    await mount(role, { onChangePassword: async () => { calls++ } })
    const inputs = document.querySelectorAll('.profile-password-form input')
    for (const [index, value] of ['Old12345!', 'New12345!', 'Different123!'].entries()) {
      await input(inputs[index], value)
    }
    await submit('.profile-password-form')
    assert.equal(calls, 0)
    assert.match(document.querySelector('[role="alert"]').textContent, /chưa khớp/)
  })
  test(`${role}: server rejection stays visible without success`, async () => {
    await mount(role, { onChangePassword: async () => { throw new Error('Sai mật khẩu cũ') } })
    const inputs = document.querySelectorAll('.profile-password-form input')
    for (const [index, value] of ['Wrong123!', 'New12345!', 'New12345!'].entries()) {
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inputs[index], value)
        inputs[index].dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    }
    await submit('.profile-password-form')
    assert.match(document.querySelector('[role="alert"]').textContent, /Sai mật khẩu cũ/)
    assert.equal(document.querySelector('.profile-password-form .form-success'), null)
  })
  test(`${role}: successful change clears all password inputs`, async () => {
    let payload
    await mount(role, { onChangePassword: async (value) => { payload = value } })
    const inputs = document.querySelectorAll('.profile-password-form input')
    for (const [index, value] of ['Old12345!', 'New12345!', 'New12345!'].entries()) {
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inputs[index], value)
        inputs[index].dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    }
    await submit('.profile-password-form')
    assert.deepEqual(payload, { currentPassword: 'Old12345!', newPassword: 'New12345!' })
    assert.ok([...inputs].every((element) => element.value === ''))
    assert.match(document.querySelector('.profile-password-form .form-success').textContent, /thành công/)
  })
}
test('profile save waits for API and reports rejection', async () => {
  let rejectSave
  await mount('khach_hang', { onSave: () => new Promise((resolve, reject) => { rejectSave = reject }) })
  await submit('.profile-form')
  assert.equal(document.querySelector('.profile-form button').disabled, true)
  assert.equal(document.querySelector('.profile-form .form-success'), null)
  await act(async () => rejectSave(new Error('Email đã được sử dụng')))
  assert.match(document.querySelector('[role="alert"]').textContent, /Email đã được sử dụng/)
  assert.equal(document.querySelector('.profile-form button').disabled, false)
  assert.equal(document.querySelector('.profile-form .form-success'), null)
})
