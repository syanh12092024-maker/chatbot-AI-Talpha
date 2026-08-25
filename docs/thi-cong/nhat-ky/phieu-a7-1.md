# A7-1 · KHOÁ ĐỊNH DANH KHÁCH = (team, NƯỚC, SĐT) — 26/08/2026

Không có phiếu chính thức: A7 nằm ở mục «việc còn lại của trục dữ liệu, chưa ai phát
phiếu». Người quyết ra lệnh cắt A7 và làm tiếp. Đây là lát ĐẦU của A7, và nó đứng một
mình được — A7-2 (nối kênh vào hồ sơ) và A7-3 (cửa đọc) chưa mở.

---

## 0 · Việc làm trước hết: áp ba migration treo — CHỈ ÁP ĐƯỢC HAI

`ssh talpha-server 'cd /opt/aicloser && git pull && npm run migrate'`:

```
Already up to date.          ← HEAD vẫn 1f0f289
[migrate] ÁP  010_kich_ban_ba_tang
[migrate] ÁP  011_so_ai_tien
[migrate] áp mới: 2 · tổng đã áp: 11
```

**012 không lên được VPS vì hai commit `cdae76d` + `0787283` (B-Y6) chưa bao giờ được
push.** `git pull` nói "Already up to date" một cách thành thật — remote không có chúng.
§0 luật 5 và 12 xếp push vào tay người quyết, nên tôi dừng ở đó và báo, không tự push.

Hệ quả cần biết: **cây kịch bản ba tầng vẫn TẮT trên CSDL thật** (`mau_0_dong` chưa tồn
tại), và mọi phép đo dưới đây chạy trên nền 011 + 013 ở sandbox, không phải 013 trên nền
012 như lược đồ cuối cùng sẽ là. 013 không đụng gì của 012 (khác bảng hoàn toàn:
`khach` vs `kich_ban`/`mau_0_dong`), nên thứ tự áp không đổi kết quả — nhưng khe số
`…011, [012 vắng], 013` trên CSDL thật là chuyện có thật và phải đóng trước khi deploy
(án lệ #25: khe làm `migrate.discover()` chết).

Kiểm không mất dữ liệu quanh lượt áp: `kich_ban` 71 dòng trước → 71 dòng sau.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi thiết kế (bước 3 của skill) — bốn chỗ đề bài sai

### ① `khach`/`don_hang`/`san_pham` đang 0 dòng

```
_quay_lui_gan_team_20260824 29545 · hoi_thoai 28953 · nhat_ky 1557 · page 514
kich_ban 71 · ket_noi_pos 7 · … · don_hang 0 · khach 0 · san_pham 0 · so_ai 0
```

Đề bài giao A7 «gộp ba kênh theo SĐT», A8 «144 khách hoàn 30–65%», A9 «đồng bộ sản
phẩm» — cả ba bảng nền đều rỗng. Đúng cảnh B-Y6 đã tự thú 25/08 («treo một tầng dùng
được vào một tầng chưa tồn tại»), lần này ở quy mô ba module.

### ② RF-23 gọi tên SAI NƯỚC

Tái hiện cơ chế bằng chính `chuanHoaSdt` (không dựng bản SQL song sinh):

```
+965 5012 3456 → 50123456   ┐ Kuwait
+973 5012 3456 → 50123456   ├ Bahrain   4 nước cùng khoá
+968 5012 3456 → 50123456   ├ Oman
+974 5012 3456 → 50123456   ┘ Qatar
+966 50 123 4567 → 501234567 ┐ Saudi     3 nước cùng khoá  ← RF-23 KHÔNG nhắc
+971 50 123 4567 → 501234567 ┘ UAE
```

Nhưng cơ chế ≠ hậu quả. Đo trên POS THẬT (chỉ GET, cây `/root/do-g2`, .env 3 biến,
không token Pancake nào):

| nhóm | quét | sđt phân biệt | va chạm xuyên nước |
|---|---|---|---|
| Kuwait | 20 trang | 1.713 | |
| Qatar | 20 trang | 1.736 | |
| Bahrain | 10/10 trang (đủ) | 801 | |
| Oman | 18/18 trang (đủ) | 1.453 | |
| **cả nhóm 8 số** | | **5.703** | **0 thật** (1 hit = rác `123123123123`) |
| Saudi | 30 trang | 2.529 | |
| UAE | 30 trang | 2.537 | |
| **Saudi ∩ UAE** | | | **6 thật** |

Sáu số đó: `561698732` `547049872` `575461472` `546241121` `538440108` `386685425` —
năm cái đầu khớp khuôn di động `5xxxxxxxx` của cả hai nước, không phải rác.

**Tôi đã đi sai một nhịp và phép đo bắt được.** Sau khi thấy 4/7 shop nằm trong nhóm
8 số, tôi kết luận (trong đầu) «va chạm gần như chắc chắn» theo trực giác birthday. Đo
ra 0. Ngược lại nhóm 9 số mà RF-23 không nêu thì có 6. Nếu code theo trực giác đó thì
đã vá nhóm không hỏng.

### ③ Gốc thật: POS không lưu mã nước

```
Kuwait: 66410373 · 50493865 · 66413744      (8 số, không +965)
Qatar : 55534997 · 70738273 · 55805658      (8 số, không +974)
Saudi/UAE: 5xxxxxxxx                         (9 số, không +966/+971)
```

⇒ `chuanHoaSdt` **là no-op trên dữ liệu POS** — nó cắt tiền tố, mà POS không có tiền tố.
Nước không nằm trong con số; nó nằm ở «đơn đến từ shop nào». Đây mới là mệnh đề đúng,
và nó đổi hình dạng bản vá: không phải sửa hàm chuẩn hoá, mà là **thêm một vế vào khoá**.

### ④ Dân số đơn là 122.615, không phải 5.144

| Saudi | UAE | Kuwait | Qatar | Oman | Bahrain | Taiwan | tổng |
|---|---|---|---|---|---|---|---|
| 62.494 | 38.641 | 12.353 | 6.071 | 1.740 | 964 | 352 | **122.615** |

Sổ và `ti-le-hoan.js` cùng khai «5.144 đơn thật / 7 shop» (23/08) = **4,2%**. Đã ghi §9;
đây là nền của A8 nên A8 không nên mở trước khi đo lại.

### ⑤ Và: A8/A9 phần lớn ĐÃ CÓ

`src/orders/ti-le-hoan.js` đã có bốn tầng (`TANG_HOAN` · `chamTang` · ranh giới
15/30/65 khai config), và sổ dặn thẳng «đừng vá lén vào `ti-le-hoan.js`» — phần còn
thiếu là *quyết định chặn* của người. `src/pos/doc-danh-muc.js` đã đồng bộ danh mục +
`san_pham.ton_kho`/`het_hang`, `rap-prompt.js:161` đã đẩy «hết hàng» vào prompt. Nên tôi
KHÔNG mở A8/A9 (và luật tuần tự cũng chặn tới khi A7 nghiệm thu).

---

## 2 · Bản vá

**Migration 013** — `khach` thêm `thi_truong text`; đổi
`khach_sdt_trong_team (team_id, so_dien_thoai)` thành
`khach_sdt_trong_team_nuoc (team_id, coalesce(thi_truong,''), so_dien_thoai)`.

Ba điều cố ý:
- `coalesce(...,'')` **bắt buộc** — hai NULL là khác nhau trong index, thiếu nó thì hai
  dòng chưa-biết-nước cùng số sẽ LỌT. Đúng cái lỗ 012 vừa bịt cho `kich_ban`; cùng bẫy,
  lần thứ hai trong hai ngày.
- **KHÔNG có CHECK liệt kê tên nước** (án lệ #22). Nguồn hợp lệ duy nhất là
  `ket_noi_pos.market`. Cổng ③ canh điều này.
- Chưa biết nước ⇒ NULL ⇒ **giữ nguyên hành vi cũ** cho phần mù, không bịa nước. Phần mù
  nhỏ: tra được nước trên 789/790 hội thoại mang SĐT (99,9%).

**`khoaKhach(thiTruong, sdtTho)`** trong `loc-trung.js` — một bản khai của luật định
danh. Câu song sinh của nó là chỉ mục SQL, và tôi không so hai bản bằng mắt: ca Q6 cho
chính CSDL phán, rồi so phán quyết JS với phán quyết CSDL trên 5 cặp.

**`doc-don.js`** — `shop` (= `ket_noi_pos.market`) có sẵn ngay tại chỗ tạo khách, không
phải đi tra. Kèm lưới migration hỏi `information_schema`: thiếu cột thì lùi về khoá cũ,
`console.warn` nêu đích danh 013, và `kq.khoaTheoNuoc=false` để nơi gọi thấy được.

Chỉ có **một** chỗ tạo dòng `khach` trong toàn hệ (`doc-don.js:212`) — đã grep xác nhận;
`ti-le-hoan.js:253` chỉ sửa dòng có sẵn.

---

## 3 · Nghiệm thu

```
bash ops/bin/nghiem-thu/a7-1.sh        → ĐẠT 6 · TRƯỢT 0 · rc=0
node --test test/a7-1-khoa-khach.test.js → 11 pass / 0 fail   (Postgres 16.15 thật)
```

**Đảo-vá** (bỏ nước khỏi khoá JS) ⇒ **Q6 và Q9 đỏ**. Q3/Q4/Q8 vẫn xanh, và đó là ĐÚNG:
ba ca đó chèn thẳng SQL nên chúng đo CHỈ MỤC, mà đột biến không đụng chỉ mục. Thước có
răng ở đúng chỗ nó phải có răng.

Ca chính là **Q9**: hai shop khác nước, cùng số `561698732` (số đo được có thật ở cả
hai) → phải ra HAI khách. Khoá cũ cho một. Ca «cùng nước cùng số → một khách» (Q2/Q10)
xanh trên CẢ hai bản nên tự nó không chứng minh gì — đúng bài học B-Y7 25/08.

**Quét hồi quy:** 473 ca · 458 pass · 4 fail · 11 skip.
Bốn đỏ: `D1`·`D9`·`D10` (`l0-m1-di-tru`) + `l2-m3-rap-prompt` (chập chờn ~25%, có sẵn).
A/B trên CÙNG cây CÙNG dữ liệu: **trước-013 = 26 pass/3 fail · sau-013 = 26 pass/3 fail**
⇒ không phải hồi quy.

⚠️ Và một điều người sau phải biết: **bộ D đỏ khác nhau tuỳ dữ liệu.** Dữ liệu VPS cho
`D7`; dữ liệu máy cá nhân cho `D1`/`D9`/`D10`. Câu «D7 là đỏ có sẵn» trong đề bài đúng
với dữ liệu VPS và chỉ với nó. Ghi tên dữ liệu vào kết luận (án lệ #8).

---

## 4 · Hai lần thước hỏng trong lượt này

**(a) `tar` của macOS nhét `._*` vào cây đo.** `migrate.discover()` nhặt
`._001_nen.up.sql` làm một migration ⇒ `invalid message format` ⇒ **11/11 ca đỏ** trong
khi code chưa chạy dòng nào. Nếu đọc vội thì đây là «bản vá làm hỏng mọi thứ». Vá:
`COPYFILE_DISABLE=1` khi tar, và dọn `._*` sau mỗi lượt đồng bộ.

**(b) Cổng của chính tôi báo TRƯỢT cho thứ đang XANH.** Phép ④ dùng
`node --test … | grep -q …` dưới `set -o pipefail`: `grep -q` đóng ống khi khớp ⇒ node
ăn SIGPIPE (141) ⇒ pipeline TRƯỢT. Tệ hơn là phép ⑤ (đảo-vá) **ĐẠT vì lý do sai** — nó
chỉ xanh nhờ bộ ca đỏ thật, không phải nhờ logic đúng. Một lỗi thước cho cả âm tính giả
lẫn dương tính giả trong cùng một file. Vá: hứng output ra biến rồi mới soi, và ghi lệnh
CẤM ngay trong cổng để người sau không lặp.

Cả hai đều đúng họ án lệ #27 — trước khi kết luận «code sai», hỏi «thước của ca này còn
đúng không».

---

## 5 · Còn treo, không tự quyết

1. **Push `cdae76d`+`0787283`** để 012 lên VPS và đóng khe `011 → [012] → 013`. Việc
   người (§0 luật 5/12). Chưa đóng thì 013 KHÔNG nên áp lên CSDL thật.
2. **`kiemTrung` vẫn dò trùng không kẹp nước** — làn 🟥, đất L3-M2, cần phiếu riêng. Kèm
   một câu hỏi thiết kế chưa có lời: đơn `trang_ban_hang` không đi qua shop nào thì lấy
   nước ở đâu?
3. **Đo lại bốn con số nền của A8 trên 122.615 đơn** trước khi mở A8.
4. **A7-2/A7-3 chưa mở.** Và «ba kênh» của đề bài hiện chỉ có hai:
   `don_hang.nguon CHECK IN ('trang_ban_hang','messenger')`; WhatsApp chưa nối (H1/L1-M3
   còn mock). `hoi_thoai.khach_id` đang NULL trên 28.953/28.953 — đó là việc của A7-2.
