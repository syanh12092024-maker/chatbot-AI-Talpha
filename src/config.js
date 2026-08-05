import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function resolveKbPath(p) {
  if (!p) return path.resolve(projectRoot, '..', 'KB_AI_Chatbot_Mau.xlsx');
  return path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
  metaSystemToken: process.env.META_SYSTEM_TOKEN || '', // System User token (Business Manager) — đa-page
  metaBusinessIds: (process.env.META_BUSINESS_IDS || '').split(',').map((s) => s.trim()).filter(Boolean), // BM id để liệt kê owned_pages (deploy không có tokens.json)
  graphVersion: process.env.GRAPH_VERSION || 'v21.0',
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''), // URL công khai (cloudflared/ngrok) để host ảnh cho Messenger tải về
  verifyToken: process.env.VERIFY_TOKEN || 'changeme',
  appSecret: process.env.APP_SECRET || '',
  kbPath: resolveKbPath(process.env.KB_PATH),
  googleSheetId: process.env.GOOGLE_SHEET_ID || '', // kịch bản trên Google Sheet (tùy chọn)
  sheetTabs: {
    // Sản phẩm tách theo thị trường (mỗi tab 1 nước) — bot đọc & gộp hết.
    productTabs: ['UAE', 'KSA', 'Kuwait', 'Qatar', 'Oman', 'Bahrain', 'Khác'],
    products: 'Sản phẩm theo Page', // fallback: tab gộp cũ nếu chưa tách thị trường
    policies: 'Chính sách', faq: 'FAQ', obj: 'Xử lý phản đối',
  },
  modelCloser: process.env.MODEL_CLOSER || 'claude-haiku-4-5', // Haiku toàn bộ — tiết kiệm chi phí
  modelClassifier: process.env.MODEL_CLASSIFIER || 'claude-haiku-4-5',
  port: Number(process.env.PORT || 3100),
  pancake: {
    apiKey: process.env.PANCAKE_API_KEY || '',
    shopId: process.env.PANCAKE_SHOP_ID || '',
  },
  pancakeToken: process.env.PANCAKE_TOKEN || '',       // JWT pages.fm — token CHÍNH
  // Token PHỤ (failover đa tài khoản): mỗi tài khoản Pancake nắm quyền 1 nhóm page khác nhau.
  // Page nào token chính dính lỗi quyền/gói (105/121) → bot tự thử lần lượt token phụ.
  pancakeTokensExtra: (process.env.PANCAKE_TOKENS_EXTRA || '').split(',').map((s) => s.trim()).filter(Boolean),
  pancakePollMs: Number(process.env.PANCAKE_POLL_MS || 6000), // chu kỳ hỏi tin mới
  // Đăng nhập dashboard (Basic Auth) — BẮT BUỘC đặt khi chạy trên IP công khai (VPS).
  adminUser: process.env.ADMIN_USER || '',
  adminPass: process.env.ADMIN_PASS || '',
  // Tự tạo đơn thật trong Pancake khi AI chốt. MẶC ĐỊNH TẮT — bật bằng AUTO_CREATE_ORDER=1 trong .env.
  autoCreateOrder: process.env.AUTO_CREATE_ORDER === '1',
  // Né hội thoại đã gán cho nhân viên. MẶC ĐỊNH TẮT vì Pancake TỰ ĐỘNG gán hội thoại cho NV
  // → bật sẽ làm AI im gần hết. Bật bằng RESPECT_ASSIGNEE=1 nếu sale thực sự chat tay.
  respectAssignee: process.env.RESPECT_ASSIGNEE === '1',
  // TỰ GẮN THẺ Pancake khi AI hành động (tên thẻ phải TỒN TẠI trên page; trống = tắt).
  pkTags: {
    ai: process.env.PK_TAG_AI ?? 'AI Chăm',             // AI đang trực tiếp nhắn với khách
    order: process.env.PK_TAG_ORDER ?? 'AI Chốt',       // AI chốt đơn — sale vào kiểm tra hội thoại + đơn rồi fix
    handoff: process.env.PK_TAG_HANDOFF ?? 'AI back Sale', // AI cần sale can thiệp — thấy thẻ là vào hỗ trợ
  },
  // Circuit breakers
  // Trần lượt AI/khách (đếm BỀN theo Sổ AI 24h, sống sót qua restart). Chỉnh bằng MAX_AI_TURNS.
  maxAiTurnsBeforeHandoff: Number(process.env.MAX_AI_TURNS || 5),
  maxToolIterations: 5,       // giới hạn vòng lặp tool-use mỗi lượt
  // ẢNH: khách thích xem nhiều ảnh → chốt tốt hơn, NHƯNG gửi dồn dập dễ bị Meta đánh spam (#2022).
  // Cách chạy an toàn: đặt IMG_PILOT_PAGES = vài page thử nghiệm → chỉ các page đó gửi imgMaxPerTurn,
  // page còn lại giữ mức cũ imgSafeMaxPerTurn. Bỏ trống IMG_PILOT_PAGES = áp dụng cho MỌI page.
  imgMaxPerTurn: Number(process.env.IMG_MAX_PER_TURN || 4),
  imgSafeMaxPerTurn: Number(process.env.IMG_SAFE_MAX_PER_TURN || 2),
  imgPilotPages: (process.env.IMG_PILOT_PAGES || '').split(',').map((s) => s.trim()).filter(Boolean),
  // ÉP ẢNH LƯỢT ĐẦU: prompt đã dặn "luôn gửi ảnh khi giới thiệu" nhưng Haiku chỉ nghe ~49% số lần
  // (đo trên 1045 khách/7 ngày) — nhiều page có 12 ảnh mà chưa gửi cho khách nào. Nên lượt AI đầu
  // tiên sẽ do CODE gửi ảnh, không phụ thuộc model. Đặt 0 để tắt.
  imgFirstTurn: Number(process.env.IMG_FIRST_TURN ?? 2),
  imgGapMs: Number(process.env.IMG_GAP_MS || 700), // giãn cách giữa 2 ảnh cho tự nhiên, đỡ bị coi là bot
  imgRetry: Number(process.env.IMG_RETRY || 1),    // số lần thử lại khi Pancake/FB trả lỗi chập chờn
};

export function assertConfig() {
  const missing = [];
  if (!config.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')} (xem .env.example)`);
  }
}
