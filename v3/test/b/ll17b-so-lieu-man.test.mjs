// LL17b · SỐ LIỆU ĐỌC ĐƠN TỪ BIGQUERY — Tổng quan (ô «Đơn theo luồng», luồng trang bán hàng, phễu BUY NOW, bảng Theo page «Chốt · Hoàn»)
// và tab Khách («Hai luồng chạy song song», «Bấm BUY NOW»). Máy chủ thật (vai-b) + trang thật (vm); bộ đọc đơn POS + HRM giả theo
// hình dữ liệu đo 02/10. Chưa nối BigQuery ⇒ về số chụp; số chụp cũ hơn khoảng đo ⇒ «chưa biết», không «0 · 0».
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const HRM = { luc: 0, ghep: [], nhanVien: [
  { emp_code: 'NV1', team_code: 'PIALPHA_GCC', ho_ten: 'An', status: 'active' },
  { emp_code: 'NV2', team_code: 'PIALPHA_GCC', ho_ten: 'Bình', status: 'active' },
  { emp_code: 'NV3', team_code: 'PIALPHA_EU', ho_ten: 'Chi', status: 'active' },
] };
const D = (ngay, maNv, trangThai, soDon, luong) => ({ ngay, shop: 's1', tienTe: 'SAR', chia: 100, maNv, trangThai, soDon, cod: 0, luong });
const DON = { luc: 0, homNay: '2026-10-02', dongBo: '2026-10-02T07:30:04', tuongLai: 0, dong: [
  D('2026-10-02', 'NV1', 'GIAO_THANH_CONG', 3, 'messenger'), D('2026-09-30', 'NV1', 'DON_HOAN', 1, 'trang_ban_hang'),
  D('2026-09-26', 'NV1', 'GIAO_THANH_CONG', 2, 'trang_ban_hang'), D('2026-09-25', 'NV2', 'HUY', 4, 'messenger'),
  D('2026-09-20', 'NV1', 'GIAO_THANH_CONG', 1, 'khong_suy_duoc'),
  D('2026-10-01', 'NV3', 'GIAO_THANH_CONG', 7, 'messenger'), D('2026-10-01', null, 'GIAO_THANH_CONG', 6, 'trang_ban_hang'),
], theoPage: [
  { page: '111', trangThai: 'GIAO_THANH_CONG', soDon: 5 }, { page: '111', trangThai: 'HUY', soDon: 2 }, { page: '111', trangThai: 'DON_HOAN', soDon: 1 },
  { page: '222', trangThai: 'GIAO_THANH_CONG', soDon: 4 },
  { page: '999', trangThai: 'GIAO_THANH_CONG', soDon: 50 },   // page của team khác
  { page: null, trangThai: 'GIAO_THANH_CONG', soDon: 30 },
] };
const CHUP = async () => ({ khoang: { tu: '2026-09-25T00:00:00Z', den: null }, messenger: { soDon: 12 }, trangBanHang: { soDon: 34, soDonCoTien: 30 } });
const CHUP_CU = async () => ({ khoang: { tu: '2026-09-25T00:00:00Z', den: null }, messenger: { soDon: 0 }, trangBanHang: { soDon: 0 },
  boiCanh: { coDuLieu: false, anhChupCu: true, viSaoRong: 'dòng mới nhất của team trong bảng `don_hang` là ngày 2026-08-28 — … CHƯA BIẾT, không phải 0.' } });

async function dungThu(t, { docDonPos = async () => DON, docHaiLuong = CHUP } = {}) {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Pialpha GCC', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }],
    nguoi_dung: [{ id: 'u1', email: 'qt@x.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true, ma_nv: null }],
    thanh_vien_team: [{ id: 'a', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: 'lan' },
           { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page B', marketer: '' },
           { id: 'p3', team_id: 't1', page_id: '333', ten: 'Page C', marketer: '' }],
    don_hang: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    docHrm: async () => HRM, docDonPos, docHaiLuong,
    docPheu: async () => ({ tong: 0, theoBac: {}, theoChuSoHuu: {}, bac: [] }),
    docDonHang: async () => ({ bat: true, thieu: false, soPageQuetLoi: 0, quetLuc: null,
      page: [{ pageId: '111', hoiThoaiCoDon: 8, posQuyChoAi: 9, soCu: false }] }) });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const cookie = (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@x.vn', matKhau: 'matkhau1' }) })).headers.getSetCookie()[0].split(';')[0];
  return {
    api: async (u) => (await fetch(goc + u, { headers: { cookie } })).json(),
    tongQuan: () => moTrang('bao-cao/trang/bao-cao.html', { goc, cookie, duong: '/bao-cao' }),
    khach: () => moTrang('nguon-khach/trang/nguon-khach.html', { goc, cookie, duong: '/nguon-khach' }),
  };
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();

test('M1 · cửa: luồng của TEAM 7/30 ngày (không gộp, đơn team khác + chờ gán không vào) · theo page CHỈ page của team, 30 ngày', async (t) => {
  const o = await dungThu(t);
  const d = await o.api('/api/bao-cao/don-pos');
  assert.deepEqual([d.luong.messenger[7].don, d.luong.trang_ban_hang[7].don, d.luong.messenger[30].don, d.luong.trang_ban_hang[30].don,
    d.luong.khong_suy_duoc[30].don], [3, 3, 7, 3, 1]);
  assert.equal(d.soNgayPage, 30);
  assert.deepEqual(d.theoPage.map((p) => [p.pageId, p.ten, p.don, p.huy, p.hoan]), [['111', 'Page A', 8, 2, 1], ['222', 'Page B', 4, 0, 0]]);
});

test('M2 · Tổng quan: ô «Đơn theo luồng» + luồng trang bán hàng + bước BUY NOW đọc BigQuery (số chụp 12 · 34 thôi dùng)', async (t) => {
  const o = await dungThu(t);
  const m = await o.tongQuan();
  const so = chu(m.$('#chiSo'));
  assert.match(so, /Đơn theo luồng — không gộp\s*3 · 3\s*Messenger · trang bán hàng · 7 ngày tới 2026-10-02 · BigQuery/);
  assert.doesNotMatch(so, /12 · 34/);
  const tbh = chu(m.$('#tbh'));
  assert.match(tbh, /^3\s*Đơn từ trang bán hàng — 7 ngày\s*30 ngày: 3 đơn · giao thành công 2 · hoàn 1 · huỷ 0 · tỉ lệ giao 66,7%/);
  assert.ok(m.$('#tbh').querySelector('[data-tbh-bq]'));
  assert.match(chu(m.$('#pheuTrang')), /Bấm BUY NOW\s*3\s*7 ngày · BigQuery/);
});

test('M3 · bảng Theo page: «Chốt» = đơn − huỷ · «Hoàn» trên đơn đã kết thúc · page chỉ có đơn BigQuery thành hàng · page team khác KHÔNG', async (t) => {
  const o = await dungThu(t);
  const m = await o.tongQuan();
  const hang = m.$('#bang').querySelectorAll('tbody tr').map((r) => r.querySelectorAll('td').map(chu));
  assert.deepEqual(hang.map((h) => h[0]), ['Page A 111', 'Page B 222']);
  assert.deepEqual([hang[0][4], hang[0][6]], ['6', '16,7%'], 'Page A: 8 đơn − 2 huỷ; 1 hoàn / (5 + 1)');
  assert.deepEqual([hang[1][2], hang[1][4], hang[1][6]], ['—', '4', '0,0%'], 'Page B chỉ có đơn BigQuery: cột bot «—», Chốt 4');
  assert.match(chu(m.$('[data-chot-hoan]')), /«Chốt» = đơn 30 ngày của page \(mọi nguồn, trừ huỷ\) · «Hoàn» = hoàn ÷ đơn đã kết thúc giao — BigQuery, tới ngày 2026-10-02/);
});

test('M4 · chưa nối BigQuery + bảng đơn là ảnh chụp cũ ⇒ ô luồng «—» + «chưa biết», KHÔNG «0 · 0»; Chốt · Hoàn «chưa có nguồn»', async (t) => {
  const o = await dungThu(t, { docDonPos: null, docHaiLuong: CHUP_CU });
  const bc = await o.api('/api/bao-cao');
  assert.deepEqual([bc.haiLuong.co, bc.haiLuong.vi], [false, 'anh-chup-cu']);
  const m = await o.tongQuan();
  const so = chu(m.$('#chiSo'));
  assert.match(so, /Đơn theo luồng — không gộp\s*—\s*chưa biết — bảng đơn là ảnh chụp cũ hơn khoảng đo/);
  assert.doesNotMatch(so, /0 · 0/);
  assert.match(chu(m.$('[data-chot-hoan]')), /chưa có nguồn — chưa nối đọc đơn POS từ BigQuery/);
  assert.equal(m.$('#bang').querySelectorAll('tbody tr').length, 1, 'không BigQuery ⇒ chỉ page có số bot');
});

test('M5 · tab Khách: «Hai luồng» đọc BigQuery 30 ngày (ba luồng có «không suy được» khi có) · «Bấm BUY NOW» cùng số; chưa nối ⇒ số chụp', async (t) => {
  const o = await dungThu(t);
  const m = await o.khach();
  const l = m.$('#luong').querySelectorAll('[data-luong-bq]').map((x) => [x.dataset.luongBq, chu(x)]);
  assert.deepEqual(l.map((x) => x[0]), ['messenger', 'trang_ban_hang', 'khong_suy_duoc']);
  assert.match(l[0][1], /^7\s*Messenger.*30 ngày tới 2026-10-02 · giao thành công 3 · hoàn 0 · huỷ 4 · tỉ lệ giao 100,0%/);
  assert.match(l[1][1], /^3\s*Trang bán hàng.*giao thành công 2 · hoàn 1 · huỷ 0 · tỉ lệ giao 66,7%/);
  assert.match(chu(m.$('[data-nguon-bq]')), /BigQuery — đơn của team \(team của marketer\), không gộp hai luồng/);
  assert.match(chu(m.$('#roiTrang')), /Bấm BUY NOW\s*3\s*30 ngày · BigQuery/);
  const chua = await dungThu(t, { docDonPos: null });
  const k = await chua.khach();
  assert.equal(k.$('#luong').querySelectorAll('[data-luong-bq]').length, 0);
  assert.doesNotMatch(chu(k.$('#roiTrang')), /BigQuery/);
});
