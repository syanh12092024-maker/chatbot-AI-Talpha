// HỒ SƠ NHÂN SỰ TỪ HRM — BigQuery `levelup-465304`, CHỈ ĐỌC, ĐỆM MỘT NGÀY (LL15a · 02/10).
//
// Hai bảng (đo 02/10): `HRM_Core.dim_employee` 118 hồ sơ cả công ty (emp_code không trùng, email công ty không trùng) và
// `PIALPHA_ALL_Dataset.dim_person_map` 324 dòng ghép tài khoản POS → mã nhân viên (confirmed 270 · unmapped 47 · da_nghi 6 ·
// needs_hcns 1; vai: creator · sale · seller · marketer). Lớp này chỉ ĐỌC + đệm; KHÔNG tạo người dùng, KHÔNG khoá ai —
// việc ghi vào bảng quyền là phiếu sau (LL15b), cần gật riêng.
//
// Khách BigQuery dựng LÚC GỌI ĐẦU TIÊN, không lúc khởi động: thiếu / hỏng tệp khoá thì màn nói «đọc HRM hỏng: …», tiến trình
// không chết theo.
export const BANG_NHAN_VIEN = '`levelup-465304.HRM_Core.dim_employee`';
export const BANG_GHEP_POS = '`levelup-465304.PIALPHA_ALL_Dataset.dim_person_map`';

/** Team HRM → team trên hệ — người quyết chốt 29/09 (CR-28-09c). `slug:'*'` = sale dùng chung cả ba team. BO · VANDON · CTV
 *  không vào hệ ⇒ không có dòng ở đây. */
export const TEAM_HRM = Object.freeze({
  PIALPHA_GCC: Object.freeze({ slug: 'tieu-alpha', ten: 'Pialpha GCC' }),
  PIALPHA_AUUS: Object.freeze({ slug: 'auus', ten: 'Pialpha AUUS' }),
  PIALPHA_EU: Object.freeze({ slug: 'pialpha-eu', ten: 'Pialpha EU' }),
  PIALPHA_SALE_ONLINE: Object.freeze({ slug: '*', ten: 'Sale online · cả ba team' }),
  PIALPHA_SALE_OFFLINE: Object.freeze({ slug: '*', ten: 'Sale offline · cả ba team' }),
});
export const CHU_TRANG_THAI_NV = Object.freeze({ active: 'đang làm', thuviec: 'thử việc', nghi: 'đã nghỉ' });
export const CHU_GHEP = Object.freeze({
  confirmed: 'đã xác nhận', needs_hcns: 'HCNS chưa xác nhận', unmapped: 'chưa có trong bảng ghép', da_nghi: 'đã nghỉ',
});

// Chỉ cột cần — không kéo lương/cấp bậc/quản lý về máy chủ chat.
export const SQL_NHAN_VIEN = `SELECT emp_code, ho_ten, chuc_vu, status, email_cong_ty, team_code FROM ${BANG_NHAN_VIEN}`;
export const SQL_GHEP_POS = `SELECT person_id, person_name, emp_code, map_status, source_role, id_type, updated_at FROM ${BANG_GHEP_POS}`;

/**
 * Bộ đọc HRM có đệm.
 * @param {{ taoKhach: () => { truyVan(sql: string): Promise<object[]> }, hanMs?: number, dongHo?: () => number }} o
 * @returns {(bo?: { lamMoi?: boolean }) => Promise<{ luc: number, nhanVien: object[], ghep: object[] }>}
 */
export function taoDocHrm({ taoKhach, hanMs = 24 * 3600 * 1000, dongHo = () => Date.now() } = {}) {
  if (typeof taoKhach !== 'function') throw new Error('taoDocHrm cần `taoKhach` là hàm');
  let khach = null;
  let dem = null;
  let dangDoc = null;
  return async function docHrm({ lamMoi = false } = {}) {
    if (!lamMoi && dem && dongHo() - dem.luc < hanMs) return dem;
    if (dangDoc) return dangDoc;   // hai màn mở cùng lúc ⇒ một lượt đọc
    dangDoc = (async () => {
      khach ||= taoKhach();
      const [nhanVien, ghep] = await Promise.all([khach.truyVan(SQL_NHAN_VIEN), khach.truyVan(SQL_GHEP_POS)]);
      dem = { luc: dongHo(), nhanVien, ghep };
      return dem;
    })().finally(() => { dangDoc = null; });
    return dangDoc;
  };
}

/** Số đo của một lượt đọc — cho màn Kết nối › HRM (số đọc từ nguồn, không chép tay). */
export function tomTatHrm({ luc, nhanVien = [], ghep = [] } = {}) {
  const pialpha = nhanVien.filter((n) => TEAM_HRM[n.team_code]);
  return {
    luc,
    soHoSo: nhanVien.length,
    soHoSoPialpha: pialpha.length,
    soHoSoPialphaDangLam: pialpha.filter((n) => n.status !== 'nghi').length,
    soGhep: ghep.length,
    soGhepXacNhan: ghep.filter((g) => g.map_status === 'confirmed').length,
    soGhepChuaGhep: ghep.filter((g) => g.map_status === 'unmapped').length,
    soTaiKhoanMarketer: ghep.filter((g) => g.source_role === 'marketer').length,
  };
}

/**
 * Tài khoản MARKETER trên POS ↔ hồ sơ HRM ↔ team trên hệ. Mỗi dòng gắn team theo `TEAM_HRM[team_code của nhân viên]`:
 *   · ra team trên hệ                     → `slug` của team đó;
 *   · người đã nghỉ (`map_status` da_nghi, hoặc hồ sơ `nghi`) → `daNghi: true` — KHÔNG tính là «chờ gán» (đo 02/10: 6 dòng
 *     marketer da_nghi không ra hồ sơ);
 *   · không ra nhân viên mà chưa nghỉ (chưa ghép / HCNS chưa xác nhận / mã không có trong HRM) → `choGan: true`;
 *   · nhân viên thuộc team KHÔNG vào hệ (vận đơn, mua hàng, ban giám đốc, công ty khác) → `ngoaiHe: true`.
 */
export function marketerPosTheoTeam({ nhanVien = [], ghep = [] } = {}) {
  const nvTheoMa = new Map(nhanVien.map((n) => [n.emp_code, n]));
  return ghep.filter((g) => g.source_role === 'marketer').map((g) => {
    const nv = g.emp_code ? nvTheoMa.get(g.emp_code) || null : null;
    const team = nv ? TEAM_HRM[nv.team_code] || null : null;
    const daNghi = g.map_status === 'da_nghi' || (!!nv && nv.status === 'nghi');
    return {
      taiKhoan: g.person_name || g.person_id || '', loaiId: g.id_type || '', maNv: g.emp_code || null,
      hoTen: nv ? nv.ho_ten || null : null, trangThaiNv: nv ? CHU_TRANG_THAI_NV[nv.status] || nv.status || null : null,
      maGhep: g.map_status || null, ghep: CHU_GHEP[g.map_status] || g.map_status || '',
      teamHrm: nv ? nv.team_code || null : null, slug: team ? team.slug : null, tenTeam: team ? team.ten : null,
      daNghi, choGan: !nv && !daNghi, ngoaiHe: !!nv && !team && !daNghi,
    };
  });
}
