// SỨC KHOẺ TỪNG NHÀ, TỪNG TEAM — L1-M4c
//
// XUẤT XỨ: chép CÁCH NGHĨ từ `src/llm-health.js` của bản đang chạy — ba việc của nó
// (① nhận ra lỗi không tự hồi phục ở tầng tài khoản · ② dừng thay vì spam · ③ tự dò sống
// lại mỗi 5 phút) và ba con số của nó (5 phút thử lại, cửa sổ 5 phút, ngưỡng 10 lỗi).
//
// CHÉP, KHÔNG IMPORT. `src/llm-health.js` giữ TRẠNG THÁI TOÀN CỤC của bản đang chạy đang
// phục vụ 51 page khách thật; import vào đây thì một bài test của v3 cũng đủ làm con bot
// thật tưởng tầng LLM hỏng rồi ngừng trả lời khách.
//
// KHÁC MỘT CHỖ CĂN BẢN: theo dõi theo `teamId + nha`, không phải một cờ toàn cục.
// Team A hết tiền Kimi thì team B vẫn chạy Kimi bình thường — bản đang chạy không phân
// biệt được điều đó vì nó chỉ có một tài khoản.
//
// LỖ PHẢI BỊT (có thật):
//   · 06/08/2026 — tài khoản nhà chính hết tiền, bot đứng im 3 tiếng, không ai biết.
//   · 08–10/08/2026 — chết 2 ngày, `systemctl` vẫn `active`, dashboard vẫn xanh,
//     log ghi 28.469 lần cùng một lỗi. Vì thế: hỏng là hỏng NGAY (không đợi ngưỡng) khi
//     lỗi ở tầng tài khoản, và mỗi lần đổi trạng thái chỉ báo ĐÚNG MỘT LẦN.

import { laLoiTaiKhoan, LoiNhaCungCap, LoiHetGio, LoiThieuKhoa } from './loi.js';
import { MA_NHA } from './nha/index.js';

/** Cứ ngần này thì cho lọt ĐÚNG MỘT lời gọi để dò xem nhà đó sống lại chưa. */
export const MS_THU_LAI = 5 * 60 * 1000;

/** Cửa sổ đếm lỗi thoáng qua. */
export const MS_CUA_SO_LOI = 5 * 60 * 1000;

/** Đủ ngần này lỗi THOÁNG QUA trong cửa sổ thì mới coi là hỏng. */
export const NGUONG_LOI = 10;

/** @type {() => number} */
let _dongHo = () => Date.now();

/** Tiêm đồng hồ để test không phải chờ thật. Truyền `null` để trả về `Date.now`. */
export function datDongHo(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDongHo cần một hàm');
  _dongHo = fn || (() => Date.now());
  return _dongHo;
}

/** Bây giờ là mấy giờ — theo đồng hồ đang tiêm. */
export function bayGio() { return _dongHo(); }

const khoaCua = (teamId, nha) => `${String(teamId)}::${String(nha)}`;

/** @type {Map<string, object>} */
const _trang = new Map();

function o(teamId, nha) {
  const k = khoaCua(teamId, nha);
  let s = _trang.get(k);
  if (!s) {
    s = {
      teamId: String(teamId), nha: String(nha),
      hong: false, lyDo: '', loiTaiKhoan: false,
      tuLuc: 0, thuLanCuoi: 0,
      loi: [],              // [{ luc, status, thongDiep }] trong cửa sổ 5 phút
      tongLoi: 0, loiCuoi: '', loiCuoiLuc: 0,
      okCuoiLuc: 0, tongOk: 0,
    };
    _trang.set(k, s);
  }
  return s;
}

function tia(s) {
  const cat = _dongHo() - MS_CUA_SO_LOI;
  while (s.loi.length && s.loi[0].luc < cat) s.loi.shift();
}

// ---- ĐỌC LỖI -----------------------------------------------------------------------

/**
 * Bóc một lỗi ra ba câu hỏi mà bộ dự phòng cần: *tầng tài khoản?* *lỗi mạng/hết giờ?*
 * *status bao nhiêu?*
 *
 * CHÚ Ý về `status`: chỉ `LoiNhaCungCap` mới mang status của NHÀ CUNG CẤP. Các lỗi khác
 * mang status để trả cho người dùng hệ thống (`LoiThieuVai` là 403 chẳng hạn) — đọc nhầm
 * cái đó thành "hết tiền" là đổi nhà oan.
 */
export function docLoi(err) {
  const laNha = err instanceof LoiNhaCungCap;
  const thongDiep = String((laNha ? err.thongDiep : null) || err?.message || err || '');
  const status = laNha ? (Number(err.status) || 0) : 0;

  // Thiếu khoá cũng là chuyện tầng tài khoản: thử lại bao nhiêu cũng vô ích, phải có người
  // dán khoá vào. Đi thẳng dự phòng là đúng.
  const thieuKhoa = err instanceof LoiThieuKhoa;
  const laTaiKhoan = thieuKhoa || (laNha && err.laLoiTaiKhoan === true) || laLoiTaiKhoan(thongDiep, status);

  const hetGio = err instanceof LoiHetGio;
  const laMang = hetGio || (laNha && err.laLoiMang === true);

  return { thongDiep, status, laTaiKhoan, laMang, hetGio, thieuKhoa };
}

/**
 * Lỗi này có đáng thử lại / đáng chuyển dự phòng không?
 * `4xx` KHÁC (400 sai yêu cầu, 404, 422…) → KHÔNG. Yêu cầu sai thì nhà nào cũng sai;
 * chuyển dự phòng chỉ tốn thêm tiền và giấu mất lỗi thật.
 */
export function nenChuyenNha(err) {
  const d = docLoi(err);
  if (d.laTaiKhoan) return true;
  if (d.laMang) return true;
  if (!(err instanceof LoiNhaCungCap)) return false;
  if (d.status >= 500) return true;
  if (d.status === 429) return true;   // quá tải, nhà khác có thể còn chỗ
  return false;
}

// ---- GHI NHẬN ----------------------------------------------------------------------

/** Một lời gọi THÀNH CÔNG: xoá sạch bộ đếm lỗi và mở lại nhà đó. */
export function ghiNhanOk(teamId, nha) {
  const s = o(teamId, nha);
  const truocDoHong = s.hong;
  s.okCuoiLuc = _dongHo();
  s.tongOk++;
  s.loi.length = 0;
  s.hong = false;
  s.lyDo = '';
  s.loiTaiKhoan = false;
  s.tuLuc = 0;
  return truocDoHong;      // true = vừa SỐNG LẠI, để nơi gọi báo đúng một lần
}

function danhDauHong(s, lyDo, laTaiKhoan) {
  if (s.hong) return false;            // đã hỏng rồi thì KHÔNG phải một lần đổi trạng thái
  s.hong = true;
  s.lyDo = lyDo;
  s.loiTaiKhoan = !!laTaiKhoan;
  s.tuLuc = _dongHo();
  s.thuLanCuoi = _dongHo();
  return true;
}

/**
 * Một lời gọi LỖI.
 * @returns {boolean} true nếu đây là lỗi TẦNG TÀI KHOẢN (hết tiền / sai khoá / bị khoá) —
 *   đúng hình dạng `noteLlmError` của bản đang chạy.
 *   Muốn biết lần này có phải lần ĐỔI TRẠNG THÁI hay không thì so `dangHongThuan()` trước
 *   và sau, hoặc đọc `tinhTrang()`.
 */
export function ghiNhanLoi(teamId, nha, err) {
  const s = o(teamId, nha);
  const d = docLoi(err);
  s.tongLoi++;
  s.loiCuoi = d.thongDiep.slice(0, 200);
  s.loiCuoiLuc = _dongHo();
  s.loi.push({ luc: _dongHo(), status: d.status, thongDiep: s.loiCuoi });
  tia(s);

  if (d.laTaiKhoan) {
    // HỎNG NGAY, không đợi đủ ngưỡng. Đây là điều làm cho "chuyển dự phòng dưới 30 giây"
    // thành đúng: không đo bằng đồng hồ, mà là chuyển NGAY LỜI GỌI TIẾP THEO.
    danhDauHong(s, `lỗi tài khoản (${d.status || '?'}): ${s.loiCuoi.slice(0, 160)}`, true);
    return true;
  }
  if (s.loi.length >= NGUONG_LOI) {
    danhDauHong(s, `${s.loi.length} lỗi trong 5 phút — lỗi cuối: ${s.loiCuoi.slice(0, 160)}`, false);
  }
  return false;
}

// ---- ĐỌC TRẠNG THÁI ----------------------------------------------------------------

/**
 * Nhà này đang hỏng không — CÓ TÁC DỤNG PHỤ.
 * Cứ `MS_THU_LAI` (5 phút) thì cho lọt ĐÚNG MỘT lời gọi để dò xem đã sống lại chưa; lời
 * gọi đó thành công thì `ghiNhanOk` mở lại. Không có nhịp dò này thì nạp tiền xong bot
 * vẫn nằm im tới lúc có người khởi động lại.
 */
export function dangHong(teamId, nha) {
  const s = o(teamId, nha);
  if (!s.hong) return false;
  if (_dongHo() - s.thuLanCuoi >= MS_THU_LAI) {
    s.thuLanCuoi = _dongHo();
    console.warn(`[suc-khoe] team ${s.teamId} · nhà ${s.nha}: thử một lời gọi để dò xem sống lại chưa…`);
    return false;
  }
  return true;
}

/** Cờ hỏng THUẦN — không nhả nhịp dò, không đụng gì. Dùng để nhận ra lần ĐỔI TRẠNG THÁI. */
export function dangHongThuan(teamId, nha) {
  return o(teamId, nha).hong;
}

function moTaMot(s) {
  const gio = _dongHo();
  const trongCuaSo = s.loi.filter((e) => e.luc >= gio - MS_CUA_SO_LOI);
  return {
    nha: s.nha,
    hong: s.hong,
    lyDo: s.lyDo,
    loiTaiKhoan: s.loiTaiKhoan,
    tuLuc: s.tuLuc,
    phutHong: s.hong && s.tuLuc ? Math.round((gio - s.tuLuc) / 60000) : 0,
    loiTrong5p: trongCuaSo.length,
    nguong: NGUONG_LOI,
    tongLoi: s.tongLoi,
    tongOk: s.tongOk,
    loiCuoi: s.loiCuoi,
    loiCuoiLuc: s.loiCuoiLuc,
    okCuoiLuc: s.okCuoiLuc,
  };
}

/**
 * Cho màn "Sức khoẻ hệ thống": đủ BỐN nhà, kể cả nhà chưa gọi lần nào.
 * Chưa gọi lần nào mà không hiện thì màn hình trông y hệt "mọi thứ đều tốt" — đúng cái
 * dashboard xanh trong lúc bot chết hai ngày.
 */
export function tinhTrang(teamId) {
  const nha = {};
  for (const ma of MA_NHA) nha[ma] = moTaMot(o(teamId, ma));
  const dsHong = Object.values(nha).filter((x) => x.hong).map((x) => x.nha);
  return {
    teamId: String(teamId),
    coNhaHong: dsHong.length > 0,
    nhaHong: dsHong,
    nha,
  };
}

/** Tình trạng của MỌI team đang có trong bộ nhớ — cho màn tổng của quản trị. */
export function tinhTrangTatCa() {
  const team = new Set();
  for (const s of _trang.values()) team.add(s.teamId);
  return [...team].map((t) => tinhTrang(t));
}

/** Quên trạng thái. Bỏ trống `teamId` = quên hết. Dùng cho test và cho lệnh "đặt lại". */
export function xoaSucKhoe(teamId) {
  if (teamId == null) { _trang.clear(); return; }
  const t = String(teamId);
  for (const [k, s] of [..._trang]) if (s.teamId === t) _trang.delete(k);
}
