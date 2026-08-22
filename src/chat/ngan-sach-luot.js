// M11 v3 · NGÂN SÁCH LƯỢT THEO ĐỘ NÓNG — thay trần 4 lượt cứng (phiếu L2-M3 ②.2,
// 02-KE-HOACH-CODE.md §L2 "Bỏ trần 4 lượt cứng, thay bằng ngân sách theo độ nóng").
//
// PORT đúng cơ chế M11 của `src/handler.js` cũ (hàm `updateLead`/`checkBudget`,
// dòng 223-225 và 362-409) sang v3 — ĐỌC-QUA-IMPORT `lead-score.js` (CẤM SỬA file đó,
// ⛔ pathspec ③ phiếu L2-M3). Không có "trần cứng" mới nào ở đây: `turnBudget()` của
// lead-score.js ĐÃ tự kẹp `Math.min(HARD_MAX_TURNS, base+bonus)` — HARD_MAX_TURNS=12 vẫn
// là trần trần, không viết lại.
//
// KHÁC bản cũ ở CHỖ LƯU điểm: bản cũ giữ `lead` bền trong conv-state.json (RAM-side JSON,
// đọc/ghi qua getConv/touchConv). v3 giữ trong `hoi_thoai.diem_lead` (jsonb) + `diem_nong`
// (int, cột lọc nhanh) — HAI CỘT NÀY ĐÃ CÓ SẴN từ migration 001_nen (dòng 162-163) nhưng
// CHƯA từng được cửa ghi nào cho phép (đúng khớp đứt skill tho-thi-cong: "bảng có reader
// mà không ai ghi"). Phiếu này nối nó — xem `src/chat/kho.js` (COT_CHO_PHEP đã thêm 2 cột).
//
// `used` truyền vào `conNganSach` — GIỐNG HỆT khái niệm `llmTurns24h(convId)` của bản cũ:
// số lượt GỌI MODEL trong cửa sổ 24h. Ở v3 giá trị này đã có sẵn tại `state.aiTurns`
// (trang-thai.js#dungState, đếm từ `hoi_thoai.moc_luot_llm`) — KHÔNG phải `luot_ai`/
// `botTurns` (đó là MỌI lượt bot nói kể cả Fast Lane 0 token — gộp hai cái là cách rẻ nhất
// làm ngân sách trừ sai, xem cảnh báo ở đầu trang-thai.js).
//
// VỊ TRÍ GỌI trong handler (quan trọng, xem handler.js:223-225 + comment tại chỗ gọi):
//   · CHẤM ĐIỂM (chamVaTinhNganSach) phải chạy SỚM — TRƯỚC lớp từ-khoá/Fast Lane — để
//     chuỗi tin cụt ("ok","hm") vẫn bị trừ điểm đúng luật (spec M11: 2 tin cụt liên tiếp
//     không mang tín hiệu mới thì −1 điểm). Chấm SAU khi Fast Lane đã lọc bớt tin sẽ làm
//     "stub streak" không bao giờ đếm được với những khách mà Fast Lane lo trọn (33-42%
//     lượt theo đo đạc cũ).
//   · GÁC CỬA (conNganSach) chạy MUỘN — SAU classify, NGAY TRƯỚC khi gọi model thật — vì
//     lớp từ-khoá/Fast Lane/classify đều 0 token, không có lý do chặn chúng.
//
// ⚠️ GIẢ ĐỊNH GHI RÕ (luật 11 skill tho-thi-cong — cấm giả định thầm lặng): bản cũ cộng
// +2 điểm cho tín hiệu "quay lại sau khi nguội" (`backFromCold`), đọc từ trạng thái
// conv-state `S.COLD`. `hoi_thoai.trang_thai` của v3 KHÔNG có nhãn COLD trong CHECK
// (chỉ GREET/QUALIFY/SELLING/CLOSING/HANDOFF/POST_SALE — luoc-do-v1.md, migration 001).
// Phiếu này KHÔNG bịa thêm một trạng thái COLD mới ngoài phạm vi — `backFromCold` ở v3
// luôn `false`. Hệ quả: nhóm khách quay lại sau khi im lâu mất đúng tín hiệu +2 điểm này
// so với bản cũ (ảnh hưởng nhỏ — 1 trong 12 tín hiệu của bảng điểm), không ảnh hưởng các
// tín hiệu còn lại. Đủ dữ liệu để tính đúng thì mở phiếu riêng thêm nhãn COLD.
import { scoreTurn, turnBudget, TIER_LABEL } from "../lead-score.js";

/**
 * Cộng điểm cho lượt khách vừa nhắn + tính ngân sách lượt còn lại. Hàm THUẦN — không đọc
 * DB/mạng, không có side effect (khớp lối test đơn vị của l2-m2/lop-tu-khoa.js).
 *
 * @param {string} text        tin khách của lượt này (đã gộp cụm, TRƯỚC khi cleanText)
 * @param {{signals?:string[], penalty?:number, stubStreak?:number, score?:number}} prevLead
 *        hồ sơ điểm trước đó — đọc từ `hoi_thoai.diem_lead` (rỗng `{}` cho hội thoại mới)
 * @returns {{lead: object, budget: {max:number, tier:string, base:number, bonus:number, priority:boolean}}}
 */
export function chamVaTinhNganSach(text, prevLead = {}) {
  const lead = scoreTurn(text, prevLead, { backFromCold: false });
  const budget = turnBudget(lead);
  return { lead, budget };
}

/**
 * Còn ngân sách để GỌI MODEL không? Trả lời KHÔNG IM — luôn kèm lý do tiếng người để
 * `so_ai`/hàng chờ sale đọc được ngay, đúng khuôn `checkBudget` của bản cũ.
 *
 * @param {{max:number, tier:string, priority:boolean}} budget  từ chamVaTinhNganSach()
 * @param {number} used   số lượt ĐÃ gọi model trong 24h — dùng `state.aiTurns`, KHÔNG dùng
 *                        `state.botTurns`/`luot_ai` (xem ghi chú đầu file)
 * @returns {{ok:boolean, lyDo?:string}}
 */
export function conNganSach(budget, used) {
  const max = Number(budget?.max || 0);
  if (Number(used || 0) >= max) {
    const tier = TIER_LABEL[budget.tier] || budget.tier || "?";
    const pri = budget.priority
      ? "🔴 ƯU TIÊN (khách đã cho SĐT + địa chỉ) — "
      : "";
    return {
      ok: false,
      lyDo: `${pri}AI đã dùng hết ngân sách ${max} lượt/24h (khách ${tier}) — khách còn do dự, cần người vào chốt`,
    };
  }
  return { ok: true };
}
