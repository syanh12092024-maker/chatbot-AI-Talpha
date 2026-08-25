# SỔ TAY VAI B

> Nguồn sự thật về phần việc của **người B** (phần rìa: danh tính, nhật ký, lớp model,
> màn hình cho sale). Ai nhận tiếp việc này thì đọc file này trước.
> Nhánh: `v3/vai-b` · code ở thư mục `v3/` · **không đụng `src/` đang phục vụ 51 page thật**.

---

## Đang ở đâu

| Việc | Trạng thái |
|---|---|
| Bốn điểm kiểm chặn | **xong** — `v3/docs/kiem-chan/ket-qua.md` |
| Nền vai B (bối cảnh team, cổng dữ liệu giả, hợp đồng với A) | **xong** |
| L1-M4a · Lõi lớp model | **xong** |
| L0-M3 · Đăng nhập, chọn team, hai vai | **xong** |
| L0-M4 · Nhật ký thao tác | **xong** |
| L1-M4b+c · Cấu hình model theo team, kho khoá, dự phòng | **xong** |
| L4-M1 · Bảng điều phối | **xong** |
| L4-M2 · Đánh dấu đã xử | **xong** |
| Nối dây phần rìa (`v3/src/vai-b.js`) | **xong** |

Spec từng module: `v3/docs/spec/`. Hợp đồng với người A: `v3/docs/hop-dong-b-voi-a.md`.

---

## Cách làm việc — ba điều người nhận tiếp phải biết

**1. ~~Người A chưa viết dòng nào~~ — ĐÃ LỖI THỜI (24/08).** A xong 12/12 module: lược đồ
thật ở `db/migrate/`, tầng truy vấn ở `src/db/` (KHÔNG phải `v3/db/` như B từng chờ). Nên mọi module của B **nhận cổng truy vấn từ ngoài vào** (tiêm phụ thuộc), và chạy
test bằng bản cài giả `v3/testkit/db-gia.js`. Khi A xong, mỗi module chỉ phải nối một chỗ —
xem hợp đồng mục 8.

**2. Bốn module của B không import lẫn nhau.** Thứ duy nhất dùng chung là
`v3/src/auth/boi-canh.js`. Mọi thứ khác (nhật ký, chặn đăng nhập, chặn vai) đi qua **phễu
tiêm**. Nhờ vậy bốn module code song song được mà không đụng nhau.

**3. Bản cài giả cố ý khắt khe.** Nó ném lỗi khi thiếu bối cảnh, chặn truy cập xuyên team
có ghi nhật ký, cấm sửa/xoá `nhat_ky` và `so_ai`, cấm xoá mọi bảng. Khắt khe thì test kiểm
được đúng tiêu chí nghiệm thu chứ không phải kiểm cho có.

---

## Chỗ tự quyết — spec chưa nói rõ, B quyết và ghi lý do

Đây là mục quan trọng nhất của file này. Chỗ nào chủ dự án thấy sai thì sửa được với giá rẻ.

### Nền và ranh giới

| # | Quyết gì | Vì sao |
|---|---|---|
| 1 | **Code v3 nằm ở thư mục `v3/`**, bên trong giữ đúng cây `src/auth`, `src/model`… mà `05-PHAN-VIEC.md` ghi | Luật 4 nói code v3 ở thư mục mới, nhưng bảng ranh giới file lại ghi đường dẫn `src/...`. Đặt cả cây v3 trong `v3/` thoả cả hai, và không đụng một byte nào của bản đang chạy |
| 2 | **`package.json` ở gốc sửa đúng một dòng**: `node --test test/` → `node --test test/ v3/test/` | Tiêu chí nghiệm thu đòi "`npm test` xanh" bằng một lệnh. Đây là file dùng chung duy nhất B đụng tới, đã ghi vào hợp đồng mục 0 để A biết |
| 3 | **`v3/testkit/` tách khỏi `v3/test/`** | Bộ chạy test của Node coi mọi file `.js`/`.mjs` dưới thư mục tên `test/` là bài test. Để bản cài giả trong đó thì nó bị chạy như một bài test rỗng |
| 4 | **Bảng `viec_can_xu_ly`: A chèn dòng, B chỉ sửa chín cột nửa dưới** | `05-PHAN-VIEC.md` ghi "A ghi · B đọc", nhưng L4-M2 lại là thao tác ghi. Chia theo cột là cách duy nhất giữ được cả hai vế. B **không bao giờ** `INSERT`, **không bao giờ** `DELETE` |
| 5 | **Việc nền cũng phải có vé** (`boiCanhMay`) | Bot trả lời khách lúc 3 giờ sáng không có ai đăng nhập. Không có vé máy thì cron thành cửa hậu bỏ qua lớp team |

### Đăng nhập (L0-M3)

| # | Quyết gì | Vì sao | Đánh đổi |
|---|---|---|---|
| 6 | **Vé ký HMAC thay bảng phiên** | 18 bảng trong kế hoạch không có bảng phiên; thêm bảng là đổi lược đồ của người A | **Không cắt được vé đang sống ngay lập tức.** Khoá một tài khoản thì vé cũ vẫn dùng được tới 8 tiếng. Giai đoạn 2 thêm bảng phiên nếu cần |
| 7 | **Cổng danh tính riêng, hẹp, chỉ đọc, chỉ cho 4 bảng dùng chung** | Con gà và quả trứng: muốn biết người này thuộc team nào thì phải hỏi cơ sở dữ liệu, mà muốn hỏi thì phải có bối cảnh team | Người A phải giao thêm một hàm không tham số trả về cổng không gắn team |
| 8 | **Thiếu `V3_KHOA_VE` → ném lỗi, không tự sinh khoá tạm** | Sinh tạm thì mỗi lần khởi động lại là đá hết mọi người ra mà không ai hiểu vì sao | Phải đặt biến môi trường trước khi chạy |
| 9 | **Hãm thử sai bằng bộ đếm trong RAM**, 5 lần / 15 phút | Đủ cho giai đoạn 1 (một tiến trình) | Nhiều tiến trình thì hãm không dùng chung. Đã ghi giới hạn trong file |
| 10 | **Đăng nhập đúng nhưng không thuộc team nào → 403 `khong_thuoc_team`** | Không dựng nổi bối cảnh nên không phát vé được. Không dựng bối cảnh giả để lách | |

### Lớp model (L1-M4)

| # | Quyết gì | Vì sao |
|---|---|---|
| 11 | **Không dùng `@anthropic-ai/sdk`, gọi bằng `fetch`** | SDK dựng client một lần theo khoá lúc nạp module — đúng chỗ hỏng đang muốn sửa, vì v3 phải nhận khoá theo từng team. `fetch` cũng làm test chạy được mà không cần mạng |
| 12 | **Hình dạng chuẩn là hình dạng Anthropic**, hai nhà kia dịch qua lại | 1.962 dòng bộ não chat dùng nguyên, không sửa một dòng — nên hình dạng phải theo chúng |
| 13 | **Ba model chưa mở tài khoản có đơn giá SUY NGƯỢC** từ cột đ/tin của `01-QUYET-DINH` mục 7, đánh dấu `nguonGia:'suy-nguoc'` | Chưa ai mở tài khoản DeepSeek/OpenAI nên không có bảng giá công bố. **Phải thay khi mở tài khoản** |
| 14 | **Trừ token cache trước khi quy tiền ở họ OpenAI** | OpenAI kể phần cache trong `prompt_tokens`, Anthropic thì không. Bê thẳng là đếm cache hai lần, mà giá vào đắt gấp 10 lần giá đọc cache |
| 15 | **Dự phòng bắt buộc khác nhà với model chính**, ghi cùng nhà thì từ chối | Dự phòng cùng nhà là dự phòng giả — hết tiền một tài khoản là chết cả hai |
| 16 | **Lỗi 4xx sai yêu cầu KHÔNG chuyển dự phòng** | Yêu cầu sai thì nhà nào cũng sai. Chuyển dự phòng chỉ tốn thêm tiền và giấu mất lỗi thật |
| 17 | **Cảnh báo bắn một lần cho mỗi lần đổi trạng thái**, không phải mỗi lời gọi | Sự cố 08/08/2026 ghi 28.469 dòng cùng một lỗi vào log — nhiều tới mức không ai đọc |

### Bảng điều phối (L4)

| # | Quyết gì | Vì sao |
|---|---|---|
| 18 | **Danh sách kết quả và lý do do B đề xuất** — `chot_duoc`, `khach_tu_choi`, `khach_khong_tra_loi`, `da_xu_ngoai`, `tra_lai_bot`, `day_nham` | Tài liệu không chốt. **Cần chủ dự án duyệt** — đây là thứ sale bấm mỗi ngày và là dữ liệu để sửa bot |
| 19 | **Lý do bắt buộc với `khach_tu_choi` và `day_nham`** | Hai cái này là thứ dùng để sửa bot; không có lý do thì ghi nhận vô nghĩa |
| 20 | **Việc của team khác → 404, không phải 403** | 403 là xác nhận "dòng này có tồn tại ở team khác" — rò rỉ đúng thứ lớp team sinh ra để giấu |
| 21 | **Không có đường mở lại việc đã đóng** trong giai đoạn 1 | Mở lại là sửa dữ liệu đã chốt. Mã `mo_lai_viec` đã để sẵn trong danh mục nhật ký |
| 22 | **Mẫu đường POS để trong biến môi trường `V3_POS_MAU_DON`**, trống thì nút hiện mờ | Bản đang chạy chỉ gọi API POS, chưa ai mở giao diện POS bằng mắt. Đoán bừa thì dẫn sale tới trang 404 |
| 23 | **Đóng việc người khác đang giữ cũng bị chặn**, quản trị không có cửa vượt | Cùng lý do với "không cướp im lặng". **Đánh đổi:** sale nhận việc rồi nghỉ thì việc kẹt tới giai đoạn 2 |
| 24 | **Trang HTML hết vé thì chuyển hướng về đăng nhập**, đường `/api` vẫn trả JSON | Sale mở dấu trang buổi sáng nhìn thấy khối JSON thì không có đường đi tiếp. Máy gọi máy thì mã lỗi mới là thứ đúng |
| 25 | **Thêm `v3/src/vai-b.js` nối dây một lời gọi** | Bốn module không import lẫn nhau nên phải nối tay 12 chỗ, đúng thứ tự. Cả hai cách nối sai đã xảy ra thật lúc chạy thử |

### Giai đoạn 2 · sóng 0 · màn «Cấu hình team» (G2-B1) — 25/08/2026

| # | Quyết gì | Vì sao | Đánh đổi |
|---|---|---|---|
| 26 | **Nới `VAI` từ 2 lên đủ 5 vai** | CSDL có đủ 5 từ đầu. Màn cấu hình gán được vai `marketer`, mà `taoBoiCanh` ném «vai lạ» cho mã đó ⇒ người được gán **đăng nhập được nhưng không cấp nổi vé**, trong khi màn quản trị vẫn hiện họ có vai đầy đủ. Cùng họ lỗi với vụ gạch dưới/gạch ngang | Không có. Nới `VAI` **không mở thêm cửa nào**: ai vào màn nào vẫn do từng màn tự khai (`VAI_VAO_DUOC`) |
| 27 | **Bài test vai phải so HAI CHIỀU** | Bản cũ chỉ so `VAI ⊆ lược đồ` nên nó **xanh suốt trong khi `VAI` thiếu 3/5 mã**. Một tập con hợp lệ không phải một tập đủ | |
| 28 | **Cổng danh tính nới GHI cho ĐÚNG `thanh_vien_team`** | `thanh_vien_team` không nằm trong `BANG_NGHIEP_VU_CHUAN` của A nên không có đường nào khác tới nó | `team`/`nguoi_dung`/`vai` vĩnh viễn chỉ đọc — thêm team hay sửa mã vai là việc của di trú, không phải của màn hình |
| 29 | **Có `xoa`, không có `sua`** trên cổng đó | `UNIQUE (team, người, vai)` nên «đổi vai» thật ra là bớt một dòng + thêm một dòng; một lời gọi `sua` giả vờ đó là thao tác nguyên tử mà không phải. Và rút quyền phải có hiệu lực NGAY | Ngược nếp «vai B không xoá». Nhưng đây là dòng CẤP QUYỀN, không phải đơn hàng — luật 2 nói về đơn hàng. Bảng không có cột `bat` nên xoá mềm không làm được mà không đổi lược đồ |
| 30 | **Không rút được vai `quan-tri` CUỐI CÙNG của team** | Rút xong thì không còn ai cấu hình được team đó, và **không có màn nào để sửa** — phải quay lại psql tay, đúng thứ màn này sinh ra để xoá | Muốn giải tán một team thì phải làm bằng tay. Chấp nhận: giải tán team không phải việc hằng ngày |
| 31 | **Vai nhận theo MÃ, không nhận `vai_id` thô từ trình duyệt** | `vai_id` là số; gõ nhầm một chữ số thì gán trúng vai khác mà không gì kêu. Mã gõ sai thì không tra ra và bị chặn ngay | Thêm một lượt tra bảng `vai` mỗi lần ghi |
| 32 | **Ghi thành viên mà nhật ký hỏng thì NÉM**, khác `ghiNhatKyDieuPhoi` (nuốt lỗi) | Bên điều phối, nhật ký hỏng không được biến 403 thành 500. Ở đây là **cấp quyền**: cấp xong mà không truy ngược được ai cấp cho ai lúc nào thì thao tác đó không nên xảy ra | |
| 33 | **`khoiRong()` NÉM nếu quên khai vì sao rỗng**, và `chua_cai_dat` bắt buộc kèm đường đi tiếp | Thi hành bài học ③ bằng CODE chứ không bằng lời dặn. Không có đường trả một ô trắng | Mỗi chỗ rỗng phải viết thêm một câu. Đó là toàn bộ mục đích |
| 34 | **Màn cấu hình KHÔNG đếm sang team khác**, kể cả khi rất cần con số đó | Đi vòng qua `boiCanhMay`/`ctxHeThong` để đếm hộ là tự tay mở cửa hậu mà cả lớp team sinh ra để đóng — và mở nó ở **màn quản trị** thì càng khó thấy | Màn nói thẳng «chỉ đếm được team đang mở». Con số cả-ba-team là việc của `PHIEU-B-Y3` |
| 35 | **Lát bị chặn hiện MỜ kèm số phiếu, không giấu đi** | Giấu thì người dùng đi tìm mãi một chức năng tài liệu có hứa; hiện kèm lý do thì họ biết đang đợi ai, đợi gì | |
| 36 | **Ba mảnh HTTP (`muonTrang`/`locTiep`/`escHtml`) tách ra `ui/chung/http.js`** | `locTiep` là bộ lọc chặn chuyển hướng ra ngoài. Hai bản sao của một bộ lọc an toàn là hai bản sẽ lệch, và bản bị bỏ quên luôn là bản đang mở cửa | Đụng vào `ui/dispatch/router.js` đang chạy. 316 bài test cũ vẫn xanh sau khi tách |

**Hai chỗ bản cài giả nói KHÁC bản thật, phát hiện khi làm màn này** — cùng họ với bài học ①:

1. `db-gia.js` **xoá mất điều kiện `team_id`** với bảng dùng chung, nên mọi câu hỏi «thành
   viên của team này» trên bản giả đều trả về thành viên của **mọi team**. Lệch theo chiều
   **nguy nhất**: bản giả dễ tính hơn bản thật, nên một màn rò rỉ thành viên xuyên team vẫn
   xanh hết bài test. Đã sửa. (Bắt được nhờ chính bài test của màn này, không phải nhờ đọc code.)
2. `db-gia.js#xoa` ném **vô điều kiện** trong khi cổng thật xoá được `thanh_vien_team`. Lệch
   theo chiều khắt khe — không cho bản hỏng đi lọt, nhưng vẫn phải sửa: **bản giả khắt khe
   sai chỗ thì người ta sẽ sửa CODE cho vừa bản giả**, và đó mới là chỗ hỏng thật.

### Giai đoạn 2 · sóng 0 · G2-B2 «Page & Bot» và G2-B4 «Kết nối & token» — 25/08/2026

| # | Quyết gì | Vì sao | Đánh đổi |
|---|---|---|---|
| 37 | **Công tắc bot AI KHÔNG ghi xuống cột `page.bot_ai_bat`** — gọi sang `/admin/api` của tiến trình bot v1 | Cột đó là BẢN SAO. Nguồn thật là `ai-enabled.json` + `Set` trong RAM tiến trình bot, và `napCongTacAi` chép đè lại **cả hai chiều** mỗi lượt di trú. Ghi cột thì bot không đổi hành vi, rồi di trú xoá dấu vết — một nút bấm báo thành công và không làm gì | v3 phụ thuộc bề mặt HTTP của v1 và cần `ADMIN_USER`/`ADMIN_PASS`. Chấp nhận: bot **là** v1, CSDL v3 mới là bản đọc |
| 38 | **Đọc lại trạng thái bot trả về rồi mới chép vào cột**, không chép theo tham số gửi đi | Bot không bật được vì cớ nào đó mà cột vẫn ghi «đã bật» là màn hình bắt đầu nói dối có hệ thống. Có bài test cho đúng nhánh này | thêm một vòng đọc |
| 39 | **Cửa ghi sang bot mặc định ĐÓNG** (`V3_BOT_GHI` + `PANCAKE_READONLY`) | Đúng quy ước của người A cho mọi cửa ghi ra ngoài. Đây là đường chạm KHÁCH THẬT: bật bot cho một page là bot bắt đầu tự trả lời người thật | Muốn dùng thật phải đặt biến môi trường. Cố ý |
| 40 | **ĐỌC không cần cờ, chỉ GHI mới cần** | Cửa đóng mà giấu luôn dữ liệu thì người ta không biết đang ở trạng thái nào để quyết định. Màn hiện đủ + nói rõ thiếu gì | |
| 41 | **v3 kiểm team TRƯỚC khi gọi sang v1** | `/admin/api/pages/:id/ai` của v1 không biết team — ai gọi được là bật/tắt được mọi page. Cây cầu cố ý KHÔNG tự kiểm quyền, để không có hai bản luật phân quyền ở hai chỗ | |
| 42 | **Vẫn cho gán marketer dù di trú sẽ xoá**, kèm cảnh báo hiện trên màn + `PHIEU-B-Y4` | Gán marketer là lý do màn này tồn tại (514/514 page chưa có). Chặn lại thì màn gần như vô dụng; ghi mà im lặng thì công sức bay mất không ai biết. Chọn: ghi + nói to | Trước khi A làm Y4, chạy `npm run di-tru` là mất phần đã gán. Người dùng **được báo trước** |
| 43 | **`ket-noi` chỉ cho `quan-tri`**, hẹp hơn `cau-hinh-team` và `page-bot` (cho cả `quan-ly`) | Kho token là hạ tầng dùng chung cả ba team; một danh sách token, kể cả chỉ có tên và tám ký tự cuối, vẫn là bản đồ hạ tầng | Quản lý muốn xem token phải nhờ quản trị |
| 44 | **Không viết lại kho token, chỉ bọc quyền + nhật ký quanh bản của v1** | `src/pancake.js` đã làm đúng phần khó nhất: thử token sống, xoá chỉ số định tuyến, **không cần khởi động lại**. Viết lại là đẻ bản thứ hai của một thứ đang chạy đúng, rồi hai bản lệch nhau | v3 không kiểm soát được hành vi kho token; muốn đổi phải sửa `src/` — đất người khác |

**Một chỗ bản cài giả suýt lừa lần nữa:** bài test `canhBaoKhoToken` lần đầu đưa **bản THÔ của
v1** (`pagesRouted`) vào hàm ăn **bản đã ánh xạ** (`soPageDangDung`). `undefined === 0` là sai,
nên cảnh báo «token chính không phủ page nào» im lặng không bắn mà bài test vẫn suýt xanh. Nay
có hai helper tách bạch (`tok` / `tokAx`) kèm chú thích lý do.

### Giai đoạn 2 · sóng 0 · G2-B1 lát 4 và G2-B3 — 25/08/2026

| # | Quyết gì | Vì sao | Đánh đổi |
|---|---|---|---|
| 45 | **Lát «gán page» KHÔNG tự ghi nhật ký** | `chuyenPageSangTeam` của A đã ghi NGAY TRONG giao dịch. Ghi thêm là đẻ hai bản ghi cho một thao tác, người đọc nhật ký đếm gấp đôi | Nội dung dòng nhật ký do A quyết, B không thêm trường được |
| 46 | **Chuyển nhiều page KHÔNG dừng ở lỗi đầu tiên**, trần 100 page/mẻ | Dừng giữa chừng để lại trạng thái nửa vời mà màn hình không mô tả nổi: vài page đã chuyển, phần còn lại chưa, người dùng chỉ thấy chữ «lỗi» | Không có giao dịch bao ngoài cả mẻ. Đúng ý: chuyển được page nào thì page đó xong hẳn |
| 47 | **`moDuoc` suy từ dây ĐÃ NỐI, không từ cờ gõ tay** | Máy chủ dựng thiếu dây thì nút phải mờ, dù mã nguồn đủ khả năng | |
| 48 | **Bỏ bộ mã hoá khoá của B (`kho-khoa.js`), dùng `db/khoa.js` của A** | KHÔNG phải vì bản nào đẹp hơn: `khoa_nha.khoa_api_ma` có `CHECK LIKE 'v1.%'` ở tầng CSDL, bao thư jsonb của B ghi xuống là bị từ chối ngay. Hai bộ mã hoá cho một cột thì bộ không khớp `CHECK` là bộ không tồn tại | `V3_KHOA_CHU` biến mất khỏi tài liệu của B. Đây là câu chốt còn treo từ 23/08, nay tự quyết vì mọi cách khác đều là viết code không ghi nổi xuống |
| 49 | **Viết lại lớp cấu hình model theo hình BA DÒNG/team** | Lược đồ thật `UNIQUE (team_id, vai_tro)`. Bản cũ viết hình một-dòng vì viết lúc chưa có lược đồ, và **13 bài test đang khoá hình sai** | Phải sửa 13 bài test. Đáng: chúng đang bảo vệ một hình dạng không tồn tại |
| 50 | **`doNgauNhienNen` không còn là cột riêng** — nó là `do_ngau_nhien` của dòng `vai_tro='nen'` | Lược đồ thật đặt `do_ngau_nhien` trên TỪNG dòng | |
| 51 | **Ô khoá RỖNG = giữ nguyên, KHÔNG phải xoá** | Bản cũ coi rỗng là lệnh xoá. Nhưng biểu mẫu có bốn ô khoá, ba ô không đụng thì trình duyệt gửi chuỗi rỗng ⇒ mỗi lần đổi khoá một nhà là **ba nhà kia bị xoá sạch**, bot chết ba phần tư mà màn hình báo «đã lưu» | Muốn xoá khoá thì cần một đường riêng, chưa mở |
| 52 | **Chặn hình HIỂN THỊ lọt vào đường ghi khoá** | `tomTatCauHinh` trả `khoa[nha] = {daCo,duoi}`; màn gửi nguyên tóm tắt lên là chuyện dễ xảy ra, và `String({daCo:true})` ra `"[object Object]"` ghi thẳng làm khoá API | |
| 53 | **Nhật ký đổi khoá chỉ ghi TÊN NHÀ**, bỏ cả đuôi bốn ký tự | `nhat_ky` là bảng KHÔNG SỬA ĐƯỢC — mọi thứ ghi vào nằm lại vĩnh viễn, và bốn đuôi khoá gộp lại đã là thông tin thừa cho một dòng chỉ cần trả lời «ai đổi khoá nhà nào, lúc nào» | Truy vết mất một chi tiết. Đổi lại nhật ký không mang mảnh bí mật nào |
| 54 | **Bảng giá đối chiếu THẲNG `01-QUYET-DINH.md` §7 trong bài test** | Bảng giá là thứ người ta dựa vào để quyết đổi model. Lệch với tài liệu mà không ai biết thì quyết định dựa trên số đã trôi | Tài liệu đổi khuôn bảng là bài test đỏ. Cố ý |
| 55 | **Cột đ/đơn khai rõ là PHÓNG CHIẾU**, không phải số đo mới | `dDon = dTin × 52,69 tin/đơn`. Hiện nó như một phép đo là mời người ta tin chắc hơn mức dữ liệu cho phép — muốn biết chắc phải A/B | |

**Chỗ vẫn CHƯA xong của sóng 0:** `PHIEU-B-Y4` (di trú thôi ghi đè `marketer`) người A chưa
làm. Gán marketer trên màn `/page-bot` vẫn bị `npm run di-tru` xoá trắng — màn có cảnh báo.

### Giai đoạn 2 · sóng 1 · bộ não AI — 25/08/2026

| # | Quyết gì | Vì sao | Đánh đổi |
|---|---|---|---|
| 56 | **Suy trạng thái bộ luật bằng `nhat_ky`, không xin thêm cột `trang_thai`** | `bo_luat_chung` không có cột đó. Suy bằng số phiên bản thì SAI sau lượt lùi: bản đã chạy rồi bị gạt lại trông như «chờ duyệt». `nhat_ky` là bảng chỉ-thêm và vốn sinh ra để trả lời «việc này đã từng xảy ra chưa» | Trạng thái phụ thuộc một bảng khác; nên `ap_bo_luat` phải vào nhóm BẮT BUỘC — ghi hụt là hỏng dữ liệu chứ không chỉ mất dấu vết |
| 57 | **KHÔNG xin mở đường ghi vào bản toàn hệ (`team_id IS NULL`)** | Tầng truy vấn của A cố ý chặn, và đó là thiết kế ĐÚNG: màn quản bộ luật CỦA TEAM, bản toàn hệ là bản kế thừa chỉ đọc — khớp đúng hợp đồng đọc `(team_id = ctx OR IS NULL)` | Muốn sửa luật toàn hệ thì phải qua di trú. Chấp nhận: nó đổi «rất hiếm» (§6) |
| 58 | **Bản toàn hệ có trạng thái RIÊNG «Bản kế thừa»**, không gọi là «chờ duyệt» | Gọi nhầm là mời người ta đi bấm một nút chắc chắn báo lỗi | |
| 59 | **«Áp» và «lùi về bản trước» là CÙNG một hàm** | Nhìn từ hai phía thì đó là một thao tác. Viết hai hàm là đẻ hai đường ghi cho cùng một sự việc, rồi một trong hai quên ghi nhật ký | |
| 60 | **Chặn bản bộ luật ngắn hơn 200 ký tự** | Bản đang chạy dài 6.734 ký tự. Một bản vài chục ký tự gần như chắc chắn là dán nhầm, và áp nó là 51 page mất sạch quy tắc cứng | Không soạn được bộ luật cực ngắn. Chưa ai cần |
| 61 | **Viết bộ so hai bản bằng LCS, không thêm thư viện** | So từng dòng theo chỉ số thì chèn MỘT dòng ở đầu là mọi dòng dưới bị báo «đã đổi» — người đọc thấy «đổi 40 dòng» rồi thôi không đọc nữa. Có bài test cho đúng nhánh này | ~40 dòng mã tự viết |
| 62 | **Ước lượng token hiệu chỉnh theo chính bộ luật đang chạy** (6.734 ký tự ↔ 2.256 token) | Bộ đếm thật nằm ở phía nhà cung cấp. Con số này là ƯỚC LƯỢNG và mọi chỗ hiện nó đều ghi rõ như vậy | Lệch với bộ đếm thật của từng nhà |
| 63 | **Soi mâu thuẫn dò theo TỪ KHOÁ, và khai thẳng giới hạn đó** | Bắt được mâu thuẫn thô («cấm giảm giá» ↔ «giảm 10%»), bỏ sót kiểu tinh vi. Trình bày là «chỗ đáng đọc lại», không phải phán quyết | Bỏ sót. Nhưng một danh sách gợi ý trung thực còn hơn một phán quyết sai |
| 64 | **Chỉ báo mâu thuẫn khi hai vế ở HAI khối khác nhau** | Cùng một khối là việc của người viết khối đó. Báo cả trong-khối là làm loãng danh sách rồi người ta thôi đọc | |
| 65 | **Mốc token của khối kỹ năng nhân theo SỐ kỹ năng** | §6 ghi ~180 token MỖI kỹ năng. Dùng mốc cứng 180 là báo động giả ngay khi bật kỹ năng thứ hai | |
| 66 | **Marketer sửa được kỹ năng** (khác bộ luật — chỉ quản trị) | §6: kỹ năng là tầng của marketer, «bật theo sản phẩm». Bộ luật chung thì dùng chung 51 page nên chỉ quản trị | |
| 67 | **Kiểm mã sản phẩm CÓ THẬT khi khoanh nhóm kỹ năng** | Khoanh vào mã gõ sai thì kỹ năng bật mà không page nào nhận — kiểu hỏng chỉ lộ ra khi ai đó đọc tỉ lệ hoàn hàng ba tuần sau | Thêm một lượt đọc bảng `san_pham` mỗi lần ghi |

**LỖI IM LẶNG LỚN NHẤT CỦA CẢ GIAI ĐOẠN 2, bắt được ở sóng 1:** danh mục mã hành động là
deny-by-default và `ghiNhatKy` **nuốt** lỗi mã lạ (`console.error` + trả `null`). Năm màn của
sóng 0 dùng chín mã chưa khai ⇒ **không một dòng nhật ký nào của chúng được ghi** — cấp
quyền, gạt công tắc bot, thêm token, chuyển page: không việc nào để lại dấu vết, mà màn hình
vẫn báo thành công. Nay đã khai đủ, 7 mã vào nhóm bắt buộc, và có **bài test quét mã nguồn**
đối chiếu mọi hằng `HANH_DONG_*` với danh mục — gõ tay danh sách là đẻ bản sao thứ ba rồi
màn thứ sáu lại quên như màn thứ nhất.

---

## Sửa theo lược đồ thật — 23–24/08/2026

Sổ tay này từng ghi *"người A chưa viết dòng nào"*. **Đã lỗi thời.** A xong 12/12 module;
lược đồ thật ở `db/migrate/001_nen.up.sql`, tầng truy vấn ở `src/db/`.

Toàn bộ tên cột và mã vai của B là **do B tự đoán** hồi chưa có lược đồ. Đã sửa cho khớp —
xem `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md`, spec `B-S1` và `B-S2`.

**Bẫy im lặng đã gỡ, và nó có HAI bản:** `vai.ma` thật là `quan-tri` gạch **ngang**, B so
`quan_tri` gạch **dưới** — ở `boi-canh.js` và ở `ui/dispatch/router.js`. Lệch dấu này làm
**mọi người dùng thành không có vai**, cửa chặn sạch, mà màn hình trông y hệt phân quyền chạy
đúng. Nay `VAI_VAO_DUOC` **nhập hằng** thay vì gõ lại chuỗi, và có bài test **đọc thẳng file
migration** rồi so — gõ tay mã vai vào test là đẻ bản sao thứ hai của cùng một sự thật.

**Ba đổi lớn hơn đổi tên:**

| | |
|---|---|
| `trang_thai` **không tồn tại** | suy từ `nguoi_nhan_id` + `dong_luc`; công thức nằm ở **đúng một chỗ** (`trangThaiCua()` trong `kho-viec.js`), có test khoá |
| Không còn `page_id`/`cust_id` trên dòng việc | đi vòng `viec → hoi_thoai → khach + page`. Thêm một mẻ đọc, vẫn **không N+1**: 100 việc tốn 5 lời gọi |
| **Không có cột `ghi_chu`** | gộp vào `ly_do_dong` theo khuôn `mã · ghi chú`, khuôn ở đúng hai hàm. **Chỗ đáng lật lại nhất nếu A muốn khác** |

**Team kỹ thuật `chua-phan` nay bị chặn khỏi màn chọn team.** Nó là chỗ đậu của 502 page ·
18.790 hội thoại chưa chốt chủ — một người chọn được nó là nhìn thấy khách của cả ba team.

**Ba chỗ cần một câu chốt, B không tự quyết:**

1. `ve.js` ghi *"không nhét email vào vé"* mà vé nay mang email — sửa ghi chú, hay đổi cách vé mang danh tính?
2. Gộp `ghi_chu` vào `ly_do_dong` — A có muốn một cột riêng không?
3. `v3/testkit/db-gia.js` vẫn **dễ tính hơn** bản thật (không có `CHECK`, không khoá ngoại,
   không trigger). 313 bài xanh **không chứng minh** gì về cơ sở dữ liệu thật.

---

## Việc B đang chờ người A

| # | Chờ gì | Chặn cái gì |
|---|---|---|
| 1 | **Lược đồ** (`v3/db/schema.sql`) — các cột ở hợp đồng mục 4 | Chạy thật. Hiện chỉ chạy được trên bản cài giả |
| 2 | **Tầng truy vấn** (`v3/src/db/`) — hình dạng ở hợp đồng mục 3, kèm `tuyChon.giamDan` | như trên |
| 3 | **Cổng danh tính** — một hàm không tham số trả về cổng không gắn team, chỉ cho 4 bảng dùng chung | Đăng nhập chạy thật |
| 4 | **`viec_can_xu_ly` có dòng thật** — A chèn khi bot đẩy việc sang | Bảng điều phối có dữ liệu |
| 5 | **Quyền cơ sở dữ liệu**: `nhat_ky` chỉ cấp `INSERT`+`SELECT` | Chống sửa nhật ký ở tầng chắc nhất |

## Việc người A đang chờ B — **đã giao xong cả hai**

| # | Cái gì | Ở đâu |
|---|---|---|
| 4 | **Lớp model** — `goiModel()` | `v3/src/model/index.js` · hợp đồng mục 2 |
| 5 | **Bối cảnh team** — `taoBoiCanh`/`boiCanhMay`/`batBuocBoiCanh` | `v3/src/auth/boi-canh.js` · hợp đồng mục 1 |

---

## Việc cần chủ dự án quyết hoặc làm

1. **Duyệt danh sách kết quả và lý do đóng việc** (mục 18 ở trên) — sale bấm mỗi ngày
2. **Mở thủ tục WhatsApp**: WABA, đăng ký số, nối vào Pancake, mẫu tin gửi Meta duyệt.
   Chưa xong thì L1-M3 của người A chưa mở được
3. **Gỡ app Meta bị chặn API** — vào `developers.facebook.com` xem lý do và kháng nghị
4. **Lấy khoá Botcake của 10 page thật** — hiện chỉ có 1 khoá, của page nháp
5. **Quyết có kéo màn "Trả lời bình luận" vào giai đoạn 1 không** — điều kiện để tắt Botcake
   quá 3 page (mất ~11% nguồn khách nếu không có)
6. **Mở tài khoản bốn nhà model và lấy khoá** — lớp model đã sẵn sàng nhận, ba model đang
   chạy bằng giá suy ngược
7. **Đặt hai biến môi trường trước khi chạy thật**: `V3_KHOA_VE` và `V3_KHOA_CHU`
   (32 byte base64). Thiếu là hệ thống ném lỗi lúc khởi động — cố ý, không phải lỗi
