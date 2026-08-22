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
| L1-M4b+c · Cấu hình model theo team, kho khoá, dự phòng | đang làm |
| L4-M1 · Bảng điều phối | đang làm |
| L4-M2 · Đánh dấu đã xử | đang làm |

Spec từng module: `v3/docs/spec/`. Hợp đồng với người A: `v3/docs/hop-dong-b-voi-a.md`.

---

## Cách làm việc — ba điều người nhận tiếp phải biết

**1. Người A chưa viết dòng nào.** Lược đồ (`v3/db/`) và tầng truy vấn (`v3/src/db/`) chưa
tồn tại. Nên mọi module của B **nhận cổng truy vấn từ ngoài vào** (tiêm phụ thuộc), và chạy
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
