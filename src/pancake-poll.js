// Vòng lặp hỏi Pancake tin mới → AI trả lời → gửi lại qua Pancake.
// KHÔNG cần webhook/URL công khai/tunnel/App Review — chỉ cần internet ra ngoài.
import { config } from './config.js';
import { pkGetConversations, pkGetMessages, pkSendReply, refreshPancakePages } from './pancake.js';
import { listAiEnabled } from './store.js';
import { handleIncoming } from './handler.js';
import { incReply, incLead } from './stats.js';
import { logAi } from './ai-log.js';
import { addAiConv } from './ai-convs.js';

// convId -> mốc last_customer_interactive_at đã xử lý (chống trả lời lặp)
const seen = new Map();
const primedPages = new Set(); // page đã "ghi mốc lần đầu" — tránh trả lời loạt hội thoại cũ khi mới bật AI

export function startPancakePolling() {
  if (!config.pancakeToken) { console.warn('[pancake] chưa có PANCAKE_TOKEN → không bật polling.'); return; }
  console.log(`[pancake] Bật polling mỗi ${config.pancakePollMs / 1000}s (nhận/gửi tin qua Pancake, không cần webhook FB).`);
  // Nạp danh sách page từ Pancake (nguồn chính cho dashboard) + làm mới mỗi 10 phút.
  refreshPancakePages().then((n) => console.log(`[pancake] ${n} page từ Pancake.`));
  setInterval(() => refreshPancakePages(), 10 * 60 * 1000);
  const tick = () => pollAll().catch((e) => console.warn('[pancake] poll lỗi:', e.message));
  tick();
  setInterval(tick, config.pancakePollMs);
}

async function pollAll() {
  const pages = listAiEnabled(); // chỉ page bật AI (id = FB page id = Pancake page id)
  for (const pageId of pages) {
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

    // NHƯỜNG NHÂN VIÊN: hội thoại đã được GÁN cho 1 nhân viên (assignee) → sale đang lo,
    // AI IM HẲN (không đè). Sale bỏ gán là AI tự trả lại luồng.
    if ((c.assignee_ids || []).length > 0) { console.log(`[pancake] ${c.from?.name || psid}: đã gán nhân viên → AI nhường`); continue; }

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

    const { reply } = await handleIncoming({ psid, text, pageId, pkConvId: c.id, pkCustId: custId });
    if (!reply) continue;
    const r = await pkSendReply(pageId, c.id, custId, reply);
    if (r.ok) {
      try { incReply(pageId); incLead(pageId, custId); } catch { /* thống kê không chặn gửi tin */ }
      try { addAiConv(pageId, c.id); } catch { /* ghi hội thoại AI để khớp đơn */ }
      try { logAi(pageId, custId, 'reply', { name: c.from?.name || '', text: reply.slice(0, 80) }); } catch { /* sổ AI không chặn */ }
    }
    console.log(`[pancake] ${c.from?.name || psid}: "${text.slice(0, 30)}" → AI: "${reply.slice(0, 40)}" ${r.ok ? '✓' : '✗ ' + r.error}`);
  }
  if (firstTime) { primedPages.add(pageId); console.log(`[pancake] page ${pageId} đã ghi mốc — từ giờ chỉ trả lời tin MỚI.`); }
}
