import { createOrder, pkSendImage, pkAddNote, pkTagByName } from './pancake.js';
import { sendImage } from './messenger.js';
import { productImages, productTiers } from './kb.js';
import { incOrder } from './stats.js';
import { logAi } from './ai-log.js';
import { createPancakeOrder, ordersEnabled, conversationHasOrder, markConversationOrdered } from './pancake-orders.js';
import { config } from './config.js';
import { markClosing } from './conv-owner.js';

// Định nghĩa tool (function calling) cho closer.
export const toolDefs = [
  {
    name: 'get_price',
    description: 'Lấy giá lẻ và giá combo sản phẩm của page từ Knowledge Base. Page chỉ bán 1 SP nên KHÔNG cần mã — cứ gọi tool, tool tự lấy đúng sản phẩm. TUYỆT ĐỐI không hỏi khách mã/loại sản phẩm.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string', description: 'Bỏ trống — page chỉ có 1 SP, tool tự lấy.' } },
      required: [],
    },
  },
  {
    name: 'score_lead',
    description: 'Chấm điểm chất lượng lead (0-10) trước khi đẩy telesale. Truyền các tín hiệu quan sát được.',
    input_schema: {
      type: 'object',
      properties: { signals: { type: 'string', description: 'Mô tả tín hiệu: nhu cầu rõ?, địa chỉ cụ thể?, do dự?...' } },
      required: ['signals'],
    },
  },
  {
    name: 'create_draft_order',
    description: 'Tạo đơn nháp trong Pancake. CHỈ gọi sau khi khách xác nhận COD và đã có địa chỉ cụ thể.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string', description: 'Địa chỉ chi tiết' },
        city: { type: 'string' },
        product_id: { type: 'string', description: 'Bỏ trống — page chỉ có 1 SP, tool tự điền.' },
        variant: { type: 'string', description: 'Gói/combo khách chọn (vd "combo 2"), nếu có.' },
        qty: { type: 'integer' },
        total_price: { type: 'number', description: 'TỔNG tiền COD khách phải trả theo đúng gói đã chốt (số, nội tệ — vd 99 nghĩa là 99 SAR/AED). LẤY TỪ bảng giá KB, KHÔNG tự bịa.' },
        cod_confirmed: { type: 'boolean', description: 'Khách đã xác nhận thanh toán khi nhận hàng' },
      },
      required: ['name', 'phone', 'address', 'city', 'qty', 'total_price', 'cod_confirmed'],
    },
  },
  {
    name: 'send_product_image',
    description: 'Gửi ẢNH sản phẩm của page cho khách xem. Page chỉ bán 1 SP nên KHÔNG cần mã. Mỗi SP có nhiều loại ảnh (Ảnh sản phẩm, Feedback, Chứng nhận, Thành phần, Công dụng...). GỌI NHIỀU LẦN trong hội thoại — mỗi lần tool tự chọn ảnh MỚI chưa gửi cho khách này, nên không sợ trùng. Để trống category = ưu tiên ảnh sản phẩm; truyền category để gửi đúng loại khách cần (vd "feedback" khi khách do dự, "chứng nhận"/"thành phần" khi khách nghi ngờ chất lượng).',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Bỏ trống — page chỉ có 1 SP, tool tự lấy.' },
        category: { type: 'string', description: 'Loại ảnh muốn gửi (khớp theo nhãn): vd "feedback", "thành phần", "công dụng". Bỏ trống = ảnh sản phẩm chính.' },
        caption: { type: 'string', description: 'BẮT BUỘC — lời dẫn NGẮN (1 câu) gửi KÈM ảnh, viết bằng ĐÚNG ngôn ngữ khách. VD: "Here po ang actual photos ng product 😊" / "هذه صور المنتج الحقيقية". TUYỆT ĐỐI không gửi ảnh trơ không lời nào.' },
      },
      required: ['caption'],
    },
  },
  {
    name: 'handoff_human',
    description: 'Chuyển hội thoại cho nhân viên thật.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
];

// Mỗi page chỉ bán 1 SP. Nếu không truyền id (hoặc id không khớp) → tự lấy SP của page.
// Nhờ vậy AI KHÔNG BAO GIỜ phải hỏi khách "chọn mã sản phẩm".
function findProduct(kb, id) {
  const list = kb.products || [];
  if (id) {
    const hit = list.find((p) => String(p.id).toLowerCase() === String(id).toLowerCase());
    if (hit) return hit;
  }
  return list[0]; // page 1 sản phẩm → luôn là sản phẩm này
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Số ảnh tối đa 1 lượt cho page này. Có IMG_PILOT_PAGES → chỉ page trong danh sách được gửi nhiều,
// page còn lại giữ mức an toàn cũ (giảm rủi ro Meta đánh spam #2022 khi mới bật).
function imageLimit(pageId) {
  const pilot = config.imgPilotPages;
  if (!pilot.length) return config.imgMaxPerTurn;
  return pilot.includes(String(pageId)) ? config.imgMaxPerTurn : config.imgSafeMaxPerTurn;
}

// Gửi 1 ảnh + thử lại khi lỗi. Pancake hay trả "invalid_upload_fb_attachments_result" chập chờn
// (cùng 1 URL lúc được lúc không) — thử lại 1 lần cứu được phần lớn ca này.
// caption chỉ gắn vào ảnh ĐẦU TIÊN của lượt — lặp lại cùng một câu dưới mỗi tấm trông như spam.
async function sendImageWithRetry(state, viaPancake, url, caption = '') {
  let lastErr = '';
  for (let attempt = 0; attempt <= config.imgRetry; attempt++) {
    if (attempt) await sleep(1200);
    if (viaPancake) {
      const r = await pkSendImage(state.pageId, state.pkConvId, state.pkCustId, url, caption);
      if (r.ok) return { ok: true };
      lastErr = r.error;
    } else {
      const ok = await sendImage(state.psid, url, state.pageId);
      if (ok) return { ok: true };
      lastErr = 'Messenger từ chối gửi ảnh';
    }
  }
  return { ok: false, error: lastErr };
}

// Thực thi tool. Trả về { content: string, isError?: bool }.
export async function executeTool(name, input, ctx) {
  const { kb, state } = ctx;
  try {
    switch (name) {
      case 'get_price': {
        const p = findProduct(kb, input.product_id);
        if (!p) return { content: 'Page này chưa có sản phẩm trong KB. Hãy tư vấn chung, đừng hỏi khách chọn mã.', isError: true };
        return {
          content: JSON.stringify({
            product_id: p.id, name: p.name, currency: p.currency,
            // Bảng gói giá: mỗi mục {qty, price} = mua bao nhiêu cái, giá bao nhiêu.
            price_tiers: productTiers(p),
          }),
        };
      }
      case 'score_lead': {
        // Heuristic đơn giản — thay bằng model/logic riêng nếu cần.
        const s = (input.signals || '').toLowerCase();
        let score = 5;
        if (/(địa chỉ|عنوان|address)/.test(s)) score += 2;
        if (/(xác nhận|chốt|أكيد|نعم|yes|confirm)/.test(s)) score += 2;
        if (/(do dự|hỏi cho vui|chưa chắc|maybe|later)/.test(s)) score -= 3;
        score = Math.max(0, Math.min(10, score));
        state.leadScore = score;
        return { content: JSON.stringify({ lead_score: score }) };
      }
      case 'create_draft_order': {
        if (!input.cod_confirmed) {
          return { content: 'Từ chối tạo đơn: khách chưa xác nhận COD. Hãy hỏi lại cam kết thanh toán khi nhận.', isError: true };
        }
        if (!input.address || input.address.trim().length < 6) {
          return { content: 'Từ chối tạo đơn: địa chỉ chưa đủ cụ thể. Hãy hỏi địa chỉ chi tiết hơn.', isError: true };
        }
        // Số điện thoại phải hợp lệ (tránh tạo đơn rác).
        if (!input.phone || String(input.phone).replace(/\D/g, '').length < 7) {
          return { content: 'Từ chối tạo đơn: số điện thoại chưa hợp lệ. Hãy xin lại SĐT liên hệ.', isError: true };
        }
        // CHỐNG ĐƠN TRÙNG: hội thoại này đã có đơn (do AI/nhân viên/FB Commerce tạo) → KHÔNG tạo nữa.
        if (ordersEnabled() && await conversationHasOrder(state.pageId, state.pkConvId)) {
          state.closed = true;
          return { content: 'Khách này ĐÃ CÓ ĐƠN trong hệ thống rồi — TUYỆT ĐỐI không tạo đơn mới, không chốt lại. Chỉ trả lời câu hỏi của khách về đơn đã đặt (thời gian giao, COD...) và báo nhân viên sẽ liên hệ.', isError: true };
        }
        // Page 1 SP: tự điền sản phẩm nếu AI không truyền mã (không bắt khách chọn).
        const prod = findProduct(kb, input.product_id);
        if (prod) { input.product_id = prod.id; input.product_name = prod.name; input.currency = prod.currency || ''; }
        // TẠO ĐƠN THẬT trong Pancake — chỉ khi BẬT công tắc (config.autoCreateOrder).
        // ĐANG TẮT theo yêu cầu: AI vẫn chốt & ghi nhận, nhân viên tạo đơn thủ công.
        let dedup = false;
        if (config.autoCreateOrder && ordersEnabled()) {
          const r = await createPancakeOrder(state.pageId, input, state.pkConvId);
          if (!r.ok) return { content: `Chưa tạo được đơn Pancake (${r.error}). TUYỆT ĐỐI chưa báo khách "đã đặt". Xin lại thông tin thiếu rồi thử lại, hoặc chuyển nhân viên.`, isError: true };
          dedup = !!r.dedup;
        } else {
          await createOrder(input, ctx); // chỉ ghi nhận nội bộ, KHÔNG tạo đơn Pancake
        }
        state.closed = true;
        // Cờ cho M09 (outbound-guard): lượt NÀY đã chốt đơn thành công → được phép
        // tóm tắt đơn (đọc lại SĐT/địa chỉ đúng 1 lần) và được nhắc tới đơn hàng.
        state.orderCreatedThisTurn = true;
        // M05: chuyển hội thoại sang CLOSING — sale tiếp quản, AI + Botcake khoá.
        try { if (state.pkConvId) markClosing(state.pkConvId, `AI chốt đơn: ${input.name || '?'} · ${input.qty || 1} sp`); } catch { /* không chặn chốt đơn */ }
        try { markConversationOrdered(state.pkConvId); } catch { /* nhớ ngay để không tạo lần 2 */ }
        // Gắn thẻ "Mua hàng" trên Pancake để sale lọc nhanh đơn AI chốt.
        if (config.pkTags.order) {
          pkTagByName(state.pageId, state.pkConvId, config.pkTags.order)
            .then((t) => { if (!t.ok) console.warn(`[tag] ${state.pageId}: ${t.error} (chốt đơn)`); })
            .catch(() => {});
        }
        if (!dedup) { // hội thoại đã có đơn → không đếm lại
          try { incOrder(state.pageId, state.pkCustId); } catch { /* thống kê không chặn */ }
          try { logAi(state.pageId, state.pkCustId, 'order', { name: input.name, phone: input.phone, city: input.city, qty: input.qty, conv: state.pkConvId || '' }); } catch { /* sổ AI không chặn */ }
          // Báo SALE ngay trong Pancake: ghi chú tóm tắt đơn vào hồ sơ khách.
          const noteLines = [
            '🤖 AI ĐÃ CHỐT ĐƠN — cần sale xác nhận',
            `👤 ${input.name || '?'} · ☎ ${input.phone || '?'}`,
            `📍 ${[input.address, input.city].filter(Boolean).join(', ') || '?'}`,
            `📦 SL ${input.qty || 1}${input.variant ? ' · ' + input.variant : ''} · 💵 COD (khách đã xác nhận)`,
          ];
          try { await pkAddNote(state.pageId, state.pkCustId, noteLines.join('\n')); } catch { /* ghi chú không chặn */ }
        }
        // KHÔNG trả mã đơn cho khách. AI chỉ xác nhận đã nhận thông tin, nhân viên sẽ liên hệ.
        return { content: JSON.stringify({ ok: true, captured: true, note: 'Đã ghi nhận đủ thông tin đơn. Báo khách "đã nhận đơn, nhân viên sẽ liên hệ xác nhận & giao 2-5 ngày". TUYỆT ĐỐI KHÔNG đọc/bịa mã đơn cho khách.' }) };
      }
      case 'send_product_image': {
        const p = findProduct(kb, input.product_id);
        if (!p) return { content: 'Page này chưa có sản phẩm trong KB nên chưa có ảnh. Cứ tư vấn bằng lời.', isError: true };
        const all = productImages(p).filter((im) => /^https?:\/\//.test(im.url)); // link phải công khai, FB mới tải được
        if (!all.length) return { content: `Sản phẩm ${p.id} chưa có ảnh dùng được. Cứ tư vấn bằng lời.`, isError: true };
        const norm = (s) => String(s || '').toLowerCase();
        const cat = norm(input.category);
        const isMain = (im) => norm(im.label).includes('sản phẩm');
        let pick;
        if (cat) {
          pick = all.filter((im) => norm(im.label).includes(cat));
          if (!pick.length) {
            return { content: `Sản phẩm ${p.id} không có ảnh loại "${input.category}". Các loại có: ${[...new Set(all.map((im) => im.label || 'Ảnh SP'))].join(', ')}.`, isError: true };
          }
        } else {
          // Không nêu loại → ưu tiên ảnh SP, THIẾU thì bù bằng ảnh khác (feedback/chứng nhận...).
          // Trước đây chỉ lấy ảnh nhãn "sản phẩm" nên page nào chỉ có 1 ảnh SP là khách chỉ nhận được 1 ảnh.
          pick = [...all.filter(isMain), ...all.filter((im) => !isMain(im))];
        }
        // Không gửi lại ảnh đã gửi cho chính khách này → mỗi lượt khách được xem ảnh MỚI.
        const seen = state.sentImages || (state.sentImages = new Set());
        const fresh = pick.filter((im) => !seen.has(im.url));
        const queue = fresh.length ? fresh : pick; // hết ảnh mới → cho phép gửi lại ảnh cũ
        // Gửi cùng kênh với tin chữ: có ngữ cảnh Pancake → gửi qua Pancake; nếu không → Facebook Messenger.
        const viaPancake = state.pkConvId && state.pkCustId;
        const toSend = queue.slice(0, imageLimit(state.pageId));
        // LỜI DẪN KÈM ẢNH: khách KHÔNG được nhận ảnh trơ. Đo trên Sổ AI: 2/3 số lần gửi ảnh
        // trước đây là ảnh trần hoặc chỉ kèm "..." — AI gọi tool xong coi như hết việc, không nói gì.
        const caption = String(input.caption || '').trim();
        // Lời dẫn bám theo tấm ảnh ĐẦU TIÊN GỬI THÀNH CÔNG, không phải tấm đầu danh sách:
        // Pancake trả lỗi chập chờn khá thường (vd 1/2 ảnh) — nếu tấm mang caption hỏng thì
        // caption mất theo, khách lại nhận ảnh trơ đúng như trước khi sửa.
        let pendingCaption = caption;
        let sent = 0, lastErr = '';
        for (const [i, im] of toSend.entries()) {
          if (i) await sleep(config.imgGapMs); // giãn cách giữa các ảnh cho tự nhiên
          const r = await sendImageWithRetry(state, viaPancake, im.url, pendingCaption);
          if (r.ok) { sent++; seen.add(im.url); pendingCaption = ''; } else lastErr = r.error;
        }
        if (sent) state.sentImageTurn = true; // closer dùng để BẮT BUỘC có tin chữ khép lượt
        console.log(`[img] page ${state.pageId} ${viaPancake ? 'Pancake' : 'Messenger'} gửi ${sent}/${toSend.length} ảnh (${input.category || 'sản phẩm'})${sent ? ' ✓' : ' ✗ ' + lastErr}`);
        if (!sent) {
          // Lỗi phía FB/Pancake thường CHẬP CHỜN → cho phép AI thử lại ở lượt sau, đừng chặn vĩnh viễn.
          return { content: `Gửi ảnh lỗi tạm thời (${lastErr || 'không rõ'}). Cứ tư vấn tiếp bằng lời, lượt sau có thể thử gửi ảnh lại.`, isError: true };
        }
        try { logAi(state.pageId, state.pkCustId, 'image', { cat: input.category || 'sản phẩm', n: sent }); } catch { /* sổ AI không chặn */ }
        const left = queue.length - toSend.length;
        return { content: `Đã gửi ${sent} ảnh (${input.category || 'sản phẩm'}) cho khách qua ${viaPancake ? 'Pancake' : 'Messenger'}.${caption ? '' : ' ⚠️ Lần này BẠN QUÊN caption nên ảnh gửi đi trần trụi — lần sau phải truyền caption.'} BÂY GIỜ HÃY VIẾT TIN CHỮ cho khách (tư vấn tiếp / hỏi chốt đơn) — TUYỆT ĐỐI không kết thúc lượt mà chỉ có ảnh.${left > 0 ? ` Còn ${left} ảnh khác chưa gửi — có thể gửi thêm ở lượt sau.` : ''}` };
      }
      case 'handoff_human': {
        state.handoff = true;
        state.handoffReason = input.reason || '';
        try { logAi(state.pageId, state.pkCustId, 'handoff', { reason: input.reason || '', kind: 'ai', conv: state.pkConvId || '' }); } catch { /* sổ AI không chặn */ }
        if (config.pkTags.handoff) {
          pkTagByName(state.pageId, state.pkConvId, config.pkTags.handoff)
            .then((t) => { if (!t.ok) console.warn(`[tag] ${state.pageId}: ${t.error} (AI chuyển người)`); })
            .catch(() => {});
        }
        // Báo SALE ngay trong Pancake để biết hội thoại này cần người.
        try { await pkAddNote(state.pageId, state.pkCustId, `🙋 AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ\nLý do: ${input.reason || 'không rõ'}`); } catch { /* không chặn */ }
        return { content: 'Đã chuyển cho nhân viên. Hãy báo khách sẽ có người hỗ trợ ngay.' };
      }
      default:
        return { content: `Tool không xác định: ${name}`, isError: true };
    }
  } catch (err) {
    return { content: `Lỗi tool ${name}: ${err.message}`, isError: true };
  }
}
