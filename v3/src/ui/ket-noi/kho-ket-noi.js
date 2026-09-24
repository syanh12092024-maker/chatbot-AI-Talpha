// TẦNG ĐỌC CỦA MÀN «KẾT NỐI & TOKEN» (G2-B4, sóng 0 giai đoạn 2).
//
// Gỡ chặn: «token chết phải sửa `.env` rồi khởi động lại».
//
// ─── MÀN NÀY MỎNG, VÀ ĐÓ LÀ CHUYỆN TỐT ─────────────────────────────────────────────────
// Kho token Pancake **đã có sẵn và đã chạy thật** trong tiến trình bot (`src/pancake.js`):
// thứ tự dự phòng, loại token hết hạn, đếm số page đang định tuyến qua từng token, thử token
// sống trước khi nhận, và xoá chỉ số định tuyến để các page tự dò lại chân tốt nhất — tức là
// **không cần khởi động lại**, đúng tiêu chí nghiệm thu sóng 0.
//
// Nên việc của v3 KHÔNG phải viết lại kho token. Viết lại là đẻ bản thứ hai của một thứ đang
// chạy đúng, rồi hai bản lệch nhau. Việc của v3 là: **cho người ta thấy nó, và bọc lớp quyền
// + nhật ký quanh nó** — hai thứ mà dashboard cũ (Basic auth, không có vai, không có nhật ký)
// không có.
//
// ─── MÀN NÀY LÀ TOÀN HỆ, KHÔNG THEO TEAM — và phải NÓI RA ──────────────────────────────
// Kho token dùng chung cho mọi page của mọi team: `.env` + `pancake-tokens.json` là tài
// nguyên cấp máy chủ, không có cột `team_id` nào. Một quản trị của `auus` thêm token là thêm
// cho cả `tieu-alpha`.
//
// Đây là chỗ dễ hiểu nhầm nhất của màn: mọi màn khác của v3 đều chỉ hiện dữ liệu team đang
// mở, nên người dùng có nếp nghĩ «cái tôi thấy là của team tôi». Ở đây nếp đó SAI. Nên màn
// phải nói thẳng bằng chữ (`LA_TOAN_HE`), không để người ta tự suy.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { docJwt } from '../../../../src/token-pancake.js';
import { ghiNhatKy } from '../../audit/index.js';
import { HANH_DONG } from '../../audit/hanh-dong.js';
import {
  danhSachToken, trangThaiCau, coTaiKhoan, gocBot, goiAdminV1,
  LoiCauBotDong, LoiCauBotHong,
} from '../../noi-day/cau-bot-v1.js';

export class LoiKetNoi extends Error {
  constructor(thongDiep, ma = 'ket_noi', status = 400) {
    super(thongDiep);
    this.name = 'LoiKetNoi';
    this.ma = ma;
    this.status = status;
  }
}

/* TÊN NGUỒN BẰNG LỜI NGƯỜI DÙNG (GD4 · 24/09/2026).
 *
 * Nhãn gốc đến từ `src/token-pancake.js` và `src/pancake.js` — đất của người A, và ở đó
 * «CSDL (v3)» là tên đúng. Trên màn thì không: người vận hành không biết CSDL là gì, và
 * cũng không cần biết. Dịch ở tầng màn, KHÔNG sửa file bên kia.
 *
 * Nhãn lạ thì giữ nguyên văn — bên kia thêm một kho mới mà màn nuốt mất là giấu đi một
 * nguồn tài khoản đang chạy thật.
 */
const TEN_NGUON = Object.freeze({
  'chính (.env)': 'cấu hình máy chủ · chính',
  'phụ (.env)': 'cấu hình máy chủ · phụ',
  'CSDL (v3)': 'thêm từ màn này',
  dashboard: 'thêm từ màn cũ',
});
const tenNguon = (n) => TEN_NGUON[String(n || '')] || String(n || '');

/** Câu hiện thẳng trên đầu màn. Không giấu vào tài liệu. */
export const LA_TOAN_HE =
  'Kho tài khoản Pancake dùng chung cho MỌI team. Khác với các màn khác: ở đây bạn sửa thứ của '
  + 'cả hệ, không phải dữ liệu của riêng team đang mở. Thêm hay bỏ một tài khoản là đổi cho cả ba team.';

/** Thứ tự trong danh sách CHÍNH LÀ thứ tự dự phòng — không phải thứ tự sắp cho đẹp. */
export const GIAI_THICH_THU_TU =
  'Thứ tự trên xuống chính là thứ tự dự phòng: tài khoản chính trước, rồi tài khoản phụ, cuối '
  + 'cùng là tài khoản thêm từ màn này. Tài khoản hết hạn bị bỏ qua tự động.';

/* ═══════════════ KHO TOKEN TRONG CSDL (migration 019) ═══════════════════════════════
 *
 * Trước: màn này chỉ có MỘT nguồn token — hỏi HTTP sang `/admin/api` của tiến trình bot.
 * Hai hệ quả đo được 17/09: tắt bot là màn chết, và cửa ghi ấy bị `PANCAKE_READONLY`
 * chắn nên máy dev KHÔNG thêm được token bằng giao diện, dù thêm token chẳng gửi cho ai.
 *
 * Nay nguồn CHÍNH là bảng `token_pancake` (v3 ghi thẳng, có vai + nhật ký). Tiến trình bot
 * đọc cùng bảng đó qua `src/pancake.js#datKhoTokenDb`, nên hai bên không lệch kho.
 * Token trong `.env` vẫn hiện (chỉ xem — muốn đổi thì sửa `.env`), và kho cũ
 * `pancake-tokens.json` chỉ hiện THÊM khi tiến trình bot còn sống; không gọi được thì màn
 * vẫn đủ dùng, chỉ mất phần «token này đang phủ mấy page».
 */
let _khoTokenV3 = null;

/** Nhận bộ đọc/ghi kho token CSDL. Thiếu một hàm là từ chối cả cụm — nửa cửa khó hiểu hơn không cửa. */
export function datKhoTokenV3(cua) {
  if (cua == null) { _khoTokenV3 = null; return null; }
  const thieu = ['ds', 'them', 'bo'].filter((k) => typeof cua[k] !== 'function');
  if (thieu.length) throw new LoiKetNoi(`datKhoTokenV3 thiếu hàm: ${thieu.join(', ')}`, 'noi_day_thieu', 500);
  _khoTokenV3 = cua;
  return _khoTokenV3;
}
export const daNoiKhoTokenV3 = () => _khoTokenV3 != null;
export function batBuocKhoTokenV3() {
  if (!_khoTokenV3) {
    throw new LoiKetNoi(
      'chưa nối kho token CSDL — máy chủ v3 dựng thiếu cửa, không phải bạn thiếu quyền',
      'chua_noi', 500,
    );
  }
  return _khoTokenV3;
}

/** Token khai trong `.env` của CHÍNH tiến trình này — chỉ xem, không sửa được từ màn. */
export function tokenTuEnv(env = process.env) {
  const chinh = String(env.PANCAKE_TOKEN || '').trim();
  const phu = String(env.PANCAKE_TOKENS_EXTRA || '').split(',').map((t) => t.trim()).filter(Boolean);
  const dong = (t, nguon) => {
    const d = docJwt(t) || { ten: '(token lỗi định dạng)', hetHan: null };
    const het = d.hetHan ? d.hetHan.getTime() : 0;
    return {
      thuTu: null, id: null, ten: d.ten || '(không tên)', het, daHet: !!het && het <= Date.now(),
      nguon, boDuoc: false, soPageDangDung: 0, duoi: String(t).slice(-8),
    };
  };
  return [...(chinh ? [dong(chinh, 'chính (.env)')] : []), ...phu.map((t) => dong(t, 'phụ (.env)'))];
}

/* ═══════════ KÉO DANH MỤC POS → `san_pham` / `goi_gia` ═══════════════════════════════
 *
 * Bộ đọc danh mục (`src/pos/doc-danh-muc.js`) đã có từ L1-M1 và chưa nút nào gọi — chú
 * thích đầu `v3/src/ui/san-pham/kho-san-pham.js` ghi thẳng: «Cửa POS đọc được tồn kho
 * nhưng chưa ai nối», nên bảng `san_pham` rỗng và màn Sản phẩm phải đọc Sheet của bot v1.
 *
 * Nút nằm Ở ĐÂY chứ không ở màn Sản phẩm, vì nguồn của lượt kéo là chính bảng kết nối POS
 * ngay bên dưới nó: kéo được hay không phụ thuộc shop và khoá API khai ở đó. Màn Sản phẩm
 * là nơi NHÌN kết quả (qua màn Vận hành V3, chỗ đọc thẳng `san_pham`).
 */
let _keoDanhMuc = null;

export function datKeoDanhMuc(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKetNoi('datKeoDanhMuc cần một hàm');
  _keoDanhMuc = fn || null;
  return _keoDanhMuc;
}
export const daNoiKeoDanhMuc = () => _keoDanhMuc != null;

export async function keoDanhMucPos(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_keoDanhMuc) {
    throw new LoiKetNoi(
      'máy chủ chưa nối cửa kéo danh mục POS — lỗi dựng ứng dụng, KHÔNG phải «không có sản phẩm».',
      'chua_noi', 500,
    );
  }
  return _keoDanhMuc(bc);
}

/* ─── cổng tiêm cho kết nối POS (đọc theo team — thứ DUY NHẤT của màn này có team) ─── */

let _docKetNoiPos = null;

/* ═══════════════════ CỬA GHI KẾT NỐI POS (15/09) ═══════════════════════════════════
 *
 * Bảng `ket_noi_pos` trước nay chỉ vào được bằng `npm run di-tru` đọc `pancake-shops.json`.
 * Bốn hàm dưới là đường người bấm. Chúng KHÔNG tự viết câu SQL nào — tầng dưới
 * (`src/pos/ket-noi.js`) giữ cả mã hoá lẫn vế `team_id` trong WHERE, đúng như bộ đọc.
 *
 * ⛔ KHOÁ API chỉ đi MỘT CHIỀU: vào. Không hàm nào ở đây trả khoá ra, kể cả đã mã hoá.
 */
let _ghiKetNoiPos = null;

/** Nhận bộ bốn hàm ghi. Thiếu một hàm là từ chối cả cụm — nửa cửa còn khó hiểu hơn không cửa. */
export function datGhiKetNoiPos(cua) {
  if (cua == null) { _ghiKetNoiPos = null; return null; }
  const thieu = ['them', 'sua', 'batTat', 'bo'].filter((k) => typeof cua[k] !== 'function');
  if (thieu.length) {
    throw new LoiKetNoi(`datGhiKetNoiPos thiếu hàm: ${thieu.join(', ')}`, 'noi_day_thieu', 500);
  }
  _ghiKetNoiPos = cua;
  return _ghiKetNoiPos;
}
export const daNoiGhiKetNoiPos = () => _ghiKetNoiPos != null;

function batBuocCuaGhi() {
  if (!_ghiKetNoiPos) {
    throw new LoiKetNoi(
      'Máy chủ chưa nối cửa ghi kết nối POS — đây là lỗi cấu hình, không phải «không sửa được». '
      + 'Xem `datGhiKetNoiPos` trong v3/src/vai-b.js.',
      'chua_noi', 500,
    );
  }
  return _ghiKetNoiPos;
}

export async function themPos(boiCanh, thamSo) {
  return batBuocCuaGhi().them(batBuocBoiCanh(boiCanh), thamSo);
}
export async function suaPos(boiCanh, id, thamSo) {
  return batBuocCuaGhi().sua(batBuocBoiCanh(boiCanh), id, thamSo);
}
export async function batTatPos(boiCanh, id, bat) {
  return batBuocCuaGhi().batTat(batBuocBoiCanh(boiCanh), id, bat);
}
export async function boPos(boiCanh, id) {
  return batBuocCuaGhi().bo(batBuocBoiCanh(boiCanh), id);
}

export function datDocKetNoiPos(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKetNoi('datDocKetNoiPos cần một hàm');
  _docKetNoiPos = fn || null;
  return _docKetNoiPos;
}

export const daNoiKetNoiPosKN = () => typeof _docKetNoiPos === 'function';

/* ─────────────────────────────── đọc ─────────────────────────────── */

const NGAY = 86400000;

/**
 * Kho token, kèm phân loại sức khoẻ. Phân loại ở ĐÂY chứ không trong HTML — để có bài test
 * khoá lại, và để «sắp hết hạn» không thành một con số ngưỡng gõ tay ở hai chỗ.
 */
export const NGUONG_SAP_HET_NGAY = 7;

export function sucKhoeToken(t, bay = Date.now()) {
  if (t.daHet) return { muc: 'do', chu: 'đã hết hạn — đang bị bỏ qua' };
  if (!t.het) return { muc: 'xam', chu: 'không đọc được hạn' };
  const conNgay = Math.floor((t.het - bay) / NGAY);
  if (conNgay <= NGUONG_SAP_HET_NGAY) {
    return { muc: 'vang', chu: `còn ${conNgay <= 0 ? 'dưới 1' : conNgay} ngày`, conNgay };
  }
  return { muc: 'xanh', chu: `còn ${conNgay} ngày`, conNgay };
}

/**
 * Cảnh báo suy từ cả kho — thứ một bảng token không tự nói ra.
 * Đúng bài học: «token chính phải phủ nhiều page bật AI nhất» (sổ kho token).
 */
export function canhBaoKhoToken(ds, bay = Date.now()) {
  const ra = [];
  const song = ds.filter((t) => !t.daHet);
  if (!ds.length) {
    ra.push({ ma: 'khong_co_token', muc: 'do', chu: 'Không có token Pancake nào — bot không đọc và không gửi được tin nào.' });
    return ra;
  }
  if (!song.length) {
    ra.push({ ma: 'chet_het', muc: 'do', chu: `Cả ${ds.length} token đều đã hết hạn — bot đang không gọi được Pancake.` });
    return ra;
  }
  if (song.length === 1) {
    ra.push({ ma: 'khong_du_phong', muc: 'vang', chu: 'Chỉ còn MỘT token sống — token này chết là mất hẳn, không có gì đỡ.' });
  }
  const sapHet = song.filter((t) => sucKhoeToken(t, bay).muc === 'vang');
  if (sapHet.length) {
    ra.push({
      ma: 'sap_het_han', muc: 'vang',
      chu: `${sapHet.length} token sắp hết hạn trong ${NGUONG_SAP_HET_NGAY} ngày: ${sapHet.map((t) => t.ten).join(', ')}.`,
    });
  }
  const daHet = ds.filter((t) => t.daHet);
  if (daHet.length) {
    ra.push({ ma: 'co_token_chet', muc: 'vang', chu: `${daHet.length} token đã hết hạn, đang bị bỏ qua — nên gỡ cho đỡ rối.` });
  }
  // ─── THỨ TỰ DỰ PHÒNG ĐẶT SAI ────────────────────────────────────────────────────────
  // Luật (sổ kho token): «token chính phải phủ NHIỀU page bật AI nhất». Token chính là
  // token được thử ĐẦU TIÊN cho mọi page; nó phủ ít thì phần lớn page phải rơi xuống token
  // sau mới gọi được — tốn thêm một vòng gọi hỏng cho mỗi page, mỗi lượt quét.
  //
  // Bản đầu chỉ bắn khi token chính phủ ĐÚNG 0 page. Đo trên máy chủ thật 25/08 mới thấy
  // luật đó quá hẹp: token chính phủ **16** page trong khi một token phụ phủ **109** — thứ
  // tự đang ngược hẳn, mà không có cảnh báo nào vì 16 ≠ 0. Bài test đơn vị không bắt được
  // chỗ này; chỉ có số thật mới lộ ra.
  const chinh = ds[0];
  if (chinh && !chinh.daHet && song.length > 1) {
    const phuNhieuNhat = song.reduce((a, b) => (b.soPageDangDung > a.soPageDangDung ? b : a), song[0]);
    if (phuNhieuNhat !== chinh && phuNhieuNhat.soPageDangDung > chinh.soPageDangDung) {
      ra.push({
        ma: 'chinh_khong_phu',
        muc: chinh.soPageDangDung === 0 ? 'do' : 'vang',
        chu: `Thứ tự dự phòng đang đặt sai: token CHÍNH ("${chinh.ten}") chỉ phủ `
          + `${chinh.soPageDangDung} page, trong khi "${phuNhieuNhat.ten}" phủ `
          + `${phuNhieuNhat.soPageDangDung} page. Token chính được thử ĐẦU TIÊN cho mọi page, `
          + `nên đặt token phủ nhiều nhất lên đầu thì đỡ được một vòng gọi hỏng cho `
          + `${phuNhieuNhat.soPageDangDung - chinh.soPageDangDung} page mỗi lượt quét.`,
      });
    }
  }
  return ra;
}

/**
 * Toàn bộ dữ liệu màn cần. KHÔNG ném khi cầu hỏng — trả về khối `trong` nói vì sao, vì cầu
 * hỏng là một sự thật đáng hiện chứ không phải một trang lỗi.
 */
export async function khoToken() {
  const cua = trangThaiCau();
  const kho = _khoTokenV3;
  if (!kho) {
    return {
      token: [], canhBao: [], cua, quanLyDuoc: false,
      trong: {
        rong: true, vi: 'chua_cai_dat',
        noi: 'Máy chủ v3 chưa nối kho token CSDL — đây là lỗi dựng ứng dụng, KHÔNG phải «không có token».',
        diTiep: { chu: 'Xem log khởi động của dịch vụ v3', duong: null },
      },
    };
  }

  // ① Nguồn CHÍNH: bảng `token_pancake`. ② `.env` của chính tiến trình này — chỉ xem.
  const tuDb = (await kho.ds()).map((t) => ({
    thuTu: null, id: t.id, ten: t.ten, het: t.hetHan, daHet: t.hetHanRoi,
    nguon: t.nguon, boDuoc: true, bat: t.bat, soPageDangDung: 0, duoi: t.duoi,
  }));
  const ds = [...tuEnvSapXep(), ...tuDb];

  // ③ Kho cũ của tiến trình bot (`pancake-tokens.json`) + «token này đang phủ mấy page».
  //    KHÔNG bắt buộc: bot tắt thì màn vẫn đủ dùng, chỉ thiếu phần trang trí — đó chính là
  //    điều khiến màn này sống độc lập được với tiến trình v1.
  // HAI TRƯỜNG, CỐ Ý (GD4 · 24/09): `botIm` là câu cho người vận hành đọc trên màn;
  // `botImKyThuat` là nguyên nhân bằng tên biến, dành cho người đi sửa máy chủ — màn dồn nó
  // xuống ô «Nguồn số». Gộp một trường thì hoặc mặt màn đầy chữ máy, hoặc người sửa mất manh mối.
  let botIm = null;
  let botImKyThuat = null;
  if (coTaiKhoan()) {
    try {
      const cu = await danhSachToken();
      const theoDuoi = new Map(cu.map((t) => [t.duoi, t]));
      for (const t of ds) {
        const g = theoDuoi.get(t.duoi);
        if (g) t.soPageDangDung = g.soPageDangDung;
      }
      for (const t of cu) {
        if (t.nguon === 'dashboard' && !ds.some((x) => x.duoi === t.duoi)) {
          ds.push({ ...t, id: null, boDuoc: false, nguon: 'kho cũ của tiến trình bot' });
        }
      }
    } catch (e) {
      if (!(e instanceof LoiCauBotDong || e instanceof LoiCauBotHong)) throw e;
      botIm = 'chưa hỏi được tiến trình bot, nên thiếu cột «page đang dùng»';
      botImKyThuat = e.message;
    }
  } else {
    botIm = 'máy chủ chưa có tài khoản quản trị để hỏi tiến trình bot';
    botImKyThuat = 'thiếu `ADMIN_USER`/`ADMIN_PASS` trong cấu hình máy chủ';
  }

  return {
    token: ds.map((t) => ({ ...t, nguon: tenNguon(t.nguon), sucKhoe: sucKhoeToken(t) })),
    canhBao: canhBaoKhoToken(ds),
    cua,
    quanLyDuoc: true,
    // Nói ra chỗ KHÔNG đọc được, thay vì im lặng hiện thiếu.
    botIm,
    botImKyThuat,
    trong: ds.length ? null : {
      rong: true, vi: 'chua_cai_dat',
      noi: 'Chưa có tài khoản Pancake nào — bot không đọc và không gửi được tin nào.',
      diTiep: { chu: 'Thêm tài khoản đầu tiên', duong: '#them-token' },
    },
  };
}

/**
 * THỬ TOKEN SỐNG — một lượt `GET /pages` sang Pancake, không phải lượt gửi.
 *
 * Vì sao được phép đi ra Internet từ đây, trong khi `src/pos/ket-noi.js` cố ý KHÔNG thử
 * khoá POS: van `V3_PANCAKE_GUI` chỉ áp nhóm GỬI/GHI (POST/PUT/PATCH/DELETE), cửa ĐỌC
 * không bị chặn — xem bảng biến. Và cái giá của việc không thử đã đo được ở kho cũ: token
 * chết nằm im trong kho, tới lượt chat đầu tiên của khách mới lộ.
 */
export async function thuTokenSong(token, { hetGio = 12000, fetchFn = fetch } = {}) {
  const bo = AbortSignal.timeout ? AbortSignal.timeout(hetGio) : undefined;
  try {
    const res = await fetchFn(`https://pages.fm/api/v1/pages?access_token=${encodeURIComponent(token)}`, { signal: bo });
    const j = await res.json().catch(() => ({}));
    if (!j?.categorized) {
      return { ok: false, soPage: 0, loi: `Pancake từ chối token (HTTP ${res.status}) — đăng nhập lại lấy token mới?` };
    }
    return { ok: true, soPage: (j.categorized.activated || []).length, loi: '' };
  } catch (e) {
    return { ok: false, soPage: 0, loi: `Không gọi được Pancake để thử token: ${e.message}` };
  }
}

/**
 * Ép tiến trình bot nạp lại kho token NGAY. Best-effort có chủ ý: bot tự nạp lại theo nhịp
 * (`datKhoTokenDb`), nên gọi hụt chỉ làm token có hiệu lực chậm vài phút — KHÔNG được biến
 * một lượt thêm token thành công thành một lỗi đỏ trên màn.
 */
export async function epBotNapLai() {
  if (!coTaiKhoan()) return { ok: false, vi: 'thiếu ADMIN_USER/ADMIN_PASS' };
  try {
    await goiAdminV1('/pancake-tokens/nap-lai', { phuongThuc: 'POST', ghi: false, hetGio: 5000 });
    return { ok: true };
  } catch (e) {
    console.warn('[ket-noi] không ép được tiến trình bot nạp lại kho token:', e.message);
    return { ok: false, vi: e.message };
  }
}

/** `.env` đứng TRƯỚC token CSDL — đúng thứ tự dự phòng của `src/pancake.js#allToks`. */
function tuEnvSapXep() {
  return tokenTuEnv();
}

/** Kết nối POS của TEAM ĐANG MỞ — phần duy nhất của màn này có lớp team. */
export async function ketNoiPosCua(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docKetNoiPos) {
    return {
      pos: [],
      trong: {
        rong: true, vi: 'chua_cai_dat',
        noi: 'Máy chủ chưa nối bộ đọc kết nối POS — lỗi cấu hình, không phải «không có kết nối».',
        diTiep: { chu: 'Xem `datDocKetNoiPos` trong v3/src/vai-b.js', duong: null },
      },
    };
  }
  const pos = await _docKetNoiPos(bc);
  // `suaDuoc` để màn ẨN nút thay vì cho bấm rồi ăn 500 — cùng án lệ với `lop-0-dong`.
  const suaDuoc = daNoiGhiKetNoiPos();
  return {
    pos,
    suaDuoc,
    trong: pos.length ? null : {
      rong: true, vi: 'chua_cai_dat',
      noi: 'Team này chưa có kết nối POS nào — chưa có thì không tạo được đơn cho thị trường nào.',
      diTiep: suaDuoc
        ? { chu: 'Thêm một kết nối ngay dưới đây', duong: null }
        : { chu: 'Nạp từ pancake-shops.json bằng `npm run di-tru`', duong: null },
    },
  };
}

/* ═══════════════════ KÉO DỮ LIỆU VỀ (nạp lại) ═══════════════════════════════════════
 *
 * `npm run di-tru` đọc sáu nguồn của tiến trình bot (pages.json · ai-enabled.json ·
 * conv-state.json · kb-overrides.json · script-versions/ · pancake-shops.json) rồi ghi vào
 * nền v3. Trước 14/09 nó CHỈ chạy được bằng lệnh trên máy chủ — nên «kéo dữ liệu về» là việc
 * không ai làm được từ giao diện.
 *
 * BỐN LUẬT của cửa này, đừng nới:
 *   ① CHỈ ĐỌC tệp nguồn. Lượt nạp không sửa, không xoá file nào của tiến trình bot.
 *   ② KHÔNG ĐÈ CỘT NGƯỜI ĐẶT. `nap.js` upsert theo `page_id` và câu `ON CONFLICT` cố ý bỏ
 *      `marketer`, `trong_diem`, `bot_ai_bat`, `botcake_tat` ra ngoài — ca B-Y4 ④ canh điều
 *      đó. Vì vậy bấm nút này KHÔNG làm mất công gán marketer hay công tắc bot của ai.
 *   ③ MỘT LƯỢT MỘT LÚC. Hai lượt chồng nhau là hai câu ghi cùng một dòng; cửa từ chối lượt
 *      thứ hai bằng 409 kèm giờ lượt đang chạy, KHÔNG xếp hàng âm thầm.
 *   ④ CHẠY NỀN, không giữ kết nối HTTP. Nạp 18.790 hội thoại không phải việc của một yêu
 *      cầu web; trang hỏi lại trạng thái mỗi vài giây.
 */

let _chayNapLai = null;

export function datChayNapLai(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKetNoi('datChayNapLai cần một hàm');
  _chayNapLai = fn || null;
  return _chayNapLai;
}
export const daNoiNapLai = () => typeof _chayNapLai === 'function';

/** Trạng thái của lượt nạp — sống trong bộ nhớ tiến trình, mất khi khởi động lại. */
const NAP = { dangChay: false, batDau: null, xongLuc: null, nguoiChay: null, kq: null, loi: null };

export function trangThaiNapLai() {
  return {
    noiDuoc: daNoiNapLai(),
    dangChay: NAP.dangChay,
    batDau: NAP.batDau,
    xongLuc: NAP.xongLuc,
    nguoiChay: NAP.nguoiChay,
    tomTat: NAP.kq ? tomTatNap(NAP.kq) : null,
    loi: NAP.loi,
  };
}

/** Rút gọn kết quả thô của `di-tru` thành thứ đọc được trên màn. */
export function tomTatNap(kq) {
  const d = (kq && kq.dich) || {};
  const hs = kq && kq.noiHoSoKhach;
  return {
    // Nguồn nào KHÔNG có trên máy này. Rỗng = kéo đủ; có tên = bước đó không có việc để
    // làm, và màn phải nói ra thay vì khoe một con số 0 trông như «kéo xong, chẳng có gì».
    boQuaNguon: Array.isArray(kq && kq.boQuaNguon) ? kq.boQuaNguon : [],
    page: d.page ?? null,
    pageBatAi: d.pageBatAi ?? null,
    hoiThoai: d.hoiThoai ?? null,
    kichBan: d.kichBan ?? null,
    ketNoiPos: kq && kq.ketNoiPos && !kq.ketNoiPos.chuaCoBang ? kq.ketNoiPos.dich ?? null : null,
    hoiThoaiNoiKhach: hs && !hs.chuaCoCot ? (hs.noiMoi ?? null) : null,
    hoiThoaiChuaNoi: hs && !hs.chuaCoCot ? (hs.conChuaNoi ?? null) : null,
  };
}

export async function batDauNapLai(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_chayNapLai) {
    throw new LoiKetNoi(
      'máy chủ chưa nối bộ nạp dữ liệu — đây là lỗi cấu hình, KHÔNG phải «không có gì để nạp».',
      'chua_noi', 500,
    );
  }
  if (NAP.dangChay) {
    throw new LoiKetNoi(
      `một lượt nạp đang chạy từ ${new Date(NAP.batDau).toLocaleString('vi-VN')}`
      + `${NAP.nguoiChay ? ` (do ${NAP.nguoiChay} bấm)` : ''} — chờ nó xong đã.`,
      'dang_chay', 409,
    );
  }

  NAP.dangChay = true;
  NAP.batDau = Date.now();
  NAP.xongLuc = null;
  NAP.kq = null;
  NAP.loi = null;
  NAP.nguoiChay = String(bc.tenDangNhap || bc.nguoiDungId || '');

  await ghiNhatKy(bc, {
    hanhDong: HANH_DONG.NAP_LAI_DU_LIEU,
    ghiChu: 'bắt đầu kéo dữ liệu từ tiến trình bot về nền v3',
  });

  // CHẠY NỀN: không `await`. Lỗi được giữ lại để màn đọc, không ném ra ngoài tiến trình.
  Promise.resolve()
    .then(() => _chayNapLai())
    .then(async (kq) => {
      NAP.kq = kq || null;
      NAP.loi = null;
      await ghiNhatKy(bc, {
        hanhDong: HANH_DONG.NAP_LAI_DU_LIEU,
        sau: tomTatNap(kq),
        ghiChu: 'kéo dữ liệu xong',
      }).catch(() => {});
    })
    .catch(async (e) => {
      NAP.loi = String((e && e.message) || e);
      await ghiNhatKy(bc, {
        hanhDong: HANH_DONG.NAP_LAI_DU_LIEU,
        ghiChu: `kéo dữ liệu HỎNG: ${NAP.loi}`,
      }).catch(() => {});
    })
    .finally(() => { NAP.dangChay = false; NAP.xongLuc = Date.now(); });

  return { ok: true, batDau: NAP.batDau };
}

export { trangThaiCau, gocBot };
