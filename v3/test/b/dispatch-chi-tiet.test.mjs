// L4-M1 · màn chi tiết và hai đường nhảy — tiêu chí 3 (nửa dưới HTTP nằm ở
// `dispatch-router.test.mjs`), 5, 10, và luật "không có đơn thì `donHang: null`, không ném".
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI, LoiThieuBoiCanh } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, chiTietViec, LY_DO,
  lienKetPancake, lienKetPos, mauPos, daCauHinhPos, MAU_POS_MAC_DINH, BIEN_MAU_POS,
} from '../../src/ui/dispatch/index.js';

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;

const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

const tin = (id, teamId, phutTruoc, ben, chu, thua = {}) => ({
  id, team_id: teamId, page_id: 'p1', cust_id: 'k1',
  thoi_gian: BAY - phut(phutTruoc), ben, chu, ...thua,
});

function hat() {
  return {
    viec_can_xu_ly: [
      {
        id: 'v_chat', team_id: 't1', loai: 'hoi_thoai', trang_thai: 'cho',
        ly_do_ma: 'khieu_nai', ly_do: 'khách nhắn "hàng lỗi"',
        page_id: 'p1', cust_id: 'k1', conv_id: 'c9', don_hang_id: null,
        tao_luc: BAY - phut(12), han_luc: BAY - phut(2),
      },
      {
        id: 'v_don', team_id: 't1', loai: 'don', trang_thai: 'cho',
        ly_do_ma: 'don_can_duyet',
        page_id: 'p1', cust_id: 'k1', conv_id: 'c9', don_hang_id: 'd1',
        tao_luc: BAY - phut(3), han_luc: BAY + phut(7),
      },
      {
        id: 'v_cua_t2', team_id: 't2', loai: 'hoi_thoai', trang_thai: 'cho',
        ly_do_ma: 'doi_tra', page_id: 'p2', cust_id: 'k2', conv_id: 'c8',
        tao_luc: BAY - phut(4), han_luc: BAY + phut(6),
      },
    ],
    khach: [
      { id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' },
      { id: 'k2', team_id: 't2', ten: 'Khách team hai' },
    ],
    page: [
      { id: 'p1', team_id: 't1', ten: 'Tiểu Alpha Store', shop_id: '77' },
      { id: 'p2', team_id: 't2', ten: 'Auus Store' },
    ],
    hoi_thoai: [
      { id: 'ht1', team_id: 't1', conv_id: 'c9', page_id: 'p1', cust_id: 'k1', buoc: 'chot_gia' },
      { id: 'ht2', team_id: 't2', conv_id: 'c8', page_id: 'p2', cust_id: 'k2', buoc: 'chao' },
    ],
    don_hang: [
      { id: 'd1', team_id: 't1', ma_don: 'SO-1024', tong_tien: 249000, trang_thai: 'cho_xac_nhan', nguon: 'messenger' },
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

test('L4-M1 · chi tiết gom đủ: việc · khách · page · hội thoại · đoạn chat · lý do', async () => {
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
});

test('L4-M1 · không có đơn thì donHang là null, KHÔNG ném', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  assert.equal(d.donHang, null);

  const e = await chiTietViec(bcT1, 'v_don', { bay: BAY });
  assert.equal(e.donHang.ma_don, 'SO-1024');
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

/* ───────────────────────────── đoạn chat ───────────────────────────── */

test('L4-M1 · đoạn chat: lấy tin GẦN NHẤT nhưng xếp CŨ TRƯỚC để đọc như chat thật', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { soTin: 3, bay: BAY });
  assert.equal(d.doanChat.length, 3);
  assert.deepEqual(d.doanChat.map((t) => t.chu), ['hàng lỗi rồi', 'em xin lỗi chị', 'tin mới nhất']);
  for (let i = 1; i < d.doanChat.length; i++) {
    assert.ok(d.doanChat[i - 1].luc <= d.doanChat[i].luc, 'đoạn chat không phải cũ trước');
  }
});

test('L4-M1 · mỗi tin có đủ { luc, ben, chu, lane, maModel }', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  const t = d.doanChat.find((x) => x.chu === 'em xin lỗi chị');
  assert.deepEqual(t, { luc: BAY - phut(15), ben: 'bot', chu: 'em xin lỗi chị', lane: 'AI', maModel: 'kimi-k2.6' });
  assert.equal(d.doanChat.find((x) => x.chu === 'tin mới nhất').ben, 'khach');
  assert.equal(d.doanChat.find((x) => x.chu === 'tin cũ nhất').lane, null);
});

test('L4-M1 · đoạn chat không lấy nhầm tin của team khác', async () => {
  noiKho();
  const d = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
  assert.ok(!d.doanChat.some((t) => t.chu === 'tin của team hai'));
  assert.equal(d.doanChat.length, 5);
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

test('L4-M1 · chi tiết gắn sẵn hai đường; shop lấy từ page khi đơn không có', async () => {
  const cu = process.env[BIEN_MAU_POS];
  process.env[BIEN_MAU_POS] = MAU_POS_MAC_DINH;
  try {
    noiKho();
    const d = await chiTietViec(bcT1, 'v_don', { bay: BAY });
    assert.equal(d.lienKet.pancake, 'https://pancake.vn/p1?c_id=c9');
    assert.equal(d.lienKet.pos, 'https://pos.pages.fm/shops/77/orders/d1');

    const c = await chiTietViec(bcT1, 'v_chat', { bay: BAY });
    assert.equal(c.lienKet.pos, null, 'việc không có đơn thì không có đường POS');
  } finally {
    if (cu === undefined) delete process.env[BIEN_MAU_POS]; else process.env[BIEN_MAU_POS] = cu;
  }
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
