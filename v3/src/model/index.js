// CỬA DUY NHẤT NGƯỜI A DÙNG — điểm bàn giao #4 (hợp đồng B–A mục 2)
//
//   import { goiModel } from '../model/index.js';
//   const kq = await goiModel({ boiCanh, viec:'chot', yeuCau, nhan });
//
// `kq.traLoi` THAY THẲNG giá trị `anthropic.messages.create()` đang trả về, nên
// `closer.js` · `tools.js` · `classifier.js` (1.962 dòng) dùng nguyên, không sửa một dòng.
// A KHÔNG import SDK của nhà cung cấp nào nữa.
//
// BỐN CHỖ TIÊM, đặt một lần lúc dựng ứng dụng (hợp đồng mục 8):
//   datTaoTruyVan(fn)   cổng truy vấn của A — để đọc/ghi `cau_hinh_model`
//   datPheuSoAi(fn)     ghi Sổ AI — CHỖ NÀY LÀ LÝ DO TỒN TẠI CỦA CẢ LỚP MODEL:
//                       thiếu `ma_model` mỗi lượt thì sau này không so được model nào rẻ
//                       hơn THẬT (đo bằng tiền mỗi ĐƠN), chỉ so được bằng cảm giác.
//   datPheuNhatKy(fn)   ghi `nhat_ky` (đổi model, đổi khoá, chuyển dự phòng, lớp model hỏng)
//   datPheuCanhBao(fn)  báo động — Telegram, màn "Sức khoẻ hệ thống"
//
// Chưa tiêm thì vẫn chạy, nhưng KÊU LÊN. Im lặng chạy sai là đúng cái sự cố 06/08/2026:
// bot đứng im ba tiếng, `systemctl` vẫn `active`, không ai biết.

import { batBuocBoiCanh, LoiThieuBoiCanh } from '../auth/boi-canh.js';
import { docCauHinh } from './cau-hinh.js';
import { goiCoDuPhong, chonModel, VIEC } from './du-phong.js';

// ---- BÀY LẠI CẢ LỚP MODEL RA MỘT CỬA ----------------------------------------------

export {
  // cấu hình + ba chỗ tiêm ra ngoài
  docCauHinh, ghiCauHinh, tomTatCauHinh, xoaDem, coTrongDem, cauHinhMacDinh,
  datTaoTruyVan, datKhoKhoa, daNoiKhoKhoa, VAI_TRO, canhBaoCauHinh, datPheuNhatKy, datPheuCanhBao, datDongHoCauHinh,
  ghiNhatKyModel, canhBao,
  BANG as BANG_CAU_HINH, HAN_DEM_MS, MAC_DINH, HANH_DONG, MUC, LoiCauHinh,
  xoaSachCauHinh,
} from './cau-hinh.js';

export {
  machHoa, giaiMa, duoiKhoa, machHoaKho, giaiMaKho, tomTatKho, coKhoaChu, docKhoaChu,
  laGoiMaHoa, TEN_BIEN_KHOA_CHU, LoiKhoaChu, LoiGiaiMa,
} from './kho-khoa.js';

export {
  ghiNhanOk, ghiNhanLoi, dangHong, dangHongThuan, tinhTrang, tinhTrangTatCa,
  datDongHo, xoaSucKhoe, docLoi, nenChuyenNha,
  MS_THU_LAI, MS_CUA_SO_LOI, NGUONG_LOI,
} from './suc-khoe.js';

export {
  goiCoDuPhong, chonModel, datNgu, xoaSachDuPhong,
  LoiCaHaiNhaHong, MS_NGHI_TRUOC_KHI_THU_LAI, VIEC,
} from './du-phong.js';

// Lõi L1-M4a — bày lại để nơi gọi không phải nhớ file nào ở đâu.
export {
  LoiModel, LoiModelLa, LoiNhaLa, LoiThieuKhoa, LoiThamSo, LoiNhaCungCap, LoiHetGio,
  laLoiTaiKhoan,
} from './loi.js';
export { layModel, danhSachModel, MA_MODEL, quyTien, dTinThamChieu } from './bang-model.js';
export { MA_NHA } from './nha/index.js';
export { LoiThieuBoiCanh };

// ---- PHỄU SỔ AI --------------------------------------------------------------------

/** @type {null | ((ban: object) => any)} */
let _pheuSoAi = null;

/**
 * Nối chỗ ghi Sổ AI của người A: `datPheuSoAi((ban) => ghiSoAi(ban))`.
 * Tiêm một lần lúc khởi động thì KHÔNG LƯỢT NÀO QUÊN ghi mã model.
 */
export function datPheuSoAi(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datPheuSoAi cần một hàm');
  _pheuSoAi = fn || null;
  return _pheuSoAi;
}

/** Cứ ngần này lượt chưa tiêm phễu thì kêu một tiếng — không im lặng, và cũng không ồn. */
export const NHIP_KEU_CHUA_TIEM = 100;
let _demChuaTiem = 0;

/** Chỉ dùng cho test: quên phễu và bộ đếm. */
export function xoaSachSoAi() { _pheuSoAi = null; _demChuaTiem = 0; }

/**
 * Đẩy một bản ghi vào Sổ AI. Gọi SAU MỖI LƯỢT, kể cả lượt lỗi.
 * Sổ hỏng KHÔNG được làm chết lượt chat: nuốt lỗi và `console.error`.
 */
async function banGiaoSoAi(ban) {
  if (!_pheuSoAi) {
    _demChuaTiem++;
    if (_demChuaTiem % NHIP_KEU_CHUA_TIEM === 1) {
      console.warn(
        `[model] CHƯA TIÊM PHỄU SỔ AI — ${_demChuaTiem} lượt gọi model không được ghi mã model. `
        + 'Gọi datPheuSoAi(ghiSoAi) lúc dựng ứng dụng (hợp đồng mục 8). '
        + 'Thiếu ma_model thì sau này không so được model nào rẻ hơn thật.',
      );
    }
    return;
  }
  try {
    await _pheuSoAi(ban);
  } catch (e) {
    console.error('[model] phễu Sổ AI lỗi (bỏ qua để lượt chat đi tiếp):', e && e.message);
  }
}

const TOKEN_RONG = Object.freeze({ vao: 0, ra: 0, cacheDoc: 0, cacheGhi: 0 });

// ---- CỬA CHÍNH ---------------------------------------------------------------------

/**
 * Gọi model theo cấu hình của team, tự chuyển dự phòng khi nhà chính hỏng, tự ghi Sổ AI.
 *
 * @param {object} o
 * @param {object} o.boiCanh  BẮT BUỘC. Thiếu → ném `LoiThieuBoiCanh`.
 * @param {'chot'|'nen'} [o.viec='chot']
 * @param {object} o.yeuCau   đúng hình dạng Anthropic `messages.create`.
 *   `temperature` không truyền → lấy độ ngẫu nhiên trong cấu hình của team
 *   (`do_ngau_nhien` cho việc chốt, `do_ngau_nhien_nen` cho việc nền).
 * @param {{pageId?:string, custId?:string, lane?:string}} [o.nhan] để ghi Sổ AI
 * @param {Function} [o.fetchFn] tiêm bản giả — test KHÔNG gọi mạng thật
 * @param {string} [o.baseUrl]   đè gốc URL (máy chủ nội bộ / máy chủ giả)
 * @param {number} [o.timeoutMs]
 *
 * @returns {Promise<{traLoi:object, maModel:string, nhaCungCap:string,
 *   token:{vao:number,ra:number,cacheDoc:number,cacheGhi:number},
 *   tienUsd:number, tienVnd:number, daChuyenDuPhong:boolean, doNgauNhien:number, msChay:number}>}
 */
export async function goiModel({
  boiCanh, viec = VIEC.CHOT, yeuCau, nhan, fetchFn, baseUrl, timeoutMs,
} = {}) {
  // NGOÀI try: thiếu bối cảnh là GỌI SAI, không phải "một lượt chat hỏng". Ghi nó vào Sổ
  // AI như một lượt là bịa ra một lượt chưa từng xảy ra, và cũng không có teamId để ghi.
  const bc = batBuocBoiCanh(boiCanh);

  const batDau = Date.now();
  let maDuKien = null;
  let nhaDuKien = null;
  let doNgauNhien = null;

  try {
    const cauHinh = await docCauHinh(bc);
    const { dau } = chonModel(cauHinh, viec);
    maDuKien = dau.ma;
    nhaDuKien = dau.nha;

    // Không truyền `temperature` thì lấy của team. Bản đang chạy KHÔNG đặt trường này nên
    // bot mỗi lượt trả lời một kiểu, khó bám kịch bản và khó A/B (01-QUYET-DINH mục 12).
    doNgauNhien = yeuCau && yeuCau.temperature != null
      ? Number(yeuCau.temperature)
      : (viec === VIEC.NEN ? cauHinh.doNgauNhienNen : cauHinh.doNgauNhien);

    const kq = await goiCoDuPhong({
      boiCanh: bc,
      viec,
      yeuCau: { ...(yeuCau || {}), temperature: doNgauNhien },
      cauHinh,
      nhan,
      fetchFn,
      baseUrl,
      timeoutMs,
    });

    await banGiaoSoAi({
      teamId: bc.teamId,
      maModel: kq.maModel,
      nhaCungCap: kq.nhaCungCap,
      token: kq.token,
      tienUsd: kq.tienUsd,
      tienVnd: kq.tienVnd,
      daChuyenDuPhong: kq.daChuyenDuPhong,
      doNgauNhien: kq.doNgauNhien,
      msChay: kq.msChay,
      viec,
      nhan: nhan || null,
      thanhCong: true,
      loi: null,
    });

    return {
      traLoi: kq.traLoi,
      maModel: kq.maModel,
      nhaCungCap: kq.nhaCungCap,
      token: kq.token,
      tienUsd: kq.tienUsd,
      tienVnd: kq.tienVnd,
      daChuyenDuPhong: kq.daChuyenDuPhong,
      doNgauNhien: kq.doNgauNhien,
      msChay: kq.msChay,
    };
  } catch (err) {
    // LƯỢT LỖI CŨNG LÀ MỘT LƯỢT. Không ghi thì Sổ AI chỉ có phần đẹp: 08–10/08/2026 bot
    // hỏng hai ngày mà sổ trông vẫn bình thường vì lượt hỏng không để lại dòng nào.
    await banGiaoSoAi({
      teamId: bc.teamId,
      maModel: err && err.maModel ? err.maModel : maDuKien,
      nhaCungCap: err && err.nhaCungCap ? err.nhaCungCap : nhaDuKien,
      token: { ...TOKEN_RONG },
      tienUsd: 0,
      tienVnd: 0,
      daChuyenDuPhong: false,
      doNgauNhien,
      msChay: Date.now() - batDau,
      viec,
      nhan: nhan || null,
      thanhCong: false,
      loi: { ma: (err && err.ma) || 'loi_model', thongDiep: String((err && err.message) || err).slice(0, 300) },
    });
    throw err;
  }
}

export default { goiModel, datPheuSoAi };
