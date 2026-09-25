// MÀN «CÀI ĐẶT TEAM» — năm việc, làm một lần (GD3 · 25/09/2026).
//
// ═══ VÌ SAO CÓ MÀN NÀY ═════════════════════════════════════════════════════════════════
// Phụ lục A của kế hoạch giao diện liệt kê đường cài đặt hiện tại: **12 bước, rải trên 7
// màn**, và người mới không có chỗ nào để biết mình đang ở bước mấy. Câu hỏi «còn thiếu gì
// nữa thì team này mới chạy được» hôm nay không màn nào trả lời — trong khi MỌI dữ kiện để
// trả lời đều đã nằm trong cơ sở dữ liệu.
//
// Màn này KHÔNG dựng thêm dữ liệu. Nó hỏi năm câu bằng đúng những bộ đọc các màn khác đang
// dùng, rồi nói: xong chưa · bao nhiêu · đi đâu để làm.
//
// ═══ HAI LOẠI VIỆC, TÁCH RIÊNG — LUẬT 5 CỦA KẾ HOẠCH ═══════════════════════════════════
// ① Việc làm được TRÊN MÀN: năm bước dưới, mỗi bước một nút đi tới đúng chỗ.
// ② Việc PHẢI NHỜ NGƯỜI QUẢN TRỊ HỆ THỐNG (mở van gửi tin, bật ráp lời, bật cầu dao giao
//    page): không giấu đi, nhưng cũng không trộn vào danh sách trên — trộn vào là người
//    dùng đứng trước một ô tích mà họ không có cách nào tích được.
//
// ⛔ MÀN NÀY CHỈ ĐỌC. Không một cửa ghi nào: mỗi bước dẫn sang màn vốn đã có cửa ghi, lớp
//    vai và nhật ký của nó. Dựng cửa ghi thứ hai ở một màn tổng quan là cách chắc chắn nhất
//    để hai cửa trôi khỏi nhau.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';
import { tongQuanTeam } from '../team/kho-team.js';

export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

export class LoiCaiDat extends Error {
  constructor(thongDiep, ma = 'cai_dat', status = 400) {
    super(thongDiep);
    this.name = 'LoiCaiDat';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _docKhoToken = null;
let _docKetNoiPos = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCaiDat('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}
/** Kho token Pancake — cùng bộ đọc với màn Kết nối và màn Sức khoẻ. */
export function datDocKhoToken(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCaiDat('datDocKhoToken cần một hàm');
  _docKhoToken = fn || null;
  return _docKhoToken;
}
/** Kết nối kho hàng POS — cùng bộ đọc với màn Người và team. */
export function datDocKetNoiPos(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCaiDat('datDocKetNoiPos cần một hàm');
  _docKetNoiPos = fn || null;
  return _docKetNoiPos;
}
export const daNoiCaiDat = () => typeof _taoTruyVan === 'function';

function congTruyVan(bc) {
  if (!_taoTruyVan) throw new LoiCaiDat('chưa nối cổng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── một bước ─────────────────────────── */

/**
 * Dựng một bước, và BẮT BUỘC đủ ba thứ: nó là gì · đo được gì · đi đâu để làm.
 *
 * ⚠️ `xong` có ba giá trị, không phải hai: `true` · `false` · **`null` = chưa đo được**.
 *    Gộp `null` vào `false` là bảo người ta đi làm lại một việc có thể họ đã làm rồi; gộp
 *    vào `true` thì tệ hơn — nói xong trong khi không biết. Đây đúng là luật «đèn không đo
 *    được thì phải XÁM» của màn Sức khoẻ, áp cho một danh sách việc.
 */
function buoc({ ma, ten, vi, xong, so = null, di = null, nutDi = null, viSaoChuaDo = null }) {
  if (!ma || !ten || !vi) throw new LoiCaiDat(`bước "${ma}" thiếu tên hoặc câu giải thích`);
  if (xong !== true && !di && !viSaoChuaDo) {
    throw new LoiCaiDat(`bước "${ma}" chưa xong mà không chỉ đường đi làm`);
  }
  return { ma, ten, vi, xong, so, di, nutDi, viSaoChuaDo };
}

/* ─────────────────────────── năm bước ─────────────────────────── */

export async function manCaiDat(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const tq = await tongQuanTeam(bc);

  const ds = [];

  /* ① NGƯỜI VÀ VAI */
  ds.push(buoc({
    ma: 'nguoi', ten: 'Có người và vai trong team',
    vi: tq.thanhVien
      ? `${tq.thanhVien} người đang ở trong team này.`
      : 'Chưa ai ở trong team. Không ai đăng nhập vào được ngoài người đang mở màn này.',
    xong: tq.thanhVien > 0,
    so: `${tq.thanhVien} người`,
    di: '/cau-hinh-team', nutDi: 'Thêm người vào team',
  }));

  /* ② TÀI KHOẢN PANCAKE — đường bot đọc tin và gửi câu trả lời */
  ds.push(await buocToken());

  /* ③ PAGE TRONG TEAM */
  ds.push(buoc({
    ma: 'page', ten: 'Có page trong team',
    vi: tq.page.tong
      ? `${tq.page.tong} page thuộc team này.`
      : 'Chưa page nào thuộc team. Quét Pancake để kéo danh mục page về, rồi gán page cho team.',
    xong: tq.page.tong > 0,
    so: `${tq.page.tong} page`,
    di: '/page-bot', nutDi: 'Mở danh sách page',
  }));

  /* ④ MODEL AI */
  ds.push(buoc({
    ma: 'model', ten: 'Chọn model AI và dán khoá',
    vi: tq.model.daCauHinh
      ? `${tq.model.soDong} dòng cấu hình model. Thiếu vai trò «dự phòng» thì nhà chính hết `
        + 'tiền là bot đứng im — xem màn Model AI.'
      : 'Chưa cấu hình model nào. Bot đang chạy bằng bộ mặc định của hệ, và không ai chọn '
        + 'được model rẻ hơn hay đặt dự phòng.',
    xong: tq.model.daCauHinh,
    so: `${tq.model.soDong} dòng`,
    di: '/model-ai', nutDi: 'Mở màn Model AI',
  }));

  /* ⑤ KHO HÀNG VÀ SẢN PHẨM KÈM GIÁ */
  ds.push(await buocKhoHang(db, bc));

  const dem = {
    tong: ds.length,
    xong: ds.filter((b) => b.xong === true).length,
    chuaDo: ds.filter((b) => b.xong === null).length,
  };

  return {
    teamId: bc.teamId,
    buoc: ds,
    dem,
    // Bước đầu tiên chưa xong — thứ người mới cần biết, thay vì tự dò trong năm dòng.
    tiepTheo: ds.find((b) => b.xong !== true) || null,
    ngoaiHe: viecNgoaiHe(),
  };
}

async function buocToken() {
  if (!_docKhoToken) {
    return buoc({
      ma: 'token', ten: 'Có tài khoản Pancake',
      vi: 'Chưa đo được: máy chủ chưa nối bộ đọc kho token. Chưa đo được KHÔNG có nghĩa là '
        + 'đã có tài khoản.',
      xong: null,
      viSaoChuaDo: 'Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng.',
      di: '/ket-noi', nutDi: 'Mở màn Kết nối',
    });
  }
  let kho;
  try {
    kho = await _docKhoToken();
  } catch (e) {
    return buoc({
      ma: 'token', ten: 'Có tài khoản Pancake',
      vi: `Chưa đo được kho tài khoản Pancake: ${e?.message || e}`,
      xong: null,
      viSaoChuaDo: 'Thử lại, hoặc xem màn Hệ còn sống không.',
      di: '/ket-noi', nutDi: 'Mở màn Kết nối',
    });
  }
  const ds = kho && Array.isArray(kho.token) ? kho.token : [];
  const song = ds.filter((t) => !t.daHet);
  return buoc({
    ma: 'token', ten: 'Có tài khoản Pancake',
    vi: song.length
      ? `${song.length}/${ds.length} tài khoản còn sống. Đây là đường bot đọc tin khách và gửi câu trả lời.`
      : (ds.length
        ? `Cả ${ds.length} tài khoản đều hết hạn — bot không gọi được Pancake.`
        : 'Chưa có tài khoản Pancake nào. Bot không đọc và không gửi được tin nào.'),
    xong: song.length > 0,
    so: `${song.length}/${ds.length} sống`,
    di: '/ket-noi', nutDi: 'Mở màn Kết nối',
  });
}

async function buocKhoHang(db, bc) {
  // ⚠️ PHẢI truyền bối cảnh: vế `team_id` trong WHERE của tầng dưới lấy từ đây. Gọi trống là
  // đếm kho hàng của team khác — một con số đúng kiểu, sai người.
  let soKetNoi = null;
  if (_docKetNoiPos) {
    try { soKetNoi = (await _docKetNoiPos(bc)).length; } catch { soKetNoi = null; }
  }
  const soSanPham = await db.dem('san_pham', {});
  const soGia = await db.dem('goi_gia', {});

  // Sản phẩm mà không có giá thì bot không chào bán được — nên đo CẢ HAI, và chỉ gọi là
  // xong khi có cả hai. Một trong hai con số bằng 0 là một page câm khi khách hỏi giá.
  const xong = soSanPham > 0 && soGia > 0;
  return buoc({
    ma: 'kho-hang', ten: 'Nối kho hàng và kéo sản phẩm kèm giá',
    vi: xong
      ? `${soSanPham} sản phẩm · ${soGia} bậc giá đã về cơ sở dữ liệu.`
      : (soSanPham
        ? `${soSanPham} sản phẩm nhưng ${soGia} bậc giá — khách hỏi giá thì bot không trả lời được.`
        : 'Chưa có sản phẩm nào. Nối kho hàng rồi kéo danh mục về ở màn Kết nối.'),
    xong,
    so: soKetNoi === null
      ? `${soSanPham} sản phẩm · ${soGia} giá`
      : `${soKetNoi} kho hàng · ${soSanPham} sản phẩm · ${soGia} giá`,
    di: '/ket-noi', nutDi: 'Mở màn Kết nối',
  });
}

/* ────────────────── việc PHẢI NHỜ NGƯỜI QUẢN TRỊ HỆ THỐNG ────────────────── */

/**
 * Ba cái van nằm ở cấu hình máy chủ. KHÔNG trộn vào năm bước trên: trộn vào là bày ra một ô
 * tích mà người dùng không có cách nào tích được, và đó là cách nhanh nhất dạy người ta bỏ
 * qua cả danh sách.
 *
 * Nhưng cũng KHÔNG giấu: người mới cần biết vì sao làm đủ năm bước rồi mà bot vẫn im.
 */
export function viecNgoaiHe(env = process.env) {
  const bat = (t) => String(env[t] || '') === '1';
  return [
    {
      ma: 'gui-tin', ten: 'Cho bot gửi tin cho khách',
      dangMo: bat('V3_PANCAKE_GUI') && !bat('PANCAKE_READONLY'),
      vi: 'Chưa mở thì bot vẫn đọc tin, vẫn nghĩ ra câu trả lời, nhưng KHÔNG gửi đi.',
    },
    {
      ma: 'rap-loi', ten: 'Bật cách ghép lời mới',
      dangMo: bat('V3_RAP_PROMPT_BAT'),
      vi: 'Chưa bật thì bot dùng bản ghép lời cũ, không đọc kịch bản và quy tắc từ cơ sở dữ liệu.',
    },
    {
      ma: 'giao-page', ten: 'Cho giao page bằng giao diện',
      dangMo: bat('V3_GIAO_PAGE_TREN_MAN'),
      vi: 'Chưa bật thì việc đưa một page từ bot cũ sang bot mới vẫn phải sửa cấu hình máy chủ.',
    },
  ];
}
