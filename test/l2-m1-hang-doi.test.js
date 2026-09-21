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
import { napTuPoll, nguonDangMo, gomCumTinKhach, quenMoc, quenChoGo, pageNoiCuoi } from "../src/queue/nap.js";

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
  // Trần vòng lặp lấy từ SỐ BẢN ĐÃ ÁP, không gõ tay. Neo số 20 làm ca này đỏ đúng vào
  // ngày bản migration thứ 21 ra đời — mà nó đỏ vì cái THƯỚC ngắn, không phải vì mã sai.
  const tongBan = Number((await sb.pool.query("SELECT count(*)::int n FROM _migrations")).rows[0].n);
  const daGo = [];
  for (let i = 0; i < tongBan + 2; i++) {
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
  await xepTin(sb.pool, tinMau({ psid: "psid-P", convId: "conv-P", msgId: "p1" }));
  await xepTin(sb.pool, tinMau({ psid: "psid-Q", convId: "conv-Q", msgId: "q1" }));

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

// ── S4c · LỌC THEO MỐC — điều kiện của lời hứa «trả lời trong 1-2 phút» ────────────
//
// Đo 17/09: `GET /messages` 166ms × 60 hội thoại = 10,2s cho MỘT page mỗi vòng, và
// `chay-worker.js` duyệt page tuần tự ⇒ từ page thứ 12 là chu kỳ vượt 2 phút. Cửa này
// là chỗ duy nhất cắt được con số đó, nên nó phải có ca canh.
test("S4h · hội thoại KHÔNG đổi mốc → KHÔNG gọi `GET /messages` ở vòng sau", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc();
  const convs = [{
    id: "conv-moc", from_psid: "psid-moc", customers: [{ id: "cust-moc" }],
    last_customer_interactive_at: "2026-09-17T10:00:00",
  }];
  const msgs = [
    { id: "mk1", from: { id: PAGE }, message: "chào bạn" },
    { id: "mk2", from: { id: "psid-moc" }, message: "magkano po" },
  ];
  let goiDocTin = 0;
  const deps = () => ({
    doiGoXong: () => ({ ms: 0 }),
    docHoiThoai: async () => convs,
    docTin: async () => { goiDocTin += 1; return msgs; },
  });

  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
    const r1 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(r1.them, 1);
    assert.equal(goiDocTin, 1, "vòng đầu PHẢI lấy tin");

    const r2 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(goiDocTin, 1, "mốc không đổi ⇒ KHÔNG được gọi `GET /messages` lần nữa");
    assert.equal(r2.boQuaMoc, 1, "phải ĐẾM lượt bỏ qua, không nuốt im");
    assert.equal(r2.them, 0);

    // Khách nhắn tiếp → mốc đổi → phải lấy tin lại và xếp dòng mới.
    convs[0].last_customer_interactive_at = "2026-09-17T10:00:30";
    msgs.push({ id: "mk3", from: { id: "psid-moc" }, message: "ilan po" });
    const r3 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(goiDocTin, 2, "mốc ĐỔI ⇒ phải lấy tin");
    assert.equal(r3.them, 1, "cụm mới có msg_id mới ⇒ một dòng nữa");
    assert.equal(r3.boQuaMoc, 0);
  });
});

test("S4i · mốc RỖNG thì KHÔNG ghi nhớ — không bỏ sót hội thoại thiếu dấu thời gian", async () => {
  // v1 (`pancake-poll.js`) ghi mốc '' rồi lần sau `'' === ''` là bỏ qua VĨNH VIỄN. Ở đây
  // mốc rỗng phải rơi xuống đường quét bình thường, thà tốn lời gọi còn hơn câm với khách.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc();
  const convs = [{ id: "conv-rong", from_psid: "psid-rong", customers: [{ id: "c-rong" }] }];
  const msgs = [{ id: "mr1", from: { id: "psid-rong" }, message: "how much" }];
  let goiDocTin = 0;
  const deps = () => ({
    doiGoXong: () => ({ ms: 0 }),
    docHoiThoai: async () => convs,
    docTin: async () => { goiDocTin += 1; return msgs; },
  });
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
    await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    const r2 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(goiDocTin, 2, "mốc rỗng ⇒ vẫn quét, không được nhớ");
    assert.equal(r2.boQuaMoc, 0);
    assert.equal(r2.trung, 1, "và `xepTin` vẫn chặn dòng trùng — không ai nhận hai câu trả lời");
  });
});

// ── S4e · LỌC TỪ DANH SÁCH: page nói cuối thì không có việc ────────────────────────
test("S4e · `last_sent_by` là page → KHÔNG gọi `GET /messages`", async () => {
  // Đo 17/60 hội thoại thật: 52/60 hội thoại có page nói cuối. Nhận ra từ danh sách là
  // cắt 52 lời gọi API mỗi vòng — cửa giữ chu kỳ poll dưới hai phút khi số page tăng.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc();
  const convs = [
    { id: "c-page", from_psid: "p-1", customers: [{ id: "k1" }],
      last_customer_interactive_at: "2026-09-17T10:00:00",
      last_sent_by: { admin_id: PAGE, admin_name: "Botcake", id: PAGE, name: "Trang" } },
    { id: "c-khach", from_psid: "p-2", customers: [{ id: "k2" }],
      last_customer_interactive_at: "2026-09-17T10:00:00",
      last_sent_by: { id: "p-2", name: "Khách" } },
  ];
  const daLay = [];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_CHI_CHUA_DOC: undefined }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }),
      docHoiThoai: async () => convs,
      docTin: async (_p, _c, { convId }) => {
        daLay.push(convId);
        return [{ id: "x1", from: { id: "p-2" }, message: "magkano" }];
      },
    });
    assert.deepEqual(daLay, ["c-khach"], "chỉ hội thoại KHÁCH nói cuối mới được lấy tin");
    assert.equal(r.boQuaPageNoiCuoi, 1);
    assert.equal(r.them, 1);
  });
});

test("S4f · `last_sent_by` thiếu/hỏng → VẪN quét (fail-open, không câm với người thật)", () => {
  assert.equal(pageNoiCuoi({}, PAGE), false, "thiếu trường thì phải quét");
  assert.equal(pageNoiCuoi({ last_sent_by: null }, PAGE), false);
  assert.equal(pageNoiCuoi({ last_sent_by: "rác" }, PAGE), false);
  assert.equal(pageNoiCuoi({ last_sent_by: { id: "999" } }, PAGE), false, "khách nói cuối");
  assert.equal(pageNoiCuoi({ last_sent_by: { id: PAGE } }, PAGE), true);
  assert.equal(pageNoiCuoi({ last_sent_by: { admin_id: PAGE, id: PAGE } }, PAGE), true);
});

test("S4g · V3_NAP_CHI_CHUA_DOC — TẮT mặc định; bật thì bỏ hội thoại đã có người MỞ", async () => {
  // Bảy trên tám hội thoại thật bị cửa này loại là khách đang hỏi mà CHƯA AI TRẢ LỜI
  // ("How much", "Send me WhatsApp"…) — `unread_count = 0` chỉ vì sale đã mở ra xem.
  // Ca này khoá hành vi đó lại để không ai bật nhầm mà tưởng vô hại.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  const convs = [{
    id: "c-daDoc", from_psid: "p-3", customers: [{ id: "k3" }],
    last_customer_interactive_at: "2026-09-17T11:00:00",
    last_sent_by: { id: "p-3", name: "Khách" },
    unread_count: 0, seen: true,
  }];
  const msgs = [{ id: "y1", from: { id: "p-3" }, message: "How much" }];

  quenMoc();
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_CHI_CHUA_DOC: undefined }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE },
      { doiGoXong: () => ({ ms: 0 }), docHoiThoai: async () => convs, docTin: async () => msgs });
    assert.equal(r.them, 1, "MẶC ĐỊNH: vẫn trả lời khách dù sale đã mở xem");
    assert.equal(r.boQuaDaDoc, 0);
  });

  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc();
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_CHI_CHUA_DOC: "1" }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }),
      doiGoXong: () => ({ ms: 0 }),
      docHoiThoai: async () => convs,
      docTin: async () => { throw new Error("KHÔNG được lấy tin khi đã bỏ qua"); },
    });
    assert.equal(r.them, 0);
    assert.equal(r.boQuaDaDoc, 1, "và phải ĐẾM ra, để nhìn log biết đang bỏ bao nhiêu");
  });
});

// ── S4j · CHỜ KHÁCH GÕ XONG — một cụm tin là MỘT lượt trả lời ─────────────────────
test("S4j · khách còn gõ → GIỮ LẠI; gõ xong → xếp ĐÚNG MỘT dòng cho cả cụm", async () => {
  // Không có cửa này: "Good morning" xếp msg_id=m1 (trả lời lần 1), 6s sau "how much"
  // xếp m2 (trả lời lần 2) — `UNIQUE` không cứu được vì đúng là hai tin khác nhau.
  // Đo thật page này: 30,2% cụm có ≥2 tin, p50 cách nhau 18 giây.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  let gio = 1_000_000;
  const convs = [{
    id: "c-go", from_psid: "p-go", customers: [{ id: "k-go" }],
    last_customer_interactive_at: "2026-09-17T12:00:00",
    last_sent_by: { id: "p-go", name: "Khách" },
    snippet: "Good morning",                  // chào suông ⇒ "còn dở" ⇒ chờ lâu
  }];
  const msgs = [{ id: "g1", from: { id: "p-go" }, message: "Good morning" }];
  const deps = () => ({
    dongHo: () => gio,
    docHoiThoai: async () => convs,
    docTin: async () => msgs,
  });

  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, async () => {
    const r1 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(r1.them, 0, "thấy lần đầu: GIỮ LẠI, chưa xếp");
    assert.equal(r1.dangChoGo, 1);

    gio += 6000;                                // 6s — chưa đủ 15s của "còn dở"
    const r2 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(r2.them, 0, "chưa tới hạn thì vẫn giữ");
    assert.equal(r2.dangChoGo, 1);

    // Khách gõ tiếp — cụm dài ra, mốc đổi.
    convs[0].last_customer_interactive_at = "2026-09-17T12:00:18";
    convs[0].snippet = "how much po sa 2 sets?";
    msgs.push({ id: "g2", from: { id: "p-go" }, message: "how much po sa 2 sets?" });

    gio += 1000;
    const r3 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(r3.them, 0, "mốc đổi ⇒ đồng hồ chờ chạy lại từ đầu");

    gio += 6000;                                // câu hỏi trọn ý ⇒ chỉ chờ 5s
    const r4 = await napTuPoll(sb.pool, { pageId: PAGE }, deps());
    assert.equal(r4.them, 1, "gõ xong ⇒ xếp");
  });

  const r = await sb.pool.query("SELECT noi_dung FROM tin_cho_xu_ly");
  assert.equal(r.rowCount, 1, "ĐÚNG MỘT dòng cho cả cụm — không phải hai lượt trả lời");
  assert.equal(r.rows[0].noi_dung, "Good morning\nhow much po sa 2 sets?");
});

test("S4k · mức chờ lấy từ `turn-complete.js`, không gõ tay lần thứ hai", async () => {
  // Án lệ ②: hai bản của một luật thì bản thứ hai là bản trôi. Ca này neo vào chính hàm
  // mà `pancake-poll.js` đang dùng — ai đổi ngưỡng ở đó thì cả hai đường cùng đổi.
  const { debounceFor } = await import("../src/turn-complete.js");
  assert.ok(debounceFor("Good morning").ms > debounceFor("how much po sa 2 sets?").ms,
    "chào suông phải chờ LÂU HƠN một câu hỏi trọn ý");
});

// ── S4m · ĐỂ BOTCAKE NÓI TRƯỚC — hoãn bằng `thu_lai_luc`, KHÔNG ngủ ───────────────
test("S4m · tin xếp vào hàng với `thu_lai_luc` ở TƯƠNG LAI ⇒ worker chưa rút được", async () => {
  // Đo 21/09: Botcake trả lời trong 8 giây hoặc không bao giờ (34/34 lượt ≤8s), nên mốc
  // im 10s phủ trọn. Hoãn bằng cột `thu_lai_luc` chứ không ngủ: ngủ trong lượt xử là giữ
  // kết nối + giữ khoá hội thoại suốt thời gian chờ.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  const convs = [{
    id: "c-im-bot", from_psid: "p-im", customers: [{ id: "k-im" }],
    last_customer_interactive_at: "2026-09-21T09:00:00",
    last_sent_by: { id: "p-im", name: "Khách" },
    snippet: "how much po",
  }];
  const msgs = [{ id: "im1", from: { id: "p-im" }, message: "how much po" }];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "10000" }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE },
      { doiGoXong: () => ({ ms: 0 }), docHoiThoai: async () => convs, docTin: async () => msgs });
    assert.equal(r.them, 1, "vẫn XẾP ngay — chỉ hoãn lúc RÚT, không hoãn lúc nạp");
  });

  const q = await sb.pool.query("SELECT thu_lai_luc > now() AS con_cho FROM tin_cho_xu_ly");
  assert.equal(q.rows[0].con_cho, true, "`thu_lai_luc` phải nằm ở TƯƠNG LAI");
  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  assert.equal(A, null, "chưa tới hạn ⇒ worker KHÔNG rút được — đó là cách Botcake được nói trước");

  // Tới hạn thì rút được ngay, không cần vòng poll nào nữa.
  await sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() - interval '1 second'");
  const B = await moPhienRut(sb.pool, { khoaWorker: "B" });
  assert.ok(B, "qua mốc im là rút được");
  await B.huy();
});

test("S4n · V3_NAP_IM_BOTCAKE_MS=0 ⇒ tắt cửa, xếp là rút được ngay", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  const convs = [{
    id: "c-khong-hoan", from_psid: "p-kh", customers: [{ id: "k-kh" }],
    last_customer_interactive_at: "2026-09-21T09:05:00",
    last_sent_by: { id: "p-kh", name: "Khách" }, snippet: "how much po",
  }];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, async () => {
    await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }), docHoiThoai: async () => convs,
      docTin: async () => [{ id: "kh1", from: { id: "p-kh" }, message: "how much po" }],
    });
  });
  const A = await moPhienRut(sb.pool, { khoaWorker: "A" });
  assert.ok(A, "tắt cửa thì rút được ngay");
  await A.huy();
});

// ── S4o · THẺ CHẶN — "Đã gửi" và thẻ trạng thái đơn ───────────────────────────────
test("S4o · hội thoại có thẻ \"Đã gửi\" → KHÔNG quét, KHÔNG gọi `GET /messages`", async () => {
  // Đo 21/09 page 1220547807799752: thẻ "Đã gửi" (id 3) gắn trên 11/60 hội thoại. Đó là
  // khách đã chốt đơn, hàng đã đi — trả lời tiếp là làm phiền mà vẫn tốn tiền.
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  const convs = [
    { id: "c-daGui", from_psid: "p-dg", customers: [{ id: "k-dg" }], tags: [6, 3],
      last_customer_interactive_at: "2026-09-21T08:00:00", last_sent_by: { id: "p-dg" } },
    { id: "c-thuong", from_psid: "p-th", customers: [{ id: "k-th" }], tags: [6],
      last_customer_interactive_at: "2026-09-21T08:00:00", last_sent_by: { id: "p-th" } },
  ];
  const daLay = [];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }),
      traThe: async (_p, ten) => (ten === "Đã gửi" ? 3 : null),   // bảng thẻ thật của page
      docHoiThoai: async () => convs,
      docTin: async (_p, _c, { convId }) => { daLay.push(convId); return [{ id: "z1", from: { id: convId === "c-daGui" ? "p-dg" : "p-th" }, message: "hello po" }]; },
    });
    assert.deepEqual(daLay, ["c-thuong"], "chỉ hội thoại KHÔNG có thẻ chặn mới được lấy tin");
    assert.equal(r.boQuaThe, 1, "phải ĐẾM ra, không nuốt im");
    assert.equal(r.them, 1);
  });
});

test("S4p · thẻ HỆ THỐNG của Pancake chặn sẵn, không cần khai tên", async () => {
  // `-2 shipped` · `-3 delivered` … là `-(mã trạng thái đơn)`, giống nhau ở MỌI page.
  // Danh sách neo vào đúng bản của đường v1 (`conv-owner.js#ORDER_STOP_TAGS`).
  const { ORDER_STOP_TAGS } = await import("../src/conv-owner.js");
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  for (const the of [...ORDER_STOP_TAGS]) {
    let goi = 0;
    await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, async () => {
      const r = await napTuPoll(sb.pool, { pageId: PAGE }, {
        doiGoXong: () => ({ ms: 0 }),
        traThe: async () => null,                    // KHÔNG khai tên thẻ nào
        docHoiThoai: async () => [{ id: `c${the}`, from_psid: `p${the}`, customers: [{ id: "k" }],
          tags: [the], last_customer_interactive_at: "2026-09-21T09:00:00", last_sent_by: { id: `p${the}` } }],
        docTin: async () => { goi += 1; return [{ id: "y1", from: { id: `p${the}` }, message: "hi" }]; },
      });
      assert.equal(r.boQuaThe, 1, `thẻ hệ thống ${the} phải chặn`);
    });
    assert.equal(goi, 0, `thẻ hệ thống ${the}: không được gọi lấy tin`);
  }
});

test("S4q · tra thẻ HỎNG → vẫn quét (fail-open), không câm oan cả page", async () => {
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, async () => {
    const r = await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }),
      traThe: async () => { throw new Error("Pancake /settings 500"); },
      docHoiThoai: async () => [{ id: "c-hong", from_psid: "p-h", customers: [{ id: "k-h" }], tags: [3],
        last_customer_interactive_at: "2026-09-21T10:00:00", last_sent_by: { id: "p-h" } }],
      docTin: async () => [{ id: "w1", from: { id: "p-h" }, message: "magkano" }],
    });
    assert.equal(r.them, 1, "không tra được thẻ thì thà quét thừa còn hơn bỏ sót khách");
    assert.equal(r.boQuaThe, 0);
  });
});

// ── S4r · DẤU VẾT TIN BỊ LỌC (migration 023) ──────────────────────────────────────
test("S4r · mỗi cửa lọc để lại ĐÚNG một dòng, có MÃ lý do đọc được", async () => {
  // Không có bảng này thì "57/57 hội thoại bị loại" chỉ nằm trong stdout, và một cửa bắt
  // OAN là khách im lặng mà không màn nào nói ra.
  await sb.pool.query("DELETE FROM nap_bo_qua");
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  const convs = [
    { id: "bq-the", from_psid: "p1", customers: [{ id: "k" }], tags: [3],
      last_customer_interactive_at: "2026-09-21T08:00:00", last_sent_by: { id: "p1" } },
    { id: "bq-page", from_psid: "p2", customers: [{ id: "k" }],
      last_customer_interactive_at: "2026-09-21T08:00:00",
      last_sent_by: { admin_id: PAGE, admin_name: "Botcake", id: PAGE } },
    { id: "bq-go", from_psid: "p3", customers: [{ id: "k" }], snippet: "hi",
      last_customer_interactive_at: "2026-09-21T08:00:00", last_sent_by: { id: "p3" } },
  ];
  await voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, async () => {
    await napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 99999, reason: "tin cụt" }),       // giữ bq-go lại
      traThe: async (_p, ten) => (ten === "Đã gửi" ? 3 : null),
      docHoiThoai: async () => convs,
      docTin: async () => [{ id: "m", from: { id: "p3" }, message: "hi" }],
    });
  });
  const ds = await sb.pool.query("SELECT conv_id, ly_do, chu_thich, so_lan FROM nap_bo_qua ORDER BY conv_id");
  assert.deepEqual(ds.rows.map((r) => [r.conv_id, r.ly_do]), [
    ["bq-go", "cho_go_xong"], ["bq-page", "page_noi_cuoi"], ["bq-the", "the_chan"],
  ]);
  assert.match(ds.rows.find((r) => r.conv_id === "bq-the").chu_thich, /thẻ 3/);
  assert.match(ds.rows.find((r) => r.conv_id === "bq-page").chu_thich, /Botcake/);
});

test("S4s · vòng sau KHÔNG đẻ dòng mới — cộng dồn `so_lan`, bảng không phình theo vòng quay", async () => {
  // 57 hội thoại × 10 vòng/phút = 34.000 dòng/giờ nếu mỗi vòng một dòng. Bảng này phải
  // lớn bằng SỐ HỘI THOẠI, không phải số vòng.
  const convs = [{ id: "bq-lap", from_psid: "p9", customers: [{ id: "k" }], tags: [3],
    last_customer_interactive_at: "2026-09-21T09:00:00", last_sent_by: { id: "p9" } }];
  const chay = () => voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, () =>
    napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms: 0 }), traThe: async () => 3,
      docHoiThoai: async () => convs, docTin: async () => [] }));
  await chay(); await chay(); await chay();
  const r = await sb.pool.query("SELECT so_lan FROM nap_bo_qua WHERE conv_id='bq-lap'");
  assert.equal(r.rowCount, 1, "ĐÚNG một dòng cho một hội thoại");
  assert.equal(r.rows[0].so_lan, 3, "ba vòng ⇒ so_lan = 3");
});

test("S4t · hội thoại được nạp ⇒ dấu vết bị XOÁ (còn dòng = đang bị bỏ)", async () => {
  await sb.pool.query("DELETE FROM nap_bo_qua");
  await sb.pool.query("DELETE FROM tin_cho_xu_ly");
  quenMoc(); quenChoGo();
  const conv = { id: "bq-thoat", from_psid: "p8", customers: [{ id: "k" }], snippet: "magkano po",
    last_customer_interactive_at: "2026-09-21T10:00:00", last_sent_by: { id: "p8" } };
  const chay = (ms) => voiEnv({ PANCAKE_READONLY: "1", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0" }, () =>
    napTuPoll(sb.pool, { pageId: PAGE }, {
      doiGoXong: () => ({ ms, reason: "chờ" }), traThe: async () => null,
      docHoiThoai: async () => [conv],
      docTin: async () => [{ id: "mm", from: { id: "p8" }, message: "magkano po" }] }));

  await chay(99999);                                  // còn chờ gõ ⇒ có dấu vết
  assert.equal((await sb.pool.query("SELECT 1 FROM nap_bo_qua WHERE conv_id='bq-thoat'")).rowCount, 1);

  const r = await chay(0);                            // hết chờ ⇒ nạp được
  assert.equal(r.them, 1);
  assert.equal((await sb.pool.query("SELECT 1 FROM nap_bo_qua WHERE conv_id='bq-thoat'")).rowCount, 0,
    "đã vào hàng đợi thì KHÔNG còn là tin bị bỏ");
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
      { doiGoXong: () => ({ ms: 0 }), docHoiThoai: async () => convs, docTin: async () => msgs },
    );
    assert.equal(r.mo, true);
    assert.equal(r.them, 1, "một hội thoại có tin mới → đúng một dòng");
    // Lượt NẠP THỨ HAI trên cùng dữ liệu — vòng poll thật chạy 6 giây một lần.
    const r2 = await napTuPoll(
      sb.pool,
      { pageId: PAGE },
      { doiGoXong: () => ({ ms: 0 }), docHoiThoai: async () => convs, docTin: async () => msgs },
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
        doiGoXong: () => ({ ms: 0 }),
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

test("S4l · gomCumTinKhach BỎ thẻ HTML rỗng và thông báo hệ thống, GIỮ câu của khách", () => {
  // Cả hai ca đều lấy từ vòng chạy thật 21/09 trên page 1220547807799752.
  assert.equal(
    gomCumTinKhach([{ id: "h1", from: { id: "k" }, message: "<div></div>" }], PAGE),
    null,
    "thẻ rỗng bóc ra không còn chữ ⇒ không có gì để trả lời, đừng xếp hàng",
  );

  // Cụm THẬT: thông báo hệ thống + HAI câu của người. Bỏ cả cụm là nuốt mất người thật.
  const cum = gomCumTinKhach([
    { id: "s1", from: { id: "k" },
      message: "Mlyn Bartolo confirmed an order. See details(fb-pma://payments/orderdetails/?invoice_id=1538354898328594)" },
    { id: "s2", from: { id: "k" }, message: "The order said my friend she want cancel" },
    { id: "s3", from: { id: "k" }, message: "Because he already told you" },
  ], PAGE);
  assert.equal(cum.text, "The order said my friend she want cancel\nBecause he already told you");
  assert.equal(cum.msgId, "s3", "khoá chống trùng vẫn là tin MỚI NHẤT");

  // Thông báo hệ thống ĐỨNG CUỐI vẫn phải để `msgId` tiến — nếu không, cụm cũ bị kéo lại.
  const chiThongBao = gomCumTinKhach([
    { id: "t1", from: { id: "k" }, message: "hello po" },
    { id: "t2", from: { id: "k" }, message: "See details(fb-pma://payments/x)" },
  ], PAGE);
  assert.equal(chiThongBao.text, "hello po");
  assert.equal(chiThongBao.msgId, "t2");
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
