# PHIẾU GD2 — TRANG MỘT PAGE, VÀ MỘT CÔNG TẮC

> Làm 25/09/2026 · làn 🟨 · đất B (`v3/src/ui/*`, `ops/bin/do-giao-dien.mjs`) ·
> chạm một dòng của `test/frontend-v3-e2e.test.js` (đổi lời gọi sang cửa duy nhất).
> Mở khoá nhờ **Q1 gật sáng nay** — trước đó không gộp được ba màn page vì chưa biết công
> tắc đọc nguồn nào. Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5, dòng GD2 + Phụ lục B.

## 1. Vì sao gộp

Ba màn hỏi **cùng một câu hỏi** bằng ba cách, và không màn nào trả lời trọn:

| Màn | Hỏi gì | Thiếu gì |
|---|---|---|
| Bắt đầu | page này còn thiếu gì để bật | phải chọn page ở một ô riêng |
| Công tắc từng page | bật/tắt, ai phụ trách | không nói điều kiện |
| Page còn thiếu gì | điều kiện của cả đội | không bật được, không sửa được |

Đo 22/09: **7 màn · 11 bước** để cài xong một page.

## 2. Làm được gì

**① Trang của MỘT page** — `/page/:id`, màn mới. Bốn khối:
- page này là gì (tên, id, thị trường, ngành, người phụ trách)
- **bot nào phụ trách** + nút giao sang bot mới / trả về bot cũ (khi cầu dao mở)
- **công tắc**, đọc nguồn thật; hai nguồn lệch nhau thì NÓI RA cả hai
- **còn thiếu gì để lên chạy**: từng điều kiện kèm việc phải làm và nút đi sửa
- bốn đường làm tiếp (sản phẩm · kịch bản · chạy thử · đoạn chữ gửi AI), mang sẵn page

**② Danh sách page** — `/page-bot` đổi tên thành «Tất cả page»; tên mỗi dòng là đường dẫn
sang trang của page. Thêm hai bộ lọc lấy từ cửa kiểm: **Còn điều kiện chặn** · **Đủ điều kiện**.

**③ Hai màn cũ chuyển hướng, KHÔNG xoá đường** (luật của kế hoạch):
`/bat-dau` → `/page-bot` · `/san-sang` → `/page-bot?loc=con_chan` · `/page` trần → `/page-bot`.
Menu bỏ hai dòng ấy: **19 → 17 màn hiện**.

**④ Còn ĐÚNG MỘT cửa ghi công tắc bot** — tiêu chí nghiệm thu của phiếu.
Trước lượt này có hai: `/api/page-bot/:id/bot` (có trần bật hàng loạt, hộp xác nhận, nhật ký
trước/sau) và `/api/van-hanh/pages/:id` (**không có cả ba**). Nay cửa thứ hai TỪ CHỐI `enabled`
và chỉ sang trang của page; nút trên màn «Hội thoại và đơn» thành một đường dẫn.

## 3. Ba chỗ dễ nói sai, đều có ca canh

1. **Chưa đọc được cửa kiểm ≠ page không thiếu gì.** Danh sách điều kiện rỗng trông y hệt
   «đủ điều kiện», mà một trong hai câu ấy dẫn người ta đi bật bot. ⇒ `san` chỉ đúng khi ĐO
   ĐƯỢC và hết chặn. Hai bộ lọc mới cũng thế: page chưa đo được **không lọt vào bên nào**.
2. **Mã điều kiện lạ không được nuốt.** Bên bot thêm một bậc thang mới mà bảng từ vựng chưa
   biết thì vẫn hiện ra, gắn nhãn «chưa có trong bảng từ».
3. **Câu «đi sửa ở đâu» của điều kiện «chưa giao cho bot mới» đổi theo cầu dao** (án lệ #27):
   cầu dao đóng → nhờ người quản trị hệ thống; cầu dao mở → bấm nút ngay trên màn.

## 4. Thước

- `v3/test/b/mot-page.test.mjs` **9/9** (mới). Đảo-vá: mở lại cửa ghi thứ hai → ca ⑤b đỏ ·
  bỏ vế «chưa đo được» khỏi `san` → hai ca đỏ.
- `v3/test/b/*` **843/843**. Ba thước cũ đỏ đúng lúc và được sửa theo hướng GIỮ:
  ①b (đường menu phải có màn thật) · ③ (mọi trang nhúng thanh điều hướng — bắt được lỗi
  thật: trang mới quên nhúng) · HK10 (tên đầu trang khớp tên menu, bắt lượt đổi tên).
- `test/frontend-v3-e2e.test.js` **8/8** trên PostgreSQL thật, sau khi đổi sang cửa duy nhất.
- `npm test` **2.026 ca · 2.022 xanh · 0 đỏ**.
- Trình duyệt thật: `/page/301` mở được, có thanh bên, 5 nút, **0 lỗi JS**;
  `/bat-dau` → 302 · `/san-sang` → 302 kèm bộ lọc · `/page` → 302.
- `ops/bin/do-giao-dien.mjs`: **24 màn đo được** (+1 đường chuyển hướng) · **0 màn vỡ** ·
  0 mã kỹ thuật · **17 hộp cảnh báo** · chữ diễn giải 4.414 → **4.187**.

## 5. Một cái THƯỚC phải sửa, và vì sao

Lượt đo đầu tiên ra **18 hộp cảnh báo** — nhiều hơn trước khi gộp, trong khi giao diện vừa
gọn lại. Nguyên nhân: `/page` chuyển hướng về `/page-bot`, và phép đo đếm **cùng một màn hai
lần**. Nay phép đo nhớ đường đích: đường nào chuyển hướng về màn đã đo thì ghi một dòng
«→ chuyển hướng tới X, không đo lại» và không cộng vào tổng.

📌 Nếu không sửa thước, con số tổng sẽ nói dối theo chiều xấu đi đúng lúc việc đang tốt lên —
và lần sau ai đó sẽ đi «tối ưu» một thứ không hỏng.

## 6. Chưa làm

- **Bốn tab trong trang của page** (Sản phẩm & giá · Kịch bản · Chạy thử · Đoạn chữ) như bản
  vẽ: hôm nay là bốn ĐƯỜNG DẪN mang sẵn page, chưa nhúng vào trang. Nhúng là bốn màn nữa,
  nên tách phiếu.
- **Phép đo chưa mở `/page/:id`** — nó không có dòng menu nên bộ đo không tới. Chữ và hộp
  cảnh báo của màn mới (đo tay: 119 chữ · 1 hộp) chưa nằm trong tổng.
- **`/san-sang` mất phần «cả đội một lượt»**: bộ lọc mới trả lời «page nào còn chặn», nhưng
  bảng đếm theo từng điều kiện và phần đối chiếu lệch thì chưa chuyển sang danh sách.
- GD3 (màn Cài đặt team) — màn cuối còn thiếu so với bản vẽ.
