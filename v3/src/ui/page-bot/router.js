// ĐƯỜNG HTTP CỦA MÀN «PAGE & BOT» (G2-B2).
//
// | GET    /page-bot                    | trang                                            |
// | GET    /api/page-bot/danh-sach      | danh sách đã lọc + số đếm + trạng thái cửa ghi   |
// | POST   /api/page-bot/:id/bot        | gạt công tắc BOT AI   (qua tiến trình bot v1)    |
// | POST   /api/page-bot/:id/marketer   | gán marketer          (CSDL v3)                  |
// | POST   /api/page-bot/:id/trong-diem | cờ page trọng điểm    (CSDL v3)                  |
//
// Page của team khác → **404**, không phải 403 (403 xác nhận dòng đó có thật ở team khác).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import { danhSachPage, LOC, CHU_LOC, MOI_TRANG, LoiPageBot } from './kho-page.js';
import {
  datCongTacBot, ganMarketer, datTrongDiem, trangThaiCau,
  VAI_SUA_DUOC, CANH_BAO_MARKETER, PHIEU_MARKETER,
} from './cong-tac.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** Vào được: quản trị + quản lý. Sửa được: chỉ quản trị (tầng ghi tự kiểm lại). */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);
export const DUONG_TRANG = '/page-bot';

let _chanDangNhap = null;
let _chanVai = null;

function dungChan(fn, ten, ...thamSo) {
  if (fn == null) return null;
  if (typeof fn !== 'function') {
    throw new TypeError(`${ten}: cần một hàm — hoặc hàm dựng cái chắn, hoặc cái chắn (req,res,next) đã dựng sẵn.`);
  }
  if (fn.length >= 3) return fn;
  const mw = fn(...thamSo);
  if (typeof mw !== 'function') throw new TypeError(`${ten}: hàm dựng không trả về middleware.`);
  return mw;
}

export function datChanDangNhap(fn) { _chanDangNhap = dungChan(fn, 'datChanDangNhap'); }
export function datChanVai(fn) { _chanVai = dungChan(fn, 'datChanVai', ...VAI_VAO_DUOC); }
export const daNoiChanPageBot = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[page-bot] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Page & Bot.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[page-bot] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
      thongDiep: `Chỉ vai ${VAI_SUA_DUOC.join(', ')} sửa được page. Vai của bạn: ${bc.vai.join(', ') || 'không có'}.`,
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
  console.error('[page-bot] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));
const laBat = (v) => v === true || v === 'true' || v === 1 || v === '1';

export function taoRouterPageBot() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Page & Bot cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:420px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Màn này cần vai Quản trị hoặc Quản lý</h1><p>${escHtml(cau)}</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('page-bot.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/page-bot/danh-sach', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const ds = await danhSachPage(bc, {
      loc: req.query.loc || LOC.TAT_CA,
      tim: req.query.tim || '',
      trang: req.query.trang || 0,
    });
    res.json({
      ok: true,
      ...ds,
      moiTrang: MOI_TRANG,
      chuLoc: CHU_LOC,
      suaDuoc: coVai(bc, ...VAI_SUA_DUOC),
      cuaBot: trangThaiCau(),
      canhBaoMarketer: CANH_BAO_MARKETER,
      phieuMarketer: PHIEU_MARKETER,
    });
  }));

  r.post('/api/page-bot/:id/bot', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await datCongTacBot(cuaBoiCanh(req), req.params.id, laBat(req.body?.bat));
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/page-bot/:id/marketer', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await ganMarketer(cuaBoiCanh(req), req.params.id, req.body?.marketer);
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/page-bot/:id/trong-diem', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const kq = await datTrongDiem(cuaBoiCanh(req), req.params.id, laBat(req.body?.bat));
    res.json({ ok: true, ...kq });
  }));

  return r;
}

export { LoiPageBot };
