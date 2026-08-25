// L0-M1 · LƯỢC ĐỒ — các hợp đồng phải đúng ở tầng CSDL, không phải ở tầng quy ước.
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_luocdo`), tự dựng tự dọn.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa, giaiMa, ghiCauHinhModel, ghiKhoaNha } from "../db/khoa.js";
import { danhSachBan, len, xuong, sinhSchema } from "../db/migrate.js";
import fs from "node:fs";
import path from "node:path";
import { GOC } from "../db/ket-noi.js";

// NEO NGOÀI: 19 tên bảng trích từ `docs/v3/02-KE-HOACH-CODE.md` §"Nền dữ liệu".
// Cố ý gõ tay ở đây thay vì đọc từ lược đồ — hai vế cùng sinh từ một nguồn thì phép
// so luôn xanh và không bắt được bảng thiếu lẫn bảng thừa (finding N5).
// 22/08 TỔNG vá theo §9 (L1-M1): +ket_noi_pos (bảng 20). 23/08 vá tiếp theo §9 (L2-M1):
// +tin_cho_xu_ly (bảng 21, migration 003) — 004 KHÔNG thêm bảng.
// 25/08 G2-A2 (PHIEU-B-Y2): +khoa_nha (bảng 22, migration 008) — khoá API tách khỏi
// `cau_hinh_model` để MỘT khoá mỗi (team × nhà), thay vì một bản mỗi dòng vai trò.
const NEO_19_BANG = [
  "ket_noi_pos",
  "tin_cho_xu_ly",
  "khoa_nha",
  "team",
  "nguoi_dung",
  "vai",
  "thanh_vien_team",
  "cau_hinh_model",
  "page",
  "san_pham",
  "goi_gia",
  "khach",
  "hoi_thoai",
  "so_ai",
  "don_hang",
  "viec_can_xu_ly",
  "hang_cho_tao_don",
  "kich_ban",
  "bo_luat_chung",
  "ky_nang",
  "lich_nhac",
  "nhat_ky",
].sort();

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

// Bối cảnh mã hoá của riêng bộ ca — không đụng .env, không đòi máy phải có sẵn khoá.
const MOI_TRUONG = { V3_KHOA_MA_HOA: "a".repeat(64) };

before(async () => {
  sb = await dungSandbox("luocdo");
});
after(async () => {
  await sb.don();
});

test("S1 · danh sách bảng khớp NEO NGOÀI 19 tên của 02 (+ _migrations)", async () => {
  const r = await q(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const that = r.rows
    .map((x) => x.table_name)
    .filter((t) => t !== "_migrations")
    .sort();
  const thieu = NEO_19_BANG.filter((t) => !that.includes(t));
  const thua = that.filter((t) => !NEO_19_BANG.includes(t));
  assert.deepEqual({ thieu, thua }, { thieu: [], thua: [] });
  assert.equal(that.length, 22); // 19 của 02 + ket_noi_pos (002) + tin_cho_xu_ly (003) + khoa_nha (008)
});

test("S2 · phủ team_id: 0 bảng nghiệp vụ thiếu cột, chỉ bo_luat_chung được NULLABLE", async () => {
  const thieu = await q(
    `SELECT t.table_name FROM information_schema.tables t
     WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
       AND t.table_name NOT IN ('team','nguoi_dung','vai','_migrations')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns c
                       WHERE c.table_schema='public' AND c.table_name=t.table_name
                         AND c.column_name='team_id')`,
  );
  assert.deepEqual(
    thieu.rows.map((x) => x.table_name),
    [],
  );

  const long = await q(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema='public' AND column_name='team_id' AND is_nullable='YES'`,
  );
  assert.deepEqual(
    long.rows.map((x) => x.table_name),
    ["bo_luat_chung"],
  );
});

test("S3 · seed: đúng 4 team (1 kỹ thuật) + 5 vai", async () => {
  const t = await q("SELECT slug, la_ky_thuat FROM team ORDER BY slug");
  assert.deepEqual(
    t.rows.map((x) => x.slug),
    ["auus", "chua-phan", "pialpha-eu", "tieu-alpha"],
  );
  assert.deepEqual(
    t.rows.filter((x) => x.la_ky_thuat).map((x) => x.slug),
    ["chua-phan"],
  );
  const v = await q("SELECT ma FROM vai ORDER BY ma");
  assert.deepEqual(
    v.rows.map((x) => x.ma),
    ["duyet-kich-ban", "marketer", "quan-ly", "quan-tri", "sale"],
  );
});

test("S4 · RÀO team kỹ thuật: DB TỪ CHỐI gán thành viên vào chua-phan", async () => {
  const u = await mot(
    "INSERT INTO nguoi_dung (email, ten) VALUES ('rao@test.local','Rào') RETURNING id",
  );
  await assert.rejects(
    () =>
      q(
        `INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id)
       SELECT t.id, $1, v.id FROM team t, vai v WHERE t.slug='chua-phan' AND v.ma='quan-tri'`,
        [u.id],
      ),
    /team ky thuat/,
  );
  // …còn team NGHIỆP VỤ thì vào được — cổng phải có một ca CHO-QUA thật.
  const ok = await q(
    `INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id)
     SELECT t.id, $1, v.id FROM team t, vai v WHERE t.slug='tieu-alpha' AND v.ma='sale'`,
    [u.id],
  );
  assert.equal(ok.rowCount, 1);
  // …và cửa RA còn lại: không lật được một team đang có người thành team kỹ thuật.
  await assert.rejects(
    () => q("UPDATE team SET la_ky_thuat = true WHERE slug = 'tieu-alpha'"),
    /dang co thanh vien/,
  );
  await q("DELETE FROM thanh_vien_team WHERE nguoi_dung_id = $1", [u.id]);
  await q("DELETE FROM nguoi_dung WHERE id = $1", [u.id]);
});

test("S5 · CHỈ INSERT: nhat_ky và so_ai từ chối UPDATE lẫn DELETE", async () => {
  const t = await mot("SELECT id FROM team WHERE slug='chua-phan'");
  const n = await mot(
    `INSERT INTO nhat_ky (team_id, tac_nhan, hanh_dong) VALUES ($1,'may:test','nhap') RETURNING id`,
    [t.id],
  );
  await assert.rejects(
    () => q("UPDATE nhat_ky SET hanh_dong='x' WHERE id=$1", [n.id]),
    /chi INSERT/,
  );
  await assert.rejects(
    () => q("DELETE FROM nhat_ky WHERE id=$1", [n.id]),
    /chi INSERT/,
  );

  const s = await mot(
    `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, nguon_tep, nguon_dong)
     VALUES ($1, now(), '1', '2', 'reply', 'kimi-k2.6', 'mau.jsonl', 1) RETURNING id`,
    [t.id],
  );
  await assert.rejects(
    () => q("UPDATE so_ai SET ma_model='x' WHERE id=$1", [s.id]),
    /chi INSERT/,
  );
  await assert.rejects(
    () => q("DELETE FROM so_ai WHERE id=$1", [s.id]),
    /chi INSERT/,
  );
});

test("S6 · hợp đồng đọc bo_luat_chung: (team_id=$ctx OR team_id IS NULL) — đếm DELTA", async () => {
  const ctx = async (slug) => {
    const r = await q(
      `SELECT count(*)::int c FROM bo_luat_chung
       WHERE team_id = (SELECT id FROM team WHERE slug=$1) OR team_id IS NULL`,
      [slug],
    );
    return r.rows[0].c;
  };
  // 23/08 VA-T1 vá (chẩn đoán #1, khuôn giống ops/bin/nghiem-thu/l0-m1.sh ⑦): đếm
  // TUYỆT ĐỐI ăn may theo trạng thái seed của bo_luat_chung — sandbox `dungSandbox()`
  // ở đây KHÔNG chạy di-tru nên hôm nay vẫn 0 dòng trước khi chèn, nhưng đếm SAU−TRƯỚC
  // quanh đúng hai dòng ca này tự chèn mới là bất biến ĐÚNG dù seed tương lai có gì.
  const truoc = {
    tieuAlpha: await ctx("tieu-alpha"),
    auus: await ctx("auus"),
    pialphaEu: await ctx("pialpha-eu"),
  };
  await q(
    "INSERT INTO bo_luat_chung (team_id, noi_dung) VALUES (NULL, 'luat toan he')",
  );
  await q(`INSERT INTO bo_luat_chung (team_id, noi_dung)
           SELECT id, 'luat rieng tieu-alpha' FROM team WHERE slug='tieu-alpha'`);
  assert.equal((await ctx("tieu-alpha")) - truoc.tieuAlpha, 2);
  assert.equal((await ctx("auus")) - truoc.auus, 1);
  assert.equal((await ctx("pialpha-eu")) - truoc.pialphaEu, 1);
  // Luật ĐỒNG NHẤT `team_id = $ctx` (không có vế NULL) làm mất dòng toàn hệ — đó là
  // chính xác cái bẫy N3 mà L0-M2 phải tránh; giữ ca này làm bằng chứng.
  const dongNhat = await mot(
    `SELECT count(*)::int c FROM bo_luat_chung
     WHERE team_id = (SELECT id FROM team WHERE slug='auus')`,
  );
  assert.equal(dongNhat.c, 0);
});

test("S7 · khoá API lưu dạng MÃ HOÁ ở `khoa_nha`, DB chặn bản nguyên văn", async () => {
  const KHOA_THAT = "sk-that-khong-duoc-lo-0123456789";
  await ghiCauHinhModel(
    sb.pool,
    {
      teamSlug: "tieu-alpha",
      vaiTro: "chinh",
      nhaCungCap: "moonshot",
      maModel: "kimi-k2.6",
      khoaApi: KHOA_THAT,
    },
    MOI_TRUONG,
  );
  const r = await mot(
    `SELECT k.khoa_api_ma FROM khoa_nha k JOIN team t ON t.id = k.team_id
      WHERE t.slug='tieu-alpha' AND k.nha_cung_cap='moonshot'`,
  );
  assert.ok(
    r.khoa_api_ma.startsWith("v1."),
    `đã lưu: ${r.khoa_api_ma.slice(0, 10)}`,
  );
  assert.ok(!/^(sk-|ey)/.test(r.khoa_api_ma));
  assert.ok(!r.khoa_api_ma.includes(KHOA_THAT));
  assert.equal(giaiMa(r.khoa_api_ma, MOI_TRUONG), KHOA_THAT);

  // `cau_hinh_model` KHÔNG còn cột khoá — đó là cả cái lý do của migration 008.
  const conCot = await mot(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_name='cau_hinh_model' AND column_name='khoa_api_ma'`,
  );
  assert.equal(conCot.c, 0);

  // Rào ở tầng DB THEO CỘT sang bảng mới: có cố ghi thẳng cũng không lọt.
  await assert.rejects(
    () =>
      q(
        `INSERT INTO khoa_nha (team_id, nha_cung_cap, khoa_api_ma)
             SELECT id,'openai',$1 FROM team WHERE slug='tieu-alpha'`,
        [KHOA_THAT],
      ),
    /khoa_nha_khoa_api_ma_check/,
  );
  // Thiếu khoá gốc thì NÉM LỖI, không rơi về khoá mặc định.
  assert.throws(() => maHoa("abc", {}), /V3_KHOA_MA_HOA/);
});

// ── ④#2 và ④#4 của PHIEU-B-Y2 — chính cái lỗi im lặng mà 008 sinh ra để vá ────────
test("S7b · một team dùng CÙNG nhà cho ô chính và ô nền → khoá lưu ĐÚNG MỘT bản", async () => {
  const K1 = "sk-kimi-ban-dau-000000000000";
  const chung = { teamSlug: "auus", nhaCungCap: "kimi" };
  await ghiCauHinhModel(
    sb.pool,
    { ...chung, vaiTro: "chinh", maModel: "kimi-k2.6", khoaApi: K1 },
    MOI_TRUONG,
  );
  await ghiCauHinhModel(
    sb.pool,
    { ...chung, vaiTro: "nen", maModel: "kimi-k2.5", khoaApi: K1 },
    MOI_TRUONG,
  );

  // ④#2 — không còn CÁCH NÀO lưu hai bản khoá cho cùng một nhà.
  const dem = await mot(
    `SELECT count(*)::int c FROM khoa_nha k JOIN team t ON t.id=k.team_id
      WHERE t.slug='auus' AND k.nha_cung_cap='kimi'`,
  );
  console.log(`   [S7b] chinh + nen cùng nhà kimi → ${dem.c} bản khoá (chờ 1)`);
  assert.equal(dem.c, 1);

  // ④#4 — ĐỔI khoá MỘT LẦN là đủ cho MỌI ô dùng nhà đó. Đây là ca mà lược đồ cũ hỏng:
  // sửa ô «chính» xong ô «nền» giữ khoá cũ ⇒ chat chạy, việc nền chết câm.
  const K2 = "sk-kimi-da-doi-1111111111111";
  await ghiKhoaNha(sb.pool, { ...chung, khoaApi: K2 }, MOI_TRUONG);

  const oCuaTeam = await q(
    `SELECT c.vai_tro, k.khoa_api_ma
       FROM cau_hinh_model c
       JOIN team t ON t.id = c.team_id
       LEFT JOIN khoa_nha k ON k.team_id=c.team_id AND k.nha_cung_cap=c.nha_cung_cap
      WHERE t.slug='auus' AND c.nha_cung_cap='kimi' ORDER BY c.vai_tro`,
  );
  const doc = oCuaTeam.rows.map((x) => giaiMa(x.khoa_api_ma, MOI_TRUONG));
  console.log(
    `   [S7b] ${oCuaTeam.rows.length} ô dùng nhà kimi → ${doc.filter((d) => d === K2).length} ô đọc ra khoá MỚI`,
  );
  assert.equal(oCuaTeam.rows.length, 2);
  assert.deepEqual(doc, [K2, K2]); // cả `chinh` lẫn `nen`, không sót ô nào
});

test("S8 · don_hang: nguồn bắt buộc + trạng thái hệ TÁCH trạng thái POS", async () => {
  const t = await mot("SELECT id FROM team WHERE slug='auus'");
  await assert.rejects(
    () =>
      q(
        `INSERT INTO don_hang (team_id, nguon, trang_thai_he) VALUES ($1,'zalo','moi')`,
        [t.id],
      ),
    /don_hang_nguon_check/,
  );
  const d = await mot(
    `INSERT INTO don_hang (team_id, nguon, trang_thai_he, trang_thai_pos)
     VALUES ($1,'trang_ban_hang','cho_khach_tra_loi','cho_xac_nhan') RETURNING trang_thai_he, trang_thai_pos`,
    [t.id],
  );
  assert.deepEqual(d, {
    trang_thai_he: "cho_khach_tra_loi",
    trang_thai_pos: "cho_xac_nhan",
  });
});

test("S9 · khach.so_dien_thoai NULL được, unique khi CÓ giá trị, riêng theo team", async () => {
  const a = await mot("SELECT id FROM team WHERE slug='auus'");
  const b = await mot("SELECT id FROM team WHERE slug='pialpha-eu'");
  await q("INSERT INTO khach (team_id) VALUES ($1)", [a.id]);
  await q("INSERT INTO khach (team_id) VALUES ($1)", [a.id]); // hai dòng NULL cùng team = được
  await q(
    "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,'971500000001')",
    [a.id],
  );
  await q(
    "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,'971500000001')",
    [b.id],
  ); // team khác = được
  await assert.rejects(
    () =>
      q(
        "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,'971500000001')",
        [a.id],
      ),
    /khach_sdt_trong_team/,
  );
  const c = await mot(
    "SELECT count(*)::int c FROM khach WHERE so_dien_thoai IS NULL",
  );
  assert.equal(c.c, 2);
});

test("S10 · kich_ban: nhiều nhất MỘT bản LIVE mỗi page", async () => {
  const t = await mot("SELECT id FROM team WHERE slug='chua-phan'");
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten) VALUES ($1,'999000111','Page nháp') RETURNING id`,
    [t.id],
  );
  const chen = (v, tt) =>
    q(
      `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may)
     VALUES ($1,$2,$3,$4,'{}'::jsonb,'')`,
      [t.id, p.id, v, tt],
    );
  await chen(1, "LIVE");
  await chen(2, "ARCHIVED");
  await assert.rejects(() => chen(3, "LIVE"), /kich_ban_live_moi_page/);
});

test("S11 · schema.sql là bản SINH RA từ migrate/, không phải bản chép tay thứ hai", () => {
  const tren_dia = fs.readFileSync(path.join(GOC, "db", "schema.sql"), "utf8");
  assert.equal(
    tren_dia,
    sinhSchema(),
    "db/schema.sql lệch db/migrate/*.up.sql — chạy `node db/migrate.js schema`",
  );
  assert.ok(danhSachBan().length >= 1);
});

test("S12 · diễn tập down → up trên CSDL ĐÃ có dữ liệu: sạch rồi dựng lại được", async () => {
  const truoc = await mot("SELECT count(*)::int c FROM khach");
  assert.ok(
    truoc.c > 0,
    "ca này phải chạy trên CSDL đã có dữ liệu, không phải DB vừa up xong",
  );
  await xuong(sb.pool, { het: true, im: true });
  const con = await mot(
    `SELECT count(*)::int c FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '_migrations'`,
  );
  assert.equal(con.c, 0);
  await len(sb.pool, { im: true });
  const sau = await mot(
    `SELECT count(*)::int c FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '_migrations'`,
  );
  assert.equal(sau.c, 22); // 19 + ket_noi_pos + tin_cho_xu_ly + khoa_nha
});
