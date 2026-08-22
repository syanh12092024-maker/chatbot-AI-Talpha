# PHIẾU L1-M2 — Cửa Pancake Messenger: bọc code cũ + định tuyến team + guard tại cửa

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 có đường GỬI TIN RA KHÁCH — nhưng thợ **sonnet**
(bọc mỏng theo route 22/08; phép đo ④ gánh chất lượng)

> Phiếu là HỢP ĐỒNG. Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a trước khi gõ.
> Phát SAU GATE R0, chạy SONG SONG L1-M1 (khác vùng file — phán tổng 22/08).

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

1. `src/channels/messenger/` (MỚI) — cửa Messenger v3, MỘT chỗ duy nhất mọi module v3 đi
   qua khi đụng Pancake Messenger:
   - Mọi hàm nhận `ctx` (tầng truy vấn L0-M2). Định tuyến team: `page_id` tra `page.team_id`
     qua tầng truy vấn; page không thuộc `ctx.teamId` → lỗi có tên + 1 dòng `nhat_ky`
     (chống team này đọc/nhắn trên page team kia). Page chưa gán team (`chua-phan`) chỉ đi
     được qua `ctxHeThong` — có audit.
   - **GUARD TẠI CỬA (khác bản cũ — một chỗ, không rải):** nhóm hàm GỬI (`guiTin`,
     `guiAnh`, tag/note nếu bọc) kiểm `PANCAKE_READONLY === '1'` → ném lỗi có tên, KHÔNG
     gọi xuống `pancake.js`. Nhóm hàm ĐỌC không bị chặn.
   - Bọc tối thiểu đủ cho L2 dùng: đọc hội thoại · đọc tin · gửi text · gửi ảnh. Không bọc
     thứ chưa ai gọi (ghi §9 nếu thấy cần thêm).
2. `docs/v3/ban-giao/cua-messenger-v1.md` — hàm + chữ ký + hai lỗi có tên, cho L2 trỏ vào.

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
# 1. GUARD GỬI (luật 1): với PANCAKE_READONLY=1 (mặc định .env dev) gọi guiTin/guiAnh →
#    ném đúng tên lỗi, pancake.js KHÔNG được gọi xuống (spy/mock đếm 0 lượt) — in tên lỗi
#    + số lượt. Đây là phép QUAN TRỌNG NHẤT của phiếu.
# 2. Định tuyến team: page thuộc team khác ctx → lỗi có tên + nhat_ky +1 (đếm trước/sau);
#    dùng mẩu page trộn 2 team nghiệp vụ tự chèn (dọn bằng DELETE đúng id — án lệ L0-M2)
# 3. Page team chua-phan + ctx người thật → lỗi; + ctxHeThong → cho qua tầng định tuyến
#    (mock tầng pancake, không gọi thật) và nhat_ky ghi
# 4. Hàm ĐỌC với PANCAKE_READONLY=1 → KHÔNG bị guard chặn (mock pancake.js trả mẫu, đo
#    về được dữ liệu — chứng minh guard chỉ chặn chiều GHI)
# 5. Nhánh gọi Pancake THẬT: NHÁNH-VPS (token bị 121 ở IP cá nhân) — output ghi rõ
#    "CHƯA CHẠY — chờ VPS", cấm giả xanh; mock phải theo ĐÚNG khuôn response chụp trong
#    docs/TONG-QUAN-HE-THONG.md §4.2 hoặc từ code cũ
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
