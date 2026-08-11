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

// Câu giữ chân khi bàn giao sale.
// ⚠️ BOT KHÔNG CÒN GỬI BA CÂU NÀY (bỏ 11/08/2026, xem `handler.js` mục "KHÔNG CÒN CÂU
// GIỮ CHÂN") — nhưng danh sách PHẢI GIỮ LẠI: lịch sử Pancake còn đầy tin cũ do chính bot
// gửi, xoá đi là M05 gặp lại chúng và tưởng người thật đã tiếp quản, tự khoá hội thoại.
export const HOLDING_MESSAGES = [
  'Sandali lang po, may makakausap kayong team member namin agad. 🙏',
  'One moment please — a team member will assist you shortly. 🙏',
  'Sandali lang po / one moment — a team member will assist you shortly. 🙏',
];

// Câu giữ chân HẬU BÁN của M13 (post-sale.js → holdingPostSale, đã xoá 11/08/2026).
// Chín chuỗi này CHƯA TỪNG được khai ở đây dù quy tắc ⚠️ phía trên bắt buộc — tức M05 vốn
// đã có thể nhận nhầm chúng là người thật. Bot không phát nữa, nhưng lịch sử Pancake còn
// nguyên, nên khai ở đây để đóng luôn lỗ đó.
export const LEGACY_POSTSALE_HOLDING = [
  'Naku, pasensya na po sa abala. 🙏 Ipapasa ko po agad kayo sa team namin para maayos ito ngayon din.',
  'Pasensya na po sa paghihintay. 🙏 Icheck po namin agad ang delivery ninyo at may makakausap kayong team member namin.',
  'Sandali lang po, icheck po namin ang order ninyo at ibabalita agad ng team namin. 🙏',
  'I\'m so sorry about that. 🙏 I\'m passing this to our team right now so they can fix it for you.',
  'Sorry for the wait. 🙏 We\'re checking your delivery now and a team member will get back to you shortly.',
  'One moment please — we\'re checking your order and our team will update you shortly. 🙏',
  'نعتذر جداً عن هذا. 🙏 حولت طلبك للفريق المختص الآن ليتم حله فوراً.',
  'نعتذر عن التأخير. 🙏 نتحقق من الشحنة الآن وسيتواصل معك أحد الفريق قريباً.',
  'لحظة من فضلك — نتحقق من طلبك وسيوافيك الفريق بالتحديث. 🙏',
];

// Câu closer trả khi hết vòng tool (closer.js)
export const CLOSER_FALLBACKS = [
  'Em cần hỗ trợ thêm từ đồng nghiệp, anh/chị chờ em chút nhé ạ.',
];

const norm = (s) => cleanText(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

// Chuỗi cố định + các câu mẫu Fast Lane đã dựng (đăng ký lúc chạy).
const fixed = new Set([...HOLDING_MESSAGES, ...LEGACY_POSTSALE_HOLDING, ...CLOSER_FALLBACKS].map(norm).filter(Boolean));
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
