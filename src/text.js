// LÀM SẠCH CHUỖI TRƯỚC KHI GỬI CLAUDE — chống 2 lỗi từng làm khách KHÔNG được trả lời:
//
//  ① "no low surrogate in string" — emoji trong JS là CẶP 2 mã (surrogate pair). Cắt chuỗi cho
//     ngắn có thể chém đôi cặp đó, để lại nửa mã vô nghĩa → JSON body hỏng → Claude trả 400.
//  ② "user messages must have non-empty content" — tin chỉ có ảnh/sticker (hoặc bị dọn sạch ở ①)
//     thành chuỗi rỗng → API từ chối cả lượt.
//
// Cả hai đều bị xếp loại invalid_request_error = "không tự hồi phục" nên bot KHÔNG thử lại
// → khách ngồi im tới khi lỗi lặp 3 lần mới được đẩy sang sale. Vì vậy phải chặn từ gốc.

//  ③ '<div></div>' — khách gửi sticker/ảnh KHÔNG kèm chữ thì Pancake trả về đúng chuỗi HTML rỗng
//     này. Nó KHÔNG rỗng nên lọt qua mọi cửa canh sẵn có, tới thẳng bộ phân loại và bị gán nhãn
//     'complaint' → khách bị đẩy sang sale dù chưa nói câu nào. Đo ngày 07/08/2026: 50/562 tin của
//     khách (8,9%) là '<div></div>'. Bóc thẻ HTML ở đây để hai cửa canh SẴN CÓ làm đúng việc:
//     classifier trả 'question', handler thay bằng '(khách gửi ảnh/sticker)'.
//     Chỉ bóc đúng danh sách thẻ đã biết — KHÔNG dùng /<[^>]*>/g, kẻo nuốt luôn chữ của khách
//     kiểu "giá <100> AED".
const HTML_TAG = /<\/?(?:div|span|p|br|hr|b|i|u|em|strong|a|img|ul|ol|li|font|table|tr|td)\b[^>]*>/gi;
export function stripHtml(str) {
  return String(str == null ? '' : str)
    .replace(HTML_TAG, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
    .replace(/[ \t]{2,}/g, ' ');
}

// XOÁ nửa cặp thay thế mồ côi (nửa emoji). MỘT cách xử lý nửa cặp lẻ cho cả repo — `cleanText`, `catChu`, `jsonLanh` đều đi qua
// đây. Cố ý KHÔNG dùng `toWellFormed()` (thay bằng U+FFFD «�»): hai cách cho một bệnh là hai thứ để người sau phải đoán (GL8 ②1).
export function boNuaCapLe(str) {
  return String(str == null ? '' : str)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

// Xoá mã surrogate mồ côi (nửa emoji) + bóc thẻ HTML. Cắt trước, dọn sau — đúng thứ tự này mới an toàn.
export function cleanText(str, max) {
  let s = String(str == null ? '' : str);
  if (max) s = s.slice(0, max);
  return stripHtml(boNuaCapLe(s));
}

// CẮT CHỮ ĐỂ GHI SỔ (GL8). `slice(0, N)` cắt theo đơn vị UTF-16: đơn vị thứ N là nửa đầu của 📦 thì chuỗi mang nửa cặp, và
// `JSON.stringify` giữ nguyên nó thành chữ ASCII `\ud83d` ⇒ Postgres jsonb từ chối CẢ câu INSERT. Đo 09/10 (giả lập pilot): câu bot
// 201 đơn vị ghi `so_ai.du_lieu.text = slice(0, 200)` SAU khi đã gửi ⇒ worker đánh lượt `loi` và giao khách cho sale dù bot vừa trả
// lời đúng. Hàm này cắt tối đa `max` đơn vị rồi xoá nửa cặp lẻ (nửa đầu bị chém ở cuối = cắt lùi một đơn vị). Chuỗi lành ⇒ y hệt
// `slice`. Chỉ dùng cho chữ GHI SỔ — chữ GỬI KHÁCH không bao giờ đi qua đây.
export function catChu(str, max) {
  return boNuaCapLe(String(str == null ? '' : str).slice(0, max));
}

// LƯỚI CỬA GHI JSONB (GL8 ②2): `JSON.stringify` mà làm lành TỪNG CHUỖI giá trị TRƯỚC khi mã hoá (qua `replacer`). Dọn SAU stringify
// là vô tác dụng — lúc đó nửa cặp đã thành sáu chữ ASCII `\ud83d`. Tên khoá không đi qua replacer: khoá là hằng của mã, không phải
// chữ khách. Dữ liệu lành ⇒ ra y hệt `JSON.stringify`.
export function jsonLanh(giaTri) {
  return JSON.stringify(giaTri, (_k, v) => (typeof v === 'string' ? boNuaCapLe(v) : v));
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
