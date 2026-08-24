// ĐƯỜNG HTTP CỦA MÀN «CẤU HÌNH TEAM» (G2-B1).
//
// | GET    /cau-hinh-team            | trang                                              |
// | GET    /api/team/tong-quan       | số đo team đang mở + cảnh báo                      |
// | GET    /api/team/thanh-vien      | thành viên · người chưa vào · năm vai              |
// | POST   /api/team/thanh-vien      | cấp một vai cho một người      (chỉ `quan-tri`)    |
// | DELETE /api/team/thanh-vien      | rút một vai của một người      (chỉ `quan-tri`)    |
// | GET    /api/team/ket-noi         | kết nối POS (KHÔNG bao giờ trả khoá)               |
// | GET    /api/team/gan-page        | trạng thái lát «gán page ↔ team» — đang chờ phiếu  |
//
// HAI CỬA GHI DUY NHẤT là `POST`/`DELETE /api/team/thanh-vien`, và cả hai chỉ chạm
// `thanh_vien_team`. Router chỉ dịch tham số và mã lỗi; luật nằm trong `thanh-vien.js`.
//
// PHÂN QUYỀN HAI TẦNG, CỐ Ý:
//   · vào màn  → `quan-tri` hoặc `quan-ly` (quản lý xem được, để đi kiểm)
//   · ghi      → `quan-tri`, và tầng ghi TỰ kiểm lại (`batBuocVai` trong `thanh-vien.js`)
// Kiểm hai lần vì cái chắn ở router là thứ dễ quên nhất khi thêm một đường mới; tầng ghi
// kiểm lại thì đường mới nào cũng được che sẵn.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import {
  tongQuanTeam, thanhVienCua, nguoiChuaVaoTeam, danhSachVai, ketNoiCua, trangThaiGanPage,
  LoiCauHinhTeam,
} from './kho-team.js';
import { themThanhVien, botThanhVien, LoiRutQuanTriCuoi } from './thanh-vien.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/**
 * Hai vai vào được màn cấu hình. LẤY TỪ HẰNG, KHÔNG GÕ LẠI CHUỖI — bài học ② giai đoạn 1.
 * `quan-ly` xem được nhưng không ghi được; cửa ghi kiểm riêng.
 */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);
export const VAI_GHI_DUOC = Object.freeze([VAI.QUAN_TRI]);

export const DUONG_TRANG = '/cau-hinh-team';

/* ─────────────────────── hai chỗ tiêm chắn, giống bảng điều phối ─────────────────────── */

let _chanDangNhap = null;
let _chanVai = null;

function dungChan(fn, ten, ...thamSo) {
  if (fn == null) return null;
  if (typeof fn !== 'function') {
    throw new TypeError(`${ten}: cần một hàm — hoặc hàm dựng cái chắn, hoặc cái chắn (req,res,next) đã dựng sẵn. `
      + `Nhận được ${fn === null ? 'null' : typeof fn}.`);
  }
  if (fn.length >= 3) return fn;
  const mw = fn(...thamSo);
  if (typeof mw !== 'function') {
    throw new TypeError(`${ten}: hàm dựng trả về ${typeof mw} chứ không phải middleware Express.`);
  }
  return mw;
}

export function datChanDangNhap(fn) { _chanDangNhap = dungChan(fn, 'datChanDangNhap'); }
export function datChanVai(fn) { _chanVai = dungChan(fn, 'datChanVai', ...VAI_VAO_DUOC); }
export const daNoiChanTeam = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

/** CHƯA NỐI CHẮN THÌ ĐÓNG, KHÔNG MỞ — cùng lý lẽ với bảng điều phối. */
function chanChuaNoi(ten) {
  return function chanChuaNoiMw(_req, res) {
    console.error(`[cau-hinh-team] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({
      ok: false, ma: 'chua_noi_chan',
      thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn cấu hình team.',
    });
  };
}

function chanHong(ten, e, res) {
  console.error(`[cau-hinh-team] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
  if (res.headersSent) return undefined;
  return res.status(500).json({ ok: false, ma: 'chan_hong', thongDiep: `Lớp chặn ${ten} gặp lỗi.` });
}

function chay(ten, mw, req, res, next) {
  try {
    const kq = mw(req, res, next);
    if (kq && typeof kq.then === 'function') return kq.then(undefined, (e) => chanHong(ten, e, res));
    return kq;
  } catch (e) {
    return chanHong(ten, e, res);
  }
}

const chanDangNhapMw = () => (req, res, next) => (
  _chanDangNhap ? chay('datChanDangNhap', _chanDangNhap, req, res, next) : chanChuaNoi('datChanDangNhap')(req, res)
);
const chanVaiMw = () => (req, res, next) => (
  _chanVai ? chay('datChanVai', _chanVai, req, res, next) : chanChuaNoi('datChanVai')(req, res)
);

/** Cửa ghi: kiểm vai lần thứ hai ngay ở router, trước khi vào tầng ghi. */
function chanGhiMw(req, res, next) {
  let bc;
  try {
    bc = cuaBoiCanh(req);
  } catch {
    return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
  }
  if (!coVai(bc, ...VAI_GHI_DUOC)) {
    return res.status(403).json({
      ok: false, ma: 'thieu_vai',
      thongDiep: `Chỉ vai ${VAI_GHI_DUOC.join(', ')} sửa được thành viên. Vai của bạn: ${bc.vai.join(', ')}.`,
    });
  }
  return next();
}

/* ─────────────────────────────── dịch lỗi ra mã HTTP ─────────────────────────────── */

function traLoi(res, e) {
  if (e instanceof LoiChuaDangNhap) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
  if (e instanceof LoiThieuVai) return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: e.message });
  if (e instanceof LoiRutQuanTriCuoi) return res.status(409).json({ ok: false, ma: e.ma, thongDiep: e.message });
  // Lỗi có mã và `status` do tầng dưới đặt (LoiCauHinhTeam, LoiTeamKyThuat của cổng danh tính…)
  if (e && typeof e.status === 'number' && e.ma) {
    return res.status(e.status).json({ ok: false, ma: e.ma, thongDiep: e.message });
  }
  console.error('[cau-hinh-team] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

/* ─────────────────────────────────────── router ─────────────────────────────────────── */

export function taoRouterCauHinhTeam() {
  const r = express.Router();

  // Trang HTML: hết vé thì ĐÁ VỀ ĐĂNG NHẬP, không phun JSON cho người đang nhìn màn hình.
  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Không có quyền cấu hình team</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#f5f7f9;color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:420px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Màn này cần vai Quản trị hoặc Quản lý</h1>
<p>Tài khoản <b>${escHtml(bc.tenDangNhap || '')}</b> đang có vai:
${escHtml((bc.vai || []).join(', ') || 'không có vai nào')}.</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      // 403 KÈM LÝ DO, không 403 câm — commit 4524294 dặn thẳng: «vai chưa mở thì trả 403
      // kèm lý do, không 403 câm». Mã lỗi trần không nói được cần vai nào, nên người nhận
      // nó đi hỏi vòng quanh thay vì đi xin đúng vai.
      return res.status(403).json({
        ok: false, ma: 'thieu_vai',
        thongDiep: `Màn cấu hình team cần một trong các vai: ${VAI_VAO_DUOC.join(', ')}. `
          + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`,
      });
    }
    return res.sendFile(TRANG('cau-hinh-team.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/team/tong-quan', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, tongQuan: await tongQuanTeam(cuaBoiCanh(req)) });
  }));

  r.get('/api/team/thanh-vien', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const [ds, chuaVao, vai] = await Promise.all([
      thanhVienCua(bc), nguoiChuaVaoTeam(bc), danhSachVai(),
    ]);
    res.json({
      ok: true,
      thanhVien: ds.nguoi,
      trong: ds.trong,
      nguoiChonDuoc: chuaVao,
      vai,
      suaDuoc: coVai(bc, ...VAI_GHI_DUOC),
    });
  }));

  r.post('/api/team/thanh-vien', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    const { nguoiDungId, maVai } = req.body || {};
    const kq = await themThanhVien(cuaBoiCanh(req), { nguoiDungId, maVai });
    res.json({ ok: true, ...kq });
  }));

  r.delete('/api/team/thanh-vien', canDangNhap, canVai, chanGhiMw, boc(async (req, res) => {
    // Nhận cả `body` lẫn `query`: `fetch` với method DELETE gửi body được, nhưng vài proxy
    // cắt body của DELETE. Đọc cả hai chỗ thì nút không hỏng vì hạ tầng ở giữa.
    const nguon = { ...(req.query || {}), ...(req.body || {}) };
    const kq = await botThanhVien(cuaBoiCanh(req), { nguoiDungId: nguon.nguoiDungId, maVai: nguon.maVai });
    res.json({ ok: true, ...kq });
  }));

  r.get('/api/team/ket-noi', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, ...(await ketNoiCua(cuaBoiCanh(req))) });
  }));

  r.get('/api/team/gan-page', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, ganPage: await trangThaiGanPage(cuaBoiCanh(req)) });
  }));

  return r;
}

export { LoiCauHinhTeam };
