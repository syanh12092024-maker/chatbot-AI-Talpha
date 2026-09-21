// CHI PHÍ THEO TỪNG TIN — thước cho `src/admin-v3/chi-phi-tin.js`.
//
// Màn này trả lời "lượt NÀO tốn bao nhiêu", nên hai thứ phải đúng tuyệt đối:
//   ① ghép ĐÚNG dòng tiền với ĐÚNG câu khách (khoá `so_ai.nguon_dong` = `tin_cho_xu_ly.id`)
//   ② phân biệt "0 đồng" với "chưa đo được" — gộp hai thứ đó là ra đơn giá rẻ giả
//
// ⚠️ `so_ai` là sổ CHỈ-GHI (CSDL chặn DELETE — ca S5 của `l0-m1-luoc-do` canh điều đó).
// Nên các ca dưới đây KHÔNG dọn giữa chừng: mỗi ca tự cô lập bằng `psid` riêng hoặc bằng
// KHOẢNG THỜI GIAN riêng. Đó cũng là cách màn thật phải lọc.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { chiPhiTheoTin, gomChiPhi, tienMotDong, GOM_THEO } from "../src/admin-v3/chi-phi-tin.js";

let sb, teamId;
const PAGE_KSA = "910000000000001";
const PAGE_UAE = "910000000000002";
// Đơn giá cố định trong ca — KHÔNG đọc `.env`, để kết quả không đổi theo máy.
const GIA = { in: 1.0, cache: 0.1, cacheWrite: 1.25, out: 5.0, usdVnd: 26000 };
const ctx = () => ({ teamId });

async function xepTinVaSo({ page, psid, tinKhach, botGui, tv, tr, cd, cg, loai = "reply", luc }) {
  const t = await sb.pool.query(
    `INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,cust_id,msg_id,noi_dung,nguon)
     VALUES ($1,$2,$3,$4,'c',$5,$6,'poll') RETURNING id`,
    [teamId, page, psid, `conv-${psid}`, `m-${Math.random()}`, tinKhach]);
  const tinId = t.rows[0].id;
  if (botGui) {
    await sb.pool.query(
      `INSERT INTO lan_gui (team_id,tin_id,buoc,loai,noi_dung,trang_thai)
       VALUES ($1,$2,1,'guiTin',$3,'da_gui')`,
      [teamId, tinId, JSON.stringify({ text: botGui })]);
  }
  await sb.pool.query(
    `INSERT INTO so_ai (team_id,xay_ra_luc,page_id,psid,loai,ma_model,token_vao,token_ra,
                        cache_doc,cache_ghi,du_lieu,nguon_tep,nguon_dong)
     VALUES ($1,$2,$3,$4,$5,'claude-haiku-4.5',$6,$7,$8,$9,$10,$11,$12)`,
    [teamId, luc || new Date(), page, psid, loai, tv, tr, cd, cg,
      JSON.stringify({ tre_luot_ms: 1234 }), `tin_cho_xu_ly:${loai}`, tinId]);
  return tinId;
}

before(async () => {
  sb = await dungSandbox("chiphitin");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    `INSERT INTO page (team_id,page_id,ten,thi_truong) VALUES ($1,$2,'Minty KSA','KSA'),($1,$3,'Minty UAE','UAE')`,
    [teamId, PAGE_KSA, PAGE_UAE]);
});
after(async () => { await sb.don(); });

test("C1 · một dòng tiền ghép ĐÚNG câu khách và câu bot", async () => {
  await xepTinVaSo({ page: PAGE_KSA, psid: "c1-k1", tinKhach: "how much po",
    botGui: "109 SAR po 😊", tv: 300, tr: 60, cd: 3838, cg: 0 });

  const [d] = await chiPhiTheoTin(sb.pool, ctx(), { psid: "c1-k1", gia: GIA });
  assert.equal(d.tinKhach, "how much po");
  assert.match(d.botGui, /109 SAR po/);
  assert.equal(d.pageTen, "Minty KSA");
  assert.equal(d.thiTruong, "KSA");
  assert.equal(d.treLuotMs, 1234);
  // 300×1 + 60×5 + 3838×0,1 = 1.083,8 USD/triệu → ×26.000đ/$ ÷ 1e6
  assert.equal(d.vnd, Math.round(((300 * 1 + 60 * 5 + 3838 * 0.1) / 1e6) * 26000));
  assert.equal(d.doThat, true);
});

test("C2 · CHƯA ĐO ĐƯỢC token ≠ 0 đồng — không được gộp", async () => {
  // lượt lớp 0 đồng: KHÔNG gọi model ⇒ token NULL. Cô lập bằng khoảng thời gian riêng.
  const LUC = new Date("2026-01-02T03:00:00Z");
  await xepTinVaSo({ page: PAGE_KSA, psid: "c2-k2", tinKhach: "magkano",
    botGui: "bảng giá", tv: null, tr: null, cd: null, cg: null, luc: LUC });
  const [d] = await chiPhiTheoTin(sb.pool, ctx(), { psid: "c2-k2", gia: GIA });
  assert.equal(d.vnd, null, "chưa đo được thì để NULL, không phải 0");
  assert.equal(d.doThat, false);
  assert.deepEqual(tienMotDong({ token_vao: null, token_ra: null }, GIA), { usd: null, vnd: null });

  const [g] = await gomChiPhi(sb.pool, ctx(), { theo: "page", gia: GIA,
    tu: new Date("2026-01-02T02:00:00Z"), den: new Date("2026-01-02T04:00:00Z") });
  assert.equal(g.soLuot, 1);
  assert.equal(g.soLuotDoThat, 0, "phải đếm RIÊNG lượt đo được");
  assert.equal(g.vndMoiLuot, null, "0 lượt đo được ⇒ không có đơn giá, KHÔNG phải 0đ");
});

test("C3 · gom theo page · thị trường · khách — cùng một tập, ba cách cắt", async () => {
  // Khoảng thời gian RIÊNG để ca này không cộng nhầm dòng của ca khác (sổ chỉ-ghi).
  const T0 = new Date("2026-02-10T00:00:00Z"), T1 = new Date("2026-02-10T23:00:00Z");
  const luc = new Date("2026-02-10T08:00:00Z");
  await xepTinVaSo({ page: PAGE_KSA, psid: "c3-kA", tinKhach: "a", botGui: "x", tv: 100, tr: 20, cd: 0, cg: 0, luc });
  await xepTinVaSo({ page: PAGE_KSA, psid: "c3-kA", tinKhach: "b", botGui: "y", tv: 100, tr: 20, cd: 0, cg: 0, luc });
  await xepTinVaSo({ page: PAGE_UAE, psid: "c3-kB", tinKhach: "c", botGui: "z", tv: 200, tr: 40, cd: 0, cg: 0, luc });

  const motLuot = Math.round(((100 * 1 + 20 * 5) / 1e6) * 26000);
  const theoPage = await gomChiPhi(sb.pool, ctx(), { theo: "page", gia: GIA, tu: T0, den: T1 });
  const ksa = theoPage.find((x) => x.khoa === PAGE_KSA);
  assert.equal(ksa.soLuot, 2);
  assert.equal(ksa.vnd, motLuot * 2);
  assert.equal(ksa.thiTruong, "KSA");

  const theoTt = await gomChiPhi(sb.pool, ctx(), { theo: "thi_truong", gia: GIA, tu: T0, den: T1 });
  assert.deepEqual(theoTt.map((x) => x.khoa).sort(), ["KSA", "UAE"]);

  const theoKhach = await gomChiPhi(sb.pool, ctx(), { theo: "khach", gia: GIA, tu: T0, den: T1 });
  const kA = theoKhach.find((x) => x.khoa === "c3-kA");
  assert.equal(kA.soLuot, 2, "một khách nhắn hai lượt thì gom về một dòng");
  assert.equal(kA.pageTen, "Minty KSA");

  // Ba cách cắt phải cộng ra CÙNG một tổng — lệch là một cách cắt đang bỏ sót dòng.
  const tong = (a) => a.reduce((s, x) => s + x.vnd, 0);
  assert.equal(tong(theoPage), tong(theoTt));
  assert.equal(tong(theoPage), tong(theoKhach));
});

test("C4 · lọc theo page và theo khách", async () => {
  const chiKsa = await chiPhiTheoTin(sb.pool, ctx(), { pageId: PAGE_KSA, gia: GIA });
  assert.ok(chiKsa.length && chiKsa.every((x) => x.pageId === PAGE_KSA));
  const chiKhach = await chiPhiTheoTin(sb.pool, ctx(), { psid: "c3-kB", gia: GIA });
  assert.ok(chiKhach.length && chiKhach.every((x) => x.psid === "c3-kB"));
});

test("C5 · khoá gom lạ bị TỪ CHỐI — không ghép chuỗi vào SQL", async () => {
  await assert.rejects(() => gomChiPhi(sb.pool, ctx(), { theo: "psid; DROP TABLE so_ai" }),
    /khoá gom lạ/);
  assert.deepEqual(Object.keys(GOM_THEO).sort(), ["khach", "page", "thi_truong"]);
});

test("C6 · LỚP TEAM: team khác KHÔNG thấy dòng tiền của team này", async () => {
  const teamKhac = (await sb.pool.query("SELECT id FROM team WHERE slug <> 'tieu-alpha' AND NOT la_ky_thuat LIMIT 1")).rows[0].id;
  const ds = await chiPhiTheoTin(sb.pool, { teamId: teamKhac }, { gia: GIA });
  assert.equal(ds.length, 0);
  const gom = await gomChiPhi(sb.pool, { teamId: teamKhac }, { theo: "page", gia: GIA });
  assert.equal(gom.length, 0);
});
