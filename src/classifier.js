import { anthropic, aiExtras } from './llm.js';
import { config } from './config.js';
import { cleanText } from './text.js';

const SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['interested', 'question', 'complaint', 'spam'] },
    lang: { type: 'string', enum: ['tl', 'en', 'other'] },
    lead_quality: { type: 'integer' },
    urgency: { type: 'integer' },
    is_spam_conf: { type: 'number' },
  },
  required: ['intent', 'lang', 'lead_quality', 'urgency', 'is_spam_conf'],
  additionalProperties: false,
};

// Phân loại nhanh mỗi tin bằng Haiku 4.5 (rẻ). Có fallback nếu API/parse lỗi.
export async function classify(message, productName = 'sản phẩm') {
  // Tin thô có thể chứa nửa emoji (JSON hỏng → 400) hoặc chỉ có khoảng trắng (API từ chối).
  // Trước đây cả hai đều rơi vào fallback, tức MẤT phân loại: không còn nhận ra spam/khiếu nại.
  const msg = cleanText(message).trim();
  if (!msg) return { intent: 'question', lang: 'en', lead_quality: 5, urgency: 5, is_spam_conf: 0 };
  try {
    const res = await anthropic.messages.create({
      model: config.modelClassifier,
      max_tokens: 200,
      system:
        'Bạn là bộ phân loại tin nhắn bán hàng. Bối cảnh: khách đến từ quảng cáo ' +
        `"${productName}", khách là người Philippines sống ở Trung Đông (OFW), thanh toán COD. Ngôn ngữ: tl (Tagalog/Taglish) hoặc en. Chỉ trả JSON theo schema.`,
      messages: [{ role: 'user', content: msg }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      ...aiExtras, // Kimi: tắt thinking (đã thử: json_schema chạy được trên Kimi khi thinking off)
    });
    const text = res.content.find((b) => b.type === 'text')?.text || '{}';
    return JSON.parse(text);
  } catch (err) {
    console.error('[classify] lỗi, dùng fallback:', err.message);
    // Fallback an toàn: coi là quan tâm, để người/closer xử lý.
    return { intent: 'interested', lang: 'other', lead_quality: 5, urgency: 5, is_spam_conf: 0 };
  }
}
