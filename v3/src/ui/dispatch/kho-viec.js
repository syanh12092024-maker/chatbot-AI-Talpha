// HAI DANH SÁCH CỦA BẢNG ĐIỀU PHỐI — đọc `viec_can_xu_ly` rồi gộp sẵn thứ màn hình cần.
//
// MODULE NÀY CHỈ ĐỌC. Không `INSERT`, không `UPDATE`, không `DELETE` — hợp đồng B–A mục 4:
// A chèn dòng vào `viec_can_xu_ly`, B đọc; việc đóng việc (sáu cột nửa dưới) là của
// `L4-M2`, làm sau, file khác.
//
// BA LUẬT CỦA FILE NÀY:
//   1. Thiếu bối cảnh team → NÉM LỖI ngay dòng đầu, không trả mảng rỗng. Mảng rỗng trông
//      y hệt "hôm nay không có việc nào" — sale tin là hết việc rồi đi về.
//   2. Sắp theo `han_luc` TĂNG DẦN. Đây là thứ tự sale cần (gần hết giờ nhất lên đầu),
//      không phải thứ tự tạo. Sắp sai thì việc sắp cháy nằm ở cuối trang hai.
//   3. Gộp dữ liệu theo MẺ, không N+1. Đường nối thật đi vòng qua `hoi_thoai` nên dài hơn
//      một chặng (việc → hội thoại → khách + page), nhưng vẫn là MẺ: 100 dòng thì năm lời
//      gọi, không phải 300. Có bài test đếm đúng chỗ này.
//
// KHÔNG GỌI THẲNG XUỐNG CƠ SỞ DỮ LIỆU: cổng truy vấn của người A tiêm từ ngoài vào bằng
// `datTaoTruyVan()` (hợp đồng mục 3 và mục 8). Chưa nối thì kêu lên chứ không im lặng chạy sai.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

/** Tên bảng. Một chỗ duy nhất, đổi tên là đổi một dòng. */
export const BANG = 'viec_can_xu_ly';

/**
 * Ba trạng thái của máy trạng thái L4-M2. GIỮ NGUYÊN Ý, nhưng đây là thứ SUY RA chứ không
 * phải cột: lược đồ thật (`db/migrate/001_nen.up.sql:228`) không có cột `trang_thai`.
 * Công thức nằm ở `trangThaiCua()` ngay dưới, và chỉ ở đó.
 */
export const TRANG_THAI = Object.freeze({ CHO: 'cho', DANG_XU: 'dang_xu', DA_XU: 'da_xu' });

/**
 * ĐIỀU KIỆN "VIỆC ĐANG MỞ" — đúng vế của index bộ phận trong lược đồ thật:
 * `viec_can_xu_ly_mo ON (team_id, han_luc) WHERE dong_luc IS NULL`. Lọc theo đúng vế này
 * thì truy vấn dùng được index; lọc kiểu khác là quét cả bảng đúng lúc bảng to nhất.
 */
export const DIEU_KIEN_MO = Object.freeze({ dong_luc: null });

/**
 * TRẠNG THÁI CỦA MỘT DÒNG VIỆC — CÔNG THỨC NẰM Ở ĐÚNG MỘT CHỖ, LÀ ĐÂY.
 *
 *   cho     = nguoi_nhan_id IS NULL     AND dong_luc IS NULL
 *   dang_xu = nguoi_nhan_id IS NOT NULL AND dong_luc IS NULL
 *   da_xu   = dong_luc IS NOT NULL
 *
 * `chi-tiet.js`, `dong-viec.js` và hai trang HTML đều GỌI hàm này, không ai chép lại công
 * thức. Hai bản chép của cùng một công thức là hai bản sẽ lệch nhau — và lệch ở đây nghĩa
 * là màn danh sách nói "chờ" trong khi màn chi tiết nói "đã xử".
 */
export function trangThaiCua(viec) {
  const v = viec || {};
  if (v.dong_luc != null) return TRANG_THAI.DA_XU;
  if (v.nguoi_nhan_id != null) return TRANG_THAI.DANG_XU;
  return TRANG_THAI.CHO;
}

/** Hai loại việc = hai danh sách trên màn hình. Giá trị theo CHECK của lược đồ thật. */
export const LOAI = Object.freeze({ HOI_THOAI: 'hoi_thoai', DON: 'don_hang' });
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

/* ─────────────────────────── một cột `ly_do_dong` cho hai thứ ───────────────────────────
 * Lược đồ thật KHÔNG CÓ cột `ghi_chu` trên `viec_can_xu_ly` (xem `001_nen.up.sql:228`) —
 * cột chữ tự do duy nhất của nửa dưới là `ly_do_dong`. Mà lúc đóng việc sale có thể có hai
 * thứ để nói: MÃ lý do (thứ đếm được, dùng để sửa bot) và GHI CHÚ (thứ chỉ lần này mới có,
 * và bắt buộc khi chọn "khác").
 *
 * Bỏ ghi chú đi là mất đúng thông tin có giá trị nhất của lần đóng; đẻ thêm cột là sửa lược
 * đồ của người A. Nên gộp vào một cột theo MỘT khuôn, và khuôn đó chỉ có hai hàm dưới đây
 * biết — nơi khác gọi hàm, không ai tự cắt chuỗi.
 */

/** Dấu ngăn giữa mã lý do và ghi chú trong `ly_do_dong`. */
export const NGAN_LY_DO = ' · ';

/** `('gia_cao', 'khách hẹn tết')` → `'gia_cao · khách hẹn tết'`. Thiếu vế nào bỏ vế đó. */
export function ghepLyDoDong(maLyDo, ghiChu) {
  const ma = String(maLyDo ?? '').trim();
  const chu = String(ghiChu ?? '').trim();
  return [ma, chu].filter(Boolean).join(NGAN_LY_DO) || null;
}

/**
 * Ngược của `ghepLyDoDong`. Vế đầu chỉ được coi là MÃ khi nó trông như mã — không thì cả
 * chuỗi là ghi chú, để dữ liệu do người khác ghi vào cột này không bị cắt đôi bừa.
 *
 * @returns {{ma: string|null, ghiChu: string|null}}
 */
export function tachLyDoDong(giaTri) {
  const s = String(giaTri ?? '').trim();
  if (!s) return { ma: null, ghiChu: null };
  const v = s.indexOf(NGAN_LY_DO);
  const dauTien = v < 0 ? s : s.slice(0, v);
  const conLai = v < 0 ? '' : s.slice(v + NGAN_LY_DO.length).trim();
  if (!DANG_MA.test(dauTien)) return { ma: null, ghiChu: s };
  return { ma: dauTien, ghiChu: conLai || null };
}

/** Trông như một MÃ (chữ thường, số, gạch dưới) chứ không phải một câu tiếng Việt. */
const DANG_MA = /^[a-z0-9_]+$/;

/**
 * Lý do bằng tiếng người, đọc từ MỘT cột `ly_do_day` của lược đồ thật.
 *
 * Trước đây là HAI cột (một cột mã, một cột chữ thô); lược đồ thật gộp còn một, và cột đó là chữ
 * tự do ("lý do BOT đẩy sang, hiện trên mỗi dòng"). Nên luật ở đây là: HIỆN NGUYÊN VĂN,
 * trừ khi giá trị trùng đúng một mã trong `LY_DO` thì đổi sang chữ của bảng — để cùng một
 * mã không hiện thành hai chuỗi khác nhau ở hai màn.
 *
 * MÃ LẠ THÌ VẪN HIỆN NGUYÊN MÃ, KHÔNG GỘP IM LẶNG VÀO `khac`. Gộp im lặng là cách chắc chắn
 * để không bao giờ phát hiện ra bot đang đẩy việc vì một lý do mới — đúng cách
 * `src/economics.js:26` xử `lane` lạ ("hiện nguyên hình, không gộp im lặng vào AI").
 *
 * @param {object|string} viec  dòng `viec_can_xu_ly`, hoặc thẳng chuỗi lý do
 */
export function lyDoChu(viec) {
  const tho = String((viec && typeof viec === 'object' ? viec.ly_do_day : viec) ?? '').trim();
  if (!tho) return '(không ghi lý do)';   // vẫn không giả vờ là `khac`
  if (Object.prototype.hasOwnProperty.call(LY_DO, tho)) return LY_DO[tho];
  // Chữ tự do thì im lặng cho qua; thứ TRÔNG NHƯ MÃ mà không có trong bảng mới đáng kêu —
  // đó là dấu hiệu bot vừa đẻ một lý do mới mà không ai thêm vào đây.
  if (DANG_MA.test(tho)) {
    console.warn(`[dieu-phoi] mã lý do chưa có trong bảng: ${tho} — thêm vào LY_DO ở kho-viec.js`);
  }
  return tho;                             // hiện nguyên văn
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

/* ──────────────────────────── đọc một dòng của bảng bên cạnh ────────────────────────────
 * Bốn hàm dưới đây là BỘ CHUYỂN ĐỔI: cả hai màn hình đi qua chúng, nên đổi tên cột của
 * `khach`/`page`/`nguoi_dung` là sửa đúng bốn dòng này.
 *
 * Tên cột lấy ĐÚNG theo `db/migrate/001_nen.up.sql` (`khach.ten` :119 · `khach.so_dien_thoai`
 * · `page.ten` :69 · `nguoi_dung.ten`/`.email` :25). CỐ Ý KHÔNG đọc rộng tay thêm tên khác:
 * lược đồ đã chốt rồi, nên tên dự phòng chỉ còn là tên CHẾT — và tên chết để lại là cách
 * chắc nhất làm người sau tưởng cột đó có thật. Lược đồ đổi thì sửa ở đây, một chỗ.
 */
const dau = (...v) => { for (const x of v) if (x != null && String(x).trim() !== '') return String(x); return null; };
// Cột thật của `khach` là `ten` (NOT NULL DEFAULT ''), xem db/migrate/001_nen.up.sql:119.
// KHÔNG đọc rộng tay thêm tên khác — tên chết để lại là cách chắc nhất làm người sau
// tưởng cột kia có thật. Rỗng thì trả null để màn hình hiện «(không rõ)».
export const tenKhachCua = (k) => (k && String(k.ten || '').trim() ? String(k.ten).trim() : null);
export const soDienThoaiCua = (k) => (k ? dau(k.so_dien_thoai) : null);
export const tenPageCua = (p) => (p ? dau(p.ten) : null);
// `nguoi_dung` thật: `ten` (NOT NULL DEFAULT '') và `email` (UNIQUE). Tên trống thì lui
// về email — sale cần nhận ra ai đang giữ việc, email vẫn hơn «(không rõ)».
export const tenNguoiDungCua = (n) => (n ? dau(n.ten && String(n.ten).trim(), n.email) : null);

/** Người nhận không tra được trong `nguoi_dung` thì hiện chữ này — KHÔNG hiện id trần. */
export const KHONG_RO_NGUOI = '(không rõ)';

/**
 * Tên người đang giữ / đã xử việc.
 *
 * `nguoi_nhan_id` là **bigint khoá ngoại `nguoi_dung(id)`**, không phải chuỗi tên — in
 * thẳng cột ra màn hình là in một con số cho sale đọc. Phải tra bảng, và tra hụt thì nói
 * "(không rõ)" chứ không lộ id.
 *
 * @param {object} viec   dòng `viec_can_xu_ly`
 * @param {object|null} nguoi  dòng `nguoi_dung` đã tra được (null = tra hụt)
 * @returns {string|null}  `null` = chưa ai nhận
 */
export function tenNguoiNhan(viec, nguoi) {
  if (viec == null || viec.nguoi_nhan_id == null || viec.nguoi_nhan_id === '') return null;
  return tenNguoiDungCua(nguoi) || KHONG_RO_NGUOI;
}

/* ──────────────────────────────────── hai danh sách ──────────────────────────────── */

const duyNhat = (ds) => [...new Set(ds.filter((v) => v != null && v !== '').map(String))];
const theoId = (ds) => new Map(ds.map((r) => [String(r.id), r]));

/**
 * Gộp `hoi_thoai` → `khach` + `page`, và `nguoi_dung` cho cột "Đang xử" — MỘT LỜI GỌI MỖI BẢNG.
 *
 * DÒNG VIỆC KHÔNG CÒN CỘT PAGE HAY CỘT KHÁCH. Lược đồ thật nối thế này:
 *
 *     viec_can_xu_ly.hoi_thoai_id → hoi_thoai → (page_id, khach_id) → page, khach
 *     viec_can_xu_ly.don_hang_id   → don_hang  → khach_id            → khach
 *     viec_can_xu_ly.nguoi_nhan_id → nguoi_dung
 *
 * HAI ĐƯỜNG RA KHÁCH, không phải một. Việc loại `don_hang` có thể KHÔNG gắn hội thoại nào
 * (đơn từ trang bán hàng — khách chưa nói chuyện với ai, xem `01-QUYET-DINH.md` §1). Chỉ đi
 * qua `hoi_thoai` thì sale thấy một đơn cần duyệt mà KHÔNG BIẾT CỦA AI — trên đường tiền.
 *
 * Nên có thêm một MẺ đọc nữa (bốn lời gọi thay vì hai), nhưng vẫn là mẻ chứ KHÔNG N+1: gom
 * id rồi đọc một lần bằng điều kiện mảng. Hai mẻ chạy nối tiếp vì `khach`/`page` chỉ biết
 * được sau khi có `hoi_thoai`; bên trong mỗi mẻ thì song song.
 *
 * Danh sách id rỗng thì không gọi: `IN ()` không phải câu SQL hợp lệ, và một lời gọi chắc
 * chắn trả về rỗng là một lời gọi phí.
 */
async function gopKem(db, dong, bay) {
  const idHoiThoai = duyNhat(dong.map((v) => v.hoi_thoai_id));
  const idDonHang = duyNhat(dong.map((v) => v.don_hang_id));
  const idNguoi = duyNhat(dong.map((v) => v.nguoi_nhan_id));

  // Mẻ 1 — hội thoại, đơn hàng (cả hai đều dẫn ra khách) và người nhận (cột "Đang xử").
  const [dsHoiThoai, dsDonHang, dsNguoi] = await Promise.all([
    idHoiThoai.length ? db.chon('hoi_thoai', { id: idHoiThoai }) : Promise.resolve([]),
    idDonHang.length ? db.chon('don_hang', { id: idDonHang }) : Promise.resolve([]),
    idNguoi.length ? db.chon('nguoi_dung', { id: idNguoi }) : Promise.resolve([]),
  ]);
  const mHoiThoai = theoId(dsHoiThoai);
  const mDonHang = theoId(dsDonHang);
  const mNguoi = theoId(dsNguoi);

  // Mẻ 2 — khách và page. Khách gom từ CẢ HAI nguồn; page chỉ có ở hội thoại.
  const idKhach = duyNhat([...dsHoiThoai.map((h) => h.khach_id), ...dsDonHang.map((d) => d.khach_id)]);
  const idPage = duyNhat(dsHoiThoai.map((h) => h.page_id));
  const [dsKhach, dsPage] = await Promise.all([
    idKhach.length ? db.chon('khach', { id: idKhach }) : Promise.resolve([]),
    idPage.length ? db.chon('page', { id: idPage }) : Promise.resolve([]),
  ]);
  const mKhach = theoId(dsKhach);
  const mPage = theoId(dsPage);

  return dong.map((v) => {
    const h = mHoiThoai.get(String(v.hoi_thoai_id)) || null;
    const d = mDonHang.get(String(v.don_hang_id)) || null;
    // Hội thoại trước, đơn hàng sau: việc gắn cả hai thì hội thoại sát với chuyện đang xảy ra hơn.
    const k = (h && mKhach.get(String(h.khach_id))) || (d && mKhach.get(String(d.khach_id))) || null;
    const p = h ? mPage.get(String(h.page_id)) || null : null;
    return {
      ...v,
      ...dongHoCua(v, bay),
      // Trạng thái suy ra một lần ở máy chủ rồi đi kèm dòng. Hai trang HTML đọc `trangThai`
      // chứ KHÔNG tự nhìn `nguoi_nhan_id`/`dong_luc` — công thức chỉ có một bản.
      trangThai: trangThaiCua(v),
      lyDoChu: lyDoChu(v),
      tenKhach: tenKhachCua(k),
      soDienThoai: soDienThoaiCua(k),
      tenPage: tenPageCua(p),
      tenNguoiNhan: tenNguoiNhan(v, mNguoi.get(String(v.nguoi_nhan_id)) || null),
    };
  });
}

/**
 * Danh sách việc đang chờ người xử.
 *
 * @param {object} boiCanh  BẮT BUỘC — thiếu là ném, không trả rỗng
 * @param {{loai?:'hoi_thoai'|'don_hang', gioiHan?:number, buoc?:number, bay?:number}} [bo]
 * @returns {Promise<object[]>} mỗi dòng có thêm `conLaiMs` `quaHan` `mucKhan` `trangThai`
 *                              `lyDoChu` `tenKhach` `soDienThoai` `tenPage` `tenNguoiNhan`
 */
export async function hangCho(boiCanh, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);                 // luật 1
  const { loai, gioiHan = 100, buoc = 0, bay = Date.now() } = bo;

  const dieuKien = { ...DIEU_KIEN_MO };
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
 * `cho` ở đây là SỐ VIỆC ĐANG MỞ (`cho` + `dang_xu`, tức `dong_luc IS NULL`), khớp đúng số
 * dòng mà `hangCho()` trả về. Đếm riêng mỗi việc chưa ai nhận thì con số trên đầu bảng lệch
 * với số dòng ngay bên dưới nó, và người đọc sẽ tin con số chứ không đếm tay.
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

  const mo = { ...DIEU_KIEN_MO };
  const daTre = { ...mo, han_luc: { '<': bay } };

  const [hoiThoaiCho, donCho, hoiThoaiQua, donQua, cuNhatDs] = await Promise.all([
    db.dem(BANG, { ...mo, loai: LOAI.HOI_THOAI }),
    db.dem(BANG, { ...mo, loai: LOAI.DON }),
    db.dem(BANG, { ...daTre, loai: LOAI.HOI_THOAI }),
    db.dem(BANG, { ...daTre, loai: LOAI.DON }),
    db.chon(BANG, daTre, { sapXep: 'han_luc', gioiHan: 1 }),
  ]);

  // BẢNG RỖNG CÓ HAI NGHĨA KHÁC HẲN NHAU, và màn hình phải nói đúng cái nào:
  //   · "mọi việc đã xử xong"      → tin mừng, sale không phải làm gì
  //   · "team này chưa có page nào" → CHƯA CÀI ĐẶT XONG, phải đi gán page
  // Nói nhầm nghĩa thứ hai thành nghĩa thứ nhất là để người ta ngồi chờ một hệ thống
  // không bao giờ có việc. Đã dính thật 24/08: chủ dự án đăng nhập thấy bảng rỗng và
  // tưởng màn hình hỏng, trong khi 514/514 page còn đậu ở team kỹ thuật.
  //
  // Chỉ đếm khi bảng RỖNG — đường thường không tốn thêm lời gọi nào.
  let team = null;
  if (hoiThoaiCho + donCho === 0) {
    const [soPage, soHoiThoai] = await Promise.all([db.dem('page', {}), db.dem('hoi_thoai', {})]);
    team = { soPage, soHoiThoai, daGanPage: soPage > 0 };
  }

  const cu = cuNhatDs[0] || null;
  return {
    hoiThoai: { cho: hoiThoaiCho, quaHan: hoiThoaiQua },
    don: { cho: donCho, quaHan: donQua },
    quaHanTong: hoiThoaiQua + donQua,
    team,
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
// (`nguoi_nhan_id` `nhan_luc` `ket_qua` `ly_do_dong` `chi_phi` `dong_luc`).
// Hợp đồng B–A mục 4.
