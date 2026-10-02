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
import { TEAM_HRM } from './hrm.js';

export const SO_NGAY_DOC = 60;
const BANG = '`levelup-465304`.PIALPHA_ALL_Dataset';
export const SQL_DON_POS = `WITH m AS (
    SELECT person_id, ANY_VALUE(emp_code) AS emp_code FROM ${BANG}.dim_person_map WHERE emp_code IS NOT NULL GROUP BY person_id),
  p AS (SELECT shop_id, ANY_VALUE(currency) AS currency, ANY_VALUE(currency_divisor) AS chia FROM ${BANG}.dim_shop_project GROUP BY shop_id),
  o AS (SELECT SAFE_CAST(inserted_date AS DATE) AS ngay, shop_id, JSON_VALUE(marketer, '$.id') AS mk, status_category, cod
          FROM ${BANG}.vw_sale_order_team
         WHERE SAFE_CAST(inserted_date AS DATE) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${SO_NGAY_DOC - 1} DAY) AND CURRENT_DATE())
  SELECT CAST(o.ngay AS STRING) AS ngay, o.shop_id, p.currency, p.chia, m.emp_code, o.status_category,
         COUNT(*) AS so_don, SUM(IFNULL(o.cod, 0)) AS cod
    FROM o LEFT JOIN m ON m.person_id = o.mk LEFT JOIN p ON p.shop_id = o.shop_id
   GROUP BY 1, 2, 3, 4, 5, 6`;
export const SQL_DON_POS_MOC = `SELECT CAST(CURRENT_DATE() AS STRING) AS hom_nay, CAST(MAX(sync_time) AS STRING) AS dong_bo,
    COUNTIF(SAFE_CAST(inserted_date AS DATE) > CURRENT_DATE()) AS tuong_lai
  FROM ${BANG}.vw_sale_order_team`;

/** Nhóm trạng thái cho màn — mã lạ (kể cả UNKNOWN) vào «khác», KHÔNG đoán. */
export const NHOM_TRANG_THAI = Object.freeze({
  GIAO_THANH_CONG: 'thanhCong', DON_HOAN: 'hoan', HUY: 'huy',
  DANG_GIAO: 'dangXuLy', CHO_HANG: 'dangXuLy', DA_XAC_NHAN: 'dangXuLy', DA_DAT_HANG: 'dangXuLy', DON_THO: 'dangXuLy',
});

/** Bộ đọc: `{ luc, homNay, dongBo, tuongLai, dong: [{ ngay, shop, tienTe, chia, maNv, trangThai, soDon, cod }] }` — đệm `hanMs`. */
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
      const [rows, [moc]] = await Promise.all([khach.truyVan(SQL_DON_POS), khach.truyVan(SQL_DON_POS_MOC)]);
      dem = {
        luc: dongHo(), homNay: moc.hom_nay, dongBo: moc.dong_bo || null, tuongLai: Number(moc.tuong_lai) || 0,
        dong: rows.map((r) => ({ ngay: r.ngay, shop: r.shop_id, tienTe: r.currency || null, chia: Number(r.chia) || 1, maNv: r.emp_code || null,
          trangThai: r.status_category || null, soDon: Number(r.so_don) || 0, cod: Number(r.cod) || 0 })),
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
 * Team = team HRM HIỆN TẠI của marketer (chưa theo ngày đơn — nợ N-DON-TEAM-THEO-NGAY).
 * @param {{ homNay:string, dong:Array }} du   bộ đọc đơn
 * @param {{ nhanVien:Array }} hrm             bộ đọc HRM (`taoDocHrm`)
 * @param {{ slug:string, chiMaNv?:string|null|undefined, khoang?:number[] }} o  `chiMaNv` !== undefined ⇒ chỉ dòng marketer này
 */
export function tongHopTeam(du, hrm, { slug, chiMaNv = undefined, khoang = [7, 30] } = {}) {
  const nv = new Map(((hrm && hrm.nhanVien) || []).map((n) => [n.emp_code, n]));
  const tu = Object.fromEntries(khoang.map((k) => [k, luiNgay(du.homNay, k - 1)]));
  const moi = () => Object.fromEntries(khoang.map((k) => [k, demRong()]));
  const team = moi(); const choGan = moi(); const ngoaiHe = moi();
  const theoMk = new Map();
  for (const r of (du && du.dong) || []) {
    const vao = khoang.filter((k) => r.ngay >= tu[k] && r.ngay <= du.homNay);
    if (!vao.length) continue;
    let dich = null; let mk = null;
    if (!r.maNv) dich = choGan;
    else {
      const n = nv.get(r.maNv);
      const t = n ? TEAM_HRM[n.team_code] : null;
      if (!t || t.slug === '*') dich = ngoaiHe;
      else if (t.slug === slug) {
        dich = team;
        if (chiMaNv === undefined || chiMaNv === r.maNv) {
          if (!theoMk.has(r.maNv)) theoMk.set(r.maNv, { maNv: r.maNv, ten: n.ho_ten || r.maNv, daNghi: n.status === 'nghi', k: moi() });
          mk = theoMk.get(r.maNv).k;
        }
      }
    }
    for (const k of vao) {
      if (dich) cong(dich[k], r);
      if (mk) cong(mk[k], r);
    }
  }
  const lon = khoang[khoang.length - 1];
  return {
    homNay: du.homNay, khoang, team, choGan, ngoaiHe,
    marketer: [...theoMk.values()].sort((a, b) => b.k[lon].don - a.k[lon].don || a.ten.localeCompare(b.ten, 'vi')),
  };
}

/** Tỉ lệ giao thành công trên đơn ĐÃ KẾT THÚC giao (thành công + hoàn); chưa có đơn kết thúc ⇒ null (không phải 0). */
export const tiLeGiao = (d) => (d.thanhCong + d.hoan ? d.thanhCong / (d.thanhCong + d.hoan) : null);
