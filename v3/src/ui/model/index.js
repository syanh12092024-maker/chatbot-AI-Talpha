// CỬA RA VÀO CỦA MÀN «MODEL AI & KHOÁ» (G2-B3 · màn cuối của sóng 0).
//
// Gỡ chặn H6: hôm nay nhập khoá bốn nhà phải sửa `.env` rồi khởi động lại.
//
// HAI THỨ MÀN NÀY PHẢI LÀM ĐƯỢC, cả hai đều đã trả giá bằng sự cố thật:
//   ① đổi model → lượt chat kế tiếp đi model mới, KHÔNG khởi động lại (lớp model lo sẵn)
//   ② thấy SẮP gãy TRƯỚC khi gãy — 06/08 bot chết 3 tiếng, 23/08 chết 731 phút vì hết tiền
//
// KHOÁ VÀO ĐƯỢC, KHÔNG RA ĐƯỢC. Không có đường nào của module này trả khoá ra ngoài; tóm tắt
// chỉ mang `{ daCo, tuEnv }`. Có bài test khoá lại.
//
// Nối vào ứng dụng bằng `dungPhanB()`.

export {
  manModel, luuCauHinh, bangGia,
  TEN_NHA, TEN_VAI_TRO, GIAI_THICH_VAI_TRO, TIN_MOI_DON, HANH_DONG_DOI,
  LoiCauHinh,
} from './kho-model.js';

export {
  taoRouterModel, datChanDangNhap, datChanVai, daNoiChanModel,
  VAI_VAO_DUOC, VAI_SUA_DUOC, DUONG_TRANG,
} from './router.js';
