// L1-M2 · CỬA PANCAKE MESSENGER — định tuyến team (page + N5 psid) và guard fail-closed
// (N1: V3_PANCAKE_GUI==='1' VÀ PANCAKE_READONLY!=='1'). Chạy trên CSDL sandbox riêng
// (`aicloser_v3_test_l1m2cua`), tự dựng tự dọn — cùng khuôn test/l0-m2-*.test.js.
//
// KHÔNG gọi Pancake thật (token 121 ở IP cá nhân — NHÁNH-VPS, xem ops/bin/nghiem-thu/l1-m2.sh
// phép ⑤): mọi ca dùng `deps` tiêm spy/mock thay hàm thật của src/pancake.js — cùng khuôn
// dependency-injection đã có sẵn trong src/scheduler-followup.js (`send = pkSendReply`).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  docHoiThoai,
  docTin,
  guiTin,
  guiAnh,
  ghiNote,
  gatThe,
  LoiPageKhongThuocTeam,
  LoiHoiThoaiKhongThuocPage,
  LoiCuaGuiDong,
} from "../src/channels/messenger/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const demNhatKy = async (hanhDong) =>
  Number(
    (
      await mot("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1", [
        hanhDong,
      ])
    ).c,
  );

// Đặt/khôi phục biến môi trường TRONG harness — không thừa hưởng .env (phiếu ④, "env đặt
// TRONG harness"). cuaDangMo() đọc process.env TƯƠI mỗi lượt gọi nên đặt/xoá ngay trước
// khi gọi hàm là đủ, không cần lo thứ tự import nạp dotenv.
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

function demSpy() {
  const goi = [];
  const spy = (...a) => {
    goi.push(a);
    return Promise.resolve({ ok: true, id: "spy-id" });
  };
  spy.goi = goi;
  return spy;
}

let idTieuAlpha, idAuus;
let ctxA, ctxB; // A = tieu-alpha (chủ page/hội thoại fixture), B = auus (team khác)
let pageA, pageB, hoiThoaiA;

before(async () => {
  sb = await dungSandbox("l1m2cua");
  idTieuAlpha = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  idAuus = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  // nguoiDungId PHẢI là id thật trong `nguoi_dung` hoặc null (tang-truy-van-v1.md §1) —
  // bịa id làm chính lượt ghi nhat_ky vỡ FK, che mất lỗi có tên đang muốn đo (án lệ L0-M2).
  ctxA = { teamId: idTieuAlpha, nguoiDungId: null };
  ctxB = { teamId: idAuus, nguoiDungId: null };

  pageA = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'fb-page-a','Page A') RETURNING id, page_id",
    [idTieuAlpha],
  );
  pageB = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'fb-page-b','Page B') RETURNING id, page_id",
    [idAuus],
  );
  hoiThoaiA = await mot(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,'psid-khach-a1','GREET','AI') RETURNING id, psid`,
    [idTieuAlpha, pageA.id],
  );
});
after(async () => {
  await sb.don();
});

// ── Định tuyến team (page_id → page.team_id qua tầng truy vấn) ─────────────────────
test("N1a · docHoiThoai: ctx đúng team + page thuộc team đó → gọi xuống, trả nguyên dữ liệu mock", async () => {
  const mock = [{ id: "c1" }];
  const getConversations = async (pageId) => {
    assert.equal(pageId, "fb-page-a");
    return mock;
  };
  const ra = await docHoiThoai(
    sb.pool,
    ctxA,
    { pageId: "fb-page-a" },
    { getConversations },
  );
  assert.deepEqual(ra, mock);
});

test("N1b · docHoiThoai: ctx=tieu-alpha nhưng pageId thuộc auus → LoiPageKhongThuocTeam + nhat_ky(chan_page_xuyen_team) +1", async () => {
  const truoc = await demNhatKy("chan_page_xuyen_team");
  const spy = demSpy();
  await assert.rejects(
    () =>
      docHoiThoai(
        sb.pool,
        ctxA,
        { pageId: "fb-page-b" },
        { getConversations: spy },
      ),
    LoiPageKhongThuocTeam,
  );
  const sau = await demNhatKy("chan_page_xuyen_team");
  console.log(
    `   [N1b] nhat_ky(chan_page_xuyen_team) trước=${truoc} sau=${sau}`,
  );
  assert.equal(sau - truoc, 1);
  assert.equal(spy.goi.length, 0, "không được gọi xuống pancake.js");
});

test("N1c · docHoiThoai: page_id không tồn tại → LoiPageKhongThuocTeam, không gọi xuống", async () => {
  const spy = demSpy();
  await assert.rejects(
    () =>
      docHoiThoai(
        sb.pool,
        ctxA,
        { pageId: "fb-page-khong-ton-tai" },
        { getConversations: spy },
      ),
    LoiPageKhongThuocTeam,
  );
  assert.equal(spy.goi.length, 0);
});

// ── N5: psid PHẢI khớp hoi_thoai của ĐÚNG page (không so convId Pancake — xem index.js) ─
test("N5a · docTin: psid không khớp hoi_thoai nào của page → LoiHoiThoaiKhongThuocPage, không gọi xuống", async () => {
  const spy = demSpy();
  await assert.rejects(
    () =>
      docTin(
        sb.pool,
        ctxA,
        {
          pageId: "fb-page-a",
          psid: "psid-khong-ton-tai",
          convId: "pk-conv-999",
          custId: "cust-1",
        },
        { getMessages: spy },
      ),
    LoiHoiThoaiKhongThuocPage,
  );
  assert.equal(spy.goi.length, 0);
});

test("N5b · guiTin: psid ĐÚNG hội thoại thuộc page → qua N5, gọi xuống với convId Pancake NGUYÊN VẸN (không phải psid)", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTin(
      sb.pool,
      ctxA,
      {
        pageId: "fb-page-a",
        psid: hoiThoaiA.psid,
        convId: "pk-conv-abc", // convId Pancake — KHÁC psid, xem ghi chú index.js
        custId: "cust-1",
        text: "chào khách",
      },
      { send: spy },
    ),
  );
  assert.equal(spy.goi.length, 1);
  const [pageIdGoi, convIdGoi, custIdGoi, textGoi] = spy.goi[0];
  console.log(
    `   [N5b] gọi xuống pancake.js với convId="${convIdGoi}" (≠ psid="${hoiThoaiA.psid}")`,
  );
  assert.equal(pageIdGoi, "fb-page-a");
  assert.equal(convIdGoi, "pk-conv-abc");
  assert.notEqual(
    convIdGoi,
    hoiThoaiA.psid,
    "convId truyền xuống phải là convId Pancake, không bị đánh tráo bằng psid",
  );
  assert.equal(custIdGoi, "cust-1");
  assert.equal(textGoi, "chào khách");
});

// ── N1 (guard): 3 ca đối chứng a/b/c — CÙNG spy, CÙNG hàm (guiTin), env đặt trong harness ─
test("guard-a · vắng V3_PANCAKE_GUI → LoiCuaGuiDong, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: undefined, PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTin(
          sb.pool,
          ctxA,
          {
            pageId: "fb-page-a",
            psid: hoiThoaiA.psid,
            convId: "pk-conv-a",
            custId: "cust-1",
            text: "x",
          },
          { send: spy },
        ),
      LoiCuaGuiDong,
    ),
  );
  console.log(`   [guard-a] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 0);
});

test("guard-b · V3_PANCAKE_GUI=1 + PANCAKE_READONLY=1 → vẫn chặn, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "1" }, () =>
    assert.rejects(
      () =>
        guiTin(
          sb.pool,
          ctxA,
          {
            pageId: "fb-page-a",
            psid: hoiThoaiA.psid,
            convId: "pk-conv-b",
            custId: "cust-1",
            text: "x",
          },
          { send: spy },
        ),
      LoiCuaGuiDong,
    ),
  );
  console.log(`   [guard-b] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 0);
});

test("guard-c · V3_PANCAKE_GUI=1 + KHÔNG readonly → ĐỐI CHỨNG DƯƠNG, spy=1 (cửa thật sự gọi xuống)", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTin(
      sb.pool,
      ctxA,
      {
        pageId: "fb-page-a",
        psid: hoiThoaiA.psid,
        convId: "pk-conv-c",
        custId: "cust-1",
        text: "x",
      },
      { send: spy },
    ),
  );
  console.log(`   [guard-c] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 1);
});

test("guard-doc · Hàm ĐỌC (docHoiThoai) KHÔNG bị guard đóng chặn — vắng V3_PANCAKE_GUI vẫn đọc được", async () => {
  const mock = [{ id: "c-doc" }];
  await voiEnv(
    { V3_PANCAKE_GUI: undefined, PANCAKE_READONLY: "1" },
    async () => {
      const ra = await docHoiThoai(
        sb.pool,
        ctxA,
        { pageId: "fb-page-a" },
        { getConversations: async () => mock },
      );
      assert.deepEqual(ra, mock);
    },
  );
});

// ── N3: ctxHeThong() job nền tự dựng ctx hệ-thống GẮN ĐÚNG team của page ────────────
test("N3a · docTin dưới ctxHeThong() trên page đã gán team tieu-alpha → nhat_ky dòng mới mang team_id THẬT (không NULL/chua-phan)", async () => {
  const truoc = await demNhatKy("doc");
  const ra = await docTin(
    sb.pool,
    ctxHeThong(),
    {
      pageId: "fb-page-a",
      psid: hoiThoaiA.psid,
      convId: "pk-conv-he-thong",
      custId: "cust-1",
    },
    { getMessages: async () => [{ id: "m1" }] },
  );
  assert.deepEqual(ra, [{ id: "m1" }]);
  const dong = await mot(
    "SELECT team_id FROM nhat_ky WHERE hanh_dong='doc' ORDER BY id DESC LIMIT 1",
  );
  const sau = await demNhatKy("doc");
  console.log(
    `   [N3a] nhat_ky('doc') trước=${truoc} sau=${sau} · team_id dòng mới=${dong.team_id} (chờ ${idTieuAlpha})`,
  );
  assert.equal(sau - truoc, 1);
  assert.equal(String(dong.team_id), String(idTieuAlpha));
  assert.notEqual(dong.team_id, null);
});

test("N3b · ctxHeThong() trên page_id không tồn tại → LoiPageKhongThuocTeam (chưa có team để ghi nhat_ky)", async () => {
  await assert.rejects(
    () =>
      docHoiThoai(
        sb.pool,
        ctxHeThong(),
        { pageId: "fb-page-khong-ton-tai" },
        { getConversations: async () => [] },
      ),
    LoiPageKhongThuocTeam,
  );
});

// ── ghiNote: không có convId/psid — chỉ định tuyến team + guard, không áp N5 ───────
test("ghiNote-a · guard đóng → LoiCuaGuiDong, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: undefined, PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        ghiNote(
          sb.pool,
          ctxA,
          { pageId: "fb-page-a", custId: "cust-1", message: "note" },
          { addNote: spy },
        ),
      LoiCuaGuiDong,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

test("ghiNote-b · guard mở + page đúng team → gọi xuống pkAddNote", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    ghiNote(
      sb.pool,
      ctxA,
      { pageId: "fb-page-a", custId: "cust-1", message: "AI đã chốt đơn" },
      { addNote: spy },
    ),
  );
  assert.equal(spy.goi.length, 1);
  assert.deepEqual(spy.goi[0], ["fb-page-a", "cust-1", "AI đã chốt đơn"]);
});

test("ghiNote-c · page thuộc team khác → LoiPageKhongThuocTeam trước cả khi tới guard", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        ghiNote(
          sb.pool,
          ctxA,
          { pageId: "fb-page-b", custId: "cust-1", message: "x" },
          { addNote: spy },
        ),
      LoiPageKhongThuocTeam,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

// ── guiAnh + gatThe: cùng khuôn routing+N5+guard, đo nhanh đường CHO-QUA ────────────
test("guiAnh · guard mở + N5 qua → gọi xuống pkSendImage với url/caption đúng", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiAnh(
      sb.pool,
      ctxA,
      {
        pageId: "fb-page-a",
        psid: hoiThoaiA.psid,
        convId: "pk-conv-img",
        custId: "cust-1",
        url: "https://vi.dụ/anh.jpg",
        caption: "mẫu áo",
      },
      { sendImage: spy },
    ),
  );
  assert.deepEqual(spy.goi[0], [
    "fb-page-a",
    "pk-conv-img",
    "cust-1",
    "https://vi.dụ/anh.jpg",
    "mẫu áo",
  ]);
});

test("gatThe · guard đóng → LoiCuaGuiDong trước khi chạm pkTagByName", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: undefined, PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        gatThe(
          sb.pool,
          ctxA,
          {
            pageId: "fb-page-a",
            psid: hoiThoaiA.psid,
            convId: "pk-conv-tag",
            name: "AI Chốt",
          },
          { tagByName: spy },
        ),
      LoiCuaGuiDong,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

test("gatThe · guard mở + N5 qua → gọi xuống pkTagByName(pageId, convId, name, on)", async () => {
  const spy = demSpy();
  await voiEnv({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    gatThe(
      sb.pool,
      ctxA,
      {
        pageId: "fb-page-a",
        psid: hoiThoaiA.psid,
        convId: "pk-conv-tag2",
        name: "AI Chốt",
        on: true,
      },
      { tagByName: spy },
    ),
  );
  assert.deepEqual(spy.goi[0], ["fb-page-a", "pk-conv-tag2", "AI Chốt", true]);
});
