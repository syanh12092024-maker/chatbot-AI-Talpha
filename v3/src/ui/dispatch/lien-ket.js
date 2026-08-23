// ĐƯỜNG NHẢY SANG NƠI SALE VỐN LÀM VIỆC — Pancake và POS.
//
// Cả màn điều phối tồn tại để làm đúng một việc: nói cho sale biết việc nào đang chờ, vì
// sao, còn mấy phút — rồi ĐẨY HỌ ĐI CHỖ KHÁC (`01-QUYET-DINH.md` mục 10). File này là cái
// cửa đó. Nó không gọi mạng, không đọc cơ sở dữ liệu; chỉ dựng chuỗi.
//
// HAI ĐƯỜNG KHÔNG BẰNG NHAU VỀ ĐỘ CHẮC CHẮN:
//
//   · Pancake — CHẮC. Dạng `https://pancake.vn/{page}?c_id={conv}` đang chạy thật ở
//     `src/ai-log.js:178` và năm chỗ khác (`admin-ops.js` 271 · 524, `economics.js:305`,
//     `followup.js:369`, `scheduler-followup.js` 221 · 349, `admin-orders.js:51`).
//
//   · POS — CHƯA XÁC NHẬN BẰNG MẮT. Bản đang chạy chỉ gọi API POS
//     (`https://pos.pages.fm/api/v1`, `src/pancake-orders.js:12`), chưa ai mở giao diện POS
//     để chép đường thật. Nên mẫu nằm ở biến môi trường `V3_POS_MAU_DON`; BIẾN TRỐNG THÌ
//     TRẢ `null` để màn hình hiện nút mờ kèm chú "chưa cấu hình đường POS", thay vì dẫn
//     sale tới một trang 404 rồi để họ tưởng hệ thống hỏng.

/** Mẫu đề xuất để dán vào `V3_POS_MAU_DON` khi đã mở POS và chép được đường thật. */
export const MAU_POS_MAC_DINH = 'https://pos.pages.fm/shops/{shop}/orders/{don}';

/** Tên hai biến môi trường. Một chỗ duy nhất để đổi tên. */
export const BIEN_MAU_POS = 'V3_POS_MAU_DON';
export const BIEN_SHOP_POS = 'V3_POS_SHOP_ID';

/** Chú thích hiện dưới nút POS mờ. Cả router lẫn hai trang HTML dùng đúng chuỗi này. */
export const GHI_CHU_POS_CHUA_CAU_HINH = 'chưa cấu hình đường POS';

const chuoi = (v) => (v == null ? '' : String(v).trim());

/**
 * Chèn id vào đường dẫn có mã hoá.
 *
 * Bản đang chạy nội suy thẳng (`https://pancake.vn/${r.page}?c_id=${conv}`) vì id của
 * Facebook luôn là số. Ở đây id đi từ cơ sở dữ liệu ra rồi vào thuộc tính `href` của trang
 * — một id có dấu `"` hoặc `#` là đủ để bẻ đường dẫn. Với id số thì `encodeURIComponent`
 * trả về đúng chính nó, nên dạng đường không đổi một ký tự.
 */
const ma = (v) => encodeURIComponent(chuoi(v));

/** Mẫu đường POS đang cấu hình, hoặc `null`. Đọc biến môi trường MỖI LẦN GỌI để đổi cấu
 *  hình là có hiệu lực ngay, không phải khởi động lại (cùng cách `src/ai-log.js` đọc
 *  `AI_LOG_FILE`). */
export function mauPos() {
  const v = process.env[BIEN_MAU_POS];
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
}

/** Đã cấu hình đường POS chưa. Màn hình hỏi câu này để quyết định hiện nút mờ hay nút thật. */
export function daCauHinhPos() {
  return mauPos() != null;
}

/**
 * Đường mở hội thoại trên Pancake.
 * Không có `pageId` → `null` (không có gì để mở). Không có `convId` → mở trang page.
 */
export function lienKetPancake(pageId, convId) {
  const page = chuoi(pageId);
  if (!page) return null;
  const conv = chuoi(convId);
  return conv ? `https://pancake.vn/${ma(page)}?c_id=${ma(conv)}` : `https://pancake.vn/${ma(page)}`;
}

/**
 * Đường mở đơn trên POS, dựng từ mẫu trong `V3_POS_MAU_DON`.
 * Trả `null` (→ nút mờ) trong ba ca: không có đơn · chưa cấu hình mẫu · mẫu cần `{shop}`
 * mà không biết shop nào.
 *
 * @param {string|number} donHangId
 * @param {{shopId?:string|number}} [tuyChon]
 */
export function lienKetPos(donHangId, { shopId } = {}) {
  const don = chuoi(donHangId);
  if (!don) return null;
  const mau = mauPos();
  if (!mau) return null;

  const shop = chuoi(shopId) || chuoi(process.env[BIEN_SHOP_POS]);
  if (mau.includes('{shop}') && !shop) return null;

  return mau.split('{shop}').join(ma(shop)).split('{don}').join(ma(don));
}

/**
 * Hai đường của một việc, dựng một lần cho màn chi tiết.
 * `shopId` lấy theo thứ tự: đơn → page → biến môi trường (một shop cho cả hệ).
 *
 * @param {object} viec   dòng `viec_can_xu_ly`
 * @param {{page?:object|null, donHang?:object|null}} [kem]
 * @returns {{pancake: string|null, pos: string|null}}
 */
export function lienKetCua(viec = {}, { page = null, donHang = null } = {}) {
  const shopId = donHang?.shop_id ?? page?.shop_id ?? null;
  return {
    pancake: lienKetPancake(viec.page_id, viec.conv_id),
    pos: lienKetPos(viec.don_hang_id, { shopId }),
  };
}
