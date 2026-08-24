// L4-M1 · hai danh sách — tiêu chí 2 · 5 · 6 · 7 · 8 · 9 · 10.
//
// Đồng hồ TIÊM VÀO (`bay`) chứ không chờ thật: đo "việc tạo cách đây 12 phút" mà phải chờ
// 12 phút thì bộ test không ai chạy nữa.
import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI, LoiThieuBoiCanh } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, hangCho, tomTat, lyDoChu, LY_DO, MUC_KHAN, LoiDieuPhoi,
  trangThaiCua, TRANG_THAI, LOAI, KHONG_RO_NGUOI,
} from '../../src/ui/dispatch/index.js';

/* ───────────────────────────── tiện tay ───────────────────────────── */

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;
const HAN = phut(10);                       // `han_luc = tao_luc + 10 phút` (hợp đồng mục 4)

const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

/** Cổng có bộ đếm — tiêu chí 8 đếm số lời gọi, không đếm số dòng. */
function congDem(that, dem) {
  return new Proxy(that, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      return (...a) => { dem.n++; dem.ds.push(k + ':' + a[0]); return v.apply(t, a); };
    },
  });
}

/** Nối một kho mới vào cổng của module. Test chạy tuần tự nên đổi kho giữa chừng là an toàn. */
function noiKho(hat) {
  const kho = new KhoGia(hat);
  const dem = { n: 0, ds: [] };
  datTaoTruyVan((bc) => congDem(taoTruyVanGia(kho, bc), dem));
  return { kho, dem };
}

const anh = (kho) => JSON.stringify([...kho.bang.entries()].map(([k, v]) => [k, v]));

/**
 * Một dòng `viec_can_xu_ly` ĐÚNG HÌNH DẠNG LƯỢC ĐỒ THẬT (`001_nen.up.sql:228`):
 * không có `trang_thai`, không có `page_id`/`cust_id`/`conv_id` — chỉ có `hoi_thoai_id`
 * và `don_hang_id`, còn khách/page thì phải đi vòng qua `hoi_thoai`.
 *
 * `dong_luc: null` và `nguoi_nhan_id: null` GHI HẲN RA, không bỏ trống: cột thật luôn tồn
 * tại với giá trị NULL, và điều kiện "việc đang mở" là `dong_luc IS NULL`.
 */
const viec = (id, teamId, loai, phutTruoc, thua = {}) => ({
  id, team_id: teamId, loai,
  day_luc: BAY - phut(phutTruoc), han_luc: BAY - phut(phutTruoc) + HAN,
  ly_do_day: loai === 'don_hang' ? 'don_can_duyet' : 'khieu_nai',
  hoi_thoai_id: teamId === 't1' ? 'h1' : 'h2',
  don_hang_id: loai === 'don_hang' ? 'd1' : null,
  nguoi_nhan_id: null, nhan_luc: null,
  ket_qua: null, ly_do_dong: null, chi_phi: null, dong_luc: null,
  ...thua,
});

/** Dòng `hoi_thoai` — chỗ DUY NHẤT còn giữ page và khách của một việc. */
const hoiThoai = (id, teamId, pageId, khachId, thua = {}) => ({
  id, team_id: teamId, page_id: pageId, khach_id: khachId,
  psid: 'psid_' + id, trang_thai: 'SELLING', chu_so_huu: 'AI', ...thua,
});

const HAT = () => ({
  viec_can_xu_ly: [
    viec('v1', 't1', 'hoi_thoai', 12),                        // quá hạn 2 phút
    viec('v2', 't1', 'hoi_thoai', 7),                         // còn 3 phút → gấp
    viec('v3', 't1', 'don_hang', 2),                          // còn 8 phút → thường
    viec('v4', 't1', 'don_hang', 15),                         // quá hạn 5 phút — cũ nhất
    viec('v5', 't1', 'hoi_thoai', 40, { dong_luc: BAY - phut(30) }),  // đã xử → không hiện
    viec('v6', 't2', 'hoi_thoai', 9),                         // TEAM KHÁC
  ],
  hoi_thoai: [
    hoiThoai('h1', 't1', 'p1', 'k1'),
    hoiThoai('h2', 't2', 'p2', 'k2'),
  ],
  khach: [
    { id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' },
    { id: 'k2', team_id: 't2', ten: 'Khách của team hai', so_dien_thoai: '0909999999' },
  ],
  page: [
    { id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' },
    { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Auus Store' },
  ],
  nguoi_dung: [
    { id: 'u1', email: 'an@shop.vn', ten: 'An' },
    { id: 'u2', email: 'binh@shop.vn', ten: 'Bình' },
  ],
});

/* ───────────────────────── tiêu chí 5 · không bối cảnh thì ném ───────────────────── */

test('L4-M1 · truy vấn không có bối cảnh thì NÉM LỖI, không trả mảng rỗng', async () => {
  noiKho(HAT());
  await assert.rejects(() => hangCho(undefined, { bay: BAY }), LoiThieuBoiCanh);
  await assert.rejects(() => hangCho({ vai: ['sale'] }, { bay: BAY }), LoiThieuBoiCanh);
  await assert.rejects(() => tomTat(null, { bay: BAY }), LoiThieuBoiCanh);
  // Trả rỗng nguy hiểm hơn: sale nhìn bảng trống rồi tin là hết việc.
});

test('L4-M1 · chưa nối cổng truy vấn thì kêu lên chứ không im lặng trả rỗng', async () => {
  datTaoTruyVan(null);
  await assert.rejects(() => hangCho(bcT1, { bay: BAY }), LoiDieuPhoi);
  noiKho(HAT());   // nối lại cho các bài sau
});

/* ───────────────────────── tiêu chí 2 · lớp team ───────────────────── */

test('L4-M1 · team A không thấy MỘT DÒNG NÀO của team B, dù kho có cả hai', async () => {
  noiKho(HAT());
  const cuaT1 = await hangCho(bcT1, { bay: BAY });
  assert.equal(cuaT1.length, 4);
  assert.deepEqual(cuaT1.map((v) => v.id).sort(), ['v1', 'v2', 'v3', 'v4']);
  assert.ok(cuaT1.every((v) => v.team_id === 't1'), 'lọt dòng của team khác');

  const cuaT2 = await hangCho(bcT2, { bay: BAY });
  assert.deepEqual(cuaT2.map((v) => v.id), ['v6']);
  assert.equal(cuaT2[0].tenKhach, 'Khách của team hai');
});

test('L4-M1 · gộp kèm cũng theo team: không mượn được tên khách của team khác', async () => {
  // Việc của t1 trỏ nhầm sang HỘI THOẠI của t2 → tên phải là null, không phải tên khách kia.
  const hat = HAT();
  hat.viec_can_xu_ly = [viec('vx', 't1', 'hoi_thoai', 3, { hoi_thoai_id: 'h2' })];
  noiKho(hat);
  const [d] = await hangCho(bcT1, { bay: BAY });
  assert.equal(d.tenKhach, null);
  assert.equal(d.tenPage, null);
});

/* ───────────────────────── tiêu chí 7 · thứ tự ───────────────────── */

test('L4-M1 · việc gần hết giờ nhất đứng đầu (han_luc tăng dần), không phải thứ tự tạo', async () => {
  noiKho(HAT());
  const ds = await hangCho(bcT1, { bay: BAY });
  assert.deepEqual(ds.map((v) => v.id), ['v4', 'v1', 'v2', 'v3']);
  for (let i = 1; i < ds.length; i++) {
    assert.ok(ds[i - 1].han_luc <= ds[i].han_luc, 'thứ tự han_luc bị vỡ ở dòng ' + i);
  }
});

test('L4-M1 · `da_xu` không nằm trên bảng điều phối', async () => {
  noiKho(HAT());
  const ds = await hangCho(bcT1, { bay: BAY });
  assert.ok(!ds.some((v) => v.id === 'v5'), 'việc đã xử vẫn hiện');
});

/* ───────────────────────── tiêu chí 6 · quá hạn và mức khẩn ───────────────────── */

test('L4-M1 · việc tạo cách đây 12 phút: quaHan, mucKhan=qua_han, quaHanTong=1', async () => {
  noiKho({
    viec_can_xu_ly: [
      viec('a', 't1', 'hoi_thoai', 12),   // quá hạn 2 phút
      viec('b', 't1', 'don_hang', 3),     // còn 7 phút
    ],
    hoi_thoai: [hoiThoai('h1', 't1', 'p1', 'k1')],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Hà' }],
    page: [{ id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' }],
  });

  const ds = await hangCho(bcT1, { bay: BAY });
  const a = ds.find((v) => v.id === 'a');
  assert.equal(a.quaHan, true);
  assert.equal(a.mucKhan, MUC_KHAN.QUA_HAN);
  assert.equal(a.conLaiMs, -phut(2));

  const tt = await tomTat(bcT1, { bay: BAY });
  assert.equal(tt.quaHanTong, 1);
  assert.equal(tt.hoiThoai.quaHan, 1);
  assert.equal(tt.don.quaHan, 0);
  assert.equal(tt.cuNhat.id, 'a');
  assert.equal(tt.cuNhat.phutQuaHan, 2);
});

test('L4-M1 · ba mức khẩn: >5 phút thường · 0–5 phút gấp · âm là quá hạn', async () => {
  noiKho({
    viec_can_xu_ly: [
      viec('thuong', 't1', 'hoi_thoai', 2),   // còn 8 phút
      viec('gap', 't1', 'hoi_thoai', 6),      // còn 4 phút
      viec('bien', 't1', 'hoi_thoai', 5),     // còn ĐÚNG 5 phút → vẫn là gấp
      viec('qua', 't1', 'hoi_thoai', 11),     // quá 1 phút
    ],
  });
  const m = new Map((await hangCho(bcT1, { bay: BAY })).map((v) => [v.id, v.mucKhan]));
  assert.equal(m.get('thuong'), MUC_KHAN.THUONG);
  assert.equal(m.get('gap'), MUC_KHAN.GAP);
  assert.equal(m.get('bien'), MUC_KHAN.GAP);
  assert.equal(m.get('qua'), MUC_KHAN.QUA_HAN);
});

test('L4-M1 · tomTat đếm cả `dang_xu`, và không có việc trễ thì cuNhat=null', async () => {
  noiKho({
    viec_can_xu_ly: [
      viec('a', 't1', 'hoi_thoai', 1),
      viec('b', 't1', 'hoi_thoai', 2, { nguoi_nhan_id: 'u2', nhan_luc: BAY - phut(1) }),
      viec('c', 't1', 'don_hang', 1),
      viec('d', 't1', 'don_hang', 90, { dong_luc: BAY - phut(80) }),
    ],
  });
  const tt = await tomTat(bcT1, { bay: BAY });
  assert.deepEqual(tt.hoiThoai, { cho: 2, quaHan: 0 });
  assert.deepEqual(tt.don, { cho: 1, quaHan: 0 });
  assert.equal(tt.quaHanTong, 0);
  assert.equal(tt.cuNhat, null);
});

/* ───────────────────────── tiêu chí 9 · lọc theo loại ───────────────────── */

test('L4-M1 · loai="hoi_thoai" thì mọi dòng đều đúng loại đó', async () => {
  noiKho(HAT());
  const ht = await hangCho(bcT1, { loai: 'hoi_thoai', bay: BAY });
  assert.ok(ht.length > 0);
  assert.ok(ht.every((v) => v.loai === 'hoi_thoai'), 'lọt việc loại khác');
  assert.deepEqual(ht.map((v) => v.id), ['v1', 'v2']);

  const don = await hangCho(bcT1, { loai: 'don_hang', bay: BAY });
  assert.ok(don.every((v) => v.loai === 'don_hang'));
  assert.deepEqual(don.map((v) => v.id), ['v4', 'v3']);

  await assert.rejects(() => hangCho(bcT1, { loai: 'lung_tung', bay: BAY }), LoiDieuPhoi);
});

/* ───────────────────────── tiêu chí 8 · không N+1 ───────────────────── */

test('L4-M1 · 100 việc + 100 hội thoại + 100 khách → hangCho ≤ 5 lời gọi, tomTat ≤ 6', async () => {
  // Đường nối thật dài hơn trước MỘT chặng (việc → hội thoại → khách + page), nên bài này
  // là chỗ duy nhất phát hiện được ai đó lỡ tay đọc hội thoại theo từng dòng.
  const nhieu = [];
  const hoiThoais = [];
  for (let i = 0; i < 100; i++) {
    nhieu.push(viec('n' + i, 't1', i % 2 ? 'don_hang' : 'hoi_thoai', i % 20, {
      hoi_thoai_id: 'h' + i,
      nguoi_nhan_id: i % 3 ? null : 'u' + (i % 5),
    }));
    hoiThoais.push(hoiThoai('h' + i, 't1', 'p' + (i % 4), 'k' + i));
  }
  const khach = [];
  for (let i = 0; i < 100; i++) khach.push({ id: 'k' + i, team_id: 't1', ten: 'Khách ' + i, so_dien_thoai: '090000' + i });
  const page = [];
  for (let i = 0; i < 4; i++) page.push({ id: 'p' + i, team_id: 't1', page_id: '10000' + i, ten: 'Page ' + i });
  const nguoi = [];
  for (let i = 0; i < 5; i++) nguoi.push({ id: 'u' + i, email: 'u' + i + '@shop.vn', ten: 'Sale ' + i });

  const { dem } = noiKho({ viec_can_xu_ly: nhieu, hoi_thoai: hoiThoais, khach, page, nguoi_dung: nguoi });

  const ds = await hangCho(bcT1, { gioiHan: 100, bay: BAY });
  const demHangCho = { n: dem.n, ds: [...dem.ds] };
  dem.n = 0; dem.ds.length = 0;
  const tt = await tomTat(bcT1, { bay: BAY });

  assert.equal(ds.length, 100);
  assert.equal(tt.hoiThoai.cho + tt.don.cho, 100);
  assert.ok(ds.every((v) => v.tenKhach && v.tenPage), 'gộp kèm sót dòng');
  assert.ok(ds.some((v) => v.tenNguoiNhan), 'cột "Đang xử" không có tên nào — mẻ nguoi_dung hụt');
  assert.ok(demHangCho.n <= 5, `hangCho gọi cổng ${demHangCho.n} lần (${demHangCho.ds.join(', ')}) — N+1 rồi`);
  assert.ok(dem.n <= 6, `tomTat gọi cổng ${dem.n} lần (${dem.ds.join(', ')})`);
});

test('L4-M1 · không có hội thoại/người nhận nào để gộp thì không gọi thêm lời nào', async () => {
  const { dem } = noiKho({
    viec_can_xu_ly: [viec('a', 't1', 'hoi_thoai', 1, { hoi_thoai_id: null, nguoi_nhan_id: null })],
  });
  await hangCho(bcT1, { bay: BAY });
  assert.equal(dem.n, 1, 'gọi thừa: ' + dem.ds.join(', '));   // `IN ()` không phải câu SQL hợp lệ
});

/* ───────────────────────── bảng lý do ───────────────────── */

test('L4-M1 · lý do đọc từ MỘT cột `ly_do_day`; mã lạ hiện nguyên văn, không gộp vào `khac`', () => {
  assert.equal(lyDoChu({ ly_do_day: 'doi_tra' }), LY_DO.doi_tra);
  assert.equal(lyDoChu({ ly_do_day: 'don_can_duyet' }), 'Đơn bot chốt, chờ sale duyệt');

  const warnCu = console.warn;
  const keu = [];
  console.warn = (...a) => keu.push(a.join(' '));
  try {
    assert.equal(lyDoChu({ ly_do_day: 'ly_do_moi_toanh' }), 'ly_do_moi_toanh');
  } finally { console.warn = warnCu; }
  assert.equal(keu.length, 1, 'mã lạ phải kêu lên một tiếng');
  assert.notEqual(lyDoChu({ ly_do_day: 'ly_do_moi_toanh' }), LY_DO.khac);

  // Cột thật là CHỮ TỰ DO — câu tiếng Việt thì hiện nguyên văn và KHÔNG kêu.
  const warnCu2 = console.warn;
  const keu2 = [];
  console.warn = (...a) => keu2.push(a.join(' '));
  try {
    assert.equal(lyDoChu({ ly_do_day: 'khách chửi rất to' }), 'khách chửi rất to');
  } finally { console.warn = warnCu2; }
  assert.equal(keu2.length, 0, 'chữ tự do mà cũng kêu thì log thành rác');

  assert.equal(lyDoChu({}), '(không ghi lý do)');
});

test('L4-M1 · mỗi dòng mang sẵn tên khách · số điện thoại · tên page', async () => {
  noiKho(HAT());
  const [d] = await hangCho(bcT1, { loai: 'hoi_thoai', bay: BAY });
  assert.equal(d.tenKhach, 'Nguyễn Thu Hà');
  assert.equal(d.soDienThoai, '0901234567');
  assert.equal(d.tenPage, 'Tiểu Alpha Store');
  assert.equal(d.lyDoChu, LY_DO.khieu_nai);
});

/* ───────────────────────── tiêu chí 10 · module này KHÔNG ghi ───────────────────── */

test('L4-M1 · chạy hết mọi đường đọc rồi so kho trước/sau: KHÔNG ĐỔI một byte', async () => {
  const { kho } = noiKho(HAT());
  const truoc = anh(kho);

  await hangCho(bcT1, { bay: BAY });
  await hangCho(bcT1, { loai: 'don_hang', bay: BAY });
  await hangCho(bcT2, { bay: BAY });
  await tomTat(bcT1, { bay: BAY });
  await tomTat(bcT2, { bay: BAY });

  assert.equal(anh(kho), truoc, 'module chỉ đọc mà kho đổi');
  assert.equal(kho.nhatKy.length, 0, 'không có gì để chặn mà vẫn ghi nhật ký');
});

test('L4-M1 · cổng chỉ-đọc: gọi them/sua/xoa là ném — mà cả module vẫn chạy trơn', async () => {
  const kho = new KhoGia(HAT());
  datTaoTruyVan((bc) => {
    const that = taoTruyVanGia(kho, bc);
    return new Proxy(that, {
      get(t, k) {
        if (k === 'them' || k === 'sua' || k === 'xoa') {
          return () => { throw new Error('L4-M1 không được ghi (' + String(k) + ')'); };
        }
        return t[k];
      },
    });
  });

  await hangCho(bcT1, { bay: BAY });
  await tomTat(bcT1, { bay: BAY });
  // Không ném ra ở trên là bằng chứng: không có đường ghi nào trong module.
});

/* ═════════════ máy trạng thái · SUY RA, không phải cột (B-S1 mục "Ba chỗ") ═════════════ */

test('L4-M1 · trangThaiCua suy đúng ba trạng thái từ nguoi_nhan_id + dong_luc', () => {
  assert.equal(trangThaiCua({ nguoi_nhan_id: null, dong_luc: null }), TRANG_THAI.CHO);
  assert.equal(trangThaiCua({ nguoi_nhan_id: 7, dong_luc: null }), TRANG_THAI.DANG_XU);
  assert.equal(trangThaiCua({ nguoi_nhan_id: 7, dong_luc: BAY }), TRANG_THAI.DA_XU);
  // Đóng mà không ai nhận (dữ liệu lệch, hoặc người nhận đã bị xoá → ON DELETE SET NULL):
  // vẫn là ĐÃ XỬ. `dong_luc` mới là thứ quyết định, không phải người nhận.
  assert.equal(trangThaiCua({ nguoi_nhan_id: null, dong_luc: BAY }), TRANG_THAI.DA_XU);
  assert.equal(trangThaiCua({}), TRANG_THAI.CHO);
  assert.equal(trangThaiCua(null), TRANG_THAI.CHO);
});

test('L4-M1 · mỗi dòng danh sách mang sẵn `trangThai` — trang không phải tự suy lại', async () => {
  noiKho({
    viec_can_xu_ly: [
      viec('cho', 't1', 'hoi_thoai', 1),
      viec('dang', 't1', 'hoi_thoai', 2, { nguoi_nhan_id: 'u2', nhan_luc: BAY - phut(1) }),
    ],
    hoi_thoai: [hoiThoai('h1', 't1', 'p1', 'k1')],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Hà' }],
    page: [{ id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' }],
    nguoi_dung: [{ id: 'u2', email: 'binh@shop.vn', ten: 'Bình' }],
  });
  const m = new Map((await hangCho(bcT1, { bay: BAY })).map((v) => [v.id, v]));
  assert.equal(m.get('cho').trangThai, TRANG_THAI.CHO);
  assert.equal(m.get('cho').tenNguoiNhan, null, 'chưa ai nhận thì cột "Đang xử" phải trống');
  assert.equal(m.get('dang').trangThai, TRANG_THAI.DANG_XU);
  assert.equal(m.get('dang').tenNguoiNhan, 'Bình', 'phải TRA `nguoi_dung`, không in id ra');
});

/* ═════════════ tiêu chí 8 · người nhận tra không ra thì KHÔNG lộ id ═════════════ */

test('L4-M1 · nguoi_nhan_id lạ → hiện "(không rõ)", tuyệt đối không hiện id trần', async () => {
  noiKho({
    viec_can_xu_ly: [
      viec('la', 't1', 'hoi_thoai', 1, { nguoi_nhan_id: 'u_khong_co_that', nhan_luc: BAY }),
    ],
    nguoi_dung: [{ id: 'u1', email: 'an@shop.vn', ten: 'An' }],
  });
  const [d] = await hangCho(bcT1, { bay: BAY });
  assert.equal(d.trangThai, TRANG_THAI.DANG_XU);
  assert.equal(d.tenNguoiNhan, KHONG_RO_NGUOI);
  assert.ok(!String(d.tenNguoiNhan).includes('u_khong_co_that'), 'id trần lọt ra màn hình');
});

/* ═════════════ tiêu chí 2 · quét mã nguồn — tên cột cũ không được sống lại ═════════════ */

const THU_MUC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui/dispatch');

/** Mọi file mã nguồn của module, kể cả hai trang HTML (chúng cũng đọc tên cột). */
function moiFile() {
  const ra = [];
  for (const f of fs.readdirSync(THU_MUC)) {
    if (f.endsWith('.js')) ra.push([f, fs.readFileSync(path.join(THU_MUC, f), 'utf8')]);
  }
  for (const f of fs.readdirSync(path.join(THU_MUC, 'trang'))) {
    if (f.endsWith('.html')) ra.push([`trang/${f}`, fs.readFileSync(path.join(THU_MUC, 'trang', f), 'utf8')]);
  }
  return ra;
}

test('L4-M1 · không còn tên cột NÀO do người B tự đoán trong cả module', () => {
  // Tám chỗ lệch của G5. Bảy cái đầu là tên KHÔNG TỒN TẠI trong lược đồ thật — có mặt ở
  // đâu cũng là bịa; nên cấm thẳng cả từ.
  const CAM = ['ly_do_ma', 'nhan_boi', 'nhan_boi_ten', 'chi_phi_dong', 'ket_qua_ly_do', 'cust_id', 'conv_id'];
  const ds = moiFile();
  assert.ok(ds.length >= 6, 'quét hụt file — bài test này sẽ xanh giả');

  for (const [ten, ma] of ds) {
    for (const cam of CAM) {
      // `\b` không ăn với dấu gạch dưới hai đầu, nên tự chặn hai bên cho chắc.
      const re = new RegExp(`(^|[^0-9A-Za-z_])${cam}([^0-9A-Za-z_]|$)`);
      assert.ok(!re.test(ma), `${ten} còn tên cột B tự đoán: ${cam}`);
    }
    // `tao_luc` VẪN LÀ CỘT THẬT của `don_hang`/`khach`/`page` — cấm cả từ là cấm nhầm.
    // Chỉ cấm khi nó bị ĐỌC RA TỪ MỘT DÒNG: dòng việc thật dùng `day_luc`.
    assert.ok(!/\.tao_luc\b/.test(ma), `${ten} đọc \`.tao_luc\` — dòng việc thật là \`day_luc\``);
    // Giá trị, không phải tên cột: CHECK của lược đồ chỉ nhận 'hoi_thoai' | 'don_hang'.
    assert.ok(!/loai\s*(:|={2,3}|!={1,2})\s*['"]don['"]/.test(ma), `${ten} còn loai = 'don'`);
  }

  assert.equal(LOAI.DON, 'don_hang');
  assert.equal(LOAI.HOI_THOAI, 'hoi_thoai');
});

/* ═══════ tiêu chí 3 · công thức trạng thái nằm ở ĐÚNG MỘT chỗ ═══════ */

test('L4-M1 · chỉ kho-viec.js biết công thức trạng thái; nơi khác gọi trangThaiCua()', () => {
  // "Suy trạng thái" = SO MỘT TRONG HAI CỘT ĐÓ VỚI NULL. Đọc/ghi hai cột thì file nào cũng
  // được (dong-viec.js phải ghi chúng); chép lại CÔNG THỨC mới là chỗ sinh ra hai sự thật.
  const CONG_THUC = /(nguoi_nhan_id|dong_luc)\s*(={2,3}|!={1,2})\s*null|null\s*(={2,3}|!={1,2})\s*(nguoi_nhan_id|dong_luc)/;

  const ds = moiFile();
  const goc = ds.find(([t]) => t === 'kho-viec.js');
  assert.ok(goc, 'không thấy kho-viec.js');
  assert.ok(CONG_THUC.test(goc[1]), 'công thức đã rời khỏi kho-viec.js — sửa luôn bài test này');

  for (const [ten, ma] of ds) {
    if (ten === 'kho-viec.js') continue;
    assert.ok(!CONG_THUC.test(ma), `${ten} chép lại công thức trạng thái — phải gọi trangThaiCua()`);
  }

  // Và KHÔNG file nào còn đọc cột `trang_thai` của dòng việc — cột đó không tồn tại.
  // (`trang_thai_he`/`trang_thai_pos` của `don_hang` là chuyện khác, và không có dấu chấm.)
  for (const [ten, ma] of ds) {
    assert.ok(!/\.trang_thai\b/.test(ma), `${ten} còn đọc cột trang_thai của dòng việc`);
  }
});
