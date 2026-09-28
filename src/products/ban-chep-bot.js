// BẢN CHÉP CHO BOT v1 — dựng danh sách sản phẩm bot v1 đọc, TỪ CSDL v3 (CR-28-09b · MN3).
//
// ─── LUẬT MỘT NGUỒN (01-QUYET-DINH §8, 28/09) ─────────────────────────────────────────
// Sản phẩm · giá · ảnh có đúng MỘT chỗ ghi là CSDL v3. Bot v1 vẫn đọc `kb-overrides.json`
// (phương án B của CR) — nên tệp ấy phải là BẢN CHÉP MÁY SINH từ CSDL, không phải chỗ thứ
// hai người sửa. File này là bộ sinh DUY NHẤT của bản chép; mọi đường ghi (cửa lưu sản
// phẩm, cửa ảnh, lượt nạp MN2) đi qua nó để hai bên không bao giờ dựng theo hai luật.
//
// ─── HÌNH DẠNG BOT v1 ĐỌC ──────────────────────────────────────────────────────────────
// `src/kb.js#updatePageProducts` nhận `{id, name, desc, variant, tiers:[{label,price}],
// currency, images:[{url,label}]}` và bot chỉ dùng đúng bảy trường ấy (đo 28/09: `stock`,
// `landing`, `note` không ai đọc). Giá ở đơn vị LỚN (199 AED), CSDL ở đơn vị NHỎ (×HE_SO_TE).
//
// ─── BA LUẬT KHÔNG HIỂN NHIÊN ──────────────────────────────────────────────────────────
// ① Sản phẩm `het_hang` KHÔNG ra bản chép. Bot v1 không có khái niệm hết hàng — gửi nó đi
//    là bot vẫn chào bán món người vận hành vừa đánh dấu hết.
// ② Bậc giá tắt (`bat=false`) đã bị bộ đọc chung lọc — bot không chào giá đã ngừng bán.
// ③ Page CHƯA có sản phẩm nào trong v3 thì KHÔNG đẩy. Đẩy danh sách rỗng là XOÁ SẠCH thứ
//    bot đang bán ở page đó (đo prod 28/09: bảng v3 rỗng trong khi bot bán 77 page).
import { docSanPhamGoiGia } from "./catalog.js";
import { HE_SO_TE } from "../pos/tao-don.js";

/** Mã bot dùng trong `[id]` của prompt và `send_product_image(product_id)`. */
export function idChoBot(ma) {
  const m = String(ma || "");
  // Sản phẩm nạp từ `kb-overrides.json` (MN2) mang mã `kb:<page>:<id cũ>` — trả lại id cũ
  // để prompt và lịch sử hội thoại đang trỏ `[SP01]` không đổi nghĩa.
  const kb = /^kb:[^:]+:(.+)$/.exec(m);
  return kb ? kb[1] : m;
}

const lon = (gia, te) => Number(gia) / (HE_SO_TE[String(te || "").toUpperCase()] || 1);

/** Một sản phẩm (hình dạng `catalog.js#docSanPhamGoiGia`) → một sản phẩm bot v1. */
export function sanPhamChoBot(s) {
  const goi = Array.isArray(s.goiGia) ? s.goiGia : [];
  return {
    id: idChoBot(s.ma),
    name: String(s.ten || "").trim(),
    desc: String(s.mo_ta || "").trim(),
    variant: String(s.bien_the || "").trim(),
    // Nhãn rỗng ⇒ «Buy <số lượng>», khớp nhãn dự phòng của `kb.js#productTiers`.
    tiers: goi.map((g) => ({ label: String(g.nhan || "").trim() || `Buy ${g.so_luong}`, price: lon(g.gia, g.tien_te) })),
    currency: String(goi[0]?.tien_te || "AED").toUpperCase(),
    images: (Array.isArray(s.anh) ? s.anh : []).map((a) => ({ url: a.duong, label: a.nhan })),
  };
}

/** Cả danh sách của một page → bản chép. Bỏ món hết hàng (luật ①) và món rỗng (bot tự bỏ). */
export function dungSanPhamChoBot(dsSanPham = []) {
  return dsSanPham
    .filter((s) => !s.het_hang)
    .map(sanPhamChoBot)
    .filter((p) => p.name || p.desc || p.tiers.length || p.images.length);
}

/**
 * Page nào đang bán sản phẩm này — cùng luật với `catalog.js#docSanPhamGoiGia`, đọc NGƯỢC:
 *   · `san_pham.page_id` có ⇒ đúng page đó (sản phẩm nạp từ `kb-overrides.json`)
 *   · không thì theo mã gốc: page khai `san_pham_goc_ma` = `ma_goc` VÀ mã mang tiền tố shop
 *     của page (`<pos_shop_id>:…`).
 */
export async function pageBanSanPham(db, teamId, sanPhamId) {
  const s = (await db.query(
    "SELECT id, page_id, ma, ma_goc FROM san_pham WHERE team_id = $1 AND id = $2",
    [teamId, String(sanPhamId)],
  )).rows[0];
  if (!s) return [];
  if (s.page_id) {
    return (await db.query("SELECT * FROM page WHERE team_id = $1 AND id = $2", [teamId, s.page_id])).rows;
  }
  if (!s.ma_goc) return [];
  const ds = (await db.query(
    "SELECT * FROM page WHERE team_id = $1 AND san_pham_goc_ma = $2 AND pos_shop_id IS NOT NULL",
    [teamId, s.ma_goc],
  )).rows;
  return ds.filter((p) => String(s.ma).startsWith(`${p.pos_shop_id}:`));
}

/**
 * Dựng bản chép của MỘT page và đưa cho `day(pageIdFacebook, products)`.
 * Trả `{ pageId, daDay, soSanPham, lyDo }`. `day` ném ⇒ hàm này ném (nơi gọi huỷ lượt lưu).
 */
export async function dayPageSangBot(db, teamId, trang, day) {
  const ds = await docSanPhamGoiGia(db, teamId, trang.id, trang);
  if (!ds.length) {
    return { pageId: trang.page_id, daDay: false, soSanPham: 0, lyDo: "page_chua_co_san_pham_v3" };
  }
  const products = dungSanPhamChoBot(ds);
  await day(String(trang.page_id), products);
  return { pageId: trang.page_id, daDay: true, soSanPham: products.length, lyDo: "" };
}

/** Sau một lượt ghi vào sản phẩm: đẩy MỌI page đang bán nó. Ném ở page đầu tiên hỏng. */
export async function daySanPhamSangBot(db, teamId, sanPhamId, day) {
  const ra = [];
  for (const trang of await pageBanSanPham(db, teamId, sanPhamId)) {
    ra.push(await dayPageSangBot(db, teamId, trang, day));
  }
  return ra;
}
