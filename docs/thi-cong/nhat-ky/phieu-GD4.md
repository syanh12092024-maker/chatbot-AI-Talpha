# PHIẾU GD4 — LƯỢT LỜI LẼ

> Làm 24–25/09/2026 · làn 🟩 · đất B (`v3/src/ui/*`, `v3/src/noi-day/cau-bot-v1.js`) ·
> môi trường đo: **máy dev macOS**, bản dev `aicloser_dev_1789621023909`, tiến trình giao diện
> dựng TỪ REPO ở cổng 3210. Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5, dòng GD4.
> Sáu đợt, sáu commit: `5282ad8` `89cfe34` `a2983b7` `b9e327e` `528b732` `89c847b`
> (cộng `1b33e2c` — đưa tệp cầu nối vào repo + đổi tên mục menu, người quyết gật 25/09).

## 1. Kết quả đo

| Chỉ số | Trước | Sau | Đích của kế hoạch |
|---|---:|---:|---:|
| Mã kỹ thuật trên mặt màn | 80 | **0** | 0 ✅ |
| Hộp cảnh báo | 31 | **17** | ≤1 mỗi màn ✅ (không màn nào quá 1) |
| Chữ diễn giải | 6.849 | **4.357** | ≤3.400 ❌ — xem mục 4 |
| Màn có ô «Nguồn số» | 0 | 6 | — |
| Màn vỡ | 0 | 0 | 0 ✅ |

Đo bằng `ops/bin/do-giao-dien.mjs` (Brave headless, đăng nhập thật, mở đủ 26 màn).

## 2. Ba thứ dựng nên, dùng lại được

**① Ô «ⓘ Nguồn số»** (`window.UI.nguonSo` + kiểu trong `kieu.css`). Luật 8 của sổ — mọi con số
phải khai được nguồn — giữ NGUYÊN, chỉ đổi chỗ đứng: lời khai xuống ô gập ở chân màn. Người đi
kiểm mở ra là có đủ; người vận hành hằng ngày không phải đọc tên bảng giữa mặt màn.

**② Khuôn HAI TRƯỜNG cho lời khai kỹ thuật.** Câu người vận hành đọc nằm ở trường chính; nguyên
nhân bằng tên biến/tên hàm nằm ở trường riêng `…KyThuat` để màn đưa xuống ô «Nguồn số». Đã dùng
ở năm chỗ: `botIm`/`botImKyThuat` (Kết nối) · `diTiepRong…` (Việc của tôi) · `diTiep…` (Sản phẩm)
· `thieu`/`thieuKyThuat` (cầu sang tiến trình bot, hiện trên hai màn) · thông báo lỗi của cầu
mang cả hai vì nhật ký cần tên biến.

**③ Bảng thuật ngữ** `docs/v3/THUAT-NGU.md`: một thứ một tên (tài khoản Pancake · kho hàng · bot
cũ / bot mới · máy chạy bot · cho chạy…), ba luật đi kèm, và bảng «chỗ chưa dọn» cập nhật dần.

## 3. Bảy thước cũ phải sửa theo — và sửa theo hướng GIỮ, không nới

Án lệ #27 («sửa luật phải sửa cả thước») gặp bảy lần. Mỗi lần đều giữ nguyên điều ca đang canh,
chỉ đổi chỗ đọc:

| Ca | Trước canh | Sau |
|---|---|---|
| `ket-noi` khoToken | `botIm` chứa `ADMIN_USER` | câu người đọc + `botImKyThuat` chứa tên biến |
| `ket-noi` thứ tự | nhãn `chính (.env)` · `CSDL (v3)` | nhãn đã dịch, THỨ TỰ vẫn bị canh |
| `rui-ro-hoan` ⑤a | chuỗi «CHỜ CHỐT» | vẫn phải khai chính sách chưa chốt + chưa chỗ nào chặn |
| `prompt-page` hiệu lực | chuỗi `kb.js` | vẫn phải khai bot dùng bản CŨ và bảng không phải thứ đang gửi |
| `ai-de-xuat` ba tầng | lý do phải chứa «cột/bảng» | lý do vẫn phải nói rõ thiếu thứ gì |
| `trang-chu` ③b · `san-pham` ⑤b | `diTiepRong` chứa tên biến | câu người đọc + trường `…KyThuat` |
| `page-bot` cầu bot | `thieu` chứa `PANCAKE_READONLY` | `thieuKyThuat` chứa tên biến, `thieu` phải đọc hiểu được |

## 4. Đích «chữ diễn giải ≤ 3.400»: KHÔNG đạt, và tôi đề nghị sửa đích

Đích ấy đặt hôm 22/09, khi phép đo còn tính **cả chữ trong bảng và dãy dữ liệu**. Đo lại cho
đúng thì hai màn «nhiều chữ» nhất hoá ra chỉ là danh sách tên sản phẩm: Kỹ năng 1.276 → 122,
Sản phẩm & kho 1.027 → 281 sau khi khai đúng vai của dãy chip (`role="list"` · `role="group"`).
Tức con số 6.849 ban đầu và 4.357 hôm nay **không cùng một thước**.

4.357 chữ trên 26 màn ≈ **168 chữ mỗi màn**. Cắt tiếp xuống 3.400 (≈130 chữ/màn) là cắt vào
những câu đang gánh việc thật: luật «hai luồng không cộng được», «đèn xám ≠ đèn xanh», «giá bạn
gõ là giá khách nghe». Đề nghị: **đặt lại đích theo màn, không theo tổng** — không màn nào quá
250 chữ diễn giải (hôm nay còn 5 màn vượt: Việc của tôi 298 · Kết nối 258 · Sản phẩm 251 ·
Khách vào từ đâu ~300 · Gợi ý từ AI 270).

## 5. Phát hiện ngoài phạm vi — đã ghi §9

**Bộ ca dùng chung tệp dữ liệu ở gốc repo.** `npm test` mỗi lượt đỏ một nhóm khác nhau (N1b/N4 →
S3/S5/S8 → D1/D9), chạy riêng thì xanh. Đo được: `ai-messages.jsonl` và `conv-state.json` ở gốc
repo bị ghi lại lúc 09:03 ngày 25/09 và đang chứa **dữ liệu mồi của chính bộ ca** (`CUST-GIA`,
`PAGE-BH1`). Tức nhiều suite cùng ghi hai tệp ấy rồi đọc lại — thứ tự chạy quyết định ai thắng.
Hệ quả: không lượt `npm test` nào đọc được, và một hồi quy thật sẽ chìm giữa những ca đỏ giả.

## 6. Tự chấm

- Làm được: mã kỹ thuật về 0 và mọi màn ≤1 hộp cảnh báo — hai đích đo được của phiếu.
- Chưa làm được: chữ diễn giải chưa về 3.400 (mục 4 đề nghị sửa đích); và tôi CHƯA đọc lại
  toàn bộ 26 màn bằng mắt người dùng — mới sửa những chỗ máy chỉ ra.
- Việc để lại: menu còn «Vận hành chat V3» mang tên phiên bản (lượt sắp menu GD6); điều kiện
  `MISSING_TAGS` còn nhắc thao tác bên Pancake bằng lời cũ.
