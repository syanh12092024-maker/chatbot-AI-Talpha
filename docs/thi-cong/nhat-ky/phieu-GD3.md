# PHIẾU GD3 — CÀI ĐẶT TEAM, VÀ SỬA ĐƯỢC NGAY TRONG TAB

> Làm 25/09/2026 · làn 🟩 · đất B (`v3/src/ui/cai-dat-team/*`, `v3/src/ui/mot-page/*`,
> một dòng menu). Đo trên bản dev `aicloser_dev_1789621023909`, giao diện dựng TỪ REPO ở 3210.
> Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5 dòng GD3 + yêu cầu tiếp của người quyết.

## 1. Màn «Cài đặt team» — năm việc, làm một lần

Phụ lục A của kế hoạch: đường cài đặt hiện tại là **12 bước rải trên 7 màn**, và không màn
nào trả lời được «còn thiếu gì nữa thì team này chạy được» — trong khi **mọi dữ kiện để trả
lời đều đã nằm trong cơ sở dữ liệu**.

Màn mới `/cai-dat-team` hỏi năm câu bằng **đúng những bộ đọc các màn khác đang dùng**:

| # | Việc | Đo bằng | Đi đâu |
|---|---|---|---|
| 1 | Có người và vai trong team | `thanh_vien_team` | Người và team |
| 2 | Có tài khoản Pancake | kho token (cùng bộ với màn Kết nối và Sức khoẻ) | Kết nối |
| 3 | Có page trong team | `page` của team | Tất cả page |
| 4 | Chọn model AI và dán khoá | `cau_hinh_model` | Model AI |
| 5 | Nối kho hàng, kéo sản phẩm kèm giá | `ket_noi_pos` · `san_pham` · `goi_gia` | Kết nối |

**Ba thứ màn này KHÔNG làm:** không dựng dữ liệu mới · không thêm một cửa ghi nào (mỗi bước
dẫn sang màn vốn có cửa ghi, lớp vai và nhật ký của nó) · không trộn việc của người quản trị
hệ thống vào danh sách.

## 2. Ba quyết định đáng ghi

**① «Chưa đo được» là trạng thái THỨ BA.** `xong` có ba giá trị: `true` · `false` · `null`.
Gộp `null` vào `false` là bảo người ta đi làm lại một việc có thể họ đã làm rồi; gộp vào
`true` thì tệ hơn. Cùng luật «đèn không đo được thì phải XÁM» của màn Sức khoẻ, áp cho một
danh sách việc.

**② Có sản phẩm mà KHÔNG có giá thì bước 5 CHƯA xong.** Một page có sản phẩm mà không có bậc
giá là một page **câm khi khách hỏi giá**. Đếm mỗi sản phẩm rồi tích xong là bỏ sót đúng chỗ đau.

**③ Ba cái van của máy chủ tách thành mục riêng** (cho bot gửi tin · bật ghép lời mới · cho
giao page bằng giao diện). Trộn vào năm việc là bày ra một ô tích mà người dùng **không có
cách nào tích được** — cách nhanh nhất dạy người ta bỏ qua cả danh sách. Nhưng cũng không
giấu: người mới cần biết vì sao làm đủ năm bước rồi mà bot vẫn im. Mục ấy có nút «Kiểm lại».

## 3. Sửa sản phẩm, giá và kịch bản NGAY TRONG TAB

Người quyết: *«sửa sản phẩm, giá kb trong tab»*. Hai tab của `/page/:id` từ chỉ-đọc thành
sửa-được, **và không thêm một cửa ghi nào**:

| Tab | Cửa ghi dùng | Ghi chú |
|---|---|---|
| Sản phẩm & giá | `POST /api/van-hanh/products/:id` | cửa đã có kiểm phiên bản (chống hai người sửa đè nhau) và nhật ký giá trước/sau (GD5 · K7) |
| Kịch bản | `POST /api/kich-ban/page/:id/nhap` | chỉ LƯU BẢN NHÁP. Đưa lên chạy là cửa khác, vai khác — tab không gộp hai việc ấy |

**Bốn ô nâng cao của bậc giá** (giá gốc · khuyến mãi · phí ship · miễn ship) **cố ý không
hiện** ở tab, và được **gửi lại nguyên văn** như lúc đọc về. Nên sửa ở tab **không thể** làm
hỏng chúng. Dựng bản thứ hai của một bảng tám cột trên đường tiền là chỗ dễ trôi khỏi nhau nhất.

## 4. Một lỗi tôi suýt ship: lọc sản phẩm theo `page_id`

Bản đầu tab lọc `san_pham.page_id === page.id`. Bộ ca xanh. Đo trên bản dev:
**50/50 sản phẩm có `page_id` NULL** ⇒ tab rỗng với **mọi** page, trong khi bot vẫn chào bán
bình thường.

Luật thật (`src/products/catalog.js#docSanPhamGoiGia` — chính bộ mà đường ráp lời của bot
dùng): page khai `san_pham_goc_ma` thì lấy theo **mã gốc lọc theo shop**; không khai thì mới
lấy theo `page_id`.

Nay danh sách lấy từ `/api/page/:id/noi-dung` — **cùng bộ đọc với bot**; lượt gọi sang
`/api/van-hanh/products` chỉ để lấy thêm `version` và bốn ô nâng cao, **ghép theo id sản
phẩm**, không ghép theo page. Sản phẩm bot dùng mà tab chưa sửa được thì **nói ra**, không giấu.

📌 Bài học: **hỏi «chỗ khác trả lời câu này bằng luật nào» trước khi tự viết một luật.**
Cái sai này không một bộ ca nào bắt được — nó chỉ lộ khi cắm vào dữ liệu thật.

## 5. Thước

- `v3/test/b/cai-dat-team.test.mjs` **7/7** (mới): team rỗng ⇒ năm việc đều chưa và chỉ đúng
  việc tiếp theo · đo bằng số thật · có sản phẩm mà không giá ⇒ chưa xong · **chưa đo được là
  trạng thái thứ ba** (hai ca) · ba cái van không trộn vào năm việc · van đọc đúng biến
  (`PANCAKE_READONLY` thắng cờ gửi).
- `v3/test/b/*` **857/857** · `npm test` **2.038 ca · 2.034 xanh · 0 đỏ**.
- `ops/bin/do-giao-dien.mjs`: **25 màn đo được** · **0 màn vỡ** · 0 mã kỹ thuật · 17 hộp
  cảnh báo · chữ diễn giải 4.255.
- Trình duyệt thật: màn Cài đặt team đọc đúng số của bản dev (1 người · 7/7 token · 4 page ·
  3 dòng model · 2 kho hàng · 235 sản phẩm · 4 giá), 0 lỗi JS.
- **Vòng lưu sản phẩm chạy thật trên bản dev**, gồm cả lượt có bốn ô nâng cao khác rỗng
  (`gia_goc 199` · `khuyến mãi «mua 2 tặng 1»` · `phí ship 15` · `miễn ship true`): sau khi
  lưu qua đúng thân mà tab dựng, **bốn ô giữ nguyên từng giá trị**, giá không đổi. Dọn lại
  bản dev về nguyên trạng sau khi đo.

## 6. Chưa làm

- **Đưa kịch bản lên chạy** vẫn ở màn Kịch bản — cố ý: hai việc, hai vai.
- **Bốn ô nâng cao của giá** vẫn sửa ở màn «Hội thoại và đơn».
- Danh sách sửa được cắt 50 dòng mỗi trang (giới hạn của cửa đang dùng); page có nhiều hơn
  thì tab nói rõ số còn lại và chỉ sang màn kia.
- Phép đo vẫn chưa mở được `/page/:id` (màn không có dòng menu).


## 7 · LƯỢT THỬ A→Z (người quyết yêu cầu) — dựng page ảo, cài từ đầu

Dựng trên bản dev một page ảo + một sản phẩm ảo + một bậc giá, rồi đi hết luồng bằng trình
duyệt thật: đăng nhập → Cài đặt team → tìm page → mở trang page → điền thị trường/ngành →
sửa sản phẩm và giá → soạn kịch bản, lưu nháp → xem lại tình trạng.

**Kết quả cuối: 0 lỗi JS · 0 cửa 5xx · mọi thứ gõ vào đều xuống tới cơ sở dữ liệu**
(thị trường, ngành hàng, tên sản phẩm, giá **129 SAR → lưu 12900 đúng đơn vị nhỏ**, bản nháp
kịch bản, và **1 dòng nhật ký sửa giá** — cửa audit của GD5·K7 có chạy).

Thời gian mỗi bước: đăng nhập 1,6s · Cài đặt team 3,2s · tìm page 2,8s · mở trang page 3,0s ·
lưu thiết lập 1,8s · lưu sản phẩm 2,5s · lưu kịch bản 2,5s.

### Nhưng lượt thử bắt được HAI LỖI mà 2.038 ca xanh không thấy

**① Tab sản phẩm nói SAI: «page này chưa có sản phẩm nào» trong khi bot đang dùng một sản phẩm.**
Nguyên nhân: tab ghép bản-sửa-được qua `/api/van-hanh/products`, mà cửa ấy **cắt 50 dòng mỗi
trang** (và còn **bỏ các bậc giá đang tắt** — lưu tiếp là xoá mất chúng, vì cửa ghi thay trọn
danh sách bậc giá). Sản phẩm thử id 236 nằm ngoài 50 dòng ⇒ tab kết luận ngược sự thật.
Nay có bộ đọc riêng **lấy theo ID** mà bộ đọc của bot vừa trả về: không phân trang, đủ cả bậc
tắt. Và bốn câu tách bạch: *bot không có sản phẩm* · *có nhưng máy chủ chưa nối bộ đọc sửa* ·
*có vài món tab chưa sửa được* · *sửa được*.

**② «Chưa đọc được tình trạng» nói sai cảnh.** Page vừa tạo có trong CSDL nhưng tiến trình bot
chưa biết nó. Màn gộp cảnh ấy vào «cầu hỏng» ⇒ đẩy người dùng đi hỏi người quản trị hệ thống
một việc **họ tự sửa được** (quét Pancake, thêm tài khoản). Nay tách **ba cảnh**: cầu hỏng ·
cầu đọc được nhưng không thấy page · thấy và có danh sách điều kiện. Cảnh giữa có nút đi làm.

### Một chỗ chữ sửa theo

Màn Cài đặt team nói «Xong cả 5 việc» trong khi page mới chưa cài gì. Đúng — năm việc ấy là
của TEAM — nhưng dễ đọc thành «xong hết». Nay ghi rõ «xong cả 5 việc **của TEAM**», kèm câu
«từng page vẫn cài riêng» và nút mở danh sách page.

### Dọn sau khi đo

Page ảo, sản phẩm ảo, bậc giá và bản nháp kịch bản đã xoá; bản dev về nguyên trạng. **Dòng
nhật ký sửa giá ở lại** — `nhat_ky` là bảng chỉ-INSERT, trigger chặn DELETE. Đúng thiết kế:
đó là bản ghi thật về một lần sửa thật, xoá nó mới là sai.

📌 Bài học: **bộ ca chạy trên dữ liệu mình tự dựng; lượt thử A→Z chạy trên dữ liệu như thật.**
Hai lỗi trên đều là lỗi «màn nói một câu SAI», và cả hai chỉ lộ khi có một page thật sự trống.
