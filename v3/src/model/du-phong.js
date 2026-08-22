// CHỌN MODEL VÀ CHUYỂN DỰ PHÒNG — L1-M4c
//
// Đây là chỗ bịt cái lỗ có thật: 06/08/2026 tài khoản nhà chính hết tiền, bot đứng im BA
// TIẾNG mà không ai biết. Tiêu chí là "chuyển dự phòng dưới 30 giây" — nhưng cách làm
// KHÔNG phải là hẹn giờ 30 giây rồi đo. Cách làm là: lỗi tầng tài khoản thì nhà đó hỏng
// NGAY, và lời gọi TIẾP THEO đi thẳng nhà dự phòng. Thời gian trôi thật là 0.
//
// Và cái lỗ thứ hai, 08–10/08: 28.469 dòng log cùng một lỗi. Vì thế nhật ký
// `chuyen_du_phong` và phễu cảnh báo chỉ chạy MỘT LẦN CHO MỖI LẦN ĐỔI TRẠNG THÁI, không
// phải mỗi lời gọi. Dấu vết từng lượt nằm ở Sổ AI (`da_chuyen_du_phong`) — đúng chỗ của nó.

import { batBuocBoiCanh } from '../auth/boi-canh.js';
import { goiMotLan } from './goi-mot-lan.js';
import { LoiModel, LoiThamSo } from './loi.js';
import {
  dangHong, dangHongThuan, ghiNhanOk, ghiNhanLoi, nenChuyenNha, docLoi,
} from './suc-khoe.js';
import { ghiNhatKyModel, canhBao, HANH_DONG, MUC, BANG } from './cau-hinh.js';

/** Lỗi mạng / 5xx / hết giờ thì nghỉ ngần này rồi thử lại ĐÚNG MỘT LẦN. */
export const MS_NGHI_TRUOC_KHI_THU_LAI = 800;

/** Hai việc lớp model biết làm. `chot` = tư vấn & chốt · `nen` = việc nền, model rẻ. */
export const VIEC = Object.freeze({ CHOT: 'chot', NEN: 'nen' });

/** Cả nhà chính lẫn nhà dự phòng đều không gọi được. Đây là lúc phải đánh thức người thật. */
export class LoiCaHaiNhaHong extends LoiModel {
  constructor({ teamId, dau, sau, loiDau, loiSau }) {
    super(
      `Cả hai nhà đều hỏng cho team ${teamId}: "${dau?.ma}" (${dau?.nha}) — ${loiDau?.message || '?'}`
      + ` · dự phòng "${sau?.ma}" (${sau?.nha}) — ${loiSau?.message || '?'}`,
    );
    this.name = 'LoiCaHaiNhaHong';
    this.ma = 'ca_hai_nha_hong';
    this.status = 503;
    this.teamId = String(teamId ?? '');
    this.maModel = sau?.ma ?? dau?.ma ?? null;
    this.nhaCungCap = sau?.nha ?? dau?.nha ?? null;
    this.loiDau = loiDau || null;
    this.loiSau = loiSau || null;
  }
}

/** @type {(ms:number)=>Promise<void>} */
let _ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tiêm hàm nghỉ — để test không phải chờ 800 ms thật. Truyền `null` để trả về mặc định. */
export function datNgu(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datNgu cần một hàm');
  _ngu = fn || ((ms) => new Promise((r) => setTimeout(r, ms)));
  return _ngu;
}

/**
 * Nhớ những cặp nhà đã báo "cả hai cùng hỏng" để không báo lại mỗi lượt.
 * Xoá khi có một lời gọi thành công — sống lại rồi thì lần hỏng sau là sự việc mới.
 * @type {Set<string>}
 */
const _daBaoCaHai = new Set();

/** Chỉ dùng cho test: quên hết dấu vết đã báo. */
export function xoaSachDuPhong() { _daBaoCaHai.clear(); }

/**
 * Chọn ô model theo việc, và ô để lùi về.
 * Ô NỀN không có dự phòng riêng: hỏng thì lùi về ô chính. Việc nền chậm và đắt vẫn hơn
 * việc nền không chạy.
 */
export function chonModel(cauHinh, viec = VIEC.CHOT) {
  if (!cauHinh || !cauHinh.chinh) throw new LoiThamSo('goiCoDuPhong: thiếu `cauHinh`.');
  if (viec === VIEC.CHOT) return { dau: cauHinh.chinh, sau: cauHinh.duPhong, o: 'chinh' };
  if (viec === VIEC.NEN) return { dau: cauHinh.nen, sau: cauHinh.chinh, o: 'nen' };
  throw new LoiThamSo(`viec phải là 'chot' hoặc 'nen' — nhận "${viec}".`);
}

/**
 * Gọi MỘT ô model, có thử lại đúng một lần cho lỗi thoáng qua.
 *
 * CHỈ ĐẾM LỖI CỦA NHÀ CUNG CẤP vào sức khoẻ. `400` sai yêu cầu, mã model lạ, tham số hỏng
 * là lỗi CỦA MÌNH — đếm chúng vào sổ sức khoẻ của nhà thì mười lần ta gọi sai lại làm cả
 * team bị đá sang nhà khác, mà nhà kia cũng trả về đúng cái 400 đó.
 */
async function goiMotO({ teamId, o, khoa, yeuCau, fetchFn, baseUrl, timeoutMs, choThuLai }) {
  try {
    return await goiMotLan({ ma: o.ma, khoa, yeuCau, fetchFn, baseUrl, timeoutMs });
  } catch (err) {
    const loiCuaNha = nenChuyenNha(err);
    if (loiCuaNha) ghiNhanLoi(teamId, o.nha, err);
    // Lỗi tầng tài khoản: thử lại là đốt thời gian vô ích — hết tiền thì lần thứ hai vẫn
    // hết tiền. Đi thẳng dự phòng.
    // 4xx khác: yêu cầu sai thì gọi lại vẫn sai.
    if (!choThuLai || !loiCuaNha || docLoi(err).laTaiKhoan) throw err;

    await _ngu(MS_NGHI_TRUOC_KHI_THU_LAI);
    try {
      return await goiMotLan({ ma: o.ma, khoa, yeuCau, fetchFn, baseUrl, timeoutMs });
    } catch (err2) {
      if (nenChuyenNha(err2)) ghiNhanLoi(teamId, o.nha, err2);
      throw err2;
    }
  }
}

/**
 * Gọi model theo cấu hình team, tự chuyển dự phòng khi nhà chính hỏng.
 *
 * @param {object} o
 * @param {object} o.boiCanh  BẮT BUỘC
 * @param {'chot'|'nen'} [o.viec='chot']
 * @param {object} o.yeuCau   hình dạng Anthropic
 * @param {object} o.cauHinh  cấu hình đã giải mã khoá (`cau-hinh.js`)
 * @param {object} [o.nhan]   { pageId, custId, lane } — chỉ để ghi Sổ AI
 * @param {Function} [o.fetchFn]  tiêm để test chạy không cần mạng
 * @param {string} [o.baseUrl]    đè gốc URL (máy chủ nội bộ / máy chủ giả)
 * @param {number} [o.timeoutMs]
 *
 * @returns {Promise<object>} kết quả của `goiMotLan` + `daChuyenDuPhong` + `o`
 * @throws {LoiCaHaiNhaHong} cả hai nhà đều hỏng
 * @throws {LoiNhaCungCap}   4xx sai yêu cầu — KHÔNG chuyển dự phòng, ném thẳng
 */
export async function goiCoDuPhong({
  boiCanh, viec = VIEC.CHOT, yeuCau, cauHinh, nhan, fetchFn, baseUrl, timeoutMs,
} = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const teamId = bc.teamId;
  const { dau, sau, o: tenO } = chonModel(cauHinh, viec);
  const khoa = (nha) => (cauHinh.khoa || {})[nha];
  const chungNha = String(dau.nha) === String(sau.nha);

  // ---- ① Nhà chính -----------------------------------------------------------------
  // Đang hỏng thì BỎ QUA LUÔN — không tốn một lời gọi để biết lại điều đã biết.
  const hongTruoc = dangHongThuan(teamId, dau.nha);
  const boQua = dangHong(teamId, dau.nha);
  let loiDau = null;

  if (!boQua) {
    try {
      const kq = await goiMotO({
        teamId, o: dau, khoa: khoa(dau.nha), yeuCau, fetchFn, baseUrl, timeoutMs, choThuLai: true,
      });
      const vuaSongLai = ghiNhanOk(teamId, dau.nha);
      _daBaoCaHai.delete(`${teamId}::${dau.nha}::${sau.nha}`);
      if (vuaSongLai) {
        await canhBao({
          muc: MUC.TIN, teamId, nha: dau.nha, maModel: dau.ma,
          thongDiep: `Nhà "${dau.nha}" đã sống lại — team ${teamId} chạy lại bằng ${dau.ma}.`,
        });
      }
      return { ...kq, daChuyenDuPhong: false, o: tenO, viec };
    } catch (err) {
      loiDau = err;
      // 4xx KHÁC (400 sai yêu cầu, 404, 422…) → KHÔNG chuyển dự phòng, ném thẳng.
      // Yêu cầu sai thì nhà nào cũng sai; chuyển dự phòng chỉ tốn thêm tiền và GIẤU MẤT
      // lỗi thật — hôm sau không ai hiểu vì sao hoá đơn Claude tăng.
      if (!nenChuyenNha(err)) {
        err.maModel = err.maModel || dau.ma;
        err.nhaCungCap = err.nhaCungCap || dau.nha;
        throw err;
      }
    }
  }

  // ---- ② Đổi trạng thái? Báo ĐÚNG MỘT LẦN ------------------------------------------
  const vuaHong = !hongTruoc && dangHongThuan(teamId, dau.nha);
  if (vuaHong) {
    const d = loiDau ? docLoi(loiDau) : { thongDiep: '', laTaiKhoan: false };
    await canhBao({
      muc: MUC.CANH_BAO, teamId, nha: dau.nha, maModel: dau.ma,
      thongDiep: `Nhà "${dau.nha}" hỏng${d.laTaiKhoan ? ' (TẦNG TÀI KHOẢN — phải nạp tiền hoặc đổi khoá)' : ''}: `
        + `${d.thongDiep.slice(0, 160)}. Team ${teamId} chuyển sang "${sau.ma}" (${sau.nha}).`,
    });
    await ghiNhatKyModel(bc, {
      hanhDong: HANH_DONG.CHUYEN_DU_PHONG,
      doiTuongLoai: BANG,
      truoc: { ma_model: dau.ma, nha: dau.nha, o: tenO },
      sau: { ma_model: sau.ma, nha: sau.nha, loi_tai_khoan: d.laTaiKhoan },
      ghiChu: d.thongDiep.slice(0, 200),
    });
  }

  // ---- ③ Dự phòng ------------------------------------------------------------------
  // Dự phòng CÙNG NHÀ với nhà vừa hỏng là dự phòng giả — hết tiền bên đó thì bên này cũng
  // hết. Gọi cho có chỉ tốn thêm một vòng chờ rồi vẫn hỏng.
  const duPhongVoDung = chungNha || dangHong(teamId, sau.nha);
  if (duPhongVoDung) {
    const loi = new LoiCaHaiNhaHong({
      teamId, dau, sau, loiDau,
      loiSau: chungNha
        ? new LoiThamSo(`dự phòng "${sau.ma}" cùng nhà "${sau.nha}" với ô đang hỏng — không phải dự phòng thật`)
        : new LoiThamSo(`nhà dự phòng "${sau.nha}" cũng đang bị đánh dấu hỏng`),
    });
    await baoCaHaiHong(bc, { teamId, dau, sau, loi });
    throw loi;
  }

  try {
    const kq = await goiMotO({
      teamId, o: sau, khoa: khoa(sau.nha), yeuCau, fetchFn, baseUrl, timeoutMs, choThuLai: true,
    });
    ghiNhanOk(teamId, sau.nha);
    return { ...kq, daChuyenDuPhong: true, o: 'du_phong', viec };
  } catch (loiSau) {
    const loi = new LoiCaHaiNhaHong({ teamId, dau, sau, loiDau, loiSau });
    await baoCaHaiHong(bc, { teamId, dau, sau, loi });
    throw loi;
  }
}

/** Cả hai nhà hỏng: nhật ký `lop_model_hong` + cảnh báo MỨC NẶNG, một lần cho mỗi sự việc. */
async function baoCaHaiHong(bc, { teamId, dau, sau, loi }) {
  const k = `${teamId}::${dau.nha}::${sau.nha}`;
  if (_daBaoCaHai.has(k)) return;      // đừng lặp lại 28.469 lần
  _daBaoCaHai.add(k);
  await canhBao({
    muc: MUC.NANG, teamId, nha: dau.nha, maModel: dau.ma,
    thongDiep: `LỚP MODEL HỎNG HOÀN TOÀN — team ${teamId} không gọi được cả "${dau.nha}" lẫn "${sau.nha}". `
      + 'Bot KHÔNG trả lời được khách. ' + String(loi.message).slice(0, 300),
  });
  await ghiNhatKyModel(bc, {
    hanhDong: HANH_DONG.LOP_MODEL_HONG,
    doiTuongLoai: BANG,
    truoc: { ma_model: dau.ma, nha: dau.nha },
    sau: { ma_model: sau.ma, nha: sau.nha },
    ghiChu: String(loi.message).slice(0, 300),
  });
}
