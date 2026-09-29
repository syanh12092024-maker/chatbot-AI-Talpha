# Nhật ký phiếu LL2 — Hộp thư (29/09/2026)

> CR-28-09c · làn 🟨 (duyệt đơn là đường tiền) · base `51d2acc` · commit `1073c44` · Đụng bộ não: không.
> Không có tệp PHIEU riêng: phạm vi lấy từ sổ §5f + `01-QUYET-DINH.md` §10 bổ sung + bản vẽ (bảng 1a · 1b).

## Đo trước khi code

- Bàn hội thoại (`ui/ban-hoi-thoai`) khoá CHỈ ĐỌC bằng sáu thước (`ban-hoi-thoai-khong-gui` T1–T6): chỉ GET,
  đồ thị import khép kín, cửa tiêm đã khai, trang một ô nhập.
- Duyệt/sửa/loại đơn Messenger chỉ có ở `/api/van-hanh/orders/*` — **chỉ quản trị** (router van-hanh chặn mọi
  POST không phải quản trị), trong khi 01 §1 ghi «Sale duyệt → tạo đơn ở Chờ in». Sale hôm nay không duyệt được.
- `handoffConversation` / `resumeConversation`: chỉ ghi CSDL (hoi_thoai + viec_can_xu_ly + nhat_ky), không ghi
  Pancake. Đồ thị import của `hang-cho.js` + `operations.js`: 0 tệp gửi tin (có `@anthropic-ai/sdk` qua
  `src/chat/model.js` — thư viện model, không phải đường tới khách).
- `src/orders/doc-ho-so.js#timKhach/docHoSoKhach` đã cho vai sale (VAI_XEM_HO_SO) — dùng lại cho tìm khách.
- Cổng truy vấn cho đọc `hang_cho_tao_don` · `don_hang` · `viec_can_xu_ly` (BANG_NGHIEP_VU_CHUAN) và nhận mảng = IN.
- Router điều phối mắc `/api/ban-hoi-thoai/:id` TRƯỚC router bàn ⇒ `/api/ban-hoi-thoai/don-cho` sẽ bị nuốt; mã
  hội thoại trong bộ ca/bản xem thử là chữ (`ht1`) ⇒ không ràng `:id` thành số được.

## Làm gì — và chọn gì thay gì (luật 13)

1. **Tách `van-hanh/don-cho.js`** (đọc · lưu · duyệt · loại) nguyên văn từ router van-hanh; van-hanh và Hộp thư gọi
   CHUNG. Chọn tách thay vì chép: đây là đường tiền, hai bản là hai chỗ để bản vá chỉ tới một bên. e2e van-hanh
   (sandbox) xanh 8/8 sau khi tách.
2. **Module ghi riêng `ui/hop-thu`** thay vì thêm POST vào bàn: giữ nguyên thước chỉ-đọc của bàn (T1–T3, T5, T6),
   chỉ sửa T4 (thêm script mới) có lý do. Chín đường, vai = bàn (sale · quản trị), rào ghi JSON + `X-V3-Action`
   như van-hanh, không pool ⇒ 503 «chưa nối».
3. **Đọc thêm ở bàn (GET)**: `?ht=` mở một hội thoại; bối cảnh có `donChoDuyet` (đơn `cho_duyet` mới nhất);
   `donCho()` cho tab Đơn chờ (route đặt ở `/api/hop-thu/don-cho` để khỏi va `/:id` của điều phối).
4. **Trang**: đầu trang + tên menu «Hộp thư»; tab «Đơn chờ»; khối «Đơn chờ duyệt» + form sửa/duyệt/loại ở cột bối
   cảnh; nút «Nhận thay bot» khi bot đang giữ; gõ số điện thoại vào ô tìm ⇒ hồ sơ khách mọi kênh.
   - Bản đầu có tab «Tìm khách» thứ năm — **chụp màn thấy hàng tab tràn** (cột 340px), tab cuối khuất. Đổi: bỏ
     tab, dùng ô tìm sẵn có. Giá: tìm khách phải gõ ≥6 chữ số mới hiện hồ sơ.
   - Chụp lần hai thấy **ô tìm hội thoại so số THÔ** (`0501…` không khớp số chuẩn hoá `501…` trong CSDL — lỗi có từ
     UI-HT2). Không đưa `chuanHoaSdt` vào module đọc (nó kéo `src/db/index.js`, vỡ T1); thay vào đó dùng số máy chủ
     đã chuẩn hoá trả về từ tìm khách để tìm lại hội thoại. Luật cắt mã nước vẫn một bản.
   - Bỏ câu khai kênh kỹ thuật («trang_ban_hang…») khỏi màn sale.
5. `kieu.css`: `button.lien-ke` (hàng bấm mở trong trang) + tab của cột Hộp thư khít hơn để vừa bốn tab.

## Bộ ca

- `v3/test/b/hop-thu.test.mjs` H1–H7: đồ thị import không chạm `src/pancake.js`/hàng gửi/kênh/bộ não · đúng chín
  đường, không đường gửi · 401/403/403 thiếu `X-V3-Action`/503 chưa nối · script: không textarea, một `fetch`,
  mọi lời gọi tới `/api/hop-thu/`, POST đúng bốn việc, ô nhập chỉ `hd-*` · Đơn chờ chỉ team mình, Ladi chỉ nhánh
  WhatsApp · bối cảnh chọn đơn chờ mới nhất · `?ht=` team khác/mã lạ ra rỗng.
- `test/ll2-hop-thu.test.mjs` (Postgres sandbox, POS giả) L1–L5: sale thấy đơn chờ + bối cảnh; marketer 403; team
  khác 404; lưu gói không có ⇒ 400, phiên bản cũ ⇒ 409, tổng tiền từ gói giá; hai lượt duyệt cùng lúc ⇒ ĐÚNG MỘT
  đơn POS; loại không chạm POS; nhận thay bot ⇒ SALE + một việc, bấm lại không thêm; tìm số thô ra đúng khách.
- Thước sửa theo luật mới: `ban-hoi-thoai-khong-gui` T4 · `phan-quyen-nam-vai` (sale + `hop-thu`, module khai
  `VAI_GHI_DUOC`) · tên «Hộp thư» ở `dieu-huong` ④d · `ll1` N7 · `ban-hoi-thoai-ds`.

## Đảo-vá — 11/11 ĐỎ (mỗi đột biến một tiến trình mới, khôi phục, mã băm khớp)

M1 marketer vào Hộp thư → H3 L1 L4 · M2 bỏ rào `X-V3-Action` → H3 L1 · M3 lưu bỏ kiểm phiên bản → L2 · M4 Ladi lẫn
đơn chưa vào máy → H5 · M5 mở đơn cũ nhất → H6 · M6 đơn đã loại tính chờ → H6 · M7 script gọi ra ngoài → H4 · M8
nhận thay bot thiếu chắn pool → H3 · M9 mọc đường gửi tin → H2 · M10 nối thiếu `orderDeps` → L2 · M11 bỏ `ht` → H7.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll2.sh`: **ĐỎ 0 / XANH 11** (kèm e2e van-hanh, ll1, ui-ht1..4).
- `npm test` (dev 29/09): **2.234 ca · 2.230 đạt · 0 đỏ · 4 bỏ qua** (có từ trước).
- Chụp màn thật: sandbox Postgres + ứng dụng v3 đầy đủ, Chromium không giao diện qua DevTools protocol (script tạm
  ở scratchpad, không commit) — ba ảnh: hội thoại + form đơn · tab Đơn chờ · tìm theo số. Không lỗi JS trên trang.
  Khung chat báo «Chưa đọc được hội thoại từ Pancake» vì ứng dụng tạm không nối Pancake — đúng hành vi đã có.

## Chưa làm / để sau

- Lọc «cả ba team» cho sale dùng chung — cần tầng truy vấn nhiều team; đi cùng LL15 (spec §7b mục 12).
- «Việc đang chờ» (`/dieu-phoi`) và «Hội thoại và đơn» (`/van-hanh-v3`) vẫn trên menu dưới Hộp thư — gỡ giao diện ở LL8.
- Chưa deploy.
