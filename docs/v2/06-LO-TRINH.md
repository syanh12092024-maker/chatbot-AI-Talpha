# Lộ trình triển khai

> Nguyên tắc xếp thứ tự: **cầm máu → chặn rò → sửa cấu trúc → tăng chốt → tự tiến hoá.**
> Mỗi đợt phải chạy được và đo được trước khi sang đợt sau.
> Xem `08-SONG-SONG.md` để biết đợt nào chạy song song được.

---

## TRẠNG THÁI (cập nhật 11/08/2026)

| Module | Trạng thái |
|---|---|
| M06 Fast Lane | ✅ code + 38 test · **chưa deploy** |
| M09 Outbound Guard | ✅ code + test · **chưa deploy** |
| M05 Conversation Owner | ✅ code + 16 test · **chưa deploy** |
| M19 (rút gọn) LLM watchdog | ✅ code · **chưa deploy** |
| Sổ AI + `lane`/`state` | ✅ |
| 16 module còn lại | ⬜ mới có spec |

| Cửa nhường Botcake (2 lớp) | ✅ code + 8 test · **chưa deploy** |

**Chặn ngoài code:**
① **nạp tiền Kimi** (bot đang chết) — 🔴 chặn cứng
② **deploy** — 🔴 chặn cứng
③ ~~thêm điều kiện khoá thẻ trong Botcake~~ → **đã hạ xuống TUỲ CHỌN** (11/08/2026):
AI giờ tự nhường Botcake bằng 2 cửa trong `pancake-poll.js`, không cần Botcake hợp tác
④ **gỡ tin doạ khách ở công cụ RTO** — 🔴 công cụ đó **không nằm trong repo này**,
không dòng code nào ở đây chặn được

---

## ĐỢT 0 — Cầm máu (làm ngay hôm nay)

| Việc | Module | Công |
|---|---|---|
| Nạp tiền tài khoản Kimi | — | *cần chủ dự án* |
| Cảnh báo hết credit + dừng đúng cách khi LLM chết | **M19** (rút gọn) | 2h |
| Gỡ tin doạ khách + ký tự ẩn ở luồng RTO | **M09** (luật 8, 9) | 2h |

🔴 **Việc gỡ tin doạ khách là ưu tiên cao nhất về rủi ro.** Câu *"I'll be taking you to
social media and posting in group of Filipino in SAUDI"* đang được gửi hàng loạt kèm
ký tự Unicode ẩn để né bộ lọc trùng lặp của Meta. Một khách report là mất page, mất
toàn bộ traffic ads đổ vào page đó.

**Kết quả đợt 0:** bot sống lại, không còn rủi ro mất page.

---

## ĐỢT 1 — Chặn rò (tuần 1)

| Việc | Module | Công | Tác động đo được |
|---|---|---|---|
| Fast Lane lớp 1 (sticker/START/gật đầu/chào) | **M06** | 1 ngày | −34% lần gọi LLM |
| Outbound Guard đầy đủ | **M09** | 1 ngày | 0 tin rỗng, 0 tin sai giá |
| Tắt AI nhóm page lỗ nặng | thủ công | 1h | −15% chi phí |
| Bỏ `classifier.js` | **M08** | 0,5 ngày | −44% số call |

**Không đụng prompt ở đợt này.** Toàn bộ là lớp chặn, rủi ro chất lượng ~0.

**Kết quả kỳ vọng:** chi phí/lượt từ 133đ → **~65đ**. Đo bằng M20 sơ khai.

---

## ĐỢT 2 — Sửa cấu trúc (tuần 2)

| Việc | Module | Công |
|---|---|---|
| Máy trạng thái hội thoại + khoá Botcake bằng thẻ | **M05** | 3 ngày |
| Post-Sale Router | **M13** | 1 ngày |
| Lead Scoring → ngân sách lượt | **M11** | 1 ngày |
| Gộp prompt, cắt trùng, hạ `max_tokens` | **M08** | 0,5 ngày |

⚠️ **M05 cần việc phía Botcake**: mọi kịch bản từ khoá phải thêm điều kiện
*"không chạy nếu hội thoại có thẻ `AI Chăm`/`AI Chốt`/`AI back Sale`"*.
Đây là việc cấu hình trên Botcake, không phải code — làm song song với dev.

**Kết quả kỳ vọng:** va chạm bot 75% → **0%**. Nhóm khách nóng được chạy tới 10 lượt.

---

## ĐỢT 3 — Nhìn thấy & đo được (tuần 3)

| Việc | Module | Công |
|---|---|---|
| Sổ AI thêm `scriptVersion` / `lane` / `state` | **M10** | 0,5 ngày |
| Unit Economics + ngưỡng cảnh báo | **M20** | 2 ngày |
| Context Compressor | **M07** | 2 ngày |
| Health Watchdog đầy đủ | **M19** | 1 ngày |

> **M10 phải làm trước M17.** Không có `scriptVersion` trong Sổ AI thì toàn bộ
> trục tự tiến hoá không có cách nào đo — đây là phụ thuộc cứng.

**Kết quả kỳ vọng:** token/lượt ~13.000 → **≤5.000**. Chi phí/lượt → **~50đ**.

---

## ĐỢT 4 — Nhập liệu chuẩn hoá (tuần 4)

| Việc | Module | Công |
|---|---|---|
| Token & Page Registry | **M01** | 2 ngày |
| Script Studio (màn hình + validator + phiên bản) | **M02** | 3 ngày |
| Readiness Gate + thông báo marketer | **M03** | 1,5 ngày |
| Ops Console (bảng page + tab Botcake + tab Token) | **M18** | 3 ngày |

**Kết quả:** marketer tự điền kịch bản, page thiếu bị chặn và có người được nhắc.
Đây là lúc chuyển từ *"39 page 1 kịch bản"* sang *"39 page 39 kịch bản"*.

---

## ĐỢT 5 — Tăng chốt (tuần 5)

| Việc | Module | Công |
|---|---|---|
| Experiment Engine (A/B + rollback) | **M17** | 2 ngày |
| Follow-up Engine | **M12** | 2 ngày |
| Order Bridge chế độ A | **M14** | 1,5 ngày |
| Ingest: debounce thích ứng | **M04** | 0,5 ngày |

M17 phải xong **trước** M12 — cái follow-up bắt buộc phải chạy dưới dạng A/B, nếu không
sẽ không biết nó tăng đơn hay chỉ làm phiền khách.

**Kết quả kỳ vọng:** chốt 2,0% → **3,0–3,5%**.

---

## ĐỢT 6 — Tự tiến hoá (tuần 6+)

| Việc | Module | Công |
|---|---|---|
| Conversation Miner | **M15** | 2 ngày |
| Script Optimizer + cửa duyệt | **M16** | 3 ngày |
| Vòng đêm 02:00 + báo cáo tuần | **M15–M17** | 1 ngày |

**KHÔNG có "vòng khởi tạo".** 37/38 page đã có kịch bản marketer viết — M16 chạy trên nền
đó và chỉ được đề xuất **DIFF** (sửa/thêm một chỗ), không được viết đè cả bài.
Mỗi đêm 1 hạng mục/page.

**Kết quả kỳ vọng:** chốt → **4,0%+**, và tự tăng dần mỗi tuần.

---

## ĐỢT 7 — Hạ tầng (khi rảnh)

| Việc | Module | Ghi chú |
|---|---|---|
| Webhook Pancake | **M04** | Thử 1 page, chạy song song poll 1 tuần rồi mới cắt |
| Order Bridge chế độ B (tự tạo đơn) | **M14** | Chỉ bật khi đơn sai <2% qua 200 đơn |

⚠️ **Đừng đụng kênh Meta Graph API.** App đang ở Standard Access, `/conversations` trả `(#2)`
trên mọi page — đã tốn một phiên làm việc xác nhận. Phải qua App Review mới có Advanced Access.

---

## Bảng phụ thuộc (đọc trước khi đảo thứ tự)

```
M01 ──▶ M02 ──▶ M03
         │        │
         ├──▶ M06 │
         ├──▶ M08 │
         └──▶ M09 │
M05 ──▶ M06/M07/M13
M10 ──▶ M17 ──▶ M12       ← M10 là nút thắt của cả trục D
M10 ──▶ M20 ──▶ M18
M15 ──▶ M16 ──▶ M17
```

**Ba phụ thuộc cứng, không được đảo:**
1. **M10 trước M17** — không ghi `scriptVersion` thì không A/B được.
2. **M17 trước M16** — sinh kịch bản mà không đo được là tối ưu mù.
3. **M05 trước M16** — kịch bản hay tới đâu cũng vô nghĩa nếu Botcake vẫn đâm ngang.

---

## Tổng kết mục tiêu

| Chỉ số | Nay | Đợt 1 | Đợt 3 | Đợt 6 |
|---|---|---|---|---|
| Chi phí/lượt | 133đ | 65đ | 50đ | 50đ |
| Chi phí/đơn | 7.934đ | 4.500đ | 3.000đ | **≤2.000đ** |
| Tỷ lệ chốt | 2,0% | 2,0% | 2,2% | **4,0%** |
| Va chạm bot | 75% | 75% | **0%** | 0% |
| Page **đo được** kịch bản ăn tiền không | 0/38 | 0/38 | **38/38** | 38/38 |
| Page đủ 3 trường kịch bản | 1/38 | 1/38 | 1/38 | **38/38** |
| Độ trễ | 26–40s | 26–40s | 26–40s | **≤10s** |

> Cột "nay" là **đo thật**. Các cột sau là **dự phóng**: phần chi phí tính thẳng từ số
> lần gọi cắt được nên độ tin cậy cao; phần tỷ lệ chốt phải qua A/B mới biết chắc.
