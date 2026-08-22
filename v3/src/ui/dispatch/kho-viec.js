// HAI DANH SÁCH CỦA BẢNG ĐIỀU PHỐI — đọc `viec_can_xu_ly` rồi gộp sẵn thứ màn hình cần.
//
// MODULE NÀY CHỈ ĐỌC. Không `INSERT`, không `UPDATE`, không `DELETE` — hợp đồng B–A mục 4:
// A chèn dòng vào `viec_can_xu_ly`, B đọc; việc đóng việc (chín cột nửa dưới) là của
// `L4-M2`, làm sau, file khác.
//
// BA LUẬT CỦA FILE NÀY:
//   1. Thiếu bối cảnh team → NÉM LỖI ngay dòng đầu, không trả mảng rỗng. Mảng rỗng trông
//      y hệt "hôm nay không có việc nào" — sale tin là hết việc rồi đi về.
//   2. Sắp theo `han_luc` TĂNG DẦN. Đây là thứ tự sale cần (gần hết giờ nhất lên đầu),
//      không phải thứ tự tạo. Sắp sai thì việc sắp cháy nằm ở cuối trang hai.
//   3. Gộp dữ liệu theo MẺ, không N+1. 100 dòng mà 300 lời gọi thì màn này chết ngay ngày
//      đầu — tiêu chí nghiệm thu số 8 đếm đúng chỗ này.
//
// KHÔNG GỌI THẲNG XUỐNG CƠ SỞ DỮ LIỆU: cổng truy vấn của người A tiêm từ ngoài vào bằng
// `datTaoTruyVan()` (hợp đồng mục 3 và mục 8). Chưa nối thì kêu lên chứ không im lặng chạy sai.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

/** Tên bảng. Một chỗ duy nhất, đổi tên là đổi một dòng. */
export const BANG = 'viec_can_xu_ly';

/** Hai trạng thái còn "đang mở" — việc chưa ai đóng. `da_xu` không hiện trên bảng điều phối. */
export const TRANG_THAI_MO = Object.freeze(['cho', 'dang_xu']);

/** Hai loại việc = hai danh sách trên màn hình. */
export const LOAI = Object.freeze({ HOI_THOAI: 'hoi_thoai', DON: 'don' });
const LOAI_HOP_LE = new Set(Object.values(LOAI));

/** Ba mức khẩn. `gap` là 0–5 phút cuối, `qua_han` là đã trễ hẹn 10 phút. */
export const MUC_KHAN = Object.freeze({ THUONG: 'thuong', GAP: 'gap', QUA_HAN: 'qua_han' });

/** Ranh giới giữa `thuong` và `gap`. */
export const NGUONG_GAP_MS = 5 * 60 * 1000;

/** Lỗi của riêng bảng điều phối (chưa nối cổng, tham số lạ…). */
export class LoiDieuPhoi extends Error {
  constructor(chiTiet = '', ma = 'dieu_phoi_hong', status = 500) {
    super(`Bảng điều phối: ${chiTiet}`);
    this.name = 'LoiDieuPhoi';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng truy vấn (tiêm từ ngoài) ───────────────────────────
 * Chỗ tiêm đặt ở file này — file thấp nhất trong module — vì `chi-tiet.js` và `router.js`
 * đều cần nó, mà spec chỉ cho tạo đúng những file đã liệt kê, không có chỗ cho một
 * `cong-du-lieu.js` riêng. `index.js` chuyển tiếp ra ngoài làm cửa ra vào.
 */

/** @type {null | ((boiCanh: any) => any)} */
let _taoTruyVan = null;

/** Nối cổng truy vấn của người A. Gọi một lần lúc dựng ứng dụng (hợp đồng mục 8). */
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

export function daNoiTruyVan() {
  return typeof _taoTruyVan === 'function';
}

/** Cổng đã gắn điều kiện team. Chưa nối → ném, không trả cổng giả. */
export function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiDieuPhoi('chưa nối cổng truy vấn — gọi datTaoTruyVan(taoTruyVan) lúc dựng ứng dụng (hợp đồng mục 8)');
  }
  return _taoTruyVan(bc);
}

/* ──────────────────────────────────── bảng lý do ────────────────────────────────────
 * Lý do bot đẩy việc sang là THỨ QUAN TRỌNG NHẤT trên mỗi dòng: sale nhìn nó để quyết
 * định mở việc nào trước. Mã trần (`doi_tra`) không đọc được lúc đang vội.
 *
 * Xuất ra để `L4-M2` dùng lại — hai màn hiện cùng một lý do bằng hai chuỗi chữ khác nhau
 * là cách chắc chắn để sale tưởng đó là hai việc khác nhau.
 */
export const LY_DO = Object.freeze({
  khieu_nai: 'Khách khiếu nại',
  doi_tra: 'Khách đòi đổi hoặc trả hàng',
  hoan_tien: 'Khách đòi hoàn tiền',
  gia_dac_biet: 'Khách xin giá ngoài khung',
  loi_ky_thuat: 'Lỗi kỹ thuật, bot không trả lời được',
  ngoai_kich_ban: 'Câu hỏi ngoài kịch bản',
  khach_gian: 'Khách tỏ ra khó chịu',
  qua_luot: 'Hết ngân sách lượt của khách này',
  don_can_duyet: 'Đơn bot chốt, chờ sale duyệt',
  don_sai_thong_tin: 'Đơn thiếu hoặc sai thông tin',
  trung_don: 'Nghi trùng với đơn đã có',
  khac: 'Lý do khác',
});

/** Cho màn hình dựng chú giải: `[{ ma, chu }]`. */
export function danhSachLyDo() {
  return Object.entries(LY_DO).map(([ma, chu]) => ({ ma, chu }));
}

/**
 * Lý do bằng tiếng người.
 *
 * MÃ LẠ THÌ HIỆN NGUYÊN MÃ, KHÔNG GỘP IM LẶNG VÀO `khac`. Gộp im lặng là cách chắc chắn
 * để không bao giờ phát hiện ra bot đang đẩy việc vì một lý do mới — đúng cách
 * `src/economics.js:26` xử `lane` lạ ("hiện nguyên hình, không gộp im lặng vào AI").
 *
 * @param {object|string} viec  dòng `viec_can_xu_ly`, hoặc thẳng mã lý do
 * @param {string} [lyDoTho]    dùng khi tham số đầu là mã
 */
export function lyDoChu(viec, lyDoTho) {
  const laDong = viec && typeof viec === 'object';
  const maLyDo = String((laDong ? viec.ly_do_ma : viec) ?? '').trim();
  const tho = String((laDong ? viec.ly_do : lyDoTho) ?? '').trim();

  if (maLyDo) {
    if (Object.prototype.hasOwnProperty.call(LY_DO, maLyDo)) return LY_DO[maLyDo];
    console.warn(`[dieu-phoi] mã lý do chưa có trong bảng: ${maLyDo} — thêm vào LY_DO ở kho-viec.js`);
    return maLyDo;                        // hiện nguyên mã
  }
  if (tho) return tho;                    // không có mã thì lấy lý do thô
  return '(không ghi lý do)';             // vẫn không giả vờ là `khac`
}

/* ─────────────────────────────── đồng hồ đếm ngược ─────────────────────────────── */

/**
 * Ba trường thời gian của một dòng. `bay` TIÊM VÀO chứ không gọi `Date.now()` bên trong —
 * test đo việc quá hạn 12 phút không được phải chờ thật 12 phút.
 */
export function dongHoCua(viec = {}, bay = Date.now()) {
  const han = Number(viec.han_luc);
  if (!Number.isFinite(han)) {
    // Không có hạn thì KHÔNG coi là quá hạn (báo động giả còn tệ hơn không báo), nhưng
    // cũng không coi là thường — để `null` cho màn hình hiện gạch ngang.
    return { conLaiMs: null, quaHan: false, mucKhan: MUC_KHAN.THUONG };
  }
  const conLaiMs = han - bay;
  if (conLaiMs < 0) return { conLaiMs, quaHan: true, mucKhan: MUC_KHAN.QUA_HAN };
  return {
    conLaiMs,
    quaHan: false,
    mucKhan: conLaiMs <= NGUONG_GAP_MS ? MUC_KHAN.GAP : MUC_KHAN.THUONG,
  };
}

/* ───────────────────────── tên cột của bảng người A chưa dựng ─────────────────────────
 * `khach` và `page` là bảng của người A, lược đồ chưa viết (hợp đồng mục 4 mới chốt được
 * `viec_can_xu_ly`). Ba hàm dưới đây là BỘ CHUYỂN ĐỔI mà hợp đồng nói tới: A chốt tên cột
 * khác thì sửa đúng ba dòng này, không phải đi sửa cả hai màn hình.
 */
const dau = (...v) => { for (const x of v) if (x != null && String(x).trim() !== '') return String(x); return null; };
export const tenKhachCua = (k) => (k ? dau(k.ten, k.ho_ten, k.ten_khach, k.name) : null);
export const soDienThoaiCua = (k) => (k ? dau(k.so_dien_thoai, k.sdt, k.phone) : null);
export const tenPageCua = (p) => (p ? dau(p.ten, p.ten_page, p.name) : null);

/* ──────────────────────────────────── hai danh sách ──────────────────────────────── */

const duyNhat = (ds) => [...new Set(ds.filter((v) => v != null && v !== '').map(String))];
const theoId = (ds) => new Map(ds.map((r) => [String(r.id), r]));

/**
 * Gộp `khach` và `page` cho cả mẻ — ĐÚNG MỘT LỜI GỌI MỖI BẢNG.
 * Danh sách id rỗng thì không gọi: `IN ()` không phải câu SQL hợp lệ, và một lời gọi
 * chắc chắn trả về rỗng là một lời gọi phí.
 */
async function gopKem(db, dong, bay) {
  const idKhach = duyNhat(dong.map((v) => v.cust_id));
  const idPage = duyNhat(dong.map((v) => v.page_id));

  const [dsKhach, dsPage] = await Promise.all([
    idKhach.length ? db.chon('khach', { id: idKhach }) : Promise.resolve([]),
    idPage.length ? db.chon('page', { id: idPage }) : Promise.resolve([]),
  ]);

  const mKhach = theoId(dsKhach);
  const mPage = theoId(dsPage);

  return dong.map((v) => {
    const k = mKhach.get(String(v.cust_id)) || null;
    const p = mPage.get(String(v.page_id)) || null;
    return {
      ...v,
      ...dongHoCua(v, bay),
      lyDoChu: lyDoChu(v),
      tenKhach: tenKhachCua(k),
      soDienThoai: soDienThoaiCua(k),
      tenPage: tenPageCua(p),
    };
  });
}

/**
 * Danh sách việc đang chờ người xử.
 *
 * @param {object} boiCanh  BẮT BUỘC — thiếu là ném, không trả rỗng
 * @param {{loai?:'hoi_thoai'|'don', gioiHan?:number, buoc?:number, bay?:number}} [bo]
 * @returns {Promise<object[]>} mỗi dòng có thêm `conLaiMs` `quaHan` `mucKhan` `lyDoChu`
 *                              `tenKhach` `soDienThoai` `tenPage`
 */
export async function hangCho(boiCanh, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);                 // luật 1
  const { loai, gioiHan = 100, buoc = 0, bay = Date.now() } = bo;

  const dieuKien = { trang_thai: [...TRANG_THAI_MO] };
  if (loai != null && loai !== '') {
    const l = String(loai);
    if (!LOAI_HOP_LE.has(l)) throw new LoiDieuPhoi(`loại việc lạ: ${l}`, 'loai_la', 400);
    dieuKien.loai = l;
  }

  const db = congTruyVan(bc);
  // luật 2 — `han_luc` tăng dần, sắp ở tầng truy vấn chứ không kéo hết bảng về rồi sắp:
  // sắp phía mình thì phân trang (`buoc`) cắt nhầm ngay trang thứ hai.
  const dong = await db.chon(BANG, dieuKien, { sapXep: 'han_luc', gioiHan, buoc });
  return gopKem(db, dong, bay);                       // luật 3
}

/**
 * Số đếm cho dải báo động.
 *
 * `quaHanTong > 0` là BÁO ĐỘNG — đúng tiêu chí nghiệm thu của L4: "Quá 10 phút chưa ai
 * nhận → báo động" (`02-KE-HOACH-CODE.md`, mục L4).
 *
 * `cho` ở đây là SỐ VIỆC ĐANG MỞ (`cho` + `dang_xu`), khớp đúng số dòng mà `hangCho()`
 * trả về. Đếm riêng mỗi `trang_thai='cho'` thì con số trên đầu bảng lệch với số dòng ngay
 * bên dưới nó, và người đọc sẽ tin con số chứ không đếm tay.
 *
 * Năm lời gọi, tất cả đều có chặn: bốn lần `dem` và một lần lấy đúng MỘT dòng cũ nhất.
 * Không kéo cả bảng về đếm trong JS — hàng chờ vỡ là lúc bảng to nhất, mà đó cũng đúng
 * lúc màn này cần chạy nhất.
 *
 * @returns {Promise<{hoiThoai:{cho:number,quaHan:number}, don:{cho:number,quaHan:number},
 *                    quaHanTong:number, cuNhat:{id:string,loai:string,hanLuc:number,phutQuaHan:number}|null,
 *                    bay:number}>}
 */
export async function tomTat(boiCanh, { bay = Date.now() } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);

  const mo = { trang_thai: [...TRANG_THAI_MO] };
  const daTre = { ...mo, han_luc: { '<': bay } };

  const [hoiThoaiCho, donCho, hoiThoaiQua, donQua, cuNhatDs] = await Promise.all([
    db.dem(BANG, { ...mo, loai: LOAI.HOI_THOAI }),
    db.dem(BANG, { ...mo, loai: LOAI.DON }),
    db.dem(BANG, { ...daTre, loai: LOAI.HOI_THOAI }),
    db.dem(BANG, { ...daTre, loai: LOAI.DON }),
    db.chon(BANG, daTre, { sapXep: 'han_luc', gioiHan: 1 }),
  ]);

  const cu = cuNhatDs[0] || null;
  return {
    hoiThoai: { cho: hoiThoaiCho, quaHan: hoiThoaiQua },
    don: { cho: donCho, quaHan: donQua },
    quaHanTong: hoiThoaiQua + donQua,
    cuNhat: cu
      ? {
        id: String(cu.id),
        loai: cu.loai ?? null,
        hanLuc: Number(cu.han_luc),
        phutQuaHan: Math.floor((bay - Number(cu.han_luc)) / 60000),
      }
      : null,
    bay,
  };
}

// KHÔNG CÓ `themViec`, KHÔNG CÓ `xoaViec`, và sẽ không bao giờ có trong file này.
// A chèn dòng lúc bot đẩy việc sang; B chỉ đọc, và về sau `L4-M2` sửa các cột nửa dưới
// (`trang_thai` `nhan_boi` `nhan_luc` `ket_qua` `ket_qua_ly_do` `ghi_chu` `chi_phi_dong`
// `dong_luc`). Hợp đồng B–A mục 4.
