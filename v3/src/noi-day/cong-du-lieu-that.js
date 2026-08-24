// MẢNH NỐI — cổng dữ liệu của vai B ↔ tầng truy vấn THẬT của người A (`src/db/`).
//
// Bốn module của vai B nhận một đối tượng `db` từ ngoài vào (tiêm phụ thuộc). Trong test nó
// là bản cài giả `v3/testkit/db-gia.js`; khi chạy thật nó là file này.
//
// **KHÔNG sửa `src/db/` ở đây.** Đó là đất người A. File này chỉ dịch hình dạng.
//
// ─────────────────────────────────────────────────────────────────────────────────────
// BA CHỖ TẦNG TRUY VẤN CỦA A HẸP HƠN THỨ B CẦN — và mảnh nối gánh thế nào
//
//   ① KHÔNG CÓ `IN`. `layNhieu` dựng `cot = $n` cho mỗi điều kiện (`src/db/truy-van.js:177`).
//      Truyền một MẢNG id vào là sinh `id = '{1,2,3}'` → Postgres ném lỗi kiểu.
//      Mà cả bốn mẻ gộp của bảng điều phối đều gom id rồi đọc một lần bằng mảng.
//      → GÁNH: đọc cả bảng của team rồi lọc trong JS. Xem `LOC_TRONG_JS` bên dưới.
//      → GIÁ: mỗi lượt mở bảng điều phối đọc trọn `hoi_thoai` của team. Hôm nay 28.953 dòng
//        (tất cả đang ở team kỹ thuật). Chịu được ở giai đoạn 1, KHÔNG chịu được lâu dài.
//      → BẢN VÁ ĐÚNG: `PHIEU-B-Y1` mục 2 — cho `layNhieu` nhận mảng, dựng `= ANY($n)`.
//        Ba dòng ở đất của A. Xong là bỏ hết đường vòng ở đây.
//
//   ② KHÔNG CÓ `LIMIT`/`OFFSET`, và `thuTu` chỉ TĂNG DẦN MỘT CỘT.
//      → GÁNH: sắp và cắt trang trong JS. Cùng một giá với ①.
//
//   ③b KHÔNG CÓ TOÁN TỬ SO SÁNH. `layNhieu` chỉ dựng `cot = $n`. Bảng điều phối lọc việc
//      đang mở bằng `{ han_luc: { '<': bây_giờ } }` — truyền xuống là Postgres nhận nguyên
//      object rồi ném «date/time field value out of range». Đã dính thật.
//      → GÁNH: cùng đường với ① — đẩy phần bằng-nhau xuống, so sánh thì lọc ở JS.
//
//   ③c POSTGRES TRẢ `Date`, CODE CỦA B TÍNH BẰNG MỐC MILI-GIÂY.
//      Bản cài giả gieo số, Postgres trả đối tượng `Date` cho mọi cột `timestamptz`. Đây
//      đúng là chỗ «bản giả dễ tính hơn bản thật» — test xanh không chứng minh được gì.
//      → GÁNH: quy `Date` → mốc ms ngay ở cửa ra của mảnh nối, MỘT CHỖ DUY NHẤT. Code của
//        B phía trên không phải biết cơ sở dữ liệu trả kiểu gì.
//
//   ③ KHÔNG CÓ SO-VÀ-ĐẶT. `suaTheoId` chỉ nhận `id`, không nhận điều kiện thêm.
//      → KHÔNG GÁNH. Hai sale bấm "Nhận việc" cùng lúc mà không có so-và-đặt thì CẢ HAI
//        CÙNG THẮNG; ở dòng duyệt đơn nghĩa là hai đơn trùng bay vào POS. Đây là đường
//        tiền, nên mảnh nối **NÉM LỖI CÓ TÊN** thay vì lặng lẽ chạy một bản kém an toàn.
//        Nút bấm hỏng to còn hơn hai đơn trùng lặng lẽ. Bản vá: `PHIEU-B-Y1` mục 1.
// ─────────────────────────────────────────────────────────────────────────────────────

import {
  layNhieu, layMotTheoId, themMoi, suaTheoId, ctxHeThong,
  LoiThieuBoiCanhTeam, LoiXuyenTeam,
} from '../../../src/db/index.js';
import { batBuocBoiCanh, NGUON } from '../auth/boi-canh.js';

/** Bảng phải đọc trọn rồi lọc trong JS vì thiếu `IN`. Xoá dần khi A cho `layNhieu` nhận mảng. */
export const LOC_TRONG_JS = new Set(['khach', 'page', 'nguoi_dung', 'hoi_thoai', 'don_hang', 'viec_can_xu_ly']);

/** Kêu MỘT LẦN mỗi bảng, kèm số dòng đã kéo về — để cái giá của đường vòng có mặt trong log. */
const daKeu = new Set();
function keuMotLan(bang, soDong) {
  if (daKeu.has(bang)) return;
  daKeu.add(bang);
  console.warn(`[noi-day] đọc trọn bảng "${bang}" (${soDong} dòng) rồi lọc trong JS — tầng truy vấn chưa có IN. Bản vá: PHIEU-B-Y1 mục 2.`);
}

export class LoiChuaCoSoVaDat extends Error {
  constructor(bang) {
    super(`Chưa sửa được "${bang}" có điều kiện: tầng truy vấn chỉ sửa theo id, không nhận so-và-đặt. `
      + 'Hai người bấm cùng lúc sẽ cùng thắng — cửa duyệt đơn là đường tiền nên chặn ở đây. '
      + 'Bản vá: PHIEU-B-Y1 mục 1 (suaTheoId nhận điều kiện thêm).');
    this.name = 'LoiChuaCoSoVaDat';
    this.ma = 'chua_co_so_va_dat';
    this.status = 501;
  }
}

const chuoi = (v) => (v == null ? '' : String(v));
const OP = ['>=', '>', '<=', '<', 'khac'];
const laToanTu = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
  && Object.keys(v).length > 0 && Object.keys(v).every((k) => OP.includes(k));

/** Cùng ngữ nghĩa với bản cài giả (`v3/testkit/db-gia.js#hop`) — hai bên phải nói một thứ tiếng. */
function khopMot(giaTri, dk) {
  if (Array.isArray(dk)) return dk.map(chuoi).includes(chuoi(giaTri));
  if (dk === null) return giaTri == null;
  if (laToanTu(dk)) {
    const a = giaTri instanceof Date ? giaTri.getTime() : giaTri;
    for (const [op, moc] of Object.entries(dk)) {
      const b = moc instanceof Date ? moc.getTime() : moc;
      if (op === '>=' && !(a >= b)) return false;
      if (op === '>' && !(a > b)) return false;
      if (op === '<=' && !(a <= b)) return false;
      if (op === '<' && !(a < b)) return false;
      if (op === 'khac' && chuoi(a) === chuoi(b)) return false;
    }
    return true;
  }
  return chuoi(giaTri) === chuoi(dk);
}
const khop = (dong, dieuKien) => Object.entries(dieuKien).every(([k, v]) => khopMot(dong[k], v));

/** Điều kiện tầng dưới KHÔNG diễn đạt được: mảng (thiếu IN) · null (thiếu IS NULL) · toán tử. */
const khongDayXuongDuoc = (v) => Array.isArray(v) || v === null || laToanTu(v);
const coPhanKhoDay = (dk) => Object.values(dk || {}).some(khongDayXuongDuoc);

/**
 * Quy mọi `Date` thành mốc mili-giây, MỘT CHỖ DUY NHẤT.
 *
 * Bản cài giả gieo số; Postgres trả `Date` cho mọi `timestamptz`. Không quy ở đây thì mỗi
 * chỗ tính giờ trong code của B phải tự nhớ — và chỗ nào quên thì đồng hồ đếm ngược ra `NaN`
 * mà không báo gì. Quy một lần ở cửa ra là code phía trên không cần biết CSDL trả kiểu gì.
 */
function quyNgay(dong) {
  if (!dong || typeof dong !== 'object') return dong;
  let doi = null;
  for (const [k, v] of Object.entries(dong)) {
    if (v instanceof Date) { doi = doi || { ...dong }; doi[k] = v.getTime(); }
  }
  return doi || dong;
}

/**
 * Dựng cổng dữ liệu cho một bối cảnh.
 *
 * @param {import('pg').Pool} pool  lấy từ `db/ket-noi.js` (`taoPool()`), KHÔNG mở pool riêng
 * @param {object} boiCanh          vé của vai B — xem `v3/src/auth/boi-canh.js`
 */
export function taoTruyVanThat(pool, boiCanh) {
  if (!pool) throw new Error('taoTruyVanThat: thiếu pool (lấy từ db/ket-noi.js#taoPool).');
  const bc = batBuocBoiCanh(boiCanh);

  // Việc nền của vai B (`nguon:'may'`) đi bằng cửa thoát của A, và A đòi `team_id` tường
  // minh trong mọi lời gọi — mảnh nối tự kẹp vào, nơi gọi không phải nhớ.
  const laMay = bc.nguon === NGUON.MAY;
  const ctx = laMay ? ctxHeThong() : { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId || null };
  const kepTeam = (dk = {}) => (laMay ? { ...dk, team_id: bc.teamId } : dk);

  /** Đọc: tách phần tầng dưới làm được (bằng nhau, không null) khỏi phần phải lọc ở JS. */
  async function docLoc(bang, dieuKien = {}, thuTu) {
    const dk = kepTeam(dieuKien);
    if (!coPhanKhoDay(dk)) {
      return (await layNhieu(pool, ctx, bang, { dieuKien: dk, thuTu })).map(quyNgay);
    }

    // Có mảng, `null`, hoặc toán tử so sánh → tầng dưới không diễn đạt được. Đẩy xuống phần
    // diễn đạt được, kéo về, rồi lọc nốt ở JS.
    const dkDuoi = Object.fromEntries(Object.entries(dk).filter(([, v]) => !khongDayXuongDuoc(v)));
    const tho = (await layNhieu(pool, ctx, bang, { dieuKien: dkDuoi, thuTu })).map(quyNgay);
    if (LOC_TRONG_JS.has(bang)) keuMotLan(bang, tho.length);
    const conLai = Object.fromEntries(Object.entries(dk).filter(([, v]) => khongDayXuongDuoc(v)));
    return tho.filter((d) => khop(d, conLai));
  }

  return {
    boiCanh: bc,

    async chon(bang, dieuKien = {}, { sapXep, giamDan = false, gioiHan, buoc = 0 } = {}) {
      // `thuTu` của A chỉ TĂNG DẦN. Giảm dần thì bỏ `thuTu` và tự sắp — nhờ tầng dưới sắp
      // tăng rồi đảo ở JS cũng ra kết quả đó nhưng tốn thêm một vòng, không lợi gì.
      let ra = await docLoc(bang, dieuKien, giamDan ? undefined : sapXep);
      if (sapXep && giamDan) {
        ra = [...ra].sort((a, b) => (a[sapXep] > b[sapXep] ? -1 : a[sapXep] < b[sapXep] ? 1 : 0));
      }
      if (buoc) ra = ra.slice(buoc);
      if (gioiHan != null) ra = ra.slice(0, gioiHan);   // A chưa có LIMIT — cắt ở đây
      return ra;
    },

    async mot(bang, dieuKien = {}) {
      const khoa = Object.keys(dieuKien);
      // Đúng một điều kiện `id` → dùng đường có chỉ mục của A, đừng quét bảng.
      if (khoa.length === 1 && khoa[0] === 'id' && !laMay && !Array.isArray(dieuKien.id)) {
        return quyNgay(await layMotTheoId(pool, ctx, bang, dieuKien.id));
      }
      return (await docLoc(bang, dieuKien))[0] || null;
    },

    async dem(bang, dieuKien = {}) {
      // A chưa có COUNT. Đếm bằng độ dài — đúng số, tốn hơn. Cùng nợ với ①.
      return (await docLoc(bang, dieuKien)).length;
    },

    async them(bang, banGhi = {}) {
      return quyNgay(await themMoi(pool, ctx, bang, kepTeam(banGhi)));
    },

    async sua(bang, dieuKien = {}, thayDoi = {}) {
      const khac = Object.keys(dieuKien).filter((k) => k !== 'id' && k !== 'team_id');
      // ③ — chặn to, không chạy bản kém an toàn.
      if (khac.length) throw new LoiChuaCoSoVaDat(bang);
      if (dieuKien.id == null) throw new LoiChuaCoSoVaDat(bang);
      const dong = await suaTheoId(pool, ctx, bang, dieuKien.id, thayDoi);
      return dong ? 1 : 0;
    },

    async xoa(bang) {
      throw new Error(`Vai B không xoá dữ liệu (bảng ${bang}). Luật 2: không xoá đơn hàng ở bất kỳ trạng thái nào.`);
    },

    async giaoDich(fn) {
      // A chưa phơi ra giao dịch. Chạy thẳng — an toàn ở đây CHỈ vì `sua` đã chặn mọi lệnh
      // ghi cần so-và-đặt ở trên; không có lệnh ghi nào đi lọt mà cần giao dịch để đúng.
      return fn(this);
    },
  };
}

export { LoiThieuBoiCanhTeam, LoiXuyenTeam };
