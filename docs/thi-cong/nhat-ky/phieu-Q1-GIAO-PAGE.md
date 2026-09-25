# PHIẾU Q1 — GIAO PAGE SANG BOT MỚI BẰNG GIAO DIỆN

> Làm 25/09/2026 · làn 🟨 · đất A (`db/migrate/024`, `src/queue/page-routing.js`,
> `src/queue/chay-worker.js`, `src/admin-v3/operations.js`) + đất B (`v3/src/ui/page-bot/*`,
> `v3/src/ui/suc-khoe/*`, `v3/src/noi-day/van-hanh-v3.js`, `v3/src/audit/hanh-dong.js`).
> Người quyết gật 25/09 sau khi nghe ba đường A/B/C và đề xuất A+.
> Đo trên bản dev `aicloser_dev_1789621023909`, giao diện dựng TỪ REPO ở cổng 3210.
> Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 8 · **Q1**. Chặn GD2 và GD3.

## 1. Câu hỏi, và vì sao nó không phải một việc giao diện

«Đưa một page từ bot cũ sang bot mới» hôm qua là: SSH vào máy chủ → sửa `V3_PAGE_XU_LY` →
khởi động lại. Việc ngoài giao diện lớn nhất còn lại.

Lý do nó ở lại trong file lâu đến vậy: **cả hai con bot cùng đọc danh sách ấy**, theo hai
chiều ngược nhau — bot mới «đây là page của tao», bot cũ «mấy page này đã giao đi, tránh ra».
Đem danh sách vào CSDL mà chỉ bot mới biết là để khách nhận HAI câu trả lời cho một câu hỏi.

**Chỗ mở nút thắt** (đo tận nơi, 25/09): bot cũ còn một đường buông page nữa, và đường ấy
sửa được ngay từ giao diện v3 — **công tắc AI của từng page**:

| Đo ở đâu | Thấy gì |
|---|---|
| `src/pancake-poll.js:262` | vòng hỏi tin chỉ chạy trên page **đang bật AI** |
| `src/scheduler-followup.js:115,123` | nhắc lại khách cũng chỉ chạy trên page **đang bật AI** |

⇒ `V3_PAGE_XU_LY` là khoá THỨ HAI, không phải khoá duy nhất. Khoá thứ nhất đã bấm được từ màn.

## 2. Đường đã chọn (A+): một cầu dao, bật một lần

- **Cột mới** `page.giao_bot_moi` (migration **024**) — chủ sở hữu, sửa được từ giao diện.
  KHÁC `v3_ai_bat` (bật/tắt trong số page đã giao) và khác `bot_ai_bat` (công tắc bot cũ).
- **Cầu dao** `V3_GIAO_PAGE_TREN_MAN=1`. Vắng ⇒ mọi thứ y hệt hôm qua, cột nằm im (luật 1
  của bảng biến: vắng = đóng). Bật MỘT LẦN là từ đó không cần SSH nữa.
- **Nút «Giao sang bot mới»** ngay tại chỗ màn đang nói page thuộc bot nào.

**Thứ tự bốn bước là toàn bộ sự an toàn** (`v3/src/ui/page-bot/cong-tac.js#giaoPage`):

1. TẮT bot cũ cho page
2. ĐỌC LẠI TỪ CHÍNH BOT CŨ để xác nhận đã tắt thật
3. chưa xác nhận được ⇒ **DỪNG**, không ghi cờ
4. ghi cờ — bot mới nhặt page từ vòng kế tiếp

Đảo thứ tự là mở đúng cái cảnh phải tránh. Làm đúng thứ tự thì chỗ hỏng xấu nhất là vài giây
**không ai** trả lời — hướng hỏng an toàn, và màn nói ra ngay (`buocTiep`).

Thêm hai chốt: **không giao page còn chặn** (giao cho một con bot chưa trả lời được page ấy
là giao hụt), và **không giao khi chưa đọc được cửa kiểm** (mù thì đừng đoán).

**Không tự bật bot hộ ai.** Giao xong bot mới vẫn TẮT; trả về bot cũ thì bot cũ vẫn TẮT. Một
nút một nghĩa: nút này đổi CHỦ, không bật máy.

## 3. Lỗi thiết kế của chính tôi, và chỗ nó lộ ra

Bản đầu lấy **GIAO** của hai tập (`V3_PAGE_XU_LY` ∩ CSDL), gọi biến môi trường là «phanh tay
thu hẹp». Bộ ca xanh hết. Mở màn trên bản dev thì **4 page đang chạy bot mới bỗng hiện «bot
cũ»** — bật cầu dao là hất chúng ra khỏi tay bot mới, trong khi bot cũ đã tránh chúng từ lâu.
Tức bật một cái cầu dao là làm khách của mấy page đang chạy **không ai trả lời**, im lặng.

Sửa thành **HỢP**, và phanh tay lúc sự cố là **tắt chính cầu dao** rồi khởi động lại: chủ sở
hữu quay về đúng danh sách trong cấu hình máy chủ. Page vừa giao bằng giao diện khi đó không
ai trả lời — im lặng, hướng hỏng an toàn — chứ không rơi vào cảnh hai bot cùng trả lời.

📌 Bài học đã ghi §10: **bộ ca xanh không thay được một lần mở màn nhìn bằng mắt.** Cái sai
này nằm ở chỗ tôi không viết ca cho nó, vì tôi tin cái tên mình vừa đặt («phanh tay»).

## 4. Lưới cuối: đèn ⑪ «Hai bot cùng một page»

Giao diện cũ ở cổng 3100 vẫn bật lại bot cho một page được, bằng một mật khẩu dùng chung và
không ghi ai bấm (đó là **Q2**, chưa quyết). Nên phải có lưới:

- cầu dao đóng ⇒ XANH (chủ sở hữu lấy từ cấu hình máy chủ, bot cũ đọc đúng danh sách ấy)
- page đã giao mà bot cũ **vẫn bật** ⇒ **ĐỎ**, gọi tên page, chỉ đường đi tắt
- không hỏi được bot cũ ⇒ **XÁM** — không kết luận từ cột CSDL, vì cột ấy đã có lần lệch 50

## 5. Thước

- `v3/test/b/page-bot.test.mjs` **35/35** (thêm 8 ca). Đảo-vá: bỏ bước đọc-lại-xác-nhận → ca
  «bot cũ báo vẫn bật» đỏ · bỏ chốt sẵn sàng → 2 ca đỏ.
- `test/nguon-page-bot-moi.test.mjs` **9/9** (mới). Đảo-vá: đổi HỢP thành nới-rộng-bừa → ca ③ đỏ.
- `v3/test/b/suc-khoe.test.mjs` **29/29** (thêm 4 ca cho đèn ⑪). Đảo-vá: bỏ phép so page đã
  giao với page bot cũ đang bật → ca đỏ.
- `v3/test/b/gd1-mot-nguon.test.mjs` **11/11** — thước này suýt lặng lẽ thôi canh: một câu
  chặn đã dọn khỏi `operations.js` nên phép bóc bằng regex không thấy nữa. Nay gọi thẳng hàm
  sinh câu. Đảo-vá: bỏ câu mới khỏi bảng dịch → ca ①b đỏ.
- Trình duyệt thật: 4 page hiện đúng chủ (`1220547807799752 · bot mới · Trả về bot cũ`, ba
  page kia `bot cũ · Giao sang bot mới`), 0 lỗi JS.
- `ops/bin/do-giao-dien.mjs`: 26 màn · **0 màn vỡ** · 0 mã kỹ thuật · 17 hộp cảnh báo · chữ
  diễn giải 4.401 → **4.414**.
- `npm test`: **2.004 xanh / 0 đỏ** (4 bỏ qua).

## 6. Chưa làm — và cần người quyết

- **Cầu dao chưa bật ở đâu cả.** Bật là việc của `mo-van` bậc ③ (một page thử, có người
  ngồi canh). Hôm nay chỉ dựng xong đường.
- **Q2 vẫn treo**: còn giao diện cũ thì còn cửa bật lại bot cho một page đã giao. Đèn ⑪ là
  lưới, không phải cách chữa.
- Page đã giao bằng giao diện mà sau đó **tắt cầu dao** thì nó quay về bot cũ (đang tắt) ⇒
  không ai trả lời. Màn có nói: cột «Còn thiếu gì» hiện «chưa thuộc bot mới». Chưa có đèn riêng.
- Trần số page giao mỗi đợt: CHƯA có. Trần bật bot (`TRAN_BAT_MOT_DOT = 5`) không áp cho việc
  giao. Đề nghị thêm khi mở van thật.
