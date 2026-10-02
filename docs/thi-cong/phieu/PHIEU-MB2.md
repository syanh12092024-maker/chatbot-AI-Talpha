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
2. Cửa bật/tắt: `cau-bot-v1.js#datBotAi` ghi thẳng cột (nhật ký + cửa kiểm sẵn sàng `canEnableAI`
   trong tiến trình như cổng v1 cũ), không còn HTTP. `cong-tac.js` bỏ «giao sang bot mới» và bước
   «tắt bot cũ rồi đọc lại»; `admin-v3/operations.js` theo cùng nguồn.
3. **Cắt `napCongTacAi`** khỏi lượt «Kéo dữ liệu về» — không thì lượt kế tiếp chép `ai-enabled.json`
   (rỗng) đè lên và TẮT mọi page vừa bật.
4. Gỡ biến `V3_PAGE_XU_LY` · `V3_GIAO_PAGE_TREN_MAN` · `V3_LEGACY_POLL_OFF` khỏi code đọc + sửa
   `docs/v3/ban-giao/bien-moi-truong-v3.md` CÙNG commit. Van gửi (`PANCAKE_READONLY` ·
   `V3_PANCAKE_GUI` · `V3_POS_GHI`) giữ nguyên — đó là phanh tay.
5. Cột `giao_bot_moi` · `v3_ai_bat` để nằm im (gỡ ở MB4 bằng migration có `down`).

## ③ Không làm

Không bật page nào. Không đổi van gửi. Không gỡ tệp/cột (MB4). Không đụng `ai_sale`.

## ④ Nghiệm thu

- Bộ ca `test/mb2-mot-cong-tac.test.mjs`: bật `bot_ai_bat` một page ⇒ worker thấy đúng page đó, KHÔNG
  cần biến môi trường nào; tắt ⇒ handler bỏ tin đang xếp; «Kéo dữ liệu về» không đổi cột. Đảo-vá:
  khôi phục `napCongTacAi` ⇒ đỏ.
- `grep -rn "V3_PAGE_XU_LY\|V3_GIAO_PAGE_TREN_MAN\|V3_LEGACY_POLL_OFF" src v3/src` (trừ test/doc) → 0.
- `npm test` không thêm ca đỏ so với mốc.
