// npm run wa:login                      → hiện mã QR để quét bằng WhatsApp trên điện thoại
// npm run wa:login -- --phone 84912345678 → lấy MÃ GHÉP 8 ký tự (dễ hơn khi làm qua SSH)
// npm run wa:login -- --groups           → đã đăng nhập rồi thì liệt kê nhóm + JID để điền .env
//
// Quét/ghép xong, khoá phiên lưu ở wa-auth/ (KHÔNG commit — coi như mật khẩu).
import 'dotenv/config';
import qrcode from 'qrcode-terminal';
import { connect, listGroups, hasSession, AUTH_DIR } from './wa.js';

const args = process.argv.slice(2);
const phoneArg = args.indexOf('--phone');
const phone = phoneArg >= 0 ? String(args[phoneArg + 1] || '').replace(/\D/g, '') : '';

if (!hasSession() && !phone) {
  console.log('Chưa có phiên → sẽ hiện mã QR. Trên điện thoại: WhatsApp → Thiết bị đã liên kết → Liên kết thiết bị.');
  console.log('(Làm qua SSH thì tiện hơn khi dùng mã ghép: npm run wa:login -- --phone 84912345678)\n');
}

let printed = false;
const sock = await connect({
  timeoutMs: 180000,
  onQr: (qr) => {
    if (phone || printed) return; // dùng mã ghép thì bỏ qua QR
    printed = true;
    qrcode.generate(qr, { small: true });
    console.log('↑ Quét mã này trong vòng ~40 giây (hết hạn thì chạy lại lệnh).');
  },
});

// Mã ghép: chỉ xin được khi chưa đăng ký thiết bị.
if (phone && !hasSession()) {
  const code = await sock.requestPairingCode(phone);
  console.log(`\n🔑 MÃ GHÉP: ${code}`);
  console.log('Nhập trên điện thoại: WhatsApp → Thiết bị đã liên kết → Liên kết bằng số điện thoại.\n');
}

console.log(`✓ WhatsApp đã kết nối. Phiên lưu tại: ${AUTH_DIR}`);

// Luôn liệt kê nhóm sau khi kết nối — đây là thứ cần để điền WA_GROUP_JID.
{
  const groups = await listGroups(sock);
  if (!groups.length) {
    console.log('\nSố này chưa ở trong nhóm nào (hoặc chưa đồng bộ xong — thử chạy lại sau ~30 giây).');
  } else {
    console.log(`\nCác nhóm số này đang tham gia (${groups.length}):`);
    for (const g of groups) console.log(`  ${g.name}  ·  ${g.members} thành viên\n    WA_GROUP_JID=${g.jid}`);
    console.log('\n→ Chép dòng WA_GROUP_JID của nhóm muốn nhận báo cáo vào .env');
  }
}

setTimeout(() => process.exit(0), 1500);
