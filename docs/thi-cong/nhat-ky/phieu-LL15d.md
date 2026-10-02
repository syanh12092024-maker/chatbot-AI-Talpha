# PHIẾU LL15d — Marketer chỉ thấy sản phẩm mình phụ trách · chọn marketer từ hồ sơ HRM · gợi ý từ đơn POS

> Làn 🟥 (quyền đọc của một vai + một migration) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ não · 0 gói · **1 migration (031)** · 0 biến
> mới (dùng lại `V3_BQ_KHOA`). Commit `e68227a` · cổng `ops/bin/nghiem-thu/ll15d.sh` · ca `test/ll15d-marketer-san-pham.test.mjs`
> (hộp cát) + `v3/test/b/ll15d-marketer-man.test.mjs` (đầu-cuối hộp cát).

## 1 · Đề bài

Người quyết 02/10 «5. ok làm đi» cho «Marketer chỉ thấy sản phẩm mình phụ trách» (01 §9). Đọc lại quyết định đã ký TRƯỚC khi làm:
CR-28-09c «marketer phụ trách **chọn từ hồ sơ HRM**, gán ở sản phẩm × thị trường, page kế thừa»; 30/09 «một marketer cho mọi thị trường
của sản phẩm» (đã có ô chữ `san_pham_goc.marketer`, chú thích «nối hồ sơ HRM ở LL15»). ⇒ nguồn sự thật là PHÉP GÁN của người; đơn POS
chỉ là GỢI Ý (đúng nợ N-MK-GOI-Y-DON). Lời tôi nói hôm trước («hệ biết được page/sản phẩm nào của ai» từ bảng ghép) sai chỗ này — sửa
theo quyết định đã ký.

**Phạm vi âm:** KHÔNG tự gán marketer (máy chỉ gợi ý) · KHÔNG lọc các màn con của Page (kịch bản · ảnh · prompt · lên chạy…) · KHÔNG
gán hàng loạt · KHÔNG kéo danh mục / tạo sản phẩm hộ (việc người đã hẹn «để sau»).

## 2 · Đo lại nguyên liệu (02/10, prod CHỈ ĐỌC)

- `PIALPHA_ALL_Dataset.page_marketer`: **1 dòng** — không dùng được làm nguồn page ↔ marketer.
- Đơn 60 ngày (`vw_sale_order_team`): 24.104 đơn, 98,6% có marketer; trường `marketer` là **JSON** (`{"id": …}`) — so thẳng với
  `dim_person_map.person_id` khớp 0; `JSON_VALUE(marketer,'$.id')` ⇒ 30/31 mã ra mã NV, **11/11** marketer đang làm của ba team có đơn;
  một person_id ↔ đúng một mã NV (0 trùng). Đơn huỷ 4.035 (bỏ khi gợi ý).
- Dòng hàng (`vw_order_items_team`) mang `shop_id` + `variation_id` = khoá món POS của v3 (`san_pham.ma` = `shop:biến thể`).
- **Danh mục v3 trên prod gần rỗng:** 1 sản phẩm gốc; 353 món POS có đơn 60 ngày thì 37 món có trong `san_pham`, 1 món nằm trong sản
  phẩm gốc ⇒ lọc + gợi ý chạy đúng nhưng chỉ có tác dụng khi danh mục được kéo về và gộp thành sản phẩm (việc người, «để sau»).

## 3 · Đã làm

- **031**: `san_pham_goc.marketer_ma_nv` (+ chỉ mục) — CHỈ THÊM; `marketer` giữ TÊN (page kế thừa tên, báo cáo đọc tên). 030 để dành
  cho phiên MB (bộ chạy migration không đòi số liền — đo `db/migrate.js`).
- Tầng A (`src/products/san-pham-goc.js`): danh sách · chi tiết trả `marketerMaNv`; sửa nhận `marketerMaNv` — tên và mã đổi CÙNG lượt,
  gõ tay tên mà không mã ⇒ xoá mã (không để tên người này mang mã người kia); gộp món nhận `marketerMaNv`.
- `auth/kho-nguoi-dung.js`: `maNvCua` · `marketerCuaTeam` (tài khoản vai marketer ở team, còn hoạt động, CÓ mã NV).
- `src/hrm/goi-y-marketer.js`: một câu SELECT (JSON marketer → person_map → mã NV; bỏ đơn huỷ; 60 ngày) · bộ đọc đệm một ngày (hai lời
  gọi = một lượt, lỗi không đệm) · `goiYChoSanPham` (cộng đơn các món CỦA sản phẩm; người đứng đầu không chọn được ⇒ nói ra, không gợi ý
  người thứ hai).
- **Phạm vi** (`v3/src/ui/chung/pham-vi-marketer.js` — MỘT luật): vai marketer không kèm quản trị/quản lý ⇒ chỉ sản phẩm gán đúng mã
  NV mình + page kế thừa (`page.san_pham_goc_ma`). Áp ở: danh sách · chi tiết · kiến thức · lịch sử sản phẩm (`kho-goc.js`) · bản sao
  theo page (`kho-san-pham.js`) · cột page + trang page + nội dung page (`kho-mot-page.js`). Ngoài phạm vi ⇒ 403 `khong_phu_trach` nói
  vì sao (page/sản phẩm CÓ trong team — 404 là nói sai). Tài khoản marketer không mã NV ⇒ rỗng + câu «chưa gắn hồ sơ HRM».
- Màn Sản phẩm: tab Chung — ô CHỌN marketer (tài khoản có mã NV), tên gõ tay cũ hiện «chưa nối HRM — chọn lại»; dòng gợi ý «Bình — 82%
  đơn (41/50)» + «Dùng gợi ý»; hộp gộp món — ô chọn marketer. Cột trái: «Chỉ hiện x/y sản phẩm bạn phụ trách · z chưa gán». Màn Page:
  câu phạm vi đầu cột page.
- Nối dây: `vai-b.js` dep `docGoiYMarketer` (thiếu ⇒ báo); `chay-that.js` dựng khi có `V3_BQ_KHOA`. Nhật ký sửa sản phẩm ghi
  `marketerMaNv`. `03-MAN-HINH.md` (Sản phẩm · Page) · `bien-moi-truong-v3.md` (dòng `V3_BQ_KHOA`).

## 4 · Chọn A thay B

- **Gán của người + gợi ý của máy** thay vì suy phụ trách từ đơn: đúng quyết định đã ký; giá: chưa gán thì marketer không thấy gì.
- **Page kế thừa qua `san_pham_goc_ma`** thay vì `page.marketer` (chữ): chữ không phải khoá (trùng tên, gõ sai). Giá: page chưa gắn sản
  phẩm thì ngoài phạm vi MỌI marketer (quản trị gắn ở Sản phẩm › Page đang bán).
- **403 nói lý do** thay vì 404 cho page/sản phẩm ngoài phạm vi: cùng team, marketer biết nó tồn tại (bảng tổng); 404 là nói sai.

## 5 · Thước

- `ve8b-man` S3 (ô marketer gõ tay → POST {marketer}) · `ve8a-gop` G2 (ô gõ tay trong hộp gộp) · `ve2-mot-page` P1 (marketer thấy mọi
  page) neo luật cũ ⇒ đổi theo luật mới (ô chọn + POST {marketerMaNv}; P1 xem danh sách đủ bằng quản trị + thêm ca marketer chỉ thấy
  page kế thừa). `vai-b-noi-day` «nối đủ» thêm `docGoiYMarketer` + đòi báo thiếu.
- Ca đầu-cuối S1 lượt đầu gửi khoá kiến thức tự đặt (`congDung`) — 403 đỏ ĐÚNG nhưng có thể đỏ vì khoá sai; đổi sang khoá thật
  `cong_dung` để 403 chỉ còn vì phạm vi. S5 lượt đầu kiểm sai người (sau khi gán lại, An còn 0/3 là ĐÚNG) — thước sai, sửa.
- Thêm vào ca một quản trị kiêm marketer (không mã NV) — không có thì đột biến «lọc cả quản trị» không có ca bắt.

## 6 · Kiểm (02/10, worktree)

- Tầng A D1–D4 **4/4** · đầu-cuối S1–S5 **5/5** · đảo-vá **27/27 ĐỎ** · cổng `ll15d.sh` **21/21** (lồng `ll15c.sh` → … → `ve7e.sh`) · `npm test` **2.470 ca · 0 đỏ** trong worktree (22 bỏ qua — 18 ca cần dữ liệu thật bị gitignore không có ở worktree); cửa vào trên cây chính sau rebase lên `94d7cd5`: **2.466 đạt · 0 đỏ**.

## 7 · Nợ

- **N-MK-LOC-PAGE-CON** các màn con của Page (kịch bản · ảnh · prompt · lên chạy · hiệu quả) chưa lọc theo phạm vi marketer.
- **N-MK-GAN-HANG-LOAT** chưa có «gán theo gợi ý cho mọi sản phẩm chưa gán» — gán từng sản phẩm.
- **N-DANH-MUC-RONG** prod: 1 sản phẩm gốc, 37/353 món có đơn nằm trong danh mục — lọc chỉ có tác dụng khi kéo danh mục + gộp sản phẩm.
