// CỬA RA VÀO CỦA MÀN «KẾT NỐI & TOKEN» (G2-B4 · sóng 0 giai đoạn 2).
//
// Gỡ chặn: «token chết phải sửa `.env` rồi khởi động lại».
//
// MÀN NÀY MỎNG CÓ CHỦ Ý. Kho token đã chạy đúng trong tiến trình bot (`src/pancake.js`) —
// kể cả phần khó nhất là thêm token mà KHÔNG phải khởi động lại. v3 không viết lại nó; v3
// bọc quanh nó hai thứ dashboard cũ không có: **lớp vai** và **nhật ký**.
//
// ⚠️ TOÀN HỆ, KHÔNG THEO TEAM. Kho token dùng chung cho cả ba team. Chỉ `quan-tri` vào được,
//    và màn nói thẳng điều đó bằng chữ (`LA_TOAN_HE`) — vì mọi màn khác của v3 đều theo team
//    nên người dùng có nếp nghĩ «cái tôi thấy là của team tôi», và ở đây nếp đó sai.
//
// Nối vào ứng dụng bằng `dungPhanB()`.

export {
  khoToken, ketNoiPosCua, datDocKetNoiPos, daNoiKetNoiPosKN,
  sucKhoeToken, canhBaoKhoToken, trangThaiCau, gocBot,
  LA_TOAN_HE, GIAI_THICH_THU_TU, NGUONG_SAP_HET_NGAY, LoiKetNoi,
} from './kho-ket-noi.js';

export {
  taoRouterKetNoi, datChanDangNhap, datChanVai, datPheuNhatKy, daNoiChanKetNoi,
  VAI_VAO_DUOC, DUONG_TRANG, HANH_DONG_THEM_TOKEN, HANH_DONG_BO_TOKEN,
} from './router.js';
