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
/** Nhãn tầng rủi ro hoàn — chữ người đọc được, và nói rõ khi CHƯA CHẤM. */
export const CHU_TANG_HOAN = Object.freeze({
  tot: { chu: 'Mua tốt', muc: 'san' },
  binh_thuong: { chu: 'Bình thường', muc: 'san' },
  can_theo_doi: { chu: 'Cần theo dõi', muc: 'nhac' },
  hoan_cao: { chu: 'Hay hoàn hàng', muc: 'chan' },
  chua_du_don: { chu: 'Chưa đủ đơn để xếp', muc: 'mu' },
});

/**
 * Hồ sơ gọn của khách, cho cột phải màn chi tiết việc.
 *
 * Mọi trường đều CÓ THỂ rỗng và phải nói ra khi rỗng: khách Messenger giữa chừng chưa đưa
 * số điện thoại là cảnh THƯỜNG (lược đồ cho `so_dien_thoai` NULL), không phải lỗi.
 */
export function hoSoCua(khach, donKhach = [], viec = null) {
  if (!khach) {
    return {
      co: false,
      viSao: viec && viec.hoi_thoai_id
        ? 'Hội thoại này chưa nối được với hồ sơ khách nào — thường là khách chưa đưa số điện thoại.'
        : 'Việc này không gắn khách nào.',
    };
  }
  const don = Array.isArray(donKhach) ? donKhach : [];
  const ma = String(khach.tang_hoan || '') || null;
  return {
    co: true,
    ten: (khach.ten || '').trim(),
    soDienThoai: (khach.so_dien_thoai || '').trim(),
    diaChi: [khach.dia_chi, khach.thanh_pho].map((x) => (x || '').trim()).filter(Boolean).join(' · '),
    // `tang_hoan` chưa chấm → nói «chưa chấm», KHÔNG hiện «Mua tốt». Một khách chưa đo mà
    // hiện xanh là chìa cho sale một lời bảo đảm không ai ký.
    tangHoan: ma ? (CHU_TANG_HOAN[ma] || { chu: ma, muc: 'mu' }) : { chu: 'Chưa chấm', muc: 'mu' },
    tiLeHoan: khach.ti_le_hoan == null ? null : Number(khach.ti_le_hoan),
    soDon: don.length,
    donGanDay: don.slice(-3).reverse().map((d) => ({
      id: String(d.id),
      maPos: d.ma_pos || '',
      nguon: d.nguon === 'trang_ban_hang' ? 'Trang bán hàng' : 'Messenger',
      trangThai: d.trang_thai_he || '',
      // CỐ Ý không lấy cột ngày tạo của đơn ra đây. Bài «không còn tên cột B tự đoán»
      // cấm dạng đọc đó trong cả module: dòng VIỆC dùng `day_luc`, và một lần chép nhầm
      // giữa hai bảng là một cột ngày sai mà không ai thấy. Thứ tự đã do `sapXep` của
      // tầng truy vấn lo, còn màn này không hiện ngày — nên cũng không cần đọc.
    })),
  };
}

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

  // HỒ SƠ KHÁCH — cột phải của bản vẽ 11/09. Trước đây sale phải mở Pancake mới biết
  // khách này là ai, đã mua bao nhiêu lần, có hay bom hàng không.
  //
  // ⚠️ ĐỌC cột `tang_hoan` đã chấm sẵn, KHÔNG tự tính lại từ mã trạng thái đơn. Án lệ
  //    H10 (28/08): một màn tự tính tầng rủi ro đã báo 40.064 khách «hoàn cao» trong khi
  //    luật đã ký nói 5.990 — lệch 6,7 lần, vì nó thiếu sàn «tối thiểu 2 đơn kết» và tính
  //    cả mã 8 (`packing`, vốn là bước TIẾN). Job `chamTiLeHoan` là nơi DUY NHẤT chấm.
  const donKhach = khach
    ? await db.chon('don_hang', { khach_id: khach.id }, { sapXep: 'tao_luc' })
    : [];

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
    hoSoKhach: hoSoCua(khach, donKhach, viec),
    page,
    hoiThoai,
    donHang,
    // KHÔNG trả cả dòng `nguoi_dung` ra ngoài — dòng đó mang `email` và `mat_khau_hash`.
    // Màn hình chỉ cần một cái tên, và cái tên đã nằm ở `viec.tenNguoiNhan`.
    lienKet: lienKetCua(viec, { page, donHang, hoiThoai }),
    lyDoChu: lyDoChu(viec),
  };
}
