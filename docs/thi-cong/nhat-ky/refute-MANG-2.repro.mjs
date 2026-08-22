// BẰNG CHỨNG CHẠY ĐƯỢC cho refute-MANG-2.verdict.yaml (đường gửi tin ra khách).
// Chạy TỪ GỐC REPO:  node docs/thi-cong/nhat-ky/refute-MANG-2.repro.mjs
// KHÔNG một byte nào ra mạng: S4 bẫy `globalThis.fetch`; S1/S2/S5 chạy trên CSDL
// sandbox tự dựng/tự dọn (db/sandbox.js), không đụng `aicloser_v3` dev.
import { dungSandbox } from "../../../db/sandbox.js";
import { xuLyMotTin } from "../../../src/chat/handler-v3.js";
import { xepTin, docTinTheoId } from "../../../src/queue/kho.js";
import { chayToiKhiHet } from "../../../src/queue/worker.js";
import { guardOutbound } from "../../../src/outbound-guard.js";
import { LoiHoiThoaiKhongThuocPage } from "../../../src/channels/messenger/loi.js";

const P = (s) => console.log(s);
const kbMau = { config: {}, products: [{ name: "SP", price: 109 }], text: "" };
const depsChung = (over = {}) => ({
  layKb: () => kbMau,
  layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
  phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
  lanNhanh: () => ({ handled: false, reply: null, lane: "", reason: "esc" }),
  vaoHangCho: async () => ({ ok: true }),
  docLichSu: false,
  ...over,
});

const sb = await dungSandbox("refute_m2");
const teamId = (
  await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")
).rows[0].id;
let seq = 0;
async function dungTin(psid, noiDung) {
  seq += 1;
  const pid = `95000000000${seq}`;
  const p = await sb.pool.query(
    "INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,'refute') RETURNING id",
    [teamId, pid],
  );
  await sb.pool.query(
    "INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,'QUALIFY','AI')",
    [teamId, p.rows[0].id, psid],
  );
  const r = await xepTin(sb.pool, {
    teamId, pageId: pid, psid, convId: `conv-${psid}`,
    custId: `cust-${psid}`, msgId: `m-${seq}`, noiDung,
  });
  return { pid, tin: await docTinTheoId(sb.pool, r.id, teamId) };
}

// ══ S1 · van ĐÓNG — bộ não (nơi chứa 5 đường gửi không guard) có chạy trước cửa? ══
P("\n═══ S1 · VAN ĐÓNG — bộ não chạy TRƯỚC cửa? ═══");
P(`   PANCAKE_READONLY=${JSON.stringify(process.env.PANCAKE_READONLY)} · V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)}`);
{
  const { tin } = await dungTin("psid-s1", "how much?");
  let goiNao = 0;
  const kq = await xuLyMotTin(sb.pool, tin, depsChung({
    chayCloser: async () => { goiNao += 1; return "Sure, our staff will contact you."; },
    kiemTinRa: guardOutbound, // CỬA THẬT — không tiêm spy
  }));
  P(`   → chayCloser chạy ${goiNao} lượt · kết quả ${kq.ketQua}`);
  P(goiNao ? "   ❌ F1: bộ não đã chạy xong rồi cửa mới chặn" : "   ✅");
}

// ══ S2 · guard chặn CHỮ → ẢNH có còn bay ra khách? ══════════════════════════
P("\n═══ S2 · guard chặn CHỮ, ảnh có bay? ═══");
{
  const { tin } = await dungTin("psid-s2", "gửi ảnh sp");
  const anh = [], chu = [];
  const kq = await xuLyMotTin(sb.pool, tin, depsChung({
    chayCloser: async ({ state }) => {
      state.pendingImages = [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }];
      state.lastUsage = { calls: 1, tin: 100, tout: 50 };
      return "Dạ anh chị ơi, bên em có combo 2 cái giá tốt và sẽ giao hàng cho mình nhé";
    },
    kiemTinRa: guardOutbound,
    cua: {
      guiTin: async (_p, _c, a) => (chu.push(a.text), { ok: true }),
      guiAnh: async (_p, _c, a) => (anh.push(a.url), { ok: true }),
      ghiNote: async () => ({ ok: true }), gatThe: async () => ({ ok: true }),
    },
  }));
  P(`   → ẢNH ${anh.length} tấm · CHỮ ${chu.length} tin · kết quả ${kq.ketQua}/${kq.lyDo}`);
  P(anh.length && !chu.length ? "   ❌ F4: khách nhận ẢNH TRƠ" : "   ✅");
}

// ══ S3 · outbound-guard thiếu ctx (F3) — thuần hàm, không cần DB ═════════════
P("\n═══ S3 · handler-v3 gọi guard THIẾU orderCreated/isOrderSummary ═══");
{
  const tom = "Confirming your order: Name: Grace Pranom, Contact: 0917 555 1234, Address: Cebu City.";
  P(`   tóm tắt đơn, ctx như v3  → ${JSON.stringify(guardOutbound(tom, { kb: kbMau })).slice(0, 70)}…`);
  P(`   thêm isOrderSummary:true → ${guardOutbound(tom, { kb: kbMau, isOrderSummary: true }).action}`);
  const mad = "Your order number will be sent by our staff shortly.";
  P(`   nhắc order no, ctx v3    → ${guardOutbound(mad, { kb: kbMau }).rule}`);
  P(`   thêm orderCreated:true   → ${guardOutbound(mad, { kb: kbMau, orderCreated: true }).action}`);
  P("   ❌ F3: v2 (handler.js:436-437) truyền cả hai, v3 đánh rơi ⇒ lượt xác nhận đơn CÂM");
}

// ══ S5 · lỗi N5 tất định vẫn thử lại 3 lượt model ═══════════════════════════
P("\n═══ S5 · cửa ném N5 → đốt mấy lượt MODEL cho MỘT tin? ═══");
{
  // dọn hai dòng của S1/S2 (chúng vào hàng đợi qua xepTin nhưng được gọi thẳng
  // xuLyMotTin nên vẫn ở 'cho') — nếu không, chayToiKhiHet đo lẫn cả chúng.
  await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong'");
  await dungTin("psid-n5", "hello");
  let goiModel = 0;
  const dem = await chayToiKhiHet(sb.pool, {
    toiDa: 12,
    ...depsChung({
      kiemTinRa: () => ({ ok: true }),
      chayCloser: async () => { goiModel += 1; return "Hello!"; },
      cua: {
        guiTin: async () => { throw new LoiHoiThoaiKhongThuocPage("psid không khớp (N5)."); },
        guiAnh: async () => ({ ok: true }),
        ghiNote: async () => ({ ok: true }), gatThe: async () => ({ ok: true }),
      },
    }),
  });
  P(`   → lượt MODEL = ${goiModel} · ${JSON.stringify(dem)}`);
  P(goiModel > 1 ? `   ❌ F5: đốt ${goiModel} lượt model + ${goiModel} lần kích F1` : "   ✅");
}
await sb.don();

// ══ S4 · tools.js có guard môi trường nào không? (bẫy fetch, KHÔNG ra mạng) ══
P("\n═══ S4 · executeTool('handoff_human') với PANCAKE_READONLY=1 ═══");
{
  const fs = await import("node:fs");
  const url = new URL("../../../ai-messages.jsonl", import.meta.url);
  const luu = fs.existsSync(url) ? fs.readFileSync(url) : null;
  const bay = [];
  const that = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    bay.push(`${init?.method || "GET"} ${String(u).replace(/access_token=[^&]*/, "access_token=<TOKEN THẬT>")}`);
    throw new Error("[BẪY] chặn — máy dev");
  };
  const { executeTool } = await import("../../../src/tools.js");
  await executeTool("handoff_human", { reason: "refute" }, {
    kb: { products: [], config: {} },
    state: { pageId: "111111111111111", pkConvId: "CONV-GIA", pkCustId: "CUST-GIA", psid: "PSID-GIA", messages: [] },
  });
  await new Promise((s) => setTimeout(s, 400)); // chờ nhánh fire-and-forget
  globalThis.fetch = that;
  if (luu) fs.writeFileSync(url, luu);
  P(`   → lượt HTTP bị bẫy chặn: ${bay.length}`);
  for (const b of [...new Set(bay)]) P(`      · ${b}`);
  P(bay.length ? "   ❌ F1: bắn thẳng pages.fm bằng token thật, 0 dòng READONLY canh, lỗi bị catch{} nuốt" : "   ✅");
}
P("\n(sandbox đã dọn)");
