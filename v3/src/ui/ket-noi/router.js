// ĐƯỜNG HTTP CỦA MÀN «KẾT NỐI & TOKEN» (G2-B4).
//
// | GET    /ket-noi                | trang                                                 |
// | GET    /api/ket-noi/kho-token  | kho token + sức khoẻ + cảnh báo + trạng thái cửa ghi  |
// | GET    /api/ket-noi/pos        | kết nối POS của team đang mở                          |
// | POST   /api/ket-noi/token      | thêm một token   (chỉ `quan-tri`, qua tiến trình bot) |
// | DELETE /api/ket-noi/token/:i   | bỏ một token     (chỉ `quan-tri`, qua tiến trình bot) |
// | POST   /api/ket-noi/nap-lai    | kéo dữ liệu từ tiến trình bot về nền v3 (chạy NỀN)     |
// | GET    /api/ket-noi/nap-lai    | trạng thái lượt nạp đang chạy / vừa xong              |
// | POST   /api/ket-noi/pos        | thêm kết nối POS (market + shop + khoá API)           |
// | POST   /api/ket-noi/pos/keo-danh-muc | kéo danh mục + tồn kho POS → `san_pham`/`goi_gia`|
// | POST   /api/ket-noi/pos/:id    | sửa shop id và/hoặc khoá; `market` KHÔNG sửa được     |
// | POST   /api/ket-noi/pos/:id/bat| bật/tắt — cách ĐÚNG để ngừng dùng một shop            |
// | DELETE /api/ket-noi/pos/:id    | bỏ hẳn, mất luôn khoá đã mã hoá                       |
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
  batBuocKhoTokenV3, thuTokenSong, epBotNapLai, keoDanhMucPos,
  batDauNapLai, trangThaiNapLai,
  themPos, suaPos, batTatPos, boPos,
} from './kho-ket-noi.js';
import { HANH_DONG } from '../../audit/hanh-dong.js';

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

// Giữ hai tên export này vì `index.js` đang dùng, nhưng GIÁ TRỊ lấy từ danh mục — gõ lại
// chuỗi ở đây là bản khai thứ hai, và `hopLeHanhDong` là bên deny-by-default có tiếng nói.
export const HANH_DONG_THEM_TOKEN = HANH_DONG.THEM_TOKEN_PANCAKE;
export const HANH_DONG_BO_TOKEN = HANH_DONG.BO_TOKEN_PANCAKE;

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

/**
 * Kiểm phễu nhật ký TRƯỚC khi ghi, không phải sau.
 *
 * `ghi()` đã ném khi thiếu phễu — nhưng nó chạy SAU lượt sửa, nên cửa hỏng theo kiểu tệ
 * nhất: kết nối POS đã đổi thật, người bấm nhận 500, và KHÔNG có dòng nhật ký nào. Bốn mã
 * kết nối POS nằm trong `nhomBatBuoc` đúng vì mất dấu ở đây là mất khả năng trả lời «ai
 * đổi khoá POS» — nên chặn ở cửa vào, đừng phát hiện ở cửa ra.
 *
 * ⚠️ Hai đường token (`POST`/`DELETE /api/ket-noi/token`) CÓ CÙNG HÌNH DẠNG NÀY và chưa
 *    được vá — ngoài phạm vi lượt 15/09, đã ghi §9 sổ nợ.
 */
function batBuocPheu() {
  if (!_pheuNhatKy) {
    throw new LoiKetNoi(
      'chưa nối phễu nhật ký — từ chối sửa kết nối POS vì không truy ngược được ai đổi khoá',
      'chua_noi', 500,
    );
  }
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

  // ── SỬA KẾT NỐI POS ───────────────────────────────────────────────────────────────
  // ⛔ KHOÁ API KHÔNG VÀO NHẬT KÝ. `nhat_ky` là bảng CHỈ-THÊM (lược đồ 001): một khoá lọt
  //    vào đó là lọt vĩnh viễn, không xoá được. Ghi `market` + `shopId` là đủ truy ngược
  //    «ai đổi kết nối nào lúc nào» — cùng lý do đường thêm token chỉ ghi tên tài khoản.
  /* KÉO DANH MỤC POS → `san_pham` / `goi_gia`.
   * Đặt TRƯỚC `/api/ket-noi/pos/:id` — đứng sau thì `keo-danh-muc` bị bắt làm `:id` và
   * trả 404 «không có kết nối đó», một lỗi định tuyến câm.
   * Nhật ký KHÔNG bắt buộc (cùng họ với «Kéo dữ liệu về»): lượt kéo đã chạy xong rồi mới
   * tới đây, ném ở đây chỉ làm mất báo cáo chứ không lùi được gì. */
  r.post('/api/ket-noi/pos/keo-danh-muc', canDangNhap, canVai, boc(async (req, res) => {
    const bc = cuaBoiCanh(req);
    const kq = await keoDanhMucPos(bc);
    await ghi(bc, {
      hanhDong: HANH_DONG.KEO_DANH_MUC_POS,
      doiTuongLoai: 'ket_noi_pos',
      doiTuongId: null,
      sau: { thiTruong: kq.thiTruong, docDuoc: kq.docDuoc, them: kq.them, capNhat: kq.capNhat, giaGhiDuoc: kq.giaGhiDuoc, hong: kq.hong.length },
      ghiChu: kq.rong
        ? 'kéo danh mục POS: team chưa có kết nối POS nào đang bật'
        : `kéo danh mục POS ${kq.thiTruong} thị trường: ${kq.docDuoc} biến thể · ${kq.them} sản phẩm mới · ${kq.giaGhiDuoc} bậc giá`
          + (kq.hong.length ? ` · ${kq.hong.length} thị trường LỖI (${kq.hong.map((h) => h.market).join(', ')})` : ''),
    });
    res.json({ ok: true, ...kq });
  }));

  r.post('/api/ket-noi/pos', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const kq = await themPos(bc, {
      market: req.body?.market,
      shopId: req.body?.shopId,
      apiKey: req.body?.apiKey,
    });
    await ghi(bc, {
      hanhDong: HANH_DONG.THEM_KET_NOI_POS,
      doiTuongLoai: 'ket_noi_pos',
      doiTuongId: kq.id,
      sau: { market: kq.market, shopId: kq.shopId, bat: kq.bat },
      ghiChu: `thêm kết nối POS "${kq.market}" → shop ${kq.shopId}`,
    });
    res.json({ ok: true, pos: kq });
  }));

  r.post('/api/ket-noi/pos/:id', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const doiKhoa = !!String(req.body?.apiKey || '').trim();
    const kq = await suaPos(bc, req.params.id, {
      shopId: req.body?.shopId,
      apiKey: req.body?.apiKey,
    });
    await ghi(bc, {
      hanhDong: HANH_DONG.SUA_KET_NOI_POS,
      doiTuongLoai: 'ket_noi_pos',
      doiTuongId: kq.id,
      sau: { market: kq.market, shopId: kq.shopId, doiKhoa },
      // Khai RÕ có đổi khoá hay không: đó là nửa quan trọng của dòng nhật ký này, và là
      // thứ duy nhất nói được về khoá mà không lộ khoá.
      ghiChu: `sửa kết nối POS "${kq.market}" → shop ${kq.shopId}`
        + (doiKhoa ? ' · ĐỔI KHOÁ API' : ' · khoá giữ nguyên'),
    });
    res.json({ ok: true, pos: kq });
  }));

  r.post('/api/ket-noi/pos/:id/bat', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const bat = req.body?.bat === true || req.body?.bat === 'true' || req.body?.bat === 1;
    const kq = await batTatPos(bc, req.params.id, bat);
    await ghi(bc, {
      hanhDong: HANH_DONG.BAT_TAT_KET_NOI_POS,
      doiTuongLoai: 'ket_noi_pos',
      doiTuongId: kq.id,
      sau: { market: kq.market, bat: kq.bat },
      ghiChu: `${kq.bat ? 'BẬT' : 'TẮT'} kết nối POS "${kq.market}"`
        + (kq.bat ? '' : ' — thị trường này ngừng tạo được đơn'),
    });
    res.json({ ok: true, pos: kq });
  }));

  r.delete('/api/ket-noi/pos/:id', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const kq = await boPos(bc, req.params.id);
    await ghi(bc, {
      hanhDong: HANH_DONG.BO_KET_NOI_POS,
      doiTuongLoai: 'ket_noi_pos',
      doiTuongId: kq.id,
      truoc: { market: kq.market, shopId: kq.shopId, bat: kq.bat },
      ghiChu: `BỎ HẲN kết nối POS "${kq.market}" (shop ${kq.shopId}) — khoá API mất theo`,
    });
    res.json({ ok: true, pos: kq });
  }));

  /* ═══ THÊM / BỎ TOKEN — nay ghi thẳng CSDL, KHÔNG qua cửa ghi sang tiến trình bot ═══
   *
   * Cửa ghi ấy (`PANCAKE_READONLY`) sinh ra để chặn thứ CHẠM KHÁCH THẬT: gạt công tắc bot
   * cho một page là bot bắt đầu tự trả lời người thật. Thêm một token thì KHÔNG gửi cho ai
   * — nó chỉ là quản khoá đọc. Gộp hai việc vào một van khiến máy dev không cấu hình nổi
   * bằng giao diện, và người ta quay về sửa tay `.env` — đường không có dấu vết. Nên tách:
   * công tắc bot giữ nguyên van, kho token đi lối riêng có ĐĂNG NHẬP + VAI `quan-tri` +
   * NHẬT KÝ BẮT BUỘC + Pancake tự từ chối token sai.
   */
  r.post('/api/ket-noi/token', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const token = String(req.body?.token || '').trim();
    if (!token) throw new LoiKetNoi('thiếu token', 'thieu_tham_so');

    // THỬ SỐNG trước khi nhận — một lượt GET, không phải lượt gửi. Nhận token chết vào kho
    // là để dành một sự cố câm cho lượt chat đầu tiên của khách.
    const thu = await thuTokenSong(token);
    if (!thu.ok) throw new LoiKetNoi(thu.loi, 'token_khong_song', 400);

    const kq = await batBuocKhoTokenV3().them({ token, nguoiDungId: bc.nguoiDungId ?? null });

    // ⛔ KHÔNG ghi token vào nhật ký. Nhật ký là bảng chỉ-thêm, không xoá được — một token
    //    lọt vào đó là lọt vĩnh viễn. Ghi tên tài khoản và hạn, đủ để truy ngược.
    await ghi(bc, {
      hanhDong: HANH_DONG_THEM_TOKEN,
      doiTuongLoai: 'token_pancake',
      doiTuongId: kq.id,
      sau: { ten: kq.ten, duoi: kq.duoi, het: kq.hetHan || null, soPage: thu.soPage },
      ghiChu: `thêm token Pancake của tài khoản "${kq.ten}" (…${kq.duoi}, ${thu.soPage} page)`,
    });
    await epBotNapLai();
    res.json({ ok: true, id: kq.id, ten: kq.ten, soPage: thu.soPage, het: kq.hetHan });
  }));

  r.delete('/api/ket-noi/token/:i', canDangNhap, canVai, boc(async (req, res) => {
    batBuocPheu();
    const bc = cuaBoiCanh(req);
    const kq = await batBuocKhoTokenV3().bo(req.params.i);
    await ghi(bc, {
      hanhDong: HANH_DONG_BO_TOKEN,
      doiTuongLoai: 'token_pancake',
      doiTuongId: kq.id,
      truoc: { ten: kq.ten, duoi: kq.duoi, het: kq.hetHan || null },
      ghiChu: `bỏ token Pancake của tài khoản "${kq.ten}" (…${kq.duoi})`,
    });
    await epBotNapLai();
    res.json({ ok: true, id: kq.id, ten: kq.ten });
  }));

  // ── KÉO DỮ LIỆU VỀ ────────────────────────────────────────────────────────────────
  // Hai đường: một để BẤM (chạy nền, trả ngay), một để HỎI LẠI trạng thái. Không có đường
  // nào giữ kết nối HTTP suốt lượt nạp — 18.790 hội thoại không phải việc của một yêu cầu web.
  r.post('/api/ket-noi/nap-lai', canDangNhap, canVai, boc(async (req, res) => {
    res.json(await batDauNapLai(cuaBoiCanh(req)));
  }));

  r.get('/api/ket-noi/nap-lai', canDangNhap, canVai, boc(async (_req, res) => {
    res.json({ ok: true, ...trangThaiNapLai() });
  }));

  return r;
}

export { trangThaiCau, LoiKetNoi };
