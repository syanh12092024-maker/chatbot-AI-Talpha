// LL15b · 02/10 — NGƯỜI THEO HRM ở màn Người và team: xem kế hoạch · áp · đặt mật khẩu đầu · trạng thái lượt tự động.
//
// Luật + ranh giới + rào nằm ở `src/hrm/dong-bo.js` (tầng A — ghi bằng pool trong MỘT giao dịch: cổng danh tính không ghi được
// bảng `team`, và tạo + cấp + rút + khoá phải cùng thành hoặc cùng hỏng). Tầng này chỉ:
//   · bắt vai — xem kế hoạch: quản trị team đang mở; ÁP: quản trị của MỌI team nghiệp vụ (lượt đồng bộ đụng cả ba team —
//     quản trị một team không được cấp/rút/khoá người ở team mình không quản);
//   · gọt kế hoạch thành thứ màn cần (email · team · vai · lý do) — không id nội bộ, không băm;
//   · đặt mật khẩu ĐẦU cho người CỦA team đang mở (tài khoản HRM tạo ra chưa có mật khẩu — chưa đặt thì không đăng nhập được).
import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { bam } from '../../auth/mat-khau.js';
import { congDanhTinh, BANG_THANH_VIEN, BANG_VAI, BANG_TEAM, LoiCauHinhTeam } from './kho-team.js';
import { DAI_MAT_KHAU_TOI_THIEU } from './thanh-vien.js';
import { TEAM_HRM } from '../../../../src/hrm/hrm.js';

let _dongBo = null;
let _tuDong = null;   // null = không bật lượt tự động · { moiGio } — `chay-that.js` dựng khi `V3_HRM_TU_DONG=1`
export function datDongBoHrm(db, { tuDong = null } = {}) {
  if (db != null && (typeof db.keHoach !== 'function' || typeof db.apDung !== 'function')) {
    throw new Error('datDongBoHrm cần { keHoach, apDung, lanCuoi, datMatKhauDau }');
  }
  _dongBo = db || null;
  _tuDong = db ? tuDong : null;
  return _dongBo;
}
export const daNoiDongBoHrm = () => _dongBo != null;

function canDongBo() {
  if (!_dongBo) throw new LoiCauHinhTeam('máy chủ chưa nối đồng bộ HRM (thiếu V3_BQ_KHOA)', 'chua_noi', 503);
  return _dongBo;
}

const TEN_TEAM_HRM = new Map(Object.values(TEAM_HRM).filter((t) => t.slug !== '*').map((t) => [t.slug, t.ten]));

/** Người này có là quản trị của MỌI team nghiệp vụ không — điều kiện để áp (lượt đồng bộ đụng cả ba team). */
async function laQuanTriMoiTeam(bc) {
  const dt = congDanhTinh();
  const [team, vaiQt, cap] = await Promise.all([
    dt.chon(BANG_TEAM, {}), dt.mot(BANG_VAI, { ma: VAI.QUAN_TRI }), dt.chon(BANG_THANH_VIEN, { nguoi_dung_id: String(bc.nguoiDungId) }),
  ]);
  if (!vaiQt) return false;
  const coQt = new Set(cap.filter((r) => String(r.vai_id) === String(vaiQt.id)).map((r) => String(r.team_id)));
  return team.filter((t) => !t.la_ky_thuat).every((t) => coQt.has(String(t.id)));
}

/** Kế hoạch cho màn — chỉ thứ người đọc cần. */
function veKeHoach(ke) {
  const team = (slug) => TEN_TEAM_HRM.get(slug) || slug || '?';
  return {
    vanTay: ke.vanTay,
    taoTaiKhoan: ke.taoTaiKhoan.map((t) => ({ email: t.email, ten: t.ten, maNv: t.maNv })),
    ganMaNv: ke.ganMaNv.map((g) => ({ email: g.email, maNv: g.maNv })),
    capVai: ke.capVai.map((c) => ({ email: c.email, team: team(c.slug), vai: c.vai })),
    rutVai: ke.rutVai.map((r) => ({ email: r.email, team: team(r.slug), vai: r.vai, lyDo: r.lyDo })),
    khoa: ke.khoa.map((k) => ({ email: k.email, maNv: k.maNv })),
    moKhoa: ke.moKhoa.map((k) => ({ email: k.email, maNv: k.maNv })),
    doiTenTeam: ke.doiTenTeam.map((d) => ({ tu: d.tu, sang: d.sang })),
    canhBao: ke.canhBao.map((c) => ({ ma: c.ma, chu: c.chu })),
    dem: ke.dem,
  };
}

/** Trạng thái cho đầu màn — không ném: chưa nối thì nói chưa nối. */
export function trangThaiDongBo() {
  if (!_dongBo) return { noi: false, tuDong: false, moiGio: null, lanCuoi: null };
  return { noi: true, tuDong: !!_tuDong, moiGio: _tuDong ? _tuDong.moiGio : null, lanCuoi: _dongBo.lanCuoi ? _dongBo.lanCuoi() : null };
}

export async function keHoachDongBo(boiCanh, { lamMoi = false } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);
  const db = canDongBo();
  const [{ ke, anToan, lyDo, docLuc }, apDuoc] = await Promise.all([db.keHoach({ lamMoi }), laQuanTriMoiTeam(bc)]);
  return { keHoach: veKeHoach(ke), anToan, lyDo, docLuc, apDuoc,
    viSaoKhongAp: apDuoc ? null : 'lượt đồng bộ đụng cả ba team — chỉ người là Quản trị của mọi team mới áp được' };
}

export async function apDungDongBo(boiCanh, { vanTay } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);
  const db = canDongBo();
  if (!(await laQuanTriMoiTeam(bc))) {
    throw new LoiCauHinhTeam('lượt đồng bộ đụng cả ba team — chỉ người là Quản trị của mọi team mới áp được', 'thieu_vai', 403);
  }
  if (!vanTay) throw new LoiCauHinhTeam('thiếu vân tay kế hoạch — mở kế hoạch rồi mới áp', 'thieu_tham_so');
  const { ra } = await db.apDung({ vanTay: String(vanTay), tacNhan: `nguoi:${bc.nguoiDungId}`, nguoiDungId: bc.nguoiDungId });
  return { ra };
}

/** Mật khẩu ĐẦU cho người của team đang mở. Đã có mật khẩu ⇒ từ chối (không phải «đặt lại» — v3 chưa có đường đó). */
export async function datMatKhauDauCho(boiCanh, { nguoiDungId, matKhau } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);
  const db = canDongBo();
  if (!nguoiDungId) throw new LoiCauHinhTeam('thiếu nguoiDungId', 'thieu_tham_so');
  const mk = String(matKhau || '');
  if (mk.length < DAI_MAT_KHAU_TOI_THIEU) throw new LoiCauHinhTeam(`mật khẩu phải từ ${DAI_MAT_KHAU_TOI_THIEU} ký tự`, 'mat_khau_yeu');
  const cuaTeam = await congDanhTinh().chon(BANG_THANH_VIEN, { team_id: String(bc.teamId), nguoi_dung_id: String(nguoiDungId) });
  if (!cuaTeam.length) throw new LoiCauHinhTeam('người này không ở team đang mở', 'khong_co_nguoi', 404);
  const kq = await db.datMatKhauDau({ nguoiDungId: String(nguoiDungId), bamMatKhau: await bam(mk), teamId: bc.teamId,
    tacNhan: `nguoi:${bc.nguoiDungId}`, nguoiLam: bc.nguoiDungId });
  if (!kq.ok) throw new LoiCauHinhTeam('tài khoản này đã có mật khẩu — v3 chưa có đường đặt lại', 'da_co_mat_khau', 409);
  return { email: kq.email };
}
