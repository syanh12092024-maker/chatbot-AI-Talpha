// ĐỒNG BỘ NGƯỜI TỪ HRM → TÀI KHOẢN + VAI (LL15b · 02/10).
//
// Người quyết 02/10: «làm tiếp LL15b … phần Người trong team cũng tự động thêm xoá như HRM luôn». Luật (quyết định 29/09,
// CR-28-09c, đo HRM 02/10):
//   · vào hệ = nhân viên team Pialpha có trên hệ (`TEAM_HRM`) · `comp_profile` MKT hoặc SALE · đang làm / thử việc · có email;
//   · MKT → Marketer ở team của người đó; SALE → Sale ở CẢ BA team (Hộp thư cả ba team); BO · VANDON · CTV không vào;
//   · đã nghỉ → KHOÁ tài khoản + rút vai do HRM cấp; quay lại làm → mở khoá;
//   · tên team trên hệ theo tên team HRM.
//
// RANH GIỚI — lượt đồng bộ chỉ đụng thứ CỦA NÓ:
//   · chỉ rút dòng `thanh_vien_team.nguon = 'hrm'` (dòng người cấp tay là 'tay' — không bao giờ rút);
//   · chỉ khoá/mở khoá tài khoản có `nguoi_dung.ma_nv` (tài khoản tạo tay không gắn mã — không bao giờ khoá);
//   · không bao giờ khoá người đang là quản trị DUY NHẤT còn hoạt động của một team (cảnh báo thay vì khoá).
// RÀO AN TOÀN cho lượt TỰ ĐỘNG (`kiemAnToan`): HRM đọc về rỗng · rút > 30% dòng HRM đang có · khoá > 5 tài khoản ⇒ KHÔNG tự áp,
//   chờ người xem kế hoạch và bấm áp ở màn Người và team.
// Áp trong MỘT giao dịch; mỗi thay đổi một dòng nhật ký. Vé phiên mang vai tới khi hết hạn — khoá chặn lần đăng nhập SAU, không
//   cắt phiên đang mở (nói thẳng ở màn).
import crypto from 'node:crypto';
import { TEAM_HRM } from './hrm.js';
import { ghiNhatKy } from '../db/nhat-ky.js';

export const VAI_THEO_HO_SO = Object.freeze({ MKT: 'marketer', SALE: 'sale' });
const TRANG_THAI_VAO = new Set(['active', 'thuviec']);
export const RAO = Object.freeze({ tiLeRutToiDa: 0.3, soKhoaToiDa: 5 });
export const HANH_DONG_DONG_BO = Object.freeze({
  TAO: 'hrm_tao_tai_khoan', GAN_MA: 'hrm_gan_ma_nv', CAP: 'hrm_cap_vai', RUT: 'hrm_rut_vai',
  KHOA: 'hrm_khoa_tai_khoan', MO: 'hrm_mo_khoa_tai_khoan', DOI_TEN: 'hrm_doi_ten_team', LUOT: 'hrm_dong_bo',
});

const thuong = (e) => String(e || '').trim().toLowerCase();
const SLUG_TEAM_NGHIEP_VU = Object.values(TEAM_HRM).map((t) => t.slug).filter((s) => s !== '*');

/** Hiện trạng tài khoản + vai trên hệ (bảng nền — đọc bằng pool, không qua cổng team). */
export async function docHienTrang(db) {
  const [team, vai, nguoi, tv] = await Promise.all([
    db.query('SELECT id, slug, ten FROM team WHERE NOT la_ky_thuat ORDER BY id'),
    db.query('SELECT id, ma FROM vai'),
    db.query('SELECT id, email, ten, hoat_dong, ma_nv, (mat_khau_hash IS NOT NULL) AS co_mat_khau FROM nguoi_dung ORDER BY id'),
    db.query('SELECT id, team_id, nguoi_dung_id, vai_id, nguon FROM thanh_vien_team ORDER BY id'),
  ]);
  return { team: team.rows, vai: vai.rows, nguoi: nguoi.rows, tv: tv.rows };
}

/**
 * KẾ HOẠCH — hàm THUẦN: HRM + hiện trạng ⇒ việc phải làm. Không ghi gì.
 * @returns {{ taoTaiKhoan, ganMaNv, capVai, rutVai, khoa, moKhoa, doiTenTeam, canhBao, dem, vanTay }}
 */
export function lapKeHoach({ nhanVien = [] } = {}, ht) {
  const S = (v) => String(v);
  const teamTheoSlug = new Map(ht.team.map((t) => [t.slug, t]));
  const teamTheoId = new Map(ht.team.map((t) => [S(t.id), t]));
  const vaiTheoMa = new Map(ht.vai.map((v) => [v.ma, v]));
  const vaiTheoId = new Map(ht.vai.map((v) => [S(v.id), v]));
  const nguoiTheoMa = new Map(ht.nguoi.filter((n) => n.ma_nv).map((n) => [n.ma_nv, n]));
  const nguoiTheoEmail = new Map(ht.nguoi.map((n) => [thuong(n.email), n]));
  const nvTheoMa = new Map(nhanVien.map((n) => [n.emp_code, n]));

  const ke = { taoTaiKhoan: [], ganMaNv: [], capVai: [], rutVai: [], khoa: [], moKhoa: [], doiTenTeam: [], canhBao: [] };
  const dem = { nhanVienVaoHe: 0, boQuaThieuEmail: 0, boQuaNgoaiHe: 0 };
  const mongMuon = new Map();   // khoá tài khoản (id | 'moi:'+maNv) → Set('teamId|vaiId')

  for (const nv of nhanVien) {
    const team = TEAM_HRM[nv.team_code];
    const maVai = VAI_THEO_HO_SO[nv.comp_profile];
    if (!team || !maVai) { dem.boQuaNgoaiHe++; continue; }
    if (!TRANG_THAI_VAO.has(nv.status)) continue;   // đã nghỉ — xử ở phần khoá
    const email = thuong(nv.email_cong_ty);
    if (!email) { dem.boQuaThieuEmail++; continue; }
    dem.nhanVienVaoHe++;
    let tk = nguoiTheoMa.get(nv.emp_code) || null;
    if (!tk) {
      const theoEmail = nguoiTheoEmail.get(email) || null;
      if (theoEmail && theoEmail.ma_nv && theoEmail.ma_nv !== nv.emp_code) {
        ke.canhBao.push({ ma: 'email_trung_ma_khac', chu: `${email}: tài khoản đã gắn mã ${theoEmail.ma_nv}, HRM nói ${nv.emp_code} — bỏ qua, sửa ở HRM` });
        continue;
      }
      if (theoEmail) { tk = theoEmail; ke.ganMaNv.push({ nguoiDungId: S(tk.id), maNv: nv.emp_code, email }); }
      else ke.taoTaiKhoan.push({ maNv: nv.emp_code, email, ten: nv.ho_ten || email });
    }
    const khoaTk = tk ? S(tk.id) : `moi:${nv.emp_code}`;
    if (tk && tk.hoat_dong === false) ke.moKhoa.push({ nguoiDungId: S(tk.id), maNv: nv.emp_code, email });
    const vai = vaiTheoMa.get(maVai);
    const dsTeam = team.slug === '*' ? SLUG_TEAM_NGHIEP_VU : [team.slug];
    const tap = mongMuon.get(khoaTk) || new Set();
    for (const slug of dsTeam) {
      const t = teamTheoSlug.get(slug);
      if (!t || !vai) continue;
      tap.add(`${S(t.id)}|${S(vai.id)}`);
      const daCo = tk && ht.tv.some((r) => S(r.nguoi_dung_id) === S(tk.id) && S(r.team_id) === S(t.id) && S(r.vai_id) === S(vai.id));
      if (!daCo) ke.capVai.push({ khoaTk, nguoiDungId: tk ? S(tk.id) : null, maNv: nv.emp_code, email, teamId: S(t.id), slug, vai: maVai, vaiId: S(vai.id) });
    }
    mongMuon.set(khoaTk, tap);
  }

  // Rút: dòng HRM của tài khoản gắn mã mà không còn trong tập mong muốn (đổi team · đổi vai · đã nghỉ).
  for (const r of ht.tv.filter((x) => x.nguon === 'hrm')) {
    const tk = ht.nguoi.find((n) => S(n.id) === S(r.nguoi_dung_id));
    if (!tk || !tk.ma_nv) continue;
    const nv = nvTheoMa.get(tk.ma_nv);
    if (!nv) { ke.canhBao.push({ ma: 'khong_con_trong_hrm', chu: `${tk.email}: mã ${tk.ma_nv} không còn trong HRM — giữ nguyên, kiểm ở HRM` }); continue; }
    if ((mongMuon.get(S(tk.id)) || new Set()).has(`${S(r.team_id)}|${S(r.vai_id)}`)) continue;
    ke.rutVai.push({ tvId: S(r.id), nguoiDungId: S(tk.id), email: tk.email, teamId: S(r.team_id),
      slug: (teamTheoId.get(S(r.team_id)) || {}).slug || null, vai: (vaiTheoId.get(S(r.vai_id)) || {}).ma || null,
      lyDo: TRANG_THAI_VAO.has(nv.status) ? 'đổi team / đổi vai ở HRM' : 'đã nghỉ' });
  }

  // Khoá: tài khoản gắn mã mà HRM nói đã nghỉ. Rào: không khoá quản trị duy nhất còn hoạt động của một team.
  const vaiQt = vaiTheoMa.get('quan-tri');
  for (const tk of ht.nguoi.filter((n) => n.ma_nv && n.hoat_dong !== false)) {
    const nv = nvTheoMa.get(tk.ma_nv);
    if (!nv || nv.status !== 'nghi') continue;
    const teamQtDuyNhat = vaiQt ? ht.tv.filter((r) => S(r.nguoi_dung_id) === S(tk.id) && S(r.vai_id) === S(vaiQt.id))
      .filter((r) => !ht.tv.some((x) => S(x.team_id) === S(r.team_id) && S(x.vai_id) === S(vaiQt.id) && S(x.nguoi_dung_id) !== S(tk.id)
        && (ht.nguoi.find((n) => S(n.id) === S(x.nguoi_dung_id)) || {}).hoat_dong !== false)) : [];
    if (teamQtDuyNhat.length) {
      ke.canhBao.push({ ma: 'quan_tri_duy_nhat', chu: `${tk.email}: HRM nói đã nghỉ nhưng là quản trị duy nhất của ${teamQtDuyNhat.length} team — KHÔNG khoá; cấp quản trị cho người khác trước` });
      continue;
    }
    ke.khoa.push({ nguoiDungId: S(tk.id), maNv: tk.ma_nv, email: tk.email });
  }

  for (const t of Object.values(TEAM_HRM)) {
    if (t.slug === '*') continue;
    const cu = teamTheoSlug.get(t.slug);
    if (cu && cu.ten !== t.ten) ke.doiTenTeam.push({ teamId: S(cu.id), slug: t.slug, tu: cu.ten, sang: t.ten });
  }

  dem.dongHrmDangCo = ht.tv.filter((x) => x.nguon === 'hrm').length;
  const vanTay = crypto.createHash('sha256').update(JSON.stringify([ke.taoTaiKhoan, ke.ganMaNv, ke.capVai.map((c) => [c.khoaTk, c.teamId, c.vaiId]),
    ke.rutVai.map((r) => r.tvId), ke.khoa.map((k) => k.nguoiDungId), ke.moKhoa.map((k) => k.nguoiDungId), ke.doiTenTeam])).digest('hex').slice(0, 16);
  return { ...ke, dem, vanTay };
}

/** Rào cho lượt TỰ ĐỘNG — vượt rào thì không tự áp, chờ người. */
export function kiemAnToan(ke, { soNhanVien }) {
  const lyDo = [];
  if (!soNhanVien) lyDo.push('HRM đọc về RỖNG — không áp gì (rút/khoá hàng loạt là hỏng nguồn, không phải người nghỉ)');
  if (ke.dem.dongHrmDangCo >= 5 && ke.rutVai.length / ke.dem.dongHrmDangCo > RAO.tiLeRutToiDa) {
    lyDo.push(`rút ${ke.rutVai.length}/${ke.dem.dongHrmDangCo} vai HRM (> ${RAO.tiLeRutToiDa * 100}%) — cần người xem`);
  }
  if (ke.khoa.length > RAO.soKhoaToiDa) lyDo.push(`khoá ${ke.khoa.length} tài khoản một lượt (> ${RAO.soKhoaToiDa}) — cần người xem`);
  return { anToan: lyDo.length === 0, lyDo };
}

const coViec = (ke) => ke.taoTaiKhoan.length + ke.ganMaNv.length + ke.capVai.length + ke.rutVai.length + ke.khoa.length
  + ke.moKhoa.length + ke.doiTenTeam.length;

/**
 * ÁP kế hoạch trong MỘT giao dịch. Mọi câu ghi kèm điều kiện ranh giới (chỉ dòng 'hrm', chỉ tài khoản gắn mã) — kế hoạch cũ
 * hay sai cũng không vượt được ranh giới.
 * @param {{ tacNhan: string, nguoiDungId?: string|null }} ai  'may:dong-bo-hrm' | 'nguoi:<email>'
 */
export async function apDung(pool, ke, { tacNhan, nguoiDungId = null } = {}) {
  if (!tacNhan) throw new Error('apDung: thiếu tacNhan');
  const ra = { taoTaiKhoan: 0, ganMaNv: 0, capVai: 0, rutVai: 0, khoa: 0, moKhoa: 0, doiTenTeam: 0 };
  const teamDau = async (k) => (await k.query("SELECT id FROM team WHERE NOT la_ky_thuat ORDER BY id LIMIT 1")).rows[0]?.id;
  const k = await pool.connect();
  try {
    await k.query('BEGIN');
    const nk = (teamId, hanhDong, doiTuong, doiTuongId, sau, ghiChu) => ghiNhatKy(k, { teamId, tacNhan, nguoiDungId, hanhDong, doiTuong,
      doiTuongId: String(doiTuongId ?? ''), sau, ghiChu });
    const mau = await teamDau(k);
    const idMoi = new Map();
    for (const t of ke.taoTaiKhoan) {
      const r = await k.query('INSERT INTO nguoi_dung (email, ten, ma_nv) VALUES ($1, $2, $3) RETURNING id', [t.email, t.ten, t.maNv]);
      idMoi.set(`moi:${t.maNv}`, String(r.rows[0].id)); ra.taoTaiKhoan++;
      await nk(mau, HANH_DONG_DONG_BO.TAO, 'nguoi_dung', r.rows[0].id, { email: t.email, ma_nv: t.maNv }, `tạo tài khoản từ HRM: ${t.email} (${t.maNv}) — chưa đặt mật khẩu`);
    }
    for (const g of ke.ganMaNv) {
      const r = await k.query('UPDATE nguoi_dung SET ma_nv = $2 WHERE id = $1 AND ma_nv IS NULL', [g.nguoiDungId, g.maNv]);
      if (r.rowCount) { ra.ganMaNv++; await nk(mau, HANH_DONG_DONG_BO.GAN_MA, 'nguoi_dung', g.nguoiDungId, { ma_nv: g.maNv }, `gắn tài khoản ${g.email} với hồ sơ HRM ${g.maNv}`); }
    }
    for (const c of ke.capVai) {
      const id = c.nguoiDungId || idMoi.get(c.khoaTk);
      if (!id) continue;
      const r = await k.query(`INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id, nguon) VALUES ($1, $2, $3, 'hrm')
        ON CONFLICT (team_id, nguoi_dung_id, vai_id) DO NOTHING RETURNING id`, [c.teamId, id, c.vaiId]);
      if (r.rowCount) { ra.capVai++; await nk(c.teamId, HANH_DONG_DONG_BO.CAP, 'thanh_vien_team', r.rows[0].id, { email: c.email, vai: c.vai }, `HRM: cấp vai ${c.vai} cho ${c.email}`); }
    }
    for (const x of ke.rutVai) {
      const r = await k.query("DELETE FROM thanh_vien_team WHERE id = $1 AND nguon = 'hrm'", [x.tvId]);
      if (r.rowCount) { ra.rutVai++; await nk(x.teamId, HANH_DONG_DONG_BO.RUT, 'thanh_vien_team', x.tvId, { email: x.email, vai: x.vai }, `HRM: rút vai ${x.vai} của ${x.email} — ${x.lyDo}`); }
    }
    for (const x of ke.khoa) {
      const r = await k.query('UPDATE nguoi_dung SET hoat_dong = false WHERE id = $1 AND ma_nv IS NOT NULL AND hoat_dong', [x.nguoiDungId]);
      if (r.rowCount) { ra.khoa++; await nk(mau, HANH_DONG_DONG_BO.KHOA, 'nguoi_dung', x.nguoiDungId, { ma_nv: x.maNv }, `HRM: ${x.email} đã nghỉ — khoá tài khoản`); }
    }
    for (const x of ke.moKhoa) {
      const r = await k.query('UPDATE nguoi_dung SET hoat_dong = true WHERE id = $1 AND ma_nv IS NOT NULL AND NOT hoat_dong', [x.nguoiDungId]);
      if (r.rowCount) { ra.moKhoa++; await nk(mau, HANH_DONG_DONG_BO.MO, 'nguoi_dung', x.nguoiDungId, { ma_nv: x.maNv }, `HRM: ${x.email} làm lại — mở khoá`); }
    }
    for (const d of ke.doiTenTeam) {
      const r = await k.query('UPDATE team SET ten = $2 WHERE id = $1 AND slug = $3', [d.teamId, d.sang, d.slug]);
      if (r.rowCount) { ra.doiTenTeam++; await nk(d.teamId, HANH_DONG_DONG_BO.DOI_TEN, 'team', d.teamId, { tu: d.tu, sang: d.sang }, `tên team theo HRM: «${d.tu}» → «${d.sang}»`); }
    }
    if (coViec(ke)) await nk(mau, HANH_DONG_DONG_BO.LUOT, 'nguoi_dung', '', ra, `đồng bộ HRM xong (kế hoạch ${ke.vanTay})`);
    await k.query('COMMIT');
    return ra;
  } catch (e) {
    await k.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { k.release(); }
}

/** Đặt mật khẩu ĐẦU TIÊN cho tài khoản chưa có (tài khoản tạo từ HRM). KHÔNG ghi đè mật khẩu đang có — không phải «đặt lại». */
export async function datMatKhauDau(pool, { nguoiDungId, bamMatKhau, teamId, tacNhan, nguoiLam = null }) {
  if (!bamMatKhau) throw new Error('datMatKhauDau: thiếu bản băm');
  const r = await pool.query('UPDATE nguoi_dung SET mat_khau_hash = $2 WHERE id = $1 AND mat_khau_hash IS NULL RETURNING email', [nguoiDungId, bamMatKhau]);
  if (!r.rowCount) return { ok: false };
  await ghiNhatKy(pool, { teamId, tacNhan, nguoiDungId: nguoiLam, hanhDong: 'dat_mat_khau_dau', doiTuong: 'nguoi_dung', doiTuongId: String(nguoiDungId),
    ghiChu: `đặt mật khẩu đầu tiên cho ${r.rows[0].email}` });
  return { ok: true, email: r.rows[0].email };
}

export class LoiDongBo extends Error {
  constructor(ma, thongDiep, status = 409) { super(thongDiep); this.name = 'LoiDongBo'; this.ma = ma; this.status = status; }
}

/**
 * Gói cho màn + bộ hẹn giờ: một bộ đọc HRM (`taoDocHrm`) + pool.
 *   · `keHoach({ lamMoi })` — xem trước (kèm `anToan` của lượt tự động);
 *   · `apDung({ vanTay, tacNhan, nguoiDungId })` — LẬP LẠI kế hoạch, vân tay khác bản người đã xem ⇒ từ chối (HRM/hệ vừa đổi);
 *   · `tuDong()` — lượt hằng ngày: đọc lại HRM, qua rào thì áp (`may:dong-bo-hrm`), không qua thì ghi nhật ký «hoãn» và DỪNG;
 *   · `lanCuoi()` — kết quả lượt gần nhất (bộ nhớ tiến trình).
 */
export function taoDongBoHrm({ pool, docHrm, dongHo = () => Date.now() }) {
  let lanCuoi = null;
  async function keHoach({ lamMoi = false } = {}) {
    const du = await docHrm({ lamMoi });
    const ke = lapKeHoach(du, await docHienTrang(pool));
    return { ke, ...kiemAnToan(ke, { soNhanVien: du.nhanVien.length }), docLuc: du.luc };
  }
  async function apDungTay({ vanTay, tacNhan, nguoiDungId = null }) {
    const { ke } = await keHoach();
    if (!vanTay || vanTay !== ke.vanTay) throw new LoiDongBo('ke_hoach_doi', 'HRM hoặc tài khoản trên hệ vừa đổi so với bản bạn đã xem — mở lại kế hoạch rồi áp.');
    const ra = await apDung(pool, ke, { tacNhan, nguoiDungId });
    lanCuoi = { luc: dongHo(), cach: 'tay', ra, vanTay: ke.vanTay };
    return { ra, ke };
  }
  async function tuDong() {
    try {
      const { ke, anToan, lyDo } = await keHoach({ lamMoi: true });
      if (!anToan) {
        const r = await pool.query('SELECT id FROM team WHERE NOT la_ky_thuat ORDER BY id LIMIT 1');
        await ghiNhatKy(pool, { teamId: r.rows[0]?.id, tacNhan: 'may:dong-bo-hrm', hanhDong: 'hrm_dong_bo_hoan', doiTuong: 'nguoi_dung',
          sau: { lyDo, vanTay: ke.vanTay }, ghiChu: `đồng bộ HRM HOÃN — cần người xem: ${lyDo.join(' · ')}` });
        lanCuoi = { luc: dongHo(), cach: 'tu_dong', hoan: lyDo, vanTay: ke.vanTay };
        return lanCuoi;
      }
      const ra = await apDung(pool, ke, { tacNhan: 'may:dong-bo-hrm' });
      lanCuoi = { luc: dongHo(), cach: 'tu_dong', ra, vanTay: ke.vanTay };
    } catch (e) {
      lanCuoi = { luc: dongHo(), cach: 'tu_dong', loi: String(e?.message || e).slice(0, 160) };
    }
    return lanCuoi;
  }
  return { keHoach, apDung: apDungTay, tuDong, lanCuoi: () => lanCuoi,
    datMatKhauDau: (o) => datMatKhauDau(pool, o) };
}
