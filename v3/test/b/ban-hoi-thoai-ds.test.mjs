// UI-HT2 · danh sách hội thoại của BÀN HỘI THOẠI — đường qua CỔNG (bộ ca, bản xem thử).
// Đường SQL có LIMIT (máy chủ) đo trên Postgres sandbox ở `test/ui-ht2-sql.test.js`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import { datTaoTruyVan } from '../../src/ui/dispatch/index.js';
import { danhSachHoiThoai, datDocHoiThoaiSql, CUA_SO_NGAY } from '../../src/ui/ban-hoi-thoai/index.js';

const BAY = Date.parse('2026-09-28T10:00:00Z');
const ngay = (n) => n * 86_400_000;
const phut = (n) => n * 60_000;
const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });

const moViec = { nguoi_nhan_id: null, nhan_luc: null, ket_qua: null, ly_do_dong: null, chi_phi: null, dong_luc: null };

function dung() {
  const kho = new KhoGia({
    page: [{ id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' },
           { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Auus Store' }],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Aisha', so_dien_thoai: '96891234567' },
            { id: 'k9', team_id: 't2', ten: 'Khách team hai', so_dien_thoai: '96891234567' }],
    hoi_thoai: [
      { id: 'h_can', team_id: 't1', page_id: 'p1', psid: '11', khach_id: 'k1', trang_thai: 'HANDOFF', chu_so_huu: 'SALE', ly_do_cuoi: 'khiếu nại', cham_luc: BAY - phut(5) },
      { id: 'h_bot', team_id: 't1', page_id: 'p1', psid: '22', khach_id: null, trang_thai: 'SELLING', chu_so_huu: 'AI', ai_noi_gi: 'Giá 129 SAR', cham_luc: BAY - ngay(1) },
      { id: 'h_cu', team_id: 't1', page_id: 'p1', psid: '33', khach_id: null, trang_thai: 'GREET', chu_so_huu: 'AI', cham_luc: BAY - ngay(CUA_SO_NGAY + 3) },
      { id: 'h_t2', team_id: 't2', page_id: 'p2', psid: '44', khach_id: 'k9', trang_thai: 'GREET', chu_so_huu: 'AI', cham_luc: BAY - phut(1) },
    ],
    viec_can_xu_ly: [
      { id: 'v1', team_id: 't1', loai: 'hoi_thoai', ly_do_day: 'khieu_nai', hoi_thoai_id: 'h_can', don_hang_id: null,
        day_luc: BAY - phut(12), han_luc: BAY - phut(2), ...moViec },
      { id: 'v_don', team_id: 't1', loai: 'don_hang', ly_do_day: 'trung_don', hoi_thoai_id: null, don_hang_id: 'd1',
        day_luc: BAY - phut(3), han_luc: BAY + phut(7), ...moViec },
      { id: 'v_t2', team_id: 't2', loai: 'hoi_thoai', ly_do_day: 'doi_tra', hoi_thoai_id: 'h_t2', don_hang_id: null,
        day_luc: BAY - phut(3), han_luc: BAY + phut(7), ...moViec },
    ],
    don_hang: [{ id: 'd1', team_id: 't1', ma_pos: '77:1', tong_tien: 1 }],
  });
  datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));
  datDocHoiThoaiSql(null);
}

test('«Cần người» = hội thoại có việc mở của team, kèm đồng hồ và lý do; đơn không hội thoại được đếm riêng', async () => {
  dung();
  const d = await danhSachHoiThoai(bcT1, { loc: 'nguoi', bay: BAY });
  assert.deepEqual(d.items.map((x) => x.id), ['h_can']);
  assert.equal(d.demCanNguoi, 1);
  assert.equal(d.donKhongHoiThoai, 1, 'đơn không gắn hội thoại không lọt vào bàn — nói ra để sale sang Việc đang chờ');
  const h = d.items[0];
  assert.equal(h.tenKhach, 'Aisha');
  assert.equal(h.tenPage, 'Tiểu Alpha Store');
  assert.equal(h.viec.id, 'v1');
  assert.equal(h.viec.hanLuc, BAY - phut(2));
  assert.equal(h.viec.lyDoChu, 'Khách khiếu nại');
  assert.equal(d.nguonDs, 'viec_mo');
});

test('«Tất cả» = hội thoại chạm trong cửa sổ ngày, mới nhất trước; hội thoại cũ hơn không lọt', async () => {
  dung();
  const d = await danhSachHoiThoai(bcT1, { loc: 'tat', bay: BAY });
  assert.deepEqual(d.items.map((x) => x.id), ['h_can', 'h_bot']);
  assert.equal(d.items[0].viec.id, 'v1', 'dòng có việc mở vẫn mang đồng hồ ở lát «Tất cả»');
  assert.equal(d.nguonDs, 'cong', 'không tiêm SQL thì phải khai đang đi đường cổng');
});

test('«Bot đang xử» chỉ lấy hội thoại bot đang giữ', async () => {
  dung();
  const d = await danhSachHoiThoai(bcT1, { loc: 'bot', bay: BAY });
  assert.deepEqual(d.items.map((x) => x.id), ['h_bot']);
  assert.equal(d.items[0].aiNoiGi, 'Giá 129 SAR');
});

test('Tìm theo SĐT và psid — kể cả hội thoại ngoài cửa sổ 7 ngày; KHÔNG lọt sang team khác cùng SĐT', async () => {
  dung();
  const theoSdt = await danhSachHoiThoai(bcT1, { loc: 'tat', tim: '968 9123 4567', bay: BAY });
  assert.deepEqual(theoSdt.items.map((x) => x.id), ['h_can']);
  const theoPsid = await danhSachHoiThoai(bcT1, { loc: 'tat', tim: '33', bay: BAY });
  assert.deepEqual(theoPsid.items.map((x) => x.id), ['h_cu']);
});

test('có bộ đọc SQL thì dùng nó cho «Tất cả» và khai `nguonDs: sql`', async () => {
  dung();
  const goi = [];
  datDocHoiThoaiSql(async (_bc, bo) => { goi.push(bo); return [{ id: 'h_bot', page_id: 'p1', khach_id: null, psid: '22',
    trang_thai: 'SELLING', chu_so_huu: 'AI', cham_luc: BAY - ngay(1) }]; });
  const d = await danhSachHoiThoai(bcT1, { loc: 'bot', bay: BAY });
  assert.equal(d.nguonDs, 'sql');
  assert.equal(goi[0].chiBot, true);
  assert.equal(goi[0].tuLuc, BAY - ngay(CUA_SO_NGAY));
  datDocHoiThoaiSql(null);
});

test('lát lạ ⇒ 400, không lặng lẽ trả danh sách khác', async () => {
  dung();
  await assert.rejects(() => danhSachHoiThoai(bcT1, { loc: 'xoa', bay: BAY }), (e) => e.status === 400);
});

/* ═══ đường HTTP — trang và danh sách, sau hai cái chắn ═══ */
test('HTTP · /api/ban-hoi-thoai: 401 chưa đăng nhập · 403 marketer · 200 sale; /ban-hoi-thoai trả trang cho sale', async () => {
  const http = await import('node:http');
  const express = (await import('express')).default;
  const { taoRouterBanHoiThoai, datChanDangNhap, datChanVai } = await import('../../src/ui/ban-hoi-thoai/index.js');
  dung();
  datChanDangNhap(() => (req, res, next) => (req.boiCanh ? next() : res.status(401).json({ ok: false })));
  datChanVai((...vai) => (req, res, next) => (vai.flat().some((v) => req.boiCanh.vai.includes(v)) ? next() : res.status(403).json({ ok: false })));
  const app = express();
  app.use((req, _res, next) => {
    const vai = req.headers['x-vai'];
    if (vai) req.boiCanh = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
    next();
  });
  app.use(taoRouterBanHoiThoai({ dongHo: () => BAY }));
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  try {
    assert.equal((await fetch(goc + '/api/ban-hoi-thoai')).status, 401);
    assert.equal((await fetch(goc + '/api/ban-hoi-thoai', { headers: { 'x-vai': VAI.MARKETER } })).status, 403);
    const ok = await fetch(goc + '/api/ban-hoi-thoai?loc=nguoi', { headers: { 'x-vai': VAI.SALE } });
    assert.equal(ok.status, 200);
    const j = await ok.json();
    assert.deepEqual(j.items.map((x) => x.id), ['h_can']);
    const tr = await fetch(goc + '/ban-hoi-thoai', { headers: { 'x-vai': VAI.SALE, accept: 'text/html' } });
    assert.equal(tr.status, 200);
    const than = await tr.text();
    assert.match(than, /<h1>Bàn hội thoại<\/h1>/);
    assert.ok(!/<textarea/.test(than), '§10: bàn hội thoại KHÔNG có ô soạn tin');
    assert.ok(!/pkSendReply|\/send|gửi tin/i.test(than.replace(/<!--[\s\S]*?-->/g, '')), '§10: không đường gửi');
  } finally { await new Promise((r) => sv.close(r)); }
});
