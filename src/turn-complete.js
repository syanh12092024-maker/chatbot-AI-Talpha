// M04 · NHẬN DIỆN "KHÁCH ĐÃ NÓI TRỌN Ý CHƯA"
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M04
//
// VÌ SAO CẦN — đo nhịp nhắn thật (287 khoảng cách, 80 hội thoại nhiều lượt AI nhất):
//     p50=18s · p75=37s · p90=77s
//     ≤5s 14,6% · ≤10s 32,8% · ≤20s 55,1% · ≤30s 69,0%
// Khách KHÔNG nhắn một mạch: 30,2% cụm có ≥2 tin, tối đa 8 tin cho một ý.
// Debounce cào bằng 20s chỉ phủ 55% → 45% còn lại bot ĐÃ CHEN NGANG giữa câu khách.
//
// Nhưng ~70% lượt khách chỉ nhắn ĐÚNG 1 TIN rồi chờ. Bắt cả 70% đó chờ lâu là giết
// tỷ lệ chốt (benchmark: mỗi 30s trễ ≈ −7%).
//
// → Không nâng ngưỡng cào bằng. PHÂN LOẠI trước, rồi mới quyết chờ bao lâu.
//   Chủ dự án chốt: trọn ý chờ 5s · còn dở chờ 15s. Ngắn hơn mức p85, nên bộ nhận
//   diện phải làm tốt phần việc của mình — đó là chỗ đáng đầu tư, không phải cái đồng hồ.
//
// LỆCH MỘT CHIỀU CÓ CHỦ Ý: không chắc thì coi là CÒN DỞ (chờ lâu hơn). Trả lời sớm khi
// khách chưa nói xong là chen ngang — mất thiện cảm và AI trả lời trượt ý.

import { cleanText } from './text.js';

// ── Dấu hiệu ĐÃ TRỌN Ý ──────────────────────────────────────────────────────
// Kết thúc bằng dấu câu kết. (Không tính dấu phẩy — đó là dấu hiệu còn dở.)
const END_PUNCT = /[.!?。！？؟…]\s*$/;
// Emoji đứng cuối thường là dấu chấm hết của người Philippines/Ả Rập khi chat.
const END_EMOJI = /[\p{Extended_Pictographic}]\s*$/u;

// ── Dấu hiệu CÒN DỞ ─────────────────────────────────────────────────────────
// Kết thúc bằng dấu nối / dấu hai chấm → chắc chắn còn viết tiếp.
const END_OPEN = /[,;:\-–—/+&]\s*$/;
// Kết bằng từ nối / giới từ → câu chưa xong.
const TRAILING_CONJ = /\b(and|or|but|with|for|to|of|in|at|on|my|the|a|an|is|are|na|ng|sa|ay|at|po ba|kung|kasi|pero|para|yung|ang|mga|من|في|و|مع)\s*$/i;
// Nhãn thông tin chưa có giá trị: "Name", "Address :", "Contact number -"
const BARE_LABEL = /^\s*(name|pangalan|full name|contact|contact number|number|phone|address|adres|tirahan|city|emirate|الاسم|العنوان|رقم)\s*[:\-–]?\s*$/i;

// Bất kỳ chuỗi số dài nào ĐỨNG MỘT MÌNH (SĐT, mã) — xem ghi chú ORDER_FRAGMENT.
const NUM_ONLY = /^\s*\+?[\d\s().-]{3,20}\s*$/;

// Câu hỏi trọn ý dù không có dấu "?" — mẫu hay gặp nhất trong log thật.
// ⚠️ CỐ Ý KHÔNG có chào hỏi và gật đầu ở đây — xem GREETING_ONLY/SHORT_ACK.
// `\b` KHÔNG dùng được ở đây: chữ Ả Rập không phải `\w` trong regex JS nên `\b` sau
// "السعر" không bao giờ khớp → "كم السعر" (hỏi giá) bị xếp nhầm là tin cụt.
const COMPLETE_INTENT = /^(how much|magkano|price|presyo|how to order|paano.*order|free shipping|cod|available|meron|kailan|ilang araw|كم السعر|السعر|بكم)(?=[\s?!.,]|$)/iu;

// ── BA MẪU SÓT CÓ QUY LUẬT, tìm ra khi chạy lại trên 1.354 tin khách thật ───
// (recall bản đầu chỉ 53,3%; ba mẫu này chiếm phần lớn ca bot chen ngang)

// ① CHÀO HỎI ĐỨNG MỘT MÌNH — khách chào xong mới hỏi việc chính.
//    Ca thật sót: "hello poh" → 8s sau khách nhắn tiếp.
const GREETING_ONLY = /^(hi+|hello+|helo+|hey+|hai|kumusta|kamusta|musta|salam|assalamualaikum|good (?:morning|afternoon|evening|day)|start|مرحبا|السلام عليكم|اهلا)([\s,.!]*(po|poh|ho|sir|maam|ma'?am))*[\s.!]*$/i;

// ② MẨU THÔNG TIN ĐƠN — khách gửi tên / SĐT / địa chỉ thành NHIỀU TIN RỜI.
//    Ca thật sót: "71566943" → 9s sau là "Celieta Boca".
//    Đây là khúc ĐẮT NHẤT của hội thoại (khách đang cho thông tin để chốt COD),
//    chen ngang ở đây là AI tạo đơn thiếu dữ liệu → phải chờ.
const ORDER_FRAGMENT = /^[\p{Lu}][\p{L}'-]+(\s+[\p{Lu}][\p{L}'-]+){0,3}$/u; // tên riêng 1–4 từ viết hoa

// ③ GẬT ĐẦU NGẮN — "Yes", "Ok. Mam" thường còn nói tiếp.
const SHORT_ACK = /^(ok+|okay|okey|oky|k|sige|yes+|yeah|yep|opo|oo|no+|nope|hindi|noted|sure|تمام|نعم|لا)([\s,.!]*(po|poh|mam|maam|ma'?am|sir|thanks?|thank you))*[\s.!]*$/i;

/**
 * Khách đã nói trọn ý chưa?
 * @param {string} text  Tin cuối của cụm (đã gộp thì truyền tin CUỐI CÙNG)
 * @returns {{complete:boolean, reason:string}}
 */
export function isCompleteThought(text) {
  const raw = cleanText(text || '').trim();
  const done = (reason) => ({ complete: true, reason });
  const more = (reason) => ({ complete: false, reason });

  // Sticker/ảnh không chữ: đo thật cho thấy khách hay gửi sticker RỒI mới gõ.
  if (!raw) return more('sticker/ảnh — khách thường gõ tiếp ngay sau');

  const words = raw.split(/\s+/).filter(Boolean);

  // ── CÒN DỞ (xét trước — lệch một chiều về phía chờ) ────────────────────────
  if (END_OPEN.test(raw)) return more('kết bằng dấu nối/hai chấm');
  if (BARE_LABEL.test(raw)) return more('nhãn thông tin chưa có giá trị');
  if (GREETING_ONLY.test(raw)) return more('mới chào, chưa vào việc');
  if (SHORT_ACK.test(raw)) return more('gật đầu ngắn, thường còn nói tiếp');
  if (NUM_ONLY.test(raw)) return more('chỉ có số — mẩu thông tin đơn, còn tên/địa chỉ');
  if (ORDER_FRAGMENT.test(raw) && words.length <= 4) return more('trông như tên riêng — mẩu thông tin đơn');
  if (TRAILING_CONJ.test(raw) && !END_PUNCT.test(raw)) return more('kết bằng từ nối');

  // ── TRỌN Ý ────────────────────────────────────────────────────────────────
  if (END_PUNCT.test(raw) && words.length >= 3) return done('câu đủ dài có dấu câu kết');
  if (COMPLETE_INTENT.test(raw)) return done('ý định trọn vẹn quen thuộc');
  if (words.length >= 7) return done('câu dài, nhiều khả năng đã trọn ý');
  if (words.length >= 4 && END_EMOJI.test(raw)) return done('câu vừa, kết bằng emoji');

  // ── Không rơi vào đâu → coi là CÒN DỞ ─────────────────────────────────────
  return more(`tin cụt ${words.length} từ, không dấu câu`);
}

// Chủ dự án chốt 11/08/2026: 5s / 15s. Đổi được bằng .env.
export const DEBOUNCE_DONE_MS = Number(process.env.DEBOUNCE_DONE_MS ?? 5000);
export const DEBOUNCE_MORE_MS = Number(process.env.DEBOUNCE_MORE_MS ?? 15000);

/** Chờ bao lâu trước khi trả lời cụm này. */
export function debounceFor(text) {
  const v = isCompleteThought(text);
  return { ms: v.complete ? DEBOUNCE_DONE_MS : DEBOUNCE_MORE_MS, ...v };
}
