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
let _demTeam = null;
const _nho = new Map(); // khoá team → { luc, kq }

export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDocSanSang: cần một hàm');
  _docSanSang = fn || null;
  _nho.clear();
}

/**
 * ĐẾM THEO TEAM ĐANG MỞ — nguồn ĐÚNG của dải trạng thái (GD1 · 23/09/2026).
 *
 * ⚠️ MẪU SỐ CŨ SAI. Bản trước đếm mọi page mà cầu trả về, tức TOÀN HỆ, trong khi mọi màn
 *    khác đếm page CỦA TEAM. Đo 22/09 trên bản dev: dải ghi «Bot đang chạy 1/1 page» trong
 *    khi team có 4 page — vì cầu sang bản cũ đang đóng nên nó chỉ thấy 1 page của bản mới.
 *    Hai con số cùng tên, hai mẫu số, và cái hiện ở MỌI trang lại là cái sai.
 *
 * Hàm truyền vào nhận bối cảnh và trả `{ aiBat, tong }` — nơi nối dây đưa thẳng phép đếm của
 * màn «Page còn thiếu gì» vào, nên dải và danh sách page không thể lệch nhau được nữa.
 */
export function datDemTeam(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDemTeam: cần một hàm');
  _demTeam = fn || null;
  _nho.clear();
}
export const daNoiTrangThai = () => typeof _docSanSang === 'function' || typeof _demTeam === 'function';

/** Chỉ dùng trong bài test — xoá bộ nhớ tạm để đo lại từ đầu. */
export function xoaNho() { _nho.clear(); }

/**
 * `{ docDuoc, aiBat, tong, viSao }`.
 *
 * ⚠️ KHÔNG bao giờ trả `aiBat: 0` khi thật ra là chưa đọc được. Không đọc được thì
 *    `docDuoc:false` và `aiBat:null` — vì «0 page đang bật» và «chưa biết page nào đang
 *    bật» là hai câu khác hẳn nhau, và câu thứ nhất là câu gọi người dậy giữa đêm.
 */
export async function docTrangThai({ bayGio = Date.now(), boiCanh = null } = {}) {
  const khoa = boiCanh?.teamId ? `team:${boiCanh.teamId}` : 'toan-he';
  const cu = _nho.get(khoa);
  if (cu && bayGio - cu.luc < NHO_MS) return cu.kq;

  // ĐƯỜNG CHÍNH: đếm page của TEAM, bằng đúng phép đếm của màn «Page còn thiếu gì».
  if (_demTeam && boiCanh?.teamId) {
    try {
      const d = await _demTeam(boiCanh);
      const kqTeam = {
        docDuoc: true,
        aiBat: Number(d?.aiBat) || 0,
        tong: Number(d?.tong) || 0,
        theoTeam: true,
        viSao: null,
      };
      _nho.set(khoa, { luc: bayGio, kq: kqTeam });
      return kqTeam;
    } catch (e) {
      // Hỏng thì NÓI HỎNG, không rơi xuống đường đếm toàn hệ: rơi xuống là lại hiện một mẫu
      // số khác dưới cùng một cái tên, đúng cái lỗi lượt này đang sửa.
      return { docDuoc: false, aiBat: null, tong: null, theoTeam: true,
        viSao: `Chưa đọc được page của team: ${e?.message || e}` };
    }
  }

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
      // Mẫu số TOÀN HỆ — đường lui khi chưa nối phép đếm theo team. Màn phải nói ra, vì
      // «3/514 page» và «3/4 page của team» là hai câu khác hẳn nhau.
      theoTeam: false,
      viSao: null,
    };
  } catch (e) {
    // Hỏng thì NÓI HỎNG, không trả 0. Xem ghi chú trên.
    return { docDuoc: false, aiBat: null, tong: null, theoTeam: false,
      viSao: `Cầu sang tiến trình bot lỗi: ${e?.message || e}` };
  }

  _nho.set(khoa, { luc: bayGio, kq });
  return kq;
}
