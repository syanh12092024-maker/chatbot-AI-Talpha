import { nhanDienSale } from '../chat/human.js';
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
import { debounceFor } from "../turn-complete.js";
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
// Thông báo HỆ THỐNG của Facebook, nằm lẫn trong luồng tin của khách. `fb-pma://` là
// đường dẫn sâu của Facebook Payments — chỉ xuất hiện trong tin do Facebook tự sinh,
// không người nào gõ ra chuỗi đó. Đo vòng chạy thật 21/09: một cụm gồm thông báo này
// CỘNG hai câu thật của khách ("The order said my friend she want cancel"…), nên phải
// bỏ ĐÚNG DÒNG thông báo, bỏ cả cụm là nuốt mất câu của người thật.
const TIN_HE_THONG = /fb-pma:\/\//i;

/**
 * Gom cụm tin MỚI của khách ở cuối hội thoại — dừng ở tin gần nhất của PAGE.
 *
 * Bỏ trước khi vào hàng đợi (đo vòng chạy thật 21/09, mỗi thứ là một lượt gọi model
 * trả tiền thật mà không có gì để trả lời):
 *   · thẻ HTML rỗng — `"<div></div>"` là tin THẬT Pancake trả về, bóc thẻ xong còn chuỗi
 *     rỗng. Bóc bằng đúng phép của `context.js#cleanHistory`, không đẻ luật thứ hai.
 *   · thông báo hệ thống Facebook — xem `TIN_HE_THONG` ngay trên.
 *
 * `msgId` vẫn lấy ở tin MỚI NHẤT kể cả khi tin đó bị bỏ: nó là khoá chống trùng, phải
 * tiến đều, nếu không một thông báo hệ thống mới sẽ kéo cả cụm cũ vào lại.
 */
export function gomCumTinKhach(msgs, pageId) {
  const arr = Array.isArray(msgs) ? msgs : [];
  const cum = [];
  let msgId = "";
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (String(m?.from?.id) === String(pageId)) break;
    if (!msgId) msgId = String(m?.id ?? m?.message_id ?? "");
    const tho = String(m?.original_message || m?.message || "");
    if (TIN_HE_THONG.test(tho)) continue;
    const tx = tho.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (tx) cum.unshift(tx);
  }
  const text = cum.join("\n");
  if (!text || !msgId) return null;
  return { text, msgId };
}

// ── LỌC THEO MỐC — vì sao cái này là điều kiện của lời hứa «trả lời trong 1-2 phút» ──
//
// Bản trước gọi `docTin` cho MỌI hội thoại, mỗi vòng. Đo thật 17/09 trên page
// 1220547807799752: danh sách trả 60 hội thoại, `GET /conversations` 225ms,
// `GET /messages` 166ms mỗi hội thoại ⇒ **10,2 giây cho MỘT page, một vòng** — và
// `chay-worker.js` duyệt page TUẦN TỰ. Chu kỳ = số page × 10,2s:
//
//     1 page → 10s ✅   ·   12 page → 2,0 phút ❌   ·   51 page → 8,7 phút ❌
//
// Tức khách nhắn vào page thứ 12 trở đi thì bot không kịp thấy trong hai phút, dù mọi
// tầng phía sau đều nhanh. Cái chặn không phải model, không phải hàng đợi — là chỗ này.
//
// `pancake-poll.js:283` của v1 đã làm đúng từ lâu (`if (seen.get(c.id) === mark) continue`)
// và nó nằm TRƯỚC lời gọi lấy tin. Chép đúng luật đó sang đây: cùng khoá mốc
// (`last_customer_interactive_at`, lùi về `updated_at`), cùng cách dọn bộ nhớ.
//
// AN TOÀN KHI MẤT BỘ NHỚ: đây thuần tuý là bộ đệm tăng tốc. Khởi động lại thì vòng đầu
// quét đủ như cũ, và `xepTin` có `UNIQUE (page_id, conv_id, msg_id) ON CONFLICT DO NOTHING`
// chặn mọi dòng trùng — không lượt trả lời nào bị nhân đôi. Khác v1: mốc RỖNG thì KHÔNG
// ghi nhớ (v1 ghi '' rồi lần sau `'' === ''` là bỏ qua vĩnh viễn hội thoại đó).
const mocDaXu = new Map(); // `${pageId}:${convId}` -> mốc đã nạp xong

// ── LỌC TỪ DANH SÁCH — trả lời đúng thứ ĐANG CẦN trả lời ────────────────────────────
//
// `GET /conversations` trả sẵn ba tín hiệu mà trước nay bị bỏ không dùng: `last_sent_by`,
// `unread_count`, `seen`. Dùng chúng thì biết hội thoại nào CÓ VIỆC mà không tốn một lời
// gọi `GET /messages` nào.
//
// ĐO THẬT 17/09 trên page 1220547807799752 (60 hội thoại trong danh sách):
//
//   ① khách nói CUỐI (`last_sent_by.id` ≠ page) ......... 8/60
//   ② chưa ai đọc    (`unread_count` > 0) ............... 2/60
//   ①+② cả hai ......................................... 1/60
//
// ⇒ ① là cửa đáng giá: 60 → 8. Và nó THUẦN LOGIC — page vừa nói xong thì không có lượt
//   nào để trả lời, đúng bằng thứ `gomCumTinKhach` vẫn kết luận, chỉ là biết sớm hơn một
//   lời gọi API.
//
// ⚠️ ② thì KHÔNG bật mặc định, dù nghe rất hợp lý. Bảy hội thoại bị ② loại ra là:
//       "How much" · "How much" · "How much?it is legit" · "Send me WhatsApp" ·
//       "Wow nice" · "Because he already told you…" · "Wag kayo magpaloko jan…"
//   — tất cả đều là khách hỏi và CHƯA AI TRẢ LỜI. Chúng `unread_count = 0` chỉ vì nhân
//   viên đã MỞ hội thoại ra xem (`recent_seen_users`: Thu Hiền 10:08, Nguyễn Duyên 08:49,
//   Từ Trang 08:37…). Trong Pancake `seen` = ĐÃ MỞ, không phải ĐÃ TRẢ LỜI. Bật ② khi tổ
//   sale để sẵn hộp thư là bot câm với 7/8 câu hỏi sống.
//
//   Muốn dùng ② thì bật `V3_NAP_CHI_CHUA_DOC=1` — và nhìn số `boQuaDaDoc` trong log
//   trước, nó nói đúng bao nhiêu câu hỏi đang bị bỏ.
const CHI_CHUA_DOC = () => docEnvTuyetDoi("V3_NAP_CHI_CHUA_DOC") === "1";

// ── CHỜ KHÁCH GÕ XONG (debounce) ────────────────────────────────────────────────────
//
// Không có cửa này thì một cụm tin bị cắt làm nhiều lượt trả lời: khách gõ "Good morning"
// → vòng poll thấy, xếp `msg_id=m1`, bot trả lời; 6 giây sau khách gõ tiếp "how much" →
// `msg_id=m2` → DÒNG MỚI → lượt trả lời thứ hai. `UNIQUE (page_id, conv_id, msg_id)` không
// cứu được vì đây là hai tin khác nhau thật.
//
// Đo thật trên chính page này: **30,2% cụm có ≥2 tin, p50 cách nhau 18 giây** — tức phần
// lớn cụm nhiều tin sẽ bị cắt đôi.
//
// Chờ BAO LÂU thì hỏi `turn-complete.js#debounceFor` — cùng bộ phân loại `pancake-poll.js`
// đang dùng, không đẻ bản thứ hai. Nó đọc tin CUỐI (`snippet`, có sẵn trong danh sách nên
// không tốn lời gọi nào) rồi phán "trọn ý chưa": trọn ý → 5s, còn dở → 15s. Chờ cào bằng
// 20s thì vừa chen ngang 45% cụm dở, vừa bắt 70% người đã nói xong ngồi đợi.
//
// Đồng hồ là ĐỒNG HỒ SERVER, không phải mốc của Pancake: mốc Pancake không kèm múi giờ,
// `Date.parse` hiểu lệch nhiều giờ (lý do y hệt `pancake-poll.js:181`).
const choGoXong = new Map(); // `${pageId}:${convId}` -> { moc, thayLuc }

// ── ĐỂ BOTCAKE NÓI TRƯỚC ────────────────────────────────────────────────────────────
//
// Chạy SONG SONG với Botcake: AI chỉ vào khi Botcake đã im. Mốc im bao lâu thì ĐO, đừng
// đoán. Đo 21/09 trên page 1220547807799752 — 118 lượt "khách nhắn → page trả lời", tách
// theo ai trả lời:
//
//   Botcake       n=34 │ p50   5s · p90    7s · max      8s   ← máy, bắn theo từ khoá
//   AI LEADER     n=16 │ p50  32s · p90  258s · max    293s   ← một bot AI KHÁC, đã có sẵn
//   Public API    n= 9 │ p50  30s · p90  116s
//   người (sale)  n=33 │ p50 141s … vài giờ
//
// Botcake là máy khớp từ khoá: nó trả lời trong **8 giây hoặc không bao giờ** — 34/34 lượt
// đều ≤8s. Nên mốc im 10 giây là đủ phủ 100% số đo, cộng 2 giây đệm cho lệch đồng hồ và
// độ trễ Pancake ghi nhận.
//
// KHÔNG lấy mốc của v1 (`AI_WAIT_MS` 20–28s): v1 đặt mốc đó khi chưa đo tách theo bot, nên
// nó phải phủ cả sale. Chờ 28s để né một con bot luôn xong trong 8s là bắt khách thật ngồi
// đợi thêm 20 giây không vì gì cả.
//
// CÁCH HOÃN: không ngủ. Xếp tin với `thu_lai_luc = now() + mốc`, câu rút của worker đã có
// `AND thu_lai_luc <= now()`. Không giữ kết nối, không giữ khoá hội thoại, không tốn lời
// gọi API nào. Tới lượt rút, cửa ④ trong `worker.js` mới kiểm "page đã nói chưa" — và nó
// dùng lịch sử worker vốn đã đọc, cũng không tốn gì thêm.
//
// Mốc đo trên MỘT page. Page khác cấu hình Botcake khác thì đo lại rồi chỉnh bằng
// `V3_NAP_IM_BOTCAKE_MS`; đặt 0 là tắt hẳn cửa này.
// ── THẺ CHẶN — hội thoại đã xong việc thì đừng quét ─────────────────────────────────
//
// Đo 21/09 trên page 1220547807799752 (60 hội thoại gần nhất): thẻ **"Đã gửi" (id 3) gắn
// trên 11 hội thoại**, cộng thẻ hệ thống `-2 shipped` trên 6 hội thoại nữa. Đó là những
// khách đã chốt đơn và hàng đã đi — bot trả lời tiếp chỉ làm phiền, và mỗi lượt vẫn tốn
// tiền như thường.
//
// TÊN thẻ chứ không phải ID: mỗi page một bộ thẻ riêng, "Đã gửi" ở page này là id 3, page
// khác là số khác. `pkTagId` tra tên → id từ `/settings` và cache 10 phút, nên cửa này
// KHÔNG thêm lời gọi API nào vào vòng poll.
//
// Thẻ HỆ THỐNG của Pancake luôn chặn, không cần khai: chúng là `-(mã trạng thái đơn)` và
// giống nhau ở mọi page. Danh sách chép từ `conv-owner.js#ORDER_STOP_TAGS` của đường v1 —
// cùng một luật «đơn đã xử lý ⇒ AI im», hai đường không được nói khác nhau.
//   -1 submitted · -2 shipped · -3 delivered · -11 waitting · -12 wait_print · -20 ordered
const THE_HE_THONG = new Set([-1, -2, -3, -11, -12, -20]);

/** Tên thẻ (do người đặt) khiến bot bỏ qua hội thoại. Nhiều tên ngăn bằng dấu phẩy. */
const TEN_THE_CHAN = () => {
  const v = docEnvTuyetDoi("V3_NAP_THE_CHAN");
  return String(v == null || v === "" ? "Đã gửi" : v)
    .split(",").map((x) => x.trim()).filter(Boolean);
};

/** Tập id thẻ chặn của MỘT page = thẻ hệ thống + thẻ theo tên đã tra được. */
async function idTheChan(pageId, traThe) {
  const ra = new Set(THE_HE_THONG);
  for (const ten of TEN_THE_CHAN()) {
    try {
      const id = await traThe(pageId, ten);
      if (id != null) ra.add(Number(id));
    } catch { /* tra thẻ hỏng KHÔNG được chặn vòng nạp — thà quét thừa */ }
  }
  return ra;
}

const IM_BOTCAKE_MS = () => {
  const v = docEnvTuyetDoi("V3_NAP_IM_BOTCAKE_MS");
  return v === "" || v == null ? 10000 : Number(v);
};

/** Xoá bộ đệm chờ-gõ-xong. Chỉ dùng cho bộ ca. */
export function quenChoGo() { choGoXong.clear(); }

/**
 * Page (bot/sale/POS) có phải người nói CUỐI không?
 * Khách  → `{id, name}`.  Page → `{admin_id, admin_name, id, app_id, bot_id, flow_id}`.
 * Thiếu trường (0/60 hội thoại đo được, nhưng vẫn phải phòng) → trả `false`: thà quét thừa
 * còn hơn câm với một người thật.
 */
const moc0 = (c) => String(c?.last_customer_interactive_at || c?.updated_at || "");

export function pageNoiCuoi(conv, pageId) {
  const l = conv?.last_sent_by;
  if (!l || typeof l !== "object") return false;
  const ai = String(l.admin_id ?? l.id ?? "");
  return !!ai && ai === String(pageId);
}

/** Dọn bộ đệm mốc — chống phình RAM sau nhiều tuần chạy (cùng ngưỡng `pancake-poll.js`). */
function donMoc() {
  for (const m of [mocDaXu, choGoXong]) {
    if (m.size <= 8000) continue;
    let n = m.size - 6000;
    for (const k of m.keys()) { m.delete(k); if (--n <= 0) break; }
  }
}

/** Xoá bộ đệm mốc. Chỉ dùng cho bộ ca — để ca này không ăn mốc của ca trước. */
export function quenMoc() { mocDaXu.clear(); }

/**
 * Nạp tin mới của MỘT page vào hàng đợi.
 *
 * @returns {Promise<{mo: boolean, lyDo: string, hoiThoai: number, them: number, trung: number, boQua: number}>}
 *   `them`  — số dòng THẬT SỰ được xếp thêm
 *   `trung` — số lượt bị UNIQUE chặn (vòng poll trước đã xếp rồi) — con số này CÀNG CAO
 *             càng tốt ở chế độ chạy đều, nó là bằng chứng chống-trùng đang làm việc.
 */
/* ═══ DẤU VẾT CỦA TIN BỊ LỌC (migration 023) ════════════════════════════════════════
 *
 * Năm cửa lọc loại phần lớn hội thoại mỗi vòng — một vòng thật: 57/57 bị loại. Con số đó
 * trước nay chỉ có trong stdout, nên một cửa bắt OAN là khách im lặng không ai biết.
 *
 * GHI GỘP MỘT LƯỢT mỗi vòng, không phải mỗi hội thoại: 57 câu `INSERT` mỗi 6 giây là
 * 34.000 lượt ghi/giờ cho MỘT page. Một câu nhiều dòng + `ON CONFLICT` cộng dồn thì bảng
 * chỉ lớn bằng SỐ HỘI THOẠI, và vòng quay không làm nó phình.
 *
 * Lỗi ở đây KHÔNG được làm hỏng vòng nạp: đây là sổ quan sát, không phải đường đi của
 * tin. Ghi hỏng thì mất dấu vết một vòng — chặn vòng nạp thì mất khách.
 */
async function ghiBoQua(pool, teamId, pageId, ds) {
  if (!ds.length) return;
  const gt = [], th = [];
  ds.forEach((x, i) => {
    const n = i * 5;
    gt.push(`($1, $2, $${n + 3}, $${n + 4}, $${n + 5}, $${n + 6}, $${n + 7})`);
    th.push(String(x.convId), String(x.psid || ""), x.lyDo, String(x.chuThich || "").slice(0, 200), new Date());
  });
  try {
    await pool.query(
      `INSERT INTO nap_bo_qua (team_id, page_id, conv_id, psid, ly_do, chu_thich, lan_cuoi)
       VALUES ${gt.join(",")}
       ON CONFLICT (team_id, page_id, conv_id) DO UPDATE SET
         so_lan    = nap_bo_qua.so_lan + 1,
         ly_do     = EXCLUDED.ly_do,
         chu_thich = EXCLUDED.chu_thich,
         psid      = EXCLUDED.psid,
         lan_cuoi  = EXCLUDED.lan_cuoi`,
      [teamId, String(pageId), ...th],
    );
  } catch (e) {
    console.warn(`[nap] ghi dấu vết bỏ qua lỗi (không chặn vòng nạp): ${e?.message || e}`);
  }
}

/** Hội thoại đã được nạp ⇒ XOÁ dấu vết. Còn dòng = đang bị bỏ; hết dòng = đã xử lý. */
async function xoaBoQua(pool, teamId, pageId, dsConv) {
  if (!dsConv.length) return;
  try {
    await pool.query(
      "DELETE FROM nap_bo_qua WHERE team_id=$1 AND page_id=$2 AND conv_id = ANY($3::text[])",
      [teamId, String(pageId), dsConv.map(String)],
    );
  } catch (e) {
    console.warn(`[nap] xoá dấu vết bỏ qua lỗi: ${e?.message || e}`);
  }
}

export async function napTuPoll(pool, { pageId }, deps = {}) {
  const ket = {
    mo: true, lyDo: "", hoiThoai: 0, them: 0, trung: 0, boQua: 0,
    boQuaMoc: 0, boQuaPageNoiCuoi: 0, boQuaDaDoc: 0, dangChoGo: 0, boQuaThe: 0,
  };
  if (!nguonDangMo()) {
    return { ...ket, mo: false, lyDo: lyDoNguonDong() };
  }

  const docHT = deps.docHoiThoai || cuaDocHoiThoai;
  const docT = deps.docTin || cuaDocTin;
  // Tiêm được như các cửa khác của file: bộ ca cần điều khiển thời gian, và một cửa
  // phụ thuộc đồng hồ thật là một cửa không ai kiểm được.
  const doiGoXong = deps.doiGoXong || debounceFor;
  const dongHo = deps.dongHo || Date.now;
  const traThe = deps.traThe || (async (pid, ten) => {
    const { pkTagId } = await import("../pancake.js");
    return pkTagId(pid, ten);
  });
  const depsPk = deps.depsPancake || {};
  const ctx = ctxHeThong();

  // Team + id nội bộ của page. Cửa Messenger tra đúng việc này bên trong nhưng KHÔNG
  // trả ra (nó chỉ trả dữ liệu Pancake), nên nạp phải tra lại — cùng tiền lệ "bootstrap
  // team TRƯỚC KHI có ctx" của `thanh_vien_team` (luoc-do-v1.md §6). Chỉ đọc ĐÚNG một
  // dòng theo khoá tự nhiên, không liệt kê rộng.
  const rp = await pool.query(
    "SELECT id, team_id, nguon_tin FROM page WHERE page_id = $1",
    [String(pageId)],
  );
  if (!rp.rowCount) {
    return {
      ...ket,
      mo: true,
      lyDo: `page_id=${pageId} không có trong sổ cái page`,
    };
  }
  if (rp.rows[0].nguon_tin === 'webhook') {
    return { ...ket, lyDo: 'Page nhận tin qua webhook, không nạp poll' };
  }
  const { id: pageRowId, team_id: teamId } = rp.rows[0];

  const convs = (await docHT(pool, ctx, { pageId }, depsPk)) || [];
  const theChan = await idTheChan(pageId, traThe);
  const boQuaDs = [];   // dấu vết để ghi gộp một lượt ở cuối vòng
  const daNapDs = [];
  for (const c of convs) {
    // `psid` (from_psid) và `convId` (c.id) là HAI giá trị khác nhau — cua-messenger §2.
    const psid = c?.from_psid;
    const convId = c?.id;
    const custId = (c?.customers || [])[0]?.id ?? "";
    if (!psid || !convId) {
      ket.boQua += 1;
      if (convId) boQuaDs.push({ convId, psid: psid || "", lyDo: "khong_co_psid", chuThich: "hội thoại thiếu psid hoặc id" });
      continue;
    }
    ket.hoiThoai += 1;

    // ⓪ THẺ CHẶN — hội thoại đã xong việc ("Đã gửi", hoặc thẻ trạng thái đơn của Pancake).
    //    Xét TRƯỚC mọi cửa khác: đây là "không có việc" chứ không phải "chưa tới lượt".
    const theTrung = (c?.tags || []).map(Number).find((t) => theChan.has(t));
    if (theTrung !== undefined) {
      ket.boQuaThe += 1;
      boQuaDs.push({ convId, psid, lyDo: "the_chan", chuThich: `thẻ ${theTrung}` });
      continue;
    }

    // ① PAGE NÓI CUỐI ⇒ không có lượt nào để trả lời. Biết ngay từ danh sách, khỏi tốn
    //    `GET /messages`. Đây là cửa cắt 60 → 8 (xem khối đo ở trên).
    if (pageNoiCuoi(c, pageId)) {
      ket.boQuaPageNoiCuoi += 1;
      if (moc0(c)) mocDaXu.set(`${pageId}:${convId}`, moc0(c));
      boQuaDs.push({ convId, psid, lyDo: "page_noi_cuoi",
        chuThich: String(c?.last_sent_by?.admin_name || "page").slice(0, 60) });
      continue;
    }

    // ② CHƯA AI ĐỌC — TẮT mặc định. `seen` của Pancake là ĐÃ MỞ, không phải ĐÃ TRẢ LỜI.
    if (CHI_CHUA_DOC() && !(Number(c?.unread_count) > 0)) {
      ket.boQuaDaDoc += 1;
      boQuaDs.push({ convId, psid, lyDo: "da_doc",
        chuThich: (c?.recent_seen_users || [])[0]?.fb_name || "đã có người mở" });
      continue;
    }

    // MỐC: hội thoại không đổi gì kể từ vòng trước ⇒ bỏ qua TRƯỚC khi tốn một lời gọi
    // `GET /messages` (166ms) và hai lượt ghi CSDL. Đây là cửa giữ chu kỳ poll đủ ngắn
    // để lời hứa «trả lời trong 1-2 phút» còn đúng khi số page tăng lên.
    const moc = moc0(c);
    const khoaMoc = `${pageId}:${convId}`;
    if (moc && mocDaXu.get(khoaMoc) === moc) {
      ket.boQuaMoc += 1;
      boQuaDs.push({ convId, psid, lyDo: "moc_cu", chuThich: `không đổi từ ${moc}` });
      continue;
    }

    // ③ CHỜ KHÁCH GÕ XONG. Thấy mốc MỚI thì ghi giờ server rồi ĐỂ ĐÓ; vòng sau mới xét
    //    đã đủ lâu chưa. Chưa đủ ⇒ chưa nạp, để cụm còn gom tiếp được.
    {
      const cho = choGoXong.get(khoaMoc);
      const doi = doiGoXong(c?.snippet || "");
      // Mốc này đã thấy ở vòng trước thì giữ nguyên giờ thấy LẦN ĐẦU — nếu không, mỗi
      // vòng lại dời mốc chờ và cụm không bao giờ tới hạn.
      const thayLuc = cho && cho.moc === moc ? cho.thayLuc : dongHo();
      if (!cho || cho.moc !== moc) choGoXong.set(khoaMoc, { moc, thayLuc });
      if (dongHo() - thayLuc < doi.ms) {
        ket.dangChoGo += 1;
        boQuaDs.push({ convId, psid, lyDo: "cho_go_xong", chuThich: doi.reason });
        continue;
      }
      choGoXong.delete(khoaMoc);
    }

    // Dòng `hoi_thoai` phải có TRƯỚC khi gọi cửa với `psid` (cua-messenger §2 "Hệ quả
    // bắt buộc") — cửa không tự tạo hộ, và không có dòng thì N5 chặn đúng mọi hội thoại
    // MỚI, tức bot câm với chính khách nhắn lần đầu.
    await baoDamHoiThoai(pool, { teamId, pageRowId, psid });

    const msgs =
      (await docT(pool, ctx, { pageId, psid, convId, custId }, depsPk)) || [];
    await nhanDienSale(pool, { teamId, pageId, psid, messages: msgs });
    const cum = gomCumTinKhach(msgs, pageId);
    if (!cum) {
      ket.boQua += 1; // tin cuối là của page (bot/sale vừa nói) → không có việc gì
      if (moc) mocDaXu.set(khoaMoc, moc);
      boQuaDs.push({ convId, psid, lyDo: "page_noi_cuoi", chuThich: "sau khi đọc tin: tin cuối là của page" });
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
      hoanMs: IM_BOTCAKE_MS(),
    });
    if (r.them) ket.them += 1;
    else ket.trung += 1;
    // Ghi mốc SAU khi đã xếp xong. Ném giữa chừng thì mốc không được ghi và vòng sau
    // làm lại — thà quét thừa còn hơn nuốt mất một tin của khách.
    if (moc) mocDaXu.set(khoaMoc, moc);
    daNapDs.push(convId);
  }
  await ghiBoQua(pool, teamId, pageId, boQuaDs);
  await xoaBoQua(pool, teamId, pageId, daNapDs);
  donMoc();
  return ket;
}
