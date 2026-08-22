// BỘ NẠP — đọc tin mới QUA CỬA Messenger v3 rồi XẾP vào hàng đợi (phiếu L2-M1 ②.2a).
//
// Nguyên tắc của 02 §L2: **poll chỉ NẠP, worker mới XỬ LÝ**. File này KHÔNG gọi model,
// KHÔNG gửi gì cho khách — nó chỉ biến "có tin mới trên Pancake" thành "có dòng trong
// `tin_cho_xu_ly`". Đổi nguồn tin từ POLL sang WEBHOOK sau này (điểm kiểm H2, §8 sổ) chỉ
// phải viết lại file này; `worker.js` không đụng tới.
//
// ══ TẦNG NGUỒN FAIL-CLOSED (N1a) — vì sao cái van nằm ở ĐÂY ═════════════════════════
// Bộ não cũ còn BỐN lượt gửi đi thẳng ra Pancake từ trong lòng `executeTool`
// (tools.js:197/266/271 + order-bridge.js:255 — xem đầu `src/chat/handler-v3.js`). Cửa
// v3 không bịt được chúng vì `tools.js` là file CẤM SỬA. Cách chặn duy nhất còn lại mà
// không sửa file cấm là chặn Ở NGUỒN: máy dev có `PANCAKE_READONLY=1` (luật 1 §0a sổ
// điều hành) ⇒ KHÔNG tin thật nào được vào hàng đợi ⇒ `executeTool` không bao giờ chạy
// trên một hội thoại thật ở máy cá nhân.
//
// `V3_NAP_DEV=1` là lối mở CÓ KIỂM SOÁT cho harness test (bảng biến `bien-moi-truong-v3.md`
// — VPS KHÔNG đặt biến này vì VPS không READONLY). Đặt nó ngoài harness là tự tay gỡ van.
//
// ⚠️ Cửa ĐỌC (`docHoiThoai`/`docTin`) KHÔNG bị guard `V3_PANCAKE_GUI` chặn (cua-messenger
//    §4 — guard chỉ áp nhóm GỬI/GHI). Nên nếu không có van ở đây thì máy dev vẫn nạp
//    được tin thật vào hàng đợi và worker sẽ chạy bộ não trên chúng.
import {
  docHoiThoai as cuaDocHoiThoai,
  docTin as cuaDocTin,
} from "../channels/messenger/index.js";
import { ctxHeThong } from "../db/index.js";
import { baoDamHoiThoai } from "../chat/kho.js";
import { xepTin } from "./kho.js";

/** Van nguồn đọc env TƯƠI mỗi lượt (cùng khuôn `cuaDangMo()` của cửa Messenger). */
export function nguonDangMo() {
  return process.env.PANCAKE_READONLY !== "1" || process.env.V3_NAP_DEV === "1";
}

export function lyDoNguonDong() {
  return (
    `Bộ NẠP ĐÓNG: PANCAKE_READONLY=${JSON.stringify(process.env.PANCAKE_READONLY)} ` +
    `và V3_NAP_DEV=${JSON.stringify(process.env.V3_NAP_DEV)}. Máy READONLY chỉ nạp khi ` +
    `V3_NAP_DEV==='1' (chỉ dùng trong harness test — xem docs/v3/ban-giao/bien-moi-truong-v3.md).`
  );
}

/**
 * Gom cụm tin MỚI của khách ở cuối hội thoại — dừng ở tin gần nhất của PAGE.
 * Cùng luật với `src/pancake-poll.js:400-409` (đo lại 22/08), giữ nguyên để tin mà
 * bộ não nhìn thấy ở v3 giống hệt v2: khách nhắn 3 dòng liền là MỘT lượt, không phải ba.
 * @returns {{text: string, msgId: string}|null}
 */
export function gomCumTinKhach(msgs, pageId) {
  const arr = Array.isArray(msgs) ? msgs : [];
  const cum = [];
  let msgId = "";
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (String(m?.from?.id) === String(pageId)) break;
    const tx = String(m?.original_message || m?.message || "").trim();
    if (!msgId) msgId = String(m?.id ?? m?.message_id ?? "");
    if (tx) cum.unshift(tx);
  }
  const text = cum.join("\n");
  if (!text || !msgId) return null;
  return { text, msgId };
}

/**
 * Nạp tin mới của MỘT page vào hàng đợi.
 *
 * @returns {Promise<{mo: boolean, lyDo: string, hoiThoai: number, them: number, trung: number, boQua: number}>}
 *   `them`  — số dòng THẬT SỰ được xếp thêm
 *   `trung` — số lượt bị UNIQUE chặn (vòng poll trước đã xếp rồi) — con số này CÀNG CAO
 *             càng tốt ở chế độ chạy đều, nó là bằng chứng chống-trùng đang làm việc.
 */
export async function napTuPoll(pool, { pageId }, deps = {}) {
  const ket = { mo: true, lyDo: "", hoiThoai: 0, them: 0, trung: 0, boQua: 0 };
  if (!nguonDangMo()) {
    return { ...ket, mo: false, lyDo: lyDoNguonDong() };
  }

  const docHT = deps.docHoiThoai || cuaDocHoiThoai;
  const docT = deps.docTin || cuaDocTin;
  const depsPk = deps.depsPancake || {};
  const ctx = ctxHeThong();

  // Team + id nội bộ của page. Cửa Messenger tra đúng việc này bên trong nhưng KHÔNG
  // trả ra (nó chỉ trả dữ liệu Pancake), nên nạp phải tra lại — cùng tiền lệ "bootstrap
  // team TRƯỚC KHI có ctx" của `thanh_vien_team` (luoc-do-v1.md §6). Chỉ đọc ĐÚNG một
  // dòng theo khoá tự nhiên, không liệt kê rộng.
  const rp = await pool.query(
    "SELECT id, team_id FROM page WHERE page_id = $1",
    [String(pageId)],
  );
  if (!rp.rowCount) {
    return {
      ...ket,
      mo: true,
      lyDo: `page_id=${pageId} không có trong sổ cái page`,
    };
  }
  const { id: pageRowId, team_id: teamId } = rp.rows[0];

  const convs = (await docHT(pool, ctx, { pageId }, depsPk)) || [];
  for (const c of convs) {
    // `psid` (from_psid) và `convId` (c.id) là HAI giá trị khác nhau — cua-messenger §2.
    const psid = c?.from_psid;
    const convId = c?.id;
    const custId = (c?.customers || [])[0]?.id ?? "";
    if (!psid || !convId) {
      ket.boQua += 1;
      continue;
    }
    ket.hoiThoai += 1;

    // Dòng `hoi_thoai` phải có TRƯỚC khi gọi cửa với `psid` (cua-messenger §2 "Hệ quả
    // bắt buộc") — cửa không tự tạo hộ, và không có dòng thì N5 chặn đúng mọi hội thoại
    // MỚI, tức bot câm với chính khách nhắn lần đầu.
    await baoDamHoiThoai(pool, { teamId, pageRowId, psid });

    const msgs =
      (await docT(pool, ctx, { pageId, psid, convId, custId }, depsPk)) || [];
    const cum = gomCumTinKhach(msgs, pageId);
    if (!cum) {
      ket.boQua += 1; // tin cuối là của page (bot/sale vừa nói) → không có việc gì
      continue;
    }
    const r = await xepTin(pool, {
      teamId,
      pageId,
      psid,
      convId,
      custId,
      msgId: cum.msgId,
      noiDung: cum.text,
    });
    if (r.them) ket.them += 1;
    else ket.trung += 1;
  }
  return ket;
}
