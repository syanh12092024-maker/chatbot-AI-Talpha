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
  graphVersion: process.env.GRAPH_VERSION || 'v21.0',
  verifyToken: process.env.VERIFY_TOKEN || 'changeme',
  appSecret: process.env.APP_SECRET || '',
  kbPath: resolveKbPath(process.env.KB_PATH),
  googleSheetId: process.env.GOOGLE_SHEET_ID || '', // kịch bản trên Google Sheet (tùy chọn)
  sheetTabs: { products: 'Sản phẩm theo Page', policies: 'Chính sách', faq: 'FAQ', obj: 'Xử lý phản đối' },
  modelCloser: process.env.MODEL_CLOSER || 'claude-sonnet-4-6',
  modelClassifier: process.env.MODEL_CLASSIFIER || 'claude-haiku-4-5',
  port: Number(process.env.PORT || 3100),
  pancake: {
    apiKey: process.env.PANCAKE_API_KEY || '',
    shopId: process.env.PANCAKE_SHOP_ID || '',
  },
  // Circuit breakers
  maxAiTurnsBeforeHandoff: 6, // không tự trả quá N lượt/khách khi chưa có người duyệt
  maxToolIterations: 5,       // giới hạn vòng lặp tool-use mỗi lượt
};

export function assertConfig() {
  const missing = [];
  if (!config.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')} (xem .env.example)`);
  }
}
