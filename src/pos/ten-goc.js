// TÊN SẢN PHẨM POS → SỐ HIỆU + MÃ GỐC ĐỀ XUẤT (CR-15/09)
//
// ═══ ĐO TRƯỚC KHI VIẾT — danh mục 7 shop, 15/09/2026 ═══════════════════════════════════
// Đội vận hành gõ số hiệu nội bộ vào ĐẦU tên sản phẩm trên POS: `125 - Fitgum Acai Berry`.
//   · 173 số hiệu trong danh mục;
//   · **78 số hiệu có mặt ở >1 shop** — đây là hiện thực «một sản phẩm nhiều thị trường»;
//   · **75/78 tên khớp nhau** giữa các shop; 3 cái lệch chỉ là chính tả
//     (`Birth Stone Set` / `Birthstone Set` / `Birth stone set` · `Necklace box` / `Box`);
//   · **113 biến thể KHÔNG có số** đầu tên ⇒ phần đó người phải gán, máy không đoán.
//
// ⇒ Khoá gộp là SỐ HIỆU, không phải tên. Vì sao không dùng tên: Saudi có cả
//   `125 - Fitgum Acai Berry` VÀ `128 - Fitgum Organic Barley` — tên gần giống mà là hai
//   sản phẩm. So tên thì gộp nhầm hai thứ; so số thì không bao giờ.
//
// ⛔ MODULE NÀY KHÔNG QUYẾT ĐỊNH GÌ. Nó bóc và chuẩn hoá. Việc «hai dòng này là cùng một
//    sản phẩm» là quyết định của NGƯỜI (phiếu CR3) — máy chỉ gợi ý và nêu chỗ đáng ngờ.

/** Khuôn tên POS: `<số 1-4 chữ số>` + `-` + phần còn lại. Khoảng trắng hai bên thoải mái. */
const KHUON = /^\s*(\d{1,4})\s*-\s*(.+?)\s*$/;

/**
 * Bóc số hiệu khỏi tên POS.
 * @returns {{soHieu: string|null, ten: string}} `soHieu` null khi tên không mang số —
 *   và đó là trạng thái THẬT của 113 biến thể, phải nói ra chứ không được bịa một số.
 */
export function tachSoHieu(tenPos) {
  const s = String(tenPos ?? "").trim();
  const m = s.match(KHUON);
  if (!m) return { soHieu: null, ten: s };
  // Bỏ 0 đứng đầu: POS có cả `008 - Necklace box` và `8 - …`; đo 15/09 thấy chúng là CÙNG
  // một số hiệu ở các shop khác nhau. Giữ nguyên chuỗi là đẻ ra hai sản phẩm gốc cho một thứ.
  return { soHieu: String(Number(m[1])), ten: m[2].trim() };
}

/**
 * Chuẩn hoá tên để SO SÁNH (không phải để hiện ra màn hình).
 * Bỏ dấu, bỏ hoa/thường, gộp mọi thứ không phải chữ-số thành một khoảng trắng.
 * `Birthstone Set` và `Birth stone set` vẫn KHÁC nhau sau phép này — cố ý: chúng khác
 * khoảng trắng, và việc kết luận «vẫn là một sản phẩm» là của người, không của regex.
 */
export function chuanHoaTen(ten) {
  return String(ten ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Mã gốc ĐỀ XUẤT từ một tên POS — slug đọc được, để người sửa lại nếu muốn.
 * `125 - Fitgum Acai Berry` → `fitgum-acai-berry`
 *
 * ⚠️ KHÔNG nhét số hiệu vào mã: mã gốc là thứ người đọc trên màn và trong kịch bản, còn số
 *    hiệu là khoá máy. Trộn hai vai vào một chuỗi là đúng cái lỗi mà cả CR này sinh ra để sửa.
 * Tên không bóc được chữ nào (ví dụ toàn ký tự lạ) ⇒ trả `null`, để người đặt tay.
 */
export function maGocDeXuat(tenPos) {
  const { ten } = tachSoHieu(tenPos);
  const slug = chuanHoaTen(ten).replace(/\s+/g, "-").slice(0, 60).replace(/-+$/, "");
  return slug || null;
}

/**
 * Gộp một danh sách biến thể POS thành các NHÓM theo số hiệu.
 *
 * @param {Array<{ma:string, ten:string, cho?:string}>} ds  `cho` = nhãn thị trường/shop, chỉ để in
 * @returns {{nhom: Array, khongSo: Array}}
 *   `nhom[i]` = { soHieu, maGocDeXuat, ten, thanhVien[], tenLech[] }
 *   `tenLech` KHÔNG rỗng ⇒ cùng số hiệu mà tên khác nhau ⇒ **người phải xem**, đừng gộp mù.
 */
export function gopTheoSoHieu(ds = []) {
  const theo = new Map();
  const khongSo = [];
  for (const v of ds) {
    const { soHieu, ten } = tachSoHieu(v.ten);
    if (!soHieu) { khongSo.push({ ...v, ten }); continue; }
    if (!theo.has(soHieu)) theo.set(soHieu, []);
    theo.get(soHieu).push({ ...v, ten });
  }
  const nhom = [...theo.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([soHieu, thanhVien]) => {
      const dem = new Map();
      for (const t of thanhVien) {
        const k = chuanHoaTen(t.ten);
        dem.set(k, (dem.get(k) || 0) + 1);
      }
      // Tên ĐẠI DIỆN = tên xuất hiện nhiều nhất; hoà thì lấy tên dài nhất (đo 15/09: bản
      // ngắn hay là bản bị cắt — `Box` so với `Necklace box`).
      const pho = [...dem.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
      const daiDien = thanhVien.find((t) => chuanHoaTen(t.ten) === pho) || thanhVien[0];
      return {
        soHieu,
        ten: daiDien.ten,
        maGocDeXuat: maGocDeXuat(daiDien.ten),
        thanhVien,
        soShop: new Set(thanhVien.map((t) => t.cho || "")).size,
        tenLech: dem.size > 1 ? [...new Set(thanhVien.map((t) => t.ten))] : [],
      };
    });
  return { nhom, khongSo };
}
