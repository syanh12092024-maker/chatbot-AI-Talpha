// GỢI Ý MARKETER PHỤ TRÁCH TỪ ĐƠN POS (LL15d · 02/10) — CHỈ ĐỌC BigQuery `levelup-465304`, đệm một ngày.
//
// Quyết định CR-28-09c: «marketer phụ trách CHỌN từ hồ sơ HRM, gán ở sản phẩm × thị trường, page kế thừa»; 30/09: một marketer
// cho mọi thị trường của sản phẩm. NGƯỜI chọn — máy chỉ GỢI Ý: ai đã chạy đơn của sản phẩm này nhiều nhất trong 60 ngày.
//
// Đo 02/10 (prod, chỉ đọc):
//   · trường `marketer` của đơn (`vw_sale_order_team`) là JSON `{"id": …, "name": …}` — so thẳng với `dim_person_map.person_id`
//     khớp 0 ⇒ phải `JSON_VALUE(marketer, '$.id')`; khớp xong 30/31 mã marketer ra mã NV, 11/11 marketer đang làm có đơn;
//   · một `person_id` ↔ đúng một mã NV (0 trùng) — `ANY_VALUE` không giấu xung đột nào;
//   · dòng hàng (`vw_order_items_team`) mang `shop_id` + `variation_id` = khoá món POS của v3 (`san_pham.ma` = `shop:biến thể`).
// Đơn HUỶ không tính (khách không mua — không nói ai bán được).
export const SO_NGAY = 60;
export const SQL_DON_MARKETER = `WITH m AS (
    SELECT person_id, ANY_VALUE(emp_code) AS emp_code FROM \`levelup-465304\`.PIALPHA_ALL_Dataset.dim_person_map
     WHERE emp_code IS NOT NULL GROUP BY person_id)
  SELECT oi.shop_id, oi.variation_id, m.emp_code, COUNT(DISTINCT oi.order_id) AS so_don
    FROM \`levelup-465304\`.PIALPHA_ALL_Dataset.vw_order_items_team oi
    JOIN \`levelup-465304\`.PIALPHA_ALL_Dataset.vw_sale_order_team o ON o.id = oi.order_id AND o.shop_id = oi.shop_id
    LEFT JOIN m ON m.person_id = JSON_VALUE(o.marketer, '$.id')
   WHERE oi.order_date_local >= DATE_SUB(CURRENT_DATE(), INTERVAL ${SO_NGAY} DAY)
     AND IFNULL(oi.status_group, '') <> 'cancelled'
   GROUP BY 1, 2, 3`;

/** Bộ đọc: `{ luc, dong: [{ ma: 'shop:biến thể', maNv: string|null, soDon }] }` — đệm `hanMs`, hai lời gọi cùng lúc = một lượt. */
export function taoDocGoiYMarketer({ taoKhach, hanMs = 24 * 3600 * 1000, dongHo = () => Date.now() } = {}) {
  if (typeof taoKhach !== 'function') throw new Error('taoDocGoiYMarketer cần `taoKhach` là hàm');
  let khach = null;
  let dem = null;
  let dangDoc = null;
  return async function docGoiY({ lamMoi = false } = {}) {
    if (!lamMoi && dem && dongHo() - dem.luc < hanMs) return dem;
    if (dangDoc) return dangDoc;
    dangDoc = (async () => {
      khach ||= taoKhach();
      const rows = await khach.truyVan(SQL_DON_MARKETER);
      dem = { luc: dongHo(), dong: rows.map((r) => ({ ma: `${r.shop_id}:${r.variation_id}`, maNv: r.emp_code || null, soDon: Number(r.so_don) || 0 })) };
      return dem;
    })().finally(() => { dangDoc = null; });
    return dangDoc;
  };
}

/**
 * Gợi ý cho MỘT sản phẩm: cộng đơn của các món POS thuộc sản phẩm theo mã NV. Người đứng đầu phải là marketer CHỌN ĐƯỢC của team
 * (tài khoản có mã NV) — không thì báo ra (đứng đầu là người ngoài team / chưa ghép), KHÔNG gợi ý người thứ hai thay.
 * @param {{ dong: Array<{ma:string, maNv:string|null, soDon:number}> }} du
 * @param {string[]} posMa   món POS (`shop:biến thể`) của sản phẩm
 * @param {Array<{maNv:string, ten:string}>} chonDuoc
 * @returns {null | { maNv:string|null, ten:string|null, soDon:number, tong:number, tiLe:number, chonDuoc:boolean }}
 */
export function goiYChoSanPham(du, posMa, chonDuoc = []) {
  const mon = new Set(posMa || []);
  const theoNv = new Map();
  let tong = 0;
  for (const d of (du && du.dong) || []) {
    if (!mon.has(d.ma)) continue;
    tong += d.soDon;
    const k = d.maNv || '';
    theoNv.set(k, (theoNv.get(k) || 0) + d.soDon);
  }
  if (!tong) return null;
  const [maNv, soDon] = [...theoNv.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const nguoi = chonDuoc.find((c) => c.maNv === maNv) || null;
  return { maNv: maNv || null, ten: nguoi ? nguoi.ten : null, soDon, tong, tiLe: soDon / tong, chonDuoc: !!nguoi };
}
