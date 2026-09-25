# PHIẾU GD6 — MENU ĐÍCH

> Làm 25/09/2026 · làn 🟩 · đất B (`v3/src/ui/chung/*`, một tên màn ở `van-hanh`) ·
> đo trên bản dev `aicloser_dev_1789621023909`, giao diện dựng từ repo ở cổng 3210.
> Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 4a + 5 (dòng GD6).

## 1. Đổi gì

**Năm mục theo NHỊP MỞ MÁY**, thay cho năm mục theo tầng dữ liệu:

| Mục | Khi nào mở | Màn |
|---|---|---|
| Hôm nay | mỗi sáng | Việc của tôi · Việc đang chờ · Hội thoại và đơn |
| Page & bot | khi thêm hoặc sửa một page | Bắt đầu · Công tắc từng page · Page còn thiếu gì · *Sản phẩm & kho* |
| Dạy bot | khi sửa cách bot nói | Kịch bản · Quy tắc chung · Câu trả lời sẵn · Kỹ năng · *Đoạn chữ gửi cho AI* |
| Số liệu | cuối kỳ | Đơn và tỉ lệ chốt · Chi phí AI |
| Cài đặt | hôm cài đặt, hôm có sự cố | Người và team · Kết nối · Model AI · Hệ còn sống không · Ai đã sửa gì |

*(nghiêng = `itDung`, xếp sau vạch «Ít dùng» trong chính mục của nó)*

**Cờ `thuNghiem`** — bảy màn đã dựng nhưng chưa dùng được (chưa có dữ liệu thật hoặc chưa có
cửa ghi): Đưa sản phẩm lên chạy · Ảnh gửi khách · Gợi ý từ AI · So hai bản kịch bản · Khách vào
từ đâu · Rủi ro hoàn hàng · Khách hàng.

**Một tên đổi:** «Vận hành chat V3» → «Hội thoại và đơn» (bảng thuật ngữ cấm tên phiên bản trên
màn). Đổi kèm `<h1>` và `<title>` của chính màn đó — ca HK10 canh cặp «tên menu = tên đầu trang».

## 2. Quyết định đáng ghi: ẩn thế nào cho khỏi mất lối về

Lần đầu tôi lọc thẳng màn `thuNghiem` khỏi `menuCua`. Ca ⑥b đỏ, và nó đỏ ĐÚNG: thanh trên cùng
tra «tôi đang ở đâu» bằng chính gói menu, nên lọc thẳng thì ai mở màn ẩn bằng đường dẫn sẽ thấy
một trang không biết mình thuộc mục nào.

Nay `menuCua` **giữ** màn ẩn trong gói, gắn cờ `an: true`; thanh bên không vẽ chúng, còn đường
dẫn vị trí vẫn tra được. Mục nào không còn màn nào hiện thì tự biến mất khỏi thanh bên.

⇒ Một lời khai kèm theo: **ẩn khỏi menu KHÔNG phải là chặn quyền.** Vai vẫn nguyên, đường dẫn
vẫn 200, và màn khác trỏ sang vẫn trỏ được (ví dụ «Việc của tôi» vẫn có nút mở Gợi ý từ AI).

## 3. Thước

- `v3/test/b/dieu-huong.test.mjs` + `he-kieu.test.mjs`: **37/37 xanh**. Sáu ca phải sửa theo cấu
  trúc mới (mã mục, số màn hiện/ẩn, mục của vai sale, `mucCuaDuong`, danh sách `itDung`, nhóm của
  màn chi tiết) — mỗi ca giữ nguyên điều nó canh, chỉ đổi kỳ vọng theo menu mới. Thêm hai khẳng
  định mới: **19 màn hiện · 7 màn ẩn**, và «màn ẩn vẫn phải tra ra mục của nó».
- `ops/bin/do-giao-dien.mjs`: mở đủ **26 màn** (gồm cả 7 màn ẩn, vì chúng vẫn nằm trong gói menu)
  — **0 màn vỡ**, 0 mã kỹ thuật trên mặt màn, 17 hộp cảnh báo.
- `npm test`: 1970 xanh / 3 đỏ — ba ca đỏ có sẵn (I1 · A8 · R1-6).

## 4. Chưa đạt: 19 màn, không phải 16

Kế hoạch ghi «≤16 màn trên menu». Con số ấy tính cho menu SAU khi GD2 gộp ba màn page làm một và
GD3 dựng màn «Cài đặt team». Hai phiếu đó chưa làm (GD2 chờ Q1), nên hôm nay gom được tới 19.
Không gộp bừa để chạm số: gộp màn là việc của GD2, có cửa ghi và ca canh riêng.

## 5. Việc để lại

- Menu vẫn còn một tên mang chữ viết tắt: «Model AI & khoá». Đổi khi có dịp chạm màn đó.
- Bảy màn ẩn: mỗi màn nên có một đường vào từ màn liên quan (hôm nay chỉ «Gợi ý từ AI» có).
  Ghi vào `docs/v3/THUAT-NGU.md` mục «chỗ chưa dọn».
