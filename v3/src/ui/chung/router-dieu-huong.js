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
  // Gói trong `@layer` nên KHÔNG đè được <style> của trang: màn cũ giữ nguyên vẻ ngoài,
  // màn mới dùng trọn hệ. Cho cache 1 giờ — tệp này đổi rất thưa.
  r.get('/chung/kieu.css', (_req, res, next) => {
    res.type('text/css');
    res.set('Cache-Control', 'public, max-age=3600');
    res.sendFile(path.join(THU_MUC, 'kieu.css'), (e) => (e ? next(e) : undefined));
  });

  r.get('/chung/dieu-huong.js', (_req, res, next) => {
    res.type('application/javascript');
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
      return res.json({ ok: true, ...(await docTrangThai()) });
    } catch (e) {
      // Dải trạng thái hỏng KHÔNG được làm hỏng trang.
      return res.json({ ok: true, docDuoc: false, aiBat: null, tong: null, viSao: String(e?.message || e) });
    }
  });

  return r;
}
