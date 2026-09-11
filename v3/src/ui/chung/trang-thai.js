// DẢI TRẠNG THÁI — một câu trả lời cho câu hỏi đầu tiên mọi người hỏi:
// «hệ có đang phục vụ khách không, và bao nhiêu page?»
//
// ═══ VÌ SAO CÓ TỆP NÀY ═════════════════════════════════════════════════════════════
// Người tiếp quản mở dashboard 11/09 và đọc huy hiệu «501 page» thành «hệ đang chạy 501
// page». Sự thật lúc đó: **0 page bật AI, và Sổ AI đứng 13,7 ngày**. Không màn nào nói
// ra điều đó — bảng sức khoẻ thậm chí báo XANH, vì cả hai đèn đáng đỏ đều bị tắt tiếng
// bởi cùng một điều kiện `aiPages > 0`.
//
// Nên con số phải hiện là SỐ PAGE ĐANG BẬT, và tổng page chỉ là mẫu số đi kèm.
//
// ═══ VÌ SAO KHÔNG NHÉT VÀO `/api/dieu-huong` ═══════════════════════════════════════
// Bộ đọc cửa kiểm gọi HTTP sang tiến trình bot v1 (`/readiness`, hết giờ 25 giây) và trả
// về TOÀN BỘ page. Menu nhúng ở mọi trang; gộp vào đó là mỗi lần mở trang lại chờ một
// lượt gọi có thể mất 25 giây trước khi thấy menu. Tách cửa riêng + nhớ tạm 60 giây:
// menu hiện ngay, dải trạng thái điền sau.

const NHO_MS = 60_000;

let _docSanSang = null;
let _nho = null; // { luc, kq }

export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDocSanSang: cần một hàm');
  _docSanSang = fn || null;
  _nho = null;
}
export const daNoiTrangThai = () => typeof _docSanSang === 'function';

/** Chỉ dùng trong bài test — xoá bộ nhớ tạm để đo lại từ đầu. */
export function xoaNho() { _nho = null; }

/**
 * `{ docDuoc, aiBat, tong, viSao }`.
 *
 * ⚠️ KHÔNG bao giờ trả `aiBat: 0` khi thật ra là chưa đọc được. Không đọc được thì
 *    `docDuoc:false` và `aiBat:null` — vì «0 page đang bật» và «chưa biết page nào đang
 *    bật» là hai câu khác hẳn nhau, và câu thứ nhất là câu gọi người dậy giữa đêm.
 */
export async function docTrangThai({ bayGio = Date.now() } = {}) {
  if (_nho && bayGio - _nho.luc < NHO_MS) return _nho.kq;

  if (!_docSanSang) {
    return { docDuoc: false, aiBat: null, tong: null,
      viSao: 'Chưa nối cầu sang tiến trình bot — xem màn Sức khoẻ hệ thống.' };
  }

  let kq;
  try {
    const d = await _docSanSang();
    const ds = Array.isArray(d?.pages) ? d.pages : [];
    kq = {
      docDuoc: true,
      aiBat: ds.filter((p) => p && p.aiEnabled === true).length,
      tong: ds.length,
      viSao: null,
    };
  } catch (e) {
    // Hỏng thì NÓI HỎNG, không trả 0. Xem ghi chú trên.
    return { docDuoc: false, aiBat: null, tong: null,
      viSao: `Cầu sang tiến trình bot lỗi: ${e?.message || e}` };
  }

  _nho = { luc: bayGio, kq };
  return kq;
}
