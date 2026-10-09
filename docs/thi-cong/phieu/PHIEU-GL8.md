# PHIẾU GL8 — Cắt chữ không làm đứt emoji trước khi ghi jsonb (bot trả lời xong thì tự giao sale) · công cụ giả lập đọc env như `node --env-file`

**Base:** `f2d3629` · **Làn:** 🟨 (A chạm đường ghi sổ SAU khi gửi tin cho khách; B là công cụ đo, 🟩)
**Nguồn:** giả lập pilot 09/10 trên page Soothing Cooling Gel UAE (CSDL giả lập dev, Kimi k2.6 thật, van gửi đóng) — tổng đo, chưa có nhật ký riêng.
**Đụng bộ não:** không (nếu buộc phải sửa `src/fast-lane.js` / `src/prompts.js` … thì DỪNG, báo tổng).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

**A — lỗi thật, chặn mở van bước ④.** `src/chat/handler-v3.js:971` ghi `so_ai.du_lieu.text = guarded.slice(0, 200)`. `slice` cắt theo đơn vị
UTF-16: câu trả lời 201 đơn vị mà đơn vị thứ 200 là nửa đầu của 📦 (`\ud83d`) ⇒ chuỗi mang nửa cặp thay thế ⇒ `JSON.stringify` giữ `\ud83d` ⇒
Postgres jsonb từ chối «invalid input syntax for type json». Bước ghi này chạy **sau** `guiChu(guarded)` ⇒ worker (`src/queue/worker.js` nhánh
`catch`: `daGui` ⇒ `hetLuot` ⇒ `banGiaoLoi`) đánh lượt `loi` và **giao khách cho sale** dù bot vừa trả lời đúng; `so_ai` mất dòng (tiền tàng hình),
hồ sơ/điểm lead của lượt không lưu. Không gửi đúp (rào `daBatDauGui` đúng). Câu thật đo được (giả lập): «Yes po Annabelle, free delivery po! 🚚 …
details for booking. 📦» — 201 đơn vị. Bot viết Tagalog nhiều emoji, câu ~200 ký tự là thường ⇒ chắc chắn gặp ở pilot.
Cùng khuôn: `handler-v3.js:668` · `:744` (`cua.text.slice(0, 200)` vào `du_lieu`), `src/chat/trang-thai.js:157` (`textDaGui.slice(0, 2000)` — thợ tra
nó đi vào cột nào), và mọi chỗ khác cắt chữ khách/bot rồi đưa vào cột `jsonb` (`so_ai.du_lieu` · `hoi_thoai.ho_so|diem_lead|moc_luot_llm` ·
`lan_gui.noi_dung` · `nhat_ky.*` · `hang_cho_tao_don.*`).

**B — công cụ đo nói sai.** `ops/bin/gia-lap-mot-minh.mjs` (khối đọc `DEVENV`) giữ nguyên chú thích đuôi: `.env` có
`FASTLANE_TEMPLATES=0        # TAT 11/08…` ⇒ `process.env.FASTLANE_TEMPLATES = "0        # TAT…"` ⇒ mọi cờ đọc kiểu `!== '0'` thành BẬT
(`FASTLANE_TEMPLATES` · `FASTLANE_INTRO` · `HUMAN_TAKEOVER`). `node --env-file` trên prod đọc `"0"` (đo 09/10). Mọi lượt giả lập trước dùng công cụ
này (Minty 28/09 · BH7 · BH8) đã chạy với câu mẫu giá/ship + lời chào ảnh BẬT trong khi prod TẮT.

## ② Hợp đồng vào / ra

1. Một hàm cắt chữ DÙNG CHUNG (thợ chọn chỗ đặt, vd `src/chat/cat-chu.js`): cắt tối đa N đơn vị mà **không bao giờ** để lại nửa cặp thay thế
   (cắt lùi một đơn vị khi đơn vị cuối là nửa đầu; chuỗi vào đã mang nửa cặp lẻ ⇒ thay bằng U+FFFD — `String.prototype.toWellFormed` có trên Node 20).
2. Mọi chỗ ở ① A dùng hàm đó. Thêm lưới ở **cửa ghi** `so_ai` và cửa ghi `hoi_thoai` (cột `COT_JSONB` của `src/chat/kho.js`): chuỗi trong giá trị
   jsonb được làm lành (`toWellFormed`) trước khi `JSON.stringify` — một chỗ cắt mới quên dùng hàm vẫn không giết lượt.
3. Lượt có câu trả lời 201 đơn vị như ① ⇒ `tin_cho_xu_ly.trang_thai='xong'`, có dòng `so_ai` loại `reply`, `du_lieu.text` không chứa nửa cặp,
   hội thoại KHÔNG bị giao sale vì lỗi này.
4. B: khối đọc `DEVENV` của `gia-lap-mot-minh.mjs` (và mọi công cụ `ops/bin/*.mjs` có cùng khối đọc — thợ grep) đọc như `node --env-file`: giá trị
   có ngoặc kép/đơn ⇒ lấy trong ngoặc; không ngoặc ⇒ bỏ ` #…` đuôi, cắt khoảng trắng. Công cụ in một dòng «cờ đã đọc» (FASTLANE · FASTLANE_TEMPLATES ·
   FASTLANE_INTRO · HUMAN_TAKEOVER · V3_RAP_PROMPT_BAT · PANCAKE_READONLY · V3_PANCAKE_GUI · V3_POS_GHI) trước khi chạy.
5. Không đổi hành vi nào khác của đường bot (nội dung gửi khách giữ nguyên từng byte).

## ③ File được đụng

```
src/chat/handler-v3.js
src/chat/trang-thai.js            (nếu ② 1 áp tới)
src/chat/kho.js                   (lưới ② 2)
src/chat/cat-chu.js               (mới — hoặc chỗ thợ chọn, khai trong nhật ký)
<cửa ghi so_ai>                   (thợ tra — khai đường dẫn trong nhật ký)
ops/bin/gia-lap-mot-minh.mjs      (+ công cụ ops/bin cùng khối đọc env)
test/gl8-*.test.mjs
ops/bin/nghiem-thu/gl8.sh
docs/thi-cong/nhat-ky/phieu-gl8.md
```

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl8.sh`, rc=0 khi đạt)

1. Hàm cắt: chuỗi 201 đơn vị, đơn vị 200 là nửa đầu 📦 ⇒ ra ≤200 đơn vị, `isWellFormed()` đúng; chuỗi thường ⇒ y hệt `slice`.
2. Handler (CSDL sandbox, model giả trả đúng câu ① 201 đơn vị, diễn tập): lượt `xong`, 1 dòng `so_ai` `reply`, 0 việc bàn giao do lỗi.
3. Như 2 cho nhánh lớp 0 đồng (`:668` / `:744`) với mẫu chứa emoji ở vị trí cắt.
4. Lưới ② 2: gọi thẳng cửa ghi `so_ai` / `hoi_thoai` với chuỗi mang nửa cặp lẻ ⇒ ghi được, đọc lại thấy U+FFFD.
5. B: `DEVENV` tạm có `FASTLANE_TEMPLATES=0   # tắt` · `A="x # y"` · `B=1#2` ⇒ đọc `"0"` · `"x # y"` · `"1#2"`; dòng «cờ đã đọc» có mặt.
6. Đảo-vá: trả `:971` về `slice` (bỏ lưới) ⇒ ca 2 đỏ; bỏ lưới nhưng giữ hàm ⇒ ca 4 đỏ; trả khối đọc env cũ ⇒ ca 5 đỏ.
7. `npm test` không tụt; `_chan1.sh gl8` xanh.

## ⑤ Test chạm nhánh nào

`test/gl8-*.test.mjs` — hàm cắt, nhánh model `:971`, nhánh lớp 0 đồng `:668/:744`, lưới cửa ghi, khối đọc env của công cụ.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Đổi luật «lỗi sổ sách SAU khi gửi ⇒ giao sale» (`worker.js` catch) thành «ghi lỗi, không giao» — đổi ý đồ, cần `doi-y-do` · đo lại các lượt giả lập
cũ (Minty/BH7/BH8) với khối đọc env đúng.

## ⑦ ĐÃ TRA CHƯA

```
$ python3 -c "t='…booking. 📦'; …"   # câu thật đo 09/10: 201 đơn vị UTF-16, đơn vị 199 = '\ud83d'
$ node --env-file=.env -e 'console.log(JSON.stringify(process.env.FASTLANE_TEMPLATES))'   # prod 09/10 ⇒ "0"
$ grep -n "slice(0, 200)" src/chat/handler-v3.js   ⇒ :668 :744 :971
```
Quan hệ: **mới**.
