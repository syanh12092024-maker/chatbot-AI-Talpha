// ĐƯỜNG HTTP CỦA BẢNG ĐIỀU PHỐI.
//
// | GET /dieu-phoi                     | trang hai danh sách                              |
// | GET /viec/:id                      | trang chi tiết một việc                          |
// | GET /api/dieu-phoi/hang-cho?loai=  | hai danh sách                                    |
// | GET /api/dieu-phoi/tom-tat         | số đếm và báo động                               |
// | GET /api/dieu-phoi/viec/:id        | dữ liệu màn chi tiết                             |
//
// TOÀN BỘ LÀ `GET` VÀ TOÀN BỘ LÀ ĐỌC. Đánh dấu đã xử, chọn kết quả, ô chi phí — `L4-M2`,
// file khác, đường khác. Thêm một `POST` vào đây là đi ngược quyết định đã chốt.
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

import { doiChieuTeam, LoiXuyenTeam } from '../../auth/boi-canh.js';
import { hangCho, tomTat, LOAI } from './kho-viec.js';
import { chiTietViec } from './chi-tiet.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/** Hai vai được vào bảng điều phối. Quản trị vào được để đi kiểm, không phải để làm thay. */
export const VAI_VAO_DUOC = Object.freeze(['sale', 'quan_tri']);

/* ─────────────────────────── ba chỗ tiêm từ ngoài ─────────────────────────── */

let _chanDangNhap = null;
let _chanVai = null;
let _pheuNhatKy = null;

/**
 * Nối cái chắn đăng nhập của L0-M3. Hình dạng đúng bằng `batBuocDangNhap` bên đó:
 * `fn()` → middleware Express.
 */
export function datChanDangNhap(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datChanDangNhap: cần một hàm.');
  _chanDangNhap = fn || null;
}

/**
 * Nối cái chắn vai của L0-M3. Hình dạng đúng bằng `batBuocVaiHTTP` bên đó:
 * `fn(...vai)` → middleware Express.
 */
export function datChanVai(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datChanVai: cần một hàm.');
  _chanVai = fn || null;
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

// Gọi cái chắn TẠI LÚC CÓ YÊU CẦU, không phải lúc dựng router: người dựng ứng dụng nối
// chắn sau khi `app.use(taoRouterDieuPhoi())` là chuyện thường, mà chốt sớm thì lúc đó
// router đã ôm cái chắn "chưa nối" vĩnh viễn.
const chanDangNhapMw = () => (req, res, next) => (
  _chanDangNhap ? _chanDangNhap()(req, res, next) : chanChuaNoi('datChanDangNhap')(req, res)
);
const chanVaiMw = () => (req, res, next) => (
  _chanVai ? _chanVai(...VAI_VAO_DUOC)(req, res, next) : chanChuaNoi('datChanVai')(req, res)
);

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

  /* ── hai trang ── */
  r.get('/dieu-phoi', ...chan, (_req, res) => res.sendFile(TRANG('dieu-phoi.html')));
  r.get('/viec/:id', ...chan, (_req, res) => res.sendFile(TRANG('chi-tiet-viec.html')));

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

  return r;
}
