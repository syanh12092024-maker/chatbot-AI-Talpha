# TRỤC D — Tự tiến hoá: mỗi đêm giỏi hơn hôm qua

> Vòng lặp: **MỔ → VIẾT → DUYỆT → THỬ → CHỌN**, chạy 02:00 mỗi đêm cho từng page.
> Nguyên tắc bất di bất dịch: **AI đề xuất, người quyết định, số liệu phân thắng bại.**

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   ▼                                                          │
[M15 MỔ]      gom hội thoại 24h → tách rổ CHỐT / MẤT          │
   │          tìm câu nào dẫn tới đơn, câu nào làm khách im   │
   ▼                                                          │
[M16 VIẾT]    sinh bản nháp kịch bản mới cho page             │
   │          (tone · greeting · salesPrompt · objections)     │
   ▼                                                          │
[NGƯỜI DUYỆT] marketer bấm Duyệt / Sửa / Bỏ  ← BẮT BUỘC       │
   │                                                          │
   ▼                                                          │
[M17 THỬ]     A/B 50/50 · 7 ngày · rollback tự động           │
   │                                                          │
   ▼                                                          │
[CHỌN]        bản thắng thành LIVE, bản thua vào sổ đen ──────┘
```

---

# M15 · Conversation Miner

## Mục đích
Biến hội thoại thật thành **bằng chứng có cấu trúc** về việc gì làm khách mua, việc gì làm khách bỏ đi.

## Chạy khi nào
02:00 mỗi đêm, tuần tự từng page (39 page, giãn 30s/page để không dồn tải).

## Đầu vào cho mỗi page
```
- Sổ AI 24h qua của page: reply / image / order / handoff / blocked
- Hội thoại đầy đủ kéo từ Pancake cho:
    · TOÀN BỘ hội thoại có đơn        (rổ THẮNG — thường 1–5 cái)
    · 15 hội thoại KHÔNG có đơn, chọn theo: nhiều lượt AI nhất
      (đây là nơi tốn tiền nhất mà không ra kết quả)
- Kịch bản đang LIVE (version + nội dung)
- Chỉ số page: closeRate, costPerOrder, replies/order
```

## Đầu ra — JSON có cấu trúc
```jsonc
{
  "pageId": "...", "date": "2026-08-12", "scriptVersion": 7,
  "sample": { "won": 3, "lost": 15 },
  "objections": [                      // xếp theo tần suất
    { "text": "ang mahal", "count": 11, "wonAfter": 1, "lostAfter": 10 }
  ],
  "killers": [                         // câu AI nói xong khách im luôn
    { "quote": "let me know po if interested", "count": 6 }
  ],
  "winners": [                         // câu xuất hiện trước khi chốt
    { "quote": "SET 1 po muna, or SET 2 na po para mas sulit?", "count": 3 }
  ],
  "dropStage": { "sau_bao_gia": 9, "sau_hoi_dia_chi": 4, "sau_gui_anh": 2 },
  "gaps": [                            // khách hỏi mà KB không có câu trả lời
    { "question": "halal ba ito?", "count": 4 }
  ],
  "langMix": { "tl": 0.6, "en": 0.3, "ar": 0.1 }
}
```

## Chi phí
1 lần gọi model rẻ/page/đêm, ~4k token vào + 800 ra ≈ **~110đ/page** → **~4.300đ/đêm**
cho 39 page ≈ **130.000đ/tháng**. So với 546.000đ/5 ngày hiện tại: không đáng kể.

## Ràng buộc
- **Không đưa PII vào prompt**: SĐT/địa chỉ/tên khách bị che (`[SĐT]`, `[ĐỊA CHỈ]`) trước khi gửi model.
- Page có <20 hội thoại trong 24h → **gộp 7 ngày** rồi mới mổ (mẫu quá nhỏ thì kết luận là nhiễu).
- Page có <5 hội thoại/tuần → bỏ qua, báo "chưa đủ dữ liệu".

## Tiêu chí nghiệm thu
- [ ] Chạy hết 39 page trong ≤30 phút
- [ ] Không PII nào lọt vào prompt (kiểm tự động 100 mẫu)
- [ ] Kết quả `objections` khớp ≥70% với đọc tay 20 hội thoại (nghiệm thu 1 lần lúc bàn giao)

## Phụ thuộc
M01, M02, Sổ AI

---

# M16 · Script Optimizer

## Mục đích
Từ báo cáo mổ của M15, **sinh bản nháp kịch bản mới** cho page.
> ⚠️ **Đính chính:** bản đầu ghi *"0/39 page có kịch bản riêng, M16 đi từ rỗng → có"*.
> SAI. Thực tế **37/38 page đã có** `greeting` + `salesPrompt` do marketer viết
> (890–1.908 token). M16 **không phải** khởi tạo — nó là **tinh chỉnh dựa trên số liệu**.
>
> Hệ quả với thiết kế: M16 **luôn chạy trên nền một kịch bản đang sống**, nên mọi đề xuất
> phải ở dạng **diff** (sửa/thêm/bớt một chỗ) kèm căn cứ, chứ không được viết đè cả bài.
> Kịch bản marketer viết là tài sản — đè mất là mất công sức của người ta.

## Đầu vào
- Báo cáo M15
- Kịch bản LIVE hiện tại
- **Sổ đen**: những thay đổi đã từng thua A/B (không đề xuất lại)
- Kịch bản của **page cùng ngành, cùng thị trường có closeRate cao nhất** (học lẫn nhau)

## Việc sinh ra
```
① tone         — giọng phù hợp ngành + thị trường
                 (bán vàng ≠ bán kem đánh răng; KSA ≠ PH)
② greeting     — câu chào riêng, KHÔNG chứa số giá
③ salesPrompt  — điểm mạnh sản phẩm + nỗi lo đặc thù của khách page này
④ objections[] — mỗi phản đối tần suất cao ở M15 → 1 góc gỡ cụ thể
⑤ fastLane     — câu trả lời 0 token cho hỏi giá/ship/cách đặt
⑥ gaps → đề xuất bổ sung KB (KHÔNG tự viết — báo marketer điền vào Sheet)
```

## Ràng buộc sinh (đưa thẳng vào prompt của M16)
```
- CHỈ được đổi giọng điệu và cách bán.
- TUYỆT ĐỐI không đụng: quy tắc tiền, PII, không-bịa, không-cam-kết,
  ngôn ngữ, chống đơn trùng.  Những cái đó nằm ở CORE, luôn thắng.
- Không được bịa khuyến mãi/khan hiếm không có trong KB.
- Không được viết số giá vào greeting/tone.
- Mỗi thay đổi phải kèm LÝ DO trích từ báo cáo M15 (câu nào, bao nhiêu ca).
- Tổng ≤ 1.200 token.
```

## Đổi MỘT thứ mỗi lần
Không đổi cả 5 trường cùng lúc — sẽ không biết cái nào có tác dụng. Mỗi đêm chọn
**một hạng mục ưu tiên cao nhất** theo thứ tự:
```
1. page chưa có kịch bản       → sinh đủ bộ (hiện chỉ còn 1 page: Light Step Care KSA)
2. page chưa có `tone`         → sinh riêng trường tone (37/38 page đang thiếu)
3. có "killer" tần suất cao    → sửa văn phong kết lượt
4. có phản đối chưa gỡ được    → thêm objection
5. dropStage tập trung 1 chỗ   → sửa đúng bước đó
6. còn lại                     → tinh chỉnh salesPrompt (dạng DIFF, không viết đè)
```

## Cửa duyệt của người — **không bỏ qua được**
```
┌─ Đề xuất cho: Glamora Jewelry ──────────── v3 → v4 (nháp) ─┐
│ 📉 Lý do: 273 lượt AI, 0 đơn, 30 ngày                      │
│                                                            │
│ THÊM cách gỡ phản đối "presyo/mahal"                       │
│   Cũ: (không có)                                           │
│   Mới: "Ma'am, 18K Saudi Gold po ito na may certificate    │
│         at code 750 — pawnable. COD po, tingnan niyo muna  │
│         bago magbayad. SET 1 or SET 2 po?"                 │
│   📎 Căn cứ: 11/15 hội thoại mất có "mahal"; 10/11 khách   │
│              im sau khi AI đáp bằng câu chung chung.        │
│                                                            │
│ [Duyệt & chạy A/B]  [Sửa rồi duyệt]  [Bỏ + ghi lý do]      │
└────────────────────────────────────────────────────────────┘
```
"Bỏ + ghi lý do" đưa đề xuất vào **sổ đen** → M16 không đề xuất lại kiểu đó.

## Tiêu chí nghiệm thu
- [ ] Sau 1 tuần chạy: **38/38 page đủ 3 trường** (`greeting` + `tone` + `salesPrompt`)
- [ ] Mọi đề xuất là **DIFF**, không phải viết đè toàn bộ kịch bản
- [ ] 0 đề xuất nào vi phạm ràng buộc (validator M02 chặn 100%)
- [ ] Mọi đề xuất đều kèm căn cứ trích từ hội thoại thật
- [ ] Đề xuất bị bỏ không xuất hiện lại

## Phụ thuộc
M02 (validator + lưu), M15, M17

---

# M17 · Experiment Engine

## Mục đích
Không có module này thì M16 là **tối ưu trong bóng tối** — đổi mà không biết tốt hơn hay tệ đi.

## Cách chia nhánh
```
Chia theo HASH(customerId) % 100 < 50  → nhánh B (bản mới)
                              ngược lại → nhánh A (bản đang LIVE)

Vì sao theo KHÁCH chứ không theo tin: một khách phải ở nguyên một nhánh
suốt hội thoại, không thì kết quả vô nghĩa.
```

## Ghi vết
Mỗi bản ghi `reply` trong Sổ AI mang `scriptVersion`. Đó là toàn bộ cơ chế đo —
không cần bảng riêng.

## Chỉ số so sánh (theo thứ tự ưu tiên)
| # | Chỉ số | Ý nghĩa |
|---|---|---|
| 1 | **closeRate** = đơn / khách | Cái duy nhất thật sự quan trọng |
| 2 | **costPerOrder** | Chốt cao mà đốt gấp 3 thì không thắng |
| 3 | replies/order | Hiệu suất hội thoại |
| 4 | tỷ lệ handoff | Bản mới có đẩy việc sang sale nhiều hơn không |
| 5 | tỷ lệ khách im sau lượt 1 | Bản mới có giữ chân tốt hơn không |

## Luật phân thắng bại
```
Chạy tối thiểu 7 ngày VÀ mỗi nhánh ≥100 khách.
   B thắng   : closeRate B > A ít nhất 20% tương đối
               VÀ costPerOrder B không cao hơn A quá 20%
   Hoà       : giữ A (bản cũ). Đổi mà không hơn thì đừng đổi.
   B thua    : rollback + ghi sổ đen
```

## Rollback tự động (không chờ hết 7 ngày)
```
Kích hoạt NGAY nếu bất kỳ điều nào xảy ra ở nhánh B:
  - closeRate tụt >30% so với A sau ≥48h và ≥50 khách
  - tỷ lệ tin bị M09 chặn tăng >3 lần
  - có bất kỳ tin nào vi phạm luật 2/8/9 của M09
  - costPerOrder tăng >2 lần
→ B về ARCHIVED, A thành LIVE lại, báo đỏ + WhatsApp
```

## Giới hạn đồng thời
Mỗi page **chỉ 1 thí nghiệm tại một thời điểm**. Đang chạy A/B thì M16 không sinh đề xuất mới cho page đó.

## Tiêu chí nghiệm thu
- [ ] Một khách luôn nằm đúng một nhánh suốt hội thoại (kiểm 200 ca)
- [ ] Dashboard hiện bảng so sánh A/B trực tiếp, làm mới mỗi giờ
- [ ] Bơm dữ liệu giả có bản B tệ → rollback tự động kích hoạt đúng
- [ ] Sổ đen được M16 đọc và tôn trọng

## Phụ thuộc
M02, M10 (ghi `scriptVersion`), M20

---

## Nhịp tổng thể của trục D

| Giờ | Việc |
|---|---|
| 02:00 | M15 mổ 39 page |
| 02:30 | M16 sinh đề xuất (chỉ cho page **không** đang chạy A/B) |
| 09:00 | Marketer nhận bản tin: đề xuất chờ duyệt + page thiếu kịch bản (M03) |
| Cả ngày | M17 gom số liệu A/B, rollback tự động nếu cần |
| Chủ nhật | Báo cáo tuần: page nào tiến, page nào lùi, bản nào thắng |

**Thời gian để hệ thống "giỏi lên" một bậc: 7 ngày/page** (chu kỳ A/B).
Với 39 page chạy song song → khoảng **39 thí nghiệm/tuần**.
