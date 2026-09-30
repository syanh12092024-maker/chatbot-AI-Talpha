# Nhật ký phiếu VE6b — Số liệu › Chi phí AI theo bản vẽ 3b (30/09/2026)

> CR-28-09c · làn 🟩 (màn ĐỌC; một trường đọc thêm ở máy chủ) · base `16a2490` · commit `aecd410` · Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 3b: bốn ô Mỗi đơn 6.696 đ (đo 22/08) · Mỗi tin 127 đ (đích sau BH8 ≤ 50 đ) · Token mỗi lượt 3.053 · 8.390 · 167 · Trúng cache
  73,3% — và ba tab Từng tin (đắt nhất lên đầu, «Mở hội thoại») · Theo page (Lượt AI · Chặn bằng trả lời sẵn · Tiền · Tiền/đơn) · Theo
  model (model chính · dự phòng khác nhà).
- Kiểm số của bản vẽ: 3.053 · 8.390 · 167 = `HO_SO_TOKEN_DO_THAT` (`v3/src/model/bang-model.js`); 8.390 ÷ (3.053 + 8.390) = **73,3%** ⇒
  định nghĩa «trúng cache» có sẵn, không tự đặt. Đích ≤ 50 đ: tiêu đề `PHIEU-BH8.md` («đích ≤50đ/lượt»).
- Nguồn: `/api/chi-phi` (sổ bot cũ, toàn thời gian) — cầu `chiPhiToanHe` ĐÃ trả tổng token toàn hệ nhưng màn bỏ rơi; dòng page của cầu
  chỉ có `token` = vào + ra (KHÔNG tách đọc lại) ⇒ hai ô token/cache chỉ đúng ở mức TOÀN HỆ. Từng tin: `/api/van-hanh/chi-phi-tin`
  (sổ `so_ai` v3; quản trị · quản lý; 100 lượt mới nhất, xếp theo giờ; không mã hội thoại). Theo model / dự phòng / chặn bằng trả lời
  sẵn theo page: không có nguồn.

## Làm gì — chọn gì thay gì

1. Máy chủ: `toanHe` thêm `soLuotDoThat · tokenVao · tokenRa · tokenDocLai` (vắng ⇒ null). Ca ⑥.
2. Bốn ô theo bản vẽ; hai ô sau ghi «toàn hệ». Chọn đổi bốn ô cũ (tổng tiền · mỗi tin · mỗi đơn · đơn) sang bốn ô bản vẽ — tổng tiền ·
   lượt · đơn của TEAM chuyển lên thanh tab Theo page (+ nhãn «Chưa ra đơn nào» khi 0) ⇒ không mất số nào.
3. Tab Từng tin CHỈ hiện với vai vào được màn Vận hành (hỏi `/api/dieu-huong` — menu tính từ CÙNG hằng vai), máy chủ trả 100 lượt MỚI
   NHẤT ⇒ màn xếp đắt nhất TRONG 100 lượt ấy và nói rõ; không có mã hội thoại ⇒ lối «Tìm hội thoại →» sang Tìm khách theo mã khách;
   sổ rỗng (prod hôm nay: bot v3 phục vụ 0 page) ⇒ nói vì sao, không hiện như «0 ₫». Liên kết bản đủ ở Vận hành GIỮ (thước ll10 V3).
4. Tab Theo model: ba dòng thật (nhà model · theo model chưa có nguồn · dự phòng chưa chạy), lối «Cấu hình model» chỉ cho vai vào được.
5. Bấm thật bắt: ký hiệu tiền lệch giữa hai màn (Tổng quan «đ» tự gõ, Chi phí «₫» của `formatVnd`) ⇒ Tổng quan dùng `formatVnd`;
   cột «Khách nhắn» trống khi lượt không nối được tin ⇒ «—» có chú thích.

## Thước

Mới `v3/test/b/ve6b-chi-phi.test.mjs` C1–C6 (CHẠY THẬT script trang, payload `manChiPhi` thật) · `chi-phi.test.mjs` ⑥. DOM giả của
`ve6a` / `va1` thêm `formatVnd`.

## Đảo-vá — 10/10 đỏ (chạy lại trên mã cuối: vẫn 10/10; VE6a vẫn 11/11)

M1 công thức cache sai · M2 bỏ nhãn toàn hệ · M3 token vắng bịa 0 · M4 từng tin không xếp theo tiền · M5 marketer vẫn gọi cửa Vận hành ·
M6 tab Từng tin cho mọi vai · M7 lối cấu hình model cho mọi vai · M8 sổ rỗng im lặng · M9 mất tổng của team · M10 máy chủ bỏ rơi token.

## Đo

- Cổng `ops/bin/nghiem-thu/ve6b.sh`: ĐỎ 0 / XANH 6 (kèm ve6a · va1).
- `npm test` (dev, sandbox): **2.341 ca · 2.337 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
- Bấm thật (dev · app trong tiến trình · sandbox · cầu bot cũ GIẢ mang hồ sơ token bản vẽ · 3 lượt `so_ai` gieo): quản trị — «8.900 ₫ ·
  131 ₫ (đích ≤ 50 ₫) · 3.053 · 8.390 · 167 · 73,3%», tab Từng tin 129 ₫ → 65 ₫ → 14 ₫, Theo model có lối cấu hình · marketer — không tab
  Từng tin, không lối cấu hình · lỗi JS 0 · request hỏng 0 (cả hai vai) · 390px tràn ngang 0.
- Bò toàn bộ (ba vai, 51 màn): lỗi JS 0 · khung lệch 0 · HTML thô 0 · request hỏng 6 = cùng 6 của VE6a (502 sandbox của cầu bot cũ).

## Chưa làm

- Lượt/tiền theo model · dự phòng: cần gom ở tầng dữ liệu (index `so_ai_chi_phi_theo_model` có sẵn, chưa dùng) và đường chat có dự phòng
  (nợ N-DUPHONGCHATTHAT). Token/cache theo page: cầu phải tách token đọc lại theo page.
