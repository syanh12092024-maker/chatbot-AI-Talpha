import { createOrder, pkSendImage, pkAddNote, pkTagByName } from './pancake.js';
import { sendImage } from './messenger.js';
import { productImages, productTiers } from './kb.js';
import { incOrder } from './stats.js';
import { logAi } from './ai-log.js';
import { createPancakeOrder, ordersEnabled, conversationHasOrder, markConversationOrdered } from './pancake-orders.js';
import { config } from './config.js';
import { markClosing } from './conv-owner.js';
import { recordClosedOrder } from './order-bridge.js'; // M14 · ghi chú chuẩn + hàng chờ tạo đơn

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
  // `score_lead` đã BỎ (11/08/2026 — M08 §3). Nó bắt model tốn một vòng tool chỉ để chạy
  // một heuristic regex, và điểm trả ra (`state.leadScore`) KHÔNG nơi nào đọc. Chấm điểm lead
  // nay làm bằng luật ở classifier (`lead_quality`) + M11 của Luồng 2 — 0 token, không gãy.
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
    description: 'Gửi ẢNH sản phẩm của page cho khách xem. Ảnh được gửi CÙNG LƯỢT với tin chữ của bạn (ảnh trước, chữ ngay sau) — nên gọi tool xong BẮT BUỘC phải viết chữ, không viết thì ảnh cũng không tới khách. Page chỉ bán 1 SP nên KHÔNG cần mã. Mỗi SP có nhiều loại ảnh (Ảnh sản phẩm, Feedback, Chứng nhận, Thành phần, Công dụng...). GỌI NHIỀU LẦN trong hội thoại — mỗi lần tool tự chọn ảnh MỚI chưa gửi cho khách này, nên không sợ trùng. Để trống category = ưu tiên ảnh sản phẩm; truyền category để gửi đúng loại khách cần (vd "feedback" khi khách do dự, "chứng nhận"/"thành phần" khi khách nghi ngờ chất lượng).',
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
      // Ảnh nay chỉ đi ra ở `flushPendingImages`, tức SAU cửa nhường Botcake — nhưng
      // vẫn đếm tin của chính mình, vì cửa nhường ② soi lại hội thoại một lần nữa ở
      // lượt sau và không trừ ra thì nó tưởng Botcake vừa nói.
      if (r.ok) { state.selfSent = (state.selfSent || 0) + 1; return { ok: true }; }
      lastErr = r.error;
    } else {
      const ok = await sendImage(state.psid, url, state.pageId);
      if (ok) { state.selfSent = (state.selfSent || 0) + 1; return { ok: true }; }
      lastErr = 'Messenger từ chối gửi ảnh';
    }
  }
  return { ok: false, error: lastErr };
}

// ── XẢ HÀNG ĐỢI ẢNH — gọi NGAY TRƯỚC khi gửi tin chữ ────────────────────────
// Tool `send_product_image` chỉ XẾP HÀNG, không gửi (xem lý do ở tool). Ảnh thật sự
// bay đi tại đây, nên nó luôn nằm CÙNG PHÍA cửa nhường Botcake với tin chữ: nhường
// thì cả cụm cùng bị bỏ, gửi thì khách nhận ảnh + chữ liền nhau. Trước 21/08/2026
// ảnh đi ngay trong lúc model còn viết, nên 137/242 lượt nhường để lại "ảnh trơ" —
// khách hỏi giá, nhận về mấy tấm ảnh và một câu caption, không có câu trả lời.
export async function flushPendingImages(state) {
  const queue = state.pendingImages || [];
  if (!queue.length) return { sent: 0, total: 0 };
  state.pendingImages = [];
  const viaPancake = state.pkConvId && state.pkCustId;
  const seen = state.sentImages || (state.sentImages = new Set());
  // Lời dẫn bám theo tấm ĐẦU TIÊN GỬI THÀNH CÔNG, không phải tấm đầu danh sách:
  // Pancake trả lỗi chập chờn khá thường (vd 1/2 ảnh) — nếu tấm mang caption hỏng
  // thì caption mất theo, khách lại nhận ảnh trơ đúng như trước khi sửa.
  let pendingCaption = String(state.pendingCaption || '').trim();
  state.pendingCaption = '';
  let sent = 0, lastErr = '';
  for (const [i, im] of queue.entries()) {
    if (i) await sleep(config.imgGapMs); // giãn cách giữa các ảnh cho tự nhiên
    const r = await sendImageWithRetry(state, viaPancake, im.url, pendingCaption);
    if (r.ok) { sent++; seen.add(im.url); pendingCaption = ''; } else lastErr = r.error;
  }
  const cats = [...new Set(queue.map((im) => im.cat || 'sản phẩm'))].join(', ');
  console.log(`[img] page ${state.pageId} ${viaPancake ? 'Pancake' : 'Messenger'} gửi ${sent}/${queue.length} ảnh (${cats})${sent ? ' ✓' : ' ✗ ' + lastErr}`);
  if (sent) {
    try { logAi(state.pageId, state.pkCustId, 'image', { cat: cats, n: sent }); } catch { /* sổ AI không chặn */ }
  }
  return { sent, total: queue.length, error: lastErr };
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
          // M14 · Order Bridge: ghi chú Pancake theo MẪU CHUẨN máy đọc được + đưa vào hàng chờ
          // "chờ tạo đơn" để sale bấm 1 nút trên dashboard. Thay cho ghi chú tự do trước đây —
          // ghi chú tự do buộc sale đọc rồi gõ lại từng trường sang form Pancake.
          try { await recordClosedOrder(state.pageId, state.pkCustId, input, state.pkConvId, { kb, created: config.autoCreateOrder }); } catch (e) { console.warn('[order-bridge] ghi nhận đơn lỗi:', e.message); }
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
        // XẾP HÀNG, KHÔNG GỬI NGAY (21/08/2026). Trước đây ảnh bay đi ngay tại đây —
        // giữa lúc model còn đang viết, tức là TRƯỚC cửa nhường Botcake ở pancake-poll.
        // Cửa nhường chỉ vứt được tin chữ, không thu hồi được ảnh đã gửi, nên 137/242
        // lượt nhường để lại khách với "ảnh trơ": hỏi giá, nhận về ảnh + caption, không
        // có câu trả lời. Nay ảnh nằm chung một phía cửa với tin chữ (xem flushPendingImages).
        const q = state.pendingImages || (state.pendingImages = []);
        // Trần ảnh tính cho CẢ LƯỢT, không phải cho mỗi lần gọi tool: model gọi tool hai
        // lần trong một lượt thì tổng vẫn không vượt trần — đúng nghĩa "tối đa 1 lượt".
        const room = imageLimit(state.pageId) - q.length;
        const already = new Set(q.map((im) => im.url));
        const toSend = room > 0 ? queue.filter((im) => !already.has(im.url)).slice(0, room) : [];
        // LỜI DẪN KÈM ẢNH: khách KHÔNG được nhận ảnh trơ. Đo trên Sổ AI: 2/3 số lần gửi ảnh
        // trước đây là ảnh trần hoặc chỉ kèm "..." — AI gọi tool xong coi như hết việc, không nói gì.
        const caption = String(input.caption || '').trim();
        if (!toSend.length) {
          return { content: `Lượt này đã đủ ${q.length} ảnh chờ gửi rồi — đừng gọi thêm. HÃY VIẾT TIN CHỮ cho khách ngay.`, isError: true };
        }
        const catLabel = input.category || 'sản phẩm';
        for (const im of toSend) q.push({ url: im.url, cat: catLabel });
        // caption của lần gọi ĐẦU TIÊN trong lượt được giữ — ảnh gửi liền nhau nên một
        // lời dẫn là đủ, nhắc lại dưới mỗi tấm trông như spam.
        if (!state.pendingCaption) state.pendingCaption = caption;
        state.sentImageTurn = true; // closer dùng để BẮT BUỘC có tin chữ khép lượt
        const left = queue.length - toSend.length;
        return { content: `Đã chuẩn bị ${toSend.length} ảnh (${catLabel}) — ảnh sẽ gửi cho khách NGAY TRƯỚC tin chữ của bạn, trong cùng một lượt.${caption ? '' : ' ⚠️ Lần này BẠN QUÊN caption — lần sau phải truyền caption.'} BÂY GIỜ HÃY VIẾT TIN CHỮ cho khách (tư vấn tiếp / hỏi chốt đơn) — bạn KHÔNG viết chữ thì ảnh cũng KHÔNG được gửi.${left > 0 ? ` Còn ${left} ảnh khác chưa dùng — có thể gửi ở lượt sau.` : ''}` };
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
