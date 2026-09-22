// CỬA RA · THANG HAI BẬC — `quaCuaRa` trong src/chat/handler-v3.js
//
// VÌ SAO CÓ BỘ CA NÀY (đo 21/09/2026, phát lại 48 tin thật của page 1220547807799752):
// 5 lượt khách nhắn xong KHÔNG nhận được chữ nào, mà sổ vẫn ghi đủ token — 498đ trên
// tổng 1.735đ, tức 28,7% tiền của cả lần chạy. Soi ra không lượt nào là "model câm":
// cả 5 đều là `outbound-guard` chặn ở cửa ra, 3 lượt CHECKLIST + 2 lượt PRICE_MISMATCH.
//
// `guardOutbound` trả HAI loại phán quyết — `block` (cấm hẳn) và `rewrite` (sửa rồi gửi).
// Bản trước gộp cả hai vào `if (!v.ok) guarded = ""` nên mọi lượt `rewrite` bị vứt trắng,
// kể cả những lượt `localFix` gộp được MIỄN PHÍ. v1 (`src/handler.js:455-465`) có bậc đó
// từ 11/08/2026; v3 bỏ sót.
//
// Ba điều bộ ca này neo:
//   ① `rewrite` + sửa được  → SỬA TẠI CHỖ rồi GỬI, KHÔNG gọi model lần hai (0 token thêm)
//   ② `block`               → KHÔNG được thử sửa (sửa máy móc câu cấm là nguy hiểm hơn tốn tiền)
//   ③ chặn thật             → GIỮ LẠI câu bị chặn + BÀN GIAO SALE (đừng để khách câm)
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "920000000000031";
const CONV = "conv-cuara";
const CUST = "cust-cuara";

let sb, teamId, pageRowId;
let xuLyMotTin, KET_QUA, xepTin, docTinTheoId;

// Bảng giá THẬT của page test — 109/159 SAR. Luật 4 của guard đối chiếu đúng tập này.
const KB = {
  text: "Minty Fresh Smile — teeth whitening powder",
  products: [
    {
      id: "sp-1",
      name: "Teeth Whitening Powder",
      currency: "SAR",
      tiers: [
        { label: "Buy 1 Get 1 FREE", price: 109 },
        { label: "Buy 2 Get 2 FREE", price: 159 },
      ],
    },
  ],
};

// Câu dán checklist — đúng hình dạng model hay viết khi xin thông tin giao hàng.
const CHECKLIST = [
  "Para makapag-order po, pakibigay:",
  "- Full name:",
  "- Contact number:",
  "- Complete address:",
].join("\n");

before(async () => {
  ({ xuLyMotTin, KET_QUA } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("cuara");
  const t = await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'");
  teamId = t.rows[0].id;
  const p = await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Ca cửa ra') RETURNING id",
    [teamId, PAGE],
  );
  pageRowId = p.rows[0].id;
});

after(async () => {
  if (sb) await sb.don();
});

let seq = 0;
/**
 * Một lượt qua `xuLyMotTin` THẬT. Mỗi lượt một PSID + một dòng `hoi_thoai` mới toanh —
 * cùng lý do đã ghi ở test/l2-m2-handler.test.js (ngân sách lượt là của TỪNG hội thoại,
 * dùng chung PSID là ca này tiêu ngân sách của ca kia).
 */
async function motLuot({ noiDung, kb = KB, deps = {} }) {
  seq += 1;
  const psid = `psid-cuara-${seq}`;
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,$3,'QUALIFY','AI')`,
    [teamId, pageRowId, psid],
  );
  const t = await xepTin(sb.pool, {
    teamId, pageId: PAGE, psid, convId: `${CONV}-${seq}`, custId: CUST,
    msgId: `msg-cuara-${seq}`, noiDung,
  });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  const guiTinCalls = [];
  const dem = { chayCloser: 0, ghiNote: 0, gatThe: 0, suaTaiCho: 0 };
  const kq = await xuLyMotTin(sb.pool, tin, {
    layKb: () => kb,
    cua: {
      guiTin: async (_p, _c, a) => { guiTinCalls.push(a.text); return { ok: true, id: "cua" }; },
      guiAnh: async () => ({ ok: true, id: "cua" }),
      ghiNote: async () => { dem.ghiNote++; return { ok: true }; },
      gatThe: async () => { dem.gatThe++; return { ok: true, tags: [] }; },
    },
    layModel: async () => ({ client: {}, maModel: "stub-model", nguon: "config" }),
    phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
    lanNhanh: () => ({ handled: false, reply: null, lane: "", reason: "stub escalate" }),
    chayCloser: async () => { dem.chayCloser++; return "stub AI reply"; },
    ...deps,
  });
  return { kq, guiTinCalls, dem, tinId: t.id, psid };
}

const soAi = async (tinId, loai) =>
  (await sb.pool.query(
    `SELECT loai, lane, ly_do, du_lieu FROM so_ai
      WHERE team_id=$1 AND nguon_dong=$2 ${loai ? "AND loai=$3" : ""} ORDER BY id`,
    loai ? [teamId, tinId, loai] : [teamId, tinId],
  )).rows;

// ═══ ① `rewrite` SỬA ĐƯỢC → gửi, KHÔNG gọi model lần hai ════════════════════════════
test("CHECKLIST · sửa tại chỗ rồi GỬI — 0 token thêm, không gọi model lần hai", async () => {
  const { kq, guiTinCalls, dem, tinId } = await motLuot({
    noiDung: "ok po sir order na ako",
    deps: { chayCloser: async () => CHECKLIST },
  });
  assert.equal(kq.lyDo, "tra_loi", "sửa được thì lượt phải kết thúc là ĐÃ TRẢ LỜI");
  assert.equal(guiTinCalls.length, 1, "khách PHẢI nhận được tin");
  assert.equal(
    guiTinCalls[0].split("\n").filter((l) => /^\s*-/.test(l)).length,
    0,
    "bản đã sửa không còn dòng gạch đầu dòng nào",
  );
  assert.match(guiTinCalls[0], /Full name, Contact number, Complete address/);
  assert.equal(dem.chayCloser, 0, "chayCloser bị thay bằng stub riêng của ca này");

  const [reply] = await soAi(tinId, "reply");
  assert.equal(reply.du_lieu.sua_tai_cho, "CHECKLIST", "sổ phải nói rõ bậc 2 đã cứu lượt này");
  assert.equal((await soAi(tinId, "spent_no_send")).length, 0, "sửa được thì KHÔNG phải tiền vứt đi");
});

// ═══ ② `block` KHÔNG được thử sửa ═══════════════════════════════════════════════════
test("block · KHÔNG đụng tới localFix, dù mã luật nằm trong danh sách sửa được", async () => {
  let goiSua = 0;
  const { kq, guiTinCalls } = await motLuot({
    noiDung: "ok po sir order na ako",
    deps: {
      chayCloser: async () => CHECKLIST,
      // Phán quyết CẤM HẲN nhưng mang mã luật SỬA ĐƯỢC — đúng cái bẫy mà `v.action`
      // phải chặn. Không có nhánh đó thì code sẽ gộp checklist rồi gửi một câu bị cấm.
      kiemTinRa: () => ({ ok: false, action: "block", rule: "CHECKLIST", reason: "ca thử" }),
      suaTaiCho: () => { goiSua++; return "đã gộp"; },
    },
  });
  assert.equal(goiSua, 0, "phán quyết `block` thì tuyệt đối không gọi localFix");
  assert.equal(guiTinCalls.length, 0);
  assert.equal(kq.lyDo, "guard_noi_dung:CHECKLIST");
});

// ═══ ③ chặn thật → giữ câu + bàn giao sale ══════════════════════════════════════════
test("PRICE_MISMATCH · giữ câu bị chặn trong sổ VÀ bàn giao sale", async () => {
  const { kq, guiTinCalls, dem, tinId, psid } = await motLuot({
    noiDung: "magkano po ulit",
    // 99 SAR không có trong bảng giá 109/159 — `rewrite`, và `localFix` không sửa được
    // (sửa giá máy móc là làm sai nghĩa, nguy hiểm hơn tốn tiền — xem outbound-guard.js).
    deps: { chayCloser: async () => "Sir it is only 99 SAR po, order na tayo?" },
  });
  assert.equal(guiTinCalls.length, 0, "giá sai TUYỆT ĐỐI không được tới khách");
  assert.equal(kq.lyDo, "guard_noi_dung:PRICE_MISMATCH", "lý do thoát phải nêu ĐÍCH DANH luật");

  const [chan] = await soAi(tinId, "spent_no_send");
  assert.match(chan.du_lieu.text_bi_chan, /99 SAR/, "câu đã trả tiền phải còn đọc lại được");
  assert.match(chan.du_lieu.guard_ly_do, /99/, "kèm lý do guard nêu con số sai");

  const bg = await soAi(tinId, "handoff");
  assert.equal(bg.length, 1, "khách không nhận được gì ⇒ sale PHẢI được báo");
  assert.match(bg[0].ly_do, /cửa ra chặn: PRICE_MISMATCH/);
  assert.ok(dem.ghiNote >= 1, "bàn giao đi qua cửa ghi chú thật");

  const ht = await sb.pool.query(
    "SELECT trang_thai FROM hoi_thoai WHERE team_id=$1 AND page_id=$2 AND psid=$3",
    [teamId, pageRowId, psid],
  );
  assert.equal(ht.rows[0].trang_thai, "HANDOFF", "hội thoại phải sang tay người");
});

// ═══ ④ cùng thang bậc đó áp cho LỚP 0 ĐỒNG ══════════════════════════════════════════
test("Fast Lane · mẫu dính CHECKLIST cũng được sửa tại chỗ rồi gửi", async () => {
  const { kq, guiTinCalls, tinId } = await motLuot({
    noiDung: "how to order",
    deps: {
      lanNhanh: () => ({ handled: true, reply: CHECKLIST, lane: "tpl_howto", reason: "hỏi cách đặt" }),
    },
  });
  assert.equal(kq.lyDo, "fastlane:tpl_howto");
  assert.equal(guiTinCalls.length, 1);
  assert.match(guiTinCalls[0], /Full name, Contact number, Complete address/);
  const [reply] = await soAi(tinId, "reply");
  assert.equal(reply.du_lieu.sua_tai_cho, "CHECKLIST");
});

test("Lớp 0 đồng · guard chặn hẳn thì cũng giữ câu + bàn giao, không im lặng", async () => {
  const { kq, guiTinCalls, tinId } = await motLuot({
    noiDung: "how to order",
    deps: {
      lanNhanh: () => ({ handled: true, reply: "Dạ sản phẩm này là hàng chính hãng ạ.", lane: "tpl_howto", reason: "" }),
    },
  });
  assert.equal(guiTinCalls.length, 0, "tin lọt tiếng Việt không được tới khách Ả Rập/Philippines");
  assert.equal(kq.lyDo, "guard_noi_dung:VIETNAMESE");
  const [chan] = await soAi(tinId, "spent_no_send");
  assert.match(chan.du_lieu.text_bi_chan, /chính hãng/);
  assert.equal((await soAi(tinId, "handoff")).length, 1);
});
