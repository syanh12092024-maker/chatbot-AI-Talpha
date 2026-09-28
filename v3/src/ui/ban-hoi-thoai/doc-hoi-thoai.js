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
export function taoTraMaKhachSoAi(docSo, { nhipMs = 5 * 60_000, dongHo = () => Date.now() } = {}) {
  let chiMuc = null;
  let luc = -Infinity;
  return (convId) => {
    if (!chiMuc || dongHo() - luc > nhipMs) {
      chiMuc = new Map();
      for (const r of docSo() || []) {
        const c = chuoi(r?.conv), k = chuoi(r?.cust);
        if (c && k) chiMuc.set(c, k);
      }
      luc = dongHo();
    }
    return chiMuc.get(chuoi(convId)) || null;
  };
}

/** Mã khách Pancake, theo thứ tự nguồn. Trả `{ cust, nguon }` hoặc `null`. */
async function maKhachCua(db, pageFb, psid, ma) {
  const tin = await db.chon('tin_cho_xu_ly', { page_id: pageFb, psid });
  const coMa = tin.filter((t) => chuoi(t.cust_id));
  if (coMa.length) {
    const moiNhat = coMa.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
    return { cust: chuoi(moiNhat.cust_id), nguon: 'hang_doi_v3' };
  }
  const k = _traMaKhachSoAi ? _traMaKhachSoAi(ma) : null;
  return k ? { cust: chuoi(k), nguon: 'so_ai_bot_cu' } : null;
}

/** Một tin Pancake → dạng màn hình cần. Cùng cách gọt với `van-hanh/router.js`. */
function gonTin(m, pageFb) {
  return {
    luc: m?.inserted_at || null,
    laPage: chuoi(m?.from?.id) === pageFb,
    ten: chuoi(m?.from?.name),
    text: String(m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

async function docTuPancake(pageFb, ma, cust) {
  if (!_docTin) {
    return { lichSu: [], lichSuLoi: 'Máy chủ chưa nối đường đọc Pancake (datDocTinPancake) — mở Pancake để đọc.' };
  }
  try {
    const kq = await _docTin(pageFb, ma, cust);
    if (!kq || !kq.ok) {
      return { lichSu: [], lichSuLoi: `Pancake không trả tin: ${chuoi(kq?.loi) || 'không rõ lý do'}` };
    }
    const ds = Array.isArray(kq.messages) ? kq.messages : [];
    return { lichSu: ds.slice(-TOI_DA_TIN).map((m) => gonTin(m, pageFb)), lichSuLoi: null };
  } catch (e) {
    return { lichSu: [], lichSuLoi: `Không gọi được Pancake: ${chuoi(e?.message || e).slice(0, 200)}` };
  }
}

/**
 * Lịch sử một hội thoại, đọc thẳng Pancake.
 *
 * @returns {Promise<null | {hoiThoaiId:string, maHoiThoai:string|null, nguonMa:string|null,
 *   lichSu:Array<{luc:string|null, laPage:boolean, ten:string, text:string}>, lichSuLoi:string|null,
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
    const mk = await maKhachCua(db, pageFb, chuoi(h.psid), ma);
    const doc = mk
      ? await docTuPancake(pageFb, ma, mk.cust)
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
