// ĐƠN POS TỪ BIGQUERY — SỐ TỔNG HỢP, CHỈ ĐỌC (LL17a · 02/10 — mức nhẹ của LL17).
//
// Người quyết 02/10: «ok làm mức nhẹ đi» — màn Số liệu đọc SỐ TỔNG HỢP đơn từ BigQuery (đếm · trạng thái · COD theo team, marketer,
// ngày), KHÔNG chép tên/SĐT khách vào v3. Vì sao: `don_hang` của v3 trên prod là ảnh chụp nạp một lần 28/08 (123.629 dòng, mọi dòng
// gán team GCC) — đứng im 5 tuần; BigQuery `PIALPHA_ALL_Dataset.vw_sale_order_team` đồng bộ hằng ngày (đo 02/10: đồng bộ 07:30 sáng
// nay · 14.675 đơn sau 28/08 · 13 shop).
//
// Đo 02/10 (prod, chỉ đọc) — luật của câu đọc dưới đây:
//   · marketer của đơn là JSON `{"id": …}` ⇒ `JSON_VALUE(marketer,'$.id')` → `dim_person_map.person_id` → mã NV (một person ↔ một mã);
//   · TIỀN ở cột `cod` (đơn vị nhỏ nhất của tiền tệ shop) chia `dim_shop_project.currency_divisor` (SAR/AED/KWD/… 100 · TWD 1);
//     `total_price` = 0 trên MỌI shop (7.851/7.851 đơn Saudi 30 ngày) — không dùng;
//   · `status_category`: GIAO_THANH_CONG · DON_HOAN · HUY · DANG_GIAO · CHO_HANG · DA_XAC_NHAN · DA_DAT_HANG · DON_THO · UNKNOWN;
//   · 1 đơn mang ngày TƯƠNG LAI (01/11/2026) — loại khỏi số, đếm riêng để màn nói ra.
// Không cộng tiền khác tệ: COD trả THEO TỪNG TIỀN TỆ (nguyên tắc màn Báo cáo — không cộng thứ đo bằng thước khác nhau).
//
// LL17b · 02/10 — HAI LUỒNG theo ĐÚNG luật của bộ nạp `don_hang` (`src/pos/doc-don.js#suyNguon`): `conversation_id` của đơn
// (trong `payload_json`) đúng khuôn `<page>_<psid>` ⇒ messenger · trống ⇒ trang bán hàng · sai khuôn ⇒ KHÔNG SUY ĐƯỢC (đếm riêng, cấm
// đoán). Đo 02/10, 30 ngày: messenger 7.997 · trang bán hàng 5.230 · sai khuôn 0. Thêm một câu THEO PAGE (30 ngày, `page_id` của đơn)
// cho cột «Chốt · Hoàn» của bảng Theo page.
//
// LL17d · 05/10 — TEAM THEO NGÀY ĐƠN (luật ký CR-28-09c: «đơn thuộc team của marketer VÀO NGÀY ĐƠN»; nợ N-DON-TEAM-THEO-NGAY). Team
// suy NGAY TRONG BigQuery từ `HRM_Core.fact_employee_team_history` (hiệu lực `hieu_luc_tu` … `hieu_luc_den`, NULL = đang hiệu lực);
// nhiều dòng phủ cùng ngày ⇒ dòng bắt đầu muộn nhất (tất định, không `ANY_VALUE`). Không dòng nào phủ ngày đơn ⇒ team HIỆN TẠI
// (luật cũ) và ĐẾM RIÊNG để màn nói ra. Đo 05/10, 60 ngày: 23.194 đơn có mã · 628 đơn (một marketer, GCC → EU, 07/08–31/08) mà
// team theo ngày KHÁC team hiện tại · 3 đơn không có lịch sử phủ ngày · 0 chồng chéo.
import { TEAM_HRM } from './hrm.js';

export const SO_NGAY_DOC = 60;
const BANG = '`levelup-465304`.PIALPHA_ALL_Dataset';
const BANG_LICH_SU_TEAM = '`levelup-465304`.HRM_Core.fact_employee_team_history';
/** Luồng của đơn — đúng luật `suyNguon` (khuôn `<page_id>_<psid>`). */
const LUONG = `CASE WHEN IFNULL(JSON_VALUE(payload_json, '$.conversation_id'), '') = '' THEN 'trang_ban_hang'
                 WHEN REGEXP_CONTAINS(JSON_VALUE(payload_json, '$.conversation_id'), r'^[0-9]+_[0-9]+$') THEN 'messenger'
                 ELSE 'khong_suy_duoc' END`;
export const LUONG_DON = Object.freeze(['messenger', 'trang_ban_hang', 'khong_suy_duoc']);
export const SQL_DON_POS = `WITH m AS (
    SELECT person_id, ANY_VALUE(emp_code) AS emp_code FROM ${BANG}.dim_person_map WHERE emp_code IS NOT NULL GROUP BY person_id),
  p AS (SELECT shop_id, ANY_VALUE(currency) AS currency, ANY_VALUE(currency_divisor) AS chia FROM ${BANG}.dim_shop_project GROUP BY shop_id),
  o AS (SELECT SAFE_CAST(inserted_date AS DATE) AS ngay, shop_id, JSON_VALUE(marketer, '$.id') AS mk, status_category, cod,
               ${LUONG} AS luong
          FROM ${BANG}.vw_sale_order_team
         WHERE SAFE_CAST(inserted_date AS DATE) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${SO_NGAY_DOC - 1} DAY) AND CURRENT_DATE()),
  om AS (SELECT o.*, m.emp_code FROM o LEFT JOIN m ON m.person_id = o.mk),
  d AS (SELECT DISTINCT emp_code, ngay FROM om WHERE emp_code IS NOT NULL),
  dh AS (SELECT d.emp_code, d.ngay, ARRAY_AGG(h.team_code ORDER BY h.hieu_luc_tu DESC LIMIT 1)[SAFE_OFFSET(0)] AS team_ngay
           FROM d JOIN ${BANG_LICH_SU_TEAM} h
             ON h.emp_code = d.emp_code AND h.hieu_luc_tu <= d.ngay AND (h.hieu_luc_den IS NULL OR d.ngay <= h.hieu_luc_den)
          GROUP BY 1, 2),
  t AS (SELECT om.*, dh.team_ngay FROM om LEFT JOIN dh ON dh.emp_code = om.emp_code AND dh.ngay = om.ngay)
  SELECT CAST(o.ngay AS STRING) AS ngay, o.shop_id, p.currency, p.chia, o.emp_code, o.team_ngay, o.status_category, o.luong,
         COUNT(*) AS so_don, SUM(IFNULL(o.cod, 0)) AS cod
    FROM t AS o LEFT JOIN p ON p.shop_id = o.shop_id
   GROUP BY 1, 2, 3, 4, 5, 6, 7, 8`;
export const SO_NGAY_PAGE = 30;
export const SQL_DON_POS_PAGE = `SELECT NULLIF(page_id, '') AS page_id, status_category, COUNT(*) AS so_don
    FROM ${BANG}.vw_sale_order_team
   WHERE SAFE_CAST(inserted_date AS DATE) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${SO_NGAY_PAGE - 1} DAY) AND CURRENT_DATE()
   GROUP BY 1, 2`;
export const SQL_DON_POS_MOC = `SELECT CAST(CURRENT_DATE() AS STRING) AS hom_nay, CAST(MAX(sync_time) AS STRING) AS dong_bo,
    COUNTIF(SAFE_CAST(inserted_date AS DATE) > CURRENT_DATE()) AS tuong_lai
  FROM ${BANG}.vw_sale_order_team`;

/** Nhóm trạng thái cho màn — mã lạ (kể cả UNKNOWN) vào «khác», KHÔNG đoán. */
export const NHOM_TRANG_THAI = Object.freeze({
  GIAO_THANH_CONG: 'thanhCong', DON_HOAN: 'hoan', HUY: 'huy',
  DANG_GIAO: 'dangXuLy', CHO_HANG: 'dangXuLy', DA_XAC_NHAN: 'dangXuLy', DA_DAT_HANG: 'dangXuLy', DON_THO: 'dangXuLy',
});

/** Bộ đọc: `{ luc, homNay, dongBo, tuongLai, dong: [{ ngay, shop, tienTe, chia, maNv, teamNgay, trangThai, luong, soDon, cod }],
 *  theoPage: [{ page, trangThai, soDon }] }` (LL17b thêm `luong` + `theoPage`; LL17d thêm `teamNgay`) — đệm `hanMs`. */
export function taoDocDonPos({ taoKhach, hanMs = 3600 * 1000, dongHo = () => Date.now() } = {}) {
  if (typeof taoKhach !== 'function') throw new Error('taoDocDonPos cần `taoKhach` là hàm');
  let khach = null;
  let dem = null;
  let dangDoc = null;
  return async function docDonPos({ lamMoi = false } = {}) {
    if (!lamMoi && dem && dongHo() - dem.luc < hanMs) return dem;
    if (dangDoc) return dangDoc;
    dangDoc = (async () => {
      khach ||= taoKhach();
      const [rows, [moc], page] = await Promise.all([khach.truyVan(SQL_DON_POS), khach.truyVan(SQL_DON_POS_MOC), khach.truyVan(SQL_DON_POS_PAGE)]);
      dem = {
        luc: dongHo(), homNay: moc.hom_nay, dongBo: moc.dong_bo || null, tuongLai: Number(moc.tuong_lai) || 0,
        dong: rows.map((r) => ({ ngay: r.ngay, shop: r.shop_id, tienTe: r.currency || null, chia: Number(r.chia) || 1, maNv: r.emp_code || null,
          teamNgay: r.team_ngay || null, trangThai: r.status_category || null, luong: r.luong || 'khong_suy_duoc', soDon: Number(r.so_don) || 0, cod: Number(r.cod) || 0 })),
        theoPage: page.map((r) => ({ page: r.page_id || null, trangThai: r.status_category || null, soDon: Number(r.so_don) || 0 })),
      };
      return dem;
    })().finally(() => { dangDoc = null; });
    return dangDoc;
  };
}

const demRong = () => ({ don: 0, thanhCong: 0, hoan: 0, huy: 0, dangXuLy: 0, khac: 0, codThanhCong: {} });
function cong(d, r) {
  const nhom = NHOM_TRANG_THAI[r.trangThai] || 'khac';
  d.don += r.soDon;
  d[nhom] += r.soDon;
  if (nhom === 'thanhCong' && r.tienTe) d.codThanhCong[r.tienTe] = (d.codThanhCong[r.tienTe] || 0) + r.cod / (r.chia || 1);
}
/** Ngày `YYYY-MM-DD` lùi `n` ngày (lịch UTC — chuỗi ngày không mang giờ). */
export function luiNgay(ngay, n) {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Số của MỘT team: đơn thuộc team của marketer theo HRM (luật CR-28-09c «đơn thuộc marketer theo bảng ghép HRM»). Đơn chưa ghép
 * marketer ⇒ «chờ gán team»; marketer có mã NV mà team HRM không phải team nghiệp vụ trên hệ ⇒ «ngoài hệ». Hai nhóm ấy đếm CẢ CÔNG TY.
 * Team = team HRM của marketer VÀO NGÀY ĐƠN (`teamNgay`, LL17d); HRM chưa có lịch sử phủ ngày đó ⇒ team HIỆN TẠI, đếm ở `theoHienTai`
 * (cả công ty) để màn nói ra.
 * @param {{ homNay:string, dong:Array }} du   bộ đọc đơn
 * @param {{ nhanVien:Array }} hrm             bộ đọc HRM (`taoDocHrm`)
 * @param {{ slug:string, chiMaNv?:string|null|undefined, khoang?:number[] }} o  `chiMaNv` !== undefined ⇒ chỉ dòng marketer này
 */
export function tongHopTeam(du, hrm, { slug, chiMaNv = undefined, khoang = [7, 30] } = {}) {
  const nv = new Map(((hrm && hrm.nhanVien) || []).map((n) => [n.emp_code, n]));
  const tu = Object.fromEntries(khoang.map((k) => [k, luiNgay(du.homNay, k - 1)]));
  const moi = () => Object.fromEntries(khoang.map((k) => [k, demRong()]));
  const team = moi(); const choGan = moi(); const ngoaiHe = moi(); const theoHienTai = moi();
  const luong = Object.fromEntries(LUONG_DON.map((l) => [l, moi()]));   // LL17b: đơn của TEAM tách theo luồng (không gộp)
  const theoMk = new Map();
  for (const r of (du && du.dong) || []) {
    const vao = khoang.filter((k) => r.ngay >= tu[k] && r.ngay <= du.homNay);
    if (!vao.length) continue;
    let dich = null; let mk = null; let hienTai = false;
    if (!r.maNv) dich = choGan;
    else {
      const n = nv.get(r.maNv);
      hienTai = !r.teamNgay && !!n;
      const t = TEAM_HRM[r.teamNgay || (n ? n.team_code : '')] || null;
      if (!t || t.slug === '*') dich = ngoaiHe;
      else if (t.slug === slug) {
        dich = team;
        if (chiMaNv === undefined || chiMaNv === r.maNv) {
          if (!theoMk.has(r.maNv)) theoMk.set(r.maNv, { maNv: r.maNv, ten: (n && n.ho_ten) || r.maNv, daNghi: !!n && n.status === 'nghi', k: moi() });
          mk = theoMk.get(r.maNv).k;
        }
      }
    }
    for (const k of vao) {
      if (dich) cong(dich[k], r);
      if (mk) cong(mk[k], r);
      if (dich === team) cong(luong[r.luong in luong ? r.luong : 'khong_suy_duoc'][k], r);
      if (hienTai) cong(theoHienTai[k], r);
    }
  }
  const lon = khoang[khoang.length - 1];
  return {
    homNay: du.homNay, khoang, team, choGan, ngoaiHe, luong, theoHienTai,
    marketer: [...theoMk.values()].sort((a, b) => b.k[lon].don - a.k[lon].don || a.ten.localeCompare(b.ten, 'vi')),
  };
}

/** Tỉ lệ giao thành công trên đơn ĐÃ KẾT THÚC giao (thành công + hoàn); chưa có đơn kết thúc ⇒ null (không phải 0). */
export const tiLeGiao = (d) => (d.thanhCong + d.hoan ? d.thanhCong / (d.thanhCong + d.hoan) : null);

/**
 * LL17b — số 30 ngày THEO PAGE (`page_id` Facebook của đơn) cho các page của team: `{ [pageId]: { don, thanhCong, hoan, huy, dangXuLy, khac } }`.
 * Đơn không mang `page_id` (trang bán hàng / tạo tay) không vào bảng này.
 * @param {Iterable<string>} pageIds  page_id Facebook của team đang mở
 */
export function theoPageTeam(du, pageIds) {
  const cua = new Set([...pageIds].map(String));
  const ra = {};
  for (const r of (du && du.theoPage) || []) {
    if (!r.page || !cua.has(String(r.page))) continue;
    cong(ra[r.page] ||= demRong(), r);
  }
  return ra;
}
