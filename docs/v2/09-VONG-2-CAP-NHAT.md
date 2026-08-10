# Vòng 2 — bản cập nhật sau khi vòng 1 xong

> Rà lại 11/08/2026. Vòng 1 đã gộp đủ 4 luồng vào `fix-images`; **196 test, 195 pass,
> 1 skip, 0 fail**. Bốn giả định của kế hoạch vòng 2 cũ đã thay đổi.

---

## 1. Bốn thứ đã đổi

### ① M04 (debounce thích ứng) — ĐÃ XONG, gỡ khỏi L5
Làm ngoài kế hoạch vì chủ dự án nêu trực tiếp. `src/turn-complete.js`, chốt **5s/15s**.
Nghiệm trên 1.354 tin khách thật: recall 53,3% → **83,2%**, chen ngang 86 → 31 ca,
độ trễ TB **12,0s** (cũ 20s cào bằng).

### ② API Botcake là CHỈ ĐỌC — L8 phải viết lại
Đã test thật trên page nháp `1194048433791745`:

| | Kết quả |
|---|---|
| Auth | header `access-token` (query `?access_token=` → 400) |
| Phạm vi key | **page-scoped** (JWT payload `{id: <pageId>}`) → 277 page = 277 key |
| Gọi từ local | **được**, HTTP 200 (khác Pancake lỗi 121 phải qua VPS) |
| `GET /keywords` | `{id, is_activated, flow_id}` — **không có chữ từ khoá, không có nội dung trả lời** |
| `GET /flows` | có `name`, Botcake tự đặt `"Có chứa <kw1>, <kw2>…"` → **lấy được từ khoá** |
| Nội dung flow | **KHÔNG endpoint nào trả về** (`/flows/{id}` lỗi, `?path=[]` là cây thư mục) |
| POST/PUT/PATCH/DELETE `/keywords` | **404 toàn bộ** — kể cả `v2` |
| `flows/send_flow` | tồn tại (400 "your params wrong") — chỉ KÍCH HOẠT flow có sẵn |

👉 **Ý "hệ thống tự soạn kịch bản cài vào Botcake" — API không cho.**
L8 chuyển thành: đọc → đối chiếu → **sinh nội dung cho người dán tay** → soi sai lệch.

Bằng chứng đối chiếu trên page nháp (5 luật đang bật):
```
how much, magkano, price      → TRÙNG Fast Lane tpl_price
how many days, when deliver   → TRÙNG Fast Lane tpl_ship
free delivery                 → TRÙNG Fast Lane tpl_ship
pawnable, real, saudi gold    → BỔ SUNG (Fast Lane không phủ)
don't have any money yet      → BỔ SUNG
```

### ③ M05 khoá 45% hội thoại — L6 phải giám sát, không phải "nice to have"
Đo mô phỏng production trên 60 hội thoại thật: **45% bị khoá `HANDOFF`** vì cho rằng
người thật đã tiếp quản. Sau khi vá (`our-messages.js` + mở dải ký tự ẩn + siết
`looksHuman`) thì phần lớn ca còn lại **đúng là sale gõ thật**, nhưng:

> **Sổ nhận diện template mới phủ 32,1% tin page.** 67,9% còn lại là vùng đoán.

L6 **bắt buộc** có cột "AI nhường / bị khoá 24h" theo page. Ngưỡng: `HANDOFF` > 15%
tổng hội thoại là nghi khoá oan.

### ④ Việc MỚI: tự học sổ template — vá đúng 67,9% vùng đoán
API Botcake **không** vá được vùng này (không đọc được nội dung flow). Và nguồn gây
nhiễu không chỉ Botcake — đo thật thấy 3 nguồn:

| Nguồn | Tỷ trọng mẫu lặp | API Botcake vá được? |
|---|---|---|
| Botcake bán tự động | ~7/19 | ✅ (nếu có nội dung — mà không có) |
| **Công cụ RTO thứ ba** | ~5/19 | ❌ không có API |
| **Tin hệ thống Facebook (tiếng Việt)** | 2/19 | ❌ |

Đường duy nhất: **học từ dữ liệu của chính mình**. Tín hiệu đã kiểm chứng —
tin lặp **nguyên văn qua ≥3 hội thoại khác nhau** VÀ **dài ≥40 ký tự** thì là template;
ngắn hơn là câu đệm người gõ (`"ok dear"` 7×, `"..."` 5× — bị loại đúng).

---

## 2. Vòng 2 sau khi sắp lại

| Luồng | Nội dung | Ngày | Đổi gì so với bản cũ |
|---|---|---|---|
| **L5** | M17 A/B → M12 Follow-up | 3,5 | **Gỡ M04** (đã xong). M20 đã có → M17 hết bị chặn |
| **L6** | M18 Ops Console · M19 đầy đủ · **giám sát khoá oan** | 4 | Thêm giám sát M05; tab Botcake nay có API thật để nạp |
| **L7** | M15 Miner · **tự học sổ template** · M14 Order Bridge | 5 | **Thêm tự học** — dùng chung đường ống đọc hội thoại với Miner |
| **L8** | **`botcake.js` chỉ đọc** · báo cáo trùng · bảng kịch bản 2 cột | 5 | Viết lại: bỏ phần tự ghi vào Botcake |

Vẫn **4 luồng song song**, ~5 ngày. Vòng 3 (L9 tự tiến hoá) giữ nguyên.

**Thứ tự gộp:** L6 → L7 → L5 → L8 *(L8 đụng `fast-lane.js` — file nóng nhất — nên gộp cuối)*

---

## 3. Quyền sở hữu file — cập nhật theo module vòng 1

| Luồng | SỞ HỮU | CẤM đụng |
|---|---|---|
| **L5** | `experiment.js`* · `followup.js`* · `scheduler-followup.js`* · `conv-state.js` | handler · pancake-poll · prompts · closer · kb · fast-lane · economics · turn-complete |
| **L6** | `admin-ops.js`* · `public/ops.html`* · `health.js`* · `llm-health.js` · `bot-registry.js` | handler · pancake-poll · prompts · closer · kb · fast-lane · economics |
| **L7** | `miner.js`* · `template-learner.js`* · `order-bridge.js`* · `admin-orders.js`* · `pancake-orders.js` · `scheduler-miner.js`* | handler · pancake-poll · prompts · closer · kb · fast-lane · admin-ops |
| **L8** | `botcake.js`* · `rule-store.js`* · `admin-rules.js`* · `public/rules.html`* · `fast-lane.js` · `kb.js` *(chỉ THÊM)* | handler · pancake-poll · prompts · closer · outbound-guard · miner |

`*` = file mới. Router riêng + trang HTML riêng, mỗi luồng chỉ thêm **1 dòng** mount
vào `admin.js` và **1 dòng** link vào `admin.html` (luật §3 của `08-SONG-SONG.md`).

⚠️ `bot-registry.js`: L6 sở hữu (UI quản lý mẫu), nhưng **L7 sinh mẫu mới** cho nó.
Thống nhất: L7 **chỉ ghi ra `botcake-templates.json`**, không sửa `bot-registry.js`.

---

## 4. Việc chỉ chủ dự án làm được — cập nhật

| # | Việc | Trạng thái |
|---|---|---|
| 1 | **Nạp tiền Kimi** | 🔴 bot vẫn đang chết |
| 2 | **Deploy** (qua L0) | 🔴 vòng 1 xong nhưng chưa chạy thật lần nào |
| 3 | ~~Điều kiện khoá thẻ Botcake~~ | ⬜ hạ xuống TUỲ CHỌN — AI đã tự nhường |
| 4 | **Gỡ tin doạ khách ở công cụ RTO** | 🔴 không nằm trong repo này |
| 5 | **Key Botcake cho page THẬT** | 🟠 mới có key page nháp; L8 cần ≥1 page thật để kiểm lại |
| 6 | **Tắt 3 luật Botcake trùng Fast Lane** | 🟠 làm tay, thử 1 page trước |

> ⚠️ Việc **2** đáng lo nhất: vòng 1 đẻ ra 8 module chưa module nào chạy trên khách thật.
> Mọi con số đều là replay. **Nên chạy L0 (gộp · deploy · theo dõi 48h) TRƯỚC vòng 2.**
