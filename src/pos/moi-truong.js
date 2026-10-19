// Đọc biến môi trường theo kiểu CHỈ-ĐỌC: `process.env` trước, rơi về tệp `.env` sau.
//
// Vì sao cần: `db/khoa.js` (giaiMa/maHoa) đọc khoá gốc từ `process.env.V3_KHOA_MA_HOA`,
// nhưng KHÔNG script nào của v3 nạp `.env` vào `process.env` — `db/ket-noi.js` có hàm
// `docEnv` làm đúng việc này nhưng KHÔNG export. Đo 22/08: `npm run di-tru` chết ngay
// dòng đầu («Thiếu V3_KHOA_MA_HOA») dù `.env` có đủ biến ở dòng 83.
//
// L1-M1 chép 12 dòng đọc tay vì `db/ket-noi.js` khi đó ngoài pathspec; GL9 gộp về MỘT bộ đọc: `db/ket-noi.js#docTepEnv`
// (`util.parseEnv` ⇒ cùng giá trị `node --env-file`; chú thích đuôi `V3_KHOA_MA_HOA=abc   # …` không còn dính vào khoá;
// tệp hỏng/không đọc được ⇒ NÉM — xem đầu `db/ket-noi.js`).
//
// ⛔ KHÔNG nạp `.env` vào `process.env` của cả tiến trình: bộ ca dựng CSDL sandbox bằng
//    biến môi trường, đè lên là test đo nhầm CSDL (cùng lý do `db/ket-noi.js` ghi ra).
import { GOC, docTepEnv } from "../../db/ket-noi.js";

/** `env[ten]` (THAM SỐ, mặc định `process.env`) có giá trị (truthy) thì thắng; rỗng/vắng ⇒ tra `<goc>/.env`; không có ⇒ `""`. */
export function docBien(ten, env = process.env, goc = GOC) {
  if (env[ten]) return env[ten];
  return docTepEnv(ten, goc) ?? "";
}

/**
 * Trả một BẢN SAO của env có thêm khoá mã hoá (nếu `.env` có mà process.env chưa).
 * ⛔ Cố ý KHÔNG bù `V3_POS_GHI`: van ghi POS phải do người vận hành gạt ở môi trường
 *    tiến trình, không được «tự tìm thấy» trong một tệp nằm sẵn trong cây (fail-CLOSED).
 */
export function moiTruongKhoa(env = process.env, goc = GOC) {
  const k = docBien("V3_KHOA_MA_HOA", env, goc);
  return k ? { ...env, V3_KHOA_MA_HOA: k } : env;
}
