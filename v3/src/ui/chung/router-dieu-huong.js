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

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

export function taoRouterDieuHuong() {
  const r = express.Router();

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

  return r;
}
