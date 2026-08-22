// L2-M2 · NỐI vào handler-v3.js — đo đúng đề bài ④#1/#3/#4 ở tầng NGUYÊN LƯỢT
// (`xuLyMotTin` thật, DB sandbox thật) — bổ sung cho test/l2-m2-lop-tu-khoa.test.js
// (bộ ca ĐƠN VỊ của riêng hàm `lopTuKhoa`, không cần DB).
//
// KHÔNG cần `--experimental-test-module-mocks`: mọi phụ thuộc bộ não (layModel/
// phanLoai/lanNhanh/chayCloser/cua.*) đã là tham số `deps` sẵn có của `xuLyMotTin`
// (phiếu L2-M1) — tiêm spy thẳng qua đó, không cần mock.module ở tầng module. Cửa v3
// (Messenger) cũng KHÔNG được gọi thật — `deps.cua.guiTin` là spy, không chạm mạng.
//
// ⚠️ THUẬT NGỮ (ĐÃ QUYẾT, ghi rõ để người sau khỏi đoán lại — luật 11 skill
// tho-thi-cong): đề bài ④#1 viết "model 0 lượt (spy layModel=0)". Đo lại kiến trúc
// handler-v3.js (bước "── 2 · KB + MODEL") thì `d.layModel(...)` — tra cứu CẤU HÌNH
// model (SELECT cau_hinh_model) — chạy KHÔNG ĐIỀU KIỆN cho MỌI tin, TRƯỚC cả bước 4
// (kb.noData) lẫn bước 4b (lớp từ khoá) — đây là kiến trúc CÓ SẴN của L2-M1, ngoài
// phạm vi phiếu này. Nên "layModel=0" không thể là nghĩa đen (kiểm bằng test dưới:
// nó LUÔN =1). Tín hiệu ĐÚNG cho "0 token / không gọi model" là hai thứ ĐÃ CÓ sẵn
// trong chính handler: `dem.goiModel` (bộ đếm riêng, chỉ += 1 ở bước 7 runCloser) và
// `deps.chayCloser` (lượt gọi LLM THẬT) — cả hai được spy dưới đây thay cho literal
// "layModel".
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "920000000000009";
const PSID = "psid-l2m2";
const CONV = "conv-l2m2";
const CUST = "cust-l2m2";

let sb, teamId;
let xuLyMotTin, KET_QUA, xepTin, docTinTheoId;

before(async () => {
  ({ xuLyMotTin, KET_QUA } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));

  sb = await dungSandbox("l2m2");
  const t = await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'");
  teamId = t.rows[0].id;
  const p = await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Ca L2-M2') RETURNING id",
    [teamId, PAGE],
  );
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,$3,'QUALIFY','AI')`,
    [teamId, p.rows[0].id, PSID],
  );
});

after(async () => {
  if (sb) await sb.don();
});

let msgSeq = 0;
/** Dựng + chạy ĐÚNG MỘT lượt qua `xuLyMotTin` thật, deps đều là spy/stub. */
async function motLuot({ noiDung, kb, deps = {} }) {
  msgSeq += 1;
  const t = await xepTin(sb.pool, {
    teamId,
    pageId: PAGE,
    psid: PSID,
    convId: CONV,
    custId: CUST,
    msgId: `msg-l2m2-${msgSeq}`,
    noiDung,
  });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  const guiTinCalls = [];
  const demSpy = { layModel: 0, phanLoai: 0, lanNhanh: 0, chayCloser: 0 };
  const kq = await xuLyMotTin(sb.pool, tin, {
    layKb: () => kb,
    cua: {
      guiTin: async (_pool, _ctx, a) => {
        guiTinCalls.push(a.text);
        return { ok: true, id: "cua-test" };
      },
      guiAnh: async () => ({ ok: true, id: "cua-test" }),
      ghiNote: async () => ({ ok: true }),
      gatThe: async () => ({ ok: true, tags: [] }),
    },
    layModel: async () => {
      demSpy.layModel++;
      return { client: {}, maModel: "stub-model", nguon: "config" };
    },
    phanLoai: async () => {
      demSpy.phanLoai++;
      return { intent: "other", is_spam_conf: 0 };
    },
    lanNhanh: () => {
      demSpy.lanNhanh++;
      return { handled: false, reply: null, lane: "", reason: "stub escalate" };
    },
    chayCloser: async () => {
      demSpy.chayCloser++;
      return "stub AI reply";
    },
    kiemTinRa: () => ({ ok: true }),
    ...deps,
  });
  return { kq, guiTinCalls, demSpy, tinId: t.id };
}

test("khớp thật/giả — trả lời 0 token, KHÔNG gọi fastLane/classify/model, so_ai lane=tu_khoa_v3", async () => {
  const kb = {
    config: { fastLaneAuth: "Yes po, 100% original with warranty card. 😊" },
  };
  const { kq, guiTinCalls, demSpy } = await motLuot({
    noiDung: "is this original?",
    kb,
  });
  assert.equal(kq.ketQua, KET_QUA.XONG);
  assert.equal(kq.lyDo, "tu_khoa_v3:that_gia");
  assert.equal(kq.dem.goiModel, 0, "handler không được đếm lượt gọi model nào");
  assert.equal(
    demSpy.chayCloser,
    0,
    "chayCloser (lượt LLM THẬT) không được gọi",
  );
  assert.equal(
    demSpy.phanLoai,
    0,
    "classify không được gọi — lớp từ khoá DỪNG trước nó",
  );
  assert.equal(
    demSpy.lanNhanh,
    0,
    "fastLane không được gọi — lớp từ khoá đứng TRƯỚC",
  );
  assert.deepEqual(guiTinCalls, [
    "Yes po, 100% original with warranty card. 😊",
  ]);

  const r = await sb.pool.query(
    `SELECT lane, ma_model, ly_do FROM so_ai WHERE team_id=$1 AND loai='reply' ORDER BY id DESC LIMIT 1`,
    [teamId],
  );
  assert.equal(r.rows[0].lane, "tu_khoa_v3");
  assert.equal(r.rows[0].ma_model, "khong-goi-model");
});

test("khớp hỏi size — trả lời 0 token từ KB page, so_ai lane=tu_khoa_v3", async () => {
  const kb = {
    config: { fastLaneSize: "📏 S · M · L · XL — xem bảng đính kèm." },
  };
  const { kq, guiTinCalls, demSpy } = await motLuot({
    noiDung: "size chart please",
    kb,
  });
  assert.equal(kq.ketQua, KET_QUA.XONG);
  assert.equal(kq.lyDo, "tu_khoa_v3:hoi_size");
  assert.equal(demSpy.chayCloser, 0);
  assert.equal(demSpy.lanNhanh, 0);
  assert.deepEqual(guiTinCalls, ["📏 S · M · L · XL — xem bảng đính kèm."]);
});

test("vá paano — bắt biến thể tách chữ, trả lời 0 token", async () => {
  const kb = { config: { fastLaneHowto: "Send Name+Number+Address. COD po." } };
  const { kq, guiTinCalls, demSpy } = await motLuot({
    noiDung: "paano mag order",
    kb,
  });
  assert.equal(kq.ketQua, KET_QUA.XONG);
  assert.equal(kq.lyDo, "tu_khoa_v3:paano_gap");
  assert.equal(demSpy.chayCloser, 0);
  assert.deepEqual(guiTinCalls, ["Send Name+Number+Address. COD po."]);
});

test("NHƯỜNG khi thiếu KB size — lớp từ khoá KHÔNG bịa, tin ĐI TIẾP tới model (đề bài ④#3)", async () => {
  const kb = { config: {} }; // trang CHƯA khai fastLaneSize
  const { kq, guiTinCalls, demSpy } = await motLuot({
    noiDung: "what size do you have?",
    kb,
  });
  // ⚠️ NHƯỜNG ≠ im lặng: lớp từ khoá không tự đáp, nhưng lượt vẫn ĐI TIẾP hết chuỗi
  // fastLane(stub)→classify(stub)→closer(stub) rồi GỬI đúng câu closer trả về — đây
  // mới là bằng chứng "không cướp diễn đàn", không phải guiTinCalls rỗng.
  assert.equal(
    demSpy.lanNhanh,
    1,
    "phải rơi xuống fastLane vì lớp từ khoá đã NHƯỜNG",
  );
  assert.equal(demSpy.phanLoai, 1, "rồi tới classify (stub cho đi tiếp)");
  assert.equal(
    demSpy.chayCloser,
    1,
    "model ĐƯỢC gọi — đúng nghĩa 'spy=1' của đề bài ④#3 (xem giải thích thuật ngữ đầu file)",
  );
  assert.equal(kq.dem.goiModel, 1);
  assert.deepEqual(
    guiTinCalls,
    ["stub AI reply"],
    "câu closer(stub) trả về phải được GỬI — chứng minh lớp từ khoá không nuốt lượt",
  );

  const r = await sb.pool.query(
    `SELECT lane FROM so_ai WHERE team_id=$1 AND loai='reply' ORDER BY id DESC LIMIT 1`,
    [teamId],
  );
  assert.equal(
    r.rows[0].lane,
    "AI",
    "so_ai phải ghi lane=AI, KHÔNG phải tu_khoa_v3",
  );
});

test("không cướp diễn đàn (ở tầng handler) — câu ngoài 2 luật vẫn đi fastLane như trước, dù KB đủ dữ liệu", async () => {
  const kb = {
    config: {
      fastLaneAuth: "Yes po, original.",
      fastLaneSize: "S/M/L/XL",
      fastLaneHowto: "Send info, COD po.",
    },
  };
  const { guiTinCalls, demSpy } = await motLuot({
    noiDung: "magkano po ang presyo?",
    kb,
  });
  assert.equal(
    demSpy.lanNhanh,
    1,
    "câu hỏi giá không thuộc lớp từ khoá — phải tới fastLane",
  );
  assert.deepEqual(guiTinCalls, ["stub AI reply"]);
});

test("M09 (outbound-guard) KHÔNG bị miễn kiểm cho câu trả lời của lớp từ khoá", async () => {
  // Câu lọt tiếng Việt — chắc chắn bị `guardOutbound` chặn (rule VIETNAMESE), đo độc
  // lập bằng chính guardOutbound thật trước khi tin vào kết quả tích hợp dưới đây.
  const kb = {
    config: {
      fastLaneAuth: "Vâng, sản phẩm này là hàng thật 100% chính hãng.",
    },
  };
  const { kq, guiTinCalls, demSpy } = await motLuot({
    noiDung: "is this original?",
    kb,
    deps: { kiemTinRa: undefined }, // undefined ⇒ handler tự rơi về guardOutbound THẬT
  });
  assert.equal(guiTinCalls.length, 0, "guard chặn thì KHÔNG được gửi");
  assert.equal(
    demSpy.chayCloser,
    0,
    "guard chặn không có nghĩa là leo lên AI thử lại",
  );
  assert.equal(kq.lyDo, "guard_noi_dung:VIETNAMESE");

  const r = await sb.pool.query(
    `SELECT lane, ly_do FROM so_ai WHERE team_id=$1 AND loai='spent_no_send' ORDER BY id DESC LIMIT 1`,
    [teamId],
  );
  assert.equal(r.rows[0].lane, "tu_khoa_v3");
  assert.match(r.rows[0].ly_do, /guard_noi_dung:VIETNAMESE/);
});
