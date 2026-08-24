// L4-M1 · màn chi tiết và hai đường nhảy — tiêu chí 3 (nửa dưới HTTP nằm ở
// `dispatch-router.test.mjs`), 5, 10, và luật "không có đơn thì `donHang: null`, không ném".
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI, LoiThieuBoiCanh } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, chiTietViec, LY_DO, TRANG_THAI, KHONG_RO_NGUOI,
  lienKetPancake, lienKetPos, mauPos, daCauHinhPos, MAU_POS_MAC_DINH, BIEN_MAU_POS,
  convIdCua, tachMaPos,
} from '../../src/ui/dispatch/index.js';

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;

const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

const tin = (id, teamId, phutTruoc, ben, chu, thua = {}) => ({
  id, team_id: teamId, page_id: 'p1', cust_id: 'k1',
  thoi_gian: BAY - phut(phutTruoc), ben, chu, ...thua,
});

/** Nửa dưới của một dòng việc, đúng SÁU cột thật, luôn ghi hẳn NULL ra. */
const nuaDuoi = { nguoi_nhan_id: null, nhan_luc: null, ket_qua: null, ly_do_dong: null, chi_phi: null, dong_luc: null };

function hat() {
  return {
    viec_can_xu_ly: [
      {
        id: 'v_chat', team_id: 't1', loai: 'hoi_thoai',
        ly_do_day: 'khieu_nai', hoi_thoai_id: 'ht1', don_hang_id: null,
        day_luc: BAY - phut(12), han_luc: BAY - phut(2), ...nuaDuoi,
      },
      {
        id: 'v_don', team_id: 't1', loai: 'don_hang',
        ly_do_day: 'don_can_duyet', hoi_thoai_id: 'ht1', don_hang_id: 'd1',
        day_luc: BAY - phut(3), han_luc: BAY + phut(7), ...nuaDuoi,
      },
      // CHECK của lược đồ chỉ bắt `don_hang` phải có `don_hang_id` — KHÔNG bắt có hội
      // thoại. Đây là dòng dựng ra ca "đơn từ trang bán hàng", không nối Messenger.
      {
        id: 'v_don_le', team_id: 't1', loai: 'don_hang',
        ly_do_day: 'trung_don', hoi_thoai_id: null, don_hang_id: 'd2',
        day_luc: BAY - phut(5), han_luc: BAY + phut(5), ...nuaDuoi,
      },
      {
        id: 'v_da_xu', team_id: 't1', loai: 'hoi_thoai',
        ly_do_day: 'hoan_tien', hoi_thoai_id: 'ht1', don_hang_id: null,
        day_luc: BAY - phut(40), han_luc: BAY - phut(30),
        nguoi_nhan_id: 'u2', nhan_luc: BAY - phut(35),
        ket_qua: 'khach_tu_choi', ly_do_dong: 'khac · khách bảo để tết tính',
        chi_phi: null, dong_luc: BAY - phut(31),
      },
      {
        id: 'v_cua_t2', team_id: 't2', loai: 'hoi_thoai',
        ly_do_day: 'doi_tra', hoi_thoai_id: 'ht2', don_hang_id: null,
        day_luc: BAY - phut(4), han_luc: BAY + phut(6), ...nuaDuoi,
      },
    ],
    khach: [
      { id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' },
      { id: 'k2', team_id: 't2', ten: 'Khách team hai' },
    ],
    page: [
      { id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store', pos_shop_id: '77' },
      { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Auus Store' },
    ],
    hoi_thoai: [
      { id: 'ht1', team_id: 't1', page_id: 'p1', psid: '9911', khach_id: 'k1', trang_thai: 'CLOSING', chu_so_huu: 'AI' },
      { id: 'ht2', team_id: 't2', page_id: 'p2', psid: '8822', khach_id: 'k2', trang_thai: 'GREET', chu_so_huu: 'AI' },
    ],
    nguoi_dung: [
      { id: 'u1', email: 'an@shop.vn', ten: 'An' },
      { id: 'u2', email: 'binh@shop.vn', ten: 'Bình' },
    ],
    don_hang: [
      { id: 'd1', team_id: 't1', ma_pos: '77:1024', tong_tien: 249000, trang_thai_he: 'cho_xac_nhan', nguon: 'messenger' },
      { id: 'd2', team_id: 't1', ma_pos: '77:2048', tong_tien: 99000, trang_thai_he: 'moi_tu_pos', nguon: 'trang_ban_hang' },
    ],
    so_ai: [
      tin('s1', 't1', 30, 'khach', 'tin cũ nhất'),
      tin('s2', 't1', 25, 'bot', 'bot chào', { lane: 'tpl_greet' }),
      tin('s3', 't1', 20, 'khach', 'hàng lỗi rồi'),
      tin('s4', 't1', 15, 'bot', 'em xin lỗi chị', { lane: 'AI', ma_model: 'kimi-k2.6' }),
      tin('s5', 't1', 10, 'khach', 'tin mới nhất'),
      tin('s6', 't2', 12, 'khach', 'tin của team hai', { page_id: 'p2', cust_id: 'k2' }),
    ],
  };
}

function noiKho(h = hat()) {
  const kho = new KhoGia(h);
  datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));
  return kho;
}

const anh = (kho) => JSON.stringify([...kho.bang.entries()].map(([k, v]) => [k, v]));

/* ───────────────────────────── màn chi tiết ───────────────────────────── */

test('L4-M1 · chi tiết gom đủ: việc · khách · page · hội thoại · đơn · lý do', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });

  assert.equal(d.viec.id, 'v_chat');
  assert.equal(d.viec.quaHan, true);
  assert.equal(d.viec.mucKhan, 'qua_han');
  assert.equal(d.lyDoChu, LY_DO.khieu_nai);
  assert.equal(d.khach.ten, 'Nguyễn Thu Hà');
  assert.equal(d.page.ten, 'Tiểu Alpha Store');
  assert.equal(d.hoiThoai.id, 'ht1');
  assert.equal(d.viec.tenKhach, 'Nguyễn Thu Hà');
  assert.equal(d.viec.soDienThoai, '0901234567');
  // Khách và page KHÔNG còn nằm trên dòng việc — cả hai đi vòng qua `hoi_thoai`.
  assert.equal(d.khach.id, d.hoiThoai.khach_id);
  assert.equal(d.page.id, d.hoiThoai.page_id);
  assert.equal(d.viec.trangThai, TRANG_THAI.CHO);
  assert.equal(d.viec.tenNguoiNhan, null);
});

test('L4-M1 · không có đơn thì donHang là null, KHÔNG ném', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  assert.equal(d.donHang, null);

  const e = await chiTietViec(bcT1, 'v_don', { bay: BAY });
  assert.equal(e.donHang.ma_pos, '77:1024');
});

test('L4-M1 · việc của team khác → null (để router trả 404, KHÔNG phải 403)', async () => {
  noiKho();
  assert.equal(await chiTietViec(bcT1, 'v_cua_t2', { bay: BAY }), null);
  assert.equal(await chiTietViec(bcT2, 'v_chat', { bay: BAY }), null);
  // Và team chủ vẫn xem được việc của mình — không phải "null vì hàm hỏng".
  assert.equal((await chiTietViec(bcT2, 'v_cua_t2', { bay: BAY })).viec.id, 'v_cua_t2');
});

test('L4-M1 · id không có thật → null, id rỗng → null, thiếu bối cảnh → NÉM', async () => {
  noiKho();
  assert.equal(await chiTietViec(bcT1, 'khong-co-thuc', { bay: BAY }), null);
  assert.equal(await chiTietViec(bcT1, '', { bay: BAY }), null);
  await assert.rejects(() => chiTietViec(undefined, 'v_chat', { bay: BAY }), LoiThieuBoiCanh);
});

/* ────────────────── đoạn chat đã BỎ (quyết định 23/08) ────────────────── */

// `so_ai` thật chỉ ghi HÀNH ĐỘNG của bot: không có cột nội dung tin, không có dòng nào
// cho tin của khách. Dựng đoạn chat từ đó là dựng một nửa cuộc nói chuyện. Hội thoại đầy
// đủ nằm ở Pancake, đúng chỗ sale vốn làm việc (01-QUYET-DINH §10).
// Ba bài dưới đây KHOÁ quyết định đó lại, để người sau không vô tình đắp lại.

test('L4-M1 · màn chi tiết KHÔNG trả đoạn chat nữa', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  assert.equal(d.doanChat, undefined, 'đoạn chat phải biến mất hẳn, không phải trả mảng rỗng');
  assert.ok(!('doanChat' in d));
  // vẫn còn đủ thứ sale cần
  for (const k of ['viec', 'khach', 'page', 'hoiThoai', 'donHang', 'lienKet', 'lyDoChu']) {
    assert.ok(k in d, `mất khối ${k}`);
  }
});

test('L4-M1 · KHÔNG đọc bảng so_ai một lần nào', async () => {
  const kho = new KhoGia(hat());
  const daDoc = [];
  datTaoTruyVan((bc) => {
    const g = taoTruyVanGia(kho, bc);
    return new Proxy(g, {
      get: (t, k) => (['chon', 'mot', 'dem'].includes(k)
        ? (bang, ...r) => { daDoc.push(bang); return t[k](bang, ...r); }
        : t[k]),
    });
  });
  await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  assert.ok(daDoc.length > 0, 'không đọc bảng nào thì bài test này vô nghĩa');
  assert.ok(!daDoc.includes('so_ai'), `vẫn còn đọc so_ai: ${daDoc.join(',')}`);
});

test('L4-M1 · module không còn xuất hằng số của đoạn chat', async () => {
  const m = await import('../../src/ui/dispatch/index.js');
  const con = Object.keys(m).filter((k) => /doanChat|SO_TIN|COT_THOI_GIAN_SO_AI/.test(k));
  assert.deepEqual(con, [], `còn sót: ${con.join(', ')}`);
});

/* ───────────────────────────── hai đường nhảy ───────────────────────────── */

test('L4-M1 · đường Pancake đúng dạng đang chạy ở src/ai-log.js:178', () => {
  assert.equal(lienKetPancake('102938', '556677'), 'https://pancake.vn/102938?c_id=556677');
  assert.equal(lienKetPancake('102938', null), 'https://pancake.vn/102938');
  assert.equal(lienKetPancake('', 'c1'), null);
  // Id có ký tự lạ thì mã hoá, không để nó bẻ thuộc tính href của trang.
  assert.equal(lienKetPancake('p"x', 'c 1'), 'https://pancake.vn/p%22x?c_id=c%201');
});

test('L4-M1 · V3_POS_MAU_DON trống → không có đường POS (nút mờ), không dẫn tới 404', () => {
  const cu = process.env[BIEN_MAU_POS];
  delete process.env[BIEN_MAU_POS];
  try {
    assert.equal(mauPos(), null);
    assert.equal(daCauHinhPos(), false);
    assert.equal(lienKetPos('d1', { shopId: '77' }), null);
  } finally { if (cu !== undefined) process.env[BIEN_MAU_POS] = cu; }
});

test('L4-M1 · có mẫu POS thì dựng đường theo mẫu, thiếu shop thì thà không dựng', () => {
  const cu = process.env[BIEN_MAU_POS];
  process.env[BIEN_MAU_POS] = MAU_POS_MAC_DINH;
  try {
    assert.equal(lienKetPos('d1', { shopId: '77' }), 'https://pos.pages.fm/shops/77/orders/d1');
    assert.equal(lienKetPos('d1', {}), null, 'mẫu cần {shop} mà không biết shop → phải trả null');
    assert.equal(lienKetPos('', { shopId: '77' }), null);
    process.env[BIEN_MAU_POS] = 'https://pos.noi-bo/don/{don}';
    assert.equal(lienKetPos('d1', {}), 'https://pos.noi-bo/don/d1');
  } finally {
    if (cu === undefined) delete process.env[BIEN_MAU_POS]; else process.env[BIEN_MAU_POS] = cu;
  }
});

test('L4-M1 · chi tiết gắn sẵn hai đường, cả hai dựng từ hội thoại và ma_pos', async () => {
  const cu = process.env[BIEN_MAU_POS];
  process.env[BIEN_MAU_POS] = MAU_POS_MAC_DINH;
  try {
    noiKho();
    const d = await chiTietViec(bcT1, 'v_don', { bay: BAY });
    assert.equal(d.lienKet.pancake, 'https://pancake.vn/102938?c_id=102938_9911');
    assert.equal(d.lienKet.pos, 'https://pos.pages.fm/shops/77/orders/1024');

    const c = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
    assert.equal(c.lienKet.pos, null, 'việc không có đơn thì không có đường POS');
  } finally {
    if (cu === undefined) delete process.env[BIEN_MAU_POS]; else process.env[BIEN_MAU_POS] = cu;
  }
});

/* ═══════ tiêu chí 5 · đơn không gắn hội thoại → nút Pancake MỜ, không nổ ═══════ */

test('L4-M1 · việc loai="don_hang" không có hoi_thoai_id → pancake null, và KHÔNG ném', async () => {
  const cu = process.env[BIEN_MAU_POS];
  process.env[BIEN_MAU_POS] = MAU_POS_MAC_DINH;
  try {
    noiKho();
    const d = await chiTietViec(bcT1, 'v_don_le', { bay: BAY });
    assert.ok(d, 'màn chi tiết phải mở được — đơn không nối Messenger là chuyện thường');
    assert.equal(d.hoiThoai, null);
    assert.equal(d.khach, null, 'không có hội thoại thì cũng không có khách để tra');
    assert.equal(d.page, null);
    assert.equal(d.lienKet.pancake, null, 'không có hội thoại mà vẫn dựng đường Pancake');
    // Đường POS thì VẪN CÓ — đơn vẫn ở đó, chỉ là không đi từ Messenger.
    assert.equal(d.lienKet.pos, 'https://pos.pages.fm/shops/77/orders/2048');
  } finally {
    if (cu === undefined) delete process.env[BIEN_MAU_POS]; else process.env[BIEN_MAU_POS] = cu;
  }
});

test('L4-M1 · convIdCua dựng đúng khuôn <page_id_fb>_<psid>, thiếu vế nào thì null', () => {
  assert.equal(convIdCua({ psid: '9911' }, { page_id: '102938' }), '102938_9911');
  assert.equal(convIdCua({ psid: '9911' }, null), null, 'thiếu page thì thà không dựng');
  assert.equal(convIdCua({}, { page_id: '102938' }), null);
  assert.equal(convIdCua(null, { page_id: '102938' }), null);
});

test('L4-M1 · tachMaPos tách "<shop>:<số đơn POS>", dạng lạ thì coi cả chuỗi là số đơn', () => {
  assert.deepEqual(tachMaPos('77:1024'), { shop: '77', don: '1024' });
  assert.deepEqual(tachMaPos('1024'), { shop: null, don: '1024' });
  assert.deepEqual(tachMaPos(''), { shop: null, don: null });
  assert.deepEqual(tachMaPos(null), { shop: null, don: null });
});

/* ═══════ nửa dưới đọc ra được: trạng thái · tên người · một cột ly_do_dong ═══════ */

test('L4-M1 · việc đã đóng: trangThai=da_xu, tên người nhận TRA từ nguoi_dung, ly_do_dong tách sẵn', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_da_xu', { bay: BAY });
  assert.equal(d.viec.trangThai, TRANG_THAI.DA_XU);
  assert.equal(d.viec.tenNguoiNhan, 'Bình', 'phải tra bảng, không in bigint ra màn hình');
  assert.equal(d.viec.lyDoDongMa, 'khac');
  assert.equal(d.viec.lyDoDongGhiChu, 'khách bảo để tết tính');
  // Dòng `nguoi_dung` KHÔNG được đi ra ngoài: nó mang email và mật khẩu băm.
  assert.equal(d.nguoiDung, undefined);
  assert.equal(d.nguoiNhan, undefined);
  assert.ok(!JSON.stringify(d).includes('binh@shop.vn'), 'email người dùng lọt ra màn hình');
});

test('L4-M1 · người nhận không tra được → "(không rõ)", không lộ id', async () => {
  const h = hat();
  h.viec_can_xu_ly = h.viec_can_xu_ly.map((v) => (
    v.id === 'v_da_xu' ? { ...v, nguoi_nhan_id: 'u_bien_mat' } : v));
  noiKho(h);
  const d = await chiTietViec(bcT1, 'v_da_xu', { bay: BAY });
  assert.equal(d.viec.tenNguoiNhan, KHONG_RO_NGUOI);
  assert.ok(!String(d.viec.tenNguoiNhan).includes('u_bien_mat'));
});

/* ───────────────────────── tiêu chí 10 · không ghi ───────────────────── */

test('L4-M1 · mở màn chi tiết nhiều lần: kho trước/sau KHÔNG ĐỔI', async () => {
  const kho = noiKho();
  const truoc = anh(kho);
  await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  await chiTietViec(bcT1, 'v_don', { bay: BAY });
  await chiTietViec(bcT2, 'v_cua_t2', { bay: BAY });
  await chiTietViec(bcT1, 'v_cua_t2', { bay: BAY });
  assert.equal(anh(kho), truoc, 'màn chi tiết chỉ đọc mà kho đổi');
});
