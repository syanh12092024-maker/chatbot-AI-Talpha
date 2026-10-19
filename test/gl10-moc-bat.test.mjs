// PHIẾU GL10 ④5 — MỐC BẬT: bộ nạp (`nap.js#napTuPoll`) chỉ nạp tin khách CHỨNG MINH được là đến SAU `page.bot_bat_luc`.
// Bẫy đo prod 15/10: Pancake trả giờ UTC KHÔNG kèm múi (`2026-10-15T09:31:58` / `….000000`); máy prod Europe/Berlin (+0200) ⇒
// `Date.parse` hiểu là giờ ĐỊA PHƯƠNG, lệch −2 giờ ⇒ so thẳng với mốc là bot câm 2 giờ đầu sau khi bật.
// CHẠY DƯỚI CẢ `TZ=Europe/Berlin` LẪN `TZ=UTC` (cổng gl10.sh chạy hai lượt); `npm test` không đặt TZ ⇒ tệp tự ép Europe/Berlin (múi
// có bẫy — dưới UTC đột biến «Date.parse thẳng» KHÔNG đỏ được). Hộp cát Postgres riêng; Pancake giả qua `deps` của bộ nạp.
process.env.TZ ||= "Europe/Berlin";
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import { napTuPoll, quenMoc, quenChoGo, gomCumTinKhach } from "../src/queue/nap.js";

const T = Date.UTC(2026, 9, 15, 9, 0, 0);   // mốc bật
const khongMui = (ms, le = false) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, le ? ".000000" : "");   // dạng Pancake THẬT
const phut = (n) => T + n * 60_000;
const ENV = { V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0", V3_NAP_CHI_CHUA_DOC: "0", V3_NAP_THE_CHAN: "Đã gửi" };
const PG = "984000000001"; const PG0 = "984000000002";
const giu = {};
let sb; let team;
const goiTin = new Map();

before(async () => {
  for (const [k, v] of Object.entries(ENV)) { giu[k] = process.env[k]; process.env[k] = v; }
  sb = await dungSandbox("gl10m");
  console.log(`   [gl10m] TZ=${process.env.TZ} · lệch máy ${new Date(T).getTimezoneOffset()}′ · hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/nap.js", import.meta.url))}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query("INSERT INTO page (team_id, page_id, ten, nguon_tin, bot_ai_bat, bot_bat_luc) VALUES ($1,$2,'GL10 mốc','poll',true,$3)", [team, PG, new Date(T)]);
  await sb.pool.query("INSERT INTO page (team_id, page_id, ten, nguon_tin, bot_ai_bat) VALUES ($1,$2,'GL10 không mốc','poll',true)", [team, PG0]);
});
after(async () => {
  for (const [k, v] of Object.entries(giu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  await sb?.don();
});

const hoi = (psid, moc, { le = false } = {}) => ({
  id: `conv-${psid}`, from_psid: psid, customers: [{ id: `cust-${psid}` }], tags: [], snippet: "how much?",
  last_customer_interactive_at: typeof moc === "number" ? khongMui(moc) : moc, updated_at: typeof moc === "number" ? khongMui(moc, true) : moc,
  last_sent_by: { id: psid, name: "Khách" },
});
const tinKhach = (psid, ms, chu, le = true) => ({ id: `m-${psid}-${ms}`, from: { id: psid, name: "Khách" }, message: chu, inserted_at: typeof ms === "number" ? khongMui(ms, le) : ms });
function deps(convs, msgs) {
  return {
    doiGoXong: () => ({ ms: 0, reason: "ca GL10" }), traThe: async () => null,
    docHoiThoai: async () => convs,
    docTin: async (_p, _c, { psid }) => { goiTin.set(psid, (goiTin.get(psid) || 0) + 1); return msgs[psid] || []; },
  };
}
const hang = async (psid) => (await sb.pool.query("SELECT noi_dung FROM tin_cho_xu_ly WHERE psid=$1 ORDER BY id", [psid])).rows.map((r) => r.noi_dung);
const boQua = async (psid) => (await sb.pool.query("SELECT ly_do FROM nap_bo_qua WHERE psid=$1", [psid])).rows[0]?.ly_do ?? null;

test(`GL10 B5 · TZ=${process.env.TZ}: A (T−3′) bỏ trước khi đọc tin · B (T+5′) vào · C cụm (T−2′·T+1′) vào ĐÚNG chữ T+1′ · D (T+60′, bẫy −2 giờ) vào · giờ rác bỏ · cụm toàn tin trước mốc bỏ`, async () => {
  quenMoc(); quenChoGo();
  const convs = [hoi("a5", phut(-3)), hoi("b5", phut(5)), hoi("c5", phut(1)), hoi("d5", phut(60)), hoi("e5", "hôm qua"), hoi("f5", phut(2))];
  const msgs = {
    a5: [tinKhach("a5", phut(-3), "tin cũ A")],
    b5: [tinKhach("b5", phut(5), "tin B")],
    c5: [tinKhach("c5", phut(-2), "tin C cũ"), tinKhach("c5", phut(1), "tin C mới")],
    d5: [tinKhach("d5", phut(60), "tin D một giờ sau")],
    e5: [tinKhach("e5", "hôm qua", "tin E")],
    f5: [tinKhach("f5", phut(-10), "tin F cũ 1"), tinKhach("f5", "không rõ giờ", "tin F rác")],   // mốc hội thoại SAU, mọi tin trước/không rõ
  };
  const r = await napTuPoll(sb.pool, { pageId: PG }, deps(convs, msgs));
  assert.equal(r.mo, true, r.lyDo);
  assert.deepEqual(await hang("a5"), [], "A nói cuối trước mốc bật — không vào hàng");
  assert.equal(await boQua("a5"), "truoc_moc_bat");
  assert.equal(goiTin.get("a5") || 0, 0, "A: không tốn GET /messages");
  assert.deepEqual(await hang("b5"), ["tin B"]);
  assert.deepEqual(await hang("c5"), ["tin C mới"], "cụm vắt qua mốc ⇒ chỉ chữ sau mốc");
  assert.deepEqual(await hang("d5"), ["tin D một giờ sau"], `D (T+60′) phải vào hàng dưới TZ=${process.env.TZ} — Date.parse thẳng làm lệch ${-new Date(T).getTimezoneOffset() / 60} giờ`);
  assert.deepEqual(await hang("e5"), [], "giờ không đọc được ⇒ bỏ (chỉ trả lời tin CHỨNG MINH được sau mốc)");
  assert.equal(goiTin.get("e5") || 0, 0);
  assert.deepEqual(await hang("f5"), []);
  assert.equal(await boQua("f5"), "truoc_moc_bat", "cụm rỗng vì mốc ⇒ lý do truoc_moc_bat, không phải page_noi_cuoi");
  assert.equal(r.them, 3, JSON.stringify(r));
  assert.equal(r.boQuaTruocMoc, 3, `A · E · F bỏ vì mốc, đo ${JSON.stringify(r)}`);
  // vòng sau: A vẫn bỏ (không đọc lại), dòng sổ giữ lý do
  await napTuPoll(sb.pool, { pageId: PG }, deps(convs, msgs));
  assert.equal(goiTin.get("a5") || 0, 0); assert.equal(await boQua("a5"), "truoc_moc_bat");
});

test("GL10 B5b · bot_bat_luc NULL ⇒ KHÔNG lọc mốc (hành vi cũ từng byte); gomCumTinKhach không tham số = như cũ", async () => {
  quenMoc(); quenChoGo();
  const convs = [hoi("g5", phut(-3))];
  const r = await napTuPoll(sb.pool, { pageId: PG0 }, deps(convs, { g5: [tinKhach("g5", phut(-3), "tin G")] }));
  assert.equal(r.them, 1, JSON.stringify(r));
  assert.deepEqual(await hang("g5"), ["tin G"]);
  const msgs = [tinKhach("x", phut(-2), "một"), tinKhach("x", "rác", "hai")];
  assert.deepEqual(gomCumTinKhach(msgs, PG), { text: "một\nhai", msgId: `m-x-rác` });
  assert.deepEqual(gomCumTinKhach(msgs, PG, { sauMoc: T }), null);
  assert.deepEqual(gomCumTinKhach([...msgs, tinKhach("x", phut(1), "ba")], PG, { sauMoc: T }), { text: "ba", msgId: `m-x-${phut(1)}` });
});
