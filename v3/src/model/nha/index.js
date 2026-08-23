// SỔ ĐĂNG KÝ BỐN NHÀ — L1-M4a
//
// Bốn nhà đều tuân đúng MỘT giao diện, nên `goi-mot-lan.js` không có một câu `if` nào về
// tên nhà. Thêm nhà thứ năm = thêm một file trong thư mục này rồi ghi tên vào `NHA` —
// không phải sửa chỗ nào khác.
//
// Giao diện của một nhà:
//   ma              mã dùng trong hệ thống, khớp cột `nha` của `bang-model.js`
//   ten             tên hiển thị
//   ho              'anthropic' | 'openai' — quyết định dùng bộ dịch nào
//   baseUrlMacDinh  gốc URL; `goiMotLan({baseUrl})` đè được để trỏ máy chủ nội bộ
//   duongDan        đường dẫn điểm cuối
//   dungGoi({ dong, khoa, yeuCau, doNgauNhien, baseUrl }) → { url, tuyChon }
//   docTraLoi(json, { ma }) → câu trả lời ĐÃ quy về hình dạng Anthropic

import { LoiNhaLa } from '../loi.js';
import { nha as claude } from './claude.js';
import { nha as kimi } from './kimi.js';
import { nha as openai } from './openai.js';
import { nha as deepseek } from './deepseek.js';

export const NHA = Object.freeze({ claude, kimi, openai, deepseek });

/** Mã của bốn nhà. */
export const MA_NHA = Object.freeze(Object.keys(NHA));

/**
 * Lấy bản cài của một nhà.
 * @throws {LoiNhaLa} mã nhà không có trong sổ
 */
export function layNha(ma) {
  const n = NHA[String(ma)];
  if (!n) throw new LoiNhaLa(ma, MA_NHA);
  return n;
}

export { claude, kimi, openai, deepseek };
