// TẦNG ĐỌC CỦA MÀN «ĐƯA SẢN PHẨM MỚI LÊN CHẠY» (G2-F7, sóng 4).
//
// Yêu cầu nguyên văn: *«Sáu chặng, mỗi chặng một cửa kiểm · **chặng 2 bắt buộc có động cơ**»*.
//
// ═══ SÁU CHẶNG LÀ CỦA `90-phu-luc §2`, KHÔNG PHẢI TÔI NGHĨ RA ═════════════════════════
//   1 · Thu liệu      — có hội thoại thật để học chưa
//   2 · Rút chất      — năm chất liệu, trong đó **động cơ** là cửa kiểm khó nhất
//   3 · Dựng kịch bản — DRAFT → REVIEW → LIVE
//   4 · Nạp vào máy   — ba ô cấu hình đã vào `kb-overrides.json` chưa
//   5 · Chạy có kiểm soát — cửa kiểm sẵn sàng cho bật AI chưa, và đã bật chưa
//   6 · Đo & viết lại — có số liệu để viết bản kế tiếp chưa
//
// ═══ CHẶNG 2 KHÔNG QUA ĐƯỢC, VÀ ĐÓ LÀ ĐIỀU MÀN NÀY PHẢI NÓI TO ════════════════════════
// `90-phu-luc §4` đo rồi: `kb-overrides.json` chỉ có **ba ô** — `greeting`, `salesPrompt`,
// `tone`. Không có trường nào cho động cơ, lời hứa trung tâm, hay nhóm nhu cầu. Nguyên văn:
// *«hệ thống hiện tại thậm chí CHƯA CÓ Ô ĐỂ BỎ TRỐNG»*.
//
// Nên cửa kiểm chặng 2 KHÔNG phải «ô này trống» mà là «không có ô này». Hai chuyện khác
// nhau, và màn phải phân biệt:
//   · ô trống      → người điền vào là xong
//   · không có ô   → phải sửa lược đồ trước, người có muốn điền cũng không có chỗ
//
// Vẽ một ô nhập rỗng cho «động cơ» ở đây là hứa một chỗ chứa không tồn tại: người ta gõ
// vào, bấm lưu, và chữ đi vào hư không. Màn KHÔNG dựng ô đó.
//
// ═══ MÀN CHỈ ĐỌC ═════════════════════════════════════════════════════════════════════
// Mỗi chặng có nút bấm sang màn LÀM chặng đó. Dựng lại việc của sáu màn khác ở đây là dựng
// sáu bản thứ hai.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const BANG_KICH_BAN = 'kich_ban';
export const BANG_HOI_THOAI = 'hoi_thoai';
export const BANG_SO_AI = 'so_ai';

export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Trạng thái một chặng. `KHONG_CO_O` là mã riêng — đừng gộp vào `CHUA`. */
export const CHANG = Object.freeze({
  XONG: 'xong',
  DANG_DO: 'dang-do',
  CHUA: 'chua',
  KHONG_CO_O: 'khong-co-o',
  KHONG_BIET: 'khong-biet',
});

export const CHU_CHANG = Object.freeze({
  xong: 'xong',
  'dang-do': 'đang dở',
  chua: 'chưa làm',
  'khong-co-o': 'KHÔNG CÓ CHỖ CHỨA',
  'khong-biet': 'chưa đọc được',
});

/**
 * NĂM CHẤT LIỆU của chặng 2 (`90-phu-luc §4`), kèm chỗ chứa THẬT trong hệ thống.
 * `o: null` nghĩa là không có trường nào — không phải trường rỗng.
 */
export const CHAT_LIEU = Object.freeze([
  { ma: 'dong_co', ten: 'Động cơ', o: null,
    noi: 'Thứ miễn phí khiến khách phải LÀM một việc. Cửa kiểm khó nhất và hay bỏ trống nhất.' },
  { ma: 'loi_hua', ten: 'Lời hứa trung tâm', o: null,
    noi: 'Hiện lẫn trong `salesPrompt`, không có ô riêng nên không kiểm được.' },
  { ma: 'nhom_nhu_cau', ten: 'Nhóm nhu cầu', o: null,
    noi: 'Mỗi nhóm một bằng chứng. Không có chỗ chứa.' },
  { ma: 'khoi_gia', ten: 'Khối giá', o: 'bậc giá của sản phẩm',
    noi: 'CÓ — bảng giá lấy từ Google Sheet, validator kiểm giá.' },
  { ma: 'bo_phan_doi', ten: 'Bộ phản đối', o: 'dùng chung mọi page',
    noi: 'Có nhưng KHÔNG riêng từng sản phẩm — một bộ dùng chung.' },
]);

export class LoiLenChay extends Error {
  constructor(thongDiep, ma = 'len_chay', status = 400) {
    super(thongDiep);
    this.name = 'LoiLenChay';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docSanSang = null;
let _docMotPage = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiLenChay('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export function datDocSanSang(fn) { _docSanSang = fn || null; return _docSanSang; }
export function datDocMotPage(fn) { _docMotPage = fn || null; return _docMotPage; }
export const daNoiLenChay = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiLenChay('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── một page, sáu chặng ─────────────────────────── */

export async function changCuaPage(boiCanh, pageIdFacebook) {
  const bc = batBuocBoiCanh(boiCanh);
  const d = truyVan(bc);
  const id = String(pageIdFacebook);

  const ds = await d.chon(BANG_PAGE, {});
  const page = ds.find((p) => String(p.page_id) === id);
  // Page team khác → 404, không phải 403.
  if (!page) throw new LoiLenChay(`Không có page ${id} trong team này.`, 'khong_thay', 404);

  const [soHoiThoai, kichBan, soSoAi] = await Promise.all([
    d.dem(BANG_HOI_THOAI, { page_id: String(page.id) }),
    d.chon(BANG_KICH_BAN, { page_id: String(page.id) }),
    d.dem(BANG_SO_AI, { page_id: id }),
  ]);

  // Hai nguồn từ tiến trình bot. Đọc được thì dùng, không thì chặng liên quan là «chưa biết»
  // — KHÔNG rơi về «chưa làm», vì «chưa làm» là một kết luận và ta chưa có quyền kết luận.
  let sanSang = null; let loiSanSang = null;
  if (_docSanSang) {
    try {
      const toanHe = await _docSanSang();
      sanSang = (toanHe.pages || []).find((p) => String(p.pageId) === id) || null;
      if (!sanSang) loiSanSang = 'Tiến trình bot không thấy page này.';
    } catch (e) { loiSanSang = String(e?.message || e); }
  } else loiSanSang = 'Chưa nối cầu sang tiến trình bot.';

  let kb = null; let loiKb = null;
  if (_docMotPage) {
    try { kb = await _docMotPage(id); } catch (e) { loiKb = String(e?.message || e); }
  } else loiKb = 'Chưa nối cầu sang tiến trình bot.';

  const chang = [
    c1ThuLieu(soHoiThoai),
    c2RutChat(kb, loiKb),
    c3DungKichBan(kichBan),
    c4NapVaoMay(kb, loiKb),
    c5ChayCoKiemSoat(sanSang, loiSanSang),
    c6DoVaVietLai(soSoAi, sanSang),
  ];

  // «Đi được tới đâu» = chặng cuối cùng mà MỌI chặng trước đều xong. Một chặng sau xong lẻ
  // không đẩy được page đi tiếp — đó là ý của «mỗi chặng một cửa kiểm».
  let toiChang = 0;
  for (const c of chang) { if (c.trangThai === CHANG.XONG) toiChang += 1; else break; }

  const chan = chang.find((c) => c.trangThai !== CHANG.XONG) || null;

  return {
    pageId: id,
    ten: page.ten || id,
    chang,
    toiChang,
    dungLaiO: chan ? { so: chan.so, ten: chan.ten, viSao: chan.noi, trangThai: chan.trangThai } : null,
    chatLieu: CHAT_LIEU,
    // Nói thẳng: chặng 2 không qua được bằng cách điền form, phải sửa lược đồ trước.
    canSuaLuocDo: CHAT_LIEU.some((x) => x.o === null),
  };
}

/* ─────────────────────────── từng chặng ─────────────────────────── */

function c1ThuLieu(soHoiThoai) {
  return {
    so: 1, ten: 'Thu liệu',
    trangThai: soHoiThoai > 0 ? CHANG.XONG : CHANG.CHUA,
    soDo: soHoiThoai,
    donVi: 'hội thoại',
    noi: soHoiThoai > 0
      ? `Có ${soHoiThoai} hội thoại thật để rút chất.`
      : 'Chưa có hội thoại nào của page này — không có gì để học.',
    di: null,
    lam: soHoiThoai > 0 ? '' : 'Hội thoại kéo về từ Pancake. Page chưa chạy thì chưa có.',
  };
}

/**
 * CHẶNG 2 — cửa kiểm KHÔNG BAO GIỜ qua được bằng cách điền form.
 * Trạng thái riêng `KHONG_CO_O`: khác «chưa làm» ở chỗ người có muốn làm cũng không có chỗ.
 */
function c2RutChat(kb, loi) {
  const thieuO = CHAT_LIEU.filter((x) => x.o === null);
  return {
    so: 2, ten: 'Rút chất',
    trangThai: CHANG.KHONG_CO_O,
    soDo: thieuO.length,
    donVi: 'chất liệu không có chỗ chứa',
    noi: `${thieuO.length}/5 chất liệu KHÔNG có trường nào để chứa: `
      + `${thieuO.map((x) => x.ten).join(', ')}. `
      + 'Cấu hình page chỉ có ba ô: câu chào, cách bán, giọng điệu.',
    di: null,
    lam: 'Đây KHÔNG phải ô để trống — là ô không tồn tại. Muốn qua chặng này phải thêm '
      + 'trường vào `kb-overrides.json` (bên v1) hoặc dựng bảng chất liệu ở v3 trước. '
      + 'Màn này cố ý KHÔNG vẽ ô nhập cho động cơ: gõ vào một ô không có chỗ chứa thì chữ '
      + 'đi vào hư không.',
    loi: loi || null,
  };
}

function c3DungKichBan(kichBan) {
  const live = kichBan.filter((k) => String(k.trang_thai) === 'LIVE');
  const nhap = kichBan.filter((k) => ['DRAFT', 'REVIEW'].includes(String(k.trang_thai)));
  let tt = CHANG.CHUA;
  if (live.length) tt = CHANG.XONG;
  else if (nhap.length) tt = CHANG.DANG_DO;
  return {
    so: 3, ten: 'Dựng kịch bản',
    trangThai: tt,
    soDo: kichBan.length,
    donVi: 'bản',
    noi: live.length ? `Có ${live.length} bản LIVE.`
      : (nhap.length ? `${nhap.length} bản còn ở nháp/chờ duyệt — chưa bản nào LIVE.`
        : 'Chưa có bản kịch bản nào.'),
    di: '/kich-ban',
    lam: tt === CHANG.XONG ? '' : 'Soạn kịch bản rồi đưa lên LIVE.',
  };
}

function c4NapVaoMay(kb, loi) {
  if (!kb) {
    return {
      so: 4, ten: 'Nạp vào máy', trangThai: CHANG.KHONG_BIET, soDo: null, donVi: 'ô',
      noi: `Chưa đọc được cấu hình từ tiến trình bot: ${loi || 'không rõ'}.`,
      di: '/kich-ban', lam: 'Số 0 ở đây sẽ là kết luận sai — màn để trống thay vì đoán.',
    };
  }
  const c = kb.cauHinh || {};
  const co = ['chao', 'cachBan', 'giongDieu'].filter((k) => String(c[k] || '').trim());
  // Bot chạy được cần câu chào + cách bán. Giọng điệu chỉ là nhắc.
  const dayDu = !!(c.chao && c.cachBan);
  return {
    so: 4, ten: 'Nạp vào máy',
    trangThai: dayDu ? CHANG.XONG : (co.length ? CHANG.DANG_DO : CHANG.CHUA),
    soDo: co.length, donVi: '/3 ô đã điền',
    noi: dayDu
      ? `Đã nạp ${co.length}/3 ô${co.length < 3 ? ' (thiếu giọng điệu — chỉ nhắc)' : ''}.`
      : `Mới ${co.length}/3 ô. Bot cần ÍT NHẤT câu chào và cách bán mới trả lời được.`,
    di: '/kich-ban',
    lam: dayDu ? '' : 'Điền câu chào và cách bán rồi đưa lên LIVE.',
  };
}

function c5ChayCoKiemSoat(sanSang, loi) {
  if (!sanSang) {
    return {
      so: 5, ten: 'Chạy có kiểm soát', trangThai: CHANG.KHONG_BIET, soDo: null, donVi: '',
      noi: `Chưa đọc được cửa kiểm: ${loi || 'không rõ'}.`,
      di: '/san-sang', lam: '«0 điều kiện chặn» sẽ là tin mừng giả — màn để trống.',
    };
  }
  const chan = (sanSang.blockers || []).length;
  const bat = !!sanSang.aiEnabled;
  let tt = CHANG.CHUA;
  if (bat && !chan) tt = CHANG.XONG;
  else if (!chan) tt = CHANG.DANG_DO;   // đủ điều kiện nhưng chưa ai bật
  return {
    so: 5, ten: 'Chạy có kiểm soát',
    trangThai: tt,
    soDo: chan, donVi: 'điều kiện chặn',
    noi: chan
      ? `Vướng ${chan} điều kiện chặn — bot KHÔNG bật được.`
      : (bat ? 'Đủ điều kiện và bot đang chạy.' : 'Đủ điều kiện nhưng CHƯA ai bật bot.'),
    di: '/san-sang',
    lam: chan ? 'Gỡ điều kiện chặn ở Cửa kiểm sẵn sàng.'
      : (bat ? '' : 'Bật bot ở màn Page & Bot.'),
  };
}

function c6DoVaVietLai(soSoAi, sanSang) {
  const chay = sanSang ? !!sanSang.aiEnabled : null;
  return {
    so: 6, ten: 'Đo & viết lại',
    trangThai: soSoAi > 0 ? CHANG.XONG : CHANG.CHUA,
    soDo: soSoAi, donVi: 'lượt ghi sổ AI',
    noi: soSoAi > 0
      ? `Có ${soSoAi} lượt trong Sổ AI để đo và viết bản kế tiếp.`
      : (chay === false
        ? 'Chưa có số liệu — bot chưa chạy trên page này nên chưa có gì để đo.'
        : 'Sổ AI chưa có lượt nào của page này.'),
    di: null,
    lam: soSoAi > 0 ? '' : 'Chặng này tự đầy khi bot chạy. Không phải việc phải làm tay.',
  };
}

/* ─────────────────────────── danh sách page ─────────────────────────── */

export async function manLenChay(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const ds = await truyVan(bc).chon(BANG_PAGE, {}, { sapXep: 'ten' });
  return {
    teamId: bc.teamId,
    page: ds.map((p) => ({ pageId: String(p.page_id), ten: p.ten || String(p.page_id) })),
    chatLieu: CHAT_LIEU,
    // Cùng một câu cho mọi page — chặng 2 chặn ở lược đồ, không chặn theo từng page.
    chan2: {
      trangThai: CHANG.KHONG_CO_O,
      noi: `${CHAT_LIEU.filter((x) => x.o === null).length}/5 chất liệu của chặng 2 không có `
        + 'trường nào để chứa. Mọi page đều dừng ở đây, và không page nào tự gỡ được — '
        + 'phải sửa lược đồ trước.',
    },
    trong: ds.length ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Team này chưa có page nào.',
      diTiep: 'Gán page cho team ở màn Cấu hình team.',
    },
  };
}
