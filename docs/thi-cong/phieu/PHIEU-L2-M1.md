# PHIẾU L2-M1 — Đường xử lý tin nền mới: hàng đợi + handler v3, MỌI outbound qua cửa

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 (chạm outbound + bộ não) · thợ **opus** (phán
22/08: đổi chỗ trong danh sách 4-phiếu-opus với L1-M3 vì L1-M3 đã thành khung mỏng)

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b. Bộ não chat DÙNG NGUYÊN — phiếu này là
> NHẠC TRƯỞNG MỚI quanh nó. Đây là phiếu nhận NỢ N2 của L1-M2 (§9: tools.js/scheduler
> import thẳng pancake.js). Bản v2 — đóng 6 finding `nghiep-vu-L2-M1.verdict.yaml`
> (3 CHAN: 3 lượt gửi ngầm trong executeTool · khoá dòng ≠ khoá hội thoại · DI thiếu team).

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

- Bộ não GẦN NHƯ không tự gửi — nhưng KHÔNG tuyệt đối (N1): `runCloser` trả text; ảnh
  chỉ XẾP `state.pendingImages`; text do handler/poll gửi. **BA CHỖ GỬI NGẦM còn lại nằm
  trong `executeTool`, chạy giữa lòng runCloser:** `tools.js:197` `pkTagByName(pkTags.order)`
  (nhánh chốt đơn) · `:266` `pkTagByName(pkTags.handoff)` · `:271` `pkAddNote('🙋 AI
  CHUYỂN NGƯỜI…')` — đúng cơ chế bàn giao sale §7.4, chắc chắn bay khi bot làm việc thật.
  Kèm ĐƯỜNG GỬI THỨ HAI (N4): `tools.js:2` import `sendImage` từ `messenger.js` → Graph
  API, không kiểm READONLY (nhánh `else` của `sendImageWithRetry`). `tools.js:186
  createOrder` = ghi nội bộ; `config.autoCreateOrder` ĐANG TẮT — giữ TẮT.
  **Chặn kiểu hai tầng, không sửa file cấm:** (a) TẦNG NGUỒN fail-closed — bộ NẠP từ
  chối enqueue khi `PANCAKE_READONLY === '1'` trừ khi `V3_NAP_DEV === '1'` (dev không có
  tin thật vào hàng đợi ⇒ executeTool không bao giờ chạy trên hội thoại thật ở máy cá
  nhân); (b) TẦNG ĐO — test mock module `pancake.js` VÀ `messenger.js` (node:test
  `mock.module`), 3 dân số ở ④#4. Phần tag/note runtime vẫn đi thẳng ở VPS: ghi §9 nợ
  dài hạn «hợp thức ở cutover — VPS là môi trường được phép gửi».
- State cũ sống ở `conv-state.json` — v3 đọc/ghi bảng `hoi_thoai` (đã di trú 18.790 dòng).
- Chỗ cắm model: `llm.js` (41 dòng, client anthropic/kimi) — DÙNG NGUYÊN qua DI.

**Ra (đo được):**

1. **Migration `db/migrate/003_tin_cho_xu_ly.*`** — bảng `tin_cho_xu_ly` (team_id NOT
   NULL · page_id · psid · conv_id · msg_id · noi_dung · trang_thai
   `cho|dang_xu|xong|loi|chan_guard` · so_lan_thu · khoa_worker · thoi_diem). UNIQUE chống trùng
   `(page_id, conv_id, msg_id)`. Khai lý do bảng mới vào `luoc-do-v1.md` §thay-đổi +
   regen `db/schema.sql`.
2. **`src/queue/`** — (a) bộ NẠP: poll qua CỬA messenger (đường đọc, ctxHeThong) →
   enqueue idempotent; fail-closed nguồn theo N1(a). (b) WORKER: rút `cho`→`dang_xu`
   bằng `FOR UPDATE SKIP LOCKED` **CỘNG khoá HỘI THOẠI bằng
   `pg_try_advisory_xact_lock(hashtext(conv_id))` (N2)** — khoá dòng chỉ chặn 1 TIN,
   hai tin cùng conv là hai dòng nên thiếu advisory lock là 2 worker cùng dựng state,
   trả lời đúp, `moc_luot_llm` trừ đua. Không lấy được lock → trả tin về `cho`, worker
   sang conv khác. Tin `loi` có trần `so_lan_thu`; **guard chặn → trạng thái RIÊNG
   `chan_guard`, KHÔNG retry (N6)** — retry lượt guard đóng là đốt token thật mỗi vòng.
3. **`src/chat/`** — handler v3 (nhạc trưởng mới): dựng `state` từ `hoi_thoai` + KB
   (`kb.js` cũ import nguyên — nhóm "nội dung dùng nguyên"), gọi
   `classify`/`fastLane`/`runCloser` NGUYÊN VĂN; nhận text về rồi:
   - gửi text qua **cửa `guiTin`** (guard V3_PANCAKE_GUI) — KHÔNG pkSendReply;
   - tự xả `state.pendingImages` qua **cửa `guiAnh`** — KHÔNG `flushPendingImages` cũ;
   - tag/note qua cửa; cập nhật `hoi_thoai` (state · lượt · hồ sơ nén) + ghi `so_ai`
     ĐỦ LOẠI SỰ KIỆN §11.2 (N5): `reply` (token + **`ma_model`**) · `image` (theo số ảnh
     xả) · `order` (đọc cờ `state.orderCreatedThisTurn`/`state.closed` bộ não để lại —
     executeTool ghi logAi vào JSONL cũ, KHÔNG vào so_ai, nên handler v3 phải tự ghi;
     thiếu là 4 cửa chống trùng §7.3 + L3-M2/M4 câm) · `handoff` (cờ handoff của state) ·
     `spent_no_send` khi guard chặn — «khoản chi tàng hình» §11.2;
   - `config.autoCreateOrder` giữ TẮT — bot chốt chỉ ghi nhận, hàng chờ tạo đơn là
     L3-M4.
4. **Chỗ cắm model (DI, §7b T6 — N3):** `deps.layModel(ctx, {vaiTro: 'chinh'|'du_phong'|
   'nen'}) → {client, maModel}` — có TEAM (01 §7 mỗi team model riêng) và vai trò. Bản
   mặc định: SELECT `cau_hinh_model` theo `ctx.teamId`; team chưa cấu hình → fallback
   client `llm.js` cũ + `maModel` từ config thật (CẤM hằng số bịa). KHÔNG viết lớp model
   đa-nhà/dự-phòng/độ-ngẫu-nhiên (việc B) — chỉ interface + SELECT + fallback. Hợp đồng
   ghi vào `duong-tin-v1.md` để B cài L1-M4 vào đúng chữ ký.
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
# 3. Khoá HỘI THOẠI (N2): 2 tin CÙNG conv + 2 worker → phép KHẲNG ĐỊNH «worker B rút
#    conv X trả 0 dòng khi A đang giữ advisory lock» (in số dòng B rút được = 0) + sau khi
#    A nhả, B xử được (= 1); 2 tin KHÁC conv → 2 worker song song (cả hai rút được)
# 3b. Nguồn fail-closed (N1a): PANCAKE_READONLY=1 + vắng V3_NAP_DEV → bộ nạp enqueue 0
#     dòng, in lý do; V3_NAP_DEV=1 → nạp được (đối chứng dương)
# 4. PHÉP ĐẮT NHẤT — CÔ LẬP BỘ NÃO (N1): mock CẢ pancake.js LẪN messenger.js, BA DÂN SỐ:
#    a. tin thường → pkSendReply/pkSendImage/pkAddNote/pkTagByName/sendImage(Graph) = 0;
#       cửa v3: guiTin=1, guiAnh=số ảnh
#    b. ÉP nhánh chốt đơn (mock model trả tool_use create_order) → pkTagByName(order)
#       của pancake.js = 0 lượt LỌT RA NGOÀI mock, so_ai có sự kiện `order`
#    c. ÉP nhánh chuyển người (tool handoff) → pkTagByName(handoff)+pkAddNote = 0 lọt,
#       cửa v3 gánh tag/note, so_ai có `handoff`
#    In bảng đếm cả ba dân số — dân số 1 tin xanh vì NHÁNH KHÔNG CHẠY không tính là đạt
# 5. Guard đóng (mặc định dev): tin ra bị LoiCuaGuiDong → tin_cho_xu_ly sang 'chan_guard'
#    (khớp N6, không phải 'loi') + so_ai ghi 'spent_no_send' (SELECT in ra)
# 6. so_ai ĐỦ LOẠI (N5): reply (ma_model NOT NULL, không phải hằng bịa — đổi mock model
#    thì ma_model đổi theo, in 2 giá trị khác nhau) · image · order · handoff ·
#    spent_no_send — mỗi loại ≥1 dòng từ các dân số ④#4, in bảng đếm theo loại
# 6b. Guard chặn (N6): tin sang `chan_guard`, KHÔNG retry (worker bỏ qua, in số lần thử
#     đứng yên = 1); so_ai ghi spent_no_send
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
