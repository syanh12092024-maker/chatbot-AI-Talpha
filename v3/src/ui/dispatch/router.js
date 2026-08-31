// ĐƯỜNG HTTP CỦA BẢNG ĐIỀU PHỐI.
//
// | GET /dieu-phoi                     | trang hai danh sách                              |
// | GET /viec/:id                      | trang chi tiết một việc                          |
// | GET /api/dieu-phoi/hang-cho?loai=  | hai danh sách                                    |
// | GET /api/dieu-phoi/tom-tat         | số đếm và báo động                               |
// | GET /api/dieu-phoi/viec/:id        | dữ liệu màn chi tiết                             |
// | GET /api/dieu-phoi/bang-ket-qua    | danh sách kết quả và lý do cho màn hình  (L4-M2) |
// | POST /api/dieu-phoi/viec/:id/nhan  | nhận việc                                (L4-M2) |
// | POST /api/dieu-phoi/viec/:id/dong  | đóng việc: kết quả · lý do · ghi chú · chi phí    |
//
// NĂM ĐƯỜNG ĐẦU LÀ ĐỌC, HAI ĐƯỜNG `POST` CHỈ `UPDATE` CHÍN CỘT NỬA DƯỚI của
// `viec_can_xu_ly` — việc ghi nằm trọn trong `dong-viec.js`, router chỉ dịch tham số và mã
// lỗi. Ở đây (và ở cả module này) KHÔNG có đường nào chèn dòng hay xoá dòng: dòng là của
// người A, hợp đồng B–A mục 4.
//
// BA CHỖ TIÊM TỪ NGOÀI, KHÔNG IMPORT CHÉO:
// `datChanDangNhap` · `datChanVai` nhận hai cái chắn của tầng danh tính (L0-M3), `datPheuNhatKy`
// nhận hàm ghi của nhật ký thao tác (L0-M4). Import thẳng sang `../../auth/` hay `../../audit/`
// là buộc ba module đang viết song song vào nhau — spec cấm, và hợp đồng mục 8 đã hẹn là
// người dựng ứng dụng nối ba dòng.
//
// `boi-canh.js` thì import thẳng: nó là NỀN DÙNG CHUNG, hợp đồng với người A, không phải
// module của ai.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { coVai, doiChieuTeam, LoiXuyenTeam, VAI } from '../../auth/boi-canh.js';
import { TRANG_MAC_DINH, muonTrang, locTiep, escHtml } from '../chung/http.js';
import { hangCho, tomTat, LOAI } from './kho-viec.js';
import { chiTietViec } from './chi-tiet.js';
import { nhanViec, dongViec, bangKetQua, LoiDongViec } from './dong-viec.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/**
 * Hai vai được vào bảng điều phối. Quản trị vào được để đi kiểm, không phải để làm thay.
 *
 * LẤY TỪ HẰNG `VAI`, KHÔNG GÕ LẠI CHUỖI. Bản trước gõ tay mã quản trị bằng dấu gạch DƯỚI,
 * trong khi `vai.ma` thật dùng dấu gạch NGANG — so chuỗi không khớp thì mọi quản trị thành
 * "không có vai" và bị `batBuocVaiHTTP` chặn sạch. Không lỗi, không cảnh báo, và sale vẫn
 * vào được nên không ai báo: nó chỉ lộ ra đúng lúc quản trị cần vào kiểm thì không vào được.
 * Một bản sao gõ tay của một mã đã có hằng là một bản sao sẽ lệch.
 */
export const VAI_VAO_DUOC = Object.freeze([VAI.SALE, VAI.QUAN_TRI]);

/**
 * Danh sách GHI — ở màn này **bằng đúng** danh sách vào, và đó là chủ ý: thao tác ghi duy
 * nhất là «đánh dấu đã xử» (`01-QUYET-DINH.md` §10), tức là chính việc sale vào đây để làm.
 * Vào được mà không đóng được việc thì màn này thành một bảng chỉ để nhìn.
 *
 * Khai TƯỜNG MINH dù nó trùng, để lưới quét phân quyền ngang
 * (`v3/test/b/phan-quyen-nam-vai.test.mjs`) nhìn thấy — một danh sách ngầm là một danh sách
 * không ai soát được.
 */
export const VAI_SUA_DUOC = VAI_VAO_DUOC;

/**
 * Đường của trang. Màn này (giai đoạn 1) trước khai đường thẳng trong `r.get('/dieu-phoi')`,
 * không thành hằng số — nên sổ đăng ký menu (`chung/man-hinh.js`) đọc ra `undefined` và nút
 * dẫn tới trang trống. Nay khai như 23 màn kia, và `r.get` dùng chính hằng số này.
 */
export const DUONG_TRANG = '/dieu-phoi';

/* ─────────────────────────── ba chỗ tiêm từ ngoài ─────────────────────────── */

let _chanDangNhap = null;
let _chanVai = null;
let _pheuNhatKy = null;

/**
 * NHẬN CẢ HAI KIỂU NỐI DÂY, VÀ PHÂN BIỆT NGAY LÚC NỐI.
 *
 * Hai cách viết dưới đây đều tự nhiên với người dùng Express, và cả hai đều đi qua đây:
 *
 *     datChanDangNhap(batBuocDangNhap);      // hàm dựng — gọi để lấy cái chắn
 *     datChanDangNhap(batBuocDangNhap());    // cái chắn đã dựng — dùng thẳng
 *
 * Phân biệt bằng SỐ THAM SỐ: middleware Express luôn là `(req, res, next)`, tức `length >= 3`;
 * hàm dựng thì `()` hoặc `(...vai)`, tức `length` 0. Đoán sai kiểu rồi gọi cái chắn với
 * không tham số là `req === undefined` → nổ ngay dòng đầu cái chắn, và Express phun nguyên
 * stack trace ra trình duyệt cho sale nhìn.
 *
 * Dựng MỘT LẦN lúc nối rồi nhớ lại, không dựng lại mỗi yêu cầu: `batBuocVaiHTTP(...)` dựng
 * một mảng vai mới mỗi lần gọi, mà mỗi lượt tải bảng điều phối là ba lời gọi.
 *
 * @param {Function} fn  hàm dựng hoặc cái chắn đã dựng. `null`/`undefined` = tháo dây ra.
 * @param {string} ten   tên hàm nối, để câu lỗi chỉ đúng chỗ người ta gõ sai
 * @param {...any} thamSo  tham số truyền cho hàm dựng
 */
function dungChan(fn, ten, ...thamSo) {
  if (fn == null) return null;                        // tháo dây — vẫn hợp lệ, và vẫn ĐÓNG
  if (typeof fn !== 'function') {
    // Ném NGAY LÚC NỐI, không đợi tới lúc có yêu cầu: sai ở đây là sai lúc dựng ứng dụng,
    // và người đang dựng ứng dụng đọc được ngay còn sale thì không.
    throw new TypeError(
      `${ten}: cần một hàm — hoặc hàm dựng cái chắn, hoặc cái chắn (req,res,next) đã dựng sẵn. `
      + `Nhận được ${fn === null ? 'null' : typeof fn}.`,
    );
  }
  if (fn.length >= 3) return fn;                      // đã là (req, res, next)
  const mw = fn(...thamSo);                           // hàm dựng → gọi một lần, nhớ kết quả
  if (typeof mw !== 'function') {
    throw new TypeError(
      `${ten}: hàm dựng trả về ${typeof mw} chứ không phải middleware Express. `
      + 'Nếu đây vốn là cái chắn đã dựng thì nó phải nhận đủ (req, res, next).',
    );
  }
  return mw;
}

/**
 * Nối cái chắn đăng nhập của L0-M3. Nhận `batBuocDangNhap` (hàm dựng) hoặc
 * `batBuocDangNhap()` (cái chắn đã dựng) — xem `dungChan`.
 */
export function datChanDangNhap(fn) {
  _chanDangNhap = dungChan(fn, 'datChanDangNhap');
}

/**
 * Nối cái chắn vai của L0-M3. Nhận `batBuocVaiHTTP` (hàm dựng, sẽ được gọi với
 * `VAI_VAO_DUOC`) hoặc `batBuocVaiHTTP(...VAI_VAO_DUOC)` (cái chắn đã dựng).
 */
export function datChanVai(fn) {
  _chanVai = dungChan(fn, 'datChanVai', ...VAI_VAO_DUOC);
}

/**
 * Nối hàm ghi nhật ký của L0-M4. Hình dạng đúng bằng `ghiNhatKy` bên đó:
 * `fn(boiCanh, { hanhDong, doiTuongLoai, doiTuongId, truoc, sau, ghiChu })`.
 */
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datPheuNhatKy: cần một hàm.');
  _pheuNhatKy = fn || null;
}

export const daNoiChan = () => typeof _chanDangNhap === 'function' && typeof _chanVai === 'function';
export const daNoiPheuNhatKy = () => typeof _pheuNhatKy === 'function';

/** Ghi nhật ký qua phễu. KHÔNG BAO GIỜ ném ra ngoài — hỏng nhật ký không được biến một
 *  lần chặn 403 thành một lần 500 rồi làm người ta đi tìm nhầm chỗ. */
export async function ghiNhatKyDieuPhoi(boiCanh, banGhi) {
  if (!_pheuNhatKy) {
    console.warn(`[dieu-phoi] chưa tiêm phễu nhật ký (datPheuNhatKy) — bỏ qua bản ghi "${banGhi?.hanhDong}".`);
    return null;
  }
  try {
    return await _pheuNhatKy(boiCanh, banGhi);
  } catch (e) {
    console.error(`[dieu-phoi] ghi nhật ký "${banGhi?.hanhDong}" hỏng:`, e?.message || e);
    return null;
  }
}

/**
 * CHƯA NỐI CHẮN THÌ ĐÓNG, KHÔNG MỞ.
 *
 * Mặc định "cho qua" là cách một màn hình có dữ liệu khách của ba team trở thành trang
 * công khai chỉ vì người dựng ứng dụng quên một dòng. Trả 500 chứ không trả 401 vì đây là
 * lỗi cấu hình của máy chủ, không phải lỗi của người đang gõ mật khẩu — 401 làm họ đi thử
 * lại mật khẩu mãi mà không ai nhìn tới console.
 */
function chanChuaNoi(ten) {
  return function chanChuaNoiMw(_req, res) {
    console.error(`[dieu-phoi] chưa nối ${ten} — gọi ${ten}(...) lúc dựng ứng dụng (hợp đồng mục 8). Chặn để an toàn.`);
    return res.status(500).json({
      ok: false, ma: 'chua_noi_chan',
      thongDiep: 'Máy chủ chưa nối lớp đăng nhập cho bảng điều phối.',
    });
  };
}

/**
 * CÁI CHẮN NÉM RA THÌ TRẢ 500 GỌN, KHÔNG ĐỂ STACK TRACE RƠI RA TRÌNH DUYỆT.
 *
 * Không có lớp này thì một cái chắn nối sai kiểu (hoặc hỏng vì cớ khác) đi thẳng vào bộ xử
 * lỗi mặc định của Express, và sale nhìn thấy nguyên đường dẫn file trên máy chủ. Ở đây
 * lỗi vào log máy chủ, người dùng nhận đúng một câu.
 */
function chanHong(ten, e, res) {
  console.error(`[dieu-phoi] cái chắn ${ten} ném lỗi:`, e?.stack || e?.message || e);
  if (res.headersSent) return undefined;
  return res.status(500).json({
    ok: false, ma: 'chan_hong',
    thongDiep: `Lớp chặn ${ten} của bảng điều phối gặp lỗi. Xem log máy chủ.`,
  });
}

/** Chạy một cái chắn, bắt cả lỗi ném thẳng lẫn lời hứa bị từ chối. */
function chay(ten, mw, req, res, next) {
  try {
    const kq = mw(req, res, next);
    if (kq && typeof kq.then === 'function') return kq.then(undefined, (e) => chanHong(ten, e, res));
    return kq;
  } catch (e) {
    return chanHong(ten, e, res);
  }
}

// Tra cái chắn TẠI LÚC CÓ YÊU CẦU, không phải lúc dựng router: người dựng ứng dụng nối
// chắn sau khi `app.use(taoRouterDieuPhoi())` là chuyện thường, mà chốt sớm thì lúc đó
// router đã ôm cái chắn "chưa nối" vĩnh viễn. (Cái chắn thì đã DỰNG SẴN lúc nối dây —
// xem `dungChan` — nên ở đây chỉ tra biến, không dựng lại mỗi lượt.)
const chanDangNhapMw = () => (req, res, next) => (
  _chanDangNhap ? chay('datChanDangNhap', _chanDangNhap, req, res, next) : chanChuaNoi('datChanDangNhap')(req, res)
);
const chanVaiMw = () => (req, res, next) => (
  _chanVai ? chay('datChanVai', _chanVai, req, res, next) : chanChuaNoi('datChanVai')(req, res)
);

/* ────────────────── hai đường trả TRANG: đá về đăng nhập, đừng phun JSON ──────────────────
 *
 * Vé hết hạn 8 tiếng, sale mở dấu trang lúc 8 giờ sáng, và thứ họ nhìn thấy là
 * `{"ok":false,"ma":"chua_dang_nhap"}` — không nút, không đường đi tiếp. Lớp này chỉ áp cho
 * `GET /dieu-phoi` và `GET /viec/:id`; mọi đường `/api/...` giữ nguyên JSON vì bên kia là
 * máy gọi máy, mã lỗi mới là thứ đúng.
 */

// `TRANG_MAC_DINH` · `muonTrang` · `locTiep` chuyển sang `../chung/http.js` ngày 25/08 để
// màn «Cấu hình team» dùng CHUNG một bản — `locTiep` là bộ lọc chặn chuyển hướng ra
// ngoài, và hai bản sao của một bộ lọc an toàn là hai bản sẽ lệch. Vẫn xuất lại ở đây
// nguyên tên cũ nên không nơi gọi nào phải đổi.
export { TRANG_MAC_DINH, muonTrang, locTiep } from '../chung/http.js';

/** `/dang-nhap?tiep=…` — đăng nhập xong quay lại đúng chỗ đang định tới. */
function duongDangNhap(req) {
  // `?tiep=` do nơi gọi tự đặt được (vòng qua trang đăng nhập); không có thì lấy chính
  // đường đang mở. Cả hai đều đi qua bộ lọc.
  const xin = typeof req.query?.tiep === 'string' ? req.query.tiep : (req.originalUrl || req.url);
  return `/dang-nhap?tiep=${encodeURIComponent(locTiep(xin))}`;
}


/**
 * Trang "không đủ quyền". KHÔNG chuyển hướng về đăng nhập: tài khoản này đã đúng, đá họ về
 * đó là bảo họ đăng nhập lại một thứ vốn không sai — quay vòng vô ích. Cho một nút đăng
 * xuất để đổi tài khoản, và nói thẳng cần vai nào.
 */
function trangThieuVai(bc) {
  const ten = escHtml(bc?.tenDangNhap || bc?.nguoiDungId || '');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Không có quyền vào bảng điều phối</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f9;
      color:#101828;font-family:-apple-system,"SF Pro Text",Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13.5px}
 .hop{background:#fff;border:1px solid #e4e9ee;border-radius:12px;box-shadow:0 1px 3px rgba(16,24,40,.06);
      padding:26px 28px;max-width:460px;margin:16px}
 h1{font-size:17px;margin:0 0 8px}
 p{color:#667085;line-height:1.6;margin:0 0 16px}
 button{background:#0e7c86;color:#fff;border:0;border-radius:10px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer}
 a{color:#0e7c86}
</style></head><body>
<div class="hop">
  <h1>Tài khoản này không có quyền vào bảng điều phối</h1>
  <p>Bảng điều phối chỉ mở cho vai <b>${escHtml(VAI_VAO_DUOC.join('</b> và <b>'))}</b>.${ten ? ` Bạn đang đăng nhập bằng <b>${ten}</b>.` : ''}
     Nhờ quản trị cấp vai, hoặc đăng xuất để đổi tài khoản.</p>
  <button id="ra">Đăng xuất</button>
</div>
<script>
document.getElementById('ra').addEventListener('click', async () => {
  try {
    const r = await fetch('/api/dang-xuat', { method: 'POST', headers: { accept: 'application/json' } });
    const j = await r.json().catch(() => null);
    location.href = (j && j.diTiep) || '/dang-nhap';
  } catch { location.href = '/dang-nhap'; }
});
</script>
</body></html>`;
}

/**
 * Đặt TRƯỚC hai cái chắn ở hai đường trả trang. Yêu cầu không phải trang thì đi tiếp ngay
 * và nhận đúng JSON như cũ.
 */
function chanTrang() {
  return function chanTrangMw(req, res, next) {
    if (!muonTrang(req)) return next();
    if (!daNoiChan()) return next();               // chưa nối chắn → vẫn ĐÓNG bằng `chua_noi_chan`
    if (!req.boiCanh) return res.redirect(302, duongDangNhap(req));
    // Bối cảnh dựng thiếu (`coVai` ném) thì KHÔNG tự quyết ở đây — để cái chắn thật của
    // L0-M3 trả lời, nó mới là nơi biết vé hỏng kiểu gì.
    let duVai = true;
    try { duVai = coVai(req.boiCanh, ...VAI_VAO_DUOC); } catch { duVai = true; }
    if (!duVai) return res.status(403).type('html').send(trangThieuVai(req.boiCanh));
    return next();
  };
}

/**
 * LỚP CHẶN THỨ HAI của tiêu chí nghiệm thu số 4.
 *
 * `?team_id=<team khác>` → 403 `chan_xuyen_team` + ghi nhật ký. Lớp thứ nhất nằm trong
 * tầng truy vấn của người A (nó cũng ném `LoiXuyenTeam`). Chặn hai lớp vì một lớp thì chỉ
 * cần một chỗ quên là thủng.
 *
 * `await` phễu chứ không `void`: đây là đường ĐÃ BỊ TỪ CHỐI, chậm thêm một nhịp không ai
 * thấy, mà đổi lại dấu vết chắc chắn nằm trong sổ trước khi 403 rời máy chủ.
 */
function chanTeamTrenUrl() {
  return async function chanTeamTrenUrlMw(req, res, next) {
    const bc = req.boiCanh;
    if (!bc) return next();                 // chưa đăng nhập → để cái chắn kia trả 401

    const xin = req.query?.team_id ?? req.body?.team_id;
    if (xin == null || xin === '') return next();

    try {
      doiChieuTeam(bc, String(xin));
      return next();
    } catch (e) {
      if (!(e instanceof LoiXuyenTeam)) return next(e);
      await ghiNhatKyDieuPhoi(bc, {
        hanhDong: 'chan_xuyen_team',
        doiTuongLoai: 'duong_dan',
        doiTuongId: req.originalUrl || req.url,
        sau: { team_xin: String(xin), team_cua: bc.teamId },
        ghiChu: 'sửa team_id trên URL để xem bảng điều phối của team khác',
      });
      return res.status(403).json({
        ok: false, ma: 'chan_xuyen_team',
        thongDiep: 'Không được truy cập dữ liệu của team khác.',
      });
    }
  };
}

/**
 * Đọc thân JSON của hai đường `POST`.
 *
 * Tự mang bộ đọc thân chứ không bắt người dựng ứng dụng nhớ `app.use(express.json())`:
 * quên một dòng đó thì `req.body` là `undefined`, và cái hiện ra là "Phải chọn kết quả"
 * trong khi sale đã chọn rồi — một tiếng đồng hồ đi tìm nhầm chỗ.
 *
 * Thân hỏng thì trả 400 gọn, KHÔNG để bộ xử lỗi mặc định của Express phun HTML kèm stack.
 * Trần 32kb: cả thân chỉ có bốn trường, thứ to hơn thế là gõ nhầm hoặc là người dò.
 */
function docThan() {
  const doc = express.json({ limit: '32kb' });
  return function docThanMw(req, res, next) {
    doc(req, res, (e) => {
      if (!e) return next();
      return res.status(400).json({
        ok: false, ma: 'than_hong',
        thongDiep: 'Thân yêu cầu không phải JSON hợp lệ.',
      });
    });
  };
}

/* ──────────────────────────────── trả lời và lỗi ──────────────────────────────── */

function traLoi(res, e) {
  const ma = e?.ma || '';
  if (ma === 'chan_xuyen_team') {
    return res.status(403).json({ ok: false, ma, thongDiep: 'Không được truy cập dữ liệu của team khác.' });
  }
  if (ma === 'thieu_vai' || ma === 'chua_dang_nhap') {
    return res.status(Number(e.status) || 403).json({ ok: false, ma, thongDiep: e.message });
  }
  if (ma === 'loai_la') {
    return res.status(400).json({ ok: false, ma, thongDiep: e.message });
  }
  if (e instanceof LoiDongViec) {
    // THÔNG ĐIỆP ĐI THẲNG RA MÀN HÌNH, không nuốt thành "có lỗi xảy ra": "Việc này Bình
    // đang giữ từ 14:32" là câu nói cho sale biết phải làm gì tiếp.
    const than = { ok: false, ma, thongDiep: e.message };
    if (e.nguoiGiu) than.nguoiGiu = e.nguoiGiu;
    if (e.nguoiDong) than.nguoiDong = e.nguoiDong;
    if (e.luc) than.luc = e.luc;
    if (e.ketQua) than.ketQua = e.ketQua;
    return res.status(Number(e.status) || 400).json(than);
  }
  console.error('[dieu-phoi]', e?.stack || e?.message || e);
  return res.status(Number(e?.status) || 500).json({
    ok: false, ma: ma || 'loi_may_chu', thongDiep: 'Bảng điều phối gặp lỗi. Xem log máy chủ.',
  });
}

/* ──────────────────────────────────── router ──────────────────────────────────── */

/**
 * @param {{dongHo?:() => number, gioiHan?:number}} [tuyChon]
 *   `dongHo` tiêm được để test đo việc quá hạn mà không phải chờ thật mười phút.
 */
export function taoRouterDieuPhoi({ dongHo = () => Date.now(), gioiHan = 100 } = {}) {
  const r = express.Router();
  const chan = [chanDangNhapMw(), chanVaiMw(), chanTeamTrenUrl()];

  /* ── hai trang ── `chanTrang()` đứng trước để trình duyệt nhận trang, không nhận JSON ── */
  r.get(DUONG_TRANG, chanTrang(), ...chan, (_req, res) => res.sendFile(TRANG('dieu-phoi.html')));
  r.get('/viec/:id', chanTrang(), ...chan, (_req, res) => res.sendFile(TRANG('chi-tiet-viec.html')));

  /* ── hai danh sách ── */
  r.get('/api/dieu-phoi/hang-cho', ...chan, async (req, res) => {
    try {
      const bay = Number(dongHo());
      const loaiXin = String(req.query?.loai ?? '').trim();
      const dong = await hangCho(req.boiCanh, {
        loai: loaiXin || undefined,
        gioiHan: Number(req.query?.gioiHan) || gioiHan,
        buoc: Number(req.query?.buoc) || 0,
        bay,
      });
      // Màn hình cần HAI danh sách; cắt ở đây để trang không phải tự lọc rồi lọc sai.
      // `loai` trả kèm để nơi gọi biết danh sách rỗng là "không có việc" hay "đã lọc bỏ".
      return res.json({
        ok: true,
        bay,
        loai: loaiXin || null,
        hoiThoai: dong.filter((v) => v.loai === LOAI.HOI_THOAI),
        don: dong.filter((v) => v.loai === LOAI.DON),
      });
    } catch (e) { return traLoi(res, e); }
  });

  /* ── số đếm và báo động ── */
  r.get('/api/dieu-phoi/tom-tat', ...chan, async (req, res) => {
    try {
      const bay = Number(dongHo());
      return res.json({ ok: true, ...(await tomTat(req.boiCanh, { bay })) });
    } catch (e) { return traLoi(res, e); }
  });

  /* ── màn chi tiết ── */
  r.get('/api/dieu-phoi/viec/:id', ...chan, async (req, res) => {
    try {
      const bay = Number(dongHo());
      const ct = await chiTietViec(req.boiCanh, req.params.id, {
        soTin: Number(req.query?.soTin) || undefined,
        bay,
      });
      // KHÔNG 403. Việc của team khác thì với team này nó không tồn tại — xem ghi chú đầu
      // `chi-tiet.js`.
      if (!ct) {
        return res.status(404).json({ ok: false, ma: 'khong_thay', thongDiep: 'Không có việc này.' });
      }
      return res.json({ ok: true, bay, ...ct });
    } catch (e) { return traLoi(res, e); }
  });

  /* ────────────────────────────── L4-M2 · đóng việc ──────────────────────────────
   * Hai đường ghi duy nhất của cả module, và cả hai chỉ `UPDATE` chín cột nửa dưới.
   * `docThan()` đứng TRƯỚC `chan` vì `chanTeamTrenUrl` đọc `req.body.team_id`.
   */

  /* ── bảng kết quả và lý do cho màn hình ── */
  r.get('/api/dieu-phoi/bang-ket-qua', ...chan, (req, res) => {
    try {
      const loaiXin = String(req.query?.loai ?? '').trim();
      return res.json({
        ok: true,
        loai: loaiXin || null,
        ketQua: bangKetQua(loaiXin || undefined),
      });
    } catch (e) { return traLoi(res, e); }
  });

  /* ── nhận việc ── */
  r.post('/api/dieu-phoi/viec/:id/nhan', docThan(), ...chan, async (req, res) => {
    try {
      const kq = await nhanViec(req.boiCanh, req.params.id, { bay: Number(dongHo()) });
      if (!kq) return res.status(404).json({ ok: false, ma: 'khong_thay', thongDiep: 'Không có việc này.' });
      return res.json({ ok: true, ...kq });
    } catch (e) { return traLoi(res, e); }
  });

  /* ── đóng việc ── */
  r.post('/api/dieu-phoi/viec/:id/dong', docThan(), ...chan, async (req, res) => {
    try {
      const { ketQua, lyDo, ghiChu, chiPhi } = req.body || {};
      const kq = await dongViec(req.boiCanh, req.params.id, {
        ketQua, lyDo, ghiChu, chiPhi, bay: Number(dongHo()),
      });
      if (!kq) return res.status(404).json({ ok: false, ma: 'khong_thay', thongDiep: 'Không có việc này.' });
      return res.json({ ok: true, ...kq });
    } catch (e) { return traLoi(res, e); }
  });

  return r;
}
