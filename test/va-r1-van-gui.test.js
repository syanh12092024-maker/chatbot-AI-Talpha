// VA-R1 · Van GỬI: bộ não không bắn HTTP GHI thật khi van đóng (RF-1) · worker đọc van +
// nguonDangMo không mở nhầm theo cwd/DB thật (RF-2) · handler-v3 truyền guard đủ cờ
// orderCreated/isOrderSummary (RF-3). Sổ §9/§9b, repro refute-MANG-2 S1·S3·S4 là thước gốc.
//
// Sandbox riêng (`aicloser_v3_test_var1`), tự dựng tự dọn. KHÔNG một byte ra mạng: cổng
// HTTP ghi được đo bằng fetch giả gán vào globalThis (cổng đứng ngoài, gán chỉ thay phần trong).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  xuLyMotTin,
  lapCongHttpGhi,
  congHttpGhi,
  vanGuiDangMo,
  vanGuiDangMoTuyetDoi,
  hostThuocVanGui,
} from "../src/chat/handler-v3.js";
import { chayMotVong } from "../src/queue/worker.js";
import { xepTin, docTinTheoId } from "../src/queue/kho.js";
import {
  nguonDangMo,
  dbLaSandboxCucBo,
  docEnvTuyetDoi,
} from "../src/queue/nap.js";
import { LoiCuaGuiDong } from "../src/channels/messenger/index.js";
import { guardOutbound } from "../src/outbound-guard.js";

let sb,
  teamId,
  seq = 0;
const kbMau = { config: {}, products: [{ name: "SP", price: 109 }], text: "" };
const depsChung = (over = {}) => ({
  layKb: () => kbMau,
  layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
  phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
  lanNhanh: () => ({ handled: false, reply: null, lane: "", reason: "esc" }),
  vaoHangCho: async () => ({ ok: true }),
  docLichSu: false,
  ...over,
});
const cuaGia = {
  guiTin: async () => ({ ok: true }),
  guiAnh: async () => ({ ok: true }),
  ghiNote: async () => ({ ok: true }),
  gatThe: async () => ({ ok: true }),
};

/** Đặt env tạm trong một lượt (undefined = xoá), trả lại y nguyên sau. */
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
const VAN_DONG = { V3_PANCAKE_GUI: undefined, PANCAKE_READONLY: "1" };
const VAN_MO = { V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0" }; // "0" để .env tuyệt đối không đè

before(async () => {
  sb = await dungSandbox("var1");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'"))
    .rows[0].id;
});
after(async () => {
  if (sb) await sb.don();
});

async function dungTin(psid, noiDung) {
  seq += 1;
  const pid = `96000000000${seq}`;
  const p = await sb.pool.query(
    "INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,'var1') RETURNING id",
    [teamId, pid],
  );
  await sb.pool.query(
    "INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,'QUALIFY','AI')",
    [teamId, p.rows[0].id, psid],
  );
  const r = await xepTin(sb.pool, {
    teamId,
    pageId: pid,
    psid,
    convId: `conv-${psid}`,
    custId: `cust-${psid}`,
    msgId: `m-${seq}`,
    noiDung,
  });
  return { pid, tin: await docTinTheoId(sb.pool, r.id, teamId), tinId: r.id };
}

// ═══ RF-1 · CỔNG HTTP GHI trên globalThis.fetch ══════════════════════════════════

test("R1-1 · RF-1: van ĐÓNG ⇒ POST/PUT/PATCH/DELETE tới pages.fm/graph bị chặn (LoiCuaGuiDong), GET vẫn qua, pos.pages.fm không thuộc van", async () => {
  assert.equal(lapCongHttpGhi().daLap, true, "cổng đã cài khi nạp handler-v3");
  const bay = [];
  const fetchCu = globalThis.fetch;
  globalThis.fetch = async (u, i) => {
    bay.push(`${i?.method || "GET"} ${new URL(String(u)).host}`);
    return { ok: true };
  };
  try {
    await voiEnv(VAN_DONG, async () => {
      const truoc = congHttpGhi.daChan.length;
      const bang = [];
      for (const [m, u] of [
        [
          "POST",
          "https://pages.fm/api/v1/pages/1/customers/2/notes?access_token=TOKEN",
        ],
        ["PUT", "https://pages.fm/api/public_api/v1/x"],
        ["PATCH", "https://graph.facebook.com/v19.0/me/messages"],
        ["DELETE", "https://pages.fm/api/v1/pages/1/tags/3"],
      ]) {
        await assert.rejects(
          fetch(u, { method: m }),
          (e) => e instanceof LoiCuaGuiDong,
        );
        bang.push(`${m} ${new URL(u).host} → CHẶN`);
      }
      await fetch("https://pages.fm/api/v1/pages/1/settings?access_token=T", {
        method: false,
      }); // khuôn pkFetchPage
      await fetch("https://pages.fm/api/v1/pages/1/conversations");
      await fetch("https://pos.pages.fm/api/v1/shops/1/orders", {
        method: "POST",
      }); // van POS riêng
      await fetch("https://api.moonshot.ai/anthropic/v1/messages", {
        method: "POST",
      }); // model
      bang.push(...bay.map((b) => `${b} → QUA`));
      console.log("   " + bang.join("\n   "));
      assert.deepEqual(bay, [
        "GET pages.fm",
        "GET pages.fm",
        "POST pos.pages.fm",
        "POST api.moonshot.ai",
      ]);
      assert.equal(congHttpGhi.daChan.length - truoc, 4);
      assert.ok(
        congHttpGhi.daChan.at(-4).includes("access_token=<che>"),
        "token phải che",
      );
    });
  } finally {
    globalThis.fetch = fetchCu;
  }
  assert.equal(hostThuocVanGui("pos.pages.fm"), false);
  assert.equal(hostThuocVanGui("pages.fm"), true);
  assert.equal(hostThuocVanGui("graph.facebook.com"), true);
});

test("R1-2 · ĐỐI CHỨNG DƯƠNG: van MỞ ⇒ POST pages.fm đi qua cổng tới fetch trong", async () => {
  const bay = [];
  const fetchCu = globalThis.fetch;
  globalThis.fetch = async (u, i) => (
    bay.push(`${i?.method || "GET"} ${new URL(String(u)).host}`),
    { ok: true }
  );
  try {
    await voiEnv(VAN_MO, async () => {
      assert.equal(vanGuiDangMo(), true);
      assert.equal(vanGuiDangMoTuyetDoi(), true);
      await fetch("https://pages.fm/api/v1/pages/1/customers/2/notes", {
        method: "POST",
      });
    });
    console.log(`   van mở: ${JSON.stringify(bay)}`);
    assert.deepEqual(bay, ["POST pages.fm"]);
  } finally {
    globalThis.fetch = fetchCu;
  }
});

test("R1-3 · RF-1 (S1): van ĐÓNG + cửa THẬT ⇒ handler-v3 KHÔNG gọi bộ não, trả chan_guard", async () => {
  const { tin } = await dungTin("psid-r13", "how much?");
  let goiNao = 0;
  const kq = await voiEnv(VAN_DONG, () =>
    xuLyMotTin(
      sb.pool,
      tin,
      depsChung({
        chayCloser: async () => (goiNao++, "Sure."),
        kiemTinRa: guardOutbound,
      }),
    ),
  );
  console.log(
    `   chayCloser=${goiNao} · ${kq.ketQua} · ${kq.lyDo.slice(0, 60)}`,
  );
  assert.equal(goiNao, 0);
  assert.equal(kq.ketQua, "chan_guard");
  assert.equal(kq.dem.goiModel, 0);
});

// ═══ RF-2 · worker đọc van + nguonDangMo không mở nhầm ═══════════════════════════

test("R1-4 · RF-2: worker chayMotVong van ĐÓNG ⇒ tin chốt chan_guard, 0 lượt model, có dòng nhật ký hàng đợi", async () => {
  await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong'");
  const { tinId } = await dungTin("psid-r14", "hello");
  let goiModel = 0;
  const r = await voiEnv(VAN_DONG, () =>
    chayMotVong(
      sb.pool,
      depsChung({ chayCloser: async () => (goiModel++, "Hi") }),
    ),
  );
  const sau = await docTinTheoId(sb.pool, tinId, teamId);
  const nk = (
    await sb.pool.query(
      "SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong='tin_chan_guard' AND doi_tuong_id=$1",
      [String(tinId)],
    )
  ).rows[0].n;
  console.log(
    `   worker: ${r.ketQua} · model=${goiModel} · tin=${sau.trang_thai} · nhật ký=${nk}`,
  );
  assert.equal(r.ketQua, "chan_guard");
  assert.equal(goiModel, 0);
  assert.equal(sau.trang_thai, "chan_guard");
  assert.equal(nk, 1);
});

test("R1-5 · RF-2: nguonDangMo — V3_NAP_DEV=1 chỉ mở khi CSDL là sandbox cục bộ; DB xa ⇒ ĐÓNG; READONLY đọc .env tuyệt đối", async () => {
  const XA = "postgres://u:p@169.58.33.8:5432/aicloser_v3";
  const GAN = "postgres://u:p@localhost:5433/aicloser_v3";
  const bang = [];
  const ca = async (env, cho, ten) => {
    const kq = await voiEnv(env, async () => nguonDangMo());
    bang.push(`${ten} → ${kq}`);
    assert.equal(kq, cho, ten);
  };
  await ca(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1", DATABASE_URL_V3: XA },
    false,
    "READONLY=1 + NAP_DEV=1 + DB 169.58.33.8",
  );
  await ca(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: "1", DATABASE_URL_V3: GAN },
    true,
    "READONLY=1 + NAP_DEV=1 + DB localhost (S4b)",
  );
  await ca(
    { PANCAKE_READONLY: "1", V3_NAP_DEV: undefined, DATABASE_URL_V3: GAN },
    false,
    "READONLY=1 + vắng NAP_DEV",
  );
  await ca(
    { PANCAKE_READONLY: "0", V3_NAP_DEV: undefined, DATABASE_URL_V3: XA },
    true,
    "máy chủ (READONLY≠1)",
  );
  assert.equal(dbLaSandboxCucBo("xyz"), false, "không parse được ⇒ mù ⇒ đóng");
  assert.equal(dbLaSandboxCucBo("postgres://u:p@127.0.0.1:5/x"), true);
  // .env tuyệt đối: xoá khỏi process.env thì vẫn đọc được từ <GOC>/.env (máy dev có dòng này).
  const tuFile = await voiEnv({ PANCAKE_READONLY: undefined }, async () =>
    docEnvTuyetDoi("PANCAKE_READONLY"),
  );
  bang.push(
    `docEnvTuyetDoi(PANCAKE_READONLY) khi process.env vắng → ${JSON.stringify(tuFile)}`,
  );
  if (tuFile === "1") {
    await ca(
      { PANCAKE_READONLY: undefined, V3_NAP_DEV: "1", DATABASE_URL_V3: XA },
      false,
      "env vắng (cwd lạ) + .env=1 + DB xa",
    );
  }
  console.log("   " + bang.join("\n   "));
});

// ═══ RF-3 · handler-v3 truyền guard đủ cờ ════════════════════════════════════════

test("R1-6 · RF-3 (S3): lượt bot chốt đơn ⇒ guard nhận orderCreated+isOrderSummary, tóm tắt đơn KHÔNG bị PII_ECHO chặn", async () => {
  const tom =
    "Confirming your order: Name: Grace Pranom, Contact: 0917 555 1234, Address: Cebu City.";
  assert.equal(
    guardOutbound(tom, { kb: kbMau }).ok,
    false,
    "thiếu cờ: guard thật chặn (đối chứng)",
  );
  const { tin } = await dungTin("psid-r16", "yes confirm");
  const ctxThay = [];
  const chu = [];
  const kq = await xuLyMotTin(
    sb.pool,
    tin,
    depsChung({
      chayCloser: async ({ state }) => (
        (state.orderCreatedThisTurn = true),
        tom
      ),
      kiemTinRa: (t, c) => (ctxThay.push(c), guardOutbound(t, c)),
      cua: {
        ...cuaGia,
        guiTin: async (_p, _c, a) => (chu.push(a.text), { ok: true }),
      },
    }),
  );
  const c = ctxThay[0] || {};
  console.log(
    `   orderCreated=${c.orderCreated} isOrderSummary=${c.isOrderSummary} · ${kq.lyDo} · gửi ${chu.length} tin`,
  );
  assert.equal(c.orderCreated, true);
  assert.equal(c.isOrderSummary, true);
  assert.equal(kq.lyDo, "tra_loi");
  assert.equal(chu.length, 1);
  // Lượt KHÔNG chốt đơn ⇒ hai cờ false (không mở toang guard cho mọi lượt).
  const { tin: tin2 } = await dungTin("psid-r16b", "price?");
  const ctx2 = [];
  await xuLyMotTin(
    sb.pool,
    tin2,
    depsChung({
      chayCloser: async () => "Our price is 109.",
      kiemTinRa: (t, c) => (ctx2.push(c), guardOutbound(t, c)),
      cua: cuaGia,
    }),
  );
  assert.equal(ctx2[0].orderCreated, false);
  assert.equal(ctx2[0].isOrderSummary, false);
});
