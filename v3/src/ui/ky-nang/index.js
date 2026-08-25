// CỬA RA VÀO CỦA MÀN «THƯ VIỆN KỸ NĂNG» (G2-C2 · sóng 1).
//
// Tầng CÒN THIẾU giữa bộ luật chung và kịch bản page. Vì sao đáng tiền, bằng số thật của
// `01-QUYET-DINH.md` §6: hai sản phẩm CÓ SIZE hoàn 26,8% và 19,2%, sản phẩm không size hoàn
// 9,3% — và cả hai đều chưa bật kỹ năng hỏi size.
//
// BA TRẠNG THÁI RẤT DỄ NHẦM (hợp đồng của `rap-prompt.js#docKyNang`, không phải màn này đặt):
//   `bat=false` → TẮT · `bat=true` + nhóm RỖNG → CẢ TEAM · `bat=true` + nhóm → chỉ SP đó.
export {
  manKyNang, batTatKyNang, datNhomSanPham, canhBaoKyNang, phamViCua, uocToken,
  datTaoTruyVan, datPheuNhatKy, daNoiTruyVanKyNang,
  BANG, PHAM_VI, CHU_PHAM_VI, VAI_SUA_DUOC as VAI_SUA_KY_NANG,
  HANH_DONG_BAT_TAT, HANH_DONG_DAT_NHOM, LoiKyNang,
} from './kho-ky-nang.js';

export {
  taoRouterKyNang, datChanDangNhap, datChanVai, daNoiChanKyNang,
  VAI_VAO_DUOC, VAI_SUA_DUOC, DUONG_TRANG,
} from './router.js';
