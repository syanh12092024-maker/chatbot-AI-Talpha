// UI-HT2 · DANH SÁCH HỘI THOẠI cho BÀN HỘI THOẠI (CR-28-09). CHỈ ĐỌC.
//
// Ba lát, ba đường đọc — vì ba lát khác hẳn nhau về cỡ:
//   · «Cần người»   — hội thoại có VIỆC ĐANG MỞ. Tập nhỏ; đi qua `hangCho` của điều phối
//                     (đã xếp theo hạn, đã gộp tên khách/page/đồng hồ) — không có công thức thứ hai.
//   · «Bot đang xử» · «Tất cả» — hội thoại chạm trong `CUA_SO_NGAY` ngày, mới nhất trước.
//   · Tìm            — theo psid hoặc số điện thoại khách (phép so BẰNG — rẻ).
//
// ĐO 28/09 trên máy chủ (nhật ký `phieu-UI-HT2.md`): team Tiểu Alpha có 28.953 hội thoại, kéo cả
// bảng = 19,6 MB và 440 ms riêng ở Postgres. Cổng dữ liệu thật KHÔNG có LIMIT và KHÔNG đẩy phép so
// khoảng xuống Postgres (`noi-day/cong-du-lieu-that.js` ②·③b) ⇒ lọc «7 ngày» qua cổng là kéo cả
// bảng mỗi lần bấm tab. Nên hai lát sau đọc bằng SQL có LIMIT (`taoDocHoiThoaiSql`, tiêm từ
// `chay-that.js`), `team_id` luôn là `$1` lấy từ bối cảnh. Không tiêm (bộ ca, bản xem thử) thì lùi
// về cổng — đúng cho dữ liệu nhỏ, và phải NÓI mình đang đi đường nào (`nguonDs`).

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { congTruyVan, hangCho, tenKhachCua, soDienThoaiCua, tenPageCua } from '../dispatch/kho-viec.js';
import { convIdCua } from '../dispatch/lien-ket.js';
import { tenMessengerCua } from './doc-hoi-thoai.js';
import { CHU_TRANG_THAI_DON } from './boi-canh-hoi-thoai.js';

export const CUA_SO_NGAY = 7;
export const TOI_DA_DONG = 100;
export const LOC = Object.freeze({ NGUOI: 'nguoi', BOT: 'bot', TAT: 'tat' });
const LOC_HOP_LE = new Set(Object.values(LOC));

const chuoi = (v) => (v == null ? '' : String(v).trim());

export class LoiBanHoiThoai extends Error {
  constructor(chiTiet, ma = 'ban_hoi_thoai_hong', status = 500) {
    super(`Bàn hội thoại: ${chiTiet}`);
    this.name = 'LoiBanHoiThoai'; this.ma = ma; this.status = status;
  }
}

/** @type {null | ((bc:any, bo:{chiBot:boolean, tim:string|null, tuLuc:number, gioiHan:number}) => Promise<object[]>)} */
let _docSql = null;
/** Tiêm bộ đọc SQL có LIMIT (`taoDocHoiThoaiSql(pool)`). Bỏ trống ⇒ lùi về cổng, nói ra ở `nguonDs`. */
export function datDocHoiThoaiSql(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiBanHoiThoai('datDocHoiThoaiSql cần một hàm');
  _docSql = fn || null;
  return _docSql;
}
export const daNoiDocSql = () => typeof _docSql === 'function';

/**
 * Bộ đọc SQL: đúng MỘT câu, `team_id = $1` từ bối cảnh (không nhận team từ nơi gọi), LIMIT.
 * Tìm: psid khớp, HOẶC khách có số điện thoại khớp (trong CÙNG team).
 */
export function taoDocHoiThoaiSql(pool) {
  if (!pool || typeof pool.query !== 'function') throw new LoiBanHoiThoai('taoDocHoiThoaiSql cần một pool');
  return async (boiCanh, { chiBot = false, tim = null, tuLuc = 0, gioiHan = TOI_DA_DONG } = {}) => {
    const bc = batBuocBoiCanh(boiCanh);
    const { rows } = await pool.query(
      `SELECT h.id, h.psid, h.page_id, h.khach_id, h.trang_thai, h.chu_so_huu, h.ly_do_cuoi, h.ai_noi_gi, h.cham_luc
         FROM hoi_thoai h
        WHERE h.team_id = $1
          AND ($2::boolean IS NOT TRUE OR h.chu_so_huu = 'AI')
          AND CASE WHEN $3::text IS NULL THEN h.cham_luc > to_timestamp($4::double precision / 1000)
                   ELSE h.psid = $3 OR h.khach_id IN (SELECT k.id FROM khach k WHERE k.team_id = $1 AND k.so_dien_thoai = $3)
              END
        ORDER BY h.cham_luc DESC NULLS LAST, h.id DESC
        LIMIT $5`,
      [bc.teamId, !!chiBot, tim || null, Number(tuLuc) || 0, Math.min(Number(gioiHan) || TOI_DA_DONG, TOI_DA_DONG)],
    );
    return rows.map((r) => ({ ...r, id: String(r.id), page_id: String(r.page_id),
      khach_id: r.khach_id == null ? null : String(r.khach_id),
      cham_luc: r.cham_luc instanceof Date ? r.cham_luc.getTime() : r.cham_luc }));
  };
}

/** Đường lùi qua cổng (bộ ca, bản xem thử): cùng hợp đồng với bộ đọc SQL. */
async function docQuaCong(db, { chiBot, tim, tuLuc, gioiHan }) {
  let ds;
  if (tim) {
    const khach = await db.chon('khach', { so_dien_thoai: tim });
    const theoKhach = (await Promise.all(khach.map((k) => db.chon('hoi_thoai', { khach_id: String(k.id) })))).flat();
    const theoPsid = await db.chon('hoi_thoai', { psid: tim });
    ds = [...new Map([...theoPsid, ...theoKhach].map((h) => [String(h.id), h])).values()];
  } else {
    ds = await db.chon('hoi_thoai', { cham_luc: { '>': tuLuc } });
  }
  if (chiBot) ds = ds.filter((h) => h.chu_so_huu === 'AI');
  return ds.sort((a, b) => (Number(b.cham_luc) || 0) - (Number(a.cham_luc) || 0)).slice(0, gioiHan);
}

/** Một dòng màn hình. `viec` = việc đang mở của hội thoại (nếu có), đã gộp sẵn bởi `hangCho`. */
function dongMan(h, { khach, page, viec }) {
  return {
    id: String(h.id),
    tenKhach: tenKhachCua(khach),
    // UI-HT3: 29.527/29.563 hội thoại máy chủ chưa nối hồ sơ khách (28/09) — không có dòng này
    // thì gần như cả danh sách là «Khách chưa có tên». Tên Messenger lấy từ Sổ AI bot cũ; màn
    // hiện nó KHI hồ sơ không có tên, và nói rõ nó là tên Messenger.
    tenMessenger: tenMessengerCua(convIdCua(h, page)),
    soDienThoai: soDienThoaiCua(khach),
    tenPage: tenPageCua(page),
    giaiDoan: h.trang_thai || null,
    nguoiGiu: h.chu_so_huu || null,
    lyDoCuoi: chuoi(h.ly_do_cuoi) || null,
    aiNoiGi: chuoi(h.ai_noi_gi) || null,
    chamLuc: h.cham_luc == null ? null : Number(h.cham_luc),
    viec: viec ? {
      id: String(viec.id), loai: viec.loai, hanLuc: Number(viec.han_luc),
      lyDoChu: viec.lyDoChu, trangThai: viec.trangThai, tenNguoiNhan: viec.tenNguoiNhan || null,
    } : null,
  };
}

/**
 * Danh sách cho cột trái của bàn hội thoại.
 *
 * @param {{loc?:string, tim?:string, bay?:number}} bo
 * `ht` (LL2) = mã MỘT hội thoại: trả đúng dòng đó (hoặc rỗng), bỏ qua `loc`/`tim`.
 * @returns {Promise<{loc:string, tim:string|null, ht:string|null, items:object[], demCanNguoi:number,
 *   donKhongHoiThoai:number, cuaSoNgay:number, nguonDs:'viec_mo'|'sql'|'cong'|'mot', catBot:boolean, bay:number}>}
 */
export async function danhSachHoiThoai(boiCanh, { loc = LOC.NGUOI, tim = '', ht = '', bay = Date.now() } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!LOC_HOP_LE.has(loc)) throw new LoiBanHoiThoai(`lát lạ: ${loc}`, 'loc_la', 400);
  const t = chuoi(tim).replace(/\s+/g, '') || null;
  const db = congTruyVan(bc);

  // Việc đang mở — cần cho MỌI lát (tab «Cần người» đếm nó; lát khác gắn đồng hồ vào dòng có việc).
  const viecMo = await hangCho(bc, { bay, gioiHan: 500 });
  const viecTheoHt = new Map();
  for (const v of viecMo) if (v.hoi_thoai_id != null && !viecTheoHt.has(String(v.hoi_thoai_id))) viecTheoHt.set(String(v.hoi_thoai_id), v);
  const donKhongHoiThoai = viecMo.filter((v) => v.hoi_thoai_id == null).length;

  let hts; let nguonDs;
  const mot = chuoi(ht);
  if (mot) {
    // LL2 · mở THẲNG một hội thoại theo mã (từ tab Đơn chờ, từ Tìm khách) — qua cổng, nên team
    // khác hay không có đều ra danh sách rỗng, không lộ «có hội thoại này ở team khác».
    hts = /^[A-Za-z0-9_-]{1,40}$/.test(mot) ? [await db.mot('hoi_thoai', { id: mot })].filter(Boolean) : [];
    nguonDs = 'mot';
  } else if (!t && loc === LOC.NGUOI) {
    hts = (await Promise.all([...viecTheoHt.keys()].map((id) => db.mot('hoi_thoai', { id })))).filter(Boolean);
    nguonDs = 'viec_mo';
  } else {
    const bo = { chiBot: loc === LOC.BOT, tim: t, tuLuc: bay - CUA_SO_NGAY * 86_400_000, gioiHan: TOI_DA_DONG };
    if (_docSql) { hts = await _docSql(bc, bo); nguonDs = 'sql'; }
    else { hts = await docQuaCong(db, bo); nguonDs = 'cong'; }
  }

  const pages = new Map((await db.chon('page', {})).map((p) => [String(p.id), p]));
  const items = await Promise.all(hts.map(async (h) => dongMan(h, {
    khach: h.khach_id != null ? await db.mot('khach', { id: String(h.khach_id) }) : null,
    page: pages.get(String(h.page_id)) || null,
    viec: viecTheoHt.get(String(h.id)) || null,
  })));
  if (nguonDs === 'viec_mo') items.sort((a, b) => a.viec.hanLuc - b.viec.hanLuc);

  return { loc, tim: t, ht: mot || null, items, demCanNguoi: viecTheoHt.size, donKhongHoiThoai,
    cuaSoNgay: CUA_SO_NGAY, nguonDs, catBot: items.length >= TOI_DA_DONG, bay };
}

/* ═══ LL2 · ĐƠN CHỜ (tab của Hộp thư) ═══════════════════════════════════════════════════════
 * Ba loại đơn đang chờ NGƯỜI, đọc qua cổng (kẹp team):
 *   · Messenger chờ duyệt — `hang_cho_tao_don` còn `cho_duyet` (bot đã chốt, sale duyệt là tạo
 *     đơn POS, 01 §1). Mỗi đơn gắn MỘT hội thoại ⇒ bấm là mở hội thoại, duyệt ở cột bên.
 *   · Việc loại ĐƠN không gắn hội thoại — nghi trùng, đơn chờ không có chat (`hangCho`).
 *   · Đơn Ladi đang ở luồng xác nhận WhatsApp (`don_hang` nguồn `trang_ban_hang`, ba trạng thái
 *     của nhánh WhatsApp). Máy chủ 29/09: 0 — luồng WhatsApp chưa chạy (việc người H1); màn NÓI
 *     điều đó thay vì để trống câm.
 */
export const TRANG_THAI_LADI_CHO = Object.freeze(['cho_gui_wa', 'da_gui_wa', 'gui_wa_loi']);
export const TOI_DA_DON_CHO = 100;

const ms = (v) => (v == null ? null : Number(v instanceof Date ? v.getTime() : v));

export async function donCho(boiCanh, { bay = Date.now() } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const [hang, viecMo, ladiTat] = await Promise.all([
    db.chon('hang_cho_tao_don', { trang_thai: 'cho_duyet' }),
    hangCho(bc, { bay, gioiHan: 500 }),
    db.chon('don_hang', { nguon: 'trang_ban_hang', trang_thai_he: [...TRANG_THAI_LADI_CHO] }),
  ]);
  const pages = new Map((await db.chon('page', {})).map((p) => [String(p.id), p]));

  // Cũ nhất trước — đơn chờ lâu nhất là đơn khách dễ bỏ nhất.
  const moi = [...hang].sort((a, b) => (ms(a.tao_luc) || 0) - (ms(b.tao_luc) || 0)).slice(0, TOI_DA_DON_CHO);
  const idHt = [...new Set(moi.map((o) => String(o.hoi_thoai_id)))];
  const hts = new Map((idHt.length ? await db.chon('hoi_thoai', { id: idHt }) : []).map((h) => [String(h.id), h]));
  const messenger = moi.map((o) => {
    const h = hts.get(String(o.hoi_thoai_id)) || null;
    const d = o.du_lieu_don || {};
    return {
      id: String(o.id), hoiThoaiId: String(o.hoi_thoai_id),
      ten: chuoi(d.ten) || null, soDienThoai: chuoi(d.sdt) || null,
      soLuong: Number.isFinite(Number(d.so_luong)) ? Number(d.so_luong) : null,
      tongTien: Number.isFinite(Number(d.tong_tien)) ? Number(d.tong_tien) : null, tienTe: d.tien_te || null,
      tenPage: tenPageCua(h ? pages.get(String(h.page_id)) : null), taoLuc: ms(o.tao_luc),
    };
  });

  const viecDon = viecMo.filter((v) => v.hoi_thoai_id == null).map((v) => ({
    id: String(v.id), donHangId: v.don_hang_id == null ? null : String(v.don_hang_id),
    lyDoChu: v.lyDoChu, hanLuc: Number(v.han_luc), trangThai: v.trangThai, tenNguoiNhan: v.tenNguoiNhan || null,
  }));

  const ladi = [...ladiTat].sort((a, b) => (ms(b.tao_luc) || 0) - (ms(a.tao_luc) || 0))
    .slice(0, TOI_DA_DON_CHO).map((d) => ({
      id: String(d.id), maPos: d.ma_pos || null, trangThai: d.trang_thai_he,
      trangThaiChu: CHU_TRANG_THAI_DON[d.trang_thai_he] || d.trang_thai_he,
      tongTien: d.tong_tien == null ? null : Number(d.tong_tien), tienTe: d.tien_te || null,
      tenPage: tenPageCua(d.page_id == null ? null : pages.get(String(d.page_id))), taoLuc: ms(d.tao_luc),
    }));

  return {
    messenger, viecDon, ladi,
    dem: { messenger: hang.length, viecDon: viecDon.length, ladi: ladiTat.length },
    catBot: hang.length > TOI_DA_DON_CHO || ladiTat.length > TOI_DA_DON_CHO,
    bay,
  };
}
