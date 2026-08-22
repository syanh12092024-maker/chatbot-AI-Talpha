// Lỗi CÓ TÊN của CỬA Pancake WhatsApp v3 (PHIẾU L1-M3 ②) — bắt bằng `err.name` hoặc
// `instanceof`, cùng khuôn `src/channels/messenger/loi.js` (L1-M2) + `src/pos/api.js`
// (`coPhanHoi`, L1-M1). Đây là bộ lỗi RIÊNG của cửa WhatsApp — KHÔNG tái dùng
// `LoiPageKhongThuocTeam` của Messenger vì thực thể sở hữu team ở đây là `don_hang`,
// không phải `page` (Cloud API không đi qua khái niệm Facebook Page).
//
//   LoiDonKhongThuocTeam — don_hang.id không tồn tại, HOẶC tồn tại nhưng thuộc team
//     KHÁC ctx.teamId. Ghi 1 dòng nhat_ky khi ctx là NGƯỜI (có team để mà ghi); KHÔNG
//     ghi khi ctx là hệ-thống (ctxHeThong — chưa có team nào để gắn vào dòng nhat_ky) —
//     giống hệt lý do LoiPageKhongThuocTeam của cửa Messenger không ghi trong ca đó.
//
//   LoiSaiNguonDon — don_hang.nguon KHÁC 'trang_ban_hang' (01 §1: chỉ luồng trang bán
//     hàng cần WhatsApp xác nhận; luồng messenger khách đã xác nhận trong chat rồi).
//     Máy trạng thái L3-M1 dựa vào rào này để không hỏi lại khách luồng messenger.
//
//   LoiMauChuaDuyet — tenMau không có trong bảng mẫu ĐÃ DUYỆT (`da_duyet:true`,
//     src/channels/whatsapp/mau-tin.js). Cloud API WhatsApp bắt buộc: tin doanh nghiệp
//     CHỦ ĐỘNG gửi phải dùng mẫu Meta đã duyệt (01 §4/§5) — không có đường "gửi tạm".
//
//   LoiCuaGuiDong — guard tại cửa (N1) chặn `guiTinMau`: vắng `V3_WA_GUI`, hoặc
//     `PANCAKE_READONLY==='1'`, hoặc cả hai. VẮNG BIẾN = ĐÓNG (fail-closed đúng chiều —
//     sổ điều hành §0a luật 1). Dùng CHUNG biến `PANCAKE_READONLY` với cửa Messenger —
//     đây là MỘT van an toàn duy nhất cho mọi đường gửi-ra-Pancake của máy này.
//
//   LoiChuaCoEndpoint — bản cài THẬT của adapter gửi (src/channels/whatsapp/adapter.js)
//     chưa được cắm (điểm kiểm H1, §7b T1 sổ điều hành CHƯA chạy — 01-QUYET-DINH §4:
//     "gửi bằng API thì cần thử một lần thật"). KHÔNG phải lỗi mạng: đây là quyết định
//     CỤC BỘ, đã BIẾT chắc trước khi gọi — nên `coPhanHoi` LUÔN `true` (khác
//     `LoiPosKhongTraLoi` của L1-M1 vốn mặc định `false` vì có thể mất tín hiệu mạng
//     thật). Nhật ký hai pha ghi pha 2 bình thường cho lỗi này, không để mồ côi.
export class LoiDonKhongThuocTeam extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiDonKhongThuocTeam";
  }
}

export class LoiSaiNguonDon extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiSaiNguonDon";
  }
}

export class LoiMauChuaDuyet extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiMauChuaDuyet";
  }
}

export class LoiCuaGuiDong extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiCuaGuiDong";
  }
}

export class LoiChuaCoEndpoint extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiChuaCoEndpoint";
    this.coPhanHoi = true; // kết cục ĐÃ BIẾT (chắc chắn không gửi) — xem ghi chú đầu file.
  }
}
