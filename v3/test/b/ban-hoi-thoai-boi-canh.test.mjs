// UI-HT3 · cột bối cảnh + nhãn nguồn tin + tên Messenger của BÀN HỘI THOẠI (CR-28-09).
//
// Đo 28/09 trên máy chủ (nhật ký `phieu-UI-HT3.md`): trường `from` của Pancake KHÔNG tách được
// bot với sale (29/29 tin bot khớp Sổ AI chỉ mang `uid`, và 54 tin KHÔNG khớp cũng mang `uid`) ⇒
// «Bot AI» chỉ gắn khi khớp dữ liệu đối chiếu; còn lại là «Page», KHÔNG đoán là sale.
// 29.527/29.563 hội thoại chưa nối hồ sơ khách ⇒ tên Messenger từ Sổ AI bot cũ.
// Đường SQL (máy chủ) đo trên Postgres sandbox ở `test/ui-ht3-sql.test.js`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import { datTaoTruyVan } from '../../src/ui/dispatch/index.js';
import {
  docHoiThoai, datDocTinPancake, datDongHoHoiThoai, xoaNhoHoiThoai,
  taoChiMucSoAi, datChiMucSoAi, datLaTinTuDong, datDocDauVetV3,
  danhSachHoiThoai, datDocHoiThoaiSql,
  boiCanhHoiThoai, datGiaiKichBan, CHU_TRANG_THAI_DON, CHU_TRANG_THAI_POS, KHONG_GOI_MODEL,
} from '../../src/ui/ban-hoi-thoai/index.js';
import { BANG_CHUYEN, TRANG_THAI_GIEO } from '../../../src/orders/may-trang-thai.js';
import { BANG_MA } from '../../../src/pos/ma-trang-thai.js';

const BAY = Date.parse('2026-09-28T10:00:00Z');
const phut = (n) => n * 60_000;
const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

const CAU_BOT = 'Hello! Thank you for your order. How can I help you today?';
const CAU_BOT_V3 = 'The 2-pack is 159 SAR with free delivery to all of Saudi Arabia.';

function dung({ tinV3 = [], lanGui = [], soAi = [], don = [], soAiCu } = {}) {
  const kho = new KhoGia({
    page: [
      { id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' },
      { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Auus Store' },
    ],
    khach: [
      { id: 'k1', team_id: 't1', ten: 'Aisha', so_dien_thoai: '96891234567', dia_chi: 'Way 3021', thanh_pho: 'Muscat',
        ti_le_hoan: 71.4, tang_hoan: 'rui_ro_cao' },
    ],
    hoi_thoai: [
      { id: 'ht1', team_id: 't1', page_id: 'p1', psid: '9911', khach_id: 'k1', trang_thai: 'HANDOFF', chu_so_huu: 'SALE',
        ly_do_cuoi: 'khiếu nại', ai_noi_gi: 'Could you send a photo?', cham_luc: BAY - phut(5) },
      { id: 'ht3', team_id: 't1', page_id: 'p1', psid: '7733', khach_id: null, trang_thai: 'SELLING', chu_so_huu: 'AI',
        cham_luc: BAY - phut(9) },
      { id: 'ht2', team_id: 't2', page_id: 'p2', psid: '8822', khach_id: null, trang_thai: 'GREET', chu_so_huu: 'AI',
        cham_luc: BAY - phut(1) },
    ],
    tin_cho_xu_ly: tinV3,
    lan_gui: lanGui,
    so_ai: soAi,
    don_hang: [
      { id: 'dk1', team_id: 't1', khach_id: 'k1', hoi_thoai_id: null, ma_pos: '77:1', nguon: 'messenger', trang_thai_he: 'dong', tao_luc: BAY - phut(9000) },
      ...don,
    ],
    viec_can_xu_ly: [],
  });
  datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));
  datDocHoiThoaiSql(null);
  datDocDauVetV3(null);
  datGiaiKichBan(null);
  datLaTinTuDong(null);
  xoaNhoHoiThoai();
  datDongHoHoiThoai(() => BAY);
  datChiMucSoAi(taoChiMucSoAi(() => soAiCu ?? [
    { conv: '102938_7733', cust: 'cust-7733', name: 'Hessa Al Amri', type: 'reply', t: BAY - phut(30), text: CAU_BOT },
    { conv: '102938_7733', cust: 'cust-7733', name: 'Hessa Al Amri', type: 'reply', t: BAY - phut(20), text: 'ok' },
    { conv: '102938_7733', cust: 'cust-7733', name: 'Hessa Al Amri', type: 'other_bot', t: BAY - phut(10), text: 'Welcome! Choose an option' },
    { conv: '102938_9911', cust: 'cust-9911', name: 'Aisha M.' },
  ]));
  return { kho };
}

/** Pancake giả: đủ năm loại tin page cho một hội thoại. */
function pancakeNamLoai() {
  datDocTinPancake(async (pageId) => ({ ok: true, messages: [
    { id: 'm1', from: { id: 'k', name: 'Hessa' }, message: 'How much?' },
    // khớp Sổ AI bot cũ — khác hoa/thường, khoảng trắng và có thẻ HTML
    { id: 'm2', from: { id: pageId, uid: 'u9' }, message: '<p>hello!  thank you for your ORDER.</p> How can I help you today? 😊' },
    { id: 'm3', from: { id: pageId, flow_id: 'f-chao' }, message: 'Welcome! Choose an option' },
    { id: 'm4', from: { id: pageId, uid: 'u9' }, message: '[Auto] Your order has been confirmed' },
    // «ok» của sale — Sổ AI cũng có «ok» nhưng quá ngắn để gọi là tin bot
    { id: 'm5', from: { id: pageId, uid: 'u9' }, message: 'ok' },
    { id: 'm6', from: { id: pageId, uid: 'u9' }, message: 'Hi, this is Linh. I will call you now.' },
    { id: 'm7', from: { id: pageId, uid: 'u9' }, message: CAU_BOT_V3 },
    { id: 'pk-v3', from: { id: pageId, uid: 'u9' }, message: 'Tin bot v3 đã sửa chữ trên Pancake' },
  ] }));
}

/* ═══ nhãn nguồn tin ═══ */
test('nhãn nguồn: khớp Sổ AI → «ai» (bỏ HTML/hoa/khoảng trắng) · flow_id → «tu_dong» · còn lại «page» — «ok» ngắn KHÔNG thành bot', async () => {
  dung();
  pancakeNamLoai();
  const kq = await docHoiThoai(bcT1, 'ht3');
  const nguon = Object.fromEntries(kq.lichSu.map((t, i) => [`m${i + 1}`, t.nguon]));
  assert.equal(nguon.m1, 'khach');
  assert.equal(nguon.m2, 'ai', 'khớp đầu câu Sổ AI dù Pancake bọc HTML, đổi hoa/thường');
  assert.equal(nguon.m3, 'tu_dong', 'luồng Botcake mang from.flow_id');
  assert.equal(nguon.m4, 'page', 'CHƯA nối bộ nhận mẫu máy thì không đoán');
  assert.equal(nguon.m5, 'page', '«ok» — đầu câu dưới 12 ký tự không đủ để gọi là tin bot');
  assert.equal(nguon.m6, 'page', 'không khớp gì ⇒ «page», KHÔNG gọi là sale');
});

test('nhãn nguồn: bộ nhận mẫu máy (isAutomationTemplate) nối vào thì tin mẫu thành «tu_dong»', async () => {
  dung();
  pancakeNamLoai();
  datLaTinTuDong((t) => /^\[auto\]/i.test(t));
  const kq = await docHoiThoai(bcT1, 'ht3');
  assert.equal(kq.lichSu[3].nguon, 'tu_dong');
  assert.equal(kq.lichSu[5].nguon, 'page');
});

test('nhãn nguồn: lần gửi v3 — khớp provider_id CHÍNH XÁC dù chữ đã khác; khớp đầu câu; dien_tap/dang_gui KHÔNG tính', async () => {
  dung({
    tinV3: [{ id: 1, team_id: 't1', page_id: '102938', psid: '7733', cust_id: '', conv_id: '102938_7733' }],
    lanGui: [
      { id: 1, team_id: 't1', tin_id: 1, buoc: 1, loai: 'guiTin', trang_thai: 'da_gui', provider_id: 'pk-v3', noi_dung: 'một câu khác hẳn' },
      { id: 2, team_id: 't1', tin_id: 1, buoc: 2, loai: 'guiTin', trang_thai: 'khong_ro', provider_id: null, noi_dung: CAU_BOT_V3 },
      { id: 3, team_id: 't1', tin_id: 1, buoc: 3, loai: 'guiTin', trang_thai: 'dien_tap', provider_id: null, noi_dung: 'Hi, this is Linh. I will call you now.' },
      { id: 4, team_id: 't1', tin_id: 1, buoc: 4, loai: 'ghiNote', trang_thai: 'da_gui', provider_id: 'm6', noi_dung: 'ghi chú nội bộ' },
    ],
  });
  pancakeNamLoai();
  const kq = await docHoiThoai(bcT1, 'ht3');
  const theoId = (id) => kq.lichSu[['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'pk-v3'].indexOf(id)].nguon;
  assert.equal(theoId('pk-v3'), 'ai', 'provider_id của lần gửi v3');
  assert.equal(theoId('m7'), 'ai', 'đầu câu của lần gửi «khong_ro» — tin có trên Pancake nghĩa là đã tới');
  assert.equal(theoId('m6'), 'page', 'diễn tập chưa bao giờ rời hệ; ghiNote không phải tin gửi khách');
});

test('taoChiMucSoAi · MỘT lần đọc sổ cho mã khách, tên Messenger, đầu câu bot và số lượt bot cũ', () => {
  let lan = 0;
  const cm = taoChiMucSoAi(() => {
    lan++;
    return [
      { conv: '1_a', cust: 'c1', name: 'An', type: 'reply', t: 100, text: CAU_BOT },
      { conv: '1_a', cust: 'c2', name: 'An B', type: 'reply', t: 300, text: 'Second reply of the bot, long enough' },
      { conv: '1_a', type: 'handoff', t: 400 },
      { conv: '1_b', name: '  ' },
    ];
  }, { dongHo: () => 0 });
  assert.equal(cm.maKhach('1_a'), 'c2');
  assert.equal(cm.ten('1_a'), 'An B', 'dòng sau thắng');
  assert.equal(cm.ten('1_b'), null, 'tên trắng không phải tên');
  assert.equal(cm.dauCauAi('1_a').length, 2);
  assert.deepEqual(cm.luot('1_a'), { soLuot: 2, cuoiLuc: 300 }, 'chỉ đếm «reply», mốc cuối là lượt trả lời cuối');
  assert.deepEqual(cm.luot('1_x'), { soLuot: 0, cuoiLuc: null });
  assert.equal(lan, 1);
});

/* ═══ tên Messenger trong danh sách ═══ */
test('danh sách: hội thoại chưa có hồ sơ khách mang tên Messenger từ Sổ AI; có hồ sơ thì tên hồ sơ vẫn đứng riêng', async () => {
  dung();
  const d = await danhSachHoiThoai(bcT1, { loc: 'tat', bay: BAY });
  const theo = Object.fromEntries(d.items.map((x) => [x.id, x]));
  assert.equal(theo.ht3.tenKhach, null);
  assert.equal(theo.ht3.tenMessenger, 'Hessa Al Amri');
  assert.equal(theo.ht1.tenKhach, 'Aisha');
  assert.equal(theo.ht1.tenMessenger, 'Aisha M.');
});

/* ═══ cột bối cảnh ═══ */
test('bối cảnh: hồ sơ khách + rủi ro hoàn · đơn đang bàn là đơn MỚI NHẤT của hội thoại · giai đoạn/người giữ/lý do', async () => {
  dung({ don: [
    { id: 'd_cu', team_id: 't1', khach_id: 'k1', hoi_thoai_id: 'ht1', ma_pos: '77:10', nguon: 'messenger', trang_thai_he: 'dong', tao_luc: BAY - phut(600), tong_tien: '99.00' },
    { id: 'd_moi', team_id: 't1', khach_id: 'k1', hoi_thoai_id: 'ht1', ma_pos: '77:11', nguon: 'messenger', trang_thai_he: 'cho_sale',
      trang_thai_pos: '16', tao_luc: BAY - phut(60), tong_tien: '129.00', tien_te: 'SAR' },
  ] });
  const x = await boiCanhHoiThoai(bcT1, 'ht1');
  assert.equal(x.khach.co, true);
  assert.equal(x.khach.ten, 'Aisha');
  assert.equal(x.khach.diaChi, 'Way 3021 · Muscat');
  assert.deepEqual(x.khach.tangHoan, { chu: 'Hay hoàn hàng · hoàn ≥65%', muc: 'chan' });
  assert.equal(x.khach.tiLeHoan, 71.4);
  assert.equal(x.khach.soDon, 3, 'mọi đơn của khách, không chỉ đơn của hội thoại');
  assert.equal(x.donDangBan.id, 'd_moi');
  assert.equal(x.donDangBan.trangThai, 'Chờ sale xử');
  assert.equal(x.donDangBan.trangThaiPos, 'Đã thu tiền', 'mã số POS ra chữ, không hiện «16»');
  assert.equal(x.donDangBan.tongTien, 129);
  assert.equal(x.donDangBan.tienTe, 'SAR');
  assert.equal(x.giaiDoan, 'HANDOFF');
  assert.equal(x.nguoiGiu, 'SALE');
  assert.equal(x.lyDoCuoi, 'khiếu nại');
  assert.equal(x.aiNoiGi, 'Could you send a photo?');
  assert.equal(x.tenPage, 'Tiểu Alpha Store');
});

test('bối cảnh: chưa có hồ sơ khách ⇒ nói vì sao + tên Messenger; không đơn ⇒ donDangBan null; lượt bot cũ đếm từ Sổ AI', async () => {
  dung();
  const x = await boiCanhHoiThoai(bcT1, 'ht3');
  assert.equal(x.khach.co, false);
  assert.match(x.khach.viSao, /chưa nối được với hồ sơ khách/);
  assert.equal(x.tenMessenger, 'Hessa Al Amri');
  assert.equal(x.donDangBan, null);
  assert.deepEqual(x.botCu, { soLuot: 2, cuoiLuc: BAY - phut(20) });
});

test('bối cảnh: Sổ AI v3 trống ⇒ «chưa có dữ liệu» (CR mục 3, không bịa); có dòng ⇒ lượt, model gần nhất (bỏ lượt không gọi model), tiền', async () => {
  dung();
  const trong = await boiCanhHoiThoai(bcT1, 'ht3');
  assert.equal(trong.soAi.co, false);
  assert.match(trong.soAi.viSao, /Chưa có dữ liệu/);

  dung({ soAi: [
    { id: 's1', team_id: 't1', page_id: '102938', psid: '7733', loai: 'reply', ma_model: 'claude-haiku-4-5', xay_ra_luc: BAY - phut(30), tien_vnd: '300.50' },
    { id: 's2', team_id: 't1', page_id: '102938', psid: '7733', loai: 'reply', ma_model: 'claude-sonnet-5', xay_ra_luc: BAY - phut(20), tien_vnd: null },
    { id: 's3', team_id: 't1', page_id: '102938', psid: '7733', loai: 'handoff', ma_model: KHONG_GOI_MODEL, xay_ra_luc: BAY - phut(10), tien_vnd: '0' },
    { id: 's4', team_id: 't1', page_id: '102938', psid: '9911', loai: 'reply', ma_model: 'x', xay_ra_luc: BAY, tien_vnd: '9999' },
  ] });
  const s = (await boiCanhHoiThoai(bcT1, 'ht3')).soAi;
  assert.equal(s.co, true);
  assert.equal(s.soLuot, 2, 'chỉ đếm lượt trả lời');
  assert.equal(s.soDong, 3, 'dòng của khách KHÁC trên cùng page không lọt vào');
  assert.equal(s.model, 'claude-sonnet-5', 'lượt không gọi model không phải «model gần nhất»');
  assert.equal(s.cuoiLuc, BAY - phut(10));
  assert.equal(s.tienVnd, 300.5);
  assert.equal(s.soGoiModel, 2, 'lượt không gọi model không vào mẫu số của tiền');
  assert.equal(s.soDongCoTien, 1, 'lượt gọi model chưa tính tiền không đếm là 0 đồng');
});

test('bối cảnh: kịch bản đi qua BỘ GIẢI tiêm vào (team + page.id); chưa nối/ném ⇒ nói ra, không 500', async () => {
  dung();
  const goi = [];
  datGiaiKichBan(async (teamId, pageRowId) => {
    goi.push([teamId, pageRowId]);
    return { ban: { phien_ban: 4, nguoi_sua: 'ngoc', sua_luc: new Date(BAY - phut(90)) }, tuDau: 'kế thừa từ tầng NƯỚC (cả nước KSA)', viSao: null };
  });
  const x = await boiCanhHoiThoai(bcT1, 'ht3');
  assert.deepEqual(goi, [['t1', 'p1']], 'page.id (khoá bảng), không phải id Facebook');
  assert.deepEqual(x.kichBan, { co: true, phienBan: 4, tuDau: 'kế thừa từ tầng NƯỚC (cả nước KSA)', nguoiSua: 'ngoc', suaLuc: BAY - phut(90) });

  datGiaiKichBan(async () => ({ ban: null, viSao: 'page chưa khai thị trường' }));
  assert.deepEqual((await boiCanhHoiThoai(bcT1, 'ht3')).kichBan, { co: false, viSao: 'page chưa khai thị trường' });

  datGiaiKichBan(async () => { throw new Error('column "cap" does not exist'); });
  assert.match((await boiCanhHoiThoai(bcT1, 'ht3')).kichBan.viSao, /Không đọc được kịch bản: column "cap"/);

  datGiaiKichBan(null);
  assert.match((await boiCanhHoiThoai(bcT1, 'ht3')).kichBan.viSao, /chưa nối/);
});

test('bối cảnh: hội thoại team khác hoặc không có ⇒ null, và KHÔNG gọi bộ giải kịch bản', async () => {
  dung();
  let goi = 0;
  datGiaiKichBan(async () => { goi++; return { ban: null }; });
  assert.equal(await boiCanhHoiThoai(bcT1, 'ht2'), null);
  assert.equal(await boiCanhHoiThoai(bcT2, 'ht1'), null);
  assert.equal(await boiCanhHoiThoai(bcT1, ''), null);
  assert.equal(goi, 0);
});

test('nhãn trạng thái đơn phủ MỌI trạng thái của máy trạng thái đơn (bài học nhãn tầng hoàn 28/09)', () => {
  const tatCa = new Set([TRANG_THAI_GIEO]);
  for (const ds of Object.values(BANG_CHUYEN)) for (const c of ds) { tatCa.add(c.tu); tatCa.add(c.sang); }
  const thieu = [...tatCa].filter((m) => !CHU_TRANG_THAI_DON[m]);
  assert.deepEqual(thieu, [], 'trạng thái đơn thiếu nhãn ⇒ màn hiện mã thô');
  const thua = Object.keys(CHU_TRANG_THAI_DON).filter((m) => !tatCa.has(m));
  assert.deepEqual(thua, [], 'nhãn cho trạng thái không tồn tại');
});

test('nhãn trạng thái POS phủ ĐÚNG bảng mã đã xác minh (`src/pos/ma-trang-thai.js#BANG_MA`); mã lạ nói «chưa xác minh»', async () => {
  assert.deepEqual(Object.keys(CHU_TRANG_THAI_POS).sort(), Object.keys(BANG_MA).sort());
  dung({ don: [{ id: 'd17', team_id: 't1', khach_id: null, hoi_thoai_id: 'ht3', trang_thai_he: 'moi_tu_pos', trang_thai_pos: '17', tao_luc: BAY }] });
  const x = await boiCanhHoiThoai(bcT1, 'ht3');
  assert.equal(x.donDangBan.trangThaiPos, 'mã 17 · chưa xác minh', 'máy chủ có đơn mã 17 — không đoán nhãn');
  assert.equal(x.donDangBan.trangThai, 'Mới về từ POS');
});

/* ═══ HTTP ═══ */
test('HTTP · /api/ban-hoi-thoai/:id/boi-canh: 401 · 403 marketer · 200 sale · 404 team khác', async () => {
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
    assert.equal((await fetch(goc + '/api/ban-hoi-thoai/ht1/boi-canh')).status, 401);
    assert.equal((await fetch(goc + '/api/ban-hoi-thoai/ht1/boi-canh', { headers: { 'x-vai': VAI.MARKETER } })).status, 403);
    const ok = await fetch(goc + '/api/ban-hoi-thoai/ht1/boi-canh', { headers: { 'x-vai': VAI.SALE } });
    assert.equal(ok.status, 200);
    const j = await ok.json();
    assert.equal(j.ok, true);
    assert.equal(j.khach.ten, 'Aisha');
    const khac = await fetch(goc + '/api/ban-hoi-thoai/ht2/boi-canh', { headers: { 'x-vai': VAI.SALE } });
    assert.equal(khac.status, 404, 'team khác cùng câu với «không có» — không lộ sự tồn tại');
  } finally { await new Promise((r) => sv.close(r)); }
});
