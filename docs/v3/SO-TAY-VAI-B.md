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
