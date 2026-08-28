# A7-3 · CỬA ĐỌC HỒ SƠ KHÁCH — 26/08/2026

Lát cuối của A7. A7-1 (khoá định danh) và A7-2 (nối kênh Messenger) đã nghiệm thu.

---

## 1 · Tiêu chí, và nửa nào của nó kiểm được hôm nay

Nghiệm thu sóng 4 viết nguyên văn: *«Một khách nhắn cả Messenger lẫn WhatsApp cùng số điện
thoại → MỘT hồ sơ, không phải hai.»*

Hôm nay kiểm được **một nửa**:

| kênh | tình trạng |
|---|---|
| Messenger | CÓ — `hoi_thoai` nối qua `khach_id` (A7-2) |
| Trang bán hàng | CÓ — `don_hang.nguon='trang_ban_hang'` |
| WhatsApp | **CHƯA NỐI** — `don_hang.nguon` là `CHECK IN ('trang_ban_hang','messenger')`; L1-M3 mới là khung + mock, việc người H1 chưa xong |

Nên `kenh.chuaNoi` kê **đích danh** WhatsApp kèm lý do, và `kenh.khai` nói «gộp N/2 kênh
đang chạy». Hiện một hồ sơ «đã gộp đủ ba kênh» trong khi kênh thứ ba chưa có dòng nào là
nói dối theo chiều dễ chịu nhất — đúng bẫy mà bài học 3 của GD2 gọi tên.

---

## 2 · Hai thứ file này CỐ Ý không làm

**① Không dựng phép gộp thứ hai.** Việc gộp đã xảy ra ở **tầng GHI**: khoá
`(team, nước, sđt)` của migration 013, và cửa POS (`doc-don.js`) với cửa Messenger
(`chat/ho-so-khach.js`) cùng gọi một `khoaKhach`. Đường đọc chỉ đọc cái đã gộp. Viết một
phép gộp ở đây là đẻ bản khai thứ hai của cùng một luật, và hai bản luôn trôi khỏi nhau
(án lệ #3). Cổng ② canh: mã KHÔNG được nhắc `khoaKhach`.

**② Không có nhánh chặn nào.** 01 §11 «chặn cứng khách hoàn cao» vẫn **Chờ chốt**. Hồ sơ
trả `ruiRoHoan` là **đọc lại** từ job đêm, kèm `chamLuc` (một tỉ lệ hoàn không có ngày chấm
là số không kiểm được) và kèm câu `khongChan` khai thẳng. Chưa chấm thì `tiLe = null` **chứ
không phải 0** — 0% nghĩa là «chưa hoàn lần nào», khác hẳn «chưa ai đo».

---

## 3 · Vòng nhập thật — và `await import()` không phải cách vá

Viết lần đầu ở `src/db/ho-so-khach.js` cho gần `so-lieu.js`. Nó cần `chuanHoaSdt` (để
`+966 50 123 4567` và `0501234567` tra ra cùng một người), mà `orders/loc-trung.js` lại
`import … from "../db/index.js"` ⇒ vòng thật:

```
db/index.js → db/ho-so-khach.js → orders/loc-trung.js → db/index.js
```

Bản đầu tôi né bằng `await import()` trong thân hàm. Nó **chạy được** — và đó chính là chỗ
nguy: import động không bỏ phụ thuộc, nó chỉ giấu phụ thuộc khỏi người đọc và khỏi mọi công
cụ dò vòng. Đúng họ án lệ mà `doc-don.js` đã cảnh báo dài dòng ở quyết định ⑤ của nó.

Sửa đúng là **đổi chỗ file**: `src/orders/doc-ho-so.js` — cùng tầng `loc-trung.js` và
`ti-le-hoan.js` (bảng `khach` vốn đã là đất của `ti-le-hoan.js`), nhập XUÔI xuống `src/db`.
Không vòng, không import động. Cổng ① canh cả hai vế.

---

## 4 · Nghiệm thu

```
bash ops/bin/nghiem-thu/a7-3.sh          → ĐẠT 9 · TRƯỢT 0 · rc=0
node --test test/a7-3-doc-ho-so.test.js  → 12 pass / 0 fail   (Postgres 16.15 thật)
```

Quét hồi quy: **495 ca · 481 pass · 3 fail** — chỉ còn `D1`·`D9`·`D10` (phụ thuộc dữ liệu,
đã A/B ở lượt A7-1). `l2-m3-rap-prompt` XANH lượt này, đúng kiểu chập chờn ~25% đã ghi §9.

---

## 5 · Hai lần thước hỏng, và cả hai đều là của tôi

**(a) Cổng bắt tội file vì nó đã ghi lại lý do.** Hai phép «KHÔNG được có X» TRƯỢT ngay lượt
đầu — không phải vì mã có X, mà vì đoạn **chú thích giải thích vì sao không dùng X** có chứa
chữ X (`await import(` và `khoaKhach`). Đo lại bằng cách bỏ dòng chú thích: **0 dòng mã**
khớp. Một cổng phạt người ta vì đã viết lý do là một cổng **dạy người ta xoá lý do đi** —
nguy hơn hẳn một cổng lỏng. Vá bằng `ma()` lọc chú thích trước khi grep.

Đây là lần **thứ hai trong hai ngày** cổng của chính tôi nói dối (lần trước: `grep -q` +
`pipefail` ở a7-1). Luật rút ra, đã ghi §9: **mọi cổng mới phải tự đo trên một ca đã biết
đáp án trước khi tin nó.**

**(b) Ca H7 của tôi là ca rỗng.** H7 dựng khách có ĐỦ hai kênh rồi khẳng định `kenh.coMat`
bằng cả hai — nên nó xanh y hệt khi `coMat` bị gõ cứng `[...KENH_CO_THAT]`. Bài test không
phân biệt «đếm từ dữ liệu» với «khai sẵn». **H12** (khách chỉ có MỘT kênh, cả hai chiều)
sinh ra từ lượt đảo-vá, và phép ⑥ của cổng giữ nó lại.

Cùng đúng một hình dạng lỗi với lượt đảo-vá của A7-2 sáng nay, và với B-Y7 hôm 25/08:
**fixture dựng hai vế bằng nhau thì mọi luật phân biệt hai vế đều xanh giả.** Ba lần trong
hai ngày — đây không còn là tai nạn, nó là thói quen viết test cần sửa.

---

## 6 · Còn treo

1. **Lượt nạp đơn POS đang chạy** (7 shop, 122.615 đơn). Xong thì màn «Hồ sơ khách hàng»
   có dữ liệu thật lần đầu, và con số của `timKhach` mới có nghĩa.
2. **WhatsApp** — khi cửa có thật, nó nối vào cùng `khoaKhach`; `KENH_CO_THAT` và
   `KENH_CHUA_NOI` là chỗ duy nhất phải sửa.
3. **A8 vẫn không nên mở trước khi đo lại** bốn con số nền trên 122.615 đơn (§9, 26/08).
