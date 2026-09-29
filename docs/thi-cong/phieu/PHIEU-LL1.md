# PHIẾU LL1 — Khung năm đích: menu Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt

**Base:** `20b9bdb` · **Làn:** 🟩 (chỉ xếp lại menu; không đổi đường, không đổi quyền, không đụng dữ liệu)
**Nguồn:** CR-28-09c (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`) · `01-QUYET-DINH.md` §9 ·
hợp đồng màn `docs/v3/03-MAN-HINH.md` (bảng «Màn cũ đi đâu») · bản vẽ https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb
**Đụng bộ não:** không.

## ① Vì sao

Menu hôm nay có năm mục xếp theo nhịp mở máy (`v3/src/ui/chung/man-hinh.js#NHOM`: Hôm nay · Page & bot · Dạy bot ·
Số liệu · Cài đặt). Cùng một việc vẫn rải nhiều mục: sản phẩm nằm ở «Page & bot», kịch bản tầng sản phẩm ở «Dạy bot»,
khách hàng ở «Số liệu». Người quyết duyệt bản vẽ năm đích ngày 28–29/09. LL1 là phiếu ĐẦU của sóng LL: dựng khung
mà các phiếu sau (LL2 Hộp thư · LL3 Page · LL5 Số liệu · LL6 Cài đặt · LL13 Sản phẩm) đổ màn vào.

## ② Làm gì

1. `NHOM` thành năm đích: `hop-thu` Hộp thư · `san-pham` Sản phẩm · `page` Page · `so-lieu` Số liệu · `cai-dat` Cài đặt
   (giữ `nhan-cho-khach` dự trù, rỗng thì tự ẩn như hôm nay). Mỗi mục một câu mô tả ngắn lấy từ bảng «Năm đích».
2. Xếp lại từng dòng `dat(...)` vào đích mới đúng cột «Nhà mới» của `03-MAN-HINH.md`. Màn có cột «Cách» = Gộp mà nhà
   mới chưa dựng thì **giữ màn cũ** dưới đích mới (vd «Việc đang chờ» dưới Hộp thư) — tới LL8 mới gỡ.
3. Sale đăng nhập vào thẳng Hộp thư (hôm nay đã vào bàn hội thoại — giữ, chỉ đổi tên đích). Mục chỉ hiện nếu vai
   vào được ít nhất một màn trong đó (luật `menuCua` giữ nguyên).
4. Chữ trên khung: đổi «Hôm nay» → «Hộp thư», «Page & bot»/«Dạy bot» → «Sản phẩm» + «Page». Không đổi tên màn con ở
   phiếu này.

## ③ Không làm

KHÔNG xoá hay đổi đường dẫn nào (liên kết cũ phải còn mở). KHÔNG gộp giao diện màn nào (LL2–LL6). KHÔNG đổi vai hay
quyền (LL7 — hôm nay vẫn năm vai trong mã). KHÔNG đụng `van-hanh`/`dispatch` API. KHÔNG đụng dữ liệu.

## ④ Nghiệm thu

- Bộ ca: năm đích đúng thứ tự · mọi màn của `MAN` có đúng một đích · danh sách đường TRƯỚC = SAU (so danh sách, không
  so số) · mỗi vai thấy đúng TẬP màn như trước, chỉ đổi đích · sale đăng nhập vào thẳng Hộp thư.
- Sửa thước neo menu cũ, CÙNG commit (án lệ 27): `v3/test/b/dieu-huong.test.mjs` · `he-kieu` HK10/HK15 ·
  `vai-b-noi-day.test.mjs` · `ops/bin/nghiem-thu/ui-ht4.sh` ④.
- Đảo-vá: bỏ một màn khỏi đích ⇒ ca «mọi màn có đích» đỏ; đổi một đường ⇒ ca «đường trước = sau» đỏ.
- Cổng `ops/bin/nghiem-thu/ll1.sh` + chạy lại `ui-ht1..4.sh`.

## ⑤ Đã tra chưa

Trước khi code: `grep -n "LL1\|năm đích\|NHOM" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` và đọc §9 N-HT4 (thước menu
của sóng UI-HT) — dán output vào nhật ký.
