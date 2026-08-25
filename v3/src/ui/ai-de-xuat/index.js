// CỬA RA VÀO CỦA MÀN «AI ĐỀ XUẤT» (G2-F8 · sóng 4).
//
// Màn này giữ NỬA SAU của tiêu chí nghiệm thu «hai đường khác nhau»:
//   · người viết → `/api/bo-luat/nhap`  ghi cứng `nguon='nguoi'` → áp thẳng
//   · AI đề xuất → `/api/ai-de-xuat`     ghi cứng `nguon='ai'`    → phải duyệt mới áp được
// Hai cửa HTTP tách hẳn, mỗi cửa một hằng số. Không cửa nào nhận `nguon` từ trình duyệt.

export {
  manDeXuat, nhanDeXuat, duyetDeXuat,
  datDocBoLuat, datCuaBoLuat, daNoiDeXuat,
  TANG, TEN_TANG, TANG_NHAN_DUOC, DAI_TOI_THIEU, LoiDeXuat,
} from './kho-de-xuat.js';

export {
  taoRouterDeXuat, datChanDangNhap, datChanVai, daNoiChanDeXuat,
  VAI_VAO_DUOC, VAI_SUA_DUOC, DUONG_TRANG,
} from './router.js';
