// TẦNG GHI CỦA «SẢN PHẨM GỐC» trên màn «Sản phẩm & kho».
//
// Bảng `san_pham_goc` (014) là danh mục do NGƯỜI định nghĩa — máy cố ý không tự tạo (xem
// `src/pos/doc-danh-muc.js`: 113 biến thể không số hiệu sẽ đẻ 113 dòng rác). Nhưng trước
// lượt này người cũng không tạo được bằng giao diện: nơi duy nhất sinh ra dòng là một
// script chỉ IN câu SQL đề nghị. Tức luật «của người» trên thực tế là «của người CÓ SSH».
//
// Ba việc của tầng này, đúng khuôn các màn khác: kiểm VAI, gọi tầng A, GHI NHẬT KÝ.
// Tầng A (`src/products/san-pham-goc.js`) giữ luật dữ liệu — mã gốc cấm dấu ":", số hiệu
// 1–4 chữ số, và không cho bỏ một sản phẩm gốc còn chỗ trỏ tới.
import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { HANH_DONG, moTa as moTaHanhDong } from '../../audit/hanh-dong.js';
import { LoiSanPham } from './kho-san-pham.js';
import { botGhepTuDuLieu } from '../prompt-page/kho-prompt.js';

/**
 * CHỈ `quan-tri`. Đặt tên sản phẩm là đổi thứ bot gọi trước mặt khách, và mã gốc là khoá
 * mà kịch bản trỏ tới. Bản đầu tôi cho cả `quan-ly` sửa — sai luật đã ký của §9: «quản lý
 * đi kiểm, không đi làm», và lưới `phan-quyen-nam-vai` bắt đỏ ngay.
 */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);
export const BANG = 'san_pham_goc';

let _cua = null;
let _pheuNhatKy = null;

/** Nhận bộ năm hàm của tầng A. Thiếu một là từ chối cả cụm — nửa cửa khó hiểu hơn không cửa. */
export function datKhoGoc(cua) {
  if (cua == null) { _cua = null; return null; }
  // LL13: + `chiTiet` · `monChuaGan` · `gan` · `go` — sản phẩm là lõi (thị trường = shop POS).
  // LL11: + `kienThuc` — sửa kiến thức sản phẩm (nhà mới của kỹ năng).
  // VE8a: + `goiYGop` · `gop` — gộp món POS thành sản phẩm (bản vẽ 2a′).
  const thieu = ['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop']
    .filter((k) => typeof cua[k] !== 'function');
  if (thieu.length) throw new LoiSanPham(`datKhoGoc thiếu hàm: ${thieu.join(', ')}`, 'noi_day_thieu', 500);
  _cua = cua;
  return _cua;
}
export const daNoiKhoGoc = () => _cua != null;

export function datPheuNhatKyGoc(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datPheuNhatKyGoc cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

/**
 * VE1 · 29/09: tab «Lịch sử» của một sản phẩm (bản vẽ 2a). Đường ĐỌC nhật ký tiêm vào như phễu ghi — tầng giao diện
 * không import `audit/index.js` (luật nối dây ở `vai-b.js`).
 */
let _docNhatKy = null;
export function datDocNhatKyGoc(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datDocNhatKyGoc cần một hàm');
  _docNhatKy = fn || null;
  return _docNhatKy;
}

/** Nhật ký của MỘT sản phẩm gốc, mới nhất trước. Chưa nối ⇒ ném 500: trả rỗng trông y hệt «chưa ai sửa gì». */
export async function lichSuGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docNhatKy) {
    throw new LoiSanPham('máy chủ chưa nối đường đọc nhật ký — KHÔNG phải «chưa ai sửa gì».', 'chua_noi', 500);
  }
  const { dong } = await _docNhatKy(bc, { doiTuongLoai: BANG, doiTuongId: String(id), gioiHan: 50 });
  return (dong || []).map((r) => {
    const tn = String(r.tac_nhan || '');
    return {
      luc: r.xay_ra_luc,
      ai: tn.startsWith('nguoi:') ? tn.slice(6) : tn.startsWith('may:') ? 'máy · ' + tn.slice(4) : tn,
      hanhDong: r.hanh_dong, moTa: moTaHanhDong(r.hanh_dong), ghiChu: r.ghi_chu || '',
    };
  });
}

function cua() {
  if (!_cua) {
    throw new LoiSanPham(
      'máy chủ chưa nối kho sản phẩm gốc — lỗi dựng ứng dụng, KHÔNG phải «chưa có sản phẩm nào».',
      'chua_noi', 500,
    );
  }
  return _cua;
}

/** Ghi nhật ký CÓ NÉM: đổi danh mục sản phẩm mà không truy ngược được thì không nên xảy ra. */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiSanPham('chưa nối phễu nhật ký — từ chối sửa danh mục sản phẩm gốc', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/** Màn đọc: danh sách + những số hiệu POS đang chờ người đặt tên. */
export async function manSanPhamGoc(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const [ds, cho, gia] = await Promise.all([cua().ds(bc), cua().cho(bc), cua().dem(bc)]);
  return {
    goc: ds,
    // Giá KHÔNG về theo lượt kéo danh mục (POS trả `retail_price = 0`), nên màn phải nói
    // thẳng còn bao nhiêu món chưa có giá — im lặng ở đây là để bot cầm một kho hàng mà
    // không biết bán bao nhiêu.
    gia,
    // Việc đang chờ NGƯỜI. Đây là con số mà mỗi lượt «Kéo danh mục» in ra rồi bỏ đó.
    cho: cho.cho,
    khongCoSoHieu: cho.khongCoSoHieu,
    suaDuoc: bc.vai.some((v) => VAI_SUA_DUOC.includes(v)),
  };
}

export async function taoGoc(boiCanh, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().tao(bc, than);
  await ghi(bc, {
    hanhDong: HANH_DONG.TAO_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, soHieu: kq.soHieu },
    ghiChu: `tạo sản phẩm gốc "${kq.maGoc}"${kq.soHieu ? ` (số hiệu ${kq.soHieu})` : ' — chưa gán số hiệu'}`,
  });
  return kq;
}

export async function suaGoc(boiCanh, id, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().sua(bc, id, than);
  await ghi(bc, {
    hanhDong: HANH_DONG.SUA_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, soHieu: kq.soHieu, sku: kq.sku, marketer: kq.marketer },
    ghiChu: `sửa sản phẩm gốc "${kq.maGoc}" (${Object.keys(than || {}).join(', ') || 'không đổi gì'})`,
  });
  return kq;
}

export async function boGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().bo(bc, id);
  await ghi(bc, {
    hanhDong: HANH_DONG.BO_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    truoc: { maGoc: kq.maGoc, ten: kq.ten },
    ghiChu: `bỏ sản phẩm gốc "${kq.maGoc}"`,
  });
  return kq;
}

/* ═══ LL13 · SẢN PHẨM LÀ LÕI (CR-28-09c) — thị trường · món POS · page đang bán ═══ */

/** Một sản phẩm gốc + chỗ chọn món để «Thêm thị trường». Đọc: cùng vai với màn. */
export async function chiTietGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const [goc, monChuaGan] = await Promise.all([cua().chiTiet(bc, id), cua().monChuaGan(bc)]);
  if (!goc) return null;
  // `botDocKienThuc`: kiến thức ở tab Chung chỉ tới bot khi máy chủ ghép lời từ dữ liệu v3 (`V3_RAP_PROMPT_BAT`).
  // Vắng ⇒ bot vẫn ráp từ kho cũ theo page — màn phải nói ra, không hứa «mọi page dùng ngay» (VE1b).
  return { goc, monChuaGan, suaDuoc: bc.vai.some((v) => VAI_SUA_DUOC.includes(v)),
    suaKienThuc: bc.vai.some((v) => VAI_SUA_KIEN_THUC.includes(v)), botDocKienThuc: botGhepTuDuLieu() };
}

/** Gắn một món POS vào sản phẩm gốc — thêm thị trường (shop mới) hoặc thêm biến thể. Quản trị, có nhật ký. */
export async function ganMonPos(boiCanh, id, posMa) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().gan(bc, id, posMa);
  await ghi(bc, {
    hanhDong: HANH_DONG.GAN_MON_POS_GOC, doiTuongLoai: BANG, doiTuongId: String(id),
    sau: { maGoc: kq.maGoc, posMa: kq.posMa, shopId: kq.shopId },
    ghiChu: `gắn món POS ${kq.posMa} (shop ${kq.shopId}) vào sản phẩm "${kq.maGoc}"${kq.daCo ? ' — đã gắn từ trước' : ''}`,
  });
  return kq;
}

/** Gỡ một món POS khỏi sản phẩm gốc. Quản trị, có nhật ký. */
export async function goMonPos(boiCanh, id, posMa) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().go(bc, id, posMa);
  await ghi(bc, {
    hanhDong: HANH_DONG.GO_MON_POS_GOC, doiTuongLoai: BANG, doiTuongId: String(id),
    truoc: { maGoc: kq.maGoc, posMa: kq.posMa, shopId: kq.shopId },
    ghiChu: `gỡ món POS ${kq.posMa} (shop ${kq.shopId}) khỏi sản phẩm "${kq.maGoc}"`,
  });
  return kq;
}

/* ═══ VE8a · GỘP MÓN POS THÀNH SẢN PHẨM (bản vẽ 2a′) — máy gợi ý nhóm, NGƯỜI xác nhận ═══ */

/** Gợi ý gộp + số đầu màn. Đọc: mọi vai của màn; `suaDuoc` nói màn có vẽ ô chọn/nút không. */
export async function goiYGop(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const kq = await cua().goiYGop(bc);
  return { ...kq, suaDuoc: bc.vai.some((v) => VAI_SUA_DUOC.includes(v)) };
}

/** Gộp: MỘT sản phẩm gốc + gắn các món đã chọn (một giao dịch ở tầng A). Quản trị; MỘT dòng nhật ký kể đủ món. */
export async function gopMonThanhGoc(boiCanh, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().gop(bc, than);
  const ds = kq.posMa || [];
  await ghi(bc, {
    hanhDong: HANH_DONG.TAO_SAN_PHAM_GOC, doiTuongLoai: BANG, doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, sku: kq.sku, marketer: kq.marketer, posMa: ds },
    ghiChu: `gộp ${ds.length} món POS thành sản phẩm gốc "${kq.maGoc}"${kq.sku ? ` (SKU ${kq.sku})` : ''}`
      + `${kq.marketer ? ` · marketer ${kq.marketer}` : ''}: `
      + `${ds.slice(0, 12).join(', ')}${ds.length > 12 ? '…' : ''}`,
  });
  return kq;
}

/* ═══ LL11 · KIẾN THỨC SẢN PHẨM — nhà mới của kỹ năng ═══ */

/**
 * Ai SỬA kiến thức: quản trị + MARKETER. Khác `VAI_SUA_DUOC` (tên · mã gốc — quản trị): kiến thức là lời tư vấn
 * marketer viết cho sản phẩm mình phụ trách (01 §6 · §9 «kịch bản do người viết áp dụng thẳng»), đúng chỗ màn
 * kỹ năng cũ cho marketer bật.
 */
export const VAI_SUA_KIEN_THUC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);

export async function suaKienThucGoc(boiCanh, id, kienThuc) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_KIEN_THUC);
  const kq = await cua().kienThuc(bc, id, kienThuc);
  await ghi(bc, {
    hanhDong: HANH_DONG.SUA_KIEN_THUC_SAN_PHAM, doiTuongLoai: BANG, doiTuongId: String(id),
    truoc: kq.truoc || {}, sau: kq.kienThuc,
    ghiChu: `sửa kiến thức sản phẩm "${kq.maGoc}" (${Object.keys(kq.kienThuc || {}).join(', ') || 'để trống'})`,
  });
  return kq;
}
