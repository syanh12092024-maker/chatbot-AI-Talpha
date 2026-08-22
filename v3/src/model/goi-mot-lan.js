// GỌI MỘT MODEL, MỘT LẦN — L1-M4a
//
// File này trả lời đúng MỘT câu: *cho tôi mã model, khoá, và một yêu cầu — gọi đi rồi trả
// về kết quả đã chuẩn hoá kèm token và tiền.*
//
// Nó KHÔNG BIẾT TEAM LÀ GÌ. Không đọc cấu hình, không mở kho khoá, không tự thử lại,
// không chuyển dự phòng, không ghi Sổ AI — bốn việc đó là của L1-M4b/c. Giữ file này
// "ngu" là chủ ý: bộ dự phòng ở tầng trên cần một hàm gọi KHÔNG có tác dụng phụ thì mới
// đếm đúng được lần nào hỏng, lần nào chạy.

import { layModel, quyTien, chuanHoaDemToken } from './bang-model.js';
import { layNha } from './nha/index.js';
import { batBuocYeuCau } from './chuan-hoa.js';
import {
  LoiThieuKhoa, LoiThamSo, LoiNhaCungCap, LoiHetGio,
  laLoiTaiKhoan, veSinhLoi,
} from './loi.js';

/**
 * Độ ngẫu nhiên mặc định.
 * Bản đang chạy KHÔNG đặt `temperature` nên chạy theo mặc định của nhà cung cấp: bot mỗi
 * lượt trả lời một kiểu, khó bám kịch bản và khó đo A/B cho chuẩn (01-QUYET-DINH.md mục
 * 12 — "Độ ngẫu nhiên chưa đặt"). Ở v3 lời gọi nào cũng gửi trường này.
 */
export const MAC_DINH_DO_NGAU_NHIEN = 0.3;

/** Hạn chờ mặc định cho một lời gọi. */
export const MAC_DINH_TIMEOUT_MS = 60000;

/** Cắt thông điệp lỗi của nhà cung cấp cho vừa một dòng log. */
const DAI_TOI_DA_THONG_DIEP = 300;

function batBuocDoNgauNhien(gia) {
  const n = Number(gia);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new LoiThamSo(`Độ ngẫu nhiên phải nằm trong [0,1] — nhận "${gia}".`);
  }
  return n;
}

/** Bóc thông điệp người đọc được ra khỏi thân lỗi của nhà cung cấp (mỗi nhà một kiểu JSON). */
function bocThongDiep(than) {
  const s = String(than ?? '');
  try {
    const j = JSON.parse(s);
    const m = j?.error?.message ?? j?.message ?? j?.error?.type ?? j?.error ?? s;
    return String(typeof m === 'string' ? m : JSON.stringify(m)).slice(0, DAI_TOI_DA_THONG_DIEP);
  } catch {
    return s.slice(0, DAI_TOI_DA_THONG_DIEP);
  }
}

/**
 * Gọi MỘT model MỘT lần.
 *
 * @param {object}   o
 * @param {string}   o.ma          mã model trong `bang-model.js`, ví dụ 'kimi-k2.6'
 * @param {string}   o.khoa        khoá API của nhà tương ứng
 * @param {object}   o.yeuCau      hình dạng Anthropic `messages.create`
 * @param {number}   [o.timeoutMs=60000]
 * @param {Function} [o.fetchFn=fetch]  tiêm được để test chạy không cần mạng
 * @param {string}   [o.baseUrl]   đè gốc URL (máy chủ nội bộ, máy chủ giả khi test)
 *
 * @returns {Promise<{traLoi:object, maModel:string, nhaCungCap:string,
 *   token:{vao:number,ra:number,cacheDoc:number,cacheGhi:number},
 *   tienUsd:number, tienVnd:number, doNgauNhien:number, msChay:number}>}
 *
 * @throws {LoiModelLa}     mã model không có trong bảng
 * @throws {LoiThieuKhoa}   không có khoá — ném TRƯỚC KHI gọi mạng
 * @throws {LoiThamSo}      độ ngẫu nhiên ngoài [0,1], hoặc yêu cầu không có `messages`
 * @throws {LoiNhaCungCap}  HTTP không 2xx, hoặc không gọi tới được
 * @throws {LoiHetGio}      quá `timeoutMs`
 */
export async function goiMotLan({
  ma, khoa, yeuCau, timeoutMs = MAC_DINH_TIMEOUT_MS, fetchFn = fetch, baseUrl,
} = {}) {
  try {
    const dong = layModel(ma);              // mã lạ → LoiModelLa, chưa đụng gì tới mạng
    const nha = layNha(dong.nha);

    // THỨ TỰ NÀY LÀ CỐ Ý: mọi thứ kiểm được mà không cần mạng thì kiểm hết trước.
    // Gọi rồi mới biết thiếu khoá là đốt một vòng chờ 401 vô ích, và 401 đó lại bị bộ dự
    // phòng đọc thành "tài khoản hỏng" rồi đổi nhà oan.
    if (typeof khoa !== 'string' || khoa.trim() === '') throw new LoiThieuKhoa(nha.ma);
    batBuocYeuCau(yeuCau);
    const doNgauNhien = batBuocDoNgauNhien(yeuCau.temperature ?? MAC_DINH_DO_NGAU_NHIEN);

    const { url, tuyChon } = nha.dungGoi({ dong, khoa, yeuCau, doNgauNhien, baseUrl });

    const dieuKhien = new AbortController();
    let quaGio = false;
    const dongHo = setTimeout(() => { quaGio = true; dieuKhien.abort(); }, timeoutMs);
    const batDau = Date.now();

    let than = '';
    let status = 0;
    try {
      const traVe = await fetchFn(url, { ...tuyChon, signal: dieuKhien.signal });
      status = Number(traVe?.status) || 0;
      than = await traVe.text();
      if (!traVe.ok) {
        const thongDiep = bocThongDiep(than);
        throw new LoiNhaCungCap({
          maNha: nha.ma,
          status,
          thongDiep,
          laLoiTaiKhoan: laLoiTaiKhoan(thongDiep, status),
        });
      }
    } catch (err) {
      // Lỗi CÓ status thì giữ nguyên: đồng hồ vừa reo ngay sau khi máy chủ trả 500 không
      // biến cái 500 đó thành "hết giờ".
      if (err instanceof LoiNhaCungCap) throw err;
      if (quaGio) throw new LoiHetGio(nha.ma, timeoutMs);
      // Không nhận được câu trả lời nào: đứt mạng, DNS hỏng, máy chủ đóng kết nối.
      // KHÁC HẲN lỗi có status — thứ này thử lại thì có cơ may, nên đánh dấu riêng để
      // bộ dự phòng (L1-M4c) xử khác.
      throw new LoiNhaCungCap({
        maNha: nha.ma,
        status: 0,
        thongDiep: String(err?.message || err || 'không gọi tới được nhà cung cấp').slice(0, DAI_TOI_DA_THONG_DIEP),
        laLoiMang: true,
      });
    } finally {
      clearTimeout(dongHo);
    }

    let json;
    try {
      json = JSON.parse(than);
    } catch {
      throw new LoiNhaCungCap({
        maNha: nha.ma,
        status,
        thongDiep: `thân trả về không phải JSON: ${String(than).slice(0, 120)}`,
      });
    }

    const traLoi = nha.docTraLoi(json, { ma: dong.ma });
    const token = chuanHoaDemToken(traLoi.usage);
    const { usd, vnd } = quyTien(token, dong.ma);

    return {
      traLoi,
      // `maModel` là mã HỆ THỐNG (ghi vào Sổ AI), không phải `maGoiApi` gửi cho nhà cung
      // cấp. Thiếu cột này thì sau không so được model nào rẻ hơn thật — đó là lý do tồn
      // tại của cả lớp model (hợp đồng B↔A mục 2).
      maModel: dong.ma,
      nhaCungCap: dong.nha,
      token,
      tienUsd: usd,
      tienVnd: vnd,
      doNgauNhien,
      msChay: Date.now() - batDau,
    };
  } catch (err) {
    // CỬA RA DUY NHẤT. Nhà cung cấp có thể vọng lại khoá trong thân lỗi; một dòng log như
    // thế là rò khoá của cả một team. Vệ sinh ở đúng một chỗ thì không lối nào lọt.
    throw veSinhLoi(err, typeof khoa === 'string' ? khoa : '');
  }
}
