// ĐƯỜNG HTTP CỦA MÀN «MODEL AI & KHOÁ» (G2-B3).
//
// | GET  /model-ai            | trang                                                     |
// | GET  /api/model/cau-hinh  | cấu hình hiện tại + bảng giá + cảnh báo                    |
// | POST /api/model/cau-hinh  | lưu model / độ ngẫu nhiên           (chỉ `quan-tri`)      |
// | POST /api/model/khoa      | dán khoá API của một nhà            (chỉ `quan-tri`)      |
//
// ⛔ KHÔNG CÓ ĐƯỜNG NÀO ĐỌC KHOÁ RA. `tomTatCauHinh` chỉ trả `{ daCo, tuEnv }`, và ở đây
//    không thêm đường nào khác. Khoá vào được, không ra được — đó là toàn bộ ý đồ.
//
// Đường dán khoá TÁCH RIÊNG khỏi đường lưu model, cố ý: hai việc có nhịp khác hẳn nhau (đổi
// model là việc hàng tuần, dán khoá là việc hàng quý), và gộp chung thì một biểu mẫu lỡ gửi
// bốn ô khoá trống lên là đụng vào cả bốn nhà.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import { manModel, luuCauHinh, LoiCauHinh } from './kho-model.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** Vào được: quản trị + quản lý (quản lý xem để đi kiểm chi phí). Sửa: chỉ quản trị. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);
export const DUONG_TRANG = '/model-ai';

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
export const daNoiChanModel = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[model-ai] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Model AI.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[model-ai] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
      thongDiep: `Chỉ vai ${VAI_SUA_DUOC.join(', ')} đổi được model và khoá. `
        + `Vai của bạn: ${bc.vai.join(', ') || 'không có'}.`,
    });
  }
  return next();
}

function traLoi(res, e) {
  if (e instanceof LoiChuaDangNhap) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
  if (e instanceof LoiThieuVai) return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: e.message });
  // Lỗi của lớp model (`LoiCauHinh`, `LoiModelLa`, `LoiThamSo`) mang thông điệp đã viết cho
  // người đọc — trả nguyên, đừng nuốt thành "lỗi máy chủ".
  if (e instanceof LoiCauHinh || e?.name === 'LoiModelLa' || e?.name === 'LoiThamSo') {
    return res.status(400).json({ ok: false, ma: e.ma || 'cau_hinh_sai', thongDiep: e.message });
  }
  if (e && typeof e.status === 'number' && e.ma) {
    return res.status(e.status).json({ ok: false, ma: e.ma, thongDiep: e.message });
  }
  console.error('[model-ai] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterModel() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Model AI & khoá cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Màn này cần vai Quản trị hoặc Quản lý</h1><p>${escHtml(cau)}</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('model-ai.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/model/cau-hinh', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    res.json({ ok: true, ...(await manModel(bc)), suaDuoc: coVai(bc, ...VAI_SUA_DUOC) });
  }));

  r.post('/api/model/cau-hinh', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const { chinh, duPhong, nen, doNgauNhien, doNgauNhienNen } = req.body || {};
    // Chỉ nhặt đúng năm trường. Nhận cả cục `req.body` là mở đường cho `khoa` lọt vào một
    // đường không phải của nó, và cho mọi trường lạ khác đi qua.
    const xin = {};
    if (chinh != null) xin.chinh = chinh;
    if (duPhong != null) xin.duPhong = duPhong;
    if (nen != null) xin.nen = nen;
    if (doNgauNhien != null) xin.doNgauNhien = Number(doNgauNhien);
    if (doNgauNhienNen != null) xin.doNgauNhienNen = Number(doNgauNhienNen);
    res.json({ ok: true, ...(await luuCauHinh(cuaBoiCanh(req), xin)) });
  }));

  r.post('/api/model/khoa', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const { nha, khoa } = req.body || {};
    if (!nha) throw new LoiCauHinh('thiếu tên nhà.');
    const v = String(khoa == null ? '' : khoa).trim();
    if (!v) {
      throw new LoiCauHinh(
        'khoá rỗng — không ghi gì cả. Ô trống nghĩa là "giữ nguyên khoá đang có", không phải '
        + '"xoá khoá"; xoá khoá là việc khác và chưa mở ở màn này.',
      );
    }
    const kq = await luuCauHinh(cuaBoiCanh(req), { khoa: { [nha]: v } });
    // Trả về trạng thái mới, KHÔNG trả lại khoá vừa nhận.
    res.json({ ok: true, nha, ...kq });
  }));

  return r;
}

export { LoiCauHinh };
