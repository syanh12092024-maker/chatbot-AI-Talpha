# PHIẾU BH7 — Kimi ĐỌC ĐƯỢC thứ khách đã nhận từ Botcake · tin trả lời ngắn 2–3 dòng

**Base:** `b9375da` · **Làn:** 🟨 (đổi NGỮ CẢNH + văn phong đưa vào model; không mở đường
gửi, không đụng đơn/tiền) · người quyết gật 28/09 trong phiên đối chiếu Minty KSA
**Đụng bộ não:** `src/context.js` `src/prompts.js` — bệnh nằm ở cửa sổ ngữ cảnh
(`context.js#cleanHistory` vứt mọi tin Botcake) và ở CORE §1 (chào mỗi tin, không trần
độ dài, không cấm markdown).

> Thợ nạp `tho-thi-cong`. Phiếu chạm cách bot NÓI ⇒ rào ② §0a luật 4: đo lại bằng
> model thật (`ops/bin/gia-lap-mot-minh.mjs`, cùng tập lượt khoá theo `--chi`).
> ⚠️ Cùng đụng `context.js` với **BH2** (🎫, chưa ai nhận) và `prompts.js` với **BH3**
> (🎫). BH7 làm TRƯỚC vì người quyết chỉ thẳng; BH2/BH3 khi nhận phải rebase lên BH7.

## ① Thi hành

Đo 28/09 trên màn đối chiếu «BOT MÌNH vs THỰC TẾ · PUBLIC API», page Minty Fresh Smile
KSA, 38 hội thoại / 60 lượt khách:

| Ca thật | Kimi đọc gì | Bot mình | Public API |
|---|---|---|---|
| «hm how to order» | **0 dòng cửa sổ** (12 tin Botcake bị lọc) | chào + tên SP + 2 gói in đậm + COD + câu chốt | «Just tell me how many sets…, then send your full name, contact number and complete address» |
| «u have in saudi??» | 0 dòng | 4 đoạn: chào, giới thiệu SP, free ship + COD, bảng giá | «Yes dear, we deliver in Saudi 😊 How many sets — Buy 1 Get 1 or Buy 2 Get 2?» |
| «Buy 1 get free» | 0 dòng | «How many sets po? **Buy 1…** or **Buy 2…**» — hỏi lại gói khách vừa chọn | «Noted — Buy 1 Get 1 FREE — 2 items for 109 SAR… May I have your contact number…» |

Nguyên nhân (đo trên code, không đoán):
1. `cleanHistory` VỨT mọi tin khớp `isAutomationTemplate`, chỉ bóc cờ `otherBot`
   («ĐÃ BÁO GIÁ — đừng lặp»). Page Botcake nói phần lớn ⇒ cửa sổ trống; model biết CÓ báo
   giá mà không biết khách đã THẤY GÌ.
2. «Buy 1 get free» không khớp `TIER_TEXT` ⇒ hồ sơ in «Bước còn thiếu: chọn gói» như
   sự thật; không có tin Botcake để đối chiếu, Kimi tin hồ sơ.
3. CORE §1 «mở đầu bằng chào» không giới hạn tin đầu; «1-3 câu» chìm giữa ~2.300 token
   luật; không cấm markdown (Messenger hiện nguyên `**`).

Người quyết: **không vá regex từng câu — Kimi phải hiểu đúng bối cảnh**; và **tin trả
lời tối đa 2–3 dòng**.

## ② Vào/ra

**Vào (đã đo lại):** `cleanHistory` (`context.js:366` ở base) · `chonCuaSo` · 
`buildContextMessages` (bỏ cụm khách cuối · đếm giục) · `buildProfileBlock` dòng «Bước
còn thiếu» · CORE §1 (7.111 ký tự). Team 1 (Minty) KHÔNG có `bo_luat_chung` trong CSDL
dev ⇒ v3 dùng CORE, sửa CORE có hiệu lực cả hai bản.

**Ra:**
1. Tin template thành **ghi chú có nhãn** `[Botcake (page tự động gửi, KHÁCH ĐÃ NHẬN —
   không phải lời bạn): «…»]`, vai `assistant`, cờ `kenhKhac`. Bỏ emoji, cắt 240 ký tự ở
   ranh giới từ, mẫu trùng giữ lần GẦN NHẤT.
2. `chonCuaSo`: ghi chú có trần RIÊNG `MAX_KENH_KHAC=3`, không ăn vào `RECENT_MSGS` — lời
   khách không bị mẫu máy đẩy ra.
3. Bỏ cụm khách cuối: nhấc ghi chú xen trong cụm ra rồi đặt lại — cụm bị bỏ đúng như
   trước BH7 (không nhân đôi câu đang xử lý). Đếm giục bỏ qua ghi chú.
4. «Bước còn thiếu» tự khai là **máy đoán theo từ khoá — hội thoại thắng**.
5. CORE §1: chỉ chào ở tin đầu · **tối đa 2–3 dòng (~250 ký tự)** · câu đầu trả lời
   đúng câu hỏi · cấm markdown/gạch đầu dòng · đọc dòng «KHÁCH ĐÃ NHẬN» thì không dán lại
   giá · gói gọi kiểu riêng khớp đúng một gói ⇒ coi là đã chọn · một mẫu trả lời.
6. `buildSystem`: nhãn câu chào của page «dùng khi khách mới nhắn» → **«CHỈ dùng ở tin
   ĐẦU TIÊN…»** («khách mới nhắn» đọc được thành «khách VỪA nhắn» = mọi lượt), và một dòng
   nhắc luật hình thức ở ĐẦU khối kịch bản (khối đứng sau CORE nên được nghe hơn). Chữ của
   marketer KHÔNG đổi. *(Thêm sau lượt đo 1 — xem nhật ký: kịch bản Minty có câu chào 4
   dòng ✅ + «LUỒNG BÁN 1. chào, nêu lợi ích, hỏi mấy set» đè lên CORE.)*
7. **KHÔNG hạ `max_tokens`** (`closer.js`, 400). `stop_reason='max_tokens'` hiện gửi
   nguyên tin CỤT cho khách (closer không cắt ở câu) — hạ trần trước khi có cắt-ở-câu là
   đổi tin dài lấy tin gãy. Để BH3 (đã có `TIN_QUA_DAI` + `canFixLocally`).

## ③ Pathspec

```
src/context.js
src/prompts.js
test/bh7-ngu-canh-botcake.test.mjs
test/context.test.mjs              ← CHỈ ca C7 (luật đổi: template thành ghi chú)
test/l4-prompt.test.mjs            ← CHỈ mẩu nguyên tắc 1 + trần ký tự CORE (có số đo)
README.md                          ← CHỈ nguyên tắc 1
ops/bin/nghiem-thu/bh7.sh
docs/thi-cong/nhat-ky/phieu-bh7.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh7.sh`

- ① bộ ca `bh7-ngu-canh-botcake` ≥10 pass, 0 fail
- ② hợp đồng cũ: `context` · `l4-prompt` · `mach-tu-van` · `phase1-chat-flow` · `l2-m3-rap-prompt` 0 fail
- ③ neo: `cleanHistory` không còn nhánh `isAutomationTemplate(...) { … continue; }` vứt
  thẳng mà không `push` ghi chú
- ④ neo: CORE còn «2–3 dòng» + «CHỈ chào ở tin ĐẦU» + «KHÔNG markdown»
- ⑤ `closer.js` `max_tokens` KHÔNG bị hạ trong phiếu này (vẫn 400)
- Đo model (tốn tiền, chạy tay): `gia-lap-mot-minh.mjs --kho … --chi …` cùng 60 lượt —
  so với màn đối chiếu gốc: độ dài p50/p90, tỉ lệ tin có `**`, tỉ lệ tin mở bằng
  «Hello/Hi», token ra TB, đ/lượt.

## ⑤ Nhánh test KHÔNG chạm

- Khách thật phản ứng thế nào với tin ngắn — việc của gate deploy.
- Page có `bo_luat_chung` riêng trong CSDL: CORE bị THAY, luật §1 mới KHÔNG tới — bộ
  luật đó phải sửa trên màn Bộ luật (ghi §9).

## ⑥ Ngoài phạm vi

`TIER_TEXT` (người quyết: không vá regex) · `max_tokens` + cắt-ở-câu (BH3) · deploy.
