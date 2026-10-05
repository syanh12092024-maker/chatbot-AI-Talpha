# PHIẾU LL17d — Team của đơn theo NGÀY ĐƠN (nợ N-DON-TEAM-THEO-NGAY của LL17a)

> Làn 🟨 (màn đọc + nguồn ngoài CHỈ ĐỌC) · 05/10/2026 · KHÔNG đụng bộ não · 0 gói · 0 migration · 0 biến mới. Commit `6c24be4` · cổng
> `ops/bin/nghiem-thu/ll17d.sh` · ca `test/ll17d-team-theo-ngay.test.mjs` + L5 của `v3/test/b/ll17a-so-lieu-man.test.mjs`.

## 1 · Đề bài

Luật ký CR-28-09c: «đơn thuộc team của marketer VÀO NGÀY ĐƠN». LL17a làm theo team HRM HIỆN TẠI (nợ N-DON-TEAM-THEO-NGAY).

**Phạm vi âm:** KHÔNG đổi luật chờ gán / ngoài hệ · KHÔNG đổi màn ngoài khối «Đơn POS» và các số đọc cùng bộ đọc (LL17b).

## 2 · Đo lại nguyên liệu (05/10, máy dev, khoá levelup, CHỈ ĐẾM)

- `HRM_Core.fact_employee_team_history`: `emp_code · team_code · hieu_luc_tu · hieu_luc_den (NULL = đang hiệu lực) · nguon ·
  updated_at`; 109 dòng / 95 người · 11 người nhiều dòng · sớm nhất 01/01/2026 · 79 dòng đang hiệu lực.
- 60 ngày: 23.194 đơn có mã NV · **628 đơn của MỘT marketer** (GCC → EU) làm ở GCC 07/08–31/08 mà đang tính cho EU · 3 đơn không có dòng
  lịch sử phủ ngày · 0 chồng chéo. Hôm nay 628 đơn nằm NGOÀI khoảng 7/30 ngày màn hiện — số trên màn chưa sai, nhưng lần đổi team kế
  sẽ làm số 30 ngày lệch ngay.
- Khoá của PROD đọc được bảng lịch sử (SSH chỉ đọc: 109 dòng · 79 đang hiệu lực).

## 3 · Đã làm

- `src/hrm/don-pos.js`: câu gộp thêm `team_ngay` — dựng (mã NV × ngày) rồi JOIN lịch sử, `ARRAY_AGG(team ORDER BY hieu_luc_tu DESC LIMIT
  1)` (nhiều dòng phủ ⇒ bắt đầu muộn nhất, tất định), `LEFT JOIN` về đơn (không rơi đơn), gộp theo 8 chiều; bộ đọc trả `teamNgay`;
  `tongHopTeam` lấy `teamNgay` trước, team hiện tại là đường lùi + đếm `theoHienTai` (cả công ty); marketer không còn hồ sơ HRM mà
  lịch sử nói team ⇒ vào team đó, tên = mã.
- Màn Tổng quan: câu cả công ty thêm «N đơn tính theo team HIỆN TẠI của marketer (HRM chưa có lịch sử team phủ ngày đơn)» khi N > 0;
  nguồn số ghi «team của marketer VÀO NGÀY ĐƠN». `03-MAN-HINH.md`.

## 4 · Chọn A thay B

- **Suy team trong BigQuery** thay vì kéo lịch sử về JS: một câu, một đệm; giá: thêm một bảng trong quyền đọc của khoá (đã đo prod đọc được).
- Lượt đầu dùng truy vấn con tương quan `ARRAY_AGG … LIMIT 1` — BigQuery từ chối («Correlated subqueries that reference other tables are
  not supported…») ⇒ đổi sang bảng (mã NV × ngày) rồi JOIN; không phụ thuộc mã đơn duy nhất.
- **Thiếu lịch sử ⇒ team hiện tại + nói ra** thay vì «chờ gán»: giữ đúng hành vi cũ cho 3 đơn, không giấu.

## 5 · Thước

- Sửa thước theo dạng dữ liệu mới: P4 (dòng giả mang `team_ngay`), Q1 (GROUP BY 8 chiều), fixture L1–L4 mang `teamNgay` (bộ đọc thật
  luôn trả). 
- Đảo-vá **9/9 ĐỎ**: bỏ teamNgay · ưu tiên team hiện tại · không đếm theo hiện tại · JOIN thường · dòng bắt đầu sớm nhất · bỏ điều kiện
  hết hạn · reader bỏ team_ngay · thiếu hồ sơ ⇒ ngoài hệ · màn không nói câu. E5/E6 chỉ bắt được bằng soi HÌNH DẠNG câu SQL (bộ ca không
  gọi BigQuery) — hành vi thật đo tay: 2,2 giây · 5.308 dòng · 23.191/23.194 đơn có team theo ngày · 60 ngày GCC 12.936 · EU 9.071 · AUUS 1.187.

## 6 · Kiểm (05/10, worktree `so-lieu-bq`)

- R1–R3 **3/3** · L1–L5 **5/5** · cổng `ll17d.sh` **4/4** (lồng `ll17b.sh` → `ll17a.sh` → …) · `npm test` **2.342 ca · 0 đỏ**.

## 7 · Nợ

- N-DON-TEAM-THEO-NGAY — ĐÓNG (chờ mở van).
