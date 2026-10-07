// NGẮT CẢ PAGE KHI KÊNH PANCAKE LỖI (PHIẾU GL4) — nguyên tắc 9 README «biết dừng khi kênh lỗi».
//
// v1 ngắt CẢ PAGE 30′ sau 2 lần GỬI lỗi liên tiếp (Meta #2022 — `pancake-poll.js` cũ). v3 trước GL4 chỉ lùi THEO TIN: page bị
// Pancake/Meta chặn thì MỖI khách vẫn tốn một vòng (lượt bộ não + POST hỏng bắn vào page đang bị phạt) rồi bị giao sale.
//
// LUẬT (người quyết 05/10 + review (a) hai vòng):
//   · HAI bộ đếm trên dòng `page` (migration 034): đọc OK chỉ xoá chuỗi ĐỌC; gửi THẬT SỰ OK xoá CẢ HAI. Mỗi tin đọc TRƯỚC rồi
//     mới gửi — một bộ đếm chung thì lượt đọc OK xoá chuỗi gửi trước mỗi lần gửi hỏng ⇒ không bao giờ chạm 2 (C1).
//   · Đếm theo TIN KHÁC NHAU: hai lượt thử của cùng một tin là MỘT lỗi (`loi_<kiểu>_tin_cuoi`).
//   · Chạm `NGUONG_LOI_KENH` ⇒ ngắt `PHUT_NGAT` phút (đồng hồ CSDL), ghi lý do đọc được, về 0 cả hai bộ đếm, MỘT dòng
//     `nhat_ky page_ngat_kenh`. Đang ngắt thì KHÔNG đếm thêm, KHÔNG ngắt chồng (tin đang bay của vòng xử khác không được làm
//     «mở xong 1 lỗi là ngắt lại» — R2-N3).
//   · Hết hạn ⇒ mở lại ĐÚNG MỘT lần (UPDATE có điều kiện; 4 vòng của tiến trình cùng thấy hết hạn vẫn chỉ một dòng
//     `page_mo_lai_kenh`). Sau khi mở phải đủ 2 lỗi (tin khác nhau) mới ngắt lại.
//
// MỌI hàm ghi nhận `pool` RIÊNG (worker truyền `poolGui`) và chạy NGOÀI giao dịch tin: thiếu cột (mã chạy trước 034, hay `down`
// lúc mã mới đang chạy) mà ghi bằng client giao dịch thì giao dịch abort ⇒ lượt ĐÃ GỬI bị lật thành `loi` + HANDOFF (review N2).
// Lỗi ở đây bị NUỐT + cảnh báo MỘT lần: GL4 hỏng thì «không ngắt», không làm hỏng lượt xử.
//
// BỘ NHỚ CHUNG CỦA TIẾN TRÌNH (`_ngat`): bốn vòng (1 nạp + 3 xử) cùng một tiến trình. `ghiLoiKenh` ghi page vừa ngắt vào đây
// NGAY ⇒ cả ba vòng xử thấy trước lượt rút kế tiếp (`worker.js#chayMotVong` lọc `pageIds`); `motLuot` đọc lại CSDL mỗi vòng
// (`dsPageDangNgat`). Lượt làm mới chỉ THÊM / kéo dài; một mục chỉ bị bỏ khi `ngat_den` của nó đã qua theo đồng hồ CSDL hoặc
// lượt mở lại trả về dòng đó — lát đọc cũ không được xoá một ngắt vừa ghi (R2-N2).
import { ghiNhatKy } from "../db/index.js";

/** Số lỗi kênh liên tiếp (tin khác nhau) thì ngắt — chữ người quyết «2 lỗi». */
export const NGUONG_LOI_KENH = 2;
/** Ngắt bao lâu — chữ người quyết «30′». */
export const PHUT_NGAT = 30;
/** `ly_do_day` của dòng việc cho tin GỬI lỗi (② 6) — đèn `ngat_kenh` đếm «tin cần đối chiếu» bằng đúng chuỗi này. */
export const LY_DO_VIEC_GUI_LOI = "Gửi không rõ đã tới khách — đối chiếu ở Vận hành trước khi trả AI";

const TAC_NHAN = "may:l2-worker";
const _ngat = new Map();   // page_id (id Facebook) → { vi, den: ms theo đồng hồ CSDL, lyDo }
const _daCanhBao = new Set();

// Cảnh báo MỘT lần cho mỗi LOẠI lỗi (thiếu cột 034 là một loại; lỗi khác theo việc + mã) — một lỗi thoáng qua đầu tiên không được
// nuốt mất lời báo «chưa áp 034» về sau (/code-review #7). Số dòng có trần: vài việc × vài mã, không theo số vòng.
function nuot(e, viec) {
  const thieuCot = e?.code === "42703";
  const khoa = thieuCot ? "42703" : `${viec}:${e?.code || e?.name || "?"}`;
  if (_daCanhBao.has(khoa)) return;
  _daCanhBao.add(khoa);
  console.warn(thieuCot
    ? "[ngat-page] CSDL chưa có cột ngắt kênh (migration 034) — GL4 KHÔNG ngắt page nào cho tới khi áp 034."
    : `[ngat-page] ${viec} lỗi (${e?.code || e?.name || "?"}: ${e?.message || e}) — bỏ qua, không làm hỏng lượt xử. Cảnh báo một lần.`);
}

const den = (x) => (x == null ? null : new Date(x).getTime());

/**
 * Ghi MỘT lỗi kênh của một tin (② 2). Một câu UPDATE nguyên tử: chỉ tăng bộ đếm `kieu` khi `tinId` khác tin của lỗi trước;
 * chạm ngưỡng ⇒ ngắt. Biểu thức SET đọc chính dòng (bản mới nhất khi hai vòng cùng ghi) — không đọc-rồi-ghi.
 * @returns {Promise<null|{pageId:string, vi:string, den:number, lyDo:string}>} page vừa ngắt, hoặc null.
 */
export async function ghiLoiKenh(pool, { teamId, pageId, tinId, kieu, lyDo }) {
  const c = kieu === "gui" ? "gui" : "doc";
  const k = c === "gui" ? "doc" : "gui";
  const moi = `(CASE WHEN loi_${c}_tin_cuoi IS NOT DISTINCT FROM $3::bigint THEN loi_${c}_lien_tiep ELSE loi_${c}_lien_tiep + 1 END)`;
  const cham = `(${moi} >= $4)`;
  try {
    const r = await pool.query(
      `UPDATE page SET
          loi_${c}_lien_tiep = CASE WHEN ${cham} THEN 0 ELSE ${moi} END,
          loi_${c}_tin_cuoi  = CASE WHEN ${cham} THEN NULL ELSE $3::bigint END,
          loi_${k}_lien_tiep = CASE WHEN ${cham} THEN 0 ELSE loi_${k}_lien_tiep END,
          loi_${k}_tin_cuoi  = CASE WHEN ${cham} THEN NULL ELSE loi_${k}_tin_cuoi END,
          ngat_den   = CASE WHEN ${cham} THEN now() + ($5::int * interval '1 minute') ELSE ngat_den END,
          ngat_vi    = CASE WHEN ${cham} THEN $6 ELSE ngat_vi END,
          ngat_ly_do = CASE WHEN ${cham} THEN $7 ELSE ngat_ly_do END
        WHERE team_id = $1 AND page_id = $2 AND ngat_ly_do = ''
        RETURNING id, team_id, page_id, ten, ngat_vi, ngat_den, ngat_ly_do`,
      [teamId, String(pageId), tinId == null ? null : String(tinId), NGUONG_LOI_KENH, PHUT_NGAT, c, String(lyDo || "lỗi kênh Pancake").slice(0, 300)],
    );
    const p = r.rows[0];
    if (!p || p.ngat_ly_do === "") return null;
    const muc = { vi: p.ngat_vi, den: den(p.ngat_den), lyDo: p.ngat_ly_do };
    _ngat.set(String(p.page_id), muc);
    await ghiNhatKy(pool, {
      teamId: p.team_id, tacNhan: TAC_NHAN, hanhDong: "page_ngat_kenh", doiTuong: "page", doiTuongId: String(p.page_id),
      sau: { ngat_vi: p.ngat_vi, ngat_den: new Date(muc.den).toISOString(), tin_cuoi: tinId == null ? null : String(tinId) },
      ghiChu: `Page «${p.ten || p.page_id}» ngắt ${p.ngat_vi === "gui" ? "gửi" : "đọc"} ${PHUT_NGAT}′ sau ${NGUONG_LOI_KENH} lỗi kênh liên tiếp — ${p.ngat_ly_do}`.slice(0, 400),
    }).catch((e) => nuot(e, "ghi nhật ký ngắt"));
    return { pageId: String(p.page_id), ...muc };
  } catch (e) {
    nuot(e, "ghi lỗi kênh");
    return null;
  }
}

/** Đọc OK ⇒ CHỈ xoá chuỗi ĐỌC. Không sinh lượt ghi khi đã sạch (worker gọi mỗi tin). */
export async function ghiDocTot(pool, { teamId, pageId }) {
  try {
    await pool.query(
      `UPDATE page SET loi_doc_lien_tiep = 0, loi_doc_tin_cuoi = NULL
        WHERE team_id = $1 AND page_id = $2 AND (loi_doc_lien_tiep <> 0 OR loi_doc_tin_cuoi IS NOT NULL)`,
      [teamId, String(pageId)]);
  } catch (e) { nuot(e, "ghi đọc tốt"); }
}

/** Gửi THẬT SỰ OK (tin/ảnh đã tới Pancake) ⇒ xoá CẢ HAI chuỗi. Nơi gọi chỉ gọi khi lượt có gửi thật — không phải mọi XONG. */
export async function ghiGuiTot(pool, { teamId, pageId }) {
  try {
    await pool.query(
      `UPDATE page SET loi_doc_lien_tiep = 0, loi_gui_lien_tiep = 0, loi_doc_tin_cuoi = NULL, loi_gui_tin_cuoi = NULL
        WHERE team_id = $1 AND page_id = $2
          AND (loi_doc_lien_tiep <> 0 OR loi_gui_lien_tiep <> 0 OR loi_doc_tin_cuoi IS NOT NULL OR loi_gui_tin_cuoi IS NOT NULL)`,
      [teamId, String(pageId)]);
  } catch (e) { nuot(e, "ghi gửi tốt"); }
}

/**
 * Mở lại mọi page đã hết hạn ngắt — ĐÚNG MỘT lần mỗi page: UPDATE có điều kiện `ngat_ly_do <> ''`; vòng thứ hai chờ khoá dòng
 * rồi thấy điều kiện sai ⇒ 0 dòng ⇒ không ghi nhật ký. Job nền quét MỌI team (như `chay-worker.js#dsPageDeNap`).
 */
export async function moLaiPageHetHan(pool) {
  try {
    const r = await pool.query(
      `UPDATE page SET ngat_ly_do = '', ngat_vi = '',
              loi_doc_lien_tiep = 0, loi_gui_lien_tiep = 0, loi_doc_tin_cuoi = NULL, loi_gui_tin_cuoi = NULL
        WHERE ngat_ly_do <> '' AND ngat_den <= now()
        RETURNING id, team_id, page_id, ten, ngat_den`);
    for (const p of r.rows) {
      _ngat.delete(String(p.page_id));
      await ghiNhatKy(pool, {
        teamId: p.team_id, tacNhan: TAC_NHAN, hanhDong: "page_mo_lai_kenh", doiTuong: "page", doiTuongId: String(p.page_id),
        ghiChu: `Page «${p.ten || p.page_id}» hết ${PHUT_NGAT}′ ngắt kênh — bot thử lại; đủ ${NGUONG_LOI_KENH} lỗi nữa thì ngắt lại.`,
      }).catch((e) => nuot(e, "ghi nhật ký mở lại"));
    }
    return r.rows.map((p) => String(p.page_id));
  } catch (e) {
    nuot(e, "mở lại page hết hạn");
    return [];
  }
}

/**
 * Đọc trạng thái ngắt từ CSDL — `ngat_den > now()` tính TRONG SQL (đồng hồ CSDL — án lệ lệch giờ `kho.js`). Page còn hạn hợp nhất
 * vào bộ nhớ chung (chỉ thêm/kéo dài theo CSDL; bỏ mục đã hết hạn theo `now()` của CHÍNH câu này). Câu riêng — KHÔNG đụng
 * `page-routing.js` (nguồn của 6 màn + preflight). Thiếu cột ⇒ không gì + cảnh báo một lần, bộ nhớ giữ nguyên.
 * @returns {Promise<{ds: Array<{pageId:string, vi:string, den:number, lyDo:string}>, hetHan: boolean}>} `hetHan` — có page đã
 *   tới giờ mà chưa mở (cần `moLaiPageHetHan`).
 */
async function docNgat(pool) {
  let r;
  try {
    r = await pool.query(
      `SELECT now() AS bay, p.page_id, p.ngat_vi, p.ngat_den, p.ngat_ly_do, (p.ngat_den > now()) AS con
         FROM (SELECT 1) x
         LEFT JOIN page p ON p.ngat_ly_do <> ''`);
  } catch (e) {
    nuot(e, "đọc page đang ngắt");
    return { ds: [], hetHan: false };
  }
  const bay = den(r.rows[0]?.bay);
  const co = r.rows.filter((x) => x.page_id != null);
  const ds = co.filter((x) => x.con === true)
    .map((x) => ({ pageId: String(x.page_id), vi: x.ngat_vi, den: den(x.ngat_den), lyDo: x.ngat_ly_do }));
  for (const x of ds) _ngat.set(x.pageId, { vi: x.vi, den: x.den, lyDo: x.lyDo });
  for (const [pid, m] of _ngat) if (!ds.some((x) => x.pageId === pid) && m.den <= bay) _ngat.delete(pid);
  return { ds, hetHan: co.some((x) => x.con !== true) };
}

/** Page ĐANG ngắt theo CSDL (còn hạn) — đọc rồi hợp nhất vào bộ nhớ chung. */
export async function dsPageDangNgat(pool) {
  return (await docNgat(pool)).ds;
}

/**
 * MỘT lượt làm mới của `motLuot`: đọc trạng thái ngắt (MỘT câu SELECT khi rảnh — bốn vòng quay ~4 lần/giây, /code-review #8) và
 * CHỈ khi có page đã tới giờ mà chưa mở mới chạy câu mở lại (UPDATE có điều kiện — vẫn đúng một lần dù bốn vòng cùng thấy).
 */
export async function lamMoiNgat(pool) {
  const { hetHan } = await docNgat(pool);
  if (hetHan) await moLaiPageHetHan(pool);
}

/** Lọc page đang ngắt (bộ nhớ chung) khỏi danh sách rút. `null` (mọi page — chỉ bộ ca gọi trần) không lọc được. */
export function locPageNgat(pageIds) {
  return Array.isArray(pageIds) ? pageIds.filter((p) => !_ngat.has(String(p))) : pageIds;
}

/** Ảnh chụp bộ nhớ chung — cho `motLuot` (bỏ nạp page ngắt vì ĐỌC, in số page ngắt). */
export function pageDangNgat() {
  return [..._ngat].map(([pageId, m]) => ({ pageId, ...m }));
}

/** CHỈ bộ ca: xoá bộ nhớ chung giữa hai hộp cát. */
export function xoaBoNhoNgat() { _ngat.clear(); }

/* ─────────────── câu lý do — đọc được, KHÔNG token / URL ─────────────── */

const boUrl = (s) => String(s || "")
  .replace(/\s*\((?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) [^)]*\)/g, "")
  .replace(/https?:\/\/\S+/g, "…")
  .replace(/access_token=[^&\s)]+/g, "access_token=…")
  .trim();

/** Lý do ngắt vì ĐỌC — từ câu của `LoiDocLichSu` (câu lỗi `pkDocTin`), bỏ đường dẫn, gắn «(đọc)». */
export function cauLyDoDoc(thongDiep) {
  return `${boUrl(String(thongDiep || "").replace(/^Pancake không trả lịch sử:\s*/, "")).slice(0, 200) || "Pancake không trả lịch sử"} (đọc)`;
}

/** Lý do ngắt vì GỬI — từ `chiTiet` mà `lan-gui.js#bocCuaGuiBen` lấy ra từ kết quả của cửa (`pancake.js#dauLoiGui`). */
export function cauLyDoGui(chiTiet = {}) {
  const ma = (Array.isArray(chiTiet.ma) ? chiTiet.ma : []).find((m) => [103, 105, 121].includes(Number(m)));
  if (ma != null) return `Pancake từ chối gửi (mã ${ma})`;
  const loi = boUrl(chiTiet.error).slice(0, 160);
  if (chiTiet.quaHan) {
    const n = /quá hạn (\d+) ms/.exec(String(chiTiet.error || ""))?.[1];
    return `quá hạn ${n ? `${n} ms ` : ""}chờ Pancake (gửi)`;
  }
  if (chiTiet.khongRo) {
    return `Pancake lỗi mạng khi gửi (${chiTiet.phaLoi === "ket_noi" ? "không kết nối được" : "đứt giữa chừng — có thể đã tới khách"})`;
  }
  return `Pancake/Meta từ chối gửi — ${loi || "không rõ lý do"}`;
}

/** HH:MM giờ Việt Nam (UTC+7 cố định — VN không có giờ mùa hè), không phụ thuộc múi giờ của máy. */
export function gioVN(t) {
  const ms = new Date(t).getTime();
  if (!Number.isFinite(ms)) return "?";
  const d = new Date(ms + 7 * 3600e3);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
