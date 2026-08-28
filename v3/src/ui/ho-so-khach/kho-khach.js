// TẦNG ĐỌC CỦA MÀN «HỒ SƠ KHÁCH HÀNG» (G2-G5, sóng 4).
//
// Yêu cầu nguyên văn: *«Gộp ba kênh theo số điện thoại»*.
//
// ═══ BA KÊNH, VÀ HÔM NAY MỚI GỘP ĐƯỢC HAI ═══════════════════════════════════════════
// Đo 28/08 trên máy chủ (người A đang nhập, số còn tăng):
//   · `khach`      18.533 dòng — **mọi dòng đều có số điện thoại**  ✅
//   · `don_hang`   23.386 đơn CÓ `khach_id`                          ✅ nối được
//   · `hoi_thoai`  28.953 dòng, **0 dòng có `khach_id`**             ❌ CHƯA nối
//
// Nên «ba kênh» hiện là HAI: khách ↔ đơn. Kênh hội thoại có đủ dữ liệu nhưng chưa ai nối
// khoá. Màn khai thẳng chỗ thiếu — một hồ sơ khách không có hội thoại trông y hệt một khách
// chưa từng nhắn tin, mà 28.953 hội thoại kia nói ngược lại.
//
// ═══ SỐ ĐIỆN THOẠI LÀ KHOÁ GỘP, VÀ NÓ TRÙNG ═════════════════════════════════════════
// Gộp theo số điện thoại nghĩa là hai dòng `khach` cùng số là MỘT người. Màn phải gộp
// chúng, và phải đếm được có bao nhiêu chỗ như thế — nếu không, cùng một người sẽ hiện hai
// lần với hai lịch sử mua khác nhau, và người dùng tin cái nào cũng sai.
//
// ═══ MÀN CHỈ ĐỌC ═══════════════════════════════════════════════════════════════════
// Sửa thông tin khách là việc của POS. Dựng cửa ghi ở đây là đẻ nguồn thứ hai cho một
// bảng mà POS đang là chủ.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_KHACH = 'khach';
export const BANG_DON = 'don_hang';
export const BANG_HOI_THOAI = 'hoi_thoai';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);

/** Mã hoàn — chép từ `src/pancake-orders.js:13`, có bài test so. Xem màn Rủi ro hoàn. */
export const MA_HOAN = Object.freeze(['4', '5', '6', '7', '8']);

/** Ba kênh mà yêu cầu đòi gộp, kèm trạng thái nối THẬT. */
export const KENH = Object.freeze([
  { ma: 'khach', ten: 'Hồ sơ khách', khoa: 'số điện thoại' },
  { ma: 'don_hang', ten: 'Đơn hàng', khoa: '`don_hang.khach_id`' },
  { ma: 'hoi_thoai', ten: 'Hội thoại', khoa: '`hoi_thoai.khach_id`' },
]);

export const TRAN_DOC = 40000;
export const MOI_TRANG = 50;

export class LoiKhach extends Error {
  constructor(thongDiep, ma = 'ho_so_khach', status = 400) {
    super(thongDiep);
    this.name = 'LoiKhach';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKhach('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export const daNoiKhach = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiKhach('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

const laHoan = (d) => MA_HOAN.includes(String(d.trang_thai_pos ?? ''));

/** Chuẩn hoá số điện thoại để gộp: bỏ mọi thứ không phải chữ số, giữ nguyên phần đuôi. */
export function chuanSo(s) {
  const chu = String(s ?? '').replace(/\D+/g, '');
  return chu || null;
}

export async function manKhach(boiCanh, { tim = '', trang = 0 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = truyVan(bc);

  const [khach, don, soHoiThoaiNoi] = await Promise.all([
    db.chon(BANG_KHACH, {}, { gioiHan: TRAN_DOC }),
    db.chon(BANG_DON, {}, { gioiHan: TRAN_DOC }),
    demHoiThoaiNoi(db),
  ]);

  // ── gộp theo số điện thoại ──
  const theoSo = new Map();
  let khongCoSo = 0;
  for (const k of khach) {
    const so = chuanSo(k.so_dien_thoai);
    if (!so) { khongCoSo += 1; continue; }
    let x = theoSo.get(so);
    if (!x) { x = { so, dong: [], ten: '', thiTruong: '', donIds: new Set() }; theoSo.set(so, x); }
    x.dong.push(String(k.id));
    if (!x.ten && k.ten) x.ten = k.ten;
    if (!x.thiTruong && k.thi_truong) x.thiTruong = k.thi_truong;
  }
  // Bao nhiêu người bị tách thành nhiều dòng — nếu không đếm, cùng một người hiện hai lần.
  const soBiTach = [...theoSo.values()].filter((x) => x.dong.length > 1).length;

  // ── nối đơn về người ──
  const dongToiSo = new Map();
  for (const [so, x] of theoSo) for (const id of x.dong) dongToiSo.set(id, so);

  const donCuaSo = new Map();
  let donKhongQuyDuoc = 0;
  for (const d of don) {
    const so = d.khach_id == null ? null : dongToiSo.get(String(d.khach_id));
    if (!so) { donKhongQuyDuoc += 1; continue; }
    let a = donCuaSo.get(so);
    if (!a) { a = { tong: 0, hoan: 0, tien: 0, coTien: 0, nguon: new Set() }; donCuaSo.set(so, a); }
    a.tong += 1;
    if (laHoan(d)) a.hoan += 1;
    if (d.tong_tien != null) { a.tien += Number(d.tong_tien); a.coTien += 1; }
    if (d.nguon) a.nguon.add(String(d.nguon));
  }

  let ds = [...theoSo.values()].map((x) => {
    const a = donCuaSo.get(x.so) || { tong: 0, hoan: 0, tien: 0, coTien: 0, nguon: new Set() };
    return {
      so: x.so,
      ten: x.ten || '',
      thiTruong: x.thiTruong || '',
      soDongGop: x.dong.length,
      soDon: a.tong,
      soDonHoan: a.hoan,
      tiLeHoan: a.tong > 0 ? +(a.hoan / a.tong).toFixed(3) : null,
      // Tiền chỉ đúng khi MỌI đơn có `tong_tien`. Đo 28/08: 0/1502 đơn trang bán hàng có.
      tongTien: a.tien,
      soDonCoTien: a.coTien,
      tienDayDu: a.tong === 0 || a.coTien === a.tong,
      luong: [...a.nguon],
      // Kênh hội thoại chưa nối — nói `null`, không nói 0.
      soHoiThoai: null,
    };
  });

  const q = chuanSo(tim) || String(tim || '').trim().toLowerCase();
  if (q) {
    ds = ds.filter((x) => x.so.includes(q) || String(x.ten).toLowerCase().includes(q));
  }
  ds.sort((a, b) => b.soDon - a.soDon || String(a.ten).localeCompare(String(b.ten)));

  const batDau = Math.max(0, Number(trang) || 0) * MOI_TRANG;

  return {
    teamId: bc.teamId,
    khach: ds.slice(batDau, batDau + MOI_TRANG),
    trang: { hienTai: Math.floor(batDau / MOI_TRANG), moiTrang: MOI_TRANG, tong: ds.length },
    dem: {
      soDongKhach: khach.length,
      soNguoi: theoSo.size,
      soBiTach,
      soKhongCoSo: khongCoSo,
      soDonDoc: don.length,
      donKhongQuyDuoc,
      chamTran: khach.length >= TRAN_DOC || don.length >= TRAN_DOC,
    },
    kenh: trangThaiKenh(khach.length, don.length - donKhongQuyDuoc, soHoiThoaiNoi),
    trong: ds.length ? null : {
      rong: true, vi: khach.length ? 'xong' : 'chua-nap',
      noi: khach.length ? 'Không khách nào khớp ô tìm.' : 'Team này chưa có khách nào.',
      diTiep: khach.length ? null : 'Khách nhập về cùng đơn hàng từ POS.',
    },
  };
}

async function demHoiThoaiNoi(db) {
  try {
    const ht = await db.chon(BANG_HOI_THOAI, {}, { gioiHan: 5000 });
    return ht.filter((h) => h.khach_id != null).length;
  } catch { return null; }
}

/**
 * Ba kênh — kênh nào GỘP ĐƯỢC, kênh nào chưa. Đây là phần quan trọng nhất của màn: nó nói
 * cho người đọc biết hồ sơ họ đang xem thiếu mảnh nào.
 */
function trangThaiKenh(soKhach, soDonNoi, soHoiThoaiNoi) {
  return KENH.map((k) => {
    if (k.ma === 'khach') {
      return { ...k, noiDuoc: soKhach > 0, so: soKhach,
        noi: soKhach ? `${soKhach} dòng khách, gộp theo số điện thoại.` : 'Chưa có khách nào.' };
    }
    if (k.ma === 'don_hang') {
      return { ...k, noiDuoc: soDonNoi > 0, so: soDonNoi,
        noi: soDonNoi ? `${soDonNoi} đơn nối được về khách.` : 'Chưa đơn nào nối được về khách.' };
    }
    return {
      ...k,
      noiDuoc: !!soHoiThoaiNoi,
      so: soHoiThoaiNoi,
      noi: soHoiThoaiNoi
        ? `${soHoiThoaiNoi} hội thoại nối được về khách.`
        : 'KHÔNG hội thoại nào có `khach_id` — kênh này chưa gộp được.',
      diTiep: soHoiThoaiNoi ? null
        : 'Hội thoại có đủ dữ liệu (28.953 dòng) nhưng chưa ai nối khoá về `khach`. Chừng nào '
          + 'chưa nối, cột «hội thoại» trong hồ sơ là **chưa biết**, không phải 0 — một hồ sơ '
          + 'không có hội thoại trông y hệt một khách chưa từng nhắn tin.',
    };
  });
}
