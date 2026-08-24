# PROMPT GIAO VIỆC — GIAI ĐOẠN 2

> Dán nguyên một trong hai prompt dưới đây vào phiên Claude Code mới của từng người.
> Mỗi prompt tự chứa đủ bối cảnh — người nhận không cần đọc gì trước.
> Soạn 24/08/2026, sau khi giai đoạn 1 code xong.

---

## Prompt cho NGƯỜI A — trục dữ liệu, giai đoạn 2

````text
Bạn là người viết code trục dữ liệu của AI Closer v3, tiếp giai đoạn 2. Thư mục:
messenger-closer. Nhánh: main.

═══ BỐN LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. .env máy cá nhân phải luôn có PANCAKE_READONLY=1. Thiếu là máy bạn nhắn cho khách thật,
   trùng với máy chủ.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm remote, không deploy nơi khác.
4. Không đụng 62 file phẳng ngay dưới src/ (đang phục vụ 51 page khách thật) và năm file bộ
   não cấm sửa: prompts.js closer.js tools.js fast-lane.js outbound-guard.js.

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/gd2/00-KE-HOACH-GD2.md   — kế hoạch giai đoạn 2, ĐỌC KỸ mục "sáu bài học"
2. docs/thi-cong/SO-DIEU-HANH-THI-CONG.md §0a §8 §9 §9b — luật, việc người, sổ nợ
3. docs/v3/01-QUYET-DINH.md §6 (prompt bốn khối) §7 (model) §9 (năm vai)
4. docs/v3/ban-giao/  — tám file bàn giao bạn đã viết, nay người B đang dùng
5. v3/docs/hop-dong-b-voi-a.md  — hợp đồng với người B

═══ VIỆC ĐẦU TIÊN, TRƯỚC MỌI THỨ KHÁC ═══
Hai phiếu người B đã phát và đang chờ bạn. Chúng CHẶN cả giai đoạn 1 lẫn giai đoạn 2:

  PHIEU-B-Y1  docs/thi-cong/phieu/PHIEU-B-Y1.md   🟥
     mục 1: suaTheoId nhận điều kiện thêm (so-và-đặt) + nhận ctxHeThong
     mục 2: layNhieu nhận giá trị MẢNG → = ANY($n)
     Đây là nợ N3 đang mở từ 22/08, đã cắn BỐN lần và đẻ ra ba "cửa tạm" ghi thẳng
     (src/pos/kho.js · src/chat/kho.js · orders/may-trang-thai.js:290). Chính bạn đã khai
     trong mã nguồn rằng "bản vá đúng là suaTheoId cho ctxHeThong ở src/db/".
     Không có mục 1: hai sale bấm "Nhận việc" cùng lúc thì CẢ HAI CÙNG THẮNG — ở dòng duyệt
     đơn nghĩa là hai đơn trùng vào POS.
     Không có mục 2: mọi mẻ đọc gom id của màn hình phải đọc TRỌN bảng rồi lọc trong JS.
     Hôm nay hoi_thoai là 28.953 dòng.

  PHIEU-B-Y2  docs/thi-cong/phieu/PHIEU-B-Y2.md   🟨
     Khoá API đang gắn theo VAI TRÒ nên một team dùng Kimi cho cả ô chính lẫn ô nền bị lưu
     HAI BẢN cùng một khoá. Đổi khoá quên một bản thì chat vẫn chạy còn việc nền chết câm.
     Cột khoa_api_ma đang NULL ở mọi dòng ⇒ di trú lúc này giá bằng KHÔNG.

Làm xong hai phiếu đó rồi mới sang phần dưới.

═══ VIỆC CỦA BẠN — 6 module, ~8 ngày công ═══
G2-A1  Nới tầng truy vấn (PHIEU-B-Y1)                                     1 ngày  ← TRƯỚC TIÊN
G2-A2  Khoá API theo nhà (PHIEU-B-Y2) + migration 008                     1 ngày
G2-A3  Xoá BA cửa tạm ghi thẳng, gom về tầng truy vấn                     1 ngày
G2-A4  Bảng + API cho bộ luật chung và kỹ năng: phiên bản, duyệt,
       "đổi cái này ảnh hưởng bao nhiêu page"                             2 ngày  🟥
G2-A5  Bảng + API kịch bản ba tầng (sản phẩm → nước → page) với KẾ THỪA,
       và đúng MỘT bản LIVE mỗi page                                      2 ngày
G2-A6  API số liệu: báo cáo tách hai luồng · chi phí AI theo page ·
       A/B kịch bản có cờ "chưa đủ mẫu" · sức khỏe 9 chỉ số               1 ngày

Làm TUẦN TỰ. Module trước chưa nghiệm thu thì không mở module sau.

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
db/migrate/* · db/schema.sql · db/khoa.js · src/db/* · src/pos/* · src/chat/* ·
src/orders/* · src/queue/* · test/* · ops/bin/nghiem-thu/*

═══ FILE CẤM ĐỤNG ═══
v3/src/*  → toàn bộ là đất người B (auth · audit · model · ui · noi-day)
62 file phẳng ngay dưới src/ · năm file bộ não · .env

═══ HAI CHỖ DỄ SAI NHẤT ═══

① MỖI THAY ĐỔI BỘ LUẬT CHUNG ĐỘNG TỚI 51 PAGE CÙNG LÚC
  Bộ luật chung là 2.256 token dùng chung. Sửa sai một dòng là 51 page đổi cách nói với
  khách trong một lượt deploy. Nên API phải trả về ĐƯỢC "bản này khác bản trước chỗ nào" và
  "bao nhiêu page đang dùng" TRƯỚC khi ai đó bấm áp. Không có phiên bản và không lùi được
  thì đừng cho sửa.

② KẾ THỪA BA TẦNG PHẢI NÓI RÕ ĐANG KẾ THỪA TỪ ĐÂU
  Cây kịch bản: sản phẩm → nước → page. Page không có bản riêng thì DÙNG bản tầng trên,
  và API phải nói rõ "kế thừa từ tầng nào" chứ không trả về im lặng. Marketer sửa nhầm tầng
  sản phẩm là đổi kịch bản của mọi page dưới nó.

═══ NGHIỆM THU — BẰNG SỐ, KHÔNG BẰNG "CHẠY ĐƯỢC" ═══
Ba việc bắt buộc mọi module:
  - node --env-file=.env --test test/*.test.* xanh
  - Truy vấn không bối cảnh team → NÉM LỖI, không trả rỗng
  - Truyền tay team_id của team khác → bị chặn, CÓ ghi nhật ký
Và thêm một việc mới của giai đoạn 2, rút từ bài học 1:
  - Mỗi module đụng dữ liệu phải có ÍT NHẤT MỘT phép chạy trên PostgreSQL THẬT
    (VPS đã có Postgres 16, CSDL aicloser_v3, DATABASE_URL_V3 trong .env) trước khi báo xong.
    Bản cài giả để chạy nhanh, KHÔNG phải để chứng minh.
Với mọi thay đổi chạm cách bot nói: chạy ít nhất BA lượt và đánh giá cả ba — model không tất
định. Chạy trên máy chủ, dùng psid giả TEST_*.

═══ CÁCH LÀM VIỆC ═══
- Nạp skill tho-thi-cong trước khi nhận phiếu. Nếu bạn là tổng thì nạp tong-dieu-phoi.
- Mỗi module xong: cập nhật docs/v3/04-TIEN-DO.md + 3 dòng vào §10 sổ điều hành, rồi commit
  MANG PATHSPEC (git commit -- <file>), cấm git add -A.
- Chỗ nào spec chưa rõ thì HỎI, đừng đoán. Đoán sai ở trục dữ liệu là hỏng nghiệp vụ thật.
- Chỗ nào phải tự quyết thì ghi vào §9 sổ nợ kèm lý do.

Bắt đầu: đọc năm tài liệu trên, rồi báo lại bạn hiểu hai phiếu B-Y1/B-Y2 thế nào và định
cắt G2-A1 ra sao. Chưa viết code vội.
````

---

## Prompt cho NGƯỜI B — màn hình, giai đoạn 2

````text
Bạn là người viết code màn hình của AI Closer v3, tiếp giai đoạn 2. Thư mục:
messenger-closer. Nhánh: main.

═══ BỐN LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. .env máy cá nhân phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8.
4. Không đụng 62 file phẳng ngay dưới src/ và năm file bộ não: prompts.js closer.js
   tools.js fast-lane.js outbound-guard.js.

═══ BẠN ĐANG THỪA HƯỞNG GÌ — đọc để KHÔNG viết lại ═══
Giai đoạn 1 của vai B đã xong và đang chạy. Dùng lại NGUYÊN, đừng viết mới:
  v3/src/auth/*        đăng nhập, chọn team, hai vai, vé ký HMAC, chặn xuyên team
  v3/src/audit/*       nhật ký chỉ-thêm, che chỗ nhạy cảm, lớp Express tự ghi
  v3/src/model/*       lớp model bốn nhà, dự phòng, kho khoá mã hoá, nạp nóng
  v3/src/ui/dispatch/* bảng điều phối + màn chi tiết (khuôn màn hình để chép theo)
  v3/src/noi-day/*     mảnh nối xuống tầng truy vấn thật của người A
  v3/src/vai-b.js      NỐI DÂY MỘT LỜI GỌI — dùng dungPhanB(), đừng nối tay 12 chỗ
  v3/xem-thu.js        máy chủ xem thử dữ liệu giả (đang chạy VPS cổng 3101)
  v3/chay-that.js      máy chủ dữ liệu thật (đang chạy VPS cổng 3102)
Trước khi viết bất cứ hàm nào, tìm trong v3/src/ xem đã có chưa.

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/gd2/00-KE-HOACH-GD2.md   — kế hoạch, ĐỌC KỸ mục "sáu bài học"
2. docs/v3/SO-TAY-VAI-B.md          — 25 chỗ tự quyết của giai đoạn 1 kèm lý do
3. docs/v3/01-QUYET-DINH.md §6 §7 §9 §10
4. docs/v3/03-MAN-HINH.md           — 37 màn, kèm link bản vẽ tương tác
5. v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md — chỗ tầng truy vấn còn hẹp

═══ VIỆC CỦA BẠN — 5 sóng, 25 màn, ~16 ngày công ═══
SÓNG 0 · GỠ CHẶN (4 màn, làm TRƯỚC TIÊN — nó gỡ chặn cho cả giai đoạn 1)
  G2-B1  Cấu hình team      — gán page ↔ team · kết nối · thành viên và vai   2 ngày
  G2-B2  Page & Bot         — bật/tắt BOT AI · gán marketer · page trọng điểm 1 ngày
  G2-B3  Model AI & khoá    — bốn nhà, khoá từng team, quy giá ra tiền thật   1 ngày
  G2-B4  Kết nối & token    — kho token theo thứ tự dự phòng                  1 ngày
SÓNG 1 · BỘ NÃO AI (3 màn) 🟥                                                3 ngày
SÓNG 2 · KỊCH BẢN VÀ NỘI DUNG (5 màn)                                        3 ngày
SÓNG 3 · SỐ LIỆU (5 màn)                                                     2 ngày
SÓNG 4 · KHÁCH VÀ PHÂN QUYỀN (8 màn) 🟥                                      3 ngày

Chi tiết từng màn và tiêu chí nghiệm thu: docs/v3/gd2/00-KE-HOACH-GD2.md

VÌ SAO SÓNG 0 LÀM TRƯỚC: hôm nay 514/514 page còn nằm ở team kỹ thuật chua-phan, chưa ai
gán cho ba team nghiệp vụ, và KHÔNG CÓ MÀN HÌNH NÀO để gán. Nên mọi màn hình v3 đều rỗng.
Màn "Cấu hình team" của bạn là thứ gỡ chặn đó.

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
v3/src/ui/*  ·  v3/src/auth/*  ·  v3/src/audit/*  ·  v3/src/model/*  ·  v3/src/noi-day/*
v3/test/b/*  ·  v3/testkit/*  ·  v3/docs/*  ·  v3/xem-thu.js  ·  v3/chay-that.js
docs/v3/SO-TAY-VAI-B.md  ·  docs/v3/04-TIEN-DO.md

═══ FILE CẤM ĐỤNG ═══
db/*  ·  src/*  (CẢ src/db, src/pos, src/chat, src/orders — đất người A)
.env  ·  package.json

═══ BA CHỖ DỄ SAI NHẤT ═══

① MÀN HÌNH RỖNG PHẢI NÓI VÌ SAO RỖNG
  "Không có việc nào đang chờ" đọc như tin mừng, trong khi sự thật có thể là "chưa cài đặt
  xong". Đã dính thật 24/08: chủ dự án đăng nhập thấy bảng rỗng và tưởng màn hình hỏng.
  Mọi màn có trạng thái rỗng phải phân biệt "xong hết rồi" với "chưa cài đặt xong", và cái
  sau phải chỉ đường đi tiếp.

② BỘ LUẬT CHUNG ĐỘNG TỚI 51 PAGE CÙNG LÚC
  Màn "Bộ luật chung" là màn nguy hiểm nhất giai đoạn 2. Trước khi cho bấm áp, phải hiện:
  bản mới khác bản cũ chỗ nào, bao nhiêu page bị ảnh hưởng, và nút lùi về bản trước. Không
  có ba thứ đó thì đừng cho sửa.

③ CHUỖI HẰNG GÕ TAY HAI LẦN LÀ BOM HẸN GIỜ
  vai.ma thật là 'quan-tri' gạch NGANG. Giai đoạn 1 có HAI chỗ gõ 'quan_tri' gạch dưới, và
  hậu quả là mọi người dùng thành không có vai — mà màn hình trông y hệt phân quyền chạy
  đúng. Mã vai, mã trạng thái, tên bảng: NHẬP HẰNG, cấm gõ lại chuỗi. Bài test phải đọc
  thẳng db/migrate/001_nen.up.sql rồi so.

═══ NGHIỆM THU — BẰNG SỐ ═══
Mọi module:
  - node --env-file=.env --test v3/test/b/*.test.mjs xanh (hiện 316 bài)
  - Truy vấn không bối cảnh team → NÉM LỖI, không trả rỗng
  - Truyền tay team_id của team khác → bị chặn, CÓ ghi nhật ký
  - Việc/dữ liệu của team khác → 404, KHÔNG phải 403 (403 là xác nhận nó có thật)
Và một việc mới của giai đoạn 2:
  - Mỗi màn phải XEM TẬN MẮT trên máy chủ trước khi báo xong — v3/chay-that.js cổng 3102
    (dữ liệu thật) hoặc v3/xem-thu.js cổng 3101 (dữ liệu giả). Test xanh KHÔNG chứng minh
    màn hình dùng được: giai đoạn 1 có ba lỗi chỉ lộ ra khi mở trình duyệt.
  - Màn hình phải chạy được ở khổ điện thoại 375px, không cuộn ngang.

═══ CÁCH LÀM VIỆC ═══
- Nối vào ứng dụng bằng dungPhanB() — đừng nối tay, hai cách nối sai đã xảy ra thật.
- Mỗi màn xong: cập nhật docs/v3/SO-TAY-VAI-B.md (mục "chỗ tự quyết") + docs/v3/04-TIEN-DO.md,
  rồi commit MANG PATHSPEC, cấm git add -A.
- Chỗ nào cần người A mở đường thì PHÁT PHIẾU (khuôn: docs/thi-cong/PHIEU-MAU.md), đừng tự
  viết SQL vào đất của A. Hai phiếu mẫu đã có: PHIEU-B-Y1, PHIEU-B-Y2.
- Chỗ nào spec chưa rõ thì HỎI. Chỗ nào phải tự quyết thì ghi sổ tay kèm lý do và đánh đổi.

Bắt đầu: đọc năm tài liệu trên, rồi báo lại bạn hiểu sóng 0 thế nào và định cắt màn
"Cấu hình team" ra sao. Chưa viết code vội.
````

---

## Việc NGƯỜI phải xong song song — không chờ code

Xếp bốn việc này vào lịch **trước**, vì giai đoạn 1 đã chứng minh chúng mới là thứ quyết định
lịch chứ không phải code:

| Việc | Chặn gì | Ai làm |
|---|---|---|
| **Nạp tiền tài khoản AI** (Kimi hoặc Anthropic) | Bot đang chết. Chặn mọi thứ | chủ dự án |
| **Chốt page nào thuộc team nào** | Mọi màn hình v3 rỗng cho tới khi xong | chủ dự án |
| **Chốt danh sách marketer** cho 314 page | Báo cáo cắt theo marketer trống | chủ dự án |
| **Duyệt nội dung bộ luật chung 10 mục** | Sóng 1 không có gì để hiển thị | quản trị nội dung |
