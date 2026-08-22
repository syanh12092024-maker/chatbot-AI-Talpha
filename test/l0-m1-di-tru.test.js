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
