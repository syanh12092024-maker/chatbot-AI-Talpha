// Vòng lặp hỏi Pancake tin mới → AI trả lời → gửi lại qua Pancake.
// KHÔNG cần webhook/URL công khai/tunnel/App Review — chỉ cần internet ra ngoài.
import { config } from './config.js';
import { pkGetConversations, pkGetMessages, pkSendReply, refreshPancakePages, pkTagByName, pkMarkUnread } from './pancake.js';
import { listAiEnabled, getState } from './store.js';
import { handleIncoming } from './handler.js';
import { incReply, incLead, incInbound } from './stats.js';
import { flushPendingImages } from './tools.js';
import { logAi } from './ai-log.js';
import { addAiConv } from './ai-convs.js';
import { isLlmDown, llmHealth } from './llm-health.js';
import { debounceFor } from './turn-complete.js';
import { decideConv, noteAiSpoke, markPostSale, ORDER_STOP_TAGS } from './conv-owner.js';
import { pruneConvStates } from './conv-state.js';

// ORDER_STOP_TAGS chuyển sang conv-owner.js (M05) — nơi giữ toàn bộ luật "ai được nói".

// Đợi khách gõ xong mới trả lời (chống dội bom khách nhắn dồn) — chỉnh bằng REPLY_DEBOUNCE_MS.
const REPLY_DEBOUNCE_MS = Number(process.env.REPLY_DEBOUNCE_MS || 20000);

// ═══ NHƯỜNG BOTCAKE — chủ trương: AI LUÔN đi sau, không bao giờ nói chồng ═══
// Đo 10/08/2026 trên 60 hội thoại thật: 75% hội thoại có AI bị template Botcake đâm ngang.
// Ca thật (khách Cristita Andales): AI vừa chốt "So ready na ba sa address mo? 😊" thì
// Botcake dội nguyên checklist "✔️Your full name ✔️Contact number…" — đúng thứ HARD_RULES
// cấm AI làm — ngay sau khi khách nói chưa cần. Mất đơn.
//
// Cách xử lý: thay vì bắt Botcake im (phải cấu hình điều kiện thẻ bên Botcake, và chưa
// chắc Botcake đọc được thẻ Pancake), ta cho AI CHỦ ĐỘNG NHƯỜNG — soi lại hội thoại ở
// hai thời điểm, thấy page vừa nói thì bỏ lượt. Không cần Botcake hợp tác gì cả.
//
//   ① sau debounce, chờ thêm BOTCAKE_GRACE_MS rồi mới đọc tin → nếu page đã nói,
//      decideConv trả "tin cuối là của page" và AI im, CHƯA tốn token nào
//   ② ngay trước khi gửi, đọc lại lần nữa → nhường; token đã tiêu nhưng khách
//      KHÔNG nhận hai câu chồng lên nhau. Đây là cửa quan trọng nhất vì AI soạn
//      tin mất vài giây, Botcake hoàn toàn có thể trả lời trong khoảng đó.
//
// Đánh đổi: khách chờ thêm vài giây. Chủ dự án đã chọn đánh đổi này.
const BOTCAKE_GRACE_MS = Number(process.env.BOTCAKE_GRACE_MS ?? 6000);
const BOTCAKE_YIELD_BEFORE_SEND = process.env.BOTCAKE_YIELD_BEFORE_SEND !== '0';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Giữa hai lần đọc, PAGE có gửi tin nào không?
//
//  · KHÔNG so theo mốc thời gian: timestamp Pancake không kèm múi giờ, Date.parse hiểu
//    sai nhiều giờ (xem ghi chú debounce phía trên).
//  · KHÔNG so theo SỐ TIN: đo thật 11/08/2026 — `pkGetMessages` trả về TỐI ĐA 25 tin.
//    Hội thoại ≥25 tin thì cửa sổ TRƯỢT (tin cũ nhất rơi ra, tin mới thêm vào) nên độ dài
//    KHÔNG đổi dù page vừa nói. Đây đúng là những hội thoại bận rộn nhất — so theo số
//    lượng là hỏng ở chính chỗ cần nhất.
//  → So theo `id` của tin (Pancake có sẵn trường này).
//  · PHẢI TRỪ TIN CỦA CHÍNH MÌNH (`ignoreOwn`): tool `send_product_image` gửi ảnh
//    NGAY TRONG LÚC model đang viết (tools.js:97), nên tới lúc soi thì trên hội
//    thoại đã có tin mới do chính ta đẩy lên. Không trừ thì ta tưởng Botcake vừa
//    nói rồi VỨT phần chữ của chính mình — khách nhận ảnh trơ, đúng thứ nguyên
//    tắc #2 cấm, và lượt đó mất tiền vô ích.
//    Đo 11/08/2026: đây là gốc của 50% tiền token bị vứt.
export function pageSpokeSince(before, after, pageId, ignoreOwn = 0) {
  if (!Array.isArray(after) || !after.length) return false;
  const prev = Array.isArray(before) ? before : [];

  const prevIds = new Set(prev.map((m) => m?.id).filter(Boolean));
  if (prevIds.size) {
    const fresh = after.filter((m) => m?.id && !prevIds.has(m.id));
    if (fresh.length) {
      const cuaPage = fresh.filter((m) => String(m?.from?.id) === String(pageId)).length;
      return cuaPage > Math.max(0, ignoreOwn);
    }
    return false;
  }

  // Dự phòng khi API không trả `id`: so tin CUỐI (người gửi + nội dung).
  const key = (m) => `${m?.from?.id}|${(m?.original_message || m?.message || '').slice(0, 120)}`;
  const a = after[after.length - 1];
  const b = prev[prev.length - 1];
  if (!b || key(a) === key(b)) return false;
  return String(a?.from?.id) === String(pageId);
}

// Đếm số lần nhường — để biết Botcake đang lấn bao nhiêu, và AI có bị câm oan không.
const yieldCount = new Map(); // pageId -> { before: n, send: n }
function noteYield(pageId, when) {
  const y = yieldCount.get(pageId) || { before: 0, send: 0 };
  if (when === 'trước khi gửi') y.send++; else y.before++;
  yieldCount.set(pageId, y);
}
const sentCount = new Map(); // pageId -> số tin AI GỬI ĐƯỢC (mẫu số của tỉ lệ vứt)
function noteSent(pageId) { sentCount.set(pageId, (sentCount.get(pageId) || 0) + 1); }

// ─────────────────────────────────────────────────────────────────────────────
// HAI MỨC CHỜ KHÁC NHAU — theo đúng thứ tự ưu tiên: Botcake → Fast Lane → AI
//
// Đo 11/08/2026 sau khi bịt lỗ đo: 53% tiền token chảy vào những lượt AI soạn
// xong rồi bị vứt vì Botcake trả lời trước. Cứ 2 lượt AI thì 1 lượt ra rác.
//
// ① CHỜ CHUNG (BOTCAKE_GRACE_MS, 6s) — áp cho mọi lượt, đủ để Botcake kịp trả
//    từ khoá. Fast Lane hưởng luôn mốc này và trả lời ngay sau đó: nó tốn 0
//    token nên KHÔNG có lý do gì bắt nó chờ thêm, chờ là thiệt khách vô ích.
//
// ② CHỜ RIÊNG CỦA AI (AI_WAIT_MS) — chỉ áp khi Fast Lane đã bó tay và sắp gọi
//    model. Đây là tầng DUY NHẤT tốn tiền, nên là tầng duy nhất đáng bắt chờ.
//    Chờ xong soi lại hội thoại lần nữa: page đã nói thì bỏ lượt, CHƯA TIÊU
//    ĐỒNG NÀO. Cửa "vứt tin đã soạn" chỉ còn phải lo khoảng 3–8 giây model
//    thực sự đang viết.
//
// Mức chờ ② TỰ ĐIỀU CHỈNH theo page: page nào Botcake hay cướp lời thì nới
// dần, page nào Botcake im thì giữ mức nền. Trần AI_WAIT_MAX_MS.
//
// Đánh đổi: chỉ những khách phải nhờ tới AI mới chờ lâu hơn. Khách hỏi giá /
// vận chuyển / cách đặt vẫn được Fast Lane trả nhanh như cũ.
//
// LƯU Ý VẬN HÀNH: mức chờ ② nằm TRONG semaphore (giữ 1 trong CONV_CONCURRENCY
// slot suốt lúc ngủ). Ở lưu lượng hiện tại thừa sức, nhưng nếu mở lại 39 page
// và thấy nghẽn thì nâng CONV_CONCURRENCY chứ đừng hạ mức chờ.
// ─────────────────────────────────────────────────────────────────────────────
const AI_WAIT_MS = Number(process.env.AI_WAIT_MS ?? 8000);
const AI_WAIT_MAX_MS = Number(process.env.AI_WAIT_MAX_MS ?? 20000);
const AI_WAIT_TRIGGER = Number(process.env.AI_WAIT_TRIGGER ?? 0.25); // vứt >25% thì nới
const AI_WAIT_MIN_SAMPLE = 6;  // dưới mức này chưa đủ cơ sở, giữ mức nền

/** Mức chờ RIÊNG của AI cho page này (ms). Fast Lane không dùng hàm này. */
export function aiWaitFor(pageId) {
  if (AI_WAIT_MS <= 0) return 0;
  const y = (yieldCount.get(pageId) || {}).send || 0;
  const n = y + (sentCount.get(pageId) || 0);
  if (n < AI_WAIT_MIN_SAMPLE) return AI_WAIT_MS;
  const rate = y / n;
  if (rate < AI_WAIT_TRIGGER) return AI_WAIT_MS;
  return Math.min(AI_WAIT_MAX_MS, Math.round(AI_WAIT_MS * (1 + rate * 2)));
}

// ─────────────────────────────────────────────────────────────────────────────
// CHỜ TỚI KHI BOTCAKE IM HẲN — chủ trương chủ dự án 11/08/2026:
// "bao giờ bot không gửi nữa thì mới gọi chat bot AI trả lời".
//
// Bản trước NGỦ MỘT MẠCH rồi soi đúng một lần ở cuối. Hai chỗ hỏng:
//   · Botcake nói ở giây thứ 20 → lọt qua cửa, AI vẫn chạy rồi tin bị vứt.
//   · Botcake nói ở giây thứ 3  → vẫn phải ngủ hết mới biết, giữ oan 1 slot
//     semaphore và làm khách chờ vô ích.
// Đo 11/08: 50% tiền token chảy vào đúng nhóm tin bị vứt này.
//
// Nay SOI LIÊN TỤC mỗi AI_SETTLE_POLL_MS:
//   · thấy page nói  → BỎ LƯỢT NGAY, chưa tiêu đồng nào, trả slot sớm.
//   · im đủ quietMs  → Botcake coi như đã xong, giờ mới tới lượt AI.
//
// Vì thoát sớm khi Botcake nói, thời gian chờ TRUNG BÌNH còn ngắn hơn bản ngủ
// một mạch — dù ngưỡng im lặng đặt cao hơn.
// ─────────────────────────────────────────────────────────────────────────────
const AI_SETTLE_POLL_MS = Number(process.env.AI_SETTLE_POLL_MS ?? 2500);

/**
 * @returns {Promise<{spoke:boolean, waitedMs:number}>} spoke=true ⇒ page đã nói, AI phải im.
 */
export async function waitBotcakeSettled(pageId, conv, custId, baseMsgs, quietMs, deps = {}) {
  const getMsgs = deps.getMessages || pkGetMessages;
  const nap = deps.sleep || sleep;
  const now = deps.now || (() => Date.now());
  const t0 = now();
  if (quietMs <= 0) return { spoke: false, waitedMs: 0 };

  while (now() - t0 < quietMs) {
    await nap(Math.min(AI_SETTLE_POLL_MS, quietMs - (now() - t0)));
    const latest = await getMsgs(pageId, conv, custId).catch(() => null);
    if (!latest) continue;                       // lỗi mạng: coi như chưa biết, soi tiếp
    if (pageSpokeSince(baseMsgs, latest, pageId)) return { spoke: true, waitedMs: now() - t0 };
  }
  return { spoke: false, waitedMs: now() - t0 };
}

export function botcakeYieldStats() {
  return [...yieldCount.entries()].map(([page, v]) => ({
    page, ...v, total: v.before + v.send,
    sent: sentCount.get(page) || 0,
    aiWaitMs: aiWaitFor(page),
  }));
}

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
const yieldLogged = new Map(); // convId -> mark đã ghi 'other_bot' (việc 5, chống ghi lặp)
function pruneMaps() { // chống phình RAM sau nhiều tuần chạy
  if (aiTagged.size > 8000) { let n = aiTagged.size - 6000; for (const k of aiTagged) { aiTagged.delete(k); if (--n <= 0) break; } }
  for (const m of [seen, pendingMark, convFail, yieldLogged]) {
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
      // M04 · DEBOUNCE THÍCH ỨNG — chờ theo việc khách đã nói TRỌN Ý chưa.
      // Đo thật: khách KHÔNG nhắn một mạch (30,2% cụm ≥2 tin, p50 cách nhau 18s), nhưng
      // ~70% lượt chỉ nhắn đúng 1 tin. Chờ cào bằng 20s thì vừa chen ngang 45% cụm dở,
      // vừa bắt 70% người đã nói xong ngồi đợi. `snippet` = tin cuối, có sẵn trong danh
      // sách hội thoại nên phân loại không tốn thêm lời gọi API nào.
      const wait = debounceFor(c.snippet || '');
      if (Date.now() - pd.firstAt < wait.ms) continue;
      pendingMark.delete(c.id);
    }
    seen.set(c.id, mark);
    if (firstTime) continue; // page mới bật AI: chỉ ghi mốc hội thoại cũ, không trả lời

    // KHÁCH NHẮN TỚI — đếm ở ĐÂY, trước MỌI cửa lọc. Đây là mẫu số thật của tỉ
    // lệ chốt: `leads` chỉ đếm khách mà AI đã trả lời nên bỏ sót toàn bộ khách
    // do Botcake/Fast Lane lo trọn hoặc rơi vào 6 cửa im lặng — chia theo nó thì
    // tỉ lệ chốt luôn đẹp hơn sự thật.
    try { incInbound(pageId, custId); } catch { /* thống kê không chặn luồng chính */ }

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
      // ── CỬA NHƯỜNG BOTCAKE ① — chờ TRƯỚC KHI chiếm slot ────────────────────
      // Cho Botcake thêm vài giây để trả lời trước. Nếu nó có trả lời thì lúc
      // processConv đọc tin, `decideConv` sẽ thấy "tin cuối là của page" và AI im —
      // chưa tốn một token nào.
      // Ngủ ở ĐÂY chứ không phải trong processConv: nằm trong semaphore mà ngủ thì
      // 4 slot bị giữ suốt thời gian chờ, giờ cao điểm sẽ nghẽn oan.
      // ① chờ chung — Botcake kịp trả từ khoá; Fast Lane hưởng luôn mốc này.
      if (BOTCAKE_GRACE_MS > 0) await sleep(BOTCAKE_GRACE_MS);
      await _acquire();
      try { await processConv(pageId, c, psid, custId, mark); convFail.delete(c.id); }
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
async function processConv(pageId, c, psid, custId, mark = '') {
  let msgs = await pkGetMessages(pageId, c.id, custId);
  if (!msgs.length) return;

  // ── M05 · AI CÓ ĐƯỢC NÓI KHÔNG? ────────────────────────────────────────────
  // Một cửa duy nhất thay cho các cửa canh rời rạc của v1: đơn đã chốt · tin cuối
  // là của page · tin đầu nhường Botcake · người thật đã tiếp quản.
  const d = decideConv({ pageId, conv: c, msgs, custId });
  if (!d.allow) {
    // Page vừa nói trong lúc chờ (cửa nhường ① ở pollPage) — đây là ca nhường Botcake,
    // đếm riêng để biết Botcake đang lấn bao nhiêu.
    if (/tin cuối là của page/.test(d.reason || '')) {
      noteYield(pageId, 'trước khi soạn');
      // VIỆC 5 — ghi lượt của BOT KHÁC vào Sổ AI. Không ghi thì Botcake vô hình hoàn
      // toàn: "% tin xử lý 0 token" sai, quy công chốt đơn sai, A/B nhiễu. Ghi 1 lần
      // cho mỗi mốc hội thoại (không lặp mỗi vòng poll).
      if (yieldLogged.get(c.id) !== mark) {
        yieldLogged.set(c.id, mark);
        const last = msgs[msgs.length - 1];
        try {
          logAi(pageId, custId, 'other_bot', {
            name: c.from?.name || '', conv: c.id, lane: 'BOTCAKE',
            text: String(last?.original_message || last?.message || '').replace(/\s+/g, ' ').slice(0, 80),
          });
        } catch { /* sổ AI không chặn */ }
      }
      console.log(`[nhường] ${c.from?.name || psid} (page ${pageId}): page đã trả lời trước → AI nhường (chưa tốn token)`);
    } else if (d.changed) {
      console.log(`[owner] ${c.from?.name || psid} (page ${pageId}): → ${d.state} — ${d.reason}`);
    }
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

  // history = msgs (đã fetch sẵn ở trên) → AI đọc toàn bộ hội thoại trước khi soạn tin.
  // `beforeAi` = cửa chặn AI, chạy NGAY TRƯỚC lời gọi model đầu tiên (xem handler.js).
  // Thứ tự ưu tiên: Botcake → Sale → Fast Lane → AI. Ba tầng trên miễn phí, AI thì không,
  // nên phải chắc chắn không tầng nào đang nói rồi mới cho AI tiêu tiền.
  const res = await handleIncoming({
    psid, text, pageId, pkConvId: c.id, pkCustId: custId, history: msgs, custName: c.from?.name || '',
    beforeAi: async () => {
      // ② CHỜ TỚI KHI BOTCAKE IM HẲN — Fast Lane đã bó tay, từ đây mới tốn tiền.
      // Soi liên tục thay vì ngủ một mạch: Botcake nói lúc nào cũng bắt được, và
      // bắt được là bỏ lượt NGAY, chưa tiêu đồng nào lẫn không giữ oan slot.
      const r = await waitBotcakeSettled(pageId, c.id, custId, msgs, aiWaitFor(pageId));
      if (r.spoke) {
        noteYield(pageId, 'trước khi gọi AI');
        return `page đã trả lời (Botcake/sale) sau ${Math.round(r.waitedMs / 1000)}s chờ`;
      }
      // Ghi lại cả ca ĐI TIẾP: không có dòng này thì không phân biệt được
      // "Botcake im thật" với "vòng chờ không chạy" — đúng chỗ tôi đã phải đoán.
      console.log(`[chờ] ${c.from?.name || psid} (page ${pageId}): page im ${Math.round(r.waitedMs / 1000)}s → tới lượt AI`);
      return null;
    },
  });
  // KHÔNG CÓ TIN ĐỂ GỬI — nhưng có thể ĐÃ TIÊU TOKEN. Đây là nút thắt duy nhất
  // mà mọi đường "AI chạy rồi không gửi được" đều đi qua: guard chặn tin, model
  // trả rỗng, bàn giao sale, hội thoại bị lưu trữ. Trước 11/08/2026 tất cả đều
  // im lặng rời khỏi đây, nên khoản chi của chúng TÀNG HÌNH — sổ cộng ra $0,27
  // trong khi hoá đơn thật $1. Ghi lại thì vẫn không gửi tin, nhưng tiền nhìn
  // thấy được và truy được về đúng page/khách/lý do.
  const { reply, lane } = res;
  // Ảnh của lượt nằm ở hàng đợi trong state (Fast Lane lẫn AI đều xếp vào đó — xem
  // handler.js). Còn ảnh chờ thì lượt VẪN CÓ việc để làm, dù model không viết được chữ.
  const st = getState(psid);
  const imgQueued = (st.pendingImages || []).length;
  if (!reply && !imgQueued) {
    const un = getState(psid).lastUsage || {};
    if (un.calls) {
      try {
        logAi(pageId, custId, 'spent_no_send', {
          name: c.from?.name || '', conv: c.id, lane: lane || 'AI',
          why: res.blocked ? `guard:${res.blocked}` : res.handoff ? 'bàn giao sale' : res.yielded ? 'nhường Botcake' : 'AI im',
          tin: un.tin || 0, tout: un.tout || 0, cread: un.cread || 0, cwrite: un.cwrite || 0, calls: un.calls || 0,
        });
      } catch { /* sổ AI không chặn */ }
    }
    return;
  }

  // Gắn thẻ 'AI Chăm' — CHỈ khi chính AI trả lời, và chỉ khi tin THẬT SỰ sắp gửi.
  // Trước 11/08/2026 thẻ được gắn TRƯỚC handleIncoming, nên hội thoại bị dán thẻ cả khi
  // Fast Lane trả câu mẫu, khi Fast Lane im, và cả khi tin bị bỏ vì nhường Botcake —
  // sale nhìn thẻ tưởng AI đang phục vụ mà AI chưa nói câu nào. Thẻ nay mang đúng nghĩa
  // "AI đã vào cuộc", cũng là điều kiện để Botcake tự lùi nếu page có cài luật theo thẻ.
  if (config.pkTags.ai && lane === 'AI' && !aiTagged.has(c.id)) {
    aiTagged.add(c.id);
    pkTagByName(pageId, c.id, config.pkTags.ai).then((t) => { if (!t.ok) console.warn(`[tag] ${pageId}: ${t.error}`); }).catch(() => {});
  }

  // ── CỬA NHƯỜNG BOTCAKE ② — soi lần cuối NGAY TRƯỚC KHI GỬI ────────────────
  // Đây là cửa quan trọng nhất: AI soạn tin mất vài giây, Botcake hoàn toàn có thể
  // trả lời trong khoảng đó. Cửa ① không bắt được ca này.
  // Token đã tiêu rồi, nhưng thà bỏ tin còn hơn để khách nhận 2 câu chồng nhau.
  if (BOTCAKE_YIELD_BEFORE_SEND) {
    const latest = await pkGetMessages(pageId, c.id, custId).catch(() => null);
    // trừ số ảnh CHÍNH TA vừa đẩy lên giữa lượt, kẻo tự nhận nhầm mình là Botcake
    const tuGui = getState(psid).selfSent || 0;
    if (latest && pageSpokeSince(msgs, latest, pageId, tuGui)) {
      noteYield(pageId, 'trước khi gửi');
      // BỎ CẢ CỤM: ảnh chưa gửi đi tấm nào (chúng nằm trong hàng đợi, không phải trên
      // Messenger), nên nhường ở đây là khách không nhận gì thừa — khác hẳn trước
      // 21/08/2026, khi ảnh đã bay đi giữa lượt và chỉ tin chữ bị vứt.
      st.pendingImages = []; st.pendingCaption = '';
      console.log(`[nhường] ${c.from?.name || psid} (page ${pageId}): Botcake trả lời trong lúc AI soạn → BỎ tin đã soạn${imgQueued ? ` + ${imgQueued} ảnh chưa gửi` : ''}`);
      // GHI SỔ CẢ LƯỢT BỊ BỎ. Token đã trả rồi mới vứt tin đi, nên không ghi là
      // khoản chi này TÀNG HÌNH: sổ báo rẻ hơn hoá đơn thật mà không ai truy được.
      // Đo 11/08/2026: 19 lượt bị bỏ trong 2 tiếng, không lượt nào có bản ghi.
      const uy = getState(psid).lastUsage || {};
      try {
        logAi(pageId, custId, 'yielded', {
          name: c.from?.name || '', conv: c.id, lane: lane || 'AI', to: 'BOTCAKE',
          tin: uy.tin || 0, tout: uy.tout || 0, cread: uy.cread || 0, cwrite: uy.cwrite || 0, calls: uy.calls || 0,
        });
      } catch { /* sổ AI không chặn đường gửi */ }
      return;
    }
  }
  // Page vừa rơi vào backoff (do job song song khác) → thôi không gửi thêm.
  if ((sendFail.get(pageId)?.pausedUntil || 0) > Date.now()) return;
  // ẢNH TRƯỚC, CHỮ SAU (nguyên tắc #2 — ảnh không bao giờ gửi trơ):
  // caption bám tấm ĐẦU TIÊN, rồi tin chữ khép lượt. Giãn cách imgGapMs cho tự nhiên,
  // tránh Meta đánh spam #2022 (đã có tiền lệ page bị chặn phải backoff 30 phút).
  if (imgQueued) {
    await flushPendingImages(st); // lỗi ảnh KHÔNG chặn tin chữ — hàm tự thử lại rồi báo log
    await sleep(config.imgGapMs);
  }
  // Model gửi ảnh nhưng không viết nổi chữ: caption đã đi kèm ảnh nên khách vẫn có lời,
  // không phải ảnh trơ. Kết lượt tại đây thay vì gửi tin rỗng.
  if (!reply) return;
  const r = await pkSendReply(pageId, c.id, custId, reply);
  noteSendResult(pageId, r.ok, r.error); // backoff: 2 lần lỗi liên tiếp → ngừng page 30 phút
  if (r.ok) {
    noteSent(pageId); // mẫu số của tỉ lệ vứt — quyết định page này có phải chờ lâu hơn không
    try { incReply(pageId); incLead(pageId, custId); } catch { /* thống kê không chặn gửi tin */ }
    try { addAiConv(pageId, c.id); } catch { /* ghi hội thoại AI để khớp đơn */ }
    // Ghi kèm TOKEN THẬT của lượt (đo trong closer.js) — nguồn số liệu chi phí theo page.
    const u = getState(psid).lastUsage || {};
    // `lane` = tin do đâu soạn ('AI' hay 'tpl_price'/'tpl_greet'… của Fast Lane).
    // Đây là điều kiện cần để đo "tỷ lệ tin xử lý 0 token" và tách chi phí theo tầng.
    try { logAi(pageId, custId, 'reply', { name: c.from?.name || '', text: reply.slice(0, 80), conv: c.id, lane: lane || 'AI', state: d.state, tin: u.tin || 0, tout: u.tout || 0, cread: u.cread || 0, cwrite: u.cwrite || 0, calls: u.calls || 0 }); } catch { /* sổ AI không chặn */ }
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
