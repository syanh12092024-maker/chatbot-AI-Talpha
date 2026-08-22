// Hai lỗi CÓ TÊN của tầng truy vấn v3 (PHIẾU L0-M2 ②) — bắt bằng `err.name` (hoặc
// `err instanceof LoiXuyenTeam`). Vì sao HAI lỗi riêng, không dùng chung một cái:
//
//   LoiThieuBoiCanhTeam — ctx VẮNG MẶT hoặc TRỎ SAI (rỗng, team không tồn tại, hoặc
//     team KỸ THUẬT `chua-phan`). Đây là lỗi GỌI SAI — chưa có bối cảnh nào hợp lệ để
//     mà kiểm tra chuyện xuyên team, nên không ghi nhat_ky (ghi vào team nào?).
//
//   LoiXuyenTeam — ctx HỢP LỆ, nhưng caller cố truyền tay `team_id` KHÁC ctx.teamId
//     trong tham số/filter. Đây là hành vi CỐ Ý vượt rào, không phải gọi sai — nó CÓ
//     ghi một dòng nhat_ky (xem src/db/truy-van.js), LoiThieuBoiCanhTeam thì không.
//
// Cấm trả mảng/undefined rỗng cho cả hai trường hợp: rỗng trông như "không có dữ liệu"
// trong khi sự thật là "sai cách gọi" hoặc "bị chặn" — 06-PROMPT-GIAO-VIEC §"LỚP TEAM".

export class LoiThieuBoiCanhTeam extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiThieuBoiCanhTeam";
  }
}

export class LoiXuyenTeam extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiXuyenTeam";
  }
}
