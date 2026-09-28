#!/usr/bin/env node
// NẠP MỘT LƯỢT ba khối dùng chung (Chính sách · FAQ · Phản đối) từ Google Sheet → CSDL v3 → bot
// (CR-28-09b · MN7). Chạy TRƯỚC khi bật `V3_SHEET_CHI_DANH_BA=1`, để lượt tắt Sheet không đổi chữ nào.
//
//   node --env-file=.env ops/bin/nap-khoi-chung.mjs          → CHẠY THỬ: đọc Sheet, so với đoạn chữ bot đang ghép
//   V3_GHI_KHO_BOT=1 node --env-file=.env ops/bin/nap-khoi-chung.mjs --ghi   → lưu v3 + đẩy bot + đọc lại
//
// Team: mọi team đang có sản phẩm trên bot (`san_pham.nguon='kb'`) — bot có MỘT bộ ba khối cho
// mọi page, nên hơn một team thì script TỪ CHỐI (không đoán team nào thắng).
import { taoPool } from "../../db/ket-noi.js";
import { config } from "../../src/config.js";
import { getSheetId, fetchTabRows } from "../../src/sheets.js";
import { parsePolicies, parseFaqs, parseObjections, buildShared } from "../../src/kb.js";
import { sachKhoiChung, luuKhoiChung } from "../../src/products/khoi-chung.js";
import { dayKhoiChungLenBot, goiAdminV1 } from "../../v3/src/noi-day/cau-bot-v1.js";

const GHI = process.argv.includes("--ghi");
const t = config.sheetTabs;
const id = getSheetId();
const [pol, fq, ob] = await Promise.all([fetchTabRows(id, t.policies), fetchTabRows(id, t.faq), fetchTabRows(id, t.obj)]);
const tuSheet = sachKhoiChung({ policies: parsePolicies(pol), faqs: parseFaqs(fq), objections: parseObjections(ob) });
const chu = buildShared(tuSheet.policies, tuSheet.faqs, tuSheet.objections);
console.log(`Sheet: ${tuSheet.policies.length} chính sách · ${tuSheet.faqs.length} FAQ · ${tuSheet.objections.length} phản đối · ${chu.length} ký tự`);

const bot = await goiAdminV1("/kb-chung").catch((e) => ({ loi: e.message }));
if (bot.loi) { console.error(`Không đọc được bot: ${bot.loi}`); process.exit(1); }
const khop = bot.text === chu;
console.log(`Bot đang dùng nguồn «${bot.nguon}» · đoạn chữ dựng từ bản sẽ nạp ${khop ? "GIỐNG từng ký tự" : "KHÁC"} đoạn bot đang ghép (${String(bot.text || "").length} ký tự)`);
if (!khop) { console.error("TỪ CHỐI: bản nạp không tái tạo đúng đoạn chữ bot đang dùng."); process.exit(1); }

const pool = taoPool();
try {
  const team = (await pool.query("SELECT DISTINCT team_id FROM san_pham WHERE nguon = 'kb'")).rows.map((r) => r.team_id);
  console.log(`Team có sản phẩm trên bot: ${team.join(", ") || "(không)"}`);
  if (team.length !== 1) { console.error("TỪ CHỐI: cần đúng MỘT team (bot có một bộ ba khối cho mọi page)."); process.exit(1); }
  if (!GHI) { console.log("CHẠY THỬ — không ghi gì. Thêm --ghi."); process.exit(0); }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const l = await luuKhoiChung(c, team[0], tuSheet, { nguoiSua: "may:nap-khoi-chung" });
    const d = await dayKhoiChungLenBot(l.sau);
    await c.query(
      `INSERT INTO nhat_ky (team_id, tac_nhan, doi_tuong, doi_tuong_id, hanh_dong, truoc, sau, ghi_chu)
       VALUES ($1,'may:nap-khoi-chung','khoi_dung_chung',$2,'v3_sua_khoi_dung_chung',$3,$4,'nạp một lượt từ Google Sheet (CR-28-09b · MN7)')`,
      [team[0], String(team[0]), JSON.stringify(l.truoc), JSON.stringify(l.sau)],
    );
    await c.query("COMMIT");
    console.log(`ĐÃ GHI: bản ${l.phienBan} · bot nhận và đọc lại khớp · bot đang dùng nguồn «${d.nguon}»`);
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
} finally { await pool.end(); }
