// PHIẾU GL10 ④11 — mã GL10 trên CSDL CHƯA áp 035 (deploy mã trước migration, hoặc `down` lúc mã mới đang chạy): cổng bật chặn
// «CSDL chưa áp migration 035»; worker không sập, cảnh báo ĐÚNG MỘT lần, 0 lượt rút; TẮT vẫn chạy (bỏ phần cột mới, vẫn đóng tin + gỡ
// khoá). Tệp RIÊNG (tiến trình riêng): cờ «đã cảnh báo» là của tiến trình. Hộp cát Postgres riêng, gỡ 035 bằng `db/migrate.js#xuong`.
// ⛔ `page_gan_them.json` là tệp TẠM.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dungSandbox } from "../db/sandbox.js";
import { xuong, daAp } from "../db/migrate.js";

const fetchCu = globalThis.fetch;
const cw = await import("../src/queue/chay-worker.js");
const { setPage } = await import("../src/admin-v3/operations.js");
const { xepTin } = await import("../src/queue/kho.js");

const GOC = fs.mkdtempSync(path.join(os.tmpdir(), "gl10-035-"));
const TEP = path.join(GOC, "page_gan_them.json");
const PID = "985000000001";
const ENV_BAT = { V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only", V3_TRAN_PAGE_BAT: "5", V3_AI_SALE_TEP_GAN: TEP };
const giu = {};
let sb; let team; let nd; let pageRow;

before(async () => {
  for (const [k, v] of Object.entries({ V3_AI_SALE_TEP_GAN: TEP, V3_TRAN_PAGE_BAT: "5", V3_NAP_DEV: "1" })) { giu[k] = process.env[k]; process.env[k] = v; }
  globalThis.fetch = async (u) => { throw new Error(`ca GL10 035: lượt gọi mạng lạ ${u}`); };
  sb = await dungSandbox("gl10k");
  team = String((await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id);
  nd = String((await sb.pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl10k@thu.vn','K') RETURNING id")).rows[0].id);
  pageRow = String((await sb.pool.query("INSERT INTO page (team_id, page_id, ten, nguon_tin) VALUES ($1,$2,'GL10 035','poll') RETURNING id", [team, PID])).rows[0].id);
  const sp = (await sb.pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,'gl10k','SP') RETURNING id", [team, pageRow])).rows[0].id;
  await sb.pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  fs.writeFileSync(TEP, JSON.stringify({ uae: { "985000000101": "AED" }, _v3: { [PID]: "v3 pilot — bật trước khi lùi 035" } }, null, 1));
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(GOC, { recursive: true, force: true });
  await sb?.don();
});

test("GL10 K11 · CSDL chưa 035: bật ⇒ 409 «chưa áp 035»; motLuot ×3 không sập, cảnh báo ĐÚNG MỘT lần, 0 rút; tắt chạy (đóng tin + gỡ khoá)", async () => {
  const ap = await daAp(sb.pool);
  assert.equal(ap.at(-1), "035_page_ai_sale_nhuong", `bản mới nhất phải là 035, đo ${ap.at(-1)}`);
  await xuong(sb.pool, { im: true });
  const cot = (await sb.pool.query("SELECT count(*) n FROM information_schema.columns WHERE table_name='page' AND column_name LIKE 'ai_sale_%'")).rows[0].n;
  assert.equal(Number(cot), 0, "đã gỡ 035");
  const bc = { teamId: team, nguoiDungId: nd };
  const e = await setPage(sb.pool, bc, pageRow, { enabled: true }, ENV_BAT).then(() => null, (x) => x);
  assert.ok(e && e.status === 409, `phải 409, đo ${e?.status} ${e?.message}`);
  assert.match(e.message, /CSDL chưa áp migration 035/);
  // page bật bằng SQL tay (mã cũ đã bật trước khi lùi) + một tin chờ
  await sb.pool.query("UPDATE page SET bot_ai_bat = true WHERE id=$1", [pageRow]);
  const t = (await xepTin(sb.pool, { teamId: team, pageId: PID, psid: "k11", convId: "k11-conv", msgId: "k11-m", noiDung: "how much?" })).id;
  const warnCu = console.warn; const canhBao = [];
  console.warn = (...a) => { canhBao.push(a.join(" ")); };
  const ket = [];
  try {
    for (let i = 0; i < 3; i++) {
      ket.push(await cw.motLuot(sb.pool, { depsNap: { docHoiThoai: async () => [], traThe: async () => null }, depsXuLy: { docLichSu: false } }));
    }
  } finally { console.warn = warnCu; }
  assert.ok(ket.every((k) => k.xu && k.xu.vong === 0), `0 lượt rút, đo ${JSON.stringify(ket.map((k) => k.xu))}`);
  assert.ok(ket.every((k) => k.aiSale?.chua035 === true));
  assert.match(ket[0].nap.lyDo || "", /chưa áp 035/);
  const c035 = canhBao.filter((s) => /035/.test(s));
  assert.equal(c035.length, 1, `cảnh báo «chưa áp 035» đúng MỘT lần qua 3 vòng, đo ${JSON.stringify(canhBao)}`);
  assert.equal((await sb.pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [t])).rows[0].trang_thai, "cho");
  const r = await setPage(sb.pool, bc, pageRow, { enabled: false }, ENV_BAT);
  assert.equal(r.bot_ai_bat, false);
  assert.equal(r.canhBao, undefined);
  assert.deepEqual((await sb.pool.query("SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE id=$1", [t])).rows[0], { trang_thai: "xong", ly_do: "bo_qua:tat_bot" });
  assert.equal(Object.hasOwn(JSON.parse(fs.readFileSync(TEP, "utf8")), "_v3"), false, "tắt vẫn gỡ khoá");
});
