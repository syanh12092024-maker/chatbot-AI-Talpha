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
  KET_QUA, TRANG_THAI, COT_NUA_DUOI, CHI_PHI_TOI_DA,
  LoiDaCoNguoiGiu, LoiDaDong, LoiThieuLyDo, LoiKetQuaLa, LoiChiPhiLa,
} from '../../src/ui/dispatch/index.js';

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;
const BANG = 'viec_can_xu_ly';

const bcAn = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcBinh = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u9', tenDangNhap: 'cuc', teamId: 't2', vai: [VAI.SALE] });

/* ────────────────────────────────── hạt giống ────────────────────────────────── */

const nenViec = (thua) => ({
  team_id: 't1', page_id: 'p1', cust_id: 'k1', conv_id: 'c9',
  tao_luc: BAY - phut(4), han_luc: BAY + phut(6),
  trang_thai: TRANG_THAI.CHO,
  nhan_boi: null, nhan_boi_ten: null, nhan_luc: null,
  ket_qua: null, ket_qua_ly_do: null, ghi_chu: null, chi_phi_dong: null, dong_luc: null,
  ...thua,
});

function hat() {
  return {
    viec_can_xu_ly: [
      nenViec({ id: 'w_ht', loai: 'hoi_thoai', ly_do_ma: 'khieu_nai' }),
      nenViec({ id: 'w_ht2', loai: 'hoi_thoai', ly_do_ma: 'ngoai_kich_ban' }),
      nenViec({ id: 'w_don', loai: 'don', ly_do_ma: 'don_can_duyet', don_hang_id: 'd1' }),
      nenViec({ id: 'w_don2', loai: 'don', ly_do_ma: 'don_sai_thong_tin', don_hang_id: 'd2' }),
      // Lược đồ của người A CHƯA CHẮC có cột thứ chín. Dòng này cố ý không có `nhan_boi_ten`.
      { id: 'w_khong_ten', team_id: 't1', loai: 'hoi_thoai', ly_do_ma: 'qua_luot',
        trang_thai: TRANG_THAI.CHO, tao_luc: BAY - phut(2), han_luc: BAY + phut(8) },
      nenViec({ id: 'w_an_giu', loai: 'hoi_thoai', ly_do_ma: 'doi_tra',
        trang_thai: TRANG_THAI.DANG_XU, nhan_boi: 'u1', nhan_boi_ten: 'an', nhan_luc: BAY - phut(3) }),
      nenViec({ id: 'w_binh_giu', loai: 'hoi_thoai', ly_do_ma: 'hoan_tien',
        trang_thai: TRANG_THAI.DANG_XU, nhan_boi: 'u2', nhan_boi_ten: 'binh', nhan_luc: BAY - phut(2) }),
      nenViec({ id: 'w_da_xu', loai: 'don', ly_do_ma: 'trung_don', don_hang_id: 'd3',
        trang_thai: TRANG_THAI.DA_XU, nhan_boi: 'u2', nhan_boi_ten: 'binh', nhan_luc: BAY - phut(9),
        ket_qua: 'chot_duoc', ket_qua_ly_do: null, chi_phi_dong: 12000, dong_luc: BAY - phut(8) }),
      nenViec({ id: 'w_t2', team_id: 't2', loai: 'hoi_thoai', ly_do_ma: 'doi_tra' }),
    ],
    khach: [{ id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' }],
    page: [{ id: 'p1', team_id: 't1', ten: 'Tiểu Alpha Store', shop_id: '77' }],
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

test('L4-M2 · nhận việc → dang_xu, nhan_boi là người đăng nhập, nhan_luc có giá trị', async () => {
  const kq = await nhanViec(bcAn, 'w_ht', { bay: BAY });
  assert.equal(kq.ok, true);

  const r = dong('w_ht');
  assert.equal(r.trang_thai, TRANG_THAI.DANG_XU);
  assert.equal(r.nhan_boi, 'u1');
  assert.equal(r.nhan_luc, BAY);
  assert.equal(r.nhan_boi_ten, 'an', 'cột thứ chín có trong lược đồ thì phải ghi');
  // Không đụng nửa trên của dòng — đó là của người A.
  assert.equal(r.ly_do_ma, 'khieu_nai');
  assert.equal(r.han_luc, BAY + phut(6));
});

test('L4-M2 · lược đồ KHÔNG có nhan_boi_ten thì bỏ qua cột đó, không tự mọc thêm cột', async () => {
  await nhanViec(bcAn, 'w_khong_ten', { bay: BAY });
  const r = dong('w_khong_ten');
  assert.equal(r.trang_thai, TRANG_THAI.DANG_XU);
  assert.equal(r.nhan_boi, 'u1');
  assert.ok(!('nhan_boi_ten' in r), 'tự thêm cột vào bảng của người A');
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
  assert.equal(dong('w_da_xu').trang_thai, TRANG_THAI.DA_XU);
});

/* ══════════════════ tiêu chí 4 · đóng thẳng từ `cho` ══════════════════ */

test('L4-M2 · đóng việc đang ở `cho` → nhận hộ và đóng trong MỘT lần, nhan_boi = người đóng', async () => {
  const kq = await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(kq.nhanHo, true);

  const r = dong('w_don');
  assert.equal(r.trang_thai, TRANG_THAI.DA_XU);
  assert.equal(r.nhan_boi, 'u1');
  assert.equal(r.nhan_luc, BAY);
  assert.equal(r.dong_luc, BAY);
  assert.equal(r.ket_qua, 'chot_duoc');
  assert.equal(r.chi_phi_dong, 250000);

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
  assert.equal(r.chi_phi_dong, 12000);
  assert.equal(r.dong_luc, BAY - phut(8));
  assert.equal(nhatKyMa('dong_viec').length, 0);
});

/* ══════════════════ tiêu chí 6 · 7 · lý do và ghi chú ══════════════════ */

test('L4-M2 · khach_tu_choi không lý do → 400; có lý do → qua', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.status === 400 && e.ma === 'thieu_ly_do',
  );
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.CHO, 'lần 400 vẫn ghi xuống kho');

  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(dong('w_ht').ket_qua_ly_do, 'gia_cao');
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
  assert.equal(dong('w_ht').ghi_chu, 'khách bảo để tết tính');
});

test('L4-M2 · kết quả không có bảng lý do mà vẫn gửi lý do → 400, không nuốt im lặng', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'khach_khong_tra_loi', lyDo: 'gia_cao', bay: BAY }),
    (e) => e instanceof LoiThieuLyDo && e.ma === 'ly_do_la',
  );
  const kq = await dongViec(bcAn, 'w_ht', { ketQua: 'khach_khong_tra_loi', bay: BAY });
  assert.equal(kq.ok, true);
  assert.equal(dong('w_ht').ket_qua_ly_do, null);
});

/* ══════════════════ tiêu chí 8 · ô chi phí ══════════════════ */

test('L4-M2 · chi phí: hội thoại mà truyền chiPhi → 400', async () => {
  await assert.rejects(
    () => dongViec(bcAn, 'w_ht', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY }),
    (e) => e instanceof LoiChiPhiLa && e.status === 400,
  );
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.CHO);
});

test('L4-M2 · chi phí: số âm và chữ đều 400, KHÔNG âm thầm quy về 0', async () => {
  for (const xau of [-1, '-250000', 'nhiều', '12.5', '1e5', ' 20 000 ']) {
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
  assert.equal(dong('w_don').chi_phi_dong, null);
});

test('L4-M2 · chi phí: đơn + chot_duoc + 250000 → lưu đúng 250000; để trống → null; 0 → 0', async () => {
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 250000, bay: BAY });
  assert.equal(dong('w_don').chi_phi_dong, 250000);

  await dongViec(bcAn, 'w_don2', { ketQua: 'chot_duoc', chiPhi: '', bay: BAY });
  assert.equal(dong('w_don2').chi_phi_dong, null, 'để trống được, không phải đơn nào cũng biết ngay');

  noiKho();
  await dongViec(bcAn, 'w_don', { ketQua: 'chot_duoc', chiPhi: 0, bay: BAY });
  assert.equal(dong('w_don').chi_phi_dong, 0, '0 là "không tốn gì", khác hẳn "chưa biết"');
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
  assert.equal(dong('w_don').trang_thai, TRANG_THAI.CHO);

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

/* ══════════════════ tiêu chí 11 · nhật ký ══════════════════ */

test('L4-M2 · nhận và đóng đều ghi ĐÚNG MỘT dòng nhật ký, có truoc/sau là chín cột nửa dưới', async () => {
  await nhanViec(bcAn, 'w_ht', { bay: BAY });
  const gNhan = nhatKyMa('nhan_viec');
  assert.equal(gNhan.length, 1);
  assert.equal(gNhan[0].doiTuongLoai, BANG);
  assert.equal(gNhan[0].doiTuongId, 'w_ht');
  assert.equal(gNhan[0].boiCanh.nguoiDungId, 'u1');
  assert.equal(gNhan[0].truoc.trang_thai, TRANG_THAI.CHO);
  assert.equal(gNhan[0].truoc.nhan_boi, null);
  assert.equal(gNhan[0].sau.trang_thai, TRANG_THAI.DANG_XU);
  assert.equal(gNhan[0].sau.nhan_boi, 'u1');
  assert.deepEqual(Object.keys(gNhan[0].sau), [...COT_NUA_DUOI]);

  await dongViec(bcAn, 'w_ht', { ketQua: 'khach_tu_choi', lyDo: 'gia_cao', bay: BAY + 1000 });
  const gDong = nhatKyMa('dong_viec');
  assert.equal(gDong.length, 1);
  assert.equal(gDong[0].truoc.ket_qua, null);
  assert.equal(gDong[0].sau.ket_qua, 'khach_tu_choi');
  assert.equal(gDong[0].sau.ket_qua_ly_do, 'gia_cao');
  assert.equal(gDong[0].sau.dong_luc, BAY + 1000);
  assert.match(gDong[0].ghiChu, /Khách từ chối/);

  // Nhật ký chỉ mang chín cột nửa dưới — không kèm cả dòng, không kèm dữ liệu khách.
  for (const cot of ['cust_id', 'page_id', 'conv_id', 'ly_do_ma', 'han_luc']) {
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
  assert.equal(duoc.length, 1, 'cả hai cùng thắng — thiếu điều kiện trang_thai lúc ghi');
  assert.equal(hong.length, 1);
  assert.ok(hong[0].reason instanceof LoiDaCoNguoiGiu);

  const r = dong('w_ht');
  assert.equal(r.trang_thai, TRANG_THAI.DANG_XU);
  assert.ok(['u1', 'u2'].includes(r.nhan_boi));
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
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.DA_XU);
});

/* ══════════════════ bảng kết quả và lý do ══════════════════ */

test('L4-M2 · bangKetQua theo loại: tra_lai_bot chỉ cho hội thoại, ô chi phí chỉ cho đơn', () => {
  const don = bangKetQua('don');
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
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.DANG_XU);

  const b = await goi('/api/dieu-phoi/viec/w_ht/dong', {
    cach: 'POST', than: { ketQua: 'khach_tu_choi', lyDo: 'khac', ghiChu: 'khách chặn tin' },
  });
  assert.equal(b.res.status, 200);
  assert.equal(b.than.viec.ket_qua, 'khach_tu_choi');
  assert.equal(dong('w_ht').ghi_chu, 'khách chặn tin');
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
  const r = await goi('/api/dieu-phoi/bang-ket-qua?loai=don');
  assert.equal(r.res.status, 200);
  assert.equal(r.than.loai, 'don');
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
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.CHO);

  const xuyenTeam = await goi('/api/dieu-phoi/viec/w_ht/nhan?team_id=t2', { cach: 'POST', than: {} });
  assert.equal(xuyenTeam.res.status, 403);
  assert.equal(xuyenTeam.than.ma, 'chan_xuyen_team');
  assert.equal(dong('w_ht').trang_thai, TRANG_THAI.CHO);
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
  // Ba khối của L4-M1 còn nguyên.
  assert.match(than, /Mở Pancake/);
  assert.match(than, /Đoạn chat/);
  assert.match(than, /Thông tin đơn/);
});

test('L4-M2 · bảng điều phối có ĐÚNG MỘT cột "Đang xử" và ở khổ hẹp thì xếp thẻ', async () => {
  const { than } = await goi('/dieu-phoi', { tieuDe: { accept: 'text/html' } });
  assert.equal((than.match(/>Đang xử</g) || []).length, 2, 'hai bảng, mỗi bảng đúng một cột');
  assert.match(than, /colspan="5"/, 'dòng "không có việc nào" phải trải hết năm cột');
  assert.match(than, /@media \(max-width:720px\)/);
  assert.match(than, /td\.c-dem\{grid-column:2\/-1;grid-row:1/, 'đồng hồ phải nằm ở hàng đầu của thẻ');
  assert.match(than, /trang_thai !== 'dang_xu'/, 'cột Đang xử phải trống khi việc còn ở `cho`');
  assert.ok(!/<textarea/.test(than));
});

/* ══════════════════ việc thêm 1 · nối chắn hai kiểu ══════════════════ */

test('L4-M2 · nối CÁI CHẮN ĐÃ DỰNG (req,res,next) thì mọi đường vẫn chạy', async () => {
  datChanDangNhap(chanDangNhap());          // ← đã dựng, kiểu người ta hay viết
  datChanVai(chanVai('sale', 'quan_tri'));
  try {
    const r = await goi('/api/dieu-phoi/viec/w_ht/nhan', { cach: 'POST', than: {} });
    assert.equal(r.res.status, 200, 'nối cái chắn đã dựng mà nổ — đó là lỗi req undefined');
    assert.equal(dong('w_ht').trang_thai, TRANG_THAI.DANG_XU);

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
