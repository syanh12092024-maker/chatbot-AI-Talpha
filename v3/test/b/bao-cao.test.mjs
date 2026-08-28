// MÀN «BÁO CÁO» (G2-G1) — *«Tách hai luồng đơn, đo bằng HAI THƯỚC khác nhau»*.
//
// Nguyên tắc của màn: KHÔNG cộng những thứ đo bằng thước khác nhau. Và nó phải áp HAI LẦN:
// giữa hai luồng đơn, VÀ giữa ba con số của riêng luồng Messenger (269 / 907 / 893) — ba
// con số lệch nhau hơn ba lần mà cả ba đều đúng, vì chúng trả lời ba câu khác nhau.
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
const bcao = await import('../../src/ui/bao-cao/kho-bao-cao.js');

const TRANG = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../src/ui/bao-cao/trang/bao-cao.html');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: 'lan' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC', marketer: '' },
];

const donCo = (pages, o = {}) => async () => ({
  bat: true, thieu: false, soPageQuetLoi: 0, quetLuc: '2026-08-26T10:00:00.000Z', page: pages, ...o,
});
const p = (pageId, o = {}) => ({ pageId, hoiThoaiCoDon: 8, posQuyChoAi: 9, soCu: false, ...o });

function dung({ don, chiPhi } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: PAGE,
  });
  bcao.datTaoTruyVan(taoTruyVan);
  bcao.datDocDon(don === undefined ? donCo([p('111')]) : don);
  bcao.datDocChiPhi(chiPhi === undefined ? null : chiPhi);
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});

/* ═══════════ ① BA THƯỚC, BA NHÃN, KHÔNG CỘNG ═══════════ */

test('①a · ba thước đều khai đo GÌ và trong BAO LÂU', () => {
  const ds = Object.values(bcao.THUOC);
  assert.equal(ds.length, 3);
  for (const t of ds) {
    assert.ok(t.doGi && t.doGi.length > 30, `${t.ma}: không nói rõ đo gì`);
    assert.ok(t.khoang, `${t.ma}: không nói khoảng thời gian — 269 là toàn thời gian còn 907 là 60 ngày`);
    assert.ok(t.nguon, `${t.ma}: không nói lấy ở đâu`);
  }
  // Hai thước POS cùng 60 ngày, thước bot là toàn thời gian — khác nhau, phải khai khác nhau.
  assert.notEqual(bcao.THUOC.BOT_TU_TAO.khoang, bcao.THUOC.POS_QUY_CHO_AI.khoang);
});

test('①b · ba con số đi ra RỜI NHAU, không có trường tổng nào', async () => {
  dung({ don: donCo([p('111', { posQuyChoAi: 9, hoiThoaiCoDon: 8 })]),
    chiPhi: async () => ({ page: [{ pageId: '111', soDon: 3 }] }) });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger.posQuyChoAi, 9);
  assert.equal(d.messenger.hoiThoaiCoDon, 8);
  assert.equal(d.messenger.botTuTao, 3);
  // Cộng ba số này ra 20, và 20 không phải là gì cả.
  const khoa = Object.keys(d.messenger);
  assert.ok(!khoa.some((k) => /^tong/i.test(k)), `có trường tổng: ${khoa.filter((k) => /^tong/i.test(k))}`);
  assert.ok(d.viSaoKhongCong.length > 100, 'phải nói VÌ SAO không cộng, không chỉ im lặng bỏ qua');
  assert.match(d.viSaoKhongCong, /ba con số/i, 'phải nói cả chỗ ba con số Messenger, không chỉ hai luồng');
});

test('①c · TRANG xếp ba thước theo chiều DỌC — xếp ngang là mời người ta cộng', () => {
  const html = readFileSync(TRANG, 'utf8');
  // `.thuoc` phải là grid một cột. Có `grid-template-columns` với nhiều cột là xếp ngang.
  const m = html.match(/\.thuoc\s*\{([^}]*)\}/);
  assert.ok(m, 'không tìm thấy khối .thuoc');
  assert.ok(!/grid-template-columns/.test(m[1]),
    'ba thước xếp thành cột ngang cạnh nhau trông y như ba phần của một tổng');
});

/* ═══════════ ② LUỒNG TRANG BÁN HÀNG: CHƯA CÓ NGUỒN ═══════════ */

test('②a · luồng trang bán hàng khai CHƯA CÓ NGUỒN, số là `null` chứ không phải 0', async () => {
  dung();
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.trangBanHang.coNguon, false);
  assert.equal(d.trangBanHang.soDon, null, '0 nghĩa là «bán không được đơn nào» — đó là kết luận sai');
  assert.match(d.trangBanHang.diTiep, /chưa biết/i);
});

test('②b · KHÔNG lấy số Messenger lấp vào luồng kia', async () => {
  dung({ don: donCo([p('111', { posQuyChoAi: 42 })]) });
  const d = await bcao.manBaoCao(bc());
  assert.notEqual(d.trangBanHang.soDon, 42);
  assert.equal(d.trangBanHang.soDon, null);
});

/* ═══════════ ③ SỐ THIẾU / SỐ CŨ PHẢI NÓI RA ═══════════ */

test('③a · có page quét POS lỗi → khai tổng là CẬN DƯỚI', async () => {
  dung({ don: donCo([p('111')], { thieu: true, soPageQuetLoi: 4 }) });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger.thieu.co, true);
  assert.match(d.messenger.thieu.noi, /CẬN DƯỚI/i, 'một tổng thiếu trông y hệt một tổng đúng');
});

test('③b · page đang hiện số của lần quét trước → nói ra', async () => {
  dung({ don: donCo([p('111', { soCu: true })]) });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger.soCu.so, 1);
  assert.match(d.messenger.soCu.noi, /LẦN QUÉT TRƯỚC/i, 'một con số cũ trông y hệt một con số mới');
});

/* ═══════════ ④ TEAM ═══════════ */

test('④ · cầu trả TOÀN HỆ, màn chỉ cộng page của team mình', async () => {
  dung({ don: donCo([p('111', { posQuyChoAi: 9 }), p('999', { posQuyChoAi: 900 })]) });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger.posQuyChoAi, 9, 'cộng nhầm đơn của team khác');
  assert.equal(d.messenger.page.length, 1);
  assert.ok(!JSON.stringify(d.messenger.page).includes('999'));
});

/* ═══════════ ⑤ CẦU HỎNG ≠ 0 ĐƠN ═══════════ */

test('⑤a · cầu hỏng thì NÉM, không hiện 0 đơn', async () => {
  dung({ don: async () => { throw new Error('bot không chạy'); } });
  await assert.rejects(() => bcao.manBaoCao(bc()), (e) => {
    assert.equal(e.ma, 'cau_hong');
    assert.match(e.message, /0 đơn/, 'phải nói RÕ vì sao không hiện 0');
    return true;
  });
});

test('⑤b · chưa nối cầu → nói rõ `don_hang` của v3 KHÔNG thay được', async () => {
  dung({ don: null });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger, null);
  assert.match(d.trong.diTiep, /don_hang.*KHÔNG dùng thay được|0 dòng/);
});

test('⑤c · gói chi phí hỏng → `botTuTao` là null, hai thước kia vẫn hiện', async () => {
  dung({ don: donCo([p('111')]), chiPhi: async () => { throw new Error('sập'); } });
  const d = await bcao.manBaoCao(bc());
  assert.equal(d.messenger.botTuTao, null, '0 ở đây là một kết luận, và ta chưa có quyền kết luận');
  assert.equal(d.messenger.posQuyChoAi, 9, 'một thước hỏng không được làm mất hai thước kia');
});
