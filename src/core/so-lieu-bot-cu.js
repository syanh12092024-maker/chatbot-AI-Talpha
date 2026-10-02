// SỐ LIỆU CỦA BOT CŨ — đọc trong tiến trình, không qua `/admin/api` (CR-02-10 · MB1).
//
// Ba phép đo dưới đây trước sống trong handler của `src/admin.js` (`/orders` · `/token-cost`)
// và `src/admin-ops.js` (`/ops/conv-state`), và màn v3 chỉ với tới được bằng HTTP sang tiến
// trình bot v1. Chuyển nguyên văn ra đây để MỘT định nghĩa phục vụ cả hai nơi gọi cho tới khi
// `admin*.js` được gỡ (MB4) — hai bản của một phép đo là hai định nghĩa của một con số.
//
// ⚠️ ĐÂY LÀ SỐ LỊCH SỬ. Nguồn của cả ba (Sổ AI `ai-messages.jsonl`, `stats.json`,
//    `conv-state.json`, `ai-convs.json`) đứng im từ khi bot v1 thôi trả lời khách (28/08).
//    Màn đọc chúng phải tự khai khoảng đo (xem `v3/test/b/so-lieu-khai-khoang.test.mjs`).

import { config } from '../config.js';
import { pancakePages } from '../pancake.js';
import { tokenStats, aiConvsByPageInRange } from '../ai-log.js';
import { getStats } from '../stats.js';
import { ordersEnabled, aiOrderStats } from '../pancake-orders.js';
import { getAiConvSet } from '../ai-convs.js';
import { convStateStats, S } from '../conv-state.js';

const RGX_NGAY = /^\d{4}-\d{2}-\d{2}$/;
const ngay = (x) => (RGX_NGAY.test(x || '') ? x : undefined);

/* ─────────────────────────── chi phí token (cũ: GET /token-cost) ─────────────────────────── */

export function chiPhiToken({ from, to } = {}) {
  const st = tokenStats({ from: ngay(from), to: ngay(to) });
  const P = config.aiPrices;
  const pk = pancakePages();
  const usd = (b) => (b.tin * P.in + b.cread * P.cache + b.tout * P.out) / 1e6;
  // ĐƠN GIÁ THẬT — chia trên số tin CÓ SỐ ĐO, không chia trên tổng tin (token chỉ ghi từ 06/08).
  const unit = (b) => {
    const perReply = b.measured > 0 ? usd(b) / b.measured : null;
    const perOrder = perReply != null && b.orders > 0 ? perReply * (b.replies / b.orders) : null;
    return {
      usdPerReply: perReply == null ? null : +perReply.toFixed(6),
      vndPerReply: perReply == null ? null : Math.round(perReply * P.usdVnd),
      usdPerOrder: perOrder == null ? null : +perOrder.toFixed(4),
      vndPerOrder: perOrder == null ? null : Math.round(perOrder * P.usdVnd),
      repliesPerOrder: b.orders > 0 ? +(b.replies / b.orders).toFixed(1) : null,
    };
  };
  const pages = Object.entries(st.byPage)
    .map(([id, b]) => ({ id, name: pk.get(String(id))?.name || id, ...b, usd: +usd(b).toFixed(4), ...unit(b) }))
    .sort((a, b) => b.usd - a.usd);
  return {
    provider: config.aiProvider, prices: P,
    replies: st.replies, measured: st.measured,
    orders: st.orders,
    tin: st.tin, tout: st.tout, cread: st.cread, calls: st.calls,
    usd: +usd(st).toFixed(4), vnd: Math.round(usd(st) * P.usdVnd),
    ...unit(st),
    pages,
  };
}

/* ─────────────────────────── đơn AI ở POS (cũ: GET /orders) ─────────────────────────── */
// Bốn bài học cũ của handler giữ nguyên: lỗi một page thì GIỮ số lần trước (không tụt về 0) ·
// quét song song + đệm 5 phút · khoá chống quét chồng · khung có ngày thì tập hội thoại AI dựng
// từ Sổ AI theo đúng khoảng ngày đó.

const ORD_TTL = 5 * 60e3;
const ORD_CONC = 5;
const _ordCache = new Map();
const _ordInflight = new Map();

async function runPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

export async function donHangAi({ from, to } = {}) {
  if (!ordersEnabled()) return { enabled: false, pages: {} };
  from = ngay(from); to = ngay(to);
  const cacheKey = `${from || ''}|${to || ''}`;
  const hit = _ordCache.get(cacheKey);
  if (hit && Date.now() - hit.t < ORD_TTL) return hit.data;
  if (_ordInflight.has(cacheKey)) return _ordInflight.get(cacheKey);

  const scan = (async () => {
    const st = getStats();
    // CR-02-10 · MB4: `ai-enabled.json` (công tắc v1) đã gỡ — tập page lấy từ sổ số liệu của bot cũ.
    const ids = [...new Set(Object.keys(st.byPage))];
    const prev = hit?.data?.pages || {};
    const failed = [];
    const convByPage = (from || to) ? aiConvsByPageInRange({ from, to }) : null;
    const convSetOf = (id) => (convByPage ? (convByPage.get(String(id)) || new Set()) : getAiConvSet(id));
    const results = await runPool(ids, ORD_CONC, async (id) => {
      try {
        const r = await aiOrderStats(id, convSetOf(id), { from, to });
        return [id, { aiOrders: r.customers, aiOrderCount: r.orders }];
      } catch (e) {
        failed.push(id);
        console.warn(`[orders] page ${id} quét lỗi, giữ số lần trước: ${e.message}`);
        return [id, prev[id] || { aiOrders: 0, aiOrderCount: 0, stale: true }];
      }
    });
    const pages = Object.fromEntries(results);
    let totalAiOrders = 0;
    for (const v of Object.values(pages)) totalAiOrders += v.aiOrders || 0;
    const data = { enabled: true, aiOrders: totalAiOrders, pages, scannedAt: Date.now(), partial: failed.length > 0, failedPages: failed.length };
    _ordCache.set(cacheKey, { t: failed.length ? Date.now() - ORD_TTL + 60e3 : Date.now(), data });
    return data;
  })();

  _ordInflight.set(cacheKey, scan);
  try { return await scan; }
  finally { _ordInflight.delete(cacheKey); }
}

/* ─────────────────────────── phễu hội thoại (cũ: GET /ops/conv-state) ─────────────────────────── */

export function pheuHoiThoaiTho() {
  return { overall: convStateStats(), states: Object.values(S) };
}
