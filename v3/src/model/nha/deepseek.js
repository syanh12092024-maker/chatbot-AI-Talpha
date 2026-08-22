// NHÀ DEEPSEEK — L1-M4a
//
// Điểm cuối tương thích OpenAI, nên dùng chung bộ dịch ở `chuan-hoa.js`. Khác OpenAI đúng
// một chỗ đã xử ở đó: DeepSeek báo cache bằng `prompt_cache_hit_tokens` /
// `prompt_cache_miss_tokens` thay vì `prompt_tokens_details.cached_tokens`.
//
// CHƯA MỞ TÀI KHOẢN nhà này (01-QUYET-DINH.md mục 7) — đơn giá trong `bang-model.js` là
// số SUY NGƯỢC, lấy theo mức NGOÀI CAO ĐIỂM; giờ cao điểm đắt hơn.

import { sangOpenAI, tuOpenAI } from '../chuan-hoa.js';

export const nha = {
  ma: 'deepseek',
  ten: 'DeepSeek',
  ho: 'openai',
  baseUrlMacDinh: 'https://api.deepseek.com',
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
