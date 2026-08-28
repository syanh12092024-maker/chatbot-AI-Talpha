// TẦNG ĐỌC CỦA MÀN «RỦI RO HOÀN HÀNG» (G2-G7, sóng 4).
//
// Yêu cầu: *«Bốn tầng chính sách thay vì một ngưỡng cứng»*, và nghiệm thu đòi *«tách ra đúng
// 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường»*.
//
// ═══ BỐN TẦNG ĐANG «CHỜ CHỐT» — MÀN KHÔNG ĐƯỢC LÀM NHƯ ĐÃ DUYỆT ══════════════════════
// `01-QUYET-DINH.md` §11 xếp nó vào bảng CHƯA CHỐT: *«Đề xuất chia bốn tầng thay vì một
// ngưỡng — 144 khách hoàn 30–65% đang bị gộp nhầm. **Chờ chốt**»*.
//
// Nên màn này KHÔNG áp chính sách nào lên ai. Nó **đo phân bố thật** và cho thấy mỗi lằn
// ranh sẽ gom vào bao nhiêu người — để chủ dự án chốt bằng số, không bằng cảm giác. Ghi một
// ngưỡng cứng vào code rồi tô màu đỏ cho ai vượt ngưỡng là tự chốt hộ một quyết định chưa ai
// chốt.
//
// ═══ CON SỐ 144 CỦA TÀI LIỆU ĐO TRÊN 4,2% DÂN SỐ ════════════════════════════════════
// `04-TIEN-DO.md` dòng 525 khai thẳng: mốc 23/08 đo trên **4,2%** dân số, nên mọi số dẫn
// xuất — gồm cả phân bố bốn tầng — chỉ là ước. Đo lại 28/08 trên toàn bộ: nhóm 30–64% có
// **638 khách**, không phải 144. Màn hiện con số ĐO ĐƯỢC và nói rõ nó khác tài liệu.
//
// ═══ ĐIỀU QUAN TRỌNG NHẤT: TỈ LỆ TRÊN MỘT ĐƠN LÀ NHIỄU ══════════════════════════════
// Đo 28/08: **4.436 khách có tỉ lệ hoàn 100%**. Nhưng **4.139 trong số đó chỉ có ĐÚNG MỘT
// đơn** — một đơn bị hủy thành «hoàn 100%». Chỉ **77 khách** vừa hoàn 100% vừa có từ 3 đơn.
//
// Chặn theo tỉ lệ đơn thuần là chặn 4.139 người vì một dữ kiện duy nhất. Nên màn luôn trả
// tỉ lệ KÈM số đơn, và xếp bảng theo hai chiều — không bao giờ đưa ra một danh sách chỉ
// xếp theo tỉ lệ.
//
// ═══ TỰ ĐẾM, VÀ ĐÓ LÀ CHỖ TẠM ═══════════════════════════════════════════════════════
// `khach.so_don_ket` / `so_don_hoan` là chỗ ĐÚNG để chứa hai con số này, và chúng có sẵn
// cột — nhưng toàn số 0 (không NULL, nên `count()` vẫn ra đủ dòng; đây là cái bẫy đã gặp ở
// `so_ai` và `san_pham` dưới một hình dạng khác). Nên màn tự đếm từ `don_hang`.
//
// Tự đếm là bản khai THỨ HAI của cùng một chỉ số, và bản thứ hai bao giờ cũng là bản trôi.
// Đã lập `PHIEU-B-Y8` xin người A một hàm tổng hợp ở `src/db/so-lieu.js`. Chừng nào chưa có,
// màn giới hạn số đơn đọc mỗi lượt và khai rõ nếu chạm trần.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_DON = 'don_hang';
export const BANG_KHACH = 'khach';
/**
 * KHÔNG có `sale` — §9: sale vào THẲNG bảng điều phối, không màn nào khác.
 *
 * Bản đầu tôi cho sale vào với lý do «sale cần biết rủi ro trước khi chốt». Lý do đúng,
 * chỗ đặt sai: thứ sale cần là rủi ro CỦA KHÁCH ĐANG NÓI CHUYỆN, và chỗ của nó là màn chi
 * tiết việc — nơi sale đã đứng sẵn. Một màn phân bố toàn team không giúp gì cho một cú chốt.
 * (Lưới quét `phan-quyen-nam-vai.test.mjs` bắt được.)
 */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);

/**
 * MÃ TRẠNG THÁI POS TÍNH LÀ HOÀN — chép từ `src/pancake-orders.js:13`:
 *   `const CANCEL = new Set(['4','5','6','7','8']);  // đang hoàn / đã hoàn / hủy / xóa / chuyển hoàn`
 *
 * Chép tay, nên có bài test đọc thẳng file đó và so — cùng phép với `LADDER` ở màn Cửa kiểm.
 * Lệch một mã là lệch cả bảng phân bố.
 */
export const MA_HOAN = Object.freeze(['4', '5', '6', '7', '8']);

/** Số đơn tối thiểu để một tỉ lệ có nghĩa. Dưới mức này, tỉ lệ là nhiễu — xem khối trên. */
export const DON_TOI_THIEU_DE_TIN = 3;

/** Trần đọc mỗi lượt. Chạm trần thì màn phải NÓI, không im. */
export const TRAN_DOC = 40000;

/** Các lằn ranh ĐỀ XUẤT — không phải chính sách đã duyệt. Màn chỉ dùng để đếm. */
export const LAN_RANH = Object.freeze([
  { ma: 'sach', ten: 'Không hoàn đơn nào', tu: 0, den: 0 },
  { ma: 'thap', ten: 'Hoàn thấp', tu: 0.0001, den: 0.30 },
  { ma: 'vua', ten: 'Hoàn vừa — nhóm tài liệu gọi là 144 khách', tu: 0.30, den: 0.65 },
  { ma: 'cao', ten: 'Hoàn cao', tu: 0.65, den: 1.0000001 },
]);

export class LoiRuiRo extends Error {
  constructor(thongDiep, ma = 'rui_ro_hoan', status = 400) {
    super(thongDiep);
    this.name = 'LoiRuiRo';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiRuiRo('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export const daNoiRuiRo = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiRuiRo('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

const laHoan = (d) => MA_HOAN.includes(String(d.trang_thai_pos ?? ''));

export async function manRuiRo(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = truyVan(bc);

  const don = await db.chon(BANG_DON, {}, { gioiHan: TRAN_DOC });
  const chamTran = don.length >= TRAN_DOC;

  // Gom theo khách. Đơn KHÔNG có `khach_id` không quy được cho ai — đếm riêng, đừng bỏ im.
  const theoKhach = new Map();
  let khongCoKhach = 0;
  for (const d of don) {
    const k = d.khach_id == null ? null : String(d.khach_id);
    if (!k) { khongCoKhach += 1; continue; }
    let x = theoKhach.get(k);
    if (!x) { x = { khachId: k, tong: 0, hoan: 0 }; theoKhach.set(k, x); }
    x.tong += 1;
    if (laHoan(d)) x.hoan += 1;
  }

  const ds = [...theoKhach.values()].map((x) => ({
    ...x,
    tiLe: x.tong > 0 ? x.hoan / x.tong : null,
    // Tỉ lệ có đáng tin không — hỏi bằng SỐ ĐƠN, không bằng chính tỉ lệ đó.
    duTin: x.tong >= DON_TOI_THIEU_DE_TIN,
  }));

  return {
    teamId: bc.teamId,
    dem: {
      soDonDoc: don.length,
      soKhachCoDon: ds.length,
      soDonKhongQuyDuoc: khongCoKhach,
      chamTran,
    },
    chamTran: chamTran
      ? { co: true, tran: TRAN_DOC,
          noi: `Đã đọc tới trần ${TRAN_DOC} đơn — bảng dưới đây là MỘT PHẦN, không phải toàn bộ.` }
      : { co: false },
    lanRanh: LAN_RANH.map((r) => nhomTheoLanRanh(ds, r)),
    // Chiều thứ hai: cùng một tỉ lệ, khác hẳn nhau khi số đơn khác nhau.
    theoSoDon: matTran(ds),
    canhBaoMotDon: canhBaoMotDon(ds),
    // Không tự chốt hộ: nói rõ chính sách chưa duyệt và cột `tang_hoan` chưa gán cho ai.
    chinhSach: {
      daChot: false,
      noi: '`01-QUYET-DINH.md` §11 xếp «chia bốn tầng» vào bảng CHỜ CHỐT. Màn này ĐO phân bố '
        + 'thật để chốt được bằng số, và KHÔNG áp chính sách nào lên khách nào.',
      cot: 'Cột `khach.tang_hoan` có sẵn nhưng chưa gán cho khách nào — chưa ai được xếp tầng.',
    },
    soLieu: {
      taiLieuNoi: 144,
      doDuoc: nhomTheoLanRanh(ds, LAN_RANH[2]).soKhach,
      viSaoKhac: '`04-TIEN-DO.md` dòng 525: mốc 23/08 đo trên **4,2% dân số**, nên mọi số dẫn '
        + 'xuất từ nó — gồm phân bố bốn tầng — chỉ là ước. Con số bên phải đo trên toàn bộ đơn '
        + 'đọc được.',
    },
    trong: ds.length ? null : {
      rong: true, vi: don.length ? 'chua-nap' : 'chua-nap',
      noi: don.length
        ? `Đọc được ${don.length} đơn nhưng không đơn nào có \`khach_id\` — chưa nối đơn với khách.`
        : 'Team này chưa có đơn hàng nào.',
      diTiep: 'Rủi ro hoàn tính theo KHÁCH, nên phải nối được đơn về khách trước.',
    },
  };
}

function nhomTheoLanRanh(ds, r) {
  const trong = ds.filter((x) => x.tiLe != null && x.tiLe >= r.tu && x.tiLe < r.den
    || (r.tu === 0 && r.den === 0 && x.tiLe === 0));
  const duTin = trong.filter((x) => x.duTin);
  return {
    ma: r.ma, ten: r.ten,
    tu: r.tu, den: r.den,
    soKhach: trong.length,
    soDon: trong.reduce((s, x) => s + x.tong, 0),
    // Bao nhiêu trong nhóm này có ĐỦ đơn để tỉ lệ nói lên điều gì.
    soKhachDuTin: duTin.length,
    soKhachMotDon: trong.filter((x) => x.tong === 1).length,
  };
}

/** Ma trận tỉ lệ × số đơn — chiều mà một danh sách xếp theo tỉ lệ không cho thấy. */
function matTran(ds) {
  const cot = [
    { ma: 'd1', ten: '1 đơn', hop: (x) => x.tong === 1 },
    { ma: 'd2', ten: '2 đơn', hop: (x) => x.tong === 2 },
    { ma: 'd35', ten: '3–5 đơn', hop: (x) => x.tong >= 3 && x.tong <= 5 },
    { ma: 'd6', ten: '6+ đơn', hop: (x) => x.tong >= 6 },
  ];
  return LAN_RANH.map((r) => ({
    ma: r.ma, ten: r.ten,
    o: cot.map((c) => ({
      ma: c.ma, ten: c.ten,
      so: ds.filter((x) => c.hop(x) && (x.tiLe != null
        && ((r.tu === 0 && r.den === 0) ? x.tiLe === 0 : (x.tiLe >= r.tu && x.tiLe < r.den)))).length,
    })),
  }));
}

/**
 * Cảnh báo trung tâm của màn: bao nhiêu «khách hoàn 100%» thật ra chỉ có một đơn.
 * Đo 28/08: 4.436 khách hoàn 100%, trong đó 4.139 có đúng một đơn.
 */
function canhBaoMotDon(ds) {
  const hoanHet = ds.filter((x) => x.tiLe === 1);
  const motDon = hoanHet.filter((x) => x.tong === 1);
  const duTin = hoanHet.filter((x) => x.duTin);
  if (!hoanHet.length) return null;
  return {
    soHoanHet: hoanHet.length,
    soMotDon: motDon.length,
    soDuTin: duTin.length,
    noi: `${hoanHet.length} khách có tỉ lệ hoàn 100%, nhưng ${motDon.length} trong số đó chỉ có `
      + `ĐÚNG MỘT đơn — một đơn bị hủy thành «hoàn 100%». Chỉ ${duTin.length} khách vừa hoàn `
      + `100% vừa có từ ${DON_TOI_THIEU_DE_TIN} đơn trở lên.`,
    viSao: 'Chặn theo tỉ lệ đơn thuần là chặn ' + motDon.length + ' người vì một dữ kiện duy '
      + 'nhất. Đây chính là lý do một ngưỡng cứng không dùng được, và là thứ bảng bên dưới '
      + 'phải cho thấy.',
  };
}
