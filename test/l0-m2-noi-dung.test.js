// G2-A4 · PHIÊN BẢN · DUYỆT · ĐO ẢNH HƯỞNG cho bộ luật chung và kỹ năng.
//
// Bộ luật chung là 2.256 token dùng chung. Sửa sai một dòng là mọi page đang bật bot đổi
// cách nói với khách trong MỘT lượt. Mọi ca ở đây chạm nhánh THẬT trên sandbox Postgres:
// giao dịch thật, chỉ mục thật, vai đọc từ `thanh_vien_team` thật.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  taoBanBoLuat,
  duyetBoLuat,
  apBoLuat,
  xemAnhHuongBoLuat,
  soSanhBoLuat,
  suaKyNang,
  luiKyNang,
  lichSuKyNang,
  xemAnhHuongKyNang,
  VAI_SUA_BO_LUAT,
  ctxHeThong,
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam,
} from "../src/db/index.js";
import { docKyNang, docBoLuatChung } from "../src/chat/rap-prompt.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

let tA, soanGia, duyetGia, saleA;
let ctxSoan, ctxDuyet, ctxSale;
let pageCoSize, pageKhongSize;

before(async () => {
  sb = await dungSandbox("l0m2noidung");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;

  const nguoi = async (email, vai) => {
    const id = (
      await mot("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id", [email])
    ).id;
    await q(
      `INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id)
       SELECT $1,$2,v.id FROM vai v WHERE v.ma = $3`,
      [tA, id, vai],
    );
    return id;
  };
  soanGia = await nguoi("soan@t.test", VAI_SUA_BO_LUAT[0]);
  duyetGia = await nguoi("duyet@t.test", VAI_SUA_BO_LUAT[0]);
  saleA = await nguoi("sale@t.test", "sale");
  ctxSoan = { teamId: tA, nguoiDungId: soanGia };
  ctxDuyet = { teamId: tA, nguoiDungId: duyetGia };
  ctxSale = { teamId: tA, nguoiDungId: saleA };

  // Hai page: một có sản phẩm CÓ SIZE, một không. Đây là đúng ví dụ của nghiệm thu sóng 1
  // («bật kỹ năng hỏi size cho nhóm sản phẩm có size → chỉ những page đó đổi»).
  const mkPage = async (fb, ten, batBot, maSp) => {
    const p = await mot(
      "INSERT INTO page (team_id,page_id,ten,bot_ai_bat) VALUES ($1,$2,$3,$4) RETURNING id",
      [tA, fb, ten, batBot],
    );
    if (maSp) {
      await q("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$4)", [
        tA, p.id, maSp, ten,
      ]);
    }
    return p;
  };
  // ⚠️ `san_pham` có `UNIQUE (team_id, ma)` — một mã sản phẩm chỉ thuộc ĐÚNG MỘT page
  // (đây là nợ đã biết ở §9 VA-R2: shop nhiều page thì `docDanhMuc` để null). Nên hai page
  // «cùng nhóm áo có size» phải mang HAI mã, và phạm vi kỹ năng liệt kê cả hai.
  pageCoSize = await mkPage("fb-size", "Page áo có size", true, "shop:ao-size");
  pageKhongSize = await mkPage("fb-nosize", "Page nến không size", true, "shop:nen");
  await mkPage("fb-tat", "Page áo có size, bot TẮT", false, "shop:ao-size-2");

  await q(
    `INSERT INTO ky_nang (team_id, ma, ten, noi_dung, bat_cho_nhom_sp, bat, phien_ban)
     VALUES ($1,'hoi-size','Hỏi size','Luôn hỏi size trước khi chốt.','{}',true,1)`,
    [tA],
  );
});
after(async () => {
  await sb.don();
});

const banDangAp = () =>
  mot("SELECT id, phien_ban, noi_dung FROM bo_luat_chung WHERE team_id=$1 AND dang_dung", [tA]);

// ══ BỘ LUẬT CHUNG ═══════════════════════════════════════════════════════════════════

test("N1 · tạo bản mới KHÔNG áp ngay — bản đang chạy không bị đụng", async () => {
  await q(
    `INSERT INTO bo_luat_chung (team_id, phien_ban, noi_dung, dang_dung, nguoi_sua)
     VALUES ($1, 1, 'Dòng A\nDòng B\nDòng C', true, 'seed')`,
    [tA],
  );
  const truoc = await banDangAp();
  const moi = await taoBanBoLuat(sb.pool, ctxSoan, {
    noiDung: "Dòng A\nDòng B ĐÃ SỬA\nDòng D",
    ghiChu: "thử nghiệm N1",
  });
  console.log(`   [N1] bản mới v${moi.phien_ban}, dang_dung=${moi.dang_dung}`);
  assert.equal(moi.dang_dung, false);
  assert.equal(Number(moi.phien_ban), 2);
  const sau = await banDangAp();
  assert.equal(String(sau.id), String(truoc.id), "bản đang chạy KHÔNG được đổi");
});

test("N2 · người SOẠN không tự duyệt bản của mình (bốn mắt)", async () => {
  const b = await mot("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=2", [tA]);
  await assert.rejects(
    () => duyetBoLuat(sb.pool, ctxSoan, { id: b.id }),
    LoiXuyenTeam,
  );
});

test("N3 · người KHÁC duyệt được, và dấu duyệt ghi xuống CSDL", async () => {
  const b = await mot("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=2", [tA]);
  const r = await duyetBoLuat(sb.pool, ctxDuyet, { id: b.id });
  console.log(`   [N3] duyet_boi=${r.duyet_boi}`);
  assert.equal(r.duyet_boi, `nguoi:${duyetGia}`);
  assert.ok(r.duyet_luc);
});

test("N4 · đề xuất của AI CHƯA duyệt → TỪ CHỐI áp (01 §9)", async () => {
  const b = await taoBanBoLuat(sb.pool, ctxSoan, {
    noiDung: "Bản AI đề xuất",
    nguon: "ai",
  });
  await assert.rejects(
    () => apBoLuat(sb.pool, ctxDuyet, { id: b.id }),
    /ĐỀ XUẤT CỦA AI và chưa ai duyệt/,
  );
  const van = await banDangAp();
  assert.equal(Number(van.phien_ban), 1, "bản đang áp không được đổi");
});

test("N5 · áp bản người viết → đổi bản đang chạy, và TRẢ VỀ số page bị ảnh hưởng", async () => {
  const b = await mot("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=2", [tA]);
  const kq = await apBoLuat(sb.pool, ctxDuyet, { id: b.id, lyDo: "chốt nội dung mới" });
  console.log(
    `   [N5] ảnh hưởng: ${kq.anhHuong.soPage} page · ${kq.anhHuong.soPageDangBatBot} đang bật bot`,
  );
  assert.equal(Number((await banDangAp()).phien_ban), 2);
  assert.equal(kq.anhHuong.soPage, 3);
  assert.equal(kq.anhHuong.soPageDangBatBot, 2); // page tắt bot KHÔNG đổi cách nói
  assert.equal(kq.laLui, false);
});

test("N6 · CHỈ MỤC chặn hai bản cùng đang áp — kể cả ghi thẳng qua SQL", async () => {
  // Đây là RF-17. Cửa API không phải rào duy nhất: kể cả ai đó ghi thẳng bằng psql thì
  // trạng thái «hai bản cùng dang_dung» cũng KHÔNG tồn tại được.
  const khac = await mot(
    "SELECT id FROM bo_luat_chung WHERE team_id=$1 AND NOT dang_dung ORDER BY phien_ban LIMIT 1",
    [tA],
  );
  await assert.rejects(
    () => q("UPDATE bo_luat_chung SET dang_dung = true WHERE id = $1", [khac.id]),
    /bo_luat_chung_mot_ban_dang_ap/,
  );
});

test("N7 · LÙI là CÙNG một hàm, và nhật ký nói rõ đây là lượt lùi", async () => {
  const v1 = await mot("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=1", [tA]);
  const kq = await apBoLuat(sb.pool, ctxDuyet, { id: v1.id, lyDo: "bản mới nói sai giá" });
  console.log(`   [N7] laLui=${kq.laLui} · v${kq.banCu.phien_ban} → v${kq.ban.phien_ban}`);
  assert.equal(kq.laLui, true);
  assert.equal(Number((await banDangAp()).phien_ban), 1);
  const nk = await mot(
    `SELECT sau::text s FROM nhat_ky WHERE hanh_dong='ap_bo_luat'
      ORDER BY id DESC LIMIT 1`,
  );
  assert.match(nk.s, /"la_lui":\s*true/);
});

test("N8 · áp là MỘT GIAO DỊCH — nhật ký hỏng thì bản cũ VẪN đang áp", async () => {
  // Bản của người B làm việc này bằng hai lời gọi rời và tự khai «không có giao dịch»:
  // hạ xong mà dựng hỏng thì team không còn bản nào đang áp và prompt rơi về bản toàn hệ,
  // tức mọi page đang bật bot đổi cách nói mà KHÔNG ai bấm nút nào. Ca này khoá lại.
  const truoc = await banDangAp();
  const v2 = await mot("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=2", [tA]);
  await q(`CREATE FUNCTION ep_hong_nk() RETURNS trigger AS $$
           BEGIN RAISE EXCEPTION 'ép hỏng nhật ký (ca thử)'; END $$ LANGUAGE plpgsql`);
  await q(`CREATE TRIGGER tg_ep_hong_nk BEFORE INSERT ON nhat_ky
           FOR EACH ROW EXECUTE FUNCTION ep_hong_nk()`);
  try {
    await assert.rejects(
      () => apBoLuat(sb.pool, ctxDuyet, { id: v2.id }),
      /ép hỏng nhật ký/,
    );
  } finally {
    await q("DROP TRIGGER tg_ep_hong_nk ON nhat_ky");
    await q("DROP FUNCTION ep_hong_nk()");
  }
  const sau = await banDangAp();
  console.log(`   [N8] sau lượt hỏng: vẫn đang áp v${sau.phien_ban}`);
  assert.equal(String(sau.id), String(truoc.id), "cuộn lại phải giữ NGUYÊN bản đang áp");
  // …và tuyệt đối không được rơi vào cảnh «không bản nào đang áp».
  const dem = await mot(
    "SELECT count(*)::int c FROM bo_luat_chung WHERE team_id=$1 AND dang_dung", [tA],
  );
  assert.equal(dem.c, 1);
});

test("N9 · so sánh hai bản: nói rõ dòng nào bỏ, dòng nào thêm", async () => {
  const kq = await soSanhBoLuat(sb.pool, ctxSoan, { tuPhienBan: 1, denPhienBan: 2 });
  console.log(`   [N9] bỏ ${kq.boDi.length} dòng · thêm ${kq.themVao.length} dòng`);
  assert.deepEqual(kq.boDi, ["Dòng B", "Dòng C"]);
  assert.deepEqual(kq.themVao, ["Dòng B ĐÃ SỬA", "Dòng D"]);
  assert.ok(kq.phepSo, "phép so phải TỰ KHAI nó là phép gì");
});

test("N10 · vai `sale` không sửa/áp/duyệt được; ctxHeThong bị từ chối", async () => {
  await assert.rejects(
    () => taoBanBoLuat(sb.pool, ctxSale, { noiDung: "x" }),
    LoiXuyenTeam,
  );
  await assert.rejects(
    () => taoBanBoLuat(sb.pool, ctxHeThong(), { noiDung: "x" }),
    LoiThieuBoiCanhTeam,
  );
});

test("N11 · xemAnhHuongBoLuat tách «tổng page» khỏi «page đang bật bot»", async () => {
  const ah = await xemAnhHuongBoLuat(sb.pool, ctxSoan);
  console.log(`   [N11] ${ah.soPage} page · ${ah.soPageDangBatBot} đang bật bot`);
  assert.equal(ah.soPage, 3);
  assert.equal(ah.soPageDangBatBot, 2);
});

// ══ KỸ NĂNG ═════════════════════════════════════════════════════════════════════════

test("N12 · sửa kỹ năng → bản cũ vào LỊCH SỬ, bảng gốc VẪN đúng một dòng", async () => {
  // Bảng gốc phải giữ một dòng mỗi (team, ma): màn «Thư viện kỹ năng» của người B đọc
  // `db.chon('ky_nang', {})` và hiện mỗi dòng là một kỹ năng. Nhét phiên bản vào chính
  // bảng đó là màn của họ hiện một kỹ năng thành N dòng.
  await suaKyNang(sb.pool, ctxSoan, {
    ma: "hoi-size",
    noiDung: "Hỏi size VÀ hỏi màu trước khi chốt.",
    batChoNhomSp: ["shop:ao-size", "shop:ao-size-2"],
    ghiChu: "khoanh lại cho nhóm có size",
  });
  const dong = await mot(
    "SELECT count(*)::int c FROM ky_nang WHERE team_id=$1 AND ma='hoi-size'", [tA],
  );
  const ls = await lichSuKyNang(sb.pool, ctxSoan, { ma: "hoi-size" });
  console.log(`   [N12] bảng gốc ${dong.c} dòng · lịch sử ${ls.length} bản`);
  assert.equal(dong.c, 1, "bảng gốc phải giữ ĐÚNG một dòng");
  assert.equal(ls.length, 2);
  assert.equal(ls[0].dangDung, true);
  assert.equal(Number(ls[0].phien_ban), 2);
});

test("N13 · đo ảnh hưởng kỹ năng: phạm vi khoanh → đúng những page có mã đó", async () => {
  const ah = await xemAnhHuongKyNang(sb.pool, ctxSoan, { ma: "hoi-size" });
  console.log(
    `   [N13] phạm vi=${JSON.stringify(ah.phamVi)} → ${ah.soPage} page (${ah.soPageDangBatBot} bật bot)`,
  );
  assert.equal(ah.caTeam, false);
  assert.equal(ah.soPage, 2); // fb-size + fb-tat — hai page trong nhóm «áo có size»
  assert.equal(ah.soPageDangBatBot, 1); // fb-tat đang tắt bot
  assert.ok(!ah.dsPage.some((p) => p.pageId === "fb-nosize"));
});

test("N14 · xem TRƯỚC khi bấm: truyền phạm vi ĐỊNH đặt, chưa ghi xuống", async () => {
  const ah = await xemAnhHuongKyNang(sb.pool, ctxSoan, {
    ma: "hoi-size",
    batChoNhomSp: [],
  });
  console.log(`   [N14] nếu bỏ khoanh → ${ah.soPage} page`);
  assert.equal(ah.caTeam, true);
  assert.equal(ah.soPage, 3);
  // …và phạm vi đang LƯU không được đổi vì một lượt xem trước.
  const k = await mot(
    "SELECT bat_cho_nhom_sp FROM ky_nang WHERE team_id=$1 AND ma='hoi-size'", [tA],
  );
  assert.deepEqual(k.bat_cho_nhom_sp, ["shop:ao-size", "shop:ao-size-2"]);
});

// ══ CA QUAN TRỌNG NHẤT ══════════════════════════════════════════════════════════════
test("N15 · phép ĐẾM ảnh hưởng khớp ĐÚNG bộ đọc prompt thật, page-by-page", async () => {
  // «Bao nhiêu page bị ảnh hưởng» chỉ đúng nếu nó dùng đúng luật mà bộ ráp prompt dùng lúc
  // chạy thật. Ca này KHÔNG so hai công thức trên giấy — nó chạy CẢ HAI trên từng page rồi
  // đối chiếu danh sách. Hai bản cài của cùng một luật là cách chắc nhất để màn hình nói
  // «2 page» trong khi bot đổi giọng ở 3 page.
  const ah = await xemAnhHuongKyNang(sb.pool, ctxSoan, { ma: "hoi-size" });
  const theoApi = ah.dsPage.map((p) => p.pageId).sort();

  const pages = (await q("SELECT id, page_id FROM page WHERE team_id=$1 ORDER BY page_id", [tA])).rows;
  const theoBoDoc = [];
  for (const p of pages) {
    const sp = (
      await q("SELECT ma FROM san_pham WHERE team_id=$1 AND page_id=$2", [tA, p.id])
    ).rows.map((x) => x.ma);
    const kn = await docKyNang(sb.pool, tA, sp); // ← BỘ ĐỌC THẬT của đường chat
    if (kn.some((k) => k.ma === "hoi-size")) theoBoDoc.push(p.page_id);
  }
  theoBoDoc.sort();
  console.log(`   [N15] API=${JSON.stringify(theoApi)} · bộ đọc=${JSON.stringify(theoBoDoc)}`);
  assert.deepEqual(theoApi, theoBoDoc, "phép đếm ảnh hưởng LỆCH bộ đọc prompt thật");
});

test("N16 · lùi kỹ năng về bản cũ, và vẫn tiến lại được (lùi ≠ xoá)", async () => {
  const truoc = await mot(
    "SELECT noi_dung, phien_ban FROM ky_nang WHERE team_id=$1 AND ma='hoi-size'", [tA],
  );
  const r = await luiKyNang(sb.pool, ctxSoan, { ma: "hoi-size", phienBan: 1 });
  console.log(`   [N16] v${truoc.phien_ban} → lùi về v1, thành v${r.phien_ban}`);
  assert.equal(r.noi_dung, "Luôn hỏi size trước khi chốt.");
  assert.equal(Number(r.phien_ban), Number(truoc.phien_ban) + 1); // lùi vẫn TIẾN số bản
  // Bản vừa bị đè phải còn trong lịch sử ⇒ tiến lại được.
  const ls = await lichSuKyNang(sb.pool, ctxSoan, { ma: "hoi-size" });
  assert.ok(ls.some((x) => Number(x.phien_ban) === Number(truoc.phien_ban)));
});

test("N17 · bộ đọc prompt vẫn đọc ra ĐÚNG bản bộ luật đang áp", async () => {
  // Vòng khép kín: mọi thứ trên chỉ có nghĩa nếu bot thật sự đọc bản đang áp.
  const dangAp = await banDangAp();
  const doc = await docBoLuatChung(sb.pool, tA);
  console.log(`   [N17] đang áp v${dangAp.phien_ban} · bộ đọc trả v${doc.phien_ban}`);
  assert.equal(String(doc.id), String(dangAp.id));
});
