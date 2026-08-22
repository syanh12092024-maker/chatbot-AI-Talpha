// L2-M1 · NHẠC TRƯỞNG — PHÉP ĐẮT NHẤT của phiếu (④#4): CÔ LẬP BỘ NÃO.
//
// Câu hỏi mà bộ ca này trả lời: **khi handler v3 chạy trọn một lượt, có lượt gửi nào
// của bộ não CŨ lọt ra ngoài cửa v3 không?**
//
// CÁCH ĐO — hai đường đếm TÁCH BIỆT, không lẫn vào nhau:
//   ① `mock.module` thay hẳn `src/pancake.js` và `src/messenger.js` ở tầng module. MỌI
//      lượt gọi `pkSendReply/pkSendImage/pkAddNote/pkTagByName/sendImage` XUẤT PHÁT TỪ
//      BỘ NÃO (tools.js, order-bridge.js) rơi vào đây. Đây là cột "GỬI NGẦM".
//   ② Cửa v3 được gọi với tham số `deps` mang spy RIÊNG (cửa Messenger nhận `deps` từ
//      phiếu L1-M2). Mọi lượt gửi mà NHẠC TRƯỞNG chủ động làm rơi vào đây. Cột "CỬA V3".
//   ③ `globalThis.fetch` bị thay bằng bẫy ĐẾM-RỒI-NÉM. Đây là phép "0 lượt LỌT RA NGOÀI
//      mock" theo nghĩa đen: bất kỳ HTTP nào (Graph API của messenger.js hay pages.fm
//      của pancake.js) chạm mạng thật là ca ĐỎ, không phải một lời khai.
//
// BA DÂN SỐ (phiếu: "dân số 1 tin xanh vì NHÁNH KHÔNG CHẠY không tính là đạt"):
//   a. tin thường (model gửi ảnh + viết chữ) — nhánh chốt đơn/chuyển người KHÔNG chạy
//   b. ÉP nhánh chốt đơn   (model trả tool_use `create_draft_order`)
//   c. ÉP nhánh chuyển người (model trả tool_use `handoff_human`)
//
// ⚠️ CẦN CỜ `--experimental-test-module-mocks` (node v25 chưa bật `mock.module` mặc
//    định — ĐO 22/08: `typeof mock.module === 'undefined'` khi thiếu cờ). `package.json`
//    KHÔNG được đổi (phạm vi ③ của phiếu) nên cổng `ops/bin/nghiem-thu/l2-m1.sh` truyền
//    cờ. Thiếu cờ ⇒ bộ ca TỰ BỎ QUA có tuyên bố, KHÔNG giả xanh.
import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { dungSandbox } from "../db/sandbox.js";

const GOC = path.resolve(import.meta.dirname, "..");
const CO_MOCK_MODULE = typeof mock.module === "function";

// ── Trỏ MỌI tệp trạng thái của bản cũ sang thư mục tạm TRƯỚC khi nạp bất cứ module nào
// đọc chúng. Đây là nợ §9 mà thợ L0-M1 đã ghi ("bộ ca cũ GHI THẲNG vào conv-state.json
// thật"): `src/conv-state.js` chốt đường dẫn NGAY LÚC IMPORT, nên đặt biến sau import
// là quá muộn. Mọi import của bộ não ở đây đều là `await import()` động, sau khối này.
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), "l2m1-"));
process.env.CONV_STATE_FILE = path.join(TAM, "conv-state.json");
process.env.ORDER_QUEUE_FILE = path.join(TAM, "ai-order-queue.json");
process.env.AI_LOG_FILE = path.join(TAM, "ai-messages.jsonl");
process.env.V3_KHOA_MA_HOA =
  process.env.V3_KHOA_MA_HOA || crypto.randomBytes(32).toString("hex");

const PAGE = "910000000000009";
const PSID = "psid-nt";
const CONV = "conv-nt";
const CUST = "cust-nt";

const KB = {
  pageName: "Ca L2-M1",
  config: {},
  text: "# KB ca test",
  products: [
    {
      id: "P1",
      name: "Smart Watch",
      currency: "AED",
      price1: 199,
      images: [
        { url: "https://vi-du.test/a.jpg", label: "Ảnh sản phẩm" },
        { url: "https://vi-du.test/b.jpg", label: "Ảnh sản phẩm" },
      ],
    },
  ],
};

let sb, teamId, pageRowId;
let xuLyMotTin, KET_QUA, demSoAiTheoLoai, layModel, xepTin, docTinTheoId;
let guiNgam; // ① bộ đếm GỬI NGẦM (mock module)
let demFetch; // ③ bẫy fetch
let kichBanModel; // hàng đợi response của model
let clientMock; // object `anthropic` giả — dùng cho phép DI ④#8

function moiDem() {
  guiNgam = {
    pkSendReply: 0,
    pkSendImage: 0,
    pkAddNote: 0,
    pkTagByName: 0,
    sendImage_graph: 0,
    sendText_graph: 0,
    pos_doc: 0, // ĐƯỜNG THỨ NĂM — đọc POS pages.fm, xem ghi chú ở mock pancake-orders.js
  };
  demFetch = { n: 0 };
  kichBanModel = [];
}

const traLoiChu = (text) => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text }],
  usage: {
    input_tokens: 120,
    output_tokens: 30,
    cache_read_input_tokens: 10,
    cache_creation_input_tokens: 5,
  },
});
const traLoiTool = (name, input) => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id: `tu-${name}`, name, input }],
  usage: {
    input_tokens: 120,
    output_tokens: 30,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
});

before(async () => {
  moiDem();
  if (!CO_MOCK_MODULE) return;

  const P = (p) => path.join(GOC, p);

  // ① MOCK pancake.js — ĐỦ MỌI export (thiếu một cái là module nạp lỗi ở nơi khác).
  mock.module(P("src/pancake.js"), {
    namedExports: {
      pkSendReply: async () => {
        guiNgam.pkSendReply++;
        return { ok: true, id: "ngam" };
      },
      pkSendImage: async () => {
        guiNgam.pkSendImage++;
        return { ok: true, id: "ngam" };
      },
      pkAddNote: async () => {
        guiNgam.pkAddNote++;
        return { ok: true };
      },
      pkTagByName: async () => {
        guiNgam.pkTagByName++;
        return { ok: true, tags: [] };
      },
      pkGetConversations: async () => [],
      pkGetMessages: async () => [],
      pkToggleTag: async () => ({ ok: true }),
      pkTagId: async () => null,
      pkMarkUnread: async () => ({ ok: true }),
      createOrder: async (input) => ({ id: `DRAFT-ca`, input }),
      pancakePages: () => new Map(),
      pancakePageCount: () => 0,
      refreshPancakePages: async () => 0,
      listPancakeTokens: () => [],
      addPancakeToken: async () => ({ ok: true }),
      removePancakeToken: () => ({ ok: true }),
      decodeTok: () => ({}),
    },
  });

  // ① MOCK messenger.js — ĐƯỜNG GỬI THỨ HAI (Graph API), nhánh `else` của
  // `sendImageWithRetry` (tools.js:104). Không mock cái này thì một lượt ảnh đi thẳng
  // ra Facebook mà bảng đếm Pancake vẫn 0 — đúng kiểu «xanh vì đo nhầm chỗ».
  mock.module(P("src/messenger.js"), {
    namedExports: {
      sendImage: async () => {
        guiNgam.sendImage_graph++;
        return true;
      },
      sendText: async () => {
        guiNgam.sendText_graph++;
      },
      sendTyping: async () => {},
      subscribePage: async () => ({ ok: true }),
      verifySignature: () => true,
    },
  });

  // MOCK stats.js — nó `fs.writeFileSync` thẳng vào `stats.json` THẬT ở gốc repo (1,4 MB
  // số liệu vận hành) và KHÔNG có biến môi trường nào trỏ đi chỗ khác. Đây đúng là cái
  // nợ §9 «bộ ca cũ ghi thẳng vào dữ liệu thật» — không lặp lại nó ở phiếu này.
  mock.module(P("src/stats.js"), {
    namedExports: {
      incOrder: () => {},
      incLead: () => {},
      incReply: () => {},
      incInbound: () => {},
      statsSnapshot: () => ({}),
      resetStats: () => {},
    },
  });

  // ⑤ MOCK pancake-orders.js — ĐƯỜNG RA THỨ NĂM, phiếu KHÔNG khai (đo được ở chính lượt
  // này, án lệ #4). Nhánh `create_draft_order` của bộ não gọi `ordersEnabled()` +
  // `conversationHasOrder()` (tools.js:171), và hàm đó bắn HTTP THẬT tới POS pages.fm
  // bằng KHOÁ THẬT của 7 shop trong `pancake-shops.json` — `src/pancake-orders.js:25`
  // và `:108`. Đo lượt đầu chạy bộ ca này: **7 lượt fetch** thoát ra ngoài mock
  // pancake.js/messenger.js. Nó là đường ĐỌC (GET /orders), không phải đường gửi tin,
  // nhưng: (a) không một dòng `PANCAKE_READONLY` nào canh nó (grep pancake-orders.js = 0),
  // (b) `catch {}` ở dòng 113 nuốt mọi lỗi nên nó hỏng TRONG IM LẶNG. Đã ghi §9.
  // Mock ở đây ĐẾM chứ không xoá dấu vết — bảng đếm in ra `pos_doc=N`.
  mock.module(P("src/pancake-orders.js"), {
    namedExports: {
      ordersEnabled: () => {
        guiNgam.pos_doc++;
        return false; // như máy CHƯA cắm shop nào — nhánh dedup POS không chạy
      },
      conversationHasOrder: async () => {
        guiNgam.pos_doc++;
        return false;
      },
      markConversationOrdered: () => {},
      createPancakeOrder: async () => {
        guiNgam.pos_doc++;
        return { ok: false, error: "KHÔNG ĐƯỢC gọi khi autoCreateOrder tắt" };
      },
      ordersForConv: async () => {
        guiNgam.pos_doc++;
        return [];
      },
      realOrders: async () => [],
      realOrdersMulti: async () => ({}),
      aiOrderStats: async () => ({}),
    },
  });

  // MOCK llm.js — model giả, chạy theo kịch bản. Vì `layModel` (src/chat/model.js) và
  // `closer.js` CÙNG import `anthropic` từ đây, đổi ở một chỗ là đổi cho cả hai — đó
  // chính là điều phép ④#8 muốn chứng minh.
  clientMock = {
    raw: {},
    messages: {
      create: async () => {
        const r = kichBanModel.shift();
        if (!r)
          throw new Error("kịch bản model đã hết — ca test thiếu response");
        return r;
      },
    },
  };
  mock.module(P("src/llm.js"), {
    namedExports: { anthropic: clientMock, aiExtras: {} },
  });

  // ③ BẪY FETCH — chốt chặn cuối. Không có gì trong lượt test được chạm mạng.
  globalThis.fetch = async (...a) => {
    demFetch.n++;
    throw new Error(`LỌT RA NGOÀI MOCK: fetch(${String(a[0]).slice(0, 80)})`);
  };

  ({ xuLyMotTin, KET_QUA } = await import("../src/chat/handler-v3.js"));
  ({ demSoAiTheoLoai } = await import("../src/chat/so-ai.js"));
  ({ layModel } = await import("../src/chat/model.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));

  sb = await dungSandbox("l2m1nt");
  const t = await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'");
  teamId = t.rows[0].id;
  const p = await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Ca NT') RETURNING id",
    [teamId, PAGE],
  );
  pageRowId = p.rows[0].id;
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,$3,'QUALIFY','AI')`,
    [teamId, pageRowId, PSID],
  );
});

after(async () => {
  if (sb) await sb.don();
  // ⚠️ KHÔNG `rmSync(TAM)`: `src/conv-state.js` ghi trễ 3 giây (`markDirty` →
  // `setTimeout(flush, 3000)`), nên xoá thư mục ngay sau ca cuối làm nó in
  // «[conv-state] ghi lỗi: ENOENT» — một dòng đỏ giả cho người đọc log cổng. Thư mục
  // nằm trong `os.tmpdir()`, hệ điều hành tự dọn.
  console.log(`   [dọn] tệp trạng thái tạm của lượt đo: ${TAM}`);
});

// ── khung dựng một lượt ────────────────────────────────────────────────────────────
async function motLuot({ noiDung, msgId, kichBan, deps = {}, moiTruong = {} }) {
  moiDem();
  kichBanModel = kichBan;
  const t = await xepTin(sb.pool, {
    teamId,
    pageId: PAGE,
    psid: PSID,
    convId: CONV,
    custId: CUST,
    msgId,
    noiDung,
  });
  // ② spy RIÊNG cho cửa v3 — tách hẳn khỏi bộ đếm ① của mock module.
  const cuaV3 = { guiTin: 0, guiAnh: 0, ghiNote: 0, gatThe: 0 };
  const depsPancake = {
    send: async () => {
      cuaV3.guiTin++;
      return { ok: true, id: "cua" };
    },
    sendImage: async () => {
      cuaV3.guiAnh++;
      return { ok: true, id: "cua" };
    },
    addNote: async () => {
      cuaV3.ghiNote++;
      return { ok: true };
    },
    tagByName: async () => {
      cuaV3.gatThe++;
      return { ok: true, tags: [] };
    },
    getConversations: async () => [],
    getMessages: async () => [],
  };
  const cu = {};
  for (const [k, v] of Object.entries(moiTruong)) {
    cu[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  // Van cửa v3 MỞ mặc định trong harness (đặt TRONG test, không thừa hưởng .env).
  if (!("V3_PANCAKE_GUI" in moiTruong)) process.env.V3_PANCAKE_GUI = "1";
  if (!("PANCAKE_READONLY" in moiTruong)) {
    cu.PANCAKE_READONLY = process.env.PANCAKE_READONLY;
    delete process.env.PANCAKE_READONLY;
  }
  try {
    const tin = await docTinTheoId(sb.pool, t.id, teamId);
    const kq = await xuLyMotTin(sb.pool, tin, {
      layKb: () => KB,
      depsPancake,
      lichSu: [],
      ...deps,
    });
    return { kq, cuaV3, tinId: t.id };
  } finally {
    delete process.env.V3_PANCAKE_GUI;
    for (const [k, v] of Object.entries(cu)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function inBang(ten, cuaV3) {
  console.log(
    `   [${ten}] GỬI NGẦM pkSendReply=${guiNgam.pkSendReply} pkSendImage=${guiNgam.pkSendImage} ` +
      `pkAddNote=${guiNgam.pkAddNote} pkTagByName=${guiNgam.pkTagByName} ` +
      `sendImage(Graph)=${guiNgam.sendImage_graph} posDoc=${guiNgam.pos_doc} | CỬA V3 guiTin=${cuaV3.guiTin} ` +
      `guiAnh=${cuaV3.guiAnh} ghiNote=${cuaV3.ghiNote} gatThe=${cuaV3.gatThe} | ` +
      `fetch-lọt=${demFetch.n}`,
  );
}

const boQua = {
  skip: CO_MOCK_MODULE ? false : "cần cờ --experimental-test-module-mocks",
};

// ══ DÂN SỐ a — TIN THƯỜNG ═════════════════════════════════════════════════════════
test(
  "N1a · tin thường: 0 lượt gửi ngầm; tin chữ + ảnh đi HẾT qua cửa v3",
  boQua,
  async () => {
    const { kq, cuaV3 } = await motLuot({
      noiDung: "do you deliver to Abu Dhabi and how long does shipping take",
      msgId: "a-1",
      kichBan: [
        traLoiTool("send_product_image", {
          caption: "here you go",
          category: "",
        }),
        traLoiChu("Yes we deliver there, usually two to four days."),
      ],
    });
    inBang("a", cuaV3);
    assert.equal(kq.ketQua, KET_QUA.XONG);
    assert.deepEqual(
      guiNgam,
      {
        pkSendReply: 0,
        pkSendImage: 0,
        pkAddNote: 0,
        pkTagByName: 0,
        sendImage_graph: 0,
        sendText_graph: 0,
        pos_doc: 0,
      },
      "tin thường KHÔNG được có lượt gửi ngầm nào",
    );
    assert.equal(demFetch.n, 0, "không lượt HTTP nào lọt ra ngoài mock");
    assert.equal(cuaV3.guiTin, 1, "đúng MỘT tin chữ, qua cửa v3");
    assert.equal(
      cuaV3.guiAnh,
      2,
      "2 ảnh của KB, qua cửa v3 (KHÔNG qua flushPendingImages)",
    );
    assert.equal(kq.dem.goiModel, 1);
  },
);

// ══ DÂN SỐ b — ÉP NHÁNH CHỐT ĐƠN ══════════════════════════════════════════════════
test(
  "N1b · ép chốt đơn: gửi ngầm bị mock BẮT (0 lọt ra mạng), so_ai có `order`",
  boQua,
  async () => {
    const { kq, cuaV3, tinId } = await motLuot({
      noiDung: "ok i want to order one, my name is Sara",
      msgId: "b-1",
      kichBan: [
        traLoiTool("create_draft_order", {
          name: "Sara",
          phone: "0501234567",
          address: "Villa 12, Al Barsha, Dubai",
          city: "Dubai",
          qty: 1,
          cod_confirmed: true,
          product_id: "P1",
        }),
        traLoiChu(
          "Thank you, we received your details. Our staff will call you.",
        ),
      ],
    });
    inBang("b", cuaV3);
    assert.equal(kq.ketQua, KET_QUA.XONG);
    assert.equal(
      demFetch.n,
      0,
      "0 lượt LỌT RA NGOÀI mock — không HTTP thật nào",
    );

    // ⚠️ HAI lượt gửi ngầm CÓ THẬT ở nhánh này, mock giữ lại chúng. Đây là NỢ DÀI HẠN của
    // phiếu (§9): tools.js:197 `pkTagByName(pkTags.order)` và — LỆCH ĐỀ BÀI, phiếu chỉ
    // khai 3 chỗ — order-bridge.js:255 `pkAddNote(<ghi chú đơn>)` gọi gián tiếp từ
    // tools.js:208. Neo con số ở đây để lượt sau AI NỚI ra là ca ĐỎ ngay.
    assert.equal(
      guiNgam.pkTagByName,
      1,
      "tools.js:197 gắn thẻ 'AI Chốt' — bị mock bắt",
    );
    assert.equal(
      guiNgam.pkAddNote,
      1,
      "order-bridge.js:255 ghi chú đơn — bị mock bắt",
    );
    assert.equal(guiNgam.pkSendReply, 0, "tin chữ KHÔNG được đi đường ngầm");
    assert.equal(guiNgam.pkSendImage + guiNgam.sendImage_graph, 0);
    assert.equal(cuaV3.guiTin, 1, "tin chữ đi qua cửa v3");

    const dem = await demSoAiTheoLoai(sb.pool, { teamId });
    assert.ok(
      dem.order >= 1,
      `so_ai phải có sự kiện 'order' (bảng: ${JSON.stringify(dem)})`,
    );
    const r = await sb.pool.query(
      "SELECT ly_do, du_lieu FROM so_ai WHERE loai='order' AND nguon_dong=$1",
      [Number(tinId)],
    );
    assert.equal(r.rows[0].ly_do, "bot_chot_luot_nay");
    assert.equal(
      r.rows[0].du_lieu.auto_create_order,
      false,
      "autoCreateOrder phải GIỮ TẮT ở lượt chốt",
    );
    const ht = await sb.pool.query(
      "SELECT trang_thai, chu_so_huu, chot_don_luc FROM hoi_thoai WHERE page_id=$1 AND psid=$2",
      [pageRowId, PSID],
    );
    assert.equal(ht.rows[0].trang_thai, "CLOSING");
    assert.equal(ht.rows[0].chu_so_huu, "SALE");
    assert.notEqual(ht.rows[0].chot_don_luc, null);
  },
);

// ══ DÂN SỐ c — ÉP NHÁNH CHUYỂN NGƯỜI ══════════════════════════════════════════════
test(
  "N1c · ép chuyển người: cửa v3 GÁNH tag+note, gửi ngầm bị mock bắt, so_ai có `handoff`",
  boQua,
  async () => {
    const { kq, cuaV3, tinId } = await motLuot({
      noiDung: "i need to talk to a real person about my previous order please",
      msgId: "c-1",
      kichBan: [
        traLoiTool("handoff_human", { reason: "khách đòi gặp người thật" }),
        traLoiChu("Sure, a colleague will get back to you shortly."),
      ],
    });
    inBang("c", cuaV3);
    assert.equal(kq.ketQua, KET_QUA.XONG);
    assert.equal(demFetch.n, 0, "0 lượt LỌT RA NGOÀI mock");

    assert.equal(
      guiNgam.pkTagByName,
      1,
      "tools.js:266 — bị mock bắt (nợ dài hạn)",
    );
    assert.equal(
      guiNgam.pkAddNote,
      1,
      "tools.js:271 — bị mock bắt (nợ dài hạn)",
    );
    assert.equal(cuaV3.gatThe, 1, "cửa v3 GÁNH thẻ bàn giao");
    assert.equal(cuaV3.ghiNote, 1, "cửa v3 GÁNH ghi chú bàn giao");
    assert.equal(cuaV3.guiTin, 1);

    const r = await sb.pool.query(
      "SELECT loai, ly_do FROM so_ai WHERE nguon_dong=$1 ORDER BY loai",
      [Number(tinId)],
    );
    const loai = r.rows.map((x) => x.loai);
    assert.ok(
      loai.includes("handoff"),
      `so_ai phải có 'handoff' (có: ${loai.join(",")})`,
    );
    const ht = await sb.pool.query(
      "SELECT trang_thai, chu_so_huu, ly_do_cuoi FROM hoi_thoai WHERE page_id=$1 AND psid=$2",
      [pageRowId, PSID],
    );
    assert.equal(ht.rows[0].trang_thai, "HANDOFF");
    assert.equal(ht.rows[0].chu_so_huu, "SALE");
  },
);

// ══ GUARD ĐÓNG → `chan_guard`, KHÔNG phải `loi` (N6) ══════════════════════════════
test(
  "N2 · cửa gửi ĐÓNG → ketQua='chan_guard' + so_ai 'spent_no_send'",
  boQua,
  async () => {
    const { kq, cuaV3, tinId } = await motLuot({
      noiDung: "what is the price of this watch model please",
      msgId: "g-1",
      kichBan: [traLoiChu("It is two hundred dirhams including delivery.")],
      moiTruong: { V3_PANCAKE_GUI: undefined }, // VẮNG BIẾN = ĐÓNG (fail-closed)
    });
    inBang("guard", cuaV3);
    assert.equal(
      kq.ketQua,
      "chan_guard",
      "phải là chan_guard, KHÔNG phải 'loi'",
    );
    assert.match(kq.lyDo, /V3_PANCAKE_GUI/);
    assert.equal(
      cuaV3.guiTin,
      0,
      "cửa đóng thì KHÔNG lượt gửi nào xuống pancake",
    );
    assert.equal(demFetch.n, 0);
    const r = await sb.pool.query(
      "SELECT loai, ly_do FROM so_ai WHERE nguon_dong=$1 AND loai='spent_no_send'",
      [Number(tinId)],
    );
    assert.equal(
      r.rowCount,
      1,
      "khoản chi của lượt bị chặn KHÔNG được tàng hình",
    );
    assert.match(r.rows[0].ly_do, /cua_dong/);
  },
);

// ══ CHỖ CẮM MODEL (DI) ════════════════════════════════════════════════════════════
test(
  "N3 · layModel mặc định trả ĐÚNG client của llm.js; team chưa cấu hình → maModel từ config",
  boQua,
  async () => {
    const { config } = await import("../src/config.js");
    const m = await layModel(sb.pool, { teamId }, { vaiTro: "chinh" });
    assert.equal(m.nguon, "config");
    assert.equal(
      m.maModel,
      config.modelCloser,
      "CẤM hằng bịa — phải là mã model của config thật",
    );
    assert.equal(
      m.client,
      clientMock,
      "client = đúng object `anthropic` của llm.js (đang bị mock)",
    );
    console.log(
      `   [DI] nguon=${m.nguon} maModel=${m.maModel} client===llm.anthropic: true`,
    );
  },
);

test(
  "N3b · thay layModel bằng mock → handler DÙNG mock, và ma_model đổi theo (2 giá trị khác nhau)",
  boQua,
  async () => {
    const goi = [];
    const giaLap = (ma) => async (pool, ctx, tuyChon) => {
      goi.push({ teamId: ctx.teamId, vaiTro: tuyChon.vaiTro, ma });
      return { client: clientMock, maModel: ma, nguon: "mock" };
    };
    const A = await motLuot({
      noiDung: "can you tell me more about the strap material",
      msgId: "m-A",
      kichBan: [traLoiChu("It is a soft silicone strap, very light.")],
      deps: { layModel: giaLap("mo-hinh-A") },
    });
    const B = await motLuot({
      noiDung: "and is it waterproof for swimming",
      msgId: "m-B",
      kichBan: [traLoiChu("Yes, it handles water without any problem.")],
      deps: { layModel: giaLap("mo-hinh-B") },
    });
    assert.equal(A.kq.ketQua, KET_QUA.XONG);
    assert.equal(B.kq.ketQua, KET_QUA.XONG);
    assert.equal(
      goi.length,
      2,
      "handler phải GỌI layModel được tiêm, không dùng bản mặc định",
    );
    assert.deepEqual(
      goi.map((g) => g.vaiTro),
      ["chinh", "chinh"],
    );
    assert.equal(
      String(goi[0].teamId),
      String(teamId),
      "layModel nhận đúng TEAM của tin",
    );
    const r = await sb.pool.query(
      "SELECT nguon_dong, ma_model FROM so_ai WHERE loai='reply' AND nguon_dong = ANY($1) ORDER BY nguon_dong",
      [[Number(A.tinId), Number(B.tinId)]],
    );
    const ma = r.rows.map((x) => x.ma_model);
    console.log(`   [DI] ma_model hai lượt: ${JSON.stringify(ma)}`);
    assert.deepEqual(
      ma,
      ["mo-hinh-A", "mo-hinh-B"],
      "đổi mock model thì ma_model đổi theo",
    );
  },
);

test(
  "N3c · team CÓ cấu hình model khác nhà → fail-CLOSED, không gọi bằng client sai nhà",
  boQua,
  async () => {
    const { LoiChuaCoLopModel } = await import("../src/chat/model.js");
    await sb.pool.query(
      `INSERT INTO cau_hinh_model (team_id, vai_tro, nha_cung_cap, ma_model)
     VALUES ($1,'du_phong','nha-la','model-la')`,
      [teamId],
    );
    await assert.rejects(
      () => layModel(sb.pool, { teamId }, { vaiTro: "du_phong" }),
      LoiChuaCoLopModel,
    );
    await sb.pool.query("DELETE FROM cau_hinh_model WHERE team_id=$1", [
      teamId,
    ]);
  },
);

// ══ SỔ AI ĐỦ LOẠI + autoCreateOrder ═══════════════════════════════════════════════
test(
  "N4 · so_ai đủ 5 loại của §11.2 sau các dân số trên (in bảng đếm)",
  boQua,
  async () => {
    const dem = await demSoAiTheoLoai(sb.pool, { teamId });
    console.log(`   [so_ai] bảng đếm theo loại: ${JSON.stringify(dem)}`);
    for (const loai of [
      "reply",
      "image",
      "order",
      "handoff",
      "spent_no_send",
    ]) {
      assert.ok(
        (dem[loai] || 0) >= 1,
        `thiếu loại '${loai}' — bảng: ${JSON.stringify(dem)}`,
      );
    }
    const nul = await sb.pool.query(
      "SELECT count(*)::int n FROM so_ai WHERE team_id=$1 AND (ma_model IS NULL OR ma_model='')",
      [teamId],
    );
    assert.equal(nul.rows[0].n, 0, "ma_model NOT NULL — không dòng nào rỗng");
  },
);

test(
  "N5 · autoCreateOrder GIỮ TẮT + không dòng don_hang nào sinh ra từ các lượt test",
  boQua,
  async () => {
    const { config } = await import("../src/config.js");
    assert.equal(config.autoCreateOrder, false);
    const r = await sb.pool.query("SELECT count(*)::int n FROM don_hang");
    console.log(
      `   [đơn] config.autoCreateOrder=${config.autoCreateOrder} · don_hang=${r.rows[0].n}`,
    );
    assert.equal(r.rows[0].n, 0);
  },
);

test(
  "N6 · neo idempotent so_ai: xử lý LẠI cùng một tin không đẻ dòng sổ thứ hai",
  boQua,
  async () => {
    const truoc = await sb.pool.query(
      "SELECT count(*)::int n FROM so_ai WHERE team_id=$1",
      [teamId],
    );
    const t = await docTinTheoId(sb.pool, null, teamId).catch(() => null);
    assert.equal(t, null); // docTinTheoId(null) không khớp dòng nào — canh chính cái thước
    const A = await motLuot({
      noiDung: "one more question about warranty",
      msgId: "idem-1",
      kichBan: [traLoiChu("We give a one year warranty on the device.")],
    });
    const giua = await sb.pool.query(
      "SELECT count(*)::int n FROM so_ai WHERE team_id=$1",
      [teamId],
    );
    assert.equal(giua.rows[0].n, truoc.rows[0].n + 1);
    // Chạy LẠI đúng tin đó (worker chết giữa chừng rồi thử lại).
    const tin = await docTinTheoId(sb.pool, A.tinId, teamId);
    moiDem();
    kichBanModel = [traLoiChu("We give a one year warranty on the device.")];
    process.env.V3_PANCAKE_GUI = "1";
    const roCu = process.env.PANCAKE_READONLY;
    delete process.env.PANCAKE_READONLY;
    try {
      await xuLyMotTin(sb.pool, tin, {
        layKb: () => KB,
        lichSu: [],
        depsPancake: {
          send: async () => ({ ok: true }),
          sendImage: async () => ({ ok: true }),
          addNote: async () => ({ ok: true }),
          tagByName: async () => ({ ok: true }),
        },
      });
    } finally {
      delete process.env.V3_PANCAKE_GUI;
      if (roCu !== undefined) process.env.PANCAKE_READONLY = roCu;
    }
    // ⚠️ ĐO ĐÚNG THỨ ĐANG HỎI: neo idempotent là (nguon_tep, nguon_dong) = (loại, id tin),
    // nên phép so phải là "SỐ DÒNG `reply` CỦA CHÍNH TIN NÀY", không phải tổng cả bảng.
    // Vòng 1 của bộ ca so tổng và ĐỎ với 11≠10 — nhưng dòng dôi ra KHÔNG phải bản sao:
    // đó là một `spent_no_send` MỚI, vì `guardOutbound` (M09) của bản cũ chặn tin lặp lại
    // y hệt tin AI vừa nói (`lastAiText` nay đã bằng chính câu đó). Tức là hệ hành xử
    // ĐÚNG, cái sai là cái thước. Giữ lại cả hai phép để không ai đọc nhầm lần nữa.
    const laiReply = await sb.pool.query(
      "SELECT count(*)::int n FROM so_ai WHERE loai='reply' AND nguon_dong=$1",
      [Number(A.tinId)],
    );
    const sau = await sb.pool.query(
      "SELECT count(*)::int n FROM so_ai WHERE team_id=$1",
      [teamId],
    );
    const theoLoai = await sb.pool.query(
      "SELECT loai, count(*)::int n FROM so_ai WHERE nguon_dong=$1 GROUP BY loai ORDER BY loai",
      [Number(A.tinId)],
    );
    console.log(
      `   [idempotent] so_ai trước=${truoc.rows[0].n} sau lượt 1=${giua.rows[0].n} sau lượt LẶP=${sau.rows[0].n}` +
        ` · của RIÊNG tin ${A.tinId}: ${JSON.stringify(Object.fromEntries(theoLoai.rows.map((x) => [x.loai, x.n])))}`,
    );
    assert.equal(
      laiReply.rows[0].n,
      1,
      "neo (loại, id tin) phải chặn dòng `reply` thứ hai cho CÙNG một tin",
    );
  },
);

test(
  "N7 · thiếu dòng hoi_thoai → LoiThieuHoiThoai (bộ NẠP phải tạo trước)",
  boQua,
  async () => {
    const { LoiThieuHoiThoai } = await import("../src/chat/handler-v3.js");
    const t = await xepTin(sb.pool, {
      teamId,
      pageId: PAGE,
      psid: "psid-chua-co",
      convId: "conv-x",
      custId: "k",
      msgId: "no-ht",
      noiDung: "hi",
    });
    const tin = await docTinTheoId(sb.pool, t.id, teamId);
    await assert.rejects(
      () => xuLyMotTin(sb.pool, tin, { layKb: () => KB, lichSu: [] }),
      LoiThieuHoiThoai,
    );
  },
);

if (!CO_MOCK_MODULE) {
  test("⚠️ BỘ CA BỊ BỎ QUA — thiếu cờ --experimental-test-module-mocks", () => {
    console.log(
      "   Chạy lại bằng: node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js",
    );
  });
}
