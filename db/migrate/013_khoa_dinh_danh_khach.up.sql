-- 013 · KHOÁ ĐỊNH DANH KHÁCH ĐI KÈM THỊ TRƯỜNG (A7-1).
--
-- ═══ VÌ SAO — ĐO 25–26/08 TRÊN POS THẬT, KHÔNG PHẢI SUY ═════════════════════════
-- Khoá cũ: `UNIQUE (team_id, so_dien_thoai) WHERE so_dien_thoai IS NOT NULL`.
-- Cả BẢY shop POS đều nằm ở team 1, mỗi shop một nước. Nên khoá cũ nói:
-- «trong một team, một số điện thoại là MỘT người» — mà một team ở đây là bảy nước.
--
-- ① POS LƯU SĐT KHÔNG CÓ MÃ NƯỚC. Đo: Kuwait `66410373` · Qatar `55534997` ·
--    Saudi/UAE `5xxxxxxxx`. Tức `chuanHoaSdt` chạy trên dữ liệu POS là **no-op** —
--    nó cắt tiền tố, mà POS không có tiền tố nào để cắt. Nước KHÔNG nằm trong số;
--    nó chỉ nằm ở «đơn này đến từ shop nào». Đây là gốc của RF-23, không phải
--    việc cắt mã vùng.
--
-- ② RF-23 (§9, 23/08) KHAI SAI TÊN NƯỚC. Sổ nêu Kuwait/Bahrain/Oman/Qatar. Đo lại:
--
--      nhóm 8 số  Kuwait·Qatar·Bahrain·Oman   5.703 sđt phân biệt →  0 va chạm THẬT
--                 (đúng 1 hit và nó là rác: `123123123123`)
--      nhóm 9 số  Saudi·UAE                   2.529 + 2.537 sđt   →  6 va chạm THẬT
--                 561698732 · 547049872 · 575461472 · 546241121 · 538440108 · 386685425
--
--    Sổ gọi tên đúng cái nhóm KHÔNG va chạm, và bỏ sót nhóm CÓ va chạm — cũng là
--    nhóm chiếm 82% đơn (Saudi 62.494 + UAE 38.641 / tổng 122.615).
--
-- ③ DÂN SỐ THẬT LÀ 122.615 ĐƠN, không phải 5.144 như mốc 23/08 (= 4,2%). Sáu va
--    chạm trên là mẫu 3.000 đơn/shop; ngoại suy (không gian hiệu dụng suy từ mẫu
--    ≈ 1,07M) ra hàng trăm tới ~1.000 khách bị gộp khi nạp đủ. CON SỐ ĐO ĐƯỢC LÀ 6 —
--    phần còn lại là ước lượng, và migration này không cần nó để đúng.
--
-- ④ LÀM BÂY GIỜ VÌ `khach` ĐANG 0 DÒNG. Đây là một migration rỗng hôm nay. Sau khi
--    122.615 đơn đã nạp thì gỡ một cặp đã gộp phải tự suy ngược nước cho từng khách —
--    đắt hơn nhiều. Cửa sổ này đóng ngay lượt ai đó chạy đồng bộ POS.
--
-- ═══ HÌNH DẠNG KHOÁ MỚI ═════════════════════════════════════════════════════════
-- `coalesce(thi_truong, '')` là BẮT BUỘC, không phải cho gọn: hai NULL là KHÁC nhau
-- trong index, nên `(team, thi_truong, sdt)` trần sẽ cho hai dòng cùng số cùng team
-- LỌT khi cả hai chưa biết nước. Đúng cái lỗ mà 012 vừa bịt cho `kich_ban` — cùng
-- một cái bẫy, lần thứ hai.
--
-- KHÔNG có CHECK liệt kê tên nước ở đây, CỐ Ý: danh sách gõ tay là lỗ hẹn giờ (án lệ
-- #22). Nguồn hợp lệ DUY NHẤT của cột này là `ket_noi_pos.market`; bên ghi lấy qua
-- `traMarketCuaPage()` (`src/orders/hang-cho.js`) hoặc qua chính tham số `shop` của
-- `docDon()`. Lưu ý người sau: `page.thi_truong` là nhãn NGƯỜI (`KSA`·`Khác`·rỗng) và
-- KHÔNG cùng từ vựng — khớp theo tên trúng 0/502 page, đã đo 23/08.
--
-- CHƯA BIẾT NƯỚC thì để NULL và hai dòng chưa-biết cùng số VẪN gộp làm một — tức giữ
-- nguyên hành vi cũ cho phần mù, chứ không bịa ra nước. Trên dữ liệu có SĐT thật thì
-- phần mù rất nhỏ: tra được nước trên 789/790 hội thoại mang SĐT (99,9%).

ALTER TABLE khach ADD COLUMN thi_truong text;

COMMENT ON COLUMN khach.thi_truong IS
  'Thị trường của khách — LẤY TỪ ket_noi_pos.market, không phải page.thi_truong '
  '(hai từ vựng khác nhau: KSA vs Saudi). NULL = chưa tra được nước; khi NULL thì '
  'khoá định danh lùi về hành vi cũ (gộp theo team + số).';

DROP INDEX khach_sdt_trong_team;

CREATE UNIQUE INDEX khach_sdt_trong_team_nuoc
  ON khach (team_id, coalesce(thi_truong, ''), so_dien_thoai)
  WHERE so_dien_thoai IS NOT NULL;
