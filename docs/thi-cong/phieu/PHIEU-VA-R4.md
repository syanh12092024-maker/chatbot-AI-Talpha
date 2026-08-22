# PHIẾU VA-R4 — Bộ đọc ý: phủ định KHÔNG được đọc thành xác nhận (C4: RF-20)

**Base:** `bf9614a` · **Làn:** 🟨 (đọc ý — nhưng kết quả kích ship COD, đo kỹ) · thợ **sonnet** ·
điểm (a) tổng tự chấm: 02 §L3 «mơ hồ→khong_ro, KHÔNG đoán liều»; ship hàng khách chưa đồng ý
là hỏng COD.

## ① Thi hành
- RF-20: `doc-y.js` "not sure"/"don't confirm"/"cannot confirm" → `xac_nhan` do_tin=1 (thấy
  "sure/confirm", bỏ phủ định trước). Comment code (doc-y.js:19-22) tự nhận «cái giá đã biết»
  — nay PHẢI đóng: phủ định ghép trước từ xác nhận ⇒ KHÔNG được là xac_nhan.

## ② Vào/ra
**Vào (ĐO LẠI):** `doc-y.js` bộ từ khoá 4 nhánh + hàm khớp + nhánh MÂU THUẪN (do_tin=0.5) ·
bộ ca thật nếu có trong conv dữ liệu.
**Ra:** phủ định đứng TRƯỚC từ xác nhận ("not sure", "don't/cannot/won't confirm", "not yet")
→ `khong_ro` (để máy đẩy cho_sale) HOẶC `tu_choi` nếu rõ phủ định — KHÔNG BAO GIỜ `xac_nhan`.
Giữ nguyên: câu xác nhận thật ("yes", "confirm", "sige po") vẫn xac_nhan; câu mơ hồ vẫn khong_ro.
Đa ngôn ngữ: xử ít nhất EN + AR (không khớp "no" trong "know", "لا" trong từ dài — comment
doc-y.js:124 đã lường, giữ).

## ③ File được đụng
```
src/orders/doc-y.js
test/va-r4-*.test.js
ops/bin/nghiem-thu/va-r4.sh
docs/thi-cong/nhat-ky/phieu-va-r4.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```
⛔ Chỉ doc-y.js — không đụng may-trang-thai/hang-cho/nhan-phan-hoi-wa (C2/C3 + đã ✅).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-r4.sh`
```bash
# 1. RF-20: node -e docY cho ≥6 câu phủ định EN ("not sure","don't confirm","cannot confirm",
#    "not yet","won't take it","no thanks") → KHÔNG câu nào xac_nhan (in từng câu→nhánh)
# 2. Không hồi quy nhánh ĐÚNG: ≥8 câu xác nhận thật + ≥4 tu_choi + ≥4 mơ hồ → nhánh cũ giữ nguyên
# 3. AR: ≥4 câu phủ định/xác nhận Ả Rập → đúng nhánh, không khớp "لا" trong từ dài
# 4. node --test test/va-r4 + hồi quy l3-m3 (doc-y là đầu vào nhan-phan-hoi-wa) không gãy
```
## ⑤ Hàm thuần, không nhánh thật. ## ⑥ Ngoài phạm vi → §9.
## ⑦ ĐÃ TRA: RF-20 §9 — phiếu đóng. doc-y.js tách hẳn C2/C3.
**Khi nộp:** nhật ký · §10 · commit pathspec (`fix(orders): VA-R4 — ...`) · ≤10 dòng.
