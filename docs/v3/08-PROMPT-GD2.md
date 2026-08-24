# PROMPT GIAO VIỆC — GIAI ĐOẠN 2

> Dán nguyên một trong hai prompt dưới đây vào phiên Claude Code mới của từng người.
> Mỗi prompt tự chứa đủ bối cảnh — người nhận không cần đọc gì trước.
> Kế hoạch đầy đủ: `docs/v3/07-KE-HOACH-GD2.md`.

---

## Prompt cho NGƯỜI B — quản trị, phân quyền, số liệu

````text
Bạn là người viết code cho dự án AI Closer v3, giai đoạn 2. Bạn giữ QUẢN TRỊ và SỐ LIỆU:
màn cấu hình, phân quyền năm vai, và toàn bộ báo cáo.

Việc đầu tiên của bạn KHÔNG phải giai đoạn 2 — nó đang gỡ kẹt cho giai đoạn 1. Đọc kỹ mục
"VÌ SAO BẠN LÀM TRƯỚC" bên dưới.

Có một người thứ hai (người A) làm bộ não AI, kịch bản, sản phẩm. Hai người không sửa chung file.

═══ BỐN LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. `.env` ở máy này phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
   Thiếu dòng này là máy này gửi tin cho khách thật, trùng với máy chủ đang chạy.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm remote, không deploy nơi khác.
4. KHÔNG đụng bản đang chạy: 62 file phẳng ngay dưới src/ đang phục vụ 51 page khách thật,
   và năm file bộ não chat CẤM SỬA: prompts.js closer.js tools.js fast-lane.js outbound-guard.js

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/07-KE-HOACH-GD2.md     — kế hoạch giai đoạn 2, mục 0 và mục G1, G5
2. docs/v3/SO-TAY-VAI-B.md        — 25 chỗ tự quyết của giai đoạn 1, kèm lý do và đánh đổi
3. v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md — chỗ lệch đã kê, ba chỗ CHẶN
4. docs/v3/ban-giao/luoc-do-v1.md và tang-truy-van-v1.md — lược đồ và tầng truy vấn thật
5. docs/v3/01-QUYET-DINH.md mục 8 (ba team) và mục 9 (vai và quyền)
6. docs/v3/03-MAN-HINH.md nhóm 1, 2, 7 — kèm link bản vẽ tương tác

═══ BA BÀI HỌC GIAI ĐOẠN 1 — ĐÃ TRẢ GIÁ, ĐỪNG TRẢ LẠI ═══

① BẢN CÀI GIẢ DỄ TÍNH HƠN BẢN THẬT.
   313 bài test xanh trên `v3/testkit/db-gia.js` KHÔNG chứng minh gì về cơ sở dữ liệu thật.
   Nối vào thật thì vấp bốn chỗ liên tiếp: tầng truy vấn thiếu IN, thiếu LIMIT, thiếu toán tử
   so sánh, và Postgres trả `Date` trong khi code tính bằng mốc mili-giây (đồng hồ ra NaN,
   không báo gì).
   ⇒ Giai đoạn 2 CHẠY TRÊN POSTGRES THẬT NGAY TỪ MODULE ĐẦU. Hạ tầng đã dựng sẵn trên VPS:
     PostgreSQL 16, CSDL `aicloser_v3`, 21 bảng, 514 page + 28.953 hội thoại đã di trú.
     Mảnh nối có sẵn ở `v3/src/noi-day/cong-du-lieu-that.js`.

② CHUỖI GÕ TAY HAI CHỖ = BẪY IM LẶNG.
   `vai.ma` thật là 'quan-tri' gạch NGANG; code so 'quan_tri' gạch DƯỚI, ở HAI file. Hậu quả:
   mọi người dùng thành không có vai, cửa chặn sạch, mà màn hình trông y hệt phân quyền chạy
   đúng — sale vẫn vào được nên không ai báo.
   ⇒ Mã vai, mã trạng thái, tên bảng: NHẬP HẰNG, cấm gõ lại chuỗi. Và bài test phải ĐỌC THẲNG
     db/migrate/001_nen.up.sql rồi so — gõ tay vào test là đẻ bản sao thứ hai của cùng một sự thật.

③ MÀN HÌNH RỖNG PHẢI NÓI ĐÚNG NGHĨA.
   "Không có việc nào đang chờ" đọc như tin mừng, trong khi sự thật là chưa cài đặt xong.
   ⇒ Mọi màn phải phân biệt "CHƯA CÓ DỮ LIỆU" với "ĐÃ XONG HẾT". Mẫu có sẵn ở
     v3/src/ui/dispatch/trang/dieu-phoi.html.

═══ VÌ SAO BẠN LÀM TRƯỚC — luồng G1 gỡ kẹt giai đoạn 1 ═══

Giai đoạn 1 code xong nhưng KHÔNG CHẠY ĐƯỢC, và ba chỗ kẹt đều là màn hình của bạn:

  · 514/514 page và 28.953/28.953 hội thoại đang đậu ở team KỸ THUẬT `chua-phan`. Ba team
    nghiệp vụ có 0 page. Nên bảng điều phối rỗng vĩnh viễn, và không có màn hình nào để gán.
    → Màn "Page & Bot" + "Cấu hình team" của bạn gỡ cái này.
  · Chưa có khoá bốn nhà model trong cơ sở dữ liệu → màn "Model AI & khoá" của bạn.
  · Chưa chọn 3 page thử / 3 page đối chứng → màn "Page & Bot" của bạn.

Người A gần như không làm được gì trước khi bạn giao năm vai và khung màn hình dùng chung.
Bạn là ĐƯỜNG GĂNG của tuần 1.

═══ VIỆC CỦA BẠN — 13 MÀN, 15 NGÀY CÔNG ═══

G1 · QUẢN TRỊ & CẤU HÌNH — 5 màn · 6 ngày  ← LÀM TRƯỚC TIÊN
   Cấu hình team · Page & Bot · Model AI & khoá · Kết nối & token · Nhật ký thao tác
   Kèm: nới hai vai của L0-M3 lên NĂM vai (quan-tri · marketer · sale · quan-ly · duyet-kich-ban)

G5 · SỐ LIỆU & BÁO CÁO — 8 màn · 7 ngày
   Trang chủ · Báo cáo · Chi phí AI · Hiệu quả kịch bản · Sức khỏe hệ thống ·
   Nguồn khách vào · Hồ sơ khách hàng · Rủi ro hoàn hàng

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
v3/src/ui/admin/*  ·  v3/src/ui/report/*  ·  v3/src/auth/*  ·  v3/src/audit/*
v3/src/model/*  ·  v3/src/noi-day/*  ·  v3/src/vai-b.js  ·  v3/test/b/*  ·  v3/testkit/*

═══ FILE CẤM ĐỤNG ═══
v3/src/ui/brain/*  ·  v3/src/ui/script/*  ·  v3/src/ui/product/*    → của người A
v3/src/ui/dispatch/*                                                 → xong rồi, đừng đụng
db/migrate/*  ·  src/db/*  ·  src/pos/*  ·  src/chat/*  ·  src/orders/*  → của người A
src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js
mọi file phẳng khác dưới src/  ·  .env

═══ DÙNG LẠI — KIỂM TRƯỚC KHI VIẾT MỚI ═══
Đây là luồng dùng lại nhiều nhất cả dự án. Trước khi viết bất cứ hàm nào, tìm trong src/:
  src/economics.js   413 dòng — chi phí theo page × kịch bản × lane, có sẵn hàm tra ngược
  src/health.js      408 dòng — 9 chỉ số sức khoẻ, đã có ngưỡng
  src/experiment.js  459 dòng — A/B theo phễu
  src/report.js       83 dòng — báo cáo tuần
  src/ai-log.js      302 dòng — Sổ AI, nguồn số duy nhất
Và của chính bạn ở giai đoạn 1: v3/src/auth/* (vé, vai, cổng danh tính) · v3/src/audit/* ·
v3/src/model/* (tomTatCauHinh trả khoá dạng {daCo, duoi}, không trả khoá thật).

═══ NĂM ĐIỂM BÀN GIAO ═══
1. NĂM VAI + màn phân quyền — BẠN làm, A dùng. Chốt CUỐI NGÀY 2. A chờ cái này.
2. KHUNG MÀN HÌNH dùng chung (sidebar, thanh trên, bảng, phân trang) — BẠN làm, A dùng.
   Cuối ngày 2. Dựng một lần, cả hai dùng — đừng để hai người đẻ hai bộ khung.
3. GÁN PAGE CHO TEAM — BẠN làm. Cuối ngày 3. Không có nó thì MỌI màn của cả hai đều rỗng.
4. san_pham/goi_gia có dữ liệu thật — A làm, BẠN dùng ở màn Chi phí AI và Báo cáo. Cuối tuần 2.
5. Bộ luật chung có phiên bản — A làm, BẠN dùng ở màn Hiệu quả kịch bản. Cuối tuần 2.

═══ NGHIỆM THU — BẰNG SỐ, KHÔNG BẰNG "CHẠY ĐƯỢC" ═══
Mọi module:
  - npm test xanh (chạy: node --env-file=.env --test 'v3/test/b/*.test.mjs')
  - Truy vấn không có bối cảnh team → NÉM LỖI, không trả dữ liệu rỗng
  - Truyền tay team_id của team khác → bị chặn, CÓ ghi nhật ký
  - Chạy thật trên Postgres, không chỉ trên bản cài giả

G1 thêm:
  - Gán 514 page cho ba team BẰNG MÀN HÌNH → bảng điều phối hết rỗng
  - Nhập khoá một nhà model → lượt chat kế tiếp đi đúng khoá mới, KHÔNG khởi động lại
  - Khoá trong CSDL là bản mã hoá, SELECT ra không đọc được
  - Bật/tắt bot một page → có dòng nhật ký ghi ai bấm lúc nào
  - Vai `sale` mở màn Cấu hình team → 403, có ghi nhật ký
  - Test đọc THẲNG db/migrate/001_nen.up.sql rồi so năm mã vai

G5 thêm:
  - Số trên màn KHỚP với so_ai, có nút tra ngược ra đúng những dòng sổ đẻ ra con số đó
  - Báo cáo TÁCH HAI LUỒNG đơn — gộp chung là sai vì hai thước khác nhau
  - A/B chưa đủ mẫu → hiện "chưa kết luận", KHÔNG hiện tỉ lệ
  - Rủi ro hoàn chia bốn tầng → tách đúng 144 khách hoàn 30–65% đang bị gộp nhầm

═══ CÁCH LÀM VIỆC ═══
- Bắt đầu bằng G1, và trong G1 bắt đầu bằng NĂM VAI + KHUNG MÀN HÌNH (hai điểm bàn giao A chờ).
- Mỗi màn xong thì cập nhật docs/v3/04-TIEN-DO.md và docs/v3/SO-TAY-VAI-B.md rồi mới sang màn sau.
- Commit nhỏ, mang pathspec (git commit -- <file>), thông điệp tiếng Việt nói VÌ SAO.
- Chỗ nào spec chưa rõ thì HỎI, đừng tự đoán. Chỗ nào phải tự quyết thì ghi vào sổ tay mục
  "Chỗ tự quyết" kèm lý do và đánh đổi.

Bắt đầu: đọc sáu tài liệu ở trên, rồi báo lại bạn hiểu phần việc thế nào và định cắt G1 ra sao.
Chưa viết code vội.
````

---

## Prompt cho NGƯỜI A — bộ não AI, kịch bản, sản phẩm

````text
Bạn là người viết code cho dự án AI Closer v3, giai đoạn 2. Bạn giữ BỘ NÃO AI: bộ luật chung,
thư viện kỹ năng, kịch bản ba tầng, và sản phẩm.

Đây là phần quyết định BOT TƯ VẤN GIỎI HAY DỞ. Giai đoạn 1 đã làm cho bot chạy được;
giai đoạn 2 làm cho người không biết code cũng sửa được cách bot nói.

Có một người thứ hai (người B) làm quản trị, phân quyền, báo cáo. Hai người không sửa chung file.

═══ BỐN LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. `.env` ở máy này phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm remote, không deploy nơi khác.
4. KHÔNG đụng bản đang chạy: 62 file phẳng ngay dưới src/ đang phục vụ 51 page khách thật,
   và năm file bộ não chat CẤM SỬA: prompts.js closer.js tools.js fast-lane.js outbound-guard.js
   ⚠️ Luật 4 đặc biệt quan trọng với bạn: việc của bạn là ĐƯA NỘI DUNG của prompts.js ra màn
   hình, KHÔNG phải sửa prompts.js. Đọc nó, chép nội dung vào bảng, rồi để nguyên file.

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/07-KE-HOACH-GD2.md     — kế hoạch giai đoạn 2, mục 0 và mục G2, G3, G4
2. docs/v3/01-QUYET-DINH.md       — mục 6 (prompt bốn khối) và mục 12 (chỗ còn hở). ĐỌC KỸ mục 6.
3. docs/v3/ban-giao/luoc-do-v1.md — lược đồ thật, nhất là kich_ban / bo_luat_chung / ky_nang
4. docs/thi-cong/SO-DIEU-HANH-THI-CONG.md §9 — sổ nợ giai đoạn 1, có việc thuộc phần bạn
5. docs/v3/03-MAN-HINH.md nhóm 4, 5, 6 — kèm link bản vẽ tương tác
6. README.md — 14 nguyên tắc AI chat với khách. LUẬT HÀNH VI, không phải tài liệu kỹ thuật.

═══ VIỆC CỦA BẠN — 11 MÀN, 15 NGÀY CÔNG ═══

G2 · BỘ NÃO AI BA TẦNG — 3 màn · 5 ngày   ← làm trước
   Bộ luật chung · Thư viện kỹ năng · Prompt của page

G3 · KỊCH BẢN & NỘI DUNG — 5 màn · 6 ngày
   Kịch bản · Soạn kịch bản · Nhập kịch bản từ Pancake · Lớp trả lời 0 đồng · Thư viện ảnh

G4 · SẢN PHẨM & CỬA KIỂM — 3 màn · 4 ngày
   Sản phẩm & kho · Cửa kiểm sẵn sàng · Đưa sản phẩm mới lên chạy

═══ HAI CHỖ QUAN TRỌNG NHẤT, ĐỌC KỸ ═══

① BỘ LUẬT CHUNG ĐANG BỊ KHOÁ TRONG MÃ NGUỒN
   2.256 token quy tắc cứng, dùng chung mọi page, hiện nằm trong src/prompts.js — muốn đổi
   phải sửa mã nguồn rồi deploy. Marketer KHÔNG NHÌN THẤY. Mà đó mới là khối quyết định bot
   tư vấn giỏi hay dở.
   Di trú đã nạp sẵn bản v1 vào bảng `bo_luat_chung`. Việc của bạn là làm màn hình để sửa nó,
   có phiên bản, có duyệt, có xem lại bản cũ và biết ai duyệt lúc nào.

② TẦNG KỸ NĂNG LÀ MỚI HOÀN TOÀN, VÀ CÓ SỐ ĐO CHỨNG MINH NÓ CẦN
   Hai sản phẩm CÓ SIZE đang hoàn 26,8% và 19,2%. Sản phẩm KHÔNG size hoàn 9,3%.
   Cả hai sản phẩm kia đều CHƯA BẬT kỹ năng hỏi size.
   Thư viện kỹ năng sinh ra để bịt đúng lỗ đó: khối tư vấn dùng lại được, bật cho đúng nhóm
   sản phẩm cần. Lược đồ đã có bảng `ky_nang` với cột `bat_cho_nhom_sp text[]`.

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
v3/src/ui/brain/*  ·  v3/src/ui/script/*  ·  v3/src/ui/product/*
v3/src/chat/*  ·  src/pos/*  (nếu cần nới, và chỉ khi cần)
db/migrate/*  (nếu phải thêm cột — thêm migration mới, KHÔNG sửa migration cũ)
v3/test/a/*

═══ FILE CẤM ĐỤNG ═══
v3/src/ui/admin/*  ·  v3/src/ui/report/*  ·  v3/src/auth/*  ·  v3/src/audit/*
v3/src/model/*  ·  v3/src/noi-day/*  ·  v3/src/vai-b.js  ·  v3/src/ui/dispatch/*   → của người B
src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js  → CẤM TUYỆT ĐỐI
mọi file phẳng khác dưới src/  ·  .env

═══ DÙNG LẠI — KIỂM TRƯỚC KHI VIẾT MỚI ═══
Kế hoạch ghi rõ ba nhóm này "dùng nguyên, không viết lại":
  src/kb.js            549 dòng — đọc dữ liệu sản phẩm, cấu hình page
  src/import-script.js 150 dòng — bóc file quick_replies của Pancake
  src/readiness.js     273 dòng — cửa kiểm sẵn sàng, sáu điều kiện
  src/rule-store.js    531 dòng — kho luật từ khoá
  src/miner.js         548 dòng — mổ hội thoại
  src/template-learner.js 334 dòng — học mẫu
Và cửa POS của L1-M1 (docDanhMuc, tồn kho) bạn đã viết ở giai đoạn 1.

═══ HAI THỨ BẠN CHỜ NGƯỜI B ═══
1. NĂM VAI + màn phân quyền — cuối ngày 2. Mọi màn của bạn phải chặn theo vai.
2. KHUNG MÀN HÌNH dùng chung — cuối ngày 2. ĐỪNG dựng bộ khung thứ hai.
Trước khi có hai thứ đó, làm phần KHÔNG CÓ GIAO DIỆN của G2: tách bộ luật chung ra khỏi
src/prompts.js vào bảng bo_luat_chung, và dựng đường ráp bốn khối.

Và hai thứ B chờ bạn:
3. san_pham/goi_gia có dữ liệu THẬT từ POS — B cần cho màn Chi phí AI và Báo cáo. Cuối tuần 2.
   Hiện hai bảng này đang RỖNG (0 dòng) dù cửa POS đọc được — chưa ai chạy nạp.
4. Bộ luật chung có phiên bản — B cần cho màn Hiệu quả kịch bản. Cuối tuần 2.

═══ NGHIỆM THU — BẰNG SỐ, VÀ CHẠY BA LƯỢT ═══
Mọi module: npm test xanh · truy vấn không bối cảnh team thì ném lỗi · chạy thật trên Postgres.

G2 thêm:
  - Sửa bộ luật chung trên màn hình → lượt chat kế tiếp dùng bản mới, KHÔNG deploy
  - Màn "Prompt của page" hiện đúng BỐN khối với số token từng khối, tổng khớp so_ai
  - Bật kỹ năng "hỏi size" cho một nhóm sản phẩm → prompt của page thuộc nhóm đó dài thêm
    đúng khối đó, page khác KHÔNG đổi
  - Bản cũ xem lại được, biết ai duyệt lúc nào

G3 thêm:
  - Soạn kịch bản mới → page đó dùng bản mới ở lượt chat kế tiếp
  - Giữ CẢ HAI bản: noi_dung_nguoi (6 trường marketer viết) và noi_dung_may (khối chữ vào prompt)
  - Tầng dưới không có bản riêng → hiện "Kế thừa", dùng đúng bản tầng trên
  - Thả file quick_replies thật → bóc đúng bảng giá, số dòng khớp file
  - Nhiều nhất MỘT bản LIVE mỗi page

G4 thêm:
  - Đồng bộ POS → san_pham có TÊN và MÃ thật, không còn suy ngược từ 25 đơn cũ
  - Đánh dấu hết hàng → bot không chào bán sản phẩm đó ở lượt kế tiếp
  - Sản phẩm mới chưa có đơn nào → VẪN tạo được đơn (lỗ cũ ở 01-QUYET-DINH mục 12)

⚠️ VỚI MỌI THAY ĐỔI CHẠM VÀO CÁCH BOT NÓI:
  - Chạy ÍT NHẤT BA LƯỢT và đánh giá cả ba. Model không tất định, một lần đúng không chứng
    minh gì.
  - Chạy TRÊN MÁY CHỦ, không chạy ở máy cá nhân (máy cá nhân thiếu dữ liệu sản phẩm thật nên
    báo page_no_kb rồi bàn giao ngay, không phản ánh thực tế).
  - Dùng psid giả TEST_* để không đụng khách thật.
  - Bộ ca tối thiểu: hỏi giá tin đầu · từ chối hai lần · đòi khiếu nại/đổi trả/hoàn tiền ·
    khách nói ngôn ngữ lạ · khách đã có đơn nhắn tiếp · đọc lại lời bot xem có lọt chữ kỹ thuật.

═══ CÁCH LÀM VIỆC ═══
- Bắt đầu bằng G2, phần không có giao diện trước (chờ B giao khung màn hình và năm vai).
- Mỗi màn xong thì cập nhật docs/v3/04-TIEN-DO.md và §10 sổ điều hành rồi mới sang màn sau.
- Commit nhỏ, mang pathspec (git commit -- <file>), cấm git add -A.
- Chỗ nào spec chưa rõ thì HỎI. Đoán sai ở bộ não chat là hỏng cách bot nói với khách thật.

Bắt đầu: đọc sáu tài liệu ở trên, rồi báo lại bạn hiểu phần việc thế nào và định cắt G2 ra sao.
Chưa viết code vội.
````

---

## Trước khi dán hai prompt trên — ba việc phải xong

| # | Việc | Vì sao chặn |
|---|---|---|
| 1 | **Nạp tiền tài khoản AI** | Bot đang chết. Mọi tiêu chí có chữ *"lượt chat kế tiếp"* không đo được |
| 2 | **Chốt page nào thuộc team nào** | B làm được màn hình, nhưng người bấm cần biết chia thế nào. 514 page, ba team |
| 3 | **Chốt năm vai ai được làm gì** | `01-QUYET-DINH.md` mục 9 mới nêu tên năm vai, chưa có bảng quyền chi tiết. G1 không đoán hộ được |

Thiếu (1) thì hai người vẫn code được nhưng **không nghiệm thu được**.
Thiếu (2) và (3) thì **người B không bắt đầu được**, mà B là đường găng tuần 1.
