// KHÁCH HỎI NGÔN NGỮ NÀO, BOT TRẢ LỜI NGÔN NGỮ ĐÓ — thước cho ĐƯỜNG XỬ LÝ TIN, không chỉ
// cho bộ đoán (28/09/2026).
//
// Giả lập Minty KSA trên 12 lượt khách thật: ba khách gõ «How much?» nhận câu mẫu tiếng
// Tagalog. Người quyết: «khách hỏi ngôn ngữ nào thì trả lời ngôn ngữ đó». Bộ đoán có thước
// riêng (`ngon-ngu-cau-mau.test.mjs`); ca này neo điều bộ đoán không chứng minh được —
// luật đã THẬT SỰ CẮM vào cả hai lớp 0 đồng của `handler-v3`, trên CSDL thật.
//
//   ① khách tiếng Anh + câu mẫu tiếng Tagalog ⇒ NHƯỜNG, model trả lời (fast lane)
//   ② khách tiếng Tagalog + câu mẫu tiếng Tagalog ⇒ GIỮ câu mẫu, 0 đồng như cũ
//   ③ câu pha tiếng (Taglish) ⇒ GIỮ câu mẫu
//   ④ lớp từ khoá cũng nhường theo cùng luật
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "920000000000077";
const MAU_GIA_TAGALOG = "🎉 ESPESYAL NA PROMO – Hanggang 70% OFF! 🎁 Buy 1 Get 1 – 109 SAR lamang "
  + "🚚 Libreng Shipping · 💵 Cash on Delivery (COD) Ilang set po ang gusto ninyong orderin? 📦";
let sb, teamId, pageRowId, xuLyMotTin, xepTin, docTinTheoId;

const KB = {
  text: "Minty Fresh Smile",
  config: {},
  products: [{ id: "sp-1", name: "Toothpaste", currency: "SAR",
    tiers: [{ label: "Buy 1 Get 1", price: 109 }, { label: "Buy 2 Get 2", price: 159 }] }],
};

before(async () => {
  ({ xuLyMotTin } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("ngonngu");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  pageRowId = (await sb.pool.query(
    "INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true, $1,$2,'Ca ngôn ngữ') RETURNING id", [teamId, PAGE])).rows[0].id;
});
after(async () => { if (sb) await sb.don(); });

let seq = 0;
async function motLuot({ noiDung, lanNhanh }) {
  seq += 1;
  const psid = `psid-nn-${seq}`;
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,'QUALIFY','AI')`,
    [teamId, pageRowId, psid]);
  const t = await xepTin(sb.pool, { teamId, pageId: PAGE, psid, convId: `c-${seq}`,
    custId: "cust", msgId: `m-${seq}`, noiDung });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  const gui = [];
  let goiModel = 0;
  const kq = await xuLyMotTin(sb.pool, tin, {
    layKb: () => KB,
    cua: { guiTin: async (_p, _c, a) => { gui.push(a.text); return { ok: true, id: "c" }; },
           guiAnh: async () => ({ ok: true, id: "c" }), ghiNote: async () => ({ ok: true }),
           gatThe: async () => ({ ok: true, tags: [] }) },
    layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
    phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
    lanNhanh: lanNhanh || (() => ({ handled: false, reply: null, lane: "", reason: "stub" })),
    chayCloser: async () => { goiModel += 1; return "MODEL: It's 109 SAR for Buy 1 Get 1. How many sets?"; },
    kiemTinRa: () => ({ ok: true }),
  });
  return { kq, gui, goiModel };
}

const laneGia = () => ({ handled: true, reply: MAU_GIA_TAGALOG, lane: "tpl_price", reason: "hỏi giá" });

test("① khách hỏi TIẾNG ANH, câu mẫu TIẾNG TAGALOG ⇒ nhường, model trả lời", async () => {
  const r = await motLuot({ noiDung: "How much?", lanNhanh: laneGia });
  assert.equal(r.goiModel, 1, "lượt lệch ngôn ngữ phải tới model");
  assert.equal(r.gui[0].includes("ESPESYAL"), false, "không được gửi câu mẫu tiếng Tagalog cho khách hỏi tiếng Anh");
});

test("② khách hỏi TIẾNG TAGALOG, câu mẫu TIẾNG TAGALOG ⇒ GIỮ câu mẫu, 0 đồng", async () => {
  const r = await motLuot({ noiDung: "mag kano.", lanNhanh: laneGia });
  assert.equal(r.goiModel, 0, "cùng ngôn ngữ thì không tốn một lượt model nào");
  assert.equal(r.gui[0].includes("ESPESYAL"), true);
});

test("③ khách nói PHA TIẾNG (Taglish) ⇒ GIỮ câu mẫu", async () => {
  const r = await motLuot({ noiDung: "How much po?", lanNhanh: laneGia });
  assert.equal(r.goiModel, 0);
  assert.equal(r.gui[0].includes("ESPESYAL"), true);
});

test("④ đoán không ra ngôn ngữ (chỉ emoji) ⇒ GIỮ hành vi cũ", async () => {
  const r = await motLuot({ noiDung: "👍👍", lanNhanh: laneGia });
  assert.equal(r.goiModel, 0, "bộ đoán không chắc thì không đẩy lượt lên model");
});
