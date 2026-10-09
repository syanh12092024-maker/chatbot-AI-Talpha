# PHIẾU GL8 — Cắt chữ không làm đứt emoji trước khi ghi jsonb (bot trả lời xong thì tự giao sale) · công cụ giả lập đọc env như `node --env-file`

**Base:** `33c04ac` · **Làn:** 🟥 (A chạm đường ghi sổ SAU khi gửi tin + lưới ở hàng chờ đơn `src/orders/hang-cho.js` — đường tiền; B là công cụ đo) ·
**Soát (a):** 09/10 — SỬA PHIẾU (6 điểm, đã sửa ở bản này): tái hiện trong hộp cát `scratchpad/gl8-repro.mjs` — khách nhận 1 tin · tin `loi` · hội thoại `HANDOFF/SALE` lý do `loi_xu_ly_can_doi_chieu` · `so_ai` 0 dòng · cả giao dịch lùi ⇒ lượt chốt đơn mất cả dòng `hang_cho_tao_don` (ghi ở `handler-v3.js:940`, trước `guiChu` :964).
**Nguồn:** giả lập pilot 09/10 trên page Soothing Cooling Gel UAE (CSDL giả lập dev, Kimi k2.6 thật, van gửi đóng) — tổng đo, chưa có nhật ký riêng.
**Đụng bộ não:** không. KHÔNG sửa `src/context.js` (các chỗ cắt :167-168 · :174 · :232-236 · :355 · :373 · :447 vào `prof` — để lưới ② 2 phủ); `src/fast-lane.js` · `src/outbound-guard.js` không cần đụng (`outbound-guard.js:361` cắt mảng trong RAM). Buộc phải sửa tệp bộ não ⇒ DỪNG, báo tổng.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

**A — lỗi thật, chặn mở van bước ④.** `src/chat/handler-v3.js:971` ghi `so_ai.du_lieu.text = guarded.slice(0, 200)`. `slice` cắt theo đơn vị
UTF-16: câu trả lời 201 đơn vị mà đơn vị thứ 200 là nửa đầu của 📦 (`\ud83d`) ⇒ chuỗi mang nửa cặp thay thế ⇒ `JSON.stringify` giữ `\ud83d` ⇒
Postgres jsonb từ chối «invalid input syntax for type json». Bước ghi này chạy **sau** `guiChu(guarded)` ⇒ worker (`src/queue/worker.js` nhánh
`catch`: `daGui` ⇒ `hetLuot` ⇒ `banGiaoLoi`) đánh lượt `loi` và **giao khách cho sale** dù bot vừa trả lời đúng; `so_ai` mất dòng (tiền tàng hình),
hồ sơ/điểm lead của lượt không lưu. Không gửi đúp (rào `daBatDauGui` đúng). Câu thật đo được (giả lập): «Yes po <tên khách>, free delivery po! 🚚 …
details for booking. 📦» — 201 đơn vị. Bot viết Tagalog nhiều emoji, câu ~200 ký tự là thường ⇒ chắc chắn gặp ở pilot.
Cùng khuôn (soát (a) đã liệt kê): `handler-v3.js:647` · `:717` (`.slice(0, 600)` câu mẫu → `so_ai`) · `:668` · `:744` (`cua.text.slice(0, 200)`) ·
**`:906` `guarded0.slice(0, 600)`** (chữ model → `so_ai`, TRƯỚC khi gửi ⇒ tin `thu_lai`, model bị gọi lại tới 3 lần — tiền — rồi vẫn giao sale) ·
`src/orders/hang-cho.js:479` (`…slice(0, 60)` chữ khách/bot → `cua_kiem` jsonb ở :708-720 — lưới `kho.js`/`so-ai.js` KHÔNG phủ). Không cần sửa:
`src/chat/trang-thai.js:157` → `hoi_thoai.ai_noi_gi` là cột **text** (`db/schema.sql:162`), pg tự thay nửa cặp bằng U+FFFD — đo trong soát (a).

**B — công cụ đo nói sai.** `ops/bin/gia-lap-mot-minh.mjs` (khối đọc `DEVENV`) giữ nguyên chú thích đuôi: `.env` có
`FASTLANE_TEMPLATES=0        # TAT 11/08…` ⇒ `process.env.FASTLANE_TEMPLATES = "0        # TAT…"` ⇒ mọi cờ đọc kiểu `!== '0'` thành BẬT
(`FASTLANE_TEMPLATES` · `FASTLANE_INTRO` · `HUMAN_TAKEOVER`). `node --env-file` trên prod đọc `"0"` (đo 09/10). Mọi lượt giả lập trước dùng công cụ
này (Minty 28/09 · BH7 · BH8) đã chạy với câu mẫu giá/ship + lời chào ảnh BẬT trong khi prod TẮT.

## ② Hợp đồng vào / ra

1. Một hàm cắt chữ DÙNG CHUNG: cắt tối đa N đơn vị mà **không bao giờ** để lại nửa cặp thay thế (cắt lùi một đơn vị khi đơn vị cuối là nửa đầu).
   Đã có tiền lệ `src/text.js:26-37` (`cleanText` · `hasLoneSurrogate` — XOÁ nửa cặp lẻ): đặt hàm mới cạnh đó (`src/text.js`) và thống nhất MỘT cách
   xử lý nửa cặp lẻ (xoá, như `cleanText`) — không đẻ cách thứ hai. Node 20.20.2 có `isWellFormed`/`toWellFormed`.
2. Mọi chỗ ở ① A dùng hàm đó. LƯỚI ở ba cửa ghi jsonb: `src/chat/so-ai.js:108` · `src/chat/kho.js:86-88` (cột `COT_JSONB`) · `src/orders/hang-cho.js:708-720`
   (`cua_kiem` / `du_lieu_don`): làm lành TỪNG CHUỖI **trước** `JSON.stringify` (vd qua `replacer`; `replacer` không đụng tên khoá — tên khoá là hằng
   của mã). ⚠️ Bẫy: gọi `toWellFormed()` SAU `JSON.stringify` vô tác dụng — stringify đã biến nửa cặp thành chữ ASCII `\ud83d`.
3. Lượt có câu trả lời 201 đơn vị như ① ⇒ `tin_cho_xu_ly.trang_thai='xong'`, có dòng `so_ai` loại `reply`, `du_lieu.text` không chứa nửa cặp,
   `hoi_thoai.chu_so_huu='AI'` và `ly_do_cuoi <> 'loi_xu_ly_can_doi_chieu'`. Lượt chốt đơn có emoji ở chỗ cắt ⇒ dòng `hang_cho_tao_don` còn.
4. B: chín công cụ `ops/bin/*.mjs` tự đọc `.env` — `gia-lap-mot-minh` · `bao-cao-24h` · `dich-ban-may` · `dien-tap-hoi-thoai` · `do-lop-0-dong` ·
   `dem-token-kimi` · `phat-lai-lich-su` · `nap-khoa-nha` · `gia-lap-dong-thoi-gian` (`dien-tap-hoi-thoai` · `do-lop-0-dong` viết nhiều dòng, nháy đơn —
   grep một mẫu sẽ trượt) — thay khối tự viết bằng `util.parseEnv(fs.readFileSync(tep, 'utf8'))` (Node 20.20.2 có; đọc y như `node --env-file`).
   `gia-lap-mot-minh` in một dòng «cờ đã đọc» (FASTLANE · FASTLANE_TEMPLATES · FASTLANE_INTRO · HUMAN_TAKEOVER · V3_RAP_PROMPT_BAT · PANCAKE_READONLY ·
   V3_PANCAKE_GUI · V3_POS_GHI) trước khi chạy.
5. Không đổi hành vi nào khác của đường bot (nội dung gửi khách giữ nguyên từng byte).

## ③ File được đụng

```
src/chat/handler-v3.js
src/text.js
src/chat/so-ai.js
src/chat/kho.js
src/orders/hang-cho.js
ops/bin/gia-lap-mot-minh.mjs
ops/bin/bao-cao-24h.mjs
ops/bin/dich-ban-may.mjs
ops/bin/dien-tap-hoi-thoai.mjs
ops/bin/do-lop-0-dong.mjs
ops/bin/dem-token-kimi.mjs
ops/bin/phat-lai-lich-su.mjs
ops/bin/nap-khoa-nha.mjs
ops/bin/gia-lap-dong-thoi-gian.mjs
test/gl8-*.test.mjs
ops/bin/nghiem-thu/gl8.sh
docs/thi-cong/nhat-ky/phieu-gl8.md
```
← mỗi dòng đúng một đường dẫn (phép ④ của `_chan1.sh` đọc khối này bằng awk — chú thích trong khối làm tệp thành «NGOÀI PHẠM VI»).

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl8.sh`, rc=0 khi đạt)

1. Hàm cắt: chuỗi 201 đơn vị, đơn vị 200 là nửa đầu 📦 ⇒ ra ≤200 đơn vị, `isWellFormed()` đúng; chuỗi thường ⇒ y hệt `slice`.
2. Qua `chayMotVong` (khuôn hộp cát `test/rp2-worker-a-phay.test.mjs:41-52`: `chayCloser` giả, cửa gửi tiêm ⇒ `lan_gui='da_gui'` như prod), model giả
   trả đúng câu ① 201 đơn vị: tin `xong` · 1 dòng `so_ai` `reply` · `hoi_thoai.chu_so_huu='AI'` · `ly_do_cuoi <> 'loi_xu_ly_can_doi_chieu'`.
   (KHÔNG đo bằng «0 việc bàn giao» — `banGiaoLoi` không tạo dòng việc, soát (a) đã thử.)
3. Như 2 cho nhánh lớp 0 đồng (`:668` / `:744` — `lopTuKhoa` không tiêm được, dựng câu mẫu qua `layKb`) và nhánh `:906` (câu model 601 đơn vị, emoji ở
   chỗ cắt): tin `xong`, model gọi ĐÚNG 1 lần.
4. Lưới ② 2: gọi thẳng cửa ghi `so_ai` · `hoi_thoai` · `hang_cho_tao_don` với chuỗi mang nửa cặp lẻ ⇒ ghi được, đọc lại không còn nửa cặp.
5. B: tệp env tạm có `FASTLANE_TEMPLATES=0   # tắt` · `A="x # y"` · `B=1#2` ⇒ đọc `"0"` · `"x # y"` · `"1"` (đúng `node --env-file`); dòng «cờ đã đọc» có mặt.
6. Đảo-vá: trả `:971` về `slice` + bỏ lưới ⇒ ca 2 đỏ; bỏ lưới giữ hàm ⇒ ca 4 đỏ; trả `:668`/`:744` và `:906` về `slice` + bỏ lưới ⇒ ca 3 đỏ; trả khối đọc env cũ ⇒ ca 5 đỏ.
7. `npm test` không tụt; `_chan1.sh gl8` xanh.

## ⑤ Test chạm nhánh nào

`test/gl8-*.test.mjs` — hàm cắt, nhánh model `:971`, nhánh lớp 0 đồng `:668/:744`, lưới cửa ghi, khối đọc env của công cụ.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Đổi luật «lỗi sổ sách SAU khi gửi ⇒ giao sale» (`worker.js` catch) thành «ghi lỗi, không giao» — đổi ý đồ, cần `doi-y-do` · đo lại các lượt giả lập
cũ (Minty/BH7/BH8) với khối đọc env đúng · **mã prod `src/queue/nap.js:44-56` `docEnvTuyetDoi` cũng giữ chú thích đuôi** — dùng ở `handler-v3.js:63`
làm lớp chặn cuối của `PANCAKE_READONLY` khi `process.env` vắng biến (nợ N-GL8-DOC-ENV-TUYET-DOI) · chỗ cắt trong `src/context.js` (bộ não) để lưới phủ.

## ⑦ ĐÃ TRA CHƯA

```
$ python3 -c "t='…booking. 📦'; …"   # câu thật đo 09/10: 201 đơn vị UTF-16, đơn vị 199 = '\ud83d'
$ node --env-file=.env -e 'console.log(JSON.stringify(process.env.FASTLANE_TEMPLATES))'   # prod 09/10 ⇒ "0"
$ grep -n "slice(0, 200)" src/chat/handler-v3.js   ⇒ :668 :744 :971
```
Quan hệ: **mới**.
