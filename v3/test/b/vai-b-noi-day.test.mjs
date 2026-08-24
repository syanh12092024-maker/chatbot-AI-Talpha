// Nối dây phần rìa — kiểm đúng hai cái bẫy mà file nối dây sinh ra để bịt.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');

async function dungThu({ ghiSoAi, canhBao } = {}) {
  const mk = await bam('matkhau1');
  const BAY = Date.now();
  const { taoTruyVan, kho } = dungCongGia({
    // Hạt giống theo LƯỢC ĐỒ THẬT (`db/migrate/001_nen.up.sql`), không theo tên B từng đoán.
    nguoi_dung: [{ id: 'u1', email: 'an@talpha.vn', mat_khau_hash: mk, ten: 'An', hoat_dong: true }],
    team: [
      { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
      { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    ],
    vai: [{ id: 'v1', ma: 'sale', ten: 'Sale' }],
    thanh_vien_team: [
      { id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' },
      { id: 'tv2', nguoi_dung_id: 'u1', team_id: 't2', vai_id: 'v1' },
    ],
    hoi_thoai: [{ id: 'ht1', team_id: 't1', page_id: 'p1', psid: 'k1' }],
    viec_can_xu_ly: [
      { id: 'w1', team_id: 't1', loai: 'hoi_thoai', hoi_thoai_id: 'ht1',
        ly_do_day: 'Khách khiếu nại', day_luc: BAY - 6e5, han_luc: BAY,
        nguoi_nhan_id: null, dong_luc: null },
    ],
  });
  const app = express();
  const bao = dungPhanB(app, {
    taoTruyVan,
    taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')),
    ghiSoAi, canhBao, express,
  });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  return { goc: `http://127.0.0.1:${sv.address().port}`, sv, kho, bao };
}

test('nối dây · thiếu cổng dữ liệu thì NÉM NGAY LÚC NỐI, không đợi lúc có khách bấm', () => {
  const app = express();
  assert.throws(() => dungPhanB(app, {}), /taoTruyVan/);
  assert.throws(() => dungPhanB(app, { taoTruyVan: () => ({}) }), /taoTruyVanHeThong/);
  assert.throws(() => dungPhanB(null, {}), TypeError);
});

test('nối dây · BẪY ①: người thuộc hai team vào được tới bảng điều phối', async (t) => {
  const { goc, sv } = await dungThu();
  t.after(() => sv.close());

  const dn = await fetch(`${goc}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'an@talpha.vn', matKhau: 'matkhau1' }),
  });
  assert.equal(dn.status, 200);
  const ck = dn.headers.get('set-cookie').split(';')[0];
  const j = await dn.json();
  assert.equal(j.canChonTeam, true, 'thuộc hai team thì phải hỏi chọn team');

  // Đây là chỗ vỡ nếu lopBoiCanh() đặt SAU router auth: /api/toi trả 401 và màn chọn
  // team bị đá ngược về đăng nhập, không một dòng lỗi nào.
  const toi = await fetch(`${goc}/api/toi`, { headers: { cookie: ck } });
  assert.equal(toi.status, 200, '/api/toi phải đọc được vé tạm');
  assert.equal((await toi.json()).dsTeam.length, 2);

  const ct = await fetch(`${goc}/api/chon-team`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie: ck },
    body: JSON.stringify({ teamId: 't1' }),
  });
  assert.equal(ct.status, 200);
  const ck2 = ct.headers.get('set-cookie').split(';')[0];

  const tk = await fetch(`${goc}/api/dieu-phoi/tom-tat`, { headers: { cookie: ck2 } });
  assert.equal(tk.status, 200, 'BẪY ②: chắn tiêm sai hình dạng thì chỗ này nổ 500');
  assert.equal((await tk.json()).hoiThoai.cho, 1);
});

test('nối dây · chặn xuyên team vẫn còn, và có ghi vào bảng nhật ký', async (t) => {
  const { goc, sv, kho } = await dungThu();
  t.after(() => sv.close());
  const dn = await fetch(`${goc}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'an@talpha.vn', matKhau: 'matkhau1' }),
  });
  const ck = dn.headers.get('set-cookie').split(';')[0];
  const ct = await fetch(`${goc}/api/chon-team`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie: ck },
    body: JSON.stringify({ teamId: 't1' }),
  });
  const ck2 = ct.headers.get('set-cookie').split(';')[0];

  const r = await fetch(`${goc}/api/dieu-phoi/hang-cho?team_id=t2`, { headers: { cookie: ck2 } });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).ma, 'chan_xuyen_team');
  // Nối dây đúng thì dòng chặn đi vào BẢNG nhat_ky, không chỉ nằm trong console.
  const dong = kho.docThang('nhat_ky').filter((n) => n.hanh_dong === 'chan_xuyen_team');
  assert.ok(dong.length >= 1, 'phải có dòng chan_xuyen_team trong bảng nhat_ky');
  assert.equal(dong[0].team_id, 't1');
});

test('nối dây · thiếu phễu Sổ AI và phễu cảnh báo thì BÁO RA, không im lặng', async (t) => {
  const { sv, bao } = await dungThu();
  t.after(() => sv.close());
  assert.ok(bao.thieu.some((x) => /ghiSoAi/.test(x)), 'phải nêu thiếu ghiSoAi');
  assert.ok(bao.thieu.some((x) => /canhBao/.test(x)), 'phải nêu thiếu canhBao');

  const { sv: sv2, bao: bao2 } = await dungThu({ ghiSoAi: () => {}, canhBao: () => {} });
  t.after(() => sv2.close());
  assert.deepEqual(bao2.thieu, [], 'nối đủ thì không còn thiếu gì');
});
