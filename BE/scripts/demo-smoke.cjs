// Explicit opt-in: creates disposable QA fixtures in the configured local database.
// Never uses or changes the existing demo accounts or plots.
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../src/config/db');

if (!process.argv.includes('--with-db')) {
  console.error('Usage: node scripts/demo-smoke.cjs --with-db [--password-only]');
  process.exit(1);
}
const base = 'http://127.0.0.1:5000/api';
const tag = `QA${Date.now()}`;
const password = 'PlotFarm-QA-123!';
const nextPassword = 'PlotFarm-QA-456!';
const users = [];
const plots = [];
let pool;
let checks = 0;
async function api(route, user, body, method = body === undefined ? 'GET' : 'POST', expected = 200) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user.token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
async function createUser(role) {
  const email = `${tag}-${role}@example.invalid`;
  const row = await pool.request().input('email', sql.VarChar(150), email)
    .input('name', sql.NVarChar(100), `${tag} ${role}`)
    .input('hash', sql.VarChar(100), await bcrypt.hash(password, 10))
    .input('role', sql.VarChar(20), role)
    .query(`INSERT INTO NguoiDung (ho_va_ten, email, mat_khau, vai_tro)
      OUTPUT INSERTED.ma_nguoi_dung VALUES (@name, @email, @hash, @role)`);
  const user = { id: row.recordset[0].ma_nguoi_dung, email, role };
  users.push(user);
  const login = await api('/auth/login', null, { email, password });
  Object.assign(user, login.data);
  assert.equal(user.user.role, role);
  return user;
}
async function passwordChecks(user) {
  await api('/auth/change-password', user, { currentPassword: 'wrong-password', newPassword: nextPassword }, 'PATCH', 400);
  await api('/auth/change-password', user, { currentPassword: password, newPassword: password }, 'PATCH', 400);
  await api('/auth/change-password', user, { currentPassword: password, newPassword: '123' }, 'PATCH', 400);
  await api('/auth/change-password', user, { currentPassword: password, newPassword: nextPassword }, 'PATCH');
  await api('/auth/login', null, { email: user.email, password }, 'POST', 401);
  const login = await api('/auth/login', null, { email: user.email, password: nextPassword });
  user.token = login.data.token;
  const stored = await pool.request().input('id', sql.Int, user.id)
    .query('SELECT mat_khau FROM NguoiDung WHERE ma_nguoi_dung = @id');
  assert.ok(stored.recordset[0].mat_khau.startsWith('$2'));
  assert.ok(await bcrypt.compare(nextPassword, stored.recordset[0].mat_khau));
  console.log(`PASS password: ${user.role} (wrong old, same, short, correct, old login rejected, new login accepted, bcrypt)`);
}
async function createPlot(suffix) {
  const row = await pool.request().input('code', sql.VarChar(20), `${tag}${suffix}`)
    .input('name', sql.NVarChar(100), `${tag} disposable plot`)
    .query(`INSERT INTO ODat (ma_nong_trai, so_hieu_o, ten_o_dat, gia_thue_thang)
      OUTPUT INSERTED.ma_o_dat
      SELECT TOP 1 ma_nong_trai, @code, @name, 100000 FROM NongTrai ORDER BY ma_nong_trai`);
  assert.ok(row.recordset[0], 'A farm is required for smoke fixtures');
  const id = row.recordset[0].ma_o_dat;
  plots.push(id);
  return id;
}
async function flowChecks(customer, farmer, admin) {
  await api('/admin/dashboard', customer, undefined, 'GET', 403);
  await api('/admin/dashboard', farmer, undefined, 'GET', 403);
  await api('/rentals/active', customer, undefined, 'GET', 403);
  await api('/admin/dashboard', null, undefined, 'GET', 401);
  await api('/admin/dashboard', admin);
  const crop = (await api('/crops')).data[0];
  assert.ok(crop);
  const plot = await createPlot('A');
  const created = await api('/rentals', customer, {
    so_hop_dong: `${tag}-MAIN`, ma_o_dat: plot, ma_cay_trong: crop.ma_cay_trong, thoi_han_thang: 12,
  }, 'POST', 201);
  const id = created.data.ma_hop_dong;
  assert.ok(created.data.payment_info.qr_code_url.includes('img.vietqr.io'));
  await api(`/rentals/${id}/payment-info`, customer);
  await api(`/rentals/${id}/confirm-payment`, customer, {});
  await api('/admin/assignments', admin, { ma_hop_dong: id, ma_nong_dan: farmer.id, ghi_chu: tag }, 'POST', 201);
  const assignments = await api('/rentals/assignments/mine', farmer);
  const assignment = assignments.data.find((item) => item.ma_hop_dong === id);
  assert.ok(assignment);
  await api(`/rentals/assignments/${assignment.ma_phan_cong}/respond`, farmer, { status: 'da_chap_nhan' }, 'PATCH');
  await api('/journals', farmer, { ma_hop_dong: id, tieu_de: tag, noi_dung: 'Disposable QA journal' }, 'POST', 201);
  assert.ok((await api(`/journals/rental/${id}`, customer)).data.length > 0);
  await api(`/rentals/${id}/harvest-ready`, farmer, {}, 'PATCH');
  await api(`/rentals/${id}/harvest-delivery`, customer, {
    hinh_thuc_nhan: 'giao_tan_noi', ten_nguoi_nhan: tag, so_dien_thoai_nhan: '0900000000', dia_chi_nhan: 'QA test address',
  });
  const delivery = (await api('/rentals/harvest-deliveries/mine', farmer)).data.find((item) => item.ma_hop_dong === id);
  assert.ok(delivery);
  await api(`/rentals/harvest-deliveries/${delivery.ma_giao_nhan}/handover`, farmer, {}, 'PATCH');
  const detail = (await api(`/rentals/${id}`, customer)).data;
  assert.equal(detail.trang_thai_canh_tac, 'cho_chon_cay_moi');
  const oldEnd = detail.ngay_ket_thuc;
  const extension = await api(`/rentals/${id}/gia-han`, customer, { so_thang_gia_han: 1 });
  assert.equal((await api(`/rentals/${id}`, customer)).data.ngay_ket_thuc, oldEnd);
  await api(`/rentals/${id}/confirm-payment`, customer, { extension_payment_id: extension.data.extension_payment_id });
  assert.ok(new Date((await api(`/rentals/${id}`, customer)).data.ngay_ket_thuc) > new Date(oldEnd));
  await api(`/rentals/${id}/chon-cay-moi`, customer, { ma_cay_trong: crop.ma_cay_trong });
  assert.equal((await api(`/rentals/${id}`, customer)).data.trang_thai_canh_tac, 'cho_gieo_trong');
  console.log('PASS main flow: rental -> QR -> payment -> assignment -> journal -> harvest -> delivery -> extension payment -> new season');
  const cancelPlot = await createPlot('B');
  const canceled = await api('/rentals', customer, { so_hop_dong: `${tag}-CANCEL`, ma_o_dat: cancelPlot, thoi_han_thang: 3 }, 'POST', 201);
  await api(`/rentals/${canceled.data.ma_hop_dong}/huy`, customer, {});
  const state = await pool.request().input('id', sql.Int, cancelPlot).query('SELECT trang_thai FROM ODat WHERE ma_o_dat = @id');
  assert.equal(state.recordset[0].trang_thai, 'trong');
  // A stale confirmation must not resurrect a canceled rental or reserve its plot.
  await api(`/rentals/${canceled.data.ma_hop_dong}/confirm-payment`, customer, {}, 'POST', 409);
  console.log('PASS cancellation: plot released and stale payment rejected');
}
async function cleanup() {
  if (!pool) return;
  // The exact random tag/fixture IDs scope every cleanup statement to this run.
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const request = new sql.Request(transaction).input('tag', sql.NVarChar(100), `%${tag}%`);
    for (let index = 0; index < users.length; index++) request.input(`u${index}`, sql.Int, users[index].id);
    for (let index = 0; index < plots.length; index++) request.input(`p${index}`, sql.Int, plots[index]);
    const userIds = users.map((_, index) => `@u${index}`).join(',') || 'NULL';
    const plotIds = plots.map((_, index) => `@p${index}`).join(',') || 'NULL';
    const contracts = `SELECT ma_hop_dong FROM HopDongThue WHERE ma_o_dat IN (${plotIds})`;
    await request.query(`
      DELETE FROM ThongBao WHERE ma_nguoi_dung IN (${userIds}) OR tieu_de LIKE @tag OR noi_dung LIKE @tag;
      DELETE FROM ThanhToanGiaHan WHERE ma_hop_dong IN (${contracts});
      DELETE FROM GiaoNhanThuHoach WHERE ma_hop_dong IN (${contracts});
      DELETE FROM ThuHoach WHERE ma_hop_dong IN (${contracts});
      DELETE FROM NhatKyCanhTac WHERE ma_hop_dong IN (${contracts});
      DELETE FROM PhanCongNongDan WHERE ma_hop_dong IN (${contracts});
      DELETE FROM HopDongThue WHERE ma_o_dat IN (${plotIds});
      DELETE FROM ODat WHERE ma_o_dat IN (${plotIds});
      DELETE FROM NguoiDung WHERE ma_nguoi_dung IN (${userIds});
    `);
    await transaction.commit();
    console.log(`Cleaned disposable fixtures: ${tag}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
(async () => {
  try {
    pool = await getPool();
    const customer = await createUser('khach_hang');
    const farmer = await createUser('nong_dan');
    const admin = await createUser('quan_tri');
    for (const user of users) await passwordChecks(user);
    await api('/auth/change-password', null, { currentPassword: password, newPassword: nextPassword }, 'PATCH', 401);
    if (!process.argv.includes('--password-only')) await flowChecks(customer, farmer, admin);
    console.log(`PASS ${checks} API checks`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    try { await cleanup(); } finally { await sql.close(); }
  }
})();
