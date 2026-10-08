#!/usr/bin/env node
// ĐO NGÂN SÁCH LƯỢT — mô phỏng chấm điểm lead + ngân sách lượt model (M11 v3) trên MẪU HỘI THOẠI THẬT, có mô phỏng NHƯỜNG BOTCAKE.
//
// ═══ VÌ SAO CÓ FILE NÀY (phiếu RP2 ④5 · N8) ═══════════════════════════════════════════════════════════════════════════════════
// RP2 đụng tệp bộ não `src/lead-score.js` (`AM_THRESHOLD` 2 → 1) và đổi chỗ chấm điểm (handler chấm cả tin khách ĐÃ NHƯỜNG Botcake trên
// lịch sử — `src/chat/ngan-sach-luot.js#chamTheoLichSu`). Cả hai làm bot GỌI MODEL nhiều lượt hơn — tệp này đưa con số đó cho người
// quyết thấy, trước/sau, trên cùng một mẫu. Không có ngưỡng đạt.
//
// Công cụ gốc của review (a) RP2 (scratchpad, tạm theo phiên) chỉ đo NGƯỠNG; bản này thêm phần review vòng 2 đòi (R2-N5): tin page
// đến ≤ 8 s sau cụm khách coi là BOTCAKE (`src/queue/nap.js:258-266`: Botcake p50 5 s · tối đa 8 s) ⇒ bot NHƯỜNG cụm đó:
//   · «trước» (chấm cụm, L2-M3): cụm nhường KHÔNG được chấm, KHÔNG tốn lượt model;
//   · «sau»   (RP2): cụm nhường KHÔNG tốn lượt model, nhưng lượt bot kế tiếp chấm nó trên lịch sử (gọi ĐÚNG hàm handler gọi).
//
// ═══ THAM SỐ QUYẾT CON SỐ — in ở đầu báo cáo (luật 35 tho-thi-cong) ═══════════════════════════════════════════════════════════
//   · mẫu: `mau-duong-ban.json` (do `ops/bin/do-duong-ban.mjs --keo` kéo, ĐÃ che `<SĐT>`/`<TÊN>`, gitignore) — vắng ⇒ in «không có mẫu»;
//   · TRẦN TRÊN: mỗi cụm bot không nhường = 1 lượt model (lớp 0 đồng / Fast Lane / classify KHÔNG mô phỏng);
//   · che danh tính người gửi page ⇒ «Botcake» = tin page ≤ 8 s sau cụm — XẤP XỈ (sale trả lời ≤ 8 s cũng bị tính là Botcake);
//   · `<SĐT>` → «0551234567», `<TÊN>` → «Maria Santos» (để tín hiệu SĐT/tên còn bắt được sau khi che) — xấp xỉ;
//   · lượt đã dùng = lượt model trong 24 giờ trước cụm (theo giờ tin); hết ngân sách ⇒ BÀN GIAO, hội thoại dừng ở đó.
//
//   node ops/bin/do-ngan-sach-luot.mjs                 # bảng
//   node ops/bin/do-ngan-sach-luot.mjs --json [mẫu]    # một dòng JSON (bộ ca đọc)
//   MAU_DUONG_BAN=/đường/mẫu.json node ops/bin/do-ngan-sach-luot.mjs
//
// CHỈ ĐỌC: không mạng, không CSDL, không ghi tệp.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const thamSo = process.argv.slice(2);
const JSON_RA = thamSo.includes("--json");
const TEP_MAU = thamSo.find((a) => !a.startsWith("--")) || process.env.MAU_DUONG_BAN || path.join(GOC, "mau-duong-ban.json");
const BOTCAKE_MS = 8000;
const PAGE = "PAGE";

const { scoreTurn, turnBudget, AM_THRESHOLD, OBJECTION_SIGNALS, OBJECTION_BONUS_TURNS, HARD_MAX_TURNS } = await import(`${GOC}/src/lead-score.js`);
const { chamTheoLichSu } = await import(`${GOC}/src/chat/ngan-sach-luot.js`);
const { messageTime } = await import(`${GOC}/src/chat/history.js`);
const { CUA_SO_LUOT_MS } = await import(`${GOC}/src/chat/trang-thai.js`);

if (!fs.existsSync(TEP_MAU)) {
  if (JSON_RA) console.log(JSON.stringify({ coMau: false, tep: TEP_MAU }));
  else console.log(`không có mẫu (${TEP_MAU}) — kéo bằng \`node --env-file=.env ops/bin/do-duong-ban.mjs --keo\` rồi chạy lại. Không đo.`);
  process.exit(0);
}
const mau = JSON.parse(fs.readFileSync(TEP_MAU, "utf8"));
const dsHt = Array.isArray(mau.hoiThoai) ? mau.hoiThoai : [];

/** `turnBudget` với ngưỡng ẤM là THAM SỐ (để so 2 với 1 trong một lượt chạy — `lead-score.js` không nhận ngưỡng làm tham số, và RP2
 *  chỉ được đổi hằng). Lưới chống trôi: MỌI hồ sơ điểm của MỌI cấu hình đều so `nganSach(lead, AM_THRESHOLD)` với `turnBudget(lead)`
 *  thật (cả bậc 3/6/10/12 lẫn phản đối) ⇒ `turnBudget` đổi bậc nào thì `kiemLech` > 0 (/code-review RP2 #9). */
function nganSach(lead, nguong) {
  const sig = new Set(lead.signals || []); const diem = Number(lead.score || 0);
  let base;
  if (sig.has("phone") && sig.has("address")) base = 12;
  else if (diem >= 6) base = 10; else if (diem >= 3) base = 6; else if (diem >= nguong) base = 3; else base = 1;
  const bonus = OBJECTION_SIGNALS.some((k) => sig.has(k)) ? OBJECTION_BONUS_TURNS : 0;
  return { max: Math.min(HARD_MAX_TURNS, base + bonus), base };
}
let kiemLech = 0;

const bo = (t) => String(t || "").replace(/<SĐT>/g, "0551234567").replace(/<TÊN>/g, "Maria Santos");
const sach = (t) => bo(t).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();   // cùng phép bóc thẻ của nap.js#gomCumTinKhach

/** Một hội thoại mẫu → tin dạng Pancake + danh sách CỤM khách (khách nhắn liền giữa hai tin page — như `gomCumTinKhach`). */
function dungHoiThoai(ht) {
  const tin = (ht.tin || []).map((m, i) => ({
    id: `${ht.conv}:${i}`, from: { id: m.ai === "page" ? PAGE : "KH" }, message: bo(m.t), inserted_at: m.luc,
  }));
  const cum = [];
  let cur = null;
  for (const [i, m] of tin.entries()) {
    if (m.from.id === PAGE) {
      if (cur) { cur.tinPageKe = m; cum.push(cur); cur = null; }
      continue;
    }
    if (!cur) cur = { chiSo: [] };
    cur.chiSo.push(i);
  }
  if (cur) cum.push(cur);
  for (const c of cum) {
    c.text = c.chiSo.map((i) => sach(tin[i].message)).filter(Boolean).join("\n");
    c.cuoi = tin[c.chiSo.at(-1)];
    c.luc = messageTime(c.cuoi);
    c.botcake = !!c.tinPageKe && messageTime(c.tinPageKe) - c.luc <= BOTCAKE_MS && messageTime(c.tinPageKe) >= c.luc;
  }
  return { tin, cum: cum.filter((c) => c.text) };
}
const HT = dsHt.map(dungHoiThoai);

/**
 * Một cấu hình: `nguong` (ngưỡng ẤM) · `cham` ('cum' = chỉ cụm của lượt · 'lichSu' = RP2) · `nhuong` (mô phỏng Botcake).
 * @returns {{luotModel:number, banGiao:number, htCoLuot:number, cumNhuong:number, satDon:number}}
 */
function chay({ nguong, cham, nhuong }) {
  let luotModel = 0, banGiao = 0, htCoLuot = 0, cumNhuong = 0, satDon = 0;
  for (const { tin, cum } of HT) {
    let lead = {}; const mocModel = []; let co = false;
    for (const c of cum) {
      if (nhuong && c.botcake) { cumNhuong += 1; continue; }        // bot NHƯỜNG: 0 lượt model; «trước» cũng không chấm
      let kq;
      if (cham === "lichSu") {
        const lichSu = tin.slice(0, tin.indexOf(c.cuoi) + 1);
        kq = chamTheoLichSu(c.text, lead, { lichSu, tin: { page_id: PAGE, msg_id: c.cuoi.id, noi_dung: c.text } });
        lead = kq.lead;
      } else {
        lead = scoreTurn(c.text, lead);
        kq = { lead, budget: turnBudget(lead) };
      }
      if (nganSach(lead, AM_THRESHOLD).max !== turnBudget(lead).max || nganSach(lead, AM_THRESHOLD).max !== kq.budget.max) kiemLech += 1;
      const ns = nganSach(lead, nguong);
      const daDung = mocModel.filter((t) => t > c.luc - CUA_SO_LUOT_MS).length;
      if (daDung < ns.max) { mocModel.push(c.luc); luotModel += 1; co = true; } else { banGiao += 1; break; }
    }
    if (co) htCoLuot += 1;
    if (new Set(lead.signals || []).has("phone") && new Set(lead.signals || []).has("address")) satDon += 1;
  }
  return { luotModel, banGiao, htCoLuot, cumNhuong, satDon };
}

const CAU_HINH = [
  { ten: "truoc", nhan: "TRƯỚC — ngưỡng 2 · chấm cụm (L2-M3)", nguong: 2, cham: "cum", nhuong: true },
  { ten: "sau", nhan: "SAU — ngưỡng 1 · chấm lịch sử (RP2)", nguong: 1, cham: "lichSu", nhuong: true },
  { ten: "nguong1_chamCum", nhan: "đối chứng — ngưỡng 1 · chấm cụm", nguong: 1, cham: "cum", nhuong: true },
  { ten: "truoc_khongNhuong", nhan: "trước, KHÔNG mô phỏng Botcake", nguong: 2, cham: "cum", nhuong: false },
  { ten: "sau_khongNhuong", nhan: "sau, KHÔNG mô phỏng Botcake", nguong: 1, cham: "lichSu", nhuong: false },
];
const ketQua = Object.fromEntries(CAU_HINH.map((c) => [c.ten, chay(c)]));
const tongCum = HT.reduce((n, h) => n + h.cum.length, 0);
const cumBotcake = HT.reduce((n, h) => n + h.cum.filter((c) => c.botcake).length, 0);
const daiThamSo = { tep: path.relative(GOC, TEP_MAU) || TEP_MAU, taoLuc: mau.taoLuc || "?", hoiThoai: HT.length, cum: tongCum, cumBotcake,
  botcakeMs: BOTCAKE_MS, amThresholdTrongMa: AM_THRESHOLD, kiemLech };

if (JSON_RA) {
  console.log(JSON.stringify({ coMau: true, thamSo: daiThamSo, ...ketQua }));
} else {
  const pct = (a, b) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 1000) / 10}%` : "—");
  console.log(`ĐO NGÂN SÁCH LƯỢT · máy dev · mẫu ${daiThamSo.tep} (kéo ${daiThamSo.taoLuc}) · ${HT.length} hội thoại · ${tongCum} cụm khách`);
  console.log(`  tham số: TRẦN TRÊN (mỗi cụm không nhường = 1 lượt model; lớp 0 đồng/Fast Lane không mô phỏng) · Botcake = tin page ≤ ${BOTCAKE_MS / 1000} s sau cụm`);
  console.log(`           (XẤP XỈ — mẫu che danh tính người gửi page): ${cumBotcake}/${tongCum} cụm · <SĐT>/<TÊN> thay bằng số/tên giả · AM_THRESHOLD trong mã = ${AM_THRESHOLD}`);
  console.log(`  kiểm lệch nganSach(·, ${AM_THRESHOLD}) với turnBudget() thật trên mọi hồ sơ điểm của mọi cấu hình: ${kiemLech} (khác 0 ⇒ số dưới SAI)`);
  console.log("");
  console.log(`  ${"cấu hình".padEnd(44)} ${"lượt model".padStart(11)} ${"bàn giao hết NS".padStart(16)} ${"HT có lượt".padStart(11)} ${"cụm nhường".padStart(11)} ${"HT sát đơn".padStart(11)}`);
  for (const c of CAU_HINH) {
    const r = ketQua[c.ten];
    console.log(`  ${c.nhan.padEnd(44)} ${String(r.luotModel).padStart(11)} ${String(r.banGiao).padStart(16)} ${String(r.htCoLuot).padStart(11)} ${String(r.cumNhuong).padStart(11)} ${String(r.satDon).padStart(11)}`);
  }
  const t = ketQua.truoc, s = ketQua.sau;
  console.log("");
  console.log(`  TRƯỚC → SAU (có mô phỏng Botcake): lượt model ${t.luotModel} → ${s.luotModel} (${pct(s.luotModel, t.luotModel)}) · bàn giao vì hết ngân sách ${t.banGiao} → ${s.banGiao} (${pct(s.banGiao, t.banGiao)})`);
}
