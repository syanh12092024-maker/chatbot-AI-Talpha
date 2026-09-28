// BẢN CHO MÁY bằng TIẾNG ANH GỌN — dịch MỘT lần lúc marketer lưu kịch bản (BH8, 28/09).
//
// Vì sao: Kimi đếm thật kịch bản Minty (tiếng Việt) ~1.560 token, CORE tiếng Việt 4.331 —
// ước theo ký tự chỉ bằng một nửa. Tiếng Việt tốn ~2× token cho cùng một luật. Marketer
// vẫn viết/đọc tiếng Việt (`noi_dung_nguoi`); model đọc bản tiếng Anh (`noi_dung_may`).
//
// ⛔ BA RÀO — thiếu rào nào cũng là một prompt khác cái marketer đã duyệt:
//   ① GIỮ NGUYÊN VĂN: mọi con số, giá, URL, và mọi câu trong ngoặc KHÔNG phải tiếng Việt
//      (câu gửi khách — Tagalog/English). `kiemGiuNguyenVan` đo; lệch là KHÔNG dùng bản dịch.
//   ② DẤU NHẬN: bản dịch mở bằng `DAU_BAN_MAY`. Bộ ráp prompt chỉ dùng `noi_dung_may` khi có
//      dấu này — bản máy kiểu cũ (dựng khuôn tiếng Việt) và bản lỗi đều rơi về đường cũ.
//   ③ LÙI AN TOÀN: model lỗi / dịch rỗng / kiểm lệch ⇒ trả bản TIẾNG VIỆT dựng khuôn như
//      trước BH8, kèm `lyDo`. Không bao giờ chặn marketer lưu vì bộ dịch hỏng.

export const DAU_BAN_MAY = '<!-- ban-may:en v1 -->';

/** `noi_dung_may` này có phải bản dịch tiếng Anh đã qua kiểm không? */
export const laBanMayEn = (text) => String(text || '').startsWith(DAU_BAN_MAY);

/** Thân bản dịch — bỏ dấu nhận (model không cần đọc nó). */
export const thanBanMay = (text) => String(text || '').slice(DAU_BAN_MAY.length).replace(/^\s*\n/, '');

// Chữ cái CHỈ tiếng Việt có (Tagalog/English không dùng). Câu trong ngoặc chứa chúng là
// nhãn nội bộ («chốt đơn») — được dịch; câu không chứa là câu gửi khách — phải giữ nguyên.
const CHU_VIET = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯ]/;
const NGOAC = /"([^"\n]{2,400})"|«([^»\n]{2,400})»|“([^”\n]{2,400})”/g;
const SO = /\d+(?:[.,]\d+)*/g;
const URL = /\b(?:https?:\/\/|wa\.me\/|www\.)\S+/gi;

function tapNguyenVan(text) {
  const t = String(text || '');
  const ngoac = [];
  for (const m of t.matchAll(NGOAC)) {
    const cau = (m[1] || m[2] || m[3] || '').trim();
    if (cau && !CHU_VIET.test(cau)) ngoac.push(cau);
  }
  return {
    so: [...new Set(t.match(SO) || [])],
    url: [...new Set((t.match(URL) || []).map((u) => u.replace(/[).,;]+$/, '')))],
    ngoac: [...new Set(ngoac)],
  };
}

/**
 * Bản dịch có giữ nguyên văn mọi thứ phải giữ không?
 * Số so HAI CHIỀU — bản dịch THÊM một con số (bịa giá, bịa hạn khuyến mãi) cũng là lệch.
 * @returns {{ok:boolean, thieu:string[], thua:string[]}}
 */
export function kiemGiuNguyenVan(vi, en) {
  const a = tapNguyenVan(vi);
  const b = tapNguyenVan(en);
  const enChu = String(en || '');
  const thieu = [
    ...a.so.filter((x) => !b.so.includes(x)).map((x) => `số ${x}`),
    ...a.url.filter((x) => !enChu.includes(x)).map((x) => `url ${x}`),
    ...a.ngoac.filter((x) => !enChu.includes(x)).map((x) => `câu «${x.slice(0, 60)}»`),
  ];
  const thua = b.so.filter((x) => !a.so.includes(x)).map((x) => `số ${x}`);
  return { ok: !thieu.length && !thua.length, thieu, thua };
}

const LENH_DICH = `You translate Vietnamese internal instructions for a Messenger sales chatbot into concise English.
Rules:
- Keep EVERY rule and step; drop only filler words. Keep the same order and line structure.
- Copy VERBATIM, character for character: every text inside quotes ("…", «…», “…”) that is not Vietnamese (these are messages sent to customers in English/Tagalog/Arabic), every number, price, currency, URL, phone number and package name.
- Quoted Vietnamese labels may be translated.
- Do not add numbers, prices, promises or rules that are not in the source.
- Output ONLY the translated text. No preface, no notes, no markdown fences.`;

/**
 * Dịch bản khuôn tiếng Việt sang bản máy tiếng Anh.
 * @param {string} vi  bản khuôn tiếng Việt (đầu ra của `dungBanChoMay`)
 * @param {{goi:(req:object)=>Promise<{content:Array}>}} deps  `goi` = `client.messages.create`
 * @returns {Promise<{text:string, ngonNgu:'en'|'vi', lyDo:string}>}
 */
export async function dichBanMay(vi, { goi } = {}) {
  const nguon = String(vi || '').trim();
  if (!nguon) return { text: '', ngonNgu: 'vi', lyDo: 'bản nguồn rỗng' };
  if (typeof goi !== 'function') return { text: nguon, ngonNgu: 'vi', lyDo: 'chưa nối model dịch' };
  let en = '';
  try {
    const res = await goi({
      max_tokens: 3000,
      temperature: 0,
      system: LENH_DICH,
      messages: [{ role: 'user', content: nguon }],
    });
    en = (res?.content || []).filter((b) => b?.type === 'text').map((b) => b.text).join('\n').trim();
  } catch (e) {
    return { text: nguon, ngonNgu: 'vi', lyDo: `model dịch lỗi: ${String(e?.message || e).slice(0, 160)}` };
  }
  if (!en) return { text: nguon, ngonNgu: 'vi', lyDo: 'model trả bản dịch rỗng' };
  const k = kiemGiuNguyenVan(nguon, en);
  if (!k.ok) {
    return { text: nguon, ngonNgu: 'vi', lyDo: `bản dịch lệch nguyên văn — thiếu: ${k.thieu.join('; ') || '0'} · thừa: ${k.thua.join('; ') || '0'}` };
  }
  return { text: `${DAU_BAN_MAY}\n${en}`, ngonNgu: 'en', lyDo: '' };
}
