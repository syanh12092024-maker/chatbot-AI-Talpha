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
  const thieu = ['ds', 'cho', 'dem', 'tao', 'sua', 'bo'].filter((k) => typeof cua[k] !== 'function');
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
