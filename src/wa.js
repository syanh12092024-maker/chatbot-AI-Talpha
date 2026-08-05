// GỬI TIN VÀO NHÓM WHATSAPP (thư viện KHÔNG chính thức — Baileys, giả lập WhatsApp Web).
//
// VÌ SAO PHẢI DÙNG CÁCH NÀY: WhatsApp Cloud API chính thức của Meta CHỈ gửi 1-1, không gửi
// được vào group chat. Muốn tin vào đúng nhóm thì chỉ còn đường này.
//
// ĐÁNH ĐỔI phải biết:
//   · Meta có quyền KHÓA số điện thoại dùng cách này → nên dùng số phụ, đừng dùng số chính.
//   · Phiên đăng nhập có thể rớt (đổi điện thoại, đăng xuất thiết bị, lâu không dùng)
//     → phải chạy lại `npm run wa:login`. Khi rớt, sendToGroup trả {ok:false} chứ không ném lỗi
//     làm hỏng cron.
//   · Thư mục phiên (WA_AUTH_DIR) chứa khoá đăng nhập — coi như mật khẩu, KHÔNG commit.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import makeWASocket, { useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(DIR, 'wa-auth');
const logger = pino({ level: process.env.WA_LOG_LEVEL || 'silent' });

export function hasSession() {
  try { return fs.existsSync(path.join(AUTH_DIR, 'creds.json')); } catch { return false; }
}

// Mở kết nối và chờ tới khi WhatsApp báo sẵn sàng ('open').
// onQr/onPairing chỉ dùng lúc ĐĂNG NHẬP LẦN ĐẦU (wa-login.js truyền vào).
export async function connect({ onQr, onPairingCode, pairingPhone, timeoutMs = 60000 } = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.ubuntu('AI Closer'),
    syncFullHistory: false, // chỉ gửi tin đi, không cần tải lịch sử chat về
    markOnlineOnConnect: false, // đừng chiếm trạng thái "online" của số đó
  });
  sock.ev.on('creds.update', saveCreds);

  // MÃ GHÉP phải xin NGAY khi socket vừa dựng, KHÔNG được chờ connection='open' —
  // với cách ghép bằng số, WhatsApp chỉ mở kết nối SAU khi người dùng nhập mã. Chờ 'open'
  // trước khi xin mã là treo tới hết giờ mà chẳng bao giờ có mã.
  if (pairingPhone && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try { onPairingCode?.(await sock.requestPairingCode(pairingPhone)); }
      catch (e) { console.error('[wa] xin mã ghép lỗi:', e.message); }
    }, 3000);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Hết ${timeoutMs / 1000}s mà WhatsApp chưa kết nối được`)), timeoutMs);
    sock.ev.on('connection.update', (u) => {
      if (u.qr && onQr) onQr(u.qr);
      if (u.connection === 'open') { clearTimeout(timer); resolve(sock); }
      if (u.connection === 'close') {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        // 401/403 = phiên bị thu hồi (đăng xuất từ điện thoại) → phải đăng nhập lại, retry vô ích.
        if (code === 401 || code === 403) { clearTimeout(timer); reject(new Error('Phiên WhatsApp đã bị đăng xuất — chạy lại: npm run wa:login')); }
      }
    });
  });
}

export async function listGroups(sock) {
  const all = await sock.groupFetchAllParticipating();
  return Object.values(all).map((g) => ({ jid: g.id, name: g.subject, members: g.participants?.length || 0 }));
}

// Gửi 1 tin vào nhóm đã cấu hình. KHÔNG ném lỗi — cron gọi hàm này, lỗi phải được nuốt gọn
// và báo bằng giá trị trả về để lần chạy sau vẫn tiếp tục.
export async function sendToGroup(text, jid = process.env.WA_GROUP_JID) {
  if (!jid) return { ok: false, error: 'chưa đặt WA_GROUP_JID trong .env (chạy: npm run wa:login -- --groups để xem danh sách nhóm)' };
  if (!hasSession()) return { ok: false, error: 'chưa đăng nhập WhatsApp (chạy: npm run wa:login)' };
  let sock;
  try {
    sock = await connect();
    await sock.sendMessage(jid, { text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { sock?.end?.(); } catch { /* đóng socket, không quan trọng nếu lỗi */ }
  }
}
