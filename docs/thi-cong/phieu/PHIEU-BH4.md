# PHIẾU BH4 — Ngân sách lượt định cỡ lại theo ĐƯỜNG CHỐT THẬT (7,1 lượt page tới SĐT)

**Base:** `22561be` · **Làn:** 🟨 (đổi NHỊP tiêu tiền, không mở đường gửi) · thợ **sonnet**
**Đụng bộ não:** `src/lead-score.js` — bảng điểm và bậc ngân sách nằm trọn ở đây.

> Thợ nạp `tho-thi-cong` + `viet-thuoc`. Phụ thuộc: KHÔNG (pathspec rời hẳn BH1/BH2/BH3).

## ① Thi hành

- Đo 16/09 trên 719 hội thoại thật: hội thoại **có đơn** có **9,6 tin khách** · **14,5 tin
  page** · khách cho SĐT sau trung bình **7,1 lượt page**. Hội thoại **không đơn**: 2,6 tin
  khách. Tức **chốt đơn là chuyện dài**, không phải chuyện 3–4 lượt.
- `src/lead-score.js:212` — bậc `AM` (khách ấm) hiện cho **3 lượt**. Fast Lane phủ ~1/3 tin
  khách ⇒ khách ấm còn ~6–7 lượt cần model, mà chỉ được 3 ⇒ **bị cắt và đẩy sang sale
  trước khi kịp nóng lên**.
- `docs/v2/03-TANG-TANG-CHOT.md` §M11 — bảng tỷ lệ chốt theo lượt: lượt 4 → 11,2% ·
  5 → 16,7% · 6 → 18,9%. Chính lý lẽ đã dùng để bỏ trần cào bằng `MAX_AI_TURNS=4`, nay áp
  tiếp một bậc nữa.

## ② Vào/ra

**Vào (ĐO LẠI):**

- `lead-score.js#turnBudget()` — 5 bậc: `LANH` 1 · `AM` 3 · `NONG` 6 · `DANG_CHOT` 10 ·
  `SAT_DON` 12; `+3` khi có phản đối; trần cứng `HARD_MAX_TURNS = 12`.
- `SIGNAL_POINTS` — 13 tín hiệu. **Đo trên 3.027 tin khách thật:** `price` 348 ·
  `phone` 161 · `ship` 155 · `name` 155 · `address` 75 · `buy` 50 · `obj_trust` 31 ·
  `image` 20 · `obj_price` 6 · `warranty` 5 · `obj_wait` 4 · `howuse` 1.
  ⚠️ `obj_trust` (nghi hàng giả) xuất hiện **31 lần** — gấp 5 lần `obj_price`, mà bảng điểm
  cho nó **0 điểm**. Ở thị trường vàng/mỹ phẩm KSA, «legit ba ito?» là tín hiệu MUA, không
  phải tín hiệu bỏ đi.
- `AM_THRESHOLD = 2` — đã hiệu chỉnh 10/08 trên 562 hội thoại; **không đụng**.
- `conv-state.js#llmTurns24h` — sổ lượt bền; **không đụng**.

**Ra:** đúng **ba** con số đổi, không hơn:

| | nay | mới | vì sao |
|---|---:|---:|---|
| `AM` base | 3 | **5** | khách ấm cần ≥6 lượt model mới tới SĐT; 3 là cắt giữa đường |
| `NONG` base | 6 | **8** | hội thoại có đơn dùng 14,5 lượt page; nóng mà 6 là vẫn thiếu |
| `obj_trust` điểm | 0 | **2** | 31/3.027 tin, tín hiệu quan tâm thật ở thị trường này |

`LANH` giữ **1** (Fast Lane lo — 60% khách, không được nới). `DANG_CHOT`/`SAT_DON`/
`HARD_MAX_TURNS` giữ nguyên. Bonus phản đối giữ `+3`.

**Chi phí:** nới bậc = tốn thêm lượt. Bù bằng BH3 (tin ngắn hơn → output token giảm ~60%)
và BH6 (bỏ `get_price` → bớt 1 lời gọi/lượt báo giá). **Phiếu này PHẢI đo lại chi phí
thật, không được nới rồi bỏ đó** — xem ④.

## ③ Pathspec

```
src/lead-score.js                  ← đã khai «Đụng bộ não»
test/bh4-ngan-sach.test.js
test/lead-score.test.mjs           ← CHỈ cập nhật số kỳ vọng của 3 bậc đổi
ops/bin/nghiem-thu/bh4.sh
docs/thi-cong/nhat-ky/phieu-bh4.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không đụng `handler.js` `src/chat/ngan-sach-luot.js` — cả hai đọc `turnBudget()` qua
import, đổi số ở nguồn là cả hai bản cùng đổi (đó là điểm của việc sửa ở đây).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh4.sh`

```bash
node --test test/bh4-ngan-sach.test.js          # kỳ vọng: 0 fail, ≥10 ca
node --test test/lead-score.test.mjs            # kỳ vọng: 0 fail

# G1 · turnBudget: AM→5 · NONG→8 · LANH→1 · SAT_DON→12 · trần vẫn 12 khi cộng bonus
# G2 · "legit ba ito?" → obj_trust có mặt VÀ score tăng 2
# G3 · khách chỉ "hi" + "ok" → vẫn LANH (1 lượt) — nới bậc KHÔNG được rò xuống nhóm lạnh
# G4 · chuỗi tin thật của một hội thoại CÓ ĐƠN (lấy từ mẫu) → leo tới ≥NONG trước lượt 5

# ═══ ĐO CHI PHÍ, bắt buộc — nới ngân sách mà không đo là mở vòi ═══
node ops/bin/do-ngan-sach.mjs --mau mau-duong-ban.json
#   chạy turnBudget trên TOÀN BỘ chuỗi tin khách của 719 hội thoại thật, bản CŨ vs MỚI.
#   kỳ vọng: tổng lượt model toàn đàn tăng ≤ +18%
#            phần tăng dồn vào nhóm ẤM/NÓNG ≥85% (không rò sang LẠNH)
#   (ngưỡng lùi: >+25% ⇒ hạ NONG về 7 rồi đo lại, ghi số vào nhật ký)
```

## ⑤ Test chạm nhánh thật

- `scoreTurn` + `turnBudget` chạy trên **chuỗi tin khách thật** của 719 hội thoại (mẫu đã
  che PII), không phải chuỗi tự dựng: bảng điểm chỉ có nghĩa khi đo trên văn phong thật.
- Nhánh KHÔNG chạm được: `back_from_cold` (+2) — v3 không có trạng thái `COLD`
  (`src/chat/ngan-sach-luot.js:31-38` đã khai). Giữ nguyên, khai lại trong nhật ký.

## ⑥ Ngoài phạm vi

- `HARD_MAX_TURNS = 12` và `AM_THRESHOLD = 2` — **không đụng**, cả hai đã hiệu chỉnh bằng
  số đo riêng.
- `handler.js:391` còn nhánh `MAX_AI_TURNS` cào bằng cho kênh không có convId (web/local
  chat) — không đụng, ghi §9.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "turnBudget\|AM_THRESHOLD\|HARD_MAX" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(0 dòng)
$ grep -n "ngân sách" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | head -3
  (chỉ các dòng của L2-M3 — «ngân sách lượt theo độ nóng», đã ✅, cùng cơ chế khác số)
```

**Quan hệ: trùng-phán một phần** với L2-M3 (phiếu đó đã port cơ chế sang v3 qua
`src/chat/ngan-sach-luot.js`). BH4 **không** viết lại cơ chế — chỉ đổi 3 con số ở
`lead-score.js`, và vì v3 đọc qua import nên cả hai bản cùng nhận. Không đẻ bản khai thứ hai.
