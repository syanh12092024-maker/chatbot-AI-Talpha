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
import { getStats } from './stats.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình
// ─────────────────────────────────────────────────────────────────────────────
// CR-02-10 · MB4: bản tin WhatsApp theo marketer · quét tức thì · TỰ TẮT AI đã gỡ cùng tiến trình bot v1
// (chỉ `admin-scripts.js` của v1 khởi động chúng; phiên WhatsApp đã đăng xuất từ 29/09).
export const readinessConfig = {
  staleDays: Number(process.env.SCRIPT_STALE_DAYS || 30),
  thinTokens: Number(process.env.SCRIPT_THIN_TOKENS || 500), // salesPrompt mỏng hơn mức này → nhắc
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
    // CR-02-10: công tắc thật là cột `page.bot_ai_bat` (CSDL) — hàm đồng bộ này không đọc CSDL. Page ĐANG
    // bật có dòng của chính bot (`v3/src/noi-day/van-hanh-v3.js`) đè lên dòng này; còn lại là tắt.
    aiEnabled: false,
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
