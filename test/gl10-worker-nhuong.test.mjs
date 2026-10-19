// PHIẾU GL10 ④4 ④8 ④10 — WORKER chỉ nạp/rút page ai_sale ĐÃ nhường (`chay-worker.js#motLuot` THẬT → `ai-sale-nhuong.js#locNhuongAiSale`,
// KHÔNG tiêm `dsChoPhep` — đi `trangThaiTran` thật) trên Postgres HỘP CÁT (`aicloser_v3_test_gl10w_p<pid>`, tự dựng tự dọn).
// Máy dev: `.env` có PANCAKE_READONLY=1 ⇒ van gửi đóng ⇒ tin rút ra là `chan_guard` trước bộ não (0 token, 0 HTTP); nguồn nạp mở bằng
// `V3_NAP_DEV=1` trên CSDL localhost (khuôn va-p7). Pancake giả qua `depsNap` (đếm lời gọi theo page). ⛔ `page_gan_them.json` và log
// ai_sale là tệp TẠM (mkdtemp) — CẤM đụng `/opt/pancake-tool` hay `/var/log`. Bật page qua `setPage` THẬT (đặt bot_bat_luc / chờ 15′).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fetchCu = globalThis.fetch;
const { dungSandbox } = await import("../db/sandbox.js");
const cw = await import("../src/queue/chay-worker.js");
const { xepTin } = await import("../src/queue/kho.js");
const { setPage } = await import("../src/admin-v3/operations.js");
const an = await import("../src/queue/ai-sale-nhuong.js").catch(() => ({}));

const GOC = fs.mkdtempSync(path.join(os.tmpdir(), "gl10-worker-"));
const TEP = path.join(GOC, "state", "chung", "page_gan_them.json");
const LOG = path.join(GOC, "log", "aisale-chat");   // tiền tố ⇒ aisale-chat.log · aisale-chat-saudi.log
const MAU = { _ghi_chu: "ghi chú", uae: { "983000000101": "AED" }, tram_landing: { "983000000301": { nha: "saudi", nuoc: [] } } };
const ghiTep = (d) => { fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, typeof d === "string" ? d : JSON.stringify(d, null, 1)); };
const docTep = () => JSON.parse(fs.readFileSync(TEP, "utf8"));
const BI_MAT = "KHACH-BI-MAT-TEN-GIA-GL10";   // tên khách trong dòng log giả — KHÔNG được lọt ra stdout/nhật ký
const ghiLog = (ten, dong) => { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(`${LOG}${ten}.log`, `${dong}\n`); };
const ENV_BAT = { V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only", V3_TRAN_PAGE_BAT: "20", V3_AI_SALE_TEP_GAN: TEP };
const PID = { A: "983000000001", B: "983000000002", C: "983000000003", D: "983000000004", E: "983000000005", F: "983000000006", G: "983000000007", H: "983000000008",
  I: "983000000009", J: "983000000010", K: "983000000011" };
const ENV_TIEN_TRINH = { V3_AI_SALE_TEP_GAN: TEP, V3_TRAN_PAGE_BAT: "20", V3_NAP_DEV: "1", V3_AI_SALE_LOG: undefined, V3_NAP_IM_BOTCAKE_MS: "0" };
const giuEnv = {};
let sb; let pool; let X; let ND; const ID = {};
const goiHt = new Map();   // page_id → số lời gọi docHoiThoai
let nao = 0;
const loCo = [];           // mọi dòng console trong tiến trình ca (soi rò dòng log ai_sale)

before(async () => {
  for (const [k, v] of Object.entries(ENV_TIEN_TRINH)) { giuEnv[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  for (const ten of ["log", "warn", "error"]) { const goc = console[ten]; console[ten] = (...a) => { loCo.push(a.join(" ")); goc(...a); }; }
  sb = await dungSandbox("gl10w");
  pool = sb.pool;
  console.log(`   [gl10w] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/ai-sale-nhuong.js", import.meta.url))} · cwd ${process.cwd()}`);
  globalThis.fetch = async (u) => { throw new Error(`ca GL10 worker: lượt gọi mạng lạ ${u}`); };
  X = String((await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id);
  ND = String((await pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl10w@thu.vn','GL10W') RETURNING id")).rows[0].id);
  for (const [k, pid] of Object.entries(PID)) {
    ID[k] = String((await pool.query("INSERT INTO page (team_id, page_id, ten, nguon_tin) VALUES ($1,$2,$3,'poll') RETURNING id", [X, pid, `GL10W ${k}`])).rows[0].id);
    const sp = (await pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [X, ID[k], `gl10w-${k}`])).rows[0].id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [X, sp]);
  }
  ghiTep(MAU);
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giuEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  fs.rmSync(GOC, { recursive: true, force: true });
  if (sb) await sb.don();
});

const bc = () => ({ teamId: X, nguoiDungId: ND });
const bat = (k) => setPage(pool, bc(), ID[k], { enabled: true }, ENV_BAT);
/** Chỉ đúng một page bật (trần đếm toàn hệ) — các page khác tắt bằng UPDATE (giữ tệp). */
const chiBat = (k) => pool.query("UPDATE page SET bot_ai_bat = (id = $1)", [ID[k]]);
const page = async (k) => (await pool.query(
  `SELECT bot_ai_bat, ai_sale_trang_thai tt, ai_sale_ly_do ly_do, ai_sale_cho_den, EXTRACT(EPOCH FROM (ai_sale_cho_den - now())) con_s,
          EXTRACT(EPOCH FROM (ai_sale_cho_den - bot_bat_luc)) cho_s FROM page WHERE id=$1`, [ID[k]])).rows[0];
const datCot = (k, sql) => pool.query(`UPDATE page SET ${sql} WHERE id=$1`, [ID[k]]);
const quaChoDen = (k) => datCot(k, "ai_sale_cho_den = now() - interval '1 second'");
let seq = 0;
const xep = async (k) => (await xepTin(pool, { teamId: X, pageId: PID[k], psid: `w-${k}-${++seq}`, convId: `w-conv-${seq}`, msgId: `w-m-${seq}`, noiDung: "how much?" })).id;
const tin = async (id) => (await pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [id])).rows[0].trang_thai;
const nhatKy = async (hd, k) => Number((await pool.query("SELECT count(*) n FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong_id=$2", [hd, PID[k]])).rows[0].n);
/** fs đếm lượt CHẠM thư mục/tệp log (readdir · stat · open — đường dưới thư mục log): vòng xử không được chạm cái nào. */
const fsDem = () => {
  const dem = { cham: 0, mo: 0 };
  const laLog = (p) => String(p).startsWith(path.dirname(LOG));
  const boc = (ten) => (p, ...a) => { if (laLog(p)) { dem.cham += 1; if (ten === "openSync") dem.mo += 1; } return fs[ten](p, ...a); };
  return { dem, fs: { ...fs, openSync: boc("openSync"), statSync: boc("statSync"), readdirSync: boc("readdirSync") } };
};
const DEPS_NAP = {
  doiGoXong: () => ({ ms: 0, reason: "ca GL10" }),
  traThe: async () => null,
  docHoiThoai: async (_pool, _ctx, { pageId }) => { goiHt.set(String(pageId), (goiHt.get(String(pageId)) || 0) + 1); return []; },
  docTin: async () => [],
};
const DEPS_XU = { chayCloser: async () => ((nao += 1), ""), docLichSu: false };
const luot = (them = {}) => cw.motLuot(pool, { depsNap: DEPS_NAP, depsXuLy: DEPS_XU, ...them });
const goi = (k) => goiHt.get(PID[k]) || 0;

/* ═══════════ ④4 · trong thời gian chờ: không nạp, không xử ═══════════ */

test("GL10 W4a · ngay sau bật: motLuot THẬT ⇒ 0 lời gọi docHoiThoai cho P, tin cho của P 0 lượt rút, trần VẪN đếm P; qua mốc chờ ⇒ nạp + rút, da_nhuong, 1 nhật ký", async () => {
  await chiBat("A");
  const r = await bat("A");
  assert.equal(r.aiSale?.trangThai, "cho");
  const p0 = await page("A");
  assert.ok(Math.abs(Number(p0.cho_s) - 900) <= 2, `chờ ${p0.cho_s} s (đòi 900 ± 2 — 600 s chu kỳ ai_sale + lượt p99 Saudi 93 s)`);
  const t = await xep("A");
  const g0 = goi("A");
  const k = await luot();
  assert.equal(goi("A") - g0, 0, "đang chờ ai_sale nhường mà vẫn hỏi Pancake");
  assert.equal(k.xu.vong, 0, `đang chờ mà vẫn rút tin: ${JSON.stringify(k.xu)}`);
  assert.equal(await tin(t), "cho");
  assert.equal(k.nap.choPhep, 1, "trần GL2 vẫn đếm page đang chờ là «bật»");
  assert.equal(k.aiSale?.cho, 1, JSON.stringify(k.aiSale));
  assert.match(k.nap.lyDo || "", /chờ ai_sale nhường/);
  await quaChoDen("A");
  const k2 = await luot();
  assert.ok(goi("A") - g0 >= 1, "qua mốc chờ ⇒ phải nạp page");
  assert.equal(k2.xu.vong, 1, `qua mốc chờ ⇒ rút đúng tin chờ, đo ${JSON.stringify(k2.xu)}`);
  assert.notEqual(await tin(t), "cho");
  assert.equal((await page("A")).tt, "da_nhuong");
  assert.equal(await nhatKy("ai_sale_da_nhuong", "A"), 1);
  assert.equal(nao, 0, "van gửi đóng ⇒ không tới bộ não");
});

test("GL10 W4b · BỐN motLuot SONG SONG như main (1 nạp + 3 xử) lúc qua mốc chờ ⇒ ĐÚNG MỘT nhật ký ai_sale_da_nhuong; vòng xử KHÔNG mở tệp log", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("B");
    await bat("B");
    await datCot("B", "bot_bat_luc = now() - interval '12 minutes'");   // cửa sổ log đã mở ⇒ vòng nạp có đọc log
    an.quenLogAiSale?.();
    ghiLog("", "khởi động");
    await luot({ boQuaXu: true });   // vòng nạp đầu: offset = EOF
    ghiLog("", "dòng không liên quan page nào");
    await quaChoDen("B");
    const d = [fsDem(), fsDem(), fsDem(), fsDem()];
    await Promise.all([
      cw.motLuot(pool, { boQuaXu: true, depsNap: DEPS_NAP, depsNhuong: { fs: d[0].fs } }),
      cw.motLuot(pool, { boQuaNap: true, depsXuLy: DEPS_XU, depsNhuong: { fs: d[1].fs } }),
      cw.motLuot(pool, { boQuaNap: true, depsXuLy: DEPS_XU, depsNhuong: { fs: d[2].fs } }),
      cw.motLuot(pool, { boQuaNap: true, depsXuLy: DEPS_XU, depsNhuong: { fs: d[3].fs } }),
    ]);
    assert.equal(await nhatKy("ai_sale_da_nhuong", "B"), 1, "bốn vòng — đúng một lần chuyển");
    assert.equal((await page("B")).tt, "da_nhuong");
    assert.ok(d[0].dem.mo >= 1, `vòng NẠP phải đọc phần mới của log, đo ${JSON.stringify(d[0].dem)}`);
    for (const i of [1, 2, 3]) assert.equal(d[i].dem.cham, 0, `vòng XỬ ${i} chạm log ${JSON.stringify(d[i].dem)} (đòi 0 — không quét log 9 tệp mỗi 250 ms)`);
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W4c · HAI vòng NẠP song song (chạy tay V3_WORKER_MOT_LUOT=1 lúc dịch vụ đang chạy) cùng đọc «cho, qua mốc» TRƯỚC khi ai ghi ⇒ UPDATE có điều kiện ⇒ ĐÚNG MỘT nhật ký", async () => {
  await chiBat("B");
  await datCot("B", "ai_sale_trang_thai = 'cho'");
  await quaChoDen("B");
  const truoc = await nhatKy("ai_sale_da_nhuong", "B");
  // rào: câu UPDATE chuyển trạng thái chỉ chạy khi CẢ HAI vòng đã đọc dòng page (cả hai thấy «cho») — tất định, không trông lịch Node
  let soDoc = 0; let mo; const du = new Promise((ok) => { mo = ok; });
  const poolRao = {
    connect: () => pool.connect(),
    query: async (sql, a) => {
      const t = String(sql?.text ?? sql);
      if (/FROM page WHERE bot_ai_bat = true AND page_id = ANY/.test(t)) { const r = await pool.query(sql, a); if (++soDoc >= 2) mo(); return r; }
      if (/^\s*UPDATE page SET ai_sale_trang_thai/.test(t)) await Promise.race([du, new Promise((ok) => setTimeout(ok, 3000))]);
      return pool.query(sql, a);
    },
  };
  await Promise.all([1, 2].map(() => cw.motLuot(poolRao, { boQuaXu: true, depsNap: DEPS_NAP })));
  assert.equal(soDoc, 2, "cả hai vòng phải đọc dòng page");
  assert.equal(await nhatKy("ai_sale_da_nhuong", "B") - truoc, 1, "hai vòng cùng thấy «cho» ⇒ chỉ MỘT lần chuyển (WHERE ai_sale_trang_thai = cũ)");
  assert.equal((await page("B")).tt, "da_nhuong");
});

/* ═══════════ ④8 · khoá mất / tệp hỏng / gắn tay giữa chừng ═══════════ */

test("GL10 W8 · P da_nhuong: xoá _v3[P] ⇒ vòng XỬ kế đã 0 rút, vòng nạp ⇒ mat_khoa; ghi lại ⇒ cho 15′; tệp hỏng ⇒ loi_tep; P vào uae ⇒ gan_tay; gỡ ⇒ cho 15′", async () => {
  await chiBat("C");
  await bat("C");
  await quaChoDen("C");
  await luot({ boQuaXu: true });
  assert.equal((await page("C")).tt, "da_nhuong");
  const coKhoa = docTep();
  // ① mất khoá (mô phỏng mất-ghi bởi tu_gan_page_ngoai)
  const { _v3, ...matKhoa } = coKhoa;
  ghiTep({ ...matKhoa, ...(Object.keys(_v3).length > 1 ? { _v3: Object.fromEntries(Object.entries(_v3).filter(([p]) => p !== PID.C)) } : {}) });
  const t1 = await xep("C");
  const kx = await luot({ boQuaNap: true });
  assert.equal(kx.xu.vong, 0, "vòng XỬ phải kiểm khoá mỗi vòng (qua đệm mtime/size), không đợi vòng nạp");
  await luot({ boQuaXu: true });
  assert.equal((await page("C")).tt, "mat_khoa");
  assert.equal((await luot()).xu.vong, 0); assert.equal(await tin(t1), "cho");
  assert.equal(await nhatKy("ai_sale_mat_khoa", "C"), 1);
  // ② khoá có lại ⇒ chờ lại TRỌN 15′
  ghiTep(coKhoa);
  await luot({ boQuaXu: true });
  const p2 = await page("C");
  assert.equal(p2.tt, "cho");
  assert.ok(Number(p2.con_s) > 895 && Number(p2.con_s) <= 901, `chờ lại ${p2.con_s} s (đòi ≈ 900)`);
  assert.equal((await luot()).xu.vong, 0);
  // ③ tệp hỏng ⇒ loi_tep
  await quaChoDen("C"); await luot({ boQuaXu: true });
  assert.equal((await page("C")).tt, "da_nhuong");
  ghiTep('{"uae": {');
  assert.equal((await luot()).xu.vong, 0, "tệp hỏng ⇒ 0 lượt rút");
  assert.equal((await page("C")).tt, "loi_tep");
  // ④ gắn tay (P vào uae, _v3 giữ) ⇒ gan_tay; gỡ ⇒ cho 15′
  ghiTep(coKhoa); await luot({ boQuaXu: true }); await quaChoDen("C"); await luot({ boQuaXu: true });
  assert.equal((await page("C")).tt, "da_nhuong");
  ghiTep({ ...coKhoa, uae: { ...coKhoa.uae, [PID.C]: "AED — gắn tay" } });
  assert.equal((await luot()).xu.vong, 0, "gắn tay ⇒ ai_sale trả lời lại ⇒ v3 im");
  const p4 = await page("C");
  assert.equal(p4.tt, "gan_tay"); assert.match(p4.ly_do, /uae/);
  ghiTep(coKhoa);
  await luot({ boQuaXu: true });
  const p5 = await page("C");
  assert.equal(p5.tt, "cho"); assert.ok(Number(p5.con_s) > 895, `gỡ gắn tay ⇒ chờ lại 15′, đo ${p5.con_s} s`);
  assert.equal(await tin(t1), "cho", "suốt quãng mất khoá/hỏng/gắn tay tin KHÔNG bị rút");
});

test("GL10 W8b · bật 40′ trước, mất khoá rồi có lại ⇒ cho với MỐC BẬT ĐẶT LẠI: log ai_sale còn chạm page (nó trả lời lúc mất khoá) KHÔNG đẩy sang chua_nhuong (chờ lại TRỌN)", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("I"); await bat("I");
    await datCot("I", "bot_bat_luc = now() - interval '40 minutes'"); await quaChoDen("I");
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });
    assert.equal((await page("I")).tt, "da_nhuong");
    const coKhoa = docTep();
    const { _v3, ...matKhoa } = coKhoa;
    ghiTep({ ...matKhoa, _v3: Object.fromEntries(Object.entries(_v3).filter(([pp]) => pp !== PID.I)) });
    await luot({ boQuaXu: true });
    assert.equal((await page("I")).tt, "mat_khoa");
    ghiTep(coKhoa);
    await luot({ boQuaXu: true });
    const tuoi = Number((await pool.query("SELECT EXTRACT(EPOCH FROM (now() - bot_bat_luc)) s FROM page WHERE id=$1", [ID.I])).rows[0].s);
    assert.equal((await page("I")).tt, "cho");
    assert.ok(tuoi < 30, `khoá có lại ⇒ mốc bật đặt lại, tuổi ${tuoi} s`);
    ghiLog("", `✔ ${PID.I}/${PID.I}_42 ${BI_MAT} (ai_sale trả lời lúc mất khoá)`);
    await luot({ boQuaXu: true });
    assert.equal((await page("I")).tt, "cho", "mốc cũ (40′) ⇒ quá 30′ ⇒ chua_nhuong oan — bot v3 im vĩnh viễn");
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

/* ═══════════ ④10 · log ai_sale ═══════════ */

test("GL10 W10a · dòng chứa page id ghi SAU khi cửa sổ mở ⇒ ai_sale_cho_den lùi ≥ 2′ và lý do có giờ VN", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("D"); await bat("D");
    await datCot("D", "bot_bat_luc = now() - interval '11 minutes', ai_sale_cho_den = now() + interval '30 seconds'");
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });
    ghiLog("-saudi", `✔ 12:01 ${PID.D}/${PID.D}_7788 ${BI_MAT} hỏi giá`);
    await luot({ boQuaXu: true });
    const p = await page("D");
    assert.equal(p.tt, "cho");
    assert.ok(Number(p.con_s) >= 115, `log thấy page ⇒ chờ thêm ≥ 2′, còn ${p.con_s} s`);
    assert.match(p.ly_do, /ai_sale còn chạm page lúc \d\d:\d\d \(giờ VN\)/);
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10b · bật > 30′ mà log VẪN thấy ⇒ chua_nhuong, 0 lượt rút, KHÔNG gia hạn nữa (cả khi log thấy tiếp)", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("E"); await bat("E");
    await datCot("E", "bot_bat_luc = now() - interval '31 minutes', ai_sale_cho_den = now() + interval '1 minute'");   // vẫn «cho»
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });
    ghiLog("", `🏷 ${PID.E}/${PID.E}_1 'AI CHAT' ${BI_MAT}`);
    const t = await xep("E");
    assert.equal((await luot()).xu.vong, 0);
    const p = await page("E");
    assert.equal(p.tt, "chua_nhuong"); assert.match(p.ly_do, /chưa nhường sau 30′/);
    const den = new Date(p.ai_sale_cho_den).getTime();
    ghiLog("", `🏷 ${PID.E}/${PID.E}_2 ${BI_MAT}`);
    assert.equal((await luot()).xu.vong, 0);
    const p2 = await page("E");
    assert.equal(p2.tt, "chua_nhuong", "chua_nhuong chỉ người tắt/bật lại mới gỡ");
    assert.equal(new Date(p2.ai_sale_cho_den).getTime(), den, "chua_nhuong ⇒ NGỪNG gia hạn");
    assert.equal(await tin(t), "cho");
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10c · biến log VẮNG ⇒ chỉ chờ theo giờ (dòng log chứa page id không làm gì)", async () => {
  delete process.env.V3_AI_SALE_LOG;
  await chiBat("F"); await bat("F");
  await datCot("F", "bot_bat_luc = now() - interval '16 minutes'");
  ghiLog("", `✔ ${PID.F}/${PID.F}_9 ${BI_MAT}`);
  await quaChoDen("F");
  await luot({ boQuaXu: true });
  assert.equal((await page("F")).tt, "da_nhuong");
});

test("GL10 W10d · P da_nhuong, bật 2 GIỜ trước, log ghi dòng chứa page id ⇒ chua_nhuong «chạm lại», 0 lượt rút (cửa sổ KHÔNG đóng)", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("G"); await bat("G");
    await datCot("G", "bot_bat_luc = now() - interval '2 hours'");
    await quaChoDen("G");
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });
    assert.equal((await page("G")).tt, "da_nhuong");
    ghiLog("-saudi", `✔ ${PID.G}/${PID.G}_5 ${BI_MAT}`);
    const t = await xep("G");
    assert.equal((await luot()).xu.vong, 0, "ai_sale chạm lại ⇒ v3 im thay vì hai bot");
    const p = await page("G");
    assert.equal(p.tt, "chua_nhuong"); assert.match(p.ly_do, /ai_sale chạm lại page lúc \d\d:\d\d \(giờ VN\)/);
    assert.equal(await tin(t), "cho");
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10e · log có SẴN dòng chứa page id TRƯỚC khi worker khởi động (giả restart) ⇒ không gia hạn, không chua_nhuong (offset = EOF)", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("H"); await bat("H");
    await datCot("H", "bot_bat_luc = now() - interval '40 minutes'");
    ghiLog("-saudi", `✔ ${PID.H}/${PID.H}_3 ${BI_MAT} (ngày ai_sale còn trông page)`);
    an.quenLogAiSale?.();   // restart: offset RAM mất
    await quaChoDen("H");
    await luot({ boQuaXu: true });
    const p = await page("H");
    assert.equal(p.tt, "da_nhuong", `offset sau restart phải = EOF, đo ${p.tt} · ${p.ly_do}`);
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10g · dòng có page id DÍNH chữ số (psid/mã dài hơn chứa pid) · khối «🚨 BỎ QUA … KHÔNG thuộc shop» + dòng tên kế (ai_sale ĐÃ bỏ page) ⇒ KHÔNG tính; dòng hội thoại thật ⇒ tính", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("J"); await bat("J");
    await datCot("J", "bot_bat_luc = now() - interval '11 minutes', ai_sale_cho_den = now() + interval '30 seconds'");
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });
    ghiLog("-saudi", `✔ psid 7${PID.J}9 · đơn ${PID.J}00 ${BI_MAT}`);
    ghiLog("-saudi", "  🚨 BỎ QUA 1 page KHÔNG thuộc shop saudi — chúng nằm nhầm trong state/saudi/page_tokens.json:");
    ghiLog("-saudi", `     ${PID.J}`);
    await luot({ boQuaXu: true });
    const p1 = await page("J");
    assert.equal(p1.tt, "cho");
    assert.ok(Number(p1.con_s) < 60, `không dòng nào là ai_sale CHẠM page ⇒ không gia hạn, còn ${p1.con_s} s`);
    ghiLog("-saudi", `✔ 10:01 ${PID.J}/${PID.J}_55 ${BI_MAT} hỏi giá`);
    await luot({ boQuaXu: true });
    assert.ok(Number((await page("J")).con_s) >= 115, "dòng hội thoại thật ⇒ gia hạn");
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10h · tệp log ĐỔI TÊN (logrotate dateext, cùng inode) + tệp mới cùng tên ⇒ KHÔNG đọc lại log cũ (offset theo inode)", async () => {
  process.env.V3_AI_SALE_LOG = LOG;
  try {
    await chiBat("K"); await bat("K");
    await datCot("K", "bot_bat_luc = now() - interval '11 minutes', ai_sale_cho_den = now() + interval '30 seconds'");
    ghiLog("-xoay", `✔ ${PID.K}/${PID.K}_1 ${BI_MAT} (ngày ai_sale còn trông page)`);
    an.quenLogAiSale?.(); await luot({ boQuaXu: true });   // offset = EOF
    fs.renameSync(`${LOG}-xoay.log`, `${LOG}-xoay-20261020.log`);
    ghiLog("-xoay", "dòng mới không liên quan");
    await luot({ boQuaXu: true });
    const p = await page("K");
    assert.equal(p.tt, "cho");
    assert.ok(Number(p.con_s) < 60, `tệp đổi tên bị đọc lại từ 0 ⇒ gia hạn oan, còn ${p.con_s} s`);
  } finally { delete process.env.V3_AI_SALE_LOG; }
});

test("GL10 W10f · KHÔNG dòng log ai_sale nào (tên khách) lọt ra stdout/stderr hay nhật ký", async () => {
  assert.ok(fs.readFileSync(`${LOG}-saudi.log`, "utf8").includes(BI_MAT), "(log giả có tên khách)");
  const ro = loCo.filter((s) => s.includes(BI_MAT));
  assert.deepEqual(ro, [], "dòng log ai_sale lọt ra console");
  const nk = (await pool.query("SELECT count(*) n FROM nhat_ky WHERE ghi_chu LIKE $1 OR sau::text LIKE $1 OR truoc::text LIKE $1", [`%${BI_MAT}%`])).rows[0].n;
  assert.equal(Number(nk), 0, "dòng log ai_sale lọt vào nhật ký");
  const ld = (await pool.query("SELECT count(*) n FROM page WHERE ai_sale_ly_do LIKE $1", [`%${BI_MAT}%`])).rows[0].n;
  assert.equal(Number(ld), 0, "dòng log ai_sale lọt vào ai_sale_ly_do");
});
