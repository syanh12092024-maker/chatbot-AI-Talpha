// NHẬT KÝ THAO TÁC — chỉ thêm, không sửa, không xoá. Ghi cả việc người làm lẫn việc máy làm.
// Nguồn quyết định: `docs/v3/01-QUYET-DINH.md` mục 9.
//
// CÙNG TRIẾT LÝ VỚI `src/ai-log.js` CỦA BẢN ĐANG CHẠY, KHÁC CHỖ CHỨA:
// sổ AI kia chỉ thêm dòng vào JSON Lines và là nguồn sự thật để tra ngược bất cứ lúc nào —
// đúng cách nghĩ mà sổ này cần. Nhưng nó ghi thẳng ra file bằng `fs.appendFileSync`, còn
// sổ này ghi vào bảng `nhat_ky` qua cổng truy vấn của người A để điều kiện team được chèn
// ở một chỗ duy nhất. Lấy cách nghĩ, không lấy code.
//
// BẢY LUẬT CỦA MODULE NÀY (spec L0-M4):
//   1. Thiếu bối cảnh → NÉM LỖI ngay dòng đầu. Không bao giờ trả rỗng.
//   2. `tac_nhan` suy từ `boiCanh.nguon`. Nơi gọi không được tự đặt — tự đặt là mở đường
//      cho việc máy làm đội lốt người làm.
//   3. Không có hàm sửa, không có hàm xoá. Kể cả để "tiện test".
//   4. Ghi hỏng không được làm hỏng việc chính → nuốt lỗi, trả `null`. TRỪ bốn mã trong
//      `nhomBatBuoc`: sự cố an ninh mà nuốt lặng còn tệ hơn hỏng việc.
//   5. `truoc`/`sau` lọc chỗ nhạy cảm trước khi lưu.
//   6. Không tin thời gian của nơi gọi — `thoi_gian` do file này đặt.
//   7. `docNhatKy` không nhận `team_id` từ nơi gọi.
//
// KHÔNG GỌI THẲNG XUỐNG CƠ SỞ DỮ LIỆU. Cổng truy vấn tiêm từ ngoài vào bằng
// `datTaoTruyVan()` (hợp đồng B–A mục 3 và mục 8). Chưa nối thì kêu lên, không im lặng
// chạy sai.

import {
  batBuocBoiCanh, doiChieuTeam, NGUON,
  LoiThieuBoiCanh, LoiXuyenTeam,
} from '../auth/boi-canh.js';
import { HANH_DONG, laBatBuoc, hopLeHanhDong, moTa, nhomBatBuoc, NHOM, danhSachHanhDong } from './hanh-dong.js';

export { HANH_DONG, laBatBuoc, hopLeHanhDong, moTa, nhomBatBuoc, NHOM, danhSachHanhDong };
export { LoiThieuBoiCanh, LoiXuyenTeam };

/** Tên bảng. Một chỗ duy nhất, để đổi tên là đổi một dòng. */
export const BANG = 'nhat_ky';

/** Lỗi của riêng module nhật ký (ví dụ: chưa nối cổng truy vấn). */
export class LoiNhatKy extends Error {
  constructor(chiTiet = '') {
    super(`Nhật ký thao tác: ${chiTiet}`);
    this.name = 'LoiNhatKy';
    this.ma = 'nhat_ky_hong';
    this.status = 500;
  }
}

// ---- BA CHỖ TIÊM TỪ NGOÀI ---------------------------------------------------------

/** @type {null | ((boiCanh: any) => any)} */
let _taoTruyVan = null;
/** @type {null | ((ban: object) => any)} */
let _pheu = null;
/** @type {() => number} */
let _dongHo = () => Date.now();

/**
 * Nối cổng truy vấn của người A. Gọi một lần lúc dựng ứng dụng (hợp đồng mục 8).
 * `fn(boiCanh)` → cổng đã gắn điều kiện team.
 */
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiNhatKy('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/**
 * Phễu: chuyển tiếp MỌI bản ghi ra ngoài (cảnh báo, Telegram, đẩy sang hệ khác).
 * Phễu hỏng không bao giờ làm hỏng việc ghi — bản ghi đã nằm trong bảng rồi.
 */
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiNhatKy('datPheuNhatKy cần một hàm');
  _pheu = fn || null;
  return _pheu;
}

/**
 * Luật 6 — không tin thời gian của nơi gọi. Đồng hồ tiêm được để test chạy nhanh và
 * để hai bản ghi trong cùng một mili giây vẫn xếp đúng thứ tự khi test cần.
 * Truyền `null` để trả về `Date.now`.
 */
export function datDongHo(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiNhatKy('datDongHo cần một hàm');
  _dongHo = fn || (() => Date.now());
  return _dongHo;
}

// ---- LUẬT 5 · LỌC CHỖ NHẠY CẢM ----------------------------------------------------

/** Khoá nào khớp biểu thức này thì giá trị bị thay, kể cả nằm sâu trong đối tượng lồng. */
export const KHOA_NHAY_CAM = /khoa|key|token|mat_khau|password|secret|bearer|authorization/i;

/** Giá trị thay thế. Để nguyên chữ tiếng Việt cho người đọc nhật ký hiểu ngay. */
export const CHE_DAU = '«đã che»';

const SAU_TOI_DA = 12;

/**
 * Che giá trị nhạy cảm, đệ quy, giữ nguyên hình dạng còn lại.
 *
 * Vì sao che ở đây chứ không dặn nơi gọi tự che: `truoc`/`sau` là hai đối tượng bất kỳ mà
 * nơi gọi ném vào để "so xem đã đổi gì" — màn cấu hình model ném cả bản ghi
 * `cau_hinh_model` vào, trong đó có `khoa_ma_hoa`. Dặn nơi gọi nhớ che thì sớm muộn có
 * một chỗ quên, mà nhật ký lại là bảng KHÔNG SỬA ĐƯỢC: lỡ ghi khoá vào là nằm đó vĩnh viễn.
 */
export function cheNhayCam(gt, _sau = 0, _daGap = new WeakSet()) {
  if (gt == null) return gt ?? null;
  const loai = typeof gt;
  if (loai === 'function') return undefined;              // hàm không lưu xuống jsonb được
  if (loai !== 'object') return gt;
  if (gt instanceof Date) return gt.toISOString();
  if (_sau >= SAU_TOI_DA) return '«quá sâu»';
  if (_daGap.has(gt)) return '«vòng lặp»';
  _daGap.add(gt);
  if (Array.isArray(gt)) return gt.map((v) => cheNhayCam(v, _sau + 1, _daGap));
  const ra = {};
  for (const [k, v] of Object.entries(gt)) {
    if (KHOA_NHAY_CAM.test(k)) { ra[k] = CHE_DAU; continue; }
    const che = cheNhayCam(v, _sau + 1, _daGap);
    if (che !== undefined) ra[k] = che;
  }
  return ra;
}

// ---- GHI --------------------------------------------------------------------------

/** Luật 2 — `tac_nhan` suy ra, không nhận từ nơi gọi. */
const tacNhanCua = (bc) => (bc.nguon === NGUON.MAY ? 'may' : 'nguoi');

function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiNhatKy('chưa nối cổng truy vấn — gọi datTaoTruyVan(taoTruyVan) lúc dựng ứng dụng (hợp đồng mục 8)');
  }
  return _taoTruyVan(bc);
}

/**
 * Ghi một dòng nhật ký. Trả về bản ghi đã lưu, hoặc `null` khi ghi hỏng mà mã hành động
 * không nằm trong nhóm bắt buộc.
 *
 * @param {object} boiCanh  BẮT BUỘC — thiếu là ném LoiThieuBoiCanh, không trả rỗng.
 * @param {{hanhDong:string, doiTuongLoai?:string, doiTuongId?:string|number,
 *          truoc?:object, sau?:object, ghiChu?:string, ip?:string}} ban
 */
export async function ghiNhatKy(boiCanh, ban = {}) {
  // LUẬT 1 — nằm NGOÀI try. Thiếu bối cảnh là gọi sai, không phải "ghi hỏng": nuốt nó đi
  // thì cả một nhánh code chạy không có team mà nhật ký vẫn im lặng như không có gì.
  const bc = batBuocBoiCanh(boiCanh);

  const hanhDong = String(ban.hanhDong || '');
  try {
    if (!hanhDong) throw new LoiNhatKy('thiếu hanhDong — lấy mã từ hanh-dong.js');
    if (!hopLeHanhDong(hanhDong)) throw new LoiNhatKy(`mã hành động lạ: ${hanhDong} — thêm vào hanh-dong.js trước khi dùng`);
    if (ban.tac_nhan || ban.tacNhan) {
      // Luật 2: không ném (bản ghi vẫn đáng lưu) nhưng phải kêu — im lặng bỏ qua thì nơi
      // gọi tưởng mình đặt được, rồi tin vào một cột mà nó không hề điều khiển.
      console.warn('[nhat-ky] bỏ qua tac_nhan do nơi gọi tự đặt — tac_nhan luôn suy từ boiCanh.nguon');
    }

    const banGhi = {
      // KHÔNG đặt team_id: điều kiện team do cổng truy vấn chèn (spec "Bảng dữ liệu").
      thoi_gian: _dongHo(),                                   // luật 6
      tac_nhan: tacNhanCua(bc),                               // luật 2
      nguoi_dung_id: bc.nguon === NGUON.MAY ? null : (bc.nguoiDungId ?? null),
      hanh_dong: hanhDong,
      doi_tuong_loai: ban.doiTuongLoai ?? null,
      doi_tuong_id: ban.doiTuongId == null ? null : String(ban.doiTuongId),
      truoc: ban.truoc === undefined ? null : cheNhayCam(ban.truoc),   // luật 5
      sau: ban.sau === undefined ? null : cheNhayCam(ban.sau),         // luật 5
      ip: ban.ip ?? bc.ip ?? null,
      ghi_chu: ban.ghiChu ?? (bc.nguon === NGUON.MAY && bc.lyDo ? `việc nền: ${bc.lyDo}` : null),
    };

    const db = congTruyVan(bc);
    const luu = await db.them(BANG, banGhi);

    // Phễu nằm ngoài đường ghi: bản ghi đã nằm trong bảng, Telegram hỏng không được biến
    // một lần ghi THÀNH CÔNG thành một lần ném lỗi.
    if (_pheu) {
      try { await _pheu(luu); } catch (e) { console.error('[nhat-ky] phễu lỗi:', e && e.message); }
    }
    return luu;
  } catch (e) {
    // LUẬT 4
    if (laBatBuoc(hanhDong)) {
      console.error(`[nhat-ky] GHI HỎNG mã bắt buộc "${hanhDong}":`, e && e.message);
      throw e;                       // ném NGUYÊN lỗi gốc, giữ đúng loại để tầng trên phân biệt
    }
    console.error(`[nhat-ky] ghi hỏng (bỏ qua để việc chính đi tiếp) "${hanhDong}":`, e && e.message);
    return null;
  }
}

// ---- ĐỌC --------------------------------------------------------------------------

/**
 * Đọc nhật ký cho màn "Nhật ký thao tác".
 *
 * LUẬT 7 — không nhận `team_id`. Chặn HAI LỚP (hợp đồng mục 3 điều 2): lớp này đối chiếu
 * với vé rồi ghi `chan_xuyen_team`, và team_id vẫn được đẩy tiếp xuống cổng truy vấn để
 * cổng của người A đối chiếu lần nữa. Một lớp thì chỉ cần một chỗ quên là thủng.
 *
 * @returns {Promise<{dong: object[], tong: number}>}
 */
export async function docNhatKy(boiCanh, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);      // luật 1

  const {
    tuNgay, denNgay, hanhDong, nguoiDungId, doiTuongLoai, doiTuongId,
    gioiHan = 200, buoc = 0,
  } = bo;

  const teamXin = bo.team_id ?? bo.teamId;
  try {
    // Lớp chặn thứ nhất — của B. Lệch team là ném LoiXuyenTeam ngay tại đây.
    if (teamXin != null && teamXin !== '') doiChieuTeam(bc, teamXin);
  } catch (e) {
    if (e instanceof LoiXuyenTeam) await ghiChanXuyenTeam(bc, teamXin, e);
    throw e;                                // luật 7: để nguyên, không nuốt
  }

  const dieuKien = {};
  if (hanhDong != null && hanhDong !== '') dieuKien.hanh_dong = hanhDong;   // chuỗi hoặc mảng mã
  if (nguoiDungId != null && nguoiDungId !== '') dieuKien.nguoi_dung_id = nguoiDungId;
  if (doiTuongLoai != null && doiTuongLoai !== '') dieuKien.doi_tuong_loai = doiTuongLoai;
  if (doiTuongId != null && doiTuongId !== '') dieuKien.doi_tuong_id = String(doiTuongId);
  const moc = {};
  if (tuNgay != null) moc['>='] = mocThoiGian(tuNgay);
  if (denNgay != null) moc['<='] = mocThoiGian(denNgay, true);
  if (Object.keys(moc).length) dieuKien.thoi_gian = moc;
  // Đẩy tiếp xuống cổng để cổng của người A đối chiếu lần thứ hai.
  if (teamXin != null && teamXin !== '') dieuKien.team_id = teamXin;

  try {
    const db = congTruyVan(bc);
    const [dong, tong] = await Promise.all([
      db.chon(BANG, dieuKien, { sapXep: 'thoi_gian', giamDan: true, gioiHan, buoc }),
      db.dem(BANG, dieuKien),
    ]);
    return { dong, tong };
  } catch (e) {
    if (e instanceof LoiXuyenTeam) await ghiChanXuyenTeam(bc, teamXin, e);
    throw e;                                // đọc hỏng thì PHẢI ném — trả { dong: [] } trông
                                            // y hệt "không có gì trong nhật ký", nguy hiểm hơn nhiều
  }
}

/**
 * Ghi dấu vết một lần chặn xuyên team. `chan_xuyen_team` nằm trong nhóm bắt buộc nên
 * `ghiNhatKy` sẽ ném nếu ghi hỏng — nhưng ở đây ta nuốt cái ném đó và chỉ kêu ở console,
 * rồi để LoiXuyenTeam gốc đi tiếp. Lý do: nơi gọi (tầng HTTP) cần thấy 403 "xuyên team",
 * không phải 500 "cơ sở dữ liệu hỏng". Vẫn không có gì bị giấu — cả hai đều kêu.
 */
async function ghiChanXuyenTeam(bc, teamXin, loi) {
  try {
    await ghiNhatKy(bc, {
      hanhDong: HANH_DONG.CHAN_XUYEN_TEAM,
      doiTuongLoai: BANG,
      sau: { team_xin: String(teamXin ?? ''), team_cua: bc.teamId },
      ghiChu: loi && loi.message ? loi.message : `chặn đọc nhật ký xuyên team ở bảng ${BANG}`,
    });
  } catch (e) {
    console.error('[nhat-ky] KHÔNG ghi nổi dấu vết chan_xuyen_team:', e && e.message);
  }
}

/**
 * 'YYYY-MM-DD' | Date | số ms → mốc ms.
 *
 * Ngày trần tính theo UTC. `cuoiNgay` là cho `denNgay`: người dùng chọn "đến 10/08" thì ý
 * họ là HẾT ngày 10, không phải 0 giờ sáng ngày 10 — lấy đúng 0 giờ thì bộ lọc nuốt mất
 * cả ngày cuối mà không ai nhận ra.
 */
function mocThoiGian(v, cuoiNgay = false) {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const s = String(v);
  const laNgayTran = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const t = laNgayTran ? Date.parse(`${s}T00:00:00.000Z`) : Date.parse(s);
  if (Number.isNaN(t)) throw new LoiNhatKy(`mốc thời gian không đọc được: ${s}`);
  return laNgayTran && cuoiNgay ? t + 24 * 3600 * 1000 - 1 : t;
}

// LUẬT 3 — file này KHÔNG có `suaNhatKy`, KHÔNG có `xoaNhatKy`, và sẽ không bao giờ có.
// Cần sửa một dòng đã ghi thì ghi thêm một dòng mới nói rõ vì sao. Đó là ý nghĩa của
// "chỉ thêm": lịch sử sai vẫn là lịch sử, xoá nó đi là mất luôn bằng chứng.
// Chặn ở tầng dưới mới là chặn thật — quyền của người dùng cơ sở dữ liệu chỉ có
// INSERT + SELECT, đã ghi thành yêu cầu cho người A ở hợp đồng mục 4.
