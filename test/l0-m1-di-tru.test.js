// L0-M1 · DI TRÚ — chạy trên CHÍNH các tệp JSON thật ở gốc repo (không fixture bịa),
// nhưng ghi vào CSDL sandbox riêng `aicloser_v3_test_ditru` (tự dựng, tự dọn).
//
// Mọi phép ở đây in/khẳng định HAI VẾ (nguồn ↔ đích) hoặc MỘT DANH SÁCH — không có
// phép nào chỉ nói «chạy xong không lỗi».
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { dungSandbox } from "../db/sandbox.js";
import { GOC } from "../db/ket-noi.js";
import { chay } from "../db/di-tru/index.js";
import { napPage } from "../db/di-tru/nap.js";
import os from "node:os";
import path from "node:path";
import {
  BAN_DO_CONV_STATE,
  docPages,
  docAiEnabled,
  docConvState,
  docKichBan,
  duongDan,
  pageLac,
} from "../db/di-tru/nguon.js";

let sb;
let kq1;
let dauTep; // vân tay tệp nguồn TRƯỚC lượt di trú

const vanTayNguon = () =>
  Object.fromEntries(
    Object.entries(duongDan(GOC)).map(([k, p]) => {
      const s = fs.statSync(p);
      return [k, `${s.size}|${s.mtimeMs}`];
    }),
  );

before(async () => {
  sb = await dungSandbox("ditru");
  dauTep = vanTayNguon();
  kq1 = await chay(sb.pool, GOC);
});
after(async () => {
  await sb.don();
});

test("D1 · mọi trường của conv-state.json đều có ĐÍCH khai trong bản đồ (không rơi im lặng)", () => {
  const that = docConvState(GOC).khoaThat;
  const khongCoDich = that.filter((k) => !(k in BAN_DO_CONV_STATE));
  const khaiThua = Object.keys(BAN_DO_CONV_STATE).filter(
    (k) => !that.includes(k),
  );
  assert.deepEqual(
    { khongCoDich, khaiThua },
    { khongCoDich: [], khaiThua: [] },
  );
});

test("D2 · tập page_id: pages.json ↔ bảng page, diff HAI CHIỀU = rỗng", async () => {
  const nguon = new Set(docPages(GOC).map((p) => p.pageId));
  const r = await sb.pool.query("SELECT page_id FROM page");
  const dich = new Set(r.rows.map((x) => x.page_id));
  assert.deepEqual(
    {
      thieuODich: [...nguon].filter((x) => !dich.has(x)),
      thuaODich: [...dich].filter((x) => !nguon.has(x)),
    },
    { thieuODich: [], thuaODich: [] },
  );
  assert.equal(dich.size, nguon.size);
});

test("D3 · CÔNG TẮC AI: diff hai chiều, chiều thiếu ĐÚNG BẰNG danh sách page lạc", async () => {
  const bat = new Set(docAiEnabled(GOC));
  const r = await sb.pool.query("SELECT page_id FROM page WHERE bot_ai_bat");
  const trongDb = new Set(r.rows.map((x) => x.page_id));
  // (i) DB không được tự bật thêm page nào ngoài danh sách.
  assert.deepEqual(
    [...trongDb].filter((x) => !bat.has(x)),
    [],
  );
  // (ii) chiều còn lại chỉ được phép là page LẠC (không có dòng trong bảng `page`).
  const trongSoCai = new Set(docPages(GOC).map((p) => p.pageId));
  const thieu = [...bat].filter((x) => !trongDb.has(x));
  assert.deepEqual(
    thieu,
    thieu.filter((x) => !trongSoCai.has(x)),
    "có page NẰM trong pages.json mà không bật được → công tắc mất câm",
  );
  assert.equal(trongDb.size + thieu.length, bat.size);
});

test("D4 · hội thoại: số khoá hợp khuôn ↔ count(hoi_thoai), khoá lạ được liệt kê", async () => {
  const { hoiThoai, khoaLa } = docConvState(GOC);
  const r = await sb.pool.query("SELECT count(*)::int c FROM hoi_thoai");
  assert.equal(r.rows[0].c, hoiThoai.length);
  const raw = JSON.parse(fs.readFileSync(duongDan(GOC).convState, "utf8"));
  assert.equal(hoiThoai.length + khoaLa.length, Object.keys(raw).length);
});

test("D5 · PHÉP QUY ĐỔI kịch bản: (bản script-versions + bản kb riêng) − bản của page lạc", async () => {
  const { ban, soTepLichSu, soMucKb, kbRieng, kbKhongCfg } = docKichBan(GOC);
  // VẾ NGUỒN đo LẠI ĐỘC LẬP, không lấy từ chính hàm đang bị đo.
  const d = duongDan(GOC);
  const tep = fs.readdirSync(d.scriptVersions).filter((f) => f.endsWith(".json"));
  const soBanTrongTep = tep.reduce(
    (n, f) => n + JSON.parse(fs.readFileSync(`${d.scriptVersions}/${f}`, "utf8")).versions.length,
    0,
  );
  const soMucKbThat = Object.keys(
    JSON.parse(fs.readFileSync(d.kbOverrides, "utf8")),
  ).length;
  assert.equal(soTepLichSu, tep.length);
  assert.equal(soMucKb, soMucKbThat);
  assert.equal(ban.length, soBanTrongTep + kbRieng.length,
    "tổng bản = bản trong script-versions + mục kb chưa có tệp lịch sử");

  const lac = new Set(pageLac(GOC).map((p2) => p2.pageId));
  const cuaPageLac = ban.filter((b) => lac.has(b.pageId));
  const r = await sb.pool.query("SELECT count(*)::int c FROM kich_ban");
  assert.equal(r.rows[0].c, ban.length - cuaPageLac.length,
    "count(kich_ban) = tổng bản − bản của page lạc (page lạc không có dòng `page` để trỏ về)");

  // Mục kb chỉ có sản phẩm (không kịch bản) KHÔNG đẻ dòng kich_ban nào.
  for (const pid of kbKhongCfg) {
    const q = await sb.pool.query(
      `SELECT count(*)::int c FROM kich_ban k JOIN page p ON p.id = k.page_id WHERE p.page_id = $1`,
      [pid],
    );
    assert.equal(q.rows[0].c, 0);
  }
});

test("D6 · IDEMPOTENT: lượt hai không đổi một con số nào", async () => {
  const dem = async () => {
    const r = await sb.pool.query(`SELECT
      (SELECT count(*) FROM page)::int page,
      (SELECT count(*) FROM page WHERE bot_ai_bat)::int bat,
      (SELECT count(*) FROM hoi_thoai)::int hoi_thoai,
      (SELECT count(*) FROM kich_ban)::int kich_ban,
      (SELECT count(*) FROM team)::int team`);
    return r.rows[0];
  };
  const truoc = await dem();
  await chay(sb.pool, GOC);
  assert.deepEqual(await dem(), truoc);
});

test("D7 · page LẠC được liệt kê đủ, kèm nguồn nhắc tới nó", async () => {
  const lac = pageLac(GOC);
  const trongSoCai = new Set(docPages(GOC).map((p) => p.pageId));
  for (const p of lac) {
    assert.ok(!trongSoCai.has(p.pageId));
    assert.ok(p.nguon.length > 0, `${p.pageId} không khai được nguồn`);
    const r = await sb.pool.query(
      "SELECT count(*)::int c FROM page WHERE page_id=$1",
      [p.pageId],
    );
    assert.equal(r.rows[0].c, 0, "page lạc KHÔNG được lẻn vào bảng page");
  }
  assert.ok(
    lac.some((p) => p.nguon.includes("ai-enabled.json")),
    "ít nhất một page lạc phải là page ĐANG BẬT AI — đúng cái mìn im của N1",
  );
});

test("D8 · CHỈ ĐỌC: kích thước + mtime của mọi tệp nguồn không đổi sau di trú", () => {
  assert.deepEqual(vanTayNguon(), dauTep);
});

test("D9 · llmTurns là MẢNG MỐC: luot_llm = độ dài, mốc giữ nguyên (không phải epoch)", async () => {
  const raw = JSON.parse(fs.readFileSync(duongDan(GOC).convState, "utf8"));
  const mau = Object.entries(raw)
    .filter(
      ([k, v]) =>
        /^\d+_\d+$/.test(k) && Array.isArray(v.llmTurns) && v.llmTurns.length,
    )
    .slice(0, 5);
  assert.ok(
    mau.length,
    "không có hội thoại nào có llmTurns — ca này mất nghĩa, kiểm lại nguồn",
  );
  for (const [khoa, v] of mau) {
    const [pageId, psid] = khoa.split("_");
    const r = await sb.pool.query(
      `SELECT h.luot_llm, h.moc_luot_llm FROM hoi_thoai h JOIN page p ON p.id = h.page_id
       WHERE p.page_id = $1 AND h.psid = $2`,
      [pageId, psid],
    );
    if (!r.rowCount) continue; // page lạc — đã có ca riêng
    assert.equal(r.rows[0].luot_llm, v.llmTurns.length);
    assert.ok(
      r.rows[0].luot_llm < 1e6,
      "luot_llm đang mang một mốc epoch, không phải số đếm",
    );
    assert.deepEqual(r.rows[0].moc_luot_llm, v.llmTurns);
  }
});

test("D10 · kịch bản giữ CẢ HAI bản: bản-cho-người 6 trường + bản-cho-máy", async () => {
  const r = await sb.pool.query(
    `SELECT noi_dung_nguoi, noi_dung_may FROM kich_ban
     WHERE trang_thai='LIVE' AND noi_dung_may <> '' LIMIT 3`,
  );
  assert.ok(r.rowCount > 0);
  for (const row of r.rows) {
    assert.deepEqual(Object.keys(row.noi_dung_nguoi).sort(), [
      "fastLaneHowto",
      "fastLanePrice",
      "fastLaneShip",
      "greeting",
      "salesPrompt",
      "tone",
    ]);
    assert.ok(/Giọng điệu|Câu chào|Cách bán/.test(row.noi_dung_may));
    // Bản cho máy KHÔNG mang câu mẫu Fast Lane (chúng bắn thẳng cho khách, không vào prompt).
    if (row.noi_dung_nguoi.fastLanePrice) {
      assert.ok(!row.noi_dung_may.includes(row.noi_dung_nguoi.fastLanePrice));
    }
  }
});

test("D11 · toàn bộ dữ liệu di trú nằm ở team KỸ THUẬT chua-phan (chờ H7), 0 dòng team nghiệp vụ", async () => {
  const r = await sb.pool.query(
    `SELECT t.slug, count(*)::int c FROM page p JOIN team t ON t.id = p.team_id GROUP BY 1`,
  );
  assert.deepEqual(
    r.rows.map((x) => x.slug),
    ["chua-phan"],
  );
  assert.equal(r.rows[0].c, kq1.dich.page);
});

// ══════════════════════════════════════════════════════════════════════════════════
// PHIEU-B-Y4 — di trú thôi ghi đè cột NGƯỜI đặt.
//
// Câu cũ `marketer = EXCLUDED.marketer` KHÔNG phải đồng bộ: `pages.json` có 0 marketer,
// nên mỗi lượt `npm run di-tru` là một lệnh `SET marketer = ''` cho mọi page. Màn
// «Page & Bot» vừa mở đúng chức năng gán marketer cho 514 page — lượt di trú kế tiếp xoá
// sạch, không báo một dòng nào, và không có bản quay lui.
// ══════════════════════════════════════════════════════════════════════════════════

const mocPage = async () =>
  (await sb.pool.query("SELECT page_id FROM page ORDER BY id LIMIT 1")).rows[0].page_id;

test("Y4-1 · marketer NGƯỜI đặt SỐNG SÓT qua một lượt di trú", async () => {
  const pid = await mocPage();
  await sb.pool.query("UPDATE page SET marketer = $1 WHERE page_id = $2", [
    "chi-lan-y4",
    pid,
  ]);
  await napPage(sb.pool, GOC); // chạy lại đúng bước đã xoá trắng ở bản cũ
  const r = await sb.pool.query("SELECT marketer FROM page WHERE page_id = $1", [pid]);
  console.log(`   [Y4-1] sau di trú: marketer="${r.rows[0].marketer}"`);
  assert.equal(r.rows[0].marketer, "chi-lan-y4");
});

test("Y4-2 · page CHƯA ai gán thì VẪN nhận marketer từ nguồn (không khoá cứng)", async () => {
  // ⚠️ Nhánh này KHÔNG chạm được bằng dữ liệu thật: `pages.json` của repo có 0 marketer
  // (đo 25/08). Nên dựng một GỐC tạm mang đúng một page có marketer, và khai rõ ở đây là
  // ca này chạy trên HẠT GIỐNG, không phải trên nguồn thật.
  const pid = await mocPage();
  await sb.pool.query("UPDATE page SET marketer = '' WHERE page_id = $1", [pid]);

  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "y4-"));
  try {
    fs.writeFileSync(
      path.join(tam, "pages.json"),
      JSON.stringify({ [pid]: { name: "Hạt giống Y4", marketer: "anh-tuan-y4" } }),
    );
    await napPage(sb.pool, tam);
    const r = await sb.pool.query("SELECT marketer, ten FROM page WHERE page_id = $1", [pid]);
    console.log(`   [Y4-2] từ hạt giống: marketer="${r.rows[0].marketer}"`);
    assert.equal(r.rows[0].marketer, "anh-tuan-y4");

    // …và ngay sau đó, nguồn RỖNG cũng không xoá được giá trị vừa nhận.
    fs.writeFileSync(
      path.join(tam, "pages.json"),
      JSON.stringify({ [pid]: { name: "Hạt giống Y4", marketer: "" } }),
    );
    await napPage(sb.pool, tam);
    const r2 = await sb.pool.query("SELECT marketer FROM page WHERE page_id = $1", [pid]);
    assert.equal(r2.rows[0].marketer, "anh-tuan-y4");
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }
});

test("Y4-3 · marketer rỗng + nguồn rỗng → vẫn rỗng, không nổ", async () => {
  const pid = await mocPage();
  await sb.pool.query("UPDATE page SET marketer = '' WHERE page_id = $1", [pid]);
  await napPage(sb.pool, GOC);
  const r = await sb.pool.query("SELECT marketer FROM page WHERE page_id = $1", [pid]);
  assert.equal(r.rows[0].marketer, "");
});

test("Y4-4 · cột MÁY đặt VẪN được ghi đè — vá này không được làm cứng cả bảng", async () => {
  const pid = await mocPage();
  const truoc = (
    await sb.pool.query("SELECT ten FROM page WHERE page_id = $1", [pid])
  ).rows[0].ten;
  await sb.pool.query("UPDATE page SET ten = 'TÊN BỊ SỬA TAY' WHERE page_id = $1", [pid]);
  await napPage(sb.pool, GOC);
  const sau = (await sb.pool.query("SELECT ten FROM page WHERE page_id = $1", [pid]))
    .rows[0].ten;
  console.log(`   [Y4-4] ten: sửa tay → "${sau}" (nguồn: "${truoc}")`);
  assert.equal(sau, truoc, "cột do MÁY đặt phải quay về giá trị nguồn");
});

test("Y4-5 · marketer là cột NGƯỜI đặt DUY NHẤT trong câu ghi đè (đọc file thật)", async () => {
  // Đối chiếu bằng chính văn bản SQL, không gõ lại theo trí nhớ. Ai thêm một cột NGƯỜI
  // đặt vào câu đó sau này thì ca này phải đỏ — đó là cả lý do nó tồn tại.
  const src = fs.readFileSync(`${GOC}/db/di-tru/nap.js`, "utf8");
  const khoi = src.match(/ON CONFLICT \(page_id\) DO UPDATE SET([\s\S]*?)`,/);
  assert.ok(khoi, "không tìm thấy câu ON CONFLICT của napPage");
  const ghiDe = [...khoi[1].matchAll(/(\w+)\s*=\s*EXCLUDED\./g)].map((m) => m[1]);
  console.log(`   [Y4-5] cột bị ghi đè thẳng: ${ghiDe.join(", ")}`);
  const NGUOI_DAT = ["marketer", "trong_diem", "botcake_tat", "bot_ai_bat"];
  const lot = ghiDe.filter((c) => NGUOI_DAT.includes(c));
  assert.deepEqual(lot, [], `cột NGƯỜI đặt lọt vào câu ghi đè: ${lot.join(", ")}`);
  // …và `marketer` vẫn phải CÓ MẶT trong câu, ở dạng CASE — bỏ hẳn nó đi thì page mới
  // không bao giờ nhận được marketer từ nguồn.
  assert.match(khoi[1], /marketer\s*=\s*CASE/);
});

// ══ B-Y9 · NỐI HỘI THOẠI VỀ HỒ SƠ KHÁCH ═══════════════════════════════════════════
// Cột `hoi_thoai.khach_id` có trong lược đồ từ 013 mà chưa lần nào được ghi (0/28.953 đo
// 28/08): hàm nối đã có (A7-2), chỗ thiếu là một đường CHẠY nó. Ba ca dưới khoá đúng ba
// điều phiếu B-Y9 đòi: có nối, đếm được phần KHÔNG nối, và không nối bừa.

test("D-Y9a · bộ di trú CÓ chạy bước nối, và trả thống kê đủ để trả lời «vì sao chưa nối»", async () => {
  const nk = kq1.noiHoSoKhach;
  assert.ok(nk, "di trú phải chạy bước nối hồ sơ khách");
  if (nk.chuaCoCot) {
    // Sandbox áp trọn 13 bản nên nhánh này KHÔNG được xảy ra ở đây — nếu xảy ra thì
    // migration 013 đã biến mất khỏi cây.
    assert.fail(`sandbox thiếu cột: ${nk.thieu?.join(", ")}`);
  }
  for (const k of ["xet", "noiMoi", "noiVaoCoSan", "thieuNuoc", "sdtKhongDocDuoc", "conChuaNoi"]) {
    assert.equal(typeof nk[k], "number", `thiếu số đếm \`${k}\` — «chưa nối» phải đếm được`);
  }
  assert.ok(Array.isArray(nk.pageThieuShop));
});

test("D-Y9b · KHÔNG nối bừa: mọi `hoi_thoai.khach_id` trỏ tới khách CÓ THẬT, CÙNG team", async () => {
  const r = await sb.pool.query(
    `SELECT count(*)::int c
       FROM hoi_thoai h
       LEFT JOIN khach k ON k.id = h.khach_id AND k.team_id = h.team_id
      WHERE h.khach_id IS NOT NULL AND k.id IS NULL`,
  );
  assert.equal(r.rows[0].c, 0, "nối sai còn tệ hơn không nối — phiếu B-Y9 ⑤");
});

test("D-Y9c · chạy LẠI không đẻ thêm hội thoại nối trùng (idempotent)", async () => {
  const dem = async () => (await sb.pool.query(
    "SELECT count(khach_id)::int c FROM hoi_thoai",
  )).rows[0].c;
  const truoc = await dem();
  await chay(sb.pool, GOC);
  assert.equal(await dem(), truoc, "lượt hai phải giữ nguyên — khoá (team, nước, sđt) khớp lại dòng cũ");
});
