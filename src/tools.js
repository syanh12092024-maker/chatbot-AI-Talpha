import { createOrder } from './pancake.js';

// Định nghĩa tool (function calling) cho closer.
export const toolDefs = [
  {
    name: 'get_price',
    description: 'Lấy giá lẻ và giá combo của một sản phẩm từ Knowledge Base. Dùng khi cần báo giá chính xác.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string', description: 'Mã SP, ví dụ SP001' } },
      required: ['product_id'],
    },
  },
  {
    name: 'check_stock',
    description: 'Kiểm tra tồn kho của một sản phẩm.',
    input_schema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id'],
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
        product_id: { type: 'string' },
        variant: { type: 'string' },
        qty: { type: 'integer' },
        cod_confirmed: { type: 'boolean', description: 'Khách đã xác nhận thanh toán khi nhận hàng' },
      },
      required: ['name', 'phone', 'address', 'city', 'product_id', 'qty', 'cod_confirmed'],
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

function findProduct(kb, id) {
  return kb.products.find((p) => p.id.toLowerCase() === String(id).toLowerCase());
}

// Thực thi tool. Trả về { content: string, isError?: bool }.
export async function executeTool(name, input, ctx) {
  const { kb, state } = ctx;
  try {
    switch (name) {
      case 'get_price': {
        const p = findProduct(kb, input.product_id);
        if (!p) return { content: `Không tìm thấy sản phẩm ${input.product_id} trong KB.`, isError: true };
        return {
          content: JSON.stringify({
            product_id: p.id, name: p.name, currency: p.currency,
            price1: p.price1, combo2: p.combo2, combo3: p.combo3,
          }),
        };
      }
      case 'check_stock': {
        const p = findProduct(kb, input.product_id);
        if (!p) return { content: `Không tìm thấy sản phẩm ${input.product_id}.`, isError: true };
        return { content: JSON.stringify({ product_id: p.id, stock: p.stock ?? 'không rõ' }) };
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
        const order = await createOrder(input, ctx);
        state.orderId = order.id;
        return { content: JSON.stringify({ ok: true, order_id: order.id }) };
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
