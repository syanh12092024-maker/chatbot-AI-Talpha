// L2-M3 · NỐI ngân sách lượt + cờ page trọng điểm vào handler-v3.js (đo qua `xuLyMotTin`
// thật, DB sandbox thật) — bổ sung cho test/l2-m3-ngan-sach-luot.test.js (bộ ca ĐƠN VỊ
// của riêng ngan-sach-luot.js, không cần DB). Cùng khuôn test/l2-m2-handler.test.js.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

const PAGE = "940000000000001";

let sb, teamId;
let xuLyMotTin, KET_QUA, xepTin, docTinTheoId;

before(async () => {
  ({ xuLyMotTin, KET_QUA } = await import("../src/chat/handler-v3.js"));
  ({ xepTin, docTinTheoId } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("l2m3h");
  const t = await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'");
  teamId = t.rows[0].id;
});

after(async () => {
  if (sb) await sb.don();
});

/** Dựng một page + hội thoại RIÊNG cho một test (tránh test này ăn điểm lead của test
 *  khác qua cùng psid — mỗi test tự cô lập hội thoại của mình). */
async function taoHoiThoai(psid, { trongDiem = true } = {}) {
  const p = await sb.pool.query(
    "INSERT INTO page (team_id, page_id, ten, trong_diem) VALUES ($1,$2,'Ca L2-M3',$3) RETURNING id",
    [teamId, `${PAGE}-${psid}`, trongDiem],
  );
  await sb.pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,'QUALIFY','AI')`,
    [teamId, p.rows[0].id, psid],
  );
  return p.rows[0].id;
}

let msgSeq = 0;
/** Dựng + chạy ĐÚNG MỘT lượt qua `xuLyMotTin` thật, deps đều là spy/stub — cùng khuôn
 *  test/l2-m2-handler.test.js#motLuot. `kb` mặc định gắn trongDiem=true + nguon_thieu
 *  mẫu để đo phép ghi cờ vào so_ai (④.3 của phiếu). */
async function motLuot({ pageIdText, psid, noiDung, kb, deps = {} }) {
  msgSeq += 1;
  const t = await xepTin(sb.pool, {
    teamId,
    pageId: pageIdText,
    psid,
    convId: `conv-${psid}`,
    custId: `cust-${psid}`,
    msgId: `msg-l2m3-${msgSeq}`,
    noiDung,
  });
  const tin = await docTinTheoId(sb.pool, t.id, teamId);
  const guiTinCalls = [];
  const ghiNoteCalls = [];
  const demSpy = { chayCloser: 0 };
  const kbMacDinh = {
    config: {},
    products: [{ name: "SP test" }],
    trongDiem: true,
    nguon_thieu: ["ky_nang"],
  };
  const kq = await xuLyMotTin(sb.pool, tin, {
    layKb: () => kb || kbMacDinh,
    cua: {
      guiTin: async (_p, _c, a) => {
        guiTinCalls.push(a.text);
        return { ok: true, id: "cua-test" };
      },
      guiAnh: async () => ({ ok: true, id: "cua-test" }),
      ghiNote: async (_p, _c, a) => {
        ghiNoteCalls.push(a.message);
        return { ok: true };
      },
      gatThe: async () => ({ ok: true, tags: [] }),
    },
    layModel: async () => ({
      client: {},
      maModel: "stub-model",
      nguon: "config",
    }),
    phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
    lanNhanh: () => ({
      handled: false,
      reply: null,
      lane: "",
      reason: "stub escalate",
    }),
    chayCloser: async () => {
      demSpy.chayCloser++;
      return "stub AI reply";
    },
    kiemTinRa: () => ({ ok: true }),
    ...deps,
  });
  return { kq, guiTinCalls, ghiNoteCalls, demSpy };
}

test("hết ngân sách → dừng đúng khuôn cũ (handoff KHÔNG im, model KHÔNG gọi, so_ai ghi trong_diem + nguon_thieu)", async () => {
  const psid = "psid-het-ngansach";
  await taoHoiThoai(psid);
  const { kq, guiTinCalls, ghiNoteCalls, demSpy } = await motLuot({
    pageIdText: `${PAGE}-${psid}`,
    psid,
    noiDung: "tôi muốn mua thêm nữa",
    deps: {
      conNganSach: () => ({ ok: false, lyDo: "TEST hết ngân sách 6 lượt" }),
    },
  });
  assert.equal(kq.ketQua, KET_QUA.XONG);
  assert.match(kq.lyDo, /^ngan_sach_het:/);
  assert.equal(
    demSpy.chayCloser,
    0,
    "hết ngân sách thì KHÔNG được gọi model thật",
  );
  assert.equal(guiTinCalls.length, 0, "không được bịa câu trả lời gửi khách");
  assert.equal(
    ghiNoteCalls.length,
    1,
    "PHẢI bàn giao sale — không im lặng bỏ khách",
  );
  assert.match(ghiNoteCalls[0], /TEST hết ngân sách/);

  const r = await sb.pool.query(
    `SELECT ly_do, du_lieu, ma_model FROM so_ai WHERE team_id=$1 AND loai='handoff' ORDER BY id DESC LIMIT 1`,
    [teamId],
  );
  assert.match(r.rows[0].ly_do, /^ngan_sach_het:/);
  assert.equal(r.rows[0].ma_model, "khong-goi-model");
  assert.equal(
    r.rows[0].du_lieu.trong_diem,
    true,
    "cờ page trọng điểm phải đóng dấu vào so_ai (④.3 phiếu L2-M3)",
  );
  assert.deepEqual(r.rows[0].du_lieu.kb_nguon_thieu, ["ky_nang"]);
});

test("còn ngân sách → model ĐƯỢC gọi như thường, diem_lead/diem_nong lưu vào hoi_thoai", async () => {
  const psid = "psid-con-ngansach";
  const pageRowId = await taoHoiThoai(psid);
  const { kq, demSpy } = await motLuot({
    pageIdText: `${PAGE}-${psid}`,
    psid,
    noiDung: "magkano po ang presyo?",
  });
  assert.equal(kq.ketQua, KET_QUA.XONG);
  assert.equal(demSpy.chayCloser, 1, "còn ngân sách thì model PHẢI được gọi");
  const h = await sb.pool.query(
    "SELECT diem_nong, diem_lead FROM hoi_thoai WHERE team_id=$1 AND page_id=$2 AND psid=$3",
    [teamId, pageRowId, psid],
  );
  assert.equal(h.rowCount, 1);
  assert.ok(h.rows[0].diem_nong >= 1, "hỏi giá phải cộng điểm price=1");
  assert.ok(
    h.rows[0].diem_lead.signals.includes("price"),
    "diem_lead phải ghi đúng tín hiệu tìm thấy",
  );
});

test("điểm lead CỘNG DỒN qua nhiều lượt của CÙNG một hội thoại (không reset mỗi tin)", async () => {
  const psid = "psid-cong-don";
  const pageRowId = await taoHoiThoai(psid);
  await motLuot({
    pageIdText: `${PAGE}-${psid}`,
    psid,
    noiDung: "magkano po?",
  }); // +price
  await motLuot({
    pageIdText: `${PAGE}-${psid}`,
    psid,
    noiDung: "free shipping ba?",
  }); // +ship, GIỮ price

  const h = await sb.pool.query(
    "SELECT diem_nong, diem_lead FROM hoi_thoai WHERE team_id=$1 AND page_id=$2 AND psid=$3",
    [teamId, pageRowId, psid],
  );
  console.log(
    `[cộng dồn] diem_nong=${h.rows[0].diem_nong} · signals=${JSON.stringify(h.rows[0].diem_lead.signals)}`,
  );
  assert.ok(
    h.rows[0].diem_lead.signals.includes("price"),
    "phải GIỮ tín hiệu lượt 1",
  );
  assert.ok(
    h.rows[0].diem_lead.signals.includes("ship"),
    "phải CỘNG tín hiệu lượt 2",
  );
  assert.equal(
    h.rows[0].diem_nong,
    2,
    "price(1) + ship(1) = 2, không reset giữa hai lượt",
  );
});
