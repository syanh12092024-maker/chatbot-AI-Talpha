// MỘT HÌNH DẠNG DUY NHẤT — HÌNH DẠNG ANTHROPIC — L1-M4a
//
// `closer.js` · `tools.js` · `classifier.js` (1.962 dòng, DÙNG NGUYÊN, KHÔNG SỬA) đang nói
// chuyện bằng hình dạng `messages.create` của Anthropic. Nên hình dạng chuẩn của lớp model
// LÀ hình dạng đó, và họ OpenAI (OpenAI · DeepSeek) phải được dịch qua lại ở đây.
//
// VÀO  (chuẩn):
//   { system, messages:[{role,content}], max_tokens, temperature, tools, tool_choice, stop_sequences }
// RA   (chuẩn):
//   { id, model, role:'assistant',
//     content:[{type:'text',text} | {type:'tool_use',id,name,input}],
//     stop_reason:'end_turn'|'max_tokens'|'tool_use'|'stop_sequence',
//     usage:{ input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } }
//
// File này KHÔNG gọi mạng và KHÔNG biết khoá. Nhờ vậy test dịch hai chiều chạy được mà
// không cần tài khoản của nhà nào.

import { LoiThamSo } from './loi.js';

/**
 * Trần token mặc định khi nơi gọi quên `max_tokens`.
 * Anthropic BẮT BUỘC có `max_tokens`, thiếu là 400 — thà đặt trần an toàn còn hơn để lời
 * gọi chết ở nhà cung cấp. 1024 là mức cũ của `closer.js` trước khi hạ xuống 400.
 */
export const MAC_DINH_MAX_TOKENS = 1024;

const soDuong = (x, mac) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : mac);

// ---- KIỂM YÊU CẦU ------------------------------------------------------------------

/** Yêu cầu tối thiểu phải có `messages` là mảng không rỗng. */
export function batBuocYeuCau(yeuCau) {
  if (!yeuCau || typeof yeuCau !== 'object') throw new LoiThamSo('Thiếu `yeuCau`.');
  if (!Array.isArray(yeuCau.messages) || yeuCau.messages.length === 0) {
    throw new LoiThamSo('`yeuCau.messages` phải là mảng không rỗng.');
  }
  return yeuCau;
}

// ---- CHIỀU ĐI · HỌ ANTHROPIC -------------------------------------------------------

/**
 * Dựng thân yêu cầu cho họ Anthropic (Claude, Kimi qua endpoint /anthropic).
 * Gần như chép thẳng — chỉ đóng đinh `model`, `max_tokens`, `temperature` và ghép `them`.
 * @param {object} yeuCau hình dạng Anthropic
 * @param {{maGoiApi:string, doNgauNhien:number, them?:object}} o
 */
export function thanAnthropic(yeuCau, { maGoiApi, doNgauNhien, them = {} }) {
  batBuocYeuCau(yeuCau);
  const than = {
    model: maGoiApi,
    max_tokens: soDuong(yeuCau.max_tokens, MAC_DINH_MAX_TOKENS),
    messages: yeuCau.messages,
    // LUÔN gửi độ ngẫu nhiên. Bản đang chạy KHÔNG đặt trường này nên bot mỗi lượt một
    // kiểu, khó bám kịch bản và khó A/B (01-QUYET-DINH.md mục 12).
    temperature: doNgauNhien,
  };
  if (yeuCau.system != null) than.system = yeuCau.system;
  if (Array.isArray(yeuCau.tools) && yeuCau.tools.length) than.tools = yeuCau.tools;
  if (yeuCau.tool_choice != null) than.tool_choice = yeuCau.tool_choice;
  if (Array.isArray(yeuCau.stop_sequences) && yeuCau.stop_sequences.length) {
    than.stop_sequences = yeuCau.stop_sequences;
  }
  return { ...than, ...them };
}

/** Chuẩn hoá câu trả lời họ Anthropic — chỉ lấp bốn ô `usage` còn thiếu cho đủ hình dạng. */
export function tuAnthropic(json, { ma } = {}) {
  const j = json || {};
  const u = j.usage || {};
  const so = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
  return {
    ...j,
    id: j.id ?? null,
    model: ma || j.model || null,
    role: j.role || 'assistant',
    content: Array.isArray(j.content) ? j.content : [],
    stop_reason: j.stop_reason ?? 'end_turn',
    usage: {
      input_tokens: so(u.input_tokens),
      output_tokens: so(u.output_tokens),
      cache_read_input_tokens: so(u.cache_read_input_tokens),
      cache_creation_input_tokens: so(u.cache_creation_input_tokens),
    },
  };
}

// ---- CHIỀU ĐI · HỌ OPENAI ----------------------------------------------------------

/** Khối `image` kiểu Anthropic → phần `image_url` kiểu OpenAI. */
function anhSangOpenAI(khoi) {
  const s = khoi.source || {};
  if (s.type === 'url') return { type: 'image_url', image_url: { url: s.url } };
  return { type: 'image_url', image_url: { url: `data:${s.media_type || 'image/jpeg'};base64,${s.data || ''}` } };
}

/**
 * Mảng khối nội dung → nội dung kiểu OpenAI.
 * Chỉ có chữ thì trả về CHUỖI (mọi máy chủ tương thích OpenAI đều nhận); có ảnh thì trả
 * về mảng `parts`.
 */
export function noiDungSangOpenAI(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);
  const coAnh = content.some((b) => b && b.type === 'image');
  if (!coAnh) {
    return content.filter((b) => b && b.type === 'text').map((b) => b.text ?? '').join('\n');
  }
  return content
    .filter((b) => b && (b.type === 'text' || b.type === 'image'))
    .map((b) => (b.type === 'image' ? anhSangOpenAI(b) : { type: 'text', text: b.text ?? '' }));
}

/** Nội dung của một khối `tool_result` → chuỗi (OpenAI chỉ nhận chuỗi ở tin `role:'tool'`). */
function ketQuaCongCuSangChuoi(noiDung) {
  if (noiDung == null) return '';
  if (typeof noiDung === 'string') return noiDung;
  if (Array.isArray(noiDung)) {
    return noiDung.map((b) => (b && b.type === 'text' ? b.text : JSON.stringify(b))).join('\n');
  }
  return JSON.stringify(noiDung);
}

/** Một tin kiểu Anthropic → một HOẶC NHIỀU tin kiểu OpenAI (tool_result tách ra thành tin riêng). */
function tinSangOpenAI(tin, ra) {
  const role = tin?.role;
  const content = tin?.content;

  if (role === 'assistant') {
    const khoi = Array.isArray(content) ? content : [{ type: 'text', text: String(content ?? '') }];
    const goiCongCu = khoi
      .filter((b) => b && b.type === 'tool_use')
      .map((b) => ({
        id: b.id,
        type: 'function',
        function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
      }));
    const chu = khoi.filter((b) => b && b.type === 'text').map((b) => b.text ?? '').join('\n');
    const m = { role: 'assistant', content: chu || null };
    if (goiCongCu.length) m.tool_calls = goiCongCu;
    ra.push(m);
    return;
  }

  if (role === 'user' && Array.isArray(content)) {
    // Khối `tool_result` nằm trong tin của user ở hình dạng Anthropic, nhưng ở họ OpenAI
    // nó là một VAI RIÊNG (`role:'tool'`). Mỗi kết quả một tin, và phải đứng TRƯỚC phần
    // chữ còn lại thì máy chủ mới ghép được với `tool_calls` của lượt trước.
    const ketQua = content.filter((b) => b && b.type === 'tool_result');
    for (const b of ketQua) {
      ra.push({ role: 'tool', tool_call_id: b.tool_use_id, content: ketQuaCongCuSangChuoi(b.content) });
    }
    const conLai = content.filter((b) => b && b.type !== 'tool_result');
    if (conLai.length) ra.push({ role: 'user', content: noiDungSangOpenAI(conLai) });
    if (!ketQua.length && !conLai.length) ra.push({ role: 'user', content: '' });
    return;
  }

  ra.push({ role: role || 'user', content: noiDungSangOpenAI(content) });
}

/** `system` kiểu Anthropic (chuỗi hoặc mảng khối) → chuỗi. */
export function heThongSangChuoi(system) {
  if (system == null) return '';
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) return system.filter((b) => b && b.type === 'text').map((b) => b.text ?? '').join('\n');
  return String(system);
}

/** Công cụ kiểu Anthropic → hàm kiểu OpenAI. */
export function congCuSangOpenAI(tools) {
  return (tools || []).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema ?? { type: 'object', properties: {} },
    },
  }));
}

/** Hàm kiểu OpenAI → công cụ kiểu Anthropic. Có để CHỨNG MINH dịch không mất mát (test round-trip). */
export function congCuTuOpenAI(hams) {
  return (hams || []).map((h) => {
    const f = h.function ?? h;
    return {
      name: f.name,
      description: f.description ?? '',
      input_schema: f.parameters ?? { type: 'object', properties: {} },
    };
  });
}

/** `tool_choice` kiểu Anthropic → kiểu OpenAI. */
export function chonCongCuSangOpenAI(chon) {
  if (chon == null) return undefined;
  if (typeof chon === 'string') return chon;
  switch (chon.type) {
    case 'auto': return 'auto';
    case 'any': return 'required';
    case 'none': return 'none';
    case 'tool': return { type: 'function', function: { name: chon.name } };
    default: return 'auto';
  }
}

/**
 * Dựng thân yêu cầu cho họ OpenAI (OpenAI · DeepSeek).
 * @param {object} yeuCau hình dạng Anthropic
 * @param {{maGoiApi:string, doNgauNhien:number, them?:object}} o
 */
export function sangOpenAI(yeuCau, { maGoiApi, doNgauNhien, them = {} }) {
  batBuocYeuCau(yeuCau);
  const messages = [];
  const heThong = heThongSangChuoi(yeuCau.system);
  // `system` của Anthropic là một TRƯỜNG RIÊNG; ở họ OpenAI nó là TIN ĐẦU của mảng.
  if (heThong) messages.push({ role: 'system', content: heThong });
  for (const tin of yeuCau.messages) tinSangOpenAI(tin, messages);

  const than = {
    model: maGoiApi,
    messages,
    max_tokens: soDuong(yeuCau.max_tokens, MAC_DINH_MAX_TOKENS),
    temperature: doNgauNhien,
  };
  if (Array.isArray(yeuCau.tools) && yeuCau.tools.length) than.tools = congCuSangOpenAI(yeuCau.tools);
  const chon = chonCongCuSangOpenAI(yeuCau.tool_choice);
  if (chon !== undefined && than.tools) than.tool_choice = chon;
  if (Array.isArray(yeuCau.stop_sequences) && yeuCau.stop_sequences.length) {
    than.stop = yeuCau.stop_sequences;
  }
  return { ...than, ...them };
}

// ---- CHIỀU VỀ · HỌ OPENAI ----------------------------------------------------------

/** `finish_reason` họ OpenAI → `stop_reason` họ Anthropic. */
export function lyDoDungTuOpenAI(finishReason) {
  switch (finishReason) {
    case 'length': return 'max_tokens';
    case 'tool_calls':
    case 'function_call': return 'tool_use';
    case 'stop':
    default: return 'end_turn';
  }
}

/**
 * Câu trả lời họ OpenAI → hình dạng Anthropic.
 *
 * BẪY ĐẾM TOKEN — đọc kỹ trước khi sửa:
 * Anthropic báo `input_tokens` KHÔNG kể phần trúng cache (`cache_read_input_tokens` là ô
 * riêng), còn OpenAI báo `prompt_tokens` ĐÃ GỒM `cached_tokens`. Bê thẳng sang là đếm
 * phần cache HAI LẦN, và vì giá vào đắt gấp 10 lần giá đọc cache nên tiền tính ra sẽ
 * phồng lên rất nhiều. Nên ở đây phải TRỪ ra.
 */
export function tuOpenAI(json, { ma } = {}) {
  const j = json || {};
  const chon = (j.choices && j.choices[0]) || {};
  const tin = chon.message || {};
  const content = [];

  const chu = typeof tin.content === 'string'
    ? tin.content
    : Array.isArray(tin.content)
      ? tin.content.filter((p) => p && p.type === 'text').map((p) => p.text ?? '').join('')
      : '';
  if (chu) content.push({ type: 'text', text: chu });

  for (const g of tin.tool_calls || []) {
    const f = g.function || {};
    let input = {};
    // `arguments` là CHUỖI JSON. Model đôi khi trả chuỗi hỏng — hỏng thì giữ nguyên văn
    // trong `_tho` để tầng trên còn thấy mà chẩn, thay vì ném cả lượt đi.
    try { input = f.arguments ? JSON.parse(f.arguments) : {}; } catch { input = { _tho: String(f.arguments) }; }
    content.push({ type: 'tool_use', id: g.id, name: f.name, input });
  }

  const u = j.usage || {};
  const so = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
  // DeepSeek đặt tên khác OpenAI: `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`.
  const cacheDoc = so(u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0);
  const vao = u.prompt_cache_miss_tokens != null
    ? so(u.prompt_cache_miss_tokens)
    : Math.max(0, so(u.prompt_tokens) - cacheDoc);

  return {
    id: j.id ?? null,
    model: ma || j.model || null,
    role: 'assistant',
    content,
    stop_reason: lyDoDungTuOpenAI(chon.finish_reason),
    usage: {
      input_tokens: vao,
      output_tokens: so(u.completion_tokens),
      cache_read_input_tokens: cacheDoc,
      // Họ OpenAI không tính tiền ghi cache riêng (cache tự động, không tính phí ghi) →
      // luôn 0. Đừng suy ra số nào khác: 0 ở đây là SỰ THẬT, không phải thiếu dữ liệu.
      cache_creation_input_tokens: 0,
    },
  };
}
