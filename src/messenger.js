import crypto from 'node:crypto';
import { config } from './config.js';
import { getPageToken, reportSendFailure } from './pages.js';

const GRAPH = `https://graph.facebook.com/${config.graphVersion}`;

// Gửi tin text. Nếu token hỏng (app bị khóa) → đánh dấu + thử token khác (failover).
export async function sendText(psid, text, pageId) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = getPageToken(pageId);
    if (!token) { console.log(`[messenger] (chưa có token cho page ${pageId}) -> ${psid}: ${text}`); return; }
    const res = await fetch(`${GRAPH}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text } }),
    });
    if (res.ok) return;
    const data = await res.json().catch(() => ({}));
    const code = data?.error?.code;
    console.error('[messenger] gửi lỗi:', res.status, data?.error?.message || '');
    // 190 = token hết hạn/sai; 200/10/3 = quyền. Đánh dấu token hỏng rồi thử source khác.
    if ([190, 200, 10, 3, 102].includes(code)) {
      reportSendFailure(pageId, token);
      continue; // thử token kế (nếu page có app dự phòng)
    }
    return; // lỗi khác → dừng
  }
}

// Bật "đang nhập..." cho tự nhiên (tùy chọn).
export async function sendTyping(psid, on, pageId) {
  const token = getPageToken(pageId);
  if (!token) return;
  await fetch(`${GRAPH}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, sender_action: on ? 'typing_on' : 'typing_off' }),
  }).catch(() => {});
}

// Xác thực chữ ký webhook X-Hub-Signature-256.
export function verifySignature(rawBody, signatureHeader) {
  if (!config.appSecret) return true; // chưa cấu hình -> bỏ qua (chỉ nên cho dev)
  if (!signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', config.appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
