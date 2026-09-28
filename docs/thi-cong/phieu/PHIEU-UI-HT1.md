# PHIẾU UI-HT1 — Cửa đọc hội thoại cho bàn hội thoại (chỉ đọc Pancake)

**Base:** `3106700` · **Làn:** 🟨 (đọc dữ liệu khách thật từ Pancake — chỉ GET, không đụng van gửi)
**Nguồn:** CR-28-09 (`docs/thi-cong/doi-y-do/CR-28-09-ban-hoi-thoai-chi-doc.md`), §10 mới.
**Đụng bộ não:** không.

## ① Vì sao

Đo 28/09 trên máy chủ: 28.953 hội thoại trong CSDL v3, **0** hội thoại có mã Pancake trong
`tin_cho_xu_ly` (chưa tin nào đi qua v3). Cửa đọc hiện có (`GET /api/van-hanh/conversations/:id`)
chỉ lấy mã từ bảng đó ⇒ khung chat của bàn hội thoại sẽ trống với MỌI hội thoại.

## ② Làm gì

1. **Mã hội thoại Pancake** = `<page_id>_<psid>` — đúng khuôn bot cũ đang dùng
   (`src/admin.js:289`: `psid = g.conv.split('_')[1]`). Dựng từ `page.page_id` + `hoi_thoai.psid`.
2. **Mã khách Pancake** (`customer_id` của `pkGetMessages`), thứ tự nguồn:
   `tin_cho_xu_ly.cust_id` → Sổ AI của bot cũ (`ai-messages.jsonl`, trường `cust`) → gọi Pancake
   không kèm `customer_id` (đo trước xem Pancake có nhận không — ghi kết quả vào nhật ký phiếu).
3. Cửa mới `GET /api/ban-hoi-thoai/:id` (chắn đăng nhập + chắn team như dispatch): trả
   `{ lichSu, lichSuLoi, nguonMa }`. Không đọc được thì `lichSuLoi` NÓI VÌ SAO — không trả mảng rỗng
   giả làm «hội thoại chưa có tin».
4. **Nhớ 60 giây** theo mã hội thoại, một lượt bay cho nhiều người cùng mở (khuôn `sanSangToanHe`
   của `noi-day/cau-bot-v1.js`). 20 sale mở cùng một hội thoại ≠ 20 lượt gọi Pancake.

## ③ Không làm

Không lưu tin vào CSDL (không bản sao). Không POST/PUT tới Pancake. Không đụng `src/pancake.js`
ngoài việc gọi `pkGetMessages`. Không đụng van gửi.

## ④ Nghiệm thu

- Bộ ca: dựng mã đúng khuôn; thứ tự nguồn `customer_id`; nhớ 60s (hai lượt gọi liền = một lượt
  Pancake); lỗi Pancake ⇒ `lichSuLoi` có chữ, `lichSu` rỗng; chặn xuyên team trả 404.
- Đảo-vá: bỏ bước dựng mã ⇒ ca «hội thoại chưa qua v3 vẫn đọc được» phải đỏ.
- Đo máy chủ (chỉ đọc): mở 3 hội thoại thật ở 3 page ⇒ đếm số hội thoại đọc được / lý do lỗi.
