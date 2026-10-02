// P7 · TIẾN TRÌNH WORKER v3 (`src/queue/chay-worker.js`) — đường vào duy nhất làm luồng
// chat v3 THẬT SỰ chạy.
//
// Vì sao có bộ ca này: `src/queue/worker.js` là nơi duy nhất gọi `handler-v3` (⇒ ghi
// `so_ai`, `viec_can_xu_ly`), nhưng không tiến trình nào gọi nó — `src/server.js` không
// import `src/queue/*` một dòng nào, mà file đó CẤM SỬA. Đo được: `so_ai` 0 dòng trong khi
// 988 hội thoại ở HANDOFF. Bộ ca khoá hai điều: vòng lặp có ĐẾM được việc nó làm, và ba
// van vẫn chặn đúng chiều khi chạy trên máy READONLY.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  motLuot,
  dsPageDeNap,
  NHIP_MS,
  TRAN_MOI_LUOT,
} from "../src/queue/chay-worker.js";

let sb, pool, TEAM;
const q = (s, p) => pool.query(s, p);
const mot = async (s, p) => (await q(s, p)).rows[0];

/** Đặt env tạm trong một lượt (undefined = xoá). */
async function voiEnv(bo, viec) {
  const cu = {};
  for (const [k, v] of Object.entries(bo)) {
    cu[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await viec();
  } finally {
    for (const [k, v] of Object.entries(cu)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

before(async () => {
  sb = await dungSandbox("vap7");
  pool = sb.pool;
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  for (const [i, pid] of ["970000000001", "970000000002"].entries()) {
    await q("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3)", [
      TEAM,
      pid,
      `P${i}`,
    ]);
  }
});
after(async () => {
  if (sb) await sb.don();
});

// CR-02-10 · MB2: công tắc DUY NHẤT là cột `page.bot_ai_bat` — ca bật đúng page mình cần.
async function batBot(ids) {
  await q("UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))", [ids]);
}

test("P7-1 · đọc danh sách page TỪ BẢNG, không gõ tay (án lệ #22)", async () => {
  const ds = await dsPageDeNap(pool);
  assert.deepEqual(ds.sort(), ["970000000001", "970000000002"]);
});

test("P7-1b · CHƯA page nào bật bot ⇒ KHÔNG nạp page nào, và nói lý do", async () => {
  // Bảng `page` có 582 dòng trên máy chủ thật. Worker chỉ nạp page có `bot_ai_bat = true`;
  // không page nào bật thì không hỏi Pancake một lượt nào.
  await batBot([]);
  let goiCua = 0;
  const ket = await voiEnv(
    // Nguồn MỞ (khuôn harness như P7-3) để phép đo này soi ĐÚNG van bậc phơi, không soi nhầm
    // van nguồn: hai van đóng vì hai lý do khác nhau và phải đọc ra hai câu khác nhau.
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1" },
    () =>
      motLuot(pool, {
        depsNap: { docHoiThoai: async () => ((goiCua += 1), []) },
      }),
  );
  assert.equal(ket.nap.mo, true, "van NGUỒN phải mở thì phép đo này mới nói về công tắc");
  assert.equal(ket.nap.page, 0, "không page nào bật mà vẫn nạp là sai công tắc");
  assert.equal(goiCua, 0, "không page nào được phép thì KHÔNG hỏi Pancake một lượt nào");
  assert.match(ket.nap.lyDo, /bot_ai_bat/);
});

test("P7-1c · chỉ page BẬT bot mới được nạp — page tắt bị bỏ qua", async () => {
  await batBot(["970000000001"]);
  const ket = await voiEnv(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1" },
    () => motLuot(pool, { depsNap: { docHoiThoai: async () => [] } }),
  );
  assert.equal(ket.nap.choPhep, 1, "một page bật");
  assert.equal(ket.nap.page, 1, "chỉ page BẬT mới được nạp");
  assert.equal(ket.nap.nguonChoPhep, "csdl");
});

test("P7-2 · van NGUỒN đóng (máy READONLY) ⇒ KHÔNG gọi cửa Pancake một lượt nào, và NÓI lý do", async () => {
  let goiCua = 0;
  const ket = await voiEnv(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: undefined },
    () =>
      motLuot(pool, {
        depsNap: { docHoiThoai: async () => ((goiCua += 1), []) },
      }),
  );
  assert.equal(ket.nap.mo, false);
  assert.equal(goiCua, 0, "van đóng mà vẫn hỏi Pancake là vi phạm luật 1");
  assert.match(ket.nap.lyDo, /PANCAKE_READONLY/);
  assert.match(ket.nap.lyDo, /V3_NAP_DEV/);
  // Vẫn phải chạy vòng XỬ để dọn nốt tin cũ còn trong hàng đợi — nạp và xử là hai việc.
  assert.deepEqual(ket.xu, {
    vong: 0,
    xong: 0,
    chan_guard: 0,
    loi: 0,
    thu_lai: 0,
  });
});

test("P7-3 · van nguồn MỞ (harness) ⇒ nạp theo TỪNG page và cộng đúng số", async () => {
  await batBot(["970000000001", "970000000002"]);
  const ket = await voiEnv(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, () =>
    motLuot(pool, {
      depsNap: {
        // Ca này đo van bậc phơi + phép cộng theo page, KHÔNG đo cửa chờ-khách-gõ-xong
        // (cửa đó có ca riêng S4j). Mức chờ 0 để một vòng là đủ kết luận.
        doiGoXong: () => ({ ms: 0 }),
        docHoiThoai: async () => [
          { id: "conv-1", from_psid: "psid-1", customers: [{ id: "cust-1" }] },
        ],
        docTin: async () => [
          { id: "m1", from: { id: "970000000001" }, message: "chào" },
          { id: "m2", from: { id: "psid-1" }, message: "giá bao nhiêu" },
        ],
      },
      // Không cho lượt XỬ chạm bộ não thật trong bộ ca này.
      depsXuLy: {
        cua: {
          guiTin: async () => ({ ok: true }),
          guiAnh: async () => ({ ok: true }),
          ghiNote: async () => ({ ok: true }),
          gatThe: async () => ({ ok: true }),
        },
        layKb: () => ({ config: {}, products: [], text: "" }),
        chayCloser: async () => "",
        docLichSu: false,
      },
    }),
  );
  assert.equal(ket.nap.mo, true);
  assert.equal(ket.nap.page, 2, "phải đi qua cả hai page");
  assert.ok(
    ket.nap.them >= 1,
    `phải nạp được tin mới, đo: ${JSON.stringify(ket.nap)}`,
  );
  assert.equal(ket.nap.loi, 0);
});

test("P7-4 · MỘT page hỏng KHÔNG dừng cả vòng, nhưng phải ĐẾM ra", async () => {
  await batBot(["970000000001", "970000000002"]);
  let lan = 0;
  const ket = await voiEnv(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1" }, () =>
    motLuot(pool, {
      depsNap: {
        docHoiThoai: async () => {
          if (++lan === 1) throw new Error("page này 500");
          return [];
        },
      },
      depsXuLy: { docLichSu: false },
    }),
  );
  assert.equal(ket.nap.page, 2);
  assert.equal(ket.nap.loi, 1, "đúng một page lỗi");
  assert.match(ket.nap.loiCuoi, /page này 500/);
});

test("P7-5 · nhịp và trần đọc từ env, có mặc định — không hằng số chôn trong vòng lặp", () => {
  assert.equal(Number.isFinite(NHIP_MS), true);
  assert.equal(Number.isFinite(TRAN_MOI_LUOT), true);
  assert.ok(NHIP_MS >= 1000, "nhịp dưới 1 giây là quay tít, không phải poll");
  assert.ok(TRAN_MOI_LUOT >= 1);
});
