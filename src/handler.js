import { classify } from './classifier.js';
import { runCloser } from './closer.js';
import { getState, recordInbound, recordOutbound, isAiEnabled } from './store.js';
import { getKBForPage } from './kb.js';
import { config } from './config.js';

// NẠP LỊCH SỬ THẬT từ Pancake vào bộ nhớ AI khi phiên còn trống (server mới khởi động /
// khách quay lại sau nhiều ngày). AI đọc hết những gì 2 bên đã nói (kể cả Botcake / sale tay)
// TRƯỚC khi soạn tin — không hỏi lại thứ khách đã cho, không chào lại từ đầu, biết khách đã đặt đơn.
const HIST_MAX_MSGS = 20;   // lấy tối đa N tin gần nhất
const HIST_MAX_CHARS = 400; // cắt mỗi tin để tiết kiệm token
export function hydrateHistory(state, history, pageId) {
  if (state.messages.length || !Array.isArray(history) || history.length <= 1) return 0;
  const turns = [];
  // bỏ tin CUỐI (chính là tin đang xử lý — handler sẽ tự đẩy vào sau)
  for (const m of history.slice(0, -1).slice(-HIST_MAX_MSGS)) {
    const raw = (m.original_message || m.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const text = raw ? raw.slice(0, HIST_MAX_CHARS) : ((m.attachments || []).length ? '(gửi ảnh/đính kèm)' : '');
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
export async function handleIncoming({ psid, text, pageId, kb, pkConvId, pkCustId, history }) {
  const state = getState(psid);
  state.psid = psid;
  state.pageId = pageId;                       // để tool gửi ảnh biết page nào
  if (pkConvId) state.pkConvId = pkConvId;      // ngữ cảnh Pancake để gửi ảnh cùng kênh
  if (pkCustId) state.pkCustId = pkCustId;
  const nHist = hydrateHistory(state, history, pageId);
  if (nHist) console.log(`[hist] nạp ${nHist} lượt lịch sử Pancake cho khách ${psid} (page ${pageId})`);

  kb = kb || getKBForPage(pageId);
  recordInbound(psid, { pageId, pageName: kb.pageName, text });

  // Nhân viên đã tiếp quản → AI im lặng.
  if (state.handoff) return { reply: null, handoff: true };

  // AI bị TẮT cho page này (dashboard) → để nhân viên lo.
  if (pageId && !isAiEnabled(pageId)) return { reply: null, handoff: false, aiOff: true };

  // Page chưa có KB → không bịa, chuyển người.
  if (kb.noData) {
    state.handoff = true; state.handoffReason = 'page_no_kb';
    return reply(psid, holdingMessage('en'), true);
  }

  const cls = await classify(text, kb.products[0]?.name);

  if (cls.intent === 'spam' && cls.is_spam_conf >= 0.8) {
    return { reply: null, handoff: false, archived: true };
  }

  state.messages.push({ role: 'user', content: text });

  if (cls.intent === 'complaint') {
    state.handoff = true; state.handoffReason = 'complaint';
    return reply(psid, holdingMessage(cls.lang), true);
  }
  // Tin quá ngắn/tầm thường ("hm", "hi", "ok", "?", emoji...) hay bị đoán nhầm là "ngôn ngữ lạ".
  // KHÔNG chuyển người trong trường hợp này — cứ để closer chào & tư vấn (mặc định English/Taglish),
  // tránh mất khách ngay câu đầu khi họ vừa bấm vào quảng cáo.
  const letters = text.trim().replace(/[^\p{L}]/gu, '');
  const trivialMsg = letters.length <= 12 || text.trim().split(/\s+/).length <= 2;
  if (cls.lang === 'other' && !trivialMsg) {
    state.handoff = true; state.handoffReason = 'lang_unknown';
    return reply(psid, holdingMessage(cls.lang), true);
  }
  if (state.aiTurns >= config.maxAiTurnsBeforeHandoff) {
    state.handoff = true; state.handoffReason = 'max_turns';
    return reply(psid, holdingMessage(cls.lang), true);
  }

  const text2 = await runCloser({ kb, state });
  state.aiTurns += 1;
  return reply(psid, text2, state.handoff);
}

function reply(psid, text, handoff) {
  recordOutbound(psid, text);
  return { reply: text, handoff };
}

function holdingMessage(lang) {
  if (lang === 'tl') return 'Sandali lang po, may makakausap kayong team member namin agad. 🙏';
  if (lang === 'en') return 'One moment please — a team member will assist you shortly. 🙏';
  return 'Sandali lang po / one moment — a team member will assist you shortly. 🙏';
}
