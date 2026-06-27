import { classify } from './classifier.js';
import { runCloser } from './closer.js';
import { getState, recordInbound, recordOutbound, isAiEnabled } from './store.js';
import { getKBForPage } from './kb.js';
import { config } from './config.js';

// Xử lý 1 tin nhắn đến. Trả về { reply, handoff } — reply=null nghĩa là không tự trả.
export async function handleIncoming({ psid, text, pageId, kb }) {
  const state = getState(psid);
  state.psid = psid;

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
  if (cls.lang === 'other') {
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
