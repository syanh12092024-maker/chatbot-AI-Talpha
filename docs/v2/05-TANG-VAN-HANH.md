# TRỤC E — Vận hành & đo lường

---

# M18 · Ops Console

## Mục đích
Nơi duy nhất nhìn thấy toàn cảnh **token → page → kịch bản → Botcake → Pancake → đơn**.
Hiện tại phần Botcake là vùng mù hoàn toàn — không ai biết kịch bản từ khoá nào đang chạy,
và đó là nguyên nhân của 75% va chạm.

## Màn hình chính — bảng page
```
Page                          AI   Sẵn sàng    Botcake  Thẻ  POS  Chốt   đ/đơn   Cảnh báo
────────────────────────────────────────────────────────────────────────────────────────
Kreain Nature PH - Ksa        ✅   READY       🔒 khoá  ✅   ✅   1,8%   7.204   —
Mint Breeze KSA               ✅   READY       🔒 khoá  ✅   ✅   1,6%   7.690   —
Glamora Jewelry               ⛔   MISS_SCRIPT ⚠️ tự do ✅   ✅   0,0%   —       thiếu cách bán
Royal Birthstone Jewelry      ✅   STALE       ⚠️ tự do ✅   ❌   0,2%  58.123   💸 lỗ nặng
Perfect Skin KSA              ⛔   MISS_PRODUCT —       ❌   ❌   —      —       Sheet trống
```

## Tab Botcake — quản lý luồng lai
Đây là chỗ kiểm soát cái luồng cũ (Botcake bắt từ khoá) sống chung với AI:

| Cột | Nội dung |
|---|---|
| Kịch bản từ khoá đang bật | Nạp danh sách + template, dán tay hoặc import |
| Điều kiện khoá đã đặt chưa | ✅ nếu kịch bản có điều kiện *"không chạy khi có thẻ AI Chăm"* |
| Va chạm 24h | Số lần template Botcake xuất hiện **trong phiên AI** |
| Trùng nội dung với Fast Lane | Cảnh báo nếu Botcake và M06 cùng trả lời một ý định |
| Hành động | `[Xem hướng dẫn khoá]` `[Đánh dấu đã khoá]` `[Test]` |

> Danh sách template Botcake nạp vào đây còn được **M07 dùng để lọc rác khỏi lịch sử**
> và **M05 dùng để phân biệt người thật với bot**. Đây không phải màn hình trang trí.

## Tab Token
| Token | Phủ bao nhiêu page | Page bật AI | Trạng thái | Lỗi gần nhất |
|---|---|---|---|---|
| #1 (chính) | 210 | 28 | 🟢 sống | — |
| #2 | 95 | 8 | 🟢 sống | — |
| #3 | 40 | 3 | 🔴 chết | 401 lúc 09/08 |

Kèm cảnh báo: *"Token #1 chỉ phủ 28/39 page bật AI. Cân nhắc đổi thứ tự trong `.env` —
thứ tự = thứ tự failover."*

## Tab Tin bị chặn (M09)
Danh sách tin bị Outbound Guard chặn, nhóm theo luật vi phạm. Đây là chỗ phát hiện
sớm việc kịch bản mới sinh ra hành vi xấu.

## Tiêu chí nghiệm thu
- [ ] Nhìn 1 màn hình biết được page nào **không** chạy được và **vì sao**
- [ ] Số va chạm Botcake hiện đúng, đối chiếu được bằng tay
- [ ] Đổi trạng thái AI/Botcake ngay trên bảng, có hiệu lực ≤60s

## Phụ thuộc
M01, M02, M03, M05, M09, M20

---

# M19 · Health Watchdog

## Mục đích
Bot đã **chết 2 ngày** (09–10/08/2026) vì tài khoản Kimi hết tiền, mà `systemctl` vẫn
`active`, dashboard vẫn xanh, và hệ thống âm thầm đẩy **2.652 khách** vào hàng chờ sale
với lý do "lỗi kỹ thuật". Module này tồn tại để chuyện đó không lặp lại.

## Các chỉ số canh

| Chỉ số | Ngưỡng báo động | Mức |
|---|---|---|
| Lỗi 401/402/429 từ LLM | >10 lần / 5 phút | 🔴 **DỪNG HỆ THỐNG** + WhatsApp |
| Chuỗi `insufficient balance` | ≥1 lần | 🔴 báo ngay |
| Tin AI gửi trong 1h qua | = 0 trong khung 08:00–22:00 | 🔴 |
| Handoff `kind=error` | >50 / giờ | 🔴 |
| Page đang backoff | >5 page cùng lúc | 🟠 |
| Token Pancake chết | ≥1 | 🟠 |
| Tỷ lệ tin bị M09 chặn | >5% | 🟠 |
| closeRate toàn hệ thống | tụt >40% so với 7 ngày trước | 🟠 |
| Sổ AI không có bản ghi mới | >30 phút trong giờ cao điểm | 🔴 |

## Hành vi khi 🔴
```
1. Ghi cảnh báo đỏ lên dashboard (banner + pill)
2. Gửi WhatsApp cho chủ + trực kỹ thuật
3. Với lỗi hết tiền / hết quyền LLM:
     → DỪNG toàn bộ vòng xử lý (không đẩy khách vào hàng chờ hàng loạt)
     → giữ nguyên trạng thái hội thoại để khi nạp tiền là chạy tiếp
     → KHÔNG spam handoff 'lỗi kỹ thuật' (v1 tạo 2.652 cái vô nghĩa)
4. Tự thử lại mỗi 5 phút, sống lại thì tự chạy tiếp + báo xanh
```

## Kiểm tra sống định kỳ
Mỗi 10 phút: gọi LLM 1 tin siêu ngắn (~20 token, ~1đ) để xác nhận credit còn.
Chi phí: ~4.000đ/tháng. Rẻ hơn 2 ngày chết vô số lần.

## Tiêu chí nghiệm thu
- [ ] Rút API key → cảnh báo đỏ + WhatsApp trong ≤5 phút
- [ ] Trong lúc lỗi LLM: **0** handoff `kind=error` được tạo
- [ ] Nạp lại credit → hệ thống tự chạy tiếp, không cần restart tay
- [ ] Báo cáo sức khoẻ hằng ngày 09:00 kể cả khi mọi thứ bình thường

## Phụ thuộc
M10, M03 (kênh thông báo)

---

# M20 · Unit Economics

## Mục đích
Trả lời được, bất cứ lúc nào: **"page nào lãi, page nào lỗ, và vì sao"** — cắt theo
page × kịch bản × nhánh A/B × lane.

## Chỉ số cốt lõi
```
chi phí/đơn   = (tin×giá_in + cread×giá_cache + tout×giá_out) / số đơn
lượt/đơn      = số lượt AI / số đơn
chốt          = số đơn / số khách
% Fast Lane   = tin xử lý 0 token / tổng tin
% ngân sách lượt 1 = chi phí lượt AI đầu / tổng chi phí   ← chỉ số sức khoẻ v2
```

## Đã đo trên Sổ AI THẬT (bản kéo từ VPS 10/08/2026 · 15.970 dòng · 22/07→10/08)
Tổng khớp `/admin/api/token-cost` **lệch 0%**: 9.036 lượt · 4.913 khách · 151 đơn ·
515.852đ · 7.502đ/đơn · 59,8 lượt/đơn · chốt 3,1% · **ngân sách lượt-1 = 69,7%**
(mục tiêu ≤20%). 46 cảnh báo bắn: 2 🔴 nhiều lượt-0 đơn · 33 rò lượt-1 · 5 lỗ · 6 lượt/đơn cao.

Ba điều tài liệu/prompt ghi chưa đúng với dữ liệu thật, đã kiểm chứng:
1. **`lane` và `state` "đã có"** — có trong CODE (`pancake-poll.js`) nhưng **0/9.036** bản ghi
   production có hai trường này, vì nhánh nền `fix-images` chưa deploy. Mọi số cắt theo lane
   chỉ đúng từ lần deploy tới.
2. **`% Fast Lane` không đo đủ được từ Sổ AI.** `pancake-poll.js` có `if (!reply) return;`
   đặt TRƯỚC chỗ ghi sổ, nên 5 nhánh Fast Lane im lặng (`silent_*`) không đẻ dòng sổ nào —
   đúng những lượt rẻ nhất lại vô hình. Con số hiện là **cận dưới**. Sửa được bằng cách ghi
   sổ cả lượt im lặng, nhưng đó là file của luồng khác (08-SONG-SONG §3).
3. **`scriptVersion`** hiện `(chưa ghi)` trên toàn bộ sổ cũ — chỉ có từ lần deploy tới; cắt
   theo kịch bản chỉ có nghĩa với dữ liệu mới, không hồi tố được.

## Ngưỡng cảnh báo tự động
| Điều kiện | Hành động |
|---|---|
| chi phí/đơn > 20.000đ, ≥100 lượt | 🟠 đề xuất **tắt AI** page đó |
| ≥150 lượt AI, **0 đơn** | 🔴 tắt AI + báo marketer xem lại kịch bản |
| % ngân sách lượt 1 > 40% | 🟠 Fast Lane đang rò — kiểm M06 |
| lượt/đơn > 100 | 🟠 kịch bản không hợp ngành hàng |

Ba trong bốn ngưỡng này nếu có từ đầu đã tự bắt được nhóm trang sức
(Royal Birthstone 443 lượt/đơn · Glamora 273 lượt, 0 đơn).

## Báo cáo tuần (tự gửi WhatsApp)
```
📊 TUẦN 11–17/08

Đơn: 214 (+41%)   Chi phí: 612k   đ/đơn: 2.860 (−64%)
Fast Lane xử lý: 38% tin   Chốt: 3,8% (+1,8đ)

🏆 Tiến nhiều nhất
   Mint Breeze UAE      1,2% → 4,1%   (kịch bản v5, thắng A/B)
   Leg Glow Lab UAE     2,8% → 4,6%

📉 Lùi
   Lush Lips KSA        1,0% → 0,4%   → đã rollback v3

⚠️ Cần xem
   3 page thiếu kịch bản   ·   2 page lỗ (>20k/đơn)
   5 đề xuất chờ duyệt
```

## Tiêu chí nghiệm thu
- [ ] Mọi con số tra ngược được về Sổ AI bằng `recount()`
- [ ] Cắt được theo page × scriptVersion × lane
- [ ] Báo cáo tuần tự gửi, không cần ai bấm

## Phụ thuộc
M10 (Sổ AI có `scriptVersion`/`lane`/`state`), M17
