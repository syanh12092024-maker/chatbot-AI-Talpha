import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { noteLlmOk, noteLlmError } from './llm-health.js';

// MỘT client cho cả hai nhà cung cấp: Kimi (Moonshot) có endpoint tương thích chuẩn Anthropic
// nên chỉ cần đổi baseURL + key — toàn bộ code closer/classifier/tools giữ nguyên.
// Dùng fallback chuỗi để khởi tạo không lỗi khi chưa có key (UI vẫn xem được);
// nếu thiếu key thật, lời gọi API sẽ báo lỗi và được xử lý ở tầng trên.
const client = config.aiProvider === 'kimi'
  ? new Anthropic({ apiKey: config.kimi.apiKey || 'MISSING_KEY', baseURL: config.kimi.baseUrl })
  : new Anthropic({ apiKey: config.anthropicApiKey || 'MISSING_KEY' });

// BỌC messages.create để MỌI lời gọi LLM đều báo cáo sức khoẻ về llm-health.js.
// Không bọc thì lỗi hết tiền chỉ hiện trong log và không ai biết — đúng cảnh
// 08–10/08/2026 bot chết 2 ngày mà dashboard vẫn xanh.
// Facade tối giản: chỉ phơi ra đúng thứ codebase dùng (messages.create). Cố ý KHÔNG
// spread client — spread một instance class sẽ mất prototype (stream/countTokens/beta…)
// và hỏng âm thầm nếu sau này ai đó gọi tới.
export const anthropic = {
  raw: client,
  messages: {
    create: async (...args) => {
      try {
        const res = await client.messages.create(...args);
        noteLlmOk();
        return res;
      } catch (err) {
        noteLlmError(err);
        throw err;
      }
    },
  },
};

// Tham số THÊM theo nhà cung cấp — spread vào mọi messages.create.
// Kimi k2.6 MẶC ĐỊNH BẬT thinking: không tắt thì suy nghĩ ăn sạch max_tokens và tin trả về RỖNG
// (đo thật: max_tokens=200 → thinking_tokens=199, text=""). Haiku thì không cần field này nên
// chỉ thêm khi chạy Kimi.
export const aiExtras = config.aiProvider === 'kimi' ? { thinking: { type: 'disabled' } } : {};

console.log(`[llm] Nhà cung cấp AI: ${config.aiProvider}${config.aiProvider === 'kimi' ? ` (${config.kimi.baseUrl})` : ''} · closer=${config.modelCloser} · classifier=${config.modelClassifier}`);
