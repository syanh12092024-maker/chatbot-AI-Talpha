// MÀN «RỦI RO HOÀN HÀNG» (G2-G7) — *«Bốn tầng chính sách thay vì một ngưỡng cứng»*.
//
// Hai chỗ dễ sai nhất, và bài test dồn vào đúng đó:
//   ① Mã trạng thái hoàn chép tay từ v1 — lệch một mã là lệch cả bảng phân bố.
//   ② Tỉ lệ hoàn tính trên MỘT đơn là nhiễu. Đo 28/08: 4.436 khách «hoàn 100%», trong đó
//      4.139 chỉ có đúng một đơn. Một danh sách xếp theo tỉ lệ sẽ đề nghị chặn cả 4.139.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const rr = await import('../../src/ui/rui-ro-hoan/kho-rui-ro.js');

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NGUON_V1 = path.join(GOC, 'src/pancake-orders.js');

/* ═══════════ ① MÃ HOÀN PHẢI KHỚP v1, TỪNG MÃ MỘT ═══════════ */

test('①a · `MA_HOAN` khớp đúng `CANCEL` của `src/pancake-orders.js`', () => {
  const src = readFileSync(NGUON_V1, 'utf8');
  const m = src.match(/const\s+CANCEL\s*=\s*new\s+Set\(\[([^\]]*)\]\)/);
  assert.ok(m, '`src/pancake-orders.js` không còn `const CANCEL = new Set([...])` — v1 đổi hình');
  const cua_v1 = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual([...rr.MA_HOAN].sort(), cua_v1,
    `màn chép: ${[...rr.MA_HOAN].sort()} · v1 có: ${cua_v1}. Lệch một mã là lệch cả bảng phân bố.`);
});

test('①b · phép bóc có bắt được thật không', () => {
  const gia = "const CANCEL = new Set(['4', '5']); // x";
  const m = gia.match(/const\s+CANCEL\s*=\s*new\s+Set\(\[([^\]]*)\]\)/);
  assert.deepEqual([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), ['4', '5']);
});

/* ═══════════ dựng kho ═══════════ */

const don = (khachId, trangThai) => ({
  id: 'd' + Math.random().toString(36).slice(2, 9), team_id: 't1',
  khach_id: khachId, trang_thai_pos: trangThai, nguon: 'messenger',
});
const hoan = (k) => don(k, '5');
const ket = (k) => don(k, '16');

function dung(donHang) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    don_hang: donHang,
  });
  rr.datTaoTruyVan(taoTruyVan);
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});
const nhom = (d, ma) => d.lanRanh.find((x) => x.ma === ma);

/* ═══════════ ② TỈ LỆ LUÔN KÈM SỐ ĐƠN ═══════════ */

test('②a · khách 1 đơn hoàn KHÔNG được coi là «đủ tin»', async () => {
  dung([hoan('k1')]);
  const d = await rr.manRuiRo(bc());
  const cao = nhom(d, 'cao');
  assert.equal(cao.soKhach, 1, 'vẫn phải đếm — người này có thật');
  assert.equal(cao.soKhachDuTin, 0, 'một đơn không đủ để kết luận gì về người ta');
  assert.equal(cao.soKhachMotDon, 1);
});

test('②b · cảnh báo một-đơn nêu ĐÚNG ba con số', async () => {
  // 3 khách hoàn 100%: hai người 1 đơn, một người 3 đơn.
  dung([
    hoan('a'),
    hoan('b'),
    hoan('c'), hoan('c'), hoan('c'),
  ]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.canhBaoMotDon.soHoanHet, 3);
  assert.equal(d.canhBaoMotDon.soMotDon, 2);
  assert.equal(d.canhBaoMotDon.soDuTin, 1, 'chỉ người có đủ đơn mới đáng gọi là rủi ro');
  assert.match(d.canhBaoMotDon.viSao, /một dữ kiện duy nhất/i);
});

test('②c · ma trận tách được cùng-tỉ-lệ-khác-số-đơn', async () => {
  dung([hoan('a'), hoan('b'), hoan('c'), hoan('c'), hoan('c'), hoan('c')]);
  const d = await rr.manRuiRo(bc());
  const cao = d.theoSoDon.find((x) => x.ma === 'cao');
  assert.equal(cao.o.find((o) => o.ma === 'd1').so, 2, 'hai người một đơn');
  assert.equal(cao.o.find((o) => o.ma === 'd35').so, 1, 'một người bốn đơn');
});

/* ═══════════ ③ PHÂN NHÓM ĐÚNG LẰN RANH ═══════════ */

test('③ · xếp đúng bốn lằn ranh', async () => {
  dung([
    ket('sach'), ket('sach'),                                  // 0%
    hoan('thap'), ket('thap'), ket('thap'), ket('thap'), ket('thap'),  // 20%
    hoan('vua'), hoan('vua'), ket('vua'), ket('vua'),          // 50%
    hoan('cao'), hoan('cao'), hoan('cao'), ket('cao'),         // 75%
  ]);
  const d = await rr.manRuiRo(bc());
  assert.equal(nhom(d, 'sach').soKhach, 1);
  assert.equal(nhom(d, 'thap').soKhach, 1);
  assert.equal(nhom(d, 'vua').soKhach, 1);
  assert.equal(nhom(d, 'cao').soKhach, 1);
  // Ai cũng có >= 3 đơn nên đều đủ tin, trừ nhóm sạch (2 đơn).
  assert.equal(nhom(d, 'vua').soKhachDuTin, 1);
});

/* ═══════════ ④ KHÔNG TỰ CHỐT HỘ CHÍNH SÁCH ═══════════ */

test('④a · màn khai chính sách CHƯA CHỐT và chưa xếp tầng cho ai', async () => {
  dung([hoan('a')]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.chinhSach.daChot, false, '`01-QUYET-DINH §11` xếp bốn tầng vào bảng CHỜ CHỐT');
  assert.match(d.chinhSach.cot, /tang_hoan/, 'phải nói rõ cột xếp tầng chưa gán cho ai');
});

test('④b · KHÔNG có trường nào bảo «chặn khách này»', async () => {
  dung([hoan('a'), hoan('a'), hoan('a')]);
  const d = await rr.manRuiRo(bc());
  const van = JSON.stringify(d);
  assert.ok(!/"chan"|"nenChan"|"khoa"|"cam"/i.test(van),
    'màn ĐO phân bố, không ra lệnh — chốt chính sách là việc của chủ dự án');
});

/* ═══════════ ⑤ SO VỚI TÀI LIỆU ═══════════ */

test('⑤ · nêu cả con số tài liệu lẫn con số đo được, và VÌ SAO khác', async () => {
  dung([hoan('vua'), ket('vua')]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.soLieu.taiLieuNoi, 144);
  assert.equal(typeof d.soLieu.doDuoc, 'number');
  assert.match(d.soLieu.viSaoKhac, /4,2%/, 'phải nói tài liệu đo trên bao nhiêu phần dân số');
});

/* ═══════════ ⑥ ĐƠN KHÔNG QUY ĐƯỢC / TEAM / TRẦN ═══════════ */

test('⑥a · đơn không có `khach_id` được đếm riêng, không bỏ im', async () => {
  dung([hoan('a'), { id: 'x', team_id: 't1', khach_id: null, trang_thai_pos: '5' }]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.dem.soDonKhongQuyDuoc, 1);
  assert.equal(d.dem.soKhachCoDon, 1);
});

test('⑥b · chỉ đọc đơn của TEAM MÌNH', async () => {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    don_hang: [
      { id: 'd1', team_id: 't1', khach_id: 'k1', trang_thai_pos: '5' },
      { id: 'd2', team_id: 't2', khach_id: 'kx', trang_thai_pos: '5' },
    ],
  });
  rr.datTaoTruyVan(taoTruyVan);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.dem.soDonDoc, 1, 'đơn của team khác lọt vào phép đếm');
});

test('⑥c · SALE không vào được — §9 nói sale vào thẳng bảng điều phối', () => {
  assert.ok(!rr.VAI_VAO_DUOC.includes(VAI.SALE));
});

test('⑥d · team chưa có đơn → nói rõ, không hiện bảng rỗng câm', async () => {
  dung([]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.dem.soKhachCoDon, 0);
  assert.ok(d.trong, 'rỗng thì phải nói vì sao');
  assert.match(d.trong.diTiep, /theo KHÁCH|nối được đơn/i);
});
