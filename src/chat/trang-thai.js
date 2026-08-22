// DỰNG `state` CHO BỘ NÃO TỪ BẢNG `hoi_thoai`, VÀ LƯU NGƯỢC (phiếu L2-M1 ②.3).
//
// Bản đang chạy giữ `state` ở HAI chỗ RAM khác nhau: `src/store.js` (Map theo psid, mất
// khi restart) và `conv-state.json` (bền, theo convId). v3 gom về MỘT chỗ: bảng
// `hoi_thoai` (UNIQUE(page_id, psid)), đã có sẵn 18.790 dòng di trú.
//
// ── BẢN ĐỒ CỘT ↔ TRƯỜNG state (khai MỘT CHỖ, đừng đoán lại ở chỗ khác) ──────────────
//   hoi_thoai.trang_thai      ↔ conv-state `state`  (GREET/QUALIFY/SELLING/CLOSING/
//                                HANDOFF/POST_SALE — CHECK ở tầng CSDL)
//   hoi_thoai.chu_so_huu      ↔ conv-state `owner`  (AI/SALE/BOTCAKE)
//   hoi_thoai.moc_luot_llm    ↔ conv-state `llmTurns` — MẢNG MỐC THỜI GIAN, không phải
//                                số đếm (lệch đề bài mà thợ L0-M1 đã đo và ghi §10 sổ).
//                                Đây là sổ ngân sách 24h của M11 (conv-state.js
//                                `noteLlmTurn`/`llmTurns24h`).
//   hoi_thoai.luot_llm        = moc_luot_llm.length — số để đọc nhanh, mốc để tính hạn.
//   hoi_thoai.luot_ai         ↔ MỌI lượt bot đã nói trong hội thoại (kể cả Fast Lane
//                                0 token) = `state.botTurns` của handler cũ.
//   hoi_thoai.ho_so           ↔ `prof` của src/context.js (M07, hồ sơ nén ~150 token)
//   hoi_thoai.ai_noi_gi/luc   ↔ `state.lastAiText` / lần AI nói gần nhất
//
// ⚠️ `state.aiTurns` của handler cũ và `hoi_thoai.luot_ai` KHÔNG phải một thứ. Trong
//    `src/fast-lane.js:262` tham số `aiTurns` được handler cũ truyền vào là
//    `Math.max(state.aiTurns, state.botTurns)` (handler.js:239) — tức "bot đã nói chưa",
//    không phải "đã tiêu bao nhiêu lượt đắt tiền". Ở v3 ta giữ đúng phân biệt đó:
//    `aiTurns` = số lượt GỌI MODEL trong 24h (đếm từ `moc_luot_llm`),
//    `botTurns` = `luot_ai`. Gộp hai cái này là cách rẻ nhất để ngân sách lượt trừ sai.
import { emptyProfile } from "../context.js";

export const CUA_SO_LUOT_MS = 24 * 3600 * 1000; // = conv-state.js TURN_WINDOW_MS

/** Số lượt gọi model còn trong cửa sổ 24h, đọc từ mảng mốc. */
export function luotLlm24h(mocLuotLlm, bayGio = Date.now()) {
  const arr = Array.isArray(mocLuotLlm) ? mocLuotLlm : [];
  const cat = bayGio - CUA_SO_LUOT_MS;
  return arr.filter((t) => Number(t) >= cat).length;
}

/** Ghi thêm MỘT mốc gọi model, cắt bớt mốc quá hạn (cùng luật conv-state.js:119). */
export function themMocLuot(mocLuotLlm, luc = Date.now()) {
  const arr = Array.isArray(mocLuotLlm) ? [...mocLuotLlm] : [];
  arr.push(luc);
  const cat = luc - CUA_SO_LUOT_MS;
  return arr.filter((t) => Number(t) >= cat).slice(-50);
}

/**
 * Dựng `state` mà `runCloser`/`fastLane`/`executeTool` của bộ não cũ đang mong đợi.
 * Danh sách trường dưới đây ĐO TỪ MÃ, không phải chép từ tài liệu:
 *   closer.js:18 `state.lastUsage` · :28 `state.messages` · :29 `state.pageId`/`custName`/`psid`
 *   tools.js:97 `state.pkConvId`/`pkCustId` · :146 `state.sentImages` · :155 `state.pendingImages`
 *          :166 `state.pendingCaption` · :171 `state.sentImageTurn` · :188 `state.closed`
 *          :191 `state.orderCreatedThisTurn` · :262 `state.handoff`/`handoffReason`
 *   fast-lane.js:262 `aiTurns`/`lastAiText`/`idleMs`/`usedLanes`
 */
export function dungState({ tin, hoiThoai, bayGio = Date.now() }) {
  const moc = Array.isArray(hoiThoai.moc_luot_llm) ? hoiThoai.moc_luot_llm : [];
  const aiNoiLuc = hoiThoai.ai_noi_luc
    ? new Date(hoiThoai.ai_noi_luc).getTime()
    : 0;
  return {
    // định danh — bộ não dùng để gọi Pancake/Messenger (ở v3 chỉ để LOG, mọi lượt
    // gửi đi qua cửa; xem handler-v3.js §"vì sao vẫn gán pkConvId")
    psid: String(tin.psid),
    pageId: String(tin.page_id),
    pkConvId: String(tin.conv_id),
    pkCustId: String(tin.cust_id || ""),
    // `hoi_thoai` KHÔNG có cột tên khách (đo db/schema.sql: tên người sống ở `khach.ten`,
    // và `khach_id` thì nullable). Bộ não chỉ dùng `custName` để IN LOG, nên lấy từ hồ sơ
    // nén đã di trú — thiếu thì để rỗng, cấm bịa một cái tên vào log.
    custName: String(hoiThoai.ho_so?.name || ""),

    // ngữ cảnh model
    messages: [],
    lastUsage: { tin: 0, tout: 0, cread: 0, cwrite: 0, calls: 0 },

    // bộ đếm lượt — xem ghi chú "aiTurns ≠ luot_ai" đầu file
    aiTurns: luotLlm24h(moc, bayGio),
    botTurns: Number(hoiThoai.luot_ai || 0),
    lastAiText: String(hoiThoai.ai_noi_gi || ""),
    idleMs: aiNoiLuc ? bayGio - aiNoiLuc : 0,
    fastLanesUsed: new Set(),

    // trạng thái lượt — reset ĐẦU MỖI LƯỢT, đúng như handler.js:144-154
    selfSent: 0,
    pendingImages: [],
    pendingCaption: "",
    sentImageTurn: false,
    sentImages: new Set(),
    orderCreatedThisTurn: false,
    // ⚠️ `closed` KHỞI TỪ FALSE MỖI LƯỢT, cố ý — nó là cờ "bộ não vừa chốt đơn TRONG
    // LƯỢT NÀY" (tools.js:188 đặt), không phải "hội thoại này đã từng chốt". Gieo nó
    // bằng `trang_thai === 'CLOSING'` thì mọi tin sau của một hội thoại đã chốt đều
    // đẻ thêm một sự kiện `order` trong Sổ AI ⇒ đếm đơn PHỒNG lên theo số tin, và
    // L3-M2 (lọc trùng chéo) đọc trên con số phồng đó.
    closed: false,
    // "Hội thoại này đã chốt TRƯỚC ĐÓ chưa" thì hỏi cột `trang_thai` — tách hẳn khỏi
    // `closed` để không ai lẫn hai câu hỏi. (Bộ não KHÔNG đọc trường này.)
    daChotTruoc:
      hoiThoai.trang_thai === "CLOSING" || hoiThoai.trang_thai === "POST_SALE",
    handoff: false,
    handoffReason: "",
  };
}

/**
 * Gom phần `hoi_thoai` phải ghi lại sau một lượt. Trả object cột→giá trị (chưa ghi).
 * Tách khỏi câu UPDATE để cổng nghiệm thu và test đọc được "lượt này định ghi gì".
 */
export function ganTuState({
  hoiThoai,
  state,
  prof,
  daGoiModel,
  daGuiText,
  textDaGui,
  bayGio = Date.now(),
}) {
  const mocCu = Array.isArray(hoiThoai.moc_luot_llm)
    ? hoiThoai.moc_luot_llm
    : [];
  const moc = daGoiModel ? themMocLuot(mocCu, bayGio) : mocCu;

  let trangThai = hoiThoai.trang_thai;
  let chuSoHuu = hoiThoai.chu_so_huu;
  if (state.handoff) {
    trangThai = "HANDOFF";
    chuSoHuu = "SALE";
  } else if (state.orderCreatedThisTurn || state.closed) {
    trangThai = "CLOSING";
    chuSoHuu = "SALE"; // §7.4: AI chốt xong thì sale tiếp quản (markClosing của bản cũ)
  } else if (daGuiText) {
    // Bot vừa nói mà chưa chốt/chưa bàn giao ⇒ đang bán. GREET chỉ đúng ở tin đầu.
    trangThai =
      hoiThoai.trang_thai === "GREET" ? "QUALIFY" : hoiThoai.trang_thai;
    chuSoHuu = "AI";
  }

  return {
    trang_thai: trangThai,
    chu_so_huu: chuSoHuu,
    trang_thai_truoc:
      trangThai !== hoiThoai.trang_thai
        ? hoiThoai.trang_thai
        : hoiThoai.trang_thai_truoc,
    ly_do_cuoi: state.handoff
      ? String(state.handoffReason || "")
      : hoiThoai.ly_do_cuoi,
    cham_luc: new Date(bayGio),
    ai_noi_luc: daGuiText ? new Date(bayGio) : hoiThoai.ai_noi_luc,
    ai_noi_gi: daGuiText
      ? String(textDaGui || "").slice(0, 2000)
      : hoiThoai.ai_noi_gi,
    chot_don_luc: state.orderCreatedThisTurn
      ? new Date(bayGio)
      : hoiThoai.chot_don_luc,
    nguoi_that_luc: state.handoff ? new Date(bayGio) : hoiThoai.nguoi_that_luc,
    moc_luot_llm: moc,
    luot_llm: moc.length,
    luot_ai: Number(hoiThoai.luot_ai || 0) + (daGuiText ? 1 : 0),
    ho_so: prof || emptyProfile(),
  };
}
