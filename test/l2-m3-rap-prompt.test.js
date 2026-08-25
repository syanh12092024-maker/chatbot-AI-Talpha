// L2-M3 · Ráp prompt bốn khối từ DB — bộ ca cho src/chat/rap-prompt.js +
// db/di-tru/bo-luat-va-ky-nang.js. Cần DB thật (sandbox tự dựng/tự dọn, luật 11 sổ
// điều hành) — bộ ca "còn ngân sách/hết ngân sách qua handler thật" nằm ở
// test/l2-m3-handler.test.js; bộ ca THUẦN của ngân sách nằm ở
// test/l2-m3-ngan-sach-luot.test.js (không cần DB).
//
// Theo đúng 7 phép của ④ trong PHIEU-L2-M3.md, KHÔNG theo thứ tự phép — nhóm theo khối
// để chia sẻ fixture (page/san_pham/kich_ban) giữa các ca liên quan.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { CORE, buildSystem } from "../src/prompts.js";
import { getKBForPage } from "../src/kb.js";

let sb, teams;
let rapKb, docBoLuatChung, docKyNang;
let seedBoLuatVaKyNang, MA_KY_NANG_HOI_SIZE;

before(async () => {
  ({ rapKb, docBoLuatChung, docKyNang } =
    await import("../src/chat/rap-prompt.js"));
  ({ seedBoLuatVaKyNang, MA_KY_NANG_HOI_SIZE } =
    await import("../db/di-tru/bo-luat-va-ky-nang.js"));
  sb = await dungSandbox("l2m3");
  const r = await sb.pool.query(
    "SELECT id, slug FROM team WHERE NOT la_ky_thuat ORDER BY slug",
  );
  teams = Object.fromEntries(r.rows.map((t) => [t.slug, t.id]));
  // Seed mồi TRƯỚC mọi ca — đúng cách phiếu này được vận hành thật (npm run di-tru).
  await seedBoLuatVaKyNang(sb.pool);
});

after(async () => {
  if (sb) await sb.don();
});

async function taoPage(teamId, pageIdText, { trongDiem = false } = {}) {
  const r = await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten, trong_diem) VALUES ($1,$2,$3,$4) RETURNING id",
    [teamId, pageIdText, `page ${pageIdText}`, trongDiem],
  );
  return r.rows[0].id;
}
async function taoSanPham(
  teamId,
  pageRowId,
  ma,
  {
    ten = "SP test",
    mo_ta = "mô tả test",
    giaList = [{ soLuong: 1, gia: 100, tienTe: "AED" }],
  } = {},
) {
  const r = await sb.pool.query(
    "INSERT INTO san_pham (team_id, page_id, ma, ten, mo_ta) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [teamId, pageRowId, ma, ten, mo_ta],
  );
  for (const g of giaList) {
    await sb.pool.query(
      "INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,$3,$4,$5)",
      [teamId, r.rows[0].id, g.soLuong, g.gia, g.tienTe],
    );
  }
  return r.rows[0].id;
}
async function taoKichBanLive(teamId, pageRowId, config) {
  await sb.pool.query(
    `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may)
     VALUES ($1,$2,1,'LIVE',$3::jsonb,$4)`,
    [teamId, pageRowId, JSON.stringify(config), "noi dung may test"],
  );
}

// ═══ ①  Ráp đủ 4 khối ═══════════════════════════════════════════════════════════════
test("① page có đủ dữ liệu → kb ra ĐỦ 4 phần, buildSystem(kb) không ném, system chứa dấu vết 4 khối", async () => {
  process.env.V3_RAP_PROMPT_BAT = "1";
  try {
    const teamId = teams["tieu-alpha"];
    const pageId = "930000000000001";
    const pRowId = await taoPage(teamId, pageId, { trongDiem: true });
    await taoSanPham(teamId, pRowId, "SHOPX:VAR001", {
      ten: "Áo thun test L2M3",
    });
    await taoKichBanLive(teamId, pRowId, {
      tone: "thân thiện",
      greeting: "Chào ạ L2M3!",
      salesPrompt: "Bán áo thun co giãn tốt.",
    });
    await sb.pool.query(
      `INSERT INTO ky_nang (team_id, ma, ten, noi_dung, bat_cho_nhom_sp, bat)
       VALUES ($1,'test_skill_1','Kỹ năng test','Nội dung kỹ năng test độc nhất XYZ123',$2,true)`,
      [teamId, ["SHOPX:VAR001"]],
    );

    const kb = await rapKb(sb.pool, { teamId, pageIdText: pageId });
    assert.equal(kb.noData, false);
    assert.equal(kb.trongDiem, true);
    assert.deepEqual(kb.nguon_thieu, []);
    assert.ok(
      kb.blocks.boLuatChung,
      "phải đọc được bo_luat_chung (seed ở before)",
    );
    assert.ok(kb.blocks.kyNang.length >= 1);
    assert.ok(kb.blocks.kichBan);
    assert.equal(kb.blocks.sanPham.length, 1);
    console.log(
      `[① độ dài 4 khối] bo_luat_chung=${kb.blocks.boLuatChung.doDai} · ` +
        `ky_nang=${JSON.stringify(kb.blocks.kyNang.map((k) => k.doDai))} · ` +
        `kich_ban=${kb.blocks.kichBan.doDai} · ` +
        `san_pham=${JSON.stringify(kb.blocks.sanPham.map((s) => s.doDai))}`,
    );

    const system = buildSystem(kb);
    assert.doesNotThrow(() => JSON.stringify(system));
    const joined = system.map((b) => b.text).join("\n");
    assert.match(joined, /BỘ LUẬT CHUNG/, "dấu vết khối 1 (bo_luat_chung)");
    assert.match(
      joined,
      /Nội dung kỹ năng test độc nhất XYZ123/,
      "dấu vết khối 2 (ky_nang)",
    );
    assert.match(
      joined,
      /Bán áo thun co giãn tốt/,
      "dấu vết khối 3 (kich_ban, qua kb.config → buildSystem)",
    );
    assert.match(joined, /Áo thun test L2M3/, "dấu vết khối 4 (san_pham)");
  } finally {
    delete process.env.V3_RAP_PROMPT_BAT;
  }
});

// ═══ ②  bo_luat_chung — hợp đồng OR IS NULL + đọc mỗi lượt không cache ════════════════
test("② bo_luat_chung: NULL đọc được từ ctx cả 3 team (N3); version 2 chèn → ăn ngay, không cần restart", async () => {
  const slugs = ["tieu-alpha", "auus", "pialpha-eu"];
  const idDong = new Set();
  for (const s of slugs) {
    const row = await docBoLuatChung(sb.pool, teams[s]);
    assert.ok(row, `team ${s} phải đọc được dòng team_id=NULL`);
    assert.equal(row.phien_ban, 1);
    idDong.add(row.id);
  }
  assert.equal(
    idDong.size,
    1,
    "cả 3 team phải đọc CÙNG MỘT dòng vật lý (team_id NULL)",
  );
  console.log(
    `[② N3] 3 team (${slugs.join(",")}) cùng đọc dòng id=${[...idDong][0]}, v1`,
  );

  // ⚠️ SỬA 25/08 (G2-A4): chỉ mục `bo_luat_chung_mot_ban_dang_ap` (migration 009) làm
  // trạng thái «hai bản cùng dang_dung» KHÔNG tồn tại được nữa — đó là RF-17, và bộ ca này
  // trước đây tự dựng đúng cái trạng thái ấy. Hạ v1 rồi mới dựng v2, đúng như mọi nơi gọi
  // hợp lệ phải làm. Ý ĐỒ của ca không đổi: đo «version mới ăn NGAY, không cần restart».
  await sb.pool.query(
    "UPDATE bo_luat_chung SET dang_dung = false WHERE team_id IS NULL AND dang_dung",
  );
  await sb.pool.query(
    `INSERT INTO bo_luat_chung (team_id, phien_ban, noi_dung, dang_dung, nguoi_sua)
     VALUES (NULL, 2, 'BẢN VÁ v2 — test khong-restart-L2M3', true, 'test-l2m3')`,
  );
  const sau = await docBoLuatChung(sb.pool, teams["tieu-alpha"]);
  console.log(
    `[② KHÔNG restart] đọc ngay sau khi chèn v2 → phien_ban=${sau.phien_ban}`,
  );
  assert.equal(
    sau.phien_ban,
    2,
    "CÁCH CHỌN: rap-prompt.js#docBoLuatChung đọc lại DB MỖI LƯỢT (không giữ cache/TTL nào) " +
      "— version mới ăn ngay vì không có gì để hết hạn. Xem ghi chú đầu docBoLuatChung().",
  );
});

// ═══ ③  Kỹ năng theo nhóm sản phẩm — đối chứng in cả hai ═══════════════════════════════
test("③ kỹ năng theo nhóm SP — page nhóm có-size chứa skill, page nhóm khác KHÔNG chứa", async () => {
  const teamId = teams["auus"];
  await sb.pool.query(
    `INSERT INTO ky_nang (team_id, ma, ten, noi_dung, bat_cho_nhom_sp, bat)
     VALUES ($1,'test_size_only','SIZE ONLY','Nội dung riêng SP có size ABC999',$2,true)`,
    [teamId, ["AUUS:SIZE-SKU"]],
  );
  const pCo = await taoPage(teamId, "930000000000010");
  await taoSanPham(teamId, pCo, "AUUS:SIZE-SKU", { ten: "SP có size" });
  const pKhac = await taoPage(teamId, "930000000000011");
  await taoSanPham(teamId, pKhac, "AUUS:KHAC-SKU", { ten: "SP khác nhóm" });

  const dsCo = await docKyNang(sb.pool, teamId, ["AUUS:SIZE-SKU"]);
  const dsKhac = await docKyNang(sb.pool, teamId, ["AUUS:KHAC-SKU"]);
  console.log(
    `[③ đối chứng] nhóm có-size: [${dsCo.map((k) => k.ma).join(",")}] · ` +
      `nhóm khác: [${dsKhac.map((k) => k.ma).join(",")}]`,
  );
  assert.ok(
    dsCo.some((k) => k.ma === "test_size_only"),
    "nhóm CÓ-size PHẢI chứa skill",
  );
  assert.ok(
    !dsKhac.some((k) => k.ma === "test_size_only"),
    "nhóm KHÁC KHÔNG được chứa skill",
  );
});

// ═══ ④  Khối rỗng nói ra + fallback cờ config ═══════════════════════════════════════
test("④a khối rỗng nói ra — page thiếu kịch bản LIVE → kb.nguon_thieu liệt kê đúng khối", async () => {
  process.env.V3_RAP_PROMPT_BAT = "1";
  try {
    const teamId = teams["pialpha-eu"];
    const pRowId = await taoPage(teamId, "930000000000020");
    await taoSanPham(teamId, pRowId, "PIA:NOSCRIPT"); // có SP nhưng KHÔNG kịch bản LIVE
    const kb = await rapKb(sb.pool, {
      teamId,
      pageIdText: "930000000000020",
    });
    assert.equal(kb.noData, false, "có san_pham thì KHÔNG noData");
    console.log(`[④a] nguon_thieu=${JSON.stringify(kb.nguon_thieu)}`);
    assert.ok(kb.nguon_thieu.includes("kich_ban"));
  } finally {
    delete process.env.V3_RAP_PROMPT_BAT;
  }
});

test("④b fallback cờ config — VẮNG (mặc định) → lùi NGUYÊN VẸN về kb.js cũ, không đụng 4 khối DB", async () => {
  delete process.env.V3_RAP_PROMPT_BAT;
  const pageIdText = "khong-ton-tai-trong-db-930999";
  const kbCu = getKBForPage(pageIdText);
  const kb = await rapKb(sb.pool, {
    teamId: teams["tieu-alpha"],
    pageIdText,
  });
  console.log(
    `[④b] kb.nguon="${kb.nguon}" (đánh dấu đường LÙI thay cho spy — xem nhật ký phiếu)`,
  );
  assert.equal(kb.nguon, "kb_cu");
  assert.equal(kb.text, kbCu.text);
  assert.equal(kb.noData, kbCu.noData);
});

// ═══ ⑥  Seed mồi ═════════════════════════════════════════════════════════════════════
test("⑥ seed mồi bo_luat_chung v1 KHỚP NGUYÊN VĂN prompts.js#CORE + ky_nang hỏi size đủ 3 team", async () => {
  const v1 = await sb.pool.query(
    "SELECT noi_dung FROM bo_luat_chung WHERE team_id IS NULL AND phien_ban=1",
  );
  assert.equal(v1.rowCount, 1);
  assert.equal(
    v1.rows[0].noi_dung,
    CORE,
    "nội dung v1 phải RÚT (import) từ prompts.js#CORE, không chép tay",
  );
  console.log(
    `[⑥ diff mẩu, 200 ký tự đầu] ${v1.rows[0].noi_dung.slice(0, 200)}`,
  );

  for (const slug of ["tieu-alpha", "auus", "pialpha-eu"]) {
    const r = await sb.pool.query(
      "SELECT bat, bat_cho_nhom_sp FROM ky_nang WHERE team_id=$1 AND ma=$2",
      [teams[slug], MA_KY_NANG_HOI_SIZE],
    );
    assert.equal(
      r.rowCount,
      1,
      `team ${slug} phải có đúng 1 dòng kỹ năng hỏi size`,
    );
    assert.equal(
      r.rows[0].bat,
      false,
      "seed mặc định TẮT — chưa xác định được SKU thật (xem comment đầu file seed)",
    );
  }

  const truoc = await sb.pool.query(
    "SELECT count(*)::int c FROM bo_luat_chung WHERE team_id IS NULL AND phien_ban=1",
  );
  const kq2 = await seedBoLuatVaKyNang(sb.pool);
  const sau = await sb.pool.query(
    "SELECT count(*)::int c FROM bo_luat_chung WHERE team_id IS NULL AND phien_ban=1",
  );
  assert.equal(
    sau.rows[0].c,
    truoc.rows[0].c,
    "chạy lại KHÔNG đẻ thêm dòng v1 (idempotent)",
  );
  assert.equal(kq2.boLuatChung.them, false);
  assert.deepEqual(
    new Set(kq2.kyNang.giuNguyen),
    new Set(["tieu-alpha", "auus", "pialpha-eu"]),
  );
  assert.deepEqual(kq2.kyNang.them, []);
});
