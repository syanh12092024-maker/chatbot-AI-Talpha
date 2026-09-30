# PHIẾU VE7b — Cài đặt › Kết nối theo bản vẽ 4: năm phần · POS kèm tiền tệ + số món · WhatsApp đọc van thật · chỗ chưa có nguồn nói thẳng

> Làn 🟩 giao diện · CR-28-09c · 30/09/2026 · KHÔNG đụng bộ não · 0 migration · 0 biến · 0 gói.
> Commit mã `1c66710` · cổng `ops/bin/nghiem-thu/ve7b.sh` · ca `v3/test/b/ve7b-ket-noi.test.mjs` · DOM giả dùng chung `v3/testkit/dom-gia.js`.
> Chạm một tệp tầng A ngoài làn giao diện: `src/channels/whatsapp/index.js` — THÊM một export (`cuaGuiWaDangMo`), không đổi hành vi
> (bộ ca L1-M3 17/17 chạy trong cổng ③).

## 1 · Đề bài

Phiếu thứ hai của VE7 (VE7a thứ tự cụm + Hệ còn sống · **VE7b Kết nối** · VE7c Model AI · VE7d Người và team · VE7e Nhật ký).
Bản vẽ 4 (`CaiDat.dc.html` › Kết nối) có năm phần theo thứ tự: **Pancake · đọc tin, gửi tin** (bảng token có cột «Không quyền») ·
**POS · mỗi shop = một thị trường** (thị trường · tiền tệ · shop · trạng thái · số món) · **WhatsApp · xác nhận đơn chốt qua Ladi** ·
**HRM · hồ sơ nhân sự** · **Kéo dữ liệu** (thêm kho POS · kéo danh mục và giá · quét Pancake tìm page mới · kéo lại dữ liệu cũ).

## 2 · Đo lại nguyên liệu

- Màn cũ có ba phần: «Tài khoản Pancake» · «Kho hàng của team đang mở» (nút thêm/kéo trên thanh bảng) · «Kéo dữ liệu về».
- **Tiền tệ + số món của shop**: không cột nào giữ sẵn. Lượt kéo danh mục ghi `san_pham.ma = <shopId>:<id biến thể>`
  (`src/pos/doc-danh-muc.js:122`) và `goi_gia.tien_te` ⇒ suy được từ danh mục ĐÃ KÉO của team. Món `kb:` nạp từ bot không mang mã
  shop. Cổng truy vấn thật không có LIMIT ngầm (`v3/src/noi-day/cong-du-lieu-that.js:157` chỉ cắt khi truyền `gioiHan`).
- **«Không quyền»** (số page một token bị Pancake trả «không có quyền hạn trên trang này»): KHÔNG nguồn nào đo.
- **WhatsApp — lời khai đầu của tôi SAI một nửa, sửa trong lượt.** Bản đầu viết «hệ chưa có đường gửi WhatsApp». Grep ra:
  `src/wa.js` (Baileys) chỉ gửi báo cáo/cảnh báo vào NHÓM NỘI BỘ; còn đường gửi CHO KHÁCH đã có khung ở `src/channels/whatsapp/`
  (phiếu L1-M3: rào nguồn đơn `trang_ban_hang`, chỉ mẫu Meta đã duyệt, guard `V3_WA_GUI`), `BANG_MAU_TIN` rỗng, điểm kiểm H1 TREO
  (chưa số WhatsApp nào nối vào Pancake). Prod đo 30/09 (`/proc/<pid>/environ`, chỉ đếm): `aicloser-v3` **vắng `V3_WA_GUI`**,
  `PANCAKE_READONLY=1` ⇒ van đóng. Trạng thái do BIẾN quyết ⇒ màn phải ĐỌC van, không in chữ tĩnh.
- **HRM**: CR-28-09c dòng 130–150 — «Máy chủ v3 chưa có quyền đọc BigQuery» (việc người H11); chốt team 29/09. Không có đường mã nào
  đọc HRM trên máy chủ ⇒ «chưa nối» là sự thật cấu trúc (khối này sẽ được thay khi LL15 làm). Số «118 hồ sơ · 98,6%» của bản vẽ là đo
  TAY ⇒ không lên màn.
- «Quét Pancake» đã có cửa `/api/page-bot/quet` (quản trị · quản lý) — Kết nối chỉ quản trị ⇒ dùng lại, không đẻ cửa thứ hai.

## 3 · Đã làm

- `kho-ket-noi.js`: `monTheoShop` (san_pham + goi_gia của team qua cổng; tiền tệ = loại gặp NHIỀU nhất) ⇒ `ketNoiPosCua` trả thêm
  `soMon`/`tienTe` mỗi dòng + `monViSao`; không cổng hoặc đọc hỏng ⇒ `soMon=null` + vì sao, **bảng POS vẫn hiện**.
  `trangThaiWhatsApp()` đọc van của CHÍNH cửa gửi (`cuaGuiWaDangMo`) + số mẫu `da_duyet===true` trong `BANG_MAU_TIN`; «số WhatsApp nối
  vào Pancake» ⇒ null + vì sao (H1). Cửa mới `GET /api/ket-noi/whatsapp` (chỉ đọc, cùng vai màn).
- `ket-noi.html` năm phần đúng thứ tự:
  - Pancake: cột «Không quyền» = «chưa đo» + ghi chú vì sao; «Thêm tài khoản» → «Thêm token».
  - POS: Thị trường · Tiền tệ · Shop · Trạng thái · Món (`N món` · «chưa kéo danh mục» khi 0 · «chưa đo» + `#ghiChuMon` khi không đo
    được) · Việc; ghi chú một shop = một thị trường (chốt 29/09), thị trường page còn gõ tay (LL16).
  - WhatsApp: nhãn theo VAN THẬT («Chưa nối» · «Van mở · chưa mẫu nào duyệt» · «Van mở») + ba dòng đo (van + giá trị biến · số mẫu
    duyệt · số WhatsApp nối Pancake «chưa đo») + luật khi mở (chỉ đơn trang bán hàng/Ladi; đơn chat Messenger và sale nhập tay không gửi).
  - HRM: «Chưa nối vào máy chủ» + năm dòng nguồn/luật, không số đo tay.
  - Kéo dữ liệu: bốn nút một chỗ; «Quét Pancake» gọi đúng `/api/page-bot/quet` (hai cảnh rỗng hai câu, án lệ 17/09); nhãn trạng thái
    nạp lại chuyển về CẠNH nút của nó (ở đầu khối trông như cả bốn việc hỏng) + câu «Nạp lại: …».
  - Ba khối nạp SONG SONG (ba cửa độc lập); «Nguồn số» thêm ba dòng; `kieu.css` `.luoi-kv code` ngắt được (tên bảng dài làm tràn 390 px).
- `v3/testkit/dom-gia.js`: DOM giả + chạy script trang thật, tách khỏi ca VE2b; **`textContent`/`innerHTML` SỐNG theo cây** (xem §5).
- `03-MAN-HINH.md` dòng Cài đặt: câu VE7b.

## 4 · Chọn A thay B

- **Số món SUY từ danh mục đã kéo**, không gọi POS lúc mở màn: không ra Internet, không cần khoá; giá: số trễ tới lượt kéo gần nhất.
- **Tiền tệ = loại gặp nhiều nhất**, không phải loại gặp đầu: một bậc giá gõ nhầm tiền không đổi được tiền tệ cả shop. Giá: shop bán
  hai loại tiền ngang nhau thì màn hiện một (chưa thấy trong dữ liệu).
- **WhatsApp đọc van qua hàm guard của chính cửa gửi** (export thêm từ tầng A) thay vì chép luật `V3_WA_GUI && !PANCAKE_READONLY` sang
  tầng B: một luật một chỗ. Giá: phiếu giao diện chạm một tệp tầng A (chỉ thêm export).
- **Bỏ phép kiểm «mã shop toàn chữ số»** tôi viết ở bản đầu: không chặn được gì quan sát được — code chết nói dối về điều nó canh.

## 5 · Thước

- **DOM giả chụp `textContent` lúc dựng** (`dom-gia.js` bản đầu): con bị gán `innerHTML` mà tổ tiên vẫn đọc chữ CŨ ⇒ khối WhatsApp đã
  vẽ đúng mà ca đọc `section.textContent` thấy «đang đọc…». Thước sai, màn đúng. Sửa: mỗi phần tử giữ dãy «đoạn chữ · con»,
  getter tính lại mỗi lần đọc. Ca VE2b 17/17 vẫn xanh sau sửa (không ca nào xanh nhờ chữ cũ).
- Ca K5 bản đầu buộc thứ tự «Chưa nối» trước «mẫu tin … Meta» và dính nhãn–giá trị bằng dấu cách (DOM thật không có) ⇒ tách phép kiểm,
  `\s*` giữa nhãn và giá trị. Kho token giả của ca thiếu `them`/`bo` (luật «nửa cửa») và `hetHan` là chuỗi ISO trong khi `dsToken` thật
  trả mili-giây (`src/token-pancake.js:53`) ⇒ sửa ca, không sửa mã.
- Không thước cũ nào neo bố cục Kết nối cũ (grep chỉ ra chú thích).

## 6 · Kiểm (máy dev, 30/09)

- Ca `v3/test/b/ve7b-ket-noi.test.mjs` **8/8** (K1 món + tiền tệ đúng shop/team, bỏ `kb:`, số đông thắng · K2 không cổng ⇒ null +
  vì sao, đọc hỏng ⇒ bảng vẫn đủ · K3 năm phần đúng thứ tự · K4 dòng POS · K5 chưa nguồn nói thẳng, van đọc thật, HRM không số tay ·
  K6 bốn việc một chỗ + quét đúng cửa · K7 màn «chưa đo» + vì sao · K8 van mở + 0 mẫu ⇒ «Van mở · chưa mẫu nào duyệt»).
- Đảo-vá **17/17 ĐỎ** (tiền tệ loại đầu · không cổng vẽ 0 · đọc hỏng giết bảng · mọi shop cùng số · «0 món» · «Không quyền» vẽ 0 · HRM
  số tay · nhãn WA không theo van · van luôn mở · van luôn đóng · đếm cả mẫu chưa duyệt · van mở + 0 mẫu khoe «Van mở» · quét cửa khác ·
  nút POS về bảng · HRM trước WhatsApp · giấu vì sao · mất ghi chú «Không quyền»).
- Cổng `ve7b.sh` **9/9** (kèm L1-M3 17/17) · `npm test` **2.383 ca · 2.379 đạt · 0 đỏ · 4 bỏ qua** · ĐỦ cổng `phat-hanh.sh` trên
  `1c66710` (14:43): **43 xanh · 13 đỏ = 12 nợ cũ + `l1-m1`** (POS Taiwan vẫn 0 đơn «Chờ in» — N-L1M1-SONG).
- Chụp (sandbox Postgres; kho token + lượt quét GIẢ, POS + danh mục thật trong sandbox): năm phần đúng thứ tự · POS «Kuwait KWD 1 món ·
  Oman — chưa kéo danh mục · Saudi SAR 3 món» · WhatsApp «đóng (V3_WA_GUI vắng · PANCAKE_READONLY = 1)» · quét ⇒ «130 page · 2 mới ·
  128 cập nhật» · 390 px tràn 0 (trước sửa CSS: 24 px) · 0 lỗi JS, 0 request hỏng.

## 7 · Nợ phát sinh → §9

- **N-KHONGQUYEN-DO** cột «Không quyền» của bảng token chưa đo: cần một lượt dò Pancake (chỉ đọc) theo từng page của mỗi token, đếm page
  trả «không có quyền hạn trên trang này». Màn đang nói «chưa đo».
