// NHÀ KIMI (Moonshot) — L1-M4a
//
// Moonshot có điểm cuối TƯƠNG THÍCH CHUẨN ANTHROPIC, nên chỉ đổi gốc URL là dùng lại
// nguyên hình dạng `messages.create`.
//
// ⚠️ BẪY ĐÃ TRẢ GIÁ BẰNG KHÁCH THẬT — chép từ `src/llm.js` dòng 35–39 của bản đang chạy:
// Kimi k2.6 MẶC ĐỊNH BẬT thinking. Không tắt thì phần suy nghĩ ăn sạch `max_tokens` và
// tin trả về RỖNG. Đo thật: `max_tokens=200` → `thinking_tokens=199`, `text=""`.
// Khách nhận được một tin trống, bot trông như đứng hình.
// → Bản cài này BẮT BUỘC gửi kèm `thinking:{type:'disabled'}`. Claude thì KHÔNG có trường
//   này (gửi vào là 400), nên hai nhà tuy cùng họ vẫn phải tách hai file.

import { thanAnthropic, tuAnthropic } from '../chuan-hoa.js';
import { PHIEN_BAN_ANTHROPIC } from './claude.js';

/** Trường bắt buộc thêm vào MỌI lời gọi Kimi. Đừng bỏ, đừng đặt điều kiện. */
export const TAT_SUY_NGHI = Object.freeze({ thinking: Object.freeze({ type: 'disabled' }) });

export const nha = {
  ma: 'kimi',
  ten: 'Kimi (Moonshot)',
  ho: 'anthropic',
  // Bản QUỐC TẾ. Khoá bản .cn không dùng được ở đây và ngược lại (src/config.js dòng 37–39).
  baseUrlMacDinh: 'https://api.moonshot.ai/anthropic',
  duongDan: '/v1/messages',

  dungGoi({ dong, khoa, yeuCau, doNgauNhien, baseUrl }) {
    const goc = String(baseUrl || nha.baseUrlMacDinh).replace(/\/+$/, '');
    return {
      url: goc + nha.duongDan,
      tuyChon: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': khoa,
          'anthropic-version': PHIEN_BAN_ANTHROPIC,
        },
        body: JSON.stringify(thanAnthropic(yeuCau, {
          maGoiApi: dong.maGoiApi,
          doNgauNhien,
          them: { ...TAT_SUY_NGHI },
        })),
      },
    };
  },

  docTraLoi(json, { ma } = {}) {
    return tuAnthropic(json, { ma });
  },
};

export default nha;
