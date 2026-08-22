// L4-M1 · hai danh sách — tiêu chí 2 · 5 · 6 · 7 · 8 · 9 · 10.
//
// Đồng hồ TIÊM VÀO (`bay`) chứ không chờ thật: đo "việc tạo cách đây 12 phút" mà phải chờ
// 12 phút thì bộ test không ai chạy nữa.
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI, LoiThieuBoiCanh } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, hangCho, tomTat, lyDoChu, LY_DO, MUC_KHAN, LoiDieuPhoi,
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

/** `tao_luc` cách đây `phutTruoc` phút, hạn 10 phút sau đó. */
const viec = (id, teamId, loai, phutTruoc, thua = {}) => ({
  id, team_id: teamId, loai, trang_thai: 'cho',
  tao_luc: BAY - phut(phutTruoc), han_luc: BAY - phut(phutTruoc) + HAN,
  ly_do_ma: loai === 'don' ? 'don_can_duyet' : 'khieu_nai',
  page_id: teamId === 't1' ? 'p1' : 'p2',
  cust_id: teamId === 't1' ? 'k1' : 'k2',
  conv_id: 'c_' + id,
  ...thua,
});

const HAT = () => ({
  viec_can_xu_ly: [
    viec('v1', 't1', 'hoi_thoai', 12),                        // quá hạn 2 phút
    viec('v2', 't1', 'hoi_thoai', 7),                         // còn 3 phút → gấp
    viec('v3', 't1', 'don', 2),                               // còn 8 phút → thường
    viec('v4', 't1', 'don', 15),                              // quá hạn 5 phút — cũ nhất
    viec('v5', 't1', 'hoi_thoai', 40, { trang_thai: 'da_xu' }),  // đã xử → không hiện
    viec('v6', 't2', 'hoi_thoai', 9),                         // TEAM KHÁC
  ],
  khach: [
    { id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' },
    { id: 'k2', team_id: 't2', ten: 'Khách của team hai', so_dien_thoai: '0909999999' },
  ],
  page: [
    { id: 'p1', team_id: 't1', ten: 'Tiểu Alpha Store' },
    { id: 'p2', team_id: 't2', ten: 'Auus Store' },
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
  // Việc của t1 trỏ nhầm sang khách của t2 → tên phải là null, không phải tên khách kia.
  const hat = HAT();
  hat.viec_can_xu_ly = [viec('vx', 't1', 'hoi_thoai', 3, { cust_id: 'k2', page_id: 'p2' })];
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
      viec('b', 't1', 'don', 3),          // còn 7 phút
    ],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Hà' }],
    page: [{ id: 'p1', team_id: 't1', ten: 'Tiểu Alpha Store' }],
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
      viec('b', 't1', 'hoi_thoai', 2, { trang_thai: 'dang_xu' }),
      viec('c', 't1', 'don', 1),
      viec('d', 't1', 'don', 90, { trang_thai: 'da_xu' }),
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

  const don = await hangCho(bcT1, { loai: 'don', bay: BAY });
  assert.ok(don.every((v) => v.loai === 'don'));
  assert.deepEqual(don.map((v) => v.id), ['v4', 'v3']);

  await assert.rejects(() => hangCho(bcT1, { loai: 'lung_tung', bay: BAY }), LoiDieuPhoi);
});

/* ───────────────────────── tiêu chí 8 · không N+1 ───────────────────── */

test('L4-M1 · 100 việc trong kho → tổng số lời gọi cổng truy vấn ≤ 8', async () => {
  const nhieu = [];
  for (let i = 0; i < 100; i++) {
    nhieu.push(viec('n' + i, 't1', i % 2 ? 'don' : 'hoi_thoai', i % 20, {
      cust_id: 'k' + (i % 7), page_id: 'p' + (i % 4),
    }));
  }
  const khach = [];
  for (let i = 0; i < 7; i++) khach.push({ id: 'k' + i, team_id: 't1', ten: 'Khách ' + i, so_dien_thoai: '090000000' + i });
  const page = [];
  for (let i = 0; i < 4; i++) page.push({ id: 'p' + i, team_id: 't1', ten: 'Page ' + i });

  const { dem } = noiKho({ viec_can_xu_ly: nhieu, khach, page });

  const ds = await hangCho(bcT1, { gioiHan: 100, bay: BAY });
  const tt = await tomTat(bcT1, { bay: BAY });

  assert.equal(ds.length, 100);
  assert.equal(tt.hoiThoai.cho + tt.don.cho, 100);
  assert.ok(ds.every((v) => v.tenKhach && v.tenPage), 'gộp kèm sót dòng');
  assert.ok(dem.n <= 8, `gọi cổng ${dem.n} lần (${dem.ds.join(', ')}) — N+1 rồi`);
});

test('L4-M1 · không có khách/page nào để gộp thì không gọi thêm lời nào', async () => {
  const { dem } = noiKho({
    viec_can_xu_ly: [viec('a', 't1', 'hoi_thoai', 1, { cust_id: null, page_id: null })],
  });
  await hangCho(bcT1, { bay: BAY });
  assert.equal(dem.n, 1, 'gọi thừa: ' + dem.ds.join(', '));   // `IN ()` không phải câu SQL hợp lệ
});

/* ───────────────────────── bảng lý do ───────────────────── */

test('L4-M1 · lý do bằng chữ; MÃ LẠ hiện nguyên mã, không gộp im lặng vào `khac`', () => {
  assert.equal(lyDoChu({ ly_do_ma: 'doi_tra' }), LY_DO.doi_tra);
  assert.equal(lyDoChu({ ly_do_ma: 'don_can_duyet' }), 'Đơn bot chốt, chờ sale duyệt');

  const warnCu = console.warn;
  const keu = [];
  console.warn = (...a) => keu.push(a.join(' '));
  try {
    assert.equal(lyDoChu({ ly_do_ma: 'ly_do_moi_toanh' }), 'ly_do_moi_toanh');
  } finally { console.warn = warnCu; }
  assert.equal(keu.length, 1, 'mã lạ phải kêu lên một tiếng');
  assert.notEqual(lyDoChu({ ly_do_ma: 'ly_do_moi_toanh' }), LY_DO.khac);

  // Không có mã thì lấy lý do thô.
  assert.equal(lyDoChu({ ly_do: 'khách chửi rất to' }), 'khách chửi rất to');
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
  await hangCho(bcT1, { loai: 'don', bay: BAY });
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
