// NHÀ CLAUDE (Anthropic) — L1-M4a
//
// KHÔNG dùng `@anthropic-ai/sdk`. Lý do (spec L1-M4a): lớp model phải nhận khoá THEO TỪNG
// TEAM, mà SDK dựng client MỘT LẦN theo khoá lúc nạp module — xem `src/llm.js` dòng 9–11
// của bản đang chạy, đúng chỗ hỏng đang muốn sửa. Gọi bằng `fetch` thẳng cũng làm test
// chạy được mà không cần mạng.

import { thanAnthropic, tuAnthropic } from '../chuan-hoa.js';

/** Phiên bản API Anthropic — bắt buộc có trên mọi lời gọi `/v1/messages`. */
export const PHIEN_BAN_ANTHROPIC = '2023-06-01';

export const nha = {
  ma: 'claude',
  ten: 'Claude (Anthropic)',
  ho: 'anthropic',
  baseUrlMacDinh: 'https://api.anthropic.com',
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
        // Claude KHÔNG có trường `thinking:{type:'disabled'}` như Kimi — gửi vào là 400.
        // Đó là lý do hai nhà cùng họ Anthropic vẫn phải là hai file.
        body: JSON.stringify(thanAnthropic(yeuCau, { maGoiApi: dong.maGoiApi, doNgauNhien })),
      },
    };
  },

  docTraLoi(json, { ma } = {}) {
    return tuAnthropic(json, { ma });
  },
};

export default nha;
