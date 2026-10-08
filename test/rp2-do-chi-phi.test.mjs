// RP2 ④5 — công cụ đo chi phí `ops/bin/do-ngan-sach-luot.mjs` (N8 — đụng bộ não `lead-score.js`). Mẫu thật `mau-duong-ban.json` bị
// gitignore nên ca dựng MẪU NHỎ trong thư mục tạm, đáp án tính tay theo luật M11: chạy công cụ như người vận hành chạy (tiến trình
// riêng, `--json`) ⇒ hàng «trước» (ngưỡng 2 · chấm cụm) và «sau» (ngưỡng 1 · chấm lịch sử — hàm THẬT của handler) đúng số; vắng mẫu ⇒
// «không có mẫu», rc=0. Số trên mẫu 719 hội thoại thật: cổng rp2.sh ⑤ in ra (không có ngưỡng đạt).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONG_CU = path.join(GOC, "ops/bin/do-ngan-sach-luot.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "rp2d-"));
const t0 = Date.parse("2026-09-13T03:00:00Z");
const luc = (giay) => new Date(t0 + giay * 1000).toISOString().replace("Z", "000");
const k = (giay, t) => ({ ai: "khach", t, dai: t.length, anh: false, luc: luc(giay) });
const p = (giay, t) => ({ ai: "page", t, dai: t.length, anh: false, luc: luc(giay) });
const chay = (...a) => spawnSync(process.execPath, [CONG_CU, ...a], { encoding: "utf8", env: { ...process.env, MAU_DUONG_BAN: "" } });

test("D1 · mẫu nhỏ: câu giá Botcake trả lời ≤ 8 s ⇒ TRƯỚC 6 lượt model / 2 bàn giao · SAU 7 / 1 · không mô phỏng Botcake 6/2 → 8/1 · kiểm lệch 0 (hội thoại 3 đi qua NÓNG · ĐANG CHỐT · SÁT ĐƠN · phản đối)", () => {
  const tep = path.join(TMP, "mau.json");
  fs.writeFileSync(tep, JSON.stringify({ taoLuc: "ca-rp2", pages: [], hoiThoai: [
    { page: "P1", conv: "c1", tin: [k(0, "how much po?"), p(3, "99 SAR po"), k(60, "what is it for?"), p(120, "For pain po"), k(200, "ok and for my mother?"), p(300, "Sige po")] },
    { page: "P1", conv: "c2", tin: [k(0, "hi"), p(60, "Hello po"), k(120, "ok"), p(200, "Sige")] },
    // đi qua mọi bậc của turnBudget ⇒ lưới `kiemLech` của công cụ (nganSach chép bậc) đỏ khi turnBudget đổi bất kỳ bậc nào
    { page: "P1", conv: "c3", tin: [k(0, "I'll take it"), p(60, "Sige po"), k(120, "how much? Riyadh street 5"), p(180, "99 SAR po"),
      k(240, "0551234567 Maria Santos"), p(300, "Salamat po"), k(360, "mahal naman"), p(420, "COD po")] },
  ] }));
  const r = chay("--json", tep);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout.trim().split("\n").at(-1));
  assert.equal(j.coMau, true);
  assert.deepEqual([j.thamSo.hoiThoai, j.thamSo.cum, j.thamSo.cumBotcake, j.thamSo.kiemLech], [3, 9, 1, 0]);
  assert.deepEqual([j.truoc.luotModel, j.truoc.banGiao, j.truoc.cumNhuong], [6, 2, 1], `trước: ${JSON.stringify(j.truoc)}`);
  assert.deepEqual([j.sau.luotModel, j.sau.banGiao, j.sau.cumNhuong], [7, 1, 1], `sau: ${JSON.stringify(j.sau)}`);
  assert.deepEqual([j.nguong1_chamCum.luotModel, j.nguong1_chamCum.banGiao], [6, 2], "ngưỡng 1 đơn thuần không cứu được page có Botcake");
  assert.deepEqual([j.truoc_khongNhuong.luotModel, j.truoc_khongNhuong.banGiao], [6, 2]);
  assert.deepEqual([j.sau_khongNhuong.luotModel, j.sau_khongNhuong.banGiao], [8, 1]);
});

test("D2 · vắng mẫu ⇒ in «không có mẫu», rc=0 (không đo, không ném)", () => {
  const r = chay(path.join(TMP, "khong-co.json"));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /không có mẫu/);
  fs.rmSync(TMP, { recursive: true, force: true });
});
