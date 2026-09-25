// ĐƯỜNG HTTP CỦA MÀN «TRANG MỘT PAGE» (GD2 · 25/09/2026).
//
// | GET /page/:id      | trang                                                    |
// | GET /api/page/:id  | thông tin page + điều kiện + bot nào phụ trách            |
//
// ⛔ KHÔNG CÓ ĐƯỜNG GHI NÀO Ở ĐÂY, cố ý. Bật/tắt bot vẫn bấm qua
//    `POST /api/page-bot/:id/bot`; giao page sang bot mới vẫn qua
//    `POST /api/page-bot/:id/giao`. Tiêu chí của phiếu GD2 là «còn đúng MỘT cửa ghi bật bot»
//    — dựng thêm một cửa ở đây là tự phá tiêu chí của chính mình, và là cách chắc chắn nhất
//    để hai cửa trôi khỏi nhau (một cửa có trần bật, cửa kia quên).
//
// Page của team khác → **404**, không phải 403 (403 xác nhận dòng đó có thật ở team khác).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import { trangMotPage, LoiMotPage } from './kho-mot-page.js';

export const DUONG_TRANG = '/page';
/** Cùng ba vai với màn «Page còn thiếu gì» — xem tình trạng page là việc chung. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);
/** Chỉ quản trị bấm được hai nút ghi (bật/tắt, giao page) — cùng luật với màn danh sách. */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

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
export const daNoiChanMotPage = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[mot-page] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho trang một page.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[mot-page] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
  console.error('[mot-page] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterMotPage() {
  const r = express.Router();

  // `/page` trần KHÔNG phải một màn — nó là tiền tố của trang chi tiết. Đưa người ta về
  // danh sách thay vì trả 404: ai gõ thiếu id, hay bấm một liên kết cũ, vẫn tới được chỗ có
  // câu trả lời. (Và nhờ đường này mà mục menu `/page` không phải một nút chết.)
  r.get(DUONG_TRANG, (_req, res) => res.redirect('/page-bot'));

  r.get(`${DUONG_TRANG}/:id`, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Trang của một page cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Không đủ quyền xem trang page</h1><p>${escHtml(cau)}</p>
<p><a href="/page-bot">← Về danh sách page</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('mot-page.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get(`/api/page/:id`, canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const d = await trangMotPage(bc, req.params.id);
    if (!d) {
      return res.status(404).json({
        ok: false, ma: 'khong_thay',
        thongDiep: `Không có page id=${req.params.id} trong team đang mở.`,
      });
    }
    return res.json({ ok: true, ...d, suaDuoc: coVai(bc, ...VAI_SUA_DUOC) });
  }));

  return r;
}

export { LoiMotPage };
