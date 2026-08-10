import { classify } from './classifier.js';
import { runCloser } from './closer.js';
import { getState, recordInbound, recordOutbound, isAiEnabled } from './store.js';
import { getKBForPage } from './kb.js';
import { config } from './config.js';
import { logAi, recentReplyCount, recentBotTurns } from './ai-log.js';
import { cleanText } from './text.js';
import { pkTagByName, pkAddNote } from './pancake.js';
import { fastLane, noteFastLane, detectLang } from './fast-lane.js';
import { guardOutbound, recordBlocked } from './outbound-guard.js';
import { markHandoff, markPostSale } from './conv-owner.js';
import { S, OWNER, getConv, touchConv, setConvState, noteLlmTurn, llmTurns24h, noteOppTurn } from './conv-state.js';
import { scoreTurn, turnBudget, TIER_LABEL, HARD_MAX_TURNS } from './lead-score.js';
import { detectPostSale, routePostSale, holdingPostSale, OPPORTUNITY_BRIEF, OPPORTUNITY_MAX_TURNS } from './post-sale.js';
import { emptyProfile, extractFromText, absorbToolUses, hydrateProfile, buildContextMessages, estimateTokens } from './context.js';

// M11 — công tắc quay về trần lượt cào bằng cũ (MAX_AI_TURNS) nếu ngân sách theo độ nóng
// gây bất ngờ trên production. Mặc định BẬT ngân sách mới.
const LEAD_BUDGET = process.env.LEAD_BUDGET !== '0';
// M07 — công tắc quay về nạp 20 tin thô. Mặc định BẬT hồ sơ nén.
const CTX_COMPRESS = process.env.CTX_COMPRESS !== '0';
// M13 — công tắc tắt nhận diện hậu bán theo nội dung.
const POST_SALE_ROUTER = process.env.POST_SALE_ROUTER !== '0';

// Khách bảo ĐỪNG NHẮN NỮA. Khoanh hẹp, chỉ những câu không thể hiểu nhầm: im nhầm một khách
// đang muốn mua thì mất một đơn, nhưng nhắn tiếp vào người đang bực thì mất cả page.
const STOP_CONTACT = /\b(harass(?:ing|ment)?|stop (?:messaging|sending|texting|contacting|spamming)|do ?n'?t (?:message|contact|text) me|leave me alone|huwag na (?:kayong|ninyong|kayo|niyo)|tigilan (?:niyo|nyo) (?:na )?ako|wag na (?:kayo|kayong)|i'?ll block you|iblock ko kayo|unsubscribe|remove me from)\b|لا ترسل|توقف عن الإرسال|اتركني/i;

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

// ── M07 · HỒ SƠ KHÁCH NÉN ───────────────────────────────────────────────────
// Hồ sơ sống ở conv-state.json (bền qua restart). Lần đầu gặp hội thoại thì dựng từ
// tối đa 20 tin Pancake ĐÚNG MỘT LẦN; từ đó về sau chỉ cập nhật thêm bằng regex trên
// tin khách + tham số tool của chính lượt vừa chạy — không nạp lại 20 tin nữa.
function loadProfile(state, history, pageId) {
  const convId = state.pkConvId;
  if (!convId) { // web/local-chat: không có hội thoại Pancake → hồ sơ tạm trong RAM
    return state.profile || (state.profile = emptyProfile());
  }
  const c = getConv(convId);
  let prof = c.profile;
  if (!prof || !prof.hydratedAt) {
    prof = hydrateProfile(Array.isArray(history) ? history : [], pageId, { ...emptyProfile(), ...(prof || {}) });
    touchConv(convId, { profile: prof });
    const have = ['name', 'phone', 'address'].filter((k) => prof[k]);
    console.log(`[ctx] dựng hồ sơ lần đầu cho hội thoại ${convId}${have.length ? ' — đã có: ' + have.join(', ') : ''}`);
  }
  return prof;
}

function saveProfile(state, prof) {
  if (state.pkConvId) touchConv(state.pkConvId, { profile: prof });
  else state.profile = prof;
}

// NẠP LỊCH SỬ THẬT từ Pancake vào bộ nhớ AI khi phiên còn trống (server mới khởi động /
// khách quay lại sau nhiều ngày). AI đọc hết những gì 2 bên đã nói (kể cả Botcake / sale tay)
// TRƯỚC khi soạn tin — không hỏi lại thứ khách đã cho, không chào lại từ đầu, biết khách đã đặt đơn.
// GIỮ LẠI cho công tắc CTX_COMPRESS=0 (đường lui khi hồ sơ nén có vấn đề trên production).
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
  // M07: hồ sơ nén thay cho việc nạp 20 tin thô mỗi lượt (dựng ngữ cảnh ngay trước khi
  // gọi model — xem phần "M07 · DỰNG NGỮ CẢNH" bên dưới). Đường lui: CTX_COMPRESS=0.
  if (!CTX_COMPRESS) {
    const nHist = hydrateHistory(state, history, pageId);
    if (nHist) console.log(`[hist] nạp ${nHist} lượt lịch sử Pancake cho khách ${psid} (page ${pageId})`);
  }
  // TRẦN LƯỢT BỀN VỮNG (#8): đồng bộ bộ đếm RAM với số tin AI đã trả trong 24h (từ Sổ AI)
  // → restart server không còn "reset chui" cho khách thêm lượt.
  if (state.pkCustId) {
    state.aiTurns = Math.max(state.aiTurns, recentReplyCount(pageId, state.pkCustId));
    // "Bot đã nói chưa" là câu hỏi KHÁC với "đã tiêu bao nhiêu lượt đắt tiền" — đếm riêng,
    // vì câu mẫu Fast Lane có tính là bot đã nói (nhưng không tiêu ngân sách). Xem ai-log.js.
    state.botTurns = Math.max(state.botTurns || 0, recentBotTurns(pageId, state.pkCustId));
  }

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

  // M07: hồ sơ khách (bền qua restart) — mọi tầng bên dưới đọc chung một hồ sơ này.
  const prof = loadProfile(state, history, pageId);

  // ── KHÁCH ĐÒI NGỪNG NHẮN — cửa chặn ĐẦU TIÊN, trên cả hậu bán lẫn Fast Lane ──
  // Bàn giao TRONG IM LẶNG: không câu giữ chỗ, không template, không gì cả. Một tin nữa
  // gửi vào đúng người vừa bảo dừng là đường ngắn nhất tới nút Block/Report — thứ làm hỏng
  // CẢ PAGE chứ không chỉ hỏng một đơn, và không có đơn nào bù lại được.
  // Ca thật: "Hey what youre doing you are harassing me and telling to reply and evryday
  // youre sending msg and I AM REPLYING…" — v1 vẫn bán tiếp.
  // Đặt ở handler chứ không ở classifier vì đây là quyết định ĐIỀU PHỐI (ai được nói),
  // không phải phân loại ý định — và classifier là file của luồng khác.
  if (STOP_CONTACT.test(text)) {
    state.handoff = true; state.handoffReason = 'stop_contact';
    toSaleQueue(state, `🔴 Khách YÊU CẦU NGỪNG NHẮN TIN — AI đã im hoàn toàn, chỉ người thật được liên hệ lại nếu thật sự cần\nKhách nói: "${String(text).slice(0, 120)}"`, 'stop_contact');
    console.log(`[stop] ${state.custName || psid} (page ${pageId}) đòi ngừng liên lạc — AI im`);
    return { reply: null, handoff: true, archived: true };
  }

  // ── M13 · POST-SALE ROUTER — chặn TRƯỚC cả Fast Lane ────────────────────────
  // Khách đã nhận hàng mà AI dội tiếp bài quảng cáo là lỗi nặng nhất đang có (ca Matess
  // Valdez: 13 lượt AI, 0 đơn, khách báo hàng vỡ). Nhận diện bằng NỘI DUNG vì thẻ đơn
  // Pancake không phủ hết. Nhánh này KHÔNG tiêu ngân sách bán.
  const ps = POST_SALE_ROUTER ? detectPostSale(text) : null;
  let opportunity = false;
  if (ps) {
    const conv = state.pkConvId ? getConv(state.pkConvId) : null;
    const hasOrderContext = !!(prof.ordered || state.closed || conv?.orderAt
      || conv?.state === S.CLOSING || conv?.state === S.POST_SALE);
    const route = routePostSale({ kind: ps.kind, oppTurns: conv?.oppTurns || 0, hasOrderContext });
    if (route.action !== 'NONE') {
      console.log(`[postsale] ${state.custName || psid} (page ${pageId}): ${ps.kind} → ${route.action}`);
    }
    if (route.action === 'HANDOFF_SALE' || route.action === 'HANDOFF_RTO' || route.action === 'OPPORTUNITY_DONE') {
      state.handoff = true; state.handoffReason = `post_sale_${ps.kind.toLowerCase()}`;
      const note = route.priority ? `🔴 ƯU TIÊN — ${route.reason}` : route.reason;
      toSaleQueue(state, `${note}\nKhách nói: "${String(text).slice(0, 120)}"`, `post_sale_${ps.kind.toLowerCase()}`);
      // Hậu bán = AI + Botcake đều khoá (bảng quyền nói §4). toSaleQueue đã ghi HANDOFF,
      // ghi đè bằng POST_SALE để dashboard và Botcake đọc đúng vì sao AI im.
      if (state.pkConvId) { try { markPostSale(state.pkConvId, route.reason); } catch { /* không chặn luồng chính */ } }
      // Tin giữ chỗ dựng bằng luật (0 token) — khách không bị bỏ lửng trong lúc chờ người.
      return reply(psid, holdingPostSale(ps.kind, detectLang(text)), true, 'POSTSALE');
    }
    if (route.action === 'OPPORTUNITY') {
      opportunity = true;
      // Giữ hội thoại ở POST_SALE nhưng chủ vẫn là AI → conv-owner mở đúng 2 lượt cơ hội.
      if (state.pkConvId) setConvState(state.pkConvId, S.POST_SALE, OWNER.AI, route.reason);
    }
  }

  // ── M11 · LEAD SCORING — chấm điểm mọi tin khách, kể cả tin sẽ do Fast Lane lo ─
  // Chấm trước Fast Lane để chuỗi tin cụt ("ok", "hm") vẫn bị trừ điểm đúng như spec.
  const lead = updateLead(state, text);

  // ── M06 · FAST LANE — chặn TRƯỚC mọi lần gọi LLM ────────────────────────────
  // 33,8% tin đang gọi model chỉ để đáp sticker / nút START / "ok" / "hi" / hỏi giá.
  // Tầng này xử lý chúng bằng luật + câu mẫu dựng từ KB, tốn 0 token.
  // Mọi trường hợp nghi ngờ đều leo lên AI (xem fast-lane.js).
  state.fastLanesUsed = state.fastLanesUsed || new Set();
  const fl = fastLane({
    text,
    kb,
    // Các lane IM LẶNG chỉ mở khi bot đã nói ít nhất 1 lần — dùng botTurns (mọi tin bot đã
    // gửi), KHÔNG dùng aiTurns (chỉ lượt gọi model). Nếu dùng aiTurns thì hội thoại mà Fast
    // Lane đang lo trọn vẹn sẽ mãi đứng ở 0 và không lane im nào mở được: đo trên 7.886 tin
    // khách thật, tỷ lệ Fast Lane tụt 42,0% → 25,5%, tức chạm đúng ngưỡng LÙI (<25%).
    aiTurns: Math.max(state.aiTurns, state.botTurns || 0),
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
    state.botTurns = (state.botTurns || 0) + 1; // câu mẫu vẫn là 'bot đã nói' (không tiêu ngân sách)
    // ẢNH TIN ĐẦU: 94,4% ảnh của hệ thống nằm ở lượt 1 — đúng lượt Fast Lane chặn.
    // Không đẩy ảnh lên đây thì Fast Lane biến lượt giới thiệu thành tin chữ trơ,
    // tức là TỆ HƠN bản đang chạy. `caption` đi kèm tấm đầu (nguyên tắc #2).
    const out = reply(psid, fl.reply, false, fl.lane);
    if (Array.isArray(fl.images) && fl.images.length) { out.images = fl.images; out.caption = fl.caption || ''; }
    return out;
  }

  const cls = await classify(text, kb.products[0]?.name);
  if (cls.__usage) { // cộng token classifier vào lượt (fallback lỗi thì không có usage — không tốn tiền)
    state.lastUsage.tin += cls.__usage.tin; state.lastUsage.tout += cls.__usage.tout;
    state.lastUsage.cread += cls.__usage.cread; state.lastUsage.calls += cls.__usage.calls;
  }

  if (cls.intent === 'spam' && cls.is_spam_conf >= 0.8) {
    return { reply: null, handoff: false, archived: true };
  }

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

  // ── M11 · NGÂN SÁCH LƯỢT THEO ĐỘ NÓNG ───────────────────────────────────────
  // Thay trần cào bằng MAX_AI_TURNS=4 — trần đó cắt đúng chỗ tỷ lệ chốt nhân lên
  // (lượt 4 → 11,2% · 5 → 16,7% · 6 → 18,9%) trong khi khách lạnh vẫn tiêu đủ 4 lượt.
  const gate = checkBudget(state, lead, opportunity);
  if (!gate.ok) {
    state.handoff = true; state.handoffReason = gate.kind;
    toSaleQueue(state, gate.reason, gate.kind);
    return reply(psid, holdingMessage(cls.lang), true);
  }

  // ── M07 · DỰNG NGỮ CẢNH: [hồ sơ ~150 token] + [6 tin gần nhất] ──────────────
  applyContext(state, {
    history, pageId, prof,
    meta: { state: opportunity ? S.POST_SALE : (state.aiTurns > 0 ? S.SELLING : S.QUALIFY), used: gate.used, max: gate.max, tier: gate.tier },
  });

  // Tin chỉ có ảnh/sticker (hoặc chỉ chứa nửa emoji nên bị dọn sạch) sẽ thành chuỗi RỖNG →
  // Claude trả 400 "user messages must have non-empty content" và khách không được trả lời.
  const cleaned = cleanText(text);
  const userTurn = cleaned.trim() || '(khách gửi ảnh/sticker)';
  // Nhánh CƠ HỘI (M13): gài lời nhắc hậu bán vào chính lượt của khách — prompt bán hàng
  // mặc định sẽ chào bán lại từ đầu nếu không nói rõ đây là khách ĐÃ MUA.
  state.messages.push({ role: 'user', content: opportunity ? `${OPPORTUNITY_BRIEF}\n\n[KHÁCH VỪA NHẮN]\n${userTurn}` : userTurn });

  const text2 = await runCloser({ kb, state });
  state.aiTurns += 1;
  state.botTurns = (state.botTurns || 0) + 1;
  noteTurnSpent(state, opportunity);
  // M07: hút thông tin của lượt vừa chạy vào hồ sơ — tham số tool là nguồn chính xác nhất,
  // và không tốn thêm lần gọi model nào (tool_use đã nằm sẵn trong state.messages).
  absorbToolUses(state.messages, prof);
  extractFromText(text, prof);
  if (state.closed) prof.ordered = true;
  saveProfile(state, prof);

  // ── M09 · OUTBOUND GUARD — cửa cuối trước khi tin tới khách ────────────────
  // Chặn tin rỗng / sai giá / lộ tiếng Việt / doạ khách / checklist / quá dài.
  // Vi phạm lần 1 → xin model viết lại ĐÚNG 1 lần; lần 2 → thà im còn hơn gửi bậy.
  const guarded = await guardAndMaybeRewrite(text2, { kb, state, pageId, psid });
  return reply(psid, guarded, state.handoff, 'AI');
}

// ── M11 · chấm điểm & ngân sách ─────────────────────────────────────────────

// Cộng điểm cho lượt khách vừa nhắn. Hồ sơ điểm bền theo hội thoại (conv-state.json).
function updateLead(state, text) {
  const convId = state.pkConvId;
  const c = convId ? getConv(convId) : null;
  const prev = (c ? c.lead : state.lead) || { signals: [], penalty: 0, stubStreak: 0, score: 0 };
  // Khách quay lại sau khi đã nguội = tín hiệu quan tâm thật (spec §M11: +2).
  const lead = scoreTurn(text, prev, { backFromCold: c?.state === S.COLD });
  if (convId) touchConv(convId, { lead }); else state.lead = lead;
  return lead;
}

// Còn lượt không? Trả { ok, used, max, tier } hoặc { ok:false, kind, reason }.
function checkBudget(state, lead, opportunity) {
  const convId = state.pkConvId;

  // Nhánh CƠ HỘI hậu bán: ngân sách RIÊNG, tách hẳn khỏi ngân sách bán mới (spec §M13).
  if (opportunity) {
    const used = convId ? (getConv(convId).oppTurns || 0) : 0;
    if (used >= OPPORTUNITY_MAX_TURNS) {
      return { ok: false, kind: 'post_sale_opp', reason: `Hậu bán: đã dùng hết ${OPPORTUNITY_MAX_TURNS} lượt mời mua lại — để sale chăm tiếp` };
    }
    return { ok: true, used, max: OPPORTUNITY_MAX_TURNS, tier: 'hậu bán' };
  }

  // Đường lui (LEAD_BUDGET=0) và các kênh không có hội thoại Pancake (web/local-chat):
  // giữ nguyên trần cào bằng cũ để hành vi không đổi.
  if (!LEAD_BUDGET || !convId) {
    const max = Math.min(config.maxAiTurnsBeforeHandoff, HARD_MAX_TURNS);
    if (state.aiTurns >= max) {
      return { ok: false, kind: 'max_turns', reason: `AI đã trả lời đủ ${max} lượt — khách còn do dự, cần người vào chốt` };
    }
    return { ok: true, used: state.aiTurns, max, tier: '' };
  }

  const b = turnBudget(lead);
  const used = llmTurns24h(convId);   // chỉ đếm lượt GỌI MODEL, câu Fast Lane không tính
  const tier = TIER_LABEL[b.tier] || b.tier;
  if (used >= b.max) {
    const pri = b.priority ? '🔴 ƯU TIÊN (khách đã cho SĐT + địa chỉ) — ' : '';
    return {
      ok: false, kind: 'max_turns',
      reason: `${pri}AI đã dùng hết ngân sách ${b.max} lượt/24h (khách ${tier}, điểm ${lead.score}) — khách còn do dự, cần người vào chốt`,
    };
  }
  return { ok: true, used, max: b.max, tier, priority: b.priority };
}

// Ghi lượt vừa tiêu vào sổ bền (sống sót qua restart — nguyên tắc #8).
function noteTurnSpent(state, opportunity) {
  if (!state.pkConvId) return;
  try {
    if (opportunity) noteOppTurn(state.pkConvId);
    else noteLlmTurn(state.pkConvId);
  } catch { /* sổ lượt không chặn luồng chính */ }
}

// ── M07 · thay 20 tin thô bằng [hồ sơ nén] + [6 tin gần nhất] ────────────────
function applyContext(state, { history, pageId, prof, meta }) {
  if (!CTX_COMPRESS || !Array.isArray(history) || !history.length) return 0;
  const { messages, kept, dropped } = buildContextMessages({ prof, msgs: history, pageId, meta });
  state.messages = messages;
  state.lastCtxTokens = estimateTokens(messages.map((m) => m.content).join('\n'));
  console.log(`[ctx] ${state.custName || state.psid} (page ${pageId}): hồ sơ + ${kept} tin (bỏ ${dropped} tin rác/template) ≈ ${state.lastCtxTokens} token`);
  return kept;
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
