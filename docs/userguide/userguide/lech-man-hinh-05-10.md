# Lỗi và chỗ màn nói lệch — phát hiện khi viết cẩm nang (05–06/10/2026)

Đối chiếu trên mã nhánh `vao-ui-v3-17-09` @ HEAD `4fc4e0e` (mã trùng bản đang chạy `8dc9bcd`).
Danh sách này KHÔNG phải một phần của cẩm nang — là đầu vào cho phiếu sửa theo sổ điều hành.

## A. Lỗi đã kiểm trong mã — nên sửa trước khi phát cẩm nang cho sale

| # | Lỗi | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| 1 | Hộp thư: bấm chuột vào tab / dòng hội thoại không ăn | `.lien-ke::after { position:absolute; inset:0 }` (`v3/src/ui/chung/kieu.css:1029`) áp cho hai nút `lien-ke` ở `ban-hoi-thoai.html:38,47` nằm NGOÀI `.item-list[data-bam] .item` (nơi có `position:relative`) ⇒ lớp phủ của «Mọi hội thoại gần đây» trải kín cột trái. Đo bằng chuột thật trên Chromium (bản xem thử). | Sale không mở được hội thoại / đổi tab bằng chuột |
| 2 | Hộp thư + Việc đang chờ lỗi ngay khi có người «Nhận việc» | `v3/src/ui/dispatch/kho-viec.js:295` đọc `nguoi_dung` qua `congTruyVan` → `layNhieu` → `kiemTraTenBang` ném vì `nguoi_dung` không thuộc `BANG_NGHIEP_VU_CHUAN` (`src/db/truy-van.js:33,83`) | `/api/ban-hoi-thoai`, `/api/dieu-phoi/hang-cho` 500 khi có việc mở đã có người nhận |
| 3 | «Nhập từ file Pancake» luôn 500 | `v3/chay-that.js:63` lấy `parsePancakeScript` từ `src/kb.js` — hàm không còn (gỡ cùng `src/import-script.js` ở MB4) | Nút trên màn không dùng được |
| 4 | Màn «Câu trả lời sẵn» không đổi câu bot gửi | Bot chỉ cộng `mau_0_dong.so_lan_chan` (`src/chat/handler-v3.js:567`); câu thật lấy từ 5 ô «Trả lời nhanh» của lời bot | Người sửa mẫu tưởng bot đổi lời |
| 5 | Màn Vận hành xoá dòng tóm tắt «Tin bị lọc» và hộp «Chế độ diễn tập đang BẬT/TẮT» | `veTomTatDienTap` vẽ vào `#bang-tin`, rồi `message("")` cuối `load()` (`v3/src/ui/van-hanh/trang/van-hanh.js:324`) xoá | Quản trị không biết chạy thử đang bật hay tắt |

## B. Lệch giữa màn và thiết kế / tài liệu (gom từ người viết)

## Sale (Hộp thư)
- [NẶNG] Bot tự chuyển người (khiếu nại, hết lượt, page chưa kịch bản, cửa kiểm chặn, bot gọi chuyển người, sale đã gõ trên Pancake) chỉ đổi người giữ → Sale, KHÔNG tạo việc ⇒ không vào «Cần bạn», chỉ thấy ở «Mọi hội thoại gần đây». Việc chỉ sinh khi sale bấm «Nhận thay bot», quản trị «Chuyển nhân viên xử lý», hoặc luồng đơn trang bán hàng. README + 01 §10 nói ngược lại.
- [NẶNG] «Trả lại cho bot» ở đóng việc chỉ ghi kết quả; bot vẫn im. Chỉ Quản trị «Cho AI tiếp tục» ở Cài đặt › Vận hành tab Hội thoại; hội thoại từng có đơn bot chốt thì không trả lại được.
- Khi cửa tạo đơn đóng: nút «Duyệt → Chờ in» trên thẻ khoá, nhưng «Duyệt — tạo đơn POS» trong form vẫn bấm được → lỗi thô có tên biến cấu hình.
- OQ-SA-1: ô «Tiền» thẻ đơn / dòng Đơn chờ có thể chưa chia hệ số tiền tệ (gấp 100 lần?).
- OQ-SA-2: link dòng «Đơn không gắn hội thoại» trỏ đường máy chủ không đăng ký.
- Hộp thư không có lọc «cả ba team» như 01 §10.
- Bộ đếm «quá 10 phút chưa ai nhận» đếm cả việc đã nhận chưa đóng.
- «Nhận thay bot» tạo việc nhưng chưa gán người bấm — phải bấm «Nhận việc» thêm.
- Khung đóng việc hiện «Việc này đang có người giữ» với chính tên mình.
- Hộp «Nghi trùng đơn» hiện cả khi chỉ «chưa tra được».
- Thẻ đơn chỉ hiện đơn chờ duyệt mới nhất của hội thoại.
- Màn Tìm khách: không cột «Hoàn»; cột «Hàng» luôn «—»; trạng thái kho hàng là mã số.
- Lộ chữ kỹ thuật: «(bot v3)», «Sổ AI cũ», tên tệp job, «psid», lỗi «taoDon:», «cua1:», «unknown_la_dong:».
- Ô «Vì sao chuyển» hiện mã thô («complaint», «page_no_kb», …).

## Số liệu
- Chi phí AI chỉ có số tới 28/08 (Sổ AI cũ); bot đang bán thật (pancake-tool) không lên màn.
- Lối sang Vận hành hứa «Lọc theo page · khách · khoảng …» nhưng tab chỉ có «Gom theo:».
- Marketer: chỉ khối «Đơn POS của team — theo marketer» lọc theo marketer; còn lại hiện cả team.
- Bảng Theo page dồn «Tốn tiền, 0 đơn» xuống dưới.
- «Đơn» ở Chi phí AI chỉ là đơn bot tự tạo.
- Bốn trang 403 của Số liệu ghi nhầm «Màn Cửa kiểm sẵn sàng cần … quan-tri, quan-ly, marketer».
- Khung trống còn nói «xem Cửa kiểm sẵn sàng» (tên cũ).
- Lộ chữ kỹ thuật: «đích phiếu BH8», «stats.json», «thiếu V3_BQ_KHOA», tên bảng, «conv-state», «tang_hoan», «Sổ v3», «bot v3».
- Một tầng hoàn ba tên (Rủi ro hoàn hàng · Số liệu · Hộp thư).
- 03-MAN-HINH tự mâu thuẫn bốn/ba tab Số liệu (mã: ba).

## Quản trị — cài đặt & vận hành
- [NẶNG] Không có nút khoá/mở khoá tay tài khoản; «Đặt mật khẩu đầu tiên» đòi đã nối đồng bộ HRM. Hệ chưa có đặt lại mật khẩu (OQ-QT-5).
- Vận hành không có tab «đối chiếu tin lỗi» riêng: «Đối chiếu» dẫn tab «Hội thoại» không lọc/đánh dấu lỗi; «Đã đối chiếu, bàn giao sale» KHÔNG tạo việc.
- Quản trị có «Cho AI tiếp tục» ở Vận hành (có điều kiện).
- Tab «Tin bị lọc» không cắt 24 giờ; Hệ còn sống ghi «Năm cửa lọc» nhưng mã có 6 lý do; phân trang tải 100 nhảy 50.
- Bắt đầu: «Việc phải nhờ…» có 2 việc nhưng chữ ghi «Ba việc này» / «Còn ba cái van».
- Lộ tên biến môi trường (MODEL_CLOSER, KIMI_API_KEY, V3_KHOA_…, V3_DIEN_TAP, V3_NAP_THE_CHAN, V3_BQ_KHOA, PANCAKE_READONLY) ở Bắt đầu, Model AI, Vận hành, Kết nối.
- Kết nối › HRM còn ghi «Tạo tài khoản từ HRM: chưa làm»; thẻ Marketer ở Người và team ghi «Phụ trách: Chưa có nguồn … CHƯA làm» — cả hai đã chạy.
- Đèn «Marketer phụ trách» đếm ô marketer cũ của page; đèn «Khoá API model» luôn xám ⇒ không bao giờ «Mọi đèn đều ổn». Nút tên màn cũ «Sang màn Kịch bản», «Sang màn Kết nối & token».
- 403 in nhầm «Màn Cửa kiểm sẵn sàng…» (Số liệu, Chi phí AI, Khách vào từ đâu, Rủi ro hoàn, Câu trả lời sẵn); Vận hành + Hộp thư trả 403 JSON thô; Sale mở «Việc của tôi» gặp «Chưa được gán vai».
- Đăng nhập lại sau hết phiên bỏ qua `?tiep=`.
- Chuyển page: «Đi theo: …» hiện tên bảng; hộp xác nhận kéo-về dùng chữ chuyển-đi; ô «Kéo về» xếp theo tên.
- Nhật ký: tên nhóm lọc không dấu; dòng đồng bộ HRM không thuộc nhóm nào.
- Chạy thử bật/tắt cho cả máy chủ.

## Marketer (Sản phẩm & Page)
- [LỖI — đã kiểm] «Nhập từ file Pancake» hỏng: v3/chay-that.js:63 lấy `parsePancakeScript` từ src/kb.js, hàm không còn (src/import-script.js gỡ ở MB4) ⇒ mỗi lượt nhập 500 «Lỗi máy chủ. Xem log.».
- [NẶNG — đã kiểm] Màn «Câu trả lời sẵn» (/lop-0-dong): bot KHÔNG đọc nội dung/từ khoá mẫu, chỉ cộng `so_lan_chan` (handler-v3.js:567). Câu bot gửi thật là 5 ô «Trả lời nhanh» ở tab «Lời bot». Phụ đề màn sai. Mã đếm `howto` không bao giờ khớp (lớp từ khoá phát `paano_gap`/`muon_dat`).
- [NẶNG] Ảnh: page đã gắn sản phẩm ⇒ tab «Ảnh» chỉ xem với mọi vai; màn bảo sửa ở Sản phẩm › Theo thị trường nhưng ở đó không có chỗ sửa ảnh (nợ N-GSP3B-ANH-MON-POS) ⇒ marketer không sửa ảnh được trên giao diện.
- Phạm vi marketer: trang một page + nội dung có lọc (403); chưa lọc: /prompt-page, /lop-0-dong, /thu-vien-anh, số ở /trang-chu, /api/kich-ban/page/:id.
- «Việc của tôi» (marketer): hai mục trỏ /san-sang → /page-bot ⇒ link tắt với marketer; số tính cả team; «Sản phẩm hết hàng» tính cả dòng chưa có số tồn; «Kịch bản chờ duyệt» bấm sang danh sách không khớp.
- «Sản phẩm & kho» marketer chưa có sản phẩm: vẫn bảo «Bấm «+ Thêm»» dù không có nút.
- «Đoạn chữ gửi cho AI»: khối «Sản phẩm và giá» không in kiến thức sản phẩm dù bot thật có đưa vào.
- Lưu/chạy lại lời bot: «AI đang đọc gì» và «Bật được chưa» không tự cập nhật — phải tải lại.
- Lời bot + kiến thức sản phẩm không có chống đè phiên bản (Chính sách·FAQ có).
- Cách tạm «xem chạy thử ở Vận hành» không dùng được cho marketer (chỉ Quản trị mở Vận hành).
- Page đã gắn: nút «Sửa ở Sản phẩm › … › Theo thị trường» dẫn marketer tới chỗ chỉ Quản trị sửa được.
- Lộ mã: «(phiếu LL14)», «diễn tập», «(LL11)», `that_gia · hoi_size · howto`, `so_lan_chan`.

## Chung (bot, quyền, đăng nhập)
- [NẶNG] Cổng bật bot đòi máy chủ đã bật «cách ghép lời mới»; nhật ký 05/10: chưa bật (0/582 page) ⇒ hôm nay không page nào bật được qua giao diện (OQ-CH-4).
- [NẶNG] Khi bật cách ghép lời mới, bộ ghép KHÔNG đưa Chính sách · FAQ · Phản đối vào đoạn chữ gửi AI; màn «Đoạn chữ gửi cho AI» cũng không có khối này — trong khi màn khoi-chung nói bot trích ba khối (OQ-CH-6).
- «Page phải gắn sản phẩm mới chat được» chưa hiệu lực đầy đủ: page chưa gắn vẫn bán theo «Bản sao theo page» tới GSP4.
- [NẶNG] Bật hàng loạt: màn cho chọn 10 page, máy chủ chặn bật quá 5 page / 10 phút ⇒ dừng ở page thứ 6.
- Marketer sửa được sản phẩm/giá/ảnh của page CHƯA gắn (tab «Sản phẩm & giá») — nhưng phạm vi marketer chỉ gồm page đã gắn sản phẩm mình ⇒ thực tế không tới được.
- Hộp kế hoạch HRM ghi «phiên giữ tới khi hết vé» — mã: khoá/rút vai cắt phiên ~30 giây.
- Dải bốn tầng ghi «④ Page — kịch bản · giá · ảnh của page», trái «không giá riêng theo page». Ô «Trả lời nhanh» ghi «Để trống là AI tự trả lời» nhưng hỏi giá/cách đặt có câu dựng sẵn.

## Quản trị — Sản phẩm & Page
- [NẶNG] Hai bộ điều kiện: «Bật được chưa»/«Còn thiếu gì» đọc 7 điều kiện (readiness.js), cổng bật kiểm 6 điều kiện khác (pageStatus) ⇒ page «Đủ điều kiện» vẫn bị cổng từ chối. Page đang bật luôn mang nhắc «Chưa đo máy chạy bot».
- [NẶNG] Gộp món: máy chủ bắt buộc SKU nhưng màn vẫn hiện nhóm không SKU + nút «Gộp thành 1 sản phẩm», «Tạm gộp theo số đầu tên» ⇒ bấm là lỗi.
- [NẶNG] Ba lối gắn phụ (cột «Sản phẩm gốc» ở Tất cả page, «Gắn vào sản phẩm» hàng loạt, ô tab Kỹ thuật) chỉ ghi sản phẩm, không ghi thị trường/marketer, không xoá «Không chuyển» ⇒ page chưa có cửa hàng thì bot không có món. Chỉ tab «Page đang bán» ghi đủ.
- Nút đi sửa dẫn sai: «Nhập giá bán» → Vận hành (từ chối lưu với page đã gắn); «Gán sản phẩm gốc» → lối gắn thiếu thị trường.
- Duyệt gợi ý AI: không có từ chối/xoá; màn không tự sinh đề xuất.
- Thêm thị trường cho gắn nhiều món cùng cửa hàng (biến thể), trái «đúng một món».
- Cổng bật không kiểm Botcake (ô «Đã tắt Botcake» chỉ là lời khai).
- Model hết tiền: Hệ còn sống ngụ ý có dự phòng; Bắt đầu nói dự phòng chưa nối.
- Lộ mã: «(phiếu LL15)», LL15/LL16 ở chú thích Tất cả page, «(V3_BQ_KHOA)», «Máy chủ chưa bật cấu hình prompt V3».
- «Bỏ sản phẩm», «Gỡ» món, «Gỡ» page không hỏi lại; chọn «— chưa gán —» marketer xoá tên marketer ở page đã gắn; lưu bậc giá không đối chiếu tiền tệ.
