// PHIẾU GL3b ④4b — BỘ NẠP gặp đọc lịch sử lỗi: bỏ ĐÚNG hội thoại đó ở vòng này (không ghi mốc, không bỏ cả page), ghi sổ
// bỏ-qua `doc_tin_loi` (migration 033 nới CHECK — một dòng sai CHECK xoá trắng dấu vết bỏ-qua CẢ vòng), lùi theo hội thoại
// 30 s·2ⁿ (trần 5′), đếm `docTinLoi` và IN trong dòng log vòng.
//
// Đường đi THẬT: `chay-worker#motLuot` → `nap#napTuPoll` → cửa `docHoiThoai`/`docTin` THẬT → `pancake.js` (pkGetConversations ·
// pkTagId · pkDocTin) → fetch GIẢ (chỉ host pages.fm). Tiêm ĐÚNG hai thứ mà bộ nạp vốn mở cửa tiêm: đồng hồ (`dongHo`) và độ
// chờ-gõ-xong (`doiGoXong` = 0) — để ca không phải ngủ 30 s. Hộp cát Postgres riêng (`db/sandbox.js`, migration 033 áp ở đây).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { xuong, len } from "../db/migrate.js";
// Nhập kiểu namespace: base chưa export `inLuot` thì ca vẫn chạy và ĐỎ đúng chỗ (dòng log), không chết lúc nạp module.
import * as chayWorker from "../src/queue/chay-worker.js";
import { quenMoc, quenChoGo } from "../src/queue/nap.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens } from "../src/pancake.js";

const PAGE = "gl3b-nap-page";
const ENV = {
  PANCAKE_READONLY: "0",            // chỉ trong tiến trình ca — mở van NGUỒN của bộ nạp; .env vẫn =1
  V3_PANCAKE_HAN_DOC_MS: "150",
  V3_NAP_THE_CHAN: "Đã gửi",
  V3_NAP_CHI_CHUA_DOC: "0",         // đặt TƯỜNG MINH: vắng trong process.env thì bộ nạp tra tiếp `.env`
  V3_NAP_IM_BOTCAKE_MS: "0",
};
const envCu = {};
const cauHinhCu = {};
const goi = [];
const loiConv = new Set(["c-loi"]); // hội thoại mà Pancake trả 502 HTML cho GET …/messages
let sb;
let team;
let dongHo = 1_000_000_000;

const tl = (j) => ({ status: 200, json: async () => j });
const conv = (id, psid, them = {}) => ({
  id, from_psid: psid, customers: [{ id: `cust-${psid}` }],
  last_sent_by: { id: psid, name: "Khách" },          // khách nói cuối
  last_customer_interactive_at: "2026-10-07T01:00:00",
  snippet: "how much?", tags: [], ...them,
});
let CONVS = [conv("c-the", "ps-the", { tags: [-2] }), conv("c-loi", "ps-loi"), conv("c-ok", "ps-ok")];

before(async () => {
  sb = await dungSandbox("gl3b_nap");
  console.log(`   [gl3b] hộp cát ${sb.ten}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,'GL3b nạp','poll',true)",
    [team, PAGE],
  );
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3b: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const m = /\/conversations\/([^/]+)\/messages$/.exec(url.pathname);
    goi.push({ method, path: url.pathname, conv: m ? m[1] : "" });
    if (method !== "GET") return tl({ success: true });
    if (url.pathname.endsWith(`/pages/${PAGE}/conversations`)) return tl({ conversations: CONVS });
    if (url.pathname.endsWith(`/pages/${PAGE}/settings`)) return tl({ settings: { tags: [{ id: 3, text: "Đã gửi" }] } });
    if (m && loiConv.has(m[1])) return { status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } };
    if (m) {
      const psid = CONVS.find((c) => c.id === m[1])?.from_psid;
      return tl({ messages: [{ id: `m-${m[1]}-1`, from: { id: psid, name: "Khách" }, message: "how much?" }] });
    }
    return tl({});
  };
  cauHinhCu.pancakeToken = config.pancakeToken;
  cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = "";
  config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  assert.equal(listPancakeTokens().filter((t) => !t.expired).length, 2, "đúng 2 token giả");
  for (const [k, v] of Object.entries(ENV)) {
    envCu[k] = process.env[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  quenMoc();
  quenChoGo();
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  await sb?.don();
});

const docMsg = (c) => goi.filter((g) => g.method === "GET" && g.conv === c).length;
async function vong(luc, { goXongMs = 0 } = {}) {
  dongHo = luc;
  const ket = await chayWorker.motLuot(sb.pool, {
    dsChoPhep: async () => [PAGE],
    dsPage: async () => [PAGE],
    depsNap: { doiGoXong: () => ({ ms: goXongMs, reason: "ca GL3b" }), dongHo: () => dongHo },
    boQuaXu: true,
  });
  const dong = [];
  const logCu = console.log;
  console.log = (...a) => dong.push(a.join(" "));
  try {
    if (typeof chayWorker.inLuot === "function") chayWorker.inLuot(ket);
    else dong.push("(chay-worker.js không export inLuot — không đo được dòng log)");
  } finally { console.log = logCu; }
  return { nap: ket.nap, log: dong.join("\n") };
}
const hang = async () => (await sb.pool.query("SELECT conv_id FROM tin_cho_xu_ly WHERE page_id=$1 ORDER BY conv_id", [PAGE])).rows.map((r) => r.conv_id);
const boQua = async () => Object.fromEntries((await sb.pool.query(
  "SELECT conv_id, ly_do, so_lan, chu_thich FROM nap_bo_qua WHERE page_id=$1", [PAGE])).rows.map((r) => [r.conv_id, r]));

test("GL3b N1 · vòng 1: c-ok vào hàng · c-loi KHÔNG vào hàng (sổ `doc_tin_loi`) · dòng `the_chan` cùng vòng VẪN còn · docTinLoi=1 · log in trường", { timeout: 20_000 }, async () => {
  const { nap, log } = await vong(1_000_000_000);
  const bq = await boQua();
  console.log(`   [gl3b] N1 nap=${JSON.stringify(nap)} · hàng=${await hang()} · bỏ-qua=${JSON.stringify(Object.fromEntries(Object.entries(bq).map(([k, v]) => [k, v.ly_do])))} · GET c-loi=${docMsg("c-loi")} · log «${log}»`);
  assert.equal(nap.loi, 0, "một hội thoại lỗi KHÔNG được làm hỏng cả page");
  assert.deepEqual(await hang(), ["c-ok"], "c-ok (đứng SAU c-loi) vẫn vào hàng; c-loi thì không");
  assert.equal(docMsg("c-loi"), 1, "c-loi thật sự được đọc (502 ⇒ 1 lượt, không xoay)");
  assert.equal(docMsg("c-the"), 0);
  assert.equal(bq["c-loi"]?.ly_do, "doc_tin_loi", "sổ bỏ-qua phải có dòng c-loi `doc_tin_loi` (CHECK của 033)");
  assert.match(bq["c-loi"].chu_thich, /Pancake lỗi \(HTTP 502\)/);
  assert.equal(bq["c-the"]?.ly_do, "the_chan", "dòng bỏ-qua của hội thoại KHÁC cùng vòng không được mất theo");
  assert.equal(bq["c-ok"], undefined, "đã nạp ⇒ không còn dòng bỏ-qua");
  assert.equal(nap.docTinLoi, 1);
  assert.equal(nap.them, 1);
  assert.equal(nap.boQuaThe, 1);
  assert.match(log, /1 đọc-tin-lỗi/, "dòng log vòng phải IN số hội thoại đọc lỗi");
});

test("GL3b N2 · vòng sau TRONG thời gian lùi (t+10 s) ⇒ KHÔNG gọi docTin cho c-loi, sổ vẫn `doc_tin_loi` (so_lan +1)", { timeout: 20_000 }, async () => {
  const g0 = docMsg("c-loi");
  const { nap } = await vong(1_000_010_000);
  const bq = await boQua();
  console.log(`   [gl3b] N2 GET c-loi +${docMsg("c-loi") - g0} · bỏ-qua c-loi=${bq["c-loi"]?.ly_do}/${bq["c-loi"]?.so_lan} · docTinLoi=${nap.docTinLoi}`);
  assert.equal(docMsg("c-loi") - g0, 0, "đang lùi ⇒ không đọc lại");
  assert.equal(bq["c-loi"]?.ly_do, "doc_tin_loi");
  assert.equal(bq["c-loi"].so_lan, 2);
  assert.equal(nap.docTinLoi, 1, "vẫn đếm: hội thoại vẫn chưa được phục vụ");
  assert.deepEqual(await hang(), ["c-ok"]);
});

test("GL3b N3 · quá mốc lùi 30 s mà Pancake VẪN lỗi ⇒ đọc lại đúng 1 lần, rồi lùi GẤP ĐÔI (60 s): t+89 s chưa đọc", { timeout: 20_000 }, async () => {
  const g0 = docMsg("c-loi");
  await vong(1_000_031_000);
  assert.equal(docMsg("c-loi") - g0, 1, "hết lùi ⇒ đọc lại (mốc KHÔNG bị ghi lúc lỗi, nên không rơi vào `moc_cu`)");
  await vong(1_000_089_000);
  console.log(`   [gl3b] N3 GET c-loi +${docMsg("c-loi") - g0} sau hai vòng (t+31 s · t+89 s)`);
  assert.equal(docMsg("c-loi") - g0, 1, "lỗi lần 2 ⇒ lùi 60 s (t+31 → t+91) ⇒ t+89 chưa đọc");
  assert.equal((await boQua())["c-loi"]?.ly_do, "doc_tin_loi");
});

test("GL3b N4 · quá mốc lùi + Pancake đã lành ⇒ c-loi vào hàng (tin không mất), dòng bỏ-qua xoá, docTinLoi=0", { timeout: 20_000 }, async () => {
  loiConv.delete("c-loi");
  const g0 = docMsg("c-loi");
  const { nap } = await vong(1_000_092_000);
  const bq = await boQua();
  console.log(`   [gl3b] N4 GET c-loi +${docMsg("c-loi") - g0} · hàng=${await hang()} · bỏ-qua c-loi=${bq["c-loi"]?.ly_do ?? "(không)"} · nap=${JSON.stringify(nap)}`);
  assert.equal(docMsg("c-loi") - g0, 1);
  assert.deepEqual(await hang(), ["c-loi", "c-ok"]);
  assert.equal(bq["c-loi"], undefined);
  assert.equal(nap.docTinLoi, 0);
  assert.equal(nap.them, 1);
});

test("GL3b N6 · hết lùi ⇒ đọc NGAY ở vòng đầu tiên quá mốc (không bắt khách chờ gõ xong LẦN NỮA) — chờ gõ thật 5 s", { timeout: 20_000 }, async () => {
  CONVS = [conv("c-cho", "ps-cho", { last_customer_interactive_at: "2026-10-07T02:00:00" })];
  loiConv.add("c-cho");
  const t = 2_000_000_000;
  await vong(t, { goXongMs: 5_000 });                 // thấy lần đầu ⇒ chờ gõ xong
  const g1 = docMsg("c-cho");
  await vong(t + 5_000, { goXongMs: 5_000 });         // đủ 5 s ⇒ đọc ⇒ lỗi ⇒ lùi tới t+35 s
  const g2 = docMsg("c-cho");
  loiConv.delete("c-cho");
  const { nap } = await vong(t + 35_001, { goXongMs: 5_000 });
  const g3 = docMsg("c-cho");
  console.log(`   [gl3b] N6 GET c-cho: thấy=${g1} · đủ-chờ=${g2} · hết-lùi=${g3} · them=${nap.them} · dangChoGo=${nap.dangChoGo ?? "?"}`);
  assert.equal(g1, 0, "vòng đầu chỉ chờ gõ, chưa đọc");
  assert.equal(g2, 1);
  assert.equal(g3, 2, "hết lùi phải đọc ngay — không đặt lại đồng hồ chờ gõ (lịch lùi 30 s·2ⁿ là lịch THẬT)");
  assert.equal(nap.them, 1);
});

test("GL3b N7 · sự cố MỚI (lần lỗi trước đã hết lùi từ lâu) ⇒ lùi lại từ 30 s, không mang lần lùi cao của sự cố cũ", { timeout: 20_000 }, async () => {
  const khach = (moc) => conv("c-cu", "ps-cu", { last_customer_interactive_at: moc });
  CONVS = [khach("2026-10-07T03:00:00")];
  loiConv.add("c-cu");
  const t = 3_000_000_000;
  await vong(t);                                        // lỗi lần 1 ⇒ lùi 30 s
  await vong(t + 31_000);                               // lỗi lần 2 ⇒ lùi 60 s (tới t+91 s)
  CONVS = [{ ...khach("2026-10-07T03:00:00"), last_sent_by: { admin_id: PAGE, id: PAGE, admin_name: "Sale" } }];
  await vong(t + 100_000);                              // sale trả lời ⇒ page nói cuối (không đọc)
  CONVS = [khach("2026-10-07T04:00:00")];               // một giờ sau khách nhắn lại, Pancake chập một nhịp
  const g0 = docMsg("c-cu");
  await vong(t + 3_700_000);                            // lỗi ⇒ sự cố mới ⇒ lùi 30 s
  await vong(t + 3_731_000);
  console.log(`   [gl3b] N7 GET c-cu sau một giờ: +${docMsg("c-cu") - g0} (hai vòng: t+3700 s · t+3731 s)`);
  assert.equal(docMsg("c-cu") - g0, 2, "sự cố mới lùi 30 s ⇒ t+3731 s đọc lại (mang lần cũ thì lùi 120 s, chưa đọc)");
  loiConv.delete("c-cu");
});

test("GL3b N5 · migration 033: hộp cát có dòng `doc_tin_loi` ⇒ `down` THÀNH (xoá dòng trước khi dựng CHECK cũ) ⇒ `up` lại THÀNH", { timeout: 30_000 }, async () => {
  await sb.pool.query(
    "INSERT INTO nap_bo_qua(team_id,page_id,conv_id,psid,ly_do) VALUES($1,$2,'c-mig','ps-mig','doc_tin_loi')",
    [team, PAGE],
  );
  // Gỡ LÙI tới khi 033 rời `_migrations` — trần = số bản đã áp. Bản đầu gỡ ĐÚNG MỘT lần (neo «033 là bản chót») ⇒ GL4 thêm 034
  // là ca đỏ oan vì thước ngắn (cùng bài học cr1509-luoi-migration · l2-m1-hang-doi).
  const tran = Number((await sb.pool.query("SELECT count(*)::int n FROM _migrations")).rows[0].n);
  const go = [];
  for (let i = 0; i < tran && !go.includes("033_nap_bo_qua_doc_tin_loi"); i++) {
    const g = await xuong(sb.pool, { im: true });
    if (!g.length) break;
    go.push(...g);
  }
  const conLai = Number((await sb.pool.query("SELECT count(*) n FROM nap_bo_qua WHERE ly_do='doc_tin_loi'")).rows[0].n);
  let tuChoi = "";
  try {
    await sb.pool.query("INSERT INTO nap_bo_qua(team_id,page_id,conv_id,ly_do) VALUES($1,$2,'c-mig2','doc_tin_loi')", [team, PAGE]);
  } catch (e) { tuChoi = e.constraint || e.message; }
  const ap = await len(sb.pool, { im: true });
  await sb.pool.query(
    "INSERT INTO nap_bo_qua(team_id,page_id,conv_id,ly_do) VALUES($1,$2,'c-mig3','doc_tin_loi')", [team, PAGE]);
  let la = "";
  try {
    await sb.pool.query("INSERT INTO nap_bo_qua(team_id,page_id,conv_id,ly_do) VALUES($1,$2,'c-mig4','ly_do_la')", [team, PAGE]);
  } catch (e) { la = e.constraint || e.message; }
  console.log(`   [gl3b] N5 gỡ=${go} · còn doc_tin_loi sau gỡ=${conLai} · CHECK cũ từ chối=${tuChoi} · áp=${ap} · lý do lạ bị từ chối=${la}`);
  assert.ok(go.includes("033_nap_bo_qua_doc_tin_loi"), `phải gỡ được 033 (đã gỡ: ${go.join(", ") || "không"})`);
  assert.equal(conLai, 0);
  assert.equal(tuChoi, "nap_bo_qua_ly_do_check", "sau down: CHECK cũ (6 mã) đã dựng lại");
  assert.ok(ap.includes("033_nap_bo_qua_doc_tin_loi"), `up lại phải áp 033 (đã áp: ${ap.join(", ") || "không"})`);
  assert.equal(la, "nap_bo_qua_ly_do_check", "sau up: CHECK vẫn chặn mã lạ (nới đúng một mã)");
});
