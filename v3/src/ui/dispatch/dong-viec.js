// ĐÁNH DẤU ĐÃ XỬ — nhận việc, rồi đóng việc bằng kết quả và lý do.
//
// Thao tác DUY NHẤT sale làm trên hệ thống này. Mọi thứ khác (trả lời khách, sửa đơn) họ
// vẫn làm ở Pancake và POS — `01-QUYET-DINH.md` mục 10.
//
// LUẬT NẶNG NHẤT CỦA FILE NÀY:
// module chỉ `UPDATE` sáu cột nửa dưới của `viec_can_xu_ly`. KHÔNG chèn dòng mới, KHÔNG
// xoá dòng nào — ở đây, và ở bất cứ đâu trong `v3/src/ui/dispatch/`. Dòng là do người A
// chèn lúc bot đẩy việc sang; bỏ một dòng đi là bỏ mất dấu vết bot đã dừng ở đâu, mà đó
// đúng là thứ duy nhất dùng để sửa bot. Hợp đồng B–A mục 4, và có bài test quét mã nguồn
// chặn đúng chuyện này.
//
// BA LUẬT NHỎ HƠN NHƯNG VẪN LÀM VỠ DỮ LIỆU NẾU QUÊN:
//   1. ĐỌC RỒI GHI PHẢI CÓ ĐIỀU KIỆN. Mỗi lần ghi đều kèm hai vế vừa đọc được vào điều
//      kiện (so-và-đặt trên người giữ và mốc đóng). Hai sale bấm cùng một giây thì đúng một
//      người thắng, người kia nhận 409 — chứ không phải cả hai cùng "thành công" rồi ghi
//      đè nhau.
//   2. KHÔNG NÉM LỖI BÊN TRONG GIAO DỊCH. Ném là hoàn tác, mà hoàn tác nhầm lúc người
//      khác vừa ghi xong là mất luôn cái ghi đó. Trong giao dịch chỉ trả về một PHÁN
//      QUYẾT; ném ở ngoài, sau khi giao dịch đã đóng.
//   3. LỖI HIỆN NGUYÊN VĂN RA MÀN HÌNH. "Việc này Bình đang giữ từ 14:32" nói cho sale
//      biết phải làm gì; "có lỗi xảy ra" thì họ bấm lại năm lần rồi đi hỏi người khác.
//
// KHÔNG GỌI THẲNG XUỐNG CƠ SỞ DỮ LIỆU: cổng truy vấn của người A tiêm từ ngoài bằng
// `datTaoTruyVan()` ở `kho-viec.js` (hợp đồng mục 3 và mục 8).

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import {
  BANG, LOAI, LY_DO, TRANG_THAI, DIEU_KIEN_MO, KHONG_RO_NGUOI,
  LoiDieuPhoi, congTruyVan, lyDoChu, trangThaiCua, tenNguoiNhan, ghepLyDoDong,
} from './kho-viec.js';
// Phễu nhật ký nằm ở `router.js` (chỗ tiêm `datPheuNhatKy` đã có từ L4-M1) nên hai file
// tham chiếu vòng nhau. An toàn vì cả hai bên chỉ dùng nhau BÊN TRONG thân hàm, không
// dùng lúc nạp module — và một phễu nhật ký thì hơn hai cái phễu song song mà người dựng
// ứng dụng phải nhớ nối cả hai.
import { ghiNhatKyDieuPhoi } from './router.js';

/**
 * SÁU CỘT NỬA DƯỚI — toàn bộ những gì vai B được ghi trên bảng này (hợp đồng mục 4).
 * Cũng chính là hình dạng `truoc`/`sau` của nhật ký.
 *
 * Trước đây là CHÍN, vì bản của B đoán thêm ba cột mà lược đồ thật không có: một cột trạng
 * thái, một cột tên người nhận, và một cột ghi chú. Cả ba đều có đường khác: trạng thái là
 * thứ SUY RA (`trangThaiCua`), tên người nhận TRA từ `nguoi_dung`, còn ghi chú đi chung cột
 * `ly_do_dong` (xem `ghepLyDoDong`).
 */
export const COT_NUA_DUOI = Object.freeze([
  'nguoi_nhan_id', 'nhan_luc', 'ket_qua', 'ly_do_dong', 'chi_phi', 'dong_luc',
]);

/** Hai mã trong danh mục nhật ký (`v3/src/audit/hanh-dong.js`). Gõ lệch là bộ lọc trống. */
export const HANH_DONG_NHAN = 'nhan_viec';
export const HANH_DONG_DONG = 'dong_viec';

/** Trần ô chi phí và độ dài tối thiểu của ghi chú khi chọn "khác". */
export const CHI_PHI_TOI_DA = 100_000_000;
export const GHI_CHU_TOI_THIEU = 5;

/** Số chữ số sau dấu phẩy mà cột `chi_phi numeric(14,2)` giữ được. Quá là mất chữ số. */
export const CHI_PHI_SO_LE = 2;

/* ─────────────────────────────── kết quả và lý do ───────────────────────────────
 * Tài liệu không chốt hai bảng này — đây là ĐỀ XUẤT CỦA NGƯỜI B, đã ghi vào sổ tay mục
 * "Chỗ tự quyết". Xếp theo thứ sale bấm nhiều nhất, vì nút đầu tiên là nút được bấm nhiều
 * nhất dù danh sách có đúng hay không.
 *
 * `loai: null` = dùng cho cả hai loại việc. `chiPhi: true` = kết quả này có ô chi phí —
 * nhưng ô đó chỉ HIỆN khi việc là `don_hang` (mục 3 của spec), xem `bangKetQua()`.
 */
export const KET_QUA = Object.freeze({
  chot_duoc:           Object.freeze({ chu: 'Chốt được',                     loai: null,           chiPhi: true }),
  khach_tu_choi:       Object.freeze({ chu: 'Khách từ chối',                 loai: null,           chiPhi: false }),
  khach_khong_tra_loi: Object.freeze({ chu: 'Khách không trả lời',           loai: null,           chiPhi: false }),
  da_xu_ngoai:         Object.freeze({ chu: 'Đã xử ở Pancake/POS',           loai: null,           chiPhi: false }),
  tra_lai_bot:         Object.freeze({ chu: 'Trả lại cho bot',               loai: LOAI.HOI_THOAI, chiPhi: false }),
  day_nham:            Object.freeze({ chu: 'Bot đẩy nhầm, không phải việc', loai: null,           chiPhi: false }),
});

/**
 * Lý do đi kèm — BẮT BUỘC với đúng hai kết quả dưới đây, vì hai cái này là thứ dùng để
 * sửa bot. "Khách từ chối" mà không biết vì sao thì con số đó không sửa được gì.
 *
 * `loi_ky_thuat` và `khac` mượn nguyên chữ của `LY_DO` bên `kho-viec.js`: cùng một mã mà
 * hai màn hiện hai chuỗi khác nhau là cách chắc chắn để sale tưởng đó là hai thứ khác nhau.
 */
export const LY_DO_DONG = Object.freeze({
  khach_tu_choi: Object.freeze({
    gia_cao: 'Chê giá cao',
    khong_tin: 'Chưa tin shop',
    da_mua_cho_khac: 'Đã mua chỗ khác',
    khong_can_nua: 'Không còn nhu cầu',
    giao_lau: 'Chê giao hàng lâu',
    khac: LY_DO.khac,
  }),
  day_nham: Object.freeze({
    bot_hieu_sai: 'Bot hiểu sai ý khách',
    khach_hoi_binh_thuong: 'Khách chỉ hỏi bình thường',
    trung_viec: 'Trùng với việc khác',
    loi_ky_thuat: LY_DO.loi_ky_thuat,
    khac: LY_DO.khac,
  }),
});

const LOAI_HOP_LE = new Set(Object.values(LOAI));
const coRieng = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const chuoi = (v) => (v == null ? '' : String(v).trim());
const hopLoai = (dn, loai) => dn.loai == null || dn.loai === loai;

/**
 * Danh sách kết quả hợp lệ cho một loại việc, kèm chữ và cờ có ô chi phí.
 * Không truyền `loai` → trả cả bảng (màn hình chưa biết loại thì hiện hết còn hơn hiện thiếu).
 */
export function bangKetQua(loai) {
  const l = chuoi(loai) || null;
  if (l && !LOAI_HOP_LE.has(l)) throw new LoiDieuPhoi(`loại việc lạ: ${l}`, 'loai_la', 400);
  return Object.entries(KET_QUA)
    .filter(([, dn]) => !l || hopLoai(dn, l))
    .map(([ma, dn]) => ({
      ma,
      chu: dn.chu,
      choLoai: dn.loai ? [dn.loai] : [...LOAI_HOP_LE],
      // Ô chi phí chỉ hiện với ĐƠN. Việc hội thoại chốt được thì tiền nằm ở đơn, không ở đây.
      coChiPhi: dn.chiPhi && (l ? l === LOAI.DON : true),
      canLyDo: coRieng(LY_DO_DONG, ma),
      lyDo: bangLyDo(ma),
    }));
}

/** Danh sách lý do hợp lệ của một kết quả. Kết quả không cần lý do → mảng rỗng. */
export function bangLyDo(ketQua) {
  const ma = chuoi(ketQua);
  if (!coRieng(LY_DO_DONG, ma)) return [];
  return Object.entries(LY_DO_DONG[ma]).map(([m, chu]) => ({ ma: m, chu, canGhiChu: m === 'khac' }));
}

/** Chữ tiếng người của một cặp kết quả + lý do, để đắp vào thông điệp lỗi và nhật ký. */
export function chuKetQua(ketQua) {
  const ma = chuoi(ketQua);
  return coRieng(KET_QUA, ma) ? KET_QUA[ma].chu : (ma || '(chưa chọn kết quả)');
}
export function chuLyDoDong(ketQua, lyDo) {
  const bang = coRieng(LY_DO_DONG, chuoi(ketQua)) ? LY_DO_DONG[chuoi(ketQua)] : null;
  const ma = chuoi(lyDo);
  if (!ma) return null;
  if (bang && coRieng(bang, ma)) return bang[ma];
  return ma;                                   // mã lạ hiện nguyên mã, không gộp im lặng
}

/* ─────────────────────────────────────── lỗi ─────────────────────────────────────── */

/** Gốc chung. `status` đi thẳng ra HTTP, `message` đi thẳng ra màn hình sale. */
export class LoiDongViec extends Error {
  constructor(thongDiep, ma = 'dong_viec_hong', status = 500) {
    super(thongDiep);
    this.name = 'LoiDongViec';
    this.ma = ma;
    this.status = status;
  }
}

/** 409 — người khác đang giữ việc. Kèm tên để sale biết hỏi ai, không cướp im lặng. */
export class LoiDaCoNguoiGiu extends LoiDongViec {
  constructor(thongDiep, { nguoiGiu = null, luc = null } = {}) {
    super(thongDiep, 'da_co_nguoi_giu', 409);
    this.name = 'LoiDaCoNguoiGiu';
    this.nguoiGiu = nguoiGiu;
    this.luc = luc;
  }
}

/** 409 — việc đã đóng rồi. Không ghi đè: giai đoạn 1 không có đường mở lại. */
export class LoiDaDong extends LoiDongViec {
  constructor(thongDiep, { nguoiDong = null, luc = null, ketQua = null } = {}) {
    super(thongDiep, 'da_dong', 409);
    this.name = 'LoiDaDong';
    this.nguoiDong = nguoiDong;
    this.luc = luc;
    this.ketQua = ketQua;
  }
}

/** 400 — thiếu lý do, lý do lạ, hoặc chọn "khác" mà bỏ trống ghi chú. */
export class LoiThieuLyDo extends LoiDongViec {
  constructor(thongDiep, ma = 'thieu_ly_do') {
    super(thongDiep, ma, 400);
    this.name = 'LoiThieuLyDo';
  }
}

/** 400 — kết quả lạ, hoặc kết quả không dùng được cho loại việc này. */
export class LoiKetQuaLa extends LoiDongViec {
  constructor(thongDiep, ma = 'ket_qua_la') {
    super(thongDiep, ma, 400);
    this.name = 'LoiKetQuaLa';
  }
}

/** 400 — chi phí âm, sai dạng, quá trần, hoặc điền vào chỗ không có ô. */
export class LoiChiPhiLa extends LoiDongViec {
  constructor(thongDiep, ma = 'chi_phi_la') {
    super(thongDiep, ma, 400);
    this.name = 'LoiChiPhiLa';
  }
}

/* ──────────────────────────────── kiểm phần tĩnh ────────────────────────────────
 * Ba hàm dưới đây kiểm được mà KHÔNG cần đọc dòng dữ liệu, nên ném thẳng — chưa mở giao
 * dịch nào thì không có gì để hoàn tác nhầm (luật 2 ở đầu file).
 */

function dinhNghiaKetQua(ketQua) {
  const ma = chuoi(ketQua);
  if (!ma) throw new LoiKetQuaLa('Phải chọn kết quả trước khi đóng việc.');
  if (!coRieng(KET_QUA, ma)) {
    throw new LoiKetQuaLa(`Kết quả không có trong danh sách: "${ma}".`);
  }
  return { ma, ...KET_QUA[ma] };
}

function chuanLyDo(dn, lyDo) {
  const canLyDo = coRieng(LY_DO_DONG, dn.ma);
  const ma = chuoi(lyDo);

  if (!canLyDo) {
    // Không im lặng nuốt: lý do gắn nhầm vào kết quả không có bảng lý do thì con số thống
    // kê sau này đọc ra một thứ không ai định nghĩa.
    if (ma) throw new LoiThieuLyDo(`Kết quả "${dn.chu}" không có danh sách lý do, nhưng nhận được "${ma}".`, 'ly_do_la');
    return null;
  }
  if (!ma) throw new LoiThieuLyDo(`Chọn "${dn.chu}" thì phải nói rõ lý do — không có lý do thì ghi nhận này vô nghĩa.`);
  if (!coRieng(LY_DO_DONG[dn.ma], ma)) {
    throw new LoiThieuLyDo(`Lý do không có trong danh sách của "${dn.chu}": "${ma}".`, 'ly_do_la');
  }
  return ma;
}

function chuanGhiChu(maLyDo, ghiChu) {
  const chu = ghiChu == null ? '' : String(ghiChu).trim();
  if (maLyDo === 'khac' && chu.length < GHI_CHU_TOI_THIEU) {
    // Chọn "khác" rồi bỏ trống là mất luôn thông tin duy nhất có giá trị của lần đóng này.
    throw new LoiThieuLyDo(
      `Chọn "${LY_DO.khac}" thì phải ghi rõ ra, ít nhất ${GHI_CHU_TOI_THIEU} ký tự.`,
      'thieu_ghi_chu',
    );
  }
  return chu || null;
}

/**
 * Cột thật là `chi_phi numeric(14,2)`, KHÔNG phải số nguyên đồng.
 *
 * Bản cũ của B ép `^\d+$` — ép thế thì `250000.50` bị từ chối ngay ở cửa, mà tiền tệ vùng
 * Vịnh (KWD/OMR/BHD) vốn có phần lẻ. Nay nới đúng bằng cột: không âm, tối đa hai chữ số
 * sau dấu phẩy. Ba chữ số trở lên vẫn 400 — cột chỉ giữ hai, im lặng làm tròn là mất tiền
 * ở chữ số không ai nhìn.
 *
 * Số âm và chữ vẫn 400, KHÔNG âm thầm quy về 0: 0 nghĩa là "đơn này không tốn gì", khác
 * hẳn "sale gõ nhầm".
 */
function chuanChiPhi(chiPhi) {
  if (chiPhi == null || chiPhi === '') return null;      // để trống được
  const s = String(chiPhi).trim();
  if (s === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new LoiChiPhiLa(
      `Chi phí phải là số không âm, nhiều nhất ${CHI_PHI_SO_LE} chữ số sau dấu chấm: "${s}".`,
    );
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n > CHI_PHI_TOI_DA) {
    throw new LoiChiPhiLa(`Chi phí vượt trần ${CHI_PHI_TOI_DA.toLocaleString('vi-VN')} đồng: "${s}".`);
  }
  return n;
}

/* ──────────────────────────── tiện tay quanh một dòng ──────────────────────────── */

const nguoiCua = (bc) => (bc.nguoiDungId == null ? null : String(bc.nguoiDungId));

/**
 * Ai đang giữ / đã đóng việc, bằng TÊN ĐỌC ĐƯỢC.
 *
 * `nguoi_nhan_id` là bigint khoá ngoại `nguoi_dung(id)` — in thẳng cột ra câu lỗi là đưa
 * cho sale một con số. Nên tra bảng. Một lời gọi thêm, và chỉ trên ĐƯỜNG LỖI (409), nên
 * không đụng gì tới số lời gọi của đường thường.
 */
async function tenNguoiGiu(db, viec) {
  const id = chuoi(viec?.nguoi_nhan_id);
  if (!id) return KHONG_RO_NGUOI;
  let nguoi = null;
  try { nguoi = await db.mot('nguoi_dung', { id }); } catch { nguoi = null; }
  return tenNguoiNhan(viec, nguoi) || KHONG_RO_NGUOI;
}

/**
 * Việc này có phải TÔI đang giữ không.
 * Đang xử mà `nguoi_nhan_id` trống là dữ liệu lệch — coi như không ai giữ để việc không kẹt
 * vĩnh viễn, vì giai đoạn 1 không có đường mở lại.
 */
function laToi(viec, bc) {
  const giu = chuoi(viec?.nguoi_nhan_id);
  if (!giu) return true;
  return giu === chuoi(nguoiCua(bc));
}

const gioNgan = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n)) return 'lúc nào không rõ';
  try {
    return new Date(n).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(n).toISOString();
  }
};

/** Ảnh chụp sáu cột nửa dưới — hình dạng `truoc`/`sau` của nhật ký. */
function anhNuaDuoi(viec = {}) {
  const ra = {};
  for (const cot of COT_NUA_DUOI) ra[cot] = viec[cot] ?? null;
  return ra;
}

function loiDaCoNguoiGiu(viec, ten) {
  return new LoiDaCoNguoiGiu(
    `Việc này ${ten} đang giữ từ ${gioNgan(viec?.nhan_luc)}.`,
    { nguoiGiu: ten, luc: Number(viec?.nhan_luc) || null },
  );
}

function loiDaDong(viec, ten) {
  const kq = chuKetQua(viec?.ket_qua);
  return new LoiDaDong(
    `Việc này ${ten} đã đóng lúc ${gioNgan(viec?.dong_luc)} — kết quả "${kq}". Không ghi đè.`,
    { nguoiDong: ten, luc: Number(viec?.dong_luc) || null, ketQua: viec?.ket_qua ?? null },
  );
}

/**
 * Chạy trong giao dịch nếu cổng có; không có thì kêu lên rồi chạy tiếp.
 *
 * Chạy tiếp được là vì thứ thật sự giữ cho "đúng một người thắng" là ĐIỀU KIỆN kèm theo mỗi
 * lần ghi (so-và-đặt trên `nguoi_nhan_id` + `dong_luc`), không phải giao dịch. Giao dịch chỉ
 * thêm một lớp nữa.
 */
async function chayGiaoDich(db, fn) {
  if (typeof db.giaoDich === 'function') return db.giaoDich(fn);
  console.warn('[dieu-phoi] cổng truy vấn chưa có giaoDich — chạy không giao dịch (hợp đồng mục 3).');
  return fn(db);
}

/* ──────────────────────────────────── nhận việc ──────────────────────────────────── */

/**
 * Nhận việc: `cho` → `dang_xu`.
 *
 * @param {object} boiCanh  BẮT BUỘC — thiếu là ném, không trả rỗng
 * @param {string|number} viecId
 * @param {{bay?:number}} [bo]  `bay` tiêm vào để test không phải chờ đồng hồ thật
 * @returns {Promise<null | {ok:true, viec:object, daGiuTuTruoc?:boolean}>}
 *          `null` = không có việc này với team này → router trả **404**, không phải 403
 * @throws {LoiDaCoNguoiGiu} 409 — người khác đang giữ
 * @throws {LoiDaDong} 409 — việc đã đóng, không nhận lại được
 */
export async function nhanViec(boiCanh, viecId, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const { bay = Date.now() } = bo;
  const id = chuoi(viecId);
  if (!id) return null;

  const db = congTruyVan(bc);

  const pq = await chayGiaoDich(db, async (db2) => {
    const viec = await db2.mot(BANG, { id });
    if (!viec) return { ma: 'khong_thay' };
    const tt = trangThaiCua(viec);
    if (tt === TRANG_THAI.DA_XU) return { ma: 'da_dong', viec };
    if (tt === TRANG_THAI.DANG_XU) {
      return laToi(viec, bc) ? { ma: 'toi_giu_san', viec } : { ma: 'da_co_nguoi_giu', viec };
    }

    const truoc = anhNuaDuoi(viec);
    const thayDoi = { nguoi_nhan_id: nguoiCua(bc), nhan_luc: bay };

    // So-và-đặt: chỉ ghi khi dòng CÒN chưa ai nhận và CÒN chưa đóng — đúng hai vế đã đọc
    // được ở trên. Người kia nhanh tay hơn thì n = 0.
    const n = await db2.sua(BANG, { id, ...DIEU_KIEN_MO, nguoi_nhan_id: null }, thayDoi);
    if (n !== 1) {
      const lai = (await db2.mot(BANG, { id })) || viec;
      return { ma: trangThaiCua(lai) === TRANG_THAI.DA_XU ? 'da_dong' : 'da_co_nguoi_giu', viec: lai };
    }
    const moi = (await db2.mot(BANG, { id })) || { ...viec, ...thayDoi };
    return { ma: 'xong', viec: moi, truoc, sau: anhNuaDuoi(moi) };
  });

  if (pq.ma === 'khong_thay') return null;
  if (pq.ma === 'da_dong') throw loiDaDong(pq.viec, await tenNguoiGiu(db, pq.viec));
  if (pq.ma === 'da_co_nguoi_giu') throw loiDaCoNguoiGiu(pq.viec, await tenNguoiGiu(db, pq.viec));
  // Bấm "Nhận việc" hai lần: không ghi lại `nhan_luc` (ghi lại là xoá mất mốc giữ bao lâu)
  // và không ghi thêm một dòng nhật ký y hệt dòng cũ.
  if (pq.ma === 'toi_giu_san') return { ok: true, viec: pq.viec, daGiuTuTruoc: true };

  await ghiNhatKyDieuPhoi(bc, {
    hanhDong: HANH_DONG_NHAN,
    doiTuongLoai: BANG,
    doiTuongId: String(pq.viec.id),
    truoc: pq.truoc,
    sau: pq.sau,
    ghiChu: `nhận việc ${chuoi(pq.viec.loai) || '?'} · ${lyDoChu(pq.viec)}`,
  });

  return { ok: true, viec: pq.viec };
}

/* ──────────────────────────────────── đóng việc ──────────────────────────────────── */

/**
 * Đóng việc: `dang_xu` → `da_xu`. Việc còn ở `cho` thì NHẬN HỘ RỒI ĐÓNG trong cùng một
 * lần ghi — bắt sale bấm hai nút liên tiếp là kiểu bực mình vô cớ.
 *
 * @param {object} boiCanh  BẮT BUỘC
 * @param {string|number} viecId
 * @param {{ketQua:string, lyDo?:string, ghiChu?:string, chiPhi?:number|string, bay?:number}} bo
 * @returns {Promise<null | {ok:true, viec:object, nhanHo:boolean}>}  `null` → 404
 * @throws {LoiDaDong} 409 · {LoiDaCoNguoiGiu} 409 · {LoiKetQuaLa} 400 ·
 *         {LoiThieuLyDo} 400 · {LoiChiPhiLa} 400
 */
export async function dongViec(boiCanh, viecId, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const { ketQua, lyDo, ghiChu, chiPhi, bay = Date.now() } = bo;
  const id = chuoi(viecId);
  if (!id) return null;

  // Kiểm phần tĩnh trước, ngoài giao dịch.
  const dn = dinhNghiaKetQua(ketQua);
  const maLyDo = chuanLyDo(dn, lyDo);
  const chuGhi = chuanGhiChu(maLyDo, ghiChu);
  const soChiPhi = chuanChiPhi(chiPhi);

  const db = congTruyVan(bc);

  const pq = await chayGiaoDich(db, async (db2) => {
    const viec = await db2.mot(BANG, { id });
    if (!viec) return { ma: 'khong_thay' };

    const loai = chuoi(viec.loai) || null;
    if (!hopLoai(dn, loai)) return { ma: 'ket_qua_khac_loai', viec, loai };
    if (soChiPhi != null && !(loai === LOAI.DON && dn.chiPhi)) return { ma: 'chi_phi_lac_cho', viec, loai };

    const tt = trangThaiCua(viec);
    if (tt === TRANG_THAI.DA_XU) return { ma: 'da_dong', viec };
    if (tt === TRANG_THAI.DANG_XU && !laToi(viec, bc)) return { ma: 'da_co_nguoi_giu', viec };

    const truoc = anhNuaDuoi(viec);
    const nhanHo = tt === TRANG_THAI.CHO;
    const thayDoi = {
      ket_qua: dn.ma,
      // Một cột cho cả mã lý do lẫn ghi chú — lược đồ thật không có cột `ghi_chu`.
      ly_do_dong: ghepLyDoDong(maLyDo, chuGhi),
      chi_phi: soChiPhi,
      dong_luc: bay,
    };
    if (nhanHo) {
      thayDoi.nguoi_nhan_id = nguoiCua(bc);
      thayDoi.nhan_luc = bay;
    }

    // So-và-đặt: việc PHẢI còn mở, và người giữ phải đúng người đã đọc được ở trên (chưa ai
    // giữ thì `null`). Thiếu một trong hai vế là hai sale bấm cùng giây cùng thắng.
    const n = await db2.sua(
      BANG,
      { id, ...DIEU_KIEN_MO, nguoi_nhan_id: viec.nguoi_nhan_id ?? null },
      thayDoi,
    );
    if (n !== 1) {
      const lai = (await db2.mot(BANG, { id })) || viec;
      return { ma: trangThaiCua(lai) === TRANG_THAI.DA_XU ? 'da_dong' : 'da_co_nguoi_giu', viec: lai };
    }
    const moi = (await db2.mot(BANG, { id })) || { ...viec, ...thayDoi };
    return { ma: 'xong', viec: moi, truoc, sau: anhNuaDuoi(moi), nhanHo };
  });

  if (pq.ma === 'khong_thay') return null;
  if (pq.ma === 'da_dong') throw loiDaDong(pq.viec, await tenNguoiGiu(db, pq.viec));
  if (pq.ma === 'da_co_nguoi_giu') throw loiDaCoNguoiGiu(pq.viec, await tenNguoiGiu(db, pq.viec));
  if (pq.ma === 'ket_qua_khac_loai') {
    throw new LoiKetQuaLa(`Kết quả "${dn.chu}" chỉ dùng cho việc loại "${dn.loai}", việc này là "${pq.loai}".`);
  }
  if (pq.ma === 'chi_phi_lac_cho') {
    throw new LoiChiPhiLa(`Ô chi phí chỉ có ở đơn đã chốt được; việc này là "${pq.loai}" với kết quả "${dn.chu}".`);
  }

  const chuLd = chuLyDoDong(dn.ma, maLyDo);
  await ghiNhatKyDieuPhoi(bc, {
    hanhDong: HANH_DONG_DONG,
    doiTuongLoai: BANG,
    doiTuongId: String(pq.viec.id),
    truoc: pq.truoc,
    sau: pq.sau,
    // Nhận hộ rồi đóng vẫn là MỘT thao tác của sale → một dòng nhật ký, nói rõ trong ghi chú.
    ghiChu: `đóng việc: ${dn.chu}${chuLd ? ` · ${chuLd}` : ''}${pq.nhanHo ? ' (nhận hộ rồi đóng)' : ''}`,
  });

  return { ok: true, viec: pq.viec, nhanHo: pq.nhanHo };
}

// KHÔNG có hàm tạo việc, KHÔNG có hàm bỏ việc, và sẽ không bao giờ có ở đây. Người A chèn
// dòng lúc bot đẩy việc sang; vai B chỉ sửa sáu cột nửa dưới. Hợp đồng B–A mục 4.
