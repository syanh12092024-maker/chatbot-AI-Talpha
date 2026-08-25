// G2-A6 · API SỐ LIỆU — hai luồng · chi phí AI · A/B · sức khỏe 9 đèn.
//
// Luật được khoá xuyên suốt: **số 0 phải nói vì sao nó là 0**. Một báo cáo toàn số 0 trông
// y hệt «hệ chạy êm» — đó là bài học 3 của giai đoạn 2, và nửa số ca dưới đây đo đúng nó.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  baoCaoHaiLuong,
  chiPhiAiTheoPage,
  hieuQuaKichBan,
  sucKhoeHeThong,
  CHIN_CHI_SO,
  TOI_THIEU_DE_KET_LUAN,
  LoiXuyenTeam,
} from "../src/db/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let tA, tB, ql, saleA, ctx, ctxSale, ctxTrong, pA, pB;

const soAi = async (pageFb, loai, tien, psid, ban = null, luc = "now()") =>
  q(
    `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model,
        nguon_tep, nguon_dong, token_vao, token_ra, tien_vnd, ban_kich_ban)
     VALUES ($1, ${luc}, $2, $3, $4, 'kimi-k2.6', $5, $6, 100, 50, $7, $8)`,
    [tA, pageFb, psid, loai, `t-${Math.random()}`, 1, tien, ban],
  );

before(async () => {
  sb = await dungSandbox("l0m2solieu");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  const nguoi = async (email, vai, team) => {
    const id = (
      await mot("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id", [email])
    ).id;
    await q(
      `INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
       SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`,
      [team, id, vai],
    );
    return id;
  };
  ql = await nguoi("ql@t.test", "quan-ly", tA);
  saleA = await nguoi("sale-sl@t.test", "sale", tA);
  const qlB = await nguoi("ql-b@t.test", "quan-ly", tB);
  ctx = { teamId: tA, nguoiDungId: ql };
  ctxSale = { teamId: tA, nguoiDungId: saleA };
  ctxTrong = { teamId: tB, nguoiDungId: qlB }; // team KHÔNG có page nào

  pA = await mot(
    "INSERT INTO page (team_id,page_id,ten,bot_ai_bat,marketer) VALUES ($1,'fb-a','A',true,'chi-lan') RETURNING id",
    [tA],
  );
  pB = await mot(
    "INSERT INTO page (team_id,page_id,ten,bot_ai_bat,marketer) VALUES ($1,'fb-b','B',true,'') RETURNING id",
    [tA],
  );
});
after(async () => {
  await sb.don();
});

// ══ SỐ 0 PHẢI NÓI VÌ SAO ═══════════════════════════════════════════════════════════

test("S1 · team CHƯA CÓ PAGE → báo cáo 0, và nói rõ đó là «chưa cài đặt xong»", async () => {
  const bc = await baoCaoHaiLuong(sb.pool, ctxTrong);
  console.log(`   [S1] viSaoRong="${bc.boiCanh.viSaoRong}"`);
  assert.equal(bc.messenger.soDon, 0);
  assert.equal(bc.boiCanh.coDuLieu, false);
  assert.match(bc.boiCanh.viSaoRong, /CHƯA CÓ PAGE NÀO/);
  assert.match(bc.boiCanh.viSaoRong, /H7/); // chỉ luôn đường đi tiếp
});

test("S2 · team CÓ page nhưng chưa có đơn → lý do KHÁC HẲN ca trên", async () => {
  const bc = await baoCaoHaiLuong(sb.pool, ctx);
  console.log(`   [S2] viSaoRong="${bc.boiCanh.viSaoRong?.slice(0, 70)}…"`);
  assert.equal(bc.boiCanh.coDuLieu, false);
  assert.match(bc.boiCanh.viSaoRong, /2 page nhưng bảng `don_hang` không có dòng nào/);
  assert.ok(
    !/CHƯA CÓ PAGE NÀO/.test(bc.boiCanh.viSaoRong),
    "hai cảnh khác nhau phải nói khác nhau",
  );
});

// ══ HAI LUỒNG KHÔNG ĐƯỢC CỘNG ══════════════════════════════════════════════════════

test("S3 · báo cáo tách HAI luồng và KHÔNG trả về một tổng", async () => {
  await q(
    `INSERT INTO don_hang (team_id,page_id,nguon,trang_thai_he,tong_tien)
     VALUES ($1,$2,'messenger','cho_sale',100), ($1,$2,'messenger','cho_sale',NULL),
            ($1,$2,'trang_ban_hang','cho_sale',250)`,
    [tA, pA.id],
  );
  const bc = await baoCaoHaiLuong(sb.pool, ctx);
  console.log(
    `   [S3] messenger=${bc.messenger.soDon} · trang bán hàng=${bc.trangBanHang.soDon}`,
  );
  assert.equal(bc.messenger.soDon, 2);
  assert.equal(bc.trangBanHang.soDon, 1);
  assert.ok(!("tongDon" in bc), "CẤM trả về một tổng — 01 §1 hai thước khác nhau");
  assert.ok(bc.viSaoKhongCong);
  // Đơn thiếu `tong_tien` phải được nói ra, không để «tổng tiền 100» đọc như doanh thu thật.
  console.log(`   [S3] cảnh báo="${bc.messenger.canhBao}"`);
  assert.match(bc.messenger.canhBao, /1\/2 đơn CHƯA có tong_tien/);
});

// ══ CHI PHÍ AI ═════════════════════════════════════════════════════════════════════

test("S4 · tìm được page ĐỐT TIỀN MÀ KHÔNG RA ĐƠN", async () => {
  await soAi("fb-b", "reply", 500, "psid-1");
  await soAi("fb-b", "reply", 700, "psid-2");
  await soAi("fb-a", "reply", 300, "psid-3");
  const cp = await chiPhiAiTheoPage(sb.pool, ctx);
  const b = cp.dsPage.find((x) => x.pageId === "fb-b");
  const a = cp.dsPage.find((x) => x.pageId === "fb-a");
  console.log(
    `   [S4] fb-b: ${b.tienVnd}đ / ${b.soDon} đơn → đốt-không-ra-đơn=${b.dotTienKhongRaDon}`,
  );
  assert.equal(b.tienVnd, 1200);
  assert.equal(b.soDon, 0);
  assert.equal(b.dotTienKhongRaDon, true);
  assert.equal(a.dotTienKhongRaDon, false, "fb-a có đơn nên KHÔNG được gắn cờ");
  assert.equal(cp.soPageDotTienKhongRaDon, 1);
});

test("S5 · thiếu tien_vnd thì nói ra, KHÔNG cộng ngầm rồi báo như số thật", async () => {
  await soAi("fb-a", "reply", null, "psid-4"); // lượt không có tiền
  const cp = await chiPhiAiTheoPage(sb.pool, ctx);
  const a = cp.dsPage.find((x) => x.pageId === "fb-a");
  console.log(`   [S5] fb-a tienDayDu=${a.tienDayDu} · cảnh báo="${cp.canhBao?.slice(0,54)}…"`);
  assert.equal(a.tienDayDu, false);
  assert.match(cp.canhBao, /cận DƯỚI/);
});

test("S6 · page KHÔNG có lượt gọi nào thì KHÔNG bị gắn cờ đốt tiền", async () => {
  const p = await mot(
    "INSERT INTO page (team_id,page_id,ten,bot_ai_bat) VALUES ($1,'fb-im','Im',false) RETURNING id",
    [tA],
  );
  const cp = await chiPhiAiTheoPage(sb.pool, ctx);
  const im = cp.dsPage.find((x) => x.pageId === "fb-im");
  assert.equal(im.soLuot, 0);
  assert.equal(im.dotTienKhongRaDon, false, "0 lượt + 0 đơn KHÔNG phải là đốt tiền");
  assert.ok(p);
});

// ══ A/B — CHƯA ĐỦ MẪU THÌ CẤM TRẢ TỈ LỆ ════════════════════════════════════════════

test("S7 · chưa đủ mẫu → tiLeChot là NULL, và nói còn thiếu bao nhiêu", async () => {
  for (let i = 0; i < 5; i++) await soAi("fb-a", "reply", 10, `ab-${i}`, "BAN-X");
  await soAi("fb-a", "order", 10, "ab-0", "BAN-X");
  const kq = await hieuQuaKichBan(sb.pool, ctx);
  const x = kq.dsBan.find((b) => b.ban === "BAN-X");
  console.log(`   [S7] BAN-X: ${x.soKhach} khách · tiLeChot=${x.tiLeChot} · "${x.ketLuan}"`);
  assert.equal(x.tiLeChot, null, "CẤM trả tỉ lệ khi chưa đủ mẫu — màn hình sẽ hiện nó ra");
  assert.equal(x.duMau, false);
  assert.equal(x.conThieu, TOI_THIEU_DE_KET_LUAN - x.soKhach);
  assert.match(x.ketLuan, /CHƯA KẾT LUẬN/);
});

test("S8 · đủ mẫu → mới có tỉ lệ, và chỉ so được khi CẢ HAI bản đủ", async () => {
  for (let i = 0; i < TOI_THIEU_DE_KET_LUAN; i++) {
    await soAi("fb-a", "reply", 10, `y-${i}`, "BAN-Y");
    if (i % 3 === 0) await soAi("fb-a", "order", 10, `y-${i}`, "BAN-Y");
  }
  const kq = await hieuQuaKichBan(sb.pool, ctx);
  const y = kq.dsBan.find((b) => b.ban === "BAN-Y");
  console.log(`   [S8] BAN-Y: ${y.soKhach} khách · tiLeChot=${y.tiLeChot?.toFixed(2)}`);
  assert.equal(y.duMau, true);
  assert.ok(y.tiLeChot > 0);
  // BAN-X vẫn chưa đủ ⇒ KHÔNG được coi là so sánh được.
  assert.equal(kq.soSanhDuoc, false);
  assert.match(kq.ketLuanChung, /CHƯA KẾT LUẬN/);
});

// ══ SỨC KHOẺ ═══════════════════════════════════════════════════════════════════════

test("S9 · đủ CHÍN đèn, mỗi đèn có màu và một câu đọc được", async () => {
  const sk = await sucKhoeHeThong(sb.pool, ctx);
  console.log(`   [S9] ${sk.den.map((d) => `${d.ma}:${d.mau}`).join(" ")}`);
  assert.equal(sk.den.length, 9);
  assert.deepEqual(sk.den.map((d) => d.ma).sort(), [...CHIN_CHI_SO].sort());
  for (const d of sk.den) {
    assert.ok(["xanh", "do", "xam"].includes(d.mau), `${d.ma} màu lạ: ${d.mau}`);
    assert.ok(d.chu && d.chu.length > 5, `${d.ma} không có câu giải thích`);
  }
});

test("S10 · đèn llm_account bắt được đúng sự cố 23/08 — và có SỐ PHÚT", async () => {
  await q(
    `INSERT INTO so_ai (team_id,xay_ra_luc,page_id,psid,loai,ma_model,nguon_tep,nguon_dong)
     VALUES ($1, now() - interval '90 minutes', 'fb-a','p','reply','kimi-k2.6','x',1)`,
    [tB], // team B: chỉ có MỘT lượt, và nó cũ 90 phút
  );
  const sk = await sucKhoeHeThong(sb.pool, ctxTrong, { phutIm: 30 });
  const d = sk.den.find((x) => x.ma === "llm_account");
  console.log(`   [S10] ${d.mau} · ${d.so} phút · "${d.chu}"`);
  assert.equal(d.mau, "do");
  assert.ok(d.so >= 89, "phải trả về SỐ PHÚT đang dừng, không chỉ một chữ đỏ");
  assert.match(d.chu, /23\/08/);
});

test("S11 · CHƯA CÓ dữ liệu thì đèn XÁM, không phải đèn ĐỎ", async () => {
  // Đây là chỗ dễ sai nhất của cả bảng: «0 lượt trả lời» có hai nghĩa. Gộp thành đỏ là
  // dựng một đèn đỏ vĩnh viễn, rồi ai cũng học cách bỏ qua nó.
  const t = await mot("SELECT id FROM team WHERE slug='pialpha-eu'");
  const u = (
    await mot("INSERT INTO nguoi_dung (email,ten) VALUES ('c@t.test','c') RETURNING id")
  ).id;
  await q(
    `INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
     SELECT $1,$2,v.id FROM vai v WHERE v.ma='quan-ly'`,
    [t.id, u],
  );
  const sk = await sucKhoeHeThong(sb.pool, { teamId: t.id, nguoiDungId: u });
  const d = sk.den.find((x) => x.ma === "llm_account");
  console.log(`   [S11] ${d.mau} · "${d.chu}"`);
  assert.equal(d.mau, "xam");
  assert.match(d.chu, /CHƯA CÓ DỮ LIỆU/);
  assert.match(sk.tomTat, /đèn XÁM/);
});

test("S12 · đèn page_thieu_marketer đếm đúng, và nói hậu quả", async () => {
  const sk = await sucKhoeHeThong(sb.pool, ctx);
  const d = sk.den.find((x) => x.ma === "page_thieu_marketer");
  console.log(`   [S12] ${d.so} page thiếu marketer · "${d.chu}"`);
  assert.equal(d.so, 2); // fb-b và fb-im
  assert.match(d.chu, /báo cáo cắt theo marketer sẽ TRỐNG/);
});

test("S13 · vai `sale` KHÔNG xem được số liệu (01 §10)", async () => {
  await assert.rejects(() => baoCaoHaiLuong(sb.pool, ctxSale), LoiXuyenTeam);
  await assert.rejects(() => sucKhoeHeThong(sb.pool, ctxSale), LoiXuyenTeam);
});

test("S14 · mọi khối số đều khai NGUỒN để tra ngược được", async () => {
  const a = await baoCaoHaiLuong(sb.pool, ctx);
  const b = await chiPhiAiTheoPage(sb.pool, ctx);
  const c = await hieuQuaKichBan(sb.pool, ctx);
  for (const [ten, kq] of [["báo cáo", a], ["chi phí", b], ["A/B", c]]) {
    assert.ok(kq.nguon && kq.nguon.length > 10, `${ten} không khai nguồn`);
  }
  console.log(`   [S14] nguồn chi phí = ${b.nguon}`);
  // Nối `so_ai` phải bằng id FACEBOOK — nối nhầm sang `page.id` thì câu chạy mà trả RỖNG.
  assert.match(b.nguon, /page\.page_id/);
});

// ══ B-Y6 ⓑ — LỚP TRẢ LỜI 0 ĐỒNG ════════════════════════════════════════════════════

test("S15 · bảng mau_0_dong dùng được qua tầng truy vấn (không thì màn B không đụng nổi)", async () => {
  const { layNhieu, themMoi, BANG_NGHIEP_VU_CHUAN } = await import("../src/db/index.js");
  assert.ok(BANG_NGHIEP_VU_CHUAN.has("mau_0_dong"));
  const dong = await themMoi(sb.pool, ctx, "mau_0_dong", {
    ma: "phi-ship",
    ten: "Phí ship",
    tu_khoa: ["ship", "phí ship", "magkano ang shipping"],
    noi_dung: "Freeship toàn quốc ạ.",
    bat: true,
  });
  assert.ok(dong.id);
  const ds = await layNhieu(sb.pool, ctx, "mau_0_dong", { dieuKien: { bat: true } });
  console.log(`   [S15] đọc lại được ${ds.length} mẫu đang bật`);
  assert.equal(ds.length, 1);
  assert.deepEqual(ds[0].tu_khoa, ["ship", "phí ship", "magkano ang shipping"]);
});

test("S16 · bộ đếm chặn cộng NGUYÊN TỬ — 20 lượt đồng thời không mất lượt nào", async () => {
  // Đọc-rồi-ghi thì hai lượt chat đồng thời cùng đọc một số rồi cùng ghi số đó+1: mất một
  // lượt, im lặng. Một bộ đếm đếm thiếu thì con số «chặn ≥33%» không nghiệm thu được.
  const { ghiNhanChan0Dong } = await import("../src/db/index.js");
  await Promise.all(
    Array.from({ length: 20 }, () => ghiNhanChan0Dong(sb.pool, { teamId: tA, ma: "phi-ship" })),
  );
  const r = await mot("SELECT so_lan_chan, chan_lan_cuoi FROM mau_0_dong WHERE ma='phi-ship'");
  console.log(`   [S16] 20 lượt đồng thời → so_lan_chan=${r.so_lan_chan}`);
  assert.equal(Number(r.so_lan_chan), 20);
  assert.ok(r.chan_lan_cuoi);
});

test("S17 · mẫu TẮT thì không đếm, và trả null chứ không ném (đường chat không được chết)", async () => {
  const { ghiNhanChan0Dong } = await import("../src/db/index.js");
  await q("UPDATE mau_0_dong SET bat = false WHERE ma='phi-ship'");
  const kq = await ghiNhanChan0Dong(sb.pool, { teamId: tA, ma: "phi-ship" });
  assert.equal(kq, null);
  const lac = await ghiNhanChan0Dong(sb.pool, { teamId: tA, ma: "khong-co-mau-nay" });
  assert.equal(lac, null);
  await q("UPDATE mau_0_dong SET bat = true WHERE ma='phi-ship'");
});

test("S18 · tỉ lệ chặn lấy MẪU SỐ đúng — lượt 0 đồng không đẻ dòng so_ai nào", async () => {
  // Chỗ dễ sai nhất: lấy `so_ai` làm mẫu số là chia cho đúng phần KHÔNG bị chặn — tỉ lệ
  // luôn đẹp và luôn sai. Mẫu số phải là (bị chặn + có gọi model).
  const { tiLeChan0Dong } = await import("../src/db/index.js");
  const kq = await tiLeChan0Dong(sb.pool, ctx);
  const goi = kq.soLuotGoiModel;
  console.log(
    `   [S18] chặn ${kq.soLuotChan} · gọi model ${goi} · tổng ${kq.tongLuu} · tỉ lệ ${kq.tiLeChan?.toFixed(2)}`,
  );
  assert.equal(kq.soLuotChan, 20);
  assert.equal(kq.tongLuu, 20 + goi, "mẫu số phải là chặn + gọi model, không phải chỉ so_ai");
  assert.equal(kq.tiLeChan, 20 / (20 + goi));
  assert.equal(kq.datNguong33, 20 / (20 + goi) >= 0.33);
  // …và hàm phải TỰ KHAI chỗ hai vế khác thước, đừng để người đọc tưởng là tỉ lệ 7 ngày.
  assert.match(kq.canhBao, /CỘNG DỒN/);
});
