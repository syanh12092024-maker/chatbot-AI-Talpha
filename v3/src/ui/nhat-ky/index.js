// CỬA RA VÀO CỦA MÀN «NHẬT KÝ THAO TÁC» (G2-E5 · sóng 3).
//
// Mỏng nhất sóng 3: `v3/src/audit/index.js#docNhatKy` (L0-M4) đã lo trọn phần khó.
//
// VIỆC RIÊNG CỦA MÀN: tách «việc người làm» khỏi «việc máy đọc», và mặc định mở ở làn NGƯỜI.
// Đo 25/08: 1.043/1.043 dòng là `doc` của tầng truy vấn — trộn chung thì mỗi dòng «ai bật bot
// cho page nào» bị chôn. Đây là chữa TRIỆU CHỨNG; thuốc thật là `PHIEU-B-Y5`.
export {
  manNhatKy, canhBaoNhatKy, lanCua, datDocNhatKy, datDanhMuc, daNoiDocNhatKy,
  LAN, CHU_LAN, MOI_TRANG, LoiManNhatKy,
} from './kho-nhat-ky.js';

export {
  taoRouterNhatKy, datChanDangNhap, datChanVai, daNoiChanNhatKy,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
