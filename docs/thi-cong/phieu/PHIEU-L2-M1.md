# PHIẾU L2-M1 — Đường xử lý tin nền mới: hàng đợi + handler v3, MỌI outbound qua cửa

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 (chạm outbound + bộ não) · thợ **opus** (phán
22/08: đổi chỗ trong danh sách 4-phiếu-opus với L1-M3 vì L1-M3 đã thành khung mỏng)

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b. Bộ não chat DÙNG NGUYÊN — phiếu này là
> NHẠC TRƯỞNG MỚI quanh nó. Đây là phiếu nhận NỢ N2 của L1-M2 (§9: tools.js/scheduler
> import thẳng pancake.js).

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §L2 — "Chuyển đường xử lý tin sang nền mới, hàng đợi thay
  vòng poll" + "Viết lại: handler.js · pancake-poll.js · conv-owner.js".
- `docs/v3/01-QUYET-DINH.md` §1 (luồng Messenger: bot chốt → HÀNG CHỜ duyệt, KHÔNG tự tạo
  đơn POS — `config.autoCreateOrder` giữ TẮT) · §3 (độ trễ — điểm kiểm 2 chưa đo ⇒ nguồn
  tin vẫn là POLL, nhưng poll chỉ NẠP; xử lý ở worker).
- Sổ §9 nợ N2 (L1-M2): lối vòng `tools.js:1` + `scheduler-followup.js:24` — phiếu này
  đóng bằng KIẾN TRÚC, không sửa file cấm.
- `docs/v3/ban-giao/cua-messenger-v1.md` (gửi text/ảnh/tag/note qua cửa) +
  `tang-truy-van-v1.md` (ctx) + `luoc-do-v1.md`.

## ② Hợp đồng vào/ra

**Vào (thợ ĐO LẠI — số đo tổng 22/08):**

- Bộ não KHÔNG TỰ GỬI GÌ: `runCloser(ctx{kb,state})` TRẢ TEXT (`closer.js:9`); tool ảnh
  chỉ XẾP `state.pendingImages` — ảnh chỉ bay khi ai đó gọi `flushPendingImages`
  (`tools.js:118`, handler CŨ gọi); tag/note do handler cũ gọi thẳng; text do
  `pancake-poll.js:520` gửi. ⇒ handler v3 KHÔNG gọi `flushPendingImages` cũ và tự quản
  outbound = bộ não bị cô lập hoàn toàn khỏi pancake.js (trừ `tools.js:186 createOrder`
  = ghi nhận nội bộ + nhánh `config.autoCreateOrder` ĐANG TẮT — giữ nguyên TẮT).
- State cũ sống ở `conv-state.json` — v3 đọc/ghi bảng `hoi_thoai` (đã di trú 18.790 dòng).
- Chỗ cắm model: `llm.js` (41 dòng, client anthropic/kimi) — DÙNG NGUYÊN qua DI.

**Ra (đo được):**

1. **Migration `db/migrate/003_tin_cho_xu_ly.*`** — bảng `tin_cho_xu_ly` (team_id NOT
   NULL · page_id · psid · conv_id · msg_id · noi_dung · trang_thai
   `cho|dang_xu|xong|loi` · so_lan_thu · khoa_worker · thoi_diem). UNIQUE chống trùng
   `(page_id, conv_id, msg_id)`. Khai lý do bảng mới vào `luoc-do-v1.md` §thay-đổi +
   regen `db/schema.sql`.
2. **`src/queue/`** — (a) bộ NẠP: poll qua CỬA messenger (đường đọc `docHoiThoai`/`docTin`,
   ctxHeThong) → enqueue idempotent; (b) WORKER: rút `cho` → `dang_xu` bằng
   `FOR UPDATE SKIP LOCKED`, **một hội thoại không bao giờ 2 worker cùng xử** (khoá theo
   conv), gọi handler, xong/lỗi cập nhật trạng thái + đếm lần thử.
3. **`src/chat/`** — handler v3 (nhạc trưởng mới): dựng `state` từ `hoi_thoai` + KB
   (`kb.js` cũ import nguyên — nhóm "nội dung dùng nguyên"), gọi
   `classify`/`fastLane`/`runCloser` NGUYÊN VĂN; nhận text về rồi:
   - gửi text qua **cửa `guiTin`** (guard V3_PANCAKE_GUI) — KHÔNG pkSendReply;
   - tự xả `state.pendingImages` qua **cửa `guiAnh`** — KHÔNG `flushPendingImages` cũ;
   - tag/note qua cửa; cập nhật `hoi_thoai` (state · lượt · hồ sơ nén) + ghi `so_ai`
     (sự kiện `reply` kèm token + **`ma_model`**; guard chặn thì ghi `spent_no_send` —
     đúng án lệ §11.2 «khoản chi tàng hình»);
   - `config.autoCreateOrder` giữ TẮT — bot chốt chỉ ghi nhận, hàng chờ tạo đơn là
     L3-M4.
4. **Chỗ cắm model (DI, §7b T6):** handler nhận `deps.layModel()` mặc định trả client
   `llm.js` cũ; interface (chữ ký + hợp đồng lỗi/dự phòng mà B phải theo) ghi vào
   `docs/v3/ban-giao/duong-tin-v1.md` — KHÔNG tự viết lớp model (việc B, prompt A cấm).
5. `docs/v3/ban-giao/duong-tin-v1.md` — kiến trúc đường tin + hợp đồng DI model + cách
   L2-M2/M3 cắm thêm.

## ③ File được đụng (pathspec)

```
db/migrate/003_tin_cho_xu_ly.up.sql
db/migrate/003_tin_cho_xu_ly.down.sql
db/schema.sql
docs/v3/ban-giao/luoc-do-v1.md          ← CHỈ append §thay-đổi
src/queue/
src/chat/
test/l2-m1-*.test.js
docs/v3/ban-giao/duong-tin-v1.md
ops/bin/nghiem-thu/l2-m1.sh
docs/thi-cong/nhat-ky/phieu-l2-m1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md  ← CHỈ append §9 + §10
```

⛔ Không sửa file phẳng `src/` (kể cả handler.js/pancake-poll.js cũ — chúng phục vụ 51
page tới ngày cutover) · không đụng `src/channels/*` `src/pos/*` `src/db/*` ngoài IMPORT ·
`.env` chỉ ĐỌC, env test trong harness.

## ④ Nghiệm thu — đóng gói `ops/bin/nghiem-thu/l2-m1.sh`

```bash
# 1. Migration 003: 2 lượt idempotent + down→up trên DB đã có dữ liệu
# 2. Enqueue idempotent: bơm CÙNG 1 tin 2 lần → đúng 1 dòng (in count)
# 3. Thứ tự per-conv: 2 tin cùng conv + 2 worker song song → xử TUẦN TỰ (đo bằng dấu
#    thời gian xử chồng lấn = 0); 2 tin khác conv → được song song (chồng lấn ≥ 0 cho phép)
# 4. PHÉP ĐẮT NHẤT — CÔ LẬP BỘ NÃO (đóng nợ N2): chạy handler trọn 1 tin mẫu với spy
#    module pancake.js: pkSendReply=0 · pkSendImage=0 · pkAddNote/pkTagByName=0; cùng lúc
#    spy cửa v3: guiTin=1 · guiAnh=số ảnh pending · in cả hai bảng đếm
# 5. Guard đóng (mặc định dev): tin ra bị LoiCuaGuiDong → tin_cho_xu_ly đánh 'loi' + so_ai
#    ghi 'spent_no_send' (SELECT in ra) — token tiêu không tàng hình
# 6. so_ai sự kiện reply có ma_model NOT NULL (in 1 dòng mẫu)
# 7. autoCreateOrder: config đọc ra = false + không dòng don_hang nào sinh từ lượt test
# 8. DI model: layModel() mặc định trả client llm.js; thay bằng mock trong test → handler
#    dùng mock (chứng minh chỗ cắm sống)
# 9. npm test: bộ l2-m1 xanh
```

## ⑤ Test chạm nhánh nào

Local: trọn đường tin trên DB thật + mock cửa/model theo khuôn response thật (§4.2
TONG-QUAN). Tin thật đầu-cuối + độ trễ <10s: §7b T4 (cần T3). Webhook Pancake (điểm kiểm
2): chưa đo — kiến trúc nạp-qua-poll giữ nguyên, đổi nguồn sau không đụng worker (ghi
nhận trong bàn giao).

## ⑥ Ngoài phạm vi → APPEND §9 (kể cả bug bộ não cũ phát hiện khi chạy — cấm sửa).

## ⑦ ĐÃ TRA — OUTPUT MÁY

```
$ grep -n "tools.js\|scheduler-followup" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md §9
→ 1 dòng nợ N2 (L1-M2 22/08): «L2-M1 khi chuyển đường xử lý tin PHẢI route outbound của
  bộ não qua cửa v3» — phiếu này NHẬN và đóng nợ đó (④#4).
$ ls src/queue src/chat 2>/dev/null → chưa tồn tại
```

Quan hệ: **thi-hành-nợ N2** + thi hành 02 §L2. Không trùng phiếu nào.

---

**Khi nộp:** nhật ký `docs/thi-cong/nhat-ky/phieu-l2-m1.md` · APPEND 3 dòng §10 (+ dòng
§9 «nợ N2 đã đóng bởi L2-M1» ) · commit pathspec ③ (`feat(chat): L2-M1 — ...`) · trả lời
tổng ≤15 dòng.
