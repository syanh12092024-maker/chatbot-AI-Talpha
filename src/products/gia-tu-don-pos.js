// GIÁ TỪ ĐƠN POS — điền sẵn bậc giá cho món POS CHƯA có giá, lấy từ COD đơn POS một món (GP1 · 07/10/2026).
//
// Người quyết 05/10: «Theo giá như đơn trên POS chứ cần gì quy đổi?» → «làm trọn vẹn». Kho POS KHÔNG gửi giá (`retail_price` = 0 —
// `src/pos/doc-danh-muc.js` ①), nên `goi_gia` của món POS hầu hết rỗng ⇒ cửa tiền ĐÓNG (`unknown_chua_co_bang_gia`) và bot không báo
// giá. Giá THẬT nằm trong đơn POS: tiền khách trả = `cod` (đo BigQuery 05/10: `cod = total_price + shipping_fee − total_discount +
// surcharge` đúng cho 100% đơn 60 ngày; vị trí tiền trong đơn có thể là `shipping_fee`, `surcharge` hay `total_price` — nên đọc `cod`,
// không đọc `shipping_fee`). «Giá như đơn» = COD của đơn CHỈ MỘT món, theo số lượng.
//
// LUẬT (phiếu GP1 ① ②, review (a) G1–G4):
//   · Bậc = COD TRỌN GÓI cho `so_luong` món (đã gồm ship) — khớp `cua2Tien` (so `tong_tien` với `gia` của bậc) và cửa tạo đơn (đặt cả số
//     đó vào `shipping_fee`, ca VA-R2 R2-3). `mien_ship = true` (người quyết 07/10 «Miễn ship» — GP1 vòng 2: không có phí ship riêng; để
//     trống thì prompt bot nói «phí ship CHƯA khai … mời khách hỏi sale»); `phi_ship` / `gia_goc` / `khuyen_mai` để TRỐNG — không bịa.
//   · Mỗi (team, shop, biến thể, số lượng): mức COD phổ biến nhất trên `ganDay` ĐƠN GẦN NHẤT (theo ngày đơn), khi ≥ `toiThieu` đơn và chiếm
//     ≥ `nguong`. Mức gần đây ≠ mức phổ biến của CẢ cửa sổ ⇒ KHÔNG đề xuất (`doi_gia_gan_day` — review (a) G1: Europe SKU 211 mua 1 = 29 EUR
//     172 đơn 10–31/08 rồi 37 EUR từ 07/09 ⇒ mức 60 ngày ra 29 EUR 90%, bot báo hụt 22%).
//   · Team = team của marketer VÀO NGÀY ĐƠN (01 §1 · CR-28-09c — như LL17d `src/hrm/don-pos.js`), thiếu lịch sử ⇒ team hiện tại; không ghép
//     được (chưa ghép HRM · sale dùng chung `slug:'*'`) ⇒ `khong_ghep_team`. Đơn của marketer team KHÁC không vào bậc của team này.
//     Đơn KHÔNG RÕ team chỉ được CHẶN, không được mở đề xuất (GP1 vòng 2 · đối kháng F1): cửa sổ «ganDay đơn gần nhất» tính trên đơn team ∪
//     đơn không rõ team cùng (shop, biến thể, số lượng) — mức nhiều nhất khác giá bậc hoặc dưới `nguong` ⇒ `khac_gia_khong_ro_team`.
//   · Tiền tệ đơn PHẢI ≡ `TIEN_TE_THI_TRUONG[market của kết nối team–shop]` — bậc ghi bằng ĐÚNG tệ đó (TT1b chặn bậc món POS lệch tệ shop).
//   · CHỈ món có 0 dòng `goi_gia` (kể cả bậc tắt) — KHÔNG ghi đè; kiểm lại TRONG giao dịch ghi (`chotMonChuaCoGia`) vì lượt kéo POS ghi
//     `goi_gia` mà không chạm dòng `san_pham` (version giữ nguyên ⇒ `saveProduct` không tự bắt). Món `gia_tay` mà 0 dòng = người đã gỡ giá
//     có chủ ý (đường lùi «xoá bậc» ở Theo thị trường) ⇒ `nguoi_da_xoa_gia`, KHÔNG đề xuất lại (GP1 vòng 2 · đối kháng F2).
//   · Ghi qua cửa lưu giá CÓ SẴN (`khoSanPhamGoc.luuGia` → `saveProduct` chỉ-giá + bước đẩy bản chép) — nơi gọi tiêm `luuGia`; tệp này
//     không có đường ghi giá nào của riêng nó.
// BigQuery CHỈ ĐỌC (`src/hrm/bigquery.js` — phạm vi `bigquery.readonly`); nơi gọi tiêm `bq = { truyVan(sql) }`.
import crypto from 'node:crypto';
import { HE_SO_TE } from '../pos/tao-don.js';
import { chuanSku } from '../pos/ten-goc.js';
import { TEAM_HRM } from '../hrm/hrm.js';
import { TIEN_TE_THI_TRUONG } from './chuyen-ban-sao.js';
import { LoiSanPhamGoc } from './san-pham-goc.js';

export const SO_NGAY_MAC_DINH = 60;
export const THAM_SO_MAC_DINH = Object.freeze({ toiThieu: 3, nguong: 0.8, ganDay: 10 });
// Trần món MỖI lượt áp (/code-review GP1 #1): mỗi món một giao dịch + đẩy bản chép, ghi TUẦN TỰ trong một request — hàng trăm món là vài phút,
// proxy cắt giữa chừng thì màn báo lỗi trong khi giá vẫn đang lưu. Quá trần ⇒ 400 trước khi ghi; màn chọn sẵn tối đa từng ấy món, áp xong
// tải lại bảng (dấu mới) rồi áp tiếp — người luôn thấy bảng trước khi áp.
export const TRAN_MON_MOT_LUOT = 50;

/** Lý do bỏ một món — đếm trên màn. Mười lý do của phiếu + `chua_gop_goc` (món chưa thuộc sản phẩm: cửa lưu giá cần gốc) + vòng 2:
 *  `khac_gia_khong_ro_team` (F1) · `nguoi_da_xoa_gia` (F2). */
export const LY_DO = Object.freeze(['it_don', 'phan_tan', 'doi_gia_gan_day', 'khong_tang', 'sku_thu', 'pos_co_gia_mon', 'lech_tien_te',
  'khong_ghep_team', 'da_co_gia', 'khong_co_mon', 'chua_gop_goc', 'khac_gia_khong_ro_team', 'nguoi_da_xoa_gia']);
export const CHU_LY_DO = Object.freeze({
  it_don: 'Ít đơn (dưới 3 đơn mỗi bậc)',
  phan_tan: 'Giá phân tán (không mức nào ≥ 80% đơn gần đây)',
  doi_gia_gan_day: 'Giá đổi gần đây (đơn mới khác mức cả cửa sổ)',
  khong_tang: 'Giá mua nhiều rẻ hơn mua ít',
  sku_thu: 'SKU thử (sp test · test)',
  pos_co_gia_mon: 'POS có giá món (tạo đơn sẽ thu hai lần)',
  lech_tien_te: 'Tiền tệ đơn khác tiền tệ thị trường của shop',
  khong_ghep_team: 'Đơn không ghép được marketer vào team',
  da_co_gia: 'Món đã có giá (không ghi đè)',
  khong_co_mon: 'Đơn của món không có trong kho POS của team',
  chua_gop_goc: 'Món chưa gộp vào sản phẩm (gộp trước — giá sửa ở Theo thị trường)',
  khac_gia_khong_ro_team: 'Đơn gần đây của marketer chưa ghép team / sale dùng chung mang giá khác',
  nguoi_da_xoa_gia: 'Người đã xoá giá món này (giá tay, 0 bậc) — nhập giá ở Theo thị trường',
});
const SKU_THU = new Set(['sp test', 'test'].map(chuanSku));

const BANG = '`levelup-465304`.PIALPHA_ALL_Dataset';
const BANG_NV = '`levelup-465304`.HRM_Core.dim_employee';
const BANG_LICH_SU_TEAM = '`levelup-465304`.HRM_Core.fact_employee_team_history';

/** Số ngày của cửa sổ: số nguyên 1–180 (chuỗi chữ số từ `?soNgay=` được nhận); vắng ⇒ 60. Câu đọc nhúng số này — cấm chuỗi lạ. */
export function chuanSoNgay(soNgay) {
  if (soNgay === undefined || soNgay === null || soNgay === '') return SO_NGAY_MAC_DINH;
  const n = typeof soNgay === 'number' ? soNgay : /^\d{1,3}$/.test(String(soNgay)) ? Number(soNgay) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 180) throw new LoiSanPhamGoc('số ngày phải là số nguyên 1–180', 'so_ngay_sai', 400);
  return n;
}

/**
 * Câu đọc BigQuery — CHỈ đơn MỘT dòng món, `cod > 0`, khác huỷ, số lượng 1–10, trong `soNgay` ngày tới hôm nay (đơn ngày tương lai không
 * vào — như LL17a). Một dòng kết quả = các đơn cùng (team, shop, biến thể, số lượng, tệ, COD, NGÀY) — gộp để vừa MỘT trang REST
 * (`bigquery.js` từ chối kết quả nhiều trang) mà vẫn giữ ngày đơn cho «gần nhất»; `luc` = giờ đơn muộn nhất của dòng (xếp trong ngày).
 * `gia_mon` = giá món lớn nhất trong các đơn của dòng (`total_price` của đơn · `retail_price`/`total_price` của dòng món) — > 0 ⇒ POS có
 * giá món ⇒ v3 tạo đơn (giá ở `shipping_fee`, món không kèm giá) sẽ bị POS cộng thêm giá món (review (a) G2: dấu vết 10/08 COD 21800 cho
 * bậc 109 → DON_HOAN).
 * Team: `dim_person_map` → mã NV → `fact_employee_team_history` phủ NGÀY ĐƠN (nhiều dòng phủ ⇒ dòng bắt đầu muộn nhất, như LL17d) →
 * thiếu ⇒ `dim_employee.team_code` (team hiện tại). Không mã NV ⇒ `team_code` NULL.
 */
export function sqlGiaDon(soNgay = SO_NGAY_MAC_DINH) {
  const n = chuanSoNgay(soNgay);
  return `WITH m AS (
    SELECT person_id, ANY_VALUE(emp_code) AS emp_code FROM ${BANG}.dim_person_map WHERE emp_code IS NOT NULL GROUP BY person_id),
  e AS (SELECT emp_code, ANY_VALUE(team_code) AS team_code FROM ${BANG_NV} GROUP BY emp_code),
  o AS (SELECT SAFE_CAST(inserted_date AS DATE) AS ngay, inserted_at, shop_id, order_currency AS tien_te, cod,
               JSON_VALUE(payload_json, '$.items[0].variation_id') AS variation_id,
               JSON_VALUE(payload_json, '$.items[0].variation_info.product_display_id') AS sku,
               SAFE_CAST(JSON_VALUE(payload_json, '$.items[0].quantity') AS INT64) AS so_luong,
               GREATEST(IFNULL(SAFE_CAST(total_price AS FLOAT64), 0),
                        IFNULL(SAFE_CAST(JSON_VALUE(payload_json, '$.items[0].variation_info.retail_price') AS FLOAT64), 0),
                        IFNULL(SAFE_CAST(JSON_VALUE(payload_json, '$.items[0].retail_price') AS FLOAT64), 0),
                        IFNULL(SAFE_CAST(JSON_VALUE(payload_json, '$.items[0].total_price') AS FLOAT64), 0)) AS gia_mon,
               JSON_VALUE(marketer, '$.id') AS mk
          FROM ${BANG}.vw_sale_order_team
         WHERE SAFE_CAST(inserted_date AS DATE) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${n - 1} DAY) AND CURRENT_DATE()
           AND ARRAY_LENGTH(JSON_QUERY_ARRAY(payload_json, '$.items')) = 1
           AND cod > 0 AND IFNULL(status_category, '') <> 'HUY'),
  om AS (SELECT o.*, m.emp_code FROM o LEFT JOIN m ON m.person_id = o.mk
          WHERE o.so_luong BETWEEN 1 AND 10 AND o.variation_id IS NOT NULL),
  d AS (SELECT DISTINCT emp_code, ngay FROM om WHERE emp_code IS NOT NULL),
  dh AS (SELECT d.emp_code, d.ngay, ARRAY_AGG(h.team_code ORDER BY h.hieu_luc_tu DESC LIMIT 1)[SAFE_OFFSET(0)] AS team_ngay
           FROM d JOIN ${BANG_LICH_SU_TEAM} h
             ON h.emp_code = d.emp_code AND h.hieu_luc_tu <= d.ngay AND (h.hieu_luc_den IS NULL OR d.ngay <= h.hieu_luc_den)
          GROUP BY 1, 2),
  t AS (SELECT om.*, COALESCE(dh.team_ngay, e.team_code) AS team_code
          FROM om LEFT JOIN dh ON dh.emp_code = om.emp_code AND dh.ngay = om.ngay LEFT JOIN e ON e.emp_code = om.emp_code)
  SELECT team_code, shop_id, variation_id, ANY_VALUE(sku) AS sku, so_luong, tien_te, cod, CAST(ngay AS STRING) AS ngay,
         CAST(MAX(inserted_at) AS STRING) AS luc, COUNT(*) AS so_don, MAX(gia_mon) AS gia_mon
    FROM t GROUP BY team_code, shop_id, variation_id, so_luong, tien_te, cod, ngay`;
}
export const SQL_GIA_DON = sqlGiaDon(SO_NGAY_MAC_DINH);

/** Một dòng câu đọc → dạng chuẩn; dòng hỏng (số lượng ngoài 1–10, COD không dương, thiếu shop/biến thể/ngày) ⇒ `null`. */
export function chuanDong(r) {
  const soLuong = Number(r?.so_luong);
  const cod = Number(r?.cod);
  const soDon = Number(r?.so_don);
  const shop = r?.shop_id == null ? '' : String(r.shop_id).trim();
  const vid = r?.variation_id == null ? '' : String(r.variation_id).trim();
  const ngay = String(r?.ngay || '');
  if (!Number.isInteger(soLuong) || soLuong < 1 || soLuong > 10 || !(cod > 0) || !Number.isFinite(cod) || !(soDon >= 1) || !shop || !vid
    || !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;
  return {
    team: r.team_code == null || r.team_code === '' ? null : String(r.team_code),
    shop, vid, sku: r.sku == null ? '' : String(r.sku), soLuong, cod, soDon,
    tienTe: String(r.tien_te || '').trim().toUpperCase() || null, ngay, luc: String(r.luc || ''), giaMon: Number(r.gia_mon) || 0,
  };
}

// Thứ tự TOÀN PHẦN «mới → cũ»: ngày, rồi giờ muộn nhất của dòng, rồi (đồng hạng) mức COD · số đơn — không phụ thuộc thứ tự BigQuery trả
// (/code-review GP1 #7: hai dòng cùng ngày cùng giờ mà xếp theo thứ tự trả về ⇒ đệm làm mới là «10 đơn gần nhất» đổi ⇒ dấu đổi ⇒ 409 giả).
const moiHon = (a, b) => (a.ngay !== b.ngay ? (a.ngay < b.ngay ? 1 : -1) : a.luc !== b.luc ? (a.luc < b.luc ? 1 : -1)
  : (a.cod - b.cod) || (a.soDon - b.soDon));
/** Mức COD nhiều đơn nhất của một tập { cod → { n, moi } }; hoà ⇒ mức có đơn MỚI hơn (tất định). */
function mucNhieuNhat(dem) {
  let tot = null;
  for (const [cod, x] of dem) {
    if (!tot || x.n > tot.n || (x.n === tot.n && moiHon(x.moi, tot.moi) < 0)) tot = { cod, n: x.n, moi: x.moi };
  }
  return tot;
}

/** Cửa sổ `ganDay` ĐƠN gần nhất của các dòng đã xếp MỚI → CŨ (dòng gộp nhiều đơn lấy vừa đủ tới trần): đếm theo mức COD + số đơn lấy
 *  + số đơn KHÔNG RÕ team trong cửa sổ (dòng `team == null` — chỉ có ở tập gộp của F1 vòng 2). */
function cuaSoGan(rs, ganDay) {
  const dem = new Map(); let lay = 0; let layKhongRo = 0;
  for (const r of rs) {
    if (lay >= ganDay) break;
    const k = Math.min(r.soDon, ganDay - lay); lay += k;
    if (r.team == null) layKhongRo += k;
    const y = dem.get(r.cod) || { n: 0, moi: r }; y.n += k; dem.set(r.cod, y);
  }
  return { dem, lay, layKhongRo };
}

/** Một bậc (một số lượng) của một nhóm: dòng đã xếp MỚI → CŨ. */
function tinhMotBac(rs, { toiThieu, nguong, ganDay }) {
  const tong = rs.reduce((n, r) => n + r.soDon, 0);
  const tu = rs[rs.length - 1].ngay; const den = rs[0].ngay;
  const ganNhat = { gia: rs[0].cod, ngay: rs[0].ngay };
  if (tong < toiThieu) return { lyDo: 'it_don', tong, tu, den, ganNhat };
  const ca = new Map();
  for (const r of rs) { const x = ca.get(r.cod) || { n: 0, moi: r }; x.n += r.soDon; ca.set(r.cod, x); }
  const { dem: gan, lay } = cuaSoGan(rs, ganDay);
  const mucCa = mucNhieuNhat(ca); const mucGan = mucNhieuNhat(gan);
  const tiLe = mucGan.n / lay;
  if (tiLe < nguong) return { lyDo: 'phan_tan', tong, tu, den, ganNhat, soDonGanDay: lay, soDonMuc: mucGan.n, tiLe };
  if (mucGan.cod !== mucCa.cod) {
    return { lyDo: 'doi_gia_gan_day', tong, tu, den, ganNhat, soDonGanDay: lay, giaGanDay: mucGan.cod, giaCuaSo: mucCa.cod };
  }
  return { gia: mucGan.cod, tong, soDonGanDay: lay, soDonMuc: mucGan.n, tiLe, ganNhat, tu, den };
}

/**
 * THUẦN. Dòng câu đọc (`sqlGiaDon`) → mỗi (team, shop, biến thể) một nhóm:
 *   `{ team, shop, vid, posMa, sku, tienTe, bac:[{ soLuong, gia, tong, soDonGanDay, soDonMuc, tiLe, ganNhat:{gia,ngay}, tu, den }],
 *      boBac:[{ soLuong, lyDo, tong, … }], lyDo: null | <LY_DO>, chiTiet, soDon, tu, den }`  — `lyDo` null ⇒ đề xuất được.
 * `gia` = đơn vị NHỎ của POS (= `cod`, cùng đơn vị với `goi_gia.gia`).
 * Một bậc ÍT ĐƠN chỉ bỏ BẬC đó (bậc khác vẫn đề xuất); bậc đủ đơn mà giá đổi gần đây hoặc phân tán ⇒ bỏ CẢ món (bảng của món đang chuyển
 * chế độ — đề xuất nửa bảng cũ nửa bảng mới là đúng lỗi G1). Thứ tự lý do: đổi giá gần đây → phân tán → ít đơn → khác giá đơn không rõ team
 * (F1 vòng 2) → không tăng. Nhóm của một team đối chiếu với đơn KHÔNG RÕ team cùng (shop, biến thể): `ganNhat` của bậc là đơn mới nhất của
 * tập gộp (`khongRoTeam: true` khi đơn đó không rõ team — màn tô F4).
 */
export function tinhBac(dong, thamSo = {}) {
  const ts = { ...THAM_SO_MAC_DINH, ...thamSo };
  const nhom = new Map();
  const khongRo = new Map();   // (shop, biến thể) → dòng đơn KHÔNG RÕ team — nhóm của team đối chiếu (F1 vòng 2)
  for (const r of dong || []) {
    const d = chuanDong(r);
    if (!d) continue;
    const k = JSON.stringify([d.team, d.shop, d.vid]);
    if (!nhom.has(k)) nhom.set(k, []);
    nhom.get(k).push(d);
    if (d.team == null) {
      const kk = JSON.stringify([d.shop, d.vid]);
      if (!khongRo.has(kk)) khongRo.set(kk, []);
      khongRo.get(kk).push(d);
    }
  }
  const ra = [];
  for (const rs of nhom.values()) {
    ra.push(motNhom(rs, ts, rs[0].team == null ? [] : khongRo.get(JSON.stringify([rs[0].shop, rs[0].vid])) || []));
  }
  return ra.sort((a, b) => String(a.team).localeCompare(String(b.team)) || a.posMa.localeCompare(b.posMa));
}

// Số tiền đơn vị NHỎ → chữ đơn vị LỚN cho lời giải thích (vd. 3700 EUR-nhỏ ⇒ «37 EUR»); tệ lạ ⇒ in số thô kèm tệ, không đoán hệ số.
const chuGia = (gia, te) => (Object.hasOwn(HE_SO_TE, te || '') ? `${Number(gia) / HE_SO_TE[te]} ${te}` : `${gia} (đơn vị nhỏ ${te || '?'})`);

function motNhom(rs, ts, khongRo = []) {
  rs.sort(moiHon);
  const d0 = rs[0];
  const g = {
    team: d0.team, shop: d0.shop, vid: d0.vid, posMa: `${d0.shop}:${d0.vid}`, sku: rs.find((r) => r.sku)?.sku || '',
    tienTe: d0.tienTe, bac: [], boBac: [], lyDo: null, chiTiet: '',
    soDon: rs.reduce((n, r) => n + r.soDon, 0), tu: rs[rs.length - 1].ngay, den: d0.ngay,
  };
  const bo = (lyDo, chiTiet = '') => Object.assign(g, { lyDo, chiTiet, bac: [] });
  if (g.team == null) return bo('khong_ghep_team', 'marketer của đơn chưa ghép hồ sơ HRM, hoặc thuộc nhóm sale dùng chung');
  if (rs.some((r) => SKU_THU.has(chuanSku(r.sku)))) return bo('sku_thu', `SKU «${g.sku}»`);
  const cacTe = [...new Set(rs.map((r) => r.tienTe))];
  if (cacTe.length !== 1 || !cacTe[0]) return bo('lech_tien_te', `đơn mang nhiều tiền tệ: ${cacTe.map((x) => x || '(trống)').join(', ')}`);
  // Đơn KHÔNG RÕ team cùng món mà khác tệ = bất thường về tệ của shop ⇒ CHẶN và nói ra, cùng luật nhóm hai tệ (/code-review vòng 2 #7).
  const teKr = [...new Set(khongRo.map((r) => r.tienTe).filter((x) => x !== g.tienTe))];
  if (teKr.length) {
    return bo('lech_tien_te', `đơn của marketer chưa ghép team / sale dùng chung cùng món mang tệ ${teKr.map((x) => x || '(trống)').join(', ')}`
      + ` — khác tệ ${g.tienTe} của đơn team`);
  }
  const coGia = rs.find((r) => r.giaMon > 0);
  if (coGia) return bo('pos_co_gia_mon', `đơn ngày ${coGia.ngay} mang giá món ${chuGia(coGia.giaMon, g.tienTe)} — POS sẽ cộng giá món vào COD`);
  const theoSl = new Map();
  for (const r of rs) { if (!theoSl.has(r.soLuong)) theoSl.set(r.soLuong, []); theoSl.get(r.soLuong).push(r); }
  for (const sl of [...theoSl.keys()].sort((a, b) => a - b)) {
    const b = tinhMotBac(theoSl.get(sl), ts);
    if (b.lyDo) g.boBac.push({ soLuong: sl, ...b });
    else g.bac.push({ soLuong: sl, ...b });
  }
  const doi = g.boBac.filter((b) => b.lyDo === 'doi_gia_gan_day');
  if (doi.length) {
    return bo('doi_gia_gan_day', doi.map((b) => `bậc ${b.soLuong}: ${b.soDonGanDay} đơn gần nhất ${chuGia(b.giaGanDay, g.tienTe)}`
      + ` · cả cửa sổ ${chuGia(b.giaCuaSo, g.tienTe)} (đơn mới nhất ${b.ganNhat.ngay})`).join(' · '));
  }
  // Bậc ĐỦ đơn mà phân tán ⇒ bỏ CẢ món (/code-review GP1 #2): bậc đang chuyển giá giữa chừng (10 đơn gần nhất 6 mới / 4 cũ) ra «phân tán»
  // chứ chưa ra «đổi giá» — bỏ riêng bậc đó thì bậc ít đơn hơn còn giá CŨ vẫn được đề xuất ⇒ nửa bảng cũ, đúng lỗi G1.
  const tan = g.boBac.filter((b) => b.lyDo === 'phan_tan');
  if (tan.length) {
    return bo('phan_tan', tan.map((b) => `bậc ${b.soLuong}: mức nhiều nhất ${b.soDonMuc}/${b.soDonGanDay} đơn gần nhất`).join(' · '));
  }
  if (!g.bac.length) return bo('it_don', g.boBac.map((b) => `bậc ${b.soLuong}: ${b.tong} đơn`).join(' · '));
  // F1 (đối kháng GP1 vòng 1 · vòng 2): đơn KHÔNG RÕ team (marketer chưa ghép HRM · sale dùng chung) cùng (shop, biến thể, số lượng) không
  // là giá CỦA team nhưng là bằng chứng giá ĐANG bán — CHỈ được chặn, không được mở đề xuất. Cửa sổ ganDay đơn gần nhất trên tập gộp: mức
  // nhiều nhất ≠ giá bậc, hoặc dưới `nguong` ⇒ bỏ CẢ món (vòng 1 bỏ im ⇒ 8 đơn mới 37 EUR mà đề xuất 29 EUR «10/10»). Bậc qua mà cửa sổ có
  // đơn không rõ team ⇒ tỷ lệ trên màn là của TẬP GỘP + `soDonKhongRo` (/code-review vòng 2 #2: «10/10» của team giấu 2/10 đơn giá khác).
  const lechKr = [];
  for (const b of g.bac) {
    const kr = khongRo.filter((r) => r.soLuong === b.soLuong);
    if (!kr.length) continue;
    const cuaTeam = theoSl.get(b.soLuong);
    const gop = [...cuaTeam, ...kr].sort(moiHon);
    if (gop[0].team == null) b.ganNhat = { gia: gop[0].cod, ngay: gop[0].ngay, khongRoTeam: true };
    const { dem, lay, layKhongRo } = cuaSoGan(gop, ts.ganDay);
    const muc = mucNhieuNhat(dem);
    if (muc.cod !== b.gia || muc.n / lay < ts.nguong) {
      lechKr.push(`bậc ${b.soLuong}: ${lay} đơn gần nhất (gồm ${layKhongRo} đơn của marketer chưa ghép team / sale dùng chung) mức nhiều nhất `
        + `${chuGia(muc.cod, g.tienTe)} ${muc.n}/${lay}${muc.cod === b.gia ? ` (dưới ${Math.round(ts.nguong * 100)}%)` : ''}`
        + ` · đơn của team ${chuGia(b.gia, g.tienTe)} (mới nhất ${cuaTeam[0].ngay})`);
    } else if (layKhongRo) {
      Object.assign(b, { soDonMuc: muc.n, soDonGanDay: lay, tiLe: muc.n / lay, soDonKhongRo: layKhongRo });
    }
  }
  if (lechKr.length) return bo('khac_gia_khong_ro_team', lechKr.join(' · '));
  for (let i = 1; i < g.bac.length; i += 1) {
    if (g.bac[i].gia < g.bac[i - 1].gia) {
      return bo('khong_tang', `mua ${g.bac[i].soLuong} = ${chuGia(g.bac[i].gia, g.tienTe)} < mua ${g.bac[i - 1].soLuong} = ${chuGia(g.bac[i - 1].gia, g.tienTe)}`);
    }
  }
  return g;
}

const lonTheoTe = (gia, te) => {
  if (!Object.hasOwn(HE_SO_TE, te)) throw new LoiSanPhamGoc(`tiền tệ ${te} không có trong bảng hệ số — không quy được`, 'lech_tien_te', 409);
  return Number(gia) / HE_SO_TE[te];
};
/** Bậc (đơn vị NHỎ) → `offers` của `saveProduct` (đơn vị LỚN — nó nhân HE_SO_TE đúng một lần). `mien_ship: true` — COD trọn gói đã gồm ship
 *  (người quyết 07/10; `saveProduct` chỉ-giá ghi trường này nguyên ba trạng thái — ca X5/X12); phí ship / giá gốc / khuyến mãi để trống. */
export function offersTuBac(bac, tienTe) {
  return (bac || []).map((b) => ({ so_luong: b.soLuong, price: lonTheoTe(b.gia, tienTe), tien_te: tienTe, mien_ship: true }));
}

/** Dấu của bảng xem trước: món + tệ + bậc (thứ sẽ GHI) + cờ «giá đơn gần nhất khác bậc» (màn tô + bỏ chọn sẵn — /code-review vòng 2 #5:
 *  dòng thành lệch giữa lúc xem và lúc áp mà dấu không đổi ⇒ ghi món người chưa thấy cảnh báo) + số ngày — POST tính lại trong lượt, lệch
 *  ⇒ 409 (bài học F1 GSP3). Không gồm số đơn / tỷ lệ (đơn mới cùng mức không gây 409 giả). */
function dauCua(soNgay, deXuat) {
  const than = JSON.stringify([soNgay, deXuat.map((d) => [d.monId, d.posMa, d.tienTe,
    d.bac.map((b) => [b.soLuong, b.gia, b.ganNhat && b.ganNhat.gia !== b.gia ? 1 : 0])])]);
  return crypto.createHash('sha256').update(than).digest('hex').slice(0, 24);
}

async function docDong(bq, soNgay) {
  try {
    return await bq.truyVan(sqlGiaDon(soNgay));
  } catch (e) {
    throw new LoiSanPhamGoc(`đọc đơn POS từ BigQuery hỏng: ${String(e?.message || e).slice(0, 160)}`, 'bq_hong', 502);
  }
}

// `gia_tay = true` chỉ được đặt ở MỘT chỗ: `saveProduct` chỉ-giá (`src/admin-v3/operations.js` nhánh `chiGia` — grep «gia_tay=true»); món
// đó còn 0 dòng giá = một lượt lưu của người đã ghi bảng giá RỖNG (đường lùi «xoá bậc» ở Theo thị trường; GP1 không bao giờ ghi bảng rỗng —
// nhóm 0 bậc ⇒ `it_don`). Đó là quyết định «món này chưa có giá» (F2 vòng 2): không đề xuất lại, kể cả bằng dấu cũ phát lại (dấu gồm danh
// sách món đề xuất ⇒ lệch ⇒ 409 — ca X11). CHƯA phủ: đường lưu ĐẦY ĐỦ (Vận hành · trang page — chỉ còn mở cho món RF-15 mà chưa page gắn nào
// đọc, `chuyen-ban-sao.js#chanMonPosCuaDayDu`) đặt `cau_hinh_tay` chứ không `gia_tay` ⇒ xoá giá ở đó không được nhận (/code-review vòng 2 #1 —
// nợ N-GP1-XOA-GIA-DAU-HIEU: dấu «đã gỡ giá» tường minh cần `saveProduct`, tệp cấm của phiếu).
const CHI_TIET_XOA_GIA = 'giá tay, 0 bậc — người đã gỡ giá ở Theo thị trường; muốn có giá thì nhập tay ở đó';

/**
 * XEM TRƯỚC — KHÔNG ghi gì. Ghép bậc với món POS của team (`san_pham.ma = <shop>:<biến thể>`, `nguon='pos'`); chỉ món 0 dòng `goi_gia`
 * (kể cả bậc tắt), chưa ai đặt giá tay (`gia_tay`) và đã thuộc một sản phẩm gốc; tiền tệ đơn ≡ tiền tệ thị trường của kết nối team–shop.
 * @param {{ truyVan(sql: string): Promise<object[]> }} bq   BigQuery chỉ đọc (giả trong ca)
 */
export async function xemTruoc(pool, teamId, bq, { soNgay } = {}) {
  const n = chuanSoNgay(soNgay);
  // Chưa nối BigQuery ⇒ nói NGAY (không tốn câu CSDL nào); có nối ⇒ BigQuery (tới 60 s khi đệm hết hạn) chạy SONG SONG với CSDL.
  if (!bq || typeof bq.truyVan !== 'function') {
    throw new LoiSanPhamGoc('máy chủ chưa nối BigQuery (V3_BQ_KHOA) — không đọc được đơn POS để điền giá', 'chua_noi_bq', 503);
  }
  const [teamR, monR, knR, rows] = await Promise.all([
    pool.query('SELECT slug FROM team WHERE id = $1', [String(teamId)]),
    pool.query(
      `SELECT s.id, s.ma, s.ten, s.sku, s.ma_goc, s.gia_tay, s.xmin::text AS version, g.id AS goc_id, g.ten AS goc_ten,
              (SELECT count(*)::int FROM goi_gia x WHERE x.team_id = s.team_id AND x.san_pham_id = s.id) AS so_bac
         FROM san_pham s LEFT JOIN san_pham_goc g ON g.team_id = s.team_id AND g.ma_goc = s.ma_goc
        WHERE s.team_id = $1 AND s.nguon = 'pos'`,
      [String(teamId)],
    ),
    pool.query('SELECT shop_id, market FROM ket_noi_pos WHERE team_id = $1 ORDER BY shop_id', [String(teamId)]),
    docDong(bq, n),
  ]);
  const team = teamR.rows[0];
  if (!team) throw new LoiSanPhamGoc('không có team này', 'khong_co_team', 404);
  const mon = new Map(monR.rows.map((m) => [m.ma, m]));
  const thiTruong = new Map(knR.rows.map((k) => [String(k.shop_id), k.market]));
  // Team HRM → team trên hệ (CR-28-09c, cùng luật `tongHopTeam` của LL17d). Đơn team NÀY ⇒ giữ · marketer chưa ghép mã NV (`team_code`
  // NULL) hoặc nhóm sale dùng chung (`slug:'*'`) ⇒ `null` (khong_ghep_team) · team nghiệp vụ KHÁC hoặc team HRM ngoài hệ (vận đơn, ban
  // giám đốc… — mã không có trong TEAM_HRM) ⇒ BỎ: marketer đã ghép, chỉ là không thuộc team này (/code-review GP1 #4).
  let dongHong = 0;
  const cuaTeam = [];
  for (const r of rows || []) {
    if (!chuanDong(r)) { dongHong += 1; continue; }
    if (!r.team_code) { cuaTeam.push({ ...r, team_code: null }); continue; }
    const t = TEAM_HRM[r.team_code];
    if (!t) continue;
    if (t.slug === '*') cuaTeam.push({ ...r, team_code: null });
    else if (t.slug === team.slug) cuaTeam.push({ ...r, team_code: team.slug });
  }
  const nhom = tinhBac(cuaTeam);
  const deXuat = []; const bo = [];
  const coNhomTeam = new Set(nhom.filter((g) => g.team != null).map((g) => g.posMa));
  const shopCoDon = new Set();
  const boMon = (g, m, lyDo, chiTiet = '') => bo.push({ posMa: g.posMa, monId: m ? String(m.id) : null, ten: m ? m.ten || '' : null,
    sku: (m && m.sku) || g.sku || '', shopId: g.shop, lyDo, chiTiet });
  for (const g of nhom) {
    const m = mon.get(g.posMa) || null;
    if (g.team == null) {
      // Chỉ nói khi đơn không rõ team là bằng chứng DUY NHẤT của một món CHƯA có giá của team — còn lại không phải chuyện của team này
      // (khi team CÓ nhóm cho món, đơn không rõ team đã được đối chiếu trong `tinhBac` — F1 vòng 2).
      if (m && !coNhomTeam.has(g.posMa) && !m.so_bac) {
        if (m.gia_tay) boMon(g, m, 'nguoi_da_xoa_gia', CHI_TIET_XOA_GIA); else boMon(g, m, 'khong_ghep_team', g.chiTiet);
      }
      continue;
    }
    shopCoDon.add(g.shop);
    if (!m) { boMon(g, null, 'khong_co_mon', `${g.soDon} đơn của ${g.posMa} (SKU ${g.sku || '?'}) — món chưa có trong kho POS đã kéo của team`); continue; }
    if (m.so_bac) { boMon(g, m, 'da_co_gia', `đã có ${m.so_bac} bậc`); continue; }
    if (m.gia_tay) { boMon(g, m, 'nguoi_da_xoa_gia', CHI_TIET_XOA_GIA); continue; }
    const market = thiTruong.get(g.shop) ?? null;
    const teTT = market != null && Object.hasOwn(TIEN_TE_THI_TRUONG, String(market).trim()) ? TIEN_TE_THI_TRUONG[String(market).trim()] : null;
    if (g.lyDo) { boMon(g, m, g.lyDo, g.chiTiet); continue; }
    if (!teTT || g.tienTe !== teTT) {
      boMon(g, m, 'lech_tien_te', teTT ? `đơn ${g.tienTe} · thị trường ${market} dùng ${teTT}`
        : `thị trường «${market ?? 'chưa khai'}» của shop ${g.shop} không có trong bảng tiền tệ`);
      continue;
    }
    if (!m.goc_id) { boMon(g, m, 'chua_gop_goc', 'gộp món vào sản phẩm trước (Gộp món POS) — giá của món sửa ở Theo thị trường của sản phẩm'); continue; }
    deXuat.push({
      monId: String(m.id), posMa: m.ma, ten: m.ten || '', sku: m.sku || g.sku || '', shopId: g.shop, market, tienTe: teTT,
      gocId: String(m.goc_id), maGoc: m.ma_goc, tenGoc: m.goc_ten || '', version: m.version,
      bac: g.bac.map((b) => ({ ...b, giaLon: lonTheoTe(b.gia, teTT), ganNhat: { ...b.ganNhat, giaLon: lonTheoTe(b.ganNhat.gia, teTT) } })),
      boBac: g.boBac.map((b) => ({ soLuong: b.soLuong, lyDo: b.lyDo, tong: b.tong })),
      soDon: g.soDon, tu: g.tu, den: g.den,
    });
  }
  deXuat.sort((a, b) => a.posMa.localeCompare(b.posMa));
  bo.sort((a, b) => a.lyDo.localeCompare(b.lyDo) || a.posMa.localeCompare(b.posMa));
  const dem = {};
  for (const b of bo) dem[b.lyDo] = (dem[b.lyDo] || 0) + 1;
  return {
    soNgay: n, ...THAM_SO_MAC_DINH, tranMotLuot: TRAN_MON_MOT_LUOT, docLuc: Number(rows?.luc) || null,
    deXuat, bo, dem, dongHong, chuLyDo: CHU_LY_DO,
    shopKhongDon: knR.rows.filter((k) => !shopCoDon.has(String(k.shop_id))).map((k) => ({ shopId: String(k.shop_id), market: k.market })),
    dauXemTruoc: dauCua(n, deXuat),
  };
}

/**
 * CHỐT trong giao dịch ghi (chạy NGAY SAU `BEGIN` của `saveProduct` qua `poolChotDauGiaoDich`): giữ khoá danh mục của team (cùng khoá lượt
 * kéo POS + `saveProduct` dùng) rồi kiểm món còn 0 dòng `goi_gia`. Có dòng ⇒ 409 `da_co_gia`, giao dịch ROLLBACK — không DELETE/INSERT đè.
 */
export async function chotMonChuaCoGia(c, teamId, monId) {
  const k = await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS ok', [`catalog:${teamId}`]);
  // Khoá này giữ bởi lượt kéo POS HOẶC một lượt lưu giá khác (lượt áp thứ hai, «Theo thị trường») — câu nói cả hai (/code-review GP1 #6).
  if (!k.rows[0].ok) {
    throw new LoiSanPhamGoc('danh mục sản phẩm của team đang được ghi ở lượt khác (kéo POS hoặc lưu giá) — chưa ghi món này; áp lại sau',
      'danh_muc_dang_ghi', 409);
  }
  const so = (await c.query('SELECT count(*)::int AS n FROM goi_gia WHERE team_id = $1 AND san_pham_id = $2', [String(teamId), String(monId)])).rows[0].n;
  if (so) throw new LoiSanPhamGoc(`món đã có ${so} bậc giá (ghi trong lúc áp) — không ghi đè`, 'da_co_gia', 409);
}

/**
 * ÁP — tính lại xem trước TRONG lượt; dấu thiếu/lệch ⇒ 409 kèm bảng mới (người áp đúng thứ đã thấy). Mỗi món ghi qua `luuGia` của nơi gọi
 * (cửa lưu giá có sẵn) — MỘT giao dịch mỗi món: món hỏng thì dừng món đó (không nửa vời trong một món), món khác đi tiếp, báo rõ.
 * @param {{ luuGia: (x: { gocId, posMa, monId, offers, version, chot }) => Promise<object>, tranMotLuot?: number }} deps
 */
export async function apGiaTuDon(pool, teamId, bq, { dauXemTruoc, monIds, soNgay } = {}, { luuGia, tranMotLuot = TRAN_MON_MOT_LUOT } = {}) {
  if (typeof luuGia !== 'function') throw new LoiSanPhamGoc('máy chủ chưa nối cửa lưu giá cho «Điền giá từ đơn POS»', 'chua_noi', 500);
  const xt = await xemTruoc(pool, teamId, bq, { soNgay });
  if (!dauXemTruoc) {
    throw Object.assign(new LoiSanPhamGoc('thiếu dấu bảng xem trước — mở xem trước rồi áp', 'thieu_dau_xem_truoc', 409), { duLieu: { xemTruoc: xt } });
  }
  if (dauXemTruoc !== xt.dauXemTruoc) {
    throw Object.assign(new LoiSanPhamGoc('bảng xem trước đã đổi từ lúc bạn xem (giá món hoặc đơn POS mới) — xem lại rồi áp; chưa ghi gì',
      'xem_truoc_da_doi', 409), { duLieu: { xemTruoc: xt } });
  }
  let chon = xt.deXuat;
  if (monIds !== undefined) {
    if (!Array.isArray(monIds) || !monIds.length) throw new LoiSanPhamGoc('chọn ít nhất một món để áp', 'chua_chon_mon', 400);
    const theoId = new Map(xt.deXuat.map((d) => [d.monId, d]));
    const la = monIds.map(String).filter((id) => !theoId.has(id));
    if (la.length) throw new LoiSanPhamGoc(`món ${la.slice(0, 5).join(', ')} không nằm trong bảng đề xuất — chưa ghi gì`, 'mon_ngoai_de_xuat', 400);
    const can = new Set(monIds.map(String));
    chon = xt.deXuat.filter((d) => can.has(d.monId));
  }
  if (chon.length > tranMotLuot) {
    throw new LoiSanPhamGoc(`một lượt áp tối đa ${tranMotLuot} món (đang chọn ${chon.length}) — chọn bớt, áp xong bảng tải lại để áp tiếp; chưa ghi gì`,
      'qua_nhieu_mon', 400);
  }
  const ghi = []; const hong = [];
  for (const d of chon) {
    try {
      const offers = offersTuBac(d.bac, d.tienTe);
      const kq = await luuGia({ gocId: d.gocId, posMa: d.posMa, monId: d.monId, offers, version: d.version,
        chot: (c) => chotMonChuaCoGia(c, teamId, d.monId) });
      ghi.push({ monId: d.monId, posMa: d.posMa, ten: d.ten, sku: d.sku, gocId: d.gocId, maGoc: d.maGoc, shopId: d.shopId, market: d.market,
        tienTe: d.tienTe, bac: d.bac, mienShip: offers.every((o) => o.mien_ship === true), soDon: d.soDon, tu: d.tu, den: d.den,
        dongBo: kq?.dongBo ?? null });
    } catch (e) {
      hong.push({ monId: d.monId, posMa: d.posMa, ten: d.ten, lyDo: e?.ma || (e?.status === 409 ? 'da_doi' : 'loi'),
        thongDiep: String(e?.message || e).slice(0, 200) });
    }
  }
  return { soNgay: xt.soNgay, ghi, hong };
}

/**
 * Nguồn BigQuery có ĐỆM theo câu đọc (`hanMs`, mặc định 1 giờ) — xem trước và áp đọc cùng một lát dữ liệu; dấu chỉ còn bắt đổi phía CSDL.
 * Mỗi `?soNgay=` khác là một câu đọc khác ⇒ đệm giữ tối đa `toiDa` câu, bỏ mục hết hạn / cũ nhất (/code-review GP1 #10: không giữ vĩnh viễn
 * cả trăm bộ dòng đơn của cả công ty trong tiến trình chay-that).
 */
export function taoNguonGiaDon({ taoKhach, hanMs = 3600 * 1000, toiDa = 4, dongHo = () => Date.now() } = {}) {
  if (typeof taoKhach !== 'function') throw new Error('taoNguonGiaDon cần `taoKhach` là hàm');
  let khach = null;
  const dem = new Map();
  const dang = new Map();
  return {
    async truyVan(sql) {
      const c = dem.get(sql);
      if (c && dongHo() - c.luc < hanMs) return c.rows;
      if (dang.has(sql)) return dang.get(sql);
      const p = (async () => {
        khach ||= taoKhach();
        const rows = await khach.truyVan(sql);
        Object.defineProperty(rows, 'luc', { value: dongHo(), enumerable: false });
        dem.delete(sql);
        for (const [k, v] of dem) if (dongHo() - v.luc >= hanMs) dem.delete(k);
        while (dem.size >= toiDa) dem.delete(dem.keys().next().value);   // Map giữ thứ tự chèn ⇒ khoá đầu = cũ nhất
        dem.set(sql, { luc: rows.luc, rows });
        return rows;
      })().finally(() => dang.delete(sql));
      dang.set(sql, p);
      return p;
    },
  };
}
