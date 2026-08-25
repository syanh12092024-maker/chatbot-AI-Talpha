// PHIEU-B-Y3 · CHUYỂN PAGE SANG TEAM KHÁC — cửa hẹp thứ sáu.
//
// Đo trên CSDL sandbox thật (`aicloser_v3_test_l0m2chuyen`), tự dựng tự dọn. Mọi ca chạm
// NHÁNH THẬT: giao dịch thật, trigger thật, vai đọc từ `thanh_vien_team` thật — không có
// fixture nào tự dựng điều kiện hộ (án lệ #1: cái thước cũng phải qua cổng).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  chuyenPageSangTeam,
  demMoCoi,
  VAI_DUOC_CHUYEN,
  ctxHeThong,
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam,
} from "../src/db/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const demNhatKyChuyen = async () =>
  Number(
    (
      await mot(
        "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='chuyen_page_team'",
      )
    ).c,
  );

let tA, tB, tC, tKyThuat; // A=tieu-alpha  B=auus  C=pialpha-eu  kỹ thuật=chua-phan
let quanTriA, quanTriB, saleA, quanTriC;
let dem = 0;

/** Dựng một page kèm ĐỦ MỘT DÒNG cho mọi bảng con — kể cả hai bảng PHIẾU KÊ SÓT
 *  (`don_hang`, `tin_cho_xu_ly`) và bảng cố ý ở lại (`so_ai`). */
async function dungPageDayDu(teamId, hau) {
  const fb = `fb-${hau}`;
  const p = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id, page_id",
    [teamId, fb, `Page ${hau}`],
  );
  const kh = await mot(
    "INSERT INTO khach (team_id, ten) VALUES ($1,$2) RETURNING id",
    [teamId, `Khách ${hau}`],
  );
  const ht = await mot(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, khach_id, trang_thai, chu_so_huu)
     VALUES ($1,$2,$3,$4,'GREET','AI') RETURNING id`,
    [teamId, p.id, `psid-${hau}`, kh.id],
  );
  await q(
    `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may)
     VALUES ($1,$2,1,'LIVE','{}'::jsonb,$3)`,
    [teamId, p.id, "kịch bản thử"],
  );
  await q(
    "INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,$4)",
    [teamId, p.id, `sp-${hau}`, `SP ${hau}`],
  );
  // ⚠️ `don_hang` — PHIEU-B-Y3 khai nhầm là "nối gián tiếp qua hoi_thoai". Thật ra nó có
  //    `page_id` trỏ THẲNG vào `page(id)` và mang `team_id` riêng. Đây là bảng TIỀN.
  await q(
    `INSERT INTO don_hang (team_id, page_id, hoi_thoai_id, khach_id, nguon, trang_thai_he)
     VALUES ($1,$2,$3,$4,'messenger','cho_sale')`,
    [teamId, p.id, ht.id, kh.id],
  );
  // ⚠️ `tin_cho_xu_ly` — phiếu KHÔNG nhắc tới. `page_id` dạng text (id Facebook).
  await q(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [teamId, fb, `psid-${hau}`, `conv-${hau}`, `msg-${hau}`, "xin chào"],
  );
  // `so_ai` — CỐ Ý ở lại (trigger cấm UPDATE). Ca 7 khoá hành vi này lại.
  await q(
    `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, nguon_tep, nguon_dong)
     VALUES ($1, now(), $2, $3, 'reply', 'kimi-k2.6', $4, 1)`,
    [teamId, fb, `psid-${hau}`, `test-${hau}.jsonl`],
  );
  return p;
}

const teamCuaBang = async (bang, cot, gt) =>
  (await mot(`SELECT team_id FROM ${bang} WHERE ${cot} = $1 LIMIT 1`, [gt]))
    ?.team_id;

before(async () => {
  sb = await dungSandbox("l0m2chuyen");
  const tid = async (s) =>
    (await mot("SELECT id FROM team WHERE slug=$1", [s])).id;
  tA = await tid("tieu-alpha");
  tB = await tid("auus");
  tC = await tid("pialpha-eu");
  tKyThuat = await tid("chua-phan");

  const nguoi = async (email) =>
    (
      await mot(
        "INSERT INTO nguoi_dung (email, ten) VALUES ($1,$2) RETURNING id",
        [email, email],
      )
    ).id;
  const gan = async (nd, team, maVai) =>
    q(
      `INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id)
       SELECT $1,$2,v.id FROM vai v WHERE v.ma = $3`,
      [team, nd, maVai],
    );

  quanTriA = await nguoi("qt-a@t.test");
  quanTriB = await nguoi("qt-b@t.test");
  quanTriC = await nguoi("qt-c@t.test");
  saleA = await nguoi("sale-a@t.test");
  await gan(quanTriA, tA, VAI_DUOC_CHUYEN);
  await gan(quanTriB, tB, VAI_DUOC_CHUYEN);
  await gan(quanTriC, tC, VAI_DUOC_CHUYEN);
  await gan(saleA, tA, "sale");
});
after(async () => {
  await sb.don();
});

// ── ⑤#1 + hai bảng PHIẾU KÊ SÓT ────────────────────────────────────────────────
test("Y3-a · chuyển page → MỌI bảng con đi theo, kể cả don_hang và tin_cho_xu_ly", async () => {
  const p = await dungPageDayDu(tA, `a${++dem}`);
  const kq = await chuyenPageSangTeam(
    sb.pool,
    { teamId: tA, nguoiDungId: quanTriA },
    { pageId: p.id, teamDichId: tB, lyDo: "gán lại theo H7" },
  );
  console.log(`   [Y3-a] daChuyen = ${JSON.stringify(kq.daChuyen)}`);
  assert.equal(kq.teamCu, String(tA));
  assert.equal(kq.teamMoi, String(tB));

  // Danh mục con là TỰ SINH — nên ca này khẳng định đủ NĂM bảng, không phải ba như phiếu kê.
  assert.deepEqual(Object.keys(kq.daChuyen).sort(), [
    "don_hang",
    "hoi_thoai",
    "kich_ban",
    "san_pham",
    "tin_cho_xu_ly",
  ]);
  for (const [bang, n] of Object.entries(kq.daChuyen))
    assert.equal(n, 1, `${bang} phải chuyển đúng 1 dòng`);

  // Đọc lại từ CSDL, không tin con số hàm tự khai.
  assert.equal(String(await teamCuaBang("page", "id", p.id)), String(tB));
  assert.equal(String(await teamCuaBang("hoi_thoai", "page_id", p.id)), String(tB));
  assert.equal(String(await teamCuaBang("kich_ban", "page_id", p.id)), String(tB));
  assert.equal(String(await teamCuaBang("san_pham", "page_id", p.id)), String(tB));
  assert.equal(String(await teamCuaBang("don_hang", "page_id", p.id)), String(tB));
  assert.equal(
    String(await teamCuaBang("tin_cho_xu_ly", "page_id", p.page_id)),
    String(tB),
  );
});

test("Y3-b · 0 dòng MỒ CÔI sau khi chuyển, và số CỐ Ý ở lại tách riêng (không báo động)", async () => {
  const { moCoi, boLaiCoChuDich } = await demMoCoi(sb.pool);
  console.log(
    `   [Y3-b] moCoi=${JSON.stringify(moCoi)} boLaiCoChuDich=${JSON.stringify(boLaiCoChuDich)}`,
  );
  for (const [bang, n] of Object.entries(moCoi))
    assert.equal(n, 0, `${bang} có ${n} dòng mồ côi`);
  // Năm bảng phải đi theo — kể cả hai bảng PHIẾU KÊ SÓT — đều nằm trong nhóm phải-bằng-0.
  assert.deepEqual(Object.keys(moCoi).sort(), [
    "don_hang",
    "hoi_thoai",
    "kich_ban",
    "san_pham",
    "tin_cho_xu_ly",
  ]);
  // `so_ai` ở nhóm riêng, và sau lượt chuyển của Y3-a nó PHẢI > 0 — đó là hành vi đã chốt,
  // không phải hỏng. Khoá lại để người sau không "sửa" nó thành 0.
  assert.deepEqual(Object.keys(boLaiCoChuDich), ["so_ai"]);
  assert.ok(boLaiCoChuDich.so_ai > 0);
});

// ── ⑤#7 — so_ai Ở LẠI, và con số đó phải HIỆN RA ──────────────────────────────
test("Y3-c · so_ai Ở LẠI team cũ (trigger cấm UPDATE) và được khai trong boLai", async () => {
  const p = await dungPageDayDu(tA, `c${++dem}`);
  const kq = await chuyenPageSangTeam(
    sb.pool,
    { teamId: tA, nguoiDungId: quanTriA },
    { pageId: p.id, teamDichId: tB },
  );
  console.log(`   [Y3-c] boLai = ${JSON.stringify(kq.boLai)}`);
  assert.deepEqual(Object.keys(kq.boLai), ["so_ai"]);
  assert.equal(kq.boLai.so_ai, 1); // số bỏ lại HIỆN RA, không âm thầm
  // …và nó thật sự còn ở team cũ.
  assert.equal(
    String(await teamCuaBang("so_ai", "page_id", p.page_id)),
    String(tA),
  );
});

// ── ⑤#2 — page trắng vẫn ghi nhật ký ──────────────────────────────────────────
test("Y3-d · page KHÔNG có con nào → vẫn ghi nhật ký, daChuyen toàn 0", async () => {
  const p = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'fb-trong','Page trắng') RETURNING id",
    [tA],
  );
  const truoc = await demNhatKyChuyen();
  const kq = await chuyenPageSangTeam(
    sb.pool,
    { teamId: tA, nguoiDungId: quanTriA },
    { pageId: p.id, teamDichId: tB },
  );
  assert.equal((await demNhatKyChuyen()) - truoc, 1);
  for (const n of Object.values(kq.daChuyen)) assert.equal(n, 0);
});

// ── ⑤#3 — team kỹ thuật bị từ chối, và KHÔNG dòng nào đổi ─────────────────────
test("Y3-e · teamDich = team KỸ THUẬT → ném, và 0 dòng nào đổi", async () => {
  const p = await dungPageDayDu(tA, `e${++dem}`);
  const nkTruoc = await demNhatKyChuyen();
  await assert.rejects(
    () =>
      chuyenPageSangTeam(
        sb.pool,
        { teamId: tA, nguoiDungId: quanTriA },
        { pageId: p.id, teamDichId: tKyThuat },
      ),
    LoiXuyenTeam,
  );
  assert.equal(String(await teamCuaBang("page", "id", p.id)), String(tA));
  assert.equal(String(await teamCuaBang("hoi_thoai", "page_id", p.id)), String(tA));
  assert.equal(await demNhatKyChuyen(), nkTruoc); // không đẻ dòng nhật ký cho lượt bị chặn
});

// ── ⑤#4 — người ngoài cả hai team ─────────────────────────────────────────────
test("Y3-f · ctx thuộc team THỨ BA (không nguồn không đích) → chặn", async () => {
  const p = await dungPageDayDu(tA, `f${++dem}`);
  await assert.rejects(
    () =>
      chuyenPageSangTeam(
        sb.pool,
        { teamId: tC, nguoiDungId: quanTriC },
        { pageId: p.id, teamDichId: tB },
      ),
    LoiXuyenTeam,
  );
  assert.equal(String(await teamCuaBang("page", "id", p.id)), String(tA));
});

test("Y3-g · quản trị của team ĐÍCH cũng chuyển được (một trong hai là đủ)", async () => {
  const p = await dungPageDayDu(tA, `g${++dem}`);
  const kq = await chuyenPageSangTeam(
    sb.pool,
    { teamId: tB, nguoiDungId: quanTriB },
    { pageId: p.id, teamDichId: tB },
  );
  assert.equal(kq.teamMoi, String(tB));
});

// ── ⑤#5 — sai vai ─────────────────────────────────────────────────────────────
test("Y3-h · vai `sale` (không phải quan-tri) → chặn, page giữ nguyên", async () => {
  const p = await dungPageDayDu(tA, `h${++dem}`);
  await assert.rejects(
    () =>
      chuyenPageSangTeam(
        sb.pool,
        { teamId: tA, nguoiDungId: saleA },
        { pageId: p.id, teamDichId: tB },
      ),
    LoiXuyenTeam,
  );
  assert.equal(String(await teamCuaBang("page", "id", p.id)), String(tA));
});

// ── ⑤#6 — GIAO DỊCH CUỘN LẠI khi nhật ký hỏng ─────────────────────────────────
// Ép hỏng bằng một trigger THẬT trên `nhat_ky`, không bằng mock: đây là ca «không truy
// ngược được thì không được phép làm», mà mock thì chỉ chứng minh mock chạy.
test("Y3-i · ghiNhatKy hỏng giữa chừng → CUỘN LẠI, page và con giữ nguyên team cũ", async () => {
  const p = await dungPageDayDu(tA, `i${++dem}`);
  await q(`CREATE FUNCTION ep_hong_nhat_ky() RETURNS trigger AS $$
           BEGIN RAISE EXCEPTION 'ép hỏng nhật ký (ca thử)'; END $$ LANGUAGE plpgsql`);
  await q(`CREATE TRIGGER tg_ep_hong BEFORE INSERT ON nhat_ky
           FOR EACH ROW EXECUTE FUNCTION ep_hong_nhat_ky()`);
  try {
    await assert.rejects(
      () =>
        chuyenPageSangTeam(
          sb.pool,
          { teamId: tA, nguoiDungId: quanTriA },
          { pageId: p.id, teamDichId: tB },
        ),
      /ép hỏng nhật ký/,
    );
  } finally {
    await q("DROP TRIGGER tg_ep_hong ON nhat_ky");
    await q("DROP FUNCTION ep_hong_nhat_ky()");
  }
  // Cả page LẪN con đều phải còn ở team cũ — nửa chừng là hỏng nặng hơn không làm gì.
  assert.equal(String(await teamCuaBang("page", "id", p.id)), String(tA));
  assert.equal(String(await teamCuaBang("hoi_thoai", "page_id", p.id)), String(tA));
  assert.equal(String(await teamCuaBang("don_hang", "page_id", p.id)), String(tA));
  assert.equal(
    String(await teamCuaBang("tin_cho_xu_ly", "page_id", p.page_id)),
    String(tA),
  );
});

// ── rào bối cảnh ──────────────────────────────────────────────────────────────
test("Y3-j · ctxHeThong() bị TỪ CHỐI — job nền không có vai để mà đòi", async () => {
  const p = await dungPageDayDu(tA, `j${++dem}`);
  await assert.rejects(
    () =>
      chuyenPageSangTeam(sb.pool, ctxHeThong(), {
        pageId: p.id,
        teamDichId: tB,
      }),
    LoiThieuBoiCanhTeam,
  );
});

test("Y3-k · thiếu ctx → LoiThieuBoiCanhTeam (không phải trả rỗng)", async () => {
  await assert.rejects(
    () => chuyenPageSangTeam(sb.pool, undefined, { pageId: 1, teamDichId: tB }),
    LoiThieuBoiCanhTeam,
  );
});

test("Y3-l · chuyển sang CHÍNH team đang có → ném, không đẻ nhật ký rỗng nghĩa", async () => {
  const p = await dungPageDayDu(tA, `l${++dem}`);
  const truoc = await demNhatKyChuyen();
  await assert.rejects(
    () =>
      chuyenPageSangTeam(
        sb.pool,
        { teamId: tA, nguoiDungId: quanTriA },
        { pageId: p.id, teamDichId: tA },
      ),
    /đã thuộc team/,
  );
  assert.equal(await demNhatKyChuyen(), truoc);
});

// ── bài học 2 của GD2: hằng mã vai phải khớp bảng `vai`, đọc từ CSDL chứ không gõ ─────
test("Y3-m · hằng VAI_DUOC_CHUYEN tồn tại THẬT trong bảng vai (chống lỗi gạch ngang/dưới)", async () => {
  const r = await mot("SELECT ma FROM vai WHERE ma = $1", [VAI_DUOC_CHUYEN]);
  console.log(`   [Y3-m] VAI_DUOC_CHUYEN="${VAI_DUOC_CHUYEN}" · bảng vai trả "${r?.ma}"`);
  assert.equal(r?.ma, VAI_DUOC_CHUYEN);
  // …và phép so KHÔNG lấy đáp án từ chính hằng đó: liệt kê cả bảng rồi soi.
  const ds = (await q("SELECT ma FROM vai ORDER BY ma")).rows.map((x) => x.ma);
  assert.ok(ds.includes("quan-tri"), `vai.ma thật: ${ds.join(",")}`);
  assert.ok(!ds.includes("quan_tri"), "gạch DƯỚI không được tồn tại — bài học 2 GD2");
});

// ── vá lệch cũ: dòng đã mồ côi sẵn cũng được kéo về đúng team ─────────────────
test("Y3-n · dòng con MỒ CÔI SẴN cũng theo page về team mới (cửa này vừa chuyển vừa vá)", async () => {
  const p = await dungPageDayDu(tA, `n${++dem}`);
  // Bịa một dòng lệch bằng SQL thẳng — đúng cảnh «ai đó gõ psql tay rồi quên con».
  await q("UPDATE hoi_thoai SET team_id = $1 WHERE page_id = $2", [tC, p.id]);
  assert.equal(String(await teamCuaBang("hoi_thoai", "page_id", p.id)), String(tC));

  await chuyenPageSangTeam(
    sb.pool,
    { teamId: tA, nguoiDungId: quanTriA },
    { pageId: p.id, teamDichId: tB },
  );
  assert.equal(String(await teamCuaBang("hoi_thoai", "page_id", p.id)), String(tB));
  const { moCoi } = await demMoCoi(sb.pool);
  assert.equal(moCoi.hoi_thoai, 0);
});
