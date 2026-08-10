// Vòng lặp hỏi Pancake tin mới → AI trả lời → gửi lại qua Pancake.
// KHÔNG cần webhook/URL công khai/tunnel/App Review — chỉ cần internet ra ngoài.
import { config } from './config.js';
import { pkGetConversations, pkGetMessages, pkSendReply, refreshPancakePages, pkTagByName, pkMarkUnread } from './pancake.js';
import { listAiEnabled, getState } from './store.js';
import { handleIncoming } from './handler.js';
import { incReply, incLead } from './stats.js';
import { logAi } from './ai-log.js';
import { addAiConv } from './ai-convs.js';
import { isLlmDown, llmHealth } from './llm-health.js';
import { decideConv, noteAiSpoke, markPostSale, ORDER_STOP_TAGS } from './conv-owner.js';
import { pruneConvStates } from './conv-state.js';

// ORDER_STOP_TAGS chuyển sang conv-owner.js (M05) — nơi giữ toàn bộ luật "ai được nói".

// Đợi khách gõ xong mới trả lời (chống dội bom khách nhắn dồn) — chỉnh bằng REPLY_DEBOUNCE_MS.
const REPLY_DEBOUNCE_MS = Number(process.env.REPLY_DEBOUNCE_MS || 20000);

// convId -> mốc last_customer_interactive_at đã xử lý (chống trả lời lặp)
const seen = new Map();
// DEBOUNCE theo ĐỒNG HỒ SERVER: timestamp Pancake không có múi giờ (Date.parse hiểu sai lệch
// nhiều giờ) → thay vì tin nó, ghi lại THỜI ĐIỂM MÌNH THẤY mốc mới, đợi đủ N giây rồi mới xử lý.
const pendingMark = new Map(); // convId -> { mark, firstAt }
const aiTagged = new Set(); // hội thoại đã gắn thẻ bot (đỡ gọi API lặp — API vốn idempotent)
// LỖI KỸ THUẬT THEO HỘI THOẠI (bộ lọc 3 tầng — không ngập hàng chờ):
//  T1: lỗi thoáng qua (mạng/5xx/quá tải) → thử lại tick sau, tối đa 5 lần; lỗi không tự hồi
//      phục (Claude 400 invalid_request) → không thử lại vô ích.
//  T2: cùng 1 hội thoại lỗi ≥3 lần liên tiếp → mới coi là kẹt thật.
//  T3: mỗi hội thoại chỉ đẩy hàng chờ 1 lần/24h + gắn thẻ 'AI back Sale'.
const convFail = new Map(); // convId -> { count, lastPushAt }
function pruneMaps() { // chống phình RAM sau nhiều tuần chạy
  if (aiTagged.size > 8000) { let n = aiTagged.size - 6000; for (const k of aiTagged) { aiTagged.delete(k); if (--n <= 0) break; } }
  for (const m of [seen, pendingMark, convFail]) {
    if (m.size > 8000) { let n = m.size - 6000; for (const k of m.keys()) { m.delete(k); if (--n <= 0) break; } }
  }
}
const primedPages = new Set(); // page đã "ghi mốc lần đầu" — tránh trả lời loạt hội thoại cũ khi mới bật AI

// BACKOFF (nguyên tắc #9): page gửi tin thất bại 2 lần LIÊN TIẾP (vd Meta chặn #2022)
// → tạm ngừng gửi 30 phút, tránh spam retry làm Meta phạt nặng thêm. Gửi OK là reset đếm.
const SEND_FAIL_LIMIT = 2;
const SEND_PAUSE_MS = 30 * 60 * 1000;
const sendFail = new Map(); // pageId -> { count, pausedUntil, lastError }
export function sendHealth() {
  const pk = new Map();
  for (const [id, v] of sendFail) {
    if (v.count > 0 || v.pausedUntil > Date.now()) pk.set(id, v);
  }
  return [...pk.entries()].map(([page, v]) => ({ page, count: v.count, pausedUntil: v.pausedUntil || 0, lastError: (v.lastError || '').slice(0, 160) }));
}
function noteSendResult(pageId, ok, error) {
  if (ok) { sendFail.delete(pageId); return; }
  const f = sendFail.get(pageId) || { count: 0, pausedUntil: 0, lastError: '' };
  f.count += 1; f.lastError = error || '';
  if (f.count >= SEND_FAIL_LIMIT) {
    f.pausedUntil = Date.now() + SEND_PAUSE_MS;
    console.warn(`[backoff] page ${pageId} lỗi gửi ${f.count} lần liên tiếp → TẠM NGỪNG 30 phút. Lỗi: ${String(error || '').slice(0, 120)}`);
  }
  sendFail.set(pageId, f);
}

export function startPancakePolling() {
  if (!config.pancakeToken) { console.warn('[pancake] chưa có PANCAKE_TOKEN → không bật polling.'); return; }
  // Nạp danh sách page từ Pancake (nguồn chính cho dashboard) + làm mới mỗi 10 phút.
  refreshPancakePages().then((n) => console.log(`[pancake] ${n} page từ Pancake.`));
  setInterval(() => refreshPancakePages(), 10 * 60 * 1000);
  // PANCAKE_READONLY=1: chỉ nạp danh sách page cho dashboard, KHÔNG auto-reply.
  // Dùng khi chạy bản sao (máy dev) song song với VPS — tránh 2 server cùng nhắn khách.
  if (process.env.PANCAKE_READONLY === '1') { console.warn('[pancake] READONLY → chỉ xem dashboard, không auto-reply.'); return; }
  console.log(`[pancake] Bật polling mỗi ${config.pancakePollMs / 1000}s (nhận/gửi tin qua Pancake, không cần webhook FB).`);
  const tick = () => pollAll().catch((e) => console.warn('[pancake] poll lỗi:', e.message));
  tick();
  setInterval(tick, config.pancakePollMs);
}

// ===== XỬ LÝ SONG SONG (semaphore): tối đa CONV_CONCURRENCY khách cùng lúc TOÀN HỆ THỐNG =====
// Giờ cao điểm ads không còn xếp hàng tuần tự từng khách. Chỉnh bằng CONV_CONCURRENCY trong .env.
const CONV_CONCURRENCY = Number(process.env.CONV_CONCURRENCY || 4);
let _slots = CONV_CONCURRENCY; const _waiters = [];
const _acquire = () => (_slots > 0 ? (_slots--, Promise.resolve()) : new Promise((r) => _waiters.push(r)));
const _release = () => { const w = _waiters.shift(); if (w) w(); else _slots++; };

let _pollRunning = false; // chống 2 vòng poll chồng lên nhau khi 1 vòng chạy lâu
let _downNotice = 0;
async function pollAll() {
  if (_pollRunning) return;
  // TẦNG LLM HỎNG (hết tiền / sai key) → DỪNG HẲN vòng xử lý.
  // Không xử lý = không lỗi = không đẩy khách vào hàng chờ. 08–10/08/2026 thiếu cửa này
  // nên bot vẫn cần cù quay vòng và tạo 2.652 handoff "⚙️ Lỗi kỹ thuật" vô nghĩa,
  // đồng thời KHÔNG ghi mốc `seen` → khi nạp tiền xong, tin cũ vẫn được trả lời bình thường.
  if (isLlmDown()) {
    if (Date.now() - _downNotice > 60000) {
      _downNotice = Date.now();
      const h = llmHealth();
      console.warn(`[pancake] ⏸ TẠM DỪNG ${h.downMinutes} phút — tầng LLM hỏng: ${h.reason}`);
    }
    return;
  }
  _pollRunning = true;
  try {
    const pages = listAiEnabled().filter((pageId) => {
      const f = sendFail.get(pageId);
      return !(f && f.pausedUntil > Date.now()); // đang backoff → bỏ qua page này
    });
    // Các page quét song song; từng hội thoại chen vào semaphore chung 4 slot.
    await Promise.all(pages.map((pageId) => pollPage(pageId).catch((e) => console.warn(`[pancake] page ${pageId}:`, e.message))));
    pruneMaps();
    if (Math.random() < 0.002) pruneConvStates(); // ~1 lần/giờ ở nhịp 6s — dọn hội thoại cũ
  } finally { _pollRunning = false; }
}

async function pollPage(pageId) {
  const convs = await pkGetConversations(pageId);
  const firstTime = !primedPages.has(pageId); // lần đầu page này được quét → chỉ ghi mốc
  const jobs = [];
  for (const c of convs) {
    const psid = c.from_psid;
    const custId = (c.customers || [])[0]?.id;
    if (!psid || !custId) continue;
    const mark = c.last_customer_interactive_at || c.updated_at || '';
    if (seen.get(c.id) === mark) continue; // mốc này đã xử lý
    // DEBOUNCE (chống dội bom): thấy mốc MỚI → ghi giờ server, đợi đủ N giây (khách có thể
    // còn đang gõ tiếp); khi khách ngừng gõ mới trả lời 1 LẦN cho cả cụm tin.
    if (!firstTime) {
      const pd = pendingMark.get(c.id);
      if (!pd || pd.mark !== mark) { pendingMark.set(c.id, { mark, firstAt: Date.now() }); continue; }
      if (Date.now() - pd.firstAt < REPLY_DEBOUNCE_MS) continue;
      pendingMark.delete(c.id);
    }
    seen.set(c.id, mark);
    if (firstTime) continue; // page mới bật AI: chỉ ghi mốc hội thoại cũ, không trả lời

    // NHƯỜNG NHÂN VIÊN: chỉ áp dụng khi BẬT config.respectAssignee. Mặc định TẮT vì Pancake
    // tự động gán hội thoại cho nhân viên → nếu bật, AI sẽ im gần hết (sale chỉ nắm đơn, không chat).
    // M05 thay thế cửa này bằng nhận diện theo HÀNH VI (xem conv-owner.js § ④).
    if (config.respectAssignee && (c.assignee_ids || []).length > 0) { console.log(`[pancake] ${c.from?.name || psid}: đã gán nhân viên → AI nhường`); continue; }

    // ĐƠN ĐÃ ĐƯỢC XỬ LÝ → AI IM HẲN. Chốt sớm ở đây để khỏi tải danh sách tin vô ích;
    // decideConv (M05) vẫn kiểm lại đầy đủ khi đã có tin trong tay.
    const stopTag = (c.tags || []).find((t) => ORDER_STOP_TAGS.has(Number(t)));
    if (stopTag !== undefined) {
      markPostSale(c.id, `đơn đang xử lý (thẻ ${stopTag})`);
      console.log(`[pancake] ${c.from?.name || psid}: đơn đang xử lý (thẻ ${stopTag}) → AI im`);
      continue;
    }

    jobs.push((async () => {
      await _acquire();
      try { await processConv(pageId, c, psid, custId); convFail.delete(c.id); }
      catch (e) { noteConvError(pageId, c, psid, custId, e); }
      finally { _release(); }
    })());
  }
  await Promise.all(jobs);
  if (firstTime) { primedPages.add(pageId); console.log(`[pancake] page ${pageId} đã ghi mốc — từ giờ chỉ trả lời tin MỚI.`); }
}

// Lỗi khi xử lý 1 hội thoại: phân loại → thử lại có giới hạn → lỗi lặp 3 lần thì đẩy sale.
function noteConvError(pageId, c, psid, custId, e) {
  const msg = String(e?.message || e);
  const fatal = /invalid_request_error/i.test(msg); // lỗi dữ liệu — cùng input thì lỗi mãi, thử lại vô ích
  const f = convFail.get(c.id) || { count: 0, lastPushAt: 0 };
  f.count += 1; convFail.set(c.id, f);
  console.warn(`[pancake] khách ${c.from?.name || psid} (page ${pageId}) lỗi lần ${f.count}${fatal ? ' (không tự hồi phục)' : ''}: ${msg.slice(0, 160)}`);
  if (!fatal && f.count < 5) seen.delete(c.id); // lỗi thoáng qua → tick sau thử lại (tối đa 5 lần)
  // LỖI TẦNG LLM (hết tiền / sai key) KHÔNG phải lỗi của hội thoại này — mọi khách đều
  // dính. Đẩy hàng chờ là làm ngập sale bằng rác (đo 09/08/2026: 1.213 cái trong 1 ngày).
  // Xoá bộ đếm để khi LLM sống lại, hội thoại được xử lý sạch từ đầu.
  if (isLlmDown()) {
    convFail.delete(c.id);
    seen.delete(c.id);
    return;
  }
  if (f.count >= 3 && Date.now() - f.lastPushAt > 24 * 3600e3) {
    f.lastPushAt = Date.now();
    try {
      logAi(pageId, custId, 'handoff', {
        reason: `⚙️ Lỗi kỹ thuật — AI không trả lời được khách này (đã thử ${f.count} lần), cần người vào chat ngay`,
        kind: 'error', conv: c.id, name: c.from?.name || '',
      });
    } catch { /* sổ AI không chặn */ }
    if (config.pkTags.handoff) pkTagByName(pageId, c.id, config.pkTags.handoff).catch(() => {});
    console.warn(`[backsale] ⚙️ ${c.from?.name || psid} (page ${pageId}) → đẩy hàng chờ sale vì lỗi lặp ${f.count} lần`);
  }
}

// Xử lý 1 hội thoại (chạy trong semaphore): đọc tin → AI soạn → gửi qua Pancake.
async function processConv(pageId, c, psid, custId) {
  const msgs = await pkGetMessages(pageId, c.id, custId);
  if (!msgs.length) return;

  // ── M05 · AI CÓ ĐƯỢC NÓI KHÔNG? ────────────────────────────────────────────
  // Một cửa duy nhất thay cho các cửa canh rời rạc của v1: đơn đã chốt · tin cuối
  // là của page · tin đầu nhường Botcake · người thật đã tiếp quản.
  const d = decideConv({ pageId, conv: c, msgs, custId });
  if (!d.allow) {
    if (d.changed) console.log(`[owner] ${c.from?.name || psid} (page ${pageId}): → ${d.state} — ${d.reason}`);
    return;
  }

  // GỘP CỤM TIN DỒN: lấy TẤT CẢ tin khách liên tiếp ở cuối hội thoại → trả lời 1 LẦN cho cả cụm.
  const burst = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (String(m.from?.id) === String(pageId)) break;
    const tx = (m.original_message || m.message || '').trim();
    if (tx) burst.unshift(tx);
  }
  const text = burst.join('\n');
  if (!text) return;

  // KHOÁ BOTCAKE NGAY, TRƯỚC KHI AI SOẠN TIN.
  // Gắn thẻ 'AI Chăm' ở đây (chứ không phải sau khi gửi xong như v1) để kịch bản Botcake
  // — vốn có điều kiện "không chạy nếu hội thoại có thẻ AI Chăm" — dừng lại trong lúc AI
  // còn đang soạn. v1 gắn muộn nên Botcake vẫn kịp chen vào giữa (đo: 75% hội thoại).
  if (config.pkTags.ai && !aiTagged.has(c.id)) {
    aiTagged.add(c.id);
    pkTagByName(pageId, c.id, config.pkTags.ai).then((t) => { if (!t.ok) console.warn(`[tag] ${pageId}: ${t.error}`); }).catch(() => {});
  }

  // history = msgs (đã fetch sẵn ở trên) → AI đọc toàn bộ hội thoại trước khi soạn tin.
  const { reply, lane } = await handleIncoming({ psid, text, pageId, pkConvId: c.id, pkCustId: custId, history: msgs, custName: c.from?.name || '' });
  if (!reply) return;
  // Page vừa rơi vào backoff (do job song song khác) → thôi không gửi thêm.
  if ((sendFail.get(pageId)?.pausedUntil || 0) > Date.now()) return;
  const r = await pkSendReply(pageId, c.id, custId, reply);
  noteSendResult(pageId, r.ok, r.error); // backoff: 2 lần lỗi liên tiếp → ngừng page 30 phút
  if (r.ok) {
    try { incReply(pageId); incLead(pageId, custId); } catch { /* thống kê không chặn gửi tin */ }
    try { addAiConv(pageId, c.id); } catch { /* ghi hội thoại AI để khớp đơn */ }
    // Ghi kèm TOKEN THẬT của lượt (đo trong closer.js) — nguồn số liệu chi phí theo page.
    const u = getState(psid).lastUsage || {};
    // `lane` = tin do đâu soạn ('AI' hay 'tpl_price'/'tpl_greet'… của Fast Lane).
    // Đây là điều kiện cần để đo "tỷ lệ tin xử lý 0 token" và tách chi phí theo tầng.
    try { logAi(pageId, custId, 'reply', { name: c.from?.name || '', text: reply.slice(0, 80), conv: c.id, lane: lane || 'AI', state: d.state, tin: u.tin || 0, tout: u.tout || 0, cread: u.cread || 0, calls: u.calls || 0 }); } catch { /* sổ AI không chặn */ }
    // M05: ghi nhận AI vừa nói — để lượt sau phân biệt được "tin của mình" với "người thật gõ".
    try { noteAiSpoke(c.id, reply); } catch { /* trạng thái không chặn gửi tin */ }
    // (thẻ 'AI Chăm' đã gắn TRƯỚC khi soạn tin — xem M05 phía trên)
    // ĐÁNH DẤU CHƯA ĐỌC lại (cơ chế Botcake): bot rep xong Pancake coi hội thoại là "đã xử lý"
    // → trôi khỏi hàng chờ sale. Gọi /unread SAU MỖI tin AI gửi để sale vẫn thấy mà check.
    if (config.markUnread) {
      pkMarkUnread(pageId, c.id).then((u) => { if (!u.ok) console.warn(`[unread] ${pageId}: ${u.error}`); }).catch(() => {});
    }
  }
  console.log(`[pancake] ${c.from?.name || psid}: "${text.slice(0, 30)}" → AI: "${reply.slice(0, 40)}" ${r.ok ? '✓' : '✗ ' + r.error}`);
}
