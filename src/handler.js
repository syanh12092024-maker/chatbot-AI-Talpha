import { classify } from './classifier.js';
import { runCloser } from './closer.js';
import { getState, recordInbound, recordOutbound, isAiEnabled } from './store.js';
import { getKBForPage } from './kb.js';
import { config } from './config.js';
import { logAi, recentReplyCount } from './ai-log.js';
import { cleanText } from './text.js';
import { pkTagByName, pkAddNote } from './pancake.js';
import { fastLane, noteFastLane } from './fast-lane.js';
import { guardOutbound, recordBlocked } from './outbound-guard.js';
import { markHandoff } from './conv-owner.js';

// NGUYÊN TẮC #13 — KẾT THÚC LÀ PHẢI BÀN GIAO: mọi điểm AI dừng phục vụ (khiếu nại,
// ngôn ngữ lạ, hết lượt, page thiếu KB...) đều ghi 'handoff' vào Sổ AI kèm LÝ DO
// → tự hiện ở hàng chờ "Cần sale xử lý" trên dashboard. Không khách nào bị bỏ rơi
// trong khoảng trống "AI đã im mà người chưa biết".
function toSaleQueue(state, reason, kind) {
  try {
    logAi(state.pageId, state.pkCustId, 'handoff', {
      reason, kind: kind || '', conv: state.pkConvId || '', name: state.custName || '',
    });
  } catch { /* sổ AI không chặn luồng chính */ }
  // M05: khoá hội thoại lại — AI im, Botcake im, chỉ sale được nói. Trạng thái này
  // BỀN qua restart (conv-state.json) nên không còn cảnh bot quay lại chen ngang
  // sau khi server khởi động lại.
  try { if (state.pkConvId) markHandoff(state.pkConvId, reason); } catch { /* không chặn luồng chính */ }
  // Gắn thẻ bàn giao trên Pancake (nếu page có thẻ đó) — sale trực Pancake lọc được ngay.
  // Gắn hụt thì PHẢI kêu: trước 07/08/2026 lỗi bị nuốt im, page thiếu thẻ mà không ai biết —
  // sale lọc theo thẻ thì tưởng AI chưa bàn giao ai. Chỉ 'AI Chăm' có log, hai thẻ kia thì không.
  if (config.pkTags.handoff && state.pkConvId) {
    pkTagByName(state.pageId, state.pkConvId, config.pkTags.handoff)
      .then((t) => { if (!t.ok) console.warn(`[tag] ${state.pageId}: ${t.error} (bàn giao ${kind || '?'})`); })
      .catch(() => {});
  }
  // GHI CHÚ VÀO PANCAKE — sale mở chat là thấy NGAY vì sao AI dừng, không phải đoán.
  // Trước 07/08/2026 chỉ tool handoff_human và lúc chốt đơn mới ghi chú; các cửa bàn giao
  // ĐÔNG NHẤT (khiếu nại, hết lượt, page thiếu KB, lỗi kỹ thuật) thì im — 7 ngày có 643 lượt
  // bàn giao thì ~570 lượt sale mở chat ra chỉ thấy câu "team member will assist you shortly"
  // mà không biết chuyện gì đã xảy ra.
  if (state.pkCustId && !state.saleNoted) {
    state.saleNoted = true; // 1 ghi chú/hội thoại — restart server không rải chú lặp
    pkAddNote(state.pageId, state.pkCustId, `🙋 AI ĐÃ DỪNG — cần sale tiếp quản\nLý do: ${reason}\nKhách đang chờ người thật trả lời.`)
      .then((r) => { if (!r.ok) console.warn(`[note] ${state.pageId}: ${r.error} (bàn giao ${kind || '?'})`); })
      .catch(() => {});
  }
}

// NẠP LỊCH SỬ THẬT từ Pancake vào bộ nhớ AI khi phiên còn trống (server mới khởi động /
// khách quay lại sau nhiều ngày). AI đọc hết những gì 2 bên đã nói (kể cả Botcake / sale tay)
// TRƯỚC khi soạn tin — không hỏi lại thứ khách đã cho, không chào lại từ đầu, biết khách đã đặt đơn.
const HIST_MAX_MSGS = 20;   // lấy tối đa N tin gần nhất
const HIST_MAX_CHARS = 400; // cắt mỗi tin để tiết kiệm token
// cleanText nay ở text.js (dùng chung với lớp chặn cuối trong closer.js). Re-export để
// admin.js và code cũ import từ đây vẫn chạy như trước.
export { cleanText };
export function hydrateHistory(state, history, pageId) {
  if (state.messages.length || !Array.isArray(history) || history.length <= 1) return 0;
  const turns = [];
  // bỏ tin CUỐI (chính là tin đang xử lý — handler sẽ tự đẩy vào sau)
  for (const m of history.slice(0, -1).slice(-HIST_MAX_MSGS)) {
    const raw = (m.original_message || m.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const text = raw ? cleanText(raw, HIST_MAX_CHARS) : ((m.attachments || []).length ? '(gửi ảnh/đính kèm)' : '');
    if (!text) continue;
    const role = String(m.from?.id) === String(pageId) ? 'assistant' : 'user';
    const prev = turns[turns.length - 1];
    if (prev && prev.role === role) prev.content += '\n' + text; // gộp tin liên tiếp cùng phía
    else turns.push({ role, content: text });
  }
  // Claude yêu cầu mở đầu bằng user & ta sẽ đẩy tin hiện tại (user) vào sau → phải kết bằng assistant.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  while (turns.length && turns[turns.length - 1].role !== 'assistant') turns.pop();
  if (turns.length) state.messages.push(...turns);
  return turns.length;
}

// Xử lý 1 tin nhắn đến. Trả về { reply, handoff } — reply=null nghĩa là không tự trả.
export async function handleIncoming({ psid, text, pageId, kb, pkConvId, pkCustId, history, custName }) {
  const state = getState(psid);
  state.psid = psid;
  state.pageId = pageId;                       // để tool gửi ảnh biết page nào
  if (pkConvId) state.pkConvId = pkConvId;      // ngữ cảnh Pancake để gửi ảnh cùng kênh
  if (pkCustId) state.pkCustId = pkCustId;
  if (custName) state.custName = custName;
  const nHist = hydrateHistory(state, history, pageId);
  if (nHist) console.log(`[hist] nạp ${nHist} lượt lịch sử Pancake cho khách ${psid} (page ${pageId})`);
  // TRẦN LƯỢT BỀN VỮNG (#8): đồng bộ bộ đếm RAM với số tin AI đã trả trong 24h (từ Sổ AI)
  // → restart server không còn "reset chui" cho khách thêm lượt.
  if (state.pkCustId) state.aiTurns = Math.max(state.aiTurns, recentReplyCount(pageId, state.pkCustId));

  // ĐO TOKEN CỦA LƯỢT NÀY — reset mỗi lượt để tin không gọi AI (vd holding message)
  // không bị gán nhầm số token của lượt trước. classifier + closer cùng cộng vào đây.
  state.lastUsage = { tin: 0, tout: 0, cread: 0, calls: 0 };
  state.orderCreatedThisTurn = false; // cờ cho M09 — chỉ đúng trong phạm vi 1 lượt

  kb = kb || getKBForPage(pageId);
  recordInbound(psid, { pageId, pageName: kb.pageName, text });

  // Nhân viên đã tiếp quản → AI im lặng.
  if (state.handoff) return { reply: null, handoff: true };

  // AI bị TẮT cho page này (dashboard) → để nhân viên lo.
  if (pageId && !isAiEnabled(pageId)) return { reply: null, handoff: false, aiOff: true };

  // Page chưa có KB → không bịa, chuyển người.
  if (kb.noData) {
    state.handoff = true; state.handoffReason = 'page_no_kb';
    toSaleQueue(state, 'Page chưa có kịch bản/KB — AI không thể tư vấn, cần người vào chat', 'no_kb');
    return reply(psid, holdingMessage('en'), true);
  }

  // ── M06 · FAST LANE — chặn TRƯỚC mọi lần gọi LLM ────────────────────────────
  // 33,8% tin đang gọi model chỉ để đáp sticker / nút START / "ok" / "hi" / hỏi giá.
  // Tầng này xử lý chúng bằng luật + câu mẫu dựng từ KB, tốn 0 token.
  // Mọi trường hợp nghi ngờ đều leo lên AI (xem fast-lane.js).
  state.fastLanesUsed = state.fastLanesUsed || new Set();
  const fl = fastLane({
    text,
    kb,
    aiTurns: state.aiTurns,
    lastAiText: state.lastAiText || '',
    usedLanes: state.fastLanesUsed,
  });
  noteFastLane(fl);
  if (fl.handled) {
    console.log(`[fastlane] ${state.custName || psid} (page ${pageId}): ${fl.lane} — ${fl.reason}`);
    // Lượt IM LẶNG: không ghi vào state.messages. Sticker/"ok" không mang thông tin,
    // và ghi lượt user không có lượt assistant kèm sẽ phá thế xen kẽ của mảng messages.
    if (!fl.reply) return { reply: null, handoff: false, lane: fl.lane };
    // Câu mẫu vẫn phải qua cửa kiểm duyệt như mọi tin khác.
    const v = guardOutbound(fl.reply, { kb, pageId, custName: state.custName, lastAiText: state.lastAiText });
    if (!v.ok) { recordBlocked(v, { pageId, custName: state.custName }, fl.reply); return { reply: null, handoff: false, blocked: v.rule }; }
    // Ghi cặp lượt vào bộ nhớ phiên để AI ở lượt sau đọc được mạch hội thoại
    // (hydrateHistory đã chạy phía trên nên không sợ chặn mất việc nạp lịch sử thật).
    state.messages.push({ role: 'user', content: cleanText(text).trim() || '(khách gửi ảnh/sticker)' });
    state.messages.push({ role: 'assistant', content: fl.reply });
    state.lastAiText = fl.reply;
    return reply(psid, fl.reply, false, fl.lane);
  }

  const cls = await classify(text, kb.products[0]?.name);
  if (cls.__usage) { // cộng token classifier vào lượt (fallback lỗi thì không có usage — không tốn tiền)
    state.lastUsage.tin += cls.__usage.tin; state.lastUsage.tout += cls.__usage.tout;
    state.lastUsage.cread += cls.__usage.cread; state.lastUsage.calls += cls.__usage.calls;
  }

  if (cls.intent === 'spam' && cls.is_spam_conf >= 0.8) {
    return { reply: null, handoff: false, archived: true };
  }

  // Tin chỉ có ảnh/sticker (hoặc chỉ chứa nửa emoji nên bị dọn sạch) sẽ thành chuỗi RỖNG →
  // Claude trả 400 "user messages must have non-empty content" và khách không được trả lời.
  const cleaned = cleanText(text);
  state.messages.push({ role: 'user', content: cleaned.trim() || '(khách gửi ảnh/sticker)' });

  if (cls.intent === 'complaint') {
    state.handoff = true; state.handoffReason = 'complaint';
    toSaleQueue(state, 'Khách KHIẾU NẠI — cần người xử lý gấp', 'complaint');
    return reply(psid, holdingMessage(cls.lang), true);
  }
  // NGÔN NGỮ LẠ KHÔNG CÒN CHUYỂN NGƯỜI (nguyên tắc #1 & #7).
  // AI được dạy trả lời bằng ĐÚNG ngôn ngữ của khách (xem prompts.js), nên đẩy sang sale là
  // vừa phí lead vừa ngập hàng chờ: cửa này từng chiếm ~45% việc đổ lên sale trong 24h, mà phần
  // lớn chỉ là khách nhắn Ả Rập/Urdu/Hindi — AI thừa sức phục vụ. Classifier cũng trả 'other'
  // khi API lỗi (fallback), tức khách bị chuyển người chỉ vì bộ phân loại chập chờn.
  if (state.aiTurns >= config.maxAiTurnsBeforeHandoff) {
    state.handoff = true; state.handoffReason = 'max_turns';
    toSaleQueue(state, `AI đã trả lời đủ ${config.maxAiTurnsBeforeHandoff} lượt — khách còn do dự, cần người vào chốt`, 'max_turns');
    return reply(psid, holdingMessage(cls.lang), true);
  }

  const text2 = await runCloser({ kb, state });
  state.aiTurns += 1;

  // ── M09 · OUTBOUND GUARD — cửa cuối trước khi tin tới khách ────────────────
  // Chặn tin rỗng / sai giá / lộ tiếng Việt / doạ khách / checklist / quá dài.
  // Vi phạm lần 1 → xin model viết lại ĐÚNG 1 lần; lần 2 → thà im còn hơn gửi bậy.
  const guarded = await guardAndMaybeRewrite(text2, { kb, state, pageId, psid });
  return reply(psid, guarded, state.handoff, 'AI');
}

// Soi tin, vi phạm thì xin model viết lại đúng 1 lần rồi soi lại.
async function guardAndMaybeRewrite(text, { kb, state, pageId, psid }) {
  const ctx = {
    kb,
    pageId,
    custName: state.custName || psid,
    lastAiText: state.lastAiText || '',
    orderCreated: !!state.orderCreatedThisTurn,
    isOrderSummary: !!state.orderCreatedThisTurn,
  };
  if (!String(text || '').trim()) return ''; // closer đã chủ động im — không phải vi phạm

  let v = guardOutbound(text, ctx);
  if (v.ok) { state.lastAiText = text; return text; }
  recordBlocked(v, ctx, text);
  if (v.action === 'block') return '';

  // Xin viết lại: đưa đúng lý do để model sửa trúng chỗ.
  state.messages.push({
    role: 'user',
    content: `Tin vừa rồi KHÔNG gửi được cho khách. Lý do: ${v.reason}\nVIẾT LẠI 1-2 câu ngắn bằng ĐÚNG ngôn ngữ của khách, khắc phục đúng lỗi trên. Không gọi tool, chỉ viết chữ.`,
  });
  let text3 = '';
  try { text3 = await runCloser({ kb, state }); } catch (e) { console.warn('[guard] viết lại lỗi:', e.message); return ''; }
  if (!String(text3 || '').trim()) return '';

  v = guardOutbound(text3, ctx);
  if (v.ok) { state.lastAiText = text3; return text3; }
  recordBlocked(v, ctx, text3);
  console.warn(`[guard] viết lại vẫn vi phạm (${v.rule}) → IM. page ${pageId} · ${ctx.custName}`);
  return '';
}

function reply(psid, text, handoff, lane) {
  recordOutbound(psid, text);
  return { reply: text, handoff, lane: lane || '' };
}

function holdingMessage(lang) {
  if (lang === 'tl') return 'Sandali lang po, may makakausap kayong team member namin agad. 🙏';
  if (lang === 'en') return 'One moment please — a team member will assist you shortly. 🙏';
  return 'Sandali lang po / one moment — a team member will assist you shortly. 🙏';
}
