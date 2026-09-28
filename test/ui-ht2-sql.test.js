// UI-HT2 · bộ đọc SQL có LIMIT của bàn hội thoại, đo trên POSTGRES SANDBOX thật.
// Vì sao phải đo thật: cổng giả không có LIMIT lẫn `to_timestamp`, và câu SQL kẹp `team_id`
// bằng `$1` — sai một tham số là lộ hội thoại team khác. Bản giả không bắt được điều đó.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { taoBoiCanh, VAI } from "../v3/src/auth/boi-canh.js";
import { taoDocHoiThoaiSql } from "../v3/src/ui/ban-hoi-thoai/index.js";

let sb, teamA, teamB, doc;
const BAY = Date.parse("2026-09-28T10:00:00Z");
const ngay = (n) => n * 86_400_000;
const q = async (sql, a = []) => (await sb.pool.query(sql, a)).rows;

before(async () => {
  sb = await dungSandbox("uiht2");
  teamA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'"))[0].id;
  teamB = (await q("SELECT id FROM team WHERE slug='auus'"))[0].id;
  const [pA] = await q("INSERT INTO page (team_id, page_id, ten) VALUES ($1,'102938','A') RETURNING id", [teamA]);
  const [pB] = await q("INSERT INTO page (team_id, page_id, ten) VALUES ($1,'556677','B') RETURNING id", [teamB]);
  const [kA] = await q("INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,'96891234567','Aisha') RETURNING id", [teamA]);
  const [kB] = await q("INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,'96891234567','B') RETURNING id", [teamB]);
  const ht = (team, page, psid, khach, chu, cham) => q(
    "INSERT INTO hoi_thoai (team_id, page_id, psid, khach_id, trang_thai, chu_so_huu, cham_luc) VALUES ($1,$2,$3,$4,'GREET',$5,$6)",
    [team, page, psid, khach, chu, new Date(cham)]);
  await ht(teamA, pA.id, "p-moi", kA.id, "SALE", BAY - 3_600_000);
  await ht(teamA, pA.id, "p-bot", null, "AI", BAY - ngay(1));
  await ht(teamA, pA.id, "p-cu", null, "AI", BAY - ngay(30));
  await ht(teamB, pB.id, "p-b", kB.id, "AI", BAY - 60_000);
  doc = taoDocHoiThoaiSql(sb.pool);
});
after(async () => { if (sb) await sb.don(); });

const bc = () => taoBoiCanh({ nguoiDungId: "1", tenDangNhap: "an", teamId: String(teamA), vai: [VAI.SALE] });

test("S1 · cửa sổ ngày + mới nhất trước + KHÔNG lọt team khác", async () => {
  const r = await doc(bc(), { tuLuc: BAY - ngay(7), gioiHan: 100 });
  assert.deepEqual(r.map((x) => x.psid), ["p-moi", "p-bot"]);
  assert.equal(typeof r[0].cham_luc, "number", "timestamptz quy về mốc ms như cổng");
});

test("S2 · chỉ bot", async () => {
  const r = await doc(bc(), { chiBot: true, tuLuc: BAY - ngay(7) });
  assert.deepEqual(r.map((x) => x.psid), ["p-bot"]);
});

test("S3 · tìm theo SĐT chỉ ra khách CÙNG team; tìm theo psid vượt cửa sổ ngày", async () => {
  assert.deepEqual((await doc(bc(), { tim: "96891234567" })).map((x) => x.psid), ["p-moi"]);
  assert.deepEqual((await doc(bc(), { tim: "p-cu" })).map((x) => x.psid), ["p-cu"]);
  assert.deepEqual((await doc(bc(), { tim: "p-b" })).map((x) => x.psid), [], "psid của team khác");
});

test("S4 · LIMIT thật — không kéo quá trần", async () => {
  const r = await doc(bc(), { tuLuc: 0, gioiHan: 1 });
  assert.equal(r.length, 1);
});
