// M18 · OPS CONSOLE — router riêng, gắn vào admin.js bằng ĐÚNG 1 DÒNG.
// Spec: docs/v2/05-TANG-VAN-HANH.md §M18 · cập nhật docs/v2/09-VONG-2-CAP-NHAT.md §1③
//
// Đường dẫn /admin/api/ops/* → đã nằm sau Basic Auth của server.js, không tự dựng lớp
// đăng nhập riêng. Router riêng + trang HTML riêng vì 4 luồng v2 đang sửa song song
// (docs/v2/08-SONG-SONG.md §3).
//
// LUẬT VIẾT MÀN HÌNH NÀY: mỗi ô phải trả lời một câu hỏi mà HÔM NAY không ai trả lời được.
// Bốn câu đó là:
//   ① page nào KHÔNG chạy được và VÌ SAO            → /summary (một bảng, một màn hình)
//   ② Botcake đang chạy kịch bản gì, đâm vào AI mấy lần → /botcake + /botcake/collisions
//   ③ AI có đang TỰ KHOÁ CHÍNH MÌNH không            → /conv-state (M05 khoá oan)
//   ④ token nào phủ page nào, token chính có đúng là con phủ rộng nhất không → /tokens
//
// KHÔNG BAO GIỜ để lộ token/api_key: mọi chỗ chỉ hiện 4 ký tự cuối (ràng buộc L6).

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { healthReport, probeLlm, alertText, dailyText, healthConfig, startHealthWatchdog, lastProbe, BOOT_AT } from './health.js';
import { listTemplates, addTemplate, removeTemplate, reloadTemplates, matchTemplate } from './bot-registry.js';
import { botcakeYieldStats, sendHealth } from './pancake-poll.js';
import { blockedLog, blockedStats } from './outbound-guard.js';
import { convStateStats, allConvStates, S } from './conv-state.js';
import { tokenHealth, getRegistry, registryAge } from './page-registry.js';
import { allReadiness, LADDER } from './readiness.js';
import { economics } from './economics.js';
import { listAiEnabled, isAiEnabled } from './store.js';
import { pancakePages, pkGetMessages } from './pancake.js';
import { readLog } from './ai-log.js';
import { isOurFixedMessage } from './our-messages.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCKS_FILE = path.join(ROOT, 'botcake-locks.json');

export const opsRouter = express.Router();

const HOUR = 3600e3;
const DAY = 24 * HOUR;

// Ngưỡng của L6 (docs/v2/09-VONG-2-CAP-NHAT.md §1③). Ra env vì chúng là NGƯỠNG NGHI NGỜ,
// không phải hằng số vật lý — đo thêm vài tuần production là phải chỉnh.
export const opsConfig = {
  handoffPct: Number(process.env.OPS_HANDOFF_PCT || 15),   // >15% hội thoại bị khoá = nghi khoá oan
  yieldPct: Number(process.env.OPS_YIELD_PCT || 50),       // >50% lượt bị nhường = Botcake lấn hết
  scanConvs: Number(process.env.OPS_SCAN_CONVS || 60),     // trần số hội thoại 1 lượt quét va chạm
  scanConc: Number(process.env.OPS_SCAN_CONC || 5),
};

const pageNames = () => {
  const pk = pancakePages();
  const reg = getRegistry();
  const m = new Map([...pk].map(([id, v]) => [String(id), v?.name || String(id)]));
  for (const [id, r] of Object.entries(reg)) if (!m.has(id) && r?.name) m.set(id, r.name);
  return m;
};

// convId của Pancake là `pageId_psid` (xem ai-log.js §recentConversations). Đây là ĐƯỜNG DUY
// NHẤT để quy trạng thái hội thoại về page: conv-state.js không lưu pageId, mà file đó thuộc
// luồng khác nên không được thêm trường (08-SONG-SONG §3).
export const pageOfConv = (convId) => String(convId || '').split('_')[0] || '';

const readJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const writeJson = (f, v) => { try { fs.writeFileSync(f, JSON.stringify(v, null, 2)); return true; } catch (e) { console.error('[ops] ghi', path.basename(f), 'lỗi:', e.message); return false; } };

// ─────────────────────────────────────────────────────────────────────────────
// GIÁM SÁT M05 — "AI có đang tự khoá chính mình không"
//
// Đo mô phỏng production trên 60 hội thoại thật: 45% bị khoá HANDOFF vì cho rằng người
// thật đã tiếp quản. Sau khi vá thì phần lớn ca còn lại đúng là sale gõ thật, NHƯNG sổ
// nhận diện template mới phủ 32,1% tin page — 67,9% còn lại là VÙNG ĐOÁN, và đoán sai
// nghĩa là AI im vĩnh viễn trên một hội thoại đang bán được.
// Vì thế màn hình này không chỉ hiện % — nó hiện ĐÚNG CÂU đã kích hoạt khoá, để người
// đọc câu đó và tự kết luận oan hay không.
// ─────────────────────────────────────────────────────────────────────────────

const HUMAN_REASON = /^nhân viên đã tiếp quản:\s*"?([\s\S]*?)"?$/;

export function convStateByPage({ states = allConvStates(), now = Date.now() } = {}) {
  const byPage = new Map();
  const triggers = [];
  for (const [convId, c] of states) {
    const page = pageOfConv(convId);
    let g = byPage.get(page);
    if (!g) { g = { page, total: 0, byState: {}, byOwner: {}, handoff: 0, humanLocked: 0 }; byPage.set(page, g); }
    g.total++;
    g.byState[c.state] = (g.byState[c.state] || 0) + 1;
    g.byOwner[c.owner] = (g.byOwner[c.owner] || 0) + 1;
    if (c.state === S.HANDOFF) g.handoff++;
    if (c.state === S.HANDOFF && c.humanAt) {
      g.humanLocked++;
      const m = HUMAN_REASON.exec(String(c.lastReason || ''));
      triggers.push({
        conv: convId, page,
        text: m ? m[1] : String(c.lastReason || ''),
        humanAt: c.humanAt,
        ageHours: +((now - c.humanAt) / HOUR).toFixed(1),
        aiTurns: c.aiTurns || 0,
        lastAiText: String(c.lastAiText || '').slice(0, 120),
      });
    }
  }
  triggers.sort((a, b) => b.humanAt - a.humanAt);
  const rows = [...byPage.values()].map((g) => ({
    ...g,
    handoffPct: g.total > 0 ? +((g.handoff / g.total) * 100).toFixed(1) : null,
    level: g.total >= 5 && (g.handoff / g.total) * 100 > opsConfig.handoffPct ? 'red' : 'green',
  })).sort((a, b) => (b.handoffPct || 0) - (a.handoffPct || 0));
  return { rows, triggers };
}

// Số lần AI NHƯỜNG Botcake, so với lượng việc SINH RA TỪ LÚC KHỞI ĐỘNG.
// yieldCount trong pancake-poll.js là bộ đếm RAM → mẫu số bắt buộc phải cùng mốc, nếu
// không thì tỷ lệ chỉ là hai con số không cùng đơn vị đặt cạnh nhau.
export function yieldByPage({ rows, now = Date.now(), since = BOOT_AT, yields = botcakeYieldStats() } = {}) {
  const R = rows || readLog();
  const replies = new Map();
  for (const r of R) {
    if (r.type !== 'reply' || r.t < since) continue;
    const p = String(r.page);
    replies.set(p, (replies.get(p) || 0) + 1);
  }
  const out = [];
  const seen = new Set();
  for (const y of yields) {
    const p = String(y.page);
    seen.add(p);
    const spoke = replies.get(p) || 0;
    const denom = y.total + spoke;
    const pctY = denom > 0 ? +((y.total / denom) * 100).toFixed(1) : null;
    out.push({
      page: p, before: y.before, send: y.send, yields: y.total, replies: spoke,
      yieldPct: pctY,
      level: denom >= 10 && pctY != null && pctY > opsConfig.yieldPct ? 'red' : 'green',
    });
  }
  for (const [p, spoke] of replies) {
    if (!seen.has(p)) out.push({ page: p, before: 0, send: 0, yields: 0, replies: spoke, yieldPct: 0, level: 'green' });
  }
  out.sort((a, b) => (b.yieldPct || 0) - (a.yieldPct || 0));
  return { since, rows: out };
}

// ─────────────────────────────────────────────────────────────────────────────
// VA CHẠM BOTCAKE — đếm số lần template Botcake xuất hiện TRONG PHIÊN AI
//
// Không có bộ đếm sẵn nào trả lời được câu này: `botcakeYieldStats()` chỉ đếm những lần AI
// KỊP nhường, tức là các ca ĐÃ được xử lý. Va chạm là các ca KHÔNG kịp — muốn biết thì
// phải mở lại hội thoại thật mà đọc.
//
// Ba quyết định để con số này đối chiếu tay được (nghiệm thu: ≥20 hội thoại thật):
//   ① chỉ quét hội thoại mà AI THẬT SỰ đã nói trong cửa sổ (lấy từ Sổ AI), không quét mò
//   ② mốc "trong phiên AI" tính theo VỊ TRÍ tin, không theo thời gian — timestamp Pancake
//      không kèm múi giờ, Date.parse hiểu lệch nhiều giờ (xem pancake-poll.js §debounce)
//   ③ hội thoại nào không nhìn thấy tin AI trong 25 tin gần nhất thì KHÔNG đếm và được
//      báo riêng, chứ không âm thầm tính là "0 va chạm"
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

// Tin page này là của CHÍNH BOT MÌNH? (Sổ AI lưu 80 ký tự đầu của tin AI)
// Cùng luật với conv-owner.js §isOurs — chép lại 6 dòng thay vì export thêm từ file của
// luồng khác (08-SONG-SONG §3).
function isOurs(text, aiTexts) {
  const t = norm(text);
  if (!t) return false;
  for (const a of aiTexts) {
    const n = norm(a);
    if (!n || n.length < 8) continue;
    if (t.startsWith(n.slice(0, Math.min(n.length, 60)))) return true;
    if (n.startsWith(t.slice(0, 60))) return true;
  }
  return false;
}

/** Gom các hội thoại AI đã nói trong `hours` giờ qua, từ Sổ AI. */
export function aiSessions({ rows, hours = 24, now = Date.now() } = {}) {
  const cut = now - hours * HOUR;
  const map = new Map();
  for (const r of (rows || readLog())) {
    if (r.type !== 'reply' || r.t < cut || !r.conv) continue;
    const k = `${r.page}|${r.cust}`;
    let g = map.get(k);
    if (!g) { g = { page: String(r.page), cust: String(r.cust), conv: r.conv, name: r.name || '', lastAt: 0, replies: 0, aiTexts: [] }; map.set(k, g); }
    g.conv = r.conv || g.conv;
    if (r.name) g.name = r.name;
    if (r.t > g.lastAt) g.lastAt = r.t;
    g.replies++;
    if (r.text) g.aiTexts.push(r.text);
  }
  return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
}

/**
 * Soi 1 hội thoại: các tin PAGE là template máy, nằm SAU tin AI đầu tiên nhìn thấy được.
 * Tách khỏi phần gọi mạng để test được bằng dữ liệu tin thật, không cần Pancake.
 */
export function collisionsInConv({ pageId, msgs, aiTexts = [] }) {
  const list = Array.isArray(msgs) ? msgs : [];
  const isPage = (m) => String(m?.from?.id) === String(pageId);
  const textOf = (m) => String(m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  let aiAt = -1;
  for (let i = 0; i < list.length; i++) {
    if (!isPage(list[i])) continue;
    const t = textOf(list[i]);
    if (t && (isOurs(t, aiTexts) || isOurFixedMessage(t))) { aiAt = i; break; }
  }
  if (aiAt < 0) return { aiSeen: false, hits: [] };

  const hits = [];
  for (let i = aiAt + 1; i < list.length; i++) {
    if (!isPage(list[i])) continue;
    const t = textOf(list[i]);
    if (!t) continue;
    if (isOurs(t, aiTexts) || isOurFixedMessage(t)) continue;  // tin của chính mình, không phải va chạm
    const m = matchTemplate(t);
    if (m.hit) hits.push({ text: t.slice(0, 200), pattern: m.pattern, kind: m.kind, builtin: m.builtin });
  }
  return { aiSeen: true, hits };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// Kết quả lượt quét gần nhất — bảng chính đọc lại để hiện cột "Va chạm 24h" mà không
// phải tự bắn hàng chục lời gọi Pancake mỗi lần ai đó mở dashboard.
let lastScan = null;

export async function scanCollisions({ hours = 24, limit = opsConfig.scanConvs, now = Date.now() } = {}) {
  const sessions = aiSessions({ hours, now });
  const take = sessions.slice(0, limit);
  const names = pageNames();

  const results = await pool(take, opsConfig.scanConc, async (s) => {
    try {
      const msgs = await pkGetMessages(s.page, s.conv, s.cust);
      const r = collisionsInConv({ pageId: s.page, msgs, aiTexts: s.aiTexts });
      return { ...s, ...r, error: '' };
    } catch (e) {
      return { ...s, aiSeen: false, hits: [], error: String(e?.message || e).slice(0, 160) };
    }
  });

  const byPage = new Map();
  const byPattern = new Map();
  const samples = [];
  let checked = 0; let noAiWindow = 0; let failed = 0;

  for (const r of results) {
    if (r.error) { failed++; continue; }
    if (!r.aiSeen) { noAiWindow++; continue; }
    checked++;
    const g = byPage.get(r.page) || { page: r.page, name: names.get(r.page) || r.page, convs: 0, collisions: 0, convsHit: 0 };
    g.convs++;
    if (r.hits.length) { g.collisions += r.hits.length; g.convsHit++; }
    byPage.set(r.page, g);
    for (const h of r.hits) {
      byPattern.set(h.pattern, (byPattern.get(h.pattern) || 0) + 1);
      samples.push({
        page: r.page, pageName: names.get(r.page) || r.page, conv: r.conv, cust: r.cust,
        custName: r.name, text: h.text, pattern: h.pattern, kind: h.kind, builtin: h.builtin,
        link: `https://pancake.vn/${r.page}?c_id=${r.conv}`,
      });
    }
  }

  const out = {
    at: now, hours,
    sessions: sessions.length,
    scanned: take.length,
    // KHÔNG cắt bớt trong im lặng: nếu có hội thoại không được quét thì nói ra ngay ở
    // đây, để con số va chạm không bị đọc thành "đã soi hết".
    skipped: Math.max(0, sessions.length - take.length),
    checked, noAiWindow, failed,
    collisions: samples.length,
    byPage: [...byPage.values()].sort((a, b) => b.collisions - a.collisions),
    byPattern: [...byPattern.entries()].map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count),
    samples: samples.slice(0, 200),
  };
  lastScan = out;
  return out;
}

export const lastCollisionScan = () => lastScan;

// ─────────────────────────────────────────────────────────────────────────────
// "Điều kiện khoá đã đặt chưa" — đánh dấu TAY
//
// Botcake không có API đọc nội dung flow (đã test thật, xem 09-VONG-2-CAP-NHAT.md §1②),
// nên không có cách nào TỰ BIẾT kịch bản đã cài điều kiện thẻ hay chưa. Người vào Botcake
// đặt điều kiện rồi tick vào đây. Ô này thành thật về chỗ đó: nó ghi AI ĐÃ NÓI GÌ, chứ
// không giả vờ là đã kiểm chứng.
// ─────────────────────────────────────────────────────────────────────────────

export const LOCK_GUIDE = [
  'Mở Botcake → từng kịch bản từ khoá của page.',
  'Thêm điều kiện: KHÔNG chạy nếu hội thoại có thẻ "AI Chăm" / "AI Chốt" / "AI back Sale".',
  'Lưu, rồi nhắn thử 1 tin từ khoá vào page đang có thẻ AI — kịch bản phải IM.',
  'Im rồi thì quay lại đây tick "đã khoá"; số "Va chạm 24h" của page phải tụt trong ngày hôm sau.',
];

const readLocks = () => readJson(LOCKS_FILE, {});
export function setLock(pageId, { locked, note, by } = {}) {
  const all = readLocks();
  const id = String(pageId);
  all[id] = { locked: !!locked, note: String(note || '').slice(0, 200), by: String(by || '').slice(0, 60), at: Date.now() };
  writeJson(LOCKS_FILE, all);
  return all[id];
}

// ─────────────────────────────────────────────────────────────────────────────
// BẢNG PAGE — màn hình chính
// ─────────────────────────────────────────────────────────────────────────────

export function pageTable({ now = Date.now(), days = 7 } = {}) {
  const rows = allReadiness();
  const names = pageNames();
  const reg = getRegistry();
  const locks = readLocks();
  const scan = lastScan;
  const back = new Map(sendHealth().map((s) => [String(s.page), s]));
  // Sổ AI đọc lại tốn công (15.970 dòng lúc 10/08/2026) — đọc MỘT lần rồi chuyền tay,
  // đừng để mỗi lần ai đó bấm F5 là hai lượt quét cả sổ.
  const logRows = readLog();
  const yields = new Map(yieldByPage({ now, rows: logRows }).rows.map((y) => [y.page, y]));
  const convByPage = new Map(convStateByPage({ now }).rows.map((r) => [r.page, r]));

  const econ = economics({ fromMs: now - days * DAY, toMs: now, groupBy: ['page'], rows: logRows });
  const eco = new Map(econ.groups.map((g) => [String(g.dims.page), g]));

  const scanByPage = new Map((scan?.byPage || []).map((p) => [String(p.page), p]));

  const out = rows.map((r) => {
    const id = String(r.pageId);
    const rec = reg[id] || null;
    const e = eco.get(id) || null;
    const b = back.get(id) || null;
    const y = yields.get(id) || null;
    const cs = convByPage.get(id) || null;
    const lock = locks[id] || null;
    const col = scanByPage.get(id) || null;

    const warn = [];
    for (const x of r.blockers) warn.push({ level: 'red', text: `${LADDER[x.code]?.label || x.code}: ${x.detail}` });
    if (b && b.pausedUntil > now) warn.push({ level: 'red', text: `tạm ngừng gửi ${Math.ceil((b.pausedUntil - now) / 60000)} phút — ${b.lastError}` });
    if (cs?.level === 'red') warn.push({ level: 'red', text: `${cs.handoffPct}% hội thoại bị khoá HANDOFF (ngưỡng ${opsConfig.handoffPct}%) — nghi khoá oan` });
    if (y?.level === 'red') warn.push({ level: 'red', text: `AI nhường Botcake ${y.yieldPct}% số lượt (ngưỡng ${opsConfig.yieldPct}%) — Botcake đang lấn hết phần AI` });
    if (col && col.collisions > 0) warn.push({ level: 'orange', text: `${col.collisions} va chạm Botcake trong phiên AI (${col.convsHit}/${col.convs} hội thoại)` });
    for (const x of r.warnings) warn.push({ level: 'orange', text: `${LADDER[x.code]?.label || x.code}: ${x.detail}` });

    return {
      pageId: id,
      name: names.get(id) || r.name || id,
      marketer: r.marketer, market: r.market,
      aiEnabled: r.aiEnabled,
      aiAllowed: r.aiAllowed,
      readiness: r.readiness,
      readinessLabel: LADDER[r.readiness]?.label || r.readiness,
      botcake: {
        locked: lock ? lock.locked : null,       // null = chưa ai đánh dấu (≠ chưa khoá)
        lockNote: lock?.note || '', lockAt: lock?.at || 0,
        collisions: col ? col.collisions : null, // null = lượt quét gần nhất không phủ page này
        convsHit: col?.convsHit || 0, convs: col?.convs || 0,
        yieldPct: y?.yieldPct ?? null, yields: y?.yields || 0, yieldLevel: y?.level || 'green',
      },
      tags: rec ? (rec.tagsVerified === null ? null : rec.tagsVerified) : null,
      tagsMissing: rec?.tagsMissing || [],
      pos: rec ? !!rec.posShopId : null,
      posVia: rec?.posVia || '',
      handoffPct: cs?.handoffPct ?? null,
      handoffLevel: cs?.level || 'green',
      convs: cs?.total || 0,
      leads: e?.leads || 0, orders: e?.orders || 0,
      closeRatePct: e?.closeRatePct ?? null,
      vndPerOrder: e?.vndPerOrder ?? null,
      repliesPerOrder: e?.repliesPerOrder ?? null,
      replies: e?.replies || 0,
      warnings: warn,
      level: warn.some((w) => w.level === 'red') ? 'red' : (warn.length ? 'orange' : 'green'),
    };
  });

  out.sort((a, b) => {
    const rank = (x) => (x.level === 'red' ? 0 : x.level === 'orange' ? 1 : 2);
    return rank(a) - rank(b) || Number(b.aiEnabled) - Number(a.aiEnabled) || String(a.name).localeCompare(String(b.name));
  });
  return {
    at: now, days,
    pages: out,
    totals: {
      pages: out.length,
      aiEnabled: out.filter((p) => p.aiEnabled).length,
      blocked: out.filter((p) => !p.aiAllowed).length,
      runningButBlocked: out.filter((p) => p.aiEnabled && !p.aiAllowed).length,
      red: out.filter((p) => p.level === 'red').length,
      leads: econ.totals.leads, orders: econ.totals.orders,
      closeRatePct: econ.totals.closeRatePct, vndPerOrder: econ.totals.vndPerOrder,
    },
    collisionScan: scan ? { at: scan.at, hours: scan.hours, checked: scan.checked, collisions: scan.collisions } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB TOKEN
//
// Cảnh báo cốt lõi: thứ tự token trong `.env` LÀ thứ tự failover, nên token #1 phải là con
// phủ NHIỀU PAGE BẬT AI nhất. Nếu không, mỗi lần failover là một lần rơi mất phần lớn page.
// ─────────────────────────────────────────────────────────────────────────────

export function tokenTable({ health = tokenHealth(), reg = getRegistry(), aiPages = listAiEnabled() } = {}) {
  const ai = new Set(aiPages.map(String));
  const cover = new Map();  // idx -> { pages, aiPages, names }
  for (const [id, rec] of Object.entries(reg)) {
    for (const idx of (rec.tokensAll || [])) {
      const c = cover.get(idx) || { pages: 0, aiPages: 0 };
      c.pages++;
      if (ai.has(String(id))) c.aiPages++;
      cover.set(idx, c);
    }
  }
  const rows = health.map((t) => {
    const c = cover.get(t.idx) || { pages: 0, aiPages: 0 };
    return {
      idx: t.idx, no: t.idx + 1, source: t.source, name: t.name,
      // ⛔ 4 KÝ TỰ CUỐI, không hơn. page-registry trả về 8 — cắt lại ở đây vì đây là chỗ
      //    dữ liệu đi thẳng ra HTML công khai (ràng buộc L6).
      tail: String(t.tail || '').slice(-4),
      exp: t.exp || 0, dead: !!t.dead, error: t.error || '',
      scanned: t.pages || 0,       // số page token này quét được ở lượt refresh gần nhất
      pages: c.pages, aiPages: c.aiPages,
    };
  });

  const alive = rows.filter((r) => !r.dead);
  const best = alive.reduce((a, b) => (b.aiPages > (a?.aiPages ?? -1) ? b : a), null);
  const first = alive[0] || null;
  const warnings = [];
  if (first && best && best.idx !== first.idx) {
    warnings.push(`Token #${first.no} (${first.source}) chỉ phủ ${first.aiPages}/${ai.size} page bật AI, trong khi token #${best.no} phủ ${best.aiPages}. Thứ tự trong .env = thứ tự failover — cân nhắc đổi #${best.no} lên đầu.`);
  }
  for (const r of rows.filter((x) => x.dead)) warnings.push(`Token #${r.no} (${r.source}) CHẾT: ${r.error || 'không rõ'} — ${r.aiPages} page bật AI đang phụ thuộc token này.`);
  // CHỈ xét page mà sổ cái M01 ĐÃ quét. Chưa có bản ghi = CHƯA BIẾT, không phải "không có
  // token" — cùng lá chắn readiness.js dùng, nếu không thì một lượt quét chưa chạy xong sẽ
  // báo cả 39 page mất token.
  const byIdx = new Map(rows.map((r) => [r.idx, r]));
  const uncovered = [...ai].filter((id) => reg[id] && !(reg[id].tokensAll || []).some((i) => byIdx.get(i) && !byIdx.get(i).dead));
  if (uncovered.length) warnings.push(`${uncovered.length} page ĐANG BẬT AI không còn token sống nào phủ: ${uncovered.slice(0, 6).join(', ')}${uncovered.length > 6 ? '…' : ''}`);

  return { rows, aiPages: ai.size, registryAgeMs: registryAge(), warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

opsRouter.get('/ui', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'ops.html')));

opsRouter.get('/summary', (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const t = pageTable({ days });
    const h = healthReport();
    res.json({ ...t, health: { level: h.level, red: h.red, orange: h.orange, checks: h.checks, llm: h.llm, probe: h.probe, context: h.context } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

opsRouter.get('/health', (_req, res) => {
  try { res.json(healthReport()); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Bản tin sẽ gửi ra WhatsApp — XEM TRƯỚC, không gửi. Để người ta biết cái còi kêu ra sao
// trước khi nó kêu lúc 2h sáng.
opsRouter.get('/health/preview', (req, res) => {
  try {
    const rep = healthReport();
    res.json({ kind: req.query.kind === 'daily' ? 'daily' : 'alert', text: req.query.kind === 'daily' ? dailyText(rep) : alertText(rep), config: healthConfig, lastProbe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dò LLM NGAY (tốn ~20 token) — nút "credit còn hay hết, trả lời tôi bây giờ".
opsRouter.post('/health/probe', async (_req, res) => {
  try { res.json(await probeLlm()); } catch (e) { res.status(500).json({ error: e.message }); }
});

opsRouter.get('/tokens', (_req, res) => {
  try { res.json(tokenTable()); } catch (e) { res.status(500).json({ error: e.message }); }
});

opsRouter.get('/blocked', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const names = pageNames();
  res.json({
    ...blockedStats(),
    max: 500, note: 'sổ giữ trong RAM, trần 500 bản ghi — restart là mất',
    list: blockedLog(limit).map((b) => ({ ...b, pageName: names.get(String(b.page)) || b.page })),
  });
});

opsRouter.get('/conv-state', (req, res) => {
  try {
    const now = Date.now();
    const names = pageNames();
    const { rows, triggers } = convStateByPage({ now });
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    res.json({
      overall: convStateStats(),
      threshold: opsConfig.handoffPct,
      states: Object.values(S),
      pages: rows.map((r) => ({ ...r, name: names.get(r.page) || r.page })),
      yields: yieldByPage({ now }),
      yieldThreshold: opsConfig.yieldPct,
      // Danh sách tin ĐÃ KÍCH HOẠT KHOÁ — chỗ để người soi xem AI bị khoá oan hay không.
      triggers: triggers.slice(0, limit).map((t) => ({
        ...t, name: names.get(t.page) || t.page,
        link: `https://pancake.vn/${t.page}?c_id=${t.conv}`,
      })),
      triggerTotal: triggers.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

opsRouter.get('/botcake', (_req, res) => {
  try {
    const names = pageNames();
    const locks = readLocks();
    const now = Date.now();
    const scan = lastScan;
    const byPage = new Map((scan?.byPage || []).map((p) => [String(p.page), p]));
    const y = new Map(yieldByPage({ now }).rows.map((r) => [r.page, r]));
    const ids = new Set([...listAiEnabled().map(String), ...Object.keys(locks), ...byPage.keys(), ...y.keys()]);
    res.json({
      templates: listTemplates(),
      guide: LOCK_GUIDE,
      apiNote: 'API Botcake CHỈ ĐỌC và không trả về nội dung flow (đã test thật 11/08/2026 — xem docs/v2/09-VONG-2-CAP-NHAT.md §1②). Cột "đã khoá" vì thế là ĐÁNH DẤU TAY, không phải kiểm chứng tự động.',
      scan: scan ? { at: scan.at, hours: scan.hours, sessions: scan.sessions, scanned: scan.scanned, skipped: scan.skipped, checked: scan.checked, noAiWindow: scan.noAiWindow, failed: scan.failed, collisions: scan.collisions, byPattern: scan.byPattern } : null,
      pages: [...ids].map((id) => {
        const c = byPage.get(id) || null;
        return {
          pageId: id, name: names.get(id) || id, aiEnabled: isAiEnabled(id),
          locked: locks[id] ? locks[id].locked : null,
          lockNote: locks[id]?.note || '', lockAt: locks[id]?.at || 0, lockBy: locks[id]?.by || '',
          collisions: c ? c.collisions : null, convsHit: c?.convsHit || 0, convs: c?.convs || 0,
          yieldPct: y.get(id)?.yieldPct ?? null, yields: y.get(id)?.yields || 0,
        };
      }).sort((a, b) => (b.collisions || 0) - (a.collisions || 0) || String(a.name).localeCompare(String(b.name))),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

opsRouter.post('/botcake/templates', (req, res) => {
  const pattern = String(req.body?.pattern || '').trim();
  if (!pattern) return res.status(400).json({ error: 'thiếu mẫu' });
  if (!addTemplate(pattern)) return res.status(400).json({ error: 'mẫu không phải regex hợp lệ (hoặc ghi file lỗi)' });
  res.json({ ok: true, ...listTemplates() });
});

opsRouter.delete('/botcake/templates', (req, res) => {
  const r = removeTemplate(String(req.query.pattern || req.body?.pattern || ''));
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, ...listTemplates() });
});

// Thử một tin thật xem sổ nhận diện có bắt không — nút [Test] của spec.
opsRouter.post('/botcake/test', (req, res) => {
  const text = String(req.body?.text || '');
  if (!text) return res.status(400).json({ error: 'thiếu nội dung tin' });
  res.json({ text: text.slice(0, 400), ...matchTemplate(text) });
});

opsRouter.post('/botcake/reload', (_req, res) => res.json({ ok: true, patterns: reloadTemplates() }));

opsRouter.post('/botcake/lock', (req, res) => {
  const pageId = String(req.body?.pageId || '').trim();
  if (!pageId) return res.status(400).json({ error: 'thiếu pageId' });
  res.json({ ok: true, lock: setLock(pageId, req.body) });
});

// Quét va chạm — CÓ gọi mạng (Pancake), nên là POST và chỉ chạy khi người ta bấm.
opsRouter.post('/botcake/collisions', async (req, res) => {
  try {
    const hours = Math.min(Math.max(Number(req.body?.hours) || 24, 1), 24 * 7);
    const limit = Math.min(Math.max(Number(req.body?.limit) || opsConfig.scanConvs, 1), 300);
    res.json(await scanCollisions({ hours, limit }));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

opsRouter.get('/botcake/collisions', (_req, res) => res.json(lastScan || { at: 0, collisions: 0, samples: [], byPage: [], byPattern: [], note: 'chưa quét lần nào' }));

// ─────────────────────────────────────────────────────────────────────────────
// M19 · bật bộ canh sức khoẻ TỪ ĐÂY
//
// `server.js` là file chung của mọi luồng (08-SONG-SONG §3) nên không được thêm dòng khởi
// động vào đó. Cùng cách admin-economics.js bật báo cáo tuần: bộ hẹn giờ sống trong router
// của chính luồng mình. `startHealthWatchdog()` tự tắt khi PANCAKE_READONLY=1 (máy local)
// hoặc HEALTH=0, nên import file này ở test cũng không bắn tin đi đâu.
// ─────────────────────────────────────────────────────────────────────────────
const hw = startHealthWatchdog();
if (!hw.started) console.log(`[health] watchdog TẮT — ${hw.why}`);
