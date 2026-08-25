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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import {
  cayKichBan, banCuaPage, luuBanNhap, duaLenLive,
  VAI_SUA_DUOC as VAI_SUA, VAI_DUYET_DUOC, LoiKichBan,
} from './kho-kich-ban.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

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

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Kịch bản cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Không đủ quyền</h1><p>${escHtml(cau)}</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('kich-ban.html'), (e) => (e ? next(e) : undefined));
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
