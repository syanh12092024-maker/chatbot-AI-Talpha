// G2-A5 · KỊCH BẢN BA TẦNG có KẾ THỪA — sản phẩm → nước → page.
//
// Luật duy nhất được khoá ở đây: **không bao giờ trả về im lặng**. Mỗi ca đều khẳng định
// bộ giải khai được NGUỒN, kể cả khi nguồn là «không có gì, và đây là khoá còn thiếu».
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  docKichBanChoPage,
  cayKichBan,
  apKichBan,
  xemAnhHuongKichBan,
  CAP,
  VAI_SUA_KICH_BAN,
  LoiXuyenTeam,
} from "../src/db/index.js";
import { docKichBanLive } from "../src/chat/rap-prompt.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let tA, mkt, saleA, ctxMkt, ctxSale;
let pRieng, pNuoc, pSanPham, pTrong, pKhongSp;

/** Dựng một bản kịch bản ở một tầng. Trả về dòng. */
const mkBan = async ({ cap, pageId = null, maSp = null, nuoc = null, pb, live, chu }) =>
  mot(
    `INSERT INTO kich_ban
       (team_id, cap, page_id, san_pham_ma, thi_truong, phien_ban, trang_thai,
        noi_dung_nguoi, noi_dung_may)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'{}'::jsonb,$8) RETURNING *`,
    [tA, cap, pageId, maSp, nuoc, pb, live ? "LIVE" : "DRAFT", chu],
  );

before(async () => {
  sb = await dungSandbox("l0m2kichban");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;

  const nguoi = async (email, vai) => {
    const id = (
      await mot("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id", [email])
    ).id;
    await q(
      `INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
       SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`,
      [tA, id, vai],
    );
    return id;
  };
  mkt = await nguoi("mkt@t.test", "marketer");
  saleA = await nguoi("sale-kb@t.test", "sale");
  ctxMkt = { teamId: tA, nguoiDungId: mkt };
  ctxSale = { teamId: tA, nguoiDungId: saleA };

  const mkPage = async (fb, nuoc, maSp) => {
    const p = await mot(
      "INSERT INTO page (team_id,page_id,ten,thi_truong,bot_ai_bat) VALUES ($1,$2,$2,$3,true) RETURNING id",
      [tA, fb, nuoc],
    );
    if (maSp) {
      await q("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$3)", [
        tA, p.id, maSp,
      ]);
    }
    return p;
  };
  // Bốn page phủ đúng bốn nhánh của bộ giải + một page không có sản phẩm nào.
  pRieng = await mkPage("fb-rieng", "KSA", "sp:ao");
  pNuoc = await mkPage("fb-nuoc", "KSA", "sp:ao-2");
  pSanPham = await mkPage("fb-sp", "UAE", "sp:ao-3");
  pTrong = await mkPage("fb-trong", "Kuwait", "sp:nen");
  pKhongSp = await mkPage("fb-khong-sp", "KSA", null);
});
after(async () => {
  await sb.don();
});

// ══ BỐN NHÁNH CỦA BỘ GIẢI ═══════════════════════════════════════════════════════════

test("K1 · page CÓ bản riêng → dùng bản riêng, keThua=false", async () => {
  await mkBan({ cap: CAP.PAGE, pageId: pRieng.id, pb: 1, live: true, chu: "RIÊNG" });
  const kq = await docKichBanChoPage(sb.pool, tA, pRieng.id);
  console.log(`   [K1] cap=${kq.cap} keThua=${kq.keThua} tuDau="${kq.tuDau}"`);
  assert.equal(kq.cap, CAP.PAGE);
  assert.equal(kq.keThua, false);
  assert.equal(kq.ban.noi_dung_may, "RIÊNG");
  assert.equal(kq.viSao, null);
});

test("K2 · page KHÔNG có bản riêng nhưng có bản tầng NƯỚC → kế thừa, và NÓI RÕ từ đâu", async () => {
  await mkBan({ cap: CAP.NUOC, maSp: "sp:ao-2", nuoc: "KSA", pb: 1, live: true, chu: "NƯỚC" });
  const kq = await docKichBanChoPage(sb.pool, tA, pNuoc.id);
  console.log(`   [K2] tuDau="${kq.tuDau}"`);
  assert.equal(kq.cap, CAP.NUOC);
  assert.equal(kq.keThua, true);
  assert.equal(kq.ban.noi_dung_may, "NƯỚC");
  assert.match(kq.tuDau, /NƯỚC/);
  assert.match(kq.tuDau, /sp:ao-2/); // khai luôn KHOÁ, không chỉ tên tầng
});

test("K3 · không có bản nước → rơi tiếp xuống tầng SẢN PHẨM, vẫn nói rõ", async () => {
  await mkBan({ cap: CAP.SAN_PHAM, maSp: "sp:ao-3", pb: 1, live: true, chu: "SẢN PHẨM" });
  const kq = await docKichBanChoPage(sb.pool, tA, pSanPham.id);
  console.log(`   [K3] tuDau="${kq.tuDau}"`);
  assert.equal(kq.cap, CAP.SAN_PHAM);
  assert.equal(kq.keThua, true);
  assert.match(kq.tuDau, /SẢN PHẨM/);
});

test("K4 · KHÔNG có gì → viSao nói rõ THIẾU KHOÁ NÀO, không trả null trần", async () => {
  const kq = await docKichBanChoPage(sb.pool, tA, pTrong.id);
  console.log(`   [K4] viSao="${kq.viSao}"`);
  assert.equal(kq.ban, null);
  assert.equal(kq.cap, null);
  assert.ok(kq.viSao, "null TRẦN là thứ bài học 3 cấm");
  assert.match(kq.viSao, /chưa có kịch bản riêng/);
  assert.match(kq.viSao, /sp:nen/); // khai khoá page đang có, để marketer biết sửa ở đâu

  // …và page KHÔNG có sản phẩm nào phải nói một lý do KHÁC HẲN.
  const kq2 = await docKichBanChoPage(sb.pool, tA, pKhongSp.id);
  console.log(`   [K4] viSao (page không SP)="${kq2.viSao}"`);
  assert.match(kq2.viSao, /chưa gắn sản phẩm nào/);
  assert.notEqual(kq2.viSao, kq.viSao, "hai lý do khác nhau phải nói khác nhau");
});

// ══ TẦNG HẸP THẮNG ══════════════════════════════════════════════════════════════════

test("K5 · bản riêng của page THẮNG bản tầng trên, dù tầng trên mới hơn", async () => {
  await mkBan({ cap: CAP.NUOC, maSp: "sp:ao", nuoc: "KSA", pb: 9, live: true, chu: "NƯỚC-MỚI" });
  const kq = await docKichBanChoPage(sb.pool, tA, pRieng.id);
  console.log(`   [K5] page có cả bản riêng lẫn bản nước → dùng "${kq.ban.noi_dung_may}"`);
  assert.equal(kq.cap, CAP.PAGE);
  assert.equal(kq.ban.noi_dung_may, "RIÊNG");
});

// ══ MỘT BẢN LIVE MỖI PHẠM VI — rào ở tầng CSDL ══════════════════════════════════════

test("K6 · CSDL chặn hai bản LIVE cùng một page, kể cả ghi thẳng", async () => {
  // Tên chỉ mục là `kich_ban_live_moi_page` — nó có SẴN từ migration 001. 010 CỐ Ý không
  // thêm cái thứ hai cho tầng page: hai chỉ mục nói cùng một chuyện là bản khai thứ hai.
  await assert.rejects(
    () => mkBan({ cap: CAP.PAGE, pageId: pRieng.id, pb: 2, live: true, chu: "x" }),
    /kich_ban_live_moi_page/,
  );
});

test("K7 · CSDL chặn hai bản LIVE cùng (sản phẩm × nước), và cùng sản phẩm", async () => {
  await assert.rejects(
    () => mkBan({ cap: CAP.NUOC, maSp: "sp:ao-2", nuoc: "KSA", pb: 2, live: true, chu: "x" }),
    /kich_ban_mot_live_nuoc/,
  );
  await assert.rejects(
    () => mkBan({ cap: CAP.SAN_PHAM, maSp: "sp:ao-3", pb: 2, live: true, chu: "x" }),
    /kich_ban_mot_live_san_pham/,
  );
});

test("K8 · CSDL chặn dòng mang khoá SAI TẦNG (bản nước mà kèm page_id)", async () => {
  await assert.rejects(
    () =>
      q(
        `INSERT INTO kich_ban (team_id,cap,page_id,san_pham_ma,thi_truong,phien_ban,
             trang_thai,noi_dung_nguoi,noi_dung_may)
         VALUES ($1,'nuoc',$2,'sp:ao','KSA',77,'DRAFT','{}'::jsonb,'x')`,
        [tA, pRieng.id],
      ),
    /kich_ban_khoa_dung_cap/,
  );
});

// ══ ÁP / LÙI ═══════════════════════════════════════════════════════════════════════

test("K9 · áp bản mới của page → bản cũ tự hạ, MỘT giao dịch, có nhật ký", async () => {
  const moi = await mkBan({ cap: CAP.PAGE, pageId: pRieng.id, pb: 3, live: false, chu: "RIÊNG-v3" });
  const kq = await apKichBan(sb.pool, ctxMkt, { id: moi.id, lyDo: "đổi lời chào" });
  console.log(`   [K9] chạm ${kq.anhHuong.soPageCham} page · bản cũ v${kq.banCu.phien_ban} đã hạ`);
  assert.equal(kq.anhHuong.soPageCham, 1);
  const con = await mot(
    "SELECT count(*)::int c FROM kich_ban WHERE cap='page' AND page_id=$1 AND trang_thai='LIVE'",
    [pRieng.id],
  );
  assert.equal(con.c, 1, "đúng MỘT bản LIVE mỗi page");
  assert.equal((await docKichBanChoPage(sb.pool, tA, pRieng.id)).ban.noi_dung_may, "RIÊNG-v3");
  const nk = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='ap_kich_ban'",
  );
  assert.equal(nk.c, 1);
});

test("K10 · áp bản tầng NƯỚC KHÔNG được hạ bản riêng của page (sai vế WHERE là mất kịch bản)", async () => {
  const truoc = await docKichBanChoPage(sb.pool, tA, pRieng.id);
  const b = await mkBan({ cap: CAP.NUOC, maSp: "sp:ao", nuoc: "KSA", pb: 10, live: false, chu: "N2" });
  await apKichBan(sb.pool, ctxMkt, { id: b.id });
  const sau = await docKichBanChoPage(sb.pool, tA, pRieng.id);
  console.log(`   [K10] page riêng: trước=${truoc.ban.noi_dung_may} sau=${sau.ban.noi_dung_may}`);
  assert.equal(String(sau.ban.id), String(truoc.ban.id), "bản riêng của page KHÔNG được đụng");
});

test("K11 · vai `sale` không áp được kịch bản", async () => {
  const b = await mkBan({ cap: CAP.PAGE, pageId: pTrong.id, pb: 1, live: false, chu: "x" });
  await assert.rejects(() => apKichBan(sb.pool, ctxSale, { id: b.id }), LoiXuyenTeam);
});

// ══ RỦI RO ② CỦA ĐỀ BÀI — sửa nhầm tầng sản phẩm là đổi mọi page dưới nó ═══════════

test("K12 · xem TRƯỚC: bản tầng SẢN PHẨM chạm bao nhiêu page, và ai đang che nó", async () => {
  // Thêm hai page nữa cùng bán `sp:chung`, một trong đó có bản riêng che mất.
  const mk = async (fb, nuoc, maSp) => {
    const p = await mot(
      "INSERT INTO page (team_id,page_id,ten,thi_truong,bot_ai_bat) VALUES ($1,$2,$2,$3,true) RETURNING id",
      [tA, fb, nuoc],
    );
    await q("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$3)", [tA, p.id, maSp]);
    return p;
  };
  const x = await mk("fb-c1", "KSA", "sp:chung");
  await mk("fb-c2", "UAE", "sp:chung-2");
  const banSp = await mkBan({ cap: CAP.SAN_PHAM, maSp: "sp:chung", pb: 1, live: false, chu: "SP-CHUNG" });

  const ah1 = await xemAnhHuongKichBan(sb.pool, ctxMkt, { id: banSp.id });
  console.log(`   [K12] bản tầng sản phẩm sẽ chạm ${ah1.soPageCham} page`);
  assert.equal(ah1.soPageCham, 1); // chỉ fb-c1 mang mã sp:chung

  // …nhưng nếu page đó CÓ bản riêng thì nó KHÔNG bị chạm — và con số phải phản ánh điều đó.
  const rieng = await mkBan({ cap: CAP.PAGE, pageId: x.id, pb: 1, live: true, chu: "CHE" });
  const ah2 = await xemAnhHuongKichBan(sb.pool, ctxMkt, { id: banSp.id });
  console.log(`   [K12] sau khi page có bản riêng che → ${ah2.soPageCham} page`);
  assert.equal(ah2.soPageCham, 0);
  assert.ok(rieng);
});

// ══ CÂY CHO MÀN HÌNH ════════════════════════════════════════════════════════════════

test("K13 · cây trả về MỌI page, page nào trống cũng kèm lý do", async () => {
  const cay = await cayKichBan(sb.pool, ctxMkt);
  console.log(`   [K13] ${JSON.stringify(cay.dem)}`);
  assert.equal(cay.dsPage.length, 7);
  const trong = cay.dsPage.filter((p) => p.cap === null);
  assert.ok(trong.length > 0);
  for (const p of trong) {
    assert.ok(p.viSao, `page ${p.pageId} trống mà KHÔNG nói vì sao`);
  }
  // Mọi page có bản đều phải khai nguồn bằng chữ đọc được.
  for (const p of cay.dsPage.filter((x) => x.cap)) {
    assert.ok(p.tuDau && p.tuDau.length > 3, `page ${p.pageId} không khai nguồn`);
  }
});

// ══ CA QUAN TRỌNG NHẤT — bot có THẬT SỰ đi qua bộ giải không ════════════════════════

test("K14 · bộ ráp prompt ĐI QUA bộ giải: page kế thừa cũng nhận được kịch bản", async () => {
  // Trước G2-A5, `docKichBanLive` chỉ đọc tầng page ⇒ page kế thừa nhận `null` và bot mất
  // khối kịch bản. Nếu ai đó lỡ tay nối lại kiểu cũ, ca này đỏ.
  const quaBoDoc = await docKichBanLive(sb.pool, tA, pNuoc.id);
  const quaBoGiai = await docKichBanChoPage(sb.pool, tA, pNuoc.id);
  console.log(
    `   [K14] bộ ráp prompt cho page kế thừa → ${quaBoDoc ? quaBoDoc.noi_dung_may : "null"}`,
  );
  assert.ok(quaBoDoc, "page kế thừa mà bộ ráp prompt trả null = cây kế thừa chỉ để trang trí");
  assert.equal(String(quaBoDoc.id), String(quaBoGiai.ban.id));
  assert.equal(quaBoDoc.noi_dung_may, "NƯỚC");
});

test("K15 · vai được sửa kịch bản đúng như khai (marketer, không phải sale)", async () => {
  const ds = (await q("SELECT ma FROM vai ORDER BY ma")).rows.map((r) => r.ma);
  for (const v of VAI_SUA_KICH_BAN) {
    assert.ok(ds.includes(v), `mã vai "${v}" không có trong bảng vai — bài học 2 GD2`);
  }
  assert.ok(!VAI_SUA_KICH_BAN.includes("sale"));
});

// ══ LƯỚI MIGRATION — bộ đọc MỚI trên đường chat sống ════════════════════════════════
test("K16 · chưa áp 010 → KHÔNG chết, lui về một tầng và KÊU RA (án lệ #7)", async () => {
  // `docKichBanChoPage` nằm trên đường chat sống. Deploy code trước migration là mọi lượt
  // trả lời khách chết với «column "cap" does not exist». Ca này dựng đúng cảnh đó bằng
  // cách BỎ cột thật, rồi khẳng định hàm vẫn chạy và vẫn nói ra là nó đang mù.
  const sb2 = await dungSandbox("l0m2kbcu");
  try {
    const t = (await sb2.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const p = (
      await sb2.pool.query(
        "INSERT INTO page (team_id,page_id,ten) VALUES ($1,'fb-cu','C') RETURNING id",
        [t],
      )
    ).rows[0];
    await sb2.pool.query(
      `INSERT INTO kich_ban (team_id,cap,page_id,phien_ban,trang_thai,noi_dung_nguoi,noi_dung_may)
       VALUES ($1,'page',$2,1,'LIVE','{}'::jsonb,'CŨ')`,
      [t, p.id],
    );
    // Hạ CSDL về trước 010 — đúng cảnh deploy code trước migration.
    await sb2.pool.query("ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap");
    await sb2.pool.query("ALTER TABLE kich_ban DROP COLUMN cap");

    const { docKichBanChoPage: giai } = await import(
      `../src/db/kich-ban.js?moi=${Date.now()}`
    );
    const kq = await giai(sb2.pool, t, p.id);
    console.log(`   [K16] không chết · ban=${kq.ban ? kq.ban.noi_dung_may : "null"}`);
    assert.equal(kq.ban.noi_dung_may, "CŨ", "phải LUI về một tầng, không được ném");

    const trong = (
      await sb2.pool.query(
        "INSERT INTO page (team_id,page_id,ten) VALUES ($1,'fb-cu-2','C2') RETURNING id",
        [t],
      )
    ).rows[0];
    const kq2 = await giai(sb2.pool, t, trong.id);
    console.log(`   [K16] page trống → viSao="${kq2.viSao?.slice(0, 46)}…"`);
    assert.match(kq2.viSao, /migration 010 CHƯA áp/);
  } finally {
    await sb2.don();
  }
});
