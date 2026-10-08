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
import { napTuPoll, nguonDangMo, lyDoNguonDong, giuLoiDanhSach } from "./nap.js";
import { chayToiKhiHet } from "./worker.js";
import { lamMoiNgat, pageDangNgat } from "./ngat-page.js";
import { dsPageBotTraLoiCoTran, choPhepTheoTran, lyDoRong, trangThaiTran, lyDoVuotTran, cauSoTran } from "./page-routing.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
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
/**
 * Danh sách page worker được phép nạp và xử — MỘT BẢN (CR-02-10 · MB2): đúng những page có
 * `page.bot_ai_bat = true`. Chỗ quyết định nằm ở `page-routing.js`; hai nơi đọc là hai luật.
 *
 * GL2: qua TRẦN toàn hệ (`V3_TRAN_PAGE_BAT`, vắng = 0) — số page bật > trần ⇒ `[]`, worker không trả lời page nào
 * (`page-routing.js#dsPageBotTraLoiCoTran`). Cố ý KHÔNG đổi `dsPageBotTraLoi` — nó còn là nguồn của 6 màn.
 */
export const dsPageChoPhep = (pool, env = process.env) => dsPageBotTraLoiCoTran(pool, env);

export function lyDoChuaChoPageNao() {
  return lyDoRong();
}

/**
 * MỘT lượt: nạp tin mới của mọi page rồi xử hết hàng đợi.
 * Trả bảng đếm — cấm trả `void`, vì cái duy nhất chứng minh vòng lặp đang làm việc là số.
 *
 * GL3c R2-N1 (+ /code-review #2 · vòng 2, đối kháng F4): mốc «danh sách lỗi liên tục» chỉ sống cho page mà vòng nạp NÀY thấy lỗi danh
 * sách — `giuLoiDanhSach` chạy trong `finally`, nên kể cả khi vòng NÉM trước/giữa bước nạp (CSDL chập ở `trangThaiTran` / `dsPageDeNap`)
 * thì mọi page khác vẫn bỏ mốc. Page không được nạp (ngắt đọc — bất kỳ đường nào ngắt · tắt bot · vượt trần · nguồn đóng · vòng ném) hoặc
 * nạp mà không tới bước đọc danh sách (đổi sang webhook · không có trong sổ · lỗi khác) ⇒ lỗi trước quãng KHÔNG quan sát đó không nối với
 * lỗi sau thành «liên tục»; mở lại phải đủ T_NGAT_DS lỗi liên tục mới ngắt lại. Page ngắt vì GỬI vẫn nạp: `nap.js` không nối chuỗi khi
 * page đang ngắt. Vòng xử (boQuaNap) — kể cả khi ném — không đụng mốc.
 */
export async function motLuot(pool, deps = {}) {
  const loiDsVong = [];   // GL3c: page vòng nạp này THẤY danh sách hội thoại lỗi
  try {
    return await motLuotTrong(pool, deps, loiDsVong);
  } finally {
    if (!deps.boQuaNap) giuLoiDanhSach(loiDsVong);
  }
}

async function motLuotTrong(pool, deps, loiDsVong) {
  const ket = {
    nap: { mo: nguonDangMo(), them: 0, trung: 0, page: 0, loi: 0,
      boQuaPageNoiCuoi: 0, boQuaMoc: 0, boQuaDaDoc: 0, boQuaThe: 0, docTinLoi: 0, dsLoi: 0 },
    xu: null,
  };
  // MỘT LƯỢT ĐỌC CHO CẢ VÒNG. Nguồn có thể là CSDL (024), nên hỏi hai lần trong một vòng
  // vừa tốn một lời gọi vừa mở đường cho hai nửa của cùng một vòng chạy trên hai danh sách
  // khác nhau — người vừa giao một page giữa chừng là thấy ngay.
  // GL2: danh sách và lý do «vượt trần» lấy từ CÙNG một lượt đọc trạng thái trần (`page-routing.js#trangThaiTran`).
  const tt = deps.dsChoPhep ? null : await trangThaiTran(pool);
  const choPhep = deps.dsChoPhep ? await deps.dsChoPhep() : choPhepTheoTran(tt);
  // GL4 ② 4: đọc lại trạng thái ngắt vào bộ nhớ chung của tiến trình (đồng hồ CSDL) và mở lại page đã hết hạn (đúng một lần —
  // UPDATE có điều kiện). Worker lọc page ngắt trước MỖI lượt rút (`worker.js#chayMotVong`). Ngắt vì ĐỌC ⇒ bỏ nạp page đó
  // (đọc lại tốn 15 s × số token mỗi hội thoại, đứng cả vòng nạp tuần tự); ngắt vì GỬI ⇒ VẪN nạp (đọc còn tốt — Pancake v1 chỉ
  // trả 60 hội thoại mới nhất, bỏ nạp 30′ là mất tin rơi khỏi cửa sổ), tin vào `cho` chờ mở. Page ngắt vẫn tính «bật» khi đếm trần.
  await lamMoiNgat(pool);
  const ngat = pageDangNgat();
  ket.ngat = { so: ngat.length, doc: ngat.filter((x) => x.vi === "doc").length, gui: ngat.filter((x) => x.vi === "gui").length };
  const boNap = new Set(ngat.filter((x) => x.vi === "doc").map((x) => x.pageId));

  if (!ket.nap.mo) {
    ket.nap.lyDo = lyDoNguonDong();
  } else if (!deps.boQuaNap) {
    const trongBang = deps.dsPage
      ? await deps.dsPage(pool)
      : await dsPageDeNap(pool);
    // GIAO của hai danh sách: bảng `page` nói page nào CÓ THẬT và nạp được, cột `bot_ai_bat`
    // nói page nào bot ĐANG TRẢ LỜI. Thiếu một trong hai thì page ấy không được nạp.
    ket.nap.choPhep = choPhep.length;
    ket.nap.nguonChoPhep = 'csdl';
    const pages = trongBang.filter((p) => choPhep.includes(p) && !boNap.has(p));
    ket.nap.page = pages.length;
    // GL2: rỗng vì VƯỢT TRẦN thì nói đúng lý do đó, không phải «chưa page nào bật bot».
    if (tt?.vuot) ket.nap.lyDo = lyDoVuotTran(tt.soBat);
    else if (!choPhep.length) ket.nap.lyDo = lyDoChuaChoPageNao();
    else if (!pages.length) {
      ket.nap.lyDo =
        `Danh sách cho phép có ${choPhep.length} id nhưng KHÔNG id nào có trong bảng ` +
        "`page` — van chỉ thu hẹp, không tạo page mới. Kiểm lại id.";
    }
    for (const pageId of pages) {
      try {
        const r = await napTuPoll(pool, { pageId }, deps.depsNap || {});
        ket.nap.them += r.them || 0;
        ket.nap.trung += r.trung || 0;
        // Ba cửa lọc phải HIỆN RA trong log. Một vòng "0 mới" mà không nói vì sao thì
        // không phân biệt được "không ai nhắn" với "cửa lọc đang nuốt oan khách".
        ket.nap.boQuaPageNoiCuoi += r.boQuaPageNoiCuoi || 0;
        ket.nap.boQuaMoc += r.boQuaMoc || 0;
        ket.nap.boQuaDaDoc += r.boQuaDaDoc || 0;
        ket.nap.boQuaThe += r.boQuaThe || 0;
        // GL3b: hội thoại Pancake không trả lịch sử (lỗi vừa gặp + đang lùi) — bot CHƯA trả lời họ.
        ket.nap.docTinLoi += r.docTinLoi || 0;
        // GL3c: page Pancake không trả DANH SÁCH hội thoại ở vòng này (chưa tới T_NGAT_DS thì chỉ có dòng log này).
        if (r.dsLoi) { ket.nap.dsLoi += 1; ket.nap.dsLoiCuoi = `${pageId}: ${r.lyDo}`; loiDsVong.push(pageId); }
      } catch (e) {
        // Một page hỏng KHÔNG được dừng cả vòng — nhưng phải ĐẾM, không nuốt im.
        ket.nap.loi += 1;
        ket.nap.loiCuoi = `${pageId}: ${e?.message || e}`;
      }
    }
  }
  // (mốc «danh sách lỗi liên tục» được tỉa ở `finally` của `motLuot` — cả khi vòng ném; xem chú thích ở đó)
  if (deps.boQuaXu) return ket;
  ket.xu = await chayToiKhiHet(pool, {
    toiDa: TRAN_MOI_LUOT,
    pageIds: choPhep,
    ...(deps.depsXuLy || {}),
  });
  return ket;
}

/** MỘT dòng log cho cả lượt (export cho bộ ca GL3b ④4b đo dòng log thật). */
export function inLuot(ket) {
  const n = ket.nap;
  const x = ket.xu || {};
  const loc = [
    n.boQuaThe ? `${n.boQuaThe} thẻ-chặn` : "",
    n.boQuaPageNoiCuoi ? `${n.boQuaPageNoiCuoi} page-nói-cuối` : "",
    n.boQuaMoc ? `${n.boQuaMoc} mốc-cũ` : "",
    n.boQuaDaDoc ? `${n.boQuaDaDoc} ĐÃ-ĐỌC(bỏ)` : "",
    n.docTinLoi ? `${n.docTinLoi} đọc-tin-lỗi` : "",
  ].filter(Boolean).join(" · ");
  const dong = (n.mo
    ? `nạp: ${n.them} mới · ${n.trung} trùng · ${n.page} page${loc ? ` · lọc: ${loc}` : ""}`
      + `${n.loi ? ` · ${n.loi} page LỖI (${n.loiCuoi})` : ""}`
      // GL3c: MỘT cụm tổng mỗi vòng — Pancake chập ngắn (< T_NGAT_DS) chỉ hiện ở đây, không ngắt.
      + `${n.dsLoi ? ` · ${n.dsLoi} page lỗi danh sách (${String(n.dsLoiCuoi).slice(0, 160)})` : ""}`
    : `nạp: ĐÓNG — ${n.lyDo}`)
    // GL4: số page đang ngắt kênh — MỘT cụm trong dòng tổng, không cảnh báo riêng mỗi vòng.
    + (ket.ngat?.so ? ` · ngắt kênh: ${ket.ngat.so} page (đọc ${ket.ngat.doc} · gửi ${ket.ngat.gui})` : "");
  console.log(`[worker-v3] ${dong} | xử: ${JSON.stringify(x)}`);
}

async function main() {
  const pool = taoPool();
  const poolGui = taoPool(); // sổ gửi luôn có kết nối ngoài transaction xử lý
  // Worker là tiến trình GỬI THẬT, nên nó phải thấy đúng kho token mà người ta quản ở màn
  // v3 (bảng `token_pancake`, migration 019) — không chỉ `.env` của máy chủ.
  {
    const { docTokenSong } = await import("../token-pancake.js");
    const { datKhoTokenDb } = await import("../pancake.js");
    datKhoTokenDb(() => docTokenSong(pool));
  }
  // CR-02-10 · MB1: worker LÀ bot. Trước 02/10 không chỗ nào ngoài `src/server.js` (v1) gọi
  // `loadKB()`, nên ở đây `kb.js#getKBForPage` chạy trên `pageMap` rỗng ⇒ mọi page `noData`.
  await (await import("../core/khoi-dong-loi.js")).khoiDongLoi({ nhan: "worker-v3" });
  const motLuotThoi = process.env.V3_WORKER_MOT_LUOT === "1";
  // ⚠️ PHẢI `await` VÀ PHẢI TRUYỀN `pool` (sửa 25/09). Từ 024 hàm này bất đồng bộ và có thể
  // đọc CSDL. Bản trước gọi kiểu cũ `dsPageChoPhep()`: nhận về một Promise ⇒ `.length` là
  // `undefined` ⇒ dòng log nói «KHÔNG CÓ page nào» trong khi vòng lặp vẫn chạy page — đo được
  // trên bản dev khi kéo hội thoại Minty. Và TỆ HƠN: nguồn là CSDL (nay luôn là cột
  // `page.bot_ai_bat`) ⇒ thiếu `pool` là `pool.query` trên `undefined` ⇒ tiến trình SẬP lúc khởi động.
  const tran = await trangThaiTran(pool);   // GL2: dòng khởi động nói trần + số bật, và nói đúng lý do khi rỗng
  const choPhep = choPhepTheoTran(tran);
  console.log(
    `[worker-v3] khởi động · nhịp ${NHIP_MS}ms · trần ${TRAN_MOI_LUOT} tin/lượt · ` +
      `nguồn ${nguonDangMo() ? "MỞ" : "ĐÓNG"} · V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} · ` +
      `${cauSoTran(tran.soBat)} · page được phép: ${choPhep.length ? choPhep.join(",")
        : tran.vuot ? `KHÔNG CÓ (${lyDoVuotTran(tran.soBat)})` : "KHÔNG CÓ (chưa page nào bật bot — cột page.bot_ai_bat)"}`,
  );
  let dung = false;
  for (const tin of ["SIGINT", "SIGTERM"]) {
    process.on(tin, () => {
      console.log(`[worker-v3] nhận ${tin} — dừng sau lượt đang chạy.`);
      dung = true;
    });
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const pollLoop = async () => {
    while (!dung) {
      const started = Date.now();
      try { inLuot(await motLuot(pool, { boQuaXu: true })); }
      catch (e) { console.error('[worker-v3] nạp lỗi:', e.name); }
      while (!dung && Date.now() - started < NHIP_MS) await pause(250);
    }
  };
  const workLoop = async () => {
    while (!dung) {
      try {
        const ket = await motLuot(pool, { boQuaNap: true, depsXuLy: { poolGui, dongThoi: 1 } });
        if (ket.xu?.vong) inLuot(ket);
        else await pause(250);
      } catch (e) { console.error('[worker-v3] xử lý lỗi:', e.name); await pause(1000); }
    }
  };
  try {
    if (motLuotThoi) inLuot(await motLuot(pool, { depsXuLy: { poolGui, dongThoi: 3 } }));
    else {
      // Ba vòng độc lập, không đợi worker chậm nhất trước khi nhận khách mới.
      // Kết nối thứ tư của pool dành cho poll. Sổ gửi có pool riêng.
      await Promise.all([pollLoop(), workLoop(), workLoop(), workLoop()]);
    }
  } finally {
    await Promise.all([pool.end(), poolGui.end()]);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`[worker-v3] chết: ${e?.stack || e?.message || e}`);
    process.exit(1);
  });
}
