import { updateCustomer } from './chat/customer-state.js';
import { pkSendImage } from './pancake.js';
import { chuanBiDon } from './orders/draft.js';
import { nhanDonLegacy, banGiaoLegacy } from './orders/legacy-capture.js';
import { sendImage } from './messenger.js';
import { productImages, productTiers } from './kb.js';
import { logAi } from './ai-log.js';
import { config } from './config.js';
import { vanGuiDangMo } from './core/van-gui.js';

// Định nghĩa tool (function calling) cho closer.
// Chữ mô tả tool viết TIẾNG ANH (BH8, 28/09): model đọc khối này MỖI lượt và nó nằm SAU
// điểm cache của Kimi (đo: điểm dùng chung dừng ở cuối system) ⇒ trả giá đầy đủ từng token.
// Tên loại ảnh ("chứng nhận", "thành phần"…) giữ nguyên — đó là nhãn tool khớp.
export const toolDefs = [
  {
    name: 'update_customer',
    description: 'Save new or corrected customer details when the profile is wrong. Copy only facts from the current customer message. Skip if the profile is already right; not needed before create_draft_order.',
    input_schema: { type: 'object', additionalProperties: false, properties: {
      name: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' },
      city: { type: 'string' }, tier: { type: 'string' }, qty: { type: 'integer', minimum: 1 },
    } },
  },
  {
    name: 'get_price',
    description: 'Get the product unit and package prices from the Knowledge Base. The page sells 1 product, so no code is needed. Never ask the customer for a product code/type.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string', description: 'Leave empty — auto-filled.' } },
      required: [],
    },
  },
  // `score_lead` đã BỎ (11/08/2026 — M08 §3). Nó bắt model tốn một vòng tool chỉ để chạy
  // một heuristic regex, và điểm trả ra (`state.leadScore`) KHÔNG nơi nào đọc. Chấm điểm lead
  // nay làm bằng luật ở classifier (`lead_quality`) + M11 của Luồng 2 — 0 token, không gãy.
  {
    name: 'create_draft_order',
    description: 'Save the order details for staff review. Success only means the details were received, not that a POS order exists. Call ONLY after the customer confirmed COD and the address is sufficient.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string', description: 'Full address' },
        city: { type: 'string' },
        product_id: { type: 'string', description: 'Leave empty — auto-filled.' },
        variant: { type: 'string', description: 'Chosen package, e.g. "combo 2".' },
        qty: { type: 'integer' },
        total_price: { type: 'number', description: 'COD total of the chosen package, local currency (99 = 99 SAR/AED). From the KB price list only.' },
        cod_confirmed: { type: 'boolean', description: 'Customer confirmed paying on delivery' },
      },
      required: ['name', 'phone', 'address', 'city', 'qty', 'cod_confirmed'],
    },
  },
  {
    name: 'send_product_image',
    description: 'Send a product PHOTO. It goes out in the SAME turn as your text (photo first) — you MUST write text after calling, or the photo is not delivered. No product code needed. Each call picks a NEW photo this customer has not seen. Empty category = main product photo; use "feedback" when the customer hesitates, "chứng nhận"/"thành phần" when they doubt quality.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Bỏ trống — page chỉ có 1 SP, tool tự lấy.' },
        category: { type: 'string', description: 'Photo type label, e.g. "feedback", "thành phần", "công dụng". Empty = main photo.' },
        caption: { type: 'string', description: 'REQUIRED — one short sentence sent with the photo, in the customer\'s language, e.g. "Here po ang actual photos ng product 😊".' },
      },
      required: ['caption'],
    },
  },
  {
    name: 'handoff_human',
    description: 'Hand the conversation to a human staff member.',
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
  // BH1 · VAN READONLY. Ảnh là lượt GỬI RA KHÁCH THẬT — luật số 1 áp ở đây, không chỉ ở
  // vòng poll. Trả về êm (không ném) vì hai nơi gọi hàm này (`pancake-poll.js:502`,
  // `handler.js:273`) đều gọi TRẦN, không bọc try — ném ở đây là làm vỡ cả lượt chat.
  if (!vanGuiDangMo()) {
    state.pendingImages = []; state.pendingCaption = '';
    console.warn(`[van] PANCAKE_READONLY=1 → BỎ ${queue.length} ảnh, không gửi cho khách (page ${state.pageId})`);
    return { sent: 0, total: queue.length, error: 'PANCAKE_READONLY=1' };
  }
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
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input tool phải là object');
    switch (name) {
      case 'update_customer': {
        await ctx.assertCanAct?.();
        if (!state.profile) throw new Error('Hồ sơ chưa được nạp');
        return { content: JSON.stringify(updateCustomer(input, state.profile, state.customerText)) };
      }
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
        if (state.handoff) throw new Error('Đã chuyển nhân viên; không nhận thêm đơn trong lượt này');
        if (state.orderResult) return { content: JSON.stringify(state.orderResult) };
        const order = chuanBiDon(kb, input);
        Object.assign(input, order); // giữ hợp đồng caller cũ, nhưng chỉ gửi order đã lọc xuống backend
        await ctx.assertCanAct?.();
        const result = await (ctx.business?.captureOrder || nhanDonLegacy)(order, ctx);
        if (result?.ok !== true || result.captured !== true || !result.draft_id)
          throw new Error('Backend chưa xác nhận lưu thông tin đơn');
        state.orderResult = result;
        state.closed = true;
        state.orderCreatedThisTurn = true;
        return { content: JSON.stringify(result) };
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
        if (state.handoffNotified) return { content: JSON.stringify({ ok: true, handoff: true }) };
        if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500)
          throw new Error('Lý do chuyển nhân viên không hợp lệ');
        await ctx.assertCanAct?.();
        const result = await (ctx.business?.handoff || banGiaoLegacy)(input.reason.trim(), ctx);
        if (result?.ok !== true) throw new Error('Backend chưa xác nhận bàn giao');
        state.handoff = true;
        state.handoffReason = input.reason.trim();
        state.handoffNotified = true;
        return { content: JSON.stringify({ ok: true, handoff: true }) };
      }
      default:
        return { content: `Tool không xác định: ${name}`, isError: true };
    }
  } catch (err) {
    if (err.khongThuLai || ['LoiQuyenHoiThoai', 'LoiCuaGuiDong'].includes(err.name)) throw err;
    return { content: `Lỗi tool ${name}: ${err.message}`, isError: true };
  }
}
