# PHIẾU RP1 — Đường đọc CSDL (`V3_RAP_PROMPT_BAT=1`) mang ẢNH sản phẩm cho bot (gửi ảnh + tin chào kèm ảnh)

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (thứ bot gửi cho khách — ảnh sản phẩm)
**Nguồn:** người quyết 07/10 «pilot bật cờ đọc từ CSDL» (sổ §10 07/10) · soát env 07/10 phát hiện P2 (`scratchpad/soat-env.md` §6) · sổ §5j (điều kiện pilot bước ③)
**Đụng bộ não:** không (`src/tools.js`, `src/fast-lane.js` CHỈ ĐỌC trường `images` có sẵn — không sửa).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

`src/chat/rap-prompt.js:302-315#rapKb` (nhánh cờ BẬT) dựng `products` chỉ có `id · name · desc · stock · hetHang · currency · tiers` — KHÔNG có `images`,
dù `src/products/catalog.js:23,40` đã đọc `anh_san_pham` vào `s.anh` (`{ id, duong, nhan, thuTu, nguon }`). Bộ não đọc `images`:
`src/tools.js:199-202` (`send_product_image` qua `productImages(p)` của `kb.js:240-250` — ghép `PUBLIC_URL` cho đường tương đối) và `src/fast-lane.js:139-146`
(`introImages` — chỉ nhận `https?://`). Đường cũ có ảnh nhờ `src/products/ban-chep-bot.js:45` (`images: s.anh.map(a => ({ url: a.duong, label: a.nhan }))`).
Hệ quả: bật cờ ⇒ «Sản phẩm … chưa có ảnh dùng được», tin chào không ảnh. Đo prod 07/10: ảnh hiện chỉ nằm ở bản sao `kb` (536, 500 đường tuyệt đối); món POS 0 ảnh —
đối soát GSP3 «chép» (`chuyen-ban-sao.js:631` `themAnh`) mang ảnh sang món khi người làm H-GSP.

## ② Hợp đồng vào / ra

1. `rapKb` nhánh cờ BẬT: mỗi phần tử `products` thêm `images: (Array.isArray(s.anh) ? s.anh : []).map(a => ({ url: a.duong, label: a.nhan }))` theo ĐÚNG thứ tự `catalog.js`
   trả (thứ tự `thu_tu`) — cùng khuôn `ban-chep-bot.js:45` để hai đường nói giống nhau. Không đổi trường khác, không đổi nhánh cờ TẮT.
2. Không sửa `tools.js` / `fast-lane.js` / `kb.js`. Đường tương đối vẫn đi `productImages` (ghép `PUBLIC_URL`); tin chào chỉ dùng ảnh tuyệt đối như đường cũ.

## ③ File được đụng

```
src/chat/rap-prompt.js
test/rp1-*.test.mjs
ops/bin/nghiem-thu/rp1.sh
```

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/rp1.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_rp1_p$$"`; `V3_RAP_PROMPT_BAT=1` CHỈ trong env tiến trình ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

1. Page gắn gốc × shop, món POS có 2 ảnh (một tuyệt đối nhãn «Ảnh sản phẩm», một tương đối `/uploads/…`) ⇒ `rapKb` trả `products[0].images` đủ 2, đúng thứ tự `thu_tu`, đúng nhãn.
2. `send_product_image` (đi `tools.js` thật với kb từ `rapKb`) ⇒ trả ảnh (không «chưa có ảnh»); đường tương đối được ghép `PUBLIC_URL` (đặt trong env ca).
3. `introImages` (đi `fast-lane.js` thật) ⇒ có ảnh tuyệt đối nhãn «sản phẩm».
4. Món không ảnh ⇒ `images: []`, tool trả «chưa có ảnh dùng được» như cũ (không ném).
5. Cờ TẮT ⇒ nhánh `kb_cu` y nguyên (so trọn đối tượng trả với bản trước sửa).
6. Đảo-vá: bỏ `images` ⇒ phép 1–3 đỏ; đảo thứ tự ⇒ phép 1 đỏ.
7. Cổng / bộ ca cũ xanh (rc tách dòng): bộ ca có `rapKb` (`grep -rlE "rapKb|rap-prompt" test v3/test`), `test/mn3-ban-chep-bot.test.mjs`, `test/tt1b-te-thi-truong.test.mjs`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/rp1-*.test.mjs` (`rapKb` cờ bật có/không ảnh · `send_product_image` · `introImages` · cờ tắt không đổi).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Ảnh cho món POS chưa đối soát (0 ảnh trên prod — H-GSP «chép» mang sang) · `introImages` không ghép `PUBLIC_URL` cho đường tương đối (có từ trước, cả hai đường) ·
màn thêm ảnh trực tiếp cho món/gốc.

## ⑦ ĐÃ TRA CHƯA

```
$ grep -n "images" src/chat/rap-prompt.js
(0 dòng — nhánh cờ BẬT không mang ảnh)
```
Quan hệ: **mới** (soát env 07/10 P2).
