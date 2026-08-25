// TẦNG ĐỌC CỦA MÀN «MODEL AI & KHOÁ» (G2-B3, màn cuối của sóng 0).
//
// Gỡ chặn H6: hôm nay nhập khoá bốn nhà phải sửa `.env` rồi khởi động lại.
//
// ─── HAI TIÊU CHÍ CỦA MÀN NÀY, VÀ CẢ HAI ĐỀU TRẢ GIÁ BẰNG SỰ CỐ THẬT ───────────────────
//
//   ① «Đổi model của một team → lượt chat kế tiếp đi đúng model mới, KHÔNG khởi động lại.»
//      Lớp model đã lo (`cau-hinh.js#xoaDem` xoá đệm ngay sau khi ghi, hạn đệm 5 giây), nên
//      màn này chỉ cần gọi `ghiCauHinh`. Không tự chế đường nạp lại nào khác.
//
//   ② «Phải thấy SẮP hết tiền TRƯỚC khi bot chết.»
//      06/08/2026 tài khoản nhà chính hết tiền, bot đứng im **ba tiếng** mà không ai biết.
//      23/08 lặp lại — **731 phút**. Nên màn này không được chỉ là một cái biểu mẫu chọn
//      model; nó phải trả lời được «cấu hình hiện tại có chỗ nào sắp gãy không». Phần đó
//      nằm ở `canhBaoCauHinh()` trong lớp model, và màn hiện thẳng ra đầu trang.
//
// ─── QUY GIÁ RA TIỀN THẬT ──────────────────────────────────────────────────────────────
// `01-QUYET-DINH.md` §7 chốt: **đo bằng tiền MỖI ĐƠN, không phải tiền mỗi tin.** Model thông
// minh hơn chốt bằng ít tin hơn, nên có thể đắt mỗi tin mà rẻ mỗi đơn. Màn này hiện cả hai,
// và nói rõ cột đ/đơn là **phóng chiếu** từ số tin/đơn đo được — không phải số đo mới.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import {
  tomTatCauHinh, ghiCauHinh, MAC_DINH, LoiCauHinh,
} from '../../model/cau-hinh.js';
import {
  danhSachModel, dTinThamChieu, tiGiaHienTai, HO_SO_TOKEN_DO_THAT, MA_MODEL,
} from '../../model/bang-model.js';
import { MA_NHA } from '../../model/nha/index.js';

/** Nhãn người đọc cho bốn nhà. Sổ nhà (`model/nha/index.js`) chỉ giữ bản cài, không giữ nhãn. */
export const TEN_NHA = Object.freeze({
  claude: 'Anthropic Claude',
  kimi: 'Moonshot Kimi',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
});

export { LoiCauHinh };

/**
 * SỐ TIN TRÊN MỘT ĐƠN — đo thật, `01-QUYET-DINH.md` §7: 127,7 đ/tin ↔ 6.729 đ/đơn.
 * Khai hằng ở đây thay vì gõ 52,7 vào công thức, để chỗ nào cần sửa thì sửa một chỗ.
 */
export const TIN_MOI_DON = +(6729 / 127.7).toFixed(2);

export const TEN_VAI_TRO = Object.freeze({
  chinh: 'Model chính',
  du_phong: 'Model dự phòng',
  nen: 'Model việc nền',
});

export const GIAI_THICH_VAI_TRO = Object.freeze({
  chinh: 'Model trả lời khách. Đây là chỗ tiền chảy.',
  du_phong: 'Chạy khi nhà chính hỏng hoặc hết tiền. BẮT BUỘC khác nhà với model chính.',
  nen: 'Việc chạy ngầm: phân loại, tóm tắt, mổ hội thoại. Không nói chuyện với khách nên chọn model rẻ được.',
});

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * Toàn bộ dữ liệu màn cần.
 * Khoá chỉ ở dạng `{ daCo, tuEnv }` — không một ký tự khoá thật nào đi qua đây.
 */
export async function manModel(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const tt = await tomTatCauHinh(bc);
  const usdVnd = tiGiaHienTai();

  return {
    teamId: tt.teamId,
    macDinh: tt.macDinh,
    soDong: tt.soDong,
    suaLuc: tt.suaLuc,
    dangDung: {
      chinh: { ...tt.chinh, tenNha: TEN_NHA[tt.chinh.nha] || tt.chinh.nha },
      duPhong: { ...tt.duPhong, tenNha: TEN_NHA[tt.duPhong.nha] || tt.duPhong.nha },
      nen: { ...tt.nen, tenNha: TEN_NHA[tt.nen.nha] || tt.nen.nha },
    },
    doNgauNhien: tt.doNgauNhien,
    doNgauNhienNen: tt.doNgauNhienNen,
    khoa: tt.khoa,
    nha: MA_NHA.map((n) => ({ ma: n, ten: TEN_NHA[n] || n, coKhoa: !!(tt.khoa[n] && tt.khoa[n].daCo) })),
    bangGia: bangGia({ usdVnd, dangChinh: tt.chinh.ma }),
    usdVnd,
    hoSoToken: HO_SO_TOKEN_DO_THAT,
    tinMoiDon: TIN_MOI_DON,
    macDinhHeThong: MAC_DINH,
    canhBao: tt.canhBao,
    tenVaiTro: TEN_VAI_TRO,
    giaiThichVaiTro: GIAI_THICH_VAI_TRO,
  };
}

/**
 * Bảng bảy model quy ra tiền Việt, sắp theo đ/đơn TĂNG DẦN (rẻ nhất lên đầu).
 *
 * `soVoiDangDung` là bội số so với model chính ĐANG chạy — con số duy nhất trả lời được câu
 * người ta thật sự hỏi: «đổi sang cái này thì hoá đơn nhân mấy lần?».
 */
export function bangGia({ usdVnd, dangChinh } = {}) {
  const ti = usdVnd || tiGiaHienTai();
  const dTinCua = (ma) => dTinThamChieu(ma, { usdVnd: ti });
  const goc = dangChinh && MA_MODEL.includes(dangChinh) ? dTinCua(dangChinh) : null;

  return danhSachModel()
    .map((m) => {
      const dTin = dTinCua(m.ma);
      return {
        ma: m.ma,
        nha: m.nha,
        tenNha: TEN_NHA[m.nha] || m.nha,
        dTin: +dTin.toFixed(1),
        // ⚠️ PHÓNG CHIẾU, không phải số đo mới: đ/tin × số tin trên một đơn đo được.
        dDon: Math.round(dTin * TIN_MOI_DON),
        soVoiDangDung: goc ? +(dTin / goc).toFixed(2) : null,
        nguonGia: m.nguonGia,
        // «suy-nguoc» = CHƯA AI MỞ TÀI KHOẢN nhà đó, đơn giá giải ngược từ bảng đ/tin của
        // tài liệu. Không hiện cờ này thì người ta chọn model dựa trên một con số bịa mà
        // tưởng là giá công bố.
        giaChacChan: m.nguonGia === 'cong-bo',
        laDangDung: m.ma === dangChinh,
      };
    })
    .sort((a, b) => a.dDon - b.dDon);
}

/* ─────────────────────────── ghi ─────────────────────────── */

/**
 * Lưu cấu hình. Mỏng có chủ ý — mọi luật (dự phòng khác nhà, độ ngẫu nhien trong [0,1], mã
 * model có thật, ghi nhật ký, xoá đệm để nạp nóng) đã nằm trong `ghiCauHinh` của lớp model
 * và có bài test riêng. Thêm một lớp kiểm nữa ở đây là đẻ bản thứ hai của cùng một luật.
 */
export async function luuCauHinh(boiCanh, thayDoi = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await ghiCauHinh(bc, thayDoi);
  return manModel(bc);
}
