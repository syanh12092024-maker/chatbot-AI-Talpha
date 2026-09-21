import { baoDamHoiThoai } from '../chat/kho.js';
import { xepTin } from './kho.js';
import { pageThuocV3 } from './page-routing.js';
import { verifySignature } from '../messenger.js';

export class LoiWebhook extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Xác thực cấu trúc trước khi mở giao dịch; không lưu/log toàn payload chứa PII. */
export function docSuKien(body) {
  if (body?.object !== 'page') throw new LoiWebhook(404, 'Không phải Page event');
  if (!Array.isArray(body.entry)) throw new LoiWebhook(400, 'Thiếu entry');
  const events = [];
  for (const entry of body.entry) {
    if (!entry || typeof entry.id !== 'string' || (entry.messaging !== undefined && !Array.isArray(entry.messaging))) {
      throw new LoiWebhook(400, 'Entry không hợp lệ');
    }
    for (const ev of entry.messaging || []) {
      if (!ev?.message || ev.message.is_echo) continue;
      const { mid, text } = ev.message;
      // Chỉ xử lý text như đường webhook trước đây; delivery/read không phải tin mới.
      if (text === undefined) continue;
      if (typeof mid !== 'string' || !mid || typeof ev.sender?.id !== 'string' ||
          !ev.sender.id || typeof text !== 'string' || text.length > 20000) {
        throw new LoiWebhook(400, 'Tin nhắn thiếu định danh hoặc không hợp lệ');
      }
      events.push({ pageId: entry.id, psid: ev.sender.id, mid, text });
    }
  }
  return events;
}

export async function nhanWebhook(pool, body, { choPhep = pageThuocV3 } = {}) {
  const events = docSuKien(body);
  const client = await pool.connect();
  let them = 0, trung = 0, boQua = 0;
  try {
    await client.query('BEGIN');
    for (const ev of events) {
      if (!choPhep(ev.pageId)) { boQua++; continue; }
      // Khóa cấu hình tới COMMIT: không đổi nguồn giữa chừng.
      const p = (await client.query('SELECT id,team_id,nguon_tin FROM page WHERE page_id=$1 FOR SHARE', [ev.pageId])).rows[0];
      if (!p) throw new LoiWebhook(503, 'Page V3 chưa được cấu hình');
      if (p.nguon_tin !== 'webhook') { boQua++; continue; }
      await baoDamHoiThoai(client, { teamId: p.team_id, pageRowId: p.id, psid: ev.psid });
      const result = await xepTin(client, {
        teamId: p.team_id, pageId: ev.pageId, psid: ev.psid,
        convId: `webhook:${ev.psid}`, custId: '', msgId: ev.mid,
        noiDung: ev.text, nguon: 'webhook',
      });
      if (result.them) them++; else trung++;
    }
    await client.query('COMMIT');
    return { them, trung, boQua };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

/** Không gọi model/gửi tin trong request; ACK chỉ sau COMMIT. */
export function taoWebhookHandler({ layPool, xacThuc = verifySignature, luu = nhanWebhook }) {
  return async (req, res) => {
    try {
      if (!xacThuc(req.rawBody, req.get('x-hub-signature-256'))) return res.sendStatus(403);
    } catch { return res.sendStatus(403); }
    try {
      await luu(layPool(), req.body);
      return res.sendStatus(200);
    } catch (e) {
      // Không log text khách, payload, SQL parameters hoặc provider secrets.
      console.error('[webhook] lưu tin thất bại:', e.name);
      return res.sendStatus(e instanceof LoiWebhook ? e.status : 503);
    }
  };
}
