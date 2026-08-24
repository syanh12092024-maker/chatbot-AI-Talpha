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
import {
  BANG, congTruyVan, dongHoCua, lyDoChu, trangThaiCua, tachLyDoDong,
  tenKhachCua, soDienThoaiCua, tenPageCua, tenNguoiNhan,
} from './kho-viec.js';
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

/** Đọc một dòng theo id, hoặc `null` khi không có id để đọc. Chưa có id thì đừng gọi cổng. */
const motTheoId = (db, bang, id) => (chuoi(id) ? db.mot(bang, { id: chuoi(id) }) : Promise.resolve(null));

/**
 * Gom dữ liệu cho màn chi tiết.
 *
 * BA MẺ ĐỌC NỐI TIẾP, vì lược đồ thật nối vòng qua `hoi_thoai`:
 *
 *   1. dòng việc
 *   2. `hoi_thoai` · `don_hang` · `nguoi_dung` (song song — cả ba chỉ cần dòng việc)
 *   3. `khach` · `page` (song song — id nằm trên dòng `hoi_thoai` vừa đọc)
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

  const [hoiThoai, donHang, nguoiNhan] = await Promise.all([
    // Việc loại `don_hang` có thể KHÔNG gắn hội thoại nào → `null` → nút Pancake mờ.
    motTheoId(db, 'hoi_thoai', viec.hoi_thoai_id),
    // Việc loại `hoi_thoai` không gắn đơn nào → `null`, KHÔNG ném. Một nửa số việc trên
    // bảng điều phối là loại đó; ném ở đây là màn chi tiết chết một nửa số lần mở.
    motTheoId(db, 'don_hang', viec.don_hang_id),
    // `nguoi_nhan_id` là khoá ngoại: phải TRA BẢNG mới có tên, không in cột ra màn hình.
    motTheoId(db, 'nguoi_dung', viec.nguoi_nhan_id),
  ]);

  const [khach, page] = await Promise.all([
    // HAI ĐƯỜNG RA KHÁCH: đơn từ trang bán hàng không gắn hội thoại nào (01-QUYET-DINH §1),
    // chỉ đi qua `hoi_thoai` thì màn chi tiết của một đơn cần duyệt không có tên khách.
    motTheoId(db, 'khach', hoiThoai?.khach_id ?? donHang?.khach_id),
    motTheoId(db, 'page', hoiThoai?.page_id),
  ]);

  const lyDoDong = tachLyDoDong(viec.ly_do_dong);

  return {
    viec: {
      ...viec,
      ...dongHoCua(viec, bay),
      // Trang HTML đọc những trường dựng sẵn này, KHÔNG tự suy lại từ cột thô.
      trangThai: trangThaiCua(viec),
      tenKhach: tenKhachCua(khach),
      soDienThoai: soDienThoaiCua(khach),
      tenPage: tenPageCua(page),
      tenNguoiNhan: tenNguoiNhan(viec, nguoiNhan),
      lyDoDongMa: lyDoDong.ma,
      lyDoDongGhiChu: lyDoDong.ghiChu,
    },
    khach,
    page,
    hoiThoai,
    donHang,
    // KHÔNG trả cả dòng `nguoi_dung` ra ngoài — dòng đó mang `email` và `mat_khau_hash`.
    // Màn hình chỉ cần một cái tên, và cái tên đã nằm ở `viec.tenNguoiNhan`.
    lienKet: lienKetCua(viec, { page, donHang, hoiThoai }),
    lyDoChu: lyDoChu(viec),
  };
}
