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
 * Id hội thoại của Pancake, DỰNG từ một dòng `hoi_thoai` thật.
 *
 * `hoi_thoai` của lược đồ thật KHÔNG có cột nào chứa sẵn id này — nó có `psid`. Khuôn của
 * id hội thoại là `<page_id_fb>_<psid>`, đã đo và ghi ở `docs/v3/ban-giao/luoc-do-v1.md`
 * §7.3 ("có `conversation_id` đúng khuôn `<page_id_fb>_<psid>`"). Dựng lại ở đây theo đúng
 * khuôn đó, thay vì đọc một cột không tồn tại rồi im lặng trả `null` mãi mãi.
 *
 * Thiếu MỘT trong hai vế thì trả `null` → nút Pancake mờ. Ghép nửa vời ra một id sai là
 * dẫn sale tới một cuộc hội thoại của người khác.
 *
 * @param {object|null} hoiThoai  dòng `hoi_thoai` (cần `psid`)
 * @param {object|null} page      dòng `page` (cần `page_id` — id Facebook dạng text)
 */
export function convIdCua(hoiThoai, page) {
  if (!hoiThoai) return null;
  const psid = chuoi(hoiThoai.psid);
  const pageFb = chuoi(page?.page_id);
  return psid && pageFb ? `${pageFb}_${psid}` : null;
}

/**
 * Tách `don_hang.ma_pos` thành shop và số đơn trên POS.
 *
 * `ma_pos` là **`"<shop_id>:<id đơn POS>"`**, không phải id trần — id đơn POS là dãy riêng
 * từng shop nên hai shop trùng số (`luoc-do-v1.md` §7.3). Đường POS cần cả hai vế, và
 * `don_hang` không có cột `shop_id` nào khác để lấy.
 *
 * @returns {{shop:string|null, don:string|null}}
 */
export function tachMaPos(maPos) {
  const s = chuoi(maPos);
  if (!s) return { shop: null, don: null };
  const v = s.indexOf(':');
  if (v < 0) return { shop: null, don: s };     // dạng lạ thì coi cả chuỗi là số đơn
  return { shop: s.slice(0, v) || null, don: s.slice(v + 1) || null };
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
 *
 * ĐƯỜNG PANCAKE ĐI TỪ `hoi_thoai`, KHÔNG TỪ DÒNG VIỆC. Dòng `viec_can_xu_ly` thật không
 * mang cột page, cũng không mang id hội thoại của Pancake; nó chỉ có `hoi_thoai_id`. Việc
 * loại `don_hang` không gắn hội thoại → không có gì để mở → `null` → màn hình hiện nút MỜ
 * (cơ chế nút mờ đã có sẵn, dùng lại), chứ không dẫn sale tới một trang trống rồi để họ
 * tưởng hệ thống hỏng.
 *
 * `shopId` lấy theo thứ tự: tiền tố của `don_hang.ma_pos` → `page.pos_shop_id` → biến môi
 * trường (một shop cho cả hệ).
 *
 * @param {object} viec   dòng `viec_can_xu_ly`
 * @param {{page?:object|null, donHang?:object|null, hoiThoai?:object|null}} [kem]
 * @returns {{pancake: string|null, pos: string|null}}
 */
export function lienKetCua(viec = {}, { page = null, donHang = null, hoiThoai = null } = {}) {
  const { shop, don } = tachMaPos(donHang?.ma_pos);
  const shopId = shop ?? page?.pos_shop_id ?? null;
  return {
    pancake: lienKetPancake(page?.page_id, convIdCua(hoiThoai, page)),
    // Chưa đọc được `ma_pos` thì lui về id trong hệ — thà một đường có thể sai còn hơn
    // không có đường nào, và nút vẫn mờ khi việc không gắn đơn.
    pos: lienKetPos(don ?? viec.don_hang_id, { shopId }),
  };
}
