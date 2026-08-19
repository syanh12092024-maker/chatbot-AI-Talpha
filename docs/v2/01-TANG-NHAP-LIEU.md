# TRỤC A — Nhập liệu & cấu hình

> Đây là cửa vào duy nhất của hệ thống. Nguyên tắc: **page chưa đủ điều kiện thì
> không được chạy bot** — thà im còn hơn để AI bán bằng kịch bản rỗng.

---

# M01 · Token & Page Registry

## Mục đích
Nạp token Pancake → tự phát hiện page → dựng sổ cái `pages.json` → giữ token luôn sống.

## Đầu vào
- `PANCAKE_TOKEN` (token chính) + `PANCAKE_TOKENS_EXTRA` (phụ, phân cách dấu phẩy)
- Hoặc: thêm token qua dashboard (dán vào ô, bấm Kiểm tra)

## Đầu ra
- `pages.json` (schema ở `00-TONG-QUAN.md` §6.1)
- Sự kiện `page.discovered` / `page.lost` cho M03

## Logic
```
1. Với MỖI token, theo thứ tự trong .env:
     GET /pages  →  categorized.activated
     Ghi lại: token index nào phủ page nào
2. GỘP danh sách page từ mọi token (một page có thể do nhiều token phủ)
3. Với mỗi page, chọn token ƯU TIÊN = token đầu tiên trong .env còn quyền
     Lỗi 103/105/121 → đánh dấu token đó mất quyền với page này, chuyển token kế
4. Với mỗi page, thử map shop POS:
     tra pancake-shops.json theo tên page → lấy shop_id + api_key
     không map được → readiness = MISSING_POS
5. Kiểm tra 3 thẻ Pancake bắt buộc có tồn tại trên page không:
     'AI Chăm' · 'AI Chốt' · 'AI back Sale'
     thiếu → readiness = MISSING_TAGS, KHÔNG tự tạo (quyền của chủ shop)
6. Sinh page_access_token (public_api/v1) cho tính năng mark-unread, cache bền
7. Lặp lại mỗi 10 phút
```

## Quy tắc failover token
- **Thứ tự trong `.env` = thứ tự ưu tiên.** Token chính phải phủ nhiều page bật AI nhất.
- Token trả 401/403 → đánh dấu `dead`, cảnh báo đỏ ngay (M19), **không tự xoá**.
- Một page mất hết token → `readiness = NO_TOKEN`, tự tắt AI page đó, báo M03.

## Cấu hình
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PANCAKE_TOKEN` | — | Token chính |
| `PANCAKE_TOKENS_EXTRA` | — | Token phụ, phân cách `,` |
| `PAGE_REFRESH_MS` | 600000 | Chu kỳ làm mới danh sách page |

## Tiêu chí nghiệm thu
- [ ] Thêm 1 token mới qua dashboard → page mới xuất hiện trong ≤ 10 phút, không cần restart
- [ ] Rút token chính → mọi page nó phủ tự chuyển token phụ, không mất tin nào
- [ ] Page thiếu thẻ → hiện `MISSING_TAGS` trên Ops Console, AI **không** được bật
- [ ] `pages.json` không bao giờ chứa `api_key` dạng plaintext trong log

## Phụ thuộc
Không. Đây là module gốc.

---

# M02 · Script Studio — tạo/sửa kịch bản từng page

## Mục đích
Nơi duy nhất để tạo, sửa, duyệt, **phiên bản hoá** và **đo** kịch bản bán của từng page.

> ⚠️ **Cái ĐÃ CÓ (đừng làm lại):** ô nhập `greeting` / `tone` / `salesPrompt` trên
> dashboard, endpoint `POST /admin/api/kb/:pageId/config`, import file `.xlsx` kịch bản
> Pancake, lưu vào `kb-overrides.json`, nạp vào prompt qua `buildSystem()`.
> **37/38 page đã điền** `greeting` + `salesPrompt` (890–1.908 token mỗi page).
>
> **Cái CÒN THIẾU — đó mới là M02:**
> 1. **Phiên bản hoá** — sửa xong không quay lại được bản cũ, không biết ai sửa lúc nào
> 2. **Validator** — không có gì chặn kịch bản ghi sai giá / lọt tiếng Việt / hứa ngày giao
> 3. **Đo** — không cách nào biết kịch bản page A tốt hơn page B (xem §M20/M17)
> 4. `tone` mới có **1/38** page điền; 1 page trống hoàn toàn

## Đầu vào
- Google Sheet (sản phẩm, giá, ảnh) — đồng bộ 5 phút/lần, **chỉ đọc**
- Marketer nhập tay trên dashboard *(đã chạy)*
- Import file `.xlsx` kịch bản Pancake *(đã chạy — `POST /admin/api/import-script`)*
- Bản nháp do M16 sinh (đêm)

## Đầu ra
- `scripts/<pageId>.json` (schema ở `00-TONG-QUAN.md` §6.2)
- Sự kiện `script.published` (kèm version) cho M17

## Màn hình dashboard
```
┌─ Kịch bản: Kreain Nature PH - Ksa ──────────── v7 LIVE ─┐
│                                                          │
│ ① SẢN PHẨM (đồng bộ từ Sheet — chỉ đọc)                 │
│    Tên · Bảng giá theo gói · Ảnh (5 loại)      [Mở Sheet]│
│                                                          │
│ ② GIỌNG ĐIỆU            [textarea, gợi ý mẫu]  ⚠ trống  │
│ ③ CÂU CHÀO              [textarea]             ⚠ trống  │
│ ④ CÁCH BÁN / ĐIỂM MẠNH  [textarea]             ⚠ trống  │
│ ⑤ THƯ VIỆN PHẢN ĐỐI     [bảng: bắt gì → gỡ sao]         │
│ ⑥ CÂU TRẢ LỜI NHANH (0 token)                           │
│      hỏi giá  [___]   phí ship [___]   cách đặt [___]    │
│                                                          │
│ [Thử với 1 tin]  [Lưu nháp]  [Gửi duyệt]  [Xuất bản]     │
│                                                          │
│ Lịch sử: v7 LIVE (M16, 12/08) · v6 (Ngọc, 05/08) ↩ khôi phục│
└──────────────────────────────────────────────────────────┘
```

## Logic
```
LƯU:      status = DRAFT, version++, không ảnh hưởng production
GỬI DUYỆT: status = REVIEW, báo người duyệt
XUẤT BẢN:  chạy VALIDATOR (dưới) → pass → status = LIVE, bản LIVE cũ → ARCHIVED
           fail → chặn, hiện lỗi cụ thể
KHÔI PHỤC: clone bản cũ thành version mới, xuất bản ngay
```

## Validator (chặn cứng trước khi xuất bản)
| Luật | Vì sao |
|---|---|
| `greeting` không được chứa con số giá | Giá phải lấy từ KB/tool, tránh lệch khi đổi giá |
| `salesPrompt` không được chứa từ khoá ghi đè quy tắc cứng (`bỏ qua`, `không cần gọi tool`, `tự tính`) | Chống prompt injection từ chính kịch bản |
| `fastLane.price` phải khớp **đúng** bảng giá hiện tại | Chống lệch giá — lỗi hạng sống còn |
| Không chứa tiếng Việt trong các trường gửi khách | Nguyên tắc #1 |
| Không hứa ngày/giờ giao cụ thể | Nguyên tắc #11 |
| Tổng độ dài 3 trường ≤ 2.000 token | Chống phình prompt |

## Cấu hình
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SCRIPT_REQUIRE_REVIEW` | 1 | Bắt buộc duyệt trước khi LIVE |
| `SCRIPT_MAX_TOKENS` | 2000 | Trần độ dài kịch bản page |

> ⚠️ **Đính chính 10/08/2026 — trần này bản đầu ghi 1.200, SAI.** Kịch bản thật đang
> chạy dài **890–1.908 token**, nên trần 1.200 sẽ chặn marketer xuất bản ngay cả khi
> họ chỉ sửa một chữ trên page vốn đã dài (validator chỉ chạy lúc XUẤT BẢN, nên các
> bản LIVE cũ vẫn chạy bình thường — lỗi chỉ lộ ra ở lần sửa đầu tiên). Đã nâng lên
> 2.000: mọi kịch bản hiện hành lọt qua, trên mức đó vẫn chặn cứng.
> Ước lượng token là `số ký tự / 3,2`; tiếng Việt dày token hơn tỉ lệ này nên con số
> thiên về ĐẾM THIẾU — đừng hạ trần mà không đo lại trên dữ liệu thật.

## Tiêu chí nghiệm thu
- [ ] Sửa kịch bản → có hiệu lực trong ≤ 60s, **không cần restart**
- [ ] Xuất bản kịch bản có giá lệch bảng giá → bị chặn, báo lỗi rõ
- [ ] "Thử với 1 tin" chạy trên bản nháp, **không gửi cho khách thật**
- [ ] Khôi phục v6 → tin tiếp theo dùng đúng v6, Sổ AI ghi `scriptVersion: 8` (clone)

## Phụ thuộc
M01 (biết page nào tồn tại)

---

# M03 · Readiness Gate & Alert

## Mục đích
**Chặn bot chạy trên page chưa sẵn sàng**, và **nhắc đúng người** bổ sung.
Đây là yêu cầu trực tiếp: *"thông báo khi có page chưa có kịch bản sale để mkter bổ sung trước khi chạy BOT"*.

## Thang trạng thái sẵn sàng
| readiness | Điều kiện | AI được bật? |
|---|---|---|
| `NO_TOKEN` | Không token nào phủ page | ⛔ |
| `MISSING_POS` | Chưa map shop POS + api_key | ⚠️ được (chỉ không tạo được đơn thật) |
| `MISSING_TAGS` | Thiếu 1 trong 3 thẻ Pancake | ⛔ |
| `MISSING_PRODUCT` | Sheet chưa có sản phẩm/giá/ảnh | ⛔ |
| **`MISSING_SCRIPT`** | **Thiếu `greeting` HOẶC `salesPrompt`** | **⛔** |
| `THIN_SCRIPT` | Thiếu `tone`, hoặc `salesPrompt` < 500 token | ⚠️ được + nhắc |
| `SCRIPT_STALE` | Kịch bản >30 ngày chưa đụng & closeRate < 1% | ⚠️ được + nhắc |
| `READY` | Đủ hết | ✅ |

> **Số ĐO THẬT 10/08/2026** — đếm trên `kb-overrides.json` kéo từ VPS 169.58.33.8
> (44 bản ghi page). Bản đầu ghi *"1 page MISSING_SCRIPT · 37 page THIN_SCRIPT"*, **lệch**:
>
> | | Đếm thật | Bản đầu ghi |
> |---|---|---|
> | `MISSING_SCRIPT` (trống hoàn toàn) | **3 page** | 1 page |
> | `THIN_SCRIPT` | **40 page** | 37 page |
> | Đủ cả `tone`+`greeting`+`salesPrompt` dày | **1 page** | — |
> | Có điền `tone` | 2/41 | 1/38 |
> | Có điền `fastLane*` | **0/41** | — |
> | Độ dài 3 trường | 351–1.847 token (trung vị 1.358) | 890–1.908 |
>
> Kết luận không đổi và càng đúng hơn: phải tách hai mức. Gộp chung là bản tin
> **43 dòng đỏ** mà không ai đọc, trong khi chỉ 3 dòng thật sự chặn bot.
> `fastLane*` trống toàn bộ vì trước M02 chưa có đường nào điền — không phải marketer quên.

## Logic
```
Chạy mỗi 15 phút + mỗi khi M01/M02 phát sự kiện:
  1. Tính readiness cho MỌI page
  2. Page chuyển sang trạng thái CHẶN → tự TẮT AI + ghi lý do
  3. Page chuyển READY → KHÔNG tự bật (người phải bấm — tránh bật nhầm)
  4. Gom nhóm theo 'marketer' rồi gửi thông báo
```

## Thông báo
**Kênh:** WhatsApp (đã có `wa.js`) + banner đỏ trên dashboard + email tuỳ chọn.

**Nhịp:** gộp theo ngày, **không spam từng page một**.
- 09:00 hằng ngày — bản tin "việc cần làm"
- Tức thì — chỉ khi page **đang chạy** rơi xuống trạng thái chặn

**Mẫu tin:**
```
🔴 3 page CHƯA CHẠY ĐƯỢC BOT — cần kịch bản (phụ trách: Ngọc)

1. Glamora Jewelry          — thiếu: cách bán, câu chào
2. Meco Jewelry Kuwait      — thiếu: cách bán
3. Perfect Skin KSA         — thiếu: sản phẩm trên Sheet

⚠️ 2 page kịch bản CŨ, chốt kém (>30 ngày, <1%)
   Royal Birthstone Jewelry · Key Jewelry Saudi

👉 Bổ sung tại: <link>/admin#/scripts
Bot sẽ tự chạy sau khi kịch bản được duyệt.
```

## Bảng phân công
Cột `marketer` lấy từ Google Sheet (đã có sẵn cột "Tên MKT"). Không map được → gửi nhóm chung.

## Cấu hình
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `READINESS_DIGEST_AT` | `09:00` | Giờ gửi bản tin ngày |
| `READINESS_ALERT_WA` | — | Số WhatsApp nhận cảnh báo tức thì |
| `SCRIPT_STALE_DAYS` | 30 | Ngưỡng coi kịch bản là cũ |

## Tiêu chí nghiệm thu
- [ ] Bật AI cho page thiếu `salesPrompt` → **bị từ chối**, hiện đúng lý do
- [ ] Xoá 1 thẻ Pancake trên page đang chạy → AI tự tắt trong ≤15 phút + có cảnh báo tức thì
- [ ] Bản tin 09:00 gộp đúng theo marketer, không gửi trùng trong ngày
- [ ] Điền đủ kịch bản → page hiện `READY`, **không** tự bật AI

## Phụ thuộc
M01, M02
