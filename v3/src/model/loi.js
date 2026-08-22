// LỖI CHUẨN CỦA LỚP MODEL — L1-M4a
//
// Mọi lỗi đi ra khỏi lớp model đều là một trong các lớp dưới đây. Tầng trên (bộ dự phòng
// L1-M4c, phễu Sổ AI, màn hình) chỉ phải biết đúng bấy nhiêu loại, không phải đoán chữ
// trong thông điệp của bốn nhà cung cấp khác nhau.
//
// LUẬT KHÔNG ĐƯỢC PHÁ: khoá API KHÔNG BAO GIỜ đi vào thông điệp lỗi, vào log, hay vào kết
// quả trả về. Chỗ nào dựng lỗi từ dữ liệu của nhà cung cấp thì phải đi qua `veSinhLoi()`
// — nhà cung cấp có thể vọng lại khoá trong thân lỗi, và một dòng log như thế là rò khoá
// của cả một team.

/** Gốc chung — bắt được cả họ bằng một `catch (e) { if (e instanceof LoiModel) … }`. */
export class LoiModel extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = 'LoiModel';
    this.ma = 'loi_model';
    this.status = 500;
  }
}

/** Mã model không có trong `bang-model.js`. */
export class LoiModelLa extends LoiModel {
  constructor(ma, danhSach = []) {
    super(`Mã model lạ: "${ma}". Có trong bảng: ${danhSach.join(', ') || '(bảng rỗng)'}.`);
    this.name = 'LoiModelLa';
    this.ma = 'model_la';
    this.status = 400;
    this.maModel = String(ma);
  }
}

/** Mã nhà cung cấp không có trong sổ đăng ký `nha/index.js`. */
export class LoiNhaLa extends LoiModel {
  constructor(maNha, danhSach = []) {
    super(`Nhà cung cấp lạ: "${maNha}". Có trong sổ: ${danhSach.join(', ') || '(sổ rỗng)'}.`);
    this.name = 'LoiNhaLa';
    this.ma = 'nha_la';
    this.status = 400;
    this.maNha = String(maNha);
  }
}

/**
 * Không có khoá API cho nhà cung cấp này.
 * NÉM TRƯỚC KHI GỌI MẠNG — gọi rồi mới biết thiếu khoá là đốt một vòng chờ 401 vô ích,
 * và 401 lại bị bộ dự phòng đọc thành "tài khoản hỏng" rồi đổi nhà oan.
 */
export class LoiThieuKhoa extends LoiModel {
  constructor(maNha) {
    super(`Thiếu khoá API cho nhà cung cấp "${maNha}". Không gọi mạng.`);
    this.name = 'LoiThieuKhoa';
    this.ma = 'thieu_khoa';
    this.status = 400;
    this.maNha = String(maNha);
  }
}

/** Tham số gọi sai (độ ngẫu nhiên ngoài [0,1], yêu cầu không có `messages`, đơn giá đè hỏng…). */
export class LoiThamSo extends LoiModel {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = 'LoiThamSo';
    this.ma = 'tham_so';
    this.status = 400;
  }
}

/**
 * Nhà cung cấp trả về không phải 2xx, hoặc không gọi tới được.
 * - `laLoiTaiKhoan` true  → sửa bằng NẠP TIỀN / ĐỔI KHOÁ, thử lại bao nhiêu cũng vô ích.
 * - `laLoiMang`     true  → không nhận được câu trả lời nào (đứt mạng, DNS…), `status` = 0.
 */
export class LoiNhaCungCap extends LoiModel {
  constructor({ maNha, status = 0, thongDiep = '', laLoiTaiKhoan = false, laLoiMang = false }) {
    super(`Nhà "${maNha}" lỗi${status ? ` (HTTP ${status})` : ''}: ${thongDiep || '(không có thông điệp)'}`);
    this.name = 'LoiNhaCungCap';
    this.ma = 'loi_nha_cung_cap';
    // CHÚ Ý — chỉ riêng lớp lỗi này, `status` là status NHÀ CUNG CẤP TRẢ VỀ (0 khi đứt
    // mạng), đúng như spec L1-M4a mô tả: bộ dự phòng L1-M4c đọc số này để quyết định đổi
    // nhà. Status để TRẢ CHO NGƯỜI DÙNG hệ thống nằm ở `statusTraVe` — đừng trả 402 của
    // Moonshot ra cho màn hình của sale.
    this.status = Number(status) || 0;
    this.statusTraVe = 502;
    this.maNha = String(maNha);
    this.thongDiep = String(thongDiep || '');
    this.laLoiTaiKhoan = !!laLoiTaiKhoan;
    this.laLoiMang = !!laLoiMang;
  }
}

/** Quá `timeoutMs` — đã huỷ bằng AbortController, KHÔNG tự thử lại (việc của L1-M4c). */
export class LoiHetGio extends LoiModel {
  constructor(maNha, timeoutMs) {
    super(`Nhà "${maNha}" quá ${timeoutMs}ms không trả lời — đã huỷ lời gọi.`);
    this.name = 'LoiHetGio';
    this.ma = 'het_gio';
    this.status = 504;
    this.maNha = String(maNha);
    this.timeoutMs = Number(timeoutMs) || 0;
  }
}

// ---- NHẬN DIỆN LỖI TẦNG TÀI KHOẢN --------------------------------------------------
// XUẤT XỨ: chép NGUYÊN VĂN từ `src/llm-health.js` dòng 20 (bản đang chạy, 51 page khách
// thật). CHÉP, KHÔNG IMPORT — `src/llm-health.js` giữ TRẠNG THÁI TOÀN CỤC của bản đang
// chạy (cờ down/up, bộ đếm lỗi 5 phút); import vào đây là buộc con bot thật vào code v3,
// một bài test của v3 cũng đủ làm bot thật tưởng tầng LLM hỏng rồi dừng trả lời khách.
//
// Vì sao cần: 08–10/08/2026 tài khoản Kimi hết tiền, log ghi 28.469 lần "insufficient
// balance", systemctl vẫn 'active' → không ai biết trong 2 ngày. Lỗi loại này KHÔNG tự
// hồi phục: thử lại vô ích, phải nạp tiền hoặc đổi khoá.
export const LOI_TAI_KHOAN = /(insufficient balance|insufficient_quota|suspended|recharge your account|billing|exceeded your current quota|invalid api key|authentication_error|invalid_api_key|permission_error)/i;

/** Status HTTP luôn là lỗi tầng tài khoản — cũng chép từ `src/llm-health.js` dòng 81. */
export const STATUS_TAI_KHOAN = Object.freeze([401, 402, 403]);

/**
 * Lỗi này có phải lỗi tầng tài khoản không (hết tiền / sai khoá / bị khoá)?
 * @param {string} thongDiep thân lỗi nhà cung cấp trả về
 * @param {number} [status] status HTTP
 */
export function laLoiTaiKhoan(thongDiep, status = 0) {
  const s = Number(status) || 0;
  if (STATUS_TAI_KHOAN.includes(s)) return true;
  return LOI_TAI_KHOAN.test(String(thongDiep || ''));
}

// ---- VỆ SINH KHOÁ ------------------------------------------------------------------

/** Chuỗi thay thế cho phần bí mật. Nhận ra ngay khi đọc log. */
export const CHE = '***';

/**
 * Xoá mọi lần xuất hiện của các chuỗi bí mật khỏi một chuỗi.
 * Bí mật ngắn dưới 8 ký tự thì BỎ QUA: chuỗi ngắn hay trùng với chữ bình thường, thay
 * bừa sẽ băm nát thông điệp lỗi mà chẳng giấu được gì (khoá thật luôn dài hơn nhiều).
 */
export function veSinhChuoi(chuoi, ...biMat) {
  let s = String(chuoi ?? '');
  for (const b of biMat) {
    if (typeof b !== 'string' || b.length < 8) continue;
    if (s.includes(b)) s = s.split(b).join(CHE);
  }
  return s;
}

/**
 * Vệ sinh một lỗi TẠI CHỖ: thông điệp và mọi thuộc tính chuỗi tự có của nó.
 * Dùng ở đúng một chỗ — cửa ra của `goiMotLan()` — nên không lỗi nào lọt ra ngoài lớp
 * model mà còn mang khoá. Kể cả lỗi do `fetch` ném ra, hay lỗi nhà cung cấp vọng lại khoá.
 */
export function veSinhLoi(err, ...biMat) {
  if (!err || typeof err !== 'object') return err;
  try {
    if (typeof err.message === 'string') err.message = veSinhChuoi(err.message, ...biMat);
    for (const [k, v] of Object.entries(err)) {
      if (typeof v === 'string') err[k] = veSinhChuoi(v, ...biMat);
    }
    // `cause` hay mang nguyên lỗi mạng gốc — vệ sinh luôn một tầng.
    if (err.cause && typeof err.cause === 'object') veSinhLoi(err.cause, ...biMat);
  } catch { /* vệ sinh không được thì cũng không được làm hỏng lỗi gốc */ }
  return err;
}
