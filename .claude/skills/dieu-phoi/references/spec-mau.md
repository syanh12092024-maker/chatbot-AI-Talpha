# Khuôn spec một module

Chép khuôn này cho mỗi module. Thiếu mục nào là spec hỏng — agent sẽ tự đoán, và nó đoán theo hướng dễ code chứ không theo hướng đúng nghiệp vụ.

---

```markdown
# [L?-M?] Tên module

## Việc cần làm
Một đoạn, nói rõ module này làm gì và KHÔNG làm gì.
Phần "không làm" quan trọng ngang phần "làm" — nó chặn agent lan sang việc của người khác.

## Bối cảnh
- Luồng: L? — tên luồng
- Phụ thuộc: module nào phải xong trước
- Chạy song song được với: module nào

## File được đụng
- `src/...` — sửa gì
- `src/...` — tạo mới

## File CẤM đụng
- `src/...` — đang có module khác làm
- `src/prompts.js` — bộ luật chung, chỉ đổi khi có quyết định riêng
- mọi file ngoài danh sách trên

## Bảng dữ liệu
- Đọc: `bang_a`, `bang_b`
- Ghi: `bang_c`
- Điều kiện team: có / không — nếu có thì ghi rõ chèn ở đâu

## Code cũ dùng lại
- `src/xxx.js` — dùng nguyên, KHÔNG viết lại
- `src/yyy.js` — dùng hàm `abc()`, đừng chép lại logic

## Tiêu chí xong — phải đo được
1. ...
2. ...
3. `npm test` xanh
4. Thử truy vấn xuyên team → bị chặn  (chỉ khi module đụng dữ liệu)

## Không nằm trong phạm vi
- ...
- ...
```

---

## Cắt module thế nào cho đúng

**Cắt theo ranh giới file.** Hai module không được sửa chung một file. Nếu buộc phải sửa chung, gộp thành một module hoặc làm tuần tự.

**Cắt theo ranh giới dữ liệu.** Hai module cùng ghi một bảng thì phải tuần tự. Cùng đọc thì song song được.

**Kích thước:** một đến hai ngày công. To hơn thì cắt tiếp; nhỏ hơn thì gộp.

---

## Ví dụ — cắt L0 thành bốn module

| Module | Việc | File | Song song với |
|---|---|---|---|
| **L0-M1** | Lược đồ cơ sở dữ liệu + di trú | `db/schema.sql`, `db/migrate/*` | — (làm trước tiên) |
| **L0-M2** | Tầng truy vấn có chèn điều kiện team | `src/db/*.js` | — (chờ M1) |
| **L0-M3** | Đăng nhập, chọn team, hai vai | `src/auth/*.js`, màn đăng nhập | M4 |
| **L0-M4** | Nhật ký thao tác | `src/audit/*.js` | M3 |

M1 xong mới tới M2. M3 và M4 chạy song song sau khi M2 xong.

---

## Ví dụ spec hoàn chỉnh

```markdown
# [L0-M2] Tầng truy vấn có chèn điều kiện team

## Việc cần làm
Viết tầng truy vấn để mọi câu hỏi vào cơ sở dữ liệu đều tự động kèm điều kiện
`team_id = <team của người đang đăng nhập>`. Không có đường nào gọi thẳng xuống
cơ sở dữ liệu mà bỏ qua tầng này.

KHÔNG làm: giao diện, đăng nhập, nhật ký. Ba thứ đó là module khác.

## Bối cảnh
- Luồng: L0 — nền dữ liệu, team và đăng nhập
- Phụ thuộc: L0-M1 (lược đồ) phải xong trước
- Chạy song song được với: không có, đây là nút cổ chai của L0

## File được đụng
- `src/db/client.js` — tạo mới, kết nối và cấu hình
- `src/db/scoped.js` — tạo mới, tầng chèn điều kiện team
- `src/db/index.js` — tạo mới, xuất ra ngoài

## File CẤM đụng
- `db/schema.sql` — của L0-M1
- `src/auth/*` — của L0-M3
- mọi file trong `src/` của bản đang chạy

## Bảng dữ liệu
- Đọc: tất cả bảng có `team_id`
- Ghi: không trực tiếp
- Điều kiện team: **CÓ** — chèn ở tầng này, không để nơi gọi tự chèn

## Code cũ dùng lại
- Không có. Đây là phần mới hoàn toàn.

## Tiêu chí xong
1. Gọi truy vấn không kèm bối cảnh team → **ném lỗi**, không trả dữ liệu rỗng
2. Đăng nhập team A rồi hỏi bảng đơn hàng → chỉ ra đơn của team A
3. Truyền tay `team_id` của team B vào tham số → **bị chặn**, có ghi nhật ký
4. Có ít nhất một bài kiểm thử cho mỗi ca trên
5. `npm test` xanh

## Không nằm trong phạm vi
- Vai và quyền chi tiết (giai đoạn 2)
- Xem xuyên team cho vai quản trị (giai đoạn 2)
```
