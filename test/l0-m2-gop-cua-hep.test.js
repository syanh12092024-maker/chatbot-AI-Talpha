// G2-A3 · GỘP BA CỬA GHI HẸP VỀ MỘT BỘ DỰNG SQL.
//
// Ba cửa (`src/pos/kho.js` · `src/chat/kho.js` · `src/orders/may-trang-thai.js`) từng tự
// dựng câu `UPDATE` riêng vì `suaTheoId` chưa nhận `ctxHeThong()` và chưa nhận điều kiện
// thêm. G2-A1 mở hai chỗ đó; lượt này gộp câu SQL tay đi.
//
// Bộ ca này KHÔNG đo lại việc ba cửa còn chạy (bảy bộ ca cũ của L1/L2/L3 đã đo). Nó khoá
// đúng những thứ MẤT ĐƯỢC trong lúc gộp mà không bộ ca nào bắt — mỗi ca là một cái bẫy
// đã sập thật trong lượt làm G2-A3.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { themMoi, suaTheoId, ctxHeThong } from "../src/db/index.js";
import { suaHoiThoai } from "../src/chat/kho.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let tA, ctxA, pageId, dem = 0;

const moiHoiThoai = async () =>
  themMoi(sb.pool, ctxA, "hoi_thoai", {
    page_id: pageId,
    psid: `psid-gop-${++dem}`,
    trang_thai: "GREET",
    chu_so_huu: "AI",
  });

before(async () => {
  sb = await dungSandbox("l0m2gop");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  ctxA = { teamId: tA, nguoiDungId: null };
  pageId = (
    await mot(
      "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'fb-gop','Gộp') RETURNING id",
      [tA],
    )
  ).id;
});
after(async () => {
  await sb.don();
});

// ══ BẪY 1 — MẢNG JS vào cột jsonb ════════════════════════════════════════════════
// `pg` tuần tự hoá mảng JS thành mảng POSTGRES `{a,b}`, KHÔNG thành JSON. Cột
// `hoi_thoai.moc_luot_llm` là jsonb và nhận MẢNG. Bỏ `JSON.stringify` trong lúc gộp là
// hỏng đúng cột này — và trước lượt này KHÔNG bộ ca nào ghi nó qua `suaHoiThoai`.
test("G1 · suaHoiThoai ghi MẢNG vào cột jsonb đúng kiểu (moc_luot_llm)", async () => {
  const ht = await moiHoiThoai();
  const MOC = [1700000000000, 1700000001000, 1700000002000];
  await suaHoiThoai(sb.pool, {
    teamId: tA,
    id: ht.id,
    giaTri: { moc_luot_llm: MOC, luot_llm: MOC.length },
  });
  const r = await mot(
    `SELECT jsonb_typeof(moc_luot_llm) t, jsonb_array_length(moc_luot_llm) n,
            moc_luot_llm m, luot_llm FROM hoi_thoai WHERE id=$1`,
    [ht.id],
  );
  console.log(`   [G1] jsonb_typeof=${r.t} length=${r.n}`);
  assert.equal(r.t, "array"); // KHÔNG phải "string" — đó là cách nó hỏng
  assert.equal(r.n, 3);
  assert.deepEqual(r.m, MOC);
  assert.equal(r.luot_llm, 3);
});

// Vế ĐẢO CHIỀU: nếu ai đó bỏ `JSON.stringify` đi thì phải ĐỎ. Ca này chứng minh cái
// stringify kia đang gánh việc thật, chứ không phải một dòng thừa trông có vẻ cẩn thận.
test("G2 · CÙNG mảng đó truyền THẲNG xuống suaTheoId → ném, kèm câu chỉ đường", async () => {
  const ht = await moiHoiThoai();
  await assert.rejects(
    () =>
      suaTheoId(sb.pool, ctxA, "hoi_thoai", ht.id, {
        moc_luot_llm: [1700000000000, 1700000001000],
      }),
    (e) => {
      console.log(`   [G2] câu lỗi: ${e.message.slice(0, 72)}…`);
      assert.match(e.message, /JSON\.stringify/);
      assert.match(e.message, /moc_luot_llm/);
      return true;
    },
  );
});

// …nhưng cột MẢNG THẬT thì truyền mảng vẫn phải chạy. Guard đầu tiên tôi viết chặn cả
// hai, và nó làm đỏ 5 ca của l1-m1/va-q12 — `don_hang.san_pham_ma` là `text[]` thật.
test("G3 · cột text[] THẬT vẫn nhận mảng JS như thường (không bị chặn nhầm)", async () => {
  const don = await themMoi(sb.pool, ctxA, "don_hang", {
    nguon: "messenger",
    trang_thai_he: "cho_sale",
  });
  const sau = await suaTheoId(sb.pool, ctxA, "don_hang", don.id, {
    san_pham_ma: ["SP-1", "SP-2"],
  });
  console.log(`   [G3] san_pham_ma = ${JSON.stringify(sau.san_pham_ma)}`);
  assert.deepEqual(sau.san_pham_ma, ["SP-1", "SP-2"]);
});

// ══ BẪY 2 — danh sách cột cho phép của đường chat ════════════════════════════════
// `suaTheoId` nhận MỌI cột của bảng. Gộp mà đánh rơi allow-list là mở cho đường chat
// ghi `team_id`/`page_id`/… — thứ tầng chung cố ý không cấm vì nó phục vụ mọi nơi gọi.
test("G4 · suaHoiThoai vẫn deny-by-default theo cột (allow-list không rơi mất)", async () => {
  const ht = await moiHoiThoai();
  for (const cotLa of ["page_id", "team_id", "psid"]) {
    await assert.rejects(
      () =>
        suaHoiThoai(sb.pool, {
          teamId: tA,
          id: ht.id,
          giaTri: { [cotLa]: 1 },
        }),
      /không được phép ghi từ đường chat/,
    );
  }
});

// ══ BẪY 3 — nhật ký của đường chat KHÔNG được mang nội dung ══════════════════════
// `ho_so` mang SĐT và địa chỉ khách, `nhat_ky` là bảng CHỈ-INSERT (lỡ ghi là không xoá
// được). Khuôn nhật ký riêng của cửa chat tồn tại vì lý do đó.
test("G5 · nhật ký của suaHoiThoai chỉ mang TÊN CỘT, không mang nội dung khách", async () => {
  const ht = await moiHoiThoai();
  const SDT = "+971500000009";
  await suaHoiThoai(sb.pool, {
    teamId: tA,
    id: ht.id,
    giaTri: { ho_so: { sdt: SDT, dia_chi: "Dubai Marina" } },
  });
  const nk = await mot(
    `SELECT sau::text s FROM nhat_ky WHERE doi_tuong='hoi_thoai' AND doi_tuong_id=$1
      ORDER BY id DESC LIMIT 1`,
    [String(ht.id)],
  );
  console.log(`   [G5] nhat_ky.sau = ${nk.s}`);
  assert.ok(!nk.s.includes(SDT), "SĐT KHÔNG được lọt vào nhat_ky");
  assert.ok(!nk.s.includes("Dubai"), "địa chỉ KHÔNG được lọt vào nhat_ky");
  assert.match(nk.s, /ho_so/); // chỉ TÊN cột
  // …và dữ liệu thật thì vẫn phải ghi đúng vào hoi_thoai.
  const h = await mot("SELECT ho_so->>'sdt' s FROM hoi_thoai WHERE id=$1", [ht.id]);
  assert.equal(h.s, SDT);
});

// ══ BẪY 4 — `sua_luc` dùng ĐỒNG HỒ NÀO ═══════════════════════════════════════════
// Bản cũ đặt `sua_luc = now()` (đồng hồ CSDL). Gộp mà chuyển sang `new Date()` là trộn
// đồng hồ máy vào một cột đang toàn đồng hồ CSDL (án lệ #18). Cờ `datSuaLuc` giữ nguyên
// ngữ nghĩa cũ — và mặc định TẮT, vì L3-M2 có hợp đồng CẤM chạm `sua_luc`.
test("G6 · datSuaLuc dùng đồng hồ CSDL; mặc định TẮT thì không chạm sua_luc", async () => {
  const ht = await moiHoiThoai();
  const truoc = (await mot("SELECT sua_luc FROM hoi_thoai WHERE id=$1", [ht.id])).sua_luc;

  // (a) suaTheoId thường — KHÔNG được chạm sua_luc
  await suaTheoId(sb.pool, ctxA, "hoi_thoai", ht.id, { trang_thai: "QUALIFY" });
  const giua = (await mot("SELECT sua_luc FROM hoi_thoai WHERE id=$1", [ht.id])).sua_luc;
  assert.deepEqual(giua, truoc, "mặc định không được tự bump sua_luc");

  // (b) qua suaHoiThoai (datSuaLuc: true) — phải bump, và bằng ĐỒNG HỒ CSDL
  const dbTruoc = (await mot("SELECT now() n")).n;
  await suaHoiThoai(sb.pool, { teamId: tA, id: ht.id, giaTri: { trang_thai: "SELLING" } });
  const sau = (await mot("SELECT sua_luc FROM hoi_thoai WHERE id=$1", [ht.id])).sua_luc;
  const dbSau = (await mot("SELECT now() n")).n;
  console.log(`   [G6] sua_luc bump: ${giua.toISOString()} → ${sau.toISOString()}`);
  assert.ok(sau > giua, "datSuaLuc phải bump sua_luc");
  // Nằm TRONG cửa sổ đồng hồ CSDL của chính lượt đo — nếu ai đổi sang `new Date()` của
  // máy ứng dụng thì lệch đồng hồ sẽ đẩy nó ra ngoài cửa sổ này.
  assert.ok(sau >= dbTruoc && sau <= dbSau, `sua_luc phải nằm trong [${dbTruoc}, ${dbSau}]`);
});

// ══ BẪY 5 — ba cửa còn tự dựng câu UPDATE nào không ══════════════════════════════
// Đây là cái phiếu G2-A3 sinh ra để làm: repo còn ĐÚNG MỘT bộ dựng câu UPDATE. Đo bằng
// cách đọc mã nguồn — thô, nhưng đúng thứ cần canh, và nó đỏ ngay nếu ai dựng cửa thứ tư.
test("G7 · ba cửa KHÔNG còn câu UPDATE tay nào (chỉ tầng chung được dựng)", async () => {
  const fs = await import("node:fs");
  const url = await import("node:url");
  const goc = url.fileURLToPath(new URL("..", import.meta.url));
  const con = [];
  for (const f of ["src/pos/kho.js", "src/chat/kho.js", "src/orders/may-trang-thai.js"]) {
    const raw = fs.readFileSync(goc + f, "utf8");
    for (const dong of raw.split("\n")) {
      // Bỏ dòng chú thích — lịch sử được phép NHẮC tới câu UPDATE cũ.
      if (/^\s*(\/\/|\*|\/\*)/.test(dong)) continue;
      if (/UPDATE\s+[a-z_$]/i.test(dong)) con.push(`${f}: ${dong.trim().slice(0, 60)}`);
    }
  }
  console.log(`   [G7] câu UPDATE tay còn lại: ${con.length}`);
  assert.deepEqual(con, []);
});
