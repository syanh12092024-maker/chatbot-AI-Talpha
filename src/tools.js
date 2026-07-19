import { createOrder, pkSendImage } from './pancake.js';
import { sendImage } from './messenger.js';
import { productImages, productTiers } from './kb.js';
import { incOrder } from './stats.js';

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
        cod_confirmed: { type: 'boolean', description: 'Khách đã xác nhận thanh toán khi nhận hàng' },
      },
      required: ['name', 'phone', 'address', 'city', 'qty', 'cod_confirmed'],
    },
  },
  {
    name: 'send_product_image',
    description: 'Gửi ẢNH sản phẩm của page cho khách xem. Page chỉ bán 1 SP nên KHÔNG cần mã. Mỗi SP có thể có nhiều loại ảnh (Ảnh sản phẩm, Feedback, Thành phần, Công dụng...). Để trống category = gửi ảnh sản phẩm chính; truyền category để gửi đúng loại khách hỏi (vd "feedback", "thành phần").',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Bỏ trống — page chỉ có 1 SP, tool tự lấy.' },
        category: { type: 'string', description: 'Loại ảnh muốn gửi (khớp theo nhãn): vd "feedback", "thành phần", "công dụng". Bỏ trống = ảnh sản phẩm chính.' },
      },
      required: [],
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
        // Page 1 SP: tự điền sản phẩm nếu AI không truyền mã (không bắt khách chọn).
        const prod = findProduct(kb, input.product_id);
        if (prod) { input.product_id = prod.id; input.product_name = prod.name; }
        const order = await createOrder(input, ctx);
        state.orderId = order.id;
        try { incOrder(state.pageId); } catch { /* thống kê không chặn tạo đơn */ }
        return { content: JSON.stringify({ ok: true, order_id: order.id }) };
      }
      case 'send_product_image': {
        const p = findProduct(kb, input.product_id);
        if (!p) return { content: 'Page này chưa có sản phẩm trong KB nên chưa có ảnh. Cứ tư vấn bằng lời.', isError: true };
        const all = productImages(p);
        if (!all.length) return { content: `Sản phẩm ${p.id} chưa có ảnh. Cứ tư vấn bằng lời.`, isError: true };
        const norm = (s) => String(s || '').toLowerCase();
        const cat = norm(input.category);
        let pick = cat ? all.filter((im) => norm(im.label).includes(cat)) : all.filter((im) => norm(im.label).includes('sản phẩm'));
        if (!pick.length) pick = cat ? [] : all.slice(0, 1); // không khớp category → báo lại; không có category → ảnh đầu
        if (!pick.length) {
          return { content: `Sản phẩm ${p.id} không có ảnh loại "${input.category}". Các loại có: ${[...new Set(all.map((im) => im.label || 'Ảnh SP'))].join(', ')}.`, isError: true };
        }
        // Gửi cùng kênh với tin chữ: có ngữ cảnh Pancake → gửi qua Pancake; nếu không → Facebook Messenger.
        // Giới hạn 2 ảnh/lượt để tránh Facebook đánh dấu spam (lỗi #2022 khóa gửi tin).
        const viaPancake = state.pkConvId && state.pkCustId;
        const toSend = pick.slice(0, 2);
        let sent = 0, lastErr = '';
        for (const im of toSend) {
          if (viaPancake) {
            const r = await pkSendImage(state.pageId, state.pkConvId, state.pkCustId, im.url);
            if (r.ok) sent++; else lastErr = r.error;
          } else { await sendImage(state.psid, im.url, state.pageId); sent++; }
        }
        console.log(`[img] page ${state.pageId} ${viaPancake ? 'Pancake' : 'Messenger'} gửi ${sent}/${toSend.length} ảnh (${input.category || 'sản phẩm'})${sent ? ' ✓' : ' ✗ ' + lastErr}`);
        if (!sent) return { content: `Gửi ảnh thất bại (${lastErr || 'không rõ'}). Cứ tư vấn bằng lời, đừng hứa gửi ảnh nữa.`, isError: true };
        return { content: `Đã gửi ${sent} ảnh (${input.category || 'sản phẩm'}) cho khách qua ${viaPancake ? 'Pancake' : 'Messenger'}.` };
      }
      case 'handoff_human': {
        state.handoff = true;
        state.handoffReason = input.reason || '';
        return { content: 'Đã chuyển cho nhân viên. Hãy báo khách sẽ có người hỗ trợ ngay.' };
      }
      default:
        return { content: `Tool không xác định: ${name}`, isError: true };
    }
  } catch (err) {
    return { content: `Lỗi tool ${name}: ${err.message}`, isError: true };
  }
}
