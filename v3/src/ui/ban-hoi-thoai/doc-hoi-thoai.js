// UI-HT1 · ĐỌC HỘI THOẠI cho BÀN HỘI THOẠI (CR-28-09, `01-QUYET-DINH.md` §10 mới).
//
// Đọc THẲNG lịch sử Pancake lúc mở — KHÔNG lưu bản sao nào vào CSDL (lý do bỏ đoạn chat
// 23/08 ở đầu `chi-tiet.js` vẫn đúng: dựng từ `so_ai` là dựng nửa cuộc nói chuyện). Chỉ GET,
// không đụng van gửi.
//
// BA ĐIỀU ĐÃ ĐO trên máy chủ 28/09 (nhật ký `docs/thi-cong/nhat-ky/phieu-UI-HT1.md`):
//   1. Mã hội thoại Pancake = `<page_id_fb>_<psid>` — đúng khuôn `convIdCua` (lien-ket.js);
//      2/3 page thật đọc được 13 và 10 tin với mã dựng như vậy.
//   2. Pancake BẮT BUỘC `customer_id` («Thiếu mã khách hàng»). CSDL v3 chỉ giữ mã khách ở
//      `tin_cho_xu_ly.cust_id` — 0 hội thoại có trên máy chủ (chưa tin nào qua v3). Sổ AI của
//      bot cũ phủ 26.774/28.953 hội thoại (92,5%). Hết nguồn thì NÓI RA, không gọi Pancake.
//   3. `pkGetMessages` của bot cũ trả `[]` khi Pancake báo lỗi (page thứ ba: «Không tìm thấy
//      gói cước…») — nên đường đọc tiêm vào đây phải trả `{ ok, messages | loi }`.
//
// Chặn team: đọc `hoi_thoai` và `page` qua cổng đã gắn team TRƯỚC khi đụng Pancake — hội
// thoại team khác ⇒ `null` ⇒ router 404 (cùng luật `chi-tiet.js`), và không một lượt gọi nào.

// Module RIÊNG (không nằm trong `dispatch/`): nó đọc cột THẬT `tin_cho_xu_ly.cust_id`, mà
// thước «không còn tên cột B tự đoán» của module điều phối cấm cả chữ `cust_id` (tên từng bị
// bịa trên bảng việc). Dùng chung cổng team và công thức mã hội thoại của điều phối.
import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { congTruyVan, LoiDieuPhoi } from '../dispatch/kho-viec.js';
import { convIdCua, lienKetPancake } from '../dispatch/lien-ket.js';

/** Bản nhớ mỗi hội thoại: 20 sale mở cùng một hội thoại không thành 20 lượt gọi Pancake. */
export const NHO_HOI_THOAI_MS = 60_000;
/** Pancake trả tối đa ~60 tin gần nhất là đủ cho một lượt đọc trước khi nhảy sang Pancake. */
const TOI_DA_TIN = 60;

const chuoi = (v) => (v == null ? '' : String(v).trim());

/** @type {null | ((pageId:string, convId:string, custId:string) => Promise<{ok:boolean, messages?:any[], loi?:string}>)} */
let _docTin = null;
/** @type {null | ((convId:string) => string|null)} */
let _traMaKhachSoAi = null;
/** @type {null | ((convId:string) => string|null)} */
let _tenSoAi = null;
/** @type {null | ((convId:string) => string[])} */
let _dauCauAi = null;
/** @type {null | ((text:string) => boolean)} */
let _laTinTuDong = null;
/** @type {null | ((convId:string) => {soLuot:number, cuoiLuc:number|null})} */
let _luotBotCu = null;
/** @type {null | ((bc:any, bo:{pageFb:string, psid:string}) => Promise<{maKhach:string|null, gui:object[]}>)} */
let _docDauVet = null;
let _dongHo = () => Date.now();

/** Tiêm đường đọc tin Pancake (`src/pancake.js#pkDocTin`). Bản xem thử tiêm bản GIẢ. */
export function datDocTinPancake(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datDocTinPancake cần một hàm');
  _docTin = fn || null;
  return _docTin;
}
/** Tiêm bộ tra mã khách từ Sổ AI của bot cũ (`taoTraMaKhachSoAi(readLog)`). */
export function datTraMaKhachSoAi(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datTraMaKhachSoAi cần một hàm');
  _traMaKhachSoAi = fn || null;
  return _traMaKhachSoAi;
}
/**
 * UI-HT3: tiêm CẢ chỉ mục Sổ AI (`taoChiMucSoAi`) — mã khách, tên Messenger, đầu câu bot đã trả
 * lời. Một lần đọc sổ cho ba câu hỏi.
 */
export function datChiMucSoAi(chiMuc) {
  _traMaKhachSoAi = chiMuc?.maKhach || null;
  _tenSoAi = chiMuc?.ten || null;
  _dauCauAi = chiMuc?.dauCauAi || null;
  _luotBotCu = chiMuc?.luot || null;
  return chiMuc || null;
}
/**
 * UI-HT3: tiêm bộ đọc DẤU VẾT v3 của một hội thoại (`taoDocDauVetV3Sql(pool)`): mã khách mới
 * nhất ở `tin_cho_xu_ly` + các lần bot v3 đã gửi (`lan_gui`).
 *
 * BẮT BUỘC trên máy chủ: hai bảng đó KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn
 * (`src/db/truy-van.js`), nên cổng dữ liệu thật NÉM khi đọc chúng — bản UI-HT1 đọc qua cổng
 * xanh trên cổng giả và sẽ 500 với MỌI hội thoại trên máy chủ (bắt được 28/09, trước deploy).
 * Không tiêm (bộ ca, bản xem thử) thì đọc qua cổng — chỉ đúng với cổng giả.
 */
export function datDocDauVetV3(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datDocDauVetV3 cần một hàm');
  _docDauVet = fn || null;
  return _docDauVet;
}
export const daNoiDauVetV3 = () => typeof _docDauVet === 'function';
/** UI-HT3: bộ nhận tin MÁY (Botcake/RTO) — `src/bot-registry.js#isAutomationTemplate`. */
export function datLaTinTuDong(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datLaTinTuDong cần một hàm');
  _laTinTuDong = fn || null;
  return _laTinTuDong;
}
/** Tên Messenger của khách theo Sổ AI bot cũ — cho hội thoại CHƯA nối hồ sơ khách (99,9% máy chủ 28/09). */
export const tenMessengerCua = (convId) => (_tenSoAi && convId ? _tenSoAi(String(convId)) : null);
/** Số lượt bot CŨ đã trả lời hội thoại này, theo Sổ AI của nó — `null` khi chưa nối sổ. */
export const luotBotCuCua = (convId) => (_luotBotCu && convId ? _luotBotCu(String(convId)) : null);

/** Đồng hồ cho bản nhớ — tiêm để bộ ca đo được hết hạn mà không phải chờ. */
export function datDongHoHoiThoai(fn) { _dongHo = typeof fn === 'function' ? fn : () => Date.now(); }
export const daNoiDocTin = () => typeof _docTin === 'function';

const _nho = new Map(); // maHoiThoai → { luc, kq } | { dang: Promise }
export function xoaNhoHoiThoai() { _nho.clear(); }

/**
 * Chỉ mục `conv → cust` từ Sổ AI của bot cũ. Đọc MỘT lần cho nhiều lượt tra, đọc lại sau
 * `nhipMs` (sổ 15 MB — đọc mỗi lượt mở hội thoại là trả 300ms cho mỗi cú bấm). Dòng sau
 * thắng dòng trước: sổ ghi theo thời gian, dòng sau là mã mới nhất.
 *
 * @param {() => Array<{conv?:string, cust?:string}>} docSo  thường là `readLog` của `src/ai-log.js`
 */
export function taoTraMaKhachSoAi(docSo, bo = {}) {
  return taoChiMucSoAi(docSo, bo).maKhach;
}

/** Chữ so khớp: bỏ thẻ HTML, gộp khoảng trắng, chữ thường. */
export const chuanChu = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
/** Đầu câu dùng để so: Sổ AI chỉ giữ 80 ký tự đầu câu bot trả lời — so 60 cho chừa chỗ gọt HTML. */
const DAU_CAU = 60;
/** Ngắn hơn thế thì «ok», «dạ» của sale cũng khớp — không đủ để gọi là tin của bot. */
const DAU_CAU_TOI_THIEU = 12;

/**
 * Chỉ mục Sổ AI bot cũ: `conv → { mã khách · tên Messenger · đầu câu bot đã trả lời }`.
 *
 * ĐO 28/09 trên 23 hội thoại thật đọc được (nhật ký UI-HT3): trường `from` của Pancake KHÔNG
 * tách được bot với sale — 29/29 tin page khớp Sổ AI chỉ mang `uid`, và 54 tin KHÔNG khớp cũng
 * mang đúng `uid`. Nên «tin AI» xác định bằng ĐẦU CÂU khớp bản ghi `reply` của chính Sổ AI
 * (`text` = 80 ký tự đầu câu trả lời — `src/pancake-poll.js`, lệnh `logAi(…'reply'…)`).
 */
export function taoChiMucSoAi(docSo, { nhipMs = 5 * 60_000, dongHo = () => Date.now() } = {}) {
  let cm = null;
  let luc = -Infinity;
  const nap = () => {
    if (cm && dongHo() - luc <= nhipMs) return cm;
    cm = { khach: new Map(), ten: new Map(), ai: new Map(), luot: new Map() };
    for (const r of docSo() || []) {
      const c = chuoi(r?.conv);
      if (!c) continue;
      const k = chuoi(r?.cust);
      if (k) cm.khach.set(c, k);
      const t = chuoi(r?.name);
      if (t) cm.ten.set(c, t);
      if (r?.type === 'reply') {
        const l = cm.luot.get(c) || { soLuot: 0, cuoiLuc: null };
        l.soLuot += 1;
        if (Number.isFinite(r?.t) && (l.cuoiLuc == null || r.t > l.cuoiLuc)) l.cuoiLuc = r.t;
        cm.luot.set(c, l);
        const d = chuanChu(r?.text).slice(0, DAU_CAU);
        if (d.length >= DAU_CAU_TOI_THIEU) {
          const ds = cm.ai.get(c) || [];
          if (ds.length < 400) ds.push(d);
          cm.ai.set(c, ds);
        }
      }
    }
    luc = dongHo();
    return cm;
  };
  return {
    maKhach: (convId) => nap().khach.get(chuoi(convId)) || null,
    ten: (convId) => nap().ten.get(chuoi(convId)) || null,
    dauCauAi: (convId) => nap().ai.get(chuoi(convId)) || [],
    luot: (convId) => nap().luot.get(chuoi(convId)) || { soLuot: 0, cuoiLuc: null },
  };
}

/** Trần số lần gửi v3 đem ra đối chiếu — khung chat chỉ hiện `TOI_DA_TIN` tin gần nhất. */
const TOI_DA_GUI = 200;
/**
 * Lần gửi nào có thể đã tới khách: `da_gui`, và `khong_ro` (gửi rồi mà không chắc — tin có trên
 * Pancake thì khớp, không có thì không khớp gì). `dang_gui`/`dien_tap` chưa bao giờ rời hệ.
 */
const GUI_CO_THE_TOI = ['da_gui', 'khong_ro'];

/**
 * Bộ đọc dấu vết v3 bằng SQL: ĐÚNG hai câu, `team_id = $1` từ bối cảnh, có LIMIT. Chỉ mục:
 * `tin_cho_xu_ly_conv (page_id, conv_id)` cho câu đầu, `UNIQUE(team_id,tin_id,buoc)` cho phép nối.
 */
export function taoDocDauVetV3Sql(pool) {
  if (!pool || typeof pool.query !== 'function') throw new LoiDieuPhoi('taoDocDauVetV3Sql cần một pool');
  return async (boiCanh, { pageFb, psid }) => {
    const bc = batBuocBoiCanh(boiCanh);
    const [ma, gui] = await Promise.all([
      pool.query(
        `SELECT cust_id FROM tin_cho_xu_ly
          WHERE team_id = $1 AND page_id = $2 AND psid = $3 AND cust_id <> ''
          ORDER BY id DESC LIMIT 1`,
        [bc.teamId, pageFb, psid]),
      pool.query(
        `SELECT l.provider_id, l.noi_dung FROM lan_gui l
           JOIN tin_cho_xu_ly t ON t.id = l.tin_id AND t.team_id = l.team_id
          WHERE l.team_id = $1 AND t.page_id = $2 AND t.psid = $3
            AND l.loai = 'guiTin' AND l.trang_thai = ANY($4)
          ORDER BY l.id DESC LIMIT $5`,
        [bc.teamId, pageFb, psid, GUI_CO_THE_TOI, TOI_DA_GUI]),
    ]);
    return { maKhach: chuoi(ma.rows[0]?.cust_id) || null, gui: gui.rows };
  };
}

/** Đường lùi qua cổng (bộ ca, bản xem thử) — CÙNG hợp đồng với `taoDocDauVetV3Sql`. */
async function dauVetQuaCong(db, { pageFb, psid }) {
  const tin = await db.chon('tin_cho_xu_ly', { page_id: pageFb, psid });
  const coMa = tin.filter((t) => chuoi(t.cust_id));
  const moiNhat = coMa.length ? coMa.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a)) : null;
  const gui = (await Promise.all(tin.map((t) => db.chon('lan_gui', { tin_id: t.id })))).flat()
    .filter((g) => g.loai === 'guiTin' && GUI_CO_THE_TOI.includes(g.trang_thai))
    .sort((a, b) => Number(b.id) - Number(a.id)).slice(0, TOI_DA_GUI);
  return { maKhach: moiNhat ? chuoi(moiNhat.cust_id) : null, gui };
}

/** Mã khách Pancake, theo thứ tự nguồn. Trả `{ cust, nguon }` hoặc `null`. */
function maKhachCua(dv, ma) {
  if (dv.maKhach) return { cust: dv.maKhach, nguon: 'hang_doi_v3' };
  const k = _traMaKhachSoAi ? _traMaKhachSoAi(ma) : null;
  return k ? { cust: chuoi(k), nguon: 'so_ai_bot_cu' } : null;
}

/** Chữ của một lần gửi v3: `noi_dung` = `JSON.stringify(args[2])` (`src/queue/lan-gui.js#bocCuaGuiBen`). */
const chuLanGui = (v) => chuanChu(typeof v === 'string' ? v : (v?.text ?? v?.message ?? ''));

/**
 * Dấu nhận TIN BOT của một hội thoại: mã tin Pancake bot v3 đã gửi (`lan_gui.provider_id` — khớp
 * CHÍNH XÁC) + đầu câu (lần gửi v3 và Sổ AI bot cũ).
 */
function dauHieuBot(dv, ma) {
  const maTin = new Set(dv.gui.map((g) => chuoi(g.provider_id)).filter(Boolean));
  const dau = [
    ...dv.gui.map((g) => chuLanGui(g.noi_dung).slice(0, DAU_CAU)),
    ...(_dauCauAi ? _dauCauAi(ma) : []),
  ].filter((d) => d.length >= DAU_CAU_TOI_THIEU);
  return { maTin, dau };
}

/**
 * Nguồn của một tin page — CHỈ theo điều đo được:
 *   ai       — khớp mã tin bot v3, hoặc đầu câu bot đã ghi (v3 · Sổ AI bot cũ)
 *   tu_dong  — luồng Botcake (`from.flow_id`), hoặc mẫu máy (`isAutomationTemplate`)
 *   page     — còn lại: sale gõ tay HOẶC bot ngoài dữ liệu đối chiếu. KHÔNG đoán là sale.
 */
function nguonTinPage(m, dh) {
  if (dh.maTin.has(chuoi(m?.id))) return 'ai';
  const t = chuanChu(m?.original_message || m?.message);
  if (t && dh.dau.some((d) => t.startsWith(d))) return 'ai';
  if (chuoi(m?.from?.flow_id)) return 'tu_dong';
  if (_laTinTuDong && _laTinTuDong(String(m?.original_message || m?.message || ''))) return 'tu_dong';
  return 'page';
}

/** Một tin Pancake → dạng màn hình cần. Cùng cách gọt với `van-hanh/router.js`. */
function gonTin(m, pageFb, dh) {
  const laPage = chuoi(m?.from?.id) === pageFb;
  return {
    luc: m?.inserted_at || null,
    laPage,
    nguon: laPage ? nguonTinPage(m, dh) : 'khach',
    ten: chuoi(m?.from?.name),
    text: String(m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

async function docTuPancake(pageFb, ma, cust, dh) {
  if (!_docTin) {
    return { lichSu: [], lichSuLoi: 'Máy chủ chưa nối đường đọc Pancake (datDocTinPancake) — mở Pancake để đọc.' };
  }
  try {
    const kq = await _docTin(pageFb, ma, cust);
    if (!kq || !kq.ok) {
      return { lichSu: [], lichSuLoi: `Pancake không trả tin: ${chuoi(kq?.loi) || 'không rõ lý do'}` };
    }
    const ds = Array.isArray(kq.messages) ? kq.messages : [];
    return { lichSu: ds.slice(-TOI_DA_TIN).map((m) => gonTin(m, pageFb, dh)), lichSuLoi: null };
  } catch (e) {
    return { lichSu: [], lichSuLoi: `Không gọi được Pancake: ${chuoi(e?.message || e).slice(0, 200)}` };
  }
}

/**
 * Lịch sử một hội thoại, đọc thẳng Pancake.
 *
 * @returns {Promise<null | {hoiThoaiId:string, maHoiThoai:string|null, nguonMa:string|null,
 *   lichSu:Array<{luc:string|null, laPage:boolean, nguon:'khach'|'ai'|'tu_dong'|'page', ten:string, text:string}>,
 *   lichSuLoi:string|null,
 *   docLuc:number}>}  `null` = không có hội thoại này TRONG TEAM (router trả 404).
 */
export async function docHoiThoai(boiCanh, hoiThoaiId) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const id = chuoi(hoiThoaiId);
  if (!id) return null;
  const h = await db.mot('hoi_thoai', { id });
  if (!h) return null;
  const p = h.page_id != null ? await db.mot('page', { id: String(h.page_id) }) : null;
  const ma = convIdCua(h, p);
  // `pancake`: nút «Trả lời trên Pancake» cho MỌI hội thoại, kể cả khi không có việc mở.
  const dau = { hoiThoaiId: id, maHoiThoai: ma, pancake: lienKetPancake(p?.page_id, ma) };
  if (!ma) {
    return { ...dau, nguonMa: null, lichSu: [], docLuc: _dongHo(),
      lichSuLoi: 'Hội thoại thiếu page hoặc mã khách Facebook — không dựng được mã hội thoại Pancake.' };
  }

  const bay = _dongHo();
  const o = _nho.get(ma);
  if (o?.kq && bay - o.luc <= NHO_HOI_THOAI_MS) return { ...o.kq, hoiThoaiId: id };
  if (o?.dang) return { ...(await o.dang), hoiThoaiId: id };

  const dang = (async () => {
    const pageFb = chuoi(p.page_id);
    const bo = { pageFb, psid: chuoi(h.psid) };
    const dv = _docDauVet ? await _docDauVet(bc, bo) : await dauVetQuaCong(db, bo);
    const mk = maKhachCua(dv, ma);
    const doc = mk
      ? await docTuPancake(pageFb, ma, mk.cust, dauHieuBot(dv, ma))
      : { lichSu: [], lichSuLoi: 'Chưa có mã khách Pancake cho hội thoại này — hội thoại chưa qua hàng đợi v3 và không có trong Sổ AI của bot cũ. Bấm «Trả lời trên Pancake» để đọc ở đó.' };
    return { ...dau, nguonMa: mk ? mk.nguon : null, ...doc, docLuc: _dongHo() };
  })();
  _nho.set(ma, { dang });
  try {
    const kq = await dang;
    _nho.set(ma, { luc: _dongHo(), kq });
    return kq;
  } catch (e) {
    _nho.delete(ma);
    throw e;
  }
}
