// KHO KHOÁ API — MÃ HOÁ KHI LƯU — L1-M4b
//
// Vì sao tồn tại: `cau_hinh_model.khoa_ma_hoa` giữ khoá API của bốn nhà, mỗi team một bộ.
// Lưu nguyên văn thì một lần `SELECT *` trong lúc chữa lỗi, một bản sao lưu bị lộ, hay một
// dòng nhật ký in cả bản ghi là mất khoá của cả một team — mà khoá đó tiêu tiền thật.
//
// LUẬT CỦA FILE NÀY:
//   ① Khoá chủ đọc từ `V3_KHOA_CHU` (32 byte, base64). KHÔNG có thì NÉM LỖI ngay lần gọi
//      đầu. Không tự sinh khoá chủ, không lưu nguyên văn — lưu nguyên văn là đúng cái đang
//      muốn tránh, và tự sinh khoá chủ thì lần khởi động sau giải mã hỏng hết.
//   ② `AES-256-GCM`. GCM có thẻ xác thực nên sửa một ký tự trong `mat` là `giaiMa` ném lỗi,
//      không âm thầm trả về rác rồi mang rác đó đi gọi mạng.
//   ③ Khoá THẬT chỉ đi ra khỏi file này qua đúng `giaiMa`/`giaiMaKho`, và chỗ nhận là
//      `du-phong.js` → `goi-mot-lan.js` (cần để gọi mạng). Màn hình chỉ được nhận
//      `tomTatKho()` → `{ daCo, duoi }`.
//
// KHÔNG ném lúc nạp module, chỉ ném lúc GỌI: nạp module là việc của bộ chạy test và của
// mọi tiến trình, mà không phải tiến trình nào cũng đụng tới khoá.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { LoiModel, LoiThamSo } from './loi.js';
import { MA_NHA } from './nha/index.js';

/** Tên biến môi trường giữ khoá chủ. Một chỗ duy nhất để đổi tên là đổi một dòng. */
export const TEN_BIEN_KHOA_CHU = 'V3_KHOA_CHU';

/** Phiên bản gói mã hoá. Đổi thuật toán sau này thì tăng số, `giaiMa` vẫn đọc được gói cũ. */
export const PHIEN_BAN = 1;

const THUAT_TOAN = 'aes-256-gcm';
const DAI_KHOA_CHU = 32;   // AES-256
const DAI_IV = 12;         // khuyến nghị của GCM
const DAI_DUOI = 4;        // bốn ký tự cuối cho màn hình

/**
 * Bí mật ngắn hơn ngần này thì KHÔNG hiện đuôi.
 * Giống ngưỡng của `veSinhChuoi` ở `loi.js`: khoá thật luôn dài hơn nhiều, còn hiện đuôi
 * của một chuỗi 5 ký tự là hiện gần hết chuỗi đó.
 */
export const DAI_TOI_THIEU_HIEN_DUOI = 8;

/** Không có `V3_KHOA_CHU`, hoặc có mà sai độ dài. */
export class LoiKhoaChu extends LoiModel {
  constructor(chiTiet) {
    super(`Khoá chủ ${TEN_BIEN_KHOA_CHU}: ${chiTiet}`);
    this.name = 'LoiKhoaChu';
    this.ma = 'khoa_chu';
    this.status = 500;
  }
}

/** Gói mã hoá hỏng, bị sửa, hoặc mã bằng khoá chủ khác. */
export class LoiGiaiMa extends LoiModel {
  constructor(chiTiet) {
    // KHÔNG kèm gói vào thông điệp: thông điệp lỗi hay bị in ra log.
    super(`Giải mã khoá API hỏng: ${chiTiet}`);
    this.name = 'LoiGiaiMa';
    this.ma = 'giai_ma_hong';
    this.status = 500;
  }
}

// ---- KHOÁ CHỦ ----------------------------------------------------------------------

// Đệ theo ĐÚNG chuỗi env, không theo lần gọi đầu: đổi biến môi trường trong test là ăn
// ngay, mà lúc chạy thật thì cũng chỉ giải base64 đúng một lần.
let _demGoc = null;
let _demBuf = null;

/**
 * Đọc khoá chủ từ biến môi trường. Đọc lúc GỌI, không phải lúc nạp module.
 * @returns {Buffer} 32 byte
 * @throws {LoiKhoaChu} thiếu biến, hoặc base64 giải ra không đúng 32 byte
 */
export function docKhoaChu() {
  const tho = process.env[TEN_BIEN_KHOA_CHU];
  if (tho == null || String(tho).trim() === '') {
    throw new LoiKhoaChu(
      'chưa đặt. Sinh một khoá bằng `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"` '
      + 'rồi đặt vào biến môi trường. KHÔNG tự sinh ở đây: khoá chủ đổi mỗi lần khởi động thì '
      + 'mọi khoá API đã lưu thành rác.',
    );
  }
  const s = String(tho).trim();
  if (_demGoc === s && _demBuf) return _demBuf;

  let buf;
  try {
    buf = Buffer.from(s, 'base64');
  } catch {
    buf = Buffer.alloc(0);
  }
  if (buf.length !== DAI_KHOA_CHU) {
    throw new LoiKhoaChu(
      `phải là ${DAI_KHOA_CHU} byte mã base64 (AES-256) — chuỗi đang đặt giải ra ${buf.length} byte.`,
    );
  }
  _demGoc = s;
  _demBuf = buf;
  return buf;
}

/** Có khoá chủ hợp lệ không — dùng cho màn "Sức khoẻ hệ thống", KHÔNG ném lỗi. */
export function coKhoaChu() {
  try { docKhoaChu(); return true; } catch { return false; }
}

// ---- MÃ HOÁ · GIẢI MÃ --------------------------------------------------------------

/**
 * Mã hoá một khoá API.
 * @param {string} vanBan khoá nguyên văn
 * @returns {{v:number, iv:string, the:string, mat:string}} đúng bốn trường của hợp đồng mục 5
 * @throws {LoiThamSo} `vanBan` không phải chuỗi không rỗng
 * @throws {LoiKhoaChu} thiếu hoặc sai `V3_KHOA_CHU`
 */
export function machHoa(vanBan) {
  if (typeof vanBan !== 'string' || vanBan === '') {
    throw new LoiThamSo('machHoa cần một chuỗi không rỗng.');
  }
  const khoaChu = docKhoaChu();
  const iv = randomBytes(DAI_IV);
  const may = createCipheriv(THUAT_TOAN, khoaChu, iv);
  const mat = Buffer.concat([may.update(vanBan, 'utf8'), may.final()]);
  return {
    v: PHIEN_BAN,
    iv: iv.toString('base64'),
    the: may.getAuthTag().toString('base64'),
    mat: mat.toString('base64'),
  };
}

/** Hình dạng gói có đúng không — dùng trước khi giải mã, và để lọc bản ghi cũ hỏng. */
export function laGoiMaHoa(goi) {
  return !!goi && typeof goi === 'object'
    && typeof goi.iv === 'string' && goi.iv !== ''
    && typeof goi.the === 'string' && goi.the !== ''
    && typeof goi.mat === 'string';
}

/**
 * Giải mã một gói về lại khoá nguyên văn.
 * @param {{v:number, iv:string, the:string, mat:string}} goi
 * @returns {string}
 * @throws {LoiGiaiMa} gói sai hình dạng, sai phiên bản, bị sửa, hoặc mã bằng khoá chủ khác
 */
export function giaiMa(goi) {
  if (!laGoiMaHoa(goi)) throw new LoiGiaiMa('gói không đủ ba trường iv/the/mat.');
  const v = Number(goi.v ?? PHIEN_BAN);
  if (v !== PHIEN_BAN) throw new LoiGiaiMa(`phiên bản gói lạ: ${v} (file này đọc được v${PHIEN_BAN}).`);
  const khoaChu = docKhoaChu();
  try {
    const may = createDecipheriv(THUAT_TOAN, khoaChu, Buffer.from(goi.iv, 'base64'));
    may.setAuthTag(Buffer.from(goi.the, 'base64'));
    return Buffer.concat([may.update(Buffer.from(goi.mat, 'base64')), may.final()]).toString('utf8');
  } catch (e) {
    // GCM tự bắt: sửa một ký tự trong `mat` hay dùng nhầm khoá chủ là hỏng ở `final()`.
    // KHÔNG chuyển tiếp thông điệp gốc — nó không nói thêm gì mà lại kéo dữ liệu gói vào log.
    throw new LoiGiaiMa(`thẻ xác thực không khớp (gói bị sửa, hoặc ${TEN_BIEN_KHOA_CHU} không phải khoá đã mã).`);
  }
}

/**
 * Bốn ký tự cuối của khoá — để người dán khoá nhận ra mình dán đúng cái nào.
 * Chuỗi quá ngắn thì trả về rỗng: hiện đuôi của một chuỗi 5 ký tự là hiện gần hết nó.
 */
export function duoiKhoa(vanBan) {
  const s = String(vanBan ?? '');
  if (s.length < DAI_TOI_THIEU_HIEN_DUOI) return '';
  return s.slice(-DAI_DUOI);
}

// ---- CẢ BỘ BỐN NHÀ -----------------------------------------------------------------
// `khoa_ma_hoa` là jsonb `{ claude:{…}, kimi:{…}, openai:{…}, deepseek:{…} }`. Ba hàm dưới
// làm việc trên cả bộ để `cau-hinh.js` không phải tự vòng lặp — mà vòng lặp tự viết là chỗ
// dễ quên một nhà, hoặc dễ lỡ tay trả cả khoá thật ra màn hình.

/**
 * Mã hoá cả bộ khoá nguyên văn.
 * Giá trị `null`/`''` nghĩa là XOÁ khoá của nhà đó (trả về `null` để `cau-hinh.js` ghi đè).
 * @param {Record<string,string|null>} kho
 * @returns {Record<string, object|null>}
 * @throws {LoiThamSo} mã nhà lạ
 */
export function machHoaKho(kho = {}) {
  const ra = {};
  for (const [nha, gt] of Object.entries(kho || {})) {
    if (!MA_NHA.includes(nha)) {
      throw new LoiThamSo(`Nhà cung cấp lạ trong bộ khoá: "${nha}". Có: ${MA_NHA.join(', ')}.`);
    }
    if (gt == null || String(gt).trim() === '') { ra[nha] = null; continue; }
    ra[nha] = machHoa(String(gt).trim());
  }
  return ra;
}

/**
 * Giải mã cả bộ. Gói nào hỏng thì BỎ nhà đó và kêu ở console — một khoá Claude hỏng không
 * được làm chết lượt chat đang chạy bằng Kimi.
 * @returns {Record<string,string>}
 */
export function giaiMaKho(kho = {}) {
  const ra = {};
  for (const [nha, goi] of Object.entries(kho || {})) {
    if (goi == null) continue;
    try {
      ra[nha] = giaiMa(goi);
    } catch (e) {
      console.error(`[kho-khoa] khoá nhà "${nha}" giải mã hỏng, bỏ qua nhà này:`, e && e.message);
    }
  }
  return ra;
}

/**
 * Tóm tắt CHO MÀN HÌNH. Đây là thứ duy nhất được đi ra API.
 * @returns {Record<string,{daCo:boolean, duoi:string|null, hong?:boolean}>} đủ cả bốn nhà
 */
export function tomTatKho(kho = {}) {
  const ra = {};
  for (const nha of MA_NHA) {
    const goi = (kho || {})[nha];
    if (goi == null) { ra[nha] = { daCo: false, duoi: null }; continue; }
    try {
      ra[nha] = { daCo: true, duoi: duoiKhoa(giaiMa(goi)) || null };
    } catch {
      // Có gói mà giải không ra: vẫn phải hiện, và phải hiện là HỎNG. Ẩn đi thì người ta
      // tưởng chưa dán khoá, dán đè lên rồi vẫn không hiểu vì sao lần trước hỏng.
      ra[nha] = { daCo: true, duoi: null, hong: true };
    }
  }
  return ra;
}
