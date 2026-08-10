// M01 · TOKEN & PAGE REGISTRY — sổ cái page của hệ thống.
// Spec: docs/v2/01-TANG-NHAP-LIEU.md § M01 · schema 00-TONG-QUAN.md §6.1
//
// Trả lời bốn câu mà trước đây không ai trả lời được nếu không SSH vào VPS:
//   ① page nào đang tồn tại, token nào phủ nó, token nào là chân dự phòng
//   ② page nào đã map được shop POS (không map = AI bán được nhưng KHÔNG tạo nổi đơn thật)
//   ③ page nào thiếu 1 trong 3 thẻ Pancake ('AI Chăm' · 'AI Chốt' · 'AI back Sale')
//   ④ token nào đã chết
//
// KHÔNG BAO GIỜ TỰ TẠO THẺ. Thẻ là tài sản của chủ shop, sale đang lọc hội thoại theo
// đúng bộ thẻ đó; bot tự thêm là làm loạn hàng chờ của người khác. Chỉ báo thiếu.
//
// ⚠️ Vì sao file này tự đọc kho token thay vì gọi `pancake.js`: `allToks()` bên đó
// không export, mà `pancake.js` thuộc luồng khác (docs/v2/08-SONG-SONG.md §3) nên
// không được sửa để export thêm. Thứ tự đọc ở đây CỐ Ý GIỐNG HỆT `allToks()` —
// chính → phụ .env → dashboard — vì thứ tự đó chính là thứ tự failover.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { decodeTok, pkTagId } from './pancake.js';
import { getPageList } from './kb.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_FILE = process.env.PAGES_REGISTRY_FILE || path.join(DIR, 'pages.json');
const DASH_TOKENS_FILE = path.join(DIR, 'pancake-tokens.json');   // token thêm từ dashboard
const SHOPS_FILE = path.join(DIR, 'pancake-shops.json');          // [{market, shop_id, api_key}]
const SHOP_CACHE_FILE = path.join(DIR, 'page-shop-cache.json');   // pageId -> shop (pancake-orders.js dò ra)
const PK_BASE = 'https://pages.fm/api/v1';

const REFRESH_MS = Number(process.env.PAGE_REFRESH_MS || 600000);
const TAG_NAMES = () => [config.pkTags.ai, config.pkTags.order, config.pkTags.handoff].filter(Boolean);

const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };

// ─────────────────────────────────────────────────────────────────────────────
// Kho token — THỨ TỰ = THỨ TỰ ƯU TIÊN FAILOVER
// ─────────────────────────────────────────────────────────────────────────────

// KHÔNG export — giá trị trả về chứa token thật. Ra ngoài chỉ qua `tokenHealth()`.
function tokenSlots() {
  const dash = readJson(DASH_TOKENS_FILE, []);
  const raw = [
    ...(config.pancakeToken ? [{ token: config.pancakeToken, source: 'chính (.env)' }] : []),
    ...config.pancakeTokensExtra.map((t) => ({ token: t, source: 'phụ (.env)' })),
    ...(Array.isArray(dash) ? dash : []).map((t) => ({ token: t, source: 'dashboard' })),
  ];
  return raw.map((s, i) => {
    const d = decodeTok(s.token);
    return { idx: i, source: s.source, name: d.name, exp: d.exp, expired: !!d.exp && d.exp <= Date.now(), tail: String(s.token).slice(-8), token: s.token };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Trạng thái trong RAM
// ─────────────────────────────────────────────────────────────────────────────

let registry = readJson(REGISTRY_FILE, {});   // pageId -> bản ghi §6.1 (đã che api_key)
let tokenState = [];                          // song song tokenSlots(): { idx, dead, pages, error }
let lastRefresh = 0;
let refreshing = null;

export function getRegistry() { return registry; }
export function getPageRecord(pageId) { return registry[String(pageId)] || null; }
export function registryAge() { return lastRefresh ? Date.now() - lastRefresh : null; }
// tokenState CỐ Ý không mang theo token thật — đây là dữ liệu đi thẳng ra API dashboard.
export function tokenHealth() { return tokenState; }

// ─────────────────────────────────────────────────────────────────────────────
// Bước 1–3 · quét page theo từng token, gộp lại, chọn token ưu tiên
// ─────────────────────────────────────────────────────────────────────────────

async function scanTokens(slots) {
  const coverage = new Map();  // pageId -> { name, tokens: [idx] }
  const state = [];
  for (const s of slots) {
    if (s.expired) {
      state.push({ idx: s.idx, source: s.source, name: s.name, tail: s.tail, exp: s.exp, dead: true, pages: 0, error: 'token đã hết hạn' });
      continue;
    }
    let dead = false; let error = ''; let n = 0;
    try {
      const res = await fetch(`${PK_BASE}/pages?access_token=${s.token}`);
      const j = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403 || !j.categorized) {
        // Pancake từ chối token → CẢNH BÁO ĐỎ, nhưng KHÔNG tự xoá (spec §M01):
        // token .env là do người vận hành đặt, xoá hộ là cướp quyền của họ.
        dead = true;
        error = `Pancake từ chối token (HTTP ${res.status})`;
      } else {
        for (const p of (j.categorized.activated || [])) {
          const id = String(p.id);
          const e = coverage.get(id) || { name: '', tokens: [] };
          if (p.name) e.name = p.name;
          e.tokens.push(s.idx);
          coverage.set(id, e);
          n++;
        }
      }
    } catch (e) {
      // Lỗi MẠNG ≠ token chết. Đánh dấu chết vì một lần rớt mạng là cách chắc chắn nhất
      // để tạo báo động giả rồi không ai còn tin báo động nữa.
      error = 'lỗi mạng: ' + e.message;
    }
    if (dead) console.error(`[registry] 🔴 token #${s.idx + 1} (${s.source} · ${s.name}) — ${error}`);
    state.push({ idx: s.idx, source: s.source, name: s.name, tail: s.tail, exp: s.exp, dead, pages: n, error });
  }
  return { coverage, state };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bước 4 · map shop POS
// Nguồn 1 (chắc chắn): page-shop-cache.json — pancake-orders.js đã DÒ THẬT bằng đơn có thật.
// Nguồn 2 (đoán):      khớp `market` của page trong Sheet với `market` của shop.
// Chỉ đọc, không ghi — cache đó là của pancake-orders.js.
// ─────────────────────────────────────────────────────────────────────────────

function mapShop(pageId, market) {
  const cache = readJson(SHOP_CACHE_FILE, {});
  const hit = cache[String(pageId)];
  if (hit?.shop_id) return { shopId: String(hit.shop_id), apiKeyTail: String(hit.api_key || '').slice(-4), via: 'đơn thật' };
  const shops = readJson(SHOPS_FILE, []);
  const m = String(market || '').trim().toLowerCase();
  const s = m && (Array.isArray(shops) ? shops : []).find((x) => String(x.market || '').trim().toLowerCase() === m);
  if (s?.shop_id) return { shopId: String(s.shop_id), apiKeyTail: String(s.api_key || '').slice(-4), via: 'khớp thị trường' };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bước 5 · kiểm 3 thẻ Pancake
//
// ⚠️ `pkTagId` trả null cho CẢ HAI trường hợp "page không có thẻ" và "gọi API hỏng".
// Phân biệt được là chuyện sống còn: readiness dùng kết quả này để CHẶN AI, và một
// lần rớt mạng mà báo cả 39 page thiếu thẻ thì hậu quả là tắt bot toàn hệ thống.
// Quy ước: cả 3 thẻ cùng null → coi là CHƯA BIẾT (null), không kết luận thiếu.
// Thiếu 1–2 thẻ (tức là có gọi được, đọc được bảng thẻ) → kết luận thiếu, chắc chắn.
// ─────────────────────────────────────────────────────────────────────────────

async function verifyTags(pageId) {
  const names = TAG_NAMES();
  if (!names.length) return { verified: null, missing: [], note: 'chưa cấu hình tên thẻ (PK_TAG_*)' };
  const found = [];
  for (const n of names) {
    try { found.push([n, await pkTagId(pageId, n)]); }
    catch { found.push([n, null]); }
  }
  const missing = found.filter(([, id]) => id == null).map(([n]) => n);
  if (missing.length === names.length) return { verified: null, missing: [], note: 'không đọc được bảng thẻ của page — chưa kết luận' };
  return { verified: missing.length === 0, missing, note: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vòng quét đầy đủ
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshRegistry({ withTags = true } = {}) {
  if (refreshing) return refreshing; // hai lần gọi chồng nhau → chờ chung một lượt quét
  refreshing = (async () => {
    const slots = tokenSlots();
    if (!slots.length) { console.warn('[registry] chưa có token Pancake nào.'); return registry; }

    const { coverage, state } = await scanTokens(slots);
    tokenState = state;

    // Quét LỖI GIỮA CHỪNG không được phép xoá sổ cái. Cùng lá chắn như pages.js dùng
    // cho rate-limit của Meta: kết quả mới hụt hơn 30% so với lần trước → giữ bản cũ.
    const known = Object.keys(registry).length;
    if (known && coverage.size < known * 0.7) {
      console.warn(`[registry] lượt quét chỉ thấy ${coverage.size}/${known} page (nghi lỗi tạm) → GIỮ sổ cái cũ.`);
      return registry;
    }

    const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
    const next = {};
    for (const [pageId, cov] of coverage) {
      const kb = kbById.get(pageId) || {};
      const prev = registry[pageId] || {};
      const live = cov.tokens.filter((i) => !state[i]?.dead);
      const shop = mapShop(pageId, kb.market);
      const tags = withTags ? await verifyTags(pageId) : { verified: prev.tagsVerified ?? null, missing: prev.tagsMissing || [], note: 'bỏ qua lượt này' };

      next[pageId] = {
        name: cov.name || kb.name || '',
        market: kb.market || '', category: kb.category || '',
        marketer: kb.marketer || '',
        tokenIdx: live.length ? live[0] : null,       // ← đầu tiên trong .env còn quyền
        tokenFallbacks: live.slice(1),
        tokensAll: cov.tokens,
        posShopId: shop?.shopId || null,
        posApiKey: shop ? `***${shop.apiKeyTail}` : null, // KHÔNG BAO GIỜ ghi key thật ra file/log
        posVia: shop?.via || null,
        tags: { ai: config.pkTags.ai, order: config.pkTags.order, handoff: config.pkTags.handoff },
        tagsVerified: tags.verified,
        tagsMissing: tags.missing,
        tagsNote: tags.note,
        products: kb.products || 0,
        checkedAt: new Date().toISOString(),
      };
    }

    // Page biến mất khỏi mọi token: GIỮ bản ghi, đánh dấu mất — xoá đi là mất luôn dấu
    // vết để điều tra "hôm qua page này còn chạy mà".
    for (const [id, prev] of Object.entries(registry)) {
      if (next[id]) continue;
      next[id] = { ...prev, tokenIdx: null, tokenFallbacks: [], lost: true, lostAt: prev.lostAt || new Date().toISOString() };
    }

    registry = next;
    lastRefresh = Date.now();
    try { fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2)); }
    catch (e) { console.error('[registry] lưu pages.json lỗi:', e.message); }

    const ok = state.filter((s) => !s.dead).length;
    console.log(`[registry] ${Object.keys(coverage).length} page · ${ok}/${state.length} token sống.`);
    return registry;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

let timer = null;
export function startPageRegistry() {
  if (timer || process.env.PAGE_REGISTRY === '0') return;
  if (!tokenSlots().length) { console.warn('[registry] không có token Pancake → không quét sổ cái page.'); return; }
  refreshRegistry().catch((e) => console.error('[registry] quét lỗi:', e.message));
  timer = setInterval(() => refreshRegistry().catch((e) => console.error('[registry] quét lỗi:', e.message)), REFRESH_MS);
  timer.unref?.(); // đừng giữ tiến trình sống chỉ vì cái hẹn giờ này (quan trọng cho `node --test`)
}
export function stopPageRegistry() { if (timer) { clearInterval(timer); timer = null; } }
