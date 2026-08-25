// TẦNG ĐỌC CỦA MÀN «THƯ VIỆN ẢNH» (G2-D5, sóng 2 — làm muộn ở sóng 4).
//
// Yêu cầu nguyên văn: *«Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc»*.
//
// ═══ TÔI ĐÃ BÁO MÀN NÀY «CHẶN — KHÔNG CÓ BẢNG». SAI. ══════════════════════════════════
// Đúng là v3 không có bảng ảnh. Nhưng ảnh thì có: **459 ảnh** nằm trong dữ liệu sản phẩm
// của tiến trình bot (đo 25/08, 70/71 sản phẩm có ảnh). Kết luận «chặn» vì không thấy bảng
// là cùng đúng lỗi với `page.bot_ai_bat` (B-Y7) và với `san_pham`: nhìn chỗ ĐÁNG LẼ chứa
// dữ liệu, thấy trống, rồi kết luận dữ liệu không tồn tại.
//
// ═══ VÀ ĐÂY LÀ CHỖ MÀN NÀY PHẢI NÓI THẬT ══════════════════════════════════════════════
// Yêu cầu đòi ảnh **gắn nhãn theo chủ đề** để bot chọn đúng lúc. Ảnh hiện có KHÔNG có chủ
// đề — nhãn thật đo được chỉ là «Ảnh sản phẩm» lặp lại, tức là một nhãn không phân biệt gì.
// Nên màn hiện đủ ảnh, nhưng khai thẳng: **phần «chọn đúng lúc» chưa làm được**, vì chưa có
// chủ đề để chọn theo. Hiện một thư viện đẹp rồi im chuyện đó là hứa một tính năng không có.
//
// ═══ MÀN CHỈ ĐỌC ══════════════════════════════════════════════════════════════════════
// Gắn nhãn chủ đề = ghi ngược vào Sheet hoặc dựng bảng mới ở v3. Cả hai đều chưa có cửa.
// Dựng một cửa ghi nửa vời ở đây là đẻ ra nguồn ảnh thứ hai, rồi hai nguồn lệch nhau.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Nhãn đo được là những chuỗi này — không phải chủ đề. Xem `chuDeDuoc`. */
export const NHAN_KHONG_PHAI_CHU_DE = Object.freeze([
  'ảnh sản phẩm', 'anh san pham', 'ảnh', 'anh', 'image', 'photo', '',
]);

export class LoiAnh extends Error {
  constructor(thongDiep, ma = 'thu_vien_anh', status = 400) {
    super(thongDiep);
    this.name = 'LoiAnh';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docDanhSach = null;
let _docMotPage = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiAnh('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export function datDocKhoSanPham({ danhSach, motPage } = {}) {
  _docDanhSach = danhSach || null; _docMotPage = motPage || null;
  return { danhSach: _docDanhSach, motPage: _docMotPage };
}
export const daNoiAnh = () => typeof _taoTruyVan === 'function' && typeof _docDanhSach === 'function';

/** Có phải một nhãn CHỦ ĐỀ thật không, hay chỉ là chữ «ảnh» viết lại? */
export function laChuDe(nhan) {
  const s = String(nhan || '').trim().toLowerCase();
  if (!s) return false;
  return !NHAN_KHONG_PHAI_CHU_DE.includes(s);
}

const TOI_DA_PAGE = 40;

export async function manAnh(boiCanh, { trang = 0 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_taoTruyVan) throw new LoiAnh('chưa nối tầng truy vấn', 'chua_noi', 500);

  const cuaTeam = new Map(
    (await _taoTruyVan(bc).chon(BANG_PAGE, {}, { sapXep: 'ten' })).map((p) => [String(p.page_id), p]),
  );

  if (!_docDanhSach || !_docMotPage) {
    return {
      teamId: bc.teamId, anh: [], dem: demRong(), chuDe: null,
      trong: {
        rong: true, vi: 'chua-nap',
        noi: 'Chưa nối cầu sang tiến trình bot nên chưa đọc được ảnh.',
        diTiep: 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` rồi khởi động lại v3.',
      },
    };
  }

  let toanHe;
  try {
    toanHe = await _docDanhSach();
  } catch (e) {
    throw new LoiAnh(
      `Không đọc được kho ảnh từ tiến trình bot: ${e?.message || e}. Màn TỪ CHỐI đoán — một `
      + 'thư viện rỗng ở đây trông y như «team này chưa có ảnh nào».', 'cau_hong', 502,
    );
  }

  const coSp = toanHe.filter((p) => cuaTeam.has(p.pageId) && p.soSanPham > 0);
  const tongPageCoSp = coSp.length;

  // ĐỌC THEO TRANG. Mỗi page là một lời gọi HTTP sang tiến trình bot; đọc cả 69 page trong
  // một lượt tải là bắt người dùng chờ ~7 giây và bắt bot làm 69 việc cho một cú bấm.
  const batDau = Math.max(0, Number(trang) || 0) * TOI_DA_PAGE;
  const lat = coSp.slice(batDau, batDau + TOI_DA_PAGE);

  const anh = [];
  for (const p of lat) {
    let d;
    try {
      d = await _docMotPage(p.pageId);
    } catch {
      // Một page hỏng KHÔNG được làm hỏng cả thư viện — ghi lại và đi tiếp.
      anh.push({ hong: true, pageId: p.pageId, tenPage: p.ten });
      continue;
    }
    for (const s of (d.sanPham || [])) {
      for (const a of (s.anh || [])) {
        anh.push({
          hong: false,
          duong: a.duong,
          nhan: a.nhan || '',
          laChuDe: laChuDe(a.nhan),
          pageId: p.pageId,
          tenPage: d.tenPage || p.ten,
          maSp: s.ma,
          tenSp: s.ten || '',
          thieuTenSp: !s.ten,
        });
      }
    }
  }

  const that = anh.filter((a) => !a.hong);
  const nhan = {};
  for (const a of that) {
    const k = a.nhan.trim() || '(không nhãn)';
    nhan[k] = (nhan[k] || 0) + 1;
  }

  return {
    teamId: bc.teamId,
    anh: that,
    hong: anh.filter((a) => a.hong),
    dem: {
      anh: that.length,
      pageDaDoc: lat.length,
      pageCoSanPham: tongPageCoSp,
      coChuDe: that.filter((a) => a.laChuDe).length,
      khongChuDe: that.filter((a) => !a.laChuDe).length,
    },
    nhanDaDung: Object.entries(nhan).sort((a, b) => b[1] - a[1]).map(([ten, so]) => ({ ten, so })),
    chuDe: chuDeDuoc(that),
    trang: { hienTai: Math.floor(batDau / TOI_DA_PAGE), moiTrang: TOI_DA_PAGE, tong: tongPageCoSp },
    trong: that.length ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Không page nào của team có ảnh sản phẩm.',
      diTiep: 'Ảnh đi kèm sản phẩm trong Google Sheet của page. Page chưa có sản phẩm thì cũng '
        + 'chưa có ảnh — xem màn Sản phẩm & kho.',
    },
  };
}

const demRong = () => ({ anh: 0, pageDaDoc: 0, pageCoSanPham: 0, coChuDe: 0, khongChuDe: 0 });

/**
 * «Bot chọn đúng lúc» làm được chưa? — trả lời bằng số, không bằng cảm tính.
 *
 * Làm được khi có ít nhất hai chủ đề KHÁC NHAU để chọn giữa. Toàn bộ ảnh mang cùng một
 * nhãn «Ảnh sản phẩm» thì không có gì để chọn, và màn phải nói ra thay vì trưng một thư
 * viện đẹp rồi để người ta tưởng tính năng đã có.
 */
function chuDeDuoc(anh) {
  const bo = new Set(anh.filter((a) => a.laChuDe).map((a) => a.nhan.trim().toLowerCase()));
  const duoc = bo.size >= 2;
  return {
    duoc,
    soChuDe: bo.size,
    ds: [...bo].slice(0, 20),
    noi: duoc
      ? `Có ${bo.size} chủ đề khác nhau — bot chọn được ảnh theo ngữ cảnh.`
      : 'Ảnh CHƯA gắn chủ đề. Nhãn hiện có chỉ là chữ «Ảnh sản phẩm» lặp lại, không phân '
        + 'biệt được ảnh nào dùng lúc nào ⇒ phần «bot chọn đúng lúc» của yêu cầu **chưa làm '
        + 'được**, dù ảnh thì đã có đủ.',
    diTiep: duoc ? null
      : 'Cần gắn nhãn chủ đề cho ảnh (ví dụ: ảnh mặt trước · ảnh đang dùng · ảnh so sánh · '
        + 'ảnh giấy chứng nhận). Chỗ gắn nhãn là Google Sheet của page — v3 chưa có cửa ghi '
        + 'sang đó, nên đây là việc người làm, không phải việc màn này.',
  };
}
