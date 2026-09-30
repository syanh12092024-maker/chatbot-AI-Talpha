// ĐƯỜNG HTTP CỦA MÀN «KỊCH BẢN» + «SOẠN KỊCH BẢN» (G2-D1 · G2-D2).
//
// | GET  /kich-ban                    | trang: cây + ô soạn                              |
// | GET  /api/kich-ban/cay            | cây theo nước → page, kèm tầng nào đang trống    |
// | GET  /api/kich-ban/page/:id       | mọi bản của một page + bản LIVE                  |
// | POST /api/kich-ban/page/:id/nhap  | BƯỚC 1→2: lưu bản người, tự dựng bản máy         |
// | POST /api/kich-ban/page/:id/live  | đưa một bản lên LIVE  (qua TIẾN TRÌNH BOT)       |
// | POST /api/kich-ban/nhap-pancake   | bóc file kịch bản Pancake → bản nháp             |
//
// HAI ĐƯỜNG GHI TÁCH HẲN: soạn xong KHÔNG lên LIVE. Và «lên LIVE» đòi vai KHÁC với «soạn» —
// `01-QUYET-DINH.md` §9: kịch bản người viết áp thẳng, nhưng đây là cửa duyệt của team.

import express from 'express';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep } from '../chung/http.js';
import { VAI_VAO_DUOC as VAI_MOT_PAGE } from '../mot-page/router.js';
import { VAI_VAO_DUOC as VAI_PAGE_BOT } from '../page-bot/router.js';
import {
  cayKichBan, banCuaPage, luuBanNhap, duaLenLive, luuVaChay,
  VAI_SUA_DUOC as VAI_SUA, VAI_DUYET_DUOC, LoiKichBan,
} from './kho-kich-ban.js';

export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER, VAI.QUAN_LY, VAI.DUYET_KICH_BAN]);
export const VAI_SUA_DUOC = VAI_SUA;
export const DUONG_TRANG = '/kich-ban';

/* Bóc file kịch bản Pancake — tiêm từ ngoài, vì bộ bóc nằm ở `src/` (đất người A). */
let _bocPancake = null;
export function datBocPancake(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKichBan('datBocPancake cần một hàm');
  _bocPancake = fn || null;
  return _bocPancake;
}
export const daNoiBocPancake = () => typeof _bocPancake === 'function';

let _chanDangNhap = null;
let _chanVai = null;

function dungChan(fn, ten, ...thamSo) {
  if (fn == null) return null;
  if (typeof fn !== 'function') throw new TypeError(`${ten}: cần một hàm.`);
  if (fn.length >= 3) return fn;
  const mw = fn(...thamSo);
  if (typeof mw !== 'function') throw new TypeError(`${ten}: hàm dựng không trả về middleware.`);
  return mw;
}

export function datChanDangNhap(fn) { _chanDangNhap = dungChan(fn, 'datChanDangNhap'); }
export function datChanVai(fn) { _chanVai = dungChan(fn, 'datChanVai', ...VAI_VAO_DUOC); }
export const daNoiChanKichBan = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[kich-ban] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho Kịch bản.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[kich-ban] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
  if (res.headersSent) return undefined;
  return res.status(500).json({ ok: false, ma: 'chan_hong', thongDiep: `Lớp chặn ${ten} gặp lỗi.` });
}

function chay(ten, mw, req, res, next) {
  try {
    const kq = mw(req, res, next);
    if (kq && typeof kq.then === 'function') return kq.then(undefined, (e) => chanHong(ten, e, res));
    return kq;
  } catch (e) { return chanHong(ten, e, res); }
}

const chanDangNhapMw = () => (req, res, next) => (
  _chanDangNhap ? chay('datChanDangNhap', _chanDangNhap, req, res, next) : chanChuaNoi('datChanDangNhap')(req, res)
);
const chanVaiMw = () => (req, res, next) => (
  _chanVai ? chay('datChanVai', _chanVai, req, res, next) : chanChuaNoi('datChanVai')(req, res)
);

function chanGhiMw(req, res, next) {
  let bc;
  try { bc = cuaBoiCanh(req); } catch { return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' }); }
  if (!coVai(bc, ...VAI_SUA_DUOC)) {
    return res.status(403).json({
      ok: false, ma: 'thieu_vai',
      thongDiep: `Chỉ vai ${VAI_SUA_DUOC.join(', ')} soạn được kịch bản. Vai của bạn: ${bc.vai.join(', ') || 'không có'}.`,
    });
  }
  return next();
}

function traLoi(res, e) {
  if (e instanceof LoiChuaDangNhap) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
  if (e instanceof LoiThieuVai) return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: e.message });
  if (e && typeof e.status === 'number' && e.ma) {
    return res.status(e.status).json({ ok: false, ma: e.ma, thongDiep: e.message });
  }
  console.error('[kich-ban] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterKichBan() {
  const r = express.Router();

  // VE2b · 30/09 (người quyết: «K còn màn kichban nữa vì cài vào page rồi»): màn Kịch bản GỘP vào trang một page — soạn
  // ở tab «Lời bot», các bản ở tab «Lịch sử» (bản vẽ BanDo: kich-ban → «Page › tab Lời bot + Lịch sử»). Đường cũ KHÔNG
  // chết: nó chuyển THEO VAI (tiền lệ `/san-sang`) — có page ⇒ tab Lời bot của page đó; trần ⇒ danh sách lọc sẵn
  // «chưa có lời bot riêng» (con số màn này từng báo); vai không mở được trang page ⇒ màn đầu của mình, không 403.
  // Các cửa `/api/kich-ban/*` bên dưới GIỮ NGUYÊN — hai tab kia đọc/ghi qua đúng chúng.
  r.get(DUONG_TRANG, (req, res) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    const page = String(req.query.page || '').trim();
    if (!coVai(bc, ...VAI_MOT_PAGE)) return res.redirect('/');
    if (page) return res.redirect(`/page/${encodeURIComponent(page)}?tab=loi`);
    return res.redirect(coVai(bc, ...VAI_PAGE_BOT) ? '/page-bot?loc=chua_loi_bot' : '/page?loc=chua_loi_bot');
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/kich-ban/cay', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    res.json({
      ok: true,
      ...(await cayKichBan(bc, { tim: req.query.tim || '' })),
      suaDuoc: coVai(bc, ...VAI_SUA_DUOC),
      duyetDuoc: coVai(bc, ...VAI_DUYET_DUOC),
      bocPancakeDuoc: daNoiBocPancake(),
    });
  }));

  r.get('/api/kich-ban/page/:id', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    res.json({
      ok: true,
      ...(await banCuaPage(bc, req.params.id)),
      suaDuoc: coVai(bc, ...VAI_SUA_DUOC),
      duyetDuoc: coVai(bc, ...VAI_DUYET_DUOC),
    });
  }));

  r.post('/api/kich-ban/page/:id/nhap', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await luuBanNhap(cuaBoiCanh(req), req.params.id, {
      nguoi: req.body?.nguoi, ghiChu: req.body?.ghiChu,
    });
    res.json({ ok: true, ...kq });
  }));

  // CR-28-09b · MN6: LƯU LÀ CHẠY — vai soạn (quản trị · marketer), đúng §9 đã ký.
  r.post('/api/kich-ban/page/:id/luu-chay', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await luuVaChay(cuaBoiCanh(req), req.params.id, {
      nguoi: req.body?.nguoi, ghiChu: req.body?.ghiChu,
    });
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/kich-ban/page/:id/live', canDangNhap, canVai, boc(async (req, res) => {
    // KHÔNG dùng `chanGhiMw`: đưa lên LIVE đòi vai KHÁC với soạn. `duaLenLive` tự kiểm.
    const kq = await duaLenLive(cuaBoiCanh(req), req.params.id, req.body?.id, { lyDo: req.body?.lyDo });
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/kich-ban/nhap-pancake', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    if (!_bocPancake) {
      throw new LoiKichBan(
        'chưa nối bộ bóc file Pancake — máy chủ dựng thiếu một dây. Đây là lỗi cấu hình, '
        + 'KHÔNG phải "file này không đọc được".', 'chua_noi', 500,
      );
    }
    const b64 = String(req.body?.dataBase64 || '').replace(/^data:.*?;base64,/, '');
    if (!b64) throw new LoiKichBan('thiếu file.', 'thieu_tham_so');
    // Bộ bóc chỉ TRẢ VỀ bản nháp — không ghi gì. Người dùng xem rồi mới bấm lưu.
    res.json({ ok: true, nhap: await _bocPancake(b64) });
  }));

  return r;
}

export { LoiKichBan };
