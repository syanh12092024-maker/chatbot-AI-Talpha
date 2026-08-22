# THIẾT KẾ LẠI · Hồ sơ 01 — ĐỐI CHIẾU & BẢNG HỎI XÁC NHẬN NGHIỆP VỤ

> Soạn ngày 22/08/2026. Hai nguồn đối chiếu:
> - **Hệ thống đang chạy**: `messenger-closer` (nhánh `main`, commit `d939920`) — đọc từ mã nguồn.
> - **Quy trình của marketer khác**: `QUY_TRINH_KICH_BAN_VA_PROMPT_BOTCAKE.md`.
>
> Mục đích: **chốt nghiệp vụ trước, thiết kế sau.** Trả lời xong Phần II mới dựng được kiến trúc mới.

---

## CÁCH DÙNG TÀI LIỆU NÀY

- Phần I đọc để nắm bức tranh — **không cần trả lời gì**.
- Phần II là bảng hỏi. Đánh dấu `[x]` vào ô chọn, hoặc ghi thẳng vào dòng `Khác`.
- Câu có **⭐** là **câu chặn**: chưa trả lời thì không thiết kế tiếp được. Có **31 câu chặn** trên tổng **85 câu**.
- Câu không có ⭐ trả lời sau cũng được, nhưng sẽ phải quay lại.
- Mỗi câu có 2 dòng phụ:
  - `Hiện tại:` — hệ thống bây giờ đang làm gì (để so, không phải để mặc định chọn).
  - `Ảnh hưởng:` — câu trả lời này sẽ đổi cái gì trong thiết kế.

---
---

# PHẦN I — ĐỐI CHIẾU HAI HỆ THỐNG

## 1. Hai tài liệu nói về hai nửa khác nhau của cùng một việc

```
   ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
   │  QUY_TRINH_..._BOTCAKE.md        │   │  messenger-closer                │
   │  THƯỢNG NGUỒN                    │   │  HẠ NGUỒN                        │
   │                                  │   │                                  │
   │  Sản phẩm → kịch bản → prompt    │──▶│  Prompt → chạy thật với khách    │
   │  Làm sao SINH RA con bot         │   │  Làm sao VẬN HÀNH con bot        │
   │                                  │   │                                  │
   │  6 chặng · 4 nguyên tắc          │   │  63 file · 20 module · 13.900 dòng│
   │  Chưa có mã nguồn                │   │  Đang chạy 39 page               │
   └──────────────────────────────────┘   └──────────────────────────────────┘
              ▲                                        │
              └────────── chặng 6 (đo & viết lại) ─────┘
```

**Không mâu thuẫn nhau về mục tiêu.** Chúng ghép được thành một vòng khép kín: quy trình kia sinh ra kịch bản, hệ thống này chạy kịch bản và trả về số liệu để viết bản kế tiếp.

**Nhưng chúng đâm nhau ở một chỗ rất nặng** — xem mục 5.

---

## 2. Bản đồ 6 chặng ↔ module đang có

| Chặng (doc Botcake) | Hệ thống hiện tại có gì | Mức độ |
|---|---|---|
| **1 · Thu liệu** | `miner.js` (M15) kéo hội thoại thật từ Pancake, mổ mỗi đêm 02:00 | 🟡 Có, nhưng chỉ 1 trong 2 cửa vào (hội thoại thật). Không có chỗ nạp tài liệu bán hàng |
| **2 · Rút chất** | `miner.js` rút template + điểm rơi phễu | 🔴 Yếu. Rút được "phễu rơi ở đâu" nhưng **không có ô nào chứa 5 chất liệu** của doc kia |
| **3 · Dựng kịch bản** | Script Studio (M02) — `admin-scripts.js` + `public/scripts.html` | 🟢 **Mạnh hơn tôi tưởng.** Có `DRAFT → REVIEW → PUBLISH`, validator chặn cứng lúc xuất bản, lịch sử phiên bản, khôi phục bản cũ (bản cũ vẫn phải qua validator lại) |
| **4 · Nạp vào máy** | `kb.js` + `kb-overrides.json` + `POST /scripts/:pageId/try` | 🟡 Có "thử 1 tin" không tác dụng phụ (không tool, không ra Pancake). **Nhưng không có bộ ca test cố định** — thử tay từng tin |
| **5 · Chạy có kiểm soát** | Readiness Gate (M03) + `ai-enabled.json` + Health Watchdog (M19) | 🟢 Có. Cửa kiểm chặn bật AI khi thiếu kịch bản; watchdog canh 9 chỉ số, bắn WhatsApp |
| **6 · Đo & viết lại** | Sổ AI + `stats.js` + Unit Economics (M20) + A/B Engine (M17) | 🟢 Có đủ hạ tầng đo |

**Kết luận chặng:** hệ thống hiện tại **mạnh ở chặng 3, 5, 6** và **yếu ở chặng 1, 2, 4** — đúng phần mà quy trình của marketer kia làm tốt. Ghép vào là bù được cho nhau.

---

## 3. Bốn nguyên tắc — hệ thống hiện tại đạt tới đâu

| # | Nguyên tắc (doc Botcake) | Hệ thống hiện tại |
|---|---|---|
| 1 | *Bản đầu là bản thu dữ liệu, không phải bản đúng* | 🟢 Đồng thuận. Có A/B Engine + Miner để viết lại từ dữ liệu thật |
| 2 | *Viết cho người trước, cho máy sau* | 🔴 **Chưa có.** Script Studio lưu thẳng `greeting` + `salesPrompt` — tức là **bản cho máy**. Không có tầng "bản tiếng Việt cho team đọc và cãi" |
| 3 | *Việc gì máy canh được thì không để người canh* | 🟢 Đồng thuận mạnh. Watchdog canh 9 thứ, tự bắn cảnh báo, sạch thì im |
| 4 | *Mỗi chặng một cửa kiểm* | 🟡 Có 2 cửa kiểm thật (validator lúc xuất bản, readiness lúc bật AI) nhưng **cửa kiểm rất mỏng**: readiness chỉ kiểm đúng 2 ô — có `greeting` chưa, có `salesPrompt` chưa |

---

## 4. Năm chất liệu của chặng 2 — chỗ nào chưa có nhà

Đây là phát hiện đáng chú ý nhất. `kb-overrides.json` của page **chỉ có 3 ô cấu hình**: `greeting`, `salesPrompt`, `tone`.

| Chất liệu (doc Botcake) | Có ô chứa trong hệ thống hiện tại? |
|---|---|
| **Động cơ** — thứ miễn phí khiến khách phải *làm* một việc | ❌ **KHÔNG CÓ.** Không có trường nào, không có chỗ nhập, không có cửa kiểm |
| Lời hứa trung tâm | ❌ Không có ô riêng — lẫn trong `salesPrompt` |
| Nhóm nhu cầu (mỗi nhóm một bằng chứng) | ❌ Không có |
| Khối giá | 🟢 Có — bảng giá/gói từ Google Sheet, `get_price`, validator kiểm giá |
| Bộ phản đối | 🟡 Có nhưng **dùng chung cho mọi page** (tab "Xử lý phản đối"), không có bản riêng từng sản phẩm |

> **Đây là khoảng trống lớn nhất.** Doc kia gọi *động cơ* là cửa kiểm khó nhất và hay bỏ trống nhất; hệ thống hiện tại thậm chí **chưa có ô để bỏ trống**. Page nào cũng mở màn bằng rao hàng vì kiến trúc không cho phép làm khác.

---

## 5. ⚠️ CHỖ ĐÂM NHAU: cả hai đội đều đang xây bot, trên cùng một inbox

Đây là câu hỏi thiết kế số 1 của cả dự án.

```
                        MỘT INBOX CỦA KHÁCH
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ┌─────────┐           ┌─────────────┐          ┌──────────┐
   │ BOTCAKE │           │  AI CLOSER  │          │   SALE   │
   │ (đội kia│           │ (hệ thống   │          │  gõ tay  │
   │  đang   │           │  này)       │          │          │
   │  xây)   │           │             │          │          │
   └─────────┘           └─────────────┘          └──────────┘
        │                       │
        └── 75% hội thoại có AI thì bị Botcake đâm ngang ──┘
                   (đo 10/08 trên 60 hội thoại thật)
```

**Hai đội đang giải cùng một bài bằng hai công cụ khác nhau, trên cùng những page.**

- Doc của marketer kia coi **Botcake là nền tảng** — kịch bản, prompt, ảnh, luật cứng đều nạp vào Botcake.
- Hệ thống `messenger-closer` coi **Botcake là đối thủ phải né** — cả module `conv-owner.js` (module được ghi chú là *"quan trọng nhất của v2"*) sinh ra chỉ để đoán xem Botcake sắp nói hay không mà nhường.

Và cách né hiện tại là **đoán mò**: tin ngắn đời thường (`"ok dear"`, `"pls wait"`) thì coi là người thật, tin dài nhiều emoji thì coi là template máy. Đoán sai một trong hai chiều đều mất tiền.

**Không thiết kế lại được hệ thống nếu chưa chốt: hai con bot này quan hệ với nhau thế nào.** Đây là câu hỏi B1–B5 ở Phần II.

---

## 6. Cái hệ thống hiện tại có mà quy trình kia chưa tính tới

Doc Botcake viết ở mức quy trình nên chưa chạm tới mấy bài toán chỉ lộ ra khi chạy thật với 39 page:

| Vấn đề | Hệ thống hiện tại giải bằng |
|---|---|
| Nhiều bot tranh một hội thoại | `conv-owner.js` — 7 trạng thái, bảng quyền nói |
| Gọi model tốn tiền | 4 lớp chặn trước khi tới model (classifier regex → Fast Lane → ngân sách lượt → context nén). 57,8% tin không cần tới model |
| Khách nhắn dồn 5 tin liền | Debounce 20s, gộp cụm, trả 1 lần |
| Meta chặn page vì spam (#2022) | Backoff: 2 lỗi liên tiếp → ngừng page 30 phút |
| Máy rò chữ kỹ thuật / bịa giá / hứa ngày giao | `outbound-guard.js` — chặn **10 nhóm lỗi** ở tin ra: lọt tiếng Việt, sai đơn vị tiền, bịa mã đơn, hứa ngày giao, bịa khan hiếm, đe doạ, checklist, lộ SĐT, ký tự ẩn, tin quá dài |
| Sale không biết AI đã làm gì | 3 dấu vết mỗi lần bàn giao: thẻ Pancake + ghi chú hồ sơ khách + dòng trong hàng chờ |
| Hội thoại trôi khỏi hàng chờ | Đánh dấu **chưa đọc** sau mỗi tin AI gửi |

Ngược lại, **3 thứ doc kia yêu cầu mà hệ thống hiện tại thiếu**:

1. **Siết thông số sinh chữ** — `closer.js` chỉ đặt `max_tokens: 400`, **không đặt `temperature`**. Model đang chạy ở mức ngẫu nhiên mặc định.
2. **Bộ ca test cố định** — có `/try` thử 1 tin thủ công, không có bộ ca chạy tự động (hỏi giá ngay · từ chối 2 lần · hỏi tới chỗ phải chuyển người · quét chữ kỹ thuật).
3. **Chỉ số "độc thoại"** — watchdog canh 9 thứ nhưng **không canh tỉ lệ khách nói / máy nói**. Doc kia nói đúng: cuộc nào máy nói một mình thì cuộc đó hỏng.

---
---

# PHẦN II — BẢNG HỎI XÁC NHẬN

**Phần II là bảng hỏi gốc (55 câu). Phần III bổ sung 3 khối mới (29 câu).**

---

## A · PHẠM VI HỆ THỐNG MỚI

**⭐ A1. Hệ thống mới quản tới đâu trong 6 chặng?**
- [ ] A. Cả 6 chặng — một dây chuyền từ "có sản phẩm mới" tới "bot đang chạy và tự viết lại"
- [ ] B. Chặng 3→6 — nhận kịch bản đã duyệt, lo nạp/chạy/đo. Chặng 1–2 làm ngoài (thủ công / công cụ khác)
- [ ] C. Chặng 4→6 — chỉ lo phần chạy thật. Kịch bản và prompt do người viết ở đâu đó rồi dán vào
- [ ] D. Khác: ______________________________________________
> `Hiện tại:` B (Script Studio nhận kịch bản, chạy, đo). Chặng 1–2 gần như không có.
> `Ảnh hưởng:` Quyết định hệ thống mới to hay nhỏ. Chọn A là gấp đôi phạm vi so với hiện tại.

**A2. Bao nhiêu page cần chạy AI trong 6–12 tháng tới?**
- [ ] A. Giữ nguyên quy mô hiện tại (~39 page)
- [ ] B. 100–200 page
- [ ] C. Toàn bộ ~478 page
- [ ] D. Thu hẹp lại, chỉ giữ page hiệu quả nhất. Số: ________
> `Hiện tại:` 39 page bật AI / ~478 page trong sổ cái.
> `Ảnh hưởng:` Quyết định có bỏ được kiến trúc poll 6 giây hay không. Trên 100 page thì poll không còn chạy nổi.

**A3. Ngoài Facebook Messenger còn kênh nào phải chạy?** *(chọn nhiều)*
- [ ] A. Chỉ Messenger
- [ ] B. + Instagram Direct
- [ ] C. + WhatsApp
- [ ] D. + Zalo / TikTok / khác: ________________
> `Hiện tại:` chỉ Messenger, qua Pancake.
> `Ảnh hưởng:` Có kênh thứ 2 thì bắt buộc phải tách lớp kênh (channel adapter) ngay từ đầu.

**A4. Bao nhiêu thị trường phải phục vụ?**
- [ ] A. Giữ 7 thị trường hiện tại (Saudi · UAE · Kuwait · Bahrain · Oman · Qatar · Taiwan)
- [ ] B. Thu về ít hơn: ________________
- [ ] C. Mở rộng thêm: ________________
> `Hiện tại:` 7 shop POS Pancake theo thị trường.

**A5. Hệ thống mới là viết lại từ đầu hay cải tạo dần?**
- [ ] A. Viết lại từ đầu, chạy song song rồi chuyển dần
- [ ] B. Cải tạo tại chỗ, đổi từng mảng, không dừng dịch vụ
- [ ] C. Giữ lõi chat hiện tại, chỉ làm lại tầng lưu trữ + điều phối
- [ ] D. Khác: ______________________________________________
> `Ảnh hưởng:` Quyết định lộ trình và mức rủi ro. Hệ thống đang phục vụ khách thật hằng ngày.

---

## B · QUAN HỆ VỚI BOTCAKE — phần quan trọng nhất

**⭐ B1. Sau khi thiết kế lại, Botcake và AI Closer quan hệ thế nào?**
- [ ] A. **Giữ như hiện tại** — Botcake giữ tin đầu (chào + ảnh + giá), AI tiếp quản từ tin thứ 2
- [ ] B. **AI làm tất** — page nào bật AI thì tắt hẳn Botcake trên page đó
- [ ] C. **Chia theo page** — page A do Botcake lo trọn, page B do AI lo trọn, không bao giờ chung page
- [ ] D. **Botcake là vỏ** — AI chạy như một khối bên trong Botcake, Botcake vẫn là nơi duy nhất nói với khách
- [ ] E. Khác: ______________________________________________
> `Hiện tại:` A, nhưng thực thi bằng cách **đoán** — 75% hội thoại vẫn bị đâm ngang.
> `Ảnh hưởng:` **Câu hỏi số 1 của cả dự án.** Chọn B hoặc C thì xoá được `conv-owner.js` — module phức tạp nhất hệ thống. Chọn A thì phải làm cho nó tin cậy được, và cần Botcake hợp tác.

**⭐ B2. Có quyền cấu hình / tắt Botcake trên các page đang chạy AI không?**
- [ ] A. Có, toàn quyền — muốn tắt page nào cũng được
- [ ] B. Có, nhưng phải qua marketer phụ trách page đó
- [ ] C. Không — Botcake do đội khác quản, không can thiệp được
- [ ] D. Chưa rõ, cần hỏi lại
> `Ảnh hưởng:` Nếu C thì phương án B1-B và B1-C bị loại, buộc phải sống chung và cần cơ chế bắt tay thật thay vì đoán.

**⭐ B3. Botcake và AI có thể **cùng đọc một nguồn trạng thái** không (thay vì đoán nhau)?**
- [ ] A. Có — Botcake đọc được thẻ Pancake, đặt điều kiện "có thẻ X thì im"
- [ ] B. Có — Botcake gọi được API/webhook để hỏi hệ thống trước khi nói
- [ ] C. Không — Botcake chỉ chạy theo luồng riêng, không đọc được gì bên ngoài
- [ ] D. Chưa ai kiểm chứng
> `Hiện tại:` Ghi chú trong mã nguồn nói *"chưa chắc Botcake đọc được thẻ Pancake"* → nên mới chọn cách đoán.
> `Ảnh hưởng:` Nếu A hoặc B thì bài toán va chạm giải được **triệt để**, không cần heuristic nữa.

**B4. Kịch bản của một page sẽ nằm ở đâu là nguồn chuẩn?**
- [ ] A. Trong Botcake — hệ thống AI đọc lại từ đó
- [ ] B. Trong Script Studio của hệ thống — Botcake không dùng nữa
- [ ] C. Một nguồn thứ ba (Google Sheet / file) — cả hai cùng đọc
- [ ] D. Hai nơi riêng, chấp nhận lệch
> `Hiện tại:` D — hai nơi riêng, không ai đồng bộ với ai.

**B5. Đội của marketer kia và đội hệ thống này có gộp quy trình làm một không?**
- [ ] A. Có — một quy trình chung, một sổ đăng ký chung
- [ ] B. Không — hai đội độc lập, chia page ra làm
- [ ] C. Gộp một phần: chung phần viết kịch bản, riêng phần chạy
- [ ] D. Chưa quyết
> `Ảnh hưởng:` Quyết định hệ thống mới có cần hỗ trợ nhiều người dùng, nhiều nhóm, phân quyền theo page hay không.

---

## C · NỘI DUNG & KỊCH BẢN

**⭐ C1. Có đưa khái niệm "ĐỘNG CƠ" vào hệ thống không?**
*(Động cơ = thứ miễn phí khiến khách phải làm một việc — gửi ảnh, nói ra một thứ. Không phải lời rao.)*
- [ ] A. Có — thành ô **bắt buộc**, page không có động cơ thì không được bật AI
- [ ] B. Có — ô tuỳ chọn, khuyến khích điền
- [ ] C. Không — thị trường COD Trung Đông không hợp kiểu mở màn này
- [ ] D. Thử trên vài page trước rồi quyết
> `Hiện tại:` Không có ô nào. Mọi page mở màn bằng rao hàng.
> `Ảnh hưởng:` Đây là thay đổi có thể đổi hẳn tỉ lệ chốt. Chọn A là thêm một cửa kiểm cứng vào Readiness Gate.

**C2. Bộ chất liệu chuẩn cho mỗi page gồm những ô nào?** *(chọn nhiều)*
- [ ] A. Động cơ
- [ ] B. Lời hứa trung tâm
- [ ] C. Nhóm nhu cầu (mỗi nhóm một bằng chứng riêng)
- [ ] D. Khối giá *(đã có)*
- [ ] E. Bộ phản đối **riêng từng page** *(hiện đang dùng chung)*
- [ ] F. Giữ nguyên 3 ô hiện tại (`greeting`, `salesPrompt`, `tone`), không thêm
> `Hiện tại:` chỉ D (dùng chung) + 3 ô cấu hình.

**⭐ C3. Có làm tầng "bản cho người đọc" tách khỏi "prompt cho máy" không?**
- [ ] A. Có — marketer viết tiếng Việt, team duyệt, hệ thống tự dịch thành prompt
- [ ] B. Có — nhưng dịch thủ công, hệ thống chỉ lưu cả hai bản
- [ ] C. Không — viết thẳng prompt như hiện tại, ai viết người đó chịu trách nhiệm
- [ ] D. Khác: ______________________________________________
> `Hiện tại:` C. Script Studio lưu thẳng `greeting` + `salesPrompt` = bản cho máy.
> `Ảnh hưởng:` Chọn A là thêm hẳn một tầng dịch (và một lần gọi model mỗi lần sửa kịch bản).

**C4. Cửa kiểm trước khi xuất bản kịch bản nên chặt tới đâu?** *(chọn nhiều)*
- [ ] A. Giữ như hiện tại — có `greeting` + `salesPrompt` + giá khớp bảng giá
- [ ] B. + Bắt buộc có động cơ
- [ ] C. + Bắt buộc chạy qua bộ ca test tự động, trượt là không cho xuất bản
- [ ] D. + Bắt buộc có người thứ hai duyệt (hiện có `SCRIPT_REQUIRE_REVIEW` nhưng tắt được)
- [ ] E. + Quét chữ kỹ thuật lọt vào phần máy đọc

**C5. Bộ ca test tối thiểu — chạy tự động cho mọi page?**
- [ ] A. Có, bắt buộc, trượt là chặn xuất bản
- [ ] B. Có, chạy được nhưng không chặn — chỉ cảnh báo
- [ ] C. Không cần, thử tay như hiện tại là đủ
> `Hiện tại:` C — có `/try` thử 1 tin thủ công.
> Nếu chọn A hoặc B, bộ ca gồm những gì? *(chọn nhiều)*
> - [ ] Hỏi giá ngay từ tin đầu
> - [ ] Từ chối 2 lần liên tiếp
> - [ ] Hỏi tới thứ bắt buộc phải chuyển người (khiếu nại / đổi trả / hoàn tiền)
> - [ ] Khách nói ngôn ngữ lạ
> - [ ] Khách đã có đơn rồi nhắn tiếp
> - [ ] Quét chữ kỹ thuật trong toàn bộ lời máy
> - [ ] Khác: ________________

**C6. Có siết `temperature` để máy bám kịch bản không?**
- [ ] A. Có — siết chặt, ưu tiên bám kịch bản, chấp nhận lời thoại đều đều
- [ ] B. Không — giữ tự nhiên như hiện tại, ưu tiên hội thoại "người" hơn
- [ ] C. Siết cho page mới, nới cho page đã ổn định
> `Hiện tại:` Không đặt `temperature` — đang chạy mặc định của nhà cung cấp.

**C7. Kịch bản có được A/B tự động không?**
- [ ] A. Có — hệ thống tự chia lưu lượng, tự kết luận, tự chọn bản thắng
- [ ] B. Có — tự chia và đo, nhưng người quyết bản nào thắng
- [ ] C. Không — mỗi lần chỉ chạy 1 bản
> `Hiện tại:` B (M17 Experiment Engine có sẵn).

---

## D · LUỒNG CHAT LÚC CHẠY THẬT

**⭐ D1. Khách đợi bao lâu là chấp nhận được?**
- [ ] A. ~30 giây như hiện tại — gộp cả cụm tin rồi trả một lần, quan trọng hơn là nhanh
- [ ] B. Dưới 10 giây
- [ ] C. Gần như tức thì (<3s), chấp nhận trả lời rời từng tin
- [ ] D. Tuỳ loại: hỏi giá thì tức thì, tin cần suy nghĩ thì chậm được
> `Hiện tại:` A — 6s poll + 20s chờ khách gõ xong + thời gian nhường Botcake.
> `Ảnh hưởng:` Chọn B/C thì bắt buộc bỏ poll, phải có webhook. Xem I2.

**D2. Trần lượt AI cho mỗi khách trong 24h?**
- [ ] A. Giữ 4 lượt
- [ ] B. Nâng lên: ______ lượt (để chạy đủ 3 lần mời chốt của nguyên tắc 14)
- [ ] C. Bỏ trần cứng — dùng ngân sách theo độ nóng của khách (đã có `lead-score.js`)
- [ ] D. Trần theo page, marketer tự chỉnh
> `Hiện tại:` A — trần 4, hạ từ 5 để tiết kiệm token.
> `Ảnh hưởng:` Trần 4 lượt thường tiêu 2 lượt cho chào + báo giá, nên khách từ chối muộn không đủ chỗ để mời chốt lại 3 lần như quy tắc yêu cầu. Đây là mâu thuẫn đang tồn tại trong hệ thống.

**D3. Fast Lane (trả lời bằng mẫu, 0 token) — giữ hay bỏ?**
- [ ] A. Giữ và mở rộng — càng nhiều câu trả được bằng mẫu càng tốt
- [ ] B. Giữ nguyên phạm vi hiện tại
- [ ] C. Bỏ — để model trả hết cho tự nhiên, chấp nhận tốn tiền
> `Hiện tại:` A/B — Fast Lane chặn phần lớn tin không cần model.

**D4. Khi model lỗi / hết tiền / nhà cung cấp chết thì làm gì?**
- [ ] A. Im lặng, đẩy hết sang sale (như hiện tại)
- [ ] B. Tự chuyển sang nhà cung cấp dự phòng
- [ ] C. Hạ xuống Fast Lane, chỉ trả câu mẫu
- [ ] D. Khác: ________________
> `Hiện tại:` A — bot **không tự failover** giữa Kimi và Anthropic. Ngày 06/08 đã đứng ~3 tiếng vì hết credit.

**D5. Có giữ 6 cửa im lặng hiện tại không?**
*(page tắt AI · page chưa có KB · nhường Botcake tin đầu · tin cuối là của page · spam ≥0.8 · sale đã tiếp quản)*
- [ ] A. Giữ cả 6
- [ ] B. Giữ nhưng gom về một chỗ, mỗi lần im phải ghi rõ lý do tra được
- [ ] C. Bỏ bớt: ________________
> `Hiện tại:` 6 cửa rải ở 4 file khác nhau. Hỏi "vì sao bot im với khách này" phải grep log.

**D6. Ngôn ngữ trả lời khách?**
- [ ] A. Giữ như hiện tại — mặc định Tagalog/English, khách nói tiếng gì đáp tiếng đó
- [ ] B. Khoá theo thị trường của page (page UAE thì luôn Ả Rập/Anh)
- [ ] C. Khác: ________________

**D7. Giọng điệu "kiểu Philippines" (po/opo) áp cho mọi thị trường?**
- [ ] A. Giữ — đang chạy tốt
- [ ] B. Tách theo thị trường: Trung Đông một giọng, Philippines một giọng
- [ ] C. Marketer tự đặt giọng cho từng page (ô `tone` đã có nhưng gần như không ai điền — 1/38 page)

**D8. Ảnh sản phẩm — ai quyết định gửi?**
- [ ] A. AI tự quyết theo ngữ cảnh (như hiện tại)
- [ ] B. Ép theo luật cứng: tin đầu luôn gửi bộ ảnh X
- [ ] C. Marketer cấu hình theo page
> `Hiện tại:` A. Đã có tiền lệ ép bằng code rồi phải gỡ vì hội thoại thành máy móc.

---

## E · CHỐT ĐƠN & BÀN GIAO

**⭐ E1. AI có được tự tạo đơn thật trong Pancake không?**
- [ ] A. Không, vĩnh viễn — AI chỉ ghi chú, người tạo đơn tay (như hiện tại)
- [ ] B. **Có, nhưng phải duyệt** — đơn vào hàng chờ, sale bấm 1 nút là tạo, không phải gõ lại
- [ ] C. Có, tự động hoàn toàn khi đủ điều kiện
- [ ] D. Tự động cho page đã tin cậy, duyệt cho page mới
> `Hiện tại:` A (`AUTO_CREATE_ORDER=0`, chủ dự án tắt 07/08). Code tạo đơn thật đã có sẵn.
> `Ảnh hưởng:` Đây là mắt xích thủ công cuối cùng. Chọn B là bỏ được phần lớn việc gõ tay mà vẫn giữ người chịu trách nhiệm.

**E2. Điều kiện tối thiểu để coi là "đã chốt"?**
- [ ] A. Tên + SĐT + Địa chỉ + Số lượng + xác nhận COD (như hiện tại)
- [ ] B. Bớt đi: ________________
- [ ] C. Thêm: ________________

**⭐ E3. Sau khi AI bàn giao, ai chịu trách nhiệm và trong bao lâu?**
- [ ] A. Sale trực Pancake, không cam kết thời gian
- [ ] B. Sale trực, cam kết trả lời trong ______ phút/giờ
- [ ] C. Có hàng chờ riêng, có người gác, quá hạn thì báo động
- [ ] D. Chưa có quy định
> `Hiện tại:` A. Bàn giao là **im lặng hoàn toàn** — AI không nói câu giữ chân nào, dựa vào việc hội thoại nằm nguyên trong hàng chờ chưa đọc.
> `Ảnh hưởng:` Nếu không có ai trực thì "bàn giao" thực chất là "bỏ rơi khách". Xem F1.

**E4. Khách đã có đơn rồi nhắn tiếp thì sao?**
- [ ] A. AI im hẳn, để sale lo (như hiện tại)
- [ ] B. AI được trả lời câu hỏi hậu bán (giao tới đâu, đổi trả) nhưng không chốt thêm
- [ ] C. AI được bán thêm
> `Hiện tại:` A/B — có Post-Sale Router (M13) nhưng bàn giao hậu bán cũng im lặng.

**E5. Follow-up khách đi lạnh — giữ không?**
- [ ] A. Có, tự động (đã có M12, chạy 15 phút/lần)
- [ ] B. Có nhưng chỉ gợi ý cho sale, người bấm gửi
- [ ] C. Không
> `Hiện tại:` A. Lưu ý: 52% khách được AI trả lời rồi im luôn.

**E6. RTO / chống bom hàng — có nằm trong phạm vi hệ thống mới không?**
- [ ] A. Có — lọc khách rủi ro trước khi tạo đơn
- [ ] B. Có — nhưng chỉ đo, không chặn
- [ ] C. Không — việc của bộ phận vận hành
> `Hiện tại:` C (README có ghi TODO "BigQuery logging lead_journey + RTO", chưa làm).

---

## F · NGƯỜI TRỰC & VẬN HÀNH

**⭐ F1. Thực tế hiện nay có ai trực inbox không?**
- [ ] A. Có, đủ 24/7
- [ ] B. Có, giờ hành chính VN
- [ ] C. Có, theo ca nhưng không phủ hết
- [ ] D. Không có ai trực cố định — sale check khi rảnh
> `Ảnh hưởng:` **Câu này đổi cả thiết kế.** Doc Botcake nói đúng: *"người trực là điều kiện, không phải tuỳ chọn"*. Nếu là D thì mọi cửa bàn giao đang đổ khách vào khoảng trống, và hệ thống mới phải tự xử nhiều hơn chứ không phải bàn giao nhiều hơn.

**F2. Sale có bao nhiêu người, chia theo gì?**
- Số người: ______ · Chia theo: [ ] thị trường [ ] page [ ] ca trực [ ] không chia
> `Ảnh hưởng:` Quyết định hàng chờ chia thế nào, ai thấy được cái gì.

**F3. Sale làm việc chủ yếu ở đâu?**
- [ ] A. Trong Pancake (như hiện tại)
- [ ] B. Trong dashboard của hệ thống
- [ ] C. Cả hai
> `Ảnh hưởng:` Nếu A thì mọi thứ hệ thống muốn nói với sale phải đi qua thẻ + ghi chú Pancake, không phải qua dashboard.

**F4. Cảnh báo hiện bắn vào WhatsApp — giữ không?**
- [ ] A. Giữ WhatsApp
- [ ] B. Chuyển sang: [ ] Telegram [ ] Slack [ ] Email [ ] khác ______
- [ ] C. Cả hai
> `Hiện tại:` WhatsApp qua thư viện Baileys, phiên đăng nhập hay rớt, phải quét mã lại.

**F5. Ai được bật/tắt AI cho một page?**
- [ ] A. Chỉ admin
- [ ] B. Marketer phụ trách page đó
- [ ] C. Ai có mật khẩu dashboard (như hiện tại)
- [ ] D. Tự động theo cửa kiểm — đủ điều kiện thì tự bật

---

## G · VAI TRÒ & PHÂN QUYỀN

**⭐ G1. Hệ thống mới cần mấy vai?**
- [ ] A. Giữ 1 tài khoản dùng chung như hiện tại
- [ ] B. 3 vai: Admin · Marketer · Sale
- [ ] C. 4 vai: + Quản lý (chỉ xem báo cáo)
- [ ] D. 5 vai: + Người duyệt kịch bản (tách khỏi người viết)
- [ ] E. Khác: ______________________________________________
> `Hiện tại:` A — **một mật khẩu Basic Auth mở toàn bộ ~113 endpoint**, không phân biệt được ai làm gì.

**⭐ G2. Marketer có bị giới hạn chỉ thấy page mình phụ trách không?**
- [ ] A. Có — chỉ thấy và sửa được page của mình
- [ ] B. Không — ai cũng thấy hết, tin nhau
- [ ] C. Thấy hết nhưng chỉ sửa được page mình
> `Hiện tại:` B. `pages.json` có sẵn trường `marketer` nhưng chưa dùng để phân quyền.

**G3. Có cần nhật ký thao tác (ai đổi gì, lúc nào) không?**
- [ ] A. Có, đầy đủ, tra ngược được
- [ ] B. Chỉ ghi việc quan trọng: xuất bản kịch bản, bật/tắt AI, đổi giá
- [ ] C. Không cần
> `Hiện tại:` Có một phần — kịch bản lưu `updatedBy` / `publishedBy`. Các thao tác khác không ghi.

**G4. Ai được xem hội thoại của khách?**
- [ ] A. Ai đăng nhập được đều xem hết (như hiện tại)
- [ ] B. Chỉ sale phụ trách + admin
- [ ] C. Che bớt thông tin cá nhân (SĐT, địa chỉ) với người không phận sự

**G5. Ai được quản token (Pancake, Meta, AI)?**
- [ ] A. Chỉ admin, và tách khỏi dashboard chính
- [ ] B. Như hiện tại — cùng dashboard, cùng mật khẩu
> `Hiện tại:` B. Dashboard có màn thêm/xoá token Pancake và token Meta.

---

## H · DỮ LIỆU & ĐO LƯỜNG

**⭐ H1. Chỉ số ra quyết định số 1 là gì?**
- [ ] A. Số đơn AI chốt
- [ ] B. Tỉ lệ chốt (đơn / tổng khách nhắn tới)
- [ ] C. Chi phí token trên mỗi đơn
- [ ] D. Doanh thu trên chi phí quảng cáo
- [ ] E. Khác: ________________
> `Ảnh hưởng:` Quyết định cả bộ đo và cách A/B kết luận thắng thua.

**H2. Bộ chỉ số cố định theo phễu — chốt những mục nào?** *(chọn nhiều)*
- [ ] A. Khách vào
- [ ] B. Bao nhiêu được trả lời
- [ ] C. Thời gian trả lời
- [ ] D. Bao nhiêu tới bước chốt
- [ ] E. Bao nhiêu ra đơn
- [ ] F. Tốn bao nhiêu lượt mỗi đơn
- [ ] G. **Tỉ lệ khách nói / máy nói** *(chỉ số "độc thoại" — hiện chưa có)*
- [ ] H. Tỉ lệ tin bị chặn ở cửa kiểm tin ra
- [ ] I. Chi phí token mỗi đơn

**⭐ H3. Có chấp nhận chuyển từ file JSON sang database thật không?**
- [ ] A. Có — chấp nhận một lần dừng dịch vụ ngắn để chuyển dữ liệu
- [ ] B. Có — nhưng phải chuyển dần, không được dừng
- [ ] C. Không — giữ file JSON cho đơn giản
> `Hiện tại:` ~15 file JSON, ghi đè cả file mỗi lần. Không transaction, không chạy được 2 tiến trình.

**H4. Lịch sử hội thoại giữ bao lâu?**
- [ ] A. Vĩnh viễn (như hiện tại — Sổ AI chỉ tăng, chưa từng dọn)
- [ ] B. ______ tháng, cũ hơn thì gói lại lưu trữ
- [ ] C. Chỉ giữ số liệu tổng hợp, xoá nội dung chat cũ
> `Hiện tại:` A. Sổ AI ~4,4 MB và tăng đều; mỗi tin nhắn phải quét lại file này để đếm lượt.

**H5. Dữ liệu khách hàng (SĐT, địa chỉ) có ràng buộc pháp lý gì không?**
- [ ] A. Không có ràng buộc đặc biệt
- [ ] B. Có — theo quy định thị trường: ________________
- [ ] C. Chưa rà soát
> `Ảnh hưởng:` Có ràng buộc thì phải tính chỗ lưu, thời hạn giữ, quyền xoá ngay từ thiết kế.

**H6. Có cần đối chiếu số liệu hệ thống với số liệu Pancake/kế toán không?**
- [ ] A. Có, tự động, định kỳ
- [ ] B. Có, khi cần thì đối chiếu tay
- [ ] C. Không
> `Hiện tại:` B — có nút "Đối chiếu Sổ AI" và hàm `recount()`.

---

## I · HẠ TẦNG & RÀNG BUỘC

**⭐ I1. Có tiếp tục phụ thuộc Pancake làm kênh truyền tin chính không?**
- [ ] A. Có — Pancake là chuẩn công ty, không đổi
- [ ] B. Muốn tách dần — dùng Meta API trực tiếp khi lấy được Advanced Access
- [ ] C. Làm kiến trúc thay được, chạy song song cả hai
- [ ] D. Chưa quyết
> `Hiện tại:` A bắt buộc. App Meta đang ở Standard Access, `/conversations` bị từ chối trên mọi page. Kênh Meta đã code xong nằm ở nhánh `meta-channel` nhưng chưa deploy được.

**⭐ I2. Có kế hoạch xin Advanced Access của Meta không?**
- [ ] A. Có, đang làm — dự kiến xong: ________________
- [ ] B. Có ý định nhưng chưa bắt đầu
- [ ] C. Không — chấp nhận đi qua Pancake vĩnh viễn
- [ ] D. Đã thử và bị từ chối
> `Ảnh hưởng:` Quyết định có bỏ được vòng poll 6 giây hay không — tức là quyết định luôn A2 (scale) và D1 (độ trễ).

**I3. Hệ thống mới chạy ở đâu?**
- [ ] A. Vẫn VPS Contabo hiện tại (dùng chung với 4 app khác)
- [ ] B. VPS riêng cho hệ thống này
- [ ] C. Cloud có quản lý (AWS/GCP/…)
- [ ] D. Chưa quyết
> `Hiện tại:` A. Đã từng deploy đè cổng làm app khác crash-loop.

**I4. Nhà cung cấp AI?**
- [ ] A. Giữ Kimi
- [ ] B. Về Claude
- [ ] C. Hai nhà, tự chuyển khi một bên chết
- [ ] D. Theo giá — rẻ nhất tại thời điểm đó
> `Hiện tại:` A (`kimi-k2.6`), đổi từ Claude khi tài khoản hết credit. **Không tự failover.**

**I5. Ngân sách token mỗi tháng có trần không?**
- [ ] A. Có, trần: ________________
- [ ] B. Không, miễn ra đơn
- [ ] C. Có trần mềm, vượt thì báo động
> `Ảnh hưởng:` Quyết định độ hung hăng của các lớp chặn trước model và trần lượt ở D2.

---

## J · ƯU TIÊN

**⭐ J1. Ba việc phải sửa trước tiên?** *(đánh số 1-2-3)*
- [ ] ___ Tầng lưu trữ (bỏ file JSON, dùng database)
- [ ] ___ Tầng điều phối (chốt quan hệ với Botcake, gom quyền nói về một chỗ)
- [ ] ___ Phân quyền theo vai
- [ ] ___ Bỏ poll, chuyển sang webhook
- [ ] ___ Bổ sung chặng 1–2 (thu liệu, rút chất, động cơ)
- [ ] ___ Tự tạo đơn có duyệt
- [ ] ___ Bộ ca test tự động
- [ ] ___ Khác: ________________

**J2. Mốc thời gian mong muốn?**
- [ ] A. Gấp — dưới 1 tháng cho bản dùng được
- [ ] B. 2–3 tháng
- [ ] C. Không gấp, làm chắc

**J3. Trong lúc làm hệ thống mới, hệ thống cũ có phải chạy liên tục không?**
- [ ] A. Có, không được gián đoạn ngày nào
- [ ] B. Được dừng ngắn vào giờ thấp điểm
- [ ] C. Có thể tắt hẳn một thời gian

---
---

## SAU KHI TRẢ LỜI

Với 17 câu ⭐, tôi dựng được:

1. **Bản đồ nghiệp vụ chuẩn** — luồng nào giữ, luồng nào bỏ, luồng nào thêm.
2. **Kiến trúc v3** — tầng lưu trữ, tầng điều phối, tầng kênh, tầng nội dung.
3. **Bảng phân quyền** theo vai đã chốt.
4. **Lộ trình chuyển đổi** không làm gián đoạn 39 page đang chạy.

Câu nào chưa chắc thì để trống — tôi sẽ hỏi lại đúng câu đó thay vì đoán.

---
---

# PHẦN III — BA KHỐI BỔ SUNG (yêu cầu ngày 22/08/2026)

> Ba khối mới: **đồng bộ tồn kho từ POS** · **kịch bản theo sản phẩm có UI trực quan** ·
> **luồng xác nhận đơn qua WhatsApp**.
>
> Mỗi khối gồm: hiện trạng kiểm chứng từ mã nguồn → khoảng trống → bảng hỏi.

---

## III.1 · ĐỒNG BỘ TỒN KHO TỪ POS

### Đang có gì

| Hạng mục | Trạng thái |
|---|---|
| Kết nối POS | 🟢 Có sẵn — `pos.pages.fm/api/v1`, xác thực bằng `api_key` riêng mỗi shop |
| Bản đồ thị trường → shop | 🟢 `pancake-shops.json` — 7 shop: Saudi · UAE · Kuwait · Bahrain · Oman · Qatar · Taiwan |
| Ô `stock` trong dữ liệu sản phẩm | 🟡 **Có** (`kb.js`) nhưng đọc từ **Google Sheet điền tay**, không phải từ POS |

### Khoảng trống

**① Chưa có client đọc catalog sản phẩm / tồn kho.**
Endpoint duy nhất hệ thống đang gọi trên POS là `/shops/{id}/orders`. Không có lời gọi nào tới API sản phẩm hay kho.

**② Sản phẩm hiện được suy ngược từ đơn cũ — và đây là lỗi đang ẩn.**
Hàm `productRef()` lấy `variation_id` + `warehouse_id` + bảng giá bằng cách **đọc 25 đơn gần nhất của page rồi sao chép lại**. Hệ quả:

> ⚠️ **Page chưa có đơn nào thì không tạo được đơn nào.** Sản phẩm mới, page mới → `productRef()` trả `null` → tính năng tạo đơn tự động chết câm. Hiện chưa lộ ra vì `AUTO_CREATE_ORDER=0`; bật lên là gặp ngay.

**③ Không có khái niệm "sản phẩm" độc lập.** Sản phẩm gắn chặt vào `pageId`. Muốn có danh mục sản phẩm dùng chung nhiều page thì phải đổi trục dữ liệu — xem III.2.

**④ Quy tắc hiện hành đang mâu thuẫn với yêu cầu mới.** Nguyên tắc số 2 trong README ghi rõ: *"luôn coi còn hàng"*. Đồng bộ tồn kho về mà vẫn giữ luật này thì đồng bộ để làm gì.

---

## K · BẢNG HỎI — TỒN KHO

**⭐ K1. Bot làm gì khi sản phẩm hết hàng?**
- [ ] A. Ngừng bán ngay — AI báo hết hàng, chuyển sale
- [ ] B. Vẫn bán bình thường (giữ luật "luôn coi còn hàng" hiện tại)
- [ ] C. Vẫn bán nhưng báo trước "hàng về sau X ngày"
- [ ] D. Tự chuyển sang gói/biến thể còn hàng
- [ ] E. Tự tắt AI cho page đó, báo marketer
> `Hiện tại:` B — luật cứng trong prompt là "luôn coi còn hàng".
> `Ảnh hưởng:` Chọn A/C/D là phải sửa `CORE` trong `prompts.js` và thêm tồn kho vào ngữ cảnh mỗi lượt gọi model (tốn thêm token).

**K2. Ngưỡng "sắp hết" là bao nhiêu và ai được báo?**
- Ngưỡng: còn dưới ______ đơn vị
- Báo cho: [ ] marketer phụ trách [ ] sale [ ] admin [ ] nhóm WhatsApp chung [ ] không báo

**⭐ K3. Đồng bộ tồn kho bao lâu một lần?**
- [ ] A. Thời gian thực (mỗi lần AI báo giá là hỏi POS)
- [ ] B. Mỗi ______ phút
- [ ] C. Mỗi ngày 1 lần
- [ ] D. Khi có người bấm nút
> `Ảnh hưởng:` A chính xác nhất nhưng thêm một lời gọi mạng vào đường nóng của mỗi hội thoại. B là cân bằng thường dùng.

**K4. Tồn kho tính theo kho nào?**
- [ ] A. Mỗi thị trường một kho, lấy kho của shop tương ứng
- [ ] B. Một kho tổng cho tất cả
- [ ] C. Nhiều kho mỗi thị trường — cần chọn kho theo địa chỉ khách
- [ ] D. Chưa rõ, cần xem lại cấu hình POS

**K5. Đồng bộ những trường nào từ POS?** *(chọn nhiều)*
- [ ] A. Tên sản phẩm
- [ ] B. Mã sản phẩm / SKU
- [ ] C. Biến thể (`variation`) và mã biến thể
- [ ] D. Số lượng tồn theo biến thể
- [ ] E. Giá niêm yết trên POS
- [ ] F. Ảnh sản phẩm từ POS
- [ ] G. Kho (`warehouse`)
- [ ] H. Trạng thái bật/tắt của sản phẩm

**⭐ K6. Giá lấy từ đâu là chuẩn khi POS và kịch bản lệch nhau?**
- [ ] A. POS thắng — kịch bản phải sửa theo
- [ ] B. Kịch bản thắng — POS chỉ để tham khảo
- [ ] C. Lệch thì **chặn xuất bản kịch bản** và báo người
- [ ] D. Lệch thì AI im, chuyển sale
> `Hiện tại:` Giá lấy từ Google Sheet/`kb-overrides`. Validator đã chặn giá lạ trong kịch bản, nhưng **không đối chiếu với POS**.
> `Ảnh hưởng:` Đây là chỗ đã từng mất khách — vụ 07/08 khách bị báo gấp đôi giá rồi hủy đơn và chặn page.

**K7. Sửa tồn kho từ dashboard được không, hay chỉ đọc?**
- [ ] A. Chỉ đọc — POS là nguồn chuẩn duy nhất
- [ ] B. Đọc + ghi ngược được lên POS
- [ ] C. Đọc, và cho phép đặt "khoá bán" thủ công đè lên số POS

**K8. Đã xác nhận Pancake POS có API đọc sản phẩm/tồn kho chưa?**
- [ ] A. Có, đã dùng rồi — tài liệu ở: ________________
- [ ] B. Chắc là có nhưng chưa kiểm chứng
- [ ] C. Chưa biết — cần hỏi Pancake
> `Ghi chú:` Hệ thống hiện **chưa từng gọi** endpoint sản phẩm nào. Trước khi thiết kế cần một lần gọi thử thật để biết API trả về gì.

---

## III.2 · KỊCH BẢN THEO SẢN PHẨM + UI TRỰC QUAN

### Đang có gì

🟢 **Script Studio đã khá đầy đủ** — tái dùng được gần như trọn vẹn:
- Vòng đời `DRAFT → REVIEW → PUBLISH`, validator chặn cứng lúc xuất bản
- Lịch sử phiên bản + khôi phục bản cũ (bản cũ vẫn phải qua validator lại)
- "Thử 1 tin" chạy đúng đường prompt thật, không tool, không chạm khách nào
- Giao diện riêng: `public/scripts.html`

### Khoảng trống

**① Toàn bộ hệ thống đang neo vào `pageId`, không phải sản phẩm.**

| Thứ | Khoá hiện tại |
|---|---|
| `kb-overrides.json` | `pageId` |
| `script-versions/` | `pageId` |
| Cửa kiểm Readiness | `pageId` |
| Công tắc bật AI | `pageId` |
| Bảng giá, ảnh | `pageId` |

Muốn kịch bản theo **sản phẩm** thì phải đổi trục thành `Sản phẩm ─ nhiều ─ Page`. Đây là thay đổi mô hình dữ liệu, không phải thêm màn hình.

**② Kịch bản hiện chỉ có 3 ô** (`greeting`, `salesPrompt`, `tone`) — muốn "trực quan" thì phải tách thành nhiều khối có cấu trúc (xem C2 ở Phần II).

---

## L · BẢNG HỎI — KỊCH BẢN THEO SẢN PHẨM

**⭐ L1. Một sản phẩm bán trên mấy page?**
- [ ] A. Đúng 1 page — sản phẩm và page là một, chỉ đổi tên gọi
- [ ] B. Nhiều page cùng thị trường (nhiều page chạy quảng cáo cho 1 SP)
- [ ] C. Nhiều page khác thị trường — **giá và ngôn ngữ khác nhau**
- [ ] D. Cả B và C
> `Hiện tại:` A (mỗi page bán đúng 1 SP).
> `Ảnh hưởng:` **Câu quyết định mô hình dữ liệu.** Chọn A thì chỉ cần đổi nhãn trên UI. Chọn C thì phải tách 3 tầng: Sản phẩm → Biến thể theo thị trường → Page.

**⭐ L2. Kịch bản viết một lần dùng cho nhiều page, hay mỗi page một bản?**
- [ ] A. Một kịch bản cho sản phẩm, mọi page dùng chung
- [ ] B. Kịch bản gốc theo sản phẩm + phần đè riêng theo page
- [ ] C. Kịch bản gốc theo sản phẩm + phần đè theo thị trường
- [ ] D. Mỗi page một bản riêng (như hiện tại)

**L3. Nếu chọn B/C ở trên — page/thị trường được đè những gì?** *(chọn nhiều)*
- [ ] Câu mở đầu · [ ] Giọng điệu · [ ] Bảng giá · [ ] Ảnh · [ ] Khuyến mãi riêng · [ ] Ngôn ngữ · [ ] Khác: ________

**⭐ L4. "Trực quan trên UI" cụ thể là gì?** *(chọn nhiều)*
- [ ] A. Form chia khối rõ ràng (động cơ / lời hứa / giá / phản đối / ảnh) thay vì 1 ô text dài
- [ ] B. Xem trước hội thoại mẫu ngay bên cạnh lúc đang sửa
- [ ] C. Thư viện ảnh có xem trước, kéo thả để gắn vào từng khối
- [ ] D. So sánh cạnh nhau 2 phiên bản kịch bản
- [ ] E. Chỉ số hiệu quả hiện ngay trên kịch bản (bản này chốt bao nhiêu đơn)
- [ ] F. Sơ đồ luồng hội thoại nhìn thấy được (chào → tư vấn → chốt → bàn giao)
- [ ] G. Khác: ________________
> `Hiện tại:` A một phần (có form bảng giá + ảnh), thiếu B–F.

**L5. Ai được sửa kịch bản của một sản phẩm?**
- [ ] A. Marketer được gán cho sản phẩm đó
- [ ] B. Bất kỳ marketer nào
- [ ] C. Chỉ người có quyền duyệt
> *(Liên quan G2 — phân quyền theo người phụ trách.)*

**L6. Thông tin sản phẩm trong kịch bản lấy từ đâu?**
- [ ] A. Đồng bộ từ POS, không cho sửa tay
- [ ] B. Đồng bộ từ POS làm nền, cho phép sửa đè
- [ ] C. Nhập tay hoàn toàn như hiện tại
- [ ] D. Google Sheet như hiện tại, POS chỉ để đối chiếu

**L7. Sản phẩm mới xuất hiện trên POS thì hệ thống làm gì?**
- [ ] A. Tự tạo bản nháp kịch bản rỗng + báo marketer vào điền
- [ ] B. Chỉ hiện trong danh sách, chờ người tạo kịch bản
- [ ] C. Không làm gì tới khi có người gán page

---

## III.3 · LUỒNG WHATSAPP XÁC NHẬN ĐƠN

### Đây là kênh THỨ HAI, không phải tính năng thêm

| | Luồng Messenger (đang chạy) | Luồng WhatsApp (mới) |
|---|---|---|
| Ai mở lời | **Khách** nhắn trước | **Bot** nhắn trước |
| Kích hoạt | Có tin mới | Có đơn ở trạng thái chờ xác nhận |
| Mục tiêu | Chốt đơn | Xác nhận đơn đã có |
| Nhịp | Liên tục cả ngày | Theo mẻ, mỗi ngày |
| Ràng buộc pháp lý/nền tảng | Nhẹ | **Nặng — xem cảnh báo dưới** |

### Đang có gì

| Hạng mục | Trạng thái |
|---|---|
| Mã trạng thái "Chờ xác nhận" | 🟢 Đã biết — `status: 0` (mã nguồn ghi rõ *"Mới / Chờ xác nhận — nhân viên duyệt"*) |
| Đọc đơn từ POS | 🟢 Có — `/shops/{id}/orders`, lọc được theo ngày, phân trang |
| Trường cần cho xác nhận | 🟢 Có đủ — `bill_full_name`, `bill_phone_number`, `cod`, `shipping_address`, `items`, `status`, `inserted_at` |
| Gửi WhatsApp | 🔴 **Chỉ gửi được vào NHÓM**, không gửi 1-1 cho khách |
| Ghi ngược trạng thái lên POS | 🔴 Chưa có — hiện chỉ tạo đơn mới, chưa từng cập nhật đơn |

### ⚠️ CẢNH BÁO — phải quyết trước khi thiết kế

Thư viện WhatsApp hiện tại (`wa.js`) dùng **Baileys — thư viện KHÔNG chính thức, giả lập WhatsApp Web**. Chính chú thích trong mã nguồn đã cảnh báo:

> *"Meta có quyền KHÓA số điện thoại dùng cách này → nên dùng số phụ, đừng dùng số chính."*

Hiện nó sống được vì chỉ gửi vài tin/ngày vào **một nhóm nội bộ**. Dùng đúng thư viện đó để **nhắn hàng trăm khách lạ mỗi ngày là gần như chắc chắn bị khóa số** — và mất số nghĩa là mất luôn cả kênh xác nhận đơn, giữa chừng, không báo trước.

**Đường chính thức là WhatsApp Business Cloud API.** Nhưng nó có bốn ràng buộc phải thiết kế theo, không lách được:

1. **Tin doanh nghiệp chủ động gửi bắt buộc dùng mẫu đã được Meta duyệt.** Câu mở đầu xác nhận đơn sẽ là **mẫu cố định**, không phải câu AI tự viết.
2. **Khách trả lời mới mở cửa sổ 24 giờ** — trong cửa sổ đó AI mới được chat tự do.
3. **Tính tiền theo cuộc hội thoại 24h**, không theo số tin. Xác nhận đơn thuộc nhóm *utility*.
4. Cần **WhatsApp Business Account** + doanh nghiệp đã xác minh + số điện thoại đăng ký vào WABA — **số đó không dùng WhatsApp thường được nữa**.

> Nói thẳng: đây lại đúng cái nút thắt đã chặn kênh Messenger — **duyệt phía Meta**. Nên xử lý nó như một việc riêng, bắt đầu sớm, song song với phần còn lại; đừng để cả luồng chờ nó.

### Luồng đề xuất — xác nhận lại từng bước

```
Mỗi ngày, giờ HH:MM (múi giờ của KHÁCH, không phải giờ VN)
   │
   ├─ POS: lấy đơn status=0 (Chờ xác nhận) theo shop
   ├─ Lọc bỏ: đã nhắn rồi · thiếu số điện thoại · đơn quá cũ · khách đã chặn
   │
   ├─ Gửi MẪU đã duyệt: mã đơn · sản phẩm · số lượng · tổng tiền · COD
   │
   ├─ Khách trả lời → mở cửa sổ 24h → AI đọc ý:
   │     ✅ Xác nhận          → cập nhật POS sang trạng thái nào?   (M6)
   │     ❌ Hủy               → cập nhật POS sang trạng thái nào?   (M6)
   │     ✏️ Sửa địa chỉ/SL     → AI tự sửa hay đẩy người?           (M7)
   │     ❓ Hỏi chuyện khác    → AI trả lời tới đâu?                (M8)
   │     😠 Khiếu nại/bực     → đẩy người ngay
   │
   ├─ Không trả lời sau N giờ → nhắc lại mấy lần? rồi sao?          (M9)
   │
   └─ Ghi sổ → báo cáo theo NGÀY · SẢN PHẨM · MARKETER              (M11)
```

---

## M · BẢNG HỎI — WHATSAPP XÁC NHẬN ĐƠN

**⭐ M1. Dùng kênh WhatsApp nào?**
- [ ] A. **Cloud API chính thức** — chấp nhận phải duyệt mẫu tin và trả phí theo hội thoại
- [ ] B. Giữ Baileys (không chính thức) — chấp nhận rủi ro mất số
- [ ] C. Qua nhà cung cấp trung gian (Twilio / 360dialog / Infobip…): ________________
- [ ] D. Chưa quyết
> `Ảnh hưởng:` **Câu chặn nặng nhất của khối này.** Chọn B thì thiết kế xong có thể chết trong vài tuần. Chọn A thì phải bắt đầu thủ tục Meta ngay từ bây giờ.

**⭐ M2. Đã có WhatsApp Business Account và số đăng ký chưa?**
- [ ] A. Có đủ, dùng được ngay — số: ________________
- [ ] B. Có tài khoản, chưa đăng ký số
- [ ] C. Chưa có gì
- [ ] D. Không biết, cần kiểm tra
> `Ảnh hưởng:` Nếu C thì đây là đường găng của cả khối — làm thủ tục trước, code sau.

**M3. Mỗi thị trường một số WhatsApp riêng hay dùng chung một số?**
- [ ] A. Một số cho tất cả
- [ ] B. Mỗi thị trường một số
- [ ] C. Mỗi shop POS một số

**⭐ M4. Mỗi ngày khoảng bao nhiêu đơn cần xác nhận?**
- Số đơn/ngày: ______ · Giờ cao điểm: ______
> `Ảnh hưởng:` Quyết định chi phí (tính theo hội thoại), tốc độ gửi, và có cần xếp hàng chống nghẽn không.

**⭐ M5. Bot có quyền GHI ngược trạng thái đơn lên POS không?**
- [ ] A. Có — tự đổi trạng thái đơn sau khi khách trả lời
- [ ] B. Không — chỉ ghi ghi chú vào đơn, người đổi trạng thái
- [ ] C. Có với ca rõ ràng (khách xác nhận), người xử ca còn lại
> `Hiện tại:` Hệ thống **chưa từng cập nhật đơn** trên POS — chỉ tạo đơn mới. Đây là quyền ghi hoàn toàn mới.

**⭐ M6. Trạng thái đích trên POS là gì?**
- Khách **xác nhận** → trạng thái: ________________
- Khách **hủy** → trạng thái: ________________
- Khách **không trả lời** → trạng thái: ________________
- Khách **đòi sửa** → trạng thái: ________________
> `Hiện tại:` Chỉ biết chắc `status: 0` = Chờ xác nhận. Các mã còn lại cần lấy từ POS.

**⭐ M7. Khách đòi sửa đơn (địa chỉ, số lượng, giờ giao) thì sao?**
- [ ] A. Đẩy người ngay, AI không sửa gì
- [ ] B. AI sửa được địa chỉ và giờ giao, số lượng thì đẩy người
- [ ] C. AI sửa được hết, ghi rõ đã sửa gì
- [ ] D. AI ghi lại yêu cầu vào ghi chú, người sửa

**M8. Trong cửa sổ 24h, AI được trả lời tới đâu?**
- [ ] A. Chỉ đúng việc xác nhận đơn, ngoài phạm vi là đẩy người
- [ ] B. + Trả lời hỏi về giao hàng, thời gian
- [ ] C. + Trả lời hỏi về sản phẩm
- [ ] D. + Bán thêm

**M9. Khách không trả lời thì sao?**
- Nhắc lại sau: ______ giờ · Tối đa ______ lần
- Sau đó: [ ] đẩy sale gọi điện [ ] chuyển trạng thái "không liên lạc được" [ ] để nguyên [ ] khác: ______

**⭐ M10. Tình huống nào BẮT BUỘC đẩy người?** *(chọn nhiều)*
- [ ] A. Khách khiếu nại / nổi giận
- [ ] B. Khách đòi hủy
- [ ] C. Khách đòi đổi trả, hoàn tiền
- [ ] D. Đơn giá trị cao (trên ______)
- [ ] E. Khách hỏi thứ AI không chắc
- [ ] F. Khách đòi gặp người
- [ ] G. AI đọc không ra ý khách sau 2 lượt
- [ ] H. Khách dùng ngôn ngữ AI không xử được

**M11. Báo cáo gồm những gì?** *(chọn nhiều)*
- [ ] A. Số đơn đã nhắn / đã xác nhận / đã hủy / chưa trả lời — theo ngày
- [ ] B. Tách theo sản phẩm
- [ ] C. Tách theo marketer được gán
- [ ] D. Tách theo thị trường / shop
- [ ] E. Tỉ lệ xác nhận thành công
- [ ] F. Thời gian trung bình từ lúc nhắn tới lúc khách trả lời
- [ ] G. Số ca phải đẩy người, kèm lý do
- [ ] H. Chi phí WhatsApp

**⭐ M12. "Marketer được gán cho sản phẩm" lấy từ đâu là chuẩn?**
- [ ] A. Từ POS (như anh nói POS đã có đủ) — trường tên: ________________
- [ ] B. Từ Google Sheet như hiện tại (cột `marketer`, gán theo **page**)
- [ ] C. Từ sổ cái page (`pages.json`)
- [ ] D. Nhập trong hệ thống mới
> `Hiện tại:` B — `marketer` là một cột trong Google Sheet, gán **theo page**, không theo sản phẩm. Nếu POS có trường này theo sản phẩm thì cần biết tên trường để lấy đúng.

**M13. Gửi tin vào giờ nào?**
- [ ] A. Giờ hành chính theo múi giờ **của khách** (mỗi thị trường một khung giờ)
- [ ] B. Một khung giờ cố định theo giờ VN
- [ ] C. Ngay khi đơn rơi vào trạng thái chờ xác nhận
> `Ghi chú:` Trung Đông lệch VN 3–5 tiếng. Nhắn theo giờ VN sẽ rơi vào đêm của khách.

**M14. Ngôn ngữ tin xác nhận?**
- [ ] A. Theo thị trường của shop
- [ ] B. Theo ngôn ngữ khách đã dùng bên Messenger (nếu có)
- [ ] C. Tiếng Anh hết
- [ ] D. Khác: ________________

**M15. Luồng WhatsApp và luồng Messenger có nối với nhau không?**
- [ ] A. Có — cùng một hồ sơ khách, AI bên WhatsApp đọc được hội thoại Messenger
- [ ] B. Không — hai luồng độc lập hoàn toàn
- [ ] C. Chỉ nối một chiều: WhatsApp đọc được đơn và lịch sử chat, không ghi ngược
> `Ảnh hưởng:` Chọn A là phải có định danh khách thống nhất giữa hai kênh (số điện thoại ↔ PSID) — thêm một tầng dữ liệu.

---

## TỔNG KẾT PHẦN III — ĐƯỜNG GĂNG

Ba khối này **không cùng độ khó**:

| Khối | Độ khó kỹ thuật | Nút thắt thật |
|---|---|---|
| Tồn kho từ POS | Thấp | Chỉ cần xác nhận API POS có gì (K8) |
| Kịch bản theo sản phẩm | Trung bình | Đổi trục dữ liệu page → sản phẩm (L1) |
| **WhatsApp xác nhận đơn** | Trung bình | **Duyệt phía Meta (M1, M2)** — không phải code |

> **Việc nên bắt đầu ngay, không chờ thiết kế xong:** thủ tục WhatsApp Business Account + đăng ký số + soạn mẫu tin gửi duyệt. Đây là phần dài nhất và hoàn toàn nằm ngoài tầm kiểm soát kỹ thuật. Nếu để tới lúc code xong mới làm, cả khối sẽ nằm chờ.
