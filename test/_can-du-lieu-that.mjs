// «BỘ CA NÀY CẦN DỮ LIỆU THẬT» — HOÃN MINH BẠCH thay vì đỏ oan.
//
// ═══ VÌ SAO CÓ TỆP NÀY (14/09) ═════════════════════════════════════════════════════
// Lượt chạy đầu tiên của `.github/workflows/bo-ca.yml` trên GitHub Actions:
//   1.664 ca · 1.639 xanh · 23 ĐỎ — và 21 trong 23 đỏ vì CI không có dữ liệu thật
//   (`pages.json`, `conv-state.json`, `ai-enabled.json`… đều gitignore, chỉ có trên VPS).
//
// Đó KHÔNG phải lỗi mã. Chính đầu tệp workflow đã ghi trước: «bộ ca nào cần dữ liệu đã di
// trú sẽ đỏ — đó là giới hạn THẬT của cổng này». Nhưng một cổng đỏ thường trực thì không ai
// đọc nữa, nên nó không bao giờ thành cổng chạy mỗi lần push.
//
// Nên: ca nào cần dữ liệu thật thì HOÃN và NÓI RA lý do, thay vì đỏ.
//
// ⚠️ HOÃN ≠ CHE. Chỉ dùng cho ca đã BIẾT CHẮC vì sao nó cần tệp nào. Một ca đỏ chưa giải
//    thích được mà đem hoãn ở đây là tự dựng một cổng mù — đúng cảnh «màn trống vẫn đạt».
//    Trên máy CÓ dữ liệu, hàm này trả `false` nên ca chạy như thường, không mất phép đo nào.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param  {...string} ten  tên tệp dữ liệu ở GỐC REPO mà ca này cần
 * @returns {string|false}  lý do hoãn (hợp với `test(ten, { skip: lyDo }, fn)`), hoặc false
 */
export function thieuDuLieuThat(...ten) {
  const thieu = ten.filter((t) => !fs.existsSync(path.join(GOC, t)));
  if (!thieu.length) return false;
  return `cần dữ liệu thật (${thieu.join(", ")}) — tệp gitignore, chỉ có trên máy dev/VPS`;
}
