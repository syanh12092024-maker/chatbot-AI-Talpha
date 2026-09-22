// MẠCH TƯ VẤN NỐI TỚI PROMPT — ca NỐI DÂY, không phải ca đơn vị.
//
// `test/context.test.mjs` C15–C18 neo phần dựng chữ. Ca này neo phần CÒN LẠI, chỗ dễ đứt
// nhất: `handler-v3` có thật sự đưa `state.lastAiText`/`state.idleMs` vào `meta` không.
// Hai giá trị đó nằm sẵn trong `hoi_thoai.ai_noi_gi`/`ai_noi_luc` và đã được
// `trang-thai.js:85-86` nạp vào state từ lâu — nhưng suốt thời gian đó KHÔNG đi vào prompt.
// Đứt đúng một dòng `meta:` là bot lại quên chính câu mình vừa nói, mà mọi ca đơn vị vẫn xanh.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "920000000000047";
let sb, teamId, pageRowId, xuLyMotTin, xepTin, docTinTheoId;

const KB = {
  text: "Minty Fresh Smile — teeth whitening powder",
  products: [{ id: "sp-1", name: "Teeth Whitening Powder", currency: "SAR",
    tiers: [{ label: "Buy 1 Get 1 FREE", price: 109 }, { label: "Buy 2 Get 2 FREE", price: 159 }] }],
};

before(async () => {
  ({ xuLyMotTin } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("mach");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  pageRowId = (await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Ca mạch') RETURNING id", [teamId, PAGE])).rows[0].id;
});
after(async () => { if (sb) await sb.don(); });

let seq = 0;
/** Một lượt thật, hội thoại được gieo sẵn «AI đã nói câu X, cách đây Y». */
async function motLuot({ noiDung, aiNoiGi, cachDayMs }) {
  seq += 1;
  const psid = `psid-mach-${seq}`;
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu, ai_noi_gi, ai_noi_luc)
     VALUES ($1,$2,$3,'QUALIFY','AI',$4,$5)`,
    [teamId, pageRowId, psid, aiNoiGi || "", cachDayMs == null ? null : new Date(Date.now() - cachDayMs)]);
  const t = await xepTin(sb.pool, { teamId, pageId: PAGE, psid, convId: `conv-mach-${seq}`,
    custId: "cust-mach", msgId: `msg-mach-${seq}`, noiDung });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  let hoSoBlock = "";
  await xuLyMotTin(sb.pool, tin, {
    layKb: () => KB,
    cua: { guiTin: async () => ({ ok: true, id: "c" }), guiAnh: async () => ({ ok: true, id: "c" }),
           ghiNote: async () => ({ ok: true }), gatThe: async () => ({ ok: true, tags: [] }) },
    layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
    phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
    lanNhanh: () => ({ handled: false, reply: null, lane: "", reason: "stub escalate" }),
    // Khối hồ sơ LUÔN là lượt user đầu tiên của mảng (context.js#buildContextMessages).
    chayCloser: async ({ state }) => { hoSoBlock = String(state.messages?.[0]?.content || ""); return "ok"; },
    kiemTinRa: () => ({ ok: true }),
  });
  return hoSoBlock;
}

test("nối dây · câu AI nói gần nhất đi từ CSDL tới prompt", async () => {
  const block = await motLuot({
    noiDung: "ok sir",
    aiNoiGi: "Buy 2 Get 2 mas sulit po — 4 tuýp 159 SAR. Ilan po ang gusto niyo?",
    cachDayMs: 3 * 24 * 3600e3,
  });
  assert.match(block, /AI nói gần nhất \(3 ngày trước\)/, "handler phải truyền lastAi + idleMs vào meta");
  assert.match(block, /159 SAR/, "lập luận của lượt trước phải còn đọc được trong prompt");
  assert.match(block, /TIẾP NỐI đúng chỗ đang dở/, "im 3 ngày ⇒ phải có chỉ thị tiếp nối");
});

test("nối dây · hội thoại liền mạch KHÔNG bị chèn dòng thừa", async () => {
  const block = await motLuot({ noiDung: "ok sir", aiNoiGi: "Ilan po ang gusto niyo?", cachDayMs: 5 * 60e3 });
  assert.match(block, /AI nói gần nhất \(5 phút trước\)/);
  assert.doesNotMatch(block, /TIẾP NỐI/, "cùng một phiên chat thì 6 tin gần nhất đã đủ");
});

test("nối dây · AI chưa nói lượt nào thì không có dòng nào cả", async () => {
  const block = await motLuot({ noiDung: "how much po", aiNoiGi: "", cachDayMs: null });
  assert.doesNotMatch(block, /AI nói gần nhất/);
  assert.doesNotMatch(block, /TIẾP NỐI/);
  assert.match(block, /HỒ SƠ KHÁCH/, "vẫn phải là khối hồ sơ bình thường");
});
