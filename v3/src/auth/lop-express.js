// LỚP EXPRESS CỦA TẦNG DANH TÍNH — đọc vé → `req.boiCanh`, và ba cái chắn sau nó.
//
// PHỄU NHẬT KÝ NẰM Ở ĐÂY, KHÔNG PHẢI IMPORT TỪ `../audit/`:
// nhật ký là module khác (L0-M4), đang được viết SONG SONG. Import thẳng sang đó là buộc
// hai module vào nhau và tạo vòng phụ thuộc (audit cũng cần bối cảnh của auth). Nên auth
// nhận hàm ghi nhật ký TỪ NGOÀI TIÊM VÀO (`datPheuNhatKy`) — người điều phối nối một dòng
// lúc dựng ứng dụng, đúng như `docs/hop-dong-b-voi-a.md` mục 8.
// Đặt phễu ở file này vì cả `router.js` lẫn ba cái chắn dưới đây đều cần nó, mà spec chỉ
// cho phép tạo đúng những file đã liệt kê — không có chỗ cho một file `pheu.js` riêng.

import {
  taoBoiCanh, coVai, doiChieuTeam, NGUON,
  LoiXuyenTeam, LoiChuaDangNhap,
} from './boi-canh.js';
import { docVe, TEN_COOKIE } from './ve.js';

/* ─────────────────────────── phễu nhật ký (tiêm từ ngoài) ─────────────────────────── */

let _pheuNhatKy = null;

/**
 * Nối hàm ghi nhật ký của L0-M4. Hình dạng đúng bằng `ghiNhatKy` bên đó:
 *   `fn(boiCanh, { hanhDong, doiTuongLoai, doiTuongId, truoc, sau, ghiChu })`
 *
 * `boiCanh` có thể là `null` ở những việc XẢY RA TRƯỚC KHI CÓ TEAM (đăng nhập hỏng, chọn
 * team không thuộc về). Nơi nối phễu quyết định xử lý ca đó thế nào — auth không tự dựng
 * một bối cảnh giả để lách, vì bối cảnh giả là thứ nguy hiểm nhất trong cả hệ này.
 */
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datPheuNhatKy: cần một hàm.');
  _pheuNhatKy = fn || null;
}

export function daNoiPheuNhatKy() {
  return typeof _pheuNhatKy === 'function';
}

/**
 * Ghi nhật ký qua phễu. KHÔNG BAO GIỜ ném ra ngoài — hỏng nhật ký không được làm hỏng
 * đường đăng nhập. Chưa tiêm phễu → `console.warn`, đúng spec mục 4.
 */
export async function ghiNhatKyAuth(boiCanh, banGhi) {
  if (!_pheuNhatKy) {
    console.warn(`[auth] chưa tiêm phễu nhật ký (datPheuNhatKy) — bỏ qua bản ghi "${banGhi?.hanhDong}".`);
    return null;
  }
  try {
    return await _pheuNhatKy(boiCanh, banGhi);
  } catch (e) {
    console.error(`[auth] ghi nhật ký "${banGhi?.hanhDong}" hỏng:`, e?.message || e);
    return null;
  }
}

/* ───────────────────────────────────── cookie ────────────────────────────────────── */

/** Đọc một cookie. Không dùng `cookie-parser` — thêm gói là đụng `package.json`, file cấm. */
export function docCookie(req, ten = TEN_COOKIE) {
  const raw = req?.headers?.cookie;
  if (typeof raw !== 'string' || !raw) return null;
  for (const phan of raw.split(';')) {
    const i = phan.indexOf('=');
    if (i < 0) continue;
    if (phan.slice(0, i).trim() !== ten) continue;
    const v = phan.slice(i + 1).trim();
    try { return decodeURIComponent(v); } catch { return v; }
  }
  return null;
}

export function layIp(req) {
  return req?.ip || req?.socket?.remoteAddress || null;
}

/* ─────────────────────────────────── middleware ──────────────────────────────────── */

/**
 * Đọc cookie vé → `req.boiCanh`. IM LẶNG khi chưa đăng nhập / vé hỏng / vé hết hạn —
 * việc trả 401 là của `batBuocDangNhap`, không phải của lớp này (còn trang đăng nhập và
 * trang tĩnh vẫn phải đi qua được).
 *
 * Vé TẠM (chưa chọn team) KHÔNG dựng bối cảnh, chỉ gắn `req.veTam`. Chưa chọn team thì
 * chưa được đọc dữ liệu của team nào — đó là cả lý do vé tạm tồn tại.
 */
export function lopBoiCanh() {
  return function lopBoiCanhMw(req, _res, next) {
    req.veTam = null;
    const ve = docCookie(req, TEN_COOKIE);
    if (!ve) return next();
    let than;
    try {
      than = docVe(ve);
    } catch (e) {
      if (e instanceof LoiChuaDangNhap) return next();  // vé hỏng/hết hạn → coi như chưa đăng nhập
      return next(e);                                    // thiếu V3_KHOA_VE → lỗi cấu hình, phải kêu
    }
    if (than.tam) { req.veTam = than; return next(); }
    try {
      req.boiCanh = taoBoiCanh({
        nguoiDungId: than.nguoiDungId,
        // ⚠️ Tên trường `tenDangNhap` giữ nguyên (hợp đồng với người A, `boi-canh.js` cấm
        //    đụng) nhưng GIÁ TRỊ là EMAIL — lược đồ thật không có cột tên đăng nhập.
        tenDangNhap: than.tenDangNhap,
        teamId: than.teamId,
        vai: than.vai,
        capLuc: than.capLuc,
        nguon: NGUON.PHIEN,
        ip: layIp(req),
      });
    } catch {
      // vé ký đúng nhưng nội dung không dựng nổi bối cảnh (vai lạ, team rỗng…) → chưa đăng nhập
    }
    return next();
  };
}

/** Chưa có `req.boiCanh` → 401 `{ ma:'chua_dang_nhap' }`. */
export function batBuocDangNhap() {
  return function batBuocDangNhapMw(req, res, next) {
    if (req.boiCanh) return next();
    return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
  };
}

/** Thiếu vai → 403 `{ ma:'thieu_vai' }`, CÓ ghi nhật ký. */
export function batBuocVaiHTTP(...vai) {
  const can = vai.flat().filter(Boolean).map(String);
  return function batBuocVaiMw(req, res, next) {
    if (!req.boiCanh) {
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
    }
    if (coVai(req.boiCanh, ...can)) return next();
    void ghiNhatKyAuth(req.boiCanh, {
      hanhDong: 'thieu_vai',
      doiTuongLoai: 'duong_dan',
      doiTuongId: req.originalUrl || req.url,
      sau: { can_vai: can, dang_co: [...req.boiCanh.vai] },
      ghiChu: `chặn vì thiếu vai ở ${req.method} ${req.originalUrl || req.url}`,
    });
    return res.status(403).json({
      ok: false, ma: 'thieu_vai',
      thongDiep: `Không đủ quyền. Cần một trong các vai: ${can.join(', ')}.`,
    });
  };
}

/**
 * LỚP CHẶN QUAN TRỌNG NHẤT VỀ MẶT NGHIỆM THU.
 *
 * `?team_id=<team khác>` hoặc `body.team_id` khác team trên vé → 403 `chan_xuyen_team`
 * + ghi nhật ký. Đây đúng ca "sửa tham số trên URL để truy vấn xuyên team → bị chặn, có
 * ghi nhật ký" trong tiêu chí nghiệm thu của L0.
 *
 * Đây là lớp chặn THỨ HAI; lớp thứ nhất nằm trong tầng truy vấn (nó cũng ném LoiXuyenTeam).
 * Chặn hai lớp vì một lớp thì chỉ cần một chỗ quên là thủng.
 */
export function chanTeamTrenUrl() {
  return function chanTeamTrenUrlMw(req, res, next) {
    const bc = req.boiCanh;
    if (!bc) return next();  // chưa đăng nhập → để batBuocDangNhap trả 401, đừng lộ thêm gì

    const xin = req.query?.team_id ?? req.body?.team_id;
    if (xin == null || xin === '') return next();

    try {
      doiChieuTeam(bc, String(xin));
      return next();
    } catch (e) {
      if (!(e instanceof LoiXuyenTeam)) return next(e);
      void ghiNhatKyAuth(bc, {
        hanhDong: 'chan_xuyen_team',
        doiTuongLoai: 'duong_dan',
        doiTuongId: req.originalUrl || req.url,
        sau: { team_xin: String(xin), team_cua: bc.teamId },
        ghiChu: 'sửa team_id trên URL hoặc trong thân yêu cầu',
      });
      return res.status(403).json({
        ok: false, ma: 'chan_xuyen_team',
        thongDiep: 'Không được truy cập dữ liệu của team khác.',
      });
    }
  };
}
