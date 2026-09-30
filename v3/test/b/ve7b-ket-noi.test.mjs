// PHIẾU VE7b · «CÀI ĐẶT › KẾT NỐI» THEO BẢN VẼ 4 — năm phần theo thứ tự bản vẽ: Pancake (đọc tin, gửi tin) · POS (mỗi shop = một thị
// trường, kèm tiền tệ + số món SUY TỪ DANH MỤC đã kéo) · WhatsApp · HRM · Kéo dữ liệu (bốn việc một chỗ). Chỗ chưa có nguồn nói thẳng:
// cột «Không quyền» của token «chưa đo», WhatsApp «chưa nối», HRM «chưa nối vào máy chủ» — không bịa số.
// Kho chạy thật trên cổng CSDL giả; trang chạy THẬT trong vm (DOM giả dùng chung `testkit/dom-gia.js`) gọi máy chủ thật (vai-b).
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
const { boiCanhMay, taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kn = await import('../../src/ui/ket-noi/kho-ket-noi.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

// Danh mục đã kéo: mã món POS = `<shop>:<id>` (kéo danh mục) — món `kb:` nạp từ bot KHÔNG thuộc shop nào; món team khác không tính.
const HAT = () => ({
  team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
  san_pham: [
    { id: 's1', team_id: 't1', ma: '1328205216:aaa', ten: 'Kem' }, { id: 's2', team_id: 't1', ma: '1328205216:bbb', ten: 'Gel' },
    { id: 's3', team_id: 't1', ma: '1328205226:ccc', ten: 'Trà' }, { id: 's4', team_id: 't1', ma: 'kb:xyz', ten: 'Từ bot' },
    { id: 's5', team_id: 't2', ma: '1328205216:ddd', ten: 'Team khác' },
  ],
  goi_gia: [
    // một bậc giá gõ nhầm tiền đứng TRƯỚC — tiền tệ của shop là loại gặp nhiều nhất, không phải loại gặp đầu tiên
    { id: 'g0', team_id: 't1', san_pham_id: 's1', so_luong: 3, gia: 60, tien_te: 'USD' },
    { id: 'g1', team_id: 't1', san_pham_id: 's1', so_luong: 1, gia: 89, tien_te: 'SAR' },
    { id: 'g2', team_id: 't1', san_pham_id: 's2', so_luong: 1, gia: 99, tien_te: 'SAR' },
    { id: 'g3', team_id: 't1', san_pham_id: 's3', so_luong: 1, gia: 10.9, tien_te: 'KWD' },
  ],
});
const POS = [
  { id: 'k1', market: 'Saudi', shopId: '1328205216', bat: false },
  { id: 'k2', market: 'Kuwait', shopId: '1328205226', bat: true },
  { id: 'k3', market: 'Oman', shopId: '1942200986', bat: false },
];

test('K1 · mỗi shop: số món + tiền tệ SUY TỪ danh mục đã kéo (đúng shop, đúng team, bỏ món `kb:`); shop chưa kéo ⇒ 0 món, tiền tệ «không biết»', async () => {
  const { taoTruyVan } = dungCongGia(HAT());
  kn.datTaoTruyVan(taoTruyVan);
  kn.datDocKetNoiPos(async () => POS);
  const d = await kn.ketNoiPosCua(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  assert.deepEqual(d.pos.map((k) => [k.market, k.soMon, k.tienTe]), [['Saudi', 2, 'SAR'], ['Kuwait', 1, 'KWD'], ['Oman', 0, null]]);
  assert.equal(d.monViSao, null);
});

test('K2 · chưa nối cổng truy vấn ⇒ số món KHÔNG ĐO ĐƯỢC (null + lý do), không phải 0', async () => {
  kn.datTaoTruyVan(null);
  kn.datDocKetNoiPos(async () => POS);
  const d = await kn.ketNoiPosCua(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  assert.deepEqual(d.pos.map((k) => k.soMon), [null, null, null]);
  assert.match(d.monViSao, /chưa nối/);
  // đọc danh mục hỏng ⇒ số món chưa đo, bảng POS VẪN có đủ ba shop (không chết theo)
  kn.datTaoTruyVan(() => ({ chon: async () => { throw new Error('bảng san_pham không đọc được'); } }));
  const h = await kn.ketNoiPosCua(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  assert.deepEqual(h.pos.map((k) => [k.market, k.soMon]), [['Saudi', null], ['Kuwait', null], ['Oman', null]]);
  assert.match(h.monViSao, /không đọc được danh mục/);
});

async function dungThu() {
  const mk = await bam('matkhau1');
  const hat = HAT();
  Object.assign(hat, {
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }],
  });
  const { taoTruyVan } = dungCongGia(hat);
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    docKetNoiPos: async () => POS,
    khoTokenV3: { ds: async () => [{ id: 1, ten: 'Tài khoản A', hetHan: Date.parse('2026-12-01T00:00:00Z'), hetHanRoi: false, nguon: 'db', bat: true, duoi: 'abcd1234' }],
      them: async () => { throw new Error('ca này không thêm token'); }, bo: async () => { throw new Error('ca này không bỏ token'); } } });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@talpha.vn', matKhau: 'matkhau1' }) });
  return { goc, sv, cookie: dn.headers.get('set-cookie').split(';')[0] };
}
const vungCua = (m, tieu) => {
  const h = m.document.querySelectorAll('h2').find((x) => x.textContent.trim() === tieu);
  assert.ok(h, `thiếu phần «${tieu}»`);
  return h.closest('section');
};

test('K3 · năm phần ĐÚNG thứ tự bản vẽ 4: Pancake · POS · WhatsApp · HRM · Kéo dữ liệu', async (t) => {
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const TEN = ['Pancake · đọc tin, gửi tin', 'POS · mỗi shop = một thị trường', 'WhatsApp · xác nhận đơn chốt qua Ladi', 'HRM · hồ sơ nhân sự', 'Kéo dữ liệu'];
  const h2 = m.document.querySelectorAll('h2').map((x) => x.textContent.trim()).filter((x) => TEN.includes(x));
  assert.deepEqual(h2, TEN);
});

test('K4 · POS: tiền tệ + số món theo shop; shop chưa kéo danh mục nói «chưa kéo», không «0 món» trống nghĩa', async (t) => {
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const dong = m.$('#bangPos').querySelectorAll('tr').map((r) => r.textContent.replace(/\s+/g, ' ').trim());
  assert.match(dong.find((x) => x.startsWith('Saudi')), /^Saudi SAR 1328205216 Đã tắt 2 món/);
  assert.match(dong.find((x) => x.startsWith('Kuwait')), /^Kuwait KWD 1328205226 Đang bật 1 món/);
  assert.match(dong.find((x) => x.startsWith('Oman')), /^Oman — 1942200986 Đã tắt chưa kéo danh mục/);
});

test('K5 · Pancake có cột «Không quyền» = chưa đo (có lời vì sao); WhatsApp «chưa nối»; HRM «chưa nối vào máy chủ» + nguồn sẽ đọc', async (t) => {
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const bang = m.$('#bangToken');
  assert.ok(bang.querySelectorAll('th').some((th) => th.textContent.trim() === 'Không quyền'));
  assert.match(bang.textContent, /chưa đo/);
  assert.match(vungCua(m, 'Pancake · đọc tin, gửi tin').textContent, /«Không quyền»: chưa đo/);
  const wa = vungCua(m, 'WhatsApp · xác nhận đơn chốt qua Ladi').textContent.replace(/\s+/g, ' ');
  assert.match(wa, /Chưa nối/);
  assert.match(wa, /Van gửi\s*đóng \(V3_WA_GUI vắng/, 'van phải ĐỌC từ cửa gửi, in giá trị đo được');
  assert.match(wa, /Mẫu tin Meta đã duyệt\s*0 — chưa mẫu nào/);
  assert.match(wa, /Số WhatsApp nối vào Pancake\s*chưa đo — .*H1/);
  assert.match(wa, /mẫu tin[\s\S]*Meta duyệt/);
  assert.match(wa, /chỉ đơn chốt trên trang bán hàng.*đơn sale nhập tay không gửi/, 'WhatsApp phải nói đơn nào vào luồng');
  const hrm = vungCua(m, 'HRM · hồ sơ nhân sự').textContent;
  assert.match(hrm, /Chưa nối vào máy chủ/);
  assert.match(hrm, /HRM_Core\.dim_employee/);
  assert.match(hrm, /dim_person_map/);
  assert.doesNotMatch(hrm, /\b118\b|\b98,6%/, 'HRM chưa nối mà hiện số đo tay');
});

test('K6 · «Kéo dữ liệu» gom ĐỦ bốn việc một chỗ; «Quét Pancake» đi đúng cửa quét của «Tất cả page»', async (t) => {
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const keo = vungCua(m, 'Kéo dữ liệu');
  for (const id of ['#nutThemPos', '#nutKeoDanhMuc', '#nutQuetPancake', '#nutNap']) assert.ok(keo.querySelector(id), `«Kéo dữ liệu» thiếu ${id}`);
  assert.equal(m.$('#bangPos').closest('section').querySelector('#nutThemPos'), null, 'nút POS vẫn nằm ở bảng POS — hai chỗ cho một việc');
  await m.$('#nutQuetPancake').click();
  await m.cho();
  assert.ok(m.goi.some((g) => g.duong === '/api/page-bot/quet' && g.phuongThuc === 'POST'), 'Quét phải đi đúng cửa quét của «Tất cả page»');
});

test('K7 · màn: số món không đo được ⇒ ô «chưa đo» + câu vì sao hiện ra (không vẽ 0, không «chưa kéo»)', async (t) => {
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  kn.datTaoTruyVan(null);
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const dong = m.$('#bangPos').querySelectorAll('tr').map((r) => r.textContent.replace(/\s+/g, ' ').trim());
  assert.match(dong.find((x) => x.startsWith('Saudi')), /^Saudi — 1328205216 Đã tắt chưa đo/);
  assert.equal(m.$('#ghiChuMon').hidden, false);
  assert.match(m.$('#ghiChuMon').textContent, /Số món: chưa đo — chưa nối/);
});

test('K8 · WhatsApp theo VAN THẬT: van mở mà 0 mẫu duyệt ⇒ «Van mở · chưa mẫu nào duyệt», không «Chưa nối», không «đang chạy»', async (t) => {
  const cu = { V3_WA_GUI: process.env.V3_WA_GUI, PANCAKE_READONLY: process.env.PANCAKE_READONLY };
  t.after(() => { for (const [k, v] of Object.entries(cu)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
  process.env.V3_WA_GUI = '1'; process.env.PANCAKE_READONLY = '0';
  const { goc, sv, cookie } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc, cookie, duong: '/ket-noi' });
  const wa = vungCua(m, 'WhatsApp · xác nhận đơn chốt qua Ladi').textContent.replace(/\s+/g, ' ');
  assert.match(wa, /Van mở · chưa mẫu nào duyệt/);
  assert.doesNotMatch(wa, /Chưa nối/);
  assert.match(wa, /Van gửi\s*mở \(V3_WA_GUI = 1 · PANCAKE_READONLY = 0\)/);
  // đếm mẫu: chỉ mẫu `da_duyet === true` (deny-by-default như `mauDaDuyet`)
  assert.equal(kn.trangThaiWhatsApp({ a: { da_duyet: true }, b: { da_duyet: false }, c: {} }).soMauDaDuyet, 1);
  assert.equal(kn.trangThaiWhatsApp().soNoiPancake, null);
});
