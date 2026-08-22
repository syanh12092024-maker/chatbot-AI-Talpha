// L2-M1 · HÀNG ĐỢI TIN — migration 003, xếp tin lũy đẳng, HAI KHOÁ của worker
// (khoá dòng `FOR UPDATE SKIP LOCKED` + khoá HỘI THOẠI `pg_try_advisory_xact_lock`),
// và van NGUỒN fail-closed (`PANCAKE_READONLY` / `V3_NAP_DEV`).
//
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l2m1hd`), tự dựng tự dọn — KHÔNG đụng
// `aicloser_v3` dev đang giữ 18.790 hội thoại thật (luật 11 sổ điều hành).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { dungSandbox } from "../db/sandbox.js";
import { len, xuong, daAp } from "../db/migrate.js";
import {
  xepTin,
  moPhienRut,
  demTheoTrangThai,
  docTinTheoId,
  TRANG_THAI,
} from "../src/queue/kho.js";
import { napTuPoll, nguonDangMo, gomCumTinKhach } from "../src/queue/nap.js";

process.env.V3_KHOA_MA_HOA =
  process.env.V3_KHOA_MA_HOA || crypto.randomBytes(32).toString("hex");

let sb;
let teamId, pageRowId;
const PAGE = "900000000000001";

// Đặt/khôi phục biến môi trường TRONG harness — bộ ca KHÔNG thừa hưởng `.env` để quyết
// định kết quả (phiếu ③: "env test trong harness").
async function voiEnv(vars, fn) {
  const truoc = {};
  for (const k of Object.keys(vars)) truoc[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(truoc)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

before(async () => {
  sb = await dungSandbox("l2m1hd");
  const t = await sb.pool.query(
    "SELECT id FROM team WHERE slug = 'tieu-alpha'",
  );
  teamId = t.rows[0].id;
  const p = await sb.pool.query(
    `INSERT INTO page (team_id, page_id, ten) VALUES ($1, $2, 'Page ca L2-M1') RETURNING id`,
    [teamId, PAGE],
  );
  pageRowId = p.rows[0].id;
});

after(async () => {
  if (sb) await sb.don();
});

const tinMau = (o = {}) => ({
  teamId,
  pageId: PAGE,
  psid: "psid-A",
  convId: "conv-A",
  custId: "cust-A",
  msgId: "m-1",
  noiDung: "hello",
  ...o,
});

// ── S1 · MIGRATION 003: lên 2 lượt lũy đẳng, và down→up trên CSDL ĐÃ CÓ DỮ LIỆU ─────
test("S1 · 003 áp 2 lượt không đổi gì; down→up chạy được trên CSDL đã có dữ liệu", async () => {
  const lan2 = await len(sb.pool, { im: true });
  assert.deepEqual(lan2, [], "lượt `up` thứ hai phải áp 0 bản");

  // Gieo dữ liệu THẬT trước khi diễn tập down (án lệ: "diễn tập down phải chạy trên DB
  // đã seed, không phải DB vừa up xong").
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,'psid-giu','GREET','AI') ON CONFLICT DO NOTHING`,
    [teamId, pageRowId],
  );
  await xepTin(sb.pool, tinMau({ msgId: "m-truoc-down" }));

  // ⚠️ KHÔNG neo "003 là bản mới nhất": cây này có phiên song song (phiếu L3-M1 đang
  // thêm `004_trang_thai_don` cùng lúc — án lệ #24/#25). Gỡ LÙI cho tới khi 003 rời
  // bảng `_migrations`, rồi áp lại hết. Neo con số là cách chắc chắn làm bộ ca này đỏ
  // vào đúng ngày người khác thêm một bản migration.
  const daGo = [];
  for (let i = 0; i < 20; i++) {
    const go = await xuong(sb.pool, { im: true });
    if (!go.length) break;
    daGo.push(...go);
    if (go.includes("003_tin_cho_xu_ly")) break;
  }
  assert.ok(
    daGo.includes("003_tin_cho_xu_ly"),
    `phải gỡ được 003 (đã gỡ: ${daGo.join(", ") || "(không có)"})`,
  );
  const con = await sb.pool.query(
    "SELECT to_regclass('public.tin_cho_xu_ly') AS t, to_regclass('public.hoi_thoai') AS h",
  );
  assert.equal(con.rows[0].t, null, "003 down phải xoá tin_cho_xu_ly");
  assert.notEqual(con.rows[0].h, null, "003 down KHÔNG được đụng bảng của 001");

  await len(sb.pool, { im: true });
  const ap = await daAp(sb.pool);
  assert.ok(ap.includes("003_tin_cho_xu_ly"));
  const sau = await demTheoTrangThai(sb.pool);
  assert.deepEqual(
    sau,
    {},
    "bảng dựng lại phải rỗng (down = mất tin, đã khai ở .down.sql)",
  );
});

// ── S2 · XẾP TIN LŨY ĐẲNG ──────────────────────────────────────────────────────────
test("S2 · bơm CÙNG một tin 2 lần → đúng 1 dòng (UNIQUE page+conv+msg)", async () => {
  const a = await xepTin(sb.pool, tinMau({ msgId: "m-dup" }));
  const b = await xepTin(
    sb.pool,
    tinMau({ msgId: "m-dup", noiDung: "hello lần 2" }),
  );
  assert.equal(a.them, true);
  assert.equal(b.them, false, "lượt 2 phải bị UNIQUE chặn, không ném lỗi");
  const r = await sb.pool.query(
    "SELECT count(*)::int n, min(noi_dung) noi_dung FROM tin_cho_xu_ly WHERE msg_id='m-dup'",
  );
  assert.equal(r.rows[0].n, 1);
  assert.equal(
    r.rows[0].noi_dung,
    "hello",
    "DO NOTHING — nội dung lượt đầu được giữ",
  );
});

test("S2b · cùng msg_id nhưng KHÁC hội thoại thì vẫn là hai tin", async () => {
  await xepTin(sb.pool, tinMau({ convId: "conv-X", msgId: "m-chung" }));
  await xepTin(sb.pool, tinMau({ convId: "conv-Y", msgId: "m-chung" }));
  const r = await sb.pool.query(
    "SELECT count(*)::int n FROM tin_cho_xu_ly WHERE msg_id='m-chung'",
  );
  assert.equal(r.rows[0].n, 2);
});

// ── S3 · KHOÁ HỘI THOẠI (N2) — phép KHẲNG ĐỊNH, không phải phép "chạy không lỗi" ────
test("S3 · 2 tin CÙNG conv: worker B rút được 0 dòng khi A đang giữ; A nhả thì B rút được 1", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  await xepTin(sb.pool, tinMau({ convId: "conv-KHOA", msgId: "k1" }));
  await xepTin(sb.pool, tinMau({ convId: "conv-KHOA", msgId: "k2" }));

  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  assert.ok(A, "A phải rút được tin đầu");
  assert.equal(A.tin.msg_id, "k1");
  assert.equal(A.tin.trang_thai, "dang_xu");
  assert.equal(A.tin.so_lan_thu, 1, "rút được = so_lan_thu +1");

  // B quét trong lúc A còn giữ advisory lock của conv-KHOA.
  const B = await moPhienRut(sb.pool, { khoaWorker: "B" });
  assert.equal(B, null, "B phải rút được 0 dòng — tin thứ hai CÙNG hội thoại");

  // Tin thứ hai vẫn nguyên trạng 'cho' (không bị B chạm vào rồi trả lại).
  const conCho = await sb.pool.query(
    "SELECT trang_thai, so_lan_thu FROM tin_cho_xu_ly WHERE msg_id='k2'",
  );
  assert.equal(conCho.rows[0].trang_thai, "cho");
  assert.equal(conCho.rows[0].so_lan_thu, 0);

  await A.ketThuc(TRANG_THAI.XONG, "ca S3");

  const B2 = await moPhienRut(sb.pool, { khoaWorker: "B" });
  assert.ok(B2, "A nhả khoá rồi thì B phải rút được");
  assert.equal(B2.tin.msg_id, "k2");
  await B2.ketThuc(TRANG_THAI.XONG, "ca S3");
});

test("S3b · 2 tin KHÁC conv: hai worker rút SONG SONG, cả hai đều được", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  await xepTin(sb.pool, tinMau({ convId: "conv-P", msgId: "p1" }));
  await xepTin(sb.pool, tinMau({ convId: "conv-Q", msgId: "q1" }));

  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  const B = await moPhienRut(sb.pool, { khoaWorker: "B" });
  assert.ok(A && B, "hai hội thoại khác nhau phải chạy song song được");
  assert.notEqual(A.tin.conv_id, B.tin.conv_id);
  await A.ketThuc(TRANG_THAI.XONG, "");
  await B.ketThuc(TRANG_THAI.XONG, "");
});

test("S3c · huỷ phiên (ROLLBACK) trả tin về 'cho' NGUYÊN TRẠNG, kể cả so_lan_thu", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  const t = await xepTin(sb.pool, tinMau({ convId: "conv-R", msgId: "r1" }));
  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  assert.equal(A.tin.so_lan_thu, 1);
  await A.huy();
  const sau = await docTinTheoId(sb.pool, t.id, teamId);
  assert.equal(sau.trang_thai, "cho");
  assert.equal(sau.so_lan_thu, 0, "ROLLBACK gỡ cả +1 của câu rút");
});

// ── S4 · VAN NGUỒN FAIL-CLOSED (N1a) ───────────────────────────────────────────────
test("S4 · PANCAKE_READONLY=1 + vắng V3_NAP_DEV → nạp 0 dòng, in lý do", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: undefined }, async () => {
    assert.equal(nguonDangMo(), false);
    const r = await napTuPoll(
      sb.pool,
      { pageId: PAGE },
      {
        docHoiThoai: async () => {
          throw new Error("KHÔNG ĐƯỢC gọi cửa khi van nguồn ĐÓNG");
        },
      },
    );
    assert.equal(r.mo, false);
    assert.equal(r.them, 0);
    assert.match(r.lyDo, /PANCAKE_READONLY/);
    assert.match(r.lyDo, /V3_NAP_DEV/);
  });
  assert.deepEqual(await demTheoTrangThai(sb.pool), {});
});

test("S4b · ĐỐI CHỨNG DƯƠNG — V3_NAP_DEV=1 thì nạp được (van mở đúng chiều)", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  const convs = [
    { id: "conv-nap", from_psid: "psid-nap", customers: [{ id: "cust-nap" }] },
  ];
  const msgs = [
    { id: "mm1", from: { id: PAGE }, message: "chào bạn" },
    { id: "mm2", from: { id: "psid-nap" }, message: "giá bao nhiêu" },
    {
      id: "mm3",
      from: { id: "psid-nap" },
      message: "ship về Dubai được không",
    },
  ];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
    assert.equal(nguonDangMo(), true);
    const r = await napTuPoll(
      sb.pool,
      { pageId: PAGE },
      { docHoiThoai: async () => convs, docTin: async () => msgs },
    );
    assert.equal(r.mo, true);
    assert.equal(r.them, 1, "một hội thoại có tin mới → đúng một dòng");
    // Lượt NẠP THỨ HAI trên cùng dữ liệu — vòng poll thật chạy 6 giây một lần.
    const r2 = await napTuPoll(
      sb.pool,
      { pageId: PAGE },
      { docHoiThoai: async () => convs, docTin: async () => msgs },
    );
    assert.equal(r2.them, 0, "lượt poll thứ hai KHÔNG được đẻ thêm dòng");
    assert.equal(r2.trung, 1);
  });
  const r = await sb.pool.query(
    "SELECT noi_dung, msg_id, psid, conv_id, cust_id, team_id FROM tin_cho_xu_ly",
  );
  assert.equal(r.rowCount, 1);
  assert.equal(
    r.rows[0].noi_dung,
    "giá bao nhiêu\nship về Dubai được không",
    "cụm tin liên tiếp của khách gộp thành MỘT lượt (giống pancake-poll.js:400)",
  );
  assert.equal(r.rows[0].msg_id, "mm3", "neo là tin MỚI NHẤT của cụm");
  assert.equal(r.rows[0].psid, "psid-nap");
  assert.equal(r.rows[0].conv_id, "conv-nap", "conv_id ≠ psid, giữ CẢ HAI");
  assert.equal(
    String(r.rows[0].team_id),
    String(teamId),
    "team lấy từ page.team_id",
  );

  // Bộ nạp phải tạo dòng `hoi_thoai` TRƯỚC (cua-messenger §2 — cửa không tạo hộ).
  const ht = await sb.pool.query(
    "SELECT count(*)::int n FROM hoi_thoai WHERE page_id=$1 AND psid='psid-nap'",
    [pageRowId],
  );
  assert.equal(ht.rows[0].n, 1);
});

test("S4c · tin cuối là của PAGE → không có việc gì để xếp", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
    const r = await napTuPoll(
      sb.pool,
      { pageId: PAGE },
      {
        docHoiThoai: async () => [
          { id: "c-im", from_psid: "psid-im", customers: [{ id: "k" }] },
        ],
        docTin: async () => [
          { id: "x1", from: { id: "psid-im" }, message: "hỏi" },
          { id: "x2", from: { id: PAGE }, message: "đã trả lời rồi" },
        ],
      },
    );
    assert.equal(r.them, 0);
    assert.equal(r.boQua, 1);
  });
});

test("S4d · gomCumTinKhach — biên: mảng rỗng, chỉ tin page, tin không có id", () => {
  assert.equal(gomCumTinKhach([], PAGE), null);
  assert.equal(
    gomCumTinKhach([{ id: "a", from: { id: PAGE }, message: "hi" }], PAGE),
    null,
  );
  assert.equal(
    gomCumTinKhach([{ from: { id: "u" }, message: "hi" }], PAGE),
    null,
  );
  assert.deepEqual(
    gomCumTinKhach([{ id: "z", from: { id: "u" }, message: "hi" }], PAGE),
    {
      text: "hi",
      msgId: "z",
    },
  );
});

// ── S5 · TRẦN so_lan_thu + `chan_guard` KHÔNG retry ────────────────────────────────
test("S5 · so_lan_thu tăng đúng 1 mỗi lượt RÚT, và trạng thái chan_guard đứng yên", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  const t = await xepTin(sb.pool, tinMau({ convId: "conv-G", msgId: "g1" }));

  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  assert.equal(A.tin.so_lan_thu, 1);
  await A.ketThuc(TRANG_THAI.CHAN_GUARD, "cửa đóng");

  const sau = await docTinTheoId(sb.pool, t.id, teamId);
  assert.equal(sau.trang_thai, "chan_guard");
  assert.equal(
    sau.so_lan_thu,
    1,
    "chan_guard KHÔNG retry ⇒ số lần thử đứng yên",
  );
  assert.equal(sau.khoa_worker, null);
  assert.match(sau.ly_do, /cửa đóng/);

  // Worker vòng sau KHÔNG được nhặt lại tin `chan_guard`.
  const B = await moPhienRut(sb.pool, { khoaWorker: "B" });
  assert.equal(B, null, "tin chan_guard phải nằm ngoài tầm quét của worker");
});

test("S5b · rào cột: cố ghi trạng thái lạ vào tin_cho_xu_ly thì CSDL chặn", async () => {
  await assert.rejects(
    () =>
      sb.pool.query(
        `INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai)
         VALUES ($1,$2,'p','c','m','x','dang_treo')`,
        [teamId, PAGE],
      ),
    /tin_cho_xu_ly_trang_thai_check|violates check constraint/,
  );
});
