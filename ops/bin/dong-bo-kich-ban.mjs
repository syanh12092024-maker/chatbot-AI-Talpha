#!/usr/bin/env node
// ĐỒNG BỘ KỊCH BẢN v3 THEO BẢN BOT ĐANG CHẠY (CR-28-09b · MN5 bước C).
//
//   node --env-file=.env ops/bin/dong-bo-kich-ban.mjs          → CHẠY THỬ: liệt kê page mà kịch bản
//                                                              trên màn KHÁC kịch bản bot đang chạy
//   node --env-file=.env ops/bin/dong-bo-kich-ban.mjs --ghi    → mỗi page lệch: thêm MỘT bản mới
//                                                              = đúng bản bot đang chạy, thành LIVE
//
// VÌ SAO: «lưu là chạy» (MN6) đẩy TRỌN kịch bản trên màn sang bot. Màn mà hiện một bản khác bản
// bot đang chạy thì người sửa một ô rồi lưu là ghi đè mấy ô kia bằng chữ họ KHÔNG hề thấy bot
// đang nói. Đo prod 28/09: 0 page lệch thật (2 «lệch» chỉ là nửa chữ bị cắt — xem `venToan`).
//
// Chuẩn là BOT (`kb-overrides.json` → `config`) — đó là thứ khách đã nhận. Bản v3 cũ KHÔNG bị
// xoá: nó thành ARCHIVED, còn trong lịch sử để «Chạy lại bản này» nếu người muốn.
// Bản máy dựng bằng CHÍNH `dungBanChoMay` của bộ di trú (không gọi bộ dịch — không tốn model;
// bản máy chỉ được đọc khi bật `V3_RAP_PROMPT_BAT`, prod chưa bật).
// Không gọi sang bot: bot đã giữ đúng bản này.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { taoPool } from "../../db/ket-noi.js";
import { dungBanChoMay } from "../../db/di-tru/nguon.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GHI = process.argv.includes("--ghi");
const TRUONG = ["tone", "greeting", "salesPrompt", "fastLanePrice", "fastLaneShip", "fastLaneHowto", "fastLaneAuth", "fastLaneSize"];
// Nửa cặp ký tự Unicode bị cắt (đo 28/09: 2 câu chào bị cắt ở ký tự 200, giữa một chữ in đậm
// 𝐫) ⇒ thay bằng «�» như Postgres/trình duyệt vẫn làm. Không thay thì jsonb từ chối cả lượt, và
// phép so báo «lệch» hai chuỗi mà người đọc thấy giống hệt nhau.
const venToan = (s) => s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
const gon = (v) => venToan(String(v ?? "").trim());
const lamSach = (cfg = {}) => Object.fromEntries(TRUONG.map((t) => [t, gon(cfg[t])]));
const coNoiDung = (c) => TRUONG.some((t) => c[t]);

const ov = JSON.parse(fs.readFileSync(process.env.KB_OVERRIDES_FILE || path.join(GOC, "kb-overrides.json"), "utf8"));
const pool = taoPool();
let viec = 0;
try {
  const live = new Map((await pool.query(
    `SELECT k.*, p.page_id AS pid, p.ten AS ten_page FROM kich_ban k JOIN page p ON p.id = k.page_id
      WHERE k.trang_thai = 'LIVE'`,
  )).rows.map((r) => [r.pid, r]));
  const trang = new Map((await pool.query("SELECT id, team_id, page_id, ten FROM page")).rows.map((r) => [r.page_id, r]));
  const lech = [];
  for (const [pid, v] of Object.entries(ov)) {
    const bot = lamSach(v?.config);
    if (!coNoiDung(bot)) continue;                     // bot không có kịch bản riêng ⇒ không có gì để mất
    const l = live.get(pid);
    const khac = l ? TRUONG.filter((t) => bot[t] !== gon(l.noi_dung_nguoi?.[t])) : TRUONG.filter((t) => bot[t]);
    if (!khac.length) continue;
    if (!trang.has(pid)) { console.log(`  – ${pid}: bot có kịch bản nhưng v3 không có dòng page — bỏ qua`); continue; }
    lech.push({ pid, bot, l, khac, page: trang.get(pid) });
  }
  console.log(`Page bot có kịch bản: ${Object.values(ov).filter((v) => coNoiDung(lamSach(v?.config))).length} · lệch với màn: ${lech.length}`);
  for (const x of lech) console.log(`  ≠ ${x.pid} ${x.page.ten || ""} · ${x.l ? `v3 bản ${x.l.phien_ban}` : "v3 CHƯA có bản chạy"} · khác: ${x.khac.join(", ")}`);
  if (!GHI) { console.log("CHẠY THỬ — không ghi gì. Thêm --ghi để đồng bộ theo bản bot."); process.exit(0); }

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const x of lech) {
      const phienBan = (await c.query("SELECT COALESCE(max(phien_ban),0)+1 AS n FROM kich_ban WHERE page_id=$1", [x.page.id])).rows[0].n;
      if (x.l) await c.query("UPDATE kich_ban SET trang_thai='ARCHIVED' WHERE id=$1", [x.l.id]);
      const moi = (await c.query(
        `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may, nguoi_sua, ghi_chu, sua_luc)
         VALUES ($1,$2,$3,'LIVE',$4,$5,'may:dong-bo-kich-ban',$6, now()) RETURNING id`,
        [x.page.team_id, x.page.id, phienBan, JSON.stringify(x.bot), String(dungBanChoMay(x.bot) || ""),
          `đồng bộ theo bản bot đang chạy (CR-28-09b) — khác ở: ${x.khac.join(", ")}`],
      )).rows[0].id;
      await c.query(
        `INSERT INTO nhat_ky (team_id, tac_nhan, doi_tuong, doi_tuong_id, hanh_dong, truoc, sau)
         VALUES ($1,'may:dong-bo-kich-ban','kich_ban',$2,'dong_bo_kich_ban_theo_bot',$3,$4)`,
        [x.page.team_id, String(moi), JSON.stringify(x.l ? { phien_ban: x.l.phien_ban, id: String(x.l.id) } : null),
          JSON.stringify({ phien_ban: phienBan, page: x.pid, khac: x.khac })],
      );
      viec += 1;
      console.log(`  ✓ ${x.pid}: bản ${phienBan} = bản bot đang chạy, thành LIVE${x.l ? ` (bản ${x.l.phien_ban} → lưu trữ)` : ""}`);
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
  console.log(`XONG: ${viec} page.`);
} finally { await pool.end(); }
