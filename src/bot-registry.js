// SỔ NHẬN DIỆN TIN MÁY — dùng chung cho M05 (ai đang nói) và M07 (lọc rác khỏi lịch sử).
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M05, § M07
//
// Vì sao cần: đo 10/08/2026 trên 60 hội thoại có AI (779 tin do page gửi)
//   · 75% hội thoại có CẢ AI lẫn template Botcake → hai bot nói chồng lên nhau
//   · 12,8% tin page gửi là template cứng
// Muốn biết "người thật đã vào chat chưa" thì trước hết phải biết "tin nào là của máy".
//
// Mẫu dưới đây LẤY NGUYÊN VĂN từ tin thật trên page đang chạy. Thêm mẫu mới qua
// botcake-templates.json (M18 sẽ cho sửa từ dashboard) — không cần sửa code.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'botcake-templates.json');

// Ký tự vô hình: chỉ công cụ tự động mới chèn (né bộ lọc trùng lặp của Meta).
// Người thật gõ tay không bao giờ có.
//   ⚠️ Bản đầu chỉ quét U+E0000–E007F (Tag characters) → BẮT HỤT HOÀN TOÀN.
//   Đo thật 11/08/2026 trên 770 tin page: 0 tin dùng dải đó, 22 tin dùng
//   U+E0100–E01EF (Variation Selectors Supplement). Phải phủ cả hai dải.
const INVISIBLE_TAG = /[\u{E0000}-\u{E01EF}]/u;

// Chữ "kiểu cách" (Mathematical Alphanumeric Symbols) — 𝑺𝑷𝑬𝑪𝑰𝑨𝑳 𝗢𝗙𝗙…
// Không ai gõ tay kiểu này trên điện thoại; chỉ template marketing mới có.
const STYLED_UNICODE = /[\u{1D400}-\u{1D7FF}]/u;

// Mẫu mặc định — trích từ tin THẬT trên Kreain Nature PH-Ksa, Mint Breeze KSA,
// Lucky Charm House, Golden Soap House… (kéo từ Pancake 10/08/2026)
const DEFAULT_PATTERNS = [
  // — kịch bản xin thông tin giao hàng
  'please provide the information below for the shipping',
  'to ensure fast and accurate delivery',
  'for address please make it as detailed as possible',
  // — thông báo đơn / vận chuyển
  'your order is \\d+\\s*(sar|aed|kwd|qar|omr|bhd)',
  'you will receive this gift in the next',
  'your order has been created',
  'your order number:',
  'your order has been successfully confirmed',
  'i have contacted the shipping company',
  'okay, let me inform the shipping company',
  'okay, your order is being processed',
  // — đòi RTO
  'has any (delivery )?staff contacted you',
  "i'?m still waiting for your reply",
  'i checked the system and saw that the delivery was unsuccessful',
  'could you please deliver the order earlier',
  'what date would you like to receive the goods',
  'so when can you expect to receive your order',
  // — khuyến mãi giữ đơn
  'exclusive \\d+% off just for you',
  // — chào tự động / sự kiện hệ thống
  'how can (we|i|.{0,40}) help you( today)?\\?',
  'replied to an ad',
  'đã trả lời một quảng cáo',
  'interested in our .{0,60}\\?$',
  // — kéo sang WhatsApp
  'please click this link and send me your location on whatsapp',
  'because our whatsapp is full of friends',
  'please contact our packer via whatsapp',
  // — ĐE DOẠ khách (M09 chặn ở chiều ra; ở đây để nhận ra đó là máy, không phải sale)
  "i'?ll be taking you to social media",
  'posting in group of',

  // ═══ BỔ SUNG 11/08/2026 — khai thác từ 770 tin page THẬT ═══
  // Sổ cũ chỉ phủ 17,4% tin page. 82,6% còn lại rơi vào "vùng đoán", mà đoán sai
  // là AI tự khoá mình vĩnh viễn. Dưới đây là các mẫu LẶP ≥3 lần chưa được phủ.

  // — tin HỆ THỐNG của Facebook/Pancake (tiếng Việt, gửi dưới danh nghĩa page)
  'đã tự động chuyển tin nhắn này vào thư mục spam',
  'bạn đang phản hồi bình luận của người dùng',
  'you have placed an order',
  // — RTO/giữ đơn kiểu "còn đó không"
  'are you still there',
  "haven'?t seen your reply",
  'will end(s)? at \\d+ ?(am|pm)',
  'do you have any other questions',
  // — chào bán tự động
  'do you wanna order now',
  'do you want to order \\d+ set',
  'free shipping.{0,20}cash on delivery',
  'cash on delivery.{0,20}free shipping',
  'can be pawnable',
  'do you often feel',
  "don'?t get this.{0,20}unless you'?re ready",
  'which combo would you like',
  // — RTO đòi ảnh / báo trạng thái giao (đo lần 2)
  'please send me (a )?pictures? of the',
  'have you received my product',
  'your order is being shipped',
];

let compiled = null;
let extra = [];

function loadExtra() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(j) ? j : (Array.isArray(j.patterns) ? j.patterns : []);
  } catch (e) { console.warn('[bot-registry] đọc botcake-templates.json lỗi:', e.message); return []; }
}

function build() {
  extra = loadExtra();
  const all = [...DEFAULT_PATTERNS, ...extra];
  compiled = all.map((p) => {
    try { return new RegExp(p, 'i'); } catch { console.warn(`[bot-registry] mẫu hỏng, bỏ qua: ${p}`); return null; }
  }).filter(Boolean);
  return compiled;
}

/** Tin này do MÁY gửi (Botcake / công cụ RTO / sự kiện hệ thống) chứ không phải người gõ? */
export function isAutomationTemplate(text) {
  const t = String(text || '');
  if (!t.trim()) return false;                 // tin rỗng xét riêng, không tính là template
  if (INVISIBLE_TAG.test(t)) return true;      // ký tự ẩn = chắc chắn máy
  if (STYLED_UNICODE.test(t)) return true;     // chữ kiểu cách = template marketing
  if (!compiled) build();
  return compiled.some((re) => re.test(t));
}

export function listTemplates() {
  if (!compiled) build();
  return { builtin: DEFAULT_PATTERNS.length, extra: extra.length, patterns: [...DEFAULT_PATTERNS, ...extra] };
}

/** Thêm mẫu mới (M18 gọi từ dashboard). Trả về false nếu regex hỏng. */
export function addTemplate(pattern) {
  try { new RegExp(pattern, 'i'); } catch { return false; }
  const cur = loadExtra();
  if (cur.includes(pattern)) return true;
  cur.push(pattern);
  try { fs.writeFileSync(FILE, JSON.stringify({ patterns: cur }, null, 2)); } catch (e) { console.error('[bot-registry] lưu lỗi:', e.message); return false; }
  build();
  return true;
}

export function reloadTemplates() { return build().length; }
