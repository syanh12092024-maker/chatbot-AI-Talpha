# PHIẾU L1-M2 — Cửa Pancake Messenger: bọc code cũ + định tuyến team + guard tại cửa

**Base:** `dfcd9ae` · **Làn:** 🟥 có đường GỬI TIN RA KHÁCH — nhưng thợ **sonnet**
(bọc mỏng theo route 22/08; phép đo ④ gánh chất lượng)

> Phiếu là HỢP ĐỒNG. Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a trước khi gõ.
> Phát SAU GATE R0, chạy SONG SONG L1-M1 (khác vùng file — phán tổng 22/08).
> Bản v2 — đóng 6 finding `nghiep-vu-L1-M2.verdict.yaml` (3 CHAN: guard sai chiều ·
> lối vòng tools.js · ctxHeThong không team).

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §L1 — "Cửa Pancake Messenger — bọc code cũ, thêm định
  tuyến theo team".
- `docs/v3/01-QUYET-DINH.md` §8 (page thuộc team — dữ liệu `page.team_id` đã có từ L0-M1).
- `docs/v3/ban-giao/tang-truy-van-v1.md` (L0-M2) — ctx bắt buộc, lỗi có tên.
- Sổ §0a luật 1: `PANCAKE_READONLY=1` — máy dev tuyệt đối không gửi tin khách thật.

## ② Hợp đồng vào/ra

**Vào (ĐO LẠI trước khi code):** `src/pancake.js` (269 dòng — đọc conv/messages · gửi
reply/ảnh · tag · note · kho token; DÙNG QUA IMPORT, cấm sửa). Bản cũ kiểm
`PANCAKE_READONLY` RẢI RÁC ở từng caller (`admin-orders.js:21`…) — pkSendReply KHÔNG tự
kiểm. Token page từ IP cá nhân bị lỗi 121 — phép gọi thật là NHÁNH-VPS.

**Ra (đo được):**

1. `src/channels/messenger/` (MỚI) — cửa Messenger v3, MỘT chỗ duy nhất **cho CODE V3**
   khi đụng Pancake Messenger (đường v2 cũ có vòng đời riêng, không đụng — xem N2 dưới):
   - Mọi hàm nhận `ctx` (tầng truy vấn L0-M2). Định tuyến team: `page_id` tra `page.team_id`
     qua tầng truy vấn; page không thuộc `ctx.teamId` → lỗi có tên + 1 dòng `nhat_ky`.
   - **ctxHeThong = "không có NGƯỜI", KHÔNG PHẢI "không có TEAM" (N3):** đường job nền
     tra `page.team_id` rồi TỰ DỰNG ctx hệ-thống GẮN ĐÚNG TEAM của page; `nhat_ky` dòng
     nào của đường này cũng mang teamId thật (502/502 page đang ở `chua-phan` nghĩa là
     hôm nay đường hệ-thống là đường DUY NHẤT có lưu lượng — không gắn team là phép chặn
     xuyên team không có gì để so, và lỗ không tự đóng sau H7 vì poll/handler vĩnh viễn
     là job nền).
   - **GUARD TẠI CỬA — FAIL-CLOSED ĐÚNG CHIỀU (N1):** nhóm hàm GỬI/GHI (`guiTin`,
     `guiAnh`, `ghiNote`, `gatThe`) chỉ chạy khi `V3_PANCAKE_GUI === '1'` **VÀ**
     `PANCAKE_READONLY !== '1'`; mọi trường hợp khác (vắng biến, giá trị lạ) → ném lỗi
     có tên, KHÔNG gọi xuống `pancake.js`. VẮNG BIẾN = ĐÓNG — cùng khuôn `V3_POS_GHI`
     của L1-M1, ngược với `=== '1'` danh-sách-cấm của bản cũ (vắng = mở là đúng ca sổ
     §0a luật 1 dựng ra để chặn). Nhóm hàm ĐỌC không bị chặn. VPS v3 sẽ đặt
     `V3_PANCAKE_GUI=1` lúc cutover — ghi vào file bàn giao.
   - **Bọc đủ bộ sale dùng (câu 7 verdict):** đọc hội thoại · đọc tin · gửi text · gửi
     ảnh · **ghi note · gắn/gỡ thẻ** — note+thẻ là cơ chế bàn giao sale (§7.4, đầu vào
     L4), `pkAddNote`/`pkTagByName` đang được 4 tệp v2 gọi, không phải "chưa ai gọi".
   - Kiểm `convId` THUỘC `pageId` (N5): tra `hoi_thoai` (UNIQUE(page,psid)) trước khi
     gọi xuống; conv của page khác → lỗi có tên.
2. `docs/v3/ban-giao/cua-messenger-v1.md` — hàm + chữ ký + các lỗi có tên + biến
   `V3_PANCAKE_GUI` cho cutover, cho L2 trỏ vào.
3. **NỢ CHUYỂN CHO L2-M1 (N2 — thợ APPEND §9, tổng đã duyệt trước):** `src/tools.js:1`
   (bộ não chat, CẤM SỬA) import thẳng `createOrder, pkSendImage, pkAddNote, pkTagByName`
   từ `pancake.js`; `scheduler-followup.js:24` import `pkSendReply` — bốn hàm gửi không
   một dòng guard. Cửa v3 KHÔNG bịt được lối này trong phiếu này (đụng file cấm); L2-M1
   khi chuyển đường xử lý tin PHẢI route outbound của bộ não qua cửa v3 (DI/injection,
   không sửa tools.js). Ghi nguyên văn vào §9 để phiếu L2-M1 nhận nợ.

## ③ File được đụng (pathspec)

```
src/channels/messenger/
test/l1-m2-*.test.js
docs/v3/ban-giao/cua-messenger-v1.md
ops/bin/nghiem-thu/l1-m2.sh
docs/thi-cong/nhat-ky/phieu-l1-m2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §9 + §10
```

⛔ Không sửa `src/pancake.js` hay file phẳng nào dưới `src/` · không đụng `src/pos/`
(L1-M1 đang chạy song song — đụng vùng nhau là dừng ngay, báo tổng) · không đổi
`package.json` · `.env` chỉ ĐỌC.

## ④ Nghiệm thu BẰNG NỘI DUNG — đóng gói `ops/bin/nghiem-thu/l1-m2.sh`

```bash
# 1. GUARD FAIL-CLOSED, ĐO CẶP ĐỐI CHỨNG (N1+N4): CÙNG một spy trên pancake.js, CÙNG hàm,
#    env đặt TRONG harness (không thừa hưởng .env):
#    a. VẮNG V3_PANCAKE_GUI → gửi ném đúng tên lỗi, spy = 0
#    b. V3_PANCAKE_GUI=1 + PANCAKE_READONLY=1 → vẫn chặn, spy = 0
#    c. V3_PANCAKE_GUI=1 + không READONLY → spy = 1 (đối chứng dương — chứng minh spy
#       gắn đúng instance, cửa thật sự gọi xuống)
#    In ba dòng "a=0 · b=0 · c=1". Thiếu vế (c) là đo cái mock, không đo cái cửa.
# 1b. TÍNH DUY NHẤT TRONG V3 (N2): grep import pancake.js trực tiếp trong src/db
#     src/pos src/channels src/chat src/orders src/queue = CHỈ cửa messenger (in danh
#     sách file khớp — kỳ vọng đúng 1 nhóm file của cửa); phép này vào gate lặp mãi
# 2. Định tuyến team: page thuộc team khác ctx → lỗi có tên + nhat_ky +1 (đếm trước/sau);
#    mẩu page trộn 2 team tự chèn (dọn bằng DELETE đúng id — án lệ L0-M2)
# 2b. convId không thuộc pageId (N5) → lỗi có tên, không gọi xuống (spy=0)
# 3. ctxHeThong GẮN TEAM (N3): gọi đường hệ-thống trên page đã gán team X (mẩu trộn) →
#    nhat_ky dòng mới mang team_id = X (SELECT in ra, KHÔNG phải NULL/chua-phan)
# 4. Hàm ĐỌC dưới guard đóng → KHÔNG bị chặn (mock trả mẫu, đo về được dữ liệu)
# 5. Nhánh Pancake THẬT: NHÁNH-VPS (token 121 ở IP cá nhân) — output ghi "CHƯA CHẠY —
#    chờ VPS", cấm giả xanh; mock theo ĐÚNG khuôn response §4.2 TONG-QUAN
# 6. npm test: bộ l1-m2 xanh (không chạy bộ cũ — nợ §9 conv-state)
```

## ⑤ Test chạm nhánh nào

Local: toàn bộ logic guard + định tuyến trên DB thật (mẩu trộn tự chèn, dọn sạch). Gọi
Pancake thật: NHÁNH-VPS chờ gate R1, khai trong nhật ký.

## ⑥ Ngoài phạm vi

Ngoài ③ → APPEND §9. Thấy hàm pancake.js cũ có bug → §9, cấm sửa.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "messenger\|pancake" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep "§9" ; echo rc=$?
rc=1 — không dòng nợ nào đụng vùng src/channels/messenger
$ ls src/channels 2>/dev/null → chưa tồn tại
```

Quan hệ: **mới**. Tự chấm 4 câu điểm (a) của tổng: nằm ở §10 sổ (dòng phát phiếu).

---

**Khi làm:** mơ hồ → `[NEEDS CLARIFICATION: …]`. **Khi nộp:** nhật ký
`docs/thi-cong/nhat-ky/phieu-l1-m2.md` · APPEND 3 dòng §10 · commit pathspec ③
(`feat(messenger): L1-M2 — ...`) · trả lời tổng ≤15 dòng.
