# Nhật ký phiếu VE2 — trang một page dựng lại theo bản vẽ 2c (29/09/2026)

> CR-28-09c · làn 🟩 (giao diện; mọi cửa ghi giữ nguyên) · base `90ad57f` · commit `bada2f4` · Đụng bộ não: không.
> Màn trong ảnh người quyết gửi («mới thấy thay đổi phần khung, còn chi tiết không giống»). Lời commit rơi mất chữ
> `nhaCum` (zsh hiểu dấu huyền ngược trong nháy kép là lệnh) — nội dung đúng ở nhật ký này.

## Đo trước khi code

- Bản vẽ 2c (`Page.dc.html`): ba cột 300 | nội dung | 380; trái: thẻ «Luật chung · trả lời sẵn», «Page của tôi», danh
  sách có chấm trạng thái; giữa: tên · thị trường · marketer · công tắc; «Bật được chưa» (điều kiện); bảy tab Sản phẩm &
  giá · Lời bot · Ảnh · Trả lời sẵn · Kỹ thuật · Gợi ý cải thiện · Lịch sử; phải: «Thử hỏi bot» + «AI đang đọc gì».
- Màn cũ (`mot-page.html`, 896 dòng) có ba tab và các cửa ghi: bật/tắt bot · giao bot · thiết lập (5 ô) · sản phẩm/giá
  (MN4) · nối món POS (MN8) · ảnh (tải · link · nhãn · xếp · bỏ) · kịch bản lưu-là-chạy (MN6) · khối chung (MN7). Chọn
  GIỮ NGUYÊN thân mọi hàm ghi, chỉ đổi chỗ chúng vẽ vào — đường tiền (giá) không bị viết lại.
- Cột trái cần danh sách page mà MARKETER mở được: `/api/page-bot` chỉ quản trị ⇒ cửa mới `/api/page-ds`, cùng quyền
  với trang một page. Trạng thái bot: `chung/bot-bat-that.js` (một nguồn — án lệ 28/09 năm màn nói hai con số).
- «Thử hỏi bot»: chưa có đường thử an toàn (LL14) ⇒ nói rõ, không vẽ ô thử giả. «AI đang đọc gì»: bản vẽ in token —
  bộ đọc có KÝ TỰ thật (luật chung · kịch bản · số món) ⇒ in ký tự, không đoán token.

## Làm gì — và chọn gì thay gì

1. `kho-mot-page#dsPageGon` + `GET /api/page-ds`: page của team xếp theo tên; bot bật từ tiến trình bot, bot không thấy
   ⇒ cột bản sao, không hỏi được ⇒ `nguonBot: 'ban_sao'` + lý do (màn in «trạng thái bot theo bản sao»).
2. Trang: khung ba cột (`chia-ba`); công tắc ở đầu (bản vẽ); «Bật được chưa» = khối «Còn thiếu gì» cũ, lưới hai cột;
   bảy tab; ảnh TÁCH sang tab riêng (cùng `veAnh`/`noiAnh`, vẽ lại cả hai tab sau mỗi lượt ghi); Kỹ thuật = bot phụ trách
   + giao bot + thiết lập + nguồn nhận tin (LL10); Lịch sử = các bản kịch bản (quay về ở màn Kịch bản); Gợi ý = để sau.
   Đường `?tab=` cũ (tinh-trang · thiet-lap · tra-loi · san-pham · kich-ban) vẫn mở đúng tab.
3. Khung: `man-hinh` gắn `nhaCum: 'danh-sach-page'` cho trang một page; `khung.js#hangHai` sáng mục của cụm ⇒ «Trong mục
   Page» sáng «Tất cả page». Chọn trường riêng thay vì `cum`: C1 (LL3) đòi mọi thành viên cụm có nhãn tab — trang một page
   không phải thành viên (`canId`), nới luật cụm là đổi giả.
4. Hệ kiểu: `chia-ba` · `cot-thu` · `the-lien` · `.ds-chon a` · `cham` · `bat-duoc` · `.chia-hai-phai > :empty`.

## Lỗi bắt bằng e2e / ảnh (trước khi nộp)

- «Xem câu trả lời sẵn» trỏ `/lop-0` ⇒ 404 (có từ trước, lộ vì tab Trả lời sẵn nay hiện rõ) ⇒ `/lop-0-dong`; ca **K16**
  quét MỌI liên kết viết cứng trong mọi trang (lượt đầu của thước quét tự nhận «không liên kết chết» vì đặt `/` làm
  tiền tố — sửa thước, quét lại ra đúng một chỗ). Đột biến trả liên kết chết ⇒ K16 đỏ.
- Dải «Trong mục Page» không sáng mục nào khi đứng ở một page ⇒ `nhaCum` (K3 canh).
- Khoảng trống thừa trên tên page (ô báo tin rỗng chiếm một khoảng gap) ⇒ `.chia-hai-phai > :empty`.

## Bộ ca

- `v3/test/b/ve2-mot-page.test.mjs` P1–P4: nguồn bot thật + lùi bản sao · khai khi không hỏi được · quyền (sale 403,
  chưa đăng nhập 401) · trang ba cột + bảy tab + 11 cửa ghi/đọc của màn cũ + chỗ chưa có đường nói rõ (LL14 · BH5).
- `ll18-khung` K3 (đứng ở một page sáng «Tất cả page», không vẽ tab cụm) · K16 (liên kết viết cứng có thật).

## Đảo-vá — 8/8 ĐỎ (+ K16)

M1 bot bật đọc cột bản sao · M2 im lặng đổi nguồn · M3 bỏ chắn vai · M4 mất giao bot · M5 mất lưu-là-chạy (thước P4
lượt đầu khớp cả chú thích — siết về đúng lời gọi) · M6 mất tab Ảnh · M7 khung quên nhà cụm · M8 thôi nói «chưa có đường
thử». K16: trả liên kết `/lop-0` ⇒ đỏ.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ve2.sh`: **ĐỎ 0 / XANH 8**. `npm test` (dev 29/09): **2.295 ca · 2.291 đạt · 0 đỏ · 4 bỏ qua**.
- E2E hồi quy (48 màn, ba vai): 0 lỗi ngoài `/lop-0` (đã sửa) · 0 khung lệch · 0 HTML thô.
- Ảnh (sandbox, dev): bảy tab · marketer · 390px · 1200px — 0 lỗi JS, 0 tràn ngang; lịch sử đọc đúng «Bản 2 Đang chạy |
  Bản 1 Cũ»; `?tab=thiet-lap` mở «Kỹ thuật».

## Chưa làm / để sau

- Thử hỏi bot (LL14) · Gợi ý cải thiện (BH5) · so hai bản kịch bản · «Mở trên Pancake» (chưa đo được dạng đường dẫn
  đúng — không đoán) · marketer HRM (LL15) · trả lời sẵn riêng theo page (bản vẽ: «thêm dòng riêng cho page»).
- Chưa deploy.
