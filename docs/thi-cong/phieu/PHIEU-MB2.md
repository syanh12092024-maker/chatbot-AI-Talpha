# PHIẾU MB2 — MỘT công tắc «bot mình trả lời page này»

**Base:** sau MB1 · **Làn:** 🟥 (đổi nguồn quyết định page nào bot trả lời — đường chạm khách khi van gửi mở)
**Nguồn:** CR-02-10 · `01-QUYET-DINH.md` §14 · sổ §5g · gộp H9 (§8)
**Đụng bộ não:** không.

## ① Vì sao

Hôm nay sáu chỗ cùng nói «ai trả lời page này»: `ai-enabled.json` (RAM v1) · `page.bot_ai_bat` (bản
sao, `db/di-tru/nap.js#napCongTacAi` chép đè CẢ HAI CHIỀU từ tệp mỗi lượt «Kéo dữ liệu về») ·
`page.giao_bot_moi` · `page.v3_ai_bat` · `V3_PAGE_XU_LY` · `V3_GIAO_PAGE_TREN_MAN`. Hai tầng «giao
cho bot nào» + «bật/tắt» chỉ có nghĩa khi có hai bot của mình. Đo 02/10: cả ba cột = 0 trên 582 page,
ba biến môi trường đều rỗng/vắng ⇒ gộp không phải di trú giá trị nào.

## ② Làm gì

1. **Nguồn duy nhất = `page.bot_ai_bat`** (59 tệp màn/ca đã đọc nó là «bot bật»). Worker
   (`page-routing.js#dsPageBotMoi` → đổi ruột) nạp `WHERE bot_ai_bat = true`; `handler-v3.js:371,378`
   + `chat/kho.js:157` kiểm lại theo `bot_ai_bat` (không theo `v3_ai_bat`) — **không phải file não**.
2. Cửa bật/tắt: MỘT đường — `cong-tac.js#datCongTacBot` → cổng sẵn sàng CỦA BOT
   (`admin-v3/operations.js#setPage` → `pageStatus`: van gửi · cách ghép lời · sản phẩm + giá · model)
   → ghi cột, có nhật ký và trần bật. `cau-bot-v1.js#datBotAi` (công tắc v1) GỠ. `cong-tac.js` bỏ «giao
   sang bot mới» và bước «tắt bot cũ rồi đọc lại».
3. **Cắt `napCongTacAi`** khỏi lượt «Kéo dữ liệu về» — không thì lượt kế tiếp chép `ai-enabled.json`
   (rỗng) đè lên và TẮT mọi page vừa bật.
4. Gỡ biến `V3_PAGE_XU_LY` · `V3_GIAO_PAGE_TREN_MAN` khỏi code đọc + sửa
   `docs/v3/ban-giao/bien-moi-truong-v3.md` CÙNG commit (tên còn trong migration 024 đã áp ⇒ bảng
   khai giữ mục «biến ĐÃ GỠ»). `V3_LEGACY_POLL_OFF` Ở LẠI trong `src/server.js` tới MB4: nó giữ
   poll v1 tắt nếu phải LÙI MB3 bằng cách bật lại `aicloser.service`. Van gửi (`PANCAKE_READONLY` ·
   `V3_PANCAKE_GUI` · `V3_POS_GHI`) giữ nguyên — đó là phanh tay.
5. Cột `giao_bot_moi` · `v3_ai_bat` để nằm im (gỡ ở MB4 bằng migration có `down`).

## ③ Không làm

Không bật page nào. Không đổi van gửi. Không gỡ tệp/cột (MB4). Không đụng `ai_sale`.

## ④ Nghiệm thu

- Bộ ca `test/mb2-mot-cong-tac.test.mjs`: bật `bot_ai_bat` một page ⇒ worker thấy đúng page đó, KHÔNG
  cần biến môi trường nào; tắt ⇒ handler bỏ tin đang xếp; «Kéo dữ liệu về» không đổi cột. Đảo-vá:
  khôi phục `napCongTacAi` ⇒ đỏ.
- `grep -rn "V3_PAGE_XU_LY\|V3_GIAO_PAGE_TREN_MAN" src v3/src` → chỉ còn chú thích lịch sử, 0 chỗ ĐỌC.
- `npm test` không thêm ca đỏ so với mốc.

## ⑥ Báo cáo (02/10)

- Nguồn duy nhất `page.bot_ai_bat`: `page-routing.js` (viết lại) · worker · webhook (đọc cột trong câu khoá
  dòng) · `chat/kho.js` + `handler-v3.js` (đọc lại trước khi gửi) · `admin-v3/operations.js` (cổng `pageStatus`
  bỏ điều kiện «đã giao», `setPage` ghi `bot_ai_bat`) · `van-hanh-v3.js`.
- Công tắc màn: `cong-tac.js` MỘT đường (khoá tay `V3_BOT_KHOA`/`V3_BOT_GHI=0` → phễu nhật ký → cổng →
  cột, trần bật giữ nguyên); `datBotAi` (v1) gỡ khỏi cầu; `giaoPage` + `POST /giao` + nút «Giao sang bot
  mới / Trả về bot cũ» (2 màn) gỡ; màn Một page bỏ khối «bot phụ trách / hai nguồn lệch»; màn Sức khoẻ
  đếm theo cột, đèn «hai bot» nói thẳng về ai_sale (xám khi có page bật); màn Model đếm theo cột;
  Cài đặt team bỏ van «giao page».
- `db/di-tru/nap.js`: lượt kéo dữ liệu KHÔNG chép `ai-enabled.json` nữa.
- Thước: ca mới `test/mb2-mot-cong-tac.test.mjs` 4/4 (sandbox thật; đảo-vá khôi phục `napCongTacAi` ⇒ ③ đỏ)
  · `nguon-page-bot-moi` viết lại · 11 tệp ca handler dựng page có `bot_ai_bat = true` · gỡ ~16 ca canh
  «giao page / hai nguồn» · webhook thêm ca một công tắc.
- `npm test` 2455 · 2451 xanh · 0 đỏ · 4 bỏ qua. Cổng: l0-m1 54/7 (= gốc `2cd4558`, 7 nợ cũ) · g2-a4 16/16 ·
  gd1 8/8 · ll1 10/10 · ll2 11/11 · ll3 7/7 · ll6 7/7 · ve2 · ve2b · ve7c xanh.
