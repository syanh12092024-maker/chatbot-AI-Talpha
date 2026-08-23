// NHÀ OPENAI — L1-M4a
//
// Không cùng hình dạng với Anthropic, nên MỌI thứ đi qua `chuan-hoa.js`: `system` thành
// tin đầu, `tools` thành `functions`, `tool_calls` thành khối `tool_use`, `finish_reason`
// thành `stop_reason`, và `cached_tokens` phải TRỪ khỏi `prompt_tokens` (xem ghi chú
// "BẪY ĐẾM TOKEN" trong `chuan-hoa.js`).
//
// CHƯA MỞ TÀI KHOẢN nhà này (01-QUYET-DINH.md mục 7) — đơn giá trong `bang-model.js` là
// số SUY NGƯỢC, và `maGoiApi` chưa từng được một lời gọi thật xác nhận.

import { sangOpenAI, tuOpenAI } from '../chuan-hoa.js';

export const nha = {
  ma: 'openai',
  ten: 'OpenAI',
  ho: 'openai',
  baseUrlMacDinh: 'https://api.openai.com',
  duongDan: '/v1/chat/completions',

  dungGoi({ dong, khoa, yeuCau, doNgauNhien, baseUrl }) {
    const goc = String(baseUrl || nha.baseUrlMacDinh).replace(/\/+$/, '');
    return {
      url: goc + nha.duongDan,
      tuyChon: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${khoa}`,
        },
        body: JSON.stringify(sangOpenAI(yeuCau, { maGoiApi: dong.maGoiApi, doNgauNhien })),
      },
    };
  },

  docTraLoi(json, { ma } = {}) {
    return tuOpenAI(json, { ma });
  },
};

export default nha;
