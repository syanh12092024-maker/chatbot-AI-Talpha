// ĐƯỜNG HTTP CỦA TẦNG DANH TÍNH.
//
// ĐĂNG NHẬP BẰNG EMAIL. Lược đồ thật của người A không có cột tên đăng nhập — `nguoi_dung`
// chỉ có `email` (UNIQUE). Thân yêu cầu vẫn NHẬN `tenDangNhap` làm TÊN CŨ để nơi gọi đang
// có không vỡ, nhưng `email` được đọc trước.
//
// | GET  /dang-nhap     | trang đăng nhập                                              |
// | POST /api/dang-nhap | mật khẩu đúng + đúng MỘT team → phát vé luôn                  |
// |                     | mật khẩu đúng + NHIỀU team  → vé TẠM + danh sách team         |
// | GET  /chon-team     | trang chọn team                                               |
// | POST /api/chon-team | vé tạm (hoặc vé cũ) + { teamId } → vé đủ quyền cho team đó     |
// | POST /api/dang-xuat | xoá cookie                                                    |
// | GET  /api/toi       | tôi là ai, đang ở team nào, thuộc những team nào               |
//
// Thay cho Basic Auth của bản đang chạy (`src/server.js` dòng 40–54): Basic Auth chỉ có
// MỘT tài khoản dùng chung nên không biết ai làm gì, không có team, không có vai, và không
// đăng xuất được. Vé ký giải cả bốn.

import express from 'express';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bam, kiem } from './mat-khau.js';
import { phatVe, phatVeTam, TEN_COOKIE, HAN_VE_MS, HAN_VE_TAM_MS } from './ve.js';
import { timTheoEmail, teamCuaNguoi, vaiTrongTeam } from './kho-nguoi-dung.js';
import { ghiNhatKyAuth, layIp } from './lop-express.js';
import { taoBoiCanh, NGUON } from './boi-canh.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = (ten) => path.join(THU_MUC, 'trang', ten);

/**
 * MỘT thông điệp cho cả BỐN ca hỏng: không có tài khoản · `hoat_dong = false` ·
 * `mat_khau_hash IS NULL` (chưa đặt mật khẩu) · sai mật khẩu.
 * Ba ca đầu đã được `timTheoEmail` gộp thành `null` — xem `kho-nguoi-dung.js`.
 */
const SAI_DANG_NHAP = Object.freeze({
  ok: false, ma: 'sai_dang_nhap', thongDiep: 'Sai email hoặc mật khẩu.',
});

/* ───────────────────────────────── hãm thử sai ──────────────────────────────────────
 * Cùng một EMAIL sai quá 5 lần trong 15 phút → 429 trong 15 phút.
 *
 * GIỚI HẠN ĐÃ BIẾT: bộ đếm nằm trong RAM của MỘT tiến trình. Chạy nhiều tiến trình (hoặc
 * nhiều máy) thì mỗi tiến trình đếm riêng, nên trần thật là 5 × số tiến trình. Giai đoạn 1
 * chạy một tiến trình nên đủ; muốn chặt hơn thì giai đoạn 2 đẩy bộ đếm xuống cơ sở dữ liệu
 * hoặc Redis — đổi đúng ba hàm dưới đây, không đụng đường HTTP.
 *
 * Bộ đếm khoá theo EMAIL đã hạ chữ thường, để đổi hoa/thường không lách được hãm. Chỗ này
 * cố tình gộp hoa/thường, khác với lúc TRA CỨU (`timTheoEmail` so nguyên văn vì cột là
 * `text` UNIQUE thường): gộp ở bộ đếm chỉ làm hãm chặt hơn, gộp ở tra cứu thì làm mất người.
 * Bộ đếm KHÔNG phân biệt tài khoản có tồn tại hay không — phân biệt là để lộ tài khoản nào có thật.
 */
const HAN_HAM_MS = 15 * 60 * 1000;
const SO_LAN_TOI_DA = 5;
const TRAN_BO_NHO = 5000;
const _demSai = new Map(); // email(chữ thường) → { so, moc }

function donRac(bayGio) {
  if (_demSai.size <= TRAN_BO_NHO) return;
  for (const [k, v] of _demSai) if (bayGio - v.moc > HAN_HAM_MS) _demSai.delete(k);
}

function daBiHam(khoa, bayGio = Date.now()) {
  const m = _demSai.get(khoa);
  if (!m) return false;
  if (bayGio - m.moc > HAN_HAM_MS) { _demSai.delete(khoa); return false; }
  return m.so >= SO_LAN_TOI_DA;
}

function ghiLanSai(khoa, bayGio = Date.now()) {
  const m = _demSai.get(khoa);
  if (!m || bayGio - m.moc > HAN_HAM_MS) { _demSai.set(khoa, { so: 1, moc: bayGio }); donRac(bayGio); return 1; }
  m.so += 1;
  m.moc = bayGio;   // hãm tính từ lần sai GẦN NHẤT: "429 trong 15 phút" kể từ lúc dừng gõ
  return m.so;
}

const xoaLanSai = (khoa) => _demSai.delete(khoa);

/** Mở hãm bằng tay (test, hoặc quản trị gỡ cho người gõ nhầm). Không có đường HTTP nào gọi. */
export function xoaBoDemThuSai(email) {
  if (email == null) { _demSai.clear(); return; }
  xoaLanSai(String(email).trim().toLowerCase());
}

/* ───────────────────────────── giữ cho hai ca cùng độ trễ ───────────────────────────
 * Không có tài khoản mà trả về ngay thì thời gian phản hồi tự khai "tài khoản này không
 * tồn tại". Nên ca không có tài khoản vẫn chạy một lần `kiem` thật trên một chuỗi băm giả.
 */
let _bamGiaP = null;
const bamGia = () => (_bamGiaP ??= bam(randomBytes(24).toString('hex')));

/* ──────────────────────────────────── cookie ──────────────────────────────────────── */

function thanhPhanCookie(giaTri, hanMs) {
  const p = [
    `${TEN_COOKIE}=${encodeURIComponent(giaTri)}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(hanMs / 1000))}`,
  ];
  if (process.env.NODE_ENV === 'production') p.push('Secure');
  return p.join('; ');
}

const datCookieVe = (res, ve, hanMs) => res.append('Set-Cookie', thanhPhanCookie(ve, hanMs));
const xoaCookieVe = (res) => res.append('Set-Cookie', thanhPhanCookie('', 0));

/* ──────────────────────────────────── router ──────────────────────────────────────── */

/**
 * @param {{duongSauKhiVao?:string, duongChonTeam?:string}} [tuyChon]
 */
export function taoRouterAuth({ duongSauKhiVao = '/dieu-phoi', duongChonTeam = '/chon-team' } = {}) {
  const r = express.Router();

  // Tự đọc JSON để router dùng được cả khi ứng dụng chưa mount express.json().
  // body-parser tự bỏ qua khi thân đã được đọc rồi, nên mount hai lần không sao.
  r.use(express.json({ limit: '64kb' }));

  r.get('/dang-nhap', (_req, res) => res.sendFile(TRANG('dang-nhap.html')));
  r.get('/chon-team', (_req, res) => res.sendFile(TRANG('chon-team.html')));

  /* ── đăng nhập ── */
  r.post('/api/dang-nhap', async (req, res, next) => {
    try {
      // `email` là tên trường CHÍNH. `tenDangNhap` là TÊN CŨ, giữ lại làm đường lui cho nơi
      // gọi viết từ hồi B đoán lược đồ — đọc sau, không bao giờ ghi đè `email`.
      const email = String(req.body?.email ?? req.body?.tenDangNhap ?? '').trim();
      const matKhau = String(req.body?.matKhau ?? '');
      if (!email || !matKhau) return res.status(401).json(SAI_DANG_NHAP);

      const khoaHam = email.toLowerCase();
      if (daBiHam(khoaHam)) {
        await ghiNhatKyAuth(null, {
          hanhDong: 'dang_nhap_that_bai',
          doiTuongLoai: 'nguoi_dung', doiTuongId: null,
          sau: { email, ly_do: 'ham_thu_sai', ip: layIp(req) },
          ghiChu: 'bị hãm vì thử sai quá nhiều',
        });
        return res.status(429).json({
          ok: false, ma: 'thu_qua_nhieu',
          thongDiep: 'Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.',
        });
      }

      const nd = await timTheoEmail(email);
      const dung = nd ? await kiem(matKhau, nd.mat_khau_hash) : await kiem(matKhau, await bamGia());

      if (!nd || !dung) {
        const lan = ghiLanSai(khoaHam);
        await ghiNhatKyAuth(null, {
          hanhDong: 'dang_nhap_that_bai',
          doiTuongLoai: 'nguoi_dung', doiTuongId: nd ? nd.id : null,
          sau: { email, lan_sai: lan, ip: layIp(req) },
          ghiChu: 'sai email hoặc mật khẩu',
        });
        return res.status(401).json(SAI_DANG_NHAP);
      }

      xoaLanSai(khoaHam);
      const dsTeam = await teamCuaNguoi(nd.id);

      if (!dsTeam.length) {
        await ghiNhatKyAuth(null, {
          hanhDong: 'dang_nhap_that_bai',
          doiTuongLoai: 'nguoi_dung', doiTuongId: nd.id,
          sau: { email, ly_do: 'khong_thuoc_team', ip: layIp(req) },
          ghiChu: 'mật khẩu đúng nhưng không thuộc team nào',
        });
        return res.status(403).json({
          ok: false, ma: 'khong_thuoc_team',
          thongDiep: 'Tài khoản chưa được xếp vào team nào. Báo quản trị.',
        });
      }

      // ⚠️ `tenDangNhap` GIỮ NGUYÊN TÊN TRƯỜNG (hợp đồng với người A, `boi-canh.js` cấm đụng)
      //    nhưng GIÁ TRỊ nay là EMAIL — lược đồ thật không còn cột tên đăng nhập.
      // NHIỀU team → CHƯA phát vé đủ quyền. Chỉ vé tạm, chưa mang teamId, chưa đọc được gì.
      if (dsTeam.length > 1) {
        datCookieVe(res, phatVeTam({ nguoiDungId: nd.id, tenDangNhap: nd.email }), HAN_VE_TAM_MS);
        return res.json({
          ok: true, canChonTeam: true, diTiep: duongChonTeam,
          toi: { nguoiDungId: nd.id, tenDangNhap: nd.email, hoTen: nd.ten, teamId: null, vai: [] },
          dsTeam,
        });
      }

      const t = dsTeam[0];
      const bc = boiCanhCua(nd, t, req);
      datCookieVe(res, phatVe({ nguoiDungId: nd.id, tenDangNhap: nd.email, teamId: t.teamId, vai: t.vai }), HAN_VE_MS);
      await ghiNhatKyAuth(bc, {
        hanhDong: 'dang_nhap',
        doiTuongLoai: 'nguoi_dung', doiTuongId: nd.id,
        sau: { email: nd.email, team_id: t.teamId, vai: t.vai, mot_team: true },
        ghiChu: 'đăng nhập, chỉ thuộc một team nên vào thẳng',
      });
      return res.json({
        ok: true, canChonTeam: false, diTiep: duongSauKhiVao,
        toi: { nguoiDungId: nd.id, tenDangNhap: nd.email, hoTen: nd.ten, teamId: t.teamId, vai: t.vai },
        dsTeam,
      });
    } catch (e) { return next(e); }
  });

  /* ── chọn team (và đổi team) ── */
  r.post('/api/chon-team', async (req, res, next) => {
    try {
      const tam = req.veTam || null;
      const bcCu = req.boiCanh || null;
      const nguoiDungId = tam?.nguoiDungId || bcCu?.nguoiDungId || null;
      const tenDangNhap = tam?.tenDangNhap || bcCu?.tenDangNhap || null;
      if (!nguoiDungId) {
        return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
      }

      const teamId = String(req.body?.teamId ?? '').trim();
      if (!teamId) {
        return res.status(400).json({ ok: false, ma: 'thieu_team', thongDiep: 'Thiếu teamId.' });
      }

      const vai = await vaiTrongTeam(nguoiDungId, teamId);
      if (!vai.length) {
        // Chọn team mình KHÔNG thuộc = cố với sang dữ liệu team khác → ghi đúng mã an ninh.
        // Ca TEAM KỸ THUẬT (`chua-phan`) cũng rơi vào đây: `teamCuaNguoi` đã loại nó nên
        // `vaiTrongTeam` trả `[]`, dù người đó có dòng thành viên đi nữa.
        await ghiNhatKyAuth(bcCu, {
          hanhDong: 'chan_xuyen_team',
          doiTuongLoai: 'team', doiTuongId: teamId,
          sau: { team_xin: teamId, team_cua: bcCu?.teamId ?? null, nguoi_dung_id: nguoiDungId, email: tenDangNhap },
          ghiChu: 'chọn một team không thuộc về, hoặc team kỹ thuật',
        });
        return res.status(403).json({
          ok: false, ma: 'khong_thuoc_team', thongDiep: 'Bạn không thuộc team này.',
        });
      }

      const dsTeam = await teamCuaNguoi(nguoiDungId);
      const t = dsTeam.find((x) => x.teamId === teamId) || { teamId, tenTeam: teamId, vai };
      // `tenDangNhap` ở đây lấy từ vé/bối cảnh cũ — giá trị của nó nay là EMAIL (xem trên).
      const bc = boiCanhCua({ id: nguoiDungId, email: tenDangNhap }, t, req);

      datCookieVe(res, phatVe({ nguoiDungId, tenDangNhap, teamId, vai }), HAN_VE_MS);
      await ghiNhatKyAuth(bc, {
        hanhDong: bcCu ? 'doi_team' : 'dang_nhap',
        doiTuongLoai: 'team', doiTuongId: teamId,
        truoc: bcCu ? { team_id: bcCu.teamId, vai: [...bcCu.vai] } : null,
        sau: { team_id: teamId, vai },
        ghiChu: bcCu ? 'đổi sang team khác' : 'chọn team sau khi đăng nhập',
      });
      return res.json({
        ok: true, diTiep: duongSauKhiVao,
        toi: { nguoiDungId, tenDangNhap, teamId, vai, tenTeam: t.tenTeam },
      });
    } catch (e) { return next(e); }
  });

  /* ── đăng xuất ── */
  r.post('/api/dang-xuat', async (req, res, next) => {
    try {
      xoaCookieVe(res);
      if (req.boiCanh) {
        await ghiNhatKyAuth(req.boiCanh, {
          hanhDong: 'dang_xuat',
          doiTuongLoai: 'nguoi_dung', doiTuongId: req.boiCanh.nguoiDungId,
          sau: { team_id: req.boiCanh.teamId },
          ghiChu: 'đăng xuất',
        });
      }
      // Vé ký không cắt được từ máy chủ (không có bảng phiên — hợp đồng mục 6). Xoá cookie
      // là hết đường dùng từ trình duyệt; vé đã bị chép ra ngoài thì vẫn sống tới lúc hết hạn.
      return res.json({ ok: true, diTiep: '/dang-nhap' });
    } catch (e) { return next(e); }
  });

  /* ── tôi là ai ── */
  r.get('/api/toi', async (req, res, next) => {
    try {
      const bc = req.boiCanh || null;
      const tam = req.veTam || null;
      if (!bc && !tam) {
        return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
      }
      const nguoiDungId = bc?.nguoiDungId || tam.nguoiDungId;
      const dsTeam = await teamCuaNguoi(nguoiDungId);
      return res.json({
        ok: true,
        nguoiDungId,
        tenDangNhap: bc?.tenDangNhap ?? tam?.tenDangNhap ?? null,
        teamId: bc?.teamId ?? null,
        vai: bc ? [...bc.vai] : [],
        dsTeam,
        canChonTeam: !bc,
      });
    } catch (e) { return next(e); }
  });

  return r;
}

/**
 * Bối cảnh để GHI NHẬT KÝ ngay tại chỗ phát vé — cùng thứ mà lượt sau lớp đọc cookie dựng ra.
 * ⚠️ Trường `tenDangNhap` của bối cảnh nhận EMAIL: tên trường là hợp đồng với người A và
 *    `boi-canh.js` cấm đụng, nhưng lược đồ thật không còn cột tên đăng nhập.
 */
function boiCanhCua(nd, t, req) {
  try {
    return taoBoiCanh({
      nguoiDungId: nd.id, tenDangNhap: nd.email,
      teamId: t.teamId, vai: t.vai, nguon: NGUON.PHIEN, ip: layIp(req),
    });
  } catch {
    return null;   // vai lạ trong cơ sở dữ liệu — vẫn ghi được nhật ký với boiCanh rỗng
  }
}
