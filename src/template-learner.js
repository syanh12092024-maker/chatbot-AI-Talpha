// TỰ HỌC SỔ NHẬN DIỆN TIN MÁY — vá đúng 67,9% "vùng đoán" mà API Botcake không với tới.
// Spec: docs/v2/09-VONG-2-CAP-NHAT.md §1④ · docs/v2/prompts/L7-MINER-ORDER.md §②
//
// VẤN ĐỀ: `src/bot-registry.js` mới phủ 32,1% tin do page gửi. 67,9% còn lại M05 phải ĐOÁN,
// mà đoán sai theo hướng "người thật đã vào chat" thì AI TỰ KHOÁ hội thoại 24h. Nguồn gây
// nhiễu có 3 chỗ, chỉ 1 chỗ có API (Botcake — mà API lại KHÔNG trả nội dung flow):
//     Botcake ~7/19 mẫu lặp · công cụ RTO thứ ba ~5/19 · tin hệ thống Facebook 2/19
// Đường duy nhất còn lại: HỌC TỪ DỮ LIỆU CỦA CHÍNH MÌNH.
//
// TÍN HIỆU ĐÃ KIỂM CHỨNG trên dữ liệu thật (11/08/2026):
//     lặp NGUYÊN VĂN qua ≥3 hội thoại KHÁC NHAU  VÀ  dài ≥40 ký tự  →  là template
// Ngắn hơn là câu đệm người gõ — kiểm đúng: "ok dear" 7×, "..." 5×,
// "It take 2-5 days to delivery dear" (33 ký tự) đều bị loại ĐÚNG.
//
// HAI RÀO CHẮN, cố ý đặt trong code chứ không nằm ở quy trình:
//   ① Mẫu mới KHÔNG tự bật. Ghi vào sổ CHỜ DUYỆT; chỉ khi người bấm Duyệt mới rơi vào
//     `botcake-templates.json`. Mẫu sai = AI bỏ sót người thật = khách bị bot trả lời đè.
//   ② KHÔNG sửa `src/bot-registry.js` (file của L6). Chỉ ghi ra file dữ liệu mà nó đọc sẵn.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isAutomationTemplate, reloadTemplates } from './bot-registry.js';
import { isOurFixedMessage } from './our-messages.js';
import { looksHuman } from './conv-owner.js';
import { readLog } from './ai-log.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Hai file, hai vai: CANDIDATES là sổ chờ duyệt (của L7), TEMPLATES là sổ đang chạy (L6 đọc).
const CANDIDATES_FILE = () => path.resolve(ROOT, process.env.TEMPLATE_CANDIDATES_FILE || 'template-candidates.json');
const TEMPLATES_FILE = () => path.resolve(ROOT, process.env.TEMPLATE_FILE || 'botcake-templates.json');

export const MIN_CONVS = 3;   // lặp qua ≥3 hội thoại KHÁC NHAU
export const MIN_LEN = 40;    // ngắn hơn là câu đệm người gõ
export const MAX_PATTERN_SRC = 120; // cắt bớt phần đuôi khi sinh regex (đủ đặc trưng, đỡ giòn)

// ═══════════════════════════════════════════════════════════════════════════
// ① CHUẨN HOÁ & SINH MẪU
// ═══════════════════════════════════════════════════════════════════════════

/** Chuẩn hoá để GOM tin lặp: bỏ HTML, gộp khoảng trắng, hạ chữ thường. Giữ nguyên dấu câu. */
export function normalizeMsg(text) {
  return String(text == null ? '' : text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const keyOf = (s) => normalizeMsg(s).toLowerCase();
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sinh regex cho bot-registry từ một tin lặp.
 * Chuỗi số bị tổng quát hoá (`109 SAR` / `99 SAR` là CÙNG một template báo giá), phần còn lại
 * escape nguyên văn — mẫu dài ≥40 ký tự thì gần như không thể trùng nhầm câu người gõ.
 */
export function toPattern(text) {
  const src = normalizeMsg(text).slice(0, MAX_PATTERN_SRC).trim();
  if (!src) return '';
  return escRe(src).replace(/\d[\d.,]*/g, '\\d[\\d.,]*');
}

const idOf = (pattern) => crypto.createHash('sha1').update(pattern, 'utf8').digest('hex').slice(0, 10);

/** Regex compile được không? (mẫu hỏng thì bot-registry bỏ qua — bắt sớm ở đây cho người thấy) */
export function compilePattern(p) {
  try { return new RegExp(p, 'i'); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ② LỌC "TIN CỦA CHÍNH MÌNH"
// ═══════════════════════════════════════════════════════════════════════════
// Câu mẫu Fast Lane cũng lặp nguyên văn qua hàng chục hội thoại. Đưa nó vào sổ template
// thì không SAI (nó đúng là máy), nhưng làm loãng sổ và khiến người duyệt mất niềm tin
// vào danh sách. M05 đã có cửa riêng cho tin của mình (`isOurFixedMessage` + Sổ AI).

/** Tập tiền tố tin AI đã gửi của 1 page, lấy từ Sổ AI (sổ lưu 80 ký tự đầu). */
export function ourTextIndex(pageId, rows) {
  const out = new Set();
  for (const r of (rows || readLog())) {
    if (r.type !== 'reply' || !r.text) continue;
    if (pageId && String(r.page) !== String(pageId)) continue;
    const n = keyOf(r.text);
    if (n.length >= 12) out.add(n.slice(0, 60));
  }
  return out;
}

function isOurs(text, ourIdx) {
  if (isOurFixedMessage(text)) return true;
  const n = keyOf(text);
  if (!n) return true;
  for (const p of ourIdx) {
    if (n.startsWith(p.slice(0, Math.min(p.length, 40)))) return true;
    if (p.startsWith(n.slice(0, 40))) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// ③ HỌC — chạy trên đúng dữ liệu M15 vừa kéo (KHÔNG gọi Pancake lần hai)
// ═══════════════════════════════════════════════════════════════════════════

/** Mọi tin do PAGE gửi trong một gói dữ liệu `collectPageConvs()`. */
export function pageMessages(collected) {
  const out = [];
  for (const c of (collected?.convs || [])) {
    for (const m of (c.msgs || [])) {
      if (m.who !== 'page') continue;
      const t = normalizeMsg(m.text);
      if (t) out.push({ text: t, convId: c.convId, at: m.at || 0 });
    }
  }
  return out;
}

/**
 * Học mẫu mới từ MỘT HOẶC NHIỀU gói dữ liệu page.
 * @param {Array|object} bundles kết quả `collectPageConvs()` (một cái hoặc mảng)
 * @param {{rows?:Array, minConvs?:number, minLen?:number, ourIndex?:Set}} opt
 * @returns {{candidates:Array, pageMsgs:number, distinct:number, pages:string[]}}
 */
export function learnTemplates(bundles, opt = {}) {
  const list = Array.isArray(bundles) ? bundles : [bundles];
  const minConvs = opt.minConvs ?? MIN_CONVS;
  const minLen = opt.minLen ?? MIN_LEN;

  const groups = new Map(); // key -> {sample, convs:Set, pages:Set, hits}
  const pages = [];
  let total = 0;
  for (const b of list) {
    if (!b) continue;
    const pageId = String(b.pageId || '');
    if (pageId) pages.push(pageId);
    const ourIdx = opt.ourIndex || ourTextIndex(pageId, opt.rows);
    for (const m of pageMessages(b)) {
      total++;
      if (m.text.length < minLen) continue;            // câu đệm người gõ
      if (isOurs(m.text, ourIdx)) continue;            // tin của chính bot mình
      const k = keyOf(m.text);
      let g = groups.get(k);
      if (!g) { g = { sample: m.text, convs: new Set(), pages: new Set(), hits: 0 }; groups.set(k, g); }
      g.hits++;
      g.convs.add(`${pageId}:${m.convId}`);
      if (pageId) g.pages.add(pageId);
    }
  }

  const candidates = [];
  for (const g of groups.values()) {
    if (g.convs.size < minConvs) continue;             // chưa đủ bằng chứng lặp
    if (isAutomationTemplate(g.sample)) continue;      // sổ hiện tại đã phủ
    const pattern = toPattern(g.sample);
    if (!pattern || !compilePattern(pattern)) continue;
    candidates.push({
      id: idOf(pattern),
      pattern,
      sample: g.sample.slice(0, 300),
      convs: g.convs.size,
      hits: g.hits,
      pages: [...g.pages],
      len: g.sample.length,
    });
  }
  candidates.sort((a, b) => (b.convs - a.convs) || (b.hits - a.hits));
  return { candidates, pageMsgs: total, distinct: groups.size, pages: [...new Set(pages)] };
}

// ═══════════════════════════════════════════════════════════════════════════
// ④ ĐO TÁC DỤNG — độ phủ sổ và tỷ lệ khoá, TRƯỚC/SAU
// ═══════════════════════════════════════════════════════════════════════════

const matchAny = (text, res) => res.some((re) => re.test(text));

/** Độ phủ sổ nhận diện trên tin page: bao nhiêu % tin được nhận ra là máy. */
export function coverage(bundles, extraPatterns = []) {
  const list = Array.isArray(bundles) ? bundles : [bundles];
  const res = extraPatterns.map(compilePattern).filter(Boolean);
  let total = 0; let covered = 0;
  for (const b of list) {
    for (const m of pageMessages(b)) {
      total++;
      if (isAutomationTemplate(m.text) || matchAny(m.text, res)) covered++;
    }
  }
  return { total, covered, pct: total ? +(covered * 100 / total).toFixed(1) : 0 };
}

/**
 * Tỷ lệ hội thoại BỊ KHOÁ vì M05 tưởng người thật đã tiếp quản.
 * Mô phỏng đúng khối ④ của `decideConv`: chỉ soi khúc đuôi tin page sau tin khách cuối.
 * `extraPatterns` = các mẫu sắp duyệt → cho biết duyệt xong thì tỷ lệ khoá đổi thế nào.
 */
export function lockRate(bundles, extraPatterns = [], opt = {}) {
  const list = Array.isArray(bundles) ? bundles : [bundles];
  const res = extraPatterns.map(compilePattern).filter(Boolean);
  let convs = 0; let locked = 0;
  const samples = [];
  for (const b of list) {
    const ourIdx = opt.ourIndex || ourTextIndex(String(b?.pageId || ''), opt.rows);
    const ours = [...ourIdx];
    for (const c of (b?.convs || [])) {
      const msgs = c.msgs || [];
      if (!msgs.length) continue;
      convs++;
      const tail = [];
      for (let i = msgs.length - 1; i >= 0 && tail.length < 12; i--) {
        if (msgs[i].who !== 'page') { if (tail.length) break; else continue; }
        tail.push(msgs[i]);
      }
      for (const m of tail) {
        if (matchAny(m.text, res)) continue;             // mẫu mới đã nhận ra: là máy
        if (looksHuman(m.text, ours)) {
          locked++;
          if (samples.length < 10) samples.push({ convId: c.convId, text: m.text.slice(0, 90) });
          break;
        }
      }
    }
  }
  return { convs, locked, pct: convs ? +(locked * 100 / convs).toFixed(1) : 0, samples };
}

/** Báo cáo đầy đủ cho một đêm học: mẫu mới + độ phủ trước/sau + tỷ lệ khoá trước/sau. */
export function learnReport(bundles, opt = {}) {
  const learned = learnTemplates(bundles, opt);
  const pats = learned.candidates.map((c) => c.pattern);
  const before = { coverage: coverage(bundles), lock: lockRate(bundles, [], opt) };
  const after = { coverage: coverage(bundles, pats), lock: lockRate(bundles, pats, opt) };
  return {
    date: new Date(opt.now || Date.now()).toISOString().slice(0, 10),
    pages: learned.pages,
    pageMsgs: learned.pageMsgs,
    candidates: learned.candidates,
    before, after,
    coverageGain: +(after.coverage.pct - before.coverage.pct).toFixed(1),
    lockDrop: +(before.lock.pct - after.lock.pct).toFixed(1),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ SỔ CHỜ DUYỆT — mẫu mới KHÔNG tự bật
// ═══════════════════════════════════════════════════════════════════════════

export function readCandidates() {
  try {
    const f = CANDIDATES_FILE();
    if (!fs.existsSync(f)) return [];
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Array.isArray(j) ? j : (Array.isArray(j.candidates) ? j.candidates : []);
  } catch (e) { console.warn('[tpl] đọc sổ chờ duyệt lỗi:', e.message); return []; }
}

function writeCandidates(list) {
  try { fs.writeFileSync(CANDIDATES_FILE(), JSON.stringify({ candidates: list }, null, 2)); return true; }
  catch (e) { console.error('[tpl] lưu sổ chờ duyệt lỗi:', e.message); return false; }
}

/**
 * Gộp mẫu mới học được vào sổ chờ duyệt (giữ nguyên quyết định cũ của người:
 * đã DUYỆT hay đã BỎ thì không dựng lại, chỉ cộng dồn bằng chứng).
 */
export function mergeCandidates(found, { now = Date.now() } = {}) {
  const cur = readCandidates();
  const byId = new Map(cur.map((c) => [c.id, c]));
  let added = 0; let updated = 0;
  for (const c of found) {
    const old = byId.get(c.id);
    if (!old) {
      byId.set(c.id, { ...c, status: 'pending', firstSeen: now, lastSeen: now });
      added++;
    } else {
      old.convs = Math.max(old.convs || 0, c.convs);
      old.hits = (old.hits || 0) + c.hits;
      old.pages = [...new Set([...(old.pages || []), ...c.pages])];
      old.lastSeen = now;
      updated++;
    }
  }
  const list = [...byId.values()].sort((a, b) => (b.lastSeen - a.lastSeen) || (b.convs - a.convs));
  writeCandidates(list);
  return { added, updated, total: list.length, pending: list.filter((c) => c.status === 'pending').length };
}

/** Đọc sổ template đang chạy (file L6 đọc) — L7 chỉ ghi file này, không đụng bot-registry.js. */
function readLiveTemplates() {
  try {
    const f = TEMPLATES_FILE();
    if (!fs.existsSync(f)) return [];
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Array.isArray(j) ? j : (Array.isArray(j.patterns) ? j.patterns : []);
  } catch { return []; }
}

/**
 * DUYỆT một mẫu → ghi vào `botcake-templates.json` rồi nạp lại sổ cho M05/M07 dùng ngay.
 * Đây là cửa DUY NHẤT làm mẫu mới có hiệu lực, và nó chỉ mở khi người bấm.
 */
export function approveCandidate(id, { by = 'dashboard', now = Date.now() } = {}) {
  const list = readCandidates();
  const c = list.find((x) => x.id === id);
  if (!c) return { ok: false, error: 'không có mẫu này trong sổ chờ duyệt' };
  if (c.status === 'approved') return { ok: true, already: true, pattern: c.pattern };
  if (!compilePattern(c.pattern)) return { ok: false, error: 'mẫu hỏng, không compile được' };

  const cur = readLiveTemplates();
  if (!cur.includes(c.pattern)) {
    cur.push(c.pattern);
    try { fs.writeFileSync(TEMPLATES_FILE(), JSON.stringify({ patterns: cur }, null, 2)); }
    catch (e) { return { ok: false, error: `ghi botcake-templates.json lỗi: ${e.message}` }; }
  }
  c.status = 'approved'; c.decidedAt = now; c.decidedBy = by;
  writeCandidates(list);
  let live = 0;
  try { live = reloadTemplates(); } catch { /* file test trỏ chỗ khác — không chặn duyệt */ }
  return { ok: true, pattern: c.pattern, live };
}

/** BỎ một mẫu — ghi lại để đêm sau không dựng lại cùng một thứ. */
export function rejectCandidate(id, { by = 'dashboard', reason = '', now = Date.now() } = {}) {
  const list = readCandidates();
  const c = list.find((x) => x.id === id);
  if (!c) return { ok: false, error: 'không có mẫu này trong sổ chờ duyệt' };
  c.status = 'rejected'; c.decidedAt = now; c.decidedBy = by; c.reason = String(reason || '').slice(0, 200);
  writeCandidates(list);
  return { ok: true };
}

/** Mẫu ĐÃ DUYỆT/ĐÃ BỎ thì không đưa lại vào sổ chờ duyệt. */
export function filterDecided(found) {
  const decided = new Set(readCandidates().filter((c) => c.status !== 'pending').map((c) => c.id));
  return found.filter((c) => !decided.has(c.id));
}
