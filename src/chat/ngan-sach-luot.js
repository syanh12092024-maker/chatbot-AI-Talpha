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
//   · CHẤM ĐIỂM (chamVaTinhNganSach — từ RP2 handler gọi qua chamTheoLichSu) phải chạy SỚM — TRƯỚC lớp từ-khoá/Fast Lane — để
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
import { historyBeforeMessage, messageTime } from "./history.js";
import { CUA_SO_LUOT_MS } from "./trang-thai.js";

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
 * RP2 ② 2 — CHẤM ĐIỂM TRÊN LỊCH SỬ: cụm của lượt CỘNG mọi tin KHÁCH trong lịch sử kể từ mốc chấm trước, trong MỘT lần `scoreTurn`.
 * Handler gọi ở bước 3b thay cho `chamVaTinhNganSach(text, …)`. Hàm THUẦN (không DB/mạng).
 *
 * Vì sao: Botcake trả lời câu giá trong 5–8 s; bộ nạp chờ khách gõ xong ≥ 5 s rồi thấy page nói cuối và BỎ hội thoại
 * (`queue/nap.js` cửa `pageNoiCuoi`), worker cũng nhường trước handler (`queue/worker.js` nhánh `NHUONG_PAGE`) ⇒ «how much?» không
 * bao giờ thành cụm của một lượt bot (review (a) RP2 C2, mẫu 719 hội thoại: 248/282 hội thoại chạm 1 điểm là nhờ `price`).
 * Lượt bot KẾ TIẾP đọc lại lịch sử từ Pancake (`deps.lichSu` của worker) — câu đó nằm ở đó.
 *
 * Tin nào được chấm thêm (ngoài `text`):
 *   · CHỈ tin KHÁCH (`from.id ≠ page`) — chữ của page/Botcake/sale (giá, ship, ảnh, SĐT của page) KHÔNG chấm;
 *   · nằm TRƯỚC tin page cuối của `history` — tin khách SAU tin page cuối là phần đầu cụm hiện tại (cùng phép `nap.js#gomCumTinKhach`),
 *     đã nằm trong `text`; đếm hai lần thì «ok» + «ok» thành 3 chữ và luật tin cụt đổi;
 *   · giờ > mốc chấm trước VÀ > (tin mới nhất của lịch sử − 24 giờ). Chưa mốc ⇒ chỉ 24 giờ (không chấm SĐT/địa chỉ của đơn cũ); có mốc
 *     nhưng mốc cũ hơn 24 giờ cũng kẹp như vậy. Giờ Pancake KHÔNG múi giờ (`messageTime` hiểu theo giờ máy) ⇒ so GIỜ TIN với GIỜ TIN,
 *     không so với `Date.now()` — lệch múi giờ của máy triệt tiêu.
 *
 * MỐC (`lead.moc`, ms theo `messageTime`): `scoreTurn` trả object MỚI bỏ mọi khoá lạ ⇒ gắn lại SAU khi chấm. Mốc = giờ lớn nhất của
 * tin khách trong `history` và của chính tin đang xử (theo `msg_id`) — KHÔNG phủ tin khách gõ SAU tin đang xử (tin đó Botcake có thể
 * trả lời ⇒ không bao giờ vào hàng ⇒ lượt sau phải chấm được). Chấm lại cùng lịch sử ⇒ tin cũ ≤ mốc ⇒ điểm VÀ phạt tin cụt không đổi.
 * Không có giờ nào ⇒ không đẻ khoá `moc` (giữ mốc cũ nếu có). Tin không có giờ đọc được ⇒ không chấm thêm (chiều lành của ngân sách).
 * Lịch sử không chứa chính tin đang xử (theo `msg_id`) ⇒ chỉ chấm cụm như trước RP2, giữ mốc (xem thân hàm).
 *
 * @param {string} text  cụm tin khách của lượt (`tin.noi_dung`)
 * @param {object} prevLead  `hoi_thoai.diem_lead` (có thể mang `moc`)
 * @param {{lichSu?: object[], tin?: {page_id:string, msg_id?:string, tao_luc?:string, noi_dung?:string}}} nguon
 *        `lichSu` = tin Pancake worker vừa đọc (`deps.lichSu`) · `tin` = dòng `tin_cho_xu_ly` đang xử
 * @returns {{lead: object, budget: object}}
 */
export function chamTheoLichSu(text, prevLead = {}, { lichSu = [], tin = {} } = {}) {
  const ds = Array.isArray(lichSu) ? lichSu : [];
  // Không thấy CHÍNH tin đang xử trong lịch sử (id kênh khác id Pancake — đường webhook) ⇒ không biết ranh giới «trước tin này»:
  // `historyBeforeMessage` lùi về so giờ Pancake KHÔNG múi với `tao_luc` THẬT ⇒ lệch múi giờ máy, có thể lọt cả tin đến SAU (đếm đôi
  // cụm, mốc nuốt tin sau). Chiều lành: chỉ chấm cụm như trước RP2, giữ nguyên mốc (/code-review RP2 #3). Page pilot là `poll`.
  const mocTruoc = Number(prevLead?.moc) || 0;
  const tinNay = ds.find((m) => String(m?.id ?? m?.message_id ?? "") === String(tin.msg_id ?? ""));
  if (!tinNay) {
    const cu = chamVaTinhNganSach(String(text ?? ""), prevLead);
    return mocTruoc > 0 ? { ...cu, lead: { ...cu.lead, moc: mocTruoc } } : cu;
  }
  const laPage = (m) => String(m?.from?.id) === String(tin.page_id);
  const history = historyBeforeMessage(ds, tin);
  const moiNhat = ds.reduce((a, m) => Math.max(a, messageTime(m)), 0);
  const cat = Math.max(mocTruoc, moiNhat ? moiNhat - CUA_SO_LUOT_MS : 0);

  let cuoiPage = -1;
  for (let i = history.length - 1; i >= 0; i -= 1) if (laPage(history[i])) { cuoiPage = i; break; }
  const chuThem = history.slice(0, cuoiPage + 1)
    .filter((m) => !laPage(m) && messageTime(m) > cat)
    .map((m) => String(m?.original_message || m?.message || ""))
    // thông báo HỆ THỐNG Facebook Payments (`fb-pma://…invoice_id=<số dài>`) nằm phía khách — số hoá đơn thành «SĐT»; bỏ như
    // `nap.js#gomCumTinKhach` (`TIN_HE_THONG`, không export) · bóc thẻ HTML như `context.js#cleanHistory` (Pancake trả «<div></div>»)
    .filter((t) => !/fb-pma:\/\//i.test(t))
    .map((t) => t.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // MỘT lần scoreTurn trên cả lượt. Nối bằng «·» giữa hai dòng (không phải «\n» trơn): `PHONE_CAND` khớp qua khoảng trắng ⇒ «1200» và
  // «1500» ở hai tin thành 8 chữ số «SĐT»; `NAME_LABEL` khớp «I'm» cuối tin này + chữ đầu tin sau (/code-review RP2 #2). «·» không
  // phải chữ/số (luật tin cụt đếm chữ y như cũ) và là dấu tách dòng của `hasName`. Biên còn lại (nợ N-RP2-NOI-XUYEN-TIN): `hasAddress`
  // (khu vực ở tin này + chữ số ở tin khác) và dòng 2–4 chữ của tin khác bị coi là dòng TÊN khi cụm có SĐT.
  const { lead, budget } = chamVaTinhNganSach([...chuThem, String(text ?? "")].join("\n·\n"), prevLead);
  const moc = history.filter((m) => !laPage(m))
    .reduce((a, m) => Math.max(a, messageTime(m)), Math.max(mocTruoc, messageTime(tinNay)));
  return { lead: moc > 0 ? { ...lead, moc } : lead, budget };
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
