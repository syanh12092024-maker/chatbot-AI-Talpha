# PHIẾU L3-M4 — Hàng chờ tạo đơn luồng Messenger: 5 cửa v3 + duyệt là TẠO ĐƠN POS THẬT

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 GHI RA NGOÀI nặng nhất còn lại (tạo đơn thật
trên POS) · thợ **opus** · nguyên tắc gốc §7.3: **«THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM»**.

> Thợ nạp skill `tho-thi-cong` (2 bài học mới cuối). Đọc sổ §0a + §7b. Đây là phiếu
> CUỐI của phần việc A — mọi interface đã sẵn, việc của mày là NỐI cho đúng.

## ① Thi hành

- `docs/v3/01-QUYET-DINH.md` §1 — luồng Messenger: bot chốt đủ tên/số/địa chỉ + đồng ý
  COD trong chat → **hàng chờ sale duyệt** → duyệt là tạo đơn POS thẳng «Chờ in»,
  KHÔNG WhatsApp.
- `docs/v3/02-KE-HOACH-CODE.md` §L3 «Hàng chờ tạo đơn — luồng Messenger» + §L4 nghiệm
  thu «Đơn duyệt từ hàng chờ vào POS đúng thông tin, không phải gõ lại».
- `docs/TONG-QUAN-HE-THONG.md` §7.3 — NĂM CỬA của bản cũ (mẫu đủ trường · cửa tiền ·
  chống trùng 4 nguồn với `unknown-cửa-vẫn-đóng` · hàng chờ · tạo-đơn-chạy-lại-đủ-cửa).
  V3 PORT nguyên tắc, đổi nguồn: Sổ AI JSONL → bảng `so_ai` · ai-order-queue.json →
  bảng `hang_cho_tao_don` · thêm nguồn kiemTrung CHÉO của L3-M2 (bản cũ chưa có).
- Bàn giao: `may-trang-thai-don-v1.md` (`donMessengerDaTao`) ·
  `may-trang-thai-don-v1.md` §7 (cửa kiểm L3-M2: `kiemTrung`,
  `nghi_trung_chua_ro_san_pham`) · `luoc-do-v1.md` (bảng `hang_cho_tao_don` cột «kết
  quả bốn cửa») · `duong-tin-v1.md` (handler để cờ `state.closed`/`orderCreatedThisTurn`
  - so_ai `order`).

## ② Vào/ra

**Vào (ĐO LẠI):** cột thật `hang_cho_tao_don` · cờ state bộ não sau lượt chốt (đọc
`duong-tin-v1.md` §9 map cột) · `createPancakeOrder`/`pancake-orders.js` cũ (payload
tạo đơn POS thật — đọc khuôn, CẤM SỬA) · `viec_can_xu_ly` (khay sale của B).

**Ra:**

1. **`src/orders/hang-cho.js`** — vào hàng chờ: hook `vaoHangCho(pool, ctx, {hoiThoaiId,
hoSo})` được handler gọi sau lượt bot chốt (chỗ đấu trong `src/chat/` — 1 dòng, vùng
   đã rảnh); ghi `hang_cho_tao_don` kèm **kết quả 5 cửa chạy NGAY LÚC VÀO** (để sale
   thấy trước): ①đủ trường (tên/SĐT/địa chỉ/SL/tổng — thiếu → vẫn vào hàng chờ nhưng
   gắn `thieu_truong`, sale bổ sung) ②cửa tiền: tổng khớp ĐÚNG MỘT `goi_gia` của page —
   `goi_gia` đang 0 dòng (giá 0 nợ L1-M1) ⇒ cửa tiền trả `unknown` VÀ ĐÓNG (ghi lý do,
   không coi là sạch — nguyên tắc §7.3) ③chống trùng 4 nguồn v3: `so_ai` order theo
   hội thoại · đơn POS của hội thoại (qua `don_hang` + conversation_id) · `kiemTrung`
   L3-M2 (SĐT+SP chéo 2 luồng) · trạng thái `hoi_thoai` — nguồn nào lỗi → `unknown`,
   cửa ĐÓNG.
2. **`src/pos/tao-don.js`** — cửa TẠO ĐƠN THẬT (đất pos, khuôn ghi-nguoc): BỐN CỬA AN
   TOÀN y khuôn L1-M1 (`V3_POS_GHI` fail-closed · payload khớp khuôn createPancakeOrder
   đã đo · nhật ký 2 pha `pos_tao_don_*` · idempotent theo `hang_cho_id` — bấm đúp
   không tạo 2 đơn).
3. **`duyet(pool, ctx, {hangChoId})`** — CHẠY LẠI đủ cửa ②③ (§7.3 cửa ⑤ — người bấm
   nhầm cũng không tạo được đơn trùng/sai tiền) → gọi `taoDon` → INSERT `don_hang`
   (nguon=messenger, ma_pos từ response) → `donMessengerDaTao` (máy L3-M1 nhận) → ghi
   `so_ai`. **`loai(pool, ctx, {hangChoId, lyDo})`** → đóng + lý do. Cả hai ghi
   `nhat_ky`; hai hàm này là interface cho màn L4 của B — khai vào bàn giao.
4. Append `may-trang-thai-don-v1.md` §hàng-chờ: chữ ký + 5 cửa + trạng thái dòng hàng chờ.

## ③ Pathspec

```
src/orders/hang-cho.js
src/orders/index.js               ← CHỈ thêm export
src/pos/tao-don.js
src/pos/index.js                  ← CHỈ thêm export
src/chat/                         ← CHỈ 1 chỗ đấu vaoHangCho sau lượt chốt
test/l3-m4-*.test.js
docs/v3/ban-giao/may-trang-thai-don-v1.md ← CHỈ append
ops/bin/nghiem-thu/l3-m4.sh
docs/thi-cong/nhat-ky/phieu-l3-m4.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không sửa pancake-orders.js/file phẳng src/ · không đụng lich-nhac/doc-y (L3-M3 đang
chạy song song nếu chưa ✅ — đo git status trước) · KHÔNG migration mới (cột thiếu → §9
xin trước).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/l3-m4.sh`

```bash
# 1. Vào hàng chờ: lượt chốt mẫu → 1 dòng hang_cho_tao_don kèm kết quả 5 cửa (in JSON
#    kết quả); thiếu trường → gắn thieu_truong vẫn vào (sale bổ sung, không rơi im)
# 2. CỬA TIỀN unknown-là-đóng: goi_gia rỗng → cửa tiền 'unknown', duyet BỊ CHẶN đúng
#    tên lỗi (nguyên tắc THÀ KHÔNG TẠO — in lý do); seed 1 goi_gia khớp → cửa mở
# 3. CHỐNG TRÙNG 4 nguồn: từng nguồn dương một (so_ai order · đơn POS conv · kiemTrung
#    chéo · hoi_thoai state) → duyet chặn (4 ca in từng nguồn); nguồn kiemTrung LỖI
#    (mock ném) → 'unknown' + CHẶN (không coi là sạch)
# 4. duyet HAPPY PATH: mock taoDon POS → đơn tạo đúng payload (đối chiếu khuôn
#    createPancakeOrder — in payload) → don_hang +1 nguon=messenger → donMessengerDaTao
#    được gọi (máy nhận day_cho_in) → so_ai +1
# 5. BỐN CỬA taoDon: V3_POS_GHI vắng → chặn api=0 · idempotent hang_cho_id (duyet 2 lần
#    → taoDon 1 lượt, đơn 1) · nhật ký 2 pha (timeout → dòng bắt-đầu mồ côi)
# 6. loai: đóng + lý do + nhat_ky; duyet sau loai → chặn (trạng thái dòng)
# 7. node --test l3-m4 xanh + hồi quy l3-m1/l3-m2/l2-m1 không gãy
# (phép TẠO ĐƠN THẬT trên POS: §7b — thêm dòng T7 nếu tổng duyệt)
```

## ⑤ Nhánh thật: tạo đơn thật = §7b (T7 mới — đơn nháp trên shop test, cần người xoá…

KHÔNG, không xoá được (luật 2). T7 = tạo 1 đơn nháp đánh dấu rõ TEST trên shop ít dùng
nhất, để nguyên — tổng ghi §7b). ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
§9: nợ goi_gia-giá-0 (L1-M1) → cửa tiền unknown-đóng là cách phiếu này SỐNG CHUNG với nợ
đó (không chờ vá); Q1/Q2 đang được VA-Q12 đóng song song — phép #3 nguồn kiemTrung cần
khach_id: nếu VA-Q12 chưa ✅ lúc chạy, mock nguồn đó và ghi nhật ký. Không trùng phiếu.
```

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`feat(orders): L3-M4 — ...`) · ≤15 dòng.
