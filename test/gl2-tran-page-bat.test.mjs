// PHIẾU GL2 ④1–④4b — TRẦN SỐ PAGE BẬT BOT TOÀN HỆ (`V3_TRAN_PAGE_BAT`): vắng = 0 · vượt ⇒ worker DỪNG hẳn.
//
// Người quyết 05/10: «vắng biến = 0 page · vượt trần = worker DỪNG hẳn + đèn đỏ». Ba chỗ đo trên hộp cát Postgres THẬT:
//   ① hàm đọc trần (một chỗ) · ② cổng bật `setPage` (đếm TOÀN HỆ, khoá tư vấn, tắt không bị chặn)
//   ③ hai lượt bật song song · ④ worker: hàm RIÊNG (`dsPageBotTraLoiCoTran`) trả `[]` khi vượt, cả vòng `motLuot` không
//   nạp / không rút tin, log cảnh báo ≤ 1 dòng / 5 phút — trong khi `dsPageBotTraLoi` (nguồn của 6 màn) VẪN thấy page bật.
// Không gọi mạng: `globalThis.fetch` là bẫy ném (đếm lượt; bộ nạp tra thẻ chặn qua `/settings` ⇒ tiêm `traThe`), van gửi đóng (`PANCAKE_READONLY=1` từ `.env`) ⇒ tin rút ra là
// `chan_guard` trước bộ não. Env đặt TRONG tiến trình ca (process.env / đối tượng env truyền vào), KHÔNG sửa `.env`.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";

const pr = await import("../src/queue/page-routing.js");
const { setPage } = await import("../src/admin-v3/operations.js");
const cw = await import("../src/queue/chay-worker.js");
const { xepTin } = await import("../src/queue/kho.js");

const coHam = (ten) => assert.equal(typeof pr[ten], "function", `page-routing.js chưa xuất \`${ten}\` (GL2 ②1/②3)`);
const ENV_MO = { V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only" };
const envTran = (tran) => (tran === undefined ? { ...ENV_MO } : { ...ENV_MO, V3_TRAN_PAGE_BAT: tran });

let sb; let pool; let X; let Y; let ND; const ID = {}; const PID = { A: "972000000001", B: "972000000002", C: "972000000003" };
let goiFetch = 0;
const fetchCu = globalThis.fetch;

before(async () => {
  sb = await dungSandbox("gl2");
  pool = sb.pool;
  console.log(`   [gl2] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/page-routing.js", import.meta.url))}`);
  globalThis.fetch = async (u) => { goiFetch += 1; throw new Error(`ca GL2: lượt gọi mạng lạ ${u}`); };
  X = (await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  Y = (await pool.query("INSERT INTO team (slug, ten) VALUES ('gl2-y','GL2 Y') RETURNING id")).rows[0].id;
  ND = (await pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl2@thu.vn','GL2') RETURNING id")).rows[0].id;
  for (const [k, team] of [["A", X], ["B", Y], ["C", X]]) {
    ID[k] = (await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id", [team, PID[k], `GL2 ${k}`])).rows[0].id;
    // Cổng cấu hình (`pageStatus`) đòi sản phẩm + gói giá hợp lệ — dựng đủ để phép đo soi ĐÚNG cổng trần.
    const sp = (await pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [team, ID[k], `gl2-${k}`])).rows[0].id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  }
});
after(async () => {
  globalThis.fetch = fetchCu;
  if (sb) await sb.don();
});

const bc = (team) => ({ teamId: String(team), nguoiDungId: String(ND) });
const TEAM = { A: () => X, B: () => Y, C: () => X };
const bat = (k, on, env) => setPage(pool, bc(TEAM[k]()), ID[k], { enabled: on }, env);
const cot = async (k) => (await pool.query("SELECT bot_ai_bat FROM page WHERE id=$1", [ID[k]])).rows[0].bot_ai_bat;
const datCot = async (...dsBat) => pool.query("UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))", [dsBat.map((k) => PID[k])]);
const demBat = async () => Number((await pool.query("SELECT count(*) AS n FROM page WHERE bot_ai_bat")).rows[0].n);

async function voiEnv(bo, viec) {
  const cu = {};
  for (const [k, v] of Object.entries(bo)) { cu[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { return await viec(); } finally {
    for (const [k, v] of Object.entries(cu)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

/* ═══════════ ④1 · hàm đọc trần — MỘT chỗ ═══════════ */

test("GL2 T1 · tranPageBat: vắng · '' · 'abc' · '-1' · '1.5' ⇒ 0 · '1' ⇒ 1 · '3' ⇒ 3 · moTa nói giá trị đo được", () => {
  coHam("tranPageBat"); coHam("moTaTranPageBat");
  const t = (v) => pr.tranPageBat(v === undefined ? {} : { V3_TRAN_PAGE_BAT: v });
  assert.deepEqual([undefined, "", "abc", "-1", "1.5", "1e2", " "].map(t), [0, 0, 0, 0, 0, 0, 0], "vắng / sai = 0 (vắng = đóng)");
  assert.deepEqual(["1", "3", " 2 ", "0"].map(t), [1, 3, 2, 0]);
  assert.match(pr.moTaTranPageBat({}), /^0 — chưa đặt$/);
  assert.match(pr.moTaTranPageBat({ V3_TRAN_PAGE_BAT: "abc" }), /^0 — .*"abc"/, "giá trị sai phải được IN ra, không nuốt");
  assert.equal(pr.moTaTranPageBat({ V3_TRAN_PAGE_BAT: "1" }), "1");
});

/* ═══════════ ④2 · cổng bật `setPage` — đếm TOÀN HỆ ═══════════ */

test("GL2 B2a · trần 1: bật A (team X) ⇒ thành, cột A = true", async () => {
  await datCot();
  const r = await bat("A", true, envTran("1"));
  assert.equal(r.bot_ai_bat, true);
  assert.equal(await cot("A"), true);
});

test("GL2 B2b · trần 1, A đang bật: bật B (team KHÁC) ⇒ 409 có số đo, B vẫn tắt", async () => {
  await datCot("A");
  const e = await bat("B", true, envTran("1")).then(() => null, (x) => x);
  assert.ok(e, "B (team khác) bật được khi A đã chiếm trần 1 — trần đang đếm KẸP TEAM");
  assert.equal(e.status, 409, `mã chặn phải 409, đo: ${e.status} · ${e.message}`);
  assert.match(e.message, /đang bật 1\/1 page/);
  assert.match(e.message, /V3_TRAN_PAGE_BAT=1/);
  assert.equal(await cot("B"), false, "bị chặn thì cột KHÔNG đổi");
});

test("GL2 B2c · tắt KHÔNG bị trần chặn — kể cả khi đang VƯỢT (dựng thẳng 3 page, trần 1)", async () => {
  await datCot("A", "B", "C");
  const r = await bat("A", false, envTran("1"));
  assert.equal(r.bot_ai_bat, false);
  const r2 = await bat("B", false, envTran(undefined));
  assert.equal(r2.bot_ai_bat, false, "vắng biến (trần 0) cũng phải tắt được");
  assert.equal(await demBat(), 1);
});

test("GL2 B2d · trần 1: tắt A rồi bật B ⇒ thành", async () => {
  await datCot("A");
  await bat("A", false, envTran("1"));
  const r = await bat("B", true, envTran("1"));
  assert.equal(r.bot_ai_bat, true);
  assert.deepEqual([await cot("A"), await cot("B")], [false, true]);
});

test("GL2 B2e · VẮNG biến: bật A (0 page đang bật) ⇒ 409 «0 — chưa đặt»", async () => {
  await datCot();
  for (const env of [envTran(undefined), envTran(""), envTran("abc")]) {
    const e = await bat("A", true, env).then(() => null, (x) => x);
    assert.ok(e, `vắng/sai biến (${JSON.stringify(env.V3_TRAN_PAGE_BAT)}) mà vẫn bật được — vắng phải = 0`);
    assert.equal(e.status, 409);
    assert.match(e.message, /đang bật 0\/0 page/);
  }
  const e = await bat("A", true, envTran(undefined)).then(() => null, (x) => x);
  assert.match(e.message, /V3_TRAN_PAGE_BAT=0 — chưa đặt/);
  assert.equal(await cot("A"), false);
});

test("GL2 B2f · BIÊN trần 2: 1 bật ⇒ bật thêm thành · 2 bật ⇒ 409 · bật lại page ĐÃ bật khi đúng trần ⇒ thành", async () => {
  await datCot("A");
  assert.equal((await bat("B", true, envTran("2"))).bot_ai_bat, true, "1 + 1 = 2 ≤ 2 phải thành");
  const e = await bat("C", true, envTran("2")).then(() => null, (x) => x);
  assert.ok(e && e.status === 409, "2 + 1 > 2 phải chặn");
  assert.match(e.message, /đang bật 2\/2 page/);
  assert.equal((await bat("A", true, envTran("2"))).bot_ai_bat, true, "page đã bật không tính chính nó — gạt lại không bị chặn");
  assert.equal(await demBat(), 2);
});

test("GL2 B2h · đang VƯỢT (trần hạ còn 1, 3 page bật): gạt lại page ĐÃ bật ⇒ 409 nói ĐÚNG số thật 3/1", async () => {
  await datCot("A", "B", "C");
  const e = await bat("A", true, envTran("1")).then(() => null, (x) => x);
  assert.ok(e && e.status === 409, "đang vượt thì không gạt-bật thêm được, kể cả page đã bật");
  assert.match(e.message, /đang bật 3\/1 page/, `câu phải nói số THẬT đang bật, đo: ${e.message}`);
  assert.equal(await demBat(), 3);
});

test("GL2 B2g · thứ tự: van gửi ĐÓNG + vượt trần ⇒ lỗi cấu hình nói TRƯỚC (pageStatus chạy trước trần)", async () => {
  await datCot("A");
  const e = await bat("B", true, { ...envTran("1"), V3_PANCAKE_GUI: "0", PANCAKE_READONLY: "1" }).then(() => null, (x) => x);
  assert.ok(e && e.status === 409);
  assert.match(e.message, /Máy chủ chưa mở gửi tin/);
  assert.doesNotMatch(e.message, /V3_TRAN_PAGE_BAT/);
});

/* ═══════════ ④3 · hai lượt bật SONG SONG — khoá tư vấn ═══════════ */

test("GL2 S3a · trần 1, bật A ‖ bật B song song ×10 vòng ⇒ mỗi vòng ĐÚNG một thành", async () => {
  for (let v = 0; v < 10; v++) {
    await datCot();
    const kq = await Promise.allSettled([bat("A", true, envTran("1")), bat("B", true, envTran("1"))]);
    const thanh = kq.filter((x) => x.status === "fulfilled").length;
    assert.equal(thanh, 1, `vòng ${v}: ${thanh} lượt thành — ${kq.map((x) => x.reason?.message || "ok").join(" | ")}`);
    assert.equal(kq.find((x) => x.status === "rejected").reason.status, 409);
    assert.equal(await demBat(), 1);
  }
});

test("GL2 S3b · khoá tư vấn: ca GIỮ khoá ⇒ hai lượt bật XẾP HÀNG ở khoá (pg_locks thấy 2 chờ); thả ⇒ đúng một thành", async () => {
  assert.equal(typeof pr.KHOA_TRAN_PAGE_BAT, "string", "chưa có hằng tên khoá tư vấn");
  await datCot();
  const giu = await pool.connect();
  let kq;
  try {
    await giu.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [pr.KHOA_TRAN_PAGE_BAT]);
    const hai = Promise.allSettled([bat("A", true, envTran("1")), bat("B", true, envTran("1"))]);
    let cho = 0;
    for (let i = 0; i < 100 && cho < 2; i++) {
      await new Promise((r) => setTimeout(r, 30));
      cho = Number((await giu.query(
        "SELECT count(*) AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())",
      )).rows[0].n);
    }
    assert.equal(cho, 2, `hai lượt bật phải CHỜ ở khoá tư vấn toàn hệ — đo: ${cho} lượt chờ`);
    await giu.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [pr.KHOA_TRAN_PAGE_BAT]);
    kq = await hai;
  } finally { giu.release(); }
  assert.equal(kq.filter((x) => x.status === "fulfilled").length, 1, kq.map((x) => x.reason?.message || "ok").join(" | "));
  assert.equal(await demBat(), 1);
});

/* ═══════════ ④4 · worker — hàm RIÊNG, `dsPageBotTraLoi` của màn KHÔNG đổi (C1) ═══════════ */

test("GL2 W4a · 2 page bật (2 team), trần 1 ⇒ hàm worker trả [] (không null) + 1 cảnh báo có số đo; nguồn của màn VẪN thấy 2", async () => {
  coHam("dsPageBotTraLoiCoTran"); coHam("xoaNhoCanhBaoTran");
  pr.xoaNhoCanhBaoTran();
  await datCot("A", "B");
  const dong = [];
  const ds = await pr.dsPageBotTraLoiCoTran(pool, { V3_TRAN_PAGE_BAT: "1" }, { ghi: (s) => dong.push(s) });
  assert.ok(Array.isArray(ds), `phải là MẢNG — null nghĩa là MỌI page (kho.js#moPhienRut), đo: ${JSON.stringify(ds)}`);
  assert.deepEqual(ds, []);
  assert.equal(dong.length, 1, `đúng một dòng cảnh báo, đo: ${dong.length}`);
  assert.match(dong[0], /vượt trần/i);
  assert.match(dong[0], /đang bật 2\/1 page/);
  assert.match(dong[0], /V3_TRAN_PAGE_BAT=1/);
  assert.doesNotMatch(dong[0], /lỗi máy|máy đứng/i, "nói ĐÚNG lý do — không phải lỗi máy");
  assert.deepEqual(await pr.dsPageBotTraLoi(pool), [PID.A, PID.B], "nguồn của 6 màn KHÔNG bị chặn — người vận hành phải thấy page để tắt");
  assert.deepEqual(await cw.dsPageChoPhep(pool, { V3_TRAN_PAGE_BAT: "1" }), [], "worker đi qua hàm có trần");
});

test("GL2 W4b · CẢ VÒNG motLuot khi vượt: 0 lượt nạp · 0 vòng xử · tin vẫn `cho`, so_lan_thu 0 · lyDo nói vượt trần", async () => {
  pr.xoaNhoCanhBaoTran?.();
  await datCot("A", "B");
  await pool.query("DELETE FROM tin_cho_xu_ly");
  const t = await xepTin(pool, { teamId: X, pageId: PID.A, psid: "gl2-psid", convId: "gl2-conv", msgId: "gl2-m1", noiDung: "how much?" });
  let docHoi = 0; let nao = 0;
  const ket = await voiEnv({ V3_TRAN_PAGE_BAT: "1", PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, () => cw.motLuot(pool, {
    depsNap: { docHoiThoai: async () => ((docHoi += 1), []), traThe: async () => null },
    depsXuLy: { chayCloser: async () => ((nao += 1), ""), docLichSu: false },
  }));
  assert.equal(ket.nap.mo, true, "van NGUỒN phải mở thì phép đo mới nói về trần");
  assert.equal(docHoi, 0, "vượt trần mà vẫn hỏi Pancake — worker chưa dừng");
  assert.equal(ket.nap.page, 0);
  assert.equal(ket.xu.vong, 0, `vượt trần mà vẫn rút tin: ${JSON.stringify(ket.xu)}`);
  const dong = (await pool.query("SELECT trang_thai, so_lan_thu FROM tin_cho_xu_ly WHERE id=$1", [t.id])).rows[0];
  assert.deepEqual(dong, { trang_thai: "cho", so_lan_thu: 0 }, "tin tồn GIỮ ở chờ, không bị đốt lượt thử");
  assert.match(ket.nap.lyDo || "", /vượt trần/i, `lý do phải nói vượt trần, đo: ${ket.nap.lyDo}`);
  assert.equal(nao, 0);
  assert.equal(goiFetch, 0, "không một lượt gọi mạng");
});

test("GL2 W4c · CHO-QUA thật: 1 page bật (trần 1) ⇒ hàm worker trả đúng page đó; motLuot nạp + rút tin (tin rời `cho`)", async () => {
  pr.xoaNhoCanhBaoTran?.();
  await datCot("A");
  assert.deepEqual(await pr.dsPageBotTraLoiCoTran(pool, { V3_TRAN_PAGE_BAT: "1" }, { ghi: () => {} }), [PID.A]);
  await pool.query("DELETE FROM tin_cho_xu_ly");
  const t = await xepTin(pool, { teamId: X, pageId: PID.A, psid: "gl2-psid2", convId: "gl2-conv2", msgId: "gl2-m2", noiDung: "how much?" });
  let docHoi = 0; let nao = 0;
  const ket = await voiEnv({ V3_TRAN_PAGE_BAT: "1", PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, () => cw.motLuot(pool, {
    depsNap: { docHoiThoai: async () => ((docHoi += 1), []), traThe: async () => null },
    depsXuLy: { chayCloser: async () => ((nao += 1), ""), docLichSu: false },
  }));
  assert.equal(ket.nap.page, 1, `phải nạp đúng page đang bật, đo: ${JSON.stringify(ket.nap)}`);
  assert.ok(docHoi >= 1, "page trong trần phải được hỏi Pancake");
  assert.equal(ket.xu.vong, 1, `phải rút đúng 1 tin, đo: ${JSON.stringify(ket.xu)}`);
  const dong = (await pool.query("SELECT trang_thai, so_lan_thu FROM tin_cho_xu_ly WHERE id=$1", [t.id])).rows[0];
  assert.notEqual(dong.trang_thai, "cho", "tin phải rời hàng chờ (máy dev van gửi đóng ⇒ chan_guard)");
  assert.equal(dong.so_lan_thu, 1);
  assert.equal(nao, 0, "van gửi đóng ⇒ không tới bộ não");
  assert.equal(goiFetch, 0);
});

test("GL2 W4d · 100 lượt khi vượt (đồng hồ ép) ⇒ 1 dòng; +5 phút ⇒ thêm đúng 1; về trong trần ⇒ 1 dòng «về trong trần»", async () => {
  coHam("dsPageBotTraLoiCoTran");
  pr.xoaNhoCanhBaoTran();
  await datCot("A", "B");
  const dong = [];
  const env = { V3_TRAN_PAGE_BAT: "1" };
  const T0 = 1_790_000_000_000;
  for (let i = 0; i < 100; i++) await pr.dsPageBotTraLoiCoTran(pool, env, { bayGio: T0 + i * 2900, ghi: (s) => dong.push(s) });
  assert.equal(dong.length, 1, `100 lượt trong ~4,8 phút ⇒ đúng 1 dòng, đo: ${dong.length}`);
  await pr.dsPageBotTraLoiCoTran(pool, env, { bayGio: T0 + 5 * 60_000, ghi: (s) => dong.push(s) });
  assert.equal(dong.length, 2, "đủ 5 phút ⇒ nhắc lại đúng 1 dòng (nhịp, không phải câm sau lần đầu)");
  await datCot("A");
  for (let i = 0; i < 3; i++) await pr.dsPageBotTraLoiCoTran(pool, env, { bayGio: T0 + 5 * 60_000 + 1000 + i, ghi: (s) => dong.push(s) });
  assert.equal(dong.length, 3, `về trong trần ⇒ đúng 1 dòng báo chạy lại, đo: ${dong.length}`);
  assert.match(dong[2], /về trong trần/i);
});

test("GL2 W4e · 100 lượt motLuot THẬT khi vượt ⇒ console.warn ≤ 1 dòng (worker lặp ~12 lần/giây — không được ngập)", async () => {
  pr.xoaNhoCanhBaoTran?.();
  await datCot("A", "B");
  const warnCu = console.warn; const dong = [];
  console.warn = (...a) => dong.push(a.join(" "));
  try {
    await voiEnv({ V3_TRAN_PAGE_BAT: "1", PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
      for (let i = 0; i < 100; i++) {
        await cw.motLuot(pool, { boQuaNap: i % 4 !== 0, depsNap: { docHoiThoai: async () => [], traThe: async () => null }, depsXuLy: { docLichSu: false } });
      }
    });
  } finally { console.warn = warnCu; }
  const vuot = dong.filter((s) => /vượt trần/i.test(s));
  assert.ok(vuot.length <= 1, `≤ 1 dòng cảnh báo trong 100 lượt, đo: ${vuot.length}`);
  assert.equal(vuot.length, 1, "nhưng phải CÓ đúng một dòng — câm hẳn là không ai biết worker đang dừng");
});
