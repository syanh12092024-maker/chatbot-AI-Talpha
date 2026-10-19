// BOT v3 TỰ BẢO ai_sale NHƯỜNG PAGE (PHIẾU GL10) — chỗ DUY NHẤT đọc/ghi tệp `page_gan_them.json` của pancake-tool.
//
// ai_sale (`/opt/pancake-tool/ai_sale.py theo_doi <tt> --that`, team khác) trả lời ~268 page và KHÔNG đọc tín hiệu nào của v3. Lối
// duy nhất không sửa mã pancake-tool (đo 19/10, `ai_sale.py` sửa lần cuối 18/10 17:24 — tra bằng grep, số dòng trôi):
//   · `_hop_page_shop(mkey, ids) = (set(ids) - _page_gan_noi_khac(mkey)) | _page_gan_them(mkey)`;
//   · `_page_gan_noi_khac(mkey) = {p for k, o in d.items() if k != mkey and isinstance(o, dict) for p in o}` ⇒ khoá lạ `_v3` mang
//     DICT {page_id: chuỗi} loại page khỏi MỌI thị trường;
//   · vế `| _page_gan_them(mkey)` CỘNG LẠI page nằm ở `d[mkey]` hoặc ở `tram_landing` có mkey trong nha/nuoc ⇒ page gắn tay theo hai
//     đường đó thì `_v3` KHÔNG làm ai_sale nhường (`khoaGanTay` dưới — v3 từ chối bật / im);
//   · ai_sale tra lại danh sách page mỗi 600 s; tệp hỏng/vắng ⇒ `except: return set()` ⇒ KHÔNG bỏ page nào (trả lời lại mọi page).
// Người ghi khác: `tu_gan_page_ngoai.py` `_ghi_gan`/`_go_gan` (đọc lại rồi `os.replace`, KHÔNG khoá). v3 không ngăn được mất-ghi, v3
// PHÁT HIỆN được: kiểm (ino, mtimeNs, size) của tệp đích ngay trước `rename` (ghi chen ⇒ làm lại ≤ 3 lần) và worker kiểm lại khoá mỗi vòng.
//
// Luật tổng: thà v3 IM còn hơn hai bot cùng trả lời. Mọi chỗ mù (biến vắng · tệp hỏng · khoá mất · gắn tay · CSDL chưa 035) ⇒ v3 không
// nạp, không rút tin của page.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { ghiNhatKy } from "../db/index.js";
import { gioVN } from "./ngat-page.js";

/** Biến đường tệp (prod: `/opt/pancake-tool/state/chung/page_gan_them.json`). Vắng ⇒ TỪ CHỐI bật mọi page — không giá trị «bỏ cửa». */
export const BIEN_TEP_GAN = "V3_AI_SALE_TEP_GAN";
/** Biến tiền tố log ai_sale (prod: `/var/log/aisale-chat` ⇒ mọi `/var/log/aisale-chat*.log`). Vắng ⇒ chỉ chờ theo giờ. */
export const BIEN_LOG = "V3_AI_SALE_LOG";
/** Khoá của v3 trong tệp — giá trị là DICT {page_id: chuỗi} (đúng dáng `_page_gan_noi_khac` loại khỏi mọi thị trường). */
export const KHOA_V3 = "_v3";
/** Khoá tư vấn của mọi lượt ghi tệp của v3 (`pg_advisory_xact_lock(hashtextextended(<hằng>, 0))`). */
export const KHOA_TU_VAN_TEP = "v3:ai_sale_tep";
/**
 * Chờ ai_sale nhường bao lâu sau khi bật. 600 s chu kỳ tra lại (`ai_sale.py`, `pages_luc > 600`) + lượt dò p99 19 s + lượt tra lại
 * (POS ≤ 40 s) + lượt xử đang chạy với danh sách cũ p99 93 s (Saudi, đo prod 19/10) ≈ 752 s ⇒ 15′. KHÔNG có biến môi trường (để khỏi
 * có người hạ thấp); đuôi dài hơn (max 641 s) giao cho log ai_sale.
 */
export const CHO_AI_SALE_MS = 900_000;
/** Cửa sổ quan sát log mở lúc `bot_bat_luc + 10′30″` (sau một chu kỳ tra lại 600 s + đệm) và KHÔNG đóng suốt thời gian page bật. */
export const MO_CUA_SO_LOG_MS = 630_000;
/** Log còn thấy page id (trạng thái `cho`) ⇒ `ai_sale_cho_den = max(cũ, now() + 2′)`. */
export const GIA_HAN_LOG_MS = 120_000;
/** Bật quá chừng này mà log vẫn thấy page id ⇒ `chua_nhuong`, ngừng gia hạn. */
export const TRAN_CHUA_NHUONG_MS = 30 * 60_000;
/** Đọc tối đa chừng này byte MỚI mỗi tệp log mỗi vòng nạp. */
export const TRAN_DOC_LOG = 8 * 1024 * 1024;
const LAN_GHI = 3;
const TAC_NHAN = "may:l2-worker";

/** Trạng thái trên `page.ai_sale_trang_thai` (CHECK của 035). */
export const TRANG_THAI = Object.freeze(["", "cho", "da_nhuong", "chua_nhuong", "mat_khoa", "loi_tep", "gan_tay", "xoa_hong"]);
const DANG_CANH = new Set(["cho", "da_nhuong", "mat_khoa", "loi_tep", "gan_tay"]);   // worker xét · `chua_nhuong` chỉ người gạt lại mới gỡ

/** Lỗi tệp ai_sale — cổng bật trả 409 kèm câu này (câu nêu đường tệp + lỗi). `daGhi` = tệp đích có thể đã đổi (lỗi SAU rename). */
export class LoiTepAiSale extends Error {
  constructor(thongDiep, { vang = false, daGhi = false, coTruoc = false } = {}) {
    super(thongDiep);
    this.name = "LoiTepAiSale";
    this.status = 409;
    this.vang = vang;
    this.daGhi = daGhi;
    this.coTruoc = coTruoc;
  }
}

/** Đường tệp từ env (`process.env` — hai unit nạp `.env`). Rỗng / vắng ⇒ `""`. */
export const tepGan = (env = process.env) => String(env?.[BIEN_TEP_GAN] ?? "").trim();

/**
 * Có literal SỐ mà JS không giữ được ngữ nghĩa Python ngoài chuỗi không: số nguyên ≥ 16 chữ số (`JSON.parse` làm tròn số > 2^53) hoặc
 * SỐ THỰC (`600.0` của Python thành `600` — int — khi JS ghi lại; /code-review GL10 #10). Có ⇒ từ chối GHI (đọc vẫn được) — ghi lại là
 * đổi dữ liệu người khác. Đo prod 19/10: tệp có 0 giá trị số (12 dict · 75 chuỗi · 5 mảng) ⇒ luật này không chặn tệp thật hôm nay.
 * Page id là KHOÁ chuỗi nên không dính. Quét theo token JSON (bỏ qua nội dung chuỗi). (NaN/Infinity của Python ⇒ `JSON.parse` lỗi ⇒ hỏng.)
 */
export function coSoKhongGiuDuoc(raw) {
  const s = String(raw);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      for (i++; i < s.length && s[i] !== '"'; i++) if (s[i] === "\\") i++;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < s.length && s[j] >= "0" && s[j] <= "9") j++;
      if (j - i >= 16) return true;
      if (j < s.length && /[.eE]/.test(s[j])) return true;   // số thực (phần lẻ / số mũ)
      i = j - 1;
    }
  }
  return false;
}

/**
 * Đọc tệp: gốc phải là object; `_v3` (nếu có) phải là object mọi giá trị là chuỗi. Hỏng ⇒ `{ok:false, loi}` — KHÔNG BAO GIỜ coi là `{}`
 * (ai_sale đọc tệp hỏng là trả lời lại mọi page). Vắng (`ENOENT`) ⇒ `{ok:false, vang:true}`: không tự tạo tệp của team khác.
 * @returns {{ok:true, d:object, raw:string, soLon:boolean} | {ok:false, vang?:boolean, loi:string}} `soLon` = có số JS không giữ được.
 */
export function docTepGan(tep, fsx = fs) {
  let raw;
  try {
    raw = fsx.readFileSync(tep, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return { ok: false, vang: true, loi: `tệp ${tep} không tồn tại` };
    return { ok: false, loi: `đọc tệp ${tep} lỗi (${e?.code || e?.message || e})` };
  }
  let d;
  try {
    d = JSON.parse(raw);
  } catch (e) {
    return { ok: false, loi: `tệp ${tep} không phải JSON hợp lệ (${String(e?.message || e).slice(0, 120)})` };
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return { ok: false, loi: `gốc tệp ${tep} không phải object` };
  if (Object.hasOwn(d, KHOA_V3)) {
    const v = d[KHOA_V3];
    if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, loi: `khoá ${KHOA_V3} trong tệp ${tep} không phải object` };
    if (Object.values(v).some((x) => typeof x !== "string")) return { ok: false, loi: `khoá ${KHOA_V3} trong tệp ${tep} có giá trị không phải chuỗi` };
  }
  return { ok: true, d, raw, soLon: coSoKhongGiuDuoc(raw) };
}

/**
 * Khoá nào (khác `_v3`) đang GẮN TAY page này cho ai_sale — đúng vế cộng `_page_gan_them` của ai_sale: pid nằm dưới một khoá dict (khoá
 * nước · `tram_landing`) — hoặc trong một mảng (ai_sale lặp `d.get(mkey) or {}` nên mảng cũng cộng). Có ⇒ `_v3` KHÔNG đủ để ai_sale nhường.
 */
export function khoaGanTay(d, pageId) {
  const pid = String(pageId);
  const ra = [];
  for (const [k, v] of Object.entries(d || {})) {
    if (k === KHOA_V3 || !v || typeof v !== "object") continue;
    if (Array.isArray(v) ? v.some((x) => String(x) === pid) : Object.hasOwn(v, pid)) ra.push(k);
  }
  return ra;
}

/** Khoá `_v3[pageId]` còn trong tệp đã đọc không. */
export const coKhoaV3 = (d, pageId) => typeof d?.[KHOA_V3]?.[String(pageId)] === "string";

const statTep = (fsx, tep) => fsx.statSync(tep, { bigint: true });
const cungBan = (a, b) => a.ino === b.ino && a.mtimeNs === b.mtimeNs && a.size === b.size;

/**
 * ĐỌC–SỬA–GHI nguyên tử. `sua(d)` sửa tại chỗ và trả `{doi, coTruoc}`; `doi:false` ⇒ không ghi gì. Ghi vào tệp tạm CÙNG thư mục
 * `<tep>.v3-<pid>-<ngẫu nhiên>.tmp` (cờ `wx`) → fsync → chmod + chown về mode/uid/gid tệp gốc (unit v3 có `UMask=0077`) → kiểm
 * (ino, mtimeNs, size) của tệp đích bằng lúc đọc (lệch ⇒ bỏ tệp tạm, đọc lại, làm lại ≤ 3 lần) → `rename` → fsync thư mục → ĐỌC LẠI,
 * so sâu với bản dự kiến. Lỗi trước `rename` ⇒ xoá tệp tạm, tệp đích nguyên TỪNG BYTE.
 * `deps.fs` (bộ ca tiêm lỗi) · `deps.truocRename()` (bộ ca chen một lượt ghi lạ).
 */
function suaTep(tep, sua, deps = {}) {
  const fsx = deps.fs || fs;
  if (!tep) throw new LoiTepAiSale(`Chưa nối ai_sale (${BIEN_TEP_GAN} vắng) — không ghi được khoá`);
  for (let lan = 1; lan <= LAN_GHI; lan++) {
    let st0;
    try {
      st0 = statTep(fsx, tep);
    } catch (e) {
      throw new LoiTepAiSale(e?.code === "ENOENT" ? `tệp ${tep} không tồn tại — không tự tạo tệp của pancake-tool`
        : `không đọc được tệp ${tep} (${e?.code || e?.message || e})`, { vang: e?.code === "ENOENT" });
    }
    const r = docTepGan(tep, fsx);
    if (!r.ok) throw new LoiTepAiSale(`tệp ai_sale hỏng — ${r.loi}`, { vang: !!r.vang });
    if (r.soLon) throw new LoiTepAiSale(`tệp ${tep} có số nguyên ≥ 16 chữ số hoặc số thực — JS không giữ được (làm tròn / 600.0 thành 600), ghi lại sẽ đổi dữ liệu của pancake-tool; từ chối ghi`);
    const kq = sua(r.d);
    if (!kq.doi) return { ...kq, ghi: false };
    const buf = Buffer.from(JSON.stringify(r.d, null, 1), "utf8");
    const dir = path.dirname(tep);
    const tam = path.join(dir, `${path.basename(tep)}.v3-${process.pid}-${crypto.randomBytes(6).toString("hex")}.tmp`);
    let fd = null;
    let daRename = false;
    try {
      fd = fsx.openSync(tam, "wx", 0o600);
      for (let off = 0; off < buf.length;) off += fsx.writeSync(fd, buf, off, Math.min(64 * 1024, buf.length - off));
      fsx.fsyncSync(fd);
      fsx.fchmodSync(fd, Number(st0.mode & 0o7777n));
      fsx.fchownSync(fd, Number(st0.uid), Number(st0.gid));
      fsx.closeSync(fd);
      fd = null;
      deps.truocRename?.();
      if (!cungBan(statTep(fsx, tep), st0)) {   // một lượt `_ghi_gan`/`_go_gan` vừa chen vào ⇒ không đè, đọc lại
        try { fsx.unlinkSync(tam); } catch { /* đã không còn */ }
        continue;
      }
      fsx.renameSync(tam, tep);
      daRename = true;
      const dfd = fsx.openSync(dir, "r");
      try { fsx.fsyncSync(dfd); } finally { fsx.closeSync(dfd); }
    } catch (e) {
      if (fd != null) { try { fsx.closeSync(fd); } catch { /* bỏ */ } }
      if (!daRename) { try { fsx.unlinkSync(tam); } catch { /* chưa tạo */ } }
      throw new LoiTepAiSale(`ghi tệp ${tep} lỗi (${e?.code || e?.message || e})${daRename ? " — SAU khi đã thay tệp" : " — tệp đích giữ nguyên"}`,
        { daGhi: daRename, coTruoc: !!kq.coTruoc });
    }
    const sau = docTepGan(tep, fsx);
    if (!sau.ok || !isDeepStrictEqual(sau.d, r.d)) {
      throw new LoiTepAiSale(`ghi tệp ${tep} xong nhưng đọc lại LỆCH bản dự kiến${sau.ok ? "" : ` (${sau.loi})`} — có lượt ghi khác chen ngay sau`,
        { daGhi: true, coTruoc: !!kq.coTruoc });
    }
    return { ...kq, ghi: true };
  }
  throw new LoiTepAiSale(`tệp ${tep} bị ghi chen ${LAN_GHI} lần liên tiếp trong lúc v3 ghi khoá — thử lại sau`);
}

/** Ghi `_v3[pageId] = ghiChu`. Mọi khoá khác giữ nguyên ngữ nghĩa + thứ tự. @returns {{coTruoc:boolean, ghi:boolean}} */
export function ghiKhoa(tep, pageId, ghiChu, deps = {}) {
  const pid = String(pageId);
  return suaTep(tep, (d) => {
    // /code-review GL10 #6: `pageStatus` đọc tệp TRƯỚC khoá tư vấn — một lượt `_ghi_gan` chen giữa có thể vừa gắn tay page. Kiểm lại
    // trên ĐÚNG bản sắp ghi (ném trước khi ghi ⇒ tệp nguyên byte).
    const ganTay = khoaGanTay(d, pid);
    if (ganTay.length) throw new LoiTepAiSale(`page đang được gắn tay cho ai_sale ở khoá ${ganTay.join(", ")} trong ${tep} — khoá ${KHOA_V3} không đủ để ai_sale nhường`);
    const coTruoc = coKhoaV3(d, pid);
    if (!Object.hasOwn(d, KHOA_V3)) d[KHOA_V3] = {};
    d[KHOA_V3][pid] = String(ghiChu);
    return { doi: true, coTruoc };
  }, deps);
}

/** Xoá `_v3[pageId]` (mục cuối ⇒ xoá luôn khoá `_v3`). Khoá vắng ⇒ thành công, không ghi (lũy đẳng). @returns {{coTruoc, ghi}} */
export function xoaKhoa(tep, pageId, deps = {}) {
  const pid = String(pageId);
  return suaTep(tep, (d) => {
    if (!coKhoaV3(d, pid)) return { doi: false, coTruoc: false };
    delete d[KHOA_V3][pid];
    if (!Object.keys(d[KHOA_V3]).length) delete d[KHOA_V3];
    return { doi: true, coTruoc: true };
  }, deps);
}

/* ─────────────── giờ Pancake — UTC KHÔNG kèm múi ─────────────── */

/**
 * Giờ Pancake ⇒ epoch ms. Pancake trả `2026-10-15T09:31:58` / `…:58.000000` là giờ UTC KHÔNG múi (đo prod 15/10, so lúc 09:45:07Z);
 * `Date.parse` hiểu chuỗi không múi là giờ ĐỊA PHƯƠNG (prod Europe/Berlin ⇒ lệch −2 giờ). Số (hoặc chuỗi chỉ chữ số) ⇒ epoch (giây ⇒ ms
 * như `history.js#messageTime`); chuỗi có `Z`/`±hh:mm` ⇒ `Date.parse`; chuỗi không múi ⇒ coi là UTC. Không đọc được ⇒ `NaN`
 * (nơi gọi coi như «trước mốc» — chỉ trả lời tin CHỨNG MINH được là đến sau mốc).
 */
export function thoiDiemPancake(x) {
  if (typeof x === "number") return Number.isFinite(x) ? (x < 1e12 ? x * 1000 : x) : NaN;
  const s = String(x ?? "").trim();
  if (!s) return NaN;
  if (/^\d+$/.test(s)) { const n = Number(s); return n < 1e12 ? n * 1000 : n; }
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/i.exec(s);
  if (!m) return NaN;
  const t = Date.parse(`${m[1]}T${m[2]}${m[3] ? m[3].toUpperCase() : "Z"}`);
  return Number.isFinite(t) ? t : NaN;
}

/** Giờ của MỘT tin Pancake — cùng thứ tự trường với `history.js#messageTime`, đọc bằng `thoiDiemPancake`. */
export const thoiDiemTin = (m) => thoiDiemPancake(m?.inserted_at ?? m?.created_time ?? m?.created_at ?? m?.timestamp);

/* ─────────────── log ai_sale — phép đo DƯƠNG duy nhất rằng ai_sale đã nhường ─────────────── */

// Offset (RAM) từng tệp log, KHOÁ THEO INODE (/code-review GL10 #7: tệp đổi tên — logrotate kiểu `dateext` — giữ inode ⇒ đọc tiếp từ offset
// cũ, không đọc lại log của những ngày ai_sale còn trông page; đo prod 19/10: không có cấu hình logrotate cho aisale-chat, log chỉ lớn dần).
// Lần quét ĐẦU của tiến trình ⇒ offset = kích thước hiện tại (EOF): đọc từ 0 sẽ gặp page id của những ngày ai_sale còn trông page ⇒
// `chua_nhuong` oan (log Saudi 300 MB). Dòng ai_sale ghi lúc worker tắt bị bỏ sót — chấp nhận (nhật ký «offset đặt lại lúc restart»).
// Inode nhỏ đi (copytruncate) ⇒ offset 0. Inode MỚI xuất hiện SAU lần quét đầu ⇒ đọc từ 0 (tệp mới, toàn bộ là mới).
const _log = { daKhoi: false, tep: new Map() };   // `${dev}:${ino}` → { off, duoi, sauBoQua }
/** CHỈ bộ ca: giả «restart worker». */
export function quenLogAiSale() { _log.daKhoi = false; _log.tep.clear(); }

function dsTepLog(tienTo, fsx) {
  const dir = path.dirname(tienTo);
  const dau = path.basename(tienTo);
  let ten;
  try { ten = fsx.readdirSync(dir); } catch { return []; }
  return ten.filter((t) => t.startsWith(dau) && t.endsWith(".log")).sort().map((t) => path.join(dir, t));
}

// Khối ai_sale in khi tra lại danh sách page (đọc `ai_sale.py` :13875-13878 ngày 19/10): «🚨 BỎ QUA <n> page KHÔNG thuộc shop <mkey> …:» rồi
// MỘT dòng tên page (tên trống ⇒ in page id) — page `_v3` NẰM TRONG khối này chính vì ai_sale ĐÃ bỏ nó (bằng chứng nhường, không phải chạm).
// Dòng có «BỎ QUA» và dòng ngay sau «KHÔNG thuộc shop» không tính (/code-review GL10 #3). Chữ đổi ⇒ lùi về khớp thô — chiều an toàn (v3 im).
// Log đọc dạng latin1 (byte giữ nguyên) ⇒ mốc chữ cũng đổi sang latin1.
const L1 = (x) => Buffer.from(x, "utf8").toString("latin1");
const MOC_BO_QUA = L1("BỎ QUA");
const MOC_KHONG_THUOC = L1("KHÔNG thuộc shop");
const TRAN_DUOI = 64 * 1024;
const laSo = (c) => c >= "0" && c <= "9";
/** `pid` xuất hiện như một SỐ trọn vẹn trong dòng (không dính chữ số hai bên — psid/mã đơn dài hơn chứa pid không tính). */
function coPid(dong, pid) {
  for (let i = dong.indexOf(pid); i >= 0; i = dong.indexOf(pid, i + 1)) {
    if (!laSo(dong[i - 1] ?? "") && !laSo(dong[i + pid.length] ?? "")) return true;
  }
  return false;
}

/**
 * MỘT lượt quét log của vòng nạp. Luôn đẩy offset tới phần mới (để byte TRƯỚC khi page vào cửa sổ không bao giờ bị tính); chỉ ĐỌC khi
 * có page đang trong cửa sổ. Xét theo DÒNG trọn (dòng đang ghi dở để vòng sau). KHÔNG lưu, KHÔNG in dòng log (có tên khách) — chỉ trả
 * tập page id đã thấy.
 * @returns {{thay: Set<string>, daDatLai: boolean}}
 */
export function quetLogAiSale(tienTo, pids, deps = {}) {
  const fsx = deps.fs || fs;
  const thay = new Set();
  const daDatLai = !_log.daKhoi;
  const conThay = new Set();
  for (const tep of dsTepLog(tienTo, fsx)) {
    let st;
    try { st = fsx.statSync(tep); } catch { continue; }
    const khoa = `${st.dev}:${st.ino}`;
    const size = Number(st.size);
    conThay.add(khoa);
    let muc = _log.tep.get(khoa);
    if (!muc) { muc = { off: daDatLai ? size : 0, duoi: "", sauBoQua: false }; _log.tep.set(khoa, muc); }
    if (size < muc.off) { muc.off = 0; muc.duoi = ""; muc.sauBoQua = false; }
    if (size === muc.off) continue;
    if (!pids.length) { muc.off = size; muc.duoi = ""; muc.sauBoQua = false; continue; }
    const n = Math.min(TRAN_DOC_LOG, size - muc.off);
    const buf = Buffer.alloc(n);
    let doc = 0;
    let fd = null;
    try {
      fd = fsx.openSync(tep, "r");
      while (doc < n) { const k = fsx.readSync(fd, buf, doc, n - doc, muc.off + doc); if (!k) break; doc += k; }
    } catch { /* đọc hỏng ⇒ vòng sau đọc lại từ offset cũ */ continue; } finally { if (fd != null) { try { fsx.closeSync(fd); } catch { /* bỏ */ } } }
    const chu = muc.duoi + buf.subarray(0, doc).toString("latin1");
    const cuoi = chu.lastIndexOf("\n");
    muc.duoi = (cuoi >= 0 ? chu.slice(cuoi + 1) : chu).slice(-TRAN_DUOI);
    muc.off += doc;
    if (cuoi < 0) continue;
    for (const dong of chu.slice(0, cuoi).split("\n")) {
      const boQua = muc.sauBoQua || dong.includes(MOC_BO_QUA);
      muc.sauBoQua = dong.includes(MOC_KHONG_THUOC);
      if (boQua) continue;
      for (const pid of pids) if (!thay.has(pid) && coPid(dong, pid)) thay.add(pid);
    }
  }
  for (const k of [..._log.tep.keys()]) if (!conThay.has(k)) _log.tep.delete(k);   // tệp đã xoá
  _log.daKhoi = true;
  return { thay, daDatLai };
}

/* ─────────────── worker: lọc page SẴN SÀNG + chuyển trạng thái ─────────────── */

let _canhBao035 = false;
const _demTep = { khoa: null, kq: null };
/** CHỈ bộ ca. */
export function quenDemAiSale() { _canhBao035 = false; _demTep.khoa = null; _demTep.kq = null; }

/** Đọc tệp qua ĐỆM theo (ino, mtimeNs, size) — vòng xử quay 250 ms không đọc lại tệp không đổi. */
export function docTepCoDem(tep, fsx = fs) {
  let st;
  try { st = statTep(fsx, tep); } catch { return docTepGan(tep, fsx); }
  const khoa = `${tep}|${st.ino}|${st.mtimeNs}|${st.size}`;
  if (_demTep.khoa === khoa) return _demTep.kq;
  const kq = docTepGan(tep, fsx);
  try { if (cungBan(statTep(fsx, tep), st)) { _demTep.khoa = khoa; _demTep.kq = kq; } } catch { /* không đệm */ }
  return kq;
}

// `$5` (chờ lại TRỌN — khoá có lại sau mat_khoa/loi_tep/gan_tay) ⇒ đặt lại CẢ `bot_bat_luc` (/code-review GL10 #1): cửa sổ log (+10′30″) và
// trần 30′ «chưa nhường» đo từ lúc chờ lại; mốc tin cũng dời — tin khách trong quãng mất khoá là lúc ai_sale đang trả lời, v3 không trả lời lại.
const SQL_CHUYEN = `UPDATE page SET ai_sale_trang_thai = $3, ai_sale_ly_do = $4,
       bot_bat_luc = CASE WHEN $5::boolean THEN now() ELSE bot_bat_luc END,
       ai_sale_cho_den = CASE WHEN $5::boolean THEN now() + ($6::bigint * interval '1 millisecond') ELSE ai_sale_cho_den END
     WHERE id = $1 AND ai_sale_trang_thai = $2 AND bot_ai_bat = true AND ($7::boolean = false OR ai_sale_cho_den <= now())
     RETURNING id, team_id, page_id, ten, ai_sale_trang_thai, ai_sale_cho_den, (ai_sale_cho_den <= now()) AS het_cho`;
const SQL_GIA_HAN = `UPDATE page SET ai_sale_ly_do = $2,
       ai_sale_cho_den = GREATEST(ai_sale_cho_den, now() + ($3::bigint * interval '1 millisecond'))
     WHERE id = $1 AND ai_sale_trang_thai = 'cho' AND bot_ai_bat = true
     RETURNING id, ai_sale_trang_thai, ai_sale_cho_den, (ai_sale_cho_den <= now()) AS het_cho`;

/** Quyết định của vòng nạp cho MỘT page (thuần — không I/O). `null` = giữ nguyên. */
export function quyetDinhNhuong(row, { tepOk, loiTep, coKhoa, ganTay, thayLog, gio }) {
  const cu = row.ai_sale_trang_thai;
  if (!DANG_CANH.has(cu)) return null;
  if (!tepOk) return cu === "loi_tep" ? null : { tt: "loi_tep", lyDo: `Tệp ai_sale đọc không được lúc ${gio} (giờ VN) — ${loiTep}`.slice(0, 400) };
  if (!coKhoa) return cu === "mat_khoa" ? null : { tt: "mat_khoa", lyDo: `Khoá ${KHOA_V3} của page không còn trong page_gan_them.json lúc ${gio} (giờ VN) — ai_sale trả lời lại page` };
  if (ganTay.length) return cu === "gan_tay" ? null : { tt: "gan_tay", lyDo: `Page bị gắn tay ở khoá ${ganTay.join(", ")} của page_gan_them.json lúc ${gio} (giờ VN) — ai_sale trả lời lại page dù ${KHOA_V3} còn` };
  if (cu === "mat_khoa" || cu === "loi_tep" || cu === "gan_tay") {
    return { tt: "cho", choLaiMs: CHO_AI_SALE_MS, lyDo: `Khoá ai_sale có lại lúc ${gio} (giờ VN) — chờ lại trọn 15′, mốc bật đặt lại (giữa chừng ai_sale có thể đã trả lời lại)` };
  }
  if (thayLog) {
    if (cu === "da_nhuong") return { tt: "chua_nhuong", lyDo: `ai_sale chạm lại page lúc ${gio} (giờ VN)` };
    if (Number(row.tuoi_bat_ms) > TRAN_CHUA_NHUONG_MS) return { tt: "chua_nhuong", lyDo: `ai_sale chưa nhường sau 30′ — còn chạm page lúc ${gio} (giờ VN)` };
    return { giaHan: true, lyDo: `ai_sale còn chạm page lúc ${gio} (giờ VN)` };
  }
  if (cu === "cho" && row.het_cho === true) return { tt: "da_nhuong", canHetCho: true, lyDo: `Bot cũ đã nhường lúc ${gio} (giờ VN) — bot v3 đang trả lời` };
  return null;
}

/**
 * Lọc `choPhep` (GL2: bật ∩ trần) thành `sanSang` — page bot v3 ĐƯỢC nạp và rút tin. Page vào `sanSang` khi và chỉ khi: biến có · tệp
 * đọc được, không hỏng · `_v3[pid]` còn · pid không bị gắn tay (khoá dict khác `_v3`) · trạng thái `da_nhuong` (chỉ vòng nạp — nơi đọc
 * log — mới đưa `cho` qua mốc `ai_sale_cho_den` thành `da_nhuong`) và `now() >= ai_sale_cho_den`.
 *
 * `chuyen` (vòng nạp, `!boQuaNap`): quét log + CHUYỂN trạng thái — UPDATE có điều kiện trạng thái cũ, nhật ký chỉ khi có dòng trả về
 * (bốn vòng worker chạy đồng thời — không ghi đôi). Vòng xử (`chuyen:false`): chỉ lọc theo CSDL + tệp qua đệm, không đọc log.
 * CSDL chưa áp 035 (42703) ⇒ `[]` + cảnh báo MỘT lần, không sập.
 * @returns {Promise<{sanSang: string[], dem: object}>}
 */
export async function locNhuongAiSale(pool, choPhep, { chuyen = false, env = process.env, fs: fsx = fs } = {}) {
  const dem = { sanSang: 0, cho: 0, chan: 0, chua035: false, logDatLai: false };
  const tienToLog = String(env?.[BIEN_LOG] ?? "").trim();
  const ds = (choPhep || []).map(String);
  if (!ds.length) {
    if (chuyen && tienToLog) dem.logDatLai = quetLogAiSale(tienToLog, [], { fs: fsx }).daDatLai;
    return { sanSang: [], dem };
  }
  let rows;
  try {
    rows = (await pool.query(
      `SELECT id, team_id, page_id, ten, bot_bat_luc, ai_sale_cho_den, ai_sale_trang_thai,
              (ai_sale_cho_den <= now()) AS het_cho, now() AS bay,
              EXTRACT(EPOCH FROM (now() - bot_bat_luc)) * 1000 AS tuoi_bat_ms
         FROM page WHERE bot_ai_bat = true AND page_id = ANY($1::text[])`, [ds])).rows;
  } catch (e) {
    if (e?.code !== "42703") throw e;
    if (!_canhBao035) {
      _canhBao035 = true;
      console.warn("[ai-sale-nhuong] CSDL chưa áp 035 — bot v3 không trả lời page nào (chưa có cột chờ ai_sale nhường). Chạy `node --env-file=.env db/migrate.js`.");
    }
    dem.chua035 = true;
    return { sanSang: [], dem };
  }
  const tep = tepGan(env);
  const kqTep = tep ? docTepCoDem(tep, fsx) : { ok: false, loi: `máy chạy bot thiếu biến ${BIEN_TEP_GAN}` };
  let thay = new Set();
  if (chuyen && tienToLog) {
    const trongCuaSo = rows.filter((r) => (r.ai_sale_trang_thai === "cho" || r.ai_sale_trang_thai === "da_nhuong")
      && r.tuoi_bat_ms != null && Number(r.tuoi_bat_ms) >= MO_CUA_SO_LOG_MS).map((r) => String(r.page_id));
    const q = quetLogAiSale(tienToLog, trongCuaSo, { fs: fsx });
    thay = q.thay;
    dem.logDatLai = q.daDatLai;
  }
  const sanSang = [];
  for (const row of rows) {
    const pid = String(row.page_id);
    const tepOk = kqTep.ok;
    const coKhoa = tepOk && coKhoaV3(kqTep.d, pid);
    const ganTay = tepOk ? khoaGanTay(kqTep.d, pid) : [];
    let tt = row.ai_sale_trang_thai;
    let hetCho = row.het_cho === true;
    if (chuyen) {
      const qd = quyetDinhNhuong(row, { tepOk, loiTep: kqTep.loi, coKhoa, ganTay, thayLog: thay.has(pid), gio: gioVN(row.bay) });
      if (qd?.giaHan) {
        const r = await pool.query(SQL_GIA_HAN, [row.id, qd.lyDo, GIA_HAN_LOG_MS]);
        hetCho = r.rows[0]?.het_cho === true;
        if (!r.rowCount) tt = "?";
      } else if (qd) {
        const r = await pool.query(SQL_CHUYEN, [row.id, tt, qd.tt, qd.lyDo, qd.choLaiMs != null, qd.choLaiMs ?? 0, !!qd.canHetCho]);
        if (r.rowCount) {
          await ghiNhatKy(pool, {
            teamId: row.team_id, tacNhan: TAC_NHAN, hanhDong: `ai_sale_${qd.tt}`, doiTuong: "page", doiTuongId: pid,
            truoc: { ai_sale_trang_thai: tt }, sau: { ai_sale_trang_thai: qd.tt, ai_sale_cho_den: r.rows[0].ai_sale_cho_den },
            ghiChu: `Page «${row.ten || pid}»: ${qd.lyDo}`.slice(0, 400),
          }).catch((e) => console.warn(`[ai-sale-nhuong] ghi nhật ký chuyển trạng thái lỗi: ${e?.message || e}`));
          tt = qd.tt;
          hetCho = r.rows[0].het_cho === true;
        } else {
          tt = "?";   // vòng khác / người gạt vừa đổi dòng ⇒ vòng này không cho page đi (vòng sau đọc lại)
        }
      }
    }
    const di = tepOk && coKhoa && !ganTay.length && tt === "da_nhuong" && hetCho;
    if (di) sanSang.push(pid);
    else if (tt === "cho") dem.cho += 1;
    else dem.chan += 1;
  }
  dem.sanSang = sanSang.length;
  return { sanSang, dem };
}

/** Vì sao worker không nạp page nào dù có page bật — câu đi vào `ket.nap.lyDo`. */
export function lyDoChuaNhuong(dem = {}) {
  if (dem.chua035) return "CSDL chưa áp 035 — bot v3 không trả lời page nào (chưa có cột chờ ai_sale nhường).";
  return `Có page bật nhưng chưa page nào sẵn sàng: ${dem.cho || 0} đang chờ ai_sale nhường · ${dem.chan || 0} bị chặn `
    + "(mất khoá / tệp ai_sale hỏng / gắn tay / ai_sale chưa nhường / chưa gạt lại sau 035) — xem cột Bot ở màn Page & Bot.";
}
