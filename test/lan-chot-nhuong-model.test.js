// LƯỢT CHỐT ĐƠN KHÔNG TRẢ BẰNG MẪU CỨNG
//
// Đo 23/09 trên 84 lượt khách thật: 33 lượt do lớp 0 đồng trả, 28 đúng chỗ (giá · chào ·
// thời gian giao). Bốn lượt còn lại là `muon_dat` + `tpl_howto` — khách vừa gõ "Place an
// order", tức KHOẢNH KHẮC CHỐT, và mẫu cứng hỏng ở ba chỗ đo được:
//   · 0/33 lượt mẫu gọi được tên khách (model: 7/32 = 22%) — mẫu không có cơ chế thay biến
//   · mẫu BỎ QUA câu hỏi số lượng ⇒ thu đủ tên/SĐT/địa chỉ rồi vẫn chưa tạo được đơn
//   · một chuỗi cho mọi tình huống
//
// Ca này neo BA điều, vì bỏ sót điều nào cũng làm hỏng một thứ khác:
//   ① lane chốt PHẢI đi tới model, không được trả mẫu
//   ② lane thường (giá/chào/ship) PHẢI giữ nguyên 0 đồng — 28/33 lượt là đúng chỗ
//   ③ `fast-lane.js` KHÔNG bị đụng (tệp CẤM SỬA): lane vẫn khớp, chỉ mất quyền trả lời
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "920000000000053";
let sb, teamId, pageRowId, xuLyMotTin, xepTin, docTinTheoId, lanChotNhuongModel;

const KB = {
  text: "Minty Fresh Smile",
  config: { fastLaneHowto: "MẪU CỨNG: xin tên, SĐT, địa chỉ." },
  products: [{ id: "sp-1", name: "Powder", currency: "SAR",
    tiers: [{ label: "Buy 1 Get 1", price: 109 }, { label: "Buy 2 Get 2", price: 159 }] }],
};

before(async () => {
  ({ xuLyMotTin, lanChotNhuongModel } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("lanchot");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  pageRowId = (await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Ca lượt chốt') RETURNING id", [teamId, PAGE])).rows[0].id;
});
after(async () => { if (sb) await sb.don(); });

let seq = 0;
async function motLuot({ noiDung, lanNhanh }) {
  seq += 1;
  const psid = `psid-chot-${seq}`;
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
    chayCloser: async () => { goiModel += 1; return "MODEL VIẾT: Ilan set po — 1 o 2?"; },
    kiemTinRa: () => ({ ok: true }),
  });
  return { kq, gui, goiModel };
}

test("① khách đòi đặt hàng ⇒ lớp từ khoá NHƯỜNG, model viết câu chốt", async () => {
  const r = await motLuot({ noiDung: "Place an order" });
  assert.equal(r.goiModel, 1, "lượt chốt phải tới model");
  assert.deepEqual(r.gui, ["MODEL VIẾT: Ilan set po — 1 o 2?"]);
  assert.equal(r.kq.lyDo, "tra_loi");
  assert.equal(r.gui[0].includes("MẪU CỨNG"), false, "không được trả bằng kb.config.fastLaneHowto");
});

test("① tpl_howto của Fast Lane cũng nhường — chặn ở handler, KHÔNG sửa fast-lane.js", async () => {
  const r = await motLuot({
    // Câu KHÔNG khớp luật nào của lớp từ khoá, để tin xuống tới Fast Lane.
    noiDung: "ok tell me more about it",
    lanNhanh: () => ({ handled: true, reply: "MẪU CỨNG howto", lane: "tpl_howto", reason: "hỏi cách đặt" }),
  });
  assert.equal(r.goiModel, 1);
  assert.equal(r.gui[0].includes("MẪU CỨNG"), false);
});

test("② lane THƯỜNG giữ nguyên 0 đồng — 28/33 lượt mẫu là đúng chỗ, đừng phá", async () => {
  for (const lane of ["tpl_price", "tpl_greet", "tpl_ship"]) {
    const r = await motLuot({
      noiDung: "how much",
      lanNhanh: () => ({ handled: true, reply: `MẪU ${lane}`, lane, reason: "" }),
    });
    assert.equal(r.goiModel, 0, `${lane} KHÔNG được leo lên model`);
    assert.deepEqual(r.gui, [`MẪU ${lane}`]);
    assert.equal(r.kq.lyDo, `fastlane:${lane}`);
  }
});

test("③ danh sách lane chốt đọc được từ env, và tắt được hẳn", async () => {
  const cu = process.env.V3_LAN_CHOT_MODEL;
  try {
    delete process.env.V3_LAN_CHOT_MODEL;
    assert.deepEqual([...lanChotNhuongModel()].sort(), ["muon_dat", "tpl_howto"],
      "mặc định CỐ Ý bỏ `paano_gap` — phiếu L2-M2 đã chốt câu đó trả 0 token");
    process.env.V3_LAN_CHOT_MODEL = "";
    assert.equal(lanChotNhuongModel().size, 0, "rỗng = tắt hẳn, mẫu cứng trả lại như cũ");
    process.env.V3_LAN_CHOT_MODEL = "tpl_price";
    assert.deepEqual([...lanChotNhuongModel()], ["tpl_price"]);
  } finally {
    if (cu === undefined) delete process.env.V3_LAN_CHOT_MODEL; else process.env.V3_LAN_CHOT_MODEL = cu;
  }
});

test("③ tắt bằng env ⇒ mẫu cứng trả lại, KHÔNG gọi model", async () => {
  const cu = process.env.V3_LAN_CHOT_MODEL;
  process.env.V3_LAN_CHOT_MODEL = "";
  try {
    const r = await motLuot({ noiDung: "Place an order" });
    assert.equal(r.goiModel, 0);
    assert.match(r.gui[0], /MẪU CỨNG/);
  } finally {
    if (cu === undefined) delete process.env.V3_LAN_CHOT_MODEL; else process.env.V3_LAN_CHOT_MODEL = cu;
  }
});


test("④ `paano_gap` GIỮ NGUYÊN mẫu 0 đồng — phiếu L2-M2 đã chốt, không đổi ngầm", async () => {
  const r = await motLuot({ noiDung: "paano mag order" });
  assert.equal(r.goiModel, 0, "đổi hành vi đã ký phải đi lối doi-y-do, không phải hệ quả phụ");
  assert.equal(r.kq.lyDo, "tu_khoa_v3:paano_gap");
  assert.match(r.gui[0], /MẪU CỨNG/);
});


// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LANE GIAO HÀNG — nhường theo NỘI DUNG CÂU KHÁCH, không theo tên lane
//
// Ca thật 20/09 (Faisal Ishaq): khách gõ "Deliver riyadh" — hỏi CÓ GIAO TỚI ĐÓ KHÔNG.
// Mẫu đáp "Your order is free delivery dear / It take 2-5 days to delivery dear": không
// xác nhận Riyadh, không gọi tên, không có bước sau. Bot Pancake cùng lượt đó đáp
// "Yes Faisal, we deliver to Riyadh 😊 … How many sets would you like — and may I have
// your contact number and complete address?".
//
// Mẫu cứng KHÔNG biết khách ở đâu và KHÔNG biết khách đã có đơn chưa. Hai loại câu đó phải
// lên model. Phần còn lại — "bao lâu", "bao nhiêu tiền" — vẫn 0 đồng.
// ═══════════════════════════════════════════════════════════════════════════

test("⑤ hỏi giao tới ĐỊA ĐIỂM ⇒ nhường model, không bắn mẫu cứng", async () => {
  const r = await motLuot({
    noiDung: "Deliver riyadh",
    lanNhanh: () => ({ handled: true, reply: "MẪU CỨNG ship", lane: "tpl_ship", reason: "hỏi giao hàng" }),
  });
  assert.equal(r.goiModel, 1, "câu hỏi địa điểm phải tới model");
  assert.equal(r.gui[0].includes("MẪU CỨNG"), false);
});

test("⑤ hỏi về ĐƠN ĐÃ CÓ ⇒ nhường model", async () => {
  const r = await motLuot({
    noiDung: "The delivery was scheduled for today.",
    lanNhanh: () => ({ handled: true, reply: "MẪU CỨNG ship", lane: "tpl_ship", reason: "hỏi giao hàng" }),
  });
  assert.equal(r.goiModel, 1);
  assert.equal(r.gui[0].includes("MẪU CỨNG"), false);
});

test("⑤ hỏi SỐ NGÀY thuần ⇒ GIỮ mẫu 0 đồng — đừng đổi thứ đang đúng", async () => {
  for (const cau of ["ilan araw po bago deliver", "how many days", "free delivery?"]) {
    const r = await motLuot({
      noiDung: cau,
      lanNhanh: () => ({ handled: true, reply: "MẪU CỨNG ship", lane: "tpl_ship", reason: "hỏi giao hàng" }),
    });
    assert.equal(r.goiModel, 0, `"${cau}" KHÔNG được leo lên model`);
    assert.deepEqual(r.gui, ["MẪU CỨNG ship"]);
  }
});
