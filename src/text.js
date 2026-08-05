// LÀM SẠCH CHUỖI TRƯỚC KHI GỬI CLAUDE — chống 2 lỗi từng làm khách KHÔNG được trả lời:
//
//  ① "no low surrogate in string" — emoji trong JS là CẶP 2 mã (surrogate pair). Cắt chuỗi cho
//     ngắn có thể chém đôi cặp đó, để lại nửa mã vô nghĩa → JSON body hỏng → Claude trả 400.
//  ② "user messages must have non-empty content" — tin chỉ có ảnh/sticker (hoặc bị dọn sạch ở ①)
//     thành chuỗi rỗng → API từ chối cả lượt.
//
// Cả hai đều bị xếp loại invalid_request_error = "không tự hồi phục" nên bot KHÔNG thử lại
// → khách ngồi im tới khi lỗi lặp 3 lần mới được đẩy sang sale. Vì vậy phải chặn từ gốc.

// Xoá mã surrogate mồ côi (nửa emoji). Cắt trước, dọn sau — đúng thứ tự này mới an toàn.
export function cleanText(str, max) {
  let s = String(str == null ? '' : str);
  if (max) s = s.slice(0, max);
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

// Có nửa emoji trong chuỗi không? (dùng để log cảnh báo khi lớp chặn cuối phải ra tay)
export function hasLoneSurrogate(str) {
  const s = String(str == null ? '' : str);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) { const n = s.charCodeAt(i + 1); if (!(n >= 0xDC00 && n <= 0xDFFF)) return true; i++; }
    else if (c >= 0xDC00 && c <= 0xDFFF) return true;
  }
  return false;
}

const PLACEHOLDER = '(khách gửi ảnh/sticker)';

// Dọn 1 khối nội dung: chuỗi thuần, hoặc mảng block (text / tool_use / tool_result).
function cleanBlock(b) {
  if (typeof b === 'string') return cleanText(b);
  if (!b || typeof b !== 'object') return b;
  if (b.type === 'text') return { ...b, text: cleanText(b.text) };
  if (b.type === 'tool_result') {
    const c = typeof b.content === 'string' ? cleanText(b.content) : Array.isArray(b.content) ? b.content.map(cleanBlock) : b.content;
    // tool_result rỗng cũng bị API từ chối → luôn để lại một câu.
    return { ...b, content: (typeof c === 'string' && !c.trim()) ? '(không có nội dung)' : c };
  }
  if (b.type === 'tool_use') return b; // input là object của model, không cắt chuỗi nên an toàn
  return b;
}

// LỚP CHẶN CUỐI: gọi ngay trước mỗi lần gửi lên Claude.
// Trả về mảng messages đã sạch surrogate và KHÔNG còn lượt rỗng.
// KHÔNG xoá message (xoá giữa chừng sẽ phá cặp tool_use ↔ tool_result) — chỉ thay nội dung rỗng.
export function sanitizeMessages(messages) {
  let fixed = 0;
  const out = (messages || []).map((m) => {
    const content = Array.isArray(m.content) ? m.content.map(cleanBlock) : cleanText(m.content);
    if (Array.isArray(m.content) ? false : hasLoneSurrogate(m.content)) fixed++;
    if (typeof content === 'string' && !content.trim()) {
      return { ...m, content: m.role === 'assistant' ? '...' : PLACEHOLDER };
    }
    if (Array.isArray(content) && content.length === 0) {
      return { ...m, content: m.role === 'assistant' ? '...' : PLACEHOLDER };
    }
    return { ...m, content };
  });
  return { messages: out, fixed };
}

// System prompt cũng đi trong cùng JSON body → cũng phải sạch (chuỗi hoặc mảng block có cache_control).
export function sanitizeSystem(system) {
  if (typeof system === 'string') return cleanText(system);
  if (Array.isArray(system)) return system.map((b) => (b && b.type === 'text' ? { ...b, text: cleanText(b.text) } : b));
  return system;
}
