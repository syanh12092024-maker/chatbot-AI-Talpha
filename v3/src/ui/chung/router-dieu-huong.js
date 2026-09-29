// ĐƯỜNG PHỤC VỤ MENU ĐIỀU HƯỚNG DÙNG CHUNG.
//
// | GET /chung/dieu-huong.js | mã kịch bản mọi trang nhúng   |
// | GET /chung/khung.js      | markup khung (máy chủ + đường lùi trình duyệt) |
// | GET /api/dieu-huong      | menu ĐÃ LỌC theo vai người xem |
//
// ⚠️ LỌC Ở MÁY CHỦ, KHÔNG ẨN BẰNG CSS. Menu gửi xuống chỉ chứa màn người này vào được. Ẩn
//    bằng CSS thì danh sách màn của cả hệ đã đi qua dây mạng rồi — và một `sale` xem mã
//    nguồn trang sẽ đọc được tên mọi màn quản trị.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cuaBoiCanh, VAI } from '../../auth/boi-canh.js';
import { teamCuaNguoi } from '../../auth/kho-nguoi-dung.js';
import { menuCua, CHUYEN_HUONG } from './man-hinh.js';
import { docTrangThai } from './trang-thai.js';
import { phienBan, BIEU_TUONG } from './khung-may-chu.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

export function taoRouterDieuHuong() {
  const r = express.Router();

  // BỐN TỆP KHUNG — kieu.css · ui.js · dieu-huong.js · khung.js — đi CÙNG bản.
  //
  // ⚠️ Vì sao không cache dài bằng TÊN tệp: đo 14/09/2026 qua ảnh chụp của chủ dự án, trình duyệt giữ
  //    `kieu.css` CŨ (chưa có token cầu `--side`) trong khi lấy `dieu-huong.js` MỚI (đã gọi token ấy) ⇒
  //    `var()` không giải được ⇒ chữ tối trên nền tối. Nên từ đó cả ba tệp đi `no-cache`.
  // LL18 · 29/09: `no-cache` có giá. Đo từ máy người dùng tới prod (RTT ~320 ms, 2–54 KB/s): mỗi lần bấm menu
  //    trình duyệt hỏi lại từng tệp. Nay trang HTML (đi qua `khung-may-chu.js`) gọi các tệp này bằng
  //    `?v=<mã>` — MỘT mã băm từ nội dung cả BỐN tệp ⇒ đổi một tệp là đổi URL của cả bốn, không thể lệch bản.
  //    Đúng mã ⇒ cache một năm (`immutable`). Không mã hoặc mã cũ ⇒ `no-cache` y như trước.
  const guiChung = (tep, kieu) => (req, res, next) => {
    res.type(kieu);
    res.set('Cache-Control', req.query.v && String(req.query.v) === phienBan()
      ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.sendFile(path.join(THU_MUC, tep), (e) => (e ? next(e) : undefined));
  };
  r.get('/chung/kieu.css', guiChung('kieu.css', 'text/css'));
  r.get('/chung/ui.js', guiChung('ui.js', 'application/javascript'));
  r.get('/chung/dieu-huong.js', guiChung('dieu-huong.js', 'application/javascript'));
  // Markup khung — máy chủ dùng để vẽ sẵn, trình duyệt nạp làm đường lùi (ES module, hàm thuần).
  r.get('/chung/khung.js', guiChung('khung.js', 'application/javascript'));
  // Biểu tượng tab cho trang KHÔNG đi qua khung (đăng nhập · chọn team · trang «cần vai»): trình duyệt tự hỏi
  // `/favicon.ico` — trước đây 404 ở mỗi lần mở đầu (e2e 29/09).
  r.get('/favicon.ico', (_req, res) => {
    res.type('image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(decodeURIComponent(BIEU_TUONG.slice(BIEU_TUONG.indexOf(',') + 1))));
  });

  r.get('/api/dieu-huong', async (req, res) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    // TÊN team cho góc tài khoản — trước 28/09 góc ấy in «team 1» (mã số) trên mọi màn.
    // Đọc hỏng thì trả `null` và màn tự lùi về mã: menu không được chết vì một cái nhãn.
    let tenTeam = null;
    try {
      const t = (await teamCuaNguoi(bc.nguoiDungId)).find((x) => String(x.teamId) === String(bc.teamId));
      tenTeam = t && t.tenTeam !== t.teamId ? t.tenTeam : null;
    } catch { tenTeam = null; }
    return res.json({
      ok: true,
      tenDangNhap: bc.tenDangNhap,
      teamId: bc.teamId,
      tenTeam,
      vai: bc.vai,
      nhom: menuCua(bc.vai),
    });
  });

  // LIÊN KẾT TRONG TRANG MÀ VAI NÀY KHÔNG MỞ ĐƯỢC (LL18 · e2e 29/09). Menu đã lọc ở máy chủ, nhưng thân trang
  // còn liên kết sang màn khác: «Cài đặt team» có nút «Mở màn Model AI», «Hệ còn sống» · «Chi phí AI» trỏ sang
  // «Vận hành» — marketer bấm là gặp 403. Trang gửi lên CÁC ĐƯỜNG NÓ ĐANG HIỆN, máy chủ trả lại đường nào là màn
  // có thật mà vai này không vào được. Chỉ trả lời về đường trình duyệt ĐÃ CÓ ⇒ không lộ thêm tên màn nào (giữ
  // luật «lọc ở máy chủ» ở đầu tệp). Đường không phải màn (`/chon-team`, `/viec/1`…) không bao giờ bị chặn.
  const khop = (ds, d) => ds.some((m) => d === m.duong || (m.duong !== '/' && d.startsWith(m.duong + '/')));
  r.get('/api/dieu-huong/cam', (req, res) => {
    let bc = null;
    try { bc = cuaBoiCanh(req); } catch { bc = null; }
    if (!bc) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    const hoi = [].concat(req.query.d || []).map(String).filter((d) => /^\/[^?#]{0,200}$/.test(d)).slice(0, 80);
    const mo = menuCua(bc.vai).flatMap((n) => n.man);
    const tatCa = menuCua(Object.values(VAI)).flatMap((n) => n.man);
    // Đường chỉ còn chuyển hướng (`CHUYEN_HUONG`) ⇒ xét theo ĐÍCH cho cả hai câu hỏi «là màn?» và «mở được?».
    const dich = (d) => CHUYEN_HUONG[d] || d;
    return res.json({ ok: true, cam: hoi.filter((d) => khop(tatCa, dich(d)) && !khop(mo, dich(d))) });
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
