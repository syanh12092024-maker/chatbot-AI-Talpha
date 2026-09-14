// ═══════════════════════════════════════════════════════════════════════════════════
// LỚP CHẶN TRƯỚC MỌI CA — nạp bằng `--import` trong `npm test`, chạy TRƯỚC mọi tệp ca.
//
// ═══ VÌ SAO CÓ TỆP NÀY (đo 14/09/2026) ═════════════════════════════════════════════
// Lần đầu chạy `npm test` trên máy CÓ dữ liệu thật, `conv-state.json` bị GHI ĐÈ:
// 8.269.365 byte → 6.125.588. Tức bộ ca vừa xoá mất 2,1 MB trạng thái hội thoại thật.
// Ca D8 («CHỈ ĐỌC: kích thước + mtime của mọi tệp nguồn không đổi») bắt được, nhưng nó
// chỉ bắt SAU KHI hỏng — và chỉ đỏ khi chạy CẢ BỘ, nên chạy riêng tệp thì không thấy gì.
//
// Không ca nào gọi hàm ghi cả. `src/conv-state.js` ghi GIÁN TIẾP: 8 chỗ gọi `markDirty()`
// → `setTimeout(flush, 3000)`. Ca nào chạm trạng thái hội thoại là ghi, KỂ CẢ ca không
// biết mình đang ghi — nên bắt từng ca tự phòng là cách chắc chắn sót.
//
// Đây chính là món nợ §9 «bộ ca cũ GHI THẲNG vào conv-state.json thật», nay có SỐ ĐO.
//
// ⚠️ CHỈ CHẶN ĐƯỜNG GHI, KHÔNG LÀM MÙ ĐƯỜNG ĐỌC. Bộ di trú (`db/di-tru/nguon.js:62`) đọc
//    THẲNG `path.join(goc, "conv-state.json")`, không qua biến môi trường — nên 19 ca
//    D1–D11/Y4/D-Y9 vẫn đọc dữ liệu thật như thường. Chỉ ngòi bút bị đổi hướng.
//
// ⚠️ KHÔNG ĐÈ biến người gọi đã cố ý đặt: ca nào tự trỏ chỗ riêng (l2-m1, l5-ab) giữ nguyên.
// ═══════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TAM = fs.mkdtempSync(path.join(os.tmpdir(), "aicloser-ca-"));

// Mọi tệp mà bộ não GHI ra gốc repo. Thêm đường ghi mới thì thêm dòng ở đây.
const NGOI_BUT = {
  CONV_STATE_FILE: path.join(TAM, "conv-state.json"),
  ORDER_QUEUE_FILE: path.join(TAM, "ai-order-queue.json"),
  AI_LOG_FILE: path.join(TAM, "ai-messages.jsonl"),
};

const daDoi = [];
for (const [ten, duong] of Object.entries(NGOI_BUT)) {
  if (process.env[ten]) continue; // người gọi đã cố ý đặt — không đè
  process.env[ten] = duong;
  daDoi.push(ten);
}

// IM LẶNG mặc định: `node --test` chạy MỖI TỆP CA một tiến trình, nên in ở đây là in
// hơn ba mươi dòng giống hệt nhau, đủ để lấp mất bảng kết quả. Phép canh đã có sẵn và
// tốt hơn một dòng log: ca D8 so kích thước + mtime của mọi tệp nguồn sau lượt di trú —
// lớp chặn này hỏng thì D8 đỏ. Muốn thấy đường tạm thì đặt `CA_AN_TOAN_NOI=1`.
if (daDoi.length && process.env.CA_AN_TOAN_NOI === "1") {
  console.log(`[an-toàn] đổi hướng ghi sang ${TAM} — ${daDoi.join(", ")}`);
}
