# PHIẾU BH1 — Giá do SERVER tính, hội thoại đã chốt bị KHOÁ, van READONLY ở primitive

**Base:** `0c6c1ed` · **Làn:** 🟥 (đụng đường tiền + đường gửi) · thợ **opus**
**Đụng bộ não:** `src/tools.js` `src/outbound-guard.js` — cửa tiền và cửa chốt đơn nằm
trong hai file này, không có đường nào khác để vá (§0a luật 4 bản 16/09).

> Thợ nạp skill `tho-thi-cong` + `viet-thuoc`. Đọc sổ §0a (luật 4 MỚI) + §9.
> ⚠️ Cây lúc phát phiếu có thay đổi CHƯA COMMIT (thước `do-duong-ban.mjs`, cổng `_chan1.sh`,
> §0a sổ). Tổng commit lượt chuẩn bị TRƯỚC khi phát, rồi sửa lại dòng `Base` ở trên.

## ① Thi hành

- Báo cáo audit 16/09 — ba lỗi Critical: C1 giá do model điền · C2 `CLOSING` không khoá ·
  C3 `PANCAKE_READONLY` đi vòng được.
- `docs/TONG-QUAN-HE-THONG.md` §7.2–§7.3 — «cấm bịa tổng tiền», «THÀ KHÔNG TẠO CÒN HƠN
  TẠO NHẦM», 5 cửa trước khi một đơn thật được tạo.
- `docs/TONG-QUAN-HE-THONG.md` §6.3 bảng quyền nói — `CLOSING` khai «AI ⛔» nhưng chưa
  dòng code nào thi hành.
- `README.md` nguyên tắc 3 và 5 (chốt đúng trình tự · mỗi khách 1 đơn).

## ② Vào/ra

**Vào (ĐO LẠI, đề bài có thể khai sai):**

- `src/kb.js#productTiers(p)` → `[{label, price, qty?}]` — bảng giá thật của page, đã
  chuẩn hoá cả dữ liệu cũ (`price1`/`combo2`/`combo3`). **Đo trước:** 77 page trong
  `kb-overrides.json`, 63 page có đúng 2 tier, 7 page có **0 tier**.
- `src/outbound-guard.js#allowedPrices(kb)` — đã dựng đúng tập giá hợp lệ; BH1 **dùng
  lại**, không viết bản thứ hai (bản thứ hai bao giờ cũng là bản trôi).
- `src/tools.js:38` — `total_price` hiện là tham số **model tự điền**, mô tả «LẤY TỪ bảng
  giá KB» chỉ là lời dặn, không có validation nào.
- `src/pancake-orders.js:164-166` — `agreed = Number(input.total_price) * CCY_FACTOR` đi
  thẳng vào `shipping_fee` (= tiền COD khách trả).
- `src/conv-owner.js#decideConv` — có cửa `POST_SALE`, `HANDOFF`; **không** có cửa `CLOSING`.
- `src/conv-state.js#getConv(convId).orderAt` — đã được `markClosing` đặt, chưa ai đọc.
- `src/pancake.js` `src/messenger.js` — grep `PANCAKE_READONLY` = **0 dòng**.

**Ra:**

1. **`src/core/gia.js` (MỚI) — nguồn giá DUY NHẤT.**
   `tinhTong({ kb, variant, qty })` → `{ ok, tong, tien_te, goi, ly_do }`.
   - khớp `variant` (nhãn gói) trước, `qty` sau; không khớp rõ đúng một gói ⇒ `ok:false`
     kèm `ly_do` đọc được bằng tiếng người + danh sách gói hợp lệ.
   - **KHÔNG tự nhân/cộng** giá các gói. Đây là chính cái vụ 07/08/2026 (khách bị báo gấp
     đôi giá → huỷ đơn + block page).
   - `allowedPrices` của guard chuyển sang gọi module này (một sự thật, một chỗ).
2. **`tools.js#create_draft_order` — giá do server quyết.**
   - vẫn NHẬN `total_price` từ model (giữ chữ ký, đỡ vỡ prompt), nhưng **đối chiếu**:
     lệch `tinhTong` ⇒ trả `isError` + câu bảo model gọi lại với đúng số, **không tạo đơn,
     không ghi hàng chờ, không ghi chú Pancake**.
   - `tinhTong` không ra được đúng một gói ⇒ cũng `isError`, bảo model hỏi lại khách 1 câu
     kèm giá (đúng CORE §6 mục 2).
   - số đi tiếp xuống `createPancakeOrder`/`recordClosedOrder` là số của **server**, không
     phải số của model.
3. **Cửa `CLOSING` thi hành bằng code.**
   - `conv-owner.decideConv`: `c.state === S.CLOSING` ⇒ `allow:false` (lý do «đơn đã chốt
     — chờ sale»), CÙNG khuôn nhánh `POST_SALE` đang có.
   - `tools.js#create_draft_order`: `getConv(convId).orderAt` đã có ⇒ `isError` «hội thoại
     này đã chốt đơn», không tạo lần hai.
   - ⚠️ Nhánh hỏi-về-đơn-đã-đặt KHÔNG thuộc phiếu này (hậu mãi, hoãn theo lệnh người
     quyết 16/09) — ở đây khoá là khoá, khách được bàn giao sale như mọi cửa dừng khác.
4. **`assertCanSend()` — van READONLY ở primitive.**
   - `src/core/van-gui.js` (MỚI): `assertCanSend(thaoTac)` ném `LoiVanGuiDong` khi
     `PANCAKE_READONLY === '1'`.
   - gọi trong `pancake.js#pkSendReply/pkSendImage/pkAddNote/pkToggleTag` và
     `messenger.js#sendText/sendImage`. ⛔ `pancake.js`/`messenger.js` **vẫn nằm trong 57
     file cấm** — phiếu này KHÔNG sửa chúng. Thay vào đó: `handler.js`/`pancake-poll.js`
     cũng cấm. **Cách làm:** đặt `assertCanSend` ở `src/core/van-gui.js` và gọi nó từ
     `tools.js` (file đã khai) trước mỗi lượt đẩy ảnh; phần `pkSendReply` của
     `pancake-poll.js` ghi **§9 SỔ NỢ** kèm đúng dòng cần vá, mở phiếu BH1b khi người
     quyết gật mở thêm hai file. Không tự ý mở rộng phạm vi.

## ③ Pathspec

```
src/core/gia.js
src/core/van-gui.js
src/tools.js                       ← đã khai «Đụng bộ não»
src/outbound-guard.js              ← đã khai «Đụng bộ não»
src/conv-owner.js
test/bh1-gia-va-cua-chot.test.js
ops/bin/nghiem-thu/bh1.sh
docs/thi-cong/nhat-ky/phieu-bh1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không sửa `pancake-orders.js` `pancake.js` `messenger.js` `handler.js` `pancake-poll.js`
`prompts.js` `closer.js`. Không đụng `src/orders/` `src/pos/`.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh1.sh`

```bash
node --test test/bh1-gia-va-cua-chot.test.js     # kỳ vọng: 0 fail, ≥14 ca

# G1 · model điền giá KHÔNG có trong bảng → KHÔNG có đơn nào được ghi
#      (ca: kb 2 gói 109/159, model gửi total_price=1) ⇒ isError + hàng chờ 0 dòng
# G2 · model điền giá ĐÚNG một gói → qua, và số ghi xuống = số của server
# G3 · "2 sets" khi page bán SET 1/SET 2 → tinhTong ok:false, tool bảo hỏi lại, 0 đơn
# G4 · page KHÔNG có bảng giá (7/77 page thật) + model NÊU tổng → chặn
#      ⚠️ SỬA KHI THI CÔNG 16/09: chữ gốc là «fail-CLOSED, không tạo đơn mù». Làm đúng chữ
#      đó sẽ phá hợp đồng đang xanh của `l2-m1-nhac-truong` ca N1b (chốt đơn KHÔNG kèm
#      total_price) mà KHÔNG thêm lớp an toàn nào — đường "thiếu tổng" đã fail-closed sẵn
#      ở cửa ⑤ của order-bridge. BH1 đóng lỗ SỐ SAI, giữ nguyên người gác cũ cho lỗ THIẾU
#      SỐ. Ca G4b khoá chiều ngược lại. Chi tiết: nhật ký §2(a).
# G5 · hội thoại state=CLOSING → decideConv.allow === false
# G6 · conv.orderAt đã có → create_draft_order trả isError, KHÔNG gọi createPancakeOrder
# G7 · PANCAKE_READONLY=1 → assertCanSend ném; =0 → không ném
# G8 · allowedPrices(kb) === tập giá của gia.js (một sự thật, không hai bản)

grep -c "total_price" src/pancake-orders.js      # kỳ vọng: KHÔNG ĐỔI (3) — phiếu không đụng
node --test test/l4-prompt.test.mjs              # kỳ vọng: 0 fail (14 nguyên tắc còn nguyên)
npm test                                          # kỳ vọng: fail ≤1 (D7 đỏ sẵn, nợ §9 25/08)
```

## ⑤ Test chạm nhánh thật

- `executeTool('create_draft_order', …)` chạy thật với `kb` dựng từ **bảng giá thật của một
  page trong `kb-overrides.json`** (không bịa tier), mock `createPancakeOrder` +
  `recordClosedOrder` để đếm «có được gọi không».
- `decideConv` chạy thật trên `conv-state` sandbox (biến `CONV_STATE_FILE`, đã có).
- Nhánh KHÔNG chạm được: POST thật lên POS — khai trong nhật ký.

## ⑥ Ngoài phạm vi (ghi §9, cấm tiện tay sửa)

- Nợ **đơn vị tiền KWD/OMR/BHD** (`pancake-orders.js:162` `CCY_FACTOR` ×1000) — sổ §9 đã
  có mục này, kèm câu «phép xác nhận cuối là mở POS xem một đơn Kuwait». BH1 làm giảm rủi
  ro (giá không còn do model bịa) nhưng KHÔNG đóng nợ đó.
- `pkSendReply` trong `pancake-poll.js` chưa có `assertCanSend` (xem ②.4).
- `checkTotal` của `order-bridge.js` trùng việc với `gia.js` → gộp ở phiếu sau.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "total_price" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
247:  `total_price`+`currency` để hệ quy; `du_lieu_don.tong_tien_lon` là khoá jsonb mới
875:  được) vì nhánh `agreed` chỉ chạy khi AI bóc được `total_price` thành số; phần lớn đơn
1637: `total_price`, tao-don không nhân lại; 007 COMMENT) · RF-10 HUY_HOAN dẫn từ MA_HOAN

$ grep -n "CLOSING" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
35:     hội thoại đã CHỐT không bị khoá — `conv-owner.js:102` không xét `CLOSING`;   ← dòng
                                                                  của chính lượt audit này
```

**Quan hệ:** dòng 875 là **trùng-nợ một phần** — nợ cũ nói về ĐƠN VỊ tiền (×100/×1000),
BH1 nói về NGUỒN của con số (model vs server). Hai lỗi khác nhau trên cùng một biến; BH1
đóng lỗi nguồn, để nguyên lỗi đơn vị và trỏ ngược lại §9. Hai neo còn lại: **mới**.
