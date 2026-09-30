# PHIẾU VE7d — Cài đặt › Người và team theo bản vẽ 4

> Làn 🟩 (giao diện + câu chữ; không đường tiền, không đường gửi tin) · CR-28-09c · 01/10/2026 · KHÔNG đụng bộ não · 0 biến ·
> 0 gói · 0 migration. Commit `e258e14` · cổng `ops/bin/nghiem-thu/ve7d.sh` · ca `v3/test/b/ve7d-nguoi-team.test.mjs`.

## 1 · Đề bài

Bản vẽ 4 › Người và team: ba nút đầu trang (Lấy người từ HRM (BigQuery) · Tạo người dùng · Chuyển page sang team khác) · ba
thẻ vai (Quản trị · Marketer · Sale) · «Marketer trên POS ↔ hồ sơ HRM» (chỉ đọc · sửa ở HRM) · bảng người (Người · Hồ sơ HRM ·
Vai · Phụ trách). Luật chung chuỗi VE: chỗ chưa có nguồn nói «chưa có nguồn / chưa nối», không bịa.

**Phạm vi âm:** không nối HRM (LL15, chờ việc người H11) · không làm «marketer chỉ thấy sản phẩm mình phụ trách» (§9) · không đổi
quyền của vai nào · không gỡ đường API cũ.

## 2 · Đo lại nguyên liệu

Prod 01/10 (chỉ đọc, chỉ số đếm): 1 người dùng (quản trị ở team 1–3) · 4 team (team 4 = «chua-phan», kỹ thuật, giữ 68 page) ·
`page.marketer` trống **582/582** · sản phẩm gốc 1, chưa marketer · không cột nào nối `nguoi_dung` ↔ HRM/marketer.
Mã: ba vai gán được đã có (LL7: Quản trị · Marketer · Sale; «Quản lý» · «Người duyệt kịch bản» còn đọc được, không cấp mới) ·
vai Marketer là quyền THEO MÀN (`VAI_VAO_DUOC`), không lọc page/sản phẩm theo người — §9 «marketer chỉ thấy sản phẩm mình phụ
trách» CHƯA làm, không phiếu nào ôm (LL15 chỉ nối HRM) · HRM: LL15 ⬜ chờ H11 (tài khoản BigQuery chỉ đọc).
Menu theo vai (`menuCua`, đo 01/10): quản trị 5 mục (23 màn) · marketer 5 mục (11 màn) · sale 1 mục Hộp thư (3 màn).

Cùng họ lỗi VE7c: `kho-team.js#canhBaoTuTongQuan` («bot đang chạy bằng bộ mặc định của hệ», «… BẬT bot AI bằng model mặc định»)
và bước ④ «Bắt đầu» («Chưa cấu hình model nào. Bot đang chạy bằng bộ mặc định…» · «Thiếu vai trò dự phòng thì nhà chính hết tiền
là bot đứng im») — sai với đường bot (team chưa có dòng ⇒ model máy chủ `MODEL_CLOSER`; dự phòng chưa nối nên có hay không cũng
đứng im). Nguồn câu nằm trong module team của phiếu này ⇒ sửa câu tại nguồn.

## 3 · Đã làm

- `v3/src/ui/team/ba-vai.js` (mới): `baVaiCua` — mỗi vai gán được: «mở được» = `menuCua([vai])` (mục + màn, bỏ màn thử nghiệm;
  nạp `man-hinh.js` lúc gọi để khỏi vòng import) · số người mang vai · phụ trách (`PHU_TRACH`: quản trị «Tất cả» `tatCa` ·
  sale «Hộp thư của team» · marketer «Chưa có nguồn» + vì sao) · page có tên marketer (số đo) · `HRM` chưa nối (chờ gì, nguồn gì).
- `GET /api/team/thanh-vien` trả thêm `baVai`.
- Màn viết lại theo bản vẽ: hàng nút (HRM tắt + câu vì sao cạnh nút) · ba thẻ vai (mở được «Mục (số màn)» + danh sách màn gập ·
  phụ trách · thẻ Marketer nói thẳng §9 chưa làm) · khung HRM «Chưa nối vào máy chủ» (khi nối đọc gì, hôm nay chờ gì, thiếu ai
  bổ sung ở HRM, lối sang Kết nối › HRM — không số đo tay) · bảng người thêm cột Hồ sơ HRM («chưa nối») + Phụ trách (người mang
  vai quản trị ⇒ «Tất cả»; vai cũ ⇒ «—») · khung «Chuyển page sang team khác» gập, nút đầu trang mở ra (`#chuyen-page` mở sẵn).
  Bỏ hàng chỉ số + tab «Kết nối POS» + băng cảnh báo team trên màn này (POS ở Kết nối từ VE7b; cảnh báo team phục vụ Bắt đầu).
- Câu «bộ mặc định» thay bằng câu đúng đường bot ở `canhBaoTuTongQuan` (mã + mức giữ nguyên) và bước ④ «Bắt đầu».
- CSS `.luoi-ba-vai` (lưới tự xuống hàng; bỏ lề `.panel + .panel` trong lưới).

## 4 · Chọn A thay B

- **«Mở được» đo bằng `menuCua` thay vì chép chữ bản vẽ** («Mọi thứ · luật chung · kết nối · model»): chữ bản vẽ là hứa, `menuCua`
  là thứ thanh điều hướng thật sự dựng. Giá: câu khô hơn — bù bằng số màn mỗi mục + danh sách gập.
- **Marketer «Chưa có nguồn» thay vì khớp tên người dùng với `page.marketer`**: khớp theo tên là đoán (trùng tên, sai chính tả) và
  prod hôm nay 0/582 page có tên marketer — không có gì để khớp. Nguồn đúng là mã nhân viên HRM (LL15).
- **Nút HRM hiện nhưng tắt, câu vì sao đứng cạnh** (không giấu nút): người xem biết việc đó sẽ có và đang chờ gì.
- **Giữ `/api/team/tong-quan` và `/api/team/ket-noi`** (không màn này gọi nữa): tổng quan còn phục vụ «Bắt đầu» (qua hàm); gỡ
  `ket-noi` kéo theo sửa 6 tệp ca — việc của LL8 (gỡ màn thừa), ghi nợ.

## 5 · Thước

- `bot-bat-that.test.mjs` đòi chữ «mặc định» trong cảnh báo team (neo vào câu SAI) ⇒ đổi thành: cấm «bộ mặc định / model mặc
  định», đòi «model của máy chủ (MODEL_CLOSER)». `team-cau-hinh` chỉ neo mã + mức — giữ nguyên, xanh.
- `va1-ten-chua-khai` (chạy thật script màn cũ: tạo người + chuyển page) giữ nguyên, xanh — mọi id nó dùng còn đủ.

## 6 · Kiểm (máy dev, 01/10)

- Chạy thật N1–N8 **8/8** (máy chủ vai-b + trang trong vm; dữ liệu có đủ ba vai + một người HAI vai + một vai cũ).
- Đảo-vá **18/18 ĐỎ** (mở được gõ tay · marketer bịa phụ trách · đếm page sai · HRM khai đã nối · máy chủ không trả ba vai · nút
  HRM bấm được · màn còn nạp tổng quan · quản trị không phủ vai khác · thẻ marketer im §9 · khung chuyển mở sẵn / không mở ·
  hai câu «bộ mặc định» · cột HRM «—» · vai chỉ xem thấy nút tạo · không đếm người · vai cũ bịa phụ trách · tạo xong không nạp).
- Cổng `ve7d.sh` **15/15** (kèm `ve7c.sh` lồng). `npm test` **2.428 ca · 2.424 đạt · 0 đỏ · 4 bỏ qua** (+8). ĐỦ cổng:
  **48 xanh / 12 đỏ** = đúng 12 nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2); `l1-m1` lượt này xanh.
- Chụp trên Postgres hộp cát (người + vai + page THẬT): ba thẻ «Quản trị 1 người · Hộp thư (4) · Sản phẩm (1) · Page (7) · Số liệu
  (4) · Cài đặt (7)» / «Marketer … Page có tên marketer: 0/3» / «Sale 2 người · Hộp thư (3)» · khung HRM chưa nối · bảng 4 người
  «chưa nối» · bấm «Chuyển page» ⇒ khung mở, 3 page · 390px tràn ngang 0 · lỗi console 0.

## 7 · Nợ

- **N-MK-CHI-THAY-SP-MINH** `01-QUYET-DINH.md` §9 «marketer chỉ thấy sản phẩm mình phụ trách» chưa làm và chưa phiếu nào ôm —
  cần LL15 (mã nhân viên ↔ tài khoản POS ↔ marketer của sản phẩm) rồi lọc theo người ở Sản phẩm/Page. Màn nói thẳng.
- **N-TEAM-KETNOI-THUA** `/api/team/ket-noi` + `ketNoiCua` + `datDocKetNoiPos` của module team không còn màn nào gọi (POS ở Cài
  đặt › Kết nối) — gỡ ở LL8 cùng ca canh (`team-cau-hinh` ×3, năm dòng `datDocKetNoiPos(null)`).
