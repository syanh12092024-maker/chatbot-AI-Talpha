// GL8 ④4 — LƯỚI ở ba cửa ghi jsonb: gọi THẲNG cửa ghi với chuỗi mang nửa cặp thay thế lẻ ⇒ ghi được, đọc lại không còn nửa cặp.
//   · `so_ai.du_lieu`               — `src/chat/so-ai.js#ghiSoAi`
//   · `hoi_thoai.ho_so|diem_lead`   — `src/chat/kho.js#suaHoiThoai` (cột COT_JSONB)
//   · `hang_cho_tao_don.du_lieu_don|cua_kiem` — `src/orders/hang-cho.js#vaoHangCho`
// Postgres HỘP CÁT riêng (`aicloser_v3_test_gl8l_p<pid>`, tự dựng tự dọn). Ca này đo LƯỚI, không đo chỗ cắt: nửa cặp đưa vào thẳng
// (dữ liệu khách · lỗi ném ra) — gỡ lưới mà giữ hàm cắt thì ca này phải ĐỎ.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ghiSoAi } from "../src/chat/so-ai.js";
import { suaHoiThoai } from "../src/chat/kho.js";
import { vaoHangCho } from "../src/orders/hang-cho.js";
import { ctxHeThong } from "../src/db/index.js";

let sb, teamId;
before(async () => {
  sb = await dungSandbox("gl8l");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  console.log(`   [gl8l] hộp cát ${sb.ten} · tệp đo ${new URL("../src/chat/so-ai.js", import.meta.url).pathname}`);
});
after(async () => { if (sb) await sb.don(); });

const khongNuaCap = (v) => {
  if (typeof v === "string") return v.isWellFormed();
  if (Array.isArray(v)) return v.every(khongNuaCap);
  if (v && typeof v === "object") return Object.values(v).every(khongNuaCap);
  return true;
};
async function hoiThoaiMoi(ten) {
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'GL8') RETURNING id", [teamId, `gl8l-${ten}`])).rows[0].id;
  return (await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,'KH','QUALIFY','AI') RETURNING id", [teamId, p])).rows[0].id;
}

test("GL8 L4a · ghiSoAi với du_lieu mang nửa cặp (giá trị · mảng · lồng) ⇒ ghi được, đọc lại lành, chữ còn lại giữ nguyên", async () => {
  const r = await ghiSoAi(sb.pool, {
    teamId, tinId: 880001, loai: "reply", maModel: "stub", pageId: "gl8l", psid: "KH", lyDo: "cột text \ud83d",
    duLieu: { text: "Yes po! \ud83d", ds: ["\udc00ok", "📦 lành"], lo: { sau: "x\ud83d" }, so: 3 },
  });
  assert.equal(r.ghi, true, "không ghi được dòng so_ai");
  const { du_lieu, ly_do } = (await sb.pool.query("SELECT du_lieu, ly_do FROM so_ai WHERE id=$1", [r.id])).rows[0];
  assert.ok(khongNuaCap(du_lieu));
  assert.deepEqual(du_lieu, { text: "Yes po! ", ds: ["ok", "📦 lành"], lo: { sau: "x" }, so: 3 });
  // Lời khai ở handler-v3 (`so_ai.ly_do` là cột TEXT — pg tự thay nửa cặp bằng U+FFFD, không vỡ) phải có phép đo đi kèm (bẫy 3).
  assert.equal(ly_do, "cột text �");
});

test("GL8 L4b · suaHoiThoai ghi ho_so + diem_lead mang nửa cặp ⇒ ghi được, đọc lại lành", async () => {
  const id = await hoiThoaiMoi("kho");
  const dong = await suaHoiThoai(sb.pool, {
    teamId, id,
    giaTri: {
      ho_so: { name: "Annabelle \ud83d", address: "Dubai Marina\udc00 tower 2", phone: "" },
      diem_lead: { score: 2, signals: ["price", "x\ud83d"] },
      chu_so_huu: "AI",
    },
  });
  assert.ok(dong, "suaHoiThoai trả null — không ghi được");
  const ht = (await sb.pool.query("SELECT ho_so, diem_lead FROM hoi_thoai WHERE id=$1", [id])).rows[0];
  assert.ok(khongNuaCap(ht.ho_so) && khongNuaCap(ht.diem_lead));
  assert.deepEqual([ht.ho_so.name, ht.ho_so.address, ht.diem_lead.signals], ["Annabelle ", "Dubai Marina tower 2", ["price", "x"]]);
});

test("GL8 L4c · vaoHangCho: hồ sơ khách + lỗi nguồn (e) mang nửa cặp ⇒ dòng hang_cho_tao_don VẪN vào, du_lieu_don + cua_kiem lành", async () => {
  const id = await hoiThoaiMoi("hang-cho");
  const kq = await vaoHangCho(sb.pool, ctxHeThong(), {
    hoiThoaiId: id, teamId, tinId: 880002,
    hoSo: { name: "Maria \ud83d", address: "Al Barsha\udc00 villa 9", phone: "", qty: 1 },
  }, { kiemTrung: async () => { throw new Error("tra trùng hỏng giữa chừng \ud83d"); } });
  assert.ok(kq?.id && kq.daCo === false, `không vào hàng chờ: ${JSON.stringify(kq)}`);
  const hc = (await sb.pool.query("SELECT du_lieu_don, cua_kiem FROM hang_cho_tao_don WHERE id=$1", [kq.id])).rows[0];
  assert.ok(khongNuaCap(hc.du_lieu_don) && khongNuaCap(hc.cua_kiem));
  assert.deepEqual([hc.du_lieu_don.ten, hc.du_lieu_don.dia_chi], ["Maria ", "Al Barsha villa 9"]);
  const e = hc.cua_kiem.cong["3_chong_trung"].nguon.e_kiem_trung;
  assert.equal(e.ket, "unknown");
  assert.match(e.chi_tiet, /tra trùng hỏng giữa chừng/);
});
