import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function resolveKbPath(p) {
  if (!p) return path.resolve(projectRoot, '..', 'KB_AI_Chatbot_Mau.xlsx');
  return path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
}

// NHÀ CUNG CẤP AI: 'anthropic' (mặc định) hoặc 'kimi' (Moonshot — endpoint tương thích Anthropic).
// Thêm Kimi vì tài khoản Anthropic hết credit 06/08/2026 làm bot đứng ~3 tiếng; giữ dạng công tắc
// để đổi qua lại chỉ bằng .env, không sửa code.
const AI_PROVIDER = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();

// Chọn model an toàn theo nhà cung cấp. BẪY vận hành có thật: đổi AI_PROVIDER=kimi mà quên sửa
// MODEL_CLOSER=claude-... trong .env → Moonshot trả 404 "model not found" và bot đứng im.
// Model lệch nhà cung cấp thì BỎ QUA (kèm cảnh báo) và dùng mặc định đúng, thay vì chết.
function pickModel(envVal) {
  const def = AI_PROVIDER === 'kimi' ? 'kimi-k2.6' : 'claude-haiku-4-5';
  if (!envVal) return def;
  const mismatch = (AI_PROVIDER === 'kimi' && envVal.startsWith('claude-'))
    || (AI_PROVIDER !== 'kimi' && envVal.startsWith('kimi-'));
  if (mismatch) {
    console.warn(`[config] MODEL "${envVal}" không thuộc nhà cung cấp "${AI_PROVIDER}" → dùng ${def}. Sửa MODEL_CLOSER/MODEL_CLASSIFIER trong .env cho khớp.`);
    return def;
  }
  return envVal;
}

export const config = {
  aiProvider: AI_PROVIDER,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  kimi: {
    apiKey: process.env.KIMI_API_KEY || '',
    // Bản QUỐC TẾ. Key .cn không dùng được ở đây và ngược lại.
    baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/anthropic',
  },
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
  // Model mặc định theo nhà cung cấp (MODEL_CLOSER/MODEL_CLASSIFIER trong .env vẫn đè được).
  modelCloser: pickModel(process.env.MODEL_CLOSER),
  modelClassifier: pickModel(process.env.MODEL_CLASSIFIER),
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
  // ĐƠN GIÁ token (USD / 1 TRIỆU token) để quy tiền trên dashboard — mặc định theo nhà cung cấp,
  // đè bằng env khi hãng đổi giá. Nguồn: platform.kimi.ai/docs/pricing (08/2026) & giá Claude公bố.
  //   kimi-k2.6:        vào $0.95 · trúng cache $0.16 · ra $4.00
  //   claude-haiku-4-5: vào $1.00 · đọc cache $0.10 · ra $5.00
  aiPrices: {
    in: Number(process.env.AI_PRICE_IN || (AI_PROVIDER === 'kimi' ? 0.95 : 1.0)),
    cache: Number(process.env.AI_PRICE_CACHE || (AI_PROVIDER === 'kimi' ? 0.16 : 0.1)),
    out: Number(process.env.AI_PRICE_OUT || (AI_PROVIDER === 'kimi' ? 4.0 : 5.0)),
    usdVnd: Number(process.env.AI_USD_VND || 26000), // tỉ giá quy đổi hiển thị
  },
  // Circuit breakers
  // Trần lượt AI/khách (đếm BỀN theo Sổ AI 24h, sống sót qua restart). Chỉnh bằng MAX_AI_TURNS.
  // 06/08/2026: chủ dự án hạ 5 → 4 để tiết kiệm token.
  maxAiTurnsBeforeHandoff: Number(process.env.MAX_AI_TURNS || 4),
  maxToolIterations: 5,       // giới hạn vòng lặp tool-use mỗi lượt
  // ẢNH: khách thích xem nhiều ảnh → chốt tốt hơn, NHƯNG gửi dồn dập dễ bị Meta đánh spam (#2022).
  // Cách chạy an toàn: đặt IMG_PILOT_PAGES = vài page thử nghiệm → chỉ các page đó gửi imgMaxPerTurn,
  // page còn lại giữ mức cũ imgSafeMaxPerTurn. Bỏ trống IMG_PILOT_PAGES = áp dụng cho MỌI page.
  imgMaxPerTurn: Number(process.env.IMG_MAX_PER_TURN || 4),
  imgSafeMaxPerTurn: Number(process.env.IMG_SAFE_MAX_PER_TURN || 2),
  imgPilotPages: (process.env.IMG_PILOT_PAGES || '').split(',').map((s) => s.trim()).filter(Boolean),
  imgGapMs: Number(process.env.IMG_GAP_MS || 700), // giãn cách giữa 2 ảnh cho tự nhiên, đỡ bị coi là bot
  imgRetry: Number(process.env.IMG_RETRY || 1),    // số lần thử lại khi Pancake/FB trả lỗi chập chờn
};

export function assertConfig() {
  const missing = [];
  if (config.aiProvider === 'kimi') {
    if (!config.kimi.apiKey) missing.push('KIMI_API_KEY');
  } else if (!config.anthropicApiKey) {
    missing.push('ANTHROPIC_API_KEY');
  }
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')} (xem .env.example)`);
  }
}
