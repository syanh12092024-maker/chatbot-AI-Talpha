// Đọc biến môi trường theo kiểu CHỈ-ĐỌC: `process.env` trước, rơi về tệp `.env` sau.
//
// Vì sao cần: `db/khoa.js` (giaiMa/maHoa) đọc khoá gốc từ `process.env.V3_KHOA_MA_HOA`,
// nhưng KHÔNG script nào của v3 nạp `.env` vào `process.env` — `db/ket-noi.js` có hàm
// `docEnv` làm đúng việc này nhưng KHÔNG export. Đo 22/08: `npm run di-tru` chết ngay
// dòng đầu («Thiếu V3_KHOA_MA_HOA») dù `.env` có đủ biến ở dòng 83.
//
// Phiếu L1-M1 ③ cấm sửa `db/ket-noi.js` (ngoài pathspec), nên lượt này chép 12 dòng
// thay vì export lại hàm có sẵn — HAI bản đọc `.env` trong một repo là một khớp dễ trôi,
// đã ghi §9 sổ để phiếu sau gộp về một.
//
// ⛔ KHÔNG nạp `.env` vào `process.env` của cả tiến trình: bộ ca dựng CSDL sandbox bằng
//    biến môi trường, đè lên là test đo nhầm CSDL (cùng lý do `db/ket-noi.js` ghi ra).
import fs from "node:fs";
import path from "node:path";
import { GOC } from "../../db/ket-noi.js";

export function docBien(ten, env = process.env, goc = GOC) {
  if (env[ten]) return env[ten];
  try {
    const raw = fs.readFileSync(path.join(goc, ".env"), "utf8");
    for (const dong of raw.split("\n")) {
      const m = dong.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
      if (m && m[1] === ten) return m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* không có .env thì coi như thiếu biến */
  }
  return "";
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
