# Lấy người từ HRM: xem kế hoạch rồi áp dụng

> Trang này hướng dẫn người quản trị đồng bộ tài khoản và vai theo hồ sơ nhân sự HRM: mở kế hoạch, đọc từng nhóm thay đổi, rồi áp dụng đúng bản vừa xem — ở màn Cài đặt → Người và team.

**Ai làm được:** Quản trị mở được kế hoạch. Chỉ người mang vai **Quản trị ở cả ba team** mới bấm «Áp dụng» được, vì một lượt đồng bộ đụng tới cả ba team.

__Khi nào dùng:__ cài hệ lần đầu cho cả công ty; khi HCNS vừa thêm người, chuyển người sang team khác hoặc báo nghỉ; khi dòng trạng thái cạnh nút báo lượt tự động bị «HOÃN, chờ người xem».

__Trước khi bắt đầu:__
- Máy chủ phải đọc được HRM. Kiểm ở **Cài đặt → Kết nối**, phần «HRM · hồ sơ nhân sự»: nhãn «Đã nối · chỉ đọc» là được; «Chưa nối vào máy chủ» hoặc «Đọc HRM hỏng» thì nút «Lấy người từ HRM (BigQuery)» bị mờ — nhờ người quản trị hệ thống.
- HRM là nguồn duy nhất: hệ không có ô ghép tay riêng. Thiếu ai, sai team, sai vai thì sửa ở HRM rồi đồng bộ lại.

## Luật đồng bộ

| HRM nói | Hệ làm |
|---|---|
| Nhân viên team Pialpha (GCC · AUUS · EU · Sale online/offline), hồ sơ **MKT**, đang làm hoặc thử việc, có email công ty | Tài khoản + vai **Marketer** ở đúng team của người đó |
| Hồ sơ **SALE** (cùng điều kiện trên) | Vai **Sale** ở **cả ba team** (Hộp thư cả ba team) |
| Hồ sơ BO · VANDON · CTV, hoặc team không thuộc hệ | Không vào hệ |
| Có email trùng một tài khoản đã có trên hệ (chưa gắn mã nhân viên) | **Gắn** tài khoản đó với hồ sơ HRM, không tạo bản thứ hai |
| Đã nghỉ | **Khoá** tài khoản + rút các vai do HRM cấp |
| Quay lại làm | **Mở khoá** |
| Tên team | Đổi tên team trên hệ theo HRM (Pialpha GCC · Pialpha AUUS · Pialpha EU) |

Ranh giới: lượt đồng bộ chỉ rút vai **do HRM cấp** (vai cấp tay không bao giờ bị rút); chỉ khoá tài khoản **có gắn mã nhân viên** (tài khoản tạo tay không gắn mã thì không bao giờ bị khoá); không bao giờ khoá người đang là **quản trị duy nhất còn hoạt động** của một team — hệ cảnh báo thay vì khoá.

## Các bước

1. Mở **Cài đặt → Người và team**, đọc dòng chữ cạnh nút «Lấy người từ HRM (BigQuery)».
   → *Kết quả:* dòng ghi nhịp đồng bộ — «tự động mỗi 24 giờ» hoặc «chỉ khi Quản trị bấm (lượt tự động chưa bật)» — và kết quả lần cuối, ví dụ «{ngày giờ} (bấm tay): tạo {n} tài khoản · cấp {n} vai · rút {n} · khoá {n}».
2. Bấm «Lấy người từ HRM (BigQuery)».
   → *Kết quả:* hộp «Lấy người từ HRM» mở ra; hệ đọc HRM mới nhất (không dùng bản đệm) và lập kế hoạch. Dòng đầu: «Đọc HRM lúc {giờ} · {n} người vào hệ (Marketer/Sale đang làm của các team Pialpha) · bỏ qua {n} hồ sơ ngoài hệ, {n} hồ sơ thiếu email.»
3. Mở từng nhóm để đọc danh sách: «Tạo tài khoản» · «Gắn tài khoản có sẵn với hồ sơ HRM» · «Cấp vai» · «Rút vai do HRM cấp» · «Khoá tài khoản (HRM: đã nghỉ)» · «Mở khoá (HRM: làm lại)» · «Đổi tên team theo HRM». Mỗi nhóm ghi số dòng; chỉ nhóm có thay đổi mới hiện.
   → *Kết quả:* bạn thấy đúng từng email, team, vai sẽ đổi. Không có gì đổi thì hộp ghi «Hệ đã khớp HRM — không có gì để áp.» và nút «Áp dụng» bị mờ.
4. Đọc các hộp vàng (nếu có): «{n} chỗ HRM và hệ lệch — không tự sửa» và «Lượt tự động sẽ KHÔNG tự áp kế hoạch này».
   → *Kết quả:* bạn biết chỗ nào phải sửa ở HRM, và vì sao lượt tự động hoãn (xem «Rào an toàn» bên dưới).
5. Bấm «Áp dụng» nếu kế hoạch đúng.
   → *Kết quả:* hệ áp **đúng bản bạn vừa xem**, mọi thay đổi trong một lượt. Thông báo «Đã áp theo HRM: tạo {n} tài khoản · cấp {n} vai · rút {n} · khoá {n} · mở khoá {n} · đổi tên {n} team.»; bảng người tải lại.
6. Đặt mật khẩu cho tài khoản mới: tài khoản vừa tạo từ HRM mang nhãn «Chưa đặt mật khẩu» ở cột «Tài khoản» — bấm «Đặt mật khẩu» theo [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md).
   → *Kết quả:* người đó đăng nhập được.

![Hộp «Lấy người từ HRM» — các nhóm thay đổi và nút «Áp dụng»](images/lay-nguoi-tu-hrm.png)

<!-- CHỤP: anh=lay-nguoi-tu-hrm · vai=quan-tri · duong=/cau-hinh-team · cho=«Lấy người từ HRM (BigQuery)»
     thao_tac=bấm «Lấy người từ HRM (BigQuery)»
     trang_thai=hộp «Lấy người từ HRM» đang mở; dòng «Đọc HRM lúc …»; ít nhất hai nhóm như «Tạo tài khoản», «Cấp vai» kèm số; nút «Áp dụng» sáng. Nếu máy chủ xem thử chưa nối HRM thì nút mờ — chụp dòng chữ cạnh nút
     danh_dau=(1) «Lấy người từ HRM (BigQuery)» · (2) «Đọc HRM lúc» · (3) «Áp dụng» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Lấy người từ HRM (BigQuery)» | Mở kế hoạch; mờ khi máy chủ chưa đọc được HRM |
| (2) | Dòng «Đọc HRM lúc …» và các nhóm thay đổi bên dưới | Đọc số người vào hệ; bấm từng nhóm để mở danh sách email · team · vai |
| (3) | Nút «Áp dụng» | Áp đúng bản đang xem; mờ khi không có gì đổi hoặc bạn không là Quản trị cả ba team |

## Rào an toàn của lượt tự động

Khi máy chủ bật đồng bộ tự động (mỗi 24 giờ), lượt tự động **không tự áp** nếu gặp một trong ba điều sau, mà hoãn lại chờ người xem:

- «HRM đọc về RỖNG — không áp gì…»
- «rút {n}/{m} vai HRM (> 30%) — cần người xem»
- «khoá {n} tài khoản một lượt (> 5) — cần người xem»

Dòng cạnh nút khi đó ghi «… HOÃN, chờ người xem — {lý do}». Bạn mở kế hoạch, kiểm kỹ, đúng thì tự bấm «Áp dụng». Bật hay tắt lượt tự động là việc của người quản trị hệ thống.

## Đọc hai bảng HRM khác

- **Cài đặt → Kết nối, phần «HRM · hồ sơ nhân sự»:** «Đã đọc lúc {giờ} · {n} hồ sơ cả công ty, {n} thuộc team Pialpha ({n} đang làm / thử việc)» và «Bảng ghép {n} tài khoản POS · {n} đã xác nhận · {n} chưa ghép · {n} tài khoản marketer». HRM được đọc lại mỗi ngày một lần; HCNS vừa thêm ai thì bấm «Đọc lại HRM» để thấy ngay.
- **Người và team, khối «Marketer trên POS ↔ hồ sơ HRM»** (chỉ đọc · sửa ở HRM): tóm tắt số tài khoản marketer trên kho hàng của team này (đang làm, đã nghỉ) và của cả công ty (chờ gán team, thuộc team không vào hệ). Bảng gồm «Tài khoản trên POS» · «Hồ sơ HRM» · «Ghép» («đã xác nhận», «HCNS chưa xác nhận», «chưa có trong bảng ghép», «đã nghỉ») · «Team» (tên team hoặc «chờ gán team»). Tài khoản «chờ gán team» thì bổ sung ghép ở HRM.
- Cột «Hồ sơ HRM» của bảng người khớp theo email: «{mã} · {trạng thái} · {team}», «không có trong HRM», hoặc «chưa nối».

## Xử lý khi lỗi

- «HRM hoặc tài khoản trên hệ vừa đổi so với bản bạn đã xem — mở lại kế hoạch rồi áp.» — có thay đổi xen giữa lúc bạn xem và lúc bấm. Đóng hộp, bấm lại nút để lập kế hoạch mới.
- «Không áp được: lượt đồng bộ đụng cả ba team — chỉ người là Quản trị của mọi team mới áp được.» — nhờ người là Quản trị cả ba team bấm, hoặc xin cấp vai Quản trị ở các team còn thiếu.
- «Không lập được kế hoạch: …» — đọc câu kèm theo; thường là HRM đọc hỏng. Kiểm phần HRM ở màn Kết nối.
- Cảnh báo lệch trong kế hoạch:
  - «{email}: tài khoản đã gắn mã {mã}, HRM nói {mã khác} — bỏ qua, sửa ở HRM»
  - «{email}: mã {mã} không còn trong HRM — giữ nguyên, kiểm ở HRM»
  - «{email}: HRM nói đã nghỉ nhưng là quản trị duy nhất của {n} team — KHÔNG khoá; cấp quản trị cho người khác trước»
- Khoá chỉ chặn lần đăng nhập **sau**: phiên người đó đang mở vẫn giữ tới khi hết hạn (tối đa 8 tiếng).

__Liên quan:__ [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md) · [Gán marketer phụ trách sản phẩm](./gan-marketer.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md)
