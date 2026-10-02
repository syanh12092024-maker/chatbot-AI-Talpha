// LL17a · 02/10 — KHỐI «ĐƠN POS CỦA TEAM» ở Số liệu › Tổng quan: số tổng hợp từ BigQuery (`src/hrm/don-pos.js`), CHỈ ĐỌC, không chép
// dữ liệu khách. Hai bộ đọc tiêm từ `chay-that.js` (vắng `V3_BQ_KHOA` = đóng): đơn POS (đệm 1 giờ) + HRM (đệm 1 ngày, CHUNG với màn
// Người và team — để biết marketer thuộc team nào và tên gì). Marketer (không quản trị) chỉ thấy dòng CỦA MÌNH (cùng luật phạm vi
// LL15d); số của team vẫn hiện để biết mình đứng đâu.
import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { teamTheoId } from '../../auth/kho-nguoi-dung.js';
import { phamViMarketer } from '../chung/pham-vi-marketer.js';
import { tongHopTeam, SO_NGAY_DOC } from '../../../../src/hrm/don-pos.js';

let _docDonPos = null;
let _docHrm = null;
export function datDocDonPos(fn) { _docDonPos = typeof fn === 'function' ? fn : null; return _docDonPos; }
export function datDocHrmSoLieu(fn) { _docHrm = typeof fn === 'function' ? fn : null; return _docHrm; }
export const daNoiDonPos = () => !!(_docDonPos && _docHrm);

const NGUON = Object.freeze({
  ten: 'BigQuery `levelup-465304` · PIALPHA_ALL_Dataset.vw_sale_order_team (đơn POS mọi shop Pialpha, đồng bộ hằng ngày) — CHỈ ĐỌC',
  team: 'đơn thuộc team HRM của marketer (bảng ghép dim_person_map → mã NV → HRM_Core.dim_employee) — team HIỆN TẠI của marketer, chưa theo ngày đơn',
  tien: 'COD của đơn giao thành công, theo TỪNG tiền tệ shop (cột cod ÷ currency_divisor) — không quy đổi, không cộng khác tệ',
});

export async function manDonPos(boiCanh, { khoang = [7, 30] } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docDonPos || !_docHrm) {
    return { noi: false, viSao: 'máy chủ chưa nối đọc đơn POS từ BigQuery (thiếu V3_BQ_KHOA)', nguon: NGUON };
  }
  const [t, pv] = await Promise.all([teamTheoId(bc.teamId), phamViMarketer(bc)]);
  let du; let hrm;
  try {
    [du, hrm] = await Promise.all([_docDonPos(), _docHrm()]);
  } catch (e) {
    // Đọc hỏng ≠ không có đơn: nói đúng chữ hỏng (mã + lý do của Google), màn không chết.
    return { noi: false, hong: true, viSao: `đọc BigQuery hỏng (${String(e?.message || e).slice(0, 160)})`, nguon: NGUON };
  }
  const so = tongHopTeam(du, hrm, { slug: t ? t.slug : '', chiMaNv: pv ? (pv.maNv || null) : undefined, khoang });
  return {
    noi: true, nguon: NGUON, soNgayDoc: SO_NGAY_DOC, docLuc: du.luc, dongBo: du.dongBo, tuongLai: du.tuongLai,
    tenTeam: t ? t.ten : '', chiCuaToi: !!pv, ...so,
  };
}
