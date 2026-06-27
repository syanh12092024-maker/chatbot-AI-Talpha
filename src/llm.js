import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

// Dùng fallback chuỗi để khởi tạo không lỗi khi chưa có key (UI vẫn xem được);
// nếu thiếu key thật, lời gọi API sẽ báo lỗi và được xử lý ở tầng trên.
export const anthropic = new Anthropic({ apiKey: config.anthropicApiKey || 'MISSING_KEY' });

