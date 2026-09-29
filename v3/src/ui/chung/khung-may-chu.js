// KHUNG VẼ Ở MÁY CHỦ + NÉN + CACHE THEO PHIÊN BẢN (LL18 · 29/09 · CR-28-09c).
//
// Đo 29/09 từ máy người dùng tới prod (RTT ~320 ms, tải 2–54 KB/s):
//   · `kieu.css` 104 KB và `dieu-huong.js` 27 KB đi KHÔNG NÉN — mỗi tệp mất 1–12 s;
//   · cả ba tệp chung `no-cache` ⇒ mỗi lần bấm menu, trình duyệt hỏi lại máy chủ từng tệp;
//   · menu dựng bằng JS SAU một lượt hỏi `/api/dieu-huong` ⇒ trang hiện trần rồi menu mới chèn vào.
// Ba việc của tệp này, mỗi việc trả lời một số đo:
//   ① trang HTML của UI v3 đi qua `res.sendFile` ⇒ chèn KHUNG vẽ sẵn (`khung.js`) + tab cụm vào HTML;
//   ② URL ba tệp chung mang `?v=<băm nội dung>` — cùng MỘT mã cho cả bốn tệp, nên chúng không thể lệch bản
//      nhau (nỗi lo của HK9); đúng mã ⇒ cache một năm, sai/không mã ⇒ `no-cache` như cũ;
//   ③ nén gzip HTML · CSS · JS · JSON ≥ 1 KB khi trình duyệt nhận gzip.
//
// ⛔ Khung hỏng KHÔNG được làm hỏng trang: mọi bước bọc try/catch, lỗi thì gửi trang như bản cũ.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { veKhung, veTabCum } from './khung.js';
import { menuCua } from './man-hinh.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const GOC_UI = path.resolve(THU_MUC, '..');
const GOC_AUTH = path.resolve(THU_MUC, '../../auth/trang');

/** Bốn tệp khung đi CÙNG bản: một mã phiên bản băm từ cả bốn. */
export const TEP_CHUNG = Object.freeze(['kieu.css', 'ui.js', 'dieu-huong.js', 'khung.js']);

const boNho = new Map();
function docTep(p) {
  const st = fs.statSync(p);
  const c = boNho.get(p);
  if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c;
  const v = { mtimeMs: st.mtimeMs, size: st.size, chu: fs.readFileSync(p) };
  boNho.set(p, v);
  return v;
}

/** Mã phiên bản của bốn tệp chung — đổi khi BẤT KỲ tệp nào đổi nội dung. */
export function phienBan() {
  const h = crypto.createHash('sha1');
  for (const t of TEP_CHUNG) h.update(docTep(path.join(THU_MUC, t)).chu);
  return h.digest('hex').slice(0, 12);
}

const PHONG_CHU = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500'
  + '&family=IBM+Plex+Sans:wght@400;500;600&display=swap&subset=vietnamese';
// Biểu tượng tab: chữ AC trên ô teal như bản vẽ. Nội tuyến ⇒ thôi 404 `/favicon.ico` ở mọi lần mở đầu.
export const BIEU_TUONG = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0B6E75"/>'
  + '<text x="16" y="21" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">AC</text></svg>');

/**
 * Chèn vào một trang HTML — hàm THUẦN để bộ ca đo được không cần máy chủ:
 *   · <head>: link kieu.css có mã phiên bản (thêm nếu trang chưa có), phông chữ KHÔNG chặn vẽ, biểu tượng tab;
 *   · `/chung/ui.js` · `/chung/dieu-huong.js` mang mã phiên bản;
 *   · ngay sau <body>: khối khung; cuối `body > header` của trang: tab cụm (nếu có).
 */
export function chenKhung(html, { pb, khung = null, tabCum = '' } = {}) {
  let s = String(html);
  const v = `?v=${pb}`;
  let dau = '';
  if (/href="\/chung\/kieu\.css"/.test(s)) s = s.replace(/href="\/chung\/kieu\.css"/, `href="/chung/kieu.css${v}"`);
  else dau += `<link rel="stylesheet" href="/chung/kieu.css${v}" data-ds="v3">`;
  s = s.replace(/src="\/chung\/ui\.js"/g, `src="/chung/ui.js${v}"`)
       .replace(/src="\/chung\/dieu-huong\.js"/g, `src="/chung/dieu-huong.js${v}"`);
  if (!/data-ds="chu"/.test(s)) {
    dau += '<link rel="preconnect" href="https://fonts.googleapis.com">'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      // media=print rồi đổi sang all khi tải xong: phông chữ ngoài KHÔNG chặn lần vẽ đầu (display=swap lo phần chữ).
      + `<link rel="stylesheet" href="${PHONG_CHU}" data-ds="chu" media="print" onload="this.media='all'">`;
  }
  if (!/rel="icon"/.test(s)) dau += `<link rel="icon" href="${BIEU_TUONG}">`;
  if (dau) s = /<head[^>]*>/i.test(s) ? s.replace(/<head[^>]*>/i, (m) => m + dau) : dau + s;

  if (khung) {
    const mo = s.match(/<body[^>]*>/i);
    if (mo) {
      const i = mo.index + mo[0].length;
      let sau = s.slice(i);
      // Tab cụm vào cuối header CỦA TRANG — chỉ khi header ấy là phần tử đầu tiên của <body> (30/30 trang).
      if (tabCum && /^\s*(?:<!--[\s\S]*?-->\s*)*<header\b/i.test(sau)) {
        const j = sau.indexOf('</header>');
        if (j > 0) sau = sau.slice(0, j) + tabCum + sau.slice(j);
      }
      const the = mo[0].replace(/^<body/i, `<body data-khung-hang="${khung.soHang}"`);
      s = s.slice(0, mo.index) + the + khung.html + sau;
    }
  }
  return s;
}

const laTrangUi = (p) => (p.startsWith(GOC_UI + path.sep) || p.startsWith(GOC_AUTH + path.sep));
const nhanGzip = (req) => /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
const KIEU = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };

/**
 * Lớp Express. Mắc SAU `lopBoiCanh()` (cần `req.boiCanh`) và TRƯỚC mọi router màn.
 * @param {{ tenTeamCua?: (nguoiDungId:string, teamId:string) => Promise<string|null> }} [o]
 */
export function lopKhung({ tenTeamCua = null } = {}) {
  const boNhoTeam = new Map(); // nguoiDungId:teamId → { ten, luc } — tên team đổi rất thưa; 60 s là đủ tươi
  async function tenTeam(bc) {
    if (typeof tenTeamCua !== 'function') return null;
    const k = `${bc.nguoiDungId}:${bc.teamId}`;
    const c = boNhoTeam.get(k);
    if (c && Date.now() - c.luc < 60_000) return c.ten;
    let ten = null;
    try { ten = await tenTeamCua(bc.nguoiDungId, bc.teamId); } catch { ten = null; }
    boNhoTeam.set(k, { ten, luc: Date.now() });
    return ten;
  }

  return function lopKhungExpress(req, res, next) {
    // ③ NÉN: mọi thân chữ ≥ 1 KB (JSON của res.json đi qua res.send). Không nén lại thứ đã nén.
    const guiGoc = res.send;
    res.send = function guiNen(than) {
      try {
        if (nhanGzip(req) && than != null && !res.get('Content-Encoding') && req.method !== 'HEAD') {
          const buf = Buffer.isBuffer(than) ? than : (typeof than === 'string' ? Buffer.from(than) : null);
          const kieu = String(res.get('Content-Type') || (typeof than === 'string' ? 'text/html' : ''));
          if (buf && buf.length >= 1024 && /json|html|css|javascript|text\//.test(kieu)) {
            if (!res.get('Content-Type')) res.type('html');
            res.set('Content-Encoding', 'gzip');
            res.vary('Accept-Encoding');
            return guiGoc.call(this, zlib.gzipSync(buf, { level: 6 }));
          }
        }
      } catch { /* nén hỏng thì gửi thô */ }
      return guiGoc.call(this, than);
    };

    // ①② TRANG + TỆP TĨNH của UI đi qua `sendFile`.
    const guiTepGoc = res.sendFile;
    res.sendFile = function guiTep(p, tuy, fn) {
      if (typeof tuy === 'function') { fn = tuy; tuy = undefined; }
      let tuyet;
      try { tuyet = path.resolve(tuy && tuy.root ? path.join(tuy.root, p) : String(p)); } catch { tuyet = ''; }
      const duoi = path.extname(tuyet);
      if (!tuyet || !laTrangUi(tuyet) || !KIEU[duoi]) return guiTepGoc.call(this, p, tuy, fn);
      (async () => {
        let chu = docTep(tuyet).chu;
        // Hai trang của phần ĐĂNG NHẬP (`auth/trang`: đăng nhập · chọn team) KHÔNG thuộc app: tự dựng bố cục căn giữa
        // bằng flex, tự khai bảng màu, không nạp `kieu.css`. Chèn khung vào đó là khung đứng NGANG cạnh thẻ team và mất
        // mục cuối (ảnh prod người dùng gửi 29/09, sau deploy LL18). Chúng chỉ được nén — như trước LL18.
        if (duoi === '.html' && !tuyet.startsWith(GOC_AUTH + path.sep)) {
          let khung = null; let tabCum = '';
          const bc = req.boiCanh;
          if (bc && bc.teamId) {
            try {
              // `originalUrl`, không `path`: trong router mắc ở tiền tố, `req.path` đã bị cắt mất tiền tố.
              const nay = new URL(req.originalUrl || req.url, 'http://x').pathname.replace(/\/$/, '') || '/';
              const d = { tenDangNhap: bc.tenDangNhap, teamId: bc.teamId, tenTeam: await tenTeam(bc), vai: bc.vai, nhom: menuCua(bc.vai) };
              khung = veKhung(d, nay);
              tabCum = veTabCum(d, nay);
            } catch { khung = null; tabCum = ''; }
          }
          chu = chenKhung(chu.toString('utf8'), { pb: phienBan(), khung, tabCum });
          // Khung mang tên người + team ⇒ không cho bộ đệm dùng chung giữ; ETag vẫn cho 304 khi không đổi.
          res.set('Cache-Control', 'private, no-cache');
        }
        res.type(KIEU[duoi]);
        res.send(chu);
        if (fn) fn();
      })().catch((e) => {
        // Đọc/chèn hỏng ⇒ đường cũ nguyên vẹn.
        try { guiTepGoc.call(res, p, tuy, fn); } catch { if (fn) fn(e); else next(e); }
      });
    };
    next();
  };
}
