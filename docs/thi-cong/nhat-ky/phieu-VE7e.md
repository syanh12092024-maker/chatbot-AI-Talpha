# PHIẾU VE7e — Cài đặt › Nhật ký theo bản vẽ 4

> Làn 🟩 (màn đọc; không đường tiền, không gửi tin) · CR-28-09c · 01/10/2026 · KHÔNG đụng bộ não · 0 biến · 0 gói ·
> 0 migration. Commit `61863a1` · cổng `ops/bin/nghiem-thu/ve7e.sh` · ca `v3/test/b/ve7e-nhat-ky.test.mjs`.

## 1 · Đề bài

Bản vẽ 4 › Nhật ký: «Nhật ký — Ghi cả việc người làm lẫn việc máy làm. Không ai sửa hay xoá được.» · mỗi dòng một câu:
«28/09 15:04 · Linh · Duyệt đơn 77:40310 → Chờ in» · «26/09 15:01 · Ngọc · Sửa lời bot · Kreain Nature PH - Ksa · bản 3» ·
«20/09 09:40 · máy · kéo POS · Cập nhật giá và tồn kho 6 shop».

**Phạm vi âm:** không đổi cách ghi nhật ký (bảng chỉ thêm, không dọn dòng máy cũ) · không đổi quyền xem · không bỏ hai làn.

## 2 · Đo lại nguyên liệu

Prod 01/10 (chỉ đọc, số đếm): 349.537 dòng · 28 dòng việc người · 500 dòng mới nhất = 472 máy + 28 người (⇒ giữ mặc định làn
NGƯỜI) · máy: `may:tang-truy-van` 349.497 · `cua-pos` 9 · `di-tru` · `cham-ti-le-hoan` · `nap-khoi-chung` 1.
Tên đối tượng tra được theo `id` của bảng sống: `anh_san_pham` → `san_pham.id` 4/4 · `ky_nang` 2/2 · `team` 11/11 ·
`san_pham_goc` 2/6 (4 dòng là sản phẩm đã xoá — tên nằm trong `truoc` của chính dòng) · `page` 0/1 · `ket_noi_pos` 0/1.
Mã tầng A ghi thẳng không có chữ (màn in mã trần): `sua` · `them` · `doc` (`src/db/truy-van.js#ghiNhatKyHeThong`) ·
`pos_doc_danh_muc_refresh` · `noi_ho_so_khach` · `chat_mo_hoi_thoai` · `v3_sua_khoi_dung_chung`.

## 3 · Đã làm

- Đầu trang «Nhật ký» + câu của bản vẽ; tên màn trong sổ (`man-hinh.js`) đổi theo — HK10 buộc hai tên trùng.
- Mỗi dòng: Lúc («01/10 05:09»; khác năm nay thì thêm năm) · Ai (người: email; máy: «máy · <việc>») · Việc (chữ hành động ·
  loại đối tượng · TÊN — ghi chú ngay dưới) · Xem.
- Tên đối tượng ba bậc, KHÔNG đoán (`kho-nhat-ky.js`): ① bảng sống của team, một lượt đọc mỗi bảng cho cả trang (`BANG_TEN`:
  page · san_pham · anh_san_pham→san_pham · san_pham_goc · ky_nang), qua cổng CỦA TEAM người xem ⇒ không mượn tên team khác;
  người dùng làm đối tượng tra cùng lượt với người làm · ② không còn thì tên chụp trong chính dòng (`sau.ten`/`truoc.ten`) ·
  ③ «Loại #id». Tra hỏng ⇒ vẫn hiện (rơi bậc ②/③).
- Việc máy: nhãn khi đọc mã thấy rõ (`TEN_VIEC_MAY`: tầng dữ liệu · cửa POS · tạo đơn POS · ghi ngược lên POS · hàng chờ tạo đơn ·
  gửi WhatsApp · bot nhận tin · bot trả lời · hàng đợi tin · chấm tỉ lệ hoàn · di trú dữ liệu); việc lạ hiện nguyên mã.
- Chữ cho 7 mã tầng A trong `MO_TA` — tập mã v3 ĐƯỢC GHI vẫn suy từ `HANH_DONG`, không từ `MO_TA` (ca E6 canh).
- Nhãn loại `anh_san_pham` («Ảnh sản phẩm») · `khoi_dung_chung` («Chính sách · FAQ · Phản đối»).

## 4 · Chọn A thay B

- **Giữ bảng + hai làn thay vì một danh sách trộn như bản vẽ**: prod 472/500 dòng mới nhất là máy — trộn là chôn 28 dòng người.
  Mỗi dòng vẫn là câu của bản vẽ.
- **Tên chụp trong dòng cho đối tượng đã xoá** thay vì «#id»: đó là sự thật lúc xảy ra, chính bảng không sửa được lưu lại.
- **Việc máy lạ hiện nguyên mã** (`nap-khoi-chung` không thấy trong mã hôm nay) thay vì đặt tên đoán.

## 5 · Thước

- HK10 (he-kieu): đầu trang = tên trong sổ màn — đổi CẢ HAI chỗ; thước giữ nguyên, xanh.
- `nhat-ky-man` (13 ca) giữ nguyên nghĩa `doiTuong` (team ⇒ tên team; loại khác ⇒ nhãn loại), xanh; tên mới đi trường riêng
  `tenDoiTuong`.

## 6 · Kiểm (máy dev, 01/10)

- Chạy thật E1–E6 **6/6** (máy chủ vai-b + bộ đọc nhật ký THẬT `audit#docNhatKy` trên cổng giả; trang trong vm) · chạy ở ba múi
  giờ (UTC · Asia/Ho_Chi_Minh · America/Los_Angeles) đều 6/6.
- Đảo-vá **17/17 ĐỎ** (không tra bảng sống · không lấy ảnh chụp · ảnh không trỏ san_pham · không nối cổng · máy không nói việc ·
  việc lạ bị đoán · đầu trang cũ · ra tên mà giữ #id · ghi chú mất · thiếu nhãn loại · tên sổ lệch đầu trang (HK10) · tra hỏng
  làm chết màn · trang không in tên · mã tầng A không chữ · mã tầng A lọt thành mã được ghi · người dùng không ra tên · giờ kiểu cũ).
- Cổng `ve7e.sh` **10/10** (kèm `ve7d.sh` lồng). `npm test` **2.434 ca · 2.430 đạt · 0 đỏ · 4 bỏ qua** (+6). ĐỦ cổng: **49 xanh / 12 đỏ** = đúng 12 nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2).
- Chụp trên Postgres hộp cát (dòng nhật ký THẬT, INSERT): «Tạo sản phẩm gốc · Sản phẩm gốc · Kem dưỡng Kreain» · «Bỏ sản phẩm
  gốc · Sản phẩm gốc · Trà thảo mộc (cũ)» (đã xoá — tên chụp) · «Gán sản phẩm gốc cho page · Page · Kreain Nature PH - Ksa» ·
  làn máy «máy · cửa POS — Cập nhật món từ lượt kéo POS» · 390px tràn ngang 0 · lỗi console 0.

## 7 · Nợ

- Không nợ mới. (Dòng máy `tang-truy-van` 349 nghìn vẫn nằm trong bảng — thuốc thật là `PHIEU-B-Y5`, đường XEM không ghi nhật
  ký; nhật ký cấm xoá nên không dọn.)
