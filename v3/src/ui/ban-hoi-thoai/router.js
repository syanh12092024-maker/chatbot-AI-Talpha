// BÀN HỘI THOẠI (UI-HT2 · CR-28-09) — màn sale: danh sách hội thoại · khung chat đọc thẳng
// Pancake · bối cảnh khách. CHỈ ĐỌC: không ô soạn tin, không nút gửi (`01-QUYET-DINH.md` §10).
//
// | GET /ban-hoi-thoai      | trang                                                         |
// | GET /api/ban-hoi-thoai  | danh sách hội thoại theo lát (Cần người · Bot đang xử · Tất cả); `?ht=` một hội thoại |
// | GET /api/ban-hoi-thoai/:id/boi-canh | cột bối cảnh (UI-HT3): khách · đơn · kịch bản · lượt bot |
//
// Lịch sử MỘT hội thoại (`/api/ban-hoi-thoai/:id`) nằm ở router điều phối (UI-HT1) — cùng ba
// cái chắn với màn đóng việc mà khung chat của trang này dùng lại.
//
// Vai vào được: ĐÚNG như bảng điều phối (sale · quản trị) — đây là màn thay thế nó.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep } from '../chung/http.js';
import { VAI_VAO_DUOC } from '../dispatch/router.js';
import { danhSachHoiThoai, LOC } from './kho-ban-hoi-thoai.js';
import { boiCanhHoiThoai } from './boi-canh-hoi-thoai.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

export { VAI_VAO_DUOC };
export const DUONG_TRANG = '/ban-hoi-thoai';

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
export const daNoiChanBanHoiThoai = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[ban-hoi-thoai] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho Bàn hội thoại.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[ban-hoi-thoai] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
  console.error('[ban-hoi-thoai] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterBanHoiThoai({ dongHo = () => Date.now() } = {}) {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: `Bàn hội thoại chỉ mở cho vai ${VAI_VAO_DUOC.join(', ')}.` });
    }
    return res.sendFile(TRANG('ban-hoi-thoai.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/ban-hoi-thoai', canDangNhap, canVai, boc(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const loc = String(req.query?.loc || LOC.NGUOI);
    const tim = String(req.query?.tim || '').slice(0, 64);
    const ht = String(req.query?.ht || '').slice(0, 40);   // LL2: mở thẳng một hội thoại
    res.json({ ok: true, ...(await danhSachHoiThoai(cuaBoiCanh(req), { loc, tim, ht, bay: Number(dongHo()) })) });
  }));

  r.get('/api/ban-hoi-thoai/:id/boi-canh', canDangNhap, canVai, boc(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const kq = await boiCanhHoiThoai(cuaBoiCanh(req), req.params.id);
    // Team khác và không tồn tại cùng một câu — không để lộ «có hội thoại này ở team khác».
    if (!kq) return res.status(404).json({ ok: false, ma: 'khong_tim_thay', thongDiep: 'Không có hội thoại này.' });
    return res.json({ ok: true, ...kq });
  }));

  return r;
}
