// MÀN CHI TIẾT MỘT VIỆC — gom đủ thứ để sale quyết định trong mười giây rồi nhảy đi.
//
// Ba khối, đúng thứ tự trên màn hình: LÝ DO BOT DỪNG · ĐOẠN CHAT · THÔNG TIN ĐƠN.
// Không có ô soạn tin, không có nút trả lời — sale trả lời ở Pancake, đó là cả quyết định
// (`01-QUYET-DINH.md` mục 10).
//
// MỘT LUẬT AN NINH ĐÁNG NHỚ CỦA FILE NÀY:
// việc của team khác → cổng truy vấn không trả dòng nào → hàm này trả `null` → router trả
// **404**, KHÔNG phải 403. Trả 403 là xác nhận "dòng này có tồn tại, chỉ là của team
// khác" — rò rỉ đúng thứ mà lớp team sinh ra để giấu. Không có dòng nào thì đối với team
// này nó không tồn tại, chấm hết.
//
// Module này CHỈ ĐỌC, y như `kho-viec.js`.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { BANG, congTruyVan, dongHoCua, lyDoChu, tenKhachCua, soDienThoaiCua, tenPageCua } from './kho-viec.js';
import { lienKetCua } from './lien-ket.js';

/**
 * Cột thời gian của `so_ai`. Lược đồ của người A chưa viết; đây là BỘ CHUYỂN ĐỔI mà hợp
 * đồng nói tới — A chốt tên khác thì sửa đúng dòng này, không phải sửa cả màn hình.
 * (`nhat_ky` đã chốt là `thoi_gian`, nên đoán `so_ai` cũng vậy.)
 */
export const COT_THOI_GIAN_SO_AI = 'thoi_gian';

/** Số tin mặc định của đoạn chat. Đủ để hiểu chuyện, không đủ để phải cuộn mỏi tay. */
export const SO_TIN_MAC_DINH = 20;

const chuoi = (v) => (v == null ? '' : String(v).trim());
const dau = (...v) => { for (const x of v) if (x != null && String(x).trim() !== '') return x; return null; };

/** Bên nào nói. Bản ghi lạ → coi là bot; chỉ khách mới cần nhận đúng, và khách luôn có dấu. */
function benCua(r = {}) {
  const raw = String(dau(r.ben, r.vai_tro, r.huong, r.tu) ?? '').toLowerCase();
  if (['khach', 'khách', 'user', 'in', 'vao', 'đến', 'den'].includes(raw)) return 'khach';
  return 'bot';
}

/**
 * Một dòng `so_ai` → một tin trong đoạn chat.
 * Tên cột đọc rộng tay vì `so_ai` là bảng của người A, chưa chốt lược đồ.
 */
function tinCua(r = {}) {
  return {
    luc: Number(dau(r[COT_THOI_GIAN_SO_AI], r.luc, r.tao_luc, r.t)) || null,
    ben: benCua(r),
    chu: String(dau(r.chu, r.noi_dung, r.tin, r.text) ?? ''),
    lane: dau(r.lane, r.lan) ?? null,
    maModel: dau(r.ma_model, r.maModel) ?? null,
  };
}

/**
 * Tìm dòng `hoi_thoai` của việc này.
 *
 * Khoá của `hoi_thoai` chưa chốt (bảng của người A). Thử `conv_id` trước — `viec_can_xu_ly`
 * mang sẵn cột đó — rồi mới lui về cặp `page_id`+`cust_id`. A chốt xong khoá thì bỏ nhánh
 * lui, còn hơn để màn chi tiết trống trơn mà không ai biết vì sao.
 */
async function timHoiThoai(db, viec) {
  const conv = chuoi(viec.conv_id);
  if (conv) {
    const theoConv = await db.mot('hoi_thoai', { conv_id: conv });
    if (theoConv) return theoConv;
  }
  const page = chuoi(viec.page_id);
  const cust = chuoi(viec.cust_id);
  if (page && cust) return db.mot('hoi_thoai', { page_id: page, cust_id: cust });
  return null;
}

/**
 * Đoạn chat: `soTin` bản ghi GẦN NHẤT, trả về CŨ TRƯỚC để đọc như một đoạn chat thật.
 *
 * Lấy mới nhất trước rồi đảo, chứ không lấy cũ trước rồi cắt: hội thoại dài thì "20 tin cũ
 * nhất" là đoạn mở đầu chào hỏi, chẳng liên quan gì tới lý do bot vừa dừng.
 */
async function docDoanChat(db, viec, soTin) {
  const page = chuoi(viec.page_id);
  const cust = chuoi(viec.cust_id);
  if (!page || !cust) return [];
  const n = Math.max(1, Math.min(200, Number(soTin) || SO_TIN_MAC_DINH));
  const moiTruoc = await db.chon(
    'so_ai',
    { page_id: page, cust_id: cust },
    { sapXep: COT_THOI_GIAN_SO_AI, giamDan: true, gioiHan: n },
  );
  return moiTruoc.map(tinCua).reverse();
}

/**
 * Gom dữ liệu cho màn chi tiết.
 *
 * @param {object} boiCanh   BẮT BUỘC — thiếu là ném, không trả `null` (null nghĩa là
 *                           "không có việc này", khác hẳn "gọi sai")
 * @param {string|number} viecId
 * @param {{soTin?:number, bay?:number}} [bo]
 * @returns {Promise<null | {viec:object, khach:object|null, page:object|null,
 *   hoiThoai:object|null, donHang:object|null, doanChat:object[],
 *   lienKet:{pancake:string|null,pos:string|null}, lyDoChu:string}>}
 */
export async function chiTietViec(boiCanh, viecId, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const { soTin = SO_TIN_MAC_DINH, bay = Date.now() } = bo;

  const id = chuoi(viecId);
  if (!id) return null;

  const db = congTruyVan(bc);
  const viec = await db.mot(BANG, { id });
  if (!viec) return null;                      // → 404, không phải 403

  const [khach, page, donHang, hoiThoai, doanChat] = await Promise.all([
    chuoi(viec.cust_id) ? db.mot('khach', { id: chuoi(viec.cust_id) }) : Promise.resolve(null),
    chuoi(viec.page_id) ? db.mot('page', { id: chuoi(viec.page_id) }) : Promise.resolve(null),
    // Việc loại `hoi_thoai` không gắn đơn nào → `null`, KHÔNG ném. Một nửa số việc trên
    // bảng điều phối là loại đó; ném ở đây là màn chi tiết chết một nửa số lần mở.
    chuoi(viec.don_hang_id) ? db.mot('don_hang', { id: chuoi(viec.don_hang_id) }) : Promise.resolve(null),
    timHoiThoai(db, viec),
    docDoanChat(db, viec, soTin),
  ]);

  return {
    viec: {
      ...viec,
      ...dongHoCua(viec, bay),
      tenKhach: tenKhachCua(khach),
      soDienThoai: soDienThoaiCua(khach),
      tenPage: tenPageCua(page),
    },
    khach,
    page,
    hoiThoai,
    donHang,
    doanChat,
    lienKet: lienKetCua(viec, { page, donHang }),
    lyDoChu: lyDoChu(viec),
  };
}
