# PHIẾU GL7a — Phép ⑤ của `_chan1.sh` theo luật file phẳng sau CR-02-10 (hết đỏ giả cho `src/pancake.js` …)

**Base:** `aef9fb6` · **Làn:** 🟩 (rào nghiệm thu; không chạm đường bot / tiền)
**Nguồn:** sổ §0a luật 4 bản «SỬA 02/10 — CR-02-10» (31 file phẳng DÙNG CHUNG sửa được như code v3 thường; năm file bộ não giữ ba rào 16/09) ·
phiếu GL3 dòng «Đụng bộ não» (rào cũ — việc của GL7) · `_chan1` GL3 / GL3b / GSP3c đều đỏ ⑤ cho `src/pancake.js` (sổ §10 06–07/10) · sổ §5j GL7
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

`ops/bin/nghiem-thu/_chan1.sh:49-70` (phép ⑤) coi MỌI tệp phẳng `src/*.js` trong diff là vùng cấm, trừ tệp thuộc `NAO` khi phiếu khai
`**Đụng bộ não:**`. Luật đã đổi từ 02/10 (CR-02-10): tệp phẳng dùng chung (vd `src/pancake.js`, `src/kb.js`, `src/config.js`) sửa được như code v3;
chỉ năm tệp bộ não cần khai. Hệ quả hôm nay: mọi phiếu sửa `src/pancake.js` (GL3, GL3b) đỏ ⑤ giả, tổng phải giải thích tay mỗi lần — rào mất tác
dụng vì người quen bỏ qua dòng đỏ.

## ② Hợp đồng vào / ra

1. Phép ⑤ mới: tệp phẳng `src/*.js` thuộc `NAO` mà phiếu KHÔNG khai `**Đụng bộ não:**` (dòng khai có chữ khác «không») ⇒ ĐỎ; tệp phẳng khác ⇒ qua.
   Giữ nguyên danh sách `NAO` hiện có. Đổi tên nhãn phép cho đúng nghĩa (vd `⑤bộ-não-phải-khai`), câu đỏ in tên tệp + nhắc khai.
2. Phiếu khai `**Đụng bộ não:** không.` mà diff chạm tệp bộ não ⇒ ĐỎ (hôm nay `grep -c '^\*\*Đụng bộ não:\*\*'` đếm cả dòng «không» là đã khai — lỗ).
3. Chú thích đầu phép ghi luật mới + nguồn (sổ §0a, CR-02-10).
4. Không đổi các phép khác của `_chan1.sh`.

## ③ File được đụng

```
ops/bin/nghiem-thu/_chan1.sh
test/gl7a-*.test.mjs
ops/bin/nghiem-thu/gl7a.sh
```

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl7a.sh`, rc=0 khi đạt; dựng repo git TẠM trong thư mục tạm cho mỗi ca — KHÔNG đổi repo thật; `grep -E` không `rg`)

1. Diff chạm `src/pancake.js`, phiếu khai «Đụng bộ não: không.» ⇒ ⑤ XANH.
2. Diff chạm `src/prompts.js`, phiếu khai «Đụng bộ não: không.» ⇒ ⑤ ĐỎ (nêu tên tệp).
3. Diff chạm `src/prompts.js`, phiếu khai «Đụng bộ não: CÓ — src/prompts.js …» ⇒ ⑤ XANH.
4. Diff chạm `src/prompts.js`, phiếu KHÔNG có dòng khai ⇒ ⑤ ĐỎ.
5. Diff chỉ chạm `src/queue/*.js` / `v3/…` ⇒ ⑤ XANH.
6. Đảo-vá: trả phép ⑤ về bản cũ ⇒ phép 1 đỏ; coi dòng «không» là đã khai ⇒ phép 2 đỏ.
7. Chạy `_chan1.sh gl3b` trên cây thật (đọc, không ghi) ⇒ ⑤ XANH (trước đỏ cho `src/pancake.js`).

## ⑤ Test chạm nhánh nào

`test/gl7a-*.test.mjs` (năm cảnh ④1–5 trên repo git tạm).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Hook `.claude/hooks/canh-file-cam.sh` (cấu hình cục bộ, ngoài git — người quyết đổi) · phần tài liệu còn lại của GL7 (`deploy/README.md` · `README.md:95` ·
unit mẫu cũ · `docs/v3/00-BAT-DAU-TU-DAY.md`).

## ⑦ ĐÃ TRA CHƯA

```
$ grep -n "⑤vùng-cấm-src-phẳng" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md docs/thi-cong/nhat-ky/phieu-gl3*.md | head
(GL3 · GL3b: ⑤ đỏ cho src/pancake.js = rào cũ — GL7)
```
Quan hệ: **mới** (tách phần rào khỏi GL7).
