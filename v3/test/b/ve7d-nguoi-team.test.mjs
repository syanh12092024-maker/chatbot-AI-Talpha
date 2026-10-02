// PHIẾU VE7d · «CÀI ĐẶT › NGƯỜI VÀ TEAM» THEO BẢN VẼ 4 — ba nút đầu trang (Lấy người từ HRM · Tạo người dùng · Chuyển page) ·
// ba thẻ vai («mở được» đo bằng CHÍNH hàm dựng thanh điều hướng `menuCua`) · Marketer trên POS ↔ hồ sơ HRM (chưa nối: nói
// thẳng, KHÔNG số đo tay) · bảng người (Người · Hồ sơ HRM · Vai · Phụ trách). Marketer: «phụ trách» CHƯA CÓ NGUỒN — §9 «chỉ
// thấy sản phẩm mình phụ trách» chưa làm, màn nói thẳng + đếm page có tên marketer. Câu «bot chạy bằng bộ mặc định» (sai với
// đường bot — VE7c) rời khỏi cảnh báo team và bước Model của «Bắt đầu».
// Máy chủ thật (vai-b) trên cổng CSDL giả; trang chạy THẬT trong vm (`testkit/dom-gia.js`).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';   // cầu sang tiến trình bot đóng chắc chắn — ca không gọi bot thật

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { menuCua } = await import('../../src/ui/chung/man-hinh.js');
const kt = await import('../../src/ui/team/kho-team.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const MK = 'matkhau1';
async function dungThu({ dangNhap = 'qt@talpha.vn' } = {}) {
  const mk = await bam(MK);
  const { kho, taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
      { id: 't9', slug: 'chua-phan', ten: 'Chưa phân team', la_ky_thuat: true }],
    nguoi_dung: [
      { id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ team', hoat_dong: true },
      { id: 'u2', email: 'ngoc@talpha.vn', mat_khau_hash: mk, ten: 'Ngọc', hoat_dong: true },
      { id: 'u3', email: 'linh@talpha.vn', mat_khau_hash: mk, ten: 'Linh', hoat_dong: true },
      { id: 'u4', email: 'ql@talpha.vn', mat_khau_hash: mk, ten: 'Quản lý cũ', hoat_dong: true },
      { id: 'u5', email: 'hai@talpha.vn', mat_khau_hash: mk, ten: 'Hai vai', hoat_dong: true },
    ],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' },
      { id: 'v3', ma: 'sale', ten: 'Sale' }, { id: 'v4', ma: 'quan-ly', ten: 'Quản lý' }],
    thanh_vien_team: [
      { id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' },
      { id: 'tv3', nguoi_dung_id: 'u3', team_id: 't1', vai_id: 'v3' }, { id: 'tv4', nguoi_dung_id: 'u4', team_id: 't1', vai_id: 'v4' },
      // MỘT người HAI vai (quản trị + marketer): phụ trách phải là «Tất cả», không «Tất cả · Chưa có nguồn»
      { id: 'tv5', nguoi_dung_id: 'u5', team_id: 't1', vai_id: 'v1' }, { id: 'tv6', nguoi_dung_id: 'u5', team_id: 't1', vai_id: 'v2' },
    ],
    // MỘT page có tên marketer — thẻ Marketer phải in đúng 1/3 (số đo), không đoán page nào của ai
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: 'Ngọc' },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page B', marketer: '' },
      { id: 'p3', team_id: 't1', page_id: '333', ten: 'Page C' },
    ],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    chuyenPage: async () => ({ teamCu: 't1', teamMoi: 't2', daChuyen: {}, boLai: {} }) });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: dangNhap, matKhau: MK }) });
  const cookie = dn.headers.get('set-cookie').split(';')[0];
  return { goc, sv, cookie, kho };
}
const moMan = (o) => moTrang('team/trang/cau-hinh-team.html', { goc: o.goc, cookie: o.cookie, duong: '/cau-hinh-team' });
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();
const hang = (m, id) => m.$(`tr[data-nguoi="${id}"]`).querySelectorAll('td').map(chu);

test('N1 · bố cục theo bản vẽ 4: ba nút đầu trang (HRM tắt + nói vì sao) · ba thẻ vai đúng thứ tự · KHÔNG còn hàng chỉ số và tab «Kết nối POS»', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(m.$('#nutHrm').disabled, true, 'nút HRM bấm được trong khi máy chủ chưa đọc được BigQuery');
  // LL15a · 02/10: khoá BigQuery đã có — lý do «chưa nối» giờ là máy chủ chưa khai đường tới tệp khoá (không còn «chờ H11»)
  assert.match(chu(m.$('#viSaoHrm')), /^Lấy người từ HRM: chưa nối vào máy chủ — máy chủ chưa khai V3_BQ_KHOA \(đường tới tệp khoá BigQuery\)\.$/);
  assert.equal(m.$('#nutTaoNguoi').hidden, false);
  assert.ok(m.$('#nutMoChuyen'), 'thiếu nút «Chuyển page sang team khác»');
  assert.deepEqual(m.document.querySelectorAll('[data-the-vai]').map((x) => x.dataset.theVai), ['quan-tri', 'marketer', 'sale']);
  assert.equal(m.document.querySelectorAll('[role="tab"]').length, 0, 'còn thanh tab cũ');
  assert.equal(m.$('#soDo'), null);
  assert.equal(m.$('#khoiKetNoi'), null, 'POS đã ở Cài đặt › Kết nối (VE7b) — không lặp ở đây');
  const duong = m.goi.map((g) => g.duong);
  assert.ok(!duong.some((d) => d.startsWith('/api/team/tong-quan') || d.startsWith('/api/team/ket-noi')), `màn còn gọi khối đã bỏ: ${duong}`);
});

test('N2 · «Mở được» của mỗi vai đo bằng CHÍNH `menuCua` (hàm dựng thanh điều hướng) — sale chỉ Hộp thư; quản trị có Cài đặt', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  for (const ma of ['quan-tri', 'marketer', 'sale']) {
    const cho = menuCua([ma]).map((n) => `${n.ten} (${n.man.filter((x) => !x.thuNghiem).length})`).join(' · ');
    assert.equal(chu(m.$(`[data-the-vai="${ma}"] [data-mo-duoc]`)), `Mở được: ${cho}`, `thẻ ${ma} lệch thanh điều hướng`);
  }
  // đáp án biết trước (không lấy từ code bị đo): sale KHÔNG vào Cài đặt; quản trị vào; người mỗi vai (u5 mang hai vai)
  assert.match(chu(m.$('[data-the-vai="sale"] [data-mo-duoc]')), /^Mở được: Hộp thư \(\d+\)$/);
  assert.match(chu(m.$('[data-the-vai="quan-tri"] [data-mo-duoc]')), /Cài đặt \(\d+\)/);
  for (const [ma, n] of [['quan-tri', 2], ['marketer', 2], ['sale', 1]]) assert.match(chu(m.$(`[data-the-vai="${ma}"]`)), new RegExp(`${n} người`));
});

test('N3 · phụ trách THEO SỰ THẬT: quản trị «Tất cả» · sale «Hộp thư của team» · marketer «Chưa có nguồn» + §9 chưa làm + page có tên marketer 1/3', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.match(chu(m.$('[data-the-vai="quan-tri"]')), /Phụ trách: Tất cả/);
  assert.match(chu(m.$('[data-the-vai="sale"]')), /Phụ trách: Hộp thư của team/);
  const mk = chu(m.$('[data-the-vai="marketer"]'));
  assert.match(mk, /Phụ trách: Chưa có nguồn/);
  assert.match(chu(m.$('[data-the-vai="marketer"] [data-khoang-ho]')),
    /^Chưa lọc theo người phụ trách: hệ chưa biết sản phẩm, page nào của ai — cần nối HRM \(LL15\)\. Quyết định §9 «marketer chỉ thấy sản phẩm mình phụ trách» CHƯA làm\. Page có tên marketer: 1\/3\.$/);
  assert.equal(m.$('[data-the-vai="quan-tri"] [data-khoang-ho]'), null);
  // bảng người: Người · Hồ sơ HRM · Vai · Phụ trách · Tài khoản
  assert.deepEqual(hang(m, 'u1').slice(1, 4), ['chưa nối', 'Quản trị', 'Tất cả']);
  assert.deepEqual(hang(m, 'u2').slice(1, 4), ['chưa nối', 'Marketer', 'Chưa có nguồn']);
  assert.deepEqual(hang(m, 'u3').slice(1, 4), ['chưa nối', 'Sale', 'Hộp thư của team']);
  assert.deepEqual(hang(m, 'u4').slice(1, 4), ['chưa nối', 'Quản lý', '—'], 'vai cũ không cấp mới — không bịa phụ trách');
  const u5 = hang(m, 'u5');
  assert.match(u5[2], /^Quản trị\s*Marketer$/);
  assert.deepEqual([u5[1], u5[3]], ['chưa nối', 'Tất cả'], 'quản trị phủ mọi vai khác — không «Tất cả · Chưa có nguồn»');
});

test('N4 · «Marketer trên POS ↔ hồ sơ HRM»: CHƯA NỐI nói thẳng + nguồn sẽ đọc + lối sang Kết nối — KHÔNG một số đo tay nào', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  const khung = m.$('#tieu-hrm').closest('section');
  const c = chu(khung);
  assert.match(c, /^Marketer trên POS ↔ hồ sơ HRM\s*chỉ đọc · sửa ở HRM\s*Chưa nối vào máy chủ/);
  assert.match(c, /PIALPHA_ALL_Dataset\.dim_person_map/);
  assert.match(c, /HRM_Core\.dim_employee/);
  assert.match(c, /«chờ gán team»/);
  assert.match(c, /không có ô ghép tay riêng/);
  assert.ok(khung.querySelector('a[href="/ket-noi#tieu-hrm"]'), 'thiếu lối sang Cài đặt › Kết nối › HRM');
  assert.doesNotMatch(chu(m.document.body), /\b118\b|98,6|17\/19|5\.933|6\.019|3\.557|2\.250/, 'số đo tay của bản vẽ lọt lên màn');
});

test('N5 · «Chuyển page sang team khác»: khung đóng lúc mở màn; bấm nút đầu trang ⇒ mở khung, danh sách page + team đích hiện', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.ok(!m.$('#khungChuyen').open, 'khung chuyển page (đổi chủ dữ liệu) không được mở sẵn');
  await m.$('#nutMoChuyen').click();
  assert.equal(m.$('#khungChuyen').open, true);
  assert.equal(m.document.querySelectorAll('#dsPage tr').length, 3);
  assert.deepEqual(m.$('#teamDich').querySelectorAll('option').map(chu), ['Auus'], 'team đích: team nghiệp vụ khác, không team kỹ thuật, không chính mình');
});

test('N6 · vai «Quản lý» (cũ, chỉ xem): không nút tạo người, không cấp/rút vai; gọi thẳng đường tạo ⇒ 403', async (t) => {
  const o = await dungThu({ dangNhap: 'ql@talpha.vn' });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(m.$('#nutTaoNguoi').hidden, true);
  assert.equal(m.$('#themThanhVien').hidden, true);
  assert.equal(m.document.querySelectorAll('[data-rut]').length, 0);
  assert.match(chu(m.$('#demTv')), /vai của bạn chỉ xem được/);
  const r = await fetch(`${o.goc}/api/team/nguoi-dung`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', cookie: o.cookie },
    body: JSON.stringify({ email: 'x@t.vn', ten: 'X', matKhau: 'matkhau-dai-1', maVai: 'sale' }) });
  assert.equal(r.status, 403);
});

test('N7 · «Tạo người dùng» từ nút đầu trang: tạo xong người mới hiện trong bảng với «chưa nối» + phụ trách theo vai', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  await m.$('#nutTaoNguoi').click();
  assert.equal(m.$('#hopNguoi').open, true);
  m.$('#n-email').value = 'binh@talpha.vn'; m.$('#n-ten').value = 'Bình'; m.$('#n-mk').value = 'matkhau-dai-1';
  m.$('#n-vai').value = 'sale';
  await m.$('#n-luu').click();
  await m.cho();
  assert.ok(m.goi.some((g) => g.phuongThuc === 'POST' && g.duong === '/api/team/nguoi-dung'));
  const moi = m.document.querySelectorAll('tr[data-nguoi]').find((r) => /binh@talpha\.vn/.test(chu(r)));
  assert.ok(moi, 'người mới không hiện trong bảng');
  assert.deepEqual(moi.querySelectorAll('td').map(chu).slice(1, 4), ['chưa nối', 'Sale', 'Hộp thư của team']);
  assert.match(chu(m.$('[data-the-vai="sale"]')), /2 người/);
});

test('N8 · câu «bot chạy bằng bộ mặc định» (sai với đường bot, VE7c) rời khỏi cảnh báo team và bước Model của «Bắt đầu»', async (t) => {
  const c = kt.canhBaoTuTongQuan({ soPage: 3, coMarketer: 0, botBat: 2, soDongModel: 0 });
  for (const ma of ['chua_cau_hinh_model', 'bot_bat_ma_khong_model']) {
    const x = c.find((y) => y.ma === ma);
    assert.ok(x, `mất cảnh ${ma}`);
    assert.doesNotMatch(x.chu, /bộ mặc định|model mặc định/, `${ma} còn câu sai`);
    assert.match(x.chu, /model của máy chủ \(MODEL_CLOSER\)/);
  }
  const o = await dungThu();
  t.after(() => o.sv.close());
  const d = await (await fetch(`${o.goc}/api/cai-dat-team`, { headers: { Accept: 'application/json', cookie: o.cookie } })).json();
  const b = d.buoc.find((x) => x.ma === 'model');
  assert.doesNotMatch(b.vi, /bộ mặc định/);
  assert.match(b.vi, /^Team chưa lưu cấu hình model riêng — bot mới dùng model của máy chủ \(MODEL_CLOSER\)\./);
});
