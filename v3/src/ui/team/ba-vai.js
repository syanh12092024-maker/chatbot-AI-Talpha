// VE7d · 01/10 (bản vẽ 4 › Người và team) — BA VAI và «ai phụ trách gì», nói THỨ MÁY LÀM, không nói thứ bản vẽ hứa:
//   · «mở được» của mỗi vai đo bằng CHÍNH hàm dựng thanh điều hướng (`chung/man-hinh.js#menuCua`) — không gõ tay danh sách;
//   · «phụ trách» của marketer: CHƯA CÓ NGUỒN. `01-QUYET-DINH.md` §9 ký «marketer chỉ thấy sản phẩm mình phụ trách» nhưng hệ
//     chưa biết sản phẩm/page nào của ai (không cột nào nối người dùng ↔ marketer; prod 01/10: `page.marketer` trống 582/582,
//     sản phẩm gốc chưa có marketer) — nối ở LL15 (HRM). Thẻ đếm page có tên marketer để người đọc thấy SỐ ĐO, không đoán;
//   · HRM (LL15a · 02/10): đọc BigQuery qua `datDocHrm` — chưa nối ⇒ «chưa nối» + vì sao; đọc được ⇒ hồ sơ theo email +
//     bảng marketer POS của team; tạo tài khoản từ HRM vẫn CHƯA làm (LL15b).
import { batBuocBoiCanh, VAI, VAI_GAN_DUOC } from '../../auth/boi-canh.js';
import { congTruyVan, congDanhTinh, TEN_VAI, BANG_PAGE, BANG_TEAM } from './kho-team.js';
import { CHU_TRANG_THAI_NV, TEAM_HRM, tomTatHrm, marketerPosTheoTeam } from '../../../../src/hrm/hrm.js';

const NGUON_HRM = Object.freeze(['HRM_Core.dim_employee', 'PIALPHA_ALL_Dataset.dim_person_map']);
/** HRM khi máy chủ CHƯA nối bộ đọc (vắng `V3_BQ_KHOA`) — vắng biến = đóng, màn nói đúng vì sao. */
export const HRM = Object.freeze({
  noi: false,
  chu: 'Chưa nối vào máy chủ',
  viSao: 'máy chủ chưa khai V3_BQ_KHOA (đường tới tệp khoá BigQuery)',
  nguon: NGUON_HRM,
});

// LL15a · 02/10: bộ đọc HRM (`src/hrm/hrm.js#taoDocHrm`, chỉ đọc, đệm một ngày) — tiêm từ `chay-that.js`.
let _docHrm = null;
export function datDocHrm(fn) {
  if (fn != null && typeof fn !== 'function') throw new Error('datDocHrm cần một hàm');
  _docHrm = fn || null;
  return _docHrm;
}
async function docHrmAnToan() {
  if (!_docHrm) return { hrm: HRM, du: null };
  try {
    const du = await _docHrm();
    return { hrm: { noi: true, chu: 'Đã nối · chỉ đọc', viSao: null, nguon: NGUON_HRM, ...tomTatHrm(du) }, du };
  } catch (e) {
    // Đọc hỏng ≠ chưa nối: nói đúng chữ hỏng (mã + lý do của Google), không lộ khoá — `LoiBigQuery` không mang khoá.
    return { hrm: { noi: false, chu: 'Đọc HRM hỏng', viSao: String(e?.message || e).slice(0, 160), nguon: NGUON_HRM }, du: null };
  }
}

/** Phụ trách theo vai — `coNguon:false` là hệ CHƯA biết, màn phải nói vậy chứ không để trống. */
export const PHU_TRACH = Object.freeze({
  [VAI.QUAN_TRI]: Object.freeze({ chu: 'Tất cả', coNguon: true, tatCa: true }),   // `tatCa`: vai này phủ mọi vai khác
  [VAI.MARKETER]: Object.freeze({ chu: 'Chưa có nguồn', coNguon: false,
    viSao: 'hệ chưa biết sản phẩm, page nào của ai — cần nối HRM (LL15)' }),
  [VAI.SALE]: Object.freeze({ chu: 'Hộp thư của team', coNguon: true }),
});

// `man-hinh.js` nạp mọi màn (có `team/index.js`) ⇒ nạp TĨNH ở đây là vòng import. Nạp lúc gọi: khi đó sổ màn đã dựng xong.
let _menuCua = null;
async function menuCuaVai(ma) {
  _menuCua ||= (await import('../chung/man-hinh.js')).menuCua;
  return _menuCua([ma]);
}

/**
 * Ba thẻ vai của màn + số đo đi kèm.
 * @param {object} boiCanh
 * @param {{ nguoi?: Array<{vai:Array<{ma:string}>}> }} [bo] thành viên đã đọc sẵn (`thanhVienCua`) — để đếm người mỗi vai
 */
export async function baVaiCua(boiCanh, { nguoi = [] } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const vai = [];
  for (const ma of VAI_GAN_DUOC) {
    const menu = await menuCuaVai(ma);
    vai.push({
      ma, ten: TEN_VAI[ma] || ma,
      // Mỗi mục: tên + các màn vai này mở được trong mục (kể cả màn đứng thành tab trong cụm; bỏ màn thử nghiệm) — tên
      // màn theo nhãn người dùng thấy (`nhanCum` là chữ trên tab của cụm).
      moDuoc: menu.map((n) => ({ ten: n.ten, man: n.man.filter((m) => !m.thuNghiem).map((m) => m.nhanCum || m.ten) })),
      soNguoi: nguoi.filter((n) => (n.vai || []).some((v) => v.ma === ma)).length,
      phuTrach: PHU_TRACH[ma],
    });
  }
  let pageMarketer;
  try {
    const ds = (await congTruyVan(bc).chon(BANG_PAGE, {})) || [];
    pageMarketer = { co: ds.filter((p) => String(p.marketer || '').trim() !== '').length, tong: ds.length, viSao: null };
  } catch (e) {
    pageMarketer = { co: null, tong: null, viSao: `không đọc được bảng page (${String(e?.message || e).slice(0, 120)})` };
  }
  const { hrm, du } = await docHrmAnToan();
  let hoSoHrm = null;       // { [nguoiDungId]: hồ sơ | null } — khớp theo email công ty (đo 02/10: email không trùng)
  let marketerPos = null;   // { dong, dem } — tài khoản marketer POS của team này + chờ gán team
  if (du) {
    const theoEmail = new Map(du.nhanVien.filter((n) => n.email_cong_ty).map((n) => [String(n.email_cong_ty).trim().toLowerCase(), n]));
    hoSoHrm = Object.fromEntries(nguoi.map((n) => {
      const nv = theoEmail.get(String(n.email || '').trim().toLowerCase());
      return [n.nguoiDungId, nv ? { maNv: nv.emp_code, hoTen: nv.ho_ten || null, trangThai: CHU_TRANG_THAI_NV[nv.status] || nv.status || null,
        team: (TEAM_HRM[nv.team_code] || {}).ten || nv.team_code || null } : null];
    }));
    let slug = null;
    try { slug = ((await congDanhTinh().chon(BANG_TEAM, { id: bc.teamId }))[0] || {}).slug || null; } catch { slug = null; }
    // Bốn nhóm LOẠI TRỪ nhau (đo thật 02/10: dòng marketer đã nghỉ vẫn mang team ⇒ bản đầu đếm hai lần):
    //   team này đang làm · team này đã nghỉ (không hiện bảng) · chờ gán (cả công ty) · không vào hệ (cả công ty).
    const tatCa = marketerPosTheoTeam(du);
    const cuaTeam = tatCa.filter((d) => slug && d.slug === slug && !d.daNghi);
    const choGan = tatCa.filter((d) => d.choGan);
    marketerPos = { slug, dong: [...cuaTeam, ...choGan], dem: {
      cuaTeam: cuaTeam.length, nghiCuaTeam: tatCa.filter((d) => slug && d.slug === slug && d.daNghi).length,
      choGan: choGan.length, ngoaiHe: tatCa.filter((d) => d.ngoaiHe).length, tong: tatCa.length } };
  }
  return { vai, pageMarketer, hrm, hoSoHrm, marketerPos };
}
