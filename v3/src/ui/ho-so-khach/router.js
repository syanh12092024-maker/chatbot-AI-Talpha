// ĐƯỜNG HTTP CỦA MÀN «HỒ SƠ KHÁCH HÀNG» (G2-G5).
//
// | GET /ho-so-khach      | trang                                              |
// | GET /api/ho-so-khach  | khách gộp theo số điện thoại, có tìm và phân trang |
//
// MÀN CHỈ ĐỌC — sửa thông tin khách là việc của POS.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import { manKhach, VAI_VAO_DUOC as VAI_API, KENH, LoiKhach } from './kho-khach.js';
import { VAI_VAO_DUOC as VAI_BAN } from '../dispatch/router.js';   // vai của cửa đọc Hộp thư (`/api/hop-thu/*`)

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/**
 * VE5b · 29/09: màn thành «Hộp thư › Tìm khách» (bản vẽ 1b · bản đồ phủ màn: «Khách hàng → Hộp thư › Tìm khách · Gộp»).
 * TRANG mở thêm cho SALE — tra theo số + hồ sơ gộp kênh đi qua cửa đọc của Hộp thư (`/api/hop-thu/*`, sale · quản trị).
 * Quản lý GIỮ màn: tra theo tên/số qua cửa cũ `/api/ho-so-khach` — cửa ấy GIỮ vai cũ (`VAI_API`: quản trị · quản lý).
 * Không vai nào mất việc đang làm được.
 */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.SALE]);
export const DUONG_TRANG = '/ho-so-khach';

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
export function datChanVai(fn) { _chanVai = dungChan(fn, 'datChanVai', ...VAI_API); }   // cửa API cũ: vai cũ
export const daNoiChanKhach = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[ho-so-khach] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Cửa kiểm sẵn sàng.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[ho-so-khach] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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

function traLoi(res, e) {
  if (e instanceof LoiChuaDangNhap) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
  if (e instanceof LoiThieuVai) return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: e.message });
  if (e && typeof e.status === 'number' && e.ma) {
    return res.status(e.status).json({ ok: false, ma: e.ma, thongDiep: e.message });
  }
  console.error('[ho-so-khach] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterKhach() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Tìm khách cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Không đủ quyền mở Tìm khách</h1><p>${escHtml(cau)}</p>
<p><a href="/">← Về màn đầu của bạn</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('ho-so-khach.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  // VE5b: trang hỏi TRƯỚC vai này dùng được cửa nào — máy chủ trả lời bằng ĐÚNG hằng vai của hai cửa (không chép danh
  // sách vai sang trình duyệt: hai bản danh sách là hai định nghĩa, sớm muộn lệch — án lệ #22).
  r.get('/api/ho-so-khach/cua', canDangNhap, (req, res) => {
    const bc = cuaBoiCanh(req);
    if (!coVai(bc, ...VAI_VAO_DUOC)) return res.status(403).json({ ok: false, ma: 'thieu_vai' });
    return res.json({ ok: true, hoSo: coVai(bc, ...VAI_BAN), danhSach: coVai(bc, ...VAI_API) });
  });

  r.get('/api/ho-so-khach', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, ...(await manKhach(cuaBoiCanh(req), { tim: req.query.tim, trang: req.query.trang })) });
  }));

  return r;
}

export { KENH, LoiKhach };
