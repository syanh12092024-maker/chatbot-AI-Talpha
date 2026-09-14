#!/usr/bin/env node
// TIẾN TRÌNH WORKER v3 — vòng lặp NẠP rồi XỬ LÝ, chạy tách khỏi `src/server.js`.
//
//   node --env-file=.env src/queue/chay-worker.js            # chạy mãi, nhịp 6 giây
//   V3_WORKER_MOT_LUOT=1 node --env-file=.env src/queue/chay-worker.js   # chạy ĐÚNG một lượt rồi thoát
//
// ═══ VÌ SAO PHẢI CÓ FILE NÀY ════════════════════════════════════════════════════════
// `src/queue/worker.js` là nơi DUY NHẤT gọi `handler-v3` (và qua đó ghi `so_ai`,
// `viec_can_xu_ly`). Nhưng không tiến trình nào gọi nó: `src/server.js` không import
// `src/queue/*` một dòng nào (đo 01/09: `grep -n "queue/worker" src/server.js` = 0), mà
// `server.js` nằm trong 62 file phẳng CẤM SỬA của bản đang chạy (luật 4 §0a). Hệ quả đo
// được: `so_ai` 0 dòng · `viec_can_xu_ly` 0 dòng trong khi 988 hội thoại ở HANDOFF ⇒ màn
// «Hiệu quả kịch bản» vô dụng, «Trang chủ» mù ô việc-cần-xử, hai đèn `so_ai` của màn Sức
// khỏe đỏ. Không phải vì hệ hỏng, mà vì luồng chưa bao giờ được CHẠY.
//
// Nên đường vào nằm ở đây — đất v3 — thay vì sửa file cấm. Cutover là đổi tiến trình chạy
// (PM2/systemd), không phải đổi mã của bản đang phục vụ 51 page thật.
//
// ═══ BA VAN, KHÔNG VAN NÀO Ở FILE NÀY ═══════════════════════════════════════════════
// File này KHÔNG tự quyết được gửi hay không. Nó chỉ quay vòng; mọi cửa chặn đã nằm sẵn:
//   ① `nguonDangMo()` (nap.js) — máy READONLY chỉ nạp khi `V3_NAP_DEV=1` VÀ CSDL localhost.
//   ② van GỬI (`V3_PANCAKE_GUI` + `PANCAKE_READONLY`) — worker đọc TRƯỚC khi gọi bộ não,
//      đóng thì chốt `chan_guard`, 0 token, 0 HTTP ghi (VA-R1 · RF-2).
//   ③ cổng HTTP ghi trên `globalThis.fetch` (handler-v3) — lớp cuối, chặn POST ra pages.fm.
// Vì vậy chạy file này trên máy dev là AN TOÀN theo luật 1: nó sẽ quay, đọc, và chốt
// `chan_guard` mà không một byte nào ra khách. In ra số đếm để thấy nó đang đứng ở đâu.
import { napTuPoll, nguonDangMo, lyDoNguonDong } from "./nap.js";
import { chayToiKhiHet } from "./worker.js";
import { taoPool } from "../../db/ket-noi.js";

/** Nhịp quay khi hàng đợi rỗng. Cùng bậc với vòng poll của bản đang chạy (6–13 giây). */
export const NHIP_MS = Number(process.env.V3_WORKER_NHIP_MS || 6000);
/** Trần số tin xử trong MỘT lượt — để một lượt không chiếm tiến trình mãi. */
export const TRAN_MOI_LUOT = Number(process.env.V3_WORKER_TRAN || 50);

/**
 * Danh sách page để nạp. Đọc từ bảng `page` chứ không gõ tay: gõ tay là danh sách chết, và
 * án lệ #22 nói đúng chỗ này — «danh sách gõ tay là lỗ hẹn giờ».
 *
 * ⚠️ Câu SQL trần, KHÔNG qua `layNhieu`: job nền không đứng trong MỘT team nào, mà
 * `ctxHeThong()` bắt buộc kèm `team_id` tường minh (`src/db/boi-canh.js` — cố ý, để không
 * ai suy luận hộ team cho một job). Vòng này quét MỌI team, và lớp team nằm ở lượt sau:
 * `napTuPoll` tự tra `page.team_id` rồi mọi lượt ghi đều đi qua ctx của team đó.
 */
export async function dsPageDeNap(pool, { gioiHan = 500 } = {}) {
  const r = await pool.query(
    "SELECT page_id FROM page WHERE page_id <> '' ORDER BY page_id LIMIT $1",
    [gioiHan],
  );
  return r.rows.map((x) => String(x.page_id)).filter(Boolean);
}

/**
 * DANH SÁCH PAGE ĐƯỢC PHÉP — van bậc phơi (14/09).
 *
 * ⚠️ VÌ SAO PHẢI CÓ: `dsPageDeNap` trả MỌI page trong bảng (502 page). Bật worker mà không
 *    có van này là mở thẳng bậc ⑥ «toàn bộ» — trong khi bot v1 vẫn đang trả lời 51 page
 *    thật, tức khách của những page ấy nhận tin từ HAI tiến trình. Bậc phơi ③ («1 page thử,
 *    người ngồi canh») của skill `mo-van` KHÔNG thực hiện được nếu thiếu chỗ này.
 *
 * Chiều an toàn theo luật 1 của `bien-moi-truong-v3.md`: **vắng = đóng**. Không đặt biến thì
 * danh sách RỖNG và worker không nạp page nào — không phải «nạp tất».
 *
 * Van này chỉ THU HẸP, không bao giờ mở rộng: id không có trong bảng `page` bị bỏ qua, nên
 * gõ nhầm một id không tạo ra một page ma (án lệ #22 «danh sách gõ tay là lỗ hẹn giờ»).
 */
export function dsPageChoPhep() {
  return String(process.env.V3_PAGE_XU_LY || "")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function lyDoChuaChoPageNao() {
  return (
    "V3_PAGE_XU_LY chưa đặt ⇒ worker KHÔNG nạp page nào (vắng = đóng). Đặt danh sách id " +
    "page ngăn cách bằng dấu phẩy để mở đúng bậc phơi cần thử."
  );
}

/**
 * MỘT lượt: nạp tin mới của mọi page rồi xử hết hàng đợi.
 * Trả bảng đếm — cấm trả `void`, vì cái duy nhất chứng minh vòng lặp đang làm việc là số.
 */
export async function motLuot(pool, deps = {}) {
  const ket = {
    nap: { mo: nguonDangMo(), them: 0, trung: 0, page: 0, loi: 0 },
    xu: null,
  };
  if (!ket.nap.mo) {
    ket.nap.lyDo = lyDoNguonDong();
  } else {
    const trongBang = deps.dsPage
      ? await deps.dsPage(pool)
      : await dsPageDeNap(pool);
    // GIAO của hai danh sách: bảng `page` nói page nào CÓ THẬT, biến môi trường nói page nào
    // ĐƯỢC PHÉP ở bậc phơi này. Thiếu một trong hai thì page ấy không được nạp.
    const choPhep = deps.dsChoPhep ? deps.dsChoPhep() : dsPageChoPhep();
    ket.nap.choPhep = choPhep.length;
    const pages = trongBang.filter((p) => choPhep.includes(p));
    ket.nap.page = pages.length;
    if (!choPhep.length) ket.nap.lyDo = lyDoChuaChoPageNao();
    else if (!pages.length) {
      ket.nap.lyDo =
        `V3_PAGE_XU_LY có ${choPhep.length} id nhưng KHÔNG id nào có trong bảng \`page\` ` +
        "— van chỉ thu hẹp, không tạo page mới. Kiểm lại id.";
    }
    for (const pageId of pages) {
      try {
        const r = await napTuPoll(pool, { pageId }, deps.depsNap || {});
        ket.nap.them += r.them || 0;
        ket.nap.trung += r.trung || 0;
      } catch (e) {
        // Một page hỏng KHÔNG được dừng cả vòng — nhưng phải ĐẾM, không nuốt im.
        ket.nap.loi += 1;
        ket.nap.loiCuoi = `${pageId}: ${e?.message || e}`;
      }
    }
  }
  ket.xu = await chayToiKhiHet(pool, {
    toiDa: TRAN_MOI_LUOT,
    ...(deps.depsXuLy || {}),
  });
  return ket;
}

function inLuot(ket) {
  const n = ket.nap;
  const x = ket.xu || {};
  const dong = n.mo
    ? `nạp: ${n.them} mới · ${n.trung} trùng · ${n.page} page${n.loi ? ` · ${n.loi} page LỖI (${n.loiCuoi})` : ""}`
    : `nạp: ĐÓNG — ${n.lyDo}`;
  console.log(`[worker-v3] ${dong} | xử: ${JSON.stringify(x)}`);
}

async function main() {
  const pool = taoPool();
  const motLuotThoi = process.env.V3_WORKER_MOT_LUOT === "1";
  const choPhep = dsPageChoPhep();
  console.log(
    `[worker-v3] khởi động · nhịp ${NHIP_MS}ms · trần ${TRAN_MOI_LUOT} tin/lượt · ` +
      `nguồn ${nguonDangMo() ? "MỞ" : "ĐÓNG"} · V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} · ` +
      `page được phép: ${choPhep.length ? choPhep.join(",") : "KHÔNG CÓ (vắng V3_PAGE_XU_LY = đóng)"}`,
  );
  let dung = false;
  for (const tin of ["SIGINT", "SIGTERM"]) {
    process.on(tin, () => {
      console.log(`[worker-v3] nhận ${tin} — dừng sau lượt đang chạy.`);
      dung = true;
    });
  }
  try {
    do {
      try {
        inLuot(await motLuot(pool));
      } catch (e) {
        // Vòng lặp KHÔNG được chết vì một lượt hỏng — nhưng lỗi phải hiện nguyên văn.
        console.error(`[worker-v3] lượt hỏng: ${e?.stack || e?.message || e}`);
      }
      if (motLuotThoi || dung) break;
      await new Promise((r) => setTimeout(r, NHIP_MS));
    } while (true);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`[worker-v3] chết: ${e?.stack || e?.message || e}`);
    process.exit(1);
  });
}
