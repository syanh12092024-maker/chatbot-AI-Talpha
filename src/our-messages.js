// TIN CỦA CHÍNH BOT MÌNH — danh sách chuỗi CỐ ĐỊNH do code phát ra.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M05
//
// XUẤT XỨ (11/08/2026): đo trên 770 tin page thật, ba mẫu bị M05 nhận nhầm là
// "người thật đã tiếp quản" NHIỀU NHẤT lại chính là câu giữ chân của bot:
//    21 hội thoại · "One moment please — a team member will assist you shortly. 🙏"
//    15 hội thoại · "Sandali lang po / one moment — a team member will assist you…"
//    14 hội thoại · "Sandali lang po, may makakausap kayong team member namin agad. 🙏"
// 50/198 ca nhận nhầm (25%) chỉ từ BA chuỗi hardcode.
//
// Vì sao cửa `isOurs()` (đối chiếu Sổ AI) không đủ: Sổ AI chỉ lưu 80 ký tự đầu, chỉ mục
// giữ 30 tin gần nhất, và tra theo (page,cust) — hụt một nhịp là AI tự khoá chính mình.
// Chuỗi cố định thì KHÔNG CẦN tra gì cả: nó nằm ngay trong code, cứ so thẳng.
//
// ⚠️ Thêm chuỗi cố định mới nào cho khách thì PHẢI khai báo ở đây.

import { cleanText } from './text.js';

// Câu giữ chân khi bàn giao sale (handler.js → holdingMessage)
export const HOLDING_MESSAGES = [
  'Sandali lang po, may makakausap kayong team member namin agad. 🙏',
  'One moment please — a team member will assist you shortly. 🙏',
  'Sandali lang po / one moment — a team member will assist you shortly. 🙏',
];

// Câu closer trả khi hết vòng tool (closer.js)
export const CLOSER_FALLBACKS = [
  'Em cần hỗ trợ thêm từ đồng nghiệp, anh/chị chờ em chút nhé ạ.',
];

const norm = (s) => cleanText(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

// Chuỗi cố định + các câu mẫu Fast Lane đã dựng (đăng ký lúc chạy).
const fixed = new Set([...HOLDING_MESSAGES, ...CLOSER_FALLBACKS].map(norm).filter(Boolean));
const dynamic = new Set(); // câu mẫu Fast Lane dựng từ KB — khác nhau theo page

/** Fast Lane gọi mỗi khi dựng xong một câu mẫu, để M05 biết đó là tin của mình. */
export function registerOurMessage(text) {
  const n = norm(text);
  if (n && n.length >= 12) {
    dynamic.add(n);
    if (dynamic.size > 2000) { const it = dynamic.values(); for (let i = 0; i < 500; i++) dynamic.delete(it.next().value); }
  }
}

/** Tin này có phải do CHÍNH code mình phát ra không? */
export function isOurFixedMessage(text) {
  const n = norm(text);
  if (!n) return false;
  if (fixed.has(n) || dynamic.has(n)) return true;
  // Câu giữ chân hay bị nối thêm emoji/khoảng trắng → so theo tiền tố cũng được.
  for (const f of fixed) if (f.length >= 20 && (n.startsWith(f.slice(0, 40)) || f.startsWith(n.slice(0, 40)))) return true;
  return false;
}

export function ourMessageStats() { return { fixed: fixed.size, dynamic: dynamic.size }; }
