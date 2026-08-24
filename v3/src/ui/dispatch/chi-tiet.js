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

// ĐOẠN CHAT ĐÃ BỎ — quyết định 23/08/2026, chủ dự án duyệt.
//
// Màn này từng dựng đoạn chat từ bảng `so_ai`. Nay KHÔNG dựng nữa, vì hai lẽ:
//   · `so_ai` thật (`db/migrate/001_nen.up.sql:174`) chỉ ghi HÀNH ĐỘNG của bot — có
//     `loai`/`ma_model`/token/tiền, KHÔNG có cột nội dung tin, và KHÔNG có dòng nào cho
//     tin của KHÁCH. Dựng đoạn chat từ đó là dựng một nửa cuộc nói chuyện.
//   · Cả hội thoại gốc nằm sẵn ở Pancake, đúng chỗ sale vốn làm việc. `01-QUYET-DINH.md`
//     §10: "Sale KHÔNG làm việc trên hệ thống này… bấm là nhảy thẳng sang Pancake."
//
// Nên màn chi tiết chỉ còn ba việc: nói LÝ DO bot dừng, cho xem THÔNG TIN ĐƠN, rồi đẩy
// sang Pancake/POS. Muốn đọc hội thoại thì bấm "Mở Pancake" — một cú bấm, đúng chỗ.
// Chép hội thoại vào đây là đẻ bản sao thứ hai, phải đồng bộ suốt đời.

const chuoi = (v) => (v == null ? '' : String(v).trim());

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
 * Gom dữ liệu cho màn chi tiết.
 *
 * @param {object} boiCanh   BẮT BUỘC — thiếu là ném, không trả `null` (null nghĩa là
 *                           "không có việc này", khác hẳn "gọi sai")
 * @param {string|number} viecId
 * @param {{bay?:number}} [bo]
 * @returns {Promise<null | {viec:object, khach:object|null, page:object|null,
 *   hoiThoai:object|null, donHang:object|null,
 *   lienKet:{pancake:string|null,pos:string|null}, lyDoChu:string}>}
 */
export async function chiTietViec(boiCanh, viecId, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const { bay = Date.now() } = bo;

  const id = chuoi(viecId);
  if (!id) return null;

  const db = congTruyVan(bc);
  const viec = await db.mot(BANG, { id });
  if (!viec) return null;                      // → 404, không phải 403

  const [khach, page, donHang, hoiThoai] = await Promise.all([
    chuoi(viec.cust_id) ? db.mot('khach', { id: chuoi(viec.cust_id) }) : Promise.resolve(null),
    chuoi(viec.page_id) ? db.mot('page', { id: chuoi(viec.page_id) }) : Promise.resolve(null),
    // Việc loại `hoi_thoai` không gắn đơn nào → `null`, KHÔNG ném. Một nửa số việc trên
    // bảng điều phối là loại đó; ném ở đây là màn chi tiết chết một nửa số lần mở.
    chuoi(viec.don_hang_id) ? db.mot('don_hang', { id: chuoi(viec.don_hang_id) }) : Promise.resolve(null),
    timHoiThoai(db, viec),
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
    lienKet: lienKetCua(viec, { page, donHang }),
    lyDoChu: lyDoChu(viec),
  };
}
