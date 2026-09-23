// ĐƯỜNG PHỤC VỤ MENU ĐIỀU HƯỚNG DÙNG CHUNG.
//
// | GET /chung/dieu-huong.js | mã kịch bản mọi trang nhúng   |
// | GET /api/dieu-huong      | menu ĐÃ LỌC theo vai người xem |
//
// ⚠️ LỌC Ở MÁY CHỦ, KHÔNG ẨN BẰNG CSS. Menu gửi xuống chỉ chứa màn người này vào được. Ẩn
//    bằng CSS thì danh sách màn của cả hệ đã đi qua dây mạng rồi — và một `sale` xem mã
//    nguồn trang sẽ đọc được tên mọi màn quản trị.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh } from '../../auth/boi-canh.js';
import { menuCua } from './man-hinh.js';
import { docTrangThai } from './trang-thai.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

export function taoRouterDieuHuong() {
  const r = express.Router();

  // HỆ KIỂU — một nguồn cho màu/khoảng/cỡ chữ/thành phần của cả 25 màn. Xem `kieu.css`.
  //
  // ⚠️ `no-cache`, KHÔNG phải `max-age`. Bản đầu cho cache 1 giờ với lý do «tệp này đổi
  //    rất thưa» — sai, và sai đúng lúc tệp đổi nhiều nhất. Đo 14/09/2026 qua ảnh chụp của
  //    chủ dự án: trình duyệt giữ `kieu.css` CŨ (chưa có token cầu `--side` và token
  //    `--tren-toi*`) trong khi lấy `dieu-huong.js` MỚI (đã gọi các token ấy). JS mới đòi
  //    token mà CSS cũ không có ⇒ `var()` không giải được ⇒ chữ trên nền tối rơi về màu
  //    mặc định: thanh bên chữ tối trên nền tối, tiêu đề trắng trên nền trắng.
  //    Hai tệp này PHẢI đi cùng nhau. `no-cache` = trình duyệt hỏi lại mỗi lần tải, máy
  //    chủ trả 304 nếu tệp không đổi (ETag có sẵn) — tốn một yêu cầu rỗng, đổi lại không
  //    bao giờ lệch nhau. Với một màn vận hành, đúng quan trọng hơn tiết kiệm một 304.
  r.get('/chung/kieu.css', (_req, res, next) => {
    res.type('text/css');
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(THU_MUC, 'kieu.css'), (e) => (e ? next(e) : undefined));
  });

  // HÀM DỰNG THÀNH PHẦN — window.UI. Khung ứng dụng lấy biểu tượng từ đây, nên ba tệp
  // (kieu.css · ui.js · dieu-huong.js) PHẢI đi cùng bản: cùng `no-cache`.
  r.get('/chung/ui.js', (_req, res, next) => {
    res.type('application/javascript');
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(THU_MUC, 'ui.js'), (e) => (e ? next(e) : undefined));
  });

  r.get('/chung/dieu-huong.js', (_req, res, next) => {
    res.type('application/javascript');
    // Cùng lý do với `kieu.css` ở trên: hai tệp này gọi token của nhau, lệch bản là hỏng.
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(THU_MUC, 'dieu-huong.js'), (e) => (e ? next(e) : undefined));
  });

  r.get('/api/dieu-huong', (req, res) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    return res.json({
      ok: true,
      tenDangNhap: bc.tenDangNhap,
      teamId: bc.teamId,
      vai: bc.vai,
      nhom: menuCua(bc.vai),
    });
  });

  // Cửa RIÊNG cho dải trạng thái. Tách khỏi `/api/dieu-huong` vì bộ đọc gọi sang tiến
  // trình bot v1 và có thể mất tới 25 giây — menu không được chờ nó.
  r.get('/api/trang-thai-bot', async (req, res) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    try {
      return res.json({ ok: true, ...(await docTrangThai({ boiCanh: bc })) });
    } catch (e) {
      // Dải trạng thái hỏng KHÔNG được làm hỏng trang.
      return res.json({ ok: true, docDuoc: false, aiBat: null, tong: null, viSao: String(e?.message || e) });
    }
  });

  return r;
}
