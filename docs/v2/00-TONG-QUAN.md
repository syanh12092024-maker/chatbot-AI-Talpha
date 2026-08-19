# AI Closer v2 — Kiến trúc trục chính

> Bản thiết kế lại dựa trên số liệu đo thật ngày 10/08/2026 (Sổ AI 8.900+ sự kiện,
> 60 hội thoại thật kéo từ Pancake, 10.900 tin đã kích hoạt AI).
> Xem `06-LO-TRINH.md` để biết thứ tự triển khai.

---

## 1. Vì sao phải làm lại

Năm con số buộc phải đổi kiến trúc, không phải chỉnh vặt:

| Đo được | Con số | Hệ quả |
|---|---|---|
| Lượt AI **đầu tiên** chiếm bao nhiêu hoá đơn | **69,3%** | Tiền đổ vào chỗ chốt 0,3% |
| Tin gọi AI dậy mà **không cần AI** | **57,8%** | Trả tiền model để nói "ok" |
| Hội thoại có AI **bị Botcake đâm ngang** | **75%** | Bot phá bot |
| Chênh lệch lượt/đơn giữa 2 page **cùng ngành, cùng độ dài kịch bản** | **12,7 lần** | Không ai đo được kịch bản nào tốt |
| Khách **AI trả lời rồi im luôn** | **52%** | Không có ai đuổi theo |

Kết luận: v1 đúng ở phần "AI biết nói", sai ở phần **"ai được nói, nói với ai, nói bao nhiêu, và làm sao biết nó nói có ăn tiền không"**.

### Đính chính (11/08/2026)
Bản đầu của tài liệu này ghi *"0/39 page có kịch bản riêng"*. **SAI** — do đọc nhầm một
tầng trong `kb-overrides.json` (`ov[page].tone` thay vì `ov[page].config.tone`). Số đúng:

| | |
|---|---|
| Page có `greeting` + `salesPrompt` | **37/38** |
| Page có `tone` | **1/38** ← ô này gần như không ai điền |
| Page trống hoàn toàn | **1** (Light Step Care KSA) |
| Kịch bản riêng chiếm | **1.391 token/lượt gọi** (dao động 890–1.908) |

Kịch bản page **đã được nạp đúng** vào prompt qua `getKBForPage().config` → `buildSystem()`
→ khối `# HƯỚNG DẪN RIÊNG CHO PAGE NÀY`. Vấn đề **không phải thiếu kịch bản**, mà là
**không ai đo được kịch bản nào ăn tiền** — xem §8 và M20/M17.

---

## 2. Bốn trục của v2

```
        ┌──────────────────────────────────────────────────┐
TRỤC A  │  NHẬP LIỆU        token Pancake → page → kịch bản │
        │                   Không có kịch bản = KHÔNG chạy   │
        └───────────────────────┬──────────────────────────┘
                                ▼
        ┌──────────────────────────────────────────────────┐
TRỤC B  │  LUỒNG CHAT       1 hội thoại = 1 chủ tại 1 lúc   │
        │                   Rẻ trước, đắt sau               │
        └───────────────────────┬──────────────────────────┘
                                ▼
        ┌──────────────────────────────────────────────────┐
TRỤC C  │  TĂNG CHỐT        ngân sách theo độ nóng          │
        │                   không khách nào bị bỏ rơi        │
        └───────────────────────┬──────────────────────────┘
                                ▼
        ┌──────────────────────────────────────────────────┐
TRỤC D  │  TỰ TIẾN HOÁ      mỗi đêm giỏi hơn hôm qua        │
        │                   đo được mới đổi                 │
        └──────────────────────────────────────────────────┘
```

---

## 3. Danh mục module

| Tầng | Mã | Module | File spec |
|---|---|---|---|
| **A · Nhập liệu** | M01 | Token & Page Registry | `01-TANG-NHAP-LIEU.md` |
| | M02 | Script Studio (kịch bản từng page) | `01-TANG-NHAP-LIEU.md` |
| | M03 | Readiness Gate & Alert | `01-TANG-NHAP-LIEU.md` |
| **B · Luồng chat** | M04 | Ingest (nhận tin) | `02-TANG-LUONG-CHAT.md` |
| | M05 | Conversation Owner (điều phối bot) | `02-TANG-LUONG-CHAT.md` |
| | M06 | Fast Lane (trả lời 0 token) | `02-TANG-LUONG-CHAT.md` |
| | M07 | Context Builder (hồ sơ khách nén) | `02-TANG-LUONG-CHAT.md` |
| | M08 | AI Closer | `02-TANG-LUONG-CHAT.md` |
| | M09 | Outbound Guard (kiểm duyệt tin ra) | `02-TANG-LUONG-CHAT.md` |
| | M10 | Dispatcher (gửi + ghi vết) | `02-TANG-LUONG-CHAT.md` |
| **C · Tăng chốt** | M11 | Lead Scoring & Turn Budget | `03-TANG-TANG-CHOT.md` |
| | M12 | Follow-up Engine | `03-TANG-TANG-CHOT.md` |
| | M13 | Post-Sale Router | `03-TANG-TANG-CHOT.md` |
| | M14 | Order Bridge | `03-TANG-TANG-CHOT.md` |
| **D · Tự tiến hoá** | M15 | Conversation Miner | `04-TANG-TU-TIEN-HOA.md` |
| | M16 | Script Optimizer | `04-TANG-TU-TIEN-HOA.md` |
| | M17 | Experiment Engine (A/B) | `04-TANG-TU-TIEN-HOA.md` |
| **E · Vận hành** | M18 | Ops Console | `05-TANG-VAN-HANH.md` |
| | M19 | Health Watchdog | `05-TANG-VAN-HANH.md` |
| | M20 | Unit Economics | `05-TANG-VAN-HANH.md` |

---

## 4. Vòng đời một hội thoại — máy trạng thái

**Luật vàng: một hội thoại chỉ có MỘT chủ tại một thời điểm.** Trạng thái lưu bền, đọc được từ cả Pancake (thẻ) lẫn hệ thống.

```
                        ┌─────────┐
       tin đầu ────────▶│  GREET  │  chủ: BOTCAKE   (0 token)
                        └────┬────┘  chào + ảnh + giá
                             │ khách nhắn tiếp
                             ▼
                        ┌─────────┐
                        │  QUALIFY│  chủ: FAST LANE (0 token)
                        └────┬────┘  hỏi giá/ship/cách đặt → template KB
                             │ tín hiệu mua thật
                             ▼
                        ┌─────────┐
                        │ SELLING │  chủ: AI CLOSER  ← Botcake BỊ KHOÁ
                        └────┬────┘  ngân sách lượt theo điểm nóng
             ┌───────────────┼───────────────┬──────────────┐
             ▼               ▼               ▼              ▼
       ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐
       │ CLOSING  │   │ HANDOFF   │   │  COLD    │   │POST_SALE │
       │đủ TT đơn │   │khiếu nại/ │   │khách im  │   │đã nhận   │
       │→ SALE    │   │hết ngân   │   │→FOLLOWUP │   │hàng      │
       │          │   │sách →SALE │   │          │   │→ CSKH    │
       └────┬─────┘   └───────────┘   └────┬─────┘   └──────────┘
            │                              │ khách trả lời
            ▼ đơn tạo                      └──────▶ quay lại SELLING
       ┌──────────┐
       │POST_SALE │  chủ: RTO BOT / SALE   ← AI + Botcake ĐỀU KHOÁ
       └──────────┘
```

### Bảng quyền nói

| Trạng thái | Botcake | Fast Lane | AI Closer | Follow-up | Sale | RTO bot |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `GREET` | ✅ | — | ⛔ | ⛔ | ✅ | ⛔ |
| `QUALIFY` | ⛔ | ✅ | ⛔ | ⛔ | ✅ | ⛔ |
| `SELLING` | ⛔ | ✅¹ | ✅ | ⛔ | ✅² | ⛔ |
| `CLOSING` | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| `HANDOFF` | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| `COLD` | ⛔ | ⛔ | ⛔ | ✅ | ✅ | ⛔ |
| `POST_SALE` | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ✅ |

¹ Fast Lane vẫn chặn được tin rác (sticker, "ok") ngay cả khi đang SELLING — tiết kiệm lượt AI.
² Sale nói là chiếm quyền ngay: chuyển `HANDOFF`, AI im vĩnh viễn cho hội thoại đó.

---

## 5. Luồng một tin nhắn (v2)

```
Tin khách
   │
   ▼
[M04 Ingest]  webhook Pancake (fallback poll) · debounce thích ứng 5–20s
   │
   ▼
[M05 Owner]   đọc trạng thái → ai được nói? ── không phải AI ──▶ DỪNG
   │  AI được nói
   ▼
[M06 FastLane] sticker/START/"ok"/chào  ──▶ template hoặc IM   (0 token)
   │           hỏi giá/ship/cách đặt     ──▶ template dựng từ KB (0 token)
   │  cần AI thật
   ▼
[M11 Budget]  điểm nóng → còn ngân sách lượt? ── hết ──▶ HANDOFF
   │
   ▼
[M07 Context] hồ sơ khách nén (~150 tok) + 6 tin gần nhất
   │
   ▼
[M08 Closer]  LLM + tools (get_price · send_image · create_order · handoff)
   │
   ▼
[M09 Guard]   chặn tin rỗng / sai giá / quá dài / lộ tiếng Việt / trùng
   │
   ▼
[M10 Dispatch] gửi Pancake · gắn thẻ · mark unread · ghi Sổ AI (+ promptVersion)
```

**So với v1:** thêm M05 (chống bot đâm nhau), M06 (chặn 58% tin vô ích), M09 (kiểm duyệt),
bỏ hẳn `classifier.js` (gộp vào M06 + để closer tự gọi `handoff_human`).

---

## 6. Mô hình dữ liệu

### 6.1 `pages.json` — sổ cái page (M01)
```jsonc
{
  "1209280405604866": {
    "name": "Kreain Nature PH - Ksa",
    "market": "KSA", "category": "Chăm sóc cơ thể",
    "tokenIdx": 0,                    // token Pancake nào phủ page này
    "posShopId": "123", "posApiKey": "***",
    "tags": { "ai": "AI Chăm", "order": "AI Chốt", "handoff": "AI back Sale" },
    "tagsVerified": true,             // 3 thẻ đã tồn tại trên page chưa
    "botcakeManaged": true,           // Botcake có đang chạy trên page này không
    "aiEnabled": true,
    "readiness": "READY",             // READY | MISSING_SCRIPT | MISSING_TAGS | MISSING_POS
    "marketer": "Ngọc"                // ai chịu trách nhiệm kịch bản
  }
}
```

### 6.2 `scripts/<pageId>.json` — kịch bản page (M02)
```jsonc
{
  "version": 7,
  "status": "LIVE",                   // DRAFT | REVIEW | LIVE | ARCHIVED
  "updatedBy": "M16-optimizer",       // hoặc email marketer
  "updatedAt": "2026-08-12T02:00:00Z",
  "product": {                        // từ Google Sheet, M02 chỉ đọc
    "name": "...", "tiers": [{ "label": "SET 1", "qty": 3, "price": 99, "currency": "AED" }],
    "images": [{ "url": "...", "category": "san pham" }]
  },
  "tone": "Ấm áp, gọi 'sis/ma'am', dùng po/opo, tối đa 2 câu",
  "greeting": "Hello po! 😊 Ito po ang ...",
  "salesPrompt": "Điểm mạnh: ... Khách page này thường lo: ...",
  "objections": [
    { "trigger": "mahal|expensive|ang mahal", "angle": "bẻ nhỏ giá trị: 1 set dùng 2 tháng = 1,6 AED/ngày" },
    { "trigger": "peke|fake|original ba", "angle": "gửi ảnh chứng nhận + COD xem hàng rồi trả tiền" }
  ],
  "fastLane": {                       // câu trả lời 0 token (M06)
    "price":  "🎁 SET 1 (3pcs) — 99 AED\n🎁 SET 2 (6pcs) — 149 AED\n🚚 Free delivery, COD po.\nIlan po ang gusto niyo? 😊",
    "ship":   "2–5 working days po, free delivery, COD.",
    "howto":  "Send lang po ang Pangalan + Number + Address, tapos COD na po. 😊"
  },
  "metrics": { "replies": 1224, "orders": 22, "closeRate": 0.018, "costPerOrder": 7204 }
}
```

### 6.3 `conv-state.json` — trạng thái hội thoại (M05)
```jsonc
{
  "<convId>": {
    "state": "SELLING",
    "owner": "AI",                    // BOTCAKE | FASTLANE | AI | FOLLOWUP | SALE | RTO
    "since": 1786330283712,
    "score": 6,                       // điểm nóng (M11)
    "budget": { "used": 3, "max": 10 },
    "profile": {                      // hồ sơ nén (M07)
      "name": "Amy", "phone": true, "address": "Jeddah, District 1",
      "tier": "Buy1Get1 109 SAR", "imagesSent": ["san pham", "feedback"],
      "objections": ["gia"], "lastIntent": "cho_xac_nhan_cod"
    },
    "lastAiAt": 1786330283712,
    "followupSent": 0
  }
}
```

### 6.4 Sổ AI — thêm 3 trường
```jsonc
{ "t":…, "page":…, "cust":…, "type":"reply",
  "tin":…, "tout":…, "cread":…, "calls":…,
  "scriptVersion": 7,        // ← MỚI: bản kịch bản nào tạo ra tin này (M17)
  "lane": "AI",              // ← MỚI: FASTLANE | AI | FOLLOWUP
  "state": "SELLING"         // ← MỚI: trạng thái lúc trả lời
}
```
Ba trường này là điều kiện cần để M17 (A/B) và M20 (unit economics) hoạt động.
**Không có chúng thì M15–M17 không thể đo và toàn bộ trục D vô nghĩa.**

---

## 7. Ranh giới không được vượt

Ghi ở đây để mọi module tuân theo, không lặp lại trong từng spec:

1. **`HARD_RULES` luôn thắng.** Kịch bản page (kể cả bản do AI sinh ở M16) chỉ được
   đổi *giọng điệu và cách bán*. Không được đụng: quy tắc tiền, PII, không-bịa,
   không-cam-kết-vượt-thẩm-quyền, ngôn ngữ.
2. **Không xoá đơn Pancake** ở bất kỳ trạng thái nào.
3. **Local luôn `PANCAKE_READONLY=1`.**
4. **AI không bao giờ tự đẩy kịch bản lên production.** M16 sinh bản nháp → người duyệt.
5. **Không doạ khách, không dùng ký tự ẩn né trùng lặp.** M09 chặn cứng.
6. **Mọi điểm AI dừng phục vụ đều phải để lại vết** ở cả 3 nơi: Sổ AI, thẻ Pancake,
   ghi chú hồ sơ khách.

---

## 8. Mục tiêu số của v2

| Chỉ số | v1 (đo) | v2 (mục tiêu) |
|---|---|---|
| calls / lượt trả lời | 2,28 | ≤ 1,2 |
| token nạp / lượt | ~13.000 | ≤ 5.000 |
| chi phí / lượt | 133đ | ≤ 50đ |
| % ngân sách vào lượt 1 | 69,3% | ≤ 20% |
| tỷ lệ chốt | 2,0% | 4,0% |
| **chi phí / đơn** | **7.934đ** | **≤ 2.000đ** |
| độ trễ trả lời | 26–40s | ≤ 10s |
| hội thoại bị bot đâm nhau | 75% | 0% |
| page **đo được** kịch bản ăn tiền hay không | **0/38** | **38/38** |
| page có kịch bản (đủ 3 trường) | 1/38 | 38/38 |
