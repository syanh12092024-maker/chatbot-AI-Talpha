// M05 · CONVERSATION OWNER — một hội thoại, MỘT chủ, tại một thời điểm.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M05
//
// VÌ SAO ĐÂY LÀ MODULE QUAN TRỌNG NHẤT CỦA v2 — đo 10/08/2026 trên 60 hội thoại thật:
//   · 75% hội thoại có AI thì có CẢ template Botcake đâm ngang
//   · ca thật (khách Cristita Andales): AI vừa chốt ngọt "So ready na ba sa address mo?"
//     thì Botcake dội nguyên checklist "✔️Your full name ✔️Contact number ✔️Complete
//     Address…" — đúng thứ HARD_RULES cấm — ngay sau khi khách nói chưa cần. Mất đơn.
//   · ca thật (khách Gene Santiago): 6 tin page liên tiếp = template + chào Botcake +
//     "<div></div>" + "..." + "<div></div>". Khách nhận toàn rác.
//
// Mọi tối ưu prompt, mọi đồng token tiết kiệm đều vô nghĩa khi bot khác đè lên câu chốt.

import { S, OWNER, getConv, setConvState, touchConv } from './conv-state.js';
import { isAutomationTemplate } from './bot-registry.js';
import { recentAiTexts } from './ai-log.js';
import { isOurFixedMessage } from './our-messages.js';
import { OPPORTUNITY_MAX_TURNS } from './post-sale.js';

export { S, OWNER };

// Thẻ hệ thống Pancake = -(mã trạng thái đơn). Có thẻ này nghĩa là ĐƠN ĐÃ CHỐT.
//  -1 submitted · -2 shipped · -3 delivered · -11 waitting · -12 wait_print · -20 ordered
export const ORDER_STOP_TAGS = new Set([-1, -2, -3, -11, -12, -20]);

// Công tắc: tắt bằng HUMAN_TAKEOVER=0 nếu nhận diện người thật gây im oan.
const HUMAN_TAKEOVER = process.env.HUMAN_TAKEOVER !== '0';
// Nhường người thật bao lâu rồi AI nhận lại. 0 = vĩnh viễn.
const HUMAN_TAKEOVER_TTL_MS = Number(process.env.HUMAN_TAKEOVER_TTL_H ?? 24) * 3600e3;

// Người thật gõ tay thì NGẮN và đời thường ("ok dear", "thanks madam", "pls wait",
// "yess dear" — tin thật lấy từ Pancake). Template thì dài, nhiều dòng, nhiều emoji.
// Ngưỡng cố ý THẬN TRỌNG: nghi ngờ thì coi là MÁY, để AI chạy tiếp (giữ nguyên hành vi
// cũ) thay vì im oan cho một hội thoại.
//
// ⚠️ Hạ 120 → 80 sau khi đo thật 11/08/2026: sổ nhận diện chỉ phủ 17,4% tin page, nên
// "vùng đoán" là 82,6%. Mô phỏng production cho thấy 58% hội thoại bị khoá — quá cao.
// Nhiều ca là template marketing dài 80–120 ký tự lọt qua ngưỡng cũ.
const HUMAN_MAX_LEN = 80;

// Dấu hiệu MARKETING — người thật trực chat không viết kiểu này.
const MARKETING = /(free shipping|cash on delivery|\bcod\b|\d+\s*%\s*off|promo|discount|giveaway|sale ends|limited|order now|combo|🚚|⚡|💸|🎉|💎)/i;

// Đếm emoji thô — tin ≥3 emoji gần như chắc chắn là template.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();

/** Tin page này có phải do CHÍNH BOT MÌNH gửi không? (Sổ AI lưu 80 ký tự đầu) */
function isOurs(text, aiTexts) {
  const t = norm(text);
  if (!t) return false;
  for (const a of aiTexts) {
    const n = norm(a);
    if (!n || n.length < 8) continue;
    if (t.startsWith(n.slice(0, Math.min(n.length, 60)))) return true;
    if (n.startsWith(t.slice(0, 60))) return true;
  }
  return false;
}

/** Tin page này trông như NGƯỜI THẬT gõ tay không? */
export function looksHuman(text, aiTexts) {
  const raw = String(text || '').trim();
  if (!raw) return false;                                  // tin rỗng / chỉ đính kèm
  if (/^<div><\/div>$/.test(raw) || /^\.{2,}$/.test(raw)) return false;
  if (isOurFixedMessage(raw)) return false;                // chuỗi CỐ ĐỊNH của code mình
  if (isAutomationTemplate(raw)) return false;             // template đã biết
  if (isOurs(raw, aiTexts)) return false;                  // chính bot mình (tra Sổ AI)
  if (raw.length > HUMAN_MAX_LEN) return false;            // dài = nhiều khả năng template lạ
  if (/https?:\/\/|wa\.me|wa\.link/i.test(raw)) return false; // dán link = kịch bản kéo WhatsApp
  if (raw.split('\n').filter((l) => l.trim()).length > 2) return false; // nhiều dòng = template
  if (!/\p{L}/u.test(raw)) return false;                   // chỉ emoji/số — không đủ chắc
  if (MARKETING.test(raw)) return false;                   // giọng quảng cáo = template
  if ((raw.match(EMOJI) || []).length >= 3) return false;  // nhiều emoji = template
  return true;
}


// VIỆC 3 — tin đầu này CHỈ là lời chào (nhường Botcake), hay là câu hỏi thật (mình trả)?
// Lệch một chiều có chủ ý: không chắc thì coi là CÂU HỎI THẬT và tự trả lời. Nhường nhầm
// một câu hỏi = khách phải hỏi lại 2 lần; trả nhầm một lời chào = chỉ trùng với Botcake,
// mà cửa nhường ② vẫn bắt được.
const JUST_GREETING = /^(hi+|hello+|helo+|hey+|hai|kumusta|kamusta|musta|salam|assalamualaikum|good (?:morning|afternoon|evening|day)|start|get started|مرحبا|السلام عليكم|اهلا|بدء)([\s,.!?]*(po|poh|ho|sir|maam|ma'?am|there))*[\s,.!?]*$/i;
export function isJustGreeting(text) {
  const t = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return true;                        // sticker/ảnh trơ — cứ để Botcake chào
  return JUST_GREETING.test(t);
}

/**
 * Quyết định AI có được nói trong hội thoại này không.
 *
 * @param {object} a
 *   @param {string} a.pageId
 *   @param {object} a.conv        đối tượng hội thoại từ Pancake (cần .id, .tags, .from)
 *   @param {Array}  a.msgs        toàn bộ tin của hội thoại (cũ → mới)
 *   @param {string} a.custId
 *   @param {string[]} [a.aiTexts]  Tin AI đã gửi (mặc định tra Sổ AI) — cho phép tiêm để test
 * @returns {{allow:boolean, state:string, owner:string, reason:string, changed:boolean}}
 */
export function decideConv({ pageId, conv, msgs, custId, aiTexts }) {
  const convId = conv?.id;
  const c = getConv(convId);
  const deny = (state, owner, reason) => {
    const r = setConvState(convId, state, owner, reason);
    return { allow: false, state, owner, reason, changed: r.changed };
  };

  // ── ① ĐƠN ĐÃ CHỐT (thẻ trạng thái Pancake) → POST_SALE, AI + Botcake đều khoá ──
  const stopTag = (conv?.tags || []).find((t) => ORDER_STOP_TAGS.has(Number(t)));
  if (stopTag !== undefined) {
    return deny(S.POST_SALE, OWNER.RTO, `đơn đang xử lý (thẻ ${stopTag})`);
  }

  // ── ② Trạng thái ĐÃ CHỐT CỨNG từ trước → giữ nguyên, không xét lại ────────────
  if (c.state === S.HANDOFF) {
    // Bàn giao vì NGƯỜI THẬT vào chat thì HẾT HẠN sau HUMAN_TAKEOVER_TTL_MS.
    // Vì sao không khoá vĩnh viễn: nhận diện người thật là suy đoán (sổ template mới
    // phủ 17,4% tin page), đoán sai một lần mà khoá mãi mãi thì AI chết oan cả hội thoại.
    // Sale nhắn 3 ngày trước rồi bỏ đó cũng không phải lý do để AI im mãi.
    // Các lý do bàn giao KHÁC (khiếu nại, chốt đơn, hết ngân sách) vẫn khoá vĩnh viễn.
    const expired = c.humanAt && HUMAN_TAKEOVER_TTL_MS > 0 && (Date.now() - c.humanAt) > HUMAN_TAKEOVER_TTL_MS;
    if (!expired) return { allow: false, state: c.state, owner: c.owner, reason: c.lastReason || 'đã bàn giao người thật', changed: false };
    console.log(`[owner] ${conv?.from?.name || convId}: hết hạn nhường người thật (${Math.round(HUMAN_TAKEOVER_TTL_MS / 3600e3)}h) → AI nhận lại`);
    setConvState(convId, S.SELLING, OWNER.AI, 'hết hạn nhường người thật', { humanAt: 0 });
  }
  // POST_SALE = AI im — TRỪ đúng một cửa: nhánh CƠ HỘI của M13 (khách đã nhận hàng và
  // hài lòng). Cửa này có ngân sách RIÊNG tối đa 2 lượt, chỉ mở khi chính M13 đã đặt
  // owner = AI. Đơn có thẻ Pancake vẫn bị chặn ở bước ① phía trên nên RTO không bị chen.
  //
  // Gộp 11/08/2026: HANDOFF có TTL (nhánh nền) và POST_SALE có nhánh cơ hội (L2) là hai
  // việc khác nhau trên cùng một khối ②, không loại trừ nhau — giữ cả hai. TTL chỉ áp cho
  // HANDOFF; hậu bán vẫn khoá theo ngân sách lượt riêng, không dính TTL.
  let oppBranch = false;
  if (c.state === S.POST_SALE) {
    oppBranch = c.owner === OWNER.AI && (c.oppTurns || 0) < OPPORTUNITY_MAX_TURNS;
    if (!oppBranch) return { allow: false, state: c.state, owner: c.owner, reason: c.lastReason || 'hậu bán', changed: false };
  }

  const list = Array.isArray(msgs) ? msgs : [];
  const isPage = (m) => String(m?.from?.id) === String(pageId);
  const textOf = (m) => (m?.original_message || m?.message || '').trim();

  // ── ③ Chưa tới lượt AI: tin cuối là của page ─────────────────────────────────
  const last = list[list.length - 1];
  if (!last) return deny(c.state, c.owner, 'hội thoại rỗng');
  if (isPage(last)) return { allow: false, state: c.state, owner: c.owner, reason: 'tin cuối là của page — chưa tới lượt AI', changed: false };

  // ── ④ NGƯỜI THẬT ĐÃ VÀO CHAT → nhường vĩnh viễn ──────────────────────────────
  // Chỉ soi các tin page SAU tin AI cuối của mình. v1 dùng assignee_ids nhưng phải tắt
  // vì Pancake TỰ ĐỘNG gán hội thoại cho nhân viên → bật lên là AI im gần hết.
  // Ở đây nhận diện bằng HÀNH VI: tin không phải template, không phải của mình, ngắn
  // và đời thường thì đúng là người gõ.
  if (HUMAN_TAKEOVER) {
    // Hai nguồn để biết "tin nào là của mình", cố ý dư thừa: Sổ AI (bền, 80 ký tự đầu)
    // + lastAiText trong conv-state (200 ký tự, luôn có kể cả khi Sổ AI tra hụt).
    // Tra hụt ở đây là AI TỰ KHOÁ CHÍNH MÌNH — hỏng nặng, nên thà dư còn hơn thiếu.
    const ours = aiTexts || [c.lastAiText, ...recentAiTexts(pageId, custId, 12)].filter(Boolean);
    // duyệt ngược tới tin khách gần nhất — chỉ quan tâm khúc đuôi
    const tail = [];
    for (let i = list.length - 1; i >= 0 && tail.length < 12; i--) {
      if (!isPage(list[i])) { if (tail.length) break; else continue; }
      tail.push(list[i]);
    }
    for (const m of tail) {
      const tx = textOf(m);
      if (looksHuman(tx, ours)) {
        console.log(`[owner] 👤 người thật đã vào chat (${conv?.from?.name || convId}): "${tx.slice(0, 50)}" → AI nhường`);
        const r = setConvState(convId, S.HANDOFF, OWNER.SALE, `nhân viên đã tiếp quản: "${tx.slice(0, 60)}"`, { humanAt: Date.now() });
        return { allow: false, state: S.HANDOFF, owner: OWNER.SALE, reason: r.conv.lastReason, changed: r.changed };
      }
    }
  }

  // ── ⑤ NHƯỜNG BOTCAKE TIN ĐẦU — nhưng CHỈ KHI khách mới chỉ CHÀO ─────────────
  //
  // VIỆC 3. v1 nhường theo VỊ TRÍ (`custMsgCount <= 1`), bất kể khách nói gì. Nhưng
  // "how much" là tin phổ biến thứ 3 (237/10.900) và thường là tin ĐẦU TIÊN. Nhường
  // mù quáng nghĩa là: khách hỏi giá → Botcake chào → khách phải hỏi lại lần nữa.
  // Giờ chia theo NỘI DUNG: chỉ nhường khi tin đầu thực sự chỉ là lời chào.
  const custMsgs = list.filter((m) => !isPage(m) && textOf(m));
  if (custMsgs.length <= 1) {
    const first = textOf(custMsgs[0] || {});
    if (isJustGreeting(first)) {
      return deny(S.GREET, OWNER.BOTCAKE, 'tin đầu chỉ là lời chào — nhường Botcake');
    }
    // Tin đầu là CÂU HỎI THẬT → không nhường; Fast Lane trả tin đầu đủ ảnh+giá.
    const rq = setConvState(convId, S.QUALIFY, OWNER.AI, 'tin đầu là câu hỏi thật — không nhường Botcake');
    return { allow: true, state: S.QUALIFY, owner: OWNER.AI, reason: 'tin đầu là câu hỏi thật', changed: rq.changed };
  }

  // ── ⑥ AI ĐƯỢC NÓI ────────────────────────────────────────────────────────────
  // QUALIFY: mới vào, Fast Lane lo phần lớn. SELLING: AI đã nhập cuộc.
  // Nhánh cơ hội hậu bán GIỮ NGUYÊN POST_SALE — không được rơi ngược về SELLING,
  // nếu không lượt sau AI lại tưởng đây là khách mới và chào bán từ đầu.
  const next = oppBranch ? S.POST_SALE : ((c.aiTurns || 0) > 0 ? S.SELLING : S.QUALIFY);
  const why = oppBranch ? 'hậu bán — nhánh cơ hội' : 'AI đang phục vụ';
  const r = setConvState(convId, next, OWNER.AI, why);
  return { allow: true, state: next, owner: OWNER.AI, reason: why, changed: r.changed };
}

/** Gọi sau khi AI/Fast Lane gửi tin thành công. */
export function noteAiSpoke(convId, text) {
  const c = getConv(convId);
  touchConv(convId, { aiTurns: (c.aiTurns || 0) + 1, lastAiAt: Date.now(), lastAiText: String(text || '').slice(0, 200) });
}

/** Gọi khi AI chốt đơn / bàn giao — khoá hội thoại lại. */
export function markClosing(convId, reason) { setConvState(convId, S.CLOSING, OWNER.SALE, reason || 'AI đã chốt đơn', { orderAt: Date.now() }); }
export function markHandoff(convId, reason) { setConvState(convId, S.HANDOFF, OWNER.SALE, reason || 'bàn giao sale'); }
export function markPostSale(convId, reason) { setConvState(convId, S.POST_SALE, OWNER.SALE, reason || 'hậu bán'); }

export const ownerConfig = { humanTakeover: HUMAN_TAKEOVER };
