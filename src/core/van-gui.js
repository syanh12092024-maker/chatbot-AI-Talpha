// LÕI CHUNG · VAN GỬI — "máy này có được phép chạm khách thật không" (phiếu BH1).
//
// ═══ VÌ SAO CÓ FILE NÀY ════════════════════════════════════════════════════════════
// `PANCAKE_READONLY=1` là LUẬT SỐ 1 của dự án (§0a): máy cá nhân không bao giờ được gửi
// tin cho khách, vì VPS đang chạy song song — hai bot trả lời một hội thoại thì khách
// nhận tin đúp.
//
// Nhưng đo 16/09: biến ấy được kiểm ở **vòng poll** (`pancake-poll.js:229`), KHÔNG kiểm ở
// chỗ thật sự bắn ra mạng. `grep PANCAKE_READONLY src/pancake.js src/messenger.js
// src/pancake-orders.js` = **0 dòng**. Nghĩa là mọi đường vào KHÁC vòng poll đều đi vòng
// qua luật số 1:
//   · `POST /webhook` → `server.js:112 processMessage` → `sendText()`   (Meta gọi thẳng)
//   · `POST /admin/api/conversation/:psid/send` → `pkSendReply()`        (nút gửi tay)
// v3 đã phải dựng một cổng chặn trên `globalThis.fetch` (`chat/handler-v3.js:136`) chỉ để
// bù cho chỗ hở này — một bản vá ở tầng sai, vì file cần vá thì bị cấm sửa.
//
// File này là chỗ ĐÚNG để hỏi câu đó. BH1 đấu nó vào `tools.js` (file đã được §0a luật 4
// bản 16/09 cho phép sửa). `pkSendReply` trong `pancake-poll.js` VẪN CÒN HỞ — cần mở thêm
// hai file cấm, đã ghi §9 nợ N-SEND, chờ người quyết (phiếu BH1b).
//
// ⚠️ ĐỌC `process.env` TƯƠI mỗi lượt gọi, không cache ở module-scope: bộ ca đổi biến giữa
// các ca trong CÙNG một tiến trình (`node --test` chạy nhiều `test()` một file) phải thấy
// giá trị mới ngay. Cùng khuôn `channels/messenger/index.js:53` và `chat/handler-v3.js:97`.

/** Lỗi CÓ TÊN — nơi gọi bắt được đúng loại này, không phải đoán qua chuỗi thông báo. */
export class LoiVanGuiDong extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = 'LoiVanGuiDong';
  }
}

/** Van có mở không. Vắng biến = MỞ (máy chủ); `=1` = ĐÓNG (máy cá nhân / bản sao). */
export function vanGuiDangMo() {
  return process.env.PANCAKE_READONLY !== '1';
}

export function lyDoVanDong(thaoTac = 'thao tác này') {
  return `PANCAKE_READONLY=1 → máy này CHỈ ĐỌC, không được ${thaoTac}. `
    + 'Đây là luật số 1 của dự án: máy cá nhân gửi tin là khách nhận tin đúp từ hai bot.';
}

/** Ném khi van đóng. Dùng ở chỗ nào mà đi tiếp là chạm khách thật. */
export function assertCanSend(thaoTac = 'gửi ra ngoài') {
  if (!vanGuiDangMo()) throw new LoiVanGuiDong(lyDoVanDong(thaoTac));
}
