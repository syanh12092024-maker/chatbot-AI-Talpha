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
import fs from "node:fs";
import path from "node:path";
import { GOC } from "../../db/ket-noi.js";

/**
 * Đọc biến env theo ĐƯỜNG TUYỆT ĐỐI: `process.env` trước, vắng thì tra `<GOC>/.env`
 * (cùng nguồn `db/ket-noi.js#docEnv` dùng để nối CSDL — chép 8 dòng vì hàm đó không
 * export, nợ §9). Refute F2 biến thể 2: `cd <nơi khác> && node <repo>/src/queue/...` ⇒
 * dotenv không nạp `.env` (tra theo cwd) ⇒ `PANCAKE_READONLY` vắng ⇒ mọi van đọc
 * `process.env` trần đều MỞ, trong khi đường tới CSDL thật vẫn nối được. Van phải đọc
 * cùng nguồn với đường tới dữ liệu. `handler-v3.js` (cổng HTTP ghi) cũng dùng hàm này.
 */
export function docEnvTuyetDoi(ten) {
  if (process.env[ten] != null) return process.env[ten];
  try {
    const raw = fs.readFileSync(path.join(GOC, ".env"), "utf8");
    for (const dong of raw.split("\n")) {
      const m = dong.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
      if (m && m[1] === ten) return m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* không có .env ⇒ coi như thiếu biến */
  }
  return undefined;
}

/**
 * CSDL đang trỏ có phải sandbox CỤC BỘ không — host của `DATABASE_URL_V3` (đọc CÙNG
 * NGUỒN với `db/ket-noi.js`: process.env rồi `.env` tuyệt đối) là localhost/127.0.0.1/::1.
 * VA-R1 · RF-2: `V3_NAP_DEV=1` chỉ được mở van khi KHÔNG nối CSDL thật (máy chủ
 * 169.58.33.8 hay bất kỳ host xa nào). Chốt theo HOST, không theo tên DB: harness
 * (`l2-m1.sh ③b`, S4b) chạy trên `aicloser_v3` localhost vẫn phải mở được.
 * Không parse được ⇒ `false` (mù ⇒ ĐÓNG).
 */
export function dbLaSandboxCucBo(url = docEnvTuyetDoi("DATABASE_URL_V3")) {
  try {
    const h = new URL(String(url || "")).hostname.toLowerCase();
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(h);
  } catch {
    return false;
  }
}

/**
 * Van nguồn — đọc env TƯƠI mỗi lượt. `PANCAKE_READONLY` đọc theo ĐƯỜNG TUYỆT ĐỐI
 * (`docEnvTuyetDoi`): refute F2 biến thể 2 — `cd <nơi khác> && node <repo>/src/queue/nap.js`
 * làm dotenv không nạp `.env`, biến vắng ⇒ bản cũ đọc thành MỞ trong khi `db/ket-noi.js`
 * vẫn nối được CSDL thật. Luật (CHỐT MỘT hành vi):
 *   · READONLY ≠ '1'  ⇒ MỞ (máy chủ);
 *   · READONLY = '1'  ⇒ ĐÓNG, trừ khi `V3_NAP_DEV==='1'` VÀ CSDL là sandbox cục bộ.
 */
export function nguonDangMo() {
  if (docEnvTuyetDoi("PANCAKE_READONLY") !== "1") return true;
  return process.env.V3_NAP_DEV === "1" && dbLaSandboxCucBo();
}

export function lyDoNguonDong() {
  const db = (() => {
    try {
      return new URL(String(docEnvTuyetDoi("DATABASE_URL_V3") || "")).host;
    } catch {
      return "(không đọc được)";
    }
  })();
  return (
    `Bộ NẠP ĐÓNG: PANCAKE_READONLY=${JSON.stringify(docEnvTuyetDoi("PANCAKE_READONLY"))} ` +
    `(đọc .env tuyệt đối) và V3_NAP_DEV=${JSON.stringify(process.env.V3_NAP_DEV)} · CSDL=${db} ` +
    `(sandbox cục bộ: ${dbLaSandboxCucBo()}). Máy READONLY chỉ nạp khi V3_NAP_DEV==='1' VÀ ` +
    `CSDL trỏ localhost (harness test — xem docs/v3/ban-giao/bien-moi-truong-v3.md).`
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
