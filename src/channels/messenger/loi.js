// Lỗi CÓ TÊN của CỬA Pancake Messenger v3 (PHIẾU L1-M2 ②) — bắt bằng `err.name` hoặc
// `instanceof`, cùng khuôn với `src/db/loi.js` (LoiThieuBoiCanhTeam/LoiXuyenTeam), nhưng
// đây là BỐN lỗi RIÊNG của tầng CỬA (channel; GL3b thêm `LoiDocLichSu`), không phải của tầng truy vấn — dù bên dưới
// có tái dùng layNhieu/ghiNhatKy để thi hành.
//
//   LoiPageKhongThuocTeam — page_id (Facebook) không tồn tại trong bảng `page`, HOẶC tồn
//     tại nhưng thuộc team KHÁC ctx.teamId. Ghi 1 dòng nhat_ky khi ctx là NGƯỜI (có team
//     để mà ghi); KHÔNG ghi khi ctx là hệ-thống (ctxHeThong — N3) và page không tồn tại,
//     vì lúc đó chưa có team nào để gắn vào dòng nhat_ky — giống lý do LoiThieuBoiCanhTeam
//     của tầng truy vấn không ghi nhat_ky khi ctx chưa hợp lệ.
//
//   LoiHoiThoaiKhongThuocPage — psid không khớp dòng `hoi_thoai` nào của page_id đã xác
//     định (N5 — tra UNIQUE(page_id,psid)). ⚠️ Đây là kiểm tra chéo bằng `psid` (Facebook
//     Page-Scoped ID của khách), KHÔNG PHẢI so `convId` của Pancake — hai giá trị này
//     KHÁC NHAU trong dữ liệu thật (xem ghi chú đầu `index.js`). Bắt xuyên-page ở TẦNG DỮ
//     LIỆU của ta, trước khi convId (đục, không kiểm được ở phía ta) được dùng để gọi
//     xuống Pancake.
//
//   LoiCuaGuiDong — guard tại cửa (N1) chặn nhóm hàm GỬI/GHI (`guiTin`,`guiAnh`,`ghiNote`,
//     `gatThe`): vắng `V3_PANCAKE_GUI`, hoặc `PANCAKE_READONLY==='1'`, hoặc cả hai. VẮNG
//     BIẾN = ĐÓNG (fail-closed đúng chiều — sổ điều hành §0a luật 1).
//
//   LoiDocLichSu — (PHIẾU GL3b) `docTin` KHÔNG đọc được lịch sử từ Pancake: quá hạn, HTTP 5xx /
//     thân không phải JSON, lỗi mạng, lỗi quyền ở mọi token, thân không có danh sách tin, hết
//     token. Trước GL3b cửa trả `[]` cho mọi trường hợp đó ⇒ worker coi là «lịch sử rỗng» ⇒ bỏ
//     qua cửa nhường page ⇒ trả lời MÙ đè sale/Botcake; bộ nạp ghi mốc ⇒ tin khách không bao giờ
//     vào hàng. «Rỗng thật» (Pancake trả `messages: []`) KHÔNG phải lỗi này. Thông điệp mang câu
//     lỗi đọc được (`pancake.js#pkDocTin`), không chứa token.
export class LoiPageKhongThuocTeam extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiPageKhongThuocTeam";
  }
}

export class LoiHoiThoaiKhongThuocPage extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiHoiThoaiKhongThuocPage";
  }
}

export class LoiCuaGuiDong extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiCuaGuiDong";
  }
}

export class LoiDocLichSu extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiDocLichSu";
  }
}
