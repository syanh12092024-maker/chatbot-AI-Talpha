# PHIẾU GL3 — Hạn chờ cho mọi lượt gọi Pancake + gửi lỗi mạng KHÔNG gửi lại bằng token khác

**Base:** `195d9c9` · **Làn:** 🟥 (đường GỬI tin cho khách — nguy cơ tin đúp)
**Nguồn:** báo cáo `docs/golive-audit-2026-10-02.md` mục «Timeout và ngắt page» · nghiên cứu go-live 05/10 (sổ §10 «ĐIỀU KIỆN GO-LIVE (GL)») ·
người quyết 05/10 «triển khai»; hạn mặc định tổng đề nghị (người quyết không bác): đọc 15 s · gửi 30 s · sổ §5j
**Đụng bộ não:** không. (`src/pancake.js` là file phẳng DÙNG CHUNG — sổ §0a sau CR-02-10: «sửa được như code v3 thường»; chỉ năm file bộ não
giữ ba rào. Hook cũ `.claude/hooks/canh-file-cam.sh` và phép ⑤ của `_chan1.sh` chưa cập nhật luật này — nếu chúng báo đỏ cho
`src/pancake.js`, ghi vào nhật ký, KHÔNG sửa hai rào đó ở phiếu này — việc của GL7.)
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

`src/pancake.js:120-140#pkFetchPage` gọi `fetch(buildUrl(tok), init)` KHÔNG có `signal` (`:129`); lỗi mạng ⇒ `continue` sang token kế (`:131`) —
**áp cả cho POST**. Mọi request theo page đi qua hàm này: đọc hội thoại `:212` · tin `:219` `:225` · gắn thẻ `:231` · cài đặt `:245` · **gửi
chữ `:266` · gửi ảnh `:278`** · ghi chú khách `:290`. Bốn `fetch` trần khác cũng không hạn: `:91` (addPancakeToken) · `:166`
(getPageAccessToken) · `:185` (pkMarkUnread) · `:202` (refreshPancakePages). Hạn thật hôm nay chỉ là mặc định của undici (~300 s), nhân số token;
poll chạy tuần tự từng page (`src/queue/chay-worker.js:113-129`) ⇒ một request treo kéo cả vòng; gửi nằm trong giao dịch đang mở (`src/queue/kho.js`)
⇒ giữ một kết nối pool + đèn «máy chạy bot tắt giữa chừng» đỏ giả.

⚠️ **Tin đúp (đang có, không phải do timeout):** POST gửi tin lỗi mạng (gói đi rồi mà mất phản hồi) ⇒ `continue` ⇒ GỬI LẠI bằng token khác ⇒ khách
nhận hai tin. Sổ `lan_gui` không chặn được vì cả hai lần nằm trong cùng một bước gửi.

## ② Hợp đồng vào / ra

**Ra:**
1. `pkFetchPage` gắn hạn cho MỖI lượt `fetch`: GET (và mọi method chỉ đọc) **15 s**; POST/PUT/DELETE **30 s** — hằng có tên, đọc được qua
   biến môi trường tuỳ chọn có giá trị mặc định (vd `V3_PANCAKE_HAN_DOC_MS` · `V3_PANCAKE_HAN_GUI_MS`; vắng = mặc định trên, KHÔNG phải «không
   hạn»). Biến mới khai vào `docs/v3/ban-giao/bien-moi-truong-v3.md` CÙNG commit. Mẫu sẵn có: `src/pos/api.js:36-45#goi` (AbortController + setTimeout).
2. **Method KHÔNG phải GET**: lỗi mạng HOẶC quá hạn ⇒ TRẢ LỖI NGAY (dạng `{ error_code: -1, message, khongRo: true }` hoặc tương đương) — KHÔNG
   xoay sang token kế. Chỉ xoay token khi Pancake TRẢ LỜI RÕ là lỗi quyền (`permErr`: 103/105/121 — tức chưa gửi gì). GET giữ hành vi xoay token
   cả khi lỗi mạng.
3. Kết quả gửi mang dấu «không rõ đã tới khách chưa» khi lỗi mạng/quá hạn, để lớp trên (`src/queue/lan-gui.js#bocCuaGuiBen` — đã chuyển
   `ok!==true` thành `lan_gui='khong_ro'` + `LoiCanDoiChieuGui`) giữ đúng hành vi «không gửi lại, người đối chiếu». KHÔNG sửa `lan-gui.js`
   trừ khi cần đọc dấu mới — nếu cần, ghi rõ.
4. Bốn `fetch` trần (`:91` `:166` `:185` `:202`) gắn hạn: 15 s (đọc / đánh dấu) — `:185` pkMarkUnread là POST nhưng không gửi gì cho khách:
   lỗi mạng ⇒ trả lỗi, không thử lại.
5. Không đổi URL, thân, thứ tự token, cách nhớ token theo page (`_pageTokIdx`).
6. **Sửa sau review (a) 06/10 (5 NÊN):** (a) biến hạn ngoài khoảng hợp lệ (`'0'`, âm, không phải số, > 120 000) ⇒ về MẶC ĐỊNH + cảnh báo một lần,
   KHÔNG huỷ request ngay (bot câm); (b) hạn phủ CẢ lúc đọc thân phản hồi (`res.json()`), không chỉ lúc nhận header; (c) phân biệt lỗi PHA KẾT NỐI
   (chưa gửi được byte nào — vd `ECONNREFUSED`, `ENOTFOUND`) với lỗi SAU khi đã gửi (đứt / quá hạn chờ phản hồi): trả trong kết quả một trường
   (vd `phaLoi: 'ket_noi' | 'sau_gui'`) cho GL4 đếm đúng; POST lỗi pha kết nối vẫn KHÔNG xoay token (giữ an toàn), chỉ ghi đúng loại;
   (d) `pkAddNote` (ghi chú cho sale) lỗi mạng / quá hạn ⇒ trả thất bại (không `ok:true`) — nằm trong `src/pancake.js`.

## ③ File được đụng

```
src/pancake.js
docs/v3/ban-giao/bien-moi-truong-v3.md
test/gl3-*.test.mjs
ops/bin/nghiem-thu/gl3.sh
```

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl3.sh`, rc=0 khi đạt; KHÔNG gọi mạng thật — `fetch` giả; `grep -E` không `rg`; đảo-vá trên BẢN SAO tạm)

0. Mọi ca dựng **≥ 2 token** (để thấy có / không xoay). Biến hạn `'0'` · `'abc'` ⇒ dùng mặc định (đo bằng hạn rút ngắn hợp lệ).
1. `fetch` giả TREO mãi với GET ⇒ `pkFetchPage` trả lỗi sau ≈ hạn đọc (đo thời gian, dùng hạn rút ngắn qua biến cho ca chạy nhanh) và thử token kế.
2. `fetch` giả TREO với POST gửi chữ ⇒ trả lỗi «không rõ» sau ≈ hạn gửi, **fetch được gọi ĐÚNG 1 lần** (không token thứ hai).
3. `fetch` giả NÉM lỗi mạng với POST ⇒ trả lỗi ngay, fetch gọi đúng 1 lần.
4. POST nhận `error_code: 105` (lỗi quyền) ở token 1 ⇒ thử token 2 ⇒ thành (hành vi xoay token khi Pancake từ chối rõ GIỮ NGUYÊN).
5. GET lỗi mạng ở token 1 ⇒ thử token 2 (giữ nguyên).
6. Bốn fetch trần: treo ⇒ trả lỗi sau ≈ hạn.
7. Đầu-cuối với worker giả: gửi treo ⇒ tin vào `lan_gui='khong_ro'` (đường đối chiếu), KHÔNG có lần gửi thứ hai. ⚠️ Máy dev có `PANCAKE_READONLY=1`
   trong `.env` ⇒ van ghi chặn POST TRƯỚC khi tới fetch giả ⇒ ca xanh giả: ca phải mở van trong phạm vi ca (biến môi trường của tiến trình ca, KHÔNG
   sửa `.env`) và khẳng định fetch giả THẬT SỰ được gọi đúng 1 lần.
7b. Thân phản hồi treo sau khi header về ⇒ quá hạn đúng. 7c. Lỗi pha kết nối ⇒ `phaLoi:'ket_noi'`; đứt sau gửi ⇒ `'sau_gui'`. 7d. `pkAddNote` lỗi mạng ⇒ thất bại.
8. Đảo-vá: bỏ `signal` ⇒ phép 1/2 đỏ (quá thời gian ca); trả lại `continue` cho POST lỗi mạng ⇒ phép 2/3 đỏ (fetch gọi 2 lần).
9. Bộ ca cũ chạm gửi xanh: `test/l1-m2-cua.test.js` · `test/va-r1-van-gui.test.js` · `test/l2-m1-nhac-truong.test.js` · `test/phase0-webhook-delivery.test.js`.
   `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl3-*.test.mjs` (fetch giả: treo · ném · lỗi quyền · thành; GET vs POST; bốn fetch trần; đầu-cuối worker giả).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Ngắt cả page khi gửi lỗi liên tiếp (GL4) · poll song song nhiều page · cập nhật hook / phép ⑤ `_chan1.sh` theo luật file phẳng mới (GL7).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n -i "timeout\|hạn chờ\|pkFetchPage\|N-MB-NGAT-PAGE\|tin đúp"
N-MB-NGAT-PAGE (CR-02-10 · MB4) — nguyên tắc 9 README «biết dừng khi kênh lỗi» ... (GL4)
```
Quan hệ: **mới** (báo cáo go-live; nguy cơ tin đúp phát hiện ở nghiên cứu 05/10).
