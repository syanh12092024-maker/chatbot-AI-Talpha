// Vòng lặp hỏi Pancake tin mới → AI trả lời → gửi lại qua Pancake.
// KHÔNG cần webhook/URL công khai/tunnel/App Review — chỉ cần internet ra ngoài.
import { config } from './config.js';
import { pkGetConversations, pkGetMessages, pkSendReply, refreshPancakePages } from './pancake.js';
import { listAiEnabled } from './store.js';
import { handleIncoming } from './handler.js';
import { incReply, incLead } from './stats.js';
import { logAi } from './ai-log.js';
import { addAiConv } from './ai-convs.js';

// Thẻ hệ thống Pancake = -(mã trạng thái đơn). Có 1 trong các thẻ này nghĩa là ĐƠN ĐÃ CHỐT
// & đang được xử lý → AI ngừng bán/tư vấn hội thoại đó (tránh chốt lại, tạo đơn trùng).
//  -1 submitted(đã xác nhận) · -2 shipped(ĐÃ GỬI) · -3 delivered(đã nhận)
//  -11 waitting(chờ hàng) · -12 wait_print(chờ in) · -20 ordered(đã đặt hàng)
const ORDER_STOP_TAGS = new Set([-1, -2, -3, -11, -12, -20]);

// convId -> mốc last_customer_interactive_at đã xử lý (chống trả lời lặp)
const seen = new Map();
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

async function pollAll() {
  const pages = listAiEnabled(); // chỉ page bật AI (id = FB page id = Pancake page id)
  for (const pageId of pages) {
    const f = sendFail.get(pageId);
    if (f && f.pausedUntil > Date.now()) continue; // đang backoff → bỏ qua page này
    try { await pollPage(pageId); } catch (e) { console.warn(`[pancake] page ${pageId}:`, e.message); }
  }
}

async function pollPage(pageId) {
  const convs = await pkGetConversations(pageId);
  const firstTime = !primedPages.has(pageId); // lần đầu page này được quét → chỉ ghi mốc
  for (const c of convs) {
    const psid = c.from_psid;
    const custId = (c.customers || [])[0]?.id;
    if (!psid || !custId) continue;
    const mark = c.last_customer_interactive_at || c.updated_at || '';
    if (seen.get(c.id) === mark) continue; // mốc này đã xử lý
    seen.set(c.id, mark);
    if (firstTime) continue; // page mới bật AI: chỉ ghi mốc hội thoại cũ, không trả lời

    // NHƯỜNG NHÂN VIÊN: chỉ áp dụng khi BẬT config.respectAssignee. Mặc định TẮT vì Pancake
    // tự động gán hội thoại cho nhân viên → nếu bật, AI sẽ im gần hết (sale chỉ nắm đơn, không chat).
    if (config.respectAssignee && (c.assignee_ids || []).length > 0) { console.log(`[pancake] ${c.from?.name || psid}: đã gán nhân viên → AI nhường`); continue; }

    // ĐƠN ĐÃ ĐƯỢC XỬ LÝ → AI IM HẲN (không tư vấn bán lại, không tạo đơn trùng).
    // Pancake tự gắn thẻ hệ thống = -(mã trạng thái đơn): -1 đã xác nhận, -2 ĐÃ GỬI, -3 đã nhận,
    // -11 chờ hàng, -12 chờ in, -20 đã đặt hàng. Có thẻ này = đơn đang chạy, để nhân viên lo.
    const stopTag = (c.tags || []).find((t) => ORDER_STOP_TAGS.has(Number(t)));
    if (stopTag !== undefined) { console.log(`[pancake] ${c.from?.name || psid}: đơn đang xử lý (thẻ ${stopTag}) → AI im`); continue; }

    // Chỉ trả lời khi TIN CUỐI là của khách (không phải page/Botcake).
    const msgs = await pkGetMessages(pageId, c.id, custId);
    const last = msgs[msgs.length - 1];
    if (!last) continue;
    if (String(last.from?.id) === String(pageId)) continue; // page/botcake đã nói cuối → bỏ
    const text = (last.original_message || last.message || '').trim();
    if (!text) continue;

    // NHƯỜNG TIN ĐẦU cho Botcake: Botcake luôn bắn câu chào đầu tiên. Nếu khách MỚI
    // gửi đúng 1 tin (đây là tin mở đầu) → AI im lặng, để Botcake chào; AI chỉ vào cuộc
    // từ tin thứ 2 của khách trở đi (lúc khách thực sự hỏi/trao đổi).
    const custMsgCount = msgs.filter((m) => String(m.from?.id) !== String(pageId) && (m.original_message || m.message || '').trim()).length;
    if (custMsgCount <= 1) { console.log(`[pancake] ${c.from?.name || psid}: tin đầu "${text.slice(0, 24)}" → nhường Botcake chào`); continue; }

    // history = msgs (đã fetch sẵn ở trên) → AI đọc toàn bộ hội thoại trước khi soạn tin.
    const { reply } = await handleIncoming({ psid, text, pageId, pkConvId: c.id, pkCustId: custId, history: msgs, custName: c.from?.name || '' });
    if (!reply) continue;
    const r = await pkSendReply(pageId, c.id, custId, reply);
    noteSendResult(pageId, r.ok, r.error); // backoff: 2 lần lỗi liên tiếp → ngừng page 30 phút
    if (r.ok) {
      try { incReply(pageId); incLead(pageId, custId); } catch { /* thống kê không chặn gửi tin */ }
      try { addAiConv(pageId, c.id); } catch { /* ghi hội thoại AI để khớp đơn */ }
      try { logAi(pageId, custId, 'reply', { name: c.from?.name || '', text: reply.slice(0, 80), conv: c.id }); } catch { /* sổ AI không chặn */ }
    }
    console.log(`[pancake] ${c.from?.name || psid}: "${text.slice(0, 30)}" → AI: "${reply.slice(0, 40)}" ${r.ok ? '✓' : '✗ ' + r.error}`);
    if (!r.ok && (sendFail.get(pageId)?.pausedUntil || 0) > Date.now()) return; // vừa kích hoạt backoff → dừng page ngay trong lượt này
  }
  if (firstTime) { primedPages.add(pageId); console.log(`[pancake] page ${pageId} đã ghi mốc — từ giờ chỉ trả lời tin MỚI.`); }
}
