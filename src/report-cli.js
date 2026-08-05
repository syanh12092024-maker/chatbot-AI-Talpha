// npm run report -- morning|afternoon [--send]
// KHÔNG có --send thì chỉ IN RA MÀN HÌNH (xem trước, không gửi cho ai).
import 'dotenv/config';
import { buildReport, fetchPageNames } from './report.js';

const args = process.argv.slice(2);
const kind = args.find((a) => a === 'morning' || a === 'afternoon') || 'afternoon';
const send = args.includes('--send');

const names = await fetchPageNames();
const text = buildReport({ kind, names });

if (!send) {
  console.log('----- XEM TRƯỚC (không gửi) -----');
  console.log(text);
  console.log('---------------------------------');
  console.log(`(${text.length} ký tự · thêm --send để gửi thật)`);
  process.exit(0);
}

const { sendToGroup } = await import('./wa.js');
const r = await sendToGroup(text);
console.log(r.ok ? `✓ Đã gửi vào nhóm WhatsApp (${text.length} ký tự)` : `✗ Gửi lỗi: ${r.error}`);
process.exit(r.ok ? 0 : 1);
