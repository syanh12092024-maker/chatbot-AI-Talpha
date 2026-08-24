// L4-M2 · đánh dấu đã xử — mười ba tiêu chí nghiệm thu, cộng ba việc điều phối viên giao
// thêm (nối chắn hai kiểu · trang HTML đá về đăng nhập · cột "Đang xử").
//
// Đồng hồ TIÊM VÀO (`bay`) chứ không chờ thật. Máy chủ là `node:http` cổng 0 rồi `fetch`
// vào — không thêm gói nào.
//
// HAI CHỖ BÀI TEST NÀY CỐ Ý KHẮT KHE HƠN BẢN GIẢ:
//   · cổng truy vấn bị bọc một lớp CẤM: chèn dòng hay xoá dòng trên `viec_can_xu_ly` là
//     ném ngay, kể cả khi lời gọi nằm trong giao dịch (tiêu chí 12, nửa lúc chạy)
//   · mỗi bài tự gieo lại kho, vì đóng việc là thao tác MỘT CHIỀU — bài trước đóng rồi thì
//     bài sau không còn gì để đóng, và cái hỏng sẽ trông như "409 đúng như mong đợi"

import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, datChanDangNhap, datChanVai, datPheuNhatKy, taoRouterDieuPhoi,
  nhanViec, dongViec, bangKetQua, bangLyDo, locTiep, muonTrang,
  KET_QUA, TRANG_THAI, COT_NUA_DUOI, CHI_PHI_TOI_DA, CHI_PHI_SO_LE,
  trangThaiCua, ghepLyDoDong, tachLyDoDong, KHONG_RO_NGUOI,
  LoiDaCoNguoiGiu, LoiDaDong, LoiThieuLyDo, LoiKetQuaLa, LoiChiPhiLa,
} from '../../src/ui/dispatch/index.js';

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;
const BANG = 'viec_can_xu_ly';

const bcAn = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcBinh = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u9', tenDangNhap: 'cuc', teamId: 't2', vai: [VAI.SALE] });

/* ────────────────────────────────── hạt giống ────────────────────────────────── */

/**
 * Một dòng `viec_can_xu_ly` đúng lược đồ thật: KHÔNG có `trang_thai`, không có cột người
 * nhận dạng chuỗi, không có cột ghi chú. Sáu cột nửa dưới ghi hẳn NULL ra — cột thật luôn
 * tồn tại, và cả điều kiện lọc lẫn công thức trạng thái đều đọc theo vế `IS NULL`.
 */
const nenViec = (thua) => ({
  team_id: 't1', hoi_thoai_id: 'ht1', don_hang_id: null,
  day_luc: BAY - phut(4), han_luc: BAY + phut(6),
  nguoi_nhan_id: null, nhan_luc: null,
  ket_qua: null, ly_do_dong: null, chi_phi: null, dong_luc: null,
  ...thua,
});

function hat() {
  return {
    viec_can_xu_ly: [
      nenViec({ id: 'w_ht', loai: 'hoi_thoai', ly_do_day: 'khieu_nai' }),
      nenViec({ id: 'w_ht2', loai: 'hoi_thoai', ly_do_day: 'ngoai_kich_ban' }),
      nenViec({ id: 'w_don', loai: 'don_hang', ly_do_day: 'don_can_duyet', don_hang_id: 'd1' }),
      nenViec({ id: 'w_don2', loai: 'don_hang', ly_do_day: 'don_sai_thong_tin', don_hang_id: 'd2' }),
      // Việc A vừa chèn xong, chưa ai đụng: cả sáu cột nửa dưới đều NULL.
      nenViec({ id: 'w_moi_day', loai: 'hoi_thoai', ly_do_day: 'qua_luot',
        day_luc: BAY - phut(2), han_luc: BAY + phut(8) }),
      nenViec({ id: 'w_an_giu', loai: 'hoi_thoai', ly_do_day: 'doi_tra',
        nguoi_nhan_id: 'u1', nhan_luc: BAY - phut(3) }),
      nenViec({ id: 'w_binh_giu', loai: 'hoi_thoai', ly_do_day: 'hoan_tien',
        nguoi_nhan_id: 'u2', nhan_luc: BAY - phut(2) }),
      nenViec({ id: 'w_da_xu', loai: 'don_hang', ly_do_day: 'trung_don', don_hang_id: 'd3',
        nguoi_nhan_id: 'u2', nhan_luc: BAY - phut(9),
        ket_qua: 'chot_duoc', ly_do_dong: null, chi_phi: 12000, dong_luc: BAY - phut(8) }),
      nenViec({ id: 'w_t2', team_id: 't2', loai: 'hoi_thoai', ly_do_day: 'doi_tra',
        hoi_thoai_id: 'ht2' }),
    ],
    hoi_thoai: [
      { id: 'ht1', team_id: 't1', page_id: 'p1', psid: '9911', khach_id: 'k1', trang_thai: 'SELLING', chu_so_huu: 'AI' },
      { id: 'ht2', team_id: 't2', page_id: 'p2', psid: '8822', khach_id: 'k2', trang_thai: 'GREET', chu_so_huu: 'AI' },
    ],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' }],
    page: [{ id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store', pos_shop_id: '77' }],
    // `nguoi_nhan_id` là khoá ngoại — tên người giữ việc nằm ở ĐÂY, không ở dòng việc.
    nguoi_dung: [
      { id: 'u1', email: 'an@shop.vn', ten: 'an' },
      { id: 'u2', email: 'binh@shop.vn', ten: 'binh' },
      { id: 'u9', email: 'cuc@shop.vn', ten: 'cuc' },
    ],
  };
}

/**
 * Lớp CẤM quanh cổng truy vấn — nửa lúc chạy của tiêu chí 12.
 * Bọc cả `giaoDich` vì bản giả gọi lại hàm trong đó bằng cổng GỐC; không bọc thì mọi lời
 * ghi trong giao dịch đi vòng qua lớp canh này, mà giao dịch đúng là chỗ module ghi.
 */
function congCanh(that, sai) {
  return new Proxy(that, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (k === 'giaoDich') return (fn) => v.call(t, (db2) => fn(congCanh(db2, sai)));
      if (k === 'them' || k === 'xoa') {
        return (...a) => {
          if (String(a[0]) === BANG) {
            sai.push(`${k}(${a[0]})`);
            throw new Error(`CẤM: module vừa gọi ${k} trên ${BANG} — hợp đồng B–A mục 4.`);
          }
          return v.apply(t, a);
        };
      }
      return (...a) => v.apply(t, a);
    },
  });
}

let kho = null;
let sai = [];
let nhatKy = [];

function noiKho() {
  kho = new KhoGia(hat());
  sai = [];
  nhatKy = [];
  datTaoTruyVan((bc) => congCanh(taoTruyVanGia(kho, bc), sai));
}

const dong = (id) => kho.docThang(BANG).find((r) => r.id === id) || null;
/** Trạng thái SUY RA từ dòng thật — bảng không có cột `trang_thai` để đọc thẳng. */
const tt = (id) => trangThaiCua(dong(id));
const anh = () => JSON.stringify(kho.docThang(BANG));
const soDong = () => kho.docThang(BANG).length;
const nhatKyMa = (ma) => nhatKy.filter((n) => n.hanhDong === ma);

datPheuNhatKy((boiCanh, ban) => { nhatKy.push({ boiCanh, ...ban }); return ban; });

/* ─────────── hai cái chắn của L0-M3, dựng lại đúng hình dạng để tiêm vào ─────────── */

const chanDangNhap = () => (req, res, next) => (
  req.boiCanh ? next() : res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' })
);
const chanVai = (...vai) => {
  const can = vai.flat().filter(Boolean).map(String);
  return (req, res, next) => {
    if (!req.boiCanh) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
    if (can.some((v) => req.boiCanh.vai.includes(v))) return next();
    return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: 'Không đủ quyền.' });
  };
};

datChanDangNhap(chanDangNhap);
datChanVai(chanVai);

beforeEach(noiKho);

/* ────────────────────────────────── máy chủ thật ────────────────────────────────── */

const app = express();
app.use((req, _res, next) => {
  const ai = req.headers['x-thu-ai'];
  if (ai) {
    const bo = { u1: bcAn, u2: bcBinh, u9: bcT2 }[String(ai)];
    if (bo) req.boiCanh = { ...bo, vai: [...bo.vai, ...String(req.headers['x-thu-vai'] || '').split(',').filter(Boolean)] };
  }
  next();
});
app.use(taoRouterDieuPhoi({ dongHo: () => BAY }));

const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref();
const goc = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((r) => server.close(r)));

async function goi(duong, { ai = 'u1', cach = 'GET', than, tieuDe = {}, theoChuyen = 'follow' } = {}) {
  const headers = { accept: 'application/json', ...tieuDe };
  if (ai) headers['x-thu-ai'] = ai;
  if (than !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(goc + duong, {
    method: cach,
    headers,
    body: than === undefined ? undefined : (typeof than === 'string' ? than : JSON.stringify(than)),
    redirect: theoChuyen,
  });
  const kieu = res.headers.get('content-type') || '';
  const noi = kieu.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { res, than: noi, kieu };
}

/* ══════════════════ tiêu chí 2 · nhận việc ══════════════════ */

test('L4-M2 · nhận việc → dang_xu, nguoi_nhan_id là người đăng nhập, nhan_luc có giá trị', async () => {
  const kq = await nhanViec(bcAn, 'w_ht', { bay: BAY });
  assert.equal(kq.ok, true);

  const r = dong('w_ht');
  assert.equal(tt('w_ht'), TRANG_THAI.DANG_XU);
  assert.equal(r.nguoi_nhan_id, 'u1');
  assert.equal(r.nhan_luc, BAY);
  // KHÔNG đẻ thêm cột nào ngoài sáu cột nửa dưới — bảng là của người A.
  assert.ok(!('trang_thai' in r), 'tự mọc cột trang_thai — lược đồ thật không có');
  assert.ok(!('nhan_boi_ten' in r), 'tự mọc cột tên người nhận — tên nằm ở `nguoi_dung`');
  // Không đụng nửa trên của dòng — đó cũng là của người A.
  assert.equal(r.ly_do_day, 'khieu_nai');
  assert.equal(r.han_luc, BAY + phut(6));
});

test('L4-M2 · nhận việc chỉ chạm ĐÚNG HAI cột; bốn cột đóng còn nguyên NULL', async () => {
  // Dòng A vừa chèn: cả sáu cột nửa dưới NULL. Nhận việc chỉ được đặt hai trong sáu —
  // đụng vào bốn cột kia là đóng việc hộ sale, mà đóng việc là đường một chiều.
  assert.equal(tt('w_moi_day'), TRANG_THAI.CHO);
  await nhanViec(bcAn, 'w_moi_day', { bay: BAY });

  const r = dong('w_moi_day');
  assert.equal(tt('w_moi_day'), TRANG_THAI.DANG_XU);
  assert.equal(r.nguoi_nhan_id, 'u1');
  assert.equal(r.nhan_luc, BAY);
  for (const cot of ['ket_qua', 'ly_do_dong', 'chi_phi', 'dong_luc']) {
    assert.equal(r[cot], null, `nhận việc mà đụng vào cột đóng: ${cot}`);
  }
});

test('L4-M2 · bấm "Nhận việc" hai lần: lần hai không ghi đè nhan_luc, không ghi nhật ký thừa', async () => {
  await nhanViec(bcAn, 'w_ht', { bay: BAY });
  const lucDau = dong('w_ht').nhan_luc;
  const lai = await nhanViec(bcAn, 'w_ht', { bay: BAY + phut(5) });
  assert.equal(lai.ok, true);
  assert.equal(lai.daGiuTuTruoc, true);
  assert.equal(dong('w_ht').nhan_luc, lucDau, 'ghi đè nhan_luc là xoá mất mốc giữ bao lâu');
  assert.equal(nhatKyMa('nhan_viec').length, 1);
});

/* ══════════════════ tiêu chí 3 · cướp việc ══════════════════ */

test('L4-M2 · nhận việc người khác đang giữ → 409, DỮ LIỆU KHÔNG ĐỔI', async () => {
  const truoc = anh();
  await assert.rejects(
    () => nhanViec(bcAn, 'w_binh_giu', { bay: BAY }),
    (e) => e instanceof LoiDaCoNguoiGiu && e.status === 409 && e.ma === 'da_co_nguoi_giu'
      && /binh/.test(e.message) && e.nguoiGiu === 'binh',
  );
  assert.equal(anh(), truoc, 'lần 409 vẫn ghi xuống kho');
  assert.equal(nhatKyMa('nhan_viec').length, 0, 'lần bị chặn không được ghi như một lần nhận');
});

test('L4-M2 · nhận lại việc đã đóng → 409 da_dong', async () => {
  await assert.rejects(
    () => nhanViec(bcAn, 'w_da_xu', { bay: BAY }),
    (e) => e instanceof LoiDaDong && e.status === 409,
  );
  assert.equal(tt('w_da_xu'), TRANG_THAI.DA_XU);
});

/* ══════════════════ tiêu chí 4 · đóng thẳng từ `cho` ══════════════════ */

test('L4-M2 · đóng việc đang ở `cho` → nhận hộ và đóng trong MỘT lần, người đóng là người nhận', async () => {
  const kq = await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(kq.nhanHo, true);

  const r = dong('w_don');
  assert.equal(tt('w_don'), TRANG_THAI.DA_XU);
  assert.equal(r.nguoi_nhan_id, 'u1');
  assert.equal(r.nhan_luc, BAY);
  assert.equal(r.dong_luc, BAY);
  assert.equal(r.ket_qua, 'chot_duoc');
  assert.equal(r.chi_phi, 250000);

  // Một thao tác của sale = một dòng nhật ký, nói rõ là đã nhận hộ.
  assert.equal(nhatKyMa('dong_viec').length, 1);
  assert.equal(nhatKyMa('nhan_viec').length, 0);
  assert.match(nhatKyMa('dong_viec')[0].ghiChu, /nhận hộ/);
});

test('L4-M2 · đóng việc mình đang giữ thì không đụng lại nhan_luc', async () => {
  const truoc = dong('w_an_giu').nhan_luc;
  const kq = await dongViec(bcAn, 'w_an_giu', { ketQua: 'da_xu_ngoai', bay: BAY });
  assert.equal(kq.nhanHo, false);
  assert.equal(dong('w_an_giu').nhan_luc, truoc);
  assert.equal(dong('w_an_giu').dong_luc, BAY);
});

test('L4-M2 · đóng việc người khác đang giữ → 409, không cướp im lặng', async () => {
  const truoc = anh();
  await assert.rejects(
    () => dongViec(bcAn, 'w_binh_giu', { ketQua: 'da_xu_ngoai', bay: BAY }),
    (e) => e instanceof LoiDaCoNguoiGiu && e.status === 409 && /binh/.test(e.message),
  );
  assert.equal(anh(), truoc);
});

/* ══════════════════ tiêu chí 5 · không ghi đè việc đã đóng ══════════════════ */

test('L4-M2 · đóng lại việc đã `da_xu` → 409, ket_qua CŨ không bị ghi đè', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_da_xu', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', bay: BAY }),
    (e) => e instanceof LoiDaDong && e.status === 409 && e.ma === 'da_dong'
      && /binh/.test(e.message) && e.ketQua === 'chot_duoc',
  );
  const r = dong('w_da_xu');
  assert.equal(r.ket_qua, 'chot_duoc', 'kết quả cũ bị ghi đè');
  assert.equal(r.chi_phi, 12000);
  assert.equal(r.dong_luc, BAY - phut(8));
  assert.equal(nhatKyMa('dong_viec').length, 0);
});

/* ══════════════════ tiêu chí 6 · 7 · lý do và ghi chú ══════════════════ */

test('L4-M2 · khach_tu_choi không lý do → 400; có lý do → qua', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.status === 400 && e.ma === 'thieu_ly_do',
  );
  assert.equal(tt('w_ht'), TRANG_THAI.CHO, 'lần 400 vẫn ghi xuống kho');

  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(dong('w_ht').ly_do_dong, 'gia_cao');
  assert.deepEqual(tachLyDoDong(dong('w_ht').ly_do_dong), { ma: 'gia_cao', ghiChu: null });
});

test('L4-M2 · day_nham cũng bắt buộc lý do, và lý do lạ thì 400 chứ không nuốt', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'day_nham', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.ma === 'thieu_ly_do',
  );
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'day_nham', lyDo: 'gia_cao', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.ma === 'ly_do_la',
  );
  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'day_nham', lyDo: 'bot_hieu_sai', bay: BAY });
  assert.equal(kq.ok, true);
});

test('L4-M2 · lyDo="khac" mà ghiChu rỗng → 400; đủ 5 ký tự → qua', async () => {
  for (const ghiChu of [undefined, '', '   ', 'ngắn']) {
    await assert.rejects(
      () => dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', lyDo: 'khac', ghiChu, bay: BAY }),
      (e) => e instanceof LoiThieuLyDo && e.status === 400 && e.ma === 'thieu_ghi_chu',
      `ghiChu=${JSON.stringify(ghiChu)}`,
    );
  }
  const kq = await dongViec(bcAn, 'w_ht', {
    ketQua: 'khach_tu_choi', lyDo: 'khac', ghiChu: 'khách bảo để tết tính', bay: BAY,
  });
  assert.equal(kq.ok, true);
  // Không có cột `ghi_chu` trong lược đồ thật: mã lý do và ghi chú đi CHUNG `ly_do_dong`,
  // theo khuôn của `ghepLyDoDong`. Không vế nào bị nuốt.
  assert.equal(dong('w_ht').ly_do_dong, ghepLyDoDong('khac', 'khách bảo để tết tính'));
  assert.deepEqual(tachLyDoDong(dong('w_ht').ly_do_dong),
    { ma: 'khac', ghiChu: 'khách bảo để tết tính' });
});

test('L4-M2 · kết quả không có bảng lý do mà vẫn gửi lý do → 400, không nuốt im lặng', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'khach_khong_tra_loi', lyDo: 'gia_cao', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.ma === 'ly_do_la',
  );
  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'khach_khong_tra_loi', bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(dong('w_ht').ly_do_dong, null);
});

/* ══════════════════ tiêu chí 8 · ô chi phí ══════════════════ */

test('L4-M2 · chi phí: hội thoại mà truyền chiPhi → 400', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY }),
    (e) => e instanceof LoiChiPhiLa && e.status === 400,
  );
  assert.equal(tt('w_ht'), TRANG_THAI.CHO);
});

test('L4-M2 · chi phí: số âm và chữ đều 400, KHÔNG âm thầm quy về 0', async () => {
  // `12.5` KHÔNG còn nằm ở đây: cột thật là numeric(14,2), phần lẻ là hợp lệ.
  for (const xau of [-1, '-250000', 'nhiều', '12.555', '1e5', ' 20 000 ', '.5', '12.']) {
    await assert.rejects(
      () => dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: xau, bay: BAY }),
      (e) => e instanceof LoiChiPhiLa && e.status === 400,
      `chiPhi=${JSON.stringify(xau)}`,
    );
  }
  await assert.rejects(
    () => dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: CHI_PHI_TOI_DA + 1, bay: BAY }),
    (e) => e instanceof LoiChiPhiLa,
  );
  assert.equal(dong('w_don').chi_phi, null);
});

test('L4-M2 · chi phí: numeric(14,2) — 250000.50 lưu và đọc ra ĐÚNG 250000.5, không ép nguyên', async () => {
  // Bản cũ của B ép `^\d+$` nên số này bị chặn ngay ở cửa. Cột thật giữ hai chữ số lẻ, mà
  // tiền vùng Vịnh vốn có phần lẻ — ép nguyên là làm sai tiền một cách im lặng.
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 250000.50, bay: BAY });
  assert.equal(dong('w_don').chi_phi, 250000.5);
  assert.equal(typeof dong('w_don').chi_phi, 'number');

  noiKho();
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: '0.25', bay: BAY });
  assert.equal(dong('w_don').chi_phi, 0.25);

  // Quá hai chữ số lẻ thì 400 — cột chỉ giữ hai, làm tròn im lặng là mất tiền chỗ khó thấy.
  noiKho();
  await assert.rejects(
    () => dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: '1.005', bay: BAY }),
    (e) => e instanceof LoiChiPhiLa && e.status === 400,
  );
  assert.equal(CHI_PHI_SO_LE, 2);
});

test('L4-M2 · chi phí: đơn + chot_duoc + 250000 → lưu đúng 250000; để trống → null; 0 → 0', async () => {
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY });
  assert.equal(dong('w_don').chi_phi, 250000);

  await dongViec(bcAn, 'w_don2', { ketQua: 'chot_duoc', chiPhi: '', bay: BAY });
  assert.equal(dong('w_don2').chi_phi, null, 'để trống được, không phải đơn nào cũng biết ngay');

  noiKho();
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 0, bay: BAY });
  assert.equal(dong('w_don').chi_phi, 0, '0 là "không tốn gì", khác hẳn "chưa biết"');
});

test('L4-M2 · chi phí: đơn nhưng kết quả không phải chot_duoc → 400', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_don', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', chiPhi: 5000, bay: BAY }),
    (e) => e instanceof LoiChiPhiLa,
  );
});

/* ══════════════════ tiêu chí 9 · kết quả theo loại việc ══════════════════ */

test('L4-M2 · tra_lai_bot với loai="don" → 400; với hội thoại → qua', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_don', { ketQua: 'tra_lai_bot', bay: BAY }),
    (e) => e instanceof LoiKetQuaLa && e.status === 400 && e.ma === 'ket_qua_la',
  );
  assert.equal(tt('w_don'), TRANG_THAI.CHO);

  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'tra_lai_bot', bay: BAY });
  assert.equal(kq.ok, true);
});

test('L4-M2 · kết quả lạ hoặc rỗng → 400 ket_qua_la, kể cả tên thuộc tính của Object', async () => {
  for (const kq of [undefined, '', 'lung_tung', 'constructor', '__proto__', 'toString']) {
    await assert.rejects(
      () => dongViec(bcAn, 'w_ht', { ketQua: kq, bay: BAY }),
      (e) => e instanceof LoiKetQuaLa && e.status === 400,
      `ketQua=${JSON.stringify(kq)}`,
    );
  }
});

/* ══════════════════ tiêu chí 10 · team khác ══════════════════ */

test('L4-M2 · nhận/đóng việc của team khác → không thấy (→404), dữ liệu KHÔNG đổi', async () => {
  const truoc = anh();
  assert.equal(await nhanViec(bcAn, 'w_t2', { bay: BAY }), null);
  assert.equal(await dongViec(bcAn, 'w_t2', { ketQua: 'da_xu_ngoai', bay: BAY }), null);
  assert.equal(await dongViec(bcAn, 'khong-co-that', { ketQua: 'da_xu_ngoai', bay: BAY }), null);
  assert.equal(anh(), truoc);

  // Cùng id đó, đúng team, thì đóng được — chứng minh `null` kia là do lớp team.
  const kq = await dongViec(bcT2, 'w_t2', { ketQua: 'da_xu_ngoai', bay: BAY });
  assert.equal(kq.ok, true);
});

/* ══════════════════ người giữ việc là KHOÁ NGOẠI, không phải chuỗi tên ══════════════════ */

test('L4-M2 · 409 gọi TÊN người giữ, tra từ `nguoi_dung` — không phun bigint ra cho sale', async () => {
  await assert.rejects(
    () => nhanViec(bcAn, 'w_binh_giu', { bay: BAY }),
    (e) => e.nguoiGiu === 'binh' && /Việc này binh đang giữ/.test(e.message),
  );
  // Câu lỗi tuyệt đối không được chứa id trần — 'u2' là thứ sale không tra được vào đâu.
  await assert.rejects(
    () => nhanViec(bcAn, 'w_binh_giu', { bay: BAY }),
    (e) => !/\bu2\b/.test(e.message),
  );
});

test('L4-M2 · người giữ không còn trong `nguoi_dung` → "(không rõ)", KHÔNG lộ id', async () => {
  // `nguoi_nhan_id` là FK `ON DELETE SET NULL`, nhưng dữ liệu cũ vẫn có thể trỏ vào một id
  // không tra ra. Lúc đó thà nói "(không rõ)" còn hơn dán một con số vào mặt sale.
  for (const r of kho.docThang(BANG)) {
    if (r.id === 'w_binh_giu') r.nguoi_nhan_id = 'u_bien_mat';
  }
  await assert.rejects(
    () => nhanViec(bcAn, 'w_binh_giu', { bay: BAY }),
    (e) => e.nguoiGiu === KHONG_RO_NGUOI && !/u_bien_mat/.test(e.message),
  );
});

/* ══════════════════ tiêu chí 11 · nhật ký ══════════════════ */

test('L4-M2 · nhận và đóng đều ghi ĐÚNG MỘT dòng nhật ký, có truoc/sau là chín cột nửa dưới', async () => {
  await nhanViec(bcAn, 'w_ht', { bay: BAY });
  const gNhan = nhatKyMa('nhan_viec');
  assert.equal(gNhan.length, 1);
  assert.equal(gNhan[0].doiTuongLoai, BANG);
  assert.equal(gNhan[0].doiTuongId, 'w_ht');
  assert.equal(gNhan[0].boiCanh.nguoiDungId, 'u1');
  assert.equal(gNhan[0].truoc.nguoi_nhan_id, null);
  assert.equal(gNhan[0].truoc.dong_luc, null);
  assert.equal(gNhan[0].sau.nguoi_nhan_id, 'u1');
  assert.equal(trangThaiCua(gNhan[0].truoc), TRANG_THAI.CHO);
  assert.equal(trangThaiCua(gNhan[0].sau), TRANG_THAI.DANG_XU);
  assert.deepEqual(Object.keys(gNhan[0].sau), [...COT_NUA_DUOI]);
  assert.equal(COT_NUA_DUOI.length, 6, 'nửa dưới của lược đồ thật là SÁU cột');

  await dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', bay: BAY + 1000 });
  const gDong = nhatKyMa('dong_viec');
  assert.equal(gDong.length, 1);
  assert.equal(gDong[0].truoc.ket_qua, null);
  assert.equal(gDong[0].sau.ket_qua, 'khach_tu_choi');
  assert.equal(gDong[0].sau.ly_do_dong, 'gia_cao');
  assert.equal(gDong[0].sau.dong_luc, BAY + 1000);
  assert.match(gDong[0].ghiChu, /Khách từ chối/);

  // Nhật ký chỉ mang chín cột nửa dưới — không kèm cả dòng, không kèm dữ liệu khách.
  for (const cot of ['hoi_thoai_id', 'don_hang_id', 'loai', 'ly_do_day', 'han_luc', 'day_luc']) {
    assert.ok(!(cot in gDong[0].sau), `nhật ký mang theo cột ${cot} của người A`);
  }
});

/* ══════════════════ tiêu chí 12 · không chèn, không xoá ══════════════════ */

test('L4-M2 · quét mã nguồn: không file nào trong module gọi hàm chèn dòng hay xoá dòng', () => {
  const thuMuc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui/dispatch');
  const dsFile = fs.readdirSync(thuMuc).filter((f) => f.endsWith('.js'));
  assert.ok(dsFile.includes('dong-viec.js'), 'không tìm thấy module cần quét');

  for (const f of dsFile) {
    const ma = fs.readFileSync(path.join(thuMuc, f), 'utf8');
    for (const cam of ['.them(', '.xoa(']) {
      assert.ok(!ma.includes(cam), `${f} có ${cam} — vai B không chèn/xoá dòng nào (hợp đồng mục 4)`);
    }
    for (const sql of [/\bINSERT\s+INTO\b/i, /\bDELETE\s+FROM\b/i, /\bTRUNCATE\b/i]) {
      assert.ok(!sql.test(ma), `${f} có câu SQL ghi thẳng: ${sql}`);
    }
  }
});

test('L4-M2 · lúc chạy: gọi hết mọi đường ghi rồi đếm — SỐ DÒNG không đổi, không lần chèn/xoá nào', async () => {
  const truoc = soDong();
  await nhanViec(bcAn, 'w_ht', { bay: BAY });
  await dongViec(bcAn, 'w_ht', { ketQua: 'da_xu_ngoai', bay: BAY });
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 1000, bay: BAY });
  await goi('/api/dieu-phoi/viec/w_ht2/nhan', { cach: 'POST', than: {} });
  await goi('/api/dieu-phoi/viec/w_ht2/dong', { cach: 'POST', than: { ketQua: 'tra_lai_bot' } });
  assert.deepEqual(sai, [], 'module gọi hàm chèn/xoá trên bảng việc');
  assert.equal(soDong(), truoc, 'số dòng của viec_can_xu_ly đổi');
});

/* ══════════════════ tiêu chí 13 · hai người bấm cùng lúc ══════════════════ */

test('L4-M2 · hai lời gọi nhanViec đồng thời trên cùng một việc → ĐÚNG MỘT thành công', async () => {
  const kq = await Promise.allSettled([
    nhanViec(bcAn, 'w_ht', { bay: BAY }),
    nhanViec(bcBinh, 'w_ht', { bay: BAY }),
  ]);
  const duoc = kq.filter((k) => k.status === 'fulfilled');
  const hong = kq.filter((k) => k.status === 'rejected');
  assert.equal(duoc.length, 1, 'cả hai cùng thắng — thiếu điều kiện nửa dưới lúc ghi');
  assert.equal(hong.length, 1);
  assert.ok(hong[0].reason instanceof LoiDaCoNguoiGiu);

  const r = dong('w_ht');
  assert.equal(tt('w_ht'), TRANG_THAI.DANG_XU);
  assert.ok(['u1', 'u2'].includes(r.nguoi_nhan_id));
  assert.equal(nhatKyMa('nhan_viec').length, 1, 'người thua vẫn ghi một dòng "đã nhận"');
});

test('L4-M2 · hai lời gọi dongViec đồng thời → đúng một thành công, kết quả người thắng còn nguyên', async () => {
  const kq = await Promise.allSettled([
    dongViec(bcAn, 'w_ht', { ketQua: 'chot_duoc', bay: BAY }),
    dongViec(bcBinh, 'w_ht', { ketQua: 'day_nham', lyDo: 'trung_viec', bay: BAY }),
  ]);
  assert.equal(kq.filter((k) => k.status === 'fulfilled').length, 1);
  const thang = kq.find((k) => k.status === 'fulfilled').value;
  assert.equal(dong('w_ht').ket_qua, thang.viec.ket_qua);
  assert.equal(tt('w_ht'), TRANG_THAI.DA_XU);
});

/* ══════════════════ bảng kết quả và lý do ══════════════════ */

test('L4-M2 · bangKetQua theo loại: tra_lai_bot chỉ cho hội thoại, ô chi phí chỉ cho đơn', () => {
  const don = bangKetQua('don_hang');
  const ht = bangKetQua('hoi_thoai');
  assert.ok(!don.some((k) => k.ma === 'tra_lai_bot'), 'đơn không có "trả lại cho bot"');
  assert.ok(ht.some((k) => k.ma === 'tra_lai_bot'));

  assert.equal(don.find((k) => k.ma === 'chot_duoc').coChiPhi, true);
  assert.equal(ht.find((k) => k.ma === 'chot_duoc').coChiPhi, false, 'hội thoại không có ô chi phí');
  assert.equal(don.find((k) => k.ma === 'khach_tu_choi').coChiPhi, false);

  // Kết quả đầu danh sách là cái sale bấm nhiều nhất.
  assert.equal(don[0].ma, 'chot_duoc');
  assert.deepEqual(Object.keys(KET_QUA).length, 6);

  assert.throws(() => bangKetQua('lung_tung'), (e) => e.ma === 'loai_la' && e.status === 400);
});

test('L4-M2 · bangLyDo: đúng hai kết quả có bảng lý do, "khác" đòi ghi chú', () => {
  assert.deepEqual(bangLyDo('khach_tu_choi').map((x) => x.ma),
    ['gia_cao', 'khong_tin', 'da_mua_cho_khac', 'khong_can_nua', 'giao_lau', 'khac']);
  assert.deepEqual(bangLyDo('day_nham').map((x) => x.ma),
    ['bot_hieu_sai', 'khach_hoi_binh_thuong', 'trung_viec', 'loi_ky_thuat', 'khac']);
  assert.deepEqual(bangLyDo('chot_duoc'), []);
  assert.deepEqual(bangLyDo('khong-co-that'), []);
  assert.equal(bangLyDo('khach_tu_choi').find((x) => x.ma === 'khac').canGhiChu, true);
  // Cùng một mã thì cùng một chuỗi chữ với bảng lý do của L4-M1 — hai màn không được nói khác nhau.
  assert.equal(bangLyDo('day_nham').find((x) => x.ma === 'loi_ky_thuat').chu,
    'Lỗi kỹ thuật, bot không trả lời được');
});

/* ══════════════════ đường HTTP ══════════════════ */

test('L4-M2 HTTP · POST nhan rồi POST dong: 200, và trạng thái đổi đúng', async () => {
  const a = await goi('/api/dieu-phoi/viec/w_ht/nhan', { cach: 'POST', than: {} });
  assert.equal(a.res.status, 200);
  assert.equal(a.than.ok, true);
  assert.equal(tt('w_ht'), TRANG_THAI.DANG_XU);

  const b = await goi('/api/dieu-phoi/viec/w_ht/dong', {
    cach: 'POST', than: { ketQua: 'khach_tu_choi', lyDo: 'khac', ghiChu: 'khách chặn tin' },
  });
  assert.equal(b.res.status, 200);
  assert.equal(b.than.viec.ket_qua, 'khach_tu_choi');
  assert.equal(tachLyDoDong(dong('w_ht').ly_do_dong).ghiChu, 'khách chặn tin');
});

test('L4-M2 HTTP · 409 trả THẲNG thông điệp máy chủ, kèm tên người giữ', async () => {
  const r = await goi('/api/dieu-phoi/viec/w_binh_giu/nhan', { cach: 'POST', than: {} });
  assert.equal(r.res.status, 409);
  assert.equal(r.than.ma, 'da_co_nguoi_giu');
  assert.match(r.than.thongDiep, /Việc này binh đang giữ từ /);
  assert.equal(r.than.nguoiGiu, 'binh');
  assert.ok(!/Xem log máy chủ/.test(r.than.thongDiep), 'thông điệp bị nuốt thành lỗi chung');

  const d = await goi('/api/dieu-phoi/viec/w_da_xu/dong', {
    cach: 'POST', than: { ketQua: 'da_xu_ngoai' },
  });
  assert.equal(d.res.status, 409);
  assert.equal(d.than.ma, 'da_dong');
  assert.match(d.than.thongDiep, /đã đóng lúc/);
});

test('L4-M2 HTTP · 400 cho lý do thiếu và chi phí lạ; 404 cho việc team khác', async () => {
  const a = await goi('/api/dieu-phoi/viec/w_ht/dong', { cach: 'POST', than: { ketQua: 'khach_tu_choi' } });
  assert.equal(a.res.status, 400);
  assert.equal(a.than.ma, 'thieu_ly_do');

  const b = await goi('/api/dieu-phoi/viec/w_don/dong', {
    cach: 'POST', than: { ketQua: 'chot_duoc', chiPhi: '-5' },
  });
  assert.equal(b.res.status, 400);
  assert.equal(b.than.ma, 'chi_phi_la');

  for (const duong of ['/api/dieu-phoi/viec/w_t2/nhan', '/api/dieu-phoi/viec/w_t2/dong']) {
    const c = await goi(duong, { cach: 'POST', than: { ketQua: 'da_xu_ngoai' } });
    assert.equal(c.res.status, 404, duong);
    assert.notEqual(c.res.status, 403, '403 là xác nhận dòng đó có thật');
    assert.equal(c.than.ma, 'khong_thay');
  }
});

test('L4-M2 HTTP · thân không phải JSON → 400 gọn, không phun HTML kèm stack', async () => {
  const r = await goi('/api/dieu-phoi/viec/w_ht/dong', { cach: 'POST', than: '{ket' });
  assert.equal(r.res.status, 400);
  assert.equal(r.than.ma, 'than_hong');
  assert.ok(!/<html/i.test(JSON.stringify(r.than)));
});

test('L4-M2 HTTP · GET bang-ket-qua trả bảng cho màn hình, loại lạ → 400', async () => {
  const r = await goi('/api/dieu-phoi/bang-ket-qua?loai=don_hang');
  assert.equal(r.res.status, 200);
  assert.equal(r.than.loai, 'don_hang');
  assert.deepEqual(r.than.ketQua.map((k) => k.ma),
    ['chot_duoc', 'khach_tu_choi', 'khach_khong_tra_loi', 'da_xu_ngoai', 'day_nham']);
  assert.equal(r.than.ketQua[0].coChiPhi, true);
  assert.equal(r.than.ketQua[1].lyDo.length, 6);

  const xau = await goi('/api/dieu-phoi/bang-ket-qua?loai=lung_tung');
  assert.equal(xau.res.status, 400);
  assert.equal(xau.than.ma, 'loai_la');
});

test('L4-M2 HTTP · hai đường POST vẫn bắt đăng nhập và vai', async () => {
  const chuaVao = await goi('/api/dieu-phoi/viec/w_ht/nhan', { cach: 'POST', than: {}, ai: null });
  assert.equal(chuaVao.res.status, 401);
  assert.equal(tt('w_ht'), TRANG_THAI.CHO);

  const xuyenTeam = await goi('/api/dieu-phoi/viec/w_ht/nhan?team_id=t2', { cach: 'POST', than: {} });
  assert.equal(xuyenTeam.res.status, 403);
  assert.equal(xuyenTeam.than.ma, 'chan_xuyen_team');
  assert.equal(tt('w_ht'), TRANG_THAI.CHO);
});

/* ══════════════════ hai trang HTML ══════════════════ */

test('L4-M2 · màn chi tiết đắp vào đúng ô đã chừa, không mọc ô soạn tin', async () => {
  const { res, than } = await goi('/viec/w_ht', { tieuDe: { accept: 'text/html' } });
  assert.equal(res.status, 200);
  assert.match(than, /id="o-dong-viec"><\/div>/, 'đổi mất id của ô đã chừa');
  assert.match(than, /Đánh dấu đã xử/);
  assert.match(than, /Nhận việc/);
  assert.match(than, /Đóng việc/);
  assert.match(than, /bang-ket-qua/);
  assert.match(than, /Đã xử bởi /);
  assert.ok(!/<textarea/.test(than), 'màn chi tiết mọc ô soạn tin — 01-QUYET-DINH mục 10');
  // Các khối của L4-M1 còn nguyên. Khối "Đoạn chat" ĐÃ BỎ ngày 23/08 (chủ dự án duyệt):
  // `so_ai` không giữ nội dung tin và không có tin của khách, nên dựng ở đây là dựng một
  // nửa cuộc nói chuyện — bản đầy đủ nằm ở Pancake. Chỗ đó nay là một dòng chỉ đường.
  assert.match(than, /Mở Pancake/);
  assert.match(than, /Thông tin đơn/);
  assert.ok(!/Đoạn chat/.test(than), 'đoạn chat mọc lại — xem ghi chú đầu chi-tiet.js');
  assert.match(than, /Hội thoại đầy đủ nằm ở Pancake/);
});

test('L4-M2 · bảng điều phối có ĐÚNG MỘT cột "Đang xử" và ở khổ hẹp thì xếp thẻ', async () => {
  const { than } = await goi('/dieu-phoi', { tieuDe: { accept: 'text/html' } });
  assert.equal((than.match(/>Đang xử</g) || []).length, 2, 'hai bảng, mỗi bảng đúng một cột');
  assert.match(than, /colspan="5"/, 'dòng "không có việc nào" phải trải hết năm cột');
  assert.match(than, /@media \(max-width:720px\)/);
  assert.match(than, /td\.c-dem\{grid-column:2\/-1;grid-row:1/, 'đồng hồ phải nằm ở hàng đầu của thẻ');
  assert.match(than, /trangThai !== 'dang_xu'/, 'cột Đang xử phải trống khi việc còn ở `cho`');
  assert.ok(!/<textarea/.test(than));
});

/* ══════════════════ việc thêm 1 · nối chắn hai kiểu ══════════════════ */

test('L4-M2 · nối CÁI CHẮN ĐÃ DỰNG (req,res,next) thì mọi đường vẫn chạy', async () => {
  datChanDangNhap(chanDangNhap());          // ← đã dựng, kiểu người ta hay viết
  datChanVai(chanVai(VAI.SALE, VAI.QUAN_TRI));   // hằng, không gõ lại chuỗi mã vai
  try {
    const r = await goi('/api/dieu-phoi/viec/w_ht/nhan', { cach: 'POST', than: {} });
    assert.equal(r.res.status, 200, 'nối cái chắn đã dựng mà nổ — đó là lỗi req undefined');
    assert.equal(tt('w_ht'), TRANG_THAI.DANG_XU);

    const chuaVao = await goi('/api/dieu-phoi/tom-tat', { ai: null });
    assert.equal(chuaVao.res.status, 401);
  } finally {
    datChanDangNhap(chanDangNhap);
    datChanVai(chanVai);
  }
});

test('L4-M2 · nối một thứ không phải hàm → NÉM NGAY LÚC NỐI, không đợi tới lúc có yêu cầu', () => {
  for (const xau of [123, 'batBuocDangNhap', {}, [], true]) {
    assert.throws(() => datChanDangNhap(xau), TypeError, `datChanDangNhap(${JSON.stringify(xau)})`);
    assert.throws(() => datChanVai(xau), TypeError);
  }
  // `null` vẫn là "tháo dây ra" — không phải lỗi.
  assert.doesNotThrow(() => { datChanDangNhap(null); datChanDangNhap(chanDangNhap); });
  // Hàm dựng trả về thứ không phải middleware cũng chặn ngay tại chỗ nối.
  assert.throws(() => datChanDangNhap(() => 'không phải hàm'), TypeError);
});

test('L4-M2 · cái chắn ném ra → 500 chan_hong, KHÔNG để stack trace rơi ra trình duyệt', async () => {
  const loiCu = console.error;
  console.error = () => {};
  datChanDangNhap((_req, _res, _next) => { throw new Error('vé hỏng ở tầng dưới'); });
  try {
    const r = await goi('/api/dieu-phoi/tom-tat');
    assert.equal(r.res.status, 500);
    assert.equal(r.than.ma, 'chan_hong');
    assert.ok(!/vé hỏng ở tầng dưới/.test(JSON.stringify(r.than)), 'lỗi trong ruột lọt ra ngoài');
    assert.ok(!/at .*router\.js/.test(JSON.stringify(r.than)), 'stack trace lọt ra ngoài');
  } finally {
    console.error = loiCu;
    datChanDangNhap(chanDangNhap);
  }
  assert.equal((await goi('/api/dieu-phoi/tom-tat')).res.status, 200, 'nối lại là chạy ngay');
});

/* ══════════════════ việc thêm 2 · trang HTML đá về đăng nhập ══════════════════ */

test('L4-M2 · vé hết hạn + mở TRANG bằng trình duyệt → 302 sang /dang-nhap kèm nơi định tới', async () => {
  const acceptTrinhDuyet = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  for (const [duong, mong] of [
    ['/dieu-phoi', '/dang-nhap?tiep=%2Fdieu-phoi'],
    ['/viec/w1', '/dang-nhap?tiep=%2Fviec%2Fw1'],
  ]) {
    const r = await goi(duong, { ai: null, tieuDe: { accept: acceptTrinhDuyet }, theoChuyen: 'manual' });
    assert.equal(r.res.status, 302, duong);
    assert.equal(r.res.headers.get('location'), mong, duong);
  }
});

test('L4-M2 · cũng đường đó nhưng là fetch/máy gọi máy → vẫn 401 JSON, không chuyển hướng', async () => {
  for (const duong of ['/api/dieu-phoi/hang-cho', '/api/dieu-phoi/tom-tat', '/api/dieu-phoi/viec/w_ht']) {
    const r = await goi(duong, { ai: null, theoChuyen: 'manual' });
    assert.equal(r.res.status, 401, duong);
    assert.equal(r.than.ma, 'chua_dang_nhap', duong);
  }
  // Hai đường TRANG với `Accept: application/json` (đúng thứ `fetch` của trang gửi) cũng vậy.
  for (const duong of ['/dieu-phoi', '/viec/w1']) {
    const r = await goi(duong, { ai: null, theoChuyen: 'manual' });
    assert.equal(r.res.status, 401, duong);
    assert.equal(r.than.ma, 'chua_dang_nhap', duong);
  }
  assert.equal(muonTrang({ xhr: false, accepts: () => 'json' }), false);
  assert.equal(muonTrang({ xhr: true, accepts: () => 'html' }), false, 'XHR thì không phải người mở trang');
});

test('L4-M2 · tiep chỉ nhận đường dẫn nội bộ — //evil.com bị bỏ, về /dieu-phoi', async () => {
  for (const xau of ['//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com', '', null, 123]) {
    assert.equal(locTiep(xau), '/dieu-phoi', `locTiep(${JSON.stringify(xau)})`);
  }
  assert.equal(locTiep('/viec/w1?x=1'), '/viec/w1?x=1');

  const r = await goi('/dieu-phoi?tiep=%2F%2Fevil.com', {
    ai: null, tieuDe: { accept: 'text/html,application/xhtml+xml' }, theoChuyen: 'manual',
  });
  assert.equal(r.res.status, 302);
  assert.equal(r.res.headers.get('location'), '/dang-nhap?tiep=%2Fdieu-phoi');
});

test('L4-M2 · thiếu vai + mở trang → trang lỗi gọn có nút đăng xuất, KHÔNG đá về đăng nhập', async () => {
  const app2 = express();
  app2.use((req, _res, next) => {
    req.boiCanh = { nguoiDungId: 'u5', tenDangNhap: 'dung', teamId: 't1', vai: ['marketer'], nguon: 'phien' };
    next();
  });
  app2.use(taoRouterDieuPhoi({ dongHo: () => BAY }));
  const s2 = http.createServer(app2);
  await new Promise((r) => s2.listen(0, '127.0.0.1', r));
  s2.unref();
  try {
    const res = await fetch(`http://127.0.0.1:${s2.address().port}/dieu-phoi`, {
      headers: { accept: 'text/html,application/xhtml+xml' }, redirect: 'manual',
    });
    assert.equal(res.status, 403);
    assert.notEqual(res.status, 302, 'đá về đăng nhập là bảo họ đăng nhập lại tài khoản vốn đã đúng');
    const chu = await res.text();
    assert.match(chu, /không có quyền vào bảng điều phối/i);
    assert.match(chu, /Đăng xuất/);
    assert.match(chu, /api\/dang-xuat/);
    assert.ok(!/<script>[\s\S]*u5[\s\S]*<\/script>/.test(chu));
  } finally {
    await new Promise((r) => s2.close(r));
  }
});
