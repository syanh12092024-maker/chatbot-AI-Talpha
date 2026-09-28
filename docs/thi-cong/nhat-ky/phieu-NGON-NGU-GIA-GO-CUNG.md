# PHIẾU 28/09 — TRẢ LỜI ĐÚNG NGÔN NGỮ KHÁCH · CẢNH BÁO GIÁ GÕ CỨNG TRONG KỊCH BẢN

> Làm 28/09/2026 · hai phát hiện của lượt giả lập Minty KSA trên hội thoại thật (sổ §10, 28/09).
> Người quyết: «khách hỏi ngôn ngữ nào thì trả lời ngôn ngữ đó» · «(giá gõ cứng) fix đi».

## 1. Khách hỏi ngôn ngữ nào, bot trả lời ngôn ngữ đó

**Đo:** 3 khách gõ «How much?» bằng tiếng Anh, cả 3 nhận câu mẫu tiếng Tagalog. Câu mẫu của
page chỉ có một ngôn ngữ, hai lớp 0 đồng (lớp từ khoá + fast lane) gửi nó cho mọi khách.

**Làm:** `src/chat/ngon-ngu.js` (mới) đoán ngôn ngữ (Ả Rập · Tagalog · Anh · pha Anh–Tagalog ·
Việt). Khi câu mẫu LỆCH ngôn ngữ khách, lớp 0 đồng **nhường lượt ấy cho model** — cùng cửa
nhường của `V3_LAN_CHOT_MODEL` — model tự trả lời bằng ngôn ngữ khách. Không dịch câu mẫu:
câu mẫu là lời người đã duyệt, dịch máy là gửi một câu chưa ai đọc.

**Bảo thủ, cố ý:** chỉ nhường khi đoán được CẢ HAI và chúng khác nhau. Emoji, số, «ok» ⇒ giữ
hành vi cũ. Câu pha («How much po?», «Yes po, original») hợp với cả mẫu Anh lẫn mẫu Tagalog.
Tiếng Việt nhận ra nhưng không bao giờ là căn cứ nhường (chỉ gặp trong câu giả của bộ ca).

**Ba lần bộ đoán sai, đều bắt bằng câu thật của Minty:** «ilang araw bago dumating» bị đọc là
tiếng Anh (thiếu từ vựng) · «Yes po, original» bị đọc là Tagalog («po» là lễ phép, không phải
bằng chứng) · câu mẫu Tagalog của chính Minty bị đọc là «pha» vì «Buy 1 Get 1», «Shipping»,
«Delivery» — nay bộ đếm tiếng Anh chỉ đếm HƯ TỪ, không đếm thuật ngữ quảng cáo.

⚠️ **Cái giá phải biết:** lượt nhường mà model hỏng (Kimi đang 429 hết hạn mức) thì khách
**không nhận gì** — trước đây nhận câu mẫu sai ngôn ngữ. Người quyết chọn để Kimi như cũ.
Hôm nay không chạm khách thật: prod `PANCAKE_READONLY=1`, bot mới chưa xử lý page nào.

## 2. Giá gõ cứng trong kịch bản

**Đo:** câu trả lời hỏi-giá của Minty «Buy 1 Get 1 – 109 SAR · Buy 2 Get 2 – 159 SAR» là chữ
gõ tay trong ô `fastLanePrice` (bản LIVE 6), không lấy từ bảng giá. Tab «Sản phẩm & giá» (GD3)
làm sửa giá dễ hơn ⇒ sửa 109→119 thì đơn tính 119, bot vẫn báo 109.

**Làm:** `v3/src/ui/mot-page/gia-kich-ban.js` (mới) tìm mọi con số đi kèm mã tiền tệ (SAR ·
SR · AED · KWD · QAR · OMR · BHD · USD, trước hoặc sau số) trong các ô chữ của kịch bản, so với
các bậc giá **đang bật**. Cả hai tab Sản phẩm và Kịch bản hiện:
- còn khớp ⇒ hộp vàng «Kịch bản đang gõ cứng giá — hôm nay còn khớp bảng giá»
- lệch ⇒ hộp đỏ «Bot đang báo cho khách N giá KHÔNG có trong bảng giá»

Không sửa kịch bản hộ ai. `null` = không kiểm được (thiếu bản sửa được), khác `[]`.

## 3. Thước

- `test/ngon-ngu-cau-mau.test.mjs` 8 ca (câu thật Minty) · `test/ngon-ngu-nhuong-model.test.js`
  4 ca qua `xuLyMotTin` trên DB sandbox; đảo vá (tắt luật ở fast lane) ⇒ ca ① đỏ.
- `v3/test/b/gia-kich-ban.test.mjs` 6 ca · `v3/test/b/mot-page.test.mjs` ⑩ 3 ca; đảo vá (bỏ lọc
  bậc tắt) ⇒ ⑩b đỏ.
- `npm test` **2.065 ca · 2.061 xanh · 0 đỏ**.
- Trình duyệt thật (bản dev, page Minty 189): hộp vàng hiện ở cả hai tab, liệt kê 109 và 159
  SAR ở ô «Trả lời nhanh — hỏi giá», nút «Sửa ở tab Kịch bản» chỉ ở tab Sản phẩm; 0 lỗi JS.
- Kèm: `ops/bin/gia-lap-mot-minh.mjs` đọc Pancake qua bộ đọc có đổi-token của bot (kho token
  dev có token sống nhưng không có quyền trên Minty ⇒ lượt đầu kéo về 0 hội thoại).
