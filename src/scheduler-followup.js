// M12 · LỊCH ĐUỔI THEO — tầng DUY NHẤT trong luồng này được phép gửi tin cho khách.
// Spec: docs/v2/03-TANG-TANG-CHOT.md § M12 · vòng 2: docs/v2/prompts/L5-AB-FOLLOWUP.md
//
// `followup.js` chỉ QUYẾT ĐỊNH và SOẠN (hàm thuần, không gửi gì). File này là chỗ duy
// nhất chạm vào mạng. Tách như vậy để chạy khô và chạy thật đi CHUNG một đường quyết
// định — không có nhánh "chỉ chạy khi thật" nào để lọt sai.
//
// BỐN CÔNG TẮC, phải qua HẾT mới gửi được một tin:
//   ① PANCAKE_READONLY ≠ 1        máy local/bản sao tuyệt đối không bắn tin thật
//   ② FOLLOWUP = 1                công tắc toàn cục, MẶC ĐỊNH TẮT
//   ③ công tắc theo page          sale ngập là tắt page đó (followup.js)
//   ④ M09 Outbound Guard          soi từng tin như mọi tin khác
//
// GHI SỔ TRƯỚC KHI GỬI, CÓ CHỦ Ý. Đặt chỗ (`noteFollowup`) rồi mới gọi API. Gửi hỏng thì
// khách mất suất đuổi theo — chấp nhận. Chiều ngược lại (gửi xong, chết trước khi ghi sổ,
// lượt quét sau gửi lại) là gửi tin HAI LẦN cho người thật, và đó là thứ ràng buộc cứng
// "tối đa 1 tin/khách/hội thoại" tồn tại để chặn.
//
// KHÔNG GỬI ẢNH. Bảng góc của spec có cột "kèm ảnh feedback/chứng nhận", nhưng ở đây câu
// chữ HỎI khách có muốn xem không thay vì đẩy thẳng: đẩy ảnh là tin thứ hai (phá ràng buộc
// 1 tin), và chưa có ai duyệt bộ ảnh nào cho từng page.

import { listAiEnabled } from './store.js';
import { pkGetConversations, pkGetMessages, pkSendReply } from './pancake.js';
import { getKBForPage } from './kb.js';
import { getRegistry } from './page-registry.js';
import { allReadiness } from './readiness.js';
import { readLog, logAi } from './ai-log.js';
import { guardOutbound, recordBlocked } from './outbound-guard.js';
import { noteFollowup } from './conv-state.js';
import { hasPhone } from './lead-score.js';
import { followupConfig, planFollowups, renderDryRun, evaluateCandidate } from './followup.js';

// ─────────────────────────────────────────────────────────────────────────────
// CỬA GỬI — trả về LÝ DO khi đóng, không chỉ true/false. Lý do đi thẳng ra log và
// dashboard: "vì sao chạy cả ngày mà không gửi tin nào" phải trả lời được trong 1 giây.
// ─────────────────────────────────────────────────────────────────────────────
export function sendGate() {
  if (process.env.PANCAKE_READONLY === '1') {
    return { ok: false, why: 'PANCAKE_READONLY=1 — máy này chỉ ĐỌC, không bắn tin thật' };
  }
  if (!followupConfig.enabled) {
    return { ok: false, why: 'FOLLOWUP≠1 — công tắc đuổi theo toàn cục đang TẮT' };
  }
  return { ok: true, why: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHỈ MỤC SỔ AI — mỗi (page, khách) một dòng tóm tắt
//
// Vì sao mốc "khách im bao lâu" lấy từ Sổ AI chứ không từ `last_customer_interactive_at`
// của Pancake: dấu thời gian Pancake KHÔNG kèm múi giờ và `Date.parse` hiểu lệch nhiều
// giờ (`pancake-poll.js` đã đo và cố ý không dùng). Sổ AI ghi `t` bằng đồng hồ server nên
// so được. Mốc dùng ở đây là "lần cuối bot trả lời", luôn ≥ mốc khách nhắn thật, nên
// khoảng im đo được là CẬN DƯỚI — sai theo hướng bỏ sót, không theo hướng nhắn nhầm.
//
// Ca sai nguy hiểm còn lại: khách nhắn mà bot KHÔNG trả lời (đã handoff). Lúc đó mốc bot
// cũ hơn nhiều so với tin khách và ta tưởng khách im lâu. Cửa chặn ca này nằm ở
// `collectCandidates`: tin CUỐI của hội thoại phải là của page. Khách đang chờ người thì
// việc cần làm là trả lời, không phải đuổi theo.
// ─────────────────────────────────────────────────────────────────────────────
export function indexLog(rows = readLog()) {
  const idx = new Map(); // 'page:cust' -> tóm tắt
  for (const r of rows) {
    if (!r.cust) continue;
    const k = `${r.page}:${r.cust}`;
    let g = idx.get(k);
    if (!g) { g = { page: String(r.page), cust: String(r.cust), name: '', conv: '', aiReplies: 0, lastReplyAt: 0, lastAiText: '', hasOrder: false, followupLogged: false }; idx.set(k, g); }
    if (r.name) g.name = r.name;
    if (r.conv) g.conv = r.conv;
    if (r.type === 'order') g.hasOrder = true;
    if (r.type === 'reply') {
      g.aiReplies++;
      if (r.t >= g.lastReplyAt) { g.lastReplyAt = r.t; g.lastAiText = r.text || ''; }
      if (String(r.lane || '').toUpperCase() === 'FOLLOWUP') g.followupLogged = true;
    }
    if (r.type === 'handoff' && String(r.lane || '').toUpperCase() === 'FOLLOWUP') g.followupLogged = true;
  }
  return idx;
}

/** Trạng thái page: bật AI · đủ điều kiện chạy · thị trường (để tính giờ địa phương). */
export function indexPages({ readinessRows, registry } = {}) {
  const out = new Map();
  const reg = registry || (() => { try { return getRegistry(); } catch { return {}; } })();
  let rows = readinessRows;
  if (!rows) { try { rows = allReadiness(); } catch (e) { console.warn('[followup] không đọc được readiness:', e.message); rows = []; } }
  for (const r of rows) {
    out.set(String(r.pageId), {
      pageId: String(r.pageId), name: r.name || '',
      aiEnabled: !!r.aiEnabled, ready: !!r.aiAllowed, readiness: r.readiness,
      market: r.market || reg[String(r.pageId)]?.market || '',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GOM ỨNG VIÊN
//
// HAI LƯỢT SOI, có lý do: `pkGetMessages` là một lời gọi API cho MỖI hội thoại. 39 page ×
// hàng trăm hội thoại × 4 lượt/giờ là con số không chấp nhận được. Lượt 1 soi bằng thứ đã
// có sẵn (Sổ AI + thẻ + sổ hội thoại), lượt 2 chỉ tải tin của số ít còn lại.
// An toàn vì `custTexts` CHỈ ảnh hưởng việc CHỌN GÓC, không bao giờ biến một khách bị loại
// thành khách được nhắn — nên tập của lượt 1 luôn là tập cha.
// ─────────────────────────────────────────────────────────────────────────────
export async function collectCandidates({
  now = Date.now(), pages, cfg = followupConfig,
  getConversations = pkGetConversations, getMessages = pkGetMessages,
  rows, readinessRows, registry,
} = {}) {
  const logIdx = indexLog(rows || readLog());
  const pageIdx = indexPages({ readinessRows, registry });
  const ids = (pages || listAiEnabled()).map(String);

  const out = []; const errors = [];
  for (const pageId of ids) {
    const p = pageIdx.get(pageId) || { pageId, aiEnabled: true, ready: false, readiness: 'chưa rõ', market: '' };
    // Page tắt AI / chưa đủ điều kiện: bỏ NGAY, đừng tốn lời gọi API nào. `evaluateCandidate`
    // vẫn kiểm lại hai điều kiện này — đây chỉ là cắt sớm cho rẻ.
    if (!p.aiEnabled) continue;
    if (cfg.strictReady ? p.readiness !== 'READY' : p.ready === false) continue;

    let convs;
    try { convs = await getConversations(pageId); }
    catch (e) { errors.push({ pageId, error: e.message }); continue; }

    const rough = [];
    for (const c of convs || []) {
      const custId = (c.customers || [])[0]?.id;
      if (!custId || !c.id) continue;
      const g = logIdx.get(`${pageId}:${custId}`) || {};
      rough.push({
        pageId, custId: String(custId), convId: String(c.id),
        name: c.from?.name || g.name || '', market: p.market,
        aiEnabled: p.aiEnabled, ready: p.ready, readiness: p.readiness,
        tags: c.tags || [],
        aiReplies: g.aiReplies || 0,
        hasOrder: !!g.hasOrder,
        lastCustAt: g.lastReplyAt || 0,
        lastAiText: g.lastAiText || '',
        alreadyLogged: !!g.followupLogged,
      });
    }

    // Lượt 1 — chỉ giữ ứng viên còn sống sau mọi điều kiện KHÔNG cần nội dung tin.
    // Giữ cả nhóm đối chứng (`HOLDOUT`): họ phải đi qua ĐÚNG những cửa mà nhóm được nhắn
    // đi qua, không thì hai nhóm không so được với nhau và cả cái A/B thành vô nghĩa.
    const survivors = rough.filter((c) => {
      const v = evaluateCandidate(c, { now, cfg });
      return v.ok || v.group === 'HOLDOUT';
    });

    for (const c of survivors) {
      let msgs = [];
      try { msgs = await getMessages(pageId, c.convId, c.custId); }
      catch (e) { errors.push({ pageId, convId: c.convId, error: e.message }); continue; }
      if (!msgs.length) continue;

      // CỬA CHỐNG NHẮN ĐÈ: tin cuối phải là của PAGE. Tin cuối là của khách nghĩa là
      // khách đang CHỜ trả lời — đuổi theo lúc đó là đáp lạc đề vào mặt người đang hỏi.
      const last = msgs[msgs.length - 1];
      if (String(last?.from?.id) !== String(pageId)) continue;

      // Tin của khách, mới nhất trước, tối đa 8 — đủ để chọn góc mà không kéo cả hội thoại.
      const custTexts = [];
      for (let i = msgs.length - 1; i >= 0 && custTexts.length < 8; i--) {
        const m = msgs[i];
        if (String(m.from?.id) === String(pageId)) continue;
        const tx = (m.original_message || m.message || '').trim();
        if (tx) custTexts.push(tx);
      }
      out.push({ ...c, custTexts, msgCount: msgs.length });
    }
  }
  return { candidates: out, errors, pages: ids.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHẠY KHÔ — không chạm vào mạng để GỬI, chỉ đọc. Đây là thứ đưa chủ dự án duyệt.
// ─────────────────────────────────────────────────────────────────────────────
export async function dryRun(opts = {}) {
  const now = opts.now || Date.now();
  const cfg = opts.cfg || followupConfig;
  const { candidates, errors, pages } = await collectCandidates({ ...opts, now, cfg });
  const plan = planFollowups(candidates, { now, cfg });
  const gate = sendGate();
  return {
    plan, errors, pages, gate,
    text: `${renderDryRun(plan)}\n\n${gate.ok ? '⚠️ CỬA GỬI ĐANG MỞ — chạy thật sẽ gửi thật.' : `🔒 cửa gửi ĐÓNG: ${gate.why}`}`
      + (errors.length ? `\n\n⚠️ ${errors.length} lỗi đọc dữ liệu (xem trường errors)` : ''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐẨY HÀNG CHỜ SALE — nhóm ưu tiên cao nhất, KHÔNG gửi tin nào cho khách.
//
// Ghi thẳng vào Sổ AI dạng `handoff`: đó là cơ chế hàng chờ sale đã có sẵn (`needSale`
// của ai-log, dashboard đọc), và nó xếp mới nhất lên đầu — nên nhóm này tự đứng đầu hàng
// chờ mà không phải sửa file của luồng khác. `lane: 'FOLLOWUP'` để cắt số riêng.
// Đây là ghi FILE NỘI BỘ, không phải gọi API Pancake — nên chạy được cả khi READONLY.
// ─────────────────────────────────────────────────────────────────────────────
// `hasPhone` của M07 chỉ trả true/false; sale cần CHÍNH CON SỐ để bấm gọi. Dùng lại đúng
// ngưỡng 8–15 chữ số của nó (ca thật SilentBoo là số 8 chữ) để hai bên không lệch nhau.
export function pickPhone(texts = []) {
  for (const t of texts) {
    if (!hasPhone(t)) continue;
    for (const m of String(t).match(/\+?\d[\d\s().-]{5,18}\d/g) || []) {
      const d = m.replace(/\D/g, '');
      if (d.length >= 8 && d.length <= 15) return m.trim();
    }
  }
  return '';
}

function pushSaleCall(item, { now, apply }) {
  const phone = pickPhone(item.custTexts || []);
  const rec = {
    ...item, phone,
    reason: `📞 ${item.saleNote}`,
    link: `https://pancake.vn/${item.pageId}?c_id=${item.convId}`,
  };
  if (!apply) return { ...rec, applied: false };
  noteFollowup(item.convId, 'sale', now);
  try {
    logAi(item.pageId, item.custId, 'handoff', {
      name: item.name, conv: item.convId, lane: 'FOLLOWUP', kind: 'followup_call',
      reason: rec.reason, phone,
    });
  } catch (e) { console.error('[followup] ghi sổ đẩy sale lỗi:', e.message); }
  console.log(`[followup] 📞 page ${item.pageId} · ${item.name || item.custId} → hàng chờ sale GỌI (im ${item.silentH}h)`);
  return { ...rec, applied: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GỬI MỘT TIN
// ─────────────────────────────────────────────────────────────────────────────
async function sendOne(item, { now, apply, send = pkSendReply }) {
  // M09 — soi trước, kể cả khi chạy khô. Câu mẫu có thể bị sửa và lọt lỗi bất cứ lúc nào;
  // chạy khô mà không soi thì bản duyệt và bản gửi là hai thứ khác nhau.
  const kb = (() => { try { return getKBForPage(item.pageId); } catch { return {}; } })();
  const v = guardOutbound(item.text, {
    kb, pageId: item.pageId, custName: item.name, lastAiText: item.lastAiText || '',
  });
  if (!v.ok) {
    if (apply) recordBlocked(v, { pageId: item.pageId, custName: item.name }, item.text);
    return { ...item, sent: false, blocked: v.rule, reason: v.reason };
  }
  if (!apply) return { ...item, sent: false, wouldSend: true };

  // ĐẶT CHỖ TRƯỚC KHI GỬI — xem ghi chú đầu file.
  noteFollowup(item.convId, 'message', now);

  let r;
  try { r = await send(item.pageId, item.convId, item.custId, item.text); }
  catch (e) { r = { ok: false, error: e.message }; }

  if (!r.ok) {
    console.warn(`[followup] ✗ page ${item.pageId} · ${item.name || item.custId}: ${r.error}`);
    return { ...item, sent: false, error: r.error };
  }
  try {
    logAi(item.pageId, item.custId, 'reply', {
      name: item.name, conv: item.convId, lane: 'FOLLOWUP',
      text: String(item.text).slice(0, 80),
      angle: item.angle, branch: item.branch,
      tin: 0, tout: 0, cread: 0, calls: 0, // câu mẫu — 0 token, phải ghi số 0 chứ không bỏ trống
    });
  } catch (e) { console.error('[followup] ghi Sổ AI lỗi:', e.message); }
  console.log(`[followup] ✉️ page ${item.pageId} · ${item.name || item.custId} · góc ${item.angle} · nhánh ${item.branch}`);
  return { ...item, sent: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MỘT LƯỢT QUÉT
// ─────────────────────────────────────────────────────────────────────────────
export async function runOnce({ apply = false, now = Date.now(), cfg = followupConfig, send = pkSendReply, ...rest } = {}) {
  const gate = sendGate();
  // `apply` chỉ có nghĩa khi CẢ HAI công tắc đều mở. Bên gọi truyền apply:true nhầm cũng
  // không gửi được gì — quyền quyết định nằm ở cửa, không ở lời gọi.
  const doApply = apply && gate.ok;

  const { candidates, errors, pages } = await collectCandidates({ ...rest, now, cfg });
  const plan = planFollowups(candidates, { now, cfg });

  const saleCalls = plan.saleQueue.map((s) => pushSaleCall(s, { now, apply: doApply }));
  const sent = [];
  for (const s of plan.send) sent.push(await sendOne(s, { now, apply: doApply, send }));

  const okCount = sent.filter((s) => s.sent).length;
  const blockedCount = sent.filter((s) => s.blocked).length;
  console.log(`[followup] lượt quét: ${pages} page · soi ${candidates.length} · sale gọi ${saleCalls.length} · ${doApply ? `gửi ${okCount}/${sent.length}` : `SẼ gửi ${sent.length} (chạy khô: ${gate.why || 'apply=false'})`}${blockedCount ? ` · M09 chặn ${blockedCount}` : ''}`);

  return { now, applied: doApply, gate, pages, plan, saleCalls, sent, errors, summary: { ...plan.summary, sentOk: okCount, blocked: blockedCount } };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON 15 PHÚT
// ─────────────────────────────────────────────────────────────────────────────
const EVERY_MS = Number(process.env.FOLLOWUP_EVERY_MS || 15 * 60e3);
let timer = null;
let lastRun = null;
let running = false;

export function lastFollowupRun() { return lastRun; }

export function startFollowupScheduler() {
  if (timer) return;
  const gate = sendGate();
  // Cửa đóng thì KHÔNG bật hẹn giờ. Quét mà chắc chắn không gửi được gì chỉ đốt lời gọi
  // API Pancake mỗi 15 phút. Muốn xem trước thì gọi `dryRun()` qua router.
  if (!gate.ok) { console.log(`[followup] KHÔNG bật lịch đuổi theo — ${gate.why}`); return; }
  const tick = async () => {
    if (running) return;
    running = true;
    try { lastRun = await runOnce({ apply: true }); }
    catch (e) { console.error('[followup] lượt quét lỗi:', e.message); }
    finally { running = false; }
  };
  timer = setInterval(tick, EVERY_MS);
  timer.unref?.();
  // CỐ Ý KHÔNG quét ngay lúc khởi động. Bot restart mỗi lần deploy; quét-ngay biến mỗi
  // lần restart thành một mẻ gửi. `noteFollowup` chặn gửi trùng nên không thành spam,
  // nhưng "vừa deploy xong là bắn một loạt tin" không phải thứ nên xảy ra bất ngờ.
  console.log(`[followup] 🟢 BẬT lịch đuổi theo mỗi ${Math.round(EVERY_MS / 60e3)} phút (lượt đầu sau ${Math.round(EVERY_MS / 60e3)} phút) — sẽ GỬI TIN THẬT cho khách.`);
}

export function stopFollowupScheduler() { if (timer) { clearInterval(timer); timer = null; } }

/**
 * MÓC KHỞI ĐỘNG DUY NHẤT của luồng 5 — để `server.js` chỉ phải thêm ĐÚNG 1 DÒNG
 * (luật §3 của docs/v2/08-SONG-SONG.md: 4 luồng gộp vào cùng file, mỗi dòng thêm là một
 * chỗ xung đột). Gom hai lịch của luồng vào đây thay vì gọi rời ở server.js.
 */
export async function startL5Schedulers() {
  (await import('./experiment.js')).startExperimentSweep(); // M17 · quét A/B + rollback tự động
  startFollowupScheduler();                                 // M12 · đuổi theo (tự im nếu cửa đóng)
}

/** Hàng chờ sale gọi của M12, đọc lại từ Sổ AI (sống sót qua restart). */
export function saleCallQueue({ hours = 48, rows } = {}) {
  const since = Date.now() - hours * 3600e3;
  const out = [];
  for (const r of (rows || readLog())) {
    if (r.t < since || r.type !== 'handoff' || r.kind !== 'followup_call') continue;
    out.push({
      t: r.t, page: String(r.page), cust: String(r.cust), name: r.name || '',
      phone: r.phone || '', reason: r.reason || '',
      link: r.conv ? `https://pancake.vn/${r.page}?c_id=${r.conv}` : `https://pancake.vn/${r.page}`,
    });
  }
  return out.reverse();
}
