// ĐƯỜNG HTTP CỦA MÀN «BẮT ĐẦU».
//
// | GET /bat-dau      | trang                                                     |
// | GET /api/bat-dau  | page của team, xếp theo thứ tự NGƯỜI MỚI NÊN LÀM          |
//
// MÀN NÀY KHÔNG CÓ CỬA GHI NÀO. Nút «Bật bot» của trang gọi
// `POST /api/page-bot/:id/bot` — đường ĐÃ CÓ của màn Page & Bot, với bảy chốt, nhật ký
// ai bấm và hộp xác nhận. Dựng một đường ghi thứ hai ở đây là dựng cái chốt thứ hai để
// rồi hai cái lệch nhau; và là mở một cửa vào production mà không ai rà lại.
//
// Quyền vào: GIỐNG `/san-sang` (quản trị · quản lý · marketer) — cùng dữ liệu thì cùng
// quyền. Quyền BẬT thì do `/api/page-bot/:id/bot` tự kiểm, chặt hơn (chỉ quản trị).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import { VAI_VAO_DUOC as VAI_SAN_SANG } from '../san-sang/router.js';
import { manBatDau, LoiBatDau } from './kho-bat-dau.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** CÙNG quyền với `/san-sang` — nhập lại, không gõ lại danh sách vai. */
export const VAI_VAO_DUOC = VAI_SAN_SANG;
export const DUONG_TRANG = '/bat-dau';

let _chanDangNhap = null;
let _chanVai = null;

function dungChan(fn, ten, ...thamSo) {
  if (fn == null) return null;
  if (typeof fn !== 'function') throw new LoiBatDau(`${ten} cần một hàm`);
  return fn(...thamSo);
}

export function datChanDangNhap(fn) { _chanDangNhap = dungChan(fn, 'datChanDangNhap'); }
export function datChanVai(fn) { _chanVai = dungChan(fn, 'datChanVai', ...VAI_VAO_DUOC); }
export const daNoiChanBatDau = () =>
  typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[bat-dau] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({
      ok: false, ma: 'chua_noi_chan',
      thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Bắt đầu.',
    });
  };
}

const chanDangNhapMw = () => _chanDangNhap || chanChuaNoi('chắn đăng nhập');
const chanVaiMw = () => _chanVai || chanChuaNoi('chắn vai');

function boc(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); } catch (e) {
      if (e instanceof LoiChuaDangNhap) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: e.message });
      if (e instanceof LoiThieuVai) return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: e.message });
      if (e instanceof LoiBatDau) return res.status(e.status || 400).json({ ok: false, ma: e.ma, thongDiep: e.message });
      return next(e);
    }
  };
}

export function taoRouterBatDau() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc;
    try { bc = cuaBoiCanh(req); } catch {
      return res.redirect(302, `/dang-nhap?tiep=${encodeURIComponent(locTiep(DUONG_TRANG))}`);
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = 'Màn này cần vai Quản trị, Quản lý hoặc Marketer.';
      if (muonTrang(req)) {
        // Trang từ chối cũng dùng HỆ KIỂU, không gõ CSS thứ hai — xem `chung/kieu.css`.
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<link rel="stylesheet" href="/chung/kieu.css">
<main class="trang"><div class="panel" style="max-width:440px">
<h2>Không vào được màn Bắt đầu</h2><p class="mo">${escHtml(cau)}</p>
<p><a class="nut" href="/trang-chu">← Về trang chủ</a></p></div></main>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('bat-dau.html'), (e) => (e ? next(e) : undefined));
  });

  r.get('/api/bat-dau', chanDangNhapMw(), chanVaiMw(), boc(async (req, res) => {
    res.json({ ok: true, ...(await manBatDau(cuaBoiCanh(req))) });
  }));

  return r;
}
