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
        `"${productName}", khách là người Philippines sống ở Trung Đông (OFW), thanh toán COD. Ngôn ngữ: tl (Tagalog/Taglish) hoặc en. Chỉ trả JSON theo schema.\n` +
        // 'complaint' là cửa BÀN GIAO NGƯỜI THẬT (handler.js) — dán nhãn này là AI ngừng bán ngay lập tức.
        // Trước 07/08/2026 không định nghĩa nhãn nên "ang mahal po naman" (chê đắt) bị coi là khiếu nại
        // → khách phản đối giá bị đẩy sang sale thay vì được thuyết phục. Phải khoanh nhãn thật hẹp.
        'ĐỊNH NGHĨA "complaint" (RẤT HẸP — chỉ dùng khi đúng một trong các trường hợp sau):\n' +
        '  • Khách đã MUA/ĐÃ ĐẶT rồi và có vấn đề: hàng lỗi/hỏng/sai, chưa nhận được hàng, giao chậm, đòi trả hàng/hoàn tiền, bị tính sai tiền.\n' +
        '  • Khách tức giận, chửi bới, tố lừa đảo ("scam", "peke", "manloloko"), dọa report/kiện.\n' +
        'TUYỆT ĐỐI KHÔNG dán "complaint" cho PHẢN ĐỐI BÁN HÀNG thông thường của khách CHƯA mua — ' +
        'chê đắt ("ang mahal", "mahal po naman", "sobrang mahal"), xin nghĩ thêm ("iisipin ko muna", "next time na lang"), ' +
        'nói chưa có tiền ("wala pang budget", "sahod pa"), nghi ngờ hiệu quả/chất lượng, so giá chỗ khác, hay từ chối mua. ' +
        'Những tin đó là "interested" (còn quan tâm, đang cân nhắc) hoặc "question" — đây là việc của nhân viên bán hàng, không phải khiếu nại.',
      messages: [{ role: 'user', content: msg }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      ...aiExtras, // Kimi: tắt thinking (đã thử: json_schema chạy được trên Kimi khi thinking off)
    });
    const text = res.content.find((b) => b.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text);
    // Đính kèm token đã dùng (không enumerable — không lọt vào JSON/log) để handler cộng vào lượt.
    Object.defineProperty(parsed, '__usage', {
      value: { tin: res.usage?.input_tokens || 0, tout: res.usage?.output_tokens || 0, cread: res.usage?.cache_read_input_tokens || 0, calls: 1 },
      enumerable: false,
    });
    return parsed;
  } catch (err) {
    console.error('[classify] lỗi, dùng fallback:', err.message);
    // Fallback an toàn: coi là quan tâm, để người/closer xử lý.
    return { intent: 'interested', lang: 'other', lead_quality: 5, urgency: 5, is_spam_conf: 0 };
  }
}
