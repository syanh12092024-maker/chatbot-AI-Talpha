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
import { HANH_DONG } from '../../audit/hanh-dong.js';
import { LoiSanPham } from './kho-san-pham.js';

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
  const thieu = ['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc'].filter((k) => typeof cua[k] !== 'function');
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
    sau: { maGoc: kq.maGoc, ten: kq.ten, soHieu: kq.soHieu },
    ghiChu: `sửa sản phẩm gốc "${kq.maGoc}"`,
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
  return { goc, monChuaGan, suaDuoc: bc.vai.some((v) => VAI_SUA_DUOC.includes(v)),
    suaKienThuc: bc.vai.some((v) => VAI_SUA_KIEN_THUC.includes(v)) };
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
