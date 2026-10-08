// RP2 ④3 — KỊCH BẢN A' · A · B đi WORKER THẬT (`queue/worker.js#chayMotVong` → `docTin` tiêm → `nhanDienSale` → nhường page /
// `handler-v3#xuLyMotTin` → bước 3b chấm điểm → gác ngân sách → cửa gửi TIÊM đếm POST). Postgres HỘP CÁT riêng
// (`aicloser_v3_test_rp2w_p<pid>`, tự dựng tự dọn) · KHÔNG mạng (cửa gửi tiêm, model tiêm). Giờ tin dạng Pancake không múi giờ —
// cổng chạy tệp này ở UTC và UTC+14.
//
// A' (đường PHỔ BIẾN — review (a) vòng 2 R2-C1): Botcake trả lời câu giá trong 5–8 s, bộ nạp chờ gõ xong ≥ 5 s rồi thấy page nói cuối
// và BỎ hội thoại (`nap.js:572-579`) ⇒ «how much po?» KHÔNG BAO GIỜ thành dòng `tin_cho_xu_ly`. Chỉ hai tin sau vào hàng.
// A: câu giá VÀO hàng rồi worker nhường (Botcake nói trong lúc chờ). B: bot tự thấy câu giá.
// Nhánh KHÔNG chạm: bộ nạp thật (`nap.js` — tin xếp tay bằng `xepTin`) · lớp từ khoá/Fast Lane trả lời (tiêm «không nhận»).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

let sb, teamId, chayMotVong, xepTin;
before(async () => {
  ({ chayMotVong } = await import("../src/queue/worker.js"));
  ({ xepTin } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("rp2w");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  console.log(`   [rp2w] hộp cát ${sb.ten} · tệp đo ${new URL("../src/chat/handler-v3.js", import.meta.url).pathname} · TZ=${process.env.TZ || "máy"}`);
});
after(async () => { if (sb) await sb.don(); });

const BAY_GIO = Date.now();
const naive = (giayTruoc) => new Date(BAY_GIO - giayTruoc * 1000).toISOString().replace("Z", "000");
const K = (id, s, message) => ({ id, from: { id: "KH" }, message, inserted_at: naive(s) });
const BC = (id, s, message, pg) => ({ id, from: { id: pg, admin_name: "Botcake", app_id: 556376998159104, flow_id: 1 }, message, inserted_at: naive(s) });
const AI = (id, s, message, pg) => ({ id, from: { id: pg, admin_name: "Public API" }, message, inserted_at: naive(s) });
const TRA = "Sige po, para sa pagod ng katawan. Ano pong name niyo?";

/** Mỗi lượt: xếp ĐÚNG MỘT tin (msgId = id tin khách cuối của cụm — như `nap.js#gomCumTinKhach`) rồi chạy một vòng worker. */
async function chay(ten, luotDs) {
  const page = `rp2w-${ten}`;
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'RP2') RETURNING id", [teamId, page])).rows[0].id;
  await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,'KH','QUALIFY','AI')", [teamId, p]);
  let model = 0, post = 0; const ra = [];
  for (const l of luotDs) {
    const ls = l.lichSu(page);
    await xepTin(sb.pool, { teamId, pageId: page, psid: "KH", convId: `c-${page}`, custId: "cu", msgId: l.msgId, noiDung: l.noiDung, hoanMs: 0 });
    const kq = await chayMotVong(sb.pool, {
      pageIds: [page], docTin: async () => ls,
      layKb: () => ({ config: {}, products: [{ name: "SP" }], text: "KB", trongDiem: false, nguon_thieu: [] }),
      layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
      phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
      lanNhanh: () => ({ handled: false, reply: null, lane: "", reason: "stub" }),
      chayCloser: async () => { model += 1; return TRA; },
      kiemTinRa: () => ({ ok: true }),
      cua: {
        guiTin: async () => { post += 1; return { ok: true, id: `x${post}` }; },
        guiAnh: async () => ({ ok: true, id: "x" }), ghiNote: async () => ({ ok: true }), gatThe: async () => ({ ok: true, tags: [] }),
      },
    });
    const ht = (await sb.pool.query("SELECT trang_thai, chu_so_huu, diem_lead FROM hoi_thoai WHERE page_id=$1", [p])).rows[0];
    ra.push({ ketQua: kq?.ketQua, lyDo: String(kq?.lyDo || ""), diem: ht.diem_lead?.score ?? null, tinHieu: ht.diem_lead?.signals ?? [],
      moc: ht.diem_lead?.moc ?? null, ht: `${ht.trang_thai}/${ht.chu_so_huu}`, model, post });
  }
  console.log(`   [rp2w] ${ten}: ${JSON.stringify(ra.map(({ moc, ...r }) => ({ ...r, moc: moc ? "có" : "không" })))}`);
  return ra;
}

const H_GIA = (pg) => [K("k1", 600, "how much po?"), BC("b1", 595, "Hello po! 1 set = 99 SAR, 2 sets = 149 SAR 🎉", pg)];
const LUOT_SAU = [
  { noiDung: "what is it for?", msgId: "k2", lichSu: (pg) => [...H_GIA(pg), K("k2", 560, "what is it for?")] },
  { noiDung: "ok and for my mother?", msgId: "k3",
    lichSu: (pg) => [...H_GIA(pg), K("k2", 560, "what is it for?"), AI("a1", 550, TRA, pg), K("k3", 520, "ok and for my mother?")] },
];
const laHetNganSach = (r) => /ngan_sach_het|hết ngân sách/i.test(r.lyDo);

test("W1 · A' (câu giá KHÔNG vào hàng — Botcake trả lời trước khi bộ nạp xếp) ⇒ cả hai lượt sau ĐƯỢC bot trả lời, vẫn AI, điểm có price", async () => {
  const ra = await chay("a-phay", LUOT_SAU);
  for (const [i, r] of ra.entries()) {
    assert.ok(!laHetNganSach(r), `lượt ${i + 1} bị ngan_sach_het: ${r.lyDo}`);
    assert.equal(r.ketQua, "xong", `lượt ${i + 1}: ${r.ketQua} · ${r.lyDo}`);
    assert.equal(r.ht, "QUALIFY/AI", `lượt ${i + 1}: hội thoại rời AI (${r.ht})`);
  }
  assert.deepEqual([ra[1].model, ra[1].post], [2, 2], "hai lượt model · hai POST chữ");
  assert.deepEqual(ra[0].tinHieu, ["price"], "lượt đầu bot thấy phải chấm câu giá Botcake đã trả lời");
  assert.equal(ra[1].diem, 1);
  assert.ok(Number(ra[1].moc) > 0, "diem_lead phải mang mốc chấm (gắn lại sau scoreTurn)");
});

test("W2 · A (câu giá VÀO hàng rồi nhường vì Botcake nói trong lúc chờ) ⇒ lượt đó 0 model; hai lượt sau ĐƯỢC trả lời, điểm có price", async () => {
  const ra = await chay("a", [{ noiDung: "how much po?", msgId: "k1", lichSu: H_GIA }, ...LUOT_SAU]);
  assert.equal(ra[0].ketQua, "nhuong_page", `lượt 1 phải nhường: ${ra[0].ketQua} · ${ra[0].lyDo}`);
  assert.equal(ra[0].model, 0);
  for (const r of ra.slice(1)) {
    assert.ok(!laHetNganSach(r), r.lyDo);
    assert.equal(r.ketQua, "xong", `${r.ketQua} · ${r.lyDo}`);
  }
  assert.deepEqual([ra[2].model, ra[2].post, ra[2].ht, ra[2].diem], [2, 2, "QUALIFY/AI", 1]);
  assert.deepEqual(ra[2].tinHieu, ["price"]);
});

test("W3 · B (bot tự thấy câu giá) ⇒ ba lượt model, vẫn AI, điểm 1", async () => {
  const ra = await chay("b", [
    { noiDung: "how much po?", msgId: "k1", lichSu: () => [K("k1", 600, "how much po?")] },
    { noiDung: "what is it for?", msgId: "k2", lichSu: (pg) => [K("k1", 600, "how much po?"), AI("a0", 590, TRA, pg), K("k2", 560, "what is it for?")] },
    { noiDung: "ok and for my mother?", msgId: "k3",
      lichSu: (pg) => [K("k1", 600, "how much po?"), AI("a0", 590, TRA, pg), K("k2", 560, "what is it for?"), AI("a1", 550, TRA, pg), K("k3", 520, "ok and for my mother?")] },
  ]);
  for (const r of ra) assert.equal(r.ketQua, "xong", `${r.ketQua} · ${r.lyDo}`);
  assert.deepEqual([ra[2].model, ra[2].post, ra[2].ht, ra[2].diem], [3, 3, "QUALIFY/AI", 1]);
});

test("W4 · chữ Botcake (giá · ship · ảnh · SĐT) trên đường worker KHÔNG vào điểm — khách chỉ chào ⇒ điểm 0", async () => {
  const ra = await chay("p", [{ noiDung: "hello po", msgId: "k2", lichSu: (pg) => [
    K("k1", 300, "hi"),
    BC("b1", 295, "Free shipping po! Cash on delivery. How much? 99 SAR. See photo. Call 0551234567", pg),
    K("k2", 260, "hello po"),
  ] }]);
  assert.equal(ra[0].ketQua, "xong", `${ra[0].ketQua} · ${ra[0].lyDo}`);
  assert.deepEqual([ra[0].diem, ra[0].tinHieu], [0, []]);
});
