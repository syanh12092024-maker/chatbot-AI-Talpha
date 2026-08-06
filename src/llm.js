import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

// MỘT client cho cả hai nhà cung cấp: Kimi (Moonshot) có endpoint tương thích chuẩn Anthropic
// nên chỉ cần đổi baseURL + key — toàn bộ code closer/classifier/tools giữ nguyên.
// Dùng fallback chuỗi để khởi tạo không lỗi khi chưa có key (UI vẫn xem được);
// nếu thiếu key thật, lời gọi API sẽ báo lỗi và được xử lý ở tầng trên.
export const anthropic = config.aiProvider === 'kimi'
  ? new Anthropic({ apiKey: config.kimi.apiKey || 'MISSING_KEY', baseURL: config.kimi.baseUrl })
  : new Anthropic({ apiKey: config.anthropicApiKey || 'MISSING_KEY' });

// Tham số THÊM theo nhà cung cấp — spread vào mọi messages.create.
// Kimi k2.6 MẶC ĐỊNH BẬT thinking: không tắt thì suy nghĩ ăn sạch max_tokens và tin trả về RỖNG
// (đo thật: max_tokens=200 → thinking_tokens=199, text=""). Haiku thì không cần field này nên
// chỉ thêm khi chạy Kimi.
export const aiExtras = config.aiProvider === 'kimi' ? { thinking: { type: 'disabled' } } : {};

console.log(`[llm] Nhà cung cấp AI: ${config.aiProvider}${config.aiProvider === 'kimi' ? ` (${config.kimi.baseUrl})` : ''} · closer=${config.modelCloser} · classifier=${config.modelClassifier}`);
