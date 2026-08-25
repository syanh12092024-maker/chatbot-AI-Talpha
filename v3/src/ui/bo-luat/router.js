// ĐƯỜNG HTTP CỦA MÀN «BỘ LUẬT CHUNG» (G2-C1).
//
// | GET  /bo-luat                  | trang                                                |
// | GET  /api/bo-luat              | mọi phiên bản + bản đang áp + số page bị ảnh hưởng   |
// | GET  /api/bo-luat/:id/so-sanh  | bản này khác bản ĐANG ÁP chỗ nào, theo từng dòng     |
// | POST /api/bo-luat/nhap         | lưu bản nháp — KHÔNG áp        (chỉ `quan-tri`)      |
// | POST /api/bo-luat/:id/ap       | áp / lùi về một bản            (chỉ `quan-tri`)      |
//
// HAI ĐƯỜNG GHI TÁCH HẲN NHAU, và đó là cả thiết kế của màn này: soạn xong KHÔNG áp. Gộp
// «lưu» với «áp» vào một nút là bỏ mất cửa duyệt mà tiêu chí nghiệm thu sóng 1 đòi.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import {
  manBoLuat, soVoiDangAp, luuBanNhap, apPhienBan, VAI_SUA_DUOC, LoiBoLuat,
} from './kho-bo-luat.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** Người duyệt kịch bản XEM được (họ cần biết luật chung nói gì để duyệt kịch bản cho khớp),
 *  nhưng KHÔNG sửa được — `01-QUYET-DINH.md` §9 tách rõ hai việc. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.DUYET_KICH_BAN]);
export const DUONG_TRANG = '/bo-luat';

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
export const daNoiChanBoLuat = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[bo-luat] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Bộ luật chung.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[bo-luat] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
      thongDiep: `Bộ luật chung dùng chung cho mọi page của team — chỉ vai ${VAI_SUA_DUOC.join(', ')} `
        + `sửa được. Vai của bạn: ${bc.vai.join(', ') || 'không có'}.`,
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
  console.error('[bo-luat] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterBoLuat() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Bộ luật chung cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Không đủ quyền xem bộ luật chung</h1><p>${escHtml(cau)}</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('bo-luat.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/bo-luat', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    res.json({ ok: true, ...(await manBoLuat(bc)), suaDuoc: coVai(bc, ...VAI_SUA_DUOC) });
  }));

  r.get('/api/bo-luat/:id/so-sanh', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, ...(await soVoiDangAp(cuaBoiCanh(req), req.params.id)) });
  }));

  r.post('/api/bo-luat/nhap', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await luuBanNhap(cuaBoiCanh(req), {
      noiDung: req.body?.noiDung, ghiChu: req.body?.ghiChu,
    });
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/bo-luat/:id/ap', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await apPhienBan(cuaBoiCanh(req), req.params.id, { lyDo: req.body?.lyDo });
    res.json({ ok: true, ...kq });
  }));

  return r;
}

export { LoiBoLuat };
