// ĐƯỜNG HTTP CỦA MÀN «KẾT NỐI & TOKEN» (G2-B4).
//
// | GET    /ket-noi                | trang                                                 |
// | GET    /api/ket-noi/kho-token  | kho token + sức khoẻ + cảnh báo + trạng thái cửa ghi  |
// | GET    /api/ket-noi/pos        | kết nối POS của team đang mở                          |
// | POST   /api/ket-noi/token      | thêm một token   (chỉ `quan-tri`, qua tiến trình bot) |
// | DELETE /api/ket-noi/token/:i   | bỏ một token     (chỉ `quan-tri`, qua tiến trình bot) |
//
// ⚠️ MÀN NÀY SỬA TÀI NGUYÊN TOÀN HỆ, không phải dữ liệu team. Xem `LA_TOAN_HE` ở
//    `kho-ket-noi.js`. Vì vậy nó CHỈ cho `quan-tri` vào — khác hai màn kia (cho cả `quan-ly`
//    vào xem): một danh sách token, kể cả chỉ có tên và tám ký tự cuối, vẫn là bản đồ hạ tầng.
//
// TOKEN KHÔNG BAO GIỜ ĐI NGƯỢC RA: `src/pancake.js#listPancakeTokens` chỉ trả tên, hạn, nguồn
// và **tám ký tự cuối**. Đường ở đây không thêm chỗ nào lộ token đầy đủ, và có bài test khoá.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI, LoiChuaDangNhap, LoiThieuVai } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';
import {
  khoToken, ketNoiPosCua, trangThaiCau, LA_TOAN_HE, GIAI_THICH_THU_TU, LoiKetNoi,
} from './kho-ket-noi.js';
import { themToken, boToken } from '../../noi-day/cau-bot-v1.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** CHỈ quản trị — màn này là hạ tầng toàn hệ, không phải dữ liệu team. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI]);
/**
 * Danh sách GHI — bằng đúng danh sách vào, và đó là chủ ý: màn này CHỈ cho `quan-tri` vào
 * (kho token là hạ tầng dùng chung cả ba team), nên ai vào được cũng là ai sửa được. Không
 * có tầng «xem mà không sửa» ở đây vì không ai ngoài quản trị nhìn thấy màn.
 *
 * Khai TƯỜNG MINH dù trùng — xem lý do ở `dispatch/router.js`.
 */
export const VAI_SUA_DUOC = VAI_VAO_DUOC;

export const DUONG_TRANG = '/ket-noi';

export const HANH_DONG_THEM_TOKEN = 'them_token_pancake';
export const HANH_DONG_BO_TOKEN = 'bo_token_pancake';

let _chanDangNhap = null;
let _chanVai = null;
let _pheuNhatKy = null;

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
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKetNoi('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}
export const daNoiChanKetNoi = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';

/** Ghi nhật ký CÓ NÉM — thêm/bỏ token là đổi hạ tầng của cả ba team. */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiKetNoi('chưa nối phễu nhật ký — từ chối sửa kho token vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

function chanChuaNoi(ten) {
  return (_req, res) => {
    console.error(`[ket-noi] chưa nối ${ten} lúc dựng ứng dụng. Chặn để an toàn.`);
    return res.status(500).json({ ok: false, ma: 'chua_noi_chan', thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho màn Kết nối & token.' });
  };
}

function chanHong(ten, e, res) {
  console.error(`[ket-noi] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
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
  console.error('[ket-noi] lỗi chưa phân loại:', e?.stack || e?.message || e);
  return res.status(500).json({ ok: false, ma: 'loi_may_chu', thongDiep: 'Lỗi máy chủ. Xem log.' });
}

const boc = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => traLoi(res, e));

export function taoRouterKetNoi() {
  const r = express.Router();

  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Kết nối & token chỉ cho vai ${VAI_VAO_DUOC.join(', ')} — đây là hạ tầng `
        + `dùng chung cho cả ba team, không phải dữ liệu của một team. `
        + `Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:440px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Màn này chỉ dành cho Quản trị</h1><p>${escHtml(cau)}</p>
<p><a href="/dieu-phoi">← Về bảng điều phối</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(TRANG('ket-noi.html'), (e) => (e ? next(e) : undefined));
  });

  const canDangNhap = chanDangNhapMw();
  const canVai = chanVaiMw();

  r.get('/api/ket-noi/kho-token', canDangNhap, canVai, boc(async (_req, res) => {
    res.json({ ok: true, ...(await khoToken()), laToanHe: LA_TOAN_HE, giaiThichThuTu: GIAI_THICH_THU_TU });
  }));

  r.get('/api/ket-noi/pos', canDangNhap, canVai, boc(async (req, res) => {
    res.json({ ok: true, ...(await ketNoiPosCua(cuaBoiCanh(req))) });
  }));

  r.post('/api/ket-noi/token', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const token = String(req.body?.token || '').trim();
    if (!token) throw new LoiKetNoi('thiếu token', 'thieu_tham_so');

    // `themToken` tự kiểm cửa ghi (`V3_BOT_GHI` + `PANCAKE_READONLY`) rồi mới gọi sang bot.
    const kq = await themToken(token);

    // ⛔ KHÔNG ghi token vào nhật ký. Nhật ký là bảng chỉ-thêm, không xoá được — một token
    //    lọt vào đó là lọt vĩnh viễn. Ghi tên tài khoản và hạn, đủ để truy ngược.
    await ghi(bc, {
      hanhDong: HANH_DONG_THEM_TOKEN,
      doiTuongLoai: 'pancake_token',
      doiTuongId: null,
      sau: { ten: kq?.name || null, het: kq?.exp || null, soPage: kq?.pages ?? null },
      ghiChu: `thêm token Pancake của tài khoản "${kq?.name || '?'}" (${kq?.pages ?? '?'} page)`,
    });
    res.json({ ok: true, ten: kq?.name, soPage: kq?.pages, het: kq?.exp });
  }));

  r.delete('/api/ket-noi/token/:i', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const kq = await boToken(req.params.i);
    await ghi(bc, {
      hanhDong: HANH_DONG_BO_TOKEN,
      doiTuongLoai: 'pancake_token',
      doiTuongId: String(req.params.i),
      truoc: { thuTu: String(req.params.i), ten: kq?.name || null },
      ghiChu: `bỏ token Pancake thứ tự ${req.params.i}`,
    });
    res.json({ ok: true, ...kq });
  }));

  return r;
}

export { trangThaiCau, LoiKetNoi };
