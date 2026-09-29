// PHỤC VỤ TRANG «CHÍNH SÁCH · FAQ · PHẢN ĐỐI» — chỉ trang; đọc/ghi đi cửa `/api/anh-san-pham/khoi-chung`.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, coVai, VAI } from '../../auth/boi-canh.js';
import { muonTrang, locTiep, escHtml } from '../chung/http.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

/** CÙNG vai với cửa đọc/ghi (`router-anh.js#VAI_SUA_SAN_PHAM`) — ca VE4 canh hai danh sách không lệch nhau. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);
export const DUONG_TRANG = '/khoi-chung';

export function taoRouterKhoiChung() {
  const r = express.Router();
  r.get(DUONG_TRANG, (req, res, next) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) {
      if (muonTrang(req)) return res.redirect(`/dang-nhap?tiep=${encodeURIComponent(locTiep(req.originalUrl || DUONG_TRANG))}`);
      return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    }
    if (!coVai(bc, ...VAI_VAO_DUOC)) {
      const cau = `Màn Chính sách · FAQ · Phản đối cần vai Quản trị hoặc Marketer. Vai hiện có: ${(bc.vai || []).join(', ') || 'không có vai nào'}.`;
      if (muonTrang(req)) {
        return res.status(403).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Không có quyền</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px}
.h{max-width:430px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.1)}
h1{font-size:16px;margin:0 0 8px}p{margin:0 0 14px;color:#475467;line-height:1.55}
a{color:#0e7c86;text-decoration:none;font-weight:600}</style>
<div class="h"><h1>Không đủ quyền sửa Chính sách · FAQ · Phản đối</h1><p>${escHtml(cau)}</p>
<p><a href="/">← Về màn đầu của bạn</a></p></div>`);
      }
      return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: cau });
    }
    return res.sendFile(path.join(THU_MUC, 'trang', 'khoi-chung.html'), (e) => (e ? next(e) : undefined));
  });
  return r;
}
