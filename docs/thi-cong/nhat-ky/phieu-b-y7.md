# NHẬT KÝ PHIẾU B-Y7 — `page.bot_ai_bat` đã lệch, và con số cho-bấm-áp đang đọc từ nó

> Người A · 25/08/2026 · nhánh `main` · làn 🟥 · đo trên **VPS · PostgreSQL 16.15**

---

## 0 · TỰ ĐO LẠI, KHÔNG TIN PHIẾU — và phiếu ĐÚNG NGUYÊN VĂN

Phiếu của người B đã điều tra rất kỹ (loại trừ ba nguyên nhân bằng ba phép đo). Vẫn đo lại,
vì đề bài cũng khai sai được (án lệ #4):

```
CSDL nói bật    : 50
ai-enabled.json : 2 byte · nội dung: []          ← sự thật là 0
sửa lúc         : 2026-08-24 12:13:32
READINESS_AUTO_DISABLE=0                          ← không phải hệ tự tắt
```

Khớp phiếu. **Cột lệch đúng 50.**

## 1 · VÌ SAO ĐÂY LÀ 🟥 CHỨ KHÔNG PHẢI MỘT CỘT SAI VẶT

Con số `soPageDangBatBot` mà **tôi vừa giao ở G2-A4** là con số màn «Bộ luật chung» hiện ra
để người ta quyết định có bấm ÁP hay không. Nó đọc thẳng
`count(*) FILTER (WHERE bot_ai_bat)`.

Nghĩa là suốt từ lúc G2-A4 xong, màn hình sẽ nói **«50 page sẽ đổi cách nói với khách»**
trong khi câu trả lời thật là **không page nào**. Một con số sai theo hướng đó làm người ta
sợ mà không dám sửa gì; sai theo hướng kia thì làm người ta bấm ẩu. Cả hai đều hỏng.

Và chính `db/migrate/001_nen.up.sql` đã khai từ đầu: *«NGUỒN DUY NHẤT của cờ này là
`ai-enabled.json`… Cấm suy ra từ bất kỳ trường nào khác»*. Cột chỉ là **bản sao**. Tôi đọc
bản sao và coi nó là sự thật — đúng cái án lệ «bản khai thứ hai» mà cả sóng này đang dọn,
lần này chính tôi vấp.

## 2 · SỬA THẾ NÀO

`demPageBatBot()` đọc **file nguồn thật**, đối chiếu với cột, và trả cả hai:

```js
{ soPage, soPageDangBatBot,  // ← theo ai-enabled.json
  theoCotCsdl,               // ← cột nói gì, để đối chiếu
  nguon: "ai-enabled.json",
  lech: { co, soLech, chiCotBat, chiBotBat, viSao } }
```

Ba quyết định trong đó:

- **KHÔNG gọi HTTP sang tiến trình bot** dù RAM cũng là nguồn thật. Tầng dữ liệu gọi HTTP là
  một phụ thuộc mới, và nó chết khi bot chết — đúng lúc người ta cần đọc số nhất. File là
  nguồn mà chính lược đồ đã khai, và `setAiEnabled()` ghi cả RAM lẫn file cùng lúc.
- **Không đọc được file → `lech.co = null`**, không phải `false`. `null` là «CHƯA BIẾT»,
  `false` là «đã kiểm và khớp» — trả `false` lúc mù là nói dối. Và câu báo nói thẳng: con số
  đang lấy từ cột, *«đừng coi nó là số thật»*. Rơi lặng lẽ về cột chính là cái đang sai.
- **`apBoLuat` dùng CHUNG bộ đếm** với `xemAnhHuongBoLuat`. Con số hiện lúc XEM TRƯỚC và con
  số ghi vào nhật ký lúc ÁP phải là cùng một phép đo, không phải hai câu SQL giống nhau.

## 3 · THƯỚC CŨ CỦA TÔI CŨNG SAI — và đó là chỗ đáng nhớ nhất

Ca `N5`/`N11` của G2-A4 khẳng định `soPageDangBatBot === 2`, và chúng **XANH** suốt — vì
fixture dựng cột và bot bằng nhau. Đúng cảnh phiếu cảnh báo ở ⑤:

> *«Không dựng fixture cho cả hai bằng nhau rồi coi là xong — cảnh bằng nhau chính là cảnh
> bài test cũ đã xanh trong khi thực tế đã lệch 50 page suốt từ 24/08.»*

Nay ca `N18` chạm **nhánh lệch thật** (cả hai chiều), `N19` chạm nhánh khớp, `N20` chạm nhánh
mù. Và cổng G2-A4 đổi từ canh **giá trị** sang canh **nguồn** của con số — giá trị đúng bao
nhiêu là tuỳ file, nhưng nó PHẢI đến từ file.

## 4 · BẰNG CHỨNG MÁY

```
CỔNG G2-A4 (đã bổ sung ③b) · TỔNG: 16 phép · ĐẠT 16 · TRƯỢT 0
   ✔ cột bật mà nguồn thật tắt → có BÁO lệch = co-bao
   ✔ và con số lấy theo NGUỒN THẬT = 0
   ✔ không đọc được nguồn → lech.co = CHƯA BIẾT
   ✔ …và khai rõ đang lấy từ cột = cot_csdl
   ✔ test/l0-m2-noi-dung.test.js: 20 ca, 0 đỏ
```

**Trên CSDL THẬT, sau khi sửa:**

```
tổng page           : 514
ĐANG BẬT BOT (thật) : 0    · nguồn: ai-enabled.json
cột CSDL nói        : 50
lệch                : 50 page
câu báo             : CỘT `page.bot_ai_bat` LỆCH nguồn thật… Con số ở trên lấy theo NGUỒN
                      THẬT. Cột là bản sao và chưa ai đồng bộ ngược (B-Y7, nợ §9).
```

`grep -n "FILTER (WHERE bot_ai_bat)" src/db/noi-dung.js` → **0 dòng** (nghiệm thu ④①).
Quét hồi quy 34 bộ ca: chỉ D7 đỏ.

## 5 · NGOÀI PHẠM VI → SỔ NỢ

Câu **«ai được quyền sửa cột `bot_ai_bat`»** là quyết định kiến trúc, phiếu ⑥ đã dặn không
làm ở đây. Ba đường, và chúng khác nhau thật:

| | Được gì | Mất gì |
|---|---|---|
| (a) Bỏ hẳn cột, luôn hỏi file | Một nguồn duy nhất, hết lệch | Mọi câu SQL lọc theo `bot_ai_bat` phải viết lại; không JOIN được |
| (b) Đồng bộ ngược bot → CSDL | Giữ được câu SQL, cột thành cache có hạn | Cần một job, và job chết thì lại lệch âm thầm |
| (c) Giữ như hiện tại + luôn báo lệch | Rẻ nhất, và đã làm xong ở phiếu này | Người đọc phải nhớ nhìn cờ `lech` |

Hôm nay đang là **(c)**. Nó đủ để con số không nói dối nữa, nhưng **không** làm cột hết lệch.
