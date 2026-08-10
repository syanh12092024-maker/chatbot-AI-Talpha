// M07 · CONTEXT BUILDER — hồ sơ khách NÉN thay cho 20 tin thô.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M07
//
// VÌ SAO: đo thật → input 2.906 token/lượt, phần lớn là 20 tin lịch sử nạp lại MỖI LƯỢT.
// Trong đó 13,7% tin page là RÁC ("<div></div>", "...") và một phần lớn là template Botcake —
// tốn tiền để model đọc thứ không mang thông tin, rồi vẫn hỏi lại khách những thứ khách đã cho
// (thông tin nằm rải rác ở tin thứ 14 thì model bỏ sót).
//
// Thay bằng:  [HỒ SƠ KHÁCH ~150 token]  +  [6 tin gần nhất]
// Hồ sơ dựng bằng REGEX + tham số tool (0 token thêm), lưu bền ở conv-state.json nên
// restart server giữa hội thoại thì AI vẫn nhớ khách là ai — không chào lại từ đầu.

import { cleanText } from './text.js';
import { isAutomationTemplate } from './bot-registry.js';
import { hasPhone, hasAddress, scanSignals } from './lead-score.js';

export const RECENT_MSGS = 6;       // số tin nguyên văn giữ lại
export const MSG_MAX_CHARS = 300;   // cắt mỗi tin (spec §M07)
export const HYDRATE_MAX_MSGS = 20; // chỉ dùng ĐÚNG MỘT LẦN lúc dựng hồ sơ lần đầu

// ─────────────────────────────────────────────────────────────────────────────
// Hồ sơ khách
// ─────────────────────────────────────────────────────────────────────────────

export function emptyProfile() {
  return {
    name: '', phone: '', address: '', city: '',
    tier: '',            // gói/combo khách đang nhắm
    qty: 0,
    total: '',           // tổng tiền đã chốt (chỉ từ tham số tool — không bịa)
    cod: false,          // khách đã xác nhận COD
    imagesSent: [],      // loại ảnh đã gửi (feedback, chứng nhận...)
    objections: [],      // phản đối đã nêu
    ordered: false,      // đã gọi create_draft_order thành công
    hydratedAt: 0,
  };
}

const PHONE_CAND = /\+?\d[\d\s().-]{5,18}\d/;
const NAME_LABEL = /(?:my name is|my name's|i am|i'?m|this is|ako si|ako po si|pangalan ko(?: po)?(?: ay)?|name\s*[:=-]|pangalan\s*[:=-]|اسمي|الاسم\s*[:=-])\s*([\p{L}][\p{L}\s.'-]{1,40})/iu;
const NAME_LINE = /^[\p{L}][\p{L}.'-]+(?:\s+[\p{L}][\p{L}.'-]+){1,3}$/u;
const TIER_TEXT = /\b(set\s*\d+|combo\s*\d+|buy\s*\d+\s*get\s*\d+|package\s*\d+|\d+\s*(?:pcs|pieces|bottles|boxes))\b/i;
const COD_OK = /\b(cod|cash on delivery)\b[^.\n]{0,30}\b(ok|okay|sige|yes|opo|oo|sure|fine|deal|go)\b|\b(ok|okay|sige|yes|opo|oo|sure|fine|deal|go)\b[^.\n]{0,30}\b(cod|cash on delivery)\b|bayad (?:na lang )?pagdating|pay upon delivery|الدفع عند الاستلام/i;

function firstPhone(text) {
  const m = String(text || '').match(PHONE_CAND);
  if (!m) return '';
  const d = m[0].replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? m[0].trim() : '';
}

// Địa chỉ: giữ NGUYÊN VĂN câu/dòng chứa địa chỉ (model cần chi tiết để điền tool), cắt 90 ký tự.
function firstAddress(text) {
  const parts = String(text || '').split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) if (hasAddress(p)) return p.slice(0, 90);
  return hasAddress(text) ? String(text).trim().slice(0, 90) : '';
}

function firstName(text) {
  const s = String(text || '');
  const m = s.match(NAME_LABEL);
  if (m) return m[1].trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!hasPhone(s)) return '';
  for (const line of s.split(/[\n,·|]+/)) {
    const l = line.trim();
    if (l.length >= 4 && l.length <= 40 && !/\d/.test(l) && NAME_LINE.test(l)) return l;
  }
  return '';
}

/**
 * Rút thông tin từ MỘT tin khách vào hồ sơ (regex, 0 token).
 * Chỉ GHI ĐÈ khi trước đó chưa có — thông tin khách cho lần đầu là thông tin đúng;
 * tin sau nhắc lại lem nhem không được phép xoá nó.
 */
export function extractFromText(text, prof = emptyProfile()) {
  const s = String(text || '');
  if (!s.trim()) return prof;

  if (!prof.phone) { const p = firstPhone(s); if (p) prof.phone = p; }
  if (!prof.address) { const a = firstAddress(s); if (a) prof.address = a; }
  if (!prof.name) { const n = firstName(s); if (n) prof.name = n; }
  if (!prof.tier) { const t = s.match(TIER_TEXT); if (t) prof.tier = t[0].trim(); }
  if (!prof.cod && COD_OK.test(s)) prof.cod = true;

  for (const k of scanSignals(s)) {
    if (k.startsWith('obj_') && !prof.objections.includes(k)) prof.objections.push(k);
  }
  return prof;
}

/**
 * Rút thông tin từ THAM SỐ TOOL của lượt vừa rồi — nguồn chính xác nhất, không tốn token
 * thêm (tool_use đã nằm sẵn trong state.messages).
 *   create_draft_order → tên/SĐT/địa chỉ/gói/tổng tiền/COD
 *   send_product_image → loại ảnh đã gửi
 */
export function absorbToolUses(messages = [], prof = emptyProfile()) {
  for (const m of messages) {
    if (m?.role !== 'assistant' || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b?.type !== 'tool_use') continue;
      const inp = b.input || {};
      if (b.name === 'send_product_image') {
        const cat = String(inp.category || 'sản phẩm').trim().toLowerCase();
        if (cat && !prof.imagesSent.includes(cat)) prof.imagesSent.push(cat);
      } else if (b.name === 'create_draft_order') {
        if (inp.name) prof.name = String(inp.name).slice(0, 40);
        if (inp.phone) prof.phone = String(inp.phone).slice(0, 20);
        if (inp.address) prof.address = [inp.address, inp.city].filter(Boolean).join(', ').slice(0, 90);
        if (inp.city) prof.city = String(inp.city).slice(0, 40);
        if (inp.variant) prof.tier = String(inp.variant).slice(0, 40);
        if (inp.qty) prof.qty = Number(inp.qty) || 0;
        if (inp.total_price) prof.total = String(inp.total_price);
        if (inp.cod_confirmed) prof.cod = true;
      }
    }
  }
  return prof;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dọn rác lịch sử — spec §M07 "Dọn rác trước khi nạp"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @returns {Array<{role:'user'|'assistant', text:string}>} cũ → mới, đã bỏ rác
 */
export function cleanHistory(msgs = [], pageId) {
  const out = [];
  for (const m of msgs) {
    const isPage = String(m?.from?.id) === String(pageId);
    const raw = (m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const hasAttach = (m?.attachments || []).length > 0;
    if (isPage) {
      // Tin page RỖNG (sticker/ảnh/"...") = 13,7% tin page — không mang thông tin, bỏ.
      if (!raw || /^\.{2,}$/.test(raw)) continue;
      // Template Botcake/RTO — chỉ làm nhiễu và dạy model bắt chước đúng thứ HARD_RULES cấm.
      if (isAutomationTemplate(raw)) continue;
      const t = cleanText(raw, MSG_MAX_CHARS);
      if (t) out.push({ role: 'assistant', text: t });
    } else {
      const t = raw ? cleanText(raw, MSG_MAX_CHARS) : (hasAttach ? '(khách gửi ảnh/đính kèm)' : '');
      if (t) out.push({ role: 'user', text: t });
    }
  }
  return out;
}

/** Dựng hồ sơ lần đầu từ tối đa 20 tin Pancake — CHỈ CHẠY MỘT LẦN cho mỗi hội thoại. */
export function hydrateProfile(msgs = [], pageId, prof = emptyProfile()) {
  for (const m of msgs.slice(-HYDRATE_MAX_MSGS)) {
    if (String(m?.from?.id) === String(pageId)) continue; // chỉ tin KHÁCH mới mang thông tin đơn
    const raw = (m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').trim();
    if (raw) extractFromText(raw, prof);
  }
  prof.hydratedAt = Date.now();
  return prof;
}

// ─────────────────────────────────────────────────────────────────────────────
// Khối hồ sơ đưa vào LLM (~150 token)
// ─────────────────────────────────────────────────────────────────────────────

const OBJ_LABEL = { obj_price: 'chê đắt', obj_trust: 'nghi hàng giả', obj_wait: 'để nghĩ thêm' };

/** Bước còn thiếu để chốt đơn COD — suy ra từ checklist, không hỏi model. */
export function missingSteps(prof) {
  const miss = [];
  if (!prof.name) miss.push('tên');
  if (!prof.phone) miss.push('SĐT');
  if (!prof.address) miss.push('địa chỉ');
  if (!prof.tier && !prof.qty) miss.push('chọn gói/số lượng');
  if (!prof.cod) miss.push('xác nhận COD');
  return miss;
}

/**
 * @param {object} prof
 * @param {{state?:string, used?:number, max?:number, tier?:string, lane?:string}} meta
 * @returns {string} khối hồ sơ (tiếng Việt — hướng dẫn nội bộ, model KHÔNG được nói với khách)
 */
export function buildProfileBlock(prof = emptyProfile(), meta = {}) {
  const L = [];
  L.push('[HỒ SƠ KHÁCH — dữ liệu nội bộ, ĐỌC để không hỏi lại thứ khách đã cho]');
  const idLine = [
    `Tên: ${prof.name || '(chưa có)'}`,
    `SĐT: ${prof.phone || '(chưa có)'}`,
    `Địa chỉ: ${prof.address || '(chưa có)'}`,
  ].join(' · ');
  L.push(idLine);
  if (prof.tier || prof.qty) L.push(`Gói quan tâm: ${[prof.tier, prof.qty ? `SL ${prof.qty}` : '', prof.total ? `tổng ${prof.total}` : ''].filter(Boolean).join(' · ')}`);
  if (prof.imagesSent.length) L.push(`Đã xem ảnh: ${prof.imagesSent.join(', ')} (đừng gửi lại loại cũ)`);
  if (prof.objections.length) L.push(`Phản đối đã nêu: ${prof.objections.map((k) => OBJ_LABEL[k] || k).join(', ')}`);
  L.push(`COD: ${prof.cod ? 'khách đã xác nhận' : 'chưa xác nhận'}`);
  const miss = missingSteps(prof);
  L.push(`Bước còn thiếu: ${miss.length ? miss.join(', ') : 'đủ thông tin — chốt đơn được'}`);
  if (meta.max) L.push(`Lượt đã dùng: ${meta.used || 0}/${meta.max}${meta.tier ? ` (khách ${meta.tier})` : ''} · Trạng thái: ${meta.state || 'SELLING'}`);
  // Nhắc lại đúng hai điều dễ sai nhất khi model có sẵn SĐT/địa chỉ trong tay.
  L.push('⚠️ SĐT/địa chỉ ở trên CHỈ để điền tool — TUYỆT ĐỐI không đọc lại cho khách (trừ lượt tóm tắt đơn) và không hỏi lại.');
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Dựng mảng messages cho closer
// ─────────────────────────────────────────────────────────────────────────────

/** Gộp các lượt liên tiếp cùng vai — Claude cần mảng xen kẽ user/assistant. */
function mergeTurns(rows) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && prev.role === r.role) prev.content += '\n' + r.content;
    else out.push({ role: r.role, content: r.content });
  }
  return out;
}

/**
 * Ngữ cảnh đưa vào LLM: [hồ sơ nén] + [N tin gần nhất], KHÔNG nạp lại 20 tin thô.
 *
 * Tin khách ở CUỐI hội thoại (cụm đang xử lý) bị bỏ ra — handler đẩy nó vào riêng ngay sau đó.
 *
 * @returns {{messages:Array, kept:number, dropped:number}}
 */
export function buildContextMessages({ prof, msgs = [], pageId, meta = {}, recent = RECENT_MSGS }) {
  const rows = cleanHistory(msgs, pageId);
  const dropped = msgs.length - rows.length;
  // bỏ cụm tin khách đang xử lý ở cuối
  while (rows.length && rows[rows.length - 1].role === 'user') rows.pop();
  const tail = rows.slice(-recent);
  // Claude yêu cầu mở đầu bằng user; ta chèn khối hồ sơ làm lượt user đầu tiên nên luôn đúng.
  const turns = [
    { role: 'user', content: buildProfileBlock(prof, meta) },
    { role: 'assistant', content: 'Đã nắm hồ sơ khách, tiếp tục hội thoại.' },
    ...tail.map((r) => ({ role: r.role, content: r.text })),
  ];
  const messages = mergeTurns(turns);
  // Phải kết bằng assistant vì handler sẽ đẩy tin khách (user) vào ngay sau.
  while (messages.length && messages[messages.length - 1].role !== 'assistant') messages.pop();
  return { messages, kept: tail.length, dropped };
}

/**
 * Ước lượng token (không gọi API). Dùng để theo dõi ngưỡng ≤1.400 token/lượt trong log
 * và trong script đo offline; con số CHÍNH XÁC vẫn lấy từ `usage` thật của nhà cung cấp.
 * Hệ số 3,3 ký tự/token đo trên chính tin thật của hệ thống (Taglish + emoji + Ả Rập).
 */
export function estimateTokens(input) {
  const s = typeof input === 'string' ? input : JSON.stringify(input || '');
  return Math.ceil(s.length / 3.3);
}
