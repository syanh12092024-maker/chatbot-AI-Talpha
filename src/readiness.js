// M03 · READINESS GATE & ALERT — chặn bot chạy trên page chưa sẵn sàng, nhắc đúng người.
// Spec: docs/v2/01-TANG-NHAP-LIEU.md § M03
//
// ĐIỀU QUAN TRỌNG NHẤT CỦA MODULE NÀY KHÔNG PHẢI CÁI THANG 7 BẬC, MÀ LÀ VIỆC TÁCH
// HAI MỨC CẢNH BÁO. Số đo 11/08/2026:
//     MISSING_SCRIPT (thiếu greeting HOẶC salesPrompt) →  1 page  → PHẢI CHẶN
//     THIN_SCRIPT    (thiếu tone / salesPrompt mỏng)   → 37 page  → chỉ nhắc
// Gộp chung thành "38 page chưa sẵn sàng" là cách chắc chắn nhất để biến cảnh báo
// thành tiếng ồn: một bản tin 38 dòng đỏ thì cái dòng thật sự chặn bot nằm lẫn ở
// giữa và không ai tìm ra. Hai danh sách, hai mức, hai màu.

import { getPageConfig, getPageList, getPageProductsRaw, getScriptDoc, approxTokens, hasScript } from './kb.js';
import { getPageRecord, getRegistry } from './page-registry.js';
import { pancakePages } from './pancake.js';
import { isAiEnabled, setAiEnabled } from './store.js';
import { getStats } from './stats.js';
import { sendToGroup } from './wa.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình
// ─────────────────────────────────────────────────────────────────────────────
export const readinessConfig = {
  digestAt: /^\d{1,2}:\d{2}$/.test(process.env.READINESS_DIGEST_AT || '') ? process.env.READINESS_DIGEST_AT : '09:00',
  alertWa: process.env.READINESS_ALERT_WA || '',        // jid nhận cảnh báo TỨC THÌ
  staleDays: Number(process.env.SCRIPT_STALE_DAYS || 30),
  thinTokens: Number(process.env.SCRIPT_THIN_TOKENS || 500), // salesPrompt mỏng hơn mức này → nhắc
  // TỰ TẮT AI khi page đang chạy rơi xuống trạng thái chặn. MẶC ĐỊNH TẮT, và đây là
  // chủ ý: bật lên nghĩa là trao cho module này quyền tắt bot trên page đang ra đơn.
  // Chỉ bật sau khi đã xem bản tin vài ngày và tin rằng nó không báo động giả.
  autoDisable: process.env.READINESS_AUTO_DISABLE === '1',
  sweepMs: Number(process.env.READINESS_SWEEP_MS || 15 * 60 * 1000),
};

// Thang trạng thái. `blocks` = AI KHÔNG được bật.
export const LADDER = {
  NO_TOKEN: { blocks: true, label: 'không token nào phủ page' },
  MISSING_TAGS: { blocks: true, label: 'thiếu thẻ Pancake' },
  MISSING_PRODUCT: { blocks: true, label: 'Sheet chưa có sản phẩm/giá' },
  MISSING_SCRIPT: { blocks: true, label: 'thiếu kịch bản bán' },
  MISSING_POS: { blocks: false, label: 'chưa map shop POS' },
  THIN_SCRIPT: { blocks: false, label: 'kịch bản mỏng' },
  SCRIPT_STALE: { blocks: false, label: 'kịch bản cũ, chốt kém' },
  READY: { blocks: false, label: 'đủ điều kiện' },
};

const daysSince = (iso) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? (Date.now() - t) / 86400000 : null; };

// ─────────────────────────────────────────────────────────────────────────────
// Tính readiness cho 1 page
//
// Trả về CẢ HAI danh sách (blockers + warnings) chứ không chỉ một chữ `readiness`.
// Một page có thể vừa thiếu thẻ vừa kịch bản mỏng; ép về một nhãn duy nhất là
// giấu mất việc còn lại, rồi marketer sửa xong một thứ lại thấy page vẫn đỏ.
// ─────────────────────────────────────────────────────────────────────────────
export function computeReadiness(pageId, opts = {}) {
  const id = String(pageId);
  const cfg = opts.config || getPageConfig(id);
  const rec = opts.record !== undefined ? opts.record : getPageRecord(id);
  const products = opts.products != null ? opts.products : getPageProductsRaw(id).length;
  const stats = opts.stats || null;

  const blockers = [];
  const warnings = [];
  const missing = []; // các trường kịch bản còn trống — để ghi thẳng vào bản tin

  // ① Token. Chỉ kết luận khi sổ cái M01 ĐÃ QUÉT page này. Chưa có bản ghi = chưa
  //    biết, không phải "không có token" — đừng chặn vì thiếu thông tin.
  if (rec && rec.tokenIdx == null) blockers.push({ code: 'NO_TOKEN', detail: rec.lost ? 'page không còn thấy ở token nào' : 'mọi token phủ page đều đã chết' });

  // ② Thẻ Pancake. `tagsVerified === null` = chưa đọc được bảng thẻ (xem page-registry.js)
  //    → CHƯA BIẾT, không chặn. Chỉ `false` mới là chắc chắn thiếu.
  if (rec && rec.tagsVerified === false) blockers.push({ code: 'MISSING_TAGS', detail: `thiếu thẻ: ${(rec.tagsMissing || []).join(', ')}` });

  // ③ Sản phẩm/giá.
  if (!products) blockers.push({ code: 'MISSING_PRODUCT', detail: 'Sheet chưa có sản phẩm/giá cho page này' });

  // ④ Kịch bản — mức CHẶN.
  if (!cfg.greeting) missing.push('câu chào');
  if (!cfg.salesPrompt) missing.push('cách bán');
  if (!hasScript(cfg)) blockers.push({ code: 'MISSING_SCRIPT', detail: `thiếu: ${missing.join(', ')}` });

  // ⑤ POS — KHÔNG chặn. AI vẫn tư vấn và chốt được, chỉ là không đẩy nổi đơn sang POS.
  if (rec && !rec.posShopId) warnings.push({ code: 'MISSING_POS', detail: 'chưa map shop POS — AI chốt được nhưng không tạo được đơn thật' });

  // ⑥ Kịch bản mỏng — chỉ nhắc. Đây là ô 37 page.
  if (hasScript(cfg)) {
    const thin = [];
    if (!cfg.tone) thin.push('chưa điền giọng điệu');
    const tok = approxTokens(cfg.salesPrompt);
    if (tok < readinessConfig.thinTokens) thin.push(`cách bán ngắn (~${tok} token < ${readinessConfig.thinTokens})`);
    if (thin.length) warnings.push({ code: 'THIN_SCRIPT', detail: thin.join(' · ') });
  }

  // ⑦ Kịch bản cũ + chốt kém. Cần CẢ HAI điều kiện: cũ mà vẫn ra đơn thì không phải vấn đề.
  const age = daysSince(opts.updatedAt);
  if (age != null && age > readinessConfig.staleDays && stats) {
    const rate = stats.leads > 0 ? stats.orders / stats.leads : null;
    if (rate != null && rate < 0.01) warnings.push({ code: 'SCRIPT_STALE', detail: `${Math.round(age)} ngày chưa đụng, tỉ lệ chốt ${(rate * 100).toFixed(1)}%` });
  }

  const readiness = blockers[0]?.code || warnings[0]?.code || 'READY';
  return {
    pageId: id, readiness, aiAllowed: blockers.length === 0,
    blockers, warnings, missing,
    aiEnabled: isAiEnabled(id),
    tokens: cfg.salesPrompt ? approxTokens(cfg.salesPrompt) : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Toàn bộ page
// ─────────────────────────────────────────────────────────────────────────────
export function allReadiness() {
  const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
  const pk = pancakePages();
  const reg = getRegistry();
  const stats = getStats();

  const ids = new Set([...Object.keys(reg), ...pk.keys(), ...kbById.keys()].map(String));
  const out = [];
  for (const id of ids) {
    const kb = kbById.get(id) || {};
    const rec = reg[id] || null;
    // Ngày sửa kịch bản lấy từ kho phiên bản M02 (bản LIVE). Page chưa có lịch sử →
    // undefined → luật SCRIPT_STALE tự bỏ qua, không đoán bừa.
    const live = getScriptDoc(id).live;
    const r = computeReadiness(id, {
      record: rec,
      products: kb.products || 0,
      stats: stats.byPage[id] || null,
      updatedAt: live?.updatedAt,
    });
    out.push({
      ...r,
      name: pk.get(id)?.name || rec?.name || kb.name || id,
      marketer: (rec?.marketer || kb.marketer || '').trim(),
      market: rec?.market || kb.market || '',
    });
  }
  out.sort((a, b) => Number(b.blockers.length > 0) - Number(a.blockers.length > 0) || String(a.name).localeCompare(String(b.name)));
  return out;
}

// CỔNG BẬT AI. Gọi từ router trước khi cho `POST /pages/:id/ai` đi tiếp.
export function canEnableAI(pageId) {
  const r = computeReadiness(pageId, {
    record: getPageRecord(pageId),
    products: getPageProductsRaw(pageId).length,
  });
  if (r.aiAllowed) return { ok: true, readiness: r.readiness, warnings: r.warnings };
  return {
    ok: false, readiness: r.readiness, blockers: r.blockers,
    reason: r.blockers.map((b) => `${b.code}: ${b.detail}`).join(' · '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bản tin — GỘP THEO MARKETER
// ─────────────────────────────────────────────────────────────────────────────

const LINK = () => `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/admin/api/scripts/ui`;

export function buildDigest(rows = allReadiness()) {
  const byMarketer = new Map();
  for (const r of rows) {
    if (!r.blockers.length && !r.warnings.length) continue;
    const who = r.marketer || '(chưa phân công)';
    if (!byMarketer.has(who)) byMarketer.set(who, { marketer: who, blocked: [], warned: [] });
    const g = byMarketer.get(who);
    if (r.blockers.length) g.blocked.push(r); else g.warned.push(r);
  }

  return [...byMarketer.values()].map((g) => {
    const lines = [];
    if (g.blocked.length) {
      lines.push(`🔴 ${g.blocked.length} page CHƯA CHẠY ĐƯỢC BOT (phụ trách: ${g.marketer})`, '');
      g.blocked.forEach((r, i) => lines.push(`${i + 1}. ${r.name} — ${r.blockers.map((b) => b.detail).join('; ')}`));
      lines.push('');
    }
    if (g.warned.length) {
      // Danh sách nhắc CỐ Ý viết một dòng gọn: 37 page thiếu `tone` mà xuống dòng từng
      // page thì phần đỏ ở trên bị đẩy khuất — đúng cái bẫy spec cảnh báo.
      const byCode = new Map();
      for (const r of g.warned) for (const w of r.warnings) {
        if (!byCode.has(w.code)) byCode.set(w.code, []);
        byCode.get(w.code).push(r.name);
      }
      for (const [code, names] of byCode) {
        lines.push(`⚠️ ${names.length} page ${LADDER[code]?.label || code}`);
        lines.push(`   ${names.slice(0, 8).join(' · ')}${names.length > 8 ? ` … +${names.length - 8} page` : ''}`);
      }
      lines.push('');
    }
    lines.push(`👉 Bổ sung tại: ${LINK()}`);
    if (g.blocked.length) lines.push('Bot sẽ chạy được ngay sau khi kịch bản được xuất bản.');
    return { marketer: g.marketer, blocked: g.blocked.length, warned: g.warned.length, text: lines.join('\n') };
  }).sort((a, b) => b.blocked - a.blocked);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gửi bản tin + quét tức thì
// ─────────────────────────────────────────────────────────────────────────────

let lastDigestDay = '';
const today = () => new Date().toISOString().slice(0, 10);

export async function sendDigest({ force = false } = {}) {
  if (!force && lastDigestDay === today()) return { ok: false, skipped: 'đã gửi hôm nay' };
  const groups = buildDigest();
  if (!groups.length) { lastDigestDay = today(); return { ok: true, sent: 0, note: 'không page nào cần nhắc' }; }
  let sent = 0; const errors = [];
  for (const g of groups) {
    const r = await sendToGroup(g.text);
    if (r.ok) sent++; else errors.push(`${g.marketer}: ${r.error}`);
  }
  lastDigestDay = today();
  return { ok: errors.length === 0, sent, groups: groups.length, errors };
}

// Trạng thái lượt quét trước — để chỉ báo TỨC THÌ khi có page RƠI XUỐNG, không phải
// nhắc lại mọi page đang hỏng ở mỗi 15 phút.
let prevBlocked = new Set();

export async function sweep() {
  const rows = allReadiness();
  const nowBlocked = new Set(rows.filter((r) => !r.aiAllowed).map((r) => r.pageId));
  const fell = rows.filter((r) => !r.aiAllowed && r.aiEnabled && !prevBlocked.has(r.pageId));

  for (const r of fell) {
    const why = r.blockers.map((b) => `${b.code}: ${b.detail}`).join(' · ');
    console.error(`[readiness] 🔴 page ĐANG CHẠY rơi xuống trạng thái chặn — ${r.name} (${r.pageId}): ${why}`);
    if (readinessConfig.autoDisable) { setAiEnabled(r.pageId, false); console.error(`[readiness] → đã TẮT AI page ${r.pageId}`); }
    if (readinessConfig.alertWa) {
      const act = readinessConfig.autoDisable ? 'AI đã được TẮT tự động.' : 'AI vẫn đang bật — cần người xử lý.';
      await sendToGroup(`🔴 ${r.name} vừa rơi xuống trạng thái CHẶN\n${why}\n${act}\n👉 ${LINK()}`, readinessConfig.alertWa).catch(() => {});
    }
  }

  prevBlocked = nowBlocked;
  return { pages: rows.length, blocked: nowBlocked.size, fell: fell.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hẹn giờ
// ─────────────────────────────────────────────────────────────────────────────
let sweepTimer = null;
let digestTimer = null;

export function startReadiness() {
  if (sweepTimer || process.env.READINESS === '0') return;

  sweepTimer = setInterval(() => { sweep().catch((e) => console.error('[readiness] quét lỗi:', e.message)); }, readinessConfig.sweepMs);
  sweepTimer.unref?.();

  // Kiểm mỗi phút xem đã tới giờ bản tin chưa. Đơn giản hơn cron và tự đúng khi máy
  // ngủ dậy trễ (`lastDigestDay` chặn gửi trùng trong ngày).
  const [hh, mm] = readinessConfig.digestAt.split(':').map(Number);
  digestTimer = setInterval(() => {
    const d = new Date();
    if (d.getHours() === hh && d.getMinutes() === mm) {
      sendDigest().then((r) => { if (r.sent) console.log(`[readiness] bản tin ${readinessConfig.digestAt}: gửi ${r.sent}/${r.groups} nhóm marketer`); })
        .catch((e) => console.error('[readiness] gửi bản tin lỗi:', e.message));
    }
  }, 60000);
  digestTimer.unref?.();

  console.log(`[readiness] bản tin ${readinessConfig.digestAt}/ngày · quét mỗi ${Math.round(readinessConfig.sweepMs / 60000)} phút · tự tắt AI: ${readinessConfig.autoDisable ? 'BẬT' : 'tắt'}`);
}

export function stopReadiness() {
  if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
  if (digestTimer) { clearInterval(digestTimer); digestTimer = null; }
}
