// «MÁY CHẠY BOT CÒN SỐNG KHÔNG» — một luật xét, hai chỗ hiện.
//
// ═══ VÌ SAO CÓ TỆP NÀY ═════════════════════════════════════════════════════════════════
// Dải trạng thái (mọi trang) và màn «Hệ còn sống không» đều phải trả lời cùng một câu hỏi.
// Viết luật xét hai lần là hẹn ngày hai chỗ nói hai điều khác nhau về cùng một máy — đúng
// bệnh đã đo được với mẫu số của dải trạng thái hôm 22/09 («1/1 page» vs «4 page của team»).
// Nên: bộ đọc tiêm một lần, luật xét viết một lần, hai màn cùng gọi.
//
// ═══ ĐO BẰNG GÌ ════════════════════════════════════════════════════════════════════════
// Bằng hàng đợi tin (`src/queue/kho.js#nhipMayBot`), không bằng một bảng nhịp tim riêng —
// bảng riêng cần migration, mà hàng đợi thì đã ghi sẵn đúng thứ đáng lo: **tin của khách có
// được rút ra xử hay không**.
//
// ═══ BA CHỖ DỄ NÓI SAI, VÀ CÁCH TRÁNH ══════════════════════════════════════════════════
//   ① HÀNG ĐỢI RỖNG ≠ MÁY SỐNG. Đêm không ai nhắn thì hàng đợi rỗng dù máy đã chết từ tối.
//      ⇒ XÁM («chưa đo được»), không XANH. Luật đèn của màn Sức khoẻ: không đo được thì xám.
//   ② TIN DỒN ≠ MÁY CHẾT. Năm mươi khách nhắn cùng lúc thì tin thứ năm mươi chờ vài phút là
//      bình thường — máy vẫn đang chạy. ⇒ chỉ gọi là ĐỎ khi tin cũ nhất đã quá hạn **và**
//      không có tin nào vừa xử xong. Thiếu vế sau là đẻ báo động giả mỗi đợt cao điểm, mà
//      báo động giả thì người ta tắt chuông.
//   ③ TIN KẸT Ở `dang_xu` là dấu vết máy chết GIỮA CHỪNG — không tự hết, và không ai thấy
//      nếu chỉ nhìn số tin đang chờ.

/** Ngưỡng, khai một chỗ để hai màn và bài kiểm cùng đọc. */
export const NGUONG = Object.freeze({
  /** Tin của khách nằm chờ quá bằng này giây mà không có gì xử xong = máy đứng. Nhịp quay
   *  của worker là 6 giây (`V3_WORKER_NHIP_MS`), nên 45 giây đã là chậm gấp bảy lần. */
  choGiay: 45,
  /** Tin bị giữ ở `dang_xu` quá bằng này giây = máy chết khi đang cầm tin. Một lượt xử
   *  gồm một lời gọi model, hiếm khi quá 30 giây; 5 phút thì không còn cách giải thích nào
   *  ngoài tiến trình đã mất. */
  dangXuGiay: 300,
  /** Hàng đợi rỗng và lượt xử gần nhất trong vòng này thì còn dám nói máy đang sống. */
  conTuoiGiay: 300,
});

export const MUC = Object.freeze({ XANH: 'xanh', VANG: 'vang', DO: 'do', XAM: 'xam' });

const phut = (giay) => Math.max(1, Math.round(giay / 60));

/**
 * Xét một số đo thành một câu người đọc được.
 *
 * @param {object|null} nhip số đo của `nhipMayBot`, hoặc null khi chưa đo được
 * @param {string} viSaoKhongDo câu giải thích khi `nhip` là null
 * @returns {{muc:string, nhan:string, cau:string, so:string|null, viec:string|null}}
 *   `nhan` = tên trạng thái, đủ ngắn để làm tiêu đề một dòng trên dải trạng thái.
 *   `cau`  = câu ĐỦ Ý, đứng một mình được — màn «Hệ còn sống không» hiện nguyên câu này.
 *   `viec` = việc phải làm; null nghĩa là không có việc gì phải làm.
 */
export function xetNhip(nhip, viSaoKhongDo = '') {
  if (!nhip) {
    return {
      muc: MUC.XAM,
      nhan: 'Chưa đo được máy chạy bot',
      cau: viSaoKhongDo || 'Chưa đo được máy chạy bot của bot mới.',
      so: null,
      viec: 'Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng, không phải lỗi dữ liệu.',
    };
  }
  const { dangCho = 0, dangXu = 0, daXu = 0, choLauNhatGiay, dangXuLauNhatGiay, xongGanNhatGiay } = nhip;

  // ③ Tin kẹt giữa chừng — dấu vết rõ nhất của một tiến trình đã mất.
  if (dangXu > 0 && dangXuLauNhatGiay != null && dangXuLauNhatGiay > NGUONG.dangXuGiay) {
    return {
      muc: MUC.DO,
      nhan: 'Máy chạy bot đã tắt giữa chừng',
      cau: `${dangXu} tin đang bị giữ giữa chừng, tin lâu nhất ${phut(dangXuLauNhatGiay)} phút — `
        + 'máy chạy bot đã cầm tin rồi tắt. Tin ấy sẽ không tự chạy tiếp.',
      so: `${dangXu} tin kẹt`,
      viec: 'Nhờ người quản trị hệ thống xem máy chạy bot còn chạy không, rồi trả những tin ấy về hàng chờ.',
    };
  }

  const vuaXuXong = xongGanNhatGiay != null && xongGanNhatGiay <= NGUONG.choGiay;

  if (dangCho > 0 && choLauNhatGiay != null && choLauNhatGiay > NGUONG.choGiay) {
    // ② Có xử xong gần đây ⇒ máy vẫn chạy, chỉ là đang dồn.
    if (vuaXuXong) {
      return {
        muc: MUC.VANG,
        nhan: 'Máy chạy bot đang quá tải',
        cau: `${dangCho} tin của khách đang chờ, tin cũ nhất ${phut(choLauNhatGiay)} phút — `
          + 'máy chạy bot vẫn đang xử nhưng không kịp.',
        so: `${dangCho} tin chờ ${phut(choLauNhatGiay)} phút`,
        viec: 'Theo dõi thêm ít phút. Còn dồn thì báo người quản trị hệ thống.',
      };
    }
    return {
      muc: MUC.DO,
      nhan: 'Máy chạy bot đang đứng',
      cau: `${dangCho} tin của khách đã chờ ${phut(choLauNhatGiay)} phút mà không tin nào được `
        + 'xử — máy chạy bot đang đứng. Khách nhắn vào lúc này KHÔNG ai trả lời.',
      so: `${dangCho} tin chờ ${phut(choLauNhatGiay)} phút`,
      viec: 'Nhờ người quản trị hệ thống khởi động lại máy chạy bot.',
    };
  }

  if (dangCho > 0) {
    return {
      muc: MUC.XANH,
      nhan: 'Máy chạy bot đang chạy',
      cau: `${dangCho} tin đang chờ, tin cũ nhất ${choLauNhatGiay ?? 0} giây — máy chạy bot đang rút kịp.`,
      so: `${dangCho} tin chờ`,
      viec: null,
    };
  }

  if (daXu === 0) {
    return {
      muc: MUC.XAM,
      nhan: 'Chưa đo được máy chạy bot',
      cau: 'Chưa đo được: chưa có tin nào của khách đi qua máy chạy bot của bot mới, nên chưa có '
        + 'dấu vết nào để đo.',
      so: 'chưa có lượt nào',
      viec: null,
    };
  }

  if (xongGanNhatGiay != null && xongGanNhatGiay <= NGUONG.conTuoiGiay) {
    return {
      muc: MUC.XANH,
      nhan: 'Máy chạy bot đang chạy',
      cau: `Hàng đợi rỗng, lượt xử gần nhất ${phut(xongGanNhatGiay)} phút trước.`,
      so: `${phut(xongGanNhatGiay)} phút trước`,
      viec: null,
    };
  }

  // ① Rỗng và nguội — KHÔNG được nói xanh.
  return {
    muc: MUC.XAM,
    nhan: 'Chưa đo được máy chạy bot',
    cau: `Chưa đo được: hàng đợi rỗng và lượt xử gần nhất đã ${phut(xongGanNhatGiay ?? 0)} phút `
      + 'trước. Không có khách nhắn thì không có cách nào biết máy chạy bot còn sống hay đã tắt.',
    so: `${phut(xongGanNhatGiay ?? 0)} phút trước`,
    viec: null,
  };
}

/* ─────────────────────────── cổng tiêm + nhớ tạm ─────────────────────────── */

const NHO_MS = 15_000;

let _doc = null;
const _nho = new Map(); // khoá team → { luc, kq }

export function datDocNhip(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDocNhip: cần một hàm');
  _doc = fn || null;
  _nho.clear();
}
export const daNoiNhip = () => typeof _doc === 'function';
/** Chỉ dùng trong bài kiểm. */
export function xoaNhoNhip() { _nho.clear(); }

/**
 * Đọc rồi xét, có nhớ tạm 15 giây.
 *
 * ⚠️ NHỚ TẠM NGẮN, CỐ Ý. Dải trạng thái hiện ở mọi trang nên phép đo phải rẻ; nhưng tiêu chí
 *    của phiếu là «tắt máy chạy bot thì trong 2 phút dải chuyển đỏ», nên nhớ tạm 60 giây như
 *    phép đếm page là ăn mất quá nửa ngân sách ấy.
 */
export async function docNhipMayBot({ boiCanh = null, bayGio = Date.now() } = {}) {
  const khoa = boiCanh?.teamId ? `team:${boiCanh.teamId}` : 'toan-he';
  const cu = _nho.get(khoa);
  if (cu && bayGio - cu.luc < NHO_MS) return cu.kq;

  if (!_doc) {
    return xetNhip(null, 'Chưa đo được: máy chủ chưa nối bộ đọc hàng đợi tin.');
  }
  let kq;
  try {
    kq = xetNhip(await _doc(boiCanh));
  } catch (e) {
    // Hỏng thì NÓI HỎNG và KHÔNG nhớ tạm — đọc lại được là phải đúng ngay.
    return xetNhip(null, `Chưa đo được hàng đợi tin: ${e?.message || e}`);
  }
  _nho.set(khoa, { luc: bayGio, kq });
  return kq;
}
