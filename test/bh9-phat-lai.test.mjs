// BH9 ④9 — M6 · PHÁT LẠI TRÊN LỊCH SỬ GIẢ LẬP 09/10 (CHỈ ĐỌC — `default_transaction_read_only=on`) trên MÁY DEV:
// `aicloser_gialap_pilot` (page 275 UAE · 109 tin khách · 64 lượt guiTin) + `aicloser_gialap_2` (page 276 Saudi — so_ai · page 340 — 60 tin khách).
// CSDL có dữ liệu khách THẬT: tệp này KHÔNG in chữ khách/tên/SĐT — chỉ id + luật + số đếm (tên trích ra chỉ in SỐ CHỮ — kể cả chữ cái đầu cũng không, repo công khai).
// Máy không có hai CSDL này (CI, máy khác) ⇒ cả tệp HOÃN có nói ra (skip), không đỏ oan — cổng bh9.sh đòi tệp này CHẠY THẬT.
// Ánh xạ «#n» (PHIEU-BH9 dòng Nguồn [S13]): UAE #n = row_number() OVER (ORDER BY tin_cho_xu_ly.id) (= id − 175) · Saudi #n = so_ai.nguon_dong
// của page 1188130791056549. Bản base (a6f670d) dựng như `bh9-ham-thuan.test.mjs`.
// NGỮ CẢNH TỪNG LƯỢT (Ra) là PHỎNG DỰNG — lịch sử Pancake của lượt chạy không còn (chỉ còn tin khách UAE + chữ bot):
//   · `lastAiText` = chữ bot ĐÃ GỬI gần nhất cùng psid (UAE: lan_gui; Saudi: so_ai `reply` — `spent_no_send` không gửi nên không tính);
//   · `donDaCo` = hồ sơ CUỐI có đơn — trừ khi đơn đó là «đã tạo» của CHÍNH lượt bot chốt (hội thoại có dòng so_ai `order`) thì chỉ tính
//     từ SAU lượt chốt; UAE cộng thêm tin khách tới lượt đó khớp `donTuTinKhach` (bộ dò mới);
//   · `isOrderSummary` = lượt có dòng so_ai `order` · `daBanGiao` = lượt có dòng `handoff` không do cửa ra.
// Lệch phỏng dựng ⇒ con số «ngoài lượt lỗi đã biết» là số có điều kiện — nhật ký BH9 ghi lý do từng câu.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import * as C from '../src/context.js';
import * as L from '../src/lead-score.js';
import * as G from '../src/outbound-guard.js';
import { rapKb } from '../src/chat/rap-prompt.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'a6f670d';
const UAE = { db: 'aicloser_gialap_pilot', pageRow: 275, pageId: '1157980804067455' };
const KSA = { db: 'aicloser_gialap_2', pageRow: 276, pageId: '1188130791056549' };
const P340 = { db: 'aicloser_gialap_2', pageRow: 340, pageId: '1140029535862514' };
const UAE_ID = (n) => n + 175;
// Lượt lỗi đã biết (PHIEU-BH9 ① + ngưỡng «Đo bằng model»).
const BIET_UAE = new Set([47, 48, 65, 82, 83, 84, 85, 90, 100, 102, 105].map(UAE_ID));
// Vòng 2 (đối kháng F4 · tổng chốt 19/10): + Saudi #141 (so_ai 138 «your order is already with the courier po» — câu Kimi THẬT bịa trạng
// thái đơn, vòng 1 không nằm trong danh sách đòi nên M6 không thấy nó QUA) và #46 (so_ai 62 «Since there's already an order in the
// system…» — khẳng định CÓ đơn + xin lại khu vực) — cả hai là lỗi BỊA đã biết, nay ĐÒI bị chặn.
const BIET_KSA = new Set([3, 4, 5, 23, 28, 34, 35, 37, 43, 44, 46, 47, 54, 141]);
const DOI_UAE = [82, 83, 84, 85, 100, 65].map(UAE_ID);
const DOI_KSA = [4, 5, 23, 28, 35, 37, 46, 54, 141];
const TEN_SAI = ['finished', 'working for fails', 'Yass island', 'e now', 'Abudhabi city', 'here in Dammam', 'waiting',
  'e arrived my order', 'e is', 'SAUDI ARABIA', 'yesterday', 'waiting for delivery I send already the'];
const soChu = (t) => `${String(t).split(/\s+/).length} chữ`;

let _base;
async function base() {
  if (_base !== undefined) return _base;
  try {
    let dir = process.env.BH9_BASE_SRC || '';
    if (!dir) {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh9-base-'));
      execSync(`git -C "${GOC}" archive ${BASE} src | tar -x -C "${dir}"`, { stdio: ['ignore', 'ignore', 'pipe'] });
      fs.copyFileSync(path.join(GOC, 'package.json'), path.join(dir, 'package.json'));
      fs.symlinkSync(path.join(GOC, 'node_modules'), path.join(dir, 'node_modules'));
    }
    _base = { guard: await import(pathToFileURL(path.join(dir, 'src/outbound-guard.js'))),
      context: await import(pathToFileURL(path.join(dir, 'src/context.js'))) };
  } catch (e) { console.log(`   [bh9r] KHÔNG dựng được bản base: ${e.message}`); _base = null; }
  return _base;
}
const pools = {};
async function hoBo(db) {
  if (db in pools) return pools[db];
  try {
    const u = new URL(process.env.DATABASE_URL_V3 || 'postgres://localhost:5432/x'); u.pathname = `/${db}`;
    const p = new pg.Pool({ connectionString: u.toString(), options: '-c default_transaction_read_only=on', max: 2 });
    await p.query('SELECT 1 FROM tin_cho_xu_ly LIMIT 1');
    pools[db] = p;
  } catch (e) { console.log(`   [bh9r] HOÃN — không mở được ${db}: ${e.code || e.message}`); pools[db] = null; }
  return pools[db];
}
test.after(async () => { for (const p of Object.values(pools)) if (p) await p.end(); });

async function kbCua(pool, { pageRow }) {
  const p = (await pool.query('SELECT team_id, page_id FROM page WHERE id=$1', [pageRow])).rows[0];
  const cu = process.env.V3_RAP_PROMPT_BAT;
  process.env.V3_RAP_PROMPT_BAT = '1';
  try { return await rapKb(pool, { teamId: p.team_id, pageIdText: p.page_id }); }
  finally { if (cu === undefined) delete process.env.V3_RAP_PROMPT_BAT; else process.env.V3_RAP_PROMPT_BAT = cu; }
}

/** Chữ bot đã ghi + ngữ cảnh lượt đó (tin khách được trả lời · hồ sơ cuối · có chốt đơn / có bàn giao chủ động trong lượt). */
async function chuBot() {
  const out = [];
  const u = await hoBo(UAE.db);
  if (u) {
    const kb = await kbCua(u, UAE);
    const r = (await u.query(`SELECT g.id, g.tin_id, t.psid, g.noi_dung->>'text' AS text, t.noi_dung AS khach, h.ho_so,
        EXISTS (SELECT 1 FROM so_ai s WHERE s.nguon_dong=g.tin_id AND s.loai='order') AS chot,
        EXISTS (SELECT 1 FROM so_ai s WHERE s.nguon_dong=g.tin_id AND s.loai='handoff' AND coalesce(s.ly_do,'') !~ '^(cửa ra|guard)') AS ban_giao
      FROM lan_gui g JOIN tin_cho_xu_ly t ON t.id=g.tin_id
      LEFT JOIN page pg ON pg.page_id=t.page_id LEFT JOIN hoi_thoai h ON h.page_id=pg.id AND h.psid=t.psid
      WHERE g.loai='guiTin' ORDER BY g.id`)).rows;
    // chỉ lượt chốt của LẦN CHẠY còn tin (so_ai còn dòng của lần chạy trước — tin đã xoá)
    const chot = await u.query(`SELECT a.psid, min(a.nguon_dong)::int n FROM so_ai a WHERE a.page_id=$1 AND a.loai='order'
      AND a.nguon_dong IN (SELECT id FROM tin_cho_xu_ly) GROUP BY 1`, [UAE.pageId]);
    const mocChot = new Map(chot.rows.map((x) => [x.psid, x.n]));
    const kh = (await u.query('SELECT id::int id, psid, noi_dung FROM tin_cho_xu_ly WHERE page_id=$1 ORDER BY id', [UAE.pageId])).rows;
    const truoc = new Map();
    for (const x of r) {
      const id = Number(x.tin_id);
      const khach = kh.some((k) => k.psid === x.psid && k.id <= id && C.donTuTinKhach(k.noi_dung));
      out.push({ ...x, nguon: 'UAE', id, kb, lastAi: truoc.get(x.psid) || '', coDon: khach || donTheoLuot(x.ho_so, mocChot.get(x.psid), id) });
      truoc.set(x.psid, x.text);
    }
  }
  const s = await hoBo(KSA.db);
  if (s) {
    const kb = await kbCua(s, KSA);
    const r = (await s.query(`SELECT a.id, a.nguon_dong, a.psid, a.loai, CASE WHEN a.loai='reply' THEN a.du_lieu->>'text' ELSE a.du_lieu->>'text_bi_chan' END AS text,
        h.ho_so,
        EXISTS (SELECT 1 FROM so_ai o WHERE o.nguon_dong=a.nguon_dong AND o.page_id=a.page_id AND o.loai='order') AS chot,
        EXISTS (SELECT 1 FROM so_ai o WHERE o.nguon_dong=a.nguon_dong AND o.page_id=a.page_id AND o.loai='handoff' AND coalesce(o.ly_do,'') !~ '^(cửa ra|guard)') AS ban_giao
      FROM so_ai a LEFT JOIN page pg ON pg.page_id=a.page_id LEFT JOIN hoi_thoai h ON h.page_id=pg.id AND h.psid=a.psid
      WHERE a.page_id=$1 AND a.lane='AI' AND a.loai IN ('reply','spent_no_send') ORDER BY a.nguon_dong, a.id`, [KSA.pageId])).rows;
    const truoc = new Map();
    for (const x of r) {
      if (!x.text) continue;
      const id = Number(x.nguon_dong);
      out.push({ ...x, nguon: 'KSA', id, kb, lastAi: truoc.get(x.psid) || '', khach: '', coDon: donTheoLuot(x.ho_so, undefined, id) });
      if (x.loai === 'reply') truoc.set(x.psid, x.text);
    }
  }
  return out;
}
/** `donDaCo` phỏng dựng cho lượt `id` — xem đầu tệp. Vòng 2: định nghĩa «có đơn» đổi (chỉ BẰNG CHỨNG) ⇒ tín hiệu của hồ sơ cuối (do bộ
 *  dò CŨ ghi) phải QUA LẠI bộ dò MỚI trên chính câu đã lưu (`cau`, cắt 120 ký tự): nguồn page ⇒ `donTuTinPage`, nguồn khách ⇒
 *  `donTuTinKhach`. Hạn 14 ngày không loại gì ở đây (mỗi lần chạy giả lập gói trong một ngày). Không kiểm được «chữ của chính bot» trên
 *  câu đã lưu (lịch sử Pancake đã mất) — phiếu ⑦ đo: 13 tín hiệu page đều là mẫu POS thật. */
function donTheoLuot(hoSo, mocChot, id) {
  const d = hoSo?.donDaCo;
  if (!d) return false;
  if (d.nguon === 'page' && !C.donTuTinPage(d.cau || '')) return false;
  if (d.nguon === 'khach' && !C.donTuTinKhach(d.cau || '')) return false;
  if (d.trangThai === 'đã tạo' && mocChot != null && id <= mocChot) return false;
  return true;
}

const KQ = { a: null, b: null, coDon: null };
test('BH9 Ra · cửa ra cũ ↔ mới trên chữ bot đã ghi: luật cũ chặn ⇒ GIỐNG HỆT · cũ QUA ⇒ mới QUA hoặc LUAT_BH9 · có đủ lượt lỗi đã biết · ≤ 3 câu ngoài', async (t) => {
  const b = await base();
  const ds = await chuBot();
  if (!b || !ds.length) return t.skip('HOÃN — thiếu bản base hoặc CSDL giả lập trên máy này');
  const dem = {}, demCu = {}, demMoi = {}, chanMoi = [], lech = [];
  for (const x of ds) {
    const ctx = { kb: x.kb, lastAiText: x.lastAi, orderCreated: false, isOrderSummary: !!x.chot };
    const cu = b.guard.guardOutbound(x.text, ctx);
    const moi = G.guardOutbound(x.text, { ...ctx, luatBH9: true, donDaCo: !!x.coDon, daBanGiao: !!x.ban_giao,
      dauHieuYTe: C.dauHieuYTe?.(x.khach || '') || '' });
    if (!cu.ok) demCu[cu.rule] = (demCu[cu.rule] || 0) + 1;
    if (!moi.ok && !G.LUAT_BH9?.has(moi.rule)) demMoi[moi.rule] = (demMoi[moi.rule] || 0) + 1;
    if (!cu.ok && (moi.rule !== cu.rule || moi.action !== cu.action)) lech.push(`${x.nguon}#${x.id}: ${cu.rule}→${moi.rule}`);
    if (cu.ok && !moi.ok) {
      if (G.LUAT_BH9?.has(moi.rule)) { chanMoi.push({ nguon: x.nguon, id: x.id, rule: moi.rule, coDon: !!x.coDon }); dem[moi.rule] = (dem[moi.rule] || 0) + 1; }
      else lech.push(`${x.nguon}#${x.id}: QUA→${moi.rule}`);
    }
  }
  const ngoai = chanMoi.filter((c) => !(c.nguon === 'UAE' ? BIET_UAE : BIET_KSA).has(c.id));
  // LỆCH PHIẾU — TỔNG GẬT 19/10 (nhật ký BH9): phiếu đòi «ngoài lượt lỗi đã biết ≤ 3» trên TỔNG; đo thật 6, cả 6 là BAN_LAI_SAU_BAN với
  // khách ĐÃ CÓ đơn (ngữ cảnh phỏng dựng). Hợp đồng thước tổng chốt: (1) trần ≤ 3 cho câu ở hội thoại KHÔNG có đơn; (2) mọi câu ngoài
  // danh sách ở hội thoại CÓ đơn phải mang đúng BAN_LAI_SAU_BAN (luật khác ⇒ ĐỎ) — cổng khẳng định chứ không in suông. Mốc 19/10: 6.
  const ngoaiCoDon = ngoai.filter((c) => c.coDon && c.rule === 'BAN_LAI_SAU_BAN');
  const ngoaiCoDonLuatKhac = ngoai.filter((c) => c.coDon && c.rule !== 'BAN_LAI_SAU_BAN');
  const ngoaiKhac = ngoai.filter((c) => !c.coDon);
  KQ.a = chanMoi.length; KQ.coDon = ngoaiCoDon.length;
  console.log(`   [bh9r] Ra: ${ds.length} câu bot (UAE ${ds.filter((x) => x.nguon === 'UAE').length} · KSA ${ds.filter((x) => x.nguon === 'KSA').length})`);
  console.log(`   [bh9r] Ra: luật cũ chặn (base) ${JSON.stringify(demCu)} · (mới) ${JSON.stringify(demMoi)}`);
  console.log(`   [bh9r] Ra: luật mới × số câu ${JSON.stringify(dem)} · id: ${chanMoi.map((c) => `${c.nguon}${c.nguon === 'UAE' ? '#' + (c.id - 175) : '#' + c.id}:${c.rule}`).join(' ')}`);
  const ten = (c) => `${c.nguon}#${c.nguon === 'UAE' ? c.id - 175 : c.id}:${c.rule}`;
  console.log(`   [bh9r] Ra: ngoài lượt lỗi đã biết ${ngoai.length} = khách CÓ đơn · BAN_LAI ${ngoaiCoDon.length}: ${ngoaiCoDon.map(ten).join(' ')}`
    + ` · khách CÓ đơn · luật khác ${ngoaiCoDonLuatKhac.length}: ${ngoaiCoDonLuatKhac.map(ten).join(' ')} · hội thoại KHÔNG đơn ${ngoaiKhac.length}: ${ngoaiKhac.map(ten).join(' ')}`);
  assert.deepEqual(lech, [], 'luật cũ đổi phán quyết');
  assert.deepEqual(demMoi, demCu, 'số câu bị luật cũ chặn phải bằng base');
  // ĐÒI: mỗi lượt lỗi đã biết phải bị chặn bởi luật MỚI (hoặc luật nội dung CŨ — G06–G09) khi tách khỏi DUPLICATE: phỏng dựng
  // `lastAiText` làm vài lượt thành «trùng câu trước» (Saudi #35 trùng #23) dù lượt chạy thật đã GỬI câu đó (công cụ giả lập trả
  // quyền AI mỗi lượt — phiếu ① «Lệch phép đo»).
  const chanKhiBoTrung = (x) => {
    const v = G.guardOutbound(x.text, { kb: x.kb, lastAiText: '', isOrderSummary: !!x.chot, luatBH9: true, donDaCo: !!x.coDon,
      daBanGiao: !!x.ban_giao, dauHieuYTe: C.dauHieuYTe?.(x.khach || '') || '' });
    return !v.ok && v.rule !== 'DUPLICATE';
  };
  const thieuU = DOI_UAE.filter((id) => !ds.some((x) => x.nguon === 'UAE' && x.id === id && chanKhiBoTrung(x)));
  const thieuK = DOI_KSA.filter((id) => !ds.some((x) => x.nguon === 'KSA' && x.id === id && chanKhiBoTrung(x)));
  assert.deepEqual([thieuU.map((i) => i - 175), thieuK], [[], []], `lượt lỗi đã biết LỌT luật mới: UAE ${thieuU.map((i) => i - 175)} · KSA ${thieuK}`);
  assert.ok(ngoaiKhac.length <= 3, `${ngoaiKhac.length} câu bị luật mới chặn ngoài lượt lỗi đã biết ở hội thoại KHÔNG có đơn: ${ngoaiKhac.map(ten).join(' ')}`);
  assert.deepEqual(ngoaiCoDonLuatKhac.map(ten), [], 'câu ngoài danh sách ở hội thoại có đơn phải là BAN_LAI_SAU_BAN');
});

async function tinKhach(db, pageId) {
  const p = await hoBo(db);
  if (!p) return null;
  return (await p.query(`SELECT t.id::int AS id, t.noi_dung, h.id AS ht, h.ho_so->'donDaCo'->>'nguon' AS don
    FROM tin_cho_xu_ly t LEFT JOIN page pg ON pg.page_id=t.page_id LEFT JOIN hoi_thoai h ON h.page_id=pg.id AND h.psid=t.psid
    WHERE t.page_id=$1 ORDER BY t.id`, [pageId])).rows;
}
test('BH9 Rb · cổng sau bán trên tin khách THẬT (hồ sơ rỗng): UAE chỉ ht 43779 · ≥ 2/3 {#82 #90 #102} · page 340 chỉ hội thoại có đơn nguồn page', async (t) => {
  const u = await tinKhach(UAE.db, UAE.pageId), p = await tinKhach(P340.db, P340.pageId);
  if (!u || !p) return t.skip('HOÃN — thiếu CSDL giả lập');
  assert.equal(typeof C.laCauSauBan, 'function');
  const bat = (ds) => ds.filter((x) => C.laCauSauBan(x.noi_dung, C.emptyProfile()).la);
  const bu = bat(u), bp = bat(p);
  KQ.b = bu.length + bp.length;
  console.log(`   [bh9r] Rb: UAE ${u.length} tin ⇒ đánh dấu ${bu.length}: ${bu.map((x) => `#${x.id - 175}/ht${x.ht}`).join(' ')} · page 340 ${p.length} tin ⇒ ${bp.length}: ${bp.map((x) => `${x.id}/ht${x.ht}`).join(' ')}`);
  assert.equal(u.length, 109); assert.equal(p.length, 60);
  assert.deepEqual(bu.filter((x) => String(x.ht) !== '43779').map((x) => x.id - 175), [], 'người đang muốn mua bị coi là sau bán (UAE)');
  assert.ok([82, 90, 102].filter((n) => bu.some((x) => x.id === UAE_ID(n))).length >= 2, 'bắt hụt lượt sau bán đã biết');
  assert.deepEqual(bp.filter((x) => x.don !== 'page').map((x) => `${x.id}/ht${x.ht}`), [], 'page 340: bắt ngoài hội thoại có đơn');
});
test('BH9 Rc · y tế trên tin khách THẬT: UAE đúng ht 43877 (#47) · «no fever» (ht 43882) và tin địa chỉ ht 43893 KHÔNG', async (t) => {
  const u = await tinKhach(UAE.db, UAE.pageId);
  if (!u) return t.skip('HOÃN — thiếu CSDL giả lập');
  assert.equal(typeof C.dauHieuYTe, 'function');
  const bat = u.filter((x) => C.dauHieuYTe(x.noi_dung));
  console.log(`   [bh9r] Rc: y tế ${bat.length}: ${bat.map((x) => `#${x.id - 175}/ht${x.ht}:${C.dauHieuYTe(x.noi_dung)}`).join(' ')}`);
  assert.deepEqual([...new Set(bat.map((x) => String(x.ht)))], ['43877']);
  assert.ok(bat.some((x) => x.id === UAE_ID(47)));
});
test('BH9 Rd · tên trên tin khách THẬT: 0 tên thuộc 12 chuỗi sai đã biết', async (t) => {
  const u = await tinKhach(UAE.db, UAE.pageId);
  if (!u) return t.skip('HOÃN — thiếu CSDL giả lập');
  assert.equal(typeof L.tachTen, 'function');
  const ten = u.map((x) => [x, L.tachTen(x.noi_dung)]).filter(([, n]) => n);
  console.log(`   [bh9r] Rd: ${ten.length} tin có tên: ${ten.map(([x, n]) => `#${x.id - 175}:${soChu(n)}`).join(' · ')}`);
  assert.deepEqual(ten.filter(([, n]) => TEN_SAI.includes(n)).map(([x]) => x.id - 175), []);
});
test('BH9 Re · số câu cố định thêm = (Ra câu bị luật mới) + (Rb tin bị đánh dấu) ≤ số lượt lỗi đã biết + 3', (t) => {
  if (KQ.a == null || KQ.b == null) return t.skip('HOÃN — Ra/Rb chưa chạy');
  // Trần của phiếu (lượt lỗi đã biết + 3) — cộng phần BAN_LAI trên khách CÓ đơn ngoài danh sách (lệch phiếu ở Ra, chờ tổng).
  const tran = BIET_UAE.size + BIET_KSA.size + 3;
  console.log(`   [bh9r] Re: câu cố định thêm = ${KQ.a} + ${KQ.b} = ${KQ.a + KQ.b} (trần phiếu ${tran} · + khách có đơn ngoài danh sách ${KQ.coDon})`);
  assert.ok(KQ.a + KQ.b <= tran + KQ.coDon);
});
test('BH9 Rf · [S2] khuôn page mới KHÔNG bắt thêm câu nào trên chữ CHÍNH BOT (lan_gui + so_ai, hai CSDL) + kịch bản (noi_dung_may/nguoi, tách câu)', async (t) => {
  const b = await base();
  const u = await hoBo(UAE.db), s = await hoBo(KSA.db);
  if (!b || !u || !s) return t.skip('HOÃN — thiếu bản base hoặc CSDL giả lập');
  const cau = [];
  for (const p of [u, s]) {
    for (const r of (await p.query(`SELECT noi_dung->>'text' t FROM lan_gui WHERE loai='guiTin'`)).rows) cau.push(r.t);
    for (const r of (await p.query(`SELECT du_lieu->>'text' t, du_lieu->>'text_bi_chan' b FROM so_ai WHERE loai IN ('reply','spent_no_send')`)).rows) cau.push(r.t, r.b);
    for (const r of (await p.query(`SELECT noi_dung_may m, noi_dung_nguoi::text n FROM kich_ban`)).rows) {
      for (const k of [r.m, r.n]) for (const c of String(k || '').split(/(?<=[.!?])\s+|\n+|\\n/)) cau.push(c);
    }
  }
  const ds = cau.filter((x) => x && x.trim());
  const moi = ds.filter((x) => C.donTuTinPage(x)), cu = ds.filter((x) => b.context.donTuTinPage(x));
  const them = moi.filter((x) => !b.context.donTuTinPage(x));
  console.log(`   [bh9r] Rf: ${ds.length} câu · khớp base ${cu.length} · khớp mới ${moi.length} · THÊM ${them.length}`);
  assert.ok(ds.length >= 400, `chỉ ${ds.length} câu — thước đo nhầm chỗ`);
  assert.equal(them.length, 0, 'khuôn page mới bắt thêm câu của chính bot/kịch bản ⇒ donDaCo tự đầu độc');
  assert.equal(moi.length, cu.length);
});
