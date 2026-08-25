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
import {
  danhSachToken, trangThaiCau, coTaiKhoan, gocBot,
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

/** Câu hiện thẳng trên đầu màn. Không giấu vào tài liệu. */
export const LA_TOAN_HE =
  'Kho token này dùng chung cho MỌI team. Khác với các màn khác của v3 — ở đây bạn đang nhìn '
  + 'và sửa tài nguyên cấp máy chủ (`.env` + `pancake-tokens.json`), không phải dữ liệu của '
  + 'riêng team đang mở. Thêm hay bỏ một token là đổi cho cả ba team.';

/** Thứ tự trong danh sách CHÍNH LÀ thứ tự dự phòng — không phải thứ tự sắp cho đẹp. */
export const GIAI_THICH_THU_TU =
  'Thứ tự trên xuống chính là thứ tự dự phòng: token chính (.env) trước, rồi token phụ (.env), '
  + 'cuối cùng là token thêm từ giao diện. Token hết hạn bị bỏ qua tự động.';

/* ─── cổng tiêm cho kết nối POS (đọc theo team — thứ DUY NHẤT của màn này có team) ─── */

let _docKetNoiPos = null;

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
  if (!coTaiKhoan()) {
    return {
      token: [], canhBao: [], cua,
      trong: {
        rong: true, vi: 'chua_cai_dat',
        noi: `Chưa đọc được kho token: máy chủ v3 thiếu \`ADMIN_USER\`/\`ADMIN_PASS\` nên không `
          + `gọi được tiến trình bot ở ${gocBot()}. Đây là lỗi cấu hình máy chủ, KHÔNG phải «không có token».`,
        diTiep: { chu: 'Đặt hai biến đó rồi khởi động lại dịch vụ v3', duong: null },
      },
    };
  }
  try {
    const ds = await danhSachToken();
    return {
      token: ds.map((t) => ({ ...t, sucKhoe: sucKhoeToken(t) })),
      canhBao: canhBaoKhoToken(ds),
      cua,
      trong: ds.length ? null : {
        rong: true, vi: 'chua_cai_dat',
        noi: 'Không có token Pancake nào — bot không đọc và không gửi được tin nào.',
        diTiep: { chu: 'Thêm token đầu tiên', duong: '#them-token' },
      },
    };
  } catch (e) {
    if (e instanceof LoiCauBotDong || e instanceof LoiCauBotHong) {
      return {
        token: [], canhBao: [], cua,
        trong: {
          rong: true, vi: 'chua_cai_dat',
          noi: `Chưa đọc được kho token: ${e.message}`,
          diTiep: { chu: 'Kiểm tiến trình bot đang chạy chưa', duong: null },
        },
      };
    }
    throw e;
  }
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
  return {
    pos,
    trong: pos.length ? null : {
      rong: true, vi: 'chua_cai_dat',
      noi: 'Team này chưa có kết nối POS nào — chưa có thì không tạo được đơn cho thị trường nào.',
      diTiep: { chu: 'Nạp từ pancake-shops.json bằng `npm run di-tru`', duong: null },
    },
  };
}

export { trangThaiCau, gocBot };
